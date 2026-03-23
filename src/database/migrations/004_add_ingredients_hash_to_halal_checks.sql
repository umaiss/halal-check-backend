ALTER TABLE halal_checks ADD COLUMN IF NOT EXISTS ingredients_hash TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS idx_halal_checks_hash ON halal_checks(ingredients_hash);
