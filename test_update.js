import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  console.log("Testing profile select...");
  const { data: profile, error: errProfile } = await supabase.from('profiles').select('*').limit(1);
  if (errProfile) {
    console.error("Profile select error:", errProfile);
    return;
  }
  console.log("Profile fetched:", profile);

  if (profile && profile.length > 0) {
    console.log("Testing profile update on wallet_balance...");
    const { data: updatedProfile, error: errUpdateProfile } = await supabase
      .from('profiles')
      .update({ wallet_balance: profile[0].wallet_balance })
      .eq('id', profile[0].id)
      .select();
    if (errUpdateProfile) {
      console.error("Profile update error:", errUpdateProfile);
    } else {
      console.log("Profile update success!");
    }
  }

  console.log("Testing submission select...");
  const { data: sub, error: errSub } = await supabase.from('submissions').select('*').limit(1);
  if (errSub) {
    console.error("Submission select error:", errSub);
    return;
  }
  console.log("Submission fetched:", sub);

  if (sub && sub.length > 0) {
    console.log("Testing submission update on status...");
    const { data: updatedSub, error: errUpdateSub } = await supabase
      .from('submissions')
      .update({ status: sub[0].status })
      .eq('id', sub[0].id)
      .select();
    if (errUpdateSub) {
      console.error("Submission update error:", errUpdateSub);
    } else {
      console.log("Submission update success!");
    }
  }
}
run();
