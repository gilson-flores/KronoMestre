import { NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { getSessionFromRequest } from '@/lib/auth-server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

/**
 * Helper blindado: Identifica perfeitamente ONDE gravar (tenantId) e QUEM está gravando (userId)
 */
async function resolveSession(request: Request): Promise<{ tenantId: string; userId: string; email?: string; role?: string } | null> {
  // 1. Tenta verificar sessão do Firebase (Professor)
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;
    if (sessionCookie) {
      const auth = getAdminAuth();
      const decoded = await auth.verifySessionCookie(sessionCookie, true);
      if (decoded && decoded.uid) {
        return {
          tenantId: decoded.uid,
          userId: decoded.uid,
          email: decoded.email,
          role: 'teacher',
        };
      }
    }
  } catch {}

  // 2. Fallback JWT (Aluno / 2º Professor)
  try {
    const session = await getSessionFromRequest(request);
    if (session && (session.ownerTeacherId || session.sub)) {
      return {
        tenantId: session.ownerTeacherId || session.sub, // A pasta do dono (Professor)
        userId: session.sub,                             // O ID real de quem está logado (Aluno)
        email: session.email,
        role: session.role,
      };
    }
  } catch {}

  return null;
}

/**
 * GET /api/students
 */
export async function GET(request: Request) {
  try {
    const session = await resolveSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado. Faça login.' }, { status: 401 });
    }

    const db = getAdminDb();
    const snapshot = await db
      .collection('tenants')
      .doc(session.tenantId)
      .collection('students')
      .get();

    const students = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ students });
  } catch (error: any) {
    console.error('Erro ao buscar alunos na API /api/students:', error);
    return NextResponse.json({ error: 'Erro interno ao consultar alunos.' }, { status: 500 });
  }
}

/**
 * POST /api/students
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Caso 1: Login do Aluno (Busca por matrícula/nome + turma)
    if (body && body.identifier && body.turma && !body.fullName && !body.matricula) {
      const { identifier, turma } = body;
      const db = getAdminDb();
      const rawIdentifier = String(identifier).toLowerCase().trim();
      const normIdentifier = rawIdentifier.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      const snapshot = await db.collectionGroup('students').where('turma', '==', turma).get();
      let matchedStudent: any = null;
      let ownerTeacherId: string | null = null;

      for (const doc of snapshot.docs) {
        const data = doc.data();
        const fullName = (data.fullName || data.full_name || '').toLowerCase().trim();
        const matricula = (data.matricula || '').toLowerCase().trim();
        const normFullName = fullName.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        if (normFullName === normIdentifier || normFullName.includes(normIdentifier) || matricula === rawIdentifier) {
          matchedStudent = { id: doc.id, ...data };
          ownerTeacherId = doc.ref.parent.parent?.id || data.ownerTeacherId || data.owner_teacher_id || null;
          break;
        }
      }

      if (!matchedStudent) {
        return NextResponse.json({ error: 'Aluno não encontrado na base de dados da nuvem para esta turma.' }, { status: 404 });
      }

      return NextResponse.json({ student: matchedStudent, ownerTeacherId });
    }

    // Caso 2: Criação/Importação de Alunos pelo Professor
    const session = await resolveSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado. Sessão necessária.' }, { status: 401 });
    }

    const db = getAdminDb();
    const rawList = Array.isArray(body) ? body : [body];
    if (rawList.length === 0) {
      return NextResponse.json({ error: 'Nenhum dado de aluno recebido.' }, { status: 400 });
    }

    const batch = db.batch();
    const processedStudents: any[] = [];

    for (let i = 0; i < rawList.length; i++) {
      const item = rawList[i];
      const studentId = item.id || `STU-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}`;
      const studentDoc = {
        ...item,
        id: studentId,
        ownerTeacherId: session.tenantId,
        owner_teacher_id: session.tenantId,
        updatedAt: new Date().toISOString(),
      };

      const docRef = db.collection('tenants').doc(session.tenantId).collection('students').doc(studentId);
      batch.set(docRef, studentDoc, { merge: true });
      processedStudents.push(studentDoc);
    }

    await batch.commit();

    return NextResponse.json({
      success: true,
      count: processedStudents.length,
      student: processedStudents[0],
      students: processedStudents,
    });
  } catch (error: any) {
    console.error('Erro no POST /api/students:', error);
    return NextResponse.json({ error: 'Erro interno ao salvar aluno(s).' }, { status: 500 });
  }
}

/**
 * PUT /api/students
 */
export async function PUT(request: Request) {
  try {
    const session = await resolveSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    
    // Agora o sistema sabe perfeitamente quem é o aluno logado através do session.userId
    const studentId = body.id || body.studentId || (session.role === 'student' ? session.userId : null);

    if (!studentId) {
      return NextResponse.json({ error: 'ID do aluno é obrigatório para atualização.' }, { status: 400 });
    }

    // Se for perfil de aluno, só permite atualizar o próprio registro
    if (session.role === 'student' && session.userId && session.userId !== studentId) {
      return NextResponse.json({ error: 'Acesso negado para modificar outro aluno.' }, { status: 403 });
    }

    const db = getAdminDb();
    let docRef = db.collection('tenants').doc(session.tenantId).collection('students').doc(studentId);
    let docSnap = await docRef.get();

    // Fallback de busca caso o ID venha diferente
    if (!docSnap.exists) {
      const querySnap = await db.collectionGroup('students').get();
      for (const doc of querySnap.docs) {
        if (doc.id === studentId || doc.data().matricula === studentId) {
          docRef = doc.ref as any;
          docSnap = doc;
          break;
        }
      }
    }

    const updatedData = {
      ...body,
      id: studentId,
      ownerTeacherId: session.tenantId || docSnap.data()?.ownerTeacherId,
      updatedAt: new Date().toISOString(),
    };

    await docRef.set(updatedData, { merge: true });

    return NextResponse.json({ success: true, student: updatedData });
  } catch (error: any) {
    console.error('Erro no PUT /api/students:', error);
    return NextResponse.json({ error: 'Erro interno ao atualizar aluno.' }, { status: 500 });
  }
}

/**
 * DELETE /api/students?id={studentId}
 */
export async function DELETE(request: Request) {
  try {
    const session = await resolveSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID do aluno ausente' }, { status: 400 });
    }

    const db = getAdminDb();
    await db.collection('tenants').doc(session.tenantId).collection('students').doc(id).delete();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro no DELETE /api/students:', error);
    return NextResponse.json({ error: 'Erro interno ao excluir aluno.' }, { status: 500 });
  }
}
