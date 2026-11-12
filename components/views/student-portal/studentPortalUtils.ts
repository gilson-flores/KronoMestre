import { Activity, StudentUser } from "@/lib/types";

export const STUDENT_PORTAL_VERSION = '2026.11.11-v3';

// Galeria de Avatares prontos para escolha imediata dentro do Perfil
export const AVATAR_GALLERY_PRESETS = [
  { id: 'bot-1', label: 'Cyber Bot 1', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Krono1&backgroundColor=064e3b' },
  { id: 'bot-2', label: 'Cyber Bot 2', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Krono2&backgroundColor=ea580c' },
  { id: 'bot-3', label: 'Cyber Bot 3', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Krono3&backgroundColor=065f46' },
  { id: 'bot-4', label: 'Cyber Bot 4', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Krono4&backgroundColor=4f46e5' },
  { id: 'adv-1', label: 'Aventureiro 1', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Alex&backgroundColor=115e59' },
  { id: 'adv-2', label: 'Aventureiro 2', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Sofia&backgroundColor=0369a1' },
  { id: 'adv-3', label: 'Aventureiro 3', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Lucas&backgroundColor=4338ca' },
  { id: 'adv-4', label: 'Aventureiro 4', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Maya&backgroundColor=0f766e' },
  { id: 'avt-1', label: 'Estudante 1', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Davi&backgroundColor=064e3b' },
  { id: 'avt-2', label: 'Estudante 2', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Clara&backgroundColor=065f46' },
  { id: 'avt-3', label: 'Estudante 3', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Gabriel&backgroundColor=3730a3' },
  { id: 'avt-4', label: 'Estudante 4', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Julia&backgroundColor=0369a1' },
  { id: 'pix-1', label: 'Pixel Hero 1', url: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Hero1&backgroundColor=064e3b' },
  { id: 'pix-2', label: 'Pixel Hero 2', url: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Hero2&backgroundColor=065f46' },
  { id: 'fun-1', label: 'Star Vibe 1', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Smile1&backgroundColor=115e59' },
  { id: 'fun-2', label: 'Star Vibe 2', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Cool2&backgroundColor=4338ca' },
];

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

