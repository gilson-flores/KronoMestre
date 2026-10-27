import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth-server';
import { getAdminDb } from '@/lib/firebase-admin';
import { serverCache } from '@/lib/server-cache';

export const dynamic = 'force-dynamic';

const TTL = 900;
const cacheKeyFor = (owner: string) => `atestados_rad_${owner}`;

function atestadosCol(owner: string) {
  return getAdminDb().collection('tenants').doc(owner).collection('atestados_rad');
}

async function loadAll(owner: string): Promise<any[]> {
  return serverCache.getOrSet(cacheKeyFor(owner), TTL, async () => {
    const snap = await atestadosCol(owner).get();
    const list = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
    list.sort((a: any, b: any) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    return list;
  });
}

async function loadStudents(owner: string): Promise<any[]> {
  return serverCache.getOrSet(`students_${owner}`, 1800, async () => {
    const snap = await getAdminDb().collection('tenants').doc(owner).collection('students').get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  });
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado. Faça login para continuar.' }, { status: 401 });
    }

    const owner = session.ownerTeacherId || session.sub;
    let filtered = await loadAll(owner);

    if (session.role === 'second_teacher') {
      const students = await loadStudents(owner);
      const myName = String(session.name || '').toLowerCase().trim();
      const mine = students.filter(
        (s: any) =>
          s.secondTeacherId === session.sub ||
          (myName && String(s.secondTeacherName || '').toLowerCase().includes(myName))
      );

      if (mine.length > 0) {
        const ids = new Set(mine.map((s: any) => s.id));
        const matriculas = new Set(mine.map((s: any) => s.matricula));
        const names = new Set(mine.map((s: any) => String(s.fullName || '').toLowerCase().trim()));
        filtered = filtered.filter(
          (r: any) =>
            ids.has(r.studentId) ||
            matriculas.has(r.studentId) ||
            names.has(String(r.studentName || '').toLowerCase().trim())
        );
      } else {
        filtered = [];
      }
    }

    if (session.role === 'student') {
      const myName = String(session.name || '').toLowerCase();
      filtered = filtered.filter(
        (r: any) => r.studentId === session.sub || String(r.studentName || '').toLowerCase() === myName
      );
    }

    return NextResponse.json({ success: true, data: filtered });
  } catch (err: any) {
    console.error('Erro na rota GET /api/atestados-rad:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado. Faça login para continuar.' }, { status: 401 });
    }

    if (session.role !== 'teacher' && session.role !== 'second_teacher') {
      return NextResponse.json({ error: 'Permissão negada. Apenas professores podem registrar atestados/RAD.' }, { status: 403 });
    }

    const body = await req.json();
    const owner = session.ownerTeacherId || session.sub;
    const rawItems = Array.isArray(body) ? body : [body];

    if (rawItems.length === 0) {
      return NextResponse.json({ error: 'Nenhum dado informado.' }, { status: 400 });
    }

    const records = rawItems.map((item: any) => {
      const id = String(item.id || `atr-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`);
      return {
        id,
        studentId: item.studentId || item.student_id,
        studentName: item.studentName || item.student_name,
        studentTurma: item.studentTurma || item.student_turma || '',
        dataFalta: item.dataFalta || item.data_falta,
        dataAtestado: item.dataAtestado || item.data_atestado,
        diasAtestado: Number(item.diasAtestado || item.dias_atestado) || 1,
        dataFinal: item.dataFinal || item.data_final,
        motivo: item.motivo || null,
        tipo: item.tipo || 'Atestado',
        createdAt: item.createdAt || item.created_at || new Date().toISOString(),
        ownerTeacherId: owner,
      };
    });

    const db = getAdminDb();
    const col = atestadosCol(owner);
    for (let i = 0; i < records.length; i += 400) {
      const batch = db.batch();
      records.slice(i, i + 400).forEach((r) => batch.set(col.doc(r.id), r, { merge: true }));
      await batch.commit();
    }

    for (const r of records) {
      if (!serverCache.upsertListItem(cacheKeyFor(owner), TTL, r)) {
        serverCache.delete(cacheKeyFor(owner));
        break;
      }
    }

    return NextResponse.json({ success: true, data: records });
  } catch (err: any) {
    console.error('Erro na rota POST /api/atestados-rad:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    if (session.role !== 'teacher' && session.role !== 'second_teacher') {
      return NextResponse.json({ error: 'Permissão negada.' }, { status: 403 });
    }

    const url = new URL(req.url);
    let id = url.searchParams.get('id');

    if (!id) {
      try {
        const body = await req.json();
        id = body.id;
      } catch {}
    }

    if (!id) {
      return NextResponse.json({ error: 'ID do registro não informado.' }, { status: 400 });
    }

    const owner = session.ownerTeacherId || session.sub;
    await atestadosCol(owner).doc(String(id)).delete();
    if (!serverCache.removeListItem(cacheKeyFor(owner), TTL, String(id))) {
      serverCache.delete(cacheKeyFor(owner));
    }

    return NextResponse.json({ success: true, message: 'Registro removido com sucesso.' });
  } catch (err: any) {
    console.error('Erro na rota DELETE /api/atestados-rad:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
