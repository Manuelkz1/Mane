/*
  # Fix Promotions Schema and Constraints
  
  1. Changes
    - Update the promotion type constraint to only allow '2x1', '3x1', '3x2'
    - Ensure buy_quantity and get_quantity are required and valid
    - Rename is_active column to active for consistency with frontend
    - Add proper RLS policies
    
  2. Security
    - Only admins can manage promotions
    - Public can only view active promotions
*/

-- Fix column name inconsistency if needed
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.columns 
             WHERE table_name = 'promotions' AND column_name = 'is_active'
             AND table_schema = 'public') THEN
    ALTER TABLE promotions RENAME COLUMN is_active TO active;
  END IF;
END $$;

-- Update promotion type constraint
ALTER TABLE promotions
DROP CONSTRAINT IF EXISTS valid_promotion_type;

ALTER TABLE promotions
ADD CONSTRAINT valid_promotion_type 
CHECK (type IN ('2x1', '3x1', '3x2'));

-- Add constraints for buy and get quantities
ALTER TABLE promotions
DROP CONSTRAINT IF EXISTS valid_quantities;

ALTER TABLE promotions
ADD CONSTRAINT valid_quantities 
CHECK (buy_quantity > 0 AND get_quantity > 0);

-- Ensure required fields are not null
ALTER TABLE promotions 
ALTER COLUMN name SET NOT NULL,
ALTER COLUMN type SET NOT NULL,
ALTER COLUMN buy_quantity SET NOT NULL,
ALTER COLUMN get_quantity SET NOT NULL;

-- Set default value for active if not already set
ALTER TABLE promotions
ALTER COLUMN active SET DEFAULT true;

-- Make sure RLS is enabled
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Admin manages promotions" ON promotions;
DROP POLICY IF EXISTS "Anyone can view active promotions" ON promotions;

-- Re-create policies with proper conditions
CREATE POLICY "Admin manages promotions"
ON promotions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

CREATE POLICY "Anyone can view active promotions"
ON promotions
FOR SELECT
TO public
USING (
  active = true 
  AND (start_date IS NULL OR start_date <= now()) 
  AND (end_date IS NULL OR end_date >= now())
);