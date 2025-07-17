// src/lib/toast.ts
// Toast notification service for user feedback

export interface ToastOptions {
  duration?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  dismissible?: boolean;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  options: ToastOptions;
  timestamp: number;
}

// Toast store (simple implementation - can be replaced with a state management solution)
class ToastStore {
  private toasts: Toast[] = [];
  private listeners: Array<(toasts: Toast[]) => void> = [];
  private idCounter = 0;

  private generateId(): string {
    return `toast-${++this.idCounter}-${Date.now()}`;
  }

  private notify() {
    this.listeners.forEach(listener => listener([...this.toasts]));
  }

  add(type: Toast['type'], message: string, options: ToastOptions = {}): string {
    const toast: Toast = {
      id: this.generateId(),
      type,
      message,
      options: {
        duration: 5000,
        position: 'top-right',
        dismissible: true,
        ...options
      },
      timestamp: Date.now()
    };

    this.toasts.push(toast);
    this.notify();

    // Auto-dismiss after duration
    if (toast.options.duration && toast.options.duration > 0) {
      setTimeout(() => {
        this.remove(toast.id);
      }, toast.options.duration);
    }

    return toast.id;
  }

  remove(id: string) {
    const index = this.toasts.findIndex(toast => toast.id === id);
    if (index > -1) {
      this.toasts.splice(index, 1);
      this.notify();
    }
  }

  clear() {
    this.toasts = [];
    this.notify();
  }

  getAll(): Toast[] {
    return [...this.toasts];
  }

  subscribe(listener: (toasts: Toast[]) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }
}

// Global toast store instance
const toastStore = new ToastStore();

// Toast service API
export const toast = {
  success: (message: string, options?: ToastOptions): string => {
    return toastStore.add('success', message, options);
  },

  error: (message: string, options?: ToastOptions): string => {
    return toastStore.add('error', message, options);
  },

  warning: (message: string, options?: ToastOptions): string => {
    return toastStore.add('warning', message, options);
  },

  info: (message: string, options?: ToastOptions): string => {
    return toastStore.add('info', message, options);
  },

  dismiss: (id: string): void => {
    toastStore.remove(id);
  },

  clear: (): void => {
    toastStore.clear();
  },

  // For React components to subscribe to toast updates
  subscribe: (listener: (toasts: Toast[]) => void): (() => void) => {
    return toastStore.subscribe(listener);
  },

  getAll: (): Toast[] => {
    return toastStore.getAll();
  }
};

// Default export for convenience
export default toast;