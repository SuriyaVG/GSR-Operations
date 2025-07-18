import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RealtimeManager, ConnectionState } from '../realtime';

// Mock Supabase client
vi.mock('../supabase', () => {
  const mockChannel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn((callback) => {
      callback('SUBSCRIBED');
      return mockChannel;
    })
  };

  const mockRealtime = {
    onOpen: vi.fn(),
    onClose: vi.fn(),
    onError: vi.fn()
  };

  return {
    supabase: {
      channel: vi.fn(() => mockChannel),
      removeChannel: vi.fn(),
      realtime: mockRealtime
    }
  };
});

// Mock toast
vi.mock('../toast', () => ({
  toast: {
    error: vi.fn()
  }
}));

describe('RealtimeManager', () => {
  let realtimeManager: RealtimeManager;

  beforeEach(() => {
    // Get fresh instance for each test
    realtimeManager = RealtimeManager.getInstance();
    vi.clearAllMocks();
  });

  afterEach(() => {
    realtimeManager.unsubscribeAll();
  });

  it('should be a singleton', () => {
    const instance1 = RealtimeManager.getInstance();
    const instance2 = RealtimeManager.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should start with disconnected state', () => {
    expect(realtimeManager.getConnectionState()).toBe(ConnectionState.DISCONNECTED);
    expect(realtimeManager.isConnected()).toBe(false);
  });

  it('should create subscriptions successfully', () => {
    const callback = vi.fn();
    const subscriptionId = realtimeManager.subscribe({
      table: 'orders',
      events: ['INSERT', 'UPDATE'],
      callback
    });

    expect(subscriptionId).toBeDefined();
    expect(typeof subscriptionId).toBe('string');
    expect(realtimeManager.getActiveSubscriptionCount()).toBe(1);
  });

  it('should handle subscription callbacks', async () => {
    const callback = vi.fn();
    const { supabase } = await import('../supabase');
    
    realtimeManager.subscribe({
      table: 'orders',
      events: ['INSERT', 'UPDATE'],
      callback
    });

    // Simulate a database change
    const mockPayload = {
      eventType: 'INSERT',
      new: { id: 1, name: 'Test Order' },
      old: null,
      schema: 'public',
      table: 'orders'
    };

    // Get the mocked channel and its callback
    const mockChannel = supabase.channel();
    const channelCallback = mockChannel.on.mock.calls[0][2];
    channelCallback(mockPayload);

    expect(callback).toHaveBeenCalledWith(mockPayload);
  });

  it('should filter events based on configuration', async () => {
    const callback = vi.fn();
    const { supabase } = await import('../supabase');
    
    realtimeManager.subscribe({
      table: 'orders',
      events: ['INSERT'], // Only INSERT events
      callback
    });

    // Get the callback that was registered with the channel
    const mockChannel = supabase.channel();
    const channelCallback = mockChannel.on.mock.calls[0][2];

    // Test INSERT event (should trigger callback)
    channelCallback({
      eventType: 'INSERT',
      new: { id: 1 },
      old: null,
      schema: 'public',
      table: 'orders'
    });

    // Test UPDATE event (should not trigger callback)
    channelCallback({
      eventType: 'UPDATE',
      new: { id: 1, name: 'Updated' },
      old: { id: 1, name: 'Original' },
      schema: 'public',
      table: 'orders'
    });

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should unsubscribe successfully', () => {
    const callback = vi.fn();
    const subscriptionId = realtimeManager.subscribe({
      table: 'orders',
      events: ['INSERT'],
      callback
    });

    expect(realtimeManager.getActiveSubscriptionCount()).toBe(1);

    const success = realtimeManager.unsubscribe(subscriptionId);
    expect(success).toBe(true);
    expect(realtimeManager.getActiveSubscriptionCount()).toBe(0);
  });

  it('should handle unsubscribing non-existent subscription', () => {
    const success = realtimeManager.unsubscribe('non-existent-id');
    expect(success).toBe(false);
  });

  it('should unsubscribe all subscriptions', () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();

    realtimeManager.subscribe({
      table: 'orders',
      events: ['INSERT'],
      callback: callback1
    });

    realtimeManager.subscribe({
      table: 'invoices',
      events: ['UPDATE'],
      callback: callback2
    });

    expect(realtimeManager.getActiveSubscriptionCount()).toBe(2);

    realtimeManager.unsubscribeAll();
    expect(realtimeManager.getActiveSubscriptionCount()).toBe(0);
  });

  it('should handle connection state changes', () => {
    const stateChangeCallback = vi.fn();
    const unsubscribe = realtimeManager.onConnectionStateChange(stateChangeCallback);

    // Verify that the callback can be registered and unregistered
    expect(typeof unsubscribe).toBe('function');
    
    // Clean up
    unsubscribe();
    
    // The callback should not be called after unsubscribing
    expect(stateChangeCallback).not.toHaveBeenCalled();
  });

  it('should handle subscription errors gracefully', async () => {
    const callback = vi.fn();
    const { supabase } = await import('../supabase');
    
    // Mock console.error to avoid noise in test output
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Simulate callback error
    realtimeManager.subscribe({
      table: 'orders',
      events: ['INSERT'],
      callback: () => {
        throw new Error('Callback error');
      }
    });

    // Get the callback and trigger it
    const mockChannel = supabase.channel();
    const channelCallback = mockChannel.on.mock.calls[0][2];
    channelCallback({
      eventType: 'INSERT',
      new: { id: 1 },
      old: null,
      schema: 'public',
      table: 'orders'
    });

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});