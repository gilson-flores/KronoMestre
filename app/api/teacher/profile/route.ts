import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();

    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const uid = decoded.uid;

    const body = await request.json();
    const { profile } = body;

    if (!profile) {
      return NextResponse.json({ error: 'Dados do perfil ausentes.' }, { status: 400 });
    }

    const tenantRef = adminDb.collection('tenants').doc(uid);
    const tenantSnap = await tenantRef.get();
    const currentData = tenantSnap.exists ? tenantSnap.data() || {} : {};

    const updatedProfile = {
      ...currentData,
      nome: profile.name || profile.nome || currentData.nome || decoded.email?.split('@')[0],
      email: profile.email || decoded.email,
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

    await tenantRef.set(updatedProfile, { merge: true });

    return NextResponse.json({ success: true, profile: updatedProfile });
  } catch (error: any) {
    console.error('[Teacher Profile API] Erro ao salvar perfil no Firestore:', error);
    return NextResponse.json(
      { error: `Erro ao salvar perfil: ${error.message || String(error)}` },
      { status: 500 }
    );
  }
}
