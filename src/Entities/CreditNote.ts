// src/Entities/CreditNote.ts
import { createEntity } from '@/lib/entity';

export interface CreditNote {
  id: string;
  invoice_id: string;
  credit_note_number: string;
  issue_date: string;
  amount: number;
  reason: string;
  status: 'draft' | 'issued' | 'applied';
  created_at: string;
  updated_at: string;
}

export const CreditNote = createEntity<CreditNote>('credit_notes');