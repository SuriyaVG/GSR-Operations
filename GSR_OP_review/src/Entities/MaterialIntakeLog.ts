// src/Entities/MaterialIntakeLog.ts
import { createEntity } from '@/lib/entity';

export interface MaterialIntakeLog {
  id: string;
  supplier_id: string;
  raw_material_id: string;
  lot_number: string;
  quantity: number;
  cost_per_unit: number;
  total_cost: number;
  intake_date: string;
  expiry_date?: string;
  quality_notes?: string;
  remaining_quantity: number;
  created_at: string;
  updated_at: string;
}

export const MaterialIntakeLog = createEntity<MaterialIntakeLog>('material_intake_log'); 