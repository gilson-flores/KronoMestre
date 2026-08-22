import { StudentUser, Activity, ActivitySubmission, ActivityQuestion } from './types';

// Utility functions for student name normalization and standardized class (turma) management

// Standardized list of class codes:
// - 3 digits for standard high school: hundreds digit = Year (1, 2, 3), tens & units = class number (01, 02, etc.)
// - 4 digits for technical high school: thousands digit = Year (1, 2, 3), centena/dezena/unidade = class number (001, 002, etc.)
export const DEFAULT_TURMAS = [
  '101',
  '102',
  '104',
  '201',
  '202',
  '2001',
  '301',
  '302',
  '3001',
];

/**
 * Extracts school year (1º, 2º, 3º ano) from a turma string for strict ordering
 */
export function getYearFromTurma(turma: string): number {
  if (!turma) return 999;
  const t = turma.trim();
  const match = t.match(/^([1-9])/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return 999;
}

/**
 * Sorts turmas strictly by school year: 1st years first (101, 102, 104...),
 * then 2nd years (201, 202, 2001...), then 3rd years (301, 302, 3001...).
 */
export function sortTurmas(turmas: string[]): string[] {
  return [...turmas].sort((a, b) => {
    const yearA = getYearFromTurma(a);
    const yearB = getYearFromTurma(b);
    if (yearA !== yearB) {
      return yearA - yearB;
    }
    // No mesmo ano: se um tem 3 dígitos (ex: 202) e o outro 4 dígitos (ex: 2001), 3 dígitos vem antes
    if (a.length !== b.length) {
      return a.length - b.length;
    }
    const numA = parseInt(a.replace(/\D/g, ''), 10);
    const numB = parseInt(b.replace(/\D/g, ''), 10);
    if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
      return numA - numB;
    }
    return a.localeCompare(b, undefined, { numeric: true });
  });
}

/**
 * Extracts only original school classes from registered students (ignoring composite activity strings like "101, 102, 104")
 */
export function getOriginalTurmas(students: StudentUser[] = []): string[] {
  const set = new Set<string>();
  students.forEach((s) => {
    if (!s.turma) return;
    const parts = s.turma.split(/[,;]+/).map((t) => t.trim()).filter(Boolean);
    parts.forEach((t) => {
      if (t && t.toLowerCase() !== 'todas' && t.toLowerCase() !== 'todas as turmas' && t.toLowerCase() !== 'branco' && !t.includes(',')) {
        set.add(t);
      }
    });
  });

  if (set.size === 0) {
    DEFAULT_TURMAS.forEach((t) => set.add(t));
  }

  return sortTurmas(Array.from(set));
}

/**
 * Validates whether a turma string follows the standard format:
 * - 3 digits (e.g. 101, 201, 301): centena = ano, dezena/unidade = turma
 * - 4 digits (e.g. 3001): milhar = ano, centena/dezena/unidade = turma
 */
export function isValidTurmaCode(turma: string): boolean {
  if (!turma) return false;
  const trimmed = turma.trim();
  // Single digit (e.g. 1, 2, 3), 3 digits (e.g. 301), or 4 digits (e.g. 1001/3001) or standard alphanumeric
  return /^[1-9]$/.test(trimmed) || /^[1-9]\d{2}$/.test(trimmed) || /^[1-9]\d{3}$/.test(trimmed) || trimmed.length >= 2;
}

/**
 * Returns a clean representation for a turma code without parenthetical explanations
 */
export function getTurmaLabel(turma: string): string {
  if (!turma) return '';
  return turma.trim();
}

/**
 * Determines whether a student can access/perform an activity based on turma rules:
 * - If activityTurma is empty (""), "branco", or "todas": ALL students can access.
 * - If activityTurma is a single digit (e.g. "3", "1", "2"): All students whose turma starts with that digit can access (e.g. "3" -> 301, 302, 3001).
 * - If activityTurma is a specific code (e.g. "301", "1001"): Only students belonging to that exact class can access.
 */
