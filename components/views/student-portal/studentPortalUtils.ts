import { Activity, StudentUser } from "@/lib/types";

export const STUDENT_PORTAL_VERSION = '2026.11.11-v3';

// Galeria de Avatares prontos para escolha imediata dentro do Perfil
import { KRONO_AVATARS, AVATAR_CATEGORIES } from "@/lib/avatarRegistry";
export { AVATAR_CATEGORIES };
export const AVATAR_GALLERY_PRESETS = KRONO_AVATARS.map((a) => ({
  id: a.id,
  label: a.name,
  category: a.category,
  categoryLabel: a.categoryLabel,
  tagline: a.tagline,
  url: a.url,
}));

export function normalizePersonName(name?: string | null): string {
  if (!name) return '';
  return String(name)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function extractLinksFromText(text?: string | null): string[] {
  if (!text) return [];
  const matches = text.match(/https?:\/\/[^\s)"'<>]+/gi);
  return matches ? Array.from(new Set(matches)) : [];
}

export function formatSubmissionAnswerForDisplay(rawAnswer?: string | null): string {
  if (rawAnswer === null || rawAnswer === undefined) return '';
  if (typeof rawAnswer === 'object') {
    try {
      return JSON.stringify(rawAnswer, null, 2);
    } catch {
      return '';
    }
  }
  const trimmed = String(rawAnswer).trim();
  if (!trimmed.startsWith('{')) return trimmed;

  try {
    const parsed = JSON.parse(trimmed);
    const lines: string[] = [];
    Object.entries(parsed).forEach(([key, val]) => {
      if (key === '_grupo_meta') return;
      const cleanKey = key.replace(/^q_\d+_/i, '');
      lines.push(`• ${cleanKey}: ${String(val)}`);
    });
    return lines.length > 0 ? lines.join('\n\n') : trimmed;
  } catch {
    return trimmed;
  }
}

export function findStudentSubmissionInActivity(act: Activity, student: StudentUser): any | null {
  const subs: any[] = Array.isArray(act.submissions) ? act.submissions : [];
  const targetNameNorm = normalizePersonName(student.fullName);
  const targetId = String(student.id || '').trim();
  const targetMat = String(student.matricula || '').trim();

  for (const s of subs) {
    if (!s) continue;

    if (targetId && String(s.studentId || '').trim() === targetId) {
      return s;
    }

    if (targetMat && s.matricula && String(s.matricula).trim() === targetMat) {
      return s;
    }

    const subNameNorm = normalizePersonName(s.studentName || s.nome || s.NOME_ALUNO);
    if (targetNameNorm && subNameNorm && subNameNorm === targetNameNorm) {
      return s;
    }

    if (targetNameNorm && s.groupMembers) {
      const membersList = Array.isArray(s.groupMembers)
        ? s.groupMembers
        : String(s.groupMembers).split(/[,;/]+/);
      const matchedMember = membersList.some(
        (m: string) => normalizePersonName(m) === targetNameNorm
      );
      if (matchedMember) return s;
    }

    if (
      targetNameNorm &&
      typeof s.essayAnswer === 'string' &&
      s.essayAnswer.includes('_grupo_meta')
    ) {
      try {
        const parsed = JSON.parse(s.essayAnswer);
        if (Array.isArray(parsed._grupo_meta)) {
          const matchedMeta = parsed._grupo_meta.some(
            (m: string) => normalizePersonName(m) === targetNameNorm
          );
          if (matchedMeta) return s;
        }
      } catch {}
    }
  }

  const debateCfg: any = act.gameData?.debateConfig;
  if (debateCfg && Array.isArray(debateCfg.participants)) {
    const part = debateCfg.participants.find(
      (p: any) =>
        (targetId && p.studentId === targetId) ||
        (targetNameNorm && normalizePersonName(p.studentName) === targetNameNorm)
    );
    if (part) {
      const role = part.role;
      const indGrade = debateCfg.individualGrades?.[student.id];
      const grpGrade = debateCfg.groupGrades?.[role];
      const score =
        typeof indGrade === 'number'
          ? indGrade
          : typeof indGrade?.finalGrade === 'number'
          ? indGrade.finalGrade
          : typeof grpGrade === 'number'
          ? grpGrade
          : null;

      if (score !== null || debateCfg.proResearchCompleted || debateCfg.contraResearchCompleted) {
        return {
          studentId: student.id,
          studentName: student.fullName,
          submittedAt: act.dueDate || 'Concluído em Sala',
          objectiveScore: 0,
          essayScore: score ?? 0,
          maxEssayScore: act.maxGrade || 10,
          status: score !== null ? 'graded' : 'pending',
          essayAnswer: `Participação registrada no Debate Sem Papel (${
            role === 'pro'
              ? 'Bancada PRÓ'
              : role === 'contra'
              ? 'Bancada CONTRA'
              : 'Corpo de JURADOS'
          }).`,
          teacherFeedback: indGrade?.feedback || '',
        };
      }
    }
  }

  return null;
}

