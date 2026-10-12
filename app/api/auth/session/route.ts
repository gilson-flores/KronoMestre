import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { getSessionFromRequest, signSessionToken, setSessionCookie, SessionPayload } from '@/lib/auth-server';
import { serverCache } from '@/lib/server-cache';

export const dynamic = 'force-dynamic';

async function getTenantDataCached(tenantId: string): Promise<any> {
  const cacheKey = `tenant_${tenantId}`;
  return serverCache.getOrSet(cacheKey, 300, async () => {
    try {
      const db = getAdminDb();
      const tenantSnap = await db.collection('tenants').doc(tenantId).get();
      return tenantSnap.exists ? tenantSnap.data() || {} : {};
    } catch (err: any) {
      console.warn('[Session API] Falha ao buscar tenant no Firestore (usando fallback cache):', err?.message);
      const fallback = serverCache.getLastKnown<any>(cacheKey);
      if (fallback && typeof fallback === 'object' && Object.keys(fallback).length > 0) {
        return fallback;
      }
      return {};
    }
  });
}

const NO_CACHE_HEADERS = {
  'Cache-Control': 'private, no-cache, no-store, max-age=0, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
  'Surrogate-Control': 'no-store',
};

export async function GET(req: NextRequest) {
  try {
    // 1. Tentar validar sessão ativa via JWT (Aluno, 2º Professor ou Professor Titular)
    // O JWT representa a ação de login explícita mais recente do usuário nesta aba/dispositivo
    const jwtSession = await getSessionFromRequest(req);
    if (jwtSession && jwtSession.sub) {
      const ownerTeacherId = jwtSession.ownerTeacherId || jwtSession.sub;

      if (jwtSession.role === 'teacher') {
        const tenantData = await getTenantDataCached(jwtSession.sub);

        return NextResponse.json(
          {
            user: {
              id: jwtSession.sub,
              email: jwtSession.email || '',
              name: tenantData?.name || tenantData?.nome || jwtSession.name || 'Prof. Gilson Flores',
              role: 'teacher',
              tenant: tenantData,
            },
          },
          { headers: NO_CACHE_HEADERS }
        );
      }

      if (jwtSession.role === 'second_teacher') {
        const tenantData = await getTenantDataCached(ownerTeacherId);

        return NextResponse.json(
          {
            user: {
              id: jwtSession.sub,
              email: jwtSession.email || '',
              name: jwtSession.name || '2º Professor',
              role: 'second_teacher',
              ownerTeacherId,
              mustChangePassword: Boolean(jwtSession.mustChangePassword),
              tenant: {
                driveFolderUrl: tenantData?.driveFolderUrl || '',
                school: tenantData?.school || "EEB Prof. Jandira D'Ávila",
              },
            },
          },
          { headers: NO_CACHE_HEADERS }
        );
      }

      if (jwtSession.role === 'student') {
        const tenantData = await getTenantDataCached(ownerTeacherId);

        return NextResponse.json(
          {
            user: {
              id: jwtSession.sub,
              name: jwtSession.name || 'Aluno',
              role: 'student',
              turma: jwtSession.turma || '',
              matricula: jwtSession.matricula || '',
              tag: jwtSession.tag || 'REGULAR',
              avatarUrl: jwtSession.avatarUrl || '',
              ownerTeacherId,
              mustChangePassword: Boolean(jwtSession.mustChangePassword),
              tenant: {
                name: tenantData?.name || tenantData?.nome || 'Prof. Gilson Flores',
                subject: tenantData?.subject || 'Sociologia',
                school: tenantData?.school || "EEB Prof. Jandira D'Ávila",
                avatarUrl: tenantData?.avatarUrl || '',
                driveFolderUrl: tenantData?.driveFolderUrl || '',
              },
            },
          },
          { headers: NO_CACHE_HEADERS }
        );
      }
    }

    // 2. Fallback: Validar sessão do Professor Titular (Cookie 'session' do Firebase Admin)
    try {
      const cookieStore = await cookies();
      const sessionCookie = cookieStore.get('session')?.value;

      if (sessionCookie) {
        const auth = getAdminAuth();
        const decoded = await auth.verifySessionCookie(sessionCookie, true);

        if (decoded && decoded.uid) {
          const tenantData = await getTenantDataCached(decoded.uid);

          return NextResponse.json(
            {
              user: {
                id: decoded.uid,
                email: decoded.email || '',
                name: tenantData?.name || tenantData?.nome || decoded.name || 'Prof. Gilson Flores',
                role: 'teacher',
                tenant: tenantData,
              },
            },
            { headers: NO_CACHE_HEADERS }
          );
        }
      }
    } catch {
      // Se o cookie 'session' não existir ou tiver expirado, prossegue para o retorno não autenticado
    }

    // 3. Sem sessão válida: Retorna user: null com cabeçalhos anti-cache estritos
    return NextResponse.json({ user: null }, { headers: NO_CACHE_HEADERS });
  } catch (err) {
    console.error('Erro ao verificar sessão:', err);
    return NextResponse.json({ user: null }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}