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
  Bell,
  Globe,
  Database,
  History,
  ExternalLink,
} from 'lucide-react';
import { SYSTEM_ROLE_DEFINITIONS, DEFAULT_SYSTEM_ROLE_TABS, syncSystemRolePermissions } from '../utils/rbacPermissions';
import { UserRole } from '../types';

interface AppSettingsViewProps {
  onOpenReceptionTests?: () => void;
  onNavigateTab?: (tab: string) => void;
}

type SettingsCategoryTab =
  | 'GENERAL'
  | 'ACADEMIC'
  | 'PLANNING'
  | 'USERS_ACCESS'
  | 'NOTIFICATIONS'
  | 'INTEGRATIONS'
  | 'DATA_SECURITY';

export const AppSettingsView: React.FC<AppSettingsViewProps> = ({ onOpenReceptionTests, onNavigateTab }) => {
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
    academicYears,
    selectedAcademicYear,
    setSelectedAcademicYear,
    filieres,
    parcours,
    rooms,
    isCloudConnected,
  } = useApp();

  const [activeCategory, setActiveCategory] = useState<SettingsCategoryTab>('GENERAL');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [editingSystemRole, setEditingSystemRole] = useState<UserRole | null>(null);
  const isAdmin = currentUser.role === 'ADMIN';

  const availableModules = [
    { id: 'HOME', label: 'Tableau de bord', icon: Layout, desc: "Vue d'ensemble, tâches et alertes" },
    { id: 'TIMETABLE', label: 'Emplois du temps', icon: Calendar, desc: 'Planning hebdomadaire sur 7 jours' },
    { id: 'ROOMS', label: 'Salles & disponibilités', icon: Layers, desc: 'Occupation des salles et équipements' },
    { id: 'VOLUMES', label: 'Volumes horaires', icon: Clock, desc: 'Suivi et validation des heures réalisées' },
    { id: 'STUDENTS', label: 'Étudiants', icon: GraduationCap, desc: 'Répertoire étudiants, dossiers et suivi' },
    { id: 'TEACHERS', label: 'Enseignants', icon: Users, desc: 'Fiches enseignants, disponibilités et charges' },
    { id: 'LMD_MAQUETTES', label: 'Filières & maquettes LMD', icon: GraduationCap, desc: 'UEs, ECs et crédits ECTS' },
    { id: 'QR_ATTENDANCE', label: 'Présences & appel QR', icon: QrCode, desc: 'Appel QR dynamique et justificatifs' },
    { id: 'GRADES', label: 'Notes & évaluations', icon: Award, desc: 'Saisie des notes, délibérations et relevés' },
    { id: 'HOMEWORK_RESOURCES', label: 'Devoirs & documents', icon: BookOpen, desc: 'Remise de travaux et supports' },
    { id: 'FINANCIAL', label: 'Finances & caisse (Ar)', icon: DollarSign, desc: 'Paiements, reçus et états financiers' },
    { id: 'COMMUNICATION', label: 'Annonces & messagerie', icon: MessageSquare, desc: 'Annonces ciblées et messages' },
    { id: 'PARENT_PORTAL', label: 'Portail Parents / Tuteurs', icon: Users, desc: 'Suivi familial multi-enfants' },
    { id: 'ACADEMIC_YEARS', label: 'Années universitaires', icon: Calendar, desc: 'Sessions académiques et périodes' },
    { id: 'USERS_MANAGEMENT', label: 'Gestion des personnes', icon: Users, desc: 'Comptes, profils et accès RBAC' },
    { id: 'SETTINGS', label: 'Paramètres', icon: Settings, desc: 'Configuration générale et outils' },
  ];

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
    showSaveSuccess(`Modules autorisés mis à jour pour le rôle ${role}.`);
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

  // New Custom Role state
  const [newRoleCode, setNewRoleCode] = useState('');
  const [newRoleLabel, setNewRoleLabel] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [newRoleTabs, setNewRoleTabs] = useState<string[]>(['HOME', 'TIMETABLE', 'STUDENTS']);
  const [newRoleOps] = useState<string[]>(['VIEW_REPORTS']);

  const storageConfig = appSettings.storageSettings || {
    maxFileSizeMb: 25,
    allowedExtensions: ['PDF', 'DOCX', 'XLSX', 'PPTX', 'JPG', 'PNG', 'ZIP'],
    globalQuotaMb: 2048,
    autoArchivePreviousYears: false,
  };

  const activeResources = learningResources.filter((r) => !r.isArchived);
  const archivedResources = learningResources.filter((r) => r.isArchived);
  const totalBytesUsed =
    activeResources.reduce((acc, r) => acc + (r.fileSizeBytes || 2097152), 0) +
    submissions.reduce((acc, s) => acc + (s.fileSizeBytes || 1258291), 0);
  const usedMb = Number((totalBytesUsed / (1024 * 1024)).toFixed(2));
  const remainingMb = Math.max(0, Number((storageConfig.globalQuotaMb - usedMb).toFixed(2)));
  const usagePercent = Math.min(100, Math.round((usedMb / storageConfig.globalQuotaMb) * 100));

  const showSaveSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  const handleLayoutChange = (layout: 'vertical' | 'horizontal') => {
    updateAppSettings({ menuLayout: layout });
    showSaveSuccess(
      layout === 'vertical'
        ? 'Disposition changée : Menu vertical (barre latérale) activé.'
        : 'Disposition changée : Menu horizontal supérieur activé.'
    );
  };

  const handleToggleModule = (modId: string) => {
    const current = appSettings.visibleMenuItems || [];
    let updated: string[];
    if (current.includes(modId)) {
      if (current.length <= 1) return;
      updated = current.filter((id) => id !== modId);
    } else {
      updated = [...current, modId];
    }
    updateAppSettings({ visibleMenuItems: updated });
    showSaveSuccess('Préférences du menu mises à jour.');
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
    showSaveSuccess('Paramètres par défaut rétablis.');
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
    showSaveSuccess(`Rôle personnalisé « ${newRoleLabel} » créé.`);
  };

  // 7 Categories from Section 6 (Page 8 of the UX/UI Redesign PDF)
  const categories: {
    id: SettingsCategoryTab;
    label: string;
    subtitle: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    {
      id: 'GENERAL',
      label: 'Général',
      subtitle: "Nom et logo de l'établissement, préférences d'affichage",
      icon: Settings,
    },
    {
      id: 'ACADEMIC',
      label: 'Académique',
      subtitle: 'Années universitaires, périodes, règles LMD',
      icon: GraduationCap,
    },
    {
      id: 'PLANNING',
      label: 'Planning',
      subtitle: 'Créneaux horaires, règles de conflits, durées',
      icon: Clock,
    },
    {
      id: 'USERS_ACCESS',
      label: 'Utilisateurs & accès',
      subtitle: 'Rôles, permissions, règles de compte',
      icon: Shield,
    },
    {
      id: 'NOTIFICATIONS',
      label: 'Notifications',
      subtitle: "Alertes d'annulation, report, rappel et messagerie",
      icon: Bell,
    },
    {
      id: 'INTEGRATIONS',
      label: 'Intégrations',
      subtitle: 'Google Agenda, Firebase Cloud et services connectés',
      icon: Globe,
    },
    {
      id: 'DATA_SECURITY',
      label: 'Données & sécurité',
      subtitle: "Sauvegardes, restauration, journal d'audit et contrôles",
      icon: Database,
    },
  ];

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      {/* 1. Page Header */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#17345B] text-white rounded-xl shadow-xs">
              <Settings className="w-6 h-6 text-blue-300" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-[#17345B]">
                Paramètres & configuration de l'établissement
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Réglages organisés par domaine métier (Général, Académique, Planning, Accès, Notifications, Intégrations, Sécurité).
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3.5 py-2 bg-[#F5F7FA] hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Rétablir par défaut
          </button>
        </div>

        {successMsg && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-[#1F8A83] flex-shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </div>
        )}
      </div>

      {/* 2. Secondary Navigation + Active Category Content (Section 6, Page 8) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Secondary Navigation (7 Categories) */}
        <aside className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-2 shadow-xs space-y-1">
          <div className="px-3 py-2 border-b border-slate-100">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Catégories de paramètres
            </span>
          </div>
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start gap-2.5 cursor-pointer ${
                  isSelected
                    ? 'bg-[#17345B] text-white shadow-xs'
                    : 'text-slate-700 hover:bg-[#F5F7FA]'
                }`}
              >
                <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${isSelected ? 'text-blue-300' : 'text-[#2F6FED]'}`} />
                <div className="min-w-0">
                  <span className="font-bold text-xs block">{cat.label}</span>
                  <span className={`text-[10px] block leading-tight mt-0.5 ${isSelected ? 'text-blue-200' : 'text-slate-500'}`}>
                    {cat.subtitle}
                  </span>
                </div>
              </button>
            );
          })}
        </aside>

        {/* Right Panel: Category Content */}
        <div className="lg:col-span-9 space-y-5">
          {/* ==================== 1. GÉNÉRAL ==================== */}
          {activeCategory === 'GENERAL' && (
            <>
              {/* Identité visuelle & Logo */}
              <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Image className="w-5 h-5 text-[#2F6FED]" />
                  <div>
                    <h3 className="font-bold text-sm text-[#17345B]">
                      Nom et logo de l'établissement
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Identité visuelle institutionnelle appliquée sur le portail web et les documents PDF.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div className="p-5 bg-[#F5F7FA] rounded-2xl border border-slate-200 flex items-center justify-center">
                    <img
                      src="/assets/aistudio/logo_540e8d94.png"
                      alt="EBM Institute Business School"
                      className="max-h-20 max-w-full object-contain"
                    />
                  </div>
                  <div className="space-y-2 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 bg-[#1F8A83] text-white font-bold rounded text-[10px]">
                        Logo Officiel Actif
                      </span>
                      <span className="font-bold text-[#17345B]">EBM Institute Business School</span>
                    </div>
                    <p>
                      Déployé sur les en-têtes, relevés de notes LMD, procès-verbaux de délibération et reçus de caisse.
                    </p>
                    <div className="flex flex-wrap items-center gap-3 pt-2 text-[11px] font-semibold text-slate-600">
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-[#17345B]" /> Bleu marine #17345B
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-[#2F6FED]" /> Bleu action #2F6FED
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-[#1F8A83]" /> Turquoise #1F8A83
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Disposition de la navigation */}
              <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Layout className="w-5 h-5 text-[#2F6FED]" />
                  <div>
                    <h3 className="font-bold text-sm text-[#17345B]">
                      Préférences d'affichage & disposition du menu
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Choisissez entre la barre latérale verticale (recommandée) ou la barre supérieure horizontale.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div
                    onClick={() => handleLayoutChange('vertical')}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
                      appSettings.menuLayout === 'vertical'
                        ? 'border-[#2F6FED] bg-blue-50/30 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-[#F5F7FA]'
                    }`}
                  >
                    {appSettings.menuLayout === 'vertical' && (
                      <span className="absolute top-3 right-3 p-1 bg-[#2F6FED] text-white rounded-full">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    )}
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-[#17345B] text-white rounded-xl">
                        <Sliders className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-[#17345B]">Menu vertical (Barre latérale)</h4>
                        <span className="text-[10px] text-[#2F6FED] font-bold">Recommandé</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600">
                      Navigation structurée en 7 grandes sections métier avec fil d'Ariane contextuel.
                    </p>
                  </div>

                  <div
                    onClick={() => handleLayoutChange('horizontal')}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
                      appSettings.menuLayout === 'horizontal'
                        ? 'border-[#2F6FED] bg-blue-50/30 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-[#F5F7FA]'
                    }`}
                  >
                    {appSettings.menuLayout === 'horizontal' && (
                      <span className="absolute top-3 right-3 p-1 bg-[#2F6FED] text-white rounded-full">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    )}
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-slate-700 text-white rounded-xl">
                        <Layout className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-[#17345B]">Menu horizontal (Barre supérieure)</h4>
                        <span className="text-[10px] text-slate-500 font-semibold">Disposition compacte</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600">
                      Regroupe les 7 sections dans l'en-tête supérieur pour libérer toute la largeur d'écran.
                    </p>
                  </div>
                </div>

                <label className="flex items-center justify-between p-3.5 bg-[#F5F7FA] rounded-xl border border-slate-200 cursor-pointer text-xs">
                  <div>
                    <span className="font-bold text-slate-900 block">Mode d'affichage compact (Pleine largeur)</span>
                    <span className="text-slate-500 text-[11px]">
                      Étend les tableaux et emplois du temps sur toute la largeur disponible.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={appSettings.compactMode || false}
                    onChange={(e) => {
                      updateAppSettings({ compactMode: e.target.checked });
                      showSaveSuccess("Densité d'affichage mise à jour.");
                    }}
                    className="rounded text-[#2F6FED] w-4 h-4"
                  />
                </label>
              </div>

              {/* Visibilité des modules */}
              <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Eye className="w-5 h-5 text-[#2F6FED]" />
                    <h3 className="font-bold text-sm text-[#17345B]">Modules affichés dans le menu</h3>
                  </div>
                  <span className="text-xs text-slate-500">
                    {appSettings.visibleMenuItems?.length || 0} / {availableModules.length} actifs
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {availableModules.map((mod) => {
                    const Icon = mod.icon;
                    const isChecked = (appSettings.visibleMenuItems || []).includes(mod.id);
                    return (
                      <div
                        key={mod.id}
                        onClick={() => handleToggleModule(mod.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 select-none ${
                          isChecked
                            ? 'bg-blue-50/40 border-blue-200 text-slate-900'
                            : 'bg-[#F5F7FA] border-slate-200 text-slate-400 opacity-65'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="mt-0.5 rounded text-[#2F6FED] w-4 h-4 cursor-pointer"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <Icon className={`w-3.5 h-3.5 ${isChecked ? 'text-[#2F6FED]' : 'text-slate-400'}`} />
                            <span className="font-bold text-xs truncate">{mod.label}</span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{mod.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* ==================== 2. ACADÉMIQUE ==================== */}
          {activeCategory === 'ACADEMIC' && (
            <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-[#2F6FED]" />
                  <div>
                    <h3 className="font-bold text-sm text-[#17345B]">
                      Années universitaires, périodes & architecture LMD
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Sélectionnez l'année universitaire active ou ouvrez le gestionnaire complet des sessions et maquettes LMD.
                    </p>
                  </div>
                </div>
                {onNavigateTab && (
                  <button
                    type="button"
                    onClick={() => onNavigateTab('ACADEMIC_YEARS')}
                    className="px-3.5 py-2 bg-[#2F6FED] hover:bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Gérer les années universitaires
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-4 bg-[#F5F7FA] rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">Session active</span>
                  <span className="text-lg font-black text-[#17345B] mt-0.5 block">{selectedAcademicYear}</span>
                  <span className="text-[10px] text-[#1F8A83] font-bold">{academicYears.length} années configurées</span>
                </div>
                <div className="p-4 bg-[#F5F7FA] rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">Filières & Mentions LMD</span>
                  <span className="text-lg font-black text-[#17345B] mt-0.5 block">{filieres.length} mentions</span>
                  <span className="text-[10px] text-slate-500">{parcours.length} parcours actifs</span>
                </div>
                <div className="p-4 bg-[#F5F7FA] rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">Standard de validation</span>
                  <span className="text-lg font-black text-[#1F8A83] mt-0.5 block">Système LMD (ECTS)</span>
                  <span className="text-[10px] text-slate-500">Moyenne ≥ 10/20 • Compensation UE</span>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <label className="font-bold text-slate-700 block">Changer l'année universitaire active :</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {academicYears.map((ay) => (
                    <button
                      key={ay.id}
                      type="button"
                      onClick={() => {
                        setSelectedAcademicYear(ay.code);
                        showSaveSuccess(`Année universitaire active basculée sur ${ay.code}.`);
                      }}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                        ay.code === selectedAcademicYear
                          ? 'bg-[#17345B] text-white border-[#17345B] font-bold'
                          : 'bg-[#F5F7FA] text-slate-800 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div>
                        <span className="block text-xs font-bold">{ay.code}</span>
                        <span className={`text-[10px] ${ay.code === selectedAcademicYear ? 'text-blue-200' : 'text-slate-500'}`}>
                          {ay.status}
                        </span>
                      </div>
                      {ay.code === selectedAcademicYear && <Check className="w-4 h-4 text-blue-300" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ==================== 3. PLANNING ==================== */}
          {activeCategory === 'PLANNING' && (
            <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#2F6FED]" />
                  <div>
                    <h3 className="font-bold text-sm text-[#17345B]">
                      Créneaux horaires, durées & règles de conflits
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Plage horaire officielle de l'emploi du temps et détection en direct des chevauchements (salle, enseignant, groupe).
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-blue-50 text-[#17345B] border border-blue-200 rounded-lg text-[11px] font-bold">
                  {scheduleConfig.dayStartTime} → {scheduleConfig.dayEndTime} ({scheduleConfig.slotIntervalMinutes} min)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-3.5 bg-[#F5F7FA] rounded-xl border border-slate-200">
                  <label className="font-bold text-slate-700 block mb-1">Heure d'ouverture :</label>
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
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 font-mono font-bold text-[#17345B]"
                  />
                </div>

                <div className="p-3.5 bg-[#F5F7FA] rounded-xl border border-slate-200">
                  <label className="font-bold text-slate-700 block mb-1">Heure de fermeture :</label>
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
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 font-mono font-bold text-[#17345B]"
                  />
                </div>

                <div className="p-3.5 bg-[#F5F7FA] rounded-xl border border-slate-200">
                  <label className="font-bold text-slate-700 block mb-1">Pas des créneaux :</label>
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
                      showSaveSuccess(`Intervalle horaire réglé sur ${interval} minutes.`);
                    }}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 font-bold text-slate-900"
                  >
                    <option value={15}>Toutes les 15 minutes</option>
                    <option value={30}>Toutes les 30 minutes (Standard)</option>
                    <option value={60}>Toutes les 60 minutes (1 heure)</option>
                  </select>
                </div>
              </div>

              <div className="p-3.5 bg-[#F5F7FA] rounded-xl border border-slate-200 text-xs">
                <span className="text-[10px] font-bold uppercase text-slate-500 block mb-2">
                  Aperçu des {generatedTimeSlots.length} repères horaires générés ({rooms.length} salles configurées) :
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
          )}

          {/* ==================== 4. UTILISATEURS & ACCÈS ==================== */}
          {activeCategory === 'USERS_ACCESS' && (
            <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[#2F6FED]" />
                  <div>
                    <h3 className="font-bold text-sm text-[#17345B]">
                      Rôles système, permissions par rôle & règles de compte
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Contrôle d'accès basé sur les rôles (RBAC) et création de profils personnalisés.
                    </p>
                  </div>
                </div>
                {onNavigateTab && (
                  <button
                    type="button"
                    onClick={() => onNavigateTab('USERS_MANAGEMENT')}
                    className="px-3.5 py-1.5 bg-[#17345B] hover:bg-[#102542] text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Gérer les personnes
                  </button>
                )}
              </div>

              {!isAdmin ? (
                <div className="p-4 bg-[#F5F7FA] rounded-xl border border-slate-200 text-xs text-slate-600">
                  La modification de la matrice des permissions système est réservée aux administrateurs. Votre rôle actuel est <strong>{currentUser.role}</strong>.
                </div>
              ) : (
                <>
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
                              ? 'border-[#2F6FED] bg-blue-50/40 ring-2 ring-blue-100'
                              : 'border-slate-200 bg-[#F5F7FA]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono font-bold text-[10px] px-2 py-0.5 rounded bg-[#17345B] text-white">
                              {r.role}
                            </span>
                            <span className="text-[10px] text-slate-500 font-bold">{currentTabs.length} modules</span>
                          </div>
                          <div className="font-bold text-slate-900">{r.label}</div>
                          <p className="text-[11px] text-slate-500 line-clamp-2">{r.description}</p>

                          {r.role !== 'ADMIN' ? (
                            <div className="pt-1 flex items-center justify-between gap-2 border-t border-slate-200/70">
                              <button
                                type="button"
                                onClick={() => setEditingSystemRole(isEditingThis ? null : r.role)}
                                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer ${
                                  isEditingThis
                                    ? 'bg-[#2F6FED] text-white'
                                    : 'bg-white hover:bg-slate-100 text-[#17345B] border border-slate-300'
                                }`}
                              >
                                <Edit2 className="w-3 h-3" />
                                {isEditingThis ? 'Fermer' : 'Permissions'}
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
                            <div className="pt-1 border-t border-slate-200/70 text-[10px] font-semibold text-[#1F8A83]">
                              Accès intégral permanent
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {customRoles.map((cr) => (
                      <div key={cr.id} className="p-3.5 rounded-xl border border-emerald-300 bg-emerald-50/50 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-[10px] px-2 py-0.5 rounded bg-[#1F8A83] text-white">
                            {cr.code}
                          </span>
                          <button
                            type="button"
                            onClick={() => deleteCustomRole(cr.id)}
                            className="text-rose-500 hover:text-rose-700 p-0.5 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="font-bold text-slate-900">{cr.label}</div>
                        <p className="text-[11px] text-slate-600 line-clamp-2">{cr.description}</p>
                      </div>
                    ))}
                  </div>

                  {editingSystemRole && editingSystemRole !== 'ADMIN' && (
                    <div className="p-4 bg-[#F5F7FA] border-2 border-[#2F6FED] rounded-2xl space-y-3 text-xs">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <h4 className="font-bold text-[#17345B]">
                          Modules autorisés pour {editingSystemRole}
                        </h4>
                        <button
                          type="button"
                          onClick={() => setEditingSystemRole(null)}
                          className="px-3 py-1 bg-[#17345B] text-white rounded-lg font-bold text-xs cursor-pointer"
                        >
                          Terminé
                        </button>
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
                              className={`p-2.5 rounded-xl border text-left flex items-center justify-between gap-2 cursor-pointer ${
                                allowed
                                  ? 'bg-[#2F6FED] text-white border-[#2F6FED]'
                                  : 'bg-white text-slate-600 border-slate-200'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <IconComp className="w-4 h-4 shrink-0" />
                                <span className="font-bold truncate text-[11px]">{mod.label}</span>
                              </div>
                              {allowed && <Check className="w-3.5 h-3.5 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleCreateCustomRole} className="p-4 bg-[#F5F7FA] rounded-2xl border border-slate-200 space-y-3 text-xs">
                    <div className="font-bold text-[#17345B] flex items-center gap-1.5">
                      <Plus className="w-4 h-4 text-[#2F6FED]" />
                      <span>Créer un rôle personnalisé</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input
                        type="text"
                        required
                        placeholder="Code (ex: SURVEILLANT)"
                        value={newRoleCode}
                        onChange={(e) => setNewRoleCode(e.target.value.toUpperCase())}
                        className="bg-white border border-slate-300 rounded-lg p-2 font-mono font-bold"
                      />
                      <input
                        type="text"
                        required
                        placeholder="Libellé"
                        value={newRoleLabel}
                        onChange={(e) => setNewRoleLabel(e.target.value)}
                        className="bg-white border border-slate-300 rounded-lg p-2 font-semibold"
                      />
                      <input
                        type="text"
                        placeholder="Description"
                        value={newRoleDesc}
                        onChange={(e) => setNewRoleDesc(e.target.value)}
                        className="bg-white border border-slate-300 rounded-lg p-2"
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-[#2F6FED] hover:bg-blue-600 text-white font-bold rounded-xl cursor-pointer"
                      >
                        Ajouter le rôle
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          )}

          {/* ==================== 5. NOTIFICATIONS ==================== */}
          {activeCategory === 'NOTIFICATIONS' && (
            <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Bell className="w-5 h-5 text-[#2F6FED]" />
                <div>
                  <h3 className="font-bold text-sm text-[#17345B]">
                    Alertes d'annulation, report, rappels & messagerie directe
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Gérez les notifications de changement d'emploi du temps et le widget de discussion en direct.
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-4 bg-[#F5F7FA] rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 block">
                      Alertes automatiques de report ou d'annulation de séance
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      Notifie instantanément les étudiants du groupe et l'enseignant lorsqu'un cours est déplacé ou annulé.
                    </span>
                  </div>
                  <span className="px-2.5 py-1 bg-[#1F8A83] text-white font-bold rounded-lg text-[10px]">
                    Actif par défaut
                  </span>
                </div>

                <label className="flex items-center justify-between p-4 bg-[#F5F7FA] rounded-xl border border-slate-200 cursor-pointer">
                  <div>
                    <span className="font-bold text-slate-900 block">
                      Activer la barre de messagerie instantanée (Live Chat)
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      Affiche la fenêtre de discussion rapide en bas à droite de l'écran.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={appSettings.showLiveChat !== false}
                    onChange={(e) => {
                      updateAppSettings({ showLiveChat: e.target.checked });
                      showSaveSuccess(
                        e.target.checked ? 'Messagerie instantanée activée.' : 'Messagerie instantanée masquée.'
                      );
                    }}
                    className="rounded text-[#2F6FED] w-4 h-4"
                  />
                </label>
              </div>
            </div>
          )}

          {/* ==================== 6. INTÉGRATIONS ==================== */}
          {activeCategory === 'INTEGRATIONS' && (
            <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Globe className="w-5 h-5 text-[#2F6FED]" />
                <div>
                  <h3 className="font-bold text-sm text-[#17345B]">
                    Services connectés (Cloud Firestore, Calendrier iCal / Google Agenda & Mobile)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    État des synchronisations multi-postes et des connecteurs externes.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 bg-[#F5F7FA] rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#17345B] text-sm">Firebase Cloud Firestore</span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white ${
                        isCloudConnected ? 'bg-[#1F8A83]' : 'bg-[#D58A18]'
                      }`}
                    >
                      {isCloudConnected ? 'Synchronisé en temps réel' : 'Mode hors-ligne / File active'}
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px]">
                    Synchronise automatiquement les 27 collections (emplois du temps, notes, présences, paiements) entre tous les postes connectés.
                  </p>
                  {onNavigateTab && (
                    <button
                      type="button"
                      onClick={() => onNavigateTab('BACKUP_SECURITY')}
                      className="text-[#2F6FED] font-bold hover:underline flex items-center gap-1 cursor-pointer pt-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Ouvrir le centre Cloud & Sauvegardes
                    </button>
                  )}
                </div>

                <div className="p-4 bg-[#F5F7FA] rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#17345B] text-sm">Flux iCal / Google Agenda (.ics)</span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#1F8A83] text-white">
                      Disponible
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px]">
                    Les enseignants et étudiants peuvent exporter ou s'abonner à leur emploi du temps depuis la vue « Planning & salles ».
                  </p>
                  {onNavigateTab && (
                    <button
                      type="button"
                      onClick={() => onNavigateTab('TIMETABLE')}
                      className="text-[#2F6FED] font-bold hover:underline flex items-center gap-1 cursor-pointer pt-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Aller aux emplois du temps
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ==================== 7. DONNÉES & SÉCURITÉ ==================== */}
          {activeCategory === 'DATA_SECURITY' && (
            <div className="space-y-5">
              {/* Storage Quotas */}
              <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-5 h-5 text-[#2F6FED]" />
                    <h3 className="font-bold text-sm text-[#17345B]">
                      Quotas documentaires, formats autorisés & archivage
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const count = archiveOldResources();
                      showSaveSuccess(`${count} document(s) des années clôturées ont été archivés.`);
                    }}
                    className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Archive className="w-3.5 h-3.5 text-[#D58A18]" />
                    Archiver les années clôturées ({archivedResources.length})
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3.5 bg-[#F5F7FA] rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">Espace utilisé</span>
                    <span className="text-lg font-black text-[#17345B]">{usedMb} Mo</span>
                    <span className="text-[10px] text-slate-500 block">
                      sur {storageConfig.globalQuotaMb} Mo ({usagePercent}%)
                    </span>
                  </div>
                  <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200">
                    <span className="text-[10px] font-bold uppercase text-[#1F8A83] block">Espace disponible</span>
                    <span className="text-lg font-black text-[#1F8A83]">{remainingMb} Mo</span>
                  </div>
                  <div className="p-3.5 bg-[#F5F7FA] rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">Taille max / fichier</span>
                    <span className="text-lg font-black text-[#17345B]">{storageConfig.maxFileSizeMb} Mo</span>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <span className="font-bold text-slate-700 block">Formats autorisés au dépôt :</span>
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
                              ? 'bg-[#17345B] text-white border-[#17345B]'
                              : 'bg-white text-slate-500 border-slate-300'
                          }`}
                        >
                          .{ext.toLowerCase()}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Backups, Audit & Diagnostic Shortcuts */}
              <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <ShieldCheck className="w-5 h-5 text-[#1F8A83]" />
                  <h3 className="font-bold text-sm text-[#17345B]">
                    Sauvegardes, journal d'audit & outils de diagnostic
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {onNavigateTab && (
                    <div className="p-4 bg-[#F5F7FA] border border-slate-200 rounded-2xl flex items-center justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-[#17345B] text-sm">Sauvegardes & Restauration</h4>
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          Export JSON complet, restauration et test de synchronisation Firestore.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onNavigateTab('BACKUP_SECURITY')}
                        className="px-3.5 py-2 bg-[#2F6FED] hover:bg-blue-600 text-white font-bold rounded-xl shrink-0 cursor-pointer"
                      >
                        Ouvrir
                      </button>
                    </div>
                  )}

                  {onNavigateTab && (
                    <div className="p-4 bg-[#F5F7FA] border border-slate-200 rounded-2xl flex items-center justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-[#17345B] text-sm">Journal d'audit immuable</h4>
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          Consulter et filtrer toutes les actions sensibles par utilisateur et date.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onNavigateTab('AUDIT')}
                        className="px-3.5 py-2 bg-[#17345B] hover:bg-[#102542] text-white font-bold rounded-xl shrink-0 cursor-pointer flex items-center gap-1.5"
                      >
                        <History className="w-3.5 h-3.5" />
                        Journal
                      </button>
                    </div>
                  )}

                  {isAdmin && onOpenReceptionTests && (
                    <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-[#17345B] text-sm">Matrice de Contrôle Qualité</h4>
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          Vérifier les critères d'acceptation et de sécurité de l'application.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={onOpenReceptionTests}
                        className="px-3.5 py-2 bg-[#1F8A83] hover:opacity-95 text-white font-bold rounded-xl shrink-0 cursor-pointer"
                      >
                        Vérifier
                      </button>
                    </div>
                  )}

                  {isAdmin && (
                    <div className="p-4 bg-[#F5F7FA] border border-slate-200 rounded-2xl flex items-center justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-[#17345B] text-sm">Aperçu Mobile / PWA</h4>
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          Tester l'affichage mobile étudiant et le pointage QR code.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={toggleAndroidView}
                        className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl shrink-0 cursor-pointer flex items-center gap-1.5"
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        {isAndroidView ? 'Quitter' : 'Aperçu'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
