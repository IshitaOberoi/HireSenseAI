package com.hiresense.controller;

import com.hiresense.service.JobMatchingService;
import com.hiresense.service.JobMatchingService.JobMatchResponse;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/candidates")
@RequiredArgsConstructor
@Slf4j
public class JobMatchingController {

    private final JobMatchingService jobMatchingService;

    @Data
    public static class JobMatchRequest {
        private String jobDescription;
    }

    @PostMapping("/resumes/{resumeId}/match")
    public ResponseEntity<?> matchJobDescription(
            @PathVariable UUID resumeId,
            @RequestBody JobMatchRequest request) {
        if (request == null || request.getJobDescription() == null || request.getJobDescription().trim().length() < 10) {
            return ResponseEntity.badRequest().body(Map.of("error", "Job description must contain at least 10 characters"));
        }

        log.info("Job matching requested for resume {}", resumeId);
        try {
            JobMatchResponse response = jobMatchingService.matchJobDescription(resumeId, request.getJobDescription().trim());
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            log.warn("Invalid matching request for resume {}: {}", resumeId, e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (IllegalStateException e) {
            log.warn("Illegal state for matching request on resume {}: {}", resumeId, e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("Error evaluating job match for resume {}", resumeId, e);
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to evaluate job match: " + e.getMessage()));
        }
    }

    @GetMapping("/resumes/{resumeId}/matches")
    public ResponseEntity<List<JobMatchResponse>> getJobMatches(@PathVariable UUID resumeId) {
        List<JobMatchResponse> matches = jobMatchingService.getMatchesForResume(resumeId);
        return ResponseEntity.ok(matches);
    }
}
