import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await supabase.rpc('claim_gift_code_safe', {
    target_user_id: '00000000-0000-0000-0000-000000000000',
    input_code: 'TEST'
  });
  console.log("DATA:", data);
  console.log("ERROR:", error);
}

test();
