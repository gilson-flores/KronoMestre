import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { serverCache } from '@/lib/server-cache';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { studentId, ownerTeacherId, action, turma } = body;

    if (!studentId || !ownerTeacherId) {
      return NextResponse.json({ error: 'Parâmetros incompletos' }, { status: 400 });
    }

    const isOffline = action === 'offline';
    const nowIso = new Date().toISOString();

    // 1. Registra presença imediatamente em memória (0 leituras e 0 escritas no Firestore)
    serverCache.recordPresence(ownerTeacherId, String(studentId), !isOffline, { turma });

    // 2. Persistência oportunista no Firestore (apenas se a cota do Firebase não estiver bloqueada)
    if (!serverCache.isQuotaBlocked() && (isOffline || serverCache.shouldPersistPresence(ownerTeacherId, String(studentId)))) {
      try {
        const db = getAdminDb();
        const studentRef = db
          .collection('tenants')
          .doc(ownerTeacherId)
          .collection('students')
          .doc(String(studentId));

        await studentRef.set(
          {
            lastActiveAt: nowIso,
            isOnline: !isOffline,
          },
          { merge: true }
        );
      } catch (dbErr: any) {
        if (serverCache.checkIsQuotaError(dbErr)) {
          serverCache.triggerQuotaCooldown(10);
        }
        console.warn('[Heartbeat API] Firestore indisponível para presença persistida (mantida em memória):', dbErr?.message);
      }
    }

    // Regra de Ouro: NUNCA invalidar o cache da lista de alunos no heartbeat!
    // Heartbeat é periódico e frequente; invalidar o cache forçava re-leituras completas de todos os alunos.

    return NextResponse.json({ success: true, isOnline: !isOffline, lastActiveAt: nowIso });
  } catch (error: any) {
    console.warn('[Heartbeat API] Erro ao registrar presença do aluno:', error?.message);
    return NextResponse.json({ error: error?.message || 'Erro ao registrar presença' }, { status: 500 });
  }
}

