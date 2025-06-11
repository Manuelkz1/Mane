/*
  # Add active column to promotions table

  1. Changes
    - Add `active` column to `promotions` table with default value TRUE
    - Set existing promotions to active by default
    - Make column NOT NULL to ensure data consistency

  2. Notes
    - Default value ensures backward compatibility with existing promotions
    - NOT NULL constraint prevents null values in future records
*/

-- Add active column if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'promotions' 
    AND column_name = 'active'
  ) THEN
    ALTER TABLE promotions 
    ADD COLUMN active BOOLEAN NOT NULL DEFAULT TRUE;
  END IF;
END $$;