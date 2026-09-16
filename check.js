const { getSupabaseAdmin } = require('./lib/supabase-admin'); getSupabaseAdmin().from('students').select('*', { count: 'exact' }).then(console.log)
