package com.hiresense.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hiresense.model.CandidateProfile;
import com.hiresense.model.Resume;
import com.hiresense.model.ResumeJobMatch;
import com.hiresense.repository.CandidateProfileRepository;
import com.hiresense.repository.ResumeJobMatchRepository;
import com.hiresense.repository.ResumeRepository;
import lombok.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class CandidateDashboardService {

    private final CandidateProfileRepository candidateProfileRepository;
    private final ResumeRepository resumeRepository;
    private final ResumeJobMatchRepository resumeJobMatchRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DashboardDto {
        private CandidateSummary candidate;
        private ResumeSummary resumeSummary;
        private MatchingSummary matchingSummary;
        private InsightDto insight;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CandidateSummary {
        private UUID id;
        private String name;
        private String email;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ResumeSummary {
        private int totalResumes;
        private UUID latestResumeId;
        private String latestFileName;
        private String latestStatus;
        private Integer atsScore;
        private Double parsingConfidence;
        private LocalDateTime uploadedAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MatchingSummary {
        private int totalMatches;
        private Double averageScore;
        private Double topScore;
        private List<RecentMatchItem> recentMatches;
        private List<SkillGapItem> topSkillGaps;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecentMatchItem {
        private UUID id;
        private UUID resumeId;
        private String jobTitle;
        private String company;
        private double matchScore;
        private String alignmentRating;
        private LocalDateTime createdAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SkillGapItem {
        private String skill;
        private int frequency;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InsightDto {
        private String headline;
        private String message;
    }

    @Transactional(readOnly = true)
    public DashboardDto getDashboard(UUID candidateId) {
        CandidateProfile candidate = candidateProfileRepository.findById(candidateId)
                .orElseThrow(() -> new IllegalArgumentException("Candidate not found: " + candidateId));

        List<Resume> resumes = resumeRepository.findByCandidateIdOrderByUploadedAtDesc(candidateId);
        List<ResumeJobMatch> matches = resumeJobMatchRepository.findByResumeCandidateIdOrderByCreatedAtDesc(candidateId);

        String candidateName = (candidate.getFirstName() + " " + candidate.getLastName()).trim();
        String candidateEmail = candidate.getUser() != null ? candidate.getUser().getEmail() : null;

        CandidateSummary candidateSummary = CandidateSummary.builder()
                .id(candidate.getId())
                .name(candidateName.isEmpty() ? "Candidate" : candidateName)
                .email(candidateEmail)
                .build();

        ResumeSummary resumeSummary;
        if (!resumes.isEmpty()) {
            Resume latest = resumes.get(0);
            resumeSummary = ResumeSummary.builder()
                    .totalResumes(resumes.size())
                    .latestResumeId(latest.getId())
                    .latestFileName(latest.getFileName())
                    .latestStatus(latest.getProcessingStatus())
                    .atsScore(latest.getAtsScore())
                    .parsingConfidence(latest.getParsingConfidence() != null ? latest.getParsingConfidence().doubleValue() : null)
                    .uploadedAt(latest.getUploadedAt())
                    .build();
        } else {
            resumeSummary = ResumeSummary.builder()
                    .totalResumes(0)
                    .latestStatus("NONE")
                    .build();
        }

        MatchingSummary matchingSummary;
        if (!matches.isEmpty()) {
            double avgScore = matches.stream()
                    .mapToDouble(m -> m.getMatchScore().doubleValue())
                    .average().orElse(0.0);
            double topScore = matches.stream()
                    .mapToDouble(m -> m.getMatchScore().doubleValue())
                    .max().orElse(0.0);

            List<RecentMatchItem> recentItems = matches.stream()
                    .limit(5)
                    .map(m -> RecentMatchItem.builder()
                            .id(m.getId())
                            .resumeId(m.getResume().getId())
                            .jobTitle(m.getJobDescription() != null ? m.getJobDescription().getTitle() : "Role Evaluation")
                            .company(m.getJobDescription() != null ? m.getJobDescription().getCompany() : null)
                            .matchScore(m.getMatchScore().doubleValue())
                            .alignmentRating(m.getMatchScore().doubleValue() >= 80 ? "Strong Match" : m.getMatchScore().doubleValue() >= 65 ? "Good Match" : "Moderate Match")
                            .createdAt(m.getCreatedAt())
                            .build())
                    .toList();

            // Count frequencies of missing skills across matches
            Map<String, Integer> gapCounts = new HashMap<>();
            for (ResumeJobMatch m : matches) {
                List<String> missing = parseJsonList(m.getMissingSkills());
                for (String s : missing) {
                    if (s != null && !s.isBlank()) {
                        gapCounts.put(s, gapCounts.getOrDefault(s, 0) + 1);
                    }
                }
            }

            List<SkillGapItem> topGaps = gapCounts.entrySet().stream()
                    .sorted((a, b) -> b.getValue().compareTo(a.getValue()))
                    .limit(6)
                    .map(e -> new SkillGapItem(e.getKey(), e.getValue()))
                    .toList();

            matchingSummary = MatchingSummary.builder()
                    .totalMatches(matches.size())
                    .averageScore(BigDecimal.valueOf(avgScore).setScale(1, RoundingMode.HALF_UP).doubleValue())
                    .topScore(BigDecimal.valueOf(topScore).setScale(1, RoundingMode.HALF_UP).doubleValue())
                    .recentMatches(recentItems)
                    .topSkillGaps(topGaps)
                    .build();
        } else {
            matchingSummary = MatchingSummary.builder()
                    .totalMatches(0)
                    .averageScore(0.0)
                    .topScore(0.0)
                    .recentMatches(Collections.emptyList())
                    .topSkillGaps(Collections.emptyList())
                    .build();
        }

        InsightDto insight = generateInsight(resumeSummary, matchingSummary);

        return DashboardDto.builder()
                .candidate(candidateSummary)
                .resumeSummary(resumeSummary)
                .matchingSummary(matchingSummary)
                .insight(insight)
                .build();
    }

    private InsightDto generateInsight(ResumeSummary resume, MatchingSummary matching) {
        if (resume.getTotalResumes() == 0) {
            return InsightDto.builder()
                    .headline("Begin with your resume")
                    .message("Upload your current resume (PDF or DOCX) to extract structured capabilities and establish your baseline profile.")
                    .build();
        }
        if (matching.getTotalMatches() == 0) {
            return InsightDto.builder()
                    .headline("Evaluate a target role")
                    .message("Your resume is processed. Run a Semantic Job Match on the Jobs page to discover your alignment score and identify skill gaps.")
                    .build();
        }
        if (!matching.getTopSkillGaps().isEmpty()) {
            String topGap = matching.getTopSkillGaps().get(0).getSkill();
            if (matching.getTopScore() >= 80.0) {
                return InsightDto.builder()
                        .headline("High alignment detected")
                        .message(String.format("You demonstrate strong alignment (%s%% top score). Addressing experience in %s will further solidify your qualification.", matching.getTopScore(), topGap))
                        .build();
            } else {
                return InsightDto.builder()
                        .headline("Focused growth opportunity")
                        .message(String.format("Closing identified gaps in %s across target roles will directly improve your semantic match coverage.", topGap))
                        .build();
            }
        }
        return InsightDto.builder()
                .headline("Comprehensive qualification")
                .message("Your verified background satisfies core requirements across evaluated roles. Consider preparing for role interviews.")
                .build();
    }

    private List<String> parseJsonList(String json) {
        if (json == null || json.isBlank()) return Collections.emptyList();
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }
}
