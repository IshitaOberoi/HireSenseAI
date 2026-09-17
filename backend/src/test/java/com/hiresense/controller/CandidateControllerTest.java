package com.hiresense.controller;

import com.hiresense.model.CandidateProfile;
import com.hiresense.model.Resume;
import com.hiresense.repository.CandidateProfileRepository;
import com.hiresense.repository.ResumeRepository;
import com.hiresense.service.StorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CandidateControllerTest {

    @Mock
    private StorageService storageService;

    @Mock
    private ResumeRepository resumeRepository;

    @Mock
    private CandidateProfileRepository candidateProfileRepository;

    @Mock
    private com.hiresense.service.CandidateDashboardService candidateDashboardService;

    @Mock
    private com.hiresense.service.CandidateRoadmapService candidateRoadmapService;

    @Mock
    private com.hiresense.service.CandidateProfileService candidateProfileService;

    @InjectMocks
    private CandidateController controller;

    private UUID candidateId;
    private UUID resumeId;

    @BeforeEach
    void setUp() {
        candidateId = UUID.randomUUID();
        resumeId = UUID.randomUUID();
    }

    @Test
    void uploadResume_RejectsUnsupportedFileType() {
        MockMultipartFile file = new MockMultipartFile("file", "test.exe", "application/octet-stream", "content".getBytes());

        ResponseEntity<?> response = controller.uploadResume(file, candidateId);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertTrue(response.getBody().toString().contains("Only PDF and DOCX"));
    }

    @Test
    void uploadResume_RejectsEmptyFile() {
        MockMultipartFile file = new MockMultipartFile("file", "resume.pdf", "application/pdf", new byte[0]);

        ResponseEntity<?> response = controller.uploadResume(file, candidateId);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertTrue(response.getBody().toString().contains("File is empty"));
    }

    @Test
    void getResumeById_ReturnsResumeWhenFound() {
        Resume resume = Resume.builder()
                .id(resumeId)
                .fileName("resume.pdf")
                .processingStatus("COMPLETED")
                .parsingConfidence(java.math.BigDecimal.valueOf(0.95))
                .build();

        when(resumeRepository.findById(resumeId)).thenReturn(Optional.of(resume));

        ResponseEntity<?> response = controller.getResumeById(resumeId);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(resume, response.getBody());
    }

    @Test
    void getResumeById_Returns404WhenNotFound() {
        when(resumeRepository.findById(resumeId)).thenReturn(Optional.empty());

        ResponseEntity<?> response = controller.getResumeById(resumeId);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }
}
