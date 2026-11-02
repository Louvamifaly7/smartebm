import { getToken, onMessage } from 'firebase/messaging';
import { getFirebaseMessaging } from '../firebase';
import {
  ChatConversation,
  ChatConversationMessage,
  ChatNotificationPreferences,
  ChatSoundTone,
} from '../types';

// Singleton AudioContext and deduplication state across all components
let sharedAudioCtx: AudioContext | null = null;
let audioUnlocked = false;
const processedSoundMessageIds = new Set<string>();
const sessionBootTimestampMs = Date.now();
const audioUnlockListeners = new Set<(unlocked: boolean) => void>();

export const DEFAULT_CHAT_PREFERENCES = (userId: string): ChatNotificationPreferences => ({
  id: userId,
  userId,
  soundEnabled: true,
  soundVolume: 0.75,
  soundTone: 'CRISTAL',
  privateSoundEnabled: true,
  groupSoundEnabled: true,
  announcementSoundEnabled: true,
  muteActiveConversation: true,
  visualNotificationsEnabled: true,
  pushNotificationsEnabled: true,
  fcmTokens: [],
  updatedAt: new Date().toISOString(),
});

function getOrCreateAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!sharedAudioCtx) {
    const AudioCtxClass =
      window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AudioCtxClass) {
      sharedAudioCtx = new AudioCtxClass();
    }
  }
  return sharedAudioCtx;
}

export function isBrowserAudioUnlocked(): boolean {
  if (audioUnlocked) return true;
  if (sharedAudioCtx && sharedAudioCtx.state === 'running') {
    audioUnlocked = true;
    return true;
  }
  return false;
}

export function subscribeToAudioUnlockState(cb: (unlocked: boolean) => void): () => void {
  audioUnlockListeners.add(cb);
  cb(isBrowserAudioUnlocked());
  return () => {
    audioUnlockListeners.delete(cb);
  };
}

function notifyAudioUnlocked(state: boolean) {
  audioUnlocked = state;
  audioUnlockListeners.forEach((cb) => cb(state));
}

/**
 * Unlocks the browser's Web Audio API context after a user interaction (click, keydown, touchstart).
 */
export async function unlockChatAudioContext(): Promise<boolean> {
  try {
    const ctx = getOrCreateAudioContext();
    if (!ctx) return false;
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    // Play an inaudible 1ms buffer to permanently unlock iOS/Chrome autoplay policy
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
    notifyAudioUnlocked(ctx.state === 'running');
    return ctx.state === 'running';
  } catch {
    return false;
  }
}

// Automatically attach one-time global interaction listeners so first click anywhere unlocks audio
if (typeof window !== 'undefined') {
  const autoUnlockHandler = () => {
    unlockChatAudioContext().then((ok) => {
      if (ok) {
        window.removeEventListener('pointerdown', autoUnlockHandler);
        window.removeEventListener('keydown', autoUnlockHandler);
      }
    });
  };
  window.addEventListener('pointerdown', autoUnlockHandler, { passive: true });
  window.addEventListener('keydown', autoUnlockHandler, { passive: true });
}

/**
 * Plays a short, discrete, recognizable institutional notification sound using Web Audio API.
 */
