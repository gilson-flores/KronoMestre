'use client';

import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Bell,
  BookOpenCheck,
  AlertCircle,
  Clock,
  ArrowRight,
  FileSpreadsheet,
  Plus,
  Users2,
  GraduationCap,
  CheckCircle2,
  HeartHandshake,
  FileText,
  ChevronRight,
  Sparkles,
  Filter,
  RefreshCw,
  AlertTriangle,
  Heart
} from 'lucide-react';

import { Activity, StudentUser } from '@/lib/types';
import {
  getCanonicalActivities,
  getUnifiedActivityMetrics,
  canStudentAccessActivity,
  getOriginalTurmas,
  isStudentPNE,
  getSubmissionTotalGrade,
  getChildRecoveryActivities,
  isActivityRecovery,
  isActivityAdapted,
} from '@/lib/studentUtils';

interface DashboardCentralViewProps {
  activities: Activity[];
  students: StudentUser[];
  onNavigateToTab: (tab: string) => void;
  onOpenNewActivityModal: () => void;
  onOpenNewStudentModal: () => void;
  onSelectActivityForGrading?: (act: Activity) => void;
  onOpenParallelRecoveryModal?: (act: Activity) => void;
  onViewActivity?: (act: Activity) => void;
}

type OperationalTabFilter = 'todas' | 'correcoes' | 'prazos' | 'recuperacao' | 'rco';

