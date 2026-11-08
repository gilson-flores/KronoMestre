import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const tenantId = req.headers.get('x-tenant-id') || 'default_teacher';
    return NextResponse.json({ ok: true, data: null });
  } catch (err: any) {
    return NextResponse.json({ ok: true, data: null });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    return NextResponse.json({ ok: true, body });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Erro' }, { status: 500 });
  }
}
