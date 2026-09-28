import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { verifyPassword } from '@/lib/crypto';
import { signSessionToken, setSessionCookie, SessionPayload } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/student-login
 * Autenticação segura de alunos 100% no Firebase Firestore (ISOLAMENTO MULTI-TENANT).
 * Valida o Código do Professor (Tenant Code), acha o aluno restrito ao tenant e emite cookie.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { identifier, teacherCode, password } = body;

    if (!identifier || !teacherCode) {
      return NextResponse.json(
        { error: 'Nome/matrícula e Código do Professor são obrigatórios para o login.' },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { error: 'Por favor, digite a sua senha de acesso.' },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const cleanTeacherCode = String(teacherCode).toUpperCase().trim();
    const rawIdentifier = String(identifier).toLowerCase().trim();
    const normIdentifier = rawIdentifier.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // 1. ISOLAMENTO DO TENANT: Localizar o Professor dono do Código na coleção correta ('tenants')
    let ownerTeacherId: string | null = null;

    // Busca pela chave gerada 'tenantCode'
    const tenantQuery = await db.collection('tenants')
      .where('tenantCode', '==', cleanTeacherCode)
      .limit(1)
      .get();

    if (!tenantQuery.empty) {
      ownerTeacherId = tenantQuery.docs[0].id;
    } else {
      // Fallback preventivo: Se o professor ainda não clicou em gerar código e usou a matrícula antiga
      const fallbackQuery = await db.collection('tenants')
        .where('matriculaFuncional', '==', cleanTeacherCode)
        .limit(1)
        .get();
        
      if (!fallbackQuery.empty) {
        ownerTeacherId = fallbackQuery.docs[0].id;
      }
    }

    if (!ownerTeacherId) {
      return NextResponse.json(
        { error: 'Código do Professor inválido ou não encontrado. Verifique o código fornecido.' },
        { status: 404 }
      );
    }

    // 2. BUSCA DO ALUNO (SOMENTE DENTRO DA SUBCOLEÇÃO DO TENANT IDENTIFICADO)
    const studentsRef = db.collection('tenants').doc(ownerTeacherId).collection('students');
    const snapshot = await studentsRef.get();

    let matchedStudent: any = null;

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
        break;
      }
    }

    if (!matchedStudent) {
      return NextResponse.json(
        { error: 'Aluno não encontrado na base deste professor. Verifique seu nome ou matrícula.' },
        { status: 404 }
      );
    }

    // 3. VALIDAÇÃO DE SENHA DO ALUNO
    const storedHash = matchedStudent.passwordHash || matchedStudent.password_hash || '';

    if (!storedHash || storedHash.trim() === '') {
      return NextResponse.json(
        { error: 'Aluno sem senha cadastrada. Solicite a definição da sua senha individual ao professor.' },
        { status: 400 }
      );
    }

    const isPassValid = await verifyPassword(String(password), storedHash);
    if (!isPassValid) {
      return NextResponse.json(
        { error: 'Senha incorreta. Verifique a sua senha de acesso.' },
        { status: 401 }
      );
    }

    // 4. SUCESSO: CRIAR SESSÃO SEGURA
    const sessionPayload: SessionPayload = {
      sub: matchedStudent.id,
      role: 'student',
      ownerTeacherId: ownerTeacherId,
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
    cleanStudent.ownerTeacherId = ownerTeacherId;

    const tenantDoc = await db.collection('tenants').doc(ownerTeacherId).get();
    const tenantInfo = tenantDoc.exists ? tenantDoc.data() || {} : {};

    const response = NextResponse.json({
      success: true,
      student: cleanStudent,
      ownerTeacherId,
      teacherProfile: {
        id: ownerTeacherId,
        name: tenantInfo.name || tenantInfo.nome || 'Prof. Gilson Flores',
        subject: tenantInfo.subject || 'Sociologia',
        school: tenantInfo.school || "EEB Prof. Jandira D'Ávila",
        avatarUrl: tenantInfo.avatarUrl || '',
        driveFolderUrl: tenantInfo.driveFolderUrl || '',
      },
    });

    // Grava o cookie HttpOnly de sessão do aluno (validade de 24 horas)
    setSessionCookie(response, token, 24 * 60 * 60);

    return response;
  } catch (error: any) {
    console.error('Erro no login do aluno via Firestore:', error);
    return NextResponse.json({ error: 'Erro interno de comunicação com o servidor.' }, { status: 500 });
  }
}

