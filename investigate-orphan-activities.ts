import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data: activities } = await supabase.from('activities').select('id');
  const activityIds = new Set(activities?.map(a => a.id));
  
  const { data: submissions } = await supabase.from('submissions').select('id, activity_id');
  let orphanSubs = 0;
  submissions?.forEach(s => {
    if (!activityIds.has(s.activity_id)) {
      orphanSubs++;
    }
  });
  
  console.log(`Submissions for activities NOT in activities table: ${orphanSubs}`);
}
run();
