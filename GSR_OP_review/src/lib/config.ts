import { env, checkSupabaseConnection } from './supabase';

// Configuration status interface
export interface ConfigStatus {
  isValid: boolean;
  environment: string;
  supabaseUrl: string;
  connectionStatus: 'connected' | 'disconnected' | 'checking';
  errors: string[];
  warnings: string[];
}

// Get current configuration status
export const getConfigStatus = async (): Promise<ConfigStatus> => {
  const status: ConfigStatus = {
    isValid: true,
    environment: env.VITE_APP_ENV,
    supabaseUrl: env.VITE_SUPABASE_URL,
    connectionStatus: 'checking',
    errors: [],
    warnings: []
  };

  // Check environment configuration
  if (env.VITE_APP_ENV === 'development') {
    if (env.VITE_SUPABASE_URL.includes('your-project-ref')) {
      status.errors.push('Supabase URL is still using placeholder value');
      status.isValid = false;
    }
    
    if (env.VITE_SUPABASE_ANON_KEY.includes('your-anon-key')) {
      status.errors.push('Supabase anon key is still using placeholder value');
      status.isValid = false;
    }
  }

  // Check Supabase connection
  try {
    const isConnected = await checkSupabaseConnection();
    status.connectionStatus = isConnected ? 'connected' : 'disconnected';
    
    if (!isConnected) {
      status.warnings.push('Unable to connect to Supabase - check your configuration');
    }
  } catch (error) {
    status.connectionStatus = 'disconnected';
    status.errors.push(`Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    status.isValid = false;
  }

  return status;
};

// Log configuration status to console (useful for development)
export const logConfigStatus = async (): Promise<void> => {
  const status = await getConfigStatus();
  
  console.group('🔧 GSR Operations Configuration Status');
  console.log(`Environment: ${status.environment}`);
  console.log(`Supabase URL: ${status.supabaseUrl}`);
  console.log(`Connection: ${status.connectionStatus}`);
  
  if (status.errors.length > 0) {
    console.group('❌ Errors');
    status.errors.forEach(error => console.error(error));
    console.groupEnd();
  }
  
  if (status.warnings.length > 0) {
    console.group('⚠️ Warnings');
    status.warnings.forEach(warning => console.warn(warning));
    console.groupEnd();
  }
  
  if (status.isValid && status.connectionStatus === 'connected') {
    console.log('✅ Configuration is valid and connected');
  }
  
  console.groupEnd();
};

// Development helper to validate configuration on app start
export const validateConfigOnStart = async (): Promise<boolean> => {
  if (env.VITE_APP_ENV === 'development') {
    await logConfigStatus();
  }
  
  const status = await getConfigStatus();
  return status.isValid;
};