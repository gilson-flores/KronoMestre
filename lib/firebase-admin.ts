import * as admin from "firebase-admin";

// Impede a inicialização duplicada no ambiente serverless (Next.js)
if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // O replace(/\\n/g, "\n") é crucial para a Vercel ler a chave corretamente
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
    : undefined;

  if (!projectId || !clientEmail || !privateKey) {
    console.warn("[Firebase Admin] Credenciais incompletas! Verifique as variáveis de ambiente na Vercel.");
  } else {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    console.log("[Firebase Admin] Inicializado com sucesso.");
  }
}

// Extrai as instâncias com segurança
const adminAuth = admin.auth();
const adminDb = admin.firestore();

export { adminAuth, adminDb };
