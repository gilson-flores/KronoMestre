import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

// GET: Busca todos os alunos do professor logado
export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session")?.value;

    if (!sessionCookie) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();

    // Descobre quem é o professor logado
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie);
    const tenantId = decodedClaims.uid;

    // Busca apenas os alunos da pasta desse professor
    const studentsSnap = await adminDb
      .collection("tenants")
      .doc(tenantId)
      .collection("students")
      .get();

    const students = studentsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ students });
  } catch (error: any) {
    console.error("[Students API] Erro ao buscar alunos:", error);
    return NextResponse.json({ error: "Falha interna do servidor" }, { status: 500 });
  }
}

// POST: Cadastra um novo aluno na pasta do professor
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session")?.value;

    if (!sessionCookie) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();

    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie);
    const tenantId = decodedClaims.uid;

    const body = await request.json();

    // Prepara o objeto do aluno (sanitização básica)
    const newStudent = {
      fullName: body.fullName || "Aluno Sem Nome",
      matricula: body.matricula || "",
      turma: body.turma || "",
      tag: body.tag || "REGULAR",
      avatarUrl: body.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200",
      pneConditions: body.pneConditions || null,
      passwordHash: body.passwordHash || "",
      mustChangePassword: true,
      created_at: new Date().toISOString(),
      isArchived: false,
    };

    // Salva no banco de dados, deixando o Firestore gerar um ID único seguro
    const docRef = await adminDb
      .collection("tenants")
      .doc(tenantId)
      .collection("students")
      .add(newStudent);

    return NextResponse.json({ 
      success: true, 
      student: { id: docRef.id, ...newStudent } 
    });
  } catch (error: any) {
    console.error("[Students API] Erro ao cadastrar aluno:", error);
    return NextResponse.json({ error: "Falha ao cadastrar aluno" }, { status: 500 });
  }
}