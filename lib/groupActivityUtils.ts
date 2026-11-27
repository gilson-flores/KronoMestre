import { Activity, StudentUser, ActivityGroup, ActivitySubmission } from '@/lib/types';

const IGNORED_SCHEDULE_TOKENS = new Set([
  'x',
  '-',
  'intervalo',
  'recreio',
  'descanso',
  'almoco',
  'almoço',
  'cafe',
  'café',
  '',
  '#n/a',
]);

/**
 * Extrai Turma padronizada ("201", "2002", "105") e Sala ("Sala 10", "Sala 20")
 * a partir de qualquer formato legado ("S10 201", "2º02", "1 SÉRIE 06", "2002").
 */
export function parseStandardTurmaAndSala(raw?: string | null): {
  turma: string;
  sala: string;
} {
  let s = String(raw || '').trim();
  if (!s || IGNORED_SCHEDULE_TOKENS.has(s.toLowerCase())) {
    return { turma: 'x', sala: '' };
  }

  let sala = '';

  // 1. Formato "S10 201" ou "S20 102"
  const matchPrefixS = s.match(/^[sS](\d{1,2})\s+(.+)$/);
  if (matchPrefixS) {
    sala = `Sala ${Number(matchPrefixS[1])}`;
    s = matchPrefixS[2].trim();
  }

  // 2. Formato "Sala 10 - 201" ou "201 (Sala 10)"
  const matchExplicitSala = s.match(/sala\s*(\d{1,2})/i);
  if (matchExplicitSala && !sala) {
    sala = `Sala ${Number(matchExplicitSala[1])}`;
    s = s.replace(/[-–•(]*\s*sala\s*\d{1,2}\s*[)]*/i, '').trim();
  }

  // 3. Formato "2º02" ou "1ª04" -> "202", "104"
  const matchDegree = s.match(/^(\d)[ºª°]\s*0?(\d{1,3})/);
  if (matchDegree) {
    const serie = matchDegree[1];
    const num = matchDegree[2].length === 1 ? `0${matchDegree[2]}` : matchDegree[2];
    return { turma: `${serie}${num}`, sala };
  }

  // 4. Formato "1 SÉRIE 06" ou "2ª Série 01" -> "106", "201"
  const matchSerie = s.match(/^(\d)\s*[ªº°]?\s*s[eé]rie\s*0?(\d{1,3})/i);
  if (matchSerie) {
    const serie = matchSerie[1];
    const num = matchSerie[2].length === 1 ? `0${matchSerie[2]}` : matchSerie[2];
    return { turma: `${serie}${num}`, sala };
  }

  // 5. Formato numérico direto "201", "2002", "3001 S", "204 N" -> mantém os 3 ou 4 dígitos principais
  const matchDigits = s.match(/^(\d{3,4})\b/);
  if (matchDigits) {
    return { turma: matchDigits[1], sala };
  }

  return { turma: s, sala };
}

export function standardizeTurmaCode(raw?: string | null): string {
  const { turma } = parseStandardTurmaAndSala(raw);
  return turma === 'x' ? '' : turma;
}

