import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth-server';
import { getAdminDb } from '@/lib/firebase-admin';
import { verifyPassword } from '@/lib/crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return NextResponse.json({ valid: false, error: 'Não autorizado.' }, { status: 401 });
    if (session.role !== 'teacher' && session.role !== 'second_teacher') {
      return NextResponse.json({ valid: false, error: 'Permissão negada.' }, { status: 403 });
    }

    const { password } = await req.json();
    if (!password || typeof password !== 'string') {
      return NextResponse.json({ valid: false, error: 'Senha não informada.' }, { status: 400 });
    }

    if (session.role === 'teacher') {
      const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
      const email = (session.email || '').trim().toLowerCase();
      if (!apiKey || !email) {
        return NextResponse.json({ valid: false, error: 'Não foi possível validar a senha.' }, { status: 500 });
      }
      const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: false }),
      });
      if (!res.ok) return NextResponse.json({ valid: false, error: 'Senha incorreta.' }, { status: 401 });
      return NextResponse.json({ valid: true });
    }

    const owner = session.ownerTeacherId;
    const snap = await getAdminDb().collection('tenants').doc(owner).collection('second_teachers').doc(session.sub).get();
    const data = snap.data() || {};
    const stored = data.passwordHash || data.password_hash || '';
    const ok = stored ? await verifyPassword(password, stored) : false;
    if (!ok) return NextResponse.json({ valid: false, error: 'Senha incorreta.' }, { status: 401 });
    return NextResponse.json({ valid: true });
  } catch (err: any) {
    console.error('Erro em /api/auth/verify-password:', err);
    return NextResponse.json({ valid: false, error: 'Erro ao validar senha.' }, { status: 500 });
  }
}
