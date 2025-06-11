/*
  # Add allowed payment methods to products

  1. Changes
    - Add allowed_payment_methods column to products table
    - Set default value to allow all payment methods
    - Add check constraint to ensure valid JSON structure

  2. Schema Updates
    - New column: allowed_payment_methods (JSONB)
      - Stores payment method preferences for each product
      - Default value allows all payment methods
      - Check constraint ensures required fields exist
*/

-- Add the allowed_payment_methods column with a default value
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS allowed_payment_methods JSONB 
DEFAULT '{"cash_on_delivery": true, "card": true}';

-- Add a check constraint to ensure the JSON has the required structure
ALTER TABLE products 
ADD CONSTRAINT valid_payment_methods 
CHECK (
  (allowed_payment_methods ? 'cash_on_delivery') AND 
  (allowed_payment_methods ? 'card') AND 
  jsonb_typeof(allowed_payment_methods->'cash_on_delivery') = 'boolean' AND 
  jsonb_typeof(allowed_payment_methods->'card') = 'boolean'
);