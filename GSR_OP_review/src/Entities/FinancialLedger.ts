// src/Entities/FinancialLedger.ts
import { supabase } from '@/lib/supabase';

// Define the FinancialLedger interface
export interface FinancialLedger {
  id: string;
  transaction_type: 'invoice' | 'payment' | 'credit_note' | 'refund' | 'adjustment';
  transaction_id: string;
  reference_number: string;
  customer_id: string;
  amount: number;
  balance_impact: 'debit' | 'credit';
  description: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  notes?: string;
  order_id?: string;
  invoice_id?: string;
  credit_note_id?: string;
  payment_method?: string;
  payment_reference?: string;
  category?: string;
  tags?: string[];
}

export interface FinancialLedgerCreationData {
  transaction_type: 'invoice' | 'payment' | 'credit_note' | 'refund' | 'adjustment';
  transaction_id: string;
  reference_number: string;
  customer_id: string;
  amount: number;
  balance_impact: 'debit' | 'credit';
  description: string;
  notes?: string;
  order_id?: string;
  invoice_id?: string;
  credit_note_id?: string;
  payment_method?: string;
  payment_reference?: string;
  category?: string;
  tags?: string[];
}

export interface FinancialLedgerUpdateData extends Partial<FinancialLedgerCreationData> {
  id: string;
}

// FinancialLedger entity class with database operations
export const FinancialLedger = {
  // List financial ledger entries with optional sorting and limit
  async list(sort = '-created_at', limit = 100): Promise<FinancialLedger[]> {
    let query = supabase.from('financial_ledger').select('*');
    
    if (sort) {
      const isDesc = sort.startsWith('-');
      const sortField = isDesc ? sort.substring(1) : sort;
      query = query.order(sortField, { ascending: !isDesc });
    }
    
    if (limit) {
      query = query.limit(limit);
    }
    
    const { data, error } = await query;
    if (error) throw new Error(`Failed to list financial ledger: ${error.message}`);
    return data || [];
  },

  // Find financial ledger entry by ID
  async find(id: string): Promise<FinancialLedger | null> {
    const { data, error } = await supabase
      .from('financial_ledger')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to find financial ledger entry: ${error.message}`);
    }
    
    return data;
  },

  // Filter financial ledger entries by criteria
  async filter(criteria: Record<string, any>): Promise<FinancialLedger[]> {
    let query = supabase.from('financial_ledger').select('*');
    
    Object.entries(criteria).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
    
    const { data, error } = await query;
    if (error) throw new Error(`Failed to filter financial ledger: ${error.message}`);
    return data || [];
  },

  // Create new financial ledger entry
  async create(ledgerData: FinancialLedgerCreationData): Promise<FinancialLedger> {
    const { data, error } = await supabase
      .from('financial_ledger')
      .insert(ledgerData)
      .select()
      .single();
    
    if (error) throw new Error(`Failed to create financial ledger entry: ${error.message}`);
    return data;
  },

  // Update financial ledger entry
  async update(id: string, updates: Partial<FinancialLedgerUpdateData>): Promise<FinancialLedger> {
    const { data, error } = await supabase
      .from('financial_ledger')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw new Error(`Failed to update financial ledger entry: ${error.message}`);
    return data;
  },

  // Delete financial ledger entry
  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('financial_ledger')
      .delete()
      .eq('id', id);
    
    if (error) throw new Error(`Failed to delete financial ledger entry: ${error.message}`);
    return true;
  }
};