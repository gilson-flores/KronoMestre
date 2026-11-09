'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Activity, StudentUser, TeacherUser } from '@/lib/types';
import {
  Scale,
  Clock,
  Play,
  Pause,
  RotateCcw,
  CheckSquare,
  Trash2,
  UserPlus,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import {
  isSameStudentTurma,
  getEligibleClassmatesForGroup,
  syncGroupGradeToSubmissions,
} from '@/lib/groupActivityUtils';

type GroupRole = 'pro' | 'contra' | 'juror';

export interface LocalDebateQuestion {
  id: string;
  number?: number;
  side?: string;
  sociologicalConcept: string;
  prompt: string;
  researchHint?: string;
}

export interface LocalDebateParticipant {
  studentId: string;
  studentName: string;
  role: GroupRole;
  turma?: string;
  isLeader?: boolean;
}

export interface LocalDebateCriterion {
  id: string;
  number?: number;
  title?: string;
  criterion?: string;
  description: string;
}

export interface LocalDebateConfig {
  maxJurors: number;
  proQuestions: LocalDebateQuestion[];
  contraQuestions: LocalDebateQuestion[];
  jurorQuestions?: LocalDebateQuestion[];
  checklistCriteria: LocalDebateCriterion[];
  jurorInitialGuide: string;
  participants: LocalDebateParticipant[];
  proAnswers: Record<string, string>;
  contraAnswers: Record<string, string>;
  jurorAnswers?: Record<string, string>;
  proResearchCompleted?: boolean;
  contraResearchCompleted?: boolean;
  proSummaryAI?: string;
  contraSummaryAI?: string;
  jurorGuideAI?: string;
  jurorVerdicts: any[];
  gradingMode?: 'group' | 'individual';
  groupGrades?: Record<string, number>;
  individualGrades?: Record<string, number>;
  teacherChecklists?: Record<string, TeacherGroupChecklistState>;
  [key: string]: any;
}

interface TeacherGroupChecklistState {
  criteriaChecked: Record<string, boolean>;
  customScore: number;
  teacherNotes: string;
  appliedAt?: string;
}

export interface DebatePaperlessViewProps {
  activity?: Activity | null;
  debateConfig?: any;
  title?: string;
  topic?: string;
  student?: StudentUser | null;
  currentStudent?: StudentUser | null;
  students?: StudentUser[];
  allStudents?: StudentUser[];
  teacher?: TeacherUser | null;
  isTeacher?: boolean;
  isTeacherPreview?: boolean;
  role?: 'teacher' | 'student' | 'second_teacher' | string | null;
  onSaveActivity?: (updatedActivity: Activity) => void | Promise<void>;
  onUpdateActivity?: (updatedActivity: Activity) => void | Promise<void>;
  onUpdateDebateConfig?: (updatedConfig: any) => void | Promise<void>;
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
  onFinishGame?: (finalScore: number, groupMembersStr?: string) => void;
  onClose?: () => void;
  [key: string]: any;
}

const DEFAULT_TEACHER_CRITERIA = [
  { id: 'tc_1', label: 'Domínio Conceitual Sociológico', weight: 2.0 },
  { id: 'tc_2', label: 'Uso de Evidências, Dados e Fatos Reais', weight: 2.0 },
  { id: 'tc_3', label: 'Coerência Argumentativa na Exposição', weight: 2.0 },
  { id: 'tc_4', label: 'Capacidade de Réplica, Tréplica ou Análise Crítica', weight: 1.5 },
  { id: 'tc_5', label: 'Articulação em Equipe e Divisão de Fala', weight: 1.5 },
  { id: 'tc_6', label: 'Respeito ao Tempo (Timer) e Postura Democrática', weight: 1.0 },
];

const DEBATE_TIMER_PRESETS = [
  { id: 'exp_pro', label: '🎙️ Exposição Inicial • PRÓ', seconds: 180 },
  { id: 'exp_contra', label: '⚡ Exposição Inicial • CONTRA', seconds: 180 },
  { id: 'rep_pro', label: '🔄 Réplica • PRÓ', seconds: 120 },
  { id: 'rep_contra', label: '🛡️ Réplica • CONTRA', seconds: 120 },
  { id: 'sabatina_juror', label: '⚖️ Perguntas dos Jurados', seconds: 120 },
  { id: 'final', label: '🏁 Considerações Finais', seconds: 90 },
];

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
  // Auto-hidratação de Sessão, Alunos e Atividade quando chamado via KronoGamePlayer
  const [sessionRole, setSessionRole] = useState<string | null>(roleProp || null);
  const [sessionStudent, setSessionStudent] = useState<StudentUser | null>(
    student || currentStudent || null
  );
  const [fetchedStudents, setFetchedStudents] = useState<StudentUser[]>([]);
  const [fetchedActivity, setFetchedActivity] = useState<Activity | null>(activityProp || null);

  useEffect(() => {
    if (activityProp) setFetchedActivity(activityProp);
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

    // 1. Hidratar sessão local/servidor se não veio por prop
    if (!student && !currentStudent && !roleProp) {
      try {
        const activeUid = sessionStorage.getItem('current_active_user_id') || '';
        const rawSession =
          (activeUid ? sessionStorage.getItem(`tenant_${activeUid}_active_session`) : null) ||
          sessionStorage.getItem('active_session');
        if (rawSession) {
          const parsed = JSON.parse(rawSession);
          if (parsed.role) setSessionRole(parsed.role);
          if (parsed.studentData) setSessionStudent(parsed.studentData);
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

    // 2. Hidratar lista de alunos da turma se não veio por prop
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

    // 3. Hidratar atividade correspondente se foi aberto via KronoGamePlayer apenas com debateConfig
    if (!activityProp) {
      fetch('/api/activities')
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d && Array.isArray(d.activities)) {
            const matched =
              d.activities.find(
                (a: Activity) =>
                  a.gameMode === 'debate_paperless' ||
                  Boolean(a.gameData?.debateConfig)
              ) || null;
            if (matched) setFetchedActivity(matched);
          }
        })
        .catch(() => {});
    }
  }, [student, currentStudent, roleProp, students, allStudents, activityProp]);

  const activeStudent = student || currentStudent || sessionStudent || null;
  const effectiveRole = roleProp || sessionRole;
  const isTeacherMode = Boolean(
    isTeacherProp ||
      isTeacherPreview ||
      effectiveRole === 'teacher' ||
      effectiveRole === 'second_teacher' ||
      (!activeStudent && effectiveRole !== 'student')
  );

  const safeActivity: Activity = useMemo(() => {
    if (activityProp) return activityProp;
    if (fetchedActivity) return fetchedActivity;
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

  const availableTurmas = useMemo(() => {
    const set = new Set<string>();
    rosterStudents.forEach((s) => {
      if (!s.isArchived && s.turma) set.add(s.turma.trim());
    });
    const rawActTurma = ((safeActivity as any)._originalTurmaScope || safeActivity.turma || '').trim();
    if (rawActTurma && rawActTurma.toLowerCase() !== 'todas') {
      rawActTurma
        .split(',')
        .map((t: string) => t.trim())
        .filter(Boolean)
        .forEach((t: string) => set.add(t));
    }
    const arr = Array.from(set).sort((a, b) => a.localeCompare(b));
    return arr.length > 0 ? arr : ['Geral'];
  }, [rosterStudents, safeActivity]);

  const [selectedTeacherTurma, setSelectedTeacherTurma] = useState<string>(() => {
    return availableTurmas[0] || 'Geral';
  });

  useEffect(() => {
    if (
      isTeacherMode &&
      availableTurmas.length > 0 &&
      !availableTurmas.includes(selectedTeacherTurma)
    ) {
      setSelectedTeacherTurma(availableTurmas[0]);
    }
  }, [isTeacherMode, availableTurmas, selectedTeacherTurma]);

  // REQ 1: O aluno SEMPRE enxerga apenas a sua própria turma
  const currentTurmaScope = useMemo(() => {
    if (!isTeacherMode && activeStudent?.turma) {
      return activeStudent.turma.trim();
    }
    return selectedTeacherTurma || availableTurmas[0] || 'Geral';
  }, [isTeacherMode, activeStudent?.turma, selectedTeacherTurma, availableTurmas]);

  const baseDebateConfig: LocalDebateConfig = useMemo(() => {
    const cfg: any = debateConfigProp || safeActivity.gameData?.debateConfig || {};
    return {
      maxJurors: cfg.maxJurors || 3,
      proQuestions: Array.isArray(cfg.proQuestions) ? cfg.proQuestions : [],
      contraQuestions: Array.isArray(cfg.contraQuestions) ? cfg.contraQuestions : [],
      jurorQuestions: Array.isArray(cfg.jurorQuestions)
        ? cfg.jurorQuestions
        : [
            {
              id: 'juror_q_1',
              number: 1,
              side: 'juror',
              sociologicalConcept: 'Verificação Conceitual e Imparcialidade',
              prompt: `Quais conceitos sociológicos e fatos concretos sobre "${safeActivity.title}" as bancadas Pró e Contra precisam comprovar para convencer o júri?`,
              researchHint: '',
            },
          ],
      checklistCriteria: Array.isArray(cfg.checklistCriteria) ? cfg.checklistCriteria : [],
      jurorInitialGuide:
        cfg.jurorInitialGuide ||
        'Acompanhem as teses e avaliem com imparcialidade sociológica nos 2 Checklists oficiais.',
      participants: Array.isArray(cfg.participants) ? cfg.participants : [],
      proAnswers: cfg.proAnswers || {},
      contraAnswers: cfg.contraAnswers || {},
      jurorAnswers: cfg.jurorAnswers || {},
      proResearchCompleted: Boolean(cfg.proResearchCompleted),
      contraResearchCompleted: Boolean(cfg.contraResearchCompleted),
      proSummaryAI: cfg.proSummaryAI || '',
      contraSummaryAI: cfg.contraSummaryAI || '',
      jurorGuideAI: cfg.jurorGuideAI || '',
      jurorVerdicts: Array.isArray(cfg.jurorVerdicts) ? cfg.jurorVerdicts : [],
      gradingMode: cfg.gradingMode || 'group',
      groupGrades: cfg.groupGrades || {},
      individualGrades: cfg.individualGrades || {},
      teacherChecklists: cfg.teacherChecklists || {},
    };
  }, [debateConfigProp, safeActivity]);

  const [localConfig, setLocalConfig] = useState<LocalDebateConfig>(baseDebateConfig);
  const [statusBanner, setStatusBanner] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  useEffect(() => {
    setLocalConfig(baseDebateConfig);
  }, [baseDebateConfig]);

  const notify = useCallback((type: 'success' | 'error' | 'info', text: string) => {
    setStatusBanner({ type, text });
    setTimeout(() => {
      setStatusBanner((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  }, []);

  const persistDebateConfig = useCallback(
    async (
      nextConfig: LocalDebateConfig,
      updatedSubmissions?: Activity['submissions'],
      toastMsg?: string
    ) => {
      setLocalConfig(nextConfig);

      if (onUpdateDebateConfig) {
        await onUpdateDebateConfig(nextConfig);
      }

      const originalTurmaScope =
        (safeActivity as any)._originalTurmaScope || safeActivity.turma;
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
          debateConfig: nextConfig as any,
        },
      };

      setFetchedActivity(updatedActivity);

      try {
        if (onSaveActivity) await onSaveActivity(updatedActivity);
        if (onUpdateActivity) await onUpdateActivity(updatedActivity);

        if (safeActivity.id && safeActivity.id !== 'debate-live') {
          await fetch('/api/activities', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedActivity),
          });
        }

        if (toastMsg) notify('success', toastMsg);
      } catch (err) {
        console.warn('Aviso ao persistir configuração do debate:', err);
        if (toastMsg) notify('info', toastMsg);
      }
    },
    [safeActivity, onUpdateDebateConfig, onSaveActivity, onUpdateActivity, notify]
  );

  // ==========================================================================
  // ISOLAMENTO DE PARTICIPANTES E RESPOSTAS POR TURMA (REQ 1)
  // ==========================================================================
  const allParticipants = useMemo(
    () => (Array.isArray(localConfig.participants) ? localConfig.participants : []),
    [localConfig.participants]
  );

  const turmaParticipants = useMemo(() => {
    return allParticipants.filter((p) => {
      if (p.turma) return isSameStudentTurma(p.turma, currentTurmaScope);
      const found = rosterStudents.find((s) => s.id === p.studentId);
      if (found?.turma) return isSameStudentTurma(found.turma, currentTurmaScope);
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

  // REQ 2: Colegas da mesma turma disponíveis na lista suspensa (<select>)
  const unassignedClassmates = useMemo(
    () => getEligibleClassmatesForGroup(rosterStudents, currentTurmaScope, assignedIdsInTurma),
    [rosterStudents, currentTurmaScope, assignedIdsInTurma]
  );

  const myParticipantRecord = useMemo(() => {
    if (!activeStudent) return null;
    return turmaParticipants.find((p) => p.studentId === activeStudent.id) || null;
  }, [activeStudent, turmaParticipants]);

  const myRole: GroupRole | null = myParticipantRecord?.role || null;

  // REQ 3: Passo atual do túnel do grupo (Passo 1 -> Passo 2 -> Passo 3: O Grande Debate)
  const [studentStep, setStudentStep] = useState<1 | 2 | 3>(1);
  const [selectedClassmateIdToAdd, setSelectedClassmateIdToAdd] = useState<string>('');

  const answerScopePrefix = useMemo(() => {
    const cleanTurma = currentTurmaScope.replace(/[^a-zA-Z0-9]/g, '_');
    return `t_${cleanTurma}_`;
  }, [currentTurmaScope]);

  const getScopedAnswer = useCallback(
    (roleKey: GroupRole, questionId: string): string => {
      const scopedKey = `${answerScopePrefix}${questionId}`;
      if (roleKey === 'pro') {
        return localConfig.proAnswers?.[scopedKey] ?? localConfig.proAnswers?.[questionId] ?? '';
      }
      if (roleKey === 'contra') {
        return (
          localConfig.contraAnswers?.[scopedKey] ??
          localConfig.contraAnswers?.[questionId] ??
          ''
        );
      }
      const jurorMap = localConfig.jurorAnswers || {};
      return jurorMap[scopedKey] ?? jurorMap[questionId] ?? '';
    },
    [answerScopePrefix, localConfig]
  );

  const handleChangeScopedAnswer = (roleKey: GroupRole, questionId: string, val: string) => {
    const scopedKey = `${answerScopePrefix}${questionId}`;
    setLocalConfig((prev) => {
      if (roleKey === 'pro') {
        return {
          ...prev,
          proAnswers: { ...(prev.proAnswers || {}), [scopedKey]: val, [questionId]: val },
        };
      }
      if (roleKey === 'contra') {
        return {
          ...prev,
          contraAnswers: { ...(prev.contraAnswers || {}), [scopedKey]: val, [questionId]: val },
        };
      }
      return {
        ...prev,
        jurorAnswers: { ...(prev.jurorAnswers || {}), [scopedKey]: val, [questionId]: val },
      };
    });
  };

  // ==========================================================================
  // INSCRIÇÃO E GERENCIAMENTO DE INTEGRANTES (REQ 2 & REQ 6)
  // ==========================================================================
  const handleAddStudentToGroup = async (
    targetStudent: { id: string; fullName: string; turma?: string },
    targetRole: GroupRole
  ) => {
    if (targetRole === 'juror' && jurorMembers.length >= (localConfig.maxJurors || 3)) {
      const alreadyInJurors = jurorMembers.some((j) => j.studentId === targetStudent.id);
      if (!alreadyInJurors) {
        notify(
          'error',
          `O Corpo de Jurados desta turma já atingiu o limite de ${localConfig.maxJurors || 3} integrantes.`
        );
        return;
      }
    }

    const filtered = allParticipants.filter((p) => p.studentId !== targetStudent.id);
    const existingForRoleInTurma = turmaParticipants.filter((p) => p.role === targetRole);
    const isFirstLeader = existingForRoleInTurma.length === 0;

    const newParticipant: LocalDebateParticipant = {
      studentId: targetStudent.id,
      studentName: targetStudent.fullName,
      role: targetRole,
      turma: targetStudent.turma || currentTurmaScope,
      isLeader: isFirstLeader,
    };

    const nextParticipants = [...filtered, newParticipant];
    const nextConfig: LocalDebateConfig = {
      ...localConfig,
      participants: nextParticipants,
    };

    setSelectedClassmateIdToAdd('');
    await persistDebateConfig(
      nextConfig,
      undefined,
      `${targetStudent.fullName} integrado(a) ao grupo ${
        targetRole === 'pro'
          ? 'Bancada PRÓ'
          : targetRole === 'contra'
          ? 'Bancada CONTRA'
          : 'Corpo de JURADOS'
      }!`
    );
  };

  const handleRemoveStudentFromGroup = async (studentId: string, studentName: string) => {
    const nextParticipants = allParticipants.filter((p) => p.studentId !== studentId);
    const nextConfig: LocalDebateConfig = {
      ...localConfig,
      participants: nextParticipants,
    };
    await persistDebateConfig(nextConfig, undefined, `${studentName} removido(a) do grupo.`);
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
  // SÍNTESE IA EXCLUSIVA DO GRUPO (PASSO 2)
  // ==========================================================================
  const handleGenerateGroupSynthesis = async (targetRole: GroupRole) => {
    setIsGeneratingAI(true);
    try {
      const res = await fetch('/api/gemini/debate-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: safeActivity.title,
          topic: safeActivity.description || safeActivity.title,
          proQuestions: localConfig.proQuestions,
          contraQuestions: localConfig.contraQuestions,
          proAnswers: localConfig.proAnswers,
          contraAnswers: localConfig.contraAnswers,
        }),
      });

      let nextConfig = { ...localConfig };
      if (res.ok) {
        const data = await res.json();
        nextConfig = {
          ...localConfig,
          proSummaryAI: data.proSummaryAI || localConfig.proSummaryAI,
          contraSummaryAI: data.contraSummaryAI || localConfig.contraSummaryAI,
          jurorGuideAI: data.jurorGuideAI || localConfig.jurorGuideAI,
        };
      } else {
        const fallbackText =
          targetRole === 'pro'
            ? `SÍNTESE ESTRATÉGICA BANCADA PRÓ (${currentTurmaScope}): Tese fundamentada nos eixos pesquisados pela equipe sobre "${safeActivity.title}".`
            : targetRole === 'contra'
            ? `SÍNTESE ESTRATÉGICA BANCADA CONTRA (${currentTurmaScope}): Contraponto crítico estruturado pela equipe sobre "${safeActivity.title}".`
            : `DOSSIÊ DE ANÁLISE DOS JURADOS (${currentTurmaScope}): Guia de verificação imparcial das teses Pró e Contra.`;

        if (targetRole === 'pro') nextConfig.proSummaryAI = fallbackText;
        if (targetRole === 'contra') nextConfig.contraSummaryAI = fallbackText;
        if (targetRole === 'juror') nextConfig.jurorGuideAI = fallbackText;
      }

      await persistDebateConfig(nextConfig, undefined, 'Dossiê Estratégico do Grupo atualizado!');
    } catch (e) {
      notify('error', 'Não foi possível gerar a síntese agora. Suas respostas já estão salvas.');
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
    if (!activeStudent || !myRole) return;

    const myTeamMembers =
      myRole === 'pro' ? proMembers : myRole === 'contra' ? contraMembers : jurorMembers;
    const memberNamesCsv = myTeamMembers.map((m) => m.studentName).join(', ');

    const questionsList: LocalDebateQuestion[] =
      myRole === 'pro'
        ? localConfig.proQuestions
        : myRole === 'contra'
        ? localConfig.contraQuestions
        : localConfig.jurorQuestions || [];

    const compiledQuestionsAndAnswers = questionsList
      .map((q, idx) => {
        const ans = getScopedAnswer(myRole, q.id) || '(Sem resposta registrada)';
        return `[Questão ${idx + 1} - ${q.sociologicalConcept}]: ${q.prompt}\nResposta da Equipe: ${ans}`;
      })
      .join('\n\n');

    let finalReportText = `=== RELATÓRIO DE TRAJETÓRIA DO GRUPO (${
      myRole === 'pro'
        ? 'BANCADA PRÓ'
        : myRole === 'contra'
        ? 'BANCADA CONTRA'
        : 'CORPO DE JURADOS'
    }) • TURMA ${currentTurmaScope} ===\nIntegrantes: ${memberNamesCsv}\n\n${compiledQuestionsAndAnswers}`;

    if (myRole === 'juror') {
      const proScoreCount = Object.values(jurorChecklistPro).filter(Boolean).length;
      const contraScoreCount = Object.values(jurorChecklistContra).filter(Boolean).length;
      finalReportText += `\n\n=== VEREDITO DO GRANDE DEBATE (JURADOS) ===\nCritérios cumpridos pela Bancada PRÓ: ${proScoreCount}/${
        localConfig.checklistCriteria.length || 6
      }\nCritérios cumpridos pela Bancada CONTRA: ${contraScoreCount}/${
        localConfig.checklistCriteria.length || 6
      }\nParecer Fundamentado do Júri: ${jurorVerdictComment || 'Registrado em sala.'}`;
    } else if (groupFinalArgument.trim()) {
      finalReportText += `\n\n=== SÍNTESE FINAL DO GRANDE DEBATE ===\n${groupFinalArgument.trim()}`;
    }

    if (onSubmitAnswer) {
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
      `Trajetória e participação de toda a equipe (${memberNamesCsv}) enviadas com sucesso para avaliação do Professor!`
    );
  };

  // ==========================================================================
  // REQ 4: TIMER OFICIAL DO PROFESSOR PARA O GRANDE DEBATE
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
  // REQ 5: CHECKLIST DE AVALIAÇÃO DO PROFESSOR POR GRUPO -> ABA CORREÇÕES
  // ==========================================================================
  const [teacherTab, setTeacherTab] = useState<'grupos_timer' | 'respostas' | 'checklist_notas'>(
    'grupos_timer'
  );

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
    const groupParticipants =
      roleKey === 'pro' ? proMembers : roleKey === 'contra' ? contraMembers : jurorMembers;

    if (groupParticipants.length === 0) {
      notify('error', 'Este grupo ainda não possui alunos cadastrados nesta turma.');
      return;
    }

    const groupStudentObjects: StudentUser[] = groupParticipants.map((p) => {
      const found = rosterStudents.find((s) => s.id === p.studentId);
      return (
        found || {
          id: p.studentId,
          fullName: p.studentName,
          matricula: p.studentId,
          turma: currentTurmaScope,
          tag: 'REGULAR',
          avatarUrl: '',
          xp: 0,
          level: 1,
          passwordHash: '',
        } as StudentUser
      );
    });

    const chkState = getGroupChecklistState(roleKey);
    const roleLabel =
      roleKey === 'pro'
        ? 'Bancada PRÓ'
        : roleKey === 'contra'
        ? 'Bancada CONTRA'
        : 'Corpo de JURADOS';

    const checkedLabels = DEFAULT_TEACHER_CRITERIA.filter(
      (c) => chkState.criteriaChecked[c.id]
    ).map((c) => `✅ ${c.label} (+${c.weight.toFixed(1)})`);

    const uncheckedLabels = DEFAULT_TEACHER_CRITERIA.filter(
      (c) => !chkState.criteriaChecked[c.id]
    ).map((c) => `⬜ ${c.label}`);

    const feedbackSummary = [
      `📋 CHECKLIST DE AVALIAÇÃO DO PROFESSOR — ${roleLabel.toUpperCase()} (Turma ${currentTurmaScope})`,
      `Nota Final do Grupo: ${chkState.customScore.toFixed(1)} / 10.0`,
      '',
      'Critérios Atendidos:',
      ...(checkedLabels.length > 0 ? checkedLabels : ['Nenhum critério marcado no checklist']),
      ...(uncheckedLabels.length > 0 ? ['', 'Critérios Pendentes:', ...uncheckedLabels] : []),
      ...(chkState.teacherNotes.trim()
        ? ['', `Parecer Pedagógico do Professor: ${chkState.teacherNotes.trim()}`]
        : []),
    ].join('\n');

    const questionsList: LocalDebateQuestion[] =
      roleKey === 'pro'
        ? localConfig.proQuestions
        : roleKey === 'contra'
        ? localConfig.contraQuestions
        : localConfig.jurorQuestions || [];

    const compiledAnswer = questionsList
      .map((q, idx) => {
        const ans = getScopedAnswer(roleKey, q.id) || '(Respondido oralmente / em grupo)';
        return `Questão ${idx + 1} (${q.sociologicalConcept}): ${q.prompt}\nResposta: ${ans}`;
      })
      .join('\n\n');

    const updatedActWithSubs = syncGroupGradeToSubmissions({
      activity: safeActivity,
      groupMembers: groupStudentObjects,
      finalScore: chkState.customScore,
      checklistSummary: feedbackSummary,
      groupCompiledAnswer: compiledAnswer,
      groupRoleLabel: roleLabel,
    });

    const key = getChecklistKey(roleKey);
    const nextTeacherChecklists = {
      ...teacherChecklists,
      [key]: {
        ...chkState,
        appliedAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      },
    };

    const nextConfig: LocalDebateConfig = {
      ...localConfig,
      groupGrades: {
        ...(localConfig.groupGrades || {}),
        [roleKey]: chkState.customScore,
      },
      teacherChecklists: nextTeacherChecklists,
    };

    setTeacherChecklists(nextTeacherChecklists);
    await persistDebateConfig(
      nextConfig,
      updatedActWithSubs.submissions,
      `Nota ${chkState.customScore.toFixed(1)} aplicada a todos os ${groupStudentObjects.length} integrantes do grupo (${roleLabel}) e vinculada à Aba Correções!`
    );
  };

  // ==========================================================================
  // RENDERIZAÇÃO: 1. PAINEL DE CONTROLE ROBUSTO DO PROFESSOR (REQ 4, 5, 6)
  // ==========================================================================
  if (isTeacherMode) {
    return (
      <div className="space-y-6 text-slate-100">
        <div className="p-5 rounded-3xl bg-[#070b14] border border-cyan-500/30 shadow-2xl space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-[10px] font-black uppercase tracking-wider">
                  Cockpit do Professor • Controle de Sala & Avaliação
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-black uppercase">
                  Turma Ativa: {currentTurmaScope}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                {safeActivity.title}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Gerencie os integrantes dos 3 grupos, controle o Timer Oficial do Grande Debate e aplique o Checklist de Avaliação conectado à aba Correções.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 bg-slate-900/90 border border-slate-800 p-2 rounded-2xl">
              <span className="text-xs font-bold text-slate-400 px-2">Sala em Aula:</span>
              <select
                value={currentTurmaScope}
                onChange={(e) => setSelectedTeacherTurma(e.target.value)}
                className="bg-slate-950 border border-cyan-500/40 rounded-xl px-3 py-2 text-xs font-black text-cyan-300 focus:outline-none"
              >
                {availableTurmas.map((t) => (
                  <option key={t} value={t}>
                    Turma {t}
                  </option>
                ))}
              </select>
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 cursor-pointer"
                >
                  Fechar
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTeacherTab('grupos_timer')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
                teacherTab === 'grupos_timer'
                  ? 'bg-cyan-500 text-slate-950 shadow-lg'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>1. Timer Ao Vivo & Gestão dos 3 Grupos ({turmaParticipants.length} alunos)</span>
            </button>

            <button
              type="button"
              onClick={() => setTeacherTab('checklist_notas')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
                teacherTab === 'checklist_notas'
                  ? 'bg-emerald-500 text-slate-950 shadow-lg'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              <span>2. Checklist de Avaliação do Professor (Ligado a Correções)</span>
            </button>

            <button
              type="button"
              onClick={() => setTeacherTab('respostas')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
                teacherTab === 'respostas'
                  ? 'bg-amber-500 text-slate-950 shadow-lg'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <Scale className="w-4 h-4" />
              <span>3. Espelho de Pesquisas & Dossiês da Turma</span>
            </button>
          </div>
        </div>

        {statusBanner && (
          <div
            className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between ${
              statusBanner.type === 'error'
                ? 'bg-rose-500/15 border-rose-500/40 text-rose-200'
                : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
            }`}
          >
            <span>{statusBanner.text}</span>
            <button
              type="button"
              onClick={() => setStatusBanner(null)}
              className="text-slate-300 hover:text-white ml-3"
            >
              ✕
            </button>
          </div>
        )}

        {teacherTab === 'grupos_timer' && (
          <div className="space-y-6">
            {/* TIMER OFICIAL DO GRANDE DEBATE (REQ 4) */}
            <div className="p-6 rounded-3xl bg-slate-900/95 border border-slate-800 shadow-xl space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 block">
                    CRONÔMETRO OFICIAL DE SALA • O GRANDE DEBATE
                  </span>
                  <h3 className="text-base font-black text-white">
                    Controle de Tempo por Rodada (Exposição, Réplica, Tréplica e Júri)
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div
                    className={`px-6 py-3 rounded-2xl font-mono text-3xl font-black tracking-widest border ${
                      timerSecondsLeft <= 15
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300 animate-pulse'
                        : timerSecondsLeft <= 60
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-slate-950 border-cyan-500/40 text-cyan-300'
                    }`}
                  >
                    {formatTimerMMSS(timerSecondsLeft)}
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsTimerRunning((prev) => !prev)}
                    className={`px-4 py-3 rounded-2xl text-xs font-black flex items-center gap-1.5 cursor-pointer ${
                      isTimerRunning
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                    }`}
                  >
                    {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    <span>{isTimerRunning ? 'Pausar' : 'Iniciar'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsTimerRunning(false);
                      const preset = DEBATE_TIMER_PRESETS.find((p) => p.id === activeTimerPresetId);
                      setTimerSecondsLeft(preset ? preset.seconds : 180);
                    }}
                    className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                    title="Reiniciar tempo da rodada"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setTimerSecondsLeft((prev) => Math.max(0, prev - 30))}
                    className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 cursor-pointer"
                  >
                    -30s
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimerSecondsLeft((prev) => prev + 30)}
                    className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 cursor-pointer"
                  >
                    +30s
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-2">
                {DEBATE_TIMER_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setIsTimerRunning(false);
                      setActiveTimerPresetId(preset.id);
                      setTimerSecondsLeft(preset.seconds);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      activeTimerPresetId === preset.id
                        ? 'bg-cyan-500/20 border-cyan-400 text-white'
                        : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="text-[11px] font-black block leading-tight">{preset.label}</span>
                    <span className="text-[10px] font-mono text-cyan-400 mt-1 block">
                      {formatTimerMMSS(preset.seconds)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* GESTÃO DOS 3 GRUPOS: ESCOLHER 1º ALUNO, MOVER ENTRE GRUPOS E EXCLUIR (REQ 2 & REQ 6) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {(
                [
                  {
                    roleKey: 'pro' as GroupRole,
                    title: '🟢 Bancada Favorável (PRÓ)',
                    subtitle: 'Defesa sociológica da tese favorável',
                    members: proMembers,
                    borderClass: 'border-emerald-500/40',
                    badgeClass: 'bg-emerald-500/20 text-emerald-300',
                  },
                  {
                    roleKey: 'contra' as GroupRole,
                    title: '🔴 Bancada Opositora (CONTRA)',
                    subtitle: 'Questionamento crítico e tensões estruturais',
                    members: contraMembers,
                    borderClass: 'border-rose-500/40',
                    badgeClass: 'bg-rose-500/20 text-rose-300',
                  },
                  {
                    roleKey: 'juror' as GroupRole,
                    title: '⚖️ Corpo de Jurados (Análise)',
                    subtitle: `Até ${localConfig.maxJurors || 3} jurados imparciais na turma`,
                    members: jurorMembers,
                    borderClass: 'border-amber-500/40',
                    badgeClass: 'bg-amber-500/20 text-amber-300',
                  },
                ] as const
              ).map((grp) => (
                <div
                  key={grp.roleKey}
                  className={`p-5 rounded-3xl bg-slate-900/90 border ${grp.borderClass} flex flex-col justify-between space-y-4`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-black text-white">{grp.title}</h4>
                        <p className="text-[11px] text-slate-400">{grp.subtitle}</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-xl text-xs font-black ${grp.badgeClass}`}>
                        {grp.members.length} integrante(s)
                      </span>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 block">
                        {grp.members.length === 0
                          ? '⭐ Escolher 1º Aluno (Líder do Grupo):'
                          : '+ Adicionar Aluno da Turma ao Grupo:'}
                      </label>
                      <div className="flex gap-2">
                        <select
                          value=""
                          onChange={(e) => {
                            const stId = e.target.value;
                            if (!stId) return;
                            const stObj = unassignedClassmates.find((s) => s.id === stId);
                            if (stObj) {
                              handleAddStudentToGroup(
                                { id: stObj.id, fullName: stObj.fullName, turma: stObj.turma },
                                grp.roleKey
                              );
                            }
                          }}
                          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                        >
                          <option value="">
                            Selecionar aluno da Turma {currentTurmaScope} ({unassignedClassmates.length} disponíveis)...
                          </option>
                          {unassignedClassmates.map((st) => (
                            <option key={st.id} value={st.id}>
                              {st.fullName}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {grp.members.length === 0 ? (
                        <p className="text-xs text-slate-500 italic py-4 text-center">
                          Nenhum aluno alocado neste grupo na Turma {currentTurmaScope}.
                        </p>
                      ) : (
                        grp.members.map((member, mIdx) => (
                          <div
                            key={member.studentId}
                            className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                {mIdx === 0 && (
                                  <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[9px] font-black uppercase">
                                    Líder
                                  </span>
                                )}
                                <span className="text-xs font-bold text-slate-100 truncate block">
                                  {member.studentName}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <select
                                value={member.role}
                                onChange={(e) =>
                                  handleMoveStudentGroup(member, e.target.value as GroupRole)
                                }
                                className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-200 focus:outline-none"
                                title="Mover aluno para outro grupo"
                              >
                                <option value="pro">🟢 Pró</option>
                                <option value="contra">🔴 Contra</option>
                                <option value="juror">⚖️ Jurado</option>
                              </select>

                              <button
                                type="button"
                                onClick={() =>
                                  handleRemoveStudentFromGroup(
                                    member.studentId,
                                    member.studentName
                                  )
                                }
                                className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 cursor-pointer"
                                title="Excluir aluno do grupo"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {teacherTab === 'checklist_notas' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {(
              [
                {
                  roleKey: 'pro' as GroupRole,
                  title: '🟢 Checklist • Bancada PRÓ',
                  members: proMembers,
                },
                {
                  roleKey: 'contra' as GroupRole,
                  title: '🔴 Checklist • Bancada CONTRA',
                  members: contraMembers,
                },
                {
                  roleKey: 'juror' as GroupRole,
                  title: '⚖️ Checklist • Corpo de JURADOS',
                  members: jurorMembers,
                },
              ] as const
            ).map((grp) => {
              const chkState = getGroupChecklistState(grp.roleKey);
              return (
                <div
                  key={grp.roleKey}
                  className="p-5 rounded-3xl bg-slate-900/95 border border-slate-800 flex flex-col justify-between space-y-4 shadow-xl"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div>
                        <h4 className="text-sm font-black text-white">{grp.title}</h4>
                        <p className="text-[11px] text-slate-400">
                          {grp.members.length} integrante(s) na Turma {currentTurmaScope}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-400 block">Nota Sugerida</span>
                        <span className="text-xl font-black text-emerald-400">
                          {chkState.customScore.toFixed(1)}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {DEFAULT_TEACHER_CRITERIA.map((crit) => {
                        const checked = Boolean(chkState.criteriaChecked[crit.id]);
                        return (
                          <label
                            key={crit.id}
                            onClick={() => handleToggleTeacherCriterion(grp.roleKey, crit.id)}
                            className={`p-3 rounded-2xl border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                              checked
                                ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-100'
                                : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {}}
                                className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                              />
                              <span className="text-xs font-bold leading-snug">{crit.label}</span>
                            </div>
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-900 text-cyan-300 shrink-0">
                              +{crit.weight.toFixed(1)}
                            </span>
                          </label>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-1 gap-3 pt-2">
                      <div className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-2xl px-3.5 py-2.5">
                        <label className="text-xs font-bold text-slate-300">
                          Nota Final do Grupo (0 a 10):
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="10"
                          value={chkState.customScore}
                          onChange={(e) =>
                            handleChangeTeacherGroupScore(grp.roleKey, Number(e.target.value))
                          }
                          className="w-20 bg-slate-900 border border-emerald-500/40 rounded-xl px-2.5 py-1 text-right text-sm font-black text-emerald-300 focus:outline-none"
                        />
                      </div>

                      <textarea
                        rows={2}
                        value={chkState.teacherNotes}
                        onChange={(e) =>
                          handleChangeTeacherGroupNotes(grp.roleKey, e.target.value)
                        }
                        placeholder="Parecer complementar do professor para este grupo (vai para a Aba Correções)..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleApplyGroupChecklistToCorrections(grp.roleKey)}
                    className="w-full py-3 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg cursor-pointer transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Aplicar Nota ao Grupo & Enviar para Correções</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {teacherTab === 'respostas' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {(
              [
                {
                  roleKey: 'pro' as GroupRole,
                  title: '🟢 Respostas • Bancada PRÓ',
                  questions: localConfig.proQuestions,
                },
                {
                  roleKey: 'contra' as GroupRole,
                  title: '🔴 Respostas • Bancada CONTRA',
                  questions: localConfig.contraQuestions,
                },
                {
                  roleKey: 'juror' as GroupRole,
                  title: '⚖️ Respostas • Corpo de JURADOS',
                  questions: localConfig.jurorQuestions || [],
                },
              ] as const
            ).map((col) => (
              <div
                key={col.roleKey}
                className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-3"
              >
                <h4 className="text-sm font-black text-white border-b border-slate-800 pb-2">
                  {col.title} ({currentTurmaScope})
                </h4>
                {col.questions.map((q, idx) => {
                  const ans = getScopedAnswer(col.roleKey, q.id);
                  return (
                    <div
                      key={q.id}
                      className="p-3 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-1.5"
                    >
                      <span className="text-[10px] font-black uppercase text-cyan-400 block">
                        Questão {idx + 1} • {q.sociologicalConcept}
                      </span>
                      <p className="text-xs font-bold text-slate-200">{q.prompt}</p>
                      <div className="p-2.5 rounded-xl bg-slate-900 text-xs text-slate-300 whitespace-pre-wrap">
                        {ans || (
                          <span className="text-slate-600 italic">
                            Ainda não respondida pelo grupo.
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ==========================================================================
  // RENDERIZAÇÃO: 2. VISÃO DO ALUNO (ISOLADA POR TURMA E COM TÚNEL DE 3 PASSOS)
  // ==========================================================================
  const myGroupMembers =
    myRole === 'pro' ? proMembers : myRole === 'contra' ? contraMembers : jurorMembers;

  const myQuestions: LocalDebateQuestion[] =
    myRole === 'pro'
      ? localConfig.proQuestions
      : myRole === 'contra'
      ? localConfig.contraQuestions
      : localConfig.jurorQuestions || [];

  const myRoleTitle =
    myRole === 'pro'
      ? '🟢 Bancada Favorável (PRÓ)'
      : myRole === 'contra'
      ? '🔴 Bancada Opositora (CONTRA)'
      : '⚖️ Corpo de Jurados (Análise Imparcial)';

  return (
    <div className="space-y-6 text-slate-100">
      {/* REQ 1: CABEÇALHO ISOLADO MOSTRANDO APENAS A TURMA DO ALUNO */}
      <div className="p-5 rounded-3xl bg-[#070b14] border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-black flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              <span>Ambiente Exclusivo • Turma {currentTurmaScope}</span>
            </span>
            {myRole && (
              <span className="px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-black">
                {myRoleTitle}
              </span>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white mt-2">{safeActivity.title}</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Atividade restrita aos estudantes da Turma <strong>{currentTurmaScope}</strong>.
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 self-start sm:self-auto cursor-pointer"
          >
            Voltar
          </button>
        )}
      </div>

      {statusBanner && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between ${
            statusBanner.type === 'error'
              ? 'bg-rose-500/15 border-rose-500/40 text-rose-200'
              : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
          }`}
        >
          <span>{statusBanner.text}</span>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="text-slate-300 hover:text-white ml-3"
          >
            ✕
          </button>
        </div>
      )}

      {!myRole && activeStudent && (
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-5">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 block">
              ETAPA DE CREDENCIAMENTO • TURMA {currentTurmaScope}
            </span>
            <h3 className="text-lg font-black text-white mt-1">
              Escolha sua Bancada para Iniciar a Trajetória do seu Grupo
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Ao ingressar como 1º integrante da bancada, você poderá selecionar os demais colegas do seu grupo na lista suspensa da sua turma.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-3xl bg-emerald-950/25 border border-emerald-500/40 flex flex-col justify-between space-y-4">
              <div>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-black">
                  {proMembers.length} integrante(s) na Turma {currentTurmaScope}
                </span>
                <h4 className="text-base font-black text-white mt-3">🟢 Bancada PRÓ</h4>
                <p className="text-xs text-slate-300 mt-1">
                  Pesquisa e sustenta os argumentos sociológicos favoráveis à tese central.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  handleAddStudentToGroup(
                    {
                      id: activeStudent.id,
                      fullName: activeStudent.fullName,
                      turma: currentTurmaScope,
                    },
                    'pro'
                  )
                }
                className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs cursor-pointer"
              >
                Ingressar na Bancada PRÓ
              </button>
            </div>

            <div className="p-5 rounded-3xl bg-rose-950/25 border border-rose-500/40 flex flex-col justify-between space-y-4">
              <div>
                <span className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 text-xs font-black">
                  {contraMembers.length} integrante(s) na Turma {currentTurmaScope}
                </span>
                <h4 className="text-base font-black text-white mt-3">🔴 Bancada CONTRA</h4>
                <p className="text-xs text-slate-300 mt-1">
                  Pesquisa contradições estruturais e sustenta o contraponto crítico no debate.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  handleAddStudentToGroup(
                    {
                      id: activeStudent.id,
                      fullName: activeStudent.fullName,
                      turma: currentTurmaScope,
                    },
                    'contra'
                  )
                }
                className="w-full py-3 rounded-2xl bg-rose-500 hover:bg-rose-400 text-white font-black text-xs cursor-pointer"
              >
                Ingressar na Bancada CONTRA
              </button>
            </div>

            <div className="p-5 rounded-3xl bg-amber-950/25 border border-amber-500/40 flex flex-col justify-between space-y-4">
              <div>
                <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 text-xs font-black">
                  {jurorMembers.length}/{localConfig.maxJurors || 3} Jurados na Turma {currentTurmaScope}
                </span>
                <h4 className="text-base font-black text-white mt-3">⚖️ Corpo de Jurados</h4>
                <p className="text-xs text-slate-300 mt-1">
                  Analisa os critérios sociológicos e julga o Grande Debate com 2 Checklists oficiais.
                </p>
              </div>
              <button
                type="button"
                disabled={jurorMembers.length >= (localConfig.maxJurors || 3)}
                onClick={() =>
                  handleAddStudentToGroup(
                    {
                      id: activeStudent.id,
                      fullName: activeStudent.fullName,
                      turma: currentTurmaScope,
                    },
                    'juror'
                  )
                }
                className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-black text-xs cursor-pointer"
              >
                {jurorMembers.length >= (localConfig.maxJurors || 3)
                  ? 'Vagas de Jurados Preenchidas'
                  : 'Ingressar nos Jurados'}
              </button>
            </div>
          </div>
        </div>
      )}

      {myRole && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                step: 1 as const,
                title: 'Passo 1: Equipe & Pesquisa',
                desc: 'Formação do grupo e questões exclusivas da sua bancada',
              },
              {
                step: 2 as const,
                title: 'Passo 2: Dossiê Estratégico',
                desc: 'Síntese dos argumentos e preparação para a arena',
              },
              {
                step: 3 as const,
                title: 'Passo 3: O Grande Debate',
                desc:
                  myRole === 'juror'
                    ? 'Checklists oficiais de julgamento e veredito'
                    : 'Arena ao vivo, cronômetro e envio final da equipe',
              },
            ].map((s) => (
              <button
                key={s.step}
                type="button"
                onClick={() => setStudentStep(s.step)}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  studentStep === s.step
                    ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-lg'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 block">
                  Trajetória Exclusiva • {myRoleTitle}
                </span>
                <span className="text-sm font-black block mt-0.5">{s.title}</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">{s.desc}</span>
              </button>
            ))}
          </div>

          {studentStep === 1 && (
            <div className="space-y-6">
              {/* REQ 2: CAIXA DE SELEÇÃO COM LISTA SUSPENSA PARA ESCOLHER O RESTO DO GRUPO */}
              <div className="p-5 rounded-3xl bg-slate-900/95 border border-cyan-500/30 space-y-4">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 block">
                    FORMAÇÃO DA SUA EQUIPE • TURMA {currentTurmaScope}
                  </span>
                  <h3 className="text-base font-black text-white">
                    Integrantes de {myRoleTitle} ({myGroupMembers.length})
                  </h3>
                  <p className="text-xs text-slate-400">
                    Selecione seus colegas de grupo na lista suspensa abaixo (apenas colegas da Turma {currentTurmaScope}).
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5">
                  <select
                    value={selectedClassmateIdToAdd}
                    onChange={(e) => setSelectedClassmateIdToAdd(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-2xl px-4 py-3 text-xs sm:text-sm font-bold text-white focus:outline-none"
                  >
                    <option value="">
                      📋 Clique para escolher um colega da Turma {currentTurmaScope} ({unassignedClassmates.length} disponíveis)...
                    </option>
                    {unassignedClassmates.map((colleague) => (
                      <option key={colleague.id} value={colleague.id}>
                        {colleague.fullName}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    disabled={!selectedClassmateIdToAdd}
                    onClick={() => {
                      const stObj = unassignedClassmates.find(
                        (s) => s.id === selectedClassmateIdToAdd
                      );
                      if (stObj) {
                        handleAddStudentToGroup(
                          { id: stObj.id, fullName: stObj.fullName, turma: stObj.turma },
                          myRole
                        );
                      }
                    }}
                    className="px-5 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-black text-xs flex items-center justify-center gap-2 cursor-pointer shrink-0"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>+ Incluir Colega no Grupo</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {myGroupMembers.map((m, idx) => (
                    <span
                      key={m.studentId}
                      className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-slate-200 flex items-center gap-2"
                    >
                      {idx === 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[9px] font-black uppercase">
                          1º Escolhido / Líder
                        </span>
                      )}
                      <span>{m.studentName}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* QUESTÕES EXCLUSIVAS DO GRUPO DO ALUNO */}
              <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4">
                <div className="border-b border-slate-800 pb-3">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 block">
                    PASSO 1 • ROTEIRO EXCLUSIVO ({myRoleTitle.toUpperCase()})
                  </span>
                  <h3 className="text-base font-black text-white">
                    Questões Norteadoras da Sua Equipe ({myQuestions.length})
                  </h3>
                </div>

                <div className="space-y-4">
                  {myQuestions.map((q, idx) => (
                    <div
                      key={q.id}
                      className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-2.5"
                    >
                      <span className="px-2.5 py-0.5 rounded-lg bg-cyan-500/15 text-cyan-300 text-[10px] font-black uppercase inline-block">
                        Eixo {idx + 1} • {q.sociologicalConcept}
                      </span>
                      <p className="text-xs sm:text-sm font-bold text-white leading-relaxed">
                        {q.prompt}
                      </p>
                      <textarea
                        rows={3}
                        value={getScopedAnswer(myRole, q.id)}
                        onChange={(e) => handleChangeScopedAnswer(myRole, q.id, e.target.value)}
                        placeholder="Registre aqui os argumentos, dados e conceitos sociológicos pesquisados pelo seu grupo..."
                        className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-400 rounded-xl p-3 text-xs sm:text-sm text-white focus:outline-none"
                      />
                    </div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() =>
                      persistDebateConfig(
                        localConfig,
                        undefined,
                        'Respostas do Passo 1 salvas para todo o seu grupo!'
                      )
                    }
                    className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold cursor-pointer"
                  >
                    💾 Salvar Rascunho do Grupo
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      await persistDebateConfig(localConfig);
                      setStudentStep(2);
                    }}
                    className="px-6 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Salvar e Avançar para o Passo 2</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {studentStep === 2 && (
            <div className="p-6 rounded-3xl bg-slate-900/95 border border-slate-800 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 block">
                    PASSO 2 • PREPARAÇÃO DE ARGUMENTOS ({myRoleTitle.toUpperCase()})
                  </span>
                  <h3 className="text-lg font-black text-white">
                    Dossiê & Síntese Estratégica da Sua Bancada
                  </h3>
                  <p className="text-xs text-slate-400">
                    Organize os argumentos que o seu grupo utilizará durante o Grande Debate no Passo 3.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={isGeneratingAI}
                  onClick={() => handleGenerateGroupSynthesis(myRole)}
                  className="px-4 py-2.5 rounded-2xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-200 text-xs font-black flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {isGeneratingAI
                      ? 'Consolidando Dossiê...'
                      : 'Gerar Síntese com IA para Minha Bancada'}
                  </span>
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-[10px] font-black uppercase text-emerald-400 block">
                  Resumo Estratégico Exclusivo do Seu Grupo:
                </span>
                <p className="text-xs sm:text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {(myRole === 'pro'
                    ? localConfig.proSummaryAI
                    : myRole === 'contra'
                    ? localConfig.contraSummaryAI
                    : localConfig.jurorGuideAI || localConfig.jurorInitialGuide) ||
                    'Clique no botão acima para consolidar a síntese estratégica das respostas do seu grupo ou avance diretamente para o Grande Debate.'}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStudentStep(1)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-xs font-bold text-slate-300 cursor-pointer"
                >
                  ← Voltar ao Passo 1
                </button>
                <button
                  type="button"
                  onClick={() => setStudentStep(3)}
                  className="px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-2 cursor-pointer"
                >
                  <span>Ir para o Passo 3: O Grande Debate</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {studentStep === 3 && (
            <div className="p-6 rounded-3xl bg-slate-900/95 border border-emerald-500/40 space-y-5 shadow-2xl">
              <div className="border-b border-slate-800 pb-4">
                <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 block">
                  PASSO 3 • ARENA AO VIVO • TURMA {currentTurmaScope}
                </span>
                <h3 className="text-xl font-black text-white">
                  🎙️ O Grande Debate — {myRoleTitle}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Acompanhe as rodadas conduzidas pelo Professor no cronômetro de sala e conclua a entrega oficial da sua equipe.
                </p>
              </div>

              {myRole === 'juror' ? (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/30 space-y-3">
                      <h4 className="text-xs font-black uppercase text-emerald-400">
                        Checklist 1 • Avaliar Bancada PRÓ
                      </h4>
                      {localConfig.checklistCriteria.map((c) => (
                        <label
                          key={`pro_${c.id}`}
                          className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={Boolean(jurorChecklistPro[c.id])}
                            onChange={() =>
                              setJurorChecklistPro((prev) => ({ ...prev, [c.id]: !prev[c.id] }))
                            }
                            className="mt-0.5 accent-emerald-500"
                          />
                          <div>
                            <span className="text-xs font-bold text-white block">
                              {c.title || c.criterion}
                            </span>
                            <span className="text-[11px] text-slate-400 block">{c.description}</span>
                          </div>
                        </label>
                      ))}
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-950 border border-rose-500/30 space-y-3">
                      <h4 className="text-xs font-black uppercase text-rose-400">
                        Checklist 2 • Avaliar Bancada CONTRA
                      </h4>
                      {localConfig.checklistCriteria.map((c) => (
                        <label
                          key={`contra_${c.id}`}
                          className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={Boolean(jurorChecklistContra[c.id])}
                            onChange={() =>
                              setJurorChecklistContra((prev) => ({
                                ...prev,
                                [c.id]: !prev[c.id],
                              }))
                            }
                            className="mt-0.5 accent-rose-500"
                          />
                          <div>
                            <span className="text-xs font-bold text-white block">
                              {c.title || c.criterion}
                            </span>
                            <span className="text-[11px] text-slate-400 block">{c.description}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 block">
                      Veredito Fundamentado do Corpo de Jurados:
                    </label>
                    <textarea
                      rows={3}
                      value={jurorVerdictComment}
                      onChange={(e) => setJurorVerdictComment(e.target.value)}
                      placeholder="Justifiquem qual bancada apresentou maior rigor conceitual e consistência sociológica no Grande Debate..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {[
                      '1. Exposição Inicial (3 min)',
                      '2. Réplica Direta (2 min)',
                      '3. Sabatina do Júri (2 min)',
                      '4. Considerações Finais (1m30s)',
                    ].map((etapa, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-center"
                      >
                        <span className="text-xs font-bold text-cyan-300 block">{etapa}</span>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 block">
                      Argumento Final / Réplica Central Apresentada pela Sua Bancada no Debate:
                    </label>
                    <textarea
                      rows={3}
                      value={groupFinalArgument}
                      onChange={(e) => setGroupFinalArgument(e.target.value)}
                      placeholder="Registrem a conclusão final defendida pelo grupo durante o Grande Debate..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStudentStep(2)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-xs font-bold text-slate-300 cursor-pointer"
                >
                  ← Voltar ao Passo 2
                </button>

                <button
                  type="button"
                  onClick={handleStudentFinishDebateStep3}
                  className="px-6 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    Concluir e Enviar Participação de Todo o Grupo ({myGroupMembers.length} integrantes)
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
