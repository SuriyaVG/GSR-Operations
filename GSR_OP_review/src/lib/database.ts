// src/lib/database.ts
// Database service layer with view integration, error handling, and retry mechanisms

import { toast } from '@/lib/toast';
import { supabase } from '@/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { realtimeManager, type SubscriptionCallback } from '@/lib/realtime';

// Database view interfaces
export interface BatchYieldView {
  batch_id: string;
  batch_number: string;
  total_input_cost: number;
  output_litres: number;
  cost_per_litre: number;
  yield_percentage: number;
  production_date: string;
  status: string;
  material_breakdown: Array<{
    material_name: string;
    quantity_used: number;
    cost_per_unit: number;
    total_cost: number;
    lot_number: string;
  }>;
}

export interface InvoiceAgingView {
  invoice_id: string;
  customer_name: string;
  customer_id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  total_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  days_overdue: number;
  aging_bucket: 'current' | '0-30' | '31-60' | '61-90' | '90+';
  status: string;
  order_number: string;
}

export interface CustomerMetricsView {
  customer_id: string;
  customer_name: string;
  tier: string;
  channel: string;
  city: string;
  total_orders: number;
  total_revenue: number;
  ltv: number;
  aov: number;
  last_order_date: string | null;
  first_order_date: string | null;
  avg_days_between_orders: number | null;
  predicted_reorder_date: string | null;
  activity_status: 'active' | 'at_risk' | 'inactive';
}

// Error types
export enum DatabaseErrorType {
  CONNECTION_ERROR = 'connection_error',
  QUERY_ERROR = 'query_error',
  TIMEOUT_ERROR = 'timeout_error',
  VALIDATION_ERROR = 'validation_error',
  PERMISSION_ERROR = 'permission_error',
  AUTHENTICATION_ERROR = 'authentication_error',
  RATE_LIMIT_ERROR = 'rate_limit_error',
  CONSTRAINT_ERROR = 'constraint_error',
  RLS_ERROR = 'rls_error',
  SUPABASE_ERROR = 'supabase_error'
}

export class DatabaseError extends Error {
  constructor(
    public type: DatabaseErrorType,
    message: string,
    public originalError?: Error,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

// Database configuration
interface DatabaseConfig {
  maxRetries: number;
  retryDelay: number;
  timeout: number;
}

const DEFAULT_CONFIG: DatabaseConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  timeout: 10000
};

// Supabase database client wrapper
class SupabaseDatabaseClient {
  private client: SupabaseClient<Database>;

  constructor() {
    this.client = supabase;
  }

  async query<T>(sql: string, params?: any[]): Promise<T[]> {
    // Use Supabase RPC for custom SQL queries
    const { data, error } = await this.client.rpc('execute_sql', {
      query: sql,
      params: params || []
    });

    if (error) {
      throw new Error(`Query execution failed: ${error.message}`);
    }

    return data as T[];
  }

