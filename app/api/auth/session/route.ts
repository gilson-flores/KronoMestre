import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { getSessionFromRequest } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const db = getAdminDb();

    // 1. Tentar validar sessão do Professor Titular / Admin Supremo (Cookie 'session' do Firebase)
    try {
      const cookieStore = await cookies();
      const sessionCookie = cookieStore.get('session')?.value;

      if (sessionCookie) {
        const auth = getAdminAuth();
        const decoded = await auth.verifySessionCookie(sessionCookie, true);

        if (decoded && decoded.uid) {
          const tenantSnap = await db.collection('tenants').doc(decoded.uid).get();
          const tenantData = tenantSnap.exists ? tenantSnap.data() : {};

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

    // 2. Tentar validar sessão de Aluno ou 2º Professor (Cookie JWT via lib/auth-server)
    const jwtSession = await getSessionFromRequest(req);
    if (jwtSession && jwtSession.sub) {
      const ownerTeacherId = jwtSession.ownerTeacherId || jwtSession.sub;

      if (jwtSession.role === 'second_teacher') {
        return NextResponse.json({
          user: {
            id: jwtSession.sub,
            email: jwtSession.email || '',
            name: jwtSession.name || '2º Professor',
            role: 'second_teacher',
            ownerTeacherId,
            mustChangePassword: Boolean(jwtSession.mustChangePassword),
          },
        });
      }

      if (jwtSession.role === 'student') {
        const tenantSnap = await db.collection('tenants').doc(ownerTeacherId).get();
        const tenantData = tenantSnap.exists ? tenantSnap.data() : {};

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