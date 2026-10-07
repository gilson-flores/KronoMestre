import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { getSessionFromRequest } from '@/lib/auth-server';
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
      return {};
    }
  });
}

export async function GET(req: NextRequest) {
  try {
    // 1. Tentar validar sessão do Professor Titular / Admin Supremo (Cookie 'session' do Firebase)
    try {
      const cookieStore = await cookies();
      const sessionCookie = cookieStore.get('session')?.value;

      if (sessionCookie) {
        const auth = getAdminAuth();
        const decoded = await auth.verifySessionCookie(sessionCookie, true);

        if (decoded && decoded.uid) {
          const tenantData = await getTenantDataCached(decoded.uid);

          return NextResponse.json({
            user: {
              id: decoded.uid,
              email: decoded.email || '',
              name: tenantData?.name || tenantData?.nome || decoded.name || 'Prof. Gilson Flores',
              role: 'teacher',
              tenant: tenantData,
            },
          });
        }
      }
    } catch {
      // Se o cookie 'session' não existir ou tiver expirado, segue para o fluxo JWT abaixo
    }

    // 2. Tentar validar sessão de Professor, 2º Professor ou Aluno (Cookie JWT via lib/auth-server)
    const jwtSession = await getSessionFromRequest(req);
    if (jwtSession && jwtSession.sub) {
      const ownerTeacherId = jwtSession.ownerTeacherId || jwtSession.sub;

      if (jwtSession.role === 'teacher') {
        const tenantData = await getTenantDataCached(jwtSession.sub);

        return NextResponse.json({
          user: {
            id: jwtSession.sub,
            email: jwtSession.email || '',
            name: tenantData?.name || tenantData?.nome || jwtSession.name || 'Prof. Gilson Flores',
            role: 'teacher',
            tenant: tenantData,
          },
        });
      }

      if (jwtSession.role === 'second_teacher') {
        const tenantData = await getTenantDataCached(ownerTeacherId);

        return NextResponse.json({
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
        });
      }

      if (jwtSession.role === 'student') {
        const tenantData = await getTenantDataCached(ownerTeacherId);

        return NextResponse.json({
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
        });
      }
    }

    return NextResponse.json({ user: null }, { status: 401 });
  } catch (err) {
    console.error('Erro ao verificar sessão:', err);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}