import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data: activities, error } = await supabase.from('activities').select('*');
  if (error) console.error(error);
  console.log(`Total activities: ${activities?.length}`);
  
  activities?.forEach(a => {
    const isChild = a.adapted_from_id || a.is_adapted || a.recovery_from_id || a.is_recovery;
    console.log(`ID: ${a.id} | Child? ${!!isChild} | Title: ${a.title}`);
  });
}
run();
