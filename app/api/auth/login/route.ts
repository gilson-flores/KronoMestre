import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { verifyPassword } from "@/lib/crypto";
import { signSessionToken, setSessionCookie, clearSessionCookie, SessionPayload } from "@/lib/auth-server";

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

    const isAdminSupremoEmail =
      cleanEmail === "755840@profe.sed.sc.gov.br" ||
      cleanEmail === "gilsonjuniores@gmail.com";

    // ============================================================================
    // VERIFICAÇÃO AUTOMÁTICA DE 2º PROFESSOR NO FIRESTORE
    // (Funciona tanto na aba 2º Professor quanto se digitar na aba Professor!)
    // ============================================================================
    let matchedSecondDoc: any = null;
    let matchedSecondData: any = null;

    if (role === "second_teacher" || !isAdminSupremoEmail) {
      const snap = await adminDb.collectionGroup("second_teachers").get();
      for (const doc of snap.docs) {
        const d = doc.data();
        if ((d.email || "").trim().toLowerCase() === cleanEmail) {
          matchedSecondDoc = doc;
          matchedSecondData = d;
          break;
        }
      }
    }

    if (role === "second_teacher" || matchedSecondDoc) {
      if (!matchedSecondDoc || !matchedSecondData) {
        return NextResponse.json(
          { error: "E-mail de 2º Professor não encontrado. Verifique com o Professor Titular." },
          { status: 404 }
        );
      }

      const storedHash = matchedSecondData.passwordHash || matchedSecondData.password_hash || "";
      let isPassValid = false;

      if (storedHash) {
        isPassValid = await verifyPassword(cleanPassword, storedHash);
      }

      if (!isPassValid) {
        const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
        if (apiKey) {
          const fbRes = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: cleanEmail,
                password: cleanPassword,
                returnSecureToken: true,
              }),
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

      // Descobre o ownerTeacherId real do Professor Titular
      let ownerTeacherId =
        matchedSecondDoc.ref.parent.parent?.id ||
        matchedSecondData.ownerTeacherId ||
        "default-teacher";

      if (ownerTeacherId === "default-teacher") {
        const tenantsSnap = await adminDb.collection("tenants").get();
        const realTenant = tenantsSnap.docs.find((t) => t.id !== "default-teacher");
        if (realTenant) {
          ownerTeacherId = realTenant.id;
          await matchedSecondDoc.ref.set({ ownerTeacherId }, { merge: true });
        }
      }

      // Busca o driveFolderUrl e escola do Tenant do Professor Titular para a Biblioteca de Arquivos
      const ownerTenantSnap = await adminDb.collection("tenants").doc(ownerTeacherId).get();
      const ownerTenantData = ownerTenantSnap.exists ? ownerTenantSnap.data() || {} : {};

      const sessionPayload: SessionPayload = {
        sub: matchedSecondDoc.id,
        role: "second_teacher",
        ownerTeacherId,
        email: cleanEmail,
        name: matchedSecondData.name || "2º Professor (AEE)",
        mustChangePassword: Boolean(matchedSecondData.mustChangePassword),
      };

      const token = await signSessionToken(sessionPayload, "7d");

      const response = NextResponse.json({
        user: {
          id: matchedSecondDoc.id,
          email: cleanEmail,
          name: matchedSecondData.name || "2º Professor (AEE)",
          subject: matchedSecondData.subject || "AEE / Inclusão Escolar",
          phone: matchedSecondData.phone || "",
          school: matchedSecondData.school || ownerTenantData.school || "EEB Prof. Jandira D'Ávila",
          driveFolderUrl: ownerTenantData.driveFolderUrl || "",
          avatarUrl:
            matchedSecondData.avatarUrl ||
            "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=250",
          role: "second_teacher",
          mustChangePassword: Boolean(matchedSecondData.mustChangePassword),
          ownerTeacherId,
        },
      });

      // Destrói o cookie 'session' do Firebase Auth diretamente no cabeçalho da resposta!
      response.cookies.set("session", "", { maxAge: 0, path: "/" });
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
        body: JSON.stringify({
          email: cleanEmail,
          password: cleanPassword,
          returnSecureToken: true,
        }),
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

    // Onboarding Silencioso (Gravação do Tenant no Firestore)
    const tenantRef = adminDb.collection("tenants").doc(uid);
    const tenantSnap = await tenantRef.get();

    let tenantData: any;
    if (!tenantSnap.exists) {
      tenantData = {
        name: isAdminSupremoEmail ? "Gilson Flores" : userEmail.split("@")[0],
        nome: isAdminSupremoEmail ? "Gilson Flores" : userEmail.split("@")[0],
        email: userEmail,
        plan_type: isAdminSupremoEmail ? "unlimited" : "basic",
        is_admin: isAdminSupremoEmail,
        subject: "Sociologia",
        school: "",
        escolas_vinculadas: [],
        disciplinas: [],
        created_at: new Date().toISOString(),
      };
      await tenantRef.set(tenantData);
    } else {
      tenantData = tenantSnap.data() || {};
      if (isAdminSupremoEmail && (!tenantData.is_admin || tenantData.plan_type !== "unlimited")) {
        tenantData.is_admin = true;
        tenantData.plan_type = "unlimited";
        await tenantRef.set({ is_admin: true, plan_type: "unlimited" }, { merge: true });
      }
    }

    const response = NextResponse.json({
      user: {
        id: uid,
        email: userEmail,
        name: tenantData.name || tenantData.nome || userEmail.split("@")[0],
        role: "teacher",
        tenant: tenantData,
      },
    });

    // Limpa eventual cookie JWT de aluno/2º professor e grava o cookie do Professor Titular
    clearSessionCookie(response);
    response.cookies.set("session", sessionCookie, {
      maxAge: expiresIn / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax",
    });

    return response;
  } catch (error: any) {
    console.error("[Login API] Erro fatal:", error);
    return NextResponse.json(
      { error: `Erro no Servidor: ${error.message || String(error)}` },
      { status: 500 }
    );
  }
}
