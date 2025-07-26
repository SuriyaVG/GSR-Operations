// src/Entities/SamplesLog.ts
import { createEntity } from '@/lib/entity';

export interface SamplesLog {
  id: string;
  customer_id: string;
  sample_sku: string;
  quantity: number;
  sent_date: string;
  feedback?: string;
  converted_to_order: boolean;
  conversion_order_id?: string;
  created_at: string;
  updated_at: string;
}

export const SamplesLog = createEntity<SamplesLog>('samples_log');