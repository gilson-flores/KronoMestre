'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { StudentUser, TeacherUser, Activity, LibraryFile, ChatMessage, ActivityQuestion, MultipleChoiceQuestion, EssayQuestion } from '@/lib/types';
import { canStudentAccessActivity, getActivityGradeDistribution } from '@/lib/studentUtils';
import { MessagesView } from './MessagesView';
import {
  LogOut,
  CheckCircle2,
  FileText,
  Send,
  Award,
  MessageSquare,
  Clock,
  BookOpen,
  FolderDown,
  Download,
  ExternalLink,
  Link2,
  HardDrive,
  HelpCircle,
  AlertCircle,
  Sparkles,
  Check,
  X,
  RotateCcw,
  ShieldAlert,
  CopyX,
  ClipboardX,
  Users,
  ArrowLeft,
  Eye,
  FileQuestion,
  Users2,
  PenTool
} from 'lucide-react';

interface StudentPortalViewProps {
  student: StudentUser;
  teacher?: TeacherUser;
  activities: Activity[];
  libraryFiles?: LibraryFile[];
  messages?: ChatMessage[];
  students?: StudentUser[];
  onLogout: () => void;
  onSubmitAnswer: (
    activityId: string,
    studentId: string,
    essayAnswer: string,
    objectiveScore: number,
    maxObjectiveScore: number,
    maxEssayScore: number,
    selectedObjectiveAnswers?: { [questionId: string]: number },
    groupMembers?: string
  ) => void;
  onSendMessage?: (msg: {
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
  onMarkThreadAsRead?: (threadId: string, currentRole: 'teacher' | 'student') => void;
}

export const StudentPortalView: React.FC<StudentPortalViewProps> = ({
  student,
  teacher = {
    id: 'teacher-1',
    name: 'Gilson Flores',
    subject: 'Sociologia',
    email: 'gilson.flores@escola.edu.br',
    avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=250',
    school: "EEB Prof. Jandira D'Ávila",
  },
  activities,
  libraryFiles = [],
  messages = [],
  students = [],
  onLogout,
  onSubmitAnswer,
  onSendMessage,
  onMarkThreadAsRead,
}) => {
  // Tab state: 'atividades' | 'correcoes' | 'mensagens' | 'arquivos'
  const [activeTab, setActiveTab] = useState<'atividades' | 'correcoes' | 'mensagens' | 'arquivos'>('atividades');

  // List filter state for students: 'todas' | 'a_fazer' | 'a_corrigir' | 'corrigidas'
  const [studentFilter, setStudentFilter] = useState<'todas' | 'a_fazer' | 'a_corrigir' | 'corrigidas'>('todas');
  // Selected Activity for detail/execution view (null = show list view)
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);


  // Interactive student answers per activity
  // essayInputs[activityId] -> string
  const [essayInputs, setEssayInputs] = useState<{ [activityId: string]: string }>({});
  // objectiveInputs[activityId][questionId] -> optionIndex (0, 1, 2, 3)
  const [objectiveInputs, setObjectiveInputs] = useState<{ [activityId: string]: { [questionId: string]: number } }>({});
  
  // Group selection state for group activities
  const [groupSelections, setGroupSelections] = useState<{ [activityId: string]: string[] }>({});
  const [customMemberInput, setCustomMemberInput] = useState<{ [activityId: string]: string }>({});

  // Filter classmates in the same turma for group selection
  const classmates = useMemo(() => {
    return students.filter(
      (s) => s.turma === student.turma && s.id !== student.id
    );
  }, [students, student.turma, student.id]);

  // Toast / Submission feedback
  const [submissionSuccessMsg, setSubmissionSuccessMsg] = useState<string | null>(null);

  // Anti-Cola Focus Lock Warning State per activity: { [activityId: string]: number }
  const [focusWarnings, setFocusWarnings] = useState<{ [activityId: string]: number }>({});
  // Security Modal Notification State: { activityTitle: string; warningCount: number; isAutoSubmitted?: boolean } | null
  const [securityNotice, setSecurityNotice] = useState<{ activityTitle: string; warningCount: number; isAutoSubmitted?: boolean } | null>(null);
  // Security Toast Message for blocked Copy/Paste actions
  const [securityToast, setSecurityToast] = useState<string | null>(null);

  const showSecurityToast = (msg: string) => {
    setSecurityToast(msg);
    setTimeout(() => {
      setSecurityToast((current) => (current === msg ? null : current));
    }, 4000);
  };

  // Filter activities authorized for this student
  const authorizedActivities = useMemo(() => {
    return activities.filter((a) => canStudentAccessActivity(a.turma, student.turma));
  }, [activities, student.turma]);

  // Split into "A Fazer" and "Entregues/Corrigidas"
  const pendingActivities = useMemo(() => {
    return authorizedActivities.filter((act) => {
      const sub = act.submissions.find(
        (s) => s.studentId === student.id || s.studentName === student.fullName
      );
      return !sub || sub.status === 'returned' || sub.status === 'draft';
    });
  }, [authorizedActivities, student.id, student.fullName]);

  const submittedActivities = useMemo(() => {
    return authorizedActivities.filter((act) => {
      const sub = act.submissions.find(
        (s) => s.studentId === student.id || s.studentName === student.fullName
      );
      return sub && sub.status !== 'returned' && sub.status !== 'draft';
    });
  }, [authorizedActivities, student.id, student.fullName]);

  const toCorrectActivities = useMemo(() => {
    return authorizedActivities.filter((act) => {
      const sub = act.submissions.find(
        (s) => s.studentId === student.id || s.studentName === student.fullName
      );
      return sub && sub.status === 'pending';
    });
  }, [authorizedActivities, student.id, student.fullName]);

  const gradedActivities = useMemo(() => {
    return authorizedActivities.filter((act) => {
      const sub = act.submissions.find(
        (s) => s.studentId === student.id || s.studentName === student.fullName
      );
      return sub && sub.status === 'graded';
    });
  }, [authorizedActivities, student.id, student.fullName]);

  // Filtered activities list for Student Portal based on current filter
  const filteredStudentActivities = useMemo(() => {
    return authorizedActivities.filter((act) => {
      const sub = act.submissions.find(
        (s) => s.studentId === student.id || s.studentName === student.fullName
      );
      if (studentFilter === 'a_fazer') {
        return !sub || sub.status === 'returned' || sub.status === 'draft';
      }
      if (studentFilter === 'a_corrigir') {
        return sub && sub.status === 'pending';
      }
      if (studentFilter === 'corrigidas') {
        return sub && sub.status === 'graded';
      }
      return true; // 'todas'
    });
  }, [authorizedActivities, student.id, student.fullName, studentFilter]);

  // Filter library files for this student's turma
  const studentLibraryFiles = useMemo(() => {
    return libraryFiles.filter((file) =>
      !file.turma || file.turma === 'branco' || file.turma === 'Todas' || canStudentAccessActivity(file.turma, student.turma)
    );
  }, [libraryFiles, student.turma]);

  const handleSelectOption = (activityId: string, questionId: string, optionIndex: number) => {
    setObjectiveInputs((prev) => ({
      ...prev,
      [activityId]: {
        ...(prev[activityId] || {}),
        [questionId]: optionIndex,
      },
    }));
  };

  const handleSubmit = (act: Activity, isAutoSubmit: boolean = false) => {
    const distribution = getActivityGradeDistribution(act);
    const questions = act.questions || [];
    const objectiveQuestions = questions.filter((q) => q.type === 'multiple_choice') as (ActivityQuestion & MultipleChoiceQuestion)[];
    const essayQuestions = questions.filter((q) => q.type === 'essay') as (ActivityQuestion & EssayQuestion)[];

    const existingSub = act.submissions.find(
      (s) => s.studentId === student.id || s.studentName === student.fullName
    );
    const essayText = essayInputs[act.id] !== undefined
      ? essayInputs[act.id]
      : (existingSub?.essayAnswer || '');

    // If there are essay questions, require text (unless it's an auto-submission by Anti-Cola focus lock)
    if (!isAutoSubmit && essayQuestions.length > 0 && !essayText.trim()) {
      alert('Por favor, escreva sua resposta dissertativa antes de enviar a atividade.');
      return;
    }

    // Calculate objective score immediately (sai na hora)
    let correctCount = 0;
    const studentChoices = objectiveInputs[act.id] || {};

    objectiveQuestions.forEach((q) => {
      const chosen = studentChoices[q.id];
      if (chosen !== undefined && chosen === q.correctOptionIndex) {
        correctCount += 1;
      }
    });

    let calculatedObjectiveScore = 0;
    if (objectiveQuestions.length > 0) {
      calculatedObjectiveScore = (correctCount / objectiveQuestions.length) * distribution.maxObjectiveGrade;
    } else if (distribution.hasObjective) {
      calculatedObjectiveScore = distribution.maxObjectiveGrade;
    }

    // Compute group members if allowGroupWork is true
    let groupMembersStr: string | undefined = undefined;
    if (act.allowGroupWork) {
      const selected = groupSelections[act.id] || [];
      const customText = (customMemberInput[act.id] || '').trim();
      const allMembers = [...selected];
      if (customText) {
        customText.split(',').forEach((n) => {
          const trimmed = n.trim();
          if (trimmed && !allMembers.includes(trimmed)) {
            allMembers.push(trimmed);
          }
        });
      }
      if (allMembers.length > 0) {
        groupMembersStr = allMembers.join(', ');
      }
    }

    // Submit to parent
    onSubmitAnswer(
      act.id,
      student.id,
      essayText,
      Number(calculatedObjectiveScore.toFixed(1)),
      Number(distribution.maxObjectiveGrade.toFixed(1)),
      Number(distribution.maxEssayGrade.toFixed(1)),
      studentChoices,
      groupMembersStr
    );

    const msg = isAutoSubmit
      ? `🚨 PROVA ENTREGUE AUTOMATICAMENTE! Atingido o limite de 4 avisos de desvio de foco.`
      : objectiveQuestions.length > 0
      ? `Atividade enviada! Nota objetiva calculada na hora: ${calculatedObjectiveScore.toFixed(1)} / ${distribution.maxObjectiveGrade.toFixed(1)} pts. A parte dissertativa foi enviada para correção.`
      : `Atividade enviada com sucesso! Acompanhe a correção na aba "Correções".`;

    setSubmissionSuccessMsg(msg);
    setTimeout(() => setSubmissionSuccessMsg(null), 6000);

    // Reset focus warnings for this activity on submit
    setFocusWarnings((prev) => ({ ...prev, [act.id]: 0 }));

    // Close detail view and switch to "A Corrigir" list filter
    setSelectedActivityId(null);
    setStudentFilter('a_corrigir');
    setActiveTab('atividades');
  };

  const handleOpenActivity = (actId: string) => {
    setSelectedActivityId(actId);
    // Reset focus warnings for this activity when starting/resuming it
    setFocusWarnings((prev) => ({ ...prev, [actId]: 0 }));
  };

  // Effect: Trava de Foco (Avisos de mudança de tela e auto-entrega no 4º aviso)
  useEffect(() => {
    // Only monitor focus lock if student has actively opened a specific activity in detail view
    if (!selectedActivityId || activeTab !== 'atividades') return;

    const currentAct = activities.find((a) => a.id === selectedActivityId);
    if (!currentAct || !currentAct.securityFocusLock) return;

    // Check if student already submitted and it's not returned
    const sub = currentAct.submissions?.find(
      (s) => s.studentId === student.id || s.studentName === student.fullName
    );
    if (sub && sub.status !== 'returned' && sub.status !== 'draft') return;

    let isTriggeredInTurn = false;

    const handleFocusLoss = () => {
      if (isTriggeredInTurn) return;
      isTriggeredInTurn = true;
      setTimeout(() => {
        isTriggeredInTurn = false;
      }, 1000);

      setFocusWarnings((prev) => {
        const currentCount = prev[currentAct.id] || 0;
        if (currentCount >= 4) return prev; // Already auto-submitted, avoid re-triggering

        const nextCount = currentCount + 1;

        if (nextCount >= 4) {
          // Auto-entrega no 4º aviso!
          setTimeout(() => {
            handleSubmit(currentAct, true);
          }, 100);
          setSecurityNotice({
            activityTitle: currentAct.title,
            warningCount: 4,
            isAutoSubmitted: true,
          });
        } else {
          setSecurityNotice({
            activityTitle: currentAct.title,
            warningCount: nextCount,
            isAutoSubmitted: false,
          });
        }

        return { ...prev, [currentAct.id]: nextCount };
      });
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        handleFocusLoss();
      }
    };

    const onWindowBlur = () => {
      handleFocusLoss();
    };

    window.addEventListener('blur', onWindowBlur);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('blur', onWindowBlur);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [selectedActivityId, activities, activeTab, student.id, student.fullName]);


  return (
    <div className="min-h-screen bg-[#0b1326] text-[#dae2fd] p-4 sm:p-8 max-w-5xl mx-auto space-y-8 animate-fadeIn">
      {/* Top Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-xl">
        <div className="flex items-center gap-4">
          <img
            src={student.avatarUrl}
            alt={student.fullName}
            className="w-16 h-16 rounded-full object-cover border-2 border-[#4ade80] shadow-md"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#4ade80] uppercase tracking-wider bg-[#4ade80]/10 px-3 py-0.5 rounded-full border border-[#4ade80]/20">
                Portal do Aluno
              </span>
              <span className="text-xs font-semibold text-[#bccabb]">Sociologia</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
              {student.fullName}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-xs text-[#bccabb] mt-1.5">
              <span className="bg-[#171f33] px-3 py-1 rounded-full border border-white/10 text-white font-semibold">
                Turma: {student.turma}
              </span>
              <span>Matrícula: {student.matricula}</span>
              {student.tag && (
                <span className="bg-[#4ade80]/20 text-[#4ade80] px-2.5 py-0.5 rounded-md font-bold text-[10px]">
                  {student.tag}
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="py-2.5 px-5 bg-[#171f33] hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 rounded-full text-xs font-bold border border-white/10 flex items-center gap-2 transition-all self-start sm:self-center cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Sair da Conta</span>
        </button>
      </div>

      {/* Toast Banner on Submission */}
      {submissionSuccessMsg && (
        <div className="p-4 bg-[#4ade80]/20 border border-[#4ade80]/40 rounded-2xl text-xs text-[#4ade80] font-bold flex items-center gap-3 shadow-lg animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{submissionSuccessMsg}</span>
        </div>
      )}

      {/* Main Abas Navigation */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-[#131b2e] p-1.5 rounded-2xl border border-white/10 shadow-inner">
        <button
          onClick={() => {
            setActiveTab('atividades');
            setSelectedActivityId(null);
          }}
          className={`py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer min-h-[44px] active:scale-95 ${
            activeTab === 'atividades'
              ? 'bg-gradient-to-r from-[#4ade80] to-[#22c55e] text-[#003919] shadow-md font-extrabold'
              : 'text-[#bccabb] hover:text-white hover:bg-white/5'
          }`}
        >
          <FileText className="w-4 h-4 shrink-0" />
          <span>Atividades e Missões</span>
          {authorizedActivities.length > 0 && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold shrink-0 ${
                activeTab === 'atividades'
                  ? 'bg-[#003919] text-[#4ade80]'
                  : 'bg-[#171f33] text-white border border-white/10'
              }`}
            >
              {authorizedActivities.length}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setActiveTab('mensagens');
            if (onMarkThreadAsRead) {
              onMarkThreadAsRead(student.id, 'student');
            }
          }}
          className={`py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer min-h-[44px] active:scale-95 ${
            activeTab === 'mensagens'
              ? 'bg-gradient-to-r from-[#4ade80] to-[#22c55e] text-[#003919] shadow-md font-extrabold'
              : 'text-[#bccabb] hover:text-white hover:bg-white/5'
          }`}
        >
          <MessageSquare className="w-4 h-4 shrink-0" />
          <span>Mensagens com o Professor</span>
          {messages.filter(m => (m.threadId === student.id || m.recipientId === student.id) && m.senderRole === 'teacher' && !m.read).length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold shrink-0 bg-[#4ade80] text-[#003919]">
              {messages.filter(m => (m.threadId === student.id || m.recipientId === student.id) && m.senderRole === 'teacher' && !m.read).length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('arquivos')}
          className={`py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer min-h-[44px] active:scale-95 ${
            activeTab === 'arquivos'
              ? 'bg-gradient-to-r from-[#4ade80] to-[#22c55e] text-[#003919] shadow-md font-extrabold'
              : 'text-[#bccabb] hover:text-white hover:bg-white/5'
          }`}
        >
          <FolderDown className="w-4 h-4 shrink-0" />
          <span>Arquivos (Drive)</span>
          {studentLibraryFiles.length > 0 && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold shrink-0 ${
                activeTab === 'arquivos'
                  ? 'bg-[#003919] text-[#4ade80]'
                  : 'bg-[#171f33] text-[#bccabb]'
              }`}
            >
              {studentLibraryFiles.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB: ATIVIDADES E CORREÇÕES (LIST & FILTER SYSTEM) */}
      {activeTab === 'atividades' && (
        <div className="space-y-6">
          {/* Sub-filter bar for Student Activities */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1.5 bg-[#131b2e] rounded-2xl border border-white/10 shadow-inner">
            <button
              onClick={() => {
                setStudentFilter('todas');
                setSelectedActivityId(null);
              }}
              className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                studentFilter === 'todas'
                  ? 'bg-gradient-to-r from-[#4ade80] to-[#22c55e] text-[#003919] shadow-md font-extrabold'
                  : 'text-[#bccabb] hover:text-white hover:bg-white/5'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Todas</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black shrink-0 ${studentFilter === 'todas' ? 'bg-[#003919] text-[#4ade80]' : 'bg-black/30 text-white'}`}>
                {authorizedActivities.length}
              </span>
            </button>

            <button
              onClick={() => {
                setStudentFilter('a_fazer');
                setSelectedActivityId(null);
              }}
              className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                studentFilter === 'a_fazer'
                  ? 'bg-gradient-to-r from-[#4ade80] to-[#22c55e] text-[#003919] shadow-md font-extrabold'
                  : 'text-[#bccabb] hover:text-white hover:bg-white/5'
              }`}
            >
              <FileQuestion className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">A Fazer</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black shrink-0 ${studentFilter === 'a_fazer' ? 'bg-[#003919] text-[#4ade80]' : 'bg-black/30 text-white'}`}>
                {pendingActivities.length}
              </span>
            </button>

            <button
              onClick={() => {
                setStudentFilter('a_corrigir');
                setSelectedActivityId(null);
              }}
              className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                studentFilter === 'a_corrigir'
                  ? 'bg-gradient-to-r from-[#4ade80] to-[#22c55e] text-[#003919] shadow-md font-extrabold'
                  : 'text-[#bccabb] hover:text-white hover:bg-white/5'
              }`}
            >
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">A Corrigir</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black shrink-0 ${studentFilter === 'a_corrigir' ? 'bg-[#003919] text-[#4ade80]' : 'bg-black/30 text-white'}`}>
                {toCorrectActivities.length}
              </span>
            </button>

            <button
              onClick={() => {
                setStudentFilter('corrigidas');
                setSelectedActivityId(null);
              }}
              className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                studentFilter === 'corrigidas'
                  ? 'bg-gradient-to-r from-[#4ade80] to-[#22c55e] text-[#003919] shadow-md font-extrabold'
                  : 'text-[#bccabb] hover:text-white hover:bg-white/5'
              }`}
            >
              <Award className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Corrigidas</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black shrink-0 ${studentFilter === 'corrigidas' ? 'bg-[#003919] text-[#4ade80]' : 'bg-black/30 text-white'}`}>
                {gradedActivities.length}
              </span>
            </button>
          </div>

          {/* LIST VIEW (when no activity is selected) */}
          {selectedActivityId === null && (
            <div className="space-y-4">
              {filteredStudentActivities.length === 0 ? (
                <div className="glass-panel p-12 text-center rounded-3xl border border-white/10 text-[#bccabb] space-y-3 shadow-xl">
                  <div className="w-16 h-16 bg-[#4ade80]/10 border border-[#4ade80]/30 rounded-2xl flex items-center justify-center mx-auto text-[#4ade80] text-2xl font-black">
                    🍃
                  </div>
                  <p className="text-base font-extrabold text-white">Nenhuma Missão Encontrada neste Filtro!</p>
                  <p className="text-xs text-[#bccabb] max-w-md mx-auto leading-relaxed">
                    Você não possui atividades nesta categoria no momento. Alterne os filtros acima para visualizar suas missões pendentes, enviadas ou corrigidas.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {filteredStudentActivities.map((act) => {
                    const sub = act.submissions.find(
                      (s) => s.studentId === student.id || s.studentName === student.fullName
                    );
                    const isPending = !sub || sub.status === 'returned' || sub.status === 'draft';
                    const isToCorrect = sub && sub.status === 'pending';
                    const isGraded = sub && sub.status === 'graded';
                    const hasObj = act.questions && act.questions.length > 0
                      ? act.questions.some(q => q.type === 'multiple_choice')
                      : ((sub?.maxObjectiveScore || 0) > 0 && act.type !== 'Redação');
                    const totalScore = sub && isGraded ? (hasObj ? (sub.objectiveScore || 0) : 0) + (sub.essayScore || 0) + (sub.extraPoints || 0) : null;

                    return (
                      <div
                        key={act.id}
                        className="glass-panel p-6 rounded-2xl border border-white/10 hover:border-[#4ade80]/40 transition-all space-y-4 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="space-y-2 max-w-2xl">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[11px] font-bold bg-[#4ade80]/20 text-[#4ade80] px-3 py-0.5 rounded-full border border-[#4ade80]/30">
                              {act.type === 'Simulado'
                                ? 'Treinamento Tático'
                                : act.type === 'Redação'
                                ? 'Pergaminho de Redação'
                                : act.type === 'Dinâmica'
                                ? 'Treino em Equipe'
                                : act.type === 'Trabalho em grupo'
                                ? 'Trabalho em Grupo'
                                : act.type === 'Projeto de pesquisa'
                                ? 'Projeto de Pesquisa'
                                : 'Exame Ninja'}
                            </span>

                            <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5 bg-[#131b2e] px-3 py-0.5 rounded-full border border-amber-500/30">
                              <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span>Prazo: {act.deadline || 'Sem data'}</span>
                            </span>

                            {isPending && (
                              <span className="text-[11px] font-extrabold bg-amber-500/20 text-amber-300 px-3 py-0.5 rounded-full border border-amber-500/40">
                                📜 Pendente (A Fazer)
                              </span>
                            )}
                            {isToCorrect && (
                              <span className="text-[11px] font-extrabold bg-sky-500/20 text-sky-300 px-3 py-0.5 rounded-full border border-sky-500/40">
                                ⏳ A Corrigir pelo Sensei
                              </span>
                            )}
                            {isGraded && (
                              <span className="text-[11px] font-extrabold bg-emerald-500/20 text-emerald-300 px-3 py-0.5 rounded-full border border-emerald-500/40">
                                ✅ Corrigida (Nota: {totalScore !== null ? totalScore.toFixed(1) : 0}/10)
                              </span>
                            )}
                          </div>

                          <h3 className="text-lg font-bold text-white tracking-tight">{act.title}</h3>
                          {act.description && (
                            <p className="text-xs text-[#bccabb] line-clamp-2">{act.description}</p>
                          )}

                          <div className="flex items-center gap-4 text-[11px] text-[#bccabb] font-medium pt-1">
                            <span>Turma: <strong className="text-white">{act.turma}</strong></span>
                            <span>•</span>
                            <span>Perguntas: <strong className="text-white">{act.questions?.length || 0}</strong></span>
                            <span>•</span>
                            <span>Valor: <strong className="text-white">{getActivityGradeDistribution(act).maxGrade || 10} pts</strong></span>
                          </div>
                        </div>

                        <div className="shrink-0 pt-2 sm:pt-0">
                          <button
                            onClick={() => handleOpenActivity(act.id)}
                            className="w-full sm:w-auto py-3 px-6 bg-[#4ade80] hover:bg-[#6bfb9a] text-[#003919] font-black text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-[#4ade80]/20"
                          >
                            {isPending ? (
                              <>
                                <PenTool className="w-4 h-4" />
                                <span>Resolver Atividade</span>
                              </>
                            ) : (
                              <>
                                <Eye className="w-4 h-4" />
                                <span>Ver Resposta / Nota</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* DETAIL VIEW (when an activity is selected) */}
          {selectedActivityId !== null && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[#131b2e] rounded-2xl border border-white/10 shadow-md">
                <button
                  onClick={() => setSelectedActivityId(null)}
                  className="py-2.5 px-4 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer border border-white/10 active:scale-95 shrink-0 w-fit"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Voltar para Lista</span>
                </button>
                <div className="text-left sm:text-right min-w-0">
                  <span className="text-[10px] uppercase tracking-wider text-[#bccabb] font-semibold block">
                    Atividade Selecionada
                  </span>
                  <span className="text-sm font-bold text-white truncate block">
                    {authorizedActivities.find((a) => a.id === selectedActivityId)?.title}
                  </span>
                </div>
              </div>

              {(() => {
                const act = authorizedActivities.find((a) => a.id === selectedActivityId);
                if (!act) return null;

                const sub = act.submissions.find(
                  (s) => s.studentId === student.id || s.studentName === student.fullName
                );

                const isPendingOrReturned = !sub || sub.status === 'returned' || sub.status === 'draft';

                if (isPendingOrReturned) {
                  const distribution = getActivityGradeDistribution(act);
                  const questions = act.questions || [];
                  const objectiveQuestions = questions.filter((q) => q.type === 'multiple_choice') as (ActivityQuestion & MultipleChoiceQuestion)[];
                  const essayQuestions = questions.filter((q) => q.type === 'essay') as (ActivityQuestion & EssayQuestion)[];

                  return (
                    <div
                      key={act.id}
                      className={`glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6 shadow-xl relative overflow-hidden ${
                        act.securityBlockCopyStatement ? 'select-none' : ''
                      }`}
                      onCopy={(e) => {
                        if (act.securityBlockCopyStatement) {
                          e.preventDefault();
                          showSecurityToast('❌ Cópia e seleção de texto bloqueadas para esta atividade pelo professor.');
                        }
                      }}
                      onCut={(e) => {
                        if (act.securityBlockCopyStatement) {
                          e.preventDefault();
                          showSecurityToast('❌ Recortar texto bloqueado nesta atividade.');
                        }
                      }}
                      onContextMenu={(e) => {
                        if (act.securityBlockCopyStatement) {
                          e.preventDefault();
                          showSecurityToast('❌ Menu de contexto (botão direito) desabilitado por trava de segurança.');
                        }
                      }}
                      onKeyDown={(e) => {
                        if (act.securityBlockCopyStatement) {
                          if ((e.ctrlKey || e.metaKey) && ['c', 'C', 'x', 'X', 'a', 'A', 'u', 'U'].includes(e.key)) {
                            e.preventDefault();
                            showSecurityToast('❌ Atalho de cópia/seleção bloqueado para esta atividade.');
                          }
                        }
                      }}
                    >
                    {/* Banner if activity was returned for re-do */}
                    {sub && sub.status === 'returned' && (
                      <div className="bg-amber-500/20 border border-amber-500/40 p-4 rounded-2xl text-xs text-amber-200 flex items-start gap-3 shadow-lg">
                        <RotateCcw className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="font-extrabold text-amber-300 text-sm">
                            ⚠️ Atividade Devolvida pelo Professor para Refazer!
                          </p>
                          {sub.teacherFeedback ? (
                            <p className="text-white">
                              <strong>Orientações / Observações do Sensei:</strong> &ldquo;{sub.teacherFeedback}&rdquo;
                            </p>
                          ) : (
                            <p className="text-[#bccabb]">
                              Ajuste suas respostas e envie o pergaminho novamente para nova avaliação.
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Activity Top Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="text-[11px] font-extrabold bg-[#4ade80]/20 text-[#4ade80] px-3 py-1 rounded-full border border-[#4ade80]/30 uppercase tracking-wide">
                            {act.type === 'Simulado'
                              ? 'Treinamento Tático (Simulado)'
                              : act.type === 'Redação'
                              ? 'Pergaminho de Redação'
                              : act.type === 'Dinâmica'
                              ? 'Treino em Equipe (Dinâmica)'
                              : act.type === 'Trabalho em grupo'
                              ? 'Trabalho em Grupo'
                              : act.type === 'Projeto de pesquisa'
                              ? 'Projeto de Pesquisa'
                              : 'Exame Ninja (Avaliação)'}
                          </span>

                          {/* Subtle Highlighted Deadline Badge */}
                          <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5 bg-[#131b2e] px-3.5 py-1 rounded-full border border-amber-500/30 shadow-sm">
                            <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>Prazo Limite: {act.deadline || 'Sem data'}</span>
                          </span>

                          {/* Subtle Status Badge */}
                          {sub && sub.status === 'returned' ? (
                            <span
                              className={`text-[11px] font-bold px-3 py-1 rounded-full border ${
                                sub.returnCount === 3
                                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                  : sub.returnCount === 2
                                  ? 'bg-orange-600/20 text-orange-200 border-orange-500/40'
                                  : 'bg-orange-500/20 text-orange-300 border-orange-500/30'
                              }`}
                            >
                              {sub.returnCount
                                ? `↩️ Devolvida ${sub.returnCount}x`
                                : '↩️ Devolvida 1x'}
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold text-amber-300 bg-amber-500/15 px-3 py-1 rounded-full border border-amber-500/30">
                              📜 Pendente (A Fazer)
                            </span>
                          )}

                          <span className="text-[11px] font-bold text-white bg-[#171f33] px-3 py-1 rounded-full border border-white/10">
                            Nota Máxima: {distribution.maxGrade.toFixed(1)} pts
                          </span>
                        </div>
                        <h3 className="text-2xl font-black text-white">{act.title}</h3>
                      </div>
                    </div>

                    {/* Security Active Banner */}
                    {(act.securityFocusLock || act.securityBlockCopyStatement || act.securityBlockPasteEssay) && (
                      <div className="bg-[#171f33] p-3.5 rounded-2xl border border-amber-500/30 flex flex-wrap items-center gap-2.5 text-xs text-amber-200 shadow-md">
                        <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                        <span className="font-bold text-white">Seguranças Anti-Cola Ativas:</span>
                        {act.securityFocusLock && (
                          <span className="bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-500/30 font-semibold text-[11px] flex items-center gap-1">
                            🛡️ Trava de Foco (Avisos: {focusWarnings[act.id] || 0}/4)
                          </span>
                        )}
                        {act.securityBlockCopyStatement && (
                          <span className="bg-rose-500/20 text-rose-300 px-2.5 py-0.5 rounded-full border border-rose-500/30 font-semibold text-[11px] flex items-center gap-1">
                            <CopyX className="w-3 h-3 text-rose-400" />
                            <span>Sem Cópia</span>
                          </span>
                        )}
                        {act.securityBlockPasteEssay && (
                          <span className="bg-purple-500/20 text-purple-300 px-2.5 py-0.5 rounded-full border border-purple-500/30 font-semibold text-[11px] flex items-center gap-1">
                            <ClipboardX className="w-3 h-3 text-purple-400" />
                            <span>Sem Cola</span>
                          </span>
                        )}
                      </div>
                    )}

                    {/* Grade Distribution Rule Banner (REGRA 50% / 50%) */}
                    <div className="bg-[#131b2e] p-4 rounded-2xl border border-[#4ade80]/30 flex items-start gap-3 text-xs text-[#dae2fd]">
                      <Sparkles className="w-5 h-5 text-[#4ade80] shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-white">
                          Regra de Pontuação da Atividade:
                        </p>
                        <p className="text-[#bccabb] mt-0.5">
                          {distribution.distributionLabel}.
                        </p>
                        <p className="text-[11px] text-[#4ade80] font-semibold mt-1">
                          ⚡ As questões objetivas têm correção automática instantânea ao enviar. A parte dissertativa é corrigida pelo professor.
                        </p>
                      </div>
                    </div>

                    {/* Description / Statement / Support Material */}
                    <div
                      className={`space-y-4 ${act.securityBlockCopyStatement ? 'select-none' : ''}`}
                      onCopy={(e) => {
                        if (act.securityBlockCopyStatement) {
                          e.preventDefault();
                          showSecurityToast('❌ Cópia de enunciados e textos bloqueada para esta atividade.');
                        }
                      }}
                      onCut={(e) => {
                        if (act.securityBlockCopyStatement) {
                          e.preventDefault();
                          showSecurityToast('❌ Ação de recortar bloqueada nesta atividade.');
                        }
                      }}
                      onContextMenu={(e) => {
                        if (act.securityBlockCopyStatement) {
                          e.preventDefault();
                          showSecurityToast('❌ Menu de contexto (botão direito) bloqueado nesta atividade.');
                        }
                      }}
                    >
                      <div>
                        <h4 className="text-xs font-bold text-[#bccabb] uppercase tracking-wider mb-1">
                          Orientações do Professor:
                        </h4>
                        <p className="text-xs text-[#dae2fd] leading-relaxed bg-[#171f33]/60 p-4 rounded-2xl border border-white/5">
                          {act.description}
                        </p>
                      </div>

                      {act.supportMaterial && (
                        <div className="bg-[#171f33] p-4 rounded-2xl border border-white/10 space-y-2">
                          <h5 className="text-xs font-bold text-[#c0c1ff] flex items-center gap-1.5">
                            <BookOpen className="w-4 h-4 text-[#4ade80]" />
                            <span>Texto de Apoio / Leitura Obrigatória:</span>
                          </h5>
                          <div className="text-xs text-[#bccabb] leading-relaxed space-y-1.5">
                            {act.supportMaterial.split('\n').map((line, i) => {
                              const urlMatch = line.match(/(https?:\/\/[^\s]+)/g);
                              if (urlMatch) {
                                const parts = line.split(/(https?:\/\/[^\s]+)/g);
                                return (
                                  <p key={i} className="whitespace-pre-wrap flex flex-wrap items-center gap-1.5 my-1">
                                    {parts.map((part, pIdx) => {
                                      if (part.match(/^https?:\/\//i)) {
                                        return (
                                          <a
                                            key={pIdx}
                                            href={part}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#4ade80]/20 hover:bg-[#4ade80]/30 border border-[#4ade80]/40 text-[#4ade80] font-bold rounded-xl text-xs transition-all underline cursor-pointer shadow-sm active:scale-95 my-0.5"
                                          >
                                            <Link2 className="w-3.5 h-3.5 shrink-0" />
                                            <span className="truncate max-w-xs">{part}</span>
                                            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                                          </a>
                                        );
                                      }
                                      return <span key={pIdx}>{part}</span>;
                                    })}
                                  </p>
                                );
                              }
                              return <p key={i} className="whitespace-pre-wrap">{line}</p>;
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* PARTE 1: QUESTÕES OBJETIVAS */}
                    {objectiveQuestions.length > 0 && (
                      <div className="space-y-4 pt-2 border-t border-white/10">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-white flex items-center gap-2">
                            <HelpCircle className="w-4 h-4 text-[#4ade80]" />
                            <span>Parte 1: Questões Objetivas (Múltipla Escolha)</span>
                          </h4>
                          <span className="text-xs font-bold text-[#4ade80] bg-[#4ade80]/10 px-2.5 py-0.5 rounded-full border border-[#4ade80]/20">
                            Vale {distribution.maxObjectiveGrade.toFixed(1)} pts
                          </span>
                        </div>

                        <div className="space-y-6">
                          {objectiveQuestions.map((q, qIndex) => {
                            const studentChoices = objectiveInputs[act.id] || {};
                            const currentChoice = studentChoices[q.id];

                            return (
                              <div
                                key={q.id || qIndex}
                                className="bg-[#131b2e] p-5 rounded-2xl border border-white/10 space-y-3"
                              >
                                <p className="text-xs font-bold text-white">
                                  Questão {qIndex + 1}: <span className="font-normal text-[#dae2fd]">{q.statement}</span>
                                </p>

                                <div className="space-y-2 pt-1">
                                  {q.options.map((optText, optIdx) => {
                                    const letters = ['A', 'B', 'C', 'D'];
                                    const isSelected = currentChoice === optIdx;

                                    return (
                                      <button
                                        key={optIdx}
                                        type="button"
                                        onClick={() => handleSelectOption(act.id, q.id, optIdx)}
                                        className={`w-full text-left p-3.5 rounded-xl text-xs transition-all flex items-start gap-3 border cursor-pointer ${
                                          isSelected
                                            ? 'bg-[#4ade80]/20 border-[#4ade80] text-white font-bold'
                                            : 'bg-[#171f33] border-white/5 text-[#bccabb] hover:bg-[#222a3d] hover:text-white'
                                        }`}
                                      >
                                        <span
                                          className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${
                                            isSelected
                                              ? 'bg-[#4ade80] text-[#003919]'
                                              : 'bg-white/10 text-white'
                                          }`}
                                        >
                                          {letters[optIdx]}
                                        </span>
                                        <span className="mt-0.5 leading-relaxed">{optText}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* PARTE 2: QUESTÃO DISSERTATIVA */}
                    {(essayQuestions.length > 0 || distribution.hasEssay) && (
                      <div className="space-y-4 pt-2 border-t border-white/10">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-white flex items-center gap-2">
                            <FileText className="w-4 h-4 text-[#4ade80]" />
                            <span>Parte 2: Produção Textual / Resposta Dissertativa</span>
                          </h4>
                          <span className="text-xs font-bold text-[#4ade80] bg-[#4ade80]/10 px-2.5 py-0.5 rounded-full border border-[#4ade80]/20">
                            Vale {distribution.maxEssayGrade.toFixed(1)} pts
                          </span>
                        </div>

                        {essayQuestions.map((eq, eqIdx) => (
                          <div
                            key={eq.id || eqIdx}
                            className={`bg-[#131b2e] p-4 rounded-2xl border border-white/10 space-y-2 ${act.securityBlockCopyStatement ? 'select-none' : ''}`}
                            onCopy={(e) => {
                              if (act.securityBlockCopyStatement) {
                                e.preventDefault();
                                showSecurityToast('❌ Cópia de enunciados bloqueada nesta atividade.');
                              }
                            }}
                          >
                            <p className="text-xs font-semibold text-white">{eq.statement}</p>

                          </div>
                        ))}

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="block text-xs font-bold text-[#dae2fd]">
                              Sua Resposta Dissertativa:
                            </label>
                            {act.securityBlockPasteEssay && (
                              <span className="text-[10px] text-purple-300 font-bold bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-500/20 flex items-center gap-1">
                                <ClipboardX className="w-3 h-3 text-purple-400" />
                                <span>Cola (Ctrl+V) Bloqueada</span>
                              </span>
                            )}
                          </div>
                          <textarea
                            rows={5}
                            value={essayInputs[act.id] !== undefined ? essayInputs[act.id] : (sub?.essayAnswer || '')}
                            onChange={(e) =>
                              setEssayInputs({ ...essayInputs, [act.id]: e.target.value })
                            }
                            onPaste={(e) => {
                              if (act.securityBlockPasteEssay) {
                                e.preventDefault();
                                showSecurityToast('❌ Ação de colar (Ctrl+V) bloqueada para respostas dissertativas.');
                              }
                            }}
                            onDrop={(e) => {
                              if (act.securityBlockPasteEssay) {
                                e.preventDefault();
                                showSecurityToast('❌ Arrastar textos bloqueado para respostas dissertativas.');
                              }
                            }}
                            onKeyDown={(e) => {
                              if (act.securityBlockPasteEssay) {
                                if ((e.ctrlKey || e.metaKey) && ['v', 'V'].includes(e.key)) {
                                  e.preventDefault();
                                  showSecurityToast('❌ Atalho de colar (Ctrl+V) bloqueado para respostas dissertativas.');
                                }
                              }
                            }}
                            placeholder={
                              act.securityBlockPasteEssay
                                ? "Escreva aqui sua resposta (digitação manual obrigatória; colar texto desabilitado pelo professor)..."
                                : "Escreva aqui sua resposta com argumentação fundamentada nos conceitos da disciplina..."
                            }
                            className="w-full bg-[#131b2e] border border-white/10 rounded-2xl p-4 text-xs text-white placeholder-[#869486] focus:outline-none focus:border-[#4ade80] leading-relaxed"
                          />
                        </div>
                      </div>
                    )}

                    {/* TRABALHO EM GRUPO - SELEÇÃO DE INTEGRANTES */}
                    {act.allowGroupWork && (
                      <div className="bg-[#131b2e] p-5 rounded-2xl border border-purple-500/30 space-y-3.5 shadow-lg">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-2">
                            <Users className="w-4 h-4 text-purple-400" />
                            <span>Trabalho em Grupo — Selecione os Colegas da sua Equipe:</span>
                          </h4>
                          <span className="text-[11px] font-bold text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2.5 py-0.5 rounded-full">
                            Turma {student.turma}
                          </span>
                        </div>

                        {/* Lista interativa de colegas da turma */}
                        {classmates.length > 0 ? (
                          <div className="space-y-2">
                            <p className="text-[11px] text-[#bccabb]">
                              Marque os colegas de classe que fizeram o trabalho com você:
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                              {classmates.map((cls) => {
                                const isSelected = (groupSelections[act.id] || []).includes(cls.fullName);
                                return (
                                  <button
                                    key={cls.id}
                                    type="button"
                                    onClick={() => {
                                      setGroupSelections((prev) => {
                                        const current = prev[act.id] || [];
                                        if (current.includes(cls.fullName)) {
                                          return { ...prev, [act.id]: current.filter((n) => n !== cls.fullName) };
                                        } else {
                                          return { ...prev, [act.id]: [...current, cls.fullName] };
                                        }
                                      });
                                    }}
                                    className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all cursor-pointer border ${
                                      isSelected
                                        ? 'bg-purple-600/30 border-purple-400 text-purple-200 shadow-md'
                                        : 'bg-[#0b1326] border-white/10 text-[#bccabb] hover:text-white hover:border-white/20'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 truncate">
                                      <div className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? 'bg-purple-400' : 'bg-white/20'}`} />
                                      <span className="truncate">{cls.fullName}</span>
                                    </div>
                                    {isSelected ? (
                                      <Check className="w-4 h-4 text-purple-300 shrink-0" />
                                    ) : (
                                      <span className="text-[10px] text-white/40">+ Adicionar</span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-[#bccabb] italic">
                            Nenhum outro aluno cadastrado na turma {student.turma}. Digite os nomes dos integrantes abaixo:
                          </p>
                        )}

                        {/* Input para nomes manuais/complementares */}
                        <div>
                          <label className="block text-[11px] font-semibold text-[#bccabb] mb-1">
                            Outros integrantes (se não constarem na lista acima, separe por vírgula):
                          </label>
                          <input
                            type="text"
                            value={customMemberInput[act.id] || ''}
                            onChange={(e) =>
                              setCustomMemberInput((prev) => ({ ...prev, [act.id]: e.target.value }))
                            }
                            placeholder="Ex: João Pedro, Camila Santos"
                            className="w-full bg-[#0b1326] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-[#869486] focus:outline-none focus:border-purple-400"
                          />
                        </div>

                        {/* Resumo da Equipe Confirmada */}
                        <div className="bg-purple-500/10 p-3 rounded-xl border border-purple-500/20 text-xs text-purple-200 flex items-center gap-2">
                          <Users className="w-4 h-4 text-purple-400 shrink-0" />
                          <span>
                            <strong>Integrantes da Entrega:</strong> {student.fullName} (Você)
                            {(groupSelections[act.id] || []).length > 0 && `, ${(groupSelections[act.id] || []).join(', ')}`}
                            {(customMemberInput[act.id] || '').trim() && `, ${customMemberInput[act.id].trim()}`}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* SUBMIT BUTTON */}
                    <div className="pt-4 border-t border-white/10 flex justify-end">
                      <button
                        onClick={() => handleSubmit(act)}
                        className="py-3.5 px-8 bg-[#4ade80] hover:bg-[#6bfb9a] text-[#003919] font-black rounded-full text-xs flex items-center gap-2 transition-all shadow-xl shadow-[#4ade80]/20 cursor-pointer"
                      >
                        <Send className="w-4 h-4 stroke-[2.5]" />
                        <span>Enviar Resposta da Atividade</span>
                      </button>
                    </div>
                  </div>
                );
              } else {
                const distribution = getActivityGradeDistribution(act);
                const isGraded = sub.status === 'graded';
                const hasObj = act.questions && act.questions.length > 0
                  ? act.questions.some(q => q.type === 'multiple_choice')
                  : ((sub?.maxObjectiveScore || 0) > 0 && act.type !== 'Redação');
                const totalScore = (hasObj ? (sub.objectiveScore || 0) : 0) + (sub.essayScore || 0) + (sub.extraPoints || 0);

                return (
                  <div
                    key={act.id}
                    className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6 shadow-xl"
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="text-[11px] font-bold bg-[#4ade80]/20 text-[#4ade80] px-3 py-0.5 rounded-full border border-[#4ade80]/30">
                            {act.type === 'Simulado'
                              ? 'Treinamento Tático'
                              : act.type === 'Redação'
                              ? 'Pergaminho de Redação'
                              : act.type === 'Dinâmica'
                              ? 'Treino em Equipe'
                              : act.type === 'Trabalho em grupo'
                              ? 'Trabalho em Grupo'
                              : act.type === 'Projeto de pesquisa'
                              ? 'Projeto de Pesquisa'
                              : 'Exame Ninja'}
                          </span>

                          {/* Subtle Highlighted Deadline Badge */}
                          <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5 bg-[#131b2e] px-3 py-0.5 rounded-full border border-amber-500/30">
                            <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>Prazo Limite: {act.deadline || 'Sem data'}</span>
                          </span>

                          {/* Status Badge */}
                          {sub.status === 'graded' ? (
                            <span className="text-[11px] font-bold text-emerald-300 bg-emerald-500/20 px-3 py-0.5 rounded-full border border-emerald-500/40">
                              ✅ Corrigida pelo Sensei
                            </span>
                          ) : sub.status === 'pending' ? (
                            <span className="text-[11px] font-bold text-sky-300 bg-sky-500/20 px-3 py-0.5 rounded-full border border-sky-500/40">
                              ⏳ A Corrigir pelo Sensei
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold text-orange-300 bg-orange-500/20 px-3 py-0.5 rounded-full border border-orange-500/40">
                              ↩️ Devolvida {sub.returnCount ? `${sub.returnCount}x` : '1x'}
                            </span>
                          )}
                        </div>
                        <h3 className="text-2xl font-bold text-white">{act.title}</h3>
                      </div>

                      <div className="bg-[#131b2e] px-5 py-3 rounded-2xl border border-[#4ade80]/30 text-center shrink-0">
                        <span className="text-[10px] font-bold text-[#bccabb] block uppercase tracking-wider">
                          Sua Nota Final
                        </span>
                        <span className="text-2xl font-black text-[#4ade80]">
                          {totalScore.toFixed(1)} <span className="text-sm font-normal text-[#bccabb]">/ {distribution.maxGrade.toFixed(1)}</span>
                        </span>
                      </div>
                    </div>

                    {/* Grade Detailed Breakdown */}
                    {(() => {
                      const hasObjectiveQuestions = (act.questions || []).some((q) => q.type === 'multiple_choice');
                      const isRedacao = (act.type as string).toLowerCase() === 'redacao';
                      const showObjectiveSection = hasObjectiveQuestions && !isRedacao && distribution.hasObjective && sub.maxObjectiveScore > 0;

                      return (
                        <div className={`grid grid-cols-1 ${showObjectiveSection ? 'sm:grid-cols-2' : ''} gap-4`}>
                          {/* Objective Score (Saiu na Hora) */}
                          {showObjectiveSection && (
                            <div className="bg-[#131b2e] p-4 rounded-2xl border border-white/10 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-[#4ade80] flex items-center gap-1.5">
                                  <CheckCircle2 className="w-4 h-4" />
                                  <span>Parte Objetiva (Automática):</span>
                                </span>
                                <span className="text-sm font-black text-white">
                                  {sub.objectiveScore.toFixed(1)} / {sub.maxObjectiveScore.toFixed(1)} pts
                                </span>
                              </div>
                              <p className="text-[11px] text-[#bccabb]">
                                ⚡ Nota calculada instantaneamente no momento do envio.
                              </p>
                            </div>
                          )}

                          {/* Essay Score (Aguardando ou Corrigida) */}
                      <div className="bg-[#131b2e] p-4 rounded-2xl border border-white/10 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#c0c1ff] flex items-center gap-1.5">
                            <FileText className="w-4 h-4" />
                            <span>Parte Dissertativa:</span>
                          </span>
                          {isGraded || sub.essayScore !== undefined ? (
                            <span className="text-sm font-black text-white">
                              {(sub.essayScore || 0).toFixed(1)} / {sub.maxEssayScore.toFixed(1)} pts
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                              Aguardando Professor
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#bccabb]">
                          {isGraded
                            ? 'Correção realizada e finalizada pelo professor.'
                            : 'A resposta foi enviada e aguarda a avaliação final do professor.'}
                        </p>
                      </div>
                    </div>
                      );
                    })()}

                    {/* Group Members display */}
                    {sub.groupMembers && (
                      <div className="bg-purple-500/10 p-3.5 rounded-2xl border border-purple-500/30 text-xs text-purple-200 flex items-center gap-2">
                        <Users className="w-4 h-4 text-purple-400 shrink-0" />
                        <span>
                          <strong>Membros do Grupo:</strong> {sub.groupMembers}
                        </span>
                      </div>
                    )}

                    {/* Student Essay Response display */}
                    {sub.essayAnswer && (
                      <div className="bg-[#171f33] p-4 rounded-2xl border border-white/5 space-y-1">
                        <span className="text-xs font-bold text-[#bccabb] block">
                          Sua Resposta Enviada:
                        </span>
                        <p className="text-xs text-[#dae2fd] italic leading-relaxed whitespace-pre-wrap">
                          &ldquo;{sub.essayAnswer}&rdquo;
                        </p>
                      </div>
                    )}

                    {/* Teacher Feedback */}
                    {sub.teacherFeedback ? (
                      <div className="bg-[#131b2e] p-5 rounded-2xl border border-[#4ade80]/30 space-y-2">
                        <span className="text-xs font-bold text-[#4ade80] flex items-center gap-2">
                          <MessageSquare className="w-4 h-4" />
                          <span>Feedback e Diagnóstico do Professor:</span>
                        </span>
                        <p className="text-xs text-white leading-relaxed">
                          {sub.teacherFeedback}
                        </p>
                      </div>
                    ) : (
                      <div className="text-xs text-[#bccabb] italic bg-[#171f33]/40 p-3 rounded-xl border border-white/5">
                        O professor ainda não publicou parecer textual adicional para esta entrega.
                      </div>
                    )}
                  </div>
                );
              }
            })()}
          </div>
        )}
      </div>
    )}

      {/* TAB: MENSAGENS COM A PROFESSORA */}
      {activeTab === 'mensagens' && (
        <MessagesView
          currentUserRole="student"
          teacher={teacher}
          student={student}
          students={students}
          activities={activities}
          messages={messages}
          onSendMessage={(msg) => {
            if (onSendMessage) {
              onSendMessage(msg);
            }
          }}
          onMarkThreadAsRead={onMarkThreadAsRead}
        />
      )}

      {/* TAB 3: ARQUIVOS */}
      {activeTab === 'arquivos' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <FolderDown className="w-5 h-5 text-[#4ade80]" />
              <span>Arquivos e Materiais Didáticos</span>
            </h2>
            <p className="text-xs text-[#bccabb] mt-0.5">
              Baixe as apostilas, apresentações e documentos disponibilizados pelo professor no Google Drive
            </p>
          </div>

          {/* CARD DA PASTA PRINCIPAL DO GOOGLE DRIVE */}
          {teacher?.driveFolderUrl?.trim() && (
            <div className="glass-panel p-6 rounded-3xl border border-[#4ade80]/40 bg-gradient-to-br from-[#131b2e] via-[#0f172a] to-[#0a1120] space-y-4 shadow-xl relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-[#4ade80]/15 border border-[#4ade80]/30 text-[#4ade80] flex items-center justify-center shrink-0 shadow-lg shadow-[#4ade80]/10">
                    <HardDrive className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white leading-snug">Pasta de Arquivos no Google Drive</h3>
                    <p className="text-xs text-[#bccabb] mt-0.5">
                      Acesse a pasta oficial do Google Drive com todos os materiais e documentos da disciplina
                    </p>
                  </div>
                </div>

                <a
                  href={teacher.driveFolderUrl.trim()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-3.5 px-6 bg-gradient-to-r from-[#4ade80] to-[#22c55e] hover:from-[#6bfb9a] hover:to-[#4ade80] text-[#003919] font-black rounded-2xl text-xs sm:text-sm transition-all shadow-lg shadow-[#4ade80]/20 flex items-center justify-center gap-2.5 shrink-0 cursor-pointer min-h-[48px] w-full sm:w-auto active:scale-95"
                  title="Abrir Pasta do Google Drive"
                >
                  <ExternalLink className="w-4 h-4 stroke-[2.5]" />
                  <span>Acessar Pasta do Drive</span>
                </a>
              </div>
            </div>
          )}

          {studentLibraryFiles.length === 0 && !teacher?.driveFolderUrl?.trim() ? (
            <div className="glass-panel p-12 text-center rounded-3xl border border-white/10 text-[#bccabb] space-y-3 shadow-xl">
              <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto text-amber-400 text-2xl font-black">
                🌀
              </div>
              <p className="text-base font-extrabold text-white">Biblioteca sem Arquivos!</p>
              <p className="text-xs text-[#bccabb] max-w-md mx-auto leading-relaxed">
                Nenhum documento ou pasta do Google Drive foi disponibilizado para sua turma ainda. Fique atento aos novos lançamentos do professor!
              </p>
            </div>
          ) : studentLibraryFiles.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 pt-2">
                <FileText className="w-4 h-4 text-[#4ade80]" />
                <span>Documentos e Apostilas Específicas</span>
              </h3>
              {studentLibraryFiles.map((file) => {
                const driveUrl = file.driveUrl || teacher?.driveFolderUrl?.trim();

                return (
                  <div
                    key={file.id}
                    className="glass-panel p-5 rounded-3xl border border-white/10 flex items-center justify-between gap-4 glass-panel-hover"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-[#171f33] border border-white/10 text-[#4ade80] flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white">{file.title}</h3>
                        {file.category && (
                          <span className="text-[11px] font-semibold text-[#bccabb] block mt-0.5">
                            {file.category}
                          </span>
                        )}
                      </div>
                    </div>

                    {driveUrl ? (
                      <a
                        href={driveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-2.5 px-6 bg-[#4ade80] hover:bg-[#6bfb9a] text-[#003919] font-extrabold rounded-full text-xs transition-all shadow-md flex items-center gap-2 shrink-0 cursor-pointer"
                        title="Baixar arquivo"
                      >
                        <Download className="w-4 h-4 stroke-[2.5]" />
                        <span>Baixar</span>
                      </a>
                    ) : (
                      <span className="text-xs text-[#869486]">Sem link</span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      )}

      {/* Security Toast Notification */}
      {securityToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-rose-950/90 text-rose-100 border border-rose-500/50 p-4 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-3 animate-fadeIn max-w-md">
          <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
          <p className="text-xs font-semibold">{securityToast}</p>
          <button
            onClick={() => setSecurityToast(null)}
            className="ml-auto text-rose-300 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Anti-Cola Focus Lock Warning / Auto-Submit Modal */}
      {securityNotice && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#0e172a] border border-amber-500/40 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 text-center relative">
            <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center border shadow-lg ${
              securityNotice.isAutoSubmitted
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
            }`}>
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className={`text-xl font-extrabold ${
                securityNotice.isAutoSubmitted ? 'text-rose-400' : 'text-amber-400'
              }`}>
                {securityNotice.isAutoSubmitted
                  ? '🚨 PROVA ENTREGUE AUTOMATICAMENTE'
                  : `⚠️ AVISO DE TRAVA DE FOCO (${securityNotice.warningCount}/4)`}
              </h3>
              <p className="text-xs text-white font-medium">
                Atividade: <span className="font-bold text-[#4ade80]">{securityNotice.activityTitle}</span>
              </p>
            </div>

            <div className="bg-[#131b2e] p-4 rounded-2xl border border-white/10 text-xs text-[#bccabb] text-left leading-relaxed space-y-2">
              {securityNotice.isAutoSubmitted ? (
                <>
                  <p className="text-rose-300 font-bold">
                    Você atingiu o limite de 4 avisos por sair da tela / mudar de aba durante a realização da atividade.
                  </p>
                  <p>
                    A prova foi finalizada e enviada para o professor com o progresso preenchido até o momento.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-amber-300 font-bold">
                    Aviso {securityNotice.warningCount} de 4: O sistema detectou que você mudou de aba, janela ou aplicativo!
                  </p>
                  <p>
                    Para garantir a integridade da avaliação, permaneça nesta página. No <strong className="text-white">4º aviso</strong>, sua atividade será entregue automaticamente do jeito que está!
                  </p>
                </>
              )}
            </div>

            <button
              onClick={() => setSecurityNotice(null)}
              className={`w-full py-3 px-6 font-extrabold rounded-full text-xs transition-all shadow-md cursor-pointer ${
                securityNotice.isAutoSubmitted
                  ? 'bg-rose-500 hover:bg-rose-600 text-white'
                  : 'bg-amber-400 hover:bg-amber-300 text-slate-950'
              }`}
            >
              {securityNotice.isAutoSubmitted ? 'Entendido (Ver Correções)' : 'Entendido, Voltar para a Prova'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
