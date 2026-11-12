import { SecondTeachersActivitiesTab } from "@/components/views/second-teachers/SecondTeachersActivitiesTab";
import { SecondTeachersRosterAndModals } from "@/components/views/second-teachers/SecondTeachersRosterAndModals";
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  HeartHandshake,
  UserPlus, Users,
  Trash2,
  ShieldCheck,
  Mail,
  Phone,
  BookOpen,
  School,
  Smartphone,
  CheckCircle2,
  Clock,
  Sparkles,
  Search,
  PenTool,
  Gamepad2,
  Star,
  Check,
  HelpCircle,
  ArrowLeft,
  GraduationCap,
  KeyRound,
  X,
  ChevronDown,
  ChevronUp,
  FileText,
  Layers,
  ChevronRight,
  Info,
  MessageSquare,
  Pencil,
  Loader2
} from 'lucide-react';
import { hashPassword } from '@/lib/crypto';
import {
  TeacherUser,
  StudentUser,
  Activity,
  UserRole,
  ActivityQuestion,
  MultipleChoiceQuestion,
  EssayQuestion,
  ChatMessage
} from '@/lib/types';
import { NewSecondTeacherModal } from '@/components/modals/NewSecondTeacherModal';
import { EditSecondTeacherModal } from '@/components/modals/EditSecondTeacherModal';
import { ManageTutelageModal } from '@/components/modals/ManageTutelageModal';
import { SecondTeacherMessagesModal } from '@/components/modals/SecondTeacherMessagesModal';
import { ResetPasswordByTeacherModal } from '@/components/modals/ResetPasswordByTeacherModal';
import {
  canStudentAccessActivity,
  getActivityGradeDistribution,
  isStudentPNE
} from '@/lib/studentUtils';
import { extractCleanHtml } from '@/lib/adaptationUtils';
import { scrollToTop } from '@/lib/utils';
import { getScopedLocalStorageItem, setScopedLocalStorageItem } from '@/lib/cacheUtils';

interface SecondTeachersViewProps {
  teacher: TeacherUser;
  currentUserRole?: UserRole;
  students?: StudentUser[];
  activities?: Activity[];
  messages: ChatMessage[];
  onSubmitAnswer?: (
    activityId: string,
    studentId: string,
    essayAnswer: string,
    objectiveScore: number,
    maxObjectiveScore: number,
    maxEssayScore: number,
    selectedObjectiveAnswers?: { [questionId: string]: number },
    groupMembers?: string
  ) => Promise<void> | void;
  onSaveStudent?: (updatedStudent: StudentUser) => void;
  onSimulateSecondTeacher?: (secondTeacher: TeacherUser) => void;
}

