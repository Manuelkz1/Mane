/*
  # Add Company Settings Table
  
  1. New Tables
    - `company_settings`: Store company configuration
      - `name` (text): Company name
      - `logo_url` (text): URL to company logo
      - `updated_at` (timestamp): Last update timestamp
    
  2. Security
    - Enable RLS
    - Only admin can modify settings
    - Anyone can view settings
*/

CREATE TABLE IF NOT EXISTS company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Calidad Premium',
  logo_url text,
  updated_at timestamptz DEFAULT now()
);

-- Insert default settings
INSERT INTO company_settings (name, logo_url)
VALUES ('Calidad Premium', NULL)
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- Public can view settings
CREATE POLICY "Anyone can view company settings"
  ON company_settings
  FOR SELECT
  TO public
  USING (true);

-- Only admin can modify settings
CREATE POLICY "Admin can modify company settings"
  ON company_settings
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

-- Create storage bucket for logos if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for logos
CREATE POLICY "Public Access to Logos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'logos');

CREATE POLICY "Admin Upload Access to Logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'logos' AND
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

CREATE POLICY "Admin Delete Access to Logos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'logos' AND
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);