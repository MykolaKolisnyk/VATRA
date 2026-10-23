// ВАТРА — Supabase client bootstrap.
// This file uses only the public publishable key. Never put a secret/service_role key here.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const SUPABASE_URL = 'https://rjasunoawrxvetwadylh.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_agvPTuxV0igjxgjfd0JdWw_87GaCUS-';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});
