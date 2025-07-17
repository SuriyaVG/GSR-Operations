// src/lib/database.ts
// Database service layer with view integration, error handling, and retry mechanisms

import { toast } from '@/lib/toast';

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
  PERMISSION_ERROR = 'permission_error'
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

// Mock database connection (replace with actual Supabase client)
class MockDatabaseClient {
  private isConnected = true;
  private simulateError = false;

  async query<T>(sql: string, params?: any[]): Promise<T[]> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100));

    if (!this.isConnected) {
      throw new Error('Database connection lost');
    }

    if (this.simulateError) {
      throw new Error('Query execution failed');
    }

    // Mock data based on query type
    if (sql.includes('vw_batch_yield')) {
      return this.getMockBatchYield() as T[];
    } else if (sql.includes('vw_invoice_aging')) {
      return this.getMockInvoiceAging() as T[];
    } else if (sql.includes('vw_customer_metrics')) {
      return this.getMockCustomerMetrics() as T[];
    }

    return [];
  }

  private getMockBatchYield(): BatchYieldView[] {
    return [
      {
        batch_id: '1',
        batch_number: 'GR-20241220-001',
        total_input_cost: 11250.00,
        output_litres: 25.5,
        cost_per_litre: 441.18,
        yield_percentage: 85.0,
        production_date: '2024-12-20T00:00:00Z',
        status: 'approved',
        material_breakdown: [
          {
            material_name: 'Cream Butter',
            quantity_used: 25,
            cost_per_unit: 450.00,
            total_cost: 11250.00,
            lot_number: 'CB-2024-001'
          }
        ]
      }
    ];
  }

  private getMockInvoiceAging(): InvoiceAgingView[] {
    return [
      {
        invoice_id: '1',
        customer_name: 'Raj Foods & Restaurant',
        customer_id: '1',
        invoice_number: 'INV-2024-001',
        issue_date: '2024-12-20T00:00:00Z',
        due_date: '2025-01-19T00:00:00Z',
        total_amount: 5830,
        paid_amount: 0,
        outstanding_amount: 5830,
        days_overdue: 0,
        aging_bucket: 'current',
        status: 'sent',
        order_number: 'GR-2024-0001'
      }
    ];
  }

  private getMockCustomerMetrics(): CustomerMetricsView[] {
    return [
      {
        customer_id: '1',
        customer_name: 'Raj Foods & Restaurant',
        tier: 'wholesale',
        channel: 'direct',
        city: 'New Delhi',
        total_orders: 1,
        total_revenue: 5830,
        ltv: 5830,
        aov: 5830,
        last_order_date: '2024-12-20T00:00:00Z',
        first_order_date: '2024-12-20T00:00:00Z',
        avg_days_between_orders: null,
        predicted_reorder_date: null,
        activity_status: 'active'
      }
    ];
  }

  setConnectionStatus(connected: boolean) {
    this.isConnected = connected;
  }

  setErrorSimulation(simulate: boolean) {
    this.simulateError = simulate;
  }
}

// Database service class
export class DatabaseService {
  private static client = new MockDatabaseClient();
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

  // Error handling with user-friendly messages
  private static handleError(error: Error, operationName: string): DatabaseError {
    let errorType: DatabaseErrorType;
    let userMessage: string;
    let retryable = false;

    if (error.message.includes('connection') || error.message.includes('network')) {
      errorType = DatabaseErrorType.CONNECTION_ERROR;
      userMessage = 'Unable to connect to database. Please check your internet connection.';
      retryable = true;
    } else if (error.message.includes('timeout')) {
      errorType = DatabaseErrorType.TIMEOUT_ERROR;
      userMessage = 'Database operation timed out. Please try again.';
      retryable = true;
    } else if (error.message.includes('permission') || error.message.includes('unauthorized')) {
      errorType = DatabaseErrorType.PERMISSION_ERROR;
      userMessage = 'You do not have permission to perform this operation.';
      retryable = false;
    } else if (error.message.includes('validation') || error.message.includes('constraint')) {
      errorType = DatabaseErrorType.VALIDATION_ERROR;
      userMessage = 'Invalid data provided. Please check your input.';
      retryable = false;
    } else {
      errorType = DatabaseErrorType.QUERY_ERROR;
      userMessage = `Database error occurred during ${operationName}. Please try again.`;
      retryable = true;
    }

    // Show toast notification
    toast.error(userMessage);

    return new DatabaseError(errorType, userMessage, error, retryable);
  }

