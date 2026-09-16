ALTER TABLE resumes ADD COLUMN IF NOT EXISTS processing_status VARCHAR(20) NOT NULL DEFAULT 'UPLOADED';
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS processing_error TEXT;
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_resumes_processing_status ON resumes(processing_status);
