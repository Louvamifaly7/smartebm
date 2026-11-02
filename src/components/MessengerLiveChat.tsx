import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  MessageCircle,
  X,
  Minus,
  Send,
  Paperclip,
  Smile,
  ChevronUp,
  ChevronDown,
  Search,
  Volume2,
  VolumeX,
  Check,
  CheckCheck,
  Reply,
  Edit3,
  Trash2,
  FileText,
  Download,
  Users,
  Megaphone,
  History,
  BellRing,
  Circle,
  ShieldAlert,
} from 'lucide-react';
import {
  ChatAttachment,
  ChatConversation,
  ChatConversationMessage,
  PresenceStatus,
  User,
} from '../types';
import { canUserPublishOfficialAnnouncement } from '../services/chatRealtimeService';
import { showAppToast } from './ToastAndConfirmCenter';

const PRESENCE_META: Record<
  PresenceStatus,
  { label: string; dotClass: string; badgeClass: string }
> = {
  ONLINE: {
    label: 'En ligne',
    dotClass: 'bg-emerald-500',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  },
  IDLE: {
    label: 'Inactif',
    dotClass: 'bg-amber-400',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  },
  DND: {
    label: 'Ne pas déranger',
    dotClass: 'bg-rose-500',
    badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  },
  OFFLINE: {
    label: 'Hors ligne',
    dotClass: 'bg-slate-400',
    badgeClass: 'bg-slate-700 text-slate-300 border-slate-600',
  },
};

const QUICK_EMOJIS = ['👍', '❤️', '👏', '🎓', '🙏', '✅', '📄', '✨'];

function formatMessageTime(isoStr: string): string {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return isoStr;
  const now = new Date();
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const timePart = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  if (isToday) return timePart;
  return `${d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} ${timePart}`;
}

