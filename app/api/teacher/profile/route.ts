import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { getSessionFromRequest } from '@/lib/auth-server';
import { serverCache } from '@/lib/server-cache';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    let uid: string | null = null;
    let userEmail: string | undefined = undefined;

    // 1. Tenta validar pelo cookie session do Firebase Admin
    try {
      const cookieStore = await cookies();
      const sessionCookie = cookieStore.get('session')?.value;
      if (sessionCookie) {
        const adminAuth = getAdminAuth();
        const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
        if (decoded?.uid) {
          uid = decoded.uid;
          userEmail = decoded.email;
        }
      }
    } catch {}

    // 2. Fallback: validar pelo JWT de sessão (auth_session_token)
    if (!uid) {
      const jwtSession = await getSessionFromRequest(request);
      if (jwtSession && (jwtSession.role === 'teacher' || !jwtSession.role)) {
        uid = jwtSession.sub;
        userEmail = jwtSession.email;
      }
    }

    if (!uid) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const adminDb = getAdminDb();
    const body = await request.json();
    const { profile } = body;

    if (!profile) {
      return NextResponse.json({ error: 'Dados do perfil ausentes.' }, { status: 400 });
    }

    const tenantRef = adminDb.collection('tenants').doc(uid);
    let currentData: any = {};
    try {
      const tenantSnap = await tenantRef.get();
      currentData = tenantSnap.exists ? tenantSnap.data() || {} : {};
    } catch (readErr: any) {
      console.warn('[Teacher Profile API] Aviso ao ler tenant atual (possível cota excedida):', readErr?.message);
    }

    const updatedProfile = {
      ...currentData,
      nome: profile.name || profile.nome || currentData.nome || userEmail?.split('@')[0],
      email: profile.email || userEmail,
      name: profile.name || currentData.name || currentData.nome,
      subject: profile.subject ?? currentData.subject ?? 'Sociologia',
      school: profile.school ?? currentData.school ?? '',
      phone: profile.phone ?? currentData.phone ?? '',
      avatarUrl: profile.avatarUrl ?? currentData.avatarUrl ?? '',
      matriculaFuncional: profile.matriculaFuncional ?? currentData.matriculaFuncional ?? '',
      tenantCode: profile.tenantCode ?? currentData.tenantCode ?? '', // NOVO CAMPO: Código do Aluno
      contractStartDate: profile.contractStartDate ?? currentData.contractStartDate ?? '',
      contractEndDate: profile.contractEndDate ?? currentData.contractEndDate ?? '',
      contractType: profile.contractType ?? currentData.contractType ?? 'ACT',
      contractStatus: profile.contractStatus ?? currentData.contractStatus ?? 'Ativo',
      driveFolderUrl: profile.driveFolderUrl ?? currentData.driveFolderUrl ?? '',
      escolas_vinculadas: profile.escolas_vinculadas ?? currentData.escolas_vinculadas ?? [],
      disciplinas: profile.disciplinas ?? currentData.disciplinas ?? [],
      updated_at: new Date().toISOString(),
    };

    try {
      await tenantRef.set(updatedProfile, { merge: true });
      serverCache.delete(`tenant_${uid}`);
    } catch (setErr: any) {
      console.warn('[Teacher Profile API] Aviso ao salvar perfil no Firestore (possível cota excedida):', setErr?.message);
    }

    return NextResponse.json({ success: true, profile: updatedProfile });
  } catch (error: any) {
    console.error('[Teacher Profile API] Erro ao salvar perfil:', error);
    return NextResponse.json(
      { error: `Erro ao salvar perfil: ${error.message || String(error)}` },
      { status: 500 }
    );
  }
}
