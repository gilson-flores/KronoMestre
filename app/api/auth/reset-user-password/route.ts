import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth-server';
import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin';
import { hashPasswordBcrypt } from '@/lib/crypto';
import { cookies } from 'next/headers';
import { serverCache } from '@/lib/server-cache';

export const dynamic = 'force-dynamic';

/**
 * Resolve a sessão do Professor Titular / Admin Supremo via Firebase Cookie ('session') ou JWT ('auth_session_token')
 */
async function resolveTeacherSession(req: NextRequest): Promise<{ ownerTeacherId: string; role: string; email?: string } | null> {
  // 1. Cookie 'session' do Firebase Auth (Professor Titular / Admin Supremo)
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;
    if (sessionCookie) {
      const auth = getAdminAuth();
      const decoded = await auth.verifySessionCookie(sessionCookie, true);
      if (decoded && decoded.uid) {
        return {
          ownerTeacherId: (decoded as any).tenant || (decoded as any).ownerTeacherId || decoded.uid,
          role: 'teacher',
          email: decoded.email,
        };
      }
    }
  } catch {}

  // 2. Fallback JWT (lib/auth-server)
  try {
    const session = await getSessionFromRequest(req);
    if (session && (session.ownerTeacherId || session.sub)) {
      return {
        ownerTeacherId: session.ownerTeacherId || session.sub,
        role: session.role || 'teacher',
        email: session.email,
      };
    }
  } catch {}

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const session = await resolveTeacherSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    // Permite Professor Titular ou Admin
    if (session.role !== 'teacher' && session.role !== 'admin') {
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

    const rawPassword =
      tempPassword && typeof tempPassword === 'string' && tempPassword.trim().length >= 4
        ? tempPassword.trim()
        : '123456';

    const bcryptHash = await hashPasswordBcrypt(rawPassword);
    const db = getAdminDb();
    const nowIso = new Date().toISOString();
    const ownerTeacherId = session.ownerTeacherId;

    if (targetType === 'student') {
      let targetRef = db.collection('tenants').doc(ownerTeacherId).collection('students').doc(targetId);
      let docSnap = await targetRef.get();

      if (!docSnap.exists) {
        try {
          const querySnap = await db.collectionGroup('students').where('matricula', '==', targetId).limit(1).get();
          if (!querySnap.empty) {
            targetRef = querySnap.docs[0].ref as any;
            docSnap = querySnap.docs[0];
          }
        } catch (cgErr: any) {
          console.warn('Aviso consulta collectionGroup students:', cgErr?.message);
        }
      }

      if (!docSnap.exists) {
        return NextResponse.json({ error: 'Aluno não encontrado no Firestore.' }, { status: 404 });
      }

      const currentData = docSnap.data() || {};

      await targetRef.set(
        {
          passwordHash: bcryptHash,
          mustChangePassword: true,
          updatedAt: nowIso,
        },
        { merge: true }
      );

      serverCache.delete(`students_${ownerTeacherId}`);

      const fullName = currentData.fullName || currentData.full_name || currentData.name || 'Aluno';

      return NextResponse.json({
        success: true,
        message: `Senha do aluno "${fullName}" redefinida com sucesso! Ele deverá trocá-la no próximo acesso.`,
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
        try {
          const querySnap = await db.collectionGroup('second_teachers').where('email', '==', targetId).limit(1).get();
          if (!querySnap.empty) {
            targetRef = querySnap.docs[0].ref as any;
            docSnap = querySnap.docs[0];
          }
        } catch (cgErr: any) {
          console.warn('Aviso consulta collectionGroup second_teachers:', cgErr?.message);
        }
      }

      if (!docSnap.exists) {
        return NextResponse.json({ error: '2º Professor não encontrado no Firestore.' }, { status: 404 });
      }

      const currentData = docSnap.data() || {};
      const teacherEmail = currentData.email;

      await targetRef.set(
        {
          passwordHash: bcryptHash,
          mustChangePassword: true,
          updatedAt: nowIso,
        },
        { merge: true }
      );

      serverCache.delete(`second_teachers_${ownerTeacherId}`);

      // Sincroniza ou cria usuário no Firebase Auth para garantir que o login funcione
      if (teacherEmail) {
        try {
          const adminAuth = getAdminAuth();
          const authUser = await adminAuth.getUserByEmail(teacherEmail).catch(() => null);
          if (authUser) {
            await adminAuth.updateUser(authUser.uid, { password: rawPassword });
          } else {
            await adminAuth.createUser({
              uid: docSnap.id.startsWith('st_') ? undefined : docSnap.id,
              email: teacherEmail,
              password: rawPassword,
              displayName: currentData.name || '2º Professor',
            }).catch(() => {});
          }
        } catch (authErr) {
          console.warn('Aviso ao sincronizar senha no Firebase Auth:', authErr);
        }
      }

      const teacherName = currentData.name || currentData.fullName || '2º Professor';

      return NextResponse.json({
        success: true,
        message: `Senha do 2º Professor "${teacherName}" redefinida com sucesso!`,
        tempPassword: rawPassword,
        target: {
          id: docSnap.id,
          name: teacherName,
          email: teacherEmail || '',
        },
      });
    }

    return NextResponse.json({ error: 'Tipo de usuário inválido.' }, { status: 400 });
  } catch (err: any) {
    console.error('Erro na rota reset-user-password:', err);
    return NextResponse.json({ error: 'Erro interno ao redefinir senha.' }, { status: 500 });
  }
}