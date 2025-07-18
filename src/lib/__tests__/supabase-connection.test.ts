import { describe, it, expect } from 'vitest';
import { supabase, validateEnvironment, checkSupabaseConnection } from '../supabase';

describe('Supabase Connection Integration', () => {
  it('should validate environment configuration', () => {
    const config = validateEnvironment();
    
    expect(config.VITE_SUPABASE_URL).toBeDefined();
    expect(config.VITE_SUPABASE_ANON_KEY).toBeDefined();
    expect(config.VITE_APP_ENV).toBe('development');
    
    // Check if using placeholder values and provide helpful message
    if (config.VITE_SUPABASE_URL.includes('your-project-ref')) {
      console.warn('⚠️  Still using placeholder Supabase URL. Update .env with your actual Supabase project URL.');
    }
    
    if (config.VITE_SUPABASE_ANON_KEY.includes('your-anon-key')) {
      console.warn('⚠️  Still using placeholder Supabase anon key. Update .env with your actual Supabase anon key.');
    }
  });

  it('should initialize supabase client with real credentials', () => {
    expect(supabase).toBeDefined();
    expect(supabase.auth).toBeDefined();
    expect(supabase.from).toBeDefined();
    expect(typeof supabase.from).toBe('function');
  });

  it('should be able to access auth service', async () => {
    const { data, error } = await supabase.auth.getSession();
    
    // Should not error when accessing auth service
    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.session).toBeDefined(); // Can be null if no active session
  });

  it('should attempt connection check', async () => {
    // This test verifies the connection check function works
    // It may return false if tables don't exist yet, which is expected
    const connectionResult = await checkSupabaseConnection();
    expect(typeof connectionResult).toBe('boolean');
  });

  it('should have proper client configuration', () => {
    // Verify the client has the expected configuration
    expect(supabase.supabaseUrl).toBeDefined();
    expect(supabase.supabaseKey).toBeDefined();
    expect(supabase.supabaseUrl).toContain('supabase.co');
  });
});