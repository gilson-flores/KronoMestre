import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { getSessionFromRequest } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/vinculos/restore
 * Restaura alunos e atividades arquivados no Firebase Firestore em lote (batch).
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || (session.role !== 'teacher' && session.role !== 'admin')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const ownerTeacherId = session.ownerTeacherId || session.sub;
    const body = await req.json();
    const { vinculoId, studentIds, activityIds } = body;

    const db = getAdminDb();
    const tenantRef = db.collection('tenants').doc(ownerTeacherId);
    const nowIso = new Date().toISOString();

    const batch = db.batch();
    let restoredStudentsCount = 0;
    let restoredActivitiesCount = 0;

    // 1. Restaurar alunos
    const studentsSnap = await tenantRef.collection('students').get();
    studentsSnap.docs.forEach((doc) => {
      const data = doc.data();
      const matchVinculo = vinculoId && data.archivedVinculoId === vinculoId;
      const matchId = Array.isArray(studentIds) && studentIds.includes(doc.id);

      if (data.isArchived && (matchVinculo || matchId)) {
        batch.set(
          doc.ref,
          {
            isArchived: false,
            archivedAt: null,
            archivedReason: null,
            archivedVinculoId: null,
            archivedSchool: null,
            updatedAt: nowIso,
          },
          { merge: true }
        );
        restoredStudentsCount++;
      }
    });

    // 2. Restaurar atividades
    const activitiesSnap = await tenantRef.collection('activities').get();
    activitiesSnap.docs.forEach((doc) => {
      const data = doc.data();
      const matchVinculo = vinculoId && data.archivedVinculoId === vinculoId;
      const matchId = Array.isArray(activityIds) && activityIds.includes(doc.id);

      if (data.isArchived && (matchVinculo || matchId)) {
        batch.set(
          doc.ref,
          {
            isArchived: false,
            archivedAt: null,
            archivedReason: null,
            archivedVinculoId: null,
            archivedSchool: null,
            updatedAt: nowIso,
          },
          { merge: true }
        );
        restoredActivitiesCount++;
      }
    });

    await batch.commit();

    return NextResponse.json({
      success: true,
      restoredStudentsCount,
      restoredActivitiesCount,
    });
  } catch (error: any) {
    console.error('Erro ao restaurar vínculo no Firestore:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro interno ao restaurar vínculo' },
      { status: 500 }
    );
  }
}
