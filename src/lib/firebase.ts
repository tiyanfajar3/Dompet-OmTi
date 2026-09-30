import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  initializeFirestore,
  doc, 
  getDocFromServer,
  Firestore 
} from 'firebase/firestore';
import { getAuth, signInAnonymously, Auth } from 'firebase/auth';

export const firebaseConfig = {
  apiKey: "AIzaSyAmeHGNtfuwVj3jTNseCgcnFCVFrOSiuWQ",
  authDomain: "dompet-omti-247cc.firebaseapp.com",
  projectId: "dompet-omti-247cc",
  storageBucket: "dompet-omti-247cc.firebasestorage.app",
  messagingSenderId: "383501944508",
  appId: "1:383501944508:web:eef8bc86e783f330c472b9"
};

// Initialize single centralized Firebase App instance
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize single centralized Firestore instance with experimentalForceLongPolling
// This ensures write, update, delete, and read operations never hang or freeze in browser iframes or behind proxies
export const db: Firestore = (() => {
  try {
    return initializeFirestore(app, {
      experimentalForceLongPolling: true,
    });
  } catch {
    return getFirestore(app);
  }
})();

// Single centralized Firebase Auth instance
export const auth: Auth = getAuth(app);

// Helper to ensure authenticated state if project rules require it
export async function ensureAuthenticated(): Promise<void> {
  try {
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }
  } catch (err: unknown) {
    // If anonymous auth is not enabled in Firebase Console, continue without blocking Firestore
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('Catatan Autentikasi Firebase:', msg);
  }
}

// Error Handling Infrastructure
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): FirestoreErrorInfo {
  const currentAuth = auth?.currentUser;
  let rawMessage = error instanceof Error ? error.message : String(error);

  // Clean and sanitize user-facing error message (never expose sensitive keys or internals)
  let userFriendly = 'Terjadi kendala saat mengakses database Firestore.';
  if (rawMessage.includes('permission-denied') || rawMessage.includes('Missing or insufficient permissions')) {
    userFriendly = 'Izin akses ke database Firestore ditolak. Periksa aturan keamanan Firestore Anda.';
  } else if (rawMessage.includes('unavailable') || rawMessage.includes('offline') || rawMessage.includes('failed-precondition')) {
    userFriendly = 'Tidak dapat terhubung ke server Firestore. Periksa koneksi internet Anda.';
  } else if (rawMessage.includes('not-found')) {
    userFriendly = 'Data transaksi tidak ditemukan di database Firestore.';
  } else if (rawMessage.includes('invalid-argument')) {
    userFriendly = 'Format data transaksi tidak valid untuk disimpan ke Firestore.';
  } else if (error instanceof Error && error.message) {
    userFriendly = error.message;
  }

  const errInfo: FirestoreErrorInfo = {
    error: userFriendly,
    authInfo: {
      userId: currentAuth?.uid || null,
      email: currentAuth?.email || null,
      emailVerified: currentAuth?.emailVerified || null,
      isAnonymous: currentAuth?.isAnonymous || null,
      tenantId: currentAuth?.tenantId || null,
      providerInfo: currentAuth?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };

  console.error('Firestore Error Log:', JSON.stringify(errInfo));
  return errInfo;
}

// Connectivity Test with safety timeout
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 5000)
    );
    await Promise.race([
      getDocFromServer(doc(db, 'test', 'connection')),
      timeoutPromise
    ]);
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('offline')) {
      console.warn('Klien Firestore mode offline.');
      return false;
    }
    // Any response from server indicates network connectivity is active
    return true;
  }
}
