import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  initializeFirestore,
  doc,
  getDocFromServer,
} from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getDatabase, Database } from 'firebase/database';
import { getMessaging, isSupported as isMessagingSupported, Messaging } from 'firebase/messaging';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase SDK
export const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore with the provisioned database ID and ignoreUndefinedProperties
export const db = initializeFirestore(
  app,
  { ignoreUndefinedProperties: true },
  firebaseConfig.firestoreDatabaseId
);

// Initialize Firebase Authentication
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Firebase Storage for secure chat attachments
export const storage: FirebaseStorage = getStorage(app);

// Lazy initializer for Firebase Realtime Database (presence & typing indicators)
let rtdbInstance: Database | null | undefined;
export function getRealtimeDb(): Database | null {
  if (rtdbInstance !== undefined) return rtdbInstance;
  try {
    const cfg = firebaseConfig as Record<string, string | undefined>;
    const dbUrl = cfg.databaseURL;
    if (!dbUrl) {
      rtdbInstance = null;
      return null;
    }
    rtdbInstance = getDatabase(app, dbUrl);
    return rtdbInstance;
  } catch {
    rtdbInstance = null;
    return null;
  }
}

// Lazy initializer for Firebase Cloud Messaging (push notifications)
let messagingPromise: Promise<Messaging | null> | null = null;
export function getFirebaseMessaging(): Promise<Messaging | null> {
  if (!messagingPromise) {
    messagingPromise = isMessagingSupported()
      .then((supported) => (supported ? getMessaging(app) : null))
      .catch(() => null);
  }
  return messagingPromise;
}

export {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
};
export type { FirebaseUser };

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
  isQuotaExceeded?: boolean;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): FirestoreErrorInfo {
  const rawMsg = error instanceof Error ? error.message : String(error);
  const isQuotaExceeded =
    rawMsg.toLowerCase().includes('quota exceeded') ||
    rawMsg.toLowerCase().includes('resource-exhausted');

  const errInfo: FirestoreErrorInfo = {
    error: rawMsg,
    isQuotaExceeded,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData.map((provider) => ({
          providerId: provider.providerId,
          displayName: provider.displayName,
          email: provider.email,
          photoUrl: provider.photoURL,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}

/**
 * Probes Cloud Firestore connectivity accurately without masking quota or network errors (P59).
 */
export async function testFirestoreConnection(): Promise<{
  connected: boolean;
  quotaExceeded?: boolean;
  message: string;
}> {
  try {
    await getDocFromServer(doc(db, 'appSettings', 'connection_probe'));
    return {
      connected: true,
      message: `Connecté en temps réel à Cloud Firestore (${firebaseConfig.projectId})`,
    };
  } catch (error) {
    const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();

    if (msg.includes('quota exceeded') || msg.includes('resource-exhausted')) {
      return {
        connected: false,
        quotaExceeded: true,
        message:
          'Quota journalier gratuit Cloud Firestore atteint (réinitialisation automatique à minuit heure du Pacifique / 10h00 heure de Madagascar). Le mode local prend le relais sans perte de données.',
      };
    }

    if (
      msg.includes('the client is offline') ||
      msg.includes('unavailable') ||
      msg.includes('network-request-failed') ||
      msg.includes('failed to get document')
    ) {
      return {
        connected: false,
        message: 'Le client Firestore est hors-ligne ou le réseau est indisponible.',
      };
    }

    // When unauthenticated, a permission-denied response from the server confirms the Firestore instance is reachable
    if (msg.includes('permission-denied') || msg.includes('missing or insufficient permissions')) {
      if (!auth.currentUser) {
        return {
          connected: true,
          message: `Base Cloud Firestore en ligne et protégée par règles de sécurité (${firebaseConfig.projectId})`,
        };
      }
      return {
        connected: false,
        message: `Permissions Firestore insuffisantes pour le compte actuel (${firebaseConfig.projectId}).`,
      };
    }

    return {
      connected: false,
      message: `Erreur de connexion Firestore : ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
