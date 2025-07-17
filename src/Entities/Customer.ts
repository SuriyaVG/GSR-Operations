// src/Entities/Customer.ts
import { createEntity } from '@/lib/entity';

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  channel: 'direct' | 'distributor' | 'online' | 'retail';
  tier: 'premium' | 'wholesale' | 'standard';
  credit_limit?: number;
  payment_terms?: number; // days
  active: boolean;
  ltv?: number; // Calculated from vw_customer_metrics
  aov?: number; // Calculated from vw_customer_metrics
  last_order_date?: string;
  predicted_reorder_date?: string;
  created_at: string;
  updated_at: string;
}

export const Customer = createEntity<Customer>('customers'); 