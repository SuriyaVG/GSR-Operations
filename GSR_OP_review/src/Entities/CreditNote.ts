// src/Entities/CreditNote.ts
import { supabase } from '@/lib/supabase';

// Define the CreditNote interface
export interface CreditNote {
  id: string;
  credit_note_number: string;
  order_id?: string;
  customer_id: string;
  amount: number;
  tax_amount?: number;
  total_amount: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'applied';
  created_at: string;
  updated_at: string;
  created_by: string;
  approved_by?: string;
  approved_at?: string;
  notes?: string;
  items?: CreditNoteItem[];
  applied_to_invoice_id?: string;
  applied_at?: string;
}

export interface CreditNoteItem {
  id: string;
  credit_note_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  tax_rate?: number;
  tax_amount?: number;
  total_amount: number;
  notes?: string;
}

export interface CreditNoteCreationData {
  order_id?: string;
  customer_id: string;
  amount: number;
  tax_amount?: number;
  total_amount: number;
  reason: string;
  notes?: string;
  items?: Omit<CreditNoteItem, 'id' | 'credit_note_id'>[];
}

export interface CreditNoteUpdateData extends Partial<CreditNoteCreationData> {
  id: string;
  status?: 'pending' | 'approved' | 'rejected' | 'applied';
  approved_by?: string;
  approved_at?: string;
  applied_to_invoice_id?: string;
  applied_at?: string;
}

// CreditNote entity class with database operations
export const CreditNote = {
  // List credit notes with optional sorting and limit
  async list(sort = '-created_at', limit = 100): Promise<CreditNote[]> {
    let query = supabase.from('credit_notes').select('*');
    
    if (sort) {
      const isDesc = sort.startsWith('-');
      const sortField = isDesc ? sort.substring(1) : sort;
      query = query.order(sortField, { ascending: !isDesc });
    }
    
    if (limit) {
      query = query.limit(limit);
    }
    
    const { data, error } = await query;
    if (error) throw new Error(`Failed to list credit notes: ${error.message}`);
    return data || [];
  },

  // Find credit note by ID
  async find(id: string): Promise<CreditNote | null> {
    const { data, error } = await supabase
      .from('credit_notes')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to find credit note: ${error.message}`);
    }
    
    return data;
  },

  // Filter credit notes by criteria
  async filter(criteria: Record<string, any>): Promise<CreditNote[]> {
    let query = supabase.from('credit_notes').select('*');
    
    Object.entries(criteria).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
    
    const { data, error } = await query;
    if (error) throw new Error(`Failed to filter credit notes: ${error.message}`);
    return data || [];
  },

  // Create new credit note
  async create(creditNoteData: CreditNoteCreationData): Promise<CreditNote> {
    const { data, error } = await supabase
      .from('credit_notes')
      .insert(creditNoteData)
      .select()
      .single();
    
    if (error) throw new Error(`Failed to create credit note: ${error.message}`);
    return data;
  },

  // Update credit note
  async update(id: string, updates: Partial<CreditNoteUpdateData>): Promise<CreditNote> {
    const { data, error } = await supabase
      .from('credit_notes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw new Error(`Failed to update credit note: ${error.message}`);
    return data;
  },

  // Delete credit note
  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('credit_notes')
      .delete()
      .eq('id', id);
    
    if (error) throw new Error(`Failed to delete credit note: ${error.message}`);
    return true;
  }
};