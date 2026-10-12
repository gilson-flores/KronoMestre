import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { clearSessionCookie } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  'Cache-Control': 'private, no-cache, no-store, max-age=0, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
  'Surrogate-Control': 'no-store',
};

export async function POST() {
  try {
    const cookieStore = await cookies();
    
    // Deleta o cookie de sessão do Firebase da store
    cookieStore.delete("session");

    const res = NextResponse.json({ success: true }, { headers: NO_CACHE_HEADERS });
    // Deleta o cookie JWT seguro (auth_session_token)
    clearSessionCookie(res);
    res.cookies.set("session", "", { maxAge: 0, path: "/" });
    res.cookies.set("auth_session_token", "", { maxAge: 0, path: "/" });

    return res;
  } catch (error) {
    console.error("[Logout API] Erro ao encerrar sessão:", error);
    return NextResponse.json(
      { error: "Erro ao encerrar sessão" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
