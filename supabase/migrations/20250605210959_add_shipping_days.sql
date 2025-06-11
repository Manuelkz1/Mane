/*
  # Add shipping_days field to products table
  
  1. Changes
    - Add shipping_days column to products table as integer
    - Set default value to 3 days for existing products
    
  2. Security
    - No changes to security policies
*/

-- Check if shipping_days column exists before adding it
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'products' 
    AND column_name = 'shipping_days'
  ) THEN
    -- Add shipping_days column to products table
    ALTER TABLE products 
    ADD COLUMN shipping_days INTEGER;
    
    -- Set default value for existing products
    UPDATE products 
    SET shipping_days = 3 
    WHERE shipping_days IS NULL;
  END IF;
END $$;

