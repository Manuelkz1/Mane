/*
  # Fix Admin RLS Policies for Products Table
  
  1. Changes
    - Drop and recreate product policies with proper WITH CHECK clauses
    - Ensure admin has full access to products table
    - Fix policy ordering and permissions
    
  2. Security
    - Maintain RLS security
    - Use direct UUID checks
    - Proper separation of concerns for each operation
*/

-- First drop all existing product policies to start fresh
DO $$ 
BEGIN
  -- Drop all policies for products table
  EXECUTE (
    SELECT string_agg(
      format('DROP POLICY IF EXISTS %I ON products', policyname), ';'
    )
    FROM pg_policies 
    WHERE tablename = 'products' 
    AND schemaname = 'public'
  );
END $$;

-- Create a single comprehensive admin policy first
CREATE POLICY "Admin full access"
ON products
FOR ALL
TO authenticated
USING (auth.uid() = 'd3f1a8b0-e3b4-4c3d-a8f5-6e9b7c8d1e2f')
WITH CHECK (auth.uid() = 'd3f1a8b0-e3b4-4c3d-a8f5-6e9b7c8d1e2f');

-- Then create the public read policy
CREATE POLICY "Public read access"
ON products
FOR SELECT
TO public
USING (true);

-- Ensure RLS is enabled
ALTER TABLE products ENABLE ROW LEVEL SECURITY;