import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });
console.log('Env keys:', Object.keys(process.env).filter(k => k.includes('SUPABASE')));
