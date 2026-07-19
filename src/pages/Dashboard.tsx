import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Mail, Facebook, Instagram, Gift, Users, UserCircle, Copy, Check, Loader2, ArrowUpRight, History as HistoryIcon, Briefcase, Send, MessageCircle, Calendar, Trophy } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';

export default function Dashboard() {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [settings, setSettings] = useState<any>({
    gmail_price: 10.00,
    fb_price: 15.00,
    ig_price: 12.00,
    activation_fee: 0.00,
    referral_bonus: 5.00,
    banner_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop',
    fb_status: true,
    ig_status: true,
    referral_domain: 'tasktopmarketing.onrender.com'
  });
  const [loading, setLoading] = useState(true);
  const currentUser = user;

  useEffect(() => {
    const handleReferral = async () => {
      const refCode = localStorage.getItem('referral_code');
      if (refCode && currentUser?.id) {
        try {
          await supabase.rpc('add_referral', {
            p_referrer_id: refCode,
            p_new_user_id: currentUser.id
          });
        } catch (err) {
          console.error('Error adding referral:', err);
        } finally {
          localStorage.removeItem('referral_code'); // Clear it immediately so it only runs once
        }
      }
    };
    if (currentUser?.id) {
      handleReferral();
    }
  }, [currentUser?.id]);

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
        }
      } catch (e) {
        console.error('Error fetching global settings from Supabase:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const siteDomain = settings?.referral_domain || window.location.hostname || 'tasktopmarketing.onrender.com';
  const referralLink = `${window.location.protocol}//${siteDomain}/signup?ref=${profile?.referralCode || ''}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-2" />
        <p className="text-sm font-medium text-slate-400">লোডিং হচ্ছে, অপেক্ষা করুন...</p>
      </div>
    );
  }

  // Cards layout
  const cards = [
    { name: 'Daily Job (ডেইলি জব)', path: '/daily-jobs', icon: Calendar, color: 'text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/20' },
    { name: 'Micro Job (মাইক্রো জব)', path: '/micro-jobs', icon: Briefcase, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
    { name: 'Gmail Sell (জিমেইল বিক্রি)', path: '/sell/gmail', icon: Mail, color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
    { name: 'Facebook Sell (ফেসবুক বিক্রি)', path: '/sell/fb', icon: Facebook, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
    { name: 'Instagram Sell (ইনস্টাগ্রাম বিক্রি)', path: '/sell/ig', icon: Instagram, color: 'text-pink-400 bg-pink-500/10 border-pink-500/20' },
    { name: 'Gift Code', path: '/gift-code', icon: Gift, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
    { name: 'Refer (রেফার)', path: '/refer', icon: Users, color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
    { name: 'Leaderboard (লিডারবোর্ড)', path: '/leaderboard', icon: Trophy, color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
    { name: 'Profile (প্রোফাইল)', path: '/profile', icon: UserCircle, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    { name: 'All History (অল হিস্টরি)', path: '/history', icon: HistoryIcon, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' }
  ];

  return (
    <div className="min-h-screen bg-slate-950 font-sans pb-24 relative overflow-x-hidden text-slate-100">
      {/* Background gradients */}
      <div className="absolute top-0 left-0 w-full h-[32rem] bg-gradient-to-b from-indigo-950 via-slate-950 to-transparent -z-10"></div>
      
      <header className="p-6 pt-12 max-w-lg mx-auto flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-indigo-200 tracking-tight">
            টাস্ক টপ মার্কেটিং
          </h1>
          <p className="text-slate-400 font-bold text-xs mt-0.5">
            স্বাগতম, {profile?.fullName || 'ইউজার'}
          </p>
        </div>
        <button 
          onClick={logout} 
          className="p-3 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-2xl transition shadow-lg text-rose-400"
          title="লগ আউট করুন"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      <main className="px-6 max-w-lg mx-auto space-y-6">
        {/* Total Balance Card */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900/95 backdrop-blur-md p-6 rounded-[2rem] shadow-xl border border-slate-800 flex flex-col justify-between"
        >
          <div className="flex justify-between items-center">
             <div>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-1">মোট ব্যালেন্স (Available Balance)</p>
                <h2 className="text-3xl font-black text-indigo-400 flex items-baseline gap-1">
                  <span className="text-lg font-normal text-slate-300">৳</span> {profile?.balance !== undefined ? profile.balance.toFixed(2) : '0.00'}
                </h2>
             </div>
             <Link 
               to="/withdraw" 
               className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs py-3.5 px-5 rounded-2xl shadow-lg transition-all active:scale-95 flex items-center gap-1"
             >
               Withdraw
               <ArrowUpRight className="w-4 h-4" />
             </Link>
          </div>
        </motion.div>

        {/* Notice Banner */}
        {settings?.banner_url && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="w-full h-36 rounded-[2rem] overflow-hidden shadow-lg border border-slate-850 relative group"
          >
             <img 
               src={settings.banner_url} 
               alt="Notice Banner" 
               className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
               referrerPolicy="no-referrer"
             />
             <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent"></div>
          </motion.div>
        )}

        {/* Scrolling Notice */}
        {settings?.scrolling_notice && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="w-full bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-md flex items-center"
          >
            <div className="bg-indigo-600 px-4 py-2.5 z-10 font-bold text-xs whitespace-nowrap shadow-xl">
              নোটিশ
            </div>
            <div className="overflow-hidden whitespace-nowrap flex-1 py-2.5">
              <div className="inline-block animate-[marquee_15s_linear_infinite] pl-full text-xs font-medium text-slate-200">
                {settings.scrolling_notice}
              </div>
            </div>
          </motion.div>
        )}

        {/* Dynamic Grid of 6 requested options */}
        <motion.div 
           initial={{ opacity: 0, y: 15 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.2 }}
           className="grid grid-cols-2 gap-4"
        >
          {cards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <Link 
                key={card.name} 
                to={card.path} 
                className="bg-slate-800 hover:bg-slate-750 p-4 rounded-xl shadow-md border border-slate-700 flex flex-col items-center justify-center text-center gap-2 transition-all duration-300 hover:-translate-y-1"
              >
                <div className={`w-14 h-14 ${card.color} rounded-2xl flex items-center justify-center shadow-inner border`}>
                  <Icon className="w-8 h-8" />
                </div>
                <span className="font-bold text-white text-xs sm:text-sm tracking-tight">{card.name}</span>
              </Link>
            );
          })}
        </motion.div>

        {/* Go to Admin Dashboard if admin */}
        {profile?.role === 'admin' && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            transition={{ delay: 0.3 }}
          >
             <Link 
               to="/admin" 
               className="block w-full bg-indigo-600 hover:bg-indigo-700 text-white text-center font-black py-4.5 rounded-2xl shadow-xl hover:shadow-indigo-500/10 transition duration-300 border border-indigo-500/30 active:scale-[0.99]"
             >
               Go to Admin Dashboard (অ্যাডমিন প্যানেল)
             </Link>
          </motion.div>
        )}

        {/* Referral Section */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-slate-900/50 border border-slate-850 p-6 rounded-[2rem] shadow-md mt-6 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 -mr-10 -mt-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl"></div>
          <h3 className="text-base font-black text-white mb-1.5 relative z-10">রেফার করে ইনকাম করুন (Share & Earn)</h3>
          <p className="text-xs text-slate-400 font-bold mb-4 relative z-10">
            আপনার বন্ধুদের জিমেইল বিক্রি করতে রেফার করুন এবং প্রতি সফল রেফারেন্সে বোনাস পান ৳{settings?.referral_bonus || '0.00'}!
          </p>
          
          <div className="flex gap-2 relative z-10">
            <input 
              type="text" 
              readOnly 
              value={referralLink} 
              className="flex-1 bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-[10px] font-mono text-indigo-300 outline-none shadow-inner"
            />
            <button 
              onClick={handleCopy}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-xl font-bold shadow-md transition flex items-center justify-center shrink-0"
              title="লিংক কপি করুন"
            >
              {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
        </motion.div>
        {/* Footer Text */}
        <div className="text-center pb-8 pt-4 space-y-4">
          <div className="flex flex-col sm:flex-row justify-center items-center gap-3">
            <a href={settings?.telegram_support_link || '#'} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 px-4 py-2 rounded-xl transition text-sm font-bold w-full sm:w-auto justify-center">
              <Send className="w-4 h-4" /> Telegram Support
            </a>
            <a href={settings?.telegram_channel_link || '#'} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 px-4 py-2 rounded-xl transition text-sm font-bold w-full sm:w-auto justify-center">
              <MessageCircle className="w-4 h-4" /> Telegram Channel
            </a>
          </div>
          <p className="text-xs font-bold text-slate-600">© 2026 Task Top Marketing. All Rights Reserved.</p>
        </div>
      </main>
    </div>
  );
}
