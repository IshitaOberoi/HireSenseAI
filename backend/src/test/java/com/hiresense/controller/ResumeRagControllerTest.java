package com.hiresense.controller;

import com.hiresense.service.ResumeRagService;
import com.hiresense.service.ResumeRagService.RagResponse;
import com.hiresense.service.ResumeRagService.RetrievedSource;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ResumeRagControllerTest {

    @Mock
    private ResumeRagService resumeRagService;

    @InjectMocks
    private ResumeRagController controller;

    private UUID resumeId;

    @BeforeEach
    void setUp() {
        resumeId = UUID.randomUUID();
    }

    @Test
    void askQuestion_BlankQuestion_ReturnsBadRequest() {
        ResumeRagController.RagQuestionRequest req = new ResumeRagController.RagQuestionRequest();
        req.setQuestion("   ");

        ResponseEntity<?> resp = controller.askResumeQuestion(resumeId, req);
        assertEquals(HttpStatus.BAD_REQUEST, resp.getStatusCode());
        assertTrue(resp.getBody() instanceof Map);
        Map<?, ?> body = (Map<?, ?>) resp.getBody();
        assertEquals("Question cannot be blank", body.get("error"));
        verifyNoInteractions(resumeRagService);
    }

    @Test
    void askQuestion_ValidQuestion_ReturnsOkWithRagResponse() {
        ResumeRagController.RagQuestionRequest req = new ResumeRagController.RagQuestionRequest();
        req.setQuestion("What is the candidate's experience with Java?");

        RagResponse mockResponse = RagResponse.builder()
                .question("What is the candidate's experience with Java?")
                .answer("Alex has 5 years of experience building Java and Spring Boot microservices.")
                .sources(List.of(
                        RetrievedSource.builder()
                                .chunkIndex(1)
                                .sectionName("Experience")
                                .excerpt("Lead Engineer at TechCorp. Built Java microservices...")
                                .similarity(0.82)
                                .build()
                ))
                .metadata(Map.of("model", "openai/gpt-oss-120b", "chunks_used", 1))
                .build();

        when(resumeRagService.askQuestion(eq(resumeId), eq("What is the candidate's experience with Java?")))
                .thenReturn(mockResponse);

        ResponseEntity<?> resp = controller.askResumeQuestion(resumeId, req);
        assertEquals(HttpStatus.OK, resp.getStatusCode());
        assertNotNull(resp.getBody());
        assertTrue(resp.getBody() instanceof RagResponse);
        RagResponse result = (RagResponse) resp.getBody();
        assertEquals(mockResponse.getAnswer(), result.getAnswer());
        assertEquals(1, result.getSources().size());
        assertEquals(0.82, result.getSources().get(0).getSimilarity());
    }

    @Test
    void askQuestion_ResumeNotFound_ReturnsBadRequest() {
        ResumeRagController.RagQuestionRequest req = new ResumeRagController.RagQuestionRequest();
        req.setQuestion("What are the candidate's skills?");

        when(resumeRagService.askQuestion(eq(resumeId), anyString()))
                .thenThrow(new IllegalArgumentException("Resume not found with ID: " + resumeId));

        ResponseEntity<?> resp = controller.askResumeQuestion(resumeId, req);
        assertEquals(HttpStatus.BAD_REQUEST, resp.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) resp.getBody();
        assertTrue(body.get("error").toString().contains("Resume not found"));
    }
}
