package com.hiresense.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hiresense.model.CandidateProfile;
import com.hiresense.model.Resume;
import com.hiresense.repository.AiRequestLogRepository;
import com.hiresense.repository.CandidateProfileRepository;
import com.hiresense.repository.ResumeRepository;
import com.hiresense.service.ResumeProcessingPersistenceService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InternalCallbackControllerTest {

    @Mock
    private ResumeRepository resumeRepository;

    @Mock
    private CandidateProfileRepository candidateProfileRepository;

    @Mock
    private AiRequestLogRepository aiRequestLogRepository;

    @Mock
    private ResumeProcessingPersistenceService persistenceService;

    @Mock
    private com.hiresense.service.ResumeChunkPersistenceService resumeChunkPersistenceService;

    @InjectMocks
    private InternalCallbackController controller;

    private UUID resumeId;
    private Resume mockResume;
    private CandidateProfile mockProfile;

    @BeforeEach
    void setUp() {
        resumeId = UUID.randomUUID();
        mockProfile = CandidateProfile.builder()
                .id(UUID.randomUUID())
                .firstName("OldFirst")
                .lastName("OldLast")
                .build();
        mockResume = Resume.builder()
                .id(resumeId)
                .candidate(mockProfile)
                .fileName("resume.pdf")
                .processingStatus("PROCESSING")
                .build();
    }

    @Test
    void callback_Success_Persists384DimensionVectorAndUpdatesProfile() {
        when(resumeRepository.findById(resumeId)).thenReturn(Optional.of(mockResume));
        when(persistenceService.complete(eq(resumeId), anyString(), anyString(), anyString(), anyDouble()))
                .thenReturn(1);

        List<Double> validEmbedding = new ArrayList<>(Collections.nCopies(384, 0.05));
        String parsedJson = """
                {
                    "first_name": "Alex",
                    "last_name": "Mercer",
                    "summary": "Senior Engineer with cloud experience",
                    "skills": ["Java", "Spring Boot"]
                }
                """;

        InternalCallbackController.CallbackRequest request = new InternalCallbackController.CallbackRequest();
        request.setResume_id(resumeId);
        request.setStatus("SUCCESS");
        request.setRaw_resume_text("Raw text content of the resume");
        request.setParsed_resume_json(parsedJson);
        request.setResume_embedding(validEmbedding);
        request.setParsing_confidence(0.92);
        request.setLog_record(Map.of(
                "request_type", "PARSING",
                "model_name", "llama-3.3-70b-versatile",
                "latency_ms", 1200,
                "status", "SUCCESS"
        ));

        ResponseEntity<?> response = controller.handleParserCallback(request);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(persistenceService).complete(eq(resumeId), eq("Raw text content of the resume"), eq(parsedJson), anyString(), eq(0.92));
        verify(candidateProfileRepository).save(argThat(profile -> "Alex".equals(profile.getFirstName()) && "Mercer".equals(profile.getLastName())));
        verify(aiRequestLogRepository).save(any());
    }

    @Test
    void callback_RejectsInvalidEmbeddingDimensions() {
        when(resumeRepository.findById(resumeId)).thenReturn(Optional.of(mockResume));

        List<Double> invalidEmbedding = List.of(0.1, 0.2, 0.3); // Only 3 dimensions instead of 384

        InternalCallbackController.CallbackRequest request = new InternalCallbackController.CallbackRequest();
        request.setResume_id(resumeId);
        request.setStatus("SUCCESS");
        request.setRaw_resume_text("Raw text");
        request.setParsed_resume_json("{\"first_name\": \"Test\"}");
        request.setResume_embedding(invalidEmbedding);
        request.setParsing_confidence(0.85);

        ResponseEntity<?> response = controller.handleParserCallback(request);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        verify(persistenceService).fail(eq(resumeId), contains("invalid dimension"));
    }

    @Test
    void callback_FailureStatus_TransitionsResumeToFailed() {
        when(resumeRepository.findById(resumeId)).thenReturn(Optional.of(mockResume));

        InternalCallbackController.CallbackRequest request = new InternalCallbackController.CallbackRequest();
        request.setResume_id(resumeId);
        request.setStatus("FAILED");
        request.setError_message("Groq API key invalid or rate limit exceeded");

        ResponseEntity<?> response = controller.handleParserCallback(request);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(persistenceService).fail(eq(resumeId), eq("Groq API key invalid or rate limit exceeded"));
    }
}
