'use client';
import { DebateTeacherCockpit } from "@/components/views/debate/DebateTeacherCockpit";
import { DebateStudentBenchView } from "@/components/views/debate/DebateStudentBenchView";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Activity, StudentUser } from '@/lib/types';
import {
  Scale,
  Sliders,
  Eye,
} from 'lucide-react';
import {
  isSameStudentTurma,
  getEligibleClassmatesForGroup,
  syncGroupGradeToSubmissions,
} from '@/lib/groupActivityUtils';

import {
  GroupRole,
  LocalDebateQuestion,
  LocalDebateParticipant,
  LocalDebateCriterion,
  LocalDebateConfig,
  TeacherGroupChecklistState,
  DebatePaperlessViewProps,
  DEFAULT_TEACHER_CRITERIA,
  ensureSixQuestions,
  buildDefaultElaborateSummaries,
} from '@/components/views/debate/debateUtils';

export type {
  LocalDebateQuestion,
  LocalDebateParticipant,
  LocalDebateCriterion,
  LocalDebateConfig,
  DebatePaperlessViewProps,
};

export const DebatePaperlessView: React.FC<DebatePaperlessViewProps> = ({
  activity: activityProp,
  debateConfig: debateConfigProp,
  title: titleProp,
  student,
  currentStudent,
  students = [],
  allStudents = [],
  isTeacher: isTeacherProp,
  isTeacherPreview,
  role: roleProp,
  onSaveActivity,
  onUpdateActivity,
  onUpdateDebateConfig,
  onSubmitAnswer,
  onFinishGame,
  onClose,
}) => {
  const [sessionRole, setSessionRole] = useState<string | null>(roleProp || null);
  const [sessionStudent, setSessionStudent] = useState<StudentUser | null>(
    student || currentStudent || null
  );
  const [fetchedStudents, setFetchedStudents] = useState<StudentUser[]>([]);
  const [fetchedActivity, setFetchedActivity] = useState<Activity | null>(activityProp || null);
  const [isRefreshingBench, setIsRefreshingBench] = useState<boolean>(false);

  useEffect(() => {
    if (activityProp) {
      setFetchedActivity((prev) => {
        if (!prev || prev.id !== activityProp.id) return activityProp;
        return prev;
      });
    }
  }, [activityProp]);

  useEffect(() => {
    if (student || currentStudent) {
      setSessionStudent(student || currentStudent || null);
    }
    if (roleProp) {
      setSessionRole(roleProp);
    }
  }, [student, currentStudent, roleProp]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!student && !currentStudent && !roleProp) {
      try {
        const localRole = localStorage.getItem('role');
        if (localRole) setSessionRole(localRole);

        const activeUid = sessionStorage.getItem('current_active_user_id') || '';
        const rawSession =
          (activeUid ? sessionStorage.getItem(`tenant_${activeUid}_active_session`) : null) ||
          sessionStorage.getItem('active_session');
        if (rawSession) {
          const parsed = JSON.parse(rawSession);
          if (parsed.role) setSessionRole(parsed.role);
          if (parsed.studentData && parsed.role === 'student') {
            setSessionStudent(parsed.studentData);
          }
        }
      } catch (e) {}

      fetch('/api/auth/session')
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d?.user) {
            setSessionRole(d.user.role || null);
            if (d.user.role === 'student') {
              setSessionStudent(d.user);
            }
          }
        })
        .catch(() => {});
    }

    if ((!students || students.length === 0) && (!allStudents || allStudents.length === 0)) {
      fetch('/api/students')
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d && Array.isArray(d.students)) {
            setFetchedStudents(d.students);
          }
        })
        .catch(() => {});
    }

    if (!activityProp) {
      fetch('/api/activities')
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d && Array.isArray(d.activities)) {
            const matched =
              d.activities.find(
                (a: Activity) =>
                  a.gameMode === 'debate_paperless' || Boolean(a.gameData?.debateConfig)
              ) || null;
            if (matched) setFetchedActivity(matched);
          }
        })
        .catch(() => {});
    }
  }, [student, currentStudent, roleProp, students, allStudents, activityProp]);

  const activeStudent = student || currentStudent || sessionStudent || null;
  const effectiveRole = roleProp || sessionRole;

  const isAuthenticatedTeacher = Boolean(
    isTeacherProp ||
      isTeacherPreview ||
      effectiveRole === 'teacher' ||
      effectiveRole === 'second_teacher' ||
      (!activeStudent && effectiveRole !== 'student')
  );

  const [viewModeOverride, setViewModeOverride] = useState<'teacher' | 'student_sim' | null>(null);
  const isTeacherMode =
    viewModeOverride === 'teacher'
      ? true
      : viewModeOverride === 'student_sim'
      ? false
      : isAuthenticatedTeacher;

  const safeActivity: Activity = useMemo(() => {
    if (fetchedActivity) return fetchedActivity;
    if (activityProp) return activityProp;
    return {
      id: 'debate-live',
      title: titleProp || 'Debate Sociológico Sem Papel',
      description: '',
      type: 'Jogo Avaliativo',
      subject: 'Sociologia',
      turma: activeStudent?.turma || 'Geral',
      dueDate: '',
      deadline: '',
      status: 'active',
      totalStudents: 0,
      totalSubmissions: 0,
      pendingCorrection: 0,
      submissions: [],
      gameMode: 'debate_paperless',
    } as unknown as Activity;
  }, [activityProp, fetchedActivity, titleProp, activeStudent?.turma]);

  const rosterStudents = useMemo(() => {
    if (Array.isArray(students) && students.length > 0) return students;
    if (Array.isArray(allStudents) && allStudents.length > 0) return allStudents;
    return fetchedStudents;
  }, [students, allStudents, fetchedStudents]);

  // ITEM 1 CORRIGIDO: Exibir no Cockpit SOMENTE as turmas às quais este debate foi destinado!
  const availableTurmas = useMemo(() => {
    const rawActTurma = String(
      (safeActivity as any)._originalTurmaScope || safeActivity.turma || ''
    ).trim();

    if (
      rawActTurma &&
      rawActTurma.toLowerCase() !== 'todas' &&
      rawActTurma.toLowerCase() !== 'todas as turmas' &&
      rawActTurma.toLowerCase() !== 'geral'
    ) {
      const explicitTurmas = rawActTurma
        .split(/[,;]+/)
        .map((t: string) => t.replace(/turma/gi, '').trim())
        .filter(Boolean);
      if (explicitTurmas.length > 0) {
        return Array.from(new Set(explicitTurmas)).sort((a, b) =>
          a.localeCompare(b, undefined, { numeric: true })
        );
      }
    }

    // Fallback apenas se a atividade tiver sido criada literalmente para "Todas"
    const set = new Set<string>();
    rosterStudents.forEach((s) => {
      if (!s.isArchived && s.turma && s.turma.trim()) set.add(s.turma.trim());
    });
    const arr = Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    return arr.length > 0 ? arr : ['Geral'];
  }, [rosterStudents, safeActivity]);

  const [selectedTeacherTurma, setSelectedTeacherTurma] = useState<string>(() => {
    return availableTurmas[0] || 'Geral';
  });

  useEffect(() => {
    if (availableTurmas.length > 0 && !availableTurmas.includes(selectedTeacherTurma)) {
      setSelectedTeacherTurma(availableTurmas[0]);
    }
  }, [availableTurmas, selectedTeacherTurma]);

  const currentTurmaScope = useMemo(() => {
    if (!isAuthenticatedTeacher && activeStudent?.turma) {
      return activeStudent.turma.trim();
    }
    return selectedTeacherTurma || availableTurmas[0] || 'Geral';
  }, [isAuthenticatedTeacher, activeStudent?.turma, selectedTeacherTurma, availableTurmas]);

  const buildConfigFromSource = useCallback(
    (cfgSource: any): LocalDebateConfig => {
      const cfg: any = cfgSource || {};
      const topicTitle = safeActivity.title || titleProp || 'Debate Sociológico';
      const defaultSummaries = buildDefaultElaborateSummaries(topicTitle);

      return {
        maxJurors: cfg.maxJurors || 3,
        proQuestions: ensureSixQuestions(cfg.proQuestions, 'pro', topicTitle),
        contraQuestions: ensureSixQuestions(cfg.contraQuestions, 'contra', topicTitle),
        jurorQuestions: ensureSixQuestions(cfg.jurorQuestions, 'juror', topicTitle),
        checklistCriteria:
          Array.isArray(cfg.checklistCriteria) && cfg.checklistCriteria.length > 0
            ? cfg.checklistCriteria
            : [
                { id: 'crit_1', number: 1, title: 'Rigor Conceitual Sociológico', description: 'Mobilizou conceitos e autores da Sociologia sem recorrer ao senso comum.' },
                { id: 'crit_2', number: 2, title: 'Evidências e Fatos Concretos', description: 'Apresentou dados históricos, estatísticos ou exemplos reais da sociedade brasileira.' },
                { id: 'crit_3', number: 3, title: 'Coerência Lógica e Argumentativa', description: 'Sustentou a tese sem contradições internas e com clareza.' },
                { id: 'crit_4', number: 4, title: 'Capacidade de Réplica e Refutação', description: 'Respondeu diretamente aos argumentos da bancada oposta com base sociológica.' },
                { id: 'crit_5', number: 5, title: 'Articulação Coletiva e Uso do Tempo', description: 'A equipe dividiu a fala de forma equilibrada e respeitou o Timer.' },
                { id: 'crit_6', number: 6, title: 'Ética Democrática e Direitos Humanos', description: 'Manteve postura respeitosa e alinhada à cidadania.' },
              ],
        jurorInitialGuide: cfg.jurorInitialGuide || defaultSummaries.jurorGuideAI,
        participants: Array.isArray(cfg.participants) ? cfg.participants : [],
        proAnswers: cfg.proAnswers || {},
        contraAnswers: cfg.contraAnswers || {},
        jurorAnswers: cfg.jurorAnswers || {},
        proSummariesByTurma: cfg.proSummariesByTurma || {},
        contraSummariesByTurma: cfg.contraSummariesByTurma || {},
        jurorQuestionsByTurma: cfg.jurorQuestionsByTurma || {},
        proResearchCompleted: Boolean(cfg.proResearchCompleted),
        contraResearchCompleted: Boolean(cfg.contraResearchCompleted),
        proSummaryAI: cfg.proSummaryAI || cfg.proSummary || defaultSummaries.proSummaryAI,
        contraSummaryAI: cfg.contraSummaryAI || cfg.contraSummary || defaultSummaries.contraSummaryAI,
        jurorGuideAI: cfg.jurorGuideAI || defaultSummaries.jurorGuideAI,
        jurorVerdicts: Array.isArray(cfg.jurorVerdicts) ? cfg.jurorVerdicts : [],
        gradingMode: cfg.gradingMode || 'group',
        groupGrades: cfg.groupGrades || {},
        individualGrades: cfg.individualGrades || {},
        teacherChecklists: cfg.teacherChecklists || {},
      };
    },
    [safeActivity.title, titleProp]
  );

  const initialConfig = useMemo(
    () => buildConfigFromSource(debateConfigProp || safeActivity.gameData?.debateConfig),
    [buildConfigFromSource, debateConfigProp, safeActivity.gameData?.debateConfig]
  );

  const [localConfig, setLocalConfig] = useState<LocalDebateConfig>(initialConfig);
  const latestConfigRef = useRef<LocalDebateConfig>(initialConfig);
  const lastTrackedActivityIdRef = useRef<string>(safeActivity.id);

  // Atualiza a ref sempre que localConfig mudar
  const updateLocalConfigState = useCallback((updater: LocalDebateConfig | ((prev: LocalDebateConfig) => LocalDebateConfig)) => {
    setLocalConfig((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      latestConfigRef.current = next;
      return next;
    });
  }, []);

  // Só reinicializa se trocar de atividade (evita apagar alunos recém-selecionados na Turma 203!)
  useEffect(() => {
    if (safeActivity.id && safeActivity.id !== lastTrackedActivityIdRef.current) {
      lastTrackedActivityIdRef.current = safeActivity.id;
      const fresh = buildConfigFromSource(debateConfigProp || safeActivity.gameData?.debateConfig);
      latestConfigRef.current = fresh;
      setLocalConfig(fresh);
    }
  }, [safeActivity.id, debateConfigProp, safeActivity.gameData?.debateConfig, buildConfigFromSource]);

  const [statusBanner, setStatusBanner] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isSavingAnswers, setIsSavingAnswers] = useState(false);

  const notify = useCallback((type: 'success' | 'error' | 'info', text: string) => {
    setStatusBanner({ type, text });
    setTimeout(() => {
      setStatusBanner((prev) => (prev?.text === text ? null : prev));
    }, 5000);
  }, []);

  // Função para o aluno ou professor sincronizar com o servidor sob demanda
  const handleRefreshFromServer = useCallback(async () => {
    if (!safeActivity.id || safeActivity.id === 'debate-live') return;
    setIsRefreshingBench(true);
    try {
      const r = await fetch('/api/activities');
      if (r.ok) {
        const d = await r.json();
        const found = (d.activities || []).find((a: Activity) => a.id === safeActivity.id);
        if (found) {
          setFetchedActivity(found);
          const merged = buildConfigFromSource(found.gameData?.debateConfig);
          latestConfigRef.current = merged;
          setLocalConfig(merged);
          notify('success', 'Bancadas e respostas sincronizadas com o servidor!');
        }
      }
    } catch {
      notify('error', 'Não foi possível sincronizar agora. Verifique sua conexão.');
    } finally {
      setIsRefreshingBench(false);
    }
  }, [safeActivity.id, buildConfigFromSource, notify]);

  const persistDebateConfig = useCallback(
    async (
      nextConfig: LocalDebateConfig,
      updatedSubmissions?: Activity['submissions'],
      toastMsg?: string,
      options?: { updateSource?: 'teacher_cockpit' | 'student_answers'; clearTurmaPrefix?: string }
    ) => {
      latestConfigRef.current = nextConfig;
      setLocalConfig(nextConfig);

      if (onUpdateDebateConfig) {
        await onUpdateDebateConfig(nextConfig);
      }

      const originalTurmaScope =
        (safeActivity as any)._originalTurmaScope || safeActivity.turma;

      const configForApi = {
        ...nextConfig,
        _updateSource: options?.updateSource || (isAuthenticatedTeacher ? 'teacher_cockpit' : 'student_answers'),
        ...(options?.clearTurmaPrefix ? { _clearTurmaPrefix: options.clearTurmaPrefix } : {}),
      };

      const updatedActivity: Activity = {
        ...safeActivity,
        turma: originalTurmaScope,
        submissions:
          updatedSubmissions !== undefined ? updatedSubmissions : safeActivity.submissions,
        totalSubmissions:
          updatedSubmissions !== undefined
            ? updatedSubmissions.length
            : safeActivity.totalSubmissions,
        pendingCorrection:
          updatedSubmissions !== undefined
            ? updatedSubmissions.filter((s) => s.status === 'pending').length
            : safeActivity.pendingCorrection,
        gameData: {
          ...(safeActivity.gameData || {
            introText: safeActivity.description || '',
            stages: [],
          }),
          debateConfig: configForApi as any,
        },
      };

      setFetchedActivity(updatedActivity);

      try {
        if (onSaveActivity) await onSaveActivity(updatedActivity);
        else if (onUpdateActivity) await onUpdateActivity(updatedActivity);

        if (safeActivity.id && safeActivity.id !== 'debate-live') {
          const res = await fetch('/api/activities', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedActivity),
          });
          if (!res.ok) throw new Error('Falha ao gravar no servidor');
        }

        if (toastMsg) notify('success', toastMsg);
      } catch (err) {
        console.warn('Aviso ao persistir configuração do debate:', err);
        if (toastMsg) notify('info', `${toastMsg} (Salvo no aparelho)`);
      }
    },
    [safeActivity, isAuthenticatedTeacher, onUpdateDebateConfig, onSaveActivity, onUpdateActivity, notify]
  );

  // ==========================================================================
  // ISOLAMENTO DE PARTICIPANTES E RESPOSTAS POR TURMA
  // ==========================================================================
  const allParticipants = useMemo(
    () => (Array.isArray(localConfig.participants) ? localConfig.participants : []),
    [localConfig.participants]
  );

  const turmaParticipants = useMemo(() => {
    return allParticipants
      .map((p) => {
        const found = rosterStudents.find(
          (s) =>
            s.id === p.studentId ||
            (Boolean(s.matricula) && s.matricula === p.studentId)
        );
        const resolvedName =
          (p.studentName && p.studentName.trim()) ||
          found?.fullName ||
          (found as any)?.name ||
          (p as any).fullName ||
          (p as any).name ||
          (p.studentId === 'teacher-sim' ? 'Simulação Docente' : '');
        return {
          ...p,
          studentName: resolvedName,
          turma: p.turma || found?.turma || currentTurmaScope,
        };
      })
      .filter((p) => {
        if (!p.studentId && !p.studentName) return false;
        if (p.turma) return isSameStudentTurma(p.turma, currentTurmaScope);
        return true;
      });
  }, [allParticipants, currentTurmaScope, rosterStudents]);

  const proMembers = useMemo(
    () => turmaParticipants.filter((p) => p.role === 'pro'),
    [turmaParticipants]
  );
  const contraMembers = useMemo(
    () => turmaParticipants.filter((p) => p.role === 'contra'),
    [turmaParticipants]
  );
  const jurorMembers = useMemo(
    () => turmaParticipants.filter((p) => p.role === 'juror'),
    [turmaParticipants]
  );

  const assignedIdsInTurma = useMemo(
    () => new Set(turmaParticipants.map((p) => p.studentId)),
    [turmaParticipants]
  );

  const unassignedClassmates = useMemo(
    () => getEligibleClassmatesForGroup(rosterStudents, currentTurmaScope, assignedIdsInTurma),
    [rosterStudents, currentTurmaScope, assignedIdsInTurma]
  );

  const [simulatedStudentRole, setSimulatedStudentRole] = useState<GroupRole>('pro');

  const myParticipantRecord = useMemo(() => {
    if (!activeStudent) return null;
    return (
      turmaParticipants.find(
        (p) =>
          p.studentId === activeStudent.id ||
          (Boolean(activeStudent.matricula) && p.studentId === activeStudent.matricula)
      ) || null
    );
  }, [activeStudent, turmaParticipants]);

  const myRole: GroupRole | null = isAuthenticatedTeacher
    ? simulatedStudentRole
    : myParticipantRecord?.role || null;

  const [studentStep, setStudentStep] = useState<1 | 2 | 3>(1);
  const [selectedClassmateIdToAdd, setSelectedClassmateIdToAdd] = useState<string>('');

  const answerScopePrefix = useMemo(() => {
    const cleanTurma = currentTurmaScope.replace(/[^a-zA-Z0-9]/g, '_');
    return `t_${cleanTurma}_`;
  }, [currentTurmaScope]);

  // Hidrata rascunho salvo no localStorage do aparelho do aluno para esta turma (proteção total contra perda)
  useEffect(() => {
    if (typeof window === 'undefined' || !safeActivity.id) return;
    try {
      const localDraftKey = `krono_debate_draft_${safeActivity.id}_${answerScopePrefix}`;
      const raw = localStorage.getItem(localDraftKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        updateLocalConfigState((prev) => ({
          ...prev,
          proAnswers: { ...(parsed.proAnswers || {}), ...(prev.proAnswers || {}) },
          contraAnswers: { ...(parsed.contraAnswers || {}), ...(prev.contraAnswers || {}) },
          jurorAnswers: { ...(parsed.jurorAnswers || {}), ...(prev.jurorAnswers || {}) },
        }));
      }
    } catch {}
  }, [safeActivity.id, answerScopePrefix, updateLocalConfigState]);

  // ITEM 3 CORRIGIDO: Lê ESTRITAMENTE a chave da turma (scopedKey = t_203_pro_q_1).
  // NUNCA puxa a chave global sem turma (questionId), impedindo que respostas prontas ou de outras turmas vazem!
  const getScopedAnswer = useCallback(
    (roleKey: GroupRole, questionId: string): string => {
      const scopedKey = `${answerScopePrefix}${questionId}`;
      if (roleKey === 'pro') {
        return localConfig.proAnswers?.[scopedKey] ?? '';
      }
      if (roleKey === 'contra') {
        return localConfig.contraAnswers?.[scopedKey] ?? '';
      }
      const jurorMap = localConfig.jurorAnswers || {};
      return jurorMap[scopedKey] ?? '';
    },
    [answerScopePrefix, localConfig.proAnswers, localConfig.contraAnswers, localConfig.jurorAnswers]
  );

  // Grava apenas na chave da turma atual + faz backup imediato no localStorage do dispositivo
  const handleChangeScopedAnswer = useCallback(
    (roleKey: GroupRole, questionId: string, val: string) => {
      const scopedKey = `${answerScopePrefix}${questionId}`;
      updateLocalConfigState((prev) => {
        const next: LocalDebateConfig =
          roleKey === 'pro'
            ? { ...prev, proAnswers: { ...(prev.proAnswers || {}), [scopedKey]: val } }
            : roleKey === 'contra'
            ? { ...prev, contraAnswers: { ...(prev.contraAnswers || {}), [scopedKey]: val } }
            : { ...prev, jurorAnswers: { ...(prev.jurorAnswers || {}), [scopedKey]: val } };

        if (typeof window !== 'undefined' && safeActivity.id) {
          try {
            const localDraftKey = `krono_debate_draft_${safeActivity.id}_${answerScopePrefix}`;
            localStorage.setItem(
              localDraftKey,
              JSON.stringify({
                proAnswers: next.proAnswers,
                contraAnswers: next.contraAnswers,
                jurorAnswers: next.jurorAnswers,
              })
            );
          } catch {}
        }
        return next;
      });
    },
    [answerScopePrefix, safeActivity.id, updateLocalConfigState]
  );

  // Resumos elaborados e Perguntas do Júri isolados por Turma
  const getScopedSummary = useCallback(
    (roleKey: GroupRole): string => {
      const defaults = buildDefaultElaborateSummaries(safeActivity.title);
      if (roleKey === 'pro') {
        return (
          localConfig.proSummariesByTurma?.[answerScopePrefix] ||
          localConfig.proSummaryAI ||
          defaults.proSummaryAI
        );
      }
      if (roleKey === 'contra') {
        return (
          localConfig.contraSummariesByTurma?.[answerScopePrefix] ||
          localConfig.contraSummaryAI ||
          defaults.contraSummaryAI
        );
      }
      return (
        localConfig.jurorQuestionsByTurma?.[answerScopePrefix] ||
        localConfig.jurorGuideAI ||
        defaults.jurorGuideAI
      );
    },
    [answerScopePrefix, localConfig, safeActivity.title]
  );

  const handleChangeScopedSummary = useCallback(
    (roleKey: GroupRole, val: string) => {
      updateLocalConfigState((prev) => {
        if (roleKey === 'pro') {
          return {
            ...prev,
            proSummaryAI: val,
            proSummariesByTurma: { ...(prev.proSummariesByTurma || {}), [answerScopePrefix]: val },
          };
        }
        if (roleKey === 'contra') {
          return {
            ...prev,
            contraSummaryAI: val,
            contraSummariesByTurma: { ...(prev.contraSummariesByTurma || {}), [answerScopePrefix]: val },
          };
        }
        return {
          ...prev,
          jurorGuideAI: val,
          jurorQuestionsByTurma: { ...(prev.jurorQuestionsByTurma || {}), [answerScopePrefix]: val },
        };
      });
    },
    [answerScopePrefix, updateLocalConfigState]
  );

  // Permite ao professor limpar respostas de teste da turma atual com 1 clique
  const handleClearCurrentTurmaAnswers = async () => {
    const current = latestConfigRef.current;
    const cleanMap = (mapObj: Record<string, string> = {}) => {
      const copy = { ...mapObj };
      Object.keys(copy).forEach((k) => {
        if (k.startsWith(answerScopePrefix)) {
          copy[k] = '';
        }
      });
      return copy;
    };

    const nextConfig: LocalDebateConfig = {
      ...current,
      proAnswers: cleanMap(current.proAnswers),
      contraAnswers: cleanMap(current.contraAnswers),
      jurorAnswers: cleanMap(current.jurorAnswers),
    };

    if (typeof window !== 'undefined' && safeActivity.id) {
      try {
        localStorage.removeItem(`krono_debate_draft_${safeActivity.id}_${answerScopePrefix}`);
      } catch {}
    }

    await persistDebateConfig(
      nextConfig,
      undefined,
      `Caixas de resposta da Turma ${currentTurmaScope} limpas e prontas para os alunos!`,
      { updateSource: 'teacher_cockpit', clearTurmaPrefix: answerScopePrefix }
    );
  };

  // ==========================================================================
  // ITEM 2 & 4 CORRIGIDO: ALOCAÇÃO EXCLUSIVA PELO PROFESSOR SEM CONDIÇÃO DE CORRIDA
  // ==========================================================================
  const handleAddStudentToGroup = async (
    targetStudent: { id: string; fullName: string; turma?: string },
    targetRole: GroupRole
  ) => {
    // Sempre lê a referência síncrona mais recente (permite adicionar 8, 9, 15 alunos seguidos sem perder nenhum!)
    const currentCfg = latestConfigRef.current;
    const currentList = Array.isArray(currentCfg.participants) ? currentCfg.participants : [];

    const rosterMatch = rosterStudents.find(
      (s) => s.id === targetStudent.id || (Boolean(s.matricula) && s.matricula === targetStudent.id)
    );
    const resolvedFullName =
      (targetStudent.fullName && targetStudent.fullName.trim()) ||
      rosterMatch?.fullName ||
      (rosterMatch as any)?.name ||
      (targetStudent as any).name ||
      'Estudante';
    const resolvedTurma = targetStudent.turma || rosterMatch?.turma || currentTurmaScope;

    const filtered = currentList.filter((p) => p.studentId !== targetStudent.id);
    const existingForRoleInTurma = filtered.filter(
      (p) => p.role === targetRole && isSameStudentTurma(p.turma || '', resolvedTurma)
    );
    const isFirstLeader = existingForRoleInTurma.length === 0;

    const newParticipant: LocalDebateParticipant = {
      studentId: targetStudent.id,
      studentName: resolvedFullName,
      role: targetRole,
      turma: resolvedTurma,
      isLeader: isFirstLeader,
    };

    const nextParticipants = [...filtered, newParticipant];
    const nextConfig: LocalDebateConfig = {
      ...currentCfg,
      participants: nextParticipants,
    };

    setSelectedClassmateIdToAdd('');
    await persistDebateConfig(
      nextConfig,
      undefined,
      `${resolvedFullName} alocado(a) em ${
        targetRole === 'pro'
          ? '🏛️ Girondinos'
          : targetRole === 'contra'
          ? '🔥 Jacobinos'
          : '⚖️ Júri de Analistas'
      } (Turma ${resolvedTurma})!`,
      { updateSource: 'teacher_cockpit' }
    );
  };

  const handleRemoveStudentFromGroup = async (studentId: string, studentName: string) => {
    const currentCfg = latestConfigRef.current;
    const currentList = Array.isArray(currentCfg.participants) ? currentCfg.participants : [];
    const nextParticipants = currentList.filter((p) => p.studentId !== studentId);
    const nextConfig: LocalDebateConfig = {
      ...currentCfg,
      participants: nextParticipants,
    };
    await persistDebateConfig(
      nextConfig,
      undefined,
      `${studentName || 'Aluno'} removido(a) da bancada.`,
      { updateSource: 'teacher_cockpit' }
    );
  };

  const handleMoveStudentGroup = async (
    participant: LocalDebateParticipant,
    newRole: GroupRole
  ) => {
    if (participant.role === newRole) return;
    await handleAddStudentToGroup(
      {
        id: participant.studentId,
        fullName: participant.studentName,
        turma: participant.turma || currentTurmaScope,
      },
      newRole
    );
  };

  // ==========================================================================
  // ITEM 4 CORRIGIDO: SALVAMENTO GARANTIDO DAS 6 RESPOSTAS PELO ALUNO (PASSO 1)
  // ==========================================================================
  const handleStudentSaveStep1Answers = async (advanceToStep2: boolean = false) => {
    if (!myRole) return;
    setIsSavingAnswers(true);
    try {
      const currentCfg = latestConfigRef.current;

      // Compila as respostas atuais do grupo para já garantir registro em submissions também
      const myTeamMembers =
        myRole === 'pro' ? proMembers : myRole === 'contra' ? contraMembers : jurorMembers;
      const submitterName = activeStudent?.fullName || 'Estudante';
      const memberNamesCsv =
        myTeamMembers.length > 0
          ? myTeamMembers.map((m) => m.studentName).filter(Boolean).join(', ')
          : submitterName;

      const questionsList: LocalDebateQuestion[] =
        myRole === 'pro'
          ? currentCfg.proQuestions
          : myRole === 'contra'
          ? currentCfg.contraQuestions
          : currentCfg.jurorQuestions;

      const compiledText = questionsList
        .map((q, idx) => {
          const scopedKey = `${answerScopePrefix}${q.id}`;
          const mapToRead =
            myRole === 'pro'
              ? currentCfg.proAnswers
              : myRole === 'contra'
              ? currentCfg.contraAnswers
              : currentCfg.jurorAnswers;
          const ans = (mapToRead?.[scopedKey] || '').trim() || '(Em elaboração)';
          return `[Pergunta ${idx + 1} - ${q.sociologicalConcept}]: ${q.prompt}\nResposta da Bancada: ${ans}`;
        })
        .join('\n\n');

      const roleHeader =
        myRole === 'pro'
          ? 'BANCADA DOS GIRONDINOS (PRÓ)'
          : myRole === 'contra'
          ? 'BANCADA DOS JACOBINOS (CONTRA)'
          : 'JÚRI DE ANALISTAS';

      const partialReport = `=== PESQUISA DA ${roleHeader} • TURMA ${currentTurmaScope} ===\nIntegrantes alocados pelo Professor: ${memberNamesCsv}\n\n${compiledText}`;

      await persistDebateConfig(
        currentCfg,
        undefined,
        `✅ As 6 respostas da sua bancada foram salvas com segurança para todo o grupo!`,
        { updateSource: 'student_answers' }
      );

      if (onSubmitAnswer && activeStudent) {
        await onSubmitAnswer(
          safeActivity.id,
          activeStudent.id,
          partialReport,
          0,
          0,
          safeActivity.maxGrade || 10,
          {},
          memberNamesCsv
        );
      }

      if (advanceToStep2) {
        setStudentStep(2);
      }
    } finally {
      setIsSavingAnswers(false);
    }
  };

  // ==========================================================================
  // ITENS 5 E 6 CORRIGIDOS: GERAÇÃO DE RESUMOS E PERGUNTAS DO JÚRI POR TURMA
  // ==========================================================================
  const handleGenerateGroupSynthesis = async () => {
    setIsGeneratingAI(true);
    try {
      const currentCfg = latestConfigRef.current;

      // Extrai as 6 respostas da turma ativa (sem prefixo) para a API de IA ler os textos reais!
      const proAnswersForTurma: Record<string, string> = {};
      (currentCfg.proQuestions || []).forEach((q) => {
        proAnswersForTurma[q.id] = currentCfg.proAnswers?.[`${answerScopePrefix}${q.id}`] || '';
      });

      const contraAnswersForTurma: Record<string, string> = {};
      (currentCfg.contraQuestions || []).forEach((q) => {
        contraAnswersForTurma[q.id] = currentCfg.contraAnswers?.[`${answerScopePrefix}${q.id}`] || '';
      });

      const jurorAnswersForTurma: Record<string, string> = {};
      (currentCfg.jurorQuestions || []).forEach((q) => {
        jurorAnswersForTurma[q.id] = currentCfg.jurorAnswers?.[`${answerScopePrefix}${q.id}`] || '';
      });

      const res = await fetch('/api/gemini/debate-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: safeActivity.title,
          topic: safeActivity.description || safeActivity.title,
          turma: currentTurmaScope,
          proQuestions: currentCfg.proQuestions,
          contraQuestions: currentCfg.contraQuestions,
          jurorQuestions: currentCfg.jurorQuestions,
          proAnswers: proAnswersForTurma,
          contraAnswers: contraAnswersForTurma,
          jurorAnswers: jurorAnswersForTurma,
        }),
      });

      const defaults = buildDefaultElaborateSummaries(safeActivity.title);
      let nextConfig = { ...currentCfg };

      if (res.ok) {
        const data = await res.json();
        const proText = data.proSummary || data.proSummaryAI || defaults.proSummaryAI;
        const contraText = data.contraSummary || data.contraSummaryAI || defaults.contraSummaryAI;
        const jurorText = data.jurorGuideSummary || data.jurorGuideAI || defaults.jurorGuideAI;

        nextConfig = {
          ...currentCfg,
          proSummaryAI: proText,
          contraSummaryAI: contraText,
          jurorGuideAI: jurorText,
          proSummariesByTurma: {
            ...(currentCfg.proSummariesByTurma || {}),
            [answerScopePrefix]: proText,
          },
          contraSummariesByTurma: {
            ...(currentCfg.contraSummariesByTurma || {}),
            [answerScopePrefix]: contraText,
          },
          jurorQuestionsByTurma: {
            ...(currentCfg.jurorQuestionsByTurma || {}),
            [answerScopePrefix]: jurorText,
          },
        };
      }

      await persistDebateConfig(
        nextConfig,
        undefined,
        `Sínteses das Bancadas e Perguntas de Sabatina do Júri geradas com base nas respostas da Turma ${currentTurmaScope}!`
      );
    } catch (e) {
      notify('error', 'Não foi possível regenerar agora. As sínteses atuais foram mantidas.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // ==========================================================================
  // SUBMISSÃO FINAL DO GRUPO NO PASSO 3 (O GRANDE DEBATE)
  // ==========================================================================
  const [groupFinalArgument, setGroupFinalArgument] = useState<string>('');
  const [jurorChecklistPro, setJurorChecklistPro] = useState<Record<string, boolean>>({});
  const [jurorChecklistContra, setJurorChecklistContra] = useState<Record<string, boolean>>({});
  const [jurorVerdictComment, setJurorVerdictComment] = useState<string>('');

  const handleStudentFinishDebateStep3 = async () => {
    if (!myRole) return;
    const studentSubmitter = activeStudent || {
      id: 'teacher-sim',
      fullName: 'Simulação Docente',
    };

    const myTeamMembers =
      myRole === 'pro' ? proMembers : myRole === 'contra' ? contraMembers : jurorMembers;
    const memberNamesCsv =
      myTeamMembers.length > 0
        ? myTeamMembers.map((m) => m.studentName).filter(Boolean).join(', ')
        : studentSubmitter.fullName;

    const questionsList: LocalDebateQuestion[] =
      myRole === 'pro'
        ? localConfig.proQuestions
        : myRole === 'contra'
        ? localConfig.contraQuestions
        : localConfig.jurorQuestions;

    const compiledQuestionsAndAnswers = questionsList
      .map((q, idx) => {
        const ans = getScopedAnswer(myRole, q.id) || '(Sem resposta registrada)';
        return `[Pergunta ${idx + 1} - ${q.sociologicalConcept}]: ${q.prompt}\nResposta da Equipe: ${ans}`;
      })
      .join('\n\n');

    let finalReportText = `=== RELATÓRIO DE TRAJETÓRIA DO GRUPO (${
      myRole === 'pro'
        ? 'BANCADA DOS GIRONDINOS'
        : myRole === 'contra'
        ? 'BANCADA DOS JACOBINOS'
        : 'JÚRI DE ANALISTAS'
    }) • TURMA ${currentTurmaScope} ===\nIntegrantes: ${memberNamesCsv}\n\n${compiledQuestionsAndAnswers}`;

    if (myRole === 'juror') {
      const proScoreCount = Object.values(jurorChecklistPro).filter(Boolean).length;
      const contraScoreCount = Object.values(jurorChecklistContra).filter(Boolean).length;
      finalReportText += `\n\n=== VEREDITO DO GRANDE DEBATE (JURADOS) ===\nCritérios cumpridos pelos Girondinos: ${proScoreCount}/${
        localConfig.checklistCriteria.length || 6
      }\nCritérios cumpridos pelos Jacobinos: ${contraScoreCount}/${
        localConfig.checklistCriteria.length || 6
      }\nParecer Fundamentado do Júri: ${jurorVerdictComment || 'Registrado em sala.'}`;
    } else if (groupFinalArgument.trim()) {
      finalReportText += `\n\n=== SÍNTESE FINAL DO GRANDE DEBATE ===\n${groupFinalArgument.trim()}`;
    }

    await persistDebateConfig(latestConfigRef.current, undefined, undefined, {
      updateSource: 'student_answers',
    });

    if (onSubmitAnswer && activeStudent) {
      await onSubmitAnswer(
        safeActivity.id,
        activeStudent.id,
        finalReportText,
        0,
        0,
        safeActivity.maxGrade || 10,
        {},
        memberNamesCsv
      );
    }

    if (onFinishGame) {
      onFinishGame(safeActivity.maxGrade || 10, memberNamesCsv);
    }

    notify(
      'success',
      `As 6 respostas e a participação de todo o grupo (${memberNamesCsv}) foram salvas e enviadas ao Professor!`
    );
  };

  // ==========================================================================
  // TIMER OFICIAL DO PROFESSOR PARA O GRANDE DEBATE
  // ==========================================================================
  const [activeTimerPresetId, setActiveTimerPresetId] = useState<string>('exp_pro');
  const [timerSecondsLeft, setTimerSecondsLeft] = useState<number>(180);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  useEffect(() => {
    if (!isTimerRunning) return;
    const interval = setInterval(() => {
      setTimerSecondsLeft((prev) => {
        if (prev <= 1) {
          setIsTimerRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const formatTimerMMSS = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // ==========================================================================
  // CHECKLIST DE AVALIAÇÃO DO PROFESSOR POR GRUPO -> ABA CORREÇÕES
  // ==========================================================================
  const [teacherTab, setTeacherTab] = useState<
    'grupos_timer' | 'perguntas_resumos' | 'checklist_notas'
  >('grupos_timer');

  const [teacherChecklists, setTeacherChecklists] = useState<
    Record<string, TeacherGroupChecklistState>
  >(() => {
    return localConfig.teacherChecklists || {};
  });

  useEffect(() => {
    if (localConfig.teacherChecklists) {
      setTeacherChecklists(localConfig.teacherChecklists);
    }
  }, [localConfig.teacherChecklists]);

  const getChecklistKey = (roleKey: GroupRole) => `${answerScopePrefix}${roleKey}`;

  const getGroupChecklistState = (roleKey: GroupRole): TeacherGroupChecklistState => {
    const key = getChecklistKey(roleKey);
    return (
      teacherChecklists[key] || {
        criteriaChecked: {},
        customScore: 0,
        teacherNotes: '',
      }
    );
  };

  const handleToggleTeacherCriterion = (roleKey: GroupRole, critId: string) => {
    const key = getChecklistKey(roleKey);
    const current = getGroupChecklistState(roleKey);
    const nextChecked = {
      ...current.criteriaChecked,
      [critId]: !current.criteriaChecked[critId],
    };

    const autoScore = DEFAULT_TEACHER_CRITERIA.reduce((acc, c) => {
      return acc + (nextChecked[c.id] ? c.weight : 0);
    }, 0);

    const roundedScore = Math.min(10, Math.round(autoScore * 10) / 10);

    setTeacherChecklists((prev) => ({
      ...prev,
      [key]: {
        ...current,
        criteriaChecked: nextChecked,
        customScore: roundedScore,
      },
    }));
  };

  const handleChangeTeacherGroupScore = (roleKey: GroupRole, score: number) => {
    const key = getChecklistKey(roleKey);
    const current = getGroupChecklistState(roleKey);
    setTeacherChecklists((prev) => ({
      ...prev,
      [key]: {
        ...current,
        customScore: Math.max(0, Math.min(10, score)),
      },
    }));
  };

  const handleChangeTeacherGroupNotes = (roleKey: GroupRole, notes: string) => {
    const key = getChecklistKey(roleKey);
    const current = getGroupChecklistState(roleKey);
    setTeacherChecklists((prev) => ({
      ...prev,
      [key]: {
        ...current,
        teacherNotes: notes,
      },
    }));
  };

  const handleApplyGroupChecklistToCorrections = async (roleKey: GroupRole) => {
    const chk = getGroupChecklistState(roleKey);
    const teamMembers =
      roleKey === 'pro' ? proMembers : roleKey === 'contra' ? contraMembers : jurorMembers;

    if (teamMembers.length === 0) {
      notify(
        'error',
        `Adicione pelo menos 1 aluno ao grupo (${roleKey.toUpperCase()}) na Turma ${currentTurmaScope} antes de lançar a nota.`
      );
      return;
    }

    const memberRosterObjects: StudentUser[] = teamMembers.map((m) => {
      const found = rosterStudents.find((s) => s.id === m.studentId);
      return (
        found || {
          id: m.studentId,
          fullName: m.studentName,
          matricula: m.studentId,
          turma: currentTurmaScope,
          tag: 'REGULAR',
          avatarUrl: '',
          xp: 100,
          level: 1,
        }
      );
    });

    const questionsList =
      roleKey === 'pro'
        ? localConfig.proQuestions
        : roleKey === 'contra'
        ? localConfig.contraQuestions
        : localConfig.jurorQuestions;

    const compiledQAs = questionsList
      .map((q, idx) => {
        const ans = getScopedAnswer(roleKey, q.id) || '(Resposta apresentada oralmente em sala)';
        return `[Questão ${idx + 1} - ${q.sociologicalConcept}]: ${q.prompt}\nResposta: ${ans}`;
      })
      .join('\n\n');

    const checkedLabels = DEFAULT_TEACHER_CRITERIA.filter(
      (c) => chk.criteriaChecked[c.id]
    ).map((c) => `✓ ${c.label} (+${c.weight} pts)`);

    const feedbackSummary = [
      `[AVALIAÇÃO DO DEBATE SEM PAPEL • ${
        roleKey === 'pro'
          ? 'BANCADA DOS GIRONDINOS'
          : roleKey === 'contra'
          ? 'BANCADA DOS JACOBINOS'
          : 'JÚRI DE ANALISTAS'
      } • TURMA ${currentTurmaScope}]`,
      checkedLabels.length > 0
        ? `Critérios Atingidos:\n${checkedLabels.join('\n')}`
        : 'Avaliação direta atribuída pelo professor.',
      chk.teacherNotes ? `Parecer do Professor: ${chk.teacherNotes}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    const groupRoleLabel =
      roleKey === 'pro'
        ? 'Bancada dos Girondinos'
        : roleKey === 'contra'
        ? 'Bancada dos Jacobinos'
        : 'Júri de Analistas';

    const syncedActivity = syncGroupGradeToSubmissions({
      activity: safeActivity,
      groupMembers: memberRosterObjects,
      finalScore: chk.customScore,
      checklistSummary: feedbackSummary,
      groupCompiledAnswer: compiledQAs,
      groupRoleLabel,
    });
    const syncedSubmissions = syncedActivity.submissions || [];

    const nextChecklists = {
      ...teacherChecklists,
      [getChecklistKey(roleKey)]: {
        ...chk,
        appliedAt: new Date().toLocaleString('pt-BR'),
      },
    };

    setTeacherChecklists(nextChecklists);

    const nextConfig: LocalDebateConfig = {
      ...latestConfigRef.current,
      teacherChecklists: nextChecklists,
      groupGrades: {
        ...(latestConfigRef.current.groupGrades || {}),
        [getChecklistKey(roleKey)]: chk.customScore,
      },
    };

    await persistDebateConfig(
      nextConfig,
      syncedSubmissions,
      `Nota ${chk.customScore.toFixed(1)} aplicada a todos os ${teamMembers.length} integrante(s) do grupo e sincronizada na Aba Correções!`,
      { updateSource: 'teacher_cockpit' }
    );
  };

  return (
    <div className="w-full max-w-6xl mx-auto text-slate-100 space-y-6 pb-12">
      {isAuthenticatedTeacher && (
        <div className="p-3 rounded-2xl bg-slate-900/95 border border-cyan-500/40 flex flex-wrap items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
            <Scale className="w-4 h-4" />
            <span>Modo de Visualização do Professor (Turma {currentTurmaScope}):</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewModeOverride('teacher')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all ${
                isTeacherMode
                  ? 'bg-cyan-500 text-slate-950 shadow-md'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Cockpit do Professor (Timer, Grupos & Notas)</span>
            </button>
            <button
              type="button"
              onClick={() => setViewModeOverride('student_sim')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all ${
                !isTeacherMode
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Simular Bancada do Aluno</span>
            </button>
          </div>
        </div>
      )}

      {isTeacherMode ? (
        <DebateTeacherCockpit
          currentTurmaScope={currentTurmaScope}
          safeActivity={safeActivity}
          setSelectedTeacherTurma={setSelectedTeacherTurma}
          availableTurmas={availableTurmas}
          onClose={onClose}
          setTeacherTab={setTeacherTab}
          teacherTab={teacherTab}
          turmaParticipants={turmaParticipants}
          statusBanner={statusBanner}
          setStatusBanner={setStatusBanner}
          timerSecondsLeft={timerSecondsLeft}
          formatTimerMMSS={formatTimerMMSS}
          setIsTimerRunning={setIsTimerRunning}
          isTimerRunning={isTimerRunning}
          activeTimerPresetId={activeTimerPresetId}
          setTimerSecondsLeft={setTimerSecondsLeft}
          setActiveTimerPresetId={setActiveTimerPresetId}
          proMembers={proMembers}
          contraMembers={contraMembers}
          jurorMembers={jurorMembers}
          localConfig={localConfig}
          handleAddStudentToGroup={handleAddStudentToGroup}
          unassignedClassmates={unassignedClassmates}
          handleMoveStudentGroup={handleMoveStudentGroup}
          handleRemoveStudentFromGroup={handleRemoveStudentFromGroup}
          handleGenerateGroupSynthesis={handleGenerateGroupSynthesis}
          isGeneratingAI={isGeneratingAI}
          persistDebateConfig={persistDebateConfig}
          setLocalConfig={updateLocalConfigState}
          getScopedAnswer={getScopedAnswer}
          handleChangeScopedAnswer={handleChangeScopedAnswer}
          getScopedSummary={getScopedSummary}
          handleChangeScopedSummary={handleChangeScopedSummary}
          handleClearCurrentTurmaAnswers={handleClearCurrentTurmaAnswers}
          getGroupChecklistState={getGroupChecklistState}
          handleToggleTeacherCriterion={handleToggleTeacherCriterion}
          handleChangeTeacherGroupScore={handleChangeTeacherGroupScore}
          handleChangeTeacherGroupNotes={handleChangeTeacherGroupNotes}
          handleApplyGroupChecklistToCorrections={handleApplyGroupChecklistToCorrections}
        />
      ) : (
        <DebateStudentBenchView
          myRole={myRole}
          proMembers={proMembers}
          contraMembers={contraMembers}
          jurorMembers={jurorMembers}
          localConfig={localConfig}
          currentTurmaScope={currentTurmaScope}
          safeActivity={safeActivity}
          isAuthenticatedTeacher={isAuthenticatedTeacher}
          simulatedStudentRole={simulatedStudentRole}
          setSimulatedStudentRole={setSimulatedStudentRole}
          statusBanner={statusBanner}
          setStatusBanner={setStatusBanner}
          activeStudent={activeStudent}
          studentStep={studentStep}
          setStudentStep={setStudentStep}
          getScopedAnswer={getScopedAnswer}
          handleChangeScopedAnswer={handleChangeScopedAnswer}
          getScopedSummary={getScopedSummary}
          handleStudentSaveStep1Answers={handleStudentSaveStep1Answers}
          isSavingAnswers={isSavingAnswers}
          handleRefreshFromServer={handleRefreshFromServer}
          isRefreshingBench={isRefreshingBench}
          handleGenerateGroupSynthesis={handleGenerateGroupSynthesis}
          isGeneratingAI={isGeneratingAI}
          persistDebateConfig={persistDebateConfig}
          jurorChecklistPro={jurorChecklistPro}
          setJurorChecklistPro={setJurorChecklistPro}
          jurorChecklistContra={jurorChecklistContra}
          setJurorChecklistContra={setJurorChecklistContra}
          jurorVerdictComment={jurorVerdictComment}
          setJurorVerdictComment={setJurorVerdictComment}
          groupFinalArgument={groupFinalArgument}
          setGroupFinalArgument={setGroupFinalArgument}
          handleStudentFinishDebateStep3={handleStudentFinishDebateStep3}
        />
      )}
    </div>
  );
};
