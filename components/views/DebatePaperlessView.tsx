import { DebateTeacherCockpit } from "@/components/views/debate/DebateTeacherCockpit";
import { DebateStudentBenchView } from "@/components/views/debate/DebateStudentBenchView";
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
  BookOpen,
  Sliders,
  Eye,
  Save,
} from 'lucide-react';
import {
  isSameStudentTurma,
  getEligibleClassmatesForGroup,
  syncGroupGradeToSubmissions,
} from '@/lib/groupActivityUtils';

import { GroupRole, LocalDebateQuestion, LocalDebateParticipant, LocalDebateCriterion, LocalDebateConfig, TeacherGroupChecklistState, DebatePaperlessViewProps, DEFAULT_TEACHER_CRITERIA, DEBATE_TIMER_PRESETS, ensureSixQuestions, buildDefaultElaborateSummaries } from '@/components/views/debate/debateUtils';
export type { LocalDebateQuestion, LocalDebateParticipant, LocalDebateCriterion, LocalDebateConfig, DebatePaperlessViewProps };

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

  // Detecta se o usuário autenticado é o Professor (ou se abriu o preview docente)
  const isAuthenticatedTeacher = Boolean(
    isTeacherProp ||
      isTeacherPreview ||
      effectiveRole === 'teacher' ||
      effectiveRole === 'second_teacher' ||
      (!activeStudent && effectiveRole !== 'student')
  );

  // Permite ao Professor alternar livremente entre o Cockpit do Professor e a Simulação da Visão do Aluno
  const [viewModeOverride, setViewModeOverride] = useState<'teacher' | 'student_sim' | null>(null);
  const isTeacherMode =
    viewModeOverride === 'teacher'
      ? true
      : viewModeOverride === 'student_sim'
      ? false
      : isAuthenticatedTeacher;

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
    if (availableTurmas.length > 0 && !availableTurmas.includes(selectedTeacherTurma)) {
      setSelectedTeacherTurma(availableTurmas[0]);
    }
  }, [availableTurmas, selectedTeacherTurma]);

  // REQ 1: Isolamento estrito de turma para o aluno
  const currentTurmaScope = useMemo(() => {
    if (!isAuthenticatedTeacher && activeStudent?.turma) {
      return activeStudent.turma.trim();
    }
    return selectedTeacherTurma || availableTurmas[0] || 'Geral';
  }, [isAuthenticatedTeacher, activeStudent?.turma, selectedTeacherTurma, availableTurmas]);

  // Constrói a configuração garantindo SEMPRE 6 perguntas por equipe + 3 resumos elaborados
  const baseDebateConfig: LocalDebateConfig = useMemo(() => {
    const cfg: any = debateConfigProp || safeActivity.gameData?.debateConfig || {};
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
  }, [debateConfigProp, safeActivity, titleProp]);

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

  // Simulação de grupo caso o professor clique em "Simular Visão do Aluno"
  const [simulatedStudentRole, setSimulatedStudentRole] = useState<GroupRole>('pro');

  const myParticipantRecord = useMemo(() => {
    if (!activeStudent) return null;
    return turmaParticipants.find((p) => p.studentId === activeStudent.id) || null;
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
  // GERAÇÃO / ATUALIZAÇÃO DOS 3 RESUMOS ELABORADOS DE RESPOSTAS COM IA
  // ==========================================================================
  const handleGenerateGroupSynthesis = async () => {
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

      const defaults = buildDefaultElaborateSummaries(safeActivity.title);
      let nextConfig = { ...localConfig };
      if (res.ok) {
        const data = await res.json();
        nextConfig = {
          ...localConfig,
          proSummaryAI: data.proSummaryAI || localConfig.proSummaryAI || defaults.proSummaryAI,
          contraSummaryAI:
            data.contraSummaryAI || localConfig.contraSummaryAI || defaults.contraSummaryAI,
          jurorGuideAI: data.jurorGuideAI || localConfig.jurorGuideAI || defaults.jurorGuideAI,
        };
      } else {
        nextConfig = {
          ...localConfig,
          proSummaryAI: localConfig.proSummaryAI || defaults.proSummaryAI,
          contraSummaryAI: localConfig.contraSummaryAI || defaults.contraSummaryAI,
          jurorGuideAI: localConfig.jurorGuideAI || defaults.jurorGuideAI,
        };
      }

      await persistDebateConfig(
        nextConfig,
        undefined,
        'Os 3 Resumos Elaborados de Respostas foram atualizados com sucesso!'
      );
    } catch (e) {
      notify('error', 'Não foi possível regenerar agora. Os 3 resumos elaborados atuais foram mantidos.');
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
        ? myTeamMembers.map((m) => m.studentName).join(', ')
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

    await persistDebateConfig(localConfig);

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
    const groupParticipants =
      roleKey === 'pro' ? proMembers : roleKey === 'contra' ? contraMembers : jurorMembers;

    if (groupParticipants.length === 0) {
      notify('error', 'Este grupo ainda não possui alunos cadastrados nesta turma.');
      return;
    }

    const groupStudentObjects: StudentUser[] = groupParticipants.map((p) => {
      const found = rosterStudents.find((s) => s.id === p.studentId);
      return (
        found ||
        ({
          id: p.studentId,
          fullName: p.studentName,
          matricula: p.studentId,
          turma: currentTurmaScope,
          tag: 'REGULAR',
          avatarUrl: '',
          xp: 0,
          level: 1,
          passwordHash: '',
        } as StudentUser)
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
        : localConfig.jurorQuestions;

    const compiledAnswer = questionsList
      .map((q, idx) => {
        const ans = getScopedAnswer(roleKey, q.id) || '(Respondido oralmente / em grupo)';
        return `Pergunta ${idx + 1} (${q.sociologicalConcept}): ${q.prompt}\nResposta: ${ans}`;
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

  return (
    <div className="space-y-5 text-slate-100">
      {/* BARRA SUPERIOR SEMPRE VISÍVEL PARA O PROFESSOR ALTERNAR ENTRE COCKPIT E VISÃO DO ALUNO */}
      {isAuthenticatedTeacher && (
        <div className="p-3.5 rounded-2xl bg-slate-950 border border-cyan-500/40 flex flex-wrap items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-black uppercase tracking-wider text-cyan-300">
              Modo de Comando do Professor:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setViewModeOverride('teacher')}
              className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all ${
                isTeacherMode
                  ? 'bg-emerald-700 text-white shadow-md'
                  : 'bg-slate-900 text-slate-300 border border-slate-700 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>🎛️ Painel de Controle do Professor (Timer, Grupos, 6 Questões & Checklist)</span>
            </button>

            <button
              type="button"
              onClick={() => setViewModeOverride('student_sim')}
              className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all ${
                !isTeacherMode
                  ? 'bg-emerald-700 text-white shadow-md'
                  : 'bg-slate-900 text-slate-300 border border-slate-700 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>👁️ Simular Visão do Aluno (Passo 1, 2 e 3)</span>
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          1. PAINEL DE CONTROLE ROBUSTO DO PROFESSOR
         ===================================================================== */}
      {isTeacherMode ? (
        <DebateTeacherCockpit currentTurmaScope={currentTurmaScope} safeActivity={safeActivity} setSelectedTeacherTurma={setSelectedTeacherTurma} availableTurmas={availableTurmas} onClose={onClose} setTeacherTab={setTeacherTab} teacherTab={teacherTab} turmaParticipants={turmaParticipants} statusBanner={statusBanner} setStatusBanner={setStatusBanner} timerSecondsLeft={timerSecondsLeft} formatTimerMMSS={formatTimerMMSS} setIsTimerRunning={setIsTimerRunning} isTimerRunning={isTimerRunning} activeTimerPresetId={activeTimerPresetId} setTimerSecondsLeft={setTimerSecondsLeft} setActiveTimerPresetId={setActiveTimerPresetId} proMembers={proMembers} contraMembers={contraMembers} jurorMembers={jurorMembers} localConfig={localConfig} handleAddStudentToGroup={handleAddStudentToGroup} unassignedClassmates={unassignedClassmates} handleMoveStudentGroup={handleMoveStudentGroup} handleRemoveStudentFromGroup={handleRemoveStudentFromGroup} handleGenerateGroupSynthesis={handleGenerateGroupSynthesis} isGeneratingAI={isGeneratingAI} persistDebateConfig={persistDebateConfig} setLocalConfig={setLocalConfig} getScopedAnswer={getScopedAnswer} handleChangeScopedAnswer={handleChangeScopedAnswer} getGroupChecklistState={getGroupChecklistState} handleToggleTeacherCriterion={handleToggleTeacherCriterion} handleChangeTeacherGroupScore={handleChangeTeacherGroupScore} handleChangeTeacherGroupNotes={handleChangeTeacherGroupNotes} handleApplyGroupChecklistToCorrections={handleApplyGroupChecklistToCorrections} />
      ) : (
        <DebateStudentBenchView myRole={myRole} proMembers={proMembers} contraMembers={contraMembers} jurorMembers={jurorMembers} localConfig={localConfig} currentTurmaScope={currentTurmaScope} safeActivity={safeActivity} isAuthenticatedTeacher={isAuthenticatedTeacher} simulatedStudentRole={simulatedStudentRole} setSimulatedStudentRole={setSimulatedStudentRole} statusBanner={statusBanner} setStatusBanner={setStatusBanner} handleAddStudentToGroup={handleAddStudentToGroup} activeStudent={activeStudent} studentStep={studentStep} setStudentStep={setStudentStep} selectedClassmateIdToAdd={selectedClassmateIdToAdd} setSelectedClassmateIdToAdd={setSelectedClassmateIdToAdd} unassignedClassmates={unassignedClassmates} getScopedAnswer={getScopedAnswer} handleChangeScopedAnswer={handleChangeScopedAnswer} handleGenerateGroupSynthesis={handleGenerateGroupSynthesis} isGeneratingAI={isGeneratingAI} persistDebateConfig={persistDebateConfig} jurorChecklistPro={jurorChecklistPro} setJurorChecklistPro={setJurorChecklistPro} jurorChecklistContra={jurorChecklistContra} setJurorChecklistContra={setJurorChecklistContra} jurorVerdictComment={jurorVerdictComment} setJurorVerdictComment={setJurorVerdictComment} groupFinalArgument={groupFinalArgument} setGroupFinalArgument={setGroupFinalArgument} handleStudentFinishDebateStep3={handleStudentFinishDebateStep3} />
      )}
    </div>
  );
};
