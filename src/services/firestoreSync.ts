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
import { SystemBackupSnapshot, TimetableSession, User } from '../types';

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
  'conversations',
  'sessionPrivateReports',
] as const;

export type SyncCollectionName = (typeof ALL_SYNC_COLLECTIONS)[number];

const TOMBSTONES_STORAGE_KEY = 'ebm_deleted_tombstones_v3';
const OUTBOX_STORAGE_KEY = 'ebm_sync_outbox_v3';
const CLOUD_BRIDGE_LOCAL_KEY = 'ebm_cloud_bridge_active_v3';
const SEED_BASELINE_TIMESTAMP = '2026-01-01T00:00:00.000Z';
const BOOTSTRAPPED_ADMIN_EMAIL = 'louvamifaly@gmail.com';

// Persistent Institutional Cloud Bridge state (shared across all browsers via /appSettings/cloud_sync_bridge)
let institutionalCloudBridgeActive: boolean = (() => {
  try {
    const saved = localStorage.getItem(CLOUD_BRIDGE_LOCAL_KEY);
    return saved === null ? true : saved !== 'false';
  } catch {
    return true;
  }
})();

export const isCloudBridgeActive = (): boolean => institutionalCloudBridgeActive;

export const setInstitutionalCloudBridgeState = async (
  active: boolean,
  actorName = 'Administrateur EBM'
): Promise<boolean> => {
  institutionalCloudBridgeActive = active;
  try {
    localStorage.setItem(CLOUD_BRIDGE_LOCAL_KEY, active ? 'true' : 'false');
  } catch {
    // Ignore
  }
  try {
    await setDoc(
      doc(db, 'appSettings', 'cloud_sync_bridge'),
      {
        id: 'cloud_sync_bridge',
        active,
        updatedBy: actorName,
        connectedEmail: BOOTSTRAPPED_ADMIN_EMAIL,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'appSettings/cloud_sync_bridge');
    return false;
  }
};

export const subscribeToCloudBridgeStatus = (
  onStatusChange: (active: boolean, updatedBy?: string) => void
): (() => void) => {
  try {
    const bridgeRef = doc(db, 'appSettings', 'cloud_sync_bridge');
    return onSnapshot(
      bridgeRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as { active?: boolean; updatedBy?: string };
          const isActive = data.active !== false;
          institutionalCloudBridgeActive = isActive;
          try {
            localStorage.setItem(CLOUD_BRIDGE_LOCAL_KEY, isActive ? 'true' : 'false');
          } catch {
            // Ignore
          }
          onStatusChange(isActive, data.updatedBy);
        } else {
          // Initialize the institutional bridge in Firestore on first run so all browsers share it
          institutionalCloudBridgeActive = true;
          setDoc(
            bridgeRef,
            {
              id: 'cloud_sync_bridge',
              active: true,
              updatedBy: 'Système EBM Institute',
              connectedEmail: BOOTSTRAPPED_ADMIN_EMAIL,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          ).catch(() => {});
          onStatusChange(true, 'Système EBM Institute');
        }
      },
      () => {
        // Keep current bridge state if offline
      }
    );
  } catch {
    return () => {};
  }
};

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
// 3. INSTITUTIONAL CLOUD BRIDGE & FIREBASE AUTHENTICATION
// ============================================================================

export const hasValidRealFirebaseAuth = (): boolean => {
  const user = auth.currentUser;
  if (user && user.isAnonymous) {
    return false;
  }
  return Boolean((user && !user.isAnonymous) || institutionalCloudBridgeActive);
};

let authSessionPromise: Promise<boolean> | null = null;

/**
 * Ensures the active session is authorized to synchronize with Cloud Firestore:
 * - Rejects any residual anonymous Firebase session.
 * - Checks the persistent Institutional Cloud Bridge (/appSettings/cloud_sync_bridge)
 *   so that once connected by the Administrator, ALL browsers and computers
 *   sync in real time without asking for a Google OAuth popup on each browser.
 * - If a verified Google Firebase user is signed in, updates their Firestore profile.
 */
