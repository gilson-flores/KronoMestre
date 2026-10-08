import { NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { getSessionFromRequest } from '@/lib/auth-server';
import { cookies } from 'next/headers';
import { serverCache } from '@/lib/server-cache';

export const dynamic = 'force-dynamic';

/**
 * Resolve o tenantId (Professor Admin Supremo) e o userId logado (Professor, Aluno ou 2º Professor)
 */
async function resolveSession(request: Request): Promise<{ tenantId: string; userId: string; role?: string } | null> {
  // 1. Sessão Firebase Auth (Professor Titular / Admin Supremo)
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;
    if (sessionCookie) {
      const auth = getAdminAuth();
      const decoded = await auth.verifySessionCookie(sessionCookie, true);
      if (decoded && decoded.uid) {
        return {
          tenantId: (decoded as any).tenant || (decoded as any).ownerTeacherId || decoded.uid,
          userId: decoded.uid,
          role: (decoded as any).role || 'teacher',
        };
      }
    }
  } catch {}

  // 2. Sessão JWT Híbrida (Aluno / 2º Professor)
  try {
    const session = await getSessionFromRequest(request);
    if (session && (session.ownerTeacherId || session.sub)) {
      return {
        tenantId: session.ownerTeacherId || session.sub,
        userId: session.sub,
        role: session.role,
      };
    }
  } catch {}

  return null;
}

/**
 * GET /api/messages
 * Retorna todas as mensagens do Tenant ordenadas cronologicamente
 */
export async function GET(request: Request) {
  try {
    const session = await resolveSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const cacheKey = `messages_${session.tenantId}`;

    const messages = await serverCache.getOrSet(cacheKey, 60, async () => {
      const db = getAdminDb();
      const snapshot = await db
        .collection('tenants')
        .doc(session.tenantId)
        .collection('messages')
        .orderBy('createdAtIso', 'asc')
        .get()
        .catch(async () => {
          // Fallback caso algum documento antigo não possua createdAtIso indexado
          return await db
            .collection('tenants')
            .doc(session.tenantId)
            .collection('messages')
            .get();
        });

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    });

    return NextResponse.json({ messages });
  } catch (error: any) {
    console.warn('Aviso ao buscar mensagens no Firestore (possível cota excedida):', error.message);
    const session = await resolveSession(request).catch(() => null);
    const fallbackMessages = session ? serverCache.getLastKnown<any[]>(`messages_${session.tenantId}`) || [] : [];
    return NextResponse.json({ messages: fallbackMessages, warning: error.message }, { status: 200 });
  }
}

/**
 * POST /api/messages
 * Salva uma nova mensagem (Aluno, Professor, Broadcast ou Auto-Reply IA) no Firestore
 */
export async function POST(request: Request) {
  try {
    const session = await resolveSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const msgId = body.id || `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = new Date().toISOString();

    const msgDoc = {
      id: msgId,
      threadId: body.threadId || '',
      senderId: body.senderId || session.userId,
      senderName: body.senderName || '',
      senderRole: body.senderRole || session.role || 'student',
      senderAvatar: body.senderAvatar || '',
      recipientId: body.recipientId || '',
      recipientName: body.recipientName || '',
      content: body.content || '',
      createdAt: body.createdAt || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      createdAtIso: body.createdAtIso || nowIso,
      read: Boolean(body.read),
      activityId: body.activityId || null,
      activityTitle: body.activityTitle || null,
    };

    const db = getAdminDb();
    await db
      .collection('tenants')
      .doc(session.tenantId)
      .collection('messages')
      .doc(msgId)
      .set(msgDoc, { merge: true });

    serverCache.delete(`messages_${session.tenantId}`);

    return NextResponse.json({ success: true, message: msgDoc });
  } catch (error: any) {
    console.error('Erro ao salvar mensagem no Firestore:', error);
    return NextResponse.json({ error: 'Erro interno ao salvar mensagem' }, { status: 500 });
  }
}

/**
 * PUT /api/messages
 * Marca mensagens de uma thread como lidas no Firestore
 */
export async function PUT(request: Request) {
  try {
    const session = await resolveSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { threadId, currentRole } = await request.json();
    if (!threadId) {
      return NextResponse.json({ error: 'threadId obrigatório' }, { status: 400 });
    }

    const db = getAdminDb();
    const messagesRef = db.collection('tenants').doc(session.tenantId).collection('messages');
    const snapshot = await messagesRef.where('read', '==', false).get();

    const batch = db.batch();
    let updatedCount = 0;

    snapshot.docs.forEach((doc) => {
      const m = doc.data();
      const belongsToThread =
        m.threadId === threadId || m.recipientId === threadId || m.senderId === threadId;
      if (belongsToThread && m.senderRole !== currentRole) {
        batch.update(doc.ref, { read: true });
        updatedCount++;
      }
    });

    if (updatedCount > 0) {
      await batch.commit();
      serverCache.delete(`messages_${session.tenantId}`);
    }

    return NextResponse.json({ success: true, updatedCount });
  } catch (error: any) {
    console.error('Erro ao marcar mensagens como lidas no Firestore:', error);
    return NextResponse.json({ error: 'Erro interno ao atualizar leitura' }, { status: 500 });
  }
}