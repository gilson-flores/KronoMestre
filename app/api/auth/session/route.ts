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

    const isAdminSupremo =
      email.toLowerCase().trim() === "755840@profe.sed.sc.gov.br" ||
      email.toLowerCase().trim() === "gilsonjuniores@gmail.com";

    let tenantData: any;

    // 3. Se por acaso o documento não existir, faz a criação silenciosa
    if (!tenantSnap.exists) {
      tenantData = {
        name: isAdminSupremo ? "Gilson Flores" : email.split("@")[0],
        nome: isAdminSupremo ? "Gilson Flores" : email.split("@")[0],
        email: email,
        plan_type: isAdminSupremo ? "unlimited" : "basic",
        is_admin: isAdminSupremo,
        subject: "Sociologia",
        school: "",
        escolas_vinculadas: [],
        disciplinas: [],
        created_at: new Date().toISOString(),
      };
      
      await tenantRef.set(tenantData);
    } else {
      tenantData = tenantSnap.data() || {};
      if (isAdminSupremo && (!tenantData.is_admin || tenantData.plan_type !== "unlimited")) {
        tenantData.is_admin = true;
        tenantData.plan_type = "unlimited";
        await tenantRef.set({ is_admin: true, plan_type: "unlimited" }, { merge: true });
      }
    }

    // 4. Retorna a união do Auth com o Banco de Dados para o Frontend
    return NextResponse.json({
      user: {
        id: uid,
        email: email,
        name: tenantData.name || tenantData.nome || email.split("@")[0],
        role: decodedClaims.role || "teacher",
        tenant: tenantData,
      },
    });
  } catch (error) {
    console.error("[Session API] Erro ao validar sessão/tenant:", error);
    return NextResponse.json({ user: null }, { status: 401 });
  }
}