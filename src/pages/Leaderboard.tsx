import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Loader2, Trophy, Medal } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';

export default function Leaderboard() {
  const [leaders, setLeaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      // Get the last reset time
      const { data: settingsData } = await supabase
        .from('leaderboard_settings')
        .select('last_reset_at')
        .single();
      
      const resetTime = settingsData?.last_reset_at || '2000-01-01T00:00:00Z';

      // Fetch all Active referrals since resetTime
      const { data: referralsData, error: refError } = await supabase
        .from('referrals')
        .select('referrer_id')
        .eq('status', 'Active')
        .gte('created_at', resetTime);

      if (refError) throw refError;

      // Count referrals by referrer_id
      const counts: Record<string, number> = {};
      referralsData?.forEach((ref: any) => {
        counts[ref.referrer_id] = (counts[ref.referrer_id] || 0) + 1;
      });

      // Get user profiles for the referrers
      const userIds = Object.keys(counts);
      if (userIds.length > 0) {
        const { data: profilesData, error: profError } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);

        if (profError) throw profError;

        // Combine and sort
        const leaderboardData = profilesData?.map(p => ({
          id: p.id,
          name: p.full_name || p.email?.split('@')[0] || 'Unknown User',
          referrals: counts[p.id] || 0
        })).sort((a, b) => b.referrals - a.referrals) || [];

        setLeaders(leaderboardData);
      } else {
        setLeaders([]);
      }
    } catch (e) {
      console.error('Error fetching leaderboard', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 pb-20 relative">
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-yellow-900/40 to-transparent -z-10"></div>
      
      <header className="p-6 sticky top-0 z-10 flex items-center gap-4 backdrop-blur-md bg-slate-950/70 border-b border-slate-900">
        <Link to="/" className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-2xl shadow-sm transition"><ArrowLeft className="w-5 h-5 text-slate-300" /></Link>
        <h1 className="text-lg font-black text-white flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" /> 
          Leaderboard (লিডারবোর্ড)
        </h1>
      </header>

      <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-4">
        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
          </div>
        ) : leaders.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center p-12 bg-slate-900 border border-slate-850 rounded-[2rem] shadow-xl"
          >
            <Trophy className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-400 font-medium text-lg">এখনো কেউ লিডারবোর্ডে নেই। রেফার করে প্রথমে থাকুন!</p>
          </motion.div>
        ) : (
          leaders.map((leader, idx) => (
            <motion.div 
              key={leader.id} 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg flex items-center gap-4 relative overflow-hidden"
            >
              {idx === 0 && <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 blur-[50px] -z-10"></div>}
              {idx === 1 && <div className="absolute top-0 right-0 w-32 h-32 bg-slate-400/10 blur-[50px] -z-10"></div>}
              {idx === 2 && <div className="absolute top-0 right-0 w-32 h-32 bg-amber-700/10 blur-[50px] -z-10"></div>}
              
              <div className="w-12 h-12 shrink-0 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-center relative">
                {idx === 0 ? <Medal className="w-6 h-6 text-yellow-500" /> : 
                 idx === 1 ? <Medal className="w-6 h-6 text-slate-400" /> : 
                 idx === 2 ? <Medal className="w-6 h-6 text-amber-700" /> : 
                 <span className="text-slate-500 font-black text-lg">#{idx + 1}</span>}
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-white truncate">{leader.name}</h3>
              </div>
              
              <div className="shrink-0 bg-slate-950 border border-slate-800 px-4 py-2 rounded-xl text-center">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-0.5">Referrals</p>
                <p className="text-xl font-black text-yellow-500">{leader.referrals}</p>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
