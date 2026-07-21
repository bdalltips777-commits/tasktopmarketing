const fs = require('fs');
let code = fs.readFileSync('src/pages/Admin.tsx', 'utf-8');

code = code.replace(
  `  const [submissionsTab, setSubmissionsTab] = useState<'Pending' | 'Approved' | 'Rejected'>('Pending');`,
  `  const [submissionsTab, setSubmissionsTab] = useState<'Pending' | 'Approved' | 'Rejected'>('Pending');
  const [submissionSearchQuery, setSubmissionSearchQuery] = useState('');
  const [submissionFilterCategory, setSubmissionFilterCategory] = useState('All');`
);

const fetchOld = `      const { data: subData, error: subErr } = await supabase
        .from('submissions')
        .select(\`*, profiles (id, full_name, email, phone_number)\`)
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
      }`;

const fetchNew = `      let allSubmissions: any[] = [];
      const { data: subData, error: subErr } = await supabase
        .from('submissions')
        .select(\`*, profiles (id, full_name, email, phone_number)\`)
        .order('created_at', { ascending: false });

      if (subData && !subErr) {
        allSubmissions.push(...subData.map((sub: any) => ({
          ...sub,
          table_source: 'submissions'
        })));
      }

      const { data: microSubData } = await supabase
        .from('micro_job_submissions')
        .select(\`*, profiles (id, full_name, email, phone_number), micro_jobs(title, reward_amount)\`)
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
        .select(\`*, profiles (id, full_name, email, phone_number), daily_jobs(title, reward_amount)\`)
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
      setSubmissions(mappedSubs);`;

code = code.replace(fetchOld, fetchNew);

const approveOld = `      // 1. ATOMIC SUBMISSION APPROVAL
      // Use the database RPC to securely approve the submission and add funds to the user's wallet
      // in a single atomic transaction.
      const { data: approved, error: rpcError } = await supabase.rpc('approve_submission', {
        sub_id: submission.id,
        target_user_id: submission.user_id,
        amount: submission.price_at_submission
      });

      if (rpcError) throw new Error(rpcError.message);
      if (!approved) throw new Error('Submission could not be approved. It may have already been processed.');`;

const approveNew = `      if (!submission.table_source || submission.table_source === 'submissions') {
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
      }`;

code = code.replace(approveOld, approveNew);

const rejectOld = `      const { error } = await supabase
        .from('submissions')
        .update({ status: 'Rejected' })
        .eq('id', submission.id);`;

const rejectNew = `      const { error } = await supabase
        .from(submission.table_source || 'submissions')
        .update({ status: 'Rejected' })
        .eq('id', submission.id);`;

code = code.replace(rejectOld, rejectNew);

fs.writeFileSync('src/pages/Admin.tsx', code);
