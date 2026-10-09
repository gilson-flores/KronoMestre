import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { serverCache } from '@/lib/server-cache';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { studentId, ownerTeacherId, action } = body;

    if (!studentId || !ownerTeacherId) {
      return NextResponse.json({ error: 'Parâmetros incompletos' }, { status: 400 });
    }

    const isOffline = action === 'offline';
    const nowIso = new Date().toISOString();

    const db = getAdminDb();
    const studentRef = db
      .collection('tenants')
      .doc(ownerTeacherId)
      .collection('students')
      .doc(studentId);

    await studentRef.set(
      {
        lastActiveAt: nowIso,
        isOnline: !isOffline,
      },
      { merge: true }
    );

    // Invalida cache para que consultas subsequentes vejam a presença atualizada
    serverCache.delete(`students_${ownerTeacherId}`);

    return NextResponse.json({ success: true, isOnline: !isOffline, lastActiveAt: nowIso });
  } catch (error: any) {
    console.warn('[Heartbeat API] Erro ao registrar presença do aluno:', error?.message);
    return NextResponse.json({ error: error?.message || 'Erro ao registrar presença' }, { status: 500 });
  }
}
