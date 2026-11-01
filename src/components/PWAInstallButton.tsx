import React, { useState } from 'react';
import { usePWAInstall, useOnlineStatus, useBrowserNotifications } from '../hooks/usePWAInstall';
import { useApp } from '../context/AppContext';
import {
  Download,
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle2,
  Bell,
  Smartphone,
  X,
  Calendar,
  Share2,
} from 'lucide-react';
import { showAppToast } from './ToastAndConfirmCenter';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={async () => {
          const ok = await install();
          if (ok) {
            showAppToast({
              type: 'success',
              title: 'Application EBM SIS installée',
              message: "L'application est maintenant accessible sur votre écran d'accueil, même hors ligne.",
            });
          }
        }}
        className={`flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
          compact ? 'px-2.5 py-1.5 text-[11px]' : 'px-3.5 py-2 text-xs'
        }`}
        title="Installer l'application officielle EBM SIS (mode hors-ligne inclus)"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Installer l'App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
            compact ? 'px-2.5 py-1.5 text-[11px]' : 'px-3.5 py-2 text-xs'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5 text-blue-400" />
          <span>Installer sur iPhone</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl text-slate-900 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-blue-600" />
                  Installer EBM SIS sur iPhone / iPad
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <ol className="text-xs text-slate-600 space-y-2 list-decimal pl-4">
                <li>
                  Appuyez sur le bouton <strong>Partager</strong> dans la barre de navigation Safari.
                </li>
                <li>
                  Faites défiler vers le bas et sélectionnez <strong>Sur l'écran d'accueil</strong>.
                </li>
                <li>
                  Appuyez sur <strong>Ajouter</strong> pour consulter votre emploi du temps hors ligne.
                </li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full rounded-xl bg-slate-900 py-2 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer"
              >
                Compris
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

