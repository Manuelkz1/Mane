/*
  # Fix RLS Policies and Admin Access

  1. Changes
    - Drop problematic policies
    - Create new simplified policies
    - Fix recursion issues
    - Ensure admin access for specific email
    
  2. Security
    - Maintain proper access control
    - Prevent infinite recursion
    - Ensure admin capabilities
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admins can manage users" ON users;
DROP POLICY IF EXISTS "Admins can manage products" ON products;
DROP POLICY IF EXISTS "Admins can manage orders" ON orders;
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Anyone can view products" ON products;

-- Drop existing admin check function
DROP FUNCTION IF EXISTS is_admin();

-- Create simplified admin check function
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

-- Ensure your email has admin role
UPDATE users 
SET role = 'admin' 
WHERE email = 'actuvistamoss@gmail.com';

-- Create simplified policies without IF NOT EXISTS
CREATE POLICY "Admins can manage users"
ON users
FOR ALL
TO authenticated
USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  OR id = auth.uid()
);

CREATE POLICY "Admins can manage products"
ON products
FOR ALL
TO authenticated
USING (is_admin());

CREATE POLICY "Admins can manage orders"
ON orders
FOR ALL
TO authenticated
USING (is_admin() OR user_id = auth.uid());

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

CREATE POLICY "Anyone can view products"
ON products
FOR SELECT
TO public
USING (true);

-- Enable RLS on all tables if not already enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;