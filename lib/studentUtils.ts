import { StudentUser, Activity, ActivitySubmission, ActivityQuestion } from './types';

export const DEFAULT_TURMAS: string[] = ["101", "102", "103", "104", "105", "106", "201", "202", "203", "204", "301", "302"];

export function getYearFromTurma(turma: string): number {
  if (!turma) return 999;
  const t = turma.trim();
  const match = t.match(/^([1-9])/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return 999;
}

export function sortTurmas(turmas: string[]): string[] {
  return [...turmas].sort((a, b) => {
    const yearA = getYearFromTurma(a);
    const yearB = getYearFromTurma(b);
    if (yearA !== yearB) {
      return yearA - yearB;
    }
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

export function getOriginalTurmas(students: StudentUser[] = []): string[] {
  const set = new Set<string>();
  students.forEach((s) => {
    if (s.isArchived) return;
    if (!s.turma) return;
    const parts = s.turma.split(/[,;]+/).map((t) => t.trim()).filter(Boolean);
    parts.forEach((t) => {
      if (t && t.toLowerCase() !== 'todas' && t.toLowerCase() !== 'todas as turmas' && t.toLowerCase() !== 'branco' && !t.includes(',')) {
        set.add(t);
      }
    });
  });

  return sortTurmas(Array.from(set));
}

export function isValidTurmaCode(turma: string): boolean {
  if (!turma) return false;
  const trimmed = turma.trim();
  return /^[1-9]$/.test(trimmed) || /^[1-9]\d{2}$/.test(trimmed) || /^[1-9]\d{3}$/.test(trimmed) || trimmed.length >= 2;
}

export function getTurmaLabel(turma: string): string {
  if (!turma) return '';
  return turma.trim();
}

export const canStudentAccessActivity = (actOrActivityTurma: any, studentOrStudentTurma: any): boolean => {
  let isLegacyString = false;
  if (typeof actOrActivityTurma === 'string') isLegacyString = true;
  if (typeof studentOrStudentTurma === 'string') isLegacyString = true;

  if (isLegacyString) {
    let aTurma = '';
    if (typeof actOrActivityTurma === 'string') aTurma = actOrActivityTurma;
    else if (actOrActivityTurma && actOrActivityTurma.turma) aTurma = actOrActivityTurma.turma;

    let sTurma = '';
    if (typeof studentOrStudentTurma === 'string') sTurma = studentOrStudentTurma;
    else if (studentOrStudentTurma && studentOrStudentTurma.turma) sTurma = studentOrStudentTurma.turma;

    const actList = aTurma.split(/[,;]+/).map((s: string) => s.trim().toLowerCase()).filter(Boolean);
    if (actList.includes('aee_exclusivo')) return false;
    if (actList.length === 0) return true;
    if (actList.includes('todas')) return true;
    if (actList.includes('branco')) return true;

    const studentList = sTurma.split(/[,;]+/).map((s: string) => s.trim().toLowerCase()).filter(Boolean);
    if (studentList.length === 0) return false;

    return actList.some((actStr: string) => {
      if (actStr === 'todas') return true;
      if (actStr === 'branco') return true;
      return studentList.some((studStr: string) => {
        if (/^[1-9]$/.test(actStr)) return studStr.startsWith(actStr);
        return actStr === studStr;
      });
    });
  }

  const act = actOrActivityTurma as Activity;
  const student = studentOrStudentTurma as StudentUser;

  if (!act) return false;
  if (!student) return false;

  const actOwner = (act as any).ownerTeacherId;
  const stuOwner = (student as any).ownerTeacherId;
  if (actOwner && stuOwner && actOwner !== stuOwner) {
    return false;
  }

  const isAdapted = isActivityAdapted(act);
  const isStudentAdaptive = isStudentPNE(student);

  // ISOLAMENTO ABSOLUTO AEE: Nunca vaza para aluno regular; verifica apenas os alunos PNE selecionados
  if (isAdapted) {
    if (!isStudentAdaptive) return false;
    const ids = act.includedPneStudentIds || [];
    if (ids.length > 0) {
      return (
        Boolean(ids.includes(student.id)) ||
        Boolean(student.matricula && ids.includes(student.matricula)) ||
        Boolean(student.fullName && ids.includes(student.fullName))
      );
    }
    return true;
  } else {
    if (isStudentAdaptive) {
      const hasSevere = student.pneConditions?.some(isSevereCondition);
      if (hasSevere) {
        const isIncluded =
          Boolean(act.includedPneStudentIds?.includes(student.id)) ||
          Boolean(student.matricula && act.includedPneStudentIds?.includes(student.matricula)) ||
          Boolean(student.fullName && act.includedPneStudentIds?.includes(student.fullName));
        if (!isIncluded) return false;
      }
    }
  }

  const actTurmaStr = act.turma ? act.turma : '';
  const stuTurmaStr = student.turma ? student.turma : '';

  const actListFinal = actTurmaStr.split(/[,;]+/).map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (actListFinal.includes('aee_exclusivo')) return false;
  if (actListFinal.length === 0) return true;
  if (actListFinal.includes('todas')) return true;
  if (actListFinal.includes('branco')) return true;

  const studentListFinal = stuTurmaStr.split(/[,;]+/).map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (studentListFinal.length === 0) return false;

  return actListFinal.some((actStr) => {
    if (actStr === 'todas') return true;
    if (actStr === 'branco') return true;
    return studentListFinal.some((studStr) => {
      if (/^[1-9]$/.test(actStr)) return studStr.startsWith(actStr);
      return actStr === studStr;
    });
  });
};

export function isStudentPNE(student: StudentUser | { tag?: string; pneConditions?: string[] } | null | undefined): boolean {
  if (!student) return false;
  const tagUpper = student.tag ? String(student.tag).trim().toUpperCase() : '';
  if (tagUpper === 'PNE' || tagUpper === 'AEE' || tagUpper === 'INCLUSÃO' || tagUpper === 'INCLUSAO') return true;
  if (student.pneConditions && Array.isArray(student.pneConditions) && student.pneConditions.length > 0) return true;
  return false;
}

export function doesTurmaHavePNEStudent(activityTurma: string | undefined, students: StudentUser[] | undefined): boolean {
  if (!students || students.length === 0) return false;
  if (!activityTurma) return false;

  const actList = activityTurma.split(/[,;]+/).map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (actList.length === 0) return false;

  const pneStudents = students.filter((s) => isStudentPNE(s));
  if (pneStudents.length === 0) return false;

  if (actList.includes('todas') || actList.includes('branco')) {
    return pneStudents.length > 0;
  }

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
    summaryText = `Decisão pedagógica automática: Turma possui perfis diversos (${severeConditions.join(', ')} e ${mildConditions.join(', ')}). Ambas as modalidades selecionadas.`;
  } else if (hasSeverePlayful) {
    recommendedType = 'severe_playful';
    summaryText = `Decisão pedagógica automática: Aluno(s) com ${severeConditions.join(', ')} detectado(s). Jogo Lúdico selecionado.`;
  } else {
    recommendedType = 'mild_moderate';
    summaryText = `Decisão pedagógica automática: Aluno(s) com ${mildConditions.join(', ')} detectado(s). Redução cognitiva selecionada.`;
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

export function getActivityGradeDistribution(activity: {
  maxGrade?: number;
  type?: string;
  questions?: Array<{ type: 'multiple_choice' | 'essay' }>;
}) {
  const maxGrade = activity.maxGrade ?? 10.0;
  const questions = activity.questions || [];

  let hasObjective = questions.some((q) => q.type === 'multiple_choice');
  let hasEssay = questions.some((q) => q.type === 'essay');

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

  return { maxGrade, hasObjective, hasEssay, maxObjectiveGrade, maxEssayGrade, distributionLabel };
}

export function normalizeStudentName(name: string): string {
  if (!name) return '';
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function validateStudentName(rawName: string): {
  isValid: boolean;
  normalized: string;
  errorMessage?: string;
  hasSpecialCharsRemoved?: boolean;
} {
  if (!rawName || !rawName.trim()) {
    return { isValid: false, normalized: '', errorMessage: 'O nome do aluno é obrigatório.' };
  }
  const normalized = normalizeStudentName(rawName);
  if (normalized.length < 3) {
    return { isValid: false, normalized, errorMessage: 'Mínimo de 3 caracteres válidos (A-Z).' };
  }
  return { isValid: true, normalized, hasSpecialCharsRemoved: rawName.toUpperCase().trim() !== normalized };
}

export function isActivityRecovery(act?: Activity | null): boolean {
  if (!act) return false;
  if (act.isRecovery) return true;
  if (Boolean(act.recoveryFromId)) return true;
  if (act.type === 'Recuperação Paralela') return true;
  const title = (act.title || '').trim().toLowerCase();
  if (title.startsWith('[recuperação') || title.startsWith('[recuperacao')) return true;
  if (title.includes('recuperação paralela') || title.includes('recuperacao paralela')) return true;
  if (title.startsWith('recuperação') || title.startsWith('recuperacao')) return true;
  return false;
}

export function isActivityAdapted(act?: Activity | null): boolean {
  if (!act) return false;
  const anyAct = act as any;
  if (anyAct.activityDomain === 'adapted_aee') return true;
  if (act.isAdapted === true) return true;
  if (Boolean(act.adaptedFromId)) return true;
  if (Boolean(act.adaptationType)) return true;
  if (Boolean(anyAct.aeeMechanic)) return true;
  const turmaUpper = (act.turma || '').trim().toUpperCase();
  if (turmaUpper === 'AEE_EXCLUSIVO' || turmaUpper.startsWith('AEE')) return true;
  const title = (act.title || '').trim().toLowerCase();
  if (
    title.startsWith('[pne') ||
    title.startsWith('pne') ||
    title.startsWith('[aee') ||
    title.includes('[aee') ||
    title.includes('adaptação pedagógica') ||
    title.includes('adaptacao pedagogica') ||
    title.includes('atividade adaptada')
  ) {
    return true;
  }
  if (anyAct.activityDomain === 'interactive_game' || act.isGameActivity || act.type === 'Jogo Avaliativo') {
    return false;
  }
  return false;
}

export function getActivityStudentAndSubmissionCounts(
  act: Activity,
  allActivities: Activity[],
  students: StudentUser[]
) {
  const isAdaptedAct = isActivityAdapted(act);
  const isRecoveryAct = isActivityRecovery(act);

  const enrolledStudents = students.filter((st) => canStudentAccessActivity(act, st));

  const parentAct = isAdaptedAct ? allActivities.find((a) => a.id === act.adaptedFromId) : null;
  const includedProficientPneIds = new Set(
    isAdaptedAct ? (parentAct?.includedPneStudentIds || []) : (act.includedPneStudentIds || [])
  );

  const isProficientPne = (st: StudentUser) => {
    return includedProficientPneIds.has(st.id) || (Boolean(st.matricula) && includedProficientPneIds.has(st.matricula)) || (Boolean(st.fullName) && includedProficientPneIds.has(st.fullName));
  };

  const pneEnrolledTakingAdaptation = enrolledStudents.filter((st) => isStudentPNE(st) && !isProficientPne(st));
  const studentsTakingNormal = enrolledStudents.filter((st) => !isStudentPNE(st) || isProficientPne(st));

  const hasAdaptationChild = !isAdaptedAct && !isRecoveryAct && allActivities.some(
    (a) => a.id !== act.id && (a.adaptedFromId === act.id || (isActivityAdapted(a) && canStudentAccessActivity(a.turma, act.turma) && a.title && act.title && a.title.toLowerCase().startsWith(act.title.toLowerCase().slice(0, 15))))
  );

  let expectedStudentsCount = 0;
  let submissionsList: ActivitySubmission[] = [];

  if (isAdaptedAct) {
    expectedStudentsCount = students && students.length > 0 ? pneEnrolledTakingAdaptation.length : 1;
    submissionsList = (act.submissions || []).filter((s) => {
      const st = enrolledStudents.find((x) => x.id === s.studentId || (Boolean(x.matricula) && x.matricula === s.matricula));
      return st && isStudentPNE(st) && !isProficientPne(st);
    });
  } else if (hasAdaptationChild) {
    expectedStudentsCount = students && students.length > 0 ? studentsTakingNormal.length : (act.totalStudents || 35);
    submissionsList = (act.submissions || []).filter((s) => {
      const st = enrolledStudents.find((x) => x.id === s.studentId || (Boolean(x.matricula) && x.matricula === s.matricula));
      return st && (!isStudentPNE(st) || isProficientPne(st));
    });
  } else {
    expectedStudentsCount = students && students.length > 0 ? enrolledStudents.length : (act.totalStudents || 35);
    submissionsList = (act.submissions || []).filter((s) => {
      const st = enrolledStudents.find((x) => x.id === s.studentId || (Boolean(x.matricula) && x.matricula === s.matricula));
      return Boolean(st);
    });
  }

  const subCount = submissionsList.length;
  const gradedCount = submissionsList.filter((s) => s.status === 'graded').length;
  const pendingCount = submissionsList.filter((s) => s.status === 'pending' || s.status === 'draft').length;
  const ret1x = submissionsList.filter((s) => s.status === 'returned' && (s.returnCount === 1 || !s.returnCount)).length;
  const ret2x = submissionsList.filter((s) => s.status === 'returned' && s.returnCount === 2).length;
  const ret3x = submissionsList.filter((s) => s.status === 'returned' && s.returnCount === 3).length;

  return { expectedStudentsCount, subCount, gradedCount, pendingCount, ret1x, ret2x, ret3x, submissionsList };
}

export function getCanonicalActivities(activities: Activity[]): Activity[] {
  if (!activities || activities.length === 0) return [];
  return activities.filter((act) => !isActivityRecovery(act) && !isActivityAdapted(act));
}

export function getChildAdaptations(canonicalAct: Activity, allActivities: Activity[]): Activity[] {
  if (!canonicalAct || !allActivities || allActivities.length === 0) return [];
  return allActivities.filter((child) =>
    child.id !== canonicalAct.id &&
    (child.adaptedFromId === canonicalAct.id || (
      isActivityAdapted(child) &&
      !isActivityRecovery(child) &&
      canStudentAccessActivity(child.turma, canonicalAct.turma) &&
      child.title &&
      canonicalAct.title &&
      child.title.toLowerCase().includes(canonicalAct.title.toLowerCase().slice(0, 15))
    ))
  );
}

export function getChildRecoveryActivities(canonicalAct: Activity, allActivities: Activity[]): Activity[] {
  if (!canonicalAct || !allActivities || allActivities.length === 0) return [];
  return allActivities.filter((child) =>
    child.id !== canonicalAct.id &&
    (child.recoveryFromId === canonicalAct.id ||
      (isActivityRecovery(child) &&
        canStudentAccessActivity(child.turma, canonicalAct.turma) &&
        (!child.recoveryFromId || child.recoveryFromId === canonicalAct.id ||
          (child.title && canonicalAct.title &&
            (child.title.toLowerCase().includes(canonicalAct.title.toLowerCase().slice(0, 15)) ||
              child.title.toLowerCase().includes(canonicalAct.title.toLowerCase().replace(/^\[.*?\]\s*/i, '').slice(0, 10))
            )
          )
        )
      )
    )
  );
}

export function createParallelRecoveryActivity(
  parentActivity: Activity,
  options: { recoveryTitle?: string; recoveryDescription?: string; recoveryApproach?: string; deadline?: string; turma?: string; questions?: ActivityQuestion[] }
): Activity {
  const cleanParentTitle = parentActivity.title.replace(/^\[(PNE.*?|Recuperação.*?)\]\s*/i, '');
  const title = options.recoveryTitle || `[Recuperação Paralela] ${cleanParentTitle}`;
  const description = options.recoveryDescription || `Avaliação de Recuperação Paralela vinculada à atividade "${cleanParentTitle}". Abordagem focada em reavaliação.`;

  return {
    id: `act-rec-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    title,
    subject: parentActivity.subject || 'Sociologia',
    description,
    supportMaterial: parentActivity.supportMaterial || '',
    turma: options.turma || parentActivity.turma,
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
    recoveryApproach: options.recoveryApproach || 'Estudos de caso práticos',
    questions: options.questions && options.questions.length > 0 ? options.questions : parentActivity.questions || [],
    totalSubmissions: 0,
    totalStudents: parentActivity.totalStudents || 35,
    pendingCorrection: 0,
    submissions: [],
  };
}

export function getUnifiedActivityMetrics(
  canonicalAct: Activity,
  allActivities: Activity[],
  targetStudents: StudentUser[]
) {
  const childAdaptations = getChildAdaptations(canonicalAct, allActivities);
  const childRecoveries = getChildRecoveryActivities(canonicalAct, allActivities);

  const enrolledStudents = (targetStudents || []).filter((st) => canStudentAccessActivity(canonicalAct, st));
  const expectedStudentsCount = enrolledStudents.length;

  const mainSubmissions = canonicalAct.submissions || [];
  const recoverySubmissions = childRecoveries.flatMap((r) => r.submissions || []);
  const adaptedSubmissions = childAdaptations.flatMap((c) => c.submissions || []);

  const submittedStudentMap = new Map<string, ActivitySubmission>();
  const mainStudentIds = new Set<string>();
  const recoveryStudentIds = new Set<string>();
  const adaptedStudentIds = new Set<string>();

  mainSubmissions.forEach((s) => {
    const st = enrolledStudents.find((x) => x.id === s.studentId || (Boolean(x.matricula) && x.matricula === s.matricula));
    if (st) {
      mainStudentIds.add(st.id);
      if (!submittedStudentMap.has(st.id)) submittedStudentMap.set(st.id, s);
    }
  });

  recoverySubmissions.forEach((s) => {
    const st = enrolledStudents.find((x) => x.id === s.studentId || (Boolean(x.matricula) && x.matricula === s.matricula));
    if (st) {
      recoveryStudentIds.add(st.id);
      if (!submittedStudentMap.has(st.id)) {
        submittedStudentMap.set(st.id, s);
      } else {
        const existing = submittedStudentMap.get(st.id)!;
        if (getSubmissionTotalGrade(s) > getSubmissionTotalGrade(existing)) {
          submittedStudentMap.set(st.id, s);
        }
      }
    }
  });

  adaptedSubmissions.forEach((s) => {
    const st = enrolledStudents.find((x) => x.id === s.studentId || (Boolean(x.matricula) && x.matricula === s.matricula));
    if (st) {
      adaptedStudentIds.add(st.id);
      if (!submittedStudentMap.has(st.id)) submittedStudentMap.set(st.id, s);
    }
  });

  const submissionsList = Array.from(submittedStudentMap.values());
  const subCount = submissionsList.length;
  const gradedCount = submissionsList.filter((s) => s.status === 'graded').length;
  const pendingCount = submissionsList.filter((s) => s.status === 'pending' || s.status === 'draft').length;
  const completionRate = expectedStudentsCount > 0 ? Math.min(100, Math.round((subCount / expectedStudentsCount) * 100)) : 0;

  const mainCount = mainStudentIds.size;
  const recoveryCount = recoveryStudentIds.size;
  const adaptedCount = adaptedStudentIds.size;
  const recoveryOnlyCount = Array.from(recoveryStudentIds).filter((id) => !mainStudentIds.has(id)).length;

  const mainGraded = mainSubmissions.filter((s) => s.status === 'graded');
  const mainAvg = mainGraded.length > 0 ? Number((mainGraded.reduce((acc, s) => acc + getSubmissionTotalGrade(s), 0) / mainGraded.length).toFixed(1)) : null;

  const recoveryGraded = recoverySubmissions.filter((s) => s.status === 'graded');
  const recoveryAvg = recoveryGraded.length > 0 ? Number((recoveryGraded.reduce((acc, s) => acc + getSubmissionTotalGrade(s), 0) / recoveryGraded.length).toFixed(1)) : null;

  const mainRate = expectedStudentsCount > 0 ? Math.min(100, Math.round((mainCount / expectedStudentsCount) * 100)) : 0;
  const recoveryRate = expectedStudentsCount > 0 ? Math.min(100, Math.round((recoveryCount / expectedStudentsCount) * 100)) : 0;
  const recoveredCount = Array.from(recoveryStudentIds).filter((id) => mainStudentIds.has(id)).length;

  return { expectedStudentsCount, subCount, gradedCount, pendingCount, completionRate, submissionsList, childAdaptations, childRecoveries, hasRecovery: childRecoveries.length > 0, breakdown: { mainCount, mainRate, recoveryCount, recoveryRate, adaptedCount, recoveryOnlyCount, recoveredCount, mainAvg, recoveryAvg } };
}

export function getSubmissionTotalGrade(sub: ActivitySubmission): number {
  const obj = Number(sub.objectiveScore) || 0;
  const ess = Number(sub.essayScore) || 0;
  const ext = Number(sub.extraPoints) || 0;
  return Number((obj + ess + ext).toFixed(1));
}

export function getActivityAverageGrade(act: Activity): number | null {
  if (act.averageGrade !== undefined && act.averageGrade !== null && act.averageGrade > 0) return act.averageGrade;
  const subs = act.submissions || [];
  if (subs.length === 0) return null;
  const gradedSubs = subs.filter((s) => s.status === 'graded' || (s.essayScore !== undefined && s.essayScore !== null) || Number(s.objectiveScore) > 0);
  if (gradedSubs.length === 0) return null;
  const sum = gradedSubs.reduce((acc, s) => acc + getSubmissionTotalGrade(s), 0);
  return Number((sum / gradedSubs.length).toFixed(1));
}
