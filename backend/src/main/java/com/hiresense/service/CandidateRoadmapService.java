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
public class CandidateRoadmapService {

    private final CandidateProfileRepository candidateProfileRepository;
    private final ResumeRepository resumeRepository;
    private final ResumeJobMatchRepository resumeJobMatchRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RoadmapDto {
        private UUID candidateId;
        private String candidateName;
        private List<String> verifiedSkills;
        private SkillCoverageDto skillCoverage;
        private List<TargetRoleItem> targetRoles;
        private List<String> identifiedSkillGaps; // Required skill gaps
        private List<String> identifiedPreferredGaps; // Preferred skill gaps
        private List<MilestoneDto> progressionPhases;
        private boolean hasEvaluations;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SkillCoverageDto {
        private int verifiedCount;
        private int totalRequiredCount;
        private double coverageRatio;
        private String coverageText;
        private int missingCount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TargetRoleItem {
        private UUID matchId;
        private String roleTitle;
        private String company;
        private double matchScore;
        private int requiredMatched;
        private int requiredTotal;
        private List<String> matchedSkills;
        private List<String> missingSkills;
        private LocalDateTime evaluatedAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MilestoneDto {
        private int phaseNumber;
        private String phaseTitle;
        private String focusArea;
        private String timeHorizon;
        private String status; // "IN_PROGRESS", "RECOMMENDED", "PLANNED"
        private List<String> targetSkills;
        private List<String> recommendedActions;
    }

    @Transactional(readOnly = true)
    public RoadmapDto getRoadmap(UUID candidateId) {
        CandidateProfile candidate = candidateProfileRepository.findById(candidateId)
                .orElseThrow(() -> new IllegalArgumentException("Candidate not found: " + candidateId));

        List<Resume> resumes = resumeRepository.findByCandidateIdOrderByUploadedAtDesc(candidateId);
        List<ResumeJobMatch> matches = resumeJobMatchRepository.findByResumeCandidateIdOrderByCreatedAtDesc(candidateId);

        String candidateName = (candidate.getFirstName() + " " + candidate.getLastName()).trim();
        if (candidateName.isEmpty()) {
            candidateName = "Candidate";
        }

        // 1. Extract verified skills from active/latest resume
        Set<String> verifiedSkillSet = new LinkedHashSet<>();
        if (!resumes.isEmpty()) {
            Resume activeResume = resumes.get(0);
            extractSkillsFromResume(activeResume, verifiedSkillSet);
        }

        // Also add matched skills from evaluations as verified
        for (ResumeJobMatch m : matches) {
            List<String> matched = parseJsonList(m.getMatchedSkills());
            for (String s : matched) {
                if (s != null && !s.isBlank()) {
                    verifiedSkillSet.add(s.trim());
                }
            }
        }

        List<String> verifiedSkills = new ArrayList<>(verifiedSkillSet);
        verifiedSkills.sort(String.CASE_INSENSITIVE_ORDER);

        // 2. Build target roles and collect required/preferred gaps
        List<TargetRoleItem> targetRoles = new ArrayList<>();
        Map<String, Integer> requiredGapFrequencyMap = new LinkedHashMap<>();
        Map<String, Integer> preferredGapFrequencyMap = new LinkedHashMap<>();
        Set<String> allRequiredSkills = new LinkedHashSet<>();
        Set<String> allMatchedSkills = new LinkedHashSet<>();

        for (ResumeJobMatch m : matches) {
            List<String> matched = parseJsonList(m.getMatchedSkills());
            List<String> missing = parseJsonList(m.getMissingSkills());

            for (String s : missing) {
                if (s != null && !s.isBlank()) {
                    String clean = s.trim();
                    requiredGapFrequencyMap.put(clean, requiredGapFrequencyMap.getOrDefault(clean, 0) + 1);
                    allRequiredSkills.add(clean.toLowerCase());
                }
            }
            for (String s : matched) {
                if (s != null && !s.isBlank()) {
                    String clean = s.trim();
                    allMatchedSkills.add(clean.toLowerCase());
                    allRequiredSkills.add(clean.toLowerCase());
                }
            }

            // Extract preferred skill gaps from job description
            if (m.getJobDescription() != null && m.getJobDescription().getParsedJobJson() != null) {
                List<String> prefSkills = extractPreferredSkills(m.getJobDescription().getParsedJobJson());
                for (String p : prefSkills) {
                    if (p != null && !p.isBlank()) {
                        String clean = p.trim();
                        if (!isSkillVerified(clean, verifiedSkillSet)) {
                            preferredGapFrequencyMap.put(clean, preferredGapFrequencyMap.getOrDefault(clean, 0) + 1);
                        }
                    }
                }
            }

            int reqMatched = matched.size();
            int reqTotal = matched.size() + missing.size();

            targetRoles.add(TargetRoleItem.builder()
                    .matchId(m.getId())
                    .roleTitle(m.getJobDescription() != null ? m.getJobDescription().getTitle() : "Evaluated Role")
                    .company(m.getJobDescription() != null ? m.getJobDescription().getCompany() : null)
                    .matchScore(m.getMatchScore().doubleValue())
                    .requiredMatched(reqMatched)
                    .requiredTotal(reqTotal)
                    .matchedSkills(matched)
                    .missingSkills(missing)
                    .evaluatedAt(m.getCreatedAt())
                    .build());
        }

        // 3. Ranked identified required & preferred skill gaps by frequency
        List<String> identifiedSkillGaps = requiredGapFrequencyMap.entrySet().stream()
                .sorted((a, b) -> b.getValue().compareTo(a.getValue()))
                .map(Map.Entry::getKey)
                .toList();

        List<String> identifiedPreferredGaps = preferredGapFrequencyMap.entrySet().stream()
                .sorted((a, b) -> b.getValue().compareTo(a.getValue()))
                .map(Map.Entry::getKey)
                .toList();

        // 4. Skill Coverage Calculation (Deterministic & Transparent)
        SkillCoverageDto skillCoverage;
        boolean hasEvaluations = !matches.isEmpty();
        if (hasEvaluations && !allRequiredSkills.isEmpty()) {
            int totalReq = allRequiredSkills.size();
            int verifiedReq = allMatchedSkills.size();
            int missingReq = Math.max(0, totalReq - verifiedReq);
            double ratio = totalReq > 0 ? (double) verifiedReq / totalReq : 1.0;
            double roundedRatio = BigDecimal.valueOf(ratio).setScale(2, RoundingMode.HALF_UP).doubleValue();

            skillCoverage = SkillCoverageDto.builder()
                    .verifiedCount(verifiedReq)
                    .totalRequiredCount(totalReq)
                    .coverageRatio(roundedRatio)
                    .coverageText(String.format("%d / %d required skills currently verified", verifiedReq, totalReq))
                    .missingCount(missingReq)
                    .build();
        } else {
            skillCoverage = SkillCoverageDto.builder()
                    .verifiedCount(verifiedSkills.size())
                    .totalRequiredCount(verifiedSkills.size())
                    .coverageRatio(1.0)
                    .coverageText(String.format("%d verified skills on record", verifiedSkills.size()))
                    .missingCount(0)
                    .build();
        }

        // 5. 3-Phase Progression Milestones
        List<MilestoneDto> phases = buildProgressionPhases(identifiedSkillGaps, identifiedPreferredGaps, verifiedSkills);

        return RoadmapDto.builder()
                .candidateId(candidateId)
                .candidateName(candidateName)
                .verifiedSkills(verifiedSkills)
                .skillCoverage(skillCoverage)
                .targetRoles(targetRoles)
                .identifiedSkillGaps(identifiedSkillGaps)
                .identifiedPreferredGaps(identifiedPreferredGaps)
                .progressionPhases(phases)
                .hasEvaluations(hasEvaluations)
                .build();
    }

    private List<MilestoneDto> buildProgressionPhases(
            List<String> requiredGaps,
            List<String> preferredGaps,
            List<String> verifiedSkills
    ) {
        List<MilestoneDto> phases = new ArrayList<>();

        if (!requiredGaps.isEmpty()) {
            // Case A: Actual required skill gaps exist
            List<String> phase1Skills = requiredGaps.stream().limit(3).toList();
            List<String> phase1Actions = new ArrayList<>();
            for (String skill : phase1Skills) {
                phase1Actions.add(String.format("Build proof-of-concept implementation utilizing %s with production logging.", skill));
            }
            phase1Actions.add("Incorporate verified deliverables and metrics into resume summary.");

            phases.add(MilestoneDto.builder()
                    .phaseNumber(1)
                    .phaseTitle("Phase 1: Bridge Required Skill Gaps")
                    .focusArea("Target Role Core Competencies")
                    .timeHorizon("0 - 30 Days")
                    .status("IN_PROGRESS")
                    .targetSkills(phase1Skills)
                    .recommendedActions(phase1Actions)
                    .build());
        } else {
            // Case B: Zero required skill gaps (Candidate satisfies 100% of required skills)
            // Phase 1 must NOT be labeled as bridging required gaps!
            List<String> phase1Skills;
            List<String> phase1Actions = new ArrayList<>();

            if (!preferredGaps.isEmpty()) {
                phase1Skills = preferredGaps.stream().limit(3).toList();
                for (String skill : phase1Skills) {
                    phase1Actions.add(String.format("Develop proof-of-concept projects demonstrating %s to satisfy preferred qualifications.", skill));
                }
                phase1Actions.add("Incorporate completed implementations and architecture decisions into portfolio.");
            } else {
                // If even preferred gaps are zero, focus on deepening top verified competencies
                phase1Skills = verifiedSkills.stream().limit(3).toList();
                phase1Actions.add("Consolidate verified core competencies with production performance benchmarks.");
                phase1Actions.add("Prepare structured technical deep-dive case studies for senior-level interviews.");
            }

            phases.add(MilestoneDto.builder()
                    .phaseNumber(1)
                    .phaseTitle("Phase 1: Strengthen Role Readiness")
                    .focusArea("Preferred Qualifications & Advanced Differentiation")
                    .timeHorizon("0 - 30 Days")
                    .status("IN_PROGRESS")
                    .targetSkills(phase1Skills)
                    .recommendedActions(phase1Actions)
                    .build());
        }

        // Phase 2: Deepen Architecture & Resilience
        List<String> phase2Skills = new ArrayList<>();
        if (requiredGaps.size() > 3) {
            phase2Skills.addAll(requiredGaps.stream().skip(3).limit(3).toList());
        } else if (preferredGaps.size() > 3) {
            phase2Skills.addAll(preferredGaps.stream().skip(3).limit(3).toList());
        }
        if (phase2Skills.isEmpty()) {
            phase2Skills = List.of("High-Throughput Optimization", "Distributed Caching", "Observability & Tracing");
        }

        phases.add(MilestoneDto.builder()
                .phaseNumber(2)
                .phaseTitle("Phase 2: Deepen Architecture & Resilience")
                .focusArea("Performance Optimization & Scalability")
                .timeHorizon("30 - 60 Days")
                .status("RECOMMENDED")
                .targetSkills(phase2Skills)
                .recommendedActions(List.of(
                        "Benchmark latency and memory consumption under high concurrent loads.",
                        "Establish distributed tracing and telemetry dashboards.",
                        "Implement automated integration test suites and CI/CD validation gates."
                ))
                .build());

        // Phase 3: Strategic Leadership & High-Availability
        phases.add(MilestoneDto.builder()
                .phaseNumber(3)
                .phaseTitle("Phase 3: Strategic Architecture & Leadership")
                .focusArea("System Design & Technical Mentorship")
                .timeHorizon("60 - 90 Days")
                .status("PLANNED")
                .targetSkills(List.of("Distributed Systems Consensus", "Fault Tolerance Design", "Cross-Functional Architecture Delivery"))
                .recommendedActions(List.of(
                        "Lead end-to-end system design reviews following fault-tolerant design principles.",
                        "Author technical RFCs and architecture decision records (ADRs).",
                        "Prepare structured system design and leadership STAR case studies for interview panels."
                ))
                .build());

        return phases;
    }

    private boolean isSkillVerified(String skill, Set<String> verifiedSkills) {
        if (skill == null || skill.isBlank()) return false;
        String norm = skill.trim();
        for (String v : verifiedSkills) {
            if (v.equalsIgnoreCase(norm)) return true;
        }
        return false;
    }

    private List<String> extractPreferredSkills(String parsedJobJson) {
        if (parsedJobJson == null || parsedJobJson.isBlank()) return Collections.emptyList();
        try {
            Map<String, Object> map = objectMapper.readValue(parsedJobJson, new TypeReference<Map<String, Object>>() {});
            Object pref = map.get("preferred_skills");
            if (pref instanceof List<?> list) {
                List<String> result = new ArrayList<>();
                for (Object item : list) {
                    if (item != null && !item.toString().isBlank()) {
                        result.add(item.toString().trim());
                    }
                }
                return result;
            }
        } catch (Exception ignored) {}
        return Collections.emptyList();
    }

    private void extractSkillsFromResume(Resume resume, Set<String> targetSet) {
        if (resume.getParsedResumeJson() == null || resume.getParsedResumeJson().isBlank()) {
            return;
        }
        try {
            Map<String, Object> parsed = objectMapper.readValue(resume.getParsedResumeJson(), new TypeReference<Map<String, Object>>() {});
            Object skillsObj = parsed.get("skills");
            if (skillsObj instanceof List<?> list) {
                for (Object item : list) {
                    if (item != null) {
                        String s = item.toString().trim();
                        if (!s.isEmpty()) {
                            targetSet.add(s);
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Unable to parse skills from resume {}: {}", resume.getId(), e.getMessage());
        }
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
