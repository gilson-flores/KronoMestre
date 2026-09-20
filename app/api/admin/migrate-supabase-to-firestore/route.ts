import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const uid = decoded.uid;
    const userEmail = (decoded.email || '').toLowerCase().trim();

    // Verificação de Admin Supremo
    const tenantSnap = await adminDb.collection('tenants').doc(uid).get();
    const tenantData = tenantSnap.data() || {};
    const isAdmin =
      tenantData.is_admin === true ||
      userEmail === '755840@profe.sed.sc.gov.br' ||
      userEmail === 'gilsonjuniores@gmail.com';

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Apenas o Admin Supremo pode executar a importação de dados.' },
        { status: 403 }
      );
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase Admin não configurado nas variáveis de ambiente (.env.local).' },
        { status: 500 }
      );
    }

    let stats = {
      importedStudents: 0,
      importedActivities: 0,
      teacherProfileUpdated: false,
    };

    // 1. Importar perfil do professor da tabela 'teachers'
    try {
      const { data: teachers } = await supabase
        .from('teachers')
        .select('*')
        .or(`email.ilike.%755840%,email.ilike.%gilson%`)
        .limit(1);

      if (teachers && teachers.length > 0) {
        const t = teachers[0];
        await adminDb.collection('tenants').doc(uid).set(
          {
            name: t.name || 'Gilson Flores',
            nome: t.name || 'Gilson Flores',
            subject: t.subject || 'Sociologia',
            school: t.school || '',
            phone: t.phone || '',
            avatarUrl: t.avatar_url || '',
            matriculaFuncional: t.matricula_funcional || '',
            is_admin: true,
            plan_type: 'unlimited',
            imported_from_supabase: true,
            imported_at: new Date().toISOString(),
          },
          { merge: true }
        );
        stats.teacherProfileUpdated = true;
      }
    } catch (err) {
      console.warn('[Migrate] Aviso ao consultar perfil do professor no Supabase:', err);
    }

    // 2. Importar Alunos (tabela 'students') para tenants/{uid}/students
    try {
      const { data: students, error: stuErr } = await supabase
        .from('students')
        .select('*');

      if (!stuErr && students && students.length > 0) {
        const batch = adminDb.batch();
        let count = 0;

        for (const s of students) {
          const studentId = s.id ? String(s.id) : `STU-${Date.now()}-${count}`;
          const docRef = adminDb.collection('tenants').doc(uid).collection('students').doc(studentId);

          batch.set(
            docRef,
            {
              id: studentId,
              fullName: s.full_name || s.name || s.fullName || '',
              turma: s.turma || s.class_room || '',
              matricula: s.matricula || '',
              isPne: Boolean(s.is_pne || s.isPne),
              pneCid: s.pne_cid || s.pneCid || '',
              pneObservation: s.pne_observation || s.pneObservation || '',
              passwordHash: s.password_hash || s.passwordHash || '',
              avatarUrl: s.avatar_url || s.avatarUrl || '',
              updatedAt: s.updated_at || new Date().toISOString(),
            },
            { merge: true }
          );

          count++;
          if (count % 400 === 0) {
            await batch.commit();
          }
        }

        await batch.commit();
        stats.importedStudents = count;
      }
    } catch (err) {
      console.warn('[Migrate] Aviso ao consultar alunos no Supabase:', err);
    }

    // 3. Importar Atividades (tabela 'activities') para tenants/{uid}/activities
    try {
      const { data: activities, error: actErr } = await supabase
        .from('activities')
        .select('*');

      if (!actErr && activities && activities.length > 0) {
        const batch = adminDb.batch();
        let count = 0;

        for (const a of activities) {
          const activityId = a.id ? String(a.id) : `ACT-${Date.now()}-${count}`;
          const docRef = adminDb.collection('tenants').doc(uid).collection('activities').doc(activityId);

          batch.set(
            docRef,
            {
              id: activityId,
              title: a.title || '',
              description: a.description || '',
              turmas: a.turmas || (a.turma ? [a.turma] : []),
              turma: a.turma || '',
              weight: a.weight || 1,
              dueDate: a.due_date || a.dueDate || '',
              type: a.type || 'Dissertativa',
              quarter: a.quarter || 1,
              pneAdapted: Boolean(a.pne_adapted || a.pneAdapted),
              status: a.status || 'published',
              createdAt: a.created_at || new Date().toISOString(),
              updatedAt: a.updated_at || new Date().toISOString(),
            },
            { merge: true }
          );

          count++;
          if (count % 400 === 0) {
            await batch.commit();
          }
        }

        await batch.commit();
        stats.importedActivities = count;
      }
    } catch (err) {
      console.warn('[Migrate] Aviso ao consultar atividades no Supabase:', err);
    }

    return NextResponse.json({
      success: true,
      message: 'Migração do Supabase para o Firestore executada com sucesso!',
      stats,
    });
  } catch (error: any) {
    console.error('[Migrate API] Erro na migração:', error);
    return NextResponse.json(
      { error: `Erro na migração: ${error.message || String(error)}` },
      { status: 500 }
    );
  }
}
