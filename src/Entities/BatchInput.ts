// src/Entities/BatchInput.ts
import { createEntity } from '@/lib/entity';

export interface BatchInput {
  id: string;
  batch_id: string;
  material_intake_id: string;
  quantity_used: number;
  created_at: string;
  updated_at: string;
}

export const BatchInput = createEntity<BatchInput>('batch_inputs'); 