package com.hiresense.controller;

import com.hiresense.service.ResumeRagService;
import com.hiresense.service.ResumeRagService.RagResponse;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/candidates")
@RequiredArgsConstructor
@Slf4j
public class ResumeRagController {

    private final ResumeRagService resumeRagService;

    @Data
    public static class RagQuestionRequest {
        private String question;
    }

    @PostMapping("/resumes/{resumeId}/ask")
    public ResponseEntity<?> askResumeQuestion(
            @PathVariable UUID resumeId,
            @RequestBody RagQuestionRequest request) {
        if (request == null || request.getQuestion() == null || request.getQuestion().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Question cannot be blank"));
        }

        log.info("RAG query received for resume {}: '{}'", resumeId, request.getQuestion());
        try {
            RagResponse response = resumeRagService.askQuestion(resumeId, request.getQuestion().trim());
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            log.warn("Invalid RAG request for resume {}: {}", resumeId, e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (IllegalStateException e) {
            log.warn("Illegal state for RAG request on resume {}: {}", resumeId, e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("Error evaluating RAG question for resume {}", resumeId, e);
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to process RAG query: " + e.getMessage()));
        }
    }
}
