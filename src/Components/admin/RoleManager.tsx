import React, { useState, useEffect } from 'react';
import { UserCheck, Shield, AlertTriangle, X } from 'lucide-react';
import { UserRole, type AuditLogEntry } from '@/Entities/User';
import { RoleService } from '@/lib/services/roleService';
import { Button } from '@/Components/ui/button';
import { Skeleton } from '@/Components/ui/skeleton';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

interface RoleManagerProps {
  userId: string;
  onClose: () => void;
  onRoleChange: (userId: string, newRole: UserRole) => Promise<void>;
}

/**
 * RoleManager Component
 * 
 * Specialized component for role selection and permission preview with:
 * - Role selection dropdown
 * - Permission preview
 * - Confirmation dialogs
 * - Audit trail display
 */
export function RoleManager({ userId, onClose, onRoleChange }: RoleManagerProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole | ''>('');
  const [confirmationStep, setConfirmationStep] = useState(false);
  const [reason, setReason] = useState('');
  const [auditHistory, setAuditHistory] = useState<AuditLogEntry[]>([]);
  const [rolePermissions, setRolePermissions] = useState<Record<UserRole, any[]>>({} as Record<UserRole, any[]>);
  
  // Fetch user data and role permissions on component mount
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      setLoading(true);
      
      try {
        // Get all users to find the target user
        const allUsers = await RoleService.getAllUsersForManagement(user.id);
        const targetUser = allUsers.find(u => u.id === userId);
        
        if (targetUser) {
          setUserData(targetUser);
          setSelectedRole(targetUser.role);
        }
        
        // Get role permissions
        const permissions = RoleService.getAllRolePermissions();
        setRolePermissions(permissions);
        
        // Get audit history
        const history = await RoleService.getRoleChangeHistory(userId);
        setAuditHistory(history);
      } catch (error) {
        console.error('Failed to fetch role data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [userId, user]);
  
  // Handle role change
  const handleRoleChange = async () => {
    if (!selectedRole || selectedRole === userData?.role) {
      return;
    }
    
    try {
      await onRoleChange(userId, selectedRole);
    } catch (error) {
      console.error('Failed to change role:', error);
    }
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
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
  
  // Group permissions by resource
  const groupPermissionsByResource = (permissions: any[]) => {
    const grouped: Record<string, string[]> = {};
    
    permissions.forEach(permission => {
      const { resource, action } = permission;
      
      if (!grouped[resource]) {
        grouped[resource] = [];
      }
      
      grouped[resource].push(action);
    });
    
    return grouped;
  };
  
  // Render loading state
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
              <Skeleton className="h-8 w-48" />
              <Button variant="ghost" disabled>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-40 w-full" />
            <div className="flex justify-end space-x-2">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Render not found state
  if (!userData) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">User Not Found</h2>
              <Button variant="ghost" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <p className="text-gray-600 mb-6">The requested user could not be found.</p>
            <div className="flex justify-end">
              <Button onClick={onClose}>Close</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Manage User Role</h2>
            <Button variant="ghost" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          {/* User info */}
          <div className="flex items-center p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex-shrink-0 h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
              <span className="text-amber-800 font-medium text-lg">
                {userData.name ? userData.name.charAt(0).toUpperCase() : userData.email.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="ml-4">
              <div className="text-lg font-medium text-gray-900">
                {userData.name || 'Unnamed User'}
              </div>
              <div className="text-sm text-gray-500">
                {userData.email}
              </div>
              <div className="mt-1">
                <span className={cn(
                  "px-2 py-1 text-xs font-medium rounded-full border",
                  getRoleBadgeClass(userData.role)
                )}>
                  Current role: {userData.role}
                </span>
              </div>
            </div>
          </div>
          
          {!confirmationStep ? (
            <>
              {/* Role selection */}
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">
                  Select New Role
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                  className="w-full border border-amber-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">Select a role...</option>
                  {Object.values(UserRole).map(role => (
                    <option key={role} value={role} disabled={role === userData.role}>
                      {role} {role === userData.role ? '(current)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Permission comparison */}
              {selectedRole && selectedRole !== userData.role && (
                <div className="space-y-4">
                  <h3 className="text-md font-medium text-gray-700">Permission Changes</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border border-amber-200 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                        <span className={cn(
                          "inline-block w-3 h-3 rounded-full mr-2",
                          getRoleBadgeClass(userData.role).split(' ')[0]
                        )}></span>
                        Current: {userData.role}
                      </h4>
                      
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {rolePermissions[userData.role] && Object.entries(groupPermissionsByResource(rolePermissions[userData.role])).map(([resource, actions]) => (
                          <div key={resource} className="text-xs">
                            <span className="font-medium">{resource}</span>: {actions.join(', ')}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="border border-amber-200 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                        <span className={cn(
                          "inline-block w-3 h-3 rounded-full mr-2",
                          getRoleBadgeClass(selectedRole as UserRole).split(' ')[0]
                        )}></span>
                        New: {selectedRole}
                      </h4>
                      
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {rolePermissions[selectedRole as UserRole] && Object.entries(groupPermissionsByResource(rolePermissions[selectedRole as UserRole])).map(([resource, actions]) => (
                          <div key={resource} className="text-xs">
                            <span className="font-medium">{resource}</span>: {actions.join(', ')}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Reason for change */}
              {selectedRole && selectedRole !== userData.role && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Reason for Change (Optional)
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Enter reason for role change..."
                    className="w-full border border-amber-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    rows={2}
                  />
                </div>
              )}
              
              {/* Audit history */}
              {auditHistory.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-md font-medium text-gray-700">Role Change History</h3>
                  <div className="border border-amber-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-amber-200">
                      <thead className="bg-amber-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Change</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">By</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-amber-100">
                        {auditHistory.map((entry) => (
                          <tr key={entry.id}>
                            <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-500">
                              {formatDate(entry.timestamp)}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-xs">
                              <span className={cn(
                                "px-1.5 py-0.5 text-xs font-medium rounded border",
                                getRoleBadgeClass(entry.old_values.role as UserRole)
                              )}>
                                {entry.old_values.role}
                              </span>
                              {' → '}
                              <span className={cn(
                                "px-1.5 py-0.5 text-xs font-medium rounded border",
                                getRoleBadgeClass(entry.new_values.role as UserRole)
                              )}>
                                {entry.new_values.role}
                              </span>
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-500">
                              {entry.performed_by === 'system' ? 'System' : 'Admin'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {/* Action buttons */}
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="border-amber-200"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (selectedRole && selectedRole !== userData.role) {
                      setConfirmationStep(true);
                    }
                  }}
                  disabled={!selectedRole || selectedRole === userData.role}
                  className="bg-amber-400 hover:bg-amber-500 text-white"
                >
                  Continue
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Confirmation step */}
              <div className="space-y-4">
                <div className="flex items-center p-4 bg-amber-50 border border-amber-300 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-amber-500 mr-3" />
                  <div>
                    <h3 className="font-medium text-gray-900">Confirm Role Change</h3>
                    <p className="text-sm text-gray-600">
                      You are about to change the role of <strong>{userData.name || userData.email}</strong> from <strong>{userData.role}</strong> to <strong>{selectedRole}</strong>.
                      This will modify their permissions and access level.
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    The user will be notified of this change and their permissions will be updated immediately.
                  </p>
                  
                  {selectedRole === UserRole.ADMIN && (
                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                      <p className="text-sm text-purple-800 flex items-center">
                        <Shield className="h-4 w-4 mr-2" />
                        <strong>Warning:</strong> You are granting administrative privileges to this user.
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Action buttons */}
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setConfirmationStep(false)}
                  className="border-amber-200"
                >
                  Back
                </Button>
                <Button
                  onClick={handleRoleChange}
                  className="bg-amber-400 hover:bg-amber-500 text-white"
                >
                  Confirm Role Change
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}