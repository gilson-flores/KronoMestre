import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth-server';
import { serverCache } from '@/lib/server-cache';

export const dynamic = 'force-dynamic';

const SERVER_BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID || 'dev';
const COLLECTIONS = ['students', 'activities', 'messages', 'library', 'second_teachers', 'atestados_rad'];

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

    const owner = session.ownerTeacherId || session.sub;
    const rev = await serverCache.getRevision(owner, COLLECTIONS);
    return NextResponse.json({ build: SERVER_BUILD_ID, rev });
  } catch {
    return NextResponse.json({ build: SERVER_BUILD_ID, rev: {} });
  }
}
