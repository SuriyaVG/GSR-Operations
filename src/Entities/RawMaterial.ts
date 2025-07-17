// src/Entities/RawMaterial.ts
import { createEntity } from '@/lib/entity';

export interface RawMaterial {
  id: string;
  name: string;
  category: string;
  unit: string;
  cost_per_unit: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export const RawMaterial = createEntity<RawMaterial>('raw_materials'); 