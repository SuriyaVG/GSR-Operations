// src/Entities/Order.ts
import { supabase } from '@/lib/supabase';

// Define the Order interface
export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  amount: number;
  tax_amount?: number;
  shipping_amount?: number;
  total_amount: number;
  created_at: string;
  updated_at: string;
  created_by: string;
  notes?: string;
  shipping_address?: string;
  shipping_method?: string;
  tracking_number?: string;
  estimated_delivery_date?: string;
  actual_delivery_date?: string;
  payment_status: 'pending' | 'paid' | 'refunded' | 'partially_paid';
  payment_method?: string;
  items?: OrderItem[];
  discount_amount?: number;
  discount_type?: 'percentage' | 'fixed';
  discount_reason?: string;
  invoice_id?: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  tax_rate?: number;
  tax_amount?: number;
  total_amount: number;
  notes?: string;
}

export interface OrderCreationData {
  customer_id: string;
  amount: number;
  tax_amount?: number;
  shipping_amount?: number;
  total_amount: number;
  notes?: string;
  shipping_address?: string;
  shipping_method?: string;
  estimated_delivery_date?: string;
  payment_method?: string;
  items?: Omit<OrderItem, 'id' | 'order_id'>[];
  discount_amount?: number;
  discount_type?: 'percentage' | 'fixed';
  discount_reason?: string;
}

export interface OrderUpdateData extends Partial<OrderCreationData> {
  id: string;
  status?: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  tracking_number?: string;
  actual_delivery_date?: string;
  payment_status?: 'pending' | 'paid' | 'refunded' | 'partially_paid';
  invoice_id?: string;
}

// Order entity class with database operations
export const Order = {
  // List orders with optional sorting and limit
  async list(sort = '-created_at', limit = 100): Promise<Order[]> {
    let query = supabase.from('orders').select('*');
    
    if (sort) {
      const isDesc = sort.startsWith('-');
      const sortField = isDesc ? sort.substring(1) : sort;
      query = query.order(sortField, { ascending: !isDesc });
    }
    
    if (limit) {
      query = query.limit(limit);
    }
    
    const { data, error } = await query;
    if (error) throw new Error(`Failed to list orders: ${error.message}`);
    return data || [];
  },

  // Find order by ID
  async find(id: string): Promise<Order | null> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to find order: ${error.message}`);
    }
    
    return data;
  },

  // Filter orders by criteria
  async filter(criteria: Record<string, any>): Promise<Order[]> {
    let query = supabase.from('orders').select('*');
    
    Object.entries(criteria).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
    
    const { data, error } = await query;
    if (error) throw new Error(`Failed to filter orders: ${error.message}`);
    return data || [];
  },

  // Create new order
  async create(orderData: OrderCreationData): Promise<Order> {
    const { data, error } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single();
    
    if (error) throw new Error(`Failed to create order: ${error.message}`);
    return data;
  },

  // Update order
  async update(id: string, updates: Partial<OrderUpdateData>): Promise<Order> {
    const { data, error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw new Error(`Failed to update order: ${error.message}`);
    return data;
  },

  // Delete order
  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', id);
    
    if (error) throw new Error(`Failed to delete order: ${error.message}`);
    return true;
  }
};