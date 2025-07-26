// src/lib/services/dataIntegrityService.ts
// Service for monitoring and validating data integrity

import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { User } from '@/Entities/User';

// Alert configuration for different issue types
export interface AlertConfig {
  enabled: boolean;
  threshold: number; // Number of issues before alerting
  severity: 'low' | 'medium' | 'high' | 'critical';
  notificationMethods: ('toast' | 'email' | 'system')[];
}

export interface DataIntegrityAlert {
  id: string;
  issueType: string;
  count: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  triggeredAt: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
}

export interface DataIntegrityIssue {
  id: string;
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  entityType: string;
  entityId: string;
  detectedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolution?: string;
}

export interface DataIntegrityCheckResult {
  success: boolean;
  issues: DataIntegrityIssue[];
  checkTime: string;
}

export class DataIntegrityService {
  // Default alert configurations
  private static alertConfigs: Record<string, AlertConfig> = {
    orphaned_order: {
      enabled: true,
      threshold: 1,
      severity: 'high',
      notificationMethods: ['toast', 'system']
    },
    orphaned_invoice: {
      enabled: true,
      threshold: 1,
      severity: 'critical',
      notificationMethods: ['toast', 'system']
    },
    negative_inventory: {
      enabled: true,
      threshold: 1,
      severity: 'critical',
      notificationMethods: ['toast', 'system']
    },
    orphaned_production_batch: {
      enabled: true,
      threshold: 3,
      severity: 'medium',
      notificationMethods: ['toast']
    },
    orphaned_ledger_entry: {
      enabled: true,
      threshold: 1,
      severity: 'high',
      notificationMethods: ['toast', 'system']
    },
    invoice_without_ledger: {
      enabled: true,
      threshold: 1,
      severity: 'medium',
      notificationMethods: ['toast']
    }
  };
  /**
   * Check for orphaned orders (orders without invoices)
   */
  static async checkOrphanedOrders(): Promise<DataIntegrityIssue[]> {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, created_at')
        .not('id', 'in', (
          supabase.from('invoices').select('order_id')
        ));

      if (error) {
        console.error('Error checking for orphaned orders:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        return [];
      }

      return data.map(order => ({
        id: `orphaned-order-${order.id}`,
        type: 'orphaned_order',
        description: `Order ${order.order_number} has no associated invoice`,
        severity: 'high',
        entityType: 'order',
        entityId: order.id,
        detectedAt: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Error in checkOrphanedOrders:', error);
      throw error;
    }
  }

  /**
   * Check for orphaned invoices (invoices without orders)
   */
  static async checkOrphanedInvoices(): Promise<DataIntegrityIssue[]> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('id, invoice_number, created_at, order_id')
        .not('order_id', 'in', (
          supabase.from('orders').select('id')
        ));

      if (error) {
        console.error('Error checking for orphaned invoices:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        return [];
      }

      return data.map(invoice => ({
        id: `orphaned-invoice-${invoice.id}`,
        type: 'orphaned_invoice',
        description: `Invoice ${invoice.invoice_number} references non-existent order ${invoice.order_id}`,
        severity: 'critical',
        entityType: 'invoice',
        entityId: invoice.id,
        detectedAt: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Error in checkOrphanedInvoices:', error);
      throw error;
    }
  }

  /**
   * Check for orphaned production batches (batches without inputs)
   */
  static async checkOrphanedProductionBatches(): Promise<DataIntegrityIssue[]> {
    try {
      const { data, error } = await supabase
        .from('production_batches')
        .select('id, batch_number, created_at')
        .not('id', 'in', (
          supabase.from('batch_inputs').select('batch_id')
        ));

      if (error) {
        console.error('Error checking for orphaned production batches:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        return [];
      }

      return data.map(batch => ({
        id: `orphaned-batch-${batch.id}`,
        type: 'orphaned_production_batch',
        description: `Production batch ${batch.batch_number} has no inputs`,
        severity: 'medium',
        entityType: 'production_batch',
        entityId: batch.id,
        detectedAt: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Error in checkOrphanedProductionBatches:', error);
      throw error;
    }
  }

  /**
   * Check for inventory inconsistencies (negative quantities)
   */
  static async checkInventoryConsistency(): Promise<DataIntegrityIssue[]> {
    try {
      const issues: DataIntegrityIssue[] = [];

      // Check for negative quantities
      const { data: negativeInventory, error: negativeError } = await supabase
        .from('material_intake_log')
        .select('id, raw_material_id, lot_number, remaining_quantity, raw_materials(name)')
        .lt('remaining_quantity', 0);

      if (negativeError) {
        console.error('Error checking for negative inventory:', negativeError);
        throw negativeError;
      }

      if (negativeInventory && negativeInventory.length > 0) {
        negativeInventory.forEach(item => {
          issues.push({
            id: `negative-inventory-${item.id}`,
            type: 'negative_inventory',
            description: `Material ${item.raw_materials?.name || item.raw_material_id} lot ${item.lot_number} has negative quantity: ${item.remaining_quantity}`,
            severity: 'critical',
            entityType: 'material_intake_log',
            entityId: item.id,
            detectedAt: new Date().toISOString()
          });
        });
      }

      // Check for inventory discrepancies (calculated vs recorded)
      const { data: discrepancies, error: discrepancyError } = await supabase.rpc('check_inventory_discrepancies');

      if (discrepancyError) {
        console.error('Error checking for inventory discrepancies:', discrepancyError);
        // Don't throw, just log - this is a non-critical check
      } else if (discrepancies && discrepancies.length > 0) {
        discrepancies.forEach((discrepancy: any) => {
          issues.push({
            id: `inventory-discrepancy-${discrepancy.material_id}`,
            type: 'inventory_discrepancy',
            description: `Material ${discrepancy.material_name} has discrepancy: recorded ${discrepancy.recorded_quantity}, calculated ${discrepancy.calculated_quantity}`,
            severity: 'medium',
            entityType: 'material_intake_log',
            entityId: discrepancy.material_id,
            detectedAt: new Date().toISOString()
          });
        });
      }

      // Check for low stock levels that might indicate data issues
      const { data: lowStock, error: lowStockError } = await supabase
        .from('material_intake_log')
        .select('id, raw_material_id, lot_number, remaining_quantity, raw_materials(name, minimum_stock_level)')
        .gt('remaining_quantity', 0)
        .lt('remaining_quantity', 10); // Very low threshold

      if (lowStockError) {
        console.error('Error checking for low stock:', lowStockError);
        // Don't throw, just log
      } else if (lowStock && lowStock.length > 0) {
        lowStock.forEach(item => {
          if (item.remaining_quantity < (item.raw_materials?.minimum_stock_level || 5)) {
            issues.push({
              id: `critically-low-stock-${item.id}`,
              type: 'critically_low_stock',
              description: `Material ${item.raw_materials?.name || item.raw_material_id} lot ${item.lot_number} is critically low: ${item.remaining_quantity} remaining`,
              severity: 'medium',
              entityType: 'material_intake_log',
              entityId: item.id,
              detectedAt: new Date().toISOString()
            });
          }
        });
      }

      return issues;
    } catch (error) {
      console.error('Error in checkInventoryConsistency:', error);
      throw error;
    }
  }

  /**
   * Check for financial ledger inconsistencies
   */
  static async checkFinancialLedgerConsistency(): Promise<DataIntegrityIssue[]> {
    try {
      const issues: DataIntegrityIssue[] = [];

      // Check for orphaned ledger entries (referencing non-existent invoices)
      const { data: orphanedEntries, error } = await supabase
        .from('financial_ledger')
        .select('id, reference_id, reference_type, amount, created_at')
        .eq('reference_type', 'invoice')
        .not('reference_id', 'in', (
          supabase.from('invoices').select('id')
        ));

      if (error) {
        console.error('Error checking for orphaned ledger entries:', error);
        throw error;
      }

      if (orphanedEntries && orphanedEntries.length > 0) {
        orphanedEntries.forEach(entry => {
          issues.push({
            id: `orphaned-ledger-${entry.id}`,
            type: 'orphaned_ledger_entry',
            description: `Financial ledger entry ${entry.id} references non-existent invoice ${entry.reference_id}`,
            severity: 'high',
            entityType: 'financial_ledger',
            entityId: entry.id,
            detectedAt: new Date().toISOString()
          });
        });
      }

      // Check for invoices without ledger entries
      const { data: invoicesWithoutLedger, error: invoiceError } = await supabase
        .from('invoices')
        .select('id, invoice_number')
        .not('id', 'in', (
          supabase.from('financial_ledger')
            .select('reference_id')
            .eq('reference_type', 'invoice')
        ));

      if (invoiceError) {
        console.error('Error checking for invoices without ledger entries:', invoiceError);
        throw invoiceError;
      }

      if (invoicesWithoutLedger && invoicesWithoutLedger.length > 0) {
        invoicesWithoutLedger.forEach(invoice => {
          issues.push({
            id: `invoice-no-ledger-${invoice.id}`,
            type: 'invoice_without_ledger',
            description: `Invoice ${invoice.invoice_number} has no financial ledger entry`,
            severity: 'medium',
            entityType: 'invoice',
            entityId: invoice.id,
            detectedAt: new Date().toISOString()
          });
        });
      }

      return issues;
    } catch (error) {
      console.error('Error in checkFinancialLedgerConsistency:', error);
      throw error;
    }
  }

  /**
   * Run all data integrity checks
   */
  static async runAllChecks(): Promise<DataIntegrityCheckResult> {
    try {
      const checkTime = new Date().toISOString();
      const issues: DataIntegrityIssue[] = [];

      // Run all checks
      const orphanedOrderIssues = await this.checkOrphanedOrders();
      const orphanedInvoiceIssues = await this.checkOrphanedInvoices();
      const orphanedBatchIssues = await this.checkOrphanedProductionBatches();
      const inventoryIssues = await this.checkInventoryConsistency();
      const financialIssues = await this.checkFinancialLedgerConsistency();

      // Combine all issues
      issues.push(...orphanedOrderIssues);
      issues.push(...orphanedInvoiceIssues);
      issues.push(...orphanedBatchIssues);
      issues.push(...inventoryIssues);
      issues.push(...financialIssues);

      // Log issues to data_integrity_issues table
      if (issues.length > 0) {
        await this.logIssues(issues);
      }

      return {
        success: true,
        issues,
        checkTime
      };
    } catch (error) {
      console.error('Error running data integrity checks:', error);
      return {
        success: false,
        issues: [],
        checkTime: new Date().toISOString()
      };
    }
  }

  /**
   * Log issues to data_integrity_issues table
   */
  private static async logIssues(issues: DataIntegrityIssue[]): Promise<void> {
    try {
      // Insert issues into data_integrity_issues table
      const { error } = await supabase
        .from('data_integrity_issues')
        .insert(issues.map(issue => ({
          issue_type: issue.type,
          description: issue.description,
          severity: issue.severity,
          entity_type: issue.entityType,
          entity_id: issue.entityId,
          detected_at: issue.detectedAt,
          resolved_at: issue.resolvedAt,
          resolved_by: issue.resolvedBy,
          resolution: issue.resolution
        })));

      if (error) {
        console.error('Error logging data integrity issues:', error);
      }
    } catch (error) {
      console.error('Error in logIssues:', error);
    }
  }

  /**
   * Mark an issue as resolved
   */
  static async resolveIssue(issueId: string, resolution: string): Promise<boolean> {
    try {
      const currentUser = await User.me();

      const { error } = await supabase
        .from('data_integrity_issues')
        .update({
          resolved_at: new Date().toISOString(),
          resolved_by: currentUser.id,
          resolution
        })
        .eq('id', issueId);

      if (error) {
        console.error('Error resolving data integrity issue:', error);
        toast.error(`Failed to resolve issue: ${error.message}`);
        return false;
      }

      toast.success('Issue marked as resolved');
      return true;
    } catch (error) {
      console.error('Error in resolveIssue:', error);
      toast.error('Failed to resolve issue');
      return false;
    }
  }

  /**
   * Get all unresolved issues
   */
  static async getUnresolvedIssues(): Promise<DataIntegrityIssue[]> {
    try {
      const { data, error } = await supabase
        .from('data_integrity_issues')
        .select('*')
        .is('resolved_at', null)
        .order('detected_at', { ascending: false });

      if (error) {
        console.error('Error getting unresolved issues:', error);
        throw error;
      }

      return data.map(issue => ({
        id: issue.id,
        type: issue.issue_type,
        description: issue.description,
        severity: issue.severity,
        entityType: issue.entity_type,
        entityId: issue.entity_id,
        detectedAt: issue.detected_at,
        resolvedAt: issue.resolved_at,
        resolvedBy: issue.resolved_by,
        resolution: issue.resolution
      }));
    } catch (error) {
      console.error('Error in getUnresolvedIssues:', error);
      return [];
    }
  }

  /**
   * Get issue history (resolved issues)
   */
  static async getIssueHistory(limit: number = 50): Promise<DataIntegrityIssue[]> {
    try {
      const { data, error } = await supabase
        .from('data_integrity_issues')
        .select('*')
        .not('resolved_at', 'is', null)
        .order('resolved_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error getting issue history:', error);
        throw error;
      }

      return data.map(issue => ({
        id: issue.id,
        type: issue.issue_type,
        description: issue.description,
        severity: issue.severity,
        entityType: issue.entity_type,
        entityId: issue.entity_id,
        detectedAt: issue.detected_at,
        resolvedAt: issue.resolved_at,
        resolvedBy: issue.resolved_by,
        resolution: issue.resolution
      }));
    } catch (error) {
      console.error('Error in getIssueHistory:', error);
      return [];
    }
  }

  /**
   * Process alerts for detected issues
   */
  private static async processAlerts(issues: DataIntegrityIssue[]): Promise<void> {
    try {
      // Group issues by type
      const issuesByType = issues.reduce((acc, issue) => {
        if (!acc[issue.type]) {
          acc[issue.type] = [];
        }
        acc[issue.type].push(issue);
        return acc;
      }, {} as Record<string, DataIntegrityIssue[]>);

      // Process alerts for each issue type
      for (const [issueType, typeIssues] of Object.entries(issuesByType)) {
        const config = this.alertConfigs[issueType];
        if (!config || !config.enabled) continue;

        if (typeIssues.length >= config.threshold) {
          await this.triggerAlert(issueType, typeIssues, config);
        }
      }
    } catch (error) {
      console.error('Error processing alerts:', error);
    }
  }

  /**
   * Trigger alert for specific issue type
   */
  private static async triggerAlert(
    issueType: string,
    issues: DataIntegrityIssue[],
    config: AlertConfig
  ): Promise<void> {
    try {
      const alertMessage = this.generateAlertMessage(issueType, issues);

      // Create alert record
      const alert: DataIntegrityAlert = {
        id: `alert-${issueType}-${Date.now()}`,
        issueType,
        count: issues.length,
        severity: config.severity,
        message: alertMessage,
        triggeredAt: new Date().toISOString(),
        acknowledged: false
      };

      // Store alert in database
      await this.storeAlert(alert);

      // Send notifications based on configuration
      if (config.notificationMethods.includes('toast')) {
        this.sendToastNotification(alert);
      }

      if (config.notificationMethods.includes('system')) {
        await this.sendSystemNotification(alert);
      }

      if (config.notificationMethods.includes('email')) {
        await this.sendEmailNotification(alert);
      }
    } catch (error) {
      console.error('Error triggering alert:', error);
    }
  }

  /**
   * Generate alert message for issue type
   */
  private static generateAlertMessage(issueType: string, issues: DataIntegrityIssue[]): string {
    const count = issues.length;
    
    switch (issueType) {
      case 'orphaned_order':
        return `${count} order${count > 1 ? 's' : ''} found without associated invoices`;
      case 'orphaned_invoice':
        return `${count} invoice${count > 1 ? 's' : ''} found referencing non-existent orders`;
      case 'negative_inventory':
        return `${count} inventory item${count > 1 ? 's' : ''} with negative quantities detected`;
      case 'inventory_discrepancy':
        return `${count} inventory discrepanc${count > 1 ? 'ies' : 'y'} detected between recorded and calculated quantities`;
      case 'critically_low_stock':
        return `${count} material${count > 1 ? 's' : ''} at critically low stock levels`;
      case 'orphaned_production_batch':
        return `${count} production batch${count > 1 ? 'es' : ''} found without inputs`;
      case 'orphaned_ledger_entry':
        return `${count} financial ledger entr${count > 1 ? 'ies' : 'y'} referencing non-existent records`;
      case 'invoice_without_ledger':
        return `${count} invoice${count > 1 ? 's' : ''} found without financial ledger entries`;
      default:
        return `${count} data integrity issue${count > 1 ? 's' : ''} of type ${issueType} detected`;
    }
  }

  /**
   * Send toast notification
   */
  private static sendToastNotification(alert: DataIntegrityAlert): void {
    const toastType = alert.severity === 'critical' ? 'error' : 
                     alert.severity === 'high' ? 'warning' : 'info';
    
    toast[toastType](`Data Integrity Alert: ${alert.message}`);
  }

  /**
   * Send system notification (store in database)
   */
  private static async sendSystemNotification(alert: DataIntegrityAlert): Promise<void> {
    try {
      // Store system notification for admin users
      const { error } = await supabase
        .from('system_notifications')
        .insert({
          type: 'data_integrity_alert',
          title: 'Data Integrity Alert',
          message: alert.message,
          severity: alert.severity,
          metadata: {
            alertId: alert.id,
            issueType: alert.issueType,
            count: alert.count
          },
          target_roles: ['admin'],
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error sending system notification:', error);
      }
    } catch (error) {
      console.error('Error in sendSystemNotification:', error);
    }
  }

  /**
   * Send email notification (placeholder for future implementation)
   */
  private static async sendEmailNotification(alert: DataIntegrityAlert): Promise<void> {
    // TODO: Implement email notification system
    console.log('Email notification would be sent:', alert);
  }

  /**
   * Store alert in database
   */
  private static async storeAlert(alert: DataIntegrityAlert): Promise<void> {
    try {
      const { error } = await supabase
        .from('data_integrity_alerts')
        .insert({
          issue_type: alert.issueType,
          count: alert.count,
          severity: alert.severity,
          message: alert.message,
          triggered_at: alert.triggeredAt,
          acknowledged: alert.acknowledged
        });

      if (error) {
        console.error('Error storing alert:', error);
      }
    } catch (error) {
      console.error('Error in storeAlert:', error);
    }
  }

  /**
   * Get active alerts
   */
  static async getActiveAlerts(): Promise<DataIntegrityAlert[]> {
    try {
      const { data, error } = await supabase
        .from('data_integrity_alerts')
        .select('*')
        .eq('acknowledged', false)
        .order('triggered_at', { ascending: false });

      if (error) {
        console.error('Error getting active alerts:', error);
        throw error;
      }

      return data.map(alert => ({
        id: alert.id,
        issueType: alert.issue_type,
        count: alert.count,
        severity: alert.severity,
        message: alert.message,
        triggeredAt: alert.triggered_at,
        acknowledged: alert.acknowledged,
        acknowledgedBy: alert.acknowledged_by,
        acknowledgedAt: alert.acknowledged_at
      }));
    } catch (error) {
      console.error('Error in getActiveAlerts:', error);
      return [];
    }
  }

  /**
   * Acknowledge alert
   */
  static async acknowledgeAlert(alertId: string): Promise<boolean> {
    try {
      const currentUser = await User.me();

      const { error } = await supabase
        .from('data_integrity_alerts')
        .update({
          acknowledged: true,
          acknowledged_by: currentUser.id,
          acknowledged_at: new Date().toISOString()
        })
        .eq('id', alertId);

      if (error) {
        console.error('Error acknowledging alert:', error);
        toast.error(`Failed to acknowledge alert: ${error.message}`);
        return false;
      }

      toast.success('Alert acknowledged');
      return true;
    } catch (error) {
      console.error('Error in acknowledgeAlert:', error);
      toast.error('Failed to acknowledge alert');
      return false;
    }
  }

  /**
   * Enhanced run all checks with alert processing
   */
  static async runAllChecks(): Promise<DataIntegrityCheckResult> {
    try {
      const checkTime = new Date().toISOString();
      const issues: DataIntegrityIssue[] = [];

      // Run all checks
      const orphanedOrderIssues = await this.checkOrphanedOrders();
      const orphanedInvoiceIssues = await this.checkOrphanedInvoices();
      const orphanedBatchIssues = await this.checkOrphanedProductionBatches();
      const inventoryIssues = await this.checkInventoryConsistency();
      const financialIssues = await this.checkFinancialLedgerConsistency();

      // Combine all issues
      issues.push(...orphanedOrderIssues);
      issues.push(...orphanedInvoiceIssues);
      issues.push(...orphanedBatchIssues);
      issues.push(...inventoryIssues);
      issues.push(...financialIssues);

      // Log issues to data_integrity_issues table
      if (issues.length > 0) {
        await this.logIssues(issues);
        // Process alerts for detected issues
        await this.processAlerts(issues);
      }

      return {
        success: true,
        issues,
        checkTime
      };
    } catch (error) {
      console.error('Error running data integrity checks:', error);
      return {
        success: false,
        issues: [],
        checkTime: new Date().toISOString()
      };
    }
  }

  /**
   * Get alert configuration
   */
  static getAlertConfig(issueType: string): AlertConfig | null {
    return this.alertConfigs[issueType] || null;
  }

  /**
   * Update alert configuration
   */
  static updateAlertConfig(issueType: string, config: Partial<AlertConfig>): void {
    if (this.alertConfigs[issueType]) {
      this.alertConfigs[issueType] = { ...this.alertConfigs[issueType], ...config };
    }
  }
}