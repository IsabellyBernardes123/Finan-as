
import { createClient } from '@supabase/supabase-js';

// Verifica se há credenciais salvas no localStorage (configuração do usuário)
const storedUrl = typeof window !== 'undefined' ? localStorage.getItem('financepro_sb_url') : null;
const storedKey = typeof window !== 'undefined' ? localStorage.getItem('financepro_sb_key') : null;

// Usa as credenciais salvas ou as padrões (Demo)
const supabaseUrl = storedUrl || 'https://hgxrudjiuwejoyhnkvca.supabase.co';
const supabaseAnonKey = storedKey || 'sb_publishable_6R8duPHnAKXlMIoY0EgcNg_i3zgH4px';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
