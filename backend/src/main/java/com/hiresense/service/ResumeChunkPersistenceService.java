package com.hiresense.service;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@Slf4j
public class ResumeChunkPersistenceService {

    private final JdbcTemplate jdbcTemplate;

    public ResumeChunkPersistenceService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class RetrievedChunk {
        private UUID id;
        private UUID resumeId;
        private int chunkIndex;
        private String sectionName;
        private String content;
        private double similarity;
    }

    @Transactional
    public void saveChunks(UUID resumeId, List<Map<String, Object>> chunks) {
        if (chunks == null || chunks.isEmpty()) {
            return;
        }

        jdbcTemplate.update("DELETE FROM resume_chunks WHERE resume_id = ?", resumeId);

        String insertSql = """
                INSERT INTO resume_chunks (id, resume_id, chunk_index, section_name, content, embedding, created_at)
                VALUES (gen_random_uuid(), ?, ?, ?, ?, CAST(? AS vector), CURRENT_TIMESTAMP)
                """;

        for (Map<String, Object> chunk : chunks) {
            int chunkIndex = chunk.get("chunk_index") instanceof Number n ? n.intValue() : 0;
            String sectionName = (String) chunk.getOrDefault("section_name", "Resume Content");
            String content = (String) chunk.getOrDefault("content", "");
            Object emb = chunk.get("embedding");
            String vectorStr = emb instanceof List<?> list ? list.toString() : String.valueOf(emb);

            jdbcTemplate.update(insertSql, resumeId, chunkIndex, sectionName, content, vectorStr);
        }
        log.info("Persisted {} chunks for resume {}", chunks.size(), resumeId);
    }

    public List<RetrievedChunk> searchSimilarChunks(UUID resumeId, String queryVectorStr, int limit) {
        String sql = """
                SELECT id, resume_id, chunk_index, section_name, content,
                       1 - (embedding <=> CAST(? AS vector)) AS similarity
                FROM resume_chunks
                WHERE resume_id = ?
                ORDER BY embedding <=> CAST(? AS vector) ASC
                LIMIT ?
                """;

        return jdbcTemplate.query(sql, (rs, rowNum) -> new RetrievedChunk(
                rs.getObject("id", UUID.class),
                rs.getObject("resume_id", UUID.class),
                rs.getInt("chunk_index"),
                rs.getString("section_name"),
                rs.getString("content"),
                rs.getDouble("similarity")
        ), queryVectorStr, resumeId, queryVectorStr, limit);
    }
}
