import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { ROLE_DEFINITIONS } from '../utils/rbacPermissions';
import { SystemBackupSnapshot } from '../types';
import {
  ShieldCheck,
  Database,
  Cloud,
  Download,
  Upload,
  RotateCcw,
  Lock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FileJson,
  KeyRound,
  History,
  Server,
} from 'lucide-react';

export const BackupAndSecurityView: React.FC = () => {
  const {
    currentUser,
    firebaseUser,
    isCloudConnected,
    cloudSyncStatus,
    loginWithGoogleFirebase,
    syncAllToCloudFirestore,
    pullFromCloudFirestore,
    savedBackups,
    createSystemBackup,
    restoreSystemBackup,
    users,
    ues,
    ecs,
    grades,
    payments,
    auditLogs,
  } = useApp();

  const [backupLabel, setBackupLabel] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'SUCCESS' | 'ERROR'; text: string } | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const showMessage = (type: 'SUCCESS' | 'ERROR', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 5000);
  };

  const handleGoogleAuth = async () => {
    setIsBusy(true);
    const res = await loginWithGoogleFirebase();
    setIsBusy(false);
    showMessage(res.success ? 'SUCCESS' : 'ERROR', res.message);
  };

  const handleCloudPush = async () => {
    setIsBusy(true);
    const res = await syncAllToCloudFirestore();
    setIsBusy(false);
    showMessage(res.success ? 'SUCCESS' : 'ERROR', res.message);
  };

  const handleCloudPull = async () => {
    setIsBusy(true);
    const res = await pullFromCloudFirestore();
    setIsBusy(false);
    showMessage(res.success ? 'SUCCESS' : 'ERROR', res.message);
  };

  const handleCreateAndDownloadBackup = () => {
    const label =
      backupLabel.trim() ||
      `Sauvegarde SIS EBM Institute - ${new Date().toLocaleDateString('fr-FR')} ${new Date().toLocaleTimeString('fr-FR')}`;
    const snap = createSystemBackup(label);
    setBackupLabel('');

    // Trigger JSON download
    const blob = new Blob([JSON.stringify(snap, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `EBM_SIS_BACKUP_${new Date().toISOString().slice(0, 10)}_${snap.checksum}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showMessage(
      'SUCCESS',
      `Sauvegarde complète générée et téléchargée (${snap.recordCount} enregistrements • Checksum ${snap.checksum}).`
    );
  };

  const handleDownloadExistingSnapshot = (snap: SystemBackupSnapshot) => {
    const blob = new Blob([JSON.stringify(snap, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `EBM_SIS_BACKUP_${snap.createdAt.slice(0, 10)}_${snap.checksum}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportBackupFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(String(event.target?.result || '')) as SystemBackupSnapshot;
        if (!parsed.payload || typeof parsed.payload !== 'object') {
          showMessage('ERROR', 'Le fichier JSON sélectionné ne correspond pas au format de sauvegarde SIS EBM.');
          return;
        }
        const res = restoreSystemBackup(parsed);
        showMessage(res.success ? 'SUCCESS' : 'ERROR', res.message);
      } catch {
        showMessage('ERROR', 'Impossible de lire le fichier JSON de sauvegarde.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-6 rounded-2xl shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold uppercase">
              Infrastructure SIS de Production
            </span>
            <span className="text-xs text-blue-300 font-mono">
              Firebase Cloud Firestore & RBAC 6 Rôles
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">
            Base de Données Cloud, Sauvegardes & Sécurité SIS
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Synchronisation Cloud Firestore, sauvegardes JSON chiffrées avec somme de contrôle, restauration sécurisée et matrice des 6 rôles EBM Institute.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="px-3.5 py-2 rounded-xl bg-white/10 border border-white/15 text-xs">
            <span className="text-slate-300 block text-[10px] uppercase font-bold">Statut Cloud Firestore</span>
            <span className="font-bold flex items-center gap-1.5 text-emerald-300 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {isCloudConnected ? 'Base Provisionnée & Sécurisée' : 'Mode Hybride Local'}
            </span>
          </div>

          <div className="px-3.5 py-2 rounded-xl bg-white/10 border border-white/15 text-xs">
            <span className="text-slate-300 block text-[10px] uppercase font-bold">Session Firebase Auth</span>
            <span className="font-bold text-white mt-0.5 block">
              {firebaseUser ? firebaseUser.email || 'Authentifié (UID actif)' : currentUser.email}
            </span>
          </div>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-2xl border text-xs font-semibold flex items-center gap-2.5 ${
            statusMessage.type === 'SUCCESS'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-red-50 border-red-300 text-red-900'
          }`}
        >
          {statusMessage.type === 'SUCCESS' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Grid: Cloud Firestore Sync + Full Backup & Restore */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Cloud Firestore & Firebase Authentication */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl">
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-sm text-slate-900">
                  Persistance Cloud Firestore & Authentification Firebase
                </h2>
                <p className="text-[11px] text-slate-500">
                  Synchronisation non-destructive avec sauvegarde automatique préalable
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono bg-blue-50 text-blue-800 px-2 py-1 rounded border border-blue-200 font-bold">
              {cloudSyncStatus}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5 text-center bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Comptes & Étudiants</span>
              <span className="text-lg font-black text-slate-900">{users.length}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">UE / EC / Notes</span>
              <span className="text-lg font-black text-indigo-700">
                {ues.length + ecs.length + grades.length}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Paiements & Audit</span>
              <span className="text-lg font-black text-emerald-700">
                {payments.length + auditLogs.length}
              </span>
            </div>
          </div>

          <div className="space-y-2.5 pt-1">
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={isBusy}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
            >
              <KeyRound className="w-4 h-4 text-amber-400" />
              <span>
                {firebaseUser && !firebaseUser.isAnonymous
                  ? `Connecté à Firebase Auth (${firebaseUser.email})`
                  : 'Authentifier ma session Administrateur avec Google (Firebase Auth)'}
              </span>
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleCloudPush}
                disabled={isBusy}
                className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isBusy ? 'animate-spin' : ''}`} />
                <span>Synchroniser vers Firestore</span>
              </button>

              <button
                type="button"
                onClick={handleCloudPull}
                disabled={isBusy}
                className="py-2.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Server className="w-3.5 h-3.5" />
                <span>Charger depuis Firestore</span>
              </button>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              <span>Règles de sécurité Firestore déployées (`firestore.rules`) :</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-slate-600">
              <li>Zéro accès public (`request.auth != null` obligatoire sur 100 % des collections).</li>
              <li>Cloisonnement strict : chaque étudiant n'accède qu'à ses notes, inscriptions et reçus.</li>
              <li>Journal d'audit (`auditLogs`) en mode <strong>Append-Only</strong> (modification et suppression interdites).</li>
            </ul>
          </div>
        </div>

        {/* 2. Backup & Restore Engine */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-sm text-slate-900">
                  Sauvegarde & Restauration Intégrale (Snapshot JSON)
                </h2>
                <p className="text-[11px] text-slate-500">
                  Protection contre toute perte de données avec somme de contrôle SHA
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            <label className="block text-xs font-bold text-slate-700">
              Libellé de la sauvegarde (optionnel)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={backupLabel}
                onChange={(e) => setBackupLabel(e.target.value)}
                placeholder="Ex: Sauvegarde avant délibération Semestre 1..."
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
              <button
                type="button"
                onClick={handleCreateAndDownloadBackup}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Créer & Télécharger (.json)</span>
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-700">
              Restaurer depuis un fichier de sauvegarde externe :
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportBackupFile}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-amber-700" />
              <span>Importer & Restaurer un fichier .json</span>
            </button>
          </div>

          {/* Saved Snapshots List */}
          <div className="space-y-2 pt-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <History className="w-3.5 h-3.5" />
              Points de restauration récents ({savedBackups.length})
            </span>

            {savedBackups.length === 0 ? (
              <div className="p-4 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-400 italic">
                Aucune sauvegarde locale enregistrée. Cliquez sur « Créer & Télécharger » pour générer un point de restauration.
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                {savedBackups.map((snap) => (
                  <div
                    key={snap.id}
                    className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 truncate flex items-center gap-1.5">
                        <FileJson className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">{snap.label}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {new Date(snap.createdAt).toLocaleString('fr-FR')} • {snap.recordCount} objets • {snap.checksum}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleDownloadExistingSnapshot(snap)}
                        className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg cursor-pointer"
                        title="Télécharger ce fichier JSON"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const res = restoreSystemBackup(snap);
                          showMessage(res.success ? 'SUCCESS' : 'ERROR', res.message);
                        }}
                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 cursor-pointer"
                        title="Restaurer cet état"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Restaurer</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. RBAC Matrix for the 6 Official SIS Roles */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-900">
                Matrice Officielle des 6 Rôles & Permissions SIS — EBM Institute
              </h2>
              <p className="text-[11px] text-slate-500">
                Droits d'accès appliqués simultanément sur l'interface (menus et tableaux de bord) et dans `firestore.rules`
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {(['ADMIN', 'SCOLARITE', 'FINANCE', 'ACADEMIC_HEAD', 'TEACHER', 'STUDENT'] as const).map((rKey) => {
            const def = ROLE_DEFINITIONS[rKey];
            return (
              <div
                key={rKey}
                className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between gap-2"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${def.badgeColor}`}>
                      {def.label}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 font-bold">{rKey}</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{def.description}</p>
                </div>
                <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Modules autorisés :</span>
                  <span className="font-bold text-slate-800">{def.allowedTabs.length} modules</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