function formatLastSeen(isoStr?: string): string {
  if (!isoStr) return 'Jamais connecté';
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return 'Hors ligne';
  return `Vu le ${d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
  })} à ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
}

export const MessengerLiveChat: React.FC = () => {
  const {
    currentUser,
    users,
    appSettings,
    getUserEffectivePresence,
    myManualPresenceStatus,
    updateMyPresenceManualStatus,
    accessibleConversations,
    chatMessagesByConv,
    activeChatConversationId,
    setActiveChatConversationId,
    isFloatingChatOpen,
    setIsFloatingChatOpen,
    isFloatingChatMinimized,
    setIsFloatingChatMinimized,
    typingIndicatorsByConv,
    chatPreferences,
    updateChatNotificationPreferences,
    audioUnlocked,
    enableChatSoundEngine,
    totalUnreadChatCount,
    getConversationUnreadCount,
    openPrivateConversationWithUser,
    sendConversationMessage,
    editConversationMessage,
    deleteConversationMessage,
    markConversationAsRead,
    setTypingInConversation,
    loadOlderConversationMessages,
    uploadAttachmentToConversation,
  } = useApp();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'USERS' | 'PRIVATE' | 'GROUPS' | 'ANNOUNCEMENTS'>(
    'USERS'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState<ChatConversationMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatConversationMessage | null>(null);
  const [pendingAttachment, setPendingAttachment] = useState<ChatAttachment | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [showEmojiBar, setShowEmojiBar] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeConversation: ChatConversation | undefined = accessibleConversations.find(
    (c) => c.id === activeChatConversationId
  );

  const activeMessages: ChatConversationMessage[] = activeChatConversationId
    ? chatMessagesByConv[activeChatConversationId] || []
    : [];

  const activeTypingEntries = activeChatConversationId
    ? typingIndicatorsByConv[activeChatConversationId] || []
    : [];

  // Auto-scroll when messages arrive in open floating window
  useEffect(() => {
    if (isFloatingChatOpen && !isFloatingChatMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeMessages.length, activeChatConversationId, isFloatingChatOpen, isFloatingChatMinimized]);

  // Mark conversation as read ONLY when actively open, unminimized, and visible
  useEffect(() => {
    if (
      activeChatConversationId &&
      isFloatingChatOpen &&
      !isFloatingChatMinimized &&
      typeof document !== 'undefined' &&
      document.visibilityState === 'visible'
    ) {
      markConversationAsRead(activeChatConversationId);
    }
  }, [
    activeChatConversationId,
    isFloatingChatOpen,
    isFloatingChatMinimized,
    activeMessages.length,
  ]);

  if (appSettings.showLiveChat === false || !currentUser) return null;

  // All active & authorized EBM users (excluding currentUser)
  const directoryUsers = users
    .filter((u) => u.isActive && u.id !== currentUser.id)
    .filter((u) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        u.name.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        (u.matricule || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const presA = getUserEffectivePresence(a.id).status;
      const presB = getUserEffectivePresence(b.id).status;
      const rank: Record<PresenceStatus, number> = {
        ONLINE: 0,
        IDLE: 1,
        DND: 2,
        OFFLINE: 3,
      };
      if (rank[presA] !== rank[presB]) return rank[presA] - rank[presB];
      return a.name.localeCompare(b.name);
    });

  const onlineCount = directoryUsers.filter(
    (u) => getUserEffectivePresence(u.id).status !== 'OFFLINE'
  ).length;

  const privateConversations = accessibleConversations.filter((c) => c.type === 'private');
  const groupConversations = accessibleConversations.filter((c) => c.type === 'group');
  const announcementConversations = accessibleConversations.filter(
    (c) => c.type === 'announcement'
  );

  const getConversationDisplayInfo = (conv: ChatConversation) => {
    if (conv.type === 'private') {
      const partnerId = conv.participantIds.find((id) => id !== currentUser.id);
      const partner = users.find((u) => u.id === partnerId);
      const presence = partnerId
        ? getUserEffectivePresence(partnerId)
        : { status: 'OFFLINE' as PresenceStatus, activeDeviceCount: 0 };
      return {
        title: partner?.name || conv.title,
        subtitle: partner
          ? `${PRESENCE_META[presence.status].label} • ${partner.role}`
          : 'Conversation privée',
        avatarText: (partner?.name || conv.title).substring(0, 2).toUpperCase(),
        presence,
        partner,
      };
    }
    if (conv.type === 'announcement') {
      return {
        title: conv.title,
        subtitle: 'Canal officiel EBM Institute',
        avatarText: '📢',
        presence: null,
        partner: undefined,
      };
    }
    return {
      title: conv.title,
      subtitle: `${conv.participantIds.length} participants • Groupe pédagogique`,
      avatarText: conv.title.substring(0, 2).toUpperCase(),
      presence: null,
      partner: undefined,
    };
  };

  const handleOpenUserChat = (user: User) => {
    const conv = openPrivateConversationWithUser(user.id, true);
    if (conv) {
      markConversationAsRead(conv.id);
    }
  };

  const handleOpenConversation = (conv: ChatConversation) => {
    setActiveChatConversationId(conv.id);
    setIsFloatingChatOpen(true);
    setIsFloatingChatMinimized(false);
    setReplyingTo(null);
    setEditingMessage(null);
    markConversationAsRead(conv.id);
  };

  const handleInputChange = (val: string) => {
    setInputText(val);
    if (!activeChatConversationId) return;

    setTypingInConversation(activeChatConversationId, val.trim().length > 0);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (activeChatConversationId) {
        setTypingInConversation(activeChatConversationId, false);
      }
    }, 2500);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !activeChatConversationId) return;

    setIsUploadingFile(true);
    const res = await uploadAttachmentToConversation(activeChatConversationId, file);
    setIsUploadingFile(false);

    if (!res.success || !res.attachment) {
      showAppToast({
        title: 'Pièce jointe refusée',
        message: res.error || 'Impossible de joindre ce fichier.',
        type: 'error',
      });
      return;
    }
    setPendingAttachment(res.attachment);
  };

  const handleSubmitMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChatConversationId) return;

    if (editingMessage) {
      if (!inputText.trim()) return;
      const res = await editConversationMessage(
        activeChatConversationId,
        editingMessage.id,
        inputText
      );
      if (!res.success) {
        showAppToast({
          title: 'Erreur de modification',
          message: res.error || 'Modification impossible.',
          type: 'error',
        });
        return;
      }
      setEditingMessage(null);
      setInputText('');
      return;
    }

    if (!inputText.trim() && !pendingAttachment) return;
    const textToSend = inputText;
    const attachmentToSend = pendingAttachment || undefined;
    const replyId = replyingTo?.id;

    setInputText('');
    setPendingAttachment(null);
    setReplyingTo(null);

    const res = await sendConversationMessage({
      conversationId: activeChatConversationId,
      text: textToSend,
      attachment: attachmentToSend,
      replyToMessageId: replyId,
    });

    if (!res.success) {
      showAppToast({
        title: 'Envoi refusé',
        message: res.error || "Impossible d'envoyer ce message.",
        type: 'error',
      });
    }
  };

  const handleLoadOlder = async () => {
    if (!activeChatConversationId || isLoadingOlder) return;
    setIsLoadingOlder(true);
    await loadOlderConversationMessages(activeChatConversationId);
    setIsLoadingOlder(false);
  };

  const canWriteInActiveConversation = (() => {
    if (!activeConversation) return false;
    if (activeConversation.type === 'announcement') {
      return (
        canUserPublishOfficialAnnouncement(currentUser) ||
        activeConversation.metadata?.allowReplies === true
      );
    }
    return true;
  })();

  const activeDisplay = activeConversation
    ? getConversationDisplayInfo(activeConversation)
    : null;

  return (
    <div className="fixed bottom-16 lg:bottom-0 right-3 sm:right-4 z-40 flex flex-col sm:flex-row items-end gap-2 sm:gap-3 pointer-events-none select-none max-w-[calc(100vw-1.5rem)]">
      {/* 1. Active Floating Conversation Window */}
      {isFloatingChatOpen && activeConversation && activeDisplay && (
        <div
          className={`pointer-events-auto bg-white rounded-2xl lg:rounded-b-none lg:rounded-t-2xl shadow-2xl border border-slate-300 w-[calc(100vw-1.5rem)] sm:w-88 md:w-96 flex flex-col transition-all duration-200 overflow-hidden ${
            isFloatingChatMinimized ? 'h-13' : 'h-[430px] sm:h-[490px] max-h-[75vh]'
          }`}
        >
          {/* Header */}
          <div className="bg-slate-900 text-white px-3 py-2.5 flex items-center justify-between border-b border-slate-800 shrink-0">
            <div
              onClick={() => setIsFloatingChatMinimized(!isFloatingChatMinimized)}
              className="flex items-center gap-2.5 cursor-pointer min-w-0 flex-1"
            >
              <div className="relative shrink-0">
                <div className="w-8 h-8 rounded-full bg-blue-700 text-white font-bold text-xs flex items-center justify-center border border-blue-400">
                  {activeDisplay.avatarText}
                </div>
                {activeDisplay.presence && (
                  <span
                    className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-slate-900 ${
                      PRESENCE_META[activeDisplay.presence.status].dotClass
                    }`}
                  />
                )}
              </div>
              <div className="truncate">
                <span className="font-bold text-xs block text-white truncate leading-tight">
                  {activeDisplay.title}
                </span>
                <span className="text-[10px] text-slate-300 font-medium block truncate leading-tight">
                  {activeDisplay.presence && activeDisplay.presence.status === 'OFFLINE'
                    ? formatLastSeen(activeDisplay.presence.lastSeenAt)
                    : activeDisplay.subtitle}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 text-slate-300 shrink-0">
              <button
                type="button"
                onClick={handleLoadOlder}
                className="p-1 hover:text-white hover:bg-slate-800 rounded"
                title="Charger les messages précédents"
              >
                <History className={`w-3.5 h-3.5 ${isLoadingOlder ? 'animate-spin' : ''}`} />
              </button>
              <button
                type="button"
                onClick={() => setIsFloatingChatMinimized(!isFloatingChatMinimized)}
                className="p-1 hover:text-white hover:bg-slate-800 rounded"
                title={isFloatingChatMinimized ? 'Agrandir' : 'Réduire'}
              >
                {isFloatingChatMinimized ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <Minus className="w-4 h-4" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setIsFloatingChatOpen(false)}
                className="p-1 hover:text-white hover:bg-slate-800 rounded"
                title="Fermer la fenêtre"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!isFloatingChatMinimized && (
            <>
              {/* Messages Feed */}
              <div className="flex-1 p-3 overflow-y-auto space-y-2.5 bg-slate-50 text-xs text-slate-800">
                <div className="text-center py-1.5 text-[10px] text-slate-400 border-b border-slate-200/70 mb-2">
                  {activeConversation.type === 'announcement' ? (
                    <span>Canal officiel de diffusion institutionnelle EBM Institute</span>
                  ) : activeConversation.type === 'group' ? (
                    <span>{activeConversation.metadata?.description || activeDisplay.title}</span>
                  ) : (
                    <span>
                      Conversation directe avec <strong>{activeDisplay.title}</strong>
                    </span>
                  )}
                </div>

                {activeMessages.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 text-[11px]">
                    Aucun message pour le moment. Envoyez le premier message !
                  </div>
                ) : (
                  activeMessages.map((msg) => {
                    const isMe = msg.senderId === currentUser.id;
                    const isDeleted = Boolean(msg.deletedAt);
                    const otherDeliveredIds = Object.keys(msg.deliveredTo || {}).filter(
                      (uid) => uid !== msg.senderId
                    );
                    const otherReadIds = Object.keys(msg.readBy || {}).filter(
                      (uid) => uid !== msg.senderId
                    );
                    const readByNames = otherReadIds
                      .map((uid) => users.find((u) => u.id === uid)?.name || uid)
                      .join(', ');

                    return (
                      <div
                        key={msg.id}
                        className={`group flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        {!isMe && activeConversation.type !== 'private' && (
                          <span className="text-[10px] font-bold text-slate-600 mb-0.5 px-1">
                            {msg.senderName}{' '}
                            <span className="text-[9px] font-normal text-slate-400">
                              ({msg.senderRole})
                            </span>
                          </span>
                        )}

                        <div className="flex items-center gap-1 max-w-[86%]">
                          {isMe && !isDeleted && (
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 text-slate-400">
                              <button
                                type="button"
                                onClick={() => {
                                  setReplyingTo(msg);
                                  setEditingMessage(null);
                                }}
                                className="p-1 hover:text-blue-600 rounded"
                                title="Répondre"
                              >
                                <Reply className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingMessage(msg);
                                  setReplyingTo(null);
                                  setInputText(msg.text);
                                }}
                                className="p-1 hover:text-amber-600 rounded"
                                title="Modifier"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  deleteConversationMessage(activeConversation.id, msg.id)
                                }
                                className="p-1 hover:text-rose-600 rounded"
                                title="Supprimer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}

                          <div
                            className={`rounded-2xl px-3 py-2 text-xs leading-relaxed shadow-2xs ${
                              isDeleted
                                ? 'bg-slate-100 text-slate-400 italic border border-slate-200'
                                : isMe
                                ? 'bg-blue-600 text-white rounded-br-xs'
                                : msg.type === 'announcement'
                                ? 'bg-amber-50 text-slate-900 border border-amber-300 rounded-bl-xs'
                                : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs'
                            }`}
                          >
                            {/* Quoted reply preview */}
                            {msg.replyToPreview && !isDeleted && (
                              <div
                                className={`mb-1.5 pl-2 border-l-2 text-[10px] rounded py-0.5 ${
                                  isMe
                                    ? 'border-blue-200 bg-blue-700/50 text-blue-100'
                                    : 'border-blue-500 bg-slate-100 text-slate-600'
                                }`}
                              >
                                <span className="font-bold block">
                                  {msg.replyToPreview.senderName}
                                </span>
                                <span className="line-clamp-1">{msg.replyToPreview.text}</span>
                              </div>
                            )}

                            {/* Attachment preview */}
                            {msg.attachment && !isDeleted && (
                              <div className="mb-1.5">
                                {['JPG', 'JPEG', 'PNG'].includes(
                                  msg.attachment.extension.toUpperCase()
                                ) ? (
                                  <a
                                    href={msg.attachment.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download={msg.attachment.name}
                                    className="block rounded-lg overflow-hidden border border-white/20 mb-1"
                                  >
                                    <img
                                      src={msg.attachment.url}
                                      alt={msg.attachment.name}
                                      className="max-h-40 w-auto object-cover rounded"
                                    />
                                  </a>
                                ) : (
                                  <a
                                    href={msg.attachment.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download={msg.attachment.name}
                                    className={`flex items-center gap-2 p-2 rounded-lg border text-[11px] ${
                                      isMe
                                        ? 'bg-blue-700/60 border-blue-400/40 text-white'
                                        : 'bg-slate-50 border-slate-200 text-slate-800'
                                    }`}
                                  >
                                    <FileText className="w-4 h-4 shrink-0" />
                                    <div className="min-w-0 flex-1">
                                      <span className="font-bold block truncate">
                                        {msg.attachment.name}
                                      </span>
                                      <span className="text-[9px] opacity-80">
                                        {msg.attachment.extension} • {msg.attachment.sizeFormatted}
                                      </span>
                                    </div>
                                    <Download className="w-3.5 h-3.5 shrink-0" />
                                  </a>
                                )}
                              </div>
                            )}

                            <span className="whitespace-pre-wrap break-words">{msg.text}</span>
                          </div>

                          {!isMe && !isDeleted && (
                            <button
                              type="button"
                              onClick={() => {
                                setReplyingTo(msg);
                                setEditingMessage(null);
                              }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-blue-600 rounded"
                              title="Répondre"
                            >
                              <Reply className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        {/* Timestamp + Edited + Delivery/Read Receipt */}
                        <div className="flex items-center gap-1 mt-0.5 px-1 text-[9px] text-slate-400">
                          <span className="font-mono">{formatMessageTime(msg.createdAt)}</span>
                          {msg.editedAt && !isDeleted && <span>• modifié</span>}
                          {isMe && !isDeleted && (
                            <span
                              className="inline-flex items-center gap-0.5 ml-0.5"
                              title={
                                otherReadIds.length > 0
                                  ? `Lu par : ${readByNames}`
                                  : otherDeliveredIds.length > 0
                                  ? 'Reçu par le destinataire'
                                  : 'Envoyé'
                              }
                            >
                              {otherReadIds.length > 0 ? (
                                <CheckCheck className="w-3 h-3 text-blue-600" />
                              ) : otherDeliveredIds.length > 0 ? (
                                <CheckCheck className="w-3 h-3 text-slate-400" />
                              ) : (
                                <Check className="w-3 h-3 text-slate-400" />
                              )}
                              <span>
                                {otherReadIds.length > 0
                                  ? 'Lu'
                                  : otherDeliveredIds.length > 0
                                  ? 'Reçu'
                                  : 'Envoyé'}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Real-Time Typing Indicator */}
                {activeTypingEntries.length > 0 && (
                  <div className="flex items-center gap-1.5 text-[11px] text-blue-600 font-medium italic px-2 py-1">
                    <span className="flex gap-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce" />
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:300ms]" />
                    </span>
                    <span>
                      {activeTypingEntries.map((t) => t.userName).join(', ')} est en train
                      d'écrire…
                    </span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Reply / Edit / Pending Attachment Banners */}
              {(replyingTo || editingMessage || pendingAttachment) && (
                <div className="px-3 py-1.5 bg-blue-50 border-t border-blue-200 flex items-center justify-between gap-2 text-[11px]">
                  <div className="truncate text-slate-700">
                    {editingMessage && (
                      <span>
                        <strong className="text-amber-700">Modification :</strong>{' '}
                        {editingMessage.text}
                      </span>
                    )}
                    {replyingTo && (
                      <span>
                        <strong className="text-blue-700">
                          Réponse à {replyingTo.senderName} :
                        </strong>{' '}
                        {replyingTo.text}
                      </span>
                    )}
                    {pendingAttachment && (
                      <span>
                        <strong className="text-emerald-700">Pièce jointe :</strong>{' '}
                        {pendingAttachment.name} ({pendingAttachment.sizeFormatted})
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setReplyingTo(null);
                      setEditingMessage(null);
                      setPendingAttachment(null);
                    }}
                    className="text-slate-400 hover:text-slate-700 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Quick Emoji Bar */}
              {showEmojiBar && canWriteInActiveConversation && (
                <div className="px-3 py-1.5 bg-white border-t border-slate-100 flex items-center justify-between">
                  <div className="flex gap-1.5">
                    {QUICK_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setInputText((prev) => `${prev}${emoji}`)}
                        className="hover:scale-125 transition-transform text-sm cursor-pointer"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowEmojiBar(false)}
                    className="text-[10px] text-slate-400 hover:text-slate-600"
                  >
                    Fermer
                  </button>
                </div>
              )}

              {/* Composer or Read-Only Notice */}
              {canWriteInActiveConversation ? (
                <form
                  onSubmit={handleSubmitMessage}
                  className="p-2 bg-white border-t border-slate-200 flex items-center gap-1"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.xlsx,.pptx,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingFile}
                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                    title="Joindre un fichier (PDF, DOCX, XLSX, PPTX, JPG, PNG - max 10 Mo)"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEmojiBar(!showEmojiBar)}
                    className="p-1.5 text-slate-500 hover:text-amber-500 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                    title="Emojis"
                  >
                    <Smile className="w-4 h-4" />
                  </button>
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => handleInputChange(e.target.value)}
                    placeholder={
                      isUploadingFile ? 'Téléversement en cours...' : 'Écrire un message...'
                    }
                    className="flex-1 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-full text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim() && !pendingAttachment}
                    className="p-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-full transition-colors cursor-pointer shrink-0"
                    title="Envoyer"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              ) : (
                <div className="p-2.5 bg-slate-100 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Seule la Direction ou la Scolarité peut publier dans ce canal.</span>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* 2. Permanent Bottom-Right Messenger Dock */}
      <div className="pointer-events-auto flex flex-col items-end">
        {isDrawerOpen && (
          <div className="bg-white rounded-2xl lg:rounded-b-none lg:rounded-t-2xl shadow-2xl border border-slate-300 w-[calc(100vw-1.5rem)] sm:w-80 md:w-88 h-[430px] sm:h-[490px] max-h-[75vh] flex flex-col mb-1.5 lg:mb-1 overflow-hidden">
            {/* Drawer Header */}
            <div className="bg-slate-900 text-white p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-xs">Messagerie EBM Institute</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-bold">
                    {onlineCount} en ligne
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      updateChatNotificationPreferences({
                        soundEnabled: !chatPreferences.soundEnabled,
                      })
                    }
                    className={`p-1 rounded transition-colors ${
                      chatPreferences.soundEnabled
                        ? 'text-emerald-400 hover:bg-slate-800'
                        : 'text-slate-500 hover:bg-slate-800'
                    }`}
                    title={
                      chatPreferences.soundEnabled
                        ? 'Son des notifications activé (cliquer pour couper)'
                        : 'Son des notifications coupé (cliquer pour activer)'
                    }
                  >
                    {chatPreferences.soundEnabled ? (
                      <Volume2 className="w-4 h-4" />
                    ) : (
                      <VolumeX className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsDrawerOpen(false)}
                    className="text-slate-400 hover:text-white p-1 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* My Status Selector */}
              <div className="flex items-center justify-between gap-2 text-[10px] bg-slate-800/90 px-2.5 py-1.5 rounded-lg">
                <span className="text-slate-300 font-medium">Mon statut :</span>
                <div className="flex items-center gap-1">
                  {(['ONLINE', 'IDLE', 'DND'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => updateMyPresenceManualStatus(st)}
                      className={`px-2 py-0.5 rounded font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                        myManualPresenceStatus === st
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${PRESENCE_META[st].dotClass}`} />
                      <span>{PRESENCE_META[st].label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Audio Unlock Prompt if browser blocked autoplay */}
              {!audioUnlocked && chatPreferences.soundEnabled && (
                <button
                  type="button"
                  onClick={enableChatSoundEngine}
                  className="w-full py-1.5 px-2.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 rounded-lg text-amber-200 text-[10px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <BellRing className="w-3.5 h-3.5 text-amber-300 animate-bounce" />
                  <span>Activer les notifications sonores</span>
                </button>
              )}
            </div>

            {/* Navigation Tabs */}
            <div className="grid grid-cols-4 bg-slate-100 border-b border-slate-200 text-[10px] font-bold text-slate-600">
              <button
                type="button"
                onClick={() => setDrawerTab('USERS')}
                className={`py-2 text-center border-b-2 transition-colors cursor-pointer ${
                  drawerTab === 'USERS'
                    ? 'border-blue-600 text-blue-600 bg-white'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                Annuaire ({directoryUsers.length})
              </button>
              <button
                type="button"
                onClick={() => setDrawerTab('PRIVATE')}
                className={`py-2 text-center border-b-2 transition-colors cursor-pointer ${
                  drawerTab === 'PRIVATE'
                    ? 'border-blue-600 text-blue-600 bg-white'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                Privés ({privateConversations.length})
              </button>
              <button
                type="button"
                onClick={() => setDrawerTab('GROUPS')}
                className={`py-2 text-center border-b-2 transition-colors cursor-pointer ${
                  drawerTab === 'GROUPS'
                    ? 'border-blue-600 text-blue-600 bg-white'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                Groupes ({groupConversations.length})
              </button>
              <button
                type="button"
                onClick={() => setDrawerTab('ANNOUNCEMENTS')}
                className={`py-2 text-center border-b-2 transition-colors cursor-pointer ${
                  drawerTab === 'ANNOUNCEMENTS'
                    ? 'border-blue-600 text-blue-600 bg-white'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                Annonces
              </button>
            </div>

            {/* Search Filter */}
            <div className="p-2 border-b border-slate-100 bg-slate-50">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher un utilisateur, groupe..."
                  className="w-full pl-7 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
              </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 text-xs">
              {drawerTab === 'USERS' &&
                directoryUsers.map((user) => {
                  const pres = getUserEffectivePresence(user.id);
                  const convId = [currentUser.id, user.id].sort().join('__');
                  const fullConvId = `priv__${convId}`;
                  const unread = getConversationUnreadCount(fullConvId);

                  return (
                    <div
                      key={user.id}
                      onClick={() => handleOpenUserChat(user)}
                      className="p-2.5 hover:bg-blue-50/80 transition-colors cursor-pointer flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative shrink-0">
                          <div className="w-8 h-8 rounded-full bg-slate-800 text-white font-bold text-[10px] flex items-center justify-center">
                            {user.name.substring(0, 2).toUpperCase()}
                          </div>
                          <span
                            className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white ${
                              PRESENCE_META[pres.status].dotClass
                            }`}
                          />
                        </div>
                        <div className="min-w-0">
                          <span className="font-semibold text-slate-900 block truncate">
                            {user.name}
                          </span>
                          <span className="text-[10px] text-slate-500 block truncate">
                            {PRESENCE_META[pres.status].label} • {user.role}
                            {pres.status === 'OFFLINE' && pres.lastSeenAt
                              ? ` • ${formatLastSeen(pres.lastSeenAt)}`
                              : ''}
                          </span>
                        </div>
                      </div>

                      {unread > 0 && (
                        <span className="px-1.5 py-0.5 bg-red-500 text-white font-bold text-[10px] rounded-full shrink-0">
                          {unread}
                        </span>
                      )}
                    </div>
                  );
                })}

              {drawerTab === 'PRIVATE' &&
                (privateConversations.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-[11px]">
                    Aucune conversation privée récente. Cliquez sur un utilisateur dans l'annuaire
                    pour démarrer.
                  </div>
                ) : (
                  privateConversations
                    .filter((c) =>
                      getConversationDisplayInfo(c)
                        .title.toLowerCase()
                        .includes(searchQuery.toLowerCase())
                    )
                    .map((conv) => {
                      const info = getConversationDisplayInfo(conv);
                      const unread = getConversationUnreadCount(conv.id);
                      return (
                        <div
                          key={conv.id}
                          onClick={() => handleOpenConversation(conv)}
                          className="p-2.5 hover:bg-blue-50/80 transition-colors cursor-pointer flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="relative shrink-0">
                              <div className="w-8 h-8 rounded-full bg-blue-700 text-white font-bold text-[10px] flex items-center justify-center">
                                {info.avatarText}
                              </div>
                              {info.presence && (
                                <span
                                  className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white ${
                                    PRESENCE_META[info.presence.status].dotClass
                                  }`}
                                />
                              )}
                            </div>
                            <div className="min-w-0">
                              <span className="font-semibold text-slate-900 block truncate">
                                {info.title}
                              </span>
                              <span className="text-[10px] text-slate-500 block truncate">
                                {conv.lastMessage?.text || info.subtitle}
                              </span>
                            </div>
                          </div>
                          {unread > 0 && (
                            <span className="px-1.5 py-0.5 bg-red-500 text-white font-bold text-[10px] rounded-full shrink-0">
                              {unread}
                            </span>
                          )}
                        </div>
                      );
                    })
                ))}

              {drawerTab === 'GROUPS' &&
                groupConversations
                  .filter((c) => c.title.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((conv) => {
                    const unread = getConversationUnreadCount(conv.id);
                    return (
                      <div
                        key={conv.id}
                        onClick={() => handleOpenConversation(conv)}
                        className="p-2.5 hover:bg-blue-50/80 transition-colors cursor-pointer flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                            <Users className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-slate-900 block truncate">
                              {conv.title}
                            </span>
                            <span className="text-[10px] text-slate-500 block truncate">
                              {conv.lastMessage
                                ? `${conv.lastMessage.senderName}: ${conv.lastMessage.text}`
                                : `${conv.participantIds.length} membres`}
                            </span>
                          </div>
                        </div>
                        {unread > 0 && (
                          <span className="px-1.5 py-0.5 bg-red-500 text-white font-bold text-[10px] rounded-full shrink-0">
                            {unread}
                          </span>
                        )}
                      </div>
                    );
                  })}

              {drawerTab === 'ANNOUNCEMENTS' &&
                announcementConversations.map((conv) => {
                  const unread = getConversationUnreadCount(conv.id);
                  return (
                    <div
                      key={conv.id}
                      onClick={() => handleOpenConversation(conv)}
                      className="p-3 hover:bg-amber-50/80 transition-colors cursor-pointer flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 font-bold text-xs flex items-center justify-center shrink-0">
                          <Megaphone className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-slate-900 block truncate">
                            {conv.title}
                          </span>
                          <span className="text-[10px] text-slate-500 block truncate">
                            {conv.lastMessage?.text ||
                              'Annonces officielles de la Direction EBM'}
                          </span>
                        </div>
                      </div>
                      {unread > 0 && (
                        <span className="px-1.5 py-0.5 bg-red-500 text-white font-bold text-[10px] rounded-full shrink-0">
                          {unread}
                        </span>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Bottom Floating Dock Button */}
        <button
          type="button"
          onClick={() => setIsDrawerOpen(!isDrawerOpen)}
          className="bg-slate-900 hover:bg-slate-800 text-white p-3 sm:px-4 sm:py-2.5 rounded-full lg:rounded-b-none lg:rounded-t-xl shadow-xl border border-slate-700 flex items-center gap-2 transition-all cursor-pointer font-bold text-xs"
        >
          <div className="relative">
            <MessageCircle className="w-4 h-4 text-emerald-400" />
            <span
              className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${
                PRESENCE_META[myManualPresenceStatus].dotClass
              }`}
            />
          </div>
          <span className="hidden sm:inline">
            Discussion & En Ligne ({onlineCount}/{directoryUsers.length + 1})
          </span>
          <span className="sm:hidden text-[11px]">Chat ({onlineCount})</span>
          {totalUnreadChatCount > 0 && (
            <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full animate-bounce">
              {totalUnreadChatCount}
            </span>
          )}
          {isDrawerOpen ? (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
          )}
        </button>
      </div>
    </div>
  );
};
