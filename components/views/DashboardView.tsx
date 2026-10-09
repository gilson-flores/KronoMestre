'use client';

import React, { useState, useMemo } from 'react';
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
  Filter,
  SlidersHorizontal,
  Search,
  ChevronDown,
  ChevronUp,
  Users,
  Check
} from 'lucide-react';
import { Activity, StudentUser } from '@/lib/types';
import {
  canStudentAccessActivity,
  doesTurmaHavePNEStudent,
  getActivityStudentAndSubmissionCounts,
  getCanonicalActivities,
  getUnifiedActivityMetrics,
  getSubmissionTotalGrade,
  isActivityAdapted,
} from '@/lib/studentUtils';
import { AdaptActivityModal } from '@/components/modals/AdaptActivityModal';
import { KronoIcon } from '@/components/ui/KronoIcon';

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
  const [statusTab, setStatusTab] = useState<'ativas' | 'inativas' | 'todas'>('ativas');
  const [activityFilter, setActivityFilter] = useState<'todas' | 'a_fazer' | 'a_corrigir' | 'corrigidas' | 'adaptadas' | 'kronogames' | 'recuperacao'>('todas');
  const [turmaFilter, setTurmaFilter] = useState<string>('todas');
  const [typeFilter, setTypeFilter] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'turma' | 'deadline' | 'pending' | 'title'>('turma');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [isCentralAeeOpen, setIsCentralAeeOpen] = useState(false);

  // Turmas e tipos disponíveis extraídos dinamicamente
  const availableTurmas = useMemo(() => {
    const set = new Set<string>();
    activities.forEach((a) => {
      if (a.turma) set.add(a.turma);
    });
    students.forEach((s) => {
      if (s.turma) set.add(s.turma);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [activities, students]);

  const availableTypes = useMemo(() => {
    const set = new Set<string>();
    activities.forEach((a) => {
      if (a.type) set.add(a.type);
    });
    return Array.from(set).sort();
  }, [activities]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (activityFilter !== 'todas') count++;
    if (turmaFilter !== 'todas') count++;
    if (typeFilter !== 'todos') count++;
    if (searchQuery.trim() !== '') count++;
    if (sortBy !== 'turma') count++;
    if (statusTab !== 'ativas') count++;
    return count;
  }, [activityFilter, turmaFilter, typeFilter, searchQuery, sortBy, statusTab]);

  const handleClearAllFilters = () => {
    setStatusTab('ativas');
    setActivityFilter('todas');
    setTurmaFilter('todas');
    setTypeFilter('todos');
    setSearchQuery('');
    setSortBy('turma');
  };

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
    if (statusTab === 'todas') return true;
    const isActive = checkIsActivityActive(act);
    return statusTab === 'ativas' ? isActive : !isActive;
  });

  const filteredActivities = tabFilteredActivities.filter((act) => {
    // 1. Filtro por Turma
    if (turmaFilter !== 'todas') {
      const matchesTurma =
        act.turma === turmaFilter ||
        canStudentAccessActivity(act.turma, turmaFilter) ||
        (act.turma && act.turma.toLowerCase().includes(turmaFilter.toLowerCase()));
      if (!matchesTurma) return false;
    }

    // 2. Filtro por Tipo de Atividade
    if (typeFilter !== 'todos') {
      if (typeFilter === 'kronogames') {
        if (!act.isGameActivity && !act.gameData && act.type !== 'Jogo Avaliativo') return false;
      } else if (act.type !== typeFilter) {
        return false;
      }
    }

    // 3. Busca Textual (Título, Disciplina, Tema ou Turma)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchesTitle = act.title?.toLowerCase().includes(q);
      const matchesSubject = act.subject?.toLowerCase().includes(q);
      const matchesTopic = act.topic?.toLowerCase().includes(q);
      const matchesTurma = act.turma?.toLowerCase().includes(q);
      if (!matchesTitle && !matchesSubject && !matchesTopic && !matchesTurma) return false;
    }

    // 4. Situação Pedagógica
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
    if (activityFilter === 'adaptadas') {
      return isActivityAdapted(act);
    }
    if (activityFilter === 'kronogames') {
      return Boolean(act.isGameActivity || act.gameData || act.type === 'Jogo Avaliativo');
    }
    if (activityFilter === 'recuperacao') {
      return Boolean(act.isRecovery || act.recoveryFromId || act.title?.toLowerCase().includes('recuperação'));
    }

    return true;
  });

  // Organize by 1º Ano -> 2º Ano -> 3º Ano, with adaptations and parallel recoveries placed directly after their parent activity
  const buildOrderedActivities = React.useCallback((list: Activity[]) => {
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
  }, []);

  const orderedActivityItems: Array<{
    activity: Activity;
    isChild: boolean;
    childType?: 'adaptation' | 'recovery';
    parentTitle?: string;
  }> = useMemo(() => {
    if (sortBy === 'deadline') {
      const sorted = [...filteredActivities].sort((a, b) => {
        const da = parseDeadlineDateToISO(a.deadline) || '9999-99-99';
        const db = parseDeadlineDateToISO(b.deadline) || '9999-99-99';
        return da.localeCompare(db);
      });
      return sorted.map((activity) => ({ activity, isChild: false }));
    }

    if (sortBy === 'pending') {
      const sorted = [...filteredActivities].sort((a, b) => {
        const pa = getActivityStudentAndSubmissionCounts(a, activities, students).pendingCount;
        const pb = getActivityStudentAndSubmissionCounts(b, activities, students).pendingCount;
        return pb - pa;
      });
      return sorted.map((activity) => ({ activity, isChild: false }));
    }

    if (sortBy === 'title') {
      const sorted = [...filteredActivities].sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      return sorted.map((activity) => ({ activity, isChild: false }));
    }

    return buildOrderedActivities(filteredActivities);
  }, [filteredActivities, sortBy, activities, students, buildOrderedActivities]);
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
          <h1 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">
            {title}
          </h1>
          <p className="text-sm md:text-base text-text-muted mt-1 font-medium">
            {subtitle}
          </p>
        </div>

        {!isCorrecoes && (
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setIsCentralAeeOpen(true)}
              className="w-full sm:w-auto py-2.5 px-5 bg-gradient-to-r from-amber-500/20 via-emerald-500/15 to-primary/20 hover:from-amber-500/30 hover:to-primary/30 text-amber-300 font-extrabold rounded-full border border-amber-500/30 transition-all duration-200 flex items-center justify-center gap-2.5 shadow-lg cursor-pointer text-xs sm:text-sm min-h-[44px]"
            >
              <KronoIcon icon={Sparkles} variant="mystic" size="xs" />
              <span>Central AEE / Adaptadas</span>
            </button>
            <button
              onClick={onOpenNewActivityModal}
              className="w-full sm:w-auto py-2.5 px-6 bg-primary hover:bg-primary-hover text-white font-bold rounded-full transition-all duration-200 flex items-center justify-center gap-2.5 shadow-lg shadow-primary/20 cursor-pointer text-sm min-h-[44px]"
            >
              <KronoIcon icon={Plus} variant="emerald" size="xs" />
              <span>Nova Atividade</span>
            </button>
          </div>
        )}
      </div>

      {/* Atividades Recentes List */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-foreground tracking-tight flex items-center gap-2 truncate">
              <span>Missões & Atividades</span>
              <span className="text-xs font-normal text-text-muted shrink-0">
                ({orderedActivityItems.length} {orderedActivityItems.length === 1 ? 'item' : 'itens'})
              </span>
            </h2>
          </div>

          {/* Primary Tabs & Botão de Acesso a Filtros */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {/* Status Rápido: Ativas vs Inativas */}
            <div className="flex items-center bg-surface p-1 rounded-2xl border border-border text-xs w-full sm:w-auto justify-center sm:justify-start">
              <button
                type="button"
                onClick={() => setStatusTab('ativas')}
                className={`flex-1 sm:flex-none px-3.5 sm:px-4 py-2 rounded-xl font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2 min-h-[38px] ${
                  statusTab === 'ativas'
                    ? 'bg-primary text-white shadow-md shadow-primary/20'
                    : 'text-text-muted hover:text-foreground'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span>Ativas</span>
                <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-black/20 font-mono">
                  {activities.filter(checkIsActivityActive).length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setStatusTab('inativas')}
                className={`flex-1 sm:flex-none px-3.5 sm:px-4 py-2 rounded-xl font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2 min-h-[38px] ${
                  statusTab === 'inativas'
                    ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                    : 'text-text-muted hover:text-foreground'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-rose-300 shrink-0" />
                <span>Inativas / Encerradas</span>
                <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-black/20 font-mono">
                  {activities.filter((a) => !checkIsActivityActive(a)).length}
                </span>
              </button>
            </div>

            {/* BOTÃO DE ACESSO A FILTROS */}
            <button
              type="button"
              onClick={() => setIsFilterPanelOpen((prev) => !prev)}
              className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer border min-h-[38px] active:scale-95 ${
                isFilterPanelOpen || activeFiltersCount > 0
                  ? 'bg-gradient-to-r from-primary to-emerald-600 text-white border-primary shadow-lg shadow-primary/20 scale-[1.02]'
                  : 'bg-surface hover:bg-surface-hover text-foreground border-border'
              }`}
            >
              <KronoIcon
                icon={SlidersHorizontal}
                variant={isFilterPanelOpen || activeFiltersCount > 0 ? 'emerald' : 'badge'}
                size="xs"
              />
              <span>Filtros</span>
              {activeFiltersCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-white/20 text-white font-mono">
                  {activeFiltersCount}
                </span>
              )}
              {isFilterPanelOpen ? (
                <ChevronUp className="w-3.5 h-3.5 shrink-0 opacity-80" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-80" />
              )}
            </button>

            {/* Limpar Filtros Rápido */}
            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={handleClearAllFilters}
                className="px-3 py-2 rounded-2xl text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 transition-all flex items-center gap-1.5 cursor-pointer min-h-[38px] active:scale-95"
                title="Limpar todos os filtros ativos"
              >
                <X className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">Limpar</span>
              </button>
            )}

            {/* Quick Expand / Collapse All Controls */}
            {orderedActivityItems.length > 0 && (
              <div className="flex items-center gap-1 bg-surface p-1 rounded-xl border border-border text-xs ml-auto">
                <button
                  type="button"
                  onClick={expandAllActivities}
                  className="px-2.5 py-1.5 rounded-lg font-bold text-primary hover:bg-surface-hover transition-all flex items-center gap-1 cursor-pointer min-h-[34px]"
                  title="Expandir todas as atividades (+)"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span className="hidden sm:inline">Expandir Todas</span>
                </button>
                <span className="text-foreground/20">|</span>
                <button
                  type="button"
                  onClick={collapseAllActivities}
                  className="px-2.5 py-1.5 rounded-lg font-bold text-text-muted hover:text-foreground hover:bg-surface-hover transition-all flex items-center gap-1 cursor-pointer min-h-[34px]"
                  title="Recolher todas as atividades (-)"
                >
                  <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span className="hidden sm:inline">Recolher Todas</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* PAINEL REFINADO DE FILTROS AVANÇADOS (EXPANSÍVEL PELO BOTÃO) */}
        {isFilterPanelOpen && (
          <div className="glass-panel p-4 sm:p-6 rounded-3xl border border-primary/30 bg-surface/95 backdrop-blur-md shadow-2xl space-y-4 animate-fadeIn">
            {/* Cabeçalho do Painel */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-primary">
                <SlidersHorizontal className="w-4 h-4" />
                <span>Refinamento de Filtros da Turma</span>
              </div>
              <div className="flex items-center gap-3">
                {activeFiltersCount > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllFilters}
                    className="text-xs text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Redefinir Filtros</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsFilterPanelOpen(false)}
                  className="p-1 rounded-xl text-text-muted hover:text-foreground hover:bg-surface-hover transition-all cursor-pointer"
                  title="Fechar painel de filtros"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Linha 1: Campo de Busca com ícone e limpar */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar missão por título, matéria, tema ou turma..."
                className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-background border border-border text-foreground placeholder-text-muted text-xs sm:text-sm focus:outline-none focus:border-primary transition-all shadow-inner"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-foreground p-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Linha 2: Grade de Filtros Refinados */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Filtro por Turma */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-primary" />
                  <span>Turma</span>
                </label>
                <select
                  value={turmaFilter}
                  onChange={(e) => setTurmaFilter(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl bg-background border border-border text-foreground text-xs focus:outline-none focus:border-primary cursor-pointer font-medium"
                >
                  <option value="todas">Todas as Turmas ({availableTurmas.length})</option>
                  {availableTurmas.map((t) => (
                    <option key={t} value={t}>
                      Turma {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro por Situação Pedagógica */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider block">
                  Situação Pedagógica
                </label>
                <select
                  value={activityFilter}
                  onChange={(e) => setActivityFilter(e.target.value as any)}
                  className="w-full py-2.5 px-3 rounded-xl bg-background border border-border text-foreground text-xs focus:outline-none focus:border-primary cursor-pointer font-medium"
                >
                  <option value="todas">Todas as Situações</option>
                  <option value="a_fazer">📜 A Fazer (Pendentes de Alunos)</option>
                  <option value="a_corrigir">⏳ A Corrigir ({pendingCorrections})</option>
                  <option value="corrigidas">✅ Corrigidas / Concluídas</option>
                  <option value="adaptadas">🌟 Adaptadas AEE ({activities.filter(isActivityAdapted).length})</option>
                  <option value="kronogames">🎮 KronoGames ({activities.filter((a) => a.isGameActivity || a.gameData || a.type === 'Jogo Avaliativo').length})</option>
                  <option value="recuperacao">🔄 Recuperações Paralelas</option>
                </select>
              </div>

              {/* Filtro por Tipo de Atividade */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider block">
                  Tipo de Atividade
                </label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl bg-background border border-border text-foreground text-xs focus:outline-none focus:border-primary cursor-pointer font-medium"
                >
                  <option value="todos">Todos os Tipos</option>
                  {availableTypes.map((tp) => (
                    <option key={tp} value={tp}>
                      {tp}
                    </option>
                  ))}
                  <option value="kronogames">🎮 Jogo Avaliativo (KronoGames)</option>
                </select>
              </div>

              {/* Ordenação */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider block">
                  Ordenação
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full py-2.5 px-3 rounded-xl bg-background border border-border text-foreground text-xs focus:outline-none focus:border-primary cursor-pointer font-medium"
                >
                  <option value="turma">Estrutura por Ano / Turma (Padrão)</option>
                  <option value="deadline">Prazo mais Próximo</option>
                  <option value="pending">Mais Correções Pendentes</option>
                  <option value="title">Título (Ordem Alfabética A-Z)</option>
                </select>
              </div>
            </div>

            {/* Chips de Acesso Rápido a Situações */}
            <div className="pt-2 border-t border-border flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted mr-1">
                Atalhos:
              </span>
              {[
                { id: 'todas', label: 'Todas' },
                { id: 'a_fazer', label: '📜 A Fazer' },
                { id: 'a_corrigir', label: `⏳ A Corrigir (${pendingCorrections})` },
                { id: 'corrigidas', label: '✅ Corrigidas' },
                { id: 'adaptadas', label: `🌟 Adaptadas AEE (${activities.filter(isActivityAdapted).length})` },
                { id: 'kronogames', label: '🎮 KronoGames' },
                { id: 'recuperacao', label: '🔄 Recuperação' },
              ].map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setActivityFilter(pill.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    activityFilter === pill.id
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-background text-text-muted hover:text-foreground border border-border'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {/* Rodapé informativo */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-text-muted gap-2">
              <span>
                Exibindo <strong className="text-foreground">{orderedActivityItems.length}</strong> de <strong className="text-foreground">{activities.length}</strong> atividades cadastradas.
              </span>
              <button
                type="button"
                onClick={() => setIsFilterPanelOpen(false)}
                className="px-4 py-1.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl text-xs transition-all cursor-pointer self-end sm:self-auto shadow-md"
              >
                Aplicar e Fechar
              </button>
            </div>
          </div>
        )}

        {/* Chips de Filtros Ativos quando o painel estiver recolhido */}
        {!isFilterPanelOpen && activeFiltersCount > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 p-2.5 bg-surface/60 rounded-2xl border border-border text-xs">
            <span className="text-[11px] font-bold text-text-muted flex items-center gap-1 mr-1">
              <Filter className="w-3.5 h-3.5 text-primary" />
              <span>Filtros ativos:</span>
            </span>

            {searchQuery && (
              <span className="px-2.5 py-1 rounded-lg bg-primary/15 text-primary border border-primary/30 font-semibold flex items-center gap-1.5">
                <span>Busca: &quot;{searchQuery}&quot;</span>
                <button type="button" onClick={() => setSearchQuery('')} className="hover:text-foreground cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {turmaFilter !== 'todas' && (
              <span className="px-2.5 py-1 rounded-lg bg-primary/15 text-primary border border-primary/30 font-semibold flex items-center gap-1.5">
                <span>Turma: {turmaFilter}</span>
                <button type="button" onClick={() => setTurmaFilter('todas')} className="hover:text-foreground cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {activityFilter !== 'todas' && (
              <span className="px-2.5 py-1 rounded-lg bg-primary/15 text-primary border border-primary/30 font-semibold flex items-center gap-1.5">
                <span>Situação: {activityFilter}</span>
                <button type="button" onClick={() => setActivityFilter('todas')} className="hover:text-foreground cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {typeFilter !== 'todos' && (
              <span className="px-2.5 py-1 rounded-lg bg-primary/15 text-primary border border-primary/30 font-semibold flex items-center gap-1.5">
                <span>Tipo: {typeFilter}</span>
                <button type="button" onClick={() => setTypeFilter('todos')} className="hover:text-foreground cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {sortBy !== 'turma' && (
              <span className="px-2.5 py-1 rounded-lg bg-primary/15 text-primary border border-primary/30 font-semibold flex items-center gap-1.5">
                <span>Ordem: {sortBy}</span>
                <button type="button" onClick={() => setSortBy('turma')} className="hover:text-foreground cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={handleClearAllFilters}
              className="text-rose-400 hover:text-rose-300 font-bold ml-auto text-xs underline cursor-pointer"
            >
              Limpar todos
            </button>
          </div>
        )}

        <div className="space-y-2.5">
          {orderedActivityItems.length === 0 ? (
            <div className="glass-panel p-12 text-center rounded-3xl border border-border text-text-muted space-y-2">
              <p className="font-bold text-foreground text-base">
                {statusTab === 'ativas'
                  ? 'Nenhuma missão ativa encontrada para este filtro.'
                  : 'Nenhuma missão inativa ou encerrada no momento.'}
              </p>
              <p className="text-xs text-text-muted">
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
                <div key={act.id} className={isChild ? (isRecoveryChild ? 'ml-3 sm:ml-6 md:ml-8 pl-2.5 sm:pl-4 border-l-2 border-indigo-500/50 relative' : 'ml-3 sm:ml-6 md:ml-8 pl-2.5 sm:pl-4 border-l-2 border-amber-200 relative') : ''}>
                  {isRecoveryChild && (
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-600 bg-indigo-500/10 border border-indigo-500/20 px-3 py-0.5 rounded-xl w-fit mb-1.5 shadow-sm">
                      <RotateCcw className="w-3 h-3 text-indigo-400" />
                      <span>└── Recuperação Paralela {act.recoveryApproach ? `(${act.recoveryApproach})` : ''}</span>
                      {parentTitle && <span className="text-text-muted">vinculada à avaliação &quot;{parentTitle}&quot;</span>}
                    </div>
                  )}

                  {isAdaptationChild && (
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-600 bg-amber-500/10 border border-amber-500/20 px-3 py-0.5 rounded-xl w-fit mb-1.5 shadow-sm">
                      <span>└── Adaptação Pedagógica</span>
                      {parentTitle && <span className="text-text-muted">da atividade &quot;{parentTitle}&quot;</span>}
                    </div>
                  )}

                  <div
                    className={`glass-panel rounded-2xl md:rounded-3xl transition-all duration-200 border border-border hover:border-primary/40 ${
                      pendingCount > 0 ? 'ring-1 ring-[#4ade80]/30' : ''
                    } ${isRecoveryChild ? 'bg-indigo-500/[0.03]' : isAdaptationChild ? 'bg-amber-500/[0.03]' : ''} ${
                      isExpanded ? 'p-3.5 sm:p-5 md:p-6 shadow-xl' : 'p-3 sm:p-4 hover:bg-surface/70'
                    }`}
                  >
                    {/* Linha Principal Otimizada (Nome da Atividade, Turma e Botão +/-) */}
                    <div
                      onClick={() => toggleActivityExpand(act.id)}
                      className="flex items-center justify-between gap-2.5 sm:gap-3 cursor-pointer select-none min-w-0"
                    >
                      {/* Left: Botão +/-, Ícone, Nome da Atividade e Turma */}
                      <div className="flex items-center gap-2 sm:gap-3.5 min-w-0 flex-1">
                        {/* Botão + e - Retrátil */}
                        <button
                          type="button"
                          onClick={(e) => toggleActivityExpand(act.id, e)}
                          className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all cursor-pointer shrink-0 min-h-[32px] min-w-[32px] ${
                            isExpanded
                              ? 'bg-amber-100 text-amber-600 border-amber-200 hover:bg-amber-500/30'
                              : 'bg-[#1d273d] text-primary border-primary/30 hover:bg-[#283654] hover:scale-105 shadow-sm'
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
                        <div className="w-8 h-8 rounded-xl bg-[#1d273d] border border-border text-primary flex items-center justify-center shrink-0 hidden sm:flex">
                          <Icon className="w-4 h-4" />
                        </div>

                        {/* Nome da Atividade & Turma na Mesma Linha */}
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0 flex-1">
                          <h3 className="text-xs sm:text-base font-bold text-foreground leading-snug break-words truncate max-w-full">
                            {act.title}
                          </h3>

                          {/* Turma Badge */}
                          <span className="text-[10px] sm:text-[11px] font-semibold bg-[#171f33] text-text-muted px-2 sm:px-2.5 py-0.5 rounded-full border border-border whitespace-nowrap shrink-0">
                            Turma: <strong className="text-foreground">{act.turma}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Right: Badges Resumidos na Linha */}
                      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        {/* Status Badge */}
                        <span
                          className={`text-[10px] sm:text-[11px] font-bold px-2 sm:px-3 py-0.5 rounded-full whitespace-nowrap ${
                            act.status === 'Ativo'
                              ? 'bg-primary/20 text-primary border border-primary/30'
                              : act.status === 'Prazo Encerrado'
                              ? 'bg-rose-100 text-rose-600 border border-rose-500/30'
                              : 'bg-slate-700/50 text-text-muted border border-slate-600'
                          }`}
                        >
                          {act.status}
                        </span>

                        {/* PNE Tag Compacta */}
                        {act.isAdapted && (
                          <span className="hidden md:inline-flex text-[10px] font-bold bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full border border-amber-500/30 items-center gap-1">
                            <Sparkles className="w-3 h-3 text-amber-400" />
                            <span>PNE</span>
                          </span>
                        )}

                        {/* Pendentes a Corrigir na linha */}
                        {pendingCount > 0 && (
                          <span className="text-[10px] sm:text-[11px] font-extrabold bg-amber-100 text-amber-600 border border-amber-200 px-2 sm:px-2.5 py-0.5 rounded-full hidden sm:inline-flex items-center gap-1">
                            ⏳ {pendingCount} a corrigir
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Janela Retrátil Estendida (Ao Clicar no +) */}
                    {isExpanded && (
                      <div className="space-y-4 pt-4 mt-3 border-t border-border animate-fadeIn">
                        {/* Informações detalhadas, Badges e Metadados */}
                        <div className="space-y-2.5">
                          {/* Badges de Travas e Adaptações */}
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                            {act.isAdapted && act.adaptationType === 'severe_playful' && (
                              <span className="text-[10px] font-bold bg-amber-100 text-amber-600 px-2.5 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1" title="Jogo Lúdico Gamificado em HTML (Síndromes Severas)">
                                <Gamepad2 className="w-3 h-3 text-amber-400" />
                                <span>PNE Lúdica (Jogo)</span>
                              </span>
                            )}
                            {act.isAdapted && act.adaptationType === 'mild_moderate' && (
                              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-600 px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1" title="Atividade Adaptada Leve/Moderada (50% questões, 2 alternativas, sem caracteres mín.)">
                                <Cpu className="w-3 h-3 text-emerald-400" />
                                <span>PNE Leve/Mod</span>
                              </span>
                            )}
                            {act.isAdapted && !act.adaptationType && (
                              <span className="text-[10px] font-bold bg-amber-100 text-amber-600 px-2.5 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1" title="Atividade Adaptada para PNE">
                                <Sparkles className="w-3 h-3 text-amber-400" />
                                <span>Adaptada PNE</span>
                              </span>
                            )}
                            {act.securityFocusLock && (
                              <span className="text-[10px] font-bold bg-amber-100 text-amber-600 px-2.5 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1" title="Trava de Foco: Avisos ao mudar de tela (auto-entrega no 4º desvio)">
                                <ShieldAlert className="w-3 h-3 text-amber-400" />
                                <span>Trava de Foco</span>
                              </span>
                            )}
                            {act.securityBlockCopyStatement && (
                              <span className="text-[10px] font-bold bg-rose-100 text-rose-600 px-2.5 py-0.5 rounded-full border border-rose-500/30 flex items-center gap-1" title="Cópia dos enunciados bloqueada">
                                <CopyX className="w-3 h-3 text-rose-400" />
                                <span>Sem Cópia</span>
                              </span>
                            )}
                            {act.securityBlockPasteEssay && (
                              <span className="text-[10px] font-bold bg-purple-100 text-purple-600 px-2.5 py-0.5 rounded-full border border-purple-500/30 flex items-center gap-1" title="Colar em respostas dissertativas bloqueado">
                                <ClipboardX className="w-3 h-3 text-purple-400" />
                                <span>Sem Cola</span>
                              </span>
                            )}
                          </div>

                          {/* Prazo e Desglose de Entregas com distinção de Recuperação */}
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs">
                            <span className="px-2.5 sm:px-3 py-1 rounded-xl text-xs font-bold bg-surface text-amber-600 border border-amber-500/30 flex items-center gap-1.5 shadow-sm">
                              <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span>Prazo Limite: {act.deadline || 'Sem data'}</span>
                            </span>

                            {unifiedMetrics.hasRecovery ? (
                              <>
                                <span className="px-2.5 sm:px-3 py-1 rounded-xl text-xs font-bold bg-surface text-foreground border border-border flex items-center gap-1.5" title="Alunos que entregaram na 1ª chamada regular">
                                  <span>👥 1ª Chamada:</span>
                                  <strong className="text-foreground">{unifiedMetrics.breakdown.mainCount}/{unifiedMetrics.expectedStudentsCount}</strong>
                                  <span className="text-[10px] text-primary">({unifiedMetrics.breakdown.mainRate}%)</span>
                                </span>

                                <span className="px-2.5 sm:px-3 py-1 rounded-xl text-xs font-bold bg-indigo-500/10 text-indigo-600 border border-indigo-500/30 flex items-center gap-1.5" title="Entregas na Recuperação Paralela">
                                  <RotateCcw className="w-3 h-3 text-indigo-400 shrink-0" />
                                  <span>Recuperação:</span>
                                  <strong className="text-indigo-200">{unifiedMetrics.breakdown.recoveryCount}</strong>
                                  {unifiedMetrics.breakdown.recoveryOnlyCount > 0 && (
                                    <span className="text-[10px] text-indigo-600">({unifiedMetrics.breakdown.recoveryOnlyCount} novas pós-prazo)</span>
                                  )}
                                </span>

                                <span className="px-2.5 sm:px-3 py-1 rounded-xl text-xs font-extrabold bg-primary/15 text-primary border border-primary/30 flex items-center gap-1.5" title="Engajamento Total Consolidado (sem duplicidade)">
                                  <span>🎯 Total Unificado: {unifiedMetrics.subCount}/{unifiedMetrics.expectedStudentsCount} ({unifiedMetrics.completionRate}%)</span>
                                </span>
                              </>
                            ) : isRecoveryChild ? (
                              <span className="px-2.5 sm:px-3 py-1 rounded-xl text-xs font-bold bg-indigo-500/15 text-indigo-600 border border-indigo-500/30 flex items-center gap-1.5">
                                <RotateCcw className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                <span>Entregas nesta Recuperação: {subCount}</span>
                                <span className="text-[10px] text-indigo-600/80">(integradas ao total da avaliação)</span>
                              </span>
                            ) : subCount > 0 ? (
                              <span className="px-2.5 sm:px-3 py-1 rounded-xl text-xs font-semibold bg-surface text-foreground border border-border flex items-center gap-1.5">
                                👥 {subCount}/{expectedStudentsCount} Entregas ({unifiedMetrics.completionRate}%)
                              </span>
                            ) : (
                              <span className="px-2.5 sm:px-3 py-1 rounded-xl text-xs font-semibold bg-surface text-text-muted border border-border">
                                📜 0/{expectedStudentsCount} Entregas (Pendente)
                              </span>
                            )}

                            {pendingCount > 0 && (
                              <span className="px-2.5 sm:px-3 py-1 rounded-xl text-xs font-extrabold bg-amber-100 text-amber-600 border border-amber-200 flex items-center gap-1.5">
                                ⏳ {pendingCount} A Corrigir pelo Professor
                              </span>
                            )}

                            {gradedCount > 0 && (
                              <span className="px-2.5 sm:px-3 py-1 rounded-xl text-xs font-semibold bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 flex items-center gap-1.5">
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
                              <span className="px-2.5 py-1 rounded-xl text-xs font-extrabold bg-rose-100 text-rose-600 border border-rose-200">
                                🚨 {ret3x} Devolvida 3x
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Botões de Ação na Janela Retrátil */}
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="flex flex-wrap items-center gap-2 pt-3 border-t border-border w-full"
                        >
                          {onViewActivity && (
                            <button
                              onClick={() => onViewActivity(act)}
                              className="flex-1 min-w-[130px] sm:min-w-0 sm:flex-none px-3.5 sm:px-4 py-2.5 bg-[#1d273d] hover:bg-[#283654] text-foreground hover:text-foreground rounded-full text-xs font-bold border border-border flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[44px]"
                              title="Ver detalhes e formulário da atividade"
                            >
                              <Eye className="w-4 h-4 text-sky-400 shrink-0" />
                              <span>Abrir Atividade</span>
                            </button>
                          )}

                          <button
                            onClick={() => onSelectActivityForGrading(act)}
                            className="flex-1 min-w-[130px] sm:min-w-0 sm:flex-none px-4 py-2.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-full text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-[#4ade80]/10 cursor-pointer min-h-[44px]"
                          >
                            <CheckCheck className="w-4 h-4 stroke-[2.5] shrink-0" />
                            <span>{pendingCount > 0 ? `Corrigir (${pendingCount})` : 'Acessar Correções'}</span>
                          </button>

                          {!isCorrecoes && (
                            <>
                              {onOpenParallelRecoveryModal && !isChild && !unifiedMetrics.hasRecovery && (
                                <button
                                  onClick={() => onOpenParallelRecoveryModal(act)}
                                  className="flex-1 min-w-[130px] sm:min-w-0 sm:flex-none px-3.5 sm:px-4 py-2.5 bg-[#171f33] hover:bg-surface-hover text-indigo-600 hover:text-indigo-200 rounded-full text-xs font-bold border border-indigo-500/30 flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[44px]"
                                  title="Criar Recuperação Paralela com abordagem diferente vinculada a esta atividade"
                                >
                                  <RotateCcw className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                  <span>Criar Recuperação</span>
                                </button>
                              )}

                              <button
                                onClick={() => handleOpenSecurityModal(act)}
                                className="flex-1 min-w-[110px] sm:min-w-0 sm:flex-none px-3.5 sm:px-4 py-2.5 bg-[#171f33] hover:bg-surface-hover text-foreground hover:text-foreground rounded-full text-xs font-bold border border-border flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[44px]"
                                title="Configurar Trava de Foco, Cópia de Enunciado e Cola de Redação"
                              >
                                <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                <span>Anti-Cola</span>
                                {(act.securityFocusLock || act.securityBlockCopyStatement || act.securityBlockPasteEssay) && (
                                  <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                                )}
                              </button>

                              {doesTurmaHavePNEStudent(act.turma, students) && (
                                <button
                                  onClick={() => setAdaptModalActivity(act)}
                                  className="flex-1 min-w-[120px] sm:min-w-0 sm:flex-none px-3.5 sm:px-4 py-2.5 bg-[#171f33] hover:bg-surface-hover text-amber-600 hover:text-amber-200 rounded-full text-xs font-bold border border-amber-500/20 flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[44px]"
                                  title="Adaptar Atividade para PNE (Metade das questões e 2 alternativas por objetiva)"
                                >
                                  <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                  <span>Adaptar (PNE)</span>
                                </button>
                              )}

                              <button
                                onClick={() => onEditActivity(act)}
                                className="flex-1 min-w-[90px] sm:min-w-0 sm:flex-none px-3.5 sm:px-4 py-2.5 bg-[#171f33] hover:bg-surface-hover text-foreground hover:text-foreground rounded-full text-xs font-bold border border-border flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[44px]"
                              >
                                <Pencil className="w-3.5 h-3.5 text-primary shrink-0" />
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
                                  className={`flex-1 min-w-[100px] sm:min-w-0 sm:flex-none px-3.5 sm:px-4 py-2.5 ${act.status === 'Inativo' ? 'bg-primary/10 hover:bg-primary/20 text-primary border-primary/20' : 'bg-rose-500/10 hover:bg-rose-100 text-rose-600 hover:text-rose-200 border-rose-500/20'} rounded-full text-xs font-bold border flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[44px]`}
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
                              className="flex-1 min-w-[120px] sm:min-w-0 sm:flex-none px-3.5 sm:px-4 py-2.5 bg-[#171f33] hover:bg-surface-hover text-foreground rounded-full text-xs font-bold border border-border flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[44px]"
                            >
                              <FileSpreadsheet className="w-3.5 h-3.5 text-[#c0c1ff] shrink-0" />
                              <span>Gerar Dossiê</span>
                            </button>
                          )}

                          {!isCorrecoes && onDeleteActivity && (
                            <button
                              onClick={() => setActivityToDelete(act)}
                              className="flex-1 min-w-[90px] sm:min-w-0 sm:flex-none px-3.5 py-2.5 bg-rose-500/10 hover:bg-rose-100 text-rose-600 hover:text-rose-200 rounded-full text-xs font-bold border border-rose-500/20 flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[44px]"
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
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fadeIn overflow-y-auto">
            <div className="bg-surface border border-white/15 rounded-2xl sm:rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl space-y-4 my-auto max-h-[90vh] overflow-y-auto">
              <div className="flex items-center gap-3 text-rose-400">
                <div className="p-3 bg-rose-500/10 rounded-2xl border border-rose-500/20 shrink-0">
                  <Trash2 className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-bold text-foreground truncate">Excluir Atividade</h3>
                  <p className="text-xs text-text-muted">Esta ação é irreversível.</p>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-foreground bg-surface p-3.5 sm:p-4 rounded-2xl border border-border leading-relaxed break-words">
                Tem certeza que deseja excluir a atividade <strong className="text-foreground">&quot;{activityToDelete.title}&quot;</strong>? Todas as entregas e correções associadas a ela serão removidas.
              </p>

              {isDeleteBlocked && (
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-600 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                  <div className="space-y-1">
                    <strong className="block text-foreground font-bold">Exclusão Bloqueada (RCO Pendente)</strong>
                    <p className="text-foreground text-[11px] leading-relaxed">
                      Esta atividade contém notas aplicadas ou atividades realizadas pelos alunos. A exclusão só é permitida se o botão RCO estiver assinado em todas as entregas.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setActivityToDelete(null)}
                  className="px-4 py-2.5 bg-surface-hover hover:bg-white/15 text-foreground rounded-full text-xs font-bold transition-all cursor-pointer min-h-[44px] flex items-center justify-center"
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
                  className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all shadow-md min-h-[44px] flex items-center justify-center text-center ${
                    isDeleteBlocked
                      ? 'bg-rose-500/40 text-foreground/50 cursor-not-allowed border border-rose-500/20'
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fadeIn overflow-y-auto">
          <div className="bg-surface border border-white/15 rounded-2xl sm:rounded-3xl p-4 sm:p-6 max-w-lg w-full shadow-2xl space-y-4 sm:space-y-6 relative my-auto max-h-[92vh] overflow-y-auto custom-scrollbar">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-border pb-3 sm:pb-4 pr-10">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="p-2.5 sm:p-3 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20 shrink-0">
                  <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-extrabold text-foreground truncate">Seguranças Anti-Cola (Studio)</h3>
                  <p className="text-xs text-text-muted truncate">
                    Atividade: <span className="text-foreground font-semibold">{securityModalActivity.title}</span> ({securityModalActivity.turma})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSecurityModalActivity(null)}
                className="p-2 text-text-muted hover:text-foreground rounded-full hover:bg-surface-hover transition-colors cursor-pointer absolute top-3 sm:top-4 right-3 sm:right-4 min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Toggles */}
            <div className="space-y-4">
              
              {/* Trava 1: Trava de Foco */}
              <div className="bg-surface p-4 rounded-2xl border border-border space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <ShieldAlert className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground">1. Trava de Foco (Desvio de Tela)</h4>
                      <p className="text-[11px] text-amber-600 font-semibold">
                        Aviso ao sair da tela • Máx 4 avisos • Auto-entrega
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSecFocusLock(!secFocusLock)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer min-h-[38px] ${
                      secFocusLock
                        ? 'bg-primary text-white shadow-md shadow-[#4ade80]/10'
                        : 'bg-[#171f33] text-text-muted border border-border'
                    }`}
                  >
                    {secFocusLock ? 'ATIVADA' : 'DESATIVADA'}
                  </button>
                </div>
                <p className="text-[11px] text-text-muted leading-relaxed pl-1 pt-1 border-t border-border">
                  Se o aluno mudar de aba, janela ou aplicativo durante a prova, recebe um alerta. No 4º aviso, a atividade é finalizada e entregue automaticamente do jeito que está.
                </p>
              </div>

              {/* Trava 2: Trava de Cópia dos Enunciados */}
              <div className="bg-surface p-4 rounded-2xl border border-border space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                      <CopyX className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground">2. Trava de Cópia dos Enunciados</h4>
                      <p className="text-[11px] text-rose-600 font-semibold">
                        Bloqueia seleção e Ctrl+C nos enunciados
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSecCopyStatement(!secCopyStatement)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer min-h-[38px] ${
                      secCopyStatement
                        ? 'bg-primary text-white shadow-md shadow-[#4ade80]/10'
                        : 'bg-[#171f33] text-text-muted border border-border'
                    }`}
                  >
                    {secCopyStatement ? 'ATIVADA' : 'DESATIVADA'}
                  </button>
                </div>
                <p className="text-[11px] text-text-muted leading-relaxed pl-1 pt-1 border-t border-border">
                  Cancela a seleção de texto, atalho de cópia (Ctrl+C) e o menu de contexto do botão direito nos textos e questões da atividade.
                </p>
              </div>

              {/* Trava 3: Trava de Copia e Cola nas Respostas Dissertativas */}
              <div className="bg-surface p-4 rounded-2xl border border-border space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      <ClipboardX className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground">3. Trava de Colar nas Respostas Dissertativas</h4>
                      <p className="text-[11px] text-purple-600 font-semibold">
                        Bloqueia Ctrl+V nas caixas de resposta
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSecPasteEssay(!secPasteEssay)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer min-h-[38px] ${
                      secPasteEssay
                        ? 'bg-primary text-white shadow-md shadow-[#4ade80]/10'
                        : 'bg-[#171f33] text-text-muted border border-border'
                    }`}
                  >
                    {secPasteEssay ? 'ATIVADA' : 'DESATIVADA'}
                  </button>
                </div>
                <p className="text-[11px] text-text-muted leading-relaxed pl-1 pt-1 border-t border-border">
                  Cancela a ação de colar textos (Ctrl+V) ou arrastar arquivos para dentro dos campos de resposta dissertativa / redação.
                </p>
              </div>

            </div>

            {/* Modal Footer Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setSecurityModalActivity(null)}
                className="px-5 py-2.5 bg-surface-hover hover:bg-white/15 text-foreground rounded-full text-xs font-bold transition-all cursor-pointer min-h-[44px] flex items-center justify-center text-center"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveSecuritySettings}
                className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white font-extrabold rounded-full text-xs transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 min-h-[44px] text-center"
              >
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Salvar Seguranças</span>
              </button>
            </div>

          </div>
        </div>
      )}
      {/* Custom Adapt Activity for PNE Modal / Central AEE */}
      {(adaptModalActivity || isCentralAeeOpen) && (
        <AdaptActivityModal
          key={adaptModalActivity?.id || 'central-aee'}
          activity={adaptModalActivity}
          activities={activities}
          students={students}
          isOpen={Boolean(adaptModalActivity || isCentralAeeOpen)}
          onClose={() => {
            setAdaptModalActivity(null);
            setIsCentralAeeOpen(false);
          }}
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
