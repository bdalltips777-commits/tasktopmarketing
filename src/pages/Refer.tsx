import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { ArrowLeft, Users, Copy, Check, Loader2, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';

export default function Refer() {
  const { profile } = useAuth();
  const [copied, setCopied] = useState(false);
  const [settings, setSettings] = useState<any>({
    referral_bonus: 5.00,
    referral_domain: 'tasktopmarketing.onrender.com'
  });
  const [loading, setLoading] = useState(true);
  const [referredUsers, setReferredUsers] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: sData } = await supabase
          .from('system_settings')
          .select('*')
          .eq('id', 1)
          .single();

        if (sData) setSettings(sData);

        if (profile?.id) {
          const { data: refUsers } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .eq('referred_by', profile.id);
            
          if (refUsers && refUsers.length > 0) {
            const userIds = refUsers.map(u => u.id);
            const { data: subs } = await supabase
              .from('submissions')
              .select('user_id, type')
              .in('user_id', userIds)
              .eq('type', 'gmail');
              
            const usersWithStatus = refUsers.map(u => {
              const hasGmail = subs?.some(s => s.user_id === u.id);
              const maskEmail = (email: string) => {
                if (!email) return '';
                const parts = email.split('@');
                if (parts.length !== 2) return email;
                return parts[0].substring(0, 3) + '***@' + parts[1];
              };
              return {
                ...u,
                maskedEmail: maskEmail(u.email),
                status: hasGmail ? 'Active' : 'Pending'
              };
            });
            setReferredUsers(usersWithStatus);
          }
        }
      } catch (e) {
        console.error('Error fetching refer data:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [profile]);

  const siteDomain = settings?.referral_domain || window.location.hostname || 'tasktopmarketing.onrender.com';
  const referralLink = `${window.location.protocol}//${siteDomain}/signup?ref=${profile?.referralCode || ''}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 font-sans pb-20 relative text-slate-100">
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-indigo-950/40 to-transparent -z-10"></div>
      
      <header className="p-6 sticky top-0 z-10 flex items-center gap-4 backdrop-blur-md bg-slate-950/70 border-b border-slate-900">
        <Link to="/" className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-2xl shadow-sm transition"><ArrowLeft className="w-5 h-5 text-slate-300" /></Link>
        <h1 className="text-lg font-black text-white">Refer & Earn (রেফার)</h1>
      </header>

      <div className="p-6 max-w-lg mx-auto mt-6 space-y-6">
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-850 p-8 rounded-[2rem] shadow-xl text-center">
           <div className="w-24 h-24 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
             <Users className="w-12 h-12" />
           </div>
           
           <h2 className="text-3xl font-black text-white mb-2">Invite Friends</h2>
           <p className="text-slate-400 font-bold text-xs mb-4">
             আপনার রেফারেল লিংকটি বন্ধুদের সাথে শেয়ার করুন এবং প্রতিটি সফল জিমেইল/ফেসবুক বিক্রিতে লাভ করুন <span className="text-indigo-400 font-extrabold">৳{settings?.referral_bonus || '0.00'}</span> বোনাস!
           </p>

           <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-6 text-left flex items-start gap-2">
             <Info className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
             <p className="text-[11px] font-bold text-amber-300">সফল রেফার হতে একটি জিমেইলের কাজ সম্পূর্ণ করতে হবে।</p>
           </div>
           
           <div className="bg-slate-950 border border-slate-850 rounded-2xl p-4 flex gap-2 items-center">
             <input 
               type="text" 
               readOnly 
               value={referralLink} 
               className="flex-1 bg-transparent text-xs font-mono text-indigo-300 outline-none truncate" 
             />
             <button 
               onClick={handleCopy} 
               className="bg-indigo-600 hover:bg-indigo-700 text-white p-3.5 rounded-xl transition shadow-md shrink-0"
               title="কপি করুন"
             >
                {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
             </button>
           </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-850 p-6 rounded-[2rem] shadow-xl">
          <h3 className="text-sm font-black text-white mb-4">আপনার রেফার তালিকা (Your Referrals)</h3>
          {referredUsers.length === 0 ? (
            <p className="text-xs font-bold text-slate-500 text-center py-4">এখনো কাউকে রেফার করা হয়নি।</p>
          ) : (
            <div className="space-y-3">
              {referredUsers.map((u, i) => (
                <div key={i} className="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div>
                    <p className="text-xs font-bold text-slate-300">{u.full_name || 'Unknown User'}</p>
                    <p className="text-[10px] font-mono text-slate-500">{u.maskedEmail}</p>
                  </div>
                  {u.status === 'Active' ? (
                    <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">এক্টিভ (Active)</span>
                  ) : (
                    <span className="text-[10px] font-black text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">পেন্ডিং (Pending)</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
