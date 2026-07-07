import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Loader2, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';

export default function MicroJob() {
  const { profile } = useAuth();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('micro_jobs')
        .select('*')
        .eq('status', true)
        .order('created_at', { ascending: false });

      if (data && !error) {
        setJobs(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitProof = async (e: React.FormEvent, jobId: string) => {
    e.preventDefault();
    if (!profile) return;
    
    const form = e.target as HTMLFormElement;
    const proofText = (form.elements.namedItem('proof') as HTMLInputElement).value;
    
    if (!proofText.trim()) return;

    setSubmittingId(jobId);
    try {
      const { error } = await supabase.from('micro_job_submissions').insert({
        user_id: profile.id,
        job_id: jobId,
        proof_text: proofText
      });

      if (error) throw new Error(error.message);
      
      alert('Proof submitted successfully! (প্রমাণ জমা দেওয়া হয়েছে)');
      form.reset();
    } catch (e: any) {
      console.error(e);
      alert('Error submitting proof: ' + e.message);
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 pb-20 relative">
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-slate-900 to-transparent -z-10"></div>
      
      <header className="p-6 sticky top-0 z-10 flex items-center justify-between backdrop-blur-md bg-slate-950/70 border-b border-slate-900">
        <div className="flex items-center gap-4">
          <Link to="/" className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-2xl shadow-sm transition"><ArrowLeft className="w-5 h-5 text-slate-300" /></Link>
          <h1 className="text-lg font-black text-white">Micro Jobs (মাইক্রো জব)</h1>
        </div>
      </header>

      <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          </div>
        ) : jobs.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center p-12 bg-slate-900 border border-slate-850 rounded-[2rem] shadow-xl"
          >
            <p className="text-slate-400 font-medium text-lg">আপাতত মাইক্রো জব এর কাজ নেই, সামনে আসছে...</p>
          </motion.div>
        ) : (
          jobs.map((job, idx) => (
            <motion.div 
              key={job.id} 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 shadow-xl"
            >
              <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4 mb-4">
                <div>
                  <h2 className="text-xl font-bold text-white mb-2">{job.title}</h2>
                  <p className="text-sm text-slate-400 whitespace-pre-wrap leading-relaxed">{job.description}</p>
                </div>
                <div className="bg-indigo-500/10 border border-indigo-500/20 px-4 py-2 rounded-xl shrink-0">
                  <p className="text-[10px] text-indigo-400 uppercase font-black tracking-wider mb-0.5 text-center">Reward</p>
                  <p className="text-lg font-bold text-indigo-300">৳{job.reward_amount}</p>
                </div>
              </div>

              <form onSubmit={(e) => handleSubmitProof(e, job.id)} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2">Submit Proof (প্রমাণ জমা দিন)</label>
                  <input 
                    type="text" 
                    name="proof"
                    required
                    placeholder="Enter link or text proof..." 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-indigo-500 transition shadow-inner"
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={submittingId === job.id}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:pointer-events-none text-white font-bold py-3.5 px-4 rounded-xl shadow-lg hover:shadow-indigo-500/20 transition flex items-center justify-center gap-2"
                >
                  {submittingId === job.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  Submit Work
                </button>
              </form>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
