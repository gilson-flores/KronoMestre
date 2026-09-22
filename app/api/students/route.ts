import { NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { getSessionFromRequest } from '@/lib/auth-server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

/**
 * Extrai o ID do professor proprietário (tenant) da requisição com suporte dual:
 * 1. Cookie 'session' do Firebase Auth (padrão principal)
 * 2. Cookie 'auth_session_token' / JWT de Sessão (lib/auth-server)
 */
async function resolveOwnerTeacherId(request: Request): Promise<{ ownerTeacherId: string; email?: string; role?: string } | null> {
  // 1. Tenta verificar sessão do Firebase
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;
    if (sessionCookie) {
      const auth = getAdminAuth();
      const decoded = await auth.verifySessionCookie(sessionCookie, true);
      if (decoded && decoded.uid) {
        return {
          ownerTeacherId: decoded.uid,
          email: decoded.email,
          role: 'teacher',
        };
      }
    }
  } catch {
    // Ignora e tenta fallback JWT
  }

  // 2. Fallback JWT (auth-server)
  try {
    const session = await getSessionFromRequest(request);
    if (session && (session.ownerTeacherId || session.sub)) {
      return {
        ownerTeacherId: session.ownerTeacherId || session.sub,
        email: session.email,
        role: session.role,
      };
    }
  } catch {
    // Falha silenciosa
  }

  return null;
}

/**
 * GET /api/students
 * Lista todos os alunos vinculados ao professor (tenant) logado exclusivamente do Firebase Firestore.
 */
export async function GET(request: Request) {
  try {
    const session = await resolveOwnerTeacherId(request);
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado. Faça login como professor.' }, { status: 401 });
    }

    const { ownerTeacherId } = session;
    const db = getAdminDb();

    // Busca alunos no Firestore no caminho isolado do tenant: tenants/{ownerTeacherId}/students
    const snapshot = await db
      .collection('tenants')
      .doc(ownerTeacherId)
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
 * Cadastra ou importa alunos vinculando-os ao tenant do professor exclusivamente no Firebase Firestore.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Caso de compatibilidade: se for requisição de autenticação de aluno (identifier + turma)
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

    // Fluxo de criação / importação de aluno pelo professor titular
    const session = await resolveOwnerTeacherId(request);
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado. Sessão de professor necessária.' }, { status: 401 });
    }

    const { ownerTeacherId } = session;
    const db = getAdminDb();

    // Pode vir como único aluno ou lote (array)
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
        ownerTeacherId: ownerTeacherId,
        owner_teacher_id: ownerTeacherId,
        updatedAt: new Date().toISOString(),
      };

      const docRef = db.collection('tenants').doc(ownerTeacherId).collection('students').doc(studentId);
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
 * Atualiza os dados ou vínculos pedagógicos de um aluno existente no tenant do professor exclusivamente no Firebase Firestore.
 */
export async function PUT(request: Request) {
  try {
    const session = await resolveOwnerTeacherId(request);
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const studentId = body.id || body.studentId || (session.role === 'student' ? session.ownerTeacherId : null);

    if (!studentId) {
      return NextResponse.json({ error: 'ID do aluno é obrigatório para atualização.' }, { status: 400 });
    }

    // Se for perfil de aluno, só permite atualizar o próprio registro
    if (session.role === 'student' && session.ownerTeacherId && session.ownerTeacherId !== studentId) {
      return NextResponse.json({ error: 'Acesso negado para modificar outro aluno.' }, { status: 403 });
    }

    const { ownerTeacherId } = session;
    const db = getAdminDb();
    let docRef = db.collection('tenants').doc(ownerTeacherId).collection('students').doc(studentId);
    let docSnap = await docRef.get();

    // Fallback de busca se o aluno estiver em outra subcoleção ou ID diferente
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
      ownerTeacherId: ownerTeacherId || docSnap.data()?.ownerTeacherId,
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
 * Remove um aluno do tenant do professor exclusivamente no Firebase Firestore.
 */
export async function DELETE(request: Request) {
  try {
    const session = await resolveOwnerTeacherId(request);
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { ownerTeacherId } = session;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID do aluno ausente' }, { status: 400 });
    }

    const db = getAdminDb();
    await db.collection('tenants').doc(ownerTeacherId).collection('students').doc(id).delete();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro no DELETE /api/students:', error);
    return NextResponse.json({ error: 'Erro interno ao excluir aluno.' }, { status: 500 });
  }
}
