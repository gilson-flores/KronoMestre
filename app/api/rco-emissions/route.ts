import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { getSessionFromRequest } from '@/lib/auth-server';
import { serverCache } from '@/lib/server-cache';
import { toRcoDoc, fromRcoDoc } from '@/lib/rco-doc';

export const dynamic = 'force-dynamic';

const TTL = 900;

async function resolveOwner(req: NextRequest): Promise<string | null> {
  const session = await getSessionFromRequest(req);
  if (!session) return null;
  if (session.role !== 'teacher' && session.role !== 'second_teacher') return null;
  return session.ownerTeacherId || session.sub;
}

export async function GET(req: NextRequest) {
  try {
    const owner = await resolveOwner(req);
    if (!owner) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

    const emissions = await serverCache.getOrSet(`rco_emissions_${owner}`, TTL, async () => {
      const snap = await getAdminDb().collection('tenants').doc(owner).collection('rco_emissions').get();
      const list = snap.docs.map((d) => ({ ...fromRcoDoc(d.data()), id: d.id }));
      list.sort((a: any, b: any) => String(b.emittedAt || '').localeCompare(String(a.emittedAt || '')));
      return list;
    });

    return NextResponse.json({ success: true, data: emissions });
  } catch (err: any) {
    console.error('Erro GET /api/rco-emissions:', err);
    const owner = await resolveOwner(req).catch(() => null);
    const fallback = owner ? serverCache.getLastKnown<any[]>(`rco_emissions_${owner}`) || [] : [];
    return NextResponse.json({ success: true, data: fallback, warning: err?.message }, { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const owner = await resolveOwner(req);
    if (!owner) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

    const body = await req.json();
    const items = (Array.isArray(body) ? body : [body]).filter((i) => i && (i.emissionHash || i.emission_hash));
    if (items.length === 0) return NextResponse.json({ error: 'Nenhuma emissão informada.' }, { status: 400 });

    const db = getAdminDb();
    const col = db.collection('tenants').doc(owner).collection('rco_emissions');

    const saved: any[] = [];
    for (let i = 0; i < items.length; i += 200) {
      const batch = db.batch();
      for (const item of items.slice(i, i + 200)) {
        const doc = toRcoDoc(item, owner);
        batch.set(col.doc(doc.id), doc, { merge: true });
        saved.push({ ...fromRcoDoc(doc), id: doc.id });
      }
      await batch.commit();
    }

    for (const s of saved) {
      if (!serverCache.upsertListItem(`rco_emissions_${owner}`, TTL, s)) {
        serverCache.delete(`rco_emissions_${owner}`);
        break;
      }
    }

    return NextResponse.json({ success: true, data: saved.map((s) => ({ id: s.id, emissionHash: s.emissionHash })) });
  } catch (err: any) {
    console.error('Erro POST /api/rco-emissions:', err);
    return NextResponse.json({ error: err?.message || 'Erro ao salvar emissão' }, { status: 500 });
  }
}
