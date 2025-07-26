import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster, toast as sonnerToast } from 'sonner';
import { toast as customToast } from '@/lib/toast';
import { ToastContainer } from '@/Components/ui/toast';

import { AuthProvider, ProtectedRoute, useAuth } from './lib/auth';
import { UserRole } from './Entities/User';

// Import Pages
import Dashboard from './Pages/Dashboard';
import { AuthenticationPage as Login } from './Components/auth/AuthenticationPage';
import MaterialIntake from './Pages/MaterialIntake';
import Production from './Pages/Production';
import Orders from './Pages/Orders';
import Customers from './Pages/Customers';
import Finance from './Pages/Finance';
import Admin from './Pages/Admin';
import Profile from './Pages/Profile';
import NotFound from './Pages/NotFound';
import Layout from './Pages/Layout';

function AppContent() {
  const { user, loading, error, profile } = useAuth();
  const location = useLocation();

  useEffect(() => {
    // Dismiss toasts from both libraries when navigating to a new route
    sonnerToast.dismiss();
    customToast.clear();
  }, [location.pathname]);

  if (loading) {
    return <div className="h-screen w-screen flex items-center justify-center bg-amber-50 text-amber-800">Loading application...</div>;
  }

  if (error) {
    return <div className="h-screen w-screen flex items-center justify-center bg-red-50 text-red-700">Error: {error.message}</div>;
  }
  
  return (
    <Routes>
      <Route path="/auth" element={user ? <Navigate to="/" /> : <Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout profile={profile} />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="material-intake" element={<MaterialIntake />} />
        <Route path="production" element={<Production />} />
        <Route path="orders" element={<Orders />} />
        <Route path="customers" element={<Customers />} />
        <Route path="finance" element={<Finance />} />
        <Route path="profile" element={<Profile />} />
        <Route
          path="admin"
          element={
            <ProtectedRoute roles={[UserRole.ADMIN]}>
              <Admin />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        {/* Sonner toaster for components still using sonner's toast */}
        <Toaster position="top-right" richColors />
        {/* Custom toast container for components using our internal toast service */}
        <ToastContainer position="top-right" />
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
} 