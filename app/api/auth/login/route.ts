import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase-admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "E-mail e senha são obrigatórios" }, { status: 400 });
    }

    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    
    // 1. Autentica via Firebase REST API para obter o idToken mantendo o frontend intacto
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

    // 4. Decodifica para devolver os dados básicos ao frontend
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie);

    return NextResponse.json({
      user: {
        id: decodedClaims.uid,
        email: decodedClaims.email,
        role: decodedClaims.role || "teacher", // Fallback inicial caso a claim ainda não exista
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
