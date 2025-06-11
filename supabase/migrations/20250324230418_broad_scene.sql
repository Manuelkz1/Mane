/*
  # Add Storage Bucket for Product Images
  
  1. Changes
    - Create storage bucket for product images
    - Set up public access policy
    
  2. Security
    - Enable public read access
    - Restrict write access to admin users
*/

-- Create storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policy for public access
CREATE POLICY "Public Access"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'products');

-- Set up storage policy for admin uploads
CREATE POLICY "Admin Upload Access"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'products' AND
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Set up storage policy for admin delete
CREATE POLICY "Admin Delete Access"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'products' AND
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);