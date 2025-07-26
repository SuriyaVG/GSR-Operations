// src/Entities/Customer.ts
import { supabase } from '@/lib/supabase';

// Define the Customer interface
export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  created_at: string;
  updated_at: string;
  notes?: string;
  status: 'active' | 'inactive' | 'pending';
  assigned_to?: string; // User ID
  company_name?: string;
  contact_person?: string;
  customer_type?: 'retail' | 'wholesale' | 'distributor';
  credit_limit?: number;
  payment_terms?: string;
  tax_id?: string;
  website?: string;
  industry?: string;
  last_order_date?: string;
  total_orders?: number;
  total_spent?: number;
  average_order_value?: number;
  tags?: string[];
  custom_fields?: Record<string, any>;
}

export interface CustomerCreationData {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  notes?: string;
  status?: 'active' | 'inactive' | 'pending';
  assigned_to?: string;
  company_name?: string;
  contact_person?: string;
  customer_type?: 'retail' | 'wholesale' | 'distributor';
  credit_limit?: number;
  payment_terms?: string;
  tax_id?: string;
  website?: string;
  industry?: string;
  tags?: string[];
  custom_fields?: Record<string, any>;
}

export interface CustomerUpdateData extends Partial<CustomerCreationData> {
  id: string;
}

// Customer entity class with database operations
export const Customer = {
  // List customers with optional sorting and limit
  async list(sort = '-created_at', limit = 100): Promise<Customer[]> {
    let query = supabase.from('customers').select('*');
    
    if (sort) {
      const isDesc = sort.startsWith('-');
      const sortField = isDesc ? sort.substring(1) : sort;
      query = query.order(sortField, { ascending: !isDesc });
    }
    
    if (limit) {
      query = query.limit(limit);
    }
    
    const { data, error } = await query;
    if (error) throw new Error(`Failed to list customers: ${error.message}`);
    return data || [];
  },

  // Find customer by ID
  async find(id: string): Promise<Customer | null> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to find customer: ${error.message}`);
    }
    
    return data;
  },

  // Filter customers by criteria
  async filter(criteria: Record<string, any>): Promise<Customer[]> {
    let query = supabase.from('customers').select('*');
    
    Object.entries(criteria).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
    
    const { data, error } = await query;
    if (error) throw new Error(`Failed to filter customers: ${error.message}`);
    return data || [];
  },

  // Create new customer
  async create(customerData: CustomerCreationData): Promise<Customer> {
    const { data, error } = await supabase
      .from('customers')
      .insert(customerData)
      .select()
      .single();
    
    if (error) throw new Error(`Failed to create customer: ${error.message}`);
    return data;
  },

  // Update customer
  async update(id: string, updates: Partial<CustomerUpdateData>): Promise<Customer> {
    const { data, error } = await supabase
      .from('customers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw new Error(`Failed to update customer: ${error.message}`);
    return data;
  },

  // Delete customer
  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id);
    
    if (error) throw new Error(`Failed to delete customer: ${error.message}`);
    return true;
  }
};