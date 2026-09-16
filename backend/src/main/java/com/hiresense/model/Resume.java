package com.hiresense.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "resumes")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Resume {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "candidate_id", nullable = false)
    @JsonIgnore
    private CandidateProfile candidate;

    @Column(name = "file_name", nullable = false)
    private String fileName;

    @Column(name = "s3_key", nullable = false)
    private String s3Key;

    @Column(name = "ats_score")
    private Integer atsScore;

    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    @Column(name = "feedback_json", columnDefinition = "jsonb")
    private String feedbackJson;

    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    @Column(name = "parsed_resume_json", columnDefinition = "jsonb")
    private String parsedResumeJson;

    @Column(name = "raw_resume_text", columnDefinition = "text")
    private String rawResumeText;

    @Column(name = "resume_embedding", columnDefinition = "vector(384)", insertable = false, updatable = false)
    private String resumeEmbedding;

    @Column(name = "parsing_confidence", precision = 3, scale = 2)
    private java.math.BigDecimal parsingConfidence;

    @Column(name = "processing_status", nullable = false)
    private String processingStatus;

    @Column(name = "processing_error", columnDefinition = "text")
    private String processingError;

    @Column(name = "processed_at")
    private LocalDateTime processedAt;

    @Column(name = "uploaded_at", updatable = false)
    private LocalDateTime uploadedAt;

    @PrePersist
    protected void onCreate() {
        uploadedAt = LocalDateTime.now();
        if (processingStatus == null) {
            processingStatus = "UPLOADED";
        }
    }
}
