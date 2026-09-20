import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { identifier, turma } = body;

    if (!identifier || !turma) {
      return NextResponse.json({ error: 'Dados incompletos fornecidos.' }, { status: 400 });
    }

    const db = getAdminDb();
    const rawIdentifier = identifier.toLowerCase().trim();
    const normIdentifier = rawIdentifier.normalize('NFD').replace(/[\u0300-\u036f]/g, "");

    // Collection Group Query: Procura em TODAS as subcoleções 'students' de todos os professores
    const snapshot = await db.collectionGroup('students').where('turma', '==', turma).get();

    let matchedStudent = null;
    let ownerTeacherId = null;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const fullName = (data.fullName || '').toLowerCase().trim();
      const matricula = (data.matricula || '').toLowerCase().trim();
      
      const normFullName = fullName.normalize('NFD').replace(/[\u0300-\u036f]/g, "");

      // Verifica correspondência exata, parcial ou por matrícula
      if (normFullName === normIdentifier || normFullName.includes(normIdentifier) || matricula === rawIdentifier) {
        matchedStudent = { id: doc.id, ...data };
        // Identifica o ID do professor (dono do tenant) subindo na árvore do documento
        ownerTeacherId = doc.ref.parent.parent?.id;
        break;
      }
    }

    if (!matchedStudent) {
      return NextResponse.json({ error: 'Aluno não encontrado na base de dados da nuvem para esta turma.' }, { status: 404 });
    }

    return NextResponse.json({ student: matchedStudent, ownerTeacherId });

  } catch (error) {
    console.error('Erro no login do aluno via Firestore:', error);
    return NextResponse.json({ error: 'Erro interno de comunicação com o servidor.' }, { status: 500 });
  }
}