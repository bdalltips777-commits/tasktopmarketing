import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { ShieldAlert, LogOut } from 'lucide-react';

export default function PendingVerification() {
  const { profile, logout } = useAuth();

  // If they are not pending, send them home
  if (profile?.status !== 'Pending') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-500">
        <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <ShieldAlert className="w-8 h-8 text-amber-500" />
        </div>
        <h1 className="text-2xl font-black text-white mb-4">Verification Pending</h1>
        <p className="text-slate-400 text-sm leading-relaxed mb-8">
          Multiple accounts detected from your IP. Your account is pending admin approval.
        </p>
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3.5 rounded-xl transition"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </div>
  );
}
