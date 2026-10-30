import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import {
  db,
  auth,
  handleFirestoreError,
  OperationType,
} from '../firebase';
import { SystemBackupSnapshot } from '../types';

/**
 * Strips `undefined` values recursively so Firestore never rejects an object payload.
 */
export function sanitizeForFirestore<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof obj === 'object') {
    const cleaned: Record<string, unknown> = {};
    Object.entries(obj as Record<string, unknown>).forEach(([key, val]) => {
      if (val !== undefined) {
        cleaned[key] = sanitizeForFirestore(val);
      }
    });
    return cleaned as T;
  }
  return obj;
}

/**
 * Persist a single document to Cloud Firestore if a Firebase Auth session is active.
 */
export async function syncDocToFirestore<T extends { id: string }>(
  collectionName: string,
  item: T
): Promise<boolean> {
  if (!auth.currentUser) return false;
  try {
    const cleanData = sanitizeForFirestore(item);
    await setDoc(doc(db, collectionName, item.id), cleanData as Record<string, unknown>, { merge: true });
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${collectionName}/${item.id}`);
    return false;
  }
}

/**
 * Delete a single document from Cloud Firestore if a Firebase Auth session is active.
 */
export async function removeDocFromFirestore(
  collectionName: string,
  docId: string
): Promise<boolean> {
  if (!auth.currentUser) return false;
  try {
    await deleteDoc(doc(db, collectionName, docId));
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${collectionName}/${docId}`);
    return false;
  }
}

/**
 * Batch-sync an array of documents into a Firestore collection (non-destructive merge).
 */
export async function syncCollectionBatch<T extends { id: string }>(
  collectionName: string,
  items: T[]
): Promise<{ syncedCount: number; error?: string }> {
  if (!auth.currentUser) {
    return { syncedCount: 0, error: 'Non authentifié sur Firebase Auth.' };
  }
  try {
    const chunkSize = 400;
    let total = 0;
    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      chunk.forEach((item) => {
        const ref = doc(db, collectionName, item.id);
        batch.set(ref, sanitizeForFirestore(item) as Record<string, unknown>, { merge: true });
      });
      await batch.commit();
      total += chunk.length;
    }
    return { syncedCount: total };
  } catch (err) {
    const info = handleFirestoreError(err, OperationType.WRITE, collectionName);
    return { syncedCount: 0, error: info.error };
  }
}

/**
 * Fetch all documents from a Firestore collection.
 */
export async function fetchCollectionFromFirestore<T>(
  collectionName: string
): Promise<T[] | null> {
  if (!auth.currentUser) return null;
  try {
    const snap = await getDocs(collection(db, collectionName));
    if (snap.empty) return [];
    return snap.docs.map((d) => d.data() as T);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, collectionName);
    return null;
  }
}

/**
 * Deterministic lightweight hash/checksum for backup integrity verification.
 */
export function computeBackupChecksum(payload: Record<string, unknown>): string {
  const str = JSON.stringify(payload);
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `EBM-SHA-${(hash >>> 0).toString(16).toUpperCase().padStart(8, '0')}`;
}

/**
 * Creates a complete, verified backup snapshot object from all SIS collections.
 */
export function buildSystemBackupSnapshot(
  collectionsMap: Record<string, unknown[]>,
  createdBy: string,
  label = 'Sauvegarde Complète SIS EBM Institute'
): SystemBackupSnapshot {
  let recordCount = 0;
  Object.values(collectionsMap).forEach((arr) => {
    if (Array.isArray(arr)) recordCount += arr.length;
  });

  const checksum = computeBackupChecksum(collectionsMap);
  return {
    id: `bkp-${Date.now()}`,
    version: 'SIS-EBM-4.0-PRODUCTION',
    createdAt: new Date().toISOString(),
    createdBy,
    label,
    checksum,
    recordCount,
    payload: collectionsMap,
  };
}
