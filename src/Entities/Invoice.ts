// src/Entities/Invoice.ts
import { createEntity } from '@/lib/entity';

export interface Invoice {
  id: string;
  order_id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  total_amount: number;
  paid_amount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  payment_terms: number; // days
  created_at: string;
  updated_at: string;
}

export const Invoice = createEntity<Invoice>('invoices');