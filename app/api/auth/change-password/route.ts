import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, signSessionToken, setSessionCookie, SessionPayload } from '@/lib/auth-server';
import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin';
import { hashPasswordBcrypt } from '@/lib/crypto';
import { serverCache } from '@/lib/server-cache';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json(
        { error: 'Não autenticado. Por favor, faça login novamente.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { newPassword, confirmPassword } = body;

    if (!newPassword || typeof newPassword !== 'string') {
      return NextResponse.json(
        { error: 'Por favor, informe a nova senha.' },
        { status: 400 }
      );
    }

    if (newPassword.trim().length < 4) {
      return NextResponse.json(
        { error: 'A nova senha deve ter no mínimo 4 caracteres.' },
        { status: 400 }
      );
    }

    if (confirmPassword !== undefined && newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: 'A confirmação de senha não coincide com a nova senha digitada.' },
        { status: 400 }
      );
    }

    const cleanPassword = newPassword.trim();
    const newBcryptHash = await hashPasswordBcrypt(cleanPassword);
    const db = getAdminDb();
    const nowIso = new Date().toISOString();

    // 1. Fluxo Aluno (100% Firebase Firestore)
    if (session.role === 'student') {
      let updated = false;

      // Tentativa 1: Atualização direta pelo caminho do tenant
      if (session.ownerTeacherId) {
        const studentRef = db
          .collection('tenants')
          .doc(session.ownerTeacherId)
          .collection('students')
          .doc(session.sub);

        const snap = await studentRef.get();
        if (snap.exists) {
          await studentRef.set(
            {
              passwordHash: newBcryptHash,
              mustChangePassword: false,
              updatedAt: nowIso,
            },
            { merge: true }
          );
          updated = true;
          serverCache.delete(`students_${session.ownerTeacherId}`);
        }
      }

      // Tentativa 2: Fallback por collectionGroup limitado se não atualizou
      if (!updated) {
        try {
          const querySnap = await db.collectionGroup('students').where('matricula', '==', session.matricula || session.sub).limit(1).get();
          if (!querySnap.empty) {
            await querySnap.docs[0].ref.set(
              {
                passwordHash: newBcryptHash,
                mustChangePassword: false,
                updatedAt: nowIso,
              },
              { merge: true }
            );
            updated = true;
            if (session.ownerTeacherId) {
              serverCache.delete(`students_${session.ownerTeacherId}`);
            }
          }
        } catch (cgErr: any) {
          console.warn('Aviso ao consultar fallback aluno:', cgErr?.message);
        }
      }

      if (!updated) {
        return NextResponse.json(
          { error: 'Registro do aluno não encontrado no Firestore para atualizar a senha.' },
          { status: 404 }
        );
      }
    }

    // 2. Fluxo 2º Professor (100% Firebase Firestore)
    else if (session.role === 'second_teacher') {
      let updated = false;

      if (session.ownerTeacherId) {
        const secRef = db
          .collection('tenants')
          .doc(session.ownerTeacherId)
          .collection('second_teachers')
          .doc(session.sub);

        const snap = await secRef.get();
        if (snap.exists) {
          await secRef.set(
            {
              passwordHash: newBcryptHash,
              mustChangePassword: false,
              updatedAt: nowIso,
            },
            { merge: true }
          );
          updated = true;
          serverCache.delete(`second_teachers_${session.ownerTeacherId}`);
        }
      }

      if (!updated && session.email) {
        try {
          const querySnap = await db.collectionGroup('second_teachers').where('email', '==', session.email.toLowerCase().trim()).limit(1).get();
          if (!querySnap.empty) {
            await querySnap.docs[0].ref.set(
              {
                passwordHash: newBcryptHash,
                mustChangePassword: false,
                updatedAt: nowIso,
              },
              { merge: true }
            );
            updated = true;
            if (session.ownerTeacherId) {
              serverCache.delete(`second_teachers_${session.ownerTeacherId}`);
            }
          }
        } catch (cgErr: any) {
          console.warn('Aviso ao consultar fallback 2º prof:', cgErr?.message);
        }
      }
    }

    // 3. Fluxo Professor Titular (Firebase Auth)
    else if (session.role === 'teacher') {
      try {
        const adminAuth = getAdminAuth();
        await adminAuth.updateUser(session.sub, {
          password: cleanPassword,
        });
      } catch (authErr) {
        console.warn('Aviso ao atualizar senha no Firebase Auth admin:', authErr);
      }
    }

    // Cria nova sessão com mustChangePassword = false
    const updatedPayload: SessionPayload = {
      ...session,
      mustChangePassword: false,
    };

    const tokenExpiry = session.role === 'student' ? '24h' : '7d';
    const maxAgeSeconds = session.role === 'student' ? 24 * 60 * 60 : 7 * 24 * 60 * 60;
    const newToken = await signSessionToken(updatedPayload, tokenExpiry);

    const response = NextResponse.json({
      success: true,
      message: 'Senha alterada com sucesso! Seu acesso está liberado.',
      user: updatedPayload,
    });

    setSessionCookie(response, newToken, maxAgeSeconds);
    return response;
  } catch (err: any) {
    console.error('Erro ao trocar senha:', err);
    return NextResponse.json(
      { error: 'Erro interno ao processar a alteração de senha.' },
      { status: 500 }
    );
  }
}

