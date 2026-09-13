import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data: activities } = await supabase.from('activities').select('*');
  
  if (activities && activities.length > 0) {
    console.log("Activity columns:", Object.keys(activities[0]));
  }
  
  const parents = activities?.filter(a => !a.adapted_from_id && !a.is_adapted && !a.recovery_from_id && !a.is_recovery);
  const children = activities?.filter(a => a.adapted_from_id || a.is_adapted || a.recovery_from_id || a.is_recovery);
  
  console.log(`Parents: ${parents?.length}, Children: ${children?.length}`);
  
  // Show children IDs:
  console.log("Children IDs:", children?.map(c => c.id));
}
run();
