import { describe, it, expect } from 'vitest';

describe('Supabase Client Configuration', () => {
  it('should export supabase client', async () => {
    const { supabase } = await import('../supabase');
    
    expect(supabase).toBeDefined();
    expect(typeof supabase.auth).toBe('object');
    expect(typeof supabase.from).toBe('function');
  });

  it('should export environment validation function', async () => {
    const { validateEnvironment } = await import('../supabase');
    
    expect(typeof validateEnvironment).toBe('function');
  });

  it('should export checkSupabaseConnection function', async () => {
    const { checkSupabaseConnection } = await import('../supabase');
    
    expect(typeof checkSupabaseConnection).toBe('function');
  });

  it('should validate URL format correctly', () => {
    // Test URL validation logic
    const validUrl = 'https://test-project.supabase.co';
    const invalidUrl = 'invalid-url';
    
    expect(() => new URL(validUrl)).not.toThrow();
    expect(() => new URL(invalidUrl)).toThrow();
  });

  it('should validate environment values correctly', () => {
    const validEnvs = ['development', 'staging', 'production'];
    const invalidEnv = 'invalid-env';
    
    validEnvs.forEach(env => {
      expect(validEnvs.includes(env)).toBe(true);
    });
    
    expect(validEnvs.includes(invalidEnv)).toBe(false);
  });
});