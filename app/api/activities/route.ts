import { NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Chama o seu Singleton (que inicializa o Admin automaticamente)
    const auth = getAdminAuth();
    const db = getAdminDb();

    // Identifica o dono do Tenant (Professor Admin)
    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    const ownerTeacherId = decodedClaims.uid;

    const activityData = await request.json();
    const activityId = activityData.id;

    if (!activityId) {
      return NextResponse.json({ error: 'ID da atividade obrigatório' }, { status: 400 });
    }

    // Grava no Firestore dentro do cofre isolado do professor
    await db.collection('tenants')
      .doc(ownerTeacherId)
      .collection('activities')
      .doc(activityId)
      .set({
        ...activityData,
        updatedAt: new Date().toISOString()
      }, { merge: true });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro na API de Atividades:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  return POST(request); // A lógica de merge:true do Firestore resolve Criação e Atualização
}

export async function DELETE(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const auth = getAdminAuth();
    const db = getAdminDb();

    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    const ownerTeacherId = decodedClaims.uid;
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'ID ausente' }, { status: 400 });
    }

    await db.collection('tenants')
      .doc(ownerTeacherId)
      .collection('activities')
      .doc(id)
      .delete();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}