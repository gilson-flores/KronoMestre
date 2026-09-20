'use client';

import React, { useState, useMemo } from 'react';
import {
  Database,
  Download,
  AlertTriangle,
  ShieldCheck,
  Archive,
  CheckCircle2,
  X,
  Layers,
  Search,
  Calendar,
  Eye,
  FileText,
  User,
  RotateCcw,
  BookOpen,
  Clock,
  Award,
  GraduationCap,
  Building2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  FolderArchive,
  Check,
} from 'lucide-react';
import { Activity, StudentUser, TeacherUser, ArchivedVinculo } from '@/lib/types';
import { scrollToTop } from '@/lib/utils';

interface BackupViewProps {
  students?: StudentUser[];
  activities?: Activity[];
  teacher?: TeacherUser;
  onArchiveVinculo?: (
    reason: string,
    schoolName?: string,
    vinculoCode?: string
  ) => Promise<{ success: boolean; studentsCount: number; activitiesCount: number; error?: string }>;
  onRestoreVinculo?: (target: {
    vinculoId?: string;
    studentIds?: string[];
    activityIds?: string[];
    vinculoCode?: string;
  }) => Promise<{ success: boolean; studentsCount: number; activitiesCount: number; error?: string }>;
  onNavigateToDashboard?: () => void;
}

