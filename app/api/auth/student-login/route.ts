import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { verifyPassword } from '@/lib/crypto';
import { signSessionToken, setSessionCookie, SessionPayload } from '@/lib/auth-server';
import { serverCache } from '@/lib/server-cache';

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
    const tenantCacheKey = `tenant_code_to_id_${cleanTeacherCode}`;
    let ownerTeacherId: string | null = serverCache.get<string>(tenantCacheKey);

    if (!ownerTeacherId) {
      try {
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

        if (ownerTeacherId) {
          serverCache.set(tenantCacheKey, ownerTeacherId, 600); // Cache por 10 min
        }
      } catch (tQueryErr: any) {
        console.warn('[Student Login API] Aviso ao buscar tenant (possível cota excedida):', tQueryErr?.message);
      }
    }

    if (!ownerTeacherId) {
      return NextResponse.json(
        { error: 'Código do Professor inválido ou não encontrado. Verifique o código fornecido.' },
        { status: 404 }
      );
    }

    // 2. BUSCA DO ALUNO (COM CACHE EM MEMÓRIA COMPARTILHADO COM /api/students)
    const studentsCacheKey = `students_${ownerTeacherId}`;
    let studentList: any[] = [];

    try {
      studentList = await serverCache.getOrSet(studentsCacheKey, 180, async () => {
        const studentsRef = db.collection('tenants').doc(ownerTeacherId!).collection('students');
        const snapshot = await studentsRef.get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      });
    } catch (snapErr: any) {
      console.warn('[Student Login API] Aviso ao buscar alunos do tenant:', snapErr?.message);
      studentList = serverCache.getLastKnown<any[]>(studentsCacheKey) || [];
      if (studentList.length === 0) {
        return NextResponse.json(
          { error: 'O servidor está temporariamente indisponível para consulta de alunos. Tente novamente em alguns instantes.' },
          { status: 503 }
        );
      }
    }

    let matchedStudent: any = null;

    for (const data of studentList) {
      const fullName = (data.fullName || data.full_name || data.name || '').toLowerCase().trim();
      const matricula = (data.matricula || '').toLowerCase().trim();
      const docId = (data.id || '').toLowerCase().trim();

      const normFullName = fullName.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      // Verifica correspondência exata por matrícula, ID ou nome (normalizado)
      if (
        matricula === rawIdentifier ||
        docId === rawIdentifier ||
        normFullName === normIdentifier ||
        normFullName.startsWith(normIdentifier) ||
        normFullName.includes(normIdentifier)
      ) {
        matchedStudent = data;
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

    // Registra presença real do aluno (ativação sem dados fantasmas)
    const nowIso = new Date().toISOString();
    cleanStudent.lastActiveAt = nowIso;
    cleanStudent.isOnline = true;
    try {
      await db
        .collection('tenants')
        .doc(ownerTeacherId)
        .collection('students')
        .doc(matchedStudent.id)
        .set(
          {
            lastActiveAt: nowIso,
            isOnline: true,
          },
          { merge: true }
        );
      // Atualiza o cache de alunos para refletir o status online imediatamente
      serverCache.delete(`students_${ownerTeacherId}`);
    } catch (presenceErr: any) {
      console.warn('[Student Login API] Aviso ao gravar presença real do aluno:', presenceErr?.message);
    }

    let tenantInfo: any = {};
    try {
      const tenantDoc = await db.collection('tenants').doc(ownerTeacherId).get();
      if (tenantDoc.exists) {
        tenantInfo = tenantDoc.data() || {};
      }
    } catch (tDocErr: any) {
      console.warn('[Student Login API] Aviso ao buscar dados do tenant:', tDocErr?.message);
    }

    const response = NextResponse.json(
      {
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
      },
      {
        headers: {
          'Cache-Control': 'private, no-cache, no-store, max-age=0, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Surrogate-Control': 'no-store',
        },
      }
    );

    // ISOLAMENTO DE TENANT: Remove explicitamente o cookie de sessão de Professor do Firebase
    // para evitar que um aluno no mesmo navegador/aparelho herde a sessão de Professor
    response.cookies.set('session', '', { maxAge: 0, path: '/' });

    // Grava o cookie HttpOnly de sessão do aluno (validade de 24 horas)
    setSessionCookie(response, token, 24 * 60 * 60);

    return response;
  } catch (error: any) {
    console.error('Erro no login do aluno via Firestore:', error);
    const msg = error?.message || String(error);
    const isQuota = msg.includes('RESOURCE_EXHAUSTED') || msg.includes('Quota exceeded') || error?.code === 8;
    return NextResponse.json(
      { 
        error: isQuota 
          ? 'Limite temporário de requisições excedido no banco de dados. Aguarde alguns instantes e tente novamente.' 
          : 'Erro interno de comunicação com o servidor.' 
      }, 
      { status: isQuota ? 429 : 500 }
    );
  }
}

