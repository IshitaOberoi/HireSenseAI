package com.hiresense.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "job_descriptions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JobDescription {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "company")
    private String company;

    @Column(name = "raw_description", nullable = false, columnDefinition = "text")
    private String rawDescription;

    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    @Column(name = "parsed_job_json", columnDefinition = "jsonb")
    private String parsedJobJson;

    @Column(name = "embedding", columnDefinition = "vector(384)", insertable = false, updatable = false)
    private String embedding;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
