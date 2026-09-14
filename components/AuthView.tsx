'use client';

import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { StudentUser, TeacherUser, UserRole } from '@/lib/types';
import { BookOpen, User, GraduationCap, Lock, ArrowRight, ShieldCheck, CheckCircle2, HeartHandshake, KeyRound, X } from 'lucide-react';
import { DEFAULT_TURMAS, getTurmaLabel, normalizeStudentName } from '@/lib/studentUtils';
import { hashPassword, verifyPassword, isHashed } from '@/lib/crypto';

interface AuthViewProps {
  students: StudentUser[];
  teacher: TeacherUser;
  onLoginTeacher: (teacher: TeacherUser) => void;
  onLoginStudent: (student: StudentUser) => void;
  onLoginSecondTeacher?: (teacher: TeacherUser) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({
  students,
  teacher,
  onLoginTeacher,
  onLoginStudent,
  onLoginSecondTeacher,
}) => {
  const [activeTab, setActiveTab] = useState<'teacher' | 'student' | 'second_teacher'>('teacher');

  // Teacher Supabase Login state
  const [teacherEmail, setTeacherEmail] = useState(teacher.email);
  const [teacherPassword, setTeacherPassword] = useState('');
  const [teacherLoading, setTeacherLoading] = useState(false);
  const [teacherError, setTeacherError] = useState('');

  // 2º Professor Login state
  const [secondTeacherEmail, setSecondTeacherEmail] = useState('');
  const [secondTeacherPassword, setSecondTeacherPassword] = useState('');
  const [secondTeacherLoading, setSecondTeacherLoading] = useState(false);
  const [secondTeacherError, setSecondTeacherError] = useState('');

  // Student Login state
  const [studentFullName, setStudentFullName] = useState('');
  const [studentTurma, setStudentTurma] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [studentError, setStudentError] = useState('');

  // Modal Esqueci Minha Senha state (2º Professor)
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordMsg, setForgotPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Unique turmas for dropdown select helper (combining defaults and existing student turmas)
  const availableTurmas = Array.from(
    new Set([...DEFAULT_TURMAS, ...students.map((s) => s.turma)])
  ).sort((a, b) => a.localeCompare(b));

  const handleTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTeacherError('');
    setTeacherLoading(true);

    try {
      if (!isSupabaseConfigured || !supabase) {
        setTeacherError(
          'Supabase não está configurado. Configure as variáveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no seu ambiente.'
        );
        setTeacherLoading(false);
        return;
      }

      const cleanEmail = (teacherEmail || '').trim().toLowerCase();

      // 1. Tentar autenticação via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: teacherPassword,
      });

      // Buscar perfil na tabela 'teachers'
      const { data: dbTeacher, error: dbError } = await supabase
        .from('teachers')
        .select('*')
        .ilike('email', cleanEmail)
        .maybeSingle();

      if (authData?.user) {
        let teacherProfile: TeacherUser = {
          id: dbTeacher?.id || authData.user.id,
          name: dbTeacher?.name || authData.user.user_metadata?.full_name || teacherEmail.split('@')[0],
          subject: dbTeacher?.subject || 'Sociologia',
          email: authData.user.email || teacherEmail,
          avatarUrl: dbTeacher?.avatar_url || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=250',
          phone: dbTeacher?.phone || '',
          school: dbTeacher?.school || '',
        };

        const isValidUUID = (id?: string | null) => !!id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

        const updateFields = {
          email: teacherProfile.email,
          name: teacherProfile.name,
          subject: teacherProfile.subject,
          avatar_url: teacherProfile.avatarUrl,
          phone: teacherProfile.phone || null,
          school: teacherProfile.school || null,
        };

        let upsertedTeacher = null;

        if (dbTeacher?.id) {
          const { data } = await supabase
            .from('teachers')
            .update(updateFields)
            .eq('id', dbTeacher.id)
            .select('*')
            .maybeSingle();
          upsertedTeacher = data;
        } else {
          const insertPayload: any = { ...updateFields };
          if (teacherProfile.id && isValidUUID(teacherProfile.id)) {
            insertPayload.id = teacherProfile.id;
          }
          const { data } = await supabase
            .from('teachers')
            .insert(insertPayload)
            .select('*')
            .maybeSingle();
          upsertedTeacher = data;
        }

        if (upsertedTeacher) {
          teacherProfile = {
            id: upsertedTeacher.id,
            name: upsertedTeacher.name,
            subject: upsertedTeacher.subject || 'Sociologia',
            email: upsertedTeacher.email,
            avatarUrl: upsertedTeacher.avatar_url || teacherProfile.avatarUrl,
            phone: upsertedTeacher.phone || '',
            school: upsertedTeacher.school || '',
          };
        }

        onLoginTeacher(teacherProfile);
        return;
      }

