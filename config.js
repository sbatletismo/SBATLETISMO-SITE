import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

export const SUPABASE_URL = 'https://xiawqzxqoimgdfjmgyqy.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_RfHhNxAeZRag1kKKMduqvw_JzX6HJux';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
