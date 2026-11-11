'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Activity, StudentUser, TeacherUser } from '@/lib/types';
import {
  Home,
  FolderOpen,
  Gamepad2,
  BarChart3,
  User,
  ExternalLink,
  BookOpen,
  Clock,
  CheckCircle2,
  AlertCircle,
  Send,
  MessageSquare,
  LogOut,
  Sun,
  Moon,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Lock,
  Users,
  UserPlus,
  X,
  FileText,
  Video,
  Award,
  Search,
  KeyRound,
  Link2,
  Play,
} from 'lucide-react';
import {
  standardizeTurmaCode,
  doesItemMatchStudentTurma,
  getEligibleClassmatesForGroup,
  isSameStudentTurma,
} from '@/lib/groupActivityUtils';
import { isActivityKronoGame, isActivityAdapted } from '@/lib/studentUtils';
import { DebatePaperlessView } from '@/components/views/DebatePaperlessView';
import { KronoGamePlayer } from '@/components/views/KronoGamePlayer';

const SafeKronoGamePlayer: any = KronoGamePlayer;

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

interface NormalizedRepoItem {
  id: string;
  title: string;
  url: string;
  turma: string;
  category: string;
  source: 'library' | 'activity';
}

const DEFAULT_FALLBACK_LIBRARY: NormalizedRepoItem[] = [
  {
    id: 'lib-default-sociologia',
    title: 'Material didático Sociologia em movimento',
    url: 'https://drive.google.com/file/d/19-AZO-iB25-ZieEAI4Lm__FIoDwj_ie_/view?usp=drivesdk',
    turma: 'TODAS',
    category: 'Livro Didático • Google Drive',
    source: 'library',
  },
];

