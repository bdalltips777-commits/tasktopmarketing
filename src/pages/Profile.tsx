import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, User, Phone, Mail, Loader2, Key } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';

export default function Profile() {
  const { profile, refreshProfile } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState(profile?.phoneNumber || '');
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setUpdating(true);
    setError('');
    setSuccess(false);

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ phone_number: phoneNumber })
        .eq('id', profile.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      setSuccess(true);
      await refreshProfile();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error updating profile');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans pb-20 relative text-slate-100">
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-slate-900 to-transparent -z-10"></div>
      
      <header className="p-6 sticky top-0 z-10 flex items-center gap-4 backdrop-blur-md bg-slate-950/70 border-b border-slate-900">
        <Link to="/" className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-2xl shadow-sm transition"><ArrowLeft className="w-5 h-5 text-slate-300" /></Link>
        <h1 className="text-lg font-black text-white">My Profile (প্রোফাইল)</h1>
      </header>

      <div className="p-6 max-w-lg mx-auto">
        {/* Profile Card Header */}
        <section className="bg-slate-900/60 backdrop-blur-md border border-slate-850 rounded-[2rem] p-8 shadow-xl flex flex-col items-center mb-6">
          <div className="w-24 h-24 bg-gradient-to-tr from-slate-800 to-indigo-950 rounded-[2rem] border border-slate-800 flex items-center justify-center font-black text-4xl text-indigo-400 shadow-xl mb-6 relative overflow-hidden">
             {profile?.fullName?.charAt(0).toUpperCase() || 'U'}
             <div className="absolute inset-0 bg-white/5"></div>
          </div>
          <h2 className="text-2xl font-black text-white">{profile?.fullName}</h2>
          <p className="text-slate-400 font-bold text-xs mt-0.5">{profile?.email}</p>
          <div className="mt-4 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
             {profile?.role === 'admin' ? 'Administrator' : 'Member'}
          </div>
        </section>

        {/* Profile Form */}
        <section className="bg-slate-900/60 backdrop-blur-md border border-slate-850 rounded-[2rem] p-8 shadow-xl">
          <h3 className="text-base font-black text-white mb-6">Account Details</h3>
          
          <form onSubmit={handleUpdate} className="space-y-5">
            {error && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-bold rounded-2xl">
                {error}
              </div>
            )}
            
            {success && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-2xl">
                প্রোফাইল সফলভাবে আপডেট করা হয়েছে!
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-2">Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                  <User className="w-5 h-5" />
                </div>
                <input 
                  type="text" 
                  readOnly 
                  value={profile?.fullName || ''} 
                  className="w-full bg-slate-950/50 border border-slate-900 rounded-2xl pl-11 pr-4 py-4 text-xs text-slate-500 outline-none font-bold" 
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-2">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-5 h-5" />
                </div>
                <input 
                  type="text" 
                  readOnly 
                  value={profile?.email || ''} 
                  className="w-full bg-slate-950/50 border border-slate-900 rounded-2xl pl-11 pr-4 py-4 text-xs text-slate-500 outline-none font-bold" 
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-2">Referral Code</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                  <Key className="w-5 h-5" />
                </div>
                <input 
                  type="text" 
                  readOnly 
                  value={profile?.referralCode || ''} 
                  className="w-full bg-slate-950/50 border border-slate-900 rounded-2xl pl-11 pr-4 py-4 text-xs text-indigo-400 outline-none font-mono font-bold" 
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-2">Phone Number (মোবাইল নম্বর)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                  <Phone className="w-5 h-5" />
                </div>
                <input 
                  type="text" 
                  value={phoneNumber} 
                  onChange={e => setPhoneNumber(e.target.value)} 
                  placeholder="যেমন: 017XXXXXXXX" 
                  className="w-full bg-slate-950 border border-slate-850 rounded-2xl pl-11 pr-4 py-4 text-xs text-slate-100 outline-none focus:border-indigo-500 transition-all shadow-inner font-bold" 
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={updating} 
              className="w-full py-4 mt-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-lg font-black text-xs active:scale-[0.98] transition flex justify-center items-center"
            >
              {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : 'তথ্য সেভ করুন (Save Changes)'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