export async function playChatNotificationBeep(
  tone: ChatSoundTone = 'CRISTAL',
  volume = 0.75
): Promise<boolean> {
  try {
    const ctx = getOrCreateAudioContext();
    if (!ctx) return false;
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    if (ctx.state !== 'running') {
      return false;
    }
    notifyAudioUnlocked(true);

    const safeVolume = Math.max(0.02, Math.min(1, Number.isFinite(volume) ? volume : 0.75));
    const now = ctx.currentTime;

    const scheduleNote = (
      freq: number,
      startOffset: number,
      duration: number,
      oscType: OscillatorType = 'sine',
      gainScale = 1
    ) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = oscType;
      osc.frequency.setValueAtTime(freq, now + startOffset);

      const peakGain = 0.28 * safeVolume * gainScale;
      gain.gain.setValueAtTime(0.0001, now + startOffset);
      gain.gain.exponentialRampToValueAtTime(peakGain, now + startOffset + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + startOffset + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + startOffset);
      osc.stop(now + startOffset + duration + 0.01);
    };

    if (tone === 'CRISTAL') {
      // Clear two-note ascending chime (C6 -> G6)
      scheduleNote(1046.5, 0, 0.14, 'sine', 0.9);
      scheduleNote(1567.98, 0.09, 0.22, 'sine', 1.0);
    } else if (tone === 'INSTITUTIONNEL') {
      // Soft triad chord (F5 -> A5 -> C6)
      scheduleNote(698.46, 0, 0.12, 'triangle', 0.8);
      scheduleNote(880.0, 0.07, 0.14, 'triangle', 0.9);
      scheduleNote(1046.5, 0.14, 0.24, 'sine', 1.0);
    } else if (tone === 'DISCRET') {
      // Single warm short ping (E6)
      scheduleNote(1318.51, 0, 0.16, 'sine', 0.85);
    } else {
      // MODERNE: Subtle double pop-pluck (D6 -> A6)
      scheduleNote(1174.66, 0, 0.1, 'sine', 0.9);
      scheduleNote(1760.0, 0.075, 0.18, 'triangle', 0.95);
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Pre-marks existing message IDs on initial load so historical messages never trigger a sound.
 */
export function markMessagesAsAlreadyKnownForSound(messageIds: string[]): void {
  messageIds.forEach((id) => {
    if (id) processedSoundMessageIds.add(id);
  });
}

/**
 * Evaluates a newly received message against all Section 6 rules:
 * - Never plays for own messages
 * - Never plays for historical messages loaded on startup
 * - Never plays on edits or deletions
 * - Never plays twice for the same message ID across multiple listeners
 * - Respects user preferences (master sound, private/group/announcement toggles, active conversation mute)
 */
export function handleIncomingMessageAlerts(params: {
  message: ChatConversationMessage;
  conversation?: ChatConversation;
  currentUserId: string;
  isAuthenticated: boolean;
  preferences: ChatNotificationPreferences;
  activeViewingConversationId: string | null;
  isChatWindowMinimized: boolean;
  onVisualAlert?: (info: {
    message: ChatConversationMessage;
    conversationTitle: string;
    conversationId: string;
  }) => void;
  onOpenConversation?: (conversationId: string) => void;
}): void {
  const {
    message,
    conversation,
    currentUserId,
    isAuthenticated,
    preferences,
    activeViewingConversationId,
    isChatWindowMinimized,
    onVisualAlert,
    onOpenConversation,
  } = params;

  // 1. Do not notify unauthenticated sessions or missing messages
  if (!isAuthenticated || !currentUserId || !message || !message.id) return;

  // 2. Never notify for messages sent by the current user
  if (message.senderId === currentUserId) {
    processedSoundMessageIds.add(message.id);
    return;
  }

  // 3. Never notify for deleted or edited messages
  if (message.deletedAt || message.editedAt) {
    processedSoundMessageIds.add(message.id);
    return;
  }

  // 4. Deduplicate strictly by unique message ID
  if (processedSoundMessageIds.has(message.id)) {
    return;
  }

  // 5. Ignore historical messages created before this browser session booted (with 4s clock-skew tolerance)
  const msgTimeMs = Date.parse(message.createdAt || '');
  if (!Number.isNaN(msgTimeMs) && msgTimeMs < sessionBootTimestampMs - 4000) {
    processedSoundMessageIds.add(message.id);
    return;
  }

  // Mark as processed immediately so no other listener can double-fire
  processedSoundMessageIds.add(message.id);

  const convType = conversation?.type || 'private';
  const convTitle =
    conversation?.type === 'private'
      ? message.senderName
      : conversation?.title || message.senderName;

  const isDocumentVisible =
    typeof document !== 'undefined' && document.visibilityState === 'visible';
  const isActivelyReadingThisConversation =
    isDocumentVisible &&
    !isChatWindowMinimized &&
    activeViewingConversationId === message.conversationId;

  // 6. Sound notification evaluation
  const typeSoundAllowed =
    (convType === 'private' && preferences.privateSoundEnabled) ||
    (convType === 'group' && preferences.groupSoundEnabled) ||
    (convType === 'announcement' && preferences.announcementSoundEnabled);

  const shouldPlayBeep =
    preferences.soundEnabled &&
    typeSoundAllowed &&
    !(isActivelyReadingThisConversation && preferences.muteActiveConversation);

  if (shouldPlayBeep) {
    playChatNotificationBeep(preferences.soundTone, preferences.soundVolume);
  }

  // 7. Visual in-app toast alert when not actively reading the conversation
  if (preferences.visualNotificationsEnabled && !isActivelyReadingThisConversation && onVisualAlert) {
    onVisualAlert({
      message,
      conversationTitle: convTitle,
      conversationId: message.conversationId,
    });
  }

  // 8. Browser / System Push Notification when app is in background or user is on another conversation
  if (
    (preferences.visualNotificationsEnabled || preferences.pushNotificationsEnabled) &&
    !isActivelyReadingThisConversation &&
    typeof window !== 'undefined' &&
    'Notification' in window &&
    Notification.permission === 'granted'
  ) {
    try {
      const prefix =
        convType === 'announcement'
          ? '📢 Annonce officielle EBM'
          : convType === 'group'
          ? `👥 ${convTitle}`
          : `💬 ${message.senderName}`;
      const bodyText =
        message.type === 'attachment' && message.attachment
          ? `${message.senderName} a envoyé une pièce jointe : ${message.attachment.name}`
          : `${convType !== 'private' ? `${message.senderName} : ` : ''}${message.text.slice(0, 120)}`;

      const notif = new Notification(prefix, {
        body: bodyText,
        tag: `ebm-chat-${message.id}`,
        silent: false,
      });
      notif.onclick = () => {
        window.focus();
        if (onOpenConversation) {
          onOpenConversation(message.conversationId);
        }
        notif.close();
      };
    } catch {
      // Fallback if ServiceWorker registration is required on mobile browsers
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready
          .then((reg) =>
            reg.showNotification(convTitle, {
              body: message.text.slice(0, 120),
              tag: `ebm-chat-${message.id}`,
              data: { conversationId: message.conversationId },
            })
          )
          .catch(() => {});
      }
    }
  }
}

/**
 * Requests Browser Notification permission and registers an FCM token when supported.
 */
export async function requestChatPushPermissionAndToken(): Promise<{
  permission: NotificationPermission | 'unsupported';
  fcmToken?: string;
}> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { permission: 'unsupported' };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { permission };
    }

    const messaging = await getFirebaseMessaging();
    if (!messaging) {
      return { permission };
    }

    try {
      const reg =
        'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
      const token = await getToken(messaging, {
        serviceWorkerRegistration: reg,
      });
      return { permission, fcmToken: token || undefined };
    } catch {
      return { permission };
    }
  } catch {
    return { permission: Notification.permission };
  }
}

export function subscribeToForegroundFcmMessages(
  onPayload: (payload: unknown) => void
): () => void {
  let unsubscribe = () => {};
  getFirebaseMessaging().then((messaging) => {
    if (messaging) {
      unsubscribe = onMessage(messaging, (payload) => {
        onPayload(payload);
      });
    }
  });
  return () => unsubscribe();
}
