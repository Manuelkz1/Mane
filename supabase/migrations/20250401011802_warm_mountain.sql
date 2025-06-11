/*
  # Fix Fulfillment Role Access to Orders
  
  1. Changes
    - Drop existing order policies
    - Add proper policies for fulfillment role
    - Add policies for order items access
    - Fix policy ordering and permissions
    
  2. Security
    - Maintain RLS security
    - Proper role-based access
    - Clean policy definitions
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

-- Create fulfillment policies first
CREATE POLICY "Fulfillment can view orders"
ON orders
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'fulfillment'
  )
);

CREATE POLICY "Fulfillment can view order items"
ON order_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'fulfillment'
  )
);

-- Create admin policies
CREATE POLICY "Admin manages orders"
ON orders
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

CREATE POLICY "Admin manages order items"
ON order_items
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Create customer policies
CREATE POLICY "Customers view own orders"
ON orders
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Customers create orders"
ON orders
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() OR is_guest = true);

CREATE POLICY "Customers view own order items"
ON order_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id
    AND orders.user_id = auth.uid()
  )
);

CREATE POLICY "Customers create order items"
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

-- Create guest policies
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

-- Ensure RLS is enabled
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT SELECT ON orders TO authenticated;
GRANT SELECT ON order_items TO authenticated;
GRANT INSERT ON orders TO authenticated;
GRANT INSERT ON order_items TO authenticated;
GRANT UPDATE ON orders TO authenticated;
GRANT UPDATE ON order_items TO authenticated;