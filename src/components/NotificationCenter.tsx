import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Bell, CheckCheck, X, AlertTriangle, Calendar, CheckCircle2, Smartphone, Monitor, Send } from 'lucide-react';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ isOpen, onClose }) => {
  const { notifications, markAsRead, markAllAsRead, sendManualPush, currentUser } = useApp();
  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');
  const [testPushText, setTestPushText] = useState('');

  if (!isOpen) return null;

  // Filter for user or user role
  const userNotifs = notifications.filter(
    (n) => n.recipientId === currentUser.id || n.recipientRole === currentUser.role || !n.recipientId
  );

  const displayedNotifs = filter === 'UNREAD' ? userNotifs.filter((n) => !n.isReadWeb) : userNotifs;

  const unreadWebCount = userNotifs.filter((n) => !n.isReadWeb).length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'CANCEL':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'RESCHEDULE':
        return <Calendar className="w-5 h-5 text-amber-500" />;
      case 'SUCCESS':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      default:
        return <Bell className="w-5 h-5 text-blue-500" />;
    }
  };

  const handleSendTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPushText.trim()) return;
    sendManualPush('⚠️ Alerte Emploi du Temps EBM', testPushText.trim(), 'CANCEL');
    setTestPushText('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full flex flex-col max-h-[85vh] border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600 rounded-xl">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base flex items-center gap-2">
                Centre de Notifications
                {unreadWebCount > 0 && (
                  <span className="text-xs bg-red-500 text-white font-semibold px-2 py-0.5 rounded-full">
                    {unreadWebCount} non lue{unreadWebCount > 1 ? 's' : ''}
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-300">
                Synchronisation automatique Web & Android en temps réel
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter bar */}
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                filter === 'ALL'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              Toutes ({userNotifs.length})
            </button>
            <button
              onClick={() => setFilter('UNREAD')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                filter === 'UNREAD'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              Non lues ({unreadWebCount})
            </button>
          </div>
          {unreadWebCount > 0 && (
            <button
              onClick={() => markAllAsRead('WEB')}
              className="flex items-center gap-1 text-blue-700 hover:text-blue-900 font-semibold transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Tout marquer comme lu (Web)
            </button>
          )}
        </div>

        {/* Notifications list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {displayedNotifs.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
              Aucune notification pour le moment.
            </div>
          ) : (
            displayedNotifs.map((notif) => (
              <div
                key={notif.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  !notif.isReadWeb
                    ? 'bg-blue-50/70 border-blue-200 shadow-sm'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-white rounded-lg shadow-xs border border-slate-100 flex-shrink-0">
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-bold text-slate-900 leading-snug">
                        {notif.title}
                      </h4>
                      <span className="text-[11px] text-slate-400 whitespace-nowrap">
                        {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {notif.message}
                    </p>

                    {/* Sync badges: Web status & Android Push status */}
                    <div className="flex items-center gap-3 mt-2.5 pt-2 border-t border-slate-100 text-[11px]">
                      <span className="flex items-center gap-1 text-slate-500">
                        <Monitor className="w-3.5 h-3.5 text-blue-600" />
                        Web : {notif.isReadWeb ? (
                          <span className="text-emerald-700 font-medium">Lue</span>
                        ) : (
                          <span className="text-amber-700 font-medium">Non lue</span>
                        )}
                      </span>
                      <span className="flex items-center gap-1 text-slate-500">
                        <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                        Android Push : {notif.isReadAndroid ? (
                          <span className="text-emerald-700 font-medium">Lue</span>
                        ) : (
                          <span className="text-blue-700 font-medium">Reçue (non lue)</span>
                        )}
                      </span>

                      {!notif.isReadWeb && (
                        <button
                          onClick={() => markAsRead(notif.id, 'WEB')}
                          className="ml-auto text-blue-600 hover:text-blue-800 font-semibold"
                        >
                          Marquer lue
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Quick Push Test Trigger Box */}
        <div className="p-3 bg-slate-100 border-t border-slate-200">
          <form onSubmit={handleSendTest} className="flex gap-2">
            <input
              type="text"
              value={testPushText}
              onChange={(e) => setTestPushText(e.target.value)}
              placeholder="Tester un push Android en direct (ex: Cours décalé en Salle B102)"
              className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors"
            >
              <Send className="w-3 h-3" />
              Émettre Push
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
