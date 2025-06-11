/*
  # Fix Product Visibility Based on Payment Methods
  
  1. Changes
    - Drop existing policies and constraints
    - Add new strict RLS policy for product visibility
    - Update constraint to ensure valid payment methods
    
  2. Security
    - Products only visible when payment methods are enabled
    - Maintain admin access
    - Enforce data integrity
*/

-- Drop existing product policies
DO $$ 
BEGIN
  EXECUTE (
    SELECT string_agg(
      format('DROP POLICY IF EXISTS %I ON products', policyname), ';'
    )
    FROM pg_policies 
    WHERE tablename = 'products' 
    AND schemaname = 'public'
  );
END $$;

-- Drop existing constraint
ALTER TABLE products DROP CONSTRAINT IF EXISTS valid_payment_methods;

-- Update any invalid payment methods to default values
UPDATE products 
SET allowed_payment_methods = '{"cash_on_delivery": true, "card": true}'::jsonb 
WHERE allowed_payment_methods IS NULL 
   OR allowed_payment_methods = '{}'::jsonb
   OR allowed_payment_methods = '[]'::jsonb;

-- Create strict RLS policy for public access
CREATE POLICY "Public read access with payment methods"
ON products
FOR SELECT
TO public
USING (
  COALESCE(
    (allowed_payment_methods->>'cash_on_delivery')::boolean,
    false
  ) = true 
  OR 
  COALESCE(
    (allowed_payment_methods->>'card')::boolean,
    false
  ) = true
);

-- Create admin policy
CREATE POLICY "Admin full access"
ON products
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

-- Add strict constraint for payment methods
ALTER TABLE products
ADD CONSTRAINT valid_payment_methods
CHECK (
  jsonb_typeof(allowed_payment_methods) = 'object'
  AND
  (
    COALESCE((allowed_payment_methods->>'cash_on_delivery')::boolean, false) = true
    OR
    COALESCE((allowed_payment_methods->>'card')::boolean, false) = true
  )
);

-- Ensure RLS is enabled
ALTER TABLE products ENABLE ROW LEVEL SECURITY;