/*
  # Add Hero Text Fields to Company Settings
  
  1. Changes
    - Add hero_title field for main heading
    - Add hero_subtitle field for subtitle text
    
  2. Security
    - Maintain existing RLS policies
    - No data loss
*/

ALTER TABLE company_settings
ADD COLUMN IF NOT EXISTS hero_title text DEFAULT 'Productos de Calidad Premium',
ADD COLUMN IF NOT EXISTS hero_subtitle text DEFAULT 'Descubre nuestra selección de productos exclusivos con la mejor calidad garantizada';

-- Update existing record with default values if null
UPDATE company_settings 
SET 
  hero_title = COALESCE(hero_title, 'Productos de Calidad Premium'),
  hero_subtitle = COALESCE(hero_subtitle, 'Descubre nuestra selección de productos exclusivos con la mejor calidad garantizada')
WHERE hero_title IS NULL OR hero_subtitle IS NULL;