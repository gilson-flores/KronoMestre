import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data: students, error: err1 } = await supabase.from('students').select('is_archived, archived_at, archived_reason').limit(1);
  console.log("Students:", err1 || students);
  const { data: activities, error: err2 } = await supabase.from('activities').select('is_archived, archived_at, archived_reason').limit(1);
  console.log("Activities:", err2 || activities);
}
run();
