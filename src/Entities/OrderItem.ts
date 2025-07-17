// src/Entities/OrderItem.ts
import { createEntity } from '@/lib/entity';

export interface OrderItem {
  id: string;
  order_id: string;
  batch_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  packaging_type: string;
  total_price: number;
  created_at: string;
  updated_at: string;
}

export const OrderItem = createEntity<OrderItem>('order_items'); 