export const DashboardCentralView: React.FC<DashboardCentralViewProps> = ({
  activities = [],
  students = [],
  onNavigateToTab,
  onOpenNewActivityModal,
  onOpenNewStudentModal,
  onSelectActivityForGrading,
  onOpenParallelRecoveryModal,
  onViewActivity,
}) => {
  const [activeQueueFilter, setActiveQueueFilter] = useState<OperationalTabFilter>('todas');

  const canonicalActivities = useMemo(() => getCanonicalActivities(activities), [activities]);
  const totalActivities = canonicalActivities.length;

  // 1. Métricas Agregadas de Correção e Entrega
  const {
    totalSubmissions,
    totalExpected,
    pendingCorrections,
    activitiesWithPendingCorrections,
  } = useMemo(() => {
    let subs = 0;
    let exp = 0;
    let pend = 0;
    const pendingList: Array<{
      activity: Activity;
      pendingCount: number;
      subCount: number;
      expectedCount: number;
    }> = [];

    canonicalActivities.forEach((a) => {
      const { subCount, expectedStudentsCount, pendingCount } = getUnifiedActivityMetrics(
        a,
        activities,
        students
      );
      subs += subCount;
      exp += expectedStudentsCount;
      pend += pendingCount;

      if (pendingCount > 0) {
        pendingList.push({
          activity: a,
          pendingCount,
          subCount,
          expectedCount: expectedStudentsCount,
        });
      }
    });

    // Ordenar atividades com mais pendências primeiro
    pendingList.sort((x, y) => y.pendingCount - x.pendingCount);

    return {
      totalSubmissions: subs,
      totalExpected: exp,
      pendingCorrections: pend,
      activitiesWithPendingCorrections: pendingList,
    };
  }, [canonicalActivities, activities, students]);

  const missingSubmissions = Math.max(0, totalExpected - totalSubmissions);
  const completionRate =
    totalExpected > 0 ? Math.min(100, Math.round((totalSubmissions / totalExpected) * 100)) : 0;

  // 2. Atividades Próximas do Prazo (Hoje ou próximos 7 dias)
  const { dueTodayActivities, approachingDeadlineActivities } = useMemo(() => {
    const now = new Date();
    const todayList: Activity[] = [];
    const upcomingList: Array<{ activity: Activity; daysLeft: number; isToday: boolean }> = [];

    canonicalActivities.forEach((a) => {
      if (!a.deadline) return;
      const deadDate = new Date(a.deadline);
      const diffMs = deadDate.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 3600);
      const diffDays = Math.ceil(diffMs / (1000 * 3600 * 24));

      // Considera hoje se faltam até 24 horas e ainda não passou de -12h
      const isToday = diffHours >= -12 && diffHours <= 24;

      if (isToday) {
        todayList.push(a);
        upcomingList.push({ activity: a, daysLeft: 0, isToday: true });
      } else if (diffDays > 0 && diffDays <= 7) {
        upcomingList.push({ activity: a, daysLeft: diffDays, isToday: false });
      }
    });

    upcomingList.sort((x, y) => x.daysLeft - y.daysLeft);

    return {
      dueTodayActivities: todayList,
      approachingDeadlineActivities: upcomingList,
    };
  }, [canonicalActivities]);

  // 3. Recuperação Paralela: identificar atividades e alunos com notas < 6.0
  const {
    studentsNeedingRecoveryCount,
    activitiesNeedingRecovery,
  } = useMemo(() => {
    const lowGradeStudentIds = new Set<string>();
    const activitiesNeedingRec: Array<{
      activity: Activity;
      lowScoreCount: number;
      hasRecoveryCreated: boolean;
      average: number;
    }> = [];

    canonicalActivities.forEach((act) => {
      const childRecs = getChildRecoveryActivities(act, activities);
      const hasRecovery = childRecs.length > 0;
      let lowCount = 0;
      let sumGrades = 0;
      let gradedCount = 0;

      (act.submissions || []).forEach((sub) => {
        if (
          sub.status === 'graded' ||
          (sub.essayScore !== undefined && sub.essayScore !== null) ||
          Number(sub.objectiveScore) > 0
        ) {
          const totalGrade = getSubmissionTotalGrade(sub);
          sumGrades += totalGrade;
          gradedCount += 1;
          if (totalGrade < 6.0) {
            lowCount += 1;
            lowGradeStudentIds.add(sub.studentId);
          }
        }
      });

      const avg = gradedCount > 0 ? sumGrades / gradedCount : 10;

      // Se há alunos com nota baixa e não é uma atividade de recuperação
      if (lowCount > 0 && !isActivityRecovery(act)) {
        activitiesNeedingRec.push({
          activity: act,
          lowScoreCount: lowCount,
          hasRecoveryCreated: hasRecovery,
          average: Number(avg.toFixed(1)),
        });
      }
    });

    // Priorizar atividades que ainda NÃO têm recuperação criada
    activitiesNeedingRec.sort((a, b) => {
      if (a.hasRecoveryCreated !== b.hasRecoveryCreated) {
        return a.hasRecoveryCreated ? 1 : -1;
      }
      return b.lowScoreCount - a.lowScoreCount;
    });

    return {
      studentsNeedingRecoveryCount: lowGradeStudentIds.size,
      activitiesNeedingRecovery: activitiesNeedingRec,
    };
  }, [canonicalActivities, activities]);

  // 4. Pendências Administrativas: turmas com atividades finalizadas prontas para lançamento RCO
  const originalTurmas = useMemo(() => getOriginalTurmas(students), [students]);
  const pneTotal = useMemo(() => students.filter((s) => isStudentPNE(s)).length, [students]);
  const radTotal = useMemo(
    () => students.filter((s) => s.tag?.toUpperCase() === 'RAD').length,
    [students]
  );

  const turmasReadyForRco = useMemo(() => {
    return originalTurmas.filter((turma) => {
      const turmaActs = canonicalActivities.filter((a) =>
        canStudentAccessActivity(a.turma, turma)
      );
      if (turmaActs.length === 0) return false;
      // Verificar se ao menos 1 atividade tem notas lançadas
      const hasGraded = turmaActs.some((a) =>
        (a.submissions || []).some((s) => s.status === 'graded' || s.essayScore !== undefined)
      );
      return hasGraded;
    });
  }, [originalTurmas, canonicalActivities]);

  // Média Geral
  const overallAverage = useMemo(() => {
    let totalScoreSum = 0;
    let totalGradedCount = 0;
    activities.forEach((act) => {
      (act.submissions || []).forEach((s) => {
        if (
          s.status === 'graded' ||
          (s.essayScore !== undefined && s.essayScore !== null) ||
          Number(s.objectiveScore) > 0
        ) {
          totalScoreSum += getSubmissionTotalGrade(s);
          totalGradedCount += 1;
        }
      });
    });
    return totalGradedCount > 0 ? (totalScoreSum / totalGradedCount).toFixed(1) : '0.0';
  }, [activities]);

  // Ação direta de correção mais prioritária
  const handleDirectCorrection = () => {
    if (activitiesWithPendingCorrections.length > 0 && onSelectActivityForGrading) {
      onSelectActivityForGrading(activitiesWithPendingCorrections[0].activity);
    } else {
      onNavigateToTab('correcoes');
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-16 max-w-6xl w-full mx-auto">
      {/* 1. CABEÇALHO OPERACIONAL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                Central de Trabalho
              </h1>
              <p className="text-sm sm:text-base text-muted font-medium mt-0.5">
                O que você precisa fazer agora? Suas pendências pedagógicas e ações rápidas.
              </p>
            </div>
          </div>
        </div>

        {/* Ações Primárias Globais */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            id="btn-central-rco"
            onClick={() => onNavigateToTab('postagem_rco')}
            className="min-h-[44px] py-2.5 px-4 bg-surface hover:bg-surface-hover text-foreground font-bold rounded-xl border border-border transition-all text-sm flex items-center gap-2 cursor-pointer shadow-sm active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4 text-primary" />
            <span>Lançar RCO</span>
          </button>
          <button
            id="btn-central-nova-atividade"
            onClick={onOpenNewActivityModal}
            className="min-h-[44px] py-2.5 px-4 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition-all text-sm flex items-center gap-2 cursor-pointer shadow-md active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Nova Atividade</span>
          </button>
        </div>
      </div>

      {/* 2. ÁREA DE PENDÊNCIAS (6 CARDS OPERACIONAIS COM AÇÃO DIRETA) */}
      <section aria-labelledby="heading-pendencias">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-500" />
            <h2 id="heading-pendencias" className="text-xl font-bold text-foreground">
              Pendências
            </h2>
          </div>
          <span className="text-xs font-semibold text-muted bg-surface px-2.5 py-1 rounded-full border border-border">
            Foco Operacional
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* CARD 1: CORREÇÕES */}
          <div className="p-5 rounded-2xl border border-border bg-surface flex flex-col justify-between shadow-sm hover:border-amber-500/40 transition-colors">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <BookOpenCheck className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-600 bg-amber-500/10 px-2.5 py-1 rounded-lg">
                  Avaliação
                </span>
              </div>
              <div className="text-3xl font-black text-foreground">{pendingCorrections}</div>
              <div className="text-base font-bold text-foreground mt-1">Correções Pendentes</div>
              <p className="text-xs text-muted mt-1 leading-relaxed">
                {pendingCorrections === 0
                  ? 'Todas as redações e questões estão em dia!'
                  : `${activitiesWithPendingCorrections.length} atividade(s) aguardando sua correção.`}
              </p>
            </div>
            <button
              id="btn-pendencia-corrigir"
              onClick={handleDirectCorrection}
              disabled={pendingCorrections === 0}
              className="mt-5 w-full min-h-[44px] py-2.5 px-4 bg-amber-500/10 hover:bg-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed text-amber-600 font-bold rounded-xl text-sm transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98"
            >
              <span>Corrigir Agora</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* CARD 2: ENTREGAS */}
          <div className="p-5 rounded-2xl border border-border bg-surface flex flex-col justify-between shadow-sm hover:border-primary/40 transition-colors">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded-lg">
                  Adesão
                </span>
              </div>
              <div className="text-3xl font-black text-foreground">{totalSubmissions}</div>
              <div className="text-base font-bold text-foreground mt-1">Entregas Realizadas</div>
              <p className="text-xs text-muted mt-1 leading-relaxed">
                {totalExpected > 0
                  ? `${completionRate}% de adesão geral (${totalSubmissions} de ${totalExpected} esperadas).`
                  : 'Nenhuma entrega esperada no momento.'}
              </p>
            </div>
            <button
              id="btn-pendencia-entregas"
              onClick={() => onNavigateToTab('atividades')}
              className="mt-5 w-full min-h-[44px] py-2.5 px-4 bg-primary/10 hover:bg-primary/20 text-primary font-bold rounded-xl text-sm transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98"
            >
              <span>Ver Entregas</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* CARD 3: ALUNOS SEM ENTREGA */}
          <div className="p-5 rounded-2xl border border-border bg-surface flex flex-col justify-between shadow-sm hover:border-rose-500/40 transition-colors">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-rose-600 bg-rose-500/10 px-2.5 py-1 rounded-lg">
                  Atenção
                </span>
              </div>
              <div className="text-3xl font-black text-foreground">{missingSubmissions}</div>
              <div className="text-base font-bold text-foreground mt-1">Alunos Sem Entrega</div>
              <p className="text-xs text-muted mt-1 leading-relaxed">
                {missingSubmissions === 0
                  ? 'Nenhum estudante com entrega pendente.'
                  : 'Estudantes com atividades pendentes ou em atraso.'}
              </p>
            </div>
            <button
              id="btn-pendencia-alunos-sem-entrega"
              onClick={() => onNavigateToTab('alunos')}
              disabled={missingSubmissions === 0}
              className="mt-5 w-full min-h-[44px] py-2.5 px-4 bg-rose-500/10 hover:bg-rose-500/20 disabled:opacity-40 disabled:cursor-not-allowed text-rose-600 font-bold rounded-xl text-sm transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98"
            >
              <span>Ver Alunos</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* CARD 4: ATIVIDADES PRÓXIMAS DO PRAZO */}
          <div className="p-5 rounded-2xl border border-border bg-surface flex flex-col justify-between shadow-sm hover:border-indigo-500/40 transition-colors">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-lg">
                  Prazos
                </span>
              </div>
              <div className="text-3xl font-black text-foreground">
                {approachingDeadlineActivities.length}
              </div>
              <div className="text-base font-bold text-foreground mt-1">Atividades Vencendo</div>
              <p className="text-xs text-muted mt-1 leading-relaxed">
                {dueTodayActivities.length > 0
                  ? `${dueTodayActivities.length} atividade(s) vencendo hoje!`
                  : approachingDeadlineActivities.length > 0
                  ? `${approachingDeadlineActivities.length} atividade(s) nos próximos 7 dias.`
                  : 'Nenhuma atividade com prazo urgente.'}
              </p>
            </div>
            <button
              id="btn-pendencia-prazos"
              onClick={() => onNavigateToTab('atividades')}
              disabled={approachingDeadlineActivities.length === 0}
              className="mt-5 w-full min-h-[44px] py-2.5 px-4 bg-indigo-500/10 hover:bg-indigo-500/20 disabled:opacity-40 disabled:cursor-not-allowed text-indigo-400 font-bold rounded-xl text-sm transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98"
            >
              <span>Ver Atividades</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* CARD 5: RECUPERAÇÃO PARALELA */}
          <div className="p-5 rounded-2xl border border-border bg-surface flex flex-col justify-between shadow-sm hover:border-violet-500/40 transition-colors">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-600 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-violet-600 bg-violet-500/10 px-2.5 py-1 rounded-lg">
                  Pedagógico
                </span>
              </div>
              <div className="text-3xl font-black text-foreground">
                {studentsNeedingRecoveryCount}
              </div>
              <div className="text-base font-bold text-foreground mt-1">Alunos em Recuperação</div>
              <p className="text-xs text-muted mt-1 leading-relaxed">
                {studentsNeedingRecoveryCount === 0
                  ? 'Nenhum estudante abaixo da média mínima de 6.0.'
                  : `${activitiesNeedingRecovery.filter((a) => !a.hasRecoveryCreated).length} atividade(s) recomendam plano de recuperação.`}
              </p>
            </div>
            <button
              id="btn-pendencia-recuperacao"
              onClick={() => {
                const target = activitiesNeedingRecovery.find((a) => !a.hasRecoveryCreated);
                if (target && onOpenParallelRecoveryModal) {
                  onOpenParallelRecoveryModal(target.activity);
                } else {
                  onNavigateToTab('atividades');
                }
              }}
              disabled={studentsNeedingRecoveryCount === 0}
              className="mt-5 w-full min-h-[44px] py-2.5 px-4 bg-violet-500/10 hover:bg-violet-500/20 disabled:opacity-40 disabled:cursor-not-allowed text-violet-600 font-bold rounded-xl text-sm transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98"
            >
              <span>Organizar Recuperação</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* CARD 6: PENDÊNCIAS ADMINISTRATIVAS (RCO / ATESTADOS / RAD) */}
          <div className="p-5 rounded-2xl border border-border bg-surface flex flex-col justify-between shadow-sm hover:border-emerald-500/40 transition-colors">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-lg">
                  Registro
                </span>
              </div>
              <div className="text-3xl font-black text-foreground">
                {turmasReadyForRco.length}
              </div>
              <div className="text-base font-bold text-foreground mt-1">Turmas para RCO</div>
              <p className="text-xs text-muted mt-1 leading-relaxed">
                {turmasReadyForRco.length > 0
                  ? `${turmasReadyForRco.length} turma(s) com notas prontas para postagem no RCO.`
                  : 'Sem fechamentos pendentes de lançamento no RCO.'}
              </p>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                id="btn-pendencia-rco"
                onClick={() => onNavigateToTab('postagem_rco')}
                className="min-h-[44px] py-2.5 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1 active:scale-98"
              >
                <span>Lançar RCO</span>
              </button>
              <button
                id="btn-pendencia-atestados"
                onClick={() => onNavigateToTab('atestados_rad')}
                className="min-h-[44px] py-2.5 px-3 bg-surface-hover hover:bg-border text-foreground font-bold rounded-xl text-xs border border-border transition-all cursor-pointer flex items-center justify-center gap-1 active:scale-98"
              >
                <span>RAD ({radTotal})</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 3. FILA OPERACIONAL: O QUE O PROFESSOR PRECISA FAZER AGORA? */}
      <section aria-labelledby="heading-fila-operacional" className="pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 id="heading-fila-operacional" className="text-xl font-bold text-foreground">
              Ações Prioritárias
            </h2>
            <p className="text-sm text-muted">
              Tarefas operacionais organizadas por ordem de urgência com ação direta.
            </p>
          </div>

          {/* Filtros em Abas Segmentadas */}
          <div className="flex items-center gap-1.5 p-1 bg-surface rounded-xl border border-border overflow-x-auto max-w-full">
            <button
              onClick={() => setActiveQueueFilter('todas')}
              className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                activeQueueFilter === 'todas'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setActiveQueueFilter('correcoes')}
              className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeQueueFilter === 'correcoes'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              <span>Correções</span>
              {pendingCorrections > 0 && (
                <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {pendingCorrections}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveQueueFilter('prazos')}
              className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeQueueFilter === 'prazos'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              <span>Prazos</span>
              {approachingDeadlineActivities.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-indigo-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {approachingDeadlineActivities.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveQueueFilter('recuperacao')}
              className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeQueueFilter === 'recuperacao'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              <span>Recuperação</span>
              {studentsNeedingRecoveryCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-violet-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {studentsNeedingRecoveryCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveQueueFilter('rco')}
              className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeQueueFilter === 'rco'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              <span>RCO</span>
              {turmasReadyForRco.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {turmasReadyForRco.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* LISTAGEM OPERACIONAL DE TAREFAS */}
        <div className="space-y-3">
          {/* Seção Correções na Fila */}
          {(activeQueueFilter === 'todas' || activeQueueFilter === 'correcoes') &&
            activitiesWithPendingCorrections.map(({ activity, pendingCount, subCount, expectedCount }) => (
              <div
                key={`corr-${activity.id}`}
                className="p-4 sm:p-5 rounded-2xl bg-surface border border-border hover:border-amber-500/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                    <BookOpenCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 text-xs font-bold">
                        Correção Pendente
                      </span>
                      <span className="text-xs font-semibold text-muted">
                        Turma: {activity.turma || 'Geral'}
                      </span>
                      {activity.deadline && (
                        <span className="text-xs text-muted">
                          • Prazo: {new Date(activity.deadline).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-foreground mt-1">
                      {activity.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-muted mt-0.5">
                      <strong className="text-amber-600 font-bold">{pendingCount}</strong> de{' '}
                      {subCount} redações/respostas aguardando sua nota e feedback.
                    </p>
                  </div>
                </div>

                {/* Ação Direta no Desktop e Mobile */}
                <div className="flex items-center gap-2 self-end md:self-center shrink-0 w-full md:w-auto">
                  <button
                    onClick={() => {
                      if (onSelectActivityForGrading) {
                        onSelectActivityForGrading(activity);
                      } else {
                        onNavigateToTab('correcoes');
                      }
                    }}
                    className="w-full md:w-auto min-h-[44px] py-2.5 px-5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    <span>Corrigir Atividade</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

          {/* Seção Prazos Próximos na Fila */}
          {(activeQueueFilter === 'todas' || activeQueueFilter === 'prazos') &&
            approachingDeadlineActivities.map(({ activity, daysLeft, isToday }) => (
              <div
                key={`prazo-${activity.id}`}
                className="p-4 sm:p-5 rounded-2xl bg-surface border border-border hover:border-indigo-500/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm"
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      isToday ? 'bg-rose-500/10 text-rose-600' : 'bg-indigo-500/10 text-indigo-400'
                    }`}
                  >
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                          isToday
                            ? 'bg-rose-500/10 text-rose-600'
                            : 'bg-indigo-500/10 text-indigo-400'
                        }`}
                      >
                        {isToday ? 'Vence Hoje!' : `Vence em ${daysLeft} dia(s)`}
                      </span>
                      <span className="text-xs font-semibold text-muted">
                        Turma: {activity.turma || 'Geral'}
                      </span>
                      {activity.deadline && (
                        <span className="text-xs text-muted">
                          • {new Date(activity.deadline).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-foreground mt-1">
                      {activity.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-muted mt-0.5">
                      {activity.submissions?.length || 0} entregas recebidas até o momento.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center shrink-0 w-full md:w-auto">
                  <button
                    onClick={() => {
                      if (onViewActivity) {
                        onViewActivity(activity);
                      } else {
                        onNavigateToTab('atividades');
                      }
                    }}
                    className="w-full md:w-auto min-h-[44px] py-2.5 px-4 bg-surface hover:bg-surface-hover text-foreground font-bold rounded-xl border border-border text-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    <span>Ver Atividade</span>
                  </button>
                  <button
                    onClick={() => onNavigateToTab('atividades')}
                    className="w-full md:w-auto min-h-[44px] py-2.5 px-4 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    <span>Acompanhar</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

          {/* Seção Recuperação na Fila */}
          {(activeQueueFilter === 'todas' || activeQueueFilter === 'recuperacao') &&
            activitiesNeedingRecovery.map(({ activity, lowScoreCount, hasRecoveryCreated, average }) => (
              <div
                key={`rec-${activity.id}`}
                className="p-4 sm:p-5 rounded-2xl bg-surface border border-border hover:border-violet-500/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-600 flex items-center justify-center shrink-0 mt-0.5">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-600 text-xs font-bold">
                        {hasRecoveryCreated ? 'Recuperação em Andamento' : 'Recuperação Recomendada'}
                      </span>
                      <span className="text-xs font-semibold text-muted">
                        Turma: {activity.turma || 'Geral'}
                      </span>
                      <span className="text-xs text-muted">• Média da turma: {average}</span>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-foreground mt-1">
                      {activity.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-muted mt-0.5">
                      <strong className="text-rose-600 font-bold">{lowScoreCount} estudante(s)</strong>{' '}
                      com nota inferior a 6.0 nesta avaliação.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center shrink-0 w-full md:w-auto">
                  {!hasRecoveryCreated ? (
                    <button
                      onClick={() => {
                        if (onOpenParallelRecoveryModal) {
                          onOpenParallelRecoveryModal(activity);
                        } else {
                          onNavigateToTab('atividades');
                        }
                      }}
                      className="w-full md:w-auto min-h-[44px] py-2.5 px-4 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Criar Recuperação</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => onNavigateToTab('atividades')}
                      className="w-full md:w-auto min-h-[44px] py-2.5 px-4 bg-violet-500/10 hover:bg-violet-500/20 text-violet-600 font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                    >
                      <span>Ver Andamento</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}

          {/* Seção RCO na Fila */}
          {(activeQueueFilter === 'todas' || activeQueueFilter === 'rco') &&
            turmasReadyForRco.map((turma) => (
              <div
                key={`rco-${turma}`}
                className="p-4 sm:p-5 rounded-2xl bg-surface border border-border hover:border-emerald-500/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 text-xs font-bold">
                        Pronto para Lançamento
                      </span>
                      <span className="text-xs font-semibold text-muted">Turma {turma}</span>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-foreground mt-1">
                      Postagem RCO — Turma {turma}
                    </h3>
                    <p className="text-xs sm:text-sm text-muted mt-0.5">
                      Notas consolidadas prontas para cópia formatada ou exportação de relatório para o sistema estadual.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center shrink-0 w-full md:w-auto">
                  <button
                    onClick={() => onNavigateToTab('postagem_rco')}
                    className="w-full md:w-auto min-h-[44px] py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    <span>Lançar no RCO</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

          {/* Estado Vazio Quando Não Há Pendências no Filtro */}
          {activitiesWithPendingCorrections.length === 0 &&
            approachingDeadlineActivities.length === 0 &&
            activitiesNeedingRecovery.length === 0 &&
            turmasReadyForRco.length === 0 && (
              <div className="p-8 sm:p-12 text-center rounded-2xl bg-surface border border-border">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Tudo em dia!</h3>
                <p className="text-sm text-muted max-w-md mx-auto mt-1">
                  Você não possui nenhuma pendência urgente de correção, prazo ou lançamento no
                  momento.
                </p>
                <button
                  onClick={onOpenNewActivityModal}
                  className="mt-5 inline-flex items-center gap-2 min-h-[44px] py-2.5 px-4 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl text-sm transition-all cursor-pointer shadow-md active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Criar Nova Atividade</span>
                </button>
              </div>
            )}
        </div>
      </section>

      {/* 4. VISÃO GERAL COMPACTA (Métricas da Turma) */}
      <section aria-labelledby="heading-metricas" className="pt-2">
        <h2 id="heading-metricas" className="text-sm font-bold uppercase tracking-wider text-muted mb-3">
          Resumo Geral das Turmas
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-surface border border-border">
            <span className="text-xs text-muted font-medium block">Atividades Criadas</span>
            <span className="text-2xl font-bold text-foreground block mt-1">{totalActivities}</span>
          </div>
          <div className="p-4 rounded-2xl bg-surface border border-border">
            <span className="text-xs text-muted font-medium block">Taxa de Conclusão</span>
            <span className="text-2xl font-bold text-foreground block mt-1">{completionRate}%</span>
          </div>
          <div className="p-4 rounded-2xl bg-surface border border-border">
            <span className="text-xs text-muted font-medium block">Média Geral</span>
            <span className="text-2xl font-bold text-foreground block mt-1">{overallAverage}</span>
          </div>
          <div className="p-4 rounded-2xl bg-surface border border-border">
            <span className="text-xs text-muted font-medium block">Total de Alunos</span>
            <span className="text-2xl font-bold text-foreground block mt-1">{students.length}</span>
          </div>
        </div>
      </section>
    </div>
  );
};

export default DashboardCentralView;
