import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

// 1. LER ARQUIVOS (GET) - Substitui o supabase.from('library_files').select('*')
export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;
    if (!sessionCookie) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

    const adminAuth = getAdminAuth();
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const db = getAdminDb();

    // Busca apenas os arquivos do tenant atual (Isolamento)
    const snapshot = await db.collection('tenants').doc(decoded.uid).collection('library_files').get();
    
    const files = snapshot.docs.map(doc => doc.data());

    return NextResponse.json({ success: true, files });
  } catch (error: any) {
    console.error('Erro ao ler biblioteca no Firestore:', error);
    return NextResponse.json({ error: 'Erro ao buscar arquivos.' }, { status: 500 });
  }
}

// 2. SALVAR ARQUIVO (POST) - Substitui o supabase.from('library_files').insert()
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;
    if (!sessionCookie) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

    const adminAuth = getAdminAuth();
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const db = getAdminDb();
    
    const fileData = await request.json();
    if (!fileData.id) return NextResponse.json({ error: 'ID do arquivo ausente.' }, { status: 400 });

    // Salva o arquivo na subcoleção do tenant atual
    await db.collection('tenants').doc(decoded.uid).collection('library_files').doc(fileData.id).set(fileData);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao salvar arquivo no Firestore:', error);
    return NextResponse.json({ error: 'Erro ao salvar arquivo.' }, { status: 500 });
  }
}

// 3. DELETAR ARQUIVO (DELETE) - Substitui o supabase.from('library_files').delete()
export async function DELETE(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;
    if (!sessionCookie) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

    const adminAuth = getAdminAuth();
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const db = getAdminDb();

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('id');
    if (!fileId) return NextResponse.json({ error: 'ID do arquivo ausente.' }, { status: 400 });

    // Deleta o arquivo da subcoleção do tenant atual
    await db.collection('tenants').doc(decoded.uid).collection('library_files').doc(fileId).delete();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao deletar arquivo no Firestore:', error);
    return NextResponse.json({ error: 'Erro ao deletar arquivo.' }, { status: 500 });
  }
}
