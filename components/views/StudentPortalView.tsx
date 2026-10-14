'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { StudentUser, TeacherUser, Activity, LibraryFile, ChatMessage, ActivityQuestion, MultipleChoiceQuestion, EssayQuestion } from '@/lib/types';
import { canStudentAccessActivity, getActivityGradeDistribution, isStudentPNE, isActivityAdapted } from '@/lib/studentUtils';
import { extractCleanHtml } from '@/lib/adaptationUtils';
import { scrollToTop } from '@/lib/utils';
import { MessagesView } from './MessagesView';
import { KronoGamePlayer } from '@/components/views/KronoGamePlayer';
import { KRONO_AVATARS, AVATAR_CATEGORIES, AvatarItem } from '@/lib/avatarRegistry';
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
  PenTool,
  Gamepad2,
  Star,
  Trophy,
  RefreshCw,
  Maximize2,
  Minimize2,
  Smartphone,
  Bell,
  BellRing,
  BellOff,
  Filter,
  SlidersHorizontal,
  Search,
  ChevronDown,
  ChevronUp,
  Lock,
  AlertTriangle,
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
  onUpdateAvatar?: (studentId: string, newAvatarUrl: string) => void;
}

export const StudentPortalView: React.FC<StudentPortalViewProps> = ({
  student,
  teacher = {
    id: 'teacher-1',
    name: 'Gilson Flores',
    subject: 'Sociologia',
    email: '',
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
  onUpdateAvatar,
}) => {
  // Tab state: 'atividades' | 'correcoes' | 'mensagens' | 'arquivos'
  const [activeTab, setActiveTab] = useState<'atividades' | 'correcoes' | 'mensagens' | 'arquivos'>('atividades');
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [avatarCategoryFilter, setAvatarCategoryFilter] = useState<string>('todos');
  const [avatarSearchQuery, setAvatarSearchQuery] = useState<string>('');

  const filteredAvatars = useMemo(() => {
    return KRONO_AVATARS.filter((av) => {
      const matchesCategory = avatarCategoryFilter === 'todos' || av.category === avatarCategoryFilter;
      const query = avatarSearchQuery.trim().toLowerCase();
      const matchesSearch = !query || 
        av.name.toLowerCase().includes(query) || 
        av.tagline.toLowerCase().includes(query) ||
        av.categoryLabel.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [avatarCategoryFilter, avatarSearchQuery]);

  // List filter state for students: 'todas' | 'a_fazer' | 'a_corrigir' | 'corrigidas'
  const [studentFilter, setStudentFilter] = useState<'todas' | 'a_fazer' | 'a_corrigir' | 'corrigidas'>('todas');
  const [studentSearchQuery, setStudentSearchQuery] = useState<string>('');
  const [studentTypeFilter, setStudentTypeFilter] = useState<string>('todos');
  const [isStudentFilterOpen, setIsStudentFilterOpen] = useState<boolean>(false);
  // Selected Activity for detail/execution view (null = show list view)
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);

  // Fullscreen / Immersive Mode for PNE Severe Playful Activities
  const [fullscreenGameActivityId, setFullscreenGameActivityId] = useState<string | null>(null);

  // KronoGames Active Game Activity
  const [activeKronoGameActivity, setActiveKronoGameActivity] = useState<Activity | null>(null);
  const [isAchievementsModalOpen, setIsAchievementsModalOpen] = useState<boolean>(false);

  // Interactive student answers per activity com persistência de rascunhos no dispositivo
  const [essayInputs, setEssayInputs] = useState<{ [activityId: string]: string }>(() => {
    if (typeof window !== 'undefined' && student?.id) {
      try {
        const saved = localStorage.getItem(`krono_drafts_${student.id}`);
        if (saved) return JSON.parse(saved);
      } catch (e) {}
    }
    return {};
  });

  const handleEssayChange = (actId: string, val: string) => {
    setEssayInputs((prev) => {
      const next = { ...prev, [actId]: val };
      if (typeof window !== 'undefined' && student?.id) {
        try {
          localStorage.setItem(`krono_drafts_${student.id}`, JSON.stringify(next));
        } catch (e) {}
      }
      return next;
    });
  };

  // objectiveInputs[activityId][questionId] -> optionIndex (0, 1, 2, 3) com persistência local de rascunhos
  const [objectiveInputs, setObjectiveInputs] = useState<{ [activityId: string]: { [questionId: string]: number } }>(() => {
    if (typeof window !== 'undefined' && student?.id) {
      try {
        const saved = localStorage.getItem(`krono_obj_drafts_${student.id}`);
        if (saved) return JSON.parse(saved);
      } catch (e) {}
    }
    return {};
  });

  // Modal de confirmação caso o aluno tente enviar com questões em branco
  const [unansweredConfirmData, setUnansweredConfirmData] = useState<{
    activity: Activity;
    unansweredCount: number;
    totalCount: number;
  } | null>(null);
  
  // Group selection state for group activities
  const [groupSelections, setGroupSelections] = useState<{ [activityId: string]: string[] }>({});
  const [customMemberInput, setCustomMemberInput] = useState<{ [activityId: string]: string }>({});

  // Filter classmates in the same turma for group selection
  const classmates = useMemo(() => {
    return students.filter(
      (s) => s.turma === student.turma && s.id !== student.id
    );
  }, [students, student.turma, student.id]);

  // Check if current logged-in student has PNE status
  const isCurrentStudentPNE = useMemo(() => isStudentPNE(student), [student]);

  // Filter activities authorized for this student
  // "Mostre as atividades adaptadas somente para alunos PNE."
  // Filter activities authorized for this student
  // "Aluno PNE não vê atividade de aluno regular, só adaptações, 2 professor também só vê PNE."
  const authorizedActivities = useMemo(() => {
    return activities.filter((a) => {
      // 1. Turma permission check
      if (!canStudentAccessActivity(a.turma, student.turma)) {
        return false;
      }

      // 2. Trava de Recuperação Paralela para quem entregou a primeira atividade e tirou >= 6.0
      const isRecoveryAct = Boolean(
        a.isRecovery || a.type === 'Recuperação Paralela' || a.recoveryFromId
      );
      if (isRecoveryAct) {
        const isManuallyAuthorized = Boolean(
          a.authorizedRecoveryStudentIds?.includes(student.id) ||
            (student.matricula && a.authorizedRecoveryStudentIds?.includes(student.matricula)) ||
            student.authorizedRecoveryActivityIds?.includes(a.id)
        );

        if (!isManuallyAuthorized) {
          const parentAct =
            activities.find((p) => p.id === a.recoveryFromId) ||
            activities.find(
              (p) =>
                !p.isRecovery &&
                p.type !== 'Recuperação Paralela' &&
                p.turma === a.turma &&
                p.id !== a.id
            );
          const parentSub = parentAct?.submissions?.find(
            (s) =>
              s.studentId === student.id ||
              (Boolean(student.matricula) && s.matricula === student.matricula) ||
              s.studentName?.toLowerCase() === student.fullName?.toLowerCase()
          );

          if (parentSub) {
            const parentGrade =
              (Number(parentSub.objectiveScore) || 0) +
              (Number(parentSub.essayScore) || 0) +
              (Number(parentSub.extraPoints) || 0);
            if (parentGrade >= 6.0) {
              return false;
            }
          }
        }
      }

      const isActAdapted = isActivityAdapted(a);

      // Aluno PNE: por padrão vê adaptações, exceto se incluído na atividade normal por proficiência
      if (isCurrentStudentPNE) {
        const isStudentIncludedInActivity = (actToCheck?: Activity) => {
          if (!actToCheck || !actToCheck.includedPneStudentIds || actToCheck.includedPneStudentIds.length === 0) return false;
          const ids = actToCheck.includedPneStudentIds;
          return (
            ids.includes(student.id) ||
            (Boolean(student.matricula) && ids.includes(student.matricula)) ||
            (Boolean(student.fullName) && ids.includes(student.fullName))
          );
        };

        if (isActAdapted) {
          const parentAct = activities.find((parent) => parent.id === a.adaptedFromId);
          if (isStudentIncludedInActivity(parentAct)) {
            return false;
          }
          return true;
        } else {
          return isStudentIncludedInActivity(a);
        }
      }

      // Aluno regular só vê atividades regulares (não vê adaptações)
      return !isActAdapted;
    });
  }, [activities, student.turma, student.id, student.matricula, student.fullName, student.authorizedRecoveryActivityIds, isCurrentStudentPNE]);

  // Métricas pedagógicas e de progresso do aluno no portal
  const studentMetrics = useMemo(() => {
    let completed = 0;
    let pendingCorrection = 0;
    let pendingTodo = 0;
    let totalScore = 0;
    let gradedCount = 0;

    authorizedActivities.forEach((act) => {
      const sub = act.submissions?.find(
        (s) =>
          s.studentId === student.id ||
          (Boolean(student.matricula) && s.matricula === student.matricula) ||
          s.studentName?.toLowerCase() === student.fullName?.toLowerCase()
      );

      if (!sub) {
        pendingTodo++;
      } else if (sub.status === 'graded') {
        completed++;
        const obj = Number(sub.objectiveScore) || 0;
        const ess = Number(sub.essayScore) || 0;
        const ext = Number(sub.extraPoints) || 0;
        totalScore += (obj + ess + ext);
        gradedCount++;
      } else if (sub.status === 'pending') {
        pendingCorrection++;
      } else if (sub.status === 'returned') {
        pendingTodo++;
      }
    });

    const averageGrade = gradedCount > 0 ? (totalScore / gradedCount).toFixed(1) : '-';
    const total = authorizedActivities.length;
    const progressPercent = total > 0 ? Math.round(((completed + pendingCorrection) / total) * 100) : 0;

    return {
      completed,
      pendingCorrection,
      pendingTodo,
      averageGrade,
      progressPercent,
      total,
    };
  }, [authorizedActivities, student.id, student.matricula, student.fullName]);

  // Helper para formatar apenas "Redação AV1", "Simulado AV2", "RP1"
  const getShortActivityTitle = (act: Activity) => {
    const isRec = Boolean(act.isRecovery || act.type === 'Recuperação Paralela' || act.recoveryFromId);
    if (isRec) {
      const recList = authorizedActivities.filter(
        (a) => a.isRecovery || a.type === 'Recuperação Paralela' || Boolean(a.recoveryFromId)
      );
      const idx = recList.findIndex((a) => a.id === act.id);
      return `RP${idx >= 0 ? idx + 1 : 1}`;
    }
    const regList = authorizedActivities.filter(
      (a) => !a.isRecovery && a.type !== 'Recuperação Paralela' && !a.recoveryFromId
    );
    const idx = regList.findIndex((a) => a.id === act.id);
    const num = idx >= 0 ? idx + 1 : 1;
    const mode =
      act.isGameActivity || act.gameData || act.type === 'Jogo Avaliativo'
        ? 'KronoGame'
        : act.type || 'Avaliação';
    return `${mode} AV${num}`;
  };

  // 15 Conquistas e Desafios de Engajamento com 5 Níveis
  const studentAchievements = useMemo(() => {
    const totalDelivered = studentMetrics.completed + studentMetrics.pendingCorrection;
    const avg = Number(studentMetrics.averageGrade) || 0;

    const hasEssay = authorizedActivities.some((act) => {
      const sub = act.submissions?.find((s) => s.studentId === student.id || s.matricula === student.matricula);
      return Boolean(sub?.essayAnswer && sub.essayAnswer.trim().length > 20);
    });
    const hasObjectiveHit = authorizedActivities.some((act) => {
      const sub = act.submissions?.find((s) => s.studentId === student.id || s.matricula === student.matricula);
      return (Number(sub?.objectiveScore) || 0) > 0;
    });
    const hasPlayedGame = authorizedActivities.some((act) => {
      if (!act.isGameActivity && act.type !== 'Jogo Avaliativo' && !act.playfulGameHtml) return false;
      const sub = act.submissions?.find((s) => s.studentId === student.id || s.matricula === student.matricula);
      return Boolean(sub);
    });
    const hasGroupWork = authorizedActivities.some((act) => {
      const sub = act.submissions?.find((s) => s.studentId === student.id || s.matricula === student.matricula);
      return Boolean(sub?.groupMembers);
    });
    const hasMaxGrade = authorizedActivities.some((act) => {
      const sub = act.submissions?.find((s) => s.studentId === student.id || s.matricula === student.matricula);
      if (sub?.status !== 'graded') return false;
      const total = (Number(sub.objectiveScore) || 0) + (Number(sub.essayScore) || 0) + (Number(sub.extraPoints) || 0);
      return total >= 9.5;
    });
    const hasZeroFocusLoss = totalDelivered > 0;
    const allCompleted = studentMetrics.total > 0 && totalDelivered >= studentMetrics.total;

    const list = [
      { id: 'c1', title: '1. Primeiro Passo', desc: 'Entregou sua 1ª atividade.', iconEmoji: '🚀', unlocked: totalDelivered >= 1, category: 'Nível 1 • Bronze' },
      { id: 'c2', title: '2. Voz Autoral', desc: 'Enviou uma produção dissertativa.', iconEmoji: '✍️', unlocked: hasEssay, category: 'Nível 1 • Bronze' },
      { id: 'c3', title: '3. Mira Certeira', desc: 'Pontuou em questões objetivas.', iconEmoji: '🎯', unlocked: hasObjectiveHit, category: 'Nível 1 • Bronze' },
      { id: 'c4', title: '4. Estreia KronoGames', desc: 'Concluiu seu 1º jogo avaliativo.', iconEmoji: '🎮', unlocked: hasPlayedGame, category: 'Nível 2 • Prata' },
      { id: 'c5', title: '5. Aliança Coletiva', desc: 'Realizou uma missão em dupla ou grupo.', iconEmoji: '🤝', unlocked: hasGroupWork, category: 'Nível 2 • Prata' },
      { id: 'c6', title: '6. Ritmo Duplo', desc: 'Entregou 2 avaliações na disciplina.', iconEmoji: '⚡', unlocked: totalDelivered >= 2, category: 'Nível 2 • Prata' },
      { id: 'c7', title: '7. Trinca Sociológica', desc: 'Concluiu 3 atividades avaliadas.', iconEmoji: '📚', unlocked: studentMetrics.completed >= 3, category: 'Nível 3 • Ouro' },
      { id: 'c8', title: '8. Escudo Anti-Cola', desc: 'Realizou avaliações respeitando as regras de foco.', iconEmoji: '🛡️', unlocked: hasZeroFocusLoss, category: 'Nível 3 • Ouro' },
      { id: 'c9', title: '9. Acima da Média', desc: 'Alcançou média geral igual ou maior que 7.0.', iconEmoji: '📈', unlocked: avg >= 7.0, category: 'Nível 3 • Ouro' },
      { id: 'c10', title: '10. Veterano de Campo', desc: 'Entregou 4 ou mais avaliações.', iconEmoji: '🏅', unlocked: totalDelivered >= 4, category: 'Nível 4 • Diamante' },
      { id: 'c11', title: '11. Alta Performance', desc: 'Manteve média geral igual ou superior a 8.0.', iconEmoji: '💎', unlocked: avg >= 8.0, category: 'Nível 4 • Diamante' },
      { id: 'c12', title: '12. Gabarito / Nota 10', desc: 'Conquistou nota 9.5 a 10 em uma avaliação.', iconEmoji: '⭐', unlocked: hasMaxGrade, category: 'Nível 4 • Diamante' },
      { id: 'c13', title: '13. Maratona Completa', desc: 'Entregou 5 ou mais atividades no trimestre.', iconEmoji: '🔥', unlocked: totalDelivered >= 5, category: 'Nível 5 • Lendário' },
      { id: 'c14', title: '14. Invicto na Turma', desc: 'Concluiu 100% das avaliações ativas.', iconEmoji: '👑', unlocked: allCompleted, category: 'Nível 5 • Lendário' },
      { id: 'c15', title: '15. Mestre Dialético', desc: 'Manteve média de excelência acima de 9.0.', iconEmoji: '🏆', unlocked: avg >= 9.0, category: 'Nível 5 • Lendário' },
    ];
    return list;
  }, [authorizedActivities, student.id, student.matricula, studentMetrics]);

  // Próxima atividade pendente com prazo mais urgente para alerta amigável
  const nextUrgentActivity = useMemo(() => {
    const pendingList = authorizedActivities.filter((act) => {
      const sub = act.submissions?.find((s) => s.studentId === student.id || s.matricula === student.matricula);
      return !sub || sub.status === 'returned';
    });
    if (pendingList.length === 0) return null;
    return pendingList[0];
  }, [authorizedActivities, student.id, student.matricula]);

  // Toast / Submission feedback
  const [submissionSuccessMsg, setSubmissionSuccessMsg] = useState<string | null>(null);

  // Playful Game Scores from iframe postMessage: { [activityId: string]: { score: number; maxScore: number; grade: number } }
  const [playfulScores, setPlayfulScores] = useState<{ [activityId: string]: { score: number; maxScore: number; grade: number } }>({});

  useEffect(() => {
    const handleGameMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'PLAYFUL_GAME_COMPLETED') {
        const { score = 10, maxScore = 10, finalGrade, activityId } = event.data;
        const calcGrade = finalGrade !== undefined ? Number(finalGrade) : (Number(score) / (Number(maxScore) || 1)) * 10;
        
        // Find which playful activity this applies to
        const act = authorizedActivities.find(
          (a) => (activityId && a.id === activityId) || (selectedActivityId && a.id === selectedActivityId) || (fullscreenGameActivityId && a.id === fullscreenGameActivityId) || a.playfulGameHtml || a.adaptationType === 'severe_playful'
        );

        if (act) {
          const maxG = act.maxGrade || Number(maxScore) || 10;
          const recordedScore = Number(calcGrade.toFixed(1));

          setPlayfulScores((prev) => ({
            ...prev,
            [act.id]: { score: Number(score), maxScore: Number(maxScore), grade: recordedScore },
          }));

          // Finalizar e enviar para persistência no banco e fila de correção
          onSubmitAnswer(
            act.id,
            student.id,
            '🎮 Atividade Lúdica Interativa concluída com sucesso no jogo educacional.',
            recordedScore,
            maxG,
            0,
            {},
            undefined
          );

          setSubmissionSuccessMsg(`🎉 Atividade Finalizada e Enviada! Nota conquistada: ${recordedScore} / ${maxG} pts.`);
          scrollToTop();
          setTimeout(() => setSubmissionSuccessMsg(null), 6000);

          // Fechar a atividade e retornar à lista inicial com filtros
          setSelectedActivityId(null);
          setFullscreenGameActivityId(null);
          setStudentFilter('a_corrigir');
          setActiveTab('atividades');
        }
      }
    };

    window.addEventListener('message', handleGameMessage);
    return () => window.removeEventListener('message', handleGameMessage);
  }, [authorizedActivities, selectedActivityId, fullscreenGameActivityId, student.id, onSubmitAnswer]);

  // Anti-Cola Focus Lock Warning State per activity: { [activityId: string]: number }
  const [focusWarnings, setFocusWarnings] = useState<{ [activityId: string]: number }>({});
  // Security Modal Notification State: { activityTitle: string; warningCount: number; isAutoSubmitted?: boolean } | null
  const [securityNotice, setSecurityNotice] = useState<{ activityTitle: string; warningCount: number; isAutoSubmitted?: boolean } | null>(null);
  // Security Toast Message for blocked Copy/Paste actions
  const [securityToast, setSecurityToast] = useState<string | null>(null);

  const [isScreenshotShieldActive, setIsScreenshotShieldActive] = useState(false);

  const showSecurityToast = (msg: string) => {
    setSecurityToast(msg);
    setTimeout(() => {
      setSecurityToast((current) => (current === msg ? null : current));
    }, 4000);
  };

  // Trava Anti-Print de Tela (PrintScreen, Win+Shift+S, Cmd+Shift+3/4/5 e Ctrl+P)
  useEffect(() => {
    if (!selectedActivityId) return;

    const triggerScreenshotBlock = (reason: string) => {
      setIsScreenshotShieldActive(true);
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        navigator.clipboard.writeText('🚫 Captura de tela bloqueada pelo sistema KronoMestre.').catch(() => {});
      }
      showSecurityToast(`🚫 ${reason}`);
      setTimeout(() => {
        setIsScreenshotShieldActive(false);
      }, 3500);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const isPrintScreen = e.key === 'PrintScreen' || e.keyCode === 44;
      const isMacShot = e.metaKey && e.shiftKey && ['3', '4', '5', 's', 'S'].includes(e.key);
      const isWinSnip = (e.metaKey || e.ctrlKey) && e.shiftKey && ['s', 'S'].includes(e.key);
      const isCtrlP = (e.ctrlKey || e.metaKey) && ['p', 'P'].includes(e.key);

      if (isPrintScreen || isMacShot || isWinSnip || isCtrlP) {
        e.preventDefault();
        e.stopPropagation();
        triggerScreenshotBlock('Captura ou impressão de tela bloqueada! A tentativa foi registrada.');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen' || e.keyCode === 44) {
        e.preventDefault();
        triggerScreenshotBlock('Print de tela bloqueado! Área de transferência limpa pelo sistema.');
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
    };
  }, [selectedActivityId]);

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
      // 1. Busca textual
      if (studentSearchQuery.trim()) {
        const q = studentSearchQuery.toLowerCase().trim();
        const matchesTitle = act.title?.toLowerCase().includes(q);
        const matchesSubject = act.subject?.toLowerCase().includes(q);
        const matchesTopic = act.topic?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesSubject && !matchesTopic) return false;
      }

      // 2. Filtro por tipo
      if (studentTypeFilter !== 'todos') {
        if (studentTypeFilter === 'kronogames') {
          if (!act.isGameActivity && !act.gameData && act.type !== 'Jogo Avaliativo') return false;
        } else if (act.type?.toLowerCase() !== studentTypeFilter.toLowerCase()) {
          return false;
        }
      }

      // 3. Filtro por situação de entrega
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
  }, [authorizedActivities, student.id, student.fullName, studentFilter, studentSearchQuery, studentTypeFilter]);

  const activeStudentFiltersCount = useMemo(() => {
    let count = 0;
    if (studentSearchQuery.trim()) count++;
    if (studentTypeFilter !== 'todos') count++;
    if (studentFilter !== 'todas') count++;
    return count;
  }, [studentSearchQuery, studentTypeFilter, studentFilter]);

  const handleClearStudentFilters = () => {
    setStudentSearchQuery('');
    setStudentTypeFilter('todos');
    setStudentFilter('todas');
  };

  // Filter library files for this student's turma
  const studentLibraryFiles = useMemo(() => {
    return libraryFiles.filter((file) =>
      !file.turma || file.turma === 'branco' || file.turma === 'Todas' || canStudentAccessActivity(file.turma, student.turma)
    );
  }, [libraryFiles, student.turma]);

  const handleSelectOption = (activityId: string, questionId: string, optionIndex: number) => {
    setObjectiveInputs((prev) => {
      const next = {
        ...prev,
        [activityId]: {
          ...(prev[activityId] || {}),
          [questionId]: optionIndex,
        },
      };
      if (typeof window !== 'undefined' && student?.id) {
        try {
          localStorage.setItem(`krono_obj_drafts_${student.id}`, JSON.stringify(next));
        } catch (e) {}
      }
      return next;
    });
  };

  const handleFinishKronoGame = (score: number, groupMembersStr?: string) => {
    if (!activeKronoGameActivity) return;
    const act = activeKronoGameActivity;
    const maxScore = act.maxGrade || 10;

    onSubmitAnswer(
      act.id,
      student.id,
      '🎮 KronoGames: Partida avaliativa concluída com sucesso no motor de jogos.',
      score,
      maxScore,
      0,
      {},
      groupMembersStr
    );

    setSubmissionSuccessMsg(
      `🎉 Parabéns! Sua equipe concluiu o desafio KronoGames conquistando nota ${score.toFixed(1)} / ${maxScore.toFixed(1)} pts!`
    );
    scrollToTop();
    setTimeout(() => setSubmissionSuccessMsg(null), 7000);

    setActiveKronoGameActivity(null);
    setSelectedActivityId(null);
    setStudentFilter('corrigidas');
    setActiveTab('atividades');
  };

  const handleSubmit = (act: Activity, isAutoSubmit: boolean = false, bypassUnansweredCheck: boolean = false) => {
    // 1. Playful Game submission (Síndromes Severas)
    if (act.playfulGameHtml || act.adaptationType === 'severe_playful') {
      const gameData = playfulScores[act.id];
      const maxScore = act.maxGrade || 10;
      const finalScore = gameData ? gameData.grade : maxScore;

      onSubmitAnswer(
        act.id,
        student.id,
        '🎮 Atividade Lúdica Interativa concluída com sucesso no jogo educacional.',
        Number(finalScore.toFixed(1)),
        maxScore,
        0,
        {},
        undefined
      );

      setSubmissionSuccessMsg(`🎉 Parabéns! Você concluiu a atividade lúdica e conquistou ${finalScore.toFixed(1)} / ${maxScore} pts!`);
      scrollToTop();
      setTimeout(() => setSubmissionSuccessMsg(null), 6000);

      // Fechar visualização da atividade e retornar à lista inicial com filtros
      setFocusWarnings((prev) => ({ ...prev, [act.id]: 0 }));
      setSelectedActivityId(null);
      setFullscreenGameActivityId(null);
      setStudentFilter('a_corrigir');
      setActiveTab('atividades');
      return;
    }

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
      showSecurityToast('⚠️ Por favor, escreva sua resposta dissertativa antes de enviar a atividade.');
      return;
    }

    // Calculate objective score immediately (sai na hora)
    let correctCount = 0;
    const studentChoices = objectiveInputs[act.id] || {};

    // Checagem amigável de questões objetivas não assinaladas (evita envio em branco por engano)
    const unansweredCount = objectiveQuestions.filter((q) => studentChoices[q.id] === undefined).length;
    if (!isAutoSubmit && !bypassUnansweredCheck && objectiveQuestions.length > 0 && unansweredCount > 0) {
      setUnansweredConfirmData({
        activity: act,
        unansweredCount,
        totalCount: objectiveQuestions.length,
      });
      return;
    }

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
    scrollToTop();
    setTimeout(() => setSubmissionSuccessMsg(null), 6000);

    // Reset focus warnings for this activity on submit
    setFocusWarnings((prev) => ({ ...prev, [act.id]: 0 }));

    // Limpa os rascunhos salvos desta atividade após entrega (dissertativo e objetivos)
    if (typeof window !== 'undefined' && student?.id) {
      try {
        const saved = localStorage.getItem(`krono_drafts_${student.id}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          delete parsed[act.id];
          localStorage.setItem(`krono_drafts_${student.id}`, JSON.stringify(parsed));
        }
        const savedObj = localStorage.getItem(`krono_obj_drafts_${student.id}`);
        if (savedObj) {
          const parsedObj = JSON.parse(savedObj);
          delete parsedObj[act.id];
          localStorage.setItem(`krono_obj_drafts_${student.id}`, JSON.stringify(parsedObj));
        }
      } catch (e) {}
    }

    // Close detail view and switch to "A Corrigir" list filter
    setSelectedActivityId(null);
    setFullscreenGameActivityId(null);
    setUnansweredConfirmData(null);
    setStudentFilter('a_corrigir');
    setActiveTab('atividades');
  };

  const handleOpenActivity = (actId: string) => {
    setSelectedActivityId(actId);
    scrollToTop();
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

  // Presença real do aluno em tempo real (ativação sem dados fantasmas)
  useEffect(() => {
    if (!student?.id || !student?.ownerTeacherId) return;

    const sendPing = (action: 'ping' | 'offline' = 'ping') => {
      try {
        if (action === 'offline' && typeof navigator !== 'undefined' && navigator.sendBeacon) {
          const blob = new Blob(
            [JSON.stringify({ studentId: student.id, ownerTeacherId: student.ownerTeacherId, action: 'offline' })],
            { type: 'application/json' }
          );
          navigator.sendBeacon('/api/students/heartbeat', blob);
          return;
        }

        fetch('/api/students/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId: student.id,
            ownerTeacherId: student.ownerTeacherId,
            action,
          }),
        }).catch(() => {});
      } catch (e) {}
    };

    sendPing('ping');

    // Ping leve a cada 4 minutos para manter status ativo enquanto o aluno estiver no portal
    const interval = setInterval(() => {
      sendPing('ping');
    }, 4 * 60 * 1000);

    const handleBeforeUnload = () => {
      sendPing('offline');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      sendPing('offline');
    };
  }, [student?.id, student?.ownerTeacherId]);

  return (
    <div className="min-h-screen bg-background text-foreground p-3 sm:p-8 max-w-5xl mx-auto space-y-6 sm:space-y-8 animate-fadeIn">
      {/* Top Banner */}
      <div className="glass-panel p-4 sm:p-8 rounded-3xl border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 shadow-xl">
        <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0">
          <div className="relative group cursor-pointer shrink-0" onClick={() => setIsAvatarModalOpen(true)}>
            <img
              src={student.avatarUrl}
              alt={student.fullName}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-primary shadow-md transition-all group-hover:brightness-50"
            />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <PenTool className="w-5 h-5 text-foreground" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="text-[10px] sm:text-xs font-bold text-primary uppercase tracking-wider bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
                Portal do Aluno
              </span>
              <span className="text-[11px] sm:text-xs font-semibold text-muted">{teacher?.subject || 'Disciplinas'}</span>
            </div>
            <h1 className="text-xl sm:text-3xl font-extrabold text-foreground mt-1 truncate">
              {student.fullName}
            </h1>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-muted mt-1.5">
              <span className="bg-[#171f33] px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full border border-border text-foreground font-semibold text-[11px] sm:text-xs">
                Turma: {student.turma}
              </span>
              <span className="text-[11px] sm:text-xs">Matrícula: {student.matricula}</span>
              {student.tag && (
                <span className="bg-primary/20 text-primary px-2 py-0.5 rounded-md font-bold text-[10px]">
                  {student.tag}
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            if (student?.id && student?.ownerTeacherId) {
              fetch('/api/students/heartbeat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  studentId: student.id,
                  ownerTeacherId: student.ownerTeacherId,
                  action: 'offline',
                }),
              }).catch(() => {});
            }
            onLogout();
          }}
          className="w-full sm:w-auto justify-center py-2.5 px-5 min-h-[44px] min-w-[44px] bg-[#171f33] hover:bg-rose-100 text-rose-600 hover:text-rose-200 rounded-full text-xs font-bold border border-border flex items-center gap-2 transition-all cursor-pointer shrink-0"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Sair da Conta</span>
        </button>
      </div>

      {/* Painel de Rendimento & Conquistas Pedagógicas do Estudante */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          <div className="bg-surface p-3.5 sm:p-4 rounded-2xl border border-border text-left shadow-sm">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
              A Fazer
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl sm:text-2xl font-black text-amber-500">{studentMetrics.pendingTodo}</span>
              <span className="text-[10px] text-muted">missões</span>
            </div>
          </div>

          <div className="bg-surface p-3.5 sm:p-4 rounded-2xl border border-border text-left shadow-sm">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
              Em Correção
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl sm:text-2xl font-black text-primary">{studentMetrics.pendingCorrection}</span>
              <span className="text-[10px] text-muted">enviadas</span>
            </div>
          </div>

          <div className="bg-surface p-3.5 sm:p-4 rounded-2xl border border-border text-left shadow-sm">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
              Concluídas
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl sm:text-2xl font-black text-emerald-500">{studentMetrics.completed}</span>
              <span className="text-[10px] text-muted">avaliadas</span>
            </div>
          </div>

          <div className="bg-surface p-3.5 sm:p-4 rounded-2xl border border-border text-left shadow-sm">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
              Média Geral
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl sm:text-2xl font-black text-foreground">{studentMetrics.averageGrade}</span>
              <span className="text-[10px] text-muted">/ 10.0</span>
            </div>
          </div>
        </div>

        {/* Barra de Progresso Geral da Turma & Conquistas */}
        <div className="space-y-2.5">
          {studentMetrics.total > 0 && (
            <div className="bg-surface/80 p-3 sm:px-4 sm:py-2.5 rounded-2xl border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center justify-between sm:justify-start gap-2 text-muted font-medium">
                <div className="flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Missões:</span>
                  <strong className="text-foreground">{studentMetrics.completed + studentMetrics.pendingCorrection} de {studentMetrics.total} entregues</strong>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAchievementsModalOpen(true)}
                  className="sm:hidden px-2.5 py-1 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 text-amber-300 border border-amber-400/30 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition active:scale-95"
                >
                  <span>🏆 Conquistas ({studentAchievements.filter((a) => a.unlocked).length}/{studentAchievements.length})</span>
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 flex-1 sm:w-48">
                  <div className="flex-1 h-2 bg-background rounded-full overflow-hidden border border-border">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-emerald-400 transition-all duration-500 rounded-full"
                      style={{ width: `${studentMetrics.progressPercent}%` }}
                    />
                  </div>
                  <span className="font-mono font-bold text-xs text-primary shrink-0">{studentMetrics.progressPercent}%</span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAchievementsModalOpen(true)}
                  className="hidden sm:flex px-3 py-1 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 text-amber-300 border border-amber-400/30 text-xs font-bold items-center gap-1.5 cursor-pointer transition active:scale-95 shrink-0"
                >
                  <span>🏆 Conquistas ({studentAchievements.filter((a) => a.unlocked).length}/{studentAchievements.length})</span>
                </button>
              </div>
            </div>
          )}

          {/* Alerta Amigável da Próxima Missão Prioritária */}
          {nextUrgentActivity && (
            <div className="bg-primary/10 border border-primary/25 rounded-2xl p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-fadeIn shadow-sm">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-8 h-8 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shrink-0 text-sm">
                  ⏰
                </span>
                <div className="min-w-0">
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-primary block">
                    Próxima Missão a Entregar
                  </span>
                  <p className="font-bold text-foreground truncate mt-0.5">
                    {nextUrgentActivity.title}
                  </p>
                  <span className="text-[11px] text-muted">
                    Prazo registrado: <strong className="text-foreground">{nextUrgentActivity.deadline || 'Em andamento'}</strong>
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleOpenActivity(nextUrgentActivity.id)}
                className="py-2 px-4 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs transition cursor-pointer self-start sm:self-center shrink-0 shadow-md shadow-primary/20 active:scale-95"
              >
                Fazer Agora
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Toast Banner on Submission */}
      {submissionSuccessMsg && (
        <div className="p-4 bg-primary/20 border border-primary/40 rounded-2xl text-xs text-primary font-bold flex items-center gap-3 shadow-lg animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{submissionSuccessMsg}</span>
        </div>
      )}

      {/* Main Abas Navigation */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-surface p-1.5 rounded-2xl border border-border shadow-inner">
        <button
          onClick={() => {
            setActiveTab('atividades');
            setSelectedActivityId(null);
          }}
          className={`py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer min-h-[44px] min-w-[44px] active:scale-95 ${
            activeTab === 'atividades'
              ? 'bg-gradient-to-r from-[#4ade80] to-[#22c55e] text-white shadow-md font-extrabold'
              : 'text-muted hover:text-foreground hover:bg-surface-hover'
          }`}
        >
          <FileText className="w-4 h-4 shrink-0" />
          <span>Atividades e Missões</span>
          {authorizedActivities.length > 0 && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold shrink-0 ${
                activeTab === 'atividades'
                  ? 'bg-[#003919] text-primary'
                  : 'bg-[#171f33] text-foreground border border-border'
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
          className={`py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer min-h-[44px] min-w-[44px] active:scale-95 ${
            activeTab === 'mensagens'
              ? 'bg-gradient-to-r from-[#4ade80] to-[#22c55e] text-white shadow-md font-extrabold'
              : 'text-muted hover:text-foreground hover:bg-surface-hover'
          }`}
        >
          <MessageSquare className="w-4 h-4 shrink-0" />
          <span>Mensagens com o Professor</span>
          {messages.filter(m => (m.threadId === student.id || m.recipientId === student.id) && m.senderRole === 'teacher' && !m.read).length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold shrink-0 bg-primary text-white">
              {messages.filter(m => (m.threadId === student.id || m.recipientId === student.id) && m.senderRole === 'teacher' && !m.read).length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('arquivos')}
          className={`py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer min-h-[44px] min-w-[44px] active:scale-95 ${
            activeTab === 'arquivos'
              ? 'bg-gradient-to-r from-[#4ade80] to-[#22c55e] text-white shadow-md font-extrabold'
              : 'text-muted hover:text-foreground hover:bg-surface-hover'
          }`}
        >
          <FolderDown className="w-4 h-4 shrink-0" />
          <span>Arquivos (Drive)</span>
          {studentLibraryFiles.length > 0 && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold shrink-0 ${
                activeTab === 'arquivos'
                  ? 'bg-[#003919] text-primary'
                  : 'bg-[#171f33] text-muted'
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
          {/* Sub-filter bar for Student Activities com Botão de Acesso a Filtros */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            {/* Quick status tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-surface rounded-2xl border border-border shadow-inner flex-1">
              <button
                type="button"
                onClick={() => {
                  setStudentFilter('todas');
                  setSelectedActivityId(null);
                }}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                  studentFilter === 'todas'
                    ? 'bg-gradient-to-r from-[#4ade80] to-[#22c55e] text-white shadow-md font-extrabold'
                    : 'text-muted hover:text-foreground hover:bg-surface-hover'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Todas</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black shrink-0 ${studentFilter === 'todas' ? 'bg-[#003919] text-primary' : 'bg-black/30 text-foreground'}`}>
                  {authorizedActivities.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setStudentFilter('a_fazer');
                  setSelectedActivityId(null);
                }}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                  studentFilter === 'a_fazer'
                    ? 'bg-gradient-to-r from-[#4ade80] to-[#22c55e] text-white shadow-md font-extrabold'
                    : 'text-muted hover:text-foreground hover:bg-surface-hover'
                }`}
              >
                <FileQuestion className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">A Fazer</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black shrink-0 ${studentFilter === 'a_fazer' ? 'bg-[#003919] text-primary' : 'bg-black/30 text-foreground'}`}>
                  {pendingActivities.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setStudentFilter('a_corrigir');
                  setSelectedActivityId(null);
                }}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                  studentFilter === 'a_corrigir'
                    ? 'bg-gradient-to-r from-[#4ade80] to-[#22c55e] text-white shadow-md font-extrabold'
                    : 'text-muted hover:text-foreground hover:bg-surface-hover'
                }`}
              >
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">A Corrigir</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black shrink-0 ${studentFilter === 'a_corrigir' ? 'bg-[#003919] text-primary' : 'bg-black/30 text-foreground'}`}>
                  {toCorrectActivities.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setStudentFilter('corrigidas');
                  setSelectedActivityId(null);
                }}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                  studentFilter === 'corrigidas'
                    ? 'bg-gradient-to-r from-[#4ade80] to-[#22c55e] text-white shadow-md font-extrabold'
                    : 'text-muted hover:text-foreground hover:bg-surface-hover'
                }`}
              >
                <Award className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Corrigidas</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black shrink-0 ${studentFilter === 'corrigidas' ? 'bg-[#003919] text-primary' : 'bg-black/30 text-foreground'}`}>
                  {gradedActivities.length}
                </span>
              </button>
            </div>

            {/* BOTÃO DE ACESSO A FILTROS (ALUNO) */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsStudentFilterOpen((prev) => !prev)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border min-h-[44px] ${
                  isStudentFilterOpen || activeStudentFiltersCount > 0
                    ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                    : 'bg-surface hover:bg-surface-hover text-foreground border-border'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4 shrink-0" />
                <span>Filtros</span>
                {activeStudentFiltersCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-white/20 text-white">
                    {activeStudentFiltersCount}
                  </span>
                )}
                {isStudentFilterOpen ? (
                  <ChevronUp className="w-3.5 h-3.5 shrink-0 opacity-80" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-80" />
                )}
              </button>

              {activeStudentFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={handleClearStudentFilters}
                  className="px-3 py-2.5 rounded-2xl text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 transition-all flex items-center justify-center gap-1 cursor-pointer min-h-[44px]"
                  title="Limpar todos os filtros"
                >
                  <X className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Limpar</span>
                </button>
              )}
            </div>
          </div>

          {/* PAINEL REFINADO DE FILTROS DO ALUNO (EXPANSÍVEL PELO BOTÃO) */}
          {isStudentFilterOpen && (
            <div className="glass-panel p-4 sm:p-5 rounded-3xl border border-primary/30 bg-surface/95 backdrop-blur-md shadow-xl space-y-3.5 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-border pb-2.5">
                <span className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Filtros e Busca de Missões</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsStudentFilterOpen(false)}
                  className="text-text-muted hover:text-foreground p-1 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Busca rápida */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                  <input
                    type="text"
                    value={studentSearchQuery}
                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                    placeholder="Buscar atividade por título ou disciplina..."
                    className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-background border border-border text-foreground placeholder-muted text-xs focus:outline-none focus:border-primary"
                  />
                  {studentSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setStudentSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filtro por Tipo */}
                <div>
                  <select
                    value={studentTypeFilter}
                    onChange={(e) => setStudentTypeFilter(e.target.value)}
                    className="w-full py-2.5 px-3 rounded-2xl bg-background border border-border text-foreground text-xs focus:outline-none focus:border-primary cursor-pointer font-medium"
                  >
                    <option value="todos">Todos os Formatos</option>
                    <option value="kronogames">🎮 KronoGames (Jogos Avaliativos)</option>
                    <option value="Avaliação">Avaliações Formais</option>
                    <option value="Redação">Redações</option>
                    <option value="Simulado">Simulados / Treinamentos</option>
                    <option value="Dinâmica">Dinâmicas / Trabalhos</option>
                  </select>
                </div>
              </div>

              {/* Footer do painel */}
              <div className="flex items-center justify-between pt-2 border-t border-border text-xs text-muted">
                <span>
                  Exibindo <strong>{filteredStudentActivities.length}</strong> de <strong>{authorizedActivities.length}</strong> missões.
                </span>
                <button
                  type="button"
                  onClick={() => setIsStudentFilterOpen(false)}
                  className="px-3.5 py-1.5 bg-primary/20 hover:bg-primary/30 text-primary font-bold rounded-xl text-xs transition-all cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          )}

          {/* LIST VIEW (when no activity is selected) */}
          {selectedActivityId === null && (
            <div className="space-y-4">
              {filteredStudentActivities.length === 0 ? (
                <div className="glass-panel p-12 text-center rounded-3xl border border-border text-muted space-y-3 shadow-xl">
                  <div className="w-16 h-16 bg-primary/10 border border-primary/30 rounded-2xl flex items-center justify-center mx-auto text-primary text-2xl font-black">
                    🍃
                  </div>
                  <p className="text-base font-extrabold text-foreground">Nenhuma Missão Encontrada neste Filtro!</p>
                  <p className="text-xs text-muted max-w-md mx-auto leading-relaxed">
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
                    const totalScore = sub && isGraded ? (sub.objectiveScore || 0) + (sub.essayScore || 0) : null;

                    return (
                      <div
                        key={act.id}
                        className="glass-panel p-4 sm:p-6 rounded-2xl border border-border hover:border-primary/40 transition-all space-y-3 sm:space-y-4 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="space-y-2 max-w-2xl min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                            <span className="text-[10px] sm:text-[11px] font-bold bg-primary/20 text-primary px-2.5 sm:px-3 py-0.5 rounded-full border border-primary/30">
                              {act.isGameActivity || act.gameData || act.type === 'Jogo Avaliativo'
                                ? '🎮 KronoGames'
                                : act.type === 'Simulado'
                                ? 'Treinamento Tático'
                                : act.type === 'Redação'
                                ? 'Redação'
                                : act.type === 'Dinâmica'
                                ? 'Treino em Equipe'
                                : act.type === 'Trabalho em grupo'
                                ? 'Trabalho em Grupo'
                                : act.type === 'Projeto de pesquisa'
                                ? 'Projeto de Pesquisa'
                                : 'Exame'}
                            </span>

                            <span className="text-[10px] sm:text-[11px] font-bold text-amber-600 flex items-center gap-1.5 bg-surface px-2.5 sm:px-3 py-0.5 rounded-full border border-amber-500/30">
                              <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span>Prazo: {act.deadline || 'Sem data'}</span>
                            </span>

                            {isPending && (
                              <span className="text-[10px] sm:text-[11px] font-extrabold bg-amber-100 text-amber-600 px-2.5 sm:px-3 py-0.5 rounded-full border border-amber-200">
                                📜 Pendente (A Fazer)
                              </span>
                            )}
                            {isToCorrect && (
                              <span className="text-[10px] sm:text-[11px] font-extrabold bg-sky-500/20 text-sky-300 px-2.5 sm:px-3 py-0.5 rounded-full border border-sky-500/40">
                                ⏳ A Corrigir pelo Professor
                              </span>
                            )}
                            {isGraded && (
                              <span className="text-[10px] sm:text-[11px] font-extrabold bg-emerald-100 text-emerald-600 px-2.5 sm:px-3 py-0.5 rounded-full border border-emerald-200">
                                ✅ Corrigida ({totalScore !== null ? totalScore.toFixed(1) : 0}/10)
                              </span>
                            )}
                          </div>

                          <h3 className="text-base sm:text-lg font-black text-foreground tracking-tight">
                            {getShortActivityTitle(act)}
                          </h3>
                        </div>

                        <div className="shrink-0 pt-1 sm:pt-0 w-full sm:w-auto">
                          <button
                            onClick={() => {
                              if (act.isGameActivity || act.gameData || act.type === 'Jogo Avaliativo') {
                                if (isPending) {
                                  setActiveKronoGameActivity(act);
                                } else {
                                  handleOpenActivity(act.id);
                                }
                              } else if (act.playfulGameHtml || act.adaptationType === 'severe_playful') {
                                setFullscreenGameActivityId(act.id);
                              } else {
                                handleOpenActivity(act.id);
                              }
                            }}
                            className="w-full sm:w-auto py-3 px-6 min-h-[44px] min-w-[44px] bg-primary hover:bg-primary-hover text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-primary/20 active:scale-95"
                          >
                            {isPending ? (
                              <>
                                <Gamepad2 className="w-4 h-4" />
                                <span>
                                  {act.isGameActivity || act.gameData || act.type === 'Jogo Avaliativo'
                                    ? 'Jogar KronoGame 🎮'
                                    : 'Fazer Atividade'}
                                </span>
                              </>
                            ) : (
                              <>
                                <Eye className="w-4 h-4" />
                                <span>Ver Nota / Detalhes</span>
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

          {/* DETAIL VIEW EM JANELA MODAL DEDICADA (TELA CHEIA NO CELULAR E PC) */}
          {selectedActivityId !== null && (
            <div className="fixed inset-0 z-50 bg-background overflow-y-auto p-3 sm:p-6 md:p-8 animate-fadeIn">
              <div className="max-w-4xl mx-auto space-y-6 pb-12">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-surface rounded-2xl border border-border shadow-md">
                <button
                  onClick={() => setSelectedActivityId(null)}
                  className="py-2.5 px-4 min-h-[44px] min-w-[44px] bg-surface-hover hover:bg-white/20 text-foreground font-bold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer border border-border active:scale-95 shrink-0 w-fit"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Voltar para Lista</span>
                </button>
                <div className="text-left sm:text-right min-w-0">
                  <span className="text-[10px] uppercase tracking-wider text-muted font-semibold block">
                    Atividade Selecionada
                  </span>
                  <span className="text-sm font-bold text-foreground truncate block">
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
                      className={`glass-panel p-6 sm:p-8 rounded-3xl border border-border space-y-6 shadow-xl relative overflow-hidden ${
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
                      <div className="bg-amber-100 border border-amber-200 p-4 rounded-2xl text-xs text-amber-200 flex items-start gap-3 shadow-lg">
                        <RotateCcw className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="font-extrabold text-amber-600 text-sm">
                            ⚠️ Atividade Devolvida pelo Professor para Refazer!
                          </p>
                          {sub.teacherFeedback ? (
                            <p className="text-foreground">
                              <strong>Orientações / Observações do Professor:</strong> &ldquo;{sub.teacherFeedback}&rdquo;
                            </p>
                          ) : (
                            <p className="text-muted">
                              Ajuste suas respostas e envie o pergaminho novamente para nova avaliação.
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Activity Top Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2">
                          <span className="text-[10px] sm:text-[11px] font-extrabold bg-primary/20 text-primary px-2.5 sm:px-3 py-1 rounded-full border border-primary/30 uppercase tracking-wide">
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
                              : 'Exame (Avaliação)'}
                          </span>

                          {/* Subtle Highlighted Deadline Badge */}
                          <span className="text-[10px] sm:text-[11px] font-bold text-amber-600 flex items-center gap-1.5 bg-surface px-2.5 sm:px-3.5 py-1 rounded-full border border-amber-500/30 shadow-sm">
                            <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>Prazo Limite: {act.deadline || 'Sem data'}</span>
                          </span>

                          {/* Subtle Status Badge */}
                          {sub && sub.status === 'returned' ? (
                            <span
                              className={`text-[10px] sm:text-[11px] font-bold px-2.5 sm:px-3 py-1 rounded-full border ${
                                sub.returnCount === 3
                                  ? 'bg-rose-100 text-rose-600 border-rose-200'
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
                            <span className="text-[10px] sm:text-[11px] font-bold text-amber-600 bg-amber-500/15 px-2.5 sm:px-3 py-1 rounded-full border border-amber-500/30">
                              📜 Pendente (A Fazer)
                            </span>
                          )}

                          <span className="text-[10px] sm:text-[11px] font-bold text-foreground bg-[#171f33] px-2.5 sm:px-3 py-1 rounded-full border border-border">
                            Nota Máxima: {distribution.maxGrade.toFixed(1)} pts
                          </span>

                          {objectiveQuestions.length > 0 && (
                            <span className={`text-[10px] sm:text-[11px] font-bold px-2.5 sm:px-3 py-1 rounded-full border ${
                              Object.keys(objectiveInputs[act.id] || {}).length === objectiveQuestions.length
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : 'bg-primary/20 text-primary border-primary/30'
                            }`}>
                              📝 {Object.keys(objectiveInputs[act.id] || {}).length} de {objectiveQuestions.length} respondidas
                            </span>
                          )}

                          {act.isAdapted && (
                            <span className="text-[10px] sm:text-[11px] font-bold text-amber-600 bg-amber-100 px-2.5 sm:px-3 py-1 rounded-full border border-amber-500/30">
                              ✨ Adaptada PNE
                            </span>
                          )}
                        </div>
                        <h3 className="text-xl sm:text-2xl font-black text-foreground break-words">{act.title}</h3>
                      </div>
                    </div>

                    {/* Cortina Preta Instantânea quando o aluno tenta tirar Print da Tela */}
                    {isScreenshotShieldActive && (
                      <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center p-6 text-center select-none">
                        <ShieldAlert className="w-16 h-16 text-rose-500 mb-4 animate-bounce" />
                        <h2 className="text-xl sm:text-2xl font-black text-white">
                          🚫 CAPTURA DE TELA BLOQUEADA!
                        </h2>
                        <p className="text-xs sm:text-sm text-zinc-300 max-w-md mt-2">
                          O sistema Anti-Cola KronoMestre bloqueou a tentativa de Print Screen e limpou a sua área de transferência. Foque na sua avaliação!
                        </p>
                      </div>
                    )}

                    {/* Security Active Banner (Apenas para atividades convencionais) */}
                    {!(act.playfulGameHtml || act.adaptationType === 'severe_playful') && (act.securityFocusLock || act.securityBlockCopyStatement || act.securityBlockPasteEssay) && (
                      <div className="bg-[#171f33] p-3.5 rounded-2xl border border-amber-500/30 flex flex-wrap items-center gap-2.5 text-xs text-amber-200 shadow-md">
                        <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                        <span className="font-bold text-foreground">Seguranças Anti-Cola Ativas:</span>
                        {act.securityFocusLock && (
                          <span className="bg-amber-100 text-amber-600 px-2.5 py-0.5 rounded-full border border-amber-500/30 font-semibold text-[11px] flex items-center gap-1">
                            🛡️ Trava de Foco (Avisos: {focusWarnings[act.id] || 0}/4)
                          </span>
                        )}
                        {act.securityBlockCopyStatement && (
                          <span className="bg-rose-100 text-rose-600 px-2.5 py-0.5 rounded-full border border-rose-500/30 font-semibold text-[11px] flex items-center gap-1">
                            <CopyX className="w-3 h-3 text-rose-400" />
                            <span>Sem Cópia</span>
                          </span>
                        )}
                        {act.securityBlockPasteEssay && (
                          <span className="bg-purple-100 text-purple-600 px-2.5 py-0.5 rounded-full border border-purple-500/30 font-semibold text-[11px] flex items-center gap-1">
                            <ClipboardX className="w-3 h-3 text-purple-400" />
                            <span>Sem Cola</span>
                          </span>
                        )}
                        <span className="bg-cyan-100 text-cyan-700 px-2.5 py-0.5 rounded-full border border-cyan-500/30 font-semibold text-[11px] flex items-center gap-1">
                          <span>📸 Anti-Print Ativo</span>
                        </span>
                      </div>
                    )}

                    {/* BANNER ESPECIAL DE JOGO AVALIATIVO (KRONOGAMES) */}
                    {(act.isGameActivity || act.gameData || act.type === 'Jogo Avaliativo') && (
                      <div className="bg-gradient-to-r from-amber-500/20 via-primary/20 to-purple-500/20 border-2 border-amber-500/40 p-6 rounded-3xl space-y-4 shadow-xl">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Gamepad2 className="w-6 h-6 text-amber-400 animate-pulse" />
                              <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                                KronoGames • Desafio Gamificado
                              </span>
                            </div>
                            <h4 className="text-lg sm:text-xl font-black text-foreground">
                              {act.title}
                            </h4>
                            <p className="text-xs text-muted max-w-xl">
                              {act.gameData?.introText || act.description || 'Participe deste desafio interativo com fases dinâmicas e correção 100% automática!'}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => setActiveKronoGameActivity(act)}
                            className="px-6 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-black text-sm rounded-2xl shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2.5 transition-all cursor-pointer active:scale-95 shrink-0"
                          >
                            <Gamepad2 className="w-5 h-5" />
                            <span>Entrar no Jogo Agora 🚀</span>
                          </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-amber-500/20 text-[11px] font-bold text-muted">
                          <span className="flex items-center gap-1.5 text-amber-300">
                            🏆 Fases: {act.gameData?.stages?.length || 6} Rodadas
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1.5 text-primary">
                            ⚡ Modo: {act.executionContext === 'classroom_group' ? 'Sala de Aula (Dupla/Grupo)' : 'Individual (Casa)'}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1.5 text-emerald-300">
                            💯 Correção Instantânea (0 a 10 pts)
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Grade Distribution Rule Banner (Apenas para atividades convencionais com questões) */}
                    {!(act.playfulGameHtml || act.adaptationType === 'severe_playful') && (
                      <div className="bg-surface p-4 rounded-2xl border border-primary/30 flex items-start gap-3 text-xs text-foreground">
                        <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-foreground">
                            Regra de Pontuação da Atividade:
                          </p>
                          <p className="text-muted mt-0.5">
                            {distribution.distributionLabel}.
                          </p>
                          <p className="text-[11px] text-primary font-semibold mt-1">
                            ⚡ As questões objetivas têm correção automática instantânea ao enviar. A parte dissertativa é corrigida pelo professor.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Description / Statement / Support Material (Para atividades convencionais) */}
                    {!(act.playfulGameHtml || act.adaptationType === 'severe_playful') && (
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
                          <h4 className="text-xs font-bold text-muted uppercase tracking-wider mb-1">
                            Orientações do Professor:
                          </h4>
                          <p className="text-xs text-foreground leading-relaxed bg-[#171f33]/60 p-4 rounded-2xl border border-border">
                            {act.description}
                          </p>
                        </div>

                        {act.supportMaterial && (
                          <div className="bg-[#171f33] p-4 rounded-2xl border border-border space-y-2">
                            <h5 className="text-xs font-bold text-[#c0c1ff] flex items-center gap-1.5">
                              <BookOpen className="w-4 h-4 text-primary" />
                              <span>Texto de Apoio / Leitura Obrigatória:</span>
                            </h5>
                            <div className="text-xs text-muted leading-relaxed space-y-1.5">
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
                                              className="inline-flex items-center gap-1.5 px-3 py-1 min-h-[44px] min-w-[44px] bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary font-bold rounded-xl text-xs transition-all underline cursor-pointer shadow-sm active:scale-95 my-0.5"
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
                    )}

                    {/* JOGO LÚDICO INTERATIVO (CASOS SEVEROS PNE) - IMERSIVO, LIMPO E RESPONSIVO */}
                    {(act.playfulGameHtml || act.adaptationType === 'severe_playful') && (
                      <div className="space-y-4">
                        {/* Enunciado Limpo e direto */}
                        {act.description && (
                          <div className="bg-surface p-3.5 sm:p-4 rounded-2xl border border-amber-500/20 text-xs sm:text-sm text-foreground leading-relaxed flex items-center gap-2">
                            <span className="font-bold text-amber-400 shrink-0">🎯 Enunciado:</span>
                            <span>{act.description}</span>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-3 bg-surface/80 p-3 rounded-2xl border border-amber-500/30">
                          <div className="flex items-center gap-2">
                            <Gamepad2 className="w-5 h-5 text-amber-400" />
                            <span className="font-bold text-sm text-foreground">{act.title}</span>
                          </div>

                          <div className="flex items-center gap-2.5">
                            {playfulScores[act.id] ? (
                              <span className="px-3 py-1.5 bg-primary/20 text-primary font-bold text-xs rounded-full border border-primary/30 flex items-center gap-1.5 shadow-sm">
                                <Star className="w-4 h-4 fill-[#4ade80]" />
                                Conquistado: {playfulScores[act.id].grade} / {act.maxGrade || 10} pts
                              </span>
                            ) : (
                              <span className="px-3 py-1.5 bg-amber-100 text-amber-600 font-bold text-xs rounded-full border border-amber-500/30 flex items-center gap-1">
                                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                <span>Responda na tela</span>
                              </span>
                            )}

                            {/* Botão de Tela Cheia / Modo Imersivo */}
                            <button
                              type="button"
                              onClick={() => setFullscreenGameActivityId(act.id)}
                              className="px-3.5 py-1.5 min-h-[44px] min-w-[44px] bg-[#171f33] hover:bg-[#202b44] text-foreground hover:text-amber-600 font-bold text-xs rounded-full border border-border transition-all flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95"
                              title="Expandir para tela cheia"
                            >
                              <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                              <span className="hidden sm:inline">Tela Cheia</span>
                            </button>
                          </div>
                        </div>

                        {/* Container do Jogo Responsivo */}
                        <div className="w-full h-[65vh] sm:h-[75vh] min-h-[480px] sm:min-h-[560px] rounded-3xl overflow-hidden border-2 border-amber-200 shadow-2xl bg-black relative">
                          <iframe
                            srcDoc={act.playfulGameHtml || '<div style="color:white;padding:20px;font-family:sans-serif;text-align:center;">Carregando jogo interativo...</div>'}
                            title={`Jogo Lúdico - ${act.title}`}
                            className="w-full h-full border-0 block"
                            allow="autoplay; fullscreen"
                            sandbox="allow-scripts allow-same-origin allow-modals"
                          />
                        </div>

                        {/* Modal Imersivo em Tela Cheia quando acionado */}
                        {fullscreenGameActivityId === act.id && (
                          <div className="fixed inset-0 z-50 bg-[#060a14] p-2 sm:p-4 flex flex-col justify-between animate-fadeIn">
                            {/* Barra Superior Imersiva */}
                            <div className="flex items-center justify-between pb-2 mb-2 border-b border-border px-2">
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => setFullscreenGameActivityId(null)}
                                  className="px-4 py-2 min-h-[44px] min-w-[44px] bg-[#171f33] hover:bg-[#222c42] text-foreground font-bold text-xs sm:text-sm rounded-full border border-border transition-all flex items-center gap-2 cursor-pointer shadow"
                                >
                                  <Minimize2 className="w-4 h-4 text-amber-400" />
                                  <span>Sair da Tela Cheia</span>
                                </button>
                                <span className="font-black text-foreground text-sm sm:text-base hidden sm:inline">{act.title}</span>
                              </div>

                              <div className="flex items-center gap-3">
                                {playfulScores[act.id] && (
                                  <span className="px-3 py-1 bg-primary/20 text-primary font-bold text-xs rounded-full border border-primary/30 flex items-center gap-1.5">
                                    <Star className="w-4 h-4 fill-[#4ade80]" />
                                    {playfulScores[act.id].grade} / {act.maxGrade || 10} pts
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFullscreenGameActivityId(null);
                                    handleSubmit(act);
                                  }}
                                  className="px-5 py-2 min-h-[44px] min-w-[44px] bg-primary hover:bg-primary-hover text-white font-black text-xs sm:text-sm rounded-full transition-all shadow-lg shadow-primary/20 cursor-pointer flex items-center gap-2"
                                >
                                  <Gamepad2 className="w-4 h-4 stroke-[2.5]" />
                                  <span>Concluir e Enviar Nota 🚀</span>
                                </button>
                              </div>
                            </div>

                            {/* Iframe em Tela Cheia */}
                            <div className="flex-1 w-full rounded-2xl overflow-hidden border-2 border-amber-200 bg-black shadow-2xl relative">
                              <iframe
                                srcDoc={act.playfulGameHtml || '<div style="color:white;padding:20px;font-family:sans-serif;text-align:center;">Carregando jogo interativo...</div>'}
                                title={`Jogo Lúdico Fullscreen - ${act.title}`}
                                className="w-full h-full border-0 block"
                                allow="autoplay; fullscreen"
                                sandbox="allow-scripts allow-same-origin allow-modals"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* PARTE 1: QUESTÕES OBJETIVAS */}
                    {objectiveQuestions.length > 0 && !(act.playfulGameHtml || act.adaptationType === 'severe_playful') && (
                      <div className="space-y-4 pt-2 border-t border-border">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h4 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
                            <HelpCircle className="w-4 h-4 text-primary shrink-0" />
                            <span>Parte 1: Questões Objetivas (Múltipla Escolha)</span>
                          </h4>
                          <span className="text-[11px] sm:text-xs font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20 shrink-0">
                            Vale {distribution.maxObjectiveGrade.toFixed(1)} pts
                          </span>
                        </div>

                        <div className="space-y-4 sm:space-y-6">
                          {objectiveQuestions.map((q, qIndex) => {
                            const studentChoices = objectiveInputs[act.id] || {};
                            const currentChoice = studentChoices[q.id];

                            return (
                              <div
                                key={q.id || qIndex}
                                className="bg-surface p-4 sm:p-5 rounded-2xl border border-border space-y-3"
                              >
                                <p className="text-xs font-bold text-foreground leading-relaxed break-words">
                                  Questão {qIndex + 1}: <span className="font-normal text-foreground">{q.statement}</span>
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
                                        className={`w-full text-left p-3 sm:p-3.5 min-h-[44px] min-w-[44px] rounded-xl text-xs transition-all flex items-start gap-2.5 sm:gap-3 border cursor-pointer active:scale-[0.99] ${
                                          isSelected
                                            ? 'bg-primary/20 border-primary text-foreground font-bold'
                                            : 'bg-[#171f33] border-border text-muted hover:bg-surface-hover hover:text-foreground'
                                        }`}
                                      >
                                        <span
                                          className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5 ${
                                            isSelected
                                              ? 'bg-primary text-white'
                                              : 'bg-surface-hover text-foreground'
                                          }`}
                                        >
                                          {letters[optIdx]}
                                        </span>
                                        <span className="leading-relaxed break-words flex-1">{optText}</span>
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
                      <div className="space-y-4 pt-2 border-t border-border">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h4 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
                            <FileText className="w-4 h-4 text-primary shrink-0" />
                            <span>Parte 2: Produção Textual / Resposta Dissertativa</span>
                          </h4>
                          <span className="text-[11px] sm:text-xs font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20 shrink-0">
                            Vale {distribution.maxEssayGrade.toFixed(1)} pts
                          </span>
                        </div>

                        {essayQuestions.map((eq, eqIdx) => (
                          <div
                            key={eq.id || eqIdx}
                            className={`bg-surface p-3.5 sm:p-4 rounded-2xl border border-border space-y-2 ${act.securityBlockCopyStatement ? 'select-none' : ''}`}
                            onCopy={(e) => {
                              if (act.securityBlockCopyStatement) {
                                e.preventDefault();
                                showSecurityToast('❌ Cópia de enunciados bloqueada nesta atividade.');
                              }
                            }}
                          >
                            <p className="text-xs font-semibold text-foreground leading-relaxed break-words">{eq.statement}</p>
                          </div>
                        ))}

                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <label className="block text-xs font-bold text-foreground">
                              Sua Resposta Dissertativa:
                            </label>
                            {act.securityBlockPasteEssay && (
                              <span className="text-[10px] text-purple-600 font-bold bg-purple-500/10 px-2 sm:px-2.5 py-0.5 rounded-full border border-purple-500/20 flex items-center gap-1 shrink-0">
                                <ClipboardX className="w-3 h-3 text-purple-400 shrink-0" />
                                <span>Cola (Ctrl+V) Bloqueada</span>
                              </span>
                            )}
                          </div>
                          <textarea
                            rows={5}
                            value={essayInputs[act.id] !== undefined ? essayInputs[act.id] : (sub?.essayAnswer || '')}
                            onChange={(e) => handleEssayChange(act.id, e.target.value)}
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
                            className="w-full bg-surface border border-border rounded-2xl p-3.5 sm:p-4 text-xs text-foreground placeholder-[#869486] focus:outline-none focus:border-primary leading-relaxed break-words"
                          />
                        </div>
                      </div>
                    )}

                    {/* TRABALHO EM GRUPO - SELEÇÃO DE INTEGRANTES */}
                    {act.allowGroupWork && (
                      <div className="bg-surface p-4 sm:p-5 rounded-2xl border border-purple-500/30 space-y-3 sm:space-y-3.5 shadow-lg">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h4 className="text-xs font-bold text-purple-600 uppercase tracking-wider flex items-center gap-2">
                            <Users className="w-4 h-4 text-purple-400 shrink-0" />
                            <span>Trabalho em Grupo — Colegas da Equipe:</span>
                          </h4>
                          <span className="text-[10px] sm:text-[11px] font-bold text-purple-600 bg-purple-500/10 border border-purple-500/20 px-2 sm:px-2.5 py-0.5 rounded-full shrink-0">
                            Turma {student.turma}
                          </span>
                        </div>

                        {/* Lista interativa de colegas da turma */}
                        {classmates.length > 0 ? (
                          <div className="space-y-2">
                            <p className="text-[11px] text-muted">
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
                                    className={`px-3 py-2 min-h-[44px] min-w-[44px] rounded-xl text-xs font-semibold flex items-center justify-between transition-all cursor-pointer border ${
                                      isSelected
                                        ? 'bg-purple-600/30 border-purple-400 text-purple-200 shadow-md'
                                        : 'bg-background border-border text-muted hover:text-foreground hover:border-border'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 truncate">
                                      <div className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? 'bg-purple-400' : 'bg-white/20'}`} />
                                      <span className="truncate">{cls.fullName}</span>
                                    </div>
                                    {isSelected ? (
                                      <Check className="w-4 h-4 text-purple-600 shrink-0" />
                                    ) : (
                                      <span className="text-[10px] text-foreground/40">+ Adicionar</span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-muted italic">
                            Nenhum outro aluno cadastrado na turma {student.turma}. Digite os nomes dos integrantes abaixo:
                          </p>
                        )}

                        {/* Input para nomes manuais/complementares */}
                        <div>
                          <label className="block text-[11px] font-semibold text-muted mb-1">
                            Outros integrantes (se não constarem na lista acima, separe por vírgula):
                          </label>
                          <input
                            type="text"
                            value={customMemberInput[act.id] || ''}
                            onChange={(e) =>
                              setCustomMemberInput((prev) => ({ ...prev, [act.id]: e.target.value }))
                            }
                            placeholder="Ex: João Pedro, Camila Santos"
                            className="w-full bg-background border border-border rounded-xl px-3.5 py-2 text-xs text-foreground placeholder-[#869486] focus:outline-none focus:border-purple-400"
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
                    <div className="pt-4 border-t border-border flex justify-end">
                      <button
                        onClick={() => handleSubmit(act)}
                        className={`w-full sm:w-auto py-3.5 px-6 sm:px-8 min-h-[44px] min-w-[44px] font-black rounded-full text-xs flex items-center justify-center gap-2 transition-all shadow-xl cursor-pointer active:scale-95 ${
                          (act.playfulGameHtml || act.adaptationType === 'severe_playful')
                            ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-amber-400/20'
                            : 'bg-primary hover:bg-primary-hover text-white shadow-primary/20'
                        }`}
                      >
                        {(act.playfulGameHtml || act.adaptationType === 'severe_playful') ? (
                          <>
                            <Gamepad2 className="w-4 h-4 stroke-[2.5] shrink-0" />
                            <span className="text-center">Concluir Jogo e Enviar Nota 🚀</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 stroke-[2.5] shrink-0" />
                            <span className="text-center">Enviar Resposta da Atividade</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              } else {
                const distribution = getActivityGradeDistribution(act);
                const isGraded = sub.status === 'graded';
                const objectiveScore = distribution.hasObjective ? (sub.objectiveScore || 0) : 0;
                const totalScore = objectiveScore + (sub.essayScore || 0) + (sub.extraPoints || 0);

                return (
                  <div
                    key={act.id}
                    className="glass-panel p-4 sm:p-8 rounded-2xl sm:rounded-3xl border border-border space-y-4 sm:space-y-6 shadow-xl"
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2">
                          <span className="text-[10px] sm:text-[11px] font-bold bg-primary/20 text-primary px-2.5 sm:px-3 py-0.5 rounded-full border border-primary/30">
                            {act.type === 'Simulado'
                              ? 'Treinamento Tático'
                              : act.type === 'Redação'
                              ? 'Redação'
                              : act.type === 'Dinâmica'
                              ? 'Treino em Equipe'
                              : act.type === 'Trabalho em grupo'
                              ? 'Trabalho em Grupo'
                              : act.type === 'Projeto de pesquisa'
                              ? 'Projeto de Pesquisa'
                              : 'Exame'}
                          </span>

                          {/* Subtle Highlighted Deadline Badge */}
                          <span className="text-[10px] sm:text-[11px] font-bold text-amber-600 flex items-center gap-1.5 bg-surface px-2.5 sm:px-3 py-0.5 rounded-full border border-amber-500/30">
                            <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>Prazo Limite: {act.deadline || 'Sem data'}</span>
                          </span>

                          {/* Status Badge */}
                          {sub.status === 'graded' ? (
                            <span className="text-[10px] sm:text-[11px] font-bold text-emerald-600 bg-emerald-100 px-2.5 sm:px-3 py-0.5 rounded-full border border-emerald-200">
                              ✅ Corrigida pelo Professor
                            </span>
                          ) : sub.status === 'pending' ? (
                            <span className="text-[10px] sm:text-[11px] font-bold text-sky-300 bg-sky-500/20 px-2.5 sm:px-3 py-0.5 rounded-full border border-sky-500/40">
                              ⏳ A Corrigir pelo Professor
                            </span>
                          ) : (
                            <span className="text-[10px] sm:text-[11px] font-bold text-orange-300 bg-orange-500/20 px-2.5 sm:px-3 py-0.5 rounded-full border border-orange-500/40">
                              ↩️ Devolvida {sub.returnCount ? `${sub.returnCount}x` : '1x'}
                            </span>
                          )}
                        </div>
                        <h3 className="text-xl sm:text-2xl font-bold text-foreground break-words">{act.title}</h3>
                      </div>

                      <div className="bg-surface px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl border border-primary/30 text-center shrink-0 w-full sm:w-auto">
                        <span className="text-[10px] font-bold text-muted block uppercase tracking-wider">
                          Sua Nota Final
                        </span>
                        <span className="text-xl sm:text-2xl font-black text-primary">
                          {totalScore.toFixed(1)} <span className="text-xs sm:text-sm font-normal text-muted">/ {distribution.maxGrade.toFixed(1)}</span>
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
                            <div className="bg-surface p-4 rounded-2xl border border-border space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                                  <CheckCircle2 className="w-4 h-4" />
                                  <span>Parte Objetiva (Automática):</span>
                                </span>
                                <span className="text-sm font-black text-foreground">
                                  {sub.objectiveScore.toFixed(1)} / {sub.maxObjectiveScore.toFixed(1)} pts
                                </span>
                              </div>
                              <p className="text-[11px] text-muted">
                                ⚡ Nota calculada instantaneamente no momento do envio.
                              </p>
                            </div>
                          )}

                          {/* Essay Score (Aguardando ou Corrigida) */}
                      <div className="bg-surface p-4 rounded-2xl border border-border space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#c0c1ff] flex items-center gap-1.5">
                            <FileText className="w-4 h-4" />
                            <span>Parte Dissertativa:</span>
                          </span>
                          {isGraded || sub.essayScore !== undefined ? (
                            <span className="text-sm font-black text-foreground">
                              {(sub.essayScore || 0).toFixed(1)} / {distribution.maxEssayGrade.toFixed(1)} pts
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold bg-amber-100 text-amber-600 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                              Aguardando Professor
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted">
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
                      <div className="bg-[#171f33] p-4 rounded-2xl border border-border space-y-1">
                        <span className="text-xs font-bold text-muted block">
                          Sua Resposta Enviada:
                        </span>
                        <p className="text-xs text-foreground italic leading-relaxed whitespace-pre-wrap">
                          &ldquo;{sub.essayAnswer}&rdquo;
                        </p>
                      </div>
                    )}

                    {/* Teacher Feedback */}
                    {sub.teacherFeedback ? (
                      <div className="bg-surface p-5 rounded-2xl border border-primary/30 space-y-2">
                        <span className="text-xs font-bold text-primary flex items-center gap-2">
                          <MessageSquare className="w-4 h-4" />
                          <span>Feedback e Diagnóstico do Professor:</span>
                        </span>
                        <p className="text-xs text-foreground leading-relaxed">
                          {sub.teacherFeedback}
                        </p>
                      </div>
                    ) : (
                      <div className="text-xs text-muted italic bg-[#171f33]/40 p-3 rounded-xl border border-border">
                        O professor ainda não publicou parecer textual adicional para esta entrega.
                      </div>
                    )}
                  </div>
                );
              }
            })()}
              </div>
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
            <h2 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
              <FolderDown className="w-5 h-5 text-primary" />
              <span>Arquivos e Materiais Didáticos</span>
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Baixe as apostilas, apresentações e documentos disponibilizados pelo professor no Google Drive
            </p>
          </div>

          {/* CARD DA PASTA PRINCIPAL DO GOOGLE DRIVE */}
          {teacher?.driveFolderUrl?.trim() && (
            <div className="glass-panel p-6 rounded-3xl border border-primary/40 bg-gradient-to-br from-surface via-surface to-background space-y-4 shadow-xl relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/30 text-primary flex items-center justify-center shrink-0 shadow-lg shadow-[#4ade80]/10">
                    <HardDrive className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground leading-snug">Pasta de Arquivos no Google Drive</h3>
                    <p className="text-xs text-muted mt-0.5">
                      Acesse a pasta oficial do Google Drive com todos os materiais e documentos da disciplina
                    </p>
                  </div>
                </div>

                <a
                  href={teacher.driveFolderUrl.trim()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-3.5 px-6 bg-gradient-to-r from-[#4ade80] to-[#22c55e] hover:from-[#6bfb9a] hover:to-[#4ade80] text-white font-black rounded-2xl text-xs sm:text-sm transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2.5 shrink-0 cursor-pointer min-h-[48px] w-full sm:w-auto active:scale-95"
                  title="Abrir Pasta do Google Drive"
                >
                  <ExternalLink className="w-4 h-4 stroke-[2.5]" />
                  <span>Acessar Pasta do Drive</span>
                </a>
              </div>
            </div>
          )}

          {studentLibraryFiles.length === 0 && !teacher?.driveFolderUrl?.trim() ? (
            <div className="glass-panel p-12 text-center rounded-3xl border border-border text-muted space-y-3 shadow-xl">
              <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto text-amber-400 text-2xl font-black">
                🌀
              </div>
              <p className="text-base font-extrabold text-foreground">Biblioteca sem Arquivos!</p>
              <p className="text-xs text-muted max-w-md mx-auto leading-relaxed">
                Nenhum documento ou pasta do Google Drive foi disponibilizado para sua turma ainda. Fique atento aos novos lançamentos do professor!
              </p>
            </div>
          ) : studentLibraryFiles.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 pt-2">
                <FileText className="w-4 h-4 text-primary" />
                <span>Documentos e Apostilas Específicas</span>
              </h3>
              {studentLibraryFiles.map((file) => {
                const driveUrl = file.driveUrl || teacher?.driveFolderUrl?.trim();

                return (
                  <div
                    key={file.id}
                    className="glass-panel p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 glass-panel-hover"
                  >
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-[#171f33] border border-border text-primary flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm sm:text-base font-bold text-foreground break-words">{file.title}</h3>
                        {file.category && (
                          <span className="text-[11px] font-semibold text-muted block mt-0.5">
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
                        className="py-2.5 px-6 min-h-[44px] min-w-[44px] bg-primary hover:bg-primary-hover text-white font-extrabold rounded-xl sm:rounded-full text-xs transition-all shadow-md flex items-center justify-center gap-2 shrink-0 cursor-pointer w-full sm:w-auto active:scale-95"
                        title="Baixar arquivo"
                      >
                        <Download className="w-4 h-4 stroke-[2.5] shrink-0" />
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
            className="ml-auto text-rose-600 hover:text-foreground p-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Modal/Janela em Tela Cheia para Atividade Lúdica PNE (Preenche a tela inteira, borda discreta, botão voltar e botão enviar) */}
      {fullscreenGameActivityId && (() => {
        const act = activities.find((a) => a.id === fullscreenGameActivityId);
        if (!act) return null;

        return (
          <div className="fixed inset-0 z-50 w-screen h-screen bg-[#070d19] flex flex-col p-2 sm:p-4 animate-fadeIn">
            {/* Barra de Ações Superior */}
            <div className="flex items-center justify-between gap-3 pb-2.5 px-2 border-b border-border">
              <button
                type="button"
                onClick={() => setFullscreenGameActivityId(null)}
                className="px-4 py-2.5 min-h-[44px] min-w-[44px] bg-[#171f33] hover:bg-[#222c42] text-foreground font-bold text-xs sm:text-sm rounded-xl border border-border transition-all flex items-center gap-2 cursor-pointer shadow active:scale-95 shrink-0"
              >
                <ArrowLeft className="w-4 h-4 text-amber-400" />
                <span>Voltar</span>
              </button>

              <div className="flex items-center gap-2 min-w-0">
                <Gamepad2 className="w-5 h-5 text-amber-400 shrink-0" />
                <span className="font-extrabold text-foreground text-sm sm:text-base truncate max-w-xs sm:max-w-md">
                  {act.title}
                </span>
                {playfulScores[act.id] && (
                  <span className="px-3 py-1 bg-primary/20 text-primary font-bold text-xs rounded-full border border-primary/30 hidden sm:flex items-center gap-1.5 shrink-0">
                    <Star className="w-3.5 h-3.5 fill-[#4ade80]" />
                    {playfulScores[act.id].grade} / {act.maxGrade || 10} pts
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setFullscreenGameActivityId(null);
                  handleSubmit(act);
                }}
                className="px-5 py-2.5 min-h-[44px] min-w-[44px] bg-primary hover:bg-primary-hover text-white font-black text-xs sm:text-sm rounded-xl transition-all shadow-lg shadow-primary/20 cursor-pointer flex items-center gap-2 active:scale-95 shrink-0"
              >
                <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                <span>Enviar Atividade</span>
              </button>
            </div>

            {/* Container do Jogo em Tela Inteira com Borda Discreta */}
            <div className="flex-1 w-full rounded-2xl overflow-hidden border border-border bg-black shadow-2xl relative mt-2">
              <iframe
                srcDoc={
                  act.playfulGameHtml
                    ? extractCleanHtml(act.playfulGameHtml)
                    : '<div style="color:white;padding:20px;font-family:sans-serif;text-align:center;">Carregando jogo interativo...</div>'
                }
                title={`Jogo Lúdico Fullscreen - ${act.title}`}
                className="w-full h-full border-0 block"
                allow="autoplay; fullscreen"
                sandbox="allow-scripts allow-same-origin allow-modals"
              />
            </div>
          </div>
        );
      })()}

      {/* Anti-Cola Focus Lock Warning / Auto-Submit Modal */}
      {securityNotice && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-surface border border-amber-200 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 text-center relative">
            <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center border shadow-lg ${
              securityNotice.isAutoSubmitted
                ? 'bg-rose-100 text-rose-400 border-rose-200'
                : 'bg-amber-100 text-amber-400 border-amber-200'
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
              <p className="text-xs text-foreground font-medium">
                Atividade: <span className="font-bold text-primary">{securityNotice.activityTitle}</span>
              </p>
            </div>

            <div className="bg-surface p-4 rounded-2xl border border-border text-xs text-muted text-left leading-relaxed space-y-2">
              {securityNotice.isAutoSubmitted ? (
                <>
                  <p className="text-rose-600 font-bold">
                    Você atingiu o limite de 4 avisos por sair da tela / mudar de aba durante a realização da atividade.
                  </p>
                  <p>
                    A prova foi finalizada e enviada para o professor com o progresso preenchido até o momento.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-amber-600 font-bold">
                    Aviso {securityNotice.warningCount} de 4: O sistema detectou que você mudou de aba, janela ou aplicativo!
                  </p>
                  <p>
                    Para garantir a integridade da avaliação, permaneça nesta página. No <strong className="text-foreground">4º aviso</strong>, sua atividade será entregue automaticamente do jeito que está!
                  </p>
                </>
              )}
            </div>

            <button
              onClick={() => setSecurityNotice(null)}
              className={`w-full py-3 px-6 min-h-[44px] min-w-[44px] font-extrabold rounded-full text-xs transition-all shadow-md cursor-pointer ${
                securityNotice.isAutoSubmitted
                  ? 'bg-rose-500 hover:bg-rose-600 text-foreground'
                  : 'bg-amber-400 hover:bg-amber-300 text-slate-950'
              }`}
            >
              {securityNotice.isAutoSubmitted ? 'Entendido (Ver Correções)' : 'Entendido, Voltar para a Prova'}
            </button>
          </div>
        </div>
      )}

      {/* Avatar Selection Modal */}
      {isAvatarModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
          <div className="bg-surface border border-border rounded-3xl p-5 sm:p-7 max-w-3xl w-full shadow-2xl space-y-5 relative max-h-[92vh] flex flex-col">
            <button
              onClick={() => setIsAvatarModalOpen(false)}
              className="absolute top-4 right-4 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-muted hover:text-foreground bg-surface hover:bg-rose-500/20 rounded-full transition-colors cursor-pointer border border-border"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  52 Avatares Exclusivos
                </span>
                <span className="text-xs text-muted">RPG • Vikings • Feras • Cômicos</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-foreground flex items-center gap-2 mt-1">
                <Sparkles className="w-6 h-6 text-amber-400" />
                Escolha seu Personagem
              </h2>
              <p className="text-xs sm:text-sm text-muted mt-0.5">
                Personalize o seu perfil de estudante com um avatar que represente sua personalidade e jornada!
              </p>
            </div>

            {/* Categorias & Busca */}
            <div className="space-y-3 pt-1">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                {AVATAR_CATEGORIES.map((cat) => {
                  const isActive = avatarCategoryFilter === cat.id;
                  const count = cat.id === 'todos' 
                    ? KRONO_AVATARS.length 
                    : KRONO_AVATARS.filter((a) => a.category === cat.id).length;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setAvatarCategoryFilter(cat.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border active:scale-95 ${
                        isActive
                          ? 'bg-primary text-white border-primary shadow-md shadow-primary/20 ring-1 ring-primary/40'
                          : 'bg-surface hover:bg-surface-hover text-muted hover:text-foreground border-border'
                      }`}
                    >
                      <span>{cat.emoji}</span>
                      <span>{cat.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${isActive ? 'bg-white/20 text-white' : 'bg-surface-hover text-muted'}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Input de Busca */}
              <div className="relative">
                <input
                  type="text"
                  value={avatarSearchQuery}
                  onChange={(e) => setAvatarSearchQuery(e.target.value)}
                  placeholder="Buscar por herói, viking, fera mística, mago, robô ou criatura..."
                  className="w-full bg-[#171f33] border border-border rounded-xl px-4 py-2.5 text-xs sm:text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-primary transition-colors"
                />
                {avatarSearchQuery && (
                  <button
                    onClick={() => setAvatarSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted hover:text-foreground"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>

            {/* Grid dos Avatares */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
              {filteredAvatars.length === 0 ? (
                <div className="p-8 text-center text-muted border border-dashed border-border rounded-2xl">
                  Nenhum personagem encontrado para essa busca. Tente outro termo!
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-3.5">
                  {filteredAvatars.map((av) => {
                    const isSelected = student.avatarUrl === av.url;
                    return (
                      <button
                        key={av.id}
                        onClick={() => {
                          if (onUpdateAvatar) onUpdateAvatar(student.id, av.url);
                          setIsAvatarModalOpen(false);
                        }}
                        className={`group p-3 rounded-2xl border transition-all text-left flex flex-col justify-between gap-2 cursor-pointer relative ${
                          isSelected
                            ? 'bg-primary/15 border-primary shadow-lg shadow-primary/10 ring-2 ring-primary/50'
                            : 'bg-surface/90 hover:bg-surface-hover border-border hover:border-primary/40'
                        }`}
                        title={av.tagline}
                      >
                        <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-[#101726] flex items-center justify-center p-2 border border-border/50">
                          <img
                            src={av.url}
                            alt={av.name}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-200"
                          />
                          {isSelected && (
                            <div className="absolute top-1.5 right-1.5 bg-primary text-white p-1 rounded-full border-2 border-[#0e172a] shadow-md">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 w-full space-y-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-surface border border-border text-primary uppercase tracking-wider truncate">
                              {av.categoryLabel}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                            {av.name}
                          </h4>
                          <p className="text-[11px] text-muted line-clamp-2 leading-tight">
                            {av.tagline}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* KronoGames Inclusive Engine Player Modal */}
      {activeKronoGameActivity && (
        <KronoGamePlayer
          activity={activeKronoGameActivity}
          student={student}
          allStudents={students}
          onFinishGame={handleFinishKronoGame}
          onClose={() => setActiveKronoGameActivity(null)}
        />
      )}

      {/* Modal de Conquistas e Badges Pedagógicas do Estudante */}
      {isAchievementsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
          <div className="bg-surface border border-border rounded-3xl p-5 sm:p-7 max-w-2xl w-full shadow-2xl space-y-5 relative max-h-[92vh] flex flex-col">
            <button
              onClick={() => setIsAchievementsModalOpen(false)}
              className="absolute top-4 right-4 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-muted hover:text-foreground bg-surface hover:bg-rose-500/20 rounded-full transition-colors cursor-pointer border border-border"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Gamificação Pedagógica
                </span>
                <span className="text-xs text-muted">Sociologia • Conquistas e Medalhas</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-foreground flex items-center gap-2 mt-1">
                <Trophy className="w-6 h-6 text-amber-400" />
                Galeria de Conquistas
              </h2>
              <p className="text-xs sm:text-sm text-muted mt-0.5">
                Desbloqueie medalhas cumprindo missões, entregando avaliações e mantendo consistência nos estudos!
              </p>
            </div>

            {/* Painel Resumo de Progresso de Medalhas */}
            <div className="bg-[#171f33] p-4 rounded-2xl border border-border flex items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">Medalhas Desbloqueadas</span>
                <span className="text-lg sm:text-xl font-black text-foreground">
                  {studentAchievements.filter((a) => a.unlocked).length} <span className="text-xs font-normal text-muted">de {studentAchievements.length} medalhas</span>
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-28 sm:w-40 h-2.5 bg-background rounded-full overflow-hidden border border-border">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 rounded-full transition-all duration-500"
                    style={{
                      width: `${studentAchievements.length > 0 ? Math.round((studentAchievements.filter((a) => a.unlocked).length / studentAchievements.length) * 100) : 0}%`,
                    }}
                  />
                </div>
                <span className="text-xs font-mono font-bold text-amber-400">
                  {studentAchievements.length > 0 ? Math.round((studentAchievements.filter((a) => a.unlocked).length / studentAchievements.length) * 100) : 0}%
                </span>
              </div>
            </div>

            {/* Lista das Conquistas */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1">
              {studentAchievements.map((ach) => (
                <div
                  key={ach.id}
                  className={`p-4 rounded-2xl border transition-all flex items-start gap-3.5 sm:gap-4 ${
                    ach.unlocked
                      ? 'bg-amber-500/10 border-amber-500/30 shadow-md shadow-amber-500/5'
                      : 'bg-surface/60 border-border opacity-70'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 border ${
                    ach.unlocked
                      ? 'bg-amber-500/20 border-amber-400/40 text-amber-300 shadow-sm'
                      : 'bg-background/80 border-border text-muted grayscale'
                  }`}>
                    {ach.iconEmoji}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted">
                        {ach.category}
                      </span>
                      {ach.unlocked ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span>Desbloqueada</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#171f33] text-muted border border-border flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          <span>Em Progresso</span>
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-extrabold text-foreground mt-0.5">{ach.title}</h4>
                    <p className="text-xs text-muted leading-relaxed mt-0.5">{ach.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-border flex justify-end">
              <button
                type="button"
                onClick={() => setIsAchievementsModalOpen(false)}
                className="py-2.5 px-6 min-h-[44px] bg-primary hover:bg-primary-hover text-white font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Fechar Galeria
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Questões Objetivas em Branco */}
      {unansweredConfirmData && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-surface border border-amber-500/40 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4 text-center">
            <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center bg-amber-500/20 border border-amber-500/40 text-amber-300">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-foreground">
                Questões em Branco Detectadas
              </h3>
              <p className="text-xs text-muted">
                Você ainda possui <strong className="text-amber-400">{unansweredConfirmData.unansweredCount} de {unansweredConfirmData.totalCount} questões</strong> sem resposta marcada nesta avaliação.
              </p>
            </div>

            <div className="bg-[#171f33] p-3.5 rounded-2xl border border-border text-xs text-muted text-left leading-relaxed">
              Questões deixadas em branco não pontuam na nota objetiva calculada na hora. Recomendamos revisar e marcar todas antes de concluir.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setUnansweredConfirmData(null)}
                className="py-2.5 px-4 min-h-[44px] bg-primary hover:bg-primary-hover text-white font-extrabold rounded-xl text-xs transition cursor-pointer active:scale-95 shadow-md shadow-primary/20"
              >
                Revisar Questões ✏️
              </button>
              <button
                type="button"
                onClick={() => {
                  const act = unansweredConfirmData.activity;
                  setUnansweredConfirmData(null);
                  handleSubmit(act, false, true);
                }}
                className="py-2.5 px-4 min-h-[44px] bg-[#171f33] hover:bg-[#202b44] text-muted hover:text-foreground font-bold rounded-xl text-xs border border-border transition cursor-pointer active:scale-95"
              >
                Enviar Mesmo Assim
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentPortalView;
