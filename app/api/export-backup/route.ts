import { NextResponse, NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { getSessionFromRequest } from '@/lib/auth-server';
import { fromRcoDoc } from '@/lib/rco-doc';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  let ownerId: string | null = null;

  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;
    if (sessionCookie) {
      const auth = getAdminAuth();
      const decoded = await auth.verifySessionCookie(sessionCookie, true);
      if (decoded && decoded.uid) ownerId = decoded.uid;
    }
  } catch {}

  if (!ownerId) {
    try {
      const jwtSession = await getSessionFromRequest(req);
      if (jwtSession && ((jwtSession.role as string) === 'teacher' || (jwtSession.role as string) === 'admin')) {
        ownerId = jwtSession.ownerTeacherId || jwtSession.sub;
      }
    } catch {}
  }

  if (!ownerId) {
    return NextResponse.json(
      { error: 'Acesso negado. Apenas o Professor Titular ou Administrador autenticado pode exportar backups.' },
      { status: 401 }
    );
  }

  try {
    const db = getAdminDb();
    const tenantRef = db.collection('tenants').doc(ownerId);

    const readCol = async (name: string) => {
      const snap = await tenantRef.collection(name).get();
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    };

    const [
      tenantSnap,
      students,
      activities,
      atestados_rad,
      second_teachers,
      study_files,
      chat_messages,
      rcoRaw,
    ] = await Promise.all([
      tenantRef.get(),
      readCol('students'),
      readCol('activities'),
      readCol('atestados_rad'),
      readCol('second_teachers'),
      readCol('library_files'),
      readCol('messages'),
      readCol('rco_emissions'),
    ]);

    const rco_emissions = rcoRaw.map((d: any) => fromRcoDoc(d));
    const teachers = tenantSnap.exists ? [{ id: tenantSnap.id, ...tenantSnap.data() }] : [];

    const submissions = (activities as any[]).flatMap((a) =>
      (Array.isArray(a.submissions) ? a.submissions : []).map((s: any) => ({ activityId: a.id, ...s }))
    );

    const backupData = {
      timestamp: new Date().toISOString(),
      metadata: {
        students_count: students.length,
        activities_count: activities.length,
        submissions_count: submissions.length,
        atestados_rad_count: atestados_rad.length,
        teachers_count: teachers.length,
        second_teachers_count: second_teachers.length,
        study_files_count: study_files.length,
        chat_messages_count: chat_messages.length,
        rco_emissions_count: rco_emissions.length,
      },
      data: {
        students,
        activities,
        submissions,
        atestados_rad,
        teachers,
        second_teachers,
        study_files,
        chat_messages,
        rco_emissions,
      },
    };

    return new NextResponse(JSON.stringify(backupData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="backup_sociologia_online_${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Erro ao gerar backup', details: err.message }, { status: 500 });
  }
}
