import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

const FIVE_MINUTES_MS = 5 * 60 * 1000;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const teacherId = searchParams.get('teacherId') || '5IdpwffjnhewdZ5dONRB9QoIRBZ2';

    const db = getAdminDb();
    const studentsRef = db
      .collection('tenants')
      .doc(teacherId)
      .collection('students');

    const snapshot = await studentsRef.where('isOnline', '==', true).get();
    const now = Date.now();
    const activeStudents: Array<{ id: string; lastActiveAt: string; turma?: string }> = [];

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (data.lastActiveAt) {
        const diff = now - new Date(data.lastActiveAt).getTime();
        if (diff <= FIVE_MINUTES_MS) {
          activeStudents.push({
            id: doc.id,
            lastActiveAt: data.lastActiveAt,
            turma: data.turma,
          });
        }
      }
    });

    return NextResponse.json({
      onlineCount: activeStudents.length,
      onlineStudents: activeStudents,
    });
  } catch (err: any) {
    console.warn('[Presence API] Erro ao consultar presença no Firestore:', err?.message);
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
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Erro ao remover presença' }, { status: 500 });
  }
}