export function canStudentAccessActivity(activityTurma: string | undefined, studentTurma: string | undefined): boolean {
  if (!studentTurma) return false;
  if (!activityTurma) return true; // em branco = todos os alunos podem acessar

  const actList = activityTurma.split(/[,;]+/).map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (actList.length === 0 || actList.includes('todas') || actList.includes('branco')) {
    return true;
  }

  const studentList = studentTurma.split(/[,;]+/).map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (studentList.length === 0) return false;

  return actList.some((act) => {
    if (act === 'todas' || act === 'branco') return true;
    return studentList.some((stud) => {
      // Se a turma da atividade for apenas o dígito do ano (ex: "3"), abrange os anos correspondentes (301, 302, 3001)
      if (/^[1-9]$/.test(act)) {
        return stud.startsWith(act);
      }
      // Correspondência EXATA de turma: "3001" NÃO é "301"
      return act === stud;
    });
  });
}

/**
 * Checks if a student has PNE status (tag PNE)
 */
export function isStudentPNE(student: StudentUser | { tag?: string; pneConditions?: string[] } | null | undefined): boolean {
  if (!student) return false;
  const tagUpper = student.tag ? String(student.tag).trim().toUpperCase() : '';
  if (tagUpper === 'PNE' || tagUpper === 'AEE' || tagUpper === 'INCLUSÃO' || tagUpper === 'INCLUSAO') return true;
  if (student.pneConditions && Array.isArray(student.pneConditions) && student.pneConditions.length > 0) return true;
  return false;
}

/**
 * Checks whether a given turma code or comma-separated list of turmas has at least one PNE student
 */
export function doesTurmaHavePNEStudent(activityTurma: string | undefined, students: StudentUser[] | undefined): boolean {
  if (!students || students.length === 0) return false;
  if (!activityTurma) return false;

  const actList = activityTurma.split(/[,;]+/).map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (actList.length === 0) return false;

  // Filtra apenas alunos com a tag 'PNE'
  const pneStudents = students.filter((s) => isStudentPNE(s));
  if (pneStudents.length === 0) return false;

  if (actList.includes('todas') || actList.includes('branco')) {
    return pneStudents.length > 0;
  }

  // Verifica se algum aluno PNE pertence EXATAMENTE à turma da atividade (ou ao ano, caso seja um único dígito)
  return pneStudents.some((s) => {
    if (!s.turma) return false;
    const studentList = s.turma.split(/[,;]+/).map((t) => t.trim().toLowerCase()).filter(Boolean);
    return actList.some((act) => {
      return studentList.some((stud) => {
        if (/^[1-9]$/.test(act)) {
          return stud.startsWith(act);
        }
        return act === stud;
      });
    });
  });
}

/**
 * Verifica se uma condição PNE é classificada pedagogicamente como Síndrome Severa (jogos lúdicos)
 * ou se é uma necessidade de Deficiência Leve/Moderada.
 */
export function isSevereCondition(condition: string): boolean {
  if (!condition) return false;
  const lower = condition.toLowerCase().trim();
  return (
    lower.includes('sever') ||
    lower.includes('paralisia') ||
    lower.includes('down') ||
    lower.includes('múltipla') ||
    lower.includes('multipla') ||
    lower.includes('profund') ||
    lower.includes('grave')
  );
}

export interface AdaptationRecommendation {
  recommendedType: 'mild_moderate' | 'severe_playful' | 'both';
  hasMildModerate: boolean;
  hasSeverePlayful: boolean;
  severeConditions: string[];
  mildConditions: string[];
  summaryText: string;
  matchedStudents: Array<{ id: string; name: string; conditions: string[]; isSevere: boolean }>;
}

/**
 * Analisa as condições de alunos PNE e decide automaticamente a melhor modalidade de adaptação pedagógica.
 */
