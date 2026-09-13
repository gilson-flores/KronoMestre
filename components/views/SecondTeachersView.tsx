'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  HeartHandshake,
  UserPlus,
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
  Info
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  TeacherUser,
  StudentUser,
  Activity,
  UserRole,
  ActivityQuestion,
  MultipleChoiceQuestion,
  EssayQuestion
} from '@/lib/types';
import { NewSecondTeacherModal } from '@/components/modals/NewSecondTeacherModal';
import {
  canStudentAccessActivity,
  getActivityGradeDistribution,
  isStudentPNE
} from '@/lib/studentUtils';
import { extractCleanHtml } from '@/lib/adaptationUtils';

interface SecondTeachersViewProps {
  teacher: TeacherUser;
  currentUserRole?: UserRole;
  students?: StudentUser[];
  activities?: Activity[];
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
}

export const SecondTeachersView: React.FC<SecondTeachersViewProps> = ({
  teacher,
  currentUserRole = 'second_teacher',
  students = [],
  activities = [],
  onSubmitAnswer,
  onSaveStudent,
}) => {
  const isSecondTeacher = currentUserRole === 'second_teacher';
  const [activeTab, setActiveTab] = useState<'atividades_alunos' | 'professores_apoio'>('atividades_alunos');

  // Second teachers list state (for regente view)
  const [secondTeachers, setSecondTeachers] = useState<TeacherUser[]>([]);
  const [isLoadingTeachers, setIsLoadingTeachers] = useState(true);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [teacherToDelete, setTeacherToDelete] = useState<TeacherUser | null>(null);

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
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('local_second_teachers_data');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSecondTeachers(parsed);
          }
        }
      } catch (e) {
        console.warn('Erro ao ler cache local de 2º professores:', e);
      }
    }

    if (!supabase) {
      setIsLoadingTeachers(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('second_teachers')
        .select('*')
        .order('name');

      if (error) {
        console.error('Erro ao buscar 2º professores:', error);
        if (error.code === 'PGRST205') {
          setErrorMsg('A tabela "second_teachers" não foi encontrada. Por favor, execute a migration SQL mais recente no painel do Supabase.');
        } else {
          setErrorMsg('Erro ao carregar lista de professores de apoio.');
        }
      } else if (data && data.length > 0) {
        const formatted: TeacherUser[] = data.map((d) => ({
          id: d.id,
          name: d.name,
          email: d.email,
          subject: d.subject || 'AEE / Inclusão Escolar',
          avatarUrl: d.avatar_url || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=250',
          phone: d.phone || '',
          school: d.school || '',
        }));
        setSecondTeachers(formatted);
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('local_second_teachers_data', JSON.stringify(formatted));
          } catch (e) {
            console.warn('Erro ao atualizar cache local de 2º professores:', e);
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingTeachers(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSecondTeachers();
  }, []);

  // Reset password requests state
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

  const handleResetTeacherPassword = async (st: TeacherUser) => {
    if (!confirm(`Deseja redefinir a senha do 2º Professor "${st.name}" para "1234"?`)) {
      return;
    }

    try {
      if (supabase && st.email) {
        const cleanEmail = st.email.trim().toLowerCase();
        await supabase
          .from('second_teachers')
          .update({ password: '1234' })
          .ilike('email', cleanEmail);

        await supabase
          .from('teachers')
          .update({ password: '1234' })
          .ilike('email', cleanEmail);
      }

      if (typeof window !== 'undefined' && st.email) {
        const cleanEmail = st.email.trim().toLowerCase();
        const updated = resetRequests.filter((e) => e.toLowerCase() !== cleanEmail);
        setResetRequests(updated);
        localStorage.setItem('second_teacher_reset_requests', JSON.stringify(updated));
      }

      setSuccessMsg(`Senha do professor ${st.name} redefinida para "1234" com sucesso!`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg('Erro ao redefinir senha: ' + (err?.message || 'Tente novamente.'));
      setTimeout(() => setErrorMsg(''), 4000);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!supabase) return;

    try {
      const { error } = await supabase.from('second_teachers').delete().eq('id', id);
      if (error) throw error;

      setSuccessMsg(`Professor ${name} removido com sucesso.`);
      fetchSecondTeachers();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Erro ao remover professor: ' + err.message);
      setTimeout(() => setErrorMsg(''), 3000);
    }
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
      if (supabase && teacher.email) {
        await supabase
          .from('second_teachers')
          .update({ password: changePasswordNewPass })
          .ilike('email', teacher.email.trim().toLowerCase());

        await supabase
          .from('teachers')
          .update({ password: changePasswordNewPass })
          .ilike('email', teacher.email.trim().toLowerCase());

        try {
          await supabase.auth.updateUser({ password: changePasswordNewPass });
        } catch (authErr) {
          console.warn('Auth user password update warning:', authErr);
        }
      }

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
  const getStudentBoundTeacherName = (s: StudentUser): string | undefined => {
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
  };

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
  }, [students, teacher.id, teacher.name, teacher.email, secondTeachers]);

  // 2. All PNE/Inclusão students in the school (for regente view)
  const boundOrPneStudents = useMemo(() => {
    return students.filter((s) => {
      const isPne = isStudentPNE(s) || (s.pneConditions && s.pneConditions.length > 0) || s.tag === 'PNE';
      const isBound = Boolean(getStudentBoundTeacherName(s) || s.secondTeacherId);
      return isPne || isBound;
    });
  }, [students, secondTeachers, teacher.id, teacher.name, teacher.email]);

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
        <div className="flex items-center gap-2 self-start sm:self-center">
          {isSecondTeacher && (
            <button
              onClick={() => {
                setChangePasswordMsg(null);
                setIsChangePasswordOpen(true);
              }}
              className="py-2 px-3.5 bg-amber-400/15 hover:bg-amber-400/25 text-amber-600 font-bold rounded-xl transition-all border border-amber-400/30 flex items-center gap-1.5 cursor-pointer text-xs shrink-0 shadow-sm active:scale-95"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              <span>Trocar Senha</span>
            </button>
          )}

          {!isSecondTeacher && (
            <div className="flex bg-background p-1 rounded-2xl border border-border">
              <button
                onClick={() => setActiveTab('atividades_alunos')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'atividades_alunos'
                    ? 'bg-amber-400 text-black shadow-md'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Alunos & Atividades</span>
              </button>
              <button
                onClick={() => setActiveTab('professores_apoio')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'professores_apoio'
                    ? 'bg-amber-400 text-black shadow-md'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Professores AEE ({secondTeachers.length})</span>
              </button>
            </div>
          )}

          {activeTab === 'professores_apoio' && !isSecondTeacher && (
            <button
              onClick={() => setIsNewModalOpen(true)}
              className="py-2 px-4 bg-amber-400 hover:bg-amber-300 text-black font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-md cursor-pointer text-xs"
            >
              <UserPlus className="w-3.5 h-3.5" />
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

      {/* TAB 1: ALUNOS & ATIVIDADES ADAPTADAS */}
      {activeTab === 'atividades_alunos' && (
        <div className="space-y-5">
          {/* MENU RETRÁTIL 1: PAINEL DE MÉTRICAS & RESUMO */}
          <div className="glass-panel rounded-3xl border border-border bg-surface overflow-hidden transition-all shadow-md">
            <button
              onClick={() => setIsMetricsRetractableOpen(!isMetricsRetractableOpen)}
              className="w-full p-3.5 sm:p-4 flex items-center justify-between gap-3 text-left hover:bg-surface-hover transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-xl bg-amber-100 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <Layers className="w-3.5 h-3.5" />
                </div>
                <span className="font-bold text-foreground text-xs sm:text-sm">Resumo da Tutela AEE</span>
                <div className="hidden sm:flex items-center gap-2 text-[11px] text-muted border-l border-border pl-3">
                  <span className="bg-amber-400/10 text-amber-600 border border-amber-400/20 px-2 py-0.5 rounded-full font-bold">
                    {tutelageMetrics.totalTutelageStudents} {tutelageMetrics.totalTutelageStudents === 1 ? 'Aluno' : 'Alunos'}
                  </span>
                  <span className="bg-surface-hover text-muted px-2 py-0.5 rounded-full">
                    {tutelageMetrics.totalPending} Pendentes
                  </span>
                  <span className="bg-emerald-500/10 text-primary border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    {tutelageMetrics.totalGraded} Concluídas
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold shrink-0">
                <span>{isMetricsRetractableOpen ? 'Recolher' : 'Expandir'}</span>
                {isMetricsRetractableOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {/* Expanded Metrics Content */}
            {isMetricsRetractableOpen && (
              <div className="p-4 pt-1 border-t border-border grid grid-cols-2 md:grid-cols-4 gap-3 animate-fadeIn">
                <div className="p-3.5 rounded-2xl border border-amber-400/30 bg-amber-500/10 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-600 shrink-0">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase text-amber-600 tracking-wider">Sob Sua Tutela</p>
                    <p className="text-lg font-black text-foreground">{tutelageMetrics.totalTutelageStudents} <span className="text-[10px] font-normal text-muted">Alunos</span></p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl border border-border bg-background flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase text-muted tracking-wider">A Fazer com Apoio</p>
                    <p className="text-lg font-black text-foreground">{tutelageMetrics.totalPending} <span className="text-[10px] font-normal text-muted">Atividades</span></p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl border border-border bg-background flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase text-muted tracking-wider">Em Análise (Regente)</p>
                    <p className="text-lg font-black text-foreground">{tutelageMetrics.totalToCorrect} <span className="text-[10px] font-normal text-muted">Enviadas</span></p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl border border-border bg-background flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-primary shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase text-muted tracking-wider">Concluídas / Avaliadas</p>
                    <p className="text-lg font-black text-foreground">{tutelageMetrics.totalGraded} <span className="text-[10px] font-normal text-muted">Finalizadas</span></p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Main Layout: Left Column (Student List) + Right Column (Activities) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left Column: Lista de Alunos */}
            <div className="lg:col-span-4 space-y-4">
              <div className="glass-panel p-4 rounded-3xl border border-border bg-surface space-y-3 shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-amber-400" />
                    <h3 className="font-bold text-foreground text-xs sm:text-sm">
                      {isSecondTeacher ? 'Meus Alunos Tutelados' : 'Estudantes AEE'}
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 bg-amber-400/10 text-amber-400 border border-amber-400/20 rounded-full text-[10px] font-bold">
                    {filteredStudents.length} {filteredStudents.length === 1 ? 'Aluno' : 'Alunos'}
                  </span>
                </div>

                {/* Se for Professor Regente, permite alternar escopo */}
                {!isSecondTeacher && (
                  <div className="grid grid-cols-2 p-1 bg-background rounded-2xl border border-border text-xs">
                    <button
                      onClick={() => setTutelaScope('minha_tutela')}
                      className={`py-1 px-2 rounded-xl font-bold transition-all cursor-pointer text-center text-[10px] ${
                        tutelaScope === 'minha_tutela'
                          ? 'bg-amber-400 text-black shadow'
                          : 'text-muted hover:text-foreground'
                      }`}
                    >
                      Minha Tutela ({myTutelageStudents.length})
                    </button>
                    <button
                      onClick={() => setTutelaScope('todos_pne')}
                      className={`py-1 px-2 rounded-xl font-bold transition-all cursor-pointer text-center text-[10px] ${
                        tutelaScope === 'todos_pne'
                          ? 'bg-amber-400 text-black shadow'
                          : 'text-muted hover:text-foreground'
                      }`}
                    >
                      Todos AEE ({boundOrPneStudents.length})
                    </button>
                  </div>
                )}

                {/* Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Buscar aluno por nome, turma..."
                    className="w-full bg-background border border-border rounded-xl pl-8 pr-3 py-2 text-xs text-foreground placeholder:text-muted/50 focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* Student list */}
                <div className="space-y-1.5 max-h-[480px] overflow-y-auto pr-1">
                  {filteredStudents.length === 0 ? (
                    <div className="py-8 text-center text-xs text-muted space-y-2">
                      <p>Nenhum aluno encontrado para este filtro.</p>
                      {isSecondTeacher && (
                        <p className="text-[11px] text-muted/70">
                          Apenas os alunos vinculados a você ({teacher.name}) são exibidos aqui.
                        </p>
                      )}
                    </div>
                  ) : (
                    filteredStudents.map((s) => {
                      const isSelected = activeStudent?.id === s.id;
                      const boundTeacherName = getStudentBoundTeacherName(s);
                      const isBoundToMe =
                        s.secondTeacherId === teacher.id ||
                        (s.secondTeacherName && s.secondTeacherName.toLowerCase() === teacher.name?.toLowerCase()) ||
                        boundTeacherName === teacher.name;

                      return (
                        <div
                          key={s.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            setSelectedStudentId(s.id);
                            setExecutingActivityId(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              setSelectedStudentId(s.id);
                              setExecutingActivityId(null);
                            }
                          }}
                          className={`w-full text-left p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                            isSelected
                              ? 'bg-amber-400/20 border-amber-400/60 shadow-md ring-1 ring-amber-400/40'
                              : 'bg-background border-border hover:border-border hover:bg-[#141e33]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={s.avatarUrl}
                              alt={s.fullName}
                              className="w-9 h-9 rounded-full object-cover border border-amber-400/40 shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <h4 className="font-bold text-foreground text-xs truncate leading-tight">{s.fullName}</h4>
                              <p className="text-[10px] text-amber-600 font-medium truncate mt-0.5">
                                Turma {s.turma} {s.matricula ? `• Matrícula ${s.matricula}` : ''}
                              </p>
                            </div>
                          </div>

                          <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-amber-400' : 'text-muted/40'}`} />
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Work Area & Activities */}
            <div className="lg:col-span-8 space-y-4">
              {/* If solving activity in fullscreen playful mode */}
              {executingActivity && (executingActivity.playfulGameHtml || executingActivity.adaptationType === 'severe_playful') ? (
                <div className="fixed inset-0 z-50 w-screen h-screen bg-[#070d19] flex flex-col p-2 sm:p-4 animate-fadeIn">
                  <div className="flex items-center justify-between gap-3 pb-2 px-2 border-b border-border">
                    <button
                      onClick={() => setExecutingActivityId(null)}
                      className="px-3.5 py-2 bg-[#171f33] hover:bg-[#222c42] text-foreground font-bold text-xs rounded-xl border border-border transition-all flex items-center gap-1.5 cursor-pointer shadow active:scale-95 shrink-0"
                    >
                      <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
                      <span>Voltar</span>
                    </button>

                    <div className="flex items-center gap-2 min-w-0">
                      <Gamepad2 className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="font-bold text-foreground text-xs sm:text-sm truncate">
                        {executingActivity.title}
                      </span>
                      <span className="text-[11px] text-amber-600 font-semibold bg-[#171f33] px-2 py-0.5 rounded-full border border-amber-500/30 hidden sm:inline">
                        Aluno: {activeStudent?.fullName}
                      </span>
                      {playfulScore && (
                        <span className="px-2.5 py-0.5 bg-primary/20 text-primary font-bold text-xs rounded-full border border-primary/30 hidden sm:flex items-center gap-1 shrink-0">
                          <Star className="w-3 h-3 fill-[#4ade80]" />
                          {playfulScore.grade} / {executingActivity.maxGrade || 10} pts
                        </span>
                      )}
                    </div>

                    <button
                      disabled={isSubmitting}
                      onClick={() => handleConfirmSubmit(executingActivity)}
                      className="px-4 py-2 bg-primary hover:bg-primary-hover text-white font-black text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5 active:scale-95 shrink-0 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isSubmitting ? 'Enviando...' : 'Enviar Atividade'}</span>
                    </button>
                  </div>

                  <div className="flex-1 w-full rounded-2xl overflow-hidden border border-border bg-black shadow-2xl relative mt-2">
                    <iframe
                      srcDoc={
                        executingActivity.playfulGameHtml
                          ? extractCleanHtml(executingActivity.playfulGameHtml)
                          : '<div style="color:white;padding:20px;font-family:sans-serif;text-align:center;">Carregando jogo interativo...</div>'
                      }
                      title={`Jogo Lúdico - ${executingActivity.title}`}
                      className="w-full h-full border-0 block"
                      allow="autoplay; fullscreen"
                      sandbox="allow-scripts allow-same-origin allow-modals"
                    />
                  </div>
                </div>
              ) : executingActivity ? (
                /* Mobile Assist Simulator */
                <div className="glass-panel p-4 sm:p-5 rounded-3xl border border-amber-400/40 space-y-4 shadow-xl bg-[#0e162a]">
                  <div className="flex items-center justify-between gap-3 pb-3 border-b border-border">
                    <button
                      onClick={() => setExecutingActivityId(null)}
                      className="py-1.5 px-3 bg-surface-hover hover:bg-white/20 text-foreground rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
                      <span>Voltar</span>
                    </button>

                    <div className="flex items-center gap-2 truncate">
                      <Smartphone className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="font-bold text-foreground text-xs sm:text-sm truncate">
                        {executingActivity.title}
                      </span>
                    </div>

                    <span className="text-[10px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/30 shrink-0">
                      {getActivityGradeDistribution(executingActivity).maxGrade.toFixed(1)} pts
                    </span>
                  </div>

                  {/* Simulator Screen Container */}
                  <div className="max-w-2xl mx-auto bg-surface rounded-2xl border border-white/15 p-4 sm:p-5 space-y-4 shadow-inner">
                    <div className="bg-[#171f33] p-3 rounded-xl border border-border flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={activeStudent?.avatarUrl}
                          alt={activeStudent?.fullName}
                          className="w-7 h-7 rounded-full object-cover border border-amber-400"
                        />
                        <div>
                          <p className="font-bold text-foreground leading-tight">{activeStudent?.fullName}</p>
                          <p className="text-[10px] text-amber-400">Turma {activeStudent?.turma}</p>
                        </div>
                      </div>
                      <span className="text-[9px] bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full font-bold border border-amber-500/30">
                        Resolução com Apoio AEE
                      </span>
                    </div>

                    {/* MENU RETRÁTIL NO SIMULADOR: Orientações & Material de Apoio */}
                    {(executingActivity.description || executingActivity.supportMaterial) && (
                      <div className="border border-border rounded-xl bg-background overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setIsMobileSupportMaterialOpen(!isMobileSupportMaterialOpen)}
                          className="w-full p-2.5 flex items-center justify-between text-left text-xs font-bold text-amber-600 hover:bg-surface-hover cursor-pointer"
                        >
                          <span className="flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                            <span>Orientações & Material de Apoio</span>
                          </span>
                          {isMobileSupportMaterialOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>

                        {isMobileSupportMaterialOpen && (
                          <div className="p-3 pt-1 border-t border-border text-xs text-muted space-y-2">
                            {executingActivity.description && (
                              <p className="text-foreground leading-relaxed">{executingActivity.description}</p>
                            )}
                            {executingActivity.supportMaterial && (
                              <div className="p-2.5 bg-black/30 rounded-lg text-[11px] whitespace-pre-wrap">
                                {executingActivity.supportMaterial}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Multiple Choice Questions */}
                    {executingActivity.questions &&
                      executingActivity.questions.filter((q) => q.type === 'multiple_choice').length > 0 && (
                        <div className="space-y-3 pt-1">
                          <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <HelpCircle className="w-3.5 h-3.5 text-primary" />
                            <span>Questões Objetivas Adaptadas</span>
                          </h4>

                          {executingActivity.questions
                            .filter((q) => q.type === 'multiple_choice')
                            .map((q: any, qIdx: number) => {
                              const currentChoice = objectiveInputs[q.id];

                              return (
                                <div key={q.id || qIdx} className="bg-background p-3.5 rounded-xl border border-border space-y-2.5">
                                  <p className="text-xs font-bold text-foreground">
                                    {qIdx + 1}. <span className="text-foreground font-normal">{q.statement}</span>
                                  </p>

                                  <div className="space-y-1.5 pt-1">
                                    {q.options?.map((optText: string, optIdx: number) => {
                                      const isSelected = currentChoice === optIdx;

                                      return (
                                        <button
                                          key={optIdx}
                                          type="button"
                                          onClick={() =>
                                            setObjectiveInputs((prev) => ({
                                              ...prev,
                                              [q.id]: optIdx,
                                            }))
                                          }
                                          className={`w-full text-left p-2.5 rounded-xl text-xs transition-all flex items-center gap-2.5 border cursor-pointer ${
                                            isSelected
                                              ? 'bg-amber-400/20 border-amber-400 text-foreground font-bold shadow'
                                              : 'bg-[#171f33] border-border text-muted hover:bg-surface-hover hover:text-foreground'
                                          }`}
                                        >
                                          <span
                                            className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-black ${
                                              isSelected ? 'bg-amber-400 text-black' : 'bg-surface-hover text-foreground'
                                            }`}
                                          >
                                            {String.fromCharCode(65 + optIdx)}
                                          </span>
                                          <span className="flex-1 text-xs">{optText}</span>
                                          {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      )}

                    {/* Essay Questions */}
                    {executingActivity.questions &&
                      executingActivity.questions.filter((q) => q.type === 'essay').length > 0 && (
                        <div className="space-y-3 pt-1">
                          <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <PenTool className="w-3.5 h-3.5 text-[#c0c1ff]" />
                            <span>Questão Dissertativa Adaptada</span>
                          </h4>

                          {executingActivity.questions
                            .filter((q) => q.type === 'essay')
                            .map((q: any, qIdx: number) => (
                              <div key={q.id || qIdx} className="bg-background p-3 rounded-xl border border-border">
                                <p className="text-xs text-foreground">{q.statement}</p>
                              </div>
                            ))}

                          <textarea
                            rows={4}
                            value={essayInput}
                            onChange={(e) => setEssayInput(e.target.value)}
                            placeholder="Digite a resposta com o estudante durante a mediação..."
                            className="w-full bg-background border border-white/15 rounded-xl p-3 text-xs text-foreground placeholder:text-muted/50 focus:outline-none focus:border-amber-400 leading-relaxed"
                          />
                        </div>
                      )}

                    {/* Actions */}
                    <div className="pt-3 border-t border-border flex items-center justify-between gap-3">
                      <button
                        onClick={() => setExecutingActivityId(null)}
                        className="py-2 px-4 bg-surface-hover hover:bg-surface-hover text-muted hover:text-foreground rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        Cancelar
                      </button>

                      <button
                        disabled={isSubmitting}
                        onClick={() => handleConfirmSubmit(executingActivity)}
                        className="py-2.5 px-5 bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-md disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{isSubmitting ? 'Enviando...' : 'Concluir Atividade'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Atividades listadas para o estudante selecionado */
                <div className="space-y-4">
                  {/* Selected Student Banner + MENU RETRÁTIL 2: FICHA DO ESTUDANTE / PEI */}
                  {activeStudent && (
                    <div className="glass-panel p-4 rounded-3xl border border-amber-400/30 bg-surface shadow-md space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={activeStudent.avatarUrl}
                            alt={activeStudent.fullName}
                            className="w-11 h-11 rounded-full object-cover border-2 border-amber-400/60 shrink-0"
                          />
                          <div className="min-w-0">
                            <h2 className="text-foreground font-extrabold text-sm sm:text-base truncate leading-tight">
                              {activeStudent.fullName}
                            </h2>
                            <p className="text-[11px] text-muted mt-0.5 truncate">
                              Turma <strong className="text-foreground">{activeStudent.turma}</strong>
                              {activeStudent.matricula && (
                                <> • Matrícula: <strong className="text-foreground">{activeStudent.matricula}</strong></>
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Botão Retrátil da Ficha do PEI */}
                        <button
                          onClick={() => setIsStudentDossierOpen(!isStudentDossierOpen)}
                          className="py-1.5 px-3 bg-surface-hover hover:bg-surface-hover text-amber-600 font-bold rounded-xl border border-border transition-all flex items-center gap-1.5 cursor-pointer text-[11px] shrink-0"
                        >
                          <FileText className="w-3.5 h-3.5 text-amber-400" />
                          <span>{isStudentDossierOpen ? 'Recolher Ficha' : 'Ficha & PEI'}</span>
                          {isStudentDossierOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      {/* Conteúdo Retrátil da Ficha & PEI */}
                      {isStudentDossierOpen && (
                        <div className="pt-3 border-t border-border space-y-3 text-xs animate-fadeIn">
                          {activeStudent.pneConditions && activeStudent.pneConditions.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold text-muted uppercase">Necessidades & Diagnósticos:</p>
                              <div className="flex flex-wrap gap-1">
                                {activeStudent.pneConditions.map((cond, i) => (
                                  <span
                                    key={i}
                                    className="px-2 py-0.5 bg-amber-400/15 text-amber-600 border border-amber-400/30 rounded-lg text-[10px] font-semibold"
                                  >
                                    {cond}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {activeStudent.pedagogicalNotes ? (
                            <div className="p-3 bg-background rounded-xl border border-border text-[11px] text-foreground leading-relaxed space-y-1">
                              <p className="font-bold text-amber-600 text-[10px] uppercase flex items-center gap-1">
                                <BookOpen className="w-3 h-3" /> Observações do PEI / Laudo
                              </p>
                              <p className="whitespace-pre-wrap">{activeStudent.pedagogicalNotes}</p>
                            </div>
                          ) : (
                            <p className="text-[11px] text-muted italic">Sem observações de PEI cadastradas.</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* MENUS RETRÁTEIS 3: ATIVIDADES POR STATUS (SANFONA / ACCORDION) */}
                  {studentAdaptedActivities.length === 0 ? (
                    <div className="glass-panel p-8 rounded-3xl border border-border bg-surface text-center space-y-2">
                      <Sparkles className="w-8 h-8 text-amber-400 mx-auto opacity-70" />
                      <h4 className="font-bold text-foreground text-sm">Nenhuma Atividade Adaptada para esta Turma</h4>
                      <p className="text-xs text-muted max-w-sm mx-auto">
                        Quando o professor regente disponibilizar ou adaptar atividades para a turma {activeStudent?.turma}, elas aparecerão aqui.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* ACCORDION 1: ATIVIDADES A FAZER */}
                      <div className="glass-panel rounded-3xl border border-border bg-surface overflow-hidden shadow-md">
                        <button
                          onClick={() => setIsPendingSectionOpen(!isPendingSectionOpen)}
                          className="w-full p-3.5 flex items-center justify-between gap-3 text-left hover:bg-surface-hover cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-amber-400" />
                            <h3 className="font-bold text-foreground text-xs sm:text-sm">
                              Atividades a Fazer com Suporte
                            </h3>
                            <span className="px-2 py-0.5 bg-amber-400/20 text-amber-600 border border-amber-400/30 rounded-full text-[10px] font-extrabold">
                              {pendingActivities.length}
                            </span>
                          </div>
                          <div className="text-xs text-amber-400 font-bold flex items-center gap-1">
                            {isPendingSectionOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </button>

                        {isPendingSectionOpen && (
                          <div className="p-3.5 pt-0 space-y-2.5 border-t border-border animate-fadeIn">
                            {pendingActivities.length === 0 ? (
                              <p className="text-xs text-muted italic py-2">Nenhuma atividade pendente a fazer para este aluno.</p>
                            ) : (
                              pendingActivities.map((act) => {
                                const distribution = getActivityGradeDistribution(act);
                                const isNotesOpen = Boolean(expandedActivityNotes[act.id]);

                                return (
                                  <div
                                    key={act.id}
                                    className="p-3.5 rounded-2xl border border-border bg-background space-y-2.5 hover:border-amber-400/40 transition-all"
                                  >
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-[9px] font-extrabold bg-amber-400/20 text-amber-600 px-2 py-0.2 rounded-full border border-amber-400/30">
                                            {act.isAdapted ? 'Adaptada PNE' : act.type}
                                          </span>
                                          {act.adaptationType === 'severe_playful' && (
                                            <span className="text-[9px] font-extrabold bg-purple-100 text-purple-600 px-2 py-0.2 rounded-full border border-purple-500/30">
                                              🎮 Lúdica
                                            </span>
                                          )}
                                          <span className="text-[10px] text-muted">
                                            Prazo: {act.deadline || 'Sem data'}
                                          </span>
                                        </div>
                                        <h4 className="text-sm font-bold text-foreground mt-1">{act.title}</h4>
                                      </div>

                                      <button
                                        onClick={() => handleStartSolving(act)}
                                        className="py-2 px-4 bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shrink-0 active:scale-95"
                                      >
                                        <Smartphone className="w-3.5 h-3.5" />
                                        <span>Fazer no Celular com o Aluno</span>
                                      </button>
                                    </div>

                                    {/* Retractable activity description */}
                                    {act.description && (
                                      <div className="pt-1">
                                        <button
                                          type="button"
                                          onClick={() => toggleActivityNotes(act.id)}
                                          className="text-[10px] text-amber-600 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                                        >
                                          <Info className="w-3 h-3" />
                                          <span>{isNotesOpen ? 'Ocultar Orientações' : 'Ver Orientações'}</span>
                                        </button>
                                        {isNotesOpen && (
                                          <p className="text-xs text-muted mt-1.5 leading-relaxed bg-surface p-2.5 rounded-xl border border-border animate-fadeIn">
                                            {act.description}
                                          </p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>

                      {/* ACCORDION 2: AGUARDANDO CORREÇÃO DO REGENTE */}
                      <div className="glass-panel rounded-3xl border border-border bg-surface overflow-hidden shadow-md">
                        <button
                          onClick={() => setIsAwaitingSectionOpen(!isAwaitingSectionOpen)}
                          className="w-full p-3.5 flex items-center justify-between gap-3 text-left hover:bg-surface-hover cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-sky-400" />
                            <h3 className="font-bold text-foreground text-xs sm:text-sm">
                              Enviadas / Aguardando Parecer do Regente
                            </h3>
                            <span className="px-2 py-0.5 bg-sky-500/20 text-sky-300 border border-sky-500/30 rounded-full text-[10px] font-extrabold">
                              {awaitingCorrectionActivities.length}
                            </span>
                          </div>
                          <div className="text-xs text-sky-400 font-bold flex items-center gap-1">
                            {isAwaitingSectionOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </button>

                        {isAwaitingSectionOpen && (
                          <div className="p-3.5 pt-0 space-y-2.5 border-t border-border animate-fadeIn">
                            {awaitingCorrectionActivities.length === 0 ? (
                              <p className="text-xs text-muted italic py-2">Nenhuma atividade aguardando correção.</p>
                            ) : (
                              awaitingCorrectionActivities.map((act) => (
                                <div
                                  key={act.id}
                                  className="p-3.5 rounded-2xl border border-border bg-background flex items-center justify-between gap-3"
                                >
                                  <div>
                                    <span className="text-[9px] font-extrabold bg-sky-500/20 text-sky-300 px-2 py-0.2 rounded-full border border-sky-500/30">
                                      ⏳ Em Análise
                                    </span>
                                    <h4 className="text-sm font-bold text-foreground mt-1">{act.title}</h4>
                                  </div>

                                  <button
                                    onClick={() => handleStartSolving(act)}
                                    className="py-1.5 px-3 bg-surface-hover hover:bg-white/20 text-foreground font-bold text-xs rounded-xl transition-all cursor-pointer shrink-0"
                                  >
                                    Editar Resposta
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>

                      {/* ACCORDION 3: CONCLUÍDAS E AVALIADAS */}
                      <div className="glass-panel rounded-3xl border border-border bg-surface overflow-hidden shadow-md">
                        <button
                          onClick={() => setIsGradedSectionOpen(!isGradedSectionOpen)}
                          className="w-full p-3.5 flex items-center justify-between gap-3 text-left hover:bg-surface-hover cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-primary" />
                            <h3 className="font-bold text-foreground text-xs sm:text-sm">
                              Concluídas e Avaliadas
                            </h3>
                            <span className="px-2 py-0.5 bg-emerald-100 text-primary border border-emerald-500/30 rounded-full text-[10px] font-extrabold">
                              {gradedActivities.length}
                            </span>
                          </div>
                          <div className="text-xs text-primary font-bold flex items-center gap-1">
                            {isGradedSectionOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </button>

                        {isGradedSectionOpen && (
                          <div className="p-3.5 pt-0 space-y-2.5 border-t border-border animate-fadeIn">
                            {gradedActivities.length === 0 ? (
                              <p className="text-xs text-muted italic py-2">Nenhuma atividade avaliada ainda.</p>
                            ) : (
                              gradedActivities.map((act) => {
                                const sub = act.submissions?.find(
                                  (s) =>
                                    s.studentId === activeStudent?.id ||
                                    s.matricula === activeStudent?.matricula ||
                                    s.studentName === activeStudent?.fullName
                                );
                                const totalScore = (sub?.objectiveScore || 0) + (sub?.essayScore || 0);

                                return (
                                  <div
                                    key={act.id}
                                    className="p-3.5 rounded-2xl border border-border bg-background space-y-2"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <h4 className="text-sm font-bold text-foreground">{act.title}</h4>
                                      <span className="font-extrabold text-xs text-primary bg-primary/15 px-2.5 py-0.5 rounded-full border border-primary/30 shrink-0">
                                        Nota: {totalScore.toFixed(1)} pts
                                      </span>
                                    </div>
                                    {sub?.teacherFeedback && (
                                      <p className="text-xs text-foreground italic bg-surface p-2 rounded-lg">
                                        &ldquo;{sub.teacherFeedback}&rdquo;
                                      </p>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CADASTRO DE 2º PROFESSORES (REGENTE / ADMIN) */}
      {activeTab === 'professores_apoio' && !isSecondTeacher && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">Professores de Apoio (AEE) Cadastrados</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {isLoadingTeachers ? (
              <div className="col-span-full py-8 text-center text-muted">Carregando profissionais...</div>
            ) : secondTeachers.length === 0 ? (
              <div className="col-span-full glass-panel p-8 rounded-3xl border border-border text-center flex flex-col items-center justify-center">
                <HeartHandshake className="w-8 h-8 text-amber-400 mb-2" />
                <h3 className="text-base font-bold text-foreground mb-1">Nenhum 2º Professor Cadastrado</h3>
                <p className="text-xs text-muted max-w-md mx-auto mb-4">
                  Cadastre profissionais de Atendimento Educacional Especializado (AEE) para auxiliarem no acompanhamento de alunos de inclusão.
                </p>
                <button
                  onClick={() => setIsNewModalOpen(true)}
                  className="py-2 px-5 bg-amber-400 text-black font-bold rounded-xl text-xs cursor-pointer shadow"
                >
                  Cadastrar Agora
                </button>
              </div>
            ) : (
              secondTeachers.map((st) => {
                const isPendingReset =
                  st.email && resetRequests.some((e) => e.toLowerCase() === st.email?.toLowerCase());

                return (
                  <div
                    key={st.id}
                    className="glass-panel p-4 rounded-3xl border border-border bg-surface flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between mb-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={st.avatarUrl} alt={st.name} className="w-10 h-10 rounded-full object-cover border border-amber-400" />
                        <span className="flex items-center gap-1 bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full text-[9px] font-bold border border-amber-500/20">
                          <ShieldCheck className="w-3 h-3" /> AEE
                        </span>
                      </div>
                      <h3 className="font-bold text-foreground text-sm mb-1 truncate">{st.name}</h3>

                      {isPendingReset && (
                        <div className="mt-1 text-[10px] font-bold text-amber-600 bg-amber-100 border border-amber-200 px-2 py-1 rounded-lg flex items-center gap-1">
                          <KeyRound className="w-3 h-3 text-amber-400 shrink-0" />
                          <span>Solicitação de Reset (Senha 1234)</span>
                        </div>
                      )}

                      <div className="space-y-1 mt-3 text-xs text-muted">
                        <div className="flex items-center gap-1.5 truncate">
                          <Mail className="w-3 h-3 shrink-0" />
                          <span className="truncate">{st.email}</span>
                        </div>
                        {st.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3 h-3 shrink-0" />
                            <span>{st.phone}</span>
                          </div>
                        )}
                        {st.subject && (
                          <div className="flex items-center gap-1.5 truncate">
                            <BookOpen className="w-3 h-3 shrink-0" />
                            <span className="truncate">{st.subject}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleResetTeacherPassword(st)}
                        className="py-1.5 px-3 text-xs font-bold rounded-xl border transition-all flex items-center gap-1 bg-amber-400/20 hover:bg-amber-400/30 text-amber-600 border-amber-400/30 cursor-pointer"
                      >
                        <KeyRound className="w-3 h-3" />
                        <span>Resetar Senha</span>
                      </button>

                      <button
                        onClick={() => setTeacherToDelete(st)}
                        className="p-1.5 text-rose-400 hover:text-foreground hover:bg-rose-500 rounded-xl transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Modal Novo 2º Professor */}
      <NewSecondTeacherModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        defaultSchool={teacher.school}
        onCreateSecondTeacher={() => {
          setSuccessMsg('Professor cadastrado com sucesso!');
          fetchSecondTeachers();
          setTimeout(() => setSuccessMsg(''), 3000);
        }}
      />

      {/* Modal Trocar Senha */}
      {isChangePasswordOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="glass-panel w-full max-w-md p-5 sm:p-6 rounded-3xl border border-border space-y-4 bg-surface shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <KeyRound className="w-4 h-4" />
                <span>Trocar Minha Senha de Acesso</span>
              </div>
              <button
                onClick={() => setIsChangePasswordOpen(false)}
                className="text-muted hover:text-foreground p-1 rounded-xl hover:bg-surface-hover transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {changePasswordMsg && (
              <div
                className={`p-3 rounded-2xl text-xs font-semibold ${
                  changePasswordMsg.type === 'success'
                    ? 'bg-emerald-100 border border-emerald-200 text-emerald-600'
                    : 'bg-rose-100 border border-rose-200 text-rose-600'
                }`}
              >
                {changePasswordMsg.text}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-muted font-semibold mb-1">E-mail Cadastrado</label>
                <input
                  type="email"
                  disabled
                  value={teacher.email || ''}
                  className="w-full bg-surface/60 border border-border rounded-2xl px-4 py-2.5 text-foreground/70 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-muted font-semibold mb-1">Nova Senha (Mínimo 4 caracteres)</label>
                <input
                  type="password"
                  required
                  value={changePasswordNewPass}
                  onChange={(e) => setChangePasswordNewPass(e.target.value)}
                  className="w-full bg-surface border border-border rounded-2xl px-4 py-2.5 text-foreground focus:outline-none focus:border-amber-400"
                  placeholder="Digite sua nova senha"
                />
              </div>

              <div>
                <label className="block text-muted font-semibold mb-1">Confirmar Nova Senha</label>
                <input
                  type="password"
                  required
                  value={changePasswordConfirmPass}
                  onChange={(e) => setChangePasswordConfirmPass(e.target.value)}
                  className="w-full bg-surface border border-border rounded-2xl px-4 py-2.5 text-foreground focus:outline-none focus:border-amber-400"
                  placeholder="Repita a nova senha"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsChangePasswordOpen(false)}
                  className="flex-1 py-2.5 bg-surface hover:bg-[#1a243b] text-muted font-bold rounded-2xl border border-border transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={changePasswordLoading}
                  className="flex-1 py-2.5 bg-amber-400 hover:bg-amber-300 text-black font-bold rounded-2xl transition-all shadow-md cursor-pointer"
                >
                  {changePasswordLoading ? 'Salvando...' : 'Atualizar Senha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {teacherToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface border border-border rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 bg-rose-500/10 rounded-full border border-rose-500/20 text-rose-500">
                <Trash2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">Remover Acesso</h3>
                <p className="text-sm text-text-muted mt-2">
                  Deseja realmente remover o acesso de <strong className="text-foreground">{teacherToDelete.name}</strong>?
                  Esse professor não poderá mais visualizar ou corrigir as atividades dos alunos PNE sob sua tutela.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  handleDelete(teacherToDelete.id, teacherToDelete.name);
                  setTeacherToDelete(null);
                }}
                className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-colors cursor-pointer min-h-[44px]"
              >
                Sim, Remover Acesso
              </button>
              <button
                onClick={() => setTeacherToDelete(null)}
                className="w-full py-3 bg-transparent border border-border hover:bg-surface-hover text-foreground font-bold rounded-xl transition-colors cursor-pointer min-h-[44px]"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecondTeachersView;
