import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data: activities, error } = await supabase
    .from('activities')
    .select('id, title, is_archived')
    .or('is_archived.is.null,is_archived.eq.false');
    
  console.log('Query result count:', activities?.length, 'Error:', error);
}
run();
