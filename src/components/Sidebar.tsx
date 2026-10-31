import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Home,
  Calendar,
  Layers,
  GraduationCap,
  Award,
  QrCode,
  DollarSign,
  BookOpen,
  MessageSquare,
  Users,
  Settings,
  CalendarDays,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ChevronDown,
  Sparkles,
  Check,
  Plus,
  Database,
  Clock,
  X,
} from 'lucide-react';
import { canRoleAccessTab, getRoleLabel } from '../utils/rbacPermissions';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  onOpenReceptionTests?: () => void;
  onOpenUserProfile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile,
  onOpenUserProfile,
}) => {
  const {
    currentUser,
    logout,
    academicYears,
    selectedAcademicYear,
    appSettings,
    notifications,
    customRoles,
  } = useApp();

  const isStaffOrAdmin = ['ADMIN', 'ADMIN_STAFF', 'SCOLARITE', 'SCHEDULER', 'ACADEMIC_HEAD'].includes(currentUser?.role || '');

  const unreadCount = notifications.filter(
    (n) => (n.recipientId === currentUser?.id || n.recipientRole === currentUser?.role || !n.recipientId) && !n.isReadWeb
  ).length;

  // Filter menu items by role permissions AND appSettings.visibleMenuItems
  const isVisible = (tabId: string) => {
    if (!canRoleAccessTab(currentUser?.role, tabId, currentUser?.customPermissions, customRoles)) return false;
    if (!appSettings.visibleMenuItems || appSettings.visibleMenuItems.length === 0) return true;
    if (tabId === 'BACKUP_SECURITY' || tabId === 'PARENT_PORTAL' || tabId === 'VOLUMES') return true;
    return appSettings.visibleMenuItems.includes(tabId);
  };

  const handleSelectAndClose = (tab: string) => {
    onSelectTab(tab);
    if (onCloseMobile) onCloseMobile();
  };

  const currentYearObj = academicYears.find((y) => y.code === selectedAcademicYear) || academicYears[0];
  const isVerticalDesktop = appSettings.menuLayout === 'vertical';

  // On mobile (< lg), always show full labels (never collapsed to icons) when drawer is open
  const effectiveCollapsed = isCollapsed && !isMobileOpen;

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-950/65 backdrop-blur-xs z-40 lg:hidden animate-in fade-in duration-200"
          aria-hidden="true"
        />
      )}

      <aside
        className={`bg-slate-900 text-white flex flex-col border-r border-slate-800 transition-all duration-300 select-none flex-shrink-0
          fixed inset-y-0 left-0 z-50 h-dvh w-72 max-w-[85vw]
          ${isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
          ${
            isVerticalDesktop
              ? `lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen lg:z-30 ${effectiveCollapsed ? 'lg:w-20' : 'lg:w-72'}`
              : 'lg:hidden'
          }
        `}
      >
        {/* 1. Header of Sidebar */}
        <div className="p-3.5 border-b border-slate-800/80 flex items-center justify-between gap-2">
          {!effectiveCollapsed && (
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
              Menu Navigation
            </span>
          )}
          {/* Mobile Close button */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-auto lg:hidden cursor-pointer"
            title="Fermer le menu"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Desktop Collapse toggle button */}
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden lg:inline-flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-auto cursor-pointer"
            title={effectiveCollapsed ? 'Déplier le menu' : 'Replier le menu'}
          >
            {effectiveCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* 2. Centralized Academic Year Indicator */}
        {!effectiveCollapsed ? (
          <div className="px-3 pt-2.5 pb-2 border-b border-slate-800/60">
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/60 border border-slate-800 text-xs">
              <div className="flex items-center gap-2 truncate">
                <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                <div className="truncate">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block leading-none">
                    Session Active
                  </span>
                  <span className="font-bold text-white truncate block mt-0.5">
                    {currentYearObj?.code || selectedAcademicYear}
                  </span>
                </div>
              </div>
              {isStaffOrAdmin && (
                <button
                  type="button"
                  onClick={() => handleSelectAndClose('ACADEMIC_YEARS')}
                  className="px-2 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white text-[10px] font-bold transition-colors cursor-pointer"
                  title="Administration > Paramètres académiques"
                >
                  Configurer
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="p-2 border-b border-slate-800 flex justify-center">
            <button
              type="button"
              onClick={() => isStaffOrAdmin && handleSelectAndClose('ACADEMIC_YEARS')}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-blue-400"
              title={`Session active: ${selectedAcademicYear}`}
            >
              <CalendarDays className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* 3. Navigation Links List */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4 no-scrollbar text-xs">
          {/* SECTION: VUE GÉNÉRALE */}
          <div className="space-y-1">
            {!effectiveCollapsed && (
              <span className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Général
              </span>
            )}
            {isVisible('HOME') && (
              <button
                type="button"
                onClick={() => handleSelectAndClose('HOME')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold transition-all ${
                  currentTab === 'HOME'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/90'
                }`}
                title="Accueil & Tableau de bord"
              >
                <Home className="w-4 h-4 text-blue-400 flex-shrink-0" />
                {!effectiveCollapsed && <span>Accueil</span>}
              </button>
            )}
          </div>

          {/* SECTION: PÉDAGOGIE & COURS */}
          <div className="space-y-1">
            {!effectiveCollapsed && (
              <span className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Pédagogie & Cours
              </span>
            )}

            {isVisible('TIMETABLE') && (
              <button
                type="button"
                onClick={() => handleSelectAndClose('TIMETABLE')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold transition-all ${
                  currentTab === 'TIMETABLE'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/90'
                }`}
                title="Emploi du Temps hebdomadaire"
              >
                <Calendar className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                {!effectiveCollapsed && <span>Emploi du Temps</span>}
              </button>
            )}

            {isVisible('ROOMS') && (
              <button
                type="button"
                onClick={() => handleSelectAndClose('ROOMS')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold transition-all ${
                  currentTab === 'ROOMS'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/90'
                }`}
                title="Salles de cours & Équipements"
              >
                <Layers className="w-4 h-4 text-amber-400 flex-shrink-0" />
                {!effectiveCollapsed && <span>Salles & Équipements</span>}
              </button>
            )}

            {isVisible('LMD_MAQUETTES') && (
              <button
                type="button"
                onClick={() => handleSelectAndClose('LMD_MAQUETTES')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold transition-all ${
                  currentTab === 'LMD_MAQUETTES'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/90'
                }`}
                title="Maquettes LMD, UEs et ECs"
              >
                <GraduationCap className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                {!effectiveCollapsed && <span>Maquettes LMD</span>}
              </button>
            )}

            {isVisible('VOLUMES') && (
              <button
                type="button"
                onClick={() => handleSelectAndClose('VOLUMES')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold transition-all ${
                  currentTab === 'VOLUMES'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/90'
                }`}
                title="Suivi des Volumes Horaires & Réalisations"
              >
                <Clock className="w-4 h-4 text-purple-400 flex-shrink-0" />
                {!effectiveCollapsed && <span>Suivi Volumes Horaires</span>}
              </button>
            )}

            {isVisible('GRADES') && (
              <button
                type="button"
                onClick={() => handleSelectAndClose('GRADES')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold transition-all ${
                  currentTab === 'GRADES'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/90'
                }`}
                title="Notes, Évaluations, Relevés et Délibérations"
              >
                <Award className="w-4 h-4 text-rose-400 flex-shrink-0" />
                {!effectiveCollapsed && <span>Notes & Évaluations</span>}
              </button>
            )}

            {isVisible('HOMEWORK_RESOURCES') && (
              <button
                type="button"
                onClick={() => handleSelectAndClose('HOMEWORK_RESOURCES')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold transition-all ${
                  currentTab === 'HOMEWORK_RESOURCES'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/90'
                }`}
                title="Devoirs, exercices & supports de cours"
              >
                <BookOpen className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                {!effectiveCollapsed && <span>Devoirs & Cours</span>}
              </button>
            )}
            {isVisible('QR_ATTENDANCE') && (
              <button
                type="button"
                onClick={() => handleSelectAndClose('QR_ATTENDANCE')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold transition-all ${
                  currentTab === 'QR_ATTENDANCE'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/90'
                }`}
                title="Pointage de présence par QR Code dynamique"
              >
                <QrCode className="w-4 h-4 text-amber-400 flex-shrink-0" />
                {!effectiveCollapsed && <span>Présence & Pointage QR</span>}
              </button>
            )}
          </div>

          {/* SECTION: PÔLE FINANCES & CAISSE (Séparé de Communication) */}
          {isVisible('FINANCIAL') && (
            <div className="space-y-1">
              {!effectiveCollapsed && (
                <span className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400/90 block">
                  Pôle Finances & Caisse
                </span>
              )}

              <button
                type="button"
                onClick={() => handleSelectAndClose('FINANCIAL')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold transition-all ${
                  currentTab === 'FINANCIAL'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/90'
                }`}
                title="Écolages, caisse en Ariary et reçus"
              >
                <DollarSign className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                {!effectiveCollapsed && <span>Finances & Caisse (Ar)</span>}
              </button>
            </div>
          )}

          {/* SECTION: PÔLE COMMUNICATION (Séparé de Finances & Caisse) */}
          {isVisible('COMMUNICATION') && (
            <div className="space-y-1">
              {!effectiveCollapsed && (
                <span className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-purple-400/90 block">
                  Pôle Communication
                </span>
              )}

              <button
                type="button"
                onClick={() => handleSelectAndClose('COMMUNICATION')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold transition-all ${
                  currentTab === 'COMMUNICATION'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/90'
                }`}
                title="Mur de la promotion et messagerie"
              >
                <MessageSquare className="w-4 h-4 text-purple-400 flex-shrink-0" />
                {!effectiveCollapsed && <span>Mur & Messages</span>}
              </button>
            </div>
          )}

          {/* SECTION: ESPACE PARENTS / TUTEURS */}
          {isVisible('PARENT_PORTAL') && (
            <div className="space-y-1">
              {!effectiveCollapsed && (
                <span className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-indigo-400 block">
                  Espace Famille
                </span>
              )}
              <button
                type="button"
                onClick={() => handleSelectAndClose('PARENT_PORTAL')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold transition-all ${
                  currentTab === 'PARENT_PORTAL'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/90'
                }`}
                title="Espace Parents & Tuteurs (Suivi académique, assiduité, finances)"
              >
                <Users className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                {!effectiveCollapsed && <span>Espace Parents / Tuteurs</span>}
              </button>
            </div>
          )}

          {/* SECTION: ANNUAIRE & SUIVI (ÉTUDIANTS & ENSEIGNANTS) */}
          {(isVisible('STUDENTS') || isVisible('TEACHERS')) && (
            <div className="space-y-1">
              {!effectiveCollapsed && (
                <span className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Annuaire & Suivi
                </span>
              )}

              {isVisible('STUDENTS') && (
                <button
                  type="button"
                  onClick={() => handleSelectAndClose('STUDENTS')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold transition-all ${
                    currentTab === 'STUDENTS'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/90'
                  }`}
                  title="Répertoire des Étudiants (Notes, Impayés, Profil)"
                >
                  <GraduationCap className="w-4 h-4 text-sky-400 flex-shrink-0" />
                  {!effectiveCollapsed && <span>Répertoire Étudiants</span>}
                </button>
              )}

              {isVisible('TEACHERS') && (
                <button
                  type="button"
                  onClick={() => handleSelectAndClose('TEACHERS')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold transition-all ${
                    currentTab === 'TEACHERS'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/90'
                  }`}
                  title={
                    currentUser.role === 'TEACHER'
                      ? 'Ma Fiche Enseignant & Disponibilités'
                      : 'Corps Enseignant & Charges Horaires'
                  }
                >
                  <Users className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                  {!effectiveCollapsed && (
                    <span>
                      {currentUser.role === 'TEACHER' ? 'Ma Fiche Enseignant' : 'Corps Enseignant'}
                    </span>
                  )}
                </button>
              )}
            </div>
          )}

          {/* SECTION: CONFIGURATION & ADMINISTRATION */}
          <div className="space-y-1">
            {!effectiveCollapsed && (
              <span className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Administration & Paramètres
              </span>
            )}

            {isVisible('USERS_MANAGEMENT') && (
              <button
                type="button"
                onClick={() => handleSelectAndClose('USERS_MANAGEMENT')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold transition-all cursor-pointer ${
                  currentTab === 'USERS_MANAGEMENT'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-indigo-300 hover:text-white hover:bg-slate-800/90'
                }`}
                title="Administration > Gestion des Utilisateurs, Fiches & Réinitialisation de Mot de Passe"
              >
                <Users className="w-4 h-4 text-amber-400 flex-shrink-0" />
                {!effectiveCollapsed && <span>Utilisateurs & Mots de passe</span>}
              </button>
            )}

            {isVisible('DATA_MANAGEMENT') && (
              <button
                type="button"
                onClick={() => handleSelectAndClose('DATA_MANAGEMENT')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold transition-all cursor-pointer ${
                  currentTab === 'DATA_MANAGEMENT'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-indigo-300 hover:text-white hover:bg-slate-800/90'
                }`}
                title="Administration > Création des Données, Cours, Groupes & Salles"
              >
                <Layers className="w-4 h-4 text-teal-400 flex-shrink-0" />
                {!effectiveCollapsed && <span>Création Données & Salles</span>}
              </button>
            )}

            {isVisible('ACADEMIC_YEARS') && (
              <button
                type="button"
                onClick={() => handleSelectAndClose('ACADEMIC_YEARS')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold transition-all cursor-pointer ${
                  currentTab === 'ACADEMIC_YEARS'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-indigo-300 hover:text-white hover:bg-slate-800/90'
                }`}
                title="Administration > Paramètres académiques (Années universitaires)"
              >
                <CalendarDays className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                {!effectiveCollapsed && (
                  <div className="flex items-center justify-between w-full">
                    <span>Paramètres Académiques</span>
                    <span className="text-[10px] bg-indigo-900/60 text-indigo-300 px-1.5 py-0.2 rounded font-mono">
                      {academicYears.length}
                    </span>
                  </div>
                )}
              </button>
            )}

            {isVisible('BACKUP_SECURITY') && (
              <button
                type="button"
                onClick={() => handleSelectAndClose('BACKUP_SECURITY')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold transition-all cursor-pointer ${
                  currentTab === 'BACKUP_SECURITY'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-indigo-300 hover:text-white hover:bg-slate-800/90'
                }`}
                title="Sauvegardes JSON, Restauration, Cloud Firestore & Rôles RBAC"
              >
                <Database className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                {!effectiveCollapsed && <span>Sauvegardes & Cloud SIS</span>}
              </button>
            )}

            {isVisible('SETTINGS') && (
              <button
                type="button"
                onClick={() => handleSelectAndClose('SETTINGS')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold transition-all cursor-pointer ${
                  currentTab === 'SETTINGS'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-indigo-300 hover:text-white hover:bg-slate-800/90'
                }`}
                title="Paramètres de l'Application (Menu, Affichage, Horaires, Rôles)"
              >
                <Settings className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                {!effectiveCollapsed && <span>Paramètres Système</span>}
              </button>
            )}
          </div>
        </nav>

        {/* 4. Footer User Profile Card (Clickable to open Fiche Utilisateur) */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/50">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                if (onCloseMobile) onCloseMobile();
                if (onOpenUserProfile) onOpenUserProfile();
              }}
              className="flex items-center gap-2.5 min-w-0 flex-1 text-left p-1.5 rounded-xl hover:bg-slate-800/80 transition-colors cursor-pointer group"
              title="Cliquer pour ouvrir et modifier votre fiche utilisateur"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-700 group-hover:bg-blue-600 text-white flex items-center justify-center font-bold text-xs border border-blue-500 flex-shrink-0">
                {currentUser.name.substring(0, 2).toUpperCase()}
              </div>
              {!effectiveCollapsed && (
                <div className="min-w-0 truncate">
                  <span className="font-bold text-xs text-white group-hover:text-blue-300 block truncate leading-tight group-hover:underline">
                    {currentUser.name}
                  </span>
                  <span className="text-[10px] text-blue-300 font-medium block truncate">
                    {currentUser.role === 'STUDENT'
                      ? `Étudiant (${currentUser.matricule})`
                      : getRoleLabel(currentUser.role)}
                  </span>
                </div>
              )}
            </button>

            <button
              type="button"
              onClick={logout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/40 transition-colors flex-shrink-0"
              title="Se déconnecter"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
