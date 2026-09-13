'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  HeartHandshake,
  Users,
  BookOpen,
  FolderOpen,
  MessageSquare,
  Settings,
  LogOut,
  Search,
  CheckCircle2,
  Clock,
  FileText,
  Eye,
  AlertCircle,
  Calendar,
  Lock,
  Sparkles,
  Award,
  ShieldCheck,
  UserCheck,
  Building2,
  RefreshCw,
  FileSpreadsheet
} from 'lucide-react';
import { TeacherUser, StudentUser, Activity, LibraryFile, ChatMessage, AtestadoRadRecord } from '@/lib/types';
import { formatAvatarUrl } from '@/lib/utils';
import { getTurmaLabel } from '@/lib/studentUtils';
import { supabase } from '@/lib/supabase';
import { StudentSupervisionModal } from '@/components/modals/StudentSupervisionModal';
import { LibraryView } from '@/components/views/LibraryView';
import { MessagesView } from '@/components/views/MessagesView';

interface SecondTeacherPortalViewProps {
  teacher: TeacherUser;
  allStudents: StudentUser[];
  activities: Activity[];
  libraryFiles?: LibraryFile[];
  messages?: ChatMessage[];
  onLogout: () => void;
  onSendMessage?: (msg: {
    threadId: string;
    senderId: string;
    senderRole: 'teacher' | 'student';
    text: string;
    attachmentUrl?: string;
    attachmentType?: 'image' | 'video' | 'audio' | 'document';
    recipientId?: string;
  }) => void;
  onMarkThreadAsRead?: (threadId: string, role: 'teacher' | 'student') => void;
}

