import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { toRcoDoc } from '@/lib/rco-doc';
import { serverCache } from '@/lib/server-cache';

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
      importedAtestados: 0,
      importedRcoEmissions: 0,
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

    // 4. Importar Atestados/RAD
    try {
      const { data: atestados, error: atErr } = await supabase.from('atestados_rad').select('*').limit(50000);
      if (!atErr && atestados && atestados.length > 0) {
        let batch = adminDb.batch();
        let ops = 0;
        for (const r of atestados) {
          const owner = String(r.owner_teacher_id || uid);
          const id = String(r.id || `atr-${Date.now()}-${ops}`);
          batch.set(
            adminDb.collection('tenants').doc(owner).collection('atestados_rad').doc(id),
            {
              id,
              studentId: r.student_id,
              studentName: r.student_name,
              studentTurma: r.student_turma || '',
              dataFalta: r.data_falta,
              dataAtestado: r.data_atestado,
              diasAtestado: Number(r.dias_atestado) || 1,
              dataFinal: r.data_final,
              motivo: r.motivo || null,
              tipo: r.tipo || 'Atestado',
              createdAt: r.created_at || new Date().toISOString(),
              ownerTeacherId: owner,
            },
            { merge: true }
          );
          ops++;
          stats.importedAtestados++;
          if (ops % 400 === 0) {
            await batch.commit();
            batch = adminDb.batch();
          }
        }
        await batch.commit();
      }
    } catch (err) {
      console.warn('[Migrate] Aviso atestados_rad:', err);
    }

    // 5. Importar emissões de RCO
    try {
      const { data: emissions, error: emErr } = await supabase.from('rco_emissions').select('*').limit(50000);
      if (!emErr && emissions && emissions.length > 0) {
        for (const e of emissions) {
          const owner = String(e.teacher_id || uid);
          const doc = toRcoDoc(e, owner);
          await adminDb.collection('tenants').doc(owner).collection('rco_emissions').doc(doc.id).set(doc, { merge: true });
          stats.importedRcoEmissions++;
        }
      }
    } catch (err) {
      console.warn('[Migrate] Aviso rco_emissions:', err);
    }

    for (const col of ['students', 'activities', 'atestados_rad', 'rco_emissions']) {
      serverCache.delete(`${col}_${uid}`);
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

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;
    if (!sessionCookie) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const uid = decoded.uid;
    const userEmail = (decoded.email || '').toLowerCase().trim();

    const tenantData = (await adminDb.collection('tenants').doc(uid).get()).data() || {};
    const isAdmin =
      tenantData.is_admin === true ||
      userEmail === '755840@profe.sed.sc.gov.br' ||
      userEmail === 'gilsonjuniores@gmail.com';
    if (!isAdmin) return NextResponse.json({ error: 'Apenas o Admin Supremo.' }, { status: 403 });

    const supabase = getSupabaseAdmin();
    const pairs: Array<[string, string]> = [
      ['students', 'students'],
      ['activities', 'activities'],
      ['atestados_rad', 'atestados_rad'],
      ['rco_emissions', 'rco_emissions'],
      ['second_teachers', 'second_teachers'],
      ['study_files', 'library_files'],
      ['chat_messages', 'messages'],
    ];

    const inventory: Record<string, { supabase: number | string; firestore: number }> = {};
    for (const [table, col] of pairs) {
      let sb: number | string = 'indisponível';
      if (supabase) {
        const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
        sb = error ? `erro: ${error.message}` : (count ?? 0);
      }
      const fsCount = await adminDb.collection('tenants').doc(uid).collection(col).count().get();
      inventory[table] = { supabase: sb, firestore: fsCount.data().count };
    }

    return NextResponse.json({
      success: true,
      note: 'Se algum "supabase" for maior que "firestore", ainda há dados a migrar.',
      inventory,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}
