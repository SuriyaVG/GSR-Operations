import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { User, UserRole, TokenManager, UserProfileManager, AuthorizationService } from '../User';
import { supabase } from '@/lib/supabase';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      refreshSession: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      updateUser: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      onAuthStateChange: vi.fn()
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn()
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn()
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn()
          }))
        }))
      }))
    }))
  }
}));

describe('TokenManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('shouldRefreshToken', () => {
    it('should return true if no expiration time provided', () => {
      expect(TokenManager.shouldRefreshToken()).toBe(true);
    });

    it('should return true if token expires within threshold', () => {
      const now = Date.now();
      const expiresAt = Math.floor((now + 4 * 60 * 1000) / 1000); // 4 minutes from now
      expect(TokenManager.shouldRefreshToken(expiresAt)).toBe(true);
    });

    it('should return false if token expires beyond threshold', () => {
      const now = Date.now();
      const expiresAt = Math.floor((now + 10 * 60 * 1000) / 1000); // 10 minutes from now
      expect(TokenManager.shouldRefreshToken(expiresAt)).toBe(false);
    });
  });

  describe('getValidSession', () => {
    it('should return null if no session exists', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null
      });

      const result = await TokenManager.getValidSession();
      expect(result).toBeNull();
    });

    it('should return session if token is still valid', async () => {
      const mockSession: Session = {
        access_token: 'token',
        refresh_token: 'refresh',
        expires_at: Math.floor((Date.now() + 10 * 60 * 1000) / 1000), // 10 minutes
        expires_in: 600,
        token_type: 'bearer',
        user: { id: '1' } as SupabaseUser
      };

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession },
        error: null
      });

      const result = await TokenManager.getValidSession();
      expect(result).toBe(mockSession);
    });

    it('should refresh token if it expires soon', async () => {
      const expiredSession: Session = {
        access_token: 'token',
        refresh_token: 'refresh',
        expires_at: Math.floor((Date.now() + 2 * 60 * 1000) / 1000), // 2 minutes
        expires_in: 120,
        token_type: 'bearer',
        user: { id: '1' } as SupabaseUser
      };

      const refreshedSession: Session = {
        ...expiredSession,
        access_token: 'new_token',
        expires_at: Math.floor((Date.now() + 60 * 60 * 1000) / 1000) // 1 hour
      };

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: expiredSession },
        error: null
      });

      vi.mocked(supabase.auth.refreshSession).mockResolvedValue({
        data: { session: refreshedSession },
        error: null
      });

      const result = await TokenManager.getValidSession();
      expect(result).toBe(refreshedSession);
      expect(supabase.auth.refreshSession).toHaveBeenCalled();
    });

    it('should throw error if session retrieval fails', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: { message: 'Session error' } as any
      });

      await expect(TokenManager.getValidSession()).rejects.toThrow('Session error: Session error');
    });
  });
});

describe('UserProfileManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserProfile', () => {
    it('should return user profile if found', async () => {
      const mockProfile = {
        id: '1',
        role: UserRole.ADMIN,
        name: 'Test User',
        active: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      };

      const mockQuery = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockProfile, error: null })
          }))
        }))
      };

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any);

      const result = await UserProfileManager.getUserProfile('1');
      expect(result).toEqual(mockProfile);
    });

    it('should return null if profile not found', async () => {
      const mockQuery = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ 
              data: null, 
              error: { code: 'PGRST116' } 
            })
          }))
        }))
      };

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any);

      const result = await UserProfileManager.getUserProfile('1');
      expect(result).toBeNull();
    });

    it('should throw error for other database errors', async () => {
      const mockQuery = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ 
              data: null, 
              error: { message: 'Database error' } 
            })
          }))
        }))
      };

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any);

      await expect(UserProfileManager.getUserProfile('1')).rejects.toThrow('Failed to fetch user profile: Database error');
    });
  });

  describe('createUserProfile', () => {
    it('should create and return user profile', async () => {
      const profileInput = {
        id: '1',
        role: UserRole.ADMIN,
        name: 'Test User',
        active: true
      };

      const createdProfile = {
        ...profileInput,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      };

      const mockQuery = {
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: createdProfile, error: null })
          }))
        }))
      };

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any);

      const result = await UserProfileManager.createUserProfile(profileInput);
      expect(result).toEqual(createdProfile);
    });
  });
});

