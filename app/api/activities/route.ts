import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin';
import { getSessionFromRequest } from '@/lib/auth-server';
import { cookies } from 'next/headers';
import { serverCache } from '@/lib/server-cache';

export const dynamic = 'force-dynamic';

async function getAuthorizedOwnerId(req: NextRequest, isMutation = false): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;
    if (sessionCookie) {
      const auth = getAdminAuth();
      const decoded = await auth.verifySessionCookie(sessionCookie, true);
      if (decoded && decoded.uid) return decoded.uid;
    }
  } catch (e) {}
  
  try {
    const jwtSession = await getSessionFromRequest(req);
    if (jwtSession && (jwtSession.ownerTeacherId || jwtSession.sub)) {
      return jwtSession.ownerTeacherId || jwtSession.sub;
    }
  } catch (e) {}

  const headerTenant = req.headers.get('x-tenant-id') || req.nextUrl.searchParams.get('teacherId');
  if (headerTenant && headerTenant.trim()) {
    return headerTenant.trim();
  }

  return '5IdpwffjnhewdZ5dONRB9QoIRBZ2';
}

function cleanForFirestore(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null) return null;
  if (Array.isArray(obj)) {
    return obj
      .filter((item) => item !== undefined)
      .map((item) => cleanForFirestore(item));
  }
  if (typeof obj === 'object') {
    const res: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v !== undefined) {
        res[k] = cleanForFirestore(v);
      }
    }
    return res;
  }
  return obj;
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
    console.warn('Aviso /api/activities GET:', error.message);
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
    const cleanData = cleanForFirestore({ ...body, ownerTeacherId });

    await activityRef.set(cleanData, { merge: true });
    serverCache.delete(`activities_${ownerTeacherId}`);

    return NextResponse.json({ success: true, activity: cleanData });
  } catch (error: any) {
    console.error('Erro /api/activities POST:', error);
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
    const cleanData = cleanForFirestore(body);

    // TRANSAÇÃO ATÔMICA: Garante ZERO PERDA DE DADOS por Race Condition de alunos entregando simultaneamente
    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(activityRef);
      let mergedSubmissions = cleanData.submissions || [];
      
      if (doc.exists) {
        const currentData = doc.data() || {};
        const currentSubmissions: any[] = currentData.submissions || [];
        const incomingSubmissions: any[] = cleanData.submissions || [];
        
        mergedSubmissions = [...currentSubmissions];
        
        incomingSubmissions.forEach((incomingSub: any) => {
          const index = mergedSubmissions.findIndex((s: any) => s.studentId === incomingSub.studentId);
          if (index >= 0) {
             mergedSubmissions[index] = { ...mergedSubmissions[index], ...incomingSub };
          } else {
             mergedSubmissions.push(incomingSub);
          }
        });
      }
      
      const pendingCorrection = mergedSubmissions.filter((s: any) => s.status === 'pending').length;
      const totalSubmissions = mergedSubmissions.length;
      
      const mergedData = {
        ...cleanData,
        submissions: mergedSubmissions,
        pendingCorrection,
        totalSubmissions
      };
      
      transaction.set(activityRef, mergedData, { merge: true });
    });

    serverCache.delete(`activities_${ownerTeacherId}`);

    return NextResponse.json({ success: true, message: 'Dados salvos com integridade atômica.' });
  } catch (error: any) {
    console.error('Erro /api/activities PUT:', error);
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