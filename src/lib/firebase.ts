import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

console.log('Iniciando Firebase com Projeto:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Validação básica
const missingKeys = Object.entries(firebaseConfig)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

if (missingKeys.length > 0 && typeof window !== 'undefined') {
    console.error('Firebase Config: Faltando chaves:', missingKeys);
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

export function getFirebaseApp(): FirebaseApp | null {
    if (!app) {
        if (missingKeys.length > 0) {
            console.error(`Configuração do Firebase incompleta. Faltando: ${missingKeys.join(', ')}`);
            return null;
        }
        app = initializeApp(firebaseConfig);
    }
    return app;
}

export function getFirebaseAuth(): Auth | null {
    const firebaseApp = getFirebaseApp();
    if (!auth && firebaseApp) {
        auth = getAuth(firebaseApp);
    }
    return auth;
}

export function getFirebaseDb(): Firestore | null {
    const firebaseApp = getFirebaseApp();
    if (!db && firebaseApp) {
        db = getFirestore(firebaseApp);
    }
    return db;
}

export const APP_ID = firebaseConfig.projectId;