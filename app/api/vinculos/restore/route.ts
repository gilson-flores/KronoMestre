import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { getSessionFromRequest } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || !session.ownerTeacherId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { studentIds = [], activityIds = [] } = body;

    const db = getAdminDb();
    const tenantRef = db.collection('tenants').doc(session.ownerTeacherId);
    const batch = db.batch();

    // 1. Restaurar Alunos
    for (const id of studentIds) {
      batch.update(tenantRef.collection('students').doc(id), {
        isArchived: false,
        archivedAt: null,
        archivedReason: null,
        archivedVinculoId: null,
        archivedSchool: null,
        archivedCode: null
      });
    }

    // 2. Restaurar Atividades
    for (const id of activityIds) {
      batch.update(tenantRef.collection('activities').doc(id), {
        isArchived: false,
        archivedAt: null,
        archivedReason: null,
        archivedVinculoId: null,
        archivedSchool: null,
        archivedCode: null
      });
    }

    await batch.commit();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro na restauração:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
