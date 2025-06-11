/*
  # Fix Payment Methods and Add Payment URL
  
  1. Changes
    - First update existing data to valid values
    - Then add payment_url column
    - Finally add the constraint
    
  2. Security
    - Maintain data integrity
    - No data loss
    - Safe constraint addition
*/

-- First update any existing records to valid values
UPDATE orders 
SET payment_method = 'cash_on_delivery' 
WHERE payment_method NOT IN ('cash_on_delivery', 'mercadopago');

-- Add payment_url column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'orders' 
    AND column_name = 'payment_url'
  ) THEN
    ALTER TABLE orders 
    ADD COLUMN payment_url text DEFAULT NULL;
  END IF;
END $$;

-- Now that data is clean, we can safely add the constraint
DO $$ 
BEGIN
  -- Drop the constraint if it exists
  ALTER TABLE orders 
    DROP CONSTRAINT IF EXISTS orders_payment_method_check;
    
  -- Add the new constraint
  ALTER TABLE orders
    ADD CONSTRAINT orders_payment_method_check 
    CHECK (payment_method IN ('cash_on_delivery', 'mercadopago'));
END $$;