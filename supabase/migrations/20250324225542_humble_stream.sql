/*
  # Verify Admin Access to Products Table
  
  1. Changes
    - Drop existing policies to start fresh
    - Create simplified admin access policy
    - Add public read access
    - Ensure proper role check
    
  2. Security
    - Use direct role check
    - Maintain RLS security
    - Keep public read access
*/

-- Drop existing policies
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

-- Create admin access policy
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
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- Create public read access policy
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

-- Verify admin user exists and has correct role
DO $$ 
BEGIN
  -- Update admin role if needed
  UPDATE users 
  SET role = 'admin' 
  WHERE email = 'actuvistamoss@gmail.com';
  
  -- Verify the update
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE email = 'actuvistamoss@gmail.com' 
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Admin user not found or role not set correctly';
  END IF;
END $$;