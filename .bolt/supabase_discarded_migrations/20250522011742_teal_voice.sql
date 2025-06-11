/*
  # Fix promotion_products table RLS policies

  1. Changes
    - Drop existing policies with conflicting names
    - Create proper RLS policies for promotion_products table
    - Add WITH CHECK clause to properly allow insertions
    
  2. Security
    - Only admin can manage promotion products
    - Ensures proper access control for the join table
*/

-- First drop any existing policies with the same name to avoid conflicts
DROP POLICY IF EXISTS "Admin manages promotion products" ON promotion_products;

-- Ensure RLS is enabled
ALTER TABLE promotion_products ENABLE ROW LEVEL SECURITY;

-- Create proper policy with both USING and WITH CHECK clauses
CREATE POLICY "Admin manages promotion products" 
ON promotion_products 
FOR ALL
TO authenticated
USING (auth.uid() = 'd3f1a8b0-e3b4-4c3d-a8f5-6e9b7c8d1e2f')
WITH CHECK (auth.uid() = 'd3f1a8b0-e3b4-4c3d-a8f5-6e9b7c8d1e2f');

-- Add a policy for non-admin users to view promotion products (read-only)
CREATE POLICY "Public can view promotion products" 
ON promotion_products 
FOR SELECT
TO public
USING (true);

-- Also verify the policy on promotions table is correct
DROP POLICY IF EXISTS "Admin manages promotion products" ON promotions;

-- Fix any policy naming conflicts by using consistent naming
CREATE POLICY "Admin manages promotions with products" 
ON promotions 
FOR ALL
TO authenticated
USING (auth.uid() = 'd3f1a8b0-e3b4-4c3d-a8f5-6e9b7c8d1e2f')
WITH CHECK (auth.uid() = 'd3f1a8b0-e3b4-4c3d-a8f5-6e9b7c8d1e2f');