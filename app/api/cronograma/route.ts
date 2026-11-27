import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { getSessionFromRequest } from '@/lib/auth-server';
import { serverCache } from '@/lib/server-cache';

export const dynamic = 'force-dynamic';

async function resolveAuthenticatedTeacherUid(request: Request): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;
    if (sessionCookie) {
      const adminAuth = getAdminAuth();
      const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
      if (decoded?.uid) return decoded.uid;
    }
  } catch {}

  try {
    const jwtSession = await getSessionFromRequest(request);
    if (jwtSession && (jwtSession.role === 'teacher' || !jwtSession.role) && jwtSession.sub) {
      return jwtSession.sub;
    }
  } catch {}

  return null;
}

export async function GET(req: NextRequest) {
  try {
    const uid = await resolveAuthenticatedTeacherUid(req);
    if (!uid) {
      return NextResponse.json({ ok: false, error: 'Não autorizado.' }, { status: 401 });
    }

    const cacheKey = `cronograma_${uid}`;
    const cached = serverCache.get<any>(cacheKey);
    if (cached) {
      return NextResponse.json({ ok: true, data: cached });
    }

    const adminDb = getAdminDb();
    const docRef = adminDb.collection('tenants').doc(uid).collection('cronograma').doc('main');
    const snap = await docRef.get();

    if (!snap.exists) {
      return NextResponse.json({ ok: true, data: null });
    }

    const data = snap.data() || null;
    if (data) {
      serverCache.set(cacheKey, data, 300);
    }

    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    console.error('[Cronograma API GET] Erro ao ler cronograma:', err?.message || err);
    return NextResponse.json(
      { ok: false, error: err?.message || 'Erro ao carregar cronograma.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const uid = await resolveAuthenticatedTeacherUid(req);
    if (!uid) {
      return NextResponse.json({ ok: false, error: 'Não autorizado.' }, { status: 401 });
    }

    const body = await req.json();
    const payload = {
      grade: Array.isArray(body?.grade) ? body.grade : [],
      intervals: Array.isArray(body?.intervals) ? body.intervals : [],
      planos: Array.isArray(body?.planos) ? body.planos : [],
      observacoes: Array.isArray(body?.observacoes) ? body.observacoes : [],
      updatedAt: new Date().toISOString(),
    };

    const adminDb = getAdminDb();
    const docRef = adminDb.collection('tenants').doc(uid).collection('cronograma').doc('main');
    await docRef.set(payload, { merge: true });

    const cacheKey = `cronograma_${uid}`;
    serverCache.set(cacheKey, payload, 300);

    return NextResponse.json({ ok: true, data: payload });
  } catch (err: any) {
    console.error('[Cronograma API POST] Erro ao salvar cronograma:', err?.message || err);
    return NextResponse.json(
      { ok: false, error: err?.message || 'Erro ao salvar cronograma no Firestore.' },
      { status: 500 }
    );
  }
}
