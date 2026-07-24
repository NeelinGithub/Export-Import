import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, User, onAuthStateChanged } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  experimentalForceLongPolling: true
}, (firebaseConfig as any).firestoreDatabaseId);

export const auth = getAuth(app);

let cachedAccessToken: string | null = null;
let isSigningIn = false;

// Request Workspace scopes
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/userinfo.email');

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      cachedAccessToken = credential.accessToken;
    }
    return { user: result.user, accessToken: cachedAccessToken || '' };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

let isFirestoreQuotaExceeded = false;

export function isQuotaExceeded(): boolean {
  return isFirestoreQuotaExceeded;
}

export function setQuotaExceeded(exceeded: boolean) {
  isFirestoreQuotaExceeded = exceeded;
}

// Standard Operational Types
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

// Error Context structure
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
  }
}

// Error Handler helper
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMsg = error instanceof Error ? error.message : String(error);
  
  // Check if this error is due to Firestore quota exhaustion
  const isQuota = errMsg.toLowerCase().includes('resource-exhausted') || 
    errMsg.toLowerCase().includes('quota') || 
    errMsg.toLowerCase().includes('limit exceeded');
    
  if (isQuota) {
    setQuotaExceeded(true);
    if (typeof window !== 'undefined') {
      // Dispatch a custom event to notify the UI to display a friendly warning
      window.dispatchEvent(new CustomEvent('firestore-quota-exceeded'));
      
      // Trigger Admin Email notification once per session
      if (!sessionStorage.getItem("quota_email_sent")) {
        sessionStorage.setItem("quota_email_sent", "true");
        fetch("/api/admin/notify-quota", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: auth.currentUser?.uid || "Anonymous",
            userEmail: auth.currentUser?.email || "Unknown",
            errorMessage: errMsg,
            time: new Date().toISOString()
          })
        }).catch(() => {}); // silent catch
      }
    }
  }

  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  if (isQuota) {
    console.warn('Firestore Quota Exhausted: ', errInfo.error);
  } else {
    console.error('Firestore Error: ', JSON.stringify(errInfo));
  }
}
