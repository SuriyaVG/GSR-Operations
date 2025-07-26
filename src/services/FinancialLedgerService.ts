import { supabase } from '@/lib/supabase';

const TABLE = 'financial_ledger';

const FinancialLedgerService = {
  async list(sort = '-transaction_date', limit = 100) {
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

export default FinancialLedgerService; 