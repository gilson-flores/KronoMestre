'use client';

import React, { useState } from 'react';
import {
  Plus,
  Minus,
  CheckCircle2,
  CheckCheck,
  BarChart3,
  AlertTriangle,
  AlertCircle,
  FileQuestion,
  FileText,
  Users2,
  BookOpen,
  Pencil,
  FileSpreadsheet,
  Trash2,
  TrendingUp,
  Layers,
  Award,
  Eye,
  EyeOff,
  ShieldAlert,
  ShieldCheck,
  Lock,
  X,
  CopyX,
  ClipboardX,
  Clock,
  RotateCcw,
  Sparkles,
  Gamepad2,
  Cpu,
} from 'lucide-react';
import { Activity, StudentUser } from '@/lib/types';
import {
  canStudentAccessActivity,
  doesTurmaHavePNEStudent,
  getActivityStudentAndSubmissionCounts,
  getCanonicalActivities,
  getUnifiedActivityMetrics,
  getSubmissionTotalGrade,
} from '@/lib/studentUtils';
import { AdaptActivityModal } from '@/components/modals/AdaptActivityModal';

interface DashboardViewProps {
  activities: Activity[];
  students?: StudentUser[];
  onOpenNewActivityModal: () => void;
  onSelectActivityForGrading: (act: Activity) => void;
  onEditActivity: (act: Activity) => void;
  onViewActivity?: (act: Activity) => void;
  onGenerateDossier: (act: Activity) => void;
  onDeleteActivity?: (act: Activity) => void;
  onSaveActivity?: (act: Activity) => void;
  onCreateAdaptedActivity?: (act: Activity) => void;
  onOpenParallelRecoveryModal?: (act: Activity) => void;
  title?: string;
  subtitle?: string;
  showStats?: boolean;
  isCorrecoesTab?: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  activities,
  students = [],
  onOpenNewActivityModal,
  onSelectActivityForGrading,
  onEditActivity,
  onViewActivity,
  onGenerateDossier,
  onDeleteActivity,
  onSaveActivity,
  onCreateAdaptedActivity,
  onOpenParallelRecoveryModal,
  title = 'Studio',
  subtitle = 'Gerencie avaliações, redações e dinâmicas das suas turmas.',
  showStats = true,
  isCorrecoesTab,
}) => {
  const isCorrecoes = isCorrecoesTab || title === 'Correções';
  const [statusTab, setStatusTab] = useState<'ativas' | 'inativas'>('ativas');
  const [activityFilter, setActivityFilter] = useState<'todas' | 'a_fazer' | 'a_corrigir' | 'corrigidas'>('todas');

  const parseDeadlineDateToISO = (str: string): string | null => {
    if (!str) return null;
    const isoMatch = str.match(/\b(20\d\d)-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b/);
    if (isoMatch) return isoMatch[0];
    const brMatch = str.match(/\b(0[1-9]|[12]\d|3[01])\/(0[1-9]|1[0-2])\/(20\d\d)\b/);
    if (brMatch) {
      const [, day, month, year] = brMatch;
      return `${year}-${month}-${day}`;
    }
    const brShortMatch = str.match(/\b(0[1-9]|[12]\d|3[01])\/(0[1-9]|1[0-2])\b/);
    if (brShortMatch) {
      const [, day, month] = brShortMatch;
      return `2026-${month}-${day}`;
    }
    return null;
  };

  const checkIsActivityActive = (act: Activity): boolean => {
    if (act.status === 'Inativo') return false;
    if (act.status === 'Prazo Encerrado') return false;
    const iso = parseDeadlineDateToISO(act.deadline);
    if (iso) {
      const todayISO = new Date().toISOString().split('T')[0];
      if (iso < todayISO) {
        return false;
      }
    }
    return true;
  };

  const getYearFromTurma = (turmaStr: string): number => {
    if (!turmaStr) return 999;
    const s = turmaStr.toLowerCase();
    if (s.includes('1º') || s.includes('1a') || s.includes('1ª') || s.includes('1.º') || /^1\d\d/.test(s) || s.startsWith('1')) return 1;
    if (s.includes('2º') || s.includes('2a') || s.includes('2ª') || s.includes('2.º') || /^2\d\d/.test(s) || s.startsWith('2')) return 2;
    if (s.includes('3º') || s.includes('3a') || s.includes('3ª') || s.includes('3.º') || /^3\d\d/.test(s) || s.startsWith('3')) return 3;
    const m = s.match(/\d/);
    if (m) {
      const v = parseInt(m[0], 10);
      if (v >= 1 && v <= 3) return v;
    }
    return 999;
  };

  const tabFilteredActivities = activities.filter((act) => {
    const isActive = checkIsActivityActive(act);
    return statusTab === 'ativas' ? isActive : !isActive;
  });

  const filteredActivities = tabFilteredActivities.filter((act) => {
    const { subCount, pendingCount, expectedStudentsCount } = getActivityStudentAndSubmissionCounts(act, activities, students);

    if (activityFilter === 'a_fazer') {
      return act.status === 'Ativo' || (expectedStudentsCount - subCount) > 0;
    }
    if (activityFilter === 'a_corrigir') {
      return pendingCount > 0;
    }
    if (activityFilter === 'corrigidas') {
      return pendingCount === 0 && subCount > 0;
    }
    return true;
  });

  // Organize by 1º Ano -> 2º Ano -> 3º Ano, with adaptations and parallel recoveries placed directly after their parent activity
  const buildOrderedActivities = (list: Activity[]) => {
    const parents = list.filter((a) => !a.adaptedFromId && !a.isAdapted && !a.recoveryFromId && !a.isRecovery);
    const childrenList = list.filter((a) => Boolean(a.adaptedFromId) || Boolean(a.isAdapted) || Boolean(a.recoveryFromId) || Boolean(a.isRecovery));
    const visitedIds = new Set<string>();

    const sortedParents = [...parents].sort((a, b) => {
      const yearA = getYearFromTurma(a.turma);
      const yearB = getYearFromTurma(b.turma);
      if (yearA !== yearB) return yearA - yearB;
      return (a.turma || '').localeCompare(b.turma || '');
    });

    const result: {
      activity: Activity;
      isChild: boolean;
      childType?: 'adaptation' | 'recovery';
      parentTitle?: string;
    }[] = [];

    sortedParents.forEach((parent) => {
      visitedIds.add(parent.id);
      result.push({ activity: parent, isChild: false });

      const children = childrenList.filter(
        (child) =>
          child.adaptedFromId === parent.id ||
          child.recoveryFromId === parent.id ||
          (child.title && parent.title && child.title.toLowerCase().includes(parent.title.toLowerCase().slice(0, 15)))
      );

      children.forEach((child) => {
        if (!visitedIds.has(child.id)) {
          visitedIds.add(child.id);
          const isRec = Boolean(child.isRecovery || child.recoveryFromId || child.title?.startsWith('[Recuperação'));
          result.push({
            activity: child,
            isChild: true,
            childType: isRec ? 'recovery' : 'adaptation',
            parentTitle: parent.title,
          });
        }
      });
    });

    const remaining = list.filter((a) => !visitedIds.has(a.id));
    const sortedRemaining = [...remaining].sort((a, b) => {
      const yearA = getYearFromTurma(a.turma);
      const yearB = getYearFromTurma(b.turma);
      if (yearA !== yearB) return yearA - yearB;
      return (a.turma || '').localeCompare(b.turma || '');
    });

    sortedRemaining.forEach((rem) => {
      const isChild = Boolean(rem.isAdapted || rem.adaptedFromId || rem.isRecovery || rem.recoveryFromId);
      const isRec = Boolean(rem.isRecovery || rem.recoveryFromId || rem.title?.startsWith('[Recuperação'));
      result.push({
        activity: rem,
        isChild,
        childType: isChild ? (isRec ? 'recovery' : 'adaptation') : undefined,
      });
    });

    return result;
  };

  const orderedActivityItems = buildOrderedActivities(filteredActivities);
  const [activityToDelete, setActivityToDelete] = useState<Activity | null>(null);
  const [securityModalActivity, setSecurityModalActivity] = useState<Activity | null>(null);
  const [adaptModalActivity, setAdaptModalActivity] = useState<Activity | null>(null);

  // State for collapsible retractable activity rows
  const [expandedActivityIds, setExpandedActivityIds] = useState<Record<string, boolean>>({});

  const toggleActivityExpand = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedActivityIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const expandAllActivities = () => {
    const all: Record<string, boolean> = {};
    orderedActivityItems.forEach(({ activity }) => {
      all[activity.id] = true;
    });
    setExpandedActivityIds(all);
  };

  const collapseAllActivities = () => {
    setExpandedActivityIds({});
  };

  // Local state inside security modal
  const [secFocusLock, setSecFocusLock] = useState(false);
  const [secCopyStatement, setSecCopyStatement] = useState(false);
  const [secPasteEssay, setSecPasteEssay] = useState(false);

  const handleOpenSecurityModal = (act: Activity) => {
    setSecurityModalActivity(act);
    setSecFocusLock(Boolean(act.securityFocusLock));
    setSecCopyStatement(Boolean(act.securityBlockCopyStatement));
    setSecPasteEssay(Boolean(act.securityBlockPasteEssay));
  };

  const handleSaveSecuritySettings = () => {
    if (!securityModalActivity) return;
    const updated: Activity = {
      ...securityModalActivity,
      securityFocusLock: secFocusLock,
      securityBlockCopyStatement: secCopyStatement,
      securityBlockPasteEssay: secPasteEssay,
    };
    if (onSaveActivity) {
      onSaveActivity(updated);
    }
    setSecurityModalActivity(null);
  };

  // Calculate top KPI stats from real state (Central + Adapted unified)
  const canonicalActivities = getCanonicalActivities(activities);
  const totalActivities = canonicalActivities.length;
  const totalSubmissions = canonicalActivities.reduce((acc, a) => {
    const { subCount } = getUnifiedActivityMetrics(a, activities, students || []);
    return acc + subCount;
  }, 0);
  const totalExpected = canonicalActivities.reduce((acc, a) => {
    const { expectedStudentsCount } = getUnifiedActivityMetrics(a, activities, students || []);
    return acc + expectedStudentsCount;
  }, 0);
  const completionRate = totalExpected > 0 ? Math.min(100, Math.round((totalSubmissions / totalExpected) * 100)) : 0;
  const pendingCorrections = canonicalActivities.reduce((acc, a) => {
    const { pendingCount } = getUnifiedActivityMetrics(a, activities, students || []);
    return acc + pendingCount;
  }, 0);

  let totalScoreSum = 0;
  let totalGradedCount = 0;
  activities.forEach((act) => {
    (act.submissions || []).forEach((s) => {
      if (s.status === 'graded' || (s.essayScore !== undefined && s.essayScore !== null) || Number(s.objectiveScore) > 0) {
        totalScoreSum += getSubmissionTotalGrade(s);
        totalGradedCount += 1;
      }
    });
  });
  const overallAverage = totalGradedCount > 0 ? (totalScoreSum / totalGradedCount).toFixed(1) : '0.0';

  // Stats grouped by type (Production per type)
  const statsByType = {
    Avaliação: canonicalActivities.filter((a) => a.type === 'Avaliação'),
    Simulado: canonicalActivities.filter((a) => a.type === 'Simulado'),
    Redação: canonicalActivities.filter((a) => a.type === 'Redação'),
    Dinâmica: canonicalActivities.filter((a) => a.type === 'Dinâmica'),
    'Trabalho em grupo': canonicalActivities.filter((a) => a.type === 'Trabalho em grupo'),
    'Projeto de pesquisa': canonicalActivities.filter((a) => a.type === 'Projeto de pesquisa'),
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            {title}
          </h1>
          <p className="text-sm md:text-base text-[#bccabb] mt-1 font-medium">
            {subtitle}
          </p>
        </div>

        {!isCorrecoes && (
          <button
            onClick={onOpenNewActivityModal}
            className="self-start sm:self-center py-3 px-6 bg-[#4ade80] hover:bg-[#6bfb9a] text-[#003919] font-bold rounded-full transition-all duration-200 flex items-center gap-2 shadow-lg shadow-[#4ade80]/20 cursor-pointer text-sm"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span>Nova Atividade</span>
          </button>
        )}
      </div>

      {/* Atividades Recentes List */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>Missões & Atividades</span>
              <span className="text-xs font-normal text-[#bccabb]">
                ({orderedActivityItems.length} {orderedActivityItems.length === 1 ? 'item' : 'itens'})
              </span>
            </h2>
          </div>

          {/* Primary Tabs: Ativas vs Inativas */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-[#131b2e] p-1 rounded-2xl border border-white/10 text-xs">
              <button
                onClick={() => setStatusTab('ativas')}
                className={`px-4 py-2 rounded-xl font-extrabold transition-all cursor-pointer flex items-center gap-2 ${
                  statusTab === 'ativas'
                    ? 'bg-[#4ade80] text-[#003919] shadow-md shadow-[#4ade80]/20'
                    : 'text-[#bccabb] hover:text-white'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Ativas</span>
                <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-black/20 font-mono">
                  {activities.filter(checkIsActivityActive).length}
                </span>
              </button>

              <button
                onClick={() => setStatusTab('inativas')}
                className={`px-4 py-2 rounded-xl font-extrabold transition-all cursor-pointer flex items-center gap-2 ${
                  statusTab === 'inativas'
                    ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                    : 'text-[#bccabb] hover:text-white'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-rose-300" />
                <span>Inativas / Encerradas</span>
                <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-black/20 font-mono">
                  {activities.filter((a) => !checkIsActivityActive(a)).length}
                </span>
              </button>
            </div>

            {/* Secondary List Sub-Filter Tabs */}
            <div className="flex items-center gap-1 bg-[#131b2e] p-1 rounded-xl border border-white/10 text-xs overflow-x-auto">
              <button
                onClick={() => setActivityFilter('todas')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activityFilter === 'todas'
                    ? 'bg-[#1d273d] text-[#4ade80] border border-[#4ade80]/30'
                    : 'text-[#bccabb] hover:text-white'
                }`}
              >
                Todas
              </button>
              <button
                onClick={() => setActivityFilter('a_fazer')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activityFilter === 'a_fazer'
                    ? 'bg-[#1d273d] text-[#4ade80] border border-[#4ade80]/30'
                    : 'text-[#bccabb] hover:text-white'
                }`}
              >
                📜 A Fazer
              </button>
              <button
                onClick={() => setActivityFilter('a_corrigir')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activityFilter === 'a_corrigir'
                    ? 'bg-[#1d273d] text-[#4ade80] border border-[#4ade80]/30'
                    : 'text-[#bccabb] hover:text-white'
                }`}
              >
                ⏳ A Corrigir ({pendingCorrections})
              </button>
              <button
                onClick={() => setActivityFilter('corrigidas')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activityFilter === 'corrigidas'
                    ? 'bg-[#1d273d] text-[#4ade80] border border-[#4ade80]/30'
                    : 'text-[#bccabb] hover:text-white'
                }`}
              >
                ✅ Corrigidas
              </button>
            </div>

            {/* Quick Expand / Collapse All Controls */}
            {orderedActivityItems.length > 0 && (
              <div className="flex items-center gap-1 bg-[#131b2e] p-1 rounded-xl border border-white/10 text-xs ml-auto">
                <button
                  type="button"
                  onClick={expandAllActivities}
                  className="px-2.5 py-1.5 rounded-lg font-bold text-[#4ade80] hover:bg-white/5 transition-all flex items-center gap-1 cursor-pointer"
                  title="Expandir todas as atividades (+)"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span className="hidden sm:inline">Expandir Todas</span>
                </button>
                <span className="text-white/20">|</span>
                <button
                  type="button"
                  onClick={collapseAllActivities}
                  className="px-2.5 py-1.5 rounded-lg font-bold text-[#bccabb] hover:text-white hover:bg-white/5 transition-all flex items-center gap-1 cursor-pointer"
                  title="Recolher todas as atividades (-)"
                >
                  <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span className="hidden sm:inline">Recolher Todas</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2.5">
          {orderedActivityItems.length === 0 ? (
            <div className="glass-panel p-12 text-center rounded-3xl border border-white/10 text-[#bccabb] space-y-2">
              <p className="font-bold text-white text-base">
                {statusTab === 'ativas'
                  ? 'Nenhuma missão ativa encontrada para este filtro.'
                  : 'Nenhuma missão inativa ou encerrada no momento.'}
              </p>
              <p className="text-xs text-[#bccabb]">
                {statusTab === 'ativas'
                  ? 'Clique em "+ Nova Atividade" para criar novos pergaminhos ou troque o filtro acima.'
                  : 'Atividades cujas datas limites expirarem aparecerão aqui automaticamente. Edite uma atividade inativa alterando sua data limite para que ela volte para a aba de Ativas!'}
              </p>
            </div>
          ) : (
            orderedActivityItems.map(({ activity: act, isChild, childType, parentTitle }) => {
              let Icon = FileText;
              if (act.type === 'Simulado') Icon = FileQuestion;
              if (act.type === 'Dinâmica' || act.type === 'Trabalho em grupo') Icon = Users2;
              if (act.type === 'Projeto de pesquisa') Icon = BookOpen;

              const isExpanded = Boolean(expandedActivityIds[act.id]);

              // Calculate unified and breakdown metrics
              const unifiedMetrics = getUnifiedActivityMetrics(act, activities, students || []);

              // Calculate submission and status breakdowns using PNE deduction helper
              const {
                expectedStudentsCount,
                subCount,
                gradedCount,
                pendingCount,
                ret1x,
                ret2x,
                ret3x,
              } = getActivityStudentAndSubmissionCounts(act, activities, students || []);

              const isRecoveryChild = isChild && childType === 'recovery';
              const isAdaptationChild = isChild && childType === 'adaptation';

              return (
                <div key={act.id} className={isChild ? (isRecoveryChild ? 'ml-3 sm:ml-6 md:ml-8 pl-2.5 sm:pl-4 border-l-2 border-indigo-500/50 relative' : 'ml-3 sm:ml-6 md:ml-8 pl-2.5 sm:pl-4 border-l-2 border-amber-500/40 relative') : ''}>
                  {isRecoveryChild && (
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-3 py-0.5 rounded-xl w-fit mb-1.5 shadow-sm">
                      <RotateCcw className="w-3 h-3 text-indigo-400" />
                      <span>└── Recuperação Paralela {act.recoveryApproach ? `(${act.recoveryApproach})` : ''}</span>
                      {parentTitle && <span className="text-[#bccabb]">vinculada à avaliação &quot;{parentTitle}&quot;</span>}
                    </div>
                  )}

                  {isAdaptationChild && (
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-3 py-0.5 rounded-xl w-fit mb-1.5 shadow-sm">
                      <span>└── Adaptação Pedagógica</span>
                      {parentTitle && <span className="text-[#bccabb]">da atividade &quot;{parentTitle}&quot;</span>}
                    </div>
                  )}

                  <div
                    className={`glass-panel rounded-2xl md:rounded-3xl transition-all duration-200 border border-white/10 hover:border-[#4ade80]/40 ${
                      pendingCount > 0 ? 'ring-1 ring-[#4ade80]/30' : ''
                    } ${isRecoveryChild ? 'bg-indigo-500/[0.03]' : isAdaptationChild ? 'bg-amber-500/[0.03]' : ''} ${
                      isExpanded ? 'p-4 sm:p-5 md:p-6 shadow-xl' : 'p-3 sm:p-4 hover:bg-[#131b2e]/70'
                    }`}
                  >
                    {/* Linha Principal Otimizada (Nome da Atividade, Turma e Botão +/-) */}
                    <div
                      onClick={() => toggleActivityExpand(act.id)}
                      className="flex items-center justify-between gap-3 cursor-pointer select-none"
                    >
                      {/* Left: Botão +/-, Ícone, Nome da Atividade e Turma */}
                      <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
                        {/* Botão + e - Retrátil */}
                        <button
                          type="button"
                          onClick={(e) => toggleActivityExpand(act.id, e)}
                          className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                            isExpanded
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                              : 'bg-[#1d273d] text-[#4ade80] border-[#4ade80]/30 hover:bg-[#283654] hover:scale-105 shadow-sm'
                          }`}
                          title={isExpanded ? 'Recolher atividade (-)' : 'Expandir atividade (+)'}
                        >
                          {isExpanded ? (
                            <Minus className="w-4 h-4 stroke-[2.5]" />
                          ) : (
                            <Plus className="w-4 h-4 stroke-[2.5]" />
                          )}
                        </button>

                        {/* Ícone do Tipo */}
                        <div className="w-8 h-8 rounded-xl bg-[#1d273d] border border-white/10 text-[#4ade80] flex items-center justify-center shrink-0 hidden sm:flex">
                          <Icon className="w-4 h-4" />
                        </div>

                        {/* Nome da Atividade & Turma na Mesma Linha */}
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 min-w-0 flex-1">
                          <h3 className="text-sm sm:text-base font-bold text-white leading-tight truncate">
                            {act.title}
                          </h3>

                          {/* Turma Badge */}
                          <span className="text-[11px] font-semibold bg-[#171f33] text-[#bccabb] px-2.5 py-0.5 rounded-full border border-white/5 whitespace-nowrap shrink-0">
                            Turma: <strong className="text-white">{act.turma}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Right: Badges Resumidos na Linha */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Status Badge */}
                        <span
                          className={`text-[10px] sm:text-[11px] font-bold px-2.5 sm:px-3 py-0.5 rounded-full whitespace-nowrap ${
                            act.status === 'Ativo'
                              ? 'bg-[#4ade80]/20 text-[#4ade80] border border-[#4ade80]/30'
                              : act.status === 'Prazo Encerrado'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-slate-700/50 text-slate-300 border border-slate-600'
                          }`}
                        >
                          {act.status}
                        </span>

                        {/* PNE Tag Compacta */}
                        {act.isAdapted && (
                          <span className="hidden md:inline-flex text-[10px] font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30 items-center gap-1">
                            <Sparkles className="w-3 h-3 text-amber-400" />
                            <span>PNE</span>
                          </span>
                        )}

                        {/* Pendentes a Corrigir na linha */}
                        {pendingCount > 0 && (
                          <span className="text-[10px] sm:text-[11px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 sm:px-2.5 py-0.5 rounded-full hidden sm:inline-flex items-center gap-1">
                            ⏳ {pendingCount} a corrigir
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Janela Retrátil Estendida (Ao Clicar no +) */}
                    {isExpanded && (
                      <div className="space-y-4 pt-4 mt-3 border-t border-white/10 animate-fadeIn">
                        {/* Informações detalhadas, Badges e Metadados */}
                        <div className="space-y-2.5">
                          {/* Badges de Travas e Adaptações */}
                          <div className="flex flex-wrap items-center gap-2">
                            {act.isAdapted && act.adaptationType === 'severe_playful' && (
                              <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1" title="Jogo Lúdico Gamificado em HTML (Síndromes Severas)">
                                <Gamepad2 className="w-3 h-3 text-amber-400" />
                                <span>PNE Lúdica (Jogo)</span>
                              </span>
                            )}
                            {act.isAdapted && act.adaptationType === 'mild_moderate' && (
                              <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1" title="Atividade Adaptada Leve/Moderada (50% questões, 2 alternativas, sem caracteres mín.)">
                                <Cpu className="w-3 h-3 text-emerald-400" />
                                <span>PNE Leve/Mod</span>
                              </span>
                            )}
                            {act.isAdapted && !act.adaptationType && (
                              <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1" title="Atividade Adaptada para PNE">
                                <Sparkles className="w-3 h-3 text-amber-400" />
                                <span>Adaptada PNE</span>
                              </span>
                            )}
                            {act.securityFocusLock && (
                              <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1" title="Trava de Foco: Avisos ao mudar de tela (auto-entrega no 4º desvio)">
                                <ShieldAlert className="w-3 h-3 text-amber-400" />
                                <span>Trava de Foco</span>
                              </span>
                            )}
                            {act.securityBlockCopyStatement && (
                              <span className="text-[10px] font-bold bg-rose-500/20 text-rose-300 px-2.5 py-0.5 rounded-full border border-rose-500/30 flex items-center gap-1" title="Cópia dos enunciados bloqueada">
                                <CopyX className="w-3 h-3 text-rose-400" />
                                <span>Sem Cópia</span>
                              </span>
                            )}
                            {act.securityBlockPasteEssay && (
                              <span className="text-[10px] font-bold bg-purple-500/20 text-purple-300 px-2.5 py-0.5 rounded-full border border-purple-500/30 flex items-center gap-1" title="Colar em respostas dissertativas bloqueado">
                                <ClipboardX className="w-3 h-3 text-purple-400" />
                                <span>Sem Cola</span>
                              </span>
                            )}
                          </div>

                          {/* Prazo e Desglose de Entregas com distinção de Recuperação */}
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="px-3 py-1 rounded-xl text-xs font-bold bg-[#131b2e] text-amber-300 border border-amber-500/30 flex items-center gap-1.5 shadow-sm">
                              <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span>Prazo Limite: {act.deadline || 'Sem data'}</span>
                            </span>

                            {unifiedMetrics.hasRecovery ? (
                              <>
                                <span className="px-3 py-1 rounded-xl text-xs font-bold bg-[#131b2e] text-white border border-white/10 flex items-center gap-1.5" title="Alunos que entregaram na 1ª chamada regular">
                                  <span>👥 1ª Chamada:</span>
                                  <strong className="text-white">{unifiedMetrics.breakdown.mainCount}/{unifiedMetrics.expectedStudentsCount}</strong>
                                  <span className="text-[10px] text-[#4ade80]">({unifiedMetrics.breakdown.mainRate}%)</span>
                                </span>

                                <span className="px-3 py-1 rounded-xl text-xs font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5" title="Entregas na Recuperação Paralela">
                                  <RotateCcw className="w-3 h-3 text-indigo-400" />
                                  <span>Recuperação:</span>
                                  <strong className="text-indigo-200">{unifiedMetrics.breakdown.recoveryCount}</strong>
                                  {unifiedMetrics.breakdown.recoveryOnlyCount > 0 && (
                                    <span className="text-[10px] text-indigo-300">({unifiedMetrics.breakdown.recoveryOnlyCount} novas pós-prazo)</span>
                                  )}
                                </span>

                                <span className="px-3 py-1 rounded-xl text-xs font-extrabold bg-[#4ade80]/15 text-[#4ade80] border border-[#4ade80]/30 flex items-center gap-1.5" title="Engajamento Total Consolidado (sem duplicidade)">
                                  <span>🎯 Total Unificado: {unifiedMetrics.subCount}/{unifiedMetrics.expectedStudentsCount} ({unifiedMetrics.completionRate}%)</span>
                                </span>
                              </>
                            ) : isRecoveryChild ? (
                              <span className="px-3 py-1 rounded-xl text-xs font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5">
                                <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
                                <span>Entregas nesta Recuperação: {subCount}</span>
                                <span className="text-[10px] text-indigo-300/80">(integradas ao total da avaliação)</span>
                              </span>
                            ) : subCount > 0 ? (
                              <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-[#131b2e] text-white border border-white/10 flex items-center gap-1.5">
                                👥 {subCount}/{expectedStudentsCount} Entregas ({unifiedMetrics.completionRate}%)
                              </span>
                            ) : (
                              <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-[#131b2e] text-[#bccabb] border border-white/5">
                                📜 0/{expectedStudentsCount} Entregas (Pendente)
                              </span>
                            )}

                            {pendingCount > 0 && (
                              <span className="px-3 py-1 rounded-xl text-xs font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5">
                                ⏳ {pendingCount} A Corrigir pelo Sensei
                              </span>
                            )}

                            {gradedCount > 0 && (
                              <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                                ✅ {gradedCount} Corrigidas
                              </span>
                            )}

                            {ret1x > 0 && (
                              <span className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-orange-500/15 text-orange-300 border border-orange-500/30">
                                ↩️ {ret1x} Devolvida 1x
                              </span>
                            )}
                            {ret2x > 0 && (
                              <span className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-orange-600/20 text-orange-200 border border-orange-500/40">
                                ↩️ {ret2x} Devolvida 2x
                              </span>
                            )}
                            {ret3x > 0 && (
                              <span className="px-2.5 py-1 rounded-xl text-xs font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                🚨 {ret3x} Devolvida 3x
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Botões de Ação na Janela Retrátil */}
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10"
                        >
                          {onViewActivity && (
                            <button
                              onClick={() => onViewActivity(act)}
                              className="flex-1 sm:flex-none px-4 py-2.5 bg-[#1d273d] hover:bg-[#283654] text-[#dae2fd] hover:text-white rounded-full text-xs font-bold border border-white/10 flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[42px]"
                              title="Ver detalhes e formulário da atividade"
                            >
                              <Eye className="w-4 h-4 text-sky-400 shrink-0" />
                              <span>Abrir Atividade</span>
                            </button>
                          )}

                          <button
                            onClick={() => onSelectActivityForGrading(act)}
                            className="flex-1 sm:flex-none px-4 py-2.5 bg-[#4ade80] hover:bg-[#6bfb9a] text-[#003919] font-bold rounded-full text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-[#4ade80]/10 cursor-pointer min-h-[42px]"
                          >
                            <CheckCheck className="w-4 h-4 stroke-[2.5] shrink-0" />
                            <span>{pendingCount > 0 ? `Corrigir (${pendingCount})` : 'Acessar Correções'}</span>
                          </button>

                          {!isCorrecoes && (
                            <>
                              {onOpenParallelRecoveryModal && !isChild && !unifiedMetrics.hasRecovery && (
                                <button
                                  onClick={() => onOpenParallelRecoveryModal(act)}
                                  className="flex-1 sm:flex-none px-4 py-2.5 bg-[#171f33] hover:bg-[#222a3d] text-indigo-300 hover:text-indigo-200 rounded-full text-xs font-bold border border-indigo-500/30 flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[42px]"
                                  title="Criar Recuperação Paralela com abordagem diferente vinculada a esta atividade"
                                >
                                  <RotateCcw className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                  <span>Criar Recuperação Paralela</span>
                                </button>
                              )}

                              <button
                                onClick={() => handleOpenSecurityModal(act)}
                                className="flex-1 sm:flex-none px-4 py-2.5 bg-[#171f33] hover:bg-[#222a3d] text-[#dae2fd] hover:text-white rounded-full text-xs font-bold border border-white/10 flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[42px]"
                                title="Configurar Trava de Foco, Cópia de Enunciado e Cola de Redação"
                              >
                                <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                <span>Anti-Cola</span>
                                {(act.securityFocusLock || act.securityBlockCopyStatement || act.securityBlockPasteEssay) && (
                                  <span className="w-2 h-2 rounded-full bg-[#4ade80]" />
                                )}
                              </button>

                              {doesTurmaHavePNEStudent(act.turma, students) && (
                                <button
                                  onClick={() => setAdaptModalActivity(act)}
                                  className="flex-1 sm:flex-none px-4 py-2.5 bg-[#171f33] hover:bg-[#222a3d] text-amber-300 hover:text-amber-200 rounded-full text-xs font-bold border border-amber-500/20 flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[42px]"
                                  title="Adaptar Atividade para PNE (Metade das questões e 2 alternativas por objetiva)"
                                >
                                  <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                  <span>Adaptar (PNE)</span>
                                </button>
                              )}

                              <button
                                onClick={() => onEditActivity(act)}
                                className="flex-1 sm:flex-none px-4 py-2.5 bg-[#171f33] hover:bg-[#222a3d] text-[#dae2fd] hover:text-white rounded-full text-xs font-bold border border-white/10 flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[42px]"
                              >
                                <Pencil className="w-3.5 h-3.5 text-[#4ade80] shrink-0" />
                                <span>Editar</span>
                              </button>

                              {onSaveActivity && (
                                <button
                                  onClick={() => {
                                    onSaveActivity({
                                      ...act,
                                      status: act.status === 'Inativo' ? 'Ativo' : 'Inativo'
                                    });
                                  }}
                                  className={`flex-1 sm:flex-none px-4 py-2.5 ${act.status === 'Inativo' ? 'bg-[#4ade80]/10 hover:bg-[#4ade80]/20 text-[#4ade80] border-[#4ade80]/20' : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 border-rose-500/20'} rounded-full text-xs font-bold border flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[42px]`}
                                  title={act.status === 'Inativo' ? "Ativar (Mostrar para aluno)" : "Desativar (Ocultar do aluno)"}
                                >
                                  {act.status === 'Inativo' ? <Eye className="w-3.5 h-3.5 shrink-0" /> : <EyeOff className="w-3.5 h-3.5 shrink-0" />}
                                  <span>{act.status === 'Inativo' ? "Ativar" : "Desativar"}</span>
                                </button>
                              )}
                            </>
                          )}

                          {act.status === 'Prazo Encerrado' && (
                            <button
                              onClick={() => onGenerateDossier(act)}
                              className="flex-1 sm:flex-none px-4 py-2.5 bg-[#171f33] hover:bg-[#222a3d] text-[#dae2fd] rounded-full text-xs font-bold border border-white/10 flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[42px]"
                            >
                              <FileSpreadsheet className="w-3.5 h-3.5 text-[#c0c1ff] shrink-0" />
                              <span>Gerar Dossiê</span>
                            </button>
                          )}

                          {!isCorrecoes && onDeleteActivity && (
                            <button
                              onClick={() => setActivityToDelete(act)}
                              className="px-3.5 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 rounded-full text-xs font-bold border border-rose-500/20 flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[42px]"
                              title="Excluir Atividade"
                            >
                              <Trash2 className="w-3.5 h-3.5 shrink-0" />
                              <span>Excluir</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Custom Delete Confirmation Modal */}
      {activityToDelete && (() => {
        const toDeleteSubs = activityToDelete.submissions || [];
        const hasAppliedGradesOrWork = toDeleteSubs.length > 0 && toDeleteSubs.some(
          (s) =>
            s.status === 'graded' ||
            s.status === 'pending' ||
            s.status === 'returned' ||
            s.status === 'draft' ||
            (s.essayScore !== undefined && s.essayScore !== null) ||
            (s.objectiveScore !== undefined && s.objectiveScore > 0) ||
            Boolean(s.essayAnswer) ||
            Boolean(s.submittedAt)
        );
        const allRcoSigned = toDeleteSubs.length > 0 && toDeleteSubs.every((s) => Boolean(s.registeredInStateSystem));
        const isDeleteBlocked = hasAppliedGradesOrWork && !allRcoSigned;

        return (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-[#0e172a] border border-white/15 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center gap-3 text-rose-400">
                <div className="p-3 bg-rose-500/10 rounded-2xl border border-rose-500/20">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Excluir Atividade</h3>
                  <p className="text-xs text-[#bccabb]">Esta ação é irreversível.</p>
                </div>
              </div>

              <p className="text-xs text-[#dae2fd] bg-[#131b2e] p-4 rounded-2xl border border-white/5 leading-relaxed">
                Tem certeza que deseja excluir a atividade <strong className="text-white">&quot;{activityToDelete.title}&quot;</strong>? Todas as entregas e correções associadas a ela serão removidas.
              </p>

              {isDeleteBlocked && (
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-300 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                  <div className="space-y-1">
                    <strong className="block text-white font-bold">Exclusão Bloqueada (RCO Pendente)</strong>
                    <p className="text-[#dae2fd] text-[11px] leading-relaxed">
                      Esta atividade contém notas aplicadas ou atividades realizadas pelos alunos. A exclusão só é permitida se o botão RCO estiver assinado em todas as entregas.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setActivityToDelete(null)}
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-full text-xs font-bold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isDeleteBlocked}
                  onClick={() => {
                    if (isDeleteBlocked) return;
                    if (onDeleteActivity) {
                      onDeleteActivity(activityToDelete);
                    }
                    setActivityToDelete(null);
                  }}
                  className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all shadow-md ${
                    isDeleteBlocked
                      ? 'bg-rose-500/40 text-white/50 cursor-not-allowed border border-rose-500/20'
                      : 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20 cursor-pointer'
                  }`}
                >
                  {isDeleteBlocked ? 'Exclusão Bloqueada (RCO Pendente)' : 'Sim, Excluir Atividade'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Anti-Cola Security Configuration Modal */}
      {securityModalActivity && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn overflow-y-auto">
          <div className="bg-[#0e172a] border border-white/15 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-6 relative my-auto">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-white/10 pb-4 pr-8">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20 shrink-0">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-white">Seguranças Anti-Cola (Studio)</h3>
                  <p className="text-xs text-[#bccabb]">
                    Atividade: <span className="text-white font-semibold">{securityModalActivity.title}</span> ({securityModalActivity.turma})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSecurityModalActivity(null)}
                className="p-2 text-[#bccabb] hover:text-white rounded-full hover:bg-white/5 transition-colors cursor-pointer absolute top-4 right-4 min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Toggles */}
            <div className="space-y-4">
              
              {/* Trava 1: Trava de Foco */}
              <div className="bg-[#131b2e] p-4 rounded-2xl border border-white/10 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <ShieldAlert className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">1. Trava de Foco (Desvio de Tela)</h4>
                      <p className="text-[11px] text-amber-300 font-semibold">
                        Aviso ao sair da tela • Máx 4 avisos • Auto-entrega
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSecFocusLock(!secFocusLock)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer min-h-[38px] ${
                      secFocusLock
                        ? 'bg-[#4ade80] text-[#003919] shadow-md shadow-[#4ade80]/10'
                        : 'bg-[#171f33] text-[#bccabb] border border-white/10'
                    }`}
                  >
                    {secFocusLock ? 'ATIVADA' : 'DESATIVADA'}
                  </button>
                </div>
                <p className="text-[11px] text-[#bccabb] leading-relaxed pl-1 pt-1 border-t border-white/5">
                  Se o aluno mudar de aba, janela ou aplicativo durante a prova, recebe um alerta. No 4º aviso, a atividade é finalizada e entregue automaticamente do jeito que está.
                </p>
              </div>

              {/* Trava 2: Trava de Cópia dos Enunciados */}
              <div className="bg-[#131b2e] p-4 rounded-2xl border border-white/10 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                      <CopyX className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">2. Trava de Cópia dos Enunciados</h4>
                      <p className="text-[11px] text-rose-300 font-semibold">
                        Bloqueia seleção e Ctrl+C nos enunciados
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSecCopyStatement(!secCopyStatement)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer min-h-[38px] ${
                      secCopyStatement
                        ? 'bg-[#4ade80] text-[#003919] shadow-md shadow-[#4ade80]/10'
                        : 'bg-[#171f33] text-[#bccabb] border border-white/10'
                    }`}
                  >
                    {secCopyStatement ? 'ATIVADA' : 'DESATIVADA'}
                  </button>
                </div>
                <p className="text-[11px] text-[#bccabb] leading-relaxed pl-1 pt-1 border-t border-white/5">
                  Cancela a seleção de texto, atalho de cópia (Ctrl+C) e o menu de contexto do botão direito nos textos e questões da atividade.
                </p>
              </div>

              {/* Trava 3: Trava de Copia e Cola nas Respostas Dissertativas */}
              <div className="bg-[#131b2e] p-4 rounded-2xl border border-white/10 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      <ClipboardX className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">3. Trava de Colar nas Respostas Dissertativas</h4>
                      <p className="text-[11px] text-purple-300 font-semibold">
                        Bloqueia Ctrl+V nas caixas de resposta
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSecPasteEssay(!secPasteEssay)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer min-h-[38px] ${
                      secPasteEssay
                        ? 'bg-[#4ade80] text-[#003919] shadow-md shadow-[#4ade80]/10'
                        : 'bg-[#171f33] text-[#bccabb] border border-white/10'
                    }`}
                  >
                    {secPasteEssay ? 'ATIVADA' : 'DESATIVADA'}
                  </button>
                </div>
                <p className="text-[11px] text-[#bccabb] leading-relaxed pl-1 pt-1 border-t border-white/5">
                  Cancela a ação de colar textos (Ctrl+V) ou arrastar arquivos para dentro dos campos de resposta dissertativa / redação.
                </p>
              </div>

            </div>

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setSecurityModalActivity(null)}
                className="px-5 py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-full text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveSecuritySettings}
                className="px-6 py-2.5 bg-[#4ade80] hover:bg-[#6bfb9a] text-[#003919] font-extrabold rounded-full text-xs transition-all shadow-md cursor-pointer flex items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Salvar Seguranças</span>
              </button>
            </div>

          </div>
        </div>
      )}
      {/* Custom Adapt Activity for PNE Modal */}
      {adaptModalActivity && (
        <AdaptActivityModal
          key={adaptModalActivity.id}
          activity={adaptModalActivity}
          students={students}
          isOpen={Boolean(adaptModalActivity)}
          onClose={() => setAdaptModalActivity(null)}
          onCreateAdaptedActivity={(adapted) => {
            if (onCreateAdaptedActivity) {
              onCreateAdaptedActivity(adapted);
            }
          }}
          onUpdateActivityWithAdaptation={(updated) => {
            if (onSaveActivity) {
              onSaveActivity(updated);
            }
          }}
        />
      )}
    </div>
  );
};

export default DashboardView;
