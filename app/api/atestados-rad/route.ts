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

    // 1. Busca todos os registros vinculados ao ownerTeacherId
    const { data: records, error } = await admin
      .from('atestados_rad')
      .select('*')
      .eq('owner_teacher_id', ownerTeacherId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar atestados_rad:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let filtered = records || [];

    // 2. Se for 2º Professor, restringe a visualização apenas aos alunos sob sua tutoria / turmas vinculadas
    if (session.role === 'second_teacher') {
      const secondTeacherId = session.sub;
      // Busca alunos vinculados a este 2º professor
      const { data: students } = await admin
        .from('students')
        .select('id, full_name, matricula, turma')
        .eq('owner_teacher_id', ownerTeacherId)
        .or(`second_teacher_id.eq.${secondTeacherId},second_teacher_name.ilike.%${session.name}%`);

      if (students && students.length > 0) {
        const studentIds = new Set(students.map((s) => s.id));
        const studentMatriculas = new Set(students.map((s) => s.matricula));
        const studentNames = new Set(students.map((s) => s.full_name?.toLowerCase().trim()));

        filtered = filtered.filter(
          (r) =>
            studentIds.has(r.student_id) ||
            studentMatriculas.has(r.student_id) ||
            studentNames.has(r.student_name?.toLowerCase().trim())
        );
      } else {
        filtered = [];
      }
    }

    // 3. Se for Aluno, restringe apenas ao próprio aluno
    if (session.role === 'student') {
      filtered = filtered.filter((r) => r.student_id === session.sub || r.student_name?.toLowerCase() === session.name.toLowerCase());
    }

    // Mapeia para o formato tipado do app
    const mapped = filtered.map((item: any) => ({
      id: item.id,
      studentId: item.student_id,
      studentName: item.student_name,
      studentTurma: item.student_turma || '',
      dataFalta: item.data_falta,
      dataAtestado: item.data_atestado,
      diasAtestado: Number(item.dias_atestado) || 1,
      dataFinal: item.data_final,
      motivo: item.motivo || undefined,
      tipo: item.tipo as 'Atestado' | 'RAD',
      createdAt: item.created_at,
      ownerTeacherId: item.owner_teacher_id,
    }));

    return NextResponse.json({ success: true, data: mapped });
  } catch (err: any) {
    console.error('Erro na rota GET /api/atestados-rad:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado. Faça login para continuar.' }, { status: 401 });
    }

    // Apenas professores (titular ou 2º professor) podem criar/atualizar atestados
    if (session.role !== 'teacher' && session.role !== 'second_teacher') {
      return NextResponse.json({ error: 'Permissão negada. Apenas professores podem registrar atestados/RAD.' }, { status: 403 });
    }

    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Banco de dados não configurado.' }, { status: 500 });
    }

    const body = await req.json();
    const ownerTeacherId = session.ownerTeacherId || session.sub;

    // Suporte tanto a um único item quanto a um array de itens (sincronização em lote)
    const rawItems = Array.isArray(body) ? body : [body];

    if (rawItems.length === 0) {
      return NextResponse.json({ error: 'Nenhum dado informado.' }, { status: 400 });
    }

    const dbPayload = rawItems.map((item: any) => {
      const studentId = item.studentId || item.student_id;
      const studentName = item.studentName || item.student_name;
      const studentTurma = item.studentTurma || item.student_turma || '';
      const dataFalta = item.dataFalta || item.data_falta;
      const dataAtestado = item.dataAtestado || item.data_atestado;
      const diasAtestado = Number(item.diasAtestado || item.dias_atestado) || 1;
      const dataFinal = item.dataFinal || item.data_final;
      const motivo = item.motivo || null;
      const tipo = item.tipo || 'Atestado';
      const createdAt = item.createdAt || item.created_at || new Date().toISOString();

      return {
        id: item.id || undefined,
        student_id: studentId,
        student_name: studentName,
        student_turma: studentTurma,
        data_falta: dataFalta,
        data_atestado: dataAtestado,
        dias_atestado: diasAtestado,
        data_final: dataFinal,
        motivo: motivo,
        tipo: tipo,
        created_at: createdAt,
        owner_teacher_id: ownerTeacherId, // Forçado pelo backend a partir da sessão segura
      };
    });

    const { data: upserted, error } = await admin
      .from('atestados_rad')
      .upsert(dbPayload, { onConflict: 'id' })
      .select();

    if (error) {
      console.error('Erro ao salvar atestados_rad:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: upserted });
  } catch (err: any) {
    console.error('Erro na rota POST /api/atestados-rad:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    if (session.role !== 'teacher' && session.role !== 'second_teacher') {
      return NextResponse.json({ error: 'Permissão negada.' }, { status: 403 });
    }

    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Banco de dados não configurado.' }, { status: 500 });
    }

    // Busca o ID a ser deletado da URL ou do corpo da requisição
    const url = new URL(req.url);
    let id = url.searchParams.get('id');

    if (!id) {
      try {
        const body = await req.json();
        id = body.id;
      } catch (e) {
        // Ignora erro de parse se não houver body
      }
    }

    if (!id) {
      return NextResponse.json({ error: 'ID do registro não informado.' }, { status: 400 });
    }

    const ownerTeacherId = session.ownerTeacherId || session.sub;

    // Deleta com isolamento estrito de ownerTeacherId
    const { error } = await admin
      .from('atestados_rad')
      .delete()
      .eq('id', id)
      .eq('owner_teacher_id', ownerTeacherId);

    if (error) {
      console.error('Erro ao deletar atestados_rad:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Registro removido com sucesso.' });
  } catch (err: any) {
    console.error('Erro na rota DELETE /api/atestados-rad:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
