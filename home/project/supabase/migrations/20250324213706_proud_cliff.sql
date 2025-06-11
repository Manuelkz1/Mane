/*
  # Fix RLS Policies with Proper Cleanup
  
  1. Changes
    - Drop all existing policies first
    - Recreate policies with proper checks
    - Use UUID for admin identification
    
  2. Security
    - Direct UUID checks for admin
    - No recursion in policies
    - Clean policy definitions
*/

-- Drop all existing policies
DO $$ 
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN (
    SELECT schemaname, tablename, policyname 
    FROM pg_policies 
    WHERE schemaname = 'public'
  )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
      pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

-- Drop existing functions
DROP FUNCTION IF EXISTS is_admin();

-- Users table policies
CREATE POLICY "Users view own profile"
ON users FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users update own profile"
ON users FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow initial user creation"
ON users FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Admin manages users"
ON users FOR ALL
TO authenticated
USING (auth.uid() = 'd3f1a8b0-e3b4-4c3d-a8f5-6e9b7c8d1e2f');

-- Products table policies
CREATE POLICY "Anyone can view products"
ON products FOR SELECT
TO public
USING (true);

CREATE POLICY "Admin manages products"
ON products FOR ALL
TO authenticated
USING (auth.uid() = 'd3f1a8b0-e3b4-4c3d-a8f5-6e9b7c8d1e2f');

-- Orders table policies
CREATE POLICY "Users view own orders"
ON orders FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR 
  auth.uid() = 'd3f1a8b0-e3b4-4c3d-a8f5-6e9b7c8d1e2f'
);

CREATE POLICY "Users create orders"
ON orders FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() OR 
  is_guest = true
);

CREATE POLICY "Admin manages orders"
ON orders FOR ALL
TO authenticated
USING (auth.uid() = 'd3f1a8b0-e3b4-4c3d-a8f5-6e9b7c8d1e2f');

-- Order items policies
CREATE POLICY "View order items"
ON order_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id
    AND (orders.user_id = auth.uid() OR auth.uid() = 'd3f1a8b0-e3b4-4c3d-a8f5-6e9b7c8d1e2f')
  )
);

CREATE POLICY "Create order items"
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
CREATE POLICY "Public review access"
ON reviews FOR SELECT
TO public
USING (true);

CREATE POLICY "Authenticated review creation"
ON reviews FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;