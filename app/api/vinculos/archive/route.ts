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
    const { reason, schoolName, vinculoId, vinculoCode } = body;
    const nowIso = new Date().toISOString();

    const db = getAdminDb();
    const tenantRef = db.collection('tenants').doc(session.ownerTeacherId);
    const batch = db.batch();

    // 1. Arquivar Alunos Ativos
    const studentsSnap = await tenantRef.collection('students').get();
    studentsSnap.docs.forEach(doc => {
      if (!doc.data().isArchived) {
        batch.update(doc.ref, {
          isArchived: true,
          archivedAt: nowIso,
          archivedReason: reason || '',
          archivedVinculoId: vinculoId || '',
          archivedSchool: schoolName || '',
          archivedCode: vinculoCode || ''
        });
      }
    });

    // 2. Arquivar Atividades Ativas
    const activitiesSnap = await tenantRef.collection('activities').get();
    activitiesSnap.docs.forEach(doc => {
      if (!doc.data().isArchived) {
        batch.update(doc.ref, {
          isArchived: true,
          archivedAt: nowIso,
          archivedReason: reason || '',
          archivedVinculoId: vinculoId || '',
          archivedSchool: schoolName || '',
          archivedCode: vinculoCode || ''
        });
      }
    });

    await batch.commit();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro no arquivamento:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
