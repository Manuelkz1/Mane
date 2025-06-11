/*
  # Fix Product Table RLS Policies
  
  1. Changes
    - Drop existing product policies
    - Create new simplified policies for admin access
    - Ensure proper public read access
    
  2. Security
    - Use direct role check from users table
    - Maintain RLS security
    - Keep public read access
*/

-- Drop all existing policies for products
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

-- Create new simplified policies
CREATE POLICY "Admin full access"
ON products
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

CREATE POLICY "Public read access"
ON products
FOR SELECT
TO public
USING (true);

-- Ensure RLS is enabled
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT ALL ON products TO authenticated;
GRANT SELECT ON products TO anon;