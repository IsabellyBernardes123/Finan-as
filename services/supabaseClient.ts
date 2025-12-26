
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oedxdgzyviiaghtifszl.supabase.co';
const supabaseAnonKey = 'sb_publishable_uVyOboFx-MvclIncG1inig_zxoIvvZl';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
