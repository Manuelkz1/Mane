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
  instructions_file?: string;
  available_colors?: string[];
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedColor?: string;
}

export interface Order {
  id: string;
  user_id?: string;
  items: CartItem[];
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
    selected_color?: string;
    products: {
      name: string;
    };
  }>;
}

export interface Review {
  id: string;
  product_id: string;
  user_id?: string;
  rating: number;
  comment: string;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'customer' | 'admin' | 'fulfillment';
  created_at?: string;
  updated_at?: string;
  email_confirmed?: boolean;
  last_sign_in?: string;
}