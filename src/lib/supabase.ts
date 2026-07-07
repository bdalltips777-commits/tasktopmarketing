import { createClient } from '@supabase/supabase-js';

const env = (import.meta as any).env || {};

const supabaseUrl = env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) {
  console.warn(
    'Supabase environment variables (VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY) are missing. Please configure them in the Secrets / Environment panel.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
