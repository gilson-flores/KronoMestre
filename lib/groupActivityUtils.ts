import { Activity, StudentUser } from '@/lib/types';

export function normalizeTurmaKey(raw?: string | null): string {
  const clean = (raw || '').trim();
  if (!clean) return '';
  const parts = clean.split(/\s+/);
  if (parts.length >= 2 && /^s\d+/i.test(parts[0])) {
    return parts.slice(1).join(' ').toLowerCase().replace(/[^a-z0-9]/g, '');
  }
  return clean.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function isSameStudentTurma(turmaA?: string | null, turmaB?: string | null): boolean {
  if (!turmaA || !turmaB) return false;
  if (turmaA.trim().toLowerCase() === turmaB.trim().toLowerCase()) return true;
  const normA = normalizeTurmaKey(turmaA);
  const normB = normalizeTurmaKey(turmaB);
  return Boolean(normA && normB && normA === normB);
}

/**
 * REQ 1: Isola a visualização da atividade para que cada aluno enxergue
 * EXCLUSIVAMENTE a sua própria turma na descrição/cabeçalho.
 */
export function isolateActivitiesForStudentTurma(
  activities: Activity[],
  student?: StudentUser | null
): Activity[] {
  if (!student || !student.turma) return activities;
  const studentTurma = student.turma.trim();

  return activities.map((act) => {
    const rawTurma = (act.turma || '').trim();
    return {
      ...act,
      turma: studentTurma,
      ...({ _originalTurmaScope: rawTurma } as any),
    };
  });
}

/**
 * REQ 2: Retorna colegas da mesma turma disponíveis para a lista suspensa (<select>)
 */
export function getEligibleClassmatesForGroup(
  allStudents: StudentUser[],
  targetTurma: string,
  alreadyAssignedStudentIds: Set<string>
): StudentUser[] {
  if (!Array.isArray(allStudents) || !targetTurma) return [];
  return allStudents
    .filter(
      (s) =>
        !s.isArchived &&
        isSameStudentTurma(s.turma, targetTurma) &&
        !alreadyAssignedStudentIds.has(s.id)
    )
    .sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));
}

/**
 * REQ 5 & REQ 7: Sincroniza a nota do Checklist do Professor com a aba Correções
 * para todos os integrantes do grupo.
 */
export function syncGroupGradeToSubmissions(params: {
  activity: Activity;
  groupMembers: StudentUser[];
  finalScore: number;
  checklistSummary: string;
  groupCompiledAnswer: string;
  groupRoleLabel: string;
}): Activity {
  const {
    activity,
    groupMembers,
    finalScore,
    checklistSummary,
    groupCompiledAnswer,
    groupRoleLabel,
  } = params;

  const currentSubmissions: any[] = Array.isArray(activity.submissions)
    ? [...activity.submissions]
    : [];

  const memberNamesCsv = groupMembers.map((m) => m.fullName).join(', ');
  const nowStr = new Date().toLocaleDateString('pt-BR');
  const maxScore = activity.maxGrade || 10;

  groupMembers.forEach((member) => {
    const existingIdx = currentSubmissions.findIndex(
      (s) =>
        s.studentId === member.id ||
        (Boolean(member.matricula) && s.matricula === member.matricula)
    );

    const payload: any = {
      studentId: member.id,
      studentName: member.fullName,
      matricula: member.matricula,
      tag: member.tag,
      avatarUrl: member.avatarUrl,
      submittedAt:
        existingIdx >= 0 ? currentSubmissions[existingIdx].submittedAt || nowStr : nowStr,
      objectiveScore: 0,
      maxObjectiveScore: 0,
      maxEssayScore: maxScore,
      essayScore: finalScore,
      status: 'graded',
      essayAnswer:
        groupCompiledAnswer ||
        (existingIdx >= 0 ? currentSubmissions[existingIdx].essayAnswer : '') ||
        `[${groupRoleLabel}] Participação concluída em equipe (${memberNamesCsv}).`,
      selectedObjectiveAnswers:
        existingIdx >= 0 ? currentSubmissions[existingIdx].selectedObjectiveAnswers || {} : {},
      groupMembers: memberNamesCsv,
      teacherFeedback: checklistSummary,
      extraPoints: existingIdx >= 0 ? currentSubmissions[existingIdx].extraPoints || 0 : 0,
      registeredInStateSystem:
        existingIdx >= 0
          ? Boolean(currentSubmissions[existingIdx].registeredInStateSystem)
          : false,
    };

    if (existingIdx >= 0) {
      currentSubmissions[existingIdx] = {
        ...currentSubmissions[existingIdx],
        ...payload,
      };
    } else {
      currentSubmissions.push(payload);
    }
  });

  const pendingCorrection = currentSubmissions.filter((s) => s.status === 'pending').length;

  return {
    ...activity,
    totalSubmissions: currentSubmissions.length,
    pendingCorrection,
    submissions: currentSubmissions,
  };
}
