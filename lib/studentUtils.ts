import { StudentUser, Activity } from './types';

// Utility functions for student name normalization and standardized class (turma) management

// Standardized list of class codes:
// - 3 digits for standard high school: hundreds digit = Year (1, 2, 3), tens & units = class number (01, 02, etc.)
// - 4 digits for technical high school: thousands digit = Year (1, 2, 3), centena/dezena/unidade = class number (001, 002, etc.)
export const DEFAULT_TURMAS = [
  '101',
  '102',
  '104',
  '201',
  '2001',
  '202',
  '301',
  '3001',
  '302',
];

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

  const pneEnrolledTakingAdaptation = enrolledStudents.filter(
    (st) => isStudentPNE(st) && !includedProficientPneIds.has(st.id)
  );
  const studentsTakingNormal = enrolledStudents.filter(
    (st) => !isStudentPNE(st) || includedProficientPneIds.has(st.id)
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
  let submissionsList = act.submissions || [];

  if (isAdaptedAct) {
    // 1. ADAPTED ACTIVITY: ONLY count PNE students who take the adaptation (not proficient in normal)
    expectedStudentsCount = enrolledStudents.length > 0 ? pneEnrolledTakingAdaptation.length : 1;

    if (act.submissions && act.submissions.length > 0) {
      submissionsList = act.submissions.filter((s) => {
        const st = students.find((x) => x.id === s.studentId || x.matricula === s.matricula);
        return (st && isStudentPNE(st) && !includedProficientPneIds.has(st.id)) || s.tag === 'PNE';
      });
    }
  } else if (hasAdaptationChild) {
    // 2. PRINCIPAL ACTIVITY WITH ADAPTATION: Regular students + proficient PNE students!
    expectedStudentsCount = enrolledStudents.length > 0
      ? studentsTakingNormal.length
      : Math.max(1, (act.totalStudents || 35) - pneEnrolledTakingAdaptation.length);

    if (act.submissions && act.submissions.length > 0) {
      submissionsList = act.submissions.filter((s) => {
        const st = students.find((x) => x.id === s.studentId || x.matricula === s.matricula);
        if (st) {
          return !isStudentPNE(st) || includedProficientPneIds.has(st.id);
        }
        return s.tag !== 'PNE';
      });
    }
  } else {
    // 3. PRINCIPAL ACTIVITY WITHOUT ADAPTATION: All enrolled students
    expectedStudentsCount = enrolledStudents.length > 0
      ? enrolledStudents.length
      : (act.totalStudents || 35);
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
