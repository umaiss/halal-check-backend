-- Migration to add image URLs to halal_checks table
ALTER TABLE halal_checks 
ADD COLUMN IF NOT EXISTS front_image TEXT,
ADD COLUMN IF NOT EXISTS back_image TEXT,
ADD COLUMN IF NOT EXISTS ingredients_image TEXT;
