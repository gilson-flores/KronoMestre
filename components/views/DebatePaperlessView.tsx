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
  jurorQuestions: LocalDebateQuestion[];
  checklistCriteria: LocalDebateCriterion[];
  jurorInitialGuide: string;
  participants: LocalDebateParticipant[];
  proAnswers: Record<string, string>;
  contraAnswers: Record<string, string>;
  jurorAnswers: Record<string, string>;
  proResearchCompleted?: boolean;
  contraResearchCompleted?: boolean;
  proSummaryAI: string;
  contraSummaryAI: string;
  jurorGuideAI: string;
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
  { id: 'tc_1', label: 'Domínio Conceitual Sociológico (6 Questões & Debate)', weight: 2.0 },
  { id: 'tc_2', label: 'Uso de Evidências, Dados e Fatos Reais', weight: 2.0 },
  { id: 'tc_3', label: 'Coerência com o Resumo Elaborado da Bancada', weight: 2.0 },
  { id: 'tc_4', label: 'Capacidade de Réplica, Tréplica ou Julgamento Crítico', weight: 1.5 },
  { id: 'tc_5', label: 'Articulação em Equipe e Participação Coletiva', weight: 1.5 },
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

/**
 * Garante que cada um dos 3 grupos tenha SEMPRE 6 perguntas estruturadas
 * com espaço de resposta (mesmo se a atividade foi criada antes com 3 perguntas).
 */
function ensureSixQuestions(
  existing: LocalDebateQuestion[] | undefined,
  side: GroupRole,
  topicTitle: string
): LocalDebateQuestion[] {
  const cleanTopic = (topicTitle || 'Sociedade e Cidadania').trim();
  const baseList = Array.isArray(existing) ? existing : [];

  const proDefaults = [
    { concept: 'Fundamentos Históricos e Conquistas', q: `Quais marcos históricos e sociais comprovam a importância de "${cleanTopic}" para a construção da cidadania?` },
    { concept: 'Coesão Social e Direitos', q: `Sob a ótica da Sociologia, como "${cleanTopic}" contribui para fortalecer as instituições democráticas e proteger direitos coletivos?` },
    { concept: 'Evidências e Dados da Realidade Brasileira', q: `Que dados empíricos, leis ou exemplos práticos demonstram os impactos positivos de "${cleanTopic}" no Brasil contemporâneo?` },
    { concept: 'Inclusão e Redução de Desigualdades', q: `De que maneira a defesa de "${cleanTopic}" atua na superação de desigualdades históricas e na inclusão de grupos vulnerabilizados?` },
    { concept: 'Participação Política e Mudança Cultural', q: `Como "${cleanTopic}" estimula a consciência crítica e novas práticas de responsabilidade coletiva nas escolas e comunidades?` },
    { concept: 'Tese Central e Proposta Sociológica (PRÓ)', q: `Qual é o argumento sociológico definitivo da Bancada PRÓ para rebater as críticas e defender a consolidação de "${cleanTopic}"?` },
  ];

  const contraDefaults = [
    { concept: 'Contradições Estruturais e Limites Práticos', q: `Quais são as principais contradições entre o discurso oficial sobre "${cleanTopic}" e a realidade concreta vivida pela população?` },
    { concept: 'Assimetrias de Poder e Interesses Hegemônicos', q: `Que grupos econômicos, políticos ou institucionais se beneficiam das falhas ou distorções ligadas a "${cleanTopic}"?` },
    { concept: 'Efeitos Colaterais e Exclusão Social', q: `Quais dados empíricos ou situações cotidianas revelam limitações, exclusões ou efeitos colaterais na aplicação atual de "${cleanTopic}"?` },
    { concept: 'Crítica Institucional e Burocrática', q: `Por que as instituições atuais encontram barreiras estruturais para efetivar "${cleanTopic}" de forma igualitária entre as classes sociais?` },
    { concept: 'Ideologia e Discurso Dominante', q: `De que modo a abordagem superficial de "${cleanTopic}" pode mascarar problemas estruturais mais profundos da sociedade?` },
    { concept: 'Tese Crítica de Refutação (CONTRA)', q: `Qual reformulação estrutural a Bancada CONTRA propõe para enfrentar as falhas reais identificadas em "${cleanTopic}"?` },
  ];

  const jurorDefaults = [
    { concept: 'Auditoria de Conceitos Sociológicos', q: `Quais conceitos e autores clássicos ou contemporâneos da Sociologia são indispensáveis para avaliar as teses sobre "${cleanTopic}"?` },
    { concept: 'Verificação de Fatos e Dados Empíricos', q: `Que evidências concretas e dados da realidade brasileira devem ser exigidos tanto da Bancada PRÓ quanto da Bancada CONTRA?` },
    { concept: 'Superação do Senso Comum', q: `Quais argumentos rasos ou falácias do senso comum sobre "${cleanTopic}" o Corpo de Jurados deve identificar e penalizar?` },
    { concept: 'Equilíbrio entre Teoria e Prática', q: `Como avaliar se as propostas defendidas pelas duas bancadas sobre "${cleanTopic}" possuem viabilidade social e constitucional?` },
    { concept: 'Pergunta de Confronto Direto (Sabatina)', q: `Qual pergunta incisiva o Corpo de Jurados fará durante o Grande Debate para testar a consistência das duas bancadas?` },
    { concept: 'Critério Decisivo de Veredito Imparcial', q: `Qual é o dilema ético e sociológico central de "${cleanTopic}" que definirá a bancada vencedora na avaliação dos jurados?` },
  ];

  const templates =
    side === 'pro' ? proDefaults : side === 'contra' ? contraDefaults : jurorDefaults;

  return Array.from({ length: 6 }).map((_, idx) => {
    const found = baseList[idx];
    const fallback = templates[idx];
    return {
      id: found?.id || `${side}_q_${idx + 1}`,
      number: idx + 1,
      side,
      sociologicalConcept: found?.sociologicalConcept?.trim() || fallback.concept,
      prompt: found?.prompt?.trim() || fallback.q,
      researchHint: '',
    };
  });
}

