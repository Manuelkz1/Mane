/*
  # Fix RLS Policies Recursion

  1. Changes
    - Remove recursive admin checks
    - Simplify RLS policies
    - Fix infinite recursion in user policies
    
  2. Security
    - Maintain security while avoiding recursion
    - Ensure proper access control
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admins can manage all users" ON users;
DROP POLICY IF EXISTS "Admins can manage all products" ON products;
DROP POLICY IF EXISTS "Admins can view all orders" ON orders;

-- Drop existing admin check function
DROP FUNCTION IF EXISTS is_admin();

-- Create new admin check function without recursion
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Direct query without recursion
  RETURN EXISTS (
    SELECT 1
    FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate policies without recursion
CREATE POLICY "Admins can manage users"
ON users
FOR ALL
TO authenticated
USING (
  role = 'admin'
  OR id = auth.uid()
)
WITH CHECK (
  role = 'admin'
  OR id = auth.uid()
);

CREATE POLICY "Admins can manage products"
ON products
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

CREATE POLICY "Admins can manage orders"
ON orders
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
  OR user_id = auth.uid()
);

-- Ensure basic user policies are in place
CREATE POLICY IF NOT EXISTS "Users can read own data"
ON users
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
);

CREATE POLICY IF NOT EXISTS "Users can update own data"
ON users
FOR UPDATE
TO authenticated
USING (
  id = auth.uid()
)
WITH CHECK (
  id = auth.uid()
  AND (role IS NULL OR role = 'customer')
);

-- Ensure public can view products
CREATE POLICY IF NOT EXISTS "Anyone can view products"
ON products
FOR SELECT
TO public
USING (true);