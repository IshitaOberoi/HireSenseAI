package com.hiresense.controller;

import com.hiresense.model.CandidateProfile;
import com.hiresense.model.Resume;
import com.hiresense.repository.CandidateProfileRepository;
import com.hiresense.repository.ResumeRepository;
import com.hiresense.service.StorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/candidates")
@RequiredArgsConstructor
@Slf4j
public class CandidateController {

    private final StorageService storageService;
    private final ResumeRepository resumeRepository;
    private final CandidateProfileRepository candidateProfileRepository;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${app.ai-service.url:http://localhost:8000}")
    private String aiServiceUrl;

    @PostMapping("/resume/upload")
    public ResponseEntity<?> uploadResume(
            @RequestParam("file") MultipartFile file,
            @RequestParam("candidateId") UUID candidateId) {
        
        log.info("Received resume upload request for candidate: {}", candidateId);

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "File is empty"));
        }
        if (file.getSize() > 10 * 1024 * 1024) {
            return ResponseEntity.badRequest().body(Map.of("error", "File must not exceed 10 MB"));
        }
        String filename = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase();
        if (!(filename.endsWith(".pdf") || filename.endsWith(".docx"))) {
            return ResponseEntity.badRequest().body(Map.of("error", "Only PDF and DOCX resumes are supported"));
        }

        try {
            CandidateProfile candidate = candidateProfileRepository.findById(candidateId)
                    .orElseThrow(() -> new RuntimeException("Candidate not found: " + candidateId));

            // Upload the file via LocalStorage or S3
            String fileKey = storageService.uploadFile(file);

            // Save resume metadata to PostgreSQL
            Resume resume = Resume.builder()
                    .candidate(candidate)
                    .fileName(file.getOriginalFilename())
                    .s3Key(fileKey)
                    .atsScore(0)
                    .processingStatus("UPLOADED")
                    .build();

            Resume savedResume = resumeRepository.save(resume);
            log.info("Saved resume metadata in database. ID: {}", savedResume.getId());

            savedResume.setProcessingStatus("PROCESSING");
            savedResume.setProcessingError(null);
            resumeRepository.save(savedResume);

            triggerAiParserService(savedResume.getId(), fileKey);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Resume uploaded successfully. Parsing in progress.",
                    "resumeId", savedResume.getId(),
                    "fileName", savedResume.getFileName()
            ));

        } catch (AiDispatchException e) {
            log.error("AI parser did not accept resume {}", e.resumeId, e);
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("error", "Resume processing service is unavailable", "resumeId", e.resumeId));
        } catch (Exception e) {
            log.error("Failed to upload and parse resume", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/{candidateId}/resumes")
    public ResponseEntity<List<Resume>> getResumes(@PathVariable UUID candidateId) {
        List<Resume> resumes = resumeRepository.findByCandidateIdOrderByUploadedAtDesc(candidateId);
        return ResponseEntity.ok(resumes);
    }

    @GetMapping("/resumes/{id}")
    public ResponseEntity<?> getResumeById(@PathVariable UUID id) {
        return resumeRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    private void triggerAiParserService(UUID resumeId, String fileKey) {
        try {
            String url = aiServiceUrl + "/api/ai/parse-resume";
            Map<String, Object> request = new HashMap<>();
            request.put("resume_id", resumeId.toString());
            request.put("s3_key", fileKey);

            log.info("Triggering FastAPI AI parser at {} for resume {}", url, resumeId);
            Map<?, ?> response = restTemplate.postForObject(url, request, Map.class);
            if (response == null || !Boolean.TRUE.equals(response.get("success"))) {
                throw new IllegalStateException("AI service did not acknowledge the parsing task");
            }
        } catch (Exception e) {
            Resume resume = resumeRepository.findById(resumeId).orElse(null);
            if (resume != null) {
                resume.setProcessingStatus("FAILED");
                resume.setProcessingError("Unable to schedule AI parsing: " + safeMessage(e));
                resumeRepository.save(resume);
            }
            throw new AiDispatchException(resumeId, e);
        }
    }

    private String safeMessage(Exception exception) {
        return exception.getMessage() == null ? exception.getClass().getSimpleName() : exception.getMessage();
    }

    private static class AiDispatchException extends RuntimeException {
        private final UUID resumeId;

        private AiDispatchException(UUID resumeId, Exception cause) {
            super(cause);
            this.resumeId = resumeId;
        }
    }
}
