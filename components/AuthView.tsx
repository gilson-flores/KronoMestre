'use client';

import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { StudentUser, TeacherUser, UserRole } from '@/lib/types';
import { BookOpen, User, GraduationCap, Lock, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { DEFAULT_TURMAS, getTurmaLabel, normalizeStudentName } from '@/lib/studentUtils';

interface AuthViewProps {
  students: StudentUser[];
  teacher: TeacherUser;
  onLoginTeacher: (teacher: TeacherUser) => void;
  onLoginStudent: (student: StudentUser) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({
  students,
  teacher,
  onLoginTeacher,
  onLoginStudent,
}) => {
  const [activeTab, setActiveTab] = useState<'teacher' | 'student'>('teacher');

  // Teacher Supabase Login state
  const [teacherEmail, setTeacherEmail] = useState(teacher.email);
  const [teacherPassword, setTeacherPassword] = useState('');
  const [teacherLoading, setTeacherLoading] = useState(false);
  const [teacherError, setTeacherError] = useState('');

  // Student Login state
  const [studentFullName, setStudentFullName] = useState('');
  const [studentTurma, setStudentTurma] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [studentError, setStudentError] = useState('');

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

      // 1. Tentar autenticação via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: teacherEmail,
        password: teacherPassword,
      });

      // Buscar perfil na tabela 'teachers'
      const { data: dbTeacher, error: dbError } = await supabase
        .from('teachers')
        .select('*')
        .eq('email', teacherEmail)
        .maybeSingle();

      if (authData?.user) {
        let teacherProfile: TeacherUser = {
          id: dbTeacher?.id || authData.user.id,
          name: dbTeacher?.name || authData.user.user_metadata?.full_name || teacherEmail.split('@')[0],
          subject: dbTeacher?.subject || 'Sociologia',
          email: authData.user.email || teacherEmail,
          avatarUrl: dbTeacher?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
          phone: dbTeacher?.phone || '',
          school: dbTeacher?.school || '',
        };

        // Upsert na tabela 'teachers' para garantir sincronização com Supabase
        const { data: upsertedTeacher, error: upsertError } = await supabase
          .from('teachers')
          .upsert({
            id: teacherProfile.id,
            email: teacherProfile.email,
            name: teacherProfile.name,
            subject: teacherProfile.subject,
            avatar_url: teacherProfile.avatarUrl,
            phone: teacherProfile.phone || null,
            school: teacherProfile.school || null,
          }, { onConflict: 'email' })
          .select('*')
          .maybeSingle();

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

      // 2. Se não autenticou no Supabase Auth, verificar se existe na tabela 'teachers'
      if (dbTeacher) {
        onLoginTeacher({
          id: dbTeacher.id,
          name: dbTeacher.name,
          subject: dbTeacher.subject || 'Sociologia',
          email: dbTeacher.email,
          avatarUrl: dbTeacher.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
          phone: dbTeacher.phone || '',
          school: dbTeacher.school || '',
        });
        return;
      }

      // Se não encontrou nem no Supabase Auth nem na tabela 'teachers'
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

  const handleStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStudentError('');

    const normalizedInputName = normalizeStudentName(studentFullName);

    if (!normalizedInputName || !studentTurma || !studentPassword) {
      setStudentError('Por favor, preencha o Nome Completo (MAIÚSCULAS SEM ACENTOS), selecione a Turma e a Senha.');
      return;
    }

    // Match student by normalized name & turma code
    const matched = students.find(
      (s) =>
        normalizeStudentName(s.fullName) === normalizedInputName &&
        s.turma === studentTurma
    );

    if (!matched) {
      setStudentError(
        'Aluno não encontrado para a turma ' +
          studentTurma +
          '. Certifique-se de que o nome está correto e cadastrado em MAIÚSCULAS sem acentos.'
      );
      return;
    }

    // Check password (default 1234 or matched hash)
    if (studentPassword === '1234' || studentPassword === matched.passwordHash) {
      onLoginStudent(matched);
    } else {
      setStudentError('Senha incorreta. A senha padrão cadastrada para alunos é 1234.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0b1326] text-[#dae2fd] flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#4ade80]/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md glass-panel rounded-3xl p-8 border border-white/10 relative z-10 shadow-2xl">
        {/* Header Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#171f33] border-2 border-[#4ade80] rounded-2xl flex items-center justify-center mx-auto mb-4 text-[#4ade80] shadow-lg shadow-[#4ade80]/10">
            <BookOpen className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Sociologia On-line</h1>
          <p className="text-sm text-[#bccabb] mt-1">Acesso ao portal escolar</p>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-2 gap-2 bg-[#131b2e] p-1.5 rounded-full mb-6 border border-white/5">
          <button
            onClick={() => {
              setActiveTab('teacher');
              setTeacherError('');
            }}
            className={`py-2.5 px-4 rounded-full text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'teacher'
                ? 'bg-[#4ade80] text-[#003919] shadow'
                : 'text-[#bccabb] hover:text-white'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Professor (Supabase)</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('student');
              setStudentError('');
            }}
            className={`py-2.5 px-4 rounded-full text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'student'
                ? 'bg-[#4ade80] text-[#003919] shadow'
                : 'text-[#bccabb] hover:text-white'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Aluno</span>
          </button>
        </div>

        {/* Teacher Login Form */}
        {activeTab === 'teacher' && (
          <form onSubmit={handleTeacherSubmit} className="space-y-4">

            {teacherError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-2xl text-xs font-medium">
                {teacherError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#bccabb] mb-1.5 ml-1">E-mail do Professor</label>
              <input
                type="email"
                required
                value={teacherEmail}
                onChange={(e) => setTeacherEmail(e.target.value)}
                className="w-full bg-[#131b2e] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-[#869486] focus:outline-none focus:border-[#4ade80]"
                placeholder="exemplo@escola.edu.br"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#bccabb] mb-1.5 ml-1">Senha</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={teacherPassword}
                  onChange={(e) => setTeacherPassword(e.target.value)}
                  className="w-full bg-[#131b2e] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-[#869486] focus:outline-none focus:border-[#4ade80]"
                  placeholder="Sua senha"
                />
                <Lock className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-[#869486]" />
              </div>
              <p className="text-[11px] text-[#bccabb] mt-1 ml-1">Autenticação exclusiva via Supabase</p>
            </div>

            <button
              type="submit"
              disabled={teacherLoading}
              className="w-full py-3.5 bg-[#4ade80] hover:bg-[#6bfb9a] text-[#003919] font-bold rounded-full transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-[#4ade80]/20 cursor-pointer mt-6"
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
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#4ade80]" />
              <span>Login do Aluno: Nome Completo, Turma e Senha (padrão 1234).</span>
            </div>

            {studentError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-2xl text-xs font-medium">
                {studentError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#bccabb] mb-1.5 ml-1">
                Nome Completo do Aluno (MAIÚSCULAS SEM ACENTOS)
              </label>
              <input
                type="text"
                required
                value={studentFullName}
                onChange={(e) => setStudentFullName(normalizeStudentName(e.target.value))}
                className="w-full bg-[#131b2e] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-[#869486] focus:outline-none focus:border-[#4ade80] uppercase tracking-wide"
                placeholder="Ex: LUCAS GABRIEL MARTINS"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#bccabb] mb-1.5 ml-1">Turma</label>
              <select
                required
                value={studentTurma}
                onChange={(e) => setStudentTurma(e.target.value)}
                className="w-full bg-[#131b2e] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#4ade80]"
              >
                <option value="">Selecione a sua turma...</option>
                {availableTurmas.map((t) => (
                  <option key={t} value={t} className="bg-[#0b1326] text-white">
                    {getTurmaLabel(t)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#bccabb] mb-1.5 ml-1">Senha</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={studentPassword}
                  onChange={(e) => setStudentPassword(e.target.value)}
                  className="w-full bg-[#131b2e] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-[#869486] focus:outline-none focus:border-[#4ade80]"
                  placeholder="Sua senha (padrão 1234)"
                />
                <Lock className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-[#869486]" />
              </div>
              <p className="text-[11px] text-[#bccabb] mt-1 ml-1">
                A senha padrão para todos os alunos é <span className="font-bold text-white">1234</span>
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-[#4ade80] hover:bg-[#6bfb9a] text-[#003919] font-bold rounded-full transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-[#4ade80]/20 cursor-pointer mt-6"
            >
              <span>Acessar Atividades e Notas</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
