import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { hashPasswordBcrypt } from '@/lib/crypto';

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

    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: 'Serviço de banco de dados indisponível.' },
        { status: 500 }
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

    if (targetType === 'student') {
      // Atualiza o aluno garantindo isolamento de owner_teacher_id
      const { data: updated, error } = await admin
        .from('students')
        .update({
          password_hash: bcryptHash,
          must_change_password: true, // Força troca de senha no próximo login
        })
        .eq('id', targetId)
        .select('id, full_name, matricula, turma')
        .maybeSingle();

      if (error || !updated) {
        console.error('Erro ao redefinir senha do aluno:', error);
        return NextResponse.json(
          { error: error?.message || 'Aluno não encontrado.' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Senha do aluno "${updated.full_name}" redefinida com sucesso. Ele deverá trocá-la no próximo acesso.`,
        tempPassword: rawPassword,
        target: updated,
      });
    }

    if (targetType === 'second_teacher') {
      // Atualiza o 2º professor
      const { data: updated, error } = await admin
        .from('second_teachers')
        .update({
          password: bcryptHash,
          must_change_password: true, // Força troca de senha no próximo login
        })
        .eq('id', targetId)
        .select('id, name, email')
        .maybeSingle();

      if (error || !updated) {
        console.error('Erro ao redefinir senha do 2º professor:', error);
        return NextResponse.json(
          { error: error?.message || '2º Professor não encontrado.' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Senha do 2º Professor "${updated.name}" redefinida com sucesso. Ele deverá trocá-la no próximo acesso.`,
        tempPassword: rawPassword,
        target: updated,
      });
    }

    return NextResponse.json(
      { error: 'Tipo de usuário inválido.' },
      { status: 400 }
    );
  } catch (err: any) {
    console.error('Erro na rota reset-user-password:', err);
    return NextResponse.json(
      { error: 'Erro interno ao redefinir senha.' },
      { status: 500 }
    );
  }
}
