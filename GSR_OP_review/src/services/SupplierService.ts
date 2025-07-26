import { supabase } from '@/lib/supabase';

const TABLE = 'suppliers';

const SupplierService = {
  async create(data) {
    const { data: result, error } = await supabase.from(TABLE).insert(data).select().single();
    if (error) throw new Error(error.message);
    return result;
  },
  async update(id, data) {
    const { data: result, error } = await supabase.from(TABLE).update(data).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return result;
  },
  async list(sort = '-created_at', limit = 100) {
    let query = supabase.from(TABLE).select('*');
    if (sort) {
      const isDesc = sort.startsWith('-');
      const sortField = isDesc ? sort.substring(1) : sort;
      query = query.order(sortField, { ascending: !isDesc });
    }
    if (limit) {
      query = query.limit(limit);
    }
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data;
  },
};

export default SupplierService; 