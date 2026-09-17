package com.hiresense.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Slf4j
public class JobDescriptionPersistenceService {

    private final JdbcTemplate jdbcTemplate;

    public JobDescriptionPersistenceService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional
    public UUID saveJobDescription(String title, String company, String rawDescription, String parsedJson, String vectorStr) {
        UUID id = UUID.randomUUID();
        String sql = """
                INSERT INTO job_descriptions (id, title, company, raw_description, parsed_job_json, embedding, created_at)
                VALUES (?, ?, ?, ?, CAST(? AS jsonb), CAST(? AS vector), CURRENT_TIMESTAMP)
                """;
        jdbcTemplate.update(sql, id, title, company, rawDescription, parsedJson, vectorStr);
        log.info("Persisted JobDescription id={} title='{}'", id, title);
        return id;
    }

    public Double calculateResumeToJobSimilarity(UUID resumeId, String jobVectorStr) {
        String sql = """
                SELECT 1 - (resume_embedding <=> CAST(? AS vector)) AS similarity
                FROM resumes
                WHERE id = ? AND resume_embedding IS NOT NULL
                """;
        List<Double> results = jdbcTemplate.query(
                sql,
                (rs, rowNum) -> rs.getDouble("similarity"),
                jobVectorStr,
                resumeId
        );
        if (results == null || results.isEmpty()) {
            log.warn("No resume_embedding found for resumeId={}", resumeId);
            return 0.0;
        }
        double sim = results.get(0);
        return Math.max(0.0, Math.min(1.0, sim));
    }
}
