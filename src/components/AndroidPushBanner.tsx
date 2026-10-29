import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Bell, AlertTriangle, Calendar, CheckCircle2, X } from 'lucide-react';

export const AndroidPushBanner: React.FC = () => {
  const { activePushBanner, dismissPushBanner, markAsRead } = useApp();

  useEffect(() => {
    if (activePushBanner) {
      const timer = setTimeout(() => {
        dismissPushBanner();
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [activePushBanner, dismissPushBanner]);

  if (!activePushBanner) return null;

  const getIcon = () => {
    switch (activePushBanner.type) {
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

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm w-full animate-bounce-short">
      <div className="bg-slate-900/95 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-slate-700/60 p-4 transition-all hover:scale-[1.01]">
        {/* Android notification badge header */}
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5 pb-1 border-b border-slate-800">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="font-semibold text-emerald-400 uppercase tracking-wider text-[10px]">
              Android Push • EBM Planning
            </span>
          </div>
          <span>À l'instant</span>
        </div>

        {/* Notification body */}
        <div className="flex items-start gap-3 mt-1">
          <div className="p-2 bg-slate-800 rounded-xl flex-shrink-0">
            {getIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-white leading-tight truncate">
              {activePushBanner.title}
            </h4>
            <p className="text-xs text-slate-300 mt-1 line-clamp-2 leading-relaxed">
              {activePushBanner.message}
            </p>
          </div>
          <button
            onClick={dismissPushBanner}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 mt-3 pt-2 border-t border-slate-800/80">
          <button
            onClick={() => {
              markAsRead(activePushBanner.id, 'ANDROID');
              dismissPushBanner();
            }}
            className="text-xs font-medium text-slate-400 hover:text-white px-2.5 py-1 rounded-lg hover:bg-slate-800"
          >
            Ignorer
          </button>
          <button
            onClick={() => {
              markAsRead(activePushBanner.id, 'ANDROID');
              dismissPushBanner();
            }}
            className="text-xs font-semibold text-blue-400 hover:text-blue-300 px-3 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20"
          >
            Voir le cours
          </button>
        </div>
      </div>
    </div>
  );
};
