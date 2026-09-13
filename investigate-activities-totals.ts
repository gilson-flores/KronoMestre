import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data: activities } = await supabase.from('activities').select('id, title, total_submissions');
  
  let totalInActivities = 0;
  activities?.forEach(a => {
    totalInActivities += (a.total_submissions || 0);
    console.log(`Activity ${a.id.substring(0, 8)} (${a.title}): ${a.total_submissions} submissions listed`);
  });
  console.log(`Total listed in activities.total_submissions: ${totalInActivities}`);
}
run();
