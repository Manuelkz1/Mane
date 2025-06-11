/*
  # Fix Admin User Role and Permissions
  
  1. Changes
    - Ensure admin user exists in users table
    - Set correct role for admin user
    - Update RLS policies to check role
    
  2. Security
    - Maintain RLS security
    - Use both UUID and role checks
    - Proper role-based access control
*/

-- First ensure the admin user exists in the users table
INSERT INTO users (id, email, full_name, role)
VALUES (
  'd3f1a8b0-e3b4-4c3d-a8f5-6e9b7c8d1e2f',
  'actuvistamoss@gmail.com',
  'Admin User',
  'admin'
)
ON CONFLICT (id) DO UPDATE
SET role = 'admin',
    updated_at = now();

-- Drop existing product policies
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

-- Create new policies that check both UUID and role
CREATE POLICY "Admin full access"
ON products
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
    AND users.id = 'd3f1a8b0-e3b4-4c3d-a8f5-6e9b7c8d1e2f'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
    AND users.id = 'd3f1a8b0-e3b4-4c3d-a8f5-6e9b7c8d1e2f'
  )
);

-- Public read access remains unchanged
CREATE POLICY "Public read access"
ON products
FOR SELECT
TO public
USING (true);

-- Ensure RLS is enabled
ALTER TABLE products ENABLE ROW LEVEL SECURITY;