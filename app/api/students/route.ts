import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado. Faça login para continuar.' }, { status: 401 });
    }

    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Banco de dados não configurado.' }, { status: 500 });
    }

    const ownerTeacherId = session.ownerTeacherId || session.sub;

    // 1. Se for Professor (Titular)
    if (session.role === 'teacher') {
      const { data, error } = await admin
        .from('students')
        .select('*')
        .eq('owner_teacher_id', ownerTeacherId);

      if (error) {
        console.error('Erro ao buscar estudantes (teacher):', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, data: data || [] });
    }

    // 2. Se for 2º Professor
    if (session.role === 'second_teacher') {
      const secondTeacherId = session.sub;

      // Deriva as turmas a partir dos tutelados
      const { data: myStudents, error: myErr } = await admin
        .from('students')
        .select('turma')
        .eq('owner_teacher_id', ownerTeacherId)
        .eq('second_teacher_id', secondTeacherId);

      if (myErr) {
        console.error('Erro ao buscar turmas do segundo professor:', myErr);
        return NextResponse.json({ error: myErr.message }, { status: 500 });
      }

      const turmas = Array.from(new Set((myStudents || []).map((s) => s.turma)));

      if (turmas.length === 0) {
        return NextResponse.json({ success: true, data: [] });
      }

      // Retorna todos os alunos dessas turmas dentro do mesmo owner_teacher_id
      const { data, error } = await admin
        .from('students')
        .select('*')
        .eq('owner_teacher_id', ownerTeacherId)
        .in('turma', turmas);

      if (error) {
        console.error('Erro ao buscar estudantes (second_teacher):', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, data: data || [] });
    }

    // 3. Se for Aluno
    if (session.role === 'student') {
      const { data, error } = await admin
        .from('students')
        .select('*')
        .eq('id', session.sub);

      if (error) {
        console.error('Erro ao buscar estudante (student):', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, data: data || [] });
    }

    return NextResponse.json({ error: 'Perfil inválido ou sem permissão.' }, { status: 403 });
  } catch (err: any) {
    console.error('Erro na rota GET /api/students:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
