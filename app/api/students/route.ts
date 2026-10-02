import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { getSessionFromRequest } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || !session.ownerTeacherId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const db = getAdminDb();
    const studentsRef = db.collection('tenants').doc(session.ownerTeacherId).collection('students');
    const snapshot = await studentsRef.get();
    
    const students = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return NextResponse.json({ students });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || !session.ownerTeacherId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const db = getAdminDb();
    const batch = db.batch();
    const studentsRef = db.collection('tenants').doc(session.ownerTeacherId).collection('students');

    const body = await req.json();
    
    // Suporta tanto um Array (Importação em Lote CSV) quanto um Único Objeto (Cadastro Manual)
    const studentsToProcess = Array.isArray(body) ? body : [body];
    const savedStudents = [];

    for (const studentData of studentsToProcess) {
      // Garante que o aluno tenha ID. Se não veio do front, gera um.
      if (!studentData.id) {
        studentData.id = `std-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      }
      
      const docRef = studentsRef.doc(studentData.id);
      
      // Limpa dados e insere no lote
      const cleanData = { 
        ...studentData, 
        ownerTeacherId: session.ownerTeacherId 
      };
      
      batch.set(docRef, cleanData, { merge: true });
      savedStudents.push(cleanData);
    }

    // Comita (salva) todos os alunos no Firebase numa única transação rápida
    await batch.commit();

    return NextResponse.json({ success: true, students: savedStudents });
  } catch (error: any) {
    console.error('Erro no POST /api/students:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || !session.ownerTeacherId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const db = getAdminDb();
    const body = await req.json();
    
    if (!body.id) {
      return NextResponse.json({ error: 'ID do aluno ausente' }, { status: 400 });
    }

    const studentRef = db.collection('tenants').doc(session.ownerTeacherId).collection('students').doc(body.id);
    await studentRef.set(body, { merge: true });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || !session.ownerTeacherId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID ausente' }, { status: 400 });
    }

    const db = getAdminDb();
    const studentRef = db.collection('tenants').doc(session.ownerTeacherId).collection('students').doc(id);
    await studentRef.delete();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

