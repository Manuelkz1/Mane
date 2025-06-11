/*
  # Add Reviews Table and RLS Policies
  
  1. Changes
    - Create reviews table with approval system
    - Add RLS policies for public viewing and authenticated submissions
    - Add admin management policies
    
  2. Security
    - Only approved reviews are publicly visible
    - Users can only submit reviews for products they've purchased
    - Admins have full access to manage reviews
*/

-- Create reviews table if it doesn't exist
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text NOT NULL,
  name text,
  approved boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(product_id, user_id)
);

-- Enable RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Public can view approved reviews
CREATE POLICY "Public can view approved reviews"
ON reviews
FOR SELECT
TO public
USING (approved = true);

-- Authenticated users can view their own reviews
CREATE POLICY "Users can view own reviews"
ON reviews
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can create reviews for products they've purchased
CREATE POLICY "Users can create reviews for purchased products"
ON reviews
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    WHERE o.user_id = auth.uid()
    AND oi.product_id = reviews.product_id
    AND o.status = 'delivered'
  )
);

-- Admin can manage all reviews
CREATE POLICY "Admin can manage reviews"
ON reviews
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