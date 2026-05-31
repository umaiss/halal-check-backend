-- Add reset_code and reset_code_expires_at columns to users table for password reset flow
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_code VARCHAR(6);
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_code_expires_at TIMESTAMP WITH TIME ZONE;
