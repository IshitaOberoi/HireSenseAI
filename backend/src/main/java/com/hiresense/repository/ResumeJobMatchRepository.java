package com.hiresense.repository;

import com.hiresense.model.ResumeJobMatch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ResumeJobMatchRepository extends JpaRepository<ResumeJobMatch, UUID> {
    List<ResumeJobMatch> findByResumeIdOrderByCreatedAtDesc(UUID resumeId);
    long countByResumeId(UUID resumeId);
}
