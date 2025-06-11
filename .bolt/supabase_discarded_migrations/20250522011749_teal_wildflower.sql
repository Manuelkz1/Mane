/*
  # Create company_settings table if it doesn't exist

  1. New Table (if not exists)
    - Initializes the company_settings table with default values
    - Ensures we have at least one row to avoid the "multiple (or no) rows" error
    
  2. Changes
    - Creates a default row if the table is empty
*/

-- Make sure we have one row in company_settings to fix the single() query issue
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.company_settings LIMIT 1) THEN
        INSERT INTO public.company_settings (
            name, 
            hero_title, 
            hero_subtitle, 
            logo_width, 
            logo_height, 
            maintain_ratio, 
            dropshipping_shipping_cost
        ) VALUES (
            'Calidad Premium',
            'Productos de Calidad Premium',
            'Descubre nuestra selección de productos exclusivos con la mejor calidad garantizada',
            200,
            60,
            true,
            0
        );
    END IF;
END
$$;