export const SecondTeachersView: React.FC<SecondTeachersViewProps> = ({
  teacher,
  currentUserRole = 'second_teacher',
  students = [],
  activities = [],
  messages = [],
  onSubmitAnswer,
  onSaveStudent,
  onSimulateSecondTeacher,
}) => {
  const isSecondTeacher = currentUserRole === 'second_teacher';
  const [activeTab, setActiveTab] = useState<'atividades_alunos' | 'professores_apoio'>('atividades_alunos');

  // Second teachers list state (for regente view)
  const [secondTeachers, setSecondTeachers] = useState<TeacherUser[]>([]);
  const [isLoadingTeachers, setIsLoadingTeachers] = useState(true);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [teacherToEdit, setTeacherToEdit] = useState<TeacherUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [teacherToDelete, setTeacherToDelete] = useState<TeacherUser | null>(null);
  const [tutelageModalTeacher, setTutelageModalTeacher] = useState<TeacherUser | null>(null);
  const [historyModalTeacher, setHistoryModalTeacher] = useState<TeacherUser | null>(null);

  // Retractable / Collapsible Menus State for Main Screen
  const [isMetricsRetractableOpen, setIsMetricsRetractableOpen] = useState(false); // Metrics bar collapsible
  const [isStudentDossierOpen, setIsStudentDossierOpen] = useState(false); // Student PEI dossier collapsible
  const [isPendingSectionOpen, setIsPendingSectionOpen] = useState(true); // Pending activities accordion
  const [isAwaitingSectionOpen, setIsAwaitingSectionOpen] = useState(true); // Awaiting review accordion
  const [isGradedSectionOpen, setIsGradedSectionOpen] = useState(false); // Graded activities accordion
  const [expandedActivityNotes, setExpandedActivityNotes] = useState<{ [id: string]: boolean }>({});
  const [isMobileSupportMaterialOpen, setIsMobileSupportMaterialOpen] = useState(false);

  // Search & Selected Student
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // Selected Activity for mobile assist solving
  const [executingActivityId, setExecutingActivityId] = useState<string | null>(null);

  // Answers state while solving with the student
  const [essayInput, setEssayInput] = useState<string>('');
  const [objectiveInputs, setObjectiveInputs] = useState<{ [questionId: string]: number }>({});
  const [playfulScore, setPlayfulScore] = useState<{ score: number; maxScore: number; grade: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionFeedback, setSubmissionFeedback] = useState<string | null>(null);

  // Tutela scope for regente/admin view
  const [tutelaScope, setTutelaScope] = useState<'minha_tutela' | 'todos_pne'>('minha_tutela');

  // Fetch second teachers
  const fetchSecondTeachers = async () => {
    setIsLoadingTeachers(true);
    const ownerTeacherId = teacher.ownerTeacherId || (teacher as any).owner_teacher_id || teacher.id;

    // 1. Leitura imediata do cache local seguro
    if (typeof window !== 'undefined') {
      try {
        const cached = getScopedLocalStorageItem('local_second_teachers_data', ownerTeacherId);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            setSecondTeachers(parsed);
          }
        }
      } catch (e) {
        console.warn('Erro ao ler cache local de 2º professores:', e);
      }
    }

    try {
      // Buscar lista de 2º professores via API backend (Firebase Firestore)
      const res = await fetch('/api/second-teachers');
      if (res.ok) {
        const apiData = await res.json();
        const list = apiData.secondTeachers || apiData.teachers || [];
        if (Array.isArray(list)) {
          const formatted: TeacherUser[] = list.map((d: any) => ({
            id: d.id,
            name: d.name,
            email: d.email,
            subject: d.subject || 'AEE / Inclusão Escolar',
            avatarUrl: d.avatarUrl || d.avatar_url || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=250',
            phone: d.phone || '',
            school: d.school || '',
          }));
          setSecondTeachers(formatted);
          if (typeof window !== 'undefined') {
            setScopedLocalStorageItem('local_second_teachers_data', JSON.stringify(formatted), ownerTeacherId);
          }
          setIsLoadingTeachers(false);
          return;
        }
      }
    } catch (err) {
      console.error('Erro em fetchSecondTeachers:', err);
    } finally {
      setIsLoadingTeachers(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSecondTeachers();
  }, []);

  // Reset password state
  const [teacherToResetPassword, setTeacherToResetPassword] = useState<TeacherUser | null>(null);
  const [resetRequests, setResetRequests] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('second_teacher_reset_requests');
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  const handleResetTeacherPassword = (st: TeacherUser) => {
    setTeacherToResetPassword(st);
  };

  const handleDelete = async (targetTeacher: TeacherUser) => {
    setIsDeleting(true);
    const teacherId = targetTeacher.id;
    const teacherEmail = targetTeacher.email;
    const teacherName = targetTeacher.name;
    const ownerTeacherId = teacher.ownerTeacherId || (teacher as any).owner_teacher_id || teacher.id;

    // 1. Atualização Otimista Imediata da Interface
    setSecondTeachers((prev) =>
      prev.filter((t) => t.id !== teacherId && t.email?.toLowerCase() !== teacherEmail?.toLowerCase())
    );

    // 2. Atualização Imediata do Cache Local
    if (typeof window !== 'undefined') {
      try {
        const cached = getScopedLocalStorageItem('local_second_teachers_data', ownerTeacherId);
        if (cached) {
          const list: TeacherUser[] = JSON.parse(cached);
          const updated = list.filter(
            (t) => t.id !== teacherId && t.email?.toLowerCase() !== teacherEmail?.toLowerCase()
          );
          setScopedLocalStorageItem('local_second_teachers_data', JSON.stringify(updated), ownerTeacherId);
        }
      } catch (e) {
        console.warn('Erro ao atualizar cache de 2º professores:', e);
      }
    }

    // 3. Desvincular alunos que estavam sob tutela desse 2º professor no estado local
    if (onSaveStudent && students.length > 0) {
      students.forEach((s) => {
        if (
          s.secondTeacherId === teacherId ||
          (s.secondTeacherName && s.secondTeacherName.toLowerCase() === teacherName?.toLowerCase())
        ) {
          onSaveStudent({
            ...s,
            secondTeacherId: undefined,
            secondTeacherName: undefined,
          });
        }
      });
    }

    // 4. Executar Exclusão Segura via API Backend (Firebase Firestore)
    try {
      const queryParams = new URLSearchParams();
      if (teacherId) queryParams.set('id', teacherId);
      if (teacherEmail) queryParams.set('email', teacherEmail);

      const res = await fetch(`/api/second-teachers?${queryParams.toString()}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.warn('Aviso ao excluir 2º professor via API:', errData.error);
      }

      setSuccessMsg(`Professor ${teacherName} removido com sucesso.`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      console.error('Erro na exclusão do 2º professor:', err);
      setSuccessMsg(`Professor ${teacherName} removido.`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } finally {
      setIsDeleting(false);
      setTeacherToDelete(null);
    }
  };

  const handleSaveTutelage = async (updates: { student: StudentUser; isAssigned: boolean }[]) => {
    if (!tutelageModalTeacher || !onSaveStudent) return;
    
    for (const update of updates) {
      const { student, isAssigned } = update;
      const updatedStudent: StudentUser = {
        ...student,
        secondTeacherId: isAssigned ? tutelageModalTeacher.id : undefined,
        secondTeacherName: isAssigned ? tutelageModalTeacher.name : undefined,
      };

      await onSaveStudent(updatedStudent);
    }
    
    scrollToTop();
    setSuccessMsg('Tutela atualizada com sucesso!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // Change Password State
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [changePasswordNewPass, setChangePasswordNewPass] = useState('');
  const [changePasswordConfirmPass, setChangePasswordConfirmPass] = useState('');
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  const [changePasswordMsg, setChangePasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePasswordMsg(null);

    if (!changePasswordNewPass || changePasswordNewPass.length < 4) {
      setChangePasswordMsg({ type: 'error', text: 'A nova senha deve ter no mínimo 4 caracteres.' });
      return;
    }

    if (changePasswordNewPass !== changePasswordConfirmPass) {
      setChangePasswordMsg({ type: 'error', text: 'A confirmação de senha não coincide com a nova senha.' });
      return;
    }

    setChangePasswordLoading(true);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newPassword: changePasswordNewPass,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Falha ao atualizar a senha');
      }

      scrollToTop();
      setChangePasswordMsg({
        type: 'success',
        text: 'Sua senha de acesso foi alterada e salva com sucesso!',
      });
      setTimeout(() => {
        setIsChangePasswordOpen(false);
        setChangePasswordMsg(null);
        setChangePasswordNewPass('');
        setChangePasswordConfirmPass('');
      }, 2000);
    } catch (err: any) {
      setChangePasswordMsg({
        type: 'error',
        text: 'Erro ao alterar senha: ' + (err?.message || 'Tente novamente.'),
      });
    } finally {
      setChangePasswordLoading(false);
    }
  };

  // Helper to resolve bound 2nd teacher name for any student
  const getStudentBoundTeacherName = useCallback((s: StudentUser): string | undefined => {
    if (s.secondTeacherName?.trim()) return s.secondTeacherName.trim();

    if (s.secondTeacherId) {
      const stId = s.secondTeacherId.toString().trim().toLowerCase();

      if (
        (teacher.id && stId === teacher.id.toString().trim().toLowerCase()) ||
        (teacher.email && stId === teacher.email.trim().toLowerCase())
      ) {
        return teacher.name;
      }

      const found = secondTeachers.find(
        (t) =>
          (t.id && t.id.toString().trim().toLowerCase() === stId) ||
          (t.email && t.email.trim().toLowerCase() === stId) ||
          (t.name && t.name.trim().toLowerCase() === stId)
      );
      if (found) return found.name;
    }

    return undefined;
  }, [teacher.id, teacher.email, teacher.name, secondTeachers]);

  // Bind student to current logged in 2nd teacher
  const handleBindStudentToMe = async (studentToBind: StudentUser, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated: StudentUser = {
      ...studentToBind,
      secondTeacherId: teacher.id,
      secondTeacherName: teacher.name,
    };

    if (onSaveStudent) {
      onSaveStudent(updated);
    }
  };

  // Unbind student from current 2nd teacher
  const handleUnbindStudent = async (studentToUnbind: StudentUser, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated: StudentUser = {
      ...studentToUnbind,
      secondTeacherId: undefined,
      secondTeacherName: undefined,
    };

    if (onSaveStudent) {
      onSaveStudent(updated);
    }
  };

  // 1. Students bound to this second teacher
  const myTutelageStudents = useMemo(() => {
    return students.filter((s) => {
      const boundName = getStudentBoundTeacherName(s);

      const tId = teacher.id?.toString().trim().toLowerCase();
      const tName = teacher.name?.trim().toLowerCase();
      const tEmail = teacher.email?.trim().toLowerCase();

      const stId = s.secondTeacherId?.toString().trim().toLowerCase();
      const stName = (boundName || s.secondTeacherName)?.trim().toLowerCase();

      const matchId = Boolean(stId && tId && stId === tId);
      const matchEmail = Boolean(stId && tEmail && stId === tEmail);
      const matchName = Boolean(
        stName &&
          ((tName && (stName === tName || stName.includes(tName) || tName.includes(stName))) ||
            (tEmail && stName === tEmail))
      );

      return matchId || matchEmail || matchName;
    });
  }, [students, teacher.id, teacher.name, teacher.email, getStudentBoundTeacherName]);

  // 2. All PNE/Inclusão students in the school (for regente view)
  const boundOrPneStudents = useMemo(() => {
    return students.filter((s) => {
      const isPne = isStudentPNE(s) || (s.pneConditions && s.pneConditions.length > 0) || s.tag === 'PNE';
      const isBound = Boolean(getStudentBoundTeacherName(s) || s.secondTeacherId);
      return isPne || isBound;
    });
  }, [students, getStudentBoundTeacherName]);

  // Selected base scope for student list:
  // "Faça com que o segundo professor veja somente os alunos dele" -> isSecondTeacher ALWAYS sees only myTutelageStudents!
  const activeScopeStudents = useMemo(() => {
    if (isSecondTeacher || tutelaScope === 'minha_tutela') {
      return myTutelageStudents;
    }
    return boundOrPneStudents;
  }, [isSecondTeacher, tutelaScope, myTutelageStudents, boundOrPneStudents]);

  // Filtered by search query
  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return activeScopeStudents;
    const q = studentSearch.toLowerCase().trim();
    return activeScopeStudents.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.turma.toLowerCase().includes(q) ||
        (s.matricula && s.matricula.toLowerCase().includes(q)) ||
        (s.pneConditions && s.pneConditions.some((c) => c.toLowerCase().includes(q)))
    );
  }, [activeScopeStudents, studentSearch]);

  // Tutelage overall metrics
  const tutelageMetrics = useMemo(() => {
    const targetStudents = myTutelageStudents.length > 0 ? myTutelageStudents : boundOrPneStudents;
    let totalPending = 0;
    let totalToCorrect = 0;
    let totalGraded = 0;

    activities.forEach((act) => {
      if (!act.isAdapted && !act.adaptationType) return;
      const parentAct = activities.find((parent) => parent.id === act.adaptedFromId);

      targetStudents.forEach((st) => {
        if (!canStudentAccessActivity(act.turma, st.turma)) return;
        const isIncludedInNormal = parentAct?.includedPneStudentIds && (
          parentAct.includedPneStudentIds.includes(st.id) ||
          (Boolean(st.matricula) && parentAct.includedPneStudentIds.includes(st.matricula)) ||
          (Boolean(st.fullName) && parentAct.includedPneStudentIds.includes(st.fullName))
        );
        if (isIncludedInNormal) return;

        const sub = act.submissions?.find(
          (s) => s.studentId === st.id || s.matricula === st.matricula || s.studentName === st.fullName
        );

        if (!sub || sub.status === 'returned' || sub.status === 'draft') {
          totalPending += 1;
        } else if (sub.status === 'pending') {
          totalToCorrect += 1;
        } else if (sub.status === 'graded') {
          totalGraded += 1;
        }
      });
    });

    return {
      totalTutelageStudents: myTutelageStudents.length,
      totalAeeStudents: boundOrPneStudents.length,
      totalPending,
      totalToCorrect,
      totalGraded,
    };
  }, [myTutelageStudents, boundOrPneStudents, activities]);

  const activeStudent = useMemo(() => {
    if (selectedStudentId) {
      const found = students.find((s) => s.id === selectedStudentId);
      if (found) return found;
    }
    return filteredStudents[0] || null;
  }, [students, selectedStudentId, filteredStudents]);

  // Adapted activities available for the active student
  const studentAdaptedActivities = useMemo(() => {
    if (!activeStudent) return [];

    return activities.filter((act) => {
      if (!canStudentAccessActivity(act.turma, activeStudent.turma)) {
        return false;
      }
      const isActivityAdapted = Boolean(act.isAdapted || act.adaptationType);
      
      if (isActivityAdapted) {
        const parentAct = activities.find((parent) => parent.id === act.adaptedFromId);
        const isIncludedInNormal = parentAct?.includedPneStudentIds && (
          parentAct.includedPneStudentIds.includes(activeStudent.id) ||
          (Boolean(activeStudent.matricula) && parentAct.includedPneStudentIds.includes(activeStudent.matricula)) ||
          (Boolean(activeStudent.fullName) && parentAct.includedPneStudentIds.includes(activeStudent.fullName))
        );
        if (isIncludedInNormal) {
          return false;
        }
        return true;
      }
      return false;
    });
  }, [activities, activeStudent]);

  // Partition activities by status for retractable accordions
  const pendingActivities = useMemo(() => {
    return studentAdaptedActivities.filter((act) => {
      const sub = act.submissions?.find(
        (s) =>
          s.studentId === activeStudent?.id ||
          s.matricula === activeStudent?.matricula ||
          s.studentName === activeStudent?.fullName
      );
      return !sub || sub.status === 'returned' || sub.status === 'draft';
    });
  }, [studentAdaptedActivities, activeStudent]);

  const awaitingCorrectionActivities = useMemo(() => {
    return studentAdaptedActivities.filter((act) => {
      const sub = act.submissions?.find(
        (s) =>
          s.studentId === activeStudent?.id ||
          s.matricula === activeStudent?.matricula ||
          s.studentName === activeStudent?.fullName
      );
      return sub && sub.status === 'pending';
    });
  }, [studentAdaptedActivities, activeStudent]);

  const gradedActivities = useMemo(() => {
    return studentAdaptedActivities.filter((act) => {
      const sub = act.submissions?.find(
        (s) =>
          s.studentId === activeStudent?.id ||
          s.matricula === activeStudent?.matricula ||
          s.studentName === activeStudent?.fullName
      );
      return sub && sub.status === 'graded';
    });
  }, [studentAdaptedActivities, activeStudent]);

  // Listen to playful game events from iframe
  useEffect(() => {
    const handleGameMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'PLAYFUL_GAME_COMPLETED') {
        const { score = 10, maxScore = 10, finalGrade } = event.data;
        const calcGrade =
          finalGrade !== undefined
            ? Number(finalGrade)
            : (Number(score) / (Number(maxScore) || 1)) * 10;

        setPlayfulScore({
          score: Number(score),
          maxScore: Number(maxScore),
          grade: Number(calcGrade.toFixed(1)),
        });
      }
    };

    window.addEventListener('message', handleGameMessage);
    return () => window.removeEventListener('message', handleGameMessage);
  }, []);

  // Open activity to solve with the student
  const handleStartSolving = (act: Activity) => {
    if (!activeStudent) return;
    setExecutingActivityId(act.id);
    setPlayfulScore(null);
    setIsMobileSupportMaterialOpen(false);

    const existingSub = act.submissions?.find(
      (s) => s.studentId === activeStudent.id || s.matricula === activeStudent.matricula
    );

    setEssayInput(existingSub?.essayAnswer || '');
    setObjectiveInputs(existingSub?.selectedObjectiveAnswers || {});
  };

  // Submit activity on behalf of the student
  const handleConfirmSubmit = async (act: Activity) => {
    if (!activeStudent || !onSubmitAnswer) return;

    setIsSubmitting(true);
    try {
      const distribution = getActivityGradeDistribution(act);
      const isPlayful = Boolean(act.playfulGameHtml || act.adaptationType === 'severe_playful');

      let calculatedObjectiveScore = 0;

      if (isPlayful) {
        const finalScore = playfulScore?.grade || act.maxGrade || 10;
        const maxScore = act.maxGrade || 10;

        await onSubmitAnswer(
          act.id,
          activeStudent.id,
          `Atividade Lúdica Adaptada concluída com apoio do 2º Professor (${teacher.name}).`,
          finalScore,
          maxScore,
          0,
          {},
          undefined
        );

        setSubmissionFeedback(`🎉 Atividade lúdica concluída com o(a) aluno(a) ${activeStudent.fullName}! Pontuação enviada para o professor regente.`);
      } else {
        const questions = act.questions || [];
        const objectiveQuestions = questions.filter((q) => q.type === 'multiple_choice') as (ActivityQuestion & MultipleChoiceQuestion)[];

        let correctCount = 0;
        objectiveQuestions.forEach((q) => {
          const chosen = objectiveInputs[q.id];
          if (chosen !== undefined && chosen === q.correctOptionIndex) {
            correctCount += 1;
          }
        });

        if (objectiveQuestions.length > 0) {
          calculatedObjectiveScore = (correctCount / objectiveQuestions.length) * distribution.maxObjectiveGrade;
        } else if (distribution.hasObjective) {
          calculatedObjectiveScore = distribution.maxObjectiveGrade;
        }

        await onSubmitAnswer(
          act.id,
          activeStudent.id,
          essayInput,
          Number(calculatedObjectiveScore.toFixed(1)),
          Number(distribution.maxObjectiveGrade.toFixed(1)),
          Number(distribution.maxEssayGrade.toFixed(1)),
          objectiveInputs,
          undefined
        );

        setSubmissionFeedback(`✅ Atividade enviada com sucesso para ${activeStudent.fullName}! Registrada na fila do professor regente.`);
      }

      scrollToTop();
      setExecutingActivityId(null);
      setTimeout(() => setSubmissionFeedback(null), 5000);
    } catch (err: any) {
      console.error('Erro ao enviar atividade:', err);
      alert('Erro ao enviar atividade: ' + (err?.message || 'Tente novamente.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const executingActivity = useMemo(() => {
    return activities.find((a) => a.id === executingActivityId) || null;
  }, [activities, executingActivityId]);

  const toggleActivityNotes = (id: string) => {
    setExpandedActivityNotes((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <div className="space-y-5 animate-fadeIn max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-4 sm:p-5 rounded-3xl border border-border shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-600 shrink-0">
            <HeartHandshake className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              {isSecondTeacher ? 'Ambiente do 2º Professor' : 'Inclusão & 2º Professores'}
            </h1>
            <p className="text-xs text-muted">
              {isSecondTeacher
                ? `Professor(a) ${teacher.name} • Acompanhamento direto dos seus alunos tutelados`
                : 'Acompanhe os estudantes de inclusão e execute atividades adaptadas.'}
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 self-stretch sm:self-center w-full sm:w-auto">
          {isSecondTeacher && (
            <button
              onClick={() => {
                setChangePasswordMsg(null);
                setIsChangePasswordOpen(true);
              }}
              className="min-h-[42px] py-2 px-4 bg-amber-400/15 hover:bg-amber-400/25 text-amber-600 font-bold rounded-xl transition-all duration-200 border border-amber-400/30 flex items-center justify-center gap-2 cursor-pointer text-xs shrink-0 shadow-sm active:scale-95 w-full sm:w-auto"
            >
              <KeyRound className="w-4 h-4 text-amber-400" />
              <span>Trocar Senha</span>
            </button>
          )}

          {!isSecondTeacher && (
            <div className="flex items-center gap-1.5 p-1 bg-background rounded-2xl border border-border w-full sm:w-auto">
              <button
                onClick={() => setActiveTab('atividades_alunos')}
                className={`min-h-[42px] px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 flex-1 sm:flex-initial min-w-[150px] border active:scale-95 ${
                  activeTab === 'atividades_alunos'
                    ? 'bg-surface border-border text-foreground shadow-sm'
                    : 'text-muted hover:text-foreground border-transparent hover:bg-surface-hover/50'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>Alunos & Atividades</span>
              </button>
              <button
                onClick={() => setActiveTab('professores_apoio')}
                className={`min-h-[42px] px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 flex-1 sm:flex-initial min-w-[150px] border active:scale-95 ${
                  activeTab === 'professores_apoio'
                    ? 'bg-surface border-border text-foreground shadow-sm'
                    : 'text-muted hover:text-foreground border-transparent hover:bg-surface-hover/50'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Professores AEE ({secondTeachers.length})</span>
              </button>
            </div>
          )}

          {!isSecondTeacher && (
            <button
              onClick={() => setIsNewModalOpen(true)}
              className="min-h-[42px] py-2 px-4 bg-amber-400 hover:bg-amber-300 text-black font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-md cursor-pointer text-xs border border-amber-400/40 active:scale-95 shrink-0 w-full sm:w-auto"
            >
              <UserPlus className="w-4 h-4" />
              <span>Novo 2º Professor</span>
            </button>
          )}
        </div>
      </div>

      {/* Global Status messages */}
      {errorMsg && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-600 rounded-2xl text-xs font-semibold">
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 bg-primary/20 border border-primary/40 text-primary rounded-2xl text-xs font-semibold">
          {successMsg}
        </div>
      )}

      {submissionFeedback && (
        <div className="p-3.5 bg-primary/20 border border-primary/40 text-primary rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2.5 shadow-lg animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-primary" />
          <span>{submissionFeedback}</span>
        </div>
      )}

      <SecondTeachersActivitiesTab {...{ activeStudent, activeTab, awaitingCorrectionActivities, boundOrPneStudents, essayInput, executingActivity, expandedActivityNotes, filteredStudents, getStudentBoundTeacherName, gradedActivities, handleConfirmSubmit, handleStartSolving, isAwaitingSectionOpen, isGradedSectionOpen, isMetricsRetractableOpen, isMobileSupportMaterialOpen, isPendingSectionOpen, isSecondTeacher, isStudentDossierOpen, isSubmitting, myTutelageStudents, objectiveInputs, pendingActivities, playfulScore, setEssayInput, setExecutingActivityId, setIsAwaitingSectionOpen, setIsGradedSectionOpen, setIsMetricsRetractableOpen, setIsMobileSupportMaterialOpen, setIsPendingSectionOpen, setIsStudentDossierOpen, setObjectiveInputs, setSelectedStudentId, setStudentSearch, setTutelaScope, studentAdaptedActivities, studentSearch, teacher, toggleActivityNotes, tutelaScope, tutelageMetrics }} />
      <SecondTeachersRosterAndModals {...{ activeTab, changePasswordConfirmPass, changePasswordLoading, changePasswordMsg, changePasswordNewPass, fetchSecondTeachers, handleChangePassword, handleDelete, handleResetTeacherPassword, handleSaveTutelage, isChangePasswordOpen, isDeleting, isLoadingTeachers, isNewModalOpen, isSecondTeacher, onSimulateSecondTeacher, resetRequests, secondTeachers, setChangePasswordConfirmPass, setChangePasswordNewPass, setHistoryModalTeacher, setIsChangePasswordOpen, setIsNewModalOpen, setSuccessMsg, setTeacherToDelete, setTeacherToEdit, setTeacherToResetPassword, setTutelageModalTeacher, students, teacher, teacherToDelete, teacherToEdit, teacherToResetPassword, tutelageModalTeacher }} />
    </div>
  );
};

export default SecondTeachersView;
