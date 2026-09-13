import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data: activities } = await supabase.from('activities').select('id, title');
  const { data: submissions } = await supabase.from('submissions').select('id, activity_id');
  
  let mainActsCount = 0;
  let pneActsCount = 0;
  let recActsCount = 0;
  
  let mainSubsCount = 0;
  let pneSubsCount = 0;
  let recSubsCount = 0;
  
  const actMap = {};
  
  activities?.forEach(a => {
    actMap[a.id] = a.title;
    if (a.title.includes('[PNE')) pneActsCount++;
    else if (a.title.includes('[Recuperação Paralela]')) recActsCount++;
    else if (a.title.includes('Recuperação da prova')) recActsCount++; // the other 3
    else mainActsCount++;
  });
  
  submissions?.forEach(s => {
    const title = actMap[s.activity_id];
    if (!title) {
       console.log('No title for', s.activity_id);
    } else if (title.includes('[PNE')) {
       pneSubsCount++;
    } else if (title.includes('[Recuperação Paralela]') || title.includes('Recuperação da prova')) {
       recSubsCount++;
    } else {
       mainSubsCount++;
    }
  });

  console.log(`\n--- QUEBRA DE ATIVIDADES (Total: ${activities?.length}) ---`);
  console.log(`- Mães (Principais): ${mainActsCount}`);
  console.log(`- PNE: ${pneActsCount}`);
  console.log(`- Recuperação (Paralela/Prova): ${recActsCount}`);

  console.log(`\n--- QUEBRA DE SUBMISSÕES (Total: ${submissions?.length}) ---`);
  console.log(`- Em Mães (Principais): ${mainSubsCount}`);
  console.log(`- Em PNE: ${pneSubsCount}`);
  console.log(`- Em Recuperação: ${recSubsCount}`);
  
  console.log(`\nSoma final: ${mainSubsCount} + ${pneSubsCount} + ${recSubsCount} = ${mainSubsCount + pneSubsCount + recSubsCount}`);
}
run();
