// src/Entities/FinancialLedger.ts
import { createEntity } from '@/lib/entity';

export interface FinancialLedger {
  id: string;
  transaction_type: 'invoice' | 'payment' | 'credit_note' | 'refund' | 'adjustment';
  reference_id: string; // ID of the related invoice, payment, credit note, etc.
  reference_type: 'invoice' | 'payment' | 'credit_note' | 'order';
  customer_id: string;
  amount: number; // Positive for debits (invoices), negative for credits (payments, credit notes)
  description: string;
  transaction_date: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const FinancialLedger = createEntity<FinancialLedger>('financial_ledger'); 