/*
  # Add guest checkout support and admin functions

  1. Changes
    - Add admin role check function
    - Add admin-specific functions for order management
    - Add guest checkout support to orders table

  2. Security
    - Add secure admin check function
    - Allow guest orders through RLS policies
*/

-- Add admin role check function
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add admin-specific functions
CREATE OR REPLACE FUNCTION admin_get_all_orders()
RETURNS SETOF orders AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  
  RETURN QUERY SELECT * FROM orders;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add guest orders support
ALTER TABLE orders 
  ALTER COLUMN user_id DROP NOT NULL;

-- Add guest flag to orders
ALTER TABLE orders 
  ADD COLUMN is_guest BOOLEAN DEFAULT false;

-- Add guest information to orders
ALTER TABLE orders 
  ADD COLUMN guest_info JSONB DEFAULT NULL;

-- Update orders policies for guest checkout
CREATE POLICY "Allow guest orders"
  ON orders
  FOR INSERT
  TO public
  WITH CHECK (is_guest = true);