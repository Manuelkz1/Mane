/*
  # Fix Product Payment Methods RLS Policy
  
  1. Changes
    - Update RLS policy to properly check payment methods
    - Add constraint for payment methods validation
    
  2. Security
    - Ensure products without payment methods are hidden
    - Maintain admin access
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

-- Create new policies with strict payment method checks
CREATE POLICY "Public read access with payment methods"
ON products
FOR SELECT
TO public
USING (
  ((allowed_payment_methods ->> 'cash_on_delivery')::boolean = true) OR
  ((allowed_payment_methods ->> 'card')::boolean = true)
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

-- Add constraint to ensure at least one payment method is true
ALTER TABLE products DROP CONSTRAINT IF EXISTS valid_payment_methods;
ALTER TABLE products
ADD CONSTRAINT valid_payment_methods
CHECK (
  (allowed_payment_methods->>'cash_on_delivery' IS NULL OR jsonb_typeof(allowed_payment_methods->'cash_on_delivery') = 'boolean') AND
  (allowed_payment_methods->>'card' IS NULL OR jsonb_typeof(allowed_payment_methods->'card') = 'boolean')
);