// Storage utility for tracking and persisting official Dossier (Exam Proof) Issuances
// Each activity submission can have a maximum of 3 printed/issued dossiers per student.

export interface DossierIssuanceRecord {
  id: string;
  activityId: string;
  studentId: string;
  studentName: string;
  matricula: string;
  activityTitle: string;
  issueNumber: number; // 1, 2, or 3
  issuedAt: string;
  teacherName?: string;
}

const STORAGE_KEY = 'ninja_dossier_issuance_records_v1';

export function getAllDossierRecords(): DossierIssuanceRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Erro ao ler registros de dossiê do localStorage:', err);
    return [];
  }
}

export function getDossierIssuances(studentId: string, activityId: string): DossierIssuanceRecord[] {
  const all = getAllDossierRecords();
  return all.filter(
    (item) => item.studentId === studentId && item.activityId === activityId
  );
}

export function canEmitDossier(studentId: string, activityId: string): {
  allowed: boolean;
  currentCount: number;
  maxAllowed: number;
  existingRecords: DossierIssuanceRecord[];
} {
  const existing = getDossierIssuances(studentId, activityId);
  return {
    allowed: existing.length < 3,
    currentCount: existing.length,
    maxAllowed: 3,
    existingRecords: existing,
  };
}

export function emitNewDossier(
  studentId: string,
  activityId: string,
  studentName: string,
  matricula: string,
  activityTitle: string,
  teacherName: string = 'Sensei Responsável'
): {
  success: boolean;
  record?: DossierIssuanceRecord;
  message?: string;
  currentCount: number;
} {
  const { allowed, currentCount, existingRecords } = canEmitDossier(studentId, activityId);

  if (!allowed) {
    return {
      success: false,
      message: `Limite máximo de 3 emissões atingido para esta atividade! Este dossiê já foi emitido ${currentCount} vezes.`,
      currentCount,
    };
  }

  const issueNumber = currentCount + 1;
  const randomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
  const cleanActId = activityId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase() || 'ACT';
  const cleanMatricula = matricula.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || '0000';

  const newRecord: DossierIssuanceRecord = {
    id: `DOSSIE-${cleanActId}-${cleanMatricula}-EM${issueNumber}-${randomCode}`,
    activityId,
    studentId,
    studentName,
    matricula,
    activityTitle,
    issueNumber,
    issuedAt: new Date().toISOString(),
    teacherName,
  };

  try {
    const all = getAllDossierRecords();
    all.push(newRecord);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch (err) {
    console.error('Erro ao salvar registro de dossiê:', err);
  }

  return {
    success: true,
    record: newRecord,
    currentCount: issueNumber,
  };
}
