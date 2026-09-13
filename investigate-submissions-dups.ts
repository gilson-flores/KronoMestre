import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data: submissions } = await supabase.from('submissions').select('id, activity_id, student_id, student_name');
  
  const subTracker = new Map();
  let duplicateCount = 0;
  
  submissions?.forEach(s => {
    const key = `${s.activity_id}_${s.student_id}`;
    if (!subTracker.has(key)) {
      subTracker.set(key, [s]);
    } else {
      subTracker.get(key).push(s);
      duplicateCount++;
    }
  });
  
  console.log(`Duplicate combinations of activity+student: ${duplicateCount}`);
  
  if (duplicateCount === 0) {
     // Let's count submissions per activity
     const byAct = {};
     submissions?.forEach(s => {
       byAct[s.activity_id] = (byAct[s.activity_id] || 0) + 1;
     });
     console.log("Submissions per activity ID:", byAct);
  }
}
run();
