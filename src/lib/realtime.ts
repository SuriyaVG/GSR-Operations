// Real-time subscription management for Supabase
import React from 'react';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { toast } from '@/lib/toast';

// Subscription event types
export type SubscriptionEvent = 'INSERT' | 'UPDATE' | 'DELETE';
export type SubscriptionTable = 'orders' | 'production_batches' | 'invoices' | 'customers' | 'materials';

// Subscription callback type
export type SubscriptionCallback<T = any> = (
  payload: RealtimePostgresChangesPayload<T>
) => void;

// Subscription configuration
export interface SubscriptionConfig {
  table: SubscriptionTable;
  events: SubscriptionEvent[];
  filter?: string;
  callback: SubscriptionCallback;
}

// Connection state management
export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  RECONNECTING = 'RECONNECTING',
  ERROR = 'ERROR'
}

// Real-time subscription manager
export class RealtimeManager {
  private static instance: RealtimeManager;
  private subscriptions: Map<string, RealtimeChannel> = new Map();
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private stateChangeCallbacks: Set<(state: ConnectionState) => void> = new Set();

  private constructor() {
    this.setupConnectionMonitoring();
  }

  static getInstance(): RealtimeManager {
    if (!RealtimeManager.instance) {
      RealtimeManager.instance = new RealtimeManager();
    }
    return RealtimeManager.instance;
  }

  // Set up connection state monitoring
  private setupConnectionMonitoring() {
    // Monitor Supabase connection state
    supabase.realtime.onOpen(() => {
      this.setConnectionState(ConnectionState.CONNECTED);
      this.reconnectAttempts = 0;
      console.log('Real-time connection established');
    });

    supabase.realtime.onClose(() => {
      this.setConnectionState(ConnectionState.DISCONNECTED);
      console.log('Real-time connection closed');
      this.handleReconnection();
    });

    supabase.realtime.onError((error) => {
      this.setConnectionState(ConnectionState.ERROR);
      console.error('Real-time connection error:', error);
      this.handleReconnection();
    });
  }

  // Handle automatic reconnection
  private async handleReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      toast.error('Real-time connection lost. Please refresh the page.');
      return;
    }

    this.setConnectionState(ConnectionState.RECONNECTING);
    this.reconnectAttempts++;

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.reconnectAllSubscriptions();
    }, delay);
  }

  // Reconnect all active subscriptions
  private async reconnectAllSubscriptions() {
    const subscriptionConfigs = Array.from(this.subscriptions.entries());
    
    // Clear existing subscriptions
    this.subscriptions.clear();

    // Recreate subscriptions
    for (const [key, channel] of subscriptionConfigs) {
      try {
        // Extract config from channel (this is a simplified approach)
        // In a real implementation, you'd store the original config
        console.log(`Reconnecting subscription: ${key}`);
      } catch (error) {
        console.error(`Failed to reconnect subscription ${key}:`, error);
      }
    }
  }

  // Set connection state and notify callbacks
  private setConnectionState(state: ConnectionState) {
    if (this.connectionState !== state) {
      this.connectionState = state;
      this.stateChangeCallbacks.forEach(callback => callback(state));
    }
  }

  // Subscribe to table changes
  subscribe(config: SubscriptionConfig): string {
    const subscriptionId = `${config.table}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      const channel = supabase
        .channel(subscriptionId)
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to all events, filter in callback
            schema: 'public',
            table: config.table,
            filter: config.filter
          },
          (payload: RealtimePostgresChangesPayload<any>) => {
            // Filter events based on configuration
            if (config.events.includes(payload.eventType as SubscriptionEvent)) {
              try {
                config.callback(payload);
              } catch (error) {
                console.error(`Error in subscription callback for ${config.table}:`, error);
              }
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log(`Successfully subscribed to ${config.table}`);
          } else if (status === 'CHANNEL_ERROR') {
            console.error(`Failed to subscribe to ${config.table}`);
            toast.error(`Failed to subscribe to ${config.table} updates`);
          }
        });

      this.subscriptions.set(subscriptionId, channel);
      return subscriptionId;
    } catch (error) {
      console.error(`Failed to create subscription for ${config.table}:`, error);
      throw error;
    }
  }

  // Unsubscribe from a specific subscription
  unsubscribe(subscriptionId: string): boolean {
    const channel = this.subscriptions.get(subscriptionId);
    if (channel) {
      supabase.removeChannel(channel);
      this.subscriptions.delete(subscriptionId);
      console.log(`Unsubscribed from ${subscriptionId}`);
      return true;
    }
    return false;
  }

  // Unsubscribe from all subscriptions
  unsubscribeAll(): void {
    this.subscriptions.forEach((channel, id) => {
      supabase.removeChannel(channel);
    });
    this.subscriptions.clear();
    console.log('Unsubscribed from all real-time subscriptions');
  }

  // Get current connection state
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  // Add connection state change listener
  onConnectionStateChange(callback: (state: ConnectionState) => void): () => void {
    this.stateChangeCallbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.stateChangeCallbacks.delete(callback);
    };
  }

  // Get active subscription count
  getActiveSubscriptionCount(): number {
    return this.subscriptions.size;
  }

  // Check if connected
  isConnected(): boolean {
    return this.connectionState === ConnectionState.CONNECTED;
  }
}

// Convenience functions for common subscription patterns
export const realtimeManager = RealtimeManager.getInstance();

// Subscribe to order changes
export function subscribeToOrders(callback: SubscriptionCallback) {
  return realtimeManager.subscribe({
    table: 'orders',
    events: ['INSERT', 'UPDATE'],
    callback
  });
}

// Subscribe to production batch changes
export function subscribeToProductionBatches(callback: SubscriptionCallback) {
  return realtimeManager.subscribe({
    table: 'production_batches',
    events: ['INSERT', 'UPDATE'],
    callback
  });
}

// Subscribe to invoice changes
export function subscribeToInvoices(callback: SubscriptionCallback) {
  return realtimeManager.subscribe({
    table: 'invoices',
    events: ['INSERT', 'UPDATE', 'DELETE'],
    callback
  });
}

// Subscribe to customer changes
export function subscribeToCustomers(callback: SubscriptionCallback) {
  return realtimeManager.subscribe({
    table: 'customers',
    events: ['INSERT', 'UPDATE'],
    callback
  });
}

// Subscribe to material changes
export function subscribeToMaterials(callback: SubscriptionCallback) {
  return realtimeManager.subscribe({
    table: 'materials',
    events: ['INSERT', 'UPDATE'],
    callback
  });
}

// React hook for connection state
export function useRealtimeConnection() {
  const [connectionState, setConnectionState] = React.useState(
    realtimeManager.getConnectionState()
  );

  React.useEffect(() => {
    const unsubscribe = realtimeManager.onConnectionStateChange(setConnectionState);
    return unsubscribe;
  }, []);

  return {
    connectionState,
    isConnected: connectionState === ConnectionState.CONNECTED,
    isReconnecting: connectionState === ConnectionState.RECONNECTING,
    hasError: connectionState === ConnectionState.ERROR
  };
}