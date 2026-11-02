import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  ChatAttachment,
  ChatConversation,
  ChatConversationMessage,
  ChatSoundTone,
  GroupPost,
  PresenceStatus,
  User as SisUser,
} from '../types';
import {
  MessageSquare,
  Users,
  Send,
  Pin,
  Trash2,
  CheckCircle2,
  Plus,
  Paperclip,
  Bell,
  Search,
  Lock,
  Volume2,
  VolumeX,
  Check,
  CheckCheck,
  Reply,
  Edit3,
  FileText,
  Download,
  Megaphone,
  History,
  BellRing,
  Smile,
  ShieldAlert,
  Info,
  Sliders,
  Mail,
  UserPlus,
  X,
  Eye,
} from 'lucide-react';
import { getTeachersForStudent } from '../utils/studentVisibility';
import { canUserPublishOfficialAnnouncement } from '../services/chatRealtimeService';
import { showAppToast } from './ToastAndConfirmCenter';

const PRESENCE_META: Record<
  PresenceStatus,
  { label: string; dotClass: string; badgeClass: string }
> = {
  ONLINE: {
    label: 'En ligne',
    dotClass: 'bg-emerald-500',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  IDLE: {
    label: 'Inactif',
    dotClass: 'bg-amber-400',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  DND: {
    label: 'Ne pas déranger',
    dotClass: 'bg-rose-500',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  OFFLINE: {
    label: 'Hors ligne',
    dotClass: 'bg-slate-400',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
  },
};

const QUICK_EMOJIS = ['👍', '❤️', '👏', '🎓', '🙏', '✅', '📄', '✨', '📌', '🎉'];

function formatDateTimeShort(isoStr?: string): string {
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

function formatLastSeenFull(isoStr?: string): string {
  if (!isoStr) return 'Aucune connexion récente';
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return 'Hors ligne';
  return `Dernière connexion le ${d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })} à ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
}

export const CommunicationHub: React.FC = () => {
  const {
    currentUser,
    users,
    groups,
    filieres,
    courses,
    ecs,
    sessions,
    internalMessages,
    groupPosts,
    sendMessage,
    markMessageAsRead,
    createGroupPost,
    deleteGroupPost,
    getUserEffectivePresence,
    myManualPresenceStatus,
    updateMyPresenceManualStatus,
    accessibleConversations,
    chatMessagesByConv,
    activeChatConversationId,
    setActiveChatConversationId,
    typingIndicatorsByConv,
    chatPreferences,
    updateChatNotificationPreferences,
    audioUnlocked,
    enableChatSoundEngine,
    testChatSound,
    enablePushNotifications,
    totalUnreadChatCount,
    getConversationUnreadCount,
    openPrivateConversationWithUser,
    createCustomGroupConversation,
    sendConversationMessage,
    editConversationMessage,
    deleteConversationMessage,
    markConversationAsRead,
    setTypingInConversation,
    loadOlderConversationMessages,
    uploadAttachmentToConversation,
    toggleConversationAllowReplies,
  } = useApp();

  const isStudent = currentUser.role === 'STUDENT';
  const isStaff = ['ADMIN', 'TEACHER', 'ACADEMIC_HEAD', 'SCHEDULER', 'SCOLARITE'].includes(
    currentUser.role
  );

  const [activeTab, setActiveTab] = useState<'MESSENGER' | 'WALL' | 'INTERNAL_MAIL'>('MESSENGER');

  // Left Column Filter state
  const [leftFilter, setLeftFilter] = useState<
    'ALL' | 'ONLINE' | 'PRIVATE' | 'GROUPS' | 'ANNOUNCEMENTS' | 'DIRECTORY'
  >('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Center Column Composer state
  const [chatInput, setChatInput] = useState('');
  const [replyingTo, setReplyingTo] = useState<ChatConversationMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatConversationMessage | null>(null);
  const [pendingAttachment, setPendingAttachment] = useState<ChatAttachment | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [inspectedReceiptsMsgId, setInspectedReceiptsMsgId] = useState<string | null>(null);

  // Right Column Panel state
  const [rightPanelTab, setRightPanelTab] = useState<'INFO' | 'SETTINGS'>('INFO');
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupForm, setNewGroupForm] = useState({
    title: '',
    description: '',
    groupId: '',
    participantIds: [] as string[],
  });

  // Legacy Mail & Wall state
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>('');
  const [selectedRecipientGroupId, setSelectedRecipientGroupId] = useState<string>('');
  const [messageSubject, setMessageSubject] = useState<string>('');
  const [messageContent, setMessageContent] = useState<string>('');
  const [messageSendNotice, setMessageSendNotice] = useState<string | null>(null);

  const effectiveGroupId = isStudent
    ? currentUser.groupId || 'grp-l1-info-a'
    : currentUser.groupId || groups[0]?.id || 'grp-l1-info-a';

  const [selectedGroupId, setSelectedGroupId] = useState<string>(effectiveGroupId);
  const [showNewPostModal, setShowNewPostModal] = useState<boolean>(false);
  const [postForm, setPostForm] = useState({
    title: '',
    content: '',
    category: 'ANNOUNCEMENT' as GroupPost['category'],
    isPinned: false,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Select default conversation if none selected
  useEffect(() => {
    if (!activeChatConversationId && accessibleConversations.length > 0) {
      setActiveChatConversationId(accessibleConversations[0].id);
    }
  }, [activeChatConversationId, accessibleConversations]);

  const activeConversation =
    accessibleConversations.find((c) => c.id === activeChatConversationId) ||
    accessibleConversations[0];

  const activeMessages: ChatConversationMessage[] = activeConversation
    ? chatMessagesByConv[activeConversation.id] || []
    : [];

  const activeTypingEntries = activeConversation
    ? typingIndicatorsByConv[activeConversation.id] || []
    : [];

  // Auto-scroll when messages arrive in active conversation
  useEffect(() => {
    if (activeTab === 'MESSENGER') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeMessages.length, activeConversation?.id, activeTab]);

  // Mark conversation as read ONLY when viewing the MESSENGER tab and the conversation is active
  useEffect(() => {
    if (
      activeTab === 'MESSENGER' &&
      activeConversation?.id &&
      typeof document !== 'undefined' &&
      document.visibilityState === 'visible'
    ) {
      markConversationAsRead(activeConversation.id);
    }
  }, [activeTab, activeConversation?.id, activeMessages.length]);

  // All active & authorized EBM users
  const allActiveUsers = users
    .filter((u) => u.isActive && u.id !== currentUser.id)
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

  const onlineUsersList = allActiveUsers.filter(
    (u) => getUserEffectivePresence(u.id).status !== 'OFFLINE'
  );

  const getConversationMeta = (conv: ChatConversation) => {
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
      subtitle: `${conv.participantIds.length} membres • Groupe pédagogique`,
      avatarText: conv.title.substring(0, 2).toUpperCase(),
      presence: null,
      partner: undefined,
    };
  };

  const filteredConversations = accessibleConversations.filter((conv) => {
    const meta = getConversationMeta(conv);
    const matchesSearch =
      !searchQuery.trim() ||
      meta.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      meta.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (conv.lastMessage?.text || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (leftFilter === 'PRIVATE') return conv.type === 'private';
    if (leftFilter === 'GROUPS') return conv.type === 'group';
    if (leftFilter === 'ANNOUNCEMENTS') return conv.type === 'announcement';
    if (leftFilter === 'ONLINE') {
      return conv.type === 'private' && meta.presence?.status !== 'OFFLINE';
    }
    return true;
  });

  const filteredDirectoryUsers = allActiveUsers.filter((u) => {
    if (leftFilter === 'ONLINE' && getUserEffectivePresence(u.id).status === 'OFFLINE') {
      return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q) ||
      (u.matricule || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q)
    );
  });

  const handleChatInputChange = (val: string) => {
    setChatInput(val);
    if (!activeConversation) return;
    setTypingInConversation(activeConversation.id, val.trim().length > 0);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      if (activeConversation) {
        setTypingInConversation(activeConversation.id, false);
      }
    }, 2500);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !activeConversation) return;

    setIsUploading(true);
    const res = await uploadAttachmentToConversation(activeConversation.id, file);
    setIsUploading(false);

    if (!res.success || !res.attachment) {
      showAppToast({
        title: 'Fichier non valide',
        message: res.error || 'Échec du téléversement.',
        type: 'error',
      });
      return;
    }
    setPendingAttachment(res.attachment);
  };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConversation) return;

    if (editingMessage) {
      if (!chatInput.trim()) return;
      const res = await editConversationMessage(
        activeConversation.id,
        editingMessage.id,
        chatInput
      );
      if (!res.success) {
        showAppToast({
          title: 'Modification impossible',
          message: res.error || 'Erreur lors de la modification.',
          type: 'error',
        });
        return;
      }
      setEditingMessage(null);
      setChatInput('');
      return;
    }

    if (!chatInput.trim() && !pendingAttachment) return;
    const textToSend = chatInput;
    const attachmentToSend = pendingAttachment || undefined;
    const replyId = replyingTo?.id;

    setChatInput('');
    setPendingAttachment(null);
    setReplyingTo(null);

    const res = await sendConversationMessage({
      conversationId: activeConversation.id,
      text: textToSend,
      attachment: attachmentToSend,
      replyToMessageId: replyId,
    });

    if (!res.success) {
      showAppToast({
        title: 'Envoi refusé',
        message: res.error || "Impossible d'envoyer le message.",
        type: 'error',
      });
    }
  };

  const handleCreateCustomGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await createCustomGroupConversation({
      title: newGroupForm.title,
      description: newGroupForm.description,
      groupId: newGroupForm.groupId || undefined,
      participantIds: newGroupForm.participantIds,
    });
    if (!res.success) {
      showAppToast({
        title: 'Erreur',
        message: res.error || 'Création du groupe impossible.',
        type: 'error',
      });
      return;
    }
    setShowCreateGroupModal(false);
    setNewGroupForm({ title: '', description: '', groupId: '', participantIds: [] });
    showAppToast({
      title: 'Groupe créé',
      message: `Le groupe "${res.conversation?.title}" est maintenant actif.`,
      type: 'success',
    });
  };

  const canWriteInCurrentConversation = (() => {
    if (!activeConversation) return false;
    if (activeConversation.type === 'announcement') {
      return (
        canUserPublishOfficialAnnouncement(currentUser) ||
        activeConversation.metadata?.allowReplies === true
      );
    }
    return true;
  })();

  // Legacy Wall & Internal Mail helpers
  const studentTeachers = getTeachersForStudent(
    currentUser.groupId,
    courses,
    ecs,
    sessions,
    users
  );
  const myMessages = internalMessages.filter(
    (m) =>
      m.senderId === currentUser.id ||
      m.recipientId === currentUser.id ||
      (m.recipientGroupId && m.recipientGroupId === currentUser.groupId) ||
      (!m.recipientId && !m.recipientGroupId)
  );
  const activeWallGroupId = isStudent
    ? currentUser.groupId || 'grp-l1-info-a'
    : selectedGroupId;
  const currentGroupPosts = groupPosts.filter((p) => p.groupId === activeWallGroupId);
  const myEnrolledGroup = groups.find((g) => g.id === currentUser.groupId);

  const handleSendMessageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageContent.trim()) return;
    sendMessage({
      recipientId: selectedRecipientId || undefined,
      recipientGroupId: selectedRecipientGroupId || undefined,
      subject: messageSubject || 'Sans objet',
      content: messageContent,
    });
    setMessageSubject('');
    setMessageContent('');
    setSelectedRecipientId('');
    setSelectedRecipientGroupId('');
    setMessageSendNotice('Courrier interne envoyé avec succès !');
    setTimeout(() => setMessageSendNotice(null), 3000);
  };

  const handleCreatePostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!postForm.title.trim() || !postForm.content.trim()) return;
    createGroupPost({
      groupId: selectedGroupId,
      title: postForm.title,
      content: postForm.content,
      category: postForm.category,
      isPinned: postForm.isPinned,
    });
    setShowNewPostModal(false);
    setPostForm({ title: '', content: '', category: 'ANNOUNCEMENT', isPinned: false });
  };

  const activeConvMeta = activeConversation ? getConversationMeta(activeConversation) : null;
  const sharedAttachments = activeMessages.filter((m) => m.attachment && !m.deletedAt);

  return (
    <div className="space-y-4">
      {/* Top Institutional Header */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-4 border border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2.5 py-0.5 rounded text-[11px] font-semibold uppercase">
              Messagerie Temps Réel EBM Institute
            </span>
            <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {onlineUsersList.length + 1} connecté(s) en direct
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Discussion & En Ligne • Espace Collaboratif
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-0.5">
            Conversations privées, groupes pédagogiques par promotion, annonces officielles et
            accusés de lecture en temps réel.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!audioUnlocked && chatPreferences.soundEnabled && (
            <button
              type="button"
              onClick={enableChatSoundEngine}
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs px-3.5 py-2 rounded-xl shadow transition-colors cursor-pointer"
            >
              <BellRing className="w-4 h-4" />
              Activer les notifications sonores
            </button>
          )}

          {isStaff && activeTab === 'MESSENGER' && (
            <button
              type="button"
              onClick={() => setShowCreateGroupModal(true)}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow transition-colors cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              + Nouveau Groupe
            </button>
          )}

          {activeTab === 'WALL' && isStaff && (
            <button
              type="button"
              onClick={() => setShowNewPostModal(true)}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Nouvelle publication
            </button>
          )}
        </div>
      </div>

      {/* Module Mode Tabs */}
      <div className="flex flex-wrap border-b border-slate-200 bg-white rounded-t-xl px-2">
        <button
          type="button"
          onClick={() => setActiveTab('MESSENGER')}
          className={`flex items-center gap-2 px-5 py-3 font-semibold text-xs sm:text-sm border-b-2 transition-colors cursor-pointer ${
            activeTab === 'MESSENGER'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Messagerie Instantanée & En Ligne</span>
          {totalUnreadChatCount > 0 && (
            <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full">
              {totalUnreadChatCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('WALL')}
          className={`flex items-center gap-2 px-5 py-3 font-semibold text-xs sm:text-sm border-b-2 transition-colors cursor-pointer ${
            activeTab === 'WALL'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Mur de Promotion ({currentGroupPosts.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('INTERNAL_MAIL')}
          className={`flex items-center gap-2 px-5 py-3 font-semibold text-xs sm:text-sm border-b-2 transition-colors cursor-pointer ${
            activeTab === 'INTERNAL_MAIL'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>
            Courriers Internes (
            {myMessages.filter((m) => !m.isRead && m.senderId !== currentUser.id).length} non lus)
          </span>
        </button>
      </div>

      {/* =====================================================================
          TAB 1: 3-COLUMN REAL-TIME MESSENGER (Section 5.2)
         ===================================================================== */}
      {activeTab === 'MESSENGER' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[640px]">
          {/* LEFT COLUMN: Directory, Presence & Conversations (3 cols) */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col overflow-hidden h-[640px]">
            {/* My Presence Bar */}
            <div className="p-3 bg-slate-50 border-b border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="relative shrink-0">
                    <div className="w-8 h-8 rounded-full bg-blue-700 text-white font-bold text-xs flex items-center justify-center">
                      {currentUser.name.substring(0, 2).toUpperCase()}
                    </div>
                    <span
                      className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white ${
                        PRESENCE_META[myManualPresenceStatus].dotClass
                      }`}
                    />
                  </div>
                  <div className="min-w-0">
                    <span className="font-bold text-xs text-slate-900 block truncate">
                      {currentUser.name}
                    </span>
                    <span className="text-[10px] text-slate-500 block truncate">
                      {PRESENCE_META[myManualPresenceStatus].label} • {currentUser.role}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    updateChatNotificationPreferences({
                      soundEnabled: !chatPreferences.soundEnabled,
                    })
                  }
                  className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                    chatPreferences.soundEnabled
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : 'bg-slate-100 border-slate-200 text-slate-400'
                  }`}
                  title={
                    chatPreferences.soundEnabled
                      ? 'Alertes sonores activées'
                      : 'Alertes sonores désactivées'
                  }
                >
                  {chatPreferences.soundEnabled ? (
                    <Volume2 className="w-4 h-4" />
                  ) : (
                    <VolumeX className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Status Switcher */}
              <div className="grid grid-cols-3 gap-1 text-[10px] font-semibold">
                {(['ONLINE', 'IDLE', 'DND'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => updateMyPresenceManualStatus(st)}
                    className={`py-1 px-1.5 rounded-lg border flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                      myManualPresenceStatus === st
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${PRESENCE_META[st].dotClass}`} />
                    <span className="truncate">{PRESENCE_META[st].label}</span>
                  </button>
                ))}
              </div>

              {/* Search Input */}
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Chercher un contact, groupe, filière..."
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              </div>

              {/* Filter Tabs */}
              <div className="flex flex-wrap gap-1 pt-0.5">
                {[
                  { id: 'ALL', label: 'Discussions' },
                  { id: 'DIRECTORY', label: `Annuaire (${allActiveUsers.length})` },
                  { id: 'ONLINE', label: `En ligne (${onlineUsersList.length})` },
                  { id: 'GROUPS', label: 'Groupes' },
                  { id: 'ANNOUNCEMENTS', label: 'Annonces' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setLeftFilter(f.id as typeof leftFilter)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                      leftFilter === f.id
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Conversations & Users Directory List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 text-xs">
              {leftFilter === 'DIRECTORY' || leftFilter === 'ONLINE' ? (
                filteredDirectoryUsers.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    Aucun utilisateur correspondant.
                  </div>
                ) : (
                  filteredDirectoryUsers.map((u) => {
                    const pres = getUserEffectivePresence(u.id);
                    const convId = `priv__${[currentUser.id, u.id].sort().join('__')}`;
                    const unread = getConversationUnreadCount(convId);

                    return (
                      <div
                        key={u.id}
                        onClick={() => {
                          const conv = openPrivateConversationWithUser(u.id, false);
                          if (conv) markConversationAsRead(conv.id);
                        }}
                        className="p-3 hover:bg-blue-50/70 transition-colors cursor-pointer flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="relative shrink-0">
                            <div className="w-9 h-9 rounded-full bg-slate-800 text-white font-bold text-xs flex items-center justify-center">
                              {u.name.substring(0, 2).toUpperCase()}
                            </div>
                            <span
                              className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white ${
                                PRESENCE_META[pres.status].dotClass
                              }`}
                            />
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 block truncate">
                              {u.name}
                            </span>
                            <span className="text-[10px] text-slate-500 block truncate">
                              {PRESENCE_META[pres.status].label} • {u.role}
                            </span>
                            {pres.status === 'OFFLINE' && pres.lastSeenAt && (
                              <span className="text-[9px] text-slate-400 block truncate">
                                {formatLastSeenFull(pres.lastSeenAt)}
                              </span>
                            )}
                          </div>
                        </div>

                        {unread > 0 && (
                          <span className="px-2 py-0.5 bg-red-500 text-white font-bold text-[10px] rounded-full shrink-0">
                            {unread}
                          </span>
                        )}
                      </div>
                    );
                  })
                )
              ) : (
                <>
                  {filteredConversations.map((conv) => {
                    const meta = getConversationMeta(conv);
                    const unread = getConversationUnreadCount(conv.id);
                    const isSelected = activeConversation?.id === conv.id;

                    return (
                      <div
                        key={conv.id}
                        onClick={() => {
                          setActiveChatConversationId(conv.id);
                          setReplyingTo(null);
                          setEditingMessage(null);
                          markConversationAsRead(conv.id);
                        }}
                        className={`p-3 transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                          isSelected
                            ? 'bg-blue-50 border-l-4 border-blue-600'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="relative shrink-0">
                            <div
                              className={`w-9 h-9 rounded-xl font-bold text-xs flex items-center justify-center ${
                                conv.type === 'announcement'
                                  ? 'bg-amber-100 text-amber-800'
                                  : conv.type === 'group'
                                  ? 'bg-indigo-100 text-indigo-700'
                                  : 'bg-blue-700 text-white rounded-full'
                              }`}
                            >
                              {conv.type === 'group' ? (
                                <Users className="w-4 h-4" />
                              ) : conv.type === 'announcement' ? (
                                <Megaphone className="w-4 h-4" />
                              ) : (
                                meta.avatarText
                              )}
                            </div>
                            {meta.presence && (
                              <span
                                className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white ${
                                  PRESENCE_META[meta.presence.status].dotClass
                                }`}
                              />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 truncate block">
                                {meta.title}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-500 block truncate">
                              {conv.lastMessage
                                ? `${conv.lastMessage.senderName.split(' ')[0]}: ${
                                    conv.lastMessage.text
                                  }`
                                : meta.subtitle}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1 shrink-0">
                          {conv.lastMessageAt && (
                            <span className="text-[9px] text-slate-400 font-mono">
                              {formatDateTimeShort(conv.lastMessageAt)}
                            </span>
                          )}
                          {unread > 0 && (
                            <span className="px-1.5 py-0.5 bg-red-500 text-white font-bold text-[10px] rounded-full">
                              {unread}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Quick Directory Section underneath conversations */}
                  <div className="px-3 py-2 bg-slate-50 text-[10px] font-bold uppercase text-slate-500">
                    Tous les utilisateurs EBM ({allActiveUsers.length})
                  </div>
                  {filteredDirectoryUsers.map((u) => {
                    const pres = getUserEffectivePresence(u.id);
                    return (
                      <div
                        key={`dir-${u.id}`}
                        onClick={() => {
                          const conv = openPrivateConversationWithUser(u.id, false);
                          if (conv) markConversationAsRead(conv.id);
                        }}
                        className="p-2.5 hover:bg-blue-50/60 transition-colors cursor-pointer flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="relative shrink-0">
                            <div className="w-7 h-7 rounded-full bg-slate-700 text-white font-bold text-[10px] flex items-center justify-center">
                              {u.name.substring(0, 2).toUpperCase()}
                            </div>
                            <span
                              className={`absolute bottom-0 right-0 w-2 h-2 rounded-full ring-1 ring-white ${
                                PRESENCE_META[pres.status].dotClass
                              }`}
                            />
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-slate-800 block truncate text-[11px]">
                              {u.name}
                            </span>
                            <span className="text-[10px] text-slate-400 block truncate">
                              {PRESENCE_META[pres.status].label} • {u.role}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>

          {/* CENTER COLUMN: Active Conversation Feed & Composer (6 cols) */}
          <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col overflow-hidden h-[640px]">
            {activeConversation && activeConvMeta ? (
              <>
                {/* Conversation Header */}
                <div className="px-4 py-3 bg-white border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <div
                        className={`w-10 h-10 rounded-xl font-bold text-xs flex items-center justify-center ${
                          activeConversation.type === 'announcement'
                            ? 'bg-amber-100 text-amber-800'
                            : activeConversation.type === 'group'
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-blue-700 text-white rounded-full'
                        }`}
                      >
                        {activeConversation.type === 'group' ? (
                          <Users className="w-5 h-5" />
                        ) : activeConversation.type === 'announcement' ? (
                          <Megaphone className="w-5 h-5" />
                        ) : (
                          activeConvMeta.avatarText
                        )}
                      </div>
                      {activeConvMeta.presence && (
                        <span
                          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-white ${
                            PRESENCE_META[activeConvMeta.presence.status].dotClass
                          }`}
                        />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h2 className="font-bold text-sm text-slate-900 truncate">
                        {activeConvMeta.title}
                      </h2>
                      <p className="text-[11px] text-slate-500 truncate">
                        {activeConvMeta.presence &&
                        activeConvMeta.presence.status === 'OFFLINE'
                          ? formatLastSeenFull(activeConvMeta.presence.lastSeenAt)
                          : activeConvMeta.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {activeConversation.type === 'announcement' &&
                      canUserPublishOfficialAnnouncement(currentUser) && (
                        <button
                          type="button"
                          onClick={() =>
                            toggleConversationAllowReplies(
                              activeConversation.id,
                              !(activeConversation.metadata?.allowReplies === true)
                            )
                          }
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                            activeConversation.metadata?.allowReplies
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                              : 'bg-slate-100 border-slate-200 text-slate-600'
                          }`}
                        >
                          {activeConversation.metadata?.allowReplies
                            ? 'Réponses autorisées'
                            : 'Réponses désactivées'}
                        </button>
                      )}

                    <button
                      type="button"
                      onClick={async () => {
                        setIsLoadingOlder(true);
                        await loadOlderConversationMessages(activeConversation.id);
                        setIsLoadingOlder(false);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                      title="Charger les messages plus anciens"
                    >
                      <History className={`w-3.5 h-3.5 ${isLoadingOlder ? 'animate-spin' : ''}`} />
                      <span className="hidden sm:inline">Historique</span>
                    </button>
                  </div>
                </div>

                {/* Messages Stream */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/70">
                  {activeMessages.length === 0 ? (
                    <div className="py-16 text-center text-slate-400 text-xs">
                      Aucun message dans cette conversation. Démarrez la discussion ci-dessous !
                    </div>
                  ) : (
                    activeMessages.map((msg) => {
                      const isMe = msg.senderId === currentUser.id;
                      const isDeleted = Boolean(msg.deletedAt);
                      const otherDeliveredIds = Object.keys(msg.deliveredTo || {}).filter(
                        (uid) => uid !== msg.senderId
                      );
                      const otherReadEntries = Object.entries(msg.readBy || {}).filter(
                        ([uid]) => uid !== msg.senderId
                      );

                      return (
                        <div
                          key={msg.id}
                          className={`group flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                        >
                          {!isMe && (
                            <span className="text-[11px] font-bold text-slate-700 mb-0.5 px-1">
                              {msg.senderName}{' '}
                              <span className="text-[10px] font-normal text-slate-400">
                                ({msg.senderRole})
                              </span>
                            </span>
                          )}

                          <div className="flex items-center gap-1.5 max-w-[82%]">
                            {isMe && !isDeleted && (
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-slate-400">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReplyingTo(msg);
                                    setEditingMessage(null);
                                  }}
                                  className="p-1 hover:text-blue-600 rounded"
                                  title="Répondre"
                                >
                                  <Reply className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingMessage(msg);
                                    setReplyingTo(null);
                                    setChatInput(msg.text);
                                  }}
                                  className="p-1 hover:text-amber-600 rounded"
                                  title="Modifier"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    deleteConversationMessage(activeConversation.id, msg.id)
                                  }
                                  className="p-1 hover:text-rose-600 rounded"
                                  title="Supprimer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}

                            <div
                              className={`rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-2xs ${
                                isDeleted
                                  ? 'bg-slate-100 text-slate-400 italic border border-slate-200'
                                  : isMe
                                  ? 'bg-blue-600 text-white rounded-br-xs'
                                  : msg.type === 'announcement'
                                  ? 'bg-amber-50 text-slate-900 border border-amber-300 rounded-bl-xs'
                                  : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs'
                              }`}
                            >
                              {msg.replyToPreview && !isDeleted && (
                                <div
                                  className={`mb-2 pl-2.5 border-l-2 text-[11px] rounded py-1 ${
                                    isMe
                                      ? 'border-blue-200 bg-blue-700/50 text-blue-100'
                                      : 'border-blue-500 bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  <span className="font-bold block">
                                    {msg.replyToPreview.senderName}
                                  </span>
                                  <span className="line-clamp-2">{msg.replyToPreview.text}</span>
                                </div>
                              )}

                              {msg.attachment && !isDeleted && (
                                <div className="mb-2">
                                  {['JPG', 'JPEG', 'PNG'].includes(
                                    msg.attachment.extension.toUpperCase()
                                  ) ? (
                                    <a
                                      href={msg.attachment.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      download={msg.attachment.name}
                                      className="block rounded-xl overflow-hidden border border-white/20 mb-1"
                                    >
                                      <img
                                        src={msg.attachment.url}
                                        alt={msg.attachment.name}
                                        className="max-h-56 w-auto object-cover rounded"
                                      />
                                    </a>
                                  ) : (
                                    <a
                                      href={msg.attachment.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      download={msg.attachment.name}
                                      className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs ${
                                        isMe
                                          ? 'bg-blue-700/60 border-blue-400/40 text-white'
                                          : 'bg-slate-50 border-slate-200 text-slate-800'
                                      }`}
                                    >
                                      <FileText className="w-5 h-5 shrink-0" />
                                      <div className="min-w-0 flex-1">
                                        <span className="font-bold block truncate">
                                          {msg.attachment.name}
                                        </span>
                                        <span className="text-[10px] opacity-80">
                                          {msg.attachment.extension} •{' '}
                                          {msg.attachment.sizeFormatted}
                                        </span>
                                      </div>
                                      <Download className="w-4 h-4 shrink-0" />
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
                                <Reply className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {/* Footer: Timestamp, Edited, Delivery/Read Receipts & Group Read Details */}
                          <div className="flex items-center gap-1.5 mt-1 px-1 text-[10px] text-slate-400">
                            <span className="font-mono">{formatDateTimeShort(msg.createdAt)}</span>
                            {msg.editedAt && !isDeleted && <span>• modifié</span>}
                            {isMe && !isDeleted && (
                              <button
                                type="button"
                                onClick={() =>
                                  setInspectedReceiptsMsgId(
                                    inspectedReceiptsMsgId === msg.id ? null : msg.id
                                  )
                                }
                                className="inline-flex items-center gap-0.5 hover:text-slate-700 cursor-pointer"
                              >
                                {otherReadEntries.length > 0 ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-blue-600" />
                                ) : otherDeliveredIds.length > 0 ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-slate-400" />
                                ) : (
                                  <Check className="w-3.5 h-3.5 text-slate-400" />
                                )}
                                <span>
                                  {otherReadEntries.length > 0
                                    ? `Lu (${otherReadEntries.length})`
                                    : otherDeliveredIds.length > 0
                                    ? `Reçu (${otherDeliveredIds.length})`
                                    : 'Envoyé'}
                                </span>
                              </button>
                            )}
                          </div>

                          {/* Expanded Read-By Details for Group/Private Message */}
                          {inspectedReceiptsMsgId === msg.id && (
                            <div className="mt-1 p-2 bg-white border border-slate-200 rounded-xl shadow-sm text-[10px] text-slate-600 space-y-1 max-w-xs">
                              <div className="font-bold text-slate-800 flex items-center gap-1">
                                <Eye className="w-3 h-3 text-blue-600" />
                                <span>Détail des accusés de lecture :</span>
                              </div>
                              {otherReadEntries.length === 0 ? (
                                <p className="text-slate-400 italic">
                                  Non lu par les destinataires pour le moment.
                                </p>
                              ) : (
                                otherReadEntries.map(([uid, readAt]) => {
                                  const reader = users.find((u) => u.id === uid);
                                  return (
                                    <div key={uid} className="flex justify-between gap-3">
                                      <span className="font-semibold">
                                        {reader?.name || uid}
                                      </span>
                                      <span className="text-slate-400 font-mono">
                                        {formatDateTimeShort(readAt)}
                                      </span>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}

                  {/* Typing Indicator */}
                  {activeTypingEntries.length > 0 && (
                    <div className="flex items-center gap-2 text-xs text-blue-600 font-medium italic px-2 py-1">
                      <span className="flex gap-1">
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

                {/* Reply / Edit / Attachment Preview Bar */}
                {(replyingTo || editingMessage || pendingAttachment) && (
                  <div className="px-4 py-2 bg-blue-50 border-t border-blue-200 flex items-center justify-between gap-2 text-xs">
                    <div className="truncate text-slate-700">
                      {editingMessage && (
                        <span>
                          <strong className="text-amber-700">Modification du message :</strong>{' '}
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
                          <strong className="text-emerald-700">Fichier prêt à envoyer :</strong>{' '}
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
                      className="text-slate-400 hover:text-slate-700 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Emoji Bar */}
                {showEmojiPicker && canWriteInCurrentConversation && (
                  <div className="px-4 py-2 bg-white border-t border-slate-100 flex items-center justify-between">
                    <div className="flex flex-wrap gap-2">
                      {QUICK_EMOJIS.map((em) => (
                        <button
                          key={em}
                          type="button"
                          onClick={() => setChatInput((prev) => `${prev}${em}`)}
                          className="hover:scale-125 transition-transform text-base cursor-pointer"
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(false)}
                      className="text-xs text-slate-400 hover:text-slate-600"
                    >
                      Fermer
                    </button>
                  </div>
                )}

                {/* Message Composer */}
                {canWriteInCurrentConversation ? (
                  <form
                    onSubmit={handleSendChatMessage}
                    className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.docx,.xlsx,.pptx,.jpg,.jpeg,.png"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                      title="Joindre un document (PDF, DOCX, XLSX, PPTX, JPG, PNG - max 10 Mo)"
                    >
                      <Paperclip className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="p-2 text-slate-500 hover:text-amber-500 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                      title="Insérer un emoji"
                    >
                      <Smile className="w-4 h-4" />
                    </button>
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => handleChatInputChange(e.target.value)}
                      placeholder={
                        isUploading
                          ? 'Téléversement de la pièce jointe...'
                          : 'Écrivez votre message en temps réel...'
                      }
                      className="flex-1 px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                    <button
                      type="submit"
                      disabled={!chatInput.trim() && !pendingAttachment}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Envoyer</span>
                    </button>
                  </form>
                ) : (
                  <div className="p-3 bg-slate-100 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      Canal officiel d'annonces : seules la Direction et la Scolarité peuvent
                      publier ici.
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8 text-center text-slate-400 text-sm">
                Sélectionnez un contact ou un groupe dans la colonne de gauche pour discuter.
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Correspondent/Group Info & Notification Preferences (3 cols) */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col overflow-hidden h-[640px]">
            <div className="grid grid-cols-2 border-b border-slate-200 bg-slate-50 text-xs font-bold">
              <button
                type="button"
                onClick={() => setRightPanelTab('INFO')}
                className={`py-3 flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
                  rightPanelTab === 'INFO'
                    ? 'border-blue-600 text-blue-600 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Info className="w-3.5 h-3.5" />
                <span>Informations</span>
              </button>
              <button
                type="button"
                onClick={() => setRightPanelTab('SETTINGS')}
                className={`py-3 flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
                  rightPanelTab === 'SETTINGS'
                    ? 'border-blue-600 text-blue-600 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Alertes & Son</span>
              </button>
            </div>

            {rightPanelTab === 'INFO' && activeConversation && activeConvMeta ? (
              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                {/* Profile / Group Summary Card */}
                <div className="text-center pb-4 border-b border-slate-100">
                  <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white font-bold text-base flex items-center justify-center mx-auto mb-2 shadow">
                    {activeConvMeta.avatarText}
                  </div>
                  <h3 className="font-bold text-sm text-slate-900">{activeConvMeta.title}</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">{activeConvMeta.subtitle}</p>

                  {activeConvMeta.presence && (
                    <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold bg-slate-50">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          PRESENCE_META[activeConvMeta.presence.status].dotClass
                        }`}
                      />
                      <span>{PRESENCE_META[activeConvMeta.presence.status].label}</span>
                      {activeConvMeta.presence.activeDeviceCount > 0 && (
                        <span className="text-slate-400">
                          • {activeConvMeta.presence.activeDeviceCount} session(s)
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Partner Details if Private */}
                {activeConvMeta.partner && (
                  <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                    <div className="text-[10px] font-bold uppercase text-slate-400">
                      Fiche Utilisateur EBM
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Rôle :</span>
                      <span className="font-semibold text-slate-800">
                        {activeConvMeta.partner.role}
                      </span>
                    </div>
                    {activeConvMeta.partner.matricule && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Matricule :</span>
                        <span className="font-mono font-semibold text-slate-800">
                          {activeConvMeta.partner.matricule}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-500">Email :</span>
                      <span className="font-medium text-slate-800 truncate max-w-[150px]">
                        {activeConvMeta.partner.email}
                      </span>
                    </div>
                  </div>
                )}

                {/* Group Members List if Group or Announcement */}
                {activeConversation.type !== 'private' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-slate-400">
                        Membres ({activeConversation.participantIds.length})
                      </span>
                    </div>
                    <div className="max-h-52 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
                      {activeConversation.participantIds
                        .map((pid) => users.find((u) => u.id === pid))
                        .filter((u): u is SisUser => Boolean(u && u.isActive))
                        .map((member) => {
                          const pres = getUserEffectivePresence(member.id);
                          return (
                            <div
                              key={member.id}
                              onClick={() => {
                                if (member.id !== currentUser.id) {
                                  openPrivateConversationWithUser(member.id, false);
                                }
                              }}
                              className="p-2 hover:bg-slate-50 flex items-center justify-between gap-2 cursor-pointer"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className={`w-2 h-2 rounded-full shrink-0 ${
                                    PRESENCE_META[pres.status].dotClass
                                  }`}
                                />
                                <span className="font-semibold text-slate-800 truncate text-[11px]">
                                  {member.name}
                                </span>
                              </div>
                              <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded shrink-0">
                                {member.role}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Shared Attachments in Conversation */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    Pièces jointes partagées ({sharedAttachments.length})
                  </span>
                  {sharedAttachments.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic">
                      Aucun fichier partagé dans cette discussion.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {sharedAttachments.map((m) => (
                        <a
                          key={m.id}
                          href={m.attachment!.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={m.attachment!.name}
                          className="flex items-center justify-between gap-2 p-2 rounded-xl border border-slate-200 hover:bg-blue-50/50 transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                            <div className="min-w-0">
                              <span className="font-semibold text-slate-800 block truncate text-[11px]">
                                {m.attachment!.name}
                              </span>
                              <span className="text-[9px] text-slate-400">
                                {m.attachment!.extension} • {m.attachment!.sizeFormatted}
                              </span>
                            </div>
                          </div>
                          <Download className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Notification & Sound Settings Panel (Section 6.3) */
              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
                  <div className="font-bold text-blue-950 flex items-center justify-between">
                    <span>Notifications Sonores</span>
                    <input
                      type="checkbox"
                      checked={chatPreferences.soundEnabled}
                      onChange={(e) =>
                        updateChatNotificationPreferences({ soundEnabled: e.target.checked })
                      }
                      className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                    />
                  </div>
                  <p className="text-[11px] text-blue-800">
                    Émet un bip sonore lors de la réception d'un nouveau message en temps réel.
                  </p>
                  <button
                    type="button"
                    onClick={testChatSound}
                    className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-[11px] transition-colors cursor-pointer"
                  >
                    🔊 Tester le son maintenant
                  </button>
                </div>

                {/* Tone & Volume */}
                <div className="space-y-3 border-b border-slate-100 pb-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Tonalité de l'alerte :
                    </label>
                    <select
                      value={chatPreferences.soundTone}
                      onChange={(e) =>
                        updateChatNotificationPreferences({
                          soundTone: e.target.value as ChatSoundTone,
                        })
                      }
                      className="w-full border border-slate-300 rounded-lg p-2 font-semibold bg-white"
                    >
                      <option value="CRISTAL">Cristal EBM (Clair & Harmonie)</option>
                      <option value="INSTITUTIONNEL">Institutionnel (Double Carillon)</option>
                      <option value="MODERNE">Moderne (Triade Ascendante)</option>
                      <option value="DISCRET">Discret (Bip Doux)</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="font-semibold text-slate-700">Volume sonore :</label>
                      <span className="font-mono text-slate-500">
                        {Math.round(chatPreferences.soundVolume * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.1}
                      max={1}
                      step={0.05}
                      value={chatPreferences.soundVolume}
                      onChange={(e) =>
                        updateChatNotificationPreferences({
                          soundVolume: parseFloat(e.target.value),
                        })
                      }
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Category Filters */}
                <div className="space-y-2.5 border-b border-slate-100 pb-3">
                  <div className="text-[10px] font-bold uppercase text-slate-400">
                    Sons par type de conversation
                  </div>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-slate-700 font-medium">Messages privés</span>
                    <input
                      type="checkbox"
                      checked={chatPreferences.privateSoundEnabled}
                      onChange={(e) =>
                        updateChatNotificationPreferences({
                          privateSoundEnabled: e.target.checked,
                        })
                      }
                      className="w-4 h-4 accent-blue-600 rounded"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-slate-700 font-medium">Groupes pédagogiques</span>
                    <input
                      type="checkbox"
                      checked={chatPreferences.groupSoundEnabled}
                      onChange={(e) =>
                        updateChatNotificationPreferences({
                          groupSoundEnabled: e.target.checked,
                        })
                      }
                      className="w-4 h-4 accent-blue-600 rounded"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-slate-700 font-medium">Annonces officielles</span>
                    <input
                      type="checkbox"
                      checked={chatPreferences.announcementSoundEnabled}
                      onChange={(e) =>
                        updateChatNotificationPreferences({
                          announcementSoundEnabled: e.target.checked,
                        })
                      }
                      className="w-4 h-4 accent-blue-600 rounded"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer pt-1">
                    <span className="text-slate-600 text-[11px]">
                      Silencieux si la discussion est déjà ouverte au premier plan
                    </span>
                    <input
                      type="checkbox"
                      checked={chatPreferences.muteActiveConversation}
                      onChange={(e) =>
                        updateChatNotificationPreferences({
                          muteActiveConversation: e.target.checked,
                        })
                      }
                      className="w-4 h-4 accent-blue-600 rounded"
                    />
                  </label>
                </div>

                {/* Browser & Push Notifications */}
                <div className="space-y-2">
                  <div className="text-[10px] font-bold uppercase text-slate-400">
                    Notifications Visuelles & Push
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await enablePushNotifications();
                      if (res.granted) {
                        showAppToast({
                          title: 'Notifications activées',
                          message:
                            'Les notifications navigateur et Push en arrière-plan sont actives.',
                          type: 'success',
                        });
                      } else {
                        showAppToast({
                          title: 'Permission refusée',
                          message:
                            'Veuillez autoriser les notifications dans les paramètres de votre navigateur.',
                          type: 'warning',
                        });
                      }
                    }}
                    className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Bell className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Activer les notifications navigateur / Push</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: GROUP WALL (Preserved)
         ===================================================================== */}
      {activeTab === 'WALL' && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {isStudent ? (
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-blue-600" />
                    Mur de votre promotion :
                  </span>
                  <span className="bg-blue-50 text-blue-800 border border-blue-200 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs">
                    <Users className="w-3.5 h-3.5 text-blue-600" />
                    {myEnrolledGroup
                      ? `${myEnrolledGroup.code} • ${myEnrolledGroup.name}`
                      : 'Votre groupe inscrit'}
                  </span>
                </div>
              ) : (
                <>
                  <span className="text-xs font-bold text-slate-500 uppercase">
                    Afficher le mur du groupe :
                  </span>
                  <select
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                    className="bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.code} ({g.name})
                      </option>
                    ))}
                  </select>
                </>
              )}
            </div>

            {isStaff && (
              <button
                type="button"
                onClick={() => setShowNewPostModal(true)}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Publier
              </button>
            )}
          </div>

          <div className="space-y-4">
            {currentGroupPosts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-400">
                <Users className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-semibold">
                  Aucune publication sur le mur de ce groupe pour le moment.
                </p>
              </div>
            ) : (
              currentGroupPosts.map((post) => (
                <div
                  key={post.id}
                  className={`bg-white rounded-2xl border p-5 shadow-sm space-y-3 transition-all ${
                    post.isPinned
                      ? 'border-amber-300 bg-amber-50/20 ring-1 ring-amber-200'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                        {post.authorName.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900">
                            {post.authorName}
                          </span>
                          <span className="bg-slate-100 text-slate-600 text-[10px] font-semibold px-2 py-0.5 rounded">
                            {post.authorRole}
                          </span>
                          {post.isPinned && (
                            <span className="flex items-center gap-1 bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded">
                              <Pin className="w-3 h-3 text-amber-600" />
                              Épinglé
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {new Date(post.createdAt).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          post.category === 'EXAM'
                            ? 'bg-rose-100 text-rose-800'
                            : post.category === 'HOMEWORK'
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {post.category}
                      </span>

                      {(isStaff || post.authorId === currentUser.id) && (
                        <button
                          type="button"
                          onClick={() => deleteGroupPost(post.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                          title="Supprimer la publication"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <h3 className="font-bold text-sm text-slate-800">{post.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                    {post.content}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 3: INTERNAL MAIL (Preserved)
         ===================================================================== */}
      {activeTab === 'INTERNAL_MAIL' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-800">Écrire un Courrier Interne</h3>

            {messageSendNotice && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{messageSendNotice}</span>
              </div>
            )}

            <form onSubmit={handleSendMessageSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  {isStudent
                    ? 'Enseignant référent ou Direction :'
                    : 'Destinataire individuel :'}
                </label>
                <select
                  value={selectedRecipientId}
                  onChange={(e) => {
                    setSelectedRecipientId(e.target.value);
                    if (e.target.value) setSelectedRecipientGroupId('');
                  }}
                  className="w-full border border-slate-300 rounded-lg p-2 font-medium"
                >
                  <option value="">
                    {isStudent
                      ? '-- Choisir parmi vos enseignants ou la direction --'
                      : '-- Choisir un utilisateur précis --'}
                  </option>
                  {isStudent ? (
                    <>
                      <optgroup label="Vos Enseignants (Promotion)">
                        {studentTeachers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} (Enseignant)
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Direction & Scolarité">
                        {users
                          .filter((u) => ['ADMIN', 'ACADEMIC_HEAD', 'SCOLARITE'].includes(u.role))
                          .map((admin) => (
                            <option key={admin.id} value={admin.id}>
                              {admin.name} ({admin.role})
                            </option>
                          ))}
                      </optgroup>
                    </>
                  ) : (
                    users
                      .filter((u) => u.id !== currentUser.id)
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.role})
                        </option>
                      ))
                  )}
                </select>
              </div>

              {isStaff && (
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Ou diffuser à un groupe entier :
                  </label>
                  <select
                    value={selectedRecipientGroupId}
                    onChange={(e) => {
                      setSelectedRecipientGroupId(e.target.value);
                      if (e.target.value) setSelectedRecipientId('');
                    }}
                    className="w-full border border-slate-300 rounded-lg p-2 font-medium"
                  >
                    <option value="">-- Aucun groupe sélectionné --</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        Promotion {g.code} ({g.name})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Objet :</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Demande de justificatif"
                  value={messageSubject}
                  onChange={(e) => setMessageSubject(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Message :</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Rédigez votre courrier ici..."
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition-all cursor-pointer shadow-md"
              >
                <Send className="w-4 h-4" />
                Envoyer le courrier
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-800">Boîte de Réception Courriers</h3>
            {myMessages.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 italic">
                Aucun courrier interne pour le moment.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {myMessages.map((msg) => {
                  const isSentByMe = msg.senderId === currentUser.id;
                  return (
                    <div
                      key={msg.id}
                      onClick={() => !msg.isRead && markMessageAsRead(msg.id)}
                      className={`py-3.5 px-3 rounded-xl transition-colors cursor-pointer ${
                        !msg.isRead && !isSentByMe
                          ? 'bg-blue-50/60 font-semibold'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              !msg.isRead && !isSentByMe ? 'bg-blue-600' : 'bg-transparent'
                            }`}
                          />
                          <span className="font-bold text-slate-800">
                            {isSentByMe
                              ? `À : ${msg.recipientId ? 'Destinataire' : 'Groupe'}`
                              : `De : ${msg.senderName}`}
                          </span>
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                            {msg.senderRole}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {formatDateTimeShort(msg.timestamp)}
                        </span>
                      </div>
                      <div className="font-bold text-slate-900 mt-1">{msg.subject}</div>
                      <p className="text-slate-600 text-xs mt-0.5 leading-relaxed">{msg.content}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Créer un groupe personnalisé */}
      {showCreateGroupModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateCustomGroup}
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-xs"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                Créer un groupe de discussion pédagogique
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateGroupModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Nom du groupe :</label>
              <input
                type="text"
                required
                placeholder="ex: Coordination L3 Génie Logiciel"
                value={newGroupForm.title}
                onChange={(e) => setNewGroupForm({ ...newGroupForm, title: e.target.value })}
                className="w-full border border-slate-300 rounded-lg p-2"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Description :</label>
              <input
                type="text"
                placeholder="Objectif pédagogique ou administratif du groupe"
                value={newGroupForm.description}
                onChange={(e) => setNewGroupForm({ ...newGroupForm, description: e.target.value })}
                className="w-full border border-slate-300 rounded-lg p-2"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Sélectionner les membres ({newGroupForm.participantIds.length} choisi(s)) :
              </label>
              <div className="max-h-44 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 p-1">
                {allActiveUsers.map((u) => {
                  const checked = newGroupForm.participantIds.includes(u.id);
                  return (
                    <label
                      key={u.id}
                      className="flex items-center justify-between p-2 hover:bg-slate-50 cursor-pointer rounded"
                    >
                      <span className="font-medium text-slate-800">
                        {u.name} <span className="text-slate-400">({u.role})</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...newGroupForm.participantIds, u.id]
                            : newGroupForm.participantIds.filter((id) => id !== u.id);
                          setNewGroupForm({ ...newGroupForm, participantIds: next });
                        }}
                        className="w-4 h-4 accent-blue-600 rounded"
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateGroupModal(false)}
                className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl cursor-pointer"
              >
                Créer le groupe
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Nouvelle publication mur */}
      {showNewPostModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreatePostSubmit}
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Publier sur le mur du groupe</h3>
                <p className="text-xs text-slate-500">
                  Visible par tous les étudiants du groupe{' '}
                  {groups.find((g) => g.id === selectedGroupId)?.code}
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Titre de l'annonce :
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Rappel : Devoir à rendre pour lundi"
                  value={postForm.title}
                  onChange={(e) => setPostForm({ ...postForm, title: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Catégorie :</label>
                  <select
                    value={postForm.category}
                    onChange={(e) =>
                      setPostForm({
                        ...postForm,
                        category: e.target.value as GroupPost['category'],
                      })
                    }
                    className="w-full border border-slate-300 rounded-lg p-2 font-semibold"
                  >
                    <option value="ANNOUNCEMENT">Annonce générale</option>
                    <option value="HOMEWORK">Devoirs & Travaux</option>
                    <option value="EXAM">Partiels & Examens</option>
                    <option value="SCHEDULE">Planning & Séances</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="pinCheck"
                    checked={postForm.isPinned}
                    onChange={(e) => setPostForm({ ...postForm, isPinned: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <label
                    htmlFor="pinCheck"
                    className="font-semibold text-slate-700 cursor-pointer"
                  >
                    Épingler en haut du mur
                  </label>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Texte de la publication :
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Écrivez le message détaillé..."
                  value={postForm.content}
                  onChange={(e) => setPostForm({ ...postForm, content: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewPostModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md cursor-pointer"
              >
                Publier sur le mur
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
