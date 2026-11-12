import { DashboardCentralBody } from "@/components/parts/DashboardCentralBody";
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
import { DashboardLoadingSkeleton, StandardErrorState } from '@/components/LoadingState';
import {
  getCanonicalActivities,
  getUnifiedActivityMetrics,
  canStudentAccessActivity,
  getOriginalTurmas,
  isStudentPNE,
  getSubmissionTotalGrade,
  getChildRecoveryActivities,
  getChildAdaptations,
  isActivityRecovery,
  isActivityAdapted,
} from '@/lib/studentUtils';

interface DashboardCentralViewProps {
  activities: Activity[];
  students: StudentUser[];
  isLoading?: boolean;
  hasError?: boolean;
  onRetry?: () => void;
  onNavigateToTab: (tab: string) => void;
  onOpenNewActivityModal: () => void;
  onOpenNewStudentModal: () => void;
  onSelectActivityForGrading?: (act: Activity) => void;
  onOpenParallelRecoveryModal?: (act: Activity) => void;
  onViewActivity?: (act: Activity) => void;
}

export interface TurmaRcoInfo {
  turma: string;
  submissionsCount: number;
  gradedCount: number;
  studentsCount: number;
}

type OperationalTabFilter = 'todas' | 'correcoes' | 'prazos' | 'recuperacao' | 'rco';

