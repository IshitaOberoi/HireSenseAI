-- Create resume_chunks table for RAG
CREATE TABLE IF NOT EXISTS resume_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
    chunk_index INT NOT NULL,
    section_name VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    embedding VECTOR(384) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_resume_chunks_resume_id ON resume_chunks(resume_id);
CREATE INDEX IF NOT EXISTS idx_resume_chunks_embedding ON resume_chunks USING hnsw (embedding vector_cosine_ops);
