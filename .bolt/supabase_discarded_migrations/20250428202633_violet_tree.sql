/*
  # Add allowed payment methods to products

  1. Changes
    - Add allowed_payment_methods column to products table
    - Set default value for allowed_payment_methods
    - Add check constraint to ensure valid JSON structure

  2. Schema Updates
    - products table:
      - New column: allowed_payment_methods (JSONB)
        - Default: {"cash_on_delivery": true, "card": true}
        - Validates JSON structure with check constraint
*/

-- Add allowed_payment_methods column to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS allowed_payment_methods JSONB 
DEFAULT '{"cash_on_delivery": true, "card": true}'::jsonb;

-- Add check constraint to ensure valid JSON structure
ALTER TABLE products
ADD CONSTRAINT valid_payment_methods
CHECK (
  (allowed_payment_methods->>'cash_on_delivery' IS NULL OR jsonb_typeof(allowed_payment_methods->'cash_on_delivery') = 'boolean') AND
  (allowed_payment_methods->>'card' IS NULL OR jsonb_typeof(allowed_payment_methods->'card') = 'boolean')
);