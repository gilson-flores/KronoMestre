import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin';
import { getSessionFromRequest } from '@/lib/auth-server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

// Helper de Autorização Universal (Reconhece o Professor Titular e o 2º Professor)
async function getAuthorizedOwnerId(req: NextRequest): Promise<string | null> {
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
  
  // 2. Tenta validar o 2º Professor ou Aluno pelo JWT
  try {
    const jwtSession = await getSessionFromRequest(req);
    if (jwtSession && jwtSession.ownerTeacherId) {
      return jwtSession.ownerTeacherId; // É o 2º Professor
    }
  } catch (e) {}

  return null;
}

export async function GET(req: NextRequest) {
  try {
    const ownerTeacherId = await getAuthorizedOwnerId(req);
    if (!ownerTeacherId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const db = getAdminDb();
    const studentsRef = db.collection('tenants').doc(ownerTeacherId).collection('students');
    const snapshot = await studentsRef.get();
    
    const students = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json({ students });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ownerTeacherId = await getAuthorizedOwnerId(req);
    if (!ownerTeacherId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const db = getAdminDb();
    const studentsRef = db.collection('tenants').doc(ownerTeacherId).collection('students');
    const body = await req.json();
    
    const studentsToProcess = Array.isArray(body) ? body : [body];
    const savedStudents = [];
    
    // Chunking para respeitar o limite de 500 operações do Firestore Batch
    const chunkSize = 400;
    for (let i = 0; i < studentsToProcess.length; i += chunkSize) {
      const chunk = studentsToProcess.slice(i, i + chunkSize);
      const batch = db.batch();

      for (const studentData of chunk) {
        const id = studentData.id || `std-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const docRef = studentsRef.doc(id);
        
        const cleanData: any = { 
          ...studentData, 
          id, 
          ownerTeacherId 
        };
        
        // Firebase rejeita undefined, então limpamos preventivamente a estrutura
        Object.keys(cleanData).forEach(key => {
          if (cleanData[key] === undefined) delete cleanData[key];
        });
        
        batch.set(docRef, cleanData, { merge: true });
        savedStudents.push(cleanData);
      }
      await batch.commit();
    }

    return NextResponse.json({ success: true, students: savedStudents });
  } catch (error: any) {
    console.error('Erro no POST /api/students:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const ownerTeacherId = await getAuthorizedOwnerId(req);
    if (!ownerTeacherId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const db = getAdminDb();
    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: 'ID ausente' }, { status: 400 });

    const studentRef = db.collection('tenants').doc(ownerTeacherId).collection('students').doc(body.id);
    
    const cleanData = { ...body };
    Object.keys(cleanData).forEach(key => {
      if (cleanData[key] === undefined) delete cleanData[key];
    });

    await studentRef.set(cleanData, { merge: true });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const ownerTeacherId = await getAuthorizedOwnerId(req);
    if (!ownerTeacherId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID ausente' }, { status: 400 });

    const db = getAdminDb();
    const studentsRef = db.collection('tenants').doc(ownerTeacherId).collection('students');

    // ====== EXCLUSÃO EM MASSA ======
    if (id === 'all') {
      const snapshot = await studentsRef.get();
      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      return NextResponse.json({ success: true, deletedCount: snapshot.docs.length });
    }

    // ====== EXCLUSÃO INDIVIDUAL ======
    await studentsRef.doc(id).delete();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

