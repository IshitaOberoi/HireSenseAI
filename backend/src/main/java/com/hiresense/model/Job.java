package com.hiresense.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "jobs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Job {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recruiter_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private User recruiter;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String company;

    @Column(nullable = false, columnDefinition = "text")
    private String description;

    @Column(name = "experience_years", nullable = false)
    private Integer experienceYears;

    @Column(name = "job_embedding", columnDefinition = "vector(384)", insertable = false, updatable = false)
    private String jobEmbedding; // Mapped as String format '[0.1, 0.2, ...]' for pgvector

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
