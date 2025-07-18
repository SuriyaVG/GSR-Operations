import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// Environment variable validation
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('Missing VITE_SUPABASE_URL environment variable');
}

if (!supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_ANON_KEY environment variable');
}

// Supabase client configuration with proper typing
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Environment configuration interface
export interface EnvironmentConfig {
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;
  VITE_APP_ENV: 'development' | 'staging' | 'production';
}

// Environment validation utility
export const validateEnvironment = (): EnvironmentConfig => {
  const config: EnvironmentConfig = {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
    VITE_APP_ENV: import.meta.env.VITE_APP_ENV || 'development'
  };

  // Validate required environment variables
  const requiredVars = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'] as const;
  
  for (const varName of requiredVars) {
    if (!config[varName]) {
      throw new Error(`Missing required environment variable: ${varName}`);
    }
  }

  // Validate URL format
  try {
    new URL(config.VITE_SUPABASE_URL);
  } catch {
    throw new Error('VITE_SUPABASE_URL must be a valid URL');
  }

  // Validate environment
  if (!['development', 'staging', 'production'].includes(config.VITE_APP_ENV)) {
    throw new Error('VITE_APP_ENV must be one of: development, staging, production');
  }

  return config;
};

// Initialize and validate environment on module load
export const env = validateEnvironment();

// Connection health check utility
export const checkSupabaseConnection = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.from('_health_check').select('*').limit(1);
    return !error;
  } catch {
    // If health check table doesn't exist, try a simple auth check
    try {
      await supabase.auth.getSession();
      return true;
    } catch {
      return false;
    }
  }
};

// Export types for use in other modules
export type SupabaseClient = typeof supabase;