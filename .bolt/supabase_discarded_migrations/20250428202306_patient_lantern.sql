/*
  # Add Payment Methods to Products Table
  
  1. Changes
    - Add allowed_payment_methods column to products table
    - Set default value to allow all payment methods
    
  2. Security
    - Maintain existing RLS policies
    - No data loss
*/

ALTER TABLE products
ADD COLUMN IF NOT EXISTS allowed_payment_methods jsonb DEFAULT '{"cash_on_delivery": true, "card": true}'::jsonb;

-- Update any existing products to have both payment methods enabled
UPDATE products 
SET allowed_payment_methods = '{"cash_on_delivery": true, "card": true}'::jsonb 
WHERE allowed_payment_methods IS NULL;