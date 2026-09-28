import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { verifyPassword } from "@/lib/crypto";
import { signSessionToken, setSessionCookie, SessionPayload } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, role } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "E-mail e senha são obrigatórios." }, { status: 400 });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPassword = String(password).trim();
    const adminDb = getAdminDb();

    // ============================================================================
    // FLUXO 1: LOGIN DO 2º PROFESSOR (AEE / INCLUSÃO) - 100% FIRESTORE + JWT
    // ============================================================================
    if (role === "second_teacher") {
      const snap = await adminDb.collectionGroup("second_teachers").get();
      let matchedDoc: any = null;
      let matchedData: any = null;

      for (const doc of snap.docs) {
        const d = doc.data();
        if ((d.email || "").trim().toLowerCase() === cleanEmail) {
          matchedDoc = doc;
          matchedData = d;
          break;
        }
      }

      if (!matchedDoc || !matchedData) {
        return NextResponse.json(
          { error: "E-mail de 2º Professor não encontrado. Verifique com o Professor Titular." },
          { status: 404 }
        );
      }

      const storedHash = matchedData.passwordHash || matchedData.password_hash || "";
      let isPassValid = false;

      if (storedHash) {
        isPassValid = await verifyPassword(cleanPassword, storedHash);
      }

      // Fallback: se não validou pelo hash Bcrypt, tenta verificar no Firebase Auth
      if (!isPassValid) {
        const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
        if (apiKey) {
          const fbRes = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email: cleanEmail, password: cleanPassword, returnSecureToken: true }),
            }
          ).catch(() => null);
          if (fbRes && fbRes.ok) {
            isPassValid = true;
          }
        }
      }

      if (!isPassValid) {
        return NextResponse.json(
          { error: "Senha incorreta para o 2º Professor." },
          { status: 401 }
        );
      }

      // Descobre o ownerTeacherId real (da pasta pai no Firestore ou do documento)
      let ownerTeacherId =
        matchedDoc.ref.parent.parent?.id || matchedData.ownerTeacherId || "default-teacher";

      // Se estava pendurado em 'default-teacher', localiza o Tenant principal no Firestore
      if (ownerTeacherId === "default-teacher") {
        const tenantsSnap = await adminDb.collection("tenants").get();
        const realTenant = tenantsSnap.docs.find((t) => t.id !== "default-teacher");
        if (realTenant) {
          ownerTeacherId = realTenant.id;
          await matchedDoc.ref.set({ ownerTeacherId }, { merge: true });
        }
      }

      const sessionPayload: SessionPayload = {
        sub: matchedDoc.id,
        role: "second_teacher",
        ownerTeacherId,
        email: cleanEmail,
        name: matchedData.name || "2º Professor (AEE)",
        mustChangePassword: Boolean(matchedData.mustChangePassword),
      };

      const token = await signSessionToken(sessionPayload, "7d");

      // Limpa eventual cookie 'session' antigo do Firebase Auth para não dar conflito de papéis
      const cookieStore = await cookies();
      cookieStore.delete("session");

      const response = NextResponse.json({
        user: {
          id: matchedDoc.id,
          email: cleanEmail,
          name: matchedData.name || "2º Professor (AEE)",
          subject: matchedData.subject || "AEE / Inclusão Escolar",
          phone: matchedData.phone || "",
          school: matchedData.school || "",
          avatarUrl:
            matchedData.avatarUrl ||
            "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=250",
          role: "second_teacher",
          mustChangePassword: Boolean(matchedData.mustChangePassword),
          ownerTeacherId,
        },
      });

      setSessionCookie(response, token, 7 * 24 * 60 * 60);
      return response;
    }

    // ============================================================================
    // FLUXO 2: LOGIN DO PROFESSOR TITULAR / ADMIN SUPREMO (FIREBASE AUTH)
    // ============================================================================
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Variável NEXT_PUBLIC_FIREBASE_API_KEY não encontrada." },
        { status: 500 }
      );
    }

    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, password: cleanPassword, returnSecureToken: true }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      const errorMessage = data.error?.message || "Falha na autenticação.";
      return NextResponse.json({ error: errorMessage }, { status: 401 });
    }

    const idToken = data.idToken;
    const uid = data.localId;
    const userEmail = data.email || cleanEmail;

    const adminAuth = getAdminAuth();
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

    // Onboarding Silencioso (Gravação do Tenant no Firestore)
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
