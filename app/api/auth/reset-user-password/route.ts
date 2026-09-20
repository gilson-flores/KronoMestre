import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth-server';
import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin';
import { hashPasswordBcrypt } from '@/lib/crypto';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/reset-user-password
 * Redefinição de senhas de alunos e 2º professores pelo professor titular.
 * Operação 100% Firebase Firestore (com atualização no Firebase Auth se aplicável).
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json(
        { error: 'Não autenticado.' },
        { status: 401 }
      );
    }

    // Apenas o Professor Titular tem permissão para resetar senhas de usuários
    if (session.role !== 'teacher') {
      return NextResponse.json(
        { error: 'Apenas o Professor Titular pode redefinir senhas de alunos e 2º professores.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { targetType, targetId, tempPassword } = body;

    if (!targetType || !targetId) {
      return NextResponse.json(
        { error: 'Tipo de usuário (student / second_teacher) e ID são obrigatórios.' },
        { status: 400 }
      );
    }

    // Senha temporária definida pelo professor ou fallback seguro
    const rawPassword = (tempPassword && typeof tempPassword === 'string' && tempPassword.trim().length >= 4)
      ? tempPassword.trim()
      : '123456';

    const bcryptHash = await hashPasswordBcrypt(rawPassword);
    const db = getAdminDb();
    const nowIso = new Date().toISOString();
    const ownerTeacherId = session.ownerTeacherId || session.sub;

    if (targetType === 'student') {
      let targetRef = db.collection('tenants').doc(ownerTeacherId).collection('students').doc(targetId);
      let docSnap = await targetRef.get();

      // Fallback de localização se o ID não estiver no caminho direto
      if (!docSnap.exists) {
        const querySnap = await db.collectionGroup('students').get();
        for (const doc of querySnap.docs) {
          if (doc.id === targetId) {
            targetRef = doc.ref as any;
            docSnap = doc;
            break;
          }
        }
      }

      if (!docSnap.exists) {
        return NextResponse.json(
          { error: 'Aluno não encontrado no Firestore.' },
          { status: 404 }
        );
      }

      const currentData = docSnap.data() || {};

      await targetRef.set(
        {
          passwordHash: bcryptHash,
          mustChangePassword: true, // Força troca de senha no próximo login
          updatedAt: nowIso,
        },
        { merge: true }
      );

      const fullName = currentData.fullName || currentData.full_name || currentData.name || 'Aluno';

      return NextResponse.json({
        success: true,
        message: `Senha do aluno "${fullName}" redefinida com sucesso no Firestore. Ele deverá trocá-la no próximo acesso.`,
        tempPassword: rawPassword,
        target: {
          id: docSnap.id,
          full_name: fullName,
          matricula: currentData.matricula || '',
          turma: currentData.turma || '',
        },
      });
    }

    if (targetType === 'second_teacher') {
      let targetRef = db.collection('tenants').doc(ownerTeacherId).collection('second_teachers').doc(targetId);
      let docSnap = await targetRef.get();

      if (!docSnap.exists) {
        const querySnap = await db.collectionGroup('second_teachers').get();
        for (const doc of querySnap.docs) {
          if (doc.id === targetId) {
            targetRef = doc.ref as any;
            docSnap = doc;
            break;
          }
        }
      }

      if (!docSnap.exists) {
        return NextResponse.json(
          { error: '2º Professor não encontrado no Firestore.' },
          { status: 404 }
        );
      }

      const currentData = docSnap.data() || {};
      const teacherEmail = currentData.email;

      await targetRef.set(
        {
          passwordHash: bcryptHash,
          mustChangePassword: true, // Força troca de senha no próximo login
          updatedAt: nowIso,
        },
        { merge: true }
      );

      // Se houver usuário correspondente no Firebase Auth, sincroniza a senha
      if (teacherEmail) {
        try {
          const adminAuth = getAdminAuth();
          const authUser = await adminAuth.getUserByEmail(teacherEmail).catch(() => null);
          if (authUser) {
            await adminAuth.updateUser(authUser.uid, { password: rawPassword });
          }
        } catch (authErr) {
          console.warn('Aviso ao sincronizar senha no Firebase Auth:', authErr);
        }
      }

      const teacherName = currentData.name || currentData.fullName || '2º Professor';

      return NextResponse.json({
        success: true,
        message: `Senha do 2º Professor "${teacherName}" redefinida com sucesso no Firestore. Ele deverá trocá-la no próximo acesso.`,
        tempPassword: rawPassword,
        target: {
          id: docSnap.id,
          name: teacherName,
          email: teacherEmail || '',
        },
      });
    }

    return NextResponse.json(
      { error: 'Tipo de usuário inválido.' },
      { status: 400 }
    );
  } catch (err: any) {
    console.error('Erro na rota reset-user-password:', err);
    return NextResponse.json(
      { error: 'Erro interno ao redefinir senha no Firestore.' },
      { status: 500 }
    );
  }
}

