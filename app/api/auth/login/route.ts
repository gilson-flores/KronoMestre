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
      const errorMessage = data.error?.message || "Falha na autenticação";
      return NextResponse.json({ error: errorMessage }, { status: 401 });
    }

    const idToken = data.idToken;

    // 2. Cria o Cookie de Sessão Seguro (duração de 5 dias)
    const expiresIn = 60 * 60 * 24 * 5 * 1000;
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

    // 3. Define o Cookie na resposta HTTP
    const cookieStore = await cookies();
    cookieStore.set("session", sessionCookie, {
      maxAge: expiresIn / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax",
    });

    // 4. Decodifica para obter o UID
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie);
    const uid = decodedClaims.uid;
    const userEmail = decodedClaims.email || "";

    // 5. ONBOARDING SILENCIOSO NO ATO DO LOGIN
    const tenantRef = adminDb.collection("tenants").doc(uid);
    const tenantSnap = await tenantRef.get();
    
    let tenantData;

    if (!tenantSnap.exists) {
      tenantData = {
        nome: userEmail.split("@")[0],
        email: userEmail,
        plan_type: "basic",
        is_admin: userEmail === "755840@profe.sed.sc.gov.br", // TODO: Coloque seu e-mail real aqui
        escolas_vinculadas: [],
        disciplinas: [],
        created_at: new Date().toISOString(),
      };
      
      await tenantRef.set(tenantData);
      console.log(`[Firestore] Novo tenant criado no Login para: ${userEmail}`);
    } else {
      tenantData = tenantSnap.data();
    }

    return NextResponse.json({
      user: {
        id: uid,
        email: userEmail,
        role: decodedClaims.role || "teacher",
        tenant: tenantData,
      },
    });
  } catch (error: any) {
    console.error("[Login API] Erro interno:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor ao processar o login." },
      { status: 500 }
    );
  }
}
