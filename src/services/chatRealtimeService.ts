import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  startAfter,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import {
  ref as rtdbRef,
  onValue as rtdbOnValue,
  onDisconnect as rtdbOnDisconnect,
  set as rtdbSet,
  remove as rtdbRemove,
} from 'firebase/database';
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage';
import { db, auth, storage, getRealtimeDb } from '../firebase';
import { isCloudBridgeActive } from './firestoreSync';
import {
  ChatAttachment,
  ChatConversation,
  ChatConversationMessage,
  ChatMessage,
  ChatNotificationPreferences,
  Course,
  ElementConstitutif,
  Filiere,
  PresenceStatus,
  StudentGroup,
  TypingIndicatorEntry,
  User,
  UserPresenceConnection,
  UserPresenceRecord,
} from '../types';

const CONNECTION_TTL_MS = 95_000; // 95s before a stale connection without heartbeat is considered disconnected
const HEARTBEAT_INTERVAL_MS = 30_000; // 30s heartbeat
const IDLE_TIMEOUT_MS = 180_000; // 3 minutes without interaction -> IDLE
const TYPING_TTL_MS = 3_800; // 3.8s typing indicator timeout

const LOCAL_CONVERSATIONS_KEY = 'ebm_chat_conversations_v2';
const LOCAL_MESSAGES_MAP_KEY = 'ebm_chat_messages_by_conv_v2';
const LOCAL_PRESENCE_MAP_KEY = 'ebm_chat_presence_map_v2';
const LOCAL_PREFS_KEY_PREFIX = 'ebm_chat_prefs_v2_';
const LEGACY_BACKUP_KEY = 'ebm_chat_messages_legacy_backup_v1';
const LEGACY_MIGRATION_DONE_KEY = 'ebm_chat_migration_v2_done';

// Unique connection ID for this specific browser tab/device session
const CURRENT_CONNECTION_ID = `conn_${Date.now().toString(36)}_${Math.random()
  .toString(36)
  .substring(2, 7)}`;

function getDeviceLabel(): string {
  if (typeof navigator === 'undefined') return 'Poste Web';
  const ua = navigator.userAgent || '';
  if (/android/i.test(ua)) return 'Smartphone Android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'iOS Mobile';
  if (/macintosh|mac os x/i.test(ua)) return 'Mac';
  if (/windows/i.test(ua)) return 'PC Windows';
  if (/linux/i.test(ua)) return 'Poste Linux';
  return 'Navigateur Web';
}

function canUseFirestoreLive(): boolean {
  return Boolean(db);
}

// BroadcastChannel for instant zero-latency cross-tab synchronization on the same computer
const chatBroadcastChannel: BroadcastChannel | null =
  typeof window !== 'undefined' && 'BroadcastChannel' in window
    ? new BroadcastChannel('ebm_institutional_messenger_v2')
    : null;

export function subscribeToCrossTabChatEvents(
  handler: (event: {
    type: 'PRESENCE' | 'TYPING' | 'MESSAGE' | 'CONVERSATION' | 'RECEIPT';
    payload: unknown;
  }) => void
): () => void {
  if (!chatBroadcastChannel) return () => {};
  const listener = (ev: MessageEvent) => {
    if (ev.data && typeof ev.data === 'object' && ev.data.type) {
      handler(ev.data);
    }
  };
  chatBroadcastChannel.addEventListener('message', listener);
  return () => chatBroadcastChannel.removeEventListener('message', listener);
}

function broadcastChatEvent(
  type: 'PRESENCE' | 'TYPING' | 'MESSAGE' | 'CONVERSATION' | 'RECEIPT',
  payload: unknown
) {
  try {
    chatBroadcastChannel?.postMessage({ type, payload });
  } catch {
    // Ignore broadcast errors
  }
}

// ============================================================================
// 1. REAL-TIME MULTI-DEVICE PRESENCE ENGINE (Section 3)
// ============================================================================

export function computeEffectivePresenceStatus(
  record: UserPresenceRecord | undefined,
  nowMs = Date.now()
): {
  status: PresenceStatus;
  activeDeviceCount: number;
  lastSeenAt?: string;
} {
  if (!record) {
    return { status: 'OFFLINE', activeDeviceCount: 0 };
  }

  const connections = Object.values(record.connections || {});
  const activeConnections = connections.filter((c) => {
    if (!c || !c.updatedAt || c.status === 'OFFLINE') return false;
    const ageMs = nowMs - Date.parse(c.updatedAt);
    return !Number.isNaN(ageMs) && ageMs <= CONNECTION_TTL_MS;
  });

  if (activeConnections.length === 0) {
    return {
      status: 'OFFLINE',
      activeDeviceCount: 0,
      lastSeenAt: record.lastSeenAt || record.updatedAt,
    };
  }

  // If user manually chose DND or IDLE, respect it across active sessions
  if (record.manualStatus === 'DND') {
    return {
      status: 'DND',
      activeDeviceCount: activeConnections.length,
      lastSeenAt: record.lastSeenAt || record.updatedAt,
    };
  }
  if (record.manualStatus === 'IDLE') {
    return {
      status: 'IDLE',
      activeDeviceCount: activeConnections.length,
      lastSeenAt: record.lastSeenAt || record.updatedAt,
    };
  }

  const hasOnline = activeConnections.some((c) => c.status === 'ONLINE');
  const hasDnd = activeConnections.some((c) => c.status === 'DND');
  const effectiveStatus: PresenceStatus = hasDnd ? 'DND' : hasOnline ? 'ONLINE' : 'IDLE';

  return {
    status: effectiveStatus,
    activeDeviceCount: activeConnections.length,
    lastSeenAt: record.lastSeenAt || record.updatedAt,
  };
}

