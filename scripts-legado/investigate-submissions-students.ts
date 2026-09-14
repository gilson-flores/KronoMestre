import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data: students } = await supabase.from('students').select('id');
  const studentIds = new Set(students?.map(s => s.id));
  
  const { data: submissions } = await supabase.from('submissions').select('*');
  let orphanSubs = 0;
  submissions?.forEach(s => {
    if (!studentIds.has(s.student_id)) {
      orphanSubs++;
    }
  });
  console.log(`Submissions belonging to deleted/missing students: ${orphanSubs}`);
  
  // Also what about registered in state system?
  const notRegistered = submissions?.filter(s => !s.registered_in_state_system).length;
  const registered = submissions?.filter(s => s.registered_in_state_system).length;
  console.log(`Registered in RCO: ${registered}, Not Registered: ${notRegistered}`);
}
run();
