import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Loader2, Trophy, Medal, Crown, Star, Sparkles } from 'lucide-react';
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
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 pb-24 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[500px] bg-[radial-gradient(ellipse_at_top,rgba(234,179,8,0.15),transparent_70%)] -z-10 pointer-events-none"></div>
      <div className="absolute top-20 left-1/4 w-96 h-96 bg-yellow-500/5 blur-[120px] rounded-full -z-10 animate-pulse pointer-events-none"></div>

      <header className="p-6 sticky top-0 z-40 flex items-center justify-between backdrop-blur-xl bg-slate-950/70 border-b border-slate-900/80 shadow-sm">
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-2xl shadow-sm transition active:scale-95">
            <ArrowLeft className="w-5 h-5 text-slate-300" />
          </Link>
          <div className="flex flex-col">
            <h1 className="text-xl font-black text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" /> 
              Leaderboard
            </h1>
            <p className="text-[10px] text-yellow-500/80 uppercase tracking-widest font-bold">Top Referrers</p>
          </div>
        </div>
      </header>

      <div className="px-4 sm:px-6 pt-8 pb-12 max-w-3xl mx-auto space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-20 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-yellow-500" />
            <p className="text-slate-500 font-medium animate-pulse">Loading rankings...</p>
          </div>
        ) : leaders.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center p-12 bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-[2.5rem] shadow-2xl relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03),transparent)]"></div>
            <Trophy className="w-20 h-20 text-slate-700 mx-auto mb-6" />
            <h3 className="text-2xl font-black text-white mb-2">No Leaders Yet</h3>
            <p className="text-slate-400 font-medium text-base leading-relaxed max-w-xs mx-auto">
              এখনো কেউ লিডারবোর্ডে নেই। বেশি বেশি রেফার করে লিডারবোর্ডে প্রথম স্থান দখল করুন!
            </p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {leaders.map((leader, idx) => {
              const isFirst = idx === 0;
              const isSecond = idx === 1;
              const isThird = idx === 2;

              let cardBg = "bg-slate-900/80";
              let borderColor = "border-slate-800";
              let badgeColor = "text-slate-500";
              let shadow = "shadow-lg";
              
              if (isFirst) {
                cardBg = "bg-gradient-to-br from-yellow-900/20 to-slate-900 border-yellow-500/30";
                borderColor = "border-yellow-500/50";
                badgeColor = "text-yellow-400";
                shadow = "shadow-2xl shadow-yellow-900/20";
              } else if (isSecond) {
                cardBg = "bg-gradient-to-br from-slate-800/40 to-slate-900 border-slate-400/20";
                borderColor = "border-slate-400/30";
                badgeColor = "text-slate-300";
                shadow = "shadow-xl shadow-slate-900/50";
              } else if (isThird) {
                cardBg = "bg-gradient-to-br from-amber-900/20 to-slate-900 border-amber-700/20";
                borderColor = "border-amber-700/30";
                badgeColor = "text-amber-600";
                shadow = "shadow-xl shadow-amber-900/10";
              }

              return (
                <motion.div 
                  key={leader.id} 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.08, type: "spring", stiffness: 300, damping: 24 }}
                  className={`relative overflow-hidden rounded-[2rem] border ${borderColor} ${cardBg} ${shadow} backdrop-blur-xl transition-all hover:scale-[1.02] cursor-default`}
                >
                  {isFirst && (
                    <>
                      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-yellow-400 to-transparent opacity-50"></div>
                      <div className="absolute -top-24 -right-24 w-48 h-48 bg-yellow-500/20 blur-[60px] rounded-full pointer-events-none"></div>
                    </>
                  )}
                  {isSecond && <div className="absolute -top-24 -right-24 w-48 h-48 bg-slate-400/10 blur-[60px] rounded-full pointer-events-none"></div>}
                  {isThird && <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-600/10 blur-[60px] rounded-full pointer-events-none"></div>}
                  
                  <div className={`p-4 ${isFirst ? 'sm:p-8' : 'sm:p-5'} flex items-center gap-4 sm:gap-6 relative z-10`}>
                    
                    {/* Rank Badge */}
                    <div className={`shrink-0 flex items-center justify-center ${isFirst ? 'w-16 h-16 sm:w-20 sm:h-20 bg-yellow-500/10 border border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.2)]' : isSecond ? 'w-12 h-12 sm:w-14 sm:h-14 bg-slate-400/10 border border-slate-400/20' : isThird ? 'w-12 h-12 sm:w-14 sm:h-14 bg-amber-700/10 border border-amber-700/20' : 'w-12 h-12 bg-slate-950 border border-slate-800'} rounded-2xl`}>
                      {isFirst ? <Crown className={`w-8 h-8 sm:w-10 sm:h-10 ${badgeColor} drop-shadow-md`} /> :
                       isSecond ? <Medal className={`w-6 h-6 sm:w-7 sm:h-7 ${badgeColor}`} /> :
                       isThird ? <Medal className={`w-6 h-6 sm:w-7 sm:h-7 ${badgeColor}`} /> :
                       <span className={`text-xl sm:text-2xl font-black ${badgeColor}`}>#{idx + 1}</span>}
                    </div>
                    
                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      {isFirst && (
                        <div className="flex items-center gap-1.5 mb-1">
                          <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
                          <span className="text-[10px] sm:text-xs font-black text-yellow-500 uppercase tracking-widest">Champion (Gold)</span>
                        </div>
                      )}
                      {isSecond && (
                        <div className="flex items-center gap-1.5 mb-1">
                          <Sparkles className="w-3.5 h-3.5 text-slate-300" />
                          <span className="text-[10px] sm:text-xs font-black text-slate-300 uppercase tracking-widest">Runner Up (Silver)</span>
                        </div>
                      )}
                      {isThird && (
                        <div className="flex items-center gap-1.5 mb-1">
                          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                          <span className="text-[10px] sm:text-xs font-black text-amber-600 uppercase tracking-widest">Second Runner Up (Bronze)</span>
                        </div>
                      )}
                      <h3 className={`${isFirst ? 'text-lg sm:text-2xl text-white' : 'text-base sm:text-lg text-slate-200'} font-black truncate drop-shadow-sm`}>
                        {leader.name}
                      </h3>
                    </div>
                    
                    {/* Score */}
                    <div className={`shrink-0 flex flex-col items-center justify-center ${isFirst ? 'bg-yellow-500/10 border border-yellow-500/20 px-5 py-3 sm:px-8 sm:py-4' : 'bg-slate-950/50 border border-slate-800/50 px-4 py-2 sm:px-5 sm:py-3'} rounded-2xl text-center`}>
                      <p className={`text-[10px] sm:text-xs ${isFirst ? 'text-yellow-500/80' : 'text-slate-500'} font-black uppercase tracking-wider mb-0.5 sm:mb-1`}>
                        Referrals
                      </p>
                      <p className={`${isFirst ? 'text-2xl sm:text-4xl text-yellow-400' : 'text-xl sm:text-2xl text-slate-300'} font-black drop-shadow-sm flex items-center gap-1`}>
                        {leader.referrals}
                        {isFirst && <Star className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500 fill-yellow-500 opacity-80" />}
                      </p>
                    </div>

                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
