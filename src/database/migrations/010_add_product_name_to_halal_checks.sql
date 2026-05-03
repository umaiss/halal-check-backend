-- Add product_name column to halal_checks table
ALTER TABLE halal_checks ADD COLUMN IF NOT EXISTS product_name VARCHAR(255);
