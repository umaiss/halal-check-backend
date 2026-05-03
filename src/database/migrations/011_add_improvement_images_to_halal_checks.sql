-- Add improvement image columns to halal_checks table
ALTER TABLE halal_checks 
ADD COLUMN IF NOT EXISTS barcode_image VARCHAR(255),
ADD COLUMN IF NOT EXISTS manufacturer_image VARCHAR(255),
ADD COLUMN IF NOT EXISTS additional_images JSONB DEFAULT '[]'::jsonb;