export const OfflineAndSyncIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const {
    firebaseUser,
    isCloudConnected,
    cloudSyncStatus,
    lastSyncDate,
    loginWithGoogleFirebase,
    syncAllToCloudFirestore,
    pullFromCloudFirestore,
  } = useApp();
  const { supported, permission, requestPermission, sendBrowserNotification } = useBrowserNotifications();
  const [showDetails, setShowDetails] = useState(false);

  const isRealtimeActive = Boolean(isOnline && isCloudConnected && firebaseUser);

  return (
    <>
      {/* Persistent Top/Bottom Offline Banner when disconnected */}
      {!isOnline && (
        <div className="fixed bottom-16 lg:bottom-4 left-4 z-50 flex items-center gap-2.5 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-bold text-white shadow-xl">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>Hors ligne — vos changements sont enregistrés et seront envoyés dès le retour du réseau.</span>
        </div>
      )}

      {/* Header Compact Pill/Button */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
            !isOnline
              ? 'bg-amber-950/90 border-amber-600 text-amber-200'
              : cloudSyncStatus === 'SYNCING'
              ? 'bg-blue-950/90 border-blue-600 text-blue-200'
              : isRealtimeActive
              ? 'bg-slate-800 border-emerald-500/40 text-emerald-300 hover:bg-slate-700'
              : 'bg-amber-500/15 border-amber-400/40 text-amber-200 hover:bg-amber-500/25'
          }`}
          title="État de la synchronisation temps réel Cloud Firestore multi-ordinateurs"
        >
          {!isOnline ? (
            <>
              <WifiOff className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline">Hors ligne</span>
            </>
          ) : cloudSyncStatus === 'SYNCING' ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin" />
              <span className="hidden md:inline">Synchro Cloud…</span>
            </>
          ) : isRealtimeActive ? (
            <>
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline">Cloud Temps Réel</span>
            </>
          ) : (
            <>
              <RefreshCw className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden md:inline">Activer Synchro Cloud</span>
            </>
          )}
        </button>

        {showDetails && (
          <div className="absolute right-0 top-full mt-2 w-84 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-4 z-50 text-xs text-slate-200 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-white flex items-center gap-1.5">
                {!isOnline ? (
                  <WifiOff className="w-4 h-4 text-amber-400" />
                ) : isRealtimeActive ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <RefreshCw className="w-4 h-4 text-amber-400" />
                )}
                {!isOnline
                  ? 'Mode Hors-Ligne Actif'
                  : isRealtimeActive
                  ? 'Cloud Firestore Temps Réel Actif'
                  : 'Mode Local — Connectez Cloud Firestore'}
              </span>
              <button
                type="button"
                onClick={() => setShowDetails(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed">
              {!isOnline
                ? "L'emploi du temps, les notes et les listes restent consultables hors ligne. Vos modifications locales seront synchronisées automatiquement dès le retour de la connexion."
                : isRealtimeActive
                ? `Synchronisation multi-ordinateurs active en temps réel (28 collections Firestore • ${firebaseUser?.email}).${
                    lastSyncDate ? ` Dernière synchro : ${lastSyncDate.toLocaleTimeString('fr-FR')}.` : ''
                  }`
                : 'Pour que les cours planifiés et les modifications apparaissent en direct sur tous les ordinateurs, connectez votre session Google Cloud (ex: louvamifaly@gmail.com).'}
            </p>

            {!firebaseUser && isOnline && (
              <button
                type="button"
                onClick={async () => {
                  const res = await loginWithGoogleFirebase();
                  showAppToast({
                    type: res.success ? 'success' : 'error',
                    title: res.success ? 'Cloud Firestore connecté' : 'Connexion Google Cloud',
                    message: res.message,
                  });
                }}
                className="w-full py-2 px-3 rounded-xl bg-[#2F6FED] hover:bg-blue-600 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4" />
                Connecter Google Cloud (Temps Réel)
              </button>
            )}

            {/* Real Web Push Notifications Toggle */}
            {supported && (
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                <div className="text-[11px]">
                  <div className="font-bold text-white flex items-center gap-1">
                    <Bell className="w-3.5 h-3.5 text-blue-400" />
                    Notifications système (PWA)
                  </div>
                  <div className="text-slate-400">
                    {permission === 'granted'
                      ? 'Activées sur cet appareil'
                      : permission === 'denied'
                      ? 'Bloquées dans le navigateur'
                      : 'Non activées'}
                  </div>
                </div>
                {permission !== 'granted' ? (
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await requestPermission();
                      if (res === 'granted') {
                        sendBrowserNotification(
                          'EBM Institute — Notifications activées',
                          'Vous recevrez désormais les alertes de report de cours, notes et échéances en direct.'
                        );
                        showAppToast({
                          type: 'success',
                          title: 'Notifications système activées',
                        });
                      }
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] cursor-pointer shrink-0"
                  >
                    Activer
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      sendBrowserNotification(
                        'EBM SIS — Test de notification',
                        'Les notifications temps réel fonctionnent sur votre appareil.'
                      )
                    }
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 font-bold text-[11px] cursor-pointer shrink-0"
                  >
                    Tester
                  </button>
                )}
              </div>
            )}

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
              <button
                type="button"
                disabled={!isOnline}
                onClick={async () => {
                  const res = await pullFromCloudFirestore();
                  showAppToast({
                    type: res.success ? 'success' : 'error',
                    title: res.success ? 'Données distantes chargées' : 'Chargement Cloud',
                    message: res.message,
                  });
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-bold text-[11px] border border-slate-700 cursor-pointer"
              >
                Actualiser depuis Cloud
              </button>
              <button
                type="button"
                disabled={!isOnline}
                onClick={async () => {
                  const res = await syncAllToCloudFirestore();
                  showAppToast({
                    type: res.success ? 'success' : 'error',
                    title: res.success ? 'Synchronisation Cloud terminée' : 'Avertissement Synchronisation',
                    message: res.message,
                  });
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-[11px] cursor-pointer ml-auto"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Synchroniser maintenant
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
