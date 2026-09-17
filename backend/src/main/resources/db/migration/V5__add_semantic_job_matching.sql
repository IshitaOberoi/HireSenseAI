-- Job Descriptions table for candidate job matching
CREATE TABLE IF NOT EXISTS job_descriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    company VARCHAR(255),
    raw_description TEXT NOT NULL,
    parsed_job_json JSONB,
    embedding VECTOR(384),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_job_descriptions_embedding ON job_descriptions USING hnsw (embedding vector_cosine_ops);

-- Resume to Job match results table
CREATE TABLE IF NOT EXISTS resume_job_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
    job_description_id UUID NOT NULL REFERENCES job_descriptions(id) ON DELETE CASCADE,
    match_score DECIMAL(5,2) NOT NULL,
    semantic_similarity DECIMAL(5,4) NOT NULL,
    skill_coverage DECIMAL(5,2) NOT NULL,
    matched_skills JSONB NOT NULL,
    missing_skills JSONB NOT NULL,
    evidence_json JSONB NOT NULL,
    explanation TEXT NOT NULL,
    metadata_json JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_resume_job_matches_resume ON resume_job_matches(resume_id);
CREATE INDEX IF NOT EXISTS idx_resume_job_matches_job ON resume_job_matches(job_description_id);
