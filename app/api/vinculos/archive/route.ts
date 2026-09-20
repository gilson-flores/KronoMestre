import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { getSessionFromRequest } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/vinculos/archive
 * Arquiva alunos e atividades ativas do professor no Firebase Firestore em lote (batch).
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || (session.role !== 'teacher' && session.role !== 'admin')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const ownerTeacherId = session.ownerTeacherId || session.sub;
    const body = await req.json();
    const { reason, schoolName, vinculoId, vinculoCode } = body;

    const nowIso = new Date().toISOString();
    const finalReason = (reason || 'Troca de vínculo').trim();
    const finalSchool = (schoolName || 'Escola Estadual').trim();
    const finalVinculoId = vinculoId || `VINC-${Date.now().toString(36)}`;

    const db = getAdminDb();
    const tenantRef = db.collection('tenants').doc(ownerTeacherId);

    // 1. Buscar alunos ativos no Firestore
    const studentsSnap = await tenantRef.collection('students').get();
    const activeStudents = studentsSnap.docs.filter((doc) => {
      const data = doc.data();
      return !data.isArchived;
    });

    // 2. Buscar atividades ativas no Firestore
    const activitiesSnap = await tenantRef.collection('activities').get();
    const activeActivities = activitiesSnap.docs.filter((doc) => {
      const data = doc.data();
      return !data.isArchived;
    });

    // Executar batch update no Firestore
    const batch = db.batch();

    activeStudents.forEach((doc) => {
      batch.set(
        doc.ref,
        {
          isArchived: true,
          archivedAt: nowIso,
          archivedReason: finalReason,
          archivedVinculoId: finalVinculoId,
          archivedSchool: finalSchool,
          updatedAt: nowIso,
        },
        { merge: true }
      );
    });

    activeActivities.forEach((doc) => {
      batch.set(
        doc.ref,
        {
          isArchived: true,
          archivedAt: nowIso,
          archivedReason: finalReason,
          archivedVinculoId: finalVinculoId,
          archivedSchool: finalSchool,
          updatedAt: nowIso,
        },
        { merge: true }
      );
    });

    // Registrar o histórico do vínculo na coleção vinculos_historico do tenant
    const vinculoDocRef = tenantRef.collection('vinculos_historico').doc(finalVinculoId);
    batch.set(
      vinculoDocRef,
      {
        id: finalVinculoId,
        vinculoCode: vinculoCode || `Vínculo ${new Date().toLocaleDateString('pt-BR')}`,
        school: finalSchool,
        reason: finalReason,
        closedAt: nowIso,
        totalStudents: activeStudents.length,
        totalActivities: activeActivities.length,
        updatedAt: nowIso,
      },
      { merge: true }
    );

    await batch.commit();

    return NextResponse.json({
      success: true,
      vinculoId: finalVinculoId,
      studentsArchived: activeStudents.length,
      activitiesArchived: activeActivities.length,
    });
  } catch (error: any) {
    console.error('Erro ao arquivar vínculo no Firestore:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro interno ao arquivar vínculo' },
      { status: 500 }
    );
  }
}
