package com.hiresense.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "ai_request_logs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiRequestLog {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "request_type", nullable = false)
    private String requestType; // PARSING, EMBEDDING, MATCHING, COPILOT

    @Column(name = "model_name", nullable = false)
    private String modelName;

    @Column(name = "latency_ms", nullable = false)
    private Integer latencyMs;

    @Column(name = "tokens_input")
    private Integer tokensInput;

    @Column(name = "tokens_output")
    private Integer tokensOutput;

    @Column(name = "calculated_cost")
    private BigDecimal calculatedCost;

    @Column(nullable = false)
    private String status; // SUCCESS, ERROR

    @Column(name = "error_message", columnDefinition = "text")
    private String errorMessage;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