export function getRecommendedAdaptationForClass(
  activityTurma: string | undefined,
  students: StudentUser[] | undefined
): AdaptationRecommendation {
  if (!students || students.length === 0) {
    return {
      recommendedType: 'mild_moderate',
      hasMildModerate: true,
      hasSeverePlayful: false,
      severeConditions: [],
      mildConditions: [],
      summaryText: 'Deficiência Leve e Moderada recomendada como padrão para adaptação curricular.',
      matchedStudents: [],
    };
  }

  // Filtra alunos PNE da turma da atividade
  const relevantStudents = students.filter((st) => {
    if (!isStudentPNE(st)) return false;
    return canStudentAccessActivity(activityTurma, st.turma);
  });

  if (relevantStudents.length === 0) {
    return {
      recommendedType: 'mild_moderate',
      hasMildModerate: true,
      hasSeverePlayful: false,
      severeConditions: [],
      mildConditions: [],
      summaryText: 'Nenhum aluno PNE específico cadastrado nesta turma; modalidade Leve/Moderada pré-selecionada.',
      matchedStudents: [],
    };
  }

  const severeConditionsSet = new Set<string>();
  const mildConditionsSet = new Set<string>();
  const matchedStudents: AdaptationRecommendation['matchedStudents'] = [];

  relevantStudents.forEach((st) => {
    const conditions = st.pneConditions && st.pneConditions.length > 0 ? st.pneConditions : ['Necessidade Específica'];
    let studentHasSevere = false;

    conditions.forEach((c) => {
      if (isSevereCondition(c)) {
        severeConditionsSet.add(c);
        studentHasSevere = true;
      } else {
        mildConditionsSet.add(c);
      }
    });

    matchedStudents.push({
      id: st.id,
      name: st.fullName,
      conditions,
      isSevere: studentHasSevere,
    });
  });

  const severeConditions = Array.from(severeConditionsSet);
  const mildConditions = Array.from(mildConditionsSet);
  const hasSeverePlayful = severeConditions.length > 0;
  const hasMildModerate = mildConditions.length > 0 || !hasSeverePlayful;

  let recommendedType: 'mild_moderate' | 'severe_playful' | 'both' = 'mild_moderate';
  let summaryText = '';

  if (hasSeverePlayful && mildConditions.length > 0) {
    recommendedType = 'both';
    summaryText = `Decisão pedagógica automática: Turma possui perfis diversos (${severeConditions.join(', ')} e ${mildConditions.join(', ')}). Ambas as modalidades selecionadas para atender a todos os alunos.`;
  } else if (hasSeverePlayful) {
    recommendedType = 'severe_playful';
    summaryText = `Decisão pedagógica automática: Aluno(s) com ${severeConditions.join(', ')} detectado(s). Jogo Lúdico Interativo selecionado como a melhor opção pedagógica.`;
  } else {
    recommendedType = 'mild_moderate';
    summaryText = `Decisão pedagógica automática: Aluno(s) com ${mildConditions.join(', ')} detectado(s). Redução cognitiva e 2 alternativas selecionadas como a melhor opção.`;
  }

  return {
    recommendedType,
    hasMildModerate,
    hasSeverePlayful,
    severeConditions,
    mildConditions,
    summaryText,
    matchedStudents,
  };
}


/**
 * Calculates grade distribution: 50% Objetivas + 50% Dissertativas for mixed activities,
 * or 100% for single-type activities.
 */