export function normalizeTurmaKey(raw?: string | null): string {
  const std = standardizeTurmaCode(raw);
  if (std) return std.toLowerCase();
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function isSameStudentTurma(turmaA?: string | null, turmaB?: string | null): boolean {
  if (!turmaA || !turmaB) return false;
  if (turmaA.trim().toLowerCase() === turmaB.trim().toLowerCase()) return true;
  const normA = normalizeTurmaKey(turmaA);
  const normB = normalizeTurmaKey(turmaB);
  return Boolean(normA && normB && normA === normB);
}

/**
 * Verifica se um item do Repositório (Biblioteca) ou Atividade pertence à turma do aluno.
 * Suporta "TODAS", "Geral", séries ("1ª Série" -> turmas iniciadas em 1) e códigos "201" / "2002".
 */
export function doesItemMatchStudentTurma(
  itemTurmasRaw?: string | null,
  studentTurmaRaw?: string | null
): boolean {
  const rawTarget = String(itemTurmasRaw || '').trim();
  if (!rawTarget) return true;

  const upperTarget = rawTarget.toUpperCase();
  if (
    upperTarget === 'TODAS' ||
    upperTarget === 'TODOS' ||
    upperTarget === 'GERAL' ||
    upperTarget === 'ALL' ||
    upperTarget.includes('TODAS')
  ) {
    return true;
  }

  if (!studentTurmaRaw) return true;
  const stdStudent = standardizeTurmaCode(studentTurmaRaw);

  const tokens = rawTarget
    .split(/[,;/]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  for (const token of tokens) {
    if (isSameStudentTurma(token, studentTurmaRaw)) return true;

    // Se o item foi destinado a uma série inteira (ex: "1 SÉRIE" ou "2ª Série")
    const serieOnlyMatch = token.match(/^(\d)\s*[ªº°]?\s*(s[eé]rie|ano)$/i);
    if (serieOnlyMatch && stdStudent.startsWith(serieOnlyMatch[1])) {
      return true;
    }
  }

  return false;
}

export function isolateActivitiesForStudentTurma(
  activities: Activity[],
  student?: StudentUser | null
): Activity[] {
  if (!student || !student.turma) return activities;
  const stdTurma = standardizeTurmaCode(student.turma) || student.turma.trim();

  return activities.map((act) => {
    const rawTurma = (act.turma || '').trim();
    return {
      ...act,
      turma: stdTurma,
      ...({ _originalTurmaScope: rawTurma } as any),
    };
  });
}

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


function normalizePersonKey(name?: string | null): string {
  return String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function isGroupEnabledActivity(activity?: Activity | null): boolean {
  if (!activity) return false;
  return Boolean(
    activity.allowGroupWork ||
      activity.type === 'Trabalho em grupo' ||
      activity.executionContext === 'classroom_group' ||
      (Array.isArray(activity.activityGroups) && activity.activityGroups.length > 0)
  );
}

export function findStudentActivityGroup(
  activity: Activity | null | undefined,
  studentId?: string | null
): ActivityGroup | null {
  if (!activity || !studentId || !Array.isArray(activity.activityGroups)) return null;
  return (
    activity.activityGroups.find(
      (g) => g.leaderId === studentId || (Array.isArray(g.memberIds) && g.memberIds.includes(studentId))
    ) || null
  );
}

export function getActivityGroupMembers(
  group: ActivityGroup,
  allStudents: StudentUser[]
): StudentUser[] {
  const orderedIds = Array.from(new Set([group.leaderId, ...(group.memberIds || [])].filter(Boolean)));
  const resolved: StudentUser[] = [];
  for (const id of orderedIds) {
    const found = allStudents.find((s) => s.id === id);
    if (found) resolved.push(found);
  }
  return resolved;
}

export interface StudentGroupAccessResult {
  isGroupActivity: boolean;
  hasConfiguredGroups: boolean;
  allowed: boolean;
  isLeader: boolean;
  reason?: 'not_assigned' | 'not_leader';
  message?: string;
  group: ActivityGroup | null;
  leader: StudentUser | null;
  members: StudentUser[];
  groupMembersCsv?: string;
}

export function canStudentSubmitGroupActivity(
  activity: Activity | null | undefined,
  student: StudentUser | null | undefined,
  allStudents: StudentUser[] = []
): StudentGroupAccessResult {
  const isGroupAct = isGroupEnabledActivity(activity);
  const configuredGroups = Array.isArray(activity?.activityGroups) ? activity!.activityGroups! : [];
  const hasConfiguredGroups = configuredGroups.length > 0;

  if (!isGroupAct || !student) {
    return {
      isGroupActivity: isGroupAct,
      hasConfiguredGroups,
      allowed: true,
      isLeader: false,
      group: null,
      leader: null,
      members: [],
    };
  }

  if (!hasConfiguredGroups) {
    return {
      isGroupActivity: true,
      hasConfiguredGroups: false,
      allowed: true,
      isLeader: true,
      group: null,
      leader: student,
      members: [student],
    };
  }

  const group = findStudentActivityGroup(activity, student.id);
  if (!group) {
    return {
      isGroupActivity: true,
      hasConfiguredGroups: true,
      allowed: false,
      isLeader: false,
      reason: 'not_assigned',
      message: 'Você ainda não foi vinculado(a) a um grupo nesta atividade. Peça ao professor para registrar seu grupo.',
      group: null,
      leader: null,
      members: [],
    };
  }

  const members = getActivityGroupMembers(group, allStudents);
  const leader =
    allStudents.find((s) => s.id === group.leaderId) ||
    (student.id === group.leaderId ? student : null);
  const isLeader = group.leaderId === student.id;
  const groupMembersCsv = members.map((m) => m.fullName).join(', ');

  if (!isLeader) {
    const leaderLabel = leader?.fullName || 'o(a) Líder do grupo';
    return {
      isGroupActivity: true,
      hasConfiguredGroups: true,
      allowed: false,
      isLeader: false,
      reason: 'not_leader',
      message: 'Somente o(a) Líder do grupo (' + leaderLabel + ') pode responder e enviar esta atividade. Assim que a nota for lançada para o líder, ela será aplicada automaticamente a você.',
      group,
      leader,
      members,
      groupMembersCsv,
    };
  }

  return {
    isGroupActivity: true,
    hasConfiguredGroups: true,
    allowed: true,
    isLeader: true,
    group,
    leader: leader || student,
    members,
    groupMembersCsv,
  };
}

export interface GroupReplicationPlan {
  isGroupMember: boolean;
  isLeader: boolean;
  shouldReplicate: boolean;
  group: ActivityGroup | null;
  groupName?: string;
  leaderId?: string;
  targetMembers: StudentUser[];
  memberNamesCsv?: string;
}

export function resolveGroupReplicationTargets(
  activity: Activity,
  allStudents: StudentUser[],
  gradedStudentId: string,
  existingSub?: ActivitySubmission | any
): GroupReplicationPlan {
  const configuredGroup = findStudentActivityGroup(activity, gradedStudentId);

  // Caso 1: Grupo oficial cadastrado pelo professor na atividade
  if (configuredGroup) {
    const isLeader = configuredGroup.leaderId === gradedStudentId;
    const members = getActivityGroupMembers(configuredGroup, allStudents);
    const memberNamesCsv = members.map((m) => m.fullName).join(', ');
    return {
      isGroupMember: true,
      isLeader,
      shouldReplicate: isLeader,
      group: configuredGroup,
      groupName: configuredGroup.name,
      leaderId: configuredGroup.leaderId,
      targetMembers: isLeader ? members : [],
      memberNamesCsv,
    };
  }

  // Caso 2: Retrocompatibilidade com atividades em grupo legadas (string groupMembers na submissão)
  const rawCsv = String(existingSub?.groupMembers || '').trim();
  if (!rawCsv) {
    return {
      isGroupMember: false,
      isLeader: false,
      shouldReplicate: false,
      group: null,
      targetMembers: [],
    };
  }

  const memberNames = rawCsv
    .split(',')
    .map((n) => n.trim())
    .filter(Boolean);

  if (memberNames.length <= 1) {
    return {
      isGroupMember: false,
      isLeader: false,
      shouldReplicate: false,
      group: null,
      targetMembers: [],
    };
  }

  const gradedStudent = allStudents.find((s) => s.id === gradedStudentId);
  const gradedNameNorm = normalizePersonKey(existingSub?.studentName || gradedStudent?.fullName || '');
  const firstMemberNorm = normalizePersonKey(memberNames[0]);

  // Determina líder legado: flag explícita isGroupLeader / groupLeaderId, ou 1º nome da lista (quem enviou)
  const isExplicitLeader =
    existingSub?.isGroupLeader === true ||
    (Boolean(existingSub?.groupLeaderId) && existingSub.groupLeaderId === gradedStudentId);
  const isExplicitNonLeader =
    existingSub?.isGroupLeader === false ||
    (Boolean(existingSub?.groupLeaderId) && existingSub.groupLeaderId !== gradedStudentId);

  const isLegacyLeader = isExplicitLeader || (!isExplicitNonLeader && Boolean(gradedNameNorm) && gradedNameNorm === firstMemberNorm);

  if (!isLegacyLeader) {
    return {
      isGroupMember: true,
      isLeader: false,
      shouldReplicate: false,
      group: null,
      groupName: existingSub?.groupName,
      leaderId: existingSub?.groupLeaderId,
      targetMembers: [],
      memberNamesCsv: rawCsv,
    };
  }

  const matchedMembers: StudentUser[] = [];
  if (gradedStudent) matchedMembers.push(gradedStudent);

  for (const nameCandidate of memberNames) {
    const normCandidate = normalizePersonKey(nameCandidate);
    if (!normCandidate) continue;
    const found = allStudents.find(
      (st) =>
        normalizePersonKey(st.fullName) === normCandidate ||
        normalizePersonKey((st as any).name) === normCandidate
    );
    if (found && !matchedMembers.some((m) => m.id === found.id)) {
      matchedMembers.push(found);
    }
  }

  return {
    isGroupMember: true,
    isLeader: true,
    shouldReplicate: true,
    group: null,
    groupName: existingSub?.groupName,
    leaderId: gradedStudentId,
    targetMembers: matchedMembers,
    memberNamesCsv: rawCsv,
  };
}
