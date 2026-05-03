-- Migration 009: Product Assignment and Review

DO $$ BEGIN
    CREATE TYPE review_status AS ENUM ('pending', 'halal', 'haram', 'mushbooh');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE halal_checks
ADD COLUMN IF NOT EXISTS assigned_to_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS status review_status DEFAULT 'pending';

UPDATE halal_checks SET status = 'pending' WHERE status IS NULL;
