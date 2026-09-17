package com.hiresense.service;

import com.hiresense.model.CandidateProfile;
import com.hiresense.repository.CandidateProfileRepository;
import lombok.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class CandidateProfileService {

    private final CandidateProfileRepository candidateProfileRepository;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProfileDto {
        private UUID id;
        private String firstName;
        private String lastName;
        private String email;
        private String phone;
        private String githubUrl;
        private String linkedinUrl;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }

    @Transactional(readOnly = true)
    public ProfileDto getProfile(UUID candidateId) {
        CandidateProfile candidate = candidateProfileRepository.findById(candidateId)
                .orElseThrow(() -> new IllegalArgumentException("Candidate not found: " + candidateId));

        return toDto(candidate);
    }

    @Transactional
    public ProfileDto updateProfile(UUID candidateId, ProfileDto request) {
        CandidateProfile candidate = candidateProfileRepository.findById(candidateId)
                .orElseThrow(() -> new IllegalArgumentException("Candidate not found: " + candidateId));

        if (request.getFirstName() != null && !request.getFirstName().isBlank()) {
            candidate.setFirstName(request.getFirstName().trim());
        }
        if (request.getLastName() != null && !request.getLastName().isBlank()) {
            candidate.setLastName(request.getLastName().trim());
        }
        if (request.getPhone() != null) {
            candidate.setPhone(request.getPhone().trim());
        }
        if (request.getGithubUrl() != null) {
            candidate.setGithubUrl(request.getGithubUrl().trim());
        }
        if (request.getLinkedinUrl() != null) {
            candidate.setLinkedinUrl(request.getLinkedinUrl().trim());
        }

        CandidateProfile saved = candidateProfileRepository.save(candidate);
        log.info("Updated candidate profile for candidate: {}", candidateId);
        return toDto(saved);
    }

    private ProfileDto toDto(CandidateProfile candidate) {
        String email = candidate.getUser() != null ? candidate.getUser().getEmail() : null;
        return ProfileDto.builder()
                .id(candidate.getId())
                .firstName(candidate.getFirstName())
                .lastName(candidate.getLastName())
                .email(email)
                .phone(candidate.getPhone())
                .githubUrl(candidate.getGithubUrl())
                .linkedinUrl(candidate.getLinkedinUrl())
                .createdAt(candidate.getCreatedAt())
                .updatedAt(candidate.getUpdatedAt())
                .build();
    }
}
