// src/Entities/ReturnsLog.ts
import { createEntity } from '@/lib/entity';

export interface ReturnsLog {
  id: string;
  customer_id: string;
  order_id: string;
  return_reason: string;
  quantity_returned: number;
  refund_amount: number;
  processed_date: string;
  status: 'pending' | 'approved' | 'processed' | 'rejected';
  processed_by?: string;
  created_at: string;
  updated_at: string;
}

export const ReturnsLog = createEntity<ReturnsLog>('returns_log');