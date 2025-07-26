// src/Entities/Invoice.ts
import { supabase } from '@/lib/supabase';

// Define the Invoice interface
export interface Invoice {
  id: string;
  invoice_number: string;
  order_id: string;
  customer_id: string;
  amount: number;
  tax_amount?: number;
  total_amount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  due_date: string;
  payment_date?: string;
  payment_method?: string;
  payment_reference?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  notes?: string;
  items?: InvoiceItem[];
  discount_amount?: number;
  discount_type?: 'percentage' | 'fixed';
  discount_reason?: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  tax_rate?: number;
  tax_amount?: number;
  total_amount: number;
  notes?: string;
}

export interface InvoiceCreationData {
  order_id: string;
  customer_id: string;
  amount: number;
  tax_amount?: number;
  total_amount: number;
  due_date: string;
  notes?: string;
  items?: Omit<InvoiceItem, 'id' | 'invoice_id'>[];
  discount_amount?: number;
  discount_type?: 'percentage' | 'fixed';
  discount_reason?: string;
}

export interface InvoiceUpdateData extends Partial<InvoiceCreationData> {
  id: string;
  status?: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  payment_date?: string;
  payment_method?: string;
  payment_reference?: string;
}

// Invoice entity class with database operations
export const Invoice = {
  // List invoices with optional sorting and limit
  async list(sort = '-created_at', limit = 100): Promise<Invoice[]> {
    let query = supabase.from('invoices').select('*');
    
    if (sort) {
      const isDesc = sort.startsWith('-');
      const sortField = isDesc ? sort.substring(1) : sort;
      query = query.order(sortField, { ascending: !isDesc });
    }
    
    if (limit) {
      query = query.limit(limit);
    }
    
    const { data, error } = await query;
    if (error) throw new Error(`Failed to list invoices: ${error.message}`);
    return data || [];
  },

  // Find invoice by ID
  async find(id: string): Promise<Invoice | null> {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to find invoice: ${error.message}`);
    }
    
    return data;
  },

  // Filter invoices by criteria
  async filter(criteria: Record<string, any>): Promise<Invoice[]> {
    let query = supabase.from('invoices').select('*');
    
    Object.entries(criteria).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
    
    const { data, error } = await query;
    if (error) throw new Error(`Failed to filter invoices: ${error.message}`);
    return data || [];
  },

  // Create new invoice
  async create(invoiceData: InvoiceCreationData): Promise<Invoice> {
    const { data, error } = await supabase
      .from('invoices')
      .insert(invoiceData)
      .select()
      .single();
    
    if (error) throw new Error(`Failed to create invoice: ${error.message}`);
    return data;
  },

  // Update invoice
  async update(id: string, updates: Partial<InvoiceUpdateData>): Promise<Invoice> {
    const { data, error } = await supabase
      .from('invoices')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw new Error(`Failed to update invoice: ${error.message}`);
    return data;
  },

  // Delete invoice
  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id);
    
    if (error) throw new Error(`Failed to delete invoice: ${error.message}`);
    return true;
  }
};