export const DashboardCentralView: React.FC<DashboardCentralViewProps> = ({
  activities = [],
  students = [],
  isLoading = false,
  hasError = false,
  onRetry,
  onNavigateToTab,
  onOpenNewActivityModal,
  onOpenNewStudentModal,
  onSelectActivityForGrading,
  onOpenParallelRecoveryModal,
  onViewActivity,
}) => {
  const [activeQueueFilter, setActiveQueueFilter] = useState<OperationalTabFilter>('todas');
  const [selectedActivityFilterId, setSelectedActivityFilterId] = useState<string>('all');
  const [statusScopeFilter, setStatusScopeFilter] = useState<'Ativo' | 'Inativo' | 'Todas'>('Todas');

  const parseActivityDeadline = (deadlineStr?: string): Date | null => {
    if (!deadlineStr || typeof deadlineStr !== "string") return null;
    const clean = deadlineStr.trim();
    if (!clean || clean.toLowerCase() === "sem prazo") return null;
    const timeMatch = clean.match(/(\d{1,2}):(\d{2})/);
    const hours = timeMatch ? parseInt(timeMatch[1], 10) : 23;
    const minutes = timeMatch ? parseInt(timeMatch[2], 10) : 59;
    const brMatch = clean.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (brMatch) {
      return new Date(parseInt(brMatch[3], 10), parseInt(brMatch[2], 10) - 1, parseInt(brMatch[1], 10), hours, minutes, 59, 999);
    }
    const isoMatch = clean.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return new Date(parseInt(isoMatch[1], 10), parseInt(isoMatch[2], 10) - 1, parseInt(isoMatch[3], 10), hours, minutes, 59, 999);
    }
    const fallback = new Date(clean);
    return isNaN(fallback.getTime()) ? null : fallback;
  };

  const formatActivityDeadlineBR = (deadlineStr?: string): string => {
    const d = parseActivityDeadline(deadlineStr);
    return d ? d.toLocaleDateString("pt-BR") : (deadlineStr || "Sem prazo");
  };

  const allCanonicalActivities = useMemo(() => getCanonicalActivities(activities), [activities]);
  const canonicalActivities = useMemo(() => allCanonicalActivities.filter((a) => {
    if (selectedActivityFilterId !== "all" && a.id !== selectedActivityFilterId) return false;
    if (statusScopeFilter === "Ativo" && a.status !== "Ativo") return false;
    if (statusScopeFilter === "Inativo" && a.status === "Ativo") return false;
    return true;
  }), [allCanonicalActivities, selectedActivityFilterId, statusScopeFilter]);
  const totalActivities = canonicalActivities.length;

  // 1. Métricas Agregadas de Correção e Entrega
  const {
    totalSubmissions,
    totalExpected,
    pendingCorrections,
    activitiesWithPendingCorrections,
    fragmentedAdhesion,
  } = useMemo(() => {
    let subs = 0;
    let exp = 0;
    let pend = 0;
    const pendingList: Array<{ activity: Activity; pendingCount: number; subCount: number; expectedCount: number; }> = [];
    const adhesionList: Array<{ title: string; type: string; subCount: number; expectedCount: number; rate: number; isRecovery: boolean; isGame: boolean; }> = [];

    const allRelevantActivities = [
      ...canonicalActivities,
      ...activities.filter((a) => {
        if (!isActivityRecovery(a) && !isActivityAdapted(a)) return false;
        if (selectedActivityFilterId !== "all" && a.id !== selectedActivityFilterId && a.recoveryFromId !== selectedActivityFilterId && a.adaptedFromId !== selectedActivityFilterId) return false;
        if (statusScopeFilter === "Ativo" && a.status !== "Ativo") return false;
        if (statusScopeFilter === "Inativo" && a.status === "Ativo") return false;
        return true;
      })
    ];

    allRelevantActivities.forEach((a) => {
      const { subCount, expectedStudentsCount, pendingCount } = getUnifiedActivityMetrics(a, activities, students);
      const uniqueSubCount = a.submissions ? a.submissions.length : 0;
      const metricsSub = Math.max(subCount, uniqueSubCount);
      
      if (!isActivityRecovery(a) && !isActivityAdapted(a)) {
        subs += metricsSub;
        exp += expectedStudentsCount;
        pend += pendingCount;
        if (pendingCount > 0) {
          pendingList.push({ activity: a, pendingCount, subCount: metricsSub, expectedCount: expectedStudentsCount });
        }
      }

      if (expectedStudentsCount > 0) {
        const rate = Math.min(100, Math.round((metricsSub / expectedStudentsCount) * 100));
        let shortTitle = a.title || "Sem Título";
        let typeIcon = "Avaliação";
        const isRec = isActivityRecovery(a);
        const isGame = Boolean(a.isGameActivity || a.type === "Jogo Avaliativo");
        
        if (isRec) typeIcon = "RP";
        else if (isGame) typeIcon = "Jogo";
        else if (isActivityAdapted(a)) typeIcon = "AEE";

        adhesionList.push({
          title: shortTitle.length > 25 ? shortTitle.substring(0, 25) + "..." : shortTitle,
          type: typeIcon,
          subCount: metricsSub,
          expectedCount: expectedStudentsCount,
          rate,
          isRecovery: isRec,
          isGame: isGame
        });
      }
    });

    pendingList.sort((x, y) => y.pendingCount - x.pendingCount);
    adhesionList.sort((x, y) => y.rate - x.rate);

    return {
      totalSubmissions: subs,
      totalExpected: exp,
      pendingCorrections: pend,
      activitiesWithPendingCorrections: pendingList,
      fragmentedAdhesion: adhesionList.slice(0, 4)
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

    activities.filter((a) => statusScopeFilter === "Todas" ? true : statusScopeFilter === "Ativo" ? a.status === "Ativo" : a.status !== "Ativo").forEach((a) => {
      const deadDate = parseActivityDeadline(a.deadline);
      if (!deadDate) return;
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
  }, [activities, statusScopeFilter]);

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
  const radTotal = useMemo(() => {
    const tagCount = students.filter((s) => s.tag?.toUpperCase() === "RAD" || (s as any).hasAtestado).length;
    if (typeof window !== "undefined") {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && (k.includes("atestados_rad_records") || k.includes("local_atestados_rad_data"))) {
            const parsed = JSON.parse(localStorage.getItem(k) || "[]");
            if (Array.isArray(parsed) && parsed.length > tagCount) return parsed.length;
          }
        }
      } catch {}
    }
    return tagCount;
  }, [students]);

  const turmasReadyForRco = useMemo(() => {
    const list: TurmaRcoInfo[] = [];

    originalTurmas.forEach((turma) => {
      const turmaStudents = students.filter(
        (s) => s.turma?.trim().toLowerCase() === turma.trim().toLowerCase()
      );
      if (turmaStudents.length === 0) return;

      const studentIdSet = new Set(turmaStudents.map((s) => s.id));
      const matriculaSet = new Set(turmaStudents.map((s) => s.matricula).filter(Boolean));
      const nameSet = new Set(
        turmaStudents.map((s) => s.fullName?.trim().toLowerCase()).filter(Boolean)
      );

      const turmaActs = canonicalActivities.filter((a) => canStudentAccessActivity(a.turma, turma));
      if (turmaActs.length === 0) return;

      let submissionsCount = 0;
      let gradedCount = 0;
      const countedStudentKeys = new Set<string>();

      turmaActs.forEach((act) => {
        const childAdaps = getChildAdaptations(act, activities);
        const childRecs = getChildRecoveryActivities(act, activities);
        const allRelatedActs = [act, ...childAdaps, ...childRecs];

        allRelatedActs.forEach((relatedAct) => {
          (relatedAct.submissions || []).forEach((sub) => {
            const isMatch =
              (sub.studentId && studentIdSet.has(sub.studentId)) ||
              (sub.matricula && matriculaSet.has(sub.matricula)) ||
              (sub.studentName && nameSet.has(sub.studentName.trim().toLowerCase()));

            if (isMatch) {
              const uniqueKey = `${act.id}_${sub.studentId || sub.matricula || sub.studentName}`;
              if (!countedStudentKeys.has(uniqueKey)) {
                countedStudentKeys.add(uniqueKey);
                submissionsCount++;
                const isGraded =
                  sub.status === 'graded' ||
                  (sub.essayScore !== undefined && sub.essayScore !== null) ||
                  Number(sub.objectiveScore) > 0;
                if (isGraded) {
                  gradedCount++;
                }
              }
            }
          });
        });
      });

      // Apenas turmas que REALMENTE possuem entregas registradas por seus alunos
      if (submissionsCount > 0) {
        list.push({
          turma,
          submissionsCount,
          gradedCount,
          studentsCount: turmaStudents.length,
        });
      }
    });

    // Ordenar turmas com mais entregas primeiro
    list.sort((a, b) => b.submissionsCount - a.submissionsCount);
    return list;
  }, [originalTurmas, canonicalActivities, activities, students]);

  const totalRcoSubmissions = useMemo(() => {
    return turmasReadyForRco.reduce((acc, t) => acc + t.submissionsCount, 0);
  }, [turmasReadyForRco]);

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

  return <DashboardCentralBody {...{ students, isLoading, hasError, onRetry, onNavigateToTab, onOpenNewActivityModal, onSelectActivityForGrading, onOpenParallelRecoveryModal, onViewActivity, formatActivityDeadlineBR, totalActivities, missingSubmissions, completionRate, radTotal, turmasReadyForRco, overallAverage, handleDirectCorrection, activeQueueFilter, setActiveQueueFilter, statusScopeFilter, setStatusScopeFilter, pendingCorrections, activitiesWithPendingCorrections, fragmentedAdhesion, dueTodayActivities, approachingDeadlineActivities, studentsNeedingRecoveryCount, activitiesNeedingRecovery }} />;
};

export default DashboardCentralView;
