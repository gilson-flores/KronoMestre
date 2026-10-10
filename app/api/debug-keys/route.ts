import { NextResponse, NextRequest } from "next/server";
import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Apenas Admin autenticado pode consultar diagnósticos
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    const auth = getAdminAuth();
    const decoded = await auth.verifySessionCookie(sessionCookie, true);
    if (!decoded?.uid) {
      return NextResponse.json({ error: "Acesso restrito ao Administrador" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY || "";
  
  const diagnostics = {
    hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
    hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
    hasPrivateKey: !!privateKeyRaw,
    privateKeyConfigured: privateKeyRaw.length > 50,
    dbConnection: "TESTANDO..."
  };

  try {
    // Usando a FUNÇÃO correta e blindada que criamos
    const adminDb = getAdminDb();
    const snap = await adminDb.collection("tenants").limit(1).get();
    
    diagnostics.dbConnection = `SUCESSO! Conectado ao Firestore. Documentos achados: ${snap.size}`;
    return NextResponse.json({ success: true, diagnostics });
  } catch (error: any) {
    diagnostics.dbConnection = "FALHOU";
    return NextResponse.json({ 
      success: false, 
      diagnostics, 
      errorMessage: error.message,
      errorCode: error.code
    }, { status: 500 });
  }
}