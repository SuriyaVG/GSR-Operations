import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import React, { useEffect } from "react";
import { seedDatabase } from "./lib/seed";
import { ToastContainer } from "./Components/ui/toast";
import { AuthProvider } from "./lib/auth";

// Import Layout and all Page components
import Layout from "./Pages/Layout";
import Dashboard from "./Pages/Dashboard";
import MaterialIntake from "./Pages/MaterialIntake";
import Production from "./Pages/Production";
import Orders from "./Pages/Orders";
import Customers from "./Pages/Customers";
import Finance from "./Pages/Finance";
import { AuthenticationPage } from "./Components/auth/AuthenticationPage";

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
            {/* Redirect root path to dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* Define a route for each page */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/material-intake" element={<MaterialIntake />} />
            <Route path="/production" element={<Production />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/finance" element={<Finance />} />
          </Route>
        </Routes>
        
        {/* Toast notifications container */}
        <ToastContainer position="top-right" />
      </BrowserRouter>
    </AuthProvider>
  );
} 