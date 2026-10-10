import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin';
import { getSessionFromRequest } from '@/lib/auth-server';
import { cookies } from 'next/headers';
import { serverCache } from '@/lib/server-cache';

export const dynamic = 'force-dynamic';

// Helper de Autorização Universal (Reconhece o Professor Titular e o 2º Professor)
async function getAuthorizedOwnerId(req: NextRequest, isMutation = false): Promise<string | null> {
  // 1. Tenta validar o Titular pelo cookie seguro do Firebase Admin
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;
    if (sessionCookie) {
      const auth = getAdminAuth();
      const decoded = await auth.verifySessionCookie(sessionCookie, true);
      if (decoded && decoded.uid) return decoded.uid; // É o Professor Titular
    }
  } catch (e) {}
  
  // 2. Tenta validar o Professor Titular, 2º Professor ou Aluno pelo JWT
  try {
    const jwtSession = await getSessionFromRequest(req);
    if (jwtSession && (jwtSession.ownerTeacherId || jwtSession.sub)) {
      return jwtSession.ownerTeacherId || jwtSession.sub;
    }
  } catch (e) {}

  // 3. Fallback Seguro APENAS para leituras (GET), garantindo catálogo no preview sem permitir mutações não autenticadas
  if (!isMutation) {
    return '5IdpwffjnhewdZ5dONRB9QoIRBZ2';
  }

  return null;
}

export async function GET(req: NextRequest) {
  try {
    const ownerTeacherId = await getAuthorizedOwnerId(req);
    if (!ownerTeacherId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const cacheKey = `activities_${ownerTeacherId}`;

    const activities = await serverCache.getOrSet(cacheKey, 180, async () => {
      const db = getAdminDb();
      const activitiesRef = db.collection('tenants').doc(ownerTeacherId).collection('activities');
      const snapshot = await activitiesRef.get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    });

    return NextResponse.json({ activities });
  } catch (error: any) {
    console.warn('Aviso /api/activities GET (possível cota excedida):', error.message);
    const fallbackActivities = serverCache.getLastKnown<any[]>(`activities_${await getAuthorizedOwnerId(req)}`) || [];
    return NextResponse.json({ activities: fallbackActivities, warning: error.message }, { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ownerTeacherId = await getAuthorizedOwnerId(req, true);
    if (!ownerTeacherId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const db = getAdminDb();
    const body = await req.json();
    
    if (!body.id) {
      body.id = `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    }

    const activityRef = db.collection('tenants').doc(ownerTeacherId).collection('activities').doc(body.id);
    
    const cleanData = { ...body, ownerTeacherId };
    // Firebase rejeita undefined
    Object.keys(cleanData).forEach(key => {
      if (cleanData[key] === undefined) delete cleanData[key];
    });

    await activityRef.set(cleanData, { merge: true });
    serverCache.delete(`activities_${ownerTeacherId}`);

    return NextResponse.json({ success: true, activity: cleanData });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const ownerTeacherId = await getAuthorizedOwnerId(req, true);
    if (!ownerTeacherId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const db = getAdminDb();
    const body = await req.json();
    
    if (!body.id) {
      return NextResponse.json({ error: 'ID ausente' }, { status: 400 });
    }

    const activityRef = db.collection('tenants').doc(ownerTeacherId).collection('activities').doc(body.id);
    
    const cleanData = { ...body };
    Object.keys(cleanData).forEach(key => {
      if (cleanData[key] === undefined) delete cleanData[key];
    });

    await activityRef.set(cleanData, { merge: true });
    serverCache.delete(`activities_${ownerTeacherId}`);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const ownerTeacherId = await getAuthorizedOwnerId(req, true);
    if (!ownerTeacherId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID ausente' }, { status: 400 });
    }

    const db = getAdminDb();
    const activityRef = db.collection('tenants').doc(ownerTeacherId).collection('activities').doc(id);
    await activityRef.delete();
    serverCache.delete(`activities_${ownerTeacherId}`);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
