export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  stock: number;
  category: string;
  created_at: string;
  updated_at: string;
  shipping_days?: number; // Días que tarda en llegar el producto
  instructions_file?: string;
  available_colors?: string[];
  color_images?: {
    color: string;
    image: string;
  }[];
  allowed_payment_methods?: {
    cash_on_delivery: boolean;
    card: boolean;
    payment_url?: string;
  };
  promotion?: Promotion;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedColor?: string;
}

export interface Order {
  id: string;
  user_id?: string;
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  shipping_address: {
    full_name: string;
    address: string;
    city: string;
    postal_code: string;
    country: string;
    phone: string;
  };
  payment_method: 'cash_on_delivery' | 'mercadopago';
  payment_status: 'pending' | 'paid' | 'failed';
  payment_url?: string;
  created_at: string;
  updated_at: string;
  is_guest?: boolean;
  guest_info?: {
    full_name: string;
    email: string;
    phone: string;
  };
  order_items?: Array<{
    id: string;
    quantity: number;
    price_at_time: number;
    selected_color?: string;
    products: {
      id: string;
      name: string;
      images?: string[];
    };
  }>;
  dropshipper_id?: string;
  shipping_type?: 'with_collection' | 'without_collection';
  advance_payment?: number;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  total_amount?: number;
  notes?: string;
}

export interface Review {
  id: string;
  product_id: string;
  user_id?: string;
  rating: number;
  comment: string;
  created_at: string;
  Name: string; // Cambiado a 'Name' con N mayúscula para coincidir con la base de datos
  approved?: boolean;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'customer' | 'admin' | 'fulfillment' | 'dropshipping';
  created_at?: string;
  updated_at?: string;
  email_confirmed?: boolean;
  last_sign_in?: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Promotion {
  id?: string;
  name: string;
  description?: string;
  type: '2x1' | '3x1' | '3x2' | 'discount' | 'percentage' | 'fixed';
  value?: number;
  discount_percent?: number;
  active?: boolean;
  is_active?: boolean;
  start_date?: string | null;
  end_date?: string | null;
  created_at?: string;
  updated_at?: string;
  product_ids?: string[];
  category_ids?: string[];
  buy_quantity?: number;
  get_quantity?: number;
  total_price?: number;
}
