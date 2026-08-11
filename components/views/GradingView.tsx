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
  Loader2
} from 'lucide-react';
import { Activity, ActivitySubmission, StudentUser, EssayQuestion } from '@/lib/types';
import { canStudentAccessActivity, normalizeStudentName } from '@/lib/studentUtils';

interface GradingViewProps {
  activity: Activity;
  allActivities?: Activity[];
  students?: StudentUser[];
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
}

export const GradingView: React.FC<GradingViewProps> = ({
  activity,
  allActivities = [],
  students = [],
  onSelectActivity,
  onBack,
  onUpdateSubmission,
}) => {
  // Sync state with selected activity
  const [prevActivityId, setPrevActivityId] = useState(activity.id);
  const [prevSubmissions, setPrevSubmissions] = useState(activity.submissions);
  const [submissions, setSubmissions] = useState<ActivitySubmission[]>(activity.submissions || []);

  const [savedSuccessId, setSavedSuccessId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshToast, setRefreshToast] = useState(false);

  // Sub-tabs: 'fila' | 'corrigidas' | 'devolvidas' | 'nao_fizeram'
  const [activeTab, setActiveTab] = useState<'fila' | 'corrigidas' | 'devolvidas' | 'nao_fizeram'>('fila');

  // Activity Switcher Modal/Dropdown state
  const [isActivityDropdownOpen, setIsActivityDropdownOpen] = useState(false);

  // Gemini AI Loading and Result state per student
  const [loadingAiStudentId, setLoadingAiStudentId] = useState<string | null>(null);
  const [aiDiagnosticMap, setAiDiagnosticMap] = useState<Record<string, AIDiagnostic>>({});
  const [aiErrorMessage, setAiErrorMessage] = useState<string | null>(null);

  // Naruto-themed Gemini AI Feedback state
  const [generatingFeedbackStudentId, setGeneratingFeedbackStudentId] = useState<string | null>(null);

  const handleGenerateAiFeedback = async (sub: ActivitySubmission, statusAction: 'graded' | 'returned') => {
    try {
      setGeneratingFeedbackStudentId(sub.studentId);
      
      const objTotal = activity.questions ? activity.questions.filter(q => q.type === 'multiple_choice').length : 0;
      const objCorrect = sub.objectiveScore ? Math.round(sub.objectiveScore) : 0;
      const currentScore = (sub.objectiveScore || 0) + (sub.essayScore || 0) + (sub.extraPoints || 0);

      const res = await fetch('/api/gemini/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: sub.studentName,
          activityTitle: activity.title,
          grade: currentScore,
          statusAction,
          essayAnswer: sub.essayAnswer || '',
          objectiveSummary: { total: objTotal, correct: objCorrect },
        }),
      });

      const data = await res.json();
      if (data.feedback) {
        handleFeedbackChange(sub.studentId, data.feedback);
      }
    } catch (err) {
      console.error('Erro ao gerar feedback do Sensei com Gemini:', err);
    } finally {
      setGeneratingFeedbackStudentId(null);
    }
  };

  if (activity.id !== prevActivityId) {
    setPrevActivityId(activity.id);
    setPrevSubmissions(activity.submissions);
    setSubmissions(activity.submissions || []);
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

  const handleSave = (studentId: string, status: 'graded' | 'returned' | 'draft') => {
    const sub = submissions.find((s) => s.studentId === studentId);
    if (!sub) return;

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
      activity.id,
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
  const handleRefreshDeliveries = () => {
    setIsRefreshing(true);
    setSubmissions(activity.submissions || []);
    setTimeout(() => {
      setIsRefreshing(false);
      setRefreshToast(true);
      setTimeout(() => setRefreshToast(false), 3000);
    }, 400);
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

    try {
      const response = await fetch('/api/gemini/correct-essay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          essayAnswer: sub.essayAnswer,
          questionStatement,
          keywords,
          turma: activity.turma,
          maxEssayScore: sub.maxEssayScore || 5.0,
        }),
      });

      const data = await response.json();

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
        },
      }));
    } catch (err: any) {
      console.error(err);
      setAiErrorMessage(err.message || 'Falha na conexão com o serviço do Gemini.');
    } finally {
      setLoadingAiStudentId(null);
    }
  };

  // Categorize Submissions & Missing Students
  const pendingQueue = submissions.filter((s) => s.status === 'pending' || s.status === 'draft');
  const gradedQueue = submissions.filter((s) => s.status === 'graded');
  const returnedQueue = submissions.filter((s) => s.status === 'returned');

  // Find students in the turma who haven't submitted yet
  const submittedStudentIds = new Set(submissions.map((s) => s.studentId));
  const missingStudents = students.filter((st) => {
    const isSameTurma = canStudentAccessActivity(activity.turma, st.turma);
    return isSameTurma && !submittedStudentIds.has(st.id);
  });

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* Top Header Controls Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#171f33] hover:bg-[#222a3d] text-[#dae2fd] rounded-full text-xs font-bold transition-all border border-white/10 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Atividades</span>
        </button>

        {/* Action Buttons: Refresh Deliveries & Select Activity */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Botão de Atualizar Entregas */}
          <button
            onClick={handleRefreshDeliveries}
            disabled={isRefreshing}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#131b2e] hover:bg-[#1c263f] text-[#4ade80] rounded-full text-xs font-bold transition-all border border-[#4ade80]/30 cursor-pointer shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Sincronizando...' : 'Atualizar Entregas'}</span>
          </button>

          {/* Botão de Corrigir Atividade (Seletor) */}
          <div className="relative flex-1 sm:flex-initial">
            <button
              onClick={() => setIsActivityDropdownOpen(!isActivityDropdownOpen)}
              className="w-full inline-flex items-center justify-between gap-2 px-4 py-2 bg-[#4ade80] hover:bg-[#6bfb9a] text-[#003919] rounded-full text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              <div className="flex items-center gap-1.5 truncate">
                <FileCheck2 className="w-4 h-4 shrink-0" />
                <span className="truncate">Corrigir Atividade</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 shrink-0" />
            </button>

            {/* Dropdown Menu of Activities */}
            {isActivityDropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl p-2 z-50 space-y-1">
                <div className="px-3 py-2 text-[10px] font-bold text-[#bccabb] uppercase tracking-wider border-b border-white/5">
                  Selecione para Corrigir
                </div>
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {allActivities.length === 0 ? (
                    <div className="p-3 text-xs text-[#bccabb]">Nenhuma outra atividade.</div>
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
                            ? 'bg-[#4ade80]/20 text-[#4ade80] font-bold'
                            : 'text-white hover:bg-white/5'
                        }`}
                      >
                        <span className="truncate">{act.title}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/10 text-[#bccabb]">
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
        <div className="p-4 bg-[#4ade80]/20 border border-[#4ade80]/40 text-[#4ade80] rounded-2xl text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4" />
          <span>Entregas sincronizadas e atualizadas com sucesso!</span>
        </div>
      )}

      {/* Activity Title & General Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-2">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-xs font-bold bg-[#4ade80]/20 text-[#4ade80] px-3 py-1 rounded-full border border-[#4ade80]/30 uppercase">
              {activity.turma || 'Todas as Turmas'}
            </span>
            <span className="text-xs font-bold bg-[#171f33] text-[#c0c1ff] px-3 py-1 rounded-full border border-white/10 uppercase">
              {activity.type}
            </span>
            {activity.deadline && (
              <span className="text-xs font-bold bg-amber-500/20 text-amber-300 px-3 py-1 rounded-full border border-amber-500/30 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Prazo: {activity.deadline}
              </span>
            )}
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            {activity.title}
          </h1>
          <p className="text-xs md:text-sm text-[#bccabb] mt-1 font-medium max-w-3xl">
            {activity.description}
          </p>

          {/* Display essay question keywords if defined */}
          {activity.questions?.some((q) => q.type === 'essay' && q.keywords) && (
            <div className="mt-3 inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 px-3 py-1.5 rounded-xl text-xs text-blue-300">
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
        <div className="glass-panel px-6 py-3.5 rounded-3xl border border-white/10 flex items-center gap-6 shrink-0 self-start lg:self-center">
          <div className="text-center">
            <span className="text-xl font-extrabold text-[#4ade80]">{gradedQueue.length}</span>
            <span className="block text-[10px] font-bold text-[#bccabb] tracking-wider uppercase">
              Já Corrigidas
            </span>
          </div>
          <div className="w-px h-8 bg-white/10"></div>
          <div className="text-center">
            <span className="text-xl font-extrabold text-amber-400">{pendingQueue.length}</span>
            <span className="block text-[10px] font-bold text-[#bccabb] tracking-wider uppercase">
              Na Fila
            </span>
          </div>
          <div className="w-px h-8 bg-white/10"></div>
          <div className="text-center">
            <span className="text-xl font-extrabold text-sky-400">{returnedQueue.length}</span>
            <span className="block text-[10px] font-bold text-[#bccabb] tracking-wider uppercase">
              Devolvidas
            </span>
          </div>
          <div className="w-px h-8 bg-white/10"></div>
          <div className="text-center">
            <span className="text-xl font-extrabold text-rose-400">{missingStudents.length}</span>
            <span className="block text-[10px] font-bold text-[#bccabb] tracking-wider uppercase">
              Não Fizeram
            </span>
          </div>
        </div>
      </div>

      {/* Correction Sub-Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-b border-white/10 pb-2">
        <button
          onClick={() => setActiveTab('fila')}
          className={`px-4 py-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[44px] ${
            activeTab === 'fila'
              ? 'bg-[#4ade80] text-[#003919] shadow-md'
              : 'bg-[#131b2e] text-[#bccabb] hover:text-white hover:bg-[#1c263f]'
          }`}
        >
          <Clock className="w-4 h-4 shrink-0" />
          <span>Fila ({pendingQueue.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('corrigidas')}
          className={`px-4 py-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[44px] ${
            activeTab === 'corrigidas'
              ? 'bg-[#4ade80] text-[#003919] shadow-md'
              : 'bg-[#131b2e] text-[#bccabb] hover:text-white hover:bg-[#1c263f]'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Corrigidas ({gradedQueue.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('devolvidas')}
          className={`px-4 py-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[44px] ${
            activeTab === 'devolvidas'
              ? 'bg-sky-500 text-white shadow-md'
              : 'bg-[#131b2e] text-[#bccabb] hover:text-white hover:bg-[#1c263f]'
          }`}
        >
          <RotateCcw className="w-4 h-4 shrink-0" />
          <span>Devolvidas ({returnedQueue.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('nao_fizeram')}
          className={`px-4 py-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[44px] ${
            activeTab === 'nao_fizeram'
              ? 'bg-rose-500 text-white shadow-md'
              : 'bg-[#131b2e] text-[#bccabb] hover:text-white hover:bg-[#1c263f]'
          }`}
        >
          <UserX className="w-4 h-4 shrink-0" />
          <span>Pendentes ({missingStudents.length})</span>
        </button>
      </div>

      {/* Global Error Banner */}
      {aiErrorMessage && (
        <div className="p-4 bg-rose-500/20 border border-rose-500/40 text-rose-300 rounded-2xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{aiErrorMessage}</span>
          </div>
          <button
            onClick={() => setAiErrorMessage(null)}
            className="text-white hover:underline text-[10px] uppercase font-bold cursor-pointer"
          >
            Fechar
          </button>
        </div>
      )}

      {/* TAB 1: FILA DE CORREÇÃO */}
      {activeTab === 'fila' && (
        <>
          {pendingQueue.length === 0 ? (
            <div className="glass-panel p-12 text-center rounded-3xl border border-white/10 text-[#bccabb] space-y-2">
              <CheckCircle2 className="w-10 h-10 text-[#4ade80] mx-auto opacity-80" />
              <p className="text-sm font-bold text-white">Nenhuma entrega pendente na fila!</p>
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
            <div className="glass-panel p-12 text-center rounded-3xl border border-white/10 text-[#bccabb] space-y-2">
              <Clock className="w-10 h-10 text-amber-400 mx-auto opacity-80" />
              <p className="text-sm font-bold text-white">Nenhuma atividade corrigida ainda.</p>
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
            <div className="glass-panel p-12 text-center rounded-3xl border border-white/10 text-[#bccabb] space-y-2">
              <RotateCcw className="w-10 h-10 text-sky-400 mx-auto opacity-80" />
              <p className="text-sm font-bold text-white">Nenhuma atividade devolvida no momento.</p>
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
            <div className="glass-panel p-12 text-center rounded-3xl border border-white/10 text-[#bccabb]">
              🎉 Todos os alunos da turma enviaram a atividade!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {missingStudents.map((st) => (
                <div
                  key={st.id}
                  className="glass-panel p-5 rounded-3xl border border-white/10 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={st.avatarUrl}
                      alt={st.fullName}
                      className="w-11 h-11 rounded-full object-cover border-2 border-rose-500/30"
                    />
                    <div>
                      <h4 className="text-xs font-bold text-white">{st.fullName}</h4>
                      <p className="text-[10px] text-[#bccabb]">
                        Turma: {st.turma} • Matrícula: {st.matricula}
                      </p>
                      {st.tag && (
                        <span className="inline-block mt-1 text-[9px] font-bold px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          {st.tag}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => alert(`Lembrete enviado para o aluno ${st.fullName}!`)}
                    className="px-3 py-1.5 bg-[#171f33] hover:bg-[#222a3d] text-rose-300 rounded-xl text-[10px] font-bold border border-rose-500/30 transition-all cursor-pointer"
                  >
                    Enviar Lembrete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  // Helper render for individual submission card
  function renderSubmissionCard(sub: ActivitySubmission) {
    const isSaved = savedSuccessId === sub.studentId;
    const isLoadingAi = loadingAiStudentId === sub.studentId;
    const aiDiag = aiDiagnosticMap[sub.studentId];

    // Calculate total grade
    const totalScore = (sub.objectiveScore || 0) + (sub.essayScore || 0) + (sub.extraPoints || 0);

    return (
      <div
        key={sub.studentId}
        className="glass-panel p-6 rounded-3xl border border-white/10 space-y-5 relative flex flex-col justify-between"
      >
        {/* Card Header: Student Info & Badges */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src={sub.avatarUrl}
              alt={sub.studentName}
              className="w-12 h-12 rounded-full object-cover border-2 border-white/10"
            />
            <div>
              <h3 className="text-sm font-bold text-white">{sub.studentName}</h3>
              <p className="text-[10px] text-[#bccabb] uppercase tracking-wider">
                MATRÍCULA: {sub.matricula}
              </p>
              {sub.groupMembers && (
                <p className="text-[10px] text-purple-300 mt-0.5 font-medium">
                  👥 Grupo: {sub.groupMembers}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            {/* Return Count Badge */}
            {sub.returnCount && sub.returnCount > 0 ? (
              <span
                className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                  sub.returnCount === 3
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
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
                    ? 'bg-[#4ade80]/20 text-[#4ade80] border border-[#4ade80]/30'
                    : sub.tag === 'RAD'
                    ? 'bg-[#c0c1ff]/20 text-[#c0c1ff] border border-[#c0c1ff]/30'
                    : 'bg-[#171f33] text-[#bccabb]'
                }`}
              >
                {sub.tag}
              </span>
            )}

            {/* Registration status badge in State System */}
            {sub.registeredInStateSystem ? (
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                No RCO/SED
              </span>
            ) : (
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                Pendente RCO
              </span>
            )}
          </div>
        </div>

        {/* Student Essay Response Block */}
        {sub.essayAnswer && (
          <div className="bg-[#131b2e] p-4 rounded-2xl border border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-[#bccabb]">
                Resposta Dissertativa do Aluno:
              </span>
              <span className="text-[10px] text-[#869486]">
                {sub.essayAnswer.length} caracteres
              </span>
            </div>
            <p className="italic text-xs text-[#dae2fd] leading-relaxed bg-[#0b1326] p-3 rounded-xl border border-white/5">
              &ldquo;{sub.essayAnswer}&rdquo;
            </p>

            {/* AI Correction Trigger Button */}
            <button
              onClick={() => handleAiCorrection(sub)}
              disabled={isLoadingAi}
              className="w-full mt-2 py-2.5 px-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
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
          <div className="bg-[#1e1b4b]/60 border border-purple-500/30 rounded-2xl p-4 space-y-2 text-xs text-[#dae2fd] animate-fadeIn">
            <div className="flex items-center gap-2 text-purple-300 font-bold border-b border-purple-500/20 pb-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>Diagnóstico IA - Google Gemini</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
              <div className="bg-[#0f172a]/80 p-2.5 rounded-xl border border-white/5">
                <span className="text-purple-300 font-bold block mb-0.5">🎯 Fidelidade ao Tema:</span>
                <p className="text-[#bccabb]">{aiDiag.themeFidelity}</p>
              </div>

              <div className="bg-[#0f172a]/80 p-2.5 rounded-xl border border-white/5">
                <span className="text-purple-300 font-bold block mb-0.5">🔑 Uso de Palavras-Chave:</span>
                <p className="text-[#bccabb]">{aiDiag.keywordsCheck}</p>
              </div>

              <div className="bg-[#0f172a]/80 p-2.5 rounded-xl border border-white/5">
                <span className="text-purple-300 font-bold block mb-0.5">📝 Estrutura Textual:</span>
                <p className="text-[#bccabb]">{aiDiag.structureCheck}</p>
              </div>

              <div className="bg-[#0f172a]/80 p-2.5 rounded-xl border border-white/5">
                <span className="text-purple-300 font-bold block mb-0.5">✍️ Gramática e Ortografia:</span>
                <p className="text-[#bccabb]">{aiDiag.grammarCheck}</p>
              </div>
            </div>
          </div>
        )}

        {/* Scores & Extra Points Input Grid */}
        <div className="grid grid-cols-3 gap-3">
          {/* Objective Score */}
          <div className="bg-[#131b2e] p-3 rounded-2xl border border-white/5">
            <span className="block text-[9px] font-bold text-[#bccabb] uppercase tracking-wider mb-1">
              Objetivas
            </span>
            <div className="text-lg font-extrabold text-[#4ade80]">
              {sub.objectiveScore.toFixed(1)}{' '}
              <span className="text-xs text-[#bccabb] font-normal">/ {sub.maxObjectiveScore.toFixed(1)}</span>
            </div>
          </div>

          {/* Essay Score */}
          <div className="bg-[#131b2e] p-3 rounded-2xl border border-white/5">
            <span className="block text-[9px] font-bold text-[#bccabb] uppercase tracking-wider mb-1">
              Dissertativa
            </span>
            <div className="flex items-baseline gap-1">
              <input
                type="number"
                step="0.5"
                min="0"
                max={sub.maxEssayScore || 5}
                value={sub.essayScore !== undefined ? sub.essayScore : ''}
                onChange={(e) => handleScoreChange(sub.studentId, e.target.value)}
                placeholder="-"
                className="w-14 bg-[#171f33] border border-white/10 rounded-xl px-2 py-1 text-base font-extrabold text-white text-center focus:outline-none focus:border-[#4ade80]"
              />
              <span className="text-xs text-[#bccabb] font-normal">/ {(sub.maxEssayScore || 5).toFixed(1)}</span>
            </div>
          </div>

          {/* Extra Points by Teacher */}
          <div className="bg-[#131b2e] p-3 rounded-2xl border border-amber-500/20">
            <span className="block text-[9px] font-bold text-amber-300 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Award className="w-3 h-3" /> Ponto Extra
            </span>
            <input
              type="number"
              step="0.5"
              min="0"
              max="3"
              value={sub.extraPoints || 0}
              onChange={(e) => handleExtraPointsChange(sub.studentId, e.target.value)}
              className="w-full bg-[#171f33] border border-amber-500/30 rounded-xl px-2 py-1 text-base font-extrabold text-amber-300 text-center focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>

        {/* Calculated Final Total Score Banner */}
        <div className="bg-gradient-to-r from-[#171f33] to-[#1e293b] p-3 rounded-2xl border border-white/10 flex items-center justify-between">
          <span className="text-xs font-bold text-white flex items-center gap-1.5">
            <Award className="w-4 h-4 text-amber-400" />
            Nota Final Total:
          </span>
          <span className="text-xl font-extrabold text-[#4ade80]">
            {totalScore.toFixed(1)}{' '}
            <span className="text-xs text-[#bccabb]">
              / {((sub.maxObjectiveScore || 5) + (sub.maxEssayScore || 5)).toFixed(1)}
            </span>
          </span>
        </div>

        {/* Teacher Feedback Textarea */}
        <div>
          <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
            <label className="block text-[11px] font-bold text-[#bccabb] uppercase tracking-wider">
              Feedback Pedagógico do Sensei ao Aluno
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleGenerateAiFeedback(sub, 'graded')}
                disabled={generatingFeedbackStudentId === sub.studentId}
                className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold rounded-lg text-[10px] flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                title="Gerar feedback pedagógico temático de Naruto com o Gemini"
              >
                {generatingFeedbackStudentId === sub.studentId ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
                    <span>Invocando Sensei Gemini... 🍃</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Feedback Ninja (Gemini) ⚡</span>
                  </>
                )}
              </button>
              <span className="text-[10px] text-[#869486]">
                {(sub.teacherFeedback || '').length}/400
              </span>
            </div>
          </div>
          <textarea
            rows={3}
            maxLength={400}
            value={sub.teacherFeedback || ''}
            onChange={(e) => handleFeedbackChange(sub.studentId, e.target.value)}
            placeholder="Feedback motivacional do Sensei, observações sobre a resposta e recomendações de estudo..."
            className="w-full bg-[#131b2e] border border-white/10 rounded-2xl p-3.5 text-xs text-[#dae2fd] placeholder-[#869486] focus:outline-none focus:border-[#4ade80] transition-all resize-none"
          />
        </div>

        {/* Checkbox for Registration in State System */}
        <div className="pt-1">
          <label className="flex items-center gap-2.5 cursor-pointer text-xs text-[#dae2fd] select-none bg-[#131b2e] p-3 rounded-2xl border border-white/5 hover:bg-[#1a243b] transition-colors">
            <input
              type="checkbox"
              checked={!!sub.registeredInStateSystem}
              onChange={() => handleToggleStateSystem(sub.studentId)}
              className="w-4 h-4 accent-[#4ade80] rounded cursor-pointer"
            />
            <span className="font-semibold">Atividade já registrada no sistema do estado (RCO / SED)</span>
          </label>
        </div>

        {/* Save success feedback toast */}
        {isSaved && (
          <div className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 ${
            sub.status === 'returned'
              ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
              : 'bg-[#4ade80]/20 border border-[#4ade80]/40 text-[#4ade80]'
          }`}>
            <UserCheck className="w-4 h-4" />
            <span>
              {sub.status === 'returned'
                ? 'Atividade devolvida ao aluno para refazer!'
                : 'Nota e feedback registrados com sucesso!'}
            </span>
          </div>
        )}

        {/* Action Buttons: Save Grade / Return for Re-do */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={() => handleSave(sub.studentId, 'graded')}
            className="py-3 px-4 bg-[#4ade80] hover:bg-[#6bfb9a] text-[#003919] font-bold rounded-full text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{sub.status === 'graded' ? 'Salvar Nota' : 'Salvar e Finalizar'}</span>
          </button>

          {(sub.returnCount || 0) >= 3 ? (
            <button
              type="button"
              onClick={() => {
                alert('🚨 Bloqueio Ninja: Esta atividade já foi devolvida 3 vezes ao aluno. A 4ª devolução está BLOQUEADA! Por favor, atribua a nota final e clique em Salvar e Finalizar.');
              }}
              className="py-3 px-4 bg-rose-500/10 text-rose-300 font-bold rounded-full text-xs border border-rose-500/30 flex items-center justify-center gap-2 transition-all cursor-not-allowed opacity-90"
              title="A 4ª devolução está bloqueada pelo sistema. Atribua a nota final."
            >
              <RotateCcw className="w-4 h-4 text-rose-400" />
              <span>Devolvida 3x (4ª Bloqueada)</span>
            </button>
          ) : (
            <button
              onClick={() => handleSave(sub.studentId, 'returned')}
              className="py-3 px-4 bg-transparent hover:bg-white/5 text-[#dae2fd] font-bold rounded-full text-xs border border-white/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
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
