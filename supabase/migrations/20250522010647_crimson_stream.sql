/*
  # Update promotions table constraints and types

  1. Changes
    - Add check constraint for valid promotion types
    - Add check constraint for valid quantities
    - Add not null constraints for required fields
    
  2. Security
    - Enable RLS on promotions table
    - Add policies for admin management and public viewing
*/

-- Update promotions table constraints
ALTER TABLE promotions
DROP CONSTRAINT IF EXISTS valid_promotion_type;

ALTER TABLE promotions
ADD CONSTRAINT valid_promotion_type 
CHECK (type IN ('2x1', '3x1', '3x2'));

ALTER TABLE promotions
DROP CONSTRAINT IF EXISTS valid_quantities;

ALTER TABLE promotions
ADD CONSTRAINT valid_quantities 
CHECK (buy_quantity > 0 AND get_quantity > 0);

-- Ensure required fields are not null
ALTER TABLE promotions
ALTER COLUMN buy_quantity SET NOT NULL,
ALTER COLUMN get_quantity SET NOT NULL,
ALTER COLUMN name SET NOT NULL,
ALTER COLUMN type SET NOT NULL;

-- Enable RLS and add policies
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin manages promotions" ON promotions;
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

DROP POLICY IF EXISTS "Anyone can view active promotions" ON promotions;
CREATE POLICY "Anyone can view active promotions"
ON promotions
FOR SELECT
TO public
USING (
  is_active = true 
  AND (start_date IS NULL OR start_date <= now()) 
  AND (end_date IS NULL OR end_date >= now())
);