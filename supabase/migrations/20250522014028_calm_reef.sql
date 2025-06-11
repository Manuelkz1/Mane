/*
  # Add Discount Promotion Type
  
  1. Changes
    - Add 'discount' type to valid promotion types
    - Add total_price column for fixed price promotions
    
  2. Description
    - Allows setting a fixed promotional price
    - Shows original price crossed out with new price in red
*/

-- Modify the valid_promotion_type constraint to include the new "discount" type
ALTER TABLE promotions
DROP CONSTRAINT IF EXISTS valid_promotion_type;

ALTER TABLE promotions
ADD CONSTRAINT valid_promotion_type 
CHECK (type IN ('2x1', '3x1', '3x2', 'discount'));

-- Add total_price column if it doesn't exist already
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'promotions'
    AND column_name = 'total_price'
  ) THEN
    ALTER TABLE promotions ADD COLUMN total_price numeric(10,2);
  END IF;
END $$;