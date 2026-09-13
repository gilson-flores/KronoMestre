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
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

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

  // Gemini AI Feedback state (Ninja / Serious)
  const [generatingFeedbackState, setGeneratingFeedbackState] = useState<{ studentId: string; type: 'ninja' | 'serious' } | null>(null);

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
    feedbackType: 'ninja' | 'serious' = 'ninja'
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
      if (isSupabaseConfigured && supabase) {
        const { data: dbSubmissions, error: subError } = await supabase
          .from('submissions')
          .select('*')
          .eq('activity_id', activity.id);

        if (subError) {
          console.error('Erro ao buscar entregas no Supabase:', subError);
          setRefreshError(true);
          return;
        }

        if (dbSubmissions && dbSubmissions.length > 0) {
          const distribution = getActivityGradeDistribution({
            maxGrade: activity.maxGrade || 10,
            type: activity.type,
            questions: activity.questions || [],
          });

          const mapped: ActivitySubmission[] = dbSubmissions.map((sub: any) => ({
            studentId: sub.student_id,
            studentName: sub.student_name,
            matricula: sub.matricula,
            tag: sub.tag,
            avatarUrl: sub.avatar_url,
            objectiveScore: Number(sub.objective_score || 0),
            maxObjectiveScore:
              sub.max_objective_score !== undefined && sub.max_objective_score !== null
                ? Number(sub.max_objective_score)
                : distribution.maxObjectiveGrade,
            essayScore:
              sub.essay_score !== null && sub.essay_score !== undefined
                ? Number(sub.essay_score)
                : undefined,
            maxEssayScore:
              sub.max_essay_score !== undefined && sub.max_essay_score !== null
                ? Number(sub.max_essay_score)
                : distribution.maxEssayGrade,
            status: sub.status,
            essayAnswer: sub.essay_answer,
            teacherFeedback: sub.teacher_feedback,
            extraPoints: Number(sub.extra_points || 0),
            registeredInStateSystem: Boolean(sub.registered_in_state_system),
            groupMembers: sub.group_members,
            returnCount: Number(sub.return_count || 0),
          }));
          setSubmissions(mapped);
        } else {
          setSubmissions(activity.submissions || []);
        }
      } else {
        setSubmissions(activity.submissions || []);
      }
      setRefreshToast(true);
      setTimeout(() => setRefreshToast(false), 3000);
    } catch (err) {
      console.error('Erro ao atualizar entregas do Supabase:', err);
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
      {/* Top Header Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
        <button
          onClick={onBack}
          className="w-full sm:w-auto inline-flex items-center justify-center sm:justify-start gap-2 px-4 py-2 min-h-[44px] min-w-[44px] bg-[#171f33] hover:bg-surface-hover text-foreground rounded-full text-xs font-bold transition-all border border-border cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          <span>Voltar para Atividades</span>
        </button>

        {/* Action Buttons: Refresh Deliveries & Select Activity */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
          {/* Botão de Atualizar Entregas */}
          <button
            onClick={handleRefreshDeliveries}
            disabled={isRefreshing}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-surface hover:bg-[#1c263f] text-primary rounded-full text-xs font-bold transition-all border border-primary/30 cursor-pointer shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Sincronizando...' : 'Atualizar Entregas'}</span>
          </button>

          {/* Botão de Corrigir Atividade (Seletor) */}
          <div className="relative w-full sm:w-auto">
            <button
              onClick={() => setIsActivityDropdownOpen(!isActivityDropdownOpen)}
              className="w-full inline-flex items-center justify-between gap-2 px-4 py-2 min-h-[44px] min-w-[44px] bg-primary hover:bg-primary-hover text-white rounded-full text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              <div className="flex items-center gap-1.5 truncate">
                <FileCheck2 className="w-4 h-4 shrink-0" />
                <span className="truncate">Corrigir Atividade</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 shrink-0" />
            </button>

            {/* Dropdown Menu of Activities */}
            {isActivityDropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-surface border border-border rounded-2xl shadow-2xl p-2 z-50 space-y-1">
                <div className="px-3 py-2 text-[10px] font-bold text-text-muted uppercase tracking-wider border-b border-border">
                  Selecione para Corrigir
                </div>
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {allActivities.length === 0 ? (
                    <div className="p-3 text-xs text-text-muted">Nenhuma outra atividade.</div>
                  ) : (
                    allActivities.map((act) => (
                      <button
                        key={act.id}
                        onClick={() => {
                          if (onSelectActivity) onSelectActivity(act);
                          setIsActivityDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition-all flex items-center justify-between cursor-pointer ${
                          act.id === activity.id
                            ? 'bg-primary/20 text-primary font-bold'
                            : 'text-foreground hover:bg-surface-hover'
                        }`}
                      >
                        <span className="truncate">{act.title}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-surface-hover text-text-muted">
                          {act.turma}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toast Alert for Deliveries Refresh */}
      {refreshToast && (
        <div className="p-4 bg-primary/20 border border-primary/40 text-primary rounded-2xl text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4" />
          <span>Entregas sincronizadas e atualizadas com sucesso!</span>
        </div>
      )}

      {/* Activity Title & General Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-2">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-xs font-bold bg-primary/20 text-primary px-3 py-1 rounded-full border border-primary/30 uppercase">
              {activity.turma || 'Todas as Turmas'}
            </span>
            <span className="text-xs font-bold bg-[#171f33] text-[#c0c1ff] px-3 py-1 rounded-full border border-border uppercase">
              {activity.type}
            </span>
            {activity.deadline && (
              <span className="text-xs font-bold bg-amber-100 text-amber-600 px-3 py-1 rounded-full border border-amber-500/30 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Prazo: {activity.deadline}
              </span>
            )}
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
            {activity.title}
          </h1>
          <p className="text-xs md:text-sm text-text-muted mt-1 font-medium max-w-3xl">
            {activity.description}
          </p>

          {/* Display essay question keywords if defined */}
          {activity.questions?.some((q) => q.type === 'essay' && q.keywords) && (
            <div className="mt-3 inline-flex items-center gap-2 bg-primary/10 border border-primary/30 px-3 py-1.5 rounded-xl text-xs text-primary-hover">
              <span className="font-bold">Palavras-Chave Exigidas:</span>
              <span>
                {activity.questions
                  .filter((q) => q.type === 'essay' && q.keywords)
                  .map((q: any) => q.keywords)
                  .join(', ')}
              </span>
            </div>
          )}
        </div>

        {/* Counter Badge */}
        <div className="glass-panel p-3.5 sm:px-6 sm:py-3.5 rounded-3xl border border-border grid grid-cols-2 sm:grid-cols-4 lg:flex lg:items-center gap-3 sm:gap-4 lg:gap-6 w-full lg:w-auto shrink-0">
          <div className="text-center">
            <span className="text-lg sm:text-xl font-extrabold text-primary flex items-center justify-center min-h-[28px]">
              {isLoading || isRefreshing ? (
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              ) : (
                gradedQueue.length
              )}
            </span>
            <span className="block text-[10px] font-bold text-text-muted tracking-wider uppercase">
              Já Corrigidas
            </span>
          </div>
          <div className="hidden lg:block w-px h-8 bg-surface-hover"></div>
          <div className="text-center">
            <span className="text-lg sm:text-xl font-extrabold text-amber-400 flex items-center justify-center min-h-[28px]">
              {isLoading || isRefreshing ? (
                <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
              ) : (
                pendingQueue.length
              )}
            </span>
            <span className="block text-[10px] font-bold text-text-muted tracking-wider uppercase">
              Na Fila
            </span>
          </div>
          <div className="hidden lg:block w-px h-8 bg-surface-hover"></div>
          <div className="text-center">
            <span className="text-lg sm:text-xl font-extrabold text-sky-400 flex items-center justify-center min-h-[28px]">
              {isLoading || isRefreshing ? (
                <Loader2 className="w-5 h-5 animate-spin text-sky-400" />
              ) : (
                returnedQueue.length
              )}
            </span>
            <span className="block text-[10px] font-bold text-text-muted tracking-wider uppercase">
              Devolvidas
            </span>
          </div>
          <div className="hidden lg:block w-px h-8 bg-surface-hover"></div>
          <div className="text-center">
            <span className="text-lg sm:text-xl font-extrabold text-rose-400 flex items-center justify-center min-h-[28px]">
              {isLoading || isRefreshing ? (
                <Loader2 className="w-5 h-5 animate-spin text-rose-400" />
              ) : (
                missingStudents.length
              )}
            </span>
            <span className="block text-[10px] font-bold text-text-muted tracking-wider uppercase">
              Não Fizeram
            </span>
          </div>
        </div>
      </div>

      {/* Barra de Controle da Visão Total (Atividades Filhas: PNE e Recuperações Paralelas) */}
      {hasLinkedChildren && (
        <div className="bg-surface/80 p-4 rounded-3xl border border-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black text-foreground">
                  Visão Unificada do Ciclo Pedagógico
                </span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                  {childAdaptations.length + childRecoveries.length} filhas vinculadas
                </span>
              </div>
              <p className="text-[11px] text-text-muted">
                {includeChildActivities
                  ? 'Mostrando em conjunto a atividade principal e todas as entregas das adaptações PNE e recuperações.'
                  : 'Modo isolado ativo: exibindo estritamente as entregas desta atividade específica.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto sm:self-center shrink-0">
            <button
              onClick={() => setIncludeChildActivities(!includeChildActivities)}
              className={`w-full sm:w-auto justify-center px-4 py-2 min-h-[44px] min-w-[44px] rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border ${
                includeChildActivities
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-background text-text-muted hover:text-foreground border-border'
              }`}
            >
              <GitFork className="w-3.5 h-3.5" />
              <span>{includeChildActivities ? 'Visão Total Ativa' : 'Ativar Visão Total'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Turma Filter Bar (Exibido quando a atividade possui mais de uma turma associada ou em visão unificada) */}
      {(hasMultipleTurmas || (includeChildActivities && hasLinkedChildren)) && (
        <div className="flex flex-wrap items-center gap-2 p-3 sm:p-3.5 bg-surface rounded-2xl border border-border">
          <div className="w-full sm:w-auto flex items-center gap-1.5 text-xs font-bold text-text-muted mr-1">
            <Filter className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>Filtrar por Turma:</span>
          </div>
          <button
            onClick={() => setSelectedTurmaFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[36px] ${
              selectedTurmaFilter === 'all'
                ? 'bg-primary text-white shadow-sm font-extrabold'
                : 'bg-[#171f33] text-text-muted hover:text-foreground hover:bg-surface-hover border border-border'
            }`}
          >
            Todas as Turmas ({effectiveSubmissions.length})
          </button>
          {activityTurmas.map((turmaCode) => {
            const countInTurma = effectiveSubmissions.filter((s) => {
              const stTurma = getSubmissionTurma(s);
              return stTurma ? canStudentAccessActivity(turmaCode, stTurma) : true;
            }).length;
            return (
              <button
                key={turmaCode}
                onClick={() => setSelectedTurmaFilter(turmaCode)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[36px] ${
                  selectedTurmaFilter === turmaCode
                    ? 'bg-primary text-white shadow-sm font-extrabold'
                    : 'bg-[#171f33] text-text-muted hover:text-foreground hover:bg-surface-hover border border-border'
                }`}
              >
                Turma {turmaCode} ({countInTurma})
              </button>
            );
          })}
        </div>
      )}

      {/* Correction Sub-Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-b border-border pb-2">
        <button
          onClick={() => setActiveTab('fila')}
          className={`px-2.5 sm:px-4 py-2.5 sm:py-3 rounded-2xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer min-h-[44px] ${
            activeTab === 'fila'
              ? 'bg-primary text-white shadow-md'
              : 'bg-surface text-text-muted hover:text-foreground hover:bg-[#1c263f]'
          }`}
        >
          <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          <span>Fila ({pendingQueue.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('corrigidas')}
          className={`px-2.5 sm:px-4 py-2.5 sm:py-3 rounded-2xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer min-h-[44px] ${
            activeTab === 'corrigidas'
              ? 'bg-primary text-white shadow-md'
              : 'bg-surface text-text-muted hover:text-foreground hover:bg-[#1c263f]'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          <span>Corrigidas ({gradedQueue.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('devolvidas')}
          className={`px-2.5 sm:px-4 py-2.5 sm:py-3 rounded-2xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer min-h-[44px] ${
            activeTab === 'devolvidas'
              ? 'bg-sky-500 text-foreground shadow-md'
              : 'bg-surface text-text-muted hover:text-foreground hover:bg-[#1c263f]'
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          <span>Devolvidas ({returnedQueue.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('nao_fizeram')}
          className={`px-2.5 sm:px-4 py-2.5 sm:py-3 rounded-2xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer min-h-[44px] ${
            activeTab === 'nao_fizeram'
              ? 'bg-rose-500 text-white shadow-md'
              : 'bg-surface text-text-muted hover:text-foreground hover:bg-[#1c263f]'
          }`}
        >
          <UserX className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          <span>Pendentes ({missingStudents.length})</span>
        </button>
      </div>

      {/* Global Error Banner */}
      {aiErrorMessage && (
        <div className="p-4 bg-rose-100 border border-rose-200 text-rose-600 rounded-2xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{aiErrorMessage}</span>
          </div>
          <button
            onClick={() => setAiErrorMessage(null)}
            className="text-foreground hover:underline text-[10px] uppercase font-bold cursor-pointer"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Visualização das Entregas e Fila de Correção */}
      {isLoading || isRefreshing ? (
        <GradingLoadingSkeleton
          title={isRefreshing ? 'Atualizando entregas...' : 'Carregando entregas para correção...'}
          subtitle="Sincronizando respostas dos alunos e notas com o banco de dados..."
        />
      ) : hasError || refreshError ? (
        <StandardErrorState
          title="Não conseguimos carregar as entregas para correção agora."
          message="Verifique sua conexão com a internet e tente novamente."
          onRetry={() => {
            setRefreshError(false);
            if (refreshError) {
              handleRefreshDeliveries();
            } else if (onRetry) {
              onRetry();
            }
          }}
          retryLabel="Tentar novamente"
        />
      ) : (
        <>
          {/* TAB 1: FILA DE CORREÇÃO */}
          {activeTab === 'fila' && (
            <>
              {pendingQueue.length === 0 ? (
                <div className="glass-panel p-12 text-center rounded-3xl border border-border text-text-muted space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-primary mx-auto opacity-80" />
                  <p className="text-sm font-bold text-foreground">Nenhuma entrega pendente na fila!</p>
                  <p className="text-xs">Todas as respostas enviadas para esta atividade já foram corrigidas.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {pendingQueue.map((sub) => renderSubmissionCard(sub))}
                </div>
              )}
            </>
          )}

          {/* TAB 2: JÁ CORRIGIDAS */}
          {activeTab === 'corrigidas' && (
            <>
              {gradedQueue.length === 0 ? (
                <div className="glass-panel p-12 text-center rounded-3xl border border-border text-text-muted space-y-2">
                  <Clock className="w-10 h-10 text-amber-400 mx-auto opacity-80" />
                  <p className="text-sm font-bold text-foreground">Nenhuma atividade corrigida ainda.</p>
                  <p className="text-xs">As atividades avaliadas e finalizadas aparecerão nesta aba.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {gradedQueue.map((sub) => renderSubmissionCard(sub))}
                </div>
              )}
            </>
          )}

          {/* TAB 3: DEVOLVIDAS PARA REFAZER */}
          {activeTab === 'devolvidas' && (
            <>
              {returnedQueue.length === 0 ? (
                <div className="glass-panel p-12 text-center rounded-3xl border border-border text-text-muted space-y-2">
                  <RotateCcw className="w-10 h-10 text-sky-400 mx-auto opacity-80" />
                  <p className="text-sm font-bold text-foreground">Nenhuma atividade devolvida no momento.</p>
                  <p className="text-xs">Quando você clicar em &ldquo;Devolver para Refazer&rdquo;, a atividade aparecerá aqui e o aluno poderá enviar uma nova resposta no portal.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {returnedQueue.map((sub) => renderSubmissionCard(sub))}
                </div>
              )}
            </>
          )}

          {/* TAB 3: NÃO FIZERAM */}
          {activeTab === 'nao_fizeram' && (
            <div className="space-y-4">
              {missingStudents.length === 0 ? (
                <div className="glass-panel p-12 text-center rounded-3xl border border-border text-text-muted">
                  🎉 Todos os alunos da turma enviaram a atividade!
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {missingStudents.map((st) => (
                    <div
                      key={st.id}
                      className="glass-panel p-4 sm:p-5 rounded-3xl border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={st.avatarUrl}
                          alt={st.fullName}
                          loading="lazy"
                          decoding="async"
                          className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover border-2 border-rose-500/30 shrink-0"
                        />
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-foreground truncate">{st.fullName}</h4>
                          <p className="text-[10px] text-text-muted truncate">
                            Turma: {st.turma} • Matrícula: {st.matricula}
                          </p>
                          {st.tag && (
                            <span className="inline-block mt-1 text-[9px] font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-600 border border-rose-500/30">
                              {st.tag}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => alert(`Lembrete enviado para o aluno ${st.fullName}!`)}
                        className="w-full sm:w-auto px-3 py-2 min-h-[44px] bg-[#171f33] hover:bg-surface-hover text-rose-600 rounded-xl text-xs font-bold border border-rose-500/30 transition-all cursor-pointer flex items-center justify-center shrink-0"
                      >
                        Enviar Lembrete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Modal Popup de Consolidação de Notas de Recuperação Paralela */}
      <GradeConsolidationModal
        isOpen={Boolean(consolidationModalData)}
        onClose={() => setConsolidationModalData(null)}
        data={consolidationModalData?.data || null}
        studentName={consolidationModalData?.studentName}
        matricula={consolidationModalData?.matricula}
        turma={consolidationModalData?.turma}
      />
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
      <div
        key={sub.studentId}
        className="glass-panel p-4 sm:p-6 rounded-3xl border border-border space-y-4 sm:space-y-5 relative flex flex-col justify-between"
      >
        {/* Card Header: Student Info & Badges */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={sub.avatarUrl}
              alt={sub.studentName}
              loading="lazy"
              decoding="async"
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-border shrink-0"
            />
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-foreground truncate">{sub.studentName}</h3>
              <p className="text-[10px] text-text-muted uppercase tracking-wider truncate">
                {studentInfo?.turma ? `TURMA: ${studentInfo.turma} • ` : ''}MATRÍCULA: {sub.matricula}
              </p>
              {sub.groupMembers && (
                <p className="text-[10px] text-purple-600 mt-0.5 font-medium break-words">
                  👥 Grupo: {sub.groupMembers}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-col sm:items-end gap-1.5 w-full sm:w-auto">
            {/* Return Count Badge */}
            {(sub as any).originKind && (sub as any).originKind !== 'canonical' && (
              <span
                className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                  (sub as any).originKind === 'adapted'
                    ? 'bg-purple-100 text-purple-700 border-purple-300'
                    : 'bg-emerald-100 text-emerald-700 border-emerald-300'
                }`}
                title={`Entregue via ${(sub as any).originActivityTitle || 'atividade filha'}`}
              >
                <GitFork className="w-2.5 h-2.5" />
                {(sub as any).originKind === 'adapted' ? 'Adaptada PNE' : 'Recuperação'}
              </span>
            )}

            {sub.returnCount && sub.returnCount > 0 ? (
              <span
                className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                  sub.returnCount === 3
                    ? 'bg-rose-100 text-rose-600 border-rose-200'
                    : sub.returnCount === 2
                    ? 'bg-orange-600/20 text-orange-200 border-orange-500/40'
                    : 'bg-orange-500/20 text-orange-300 border-orange-500/30'
                }`}
              >
                ↩️ Devolvida {sub.returnCount}x {sub.returnCount >= 3 ? '(4ª Bloqueada)' : ''}
              </span>
            ) : null}

            {sub.tag && (
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                  sub.tag === 'PNE'
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : sub.tag === 'RAD'
                    ? 'bg-[#c0c1ff]/20 text-[#c0c1ff] border border-[#c0c1ff]/30'
                    : 'bg-[#171f33] text-text-muted'
                }`}
              >
                {sub.tag}
              </span>
            )}

            {/* Recovery status badge if linked */}
            {recoveryLinkData && (
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 flex items-center gap-1">
                <RotateCcw className="w-3 h-3" />
                {recoveryLinkData.isRecoveryView ? 'Fez Recuperação' : 'Teve Recuperação'}
              </span>
            )}

            {/* Registration status badge in State System */}
            {sub.registeredInStateSystem ? (
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-600 border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                No RCO/SED
              </span>
            ) : (
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/30">
                Pendente RCO
              </span>
            )}
          </div>
        </div>

        {/* Student Essay Response Block */}
        {sub.essayAnswer && (
          <div className="bg-surface p-4 rounded-2xl border border-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-text-muted">
                Resposta Dissertativa do Aluno:
              </span>
              <span className="text-[10px] text-text-muted">
                {sub.essayAnswer.length} caracteres
              </span>
            </div>
            <p className="italic text-xs text-foreground leading-relaxed bg-background p-3 rounded-xl border border-border">
              &ldquo;{sub.essayAnswer}&rdquo;
            </p>

            {/* AI Correction Trigger Button */}
            <button
              onClick={() => handleAiCorrection(sub)}
              disabled={isLoadingAi}
              className="w-full mt-2 py-2.5 px-4 min-h-[44px] min-w-[44px] bg-gradient-to-r from-purple-600 via-indigo-600 to-primary-hover hover:from-purple-500 hover:to-primary text-foreground font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 ${isLoadingAi ? 'animate-spin' : ''}`} />
              <span>
                {isLoadingAi
                  ? 'Gemini analisando tema, palavras-chave e gramática...'
                  : 'Corrigir Produção Textual com Gemini (IA)'}
              </span>
            </button>
          </div>
        )}

        {/* AI Diagnostic Results Accordion / Card */}
        {aiDiag && (
          <div className="bg-[#1e1b4b]/60 border border-purple-500/30 rounded-2xl p-4 space-y-2.5 text-xs text-foreground animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-500/20 pb-2">
              <div className="flex items-center gap-2 text-purple-600 font-bold">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>Diagnóstico IA - Google Gemini</span>
              </div>
              {typeof aiDiag.aiUsagePercentage === 'number' && (
                <div
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold border ${
                    aiDiag.aiUsagePercentage <= 25
                      ? 'bg-emerald-100 text-emerald-600 border-emerald-200'
                      : aiDiag.aiUsagePercentage <= 60
                      ? 'bg-amber-100 text-amber-600 border-amber-200'
                      : 'bg-rose-100 text-rose-600 border-rose-200'
                  }`}
                >
                  <span>🤖 Uso Estimado de IA: {Math.round(aiDiag.aiUsagePercentage)}%</span>
                  {aiDiag.aiUsagePercentage <= 25 ? (
                    <span className="text-[10px] font-normal text-emerald-200">(Autoria & Pesquisa Recompensada ✨)</span>
                  ) : aiDiag.aiUsagePercentage > 60 ? (
                    <span className="text-[10px] font-normal text-rose-200">(Suspeita de Cópia Integral)</span>
                  ) : null}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
              <div className="bg-surface/80 p-2.5 rounded-xl border border-border">
                <span className="text-purple-600 font-bold block mb-0.5">🎯 Fidelidade ao Tema:</span>
                <p className="text-text-muted">{aiDiag.themeFidelity}</p>
              </div>

              <div className="bg-surface/80 p-2.5 rounded-xl border border-border">
                <span className="text-purple-600 font-bold block mb-0.5">🔑 Uso de Palavras-Chave:</span>
                <p className="text-text-muted">{aiDiag.keywordsCheck}</p>
              </div>

              <div className="bg-surface/80 p-2.5 rounded-xl border border-border">
                <span className="text-purple-600 font-bold block mb-0.5">📝 Estrutura Textual:</span>
                <p className="text-text-muted">{aiDiag.structureCheck}</p>
              </div>

              <div className="bg-surface/80 p-2.5 rounded-xl border border-border">
                <span className="text-purple-600 font-bold block mb-0.5">✍️ Gramática e Ortografia:</span>
                <p className="text-text-muted">{aiDiag.grammarCheck}</p>
              </div>

              {aiDiag.aiUsageAnalysis && (
                <div className="sm:col-span-2 bg-surface/90 p-2.5 rounded-xl border border-purple-500/20 flex flex-col gap-1">
                  <span className="text-purple-600 font-bold flex items-center gap-1.5">
                    <span>🔬 Análise de Autoria, Pesquisa e Uso de IA:</span>
                  </span>
                  <p className="text-foreground text-[11px] leading-relaxed">
                    {aiDiag.aiUsageAnalysis}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Scores & Extra Points Input Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
          {/* Objective Score (Only shown if activity has objective questions) */}
          {distribution.hasObjective && (
            <div className="col-span-2 sm:col-span-1 bg-surface p-3 rounded-2xl border border-border flex sm:block items-center justify-between">
              <span className="block text-[9px] font-bold text-text-muted uppercase tracking-wider sm:mb-1">
                Objetivas
              </span>
              <div className="text-base sm:text-lg font-extrabold text-primary">
                {objectiveScore.toFixed(1)}{' '}
                <span className="text-xs text-text-muted font-normal">/ {distribution.maxObjectiveGrade.toFixed(1)}</span>
              </div>
            </div>
          )}

          {/* Essay Score */}
          <div className="bg-surface p-3 rounded-2xl border border-border">
            <span className="block text-[9px] font-bold text-text-muted uppercase tracking-wider mb-1">
              Dissertativa
            </span>
            <div className="flex items-baseline gap-1">
              <input
                type="number"
                step="0.5"
                min="0"
                max={maxEssayValue}
                value={sub.essayScore !== undefined ? sub.essayScore : ''}
                onChange={(e) => handleScoreChange(sub.studentId, e.target.value)}
                placeholder="-"
                className="w-12 sm:w-14 bg-[#171f33] border border-border rounded-xl px-2 py-1 text-base font-extrabold text-foreground text-center focus:outline-none focus:border-primary"
              />
              <span className="text-xs text-text-muted font-normal">/ {maxEssayValue.toFixed(1)}</span>
            </div>
          </div>

          {/* Extra Points by Teacher */}
          <div className="bg-surface p-3 rounded-2xl border border-amber-500/20">
            <span className="block text-[9px] font-bold text-amber-600 uppercase tracking-wider mb-1 flex items-center gap-1 truncate">
              <Award className="w-3 h-3 shrink-0" /> Ponto Extra
            </span>
            <input
              type="number"
              step="0.5"
              min="0"
              max="3"
              value={sub.extraPoints || 0}
              onChange={(e) => handleExtraPointsChange(sub.studentId, e.target.value)}
              className="w-full bg-[#171f33] border border-amber-500/30 rounded-xl px-2 py-1 text-base font-extrabold text-amber-600 text-center focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>

        {/* Calculated Final Total Score Banner */}
        <div className="bg-gradient-to-r from-[#171f33] to-[#1e293b] p-3 rounded-2xl border border-border flex items-center justify-between">
          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Award className="w-4 h-4 text-amber-400" />
            Nota Final Total:
          </span>
          <span className="text-xl font-extrabold text-primary">
            {totalScore.toFixed(1)}{' '}
            <span className="text-xs text-text-muted">
              / {distribution.maxGrade.toFixed(1)}
            </span>
          </span>
        </div>

        {/* Visual Link: Consolidação de Notas da Recuperação Paralela (Resumo Compacto + Botão Janela Popup) */}
        {recoveryLinkData && (
          <div className="p-3 rounded-2xl bg-surface border border-primary/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 bg-primary/20 text-primary rounded-xl shrink-0">
                <RotateCcw className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-foreground">
                    Recuperação Paralela Vinculada
                  </span>
                  {recoveryLinkData.recalculatedFinalGrade !== null && (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      Consolidada: {recoveryLinkData.recalculatedFinalGrade.toFixed(1)}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-text-muted truncate">
                  {recoveryLinkData.isRecoveryView
                    ? `Raiz: "${recoveryLinkData.parentTitle}"`
                    : `Recuperação: "${recoveryLinkData.recoveryTitle}"`}
                </p>
              </div>
            </div>

            {/* Botão para Abrir Janela Popup Completa de Consolidação */}
            <button
              type="button"
              onClick={() => {
                const currentStudentUser = students.find((s) => s.id === sub.studentId);
                setConsolidationModalData({
                  data: recoveryLinkData,
                  studentName: sub.studentName || currentStudentUser?.fullName || 'Aluno',
                  matricula: currentStudentUser?.matricula || sub.matricula,
                  turma: currentStudentUser?.turma || activity.turma,
                });
              }}
              className="w-full sm:w-auto justify-center px-3.5 py-1.5 min-h-[44px] min-w-[44px] bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              title="Abrir registros detalhados de consolidação em janela popup"
            >
              <Maximize2 className="w-3.5 h-3.5 shrink-0" />
              <span>Ver Consolidação Completa</span>
            </button>
          </div>
        )}

        {/* Teacher Feedback Textarea */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-1.5 gap-2">
            <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider">
              Feedback Pedagógico ao Aluno
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Botão Feedback Ninja (400 chars) */}
              <button
                type="button"
                onClick={() => handleGenerateAiFeedback(sub, sub.status === 'returned' ? 'returned' : 'graded', 'ninja')}
                disabled={Boolean(generatingFeedbackState?.studentId === sub.studentId)}
                className="px-2.5 py-1 min-h-[44px] min-w-[44px] bg-amber-100 hover:bg-amber-500/30 border border-amber-200 text-amber-600 font-bold rounded-lg text-[10px] flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                title="Gerar feedback temático Ninja (Naruto) limitado a 400 caracteres com Gemini"
              >
                {generatingFeedbackState?.studentId === sub.studentId && generatingFeedbackState?.type === 'ninja' ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
                    <span>Invocando Ninja... 🍃</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Feedback Ninja ⚡</span>
                  </>
                )}
              </button>

              {/* Botão Feedback do Professor (400 chars) */}
              <button
                type="button"
                onClick={() => handleGenerateAiFeedback(sub, sub.status === 'returned' ? 'returned' : 'graded', 'serious')}
                disabled={Boolean(generatingFeedbackState?.studentId === sub.studentId)}
                className="px-2.5 py-1 min-h-[44px] min-w-[44px] bg-blue-100 hover:bg-primary/30 border border-blue-200 text-primary-hover font-bold rounded-lg text-[10px] flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                title="Gerar feedback pedagógico do professor (acolhedor e motivador, limitado a 400 caracteres) com Gemini"
              >
                {generatingFeedbackState?.studentId === sub.studentId && generatingFeedbackState?.type === 'serious' ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
                    <span>Gerando Feedback... 🎓</span>
                  </>
                ) : (
                  <>
                    <GraduationCap className="w-3.5 h-3.5 text-blue-400" />
                    <span>Feedback Professor 🎓</span>
                  </>
                )}
              </button>

              <span className="text-[10px] text-text-muted font-medium ml-1">
                {(sub.teacherFeedback || '').length}/400
              </span>
            </div>
          </div>
          <textarea
            rows={3}
            maxLength={400}
            value={sub.teacherFeedback || ''}
            onChange={(e) => handleFeedbackChange(sub.studentId, e.target.value)}
            placeholder="Feedback motivacional ou formal, observações sobre a resposta e recomendações de estudo..."
            className="w-full bg-surface border border-border rounded-2xl p-3.5 text-xs text-foreground placeholder-text-muted focus:outline-none focus:border-primary transition-all resize-none"
          />
        </div>

        {/* Checkbox for Registration in State System */}
        <div className="pt-1">
          <label className="flex items-start sm:items-center gap-2.5 cursor-pointer text-xs text-foreground select-none bg-surface p-3 rounded-2xl border border-border hover:bg-[#1a243b] transition-colors">
            <input
              type="checkbox"
              checked={!!sub.registeredInStateSystem}
              onChange={() => handleToggleStateSystem(sub.studentId)}
              className="w-4 h-4 accent-[#4ade80] rounded cursor-pointer shrink-0 mt-0.5 sm:mt-0"
            />
            <span className="font-semibold leading-tight sm:leading-normal">
              Atividade já registrada no sistema do estado (RCO / SED)
            </span>
          </label>
        </div>

        {/* Save success feedback toast */}
        {isSaved && (
          <div className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 ${
            sub.status === 'returned'
              ? 'bg-amber-100 border border-amber-200 text-amber-600'
              : 'bg-primary/20 border border-primary/40 text-primary'
          }`}>
            <UserCheck className="w-4 h-4 shrink-0" />
            <span>
              {sub.status === 'returned'
                ? 'Atividade devolvida ao aluno para refazer!'
                : 'Nota e feedback registrados com sucesso!'}
            </span>
          </div>
        )}

        {/* Action Buttons: Save Grade / Return for Re-do */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 pt-2">
          <button
            onClick={() => handleSave(sub.studentId, 'graded')}
            className="w-full py-3 px-4 min-h-[44px] min-w-[44px] bg-primary hover:bg-primary-hover text-white font-bold rounded-full text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer text-center"
          >
            <Save className="w-4 h-4 shrink-0" />
            <span>{sub.status === 'graded' ? 'Salvar Nota' : 'Salvar e Finalizar'}</span>
          </button>

          {(sub.returnCount || 0) >= 3 ? (
            <button
              type="button"
              onClick={() => {
                alert('🚨 Bloqueio Ninja: Esta atividade já foi devolvida 3 vezes ao aluno. A 4ª devolução está BLOQUEADA! Por favor, atribua a nota final e clique em Salvar e Finalizar.');
              }}
              className="w-full py-3 px-4 min-h-[44px] min-w-[44px] bg-rose-500/10 text-rose-600 font-bold rounded-full text-xs border border-rose-500/30 flex items-center justify-center gap-2 transition-all cursor-not-allowed opacity-90 text-center"
              title="A 4ª devolução está bloqueada pelo sistema. Atribua a nota final."
            >
              <RotateCcw className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Devolvida 3x (4ª Bloqueada)</span>
            </button>
          ) : (
            <button
              onClick={() => handleSave(sub.studentId, 'returned')}
              className="w-full py-3 px-4 min-h-[44px] min-w-[44px] bg-transparent hover:bg-surface-hover text-foreground font-bold rounded-full text-xs border border-border flex items-center justify-center gap-2 transition-all cursor-pointer text-center"
            >
              <RotateCcw className="w-4 h-4 shrink-0" />
              <span>
                {sub.returnCount ? `Devolver para Refazer (${sub.returnCount}x)` : 'Devolver para Refazer'}
              </span>
            </button>
          )}
        </div>
      </div>
    );
  }
};

export default GradingView;
