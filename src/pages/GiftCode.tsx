import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Gift, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';

export default function GiftCode() {
  const { user, profile, refreshProfile } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [rewardAmount, setRewardAmount] = useState(0);
  const [claimHistory, setClaimHistory] = useState<any[]>([]);

  const fetchClaimHistory = async () => {
    if (!profile) return;
    try {
      const { data, error } = await supabase
        .from('gift_code_claims')
        .select(`
          id,
          claimed_at,
          gift_codes (
            code,
            reward_amount
          )
        `)
        .eq('user_id', profile.id)
        .order('claimed_at', { ascending: false });

      if (error) throw error;
      setClaimHistory(data || []);
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  };

  React.useEffect(() => {
    fetchClaimHistory();
  }, [profile]);

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile || !code.trim()) return;
    setLoading(true);
    setError('');

    try {
      const cleanCode = code.trim().toUpperCase();

      const { data, error } = await supabase.rpc('claim_gift_code_safe', {
        target_user_id: user.id,
        input_code: cleanCode
      });

      if (error) {
        throw new Error(error.message || 'Failed to claim gift code');
      }

      const result = Array.isArray(data) ? data[0] : data;

      if (result && result.success) {
        setRewardAmount(Number(result.reward || result.reward_amount || 0));
        setSuccess(true);
        setCode('');
        await refreshProfile();
        fetchClaimHistory(); // Refresh history
      } else {
        throw new Error(result?.error_message || result?.error || 'Unknown error occurred');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error submitting gift code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="w-20 h-20 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full flex items-center justify-center mb-6 shadow-xl">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-black mb-2">কোড সাবমিট হয়েছে!</h2>
        <p className="text-slate-400 text-sm max-w-sm mb-8">
          অভিনন্দন! আপনি ৳{rewardAmount} টাকা বোনাস পেয়েছেন!
        </p>
        <Link to="/" className="w-full max-w-xs flex justify-center py-4 rounded-2xl text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-lg">
          ড্যাশবোর্ডে ফিরে যান (Back to Dashboard)
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 font-sans pb-20 relative text-slate-100">
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-purple-950/40 to-transparent -z-10"></div>
      
      <header className="p-6 sticky top-0 z-10 flex items-center gap-4 backdrop-blur-md bg-slate-950/70 border-b border-slate-900">
        <Link to="/" className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-2xl shadow-sm transition"><ArrowLeft className="w-5 h-5 text-slate-300" /></Link>
        <h1 className="text-lg font-black text-white">Redeem Gift Code</h1>
      </header>

      <div className="p-6 max-w-lg mx-auto mt-6">
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-850 p-8 rounded-[2rem] shadow-xl text-center">
           <div className="w-24 h-24 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
             <Gift className="w-12 h-12" />
           </div>
           
           <h2 className="text-2xl font-black text-white mb-2">Have a gift code?</h2>
           <p className="text-slate-400 font-medium text-xs mb-8">
             Enter your gift code below. After quick admin verification, the gift reward will be added securely to your balance.
           </p>
           
           {error && (
             <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-bold rounded-2xl">
               {error}
             </div>
           )}

           <form onSubmit={handleRedeem} className="space-y-4">
             <input 
                type="text" 
                value={code} 
                onChange={e => setCode(e.target.value)} 
                placeholder="Enter code here"
                required
                className="w-full bg-slate-950 border border-slate-850 rounded-2xl px-5 py-4 font-mono text-center uppercase text-slate-100 outline-none focus:border-purple-500 transition-all text-sm tracking-wider" 
              />
             <button 
               type="submit" 
               disabled={loading || !code.trim()} 
               className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-purple-500/10 active:scale-[0.98] transition flex items-center justify-center"
             >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'গিফট কোড সাবমিট করুন (Redeem Code)'}
             </button>
           </form>
        </div>

        {/* Claim History Section */}
        <div className="mt-8 bg-slate-900/60 backdrop-blur-md border border-slate-850 p-6 sm:p-8 rounded-[2rem] shadow-xl">
          <h3 className="text-lg font-black text-white mb-6 border-b border-slate-800 pb-4">আপনার ক্লেইম হিস্ট্রি (Claim History)</h3>
          
          {claimHistory.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm font-medium text-slate-500">আপনি এখনও কোনো গিফট কোড ব্যবহার করেননি।</p>
            </div>
          ) : (
            <div className="space-y-3">
              {claimHistory.map((claim) => (
                <div key={claim.id} className="bg-slate-950 border border-slate-850 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="font-mono text-sm font-bold text-slate-200">
                      {claim.gift_codes?.code || 'UNKNOWN_CODE'}
                    </p>
                    <p className="text-[10px] text-slate-500 font-bold mt-1">
                      {new Date(claim.claimed_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-lg text-xs font-black">
                    +৳{claim.gift_codes?.reward_amount || 0}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
