import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. Valida quem está logado (Firestore)
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;
    if (!sessionCookie) return NextResponse.json({ error: 'Você precisa estar logado como Professor para puxar os arquivos.' }, { status: 401 });

    const adminAuth = getAdminAuth();
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const uid = decoded.uid;
    const db = getAdminDb();

    // 2. Conecta no Supabase antigo
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 3. Busca Alunos Arquivados
    const { data: archivedStudents, error: errSt } = await supabase
      .from('students')
      .select('*')
      .eq('is_archived', true);

    // 4. Busca Atividades Arquivadas
    const { data: archivedActivities, error: errAct } = await supabase
      .from('activities')
      .select('*')
      .eq('is_archived', true);

    let studentsCount = 0;
    let activitiesCount = 0;

    // 5. Injeta no Firestore usando gravação em lote (Batch)
    const batch = db.batch();
    
    if (archivedStudents && archivedStudents.length > 0) {
       for (const st of archivedStudents) {
          const ref = db.collection('tenants').doc(uid).collection('students').doc(st.id);
          // Conversão de snake_case (Supabase) para camelCase (Firestore/App)
          const mappedSt = {
             ...st,
             fullName: st.full_name || st.fullName || st.name || '',
             avatarUrl: st.avatar_url || st.avatarUrl || '',
             passwordHash: st.password_hash || st.passwordHash || '',
             mustChangePassword: st.must_change_password || st.mustChangePassword || false,
             archivedVinculoId: st.archived_vinculo_id || st.archivedVinculoId || 'VINC-LEGADO',
             archivedReason: st.archived_reason || st.archivedReason || 'Importado do Supabase',
             archivedSchool: st.archived_school || st.archivedSchool || 'Escola Anterior',
             archivedAt: st.archived_at || st.archivedAt || new Date().toISOString(),
             isArchived: true
          };
          batch.set(ref, mappedSt, { merge: true });
          studentsCount++;
       }
    }

    if (archivedActivities && archivedActivities.length > 0) {
       for (const act of archivedActivities) {
          const ref = db.collection('tenants').doc(uid).collection('activities').doc(act.id);
          const mappedAct = {
             ...act,
             maxGrade: act.max_grade || act.maxGrade || 10,
             isAdapted: act.is_adapted || act.isAdapted || false,
             archivedVinculoId: act.archived_vinculo_id || act.archivedVinculoId || 'VINC-LEGADO',
             archivedReason: act.archived_reason || act.archivedReason || 'Importado do Supabase',
             archivedSchool: act.archived_school || act.archivedSchool || 'Escola Anterior',
             archivedAt: act.archived_at || act.archivedAt || new Date().toISOString(),
             isArchived: true
          };
          batch.set(ref, mappedAct, { merge: true });
          activitiesCount++;
       }
    }

    await batch.commit();

    return NextResponse.json({ 
        success: true, 
        message: `RESGATE CONCLUÍDO COM SUCESSO! ${studentsCount} alunos e ${activitiesCount} atividades arquivadas foram puxadas do Supabase e transferidas para o seu cofre no Firestore. Vá até a aba "Backup e Recuperação" para restaurá-las.` 
    });

  } catch (error: any) {
    console.error('Erro no resgate:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
