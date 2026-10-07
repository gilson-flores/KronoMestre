import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { getSessionFromRequest } from '@/lib/auth-server';
import { serverCache } from '@/lib/server-cache';

export const dynamic = 'force-dynamic';

async function getAuthorizedTeacherId(request: Request): Promise<string | null> {
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
    if (jwtSession && (jwtSession.ownerTeacherId || jwtSession.sub)) {
      return jwtSession.ownerTeacherId || jwtSession.sub;
    }
  } catch {}

  return null;
}

// 1. LER ARQUIVOS (GET)
export async function GET(request: Request) {
  try {
    const teacherId = await getAuthorizedTeacherId(request);
    if (!teacherId) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

    const cacheKey = `library_${teacherId}`;
    const files = await serverCache.getOrSet(cacheKey, 300, async () => {
      const db = getAdminDb();
      const snapshot = await db.collection('tenants').doc(teacherId).collection('library_files').get();
      return snapshot.docs.map(doc => doc.data());
    });

    return NextResponse.json({ success: true, files });
  } catch (error: any) {
    console.warn('Aviso ao ler biblioteca no Firestore (possível cota excedida):', error.message);
    return NextResponse.json({ success: true, files: [], warning: error.message }, { status: 200 });
  }
}

// 2. SALVAR ARQUIVO (POST)
export async function POST(request: Request) {
  try {
    const teacherId = await getAuthorizedTeacherId(request);
    if (!teacherId) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

    const db = getAdminDb();
    const fileData = await request.json();
    if (!fileData.id) return NextResponse.json({ error: 'ID do arquivo ausente.' }, { status: 400 });

    try {
      await db.collection('tenants').doc(teacherId).collection('library_files').doc(fileData.id).set(fileData);
      serverCache.delete(`library_${teacherId}`);
    } catch (dbErr: any) {
      console.warn('Aviso ao salvar arquivo no Firestore (possível cota excedida):', dbErr?.message);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao processar arquivo:', error);
    return NextResponse.json({ error: 'Erro ao processar arquivo.' }, { status: 500 });
  }
}

// 3. DELETAR ARQUIVO (DELETE)
export async function DELETE(request: Request) {
  try {
    const teacherId = await getAuthorizedTeacherId(request);
    if (!teacherId) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

    const db = getAdminDb();
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('id');
    if (!fileId) return NextResponse.json({ error: 'ID do arquivo ausente.' }, { status: 400 });

    try {
      await db.collection('tenants').doc(teacherId).collection('library_files').doc(fileId).delete();
      serverCache.delete(`library_${teacherId}`);
    } catch (dbErr: any) {
      console.warn('Aviso ao deletar arquivo no Firestore (possível cota excedida):', dbErr?.message);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao deletar arquivo:', error);
    return NextResponse.json({ error: 'Erro ao deletar arquivo.' }, { status: 500 });
  }
}
