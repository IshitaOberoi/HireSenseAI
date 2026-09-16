-- Alter resumes to store raw text and parsing confidence
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS raw_resume_text TEXT;
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS parsing_confidence DECIMAL(3,2) DEFAULT 0.00;

-- Alter matches to store matching confidence and AI match reasoning
ALTER TABLE matches ADD COLUMN IF NOT EXISTS matching_confidence DECIMAL(3,2) DEFAULT 0.00;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS match_reasoning TEXT;

-- Create ai_request_logs table
CREATE TABLE IF NOT EXISTS ai_request_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_type VARCHAR(50) NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    latency_ms INT NOT NULL,
    tokens_input INT DEFAULT 0,
    tokens_output INT DEFAULT 0,
    calculated_cost DECIMAL(10,6) DEFAULT 0.000000,
    status VARCHAR(50) NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
