import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "E-mail e senha são obrigatórios." }, { status: 400 });
    }

    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Variável NEXT_PUBLIC_FIREBASE_API_KEY não encontrada." }, { status: 500 });
    }

    // 1. Valida as credenciais na REST API do Firebase Auth
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      const errorMessage = data.error?.message || "Falha na autenticação.";
      return NextResponse.json({ error: errorMessage }, { status: 401 });
    }

    const idToken = data.idToken;
    const uid = data.localId;
    const userEmail = data.email || email;

    // 2. Criação do Cookie de Sessão Protegido
    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();

    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 dias
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

    const cookieStore = await cookies();
    cookieStore.set("session", sessionCookie, {
      maxAge: expiresIn / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax",
    });

    // 3. Onboarding Silencioso (Gravação do Tenant no Firestore)
    const tenantRef = adminDb.collection("tenants").doc(uid);
    const tenantSnap = await tenantRef.get();

    const isAdminSupremo =
      userEmail.toLowerCase().trim() === "755840@profe.sed.sc.gov.br" ||
      userEmail.toLowerCase().trim() === "gilsonjuniores@gmail.com";

    let tenantData: any;
    if (!tenantSnap.exists) {
      tenantData = {
        name: isAdminSupremo ? "Gilson Flores" : userEmail.split("@")[0],
        nome: isAdminSupremo ? "Gilson Flores" : userEmail.split("@")[0],
        email: userEmail,
        plan_type: isAdminSupremo ? "unlimited" : "basic",
        is_admin: isAdminSupremo,
        subject: "Sociologia",
        school: "",
        escolas_vinculadas: [],
        disciplinas: [],
        created_at: new Date().toISOString(),
      };
      await tenantRef.set(tenantData);
      console.log(`[Firestore] Tenant criado com sucesso: ${uid}`);
    } else {
      tenantData = tenantSnap.data() || {};
      if (isAdminSupremo && (!tenantData.is_admin || tenantData.plan_type !== "unlimited")) {
        tenantData.is_admin = true;
        tenantData.plan_type = "unlimited";
        await tenantRef.set({ is_admin: true, plan_type: "unlimited" }, { merge: true });
      }
    }

    return NextResponse.json({
      user: {
        id: uid,
        email: userEmail,
        name: tenantData.name || tenantData.nome || userEmail.split("@")[0],
        role: "teacher",
        tenant: tenantData,
      },
    });
  } catch (error: any) {
    console.error("[Login API] Erro fatal:", error);
    return NextResponse.json(
      { error: `Erro no Servidor: ${error.message || String(error)}` },
      { status: 500 }
    );
  }
}