  // Direct table access methods for better performance
  async selectFromView<T>(viewName: string, filters?: Record<string, any>, orderBy?: string): Promise<T[]> {
    let query = this.client.from(viewName).select('*');

    // Apply filters
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });
    }

    // Apply ordering
    if (orderBy) {
      const [column, direction] = orderBy.split(' ');
      query = query.order(column, { ascending: direction !== 'DESC' });
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`View query failed: ${error.message}`);
    }

    return (data as T[]) || [];
  }

  // Range query for date-based filtering
  async selectFromViewWithDateRange<T>(
    viewName: string, 
    dateColumn: string,
    startDate: string, 
    endDate: string,
    orderBy?: string
  ): Promise<T[]> {
    let query = this.client
      .from(viewName)
      .select('*')
      .gte(dateColumn, startDate)
      .lte(dateColumn, endDate);

    if (orderBy) {
      const [column, direction] = orderBy.split(' ');
      query = query.order(column, { ascending: direction !== 'DESC' });
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Date range query failed: ${error.message}`);
    }

    return (data as T[]) || [];
  }

  // Connection validation
  async validateConnection(): Promise<boolean> {
    try {
      const { error } = await this.client.from('user_profiles').select('id').limit(1);
      return !error;
    } catch {
      return false;
    }
  }
}

// Database service class
export class DatabaseService {
  private static client = new SupabaseDatabaseClient();
  private static config = DEFAULT_CONFIG;

  // Utility method to execute operations with retry logic
  private static async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        // Add timeout to the operation
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Operation timeout')), this.config.timeout);
        });

        const result = await Promise.race([operation(), timeoutPromise]);
        return result;
      } catch (error) {
        lastError = error as Error;
        
        const dbError = this.handleError(error as Error, operationName);
        
        // If it's the last attempt or error is not retryable, throw
        if (attempt === this.config.maxRetries || !dbError.retryable) {
          throw dbError;
        }

        // Wait before retrying with exponential backoff
        const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        console.warn(`Retrying ${operationName} (attempt ${attempt + 1}/${this.config.maxRetries})`);
      }
    }

    throw this.handleError(lastError!, operationName);
  }

  // Enhanced error handling for Supabase-specific errors
  private static handleError(error: Error, operationName: string): DatabaseError {
    let errorType: DatabaseErrorType;
    let userMessage: string;
    let retryable = false;

    // Check if it's a Supabase error with additional context
    const errorMessage = error.message.toLowerCase();
    const errorDetails = (error as any).details || '';
    const errorCode = (error as any).code || '';
    const errorHint = (error as any).hint || '';

    // Supabase-specific error handling
    if (errorCode === 'PGRST301' || errorMessage.includes('jwt')) {
      errorType = DatabaseErrorType.AUTHENTICATION_ERROR;
      userMessage = 'Authentication expired. Please log in again.';
      retryable = false;
    } else if (errorCode === 'PGRST116' || errorMessage.includes('rls') || errorMessage.includes('row level security')) {
      errorType = DatabaseErrorType.RLS_ERROR;
      userMessage = 'Access denied. You do not have permission to access this data.';
      retryable = false;
    } else if (errorCode === '23505' || errorMessage.includes('duplicate key') || errorMessage.includes('unique constraint')) {
      errorType = DatabaseErrorType.CONSTRAINT_ERROR;
      userMessage = 'This record already exists. Please check your data and try again.';
      retryable = false;
    } else if (errorCode === '23503' || errorMessage.includes('foreign key constraint')) {
      errorType = DatabaseErrorType.CONSTRAINT_ERROR;
      userMessage = 'Cannot complete operation due to related data constraints.';
      retryable = false;
    } else if (errorCode === '23502' || errorMessage.includes('not null constraint')) {
      errorType = DatabaseErrorType.VALIDATION_ERROR;
      userMessage = 'Required fields are missing. Please fill in all required information.';
      retryable = false;
    } else if (errorCode === '42501' || errorMessage.includes('insufficient privilege')) {
      errorType = DatabaseErrorType.PERMISSION_ERROR;
      userMessage = 'You do not have permission to perform this operation.';
      retryable = false;
    } else if (errorMessage.includes('rate limit') || errorCode === '429') {
      errorType = DatabaseErrorType.RATE_LIMIT_ERROR;
      userMessage = 'Too many requests. Please wait a moment and try again.';
      retryable = true;
    } else if (errorMessage.includes('connection') || errorMessage.includes('network') || errorMessage.includes('fetch')) {
      errorType = DatabaseErrorType.CONNECTION_ERROR;
      userMessage = 'Unable to connect to database. Please check your internet connection.';
      retryable = true;
    } else if (errorMessage.includes('timeout') || errorCode === 'ETIMEDOUT') {
      errorType = DatabaseErrorType.TIMEOUT_ERROR;
      userMessage = 'Database operation timed out. Please try again.';
      retryable = true;
    } else if (errorMessage.includes('permission') || errorMessage.includes('unauthorized')) {
      errorType = DatabaseErrorType.PERMISSION_ERROR;
      userMessage = 'You do not have permission to perform this operation.';
      retryable = false;
    } else if (errorMessage.includes('validation') || errorMessage.includes('constraint')) {
      errorType = DatabaseErrorType.VALIDATION_ERROR;
      userMessage = 'Invalid data provided. Please check your input.';
      retryable = false;
    } else if (errorMessage.includes('supabase') || errorCode.startsWith('PGRST')) {
      errorType = DatabaseErrorType.SUPABASE_ERROR;
      userMessage = `Database service error during ${operationName}. Please try again.`;
      retryable = true;
    } else {
      errorType = DatabaseErrorType.QUERY_ERROR;
      userMessage = `Database error occurred during ${operationName}. Please try again.`;
      retryable = true;
    }

    // Log detailed error information for debugging
    console.error(`Database Error [${errorType}]:`, {
      operation: operationName,
      message: error.message,
      code: errorCode,
      details: errorDetails,
      hint: errorHint,
      retryable
    });

    // Show user-friendly toast notification
    toast.error(userMessage);

    return new DatabaseError(errorType, userMessage, error, retryable);
  }

  // Database connection validation
  static async validateConnection(): Promise<boolean> {
    try {
      return await this.executeWithRetry(
        () => this.client.validateConnection(),
        'connection validation'
      );
    } catch (error) {
      console.error('Database connection validation failed:', error);
      return false;
    }
  }

  // Batch yield view queries
  static async getBatchYield(batchId?: string): Promise<BatchYieldView[]> {
    return this.executeWithRetry(async () => {
      const filters = batchId ? { batch_id: batchId } : undefined;
      return this.client.selectFromView<BatchYieldView>('vw_batch_yield', filters, 'production_date DESC');
    }, 'batch yield query');
  }

  static async getBatchYieldByDateRange(
    startDate: string, 
    endDate: string
  ): Promise<BatchYieldView[]> {
    return this.executeWithRetry(async () => {
      return this.client.selectFromViewWithDateRange<BatchYieldView>(
        'vw_batch_yield', 
        'production_date',
        startDate, 
        endDate, 
        'production_date DESC'
      );
    }, 'batch yield date range query');
  }

  // Invoice aging view queries
  static async getInvoiceAging(customerId?: string): Promise<InvoiceAgingView[]> {
    return this.executeWithRetry(async () => {
      const filters = customerId ? { customer_id: customerId } : undefined;
      return this.client.selectFromView<InvoiceAgingView>('vw_invoice_aging', filters, 'days_overdue DESC');
    }, 'invoice aging query');
  }

  static async getInvoiceAgingByBucket(
    agingBucket: 'current' | '0-30' | '31-60' | '61-90' | '90+'
  ): Promise<InvoiceAgingView[]> {
    return this.executeWithRetry(async () => {
      const filters = { aging_bucket: agingBucket };
      return this.client.selectFromView<InvoiceAgingView>('vw_invoice_aging', filters, 'outstanding_amount DESC');
    }, 'invoice aging bucket query');
  }

  static async getInvoiceAgingSummary(): Promise<{
    totalOutstanding: number;
    overdueCount: number;
    agingBreakdown: Record<string, number>;
  }> {
    return this.executeWithRetry(async () => {
      const data = await this.client.selectFromView<InvoiceAgingView>('vw_invoice_aging');
      
      const summary = {
        totalOutstanding: data.reduce((sum, invoice) => sum + invoice.outstanding_amount, 0),
        overdueCount: data.filter(invoice => invoice.days_overdue > 0).length,
        agingBreakdown: data.reduce((breakdown, invoice) => {
          breakdown[invoice.aging_bucket] = (breakdown[invoice.aging_bucket] || 0) + invoice.outstanding_amount;
          return breakdown;
        }, {} as Record<string, number>)
      };

      return summary;
    }, 'invoice aging summary query');
  }

  // Customer metrics view queries
  static async getCustomerMetrics(customerId?: string): Promise<CustomerMetricsView[]> {
    return this.executeWithRetry(async () => {
      const filters = customerId ? { customer_id: customerId } : undefined;
      return this.client.selectFromView<CustomerMetricsView>('vw_customer_metrics', filters, 'ltv DESC');
    }, 'customer metrics query');
  }

  static async getCustomerMetricsByActivity(
    activityStatus: 'active' | 'at_risk' | 'inactive'
  ): Promise<CustomerMetricsView[]> {
    return this.executeWithRetry(async () => {
      const filters = { activity_status: activityStatus };
      return this.client.selectFromView<CustomerMetricsView>('vw_customer_metrics', filters, 'last_order_date DESC');
    }, 'customer metrics activity query');
  }

  static async getReorderPredictions(): Promise<CustomerMetricsView[]> {
    return this.executeWithRetry(async () => {
      // For complex queries like this, we'll still use the RPC method
      const sql = `
        SELECT * FROM vw_customer_metrics 
        WHERE predicted_reorder_date IS NOT NULL 
        AND predicted_reorder_date <= NOW() + INTERVAL '7 days'
        ORDER BY predicted_reorder_date ASC
      `;
      return this.client.query<CustomerMetricsView>(sql);
    }, 'reorder predictions query');
  }

  // Configuration methods
  static setConfig(config: Partial<DatabaseConfig>) {
    this.config = { ...this.config, ...config };
  }

  static getConfig(): DatabaseConfig {
    return { ...this.config };
  }

  // Testing utilities (for development/testing)
  // Note: These methods are no longer applicable with Supabase client
  // Connection status and error simulation should be handled at the Supabase level
  static setConnectionStatus(connected: boolean) {
    console.warn('setConnectionStatus is deprecated with Supabase client');
  }

  static setErrorSimulation(simulate: boolean) {
    console.warn('setErrorSimulation is deprecated with Supabase client');
  }

  // Real-time subscription methods
  static subscribeToOrderChanges(callback: SubscriptionCallback): string {
    return realtimeManager.subscribe({
      table: 'orders',
      events: ['INSERT', 'UPDATE'],
      callback: (payload) => {
        console.log('Order change detected:', payload);
        callback(payload);
      }
    });
  }

  static subscribeToProductionBatchChanges(callback: SubscriptionCallback): string {
    return realtimeManager.subscribe({
      table: 'production_batches',
      events: ['INSERT', 'UPDATE'],
      callback: (payload) => {
        console.log('Production batch change detected:', payload);
        callback(payload);
      }
    });
  }

  static subscribeToInvoiceChanges(callback: SubscriptionCallback): string {
    return realtimeManager.subscribe({
      table: 'invoices',
      events: ['INSERT', 'UPDATE', 'DELETE'],
      callback: (payload) => {
        console.log('Invoice change detected:', payload);
        callback(payload);
      }
    });
  }

  static subscribeToCustomerChanges(callback: SubscriptionCallback): string {
    return realtimeManager.subscribe({
      table: 'customers',
      events: ['INSERT', 'UPDATE'],
      callback: (payload) => {
        console.log('Customer change detected:', payload);
        callback(payload);
      }
    });
  }

  static subscribeToMaterialChanges(callback: SubscriptionCallback): string {
    return realtimeManager.subscribe({
      table: 'materials',
      events: ['INSERT', 'UPDATE'],
      callback: (payload) => {
        console.log('Material change detected:', payload);
        callback(payload);
      }
    });
  }

  // Unsubscribe from real-time updates
  static unsubscribe(subscriptionId: string): boolean {
    return realtimeManager.unsubscribe(subscriptionId);
  }

  // Unsubscribe from all real-time updates
  static unsubscribeAll(): void {
    realtimeManager.unsubscribeAll();
  }

  // Get real-time connection state
  static getRealtimeConnectionState() {
    return realtimeManager.getConnectionState();
  }

  // Check if real-time is connected
  static isRealtimeConnected(): boolean {
    return realtimeManager.isConnected();
  }
}