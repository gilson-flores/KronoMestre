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
import { getScopedLocalStorageItem, setScopedLocalStorageItem } from '@/lib/cacheUtils';
import { StudentSupervisionModal } from '@/components/modals/StudentSupervisionModal';
import { LibraryView } from '@/components/views/LibraryView';
import { MessagesView } from '@/components/views/MessagesView';
import { Sidebar } from '@/components/Sidebar';
import { Menu } from 'lucide-react';

interface SecondTeacherPortalViewProps {
  teacher: TeacherUser;
  allStudents: StudentUser[];
  activities: Activity[];
  libraryFiles?: LibraryFile[];
  messages?: ChatMessage[];
  onLogout: () => void;
  onSendMessage: (msg: {
    threadId: string;
    senderId: string;
    senderName: string;
    senderRole: 'teacher' | 'student';
    senderAvatar?: string;
    recipientId: string;
    recipientName: string;
    content: string;
    activityId?: string;
    activityTitle?: string;
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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

  const filteredClassRoster = useMemo(() => {
    return classRoster.filter((s) => {
      const matchSearch = s.fullName.toLowerCase().includes(rosterSearch.toLowerCase());
      const matchTurma = rosterTurmaFilter === 'all' || s.turma === rosterTurmaFilter;
      const isPneStudent =
        s.tag === 'PNE' || Boolean(s.pneConditions && s.pneConditions.length > 0);

      let matchTag = true;
      if (rosterTagFilter === 'tutelados') {
        matchTag = tutoredStudentIds.has(s.id);
      } else if (rosterTagFilter === 'pne') {
        matchTag = isPneStudent;
      } else if (rosterTagFilter === 'regular') {
        matchTag = !isPneStudent;
      }

      return matchSearch && matchTurma && matchTag;
    });
  }, [classRoster, rosterSearch, rosterTurmaFilter, rosterTagFilter, tutoredStudentIds]);

  const tutoredMetrics = useMemo(() => {
    let totalEntregas = 0;
    let aguardandoCorrecao = 0;
    let somaNotas = 0;
    let qtdNotas = 0;

    activities.forEach((act) => {
      act.submissions?.forEach((sub) => {
        if (tutoredStudentIds.has(sub.studentId)) {
          totalEntregas++;
          const isGraded = sub.status === 'graded' || (sub.essayScore !== undefined && sub.essayScore !== null);
          if (!isGraded) {
            aguardandoCorrecao++;
          } else {
            const finalGrade =
              Number(sub.objectiveScore || 0) +
              Number(sub.essayScore || 0) +
              Number(sub.extraPoints || 0);
            somaNotas += finalGrade;
            qtdNotas++;
          }
        }
      });
    });

    const mediaGeral = qtdNotas > 0 ? (somaNotas / qtdNotas).toFixed(1) : '-';

    return {
      totalTutelados: tutoredStudents.length,
      totalEntregas,
      aguardandoCorrecao,
      mediaGeral,
    };
  }, [tutoredStudents, tutoredStudentIds, activities]);

  const tutoredDeliveries = useMemo(() => {
    const deliveries: Array<{
      activityId: string;
      studentId: string;
      studentName: string;
      activityTitle: string;
      isAdapted: boolean;
      turma: string;
      status: 'pending' | 'graded';
      totalGrade: number | undefined;
      maxGrade: number;
      teacherFeedback?: string;
    }> = [];

    activities.forEach((act) => {
      act.submissions?.forEach((sub) => {
        if (tutoredStudentIds.has(sub.studentId)) {
          const student = tutoredStudents.find((s) => s.id === sub.studentId);
          const isGraded = sub.status === 'graded' || (sub.essayScore !== undefined && sub.essayScore !== null);
          const computedGrade = isGraded
            ? Number(
                (
                  Number(sub.objectiveScore || 0) +
                  Number(sub.essayScore || 0) +
                  Number(sub.extraPoints || 0)
                ).toFixed(1)
              )
            : undefined;

          deliveries.push({
            activityId: act.id,
            studentId: sub.studentId,
            studentName: student?.fullName || sub.studentName || 'Aluno Desconhecido',
            activityTitle: act.title,
            isAdapted: Boolean(act.isAdapted),
            turma: student?.turma || 'Sem Turma',
            status: isGraded ? 'graded' : 'pending',
            totalGrade: computedGrade,
            maxGrade: act.maxGrade || 10,
            teacherFeedback: sub.teacherFeedback,
          });
        }
      });
    });

    return deliveries.reverse();
  }, [activities, tutoredStudents, tutoredStudentIds]);

  const filteredAtestados = useMemo(() => {
    return atestados.filter((item) => {
      const q = atestadosSearch.trim().toLowerCase();
      const matchSearch =
        !q ||
        (item.studentName || '').toLowerCase().includes(q) ||
        (item.motivo || '').toLowerCase().includes(q);
      const matchTurma =
        atestadosTurmaFilter === 'all' || item.studentTurma === atestadosTurmaFilter;
      const matchTipo =
        atestadosTipoFilter === 'all' || item.tipo === atestadosTipoFilter;
      return matchSearch && matchTurma && matchTipo;
    });
  }, [atestados, atestadosSearch, atestadosTurmaFilter, atestadosTipoFilter]);

  const accessibleLibraryFiles = useMemo(() => {
    return libraryFiles.filter((f) => {
      const fileTurma = (f.turma || '').trim().toLowerCase();
      if (
        !fileTurma ||
        fileTurma === 'todas' ||
        fileTurma === 'todas as turmas' ||
        fileTurma === 'geral' ||
        fileTurma === 'all'
      ) {
        return true;
      }
      if (derivedTurmas.length === 0) return true;
      const cleanFileTurma = fileTurma.replace(/^turma\s+/i, '').trim();
      return derivedTurmas.some((dt) => {
        const cleanDt = dt.trim().toLowerCase().replace(/^turma\s+/i, '').trim();
        return cleanFileTurma === cleanDt || fileTurma.includes(cleanDt);
      });
    });
  }, [libraryFiles, derivedTurmas]);

  // Load atestados for the derived turmas
  useEffect(() => {
    let isSubscribed = true;

    async function loadAtestados() {
      setIsLoadingAtestados(true);
      let loaded: AtestadoRadRecord[] = [];
      const ownerTeacherId = teacher.ownerTeacherId || (teacher as any).owner_teacher_id || teacher.id;

      // Local storage fallback com isolamento por professor titular
      if (typeof window !== 'undefined') {
        try {
          const raw = getScopedLocalStorageItem('atestados_rad_records', ownerTeacherId) || 
                      getScopedLocalStorageItem('local_atestados_rad_data', ownerTeacherId);
          if (raw) {
            loaded = JSON.parse(raw);
          }
        } catch (e) {
          console.warn('Erro ao ler cache local de atestados:', e);
        }
      }

      // Fetch from API Route
      try {
        const res = await fetch('/api/atestados-rad');
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            loaded = json.data;
            if (typeof window !== 'undefined') {
              setScopedLocalStorageItem('atestados_rad_records', JSON.stringify(json.data), ownerTeacherId);
              setScopedLocalStorageItem('local_atestados_rad_data', JSON.stringify(json.data), ownerTeacherId);
            }
          }
        }
      } catch (err) {
        console.warn('Erro ao buscar atestados via API:', err);
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

    return () => { isSubscribed = false; };
  }, [derivedTurmas, classRoster, teacher.id]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setSettingsMsg(null);
    try {
      if (newPassword && newPassword !== confirmPassword) {
        setSettingsMsg({ type: 'error', text: 'As senhas não coincidem.' });
        setIsSavingSettings(false);
        return;
      }
      
      const resProfile = await fetch('/api/second-teachers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: teacher.id,
          email: teacher.email,
          school: profileSchool,
          phone: profilePhone,
        }),
      });

      if (!resProfile.ok) {
        const pData = await resProfile.json().catch(() => ({}));
        throw new Error(pData.error || 'Erro ao atualizar perfil.');
      }

      if (newPassword) {
        const resPass = await fetch('/api/auth/change-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            newPassword: newPassword,
          }),
        });

        if (!resPass.ok) {
          const passData = await resPass.json().catch(() => ({}));
          throw new Error(passData.error || 'Erro ao atualizar a senha.');
        }
      }
      
      setSettingsMsg({ type: 'success', text: 'Configurações salvas com sucesso!' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error(err);
      setSettingsMsg({ type: 'error', text: 'Erro ao salvar configurações.' });
    } finally {
      setIsSavingSettings(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={activeTab}
        setCurrentTab={setActiveTab as any}
        teacher={teacher}
        role="second_teacher"
        onLogout={onLogout}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <div className="md:hidden sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border shadow-sm px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 -ml-2 text-foreground hover:bg-surface-hover rounded-xl transition-colors cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-bold text-foreground text-sm truncate max-w-[200px]">
              Portal PNE
            </span>
          </div>
          <div className="flex items-center gap-3">
            <img
              src={formatAvatarUrl(teacher.avatarUrl)}
              alt={teacher.name || 'Professor'}
              className="w-8 h-8 rounded-full object-cover border border-primary/30"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=250';
              }}
            />
          </div>
        </div>

        {/* Main Container */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-8">
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
                          {student.pneConditions && student.pneConditions.length > 0 && (
                            <div className="text-[11px] text-primary font-bold mt-1 bg-primary/10 px-2 py-0.5 rounded-md inline-block">
                              {student.pneConditions.join(', ')}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-border flex items-center justify-between gap-2">
                        <div className="text-[11px] text-muted">
                          {(student as any).phoneResponsible ? (
                            <span>Resp: {(student as any).phoneResponsible}</span>
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
                            <td className="py-3 text-muted">{getTurmaLabel(item.studentTurma || '')}</td>
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
              files={accessibleLibraryFiles}
              driveFolderUrl={teacher.driveFolderUrl}
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
              isSecondTeacher={true}
              teacher={teacher}
              students={classRoster}
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
      </div>
      

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

