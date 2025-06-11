-- Añadir campo de costo de envío para usuarios dropshipping
ALTER TABLE company_settings 
ADD COLUMN IF NOT EXISTS dropshipping_shipping_cost DECIMAL(10,2) DEFAULT 0;

-- Actualizar registros existentes para establecer un valor predeterminado
UPDATE company_settings
SET dropshipping_shipping_cost = 0
WHERE dropshipping_shipping_cost IS NULL;