      // 2. Se não autenticou no Supabase Auth, bloqueia o acesso
      // (Removido bypass inseguro que logava apenas com base no e-mail na tabela teachers)

      // Se não encontrou no Supabase Auth
      setTeacherError(
        'Acesso negado: E-mail ou senha não cadastrados no Supabase. ' +
          (authError?.message || dbError?.message || '')
      );
    } catch (err: any) {
      setTeacherError('Erro de conexão com o Supabase: ' + (err.message || 'Verifique sua rede.'));
    } finally {
      setTeacherLoading(false);
    }
  };

  const handleSecondTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecondTeacherError('');
    setSecondTeacherLoading(true);

    try {
      if (!isSupabaseConfigured || !supabase) {
        const secondTeacherProfile: TeacherUser = {
          id: 'second-teacher-demo',
          name: 'Professor(a) de Inclusão',
          subject: 'AEE / Inclusão Escolar',
          email: secondTeacherEmail || 'segundoprofessor@escola.edu.br',
          avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=250',
          school: teacher.school || 'Escola Estadual',
        };
        if (onLoginSecondTeacher) onLoginSecondTeacher(secondTeacherProfile);
        else onLoginTeacher(secondTeacherProfile);
        setSecondTeacherLoading(false);
        return;
      }

      const cleanEmail = (secondTeacherEmail || '').trim().toLowerCase();

      // 1. Tentar autenticação via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: secondTeacherPassword,
      });

      // Buscar perfil na tabela 'second_teachers'
      const { data: dbTeacher, error: dbError } = await supabase
        .from('second_teachers')
        .select('*')
        .ilike('email', cleanEmail)
        .maybeSingle();

      let isPasswordValid = Boolean(authData?.user);
      if (!isPasswordValid && dbTeacher?.password) {
        isPasswordValid = await verifyPassword(secondTeacherPassword, dbTeacher.password);
        // Migração transparente automática: se a senha no banco estava em texto puro, atualiza para hash SHA-256
        if (isPasswordValid && !isHashed(dbTeacher.password)) {
          try {
            const hashed = await hashPassword(secondTeacherPassword);
            await supabase
              .from('second_teachers')
              .update({ password: hashed })
              .eq('id', dbTeacher.id);
            await supabase
              .from('teachers')
              .update({ password: hashed })
              .ilike('email', cleanEmail);
          } catch (migErr) {
            console.warn('Aviso de migração de hash para 2º professor:', migErr);
          }
        }
      }

      if (isPasswordValid && (authData?.user || dbTeacher)) {
        // Autenticar sessão no servidor (cookie HttpOnly)
        try {
          await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              role: 'second_teacher',
              email: secondTeacherEmail,
              password: secondTeacherPassword,
            }),
          });
        } catch (apiErr) {
          console.warn('Aviso de sessão do servidor:', apiErr);
        }

        const secondTeacherProfile: TeacherUser = {
          id: dbTeacher?.id || authData?.user?.id || '2nd-teacher-id',
          name: dbTeacher?.name || authData?.user?.user_metadata?.full_name || '2º Professor (AEE)',
          subject: dbTeacher?.subject || 'AEE / Inclusão Escolar',
          email: dbTeacher?.email || authData?.user?.email || secondTeacherEmail,
          avatarUrl: dbTeacher?.avatar_url || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=250',
          phone: dbTeacher?.phone || '',
          school: dbTeacher?.school || teacher.school || '',
          mustChangePassword: Boolean(dbTeacher?.must_change_password),
        };

        if (onLoginSecondTeacher) {
          onLoginSecondTeacher(secondTeacherProfile);
        } else {
          onLoginTeacher(secondTeacherProfile);
        }
        return;
      }

      setSecondTeacherError(
        'Acesso negado: E-mail ou senha do 2º Professor incorretos ou não cadastrados. Verifique os dados ou utilize a opção de trocar senha.'
      );
    } catch (err: any) {
      setSecondTeacherError('Erro de conexão com o Supabase: ' + (err.message || 'Verifique sua rede.'));
    } finally {
      setSecondTeacherLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotPasswordMsg(null);

    const cleanEmail = forgotPasswordEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setForgotPasswordMsg({ type: 'error', text: 'Por favor, informe o seu e-mail de 2º Professor.' });
      return;
    }

    setForgotPasswordLoading(true);

    try {
      // 1. Salvar na lista de chamados de reset em localStorage
      if (typeof window !== 'undefined') {
        const savedRequests = JSON.parse(localStorage.getItem('second_teacher_reset_requests') || '[]');
        if (!savedRequests.includes(cleanEmail)) {
          savedRequests.push(cleanEmail);
          localStorage.setItem('second_teacher_reset_requests', JSON.stringify(savedRequests));
        }
      }

      // 2. Tentar registrar no Supabase chat_messages
      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.from('chat_messages').insert({
            student_id: 'broadcast',
            student_name: '2º Professor (Reset de Senha)',
            sender_role: 'second_teacher',
            text: `[CHAMADO RESET DE SENHA] O 2º Professor (${cleanEmail}) solicitou a redefinição de sua senha de acesso.`,
            created_at: new Date().toISOString(),
          });
        } catch (msgErr) {
          console.warn('Aviso ao registrar mensagem de chamado:', msgErr);
        }
      }

      setForgotPasswordMsg({
        type: 'success',
        text: 'Chamado enviado com sucesso ao Professor ADM! A solicitação para redefinir sua senha foi registrada.',
      });

      setTimeout(() => {
        setIsForgotPasswordOpen(false);
        setForgotPasswordMsg(null);
        setForgotPasswordEmail('');
      }, 3000);
    } catch (err: any) {
      setForgotPasswordMsg({
        type: 'error',
        text: 'Erro ao enviar chamado: ' + (err?.message || 'Verifique sua conexão.'),
      });
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStudentError('');

    const rawInput = studentFullName.trim();
    const normalizedInputName = normalizeStudentName(rawInput);
    const enteredPassword = studentPassword.trim();

    if (!rawInput && !normalizedInputName) {
      setStudentError('Por favor, informe o seu Nome Completo ou Matrícula.');
      return;
    }

    if (!studentTurma) {
      setStudentError('Por favor, selecione a sua Turma.');
      return;
    }

    if (!enteredPassword) {
      setStudentError('Por favor, digite a sua Senha de Acesso.');
      return;
    }

    // 1. Procurar no estado local de alunos obrigatoriamente na turma selecionada
    let matched = students.find((s) => {
      const matchName = normalizeStudentName(s.fullName) === normalizedInputName;
      const matchMatricula = s.matricula && s.matricula.trim().toLowerCase() === rawInput.toLowerCase();
      const matchTurma = s.turma === studentTurma;
      return (matchName || matchMatricula) && matchTurma;
    });

    // Se ainda não encontrou na turma, tentar busca por primeiro/último nome contido dentro da mesma turma
    if (!matched && normalizedInputName.length >= 4) {
      matched = students.find((s) => {
        const studentNorm = normalizeStudentName(s.fullName);
        const matchNamePartial = studentNorm.includes(normalizedInputName) || normalizedInputName.includes(studentNorm);
        return matchNamePartial && s.turma === studentTurma;
      });
    }

    // 2. Se o Supabase estiver configurado, buscar/atualizar com o registro mais recente do Supabase para a turma selecionada
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: dbStudents } = await supabase
          .from('students')
          .select('*');

        if (dbStudents && dbStudents.length > 0) {
          const dbMatched = dbStudents.find((s) => {
            const matchName = normalizeStudentName(s.full_name) === normalizedInputName;
            const matchMatricula = s.matricula && s.matricula.trim().toLowerCase() === rawInput.toLowerCase();
            const matchId = matched && s.id === matched.id;
            const matchTurma = s.turma === studentTurma;
            return (matchName || matchMatricula || matchId) && matchTurma;
          });

          if (dbMatched) {
            let parsedPneConditions: string[] | undefined = undefined;
            if (dbMatched.pne_conditions) {
              if (Array.isArray(dbMatched.pne_conditions)) {
                parsedPneConditions = dbMatched.pne_conditions;
              } else if (typeof dbMatched.pne_conditions === 'string') {
                try {
                  parsedPneConditions = JSON.parse(dbMatched.pne_conditions);
                } catch {
                  parsedPneConditions = dbMatched.pne_conditions.split(',').map((x: string) => x.trim()).filter(Boolean);
                }
              }
            }

            matched = {
              id: dbMatched.id,
              fullName: dbMatched.full_name,
              turma: dbMatched.turma,
              matricula: dbMatched.matricula,
              tag: dbMatched.tag,
              pneConditions: parsedPneConditions || (matched ? matched.pneConditions : undefined),
              secondTeacherId: dbMatched.second_teacher_id || (matched ? matched.secondTeacherId : undefined),
              secondTeacherName: dbMatched.second_teacher_name || (matched ? matched.secondTeacherName : undefined),
              passwordHash: dbMatched.password_hash || '',
              mustChangePassword: Boolean(dbMatched.must_change_password),
              avatarUrl: dbMatched.avatar_url || (matched ? matched.avatarUrl : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200'),
              pedagogicalNotes: dbMatched.pedagogical_notes || (matched ? matched.pedagogicalNotes : ''),
            };
          }
        }
      } catch (err) {
        console.warn('Erro ao buscar dados atualizados do aluno no Supabase:', err);
      }
    }

    if (!matched) {
      setStudentError(
        `Aluno não encontrado na Turma ${getTurmaLabel(studentTurma)} para "${rawInput}". Verifique se o nome/matrícula e a turma selecionada estão corretos.`
      );
      return;
    }

    // SEGURANÇA: NUNCA reintroduzir senha padrão fixa aqui
    // Exigir estritamente a senha real cadastrada do aluno
    const expectedPassword = matched.passwordHash;
    if (!expectedPassword || expectedPassword.trim() === '') {
      setStudentError('Aluno sem senha cadastrada. Solicite a definição da sua senha individual junto ao professor.');
      return;
    }

    const isPassValid = await verifyPassword(enteredPassword, expectedPassword);
    if (isPassValid) {
      // Autenticar sessão no servidor (cookie HttpOnly)
      try {
        await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            role: 'student',
            fullName: matched.fullName,
            classRoom: matched.turma,
            matricula: matched.matricula,
            password: enteredPassword,
          }),
        });
      } catch (apiErr) {
        console.warn('Aviso de sessão do servidor para aluno:', apiErr);
      }

      onLoginStudent(matched);
    } else {
      setStudentError('Senha incorreta. Verifique sua senha de acesso.');
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-center items-center p-3 sm:p-6 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 sm:w-96 h-72 sm:h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 left-1/3 w-64 sm:w-80 h-64 sm:h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md glass-panel rounded-3xl p-5 sm:p-8 border border-border relative z-10 shadow-2xl">
        {/* Header Logo */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#171f33] border-2 border-primary rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 text-primary shadow-lg shadow-[#4ade80]/10">
            <BookOpen className="w-7 h-7 sm:w-8 sm:h-8" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Sociologia On-line</h1>
          <p className="text-xs sm:text-sm text-muted mt-1">Acesso ao portal escolar</p>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-3 gap-1 bg-surface p-1.5 rounded-full mb-6 border border-border">
          <button
            onClick={() => {
              setActiveTab('teacher');
              setTeacherError('');
            }}
            className={`py-2.5 px-2 text-[11px] font-bold rounded-full transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer min-h-[42px] ${
              activeTab === 'teacher'
                ? 'bg-primary text-white shadow'
                : 'text-muted hover:text-foreground'
            }`}
          >
            <User className="w-3.5 h-3.5 shrink-0" />
            <span>Professor</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('student');
              setStudentError('');
            }}
            className={`py-2.5 px-2 text-[11px] font-bold rounded-full transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer min-h-[42px] ${
              activeTab === 'student'
                ? 'bg-primary text-white shadow'
                : 'text-muted hover:text-foreground'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5 shrink-0" />
            <span>Aluno</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('second_teacher');
              setSecondTeacherError('');
            }}
            className={`py-2.5 px-2 text-[11px] font-bold rounded-full transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer min-h-[42px] ${
              activeTab === 'second_teacher'
                ? 'bg-primary text-white shadow'
                : 'text-muted hover:text-foreground'
            }`}
          >
            <HeartHandshake className="w-3.5 h-3.5 shrink-0 text-amber-500" />
            <span>2º Professor</span>
          </button>
        </div>

        {/* Teacher Login Form */}
        {activeTab === 'teacher' && (
          <form onSubmit={handleTeacherSubmit} className="space-y-4">

            {teacherError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 rounded-2xl text-xs font-medium">
                {teacherError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5 ml-1">E-mail do Professor</label>
              <input
                type="email"
                required
                value={teacherEmail}
                onChange={(e) => setTeacherEmail(e.target.value)}
                className="w-full bg-surface border border-border rounded-2xl px-4 py-3 text-sm text-foreground placeholder-[#869486] focus:outline-none focus:border-primary"
                placeholder="exemplo@escola.edu.br"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5 ml-1">Senha</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={teacherPassword}
                  onChange={(e) => setTeacherPassword(e.target.value)}
                  className="w-full bg-surface border border-border rounded-2xl px-4 py-3 text-sm text-foreground placeholder-[#869486] focus:outline-none focus:border-primary"
                  placeholder="Sua senha"
                />
                <Lock className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-[#869486]" />
              </div>
              <p className="text-[11px] text-muted mt-1 ml-1">Autenticação do sistema</p>
            </div>

            <button
              type="submit"
              disabled={teacherLoading}
              className="w-full py-3.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-full transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-primary/20 cursor-pointer mt-6"
            >
              <span>{teacherLoading ? 'Autenticando...' : 'Entrar no Painel do Professor'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Student Login Form */}
        {activeTab === 'student' && (
          <form onSubmit={handleStudentSubmit} className="space-y-4">
            <div className="flex items-center gap-2 text-xs text-[#c0c1ff] bg-indigo-500/10 p-3 rounded-2xl border border-indigo-500/20 mb-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-primary" />
              <span>Acesso do Aluno: Informe seu Nome ou Matrícula, sua Turma e Senha de Acesso.</span>
            </div>

            {studentError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 rounded-2xl text-xs font-medium">
                {studentError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5 ml-1">
                Nome Completo do Aluno ou Matrícula <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={studentFullName}
                onChange={(e) => setStudentFullName(e.target.value)}
                className="w-full bg-surface border border-border rounded-2xl px-4 py-3 text-sm text-foreground placeholder-[#869486] focus:outline-none focus:border-primary uppercase tracking-wide"
                placeholder="Ex: AMANDHA LETTICIA SILVA PACHECO"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5 ml-1">
                Turma <span className="text-rose-400">*</span>
              </label>
              <select
                required
                value={studentTurma}
                onChange={(e) => setStudentTurma(e.target.value)}
                className="w-full bg-surface border border-border rounded-2xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary"
              >
                <option value="">Selecione sua Turma...</option>
                {availableTurmas.map((t) => (
                  <option key={t} value={t} className="bg-background text-foreground">
                    Turma {getTurmaLabel(t)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5 ml-1">
                Senha de Acesso <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={studentPassword}
                  onChange={(e) => setStudentPassword(e.target.value)}
                  className="w-full bg-surface border border-border rounded-2xl px-4 py-3 text-sm text-foreground placeholder-[#869486] focus:outline-none focus:border-primary"
                  placeholder="Digite sua senha de acesso"
                />
                <Lock className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-[#869486]" />
              </div>
              <p className="text-[11px] text-muted mt-1 ml-1">
                Digite a senha de acesso individual cadastrada pelo professor.
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-full transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-primary/20 cursor-pointer mt-6"
            >
              <span>Acessar Atividades e Notas</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* 2º Professor Login Form */}
        {activeTab === 'second_teacher' && (
          <form onSubmit={handleSecondTeacherSubmit} className="space-y-4">
            <div className="flex items-center gap-2 text-xs text-[#c0c1ff] bg-amber-500/10 p-3 rounded-2xl border border-amber-500/20 mb-2">
              <HeartHandshake className="w-4 h-4 shrink-0 text-amber-400" />
              <span>Ambiente do 2º Professor (AEE/Inclusão): Entre com seu E-mail e Senha cadastrados.</span>
            </div>

            {secondTeacherError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 rounded-2xl text-xs font-medium space-y-1">
                <p>{secondTeacherError}</p>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5 ml-1">E-mail do 2º Professor</label>
              <input
                type="email"
                required
                value={secondTeacherEmail}
                onChange={(e) => setSecondTeacherEmail(e.target.value)}
                className="w-full bg-surface border border-border rounded-2xl px-4 py-3 text-sm text-foreground placeholder-[#869486] focus:outline-none focus:border-amber-400"
                placeholder="segundoprofessor@escola.edu.br"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5 ml-1">
                <label className="block text-xs font-semibold text-muted">Senha de Acesso</label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotPasswordEmail(secondTeacherEmail);
                    setForgotPasswordMsg(null);
                    setIsForgotPasswordOpen(true);
                  }}
                  className="text-xs text-amber-400 hover:text-amber-600 font-semibold underline cursor-pointer flex items-center gap-1"
                >
                  <KeyRound className="w-3 h-3" />
                  <span>Esqueci minha senha</span>
                </button>
              </div>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={secondTeacherPassword}
                  onChange={(e) => setSecondTeacherPassword(e.target.value)}
                  className="w-full bg-surface border border-border rounded-2xl px-4 py-3 text-sm text-foreground placeholder-[#869486] focus:outline-none focus:border-amber-400"
                  placeholder="Sua senha de acesso"
                />
                <Lock className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-[#869486]" />
              </div>
            </div>

            <button
              type="submit"
              disabled={secondTeacherLoading}
              className="w-full py-3.5 bg-amber-400 hover:bg-amber-300 text-black font-bold rounded-full transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-amber-400/20 cursor-pointer mt-6"
            >
              <span>{secondTeacherLoading ? 'Autenticando...' : 'Acessar Painel do 2º Professor'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Modal Esqueci Minha Senha - 2º Professor */}
        {isForgotPasswordOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
            <div className="glass-panel w-full max-w-md p-6 rounded-3xl border border-border space-y-5 bg-surface shadow-2xl relative">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                  <KeyRound className="w-5 h-5" />
                  <span>Esqueci minha senha (2º Professor)</span>
                </div>
                <button
                  onClick={() => setIsForgotPasswordOpen(false)}
                  className="text-muted hover:text-foreground p-1 rounded-xl hover:bg-surface-hover transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-muted leading-relaxed">
                Informe seu e-mail cadastrado de 2º Professor. Um chamado será enviado diretamente ao Professor ADM para redefinir sua senha de acesso.
              </p>

              {forgotPasswordMsg && (
                <div
                  className={`p-3 rounded-2xl text-xs font-semibold ${
                    forgotPasswordMsg.type === 'success'
                      ? 'bg-emerald-100 border border-emerald-200 text-emerald-600'
                      : 'bg-rose-100 border border-rose-200 text-rose-600'
                  }`}
                >
                  {forgotPasswordMsg.text}
                </div>
              )}

              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-muted font-semibold mb-1">E-mail Cadastrado do 2º Professor</label>
                  <input
                    type="email"
                    required
                    value={forgotPasswordEmail}
                    onChange={(e) => setForgotPasswordEmail(e.target.value)}
                    className="w-full bg-surface border border-border rounded-2xl px-4 py-3 text-foreground focus:outline-none focus:border-amber-400"
                    placeholder="segundoprofessor@escola.edu.br"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsForgotPasswordOpen(false)}
                    className="flex-1 py-3 bg-surface hover:bg-[#1a243b] text-muted font-bold rounded-2xl border border-border transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={forgotPasswordLoading}
                    className="flex-1 py-3 bg-amber-400 hover:bg-amber-300 text-black font-bold rounded-2xl transition-all shadow-lg shadow-amber-400/20 cursor-pointer"
                  >
                    {forgotPasswordLoading ? 'Enviando...' : 'Enviar Chamado ao ADM'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthView;
