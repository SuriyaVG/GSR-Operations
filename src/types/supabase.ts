// Database type definitions for Supabase
// This file will be updated when we create the actual database schema

export interface Database {
  public: {
    Tables: {
      // Placeholder - will be populated during database migration
      user_profiles: {
        Row: {
          id: string;
          role: 'admin' | 'production' | 'sales_manager' | 'finance' | 'viewer';
          name: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role?: 'admin' | 'production' | 'sales_manager' | 'finance' | 'viewer';
          name?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          role?: 'admin' | 'production' | 'sales_manager' | 'finance' | 'viewer';
          name?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      user_role: 'admin' | 'production' | 'sales_manager' | 'finance' | 'viewer';
    };
  };
}

// Auth types
export interface UserProfile {
  id: string;
  role: Database['public']['Enums']['user_role'];
  name: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// Supabase client types
export type SupabaseClient = import('@supabase/supabase-js').SupabaseClient<Database>;
export type SupabaseUser = import('@supabase/supabase-js').User;