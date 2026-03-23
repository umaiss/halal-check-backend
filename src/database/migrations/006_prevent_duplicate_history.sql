-- Migration to prevent duplicate entries in user_scan_history
-- 1. Delete existing duplicates, keeping only the earliest entry
DELETE FROM user_scan_history a
USING user_scan_history b
WHERE a.id > b.id
AND a.user_id = b.user_id
AND a.halal_check_id = b.halal_check_id;

-- 2. Add a UNIQUE constraint to prevent future duplicates
-- This works with the existing ON CONFLICT DO NOTHING in the service
ALTER TABLE user_scan_history 
ADD CONSTRAINT unique_user_scan UNIQUE (user_id, halal_check_id);
