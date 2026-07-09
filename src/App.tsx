import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import AccountSell from './pages/AccountSell';
import MicroJob from './pages/MicroJob';
import GiftCode from './pages/GiftCode';
import Refer from './pages/Refer';
import Profile from './pages/Profile';
import Withdraw from './pages/Withdraw';
import History from './pages/History';
import PendingVerification from './pages/PendingVerification';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Login />} />
          <Route path="/pending-verification" element={<PendingVerification />} />
          
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/sell/:type" element={<AccountSell />} />
            <Route path="/gift-code" element={<GiftCode />} />
            <Route path="/refer" element={<Refer />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/withdraw" element={<Withdraw />} />
            <Route path="/history" element={<History />} />
            <Route path="/micro-jobs" element={<MicroJob />} />
          </Route>

          <Route element={<ProtectedRoute requireAdmin />}>
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin-dashboard" element={<Admin />} />
          </Route>
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
