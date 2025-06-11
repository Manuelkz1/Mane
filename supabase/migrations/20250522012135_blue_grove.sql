/*
  # Fix RLS for promotion_products table

  1. Changes
    - Enables RLS on promotion_products table
    - Adds policies to allow admin management
    - Adds policy for public viewing
    
  2. Security
    - Properly secures promotion_products table while allowing necessary access
*/

-- Enable RLS on promotion_products table
ALTER TABLE IF EXISTS promotion_products ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Admin manages promotion products" ON promotion_products;
DROP POLICY IF EXISTS "Anyone can view promotion products" ON promotion_products;

-- Create policy for admin access
CREATE POLICY "Admin manages promotion products"
ON promotion_products
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

-- Create policy for public viewing
CREATE POLICY "Anyone can view promotion products"
ON promotion_products
FOR SELECT
TO public
USING (true);