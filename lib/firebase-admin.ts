import * as admin from "firebase-admin";

// Inicialização segura para ambientes Serverless (como Vercel)
if (!admin.apps || admin.apps.length === 0) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // O replace é necessário para o Vercel lidar corretamente com as quebras de linha na chave privada
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
    : undefined;

  if (!projectId || !clientEmail || !privateKey) {
    console.warn(
      "[Firebase Admin] Aviso: Credenciais incompletas. Verifique as variáveis de ambiente FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY."
    );
  } else {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      console.log("[Firebase Admin] Inicializado com sucesso.");
    } catch (error) {
      console.error("[Firebase Admin] Erro durante a inicialização:", error);
    }
  }
}

// Exporta os serviços já inicializados
const adminAuth = admin.auth();
const adminDb = admin.firestore();

export { adminAuth, adminDb };
