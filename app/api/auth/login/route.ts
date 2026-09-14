import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { signSessionToken, setSessionCookie, SessionPayload } from '@/lib/auth-server';
import { verifyPasswordBcrypt, hashPasswordBcrypt } from '@/lib/crypto';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { role } = body;

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Serviço de banco de dados não configurado no servidor.' },
        { status: 500 }
      );
    }

    // ==========================================
    // 1. FLUXO DE LOGIN: PROFESSOR TITULAR
    // ==========================================
    if (role === 'teacher') {
      const email = (body.email || '').trim().toLowerCase();
      const password = body.password || '';

      if (!email || !password) {
        return NextResponse.json(
          { error: 'E-mail e senha são obrigatórios.' },
          { status: 400 }
        );
      }

      // Tenta autenticação via Supabase Auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
        email,
        password,
      });

      if (authError || !authData?.user) {
        return NextResponse.json(
          { error: 'Credenciais inválidas. Verifique seu e-mail e senha.' },
          { status: 401 }
        );
      }

      // Busca dados na tabela teachers
      const { data: dbTeacher, error: dbError } = await supabaseAdmin
        .from('teachers')
        .select('*')
        .ilike('email', email)
        .maybeSingle();

      const teacherId = dbTeacher?.id || authData?.user?.id;
      if (!teacherId) {
        return NextResponse.json(
          { error: 'Professor não encontrado no sistema.' },
          { status: 404 }
        );
      }

      const sessionPayload: SessionPayload = {
        sub: teacherId,
        role: 'teacher',
        ownerTeacherId: teacherId, // O Titular é o próprio dono da assinatura
        name: dbTeacher?.name || authData?.user?.user_metadata?.full_name || email.split('@')[0],
        email: dbTeacher?.email || email,
        subject: dbTeacher?.subject || 'Sociologia',
        avatarUrl: dbTeacher?.avatar_url || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=250',
      };

      const token = await signSessionToken(sessionPayload, '7d');
      const response = NextResponse.json({
        success: true,
        user: sessionPayload,
      });

      setSessionCookie(response, token, 7 * 24 * 60 * 60);
      return response;
    }

    // ==========================================
    // 2. FLUXO DE LOGIN: 2º PROFESSOR
    // ==========================================
    if (role === 'second_teacher') {
      const email = (body.email || '').trim().toLowerCase();
      const password = body.password || '';

      if (!email || !password) {
        return NextResponse.json(
          { error: 'E-mail e senha são obrigatórios.' },
          { status: 400 }
        );
      }

      // Busca o 2º professor no banco
      const { data: dbSecondTeacher, error: secError } = await supabaseAdmin
        .from('second_teachers')
        .select('*')
        .ilike('email', email)
        .maybeSingle();

      if (secError || !dbSecondTeacher) {
        return NextResponse.json(
          { error: '2º Professor não encontrado com este e-mail.' },
          { status: 404 }
        );
      }

      const storedPassword = dbSecondTeacher.password || '';
      const isValid = await verifyPasswordBcrypt(password, storedPassword);

      if (!isValid) {
        return NextResponse.json(
          { error: 'Senha incorreta. Verifique os dados digitados.' },
          { status: 401 }
        );
      }

      // Migração transparente de senha para bcrypt se ainda não estiver no padrão $2a$ / $2b$
      if (!storedPassword.startsWith('$2a$') && !storedPassword.startsWith('$2b$')) {
        try {
          const bcryptHash = await hashPasswordBcrypt(password);
          await supabaseAdmin
            .from('second_teachers')
            .update({ password: bcryptHash })
            .eq('id', dbSecondTeacher.id);
        } catch (upgradeErr) {
          console.warn('Erro na migração transparente para bcrypt do 2º prof:', upgradeErr);
        }
      }

      // Descobre o owner_teacher_id (titular dono deste 2º professor)
      let ownerTeacherId = dbSecondTeacher.owner_teacher_id;
      if (!ownerTeacherId) {
        const { data: firstTeacher } = await supabaseAdmin.from('teachers').select('id').limit(1).maybeSingle();
        ownerTeacherId = firstTeacher?.id || dbSecondTeacher.id;
      }

      const sessionPayload: SessionPayload = {
        sub: dbSecondTeacher.id,
        role: 'second_teacher',
        ownerTeacherId: ownerTeacherId,
        name: dbSecondTeacher.name,
        email: dbSecondTeacher.email,
        avatarUrl: dbSecondTeacher.avatar_url || 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=250',
        mustChangePassword: Boolean(dbSecondTeacher.must_change_password),
      };

      const token = await signSessionToken(sessionPayload, '7d');
      const response = NextResponse.json({
        success: true,
        user: sessionPayload,
      });

      setSessionCookie(response, token, 7 * 24 * 60 * 60);
      return response;
    }

    // ==========================================
    // 3. FLUXO DE LOGIN: ALUNO
    // ==========================================
    if (role === 'student') {
      const fullName = (body.fullName || '').trim();
      const classRoom = (body.classRoom || '').trim();
      const matricula = (body.matricula || '').trim();
      const password = body.password || '';

      if (!password) {
        return NextResponse.json(
          { error: 'Por favor, informe a senha de acesso.' },
          { status: 400 }
        );
      }

      let query = supabaseAdmin.from('students').select('*');

      if (matricula) {
        query = query.eq('matricula', matricula);
      } else if (fullName && classRoom) {
        query = query.ilike('full_name', fullName);
      } else {
        return NextResponse.json(
          { error: 'Informe Nome e Turma ou a Matrícula do aluno.' },
          { status: 400 }
        );
      }

      const { data: studentRecords, error: stuError } = await query;
      const student = (studentRecords || []).find(
        (s) => !classRoom || (s.turma && s.turma.toLowerCase() === classRoom.toLowerCase()) || (s.class_room && s.class_room.toLowerCase() === classRoom.toLowerCase())
      ) || studentRecords?.[0];

      if (stuError || !student) {
        return NextResponse.json(
          { error: 'Aluno não encontrado para a turma/matrícula informada.' },
          { status: 404 }
        );
      }

      const storedPassword = student.password_hash || '';
      if (!storedPassword) {
        return NextResponse.json(
          { error: 'Aluno sem senha cadastrada. Solicite ao professor titular a definição da sua senha.' },
          { status: 401 }
        );
      }

      const isValid = await verifyPasswordBcrypt(password, storedPassword);
      if (!isValid) {
        return NextResponse.json(
          { error: 'Senha incorreta. Verifique sua senha de acesso.' },
          { status: 401 }
        );
      }

      // Migração transparente de senha para bcrypt se ainda não estiver no padrão $2a$ / $2b$
      if (!storedPassword.startsWith('$2a$') && !storedPassword.startsWith('$2b$')) {
        try {
          const bcryptHash = await hashPasswordBcrypt(password);
          await supabaseAdmin
            .from('students')
            .update({ password_hash: bcryptHash })
            .eq('id', student.id);
        } catch (upgradeErr) {
          console.warn('Erro na migração transparente de senha do aluno para bcrypt:', upgradeErr);
        }
      }

      // Descobre o owner_teacher_id (titular dono deste aluno)
      let ownerTeacherId = student.owner_teacher_id;
      if (!ownerTeacherId) {
        const { data: firstTeacher } = await supabaseAdmin.from('teachers').select('id').limit(1).maybeSingle();
        ownerTeacherId = firstTeacher?.id || '';
      }

      const sessionPayload: SessionPayload = {
        sub: student.id,
        role: 'student',
        ownerTeacherId: ownerTeacherId,
        name: student.full_name,
        matricula: student.matricula,
        classRoom: student.class_room || student.turma,
        isPne: Boolean(student.is_pne),
        avatarUrl: student.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
        mustChangePassword: Boolean(student.must_change_password),
      };

      // Sessão de aluno: validade de 24 horas
      const token = await signSessionToken(sessionPayload, '24h');
      const response = NextResponse.json({
        success: true,
        user: sessionPayload,
      });

      setSessionCookie(response, token, 24 * 60 * 60);
      return response;
    }

    return NextResponse.json(
      { error: 'Perfil de usuário não reconhecido.' },
      { status: 400 }
    );
  } catch (err: any) {
    console.error('Erro no endpoint de login:', err);
    return NextResponse.json(
      { error: 'Erro interno durante autenticação.', details: err.message },
      { status: 500 }
    );
  }
}
