import { gzipSync, gunzipSync } from 'zlib';

const MAX_PLAIN_BYTES = 600_000;

export function emissionDocId(hash: string): string {
  return String(hash || '').replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 200) || `rco-${Date.now()}`;
}

export function toRcoDoc(item: any, ownerTeacherId: string): Record<string, any> {
  const fullSnapshot = item.fullSnapshot ?? item.full_snapshot ?? {};
  const json = JSON.stringify(fullSnapshot);
  const base: Record<string, any> = {
    id: emissionDocId(item.emissionHash || item.emission_hash),
    emissionHash: item.emissionHash || item.emission_hash,
    teacherId: item.teacherId || item.teacher_id || ownerTeacherId,
    teacherName: item.teacherName || item.teacher_name || '',
    subject: item.subject || '',
    school: item.school || '',
    scope: item.scope || 'all',
    turma: item.turma || null,
    totalStudents: Number(item.totalStudents ?? item.total_students ?? 0),
    totalActivities: Number(item.totalActivities ?? item.total_activities ?? 0),
    turmasSummary: item.turmasSummary || item.turmas_summary || [],
    emittedAt: item.emittedAt || item.emitted_at || new Date().toISOString(),
    createdAt: item.createdAt || item.created_at || new Date().toISOString(),
    ownerTeacherId,
  };
  if (Buffer.byteLength(json, 'utf8') > MAX_PLAIN_BYTES) {
    base.fullSnapshotGz = gzipSync(Buffer.from(json, 'utf8'));
  } else {
    base.fullSnapshot = fullSnapshot;
  }
  return base;
}

export function fromRcoDoc(data: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = { ...data };
  if (out.fullSnapshotGz) {
    try {
      const buf = Buffer.isBuffer(out.fullSnapshotGz) ? out.fullSnapshotGz : Buffer.from(out.fullSnapshotGz);
      out.fullSnapshot = JSON.parse(gunzipSync(buf).toString('utf8'));
    } catch {
      out.fullSnapshot = {};
    }
    delete out.fullSnapshotGz;
  }
  if (out.turma === null) delete out.turma;
  return out;
}
