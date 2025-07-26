import React from 'react';
import { useAuth, PermissionGate, usePermissions } from '../../lib/auth';
import { UserRole } from '../../Entities/User';
import { Button } from '../ui/button';

// Example component demonstrating authorization usage
export function AuthExample() {
  const { user, logout } = useAuth();
  const { 
    canCreate, 
    canUpdate, 
    isAdmin, 
    isProduction, 
    isSalesManager, 
    isFinance 
  } = usePermissions();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (!user) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Authentication Required</h2>
        <p className="text-gray-600">Please log in to view this content.</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Authorization Demo</h2>
        <p className="text-gray-600">
          Welcome, {user.name || user.email}! Your role: <span className="font-medium">{user.role}</span>
        </p>
        <Button onClick={handleLogout} variant="outline" className="mt-2">
          Logout
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Role-based content */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Role-based Access</h3>
          
          {isAdmin() && (
            <div className="p-4 bg-red-50 border border-red-200 rounded">
              <h4 className="font-medium text-red-800">Admin Panel</h4>
              <p className="text-red-600 text-sm">You have full system access</p>
            </div>
          )}

          {isProduction() && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded">
              <h4 className="font-medium text-blue-800">Production Dashboard</h4>
              <p className="text-blue-600 text-sm">Manage batches and inventory</p>
            </div>
          )}

          {isSalesManager() && (
            <div className="p-4 bg-green-50 border border-green-200 rounded">
              <h4 className="font-medium text-green-800">Sales Dashboard</h4>
              <p className="text-green-600 text-sm">Manage orders and customers</p>
            </div>
          )}

          {isFinance() && (
            <div className="p-4 bg-purple-50 border border-purple-200 rounded">
              <h4 className="font-medium text-purple-800">Finance Dashboard</h4>
              <p className="text-purple-600 text-sm">Manage invoices and payments</p>
            </div>
          )}
        </div>

        {/* Permission-based content */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Permission-based Actions</h3>
          
          <div className="space-y-2">
            <PermissionGate permission={{ resource: 'order', action: 'create' }}>
              <Button className="w-full">Create Order</Button>
            </PermissionGate>

            <PermissionGate permission={{ resource: 'batch', action: 'create' }}>
              <Button className="w-full">Create Production Batch</Button>
            </PermissionGate>

            <PermissionGate permission={{ resource: 'invoice', action: 'create' }}>
              <Button className="w-full">Create Invoice</Button>
            </PermissionGate>

            <PermissionGate permission={{ resource: 'pricing', action: 'update' }}>
              <Button className="w-full">Update Pricing</Button>
            </PermissionGate>
          </div>

          <div className="text-sm text-gray-600 space-y-1">
            <p>Can create orders: {canCreate('order') ? '✅' : '❌'}</p>
            <p>Can update inventory: {canUpdate('inventory') ? '✅' : '❌'}</p>
            <p>Can create invoices: {canCreate('invoice') ? '✅' : '❌'}</p>
            <p>Can update pricing: {canUpdate('pricing') ? '✅' : '❌'}</p>
          </div>
        </div>
      </div>

      {/* Permission gates with fallback content */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Conditional Content</h3>
        
        <PermissionGate 
          roles={[UserRole.ADMIN, UserRole.FINANCE]}
          fallback={
            <div className="p-4 bg-gray-50 border border-gray-200 rounded">
              <p className="text-gray-600">Financial data access restricted</p>
            </div>
          }
        >
          <div className="p-4 bg-amber-50 border border-amber-200 rounded">
            <h4 className="font-medium text-amber-800">Financial Summary</h4>
            <p className="text-amber-600 text-sm">Revenue, costs, and profit margins</p>
          </div>
        </PermissionGate>

        <PermissionGate 
          roles={[UserRole.ADMIN, UserRole.PRODUCTION]}
          fallback={
            <div className="p-4 bg-gray-50 border border-gray-200 rounded">
              <p className="text-gray-600">Production data access restricted</p>
            </div>
          }
        >
          <div className="p-4 bg-amber-50 border border-amber-200 rounded">
            <h4 className="font-medium text-amber-800">Production Metrics</h4>
            <p className="text-amber-600 text-sm">Batch yields and efficiency</p>
          </div>
        </PermissionGate>
      </div>
    </div>
  );
}