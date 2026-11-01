import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  writeBatch,
  onSnapshot,
  runTransaction,
  deleteField,
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { SystemBackupSnapshot, User } from '../types';

// Complete list of all 28 SIS collections synchronized with Cloud Firestore
export const ALL_SYNC_COLLECTIONS = [
  'users',
  'academicYears',
  'filieres',
  'parcours',
  'academicRules',
  'groups',
  'rooms',
  'courses',
  'ues',
  'ecs',
  'inscriptions',
  'grades',
  'deliberations',
  'sessions',
  'qrSessions',
  'fees',
  'payments',
  'cashDays',
  'homework',
  'submissions',
  'learningResources',
  'internalMessages',
  'groupPosts',
  'notifications',
  'customRoles',
  'profileChangeRequests',
  'auditLogs',
  'chatMessages',
] as const;

export type SyncCollectionName = (typeof ALL_SYNC_COLLECTIONS)[number];

const TOMBSTONES_STORAGE_KEY = 'ebm_deleted_tombstones_v3';
const OUTBOX_STORAGE_KEY = 'ebm_sync_outbox_v3';
const SEED_BASELINE_TIMESTAMP = '2026-01-01T00:00:00.000Z';
const BOOTSTRAPPED_ADMIN_EMAIL = 'louvamifaly@gmail.com';

export interface OutboxMutation {
  id: string;
  collectionName: string;
  docId: string;
  operation: 'UPSERT' | 'DELETE';
  payload?: Record<string, unknown>;
  baseUpdatedAt?: string;
  queuedAt: string;
}

// ============================================================================
// 1. PERSISTENT DELETION TOMBSTONES (Prevents deleted items from reappearing)
// ============================================================================

export const getDeletedTombstones = (): Set<string> => {
  try {
    const raw = localStorage.getItem(TOMBSTONES_STORAGE_KEY);
    if (!raw) return new Set<string>();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set<string>(parsed.filter((x) => typeof x === 'string')) : new Set<string>();
  } catch {
    return new Set<string>();
  }
};

const saveDeletedTombstones = (tombstones: Set<string>): void => {
  try {
    localStorage.setItem(TOMBSTONES_STORAGE_KEY, JSON.stringify(Array.from(tombstones)));
  } catch {
    // Ignore storage quota errors
  }
};

export const recordDeletedTombstone = (collectionName: string, docId: string): Set<string> => {
  const current = getDeletedTombstones();
  current.add(docId);
  current.add(`${collectionName}:${docId}`);
  saveDeletedTombstones(current);

  if (hasValidRealFirebaseAuth()) {
    const tombstoneRef = doc(db, 'appSettings', 'deleted_tombstones');
    setDoc(
      tombstoneRef,
      {
        id: 'deleted_tombstones',
        ids: Array.from(current),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    ).catch(() => {});
  }
  return current;
};

export const clearDeletedTombstones = (): void => {
  try {
    localStorage.removeItem(TOMBSTONES_STORAGE_KEY);
  } catch {
    // Ignore
  }
};

export const pullRemoteTombstones = async (): Promise<Set<string>> => {
  const local = getDeletedTombstones();
  if (!hasValidRealFirebaseAuth()) return local;
  try {
    const snap = await getDoc(doc(db, 'appSettings', 'deleted_tombstones'));
    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data?.ids)) {
        data.ids.forEach((id: unknown) => {
          if (typeof id === 'string') local.add(id);
        });
        saveDeletedTombstones(local);
      }
    }
  } catch {
    // Ignore read error when offline
  }
  return local;
};

// ============================================================================
// 2. PERSISTENT OFFLINE MUTATION OUTBOX (Prevents stale seed overwrites)
// ============================================================================

