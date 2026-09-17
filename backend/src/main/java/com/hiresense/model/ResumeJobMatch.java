package com.hiresense.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "resume_job_matches")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResumeJobMatch {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resume_id", nullable = false)
    @JsonIgnore
    private Resume resume;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_description_id", nullable = false)
    @JsonIgnore
    private JobDescription jobDescription;

    @Column(name = "match_score", nullable = false, precision = 5, scale = 2)
    private BigDecimal matchScore;

    @Column(name = "semantic_similarity", nullable = false, precision = 5, scale = 4)
    private BigDecimal semanticSimilarity;

    @Column(name = "skill_coverage", nullable = false, precision = 5, scale = 2)
    private BigDecimal skillCoverage;

    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    @Column(name = "matched_skills", columnDefinition = "jsonb", nullable = false)
    private String matchedSkills;

    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    @Column(name = "missing_skills", columnDefinition = "jsonb", nullable = false)
    private String missingSkills;

    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    @Column(name = "evidence_json", columnDefinition = "jsonb", nullable = false)
    private String evidenceJson;

    @Column(name = "explanation", columnDefinition = "text", nullable = false)
    private String explanation;

    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    @Column(name = "metadata_json", columnDefinition = "jsonb")
    private String metadataJson;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