function buildDefaultElaborateSummaries(topicTitle: string) {
  const cleanTopic = (topicTitle || 'Sociedade e Cidadania').trim();
  return {
    proSummaryAI: `📘 RESUMO ELABORADO DE RESPOSTAS — BANCADA PRÓ (${cleanTopic.toUpperCase()}):\n\n1. Fundamentação Histórica e Cidadã: A análise sociológica favorável demonstra que "${cleanTopic}" constitui um pilar para a consolidação dos direitos civis, políticos e sociais (T.H. Marshall), promovendo maior integração e justiça social.\n\n2. Coesão Social e Efetividade Democrática: Sob a perspectiva das instituições sociais (Durkheim e Habermas), a proteção e o aperfeiçoamento das políticas ligadas a "${cleanTopic}" fortalecem o espaço público democrático e reduzem desigualdades históricas.\n\n3. Diretriz Estratégica para as 6 Respostas e Debate: A equipe deve articular conceitos sociológicos com dados empíricos da realidade brasileira, demonstrando que os desafios existentes exigem ampliação e investimento público, jamais retrocesso.`,
    contraSummaryAI: `📕 RESUMO ELABORADO DE RESPOSTAS — BANCADA CONTRA (${cleanTopic.toUpperCase()}):\n\n1. Contradições Estruturais e Cidadania de Papel: A leitura sociológica crítica evidencia a distância entre a promessa formal de "${cleanTopic}" e as condições materiais reais da população brasileira (Gilberto Dimenstein / Karl Marx).\n\n2. Assimetrias de Poder e Reprodução Social: A partir de Max Weber, Pierre Bourdieu e Michel Foucault, observa-se como estruturas burocráticas e interesses hegemônicos limitam o alcance prático do tema e reproduzem privilégios.\n\n3. Diretriz Estratégica para as 6 Respostas e Debate: A bancada deve problematizar os efeitos colaterais e os limites institucionais atuais, exigindo transformações estruturais profundas com base em indicadores sociais reais.`,
    jurorGuideAI: `⚖️ DOSSIÊ E RESUMO ELABORADO DE ANÁLISE — CORPO DE JURADOS (${cleanTopic.toUpperCase()}):\n\n1. Parâmetro de Rigor Sociológico: O Corpo de Jurados deve verificar se as duas bancadas responderam às 6 questões utilizando conceitos da Sociologia (fato social, ação social, ideologia, estratificação, poder e cidadania) em vez de opiniões do senso comum.\n\n2. Confronto de Evidências e Coerência: Avaliar qual equipe sustentou sua tese com fatos históricos, dados estatísticos e exemplos concretos da sociedade brasileira sem incorrer em contradições.\n\n3. Julgamento no Grande Debate: Utilizar os 2 Checklists oficiais (Pró e Contra) para pontuar a clareza de exposição, a capacidade de réplica direta, o respeito ao Timer e a ética democrática.`,
  };
}

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
                  ? 'bg-cyan-500 text-slate-950 shadow-md'
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
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
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
        <div className="space-y-6">
          <div className="p-5 rounded-3xl bg-[#070b14] border border-cyan-500/30 shadow-2xl space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
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
                  Controle o Timer Oficial, gerencie e remaneje alunos entre os 3 grupos, veja as 6 perguntas com espaço de resposta + 3 Resumos Elaborados e aplique o Checklist de Notas.
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
                onClick={() => setTeacherTab('perguntas_resumos')}
                className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
                  teacherTab === 'perguntas_resumos'
                    ? 'bg-amber-500 text-slate-950 shadow-lg'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>2. As 6 Perguntas por Time (com Respostas) & 3 Resumos Elaborados</span>
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
                <span>3. Checklist de Avaliação do Professor (Ligado a Correções)</span>
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

          {/* ABA 1 DO PROFESSOR: TIMER + GESTÃO E REMANEJAMENTO DE GRUPOS */}
          {teacherTab === 'grupos_timer' && (
            <div className="space-y-6">
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
                        const preset = DEBATE_TIMER_PRESETS.find(
                          (p) => p.id === activeTimerPresetId
                        );
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
                      <span className="text-[11px] font-black block leading-tight">
                        {preset.label}
                      </span>
                      <span className="text-[10px] font-mono text-cyan-400 mt-1 block">
                        {formatTimerMMSS(preset.seconds)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* GESTÃO DOS 3 GRUPOS: ESCOLHER 1º ALUNO, MOVER ENTRE GRUPOS E EXCLUIR */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {(
                  [
                    {
                      roleKey: 'pro' as GroupRole,
                      title: '🟢 Bancada Favorável (PRÓ)',
                      subtitle: '6 Questões + Resumo Elaborado Pró',
                      members: proMembers,
                      borderClass: 'border-emerald-500/40',
                      badgeClass: 'bg-emerald-500/20 text-emerald-300',
                    },
                    {
                      roleKey: 'contra' as GroupRole,
                      title: '🔴 Bancada Opositora (CONTRA)',
                      subtitle: '6 Questões + Resumo Elaborado Contra',
                      members: contraMembers,
                      borderClass: 'border-rose-500/40',
                      badgeClass: 'bg-rose-500/20 text-rose-300',
                    },
                    {
                      roleKey: 'juror' as GroupRole,
                      title: '⚖️ Corpo de Jurados (Análise)',
                      subtitle: `Até ${localConfig.maxJurors || 3} jurados • 6 Questões + Dossiê`,
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
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
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

          {/* ABA 2 DO PROFESSOR: OS 3 RESUMOS ELABORADOS + 6 PERGUNTAS COM ESPAÇO DE RESPOSTA POR TIME */}
          {teacherTab === 'perguntas_resumos' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 p-4 rounded-2xl border border-slate-800">
                <div>
                  <h3 className="text-sm font-black text-white">
                    3 Resumos Elaborados de Respostas + 6 Perguntas com Espaço de Resposta para Cada Time
                  </h3>
                  <p className="text-xs text-slate-400">
                    Você pode editar qualquer resumo elaborado, enunciado ou resposta dos grupos abaixo e salvar em tempo real.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isGeneratingAI}
                    onClick={handleGenerateGroupSynthesis}
                    className="px-4 py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-200 text-xs font-black flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{isGeneratingAI ? 'Gerando com IA...' : 'Regenerar 3 Resumos com IA'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      persistDebateConfig(
                        localConfig,
                        undefined,
                        'Resumos elaborados, perguntas e respostas salvos com sucesso!'
                      )
                    }
                    className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Salvar Tudo</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {(
                  [
                    {
                      roleKey: 'pro' as GroupRole,
                      title: '🟢 BANCADA PRÓ (6 Perguntas + Resumo Elaborado)',
                      summaryField: 'proSummaryAI' as const,
                      questions: localConfig.proQuestions,
                      borderClass: 'border-emerald-500/40',
                    },
                    {
                      roleKey: 'contra' as GroupRole,
                      title: '🔴 BANCADA CONTRA (6 Perguntas + Resumo Elaborado)',
                      summaryField: 'contraSummaryAI' as const,
                      questions: localConfig.contraQuestions,
                      borderClass: 'border-rose-500/40',
                    },
                    {
                      roleKey: 'juror' as GroupRole,
                      title: '⚖️ CORPO DE JURADOS (6 Perguntas + Dossiê Elaborado)',
                      summaryField: 'jurorGuideAI' as const,
                      questions: localConfig.jurorQuestions,
                      borderClass: 'border-amber-500/40',
                    },
                  ] as const
                ).map((col) => (
                  <div
                    key={col.roleKey}
                    className={`p-5 rounded-3xl bg-slate-900/95 border ${col.borderClass} space-y-4`}
                  >
                    <h4 className="text-sm font-black text-white border-b border-slate-800 pb-2">
                      {col.title}
                    </h4>

                    {/* Resumo Elaborado da Equipe */}
                    <div className="p-3.5 rounded-2xl bg-slate-950 border border-cyan-500/30 space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-cyan-400 block">
                        📘 Resumo Elaborado de Respostas ({col.roleKey.toUpperCase()}):
                      </label>
                      <textarea
                        rows={6}
                        value={localConfig[col.summaryField] || ''}
                        onChange={(e) =>
                          setLocalConfig((prev) => ({
                            ...prev,
                            [col.summaryField]: e.target.value,
                          }))
                        }
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 leading-relaxed focus:outline-none focus:border-cyan-400"
                      />
                    </div>

                    {/* As 6 Perguntas com Espaço de Resposta */}
                    <div className="space-y-3">
                      {col.questions.map((q, idx) => (
                        <div
                          key={q.id}
                          className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-2"
                        >
                          <span className="text-[10px] font-black uppercase text-emerald-400 block">
                            Pergunta {idx + 1} de 6 • {q.sociologicalConcept}
                          </span>
                          <p className="text-xs font-bold text-white leading-relaxed">{q.prompt}</p>
                          <textarea
                            rows={3}
                            value={getScopedAnswer(col.roleKey, q.id)}
                            onChange={(e) =>
                              handleChangeScopedAnswer(col.roleKey, q.id, e.target.value)
                            }
                            placeholder={`Espaço de resposta da Pergunta ${idx + 1} (Turma ${currentTurmaScope})...`}
                            className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-400 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ABA 3 DO PROFESSOR: CHECKLIST DE AVALIAÇÃO POR GRUPO -> CORREÇÕES */}
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
                          <span className="text-[10px] font-bold text-slate-400 block">
                            Nota Sugerida
                          </span>
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
        </div>
      ) : (
        /* ===================================================================
           2. VISÃO DO ALUNO (ISOLADA POR TURMA + 6 PERGUNTAS + 3 PASSOS)
           =================================================================== */
        (() => {
          const myGroupMembers =
            myRole === 'pro' ? proMembers : myRole === 'contra' ? contraMembers : jurorMembers;

          const myQuestions: LocalDebateQuestion[] =
            myRole === 'pro'
              ? localConfig.proQuestions
              : myRole === 'contra'
              ? localConfig.contraQuestions
              : localConfig.jurorQuestions;

          const myRoleTitle =
            myRole === 'pro'
              ? '🟢 Bancada Favorável (PRÓ)'
              : myRole === 'contra'
              ? '🔴 Bancada Opositora (CONTRA)'
              : '⚖️ Corpo de Jurados (Análise Imparcial)';

          return (
            <div className="space-y-6">
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
                  <h2 className="text-xl sm:text-2xl font-black text-white mt-2">
                    {safeActivity.title}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Atividade restrita aos estudantes da Turma <strong>{currentTurmaScope}</strong>.
                  </p>
                </div>

                {isAuthenticatedTeacher && (
                  <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-xl border border-slate-800">
                    <span className="text-[11px] font-bold text-slate-400">Simulando Bancada:</span>
                    <select
                      value={simulatedStudentRole}
                      onChange={(e) => setSimulatedStudentRole(e.target.value as GroupRole)}
                      className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-bold text-cyan-300"
                    >
                      <option value="pro">🟢 Bancada PRÓ</option>
                      <option value="contra">🔴 Bancada CONTRA</option>
                      <option value="juror">⚖️ Corpo de JURADOS</option>
                    </select>
                  </div>
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
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-5 rounded-3xl bg-emerald-950/25 border border-emerald-500/40 flex flex-col justify-between space-y-4">
                      <div>
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-black">
                          {proMembers.length} integrante(s) na Turma {currentTurmaScope}
                        </span>
                        <h4 className="text-base font-black text-white mt-3">🟢 Bancada PRÓ</h4>
                        <p className="text-xs text-slate-300 mt-1">
                          Responde às 6 perguntas favoráveis e defende a tese no Grande Debate.
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
                          Responde às 6 perguntas críticas e sustenta o contraponto no Grande Debate.
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
                          Responde às 6 questões de análise e julga o Grande Debate com 2 Checklists.
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
                        title: 'Passo 1: Equipe & 6 Questões',
                        desc: 'Seleção do grupo e 6 perguntas com espaço de resposta',
                      },
                      {
                        step: 2 as const,
                        title: 'Passo 2: Resumo Elaborado',
                        desc: 'Resumo elaborado de respostas e dossiê da sua bancada',
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

                      <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4">
                        <div className="border-b border-slate-800 pb-3">
                          <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 block">
                            PASSO 1 • 6 QUESTÕES EXCLUSIVAS COM ESPAÇO DE RESPOSTA ({myRoleTitle.toUpperCase()})
                          </span>
                          <h3 className="text-base font-black text-white">
                            Responda às 6 Perguntas Norteadoras da Sua Equipe
                          </h3>
                        </div>

                        <div className="space-y-4">
                          {myQuestions.map((q, idx) => (
                            <div
                              key={q.id}
                              className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-2.5"
                            >
                              <span className="px-2.5 py-0.5 rounded-lg bg-cyan-500/15 text-cyan-300 text-[10px] font-black uppercase inline-block">
                                Pergunta {idx + 1} de 6 • {q.sociologicalConcept}
                              </span>
                              <p className="text-xs sm:text-sm font-bold text-white leading-relaxed">
                                {q.prompt}
                              </p>
                              <textarea
                                rows={3}
                                value={getScopedAnswer(myRole, q.id)}
                                onChange={(e) =>
                                  handleChangeScopedAnswer(myRole, q.id, e.target.value)
                                }
                                placeholder={`Digite aqui a resposta elaborada pelo seu grupo para a Pergunta ${idx + 1}...`}
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
                                'As 6 respostas do seu grupo foram salvas!'
                              )
                            }
                            className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold cursor-pointer"
                          >
                            💾 Salvar Respostas das 6 Questões
                          </button>

                          <button
                            type="button"
                            onClick={async () => {
                              await persistDebateConfig(localConfig);
                              setStudentStep(2);
                            }}
                            className="px-6 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <span>Salvar e Ver Resumo Elaborado (Passo 2)</span>
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
                            PASSO 2 • RESUMO ELABORADO DE RESPOSTAS ({myRoleTitle.toUpperCase()})
                          </span>
                          <h3 className="text-lg font-black text-white">
                            Resumo Elaborado & Dossiê da Sua Bancada
                          </h3>
                        </div>

                        <button
                          type="button"
                          disabled={isGeneratingAI}
                          onClick={handleGenerateGroupSynthesis}
                          className="px-4 py-2.5 rounded-2xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-200 text-xs font-black flex items-center gap-2 cursor-pointer"
                        >
                          <Sparkles className="w-4 h-4" />
                          <span>
                            {isGeneratingAI
                              ? 'Consolidando com IA...'
                              : 'Atualizar Resumo Elaborado com IA'}
                          </span>
                        </button>
                      </div>

                      <div className="p-5 rounded-2xl bg-slate-950 border border-cyan-500/30 space-y-2">
                        <span className="text-[10px] font-black uppercase text-emerald-400 block">
                          Resumo Elaborado Exclusivo ({myRoleTitle}):
                        </span>
                        <p className="text-xs sm:text-sm text-slate-100 whitespace-pre-wrap leading-relaxed">
                          {myRole === 'pro'
                            ? localConfig.proSummaryAI
                            : myRole === 'contra'
                            ? localConfig.contraSummaryAI
                            : localConfig.jurorGuideAI}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <button
                          type="button"
                          onClick={() => setStudentStep(1)}
                          className="px-4 py-2.5 rounded-xl bg-slate-800 text-xs font-bold text-slate-300 cursor-pointer"
                        >
                          ← Voltar às 6 Perguntas (Passo 1)
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
                                      setJurorChecklistPro((prev) => ({
                                        ...prev,
                                        [c.id]: !prev[c.id],
                                      }))
                                    }
                                    className="mt-0.5 accent-emerald-500"
                                  />
                                  <div>
                                    <span className="text-xs font-bold text-white block">
                                      {c.title || c.criterion}
                                    </span>
                                    <span className="text-[11px] text-slate-400 block">
                                      {c.description}
                                    </span>
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
                                    <span className="text-[11px] text-slate-400 block">
                                      {c.description}
                                    </span>
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
                            Concluir e Enviar as 6 Respostas de Todo o Grupo ({myGroupMembers.length} integrantes)
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()
      )}
    </div>
  );
};