  // Database connection validation
  static async validateConnection(): Promise<boolean> {
    try {
      await this.executeWithRetry(
        () => this.client.query('SELECT 1'),
        'connection validation'
      );
      return true;
    } catch (error) {
      console.error('Database connection validation failed:', error);
      return false;
    }
  }

  // Batch yield view queries
  static async getBatchYield(batchId?: string): Promise<BatchYieldView[]> {
    return this.executeWithRetry(async () => {
      const sql = batchId 
        ? 'SELECT * FROM vw_batch_yield WHERE batch_id = $1'
        : 'SELECT * FROM vw_batch_yield ORDER BY production_date DESC';
      
      const params = batchId ? [batchId] : [];
      return this.client.query<BatchYieldView>(sql, params);
    }, 'batch yield query');
  }

  static async getBatchYieldByDateRange(
    startDate: string, 
    endDate: string
  ): Promise<BatchYieldView[]> {
    return this.executeWithRetry(async () => {
      const sql = `
        SELECT * FROM vw_batch_yield 
        WHERE production_date BETWEEN $1 AND $2 
        ORDER BY production_date DESC
      `;
      return this.client.query<BatchYieldView>(sql, [startDate, endDate]);
    }, 'batch yield date range query');
  }

  // Invoice aging view queries
  static async getInvoiceAging(customerId?: string): Promise<InvoiceAgingView[]> {
    return this.executeWithRetry(async () => {
      const sql = customerId
        ? 'SELECT * FROM vw_invoice_aging WHERE customer_id = $1 ORDER BY days_overdue DESC'
        : 'SELECT * FROM vw_invoice_aging ORDER BY days_overdue DESC';
      
      const params = customerId ? [customerId] : [];
      return this.client.query<InvoiceAgingView>(sql, params);
    }, 'invoice aging query');
  }

  static async getInvoiceAgingByBucket(
    agingBucket: 'current' | '0-30' | '31-60' | '61-90' | '90+'
  ): Promise<InvoiceAgingView[]> {
    return this.executeWithRetry(async () => {
      const sql = 'SELECT * FROM vw_invoice_aging WHERE aging_bucket = $1 ORDER BY outstanding_amount DESC';
      return this.client.query<InvoiceAgingView>(sql, [agingBucket]);
    }, 'invoice aging bucket query');
  }

  static async getInvoiceAgingSummary(): Promise<{
    totalOutstanding: number;
    overdueCount: number;
    agingBreakdown: Record<string, number>;
  }> {
    return this.executeWithRetry(async () => {
      const data = await this.client.query<InvoiceAgingView>('SELECT * FROM vw_invoice_aging');
      
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
      const sql = customerId
        ? 'SELECT * FROM vw_customer_metrics WHERE customer_id = $1'
        : 'SELECT * FROM vw_customer_metrics ORDER BY ltv DESC';
      
      const params = customerId ? [customerId] : [];
      return this.client.query<CustomerMetricsView>(sql, params);
    }, 'customer metrics query');
  }

  static async getCustomerMetricsByActivity(
    activityStatus: 'active' | 'at_risk' | 'inactive'
  ): Promise<CustomerMetricsView[]> {
    return this.executeWithRetry(async () => {
      const sql = 'SELECT * FROM vw_customer_metrics WHERE activity_status = $1 ORDER BY last_order_date DESC';
      return this.client.query<CustomerMetricsView>(sql, [activityStatus]);
    }, 'customer metrics activity query');
  }

  static async getReorderPredictions(): Promise<CustomerMetricsView[]> {
    return this.executeWithRetry(async () => {
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
  static setConnectionStatus(connected: boolean) {
    this.client.setConnectionStatus(connected);
  }

  static setErrorSimulation(simulate: boolean) {
    this.client.setErrorSimulation(simulate);
  }
}