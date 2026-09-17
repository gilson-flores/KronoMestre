import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase-admin";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session")?.value;

    if (!sessionCookie) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    // Valida o cookie gerado pelo Firebase na rota de login
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie);

    return NextResponse.json({
      user: {
        id: decodedClaims.uid,
        email: decodedClaims.email,
        role: decodedClaims.role || "teacher", // Estrutura base para o Multi-Tenant
      },
    });
  } catch (error) {
    console.error("[Session API] Cookie inválido ou expirado:", error);
    return NextResponse.json({ user: null }, { status: 401 });
  }
}
