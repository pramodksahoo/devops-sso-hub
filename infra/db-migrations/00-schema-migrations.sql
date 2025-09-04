-- Schema migrations tracking table
-- This must be the first migration file (00-*)

CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Insert this migration
INSERT INTO schema_migrations (version, applied_at) 
VALUES ('00-schema-migrations', NOW())
ON CONFLICT (version) DO NOTHING;
