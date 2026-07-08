import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Mail, Facebook, Instagram, Loader2, Info, Copy, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';

export default function AccountSell() {
  const { type } = useParams();
  const { user, profile } = useAuth();
  const isGmail = type === 'gmail';
  const isFb = type === 'fb';
  const isIg = type === 'ig';

  const [settings, setSettings] = useState<any>({
    gmail_price: 10.00,
    gmail_password: 'DefaultPass123',
    fb_price: 15.00,
    fb_password: 'DefaultPass123',
    ig_price: 12.00,
    ig_password: 'DefaultPass123',
    fb_status: true,
    ig_status: true
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    gmailAccount: '',
    gmailPassword: '',
    fbUid: '',
    fbPassword: '',
    fb2FA: '',
    igUsername: '',
    igPassword: '',
    ig2FA: ''
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('system_settings')
          .select('*')
          .eq('id', 1)
          .single();

        if (data && !error) {
          setSettings(data);
          
          // Pre-fill target passwords
          setFormData(prev => ({
            ...prev,
            gmailPassword: isGmail ? (data.gmail_password || '') : prev.gmailPassword,
            fbPassword: isFb ? (data.fb_password || '') : prev.fbPassword,
            igPassword: isIg ? (data.ig_password || '') : prev.igPassword
          }));
        }
      } catch (e) {
        console.error('Error loading global settings:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [isGmail, isFb, isIg]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    setSubmitting(false);
    setSubmitting(true);
    setError('');

    try {
      let submissionType: 'gmail' | 'facebook' | 'instagram' = 'gmail';
      let price = Number(settings?.gmail_price || 0);
      let credentials: any = {};

      if (isFb) {
        submissionType = 'facebook';
        price = Number(settings?.fb_price || 0);
        credentials = {
          identifier: formData.fbUid,
          password: formData.fbPassword,
          twoFAKey: formData.fb2FA,
          profileLink: `https://facebook.com/profile.php?id=${formData.fbUid}`
        };
      } else if (isIg) {
        submissionType = 'instagram';
        price = Number(settings?.ig_price || 0);
        credentials = {
          identifier: formData.igUsername,
          password: formData.igPassword,
          twoFAKey: formData.ig2FA,
          profileLink: `https://instagram.com/${formData.igUsername}`
        };
      } else {
        credentials = {
          email: formData.gmailAccount,
          password: formData.gmailPassword,
          recoveryEmail: 'Not provided'
        };
      }

      const payload = {
        user_id: profile.id,
        type: submissionType,
        credentials_json: credentials,
        price_at_submission: price,
        status: 'Pending'
      };

      const { error: insertError } = await supabase
        .from('submissions')
        .insert(payload);

      if (insertError) {
        throw new Error(insertError.message);
      }

      setSuccess(true);
      setFormData({ gmailAccount: '', gmailPassword: '', fbUid: '', fbPassword: '', fb2FA: '', igUsername: '', igPassword: '', ig2FA: '' });
    } catch (e: any) {
      setError(e.message || 'Error submitting details. Please try again.');
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const isActive = (isFb && settings?.fb_status !== false) || (isIg && settings?.ig_status !== false) || (isGmail && settings?.gmail_status !== false);
  
  let Icon = Mail;
  let color = 'text-rose-400';
  let bg = 'bg-rose-500/10 border-rose-500/20';
  let title = 'Sell Gmail Account';
  let price = settings?.gmail_price;
  let targetPassword = settings?.gmail_password;
  
  if (isFb) {
    Icon = Facebook; color = 'text-blue-400'; bg = 'bg-blue-500/10 border-blue-500/20'; title = 'Sell Facebook Account'; price = settings?.fb_price; targetPassword = settings?.fb_password;
  } else if (isIg) {
    Icon = Instagram; color = 'text-pink-400'; bg = 'bg-pink-500/10 border-pink-500/20'; title = 'Sell Instagram Account'; price = settings?.ig_price; targetPassword = settings?.ig_password;
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="w-20 h-20 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center justify-center mb-6 shadow-xl">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-black mb-2">সফলভাবে সাবমিট হয়েছে!</h2>
        <p className="text-slate-400 text-sm max-w-sm mb-8">
          আপনার তথ্যটি আমাদের অ্যাডমিন প্যানেলে জমা দেওয়া হয়েছে। এডমিন ভেরিফাই করার পর আপনার ব্যালেন্সে টাকা যুক্ত করে দেওয়া হবে।
        </p>
        <Link to="/" className="w-full max-w-xs flex justify-center py-4 rounded-2xl text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-lg">
          ড্যাশবোর্ডে ফিরে যান (Back to Dashboard)
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 font-sans pb-20 relative text-slate-100">
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-slate-900 to-transparent -z-10"></div>
      
      <header className="p-6 sticky top-0 z-10 flex items-center justify-between backdrop-blur-md bg-slate-950/70 border-b border-slate-900">
        <div className="flex items-center gap-4">
          <Link to="/" className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-2xl shadow-sm transition"><ArrowLeft className="w-5 h-5 text-slate-300" /></Link>
          <h1 className="text-lg font-black text-white">{title}</h1>
        </div>
        <Link to={`/history?filter=${isGmail ? 'gmail' : isFb ? 'fb' : 'ig'}`} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition ${bg} ${color} hover:bg-slate-800`}>
          হিস্টরি (History)
        </Link>
      </header>

      <div className="p-6 max-w-lg mx-auto">
        {!isActive ? (
          <div className="flex flex-col items-center justify-center mt-12 text-slate-400 bg-slate-900/60 backdrop-blur-md p-8 rounded-[2rem] border border-slate-800 shadow-xl">
            <div className="w-20 h-20 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full flex items-center justify-center mb-4 shadow-inner">
               <Info className="w-10 h-10" />
            </div>
            <h2 className="text-xl font-black text-slate-200">বর্তমানে এই কাজটি বন্ধ আছে</h2>
            <p className="mt-2 text-xs text-center text-slate-400">Currently this task is closed. দয়া করে কিছুক্ষণ পর আবার চেষ্টা করুন বা অন্য সার্ভিসটি ট্রাই করুন।</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Current Rate Panel */}
            <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-[2rem] shadow-sm border border-slate-850 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 ${bg} ${color} rounded-2xl flex items-center justify-center shadow-inner border`}>
                  <Icon className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold mb-0.5 uppercase tracking-wider">প্রতিটি অ্যাকাউন্টের মূল্য (Current Rate)</p>
                  <p className="text-2xl font-black text-indigo-400">৳ {price || '0.00'}</p>
                </div>
              </div>
            </div>

            {/* Target Password Notice */}
            {targetPassword && (
              <div className="bg-indigo-950/40 backdrop-blur-md border border-indigo-500/20 p-6 rounded-[2rem] flex gap-4 text-xs text-indigo-300 shadow-sm">
                <Info className="w-5 h-5 flex-shrink-0 text-indigo-400 mt-0.5" />
                <div>
                   <p className="font-extrabold mb-2 text-slate-200">অ্যাকাউন্ট তৈরি করার সময় পাসওয়ার্ড অবশ্যই নিচের দেওয়া পাসওয়ার্ডটি ব্যবহার করবেন:</p>
                   <div className="flex items-center gap-2">
                     <span className="bg-slate-950 px-4 py-2.5 rounded-xl font-mono font-bold border border-slate-800 text-indigo-400 select-all tracking-wider text-sm">
                        {targetPassword}
                     </span>
                     <button 
                       onClick={() => {
                         navigator.clipboard.writeText(targetPassword);
                         alert('পাসওয়ার্ড কপি করা হয়েছে!');
                       }} 
                       className="bg-indigo-600/20 hover:bg-indigo-600/40 p-2.5 rounded-xl text-indigo-400 hover:text-indigo-300 border border-indigo-500/10 transition" 
                       title="Copy Password"
                     >
                       <Copy className="w-4 h-4" />
                     </button>
                   </div>
                </div>
              </div>
            )}

            {error && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-2xl text-xs font-bold">
                {error}
              </div>
            )}

            {/* Submit Credentials Form */}
            <form onSubmit={handleSubmit} className="space-y-5 bg-slate-900/60 backdrop-blur-md p-8 rounded-[2rem] shadow-xl border border-slate-850">
              {isFb && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-2">Facebook UID / Email</label>
                    <input 
                      type="text" 
                      required 
                      value={formData.fbUid} 
                      onChange={e => setFormData({...formData, fbUid: e.target.value})}
                      placeholder="Enter UID"
                      className="w-full bg-slate-950 border border-slate-850 rounded-2xl px-5 py-4 font-mono text-sm text-slate-100 focus:border-indigo-500 outline-none transition-all shadow-inner" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-2">Password</label>
                    <input 
                      type="text" 
                      required 
                      value={formData.fbPassword} 
                      onChange={e => setFormData({...formData, fbPassword: e.target.value})}
                      placeholder="Enter password"
                      className="w-full bg-slate-950 border border-slate-850 rounded-2xl px-5 py-4 font-mono text-sm text-slate-100 focus:border-indigo-500 outline-none transition-all shadow-inner" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-2">2FA Secret Key (2FA কোড জেনারেটর কোড)</label>
                    <input 
                      type="text" 
                      required 
                      value={formData.fb2FA} 
                      onChange={e => setFormData({...formData, fb2FA: e.target.value})}
                      placeholder="Enter 2FA Secret Key"
                      className="w-full bg-slate-950 border border-slate-850 rounded-2xl px-5 py-4 font-mono text-sm text-slate-100 focus:border-indigo-500 outline-none transition-all shadow-inner" 
                    />
                  </div>
                </>
              )}

              {isIg && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-2">Instagram Username</label>
                    <input 
                      type="text" 
                      required 
                      value={formData.igUsername} 
                      onChange={e => setFormData({...formData, igUsername: e.target.value})}
                      placeholder="Enter Username"
                      className="w-full bg-slate-950 border border-slate-850 rounded-2xl px-5 py-4 font-mono text-sm text-slate-100 focus:border-indigo-500 outline-none transition-all shadow-inner" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-2">Instagram Password</label>
                    <input 
                      type="text" 
                      required 
                      value={formData.igPassword} 
                      onChange={e => setFormData({...formData, igPassword: e.target.value})}
                      placeholder="Enter password"
                      className="w-full bg-slate-950 border border-slate-850 rounded-2xl px-5 py-4 font-mono text-sm text-slate-100 focus:border-indigo-500 outline-none transition-all shadow-inner" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-2">2FA Secret Key (2FA কোড জেনারেটর কোড)</label>
                    <input 
                      type="text" 
                      required 
                      value={formData.ig2FA} 
                      onChange={e => setFormData({...formData, ig2FA: e.target.value})}
                      placeholder="Enter 2FA Secret Key"
                      className="w-full bg-slate-950 border border-slate-850 rounded-2xl px-5 py-4 font-mono text-sm text-slate-100 focus:border-indigo-500 outline-none transition-all shadow-inner" 
                    />
                  </div>
                </>
              )}

              {isGmail && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-2">Gmail Email Address (জিমেইল এড্রেস)</label>
                    <input 
                      type="email" 
                      required 
                      value={formData.gmailAccount} 
                      onChange={e => setFormData({...formData, gmailAccount: e.target.value})}
                      placeholder="Enter email address"
                      className="w-full bg-slate-950 border border-slate-850 rounded-2xl px-5 py-4 text-sm text-slate-100 focus:border-indigo-500 outline-none transition-all shadow-inner" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-2">Password</label>
                    <input 
                      type="text" 
                      required 
                      value={formData.gmailPassword} 
                      onChange={e => setFormData({...formData, gmailPassword: e.target.value})}
                      placeholder="Enter password"
                      className="w-full bg-slate-950 border border-slate-850 rounded-2xl px-5 py-4 font-mono text-sm text-slate-100 focus:border-indigo-500 outline-none transition-all shadow-inner" 
                    />
                  </div>
                </>
              )}

              <button 
                type="submit" 
                disabled={submitting} 
                className="w-full py-4 mt-8 rounded-2xl font-black text-sm text-white bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-500/10 active:scale-[0.98] transition disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'তথ্য সাবমিট করুন (Submit Details)'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