function extractLinksFromText(text?: string | null): string[] {
  if (!text) return [];
  const matches = text.match(/https?:\/\/[^\s)"'<>]+/gi);
  return matches ? Array.from(new Set(matches)) : [];
}

export const StudentPortalView: React.FC<StudentPortalViewProps> = ({
  student: studentProp,
  currentStudent: currentStudentProp,
  students = [],
  allStudents = [],
  teacher,
  activities = [],
  libraryItems: libraryItemsProp = [],
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
        turma: '201',
        tag: 'REGULAR',
        avatarUrl: '',
        xp: 100,
        level: 1,
      }
    );
  }, [studentProp, currentStudentProp]);

  // Turma padronizada ("201" ou "2002")
  const studentTurmaStd = useMemo(() => {
    return standardizeTurmaCode(activeStudent.turma) || activeStudent.turma || '201';
  }, [activeStudent.turma]);

  // Abas principais da Bottom Bar (InstaFlow + Linear)
  const [activeNav, setActiveNav] = useState<
    'feed' | 'repositorio' | 'games' | 'boletim' | 'perfil'
  >('feed');
  const [feedFilter, setFeedFilter] = useState<'all' | 'pending' | 'games' | 'completed'>('all');
  const [repoSearch, setRepoSearch] = useState('');

  // Estados de Execução de Atividade / Jogo / Chat / Troca de Senha
  const [executingActivity, setExecutingActivity] = useState<Activity | null>(null);
  const [selectedObjective, setSelectedObjective] = useState<{ [qId: string]: number }>({});
  const [essayResponses, setEssayResponses] = useState<{ [qId: string]: string }>({});
  const [generalEssayText, setGeneralEssayText] = useState<string>('');
  const [selectedGroupNames, setSelectedGroupNames] = useState<string[]>([]);
  const [classmateDropdownValue, setClassmateDropdownValue] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Chat Direct Drawer & Troca de Senha
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
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

  // Itens da Biblioteca buscados da API + prop
  const [fetchedLibrary, setFetchedLibrary] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/library')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && Array.isArray(d.items)) {
          setFetchedLibrary(d.items);
        } else if (Array.isArray(d)) {
          setFetchedLibrary(d);
        }
      })
      .catch(() => {});

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
  // FILTRAGEM RIGOROSA DE ATIVIDADES DA TURMA DO ALUNO
  // ==========================================================================
  const studentActivities = useMemo(() => {
    const isPNEStudent = activeStudent.tag && activeStudent.tag !== 'REGULAR';

    return activities
      .filter((act) => {
        if ((act.status as string) === 'archived' || act.status === 'Inativo' || (act as any).isArchived) return false;
        const rawTurma = (act as any)._originalTurmaScope || act.turma || 'TODAS';
        if (!doesItemMatchStudentTurma(rawTurma, activeStudent.turma)) return false;

        // Se for atividade adaptada (AEE), mostra apenas para alunos PNE (ou se foi atribuída a ele)
        if (isActivityAdapted(act) && !isPNEStudent) {
          const hasSub = (act.submissions || []).some((s) => s.studentId === activeStudent.id);
          if (!hasSub) return false;
        }
        return true;
      })
      .map((act) => ({
        ...act,
        // Exibe apenas a turma padronizada do aluno ("201" ou "2002")
        turma: studentTurmaStd,
      }));
  }, [activities, activeStudent, studentTurmaStd]);

  // Mapa de submissões do próprio aluno
  const mySubmissionsMap = useMemo(() => {
    const map = new Map<string, any>();
    studentActivities.forEach((act) => {
      const sub = (act.submissions || []).find(
        (s) =>
          s.studentId === activeStudent.id ||
          (Boolean(activeStudent.matricula) && s.matricula === activeStudent.matricula) ||
          (s.groupMembers &&
            s.groupMembers
              .toLowerCase()
              .split(',')
              .map((n: string) => n.trim())
              .includes((activeStudent.fullName || '').toLowerCase().trim()))
      );
      if (sub) map.set(act.id, sub);
    });
    return map;
  }, [studentActivities, activeStudent]);

  // ==========================================================================
  // REPOSITÓRIO UNIFICADO DA TURMA (BIBLIOTECA + LINKS EXTRAÍDOS DAS AULAS)
  // ==========================================================================
  const repositoryItems: NormalizedRepoItem[] = useMemo(() => {
    const combinedRaw = [
      ...(Array.isArray(libraryItemsProp) ? libraryItemsProp : []),
      ...(Array.isArray(fetchedLibrary) ? fetchedLibrary : []),
    ];

    const seenUrls = new Set<string>();
    const list: NormalizedRepoItem[] = [];

    combinedRaw.forEach((raw, idx) => {
      if (!raw) return;
      const url = String(
        raw.url || raw.link || raw.LINK || raw.driveUrl || raw.href || ''
      ).trim();
      if (!url) return;

      const itemTurma = String(
        raw.turma || raw.turmas || raw.TURMAS || raw.targetTurma || 'TODAS'
      ).trim();

      if (!doesItemMatchStudentTurma(itemTurma, activeStudent.turma)) return;

      const key = url.toLowerCase();
      if (seenUrls.has(key)) return;
      seenUrls.add(key);

      list.push({
        id: String(raw.id || `repo-lib-${idx}`),
        title: String(
          raw.title || raw.titulo || raw.TITULO || raw.name || 'Material Didático da Turma'
        ).trim(),
        url,
        turma: itemTurma.toUpperCase() === 'TODAS' ? `Turma ${studentTurmaStd}` : studentTurmaStd,
        category: String(raw.category || raw.type || 'Google Drive • Repositório').trim(),
        source: 'library',
      });
    });

    // Extrai também links de apoio colados dentro das atividades da turma
    studentActivities.forEach((act) => {
      const links = [
        ...extractLinksFromText(act.supportMaterial),
        ...extractLinksFromText(act.description),
        ...extractLinksFromText((act as any).driveUrl),
      ];
      links.forEach((lnk, lIdx) => {
        const key = lnk.toLowerCase();
        if (seenUrls.has(key)) return;
        seenUrls.add(key);
        list.push({
          id: `repo-act-${act.id}-${lIdx}`,
          title: `Anexo da Aula: ${act.title}`,
          url: lnk,
          turma: `Turma ${studentTurmaStd}`,
          category: 'Material de Aula / Atividade',
          source: 'activity',
        });
      });
    });

    if (list.length === 0) {
      return DEFAULT_FALLBACK_LIBRARY.map((d) => ({
        ...d,
        turma: `Turma ${studentTurmaStd}`,
      }));
    }

    return list;
  }, [libraryItemsProp, fetchedLibrary, activeStudent.turma, studentTurmaStd, studentActivities]);

  const filteredRepoItems = useMemo(() => {
    if (!repoSearch.trim()) return repositoryItems;
    const q = repoSearch.toLowerCase();
    return repositoryItems.filter(
      (it) => it.title.toLowerCase().includes(q) || it.category.toLowerCase().includes(q)
    );
  }, [repositoryItems, repoSearch]);

  // Métricas rápidas do estudante
  const pendingActivities = useMemo(
    () => studentActivities.filter((a) => !mySubmissionsMap.has(a.id)),
    [studentActivities, mySubmissionsMap]
  );

  const kronoGamesActivities = useMemo(
    () => studentActivities.filter((a) => isActivityKronoGame(a)),
    [studentActivities]
  );

  const completedActivities = useMemo(
    () => studentActivities.filter((a) => mySubmissionsMap.has(a.id)),
    [studentActivities, mySubmissionsMap]
  );

  const averageGrade = useMemo(() => {
    const graded: number[] = [];
    mySubmissionsMap.forEach((sub) => {
      if (sub.status === 'graded') {
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

  // Lista filtrada do Feed
  const displayedFeedActivities = useMemo(() => {
    if (feedFilter === 'pending') return pendingActivities;
    if (feedFilter === 'games') return kronoGamesActivities;
    if (feedFilter === 'completed') return completedActivities;
    return studentActivities;
  }, [
    feedFilter,
    pendingActivities,
    kronoGamesActivities,
    completedActivities,
    studentActivities,
  ]);

  // Colegas da mesma turma para seleção em caixa suspensa (<select>) nas atividades em grupo
  const eligibleClassmates = useMemo(() => {
    const excluded = new Set<string>([activeStudent.id]);
    rosterStudents.forEach((s) => {
      if (selectedGroupNames.includes(s.fullName)) excluded.add(s.id);
    });
    return getEligibleClassmatesForGroup(rosterStudents, activeStudent.turma, excluded);
  }, [rosterStudents, activeStudent.id, activeStudent.turma, selectedGroupNames]);

  // ==========================================================================
  // ABERTURA E EXECUÇÃO DE ATIVIDADE (FORMAL, GRUPO OU KRONOGAMES)
  // ==========================================================================
  const handleOpenActivity = (act: Activity) => {
    setExecutingActivity(act);
    const existingSub = mySubmissionsMap.get(act.id);

    // Carregar rascunho salvo no celular ou submissão anterior
    const draftKey = `krono_draft_${activeStudent.id}_${act.id}`;
    let savedDraft: any = null;
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(draftKey);
        if (raw) savedDraft = JSON.parse(raw);
      } catch (e) {}
    }

    if (existingSub) {
      setSelectedObjective(existingSub.selectedObjectiveAnswers || {});
      setGeneralEssayText(existingSub.essayAnswer || '');
      setEssayResponses({});
      if (existingSub.groupMembers) {
        setSelectedGroupNames(
          existingSub.groupMembers
            .split(',')
            .map((n: string) => n.trim())
            .filter(Boolean)
        );
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

  // Auto-save de rascunho no celular enquanto o aluno digita
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
    } catch (e) {}
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
      const rawQuestions: any[] = Array.isArray(executingActivity.questions) ? executingActivity.questions : [];
      const objQuestions: any[] = rawQuestions.filter((q: any) => q.type !== 'essay');
      const essayQuestions: any[] = [
        ...(Array.isArray((executingActivity as any).essayQuestions) ? (executingActivity as any).essayQuestions : []),
        ...rawQuestions.filter((q: any) => q.type === 'essay'),
      ];

      let objectiveScore = 0;
      let maxObjectiveScore = 0;

      objQuestions.forEach((q) => {
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
        essayQuestions.forEach((eq) => {
          maxEssayScore += Number(eq.points || 2);
        });
      } else if (objQuestions.length === 0) {
        maxEssayScore = Number(executingActivity.maxGrade || 10);
      }

      let compiledEssay = generalEssayText.trim();
      if (essayQuestions.length > 0) {
        const parts = essayQuestions.map((eq, i) => {
          const resp = (essayResponses[eq.id] || '').trim();
          return `[Questão Dissertativa ${i + 1}]: ${eq.text || eq.question || eq.prompt || ''}\nResposta: ${resp || '(Em branco)'}`;
        });
        compiledEssay = [parts.join('\n\n'), compiledEssay].filter(Boolean).join('\n\n');
      }

      const groupCsv =
        (executingActivity.type === 'Trabalho em grupo' || Boolean((executingActivity as any).isGroupWork)) && selectedGroupNames.length > 0
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

      showNotice('Atividade enviada com sucesso! Sua participação foi registrada.');
      setExecutingActivity(null);
    } catch (e) {
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

  // Mensagens do aluno com o professor
  const myMessages = useMemo(() => {
    return (Array.isArray(messages) ? messages : []).filter(
      (m: any) =>
        m.senderId === activeStudent.id ||
        m.receiverId === activeStudent.id ||
        m.studentId === activeStudent.id
    );
  }, [messages, activeStudent.id]);

  // ==========================================================================
  // SE O ALUNO ESTIVER EXECUTANDO UM KRONOGAME OU ATIVIDADE EM TELA CHEIA
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
              <span>Voltar ao Feed da Turma {studentTurmaStd}</span>
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
              <span>Voltar ao Feed da Turma {studentTurmaStd}</span>
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

    // EXECUÇÃO DE ATIVIDADE FORMAL / PROVA / PESQUISA / REDAÇÃO / AEE
    const rawQuestions: any[] = Array.isArray(executingActivity.questions) ? executingActivity.questions : [];
      const objQuestions: any[] = rawQuestions.filter((q: any) => q.type !== 'essay');
    const essayQuestions: any[] = [
        ...(Array.isArray((executingActivity as any).essayQuestions) ? (executingActivity as any).essayQuestions : []),
        ...rawQuestions.filter((q: any) => q.type === 'essay'),
      ];
    const embeddedLinks = [
      ...extractLinksFromText(executingActivity.supportMaterial),
      ...extractLinksFromText(executingActivity.description),
    ];

    return (
      <div className="min-h-screen bg-background text-foreground pb-24">
        {/* Topbar fixa da Avaliação */}
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
            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 block">
              Turma {studentTurmaStd} • {executingActivity.type || 'Avaliação'}
            </span>
            <h2 className="text-xs sm:text-sm font-bold text-foreground truncate">
              {executingActivity.title}
            </h2>
          </div>

          <span className="px-2.5 py-1 rounded-md bg-emerald-500/15 text-emerald-400 font-mono text-xs font-bold">
            Val: {executingActivity.maxGrade || 10} pts
          </span>
        </header>

        <main className="max-w-2xl mx-auto p-4 space-y-5">
          {/* Orientações + Links Diretos do Drive se houver */}
          {(executingActivity.description || executingActivity.supportMaterial) && (
            <section className="p-4 rounded-2xl bg-surface border border-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Material de Apoio & Orientações</span>
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
                      className="w-full p-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center justify-between transition-all"
                    >
                      <span className="flex items-center gap-2 truncate">
                        <FolderOpen className="w-4 h-4 shrink-0" />
                        <span className="truncate">Abrir Material / Arquivo no Google Drive</span>
                      </span>
                      <ExternalLink className="w-4 h-4 shrink-0" />
                    </a>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* SE FOR ATIVIDADE EM GRUPO: CAIXA DE SELEÇÃO SUSPENSA (<select>) DA TURMA */}
          {(executingActivity.type === 'Trabalho em grupo' || Boolean((executingActivity as any).isGroupWork)) && (
            <section className="p-4 rounded-2xl bg-surface border border-border space-y-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 block">
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
                  className="flex-1 bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-foreground focus:outline-none focus:border-emerald-500"
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
                  className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-zinc-950 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
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

          {/* QUESTÕES OBJETIVAS */}
          {objQuestions.length > 0 && (
            <section className="space-y-3.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted px-1">
                Questões Objetivas ({objQuestions.length})
              </h3>
              {objQuestions.map((q, qIdx) => (
                <div
                  key={q.id || qIdx}
                  className="p-4 rounded-2xl bg-surface border border-border space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold text-emerald-400">
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
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/15 text-cyan-300 text-xs font-semibold"
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
                              ? 'bg-emerald-500/15 border-emerald-500 text-foreground font-semibold'
                              : 'bg-background border-border text-muted hover:text-foreground'
                          }`}
                        >
                          <span
                            className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-mono font-bold shrink-0 ${
                              isSelected
                                ? 'bg-emerald-500 text-zinc-950'
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

          {/* QUESTÕES DISSERTATIVAS ESPECÍFICAS */}
          {essayQuestions.length > 0 && (
            <section className="space-y-3.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted px-1">
                Questões Dissertativas ({essayQuestions.length})
              </h3>
              {essayQuestions.map((eq, eIdx) => (
                <div
                  key={eq.id || eIdx}
                  className="p-4 rounded-2xl bg-surface border border-border space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold text-cyan-400">
                      Dissertativa {eIdx + 1}
                    </span>
                    <span className="text-[11px] font-mono text-muted">
                      {eq.points || 2} pt(s)
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm font-medium text-foreground whitespace-pre-wrap leading-relaxed">
                    {eq.text}
                  </p>
                  <textarea
                    rows={5}
                    value={essayResponses[eq.id] || ''}
                    onChange={(e) =>
                      setEssayResponses((prev) => ({ ...prev, [eq.id]: e.target.value }))
                    }
                    placeholder="Digite sua resposta dissertativa com argumentos sociológicos..."
                    className="w-full bg-background border border-border focus:border-emerald-500 rounded-xl p-3 text-xs sm:text-sm text-foreground focus:outline-none leading-relaxed"
                  />
                </div>
              ))}
            </section>
          )}

          {/* CAMPO DISSERTATIVO GERAL / REDAÇÃO / TRABALHO DE PESQUISA */}
          {(essayQuestions.length === 0 ||
            ['Redação', 'Trabalho', 'Trabalho em grupo', 'Projeto de pesquisa', 'Dinâmica', 'Recuperação Paralela'].includes(String(executingActivity.type || '')) ||
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
                className="w-full bg-background border border-border focus:border-emerald-500 rounded-xl p-3.5 text-xs sm:text-sm text-foreground focus:outline-none leading-relaxed"
              />
            </section>
          )}

          {/* Feedback do Professor caso já tenha sido corrigida */}
          {myExistingSub?.teacherFeedback && (
            <section className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 block">
                Parecer Pedagógico do Professor:
              </span>
              <p className="text-xs sm:text-sm text-emerald-100 whitespace-pre-wrap leading-relaxed">
                {myExistingSub.teacherFeedback}
              </p>
            </section>
          )}

          {/* Botão de Envio de Alta Conversão */}
          <div className="pt-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleConfirmSubmitActivity}
              className="w-full py-3.5 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-bold text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? 'Enviando Respostas...'
                  : myExistingSub
                  ? 'Atualizar Entrega da Atividade'
                  : 'Finalizar e Enviar Atividade'}
              </span>
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ==========================================================================
  // SHELL PRINCIPAL DA ÁREA DO ALUNO (INSTAFLOW EDU + LINEAR / APPLE)
  // ==========================================================================
  return (
    <div className="min-h-screen bg-background text-foreground pb-20 md:pb-10">
      {/* 1. CABEÇALHO COM AVATAR, NOME DO ALUNO E TURMA EM DESTAQUE */}
      <header className="sticky top-0 z-30 min-h-[74px] sm:min-h-[82px] py-2.5 bg-surface/95 backdrop-blur-md border-b border-border px-4 flex items-center">
        <div className="max-w-2xl w-full mx-auto flex items-center justify-between gap-3">
          <div
            onClick={() => setActiveNav('perfil')}
            className="flex items-center gap-3.5 min-w-0 cursor-pointer group"
            title="Abrir meu perfil"
          >
            {/* Avatar do Aluno em Destaque */}
            <div className="relative shrink-0">
              {activeStudent.avatarUrl ? (
                <img
                  src={activeStudent.avatarUrl}
                  alt={activeStudent.fullName}
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover border-2 border-emerald-500/50 shadow-md group-hover:border-emerald-400 transition-all"
                />
              ) : (
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-emerald-500/25 via-zinc-800 to-zinc-900 border-2 border-emerald-500/40 text-emerald-300 flex items-center justify-center font-mono font-extrabold text-base sm:text-lg shadow-md group-hover:border-emerald-400 transition-all">
                  {(activeStudent.fullName || 'AL')
                    .trim()
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()}
                </div>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-background" />
            </div>

            {/* Nome do Aluno e Turma em Destaque Principal */}
            <div className="min-w-0 space-y-1">
              <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-foreground truncate leading-tight">
                {activeStudent.fullName}
              </h1>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 font-mono text-xs font-extrabold shrink-0">
                  Turma {studentTurmaStd}
                </span>
                <span className="text-[10px] font-medium text-muted hidden sm:inline">
                  • Portal do Aluno
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setActiveNav('repositorio')}
              className={`px-2.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${
                activeNav === 'repositorio'
                  ? 'bg-emerald-500 text-zinc-950 border-emerald-500 font-bold'
                  : 'bg-background hover:bg-surface-hover border-border text-foreground'
              }`}
              title="Abrir Repositório e Links do Google Drive"
            >
              <FolderOpen className="w-4 h-4 text-emerald-400" />
              <span className="hidden xs:inline">Repositório</span>
              <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px]">
                {repositoryItems.length}
              </span>
            </button>

            {onToggleTheme && (
              <button
                type="button"
                onClick={onToggleTheme}
                className="p-2.5 rounded-xl bg-background hover:bg-surface-hover border border-border text-muted hover:text-foreground cursor-pointer"
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
              onClick={() => setIsChatOpen(true)}
              className="relative p-2.5 rounded-xl bg-background hover:bg-surface-hover border border-border text-muted hover:text-foreground cursor-pointer"
              title="Direct com o Professor"
            >
              <MessageSquare className="w-4 h-4" />
              {myMessages.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-zinc-950 font-mono text-[10px] font-bold flex items-center justify-center">
                  {myMessages.length}
                </span>
              )}
            </button>

            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="p-2.5 rounded-xl bg-background hover:bg-rose-500/15 border border-border text-muted hover:text-rose-400 cursor-pointer"
                title="Sair da conta"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Notificação Toast */}
      {toastMsg && (
        <div className="max-w-2xl mx-auto px-4 pt-3">
          <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs font-medium flex items-center justify-between">
            <span>{toastMsg}</span>
            <button onClick={() => setToastMsg(null)} className="text-emerald-400 ml-2">
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 3. CONTEÚDO PRINCIPAL (MAX-W-2XL CENTRALIZADO COMO INSTAGRAM / THREADS) */}
      <main className="max-w-2xl mx-auto p-3 sm:p-4 space-y-4">
        {/* ===================================================================
            ABA 1: FEED PRINCIPAL DE ATIVIDADES + BANNER FIXO DO REPOSITÓRIO
           =================================================================== */}
        {activeNav === 'feed' && (
          <div className="space-y-4">
            {/* Banner Fixo de Acesso Rápido ao Repositório no Topo do Feed */}
            <div className="p-3.5 rounded-2xl bg-surface border border-border flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <FolderOpen className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 block">
                    Repositório Oficial • Turma {studentTurmaStd}
                  </span>
                  <h3 className="text-xs sm:text-sm font-bold text-foreground truncate">
                    {repositoryItems[0]?.title || 'Material Didático & Slides da Turma'}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {repositoryItems[0]?.url && (
                  <a
                    href={repositoryItems[0].url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold flex items-center gap-1.5 transition-all"
                  >
                    <span>Abrir Drive</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                {repositoryItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setActiveNav('repositorio')}
                    className="px-2.5 py-2 rounded-xl bg-background border border-border text-xs font-semibold text-foreground cursor-pointer"
                  >
                    +{repositoryItems.length - 1}
                  </button>
                )}
              </div>
            </div>

            {/* Segmented Control Minimalista estilo Linear / iOS */}
            <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-surface border border-border">
              {[
                { id: 'all' as const, label: 'Todas', count: studentActivities.length },
                { id: 'pending' as const, label: 'Pendentes', count: pendingActivities.length },
                { id: 'games' as const, label: 'KronoGames', count: kronoGamesActivities.length },
                { id: 'completed' as const, label: 'Feitas', count: completedActivities.length },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFeedFilter(tab.id)}
                  className={`py-2 px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    feedFilter === tab.id
                      ? 'bg-foreground text-background font-bold shadow-xs'
                      : 'text-muted hover:text-foreground'
                  }`}
                >
                  <span className="truncate">{tab.label}</span>
                  <span className="font-mono text-[10px] opacity-80">({tab.count})</span>
                </button>
              ))}
            </div>

            {/* Lista de Posts de Atividades (Edge-to-Edge no Mobile) */}
            {displayedFeedActivities.length === 0 ? (
              <div className="p-10 rounded-2xl bg-surface border border-border text-center space-y-2">
                <CheckCircle2 className="w-7 h-7 text-emerald-400 mx-auto" />
                <p className="text-sm font-bold text-foreground">
                  Nenhuma atividade neste filtro para a Turma {studentTurmaStd}.
                </p>
                <p className="text-xs text-muted">
                  Consulte o Repositório da turma ou altere o filtro acima.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {displayedFeedActivities.map((act) => {
                  const sub = mySubmissionsMap.get(act.id);
                  const isGame = isActivityKronoGame(act);
                  const isDebate =
                    act.gameMode === 'debate_paperless' ||
                    Boolean(act.gameData?.debateConfig);
                  const actLinks = [
                    ...extractLinksFromText(act.supportMaterial),
                    ...extractLinksFromText(act.description),
                  ];
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
                      className="rounded-2xl bg-surface border border-border hover:border-zinc-700 transition-all overflow-hidden"
                    >
                      {/* Cabeçalho do Post */}
                      <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                              isGame
                                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            }`}
                          >
                            {isGame ? <Gamepad2 className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
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
                                  : act.type || 'Atividade Formal'}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-muted block">
                              Turma {studentTurmaStd} • Prazo: {act.dueDate || act.deadline || 'Em aberto'}
                            </span>
                          </div>
                        </div>

                        {/* Status Badge */}
                        {sub ? (
                          <span className="px-2.5 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-[11px] font-bold shrink-0">
                            {sub.status === 'graded' && totalGrade !== null
                              ? `Nota: ${totalGrade.toFixed(1)}`
                              : '✓ Entregue'}
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono text-[11px] font-bold shrink-0">
                            Pendente
                          </span>
                        )}
                      </div>

                      {/* Corpo do Post */}
                      <div className="p-4 space-y-3">
                        <h3 className="text-base font-bold text-foreground leading-snug">
                          {act.title}
                        </h3>

                        {act.description && (
                          <p className="text-xs sm:text-sm text-muted line-clamp-3 whitespace-pre-wrap leading-relaxed">
                            {act.description}
                          </p>
                        )}

                        {/* Card de Anexo / Link do Drive Incorporado se houver */}
                        {actLinks.length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            {actLinks.map((lnk, lIdx) => (
                              <a
                                key={lIdx}
                                href={lnk}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2.5 rounded-xl bg-background hover:bg-surface-hover border border-border flex items-center justify-between gap-2 text-xs font-semibold text-emerald-400 transition-colors"
                              >
                                <span className="flex items-center gap-2 truncate">
                                  <Link2 className="w-3.5 h-3.5 shrink-0" />
                                  <span className="truncate">
                                    Material / Link Anexo da Aula (Abrir no Drive)
                                  </span>
                                </span>
                                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                              </a>
                            ))}
                          </div>
                        )}

                        {/* Rodapé de Ação Principal */}
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => handleOpenActivity(act)}
                            className={`w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                              sub
                                ? 'bg-background hover:bg-surface-hover border border-border text-foreground'
                                : isGame
                                ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-xs'
                                : 'bg-foreground hover:opacity-90 text-background shadow-xs'
                            }`}
                          >
                            {sub ? (
                              <>
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                <span>Ver Minha Entrega & Feedback</span>
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
            ABA 2: REPOSITÓRIO & GOOGLE DRIVE DA TURMA
           =================================================================== */}
        {activeNav === 'repositorio' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-surface border border-border space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 block">
                    Biblioteca Digital & Anexos • Turma {studentTurmaStd}
                  </span>
                  <h2 className="text-lg font-bold text-foreground">
                    Repositório de Materiais e Links do Drive
                  </h2>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 font-mono text-xs font-bold">
                  {filteredRepoItems.length} arquivo(s)
                </span>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={repoSearch}
                  onChange={(e) => setRepoSearch(e.target.value)}
                  placeholder="Buscar apostila, livro, slide ou link da aula..."
                  className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-foreground focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="space-y-2.5">
              {filteredRepoItems.map((item) => (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-4 rounded-2xl bg-surface hover:bg-surface-hover border border-border hover:border-emerald-500/40 flex items-center justify-between gap-3 transition-all group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                      <FolderOpen className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 block">
                        {item.category} • {item.turma}
                      </span>
                      <h3 className="text-sm font-bold text-foreground group-hover:text-emerald-300 transition-colors truncate">
                        {item.title}
                      </h3>
                      <span className="text-[11px] text-muted truncate block font-mono">
                        {item.url}
                      </span>
                    </div>
                  </div>

                  <span className="px-3 py-2 rounded-xl bg-emerald-500 text-zinc-950 text-xs font-bold flex items-center gap-1.5 shrink-0">
                    <span>Abrir</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* ===================================================================
            ABA 3: ARENA KRONOGAMES & DEBATE SEM PAPEL
           =================================================================== */}
        {activeNav === 'games' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-surface border border-border">
              <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 block">
                Dinâmicas de Sala & Casa • Turma {studentTurmaStd}
              </span>
              <h2 className="text-lg font-bold text-foreground">
                Arena KronoGames & Debates
              </h2>
              <p className="text-xs text-muted mt-0.5">
                Participe dos debates sem papel e desafios interativos liberados para a sua turma.
              </p>
            </div>

            {kronoGamesActivities.length === 0 ? (
              <div className="p-10 rounded-2xl bg-surface border border-border text-center space-y-2">
                <Gamepad2 className="w-7 h-7 text-amber-400 mx-auto" />
                <p className="text-sm font-bold text-foreground">
                  Nenhum KronoGame ativo no momento para a Turma {studentTurmaStd}.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {kronoGamesActivities.map((act) => (
                  <div
                    key={act.id}
                    className="p-4 rounded-2xl bg-surface border border-border space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-md bg-amber-500/15 text-amber-300 font-mono text-[10px] font-bold uppercase">
                        {act.gameMode === 'debate_paperless'
                          ? '🎙️ Debate Sem Papel'
                          : '⚡ Desafio Interativo'}
                      </span>
                      <span className="text-xs font-mono text-muted">
                        Turma {studentTurmaStd}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-foreground">{act.title}</h3>
                    {act.description && (
                      <p className="text-xs text-muted line-clamp-2">{act.description}</p>
                    )}
                    <button
                      type="button"
                      onClick={() => handleOpenActivity(act)}
                      className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>Entrar Agora</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===================================================================
            ABA 4: BOLETIM, NOTAS & FEEDBACKS DO PROFESSOR
           =================================================================== */}
        {activeNav === 'boletim' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2.5">
              <div className="p-3.5 rounded-2xl bg-surface border border-border text-center">
                <span className="text-[10px] font-mono uppercase text-muted block">Média</span>
                <span className="text-xl font-mono font-bold text-emerald-400 mt-0.5 block">
                  {averageGrade || '—'}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-surface border border-border text-center">
                <span className="text-[10px] font-mono uppercase text-muted block">Entregues</span>
                <span className="text-xl font-mono font-bold text-foreground mt-0.5 block">
                  {completedActivities.length}/{studentActivities.length}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-surface border border-border text-center">
                <span className="text-[10px] font-mono uppercase text-muted block">Turma</span>
                <span className="text-xl font-mono font-bold text-cyan-400 mt-0.5 block">
                  {studentTurmaStd}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {studentActivities.map((act) => {
                const sub = mySubmissionsMap.get(act.id);
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
                    className="p-4 rounded-2xl bg-surface border border-border space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono uppercase text-muted block">
                          {act.type || 'Avaliação'} • {sub?.submittedAt || act.dueDate || act.deadline || ''}
                        </span>
                        <h4 className="text-sm font-bold text-foreground">{act.title}</h4>
                      </div>
                      {sub ? (
                        <span className="px-3 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-xs font-bold">
                          {sub.status === 'graded' && total !== null
                            ? `${total.toFixed(1)} / 10`
                            : 'Em Correção'}
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-border text-muted font-mono text-xs">
                          Não entregue
                        </span>
                      )}
                    </div>

                    {sub?.teacherFeedback && (
                      <div className="p-3 rounded-xl bg-background border border-border text-xs text-foreground whitespace-pre-wrap">
                        <strong className="text-emerald-400 block mb-1">
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
            ABA 5: PERFIL, SEGURANÇA (TROCA DE SENHA) E SAIR
           =================================================================== */}
        {activeNav === 'perfil' && (
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-surface border border-border flex items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 font-mono text-xs font-bold">
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
                <KeyRound className="w-4 h-4 text-emerald-400" />
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
                <p className="text-xs text-emerald-400 font-medium">{passwordStatus}</p>
              )}
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-foreground text-background text-xs font-bold cursor-pointer"
              >
                Salvar Nova Senha
              </button>
            </form>
          </div>
        )}
      </main>

      {/* 4. GAVETA DE DIRECT / CHAT COM O PROFESSOR */}
      {isChatOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-surface border border-border rounded-t-2xl sm:rounded-2xl w-full max-w-md h-[80vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase text-emerald-400 block">
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
                  const isMine = msg.senderId === activeStudent.id || msg.senderRole === 'student';
                  return (
                    <div
                      key={msg.id || idx}
                      className={`max-w-[85%] p-3 rounded-2xl text-xs ${
                        isMine
                          ? 'ml-auto bg-emerald-500 text-zinc-950 font-medium'
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
                    onSendMessage({
                      threadId: activeStudent.id,
                      senderId: activeStudent.id,
                      senderName: activeStudent.fullName,
                      senderRole: 'student',
                      senderAvatar: activeStudent.avatarUrl,
                      recipientId: teacher?.id || 'teacher',
                      recipientName: teacher?.name || 'Professor Gilson',
                      content: chatInput.trim(),
                    }, teacher?.id);
                    setChatInput('');
                  }
                }}
                placeholder="Escreva uma mensagem..."
                className="flex-1 bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  if (chatInput.trim() && onSendMessage) {
                    onSendMessage({
                      threadId: activeStudent.id,
                      senderId: activeStudent.id,
                      senderName: activeStudent.fullName,
                      senderRole: 'student',
                      senderAvatar: activeStudent.avatarUrl,
                      recipientId: teacher?.id || 'teacher',
                      recipientName: teacher?.name || 'Professor Gilson',
                      content: chatInput.trim(),
                    }, teacher?.id);
                    setChatInput('');
                  }
                }}
                className="p-2.5 rounded-xl bg-emerald-500 text-zinc-950 cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. BOTTOM TAB BAR FIXA NA ZONA DO POLEGAR (ESTILO INSTAGRAM / LINEAR MOBILE) */}
      <nav className="fixed bottom-0 inset-x-0 z-30 h-14 bg-surface/95 backdrop-blur-md border-t border-border px-2">
        <div className="max-w-2xl mx-auto h-full grid grid-cols-5 items-center">
          {[
            { id: 'feed' as const, label: 'Feed', icon: Home, badge: pendingActivities.length },
            {
              id: 'repositorio' as const,
              label: 'Repositório',
              icon: FolderOpen,
              badge: repositoryItems.length,
            },
            {
              id: 'games' as const,
              label: 'KronoGames',
              icon: Gamepad2,
              badge: kronoGamesActivities.length,
            },
            { id: 'boletim' as const, label: 'Boletim', icon: BarChart3, badge: 0 },
            { id: 'perfil' as const, label: 'Perfil', icon: User, badge: 0 },
          ].map((item) => {
            const IconComp = item.icon;
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveNav(item.id)}
                className={`relative h-full flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-colors ${
                  isActive ? 'text-foreground font-bold' : 'text-muted hover:text-foreground'
                }`}
              >
                <div className="relative">
                  <IconComp
                    className={`w-5 h-5 ${
                      isActive && item.id === 'repositorio'
                        ? 'text-emerald-400'
                        : isActive
                        ? 'text-foreground'
                        : ''
                    }`}
                  />
                  {item.badge > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 px-1 min-w-[16px] h-4 rounded-full bg-emerald-500 text-zinc-950 font-mono text-[9px] font-bold flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] tracking-tight">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default StudentPortalView;
