/*
  # Create default company settings

  1. New Data
    - Inserts a default record into company_settings if none exists
    
  2. Security
    - Adds RLS policy for company_settings table
    - Ensures only admins can manage company settings
*/

-- Insert default company settings if table exists but is empty
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.tables
    WHERE table_schema = 'public' 
    AND table_name = 'company_settings'
  ) AND NOT EXISTS (
    SELECT 1 FROM public.company_settings LIMIT 1
  ) THEN
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
END $$;

-- Add RLS policies for company_settings table if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.tables
    WHERE table_schema = 'public' 
    AND table_name = 'company_settings'
  ) THEN
    -- First make sure RLS is enabled
    ALTER TABLE IF EXISTS public.company_settings ENABLE ROW LEVEL SECURITY;

    -- Create policy for admin access
    DROP POLICY IF EXISTS "Admin manages company settings" ON public.company_settings;
    CREATE POLICY "Admin manages company settings"
      ON public.company_settings
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

    -- Create policy for public viewing
    DROP POLICY IF EXISTS "Anyone can view company settings" ON public.company_settings;
    CREATE POLICY "Anyone can view company settings"
      ON public.company_settings
      FOR SELECT
      TO public
      USING (true);
  END IF;
END $$;

-- Add RLS policies for promotion_products table if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.tables
    WHERE table_schema = 'public' 
    AND table_name = 'promotion_products'
  ) THEN
    -- First make sure RLS is enabled
    ALTER TABLE IF EXISTS public.promotion_products ENABLE ROW LEVEL SECURITY;

    -- Create policy for admin access
    DROP POLICY IF EXISTS "Admin manages promotion products" ON public.promotion_products;
    CREATE POLICY "Admin manages promotion products"
      ON public.promotion_products
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

    -- Create policy for public viewing
    DROP POLICY IF EXISTS "Anyone can view promotion products" ON public.promotion_products;
    CREATE POLICY "Anyone can view promotion products"
      ON public.promotion_products
      FOR SELECT
      TO public
      USING (true);
  END IF;
END $$;