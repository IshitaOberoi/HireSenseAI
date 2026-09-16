package com.hiresense.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hiresense.model.AiRequestLog;
import com.hiresense.model.CandidateProfile;
import com.hiresense.model.Resume;
import com.hiresense.repository.AiRequestLogRepository;
import com.hiresense.repository.CandidateProfileRepository;
import com.hiresense.repository.ResumeRepository;
import com.hiresense.service.ResumeProcessingPersistenceService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/internal")
@RequiredArgsConstructor
@Slf4j
public class InternalCallbackController {

    private final ResumeRepository resumeRepository;
    private final CandidateProfileRepository candidateProfileRepository;
    private final AiRequestLogRepository aiRequestLogRepository;
    private final ResumeProcessingPersistenceService resumeProcessingPersistenceService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Data
    public static class CallbackRequest {
        private UUID resume_id;
        private String raw_resume_text;
        private String parsed_resume_json;
        private List<Double> resume_embedding;
        private Double parsing_confidence;
        private String status; // SUCCESS, FAILED
        private String error_message;
        private Map<String, Object> log_record;
    }

    @PostMapping("/resumes/callback")
    @Transactional
    public ResponseEntity<?> handleParserCallback(@RequestBody CallbackRequest request) {
        log.info("Received callback from FastAPI for resume: {}", request.getResume_id());

        try {
            // Save AI log entry
            if (request.getLog_record() != null) {
                saveAiRequestLog(request.getLog_record());
            }

            Resume resume = resumeRepository.findById(request.getResume_id())
                    .orElseThrow(() -> new RuntimeException("Resume not found: " + request.getResume_id()));

            if ("FAILED".equalsIgnoreCase(request.getStatus())) {
                log.warn("Parser reported failure for resume {}: {}", request.getResume_id(), request.getError_message());
                resumeProcessingPersistenceService.fail(resume.getId(), nonBlank(request.getError_message(), "AI parsing failed"));
                return ResponseEntity.ok(Map.of("success", true));
            }

            // Convert double list to pgvector string syntax: '[0.1, 0.2, ...]'
            String vectorStr = null;
            if (request.getResume_embedding() != null && !request.getResume_embedding().isEmpty()) {
                if (request.getResume_embedding().size() != 384) {
                    resumeProcessingPersistenceService.fail(resume.getId(), "AI service returned an embedding with an invalid dimension");
                    return ResponseEntity.badRequest().body(Map.of("error", "resume_embedding must contain exactly 384 values"));
                }
                if (request.getResume_embedding().stream().anyMatch(value -> value == null || !Double.isFinite(value))) {
                    resumeProcessingPersistenceService.fail(resume.getId(), "AI service returned a non-finite embedding value");
                    return ResponseEntity.badRequest().body(Map.of("error", "resume_embedding must contain finite numeric values"));
                }
                vectorStr = request.getResume_embedding().toString();
            }
            if (vectorStr == null || request.getParsed_resume_json() == null || request.getRaw_resume_text() == null) {
                resumeProcessingPersistenceService.fail(resume.getId(), "AI callback omitted required parsing output");
                return ResponseEntity.badRequest().body(Map.of("error", "Successful callback requires text, JSON, and a 384-dimensional embedding"));
            }
            if (request.getParsing_confidence() == null || request.getParsing_confidence() < 0 || request.getParsing_confidence() > 1) {
                resumeProcessingPersistenceService.fail(resume.getId(), "AI service returned an invalid parsing confidence");
                return ResponseEntity.badRequest().body(Map.of("error", "parsing_confidence must be between 0 and 1"));
            }

            objectMapper.readTree(request.getParsed_resume_json());
            resumeProcessingPersistenceService.complete(resume.getId(), request.getRaw_resume_text(),
                    request.getParsed_resume_json(), vectorStr, request.getParsing_confidence());
            log.info("Successfully updated resume record in database.");

            // Update candidate profile fields based on parsed JSON
            if (request.getParsed_resume_json() != null) {
                updateCandidateProfile(resume.getCandidate(), request.getParsed_resume_json());
            }

            return ResponseEntity.ok(Map.of("success", true));

        } catch (Exception e) {
            log.error("Failed to process parser callback", e);
            if (request.getResume_id() != null) {
                try {
                    resumeProcessingPersistenceService.fail(request.getResume_id(), "Callback persistence failed: " + nonBlank(e.getMessage(), e.getClass().getSimpleName()));
                } catch (Exception persistenceError) {
                    log.error("Unable to persist callback failure state", persistenceError);
                }
            }
            return ResponseEntity.internalServerError().body(e.getMessage());
        }
    }

    private void saveAiRequestLog(Map<String, Object> logNode) {
        try {
            AiRequestLog requestLog = AiRequestLog.builder()
                    .requestType((String) logNode.getOrDefault("request_type", "PARSING"))
                    .modelName((String) logNode.getOrDefault("model_name", "Groq Llama-3"))
                    .latencyMs(numberValue(logNode.get("latency_ms")))
                    .tokensInput(numberValue(logNode.get("tokens_input")))
                    .tokensOutput(numberValue(logNode.get("tokens_output")))
                    .calculatedCost(BigDecimal.valueOf(((Number) logNode.getOrDefault("calculated_cost", 0.0)).doubleValue()))
                    .status((String) logNode.getOrDefault("status", "SUCCESS"))
                    .errorMessage((String) logNode.get("error_message"))
                    .build();
            aiRequestLogRepository.save(requestLog);
        } catch (Exception e) {
            log.error("Failed to save AI request audit log", e);
        }
    }

    private int numberValue(Object value) {
        return value instanceof Number number ? number.intValue() : 0;
    }

    private String nonBlank(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private void updateCandidateProfile(CandidateProfile profile, String parsedJsonStr) {
        try {
            JsonNode root = objectMapper.readTree(parsedJsonStr);
            String firstName = root.path("first_name").asText();
            String lastName = root.path("last_name").asText();
            String phone = root.path("phone").asText();
            String github = root.path("github_url").asText();
            String linkedin = root.path("linkedin_url").asText();

            profile.setFirstName(firstName);
            profile.setLastName(lastName);
            if (phone != null && !phone.isEmpty()) profile.setPhone(phone);
            if (github != null && !github.isEmpty()) profile.setGithubUrl(github);
            if (linkedin != null && !linkedin.isEmpty()) profile.setLinkedinUrl(linkedin);

            candidateProfileRepository.save(profile);
            log.info("Candidate profile details updated for ID: {}", profile.getId());
        } catch (Exception e) {
            log.error("Failed to parse resume JSON to update candidate profile columns", e);
        }
    }
}
