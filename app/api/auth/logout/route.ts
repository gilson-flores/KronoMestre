import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  try {
    const cookieStore = await cookies();
    
    // Deleta o cookie de sessão do Firebase
    cookieStore.delete("session");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Logout API] Erro ao encerrar sessão:", error);
    return NextResponse.json(
      { error: "Erro ao encerrar sessão" },
      { status: 500 }
    );
  }
}
