-- Migration 008: Add role-based access control to admin_users table

-- Step 1: Create the enum type for admin roles
DO $$ BEGIN
    CREATE TYPE admin_role AS ENUM ('admin', 'assignee');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Step 2: Add the role column with default 'assignee' (safest default for new users)
ALTER TABLE admin_users
    ADD COLUMN IF NOT EXISTS role admin_role NOT NULL DEFAULT 'assignee';

-- Step 3: Backfill the existing admin user to have the 'admin' role
UPDATE admin_users
SET role = 'admin'
WHERE email = 'admin@halalchecker.com';
