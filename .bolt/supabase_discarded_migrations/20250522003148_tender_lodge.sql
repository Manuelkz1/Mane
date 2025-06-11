/*
  # Update Promotions Table Schema
  
  1. Changes
    - Add missing columns:
      - `description` for promotion details
      - `value` for percentage/fixed discount amounts
    - Update valid promotion types to include:
      - percentage: For percentage-based discounts
      - fixed: For fixed amount discounts
      - 2x1, 3x1, 3x2: For quantity-based promotions
    
  2. Notes
    - Adds backward compatibility for existing promotions
    - Ensures all promotion types from the UI are supported
*/

-- Add missing columns
ALTER TABLE promotions 
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS value numeric(10,2);

-- Drop existing constraint
ALTER TABLE promotions 
DROP CONSTRAINT IF EXISTS valid_promotion_type;

-- Add updated constraint with all promotion types
ALTER TABLE promotions 
ADD CONSTRAINT valid_promotion_type 
CHECK (type IN ('2x1', '3x1', '3x2', 'percentage', 'fixed'));

-- Make buy_quantity and get_quantity optional for percentage/fixed discounts
ALTER TABLE promotions 
ALTER COLUMN buy_quantity DROP NOT NULL,
ALTER COLUMN get_quantity DROP NOT NULL;

-- Add constraint to ensure quantities are set for quantity-based promotions
ALTER TABLE promotions 
ADD CONSTRAINT valid_quantities 
CHECK (
  (type IN ('2x1', '3x1', '3x2') AND buy_quantity > 0 AND get_quantity > 0) OR
  (type IN ('percentage', 'fixed') AND value > 0)
);