// src/lib/hooks/useOrderManagement.ts
import { useState, useCallback } from 'react';
import { OrderService, type OrderData } from '@/lib/orderService';
import { FinancialService } from '@/lib/financial';
import { AuthorizationService, User } from '@/Entities/User';

export interface UseOrderManagementReturn {
  isCreatingOrder: boolean;
  isUpdatingOrder: boolean;
  createOrderWithInvoice: (orderData: OrderData) => Promise<{ order: any; invoice: any } | null>;
  updateOrderStatus: (orderId: string, status: string) => Promise<void>;
  updatePaymentStatus: (orderId: string, paymentStatus: string) => Promise<void>;
  cancelOrder: (orderId: string, reason: string) => Promise<void>;
  recordPayment: (invoiceId: string, amount: number, paymentDate: string, reference?: string) => Promise<void>;
  createCreditNote: (invoiceId: string, amount: number, reason: string) => Promise<any>;
  canCreateOrder: boolean;
  canUpdateOrder: boolean;
  canManageFinances: boolean;
}

export function useOrderManagement(): UseOrderManagementReturn {
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);

  // Get current user and check permissions
  const currentUser = User.getCurrentUser();
  const canCreateOrder = currentUser ? AuthorizationService.hasPermission(currentUser, 'order', 'create') : false;
  const canUpdateOrder = currentUser ? AuthorizationService.hasPermission(currentUser, 'order', 'update') : false;
  const canManageFinances = currentUser ? AuthorizationService.canAccessFinancialData(currentUser) : false;

  // Create order with automated invoice generation
  const createOrderWithInvoice = useCallback(async (orderData: OrderData) => {
    if (!canCreateOrder) {
      throw new Error('You do not have permission to create orders');
    }

    setIsCreatingOrder(true);
    try {
      const result = await OrderService.createOrder(orderData);
      return result;
    } catch (error) {
      console.error('Failed to create order with invoice:', error);
      throw error;
    } finally {
      setIsCreatingOrder(false);
    }
  }, [canCreateOrder]);

  // Update order status
  const updateOrderStatus = useCallback(async (orderId: string, status: string) => {
    if (!canUpdateOrder) {
      throw new Error('You do not have permission to update orders');
    }

    setIsUpdatingOrder(true);
    try {
      await OrderService.updateOrderStatus(orderId, status);
    } catch (error) {
      console.error('Failed to update order status:', error);
      throw error;
    } finally {
      setIsUpdatingOrder(false);
    }
  }, [canUpdateOrder]);

  // Update payment status
  const updatePaymentStatus = useCallback(async (orderId: string, paymentStatus: string) => {
    if (!canUpdateOrder) {
      throw new Error('You do not have permission to update orders');
    }

    setIsUpdatingOrder(true);
    try {
      await OrderService.updatePaymentStatus(orderId, paymentStatus);
    } catch (error) {
      console.error('Failed to update payment status:', error);
      throw error;
    } finally {
      setIsUpdatingOrder(false);
    }
  }, [canUpdateOrder]);

  // Cancel order
  const cancelOrder = useCallback(async (orderId: string, reason: string) => {
    if (!canUpdateOrder) {
      throw new Error('You do not have permission to cancel orders');
    }

    setIsUpdatingOrder(true);
    try {
      await OrderService.cancelOrder(orderId, reason);
    } catch (error) {
      console.error('Failed to cancel order:', error);
      throw error;
    } finally {
      setIsUpdatingOrder(false);
    }
  }, [canUpdateOrder]);

  // Record payment
  const recordPayment = useCallback(async (
    invoiceId: string, 
    amount: number, 
    paymentDate: string, 
    reference?: string
  ) => {
    if (!canManageFinances) {
      throw new Error('You do not have permission to record payments');
    }

    try {
      await FinancialService.recordPayment({
        invoice_id: invoiceId,
        amount,
        payment_date: paymentDate,
        reference
      });
    } catch (error) {
      console.error('Failed to record payment:', error);
      throw error;
    }
  }, [canManageFinances]);

  // Create credit note
  const createCreditNote = useCallback(async (
    invoiceId: string, 
    amount: number, 
    reason: string
  ) => {
    if (!canManageFinances) {
      throw new Error('You do not have permission to create credit notes');
    }

    try {
      const creditNote = await FinancialService.createCreditNote({
        invoice_id: invoiceId,
        amount,
        reason
      });
      return creditNote;
    } catch (error) {
      console.error('Failed to create credit note:', error);
      throw error;
    }
  }, [canManageFinances]);

  return {
    isCreatingOrder,
    isUpdatingOrder,
    createOrderWithInvoice,
    updateOrderStatus,
    updatePaymentStatus,
    cancelOrder,
    recordPayment,
    createCreditNote,
    canCreateOrder,
    canUpdateOrder,
    canManageFinances
  };
}