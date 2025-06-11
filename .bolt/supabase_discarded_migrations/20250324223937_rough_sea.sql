/*
  # Final Fix for RLS Policies
  
  1. Changes
    - Simplify RLS policies to use direct UUID check
    - Remove complex EXISTS clauses that may cause issues
    - Ensure proper admin access to products table
    
  2. Security
    - Maintain RLS security
    - Keep public read access
    - Direct UUID check for admin
*/

-- First drop all existing product policies
DO $$ 
BEGIN
  EXECUTE (
    SELECT string_agg(
      format('DROP POLICY IF EXISTS %I ON products', policyname), ';'
    )
    FROM pg_policies 
    WHERE tablename = 'products' 
    AND schemaname = 'public'
  );
END $$;

-- Create simplified admin policy
CREATE POLICY "Admin full access"
ON products
FOR ALL
TO authenticated
USING (auth.uid() = 'd3f1a8b0-e3b4-4c3d-a8f5-6e9b7c8d1e2f');

-- Public read access
CREATE POLICY "Public read access"
ON products
FOR SELECT
TO public
USING (true);

-- Ensure RLS is enabled
ALTER TABLE products ENABLE ROW LEVEL SECURITY;