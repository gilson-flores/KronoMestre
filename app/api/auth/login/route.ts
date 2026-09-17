import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "E-mail e senha são obrigatórios" }, { status: 400 });
    }

    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    
    // 1. Autentica via Firebase REST API
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
      const errorMessage = data.error?.message || "Falha na autenticação do Firebase";
      return NextResponse.json({ error: errorMessage }, { status: 401 });
    }

    const idToken = data.idToken;

    // 2. Cria o Cookie de Sessão
    const expiresIn = 60 * 60 * 24 * 5 * 1000;
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

    const cookieStore = await cookies();
    cookieStore.set("session", sessionCookie, {
      maxAge: expiresIn / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax",
    });

    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie);
    const uid = decodedClaims.uid;
    const userEmail = decodedClaims.email || "";

    // 3. Onboarding Silencioso (Cria o banco de dados)
    const tenantRef = adminDb.collection("tenants").doc(uid);
    const tenantSnap = await tenantRef.get();
    
    let tenantData;

    if (!tenantSnap.exists) {
      tenantData = {
        nome: userEmail.split("@")[0],
        email: userEmail,
        plan_type: "basic",
        is_admin: true, // Forçando admin para você
        escolas_vinculadas: [],
        disciplinas: [],
        created_at: new Date().toISOString(),
      };
      
      await tenantRef.set(tenantData);
    } else {
      tenantData = tenantSnap.data();
    }

    return NextResponse.json({
      user: {
        id: uid,
        email: userEmail,
        role: "teacher",
        tenant: tenantData,
      },
    });
  } catch (error: any) {
    console.error("[Login API] Erro Crítico:", error);
    // Aqui está a mágica: agora enviaremos a mensagem técnica real para o frontend
    return NextResponse.json(
      { error: `Falha no Servidor Vercel: ${error.message || String(error)}` },
      { status: 500 }
    );
  }
}
