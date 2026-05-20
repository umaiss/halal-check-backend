-- Migration 013: Add review_attachments column to halal_checks table
ALTER TABLE halal_checks ADD COLUMN IF NOT EXISTS review_attachments TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Ensure existing rows have empty array (default handles it)
