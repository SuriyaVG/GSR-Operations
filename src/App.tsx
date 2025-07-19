import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import React, { useEffect } from "react";
import { seedDatabase } from "./lib/seed";
import { ToastContainer } from "./Components/ui/toast";
import { AuthProvider, ProtectedRoute, useAuth } from "./lib/auth-simple";
import { UserRole } from "./Entities/User";

// Import Layout and all Page components
import Layout from "./Pages/Layout";
import Dashboard from "./Pages/Dashboard";
import MaterialIntake from "./Pages/MaterialIntake";
import Production from "./Pages/Production";
import Orders from "./Pages/Orders";
import Customers from "./Pages/Customers";
import Finance from "./Pages/Finance";
import Admin from "./Pages/Admin";
import Profile from "./Pages/Profile";
import { AuthenticationPage } from "./Components/auth/AuthenticationPage";
import { UserManagement } from "./Components/admin/UserManagement";

// Component to handle root route redirect based on auth state
function RootRedirect() {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
      </div>
    );
  }
  
  // Redirect based on authentication state
  return <Navigate to={user ? "/dashboard" : "/auth"} replace />;
}

export default function App() {
  // Seed the database on initial load
  useEffect(() => {
    seedDatabase();
  }, []);

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Authentication page - accessible without layout */}
          <Route path="/auth" element={<AuthenticationPage />} />
          
          <Route element={<Layout />}>
            {/* Redirect root path based on auth state */}
            <Route path="/" element={<RootRedirect />} />

            {/* Define a route for each page */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/material-intake" element={
              <ProtectedRoute requiredRoles={[UserRole.ADMIN, UserRole.PRODUCTION]}>
                <MaterialIntake />
              </ProtectedRoute>
            } />
            <Route path="/production" element={
              <ProtectedRoute requiredRoles={[UserRole.ADMIN, UserRole.PRODUCTION]}>
                <Production />
              </ProtectedRoute>
            } />
            <Route path="/orders" element={
              <ProtectedRoute requiredRoles={[UserRole.ADMIN, UserRole.SALES_MANAGER, UserRole.FINANCE, UserRole.VIEWER]}>
                <Orders />
              </ProtectedRoute>
            } />
            <Route path="/customers" element={
              <ProtectedRoute requiredRoles={[UserRole.ADMIN, UserRole.SALES_MANAGER, UserRole.FINANCE, UserRole.VIEWER]}>
                <Customers />
              </ProtectedRoute>
            } />
            <Route path="/finance" element={
              <ProtectedRoute requiredRoles={[UserRole.ADMIN, UserRole.FINANCE]}>
                <Finance />
              </ProtectedRoute>
            } />
            
            {/* User profile route - accessible to all authenticated users */}
            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            
            {/* Admin routes */}
            <Route path="/admin" element={<Admin />}>
              <Route path="users" element={<UserManagement />} />
            </Route>
          </Route>
        </Routes>
        
        {/* Toast notifications container */}
        <ToastContainer position="top-right" />
      </BrowserRouter>
    </AuthProvider>
  );
} 