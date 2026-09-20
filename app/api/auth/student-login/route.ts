import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { verifyPassword } from '@/lib/crypto';
import { signSessionToken, setSessionCookie, SessionPayload } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/student-login
 * Autenticação segura de alunos 100% no Firebase Firestore.
 * Valida a senha no servidor com hash criptografado e emite cookie seguro de sessão.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { identifier, turma, password } = body;

    if (!identifier || !turma) {
      return NextResponse.json(
        { error: 'Nome/matrícula e turma são obrigatórios para o login.' },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const rawIdentifier = String(identifier).toLowerCase().trim();
    const normIdentifier = rawIdentifier.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Procura na subcoleção de alunos do Firestore de todos os tenants
    const snapshot = await db.collectionGroup('students').where('turma', '==', turma).get();

    let matchedStudent: any = null;
    let ownerTeacherId: string | null = null;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const fullName = (data.fullName || data.full_name || data.name || '').toLowerCase().trim();
      const matricula = (data.matricula || '').toLowerCase().trim();
      const docId = doc.id.toLowerCase().trim();

      const normFullName = fullName.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      // Verifica correspondência exata por matrícula, ID ou nome (normalizado)
      if (
        matricula === rawIdentifier ||
        docId === rawIdentifier ||
        normFullName === normIdentifier ||
        normFullName.startsWith(normIdentifier) ||
        normFullName.includes(normIdentifier)
      ) {
        matchedStudent = { id: doc.id, ...data };
        ownerTeacherId = doc.ref.parent.parent?.id || data.ownerTeacherId || data.owner_teacher_id || null;
        break;
      }
    }

    if (!matchedStudent) {
      return NextResponse.json(
        { error: 'Aluno não encontrado na base de dados da nuvem para esta turma.' },
        { status: 404 }
      );
    }

    const storedHash = matchedStudent.passwordHash || matchedStudent.password_hash || '';

    if (!storedHash || storedHash.trim() === '') {
      return NextResponse.json(
        { error: 'Aluno sem senha cadastrada. Solicite a definição da sua senha individual ao professor.' },
        { status: 400 }
      );
    }

    // Se a senha foi informada, faz a validação no servidor
    if (password !== undefined) {
      const isPassValid = await verifyPassword(String(password), storedHash);
      if (!isPassValid) {
        return NextResponse.json(
          { error: 'Senha incorreta. Verifique a sua senha de acesso.' },
          { status: 401 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Por favor, digite a sua senha de acesso.' },
        { status: 400 }
      );
    }

    // Aluno autenticado com sucesso: cria o JWT de sessão segura
    const sessionPayload: SessionPayload = {
      sub: matchedStudent.id,
      role: 'student',
      ownerTeacherId: ownerTeacherId || '',
      name: matchedStudent.fullName || matchedStudent.full_name || matchedStudent.name || 'Aluno',
      turma: matchedStudent.turma || '',
      classRoom: matchedStudent.turma || '',
      matricula: matchedStudent.matricula || '',
      tag: matchedStudent.tag || 'REGULAR',
      isPne: matchedStudent.tag === 'PNE' || Boolean(matchedStudent.isPne || matchedStudent.is_pne),
      avatarUrl: matchedStudent.avatarUrl || matchedStudent.avatar_url || '',
      mustChangePassword: Boolean(matchedStudent.mustChangePassword || matchedStudent.must_change_password),
    };

    const token = await signSessionToken(sessionPayload, '24h');

    // Remove o hash de senha do objeto retornado ao frontend
    const cleanStudent = { ...matchedStudent };
    delete cleanStudent.passwordHash;
    delete cleanStudent.password_hash;
    cleanStudent.ownerTeacherId = ownerTeacherId || '';

    const response = NextResponse.json({
      success: true,
      student: cleanStudent,
      ownerTeacherId,
    });

    // Grava o cookie HttpOnly de sessão do aluno (validade de 24 horas)
    setSessionCookie(response, token, 24 * 60 * 60);

    return response;
  } catch (error: any) {
    console.error('Erro no login do aluno via Firestore:', error);
    return NextResponse.json({ error: 'Erro interno de comunicação com o servidor.' }, { status: 500 });
  }
}

