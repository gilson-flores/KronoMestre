'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Activity, StudentUser, TeacherUser } from '@/lib/types';
import {
  Home,
  Gamepad2,
  BarChart3,
  User,
  ExternalLink,
  BookOpen,
  Clock,
  CheckCircle2,
  Send,
  MessageSquare,
  LogOut,
  Sun,
  Moon,
  ChevronRight,
  ChevronLeft,
  Users,
  UserPlus,
  X,
  FileText,
  Video,
  Award,
  KeyRound,
  Link2,
  Play,
  RefreshCw,
  CheckCheck,
  Sparkles,
} from 'lucide-react';
import {
  standardizeTurmaCode,
  doesItemMatchStudentTurma,
  getEligibleClassmatesForGroup,
} from '@/lib/groupActivityUtils';
import { isActivityKronoGame, isActivityAdapted } from '@/lib/studentUtils';
import { DebatePaperlessView } from '@/components/views/DebatePaperlessView';
import { KronoGamePlayer } from '@/components/views/KronoGamePlayer';

const SafeKronoGamePlayer: any = KronoGamePlayer;

const STUDENT_PORTAL_VERSION = '2026.11.11-v2';

export interface StudentPortalViewProps {
  student?: StudentUser | null;
  currentStudent?: StudentUser | null;
  students?: StudentUser[];
  allStudents?: StudentUser[];
  teacher?: TeacherUser | null;
  activities: Activity[];
  libraryItems?: any[];
  messages?: any[];
  onSendMessage?: (msgData: any, receiverId?: string) => any;
  onSubmitAnswer?: (
    activityId: string,
    studentId: string,
    essayAnswer: string,
    objectiveScore?: number,
    maxObjectiveScore?: number,
    maxEssayScore?: number,
    selectedObjectiveAnswers?: { [questionId: string]: number },
    groupMembers?: string
  ) => void | Promise<void>;
  onSaveActivity?: (updatedActivity: Activity) => void | Promise<void>;
  onUpdateActivity?: (updatedActivity: Activity) => void | Promise<void>;
  onLogout?: () => void;
  themeMode?: 'dark' | 'light' | string;
  onToggleTheme?: () => void;
  [key: string]: any;
}

/**
 * Normaliza nomes para vincular com 100% de precisão as atividades que o aluno já fez
 * (ignora acentos como Ç/Ã/É, espaços extras e diferenças de maiúsculas/minúsculas).
 */
