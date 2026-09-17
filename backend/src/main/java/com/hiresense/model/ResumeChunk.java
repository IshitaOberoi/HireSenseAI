package com.hiresense.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "resume_chunks")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResumeChunk {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resume_id", nullable = false)
    @JsonIgnore
    private Resume resume;

    @Column(name = "chunk_index", nullable = false)
    private Integer chunkIndex;

    @Column(name = "section_name", nullable = false, length = 100)
    private String sectionName;

    @Column(name = "content", nullable = false, columnDefinition = "text")
    private String content;

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
