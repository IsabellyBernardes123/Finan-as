
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hgxrudjiuwejoyhnkvca.supabase.co';
const supabaseAnonKey = 'sb_publishable_6R8duPHnAKXlMIoY0EgcNg_i3zgH4px';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
