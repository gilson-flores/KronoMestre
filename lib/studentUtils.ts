import { Activity, StudentUser } from './types';

export const getOriginalTurmas = (students: StudentUser[]): string[] => {
  const turmasSet = new Set<string>();
  students.forEach((s) => {
    if (s.turma) {
      turmasSet.add(s.turma.trim());
    }
  });
  return Array.from(turmasSet).sort();
};

export const getTurmaLabel = (turma: string): string => {
  return turma;
};

export const isStudentPNE = (student: StudentUser | null | undefined): boolean => {
  if (!student) return false;
  if (student.tag === 'PNE') return true;
  if (Array.isArray(student.pneConditions) && student.pneConditions.length > 0) return true;
  return false;
};

export const isSevereCondition = (conditionName: string): boolean => {
  const lower = conditionName.toLowerCase();
  return (
    lower.includes('severo') ||
    lower.includes('intelectual') ||
    lower.includes('múltipla') ||
    lower.includes('surdez') ||
    lower.includes('cegueira') ||
    lower.includes('paralisia') ||
    lower.includes('autismo moderado') ||
    lower.includes('autismo severo')
  );
};

export const isActivityAdapted = (activity: Activity): boolean => {
  return Boolean(
    activity.isAdapted ||
    activity.activityDomain === 'adapted_aee' ||
    activity.adaptationType ||
    activity.aeeMechanic
  );
};

export const canStudentAccessActivity = (activityTurma: string, studentTurma: string): boolean => {
  if (!activityTurma || !studentTurma) return true;
  const cleanAct = activityTurma.trim().toLowerCase();
  const cleanStu = studentTurma.trim().toLowerCase();
  if (cleanAct === 'todas' || cleanAct === 'geral' || cleanAct === 'branco') return true;
  return cleanAct === cleanStu || cleanAct.includes(cleanStu) || cleanStu.includes(cleanAct);
};

export const normalizeStudentName = (name: string): string => {
  if (!name) return '';
  return name.trim().toLowerCase();
};

export const getActivityGradeDistribution = (activity: Activity) => {
  const maxGrade = activity.maxGrade || 10;
  const objectiveQuestions = (activity.questions || []).filter(q => q.type === 'multiple_choice');
  const essayQuestions = (activity.questions || []).filter(q => q.type === 'essay');

  let maxObjectiveGrade = 0;
  let maxEssayGrade = 0;

  if (objectiveQuestions.length > 0 && essayQuestions.length > 0) {
    maxObjectiveGrade = maxGrade * 0.5;
    maxEssayGrade = maxGrade * 0.5;
  } else if (objectiveQuestions.length > 0) {
    maxObjectiveGrade = maxGrade;
  } else if (essayQuestions.length > 0) {
    maxEssayGrade = maxGrade;
  } else {
    maxObjectiveGrade = maxGrade;
  }

  return {
    maxGrade,
    maxObjectiveGrade,
    maxEssayGrade,
    hasObjective: objectiveQuestions.length > 0,
    hasEssay: essayQuestions.length > 0,
    distributionLabel: objectiveQuestions.length > 0 && essayQuestions.length > 0 ? '50% Objetiva / 50% Dissertativa' : '100% da nota'
  };
};

export interface AdaptationRecommendation {
  recommendedType: 'mild_moderate' | 'severe_playful';
  summaryText: string;
}

export const getAdaptationRecommendation = (pneConditions?: string[]): AdaptationRecommendation => {
  if (!pneConditions || pneConditions.length === 0) {
    return {
      recommendedType: 'mild_moderate',
      summaryText: 'Adaptação cognitiva padrão para suporte em sala.',
    };
  }

  const hasSevere = pneConditions.some(isSevereCondition);
  if (hasSevere) {
    return {
      recommendedType: 'severe_playful',
      summaryText: 'Recomendado Mapa Visual Lúdico com cartões e reforço icônico severo.',
    };
  }

  return {
    recommendedType: 'mild_moderate',
    summaryText: 'Recomendado Trilha Guiada de 2 Escolhas e redução de carga textual.',
  };
};


export const isActivityRecovery = (activity: Activity): boolean => {
  return Boolean(activity.isRecovery || activity.type === "Recuperação Paralela" || activity.recoveryFromId);
};

export const getChildRecoveryActivities = (parentAct: Activity, allActivities: Activity[]): Activity[] => {
  return allActivities.filter(a => a.recoveryFromId === parentAct.id);
};

export const getChildAdaptations = (parentAct: Activity, allActivities: Activity[]): Activity[] => {
  return allActivities.filter(a => 
    isActivityAdapted(a) && 
    (a.adaptedFromId === parentAct.id || a.linkedActivityId === parentAct.id) && 
    a.isStandaloneAdaptation === false
  );
};
\n
export const DEFAULT_TURMAS = [
  "101", "102", "103", "104", "105", "106",
  "201", "202", "203", "204",
  "301", "302"
];
