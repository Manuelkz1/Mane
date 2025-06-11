/*
  # Add Selected Color to Order Items
  
  1. Changes
    - Add selected_color column to order_items table
    - Make it nullable since not all products have colors
    
  2. Security
    - Maintain existing RLS policies
    - No data loss
*/

-- Add selected_color column to order_items table
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS selected_color text DEFAULT NULL;

-- Ensure RLS is still enabled
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;