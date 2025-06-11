/*
  # Fix RLS Policies for Guest Orders
  
  1. Changes
    - Update orders table RLS policies to properly handle guest orders
    - Add policy for guest order creation
    - Modify existing policies to handle both authenticated and guest users
    
  2. Security
    - Maintain security while allowing guest checkouts
    - Ensure proper access control for order management
*/

-- Drop existing policies for orders
DROP POLICY IF EXISTS "Users create orders" ON orders;
DROP POLICY IF EXISTS "Users view own orders" ON orders;
DROP POLICY IF EXISTS "Admin manages orders" ON orders;

-- Create new policies
CREATE POLICY "Allow guest order creation"
ON orders FOR INSERT
TO public
WITH CHECK (
  is_guest = true
  AND payment_method IN ('cash_on_delivery', 'mercadopago')
);

CREATE POLICY "Users create authenticated orders"
ON orders FOR INSERT
TO authenticated
WITH CHECK (
  (user_id = auth.uid() AND NOT is_guest)
  OR (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  ))
);

CREATE POLICY "View orders"
ON orders FOR SELECT
TO public
USING (
  is_guest = true
  OR user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND (users.role = 'admin' OR users.role = 'fulfillment')
  )
);

CREATE POLICY "Admin manages all orders"
ON orders FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Update order_items policies
DROP POLICY IF EXISTS "Create order items" ON order_items;
DROP POLICY IF EXISTS "View order items" ON order_items;

CREATE POLICY "Create order items"
ON order_items FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_id
    AND (
      orders.is_guest = true
      OR orders.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
      )
    )
  )
);

CREATE POLICY "View order items"
ON order_items FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_id
    AND (
      orders.is_guest = true
      OR orders.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND (users.role = 'admin' OR users.role = 'fulfillment')
      )
    )
  )
);