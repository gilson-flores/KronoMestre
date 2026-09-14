import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data: submissions, error } = await supabase.from('submissions').select('*');
  if (error || !submissions) {
    console.error(error);
    return;
  }
  
  // What columns do we have?
  if (submissions.length > 0) {
    console.log("Columns:", Object.keys(submissions[0]));
  }

  // Count by status if exists
  const statusCounts = {};
  submissions.forEach(s => {
    const stat = s.status || 'NO_STATUS_COLUMN';
    statusCounts[stat] = (statusCounts[stat] || 0) + 1;
  });
  console.log("By status:", statusCounts);

  // Cross check with active students?
  const { data: students } = await supabase.from('students').select('id, status, is_archived');
  const activeStudentIds = new Set(students?.filter(st => st.status !== 'INACTIVE' && !st.is_archived).map(st => st.id));
  
  let fromActive = 0;
  let fromInactive = 0;
  submissions.forEach(s => {
    if (activeStudentIds.has(s.student_id)) fromActive++;
    else fromInactive++;
  });
  
  console.log(`Submissions from active students: ${fromActive}`);
  console.log(`Submissions from inactive/archived students: ${fromInactive}`);
}
run();
