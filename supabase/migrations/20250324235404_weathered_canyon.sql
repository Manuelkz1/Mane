/*
  # Fix Guest Orders RLS Policies
  
  1. Changes
    - Drop and recreate order policies with proper public access
    - Add policies for guest orders and order items
    - Fix policy ordering to ensure proper access
    
  2. Security
    - Allow guest orders while maintaining security
    - Enable proper public access for guest checkouts
    - Keep RLS enabled
*/

-- Drop existing order policies
DO $$ 
BEGIN
  EXECUTE (
    SELECT string_agg(
      format('DROP POLICY IF EXISTS %I ON orders', policyname), ';'
    )
    FROM pg_policies 
    WHERE tablename = 'orders' 
    AND schemaname = 'public'
  );

  EXECUTE (
    SELECT string_agg(
      format('DROP POLICY IF EXISTS %I ON order_items', policyname), ';'
    )
    FROM pg_policies 
    WHERE tablename = 'order_items' 
    AND schemaname = 'public'
  );
END $$;

-- Create guest order policies first (order matters)
CREATE POLICY "Guest orders allowed"
ON orders
FOR INSERT
TO public
WITH CHECK (is_guest = true);

CREATE POLICY "Guest orders viewable"
ON orders
FOR SELECT
TO public
USING (is_guest = true);

-- Create authenticated user policies
CREATE POLICY "Users manage own orders"
ON orders
FOR ALL
TO authenticated
USING (
  user_id = auth.uid() OR 
  auth.uid() = 'd3f1a8b0-e3b4-4c3d-a8f5-6e9b7c8d1e2f'
)
WITH CHECK (
  user_id = auth.uid() OR 
  is_guest = true OR
  auth.uid() = 'd3f1a8b0-e3b4-4c3d-a8f5-6e9b7c8d1e2f'
);

-- Order items policies
CREATE POLICY "Guest order items allowed"
ON order_items
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_id
    AND orders.is_guest = true
  )
);

CREATE POLICY "Guest order items viewable"
ON order_items
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_id
    AND orders.is_guest = true
  )
);

CREATE POLICY "Users view own order items"
ON order_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_id
    AND (orders.user_id = auth.uid() OR auth.uid() = 'd3f1a8b0-e3b4-4c3d-a8f5-6e9b7c8d1e2f')
  )
);

CREATE POLICY "Users manage own order items"
ON order_items
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_id
    AND (orders.user_id = auth.uid() OR orders.is_guest = true)
  )
);

-- Ensure RLS is enabled
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;