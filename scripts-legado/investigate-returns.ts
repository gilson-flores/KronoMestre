import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data: submissions } = await supabase.from('submissions').select('id, return_count');
  
  let returned = 0;
  let totalReturns = 0;
  submissions?.forEach(s => {
    if (s.return_count > 0) {
       returned++;
       totalReturns += s.return_count;
    }
  });
  
  console.log(`Submissions with return_count > 0: ${returned}, total returns: ${totalReturns}`);
}
run();
