/*
  # Fix allowed_payment_methods Column
  
  1. Changes
    - Add allowed_payment_methods column if missing
    - Set default values for existing rows
    - Add check constraint for valid JSON structure
    
  2. Security
    - Maintain existing RLS policies
    - No data loss
*/

-- Add allowed_payment_methods column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'products' 
    AND column_name = 'allowed_payment_methods'
  ) THEN
    ALTER TABLE products 
    ADD COLUMN allowed_payment_methods JSONB 
    DEFAULT '{"cash_on_delivery": true, "card": true}'::jsonb;
  END IF;
END $$;

-- Update any existing rows that have NULL values
UPDATE products 
SET allowed_payment_methods = '{"cash_on_delivery": true, "card": true}'::jsonb 
WHERE allowed_payment_methods IS NULL;

-- Add check constraint to ensure valid JSON structure
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.constraint_column_usage
    WHERE table_name = 'products'
    AND constraint_name = 'valid_payment_methods'
  ) THEN
    ALTER TABLE products
    ADD CONSTRAINT valid_payment_methods
    CHECK (
      (allowed_payment_methods->>'cash_on_delivery' IS NULL OR jsonb_typeof(allowed_payment_methods->'cash_on_delivery') = 'boolean') AND
      (allowed_payment_methods->>'card' IS NULL OR jsonb_typeof(allowed_payment_methods->'card') = 'boolean')
    );
  END IF;
END $$;