export const getPendingOutbox = (): OutboxMutation[] => {
  try {
    const raw = localStorage.getItem(OUTBOX_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const savePendingOutbox = (queue: OutboxMutation[]): void => {
  try {
    localStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(queue.slice(-500)));
  } catch {
    // Ignore quota errors
  }
};

export const enqueueSyncOutbox = (mutation: Omit<OutboxMutation, 'id' | 'queuedAt'>): void => {
  const queue = getPendingOutbox().filter(
    (m) => !(m.collectionName === mutation.collectionName && m.docId === mutation.docId)
  );
  queue.push({
    ...mutation,
    id: `${mutation.collectionName}:${mutation.docId}:${Date.now()}`,
    queuedAt: new Date().toISOString(),
  });
  savePendingOutbox(queue);
};

export const clearOutboxEntry = (collectionName: string, docId: string): void => {
  const queue = getPendingOutbox().filter(
    (m) => !(m.collectionName === collectionName && m.docId === docId)
  );
  savePendingOutbox(queue);
};

// ============================================================================
// 3. REAL FIREBASE AUTHENTICATION (Zero Anonymous Auth / Zero Self-Escalation)
// ============================================================================

export const hasValidRealFirebaseAuth = (): boolean => {
  const user = auth.currentUser;
  return Boolean(user && !user.isAnonymous);
};

let authSessionPromise: Promise<boolean> | null = null;

/**
 * Verifies that a real, non-anonymous Firebase Authentication session is active.
 *
 * SECURITY FIX:
 * - Never calls `signInAnonymously(auth)`.
 * - Never allows a client to self-assign or overwrite `role` in `/users/{uid}`.
 * - Only the verified bootstrapped super-admin (`louvamifaly@gmail.com`) can
 *   bootstrap their own `ADMIN` profile document if it does not yet exist.
 * - For all other authenticated users, their `/users/{uid}` role must be
 *   provisioned by an administrator (`isAdmin()` or `isScolarite()`).
 */
export const ensureFirebaseAuthSession = async (activeSisUser?: User | null): Promise<boolean> => {
  const currentFbUser = auth.currentUser;

  // Reject and sign out any residual anonymous session immediately
  if (currentFbUser && currentFbUser.isAnonymous) {
    await signOut(auth).catch(() => {});
    return false;
  }

  if (!currentFbUser) {
    return false;
  }

  if (authSessionPromise) {
    return authSessionPromise;
  }

  authSessionPromise = (async () => {
    try {
      const uid = currentFbUser.uid;
      const email = (currentFbUser.email || '').toLowerCase();
      const userRef = doc(db, 'users', uid);

      // Verified bootstrapped super-admin can always initialize or refresh their ADMIN profile
      if (email === BOOTSTRAPPED_ADMIN_EMAIL && currentFbUser.emailVerified) {
        await setDoc(
          userRef,
          {
            id: uid,
            uid,
            sisUserId: activeSisUser?.id || 'user-admin',
            username: activeSisUser?.username || 'admin.ebm',
            name: activeSisUser?.name || currentFbUser.displayName || 'Administrateur EBM',
            email: currentFbUser.email,
            googleEmail: currentFbUser.email,
            role: 'ADMIN',
            isActive: true,
            lastSeenAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
        return true;
      }

      const existingSnap = await getDoc(userRef);

      if (existingSnap.exists()) {
        // Profile already exists: only update non-privileged metadata (never touch role or isActive)
        await setDoc(
          userRef,
          {
            lastSeenAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
        return true;
      }

      // Non-admin user without an admin-provisioned /users/{uid} profile cannot self-assign a role
      return false;
    } catch {
      return false;
    } finally {
      authSessionPromise = null;
    }
  })();

  return authSessionPromise;
};

// ============================================================================
// 4. SANITIZATION & MERGE HELPERS
// ============================================================================

const SENSITIVE_LOCAL_ONLY_KEYS = new Set(['passwordHash']);

export const sanitizeForFirestore = <T>(
  obj: T,
  previousObj?: Record<string, unknown>
): T => {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (SENSITIVE_LOCAL_ONLY_KEYS.has(key)) {
        continue;
      }
      if (value === undefined) {
        if (previousObj && key in previousObj) {
          cleaned[key] = deleteField();
        }
      } else {
        cleaned[key] = sanitizeForFirestore(value);
      }
    }
    return cleaned as T;
  }
  return obj;
};

const mergeArrayById = <itemT extends { id?: string }>(
  arrA: itemT[] = [],
  arrB: itemT[] = []
): itemT[] => {
  const map = new Map<string, itemT>();
  for (const item of arrA) {
    if (item && item.id) map.set(item.id, item);
  }
  for (const item of arrB) {
    if (item && item.id) map.set(item.id, item);
  }
  return Array.from(map.values());
};

/**
 * Merges two entity records (e.g., TimetableSession or QrAttendanceSession),
 * preserving combined `history` and `records` arrays so simultaneous edits
 * never lose audit history or student attendance scans.
 */
export const mergeEntityFields = <T extends { id: string }>(
  olderItem: T,
  newerItem: T
): T => {
  const olderAny = olderItem as Record<string, unknown>;
  const newerAny = newerItem as Record<string, unknown>;
  const merged: Record<string, unknown> = {
    ...olderAny,
    ...newerAny,
  };

  if (Array.isArray(olderAny.history) && Array.isArray(newerAny.history)) {
    const combinedHistory = mergeArrayById(
      olderAny.history as Array<{ id?: string; timestamp?: string }>,
      newerAny.history as Array<{ id?: string; timestamp?: string }>
    );
    combinedHistory.sort((a, b) =>
      String(b.timestamp || '').localeCompare(String(a.timestamp || ''))
    );
    merged.history = combinedHistory;
  }

  if (Array.isArray(olderAny.records) && Array.isArray(newerAny.records)) {
    merged.records = mergeArrayById(
      olderAny.records as Array<{ id?: string }>,
      newerAny.records as Array<{ id?: string }>
    );
  }

  return merged as T;
};

// ============================================================================
// 5. TRANSACTIONAL SINGLE-DOCUMENT SYNC (Optimistic Concurrency Control)
// ============================================================================

export interface SyncDocResult<T = Record<string, unknown>> {
  synced: boolean;
  queuedOffline?: boolean;
  conflictDetected?: boolean;
  remoteItem?: T;
  error?: string;
}

/**
 * Synchronizes a single document to Firestore using a transaction when updating
 * existing records (`sessions`, `grades`, `qrSessions`, etc.) so simultaneous
 * edits on two computers are detected and reconciled instead of silently
 * overwriting one another.
 */
export const syncDocToFirestore = async <
  T extends { id: string; updatedAt?: string; lastModifiedAt?: string }
>(
  collectionName: string,
  item: T,
  options?: {
    previousItem?: Record<string, unknown>;
    baseUpdatedAt?: string;
    onConflict?: (remoteItem: T, mergedItem: T) => void;
  }
): Promise<SyncDocResult<T>> => {
  const nowIso = new Date().toISOString();
  const baseUpdatedAt = options?.baseUpdatedAt || item.updatedAt || item.lastModifiedAt;

  // If the user is not connected to real Firebase Auth or browser is offline,
  // queue the mutation in the persistent outbox so it syncs upon reconnection.
  if (!hasValidRealFirebaseAuth() || (typeof navigator !== 'undefined' && !navigator.onLine)) {
    const cleanOfflinePayload = sanitizeForFirestore({
      ...item,
      updatedAt: item.updatedAt || nowIso,
    }) as unknown as Record<string, unknown>;
    enqueueSyncOutbox({
      collectionName,
      docId: item.id,
      operation: 'UPSERT',
      payload: cleanOfflinePayload,
      baseUpdatedAt,
    });
    return { synced: false, queuedOffline: true };
  }

  const path = `${collectionName}/${item.id}`;
  const docRef = doc(db, collectionName, item.id);

  try {
    let conflictDetected = false;
    let resolvedItem: T = { ...item, updatedAt: nowIso };
    let remoteSnapshotItem: T | undefined;

    await runTransaction(db, async (transaction) => {
      const serverSnap = await transaction.get(docRef);
      if (serverSnap.exists()) {
        const serverData = serverSnap.data() as T & { updatedAt?: string; lastModifiedAt?: string };
        const serverTime = serverData.updatedAt || serverData.lastModifiedAt || '';

        // Detect concurrent modification if server was updated after our baseUpdatedAt
        if (baseUpdatedAt && serverTime && serverTime > baseUpdatedAt && serverTime !== item.updatedAt) {
          conflictDetected = true;
          remoteSnapshotItem = serverData;
          // Merge arrays (history, records) while preserving non-conflicting fields
          resolvedItem = mergeEntityFields(serverData, {
            ...item,
            updatedAt: nowIso,
          });
        } else {
          resolvedItem = mergeEntityFields(serverData, {
            ...item,
            updatedAt: nowIso,
          });
        }
      }

      const cleanData = sanitizeForFirestore(
        resolvedItem,
        options?.previousItem
      ) as Record<string, unknown>;
      transaction.set(docRef, cleanData, { merge: true });
    });

    clearOutboxEntry(collectionName, item.id);

    if (conflictDetected && remoteSnapshotItem && options?.onConflict) {
      options.onConflict(remoteSnapshotItem, resolvedItem);
    }

    return {
      synced: true,
      conflictDetected,
      remoteItem: remoteSnapshotItem,
    };
  } catch (err) {
    // Queue in outbox if network error occurred
    const cleanPayload = sanitizeForFirestore({
      ...item,
      updatedAt: item.updatedAt || nowIso,
    }) as unknown as Record<string, unknown>;
    enqueueSyncOutbox({
      collectionName,
      docId: item.id,
      operation: 'UPSERT',
      payload: cleanPayload,
      baseUpdatedAt,
    });
    const info = handleFirestoreError(err, OperationType.WRITE, path);
    return { synced: false, error: info.error };
  }
};

/**
 * Deletes a single document from Firestore and records a persistent tombstone
 * so subsequent syncs or page reloads never resurrect the deleted record.
 */
export const removeDocFromFirestore = async (
  collectionName: string,
  docId: string
): Promise<boolean> => {
  recordDeletedTombstone(collectionName, docId);

  if (!hasValidRealFirebaseAuth() || (typeof navigator !== 'undefined' && !navigator.onLine)) {
    enqueueSyncOutbox({
      collectionName,
      docId,
      operation: 'DELETE',
    });
    return false;
  }

  const path = `${collectionName}/${docId}`;
  try {
    await deleteDoc(doc(db, collectionName, docId));
    clearOutboxEntry(collectionName, docId);
    return true;
  } catch (err) {
    enqueueSyncOutbox({
      collectionName,
      docId,
      operation: 'DELETE',
    });
    handleFirestoreError(err, OperationType.DELETE, path);
    return false;
  }
};

/**
 * Flushes only the genuine local mutations queued while offline, preventing
 * stale seed data from overwriting newer remote documents on reconnect.
 */
export const flushPendingSyncOutbox = async (): Promise<{
  flushed: number;
  conflicts: number;
}> => {
  if (!hasValidRealFirebaseAuth() || (typeof navigator !== 'undefined' && !navigator.onLine)) {
    return { flushed: 0, conflicts: 0 };
  }

  const queue = getPendingOutbox();
  if (queue.length === 0) {
    return { flushed: 0, conflicts: 0 };
  }

  let flushed = 0;
  let conflicts = 0;

  for (const entry of queue) {
    if (entry.operation === 'DELETE') {
      const ok = await removeDocFromFirestore(entry.collectionName, entry.docId);
      if (ok) flushed++;
    } else if (entry.operation === 'UPSERT' && entry.payload) {
      const item = entry.payload as { id: string; updatedAt?: string };
      const res = await syncDocToFirestore(entry.collectionName, item, {
        baseUpdatedAt: entry.baseUpdatedAt,
      });
      if (res.synced) {
        flushed++;
        if (res.conflictDetected) conflicts++;
      }
    }
  }

  return { flushed, conflicts };
};

// ============================================================================
// 6. SAFE BATCH SYNCHRONIZATION (Never overwrites newer remote documents)
// ============================================================================

export const syncCollectionBatch = async <
  T extends { id: string; updatedAt?: string; lastModifiedAt?: string }
>(
  collectionName: string,
  items: T[]
): Promise<{ syncedCount: number; error?: string }> => {
  if (!items || items.length === 0) return { syncedCount: 0 };
  if (!hasValidRealFirebaseAuth()) {
    return { syncedCount: 0, error: 'Authentification Firebase vérifiée requise.' };
  }

  try {
    const tombstones = await pullRemoteTombstones();
    const existingSnap = await getDocs(collection(db, collectionName));
    const remoteTimestamps = new Map<string, string>();
    existingSnap.docs.forEach((d) => {
      const data = d.data() as { updatedAt?: string; lastModifiedAt?: string };
      remoteTimestamps.set(d.id, data.updatedAt || data.lastModifiedAt || '');
    });

    const CHUNK_SIZE = 400;
    let totalSynced = 0;

    // Filter out tombstoned items and items where the remote document is newer
    const eligibleItems = items.filter((item) => {
      if (tombstones.has(item.id) || tombstones.has(`${collectionName}:${item.id}`)) {
        return false;
      }
      const localTime = item.updatedAt || item.lastModifiedAt || SEED_BASELINE_TIMESTAMP;
      const remoteTime = remoteTimestamps.get(item.id);
      if (remoteTime && remoteTime > localTime) {
        // Remote document is newer: do NOT overwrite with stale local state
        return false;
      }
      return true;
    });

    for (let i = 0; i < eligibleItems.length; i += CHUNK_SIZE) {
      const chunk = eligibleItems.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach((item) => {
        const ref = doc(db, collectionName, item.id);
        // Preserve existing timestamp or assign baseline seed timestamp (never stamp seed data with now!)
        const cleanData = sanitizeForFirestore({
          ...item,
          updatedAt: item.updatedAt || item.lastModifiedAt || SEED_BASELINE_TIMESTAMP,
        });
        batch.set(ref, cleanData as Record<string, unknown>, { merge: true });
      });
      await batch.commit();
      totalSynced += chunk.length;
    }
    return { syncedCount: totalSynced };
  } catch (err) {
    const info = handleFirestoreError(err, OperationType.WRITE, collectionName);
    return { syncedCount: 0, error: info.error };
  }
};

export const fetchCollectionFromFirestore = async <T>(
  collectionName: string
): Promise<{ data: T[] | null; error?: string; isQuotaExceeded?: boolean }> => {
  if (!hasValidRealFirebaseAuth()) {
    return { data: null };
  }
  try {
    const snapshot = await getDocs(collection(db, collectionName));
    if (snapshot.empty) return { data: [] };
    const tombstones = getDeletedTombstones();
    const docs = snapshot.docs
      .map((d) => d.data() as T & { id?: string })
      .filter((item) => !item.id || (!tombstones.has(item.id) && !tombstones.has(`${collectionName}:${item.id}`)));
    return { data: docs };
  } catch (err) {
    const info = handleFirestoreError(err, OperationType.LIST, collectionName);
    return { data: null, error: info.error, isQuotaExceeded: info.isQuotaExceeded };
  }
};

/**
 * Merges remote Firestore records with local records by `id`.
 * - Respects persistent deletion tombstones so deleted items never resurrect.
 * - Compares `updatedAt` / `lastModifiedAt` timestamps so newer versions win.
 * - Merges `history` and `records` arrays on sessions/attendance so concurrent
 *   edits never drop audit entries.
 */
export const mergeCollectionById = <
  T extends { id: string; updatedAt?: string; lastModifiedAt?: string }
>(
  localItems: T[],
  remoteItems: T[],
  deletedIds?: Set<string>,
  collectionName?: string
): T[] => {
  const persistentTombstones = getDeletedTombstones();
  const isDeleted = (id: string) =>
    Boolean(
      deletedIds?.has(id) ||
        persistentTombstones.has(id) ||
        (collectionName && persistentTombstones.has(`${collectionName}:${id}`))
    );

  const mergedMap = new Map<string, T>();
  for (const item of localItems) {
    if (item && item.id && !isDeleted(item.id)) {
      mergedMap.set(item.id, item);
    }
  }
  for (const remoteItem of remoteItems) {
    if (remoteItem && remoteItem.id && !isDeleted(remoteItem.id)) {
      const existingLocal = mergedMap.get(remoteItem.id);
      if (!existingLocal) {
        mergedMap.set(remoteItem.id, remoteItem);
      } else {
        const localTime = existingLocal.updatedAt || existingLocal.lastModifiedAt || '';
        const remoteTime = remoteItem.updatedAt || remoteItem.lastModifiedAt || '';
        if (localTime && remoteTime) {
          if (remoteTime >= localTime) {
            mergedMap.set(remoteItem.id, mergeEntityFields(existingLocal, remoteItem));
          } else {
            mergedMap.set(remoteItem.id, mergeEntityFields(remoteItem, existingLocal));
          }
        } else if (remoteTime && !localTime) {
          mergedMap.set(remoteItem.id, mergeEntityFields(existingLocal, remoteItem));
        } else if (localTime && !remoteTime) {
          mergedMap.set(remoteItem.id, mergeEntityFields(remoteItem, existingLocal));
        } else {
          mergedMap.set(remoteItem.id, mergeEntityFields(existingLocal, remoteItem));
        }
      }
    }
  }
  return Array.from(mergedMap.values());
};

/**
 * Real-time listener for a Firestore collection.
 */
export const subscribeToFirestoreCollection = <T>(
  collectionName: string,
  onUpdate: (items: T[], removedIds: string[]) => void,
  onErrorCallback?: (info: { error: string; isQuotaExceeded?: boolean }) => void
): (() => void) => {
  if (!hasValidRealFirebaseAuth()) {
    return () => {};
  }
  try {
    const colRef = collection(db, collectionName);
    return onSnapshot(
      colRef,
      (snapshot) => {
        const removedIds: string[] = [];
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'removed') {
            removedIds.push(change.doc.id);
            recordDeletedTombstone(collectionName, change.doc.id);
          }
        });
        const tombstones = getDeletedTombstones();
        const items = snapshot.docs
          .map((d) => d.data() as T & { id?: string })
          .filter(
            (item) =>
              !item.id ||
              (!tombstones.has(item.id) && !tombstones.has(`${collectionName}:${item.id}`))
          );
        if (items.length > 0 || removedIds.length > 0) {
          onUpdate(items, removedIds);
        }
      },
      (err) => {
        const info = handleFirestoreError(err, OperationType.GET, collectionName);
        if (onErrorCallback) {
          onErrorCallback({ error: info.error, isQuotaExceeded: info.isQuotaExceeded });
        }
      }
    );
  } catch {
    return () => {};
  }
};

// ============================================================================
// 7. SYSTEM BACKUP SNAPSHOTS & INTEGRITY VERIFICATION
// ============================================================================

export const computeBackupChecksum = (payload: unknown): string => {
  const str = JSON.stringify(payload);
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `EBM-SHA-${(hash >>> 0).toString(16).toUpperCase().padStart(8, '0')}`;
};

const VALID_ROLES = new Set([
  'ADMIN',
  'SCOLARITE',
  'SCHEDULER',
  'ADMIN_STAFF',
  'FINANCE',
  'ACADEMIC_HEAD',
  'TEACHER',
  'STUDENT',
  'PARENT',
]);

export const verifyBackupSnapshotIntegrity = (
  snapshot: unknown
): { valid: boolean; error?: string } => {
  if (!snapshot || typeof snapshot !== 'object') {
    return { valid: false, error: 'Structure JSON invalide.' };
  }
  const s = snapshot as Partial<SystemBackupSnapshot>;
  if (!s.id || !s.version || !s.checksum || !s.payload || typeof s.payload !== 'object') {
    return {
      valid: false,
      error: 'Champs de métadonnées ou payload manquants dans la sauvegarde.',
    };
  }

  const expectedChecksum = computeBackupChecksum(s.payload);
  if (s.checksum !== expectedChecksum) {
    return {
      valid: false,
      error: `Échec du contrôle d'intégrité (Checksum attendu: ${expectedChecksum}, reçu: ${s.checksum}). Le fichier a été altéré.`,
    };
  }

  const p = s.payload as Record<string, unknown>;
  if (p.users !== undefined) {
    if (!Array.isArray(p.users)) {
      return { valid: false, error: 'La collection "users" doit être un tableau valide.' };
    }
    const hasInvalidUser = p.users.some((u: unknown) => {
      if (!u || typeof u !== 'object') return true;
      const usr = u as Record<string, unknown>;
      return typeof usr.id !== 'string' || typeof usr.role !== 'string' || !VALID_ROLES.has(usr.role);
    });
    if (hasInvalidUser) {
      return {
        valid: false,
        error: 'Contenu invalide : un ou plusieurs comptes utilisateurs ont un rôle ou identifiant corrompu.',
      };
    }
  }

  return { valid: true };
};

export const buildSystemBackupSnapshot = (
  collectionsData: Record<string, unknown[]>,
  authorName: string,
  label = 'Sauvegarde Complète SIS EBM'
): SystemBackupSnapshot => {
  let totalRecords = 0;
  Object.values(collectionsData).forEach((arr) => {
    if (Array.isArray(arr)) totalRecords += arr.length;
  });

  const checksum = computeBackupChecksum(collectionsData);
  return {
    id: `bkp-${Date.now()}`,
    version: 'SIS-v3.5-LMD',
    createdAt: new Date().toISOString(),
    createdBy: authorName,
    label,
    checksum,
    recordCount: totalRecords,
    payload: collectionsData as SystemBackupSnapshot['payload'],
  };
};

export const downloadBackupJsonFile = (snapshot: SystemBackupSnapshot) => {
  const jsonString = JSON.stringify(snapshot, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const datePart = snapshot.createdAt.slice(0, 10);
  link.href = url;
  link.download = `EBM_SIS_BACKUP_${datePart}_${snapshot.checksum}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
