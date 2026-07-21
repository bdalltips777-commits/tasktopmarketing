const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function test() {
  // get anon key and url from .env
  const code = fs.readFileSync('src/lib/supabase.ts', 'utf-8');
  let url = '', key = '';
  code.split('\n').forEach(line => {
    if (line.includes('supabaseUrl =')) url = line.split("'")[1] || line.split('"')[1];
    if (line.includes('supabaseAnonKey =')) key = line.split("'")[1] || line.split('"')[1];
  });
  
  if (!url) {
    console.log("no url"); return;
  }
  const supabase = createClient(url, key);
  
  const { data: users } = await supabase.from('profiles').select('*').limit(1);
  console.log("users:", users);
}
test();
