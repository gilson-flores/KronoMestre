import { NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const auth = getAdminAuth();
    const db = getAdminDb();

    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    const ownerTeacherId = decodedClaims.uid;

    const snapshot = await db.collection('tenants')
      .doc(ownerTeacherId)
      .collection('students')
      .get();

    const students = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json({ students });
  } catch (error: any) {
    console.error('Erro ao buscar alunos no Firestore:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const auth = getAdminAuth();
    const db = getAdminDb();

    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    const ownerTeacherId = decodedClaims.uid;

    const studentData = await request.json();
    const studentId = studentData.id || `STU-${Date.now()}`;

    await db.collection('tenants')
      .doc(ownerTeacherId)
      .collection('students')
      .doc(studentId)
      .set({
        ...studentData,
        id: studentId,
        updatedAt: new Date().toISOString()
      }, { merge: true });

    return NextResponse.json({ success: true, id: studentId });
  } catch (error: any) {
    console.error('Erro na API de Alunos:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  return POST(request);
}

export async function DELETE(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const auth = getAdminAuth();
    const db = getAdminDb();

    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    const ownerTeacherId = decodedClaims.uid;
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'ID ausente' }, { status: 400 });
    }

    await db.collection('tenants')
      .doc(ownerTeacherId)
      .collection('students')
      .doc(id)
      .delete();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}