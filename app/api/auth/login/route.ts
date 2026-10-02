import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { verifyPassword } from "@/lib/crypto";
import { signSessionToken, setSessionCookie, clearSessionCookie, SessionPayload } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

// Novo Ícone SVG Base64 Moderno e Inclusivo (AEE)
const DEFAULT_INCLUSION_ICON = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNTYgMjU2Ij4KICA8ZGVmcz4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0iYmciIHgxPSIwIiB5MT0iMCIgeDI9IjI1NiIgeTI9IjI1NiI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiMxZTI5M2IiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjMGYxNzJhIi8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogICAgPGxpbmVhckdyYWRpZW50IGlkPSJwcmltYXJ5IiB4MT0iMCIgeTE9IjAiIHgyPSIyNTYiIHkyPSIyNTYiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjZjU5ZTBiIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iI2Q5NzcwNiIvPgogICAgPC9saW5lYXJHcmFkaWVudD4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0ic2Vjb25kYXJ5IiB4MT0iMCIgeTE9IjAiIHgyPSIyNTYiIHkyPSIyNTYiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjZmJiZjI0Ii8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iI2Y1OWUwYiIvPgogICAgPC9saW5lYXJHcmFkaWVudD4KICA8L2RlZnM+CiAgPHJlY3Qgd2lkdGg9IjI1NiIgaGVpZ2h0PSIyNTYiIGZpbGw9InVybCgjYmcpIi8+CiAgPHBhdGggZD0iTTQwIDEyOCBBIDg4IDg4IDAgMSAxIDIxNiAxMjggQSA4OCA4OCAwIDEgMSA0MCAxMjgiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZiYmYyNCIgc3Ryb2tlLXdpZHRoPSI0IiBzdHJva2UtZGFzaGFycmF5PSI4IDgiIG9wYWNpdHk9IjAuMTUiLz4KICA8Y2lyY2xlIGN4PSIxMDQiIGN5PSIxMDAiIHI9IjI4IiBmaWxsPSJ1cmwoI3ByaW1hcnkpIi8+CiAgPHBhdGggZD0iTTEwNCAxNDAgQzYwIDE0MCA0MCAxODAgMzIgMjMwIEwxNzYgMjMwIEMxNjggMTgwIDE0OCAxNDAgMTA0IDE0MCBaIiBmaWxsPSJ1cmwoI3ByaW1hcnkpIi8+CiAgPGNpcmNsZSBjeD0iMTY4IiBjeT0iMTMyIiByPSIyMiIgZmlsbD0idXJsKCNzZWNvbmRhcnkpIi8+CiAgPHBhdGggZD0iTTE2OCAxNjUgQzE0MCAxNjUgMTI1IDE5MCAxMjAgMjMwIEwyMTYgMjMwIEMyMTEgMTkwIDE5NiAxNjUgMTY4IDE2NSBaIiBmaWxsPSJ1cmwoI3NlY29uZGFyeSkiLz4KICA8cGF0aCBkPSJNMTgwIDUwIEwxODUgNzAgTDIwNSA3NSBMMTg1IDgwIEwxODAgMTAwIEwxNzUgODAgTDE1NSA3NSBMMTc1IDcwIFoiIGZpbGw9IiNmY2QzNGQiIG9wYWNpdHk9IjAuOSIvPgogIDxjaXJjbGUgY3g9IjcwIiBjeT0iNzAiIHI9IjYiIGZpbGw9IiNmYmJmMjQiIG9wYWNpdHk9IjAuNiIvPgo8L3N2Zz4=';

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

      // Substitui a foto antiga do Unsplash pelo novo ícone!
      let finalAvatar = matchedSecondData.avatarUrl || DEFAULT_INCLUSION_ICON;
      if (finalAvatar.includes("photo-1573496359142")) {
        finalAvatar = DEFAULT_INCLUSION_ICON;
      }

      const response = NextResponse.json({
        user: {
          id: matchedSecondDoc.id,
          email: cleanEmail,
          name: matchedSecondData.name || "2º Professor (AEE)",
          subject: matchedSecondData.subject || "AEE / Inclusão Escolar",
          phone: matchedSecondData.phone || "",
          school: matchedSecondData.school || ownerTenantData.school || "EEB Prof. Jandira D'Ávila",
          driveFolderUrl: ownerTenantData.driveFolderUrl || "",
          avatarUrl: finalAvatar,
          role: "second_teacher",
          mustChangePassword: Boolean(matchedSecondData.mustChangePassword),
          ownerTeacherId,
        },
      });

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
    const expiresIn = 60 * 60 * 24 * 5 * 1000;
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

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