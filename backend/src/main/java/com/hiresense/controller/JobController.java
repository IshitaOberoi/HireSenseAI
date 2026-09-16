package com.hiresense.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hiresense.model.AiRequestLog;
import com.hiresense.model.Job;
import com.hiresense.model.Resume;
import com.hiresense.model.User;
import com.hiresense.repository.AiRequestLogRepository;
import com.hiresense.repository.JobRepository;
import com.hiresense.repository.ResumeRepository;
import com.hiresense.repository.UserRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.*;

@RestController
@RequestMapping("/api/jobs")
@RequiredArgsConstructor
@Slf4j
public class JobController {

    private final JobRepository jobRepository;
    private final UserRepository userRepository;
    private final ResumeRepository resumeRepository;
    private final AiRequestLogRepository aiRequestLogRepository;
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${app.ai-service.url:http://localhost:8000}")
    private String aiServiceUrl;

    @Data
    public static class CreateJobRequest {
        @NotBlank(message = "title is required")
        private String title;
        @NotBlank(message = "company is required")
        private String company;
        @NotBlank(message = "description is required")
        private String description;
        @NotNull @Min(0) @Max(60)
        private Integer experienceYears;
        @NotNull
        private UUID recruiterId;
    }

    @PostMapping
    @Transactional
    public ResponseEntity<?> createJob(@Valid @RequestBody CreateJobRequest request) {
        log.info("Creating new job posting: {} at {}", request.getTitle(), request.getCompany());
        try {
            User recruiter = userRepository.findById(request.getRecruiterId())
                    .orElseThrow(() -> new RuntimeException("Recruiter user not found: " + request.getRecruiterId()));

            // Step 1: Save baseline Job record
            Job job = Job.builder()
                    .recruiter(recruiter)
                    .title(request.getTitle())
                    .company(request.getCompany())
                    .description(request.getDescription())
                    .experienceYears(request.getExperienceYears())
                    .build();

            Job savedJob = jobRepository.save(job);

            // Step 2: Call FastAPI to generate vector embedding of job description
            String vectorStr = callFastApiForJobEmbedding(request.getDescription());
            if (vectorStr != null) {
                savedJob.setJobEmbedding(vectorStr);
                jobRepository.save(savedJob);
                log.info("Job description embedding generated and persisted.");
            }

            return ResponseEntity.ok(savedJob);
        } catch (Exception e) {
            log.error("Failed to create job posting", e);
            return ResponseEntity.internalServerError().body(e.getMessage());
        }
    }

    @GetMapping("/{id}/matches")
    public ResponseEntity<?> getMatches(@PathVariable UUID id) {
        log.info("Calculating candidate matches for job: {}", id);
        try {
            Job job = jobRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Job posting not found: " + id));

            if (job.getJobEmbedding() == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Job embedding vector is missing. Cannot perform semantic search."));
            }

            // Step 1: Query pgvector similarity search directly from database using custom repository native query
            List<Map<String, Object>> rankedCandidates = jobRepository.findRankedCandidatesBySimilarity(job.getJobEmbedding());
            log.info("pgvector similarity search returned {} matching candidates.", rankedCandidates.size());

            List<Map<String, Object>> enrichedMatches = new ArrayList<>();

            // Step 2: Call FastAPI match-engine for each candidate to generate skill gaps and explainable AI reasoning
            for (Map<String, Object> candidateNode : rankedCandidates) {
                UUID resumeId = UUID.fromString((String) candidateNode.get("resume_id"));
                Resume resume = resumeRepository.findById(resumeId).orElse(null);
                
                if (resume == null || resume.getParsedResumeJson() == null) {
                    continue; // Skip if resume data is missing
                }

                // Call FastAPI for match analysis (gaps + reasoning)
                Map<String, Object> analysis = callMatchEngine(resume, job);
                
                Map<String, Object> matchInfo = new HashMap<>(candidateNode);
                matchInfo.put("matching_confidence", analysis.getOrDefault("matching_confidence", 0.91));
                matchInfo.put("skill_gap", analysis.get("skill_gap"));
                matchInfo.put("match_reasoning", analysis.get("match_reasoning"));

                enrichedMatches.add(matchInfo);
            }

            return ResponseEntity.ok(enrichedMatches);
        } catch (Exception e) {
            log.error("Failed to fetch job matches", e);
            return ResponseEntity.internalServerError().body(e.getMessage());
        }
    }

    private String callFastApiForJobEmbedding(String description) {
        try {
            String url = aiServiceUrl + "/api/ai/process-job";
            Map<String, Object> request = Map.of("description", description);
            
            log.info("Calling FastAPI for job vectorizing at {}", url);
            Map<?, ?> response = restTemplate.postForObject(url, request, Map.class);
            if (response != null && (Boolean) response.get("success")) {
                List<?> embeddingList = (List<?>) response.get("job_embedding");
                return embeddingList.toString();
            }
        } catch (Exception e) {
            log.error("Failed to generate job embedding from FastAPI AI service", e);
        }
        return null;
    }

    private Map<String, Object> callMatchEngine(Resume resume, Job job) {
        try {
            String url = aiServiceUrl + "/api/ai/match-engine";
            
            // Map JSON string fields into standard maps for FastAPI parser JSON body compatibility
            Map<String, Object> parsedJson = objectMapper.readValue(resume.getParsedResumeJson(), Map.class);
            List<Double> resumeVec = parseVectorStr(resume.getResumeEmbedding());
            List<Double> jobVec = parseVectorStr(job.getJobEmbedding());

            Map<String, Object> payload = new HashMap<>();
            payload.put("resume_json", parsedJson);
            payload.put("job_description", job.getDescription());
            payload.put("resume_embedding", resumeVec);
            payload.put("job_embedding", jobVec);

            log.info("Calling FastAPI match-engine for resume {} against job {}", resume.getId(), job.getId());
            Map<String, Object> response = restTemplate.postForObject(url, payload, Map.class);
            
            // Audit Log record matching API invocation
            if (response != null && response.get("log_record") != null) {
                saveMatchingAuditLog((Map<String, Object>) response.get("log_record"));
            }

            return response != null ? response : Collections.emptyMap();
        } catch (Exception e) {
            log.error("Failed to execute FastAPI match engine calculations", e);
        }
        return Collections.emptyMap();
    }

    private void saveMatchingAuditLog(Map<String, Object> logNode) {
        try {
            AiRequestLog requestLog = AiRequestLog.builder()
                    .requestType((String) logNode.getOrDefault("request_type", "MATCHING"))
                    .modelName((String) logNode.getOrDefault("model_name", "Groq Llama-3"))
                    .latencyMs((Integer) logNode.getOrDefault("latency_ms", 0))
                    .tokensInput((Integer) logNode.getOrDefault("tokens_input", 0))
                    .tokensOutput((Integer) logNode.getOrDefault("tokens_output", 0))
                    .calculatedCost(BigDecimal.valueOf(((Number) logNode.getOrDefault("calculated_cost", 0.0)).doubleValue()))
                    .status((String) logNode.getOrDefault("status", "SUCCESS"))
                    .build();
            aiRequestLogRepository.save(requestLog);
        } catch (Exception e) {
            log.error("Failed to save matching AI log record", e);
        }
    }

    private List<Double> parseVectorStr(String vectorStr) {
        if (vectorStr == null) return Collections.emptyList();
        String clean = vectorStr.replace("[", "").replace("]", "").trim();
        if (clean.isEmpty()) return Collections.emptyList();
        
        String[] tokens = clean.split(",");
        List<Double> list = new ArrayList<>();
        for (String t : tokens) {
            list.add(Double.parseDouble(t.trim()));
        }
        return list;
    }
}
