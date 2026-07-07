import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Loader2, CheckCircle2, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';

export function getWithdrawalFee(amount: number): number {
  if (amount >= 2000) return 120;
  if (amount >= 1000) return 70;
  if (amount >= 500) return 40;
  if (amount >= 300) return 35;
  if (amount >= 200) return 20;
  if (amount >= 100) return 15;
  if (amount >= 50) return 10;
  return 0;
}

export default function Withdraw() {
  const { user, profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  const [amount, setAmount] = useState('50');
  const [paymentMethod, setPaymentMethod] = useState('bKash');
  const [accountNumber, setAccountNumber] = useState('');
  const [minWithdraw, setMinWithdraw] = useState(50);
 
  const amounts = ['50', '100', '200', '300', '500', '1000', '2000'];

  useEffect(() => {
    // Fetch min withdraw settings if needed
    const loadMinWithdraw = async () => {
      try {
        const { data } = await supabase
          .from('system_settings')
          .select('min_withdraw')
          .eq('id', 1)
          .single();
        if (data && data.min_withdraw !== undefined) {
          setMinWithdraw(Number(data.min_withdraw));
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadMinWithdraw();
  }, []);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !user) return;
    setLoading(true);
    setError('');
    
    try {
      const withdrawAmount = Number(amount);
      if (profile.balance < withdrawAmount) {
        throw new Error('আপনার পর্যাপ্ত ব্যালেন্স নেই!');
      }

      if (withdrawAmount < minWithdraw) {
        throw new Error(`মিনিমাম উইথড্র ${minWithdraw} টাকা`);
      }

      // Call the atomic postgres function to deduct balance and create withdrawal record
      const { data, error: rpcError } = await supabase.rpc('create_withdrawal', {
        target_user_id: profile.id,
        withdraw_amount: withdrawAmount,
        method: paymentMethod,
        account: accountNumber
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      if (data === false) {
        throw new Error('Insufficient balance or error processing withdrawal.');
      }
      
      setSuccess(true);
      await refreshProfile();
    } catch (e: any) {
      setError(e.message || 'Error processing withdrawal');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="w-20 h-20 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center justify-center mb-6 shadow-xl">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-black mb-2">উইথড্র রিকোয়েস্ট সফল হয়েছে!</h2>
        <p className="text-slate-400 text-sm max-w-sm mb-8">
          আপনার টাকা তোলার রিকোয়েস্টটি এডমিন প্যানেলে জমা দেওয়া হয়েছে। সাধারণত ১-২ ঘণ্টার মধ্যে রিভিউ সম্পন্ন করে পেমেন্ট পাঠিয়ে দেওয়া হবে।
        </p>
        <Link to="/" className="w-full max-w-xs flex justify-center py-4 rounded-2xl text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-lg">
          ড্যাশবোর্ডে ফিরে যান (Back to Dashboard)
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 pb-20">
      <header className="p-6 sticky top-0 z-10 flex items-center justify-between backdrop-blur-md bg-slate-950/70 border-b border-slate-900">
        <div className="flex items-center gap-4">
          <Link to="/" className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-2xl shadow-sm transition"><ArrowLeft className="w-5 h-5 text-slate-300" /></Link>
          <h1 className="text-lg font-black text-white">Withdraw Funds (টাকা তুলুন)</h1>
        </div>
        <Link to="/history?filter=withdraw" className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-slate-800">
          হিস্টরি (History)
        </Link>
      </header>

      <div className="p-4 sm:p-6 max-w-lg mx-auto">
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white rounded-3xl p-6 shadow-xl mb-6 relative overflow-hidden border border-indigo-500/20">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full"></div>
          <p className="text-xs font-bold mb-1 opacity-80 uppercase tracking-wider">চলতি ব্যালেন্স (Available Balance)</p>
          <p className="text-3xl font-black flex items-center gap-1">
            <span className="text-xl font-normal text-slate-200">৳</span> {profile?.balance?.toFixed(2) || '0.00'}
          </p>
        </div>

        <form onSubmit={handleWithdraw} className="space-y-6 bg-slate-900/60 border border-slate-850 p-6 rounded-[2rem] shadow-xl">
          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-bold rounded-2xl">
              {error}
            </div>
          )}
          
          <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl text-center space-y-2">
            <p className="text-amber-400 font-black text-sm flex items-center justify-center gap-2">⚡ সুপার ফাস্ট পেমেন্ট</p>
            <p className="text-amber-300/80 text-xs font-bold">⚠️ সঠিক নাম্বার দিন, ভুল নাম্বারে টাকা গেলে কর্তৃপক্ষ দায়ী নয়।</p>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-bold text-slate-300">Select Amount (টাকার পরিমাণ নির্বাচন করুন)</label>
              <span className="text-[10px] font-black text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/25">মিনিমাম উইথড্র {minWithdraw} টাকা</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {amounts.map(amt => (
                <button 
                  type="button" 
                  key={amt} 
                  onClick={() => setAmount(amt)} 
                  className={`py-2.5 rounded-xl border font-bold text-xs transition-all shadow-sm ${amount === amt ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-950 border-slate-850 text-slate-400 hover:border-slate-700'} `}
                >
                  ৳ {amt}
                </button>
              ))}
            </div>
            
            <div className="mt-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3 flex justify-between items-center">
              <span className="text-xs text-slate-400">ফি বাদে আপনি পাবেন:</span>
              <span className="text-sm font-black text-emerald-400">৳{Number(amount) - getWithdrawalFee(Number(amount))}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-2">Payment Method (পেমেন্ট মেথড)</label>
            <div className="grid grid-cols-2 gap-3">
              <button 
                type="button" 
                onClick={() => setPaymentMethod('bKash')} 
                className={`py-3.5 rounded-xl border font-black text-xs transition-all shadow-md ${paymentMethod === 'bKash' ? 'bg-pink-500/10 border-pink-500 text-pink-400' : 'bg-slate-950 border-slate-850 text-slate-400 hover:border-slate-700'}`}
              >
                bKash (বিকাশ)
              </button>
              <button 
                type="button" 
                onClick={() => setPaymentMethod('Nagad')} 
                className={`py-3.5 rounded-xl border font-black text-xs transition-all shadow-md ${paymentMethod === 'Nagad' ? 'bg-orange-500/10 border-orange-500 text-orange-400' : 'bg-slate-950 border-slate-850 text-slate-400 hover:border-slate-700'}`}
              >
                Nagad (নগদ)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-2">Account Number ({paymentMethod})</label>
            <input 
              type="text" 
              required
              value={accountNumber}
              onChange={e => setAccountNumber(e.target.value)}
              placeholder="যেমন: 017XXXXXXXX"
              className="w-full bg-slate-950 border border-slate-850 rounded-2xl px-5 py-4 text-sm text-slate-100 focus:border-indigo-500 outline-none shadow-inner"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading || !accountNumber} 
            className="w-full flex justify-center items-center py-4 px-4 rounded-2xl shadow-xl text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition active:scale-[0.98]"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : `উইথড্র করুন ৳${amount}`}
          </button>
        </form>
      </div>
    </div>
  );
}
