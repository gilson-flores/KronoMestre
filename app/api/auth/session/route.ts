import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session")?.value;

    if (!sessionCookie) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    // Usando as novas funções seguras de inicialização
    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();

    // 1. Valida o cookie e extrai dados básicos do Auth
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie);
    const uid = decodedClaims.uid;
    const email = decodedClaims.email || "";

    // 2. Acessa o Firestore para buscar o Tenant (Professor Cliente)
    const tenantRef = adminDb.collection("tenants").doc(uid);
    const tenantSnap = await tenantRef.get();

    let tenantData;

    // 3. Se por acaso o documento não existir, faz a criação silenciosa
    if (!tenantSnap.exists) {
      tenantData = {
        nome: email.split("@")[0],
        email: email,
        plan_type: "basic",
        is_admin: true,
        escolas_vinculadas: [],
        disciplinas: [],
        created_at: new Date().toISOString(),
      };
      
      await tenantRef.set(tenantData);
    } else {
      tenantData = tenantSnap.data();
    }

    // 4. Retorna a união do Auth com o Banco de Dados para o Frontend
    return NextResponse.json({
      user: {
        id: uid,
        email: email,
        role: decodedClaims.role || "teacher",
        tenant: tenantData,
      },
    });
  } catch (error) {
    console.error("[Session API] Erro ao validar sessão/tenant:", error);
    return NextResponse.json({ user: null }, { status: 401 });
  }
}