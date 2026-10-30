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
  UserCheck,
  Search,
  Maximize2,
  Sparkles,
} from 'lucide-react';
import { User } from '../types';

export const MessengerLiveChat: React.FC = () => {
  const {
    currentUser,
    users,
    chatMessages,
    sendChatMessage,
    markChatAsRead,
    appSettings,
    onlineUsers,
  } = useApp();

  const [isOpen, setIsOpen] = useState(false);
  const [activePartnerId, setActivePartnerId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [isMinimizedChatWindow, setIsMinimizedChatWindow] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new message arrives in active chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, activePartnerId]);

  // If live chat disabled in settings, do not render
  if (appSettings.showLiveChat === false) return null;

  // Filter online users list (excluding current user)
  const connectedUsers = users.filter((u) => u.id !== currentUser?.id);
  const filteredUsers = connectedUsers.filter((u) =>
    u.name.toLowerCase().includes(searchUserQuery.toLowerCase()) ||
    u.role.toLowerCase().includes(searchUserQuery.toLowerCase())
  );

  const activePartner = users.find((u) => u.id === activePartnerId);

  // Conversation messages between currentUser and activePartner
  const conversationMessages = chatMessages.filter(
    (m) =>
      (m.senderId === currentUser?.id && m.recipientId === activePartnerId) ||
      (m.senderId === activePartnerId && m.recipientId === currentUser?.id)
  );

  const totalUnreadCount = chatMessages.filter(
    (m) => m.recipientId === currentUser?.id && !m.isRead
  ).length;

  const handleOpenPartnerChat = (partner: User) => {
    setActivePartnerId(partner.id);
    setIsMinimizedChatWindow(false);
    markChatAsRead(partner.id);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activePartnerId) return;
    sendChatMessage(activePartnerId, inputText);
    setInputText('');
  };

  const handleSendQuickEmoji = (emoji: string) => {
    if (!activePartnerId) return;
    sendChatMessage(activePartnerId, emoji);
  };

  return (
    <div className="fixed bottom-16 lg:bottom-0 right-3 sm:right-4 z-40 flex flex-col sm:flex-row items-end gap-2 sm:gap-3 pointer-events-none select-none max-w-[calc(100vw-1.5rem)]">
      {/* 1. Active Chat Popup Window (Like Facebook Messenger) */}
      {activePartner && (
        <div
          className={`pointer-events-auto bg-white rounded-2xl lg:rounded-b-none lg:rounded-t-2xl shadow-2xl border border-slate-300 w-[calc(100vw-1.5rem)] sm:w-80 md:w-88 flex flex-col transition-all duration-200 overflow-hidden ${
            isMinimizedChatWindow ? 'h-12' : 'h-[380px] sm:h-[440px] max-h-[70vh]'
          }`}
        >
          {/* Header */}
          <div className="bg-slate-900 text-white p-3 flex items-center justify-between border-b border-slate-800">
            <div
              onClick={() => setIsMinimizedChatWindow(!isMinimizedChatWindow)}
              className="flex items-center gap-2.5 cursor-pointer min-w-0"
            >
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-blue-700 text-white font-bold text-xs flex items-center justify-center border border-blue-400">
                  {activePartner.name.substring(0, 2).toUpperCase()}
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-900" />
              </div>
              <div className="truncate">
                <span className="font-bold text-xs block text-white truncate leading-tight">
                  {activePartner.name}
                </span>
                <span className="text-[10px] text-emerald-400 font-semibold block leading-tight">
                  En ligne • {activePartner.role}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 text-slate-300">
              <button
                type="button"
                onClick={() => setIsMinimizedChatWindow(!isMinimizedChatWindow)}
                className="p-1 hover:text-white hover:bg-slate-800 rounded"
                title={isMinimizedChatWindow ? 'Agrandir' : 'Réduire'}
              >
                {isMinimizedChatWindow ? <ChevronUp className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={() => setActivePartnerId(null)}
                className="p-1 hover:text-white hover:bg-slate-800 rounded"
                title="Fermer la discussion"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Chat Body: Messages */}
          {!isMinimizedChatWindow && (
            <>
              <div className="flex-1 p-3 overflow-y-auto space-y-2.5 bg-slate-50 text-xs text-slate-800">
                <div className="text-center py-2 text-[10px] text-slate-400">
                  Début de la conversation avec <strong>{activePartner.name}</strong> ({activePartner.role})
                </div>

                {conversationMessages.map((msg) => {
                  const isMe = msg.senderId === currentUser?.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs leading-relaxed shadow-2xs ${
                          isMe
                            ? 'bg-blue-600 text-white rounded-br-xs'
                            : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs'
                        }`}
                      >
                        {msg.text}
                      </div>
                      <span className="text-[9px] text-slate-400 mt-0.5 px-1 font-mono">
                        {msg.timestamp}
                      </span>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Emojis */}
              <div className="px-3 py-1 bg-white border-t border-slate-100 flex items-center justify-between text-sm">
                <div className="flex gap-1.5">
                  {['👍', '❤️', '👏', '🎓', '✨'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleSendQuickEmoji(emoji)}
                      className="hover:scale-125 transition-transform cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                <span className="text-[10px] text-slate-400 font-medium">Réponses instantanées</span>
              </div>

              {/* Input Form */}
              <form onSubmit={handleSendMessage} className="p-2 bg-white border-t border-slate-200 flex items-center gap-1.5">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Écrire un message..."
                  className="flex-1 px-3 py-2 bg-slate-100 border border-slate-200 rounded-full text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="p-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-full transition-colors cursor-pointer flex-shrink-0"
                  title="Envoyer"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </>
          )}
        </div>
      )}

      {/* 2. Messenger Dock Bar (Docked at bottom-right) */}
      <div className="pointer-events-auto flex flex-col items-end">
        {/* Expanded Connected Users Popup */}
        {isOpen && (
          <div className="bg-white rounded-2xl lg:rounded-b-none lg:rounded-t-2xl shadow-2xl border border-slate-300 w-[calc(100vw-1.5rem)] sm:w-72 h-80 sm:h-96 max-h-[65vh] flex flex-col mb-1.5 lg:mb-1 animate-in fade-in slide-in-from-bottom-2 duration-150 overflow-hidden">
            <div className="bg-slate-900 text-white p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-xs">Utilisateurs Connectés</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-bold">
                  {connectedUsers.length} en ligne
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search filter */}
            <div className="p-2 border-b border-slate-100 bg-slate-50">
              <div className="relative">
                <input
                  type="text"
                  value={searchUserQuery}
                  onChange={(e) => setSearchUserQuery(e.target.value)}
                  placeholder="Rechercher un collègue ou étudiant..."
                  className="w-full pl-7 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
              </div>
            </div>

            {/* Users list */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 text-xs">
              {filteredUsers.map((user) => {
                const unreadForUser = chatMessages.filter(
                  (m) => m.senderId === user.id && m.recipientId === currentUser?.id && !m.isRead
                ).length;

                return (
                  <div
                    key={user.id}
                    onClick={() => handleOpenPartnerChat(user)}
                    className="p-2.5 hover:bg-blue-50/80 transition-colors cursor-pointer flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <div className="relative flex-shrink-0">
                        <div className="w-7 h-7 rounded-full bg-slate-800 text-white font-bold text-[10px] flex items-center justify-center">
                          {user.name.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-white" />
                      </div>
                      <div className="truncate">
                        <span className="font-semibold text-slate-900 block truncate">
                          {user.name}
                        </span>
                        <span className="text-[10px] text-slate-500 block truncate">
                          {user.role} {user.matricule ? `• ${user.matricule}` : ''}
                        </span>
                      </div>
                    </div>

                    {unreadForUser > 0 && (
                      <span className="px-1.5 py-0.5 bg-red-500 text-white font-bold text-[10px] rounded-full">
                        {unreadForUser}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* The Bottom Button Bar */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="bg-slate-900 hover:bg-slate-800 text-white p-3 sm:px-4 sm:py-2.5 rounded-full lg:rounded-b-none lg:rounded-t-xl shadow-xl border border-slate-700 flex items-center gap-2 transition-all cursor-pointer font-bold text-xs"
        >
          <div className="relative">
            <MessageCircle className="w-4 h-4 text-emerald-400" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <span className="hidden sm:inline">Discussion & En Ligne ({connectedUsers.length})</span>
          <span className="sm:hidden text-[11px]">Chat ({connectedUsers.length})</span>
          {totalUnreadCount > 0 && (
            <span className="px-1.5 py-0.2 bg-red-500 text-white text-[10px] font-bold rounded-full animate-bounce">
              {totalUnreadCount}
            </span>
          )}
          {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronUp className="w-3.5 h-3.5 text-slate-400" />}
        </button>
      </div>
    </div>
  );
};
