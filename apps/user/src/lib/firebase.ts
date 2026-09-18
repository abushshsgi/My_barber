import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";

/**
 * Firebase web config for mysaloon (project: mysaloon-4227d).
 * These values are public client keys — restrict by HTTP referrer in Firebase Console.
 * Override via VITE_FIREBASE_* in .env / Vercel when needed.
 */
const firebaseConfig = {
  apiKey:
    (import.meta.env.VITE_FIREBASE_API_KEY as string | undefined)?.trim() ||
    "AIzaSyCEeksXaBhTC7aI_eODARkkGCnmR6a4tJo",
  authDomain:
    (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined)?.trim() ||
    "mysaloon-4227d.firebaseapp.com",
  projectId:
    (import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined)?.trim() ||
    "mysaloon-4227d",
  storageBucket:
    (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined)?.trim() ||
    "mysaloon-4227d.firebasestorage.app",
  messagingSenderId:
    (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined)?.trim() ||
    "1080867624985",
  appId:
    (import.meta.env.VITE_FIREBASE_APP_ID as string | undefined)?.trim() ||
    "1:1080867624985:web:3bc55ba252fdf6aa933288",
};

let app: FirebaseApp | null = null;

/** Browser-only Firebase app. Safe to call during SSR — returns null. */
export function getFirebaseApp(): FirebaseApp | null {
  if (typeof window === "undefined") return null;
  if (app) return app;
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  return app;
}

/** Eager init for client boot (RootShell). No-op on server. */
export function initFirebase(): FirebaseApp | null {
  return getFirebaseApp();
}
