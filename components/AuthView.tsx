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

      // 2. Se não autenticou no Supabase Auth, verificar se existe na tabela 'teachers'
      if (dbTeacher) {
        onLoginTeacher({
          id: dbTeacher.id,
          name: dbTeacher.name,
          subject: dbTeacher.subject || 'Sociologia',
          email: dbTeacher.email,
          avatarUrl: dbTeacher.avatar_url || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=250',
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

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStudentError('');

    const rawInput = studentFullName.trim();
    const normalizedInputName = normalizeStudentName(rawInput);
    const passwordToTest = studentPassword.trim() || '1234';

    if (!rawInput && !normalizedInputName) {
      setStudentError('Por favor, informe o seu Nome Completo ou Matrícula.');
      return;
    }

    // 1. Procurar no estado local de alunos
    let matched = students.find((s) => {
      const matchName = normalizeStudentName(s.fullName) === normalizedInputName;
      const matchMatricula = s.matricula && s.matricula.trim().toLowerCase() === rawInput.toLowerCase();
      const matchTurma = !studentTurma || s.turma === studentTurma;
      return (matchName || matchMatricula) && matchTurma;
    });

    // Se não encontrou restrito à turma selecionada, tentar procurar por nome/matrícula independentemente de turma
    if (!matched) {
      matched = students.find((s) => {
        const matchName = normalizeStudentName(s.fullName) === normalizedInputName;
        const matchMatricula = s.matricula && s.matricula.trim().toLowerCase() === rawInput.toLowerCase();
        return matchName || matchMatricula;
      });
    }

    // Se ainda não encontrou, tentar busca por primeiro/último nome contido
    if (!matched && normalizedInputName.length >= 4) {
      matched = students.find((s) => {
        const studentNorm = normalizeStudentName(s.fullName);
        return studentNorm.includes(normalizedInputName) || normalizedInputName.includes(studentNorm);
      });
    }

    // 2. Se ainda não encontrou e Supabase estiver configurado, buscar no Supabase
    if (!matched && isSupabaseConfigured && supabase) {
      try {
        const { data: dbStudents } = await supabase
          .from('students')
          .select('*');

        if (dbStudents && dbStudents.length > 0) {
          const dbMatched = dbStudents.find((s) => {
            const matchName = normalizeStudentName(s.full_name) === normalizedInputName;
            const matchMatricula = s.matricula && s.matricula.trim().toLowerCase() === rawInput.toLowerCase();
            return matchName || matchMatricula;
          });

          if (dbMatched) {
            matched = {
              id: dbMatched.id,
              fullName: dbMatched.full_name,
              turma: dbMatched.turma,
              matricula: dbMatched.matricula,
              tag: dbMatched.tag,
              passwordHash: dbMatched.password_hash || '1234',
              avatarUrl: dbMatched.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
              pedagogicalNotes: dbMatched.pedagogical_notes || '',
            };
          }
        }
      } catch (err) {
        console.error('Erro ao buscar aluno no Supabase:', err);
      }
    }

    if (!matched) {
      setStudentError(
        `Aluno não encontrado para "${rawInput}". Verifique se o nome ou a matrícula estão digitados corretamente.`
      );
      return;
    }

    // Verificar senha (padrão 1234 ou matched hash)
    const expectedPassword = matched.passwordHash || '1234';
    if (passwordToTest === '1234' || passwordToTest === expectedPassword) {
      onLoginStudent(matched);
    } else {
      setStudentError('Senha incorreta. A senha padrão cadastrada para alunos é 1234.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0b1326] text-[#dae2fd] flex flex-col justify-center items-center p-3 sm:p-6 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 sm:w-96 h-72 sm:h-96 bg-[#4ade80]/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 left-1/3 w-64 sm:w-80 h-64 sm:h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md glass-panel rounded-3xl p-5 sm:p-8 border border-white/10 relative z-10 shadow-2xl">
        {/* Header Logo */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#171f33] border-2 border-[#4ade80] rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 text-[#4ade80] shadow-lg shadow-[#4ade80]/10">
            <BookOpen className="w-7 h-7 sm:w-8 sm:h-8" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Sociologia On-line</h1>
          <p className="text-xs sm:text-sm text-[#bccabb] mt-1">Acesso ao portal escolar</p>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-2 gap-2 bg-[#131b2e] p-1.5 rounded-full mb-6 border border-white/5">
          <button
            onClick={() => {
              setActiveTab('teacher');
              setTeacherError('');
            }}
            className={`py-3 px-3 sm:px-4 rounded-full text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer min-h-[44px] ${
              activeTab === 'teacher'
                ? 'bg-[#4ade80] text-[#003919] shadow'
                : 'text-[#bccabb] hover:text-white'
            }`}
          >
            <User className="w-4 h-4 shrink-0" />
            <span>Professor</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('student');
              setStudentError('');
            }}
            className={`py-3 px-3 sm:px-4 rounded-full text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer min-h-[44px] ${
              activeTab === 'student'
                ? 'bg-[#4ade80] text-[#003919] shadow'
                : 'text-[#bccabb] hover:text-white'
            }`}
          >
            <GraduationCap className="w-4 h-4 shrink-0" />
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
              <p className="text-[11px] text-[#bccabb] mt-1 ml-1">Autenticação do sistema</p>
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
              <span>Acesso rápido: Informe seu Nome Completo ou Matrícula (Senha padrão: 1234).</span>
            </div>

            {studentError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-2xl text-xs font-medium">
                {studentError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#bccabb] mb-1.5 ml-1">
                Nome Completo do Aluno ou Matrícula
              </label>
              <input
                type="text"
                required
                value={studentFullName}
                onChange={(e) => setStudentFullName(e.target.value)}
                className="w-full bg-[#131b2e] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-[#869486] focus:outline-none focus:border-[#4ade80] uppercase tracking-wide"
                placeholder="Ex: AMANDHA LETTICIA SILVA PACHECO"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#bccabb] mb-1.5 ml-1">
                Turma (Opcional)
              </label>
              <select
                value={studentTurma}
                onChange={(e) => setStudentTurma(e.target.value)}
                className="w-full bg-[#131b2e] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#4ade80]"
              >
                <option value="">Todas / Identificar automaticamente</option>
                {availableTurmas.map((t) => (
                  <option key={t} value={t} className="bg-[#0b1326] text-white">
                    Turma {getTurmaLabel(t)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#bccabb] mb-1.5 ml-1">
                Senha (Padrão: 1234)
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={studentPassword}
                  onChange={(e) => setStudentPassword(e.target.value)}
                  className="w-full bg-[#131b2e] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-[#869486] focus:outline-none focus:border-[#4ade80]"
                  placeholder="Deixe em branco ou digite 1234"
                />
                <Lock className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-[#869486]" />
              </div>
              <p className="text-[11px] text-[#bccabb] mt-1 ml-1">
                A senha padrão cadastrada para todos os alunos é <span className="font-bold text-white">1234</span>
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
