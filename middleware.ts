import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const AUTH_COOKIE_NAME = 'auth_session_token';
const WINDOW_MS = 60 * 1000;
const LIMIT_PER_USER = 150;
const LIMIT_LOGIN_PER_IP = 200;
const LIMIT_ANON_PER_IP = 300;

const buckets = new Map<string, number[]>();
const warnedAt = new Map<string, number>();
let lastPrune = 0;

function prune(now: number) {
  if (now - lastPrune < WINDOW_MS) return;
  lastPrune = now;
  for (const [k, stamps] of buckets) {
    if (stamps.length === 0 || now - stamps[stamps.length - 1] > WINDOW_MS) buckets.delete(k);
  }
  for (const [k, t] of warnedAt) if (now - t > WINDOW_MS) warnedAt.delete(k);
}

export function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith('/api/')) return NextResponse.next();

  const now = Date.now();
  prune(now);

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || '127.0.0.1';
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const isLoginRoute = request.nextUrl.pathname.startsWith('/api/auth/') && !token;

  let bucketKey: string;
  let limit: number;
  if (token) {
    bucketKey = `u:${token.slice(-32)}`;
    limit = LIMIT_PER_USER;
  } else if (isLoginRoute) {
    bucketKey = `l:${ip}`;
    limit = LIMIT_LOGIN_PER_IP;
  } else {
    bucketKey = `a:${ip}`;
    limit = LIMIT_ANON_PER_IP;
  }

  const recent = (buckets.get(bucketKey) || []).filter((t) => now - t < WINDOW_MS);

  if (recent.length >= limit) {
    const retryAfter = Math.max(1, Math.ceil((WINDOW_MS - (now - recent[0])) / 1000));
    if (now - (warnedAt.get(bucketKey) || 0) > WINDOW_MS) {
      warnedAt.set(bucketKey, now);
      console.warn(`[Escudo Anti-Spam] Bloqueando ${bucketKey.startsWith('u:') ? 'usuário' : 'IP ' + ip} - Muitas requisições.`);
    }
    return NextResponse.json(
      { error: 'Muitas requisições em pouco tempo. Aguarde alguns segundos; o sistema tentará de novo automaticamente.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    );
  }

  recent.push(now);
  buckets.set(bucketKey, recent);
  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
