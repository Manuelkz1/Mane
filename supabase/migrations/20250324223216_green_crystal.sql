/*
  # Fix Admin RLS Policies
  
  1. Changes
    - Simplify admin access policies
    - Fix products table RLS for admin
    - Ensure admin can perform all operations
    
  2. Security
    - Maintain RLS security
    - Use direct UUID checks
    - No recursion in policies
*/

-- Drop existing product policies
DROP POLICY IF EXISTS "Anyone can view products" ON products;
DROP POLICY IF EXISTS "Admin manages products" ON products;

-- Recreate products policies with proper admin access
CREATE POLICY "Anyone can view products"
ON products
FOR SELECT
TO public
USING (true);

CREATE POLICY "Admin insert products"
ON products
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = 'd3f1a8b0-e3b4-4c3d-a8f5-6e9b7c8d1e2f');

CREATE POLICY "Admin update products"
ON products
FOR UPDATE
TO authenticated
USING (auth.uid() = 'd3f1a8b0-e3b4-4c3d-a8f5-6e9b7c8d1e2f')
WITH CHECK (auth.uid() = 'd3f1a8b0-e3b4-4c3d-a8f5-6e9b7c8d1e2f');

CREATE POLICY "Admin delete products"
ON products
FOR DELETE
TO authenticated
USING (auth.uid() = 'd3f1a8b0-e3b4-4c3d-a8f5-6e9b7c8d1e2f');

-- Ensure RLS is enabled
ALTER TABLE products ENABLE ROW LEVEL SECURITY;