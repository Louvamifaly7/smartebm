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
} from 'lucide-react';

export const AppSettingsView: React.FC = () => {
  const { appSettings, updateAppSettings } = useApp();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const availableModules = [
    { id: 'HOME', label: 'Accueil & Tableau de Bord', icon: Layout, desc: 'Vue de synthèse, raccourcis et statistiques' },
    { id: 'TIMETABLE', label: 'Emploi du Temps', icon: Calendar, desc: 'Planning hebdomadaire sur 7 jours' },
    { id: 'ROOMS', label: 'Salles & Équipements', icon: Layers, desc: 'Occupation des salles et personnalisation du matériel' },
    { id: 'LMD_MAQUETTES', label: 'Maquettes LMD', icon: GraduationCap, desc: 'Gestion des UEs, ECs et crédits ECTS' },
    { id: 'GRADES', label: 'Notes & Évaluations', icon: Award, desc: 'Formule 40/60 ou évaluation directe 100%' },
    { id: 'QR_ATTENDANCE', label: 'Présence & Pointage QR', icon: QrCode, desc: 'QR code éphémère et compte à rebours' },
    { id: 'FINANCIAL', label: 'Finances & Caisse (Ar)', icon: DollarSign, desc: 'Encaissements en Ariary et clôture de caisse' },
    { id: 'HOMEWORK_RESOURCES', label: 'Devoirs & Cours', icon: BookOpen, desc: 'Remise de travaux et supports pédagogiques' },
    { id: 'COMMUNICATION', label: 'Mur & Messages', icon: MessageSquare, desc: 'Fil d’actualités et messagerie interne' },
    { id: 'STUDENTS', label: 'Répertoire Étudiants', icon: GraduationCap, desc: 'Fiches détaillées, tri par mention/groupe/année, notes et impayés' },
    { id: 'TEACHERS', label: 'Corps Enseignant', icon: Users, desc: 'Fiches professeurs, charges horaires et matières' },
    { id: 'ACADEMIC_YEARS', label: 'Années Académiques', icon: Calendar, desc: 'Configuration et basculement d’année courante' },
    { id: 'USERS_MANAGEMENT', label: 'Administration & Outils', icon: Users, desc: 'Comptes, données, volumes horaires et audit' },
    { id: 'SETTINGS', label: 'Paramètres Système', icon: Settings, desc: 'Configuration de l’interface et préférences' },
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
    });
    showSaveSuccess('Paramètres par défaut rétablis avec succès !');
  };

  const showSaveSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
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
                Paramètres de l'Application & Ergonomie
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Personnalisez la disposition de navigation, les modules affichés et l'interface EBM Institute.
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

      {/* 2. Visual Identity & Official Logo */}
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

      {/* 3. Navigation Layout Choice (Vertical Sidebar vs Horizontal Topbar) */}
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
              Menu latéral permanent à gauche avec catégories repliables, sélecteur d'année académique intégré et accès rapide aux modules.
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

      {/* 4. Menu Items Visibility Customization */}
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

      {/* 5. Live Chat & Ergonomics Preferences */}
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
