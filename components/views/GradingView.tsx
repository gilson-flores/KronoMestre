import { GradingSubmissionCardBody } from "@/components/parts/GradingSubmissionCardBody";
import { GradingViewMainBody } from "@/components/parts/GradingViewMainBody";
'use client';

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Save,
  RotateCcw,
  UserCheck,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Award,
  FileCheck2,
  FileText,
  Clock,
  UserX,
  ChevronDown,
  Check,
  Send,
  Loader2,
  Filter,
  GraduationCap,
  Zap,
  TrendingUp,
  ArrowRight,
  BookOpenCheck,
  Maximize2,
  ExternalLink,
} from 'lucide-react';
import { Activity, ActivitySubmission, StudentUser, EssayQuestion } from '@/lib/types';
import {
  canStudentAccessActivity,
  normalizeStudentName,
  getActivityGradeDistribution,
  isStudentPNE,
  getChildRecoveryActivities,
  getChildAdaptations,
  isActivityRecovery,
  isActivityAdapted,
  getSubmissionTotalGrade,
} from '@/lib/studentUtils';
import { GradeConsolidationModal } from '@/components/modals/GradeConsolidationModal';
import { Layers, GitFork, CheckCheck, HelpCircle } from 'lucide-react';
import { GradingLoadingSkeleton, StandardErrorState } from '@/components/LoadingState';

interface GradingViewProps {
  activity: Activity;
  allActivities?: Activity[];
  students?: StudentUser[];
  isLoading?: boolean;
  hasError?: boolean;
  onRetry?: () => void;
  onSelectActivity?: (activity: Activity) => void;
  onBack: () => void;
  onUpdateSubmission: (
    activityId: string,
    studentId: string,
    essayScore: number,
    feedback: string,
    status: 'graded' | 'returned' | 'draft',
    extraPoints?: number,
    registeredInStateSystem?: boolean
  ) => void;
}

interface AIDiagnostic {
  suggestedScore: number;
  feedback: string;
  themeFidelity: string;
  keywordsCheck: string;
  structureCheck: string;
  grammarCheck: string;
  aiUsagePercentage?: number;
  aiUsageAnalysis?: string;
}

