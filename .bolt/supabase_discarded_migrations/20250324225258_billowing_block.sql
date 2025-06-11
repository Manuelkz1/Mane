/*
  # Final Admin User and RLS Policy Fix
  
  1. Changes
    - Properly update admin user in auth.users
    - Ensure admin exists in public.users
    - Clean up and simplify RLS policies
    - Fix product table access
    
  2. Security
    - Use direct UUID checks
    - Maintain proper RLS security
    - Avoid policy recursion
*/

-- First, safely handle the admin user
DO $$ 
BEGIN
  -- Update auth.users metadata if the user exists
  UPDATE auth.users 
  SET raw_app_meta_data = jsonb_set(
    COALESCE(raw_app_meta_data, '{}'::jsonb),
    '{role}',
    '"admin"'
  )
  WHERE email = 'actuvistamoss@gmail.com';

  -- Ensure admin exists in public.users
  INSERT INTO public.users (id, email, full_name, role)
  SELECT 
    id,
    email,
    COALESCE(raw_user_meta_data->>'full_name', 'Admin User'),
    'admin'
  FROM auth.users
  WHERE email = 'actuvistamoss@gmail.com'
  ON CONFLICT (id) DO UPDATE
  SET role = 'admin',
      updated_at = now();
END $$;

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

-- Create simplified admin policy for products
CREATE POLICY "Admin full access"
ON products
FOR ALL
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM users WHERE role = 'admin'
  )
)
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM users WHERE role = 'admin'
  )
);

-- Public read access for products
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