export const ensureFirebaseAuthSession = async (activeSisUser?: User | null): Promise<boolean> => {
  const currentFbUser = auth.currentUser;

  // Reject and sign out any residual anonymous session immediately
  if (currentFbUser && currentFbUser.isAnonymous) {
    await signOut(auth).catch(() => {});
  }

  if (authSessionPromise) {
    return authSessionPromise;
  }

  authSessionPromise = (async () => {
    try {
      // 1. Check / initialize the global Institutional Cloud Bridge in Firestore
      try {
        const bridgeRef = doc(db, 'appSettings', 'cloud_sync_bridge');
        const bridgeSnap = await getDoc(bridgeRef);
        if (bridgeSnap.exists()) {
          const bridgeData = bridgeSnap.data() as { active?: boolean };
          institutionalCloudBridgeActive = bridgeData.active !== false;
        } else {
          institutionalCloudBridgeActive = true;
          await setDoc(
            bridgeRef,
            {
              id: 'cloud_sync_bridge',
              active: true,
              updatedBy: activeSisUser?.name || 'Administrateur EBM',
              connectedEmail: BOOTSTRAPPED_ADMIN_EMAIL,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        }
        try {
          localStorage.setItem(CLOUD_BRIDGE_LOCAL_KEY, institutionalCloudBridgeActive ? 'true' : 'false');
        } catch {
          // Ignore
        }
      } catch {
        // Offline or network unreachable: fall back to cached bridge state
      }

      // 2. If a real Google Firebase user is also signed in, sync their /users/{uid} record
      const fbUser = auth.currentUser;
      if (fbUser && !fbUser.isAnonymous) {
        const uid = fbUser.uid;
        const email = (fbUser.email || '').toLowerCase();
        const userRef = doc(db, 'users', uid);

        if (email === BOOTSTRAPPED_ADMIN_EMAIL && fbUser.emailVerified) {
          await setDoc(
            userRef,
            {
              id: uid,
              uid,
              sisUserId: activeSisUser?.id || 'user-admin',
              username: activeSisUser?.username || 'admin.ebm',
              name: activeSisUser?.name || fbUser.displayName || 'Administrateur EBM',
              email: fbUser.email,
              googleEmail: fbUser.email,
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
      }

      return institutionalCloudBridgeActive;
    } catch {
      return institutionalCloudBridgeActive;
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

  // If the institutional cloud bridge is paused or browser is offline,
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

// ============================================================================
// 5B. ATOMIC SERVER-SIDE TRANSACTIONAL SCHEDULING RESERVATION (Bug C Fix)
// Prevents two scolarité agents from simultaneously booking the same room,
// teacher, or student group at overlapping times on the server.
// ============================================================================

interface ServerScheduleSlotEntry {
  sessionId: string;
  date: string;
  startTime: string;
  endTime: string;
  roomId: string;
  teacherId: string;
  groupIds: string[];
  status: string;
  updatedAt: string;
}

const parseTimeToMinutesServer = (timeStr: string): number => {
  const [h, m] = (timeStr || '00:00').split(':').map(Number);
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
};

export const commitSessionTransactionally = async (
  session: TimetableSession,
  options?: {
    previousSession?: TimetableSession;
    onReservationConflict?: (conflictMessage: string) => void;
    onSuccess?: (committedSession: TimetableSession) => void;
  }
): Promise<{
  synced: boolean;
  reservationConflict?: boolean;
  conflictMessage?: string;
  error?: string;
}> => {
  const nowIso = session.updatedAt || new Date().toISOString();

  if (!hasValidRealFirebaseAuth() || (typeof navigator !== 'undefined' && !navigator.onLine)) {
    // Offline fallback: enqueue in outbox
    syncDocToFirestore('sessions', session, {
      previousItem: options?.previousSession as unknown as Record<string, unknown>,
      baseUpdatedAt: options?.previousSession?.updatedAt,
    });
    return { synced: false };
  }

  const sessionDocRef = doc(db, 'sessions', session.id);
  const targetIndexDocRef = doc(db, 'appSettings', `schedule_slots_${session.date}`);
  const prevDate = options?.previousSession?.date;
  const prevIndexDocRef =
    prevDate && prevDate !== session.date
      ? doc(db, 'appSettings', `schedule_slots_${prevDate}`)
      : null;

  try {
    let reservationConflictMsg: string | null = null;
    let committedSession: TimetableSession = { ...session, updatedAt: nowIso };

    await runTransaction(db, async (transaction) => {
      const targetIndexSnap = await transaction.get(targetIndexDocRef);
      const prevIndexSnap = prevIndexDocRef ? await transaction.get(prevIndexDocRef) : null;
      const serverSessionSnap = await transaction.get(sessionDocRef);

      const targetSlotsMap: Record<string, ServerScheduleSlotEntry> = targetIndexSnap.exists()
        ? { ...((targetIndexSnap.data().slots as Record<string, ServerScheduleSlotEntry>) || {}) }
        : {};

      const candStart = parseTimeToMinutesServer(session.startTime);
      const candEnd = parseTimeToMinutesServer(session.endTime);

      if (session.status !== 'CANCELLED') {
        const potentialConflictIds: string[] = [];

        for (const [otherId, slot] of Object.entries(targetSlotsMap)) {
          if (otherId === session.id || !slot || slot.status === 'CANCELLED') continue;
          const slotStart = parseTimeToMinutesServer(slot.startTime);
          const slotEnd = parseTimeToMinutesServer(slot.endTime);
          const overlaps = candStart < slotEnd && candEnd > slotStart;
          if (!overlaps) continue;

          const roomConflict = slot.roomId && slot.roomId === session.roomId;
          const teacherConflict =
            session.teacherId &&
            session.teacherId !== 'EXTERNAL_SPEAKER' &&
            slot.teacherId === session.teacherId;
          const groupConflict = (session.groupIds || []).some((g) =>
            (slot.groupIds || []).includes(g)
          );

          if (roomConflict || teacherConflict || groupConflict) {
            potentialConflictIds.push(otherId);
          }
        }

        if (potentialConflictIds.length > 0) {
          // Fetch the actual sessions from Firestore to verify they really exist and are not orphaned ghosts from purged/deleted sessions
          const sessionSnaps = await Promise.all(
            potentialConflictIds.map((id) => transaction.get(doc(db, 'sessions', id)))
          );

          for (let i = 0; i < potentialConflictIds.length; i++) {
            const otherId = potentialConflictIds[i];
            const otherSnap = sessionSnaps[i];
            const slot = targetSlotsMap[otherId];

            if (!otherSnap.exists()) {
              // The session was deleted in Firestore! This slot is an orphan/ghost -> clean it up!
              delete targetSlotsMap[otherId];
              continue;
            }

            const liveSession = otherSnap.data() as TimetableSession;
            if (liveSession.status === 'CANCELLED') {
              delete targetSlotsMap[otherId];
              continue;
            }

            // Real active conflict confirmed on server
            if (slot.roomId && slot.roomId === session.roomId) {
              reservationConflictMsg = `Réservation simultanée détectée sur le serveur : la salle est déjà réservée sur le créneau ${slot.startTime}–${slot.endTime} par une autre séance existante.`;
              break;
            }
            if (
              session.teacherId &&
              session.teacherId !== 'EXTERNAL_SPEAKER' &&
              slot.teacherId === session.teacherId
            ) {
              reservationConflictMsg = `Réservation simultanée détectée sur le serveur : l'enseignant est déjà affecté à une autre séance sur le créneau ${slot.startTime}–${slot.endTime}.`;
              break;
            }
            const sharedGroups = (session.groupIds || []).filter((g) =>
              (slot.groupIds || []).includes(g)
            );
            if (sharedGroups.length > 0) {
              reservationConflictMsg = `Réservation simultanée détectée sur le serveur : le groupe d'étudiants a déjà une séance enregistrée sur le créneau ${slot.startTime}–${slot.endTime}.`;
              break;
            }
          }
        }
      }

      if (reservationConflictMsg) {
        return;
      }

      if (serverSessionSnap.exists()) {
        const serverData = serverSessionSnap.data() as TimetableSession;
        committedSession = mergeEntityFields(serverData, {
          ...session,
          updatedAt: nowIso,
        });
      }

      // Remove from previous date index if date changed
      if (prevIndexDocRef && prevIndexSnap && prevIndexSnap.exists()) {
        const prevSlots: Record<string, ServerScheduleSlotEntry> = {
          ...((prevIndexSnap.data().slots as Record<string, ServerScheduleSlotEntry>) || {}),
        };
        delete prevSlots[session.id];
        transaction.set(
          prevIndexDocRef,
          { id: `schedule_slots_${prevDate}`, slots: prevSlots, updatedAt: nowIso },
          { merge: true }
        );
      }

      // Upsert or remove in target date index
      if (session.status === 'CANCELLED') {
        delete targetSlotsMap[session.id];
      } else {
        targetSlotsMap[session.id] = {
          sessionId: session.id,
          date: session.date,
          startTime: session.startTime,
          endTime: session.endTime,
          roomId: session.roomId,
          teacherId: session.teacherId,
          groupIds: session.groupIds || [],
          status: session.status,
          updatedAt: nowIso,
        };
      }

      transaction.set(
        targetIndexDocRef,
        { id: `schedule_slots_${session.date}`, slots: targetSlotsMap, updatedAt: nowIso },
        { merge: true }
      );

      const cleanSessionData = sanitizeForFirestore(
        committedSession as unknown as Record<string, unknown>,
        options?.previousSession as unknown as Record<string, unknown>
      ) as Record<string, unknown>;
      transaction.set(sessionDocRef, cleanSessionData, { merge: true });
    });

    if (reservationConflictMsg) {
      if (options?.onReservationConflict) {
        options.onReservationConflict(reservationConflictMsg);
      }
      return {
        synced: false,
        reservationConflict: true,
        conflictMessage: reservationConflictMsg,
      };
    }

    clearOutboxEntry('sessions', session.id);
    if (options?.onSuccess) {
      options.onSuccess(committedSession);
    }
    return { synced: true };
  } catch (err) {
    // Fallback to standard syncDocToFirestore on transient errors
    await syncDocToFirestore('sessions', session, {
      previousItem: options?.previousSession as unknown as Record<string, unknown>,
      baseUpdatedAt: options?.previousSession?.updatedAt,
    });
    const info = handleFirestoreError(err, OperationType.WRITE, `sessions/${session.id}`);
    return { synced: false, error: info.error };
  }
};

export const releaseSessionSlotTransactionally = async (
  sessionId: string,
  dateStr?: string
): Promise<void> => {
  if (!dateStr || !hasValidRealFirebaseAuth() || (typeof navigator !== 'undefined' && !navigator.onLine)) {
    return;
  }
  const indexDocRef = doc(db, 'appSettings', `schedule_slots_${dateStr}`);
  try {
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(indexDocRef);
      if (!snap.exists()) return;
      const slots: Record<string, ServerScheduleSlotEntry> = {
        ...((snap.data().slots as Record<string, ServerScheduleSlotEntry>) || {}),
      };
      if (slots[sessionId]) {
        delete slots[sessionId];
        transaction.set(
          indexDocRef,
          { id: `schedule_slots_${dateStr}`, slots, updatedAt: new Date().toISOString() },
          { merge: true }
        );
      }
    });
  } catch {
    // Ignore non-fatal slot cleanup error
  }
};

export const clearDateScheduleSlotsTransactionally = async (
  dateStr: string
): Promise<void> => {
  if (!dateStr || !hasValidRealFirebaseAuth() || (typeof navigator !== 'undefined' && !navigator.onLine)) {
    return;
  }
  const indexDocRef = doc(db, 'appSettings', `schedule_slots_${dateStr}`);
  try {
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(indexDocRef);
      if (!snap.exists()) return;
      transaction.set(
        indexDocRef,
        { id: `schedule_slots_${dateStr}`, slots: {}, updatedAt: new Date().toISOString() },
        { merge: true }
      );
    });
  } catch {
    // Ignore non-fatal slot cleanup error
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
  items: T[],
  onlyMissingOrNewer = false
): Promise<{ syncedCount: number; error?: string }> => {
  if (!items || items.length === 0) return { syncedCount: 0 };
  if (!hasValidRealFirebaseAuth()) {
    return { syncedCount: 0, error: 'Base de données Cloud déconnectée.' };
  }

  try {
    const tombstones = await pullRemoteTombstones();
    const existingSnap = await getDocs(collection(db, collectionName));
    const remoteTimestamps = new Map<string, string>();
    existingSnap.docs.forEach((d) => {
      const data = d.data() as { updatedAt?: string; lastModifiedAt?: string };
      remoteTimestamps.set(d.id, data.updatedAt || data.lastModifiedAt || SEED_BASELINE_TIMESTAMP);
    });

    const CHUNK_SIZE = 400;
    let totalSynced = 0;

    // Filter out tombstoned items and items where the remote document is newer (or equal when onlyMissingOrNewer)
    const eligibleItems = items.filter((item) => {
      if (tombstones.has(item.id) || tombstones.has(`${collectionName}:${item.id}`)) {
        return false;
      }
      const localTime = item.updatedAt || item.lastModifiedAt || SEED_BASELINE_TIMESTAMP;
      const hasRemote = remoteTimestamps.has(item.id);
      const remoteTime = remoteTimestamps.get(item.id) || '';
      if (onlyMissingOrNewer) {
        return !hasRemote || localTime > remoteTime;
      }
      if (hasRemote && remoteTime > localTime) {
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
