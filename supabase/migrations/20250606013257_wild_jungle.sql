/*
  # Add shipping days column to products table

  1. Changes
    - Add `shipping_days` column to `products` table as an integer
    - Set default value to null to allow products without shipping days specified
    
  2. Security
    - No changes to RLS policies needed as this column will be covered by existing table policies
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'products' 
    AND column_name = 'shipping_days'
  ) THEN
    ALTER TABLE products ADD COLUMN shipping_days integer;
  END IF;
END $$;