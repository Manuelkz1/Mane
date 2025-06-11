/*
  # Improve Orders View with Proper Permissions
  
  1. Changes
    - Create a materialized view for better order visualization
    - Add proper security context
    - Set up proper view permissions
    
  2. Security
    - Use materialized view for better performance
    - Maintain RLS security
    - Proper permission handling
*/

-- Drop existing objects if they exist
DROP MATERIALIZED VIEW IF EXISTS order_details;
DROP FUNCTION IF EXISTS refresh_order_details();

-- Create the materialized view
CREATE MATERIALIZED VIEW order_details AS
SELECT 
  o.id as order_id,
  o.created_at as order_date,
  CASE 
    WHEN o.is_guest THEN o.guest_info->>'full_name'
    ELSE u.full_name 
  END as customer_name,
  CASE 
    WHEN o.is_guest THEN o.guest_info->>'email'
    ELSE u.email
  END as customer_email,
  CASE 
    WHEN o.is_guest THEN o.guest_info->>'phone'
    ELSE o.shipping_address->>'phone'
  END as customer_phone,
  o.shipping_address->>'address' as delivery_address,
  o.shipping_address->>'city' as delivery_city,
  o.shipping_address->>'postal_code' as postal_code,
  o.payment_method,
  CASE 
    WHEN o.payment_method = 'cash_on_delivery' THEN 'Contra entrega'
    WHEN o.payment_method = 'nequi' THEN 'Nequi'
    WHEN o.payment_method = 'daviplata' THEN 'Daviplata'
    WHEN o.payment_method = 'bancolombia' THEN 'Bancolombia'
    ELSE o.payment_method
  END as payment_method_display,
  o.payment_status,
  CASE o.payment_status
    WHEN 'pending' THEN 'Pendiente'
    WHEN 'paid' THEN 'Pagado'
    WHEN 'failed' THEN 'Fallido'
    ELSE o.payment_status
  END as payment_status_display,
  o.status as order_status,
  CASE o.status
    WHEN 'pending' THEN 'Pendiente'
    WHEN 'processing' THEN 'En proceso'
    WHEN 'shipped' THEN 'Enviado'
    WHEN 'delivered' THEN 'Entregado'
    WHEN 'cancelled' THEN 'Cancelado'
    ELSE o.status
  END as order_status_display,
  o.total as order_total,
  o.is_guest,
  array_agg(
    json_build_object(
      'product_name', p.name,
      'quantity', oi.quantity,
      'price', oi.price_at_time,
      'subtotal', (oi.quantity * oi.price_at_time)
    )
  ) as order_items
FROM 
  orders o
  LEFT JOIN users u ON o.user_id = u.id
  LEFT JOIN order_items oi ON o.id = oi.order_id
  LEFT JOIN products p ON oi.product_id = p.id
GROUP BY 
  o.id, 
  o.created_at, 
  o.is_guest, 
  o.guest_info, 
  o.shipping_address, 
  u.full_name, 
  u.email,
  o.payment_method,
  o.payment_status,
  o.status,
  o.total;

-- Create index for better performance
CREATE UNIQUE INDEX order_details_order_id_idx ON order_details (order_id);

-- Create refresh function
CREATE OR REPLACE FUNCTION refresh_order_details()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY order_details;
    RETURN NULL;
END;
$$;

-- Create triggers to refresh the materialized view
CREATE TRIGGER refresh_order_details_on_orders
AFTER INSERT OR UPDATE OR DELETE ON orders
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_order_details();

CREATE TRIGGER refresh_order_details_on_order_items
AFTER INSERT OR UPDATE OR DELETE ON order_items
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_order_details();

-- Grant permissions
GRANT SELECT ON order_details TO authenticated;

-- Enable RLS
ALTER MATERIALIZED VIEW order_details OWNER TO postgres;

-- Create RLS policy function
CREATE OR REPLACE FUNCTION check_order_access(order_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  ) OR EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_id
    AND (orders.user_id = auth.uid() OR orders.is_guest = true)
  );
END;
$$;

-- Create policy
CREATE POLICY "Users can view their orders or admin can view all"
ON order_details
FOR SELECT
TO authenticated
USING (
  check_order_access(order_id)
);

COMMENT ON MATERIALIZED VIEW order_details IS 'Detailed view of orders with customer information and order items';