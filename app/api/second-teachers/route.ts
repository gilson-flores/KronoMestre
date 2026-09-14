import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { hashPasswordBcrypt } from '@/lib/crypto';
import { getSessionFromRequest } from '@/lib/auth-server';

export async function GET(req: NextRequest) {
  try {
    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ teachers: [] }, { status: 200 });
    }

    const { data, error } = await admin
      .from('second_teachers')
      .select('id, name, email, subject, avatar_url, phone, school, must_change_password, created_at')
      .order('name');

    if (error) {
      console.error('Erro ao buscar second_teachers na API:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ teachers: data || [] }, { status: 200 });
  } catch (err: any) {
    console.error('Erro interno GET /api/second-teachers:', err);
    return NextResponse.json({ error: 'Erro interno ao listar professores' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Banco de dados indisponível.' }, { status: 500 });
    }

    const body = await req.json();
    const { name, email, password, subject, phone, school, avatarUrl } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Nome, e-mail e senha são obrigatórios.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const hashedPassword = await hashPasswordBcrypt(password.trim());

    // 1. Tentar criar no Supabase Auth se aplicável
    try {
      await admin.auth.admin.createUser({
        email: cleanEmail,
        password: password.trim(),
        user_metadata: { full_name: name.trim(), role: 'second_teacher' },
        email_confirm: true,
      });
    } catch (authErr) {
      console.warn('Aviso ao criar usuário no Auth admin:', authErr);
    }

    // 2. Upsert na tabela second_teachers
    const { data, error } = await admin
      .from('second_teachers')
      .upsert(
        {
          name: name.trim(),
          email: cleanEmail,
          password: hashedPassword,
          subject: subject?.trim() || 'AEE / Inclusão Escolar',
          phone: phone?.trim() || '',
          school: school?.trim() || '',
          avatar_url: avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=250',
          must_change_password: true,
        },
        { onConflict: 'email' }
      )
      .select('id, name, email, subject, avatar_url, phone, school, must_change_password')
      .single();

    if (error) {
      console.error('Erro ao salvar second_teacher:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, teacher: data }, { status: 201 });
  } catch (err: any) {
    console.error('Erro interno POST /api/second-teachers:', err);
    return NextResponse.json({ error: 'Erro interno ao criar professor' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Banco de dados indisponível.' }, { status: 500 });
    }

    const body = await req.json();
    const { id, name, email, subject, phone, school, avatarUrl } = body;

    if (!id && !email) {
      return NextResponse.json({ error: 'ID ou e-mail é obrigatório para edição.' }, { status: 400 });
    }

    const updatePayload: Record<string, any> = {};
    if (name) updatePayload.name = name.trim();
    if (subject !== undefined) updatePayload.subject = subject.trim();
    if (phone !== undefined) updatePayload.phone = phone.trim();
    if (school !== undefined) updatePayload.school = school.trim();
    if (avatarUrl) updatePayload.avatar_url = avatarUrl;

    let query = admin.from('second_teachers').update(updatePayload);
    if (id) {
      query = query.eq('id', id);
    } else if (email) {
      query = query.ilike('email', email.trim());
    }

    const { data, error } = await query
      .select('id, name, email, subject, avatar_url, phone, school, must_change_password')
      .maybeSingle();

    if (error) {
      console.error('Erro ao editar second_teacher:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Se o nome foi alterado, atualizar second_teacher_name na tabela students
    if (name && (id || email)) {
      try {
        if (id) {
          await admin
            .from('students')
            .update({ second_teacher_name: name.trim() })
            .eq('second_teacher_id', id);
        }
      } catch (stErr) {
        console.warn('Aviso ao sincronizar nome na tabela students:', stErr);
      }
    }

    return NextResponse.json({ success: true, teacher: data }, { status: 200 });
  } catch (err: any) {
    console.error('Erro interno PUT /api/second-teachers:', err);
    return NextResponse.json({ error: 'Erro interno ao atualizar professor' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    // Professor titular tem permissão total
    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Banco de dados indisponível.' }, { status: 500 });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    const email = url.searchParams.get('email');

    if (!id && !email) {
      return NextResponse.json(
        { error: 'ID ou e-mail do 2º professor é obrigatório para exclusão.' },
        { status: 400 }
      );
    }

    // 1. Desvincular alunos que estavam sob a tutela desse 2º professor (evita erro de foreign key e mantém dados limpos)
    try {
      if (id) {
        await admin
          .from('students')
          .update({
            second_teacher_id: null,
            second_teacher_name: null,
          })
          .eq('second_teacher_id', id);
      }
      if (email) {
        // Se houver registros com id desconhecido mas vinculados pelo nome/email
        const { data: foundTeacher } = await admin
          .from('second_teachers')
          .select('id, name')
          .ilike('email', email.trim())
          .maybeSingle();

        if (foundTeacher?.id) {
          await admin
            .from('students')
            .update({
              second_teacher_id: null,
              second_teacher_name: null,
            })
            .eq('second_teacher_id', foundTeacher.id);
        }
      }
    } catch (unassignErr) {
      console.warn('Aviso ao desvincular alunos antes da exclusão do 2º professor:', unassignErr);
    }

    // 2. Excluir o 2º professor da tabela second_teachers
    let deleteQuery = admin.from('second_teachers').delete();
    if (id && email) {
      deleteQuery = deleteQuery.or(`id.eq.${id},email.ilike.${email.trim()}`);
    } else if (id) {
      deleteQuery = deleteQuery.eq('id', id);
    } else if (email) {
      deleteQuery = deleteQuery.ilike('email', email.trim());
    }

    const { error: deleteError } = await deleteQuery;

    if (deleteError) {
      console.error('Erro ao excluir second_teacher:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json(
      { success: true, message: '2º Professor removido com sucesso e tutelas desvinculadas.' },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('Erro interno DELETE /api/second-teachers:', err);
    return NextResponse.json({ error: 'Erro interno ao excluir professor' }, { status: 500 });
  }
}
