import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { UserRole, AuthorizationService } from '../Entities/User';
import { supabase } from './supabase';

// Simple User interface for authentication
interface SimpleUser {
  id: string;
  email: string;
  role: UserRole;
  name?: string;
  active: boolean;
}

// Authentication context interface
interface AuthContextType {
  user: SimpleUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<SimpleUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        // Get current session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (mounted) {
          if (session?.user) {
            // Create simple user object
            const simpleUser: SimpleUser = {
              id: session.user.id,
              email: session.user.email!,
              role: session.user.email === 'suriyavg834@gmail.com' ? UserRole.ADMIN : UserRole.VIEWER,
              name: session.user.user_metadata?.name || session.user.email?.split('@')[0],
              active: true
            };
            setUser(simpleUser);
          } else {
            setUser(null);
          }
          setLoading(false);
        }
      } catch (error) {
        console.error('Auth init error:', error);
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
      }
    };

    // Set up auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth change:', event);
        
        if (!mounted) return;

        if (session?.user) {
          const simpleUser: SimpleUser = {
            id: session.user.id,
            email: session.user.email!,
            role: session.user.email === 'suriyavg834@gmail.com' ? UserRole.ADMIN : UserRole.VIEWER,
            name: session.user.user_metadata?.name || session.user.email?.split('@')[0],
            active: true
          };
          setUser(simpleUser);
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    initAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        setLoading(false);
        throw new Error(`Login failed: ${error.message}`);
      }
      // Auth state change will handle the rest
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(`Logout failed: ${error.message}`);
    }
  };

  const hasRole = (roles: UserRole[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    hasRole
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}