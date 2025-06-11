/*
  # Add delivery time fields to products table
  
  1. Changes
    - Add delivery_time column for storing estimated delivery time
    - Add show_delivery_time flag to control visibility
    
  2. Description
    - delivery_time: Text field for storing delivery time estimates (e.g., "2-3 días hábiles")
    - show_delivery_time: Boolean flag to control whether delivery time is shown on product page
*/

ALTER TABLE products
ADD COLUMN IF NOT EXISTS delivery_time character varying,
ADD COLUMN IF NOT EXISTS show_delivery_time boolean DEFAULT false NOT NULL;

-- Update existing products to have show_delivery_time set to false
UPDATE products SET show_delivery_time = false WHERE show_delivery_time IS NULL;