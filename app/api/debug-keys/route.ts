import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY || "";
  
  const diagnostics = {
    hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
    hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
    hasPrivateKey: !!privateKeyRaw,
    privateKeyLength: privateKeyRaw.length,
    privateKeyStartsWith: privateKeyRaw.substring(0, 35),
    privateKeyHasQuotes: privateKeyRaw.startsWith('"') || privateKeyRaw.startsWith("'"),
    privateKeyHasEscapedNewlines: privateKeyRaw.includes("\\n"),
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