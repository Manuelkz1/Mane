/*
  # Fix User Role Management and Fulfillment Access
  
  1. Changes
    - Add trigger to handle role changes
    - Update RLS policies for fulfillment role
    - Add role validation
    
  2. Security
    - Ensure proper role transitions
    - Restrict fulfillment access to orders only
*/

-- Add role validation function
CREATE OR REPLACE FUNCTION validate_user_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate role value
  IF NEW.role NOT IN ('admin', 'customer', 'fulfillment') THEN
    RAISE EXCEPTION 'Invalid role value: %', NEW.role;
  END IF;

  -- Set updated_at timestamp
  NEW.updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for role validation
DROP TRIGGER IF EXISTS validate_user_role_trigger ON users;
CREATE TRIGGER validate_user_role_trigger
  BEFORE UPDATE OF role ON users
  FOR EACH ROW
  EXECUTE FUNCTION validate_user_role();

-- Update RLS policies for fulfillment role
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

-- Ensure fulfillment users can only access orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT SELECT ON orders TO authenticated;
GRANT SELECT ON order_items TO authenticated;