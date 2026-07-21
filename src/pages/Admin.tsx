import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Settings, Check, X, Loader2, Copy, Shield, Layers, CreditCard, Image as ImageIcon, Calendar, Search, Edit2, Eye, User, Gift, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { getWithdrawalFee } from './Withdraw';
import { formatDateTime } from '../lib/dateUtils';

export default function Admin() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'settings' | 'submissions' | 'withdrawals' | 'users' | 'micro_jobs' | 'daily_jobs' | 'gift_codes' | 'page_rules'>('settings');
  
  const [settings, setSettings] = useState<any>({
    gmail_price: 10.00,
    gmail_password: 'DefaultPass123',
    fb_price: 15.00,
    fb_password: 'DefaultPass123',
    ig_price: 12.00,
    ig_password: 'DefaultPass123',
    activation_fee: 0.00,
    referral_bonus: 5.00,
    min_withdraw: 50.00,
    banner_url: '',
    scrolling_notice: '',
    fb_status: true,
    ig_status: true,
    referral_domain: 'tasktopmarketing.onrender.com',
    telegram_support_link: '',
    telegram_channel_link: ''
  });
  
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [usersData, setUsersData] = useState<any[]>([]);
  const [microJobs, setMicroJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [submissionsTab, setSubmissionsTab] = useState<'Pending' | 'Approved' | 'Rejected'>('Pending');
  const [submissionSearchQuery, setSubmissionSearchQuery] = useState('');
  const [submissionFilterCategory, setSubmissionFilterCategory] = useState('All');
  const [withdrawalsTab, setWithdrawalsTab] = useState<'Pending' | 'Approved' | 'Rejected'>('Pending');
  const [newJob, setNewJob] = useState({ title: '', description: '', reward_amount: '' });
  const [dailyJobs, setDailyJobs] = useState<any[]>([]);
  const [newDailyJob, setNewDailyJob] = useState({ title: '', description: '', reward_amount: '' });
  const [giftCodes, setGiftCodes] = useState<any[]>([]);
  const [newGiftCode, setNewGiftCode] = useState({ code: '', reward_amount: '', max_uses: '1' });

  // User Management extra states
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editBalanceValue, setEditBalanceValue] = useState<string>('');
  const [viewingUserDetails, setViewingUserDetails] = useState<any | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Page rules states
  const [pageRules, setPageRules] = useState<{gmail: string, facebook: string, instagram: string}>({
    gmail: '', facebook: '', instagram: ''
  });
  const [savingRules, setSavingRules] = useState(false);

  // Confirmation modal states
  const [userToBlock, setUserToBlock] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Helper to show modern toasts
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const { data: sData, error: sErr } = await supabase
        .from('system_settings')
        .select('*')
        .eq('id', 1)
        .single();
      if (sData && !sErr) setSettings(sData);

      const { data: rulesData } = await supabase.from('page_rules').select('*');
      if (rulesData) {
        const rulesMap: any = { gmail: '', facebook: '', instagram: '' };
        rulesData.forEach(r => { rulesMap[r.page_type] = r.rules_text; });
        setPageRules(rulesMap);
      }

      let allSubmissions: any[] = [];
      const { data: subData, error: subErr } = await supabase
        .from('submissions')
        .select(`*, profiles (id, full_name, email, phone_number)`)
        .order('created_at', { ascending: false });

      if (subData && !subErr) {
        allSubmissions.push(...subData.map((sub: any) => ({
          ...sub,
          table_source: 'submissions'
        })));
      }

      const { data: microSubData } = await supabase
        .from('micro_job_submissions')
        .select(`*, profiles (id, full_name, email, phone_number), micro_jobs(title, reward_amount)`)
        .order('created_at', { ascending: false });
      
      if (microSubData) {
        allSubmissions.push(...microSubData.map((sub: any) => ({
          id: sub.id,
          user_id: sub.user_id,
          type: 'microjob',
          credentials_json: JSON.stringify({ proof: sub.proof_text, job_title: sub.micro_jobs?.title }),
          price_at_submission: sub.micro_jobs?.reward_amount || 0,
          status: sub.status,
          created_at: sub.created_at,
          profiles: sub.profiles,
          table_source: 'micro_job_submissions'
        })));
      }

      const { data: dailySubData } = await supabase
        .from('daily_job_submissions')
        .select(`*, profiles (id, full_name, email, phone_number), daily_jobs(title, reward_amount)`)
        .order('created_at', { ascending: false });
      
      if (dailySubData) {
        allSubmissions.push(...dailySubData.map((sub: any) => ({
          id: sub.id,
          user_id: sub.user_id,
          type: 'dailyjob',
          credentials_json: JSON.stringify({ proof: sub.proof_text, job_title: sub.daily_jobs?.title }),
          price_at_submission: sub.daily_jobs?.reward_amount || 0,
          status: sub.status,
          created_at: sub.created_at,
          profiles: sub.profiles,
          table_source: 'daily_job_submissions'
        })));
      }

      const mappedSubs = allSubmissions.map((sub: any) => ({
        id: sub.id,
        user_id: sub.user_id,
        type: sub.type,
        credentials_json: sub.credentials_json,
        price_at_submission: sub.price_at_submission,
        status: sub.status,
        created_at: sub.created_at,
        table_source: sub.table_source,
        user: sub.profiles ? {
          fullName: sub.profiles.full_name || 'Unknown',
          email: sub.profiles.email || 'No email',
          phoneNumber: sub.profiles.phone_number || ''
        } : { fullName: 'Unknown', email: 'unknown' }
      }));
      mappedSubs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setSubmissions(mappedSubs);

      const { data: wData, error: wErr } = await supabase
        .from('withdrawals')
        .select(`*, profiles (id, full_name, email, phone_number)`)
        .order('created_at', { ascending: false });

      if (wData && !wErr) {
        const mappedWiths = wData.map((w: any) => ({
          id: w.id,
          user_id: w.user_id,
          amount: w.amount,
          paymentMethod: w.payment_method,
          accountNumber: w.account_number,
          status: w.status,
          created_at: w.created_at,
          user: w.profiles ? {
            fullName: w.profiles.full_name || 'Unknown',
            email: w.profiles.email || 'No email',
            phoneNumber: w.profiles.phone_number || ''
          } : { fullName: 'Unknown', email: 'unknown' }
        }));
        setWithdrawals(mappedWiths);
      }
      const { data: usersResponse } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (usersResponse) setUsersData(usersResponse);

      const { data: jobsResponse } = await supabase.from('micro_jobs').select('*').order('created_at', { ascending: false });
      if (jobsResponse) setMicroJobs(jobsResponse);

      const { data: dailyJobsResponse } = await supabase.from('daily_jobs').select('*').order('created_at', { ascending: false });
      if (dailyJobsResponse) setDailyJobs(dailyJobsResponse);

      const { data: gcResponse } = await supabase.from('gift_codes').select('*').order('created_at', { ascending: false });
      if (gcResponse) setGiftCodes(gcResponse);
    } catch (e) {
      console.error('Error fetching admin data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleResetLeaderboard = async () => {
    if (!window.confirm('Are you sure you want to reset the leaderboard? This will clear all referral counts displayed on the leaderboard.')) return;
    
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('leaderboard_settings')
        .upsert({ id: 1, last_reset_at: now });
        
      if (error) throw error;
      showToast('Leaderboard has been reset successfully.', 'success');
    } catch (err: any) {
      console.error(err);
      showToast('Error resetting leaderboard: ' + err.message, 'error');
    }
  };

  const handleSettingsChange = (key: string, value: any) => {
    setSettings((prev: any) => ({ ...prev, [key]: value }));
  };
  
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      setUploadingImage(true);

      const { error: uploadError } = await supabase.storage
        .from('banners')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('banners')
        .getPublicUrl(filePath);

      if (data && data.publicUrl) {
        handleSettingsChange('banner_url', data.publicUrl);
        alert('ছবি সফলভাবে আপলোড হয়েছে!');
      }
    } catch (error: any) {
      alert('Error uploading image: ' + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const savePageRules = async () => {
    setSavingRules(true);
    try {
      const updates = [
        { page_type: 'gmail', rules_text: pageRules.gmail, updated_at: new Date().toISOString() },
        { page_type: 'facebook', rules_text: pageRules.facebook, updated_at: new Date().toISOString() },
        { page_type: 'instagram', rules_text: pageRules.instagram, updated_at: new Date().toISOString() }
      ];
      
      const { error } = await supabase.from('page_rules').upsert(updates, { onConflict: 'page_type' });
      if (error) throw error;
      showToast('Page rules saved successfully!', 'success');
    } catch (e: any) {
      showToast(e.message || 'Error saving page rules', 'error');
    } finally {
      setSavingRules(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const payload = {
        id: 1,
        gmail_price: Number(settings.gmail_price || 0),
        gmail_password: settings.gmail_password,
        fb_price: Number(settings.fb_price || 0),
        fb_password: settings.fb_password,
        ig_price: Number(settings.ig_price || 0),
        ig_password: settings.ig_password,
        activation_fee: Number(settings.activation_fee || 0),
        referral_bonus: Number(settings.referral_bonus || 0),
        min_withdraw: Number(settings.min_withdraw || 50.00),
        banner_url: settings.banner_url,
        scrolling_notice: settings.scrolling_notice || '',
        gmail_status: settings.gmail_status !== false,
        fb_status: settings.fb_status !== false,
        ig_status: settings.ig_status !== false,
        referral_domain: settings.referral_domain,
        telegram_support_link: settings.telegram_support_link || '',
        telegram_channel_link: settings.telegram_channel_link || ''
      };

      const { error } = await supabase
        .from('system_settings')
        .upsert(payload);

      if (error) {
        if (error.message.includes('scrolling_notice') || error.message.includes('min_withdraw') || error.message.includes('telegram_') || error.message.includes('gmail_status')) {
          delete (payload as any).scrolling_notice;
          delete (payload as any).min_withdraw;
          delete (payload as any).telegram_support_link;
          delete (payload as any).telegram_channel_link;
          delete (payload as any).gmail_status;
          const { error: fallbackError } = await supabase.from('system_settings').upsert(payload);
          if (fallbackError) throw new Error(fallbackError.message);
          showToast('Settings saved! (Note: run SUPABASE_SETUP.sql to update columns)', 'success');
          return;
        }
        throw new Error(error.message);
      }
      showToast('Settings saved successfully!', 'success');
    } catch (e: any) {
      console.error(e);
      showToast('Error saving settings: ' + e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleApproveSubmission = async (submission: any) => {
    setActioningId(submission.id);
    try {
      if (!submission.table_source || submission.table_source === 'submissions') {
        const { data: approved, error: rpcError } = await supabase.rpc('approve_submission', {
          sub_id: submission.id,
          target_user_id: submission.user_id,
          amount: submission.price_at_submission
        });

        if (rpcError) throw new Error(rpcError.message);
        if (!approved) throw new Error('Submission could not be approved. It may have already been processed.');
      } else {
        const { data: userProfile, error: profileError } = await supabase.from('profiles').select('wallet_balance').eq('id', submission.user_id).single();
        if (profileError) throw profileError;

        const newBalance = Number(userProfile.wallet_balance) + Number(submission.price_at_submission);
        const { error: balanceError } = await supabase.from('profiles').update({ wallet_balance: newBalance }).eq('id', submission.user_id);
        if (balanceError) throw balanceError;

        const { error: subError } = await supabase.from(submission.table_source).update({ status: 'Approved' }).eq('id', submission.id);
        if (subError) throw subError;
      }

      // Fetch strict referral bonus amount from global settings
      const { data: settings } = await supabase.from('system_settings').select('referral_bonus').single();
      const exactBonus = Number(settings?.referral_bonus || 5.00);

      // One-Chance Referral Trigger Direct
      // Check if there is a pending referral record in the referrals table
      let pendingReferral = null;
      const { data: pendingReferrals, error: refError } = await supabase
        .from('referrals')
        .select('*')
        .eq('referred_user_id', submission.user_id)
        .eq('status', 'Pending');

      if (!refError && pendingReferrals && pendingReferrals.length > 0) {
        pendingReferral = pendingReferrals[0];
      } else {
        // If not found in referrals table, check if the user has a referred_by in their profile
        // and create a pending referral record retroactively to process it.
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('referred_by')
          .eq('id', submission.user_id)
          .single();
          
        if (userProfile?.referred_by) {
           // Ensure it hasn't already been processed (no record in referrals means it hasn't)
           // Create it now so we can process it
           const { data: newRef } = await supabase
             .from('referrals')
             .insert({
                referrer_id: userProfile.referred_by,
                referred_user_id: submission.user_id,
                reward_amount: exactBonus,
                status: 'Pending'
             })
             .select()
             .single();
             
           if (newRef) {
             pendingReferral = newRef;
           }
        }
      }

      if (pendingReferral && submission.type === 'gmail') {
        // ATOMIC TRANSACTION VIA DATABASE TRIGGER
        // We set the status to Active AND force the exact reward amount from settings.
        // The trigger 'trigger_referral_update' will safely and atomically add this exact amount 
        // to the referrer's wallet inside a single database transaction.
        const { error: updateError } = await supabase
          .from('referrals')
          .update({ 
            status: 'Active',
            reward_amount: exactBonus
          })
          .eq('referred_user_id', submission.user_id)
          .eq('status', 'Pending');
          
        if (updateError) {
           console.error("Failed to update referral to Active:", updateError);
           // Even if it fails (e.g. missing trigger), don't break the submission approval
        }
      }

      setSubmissions(prev => prev.map(s => s.id === submission.id ? { ...s, status: 'Approved' } : s));
      showToast('Submission approved successfully!', 'success');
    } catch (e: any) {
      console.error('Error approving submission:', e.message);
      showToast('Error approving submission: ' + e.message, 'error');
    } finally {
      setActioningId(null);
    }
  };

  const handleRejectSubmission = async (submission: any) => {
    setActioningId(submission.id);
    try {
      const { error } = await supabase
        .from(submission.table_source || 'submissions')
        .update({ status: 'Rejected' })
        .eq('id', submission.id);

      if (error) throw new Error(error.message);

      // One-Chance Referral Trigger Direct - Expire
      let pendingReferral = null;
      const { data: pendingReferrals, error: refError } = await supabase
        .from('referrals')
        .select('*')
        .eq('referred_user_id', submission.user_id)
        .eq('status', 'Pending');

      if (!refError && pendingReferrals && pendingReferrals.length > 0) {
        pendingReferral = pendingReferrals[0];
      } else {
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('referred_by')
          .eq('id', submission.user_id)
          .single();
          
        if (userProfile?.referred_by) {
           const { data: newRef } = await supabase
             .from('referrals')
             .insert({
                referrer_id: userProfile.referred_by,
                referred_user_id: submission.user_id,
                status: 'Pending'
             })
             .select()
             .single();
             
           if (newRef) {
             pendingReferral = newRef;
           }
        }
      }

      if (pendingReferral && submission.type === 'gmail') {
        const { error: updateError } = await supabase
          .from('referrals')
          .update({ status: 'Expired' })
          .eq('referred_user_id', submission.user_id)
          .eq('status', 'Pending');
          
        if (updateError) {
          console.error("Failed to update referral to Expired:", updateError);
        }
      }

      setSubmissions(prev => prev.map(s => s.id === submission.id ? { ...s, status: 'Rejected' } : s));
      showToast('Submission rejected successfully!', 'success');
    } catch (e: any) {
      console.error('Error rejecting submission:', e.message);
      showToast('Error rejecting submission: ' + e.message, 'error');
    } finally {
      setActioningId(null);
    }
  };

  const handleApproveWithdrawal = async (id: string) => {
    setActioningId(id);
    try {
      // Try using the RPC first for safety and consistency
      const { data, error: rpcError } = await supabase.rpc('approve_withdrawal', {
        withdrawal_id: id
      });

      if (!rpcError && data !== null && data !== false) {
        setWithdrawals(prev => prev.map(w => w.id === id ? { ...w, status: 'Approved' } : w));
        showToast('Withdrawal request approved successfully!', 'success');
      } else {
        // Fallback to direct update if RPC is not available or returned false
        const { error: updateError } = await supabase
          .from('withdrawals')
          .update({ status: 'Approved' })
          .eq('id', id);

        if (updateError) throw new Error(updateError.message);

        setWithdrawals(prev => prev.map(w => w.id === id ? { ...w, status: 'Approved' } : w));
        showToast('Withdrawal request approved successfully!', 'success');
      }
    } catch (e: any) {
      console.error(e);
      showToast('Error approving withdrawal: ' + e.message, 'error');
    } finally {
      setActioningId(null);
    }
  };

  const handleRejectWithdrawal = async (withd: any) => {
    setActioningId(withd.id);
    try {
      // Try using the RPC first for safety and consistency (which refunds the balance)
      const { data, error: rpcError } = await supabase.rpc('reject_withdrawal', {
        withdrawal_id: withd.id,
        target_user_id: withd.user_id,
        refund_amount: Number(withd.amount)
      });

      if (!rpcError && data !== null && data !== false) {
        setWithdrawals(prev => prev.map(w => w.id === withd.id ? { ...w, status: 'Rejected' } : w));
        showToast('Withdrawal request rejected & balance refunded!', 'success');
      } else {
        // Fallback to direct update if RPC is not available or returned false
        const { error: updateError } = await supabase
          .from('withdrawals')
          .update({ status: 'Rejected' })
          .eq('id', withd.id)
          .eq('status', 'Pending');

        if (updateError) throw new Error(updateError.message);
        
        // Refund the balance directly
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('wallet_balance')
          .eq('id', withd.user_id)
          .single();

        if (userProfile) {
          const newBalance = Number(userProfile.wallet_balance || 0) + Number(withd.amount);
          const { error: updateProfileError } = await supabase
            .from('profiles')
            .update({ wallet_balance: newBalance })
            .eq('id', withd.user_id);
            
          if (updateProfileError) {
             console.error("Failed to refund wallet balance:", updateProfileError);
          }
        }

        setWithdrawals(prev => prev.map(w => w.id === withd.id ? { ...w, status: 'Rejected' } : w));
        showToast('Withdrawal rejected! (direct fallback)', 'success');
      }
    } catch (e: any) {
      console.error(e);
      showToast('Error rejecting withdrawal: ' + e.message, 'error');
    } finally {
      setActioningId(null);
    }
  };

  const handleToggleBlock = async (usr: any) => {
    const newStatus = !usr.is_blocked;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_blocked: newStatus })
        .eq('id', usr.id);

      if (!error) {
        setUsersData(usersData.map(u => u.id === usr.id ? { ...u, is_blocked: newStatus } : u));
        showToast(newStatus ? 'User blocked successfully!' : 'User unblocked successfully!', 'success');
      } else {
        showToast('Error updating status: ' + error.message, 'error');
      }
    } catch (err: any) {
      console.error(err);
      showToast('An unexpected error occurred.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewDetails = (usr: any) => {
    const userSubmissions = submissions.filter(s => s.user_id === usr.id);
    const userWithdrawals = withdrawals.filter(w => w.user_id === usr.id);
    
    // Calculate stats
    const totalSubmissions = userSubmissions.length;
    const approvedSubmissions = userSubmissions.filter(s => s.status === 'Approved').length;
    const totalWithdrawals = userWithdrawals.length;
    const approvedWithdrawals = userWithdrawals.filter(w => w.status === 'Approved').length;
    const totalWithdrawnAmount = userWithdrawals
      .filter(w => w.status === 'Approved')
      .reduce((sum, w) => sum + Number(w.amount), 0);

    setViewingUserDetails({
      ...usr,
      totalSubmissions,
      approvedSubmissions,
      totalWithdrawals,
      approvedWithdrawals,
      totalWithdrawnAmount,
      createdAt: usr.created_at
    });
  };

  const handleSaveBalance = async () => {
    if (!editingUser) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ wallet_balance: Number(editBalanceValue) })
        .eq('id', editingUser.id);
      if (!error) {
        setUsersData(usersData.map(u => u.id === editingUser.id ? { ...u, wallet_balance: Number(editBalanceValue) } : u));
        showToast('Wallet balance updated successfully!', 'success');
        setEditingUser(null);
      } else {
        showToast('Failed to update balance: ' + error.message, 'error');
      }
    } catch (err: any) {
      console.error(err);
      showToast('An unexpected error occurred.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {


  return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-12 h-12 animate-spin text-indigo-500 mb-4" />
        <p className="font-medium animate-pulse">Loading Admin Data...</p>
      </div>
    );
  }

  const pendingSubmissionsCount = submissions.filter(s => s.status === 'Pending').length;
    const filteredSubmissions = submissions
    .filter(s => s.status === submissionsTab)
    .filter(s => {
      if (submissionFilterCategory !== 'All') {
        if (s.type.toLowerCase() !== submissionFilterCategory.toLowerCase()) return false;
      }
      if (submissionSearchQuery) {
        const query = submissionSearchQuery.toLowerCase();
        const email = (s.user?.email || '').toLowerCase();
        let dataStr = '';
        try {
           const parsed = typeof s.credentials_json === 'string' ? JSON.parse(s.credentials_json) : s.credentials_json;
           dataStr = Object.values(parsed || {}).join(' ').toLowerCase();
        } catch(e) {
           dataStr = String(s.credentials_json || '').toLowerCase();
        }
        return email.includes(query) || dataStr.includes(query);
      }
      return true;
    });

  const pendingWithdrawalsCount = withdrawals.filter(w => w.status === 'Pending').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans pb-20">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-indigo-400" />
              <h1 className="text-xl font-bold text-white tracking-tight">Admin Dashboard</h1>
            </div>
            <Link to="/dashboard" className="text-xs sm:text-sm text-indigo-400 hover:text-indigo-300 font-medium transition">
              &larr; Back to User Panel
            </Link>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex overflow-x-auto border-t border-slate-800 scrollbar-hide">
          <button onClick={() => setActiveTab('settings')} className={`flex-1 py-4 px-6 text-sm font-bold flex items-center justify-center gap-2 whitespace-nowrap transition border-b-2 ${activeTab === 'settings' ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5' : 'border-transparent text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'}`}>
            <Settings className="w-4 h-4" /> System Settings
          </button>
          <button onClick={() => setActiveTab('submissions')} className={`flex-1 py-4 px-6 text-sm font-bold flex items-center justify-center gap-2 whitespace-nowrap transition border-b-2 ${activeTab === 'submissions' ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5' : 'border-transparent text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'}`}>
            <Layers className="w-4 h-4" /> System Submissions
            {pendingSubmissionsCount > 0 && <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full">{pendingSubmissionsCount}</span>}
          </button>
          <button onClick={() => setActiveTab('withdrawals')} className={`flex-1 py-4 px-6 text-sm font-bold flex items-center justify-center gap-2 whitespace-nowrap transition border-b-2 ${activeTab === 'withdrawals' ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5' : 'border-transparent text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'}`}>
            <CreditCard className="w-4 h-4" /> Withdrawal Requests
            {pendingWithdrawalsCount > 0 && <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full">{pendingWithdrawalsCount}</span>}
          </button>
          <button onClick={() => setActiveTab('users')} className={`flex-1 py-4 px-6 text-sm font-bold flex items-center justify-center gap-2 whitespace-nowrap transition border-b-2 ${activeTab === 'users' ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5' : 'border-transparent text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'}`}>
            <Shield className="w-4 h-4" /> User Management
          </button>
          <button onClick={() => setActiveTab('micro_jobs')} className={`flex-1 py-4 px-6 text-sm font-bold flex items-center justify-center gap-2 whitespace-nowrap transition border-b-2 ${activeTab === 'micro_jobs' ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5' : 'border-transparent text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'}`}>
            <Check className="w-4 h-4" /> Micro Jobs
          </button>
          
          <button onClick={() => setActiveTab('daily_jobs')} className={`flex-1 py-4 px-6 text-sm font-bold flex items-center justify-center gap-2 whitespace-nowrap transition border-b-2 ${activeTab === 'daily_jobs' ? 'border-amber-500 text-amber-400 bg-amber-500/5' : 'border-transparent text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'}`}>
            <Calendar className="w-4 h-4" /> Daily Jobs
          </button>
          <button onClick={() => setActiveTab('gift_codes')} className={`flex-1 py-4 px-6 text-sm font-bold flex items-center justify-center gap-2 whitespace-nowrap transition border-b-2 ${activeTab === 'gift_codes' ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5' : 'border-transparent text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'}`}>
            <Gift className="w-4 h-4" /> Gift Codes
          </button>
          <button onClick={() => setActiveTab('page_rules')} className={`flex-1 py-4 px-6 text-sm font-bold flex items-center justify-center gap-2 whitespace-nowrap transition border-b-2 ${activeTab === 'page_rules' ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5' : 'border-transparent text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'}`}>
            <FileText className="w-4 h-4" /> Page Rules
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Tab 1: System Settings */}
        {activeTab === 'settings' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2 border-b border-slate-800 pb-4">
                <Settings className="w-5 h-5 text-indigo-400" />
                System Configurations
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Banner Management */}
                <div className="md:col-span-2 bg-slate-950/50 p-5 rounded-xl border border-slate-800">
                  <label className="block text-sm font-bold text-slate-300 mb-2 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-indigo-400" /> Banner Image (ব্যানার ইমেজ)
                  </label>
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                    <div className="flex-1 w-full relative">
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleFileUpload}
                        disabled={uploadingImage}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                      />
                      <div className="bg-slate-900 border-2 border-dashed border-slate-700 hover:border-indigo-500 px-4 py-3 rounded-xl w-full text-sm text-slate-400 flex justify-center items-center gap-2 transition cursor-pointer">
                        {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin text-indigo-400" /> : <ImageIcon className="w-4 h-4" />}
                        {uploadingImage ? 'Uploading...' : 'Tap to select an image from gallery'}
                      </div>
                    </div>
                  </div>
                  {settings?.banner_url && (
                    <div className="mt-4 relative rounded-xl overflow-hidden border border-slate-800 max-h-48 group">
                      <img src={settings.banner_url} alt="Banner Preview" className="w-full object-cover object-center" referrerPolicy="no-referrer" />
                    </div>
                  )}
                </div>
                
                {/* Notice Management */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-300 mb-1.5">Scrolling Notice (স্ক্রলিং নোটিশ)</label>
                  <input type="text" placeholder="ব্যবহারকারীদের জন্য গুরুত্বপূর্ণ নোটিশ..." className="bg-slate-950 border border-slate-800 px-4 py-3 rounded-xl w-full focus:border-indigo-500 outline-none text-sm text-slate-200 transition" value={settings?.scrolling_notice || ''} onChange={e => handleSettingsChange('scrolling_notice', e.target.value)} />
                </div>

                {/* Telegram Links */}
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-1.5">Telegram Support Link</label>
                  <input type="text" placeholder="https://t.me/support" className="bg-slate-950 border border-slate-800 px-4 py-3 rounded-xl w-full focus:border-blue-500 outline-none text-sm text-slate-200 transition" value={settings?.telegram_support_link || ''} onChange={e => handleSettingsChange('telegram_support_link', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-1.5">Telegram Channel Link</label>
                  <input type="text" placeholder="https://t.me/channel" className="bg-slate-950 border border-slate-800 px-4 py-3 rounded-xl w-full focus:border-blue-500 outline-none text-sm text-slate-200 transition" value={settings?.telegram_channel_link || ''} onChange={e => handleSettingsChange('telegram_channel_link', e.target.value)} />
                </div>

                {/* Withdraw / Referral Options */}
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-1.5">Referral Bonus (৳)</label>
                  <input type="number" className="bg-slate-950 border border-slate-800 px-4 py-3 rounded-xl w-full focus:border-indigo-500 outline-none text-sm text-slate-200 transition" value={settings?.referral_bonus || 0} onChange={e => handleSettingsChange('referral_bonus', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-1.5">Referral Domain</label>
                  <input type="text" className="bg-slate-950 border border-slate-800 px-4 py-3 rounded-xl w-full focus:border-indigo-500 outline-none text-sm text-slate-200 transition" value={settings?.referral_domain || ''} onChange={e => handleSettingsChange('referral_domain', e.target.value)} />
                </div>

                {/* Task Status Toggles */}
                <div className="md:col-span-2 lg:col-span-3 bg-slate-950/50 p-5 rounded-xl border border-slate-800">
                  <label className="block text-sm font-bold text-slate-300 mb-4 border-b border-slate-800 pb-2">Task Status Controls (টাস্ক চালু/বন্ধ করুন)</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {/* Gmail Toggle */}
                    <div className="flex items-center justify-between bg-slate-900 p-4 rounded-xl border border-slate-800">
                      <div>
                        <p className="text-sm font-bold text-rose-400">Gmail Sell</p>
                        <p className="text-[10px] text-slate-500">{settings?.gmail_status !== false ? 'Active' : 'Closed'}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={settings?.gmail_status !== false} onChange={e => handleSettingsChange('gmail_status', e.target.checked)} />
                        <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                      </label>
                    </div>
                    {/* FB Toggle */}
                    <div className="flex items-center justify-between bg-slate-900 p-4 rounded-xl border border-slate-800">
                      <div>
                        <p className="text-sm font-bold text-blue-400">Facebook Sell</p>
                        <p className="text-[10px] text-slate-500">{settings?.fb_status !== false ? 'Active' : 'Closed'}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={settings?.fb_status !== false} onChange={e => handleSettingsChange('fb_status', e.target.checked)} />
                        <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                      </label>
                    </div>
                    {/* IG Toggle */}
                    <div className="flex items-center justify-between bg-slate-900 p-4 rounded-xl border border-slate-800">
                      <div>
                        <p className="text-sm font-bold text-pink-400">Instagram Sell</p>
                        <p className="text-[10px] text-slate-500">{settings?.ig_status !== false ? 'Active' : 'Closed'}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={settings?.ig_status !== false} onChange={e => handleSettingsChange('ig_status', e.target.checked)} />
                        <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Account Pricing */}
                <div className="bg-slate-950/50 p-5 rounded-xl border border-slate-800">
                  <label className="block text-sm font-bold text-red-400 mb-3 border-b border-slate-800 pb-2">Gmail Settings</label>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Sell Price (৳)</label>
                      <input type="number" className="bg-slate-900 border border-slate-800 px-3 py-2 rounded-lg w-full focus:border-red-500 outline-none text-sm" value={settings?.gmail_price || 0} onChange={e => handleSettingsChange('gmail_price', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Target Password</label>
                      <input type="text" className="bg-slate-900 border border-slate-800 px-3 py-2 rounded-lg w-full focus:border-red-500 outline-none text-sm font-mono" value={settings?.gmail_password || ''} onChange={e => handleSettingsChange('gmail_password', e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-950/50 p-5 rounded-xl border border-slate-800">
                  <label className="block text-sm font-bold text-blue-400 mb-3 border-b border-slate-800 pb-2">Facebook Settings</label>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Sell Price (৳)</label>
                      <input type="number" className="bg-slate-900 border border-slate-800 px-3 py-2 rounded-lg w-full focus:border-blue-500 outline-none text-sm" value={settings?.fb_price || 0} onChange={e => handleSettingsChange('fb_price', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Target Password</label>
                      <input type="text" className="bg-slate-900 border border-slate-800 px-3 py-2 rounded-lg w-full focus:border-blue-500 outline-none text-sm font-mono" value={settings?.fb_password || ''} onChange={e => handleSettingsChange('fb_password', e.target.value)} />
                    </div>
                  </div>
                </div>
                
                <div className="bg-slate-950/50 p-5 rounded-xl border border-slate-800 md:col-span-2 lg:col-span-1">
                  <label className="block text-sm font-bold text-pink-400 mb-3 border-b border-slate-800 pb-2">Instagram Settings</label>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Sell Price (৳)</label>
                      <input type="number" className="bg-slate-900 border border-slate-800 px-3 py-2 rounded-lg w-full focus:border-pink-500 outline-none text-sm" value={settings?.ig_price || 0} onChange={e => handleSettingsChange('ig_price', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Target Password</label>
                      <input type="text" className="bg-slate-900 border border-slate-800 px-3 py-2 rounded-lg w-full focus:border-pink-500 outline-none text-sm font-mono" value={settings?.ig_password || ''} onChange={e => handleSettingsChange('ig_password', e.target.value)} />
                    </div>
                  </div>
                </div>

              </div>

              <div className="flex justify-between items-center pt-6 border-t border-slate-800">
                <button
                  onClick={handleResetLeaderboard}
                  className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 font-bold py-3 px-6 rounded-xl shadow-sm transition active:scale-95"
                >
                  Reset Leaderboard
                </button>
                <button
                  onClick={saveSettings}
                  disabled={saving}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg transition flex items-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Settings className="w-5 h-5" />}
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>

            </div>
          </div>
        )}

        

        {/* Tab 2: Submissions */}
        {activeTab === 'submissions' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex gap-2 border-b border-slate-800 pb-4">
              <button onClick={() => setSubmissionsTab('Pending')} className={`px-4 py-2 rounded-xl text-xs font-bold transition ${submissionsTab === 'Pending' ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>Pending</button>
              <button onClick={() => setSubmissionsTab('Approved')} className={`px-4 py-2 rounded-xl text-xs font-bold transition ${submissionsTab === 'Approved' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>Approved</button>
              <button onClick={() => setSubmissionsTab('Rejected')} className={`px-4 py-2 rounded-xl text-xs font-bold transition ${submissionsTab === 'Rejected' ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>Rejected</button>
            </div>
            
            <div className="flex flex-col md:flex-row gap-4 bg-slate-900/50 p-4 rounded-2xl border border-slate-800/50 mb-6">
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Search by User Email or Submitted Data...</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-slate-500" />
                  </div>
                  <input
                    type="text"
                    value={submissionSearchQuery}
                    onChange={(e) => setSubmissionSearchQuery(e.target.value)}
                    placeholder="Search by Email or Proof..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-indigo-500/50 transition-colors placeholder:text-slate-600"
                  />
                </div>
              </div>
              <div className="w-full md:w-64">
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Category Filter</label>
                <div className="flex flex-wrap gap-1.5">
                  {['All', 'Gmail', 'Facebook', 'Instagram', 'Microjob'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSubmissionFilterCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                        submissionFilterCategory === cat 
                          ? 'bg-slate-700/80 text-white border-slate-600 shadow-sm' 
                          : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-300'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {filteredSubmissions.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
                <Shield className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-400">No {submissionsTab.toLowerCase()} submissions</h3>
              </div>
            ) : (
              filteredSubmissions.map((sub) => {
                let parsedCreds: any = sub.credentials_json;
                try {
                  if (typeof parsedCreds === 'string') {
                    parsedCreds = JSON.parse(parsedCreds);
                  }
                } catch(e) {}
                
                return (

                <div key={sub.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row gap-5 hover:border-slate-700 transition">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`px-2.5 py-1 text-[10px] uppercase tracking-wider font-black rounded-full ${
                        sub.type === 'gmail' ? 'bg-red-500/10 text-red-400' : 
                        sub.type === 'facebook' ? 'bg-blue-500/10 text-blue-400' : 
                        sub.type === 'instagram' ? 'bg-pink-500/10 text-pink-400' :
                        sub.type === 'microjob' ? 'bg-indigo-500/10 text-indigo-400' :
                        'bg-amber-500/10 text-amber-400'
                      }`}>
                        {sub.type} {sub.type === 'microjob' || sub.type === 'dailyjob' ? 'Submission' : 'Account'}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">{formatDateTime(sub.created_at)}</span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Submitted By</p>
                        <p className="text-sm font-semibold text-slate-200">{sub.user?.fullName}</p>
                        <p className="text-xs text-slate-400">{sub.user?.email}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Reward Value</p>
                        <p className="text-lg font-bold text-emerald-400">৳{sub.price_at_submission}</p>
                      </div>
                    </div>

                    <div className="bg-slate-950 rounded-xl p-4 font-mono text-xs text-slate-300 border border-slate-800">
                      <p className="text-[10px] text-slate-500 mb-2 uppercase tracking-wider">Credentials</p>
                      {sub.type === 'gmail' && (
                        <div className="space-y-1">
                          <p className="flex items-center gap-2"><span className="text-indigo-400">Email:</span> {parsedCreds.email} <Copy className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => navigator.clipboard.writeText(parsedCreds.email)} /></p>
                          <p className="flex items-center gap-2"><span className="text-indigo-400">Password:</span> {parsedCreds.password} <Copy className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => navigator.clipboard.writeText(parsedCreds.password)} /></p>
                          <p className="flex items-center gap-2"><span className="text-indigo-400">Recovery:</span> {parsedCreds.recoveryEmail} <Copy className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => navigator.clipboard.writeText(parsedCreds.recoveryEmail)} /></p>
                        </div>
                      )}
                      {sub.type === 'facebook' && (
                        <div className="space-y-1">
                          {parsedCreds.fbUid && (
                            <p className="flex items-center gap-2"><span className="text-indigo-400">User ID (UID):</span> {parsedCreds.fbUid} <Copy className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => navigator.clipboard.writeText(parsedCreds.fbUid)} /></p>
                          )}
                          {parsedCreds.emailPhone && (
                            <p className="flex items-center gap-2"><span className="text-indigo-400">Email/Phone:</span> {parsedCreds.emailPhone} <Copy className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => navigator.clipboard.writeText(parsedCreds.emailPhone)} /></p>
                          )}
                          {!parsedCreds.fbUid && !parsedCreds.emailPhone && (
                            <p className="flex items-center gap-2"><span className="text-indigo-400">Number/Email:</span> {parsedCreds.identifier || parsedCreds.fbUid} <Copy className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => navigator.clipboard.writeText(parsedCreds.identifier || parsedCreds.fbUid)} /></p>
                          )}
                          <p className="flex items-center gap-2"><span className="text-indigo-400">Password:</span> {parsedCreds.password || parsedCreds.fbPassword} <Copy className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => navigator.clipboard.writeText(parsedCreds.password || parsedCreds.fbPassword)} /></p>
                          {(parsedCreds.twoFAKey || parsedCreds.fb2FA) && <p className="flex items-center gap-2"><span className="text-indigo-400">2FA Key:</span> {parsedCreds.twoFAKey || parsedCreds.fb2FA} <Copy className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => navigator.clipboard.writeText(parsedCreds.twoFAKey || parsedCreds.fb2FA)} /></p>}
                          <p><span className="text-indigo-400">Profile Link:</span> {parsedCreds.profileLink || `https://facebook.com/profile.php?id=${parsedCreds.fbUid || parsedCreds.identifier}`}</p>
                        </div>
                      )}
                      
                      {(sub.type === 'microjob' || sub.type === 'dailyjob') && parsedCreds && (
                        <div className="space-y-1">
                          <p className="flex items-center gap-2"><span className="text-indigo-400">Title:</span> {parsedCreds.job_title}</p>
                          <p className="flex items-center gap-2"><span className="text-indigo-400">Proof:</span> {parsedCreds.proof}</p>
                        </div>
                      )}
                      {sub.type === 'instagram' && (
                        <div className="space-y-1">
                          <p className="flex items-center gap-2"><span className="text-indigo-400">Username/Number:</span> {parsedCreds.identifier || parsedCreds.igUid} <Copy className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => navigator.clipboard.writeText(parsedCreds.identifier || parsedCreds.igUid)} /></p>
                          <p className="flex items-center gap-2"><span className="text-indigo-400">Password:</span> {parsedCreds.password || parsedCreds.igPassword} <Copy className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => navigator.clipboard.writeText(parsedCreds.password || parsedCreds.igPassword)} /></p>
                          {(parsedCreds.twoFAKey || parsedCreds.ig2FA) && <p className="flex items-center gap-2"><span className="text-indigo-400">2FA Key:</span> {parsedCreds.twoFAKey || parsedCreds.ig2FA} <Copy className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => navigator.clipboard.writeText(parsedCreds.twoFAKey || parsedCreds.ig2FA)} /></p>}
                          <p><span className="text-indigo-400">Profile Link:</span> {parsedCreds.profileLink || `https://instagram.com/${parsedCreds.igUid || parsedCreds.identifier}`}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {submissionsTab === 'Pending' && (
                    <div className="flex flex-row md:flex-col justify-end gap-3 border-t border-slate-800 md:border-t-0 pt-4 md:pt-0">
                      <button 
                        onClick={() => handleApproveSubmission(sub)} 
                        disabled={actioningId === sub.id}
                        className="flex-1 md:flex-none bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-600/30 px-4 py-3 rounded-xl transition flex items-center justify-center gap-2 font-bold text-sm"
                      >
                        {actioningId === sub.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        এপ্রুভ
                      </button>
                      <button 
                        onClick={() => handleRejectSubmission(sub)} 
                        disabled={actioningId === sub.id}
                        className="flex-1 md:flex-none bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-600/30 px-4 py-3 rounded-xl transition flex items-center justify-center gap-2 font-bold text-sm"
                      >
                        {actioningId === sub.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                        রিজেক্ট
                      </button>
                    </div>
                  )}
                </div>
              );
            })
            )}
          </div>
        )}

        {/* Tab 3: Withdrawals */}
        {activeTab === 'withdrawals' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* High-Contrast Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                  <CreditCard className="w-6 h-6 text-amber-400" />
                  উইথড্র রিকোয়েস্ট তালিকা (Withdrawals History)
                </h2>
                <p className="text-xs text-amber-400 font-bold mt-1">গ্রাহকদের উইথড্র রিকোয়েস্টগুলো পর্যালোচনা করুন এবং হিস্টরি দেখুন।</p>
              </div>
              <div className="bg-amber-400/10 border border-amber-400/20 rounded-xl px-4 py-2 self-start sm:self-auto">
                <p className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  মোট পেন্ডিং: <span className="text-sm font-black text-white bg-amber-500 px-2.5 py-0.5 rounded-lg ml-1">{withdrawals.filter(w => w.status === 'Pending').length}টি</span>
                </p>
              </div>
            </div>

            {/* Withdrawals Sub-Tabs */}
            <div className="flex gap-2 border-b border-slate-800 pb-4">
              <button onClick={() => setWithdrawalsTab('Pending')} className={`px-4 py-2 rounded-xl text-xs font-bold transition ${withdrawalsTab === 'Pending' ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>Pending</button>
              <button onClick={() => setWithdrawalsTab('Approved')} className={`px-4 py-2 rounded-xl text-xs font-bold transition ${withdrawalsTab === 'Approved' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>Approved</button>
              <button onClick={() => setWithdrawalsTab('Rejected')} className={`px-4 py-2 rounded-xl text-xs font-bold transition ${withdrawalsTab === 'Rejected' ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>Rejected</button>
            </div>

            {withdrawals.filter(w => w.status === withdrawalsTab).length === 0 ? (
               <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
                 <CreditCard className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                 <h3 className="text-lg font-bold text-slate-400">No {withdrawalsTab.toLowerCase()} withdrawals</h3>
                 <p className="text-sm text-slate-500 mt-2">There are no {withdrawalsTab.toLowerCase()} withdrawal requests here currently.</p>
               </div>
            ) : (
              withdrawals.filter(w => w.status === withdrawalsTab).map((withd) => {
                const requestedAmount = Number(withd.amount);
                const feeDeduction = getWithdrawalFee(requestedAmount);
                const payableAmount = requestedAmount - feeDeduction;

                return (
                  <div key={withd.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col gap-4 hover:border-slate-700 transition">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 text-[10px] uppercase tracking-wider font-black rounded-full ${withd.paymentMethod === 'bKash' ? 'bg-pink-500/10 text-pink-400 border border-pink-500/20' : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'}`}>
                          {withd.paymentMethod} Payment
                        </span>
                        <span className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded-full ${withd.status === 'Pending' ? 'bg-amber-500/10 text-amber-400' : withd.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                          {withd.status}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 font-bold font-mono">{formatDateTime(withd.created_at)}</span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-850">
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold mb-1">User Details (গ্রাহক)</p>
                        <p className="text-sm font-black text-white">{withd.user?.fullName}</p>
                        <p className="text-xs text-slate-300 font-medium font-mono mt-0.5">{withd.user?.email}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold mb-1">Transfer To (নাম্বার)</p>
                        <p className="text-base font-black text-amber-400 flex items-center gap-2 font-mono">
                          {withd.accountNumber}
                          <Copy className="w-4 h-4 cursor-pointer text-slate-400 hover:text-white transition" onClick={() => navigator.clipboard.writeText(withd.accountNumber)} />
                        </p>
                      </div>
                      <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold mb-1.5">Amount Details (টাকা)</p>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between text-slate-300 font-bold">
                            <span>উইথড্র পরিমাণ:</span>
                            <span className="font-extrabold text-white">৳{requestedAmount}</span>
                          </div>
                          <div className="flex justify-between text-rose-400 font-bold">
                            <span>সার্ভিস ফি:</span>
                            <span className="font-extrabold">-৳{feeDeduction}</span>
                          </div>
                          <div className="flex justify-between text-emerald-400 font-black border-t border-slate-800 pt-1.5 mt-1 text-sm">
                            <span>গ্রাহক পাবে (Net):</span>
                            <span>৳{payableAmount}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {withdrawalsTab === 'Pending' && (
                      <div className="flex flex-row gap-3 pt-2 justify-end">
                        <button 
                          onClick={() => handleApproveWithdrawal(withd.id)} 
                          disabled={actioningId === withd.id}
                          className="flex-1 sm:flex-none bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-600/30 px-5 py-3 rounded-xl transition flex items-center justify-center gap-2 font-black text-xs sm:text-sm shadow-md"
                        >
                          {actioningId === withd.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          পরিশোধিত (Approve)
                        </button>
                        <button 
                          onClick={() => handleRejectWithdrawal(withd)} 
                          disabled={actioningId === withd.id}
                          className="flex-1 sm:flex-none bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-600/30 px-5 py-3 rounded-xl transition flex items-center justify-center gap-2 font-black text-xs sm:text-sm shadow-md"
                        >
                          {actioningId === withd.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                          বাতিল (Reject)
                        </button>
                      </div>
                    )}

                    {withdrawalsTab === 'Approved' && (
                      <div className="flex flex-row gap-3 pt-2 justify-end">
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-4 py-2 rounded-xl text-xs font-black">
                          Approved & Paid (অনুমোদিত)
                        </span>
                      </div>
                    )}

                    {withdrawalsTab === 'Rejected' && (
                      <div className="flex flex-row gap-3 pt-2 justify-end">
                        <span className="bg-rose-500/10 text-rose-400 border border-rose-500/25 px-4 py-2 rounded-xl text-xs font-black">
                          Rejected & Refunded (প্রত্যাখ্যাত ও রিফান্ডেড)
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}


        {/* Tab 4: User Management */}
        {activeTab === 'users' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Search Bar & Total Users Count */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-900 p-5 border border-slate-800 rounded-2xl shadow-lg">
              <div className="relative w-full md:max-w-md">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search users by email..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-slate-200 pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none transition"
                />
              </div>
              <div className="text-xs text-slate-400 font-bold self-start md:self-auto bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
                Total Registered Users: <span className="text-indigo-400 font-black text-sm ml-1">{usersData.length}</span>
              </div>
            </div>

            {/* Users List Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-950/50 border-b border-slate-800 text-xs text-slate-400 uppercase tracking-wider">
                      <th className="p-4 font-bold">Name</th>
                      <th className="p-4 font-bold">Email</th>
                      <th className="p-4 font-bold">Wallet Balance</th>
                      <th className="p-4 font-bold">Status</th>
                      <th className="p-4 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {usersData
                      .filter(usr => usr.email?.toLowerCase().includes(userSearchQuery.toLowerCase()))
                      .map((usr) => (
                        <tr key={usr.id} className="hover:bg-slate-800/10 transition">
                          <td className="p-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-slate-850 border border-slate-800 flex items-center justify-center text-indigo-400 font-bold text-sm">
                                {usr.full_name ? usr.full_name[0].toUpperCase() : <User className="w-4 h-4" />}
                              </div>
                              <div>
                                <p className="font-bold text-slate-200">{usr.full_name || 'N/A'}</p>
                                {usr.role === 'admin' && (
                                  <span className="px-1.5 py-0.5 text-[8px] tracking-wider uppercase font-extrabold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded">Admin</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-sm text-slate-300 font-mono">{usr.email}</td>
                          <td className="p-4">
                            <span className="font-extrabold text-emerald-400 text-sm">৳{usr.wallet_balance}</span>
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold rounded-full border ${usr.is_blocked ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${usr.is_blocked ? 'bg-rose-400' : 'bg-emerald-400'}`}></span>
                              {usr.is_blocked ? 'Blocked' : 'Active'}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-3">
                              {/* Edit Balance Button */}
                              <button
                                onClick={() => {
                                  setEditingUser(usr);
                                  setEditBalanceValue(String(usr.wallet_balance));
                                }}
                                title="Edit Balance"
                                className="p-2 bg-slate-800 hover:bg-slate-750 text-indigo-400 hover:text-indigo-300 rounded-lg transition active:scale-95"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>

                              {/* View Details Button */}
                              <button
                                onClick={() => handleViewDetails(usr)}
                                title="View Details"
                                className="p-2 bg-slate-800 hover:bg-slate-750 text-indigo-400 hover:text-indigo-300 rounded-lg transition active:scale-95"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {/* Block/Unblock switch toggle */}
                              <div className="flex items-center gap-2" title={usr.is_blocked ? 'Unblock User' : 'Block User'}>
                                <label className="relative inline-flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={!usr.is_blocked}
                                    onChange={() => handleToggleBlock(usr)}
                                  />
                                  <div className="w-9 h-5 bg-rose-500/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                                </label>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
                {usersData.filter(usr => usr.email?.toLowerCase().includes(userSearchQuery.toLowerCase())).length === 0 && (
                  <div className="p-12 text-center text-slate-500 font-bold">
                    No users found matching the search.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Micro Jobs */}
        {activeTab === 'micro_jobs' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h3 className="text-lg font-bold text-white mb-4">Add New Micro Job</h3>
              <form onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const { data, error } = await supabase.from('micro_jobs').insert([{ ...newJob, reward_amount: Number(newJob.reward_amount) }]).select();
                  if (error) throw error;
                  if (data) {
                    setMicroJobs([data[0], ...microJobs]);
                    setNewJob({ title: '', description: '', reward_amount: '' });
                    showToast('Micro Job created successfully!', 'success');
                  }
                } catch (err: any) {
                  showToast('Error: ' + err.message, 'error');
                }
              }} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Title</label>
                  <input required value={newJob.title} onChange={e => setNewJob({...newJob, title: e.target.value})} type="text" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200" placeholder="Enter job title" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Description (Rules & Requirements)</label>
                  <textarea required value={newJob.description} onChange={e => setNewJob({...newJob, description: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 min-h-[100px]" placeholder="Explain the task step by step..." />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Reward Amount (৳)</label>
                  <input required value={newJob.reward_amount} onChange={e => setNewJob({...newJob, reward_amount: e.target.value})} type="number" step="0.01" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200" placeholder="0.00" />
                </div>
                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-xl transition">Create Micro Job</button>
              </form>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white mt-8 mb-4">Existing Micro Jobs</h3>
              {microJobs.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-500">No active micro jobs found.</div>
              ) : (
                microJobs.map((job) => (
                  <div key={job.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-200">{job.title}</h4>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{job.description}</p>
                      <div className="flex items-center gap-3 mt-3">
                        <span className="text-sm font-black text-emerald-400">৳{job.reward_amount}</span>
                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${job.status ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>{job.status ? 'Active' : 'Inactive'}</span>
                      </div>
                    </div>
                    <div className="flex sm:flex-col gap-2 shrink-0">
                      <button 
                        onClick={async () => {
                          try {
                            const { error } = await supabase.from('micro_jobs').update({ status: !job.status }).eq('id', job.id);
                            if (error) throw error;
                            setMicroJobs(microJobs.map(j => j.id === job.id ? { ...j, status: !job.status } : j));
                            showToast(`Micro Job is now ${!job.status ? 'Active' : 'Inactive'}!`, 'success');
                          } catch (err: any) {
                            showToast('Error toggling status: ' + err.message, 'error');
                          }
                        }}
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 text-xs font-bold rounded-lg transition"
                      >Toggle Status</button>
                      <button 
                        onClick={async () => {
                          if(!confirm('Delete this job? All associated user submissions will also be deleted.')) return;
                          try {
                            // Delete related submissions first to satisfy foreign key constraints
                            await supabase.from('micro_job_submissions').delete().eq('job_id', job.id);
                            
                            // Now delete the job itself
                            const { error } = await supabase.from('micro_jobs').delete().eq('id', job.id);
                            if (error) throw error;
                            
                            setMicroJobs(microJobs.filter(j => j.id !== job.id));
                            showToast('Micro Job deleted successfully!', 'success');
                          } catch (err: any) {
                            showToast('Error deleting Micro Job: ' + err.message, 'error');
                          }
                        }}
                        className="flex-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 px-4 py-2 text-xs font-bold rounded-lg transition"
                      >Delete</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        

        {/* Tab 5.5: Daily Jobs */}
        {activeTab === 'daily_jobs' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h3 className="text-lg font-bold text-white mb-4">Add New Daily Job</h3>
              <form onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const { data, error } = await supabase.from('daily_jobs').insert([{ ...newDailyJob, reward_amount: Number(newDailyJob.reward_amount) }]).select();
                  if (error) throw error;
                  if (data) {
                    setDailyJobs([data[0], ...dailyJobs]);
                    setNewDailyJob({ title: '', description: '', reward_amount: '' });
                    showToast('Daily Job created successfully!', 'success');
                  }
                } catch (err: any) {
                  showToast('Error: ' + err.message, 'error');
                }
              }} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Title</label>
                  <input required value={newDailyJob.title} onChange={e => setNewDailyJob({...newDailyJob, title: e.target.value})} type="text" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200" placeholder="Enter daily job title" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Description (Rules & Requirements)</label>
                  <textarea required value={newDailyJob.description} onChange={e => setNewDailyJob({...newDailyJob, description: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 min-h-[100px]" placeholder="Explain the task step by step..." />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Reward Amount (৳)</label>
                  <input required value={newDailyJob.reward_amount} onChange={e => setNewDailyJob({...newDailyJob, reward_amount: e.target.value})} type="number" step="0.01" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200" placeholder="0.00" />
                </div>
                <button type="submit" className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 px-4 rounded-xl transition">Create Daily Job</button>
              </form>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white mt-8 mb-4">Existing Daily Jobs</h3>
              {dailyJobs.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-500">No active daily jobs found.</div>
              ) : (
                dailyJobs.map((job) => (
                  <div key={job.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-200">{job.title}</h4>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{job.description}</p>
                      <div className="flex items-center gap-3 mt-3">
                        <span className="text-sm font-black text-emerald-400">৳{job.reward_amount}</span>
                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${job.status ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>{job.status ? 'Active' : 'Inactive'}</span>
                      </div>
                    </div>
                    <div className="flex sm:flex-col gap-2 shrink-0">
                      <button 
                        onClick={async () => {
                          try {
                            const { error } = await supabase.from('daily_jobs').update({ status: !job.status }).eq('id', job.id);
                            if (error) throw error;
                            setDailyJobs(dailyJobs.map(j => j.id === job.id ? { ...j, status: !job.status } : j));
                            showToast(`Daily Job is now ${!job.status ? 'Active' : 'Inactive'}!`, 'success');
                          } catch (err: any) {
                            showToast('Error toggling status: ' + err.message, 'error');
                          }
                        }}
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 text-xs font-bold rounded-lg transition"
                      >Toggle Status</button>
                      <button 
                        onClick={async () => {
                          if(!confirm('Delete this daily job? All associated user submissions will also be deleted.')) return;
                          try {
                            await supabase.from('daily_job_submissions').delete().eq('job_id', job.id);
                            const { error } = await supabase.from('daily_jobs').delete().eq('id', job.id);
                            if (error) throw error;
                            setDailyJobs(dailyJobs.filter(j => j.id !== job.id));
                            showToast('Daily Job deleted successfully!', 'success');
                          } catch (err: any) {
                            showToast('Error deleting Daily Job: ' + err.message, 'error');
                          }
                        }}
                        className="flex-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 px-4 py-2 text-xs font-bold rounded-lg transition"
                      >Delete Job</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 6: Gift Codes */}
        {activeTab === 'gift_codes' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2 border-b border-slate-800 pb-4">
                <Gift className="w-5 h-5 text-purple-400" />
                Create Gift Code
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2">Gift Code (Text)</label>
                  <input 
                    type="text"
                    value={newGiftCode.code}
                    onChange={(e) => setNewGiftCode({...newGiftCode, code: e.target.value})}
                    placeholder="Enter Gift Code"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-purple-500 font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2">Reward Amount (৳)</label>
                  <input 
                    type="number"
                    value={newGiftCode.reward_amount}
                    onChange={(e) => setNewGiftCode({...newGiftCode, reward_amount: e.target.value})}
                    placeholder="Enter amount"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-purple-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2">Max Uses</label>
                  <input 
                    type="number"
                    value={newGiftCode.max_uses}
                    onChange={(e) => setNewGiftCode({...newGiftCode, max_uses: e.target.value})}
                    placeholder="Enter max uses"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-purple-500 font-mono"
                  />
                </div>
              </div>
              
              <button 
                onClick={async () => {
                  if (!newGiftCode.code || !newGiftCode.reward_amount || !newGiftCode.max_uses) {
                    return showToast('Please fill all fields', 'error');
                  }
                  try {
                    const { data, error } = await supabase.from('gift_codes').insert({
                      code: newGiftCode.code.toUpperCase(),
                      reward_amount: Number(newGiftCode.reward_amount),
                      max_uses: Number(newGiftCode.max_uses),
                      current_uses: 0
                    }).select().single();
                    
                    if (error) throw error;
                    
                    setGiftCodes([data, ...giftCodes]);
                    setNewGiftCode({ code: '', reward_amount: '', max_uses: '1' });
                    showToast('Gift Code created successfully!', 'success');
                  } catch (err: any) {
                    showToast('Error creating Gift Code: ' + err.message, 'error');
                  }
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition active:scale-95 text-sm"
              >
                Create Code
              </button>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-200 ml-2">Generated Gift Codes</h3>
              {giftCodes.length === 0 ? (
                 <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center">
                   <p className="text-slate-500 font-medium">No Gift Codes created yet.</p>
                 </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {giftCodes.map((gc) => (
                    <div key={gc.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-3">
                        <span className="text-[10px] font-black uppercase text-purple-400 bg-purple-500/10 px-2 py-1 rounded">
                          {gc.current_uses} / {gc.max_uses} claimed
                        </span>
                      </div>
                      <div className="mt-2">
                        <h4 className="font-mono text-xl font-black text-slate-200">{gc.code}</h4>
                        <p className="text-sm text-slate-400 mt-1 font-bold text-emerald-400">Reward: ৳{gc.reward_amount}</p>
                      </div>
                      <div className="mt-4 border-t border-slate-800 pt-3">
                        <button 
                          onClick={async () => {
                            if(!confirm('Delete this gift code?')) return;
                            try {
                              const { error } = await supabase.from('gift_codes').delete().eq('id', gc.id);
                              if (error) throw error;
                              setGiftCodes(giftCodes.filter(g => g.id !== gc.id));
                              showToast('Gift code deleted!', 'success');
                            } catch (err: any) {
                              showToast('Error: ' + err.message, 'error');
                            }
                          }}
                          className="text-xs text-rose-400 hover:text-rose-300 font-bold"
                        >Delete Code</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 7: Page Rules */}
        {activeTab === 'page_rules' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2 border-b border-slate-800 pb-4">
                <FileText className="w-5 h-5 text-indigo-400" />
                Sell Page Rules & Notices
              </h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2">Gmail Sell Page Rules</label>
                  <textarea 
                    rows={4}
                    value={pageRules.gmail} 
                    onChange={e => setPageRules({...pageRules, gmail: e.target.value})}
                    placeholder="Enter the rules for the Gmail sell page..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 focus:border-indigo-500 outline-none transition"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2">Facebook Sell Page Rules</label>
                  <textarea 
                    rows={4}
                    value={pageRules.facebook} 
                    onChange={e => setPageRules({...pageRules, facebook: e.target.value})}
                    placeholder="Enter the rules for the Facebook sell page..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 focus:border-indigo-500 outline-none transition"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2">Instagram Sell Page Rules</label>
                  <textarea 
                    rows={4}
                    value={pageRules.instagram} 
                    onChange={e => setPageRules({...pageRules, instagram: e.target.value})}
                    placeholder="Enter the rules for the Instagram sell page..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 focus:border-indigo-500 outline-none transition"
                  />
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-800">
                  <button
                    onClick={savePageRules}
                    disabled={savingRules}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg transition flex items-center gap-2 active:scale-95 disabled:opacity-50"
                  >
                    {savingRules ? <Loader2 className="w-5 h-5 animate-spin" /> : <Settings className="w-5 h-5" />}
                    {savingRules ? 'Saving...' : 'Save Rules'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Edit Wallet Balance Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500"></div>
            
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-indigo-400" />
                Edit Wallet Balance
              </h3>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-850/50 text-left space-y-1">
              <p className="text-xs text-slate-400 font-bold">User: <span className="text-slate-200">{editingUser.full_name || 'N/A'}</span></p>
              <p className="text-xs text-slate-400 font-bold">Email: <span className="text-slate-200 font-mono">{editingUser.email}</span></p>
              <p className="text-xs text-slate-400 font-bold">Current Balance: <span className="text-emerald-400">৳{editingUser.wallet_balance}</span></p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">New Wallet Balance (৳)</label>
              <input
                type="number"
                step="0.01"
                value={editBalanceValue}
                onChange={(e) => setEditBalanceValue(e.target.value)}
                placeholder="Enter balance"
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-slate-200 text-sm font-bold outline-none transition"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setEditingUser(null)}
                className="bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700/50 py-3 rounded-xl text-xs font-black transition active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleSaveBalance}
                className="bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl text-xs font-black transition active:scale-[0.98] flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/10"
              >
                {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save Balance
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View User Details Modal */}
      {viewingUserDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500"></div>
            
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-400" />
                User Profile Details
              </h3>
              <button onClick={() => setViewingUserDetails(null)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User Bio Card */}
            <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400 font-bold text-base">
                  {viewingUserDetails.full_name ? viewingUserDetails.full_name[0].toUpperCase() : <User className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-100">{viewingUserDetails.full_name || 'N/A'}</h4>
                  <p className="text-xs text-slate-400 font-mono">{viewingUserDetails.email}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 pt-2 text-xs border-t border-slate-850/50">
                <div>
                  <p className="text-slate-500 font-bold">Role</p>
                  <p className="text-slate-200 font-black uppercase text-[10px] mt-0.5">{viewingUserDetails.role || 'User'}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-bold">Status</p>
                  <p className={`font-black text-[10px] mt-0.5 ${viewingUserDetails.is_blocked ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {viewingUserDetails.is_blocked ? 'Blocked' : 'Active'}
                  </p>
                </div>
              </div>
            </div>

            {/* Performance / System Stats */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">Activity Statistics</h4>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-950/30 p-3.5 rounded-xl border border-slate-850/50">
                  <p className="text-[10px] text-slate-500 font-bold">Registration Date</p>
                  <p className="text-xs text-slate-300 font-extrabold mt-1">{formatDateTime(viewingUserDetails.createdAt)}</p>
                </div>
                <div className="bg-slate-950/30 p-3.5 rounded-xl border border-slate-850/50">
                  <p className="text-[10px] text-slate-500 font-bold">Current Balance</p>
                  <p className="text-sm text-emerald-400 font-black mt-1">৳{viewingUserDetails.wallet_balance}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-950/30 p-3.5 rounded-xl border border-slate-850/50">
                  <p className="text-[10px] text-slate-500 font-bold">Account Submissions</p>
                  <p className="text-xs text-slate-300 font-extrabold mt-1">
                    {viewingUserDetails.totalSubmissions} <span className="text-slate-500 font-medium">({viewingUserDetails.approvedSubmissions} approved)</span>
                  </p>
                </div>
                <div className="bg-slate-950/30 p-3.5 rounded-xl border border-slate-850/50">
                  <p className="text-[10px] text-slate-500 font-bold">Total Withdrawals</p>
                  <p className="text-xs text-slate-300 font-extrabold mt-1">
                    {viewingUserDetails.totalWithdrawals} <span className="text-slate-500 font-medium">({viewingUserDetails.approvedWithdrawals} paid)</span>
                  </p>
                </div>
              </div>

              <div className="bg-indigo-500/5 p-3.5 rounded-xl border border-indigo-500/10 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400">Total Approved Payout</span>
                <span className="text-sm font-black text-indigo-400">৳{viewingUserDetails.totalWithdrawnAmount}</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setViewingUserDetails(null)}
                className="w-full bg-slate-800 hover:bg-slate-750 text-slate-200 py-3 rounded-xl text-xs font-black transition active:scale-[0.98]"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Modern Success Toast Overlay */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 border border-emerald-500/30 text-emerald-400 px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <span className="text-sm font-bold text-slate-200">{toast.message}</span>
        </div>
      )}
    </div>
  );
}
