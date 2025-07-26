// React hook for managing real-time subscriptions
import { useEffect, useRef, useCallback } from 'react';
import { DatabaseService } from '@/lib/database';
import type { SubscriptionCallback } from '@/lib/realtime';

// Subscription types for type safety
export type SubscriptionType = 
  | 'orders'
  | 'production_batches' 
  | 'invoices'
  | 'customers'
  | 'materials';

// Hook options
export interface UseRealtimeSubscriptionOptions {
  enabled?: boolean;
  onError?: (error: Error) => void;
}

// Hook return type
export interface UseRealtimeSubscriptionReturn {
  isSubscribed: boolean;
  subscribe: () => void;
  unsubscribe: () => void;
}

/**
 * React hook for managing real-time subscriptions to database changes
 * 
 * @param type - The type of subscription (orders, invoices, etc.)
 * @param callback - Function to call when changes are detected
 * @param options - Additional options for the subscription
 * @returns Object with subscription state and control methods
 */
export function useRealtimeSubscription(
  type: SubscriptionType,
  callback: SubscriptionCallback,
  options: UseRealtimeSubscriptionOptions = {}
): UseRealtimeSubscriptionReturn {
  const { enabled = true, onError } = options;
  const subscriptionIdRef = useRef<string | null>(null);
  const callbackRef = useRef(callback);
  const isSubscribedRef = useRef(false);

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Subscription function
  const subscribe = useCallback(() => {
    if (subscriptionIdRef.current || isSubscribedRef.current) {
      return; // Already subscribed
    }

    try {
      let subscriptionId: string;

      // Create appropriate subscription based on type
      switch (type) {
        case 'orders':
          subscriptionId = DatabaseService.subscribeToOrderChanges(callbackRef.current);
          break;
        case 'production_batches':
          subscriptionId = DatabaseService.subscribeToProductionBatchChanges(callbackRef.current);
          break;
        case 'invoices':
          subscriptionId = DatabaseService.subscribeToInvoiceChanges(callbackRef.current);
          break;
        case 'customers':
          subscriptionId = DatabaseService.subscribeToCustomerChanges(callbackRef.current);
          break;
        case 'materials':
          subscriptionId = DatabaseService.subscribeToMaterialChanges(callbackRef.current);
          break;
        default:
          throw new Error(`Unknown subscription type: ${type}`);
      }

      subscriptionIdRef.current = subscriptionId;
      isSubscribedRef.current = true;
      console.log(`Subscribed to ${type} changes:`, subscriptionId);
    } catch (error) {
      console.error(`Failed to subscribe to ${type} changes:`, error);
      if (onError) {
        onError(error as Error);
      }
    }
  }, [type, onError]);

  // Unsubscription function
  const unsubscribe = useCallback(() => {
    if (subscriptionIdRef.current) {
      const success = DatabaseService.unsubscribe(subscriptionIdRef.current);
      if (success) {
        console.log(`Unsubscribed from ${type} changes:`, subscriptionIdRef.current);
      }
      subscriptionIdRef.current = null;
      isSubscribedRef.current = false;
    }
  }, [type]);

  // Auto-subscribe/unsubscribe based on enabled flag
  useEffect(() => {
    if (enabled) {
      subscribe();
    } else {
      unsubscribe();
    }

    // Cleanup on unmount
    return () => {
      unsubscribe();
    };
  }, [enabled, subscribe, unsubscribe]);

  return {
    isSubscribed: isSubscribedRef.current,
    subscribe,
    unsubscribe
  };
}

/**
 * Hook for subscribing to multiple real-time data sources
 * 
 * @param subscriptions - Array of subscription configurations
 * @param options - Global options for all subscriptions
 * @returns Object with overall subscription state and control methods
 */
export function useMultipleRealtimeSubscriptions(
  subscriptions: Array<{
    type: SubscriptionType;
    callback: SubscriptionCallback;
    enabled?: boolean;
  }>,
  options: UseRealtimeSubscriptionOptions = {}
) {
  const subscriptionRefs = useRef<Map<SubscriptionType, string>>(new Map());
  const { onError } = options;

  const subscribeAll = useCallback(() => {
    subscriptions.forEach(({ type, callback, enabled = true }) => {
      if (!enabled || subscriptionRefs.current.has(type)) {
        return;
      }

      try {
        let subscriptionId: string;

        switch (type) {
          case 'orders':
            subscriptionId = DatabaseService.subscribeToOrderChanges(callback);
            break;
          case 'production_batches':
            subscriptionId = DatabaseService.subscribeToProductionBatchChanges(callback);
            break;
          case 'invoices':
            subscriptionId = DatabaseService.subscribeToInvoiceChanges(callback);
            break;
          case 'customers':
            subscriptionId = DatabaseService.subscribeToCustomerChanges(callback);
            break;
          case 'materials':
            subscriptionId = DatabaseService.subscribeToMaterialChanges(callback);
            break;
          default:
            throw new Error(`Unknown subscription type: ${type}`);
        }

        subscriptionRefs.current.set(type, subscriptionId);
        console.log(`Subscribed to ${type} changes:`, subscriptionId);
      } catch (error) {
        console.error(`Failed to subscribe to ${type} changes:`, error);
        if (onError) {
          onError(error as Error);
        }
      }
    });
  }, [subscriptions, onError]);

  const unsubscribeAll = useCallback(() => {
    subscriptionRefs.current.forEach((subscriptionId, type) => {
      const success = DatabaseService.unsubscribe(subscriptionId);
      if (success) {
        console.log(`Unsubscribed from ${type} changes:`, subscriptionId);
      }
    });
    subscriptionRefs.current.clear();
  }, []);

  useEffect(() => {
    subscribeAll();

    return () => {
      unsubscribeAll();
    };
  }, [subscribeAll, unsubscribeAll]);

  return {
    activeSubscriptions: subscriptionRefs.current.size,
    subscribeAll,
    unsubscribeAll
  };
}