/*
  # Add Discount Promotion Type
  
  1. New Features
    - Add 'discount' type to valid promotion types
    - Support fixed price promotions with the new 'total_price' field
    
  2. Changes
    - Modify the valid_promotion_type constraint
    - Add total_price column for fixed-price discounts
    - Update RLS policies for promotions
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

-- Make sure RLS policies are up to date
DROP POLICY IF EXISTS "Anyone can view active promotions" ON promotions;
CREATE POLICY "Anyone can view active promotions"
ON promotions
FOR SELECT
TO public
USING (
  active = true 
  AND (start_date IS NULL OR start_date <= now()) 
  AND (end_date IS NULL OR end_date >= now())
);

-- Fix the is_active vs active column inconsistency in queries
UPDATE promotions SET active = is_active WHERE active IS NULL AND is_active IS NOT NULL;