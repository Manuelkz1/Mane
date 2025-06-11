/*
  # Add Fulfillment Role and Update RLS Policies
  
  1. Changes
    - Add fulfillment role type
    - Add policies for fulfillment role to view orders
    - Update existing role check constraints
    
  2. Security
    - Maintain RLS security
    - Restrict fulfillment access to orders only
    - Keep admin privileges separate
*/

-- First update existing data to valid values
UPDATE users 
SET role = 'customer' 
WHERE role NOT IN ('admin', 'customer');

-- Add check constraint for valid roles
ALTER TABLE users
DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
ADD CONSTRAINT users_role_check
CHECK (role IN ('admin', 'customer', 'fulfillment'));

-- Create policies for fulfillment role
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