export function getActivityGradeDistribution(activity: {
  maxGrade?: number;
  type?: string;
  questions?: Array<{ type: 'multiple_choice' | 'essay' }>;
}) {
  const maxGrade = activity.maxGrade ?? 10.0;
  const questions = activity.questions || [];

  let hasObjective = questions.some((q) => q.type === 'multiple_choice');
  let hasEssay = questions.some((q) => q.type === 'essay');

  // If questions array is not populated yet, infer from activity type
  if (questions.length === 0) {
    if (activity.type === 'Redação' || activity.type === 'Projeto de pesquisa') {
      hasObjective = false;
      hasEssay = true;
    } else if (activity.type === 'Simulado') {
      hasObjective = true;
      hasEssay = false;
    } else {
      hasObjective = true;
      hasEssay = true;
    }
  }

  let maxObjectiveGrade = 0;
  let maxEssayGrade = 0;
  let distributionLabel = '';

  if (hasObjective && hasEssay) {
    maxObjectiveGrade = maxGrade * 0.5;
    maxEssayGrade = maxGrade * 0.5;
    distributionLabel = `50% Objetivas (${maxObjectiveGrade.toFixed(1)} pts) + 50% Dissertativas (${maxEssayGrade.toFixed(1)} pts)`;
  } else if (hasObjective) {
    maxObjectiveGrade = maxGrade;
    maxEssayGrade = 0;
    distributionLabel = `100% Objetivas (${maxObjectiveGrade.toFixed(1)} pts)`;
  } else {
    maxObjectiveGrade = 0;
    maxEssayGrade = maxGrade;
    distributionLabel = `100% Dissertativas (${maxEssayGrade.toFixed(1)} pts)`;
  }

  return {
    maxGrade,
    hasObjective,
    hasEssay,
    maxObjectiveGrade,
    maxEssayGrade,
    distributionLabel,
  };
}

/**
 * Normalizes a student name:
 * - Converts to UPPERCASE
 * - Removes accents / diacritics (e.g. João -> JOAO, Águia -> AGUIA)
 * - Strips special characters except letters, numbers, and spaces
 * - Collapses multiple spaces
 */
export function normalizeStudentName(name: string): string {
  if (!name) return '';
  return name
    .normalize('NFD') // Decomposes accented characters into base letter + accent mark
    .replace(/[\u0300-\u036f]/g, '') // Removes diacritics
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '') // Keep only A-Z, 0-9 and spaces
    .replace(/\s+/g, ' ') // Collapses multiple spaces
    .trim();
}

/**
 * Detailed validation for student full name input
 */
export function validateStudentName(rawName: string): {
  isValid: boolean;
  normalized: string;
  errorMessage?: string;
  hasSpecialCharsRemoved?: boolean;
} {
  if (!rawName || !rawName.trim()) {
    return {
      isValid: false,
      normalized: '',
      errorMessage: 'O nome do aluno é obrigatório.',
    };
  }

  const normalized = normalizeStudentName(rawName);

  if (normalized.length < 3) {
    return {
      isValid: false,
      normalized,
      errorMessage: 'O nome do aluno deve conter no mínimo 3 caracteres válidos (A-Z).',
    };
  }

  const hasSpecialCharsRemoved = rawName.toUpperCase().trim() !== normalized;

  return {
    isValid: true,
    normalized,
    hasSpecialCharsRemoved,
  };
}

/**
 * Calculates expected student count and submission metrics for an activity:
 * - Adapted activities ONLY count PNE students and PNE submissions.
 * - Principal activities with adaptations DEDUCT PNE students and PNE submissions to avoid duplicate data.
 * - Principal activities without adaptations count all students in the turma.
 */
