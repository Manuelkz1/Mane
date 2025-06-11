/*
  # Fix Product RLS Policies for Payment Methods
  
  1. Changes
    - Update product policies to check allowed payment methods
    - Ensure products with disabled payment methods are not visible
    
  2. Security
    - Maintain existing RLS security
    - Filter products based on payment settings
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

-- Create new policies with payment method checks
CREATE POLICY "Public read access with payment methods"
ON products
FOR SELECT
TO public
USING (
  (allowed_payment_methods->>'cash_on_delivery')::boolean = true OR
  (allowed_payment_methods->>'card')::boolean = true
);

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

-- Ensure RLS is enabled
ALTER TABLE products ENABLE ROW LEVEL SECURITY;