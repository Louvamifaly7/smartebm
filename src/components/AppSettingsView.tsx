import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Settings,
  Layout,
  Sliders,
  CheckCircle2,
  RotateCcw,
  MessageCircle,
  Eye,
  Check,
  Shield,
  Palette,
  Image,
  Layers,
  Calendar,
  GraduationCap,
  Award,
  DollarSign,
  QrCode,
  BookOpen,
  MessageSquare,
  Users,
  HardDrive,
  Archive,
  Plus,
  Trash2,
  Clock,
  Smartphone,
  ShieldCheck,
  Edit2,
} from 'lucide-react';
import { SYSTEM_ROLE_DEFINITIONS, DEFAULT_SYSTEM_ROLE_TABS, syncSystemRolePermissions } from '../utils/rbacPermissions';
import { UserRole } from '../types';

interface AppSettingsViewProps {
  onOpenReceptionTests?: () => void;
}

export const AppSettingsView: React.FC<AppSettingsViewProps> = ({ onOpenReceptionTests }) => {
  const {
    currentUser,
    appSettings,
    updateAppSettings,
    learningResources,
    submissions,
    archiveOldResources,
    customRoles,
    addCustomRole,
    deleteCustomRole,
    isAndroidView,
    toggleAndroidView,
  } = useApp();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [editingSystemRole, setEditingSystemRole] = useState<UserRole | null>(null);
  const isAdmin = currentUser.role === 'ADMIN';

  const getRoleAllowedTabs = (role: UserRole): string[] => {
    if (role === 'ADMIN') return availableModules.map((m) => m.id);
    if (appSettings.systemRolePermissions && Array.isArray(appSettings.systemRolePermissions[role])) {
      return appSettings.systemRolePermissions[role]!;
    }
    return DEFAULT_SYSTEM_ROLE_TABS[role] || [];
  };

  const handleToggleSystemRoleModule = (role: UserRole, modId: string) => {
    if (role === 'ADMIN') return;
    const currentTabs = getRoleAllowedTabs(role);
    const updatedTabs = currentTabs.includes(modId)
      ? currentTabs.filter((t) => t !== modId)
      : [...currentTabs, modId];
    if (updatedTabs.length === 0) return;
    const nextOverrides: Partial<Record<UserRole, string[]>> = {
      ...(appSettings.systemRolePermissions || {}),
      [role]: updatedTabs,
    };
    syncSystemRolePermissions(nextOverrides);
    updateAppSettings({ systemRolePermissions: nextOverrides });
    showSaveSuccess(`Modules autorisés mis à jour pour le rôle système ${role}.`);
  };

  const handleResetSystemRoleModules = (role: UserRole) => {
    const nextOverrides: Partial<Record<UserRole, string[]>> = {
      ...(appSettings.systemRolePermissions || {}),
    };
    delete nextOverrides[role];
    syncSystemRolePermissions(nextOverrides);
    updateAppSettings({ systemRolePermissions: nextOverrides });
    showSaveSuccess(`Modules par défaut rétablis pour le rôle ${role}.`);
  };

  const scheduleConfig = appSettings.scheduleSettings || {
    dayStartTime: '07:00',
    dayEndTime: '18:00',
    slotIntervalMinutes: 30 as 15 | 30 | 60,
  };

  // Generate 30-minute time slots preview (ex: 07:00, 07:30, ..., 18:00)
  const generatedTimeSlots = (() => {
    const [startH, startM] = (scheduleConfig.dayStartTime || '07:00').split(':').map(Number);
    const [endH, endM] = (scheduleConfig.dayEndTime || '18:00').split(':').map(Number);
    const step = scheduleConfig.slotIntervalMinutes || 30;
    const startTotal = (isNaN(startH) ? 7 : startH) * 60 + (isNaN(startM) ? 0 : startM);
    const endTotal = (isNaN(endH) ? 18 : endH) * 60 + (isNaN(endM) ? 0 : endM);
    const slots: string[] = [];
    for (let m = startTotal; m <= endTotal; m += step) {
      const hh = String(Math.floor(m / 60)).padStart(2, '0');
      const mm = String(m % 60).padStart(2, '0');
      slots.push(`${hh}:${mm}`);
    }
    return slots;
  })();

  // New Custom Role state (ACC-038, ACC-039)
  const [newRoleCode, setNewRoleCode] = useState('');
  const [newRoleLabel, setNewRoleLabel] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [newRoleTabs, setNewRoleTabs] = useState<string[]>(['HOME', 'TIMETABLE', 'STUDENTS']);
  const [newRoleOps, setNewRoleOps] = useState<string[]>(['VIEW_REPORTS']);

  const storageConfig = appSettings.storageSettings || {
    maxFileSizeMb: 25,
    allowedExtensions: ['PDF', 'DOCX', 'XLSX', 'PPTX', 'JPG', 'PNG', 'ZIP'],
    globalQuotaMb: 2048,
    autoArchivePreviousYears: false,
  };

  // Compute real storage usage (ACC-024)
  const activeResources = learningResources.filter((r) => !r.isArchived);
  const archivedResources = learningResources.filter((r) => r.isArchived);
  const totalBytesUsed =
    activeResources.reduce((acc, r) => acc + (r.fileSizeBytes || 2097152), 0) +
    submissions.reduce((acc, s) => acc + (s.fileSizeBytes || 1258291), 0);
  const usedMb = Number((totalBytesUsed / (1024 * 1024)).toFixed(2));
  const remainingMb = Math.max(0, Number((storageConfig.globalQuotaMb - usedMb).toFixed(2)));
  const usagePercent = Math.min(100, Math.round((usedMb / storageConfig.globalQuotaMb) * 100));

  const availableModules = [
    { id: 'HOME', label: 'Accueil & Tableau de Bord', icon: Layout, desc: 'Vue de synthèse, raccourcis et statistiques' },
    { id: 'TIMETABLE', label: 'Emploi du Temps', icon: Calendar, desc: 'Planning hebdomadaire sur 7 jours' },
    { id: 'ROOMS', label: 'Salles & Équipements', icon: Layers, desc: 'Occupation des salles et personnalisation du matériel' },
    { id: 'LMD_MAQUETTES', label: 'Maquettes LMD', icon: GraduationCap, desc: 'Gestion des UEs, ECs et crédits ECTS' },
    { id: 'VOLUMES', label: 'Suivi des Volumes Horaires & Réalisations', icon: Clock, desc: 'Validation quotidienne des séances et suivi des heures réalisées' },
    { id: 'GRADES', label: 'Notes & Évaluations', icon: Award, desc: 'Contrôle continu, examen final, rattrapages et relevés' },
    { id: 'QR_ATTENDANCE', label: 'Présence & Pointage QR', icon: QrCode, desc: 'QR code éphémère et compte à rebours' },
    { id: 'FINANCIAL', label: 'Finances & Caisse (Ar)', icon: DollarSign, desc: 'Encaissements en Ariary et clôture de caisse' },
    { id: 'HOMEWORK_RESOURCES', label: 'Devoirs & Cours', icon: BookOpen, desc: 'Remise de travaux et supports pédagogiques' },
    { id: 'COMMUNICATION', label: 'Mur & Messages', icon: MessageSquare, desc: 'Fil d’actualités et messagerie interne' },
    { id: 'PARENT_PORTAL', label: 'Espace Parents / Tuteurs', icon: Users, desc: 'Portail familial dédié multi-enfants' },
    { id: 'STUDENTS', label: 'Répertoire Étudiants', icon: GraduationCap, desc: 'Fiches détaillées, tri par mention/groupe/année, notes et impayés' },
    { id: 'TEACHERS', label: 'Corps Enseignant', icon: Users, desc: 'Fiches professeurs, charges horaires et matières' },
    { id: 'ACADEMIC_YEARS', label: 'Paramètres Académiques', icon: Calendar, desc: 'Configuration centralisée des années universitaires' },
    { id: 'USERS_MANAGEMENT', label: 'Administration & Outils', icon: Users, desc: 'Comptes, données, volumes horaires et audit' },
    { id: 'SETTINGS', label: 'Paramètres Système', icon: Settings, desc: 'Configuration de l’interface, stockage et RBAC' },
  ];

  const handleLayoutChange = (layout: 'vertical' | 'horizontal') => {
    updateAppSettings({ menuLayout: layout });
    showSaveSuccess(
      layout === 'vertical'
        ? 'Disposition changée : Menu vertical (Sidebar latérale type OpenEduCat 19) activé.'
        : 'Disposition changée : Menu horizontal classique activé.'
    );
  };

  const handleToggleModule = (modId: string) => {
    const current = appSettings.visibleMenuItems || [];
    let updated: string[];
    if (current.includes(modId)) {
      if (current.length <= 1) return; // Prevent hiding all
      updated = current.filter((id) => id !== modId);
    } else {
      updated = [...current, modId];
    }
    updateAppSettings({ visibleMenuItems: updated });
    showSaveSuccess('Préférences du menu mises à jour !');
  };

  const handleResetDefaults = () => {
    updateAppSettings({
      menuLayout: 'vertical',
      visibleMenuItems: availableModules.map((m) => m.id),
      compactMode: false,
      showLiveChat: true,
      scheduleSettings: {
        dayStartTime: '07:00',
        dayEndTime: '18:00',
        slotIntervalMinutes: 30,
      },
    });
    showSaveSuccess('Paramètres par défaut rétablis avec succès !');
  };

  const showSaveSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  const handleToggleAllowedExtension = (ext: string) => {
    const current = storageConfig.allowedExtensions;
    const updated = current.includes(ext) ? current.filter((e) => e !== ext) : [...current, ext];
    if (updated.length === 0) return;
    updateAppSettings({
      storageSettings: {
        ...storageConfig,
        allowedExtensions: updated,
      },
    });
    showSaveSuccess(`Extensions autorisées mises à jour (${updated.join(', ')})`);
  };

  const handleCreateCustomRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleCode.trim() || !newRoleLabel.trim()) return;
    addCustomRole({
      code: newRoleCode,
      label: newRoleLabel,
      baseRole: 'ADMIN_STAFF',
      description: newRoleDesc || 'Rôle personnalisé EBM Institute',
      allowedTabs: newRoleTabs,
      allowedOperations: newRoleOps as any,
      canAccessSensitiveData: false,
    });
    setNewRoleCode('');
    setNewRoleLabel('');
    setNewRoleDesc('');
    showSaveSuccess(`Rôle personnalisé "${newRoleLabel}" créé et actif immédiatement.`);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* 1. Header */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-slate-900 text-white rounded-xl shadow-xs">
              <Settings className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Paramètres de l'Application, Stockage & Rôles RBAC
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Personnalisez la navigation, les quotas documentaires, l'archivage et les rôles d'accès EBM Institute.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Rétablir par Défaut
          </button>
        </div>

        {successMsg && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </div>
        )}
      </div>

      {/* 2. Storage Quota, File Validation & Archiving (Section 4 - ACC-022 to ACC-025) */}
      <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider">
              Stockage Documentaire, Quotas & Archivage (Devoirs & Supports)
            </h3>
          </div>
          <button
            type="button"
            onClick={() => {
              const count = archiveOldResources();
              showSaveSuccess(`${count} document(s) des années clôturées ont été archivés avec succès.`);
            }}
            className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Archive className="w-3.5 h-3.5 text-amber-700" />
            Archiver les documents des années clôturées ({archivedResources.length} archivés)
          </button>
        </div>

        {/* Storage KPI Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">Espace Utilisé</span>
            <span className="text-lg font-black text-indigo-700">{usedMb} Mo</span>
            <span className="text-[10px] text-slate-400 block">sur {storageConfig.globalQuotaMb} Mo alloués ({usagePercent}%)</span>
          </div>
          <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200">
            <span className="text-[10px] font-bold uppercase text-emerald-700 block">Espace Disponible</span>
            <span className="text-lg font-black text-emerald-800">{remainingMb} Mo</span>
            <span className="text-[10px] text-emerald-600 block">Quota opérationnel</span>
          </div>
          <div className="p-3.5 bg-blue-50 rounded-xl border border-blue-200">
            <span className="text-[10px] font-bold uppercase text-blue-700 block">Fichiers Actifs</span>
            <span className="text-lg font-black text-blue-900">{activeResources.length + submissions.length}</span>
            <span className="text-[10px] text-blue-600 block">{activeResources.length} cours • {submissions.length} rendus</span>
          </div>
          <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200">
            <span className="text-[10px] font-bold uppercase text-amber-800 block">Taille Max / Fichier</span>
            <span className="text-lg font-black text-amber-900">{storageConfig.maxFileSizeMb} Mo</span>
            <span className="text-[10px] text-amber-700 block">Contrôle strict à l'envoi</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Taille maximale autorisée par fichier (Mo) :
              </label>
              <input
                type="number"
                min={1}
                max={500}
                value={storageConfig.maxFileSizeMb}
                onChange={(e) => {
                  updateAppSettings({
                    storageSettings: {
                      ...storageConfig,
                      maxFileSizeMb: Math.max(1, Number(e.target.value)),
                    },
                  });
                }}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 font-bold text-indigo-700"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Quota global de stockage établissement (Mo) :
              </label>
              <input
                type="number"
                min={100}
                step={100}
                value={storageConfig.globalQuotaMb}
                onChange={(e) => {
                  updateAppSettings({
                    storageSettings: {
                      ...storageConfig,
                      globalQuotaMb: Math.max(100, Number(e.target.value)),
                    },
                  });
                }}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 font-bold text-slate-800"
              />
            </div>
          </div>

          <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <span className="font-bold text-slate-700 block">
              Formats de fichiers autorisés au téléversement :
            </span>
            <div className="flex flex-wrap gap-2">
              {['PDF', 'DOCX', 'XLSX', 'PPTX', 'JPG', 'PNG', 'ZIP'].map((ext) => {
                const active = storageConfig.allowedExtensions.includes(ext);
                return (
                  <button
                    key={ext}
                    type="button"
                    onClick={() => handleToggleAllowedExtension(ext)}
                    className={`px-3 py-1.5 rounded-lg font-mono font-bold text-xs border transition-all cursor-pointer ${
                      active
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white text-slate-500 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    .{ext.toLowerCase()}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-500">
              Tout fichier dont l'extension est désactivée ou dépassant {storageConfig.maxFileSizeMb} Mo est automatiquement bloqué lors du dépôt.
            </p>
          </div>
        </div>
      </div>

      {/* 2B. Schedule Time Range & Slot Interval Configuration (Default 07:00 to 18:00 every 30 min) */}
      <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider">
              Paramétrage des Horaires Officiels (Emploi du Temps & Guide d'Affectation Salle)
            </h3>
          </div>
          <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-[11px] font-bold">
            Plage active : {scheduleConfig.dayStartTime} → {scheduleConfig.dayEndTime} (Pas de {scheduleConfig.slotIntervalMinutes} min)
          </span>
        </div>

        <p className="text-xs text-slate-500">
          Définissez l'heure de début, l'heure de fin et l'intervalle des créneaux proposés dans le Guide d'Affectation des Étudiants dans une Salle et la planification de cours (par défaut : de <strong>07:00</strong> à <strong>18:00</strong> par tranches de <strong>30 minutes</strong>).
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <label className="font-bold text-slate-700 block mb-1">
              Heure de début de journée (ex: 07:00) :
            </label>
            <input
              type="time"
              step={1800}
              value={scheduleConfig.dayStartTime}
              onChange={(e) => {
                updateAppSettings({
                  scheduleSettings: {
                    ...scheduleConfig,
                    dayStartTime: e.target.value || '07:00',
                  },
                });
                showSaveSuccess(`Heure de début réglée sur ${e.target.value}`);
              }}
              className="w-full bg-white border border-slate-300 rounded-lg p-2 font-mono font-bold text-indigo-700"
            />
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <label className="font-bold text-slate-700 block mb-1">
              Heure de fin de journée (ex: 18:00) :
            </label>
            <input
              type="time"
              step={1800}
              value={scheduleConfig.dayEndTime}
              onChange={(e) => {
                updateAppSettings({
                  scheduleSettings: {
                    ...scheduleConfig,
                    dayEndTime: e.target.value || '18:00',
                  },
                });
                showSaveSuccess(`Heure de fin réglée sur ${e.target.value}`);
              }}
              className="w-full bg-white border border-slate-300 rounded-lg p-2 font-mono font-bold text-indigo-700"
            />
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <label className="font-bold text-slate-700 block mb-1">
              Intervalle des créneaux (minutes) :
            </label>
            <select
              value={scheduleConfig.slotIntervalMinutes}
              onChange={(e) => {
                const interval = Number(e.target.value) as 15 | 30 | 60;
                updateAppSettings({
                  scheduleSettings: {
                    ...scheduleConfig,
                    slotIntervalMinutes: interval,
                  },
                });
                showSaveSuccess(`Intervalle horaire réglé sur toutes les ${interval} minutes.`);
              }}
              className="w-full bg-white border border-slate-300 rounded-lg p-2 font-bold text-slate-900"
            >
              <option value={15}>Toutes les 15 minutes</option>
              <option value={30}>Toutes les 30 minutes (Recommandé)</option>
              <option value={60}>Toutes les 60 minutes (1 heure)</option>
            </select>
          </div>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1.5">
            Aperçu des {generatedTimeSlots.length} créneaux horaires générés :
          </span>
          <div className="flex flex-wrap gap-1.5">
            {generatedTimeSlots.map((slot) => (
              <span
                key={slot}
                className="px-2 py-0.5 bg-white border border-slate-200 rounded font-mono text-[11px] font-semibold text-slate-700"
              >
                {slot}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Dynamic RBAC Roles & Custom Roles Management — STRICTEMENT RÉSERVÉ AUX ADMINS */}
      {isAdmin && (
        <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider">
                Rôles Système & Création de Rôles Personnalisés (Réservé Administrateur)
              </h3>
            </div>
            <span className="px-2.5 py-0.5 bg-rose-100 text-rose-800 rounded-full text-[10px] font-bold uppercase">
              Accès Admin Uniquement
            </span>
          </div>

          <p className="text-xs text-slate-500">
            Cliquez sur <strong>« Modifier les modules »</strong> sur un rôle système pour personnaliser les onglets et modules autorisés pour ce profil.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            {SYSTEM_ROLE_DEFINITIONS.map((r) => {
              const currentTabs = getRoleAllowedTabs(r.role);
              const isEditingThis = editingSystemRole === r.role;
              const isCustomized =
                r.role !== 'ADMIN' &&
                appSettings.systemRolePermissions &&
                Array.isArray(appSettings.systemRolePermissions[r.role]);

              return (
                <div
                  key={r.role}
                  className={`p-3.5 rounded-xl border transition-all space-y-2 ${
                    isEditingThis
                      ? 'border-indigo-500 bg-indigo-50/50 ring-2 ring-indigo-200'
                      : 'border-slate-200 bg-slate-50/70'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-[10px] px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                        {r.role}
                      </span>
                      {isCustomized && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                          Modifié
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 font-bold">{currentTabs.length} modules</span>
                  </div>
                  <div className="font-bold text-slate-900">{r.label}</div>
                  <p className="text-[11px] text-slate-500 line-clamp-2">{r.description}</p>

                  {r.role !== 'ADMIN' ? (
                    <div className="pt-1 flex items-center justify-between gap-2 border-t border-slate-200/70">
                      <button
                        type="button"
                        onClick={() => setEditingSystemRole(isEditingThis ? null : r.role)}
                        className={`px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors ${
                          isEditingThis
                            ? 'bg-indigo-700 text-white'
                            : 'bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}
                      >
                        <Edit2 className="w-3 h-3" />
                        {isEditingThis ? 'Fermer l’éditeur' : 'Modifier les modules'}
                      </button>
                      {isCustomized && (
                        <button
                          type="button"
                          onClick={() => handleResetSystemRoleModules(r.role)}
                          className="text-[10px] text-slate-500 hover:text-rose-600 font-semibold underline cursor-pointer"
                        >
                          Par défaut
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="pt-1 border-t border-slate-200/70 text-[10px] font-semibold text-emerald-700">
                      Super-Admin : Accès intégral permanent
                    </div>
                  )}
                </div>
              );
            })}
            {customRoles.map((cr) => (
              <div key={cr.id} className="p-3.5 rounded-xl border border-emerald-300 bg-emerald-50/60 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-[10px] px-2 py-0.5 rounded bg-emerald-600 text-white">
                    {cr.code} (Personnalisé)
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteCustomRole(cr.id)}
                    className="text-rose-500 hover:text-rose-700 p-0.5 cursor-pointer"
                    title="Supprimer ce rôle personnalisé"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="font-bold text-slate-900">{cr.label}</div>
                <p className="text-[11px] text-slate-600 line-clamp-2">{cr.description}</p>
              </div>
            ))}
          </div>

          {/* Interactive System Role Module Permissions Panel */}
          {editingSystemRole && editingSystemRole !== 'ADMIN' && (
            <div className="p-4 bg-indigo-50/70 border-2 border-indigo-300 rounded-2xl space-y-3 text-xs animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-200 pb-2.5">
                <div>
                  <span className="text-[10px] font-bold uppercase text-indigo-700 block">
                    Configuration des accès du rôle système
                  </span>
                  <h4 className="font-black text-slate-900 text-sm">
                    Modules autorisés pour :{' '}
                    {SYSTEM_ROLE_DEFINITIONS.find((r) => r.role === editingSystemRole)?.label} ({editingSystemRole})
                  </h4>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleResetSystemRoleModules(editingSystemRole)}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl font-bold text-xs cursor-pointer"
                  >
                    Rétablir par défaut
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingSystemRole(null)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs cursor-pointer"
                  >
                    Terminé
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {availableModules.map((mod) => {
                  const allowed = getRoleAllowedTabs(editingSystemRole).includes(mod.id);
                  const IconComp = mod.icon;
                  return (
                    <button
                      key={`sysrole-${editingSystemRole}-${mod.id}`}
                      type="button"
                      onClick={() => handleToggleSystemRoleModule(editingSystemRole, mod.id)}
                      className={`p-2.5 rounded-xl border text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                        allowed
                          ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <IconComp className={`w-4 h-4 shrink-0 ${allowed ? 'text-indigo-200' : 'text-slate-400'}`} />
                        <span className="font-bold truncate text-[11px]">{mod.label}</span>
                      </div>
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${
                          allowed ? 'bg-white text-indigo-700' : 'border border-slate-300'
                        }`}
                      >
                        {allowed && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Form to create a new custom role without changing code (ACC-038, ACC-039) */}
          <form onSubmit={handleCreateCustomRole} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 text-xs">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-indigo-600" />
              <span>Créer un nouveau rôle personnalisé (sans modifier le code source)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                required
                placeholder="Code rôle (ex: SURVEILLANT_GENERAL)"
                value={newRoleCode}
                onChange={(e) => setNewRoleCode(e.target.value.toUpperCase())}
                className="bg-white border border-slate-300 rounded-lg p-2 font-mono font-bold"
              />
              <input
                type="text"
                required
                placeholder="Libellé (ex: Surveillant Général)"
                value={newRoleLabel}
                onChange={(e) => setNewRoleLabel(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg p-2 font-semibold"
              />
              <input
                type="text"
                placeholder="Description des responsabilités..."
                value={newRoleDesc}
                onChange={(e) => setNewRoleDesc(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg p-2"
              />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-600 block mb-1.5">
                Modules autorisés pour ce rôle :
              </span>
              <div className="flex flex-wrap gap-1.5">
                {availableModules.map((m) => {
                  const active = newRoleTabs.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() =>
                        setNewRoleTabs((prev) =>
                          prev.includes(m.id) ? prev.filter((t) => t !== m.id) : [...prev, m.id]
                        )
                      }
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                        active
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-slate-600 border-slate-300'
                      }`}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
              >
                Enregistrer le Rôle Personnalisé
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3B. Outils d'Administration : Contrôle Qualité & Simulateur Vue Android — STRICTEMENT RÉSERVÉ AUX ADMINS */}
      {isAdmin && (
        <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider">
                Outils Techniques & Contrôle Qualité (Réservé Administrateur)
              </h3>
            </div>
            <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold uppercase">
              Admin Système
            </span>
          </div>

          <p className="text-xs text-slate-500">
            Ces outils techniques ont été retirés du menu principal afin d'alléger l'interface quotidienne et sont accessibles exclusivement ici pour les administrateurs.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {onOpenReceptionTests && (
              <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Matrice de Contrôle Qualité (ACC)</h4>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Vérifier les critères d'acceptation et tests de sécurité de la plateforme.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onOpenReceptionTests}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs shrink-0 cursor-pointer flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Ouvrir Contrôle Qualité
                </button>
              </div>
            )}

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Simulateur Mobile Android</h4>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Tester l'aperçu de l'application mobile étudiante et le scan QR.
                </p>
              </div>
              <button
                type="button"
                onClick={toggleAndroidView}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-xs shrink-0 cursor-pointer flex items-center gap-1.5"
              >
                <Smartphone className="w-4 h-4 text-emerald-400" />
                {isAndroidView ? 'Quitter Vue Android' : 'Ouvrir Vue Android'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Visual Identity & Official Logo */}
      <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Image className="w-5 h-5 text-indigo-600" />
          <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider">
            Identité Visuelle & Logo Officiel
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-center">
            <img
              src="/assets/aistudio/logo_540e8d94.png"
              alt="EBM Institute Business School"
              className="max-h-20 max-w-full object-contain"
            />
          </div>

          <div className="space-y-2 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-red-100 text-red-800 font-bold rounded">Logo Officiel Actif</span>
              <span className="text-slate-400 font-mono">logo_540e8d94.png</span>
            </div>
            <p>
              Ce logo certifié est déployé sur l'ensemble de la plateforme : en-têtes web, menu vertical, relevés de notes, reçus d'écolage et simulateur Android.
            </p>
            <div className="flex items-center gap-3 pt-2 text-[11px] font-semibold text-slate-500">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-[#c2182b]" /> Rouge EBM
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-[#1e3a8a]" /> Bleu Marine
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-[#0d9488]" /> Vert Turquoise
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Navigation Layout Choice (Vertical Sidebar vs Horizontal Topbar) */}
      <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Layout className="w-5 h-5 text-indigo-600" />
          <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider">
            Disposition de la Navigation Principale
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Option A: Vertical Sidebar (OpenEduCat 19 Style) */}
          <div
            onClick={() => handleLayoutChange('vertical')}
            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
              appSettings.menuLayout === 'vertical'
                ? 'border-indigo-600 bg-indigo-50/40 shadow-sm'
                : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
            }`}
          >
            {appSettings.menuLayout === 'vertical' && (
              <span className="absolute top-3 right-3 p-1 bg-indigo-600 text-white rounded-full">
                <Check className="w-3.5 h-3.5" />
              </span>
            )}
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-indigo-600 text-white rounded-xl">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900">
                  Menu Vertical (Sidebar Latérale)
                </h4>
                <span className="text-[10px] text-indigo-700 font-semibold bg-indigo-100 px-2 py-0.5 rounded-full">
                  Inspiré OpenEduCat 19
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mt-2">
              Menu latéral permanent à gauche avec catégories repliables, indicateur d'année académique et accès rapide aux modules.
            </p>
          </div>

          {/* Option B: Horizontal Topbar */}
          <div
            onClick={() => handleLayoutChange('horizontal')}
            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
              appSettings.menuLayout === 'horizontal'
                ? 'border-indigo-600 bg-indigo-50/40 shadow-sm'
                : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
            }`}
          >
            {appSettings.menuLayout === 'horizontal' && (
              <span className="absolute top-3 right-3 p-1 bg-indigo-600 text-white rounded-full">
                <Check className="w-3.5 h-3.5" />
              </span>
            )}
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-slate-700 text-white rounded-xl">
                <Layout className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900">
                  Menu Horizontal (Barre Supérieure)
                </h4>
                <span className="text-[10px] text-slate-600 font-semibold bg-slate-200 px-2 py-0.5 rounded-full">
                  Disposition Classique
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mt-2">
              Barre de navigation étalée en haut de l'écran avec onglets horizontaux directs et sous-barre administrative contextuelle.
            </p>
          </div>
        </div>
      </div>

      {/* 6. Menu Items Visibility Customization */}
      <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider">
              Personnalisation des Éléments du Menu
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            {appSettings.visibleMenuItems?.length || 0} sur {availableModules.length} modules affichés
          </span>
        </div>

        <p className="text-xs text-slate-500">
          Cochez ou décochez les éléments pour afficher uniquement les modules dont vous avez besoin dans votre menu quotidien.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {availableModules.map((mod) => {
            const Icon = mod.icon;
            const isChecked = (appSettings.visibleMenuItems || []).includes(mod.id);

            return (
              <div
                key={mod.id}
                onClick={() => handleToggleModule(mod.id)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                  isChecked
                    ? 'bg-blue-50/50 border-blue-200 text-slate-900'
                    : 'bg-slate-50/60 border-slate-200 text-slate-400 opacity-60'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => {}}
                  className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <Icon className={`w-4 h-4 ${isChecked ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span className="font-bold text-xs truncate">{mod.label}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug line-clamp-1">
                    {mod.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 7. Live Chat & Ergonomics Preferences */}
      <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <MessageCircle className="w-5 h-5 text-indigo-600" />
          <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider">
            Discussion & Live Chat Messenger
          </h3>
        </div>

        <div className="space-y-3 text-xs">
          <label className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
            <div>
              <span className="font-bold text-slate-900 block">
                Activer le widget Live Chat Messenger en bas de l'écran
              </span>
              <span className="text-slate-500 text-[11px]">
                Affiche la barre des utilisateurs connectés et permet de discuter en direct comme sur Messenger.
              </span>
            </div>
            <input
              type="checkbox"
              checked={appSettings.showLiveChat !== false}
              onChange={(e) => {
                updateAppSettings({ showLiveChat: e.target.checked });
                showSaveSuccess(
                  e.target.checked ? 'Live Chat Messenger activé.' : 'Live Chat Messenger désactivé.'
                );
              }}
              className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
            />
          </label>

          <label className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
            <div>
              <span className="font-bold text-slate-900 block">
                Mode d'affichage compact
              </span>
              <span className="text-slate-500 text-[11px]">
                Réduit l'espacement des tableaux et formulaires pour maximiser la vue sur les petits écrans.
              </span>
            </div>
            <input
              type="checkbox"
              checked={appSettings.compactMode || false}
              onChange={(e) => {
                updateAppSettings({ compactMode: e.target.checked });
                showSaveSuccess('Densité d’affichage mise à jour.');
              }}
              className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
            />
          </label>
        </div>
      </div>
    </div>
  );
};
