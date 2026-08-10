// Utility functions for student name normalization and standardized class (turma) management

// Standardized list of class codes:
// - 3 digits for standard high school: hundreds digit = Year (1, 2, 3), tens & units = class number (01, 02, etc.)
// - 4 digits for technical high school: thousands digit = Year (1, 2, 3), centena/dezena/unidade = class number (001, 002, etc.)
export const DEFAULT_TURMAS = [
  '101',
  '102',
  '103',
  '201',
  '202',
  '203',
  '301',
  '302',
  '303',
  '1001',
  '2001',
  '3001',
  '3002',
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

  const actTrim = activityTurma.trim().toLowerCase();
  const studentTrim = studentTurma.trim().toLowerCase();

  // Em branco ou "branco" ou "todas"
  if (actTrim === '' || actTrim === 'branco' || actTrim === 'todas') {
    return true;
  }

  // Se estiver somente 1 dígito (ex: "1", "2", "3")
  if (/^[1-9]$/.test(actTrim)) {
    // Todos os alunos de turmas que começam com esse dígito (ex: "3" -> "301", "302", "3001")
    return studentTrim.startsWith(actTrim);
  }

  // Se for código específico (ex: "301", "1001", "3001", "101")
  return actTrim === studentTrim;
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
