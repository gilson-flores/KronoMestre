import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  // Test select with is_archived condition
  const { data: students, error } = await supabase
    .from('students')
    .select('id, full_name, is_archived')
    .or('is_archived.is.null,is_archived.eq.false');
    
  console.log('Query result count:', students?.length, 'Error:', error);
}
run();
