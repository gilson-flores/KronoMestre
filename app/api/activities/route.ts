import { NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { getSessionFromRequest } from '@/lib/auth-server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

/**
 * Extrai o ID do professor proprietário (tenant) da requisição com suporte dual:
 * 1. Cookie 'session' do Firebase Auth (Professor)
 * 2. Cookie JWT de Sessão (lib/auth-server) (Alunos)
 */
async function resolveOwnerTeacherId(request: Request): Promise<{ ownerTeacherId: string; email?: string; role?: string } | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;
    if (sessionCookie) {
      const auth = getAdminAuth();
      const decoded = await auth.verifySessionCookie(sessionCookie, true);
      if (decoded && decoded.uid) {
        return {
          ownerTeacherId: decoded.tenant || decoded.ownerTeacherId || decoded.uid,
          email: decoded.email,
          role: decoded.role || 'teacher',
        };
      }
    }
  } catch {}

  try {
    const session = await getSessionFromRequest(request);
    if (session && (session.ownerTeacherId || session.sub)) {
      return {
        ownerTeacherId: session.ownerTeacherId || session.sub,
        email: session.email,
        role: session.role,
      };
    }
  } catch {}

  return null;
}

export async function GET(request: Request) {
  try {
    const session = await resolveOwnerTeacherId(request);
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const db = getAdminDb();
    const snapshot = await db.collection('tenants')
      .doc(session.ownerTeacherId)
      .collection('activities')
      .get();

    const activities = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json({ activities });
  } catch (error: any) {
    console.error('Erro GET atividades:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await resolveOwnerTeacherId(request);
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const activityData = await request.json();
    if (!activityData.id) {
      return NextResponse.json({ error: 'ID da atividade obrigatório' }, { status: 400 });
    }

    const db = getAdminDb();
    await db.collection('tenants')
      .doc(session.ownerTeacherId)
      .collection('activities')
      .doc(activityData.id)
      .set({
        ...activityData,
        updatedAt: new Date().toISOString()
      }, { merge: true });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro POST atividades:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  return POST(request);
}

export async function DELETE(request: Request) {
  try {
    const session = await resolveOwnerTeacherId(request);
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'ID ausente' }, { status: 400 });
    }

    const db = getAdminDb();
    await db.collection('tenants')
      .doc(session.ownerTeacherId)
      .collection('activities')
      .doc(id)
      .delete();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro DELETE atividades:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
