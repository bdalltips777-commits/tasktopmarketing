import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Loader2, Clock, CheckCircle2, XCircle, Copy } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { formatDateTime } from '../lib/dateUtils';

export default function History() {
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();
  const filter = searchParams.get('filter'); // 'gmail', 'fb', 'ig', 'withdraw', or null
  
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!profile) return;
      try {
        let fetchedItems: any[] = [];
        
        // Fetch Submissions if not explicitly requesting withdraw only
        if (!filter || filter === 'gmail' || filter === 'fb' || filter === 'ig' || filter === 'facebook' || filter === 'instagram') {
          let query = supabase.from('submissions').select('*').eq('user_id', profile.id);
          
          if (filter === 'gmail') query = query.eq('type', 'gmail');
          if (filter === 'fb' || filter === 'facebook') query = query.eq('type', 'facebook');
          if (filter === 'ig' || filter === 'instagram') query = query.eq('type', 'instagram');
          
          const { data, error } = await query;
          if (data && !error) {
            fetchedItems = [...fetchedItems, ...data.map(d => ({ ...d, itemCategory: 'submission' }))];
          }
        }

        // Fetch Withdrawals if not explicitly requesting a specific submission type
        if (!filter || filter === 'withdraw') {
          const { data, error } = await supabase.from('withdrawals').select('*').eq('user_id', profile.id);
          if (data && !error) {
            fetchedItems = [...fetchedItems, ...data.map(d => ({ ...d, itemCategory: 'withdrawal' }))];
          }
        }

        // Fetch Micro Jobs
        if (!filter || filter === 'micro_job') {
          const { data, error } = await supabase.from('micro_job_submissions').select('*, micro_jobs(title, reward_amount)').eq('user_id', profile.id);
          if (data && !error) {
            fetchedItems = [...fetchedItems, ...data.map(d => ({ 
              ...d, 
              itemCategory: 'micro_job', 
              job_title: d.micro_jobs?.title || 'Unknown Job',
              reward: d.micro_jobs?.reward_amount || 0
            }))];
          }
        }

        // Fetch Daily Jobs
        if (!filter || filter === 'daily_job') {
          const { data, error } = await supabase.from('daily_job_submissions').select('*, daily_jobs(title, reward_amount)').eq('user_id', profile.id);
          if (data && !error) {
            fetchedItems = [...fetchedItems, ...data.map(d => ({ 
              ...d, 
              itemCategory: 'daily_job', 
              job_title: d.daily_jobs?.title || 'Unknown Job',
              reward: d.daily_jobs?.reward_amount || 0
            }))];
          }
        }
        
        // Sort newest first
        fetchedItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setItems(fetchedItems);

      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [profile, filter]);

  const getTitle = () => {
    if (filter === 'gmail') return 'Gmail History (জিমেইল হিস্টরি)';
    if (filter === 'fb' || filter === 'facebook') return 'Facebook History (ফেসবুক হিস্টরি)';
    if (filter === 'ig' || filter === 'instagram') return 'Instagram History (ইনস্টাগ্রাম হিস্টরি)';
    if (filter === 'withdraw') return 'Withdraw History (উইথড্র হিস্টরি)';
    return 'All History (অল হিস্টরি)';
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 pb-20">
      <header className="p-6 sticky top-0 z-10 flex items-center gap-4 backdrop-blur-md bg-slate-950/70 border-b border-slate-900">
        <Link to={filter ? -1 as any : "/"} className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-2xl shadow-sm transition"><ArrowLeft className="w-5 h-5 text-slate-300" /></Link>
        <h1 className="text-lg font-black text-white">{getTitle()}</h1>
      </header>

      <div className="p-4 sm:p-6 max-w-lg mx-auto space-y-4">
        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center p-12 bg-slate-900 border border-slate-850 rounded-2xl">
            <p className="text-slate-400">কোনো হিস্টোরি পাওয়া যায়নি।</p>
          </div>
        ) : (
          items.map((item) => {
            const isSub = item.itemCategory === 'submission';
            const isMicro = item.itemCategory === 'micro_job';
            const isDaily = item.itemCategory === 'daily_job';
            
            let labelText = '';
            let labelClasses = '';
            
            if (!isSub && !isMicro && !isDaily) {
              labelText = `${item.payment_method} Withdraw`;
              labelClasses = item.payment_method === 'bKash' ? 'bg-[#E2136E]/10 text-[#E2136E] border border-[#E2136E]/20' : 'bg-orange-500/10 text-orange-400 border border-orange-500/20';
            } else if (isMicro) {
              labelText = 'Micro Job';
              labelClasses = 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20';
            } else if (isDaily) {
              labelText = 'Daily Job';
              labelClasses = 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
            } else {
              labelText = `${item.type} Account`;
              labelClasses = item.type === 'gmail' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                             item.type === 'facebook' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                             'bg-pink-500/10 text-pink-400 border border-pink-500/20';
            }

            return (
              <div key={`${item.itemCategory}-${item.id}`} className="bg-slate-900/60 border border-slate-850 p-4 rounded-[1.5rem] shadow-sm">
                <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-3">
                  <div className="flex flex-col gap-1">
                    <span className={`px-2.5 py-1 text-[10px] w-max font-black uppercase tracking-wider rounded-md ${labelClasses}`}>
                      {labelText}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono font-medium">
                      {formatDateTime(item.created_at)}
                    </span>
                  </div>
                  
                  <div className="flex flex-col items-end gap-1.5">
                    <span className="text-sm font-black text-slate-200">
                      ৳{isSub ? item.price_at_submission : (!isMicro && !isDaily ? item.amount : item.reward)}
                    </span>
                    {item.status === 'Pending' && <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-1 rounded-full"><Clock className="w-3 h-3" /> Pending</span>}
                    {item.status === 'Approved' && <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-1 rounded-full"><CheckCircle2 className="w-3 h-3" /> Approved</span>}
                    {item.status === 'Rejected' && <span className="flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-400/10 border border-rose-400/20 px-2 py-1 rounded-full"><XCircle className="w-3 h-3" /> Rejected</span>}
                  </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  {(!isSub && !isMicro && !isDaily) ? (
                    <div className="text-xs font-mono text-slate-300">
                      <p><span className="text-orange-400/80 mr-2">Account:</span> {item.account_number}</p>
                    </div>
                  ) : (isMicro || isDaily) ? (
                    <div className="text-xs font-mono text-slate-300">
                      <p><span className={`${isMicro ? 'text-indigo-400/80' : 'text-amber-400/80'} mr-2`}>Title:</span> {item.job_title}</p>
                      <p className="mt-1 break-words"><span className={`${isMicro ? 'text-indigo-400/80' : 'text-amber-400/80'} mr-2`}>Proof:</span> {item.proof_text}</p>
                    </div>
                  ) : (
                    <div className="text-xs font-mono text-slate-300 space-y-1">
                      {item.type === 'gmail' && (
                        <>
                          <p><span className="text-indigo-400/80 mr-2">Email:</span> {item.credentials_json.email}</p>
                          <p><span className="text-indigo-400/80 mr-2">Pass:</span> {item.credentials_json.password}</p>
                        </>
                      )}
                      {(item.type === 'facebook' || item.type === 'instagram') && (
                        <>
                          <p><span className="text-indigo-400/80 mr-2">Identifier:</span> {item.credentials_json.identifier || item.credentials_json.fbUid || item.credentials_json.igUid}</p>
                          <p><span className="text-indigo-400/80 mr-2">Pass:</span> {item.credentials_json.password || item.credentials_json.fbPassword || item.credentials_json.igPassword}</p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
