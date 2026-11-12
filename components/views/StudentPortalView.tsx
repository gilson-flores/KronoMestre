import { StudentActivityExecutionView } from "@/components/views/student-portal/StudentActivityExecutionView";
import { StudentMainAndDrawer } from "@/components/views/student-portal/StudentMainAndDrawer";
import { StudentHeaderNav } from "@/components/views/student-portal/StudentHeaderNav";
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
  KeyRound,
  Link2,
  Play,
  RefreshCw,
  CheckCheck,
  Sparkles,
  Camera,
  Check,
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

import { STUDENT_PORTAL_VERSION, AVATAR_GALLERY_PRESETS, normalizePersonName, extractLinksFromText, formatSubmissionAnswerForDisplay, findStudentSubmissionInActivity } from "@/components/views/student-portal/studentPortalUtils";

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
  onUpdateAvatar?: (studentId: string, newAvatarUrl: string) => void | Promise<void>;
  onUpdateStudentAvatar?: (studentId: string, newAvatarUrl: string) => void | Promise<void>;
  onUpdateStudent?: (updatedStudent: StudentUser) => void | Promise<void>;
  onLogout?: () => void;
  themeMode?: 'dark' | 'light' | string;
  onToggleTheme?: () => void;
  [key: string]: any;
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
  onUpdateAvatar,
  onUpdateStudentAvatar,
  onUpdateStudent,
  onLogout,
  themeMode = 'dark',
  onToggleTheme,
}) => {
  // ==========================================================================
  // REGRA DE OURO DO REACT: TODOS OS HOOKS DECLARADOS NO TOPO ANTES DE QUALQUER RETURN!
  // (Isso impede 100% a ocorrência do Minified React error #300)
  // ==========================================================================
  const baseStudent: StudentUser = useMemo(() => {
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

  // Estado local de avatar para atualização instantânea ao trocar no perfil
  const [customAvatarUrl, setCustomAvatarUrl] = useState<string>(baseStudent.avatarUrl || '');
  const [selectedAvatarDraft, setSelectedAvatarDraft] = useState<string>(
    baseStudent.avatarUrl || AVATAR_GALLERY_PRESETS[0].url
  );
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && baseStudent.id) {
      const savedLocalAvatar = localStorage.getItem(`krono_avatar_${baseStudent.id}`);
      if (savedLocalAvatar) {
        setCustomAvatarUrl(savedLocalAvatar);
        setSelectedAvatarDraft(savedLocalAvatar);
        return;
      }
    }
    if (baseStudent.avatarUrl) {
      setCustomAvatarUrl(baseStudent.avatarUrl);
      setSelectedAvatarDraft(baseStudent.avatarUrl);
    }
  }, [baseStudent.id, baseStudent.avatarUrl]);

  const activeStudent: StudentUser = useMemo(() => {
    return {
      ...baseStudent,
      avatarUrl: customAvatarUrl || baseStudent.avatarUrl || '',
    };
  }, [baseStudent, customAvatarUrl]);

  const studentTurmaStd = useMemo(() => {
    return standardizeTurmaCode(activeStudent.turma) || activeStudent.turma || '101';
  }, [activeStudent.turma]);

  const [activeNav, setActiveNav] = useState<
    'feed' | 'pending' | 'completed' | 'games' | 'boletim' | 'perfil'
  >('feed');

  const [showVersionUpdateBanner, setShowVersionUpdateBanner] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const seenVersion = localStorage.getItem('krono_student_seen_version');
      if (!seenVersion) {
        // Primeiro acesso neste navegador: grava a versao atual silenciosamente sem exibir banner falso
        localStorage.setItem('krono_student_seen_version', STUDENT_PORTAL_VERSION);
      }
    } catch {}
  }, []);

  const [executingActivity, setExecutingActivity] = useState<Activity | null>(null);
  const [selectedObjective, setSelectedObjective] = useState<{ [qId: string]: number }>({});
  const [essayResponses, setEssayResponses] = useState<{ [qId: string]: string }>({});
  const [generalEssayText, setGeneralEssayText] = useState<string>('');
  const [selectedGroupNames, setSelectedGroupNames] = useState<string[]>([]);
  const [classmateDropdownValue, setClassmateDropdownValue] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [seenMessageKeys, setSeenMessageKeys] = useState<string[]>([]);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null);

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

  // Vinculação completa das atividades e entregas já feitas pelo aluno
  const { studentActivities, mySubmissionsMap } = useMemo(() => {
    const isPNEStudent = activeStudent.tag && activeStudent.tag !== 'REGULAR';
    const subMap = new Map<string, any>();
    const list: Activity[] = [];

    (Array.isArray(activities) ? activities : []).forEach((act) => {
      if (!act) return;

      const mySub = findStudentSubmissionInActivity(act, activeStudent);
      if (mySub) {
        subMap.set(act.id, mySub);
        list.push({
          ...act,
          turma: studentTurmaStd,
        });
        return;
      }

      if (
        (act.status as string) === 'archived' ||
        act.status === 'Inativo' ||
        (act as any).isArchived
      ) {
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

  // IMPORTANTE: displayedActivities declarado AQUI NO TOPO (antes de qualquer return condicional!)
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

  // Controle de Mensagens Lidas
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

  // ==========================================================================
  // HANDLERS DE AÇÃO (AVATAR, ATIVIDADES, VERSÃO E SENHA)
  // ==========================================================================
  const handleSaveNewAvatar = async (urlToSave?: string) => {
    const finalUrl = (urlToSave ?? selectedAvatarDraft).trim();
    if (!finalUrl) return;
    setIsSavingAvatar(true);

    try {
      setCustomAvatarUrl(finalUrl);
      setSelectedAvatarDraft(finalUrl);

      if (typeof window !== 'undefined') {
        localStorage.setItem(`krono_avatar_${activeStudent.id}`, finalUrl);
        // Atualiza também na sessão ativa do navegador para persistir após F5
        const activeUid = sessionStorage.getItem('current_active_user_id') || '';
        const sessionKey = activeUid ? `tenant_${activeUid}_active_session` : 'active_session';
        const rawSession = sessionStorage.getItem(sessionKey);
        if (rawSession) {
          const parsed = JSON.parse(rawSession);
          if (parsed.studentData) {
            parsed.studentData.avatarUrl = finalUrl;
            sessionStorage.setItem(sessionKey, JSON.stringify(parsed));
          }
        }
      }

      if (onUpdateAvatar) await onUpdateAvatar(activeStudent.id, finalUrl);
      if (onUpdateStudentAvatar) await onUpdateStudentAvatar(activeStudent.id, finalUrl);
      if (onUpdateStudent) {
        await onUpdateStudent({ ...activeStudent, avatarUrl: finalUrl });
      }

      // Persiste também na API de estudantes
      await fetch('/api/students', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeStudent.id,
          studentId: activeStudent.id,
          matricula: activeStudent.matricula,
          avatarUrl: finalUrl,
        }),
      }).catch(() => {});

      showNotice('Seu novo avatar foi salvo e atualizado com sucesso!');
    } catch {
      showNotice('Avatar atualizado no seu perfil!');
    } finally {
      setIsSavingAvatar(false);
    }
  };

  const handleUploadAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setSelectedAvatarDraft(reader.result);
        handleSaveNewAvatar(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

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
      const rawSelObj = existingSub.selectedObjectiveAnswers;
      setSelectedObjective(
        rawSelObj && typeof rawSelObj === 'object' && !Array.isArray(rawSelObj) ? rawSelObj : {}
      );
      setGeneralEssayText(formatSubmissionAnswerForDisplay(existingSub.essayAnswer));
      setEssayResponses({});
      if (existingSub.groupMembers) {
        const members = Array.isArray(existingSub.groupMembers)
          ? existingSub.groupMembers.map((n: any) => String(n).trim()).filter(Boolean)
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

      showNotice('Atividade enviada com sucesso! Sua entrega já consta nas Atividades Feitas.');
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
  // RENDERIZAÇÃO CONDICIONAL DA ATIVIDADE / CORREÇÃO (AGORA APÓS TODOS OS HOOKS!)
  // ==========================================================================
  if (executingActivity) {
    return (
      <StudentActivityExecutionView
        executingActivity={executingActivity} setExecutingActivity={setExecutingActivity}
        mySubmissionsMap={mySubmissionsMap} activeStudent={activeStudent}
        rosterStudents={rosterStudents} onSaveActivity={onSaveActivity}
        onUpdateActivity={onUpdateActivity} onSubmitAnswer={onSubmitAnswer}
        showNotice={showNotice} studentTurmaStd={studentTurmaStd}
        classmateDropdownValue={classmateDropdownValue} setClassmateDropdownValue={setClassmateDropdownValue}
        eligibleClassmates={eligibleClassmates} selectedGroupNames={selectedGroupNames}
        setSelectedGroupNames={setSelectedGroupNames} selectedObjective={selectedObjective}
        setSelectedObjective={setSelectedObjective} essayResponses={essayResponses}
        setEssayResponses={setEssayResponses} generalEssayText={generalEssayText}
        setGeneralEssayText={setGeneralEssayText} isSubmitting={isSubmitting}
        handleConfirmSubmitActivity={handleConfirmSubmitActivity}
      />
    );
  }

  // ==========================================================================
  // SHELL PRINCIPAL DO ALUNO
  // ==========================================================================
  return (
    <div className="min-h-screen bg-background text-foreground pb-20 md:pb-12">
      <StudentHeaderNav
        showVersionUpdateBanner={showVersionUpdateBanner}
        handleDismissOrApplyVersionUpdate={handleDismissOrApplyVersionUpdate}
        activeStudent={activeStudent} studentTurmaStd={studentTurmaStd}
        setActiveNav={setActiveNav} activeNav={activeNav}
        onToggleTheme={onToggleTheme} themeMode={themeMode}
        handleOpenChat={handleOpenChat} unreadMessagesCount={unreadMessagesCount}
        onLogout={onLogout} studentActivities={studentActivities}
        pendingActivities={pendingActivities} completedActivities={completedActivities}
        kronoGamesActivities={kronoGamesActivities}
      />

      {/* Notificação Toast */}
      {toastMsg && (
        <div className="max-w-2xl mx-auto px-4 pt-3">
          <div className="p-3 rounded-xl bg-emerald-950/90 border border-emerald-800/70 text-emerald-100/90 text-xs font-medium flex items-center justify-between">
            <span>{toastMsg}</span>
            <button onClick={() => setToastMsg(null)} className="text-emerald-200/90 ml-2">
              ✕
            </button>
          </div>
        </div>
      )}

      <StudentMainAndDrawer
        activeNav={activeNav} pendingActivities={pendingActivities}
        completedActivities={completedActivities} kronoGamesActivities={kronoGamesActivities}
        studentTurmaStd={studentTurmaStd} studentActivities={studentActivities}
        displayedActivities={displayedActivities} mySubmissionsMap={mySubmissionsMap}
        handleOpenActivity={handleOpenActivity} averageGrade={averageGrade}
        activeStudent={activeStudent} onLogout={onLogout}
        handleUploadAvatarFile={handleUploadAvatarFile} selectedAvatarDraft={selectedAvatarDraft}
        setSelectedAvatarDraft={setSelectedAvatarDraft} isSavingAvatar={isSavingAvatar}
        handleSaveNewAvatar={handleSaveNewAvatar} handlePasswordChange={handlePasswordChange}
        newPassword={newPassword} setNewPassword={setNewPassword}
        confirmPassword={confirmPassword} setConfirmPassword={setConfirmPassword}
        passwordStatus={passwordStatus} isChatOpen={isChatOpen}
        setIsChatOpen={setIsChatOpen} teacher={teacher}
        myMessages={myMessages} chatInput={chatInput}
        setChatInput={setChatInput} onSendMessage={onSendMessage}
      />
    </div>
  );
};

export default StudentPortalView;
