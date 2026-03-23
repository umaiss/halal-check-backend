-- Migration to create user_scan_history table
CREATE TABLE IF NOT EXISTS user_scan_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    halal_check_id INTEGER NOT NULL REFERENCES halal_checks(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_scan_history_user_id ON user_scan_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_scan_history_halal_check_id ON user_scan_history(halal_check_id);