export const BackupView: React.FC<BackupViewProps> = ({
  students = [],
  activities = [],
  teacher,
  onArchiveVinculo,
  onRestoreVinculo,
  onNavigateToDashboard,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);

  // Estados do Modal de Arquivamento
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [archiveSchool, setArchiveSchool] = useState(teacher?.school || 'Escola Estadual');
  const [archiveReason, setArchiveReason] = useState('Troca de vínculo');
  const [confirmWord, setConfirmWord] = useState('');
  const [isSubmittingArchive, setIsSubmittingArchive] = useState(false);

  // Estados do Modal de Restauração de Vínculo
  const [vinculoToRestore, setVinculoToRestore] = useState<ArchivedVinculo | null>(null);
  const [isSubmittingRestore, setIsSubmittingRestore] = useState(false);

  // Estado para expandir/consultar registros de um vínculo específico
  const [inspectingVinculoId, setInspectingVinculoId] = useState<string | null>(null);
  const [inspectTab, setInspectTab] = useState<'students' | 'activities'>('students');
  const [inspectSearchQuery, setInspectSearchQuery] = useState('');

  // Mensagens de Feedback
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Estados dos Modais de Consulta Detalhada (Somente Leitura de dossiês)
  const [viewingArchivedStudent, setViewingArchivedStudent] = useState<StudentUser | null>(null);
  const [viewingArchivedActivity, setViewingArchivedActivity] = useState<Activity | null>(null);

  // Contagem estrita de registros ativos do vínculo atual
  const activeStudents = useMemo(() => students.filter((s) => !s.isArchived), [students]);
  const activeActivities = useMemo(() => activities.filter((a) => !a.isArchived), [activities]);
  const activeStudentsCount = activeStudents.length;
  const activeActivitiesCount = activeActivities.length;

  // Registros Arquivados
  const archivedStudents = useMemo(() => students.filter((s) => Boolean(s.isArchived)), [students]);
  const archivedActivities = useMemo(() => activities.filter((a) => Boolean(a.isArchived)), [activities]);
  const totalArchivedCount = archivedStudents.length + archivedActivities.length;

  // Cálculo do identificador do próximo vínculo a ser gerado no arquivamento (Mês e Ano de encerramento)
  const currentMonthYear = useMemo(() => {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    return `${mm}/${yyyy}`;
  }, []);

  const nextVinculoCodePreview = `Vínculo ${currentMonthYear}`;

  // Formatação de data amigável e segura
  const formatDateTime = (isoDate?: string) => {
    if (!isoDate) return 'Data não registrada';
    try {
      const d = new Date(isoDate);
      if (isNaN(d.getTime())) return isoDate;
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoDate;
    }
  };

  const formatDateOnly = (isoDate?: string) => {
    if (!isoDate) return '-';
    try {
      const d = new Date(isoDate);
      if (isNaN(d.getTime())) return isoDate;
      return d.toLocaleDateString('pt-BR');
    } catch {
      return isoDate;
    }
  };

  // Agrupamento de Registros Arquivados por Raiz: Escola e Vínculo (com Numeração Mês/Ano de encerramento)
  const archivedVinculos = useMemo<ArchivedVinculo[]>(() => {
    const map = new Map<string, ArchivedVinculo>();

    const getMonthYearFromDate = (dateStr?: string) => {
      if (!dateStr) {
        return currentMonthYear;
      }
      try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return currentMonthYear;
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${mm}/${yyyy}`;
      } catch {
        return currentMonthYear;
      }
    };

    // 1. Processar alunos arquivados
    archivedStudents.forEach((student) => {
      const monthYear = getMonthYearFromDate(student.archivedAt);
      const school = (student.archivedSchool || teacher?.school || 'Escola Estadual').trim();
      const vinculoKey = student.archivedVinculoId || `${school}__${monthYear}`;
      const vinculoCode = `Vínculo ${monthYear}`;

      if (!map.has(vinculoKey)) {
        map.set(vinculoKey, {
          id: vinculoKey,
          vinculoCode,
          school,
          monthYear,
          closedAt: student.archivedAt || new Date().toISOString(),
          reason: student.archivedReason || 'Troca de vínculo',
          students: [],
          activities: [],
          turmas: [],
          totalStudents: 0,
          totalActivities: 0,
        });
      }

      const v = map.get(vinculoKey)!;
      v.students.push(student);
      if (student.turma && !v.turmas.includes(student.turma)) {
        v.turmas.push(student.turma);
      }
      if (student.archivedAt && new Date(student.archivedAt) > new Date(v.closedAt)) {
        v.closedAt = student.archivedAt;
      }
      if (student.archivedReason && !v.reason) {
        v.reason = student.archivedReason;
      }
    });

    // 2. Processar atividades arquivadas
    archivedActivities.forEach((act) => {
      const monthYear = getMonthYearFromDate(act.archivedAt);
      const school = (act.archivedSchool || teacher?.school || 'Escola Estadual').trim();
      const vinculoKey = act.archivedVinculoId || `${school}__${monthYear}`;
      const vinculoCode = `Vínculo ${monthYear}`;

      if (!map.has(vinculoKey)) {
        map.set(vinculoKey, {
          id: vinculoKey,
          vinculoCode,
          school,
          monthYear,
          closedAt: act.archivedAt || new Date().toISOString(),
          reason: act.archivedReason || 'Troca de vínculo',
          students: [],
          activities: [],
          turmas: [],
          totalStudents: 0,
          totalActivities: 0,
        });
      }

      const v = map.get(vinculoKey)!;
      v.activities.push(act);
      if (act.turma && !v.turmas.includes(act.turma)) {
        v.turmas.push(act.turma);
      }
      if (act.archivedAt && new Date(act.archivedAt) > new Date(v.closedAt)) {
        v.closedAt = act.archivedAt;
      }
      if (act.archivedReason && !v.reason) {
        v.reason = act.archivedReason;
      }
    });

    // Finalizar contagens e ordenar vínculos do mais recente para o mais antigo
    const list = Array.from(map.values()).map((v) => ({
      ...v,
      totalStudents: v.students.length,
      totalActivities: v.activities.length,
      turmas: v.turmas.sort(),
    }));

    list.sort((a, b) => new Date(b.closedAt).getTime() - new Date(a.closedAt).getTime());
    return list;
  }, [archivedStudents, archivedActivities, teacher?.school, currentMonthYear]);

  // Vínculo atualmente em inspeção detalhada
  const activeInspectingVinculo = useMemo(() => {
    if (!inspectingVinculoId) return null;
    return archivedVinculos.find((v) => v.id === inspectingVinculoId) || null;
  }, [inspectingVinculoId, archivedVinculos]);

  // Filtragem de alunos no vínculo em inspeção
  const filteredInspectingStudents = useMemo(() => {
    if (!activeInspectingVinculo) return [];
    if (!inspectSearchQuery.trim()) return activeInspectingVinculo.students;
    const q = inspectSearchQuery.toLowerCase().trim();
    return activeInspectingVinculo.students.filter(
      (s) =>
        s.fullName?.toLowerCase().includes(q) ||
        s.matricula?.toLowerCase().includes(q) ||
        s.turma?.toLowerCase().includes(q)
    );
  }, [activeInspectingVinculo, inspectSearchQuery]);

  // Filtragem de atividades no vínculo em inspeção
  const filteredInspectingActivities = useMemo(() => {
    if (!activeInspectingVinculo) return [];
    if (!inspectSearchQuery.trim()) return activeInspectingVinculo.activities;
    const q = inspectSearchQuery.toLowerCase().trim();
    return activeInspectingVinculo.activities.filter(
      (a) =>
        a.title?.toLowerCase().includes(q) ||
        a.turma?.toLowerCase().includes(q) ||
        a.subject?.toLowerCase().includes(q)
    );
  }, [activeInspectingVinculo, inspectSearchQuery]);

  // Submissões do aluno atualmente em consulta de dossiê
  const studentArchivedSubmissions = useMemo(() => {
    if (!viewingArchivedStudent) return [];
    const stId = viewingArchivedStudent.id;
    const stMat = viewingArchivedStudent.matricula;

    const list: { activity: Activity; submission: any }[] = [];
    activities.forEach((act) => {
      const sub = act.submissions?.find(
        (s) => (s.studentId && s.studentId === stId) || (s.matricula && s.matricula === stMat)
      );
      if (sub) {
        list.push({ activity: act, submission: sub });
      }
    });
    return list;
  }, [viewingArchivedStudent, activities]);

  const handleDownload = () => {
    setIsDownloading(true);
    window.location.href = '/api/export-backup?token=BACKUP_SEGURO_2026';
    setTimeout(() => {
      setIsDownloading(false);
    }, 3000);
  };

  const handleOpenArchiveModal = () => {
    setArchiveSchool(teacher?.school || 'Escola Estadual');
    setArchiveReason('Troca de vínculo');
    setConfirmWord('');
    setFeedbackMessage(null);
    setIsArchiveModalOpen(true);
  };

  const handleCloseArchiveModal = () => {
    if (isSubmittingArchive) return;
    setIsArchiveModalOpen(false);
    setConfirmWord('');
  };

  const handleConfirmArchive = async () => {
    if (confirmWord.trim().toUpperCase() !== 'ARQUIVAR' || isSubmittingArchive) {
      return;
    }

    if (!onArchiveVinculo) {
      setFeedbackMessage({
        type: 'error',
        text: 'Ação de arquivamento indisponível.',
      });
      return;
    }

    setIsSubmittingArchive(true);
    setFeedbackMessage(null);

    try {
      const result = await onArchiveVinculo(archiveReason, archiveSchool, nextVinculoCodePreview);

      if (result.success) {
        setIsArchiveModalOpen(false);
        scrollToTop();
        setFeedbackMessage({
          type: 'success',
          text: `Vínculo ${currentMonthYear} arquivado com sucesso (${result.studentsCount} alunos e ${result.activitiesCount} atividades). Você pode restaurar este vínculo quando retornar à escola.`,
        });

        if (onNavigateToDashboard) {
          setTimeout(() => {
            onNavigateToDashboard();
          }, 1500);
        }
      } else {
        setFeedbackMessage({
          type: 'error',
          text: result.error || 'Não foi possível concluir o arquivamento.',
        });
      }
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err?.message || 'Ocorreu um erro ao processar o arquivamento.',
      });
    } finally {
      setIsSubmittingArchive(false);
    }
  };

  const handleOpenRestoreModal = (vinculo: ArchivedVinculo) => {
    setVinculoToRestore(vinculo);
    setFeedbackMessage(null);
  };

  const handleCloseRestoreModal = () => {
    if (isSubmittingRestore) return;
    setVinculoToRestore(null);
  };

  const handleConfirmRestore = async () => {
    if (!vinculoToRestore || isSubmittingRestore) return;

    if (!onRestoreVinculo) {
      setFeedbackMessage({
        type: 'error',
        text: 'Ação de restauração de vínculo indisponível.',
      });
      return;
    }

    setIsSubmittingRestore(true);
    setFeedbackMessage(null);

    try {
      const studentIds = vinculoToRestore.students.map((s) => s.id);
      const activityIds = vinculoToRestore.activities.map((a) => a.id);

      const result = await onRestoreVinculo({
        vinculoId: vinculoToRestore.id,
        vinculoCode: vinculoToRestore.vinculoCode,
        studentIds,
        activityIds,
      });

      if (result.success) {
        const restoredName = `${vinculoToRestore.vinculoCode} (${vinculoToRestore.school})`;
        setVinculoToRestore(null);
        setInspectingVinculoId(null);
        scrollToTop();
        setFeedbackMessage({
          type: 'success',
          text: `${restoredName} restaurado com sucesso! ${result.studentsCount} alunos e ${result.activitiesCount} atividades foram reativados na base de trabalho.`,
        });

        if (onNavigateToDashboard) {
          setTimeout(() => {
            onNavigateToDashboard();
          }, 1500);
        }
      } else {
        setFeedbackMessage({
          type: 'error',
          text: result.error || 'Não foi possível restaurar os dados do vínculo.',
        });
      }
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err?.message || 'Erro ao processar a restauração do vínculo.',
      });
    } finally {
      setIsSubmittingRestore(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 animate-fadeIn text-foreground">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* CABEÇALHO */}
        <header className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 text-primary rounded-2xl border border-primary/20">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Backup e Recuperação de Vínculos
              </h1>
              <p className="text-sm text-text-muted mt-1">
                Gere cópias de segurança em tempo real, encerre períodos letivos gerando códigos de vínculo por Escola e Mês/Ano, e restaure dados a qualquer momento ao retornar à escola.
              </p>
            </div>
          </div>
        </header>

        {/* FEEDBACK GLOBAL DE SUCESSO / ERRO */}
        {feedbackMessage && (
          <div
            id="backup-feedback-banner"
            className={`p-4 rounded-2xl border flex items-center gap-3 animate-fadeIn ${
              feedbackMessage.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}
          >
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />
            )}
            <span className="text-sm font-semibold">{feedbackMessage.text}</span>
          </div>
        )}

        {/* SEÇÃO 1: EXPORTAR BACKUP */}
        <section
          id="section-backup-export"
          className="bg-surface border border-border rounded-3xl p-6 sm:p-8 shadow-sm space-y-6"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/10 text-primary rounded-2xl shrink-0">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Backup em Tempo Real (Snapshot Completo)</h2>
              <p className="text-sm text-text-muted mt-2 leading-relaxed">
                Ao clicar em &quot;Exportar Banco de Dados&quot;, o sistema compila um arquivo{' '}
                <strong className="text-foreground">JSON unificado</strong> com a base de dados exata deste instante:
                alunos matriculados, configurações de 2º professor, laudos PNE, histórico do fórum/chat e
                todas as atividades ou recuperações cadastradas.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-border flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-primary">
              <ShieldCheck className="w-4 h-4" />
              Conexão Segura e Criptografada
            </div>

            <button
              id="btn-exportar-backup"
              onClick={handleDownload}
              disabled={isDownloading}
              className="w-full sm:w-auto px-6 py-3 bg-primary hover:bg-[#00e664] text-white font-bold rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
            >
              {isDownloading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download className="w-5 h-5" />
              )}
              {isDownloading ? 'Gerando Arquivo...' : 'Exportar Banco de Dados'}
            </button>
          </div>
        </section>

        {/* SEÇÃO ADMIN SUPREMO: MIGRAÇÃO SUPABASE -> FIRESTORE */}
        {(teacher?.is_admin || teacher?.isAdmin) && (
          <section
            id="section-admin-migrate-firestore"
            className="bg-emerald-500/10 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl shrink-0">
                <Database className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Admin Supremo
                  </span>
                  <h2 className="text-lg font-bold text-foreground">Importar Dados do Supabase para o Firestore</h2>
                </div>
                <p className="text-xs text-text-muted mt-2 leading-relaxed">
                  Importa com segurança alunos, turmas, atividades e perfil do professor registrados no banco Supabase legado diretamente para a coleção deste tenant no Firestore (<code className="text-emerald-400">tenants/{'{uid}'}</code>). Nenhum dado do Supabase é excluído.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-emerald-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                Operação Segura com Firebase Admin
              </span>

              <button
                type="button"
                onClick={async () => {
                  if (!confirm('Deseja iniciar a importação segura dos dados do Supabase para o Firestore agora?')) return;
                  try {
                    setFeedbackMessage({ type: 'success', text: 'Iniciando migração segura do Supabase para o Firestore...' });
                    const res = await fetch('/api/admin/migrate-supabase-to-firestore', { method: 'POST' });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || 'Falha na migração');
                    setFeedbackMessage({
                      type: 'success',
                      text: `Migração concluída com sucesso! Alunos importados: ${data.stats?.importedStudents || 0}, Atividades: ${data.stats?.importedActivities || 0}.`,
                    });
                  } catch (err: any) {
                    setFeedbackMessage({ type: 'error', text: `Erro na migração: ${err.message || String(err)}` });
                  }
                }}
                className="w-full sm:w-auto px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Executar Importação Supabase → Firestore</span>
              </button>
            </div>
          </section>
        )}

        {/* SEÇÃO 2: ARQUIVAR VÍNCULO ATUAL (ENCERRAMENTO DE CICLO / GERAÇÃO DE NOVO VÍNCULO) */}
        <section
          id="section-archive-vinculo"
          className="bg-surface border border-border rounded-3xl p-6 sm:p-8 shadow-sm space-y-6"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl shrink-0">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Ciclo de Vínculo Docente (Escola e Período)</h2>
            </div>
          </div>

          {/* INDICADORES DO VÍNCULO ATIVO */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-background/60 border border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs text-text-muted font-medium">Alunos Ativos</div>
                  <div className="text-lg font-black text-foreground">{activeStudentsCount} alunos</div>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                Ativo
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-background/60 border border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs text-text-muted font-medium">Atividades Ativas</div>
                  <div className="text-lg font-black text-foreground">{activeActivitiesCount} atividades</div>
                </div>
              </div>
              <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                Ativo
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-background/60 border border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs text-text-muted font-medium">Unidade Escolar</div>
                  <div className="text-sm font-bold text-foreground truncate max-w-[140px]" title={teacher?.school || 'Escola Estadual'}>
                    {teacher?.school || 'Escola Estadual'}
                  </div>
                </div>
              </div>
              <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20">
                Lotação
              </span>
            </div>
          </div>

          {/* BOTÃO DISPARADOR DE ARQUIVAMENTO */}
          <div className="pt-4 border-t border-border flex flex-col sm:flex-row gap-4 items-center justify-between">
            <p className="text-xs text-text-muted leading-relaxed">
              * O arquivamento gera a numeração de encerramento ({nextVinculoCodePreview}) vinculada à escola, permitindo restaurar integralmente o histórico a qualquer momento.
            </p>

            <button
              id="btn-open-archive-modal"
              onClick={handleOpenArchiveModal}
              disabled={activeStudentsCount === 0 && activeActivitiesCount === 0}
              className="w-full sm:w-auto px-6 py-3 bg-amber-600/90 hover:bg-amber-600 text-white font-bold rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]"
            >
              <Archive className="w-5 h-5" />
              <span>Arquivar vínculo atual</span>
            </button>
          </div>
        </section>

        {/* SEÇÃO 3: VÍNCULOS ARQUIVADOS (HISTÓRICO POR ESCOLA E VÍNCULO COM MÊS/ANO DE ENCERRAMENTO E RESTAURAÇÃO) */}
        <section
          id="section-archive-audit"
          className="bg-surface border border-border rounded-3xl p-6 sm:p-8 shadow-sm space-y-6"
        >
          {/* CABEÇALHO DA SEÇÃO */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-500/10 text-blue-400 rounded-2xl shrink-0">
                <FolderArchive className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-lg font-bold text-foreground">
                    Vínculos Arquivados (Histórico por Escola e Período)
                  </h2>
                  <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    {archivedVinculos.length} Vínculo(s) Arquivado(s)
                  </span>
                </div>
                <p className="text-sm text-text-muted mt-1 leading-relaxed">
                  A raiz do histórico é organizada por Escola e Vínculo (com numeração de Mês/Ano de encerramento). Você pode restaurar qualquer vínculo para reativar todos os seus dados na base ativa ou consultar dossiês históricos.
                </p>
              </div>
            </div>
          </div>

          {/* SE NÃO HOUVER NADA ARQUIVADO */}
          {archivedVinculos.length === 0 ? (
            <div
              id="empty-state-no-archives"
              className="py-12 px-6 rounded-2xl border border-dashed border-border bg-background/40 flex flex-col items-center justify-center text-center space-y-3"
            >
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <Archive className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-foreground">Nenhum vínculo arquivado</h3>
              <p className="text-xs text-text-muted max-w-md leading-relaxed">
                Todos os seus {activeStudentsCount} alunos e {activeActivitiesCount} atividades pertencem ao vínculo ativo atual.
                Quando você realizar um arquivamento ao término de um contrato ou ano letivo, o vínculo será registrado aqui com a identificação da Escola e Mês/Ano para consulta e restauração futura.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* LISTAGEM DE CARDS DE VÍNCULOS ARQUIVADOS */}
              <div className="space-y-4">
                {archivedVinculos.map((vinculo) => {
                  const isExpanded = inspectingVinculoId === vinculo.id;

                  return (
                    <div
                      key={vinculo.id}
                      className={`rounded-2xl border transition-all ${
                        isExpanded
                          ? 'bg-background/90 border-primary/40 shadow-lg'
                          : 'bg-background/60 border-border hover:border-amber-500/30'
                      }`}
                    >
                      {/* CABEÇALHO DO CARD DO VÍNCULO */}
                      <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold">
                              <Building2 className="w-3.5 h-3.5" />
                              <span>{vinculo.school}</span>
                            </div>

                            <span className="px-3 py-1 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-black tracking-wide">
                              {vinculo.vinculoCode}
                            </span>

                            <span className="text-xs text-text-muted flex items-center gap-1">
                              <Clock className="w-3 h-3 text-text-muted" /> Encerrado em: {formatDateTime(vinculo.closedAt)}
                            </span>
                          </div>

                          <div className="text-xs text-text-muted">
                            Motivo do arquivamento: <strong className="text-foreground">{vinculo.reason}</strong>
                          </div>

                          {/* RESUMO DOS REGISTROS DESTE VÍNCULO */}
                          <div className="flex items-center gap-3 pt-1 flex-wrap text-xs text-foreground font-semibold">
                            <span className="px-2.5 py-1 rounded-lg bg-surface border border-border flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-primary" />
                              {vinculo.totalStudents} Alunos
                            </span>
                            <span className="px-2.5 py-1 rounded-lg bg-surface border border-border flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5 text-amber-400" />
                              {vinculo.totalActivities} Atividades
                            </span>
                            {vinculo.turmas.length > 0 && (
                              <span className="px-2.5 py-1 rounded-lg bg-surface border border-border flex items-center gap-1.5 text-text-muted">
                                <GraduationCap className="w-3.5 h-3.5 text-blue-400" />
                                Turmas: {vinculo.turmas.join(', ')}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* AÇÕES DO VÍNCULO */}
                        <div className="flex items-center gap-3 shrink-0 flex-wrap pt-2 lg:pt-0 border-t lg:border-t-0 border-border">
                          {/* BOTÃO PRINCIPAL: RESTAURAR VÍNCULO */}
                          <button
                            type="button"
                            onClick={() => handleOpenRestoreModal(vinculo)}
                            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all duration-200 shadow-sm flex items-center justify-center gap-2 cursor-pointer min-h-[44px] min-w-[170px] active:scale-95"
                            title="Restaurar este vínculo de volta para a base ativa"
                          >
                            <RotateCcw className="w-4 h-4" />
                            <span>Restaurar Vínculo</span>
                          </button>

                          {/* BOTÃO SECUNDÁRIO: CONSULTAR REGISTROS DO VÍNCULO */}
                          <button
                            type="button"
                            onClick={() => {
                              if (isExpanded) {
                                setInspectingVinculoId(null);
                              } else {
                                setInspectingVinculoId(vinculo.id);
                                setInspectSearchQuery('');
                              }
                            }}
                            className={`px-4 py-2.5 text-xs font-bold rounded-xl border transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer min-h-[44px] min-w-[170px] active:scale-95 ${
                              isExpanded
                                ? 'bg-surface border-primary text-primary shadow-sm'
                                : 'bg-surface border-border text-foreground hover:bg-surface-hover'
                            }`}
                          >
                            <Eye className="w-4 h-4" />
                            <span>{isExpanded ? 'Ocultar Registros' : 'Consultar Registros'}</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {/* PAINEL EXPANSÍVEL DE CONSULTA DO VÍNCULO ESPECÍFICO */}
                      {isExpanded && (
                        <div className="p-5 sm:p-6 border-t border-border bg-surface/50 rounded-b-2xl space-y-4 animate-fadeIn">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1.5 p-1 bg-background border border-border rounded-2xl">
                                <button
                                  type="button"
                                  onClick={() => setInspectTab('students')}
                                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer min-h-[42px] min-w-[145px] active:scale-95 border ${
                                    inspectTab === 'students'
                                      ? 'bg-surface border-border text-foreground shadow-sm'
                                      : 'text-text-muted hover:text-foreground border-transparent hover:bg-surface-hover/50'
                                  }`}
                                >
                                  <User className="w-3.5 h-3.5" />
                                  <span>Alunos ({vinculo.totalStudents})</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setInspectTab('activities')}
                                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer min-h-[42px] min-w-[145px] active:scale-95 border ${
                                    inspectTab === 'activities'
                                      ? 'bg-surface border-border text-foreground shadow-sm'
                                      : 'text-text-muted hover:text-foreground border-transparent hover:bg-surface-hover/50'
                                  }`}
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  <span>Atividades ({vinculo.totalActivities})</span>
                                </button>
                              </div>
                            </div>

                            <div className="relative w-full sm:w-72">
                              <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                              <input
                                type="text"
                                value={inspectSearchQuery}
                                onChange={(e) => setInspectSearchQuery(e.target.value)}
                                placeholder="Filtrar por nome, matrícula, turma..."
                                className="w-full pl-8 pr-3 py-1.5 bg-background border border-border rounded-xl text-xs text-foreground placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors"
                              />
                            </div>
                          </div>

                          {/* LISTAGEM DE ALUNOS DO VÍNCULO */}
                          {inspectTab === 'students' && (
                            <div className="space-y-2">
                              {filteredInspectingStudents.length === 0 ? (
                                <div className="p-6 text-center rounded-xl border border-dashed border-border text-xs text-text-muted">
                                  Nenhum aluno encontrado para os critérios de busca.
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-80 overflow-y-auto pr-1">
                                  {filteredInspectingStudents.map((st) => (
                                    <div
                                      key={st.id}
                                      className="p-3 rounded-xl bg-background border border-border flex items-center justify-between gap-3 hover:border-border/80 transition-colors"
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                                          {st.fullName?.charAt(0) || 'A'}
                                        </div>
                                        <div className="min-w-0">
                                          <div className="text-xs font-bold text-foreground truncate">
                                            {st.fullName}
                                          </div>
                                          <div className="text-[11px] text-text-muted truncate">
                                            Turma {st.turma} • Matrícula {st.matricula}
                                          </div>
                                        </div>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() => setViewingArchivedStudent(st)}
                                        className="px-2.5 py-1 rounded-lg bg-surface hover:bg-surface-hover text-foreground border border-border text-[11px] font-semibold transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                                      >
                                        <Eye className="w-3 h-3 text-primary" />
                                        <span>Dossiê</span>
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* LISTAGEM DE ATIVIDADES DO VÍNCULO */}
                          {inspectTab === 'activities' && (
                            <div className="space-y-2">
                              {filteredInspectingActivities.length === 0 ? (
                                <div className="p-6 text-center rounded-xl border border-dashed border-border text-xs text-text-muted">
                                  Nenhuma atividade encontrada para os critérios de busca.
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-80 overflow-y-auto pr-1">
                                  {filteredInspectingActivities.map((act) => (
                                    <div
                                      key={act.id}
                                      className="p-3 rounded-xl bg-background border border-border flex items-center justify-between gap-3 hover:border-border/80 transition-colors"
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0">
                                          <FileText className="w-3.5 h-3.5" />
                                        </div>
                                        <div className="min-w-0">
                                          <div className="text-xs font-bold text-foreground truncate">
                                            {act.title}
                                          </div>
                                          <div className="text-[11px] text-text-muted truncate">
                                            Turma {act.turma} • {act.type}
                                          </div>
                                        </div>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() => setViewingArchivedActivity(act)}
                                        className="px-2.5 py-1 rounded-lg bg-surface hover:bg-surface-hover text-foreground border border-border text-[11px] font-semibold transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                                      >
                                        <Eye className="w-3 h-3 text-primary" />
                                        <span>Ver</span>
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* MODAL: RESTAURAÇÃO SEGURA DO VÍNCULO */}
      {vinculoToRestore && (
        <div
          id="modal-restore-vinculo-overlay"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn"
        >
          <div
            id="modal-restore-vinculo-content"
            className="bg-surface border border-border rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl relative"
          >
            {/* CABEÇALHO */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
                  <RotateCcw className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">Restaurar Vínculo Docente</h3>
                  <p className="text-xs text-text-muted mt-0.5">Reativação completa de dados</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseRestoreModal}
                disabled={isSubmittingRestore}
                className="p-2 text-text-muted hover:text-foreground rounded-xl hover:bg-surface-hover transition-colors cursor-pointer"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* DETALHES DO VÍNCULO A SER RESTAURADO */}
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-foreground space-y-2 text-sm leading-relaxed">
              <div className="flex items-center gap-2 font-bold text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>{vinculoToRestore.vinculoCode} • {vinculoToRestore.school}</span>
              </div>
              <p className="text-xs text-text-muted">
                Esta ação reativará <strong className="text-foreground">{vinculoToRestore.totalStudents} alunos</strong> e{' '}
                <strong className="text-foreground">{vinculoToRestore.totalActivities} atividades</strong> deste vínculo histórico, disponibilizando-os imediatamente nas suas turmas ativas.
              </p>
              {vinculoToRestore.turmas.length > 0 && (
                <div className="text-xs text-text-muted">
                  Turmas que serão reativadas: <strong className="text-foreground">{vinculoToRestore.turmas.join(', ')}</strong>
                </div>
              )}
            </div>

            {/* AVISO DE SEGURANÇA */}
            <div className="p-3 rounded-xl bg-background border border-border text-xs text-text-muted space-y-1">
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Integridade Preservada
              </div>
              <p>
                Todas as notas, submissões e anotações pedagógicas registradas neste vínculo continuam 100% preservadas.
              </p>
            </div>

            {/* BOTÕES DE AÇÃO */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3 items-center justify-end">
              <button
                type="button"
                onClick={handleCloseRestoreModal}
                disabled={isSubmittingRestore}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-border hover:bg-surface-hover text-foreground font-semibold text-sm transition-colors cursor-pointer min-h-[44px]"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirmRestore}
                disabled={isSubmittingRestore}
                className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
              >
                {isSubmittingRestore ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Restaurando vínculo...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>Confirmar Restauração</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: CONSULTA DE ALUNO ARQUIVADO (MODO SOMENTE LEITURA E AUDITORIA) */}
      {viewingArchivedStudent && (
        <div
          id="modal-view-archived-student-overlay"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn"
        >
          <div
            id="modal-view-archived-student-content"
            className="bg-surface border border-border rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative my-8"
          >
            {/* CABEÇALHO */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                    <Archive className="w-3 h-3" /> Arquivado (Somente Leitura)
                  </span>
                  <span className="text-xs text-text-muted">
                    Arquivado em: {formatDateTime(viewingArchivedStudent.archivedAt)}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-foreground mt-1">
                  {viewingArchivedStudent.fullName}
                </h3>
                <div className="flex items-center gap-3 text-xs text-text-muted">
                  <span>Turma: <strong>{viewingArchivedStudent.turma}</strong></span>
                  <span>•</span>
                  <span>Matrícula: <strong>{viewingArchivedStudent.matricula}</strong></span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setViewingArchivedStudent(null)}
                className="p-2 text-text-muted hover:text-foreground rounded-xl hover:bg-surface-hover transition-colors cursor-pointer"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* DADOS DE CONTEXTO DO ARQUIVAMENTO */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-foreground space-y-1.5">
              <div className="font-semibold text-amber-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> Registro Histórico Preservado
              </div>
              <p className="text-text-muted">
                Motivo registrado: <strong className="text-foreground">{viewingArchivedStudent.archivedReason || 'Troca de vínculo'}</strong>
              </p>
              {viewingArchivedStudent.secondTeacherName && (
                <p className="text-text-muted">
                  2º Professor vinculado no período: <strong className="text-foreground">{viewingArchivedStudent.secondTeacherName}</strong>
                </p>
              )}
            </div>

            {/* NOTAS PEDAGÓGICAS (SE HOUVER) */}
            {viewingArchivedStudent.pedagogicalNotes && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  Anotações Pedagógicas Registradas:
                </h4>
                <div className="p-4 rounded-2xl bg-background border border-border text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                  {viewingArchivedStudent.pedagogicalNotes}
                </div>
              </div>
            )}

            {/* HISTÓRICO DE SUBMISSÕES E NOTAS */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  Histórico de Atividades e Avaliações:
                </h4>
                <span className="text-xs text-text-muted font-medium">
                  {studentArchivedSubmissions.length} registro(s)
                </span>
              </div>

              {studentArchivedSubmissions.length === 0 ? (
                <div className="p-6 text-center rounded-2xl bg-background border border-border text-xs text-text-muted">
                  Nenhuma entrega ou nota registrada para este aluno nas atividades disponíveis.
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {studentArchivedSubmissions.map(({ activity, submission }, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-background border border-border flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="font-semibold text-foreground">{activity.title}</div>
                        <div className="text-[11px] text-text-muted">
                          Prazo: {formatDateOnly(activity.dueDate || activity.deadline)} • Tipo: {activity.type}
                        </div>
                        {submission.teacherFeedback && (
                          <div className="text-[11px] text-primary mt-1 italic">
                            &quot;{submission.teacherFeedback}&quot;
                          </div>
                        )}
                      </div>

                      <div className="text-right shrink-0 space-y-1">
                        <div className="font-bold text-foreground text-sm flex items-center gap-1 justify-end">
                          <Award className="w-3.5 h-3.5 text-amber-400" />
                          <span>
                            {typeof submission.essayScore === 'number'
                              ? (submission.objectiveScore || 0) + submission.essayScore
                              : submission.objectiveScore ?? '-'}
                            {' / '}
                            {(activity.maxGrade || 10).toFixed(1)}
                          </span>
                        </div>
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            submission.status === 'graded'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {submission.status === 'graded' ? 'Nota Atribuída' : 'Submetido'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* BOTÃO DE FECHAR */}
            <div className="pt-3 border-t border-border flex justify-end">
              <button
                type="button"
                onClick={() => setViewingArchivedStudent(null)}
                className="px-6 py-2.5 rounded-xl bg-surface hover:bg-surface-hover text-foreground font-semibold text-xs border border-border transition-colors cursor-pointer min-h-[40px]"
              >
                Fechar Consulta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CONSULTA DE ATIVIDADE ARQUIVADA (MODO SOMENTE LEITURA E AUDITORIA) */}
      {viewingArchivedActivity && (
        <div
          id="modal-view-archived-activity-overlay"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn"
        >
          <div
            id="modal-view-archived-activity-content"
            className="bg-surface border border-border rounded-3xl max-w-3xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative my-8"
          >
            {/* CABEÇALHO */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                    <Archive className="w-3 h-3" /> Arquivado (Somente Leitura)
                  </span>
                  <span className="text-xs text-text-muted">
                    Arquivado em: {formatDateTime(viewingArchivedActivity.archivedAt)}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-foreground mt-1">
                  {viewingArchivedActivity.title}
                </h3>
                <div className="flex items-center gap-3 text-xs text-text-muted">
                  <span>Turma: <strong>{viewingArchivedActivity.turma}</strong></span>
                  <span>•</span>
                  <span>Tipo: <strong>{viewingArchivedActivity.type}</strong></span>
                  <span>•</span>
                  <span>Disciplina: <strong>{viewingArchivedActivity.subject || 'Geral'}</strong></span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setViewingArchivedActivity(null)}
                className="p-2 text-text-muted hover:text-foreground rounded-xl hover:bg-surface-hover transition-colors cursor-pointer"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* DADOS DE CONTEXTO */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-foreground space-y-1.5">
              <div className="font-semibold text-amber-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> Atividade Histórica Preservada
              </div>
              <p className="text-text-muted">
                Motivo do arquivamento: <strong className="text-foreground">{viewingArchivedActivity.archivedReason || 'Troca de vínculo'}</strong>
              </p>
              <p className="text-text-muted">
                Nota Máxima: <strong className="text-foreground">{(viewingArchivedActivity.maxGrade || 10).toFixed(1)}</strong>
              </p>
            </div>

            {/* DESCRIÇÃO DA ATIVIDADE */}
            {viewingArchivedActivity.description && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  Descrição e Instruções:
                </h4>
                <div className="p-4 rounded-2xl bg-background border border-border text-xs text-foreground leading-relaxed">
                  {viewingArchivedActivity.description}
                </div>
              </div>
            )}

            {/* QUESTÕES REGISTRADAS */}
            {viewingArchivedActivity.questions && viewingArchivedActivity.questions.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  Enunciados das Questões ({viewingArchivedActivity.questions.length}):
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {viewingArchivedActivity.questions.map((q, qIndex) => (
                    <div key={q.id || qIndex} className="p-3.5 rounded-xl bg-background border border-border text-xs space-y-1.5">
                      <div className="font-bold text-foreground">
                        Questão {qIndex + 1} ({q.type === 'multiple_choice' ? 'Múltipla Escolha' : 'Dissertativa'}):
                      </div>
                      <p className="text-text-muted">{q.statement}</p>
                      {q.type === 'multiple_choice' && (
                        <div className="pl-2 space-y-0.5 text-[11px] text-text-muted">
                          {q.options.map((opt, optIdx) => (
                            <div key={optIdx} className={optIdx === q.correctOptionIndex ? 'font-bold text-emerald-400' : ''}>
                              {String.fromCharCode(65 + optIdx)}) {opt} {optIdx === q.correctOptionIndex && '✓'}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ENTREGAS / SUBMISSÕES */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  Submissões e Avaliações de Alunos ({viewingArchivedActivity.submissions?.length || 0}):
                </h4>
              </div>

              {!viewingArchivedActivity.submissions || viewingArchivedActivity.submissions.length === 0 ? (
                <div className="p-6 text-center rounded-2xl bg-background border border-border text-xs text-text-muted">
                  Nenhuma submissão registrada para esta atividade.
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {viewingArchivedActivity.submissions.map((sub, sIdx) => (
                    <div
                      key={sIdx}
                      className="p-3 rounded-xl bg-background border border-border flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-semibold text-foreground">{sub.studentName}</div>
                        <div className="text-[11px] text-text-muted">Matrícula: {sub.matricula}</div>
                        {sub.teacherFeedback && (
                          <div className="text-[11px] text-primary mt-0.5 italic">
                            &quot;{sub.teacherFeedback}&quot;
                          </div>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-bold text-foreground">
                          Nota:{' '}
                          {typeof sub.essayScore === 'number'
                            ? (sub.objectiveScore || 0) + sub.essayScore
                            : sub.objectiveScore ?? '-'}
                        </div>
                        <span className="text-[10px] text-text-muted uppercase font-bold">
                          {sub.status === 'graded' ? 'Concluída' : sub.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* BOTÃO DE FECHAR */}
            <div className="pt-3 border-t border-border flex justify-end">
              <button
                type="button"
                onClick={() => setViewingArchivedActivity(null)}
                className="px-6 py-2.5 rounded-xl bg-surface hover:bg-surface-hover text-foreground font-semibold text-xs border border-border transition-colors cursor-pointer min-h-[40px]"
              >
                Fechar Consulta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE ARQUIVAMENTO */}
      {isArchiveModalOpen && (
        <div
          id="modal-archive-vinculo-overlay"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn"
        >
          <div
            id="modal-archive-vinculo-content"
            className="bg-surface border border-border rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl relative"
          >
            {/* CABEÇALHO DO MODAL */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl border border-amber-500/20">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">Arquivar Vínculo Atual</h3>
                  <p className="text-xs text-text-muted mt-0.5">Encerramento de ciclo e vinculação por Escola e Mês/Ano</p>
                </div>
              </div>

              <button
                id="btn-close-archive-modal"
                onClick={handleCloseArchiveModal}
                disabled={isSubmittingArchive}
                className="p-2 text-text-muted hover:text-foreground rounded-xl hover:bg-surface-hover transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* AVISO EM LINGUAGEM CLARA */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-foreground space-y-2 text-sm leading-relaxed">
              <p className="font-semibold text-amber-400">
                Isso vai arquivar {activeStudentsCount} alunos e {activeActivitiesCount} atividades sob o identificador <span className="underline font-black">{nextVinculoCodePreview}</span>.
              </p>
              <p className="text-xs text-text-muted">
                Os dados deixam de aparecer nas turmas ativas, mas ficam salvos permanentemente e podem ser restaurados a qualquer momento quando você voltar a lecionar nesta escola.
              </p>
            </div>

            {/* FORMULÁRIO DE ARQUIVAMENTO */}
            <div className="space-y-4">
              {/* CAMPO 1: ESCOLA DO VÍNCULO */}
              <div>
                <label
                  htmlFor="archive-school-input"
                  className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-2"
                >
                  Escola de Vinculação:
                </label>
                <input
                  id="archive-school-input"
                  type="text"
                  value={archiveSchool}
                  onChange={(e) => setArchiveSchool(e.target.value)}
                  disabled={isSubmittingArchive}
                  placeholder="Nome da escola (ex: E.E.B. Professor...)"
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              {/* IDENTIFICADOR AUTOMÁTICO DO VÍNCULO */}
              <div className="p-3 rounded-xl bg-background border border-border flex items-center justify-between text-xs">
                <span className="text-text-muted font-medium">Identificador gerado (Mês/Ano):</span>
                <span className="font-black text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                  {nextVinculoCodePreview}
                </span>
              </div>

              {/* CAMPO 2: MOTIVO DO ARQUIVAMENTO */}
              <div>
                <label
                  htmlFor="archive-reason-input"
                  className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-2"
                >
                  Motivo do encerramento:
                </label>
                <input
                  id="archive-reason-input"
                  type="text"
                  value={archiveReason}
                  onChange={(e) => setArchiveReason(e.target.value)}
                  disabled={isSubmittingArchive}
                  placeholder="Ex.: Troca de vínculo ACT, Fim de Contrato, Fim do Ano Letivo..."
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              {/* CAMPO 3: PALAVRA DE CONFIRMAÇÃO */}
              <div>
                <label
                  htmlFor="archive-confirm-word-input"
                  className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-2"
                >
                  Digite <span className="text-amber-400 font-black underline">ARQUIVAR</span> para confirmar:
                </label>
                <input
                  id="archive-confirm-word-input"
                  type="text"
                  value={confirmWord}
                  onChange={(e) => setConfirmWord(e.target.value)}
                  disabled={isSubmittingArchive}
                  placeholder="Digite ARQUIVAR"
                  autoComplete="off"
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm font-mono tracking-wider text-foreground uppercase placeholder:normal-case placeholder:font-sans focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
            </div>

            {/* BOTÕES DE AÇÃO */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3 items-center justify-end">
              <button
                id="btn-cancel-archive"
                type="button"
                onClick={handleCloseArchiveModal}
                disabled={isSubmittingArchive}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-border hover:bg-surface-hover text-foreground font-semibold text-sm transition-colors cursor-pointer min-h-[44px]"
              >
                Cancelar
              </button>

              <button
                id="btn-confirm-archive-action"
                type="button"
                onClick={handleConfirmArchive}
                disabled={confirmWord.trim().toUpperCase() !== 'ARQUIVAR' || isSubmittingArchive}
                className="w-full sm:w-auto px-6 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
              >
                {isSubmittingArchive ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Arquivando vínculo...</span>
                  </>
                ) : (
                  <>
                    <Archive className="w-4 h-4" />
                    <span>Confirmar Arquivamento</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BackupView;
