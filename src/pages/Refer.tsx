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

  const setReferrals = (data: any[]) => {
    setReferredUsers(data || []);
  };

  const fetchMyReferrals = async () => {
    try {
      setLoading(true);
      // বর্তমান ইউজারের আইডি বের করা
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // ডাটাবেস থেকে রেফারেল এবং ইউজারের নাম/ইমেইল একসাথে টানা (নিরাপদ উপায়ে)
      const { data, error } = await supabase
        .from('referrals')
        .select(`
          id,
          status,
          created_at,
          profiles!referred_user_id (
            full_name,
            email
          )
        `)
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false }); // নতুনগুলো একদম উপরে দেখাবে

      if (error) throw error;

      // ডেটা সেট করা
      const uniqueReferrals = data?.filter((ref: any, index, self) => {
        const refProfile = Array.isArray(ref.profiles) ? ref.profiles[0] : ref.profiles;
        return index === self.findIndex((t: any) => {
          const tProfile = Array.isArray(t.profiles) ? t.profiles[0] : t.profiles;
          return tProfile?.email === refProfile?.email;
        });
      });
      setReferrals(uniqueReferrals || []);
    } catch (error) {
      console.error('Error fetching referrals:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data: sData } = await supabase
          .from('system_settings')
          .select('*')
          .eq('id', 1)
          .single();

        if (sData) setSettings(sData);
      } catch (e) {
        console.error('Error fetching settings:', e);
      }
    };

    fetchSettings();
    fetchMyReferrals();
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
          <h3 className="text-sm font-black text-white mb-4">আপনার রেফার তালিকা (Referrals)</h3>
          {referredUsers.length === 0 ? (
            <p className="text-xs font-bold text-slate-500 text-center py-4">এখনো কাউকে রেফার করা হয়নি।</p>
          ) : (
            <div className="space-y-3">
              {referredUsers.map((ref: any, i) => {
                const profilesObj = Array.isArray(ref.profiles) ? ref.profiles[0] : ref.profiles;
                const resolvedRef = {
                  ...ref,
                  profiles: profilesObj
                };
                const email = resolvedRef.profiles?.email;
                let maskedEmail = 'Unknown';
                if (email && email.includes('@')) {
                  const [localPart, domain] = email.split('@');
                  if (localPart) {
                    const visibleLen = Math.max(1, Math.min(3, Math.floor(localPart.length / 2)));
                    maskedEmail = localPart.substring(0, visibleLen) + '***@' + domain;
                  } else {
                    maskedEmail = `***@${domain}`;
                  }
                }
                return (
                  <div key={i} className="flex justify-between items-center bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-bold text-slate-300">{resolvedRef.profiles?.full_name || 'Unknown'}</p>
                      <p className="text-[11px] font-mono text-slate-500">
                        {maskedEmail !== 'Unknown' ? maskedEmail : (resolvedRef.profiles?.email || 'Unknown')}
                      </p>
                    </div>
                    <div>
                      {resolvedRef.status === 'Active' ? (
                        <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">এক্টিভ (Active)</span>
                      ) : resolvedRef.status === 'Pending' ? (
                        <span className="text-[10px] font-black text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/20">পেন্ডিং (Pending)</span>
                      ) : (
                        <span className="text-[10px] font-black text-rose-400 bg-rose-500/10 px-3 py-1.5 rounded-full border border-rose-500/20">ব্যর্থ (Expired)</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
