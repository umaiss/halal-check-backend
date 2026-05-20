-- Migration 012: Add reviewed_at column to halal_checks table
ALTER TABLE halal_checks ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;

-- Backfill existing reviewed products to have reviewed_at = created_at
UPDATE halal_checks 
SET reviewed_at = created_at 
WHERE status != 'pending' AND reviewed_at IS NULL;
