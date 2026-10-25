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

/**
 * Motor de Visibilidade de Atividades por Aluno (Garante que PNEs vejam suas adaptações e regulares permitidas)
 */
export const canStudentSeeActivity = (act: Activity, student: StudentUser, allActivities: Activity[]): boolean => {
  // 1. Validação de Turma
  if (!canStudentAccessActivity(act.turma, student.turma)) {
    return false;
  }

  const isPne = isStudentPNE(student);
  const isAdapted = isActivityAdapted(act);

  // Verificação de ID ou matrícula do aluno na lista de incluídos da atividade
  const isStudentExplicitlyIncluded = (): boolean => {
    const ids = act.includedPneStudentIds || [];
    if (ids.length === 0) return false;
    return (
      ids.includes(student.id) ||
      (Boolean(student.matricula) && ids.includes(student.matricula)) ||
      (Boolean(student.fullName) && ids.includes(student.fullName))
    );
  };

  // 2. Aluno com laudo PNE
  if (isPne) {
    if (isAdapted) {
      // Se a adaptada foi gerada para vincular a uma prova regular que ele foi isento, oculta a regular
      const parentActId = act.adaptedFromId || act.linkedActivityId;
      if (parentActId && act.isStandaloneAdaptation === false) {
        // Se substitui a prova regular, ele vê a adaptada e não a regular
      }
      // O PNE vê a atividade adaptada se ele estiver explicitamente na lista de alvos
      return isStudentExplicitlyIncluded();
    } else {
      // Atividade Regular: Aluno PNE com laudo leve (TDAH, dislexia) vê a turma regular por padrão,
      // A menos que ele tenha sido substituído por uma adaptação exclusiva e isolada.
      const hasExclusiveAdaptation = allActivities.some((otherAct) => {
        return (
          isActivityAdapted(otherAct) &&
          (otherAct.adaptedFromId === act.id || otherAct.id === act.linkedActivityId) &&
          otherAct.isStandaloneAdaptation === false &&
          (otherAct.includedPneStudentIds?.includes(student.id) || otherAct.includedPneStudentIds?.includes(student.matricula))
        );
      });

      if (hasExclusiveAdaptation) {
        return false; // Isento da prova regular, vê apenas a adaptada
      }
      return true; // Vê a regular normalmente (ideal para TDAH / laudos leves)
    }
  }

  // 3. Aluno Regular (Sem laudo PNE) jamais vê atividades adaptadas/AEE
  if (isAdapted) {
    return false;
  }

  return true;
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