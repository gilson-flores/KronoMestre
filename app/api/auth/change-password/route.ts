import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, signSessionToken, setSessionCookie, SessionPayload } from '@/lib/auth-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { hashPasswordBcrypt, verifyPasswordBcrypt } from '@/lib/crypto';

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json(
        { error: 'Não autenticado. Por favor, faça login novamente.' },
        { status: 401 }
      );
    }

    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: 'Serviço de banco de dados indisponível.' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { newPassword, confirmPassword, currentPassword } = body;

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

    // 1. Fluxo Aluno
    if (session.role === 'student') {
      const { error: updateErr } = await admin
        .from('students')
        .update({
          password_hash: newBcryptHash,
          must_change_password: false,
        })
        .eq('id', session.sub);

      if (updateErr) {
        console.error('Erro ao atualizar senha do aluno:', updateErr);
        return NextResponse.json(
          { error: 'Erro ao salvar nova senha no banco de dados.' },
          { status: 500 }
        );
      }
    }

    // 2. Fluxo 2º Professor
    else if (session.role === 'second_teacher') {
      const { error: updateErr } = await admin
        .from('second_teachers')
        .update({
          password: newBcryptHash,
          must_change_password: false,
        })
        .eq('id', session.sub);

      if (updateErr) {
        console.error('Erro ao atualizar senha do 2º professor:', updateErr);
        return NextResponse.json(
          { error: 'Erro ao salvar nova senha no banco de dados.' },
          { status: 500 }
        );
      }
    }

    // 3. Fluxo Professor Titular
    else if (session.role === 'teacher') {
      // Atualiza no Supabase Auth se aplicável
      try {
        await admin.auth.admin.updateUserById(session.sub, {
          password: cleanPassword,
        });
      } catch (authErr) {
        console.warn('Aviso ao atualizar senha no Supabase Auth admin:', authErr);
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