export function getActivityStudentAndSubmissionCounts(
  act: Activity,
  allActivities: Activity[],
  students: StudentUser[]
) {
  const isAdaptedAct = Boolean(act.isAdapted || act.adaptedFromId);

  // Filter students for this turma
  const enrolledStudents = students.filter((st) =>
    canStudentAccessActivity(act.turma, st.turma)
  );

  // PNE students who are proficient and assigned to the normal/regular activity
  const parentAct = isAdaptedAct
    ? allActivities.find((a) => a.id === act.adaptedFromId)
    : null;
  const includedProficientPneIds = new Set(
    isAdaptedAct
      ? (parentAct?.includedPneStudentIds || [])
      : (act.includedPneStudentIds || [])
  );

  const isProficientPne = (st: StudentUser) => {
    return (
      includedProficientPneIds.has(st.id) ||
      (Boolean(st.matricula) && includedProficientPneIds.has(st.matricula)) ||
      (Boolean(st.fullName) && includedProficientPneIds.has(st.fullName))
    );
  };

  const pneEnrolledTakingAdaptation = enrolledStudents.filter(
    (st) => isStudentPNE(st) && !isProficientPne(st)
  );
  const studentsTakingNormal = enrolledStudents.filter(
    (st) => !isStudentPNE(st) || isProficientPne(st)
  );

  // Check if this principal activity has an adapted version created for it
  const hasAdaptationChild = !isAdaptedAct && allActivities.some(
    (a) =>
      a.id !== act.id &&
      (a.adaptedFromId === act.id ||
        (Boolean(a.isAdapted) &&
          canStudentAccessActivity(a.turma, act.turma) &&
          a.title &&
          act.title &&
          a.title.toLowerCase().startsWith(act.title.toLowerCase().slice(0, 15))))
  );

  let expectedStudentsCount = 0;
  let submissionsList: ActivitySubmission[] = [];

  if (isAdaptedAct) {
    // 1. ADAPTED ACTIVITY: ONLY count PNE students who take the adaptation (not proficient in normal)
    expectedStudentsCount = students && students.length > 0 ? pneEnrolledTakingAdaptation.length : 1;

    if (act.submissions && act.submissions.length > 0) {
      submissionsList = act.submissions.filter((s) => {
        if (students && students.length > 0) {
          const st = enrolledStudents.find((x) => x.id === s.studentId || (Boolean(x.matricula) && x.matricula === s.matricula));
          if (!st) return false;
          return isStudentPNE(st) && !isProficientPne(st);
        }
        return s.tag === 'PNE';
      });
    }
  } else if (hasAdaptationChild) {
    // 2. PRINCIPAL ACTIVITY WITH ADAPTATION: Regular students + proficient PNE students!
    expectedStudentsCount = students && students.length > 0
      ? studentsTakingNormal.length
      : Math.max(1, (act.totalStudents || 35) - pneEnrolledTakingAdaptation.length);

    if (act.submissions && act.submissions.length > 0) {
      submissionsList = act.submissions.filter((s) => {
        if (students && students.length > 0) {
          const st = enrolledStudents.find((x) => x.id === s.studentId || (Boolean(x.matricula) && x.matricula === s.matricula));
          if (!st) return false;
          return !isStudentPNE(st) || isProficientPne(st);
        }
        return s.tag !== 'PNE';
      });
    }
  } else {
    // 3. PRINCIPAL ACTIVITY WITHOUT ADAPTATION: All enrolled students
    expectedStudentsCount = students && students.length > 0
      ? enrolledStudents.length
      : (act.totalStudents || 35);

    if (act.submissions && act.submissions.length > 0) {
      submissionsList = act.submissions.filter((s) => {
        if (students && students.length > 0) {
          const st = enrolledStudents.find((x) => x.id === s.studentId || (Boolean(x.matricula) && x.matricula === s.matricula));
          return Boolean(st);
        }
        return true;
      });
    }
  }

  const subCount = submissionsList.length;
  const gradedCount = submissionsList.filter((s) => s.status === 'graded').length;
  const pendingCount = submissionsList.filter((s) => s.status === 'pending' || s.status === 'draft').length;
  const ret1x = submissionsList.filter((s) => s.status === 'returned' && (s.returnCount === 1 || !s.returnCount)).length;
  const ret2x = submissionsList.filter((s) => s.status === 'returned' && s.returnCount === 2).length;
  const ret3x = submissionsList.filter((s) => s.status === 'returned' && s.returnCount === 3).length;

  return {
    expectedStudentsCount,
    subCount,
    gradedCount,
    pendingCount,
    ret1x,
    ret2x,
    ret3x,
    submissionsList,
  };
}

