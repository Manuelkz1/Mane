/*
  # Update Products Table RLS Policies
  
  1. Changes
    - Drop existing product policies
    - Create new policies with proper admin access
    - Ensure proper UPDATE permissions for admin users
  
  2. Security
    - Enable RLS on products table
    - Add policy for admin to manage all operations
    - Add policy for public to view products
*/

-- Drop existing policies for products table
DROP POLICY IF EXISTS "Anyone can view products" ON products;
DROP POLICY IF EXISTS "Admin manages products" ON products;

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create new policies
CREATE POLICY "Anyone can view products"
ON products FOR SELECT
TO public
USING (true);

CREATE POLICY "Admin manages products"
ON products FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);