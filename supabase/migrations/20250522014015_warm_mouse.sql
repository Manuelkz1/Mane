/*
  # Fix Orders Table RLS Policies
  
  1. New RLS Policies
    - Ensure admin role (UUID match) can manage all orders
    - Fix policies for authenticated users to view their own orders
    - Add policy for order items management
    
  2. Security
    - Fixed RLS constraints to ensure proper access
*/

-- Fix orders RLS policies
DROP POLICY IF EXISTS "Admin manages orders" ON orders;
CREATE POLICY "Admin manages orders"
ON orders FOR ALL
TO authenticated
USING (
  auth.uid() = 'd3f1a8b0-e3b4-4c3d-a8f5-6e9b7c8d1e2f'::uuid OR
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

DROP POLICY IF EXISTS "Users view own orders" ON orders;
CREATE POLICY "Users view own orders"
ON orders FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR
  auth.uid() = 'd3f1a8b0-e3b4-4c3d-a8f5-6e9b7c8d1e2f'::uuid OR
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() 
    AND (users.role = 'admin' OR users.role = 'fulfillment')
  )
);

DROP POLICY IF EXISTS "Users create orders" ON orders;
CREATE POLICY "Users create orders"
ON orders FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() OR
  is_guest = true OR
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- Fix order_items RLS policies
DROP POLICY IF EXISTS "View order items" ON order_items;
CREATE POLICY "View order items"
ON order_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id
    AND (
      orders.user_id = auth.uid() OR 
      auth.uid() = 'd3f1a8b0-e3b4-4c3d-a8f5-6e9b7c8d1e2f'::uuid OR
      EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid() 
        AND (users.role = 'admin' OR users.role = 'fulfillment')
      )
    )
  )
);

DROP POLICY IF EXISTS "Create order items" ON order_items;
CREATE POLICY "Create order items"
ON order_items FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_id
    AND (
      orders.user_id = auth.uid() OR 
      orders.is_guest = true OR
      auth.uid() = 'd3f1a8b0-e3b4-4c3d-a8f5-6e9b7c8d1e2f'::uuid OR
      EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid() 
        AND users.role = 'admin'
      )
    )
  )
);

-- Admin can manage order items
DROP POLICY IF EXISTS "Admin manages order items" ON order_items;
CREATE POLICY "Admin manages order items"
ON order_items FOR ALL
TO authenticated
USING (
  auth.uid() = 'd3f1a8b0-e3b4-4c3d-a8f5-6e9b7c8d1e2f'::uuid OR
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);