/*
  # Safe Policy Creation with Existence Checks

  1. Changes
    - Use DO blocks to safely create policies
    - Check for existing policies before creation
    - Maintain same security rules
    
  2. Security
    - Ensure no duplicate policies
    - Maintain proper access control
*/

-- Drop existing function if needed
DROP FUNCTION IF EXISTS is_admin();

-- Create admin check function
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Safely create policies using DO blocks
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Admins can manage users' 
    AND tablename = 'users'
  ) THEN
    CREATE POLICY "Admins can manage users"
    ON users
    FOR ALL
    TO authenticated
    USING (
      role = 'admin'
      OR id = auth.uid()
    )
    WITH CHECK (
      role = 'admin'
      OR id = auth.uid()
    );
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Admins can manage products' 
    AND tablename = 'products'
  ) THEN
    CREATE POLICY "Admins can manage products"
    ON products
    FOR ALL
    TO authenticated
    USING (is_admin());
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Admins can manage orders' 
    AND tablename = 'orders'
  ) THEN
    CREATE POLICY "Admins can manage orders"
    ON orders
    FOR ALL
    TO authenticated
    USING (is_admin() OR user_id = auth.uid());
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can read own data' 
    AND tablename = 'users'
  ) THEN
    CREATE POLICY "Users can read own data"
    ON users
    FOR SELECT
    TO authenticated
    USING (id = auth.uid());
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can update own data' 
    AND tablename = 'users'
  ) THEN
    CREATE POLICY "Users can update own data"
    ON users
    FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (
      id = auth.uid()
      AND (role IS NULL OR role = 'customer')
    );
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Anyone can view products' 
    AND tablename = 'products'
  ) THEN
    CREATE POLICY "Anyone can view products"
    ON products
    FOR SELECT
    TO public
    USING (true);
  END IF;
END $$;