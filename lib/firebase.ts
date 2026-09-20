import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth, setPersistence, browserSessionPersistence } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "dummy-api-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "localhost",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "kronomestre-app",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:000000000000:web:000000000000",
};

function getFirebaseClientApp(): FirebaseApp {
  if (getApps().length > 0) {
    return getApp();
  }
  return initializeApp(firebaseConfig);
}

export function getClientAuth(): Auth {
  const authInstance = getAuth(getFirebaseClientApp());
  // Configura persistência de sessão (limpa ao fechar a aba/navegador)
  setPersistence(authInstance, browserSessionPersistence).catch((err) => {
    console.warn("Erro ao definir persistência do Firebase Auth:", err);
  });
  return authInstance;
}

export function getClientDb(): Firestore {
  return getFirestore(getFirebaseClientApp());
}

export function getClientStorage(): FirebaseStorage {
  return getStorage(getFirebaseClientApp());
}

// Proxies or getters to ensure no module-level execution crash
export const app = {
  get instance() {
    return getFirebaseClientApp();
  },
};

export const auth = new Proxy({} as Auth, {
  get: (_, prop) => {
    const real = getClientAuth();
    const val = (real as any)[prop];
    return typeof val === 'function' ? val.bind(real) : val;
  },
});

export const db = new Proxy({} as Firestore, {
  get: (_, prop) => {
    const real = getClientDb();
    const val = (real as any)[prop];
    return typeof val === 'function' ? val.bind(real) : val;
  },
});

export const storage = new Proxy({} as FirebaseStorage, {
  get: (_, prop) => {
    const real = getClientStorage();
    const val = (real as any)[prop];
    return typeof val === 'function' ? val.bind(real) : val;
  },
});