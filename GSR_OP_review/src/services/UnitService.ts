import { supabase } from '@/lib/supabase';

const TABLE = 'units';

const UnitService = {
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
};

export default UnitService; 