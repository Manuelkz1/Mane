/*
  # Add description column to promotions table

  1. Changes
    - Add `description` column to `promotions` table
    - Column type: TEXT
    - Nullable: true (allows promotions without descriptions)

  2. Notes
    - This migration adds support for storing promotion descriptions
    - Existing promotions will have NULL descriptions
    - No data migration needed as it's a new optional column
*/

-- Add description column if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'promotions' 
    AND column_name = 'description'
  ) THEN
    ALTER TABLE promotions 
    ADD COLUMN description TEXT;
  END IF;
END $$;