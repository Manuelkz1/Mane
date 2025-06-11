/*
  # Add shipping settings

  1. New Tables
    - `shipping_settings`
      - `id` (uuid, primary key)
      - `free_shipping_threshold` (numeric(10,2))
      - `free_shipping_enabled` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on shipping_settings table
    - Add policy for admin to manage settings
    - Add policy for public to view settings
*/

CREATE TABLE IF NOT EXISTS shipping_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  free_shipping_threshold numeric(10,2) NOT NULL DEFAULT 100000,
  free_shipping_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE shipping_settings ENABLE ROW LEVEL SECURITY;

-- Admin can manage settings
CREATE POLICY "Admin manages shipping settings" ON shipping_settings
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  ));

-- Anyone can view settings
CREATE POLICY "Anyone can view shipping settings" ON shipping_settings
  FOR SELECT
  TO public
  USING (true);

-- Insert default settings
INSERT INTO shipping_settings (
  free_shipping_threshold,
  free_shipping_enabled
) VALUES (
  100000,
  true
);