export const SecondTeacherPortalView: React.FC<SecondTeacherPortalViewProps> = ({
  teacher,
  allStudents,
  activities,
  libraryFiles = [],
  messages = [],
  onLogout,
  onSendMessage,
  onMarkThreadAsRead,
}) => {
  // Navigation Tab: 'desempenho' | 'alunos' | 'atestados' | 'biblioteca' | 'mensagens' | 'configuracoes'
  const [activeTab, setActiveTab] = useState<'desempenho' | 'alunos' | 'atestados' | 'biblioteca' | 'mensagens' | 'configuracoes'>('desempenho');

  // Modal for Viewing Full Student Dossier (Read-Only)
  const [selectedStudentForDossier, setSelectedStudentForDossier] = useState<StudentUser | null>(null);

  // Filter and Search states
  const [rosterSearch, setRosterSearch] = useState('');
  const [rosterTurmaFilter, setRosterTurmaFilter] = useState('all');
  const [rosterTagFilter, setRosterTagFilter] = useState<'all' | 'tutelados' | 'pne' | 'regular'>('all');

  const [atestadosSearch, setAtestadosSearch] = useState('');
  const [atestadosTurmaFilter, setAtestadosTurmaFilter] = useState('all');
  const [atestadosTipoFilter, setAtestadosTipoFilter] = useState<'all' | 'Atestado' | 'RAD'>('all');

  // Tutored student delivery filter
  const [deliveryFilterStudent, setDeliveryFilterStudent] = useState<string>('all');

  // Atestados records from DB / Local
  const [atestados, setAtestados] = useState<AtestadoRadRecord[]>([]);
  const [isLoadingAtestados, setIsLoadingAtestados] = useState(true);

  // Settings tab form state
  const [profilePhone, setProfilePhone] = useState(teacher.phone || '');
  const [profileSchool, setProfileSchool] = useState(teacher.school || "EEB Prof. Jandira D'Ávila");
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [settingsMsg, setSettingsMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // 1. Determine Tutored Students (strictly PNE students bound to this 2nd teacher)
  const tutoredStudents = useMemo(() => {
    const tId = teacher.id?.toString().trim().toLowerCase();
    const tName = teacher.name?.trim().toLowerCase();
    const tEmail = teacher.email?.trim().toLowerCase();

    return allStudents.filter((s) => {
      const stId = s.secondTeacherId?.toString().trim().toLowerCase();
      const stName = s.secondTeacherName?.trim().toLowerCase();

      const matchId = Boolean(stId && tId && stId === tId);
      const matchEmail = Boolean(stId && tEmail && stId === tEmail);
      const matchName = Boolean(
        stName &&
          ((tName && (stName === tName || stName.includes(tName) || tName.includes(stName))) ||
            (tEmail && stName === tEmail))
      );

      return matchId || matchEmail || matchName;
    });
  }, [teacher, allStudents]);

  // 2. Derive distinct turmas from tutored students
  const derivedTurmas = useMemo(() => {
    const set = new Set<string>();
    tutoredStudents.forEach((s) => {
      if (s.turma && s.turma.trim()) {
        set.add(s.turma.trim());
      }
    });
    return Array.from(set).sort();
  }, [tutoredStudents]);

  // 3. Class Roster: ALL students belonging to the derived turmas
  const classRoster = useMemo(() => {
    if (derivedTurmas.length === 0) return [];
    return allStudents.filter((s) => s.turma && derivedTurmas.includes(s.turma.trim()));
  }, [allStudents, derivedTurmas]);

  // Set of tutored IDs for quick lookup
  const tutoredStudentIds = useMemo(() => new Set(tutoredStudents.map((s) => s.id)), [tutoredStudents]);

  // Load atestados for the derived turmas
  useEffect(() => {
    let isSubscribed = true;

    async function loadAtestados() {
      setIsLoadingAtestados(true);
      let loaded: AtestadoRadRecord[] = [];

      // Local storage fallback
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem('atestados_rad_records') || localStorage.getItem('local_atestados_rad_data');
          if (raw) {
            loaded = JSON.parse(raw);
          }
        } catch (e) {
          console.warn('Erro ao ler cache local de atestados:', e);
        }
      }

      // Supabase fetch
      try {
        if (supabase) {
          const { data, error } = await supabase
            .from('atestados_rad')
            .select('*')
            .order('created_at', { ascending: false });

          if (!error && data) {
            const dbRecords: AtestadoRadRecord[] = data.map((item: any) => ({
              id: item.id,
              studentId: item.student_id,
              studentName: item.student_name,
              studentTurma: item.student_turma,
              dataFalta: item.data_falta,
              dataAtestado: item.data_atestado,
              diasAtestado: Number(item.dias_atestado) || 1,
              dataFinal: item.data_final,
              motivo: item.motivo || undefined,
              tipo: item.tipo as 'Atestado' | 'RAD',
              createdAt: item.created_at,
            }));
            loaded = dbRecords;
          }
        }
      } catch (err) {
        console.warn('Erro ao buscar atestados no Supabase:', err);
      }

      // Filter atestados belonging to the derived turmas
      if (derivedTurmas.length === 0) {
        if (isSubscribed) {
          setAtestados([]);
          setIsLoadingAtestados(false);
        }
        return;
      }

      const rosterIds = new Set(classRoster.map((s) => s.id));
      const rosterMatriculas = new Set(classRoster.map((s) => s.matricula));
      const rosterNames = new Set(classRoster.map((s) => s.fullName.toLowerCase().trim()));

      const filtered = loaded.filter(
        (rec) =>
          (rec.studentTurma && derivedTurmas.includes(rec.studentTurma)) ||
          rosterIds.has(rec.studentId) ||
          rosterMatriculas.has(rec.studentId) ||
          rosterNames.has(rec.studentName?.toLowerCase().trim())
      );

      if (isSubscribed) {
        setAtestados(filtered);
        setIsLoadingAtestados(false);
      }
    }

    loadAtestados();

    return () => {
      isSubscribed = false;
    };
  }, [derivedTurmas, classRoster]);

  // Compute activities deliveries & performance strictly for TUTORED students
  const tutoredDeliveries = useMemo(() => {
    const list: Array<{
      activityId: string;
      activityTitle: string;
      turma: string;
      isAdapted?: boolean;
      studentId: string;
      studentName: string;
      studentTurma: string;
      status: 'submitted' | 'graded' | 'returned' | 'pending';
      submittedAt?: string;
      totalGrade?: number;
      maxGrade?: number;
      teacherFeedback?: string;
    }> = [];

    tutoredStudents.forEach((student) => {
      activities.forEach((act) => {
        const matchesTurma = act.turma === student.turma || act.turma === 'Todas';
        const isIncludedPne = act.includedPneStudentIds && act.includedPneStudentIds.includes(student.id);

        if (matchesTurma || isIncludedPne) {
          const submission = (act.submissions || []).find(
            (sub) => sub.studentId === student.id || sub.matricula === student.matricula
          );

          if (submission) {
            const hasGrade = submission.essayScore !== undefined || (submission.objectiveScore || 0) > 0;
            const objScore = submission.objectiveScore || 0;
            const essayScore = submission.essayScore || 0;
            const total = objScore + essayScore;

            list.push({
              activityId: act.id,
              activityTitle: act.title,
              turma: act.turma,
              isAdapted: Boolean(act.isAdapted || act.adaptationType),
              studentId: student.id,
              studentName: student.fullName,
              studentTurma: student.turma,
              status: hasGrade ? 'graded' : 'submitted',
              submittedAt: submission.submittedAt,
              totalGrade: hasGrade ? total : undefined,
              maxGrade: (act.maxObjectiveScore || 0) + (act.maxEssayScore || 0) || 10,
              teacherFeedback: submission.teacherFeedback || submission.feedback,
            });
          }
        }
      });
    });

    return list;
  }, [tutoredStudents, activities]);

  // Tutored Performance Metrics
  const tutoredMetrics = useMemo(() => {
    const totalTutelados = tutoredStudents.length;
    const totalEntregas = tutoredDeliveries.length;
    const aguardandoCorrecao = tutoredDeliveries.filter((d) => d.status === 'submitted').length;
    const graded = tutoredDeliveries.filter((d) => d.totalGrade !== undefined);
    const mediaGeral =
      graded.length > 0
        ? (graded.reduce((acc, curr) => acc + (curr.totalGrade || 0), 0) / graded.length).toFixed(1)
        : '—';

    return {
      totalTutelados,
      totalEntregas,
      aguardandoCorrecao,
      mediaGeral,
    };
  }, [tutoredStudents, tutoredDeliveries]);

  // Filtered Class Roster for the 'alunos' tab
  const filteredClassRoster = useMemo(() => {
    return classRoster.filter((s) => {
      const matchesSearch =
        s.fullName.toLowerCase().includes(rosterSearch.toLowerCase()) ||
        (s.matricula && s.matricula.includes(rosterSearch));

      const matchesTurma = rosterTurmaFilter === 'all' || s.turma === rosterTurmaFilter;

      let matchesTag = true;
      const isTutored = tutoredStudentIds.has(s.id);
      const isPne = Boolean(s.tag && s.tag.toUpperCase().includes('PNE'));

      if (rosterTagFilter === 'tutelados') {
        matchesTag = isTutored;
      } else if (rosterTagFilter === 'pne') {
        matchesTag = isPne;
      } else if (rosterTagFilter === 'regular') {
        matchesTag = !isTutored && !isPne;
      }

      return matchesSearch && matchesTurma && matchesTag;
    });
  }, [classRoster, rosterSearch, rosterTurmaFilter, rosterTagFilter, tutoredStudentIds]);

  // Filtered Atestados for the 'atestados' tab
  const filteredAtestados = useMemo(() => {
    return atestados.filter((rec) => {
      const matchesSearch =
        rec.studentName.toLowerCase().includes(atestadosSearch.toLowerCase()) ||
        (rec.motivo && rec.motivo.toLowerCase().includes(atestadosSearch.toLowerCase()));

      const matchesTurma = atestadosTurmaFilter === 'all' || rec.studentTurma === atestadosTurmaFilter;

      const matchesTipo = atestadosTipoFilter === 'all' || rec.tipo === atestadosTipoFilter;

      return matchesSearch && matchesTurma && matchesTipo;
    });
  }, [atestados, atestadosSearch, atestadosTurmaFilter, atestadosTipoFilter]);

  // Save Settings handler
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsMsg(null);
    setIsSavingSettings(true);

    try {
      if (newPassword && newPassword.length < 4) {
        setSettingsMsg({ type: 'error', text: 'A nova senha deve ter no mínimo 4 caracteres.' });
        setIsSavingSettings(false);
        return;
      }

      if (newPassword && newPassword !== confirmPassword) {
        setSettingsMsg({ type: 'error', text: 'A confirmação de senha não confere.' });
        setIsSavingSettings(false);
        return;
      }

      const updates: any = {
        phone: profilePhone,
        school: profileSchool,
      };

      if (newPassword) {
        updates.password = newPassword;
      }

      if (supabase && teacher.email) {
        const cleanEmail = teacher.email.trim().toLowerCase();
        await supabase
          .from('second_teachers')
          .update(updates)
          .ilike('email', cleanEmail);

        await supabase
          .from('teachers')
          .update(updates)
          .ilike('email', cleanEmail);
      }

      // Update active session
      if (typeof window !== 'undefined') {
        const activeSession = sessionStorage.getItem('active_session');
        if (activeSession) {
          try {
            const parsed = JSON.parse(activeSession);
            parsed.teacherData = {
              ...parsed.teacherData,
              phone: profilePhone,
              school: profileSchool,
            };
            sessionStorage.setItem('active_session', JSON.stringify(parsed));
          } catch (err) {}
        }
      }

      setSettingsMsg({ type: 'success', text: 'Configurações atualizadas com sucesso!' });
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSettingsMsg(null), 4000);
    } catch (err: any) {
      setSettingsMsg({ type: 'error', text: 'Erro ao salvar alterações: ' + (err?.message || 'Tente novamente.') });
    } finally {
      setIsSavingSettings(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Header Dedicated to Second Teacher */}
      <header className="border-b border-border bg-surface/95 backdrop-blur sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Teacher Identity */}
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative shrink-0">
              <img
                src={formatAvatarUrl(teacher.avatarUrl || '')}
                alt={teacher.name}
                className="w-12 h-12 rounded-2xl object-cover border-2 border-primary/40 shadow-sm"
              />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-primary rounded-full border-2 border-surface flex items-center justify-center">
                <HeartHandshake className="w-2.5 h-2.5 text-white" />
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Portal do 2º Professor • Apoio à Inclusão
                </span>
                <span className="text-xs text-muted font-medium">{teacher.school || "EEB Prof. Jandira D'Ávila"}</span>
              </div>
              <h1 className="text-lg sm:text-xl font-extrabold text-foreground truncate mt-0.5">
                {teacher.name}
              </h1>
              <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-xs text-muted">
                <span>{teacher.subject || 'Segundo Professor (Educação Especial)'}</span>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-foreground">Turmas Atendidas:</span>
                  {derivedTurmas.length > 0 ? (
                    <div className="inline-flex flex-wrap gap-1">
                      {derivedTurmas.map((t) => (
                        <span
                          key={t}
                          className="bg-primary/15 text-primary text-[11px] font-bold px-2 py-0.5 rounded-md border border-primary/25"
                        >
                          {getTurmaLabel(t)}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[11px] italic text-amber-500 font-medium">Aguardando vínculo de tutelados</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2.5 self-end md:self-center shrink-0">
            <button
              onClick={onLogout}
              className="py-2 px-4 rounded-xl text-xs font-bold bg-surface hover:bg-rose-500/10 text-rose-500 hover:text-rose-400 border border-border hover:border-rose-500/30 flex items-center gap-2 transition-all cursor-pointer shadow-sm"
              title="Encerrar sessão"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Sair da Conta</span>
            </button>
          </div>
        </div>

        {/* Dedicated Navigation Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <nav className="flex items-center gap-1 overflow-x-auto py-1 border-t border-border scrollbar-none">
            <button
              onClick={() => setActiveTab('desempenho')}
              className={`py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                activeTab === 'desempenho'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted hover:text-foreground hover:bg-surface-hover'
              }`}
            >
              <HeartHandshake className="w-4 h-4 shrink-0" />
              <span>Acompanhamento PNE</span>
              {tutoredStudents.length > 0 && (
                <span
                  className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
                    activeTab === 'desempenho' ? 'bg-black/20 text-white' : 'bg-primary/20 text-primary'
                  }`}
                >
                  {tutoredStudents.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('alunos')}
              className={`py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                activeTab === 'alunos'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted hover:text-foreground hover:bg-surface-hover'
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span>Alunos da Turma</span>
              {classRoster.length > 0 && (
                <span
                  className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
                    activeTab === 'alunos' ? 'bg-black/20 text-white' : 'bg-surface text-muted border border-border'
                  }`}
                >
                  {classRoster.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('atestados')}
              className={`py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                activeTab === 'atestados'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted hover:text-foreground hover:bg-surface-hover'
              }`}
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              <span>Atestados e RAD</span>
              {atestados.length > 0 && (
                <span
                  className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
                    activeTab === 'atestados' ? 'bg-black/20 text-white' : 'bg-surface text-muted border border-border'
                  }`}
                >
                  {atestados.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('biblioteca')}
              className={`py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                activeTab === 'biblioteca'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted hover:text-foreground hover:bg-surface-hover'
              }`}
            >
              <FolderOpen className="w-4 h-4 shrink-0" />
              <span>Biblioteca de Arquivos</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('mensagens');
                if (onMarkThreadAsRead && teacher.id) {
                  onMarkThreadAsRead(teacher.id, 'teacher');
                }
              }}
              className={`py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                activeTab === 'mensagens'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted hover:text-foreground hover:bg-surface-hover'
              }`}
            >
              <MessageSquare className="w-4 h-4 shrink-0" />
              <span>Mensagens</span>
            </button>

            <button
              onClick={() => setActiveTab('configuracoes')}
              className={`py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                activeTab === 'configuracoes'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted hover:text-foreground hover:bg-surface-hover'
              }`}
            >
              <Settings className="w-4 h-4 shrink-0" />
              <span>Minha Conta</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {/* Notice of Empty Tutored Students state if applicable */}
        {tutoredStudents.length === 0 && (
          <div className="p-6 mb-6 rounded-3xl bg-surface border border-border shadow-sm flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
            <div className="p-4 rounded-2xl bg-amber-500/15 text-amber-500 shrink-0">
              <HeartHandshake className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h2 className="text-base font-bold text-foreground">Nenhum aluno vinculado à sua tutela ainda</h2>
              <p className="text-xs text-muted mt-1 leading-relaxed">
                Você está autenticado no Portal do 2º Professor. Assim que o Professor Titular vincular os estudantes PNE ao seu cadastro, as turmas correspondentes, o roster completo dos alunos da turma e os indicadores de acompanhamento pedagógico carregarão aqui automaticamente.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 justify-center sm:justify-start">
                <button
                  onClick={() => setActiveTab('biblioteca')}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-surface border border-border text-foreground hover:bg-surface-hover transition-all"
                >
                  Explorar Biblioteca de Arquivos
                </button>
                <button
                  onClick={() => setActiveTab('mensagens')}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-surface border border-border text-foreground hover:bg-surface-hover transition-all"
                >
                  Falar com o Professor Titular
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: DESEMPENHO & ACOMPANHAMENTO PNE (STRICTLY TUTORED) */}
        {activeTab === 'desempenho' && (
          <div className="space-y-6">
            {/* Top Cards with Summary Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="p-4 rounded-2xl bg-surface border border-border shadow-sm">
                <div className="flex items-center justify-between text-muted text-xs font-semibold">
                  <span>Alunos Tutelados</span>
                  <HeartHandshake className="w-4 h-4 text-primary" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-foreground mt-2">
                  {tutoredMetrics.totalTutelados}
                </div>
                <div className="text-[11px] text-muted mt-1">Estudantes PNE vinculados</div>
              </div>

              <div className="p-4 rounded-2xl bg-surface border border-border shadow-sm">
                <div className="flex items-center justify-between text-muted text-xs font-semibold">
                  <span>Atividades Entregues</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-foreground mt-2">
                  {tutoredMetrics.totalEntregas}
                </div>
                <div className="text-[11px] text-muted mt-1">Envios pelos tutelados</div>
              </div>

              <div className="p-4 rounded-2xl bg-surface border border-border shadow-sm">
                <div className="flex items-center justify-between text-muted text-xs font-semibold">
                  <span>Aguardando Correção</span>
                  <Clock className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-foreground mt-2">
                  {tutoredMetrics.aguardandoCorrecao}
                </div>
                <div className="text-[11px] text-muted mt-1">Pendentes de nota do titular</div>
              </div>

              <div className="p-4 rounded-2xl bg-surface border border-border shadow-sm">
                <div className="flex items-center justify-between text-muted text-xs font-semibold">
                  <span>Média dos Tutelados</span>
                  <Award className="w-4 h-4 text-primary" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-foreground mt-2">
                  {tutoredMetrics.mediaGeral}
                </div>
                <div className="text-[11px] text-muted mt-1">Notas lançadas pelo titular</div>
              </div>
            </div>

            {/* Tutored Students Grid */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <HeartHandshake className="w-5 h-5 text-primary" />
                    <span>Seus Alunos Tutelados (Educação Especial)</span>
                  </h2>
                  <p className="text-xs text-muted">
                    Estudantes sob sua tutoria pedagógica e adaptação curricular. Clique em &quot;Ver Ficha Completa&quot; para dossiê e pareceres.
                  </p>
                </div>
              </div>

              {tutoredStudents.length === 0 ? (
                <div className="p-8 text-center bg-surface rounded-2xl border border-border">
                  <p className="text-sm font-semibold text-muted">Nenhum aluno tutelado no momento.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tutoredStudents.map((student) => (
                    <div
                      key={student.id}
                      className="p-5 rounded-2xl bg-surface border border-border shadow-sm hover:border-primary/40 transition-all flex flex-col justify-between"
                    >
                      <div className="flex items-start gap-3.5">
                        <img
                          src={formatAvatarUrl(student.avatarUrl || '')}
                          alt={student.fullName}
                          loading="lazy"
                          decoding="async"
                          className="w-14 h-14 rounded-2xl object-cover border-2 border-primary/30 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                              {getTurmaLabel(student.turma)}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                              Tutelado
                            </span>
                          </div>
                          <h3 className="text-sm font-extrabold text-foreground truncate mt-1">
                            {student.fullName}
                          </h3>
                          <div className="text-[11px] text-muted mt-0.5">
                            Matrícula: <span className="font-semibold text-foreground">{student.matricula}</span>
                          </div>
                          {student.pneCondition && (
                            <div className="text-[11px] text-primary font-bold mt-1 bg-primary/10 px-2 py-0.5 rounded-md inline-block">
                              {student.pneCondition}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-border flex items-center justify-between gap-2">
                        <div className="text-[11px] text-muted">
                          {student.phoneResponsible ? (
                            <span>Resp: {student.phoneResponsible}</span>
                          ) : (
                            <span>Apoio Pedagógico Ativo</span>
                          )}
                        </div>

                        <button
                          onClick={() => setSelectedStudentForDossier(student)}
                          className="py-1.5 px-3 rounded-xl text-xs font-bold bg-primary/15 hover:bg-primary text-primary hover:text-white border border-primary/30 transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ver Ficha Completa</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tutored Deliveries & Pedagogical Tracking Table */}
            <div className="p-5 rounded-2xl bg-surface border border-border shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <span>Desempenho e Entregas dos Tutelados (Somente Leitura)</span>
                  </h3>
                  <p className="text-[11px] text-muted mt-0.5">
                    Histórico de atividades enviadas, notas lançadas e pareceres pedagógicos emitidos pelo Professor Titular.
                  </p>
                </div>

                {tutoredStudents.length > 1 && (
                  <select
                    value={deliveryFilterStudent}
                    onChange={(e) => setDeliveryFilterStudent(e.target.value)}
                    className="py-1.5 px-3 rounded-xl text-xs font-bold bg-background border border-border text-foreground cursor-pointer"
                  >
                    <option value="all">Todos os Tutelados</option>
                    {tutoredStudents.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.fullName}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {tutoredDeliveries.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted">
                  Nenhuma atividade entregue pelos alunos tutelados até o momento.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border text-muted font-bold">
                        <th className="pb-2.5">Aluno Tutelado</th>
                        <th className="pb-2.5">Atividade</th>
                        <th className="pb-2.5">Turma</th>
                        <th className="pb-2.5">Status</th>
                        <th className="pb-2.5">Nota Titular</th>
                        <th className="pb-2.5">Feedback / Parecer</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {tutoredDeliveries
                        .filter((d) => deliveryFilterStudent === 'all' || d.studentId === deliveryFilterStudent)
                        .map((delivery, idx) => (
                          <tr key={`${delivery.activityId}-${delivery.studentId}-${idx}`} className="hover:bg-surface-hover/50">
                            <td className="py-3 font-semibold text-foreground">{delivery.studentName}</td>
                            <td className="py-3">
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium text-foreground">{delivery.activityTitle}</span>
                                {delivery.isAdapted && (
                                  <span className="bg-primary/20 text-primary text-[9px] font-extrabold px-1.5 py-0.5 rounded">
                                    PNE
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 text-muted">{getTurmaLabel(delivery.turma)}</td>
                            <td className="py-3">
                              {delivery.status === 'graded' ? (
                                <span className="inline-flex items-center gap-1 text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full text-[10px]">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Avaliado
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-amber-500 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full text-[10px]">
                                  <Clock className="w-3 h-3" />
                                  Aguardando Correção
                                </span>
                              )}
                            </td>
                            <td className="py-3 font-extrabold text-foreground">
                              {delivery.totalGrade !== undefined ? `${delivery.totalGrade} / ${delivery.maxGrade}` : '—'}
                            </td>
                            <td className="py-3 text-muted max-w-xs truncate" title={delivery.teacherFeedback || 'Sem parecer registrado'}>
                              {delivery.teacherFeedback || <span className="italic text-muted/60">—</span>}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: ROSTER DE ALUNOS (TODOS OS ALUNOS DAS TURMAS DERIVADAS) */}
        {activeTab === 'alunos' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold text-primary tracking-widest uppercase">
                  Roster Completo • Turmas sob sua Atuação
                </span>
                <h2 className="text-2xl font-extrabold text-foreground mt-0.5">
                  Alunos da Turma ({classRoster.length})
                </h2>
                <p className="text-xs text-muted mt-1">
                  Exibição de todos os estudantes das turmas em que você possui alunos tutelados. Somente consulta de fichas e dados cadastrais.
                </p>
              </div>
            </div>

            {/* Filters Bar */}
            <div className="p-4 rounded-2xl bg-surface border border-border shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  placeholder="Buscar por nome do aluno ou matrícula..."
                  value={rosterSearch}
                  onChange={(e) => setRosterSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={rosterTurmaFilter}
                  onChange={(e) => setRosterTurmaFilter(e.target.value)}
                  className="py-2 px-3 rounded-xl bg-background border border-border text-xs font-semibold text-foreground cursor-pointer"
                >
                  <option value="all">Todas as Minhas Turmas</option>
                  {derivedTurmas.map((t) => (
                    <option key={t} value={t}>
                      {getTurmaLabel(t)}
                    </option>
                  ))}
                </select>

                <select
                  value={rosterTagFilter}
                  onChange={(e) => setRosterTagFilter(e.target.value as any)}
                  className="py-2 px-3 rounded-xl bg-background border border-border text-xs font-semibold text-foreground cursor-pointer"
                >
                  <option value="all">Todos os Alunos</option>
                  <option value="tutelados">⭐ Meus Tutelados PNE</option>
                  <option value="pne">PNE Geral</option>
                  <option value="regular">Alunos Regulares</option>
                </select>
              </div>
            </div>

            {/* Roster Grid */}
            {filteredClassRoster.length === 0 ? (
              <div className="p-12 text-center bg-surface rounded-2xl border border-border">
                <Users className="w-10 h-10 text-muted mx-auto mb-2" />
                <h3 className="text-sm font-bold text-foreground">Nenhum aluno encontrado</h3>
                <p className="text-xs text-muted mt-1">
                  Ajuste os filtros de busca ou aguarde o vínculo de turmas pelo professor titular.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filteredClassRoster.map((student) => {
                  const isTutored = tutoredStudentIds.has(student.id);

                  return (
                    <div
                      key={student.id}
                      className={`p-4 rounded-2xl bg-surface border transition-all flex flex-col justify-between ${
                        isTutored
                          ? 'border-primary/40 bg-primary/5 shadow-sm'
                          : 'border-border hover:border-border/80'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <img
                          src={formatAvatarUrl(student.avatarUrl || '')}
                          alt={student.fullName}
                          loading="lazy"
                          decoding="async"
                          className="w-12 h-12 rounded-xl object-cover border border-border shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-bold text-foreground bg-background px-2 py-0.5 rounded-md border border-border">
                              {getTurmaLabel(student.turma)}
                            </span>
                            {isTutored ? (
                              <span className="text-[10px] font-extrabold text-primary bg-primary/20 px-2 py-0.5 rounded-full border border-primary/30 flex items-center gap-1">
                                <HeartHandshake className="w-3 h-3" />
                                Seu Tutelado
                              </span>
                            ) : student.tag ? (
                              <span className="text-[10px] font-bold text-muted bg-surface-hover px-1.5 py-0.5 rounded-md">
                                {student.tag}
                              </span>
                            ) : null}
                          </div>

                          <h4 className="text-sm font-bold text-foreground truncate mt-1">
                            {student.fullName}
                          </h4>
                          <div className="text-[11px] text-muted">Matrícula: {student.matricula}</div>
                        </div>
                      </div>

                      <div className="mt-3.5 pt-2.5 border-t border-border flex items-center justify-between">
                        <span className="text-[10px] text-muted">Somente Consulta</span>
                        <button
                          onClick={() => setSelectedStudentForDossier(student)}
                          className="py-1 px-3 rounded-lg text-xs font-bold bg-surface hover:bg-surface-hover text-foreground border border-border flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Eye className="w-3 h-3 text-muted" />
                          <span>Ver Ficha</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ATESTADOS & RAD (TURMAS DERIVADAS) */}
        {activeTab === 'atestados' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold text-primary tracking-widest uppercase">
                  Registros Médicos & Licenças • Turmas Atendidas
                </span>
                <h2 className="text-2xl font-extrabold text-foreground mt-0.5">
                  Atestados e RAD ({atestados.length})
                </h2>
                <p className="text-xs text-muted mt-1">
                  Visualização somente leitura de atestados e relatórios dos alunos das turmas em que você atua.
                </p>
              </div>
            </div>

            {/* Filters Bar */}
            <div className="p-4 rounded-2xl bg-surface border border-border shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  placeholder="Buscar por aluno ou CID/motivo..."
                  value={atestadosSearch}
                  onChange={(e) => setAtestadosSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={atestadosTurmaFilter}
                  onChange={(e) => setAtestadosTurmaFilter(e.target.value)}
                  className="py-2 px-3 rounded-xl bg-background border border-border text-xs font-semibold text-foreground cursor-pointer"
                >
                  <option value="all">Todas as Minhas Turmas</option>
                  {derivedTurmas.map((t) => (
                    <option key={t} value={t}>
                      {getTurmaLabel(t)}
                    </option>
                  ))}
                </select>

                <select
                  value={atestadosTipoFilter}
                  onChange={(e) => setAtestadosTipoFilter(e.target.value as any)}
                  className="py-2 px-3 rounded-xl bg-background border border-border text-xs font-semibold text-foreground cursor-pointer"
                >
                  <option value="all">Todos os Tipos</option>
                  <option value="Atestado">Atestado Médico</option>
                  <option value="RAD">RAD (15+ dias)</option>
                </select>
              </div>
            </div>

            {/* Atestados Table */}
            <div className="p-5 rounded-2xl bg-surface border border-border shadow-sm">
              {isLoadingAtestados ? (
                <div className="py-12 text-center text-xs text-muted flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                  <span>Carregando registros médicos...</span>
                </div>
              ) : filteredAtestados.length === 0 ? (
                <div className="py-12 text-center">
                  <BookOpen className="w-10 h-10 text-muted mx-auto mb-2" />
                  <h3 className="text-sm font-bold text-foreground">Nenhum atestado registrado</h3>
                  <p className="text-xs text-muted mt-1">
                    Não há registros de atestados ou RAD para os estudantes das suas turmas atendidas.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border text-muted font-bold">
                        <th className="pb-3">Aluno</th>
                        <th className="pb-3">Turma</th>
                        <th className="pb-3">Tipo</th>
                        <th className="pb-3">Data Falta</th>
                        <th className="pb-3">Período</th>
                        <th className="pb-3">Dias</th>
                        <th className="pb-3">Motivo / CID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredAtestados.map((item) => {
                        const isTutored = tutoredStudents.some(
                          (t) =>
                            t.id === item.studentId ||
                            t.matricula === item.studentId ||
                            t.fullName.toLowerCase() === item.studentName.toLowerCase()
                        );

                        return (
                          <tr key={item.id} className="hover:bg-surface-hover/50">
                            <td className="py-3">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-foreground">{item.studentName}</span>
                                {isTutored && (
                                  <span className="text-[9px] font-extrabold text-primary bg-primary/20 px-1.5 py-0.5 rounded">
                                    Tutelado
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 text-muted">{getTurmaLabel(item.studentTurma)}</td>
                            <td className="py-3">
                              <span
                                className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                  item.tipo === 'RAD'
                                    ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                                    : 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
                                }`}
                              >
                                {item.tipo}
                              </span>
                            </td>
                            <td className="py-3 text-muted">{item.dataFalta || '—'}</td>
                            <td className="py-3 text-foreground font-medium">
                              {item.dataAtestado} {item.dataFinal ? `até ${item.dataFinal}` : ''}
                            </td>
                            <td className="py-3 text-muted">{item.diasAtestado} dia(s)</td>
                            <td className="py-3 text-muted max-w-xs truncate" title={item.motivo || 'Não informado'}>
                              {item.motivo || '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: BIBLIOTECA DE ARQUIVOS (SOMENTE LEITURA) */}
        {activeTab === 'biblioteca' && (
          <div className="space-y-4">
            <div className="p-3 bg-surface rounded-xl border border-border text-xs text-muted flex items-center gap-2">
              <Lock className="w-4 h-4 text-primary shrink-0" />
              <span>
                Você possui acesso completo de visualização e download dos materiais pedagógicos na Biblioteca de Arquivos.
              </span>
            </div>

            <LibraryView
              files={libraryFiles}
              isReadOnly={true}
              onAddFile={() => {}}
              onDeleteFile={() => {}}
            />
          </div>
        )}

        {/* TAB 5: MENSAGENS */}
        {activeTab === 'mensagens' && (
          <div className="space-y-4">
            <MessagesView
              currentUserRole="teacher"
              teacher={teacher}
              students={allStudents}
              activities={activities}
              messages={messages}
              onSendMessage={onSendMessage}
              onMarkThreadAsRead={onMarkThreadAsRead}
            />
          </div>
        )}

        {/* TAB 6: CONFIGURAÇÕES DA CONTA (SEM CONTROLES DE PERMISSÕES) */}
        {activeTab === 'configuracoes' && (
          <div className="max-w-xl mx-auto p-6 sm:p-8 bg-surface rounded-3xl border border-border shadow-sm space-y-6">
            <div>
              <h2 className="text-xl font-bold text-foreground">Minha Conta de 2º Professor</h2>
              <p className="text-xs text-muted mt-1">
                Atualize seus dados de contato e credenciais de acesso ao portal.
              </p>
            </div>

            {settingsMsg && (
              <div
                className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2.5 ${
                  settingsMsg.type === 'success'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                }`}
              >
                {settingsMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <span>{settingsMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Nome Completo</label>
                <input
                  type="text"
                  value={teacher.name}
                  disabled
                  className="w-full px-3.5 py-2.5 rounded-xl bg-background/50 border border-border text-xs text-muted cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">E-mail Institucional</label>
                <input
                  type="email"
                  value={teacher.email}
                  disabled
                  className="w-full px-3.5 py-2.5 rounded-xl bg-background/50 border border-border text-xs text-muted cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Escola / Lotação</label>
                <input
                  type="text"
                  value={profileSchool}
                  onChange={(e) => setProfileSchool(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Telefone / WhatsApp</label>
                <input
                  type="tel"
                  placeholder="(00) 00000-0000"
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div className="pt-4 border-t border-border space-y-3">
                <h3 className="text-xs font-bold text-foreground">Alteração de Senha</h3>
                <div>
                  <label className="block text-[11px] text-muted mb-1">Nova Senha</label>
                  <input
                    type="password"
                    placeholder="Mínimo 4 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-muted mb-1">Confirmar Nova Senha</label>
                  <input
                    type="password"
                    placeholder="Confirme a nova senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSavingSettings}
                className="w-full py-3 px-4 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary/90 transition-all cursor-pointer shadow-md disabled:opacity-50 mt-4"
              >
                {isSavingSettings ? 'Salvando Alterações...' : 'Salvar Alterações'}
              </button>
            </form>
          </div>
        )}
      </main>

      {/* Student Dossier Modal (Read-Only) */}
      <StudentSupervisionModal
        isOpen={Boolean(selectedStudentForDossier)}
        onClose={() => setSelectedStudentForDossier(null)}
        student={selectedStudentForDossier}
        activities={activities}
      />
    </div>
  );
};
