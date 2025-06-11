/*
  # Fix Admin User Creation and RLS Policies
  
  1. Changes
    - Safely update admin user without causing conflicts
    - Simplify RLS policies to avoid recursion
    - Ensure proper admin access to all tables
    
  2. Security
    - Maintain RLS security
    - Use direct UUID checks
    - Avoid complex policy conditions
*/

-- First, safely update the admin user
DO $$ 
BEGIN
  -- Update auth.users metadata if the user exists
  UPDATE auth.users 
  SET raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}'::jsonb
  WHERE email = 'actuvistamoss@gmail.com';

  -- Update or insert into public.users table
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    'd3f1a8b0-e3b4-4c3d-a8f5-6e9b7c8d1e2f',
    'actuvistamoss@gmail.com',
    'Admin User',
    'admin'
  )
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
USING (auth.uid() = 'd3f1a8b0-e3b4-4c3d-a8f5-6e9b7c8d1e2f')
WITH CHECK (auth.uid() = 'd3f1a8b0-e3b4-4c3d-a8f5-6e9b7c8d1e2f');

-- Public read access for products
CREATE POLICY "Public read access"
ON products
FOR SELECT
TO public
USING (true);

-- Ensure RLS is enabled
ALTER TABLE products ENABLE ROW LEVEL SECURITY;