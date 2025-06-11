/*
  # Add RLS policies for promotion_products table
  
  1. Changes
    - Add RLS policy to allow admin users to manage promotion_products
    - Ensure RLS is enabled on the promotion_products table
    
  2. Security
    - Direct UUID check for admin access
    - Consistent with existing admin policy pattern
*/

-- Add policy for promotion_products table
CREATE POLICY "Admin manages promotion products" 
ON promotion_products FOR ALL
TO authenticated
USING (auth.uid() = 'd3f1a8b0-e3b4-4c3d-a8f5-6e9b7c8d1e2f');

-- Ensure RLS is enabled on the table
ALTER TABLE promotion_products ENABLE ROW LEVEL SECURITY;

-- Add policy for promotions table in case it's missing
CREATE POLICY "Admin manages promotion products"
ON promotions FOR ALL
TO authenticated
USING (auth.uid() = 'd3f1a8b0-e3b4-4c3d-a8f5-6e9b7c8d1e2f');