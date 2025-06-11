/*
  # Add Logo Dimensions to Company Settings
  
  1. Changes
    - Add logo_width and logo_height columns
    - Add maintain_ratio flag for aspect ratio
    - Set default dimensions
    
  2. Security
    - Maintain existing RLS policies
    - Add constraints for min/max dimensions
*/

ALTER TABLE company_settings
ADD COLUMN IF NOT EXISTS logo_width integer DEFAULT 200,
ADD COLUMN IF NOT EXISTS logo_height integer DEFAULT 60,
ADD COLUMN IF NOT EXISTS maintain_ratio boolean DEFAULT true;

-- Add constraints for dimensions
ALTER TABLE company_settings
ADD CONSTRAINT logo_width_range CHECK (logo_width BETWEEN 50 AND 500),
ADD CONSTRAINT logo_height_range CHECK (logo_height BETWEEN 50 AND 500);

-- Update existing records with default values
UPDATE company_settings 
SET 
  logo_width = COALESCE(logo_width, 200),
  logo_height = COALESCE(logo_height, 60),
  maintain_ratio = COALESCE(maintain_ratio, true)
WHERE logo_width IS NULL 
   OR logo_height IS NULL 
   OR maintain_ratio IS NULL;