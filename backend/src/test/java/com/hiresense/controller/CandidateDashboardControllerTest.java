package com.hiresense.controller;

import com.hiresense.model.*;
import com.hiresense.repository.CandidateProfileRepository;
import com.hiresense.repository.ResumeJobMatchRepository;
import com.hiresense.repository.ResumeRepository;
import com.hiresense.service.CandidateDashboardService;
import com.hiresense.service.CandidateDashboardService.DashboardDto;
import com.hiresense.service.CandidateProfileService;
import com.hiresense.service.CandidateProfileService.ProfileDto;
import com.hiresense.service.CandidateRoadmapService;
import com.hiresense.service.CandidateRoadmapService.RoadmapDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CandidateDashboardControllerTest {

    @Mock
    private CandidateProfileRepository candidateProfileRepository;

    @Mock
    private ResumeRepository resumeRepository;

    @Mock
    private ResumeJobMatchRepository resumeJobMatchRepository;

    private CandidateDashboardService dashboardService;
    private CandidateRoadmapService roadmapService;
    private CandidateProfileService profileService;

    private UUID candidateId;
    private CandidateProfile candidate;
    private User user;

    @BeforeEach
    void setUp() {
        candidateId = UUID.randomUUID();
        user = User.builder().id(UUID.randomUUID()).email("test@example.com").build();
        candidate = CandidateProfile.builder()
                .id(candidateId)
                .user(user)
                .firstName("Marcus")
                .lastName("Vance")
                .phone("555-0199")
                .githubUrl("https://github.com/mvance")
                .linkedinUrl("https://linkedin.com/in/mvance")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        dashboardService = new CandidateDashboardService(candidateProfileRepository, resumeRepository, resumeJobMatchRepository);
        roadmapService = new CandidateRoadmapService(candidateProfileRepository, resumeRepository, resumeJobMatchRepository);
        profileService = new CandidateProfileService(candidateProfileRepository);
    }

    @Test
    void dashboardService_ReturnsAggregatedMetrics() {
        when(candidateProfileRepository.findById(candidateId)).thenReturn(Optional.of(candidate));

        Resume resume = Resume.builder()
                .id(UUID.randomUUID())
                .candidate(candidate)
                .fileName("marcus_resume.pdf")
                .processingStatus("COMPLETED")
                .atsScore(88)
                .parsingConfidence(BigDecimal.valueOf(0.96))
                .uploadedAt(LocalDateTime.now())
                .build();
        when(resumeRepository.findByCandidateIdOrderByUploadedAtDesc(candidateId)).thenReturn(List.of(resume));

        JobDescription jd = JobDescription.builder()
                .id(UUID.randomUUID())
                .title("Senior Backend Engineer")
                .company("CloudScale Tech")
                .build();

        ResumeJobMatch match = ResumeJobMatch.builder()
                .id(UUID.randomUUID())
                .resume(resume)
                .jobDescription(jd)
                .matchScore(BigDecimal.valueOf(82.5))
                .semanticSimilarity(BigDecimal.valueOf(0.79))
                .skillCoverage(BigDecimal.valueOf(80.0))
                .matchedSkills("[\"Java\", \"Spring Boot\", \"PostgreSQL\"]")
                .missingSkills("[\"Terraform\", \"Go\"]")
                .createdAt(LocalDateTime.now())
                .build();
        when(resumeJobMatchRepository.findByResumeCandidateIdOrderByCreatedAtDesc(candidateId)).thenReturn(List.of(match));

        DashboardDto dto = dashboardService.getDashboard(candidateId);

        assertNotNull(dto);
        assertEquals("Marcus Vance", dto.getCandidate().getName());
        assertEquals("test@example.com", dto.getCandidate().getEmail());
        assertEquals(1, dto.getResumeSummary().getTotalResumes());
        assertEquals("marcus_resume.pdf", dto.getResumeSummary().getLatestFileName());
        assertEquals(88, dto.getResumeSummary().getAtsScore());
        assertEquals(1, dto.getMatchingSummary().getTotalMatches());
        assertEquals(82.5, dto.getMatchingSummary().getAverageScore());
        assertEquals(82.5, dto.getMatchingSummary().getTopScore());
        assertFalse(dto.getMatchingSummary().getTopSkillGaps().isEmpty());
        assertNotNull(dto.getInsight().getHeadline());
    }

    @Test
    void roadmapService_CalculatesDeterministicSkillCoverage() {
        when(candidateProfileRepository.findById(candidateId)).thenReturn(Optional.of(candidate));

        Resume resume = Resume.builder()
                .id(UUID.randomUUID())
                .candidate(candidate)
                .fileName("marcus_resume.pdf")
                .parsedResumeJson("{\"skills\": [\"Java\", \"Spring Boot\", \"PostgreSQL\", \"Docker\"]}")
                .uploadedAt(LocalDateTime.now())
                .build();
        when(resumeRepository.findByCandidateIdOrderByUploadedAtDesc(candidateId)).thenReturn(List.of(resume));

        JobDescription jd = JobDescription.builder()
                .id(UUID.randomUUID())
                .title("Platform Engineer")
                .company("Acme Corp")
                .build();

        ResumeJobMatch match = ResumeJobMatch.builder()
                .id(UUID.randomUUID())
                .resume(resume)
                .jobDescription(jd)
                .matchScore(BigDecimal.valueOf(75.0))
                .matchedSkills("[\"Java\", \"Spring Boot\", \"Docker\"]")
                .missingSkills("[\"Kubernetes\", \"Terraform\"]")
                .createdAt(LocalDateTime.now())
                .build();
        when(resumeJobMatchRepository.findByResumeCandidateIdOrderByCreatedAtDesc(candidateId)).thenReturn(List.of(match));

        RoadmapDto roadmap = roadmapService.getRoadmap(candidateId);

        assertNotNull(roadmap);
        assertEquals("Marcus Vance", roadmap.getCandidateName());
        assertTrue(roadmap.getVerifiedSkills().contains("Java"));
        assertTrue(roadmap.getVerifiedSkills().contains("PostgreSQL"));
        assertTrue(roadmap.getIdentifiedSkillGaps().contains("Kubernetes"));
        assertTrue(roadmap.getIdentifiedSkillGaps().contains("Terraform"));

        // Verify transparent required skill coverage (X / Y)
        assertEquals(3, roadmap.getSkillCoverage().getVerifiedCount()); // Java, Spring Boot, Docker
        assertEquals(5, roadmap.getSkillCoverage().getTotalRequiredCount()); // + Kubernetes, Terraform
        assertEquals(2, roadmap.getSkillCoverage().getMissingCount());
        assertTrue(roadmap.getSkillCoverage().getCoverageText().contains("3 / 5"));

        // Verify 3 progression phases when required gaps exist
        assertEquals(3, roadmap.getProgressionPhases().size());
        assertEquals(1, roadmap.getProgressionPhases().get(0).getPhaseNumber());
        assertEquals("Phase 1: Bridge Required Skill Gaps", roadmap.getProgressionPhases().get(0).getPhaseTitle());
        assertEquals("Target Role Core Competencies", roadmap.getProgressionPhases().get(0).getFocusArea());
        assertTrue(roadmap.getProgressionPhases().get(0).getTargetSkills().contains("Kubernetes"));
        assertEquals(2, roadmap.getProgressionPhases().get(1).getPhaseNumber());
        assertEquals(3, roadmap.getProgressionPhases().get(2).getPhaseNumber());
    }

    @Test
    void roadmapService_ZeroRequiredSkillGaps_FocusesOnRoleReadiness() {
        when(candidateProfileRepository.findById(candidateId)).thenReturn(Optional.of(candidate));

        Resume resume = Resume.builder()
                .id(UUID.randomUUID())
                .candidate(candidate)
                .fileName("marcus_resume.pdf")
                .parsedResumeJson("{\"skills\": [\"Java\", \"Spring Boot\", \"PostgreSQL\", \"Docker\"]}")
                .uploadedAt(LocalDateTime.now())
                .build();
        when(resumeRepository.findByCandidateIdOrderByUploadedAtDesc(candidateId)).thenReturn(List.of(resume));

        JobDescription jd = JobDescription.builder()
                .id(UUID.randomUUID())
                .title("Senior Backend Engineer")
                .company("Acme Corp")
                .parsedJobJson("{\"required_skills\": [\"Java\", \"Spring Boot\", \"PostgreSQL\", \"Docker\"], \"preferred_skills\": [\"Terraform\", \"Go\"]}")
                .build();

        ResumeJobMatch match = ResumeJobMatch.builder()
                .id(UUID.randomUUID())
                .resume(resume)
                .jobDescription(jd)
                .matchScore(BigDecimal.valueOf(88.0))
                .matchedSkills("[\"Java\", \"Spring Boot\", \"PostgreSQL\", \"Docker\"]")
                .missingSkills("[]")
                .createdAt(LocalDateTime.now())
                .build();
        when(resumeJobMatchRepository.findByResumeCandidateIdOrderByCreatedAtDesc(candidateId)).thenReturn(List.of(match));

        RoadmapDto roadmap = roadmapService.getRoadmap(candidateId);

        assertNotNull(roadmap);
        assertEquals(0, roadmap.getSkillCoverage().getMissingCount());
        assertEquals(1.0, roadmap.getSkillCoverage().getCoverageRatio());
        assertTrue(roadmap.getIdentifiedSkillGaps().isEmpty());
        assertEquals(List.of("Terraform", "Go"), roadmap.getIdentifiedPreferredGaps());

        // Verify Phase 1 is labeled 'Strengthen Role Readiness' and NOT 'Bridge Required Skill Gaps'
        var phase1 = roadmap.getProgressionPhases().get(0);
        assertEquals("Phase 1: Strengthen Role Readiness", phase1.getPhaseTitle());
        assertEquals("Preferred Qualifications & Advanced Differentiation", phase1.getFocusArea());
        assertFalse(phase1.getPhaseTitle().contains("Bridge Required"));
        assertEquals(List.of("Terraform", "Go"), phase1.getTargetSkills());
    }

    @Test
    void profileService_GetAndUpdateProfile() {
        when(candidateProfileRepository.findById(candidateId)).thenReturn(Optional.of(candidate));
        when(candidateProfileRepository.save(any(CandidateProfile.class))).thenReturn(candidate);

        ProfileDto profile = profileService.getProfile(candidateId);
        assertNotNull(profile);
        assertEquals("Marcus", profile.getFirstName());
        assertEquals("Vance", profile.getLastName());
        assertEquals("test@example.com", profile.getEmail());

        ProfileDto updateReq = ProfileDto.builder()
                .firstName("Marcus Updated")
                .lastName("Vance")
                .phone("555-9999")
                .githubUrl("https://github.com/updated")
                .linkedinUrl("https://linkedin.com/in/updated")
                .build();

        ProfileDto updated = profileService.updateProfile(candidateId, updateReq);
        assertEquals("Marcus Updated", updated.getFirstName());
        assertEquals("555-9999", updated.getPhone());
    }

    @Test
    void candidateNotFound_ThrowsException() {
        UUID unknownId = UUID.randomUUID();
        when(candidateProfileRepository.findById(unknownId)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> dashboardService.getDashboard(unknownId));
        assertThrows(IllegalArgumentException.class, () -> roadmapService.getRoadmap(unknownId));
        assertThrows(IllegalArgumentException.class, () -> profileService.getProfile(unknownId));
    }
}
