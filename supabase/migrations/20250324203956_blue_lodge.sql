/*
  # Set up admin user and policies

  1. Changes
    - Update specific user to admin role
    - Add admin-specific policies
    - Ensure proper security constraints

  2. Security
    - Only allow role changes through migration
    - Maintain existing RLS policies
*/

-- Update specific user to admin role
UPDATE users 
SET role = 'admin' 
WHERE email = 'actuvistamoss@gmail.com';

-- Ensure admin policies are in place
CREATE POLICY "Admins can manage all users"
ON users
FOR ALL
TO authenticated
USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
)
WITH CHECK (
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);

-- Add function to check if user is admin
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

-- Ensure admin can access all orders
CREATE POLICY "Admins can view all orders"
ON orders
FOR SELECT
TO authenticated
USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  OR user_id = auth.uid()
);

-- Ensure admin can manage all products
CREATE POLICY "Admins can manage all products"
ON products
FOR ALL
TO authenticated
USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
)
WITH CHECK (
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);