/**
 * Retorna as atividades principais/canônicas (desconsiderando atividades adaptadas e recuperações filhas como itens separados).
 * Uma atividade central, suas recuperações e suas adaptações PNE são tratadas pedagogicamente como uma só no painel geral.
 */
export function getCanonicalActivities(activities: Activity[]): Activity[] {
  if (!activities || activities.length === 0) return [];
  
  return activities.filter((act) => {
    // Se é recuperação paralela (flag, tipo, recoveryFromId ou título), é subordinada e NÃO conta como canônica independente
    if (
      act.isRecovery ||
      Boolean(act.recoveryFromId) ||
      act.type === 'Recuperação Paralela' ||
      act.title?.toLowerCase().startsWith('[recuperação')
    ) {
      return false;
    }

    // Se é adaptação PNE (flag, tipo, adaptedFromId ou título), NÃO conta como canônica independente
    if (
      act.isAdapted ||
      Boolean(act.adaptedFromId) ||
      act.adaptationType ||
      act.title?.toLowerCase().startsWith('[pne')
    ) {
      return false;
    }
    
    return true;
  });
}

/**
 * Retorna todas as adaptações filhas associadas a uma atividade central.
 */
export function getChildAdaptations(canonicalAct: Activity, allActivities: Activity[]): Activity[] {
  if (!canonicalAct || !allActivities || allActivities.length === 0) return [];
  
  return allActivities.filter((child) => 
    child.id !== canonicalAct.id &&
    (child.adaptedFromId === canonicalAct.id || (
      Boolean(child.isAdapted) &&
      !child.isRecovery &&
      canStudentAccessActivity(child.turma, canonicalAct.turma) &&
      child.title &&
      canonicalAct.title &&
      child.title.toLowerCase().includes(canonicalAct.title.toLowerCase().slice(0, 15))
    ))
  );
}

/**
 * Retorna todas as atividades de recuperação paralela filhas associadas a uma atividade central.
 */
export function getChildRecoveryActivities(canonicalAct: Activity, allActivities: Activity[]): Activity[] {
  if (!canonicalAct || !allActivities || allActivities.length === 0) return [];
  
  return allActivities.filter((child) => 
    child.id !== canonicalAct.id &&
    (
      child.recoveryFromId === canonicalAct.id || 
      (
        (Boolean(child.isRecovery) || child.type === 'Recuperação Paralela' || child.title?.toLowerCase().startsWith('[recuperação')) &&
        canStudentAccessActivity(child.turma, canonicalAct.turma) &&
        (
          !child.recoveryFromId ||
          child.recoveryFromId === canonicalAct.id ||
          (
            child.title &&
            canonicalAct.title &&
            (
              child.title.toLowerCase().includes(canonicalAct.title.toLowerCase().slice(0, 15)) ||
              child.title.toLowerCase().includes(canonicalAct.title.toLowerCase().replace(/^\[.*?\]\s*/i, '').slice(0, 10))
            )
          )
        )
      )
    )
  );
}

/**
 * Cria uma nova atividade de Recuperação Paralela vinculada pedagogicamente à atividade raiz
 */
