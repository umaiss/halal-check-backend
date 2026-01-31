-- Initial schema for halal-checker
CREATE TABLE IF NOT EXISTS halal_checks (
    id SERIAL PRIMARY KEY,
    ingredient_text TEXT NOT NULL,
    overall_status VARCHAR(20) NOT NULL, -- HALAL, HARAM, MUSBOOH
    reasoning TEXT,
    ingredients_analysis JSONB, -- Storing the detailed analysis as JSONB
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_halal_checks_status ON halal_checks(overall_status);
