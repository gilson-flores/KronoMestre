import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { serverCache } from '@/lib/server-cache';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const teacherId = searchParams.get('teacherId') || '5IdpwffjnhewdZ5dONRB9QoIRBZ2';

    // 1. Responde instantaneamente pela memória do servidor (0 leituras no Firestore)
    const presenceData = serverCache.getOnlinePresence(teacherId);

    const activeStudents = presenceData.onlineStudentIds.map((id) => ({
      id,
      lastActiveAt: new Date().toISOString(),
    }));

    return NextResponse.json({
      onlineCount: presenceData.onlineCount,
      onlineStudents: activeStudents,
    });
  } catch (err: any) {
    console.warn('[Presence API] Erro ao consultar presença:', err?.message);
    return NextResponse.json({
      onlineCount: 0,
      onlineStudents: [],
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { studentId, ownerTeacherId = '5IdpwffjnhewdZ5dONRB9QoIRBZ2', turma, action = 'ping' } = body;

    if (!studentId) {
      return NextResponse.json({ error: 'studentId é obrigatório' }, { status: 400 });
    }

    const isOffline = action === 'offline';
    const nowIso = new Date().toISOString();

    // Registra imediatamente em memória (0 leituras/escritas no Firestore)
    serverCache.recordPresence(ownerTeacherId, String(studentId), !isOffline, { turma });

    // Oportunisticamente grava no Firestore apenas se não houver bloqueio de cota
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
            isOnline: !isOffline,
            lastActiveAt: nowIso,
            ...(turma ? { turma: String(turma) } : {}),
          },
          { merge: true }
        );
      } catch (dbErr: any) {
        if (serverCache.checkIsQuotaError(dbErr)) {
          serverCache.triggerQuotaCooldown(10);
        }
      }
    }

    return NextResponse.json({
      success: true,
      isOnline: !isOffline,
      lastActiveAt: nowIso,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Erro ao registrar presença' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');
    const ownerTeacherId = searchParams.get('ownerTeacherId') || '5IdpwffjnhewdZ5dONRB9QoIRBZ2';

    if (studentId) {
      serverCache.recordPresence(ownerTeacherId, String(studentId), false);

      if (!serverCache.isQuotaBlocked() && (isOffline || serverCache.shouldPersistPresence(ownerTeacherId, String(studentId)))) {
        try {
          const db = getAdminDb();
          await db
            .collection('tenants')
            .doc(ownerTeacherId)
            .collection('students')
            .doc(String(studentId))
            .set(
              {
                isOnline: false,
                lastActiveAt: new Date().toISOString(),
              },
              { merge: true }
            );
        } catch (dbErr: any) {
          if (serverCache.checkIsQuotaError(dbErr)) {
            serverCache.triggerQuotaCooldown(10);
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Erro ao remover presença' }, { status: 500 });
  }
}

