/*
  # Add Product Instructions and Colors
  
  1. Changes
    - Add instructions_file column to products table
    - Add colors array column to products table
    - Create storage bucket for instruction files
    - Add unique policy names to avoid conflicts
    
  2. Security
    - Enable RLS on storage bucket
    - Maintain existing security policies
*/

-- Add new columns to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS instructions_file text,
ADD COLUMN IF NOT EXISTS available_colors text[] DEFAULT '{}';

-- Create storage bucket for instruction files if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('instructions', 'instructions', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policy for public access to instruction files
CREATE POLICY "Instructions Public Read"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'instructions');

-- Set up storage policy for admin uploads to instructions
CREATE POLICY "Instructions Admin Upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'instructions' AND
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Set up storage policy for admin delete from instructions
CREATE POLICY "Instructions Admin Delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'instructions' AND
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);