import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, Users, UserCheck, UserX, RefreshCw, CheckCircle, AlertCircle, ClipboardList } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { RoleService } from '@/lib/services/roleService';
import { UserRole, type UserManagementData } from '@/Entities/User';
import { Button } from '@/Components/ui/button';
import { Skeleton, TableSkeleton } from '@/Components/ui/skeleton';
import { EmptyState } from '@/Components/ui/empty-state';
import { useToast } from '@/Components/ui/toast';
import { RoleManager } from './RoleManager';
import { AuditLogViewer } from './AuditLogViewer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/Components/ui/tabs";
import { cn } from '@/lib/utils';
import { ErrorMessage } from '@/Components/ui/error-message';
import { LoadingState } from '@/Components/ui/loading-state';
import { ErrorRecoveryAction, type RecoverableError } from '@/lib/services/errorHandlingService';

/**
 * UserManagement Dashboard Component
 * 
 * Administrative interface for managing all users with:
 * - User list with search and filtering
 * - Role assignment interface with confirmation dialogs
 * - User activity monitoring
 * - Bulk operation controls
 */
export function UserManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserManagementData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recoverableError, setRecoverableError] = useState<RecoverableError | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showRoleManager, setShowRoleManager] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof UserManagementData;
    direction: 'asc' | 'desc';
  }>({ key: 'created_at', direction: 'desc' });

  // Fetch users on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  // Fetch users from the API
  const fetchUsers = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    setRecoverableError(null);
    
    try {
      const userData = await RoleService.getAllUsersForManagement(user.id);
      setUsers(userData);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      
      // Create recoverable error for the UI
      setRecoverableError({
        type: 'query_error',
        message: 'Failed to load users',
        technicalDetails: err instanceof Error ? err.message : 'Unknown error',
        recoveryActions: [
          ErrorRecoveryAction.RETRY,
          ErrorRecoveryAction.REFRESH
        ],
        context: {
          operation: 'fetch_users',
          timestamp: Date.now()
        }
      });
      
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle error recovery actions
  const handleErrorAction = (action: ErrorRecoveryAction) => {
    switch (action) {
      case ErrorRecoveryAction.RETRY:
        fetchUsers();
        break;
      case ErrorRecoveryAction.REFRESH:
        window.location.reload();
        break;
      default:
        setRecoverableError(null);
    }
  };

  // Handle role change for a single user
  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    if (!user) return;
    
    setActionInProgress(`role-change-${userId}`);
    
    try {
      await RoleService.changeUserRole(userId, newRole, user.id);
      
      // Update local state
      setUsers(prevUsers => 
        prevUsers.map(u => 
          u.id === userId ? { ...u, role: newRole } : u
        )
      );
      
      // Get user name for more specific feedback
      const userName = users.find(u => u.id === userId)?.name || 'User';
      toast.success(`${userName}'s role updated to ${newRole}`);
    } catch (err) {
      console.error('Failed to update role:', err);
      
      // Create recoverable error for the UI
      setRecoverableError({
        type: 'role_change_error',
        message: err instanceof Error ? err.message : 'Failed to update user role',
        technicalDetails: err instanceof Error ? err.stack : undefined,
        recoveryActions: [
          ErrorRecoveryAction.RETRY,
          ErrorRecoveryAction.CANCEL
        ],
        context: {
          operation: 'role_change',
          userId,
          timestamp: Date.now()
        }
      });
    } finally {
      setActionInProgress(null);
    }
  };

  // Handle bulk role change
  const handleBulkRoleChange = async (newRole: UserRole) => {
    if (!user || selectedUsers.length === 0) return;
    
    setActionInProgress('bulk-role-change');
    
    try {
      const result = await RoleService.bulkRoleUpdate(
        { 
          users: selectedUsers.map(id => ({ userId: id, role: newRole })),
          notifyUsers: true
        },
        user.id
      );
      
      if (result.success) {
        // Update local state
        setUsers(prevUsers => 
          prevUsers.map(u => 
            selectedUsers.includes(u.id) ? { ...u, role: newRole } : u
          )
        );
        
        toast.success(`Updated ${selectedUsers.length} users to ${newRole} role`, {
          duration: 6000 // Longer duration for important bulk operations
        });
        setSelectedUsers([]);
      } else {
        // Some updates failed
        const failedCount = result.results.filter(r => !r.success).length;
        const successCount = result.results.filter(r => r.success).length;
        
        if (successCount > 0) {
          toast.success(`Successfully updated ${successCount} users to ${newRole} role`);
        }
        
        if (failedCount > 0) {
          toast.warning(`${failedCount} of ${selectedUsers.length} role updates failed`, {
            duration: 8000 // Longer duration for warnings
          });
          
          // Show detailed error for failed updates
          const failedResults = result.results.filter(r => !r.success);
          if (failedResults.length > 0) {
            setRecoverableError({
              type: 'role_change_error',
              message: `Failed to update roles for ${failedCount} users`,
              technicalDetails: failedResults.map(r => `${r.userId}: ${r.message}`).join('\n'),
              recoveryActions: [ErrorRecoveryAction.CANCEL],
              context: {
                operation: 'bulk_role_change',
                timestamp: Date.now()
              }
            });
          }
        }
        
        // Update the ones that succeeded
        const successfulIds = result.results
          .filter(r => r.success)
          .map(r => r.userId);
          
        setUsers(prevUsers => 
          prevUsers.map(u => 
            successfulIds.includes(u.id) ? { ...u, role: newRole } : u
          )
        );
        
        // Clear selection
        setSelectedUsers([]);
      }
    } catch (err) {
      console.error('Failed to update roles in bulk:', err);
      
      // Create recoverable error for the UI
      setRecoverableError({
        type: 'role_change_error',
        message: 'Bulk role update failed',
        technicalDetails: err instanceof Error ? err.message : 'Unknown error',
        recoveryActions: [
          ErrorRecoveryAction.RETRY,
          ErrorRecoveryAction.CANCEL
        ],
        context: {
          operation: 'bulk_role_change',
          timestamp: Date.now()
        }
      });
    } finally {
      setActionInProgress(null);
    }
  };

  // Toggle user selection for bulk operations
  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  // Toggle select all users
  const toggleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(u => u.id));
    }
  };

  // Open role manager for a specific user
  const openRoleManager = (userId: string) => {
    setSelectedUserId(userId);
    setShowRoleManager(true);
  };

  // Handle sorting
  const handleSort = (key: keyof UserManagementData) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Filter and sort users
  const filteredUsers = useMemo(() => {
    return users
      .filter(user => {
        // Apply search filter
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = 
          !searchQuery || 
          user.name?.toLowerCase().includes(searchLower) ||
          user.email.toLowerCase().includes(searchLower) ||
          user.designation?.toLowerCase().includes(searchLower);
        
        // Apply role filter
        const matchesRole = roleFilter === 'all' || user.role === roleFilter;
        
        return matchesSearch && matchesRole;
      })
      .sort((a, b) => {
        const key = sortConfig.key;
        
        // Handle null values
        if (a[key] === null) return sortConfig.direction === 'asc' ? -1 : 1;
        if (b[key] === null) return sortConfig.direction === 'asc' ? 1 : -1;
        
        // Compare values
        if (a[key] < b[key]) return sortConfig.direction === 'asc' ? -1 : 1;
        if (a[key] > b[key]) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
  }, [users, searchQuery, roleFilter, sortConfig]);

  // Get role counts for the filter
  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = { all: users.length };
    
    Object.values(UserRole).forEach(role => {
      counts[role] = users.filter(u => u.role === role).length;
    });
    
    return counts;
  }, [users]);

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Get role badge style
  const getRoleBadgeClass = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case UserRole.PRODUCTION:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case UserRole.SALES_MANAGER:
        return 'bg-green-100 text-green-800 border-green-200';
      case UserRole.FINANCE:
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case UserRole.VIEWER:
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Render loading state
  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">User Management</h1>
          <Skeleton className="h-10 w-24" />
        </div>
        <TableSkeleton rows={8} columns={5} />
      </div>
    );
  }

  // Render error state
  if (error && !recoverableError) {
    return (
      <div className="p-6">
        <EmptyState
          icon={AlertCircle}
          title="Failed to load users"
          description={error}
          action={{
            label: "Try Again",
            onClick: fetchUsers
          }}
        />
      </div>
    );
  }

  // Render empty state
  if (users.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Users}
          title="No users found"
          description="There are no users in the system yet."
          action={{
            label: "Refresh",
            onClick: fetchUsers
          }}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <h1 className="text-2xl font-semibold text-gray-900">User Management</h1>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={fetchUsers}
            variant="outline"
            className="border-amber-200 hover:bg-amber-50"
            title="Refresh user list"
            disabled={loading}
          >
            <RefreshCw className={cn(
              "h-4 w-4 mr-2",
              loading && "animate-spin"
            )} />
            {loading ? "Loading..." : "Refresh"}
          </Button>
        </div>
      </div>
      
      {/* Recoverable Error */}
      {recoverableError && (
        <ErrorMessage 
          error={recoverableError} 
          onAction={handleErrorAction}
          className="mb-4"
        />
      )}
      
      {/* Tabs */}
      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid grid-cols-2 mb-4">
          <TabsTrigger value="users" className="flex items-center">
            <Users className="h-4 w-4 mr-2" />
            Users
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center">
            <ClipboardList className="h-4 w-4 mr-2" />
            Audit Logs
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="users" className="space-y-6">
      
      {/* Search and filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-amber-200 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-2">
          <Button
            onClick={() => setRoleFilter('all')}
            variant={roleFilter === 'all' ? 'default' : 'outline'}
            className={cn(
              roleFilter === 'all' ? 'bg-amber-400 hover:bg-amber-500 text-white' : 'border-amber-200',
              "whitespace-nowrap"
            )}
          >
            All ({roleCounts.all})
          </Button>
          
          {Object.values(UserRole).map(role => (
            <Button
              key={role}
              onClick={() => setRoleFilter(role)}
              variant={roleFilter === role ? 'default' : 'outline'}
              className={cn(
                roleFilter === role ? 'bg-amber-400 hover:bg-amber-500 text-white' : 'border-amber-200',
                "whitespace-nowrap"
              )}
            >
              {role} ({roleCounts[role] || 0})
            </Button>
          ))}
        </div>
      </div>
      
      {/* Bulk actions */}
      {selectedUsers.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-amber-500 mr-2" />
            <span className="text-sm font-medium text-gray-700">
              {selectedUsers.length} {selectedUsers.length === 1 ? 'user' : 'users'} selected
            </span>
          </div>
          
          <div className="flex gap-2">
            <div className="flex items-center">
              <span className="text-sm font-medium text-gray-700 mr-2">Bulk assign role:</span>
              <LoadingState status={actionInProgress === 'bulk-role-change' ? 'loading' : 'idle'}>
                <select
                  onChange={(e) => handleBulkRoleChange(e.target.value as UserRole)}
                  className="border border-amber-200 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  disabled={actionInProgress === 'bulk-role-change'}
                >
                  <option value="">Select role...</option>
                  {Object.values(UserRole).map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </LoadingState>
            </div>
            
            <Button
              onClick={() => setSelectedUsers([])}
              variant="outline"
              className="border-amber-200 text-sm"
              disabled={actionInProgress === 'bulk-role-change'}
            >
              Clear selection
            </Button>
          </div>
        </div>
      )}
      
      {/* Users table */}
      <div className="overflow-x-auto border border-amber-200 rounded-lg shadow-sm">
        <table className="min-w-full divide-y divide-amber-200">
          <thead className="bg-amber-50">
            <tr>
              <th className="px-4 py-3 text-left">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedUsers.length > 0 && selectedUsers.length === filteredUsers.length}
                    onChange={toggleSelectAll}
                    className="rounded border-amber-300 text-amber-500 focus:ring-amber-500"
                  />
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center">
                  User
                  {sortConfig.key === 'name' && (
                    <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('role')}
              >
                <div className="flex items-center">
                  Role
                  {sortConfig.key === 'role' && (
                    <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('last_login')}
              >
                <div className="flex items-center">
                  Last Login
                  {sortConfig.key === 'last_login' && (
                    <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('created_at')}
              >
                <div className="flex items-center">
                  Created
                  {sortConfig.key === 'created_at' && (
                    <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-amber-100">
            {filteredUsers.map(user => (
              <tr key={user.id} className="hover:bg-amber-50">
                <td className="px-4 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(user.id)}
                    onChange={() => toggleUserSelection(user.id)}
                    className="rounded border-amber-300 text-amber-500 focus:ring-amber-500"
                  />
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                      <span className="text-amber-800 font-medium text-sm">
                        {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {user.name || 'Unnamed User'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {user.email}
                      </div>
                      {user.designation && (
                        <div className="text-xs text-gray-500 italic">
                          {user.designation}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <span className={cn(
                    "px-2 py-1 text-xs font-medium rounded-full border",
                    getRoleBadgeClass(user.role)
                  )}>
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(user.last_login)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(user.created_at)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <LoadingState status={actionInProgress === `role-change-${user.id}` ? 'loading' : 'idle'}>
                    <Button
                      onClick={() => openRoleManager(user.id)}
                      variant="outline"
                      className="border-amber-200 text-amber-700 hover:bg-amber-50 mr-2"
                      disabled={!!actionInProgress}
                    >
                      Manage Role
                    </Button>
                  </LoadingState>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* No results */}
      {filteredUsers.length === 0 && (
        <div className="text-center py-8">
          <EmptyState
            icon={Filter}
            title="No matching users"
            description="Try adjusting your search or filter to find what you're looking for."
            action={{
              label: "Clear Filters",
              onClick: () => {
                setSearchQuery('');
                setRoleFilter('all');
              }
            }}
          />
        </div>
      )}
      
      {/* Role Manager Modal */}
      {showRoleManager && selectedUserId && (
        <RoleManager
          userId={selectedUserId}
          onClose={() => {
            setShowRoleManager(false);
            setSelectedUserId(null);
          }}
          onRoleChange={(userId, newRole) => {
            handleRoleChange(userId, newRole);
            setShowRoleManager(false);
            setSelectedUserId(null);
          }}
        />
      )}
        </TabsContent>
        
        <TabsContent value="audit">
          <AuditLogViewer />
        </TabsContent>
      </Tabs>
    </div>
  );
}