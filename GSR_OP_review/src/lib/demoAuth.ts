// Development-only demo authentication
import { User, UserRole } from '../Entities/User';

// Demo user for development
export const DEMO_USER: User = {
  id: 'demo-admin-001',
  email: 'admin@gsroperations.com',
  role: UserRole.ADMIN,
  name: 'Demo Admin',
  designation: 'System Administrator',
  active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  permissions: [],
  custom_settings: {
    display_name: 'Demo Admin',
    title: 'System Administrator',
    department: 'IT'
  }
};

// Demo authentication service for development
export class DemoAuthService {
  private static readonly DEMO_SESSION_KEY = 'demo_auth_session';
  
  // Check if demo mode is enabled
  static isDemoMode(): boolean {
    return import.meta.env.VITE_APP_ENV === 'development';
  }
  
  // Create demo session
  static createDemoSession(user: User = DEMO_USER): void {
    if (!this.isDemoMode()) return;
    
    localStorage.setItem(this.DEMO_SESSION_KEY, JSON.stringify({
      user,
      timestamp: Date.now(),
      expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    }));
  }
  
  // Get demo session
  static getDemoSession(): User | null {
    if (!this.isDemoMode()) return null;
    
    try {
      const sessionData = localStorage.getItem(this.DEMO_SESSION_KEY);
      if (!sessionData) return null;
      
      const session = JSON.parse(sessionData);
      
      // Check if session is expired
      if (Date.now() > session.expires) {
        this.clearDemoSession();
        return null;
      }
      
      return session.user;
    } catch {
      return null;
    }
  }
  
  // Clear demo session
  static clearDemoSession(): void {
    localStorage.removeItem(this.DEMO_SESSION_KEY);
  }
  
  // Demo login
  static async demoLogin(email: string, password: string): Promise<User> {
    if (!this.isDemoMode()) {
      throw new Error('Demo mode not available in production');
    }
    
    // Simple demo credential check
    if (email === 'admin@gsroperations.com' && password === 'demo123') {
      this.createDemoSession(DEMO_USER);
      return DEMO_USER;
    }
    
    throw new Error('Invalid demo credentials');
  }
  
  // Demo logout
  static demoLogout(): void {
    this.clearDemoSession();
  }
}