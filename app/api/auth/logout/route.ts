import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { clearSessionCookie } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const cookieStore = await cookies();
    
    // Deleta o cookie de sessão do Firebase
    cookieStore.delete("session");

    const res = NextResponse.json({ success: true });
    // Deleta o cookie JWT seguro (auth_session_token)
    clearSessionCookie(res);
    res.cookies.delete("session");

    return res;
  } catch (error) {
    console.error("[Logout API] Erro ao encerrar sessão:", error);
    return NextResponse.json(
      { error: "Erro ao encerrar sessão" },
      { status: 500 }
    );
  }
}
