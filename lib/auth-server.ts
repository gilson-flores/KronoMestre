import { SignJWT, jwtVerify } from 'jose';
import { NextRequest, NextResponse } from 'next/server';

export const AUTH_COOKIE_NAME = 'auth_session_token';

// Segredo JWT: busca da variável AUTH_JWT_SECRET ou usa chave derivada estável
function getJwtSecret(): Uint8Array {
  const secret = process.env.AUTH_JWT_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'default-secret-sociologia-online-2026-fallback-salt';
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  sub: string;            // ID único do usuário
  role: 'teacher' | 'second_teacher' | 'student';
  ownerTeacherId: string; // ID do Professor Titular dono da assinatura
  name: string;
  email?: string;
  classRoom?: string;
  isPne?: boolean;
  matricula?: string;
  avatarUrl?: string;
  subject?: string;
  [key: string]: any;
}

/**
 * Assina um JWT de sessão com validade customizada
 */
export async function signSessionToken(payload: SessionPayload, expiresIn = '7d'): Promise<string> {
  const secret = getJwtSecret();
  const jwt = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret);
  return jwt;
}

/**
 * Verifica e decodifica o JWT de sessão
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as SessionPayload;
  } catch (err) {
    return null;
  }
}

/**
 * Extrai e valida a sessão a partir do Cookie HttpOnly de uma NextRequest ou cabeçalho Authorization
 */
export async function getSessionFromRequest(req: NextRequest | Request): Promise<SessionPayload | null> {
  let token: string | undefined;

  if ('cookies' in req && typeof req.cookies?.get === 'function') {
    token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  }

  if (!token) {
    // Fallback: busca no cabeçalho Cookie
    const cookieHeader = req.headers.get('cookie') || '';
    const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${AUTH_COOKIE_NAME}=([^;]*)`));
    if (match) {
      token = decodeURIComponent(match[1]);
    }
  }

  if (!token) {
    // Fallback: busca no cabeçalho Authorization Bearer
    const authHeader = req.headers.get('authorization') || '';
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }
  }

  if (!token) return null;

  return verifySessionToken(token);
}

/**
 * Grava o Cookie HttpOnly seguro na resposta HTTP
 */
export function setSessionCookie(res: NextResponse, token: string, maxAgeSeconds = 7 * 24 * 60 * 60): void {
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeSeconds,
  });
}

/**
 * Remove o Cookie HttpOnly de autenticação
 */
export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}
