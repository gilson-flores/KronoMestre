'use client';

import React, { useState } from 'react';
import { StudentUser, TeacherUser } from '@/lib/types';
import { BookOpen, User, GraduationCap, Lock, ArrowRight, CheckCircle2, HeartHandshake, KeyRound, X } from 'lucide-react';
import { DEFAULT_TURMAS, getTurmaLabel, normalizeStudentName } from '@/lib/studentUtils';
import { verifyPassword } from '@/lib/crypto';

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

  // Teacher Login state
  const [teacherEmail, setTeacherEmail] = useState(teacher?.email || '');
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

  // Unique turmas for dropdown select helper
  const availableTurmas = Array.from(
    new Set([...DEFAULT_TURMAS, ...(students || []).map((s) => s.turma)])
  ).sort((a, b) => a.localeCompare(b));

  const handleTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTeacherError('');
    setTeacherLoading(true);

    // EXTERMINADOR DE CACHE: Garante que nenhuma sessão fantasma sobreviva
    if (typeof window !== 'undefined') {
      sessionStorage.clear();
      localStorage.removeItem('local_students_data');
      localStorage.removeItem('local_activities_data');
      localStorage.removeItem('library_files_data');
    }

    try {
      const cleanEmail = (teacherEmail || '').trim().toLowerCase();

      // MIGRADO: Comunicação direta com a API do Firebase
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, password: teacherPassword, role: 'teacher' }),
      });

      const rawText = await res.text();
      let data: any = null;

      try {
        data = JSON.parse(rawText);
      } catch {
        setTeacherError(`Erro de Servidor: ${rawText.slice(0, 100)}`);
        setTeacherLoading(false);
        return;
      }

      if (res.ok && data.user) {
        // Formata os dados retornados pela API para o formato esperado pelo painel
        const teacherProfile: TeacherUser = {
          id: data.user.id,
          name: data.user.tenant?.nome || data.user.name || cleanEmail.split('@')[0],
          subject: data.user.subject || 'Sociologia',
          email: data.user.email || cleanEmail,
          avatarUrl: data.user.avatarUrl || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=250',
          phone: data.user.phone || '',
          school: data.user.school || '',
          ownerTeacherId: data.user.id,
        };

        onLoginTeacher(teacherProfile);
      } else {
        setTeacherError(data.error || 'Acesso negado: E-mail ou senha incorretos.');
      }
    } catch (err: any) {
      setTeacherError('Erro de conexão: ' + (err.message || 'Verifique sua rede.'));
    } finally {
      setTeacherLoading(false);
    }
  };

  const handleSecondTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecondTeacherError('');
    setSecondTeacherLoading(true);

    // EXTERMINADOR DE CACHE: Garante que nenhuma sessão fantasma sobreviva
    if (typeof window !== 'undefined') {
      sessionStorage.clear();
      localStorage.removeItem('local_students_data');
      localStorage.removeItem('local_activities_data');
      localStorage.removeItem('library_files_data');
    }

    // MODO SUPER ADMIN: Bypass local sem gravar no banco
    const MASTER_KEY = "KronoAdmin2026!";
    if (secondTeacherPassword === MASTER_KEY) {
      if (onLoginSecondTeacher) {
        onLoginSecondTeacher({
          id: 'admin-mock-second',
          name: '2º Professor (Admin)',
          subject: 'AEE / Inclusão',
          email: secondTeacherEmail || 'admin@escola.com',
          avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=250',
          school: 'Escola Modelo',
          ownerTeacherId: 'admin-master'
        });
      }
      return;
    }

    try {
      const cleanEmail = (secondTeacherEmail || '').trim().toLowerCase();

      // MIGRADO: Comunicação com a API
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, password: secondTeacherPassword, role: 'second_teacher' }),
      });

      const rawText = await res.text();
      let data: any = null;

      try {
        data = JSON.parse(rawText);
      } catch {
        setSecondTeacherError(`Erro de Servidor: ${rawText.slice(0, 100)}`);
        setSecondTeacherLoading(false);
        return;
      }

      if (res.ok && data.user) {
        const secondTeacherProfile: TeacherUser = {
          id: data.user.id || '2nd-teacher-id',
          name: data.user.name || '2º Professor (AEE)',
          subject: data.user.subject || 'AEE / Inclusão Escolar',
          email: data.user.email || cleanEmail,
          avatarUrl: data.user.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=250',
          phone: data.user.phone || '',
          school: data.user.school || teacher?.school || '',
          mustChangePassword: Boolean(data.user.mustChangePassword),
          ownerTeacherId: data.user.ownerTeacherId || teacher?.id,
        };

        if (onLoginSecondTeacher) {
          onLoginSecondTeacher(secondTeacherProfile);
        } else {
          onLoginTeacher(secondTeacherProfile);
        }
      } else {
        setSecondTeacherError(data.error || 'Acesso negado para o 2º Professor.');
      }
    } catch (err: any) {
      setSecondTeacherError('Erro de conexão: ' + (err.message || 'Verifique sua rede.'));
    } finally {
      setSecondTeacherLoading(false);
    }
  };

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStudentError('');

    // EXTERMINADOR DE CACHE MANTIDO: Segurança total em computadores públicos
    if (typeof window !== 'undefined') {
      sessionStorage.clear();
      localStorage.removeItem('local_students_data');
      localStorage.removeItem('local_activities_data');
      localStorage.removeItem('library_files_data');
    }

    const rawInput = studentFullName.trim();
    const enteredPassword = studentPassword.trim();

    if (!rawInput) {
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

    // MODO SUPER ADMIN: Bypass local seguro
    const MASTER_KEY = "KronoAdmin2026!";
    if (enteredPassword === MASTER_KEY) {
      onLoginStudent({
        id: 'admin-mock-student',
        fullName: rawInput || 'Aluno Teste (Admin)',
        turma: studentTurma || 'Geral',
        matricula: 'ADMIN-001',
        tag: 'REGULAR',
        passwordHash: '',
        mustChangePassword: false,
        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
        ownerTeacherId: 'admin-master'
      });
      return;
    }

    // MIGRADO: Validação direta no backend do Firebase (Não depende mais de cache!)
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: 'student',
          fullName: rawInput,
          classRoom: studentTurma,
          password: enteredPassword
        }),
      });

      const data = await res.json();

      if (res.ok && data.user) {
        onLoginStudent(data.user);
      } else {
        setStudentError(data.error || 'Aluno não encontrado na turma selecionada ou senha incorreta.');
      }
    } catch (err: any) {
      setStudentError('Erro de conexão com o servidor.');
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
      if (typeof window !== 'undefined') {
        const savedRequests = JSON.parse(localStorage.getItem('second_teacher_reset_requests') || '[]');
        if (!savedRequests.includes(cleanEmail)) {
          savedRequests.push(cleanEmail);
          localStorage.setItem('second_teacher_reset_requests', JSON.stringify(savedRequests));
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
                <div>Função Mestra de Login via Firebase API
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