describe('User API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      const mockSupabaseUser: SupabaseUser = {
        id: '1',
        email: 'test@example.com',
        created_at: '2023-01-01T00:00:00Z',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        role: 'authenticated'
      };

      const mockProfile = {
        id: '1',
        role: UserRole.ADMIN,
        name: 'Test User',
        active: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      };

      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: mockSupabaseUser, session: null },
        error: null
      });

      // Mock UserProfileManager.getOrCreateUserProfile
      vi.spyOn(UserProfileManager, 'getOrCreateUserProfile').mockResolvedValue(mockProfile);

      const result = await User.login('test@example.com', 'password');

      expect(result.id).toBe('1');
      expect(result.email).toBe('test@example.com');
      expect(result.role).toBe(UserRole.ADMIN);
      expect(result.permissions).toBeDefined();
    });

    it('should throw error on login failure', async () => {
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid credentials' } as any
      });

      await expect(User.login('test@example.com', 'wrong')).rejects.toThrow('Login failed: Invalid credentials');
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null });

      const result = await User.logout();
      expect(result).toBe(true);
    });

    it('should throw error on logout failure', async () => {
      vi.mocked(supabase.auth.signOut).mockResolvedValue({
        error: { message: 'Logout failed' } as any
      });

      await expect(User.logout()).rejects.toThrow('Logout failed: Logout failed');
    });
  });

  describe('isAuthenticated', () => {
    it('should return true if user is authenticated', async () => {
      const mockSession: Session = {
        access_token: 'token',
        refresh_token: 'refresh',
        expires_at: Math.floor((Date.now() + 10 * 60 * 1000) / 1000),
        expires_in: 600,
        token_type: 'bearer',
        user: { id: '1' } as SupabaseUser
      };

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession },
        error: null
      });

      const result = await User.isAuthenticated();
      expect(result).toBe(true);
    });

    it('should return false if user is not authenticated', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null
      });

      const result = await User.isAuthenticated();
      expect(result).toBe(false);
    });
  });

  describe('me', () => {
    it('should return current user', async () => {
      const mockSupabaseUser: SupabaseUser = {
        id: '1',
        email: 'test@example.com',
        created_at: '2023-01-01T00:00:00Z',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        role: 'authenticated'
      };

      const mockSession: Session = {
        access_token: 'token',
        refresh_token: 'refresh',
        expires_at: Math.floor((Date.now() + 10 * 60 * 1000) / 1000),
        expires_in: 600,
        token_type: 'bearer',
        user: mockSupabaseUser
      };

      const mockProfile = {
        id: '1',
        role: UserRole.ADMIN,
        name: 'Test User',
        active: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      };

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession },
        error: null
      });

      vi.spyOn(UserProfileManager, 'getOrCreateUserProfile').mockResolvedValue(mockProfile);

      const result = await User.me();

      expect(result.id).toBe('1');
      expect(result.email).toBe('test@example.com');
      expect(result.role).toBe(UserRole.ADMIN);
      expect(result.permissions).toBeDefined();
    });

    it('should throw error if not authenticated', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null
      });

      await expect(User.me()).rejects.toThrow('User not authenticated');
    });
  });
});

describe('AuthorizationService', () => {
  const mockAdminUser = {
    id: '1',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
    active: true
  };

  const mockViewerUser = {
    id: '2',
    email: 'viewer@example.com',
    role: UserRole.VIEWER,
    active: true
  };

  describe('hasPermission', () => {
    it('should allow admin to perform any action', () => {
      expect(AuthorizationService.hasPermission(mockAdminUser, 'orders', 'create')).toBe(true);
      expect(AuthorizationService.hasPermission(mockAdminUser, 'customers', 'delete')).toBe(true);
    });

    it('should restrict viewer to read-only actions', () => {
      expect(AuthorizationService.hasPermission(mockViewerUser, 'order', 'read')).toBe(true);
      expect(AuthorizationService.hasPermission(mockViewerUser, 'order', 'create')).toBe(false);
      expect(AuthorizationService.hasPermission(mockViewerUser, 'order', 'delete')).toBe(false);
    });

    it('should return false for unauthenticated user', () => {
      expect(AuthorizationService.hasPermission(null as any, 'orders', 'read')).toBe(false);
    });
  });

  describe('hasRole', () => {
    it('should return true if user has required role', () => {
      expect(AuthorizationService.hasRole(mockAdminUser, [UserRole.ADMIN])).toBe(true);
      expect(AuthorizationService.hasRole(mockViewerUser, [UserRole.VIEWER, UserRole.ADMIN])).toBe(true);
    });

    it('should return false if user does not have required role', () => {
      expect(AuthorizationService.hasRole(mockViewerUser, [UserRole.ADMIN])).toBe(false);
    });
  });

  describe('canOverridePrice', () => {
    const salesManagerUser = {
      id: '3',
      email: 'sales@example.com',
      role: UserRole.SALES_MANAGER,
      active: true
    };

    it('should allow admin unlimited price override', () => {
      expect(AuthorizationService.canOverridePrice(mockAdminUser, 100, 50)).toBe(true);
      expect(AuthorizationService.canOverridePrice(mockAdminUser, 100, 200)).toBe(true);
    });

    it('should allow sales manager limited price override', () => {
      expect(AuthorizationService.canOverridePrice(salesManagerUser, 100, 120)).toBe(true); // 20%
      expect(AuthorizationService.canOverridePrice(salesManagerUser, 100, 80)).toBe(true); // 20%
      expect(AuthorizationService.canOverridePrice(salesManagerUser, 100, 130)).toBe(false); // 30%
    });

    it('should not allow viewer to override prices', () => {
      expect(AuthorizationService.canOverridePrice(mockViewerUser, 100, 120)).toBe(false);
    });
  });
});