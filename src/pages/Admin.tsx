import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Settings, Check, X, Loader2, Copy, Shield, Layers, CreditCard, Image as ImageIcon, Calendar, Search, Edit2, Eye, User, Gift, FileText, CheckSquare, ShieldAlert } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { getWithdrawalFee } from './Withdraw';
import { formatDateTime } from '../lib/dateUtils';

export default function Admin() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'settings' | 'submissions' | 'micro_job_submissions' | 'withdrawals' | 'users' | 'micro_jobs' | 'gift_codes' | 'page_rules' | 'ip_requests'>('settings');
  
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
  const [microJobSubmissions, setMicroJobSubmissions] = useState<any[]>([]);
  
  // Tabs for the micro jobs submissions
  const [microJobSubmissionsTab, setMicroJobSubmissionsTab] = useState<'Pending' | 'Approved' | 'Rejected'>('Pending');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [submissionsTab, setSubmissionsTab] = useState<'Pending' | 'Approved' | 'Rejected'>('Pending');
  const [withdrawalsTab, setWithdrawalsTab] = useState<'Pending' | 'Approved' | 'Rejected'>('Pending');
  const [newJob, setNewJob] = useState({ title: '', description: '', reward_amount: '' });
  const [giftCodes, setGiftCodes] = useState<any[]>([]);
  const [ipRequests, setIpRequests] = useState<any[]>([]);
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

  const handleApproveIp = async (userId: string) => {
    setActionLoading(true);
    try {
      let { error } = await supabase.from('profiles').update({ status: 'Active' }).eq('id', userId);
      if (error) {
        // Fallback if status doesn't exist
        const { error: err2 } = await supabase.from('profiles').update({ account_status: 'Active' }).eq('id', userId);
        if (err2) throw err2;
      }
      setIpRequests(prev => prev.filter(u => u.id !== userId));
      showToast('User approved successfully.', 'success');
    } catch (e: any) {
      showToast(e.message || 'Error approving user', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectIp = async (userId: string) => {
    setActionLoading(true);
    try {
      const { error } = await supabase.rpc('delete_rejected_user', { target_user_id: userId });
      if (error) throw error;
      setIpRequests(prev => prev.filter(u => u.id !== userId));
      showToast('Account deleted and removed from the system.', 'success');
    } catch (e: any) {
      showToast(e.message || 'Error deleting user', 'error');
    } finally {
      setActionLoading(false);
    }
  };

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

      let pendingIpsData: any[] = [];
      const { data: pendingIps, error: pendingIpsErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('status', 'Pending');
      
      if (pendingIps && !pendingIpsErr) {
        pendingIpsData = pendingIps;
      } else {
        const { data: pendingIpsAlt } = await supabase
          .from('profiles')
          .select('*')
          .eq('account_status', 'Pending');
        if (pendingIpsAlt) {
          pendingIpsData = pendingIpsAlt;
        }
      }
      setIpRequests(pendingIpsData);

      const { data: subData, error: subErr } = await supabase
        .from('submissions')
        .select(`*, profiles (id, full_name, email, phone_number)`)
        .order('created_at', { ascending: false });

      if (subData && !subErr) {
        const mappedSubs = subData.map((sub: any) => ({
          id: sub.id,
          user_id: sub.user_id,
          type: sub.type,
          credentials_json: sub.credentials_json,
          price_at_submission: sub.price_at_submission,
          status: sub.status,
          created_at: sub.created_at,
          user: sub.profiles ? {
            fullName: sub.profiles.full_name || 'Unknown',
            email: sub.profiles.email || 'No email',
            phoneNumber: sub.profiles.phone_number || ''
          } : { fullName: 'Unknown', email: 'unknown' }
        }));
        setSubmissions(mappedSubs);
      }

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

      const { data: mjsResponse } = await supabase.from('micro_job_submissions').select(`
        *,
        micro_jobs ( title, reward_amount )
      `).order('created_at', { ascending: false });
      if (mjsResponse) setMicroJobSubmissions(mjsResponse);

      const { data: gcResponse } = await supabase.from('gift_codes').select('*').order('created_at', { ascending: false });
      if (gcResponse) setGiftCodes(gcResponse);
    } catch (e) {
      console.error('Error fetching admin data:', e);
    } finally {
      setLoading(false);
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
      // 1. Update the job status to 'Approved'
      const { data: updateData, error: updateError } = await supabase
        .from('submissions')
        .update({ status: 'Approved', updated_at: new Date().toISOString() })
        .eq('id', submission.id)
        .eq('status', 'Pending')
        .select();
      
      if (updateError) throw updateError;
      if (!updateData || updateData.length === 0) {
        throw new Error('Submission was already processed or could not be found.');
      }

      // 2. Add Task Price to User
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('id', submission.user_id)
        .single();
        
      if (userProfile) {
        await supabase
          .from('profiles')
          .update({ wallet_balance: Number(userProfile.wallet_balance) + Number(submission.price_at_submission) })
          .eq('id', submission.user_id);
      }

      // 3. Handle Referral Activation
      const { data: pendingRef } = await supabase
        .from('referrals')
        .select('*')
        .eq('referred_user_id', submission.user_id)
        .eq('status', 'Pending')
        .single();

      if (pendingRef) {
        // Fetch current dynamic referral bonus
        const { data: settings } = await supabase
          .from('system_settings')
          .select('referral_bonus')
          .eq('id', 1)
          .single();
          
        const currentBonus = settings?.referral_bonus || 5.00;

        // Update referral to Active with current bonus
        const { error: refError } = await supabase
          .from('referrals')
          .update({ status: 'Active', reward_amount: currentBonus, updated_at: new Date().toISOString() })
          .eq('id', pendingRef.id);
          
        if (!refError) {
          // Add bonus to Referrer
          const { data: referrerProfile } = await supabase
            .from('profiles')
            .select('wallet_balance')
            .eq('id', pendingRef.referrer_id)
            .single();
            
          if (referrerProfile) {
            await supabase
              .from('profiles')
              .update({ wallet_balance: Number(referrerProfile.wallet_balance) + Number(currentBonus) })
              .eq('id', pendingRef.referrer_id);
          }
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
        .from('submissions')
        .update({ status: 'Rejected' })
        .eq('id', submission.id);

      if (error) throw new Error(error.message);

      setSubmissions(prev => prev.map(s => s.id === submission.id ? { ...s, status: 'Rejected' } : s));
      showToast('Submission rejected successfully!', 'success');
    } catch (e: any) {
      console.error('Error rejecting submission:', e.message);
      showToast('Error rejecting submission: ' + e.message, 'error');
    } finally {
      setActioningId(null);
    }
  };

  const handleApproveMicroJobSubmission = async (submission: any) => {
    setActioningId(submission.id);
    try {
      // 1. Get the reward amount for the job this submission belongs to
      const { data: jobData, error: jobError } = await supabase
        .from('micro_jobs')
        .select('reward_amount')
        .eq('id', submission.job_id)
        .single();
        
      if (jobError || !jobData) throw new Error('Could not find job reward amount');
      
      const jobReward = jobData.reward_amount;

      // 2. Update the submission
      const { data: updateData, error: updateError } = await supabase
        .from('micro_job_submissions')
        .update({ status: 'Approved' })
        .eq('id', submission.id)
        .eq('status', 'Pending')
        .select();
      
      if (updateError) throw updateError;
      if (!updateData || updateData.length === 0) {
        throw new Error('Submission was already processed or could not be found.');
      }

      // 3. Add Task Price to User
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('id', submission.user_id)
        .single();
        
      if (userProfile) {
        await supabase
          .from('profiles')
          .update({ wallet_balance: Number(userProfile.wallet_balance) + Number(jobReward) })
          .eq('id', submission.user_id);
      }

      // 4. Handle Referral Activation
      const { data: pendingRef } = await supabase
        .from('referrals')
        .select('*')
        .eq('referred_user_id', submission.user_id)
        .eq('status', 'Pending')
        .single();

      if (pendingRef) {
        // Fetch current dynamic referral bonus
        const { data: settings } = await supabase
          .from('system_settings')
          .select('referral_bonus')
          .eq('id', 1)
          .single();
          
        const currentBonus = settings?.referral_bonus || 5.00;

        // Update referral to Active with current bonus
        const { error: refError } = await supabase
          .from('referrals')
          .update({ status: 'Active', reward_amount: currentBonus, updated_at: new Date().toISOString() })
          .eq('id', pendingRef.id);
          
        if (!refError) {
          // Add bonus to Referrer
          const { data: referrerProfile } = await supabase
            .from('profiles')
            .select('wallet_balance')
            .eq('id', pendingRef.referrer_id)
            .single();
            
          if (referrerProfile) {
            await supabase
              .from('profiles')
              .update({ wallet_balance: Number(referrerProfile.wallet_balance) + Number(currentBonus) })
              .eq('id', pendingRef.referrer_id);
          }
        }
      }

      setMicroJobSubmissions(prev => prev.map(s => s.id === submission.id ? { ...s, status: 'Approved' } : s));
      showToast('Micro Job Submission approved successfully!', 'success');
    } catch (e: any) {
      console.error('Error approving micro job submission:', e.message);
      showToast('Error approving submission: ' + e.message, 'error');
    } finally {
      setActioningId(null);
    }
  };

  const handleRejectMicroJobSubmission = async (submission: any) => {
    setActioningId(submission.id);
    try {
      const { error } = await supabase
        .from('micro_job_submissions')
        .update({ status: 'Rejected' })
        .eq('id', submission.id);

      if (error) throw new Error(error.message);

      setMicroJobSubmissions(prev => prev.map(s => s.id === submission.id ? { ...s, status: 'Rejected' } : s));
      showToast('Micro Job Submission rejected successfully!', 'success');
    } catch (e: any) {
      console.error('Error rejecting micro job submission:', e.message);
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
          .eq('id', withd.id);

        if (updateError) throw new Error(updateError.message);

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
  const pendingWithdrawalsCount = withdrawals.filter(w => w.status === 'Pending').length;
  const pendingMicroJobSubmissionsCount = (microJobSubmissions || []).filter(s => s.status === 'Pending').length;
  const pendingIpRequestsCount = (ipRequests || []).length;
  
  // Find duplicate IPs for highlighting
  const ipCounts = ipRequests.reduce((acc: any, curr: any) => {
    if (curr.ip_address) {
      acc[curr.ip_address] = (acc[curr.ip_address] || 0) + 1;
    }
    return acc;
  }, {});
  const duplicateIps = new Set(Object.keys(ipCounts).filter(ip => ipCounts[ip] > 1));
  
  // Sort ipRequests by IP to group identical IPs together
  const sortedIpRequests = [...(ipRequests || [])].sort((a, b) => {
    if (!a.ip_address) return 1;
    if (!b.ip_address) return -1;
    return a.ip_address.localeCompare(b.ip_address);
  });

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
          <button onClick={() => setActiveTab('micro_job_submissions')} className={`flex-1 py-4 px-6 text-sm font-bold flex items-center justify-center gap-2 whitespace-nowrap transition border-b-2 ${activeTab === 'micro_job_submissions' ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5' : 'border-transparent text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'}`}>
            <CheckSquare className="w-4 h-4" /> Micro Job Proofs
            {pendingMicroJobSubmissionsCount > 0 && <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full">{pendingMicroJobSubmissionsCount}</span>}
          </button>
          <button onClick={() => setActiveTab('withdrawals')} className={`flex-1 py-4 px-6 text-sm font-bold flex items-center justify-center gap-2 whitespace-nowrap transition border-b-2 ${activeTab === 'withdrawals' ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5' : 'border-transparent text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'}`}>
            <CreditCard className="w-4 h-4" /> Withdrawal Requests
            {pendingWithdrawalsCount > 0 && <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full">{pendingWithdrawalsCount}</span>}
          </button>
          <button onClick={() => setActiveTab('ip_requests')} className={`flex-1 py-4 px-6 text-sm font-bold flex items-center justify-center gap-2 whitespace-nowrap transition border-b-2 ${activeTab === 'ip_requests' ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5' : 'border-transparent text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'}`}>
            <ShieldAlert className="w-4 h-4" /> IP Verification
            {pendingIpRequestsCount > 0 && <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full">{pendingIpRequestsCount}</span>}
          </button>
          <button onClick={() => setActiveTab('users')} className={`flex-1 py-4 px-6 text-sm font-bold flex items-center justify-center gap-2 whitespace-nowrap transition border-b-2 ${activeTab === 'users' ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5' : 'border-transparent text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'}`}>
            <Shield className="w-4 h-4" /> User Management
          </button>
          <button onClick={() => setActiveTab('micro_jobs')} className={`flex-1 py-4 px-6 text-sm font-bold flex items-center justify-center gap-2 whitespace-nowrap transition border-b-2 ${activeTab === 'micro_jobs' ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5' : 'border-transparent text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'}`}>
            <Check className="w-4 h-4" /> Micro Jobs
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
                  <input type="text" placeholder="https://t.me/your_support" className="bg-slate-950 border border-slate-800 px-4 py-3 rounded-xl w-full focus:border-blue-500 outline-none text-sm text-slate-200 transition" value={settings?.telegram_support_link || ''} onChange={e => handleSettingsChange('telegram_support_link', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-1.5">Telegram Channel Link</label>
                  <input type="text" placeholder="https://t.me/your_channel" className="bg-slate-950 border border-slate-800 px-4 py-3 rounded-xl w-full focus:border-blue-500 outline-none text-sm text-slate-200 transition" value={settings?.telegram_channel_link || ''} onChange={e => handleSettingsChange('telegram_channel_link', e.target.value)} />
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

              <div className="flex justify-end pt-6 border-t border-slate-800">
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
            {submissions.filter(s => s.status === submissionsTab).length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
                <Shield className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-400">No {submissionsTab.toLowerCase()} submissions</h3>
              </div>
            ) : (
              submissions.filter(s => s.status === submissionsTab).map((sub) => (
                <div key={sub.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row gap-5 hover:border-slate-700 transition">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`px-2.5 py-1 text-[10px] uppercase tracking-wider font-black rounded-full ${sub.type === 'gmail' ? 'bg-red-500/10 text-red-400' : sub.type === 'facebook' ? 'bg-blue-500/10 text-blue-400' : 'bg-pink-500/10 text-pink-400'}`}>
                        {sub.type} Account
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
                          <p className="flex items-center gap-2"><span className="text-indigo-400">Email:</span> {sub.credentials_json.email} <Copy className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => navigator.clipboard.writeText(sub.credentials_json.email)} /></p>
                          <p className="flex items-center gap-2"><span className="text-indigo-400">Password:</span> {sub.credentials_json.password} <Copy className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => navigator.clipboard.writeText(sub.credentials_json.password)} /></p>
                          <p className="flex items-center gap-2"><span className="text-indigo-400">Recovery:</span> {sub.credentials_json.recoveryEmail} <Copy className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => navigator.clipboard.writeText(sub.credentials_json.recoveryEmail)} /></p>
                        </div>
                      )}
                      {sub.type === 'facebook' && (
                        <div className="space-y-1">
                          <p className="flex items-center gap-2"><span className="text-indigo-400">Number/Email:</span> {sub.credentials_json.identifier || sub.credentials_json.fbUid} <Copy className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => navigator.clipboard.writeText(sub.credentials_json.identifier || sub.credentials_json.fbUid)} /></p>
                          <p className="flex items-center gap-2"><span className="text-indigo-400">Password:</span> {sub.credentials_json.password || sub.credentials_json.fbPassword} <Copy className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => navigator.clipboard.writeText(sub.credentials_json.password || sub.credentials_json.fbPassword)} /></p>
                          {(sub.credentials_json.twoFAKey || sub.credentials_json.fb2FA) && <p className="flex items-center gap-2"><span className="text-indigo-400">2FA Key:</span> {sub.credentials_json.twoFAKey || sub.credentials_json.fb2FA} <Copy className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => navigator.clipboard.writeText(sub.credentials_json.twoFAKey || sub.credentials_json.fb2FA)} /></p>}
                          <p><span className="text-indigo-400">Profile Link:</span> {sub.credentials_json.profileLink || `https://facebook.com/profile.php?id=${sub.credentials_json.fbUid || sub.credentials_json.identifier}`}</p>
                        </div>
                      )}
                      {sub.type === 'instagram' && (
                        <div className="space-y-1">
                          <p className="flex items-center gap-2"><span className="text-indigo-400">Username/Number:</span> {sub.credentials_json.identifier || sub.credentials_json.igUid} <Copy className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => navigator.clipboard.writeText(sub.credentials_json.identifier || sub.credentials_json.igUid)} /></p>
                          <p className="flex items-center gap-2"><span className="text-indigo-400">Password:</span> {sub.credentials_json.password || sub.credentials_json.igPassword} <Copy className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => navigator.clipboard.writeText(sub.credentials_json.password || sub.credentials_json.igPassword)} /></p>
                          {(sub.credentials_json.twoFAKey || sub.credentials_json.ig2FA) && <p className="flex items-center gap-2"><span className="text-indigo-400">2FA Key:</span> {sub.credentials_json.twoFAKey || sub.credentials_json.ig2FA} <Copy className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => navigator.clipboard.writeText(sub.credentials_json.twoFAKey || sub.credentials_json.ig2FA)} /></p>}
                          <p><span className="text-indigo-400">Profile Link:</span> {sub.credentials_json.profileLink || `https://instagram.com/${sub.credentials_json.igUid || sub.credentials_json.identifier}`}</p>
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
              ))
            )}
          </div>
        )}

        {/* Tab 2.5: Micro Job Submissions */}
        {activeTab === 'micro_job_submissions' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex gap-2 border-b border-slate-800 pb-4">
              <button onClick={() => setMicroJobSubmissionsTab('Pending')} className={`px-4 py-2 rounded-xl text-xs font-bold transition ${microJobSubmissionsTab === 'Pending' ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>Pending</button>
              <button onClick={() => setMicroJobSubmissionsTab('Approved')} className={`px-4 py-2 rounded-xl text-xs font-bold transition ${microJobSubmissionsTab === 'Approved' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>Approved</button>
              <button onClick={() => setMicroJobSubmissionsTab('Rejected')} className={`px-4 py-2 rounded-xl text-xs font-bold transition ${microJobSubmissionsTab === 'Rejected' ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>Rejected</button>
            </div>
            {microJobSubmissions.filter(s => s.status === microJobSubmissionsTab).length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
                <Check className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-400">No {microJobSubmissionsTab.toLowerCase()} micro job submissions</h3>
              </div>
            ) : (
              microJobSubmissions.filter(s => s.status === microJobSubmissionsTab).map((sub) => (
                <div key={sub.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row gap-5 hover:border-slate-700 transition">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-2.5 py-1 text-[10px] uppercase tracking-wider font-black rounded-full bg-indigo-500/10 text-indigo-400">
                        Micro Job Proof
                      </span>
                      <span className="text-xs font-medium text-slate-400">{new Date(sub.created_at).toLocaleString()}</span>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${sub.status === 'Pending' ? 'bg-amber-500/20 text-amber-400' : sub.status === 'Approved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                        {sub.status}
                      </span>
                    </div>

                    <div className="mb-4">
                      <p className="text-sm text-slate-400 font-bold">Job Title:</p>
                      <p className="text-sm text-white">{sub.micro_jobs?.title || 'Unknown Job'}</p>
                      
                      <p className="text-sm text-slate-400 font-bold mt-2">Proof Details:</p>
                      <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-800 mt-1 whitespace-pre-wrap text-sm text-slate-200">
                        {sub.proof_text}
                      </div>
                    </div>
                  </div>
                  
                  {microJobSubmissionsTab === 'Pending' && (
                    <div className="flex flex-row md:flex-col justify-end gap-3 border-t border-slate-800 md:border-t-0 pt-4 md:pt-0">
                      <button 
                        onClick={() => handleApproveMicroJobSubmission(sub)} 
                        disabled={actioningId === sub.id}
                        className="flex-1 md:flex-none bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-600/30 px-4 py-3 rounded-xl transition flex items-center justify-center gap-2 font-bold text-sm"
                      >
                        {actioningId === sub.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        এপ্রুভ
                      </button>
                      <button 
                        onClick={() => handleRejectMicroJobSubmission(sub)} 
                        disabled={actioningId === sub.id}
                        className="flex-1 md:flex-none bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-600/30 px-4 py-3 rounded-xl transition flex items-center justify-center gap-2 font-bold text-sm"
                      >
                        {actioningId === sub.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                        রিজেক্ট
                      </button>
                    </div>
                  )}
                </div>
              ))
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
                    No users found matching your search.
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
                  <input required value={newJob.title} onChange={e => setNewJob({...newJob, title: e.target.value})} type="text" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200" placeholder="e.g. Subscribe to YouTube Channel" />
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
                    placeholder="e.g. WELCOME50"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-purple-500 font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2">Reward Amount (৳)</label>
                  <input 
                    type="number"
                    value={newGiftCode.reward_amount}
                    onChange={(e) => setNewGiftCode({...newGiftCode, reward_amount: e.target.value})}
                    placeholder="e.g. 50"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-purple-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2">Max Uses</label>
                  <input 
                    type="number"
                    value={newGiftCode.max_uses}
                    onChange={(e) => setNewGiftCode({...newGiftCode, max_uses: e.target.value})}
                    placeholder="e.g. 100"
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


        {/* Tab 8: IP Requests */}
        {activeTab === 'ip_requests' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
              <div className="border-b border-slate-800 pb-5 mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="w-6 h-6 text-amber-500 animate-pulse" />
                  Pending Accounts (IP Verification)
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  The following accounts were automatically flagged and set to Pending status due to potential duplicate or matching IP addresses.
                </p>
              </div>
              
              {ipRequests.length === 0 ? (
                <div className="text-center p-12 bg-slate-950 rounded-2xl border border-slate-800">
                  <CheckSquare className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400 font-bold">No pending IP verification requests.</p>
                  <p className="text-xs text-slate-500 mt-1">All registered accounts are currently active.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                  {/* Desktop Table View */}
                  <table className="w-full text-left border-collapse hidden md:table">
                    <thead>
                      <tr className="bg-slate-900/80 border-b border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
                        <th className="px-6 py-4">User Details</th>
                        <th className="px-6 py-4">IP Address (Prominent)</th>
                        <th className="px-6 py-4">Registration Date</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-sm text-slate-300">
                      {sortedIpRequests.map((u: any) => {
                        const isDuplicate = u.ip_address && duplicateIps.has(u.ip_address);
                        return (
                        <tr key={u.id} className={`transition ${isDuplicate ? 'bg-rose-950/20 hover:bg-rose-950/40 border-l-2 border-l-rose-500' : 'hover:bg-slate-900/30 border-l-2 border-l-transparent'}`}>
                          <td className="px-6 py-4">
                            <div className="font-bold text-white flex items-center gap-2">
                              {u.full_name}
                              {isDuplicate && <span className="bg-rose-500/20 text-rose-400 text-[10px] px-1.5 py-0.5 rounded uppercase font-black tracking-widest">Duplicate IP</span>}
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5">{u.email}</div>
                            <div className="text-[10px] text-slate-500 font-mono mt-1">ID: {u.id}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`font-mono px-3 py-1.5 rounded-lg border text-sm font-black shadow-sm tracking-wider inline-flex items-center gap-1.5 ${isDuplicate ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                              <span className={`w-2 h-2 rounded-full animate-ping ${isDuplicate ? 'bg-rose-500' : 'bg-amber-500'}`}></span>
                              {u.ip_address || 'N/A'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-400">
                            {u.created_at ? formatDateTime(u.created_at) : 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => handleApproveIp(u.id)}
                                disabled={actionLoading}
                                className="bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-600/30 px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1 disabled:opacity-50"
                              >
                                {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                Approve
                              </button>
                              <button
                                onClick={() => handleRejectIp(u.id)}
                                disabled={actionLoading}
                                className="bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-600/30 px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1 disabled:opacity-50"
                              >
                                {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      ); })}
                    </tbody>
                  </table>

                  {/* Mobile Stack View */}
                  <div className="md:hidden divide-y divide-slate-800">
                    {sortedIpRequests.map((u: any) => {
                      const isDuplicate = u.ip_address && duplicateIps.has(u.ip_address);
                      return (
                      <div key={u.id} className={`p-5 space-y-4 transition ${isDuplicate ? 'bg-rose-950/20' : ''}`}>
                        <div className="space-y-1">
                          <div className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center justify-between">
                            User
                            {isDuplicate && <span className="bg-rose-500/20 text-rose-400 text-[10px] px-1.5 py-0.5 rounded uppercase font-black tracking-widest">Duplicate</span>}
                          </div>
                          <div className="font-bold text-white text-base">{u.full_name}</div>
                          <div className="text-sm text-slate-400">{u.email}</div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="text-xs font-black text-slate-500 uppercase tracking-widest">IP Address</div>
                          <div className="inline-block">
                            <span className={`font-mono px-3 py-1.5 rounded-lg border text-sm font-black shadow-sm tracking-wider inline-flex items-center gap-1.5 ${isDuplicate ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                              <span className={`w-2 h-2 rounded-full animate-ping ${isDuplicate ? 'bg-rose-500' : 'bg-amber-500'}`}></span>
                              {u.ip_address || 'N/A'}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="text-xs font-black text-slate-500 uppercase tracking-widest">Registered At</div>
                          <div className="text-xs text-slate-400">{u.created_at ? formatDateTime(u.created_at) : 'N/A'}</div>
                        </div>

                        <div className="flex gap-3 pt-2">
                          <button
                            onClick={() => handleApproveIp(u.id)}
                            disabled={actionLoading}
                            className="flex-1 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-600/30 py-3 rounded-xl text-sm font-bold transition flex justify-center items-center gap-1.5 disabled:opacity-50"
                          >
                            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectIp(u.id)}
                            disabled={actionLoading}
                            className="flex-1 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-600/30 py-3 rounded-xl text-sm font-bold transition flex justify-center items-center gap-1.5 disabled:opacity-50"
                          >
                            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                            Reject
                          </button>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </div>
              )}
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
                placeholder="Enter balance (e.g. 100)"
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
