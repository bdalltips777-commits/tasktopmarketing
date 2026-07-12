import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.rpc('get_triggers_list');
  if (error) {
    // If rpc doesn't exist, we can try running an ad-hoc query through some other means, 
    // or let's check if we can query pg_trigger or information_schema.triggers via postgrest if allowed,
    // but usually direct queries to system tables via PostgREST might be restricted. Let's try:
    const { data: data2, error: error2 } = await supabase.from('pg_trigger').select('*').limit(1);
    console.log("pg_trigger query:", error2 ? error2.message : data2);
  } else {
    console.log("Triggers list:", data);
  }
}
run();