export function createParallelRecoveryActivity(
  parentActivity: Activity,
  options: {
    recoveryTitle?: string;
    recoveryDescription?: string;
    recoveryApproach?: string;
    deadline?: string;
    questions?: ActivityQuestion[];
  }
): Activity {
  const cleanParentTitle = parentActivity.title.replace(/^\[(PNE.*?|Recuperação.*?)\]\s*/i, '');
  const title = options.recoveryTitle || `[Recuperação Paralela] ${cleanParentTitle}`;
  const description =
    options.recoveryDescription ||
    `Avaliação de Recuperação Paralela vinculada à atividade "${cleanParentTitle}". Abordagem pedagógica focada em reavaliação de competências essenciais.`;

  return {
    id: `act-rec-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    title,
    subject: parentActivity.subject || 'Sociologia',
    description,
    supportMaterial: parentActivity.supportMaterial || '',
    turma: parentActivity.turma,
    type: 'Recuperação Paralela',
    status: 'Ativo',
    deadline: options.deadline || parentActivity.deadline,
    maxGrade: parentActivity.maxGrade || 10,
    allowGroupWork: false,
    securityFocusLock: parentActivity.securityFocusLock ?? true,
    securityBlockCopyStatement: parentActivity.securityBlockCopyStatement ?? true,
    securityBlockPasteEssay: parentActivity.securityBlockPasteEssay ?? true,
    isRecovery: true,
    recoveryFromId: parentActivity.id,
    recoveryApproach: options.recoveryApproach || 'Estudos de caso e aplicações práticas do cotidiano',
    questions: options.questions && options.questions.length > 0 ? options.questions : parentActivity.questions || [],
    totalSubmissions: 0,
    totalStudents: parentActivity.totalStudents || 35,
    pendingCorrection: 0,
    submissions: [],
  };
}

/**
 * Calcula as métricas unificadas (Central + Recuperação Paralela + Adaptação PNE) para uma atividade canônica.
 * Trata atividade central, recuperações e adaptações como uma só:
 * - Cada aluno elegível da turma é esperado responder (seja na 1ª chamada ou na recuperação).
 * - Aluno que não fez a primeira e fez a recuperação CONTA para o engajamento geral da turma.
 * - Fornece também detalhamento analítico (quantos fizeram a 1ª chamada, quantos fizeram a recuperação, quantos adaptada).
 * - Taxa de conclusão sempre fica estritamente entre 0% e 100%.
 */
export function getUnifiedActivityMetrics(
  canonicalAct: Activity,
  allActivities: Activity[],
  targetStudents: StudentUser[]
) {
  const childAdaptations = getChildAdaptations(canonicalAct, allActivities);
  const childRecoveries = getChildRecoveryActivities(canonicalAct, allActivities);
  
  // Alunos do grupo-alvo matriculados/elegíveis para esta atividade
  const enrolledStudents = (targetStudents || []).filter((st) => 
    canStudentAccessActivity(canonicalAct.turma, st.turma)
  );
  
  const expectedStudentsCount = enrolledStudents.length;

  // Submissões específicas de cada modalidade
  const mainSubmissions = canonicalAct.submissions || [];
  const recoverySubmissions = childRecoveries.flatMap((r) => r.submissions || []);
  const adaptedSubmissions = childAdaptations.flatMap((c) => c.submissions || []);

  // Coleta todas as submissões
  const allSubmissions = [
    ...mainSubmissions,
    ...recoverySubmissions,
    ...adaptedSubmissions,
  ];
  
  // Identifica quais alunos matriculados já submeteram (garantindo 1 aluno único contabilizado no engajamento geral)
  const submittedStudentMap = new Map<string, ActivitySubmission>();
  
  // Mapa para classificar quem fez cada modalidade
  const mainStudentIds = new Set<string>();
  const recoveryStudentIds = new Set<string>();
  const adaptedStudentIds = new Set<string>();

  mainSubmissions.forEach((s) => {
    const st = enrolledStudents.find(
      (x) => x.id === s.studentId || (Boolean(x.matricula) && x.matricula === s.matricula)
    );
    if (st) {
      mainStudentIds.add(st.id);
      if (!submittedStudentMap.has(st.id)) {
        submittedStudentMap.set(st.id, s);
      }
    }
  });

  recoverySubmissions.forEach((s) => {
    const st = enrolledStudents.find(
      (x) => x.id === s.studentId || (Boolean(x.matricula) && x.matricula === s.matricula)
    );
    if (st) {
      recoveryStudentIds.add(st.id);
      // Se não havia submetido na principal, ou se a recuperação é a submissão mais recente/prioritária
      if (!submittedStudentMap.has(st.id)) {
        submittedStudentMap.set(st.id, s);
      } else {
        // Se submeteu em ambas, podemos manter a de melhor nota ou a recuperação
        const existing = submittedStudentMap.get(st.id)!;
        if (getSubmissionTotalGrade(s) > getSubmissionTotalGrade(existing)) {
          submittedStudentMap.set(st.id, s);
        }
      }
    }
  });

  adaptedSubmissions.forEach((s) => {
    const st = enrolledStudents.find(
      (x) => x.id === s.studentId || (Boolean(x.matricula) && x.matricula === s.matricula)
    );
    if (st) {
      adaptedStudentIds.add(st.id);
      if (!submittedStudentMap.has(st.id)) {
        submittedStudentMap.set(st.id, s);
      }
    }
  });
  
  const submissionsList = Array.from(submittedStudentMap.values());
  const subCount = submissionsList.length;
  const gradedCount = submissionsList.filter((s) => s.status === 'graded').length;
  const pendingCount = submissionsList.filter((s) => s.status === 'pending' || s.status === 'draft').length;
  const completionRate = expectedStudentsCount > 0 
    ? Math.min(100, Math.round((subCount / expectedStudentsCount) * 100))
    : 0;

  // Contagens específicas por modalidade
  const mainCount = mainStudentIds.size;
  const recoveryCount = recoveryStudentIds.size;
  const adaptedCount = adaptedStudentIds.size;
  // Quantos alunos fizeram exclusivamente a recuperação (não fizeram a primeira)
  const recoveryOnlyCount = Array.from(recoveryStudentIds).filter((id) => !mainStudentIds.has(id)).length;

  // Médias
  const mainGraded = mainSubmissions.filter((s) => s.status === 'graded');
  const mainAvg = mainGraded.length > 0
    ? Number((mainGraded.reduce((acc, s) => acc + getSubmissionTotalGrade(s), 0) / mainGraded.length).toFixed(1))
    : null;

  const recoveryGraded = recoverySubmissions.filter((s) => s.status === 'graded');
  const recoveryAvg = recoveryGraded.length > 0
    ? Number((recoveryGraded.reduce((acc, s) => acc + getSubmissionTotalGrade(s), 0) / recoveryGraded.length).toFixed(1))
    : null;

  return {
    expectedStudentsCount,
    subCount,
    gradedCount,
    pendingCount,
    completionRate,
    submissionsList,
    childAdaptations,
    childRecoveries,
    hasRecovery: childRecoveries.length > 0,
    breakdown: {
      mainCount,
      recoveryCount,
      adaptedCount,
      recoveryOnlyCount,
      mainAvg,
      recoveryAvg,
    },
  };
}

/**
 * Calculates the total grade of a single submission (objective + essay + extraPoints)
 */
export function getSubmissionTotalGrade(sub: ActivitySubmission): number {
  const obj = Number(sub.objectiveScore) || 0;
  const ess = Number(sub.essayScore) || 0;
  const ext = Number(sub.extraPoints) || 0;
  return Number((obj + ess + ext).toFixed(1));
}

/**
 * Calculates the average grade for an activity from its submissions or averageGrade property
 */
export function getActivityAverageGrade(act: Activity): number | null {
  if (act.averageGrade !== undefined && act.averageGrade !== null && act.averageGrade > 0) {
    return act.averageGrade;
  }

  const subs = act.submissions || [];
  if (subs.length === 0) return null;

  const gradedSubs = subs.filter(
    (s) => s.status === 'graded' || (s.essayScore !== undefined && s.essayScore !== null) || Number(s.objectiveScore) > 0
  );

  if (gradedSubs.length === 0) return null;

  const sum = gradedSubs.reduce((acc, s) => acc + getSubmissionTotalGrade(s), 0);
  return Number((sum / gradedSubs.length).toFixed(1));
}
