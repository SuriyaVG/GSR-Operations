// src/Entities/Supplier.ts
import { createEntity } from '@/lib/entity';

export interface Supplier {
  id: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  payment_terms?: number; // days
  active: boolean;
  created_at: string;
  updated_at: string;
}

export const Supplier = createEntity<Supplier>('suppliers'); 