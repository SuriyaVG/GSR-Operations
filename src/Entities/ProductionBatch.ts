// src/Entities/ProductionBatch.ts
import { createEntity } from '@/lib/entity';

export interface ProductionBatch {
  id: string;
  batch_number: string;
  production_date: string;
  output_litres: number;
  remaining_quantity: number;
  status: 'active' | 'completed' | 'cancelled';
  quality_grade: 'A' | 'B' | 'C';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export const ProductionBatch = createEntity<ProductionBatch>('production_batches'); 