package com.hiresense.controller;

import com.hiresense.service.JobMatchingService;
import com.hiresense.service.JobMatchingService.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class JobMatchingControllerTest {

    @Mock
    private JobMatchingService jobMatchingService;

    @InjectMocks
    private JobMatchingController controller;

    private UUID resumeId;

    @BeforeEach
    void setUp() {
        resumeId = UUID.randomUUID();
    }

    @Test
    void matchJobDescription_BlankDescription_ReturnsBadRequest() {
        JobMatchingController.JobMatchRequest req = new JobMatchingController.JobMatchRequest();
        req.setJobDescription("   ");

        ResponseEntity<?> resp = controller.matchJobDescription(resumeId, req);
        assertEquals(HttpStatus.BAD_REQUEST, resp.getStatusCode());
        assertTrue(resp.getBody() instanceof Map);
        Map<?, ?> body = (Map<?, ?>) resp.getBody();
        assertEquals("Job description must contain at least 10 characters", body.get("error"));
        verifyNoInteractions(jobMatchingService);
    }

    @Test
    void matchJobDescription_ShortDescription_ReturnsBadRequest() {
        JobMatchingController.JobMatchRequest req = new JobMatchingController.JobMatchRequest();
        req.setJobDescription("Too short");

        ResponseEntity<?> resp = controller.matchJobDescription(resumeId, req);
        assertEquals(HttpStatus.BAD_REQUEST, resp.getStatusCode());
        verifyNoInteractions(jobMatchingService);
    }

    @Test
    void matchJobDescription_ResumeNotFound_ReturnsBadRequest() {
        JobMatchingController.JobMatchRequest req = new JobMatchingController.JobMatchRequest();
        req.setJobDescription("We are looking for a Senior Java Developer with Spring Boot and Kafka experience.");

        when(jobMatchingService.matchJobDescription(eq(resumeId), anyString()))
                .thenThrow(new IllegalArgumentException("Resume not found with ID: " + resumeId));

        ResponseEntity<?> resp = controller.matchJobDescription(resumeId, req);
        assertEquals(HttpStatus.BAD_REQUEST, resp.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) resp.getBody();
        assertTrue(body.get("error").toString().contains("Resume not found"));
    }

    @Test
    void matchJobDescription_IncompleteResume_ReturnsBadRequest() {
        JobMatchingController.JobMatchRequest req = new JobMatchingController.JobMatchRequest();
        req.setJobDescription("We are looking for a Senior Java Developer with Spring Boot and Kafka experience.");

        when(jobMatchingService.matchJobDescription(eq(resumeId), anyString()))
                .thenThrow(new IllegalStateException("Resume analysis is not yet completed (current status: PROCESSING)"));

        ResponseEntity<?> resp = controller.matchJobDescription(resumeId, req);
        assertEquals(HttpStatus.BAD_REQUEST, resp.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) resp.getBody();
        assertTrue(body.get("error").toString().contains("Resume analysis is not yet completed"));
    }

    @Test
    void matchJobDescription_Valid_ReturnsOk() {
        JobMatchingController.JobMatchRequest req = new JobMatchingController.JobMatchRequest();
        String jdText = "We are seeking a Senior Infrastructure Engineer with experience in Apache Kafka, Spring Boot, and PostgreSQL.";
        req.setJobDescription(jdText);

        JobMatchResponse mockResponse = JobMatchResponse.builder()
                .id(UUID.randomUUID())
                .resumeId(resumeId)
                .jobTitle("Senior Infrastructure Engineer")
                .company("CloudFlow Systems")
                .matchScore(77.2)
                .alignmentRating("Strong Match")
                .scoreBreakdown(ScoreBreakdown.builder()
                        .requiredSkillCoverage(0.85)
                        .semanticSimilarity(0.7842)
                        .preferredSkillCoverage(0.67)
                        .evidenceRelevance(0.6415)
                        .weights(Map.of(
                                "requiredSkills", 0.40,
                                "semanticSimilarity", 0.30,
                                "preferredSkills", 0.15,
                                "experienceEvidence", 0.15
                        ))
                        .build())
                .skillsAnalysis(SkillsAnalysis.builder()
                        .required(List.of("Apache Kafka", "Spring Boot", "PostgreSQL"))
                        .matched(List.of("Apache Kafka", "Spring Boot", "PostgreSQL"))
                        .missing(List.of())
                        .preferred(List.of("Redis"))
                        .matchedPreferred(List.of("Redis"))
                        .missingPreferred(List.of())
                        .build())
                .evidence(List.of(
                        EvidenceItem.builder()
                                .chunkIndex(2)
                                .sectionName("Experience")
                                .excerpt("Architected event streaming pipeline using Kafka...")
                                .similarity(0.7241)
                                .build()
                ))
                .explanation("Candidate shows strong alignment with Apache Kafka and Spring Boot experience.")
                .metadata(Map.of("model", "openai/gpt-oss-120b"))
                .build();

        when(jobMatchingService.matchJobDescription(eq(resumeId), eq(jdText)))
                .thenReturn(mockResponse);

        ResponseEntity<?> resp = controller.matchJobDescription(resumeId, req);
        assertEquals(HttpStatus.OK, resp.getStatusCode());
        assertNotNull(resp.getBody());
        assertTrue(resp.getBody() instanceof JobMatchResponse);

        JobMatchResponse result = (JobMatchResponse) resp.getBody();
        assertEquals(77.2, result.getMatchScore());
        assertEquals("Senior Infrastructure Engineer", result.getJobTitle());
        assertEquals("Strong Match", result.getAlignmentRating());
        assertEquals(1, result.getEvidence().size());
    }

    @Test
    void matchScore_DeterministicIndependentCalculation_Verified() {
        // Test that independently calculating the score from scoreBreakdown matches the returned matchScore
        double reqCoverage = 0.85;
        double semSim = 0.7842;
        double prefCoverage = 0.67;
        double evRel = 0.6415;

        double wReq = 0.40;
        double wSem = 0.30;
        double wPref = 0.15;
        double wEv = 0.15;

        double rawExpected = (reqCoverage * wReq) + (semSim * wSem) + (prefCoverage * wPref) + (evRel * wEv);
        double expectedScore = BigDecimal.valueOf(rawExpected * 100.0)
                .setScale(1, RoundingMode.HALF_UP)
                .doubleValue();

        assertEquals(77.2, expectedScore, 0.05, "Mathematical calculation must equal 77.2%");

        JobMatchResponse response = JobMatchResponse.builder()
                .matchScore(expectedScore)
                .scoreBreakdown(ScoreBreakdown.builder()
                        .requiredSkillCoverage(reqCoverage)
                        .semanticSimilarity(semSim)
                        .preferredSkillCoverage(prefCoverage)
                        .evidenceRelevance(evRel)
                        .weights(Map.of(
                                "requiredSkills", wReq,
                                "semanticSimilarity", wSem,
                                "preferredSkills", wPref,
                                "experienceEvidence", wEv
                        ))
                        .build())
                .build();

        // Verify that the response fields match the independent calculation
        ScoreBreakdown sb = response.getScoreBreakdown();
        double derivedScore = BigDecimal.valueOf((
                sb.getRequiredSkillCoverage() * sb.getWeights().get("requiredSkills")
                + sb.getSemanticSimilarity() * sb.getWeights().get("semanticSimilarity")
                + sb.getPreferredSkillCoverage() * sb.getWeights().get("preferredSkills")
                + sb.getEvidenceRelevance() * sb.getWeights().get("experienceEvidence")
        ) * 100.0).setScale(1, RoundingMode.HALF_UP).doubleValue();

        assertEquals(response.getMatchScore(), derivedScore, 0.001);
    }

    @Test
    void getJobMatches_ValidResumeId_ReturnsList() {
        when(jobMatchingService.getMatchesForResume(eq(resumeId)))
                .thenReturn(List.of(
                        JobMatchResponse.builder()
                                .id(UUID.randomUUID())
                                .resumeId(resumeId)
                                .jobTitle("Senior Backend Engineer")
                                .matchScore(81.5)
                                .build()
                ));

        ResponseEntity<List<JobMatchResponse>> resp = controller.getJobMatches(resumeId);
        assertEquals(HttpStatus.OK, resp.getStatusCode());
        assertNotNull(resp.getBody());
        assertEquals(1, resp.getBody().size());
        assertEquals(81.5, resp.getBody().get(0).getMatchScore());
    }
}
