import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate, useSearchParams, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  Loader2, 
  Mail, 
  Lock,
  User,
  Facebook, 
  Instagram, 
  Youtube, 
  MessageSquare, 
  ShieldCheck, 
  CheckCircle2, 
  Globe,
  Wallet,
  Music,
  Eye,
  EyeOff,
  Users,
  Briefcase,
  Calendar
} from 'lucide-react';
import { motion } from 'motion/react';

export default function Login() {
  const { user, signInWithEmail, signUpWithEmail, authError } = useAuth();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [isRegister, setIsRegister] = useState(location.pathname === '/signup');
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal states for Footer
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  // Suspended account states
  const [showSuspendedModal, setShowSuspendedModal] = useState(false);
  const [telegramSupport, setTelegramSupport] = useState('https://t.me/support');
  const [telegramChannel, setTelegramChannel] = useState('https://t.me/channel');

  useEffect(() => {
    // Grab the ref ID from the URL using standard web API
    const urlParams = new URLSearchParams(window.location.search);
    const refId = urlParams.get('ref');
    
    if (refId) {
      localStorage.setItem('referral_code', refId);
      setReferralCode(refId);

      // Resolve the referral code to a UUID if it is not already a UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(refId)) {
        const resolveCode = async () => {
          try {
            const { data } = await supabase
              .from('profiles')
              .select('id')
              .eq('referral_code', refId.toUpperCase().trim());
            if (data && data.length > 0) {
              localStorage.setItem('referral_code', data[0].id);
            }
          } catch (err) {
            console.error('Error resolving referral code:', err);
          }
        };
        resolveCode();
      }
    }

    // Fetch Telegram channel and support URLs
    const fetchTelegramLinks = async () => {
      try {
        const { data, error } = await supabase
          .from('system_settings')
          .select('telegram_support_link, telegram_channel_link')
          .eq('id', 1)
          .single();
        if (data && !error) {
          if (data.telegram_support_link) setTelegramSupport(data.telegram_support_link);
          if (data.telegram_channel_link) setTelegramChannel(data.telegram_channel_link);
        }
      } catch (err) {
        console.error('Error fetching Telegram links:', err);
      }
    };
    fetchTelegramLinks();
  }, [searchParams]);

  if (user) return <Navigate to="/" replace />;

  const getBengaliError = (errMessage: string) => {
    const msg = errMessage.toLowerCase();
    if (msg.includes('confirm') || msg.includes('unconfirmed') || msg.includes('not confirmed') || msg.includes('verification')) {
      return 'আপনার ইমেইলটি এখনো ভেরিফাই করা হয়নি (Email not confirmed)! দয়া করে আপনার ইমেইল ইনবক্স চেক করে অ্যাকাউন্টটি কনফার্ম করুন। অথবা যদি আপনি অ্যাডমিন/ডেভেলপার হয়ে থাকেন, তাহলে Supabase থেকে "Confirm email" অপশনটি বন্ধ করুন।';
    }
    if (msg.includes('invalid login credentials') || msg.includes('incorrect password') || msg.includes('invalid credential') || msg.includes('cannot find user')) {
      return 'ইমেইল অথবা পাসওয়ার্ড ভুল হয়েছে। দয়া করে সঠিক তথ্য দিন।';
    }
    if (msg.includes('already registered') || msg.includes('email already in use') || msg.includes('user already exists') || msg.includes('already exists')) {
      return 'এই ইমেইল দিয়ে ইতিমধ্যে একটি অ্যাকাউন্ট তৈরি করা রয়েছে।';
    }
    if (msg.includes('at least 6 characters') || msg.includes('should be at least 6 characters')) {
      return 'নিরাপত্তার স্বার্থে অন্তত ৬ অক্ষরের পাসওয়ার্ড ব্যবহার করুন।';
    }
    if (msg.includes('rate limit')) {
      return 'খুব বেশি চেষ্টা করা হয়েছে। দয়া করে কিছুক্ষণ পর আবার চেষ্টা করুন।';
    }
    return errMessage;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    setSuccess('');
    setLoading(true);

    if (!email.trim() || !password) {
      setError('দয়া করে সবগুলো ফিল্ড পূরণ করুন।');
      setLoading(false);
      return;
    }

    if (isRegister) {
      if (!fullName.trim()) {
        setError('দয়া করে আপনার সম্পূর্ণ নাম লিখুন।');
        setLoading(false);
        return;
      }
      if (password.length < 6) {
        setError('পাসওয়ার্ডটি অন্তত ৬ অক্ষরের হতে হবে।');
        setLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        setError('পাসওয়ার্ড দুটি মেলেনি। আবার চেষ্টা করুন।');
        setLoading(false);
        return;
      }

      try {
        const urlParams = new URLSearchParams(window.location.search);
        const refId = urlParams.get('ref');

        const refVal = referralCode.trim() || refId?.trim() || localStorage.getItem('referred_by_code')?.trim() || '';
        let resolvedReferrerId: string | null = null;
        
        if (refVal) {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (uuidRegex.test(refVal)) {
            resolvedReferrerId = refVal;
          } else {
            try {
              const { data: profileByCode } = await supabase
                .from('profiles')
                .select('id')
                .eq('referral_code', refVal.toUpperCase().trim());
              if (profileByCode && profileByCode.length > 0) {
                resolvedReferrerId = profileByCode[0].id;
              }
            } catch (err) {
              console.error('Error resolving referral code to user ID:', err);
            }
          }
        }

        // Execute the registration passing the resolved resolvedReferrerId
        const data = await signUpWithEmail(email.trim(), password, fullName.trim(), resolvedReferrerId);

        // STRICT RULE: You must ONLY insert a row into the referrals table IF AND ONLY IF supabase.auth.signUp() is 100% successful and returns a valid user without any errors.
        if (!data || !data.user) {
          throw new Error('Registration failed to return a valid user profile.');
        }

        if (refVal) {
          localStorage.removeItem('referred_by_code');
        }

        setSuccess('রেজিস্ট্রেশন সফল হয়েছে! এখন আপনি লগইন করতে পারবেন।');
        setIsRegister(false);
        setPassword('');
        setConfirmPassword('');
      } catch (err: any) {
        console.error(err);
        setError(getBengaliError(err.message || 'রেজিস্ট্রেশন করতে সমস্যা হয়েছে।'));
      } finally {
        setLoading(false);
      }
    } else {
      try {
        await signInWithEmail(email.trim(), password);
      } catch (err: any) {
        console.error(err);
        if (err.message === 'ACCOUNT_SUSPENDED') {
          setShowSuspendedModal(true);
        } else {
          setError(getBengaliError(err.message || 'লগইন করতে সমস্যা হয়েছে।'));
        }
      } finally {
        setLoading(false);
      }
    }
  };

  const platforms = [
    { name: 'Gmail Work', icon: Mail, color: 'from-rose-500 to-red-600', text: 'জিমেইলের কাজ' },
    { name: 'Facebook Work', icon: Facebook, color: 'from-blue-600 to-indigo-600', text: 'ফেসবুকের কাজ' },
    { name: 'Instagram Work', icon: Instagram, color: 'from-pink-500 to-purple-600', text: 'ইন্সটাগ্রামের কাজ' },
    { name: 'Micro Job', icon: Briefcase, color: 'from-emerald-500 to-teal-600', text: 'মাইক্রো জব' },
    { name: 'Daily Job', icon: Calendar, color: 'from-amber-500 to-orange-600', text: 'ডেইলি জব' }
  ];

  return (
    <div className="min-h-screen bg-slate-950 font-sans selection:bg-indigo-500 selection:text-white flex flex-col items-center justify-center relative overflow-hidden p-4 sm:p-6 md:p-12">
      {/* Background decoration elements */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(99,102,241,0.15),transparent_50%)] z-0"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(236,72,153,0.12),transparent_50%)] z-0"></div>
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-thread-light.png')] opacity-20 z-0"></div>
      
      {/* Glowing Orbs */}
      <div className="absolute top-10 left-10 w-72 h-72 rounded-full bg-indigo-500/10 blur-[120px] z-0 animate-pulse"></div>
      <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-emerald-500/10 blur-[150px] z-0 animate-pulse" style={{ animationDuration: '8s' }}></div>

      <main className="relative z-10 w-full max-w-4xl my-auto">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="bg-slate-900/80 backdrop-blur-2xl border border-slate-800/80 shadow-2xl rounded-[2.5rem] p-6 sm:p-10 md:p-12 text-center overflow-hidden relative"
        >
          {/* Subtle neon light on top edge */}
          <div className="absolute top-0 left-1/4 right-1/4 h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent"></div>

          {/* Top Bangladeshi Trust Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/30 shadow-sm backdrop-blur-md">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="text-xs font-bold text-emerald-300">🇧🇩 ১০০% বিশ্বস্ত বাংলাদেশি প্ল্যাটফর্ম</span>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-950/80 border border-indigo-500/30 shadow-sm backdrop-blur-md">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-xs font-bold text-indigo-300">সুপারফাস্ট অটোমেটিক পেমেন্ট</span>
            </div>
          </div>

          {/* Heading with gorgeous typography and Bangladesh touch */}
          <h1 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-200 to-slate-100 tracking-tight leading-tight mb-2">
            Task Top Marketing
          </h1>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-indigo-400 mb-6 flex items-center justify-center gap-2">
            টাস্ক টপ মার্কেটিং
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed max-w-2xl mx-auto mb-8">
            আমাদের সাথে যুক্ত হয়ে ঘরে বসেই নিশ্চিত আয় করুন। জিমেইল, ফেসবুক ও ইনস্টাগ্রাম অ্যাকাউন্ট বিক্রি করে বিশ্বস্ততার সাথে পেমেন্ট বুঝে নিন।
          </p>

          {/* Authentication Form Block */}
          <div className="max-w-md mx-auto mb-10 bg-slate-950/60 border border-slate-800 p-6 sm:p-8 rounded-3xl shadow-xl text-left">
            <h3 className="text-lg font-black text-white mb-6 text-center border-b border-slate-800 pb-3 flex items-center justify-center gap-2">
              {isRegister ? 'নতুন অ্যাকাউন্ট খুলুন (Sign Up)' : 'লগইন করুন (Log In)'}
            </h3>

            {error && (
              <div className="mb-4 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-bold rounded-xl space-y-2">
                <div>{error}</div>
                {(error.toLowerCase().includes('confirm') || error.toLowerCase().includes('ভেরিফাই')) && (
                  <div className="mt-3 pt-3 border-t border-rose-500/20 text-slate-300 font-normal space-y-2">
                    <p className="text-yellow-400 font-black">🛠️ ডেভেলপারদের জন্য সমাধান (Quick Fix for Developer):</p>
                    <p>সরাসরি ইমেইল ও পাসওয়ার্ড দিয়ে তাৎক্ষণিক অ্যাকাউন্ট তৈরি ও লগইনের জন্য নিচের কাজগুলো করুন:</p>
                    <ol className="list-decimal list-inside pl-1 space-y-1 text-[11px]">
                      <li>আপনার <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-indigo-400 underline hover:text-indigo-300 font-bold">Supabase Dashboard</a>-এ প্রবেশ করুন।</li>
                      <li>বাম পাশের মেনু থেকে <strong className="text-white">Authentication</strong>-এ যান।</li>
                      <li>মেনু থেকে <strong className="text-white">Providers</strong> এবং তারপর <strong className="text-white">Email</strong> নির্বাচন করুন।</li>
                      <li>সেখান থেকে <strong className="text-amber-400 font-bold">"Confirm email"</strong> অপশনটি <strong className="text-rose-400 font-bold">বন্ধ (Disable)</strong> করে দিন।</li>
                      <li>নিচে স্ক্রল করে <strong className="text-white">Save</strong> বাটনে ক্লিক করুন। এরপর সরাসরি যেকোনো ইমেইল দিয়ে ইনস্ট্যান্ট লগইন কাজ করবে!</li>
                    </ol>
                  </div>
                )}
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-xl">
                {success}
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-4">
              {isRegister && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">সম্পূর্ণ নাম (Full Name)</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                      <User className="w-4 h-4" />
                    </span>
                    <input 
                      type="text" 
                      required
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      placeholder="আপনার নাম লিখুন"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-xs sm:text-sm text-slate-100 focus:border-indigo-500 outline-none transition font-bold"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">ইমেইল ঠিকানা (Email Address)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Email address"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-xs sm:text-sm text-slate-100 focus:border-indigo-500 outline-none transition font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">পাসওয়ার্ড (Password)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    minLength={6}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-11 pr-12 py-3 text-xs sm:text-sm text-slate-100 focus:border-indigo-500 outline-none transition font-bold"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {isRegister && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5">পাসওয়ার্ড নিশ্চিত করুন (Confirm Password)</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                        <Lock className="w-4 h-4" />
                      </span>
                      <input 
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-11 pr-12 py-3 text-xs sm:text-sm text-slate-100 focus:border-indigo-500 outline-none transition font-bold"
                      />
                      <button 
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-slate-300"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5">রেফার কোড (Referral Code) - Optional</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                        <Users className="w-4 h-4" />
                      </span>
                      <input 
                        type="text" 
                        value={referralCode}
                        onChange={e => setReferralCode(e.target.value)}
                        placeholder="Referred by"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-xs sm:text-sm text-slate-100 focus:border-indigo-500 outline-none transition font-bold uppercase"
                      />
                    </div>
                  </div>
                </>
              )}

              <button 
                type="submit" 
                disabled={loading} 
                className="w-full flex items-center justify-center gap-2 py-3.5 mt-2 rounded-xl text-xs sm:text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-lg disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : isRegister ? 'অ্যাকাউন্ট তৈরি করুন' : 'লগইন করুন'}
              </button>
            </form>

            <div className="mt-6 text-center border-t border-slate-800 pt-4">
              <button 
                onClick={() => {
                  setIsRegister(!isRegister);
                  setError('');
                  setSuccess('');
                }}
                className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition"
              >
                {isRegister ? 'আগে থেকে অ্যাকাউন্ট আছে? লগইন করুন' : 'অ্যাকাউন্ট নেই? সাইন আপ করুন'}
              </button>
            </div>
          </div>

          {/* Service items beautiful grid representation */}
          <div className="mb-10">
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-4">আমাদের প্রধান সার্ভিস ও কাজের মাধ্যম সমূহ</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {platforms.map((p, idx) => {
                const Icon = p.icon;
                return (
                  <motion.div
                    key={p.name}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    whileHover={{ y: -4, scale: 1.03 }}
                    className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-800/40 border border-slate-700/50 hover:bg-slate-800/70 hover:border-indigo-500/30 transition-all duration-300"
                  >
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${p.color} text-white flex items-center justify-center shadow-md mb-2`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-extrabold text-white mb-0.5">{p.name}</span>
                    <span className="text-[10px] text-slate-400 font-bold">{p.text}</span>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Key trust bullets container */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto mb-10 text-left bg-slate-950/50 p-5 rounded-3xl border border-slate-800/50">
            <div className="flex items-center gap-2.5 text-slate-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className="text-xs sm:text-sm font-bold">ইনস্ট্যান্ট বিকাশ ও নগদ পেমেন্ট</span>
            </div>
            <div className="flex items-center gap-2.5 text-slate-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className="text-xs sm:text-sm font-bold">মিনিমাম উইথড্র মাত্র ৫০ টাকা (৳৫০)</span>
            </div>
            <div className="flex items-center gap-2.5 text-slate-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className="text-xs sm:text-sm font-bold">১২-২৪ ঘণ্টার মধ্যে নিশ্চিত পেমেন্ট</span>
            </div>
            <div className="flex items-center gap-2.5 text-slate-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className="text-xs sm:text-sm font-bold">১০০% সিকিউরড অ্যাকাউন্ট ডিলিং</span>
            </div>
          </div>
          
          <div className="pt-8 border-t border-slate-800/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400 font-bold">
            <span className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5 text-indigo-400" /> ১০০% বিশ্বস্ত ও নিরাপদ আর্নিং সাইট</span>
            <span className="flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5 text-indigo-400" /> মিনিমাম উইথড্র মাত্র ৫০ টাকা</span>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-4xl mt-auto pb-6 flex items-center justify-center gap-4 text-xs font-bold text-slate-500">
        <button onClick={() => setShowTermsModal(true)} className="hover:text-slate-300 transition">Terms &amp; Conditions (শর্তাবলী)</button>
        <span>•</span>
        <button onClick={() => setShowPrivacyModal(true)} className="hover:text-slate-300 transition">Privacy Policy (গোপনীয়তা নীতি)</button>
      </footer>

      {/* Terms & Conditions Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-6 relative overflow-hidden">
            <h3 className="text-xl sm:text-2xl font-black text-indigo-400 border-b border-slate-800 pb-4">Terms &amp; Conditions (শর্তাবলী)</h3>
            <div className="space-y-4 text-sm text-slate-300 font-bold leading-relaxed max-h-[60vh] overflow-y-auto pr-2">
              <p>১. একটি কাজ বা মাইক্রো জব শুধুমাত্র একবারই সাবমিট করা যাবে। একই কাজ বা একই স্ক্রিনশট একাধিকবার সাবমিট করা সম্পূর্ণ নিষিদ্ধ।</p>
              <p>২. কোনো ইউজার যদি নিয়ম অমান্য করে একই কাজ বা ভুয়া তথ্য একাধিকবার সাবমিট করেন, তবে কোনো নোটিশ ছাড়াই তার অ্যাকাউন্টটি স্থায়ীভাবে ব্লক (Block) করা হবে এবং ওয়ালেটের ব্যালেন্স বাতিল করা হবে।</p>
              <p>৩. জিমেইল, ফেসবুক বা ইনস্টাগ্রাম অ্যাকাউন্ট বিক্রির সময় অবশ্যই সঠিক ইউজারনেম এবং পাসওয়ার্ড দিতে হবে। ভুল বা ভুয়া তথ্য দিলে সাবমিশন সরাসরি রিজেক্ট করা হবে।</p>
              <p>৪. পেমেন্ট সাধারণত ১ থেকে ২ ঘণ্টার মধ্যে নিশ্চিত করা হয়, তবে টেকনিক্যাল সমস্যার কারণে সর্বোচ্চ ২৪ ঘণ্টা পর্যন্ত সময় লাগতে পারে।</p>
            </div>
            <button
              onClick={() => setShowTermsModal(false)}
              className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700/50 text-slate-300 py-3 rounded-xl text-sm font-bold transition active:scale-[0.98]"
            >
              বন্ধ করুন (Close)
            </button>
          </div>
        </div>
      )}

      {/* Privacy Policy Modal */}
      {showPrivacyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-6 relative overflow-hidden">
            <h3 className="text-xl sm:text-2xl font-black text-emerald-400 border-b border-slate-800 pb-4">Privacy Policy (গোপনীয়তা নীতি)</h3>
            <div className="space-y-4 text-sm text-slate-300 font-bold leading-relaxed max-h-[60vh] overflow-y-auto pr-2">
              <p>১. আমাদের প্ল্যাটফর্মে আপনার অ্যাকাউন্ট খোলার জন্য প্রদানকৃত ইমেইল, পাসওয়ার্ড এবং সাবমিট করা অ্যাকাউন্টসমূহের ক্রেডেনশিয়াল সম্পূর্ণ গোপন ও সুরক্ষিত রাখা হয়।</p>
              <p>২. আপনার কোনো ব্যক্তিগত তথ্য বা পাসওয়ার্ড কোনো তৃতীয় পক্ষের কাছে শেয়ার বা বিক্রি করা হয় না।</p>
              <p>৩. ডাটাবেজে (Supabase) সংরক্ষিত আপনার সমস্ত তথ্য শুধুমাত্র অ্যাডমিন কর্তৃক ভেরিফিকেশন এবং সফলভাবে পেমেন্ট সম্পন্ন করার কাজে ব্যবহৃত হয়।</p>
              <p>৪. আপনার অ্যাকাউন্টের নিরাপত্তা বজায় রাখতে আপনার পাসওয়ার্ডটি অত্যন্ত সুরক্ষিতভাবে হ্যাশ (Hash) করে সংরক্ষণ করা হয়।</p>
            </div>
            <button
              onClick={() => setShowPrivacyModal(false)}
              className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700/50 text-slate-300 py-3 rounded-xl text-sm font-bold transition active:scale-[0.98]"
            >
              বন্ধ করুন (Close)
            </button>
          </div>
        </div>
      )}

      {/* Suspended Account Popup Modal */}
      {showSuspendedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-6 relative overflow-hidden">
            {/* Red top border highlight */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-rose-500"></div>
            
            <div className="w-16 h-16 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto shadow-lg animate-bounce">
              <span className="text-3xl">❌</span>
            </div>
            
            <div className="space-y-3">
              <h3 className="text-xl sm:text-2xl font-black text-rose-400">আপনার অ্যাকাউন্টটি সাসপেন্ড করা হয়েছে!</h3>
              <p className="text-xs sm:text-sm text-slate-300 font-bold leading-relaxed">
                নিয়ম লঙ্ঘনের কারণে আপনার অ্যাকাউন্টটি সাময়িকভাবে বন্ধ করা হয়েছে। বিস্তারিত জানতে বা অ্যাকাউন্ট সচল করতে আমাদের সাথে যোগাযোগ করুন।
              </p>
            </div>

            {/* Side-by-side Contact Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <a
                href={telegramChannel}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 px-3 rounded-2xl text-xs font-black transition active:scale-[0.98] shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/30"
              >
                📢 টেলিগ্রাম চ্যানেল
              </a>
              <a
                href={telegramSupport}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-600 text-white py-3.5 px-3 rounded-2xl text-xs font-black transition active:scale-[0.98] shadow-md shadow-sky-500/10 hover:shadow-sky-500/30"
              >
                🛠️ টেলিগ্রাম সাপোর্ট
              </a>
            </div>

            {/* Dismiss Button */}
            <button
              type="button"
              onClick={() => setShowSuspendedModal(false)}
              className="w-full bg-slate-800 hover:bg-slate-755 border border-slate-700/50 text-slate-300 py-3 rounded-xl text-xs font-bold transition active:scale-[0.98]"
            >
              বন্ধ করুন (Close)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
