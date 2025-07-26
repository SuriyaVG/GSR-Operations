import React from 'react';
import { Outlet } from 'react-router-dom';
import { UserRole } from '@/Entities/User';
import { ProtectedRoute } from '@/lib/auth';

/**
 * Admin Page Container
 * 
 * This component serves as a container for all admin pages,
 * ensuring they are protected by the admin role requirement.
 */
export default function Admin() {
  return (
    <ProtectedRoute requiredRoles={[UserRole.ADMIN]}>
      <div className="container mx-auto">
        <Outlet />
      </div>
    </ProtectedRoute>
  );
}