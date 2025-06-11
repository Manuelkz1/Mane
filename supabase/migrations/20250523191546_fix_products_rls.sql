/*
  # Corregir políticas RLS para la tabla products
  
  1. Cambios
    - Habilitar RLS en la tabla products si no está habilitado
    - Crear política para permitir a los administradores gestionar productos (CRUD completo)
    - Crear política para permitir a cualquier usuario ver productos
    
  2. Seguridad
    - Asegura que solo los administradores puedan crear, actualizar y eliminar productos
    - Mantiene el acceso público para visualización de productos
*/

-- Habilitar RLS en la tabla products
ALTER TABLE IF EXISTS products ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si las hay
DROP POLICY IF EXISTS "Admin manages products" ON products;
DROP POLICY IF EXISTS "Anyone can view products" ON products;

-- Crear política para acceso de administradores (CRUD completo)
CREATE POLICY "Admin manages products"
ON products
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

-- Crear política para visualización pública
CREATE POLICY "Anyone can view products"
ON products
FOR SELECT
TO public
USING (true);
