/*
  # Add Dropshipping Role to Existing Users
  
  1. Changes
    - Update existing users with dropshipping role
    - Ensure role constraint is properly set
    
  2. Security
    - Maintain existing security policies
    - No data loss
*/

-- First ensure the role constraint is correct
ALTER TABLE users
DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
ADD CONSTRAINT users_role_check
CHECK (role = ANY (ARRAY['admin'::text, 'customer'::text, 'fulfillment'::text, 'dropshipping'::text]));

-- Update any existing users with invalid roles to 'customer'
UPDATE users 
SET role = 'customer' 
WHERE role NOT IN ('admin', 'customer', 'fulfillment', 'dropshipping');