export const GradingView: React.FC<GradingViewProps> = ({
  activity,
  allActivities = [],
  students = [],
  isLoading = false,
  hasError = false,
  onRetry,
  onSelectActivity,
  onBack,
  onUpdateSubmission,
}) => {
  // Sync state with selected activity
  const [prevActivityId, setPrevActivityId] = useState(activity.id);
  const [prevSubmissions, setPrevSubmissions] = useState(activity.submissions);
  const [submissions, setSubmissions] = useState<ActivitySubmission[]>(activity.submissions || []);
  const [selectedTurmaFilter, setSelectedTurmaFilter] = useState<string>('all');
  // Visão Unificada com Atividades Filhas (Adaptações PNE e Recuperações Paralelas)
  const [includeChildActivities, setIncludeChildActivities] = useState<boolean>(true);

  const [savedSuccessId, setSavedSuccessId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(false);
  const [refreshToast, setRefreshToast] = useState(false);

  // Sub-tabs: 'fila' | 'corrigidas' | 'devolvidas' | 'nao_fizeram'
  const [activeTab, setActiveTab] = useState<'fila' | 'corrigidas' | 'devolvidas' | 'nao_fizeram'>('fila');

  // Activity Switcher Modal/Dropdown state
  const [isActivityDropdownOpen, setIsActivityDropdownOpen] = useState(false);

  // Gemini AI Loading and Result state per student
  const [loadingAiStudentId, setLoadingAiStudentId] = useState<string | null>(null);
  const [aiDiagnosticMap, setAiDiagnosticMap] = useState<Record<string, AIDiagnostic>>({});
  const [aiErrorMessage, setAiErrorMessage] = useState<string | null>(null);

  // Gemini AI Feedback state (Gamified / Serious)
  const [generatingFeedbackState, setGeneratingFeedbackState] = useState<{ studentId: string; type: 'gamified' | 'serious' } | null>(null);

  // Modal de Consolidação de Notas da Recuperação Paralela
  const [consolidationModalData, setConsolidationModalData] = useState<{
    data: {
      isRecoveryView: boolean;
      isParentView: boolean;
      parentGrade: number | null;
      parentTitle: string;
      recoveryGrade: number | null;
      recoveryTitle: string;
      recalculatedFinalGrade: number | null;
      gradeEvolution: number | null;
    };
    studentName: string;
    matricula?: string;
    turma?: string;
  } | null>(null);

  const handleGenerateAiFeedback = async (
    sub: ActivitySubmission,
    statusAction: 'graded' | 'returned',
    feedbackType: 'gamified' | 'serious' = 'gamified'
  ) => {
    try {
      setGeneratingFeedbackState({ studentId: sub.studentId, type: feedbackType });
      
      const distribution = getActivityGradeDistribution(activity);
      const objQuestions = activity.questions ? activity.questions.filter((q) => q.type === 'multiple_choice') : [];
      const essayQuestions = activity.questions ? activity.questions.filter((q) => q.type === 'essay') : [];

      const objTotal = objQuestions.length;
      const essayTotal = essayQuestions.length;

      let evaluationFormat: 'objective_only' | 'essay_only' | 'mixed' = 'mixed';
      if (distribution.hasObjective && !distribution.hasEssay) {
        evaluationFormat = 'objective_only';
      } else if (!distribution.hasObjective && distribution.hasEssay) {
        evaluationFormat = 'essay_only';
      } else if (distribution.hasObjective && distribution.hasEssay) {
        evaluationFormat = 'mixed';
      } else {
        if (objTotal > 0 && essayTotal === 0) {
          evaluationFormat = 'objective_only';
        } else if (objTotal === 0 && essayTotal > 0) {
          evaluationFormat = 'essay_only';
        }
      }

      // Count correct objective answers
      let objCorrect = 0;
      if (sub.selectedObjectiveAnswers && objQuestions.length > 0) {
        objQuestions.forEach((q) => {
          const selected = sub.selectedObjectiveAnswers?.[q.id];
          if (typeof selected === 'number' && selected === q.correctOptionIndex) {
            objCorrect++;
          }
        });
      } else if (sub.objectiveScore !== undefined && distribution.maxObjectiveGrade > 0 && objTotal > 0) {
        objCorrect = Math.round((sub.objectiveScore / distribution.maxObjectiveGrade) * objTotal);
      } else if (sub.objectiveScore) {
        objCorrect = Math.round(sub.objectiveScore);
      }

      const totalObjectiveScore = distribution.hasObjective ? (sub.objectiveScore || 0) : 0;
      const totalEssayScore = distribution.hasEssay ? (sub.essayScore || 0) : 0;
      const currentScore = totalObjectiveScore + totalEssayScore + (sub.extraPoints || 0);

      const res = await fetch('/api/gemini/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: sub.studentName,
          activityTitle: activity.title,
          grade: currentScore,
          maxGrade: distribution.maxGrade,
          maxObjectiveGrade: distribution.maxObjectiveGrade,
          maxEssayGrade: distribution.maxEssayGrade,
          statusAction,
          evaluationFormat,
          hasObjective: distribution.hasObjective,
          hasEssay: distribution.hasEssay,
          essayAnswer: distribution.hasEssay ? (sub.essayAnswer || '') : '',
          objectiveSummary: {
            total: objTotal,
            correct: objCorrect,
            score: totalObjectiveScore,
          },
          essayScore: totalEssayScore,
          feedbackType,
        }),
      });

      const resText = await res.text();
      let data: Record<string, any> = {};
      try { data = JSON.parse(resText); } catch { /* ignore non-json feedback */ }
      if (data.feedback) {
        handleFeedbackChange(sub.studentId, data.feedback);
      }
    } catch (err) {
      console.error('Erro ao gerar feedback com Gemini:', err);
    } finally {
      setGeneratingFeedbackState(null);
    }
  };

  if (activity.id !== prevActivityId) {
    setPrevActivityId(activity.id);
    setPrevSubmissions(activity.submissions);
    setSubmissions(activity.submissions || []);
    setSelectedTurmaFilter('all');
  } else if (activity.submissions !== prevSubmissions) {
    setPrevSubmissions(activity.submissions);
    setSubmissions(activity.submissions || []);
  }

  // Handle Score, Feedback, Extra Points, State Registration changes
  const handleScoreChange = (studentId: string, scoreVal: string) => {
    const val = parseFloat(scoreVal);
    const num = isNaN(val) ? 0 : val;

    setSubmissions((prev) => {
      const targetSub = prev.find((s) => s.studentId === studentId);
      if (targetSub?.groupMembers && targetSub.status === 'pending') {
        const groupNames = targetSub.groupMembers
          .split(',')
          .map((n) => normalizeStudentName(n.trim()))
          .filter(Boolean);

        return prev.map((sub) => {
          if (
            sub.studentId === studentId ||
            (sub.groupMembers && sub.groupMembers === targetSub.groupMembers) ||
            groupNames.includes(normalizeStudentName(sub.studentName))
          ) {
            return { ...sub, essayScore: num };
          }
          return sub;
        });
      }

      return prev.map((sub) =>
        sub.studentId === studentId ? { ...sub, essayScore: num } : sub
      );
    });
  };

  const handleExtraPointsChange = (studentId: string, valStr: string) => {
    const val = parseFloat(valStr);
    setSubmissions((prev) =>
      prev.map((sub) =>
        sub.studentId === studentId ? { ...sub, extraPoints: isNaN(val) ? 0 : val } : sub
      )
    );
  };

  const handleFeedbackChange = (studentId: string, text: string) => {
    // Limit feedback to 400 characters
    const trimmed = text.slice(0, 400);

    setSubmissions((prev) => {
      const targetSub = prev.find((s) => s.studentId === studentId);
      if (targetSub?.groupMembers && targetSub.status === 'pending') {
        const groupNames = targetSub.groupMembers
          .split(',')
          .map((n) => normalizeStudentName(n.trim()))
          .filter(Boolean);

        return prev.map((sub) => {
          if (
            sub.studentId === studentId ||
            (sub.groupMembers && sub.groupMembers === targetSub.groupMembers) ||
            groupNames.includes(normalizeStudentName(sub.studentName))
          ) {
            return { ...sub, teacherFeedback: trimmed };
          }
          return sub;
        });
      }

      return prev.map((sub) => (sub.studentId === studentId ? { ...sub, teacherFeedback: trimmed } : sub));
    });
  };

  const handleToggleStateSystem = (studentId: string) => {
    setSubmissions((prev) =>
      prev.map((sub) =>
        sub.studentId === studentId
          ? { ...sub, registeredInStateSystem: !sub.registeredInStateSystem }
          : sub
      )
    );
  };

  const handleSave = (studentId: string, status: 'graded' | 'returned' | 'draft', targetActivityId?: string) => {
    const sub = submissions.find((s) => s.studentId === studentId);
    if (!sub) return;

    const actIdToUpdate = targetActivityId || (sub as any).originActivityId || activity.id;

    const isInitialGroupGrading = sub.status === 'pending' && Boolean(sub.groupMembers);

    if (isInitialGroupGrading) {
      const groupNames = (sub.groupMembers || '')
        .split(',')
        .map((n) => normalizeStudentName(n.trim()))
        .filter(Boolean);

      // Immediately update local submission status and scores for all group members so UI moves all group cards to correct tab
      setSubmissions((prev) =>
        prev.map((s) => {
          const isMember =
            s.studentId === studentId ||
            (s.groupMembers && s.groupMembers === sub.groupMembers) ||
            groupNames.includes(normalizeStudentName(s.studentName));

          if (isMember) {
            return {
              ...s,
              essayScore: sub.essayScore,
              teacherFeedback: sub.teacherFeedback,
              status,
            };
          }
          return s;
        })
      );
    } else {
      // Individual edit in corrigidas/devolvidas
      setSubmissions((prev) =>
        prev.map((s) => (s.studentId === studentId ? { ...s, status } : s))
      );
    }

    onUpdateSubmission(
      actIdToUpdate,
      studentId,
      sub.essayScore ?? 0,
      sub.teacherFeedback ?? '',
      status,
      sub.extraPoints ?? 0,
      sub.registeredInStateSystem ?? false
    );

    setSavedSuccessId(studentId);
    setTimeout(() => setSavedSuccessId(null), 2500);
  };

  // Action 1: Refresh Deliveries (Atualizar Entregas)
  const handleRefreshDeliveries = async () => {
    setIsRefreshing(true);
    setRefreshError(false);
    try {
      const res = await fetch('/api/activities', { cache: 'no-store' });
      if (!res.ok) {
        console.error('Erro ao buscar entregas no Firestore:', res.statusText);
        setRefreshError(true);
        return;
      }
      const payload = await res.json();
      const fresh = Array.isArray(payload.activities)
        ? payload.activities.find((a: any) => a.id === activity.id)
        : null;
      setSubmissions(fresh?.submissions || activity.submissions || []);
      setRefreshToast(true);
      setTimeout(() => setRefreshToast(false), 3000);
    } catch (err) {
      console.error('Erro ao atualizar entregas:', err);
      setRefreshError(true);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Action 2: Gemini AI Correction for Essay Response
  const handleAiCorrection = async (sub: ActivitySubmission) => {
    if (!sub.essayAnswer) {
      alert('O aluno ainda não possui resposta dissertativa para correção.');
      return;
    }

    setLoadingAiStudentId(sub.studentId);
    setAiErrorMessage(null);

    // Extract questions essay statement and keywords
    const essayQuestion = activity.questions?.find((q) => q.type === 'essay') as EssayQuestion | undefined;
    const questionStatement = essayQuestion?.statement || activity.description || activity.title;
    const keywords = essayQuestion?.keywords || '';
    const distribution = getActivityGradeDistribution(activity);
    const maxEssayForAi = distribution.hasObjective ? distribution.maxEssayGrade : distribution.maxGrade;

    try {
      const response = await fetch('/api/gemini/correct-essay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          essayAnswer: sub.essayAnswer,
          questionStatement,
          keywords,
          turma: activity.turma,
          maxEssayScore: maxEssayForAi || 10.0,
        }),
      });

      const responseText = await response.text();
      let data: Record<string, any> = {};
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(`A API de correção não retornou JSON válido (Status ${response.status}).`);
      }

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao processar correção com IA.');
      }

      // Update student submission with AI suggestion
      setSubmissions((prev) =>
        prev.map((s) => {
          if (s.studentId === sub.studentId) {
            return {
              ...s,
              essayScore: typeof data.suggestedScore === 'number' ? data.suggestedScore : s.essayScore,
              teacherFeedback: data.feedback ? data.feedback.slice(0, 300) : s.teacherFeedback,
            };
          }
          return s;
        })
      );

      // Save diagnostic map
      setAiDiagnosticMap((prev) => ({
        ...prev,
        [sub.studentId]: {
          suggestedScore: data.suggestedScore,
          feedback: data.feedback,
          themeFidelity: data.themeFidelity,
          keywordsCheck: data.keywordsCheck,
          structureCheck: data.structureCheck,
          grammarCheck: data.grammarCheck,
          aiUsagePercentage: data.aiUsagePercentage,
          aiUsageAnalysis: data.aiUsageAnalysis,
        },
      }));
    } catch (err: any) {
      console.error(err);
      setAiErrorMessage(err.message || 'Falha na conexão com o serviço do Gemini.');
    } finally {
      setLoadingAiStudentId(null);
    }
  };

  // Split multiple turmas if present
  const activityTurmas = React.useMemo(() => {
    if (!activity.turma) return [];
    return activity.turma
      .split(/[,;]+/)
      .map((t) => t.trim())
      .filter(Boolean);
  }, [activity.turma]);

  const hasMultipleTurmas = activityTurmas.length > 1;

  // Helper to get student's turma for a submission
  const getSubmissionTurma = (sub: ActivitySubmission): string => {
    const student = students.find((st) => st.id === sub.studentId || (st.matricula && st.matricula === sub.matricula));
    return student?.turma || '';
  };

  // Identificação estrutural de atividade adaptada e de recuperação
  const isAdaptedActivity = Boolean(activity.isAdapted || activity.adaptedFromId || isActivityAdapted(activity));
  const isRecoveryActivity = Boolean(activity.isRecovery || activity.recoveryFromId || activity.type === 'Recuperação Paralela' || isActivityRecovery(activity));

  // Atividade mãe caso esta seja uma Recuperação Paralela
  const parentRecoveryAct = isRecoveryActivity
    ? (allActivities || []).find((a) => a.id === activity.recoveryFromId) ||
      (allActivities || []).find(
        (a) =>
          a.id !== activity.id &&
          !isActivityRecovery(a) &&
          !isActivityAdapted(a) &&
          canStudentAccessActivity(a.turma, activity.turma) &&
          activity.title &&
          a.title &&
          activity.title.toLowerCase().includes(a.title.toLowerCase().replace(/^\[.*?\]\s*/i, '').slice(0, 15))
      )
    : null;

  // Recuperações filhas caso esta seja uma atividade canônica/mãe
  const childRecoveries = React.useMemo(() => {
    if (isRecoveryActivity) return [];
    return getChildRecoveryActivities(activity, allActivities || []);
  }, [activity, allActivities, isRecoveryActivity]);

  // Adaptações filhas (PNE) caso esta seja uma atividade canônica/mãe
  const childAdaptations = React.useMemo(() => {
    if (isAdaptedActivity) return [];
    return getChildAdaptations(activity, allActivities || []);
  }, [activity, allActivities, isAdaptedActivity]);

  // Possui atividades filhas conectadas?
  const hasLinkedChildren = childRecoveries.length > 0 || childAdaptations.length > 0;

  // Coleção efetiva de submissões (unificada ou isolada)
  const effectiveSubmissions = React.useMemo(() => {
    const mainSubs: (ActivitySubmission & { originActivityId?: string; originActivityTitle?: string; originKind?: 'canonical' | 'recovery' | 'adapted' })[] =
      submissions.map((s) => ({
        ...s,
        originActivityId: activity.id,
        originActivityTitle: activity.title,
        originKind: 'canonical',
      }));

    if (!includeChildActivities || !hasLinkedChildren) {
      return mainSubs;
    }

    const mergedSubs = [...mainSubs];
    const seenStudentIds = new Set(mainSubs.map((s) => s.studentId));

    // Inclui submissões de adaptações filhas PNE
    childAdaptations.forEach((childAct) => {
      (childAct.submissions || []).forEach((cSub) => {
        if (!seenStudentIds.has(cSub.studentId)) {
          seenStudentIds.add(cSub.studentId);
          mergedSubs.push({
            ...cSub,
            originActivityId: childAct.id,
            originActivityTitle: childAct.title,
            originKind: 'adapted',
          });
        }
      });
    });

    // Inclui submissões de recuperações filhas (quando o aluno fez recuperação)
    childRecoveries.forEach((childAct) => {
      (childAct.submissions || []).forEach((cSub) => {
        if (!seenStudentIds.has(cSub.studentId)) {
          seenStudentIds.add(cSub.studentId);
          mergedSubs.push({
            ...cSub,
            originActivityId: childAct.id,
            originActivityTitle: childAct.title,
            originKind: 'recovery',
          });
        }
      });
    });

    return mergedSubs;
  }, [submissions, includeChildActivities, hasLinkedChildren, childAdaptations, childRecoveries, activity.id, activity.title]);

  // Filter submissions by selected turma filter
  const filteredSubmissions = effectiveSubmissions.filter((s) => {
    if (selectedTurmaFilter === 'all') return true;
    const stTurma = getSubmissionTurma(s);
    if (!stTurma) return true;
    return canStudentAccessActivity(selectedTurmaFilter, stTurma);
  });

  // Categorize Submissions & Missing Students
  const pendingQueue = filteredSubmissions.filter((s) => s.status === 'pending' || s.status === 'draft');
  const gradedQueue = filteredSubmissions.filter((s) => s.status === 'graded');
  const returnedQueue = filteredSubmissions.filter((s) => s.status === 'returned');

  // Set de alunos que entregaram (seja na atividade atual ou nas filhas se integrado)
  const submittedStudentIds = React.useMemo(() => {
    const ids = new Set<string>();
    submissions.forEach((s) => {
      if (s.studentId) ids.add(s.studentId);
      if (s.matricula) ids.add(s.matricula);
    });

    if (includeChildActivities && hasLinkedChildren) {
      childAdaptations.forEach((ca) => {
        (ca.submissions || []).forEach((s) => {
          if (s.studentId) ids.add(s.studentId);
          if (s.matricula) ids.add(s.matricula);
        });
      });
      childRecoveries.forEach((cr) => {
        (cr.submissions || []).forEach((s) => {
          if (s.studentId) ids.add(s.studentId);
          if (s.matricula) ids.add(s.matricula);
        });
      });
    }

    return ids;
  }, [submissions, includeChildActivities, hasLinkedChildren, childAdaptations, childRecoveries]);

  const hasAdaptationChild = !isAdaptedActivity && childAdaptations.length > 0;

  const parentAct = isAdaptedActivity
    ? (allActivities || []).find((a) => a.id === activity.adaptedFromId)
    : null;
  const includedProficientPneIds = new Set(
    isAdaptedActivity
      ? (parentAct?.includedPneStudentIds || [])
      : (activity.includedPneStudentIds || [])
  );

  const isProficientPne = (st: StudentUser) => {
    return (
      includedProficientPneIds.has(st.id) ||
      (Boolean(st.matricula) && includedProficientPneIds.has(st.matricula)) ||
      (Boolean(st.fullName) && includedProficientPneIds.has(st.fullName))
    );
  };

  // Cálculo rigoroso de Não Fizeram (Missing Students)
  const missingStudents = students.filter((st) => {
    // Escopo de turma
    const matchesTurma = selectedTurmaFilter === 'all'
      ? canStudentAccessActivity(activity.turma, st.turma)
      : canStudentAccessActivity(selectedTurmaFilter, st.turma);

    if (!matchesTurma) return false;

    // Se o aluno já entregou na atividade principal ou em alguma filha vinculada
    const hasSubmitted = submittedStudentIds.has(st.id) || (Boolean(st.matricula) && submittedStudentIds.has(st.matricula));
    if (hasSubmitted) return false;

    const isPne = isStudentPNE(st);

    // Se estivermos em visão unificada (ou se for a atividade principal com filhas incluídas)
    if (includeChildActivities && hasLinkedChildren) {
      // Visão total da turma: todos os alunos matriculados que ainda não fizeram nenhuma entrega
      return true;
    }

    if (isAdaptedActivity) {
      // Atividade adaptada isolada: apenas alunos PNE não proficientes no regular
      return isPne && !isProficientPne(st);
    }

    if (hasAdaptationChild) {
      // Atividade principal com adaptação existente (quando visualizada sem unificação): alunos regulares + PNE proficientes
      return !isPne || isProficientPne(st);
    }

    if (isRecoveryActivity) {
      // Recuperação isolada: espera apenas quem não entregou a mãe ou tirou nota baixa
      return true;
    }

    // Atividade padrão sem adaptações: todos os matriculados
    return true;
  });

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      <GradingViewMainBody {...{ activity, allActivities, isLoading, hasError, onRetry, onSelectActivity, onBack, handleRefreshDeliveries, activityTurmas, hasMultipleTurmas, getSubmissionTurma, childRecoveries, childAdaptations, hasLinkedChildren, effectiveSubmissions, pendingQueue, gradedQueue, returnedQueue, missingStudents, selectedTurmaFilter, setSelectedTurmaFilter, includeChildActivities, setIncludeChildActivities, isRefreshing, refreshError, setRefreshError, refreshToast, activeTab, setActiveTab, isActivityDropdownOpen, setIsActivityDropdownOpen, aiErrorMessage, setAiErrorMessage, consolidationModalData, setConsolidationModalData, renderSubmissionCard }} />
    </div>
  );

  // Helper render for individual submission card
  function renderSubmissionCard(sub: ActivitySubmission) {
    const isSaved = savedSuccessId === sub.studentId;
    const isLoadingAi = loadingAiStudentId === sub.studentId;
    const aiDiag = aiDiagnosticMap[sub.studentId];
    const distribution = getActivityGradeDistribution(activity);

    // Calculate scores according to activity distribution
    const objectiveScore = distribution.hasObjective ? (sub.objectiveScore || 0) : 0;
    const essayScore = sub.essayScore !== undefined ? sub.essayScore : 0;
    const extraPoints = sub.extraPoints || 0;
    const totalScore = objectiveScore + essayScore + extraPoints;
    const maxEssayValue = distribution.hasObjective ? distribution.maxEssayGrade : distribution.maxGrade;

    const studentInfo = students.find((st) => st.id === sub.studentId || (st.matricula && st.matricula === sub.matricula));

    // Dados de Vínculo entre Avaliação Original e Recuperação Paralela
    let recoveryLinkData: {
      isRecoveryView: boolean; // Estamos vendo a tela da recuperação
      isParentView: boolean; // Estamos vendo a tela da atividade mãe
      parentGrade: number | null;
      parentTitle: string;
      recoveryGrade: number | null;
      recoveryTitle: string;
      recalculatedFinalGrade: number | null; // Melhor nota (maior entre original e recuperação)
      gradeEvolution: number | null; // Diferença da recuperação vs original
    } | null = null;

    if (isRecoveryActivity && parentRecoveryAct) {
      // Cenário 1: Estamos no GradingView da Recuperação Paralela
      const parentSub = (parentRecoveryAct.submissions || []).find(
        (s) => s.studentId === sub.studentId || (s.matricula && s.matricula === sub.matricula)
      );
      const pGrade = parentSub ? getSubmissionTotalGrade(parentSub) : null;
      const rGrade = totalScore;
      const recalculated = pGrade !== null ? Math.max(pGrade, rGrade) : rGrade;
      const evolution = pGrade !== null ? Number((rGrade - pGrade).toFixed(1)) : null;

      recoveryLinkData = {
        isRecoveryView: true,
        isParentView: false,
        parentGrade: pGrade,
        parentTitle: parentRecoveryAct.title,
        recoveryGrade: rGrade,
        recoveryTitle: activity.title,
        recalculatedFinalGrade: recalculated,
        gradeEvolution: evolution,
      };
    } else if (!isRecoveryActivity && childRecoveries.length > 0) {
      // Cenário 2: Estamos no GradingView da Avaliação Mãe e existe Recuperação Paralela
      let childSub: ActivitySubmission | undefined;
      let matchedRecoveryAct: Activity | undefined;

      for (const recAct of childRecoveries) {
        const found = (recAct.submissions || []).find(
          (s) => s.studentId === sub.studentId || (s.matricula && s.matricula === sub.matricula)
        );
        if (found) {
          childSub = found;
          matchedRecoveryAct = recAct;
          break;
        }
      }

      if (childSub && matchedRecoveryAct) {
        const pGrade = totalScore;
        const rGrade = getSubmissionTotalGrade(childSub);
        const recalculated = Math.max(pGrade, rGrade);
        const evolution = Number((rGrade - pGrade).toFixed(1));

        recoveryLinkData = {
          isRecoveryView: false,
          isParentView: true,
          parentGrade: pGrade,
          parentTitle: activity.title,
          recoveryGrade: rGrade,
          recoveryTitle: matchedRecoveryAct.title,
          recalculatedFinalGrade: recalculated,
          gradeEvolution: evolution,
        };
      }
    }

    return (
      <GradingSubmissionCardBody key={sub.studentId} {...{ sub, activity, students, handleGenerateAiFeedback, handleScoreChange, handleExtraPointsChange, handleFeedbackChange, handleToggleStateSystem, handleSave, handleAiCorrection, distribution, isSaved, isLoadingAi, aiDiag, objectiveScore, essayScore, extraPoints, totalScore, maxEssayValue, studentInfo, recoveryLinkData, generatingFeedbackState, setConsolidationModalData }} />

    );
  }
};

export default GradingView;
