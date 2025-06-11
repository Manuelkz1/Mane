/*
  # Fix RLS Policy Syntax

  1. Changes
    - Remove IF NOT EXISTS from policy creation
    - Clean up existing policies
    - Recreate policies with correct syntax
    
  2. Security
    - Maintain same security rules
    - Ensure proper access control
*/

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Admins can manage users" ON users;
DROP POLICY IF EXISTS "Admins can manage products" ON products;
DROP POLICY IF EXISTS "Admins can manage orders" ON orders;
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Anyone can view products" ON products;

-- Drop existing admin check function
DROP FUNCTION IF EXISTS is_admin();

-- Create new admin check function without recursion
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create policies with correct syntax
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

-- Create basic user policies
CREATE POLICY "Users can read own data"
ON users
FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Users can update own data"
ON users
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid()
  AND (role IS NULL OR role = 'customer')
);

-- Create public product viewing policy
CREATE POLICY "Anyone can view products"
ON products
FOR SELECT
TO public
USING (true);