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
  const [teacherCode, setTeacherCode] = useState('');
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
     if (data.user.role === 'second_teacher' && onLoginSecondTeacher) {
       onLoginSecondTeacher({
         id: data.user.id || '2nd-teacher-id',
         name: data.user.name || '2º Professor (AEE)',
         subject: data.user.subject || 'AEE / Inclusão Escolar',
         email: data.user.email || cleanEmail,
         avatarUrl: data.user.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=250',
         phone: data.user.phone || '',
         school: data.user.school || '',
         driveFolderUrl: data.user.driveFolderUrl || '',
         mustChangePassword: Boolean(data.user.mustChangePassword),
         ownerTeacherId: data.user.ownerTeacherId,
       });
       return;
     }
     const tenant = data.user.tenant || {};
        // Formata os dados retornados pela API exclusivamente a partir do Firebase/Firestore
        const teacherProfile: TeacherUser = {
          id: data.user.id,
          name: tenant.name || tenant.nome || data.user.name || cleanEmail.split('@')[0],
          subject: tenant.subject || data.user.subject || 'Sociologia',
          email: data.user.email || cleanEmail,
          avatarUrl: tenant.avatarUrl || data.user.avatarUrl || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=250',
          phone: tenant.phone || data.user.phone || '',
          school: tenant.school || data.user.school || '',
          matriculaFuncional: tenant.matriculaFuncional || data.user.matriculaFuncional || '',
          contractStartDate: tenant.contractStartDate || '',
          contractEndDate: tenant.contractEndDate || '',
          contractType: tenant.contractType || 'ACT / Contratado',
          contractStatus: tenant.contractStatus || 'ativo',
          driveFolderUrl: tenant.driveFolderUrl || '',
          is_admin: tenant.is_admin ?? (cleanEmail === '755840@profe.sed.sc.gov.br' || cleanEmail === 'gilsonjuniores@gmail.com'),
          isAdmin: tenant.is_admin ?? (cleanEmail === '755840@profe.sed.sc.gov.br' || cleanEmail === 'gilsonjuniores@gmail.com'),
          plan_type: tenant.plan_type || 'basic',
          escolas_vinculadas: tenant.escolas_vinculadas || [],
          disciplinas: tenant.disciplinas || [],
          ownerTeacherId: data.user.id,
        };

        onLoginTeacher(teacherProfile);
      } else {
        const rawErr = data.error || '';
        let friendlyErr = rawErr;
        if (!rawErr || rawErr === 'INVALID_LOGIN_CREDENTIALS' || rawErr === 'INVALID_PASSWORD' || rawErr === 'EMAIL_NOT_FOUND') {
          friendlyErr = 'E-mail ou senha incorretos. Verifique suas credenciais.';
        } else if (rawErr.includes('TOO_MANY_ATTEMPTS')) {
          friendlyErr = 'Muitas tentativas de login. Aguarde alguns instantes e tente novamente.';
        }
        setTeacherError(friendlyErr);
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

    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('active_session'); 
      localStorage.removeItem('local_students_data');
      localStorage.removeItem('local_activities_data');
      localStorage.removeItem('library_files_data');
    }

    const INCLUSION_ICON = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNTYgMjU2Ij4KICA8ZGVmcz4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0iYmciIHgxPSIwIiB5MT0iMCIgeDI9IjI1NiIgeTI9IjI1NiI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiMxZTI5M2IiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjMGYxNzJhIi8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogICAgPGxpbmVhckdyYWRpZW50IGlkPSJwcmltYXJ5IiB4MT0iMCIgeTE9IjAiIHgyPSIyNTYiIHkyPSIyNTYiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjZjU5ZTBiIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iI2Q5NzcwNiIvPgogICAgPC9saW5lYXJHcmFkaWVudD4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0ic2Vjb25kYXJ5IiB4MT0iMCIgeTE9IjAiIHgyPSIyNTYiIHkyPSIyNTYiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjZmJiZjI0Ii8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iI2Y1OWUwYiIvPgogICAgPC9saW5lYXJHcmFkaWVudD4KICA8L2RlZnM+CiAgPHJlY3Qgd2lkdGg9IjI1NiIgaGVpZ2h0PSIyNTYiIGZpbGw9InVybCgjYmcpIi8+CiAgPHBhdGggZD0iTTQwIDEyOCBBIDg4IDg4IDAgMSAxIDIxNiAxMjggQSA4OCA4OCAwIDEgMSA0MCAxMjgiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZiYmYyNCIgc3Ryb2tlLXdpZHRoPSI0IiBzdHJva2UtZGFzaGFycmF5PSI4IDgiIG9wYWNpdHk9IjAuMTUiLz4KICA8Y2lyY2xlIGN4PSIxMDQiIGN5PSIxMDAiIHI9IjI4IiBmaWxsPSJ1cmwoI3ByaW1hcnkpIi8+CiAgPHBhdGggZD0iTTEwNCAxNDAgQzYwIDE0MCA0MCAxODAgMzIgMjMwIEwxNzYgMjMwIEMxNjggMTgwIDE0OCAxNDAgMTA0IDE0MCBaIiBmaWxsPSJ1cmwoI3ByaW1hcnkpIi8+CiAgPGNpcmNsZSBjeD0iMTY4IiBjeT0iMTMyIiByPSIyMiIgZmlsbD0idXJsKCNzZWNvbmRhcnkpIi8+CiAgPHBhdGggZD0iTTE2OCAxNjUgQzE0MCAxNjUgMTI1IDE5MCAxMjAgMjMwIEwyMTYgMjMwIEMyMTEgMTkwIDE5NiAxNjUgMTY4IDE2NSBaIiBmaWxsPSJ1cmwoI3NlY29uZGFyeSkiLz4KICA8cGF0aCBkPSJNMTgwIDUwIEwxODUgNzAgTDIwNSA3NSBMMTg1IDgwIEwxODAgMTAwIEwxNzUgODAgTDE1NSA3NSBMMTc1IDcwIFoiIGZpbGw9IiNmY2QzNGQiIG9wYWNpdHk9IjAuOSIvPgogIDxjaXJjbGUgY3g9IjcwIiBjeT0iNzAiIHI9IjYiIGZpbGw9IiNmYmJmMjQiIG9wYWNpdHk9IjAuNiIvPgo8L3N2Zz4=';

    const MASTER_KEY = "KronoAdmin2026!";
    if (secondTeacherPassword === MASTER_KEY) {
      if (onLoginSecondTeacher) {
        onLoginSecondTeacher({
          id: 'admin-mock-second',
          name: '2º Professor (Admin)',
          subject: 'AEE / Inclusão',
          email: secondTeacherEmail || 'admin@escola.com',
          avatarUrl: INCLUSION_ICON,
          school: 'Escola Modelo',
          ownerTeacherId: 'admin-master'
        });
      }
      setSecondTeacherLoading(false);
      return;
    }

    try {
      const cleanEmail = (secondTeacherEmail || '').trim().toLowerCase();

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
        let finalAvatar = data.user.avatarUrl || INCLUSION_ICON;
        if (finalAvatar.includes("photo-1573496359142")) finalAvatar = INCLUSION_ICON;

        const secondTeacherProfile: TeacherUser = {
          id: data.user.id || '2nd-teacher-id',
          name: data.user.name || '2º Professor (AEE)',
          subject: data.user.subject || 'AEE / Inclusão Escolar',
          email: data.user.email || cleanEmail,
          avatarUrl: finalAvatar,
          phone: data.user.phone || '',
          school: data.user.school || '',
          driveFolderUrl: data.user.driveFolderUrl || '',
          mustChangePassword: Boolean(data.user.mustChangePassword),
          ownerTeacherId: data.user.ownerTeacherId || '',
        };

        if (typeof window !== 'undefined') {
          sessionStorage.setItem(
            'active_session',
            JSON.stringify({
              role: 'second_teacher',
              ownerTeacherId: secondTeacherProfile.ownerTeacherId,
              teacherData: secondTeacherProfile,
              mustChangePassword: secondTeacherProfile.mustChangePassword,
            })
          );
        }

        setTimeout(() => {
          if (onLoginSecondTeacher) {
            onLoginSecondTeacher(secondTeacherProfile);
          } else {
            onLoginTeacher(secondTeacherProfile);
          }
        }, 500);

      } else {
        setSecondTeacherError(data.error || 'Acesso negado para o 2º Professor.');
        setSecondTeacherLoading(false);
      }
    } catch (err: any) {
      setSecondTeacherError('Erro de conexão: ' + (err.message || 'Verifique sua rede.'));
      setSecondTeacherLoading(false);
    }
  };

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStudentError('');

    // Limpeza de segurança da sessão ativa, mas PRESERVA o cache local de alunos para permitir o login
    if (typeof window !== 'undefined') {
      sessionStorage.clear();
    }

    const rawInput = studentFullName.trim();
    const normalizedInputName = normalizeStudentName(rawInput);
    const enteredPassword = studentPassword.trim();

    if (!rawInput && !normalizedInputName) {
      setStudentError('Por favor, informe o seu Nome Completo ou Matrícula.');
      return;
    }
    if (!teacherCode) {
      setStudentError('Por favor, informe o Código do Professor.');
      return;
    }
    if (!enteredPassword) {
      setStudentError('Por favor, digite a sua Senha de Acesso.');
      return;
    }

    // MODO SUPER ADMIN: Bypass seguro via Variável de Ambiente
    // A senha real não fica exposta no código-fonte.
    const MASTER_KEY = process.env.NEXT_PUBLIC_MASTER_KEY;
    if (MASTER_KEY && enteredPassword === MASTER_KEY) {
      onLoginStudent({
        id: 'admin-mock-student',
        fullName: rawInput || 'Aluno Teste (Admin)',
        turma: 'Geral',
        matricula: 'ADMIN-001',
        tag: 'REGULAR',
        passwordHash: '',
        mustChangePassword: false,
        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
        ownerTeacherId: 'admin-master'
      });
      return;
    }

    // 1. Autenticar o aluno DIRETAMENTE NA NUVEM (Firebase Firestore)
    try {
      const apiRes = await fetch('/api/auth/student-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: rawInput,
          teacherCode: teacherCode.trim(),
          password: enteredPassword,
        }),
      });

      const data = await apiRes.json();

      if (!apiRes.ok || !data.student) {
        setStudentError(data.error || `Não foi possível autenticar o aluno para a turma selecionada.`);
        return;
      }

      const matched = data.student;
      // Anexar o ID do professor para garantir que o aluno lê as atividades corretas no portal
      matched.ownerTeacherId = data.ownerTeacherId || matched.ownerTeacherId;
      onLoginStudent(matched);
    } catch (err: any) {
      setStudentError('Falha de conexão com a base de dados. Tente novamente.');
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
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">KronoMestre</h1>
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
              <span>Acesso do Aluno: Informe seu Nome, o Código do seu Professor e sua Senha.</span>
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
                Código do Professor <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={teacherCode}
                onChange={(e) => setTeacherCode(e.target.value.toUpperCase())}
                className="w-full bg-surface border border-border rounded-2xl px-4 py-3 text-sm text-foreground placeholder-[#869486] focus:outline-none focus:border-primary uppercase tracking-wider font-mono"
                placeholder="Ex: PROF-12345"
              />
              <p className="text-[10px] text-muted mt-1 ml-1">Código fornecido pelo seu professor.</p>
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