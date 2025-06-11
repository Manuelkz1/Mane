/*
  # Add Payment Methods and Promotions Management
  
  1. New Tables
    - `payment_methods`: Store available payment methods
    - `promotions`: Store promotion configurations
    - `promotion_products`: Link products to promotions
    
  2. Security
    - Enable RLS
    - Only admin can manage payment methods and promotions
    - Public can view active payment methods and promotions
*/

-- Create payment_methods table
CREATE TABLE IF NOT EXISTS payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create promotions table
CREATE TABLE IF NOT EXISTS promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL,
  buy_quantity integer NOT NULL,
  get_quantity integer NOT NULL,
  total_price numeric(10,2),
  is_active boolean DEFAULT true,
  start_date timestamptz,
  end_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_promotion_type CHECK (
    type IN ('2x1', '3x1', '3x2')
  ),
  CONSTRAINT valid_quantities CHECK (
    buy_quantity > 0 AND get_quantity > 0
  )
);

-- Create promotion_products table
CREATE TABLE IF NOT EXISTS promotion_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id uuid REFERENCES promotions ON DELETE CASCADE,
  product_id uuid REFERENCES products ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (promotion_id, product_id)
);

-- Insert default payment methods
INSERT INTO payment_methods (name, code)
VALUES 
  ('Pago contra entrega', 'cash_on_delivery'),
  ('Pago con tarjeta', 'card')
ON CONFLICT (code) DO NOTHING;

-- Enable RLS
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_products ENABLE ROW LEVEL SECURITY;

-- Public read access policies
CREATE POLICY "Anyone can view active payment methods"
ON payment_methods
FOR SELECT
TO public
USING (is_active = true);

CREATE POLICY "Anyone can view active promotions"
ON promotions
FOR SELECT
TO public
USING (
  is_active = true AND
  (start_date IS NULL OR start_date <= now()) AND
  (end_date IS NULL OR end_date >= now())
);

CREATE POLICY "Anyone can view promotion products"
ON promotion_products
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM promotions
    WHERE promotions.id = promotion_id
    AND is_active = true
    AND (start_date IS NULL OR start_date <= now())
    AND (end_date IS NULL OR end_date >= now())
  )
);

-- Admin management policies
CREATE POLICY "Admin manages payment methods"
ON payment_methods
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

CREATE POLICY "Admin manages promotions"
ON promotions
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

CREATE POLICY "Admin manages promotion products"
ON promotion_products
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