package com.hiresense.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Uses explicit PostgreSQL casts so JSONB and pgvector values are not dependent
 * on implicit JDBC String conversions.
 */
@Service
public class ResumeProcessingPersistenceService {
    private final JdbcTemplate jdbcTemplate;

    public ResumeProcessingPersistenceService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional
    public int complete(UUID resumeId, String rawText, String parsedJson, String vector,
                        Double confidence) {
        return jdbcTemplate.update("""
                UPDATE resumes
                SET raw_resume_text = ?,
                    parsed_resume_json = CAST(? AS jsonb),
                    resume_embedding = CAST(? AS vector),
                    parsing_confidence = ?,
                    processing_status = 'COMPLETED',
                    processing_error = NULL,
                    processed_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """, rawText, parsedJson, vector, confidence, resumeId);
    }

    @Transactional
    public int fail(UUID resumeId, String errorMessage) {
        return jdbcTemplate.update("""
                UPDATE resumes
                SET processing_status = 'FAILED',
                    processing_error = ?,
                    processed_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """, errorMessage, resumeId);
    }
}
