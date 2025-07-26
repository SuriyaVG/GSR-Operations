// src/Entities/InteractionLog.ts
import { createEntity } from '@/lib/entity';

export interface InteractionLog {
  id: string;
  customer_id: string;
  interaction_type: 'call' | 'email' | 'whatsapp' | 'meeting';
  description: string;
  follow_up_required: boolean;
  follow_up_date?: string;
  created_at: string;
  created_by: string;
  updated_at: string;
}

export const InteractionLog = createEntity<InteractionLog>('interaction_log');