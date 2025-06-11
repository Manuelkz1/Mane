/*
  # Fix Infinite Recursion in RLS Policies
  
  1. Changes
    - Simplify admin check function
    - Remove recursive policy checks
    - Fix infinite recursion in users table policies
    
  2. Security
    - Maintain proper access control
    - Prevent policy recursion
    - Keep RLS enabled
*/

-- Drop existing policies to start fresh
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

-- Create simplified admin check function
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Direct check against auth.uid() without querying users table
  RETURN EXISTS (
    SELECT 1
    FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.email = 'actuvistamoss@gmail.com'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create basic policies without recursion
CREATE POLICY "Users basic access"
ON users
FOR SELECT
TO authenticated
USING (
  id = auth.uid() OR 
  auth.jwt()->>'email' = 'actuvistamoss@gmail.com'
);

CREATE POLICY "Users self update"
ON users
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "Initial user creation"
ON users
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Public product view"
ON products
FOR SELECT
TO public
USING (true);

CREATE POLICY "Admin product management"
ON products
FOR ALL
TO authenticated
USING (auth.jwt()->>'email' = 'actuvistamoss@gmail.com');

CREATE POLICY "Order management"
ON orders
FOR ALL
TO authenticated
USING (
  user_id = auth.uid() OR 
  auth.jwt()->>'email' = 'actuvistamoss@gmail.com'
);

CREATE POLICY "Guest orders"
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