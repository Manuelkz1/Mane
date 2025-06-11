/*
  # Fix RLS Policies and Admin Access
  
  1. Changes
    - Simplify admin checks using email directly
    - Remove complex policy chains
    - Fix user table policies
    - Add proper order and review policies
    
  2. Security
    - Direct email check for admin
    - Proper RLS for all tables
    - Clean policy definitions
*/

-- Drop all existing policies
DO $$ 
BEGIN
  -- Users policies
  DROP POLICY IF EXISTS "Users basic access" ON users;
  DROP POLICY IF EXISTS "Users self update" ON users;
  DROP POLICY IF EXISTS "Initial user creation" ON users;
  DROP POLICY IF EXISTS "Users can insert themselves" ON users;
  DROP POLICY IF EXISTS "Handle auth user creation" ON users;
  DROP POLICY IF EXISTS "Admins can manage all users" ON users;
  
  -- Products policies
  DROP POLICY IF EXISTS "Public product view" ON products;
  DROP POLICY IF EXISTS "Admin product management" ON products;
  DROP POLICY IF EXISTS "Admins can manage all products" ON products;
  DROP POLICY IF EXISTS "Only admins can modify products" ON products;
  
  -- Orders policies
  DROP POLICY IF EXISTS "Order management" ON orders;
  DROP POLICY IF EXISTS "Guest orders" ON orders;
  DROP POLICY IF EXISTS "Users can view their own orders" ON orders;
  DROP POLICY IF EXISTS "Admins can view all orders" ON orders;
  
  -- Reviews policies
  DROP POLICY IF EXISTS "Anyone can view reviews" ON reviews;
  DROP POLICY IF EXISTS "Authenticated users can create reviews" ON reviews;
END $$;

-- Users table policies
CREATE POLICY "Users view own profile"
ON users FOR SELECT
TO authenticated
USING (
  auth.uid() = id OR 
  auth.jwt()->>'email' = 'actuvistamoss@gmail.com'
);

CREATE POLICY "Users update own profile"
ON users FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow initial user creation"
ON users FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Products table policies
CREATE POLICY "Anyone can view products"
ON products FOR SELECT
TO public
USING (true);

CREATE POLICY "Admin manages products"
ON products FOR ALL
TO authenticated
USING (auth.jwt()->>'email' = 'actuvistamoss@gmail.com')
WITH CHECK (auth.jwt()->>'email' = 'actuvistamoss@gmail.com');

-- Orders table policies
CREATE POLICY "Users view own orders"
ON orders FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR 
  auth.jwt()->>'email' = 'actuvistamoss@gmail.com'
);

CREATE POLICY "Users create own orders"
ON orders FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() OR 
  is_guest = true
);

CREATE POLICY "Users update own orders"
ON orders FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() OR 
  auth.jwt()->>'email' = 'actuvistamoss@gmail.com'
)
WITH CHECK (
  user_id = auth.uid() OR 
  auth.jwt()->>'email' = 'actuvistamoss@gmail.com'
);

-- Order items policies
CREATE POLICY "Users view own order items"
ON order_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id
    AND (orders.user_id = auth.uid() OR auth.jwt()->>'email' = 'actuvistamoss@gmail.com')
  )
);

CREATE POLICY "Users create order items"
ON order_items FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_id
    AND (orders.user_id = auth.uid() OR orders.is_guest = true)
  )
);

-- Reviews policies
CREATE POLICY "Anyone can view reviews"
ON reviews FOR SELECT
TO public
USING (true);

CREATE POLICY "Users create own reviews"
ON reviews FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own reviews"
ON reviews FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;