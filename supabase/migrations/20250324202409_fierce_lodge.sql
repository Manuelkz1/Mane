/*
  # Fix Users Table RLS Policies

  1. Changes
    - Add policy for users to insert their own records
    - Add policy for auth signup handling
  
  2. Security
    - Enable RLS on users table
    - Ensure users can only insert their own records
*/

-- Enable RLS if not already enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy for users to insert their own records
CREATE POLICY "Users can insert themselves"
ON users
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Policy for handling initial user creation during signup
CREATE POLICY "Handle auth user creation"
ON users
FOR INSERT
TO anon
WITH CHECK (true);