function normalizePersonName(name?: string | null): string {
  if (!name) return '';
  return String(name)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function extractLinksFromText(text?: string | null): string[] {
  if (!text) return [];
  const matches = text.match(/https?:\/\/[^\s)"'<>]+/gi);
  return matches ? Array.from(new Set(matches)) : [];
}

/**
 * Formata respostas salvas (incluindo JSON legado da planilha Respostas, ex: {"q_1_Q1": "..."})
 * para exibição limpa quando o aluno abre uma atividade que já fez.
 */
function formatSubmissionAnswerForDisplay(rawAnswer?: string | null): string {
  if (!rawAnswer) return '';
  const trimmed = String(rawAnswer).trim();
  if (!trimmed.startsWith('{')) return trimmed;

  try {
    const parsed = JSON.parse(trimmed);
    const lines: string[] = [];
    Object.entries(parsed).forEach(([key, val]) => {
      if (key === '_grupo_meta') return;
      const cleanKey = key.replace(/^q_\d+_/i, '');
      lines.push(`• ${cleanKey}: ${String(val)}`);
    });
    return lines.length > 0 ? lines.join('\n\n') : trimmed;
  } catch {
    return trimmed;
  }
}

/**
 * Localiza a entrega do aluno em uma atividade verificando:
 * 1) studentId exato
 * 2) matrícula exata
 * 3) nome completo normalizado (studentName === activeStudent.fullName)
 * 4) presença em groupMembers (string ou array)
 * 5) presença em _grupo_meta dentro do JSON de resposta
 * 6) participação registrada em Debate Sem Papel (debateConfig.participants)
 */
function findStudentSubmissionInActivity(act: Activity, student: StudentUser): any | null {
  const subs: any[] = Array.isArray(act.submissions) ? act.submissions : [];
  const targetNameNorm = normalizePersonName(student.fullName);
  const targetId = String(student.id || '').trim();
  const targetMat = String(student.matricula || '').trim();

  for (const s of subs) {
    if (!s) continue;

    // 1. Match por ID
    if (targetId && String(s.studentId || '').trim() === targetId) {
      return s;
    }

    // 2. Match por Matrícula
    if (targetMat && s.matricula && String(s.matricula).trim() === targetMat) {
      return s;
    }

    // 3. Match por Nome Completo Normalizado
    const subNameNorm = normalizePersonName(s.studentName || s.nome || s.NOME_ALUNO);
    if (targetNameNorm && subNameNorm && subNameNorm === targetNameNorm) {
      return s;
    }

    // 4. Match em groupMembers (string separada por vírgula ou array)
    if (targetNameNorm && s.groupMembers) {
      const membersList = Array.isArray(s.groupMembers)
        ? s.groupMembers
        : String(s.groupMembers).split(/[,;/]+/);
      const matchedMember = membersList.some(
        (m: string) => normalizePersonName(m) === targetNameNorm
      );
      if (matchedMember) return s;
    }

    // 5. Match em _grupo_meta dentro de RESPOSTAS_JSON / essayAnswer
    if (targetNameNorm && typeof s.essayAnswer === 'string' && s.essayAnswer.includes('_grupo_meta')) {
      try {
        const parsed = JSON.parse(s.essayAnswer);
        if (Array.isArray(parsed._grupo_meta)) {
          const matchedMeta = parsed._grupo_meta.some(
            (m: string) => normalizePersonName(m) === targetNameNorm
          );
          if (matchedMeta) return s;
        }
      } catch {}
    }
  }

  // 6. Verificar se o aluno participou de um Debate Sem Papel e possui nota de grupo/individual
  const debateCfg: any = act.gameData?.debateConfig;
  if (debateCfg && Array.isArray(debateCfg.participants)) {
    const part = debateCfg.participants.find(
      (p: any) =>
        (targetId && p.studentId === targetId) ||
        (targetNameNorm && normalizePersonName(p.studentName) === targetNameNorm)
    );
    if (part) {
      const role = part.role;
      const indGrade = debateCfg.individualGrades?.[student.id];
      const grpGrade = debateCfg.groupGrades?.[role];
      const score =
        typeof indGrade === 'number'
          ? indGrade
          : typeof indGrade?.finalGrade === 'number'
          ? indGrade.finalGrade
          : typeof grpGrade === 'number'
          ? grpGrade
          : null;

      if (score !== null || debateCfg.proResearchCompleted || debateCfg.contraResearchCompleted) {
        return {
          studentId: student.id,
          studentName: student.fullName,
          submittedAt: act.dueDate || 'Concluído em Sala',
          objectiveScore: 0,
          essayScore: score ?? 0,
          maxEssayScore: act.maxGrade || 10,
          status: score !== null ? 'graded' : 'pending',
          essayAnswer: `Participação registrada no Debate Sem Papel (${
            role === 'pro' ? 'Bancada PRÓ' : role === 'contra' ? 'Bancada CONTRA' : 'Corpo de JURADOS'
          }).`,
          teacherFeedback: indGrade?.feedback || '',
        };
      }
    }
  }

  return null;
}

export const StudentPortalView: React.FC<StudentPortalViewProps> = ({
  student: studentProp,
  currentStudent: currentStudentProp,
  students = [],
  allStudents = [],
  teacher,
  activities = [],
  messages = [],
  onSendMessage,
  onSubmitAnswer,
  onSaveActivity,
  onUpdateActivity,
  onLogout,
  themeMode = 'dark',
  onToggleTheme,
}) => {
  const activeStudent: StudentUser = useMemo(() => {
    return (
      studentProp ||
      currentStudentProp || {
        id: 'student-guest',
        fullName: 'Estudante',
        matricula: '0000',
        turma: '101',
        tag: 'REGULAR',
        avatarUrl: '',
        xp: 100,
        level: 1,
      }
    );
  }, [studentProp, currentStudentProp]);

  const studentTurmaStd = useMemo(() => {
    return standardizeTurmaCode(activeStudent.turma) || activeStudent.turma || '101';
  }, [activeStudent.turma]);

  // Navegação principal por botões estilo App de Smartphone
  const [activeNav, setActiveNav] = useState<
    'feed' | 'pending' | 'completed' | 'games' | 'boletim' | 'perfil'
  >('feed');

  // Estado de Aviso de Nova Versão para o Aluno
  const [showVersionUpdateBanner, setShowVersionUpdateBanner] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const seenVersion = localStorage.getItem('krono_student_seen_version');
      if (seenVersion !== STUDENT_PORTAL_VERSION) {
        setShowVersionUpdateBanner(true);
      }
    } catch {}
  }, []);

  const handleDismissOrApplyVersionUpdate = (reloadNow: boolean) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('krono_student_seen_version', STUDENT_PORTAL_VERSION);
        if (reloadNow && 'caches' in window) {
          caches
            .keys()
            .then((names) => names.forEach((n) => caches.delete(n)))
            .finally(() => window.location.reload());
          return;
        }
        if (reloadNow) {
          window.location.reload();
          return;
        }
      } catch {}
    }
    setShowVersionUpdateBanner(false);
  };

  // Estados de Execução de Atividade
  const [executingActivity, setExecutingActivity] = useState<Activity | null>(null);
  const [selectedObjective, setSelectedObjective] = useState<{ [qId: string]: number }>({});
  const [essayResponses, setEssayResponses] = useState<{ [qId: string]: string }>({});
  const [generalEssayText, setGeneralEssayText] = useState<string>('');
  const [selectedGroupNames, setSelectedGroupNames] = useState<string[]>([]);
  const [classmateDropdownValue, setClassmateDropdownValue] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Chat Direct & Controle de Mensagens Lidas (zera notificação ao abrir!)
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [seenMessageKeys, setSeenMessageKeys] = useState<string[]>([]);

  // Troca de Senha
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null);

  // Roster de colegas para atividades em grupo
  const [fetchedClassmates, setFetchedClassmates] = useState<StudentUser[]>([]);
  const rosterStudents = useMemo(() => {
    if (Array.isArray(students) && students.length > 0) return students;
    if (Array.isArray(allStudents) && allStudents.length > 0) return allStudents;
    return fetchedClassmates;
  }, [students, allStudents, fetchedClassmates]);

  useEffect(() => {
    if ((!students || students.length === 0) && (!allStudents || allStudents.length === 0)) {
      fetch('/api/students')
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d && Array.isArray(d.students)) {
            setFetchedClassmates(d.students);
          }
        })
        .catch(() => {});
    }
  }, [students, allStudents]);

  const showNotice = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 4000);
  }, []);

  // ==========================================================================
  // VINCULAÇÃO COMPLETA DE ATIVIDADES E ENTREGAS JÁ FEITAS PELO ALUNO
  // ==========================================================================
  const { studentActivities, mySubmissionsMap } = useMemo(() => {
    const isPNEStudent = activeStudent.tag && activeStudent.tag !== 'REGULAR';
    const subMap = new Map<string, any>();
    const list: Activity[] = [];

    (Array.isArray(activities) ? activities : []).forEach((act) => {
      if (!act) return;

      // 1º Verifica se o aluno JÁ FEZ esta atividade
      const mySub = findStudentSubmissionInActivity(act, activeStudent);
      if (mySub) {
        subMap.set(act.id, mySub);
        // Se o aluno já fez a atividade, NUNCA escondemos ela (mesmo que o status tenha mudado ou a turma tenha mudado de nomenclatura)
        list.push({
          ...act,
          turma: studentTurmaStd,
        });
        return;
      }

      // 2º Se o aluno ainda não fez, verifica se a atividade está ativa para a turma dele
      if ((act.status as string) === 'archived' || act.status === 'Inativo' || (act as any).isArchived) {
        return;
      }

      const rawTurma = (act as any)._originalTurmaScope || act.turma || 'TODAS';
      if (!doesItemMatchStudentTurma(rawTurma, activeStudent.turma)) {
        return;
      }

      if (isActivityAdapted(act) && !isPNEStudent) {
        return;
      }

      list.push({
        ...act,
        turma: studentTurmaStd,
      });
    });

    return { studentActivities: list, mySubmissionsMap: subMap };
  }, [activities, activeStudent, studentTurmaStd]);

  const pendingActivities = useMemo(
    () => studentActivities.filter((a) => !mySubmissionsMap.has(a.id)),
    [studentActivities, mySubmissionsMap]
  );

  const completedActivities = useMemo(
    () => studentActivities.filter((a) => mySubmissionsMap.has(a.id)),
    [studentActivities, mySubmissionsMap]
  );

  const kronoGamesActivities = useMemo(
    () => studentActivities.filter((a) => isActivityKronoGame(a)),
    [studentActivities]
  );

  const averageGrade = useMemo(() => {
    const graded: number[] = [];
    mySubmissionsMap.forEach((sub) => {
      const hasNumericScore =
        sub.status === 'graded' ||
        Number(sub.objectiveScore || 0) > 0 ||
        Number(sub.essayScore || 0) > 0;
      if (hasNumericScore) {
        const total =
          Number(sub.objectiveScore || 0) +
          Number(sub.essayScore || 0) +
          Number(sub.extraPoints || 0);
        graded.push(Math.min(10, total));
      }
    });
    if (graded.length === 0) return null;
    const sum = graded.reduce((a, b) => a + b, 0);
    return (sum / graded.length).toFixed(1);
  }, [mySubmissionsMap]);

  // ==========================================================================
  // MENSAGENS E ZERAMENTO AUTOMÁTICO DE NOTIFICAÇÕES AO ABRIR
  // ==========================================================================
  const chatReadStorageKey = `krono_read_msgs_v2_${activeStudent.id}`;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(chatReadStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setSeenMessageKeys(parsed);
      }
    } catch {}
  }, [chatReadStorageKey]);

  const getMessageUniqueKey = useCallback((msg: any, idx: number): string => {
    if (msg?.id) return String(msg.id);
    return `${msg?.senderId || ''}_${msg?.timestamp || msg?.createdAt || idx}_${String(
      msg?.content || msg?.text || ''
    ).slice(0, 24)}`;
  }, []);

  const myMessages = useMemo(() => {
    const normStudentName = normalizePersonName(activeStudent.fullName);
    return (Array.isArray(messages) ? messages : []).filter((m: any) => {
      if (!m) return false;
      if (
        m.senderId === activeStudent.id ||
        m.receiverId === activeStudent.id ||
        m.recipientId === activeStudent.id ||
        m.studentId === activeStudent.id ||
        m.threadId === activeStudent.id
      ) {
        return true;
      }
      if (
        normStudentName &&
        (normalizePersonName(m.senderName) === normStudentName ||
          normalizePersonName(m.recipientName) === normStudentName)
      ) {
        return true;
      }
      return false;
    });
  }, [messages, activeStudent.id, activeStudent.fullName]);

  // Conta APENAS mensagens ainda não visualizadas pelo aluno
  const unreadMessagesCount = useMemo(() => {
    const seenSet = new Set(seenMessageKeys);
    return myMessages.filter((m: any, idx: number) => {
      const isFromStudent =
        m.senderId === activeStudent.id || m.senderRole === 'student';
      if (isFromStudent) return false;
      if (m.read === true || m.isRead === true) return false;
      const key = getMessageUniqueKey(m, idx);
      return !seenSet.has(key);
    }).length;
  }, [myMessages, seenMessageKeys, activeStudent.id, getMessageUniqueKey]);

  // Marca todas as mensagens atuais como lidas assim que o chat é aberto
  const markAllMessagesAsSeen = useCallback(() => {
    const allKeys = myMessages.map((m: any, idx: number) => getMessageUniqueKey(m, idx));
    setSeenMessageKeys((prev) => {
      const merged = Array.from(new Set([...prev, ...allKeys]));
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(chatReadStorageKey, JSON.stringify(merged));
        } catch {}
      }
      return merged;
    });
  }, [myMessages, getMessageUniqueKey, chatReadStorageKey]);

  const handleOpenChat = useCallback(() => {
    setIsChatOpen(true);
    markAllMessagesAsSeen();
  }, [markAllMessagesAsSeen]);

  useEffect(() => {
    if (isChatOpen && myMessages.length > 0) {
      markAllMessagesAsSeen();
    }
  }, [isChatOpen, myMessages.length, markAllMessagesAsSeen]);

  const eligibleClassmates = useMemo(() => {
    const excluded = new Set<string>([activeStudent.id]);
    rosterStudents.forEach((s) => {
      if (selectedGroupNames.includes(s.fullName)) excluded.add(s.id);
    });
    return getEligibleClassmatesForGroup(rosterStudents, activeStudent.turma, excluded);
  }, [rosterStudents, activeStudent.id, activeStudent.turma, selectedGroupNames]);

  // ==========================================================================
  // ABERTURA DE ATIVIDADE (NOVA OU JÁ CONCLUÍDA PELO ALUNO)
  // ==========================================================================
  const handleOpenActivity = (act: Activity) => {
    setExecutingActivity(act);
    const existingSub = mySubmissionsMap.get(act.id);

    const draftKey = `krono_draft_${activeStudent.id}_${act.id}`;
    let savedDraft: any = null;
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(draftKey);
        if (raw) savedDraft = JSON.parse(raw);
      } catch {}
    }

    if (existingSub) {
      setSelectedObjective(existingSub.selectedObjectiveAnswers || {});
      setGeneralEssayText(formatSubmissionAnswerForDisplay(existingSub.essayAnswer));
      setEssayResponses({});
      if (existingSub.groupMembers) {
        const members = Array.isArray(existingSub.groupMembers)
          ? existingSub.groupMembers
          : String(existingSub.groupMembers)
              .split(',')
              .map((n: string) => n.trim())
              .filter(Boolean);
        setSelectedGroupNames(members);
      } else {
        setSelectedGroupNames([activeStudent.fullName]);
      }
    } else if (savedDraft) {
      setSelectedObjective(savedDraft.selectedObjective || {});
      setGeneralEssayText(savedDraft.generalEssayText || '');
      setEssayResponses(savedDraft.essayResponses || {});
      setSelectedGroupNames(savedDraft.selectedGroupNames || [activeStudent.fullName]);
    } else {
      setSelectedObjective({});
      setGeneralEssayText('');
      setEssayResponses({});
      setSelectedGroupNames([activeStudent.fullName]);
    }
    setClassmateDropdownValue('');
  };

  useEffect(() => {
    if (!executingActivity || typeof window === 'undefined') return;
    if (mySubmissionsMap.has(executingActivity.id)) return;
    const draftKey = `krono_draft_${activeStudent.id}_${executingActivity.id}`;
    try {
      localStorage.setItem(
        draftKey,
        JSON.stringify({
          selectedObjective,
          generalEssayText,
          essayResponses,
          selectedGroupNames,
        })
      );
    } catch {}
  }, [
    executingActivity,
    activeStudent.id,
    mySubmissionsMap,
    selectedObjective,
    generalEssayText,
    essayResponses,
    selectedGroupNames,
  ]);

  const handleConfirmSubmitActivity = async () => {
    if (!executingActivity || !onSubmitAnswer) return;
    setIsSubmitting(true);

    try {
      const rawQuestions: any[] = Array.isArray(executingActivity.questions)
        ? executingActivity.questions
        : [];
      const objQuestions: any[] = rawQuestions.filter((q: any) => q.type !== 'essay');
      const essayQuestions: any[] = [
        ...(Array.isArray((executingActivity as any).essayQuestions)
          ? (executingActivity as any).essayQuestions
          : []),
        ...rawQuestions.filter((q: any) => q.type === 'essay'),
      ];

      let objectiveScore = 0;
      let maxObjectiveScore = 0;

      objQuestions.forEach((q: any) => {
        const pts = Number(q.points || 1);
        maxObjectiveScore += pts;
        const chosenIdx = selectedObjective[q.id];
        const correctIdx = q.correctOptionIndex ?? q.correctAnswer ?? 0;
        if (chosenIdx !== undefined && chosenIdx === correctIdx) {
          objectiveScore += pts;
        }
      });

      let maxEssayScore = 0;
      if (essayQuestions.length > 0) {
        essayQuestions.forEach((eq: any) => {
          maxEssayScore += Number(eq.points || 2);
        });
      } else if (objQuestions.length === 0) {
        maxEssayScore = Number(executingActivity.maxGrade || 10);
      }

      let compiledEssay = generalEssayText.trim();
      if (essayQuestions.length > 0) {
        const parts = essayQuestions.map((eq: any, i: number) => {
          const resp = (essayResponses[eq.id] || '').trim();
          return `[Questão Dissertativa ${i + 1}]: ${
            eq.text || eq.question || eq.prompt || ''
          }\nResposta: ${resp || '(Em branco)'}`;
        });
        compiledEssay = [parts.join('\n\n'), compiledEssay].filter(Boolean).join('\n\n');
      }

      const isGroupAct =
        executingActivity.type === 'Trabalho em grupo' ||
        Boolean((executingActivity as any).isGroupWork);

      const groupCsv =
        isGroupAct && selectedGroupNames.length > 0
          ? Array.from(new Set([activeStudent.fullName, ...selectedGroupNames])).join(', ')
          : undefined;

      await onSubmitAnswer(
        executingActivity.id,
        activeStudent.id,
        compiledEssay,
        Math.round(objectiveScore * 100) / 100,
        Math.round(maxObjectiveScore * 100) / 100,
        Math.round(maxEssayScore * 100) / 100,
        selectedObjective,
        groupCsv
      );

      if (typeof window !== 'undefined') {
        localStorage.removeItem(`krono_draft_${activeStudent.id}_${executingActivity.id}`);
      }

      showNotice('Atividade enviada com sucesso! Sua entrega já consta nas atividades concluídas.');
      setExecutingActivity(null);
    } catch {
      showNotice('Erro ao enviar atividade. Seu rascunho está salvo no aparelho.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim() || newPassword.trim().length < 4) {
      setPasswordStatus('A nova senha deve ter pelo menos 4 caracteres.');
      return;
    }
    if (newPassword.trim() !== confirmPassword.trim()) {
      setPasswordStatus('A confirmação de senha não confere.');
      return;
    }
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: activeStudent.id,
          role: 'student',
          newPassword: newPassword.trim(),
        }),
      });
      if (res.ok) {
        setPasswordStatus('Senha atualizada com sucesso!');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordStatus('Não foi possível alterar a senha agora.');
      }
    } catch {
      setPasswordStatus('Erro de conexão ao atualizar senha.');
    }
  };

  // ==========================================================================
  // TELA DE EXECUÇÃO / REVISÃO DE ATIVIDADE SELECIONADA
  // ==========================================================================
  if (executingActivity) {
    const isDebate =
      executingActivity.gameMode === 'debate_paperless' ||
      Boolean(executingActivity.gameData?.debateConfig);
    const isGame = isActivityKronoGame(executingActivity);
    const myExistingSub = mySubmissionsMap.get(executingActivity.id);

    if (isDebate) {
      return (
        <div className="min-h-screen bg-[#09090B] text-zinc-100 p-3 sm:p-6">
          <div className="max-w-5xl mx-auto space-y-4">
            <button
              type="button"
              onClick={() => setExecutingActivity(null)}
              className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-200 flex items-center gap-1.5 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Voltar para Minhas Atividades</span>
            </button>

            <DebatePaperlessView
              activity={executingActivity}
              debateConfig={executingActivity.gameData?.debateConfig}
              student={activeStudent}
              currentStudent={activeStudent}
              students={rosterStudents}
              allStudents={rosterStudents}
              role="student"
              isTeacher={false}
              onSaveActivity={onSaveActivity}
              onUpdateActivity={onUpdateActivity}
              onSubmitAnswer={onSubmitAnswer}
              onClose={() => setExecutingActivity(null)}
            />
          </div>
        </div>
      );
    }

    if (isGame && executingActivity.gameData) {
      return (
        <div className="min-h-screen bg-[#09090B] text-zinc-100 p-3 sm:p-6">
          <div className="max-w-4xl mx-auto space-y-4">
            <button
              type="button"
              onClick={() => setExecutingActivity(null)}
              className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-200 flex items-center gap-1.5 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Voltar para Minhas Atividades</span>
            </button>

            <SafeKronoGamePlayer
              activity={executingActivity}
              gameData={executingActivity.gameData}
              gameMode={executingActivity.gameMode || 'classic'}
              title={executingActivity.title}
              student={activeStudent}
              currentStudent={activeStudent}
              students={rosterStudents}
              onClose={() => setExecutingActivity(null)}
              onFinishGame={async (score: number, groupCsv?: string) => {
                if (onSubmitAnswer) {
                  await onSubmitAnswer(
                    executingActivity.id,
                    activeStudent.id,
                    `[KronoGames • ${executingActivity.title}] Missão concluída com pontuação ${score}.`,
                    score,
                    executingActivity.maxGrade || 10,
                    0,
                    {},
                    groupCsv
                  );
                }
                showNotice('Jogo concluído e pontuação registrada!');
                setExecutingActivity(null);
              }}
            />
          </div>
        </div>
      );
    }

    const rawQuestions: any[] = Array.isArray(executingActivity.questions)
      ? executingActivity.questions
      : [];
    const objQuestions: any[] = rawQuestions.filter((q: any) => q.type !== 'essay');
    const essayQuestions: any[] = [
      ...(Array.isArray((executingActivity as any).essayQuestions)
        ? (executingActivity as any).essayQuestions
        : []),
      ...rawQuestions.filter((q: any) => q.type === 'essay'),
    ];
    const embeddedLinks = [
      ...extractLinksFromText(executingActivity.supportMaterial),
      ...extractLinksFromText(executingActivity.description),
    ];

    const subTotalGrade = myExistingSub
      ? Math.min(
          10,
          Number(myExistingSub.objectiveScore || 0) +
            Number(myExistingSub.essayScore || 0) +
            Number(myExistingSub.extraPoints || 0)
        )
      : null;

    return (
      <div className="min-h-screen bg-background text-foreground pb-24">
        <header className="sticky top-0 z-30 h-14 bg-surface/95 backdrop-blur-md border-b border-border px-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setExecutingActivity(null)}
            className="px-3 py-1.5 rounded-lg bg-background border border-border text-xs font-semibold text-foreground flex items-center gap-1.5 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Voltar</span>
          </button>

          <div className="text-center min-w-0 px-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-blue-400 block">
              Turma {studentTurmaStd} • {executingActivity.type || 'Atividade'}
            </span>
            <h2 className="text-xs sm:text-sm font-bold text-foreground truncate">
              {executingActivity.title}
            </h2>
          </div>

          <span className="px-2.5 py-1 rounded-md bg-blue-500/15 border border-blue-500/30 text-blue-400 font-mono text-xs font-bold">
            Val: {executingActivity.maxGrade || 10} pts
          </span>
        </header>

        <main className="max-w-2xl mx-auto p-4 space-y-5">
          {/* ESPELHO DA ENTREGA REALIZADA PELO ALUNO (SE JÁ FEZ A ATIVIDADE) */}
          {myExistingSub && (
            <section className="p-4 rounded-2xl bg-blue-950/30 border border-blue-500/40 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-500/20 pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0" />
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-blue-300 block">
                      Atividade Concluída pelo Aluno
                    </span>
                    <h3 className="text-sm font-bold text-foreground">
                      Comprovante de Entrega & Correção
                    </h3>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-mono text-blue-300 block">
                    {myExistingSub.submittedAt || 'Registrada'}
                  </span>
                  <span className="px-3 py-1 rounded-lg bg-blue-600 text-white font-mono text-xs font-extrabold inline-block mt-0.5">
                    {myExistingSub.status === 'graded' || (subTotalGrade !== null && subTotalGrade > 0)
                      ? `Nota Final: ${(subTotalGrade ?? 0).toFixed(1)} / ${executingActivity.maxGrade || 10}`
                      : '✓ Entregue (Aguardando Correção)'}
                  </span>
                </div>
              </div>

              {/* Detalhamento de Notas se houver */}
              {(Number(myExistingSub.objectiveScore || 0) > 0 ||
                Number(myExistingSub.essayScore || 0) > 0) && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
                  <div className="p-2.5 rounded-xl bg-background/80 border border-border">
                    <span className="text-[10px] text-muted block">Nota Objetivas</span>
                    <strong className="text-blue-400">
                      {Number(myExistingSub.objectiveScore || 0).toFixed(2)} pts
                    </strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-background/80 border border-border">
                    <span className="text-[10px] text-muted block">Nota Dissertativas</span>
                    <strong className="text-blue-400">
                      {Number(myExistingSub.essayScore || 0).toFixed(2)} pts
                    </strong>
                  </div>
                  {Number(myExistingSub.extraPoints || 0) > 0 && (
                    <div className="p-2.5 rounded-xl bg-background/80 border border-border">
                      <span className="text-[10px] text-muted block">Pontos Extras</span>
                      <strong className="text-sky-400">
                        +{Number(myExistingSub.extraPoints).toFixed(1)} pts
                      </strong>
                    </div>
                  )}
                </div>
              )}

              {myExistingSub.groupMembers && (
                <div className="text-xs text-blue-200">
                  <strong>Equipe / Grupo:</strong>{' '}
                  {Array.isArray(myExistingSub.groupMembers)
                    ? myExistingSub.groupMembers.join(', ')
                    : myExistingSub.groupMembers}
                </div>
              )}

              {myExistingSub.teacherFeedback && (
                <div className="p-3.5 rounded-xl bg-background/90 border border-blue-500/30 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 block">
                    Parecer / Feedback do Professor:
                  </span>
                  <p className="text-xs sm:text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {myExistingSub.teacherFeedback}
                  </p>
                </div>
              )}

              {myExistingSub.essayAnswer && (
                <div className="p-3.5 rounded-xl bg-background/80 border border-border space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">
                    Suas Respostas Registradas:
                  </span>
                  <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed font-mono">
                    {formatSubmissionAnswerForDisplay(myExistingSub.essayAnswer)}
                  </p>
                </div>
              )}
            </section>
          )}

          {/* Material de Apoio e Arquivos do Google Drive nomeados pelo Professor */}
          {(executingActivity.description || executingActivity.supportMaterial) && (
            <section className="p-4 rounded-2xl bg-surface border border-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                  <span>Orientações & Materiais da Aula</span>
                </span>
              </div>

              {executingActivity.description && (
                <p className="text-xs sm:text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {executingActivity.description}
                </p>
              )}

              {executingActivity.supportMaterial && (
                <div className="p-3.5 rounded-xl bg-background border border-border text-xs sm:text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {executingActivity.supportMaterial}
                </div>
              )}

              {embeddedLinks.length > 0 && (
                <div className="space-y-2 pt-1">
                  {embeddedLinks.map((lnk, idx) => (
                    <a
                      key={idx}
                      href={lnk}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full p-3 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-300 text-xs font-bold flex items-center justify-between transition-all"
                    >
                      <span className="flex items-center gap-2 truncate">
                        <Link2 className="w-4 h-4 shrink-0" />
                        <span className="truncate">Abrir Material / Arquivo no Google Drive</span>
                      </span>
                      <ExternalLink className="w-4 h-4 shrink-0" />
                    </a>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Seleção de Equipe em Caixa Suspensa (<select>) */}
          {(executingActivity.type === 'Trabalho em grupo' ||
            Boolean((executingActivity as any).isGroupWork)) && (
            <section className="p-4 rounded-2xl bg-surface border border-border space-y-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-sky-400 block">
                  Atividade em Equipe • Turma {studentTurmaStd}
                </span>
                <h3 className="text-sm font-bold text-foreground">
                  Selecione os Integrantes do seu Grupo
                </h3>
                <p className="text-xs text-muted">
                  Escolha seus colegas na lista suspensa abaixo para que todos recebam a entrega e a nota.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={classmateDropdownValue}
                  onChange={(e) => setClassmateDropdownValue(e.target.value)}
                  className="flex-1 bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-foreground focus:outline-none focus:border-blue-500"
                >
                  <option value="">
                    Selecionar colega da Turma {studentTurmaStd} ({eligibleClassmates.length} disponíveis)...
                  </option>
                  {eligibleClassmates.map((c) => (
                    <option key={c.id} value={c.fullName}>
                      {c.fullName}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!classmateDropdownValue}
                  onClick={() => {
                    if (
                      classmateDropdownValue &&
                      !selectedGroupNames.includes(classmateDropdownValue)
                    ) {
                      setSelectedGroupNames((prev) => [...prev, classmateDropdownValue]);
                      setClassmateDropdownValue('');
                    }
                  }}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>+ Incluir no Grupo</span>
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {selectedGroupNames.map((name) => (
                  <span
                    key={name}
                    className="px-3 py-1 rounded-lg bg-background border border-border text-xs font-semibold text-foreground flex items-center gap-2"
                  >
                    <span>{name}</span>
                    {name !== activeStudent.fullName && (
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedGroupNames((prev) => prev.filter((n) => n !== name))
                        }
                        className="text-muted hover:text-rose-400 cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Questões Objetivas */}
          {objQuestions.length > 0 && (
            <section className="space-y-3.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted px-1">
                Questões Objetivas ({objQuestions.length})
              </h3>
              {objQuestions.map((q: any, qIdx: number) => (
                <div
                  key={q.id || qIdx}
                  className="p-4 rounded-2xl bg-surface border border-border space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold text-blue-400">
                      Questão {qIdx + 1}
                    </span>
                    <span className="text-[11px] font-mono text-muted">
                      {q.points || 1} pt(s)
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm font-medium text-foreground whitespace-pre-wrap leading-relaxed">
                    {q.text || q.question || q.prompt || ''}
                  </p>

                  {q.librasVideoUrl && (
                    <a
                      href={q.librasVideoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/15 text-sky-300 text-xs font-semibold"
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>Assistir Vídeo em Libras</span>
                    </a>
                  )}

                  <div className="space-y-2 pt-1">
                    {(q.options || []).map((optText: string, optIdx: number) => {
                      const isSelected = selectedObjective[q.id] === optIdx;
                      const letter = String.fromCharCode(65 + optIdx);
                      return (
                        <button
                          key={optIdx}
                          type="button"
                          onClick={() =>
                            setSelectedObjective((prev) => ({ ...prev, [q.id]: optIdx }))
                          }
                          className={`w-full p-3 rounded-xl border text-left text-xs sm:text-sm transition-all flex items-start gap-3 cursor-pointer ${
                            isSelected
                              ? 'bg-blue-600/20 border-blue-500 text-foreground font-semibold'
                              : 'bg-background border-border text-muted hover:text-foreground'
                          }`}
                        >
                          <span
                            className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-mono font-bold shrink-0 ${
                              isSelected
                                ? 'bg-blue-600 text-white'
                                : 'bg-surface border border-border text-muted'
                            }`}
                          >
                            {letter}
                          </span>
                          <span className="leading-relaxed">{optText}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </section>
          )}

          {/* Questões Dissertativas */}
          {essayQuestions.length > 0 && (
            <section className="space-y-3.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted px-1">
                Questões Dissertativas ({essayQuestions.length})
              </h3>
              {essayQuestions.map((eq: any, eIdx: number) => (
                <div
                  key={eq.id || eIdx}
                  className="p-4 rounded-2xl bg-surface border border-border space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold text-sky-400">
                      Dissertativa {eIdx + 1}
                    </span>
                    <span className="text-[11px] font-mono text-muted">
                      {eq.points || 2} pt(s)
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm font-medium text-foreground whitespace-pre-wrap leading-relaxed">
                    {eq.text || eq.question || eq.prompt || ''}
                  </p>
                  <textarea
                    rows={5}
                    value={essayResponses[eq.id] || ''}
                    onChange={(e) =>
                      setEssayResponses((prev) => ({ ...prev, [eq.id]: e.target.value }))
                    }
                    placeholder="Digite sua resposta dissertativa com argumentos sociológicos..."
                    className="w-full bg-background border border-border focus:border-blue-500 rounded-xl p-3 text-xs sm:text-sm text-foreground focus:outline-none leading-relaxed"
                  />
                </div>
              ))}
            </section>
          )}

          {/* Campo Geral de Redação / Pesquisa */}
          {(essayQuestions.length === 0 ||
            [
              'Redação',
              'Trabalho',
              'Trabalho em grupo',
              'Projeto de pesquisa',
              'Dinâmica',
              'Recuperação Paralela',
            ].includes(String(executingActivity.type || '')) ||
            objQuestions.length === 0) && (
            <section className="p-4 rounded-2xl bg-surface border border-border space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground">
                  {String(executingActivity.type || '') === 'Redação'
                    ? 'Texto da Redação:'
                    : 'Resposta Dissertativa / Desenvolvimento da Pesquisa:'}
                </label>
                <span className="text-[11px] font-mono text-muted">
                  {generalEssayText.trim().split(/\s+/).filter(Boolean).length} palavras
                </span>
              </div>
              <textarea
                rows={8}
                value={generalEssayText}
                onChange={(e) => setGeneralEssayText(e.target.value)}
                placeholder="Desenvolva aqui sua resposta ou síntese da pesquisa (rascunho salvo automaticamente no aparelho)..."
                className="w-full bg-background border border-border focus:border-blue-500 rounded-xl p-3.5 text-xs sm:text-sm text-foreground focus:outline-none leading-relaxed"
              />
            </section>
          )}

          <div className="pt-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleConfirmSubmitActivity}
              className="w-full py-3.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? 'Enviando Respostas...'
                  : myExistingSub
                  ? 'Atualizar Minha Entrega'
                  : 'Finalizar e Enviar Atividade'}
              </span>
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Lista de atividades conforme o botão de smartphone selecionado
  const displayedActivities = useMemo(() => {
    if (activeNav === 'pending') return pendingActivities;
    if (activeNav === 'completed') return completedActivities;
    if (activeNav === 'games') return kronoGamesActivities;
    return studentActivities;
  }, [
    activeNav,
    pendingActivities,
    completedActivities,
    kronoGamesActivities,
    studentActivities,
  ]);

  // ==========================================================================
  // SHELL PRINCIPAL DO ALUNO (PALETA AZUL SAFIRA + LAYOUT MOBILE NATIVO)
  // ==========================================================================
  return (
    <div className="min-h-screen bg-background text-foreground pb-20 md:pb-12">
      {/* AVISO DE ATUALIZAÇÃO DE VERSÃO PARA O ALUNO */}
      {showVersionUpdateBanner && (
        <div className="bg-blue-600 text-white px-4 py-2.5 shadow-md">
          <div className="max-w-2xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 font-semibold">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>
                Nova atualização disponível no seu portal! Toque em atualizar para sincronizar.
              </span>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={() => handleDismissOrApplyVersionUpdate(true)}
                className="px-3 py-1 rounded-lg bg-white text-blue-700 font-bold flex items-center gap-1 cursor-pointer hover:bg-blue-50"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Atualizar Agora</span>
              </button>
              <button
                type="button"
                onClick={() => handleDismissOrApplyVersionUpdate(false)}
                className="px-2 py-1 rounded-lg bg-blue-700 hover:bg-blue-800 text-white/90 cursor-pointer"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. CABEÇALHO DO ALUNO:
             - Avatar em Círculo Perfeito do Mesmo Tamanho (w-14 h-14 rounded-full)
             - Turma no Topo + Botões de Ação à direita
             - Nome do Aluno POR BAIXO da Turma (estendendo até o final sem cortar) */}
      <header className="sticky top-0 z-30 bg-surface/95 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="max-w-2xl mx-auto space-y-3">
          <div className="flex items-start gap-3.5">
            {/* Avatar em Círculo Perfeito do Mesmo Tamanho do Círculo de Borda */}
            <button
              type="button"
              onClick={() => setActiveNav('perfil')}
              className="relative w-14 h-14 rounded-full ring-2 ring-blue-500/70 bg-zinc-900 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer shadow-md"
              title="Meu Perfil"
            >
              {activeStudent.avatarUrl ? (
                <img
                  src={activeStudent.avatarUrl}
                  alt={activeStudent.fullName}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="font-mono font-extrabold text-base text-blue-400">
                  {(activeStudent.fullName || 'AL')
                    .trim()
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()}
                </span>
              )}
            </button>

            {/* Coluna Direita: Linha 1 = Turma + Ações | Linha 2 = Nome Inteiro por Baixo da Turma */}
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="px-2.5 py-0.5 rounded-lg bg-blue-500/15 border border-blue-500/35 text-blue-400 font-mono text-xs font-extrabold">
                  Turma {studentTurmaStd}
                </span>

                <div className="flex items-center gap-1.5 shrink-0">
                  {onToggleTheme && (
                    <button
                      type="button"
                      onClick={onToggleTheme}
                      className="p-2 rounded-xl bg-background hover:bg-surface-hover border border-border text-muted hover:text-foreground cursor-pointer"
                      title="Alternar tema Claro / Escuro"
                    >
                      {themeMode === 'light' ? (
                        <Moon className="w-4 h-4" />
                      ) : (
                        <Sun className="w-4 h-4" />
                      )}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleOpenChat}
                    className="relative p-2 rounded-xl bg-background hover:bg-surface-hover border border-border text-muted hover:text-foreground cursor-pointer"
                    title="Mensagens do Professor"
                  >
                    <MessageSquare className="w-4 h-4" />
                    {unreadMessagesCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-blue-500 text-white font-mono text-[10px] font-bold flex items-center justify-center shadow-xs">
                        {unreadMessagesCount}
                      </span>
                    )}
                  </button>

                  {onLogout && (
                    <button
                      type="button"
                      onClick={onLogout}
                      className="p-2 rounded-xl bg-background hover:bg-rose-500/15 border border-border text-muted hover:text-rose-400 cursor-pointer"
                      title="Sair da conta"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Nome do Aluno POR BAIXO da Turma, estendendo até o final sem cortar */}
              <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-foreground leading-snug break-words">
                {activeStudent.fullName}
              </h1>
            </div>
          </div>

          {/* 2. BARRA DE BOTÕES ESTILO APLICATIVO DE SMARTPHONE LOGO ABAIXO DO NOME
                 (Sem círculo em volta — apenas Ícone em cima e Nome embaixo) */}
          <div className="pt-1 border-t border-border/70 grid grid-cols-6 gap-1">
            {[
              {
                id: 'feed' as const,
                label: 'Todas',
                icon: Home,
                count: studentActivities.length,
              },
              {
                id: 'pending' as const,
                label: 'Pendentes',
                icon: Clock,
                count: pendingActivities.length,
              },
              {
                id: 'completed' as const,
                label: 'Feitas',
                icon: CheckCheck,
                count: completedActivities.length,
              },
              {
                id: 'games' as const,
                label: 'Jogos',
                icon: Gamepad2,
                count: kronoGamesActivities.length,
              },
              {
                id: 'boletim' as const,
                label: 'Boletim',
                icon: BarChart3,
                count: 0,
              },
              {
                id: 'perfil' as const,
                label: 'Perfil',
                icon: User,
                count: 0,
              },
            ].map((btn) => {
              const IconComp = btn.icon;
              const isSelected = activeNav === btn.id;
              return (
                <button
                  key={btn.id}
                  type="button"
                  onClick={() => setActiveNav(btn.id)}
                  className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer ${
                    isSelected
                      ? 'bg-blue-500/15 text-blue-400 font-bold'
                      : 'text-muted hover:text-foreground hover:bg-background/60'
                  }`}
                >
                  <div className="relative flex items-center justify-center">
                    <IconComp
                      className={`w-5 h-5 ${isSelected ? 'text-blue-400' : ''}`}
                    />
                    {btn.count > 0 && (
                      <span
                        className={`ml-1 text-[10px] font-mono font-bold ${
                          isSelected ? 'text-blue-300' : 'text-muted'
                        }`}
                      >
                        {btn.count}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] leading-none tracking-tight truncate max-w-full">
                    {btn.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Notificação Toast */}
      {toastMsg && (
        <div className="max-w-2xl mx-auto px-4 pt-3">
          <div className="p-3 rounded-xl bg-blue-950/90 border border-blue-500/40 text-blue-100 text-xs font-medium flex items-center justify-between">
            <span>{toastMsg}</span>
            <button onClick={() => setToastMsg(null)} className="text-blue-300 ml-2">
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 3. CONTEÚDO PRINCIPAL */}
      <main className="max-w-2xl mx-auto p-3 sm:p-4 space-y-4">
        {/* ===================================================================
            ABAS DE ATIVIDADES: TODAS ('feed'), PENDENTES ('pending'),
            FEITAS ('completed') E KRONOGAMES ('games')
           =================================================================== */}
        {(activeNav === 'feed' ||
          activeNav === 'pending' ||
          activeNav === 'completed' ||
          activeNav === 'games') && (
          <div className="space-y-3">
            {/* Resumo Rápido de Progresso do Aluno */}
            <div className="p-3.5 rounded-2xl bg-surface border border-border flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="font-bold text-foreground">
                  {activeNav === 'pending'
                    ? `Atividades Pendentes (${pendingActivities.length})`
                    : activeNav === 'completed'
                    ? `Atividades Já Feitas pelo Aluno (${completedActivities.length})`
                    : activeNav === 'games'
                    ? `KronoGames & Debates (${kronoGamesActivities.length})`
                    : `Todas as Atividades da Turma ${studentTurmaStd} (${studentActivities.length})`}
                </span>
              </div>
              <span className="font-mono text-blue-400 font-bold">
                {completedActivities.length} concluída(s)
              </span>
            </div>

            {displayedActivities.length === 0 ? (
              <div className="p-10 rounded-2xl bg-surface border border-border text-center space-y-2">
                <CheckCircle2 className="w-7 h-7 text-blue-400 mx-auto" />
                <p className="text-sm font-bold text-foreground">
                  Nenhuma atividade listada nesta categoria.
                </p>
                <p className="text-xs text-muted">
                  Toque nos botões acima para alternar entre Todas, Pendentes e Feitas.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {displayedActivities.map((act) => {
                  const sub = mySubmissionsMap.get(act.id);
                  const isGame = isActivityKronoGame(act);
                  const isDebate =
                    act.gameMode === 'debate_paperless' ||
                    Boolean(act.gameData?.debateConfig);
                  const actLinks = [
                    ...extractLinksFromText(act.supportMaterial),
                    ...extractLinksFromText(act.description),
                  ];
                  const hasGrade =
                    sub &&
                    (sub.status === 'graded' ||
                      Number(sub.objectiveScore || 0) > 0 ||
                      Number(sub.essayScore || 0) > 0);
                  const totalGrade = sub
                    ? Math.min(
                        10,
                        Number(sub.objectiveScore || 0) +
                          Number(sub.essayScore || 0) +
                          Number(sub.extraPoints || 0)
                      )
                    : null;

                  return (
                    <article
                      key={act.id}
                      className={`rounded-2xl bg-surface border transition-all overflow-hidden ${
                        sub
                          ? 'border-blue-500/40'
                          : 'border-border hover:border-zinc-700'
                      }`}
                    >
                      {/* Cabeçalho do Card */}
                      <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                              sub
                                ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                                : isGame
                                ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                                : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                            }`}
                          >
                            {sub ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : isGame ? (
                              <Gamepad2 className="w-4 h-4" />
                            ) : (
                              <FileText className="w-4 h-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-foreground truncate">
                                {act.subject || 'Sociologia'}
                              </span>
                              <span className="text-muted">•</span>
                              <span className="text-[11px] font-medium text-muted truncate">
                                {isDebate
                                  ? 'Debate Sem Papel'
                                  : isGame
                                  ? 'KronoGames'
                                  : act.type || 'Atividade'}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-muted block">
                              Turma {studentTurmaStd} •{' '}
                              {sub?.submittedAt
                                ? `Entregue em: ${sub.submittedAt}`
                                : `Prazo: ${act.dueDate || act.deadline || 'Em aberto'}`}
                            </span>
                          </div>
                        </div>

                        {sub ? (
                          <span className="px-2.5 py-1 rounded-md bg-blue-500/15 border border-blue-500/35 text-blue-300 font-mono text-[11px] font-bold shrink-0">
                            {hasGrade && totalGrade !== null
                              ? `Nota: ${totalGrade.toFixed(1)}`
                              : '✓ Já Feita'}
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono text-[11px] font-bold shrink-0">
                            Pendente
                          </span>
                        )}
                      </div>

                      {/* Corpo do Card */}
                      <div className="p-4 space-y-3">
                        <h3 className="text-base font-bold text-foreground leading-snug">
                          {act.title}
                        </h3>

                        {act.description && (
                          <p className="text-xs sm:text-sm text-muted line-clamp-3 whitespace-pre-wrap leading-relaxed">
                            {act.description}
                          </p>
                        )}

                        {/* Links do Google Drive nomeados pelo Professor dentro da Atividade */}
                        {actLinks.length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            {actLinks.map((lnk, lIdx) => (
                              <a
                                key={lIdx}
                                href={lnk}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2.5 rounded-xl bg-background hover:bg-surface-hover border border-blue-500/30 flex items-center justify-between gap-2 text-xs font-semibold text-blue-400 transition-colors"
                              >
                                <span className="flex items-center gap-2 truncate">
                                  <Link2 className="w-3.5 h-3.5 shrink-0" />
                                  <span className="truncate">
                                    Abrir Arquivo / Material no Google Drive
                                  </span>
                                </span>
                                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                              </a>
                            ))}
                          </div>
                        )}

                        {sub?.teacherFeedback && (
                          <div className="p-3 rounded-xl bg-blue-950/25 border border-blue-500/30 text-xs text-blue-100">
                            <strong className="text-blue-400 block mb-0.5">
                              Feedback do Professor:
                            </strong>
                            {sub.teacherFeedback}
                          </div>
                        )}

                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => handleOpenActivity(act)}
                            className={`w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                              sub
                                ? 'bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/35 text-blue-300'
                                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-xs'
                            }`}
                          >
                            {sub ? (
                              <>
                                <CheckCircle2 className="w-4 h-4 text-blue-400" />
                                <span>Ver Minha Entrega, Respostas & Correção</span>
                              </>
                            ) : isDebate ? (
                              <>
                                <Users className="w-4 h-4" />
                                <span>Entrar na Bancada • Debate Sem Papel</span>
                              </>
                            ) : isGame ? (
                              <>
                                <Play className="w-4 h-4 fill-current" />
                                <span>Jogar Agora • KronoGames</span>
                              </>
                            ) : (
                              <>
                                <span>Iniciar / Responder Atividade</span>
                                <ChevronRight className="w-4 h-4" />
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===================================================================
            ABA BOLETIM & HISTÓRICO COMPLETO DE ATIVIDADES FEITAS
           =================================================================== */}
        {activeNav === 'boletim' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2.5">
              <div className="p-3.5 rounded-2xl bg-surface border border-border text-center">
                <span className="text-[10px] font-mono uppercase text-muted block">Média</span>
                <span className="text-xl font-mono font-bold text-blue-400 mt-0.5 block">
                  {averageGrade || '—'}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-surface border border-border text-center">
                <span className="text-[10px] font-mono uppercase text-muted block">Feitas</span>
                <span className="text-xl font-mono font-bold text-foreground mt-0.5 block">
                  {completedActivities.length}/{studentActivities.length}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-surface border border-border text-center">
                <span className="text-[10px] font-mono uppercase text-muted block">Turma</span>
                <span className="text-xl font-mono font-bold text-sky-400 mt-0.5 block">
                  {studentTurmaStd}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {studentActivities.map((act) => {
                const sub = mySubmissionsMap.get(act.id);
                const hasScore =
                  sub &&
                  (sub.status === 'graded' ||
                    Number(sub.objectiveScore || 0) > 0 ||
                    Number(sub.essayScore || 0) > 0);
                const total = sub
                  ? Math.min(
                      10,
                      Number(sub.objectiveScore || 0) +
                        Number(sub.essayScore || 0) +
                        Number(sub.extraPoints || 0)
                    )
                  : null;

                return (
                  <div
                    key={act.id}
                    onClick={() => handleOpenActivity(act)}
                    className="p-4 rounded-2xl bg-surface hover:bg-surface-hover border border-border space-y-2.5 cursor-pointer transition-all"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono uppercase text-muted block">
                          {act.type || 'Avaliação'} •{' '}
                          {sub?.submittedAt || act.dueDate || act.deadline || ''}
                        </span>
                        <h4 className="text-sm font-bold text-foreground">{act.title}</h4>
                      </div>
                      {sub ? (
                        <span className="px-3 py-1 rounded-lg bg-blue-500/15 border border-blue-500/35 text-blue-300 font-mono text-xs font-bold">
                          {hasScore && total !== null
                            ? `${total.toFixed(1)} / 10`
                            : '✓ Entregue'}
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-border text-muted font-mono text-xs">
                          Pendente
                        </span>
                      )}
                    </div>

                    {sub?.teacherFeedback && (
                      <div className="p-3 rounded-xl bg-background border border-border text-xs text-foreground whitespace-pre-wrap">
                        <strong className="text-blue-400 block mb-1">
                          Feedback do Professor:
                        </strong>
                        {sub.teacherFeedback}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===================================================================
            ABA PERFIL & SEGURANÇA
           =================================================================== */}
        {activeNav === 'perfil' && (
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-surface border border-border flex items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="px-2.5 py-0.5 rounded-md bg-blue-500/15 text-blue-400 font-mono text-xs font-bold">
                  Turma {studentTurmaStd}
                </span>
                <h2 className="text-lg font-bold text-foreground">{activeStudent.fullName}</h2>
                <p className="text-xs font-mono text-muted">
                  Matrícula / ID: {activeStudent.matricula || activeStudent.id}
                </p>
              </div>
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="px-4 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sair</span>
                </button>
              )}
            </div>

            <form
              onSubmit={handlePasswordChange}
              className="p-5 rounded-2xl bg-surface border border-border space-y-3"
            >
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold text-foreground">Alterar Minha Senha</h3>
              </div>
              <input
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nova senha (mín. 4 caracteres)"
                className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-foreground"
              />
              <input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirmar nova senha"
                className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-foreground"
              />
              {passwordStatus && (
                <p className="text-xs text-blue-400 font-medium">{passwordStatus}</p>
              )}
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer"
              >
                Salvar Nova Senha
              </button>
            </form>
          </div>
        )}
      </main>

      {/* 4. GAVETA DE MENSAGENS COM O PROFESSOR (ZERA NOTIFICAÇÕES AO ABRIR) */}
      {isChatOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-surface border border-border rounded-t-2xl sm:rounded-2xl w-full max-w-md h-[80vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase text-blue-400 block">
                  Mensagem Direta • Turma {studentTurmaStd}
                </span>
                <h3 className="text-sm font-bold text-foreground">
                  Falar com {teacher?.name || 'Professor Gilson'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsChatOpen(false)}
                className="p-1.5 rounded-lg bg-background text-muted hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-2.5">
              {myMessages.length === 0 ? (
                <p className="text-xs text-muted text-center py-10">
                  Envie sua dúvida diretamente ao professor.
                </p>
              ) : (
                myMessages.map((msg: any, idx: number) => {
                  const isMine =
                    msg.senderId === activeStudent.id || msg.senderRole === 'student';
                  return (
                    <div
                      key={msg.id || idx}
                      className={`max-w-[85%] p-3 rounded-2xl text-xs ${
                        isMine
                          ? 'ml-auto bg-blue-600 text-white font-medium'
                          : 'mr-auto bg-background border border-border text-foreground'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.text || msg.content}</p>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-3 border-t border-border flex items-center gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && chatInput.trim() && onSendMessage) {
                    onSendMessage(
                      {
                        threadId: activeStudent.id,
                        senderId: activeStudent.id,
                        senderName: activeStudent.fullName,
                        senderRole: 'student',
                        senderAvatar: activeStudent.avatarUrl,
                        recipientId: teacher?.id || 'teacher',
                        recipientName: teacher?.name || 'Professor Gilson',
                        content: chatInput.trim(),
                      },
                      teacher?.id
                    );
                    setChatInput('');
                  }
                }}
                placeholder="Escreva uma mensagem..."
                className="flex-1 bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => {
                  if (chatInput.trim() && onSendMessage) {
                    onSendMessage(
                      {
                        threadId: activeStudent.id,
                        senderId: activeStudent.id,
                        senderName: activeStudent.fullName,
                        senderRole: 'student',
                        senderAvatar: activeStudent.avatarUrl,
                        recipientId: teacher?.id || 'teacher',
                        recipientName: teacher?.name || 'Professor Gilson',
                        content: chatInput.trim(),
                      },
                      teacher?.id
                    );
                    setChatInput('');
                  }
                }}
                className="p-2.5 rounded-xl bg-blue-600 text-white cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentPortalView;
