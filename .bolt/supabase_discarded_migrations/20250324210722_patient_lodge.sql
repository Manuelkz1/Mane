/*
  # Final Fix for RLS Policies
  
  1. Changes
    - Remove all problematic policies
    - Create new policies with correct syntax
    - Fix admin role assignment
    - Ensure proper table security
    
  2. Security
    - Prevent recursion in admin checks
    - Maintain proper access control
    - Enable RLS on all tables
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "Admins can manage users" ON users;
DROP POLICY IF EXISTS "Admins can manage products" ON products;
DROP POLICY IF EXISTS "Admins can manage orders" ON orders;
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Anyone can view products" ON products;
DROP POLICY IF EXISTS "Users can insert themselves" ON users;
DROP POLICY IF EXISTS "Handle auth user creation" ON users;

-- Drop existing function
DROP FUNCTION IF EXISTS is_admin();

-- Create admin check function
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

-- Set admin role
UPDATE users 
SET role = 'admin' 
WHERE email = 'actuvistamoss@gmail.com';

-- Create new policies with correct syntax
CREATE POLICY "Admins can manage users"
ON users
FOR ALL
TO authenticated
USING (is_admin() OR id = auth.uid());

CREATE POLICY "Users can insert themselves"
ON users
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Handle auth user creation"
ON users
FOR INSERT
TO anon
WITH CHECK (true);

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
WITH CHECK (id = auth.uid());

CREATE POLICY "Anyone can view products"
ON products
FOR SELECT
TO public
USING (true);

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

CREATE POLICY "Users can view their orders"
ON orders
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can create orders"
ON orders
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Allow guest orders"
ON orders
FOR INSERT
TO public
WITH CHECK (is_guest = true);

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;