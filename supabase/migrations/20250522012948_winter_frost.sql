/*
  # Add discount promotion type

  1. Changes
    - Add a new promotion type "discount" to the valid_promotion_type constraint
    - Add total_price column to store the discounted price for discount-type promotions
    
  2. Notes
    - This allows setting a specific discounted price for products instead of using formulas
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