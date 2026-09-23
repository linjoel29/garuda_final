import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { OrdersPage } from './pages/OrdersPage';
import { VehiclesPage } from './pages/VehiclesPage';
import { RouteGeneratePage } from './pages/RouteGeneratePage';
import { RouteDetailPage } from './pages/RouteDetailPage';
import { RouteHistoryPage } from './pages/RouteHistoryPage';
import { SettingsPage } from './pages/SettingsPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <Routes>
        {/* Public Auth Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected Dispatcher Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/vehicles" element={<VehiclesPage />} />
          <Route path="/routes/generate" element={<RouteGeneratePage />} />
          <Route path="/routes/history" element={<RouteHistoryPage />} />
          <Route path="/routes/:id" element={<RouteDetailPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        {/* Default Catch-all */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  );
};
