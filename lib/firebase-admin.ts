import { initializeApp, getApps, getApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function cleanPrivateKey(key?: string) {
  if (!key) return undefined;
  let formattedKey = key.trim();
  // Se a chave veio com aspas duplas ou simples em volta, nós as removemos
  if (formattedKey.startsWith('"') && formattedKey.endsWith('"')) {
    formattedKey = formattedKey.slice(1, -1);
  } else if (formattedKey.startsWith("'") && formattedKey.endsWith("'")) {
    formattedKey = formattedKey.slice(1, -1);
  }
  // Força a conversão do texto "\n" para quebras de linha reais que o certificado exige
  return formattedKey.replace(/\\n/g, '\n');
}

function initializeFirebaseAdmin() {
  if (getApps().length > 0) {
    return getApp();
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = cleanPrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  if (!projectId || !clientEmail || !privateKey) {
    console.warn("[Firebase Admin] AVISO: Credenciais ausentes no .env.local");
    // Inicializa um app vazio apenas para não quebrar a compilação do Next.js
    return initializeApp({ projectId: "demo-project" });
  }

  try {
    return initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  } catch (error) {
    console.error("[Firebase Admin] Erro fatal no Certificado:", error);
    return initializeApp({ projectId: "demo-project" });
  }
}

const adminApp = initializeFirebaseAdmin();
const adminAuth = getAuth(adminApp);
const adminDb = getFirestore(adminApp);

export { adminAuth, adminDb };