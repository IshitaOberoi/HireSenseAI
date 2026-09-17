package com.hiresense.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hiresense.model.AiRequestLog;
import com.hiresense.model.JobDescription;
import com.hiresense.model.Resume;
import com.hiresense.model.ResumeJobMatch;
import com.hiresense.repository.AiRequestLogRepository;
import com.hiresense.repository.JobDescriptionRepository;
import com.hiresense.repository.ResumeChunkRepository;
import com.hiresense.repository.ResumeJobMatchRepository;
import com.hiresense.repository.ResumeRepository;
import com.hiresense.service.ResumeChunkPersistenceService.RetrievedChunk;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class JobMatchingService {

    private final ResumeRepository resumeRepository;
    private final ResumeChunkRepository resumeChunkRepository;
    private final ResumeChunkPersistenceService resumeChunkPersistenceService;
    private final JobDescriptionRepository jobDescriptionRepository;
    private final ResumeJobMatchRepository resumeJobMatchRepository;
    private final JobDescriptionPersistenceService jobDescriptionPersistenceService;
    private final AiRequestLogRepository aiRequestLogRepository;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${app.ai-service.url:http://localhost:8000}")
    private String aiServiceUrl;

    @Value("${app.matching.weights.required-skills:0.40}")
    private double weightRequiredSkills;

    @Value("${app.matching.weights.semantic-similarity:0.30}")
    private double weightSemanticSimilarity;

    @Value("${app.matching.weights.preferred-skills:0.15}")
    private double weightPreferredSkills;

    @Value("${app.matching.weights.experience-evidence:0.15}")
    private double weightExperienceEvidence;

    @Value("${app.matching.evidence.top-k:4}")
    private int evidenceTopK;

    @Value("${app.matching.evidence.threshold:0.25}")
    private double evidenceThreshold;

    @Value("${app.matching.evidence.max-evidence-chunks:2}")
    private int maxEvidenceChunks;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class JobMatchResponse {
        private UUID id;
        private UUID resumeId;
        private UUID jobDescriptionId;
        private String jobTitle;
        private String company;
        private double matchScore;
        private String alignmentRating;
        private ScoreBreakdown scoreBreakdown;
        private SkillsAnalysis skillsAnalysis;
        private List<EvidenceItem> evidence;
        private String explanation;
        private Map<String, Object> metadata;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ScoreBreakdown {
        private double requiredSkillCoverage;
        private double semanticSimilarity;
        private double preferredSkillCoverage;
        private double evidenceRelevance;
        private Map<String, Double> weights;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SkillsAnalysis {
        private List<String> required;
        private List<String> matched;
        private List<String> missing;
        private List<String> preferred;
        private List<String> matchedPreferred;
        private List<String> missingPreferred;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EvidenceItem {
        private int chunkIndex;
        private String sectionName;
        private String excerpt;
        private double similarity;
    }

    @Transactional
    public JobMatchResponse matchJobDescription(UUID resumeId, String jobDescriptionText) {
        if (jobDescriptionText == null || jobDescriptionText.trim().length() < 10) {
            throw new IllegalArgumentException("Job description must contain at least 10 characters.");
        }

        long startTime = System.currentTimeMillis();

        Resume resume = resumeRepository.findById(resumeId)
                .orElseThrow(() -> new IllegalArgumentException("Resume not found with ID: " + resumeId));

        if (!"COMPLETED".equalsIgnoreCase(resume.getProcessingStatus())) {
            throw new IllegalStateException("Resume analysis is not yet completed (current status: " + resume.getProcessingStatus() + ")");
        }

        // Ensure chunks exist (backfill if needed)
        ensureChunksExist(resume);

        // 1. Parse & Embed JD via FastAPI
        Map<String, Object> parseResponse = parseAndEmbedJob(jobDescriptionText);
        Map<String, Object> parsedJd = (Map<String, Object>) parseResponse.get("parsed");
        List<?> embeddingList = (List<?>) parseResponse.get("embedding");

        String title = (String) parsedJd.getOrDefault("title", "Untitled Position");
        String company = (String) parsedJd.get("company");
        String summary = (String) parsedJd.getOrDefault("summary", "");
        String vectorStr = embeddingList.toString();

        String parsedJsonStr;
        try {
            parsedJsonStr = objectMapper.writeValueAsString(parsedJd);
        } catch (Exception e) {
            parsedJsonStr = "{}";
        }

        UUID jobDescriptionId = jobDescriptionPersistenceService.saveJobDescription(
                title, company, jobDescriptionText, parsedJsonStr, vectorStr
        );
        JobDescription jobDescription = jobDescriptionRepository.findById(jobDescriptionId)
                .orElseThrow(() -> new IllegalStateException("Failed to load persisted JobDescription"));

        // 2. Compute overall semantic similarity: 1 - (resume_embedding <=> job_embedding)
        double semanticSimilarity = jobDescriptionPersistenceService.calculateResumeToJobSimilarity(resumeId, vectorStr);

        // 3. Search similar chunks for evidence strictly isolated to resume_id
        List<RetrievedChunk> retrievedChunks = resumeChunkPersistenceService.searchSimilarChunks(
                resumeId, vectorStr, evidenceTopK
        );

        // Filter evidence chunks by threshold to prevent dilution
        List<RetrievedChunk> qualifyingChunks = retrievedChunks.stream()
                .filter(c -> c.getSimilarity() >= evidenceThreshold)
                .toList();

        List<RetrievedChunk> topEvidence = qualifyingChunks.stream()
                .limit(maxEvidenceChunks)
                .toList();

        double evidenceRelevance = topEvidence.isEmpty()
                ? 0.0
                : topEvidence.stream().mapToDouble(RetrievedChunk::getSimilarity).average().orElse(0.0);

        // 4. Skill Overlap Analysis
        List<String> rawRequired = getSkillList(parsedJd.get("required_skills"));
        List<String> rawPreferred = getSkillList(parsedJd.get("preferred_skills"));

        Set<String> candidateSkills = extractCandidateSkills(resume);
        String candidateFullText = ((resume.getRawResumeText() != null ? resume.getRawResumeText() : "") + " "
                + retrievedChunks.stream().map(RetrievedChunk::getContent).collect(Collectors.joining(" "))).toLowerCase();

        List<String> matchedRequired = new ArrayList<>();
        List<String> missingRequired = new ArrayList<>();
        for (String req : rawRequired) {
            if (isSkillMatched(req, candidateSkills, candidateFullText)) {
                matchedRequired.add(req);
            } else {
                missingRequired.add(req);
            }
        }

        List<String> matchedPreferred = new ArrayList<>();
        List<String> missingPreferred = new ArrayList<>();
        for (String pref : rawPreferred) {
            if (isSkillMatched(pref, candidateSkills, candidateFullText)) {
                matchedPreferred.add(pref);
            } else {
                missingPreferred.add(pref);
            }
        }

        double requiredSkillCoverage = rawRequired.isEmpty() ? 1.0 : (double) matchedRequired.size() / rawRequired.size();
        double preferredSkillCoverage = rawPreferred.isEmpty() ? 1.0 : (double) matchedPreferred.size() / rawPreferred.size();

        // 5. Deterministic Score Calculation (Single Mathematical Source of Truth)
        double rawScore = (weightRequiredSkills * requiredSkillCoverage)
                + (weightSemanticSimilarity * semanticSimilarity)
                + (weightPreferredSkills * preferredSkillCoverage)
                + (weightExperienceEvidence * evidenceRelevance);

        double matchScore = BigDecimal.valueOf(rawScore * 100.0)
                .setScale(1, RoundingMode.HALF_UP)
                .doubleValue();
        matchScore = Math.max(0.0, Math.min(100.0, matchScore));

        String alignmentRating;
        if (matchScore >= 80.0) {
            alignmentRating = "Strong Match";
        } else if (matchScore >= 65.0) {
            alignmentRating = "Good Match";
        } else if (matchScore >= 50.0) {
            alignmentRating = "Moderate Match";
        } else {
            alignmentRating = "Low Match";
        }

        // 6. Grounded LLM Explanation
        Map<String, Object> explainResult = generateExplanation(
                title, company, summary,
                matchedRequired, missingRequired,
                matchedPreferred, missingPreferred,
                topEvidence
        );

        String explanation = (String) explainResult.getOrDefault("explanation", "Match assessment completed.");
        String modelName = (String) explainResult.getOrDefault("model", "groq");
        int tokensIn = ((Number) explainResult.getOrDefault("tokens_input", 0)).intValue();
        int tokensOut = ((Number) explainResult.getOrDefault("tokens_output", 0)).intValue();
        int llmLatency = ((Number) explainResult.getOrDefault("latency_ms", 0)).intValue();

        long totalLatency = System.currentTimeMillis() - startTime;

        // 7. Audit log
        saveMatchingAuditLog(modelName, totalLatency, tokensIn, tokensOut);

        // 8. Persist Match
        List<EvidenceItem> evidenceItems = topEvidence.stream()
                .map(c -> EvidenceItem.builder()
                        .chunkIndex(c.getChunkIndex())
                        .sectionName(c.getSectionName())
                        .excerpt(truncateExcerpt(c.getContent(), 250))
                        .similarity(round4(c.getSimilarity()))
                        .build())
                .toList();

        SkillsAnalysis skillsAnalysis = SkillsAnalysis.builder()
                .required(rawRequired)
                .matched(matchedRequired)
                .missing(missingRequired)
                .preferred(rawPreferred)
                .matchedPreferred(matchedPreferred)
                .missingPreferred(missingPreferred)
                .build();

        ScoreBreakdown scoreBreakdown = ScoreBreakdown.builder()
                .requiredSkillCoverage(round4(requiredSkillCoverage))
                .semanticSimilarity(round4(semanticSimilarity))
                .preferredSkillCoverage(round4(preferredSkillCoverage))
                .evidenceRelevance(round4(evidenceRelevance))
                .weights(Map.of(
                        "requiredSkills", weightRequiredSkills,
                        "semanticSimilarity", weightSemanticSimilarity,
                        "preferredSkills", weightPreferredSkills,
                        "experienceEvidence", weightExperienceEvidence
                ))
                .build();

        ResumeJobMatch matchEntity = ResumeJobMatch.builder()
                .resume(resume)
                .jobDescription(jobDescription)
                .matchScore(BigDecimal.valueOf(matchScore))
                .semanticSimilarity(BigDecimal.valueOf(round4(semanticSimilarity)))
                .skillCoverage(BigDecimal.valueOf(round4(requiredSkillCoverage * 100.0)))
                .matchedSkills(toJson(matchedRequired))
                .missingSkills(toJson(missingRequired))
                .evidenceJson(toJson(evidenceItems))
                .explanation(explanation)
                .metadataJson(toJson(Map.of(
                        "model", modelName,
                        "latency_ms", totalLatency,
                        "tokens_input", tokensIn,
                        "tokens_output", tokensOut
                )))
                .build();

        resumeJobMatchRepository.save(matchEntity);

        return JobMatchResponse.builder()
                .id(matchEntity.getId())
                .resumeId(resumeId)
                .jobDescriptionId(jobDescriptionId)
                .jobTitle(title)
                .company(company)
                .matchScore(matchScore)
                .alignmentRating(alignmentRating)
                .scoreBreakdown(scoreBreakdown)
                .skillsAnalysis(skillsAnalysis)
                .evidence(evidenceItems)
                .explanation(explanation)
                .metadata(Map.of(
                        "model", modelName,
                        "latency_ms", totalLatency,
                        "tokens_input", tokensIn,
                        "tokens_output", tokensOut
                ))
                .build();
    }

    @Transactional(readOnly = true)
    public List<JobMatchResponse> getMatchesForResume(UUID resumeId) {
        List<ResumeJobMatch> matches = resumeJobMatchRepository.findByResumeIdOrderByCreatedAtDesc(resumeId);
        return matches.stream().map(this::toResponse).toList();
    }

    private JobMatchResponse toResponse(ResumeJobMatch match) {
        JobDescription jd = match.getJobDescription();
        String title = jd != null ? jd.getTitle() : "Position";
        String company = jd != null ? jd.getCompany() : null;

        List<String> matched = fromJsonList(match.getMatchedSkills());
        List<String> missing = fromJsonList(match.getMissingSkills());
        List<EvidenceItem> evidence = fromJsonEvidence(match.getEvidenceJson());

        return JobMatchResponse.builder()
                .id(match.getId())
                .resumeId(match.getResume().getId())
                .jobDescriptionId(jd != null ? jd.getId() : null)
                .jobTitle(title)
                .company(company)
                .matchScore(match.getMatchScore().doubleValue())
                .alignmentRating(match.getMatchScore().doubleValue() >= 80 ? "Strong Match" : match.getMatchScore().doubleValue() >= 65 ? "Good Match" : "Moderate Match")
                .scoreBreakdown(ScoreBreakdown.builder()
                        .requiredSkillCoverage(match.getSkillCoverage().doubleValue() / 100.0)
                        .semanticSimilarity(match.getSemanticSimilarity().doubleValue())
                        .preferredSkillCoverage(1.0)
                        .evidenceRelevance(evidence.isEmpty() ? 0.0 : evidence.get(0).getSimilarity())
                        .weights(Map.of(
                                "requiredSkills", weightRequiredSkills,
                                "semanticSimilarity", weightSemanticSimilarity,
                                "preferredSkills", weightPreferredSkills,
                                "experienceEvidence", weightExperienceEvidence
                        ))
                        .build())
                .skillsAnalysis(SkillsAnalysis.builder()
                        .required(matched)
                        .matched(matched)
                        .missing(missing)
                        .preferred(List.of())
                        .matchedPreferred(List.of())
                        .missingPreferred(List.of())
                        .build())
                .evidence(evidence)
                .explanation(match.getExplanation())
                .metadata(match.getMetadataJson() != null ? fromJsonMap(match.getMetadataJson()) : Map.of())
                .build();
    }

    private Map<String, Object> parseAndEmbedJob(String jobDescriptionText) {
        try {
            String url = aiServiceUrl + "/api/ai/jobs/parse";
            ResponseEntity<Map> resp = restTemplate.postForEntity(url, Map.of("job_description", jobDescriptionText), Map.class);
            if (resp.getStatusCode().is2xxSuccessful() && resp.getBody() != null) {
                return (Map<String, Object>) resp.getBody();
            }
            throw new IllegalStateException("AI service returned non-2xx status for job parsing: " + resp.getStatusCode());
        } catch (Exception e) {
            log.error("Failed to parse and embed job description", e);
            throw new RuntimeException("Failed to process job description: " + e.getMessage(), e);
        }
    }

    private Map<String, Object> generateExplanation(
            String title, String company, String summary,
            List<String> matchedReq, List<String> missingReq,
            List<String> matchedPref, List<String> missingPref,
            List<RetrievedChunk> topEvidence
    ) {
        try {
            String url = aiServiceUrl + "/api/ai/jobs/explain-match";
            List<Map<String, Object>> chunkPayloads = topEvidence.stream()
                    .map(c -> Map.<String, Object>of(
                            "section_name", c.getSectionName(),
                            "content", c.getContent(),
                            "similarity", c.getSimilarity()
                    ))
                    .toList();

            Map<String, Object> request = Map.of(
                    "job_title", title,
                    "company", company != null ? company : "",
                    "job_summary", summary != null ? summary : "",
                    "matched_required_skills", matchedReq,
                    "missing_required_skills", missingReq,
                    "matched_preferred_skills", matchedPref,
                    "missing_preferred_skills", missingPref,
                    "evidence_chunks", chunkPayloads
            );

            ResponseEntity<Map> resp = restTemplate.postForEntity(url, request, Map.class);
            if (resp.getStatusCode().is2xxSuccessful() && resp.getBody() != null) {
                return (Map<String, Object>) resp.getBody();
            }
        } catch (Exception e) {
            log.warn("AI service explanation generation failed; falling back to grounded rule template", e);
        }

        String fallbackExplanation = String.format(
                "Candidate demonstrates direct experience with %s matching the requirements for %s. Missing components include: %s.",
                matchedReq.isEmpty() ? "general engineering" : String.join(", ", matchedReq),
                title,
                missingReq.isEmpty() ? "none identified" : String.join(", ", missingReq)
        );

        return Map.of(
                "explanation", fallbackExplanation,
                "model", "fallback-grounded",
                "tokens_input", 0,
                "tokens_output", 0,
                "latency_ms", 0
        );
    }

    private void ensureChunksExist(Resume resume) {
        long count = resumeChunkRepository.countByResumeId(resume.getId());
        if (count == 0 && resume.getRawResumeText() != null && !resume.getRawResumeText().isBlank()) {
            log.info("Backfilling resume chunks for resume {}", resume.getId());
            try {
                Map<String, Object> backfillReq = new HashMap<>();
                backfillReq.put("raw_text", resume.getRawResumeText());
                if (resume.getParsedResumeJson() != null && !resume.getParsedResumeJson().isBlank()) {
                    try {
                        backfillReq.put("parsed_json", objectMapper.readValue(resume.getParsedResumeJson(), new TypeReference<Map<String, Object>>() {}));
                    } catch (Exception ignored) {}
                }

                String chunkUrl = aiServiceUrl + "/api/ai/chunk-resume";
                ResponseEntity<Map> chunkResp = restTemplate.postForEntity(chunkUrl, backfillReq, Map.class);
                if (chunkResp.getStatusCode().is2xxSuccessful() && chunkResp.getBody() != null) {
                    List<Map<String, Object>> chunks = (List<Map<String, Object>>) chunkResp.getBody().get("chunks");
                    if (chunks != null && !chunks.isEmpty()) {
                        resumeChunkPersistenceService.saveChunks(resume.getId(), chunks);
                    }
                }
            } catch (Exception e) {
                log.error("Failed to backfill chunks for resume {}", resume.getId(), e);
            }
        }
    }

    private Set<String> extractCandidateSkills(Resume resume) {
        Set<String> skills = new HashSet<>();
        if (resume.getParsedResumeJson() != null && !resume.getParsedResumeJson().isBlank()) {
            try {
                Map<String, Object> parsed = objectMapper.readValue(resume.getParsedResumeJson(), new TypeReference<Map<String, Object>>() {});
                List<?> parsedSkills = (List<?>) parsed.get("skills");
                if (parsedSkills != null) {
                    for (Object s : parsedSkills) {
                        if (s != null) {
                            skills.add(normalize(s.toString()));
                        }
                    }
                }
            } catch (Exception ignored) {}
        }
        return skills;
    }

    private boolean isSkillMatched(String skill, Set<String> candidateSkills, String candidateText) {
        if (skill == null || skill.isBlank()) return false;
        String norm = normalize(skill);

        if (candidateSkills.contains(norm)) return true;

        List<String> aliases = getAliases(norm);
        for (String alias : aliases) {
            if (candidateSkills.contains(alias)) return true;
        }

        // Substring or whole-word search in candidate full resume text
        if (candidateText.contains(norm)) return true;
        for (String alias : aliases) {
            if (candidateText.contains(alias)) return true;
        }

        return false;
    }

    private List<String> getAliases(String normSkill) {
        return switch (normSkill) {
            case "k8s", "kubernetes" -> List.of("k8s", "kubernetes");
            case "postgres", "postgresql" -> List.of("postgres", "postgresql", "pgvector");
            case "spring", "spring boot", "springboot" -> List.of("spring", "spring boot", "springboot");
            case "react", "reactjs", "react.js" -> List.of("react", "reactjs", "react.js");
            case "node", "nodejs", "node.js" -> List.of("node", "nodejs", "node.js");
            case "aws", "amazon web services" -> List.of("aws", "amazon web services");
            case "gcp", "google cloud", "google cloud platform" -> List.of("gcp", "google cloud", "google cloud platform");
            case "kafka", "apache kafka" -> List.of("kafka", "apache kafka");
            case "mongo", "mongodb" -> List.of("mongo", "mongodb");
            case "docker", "containers", "containerization" -> List.of("docker", "containers", "containerization");
            case "ts", "typescript" -> List.of("ts", "typescript");
            case "js", "javascript" -> List.of("js", "javascript");
            default -> List.of();
        };
    }

    private String normalize(String s) {
        return s.toLowerCase().replaceAll("[^a-z0-9\\+\\#\\.]", " ").trim().replaceAll("\\s+", " ");
    }

    private List<String> getSkillList(Object raw) {
        if (raw instanceof List<?> list) {
            return list.stream().filter(Objects::nonNull).map(Object::toString).map(String::trim).filter(s -> !s.isEmpty()).toList();
        }
        return Collections.emptyList();
    }

    private String truncateExcerpt(String content, int maxLen) {
        if (content == null) return "";
        String clean = content.replaceAll("\\s+", " ").trim();
        if (clean.length() <= maxLen) return clean;
        return clean.substring(0, maxLen - 3) + "...";
    }

    private double round4(double val) {
        return BigDecimal.valueOf(val).setScale(4, RoundingMode.HALF_UP).doubleValue();
    }

    private String toJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return "[]";
        }
    }

    private List<String> fromJsonList(String json) {
        if (json == null || json.isBlank()) return Collections.emptyList();
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    private List<EvidenceItem> fromJsonEvidence(String json) {
        if (json == null || json.isBlank()) return Collections.emptyList();
        try {
            return objectMapper.readValue(json, new TypeReference<List<EvidenceItem>>() {});
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    private Map<String, Object> fromJsonMap(String json) {
        if (json == null || json.isBlank()) return Collections.emptyMap();
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            return Collections.emptyMap();
        }
    }

    private void saveMatchingAuditLog(String model, long latencyMs, int tokensIn, int tokensOut) {
        try {
            AiRequestLog requestLog = AiRequestLog.builder()
                    .requestType("MATCHING")
                    .modelName(model)
                    .latencyMs((int) latencyMs)
                    .tokensInput(tokensIn)
                    .tokensOutput(tokensOut)
                    .calculatedCost(BigDecimal.ZERO)
                    .status("SUCCESS")
                    .errorMessage(null)
                    .build();
            aiRequestLogRepository.save(requestLog);
        } catch (Exception e) {
            log.error("Failed to persist MATCHING audit log", e);
        }
    }
}
