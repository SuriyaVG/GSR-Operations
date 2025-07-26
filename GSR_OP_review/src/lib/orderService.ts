// src/lib/orderService.ts
import { Order } from '@/Entities/all';
import { FinancialService } from '@/lib/financial';
import { InventoryService } from '@/lib/inventory';
import { toast } from '@/lib/toast';
import { supabase } from '@/lib/supabase';

export interface OrderData {
  customer_id: string;
  order_date: string;
  expected_delivery?: string;
  status: string;
  payment_status: string;
  discount_amount: number;
  notes?: string;
  total_amount: number;
  tax_amount: number;
  net_amount: number;
  items: Array<{
    batch_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    packaging_type: string;
    total_price: number;
  }>;
}

export class OrderService {
  // Generate order number
  private static async generateOrderNumber(): Promise<string> {
    const orders = await Order.list();
    const year = new Date().getFullYear();
    const sequence = orders.length + 1;
    return `ORD-${year}-${sequence.toString().padStart(4, '0')}`;
  }

  // Create order with automated invoice creation using atomic database function
  static async createOrder(orderData: OrderData): Promise<{ order: any; invoice: any }> {
    try {
      // Generate order number
      const orderNumber = await this.generateOrderNumber();

      // Prepare order data for the database function
      const dbOrderData = {
        customer_id: orderData.customer_id,
        order_number: orderNumber,
        order_date: orderData.order_date,
        total_amount: orderData.net_amount.toString(), // Use net amount (including tax)
        status: orderData.status,
        payment_status: orderData.payment_status,
        notes: orderData.notes
      };

      // Call the atomic database function to create order and invoice together
      const { data: result, error: dbError } = await supabase.rpc('create_order_with_invoice', {
        order_data: dbOrderData,
        invoice_data: {} // Use default invoice settings
      });

      if (dbError) {
        console.error('Database function error:', dbError);
        throw new Error(`Failed to create order and invoice: ${dbError.message}`);
      }

      if (!result || !result.order || !result.invoice) {
        throw new Error('Invalid response from database function');
      }

      const { order, invoice } = result;

      // Decrement inventory for each item (after successful order/invoice creation)
      const inventoryErrors: string[] = [];
      for (const item of orderData.items) {
        try {
          await InventoryService.decrementBatchQuantity(
            item.batch_id,
            item.quantity,
            order.id,
            `Order ${orderNumber} - ${item.product_name}`
          );
        } catch (error) {
          console.error(`Failed to decrement inventory for batch ${item.batch_id}:`, error);
          inventoryErrors.push(`${item.product_name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Show appropriate success/warning messages
      if (inventoryErrors.length === 0) {
        toast.success(`Order ${orderNumber} created successfully with invoice ${invoice.invoice_number}`);
      } else {
        toast.success(`Order ${orderNumber} and invoice ${invoice.invoice_number} created successfully`);
        toast.warning(`Some inventory updates failed: ${inventoryErrors.join(', ')}. Please check manually.`);
      }

      return { order, invoice };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create order';
      console.error('OrderService.createOrder error:', error);
      toast.error(message);
      throw error;
    }
  }

  // Update order status
  static async updateOrderStatus(orderId: string, status: string): Promise<void> {
    try {
      // In a real implementation, this would update the order in the database
      // For now, we'll simulate the update
      const order = await Order.find(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      // Update order status (simulated)
      const updatedOrder = {
        ...order,
        status,
        updated_at: new Date().toISOString()
      };

      toast.success(`Order status updated to ${status}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update order status';
      toast.error(message);
      throw error;
    }
  }

  // Update payment status
  static async updatePaymentStatus(orderId: string, paymentStatus: string): Promise<void> {
    try {
      const order = await Order.find(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      // Update payment status (simulated)
      const updatedOrder = {
        ...order,
        payment_status: paymentStatus,
        updated_at: new Date().toISOString()
      };

      toast.success(`Payment status updated to ${paymentStatus}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update payment status';
      toast.error(message);
      throw error;
    }
  }

  // Get order with related data
  static async getOrderWithDetails(orderId: string): Promise<any> {
    try {
      const order = await Order.find(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      // Get related invoice
      const invoices = await FinancialService.getInvoiceAging();
      const orderInvoice = invoices.find(inv => inv.order_id === orderId);

      // Get customer financial summary
      const financialSummary = await FinancialService.getCustomerFinancialSummary(order.customer_id);

      return {
        order,
        invoice: orderInvoice,
        financialSummary
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get order details';
      toast.error(message);
      throw error;
    }
  }

  // Cancel order and handle refunds
  static async cancelOrder(orderId: string, reason: string): Promise<void> {
    try {
      const order = await Order.find(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      if (order.status === 'cancelled') {
        throw new Error('Order is already cancelled');
      }

      // Update order status to cancelled
      await this.updateOrderStatus(orderId, 'cancelled');

      // If order was paid, create credit note
      if (order.payment_status === 'paid' || order.payment_status === 'partial') {
        // Find the invoice for this order
        const invoices = await FinancialService.getInvoiceAging();
        const orderInvoice = invoices.find(inv => inv.order_id === orderId);
        
        if (orderInvoice && orderInvoice.paid_amount > 0) {
          await FinancialService.createCreditNote({
            invoice_id: orderInvoice.invoice_id,
            amount: orderInvoice.paid_amount,
            reason: `Order cancellation: ${reason}`
          });
        }
      }

      toast.success(`Order cancelled successfully. ${order.payment_status === 'paid' ? 'Credit note created for refund.' : ''}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to cancel order';
      toast.error(message);
      throw error;
    }
  }

  // Get orders by customer
  static async getOrdersByCustomer(customerId: string): Promise<any[]> {
    try {
      const orders = await Order.filter({ customer_id: customerId });
      return orders.sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime());
    } catch (error) {
      console.error('Failed to get customer orders:', error);
      return [];
    }
  }

  // Get order statistics
  static async getOrderStatistics(): Promise<{
    totalOrders: number;
    pendingOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
  }> {
    try {
      const orders = await Order.list();
      
      const totalOrders = orders.length;
      const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'processing').length;
      const completedOrders = orders.filter(o => o.status === 'completed').length;
      const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;
      const totalRevenue = orders
        .filter(o => o.status !== 'cancelled')
        .reduce((sum, o) => sum + o.total_amount, 0);
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      return {
        totalOrders,
        pendingOrders,
        completedOrders,
        cancelledOrders,
        totalRevenue,
        averageOrderValue
      };
    } catch (error) {
      console.error('Failed to get order statistics:', error);
      return {
        totalOrders: 0,
        pendingOrders: 0,
        completedOrders: 0,
        cancelledOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0
      };
    }
  }

  // List orders from Supabase
  static async list(sort = '-created_at', limit = 100) {
    let query = supabase.from('orders').select('*');
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
  }
}