export function loadLocalPresenceMap(): Record<string, UserPresenceRecord> {
  try {
    const raw = localStorage.getItem(LOCAL_PRESENCE_MAP_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveLocalPresenceMap(map: Record<string, UserPresenceRecord>): void {
  try {
    localStorage.setItem(LOCAL_PRESENCE_MAP_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage quota errors
  }
}

export async function publishUserPresenceHeartbeat(params: {
  sisUserId: string;
  connectionStatus: PresenceStatus;
  manualStatus?: 'ONLINE' | 'IDLE' | 'DND';
  removeConnection?: boolean;
}): Promise<UserPresenceRecord | null> {
  const { sisUserId, connectionStatus, manualStatus, removeConnection } = params;
  if (!sisUserId) return null;

  const nowIso = new Date().toISOString();
  const nowMs = Date.now();
  const localMap = loadLocalPresenceMap();
  const existing = localMap[sisUserId] || {
    id: sisUserId,
    sisUserId,
    status: 'OFFLINE' as PresenceStatus,
    lastSeenAt: nowIso,
    connections: {},
    updatedAt: nowIso,
  };

  // Prune expired connections from other devices
  const updatedConnections: Record<string, UserPresenceConnection> = {};
  Object.entries(existing.connections || {}).forEach(([cid, conn]) => {
    if (!conn || !conn.updatedAt) return;
    const age = nowMs - Date.parse(conn.updatedAt);
    if (!Number.isNaN(age) && age <= CONNECTION_TTL_MS && conn.status !== 'OFFLINE') {
      updatedConnections[cid] = conn;
    }
  });

  if (removeConnection || connectionStatus === 'OFFLINE') {
    delete updatedConnections[CURRENT_CONNECTION_ID];
  } else {
    updatedConnections[CURRENT_CONNECTION_ID] = {
      connectionId: CURRENT_CONNECTION_ID,
      status: manualStatus || connectionStatus,
      updatedAt: nowIso,
      deviceLabel: getDeviceLabel(),
    };
  }

  const nextManual = manualStatus !== undefined ? manualStatus : existing.manualStatus;
  const candidateRecord: UserPresenceRecord = {
    id: sisUserId,
    sisUserId,
    manualStatus: nextManual,
    lastSeenAt: nowIso,
    connections: updatedConnections,
    status: 'OFFLINE',
    updatedAt: nowIso,
  };

  const computed = computeEffectivePresenceStatus(candidateRecord, nowMs);
  candidateRecord.status = computed.status;

  localMap[sisUserId] = candidateRecord;
  saveLocalPresenceMap(localMap);
  broadcastChatEvent('PRESENCE', candidateRecord);

  // 1. Firebase Realtime Database (.info/connected & onDisconnect) when available
  const rtdb = getRealtimeDb();
  if (rtdb) {
    try {
      const connRef = rtdbRef(rtdb, `presence/${sisUserId}/${CURRENT_CONNECTION_ID}`);
      if (removeConnection || connectionStatus === 'OFFLINE') {
        rtdbRemove(connRef).catch(() => {});
      } else {
        rtdbOnDisconnect(connRef)
          .remove()
          .catch(() => {});
        rtdbSet(connRef, {
          connectionId: CURRENT_CONNECTION_ID,
          status: manualStatus || connectionStatus,
          updatedAt: nowIso,
          deviceLabel: getDeviceLabel(),
        }).catch(() => {});
      }
    } catch {
      // Ignore RTDB errors if not provisioned
    }
  }

  // 2. Cloud Firestore real-time presence document
  if (canUseFirestoreLive()) {
    try {
      await setDoc(doc(db, 'presence', sisUserId), candidateRecord, { merge: true });
    } catch {
      // Offline or rules fallback
    }
  }

  return candidateRecord;
}

/**
 * Starts the real-time presence lifecycle for the authenticated EBM user:
 * - Connects to RTDB `/.info/connected` + `onDisconnect()` when configured
 * - Listens to Cloud Firestore `presence` collection in real time
 * - Tracks user activity (mouse/keyboard/touch/visibility) to toggle ONLINE <-> IDLE automatically
 * - Cleans up this device's connection on logout or tab close (`pagehide`/`beforeunload`)
 */
export function startRealtimePresenceLifecycle(params: {
  sisUserId: string;
  isAuthenticated: boolean;
  manualStatus?: 'ONLINE' | 'IDLE' | 'DND';
  onPresenceMapUpdate: (map: Record<string, UserPresenceRecord>) => void;
}): () => void {
  const { sisUserId, isAuthenticated, manualStatus, onPresenceMapUpdate } = params;
  if (!isAuthenticated || !sisUserId) {
    return () => {};
  }

  let currentAutoStatus: PresenceStatus = 'ONLINE';
  let idleTimer: ReturnType<typeof setTimeout> | null = null;
  let unsubFirestore = () => {};
  let unsubRtdb = () => {};

  const resetIdleTimer = () => {
    if (idleTimer) clearTimeout(idleTimer);
    if (currentAutoStatus === 'IDLE') {
      currentAutoStatus = 'ONLINE';
      publishUserPresenceHeartbeat({
        sisUserId,
        connectionStatus: 'ONLINE',
        manualStatus,
      });
    }
    idleTimer = setTimeout(() => {
      currentAutoStatus = 'IDLE';
      publishUserPresenceHeartbeat({
        sisUserId,
        connectionStatus: 'IDLE',
        manualStatus,
      });
    }, IDLE_TIMEOUT_MS);
  };

  // Initial online publish
  publishUserPresenceHeartbeat({
    sisUserId,
    connectionStatus: 'ONLINE',
    manualStatus,
  }).then((rec) => {
    if (rec) {
      const m = loadLocalPresenceMap();
      onPresenceMapUpdate({ ...m, [sisUserId]: rec });
    }
  });
  resetIdleTimer();

  // Periodic heartbeat every 30s
  const heartbeatInterval = setInterval(() => {
    publishUserPresenceHeartbeat({
      sisUserId,
      connectionStatus: currentAutoStatus,
      manualStatus,
    });
  }, HEARTBEAT_INTERVAL_MS);

  // Periodic local TTL refresh every 20s so stale remote connections transition to OFFLINE automatically
  const ttlCheckInterval = setInterval(() => {
    onPresenceMapUpdate({ ...loadLocalPresenceMap() });
  }, 20_000);

  // Subscribe to RTDB /.info/connected if RTDB is configured
  const rtdb = getRealtimeDb();
  if (rtdb) {
    try {
      const infoRef = rtdbRef(rtdb, '.info/connected');
      unsubRtdb = rtdbOnValue(infoRef, (snap) => {
        if (snap.val() === true) {
          const connRef = rtdbRef(rtdb, `presence/${sisUserId}/${CURRENT_CONNECTION_ID}`);
          rtdbOnDisconnect(connRef)
            .remove()
            .then(() => {
              publishUserPresenceHeartbeat({
                sisUserId,
                connectionStatus: currentAutoStatus,
                manualStatus,
              });
            })
            .catch(() => {});
        }
      });
    } catch {
      // Ignore RTDB if unavailable
    }
  }

  // Subscribe to Firestore `presence` collection
  if (canUseFirestoreLive()) {
    try {
      unsubFirestore = onSnapshot(
        collection(db, 'presence'),
        (snapshot) => {
          const nextMap = { ...loadLocalPresenceMap() };
          snapshot.docs.forEach((d) => {
            const data = d.data() as UserPresenceRecord;
            if (data && data.sisUserId) {
              nextMap[data.sisUserId] = data;
            }
          });
          saveLocalPresenceMap(nextMap);
          onPresenceMapUpdate(nextMap);
        },
        () => {}
      );
    } catch {
      // Ignore snapshot setup error
    }
  }

  const handleUserActivity = () => {
    resetIdleTimer();
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      currentAutoStatus = 'IDLE';
      publishUserPresenceHeartbeat({
        sisUserId,
        connectionStatus: 'IDLE',
        manualStatus,
      });
    } else {
      currentAutoStatus = 'ONLINE';
      resetIdleTimer();
      publishUserPresenceHeartbeat({
        sisUserId,
        connectionStatus: 'ONLINE',
        manualStatus,
      });
    }
  };

  const handlePageUnload = () => {
    publishUserPresenceHeartbeat({
      sisUserId,
      connectionStatus: 'OFFLINE',
      removeConnection: true,
    });
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('mousemove', handleUserActivity, { passive: true });
    window.addEventListener('keydown', handleUserActivity, { passive: true });
    window.addEventListener('touchstart', handleUserActivity, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageUnload);
    window.addEventListener('beforeunload', handlePageUnload);
  }

  return () => {
    if (idleTimer) clearTimeout(idleTimer);
    clearInterval(heartbeatInterval);
    clearInterval(ttlCheckInterval);
    unsubFirestore();
    unsubRtdb();
    if (typeof window !== 'undefined') {
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageUnload);
      window.removeEventListener('beforeunload', handlePageUnload);
    }
    publishUserPresenceHeartbeat({
      sisUserId,
      connectionStatus: 'OFFLINE',
      removeConnection: true,
    });
  };
}

// ============================================================================
// 2. REAL-TIME TYPING INDICATORS (Section 10)
// ============================================================================

const activeTypingMap = new Map<string, Map<string, TypingIndicatorEntry>>();
const typingListeners = new Set<(conversationId: string, entries: TypingIndicatorEntry[]) => void>();

function notifyTypingListeners(conversationId: string) {
  const now = Date.now();
  const convMap = activeTypingMap.get(conversationId) || new Map<string, TypingIndicatorEntry>();
  const validEntries: TypingIndicatorEntry[] = [];
  convMap.forEach((entry, uid) => {
    if (now - entry.timestamp <= TYPING_TTL_MS) {
      validEntries.push(entry);
    } else {
      convMap.delete(uid);
    }
  });
  typingListeners.forEach((cb) => cb(conversationId, validEntries));
}

export function publishTypingStatus(params: {
  conversationId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
}): void {
  const { conversationId, userId, userName, isTyping } = params;
  if (!conversationId || !userId) return;

  const entry: TypingIndicatorEntry = {
    conversationId,
    userId,
    userName,
    timestamp: isTyping ? Date.now() : 0,
  };

  if (!activeTypingMap.has(conversationId)) {
    activeTypingMap.set(conversationId, new Map());
  }
  const convMap = activeTypingMap.get(conversationId)!;
  if (isTyping) {
    convMap.set(userId, entry);
  } else {
    convMap.delete(userId);
  }
  notifyTypingListeners(conversationId);
  broadcastChatEvent('TYPING', { conversationId, userId, userName, isTyping });

  // Publish to Firebase Realtime Database when available
  const rtdb = getRealtimeDb();
  if (rtdb) {
    try {
      const tRef = rtdbRef(rtdb, `typing/${conversationId}/${userId}`);
      if (isTyping) {
        rtdbOnDisconnect(tRef)
          .remove()
          .catch(() => {});
        rtdbSet(tRef, entry).catch(() => {});
      } else {
        rtdbRemove(tRef).catch(() => {});
      }
    } catch {
      // Ignore RTDB error
    }
  }

  // Publish lightweight ephemeral state to appSettings/chat_typing_live in Firestore (throttled)
  if (canUseFirestoreLive()) {
    setDoc(
      doc(db, 'appSettings', 'chat_typing_live'),
      {
        id: 'chat_typing_live',
        [`${conversationId}__${userId}`]: isTyping ? entry : null,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    ).catch(() => {});
  }
}

export function subscribeToTypingIndicators(
  onUpdate: (conversationId: string, entries: TypingIndicatorEntry[]) => void
): () => void {
  typingListeners.add(onUpdate);

  // Clean up expired typing indicators every 1.5s
  const cleanupTimer = setInterval(() => {
    activeTypingMap.forEach((_, convId) => notifyTypingListeners(convId));
  }, 1500);

  let unsubFirestore = () => {};
  if (canUseFirestoreLive()) {
    try {
      unsubFirestore = onSnapshot(
        doc(db, 'appSettings', 'chat_typing_live'),
        (snap) => {
          if (!snap.exists()) return;
          const data = snap.data() as Record<string, unknown>;
          const now = Date.now();
          const touchedConvs = new Set<string>();
          Object.entries(data).forEach(([key, val]) => {
            if (!key.includes('__')) return;
            const [convId, uid] = key.split('__');
            touchedConvs.add(convId);
            if (!activeTypingMap.has(convId)) {
              activeTypingMap.set(convId, new Map());
            }
            const cMap = activeTypingMap.get(convId)!;
            if (val && typeof val === 'object') {
              const entry = val as TypingIndicatorEntry;
              if (now - entry.timestamp <= TYPING_TTL_MS) {
                cMap.set(uid, entry);
              } else {
                cMap.delete(uid);
              }
            } else {
              cMap.delete(uid);
            }
          });
          touchedConvs.forEach((cId) => notifyTypingListeners(cId));
        },
        () => {}
      );
    } catch {
      // Ignore
    }
  }

  return () => {
    typingListeners.delete(onUpdate);
    clearInterval(cleanupTimer);
    unsubFirestore();
  };
}

// ============================================================================
// 3. CONVERSATIONS & SUBCOLLECTION MESSAGES (Sections 4, 7, 11)
// ============================================================================

export function getPrivateConversationId(userAId: string, userBId: string): string {
  const sorted = [userAId, userBId].sort();
  return `priv__${sorted[0]}__${sorted[1]}`;
}

export function getPedagogicalGroupConversationId(groupId: string): string {
  return `grp_conv__${groupId}`;
}

export const OFFICIAL_ANNOUNCEMENT_CONV_ID = 'conv-annonces-officielles';

export function canUserPublishOfficialAnnouncement(user: User | undefined): boolean {
  if (!user || !user.isActive) return false;
  return ['ADMIN', 'ACADEMIC_HEAD', 'SCOLARITE', 'SCHEDULER'].includes(user.role);
}

export function canUserAccessConversation(
  user: User | undefined,
  conv: ChatConversation
): boolean {
  if (!user || !user.isActive) return false;
  if (conv.type === 'announcement') {
    return (
      conv.participantIds.includes('ALL') ||
      conv.participantIds.includes(user.id) ||
      user.role === 'ADMIN'
    );
  }
  if (conv.type === 'private') {
    return conv.participantIds.includes(user.id);
  }
  // Group conversation
  if (user.role === 'ADMIN' || user.role === 'ACADEMIC_HEAD' || user.role === 'SCOLARITE') {
    return true;
  }
  if (conv.metadata?.groupId && user.groupId === conv.metadata.groupId) {
    return true;
  }
  return conv.participantIds.includes(user.id);
}

export function loadLocalConversations(): ChatConversation[] {
  try {
    const raw = localStorage.getItem(LOCAL_CONVERSATIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalConversations(convs: ChatConversation[]): void {
  try {
    localStorage.setItem(LOCAL_CONVERSATIONS_KEY, JSON.stringify(convs));
  } catch {
    // Ignore
  }
}

export function loadLocalMessagesByConv(): Record<string, ChatConversationMessage[]> {
  try {
    const raw = localStorage.getItem(LOCAL_MESSAGES_MAP_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveLocalMessagesByConv(
  map: Record<string, ChatConversationMessage[]>
): void {
  try {
    localStorage.setItem(LOCAL_MESSAGES_MAP_KEY, JSON.stringify(map));
  } catch {
    // Ignore
  }
}

/**
 * Ensures the Official Announcements channel and Pedagogical Group conversations
 * exist and reflect current EBM groups, filières, teachers, and students (Section 4.2, 4.3, 14).
 */
export function buildInstitutionalConversationsFromSisData(params: {
  existingConversations: ChatConversation[];
  users: User[];
  groups: StudentGroup[];
  filieres: Filiere[];
  courses: Course[];
  ecs: ElementConstitutif[];
}): ChatConversation[] {
  const { existingConversations, users, groups, filieres, courses, ecs } = params;
  const convMap = new Map<string, ChatConversation>();
  existingConversations.forEach((c) => {
    if (c && c.id) convMap.set(c.id, c);
  });

  const activeUsers = users.filter((u) => u.isActive);
  const allActiveUserIds = activeUsers.map((u) => u.id);
  const staffAdminIds = activeUsers
    .filter((u) => ['ADMIN', 'ACADEMIC_HEAD', 'SCOLARITE', 'SCHEDULER'].includes(u.role))
    .map((u) => u.id);

  // 1. Official Institutional Announcement Channel
  const existingOfficial = convMap.get(OFFICIAL_ANNOUNCEMENT_CONV_ID);
  convMap.set(OFFICIAL_ANNOUNCEMENT_CONV_ID, {
    id: OFFICIAL_ANNOUNCEMENT_CONV_ID,
    type: 'announcement',
    title: '📢 Annonces Officielles EBM Institute',
    participantIds: allActiveUserIds,
    createdBy: existingOfficial?.createdBy || 'user-admin',
    createdAt: existingOfficial?.createdAt || '2026-09-01T08:00:00.000Z',
    updatedAt: existingOfficial?.updatedAt || '2026-09-01T08:00:00.000Z',
    lastMessage: existingOfficial?.lastMessage,
    lastMessageAt: existingOfficial?.lastMessageAt,
    metadata: {
      isOfficialAnnouncement: true,
      allowReplies: existingOfficial?.metadata?.allowReplies ?? false,
      description:
        'Canal officiel de diffusion de la Direction Générale, de la Direction des Études et de la Scolarité EBM Institute.',
      adminIds: staffAdminIds,
    },
  });

  // 2. Pedagogical Group Conversations (1 per promotion / class group)
  groups.forEach((grp) => {
    const convId = getPedagogicalGroupConversationId(grp.id);
    const existingGrpConv = convMap.get(convId);
    const filiere = filieres.find((f) => f.id === grp.filiereId);

    // Members: students enrolled in grp.id + teachers teaching courses/ECs for grp.id + academic staff
    const groupStudentIds = activeUsers
      .filter((u) => u.role === 'STUDENT' && u.groupId === grp.id)
      .map((u) => u.id);

    const groupTeacherIds = new Set<string>();
    courses
      .filter((c) => c.groupIds.includes(grp.id))
      .forEach((c) => c.teacherIds.forEach((tid) => groupTeacherIds.add(tid)));
    ecs
      .filter((e) => e.groupIds.includes(grp.id))
      .forEach((e) => e.teacherIds.forEach((tid) => groupTeacherIds.add(tid)));

    const mergedParticipants = Array.from(
      new Set([
        ...groupStudentIds,
        ...Array.from(groupTeacherIds),
        ...staffAdminIds,
        ...(existingGrpConv?.participantIds || []),
      ])
    );

    convMap.set(convId, {
      id: convId,
      type: 'group',
      title: `${grp.code} — ${grp.name}`,
      participantIds: mergedParticipants,
      createdBy: existingGrpConv?.createdBy || 'user-admin',
      createdAt: existingGrpConv?.createdAt || '2026-09-01T08:00:00.000Z',
      updatedAt: existingGrpConv?.updatedAt || '2026-09-01T08:00:00.000Z',
      lastMessage: existingGrpConv?.lastMessage,
      lastMessageAt: existingGrpConv?.lastMessageAt,
      metadata: {
        groupId: grp.id,
        filiereId: grp.filiereId,
        level: grp.level,
        allowReplies: existingGrpConv?.metadata?.allowReplies ?? true,
        description: `Groupe pédagogique officiel de la promotion ${grp.code} (${
          filiere?.name || grp.name
        } • Niveau ${grp.level}).`,
        adminIds: [...staffAdminIds, ...Array.from(groupTeacherIds)],
      },
    });
  });

  return Array.from(convMap.values());
}

// ============================================================================
// 4. LEGACY CHAT MESSAGES BACKUP & SAFE MIGRATION (Section 13)
// ============================================================================

function parseLegacyTimestampToIso(rawTs: string, fallbackIdx: number): string {
  if (!rawTs) return `2026-10-31T08:${String(fallbackIdx % 60).padStart(2, '0')}:00.000Z`;
  // If already valid ISO date
  const parsed = Date.parse(rawTs);
  if (!Number.isNaN(parsed) && rawTs.includes('-')) {
    return new Date(parsed).toISOString();
  }
  const timeMatch = rawTs.match(/(\d{1,2}):(\d{2})/);
  const hh = timeMatch ? String(timeMatch[1]).padStart(2, '0') : '09';
  const mm = timeMatch ? String(timeMatch[2]).padStart(2, '0') : '00';
  if (/hier/i.test(rawTs)) {
    return `2026-10-31T${hh}:${mm}:00.000Z`;
  }
  return `2026-11-01T${hh}:${mm}:00.000Z`;
}

export async function migrateLegacyChatMessagesSafely(params: {
  legacyMessages: ChatMessage[];
  users: User[];
  existingConversations: ChatConversation[];
  existingMessagesByConv: Record<string, ChatConversationMessage[]>;
}): Promise<{
  migratedConversations: ChatConversation[];
  migratedMessagesByConv: Record<string, ChatConversationMessage[]>;
  migratedCount: number;
  backupSaved: boolean;
}> {
  const { legacyMessages, users, existingConversations, existingMessagesByConv } = params;

  if (!legacyMessages || legacyMessages.length === 0) {
    return {
      migratedConversations: existingConversations,
      migratedMessagesByConv: existingMessagesByConv,
      migratedCount: 0,
      backupSaved: true,
    };
  }

  // Step 1: Backup legacy chatMessages before any transformation (Section 13.1 & 13.9)
  let backupSaved = false;
  try {
    const existingBackup = localStorage.getItem(LEGACY_BACKUP_KEY);
    if (!existingBackup) {
      const backupPayload = {
        backedUpAt: new Date().toISOString(),
        originalCount: legacyMessages.length,
        messages: legacyMessages,
      };
      localStorage.setItem(LEGACY_BACKUP_KEY, JSON.stringify(backupPayload));
      if (canUseFirestoreLive()) {
        await setDoc(
          doc(db, 'appSettings', 'chat_legacy_backup_v1'),
          { id: 'chat_legacy_backup_v1', ...backupPayload },
          { merge: true }
        ).catch(() => {});
      }
    }
    backupSaved = true;
  } catch {
    backupSaved = false;
  }

  const convMap = new Map<string, ChatConversation>();
  existingConversations.forEach((c) => convMap.set(c.id, c));
  const nextMessagesByConv: Record<string, ChatConversationMessage[]> = {
    ...existingMessagesByConv,
  };

  let migratedCount = 0;

  // Step 2 & 3: Group private messages by user pair and preserve IDs & read states
  legacyMessages.forEach((oldMsg, idx) => {
    if (!oldMsg || !oldMsg.id || !oldMsg.senderId || !oldMsg.recipientId) return;
    const convId = getPrivateConversationId(oldMsg.senderId, oldMsg.recipientId);
    const sender = users.find((u) => u.id === oldMsg.senderId);
    const recipient = users.find((u) => u.id === oldMsg.recipientId);

    const createdAtIso =
      oldMsg.updatedAt || parseLegacyTimestampToIso(oldMsg.timestamp, idx);

    const convMsgs = [...(nextMessagesByConv[convId] || [])];
    if (!convMsgs.some((m) => m.id === oldMsg.id)) {
      const deliveredTo: Record<string, string> = {
        [oldMsg.senderId]: createdAtIso,
        [oldMsg.recipientId]: createdAtIso,
      };
      const readBy: Record<string, string> = {
        [oldMsg.senderId]: createdAtIso,
      };
      if (oldMsg.isRead) {
        readBy[oldMsg.recipientId] = createdAtIso;
      }

      const migratedMsg: ChatConversationMessage = {
        id: oldMsg.id,
        conversationId: convId,
        senderId: oldMsg.senderId,
        senderName: sender?.name || 'Utilisateur EBM',
        senderRole: sender?.role || 'STUDENT',
        text: oldMsg.text,
        type: 'text',
        createdAt: createdAtIso,
        deliveredTo,
        readBy,
        updatedAt: createdAtIso,
      };
      convMsgs.push(migratedMsg);
      convMsgs.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      nextMessagesByConv[convId] = convMsgs;
      migratedCount++;
    }

    const latestMsg = convMsgs[convMsgs.length - 1];
    const existingConv = convMap.get(convId);
    convMap.set(convId, {
      id: convId,
      type: 'private',
      title: `${sender?.name || oldMsg.senderId} & ${recipient?.name || oldMsg.recipientId}`,
      participantIds: [oldMsg.senderId, oldMsg.recipientId].sort(),
      createdBy: existingConv?.createdBy || oldMsg.senderId,
      createdAt: existingConv?.createdAt || convMsgs[0]?.createdAt || createdAtIso,
      updatedAt: latestMsg?.createdAt || createdAtIso,
      lastMessage: latestMsg
        ? {
            id: latestMsg.id,
            text: latestMsg.text,
            senderId: latestMsg.senderId,
            senderName: latestMsg.senderName,
            createdAt: latestMsg.createdAt,
            type: latestMsg.type,
          }
        : existingConv?.lastMessage,
      lastMessageAt: latestMsg?.createdAt || existingConv?.lastMessageAt,
    });
  });

  try {
    localStorage.setItem(LEGACY_MIGRATION_DONE_KEY, 'true');
  } catch {
    // Ignore
  }

  return {
    migratedConversations: Array.from(convMap.values()),
    migratedMessagesByConv: nextMessagesByConv,
    migratedCount,
    backupSaved,
  };
}

// ============================================================================
// 5. FIRESTORE SUBCOLLECTION READ/WRITE & PAGINATION (Section 7, 11)
// ============================================================================

export async function syncConversationToFirestore(conv: ChatConversation): Promise<void> {
  broadcastChatEvent('CONVERSATION', conv);
  if (!canUseFirestoreLive()) return;
  try {
    await setDoc(doc(db, 'conversations', conv.id), conv, { merge: true });
  } catch (error) {
    console.error('[chat] syncConversationToFirestore error:', error);
  }
}

export const msgTime = (m: any) => {
  const server = m.serverCreatedAt?.toMillis?.();
  if (server) return server;
  const t = Date.parse(m.createdAt);
  return Number.isNaN(t) ? 0 : t;
};

export const compareMessages = (
  a: ChatConversationMessage & { serverCreatedAt?: any },
  b: ChatConversationMessage & { serverCreatedAt?: any }
) => msgTime(a) - msgTime(b) || (a.id || '').localeCompare(b.id || '');

export async function saveMessageToSubcollection(
  conv: ChatConversation,
  message: ChatConversationMessage
): Promise<void> {
  broadcastChatEvent('MESSAGE', { conversation: conv, message });
  if (!canUseFirestoreLive()) return;
  try {
    const batch = writeBatch(db);
    const convRef = doc(db, 'conversations', conv.id);
    const msgRef = doc(db, 'conversations', conv.id, 'messages', message.id);
    batch.set(convRef, conv, { merge: true });
    batch.set(msgRef, { ...message, serverCreatedAt: serverTimestamp() }, { merge: true });
    await batch.commit();
  } catch (error) {
    console.error('[chat] saveMessageToSubcollection error:', error);
    throw error;
  }
}

/**
 * Fetches a paginated slice of messages from `conversations/{conversationId}/messages`
 * ordered chronologically (latest `pageSize` messages, or older messages after `beforeCreatedAt`).
 */
export async function fetchPaginatedConversationMessages(
  conversationId: string,
  pageSize = 40,
  beforeCreatedAt?: string
): Promise<ChatConversationMessage[]> {
  if (!canUseFirestoreLive() || !conversationId) return [];
  try {
    const msgsCol = collection(db, 'conversations', conversationId, 'messages');
    const q = beforeCreatedAt
      ? query(msgsCol, orderBy('createdAt', 'desc'), startAfter(beforeCreatedAt), limit(pageSize))
      : query(msgsCol, orderBy('createdAt', 'desc'), limit(pageSize));
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => d.data({ serverTimestamps: 'estimate' }) as ChatConversationMessage);
    return list.sort(compareMessages);
  } catch (error) {
    console.error('[chat] fetchPaginatedConversationMessages error:', error);
    return [];
  }
}

/**
 * Subscribes in real time to the latest messages of a conversation subcollection
 * (`conversations/{conversationId}/messages`).
 */
export function subscribeToConversationMessagesSubcollection(
  conversationId: string,
  pageSize = 60,
  onUpdate: (messages: ChatConversationMessage[]) => void
): () => void {
  if (!canUseFirestoreLive() || !conversationId) return () => {};
  try {
    const msgsCol = collection(db, 'conversations', conversationId, 'messages');
    const q = query(msgsCol, orderBy('createdAt', 'desc'), limit(pageSize));
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs
          .map((d) => d.data({ serverTimestamps: 'estimate' }) as ChatConversationMessage)
          .sort(compareMessages);
        onUpdate(list);
      },
      (error) => {
        console.error('[chat] subscribeToConversationMessagesSubcollection error:', error);
      }
    );
  } catch (error) {
    console.error('[chat] subscribeToConversationMessagesSubcollection init error:', error);
    return () => {};
  }
}

/**
 * Marks messages in a conversation as DELIVERED (`deliveredTo[userId]`) when received
 * by an active session, and READ (`readBy[userId]`) ONLY when the user actively opens
 * and views the conversation (Section 7).
 */
export async function updateMessageReceiptsInFirestore(
  conversationId: string,
  messagesToUpdate: ChatConversationMessage[]
): Promise<void> {
  if (messagesToUpdate.length === 0) return;
  broadcastChatEvent('RECEIPT', { conversationId, messages: messagesToUpdate });
  if (!canUseFirestoreLive()) return;
  try {
    const batch = writeBatch(db);
    messagesToUpdate.forEach((msg) => {
      const msgRef = doc(db, 'conversations', conversationId, 'messages', msg.id);
      batch.set(
        msgRef,
        {
          deliveredTo: msg.deliveredTo,
          readBy: msg.readBy,
          updatedAt: msg.updatedAt || new Date().toISOString(),
        },
        { merge: true }
      );
    });
    await batch.commit();
  } catch {
    // Ignore transient network errors
  }
}

// ============================================================================
// 6. SECURE ATTACHMENTS UPLOAD & VALIDATION (Section 8)
// ============================================================================

const ALLOWED_ATTACHMENT_EXTENSIONS = new Set([
  'PDF',
  'DOCX',
  'XLSX',
  'PPTX',
  'JPG',
  'JPEG',
  'PNG',
]);

const ALLOWED_MIME_PREFIXES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/msword',
  'application/vnd.ms-excel',
  'application/vnd.ms-powerpoint',
  'image/jpeg',
  'image/jpg',
  'image/png',
];

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} Mo`;
}

export function validateChatAttachmentFile(
  file: File,
  maxFileSizeMb = 10
): { valid: boolean; error?: string; extension: string } {
  const ext = file.name.includes('.')
    ? file.name.split('.').pop()?.toUpperCase().trim() || ''
    : '';

  if (!ext || !ALLOWED_ATTACHMENT_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      extension: ext,
      error: `Format de fichier non autorisé (.${ext || '?'}). Formats acceptés : PDF, DOCX, XLSX, PPTX, JPG, JPEG, PNG.`,
    };
  }

  if (
    file.type &&
    !ALLOWED_MIME_PREFIXES.some((m) => file.type.toLowerCase().includes(m))
  ) {
    return {
      valid: false,
      extension: ext,
      error: `Type MIME invalide (${file.type}). Seuls les documents PDF, Office (DOCX, XLSX, PPTX) et images (JPG, PNG) sont autorisés.`,
    };
  }

  const maxBytes = maxFileSizeMb * 1024 * 1024;
  if (file.size > maxBytes) {
    return {
      valid: false,
      extension: ext,
      error: `Fichier trop volumineux (${formatFileSize(
        file.size
      )}). La limite configurée est de ${maxFileSizeMb} Mo maximum par fichier.`,
    };
  }

  return { valid: true, extension: ext };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Erreur de lecture du fichier'));
    reader.readAsDataURL(file);
  });
}

export async function uploadChatAttachmentFile(params: {
  file: File;
  conversationId: string;
  senderId: string;
  maxFileSizeMb?: number;
}): Promise<{ success: boolean; attachment?: ChatAttachment; error?: string }> {
  const { file, conversationId, senderId, maxFileSizeMb = 10 } = params;
  const check = validateChatAttachmentFile(file, maxFileSizeMb);
  if (!check.valid) {
    return { success: false, error: check.error };
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `chat_attachments/${conversationId}/${Date.now()}_${senderId}_${safeName}`;

  try {
    const fileRef = storageRef(storage, storagePath);
    const uploadSnap = await uploadBytes(fileRef, file, {
      contentType: file.type || 'application/octet-stream',
      customMetadata: {
        senderId,
        conversationId,
        originalName: file.name,
      },
    });
    const downloadUrl = await getDownloadURL(uploadSnap.ref);
    return {
      success: true,
      attachment: {
        name: file.name,
        url: downloadUrl,
        mimeType: file.type || 'application/octet-stream',
        extension: check.extension,
        sizeBytes: file.size,
        sizeFormatted: formatFileSize(file.size),
        storagePath,
      },
    };
  } catch {
    // Fallback to safe Data-URI / Blob URL when Firebase Storage rules are not yet deployed on the bucket
    try {
      const dataUrl =
        file.size <= 750 * 1024
          ? await readFileAsDataUrl(file)
          : URL.createObjectURL(file);
      return {
        success: true,
        attachment: {
          name: file.name,
          url: dataUrl,
          mimeType: file.type || 'application/octet-stream',
          extension: check.extension,
          sizeBytes: file.size,
          sizeFormatted: formatFileSize(file.size),
          storagePath,
        },
      };
    } catch {
      return {
        success: false,
        error: 'Échec du téléversement de la pièce jointe.',
      };
    }
  }
}

// ============================================================================
// 7. USER NOTIFICATION PREFERENCES PERSISTENCE (Section 6.3, 11)
// ============================================================================

export function loadLocalChatPreferences(
  userId: string,
  fallback: ChatNotificationPreferences
): ChatNotificationPreferences {
  try {
    const raw = localStorage.getItem(`${LOCAL_PREFS_KEY_PREFIX}${userId}`);
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw), userId, id: userId };
  } catch {
    return fallback;
  }
}

export async function saveChatPreferencesToFirestore(
  prefs: ChatNotificationPreferences
): Promise<void> {
  try {
    localStorage.setItem(`${LOCAL_PREFS_KEY_PREFIX}${prefs.userId}`, JSON.stringify(prefs));
  } catch {
    // Ignore
  }
  if (!canUseFirestoreLive()) return;
  try {
    await setDoc(doc(db, 'chatPreferences', prefs.userId), prefs, { merge: true });
  } catch {
    // Ignore
  }
}

export async function fetchChatPreferencesFromFirestore(
  userId: string
): Promise<ChatNotificationPreferences | null> {
  if (!canUseFirestoreLive() || !userId) return null;
  try {
    const snap = await getDoc(doc(db, 'chatPreferences', userId));
    if (snap.exists()) {
      return snap.data() as ChatNotificationPreferences;
    }
    return null;
  } catch {
    return null;
  }
}

export { updateDoc };
