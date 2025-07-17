// src/Entities/Order.ts
import { createEntity } from '@/lib/entity';

export interface Order {
  id: string;
  customer_id: string;
  order_number: string;
  order_date: string;
  total_amount: number;
  status: 'draft' | 'confirmed' | 'processing' | 'completed' | 'cancelled';
  payment_status: 'pending' | 'partial' | 'paid' | 'overdue';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export const Order = createEntity<Order>('orders'); 