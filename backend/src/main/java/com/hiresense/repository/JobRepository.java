package com.hiresense.repository;

import com.hiresense.model.Job;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Repository
public interface JobRepository extends JpaRepository<Job, UUID> {
    
    /**
     * Native PostgreSQL query utilizing pgvector's cosine distance operator (<=>).
     * Computes similarity score: (1 - distance) * 100
     */
    @Query(value = """
        SELECT 
            CAST(r.id AS VARCHAR) as resume_id, 
            CAST(c.id AS VARCHAR) as candidate_id, 
            c.first_name, 
            c.last_name, 
            r.file_name, 
            (1 - (r.resume_embedding <=> CAST(:jobEmbedding AS vector))) * 100 AS similarity_score
        FROM resumes r
        JOIN candidate_profiles c ON r.candidate_id = c.id
        WHERE r.resume_embedding IS NOT NULL
        ORDER BY similarity_score DESC
        """, nativeQuery = true)
    List<Map<String, Object>> findRankedCandidatesBySimilarity(@Param("jobEmbedding") String jobEmbedding);
}
