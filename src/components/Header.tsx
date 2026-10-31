import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  Bell,
  Smartphone,
  Monitor,
  ShieldCheck,
  History,
  Database,
  Home,
  LogOut,
  Layers,
  Award,
  QrCode,
  Banknote,
  MessageSquare,
  FileSpreadsheet,
  ChevronDown,
  Search,
  X,
  Shield,
  BookOpen,
  Settings,
  CalendarDays,
  Menu,
  Check,
  GraduationCap,
  UserCheck,
} from 'lucide-react';
import { canRoleAccessTab, getRoleLabel } from '../utils/rbacPermissions';

interface HeaderProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenNotifications: () => void;
  onOpenReceptionTests: () => void;
  onToggleSidebar?: () => void;
  onOpenMobileMenu?: () => void;
  onOpenUserProfile?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  onOpenNotifications,
  onOpenReceptionTests,
  onToggleSidebar,
  onOpenMobileMenu,
  onOpenUserProfile,
}) => {
  const {
    currentUser,
    users,
    setCurrentUser,
    isAndroidView,
    toggleAndroidView,
    notifications,
    logout,
    academicYears,
    selectedAcademicYear,
    setSelectedAcademicYear,
    appSettings,
    customRoles,
  } = useApp();

  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
  const [isYearPickerOpen, setIsYearPickerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const unreadCount = notifications.filter(
    (n) => (n.recipientId === currentUser?.id || n.recipientRole === currentUser?.role || !n.recipientId) && !n.isReadWeb
  ).length;

  const quickProfiles = [
    { label: 'Admin', user: users.find((u) => u.role === 'ADMIN') },
    { label: 'Scolarité', user: users.find((u) => u.role === 'SCOLARITE') || users.find((u) => u.role === 'SCHEDULER') },
    { label: 'Finances', user: users.find((u) => u.role === 'FINANCE') },
    { label: 'Pédagogie', user: users.find((u) => u.role === 'ACADEMIC_HEAD') },
    { label: 'Enseignant', user: users.find((u) => u.role === 'TEACHER') },
    { label: 'Étudiant', user: users.find((u) => u.role === 'STUDENT' && !u.mustChangePassword) },
    { label: 'Parent', user: users.find((u) => u.role === 'PARENT') },
  ];

  // Quick module search items
  const allSearchableModules = [
    { id: 'HOME', label: 'Accueil / Tableau de bord', icon: Home, category: 'Principal' },
    { id: 'TIMETABLE', label: 'Emploi du Temps', icon: Calendar, category: 'Planning' },
    { id: 'ROOMS', label: 'Salles & Équipements', icon: MapPin, category: 'Planning' },
    { id: 'LMD_MAQUETTES', label: 'Maquettes LMD, Parcours & Inscriptions', icon: Layers, category: 'Pédagogie' },
    { id: 'GRADES', label: 'Notes, Délibérations & PV Jury', icon: Award, category: 'Pédagogie' },
    { id: 'QR_ATTENDANCE', label: 'Pointage QR Code & OTP', icon: QrCode, category: 'Présences' },
    { id: 'FINANCIAL', label: 'Finances & Caisse en Ariary', icon: Banknote, category: 'Finances' },
    { id: 'HOMEWORK_RESOURCES', label: 'Devoirs & Supports de Cours', icon: BookOpen, category: 'Pédagogie' },
    { id: 'COMMUNICATION', label: 'Messagerie & Mur de Promotion', icon: MessageSquare, category: 'Campus' },
    { id: 'PARENT_PORTAL', label: 'Espace Parents & Tuteurs', icon: Users, category: 'Famille' },
    { id: 'VOLUMES', label: 'Suivi des Volumes Horaires', icon: Clock, category: 'Planning' },
    { id: 'STUDENTS', label: 'Répertoire Étudiants (Notes & Impayés)', icon: GraduationCap, category: 'Annuaire' },
    { id: 'TEACHERS', label: 'Corps Enseignant & Charges', icon: UserCheck, category: 'Annuaire' },
    { id: 'ACADEMIC_YEARS', label: 'Paramètres Académiques (Années)', icon: CalendarDays, category: 'Administration' },
    { id: 'USERS_MANAGEMENT', label: 'Gestion des Utilisateurs & Rôles', icon: Users, category: 'Administration' },
    { id: 'DATA_MANAGEMENT', label: 'Création des Données & Salles', icon: Database, category: 'Administration' },
    { id: 'BACKUP_SECURITY', label: 'Sauvegardes, Restauration & Cloud Firestore', icon: ShieldCheck, category: 'Administration' },
    { id: 'AUDIT', label: 'Journal d’Audit Immuable', icon: History, category: 'Administration' },
    { id: 'EXPORT_STUDENTS', label: 'Export Sélectif Étudiants', icon: FileSpreadsheet, category: 'Administration' },
  ].filter((m) => canRoleAccessTab(currentUser?.role, m.id, currentUser?.customPermissions, customRoles));

  const filteredModules = searchQuery.trim()
    ? allSearchableModules.filter((m) =>
        m.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const handleNavigate = (tabId: string) => {
    onSelectTab(tabId);
    setIsAdminMenuOpen(false);
    setSearchQuery('');
    setIsSearchFocused(false);
  };

  const isStaffOrAdmin = ['ADMIN', 'ADMIN_STAFF', 'SCOLARITE', 'SCHEDULER', 'FINANCE', 'ACADEMIC_HEAD'].includes(currentUser?.role || '');

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-lg">
      {/* 1. Top Bar: Branding, Quick Profile Switcher, Search, Notifications & User Profile */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 flex flex-col gap-2 border-b border-slate-800/80">
        <div className="flex items-center justify-between gap-2">
          {/* Left: Hamburger Menu (always on mobile < lg, and on desktop when vertical) + Official Logo & Academic Year */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Mobile Drawer Trigger (< lg) */}
            {onOpenMobileMenu && (
              <button
                type="button"
                onClick={onOpenMobileMenu}
                className="p-2 rounded-xl bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700 border border-slate-700 transition-colors lg:hidden cursor-pointer flex-shrink-0"
                title="Ouvrir le menu de navigation"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            {/* Desktop Sidebar Collapse Toggle (lg+) */}
            {appSettings.menuLayout === 'vertical' && onToggleSidebar && (
              <button
                type="button"
                onClick={onToggleSidebar}
                className="hidden lg:inline-flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Menu latéral"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            <div
              onClick={() => handleNavigate('HOME')}
              className="flex items-center gap-2 cursor-pointer hover:opacity-95 transition-opacity flex-shrink-0"
              title="Aller à l'accueil"
            >
              <div className="bg-white px-2 py-1 rounded-xl shadow-xs flex-shrink-0 flex items-center justify-center">
                <img
                  src="/assets/aistudio/logo_540e8d94.png"
                  alt="Logo Officiel"
                  className="h-7 sm:h-8 w-auto object-contain"
                />
              </div>
            </div>

            {/* Persistent Academic Year Switcher */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsYearPickerOpen(!isYearPickerOpen)}
                className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-[11px] sm:text-xs font-bold text-white border border-slate-700 transition-all cursor-pointer"
                title="Changer d'année académique active"
              >
                <CalendarDays className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="truncate max-w-[72px] sm:max-w-none">{selectedAcademicYear}</span>
                <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
              </button>

              {isYearPickerOpen && (
                <div className="absolute left-0 top-full mt-1.5 w-60 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                  <div className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1">
                    Année Académique Active
                  </div>
                  {academicYears.map((ay) => (
                    <button
                      key={ay.id}
                      type="button"
                      onClick={() => {
                        setSelectedAcademicYear(ay.code);
                        setIsYearPickerOpen(false);
                      }}
                      className={`w-full text-left p-2 rounded-lg flex items-center justify-between text-xs transition-colors ${
                        ay.code === selectedAcademicYear
                          ? 'bg-blue-600 text-white font-bold'
                          : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      <span>{ay.code} {ay.isCurrent ? '(Active)' : ''}</span>
                      {ay.code === selectedAcademicYear && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                  <div className="mt-1 pt-1 border-t border-slate-700">
                    <button
                      type="button"
                      onClick={() => {
                        setIsYearPickerOpen(false);
                        handleNavigate('ACADEMIC_YEARS');
                      }}
                      className="w-full text-left p-1.5 text-indigo-400 hover:text-indigo-300 font-bold text-[11px]"
                    >
                      + Gérer les Années Académiques
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Center (Desktop xl+): Quick Role Switcher */}
          <div className="hidden xl:flex items-center gap-1 bg-slate-800/90 p-1 rounded-xl text-xs border border-slate-700">
            <span className="text-[10px] uppercase font-bold text-amber-400 px-2 flex items-center gap-1">
              <Shield className="w-3 h-3" />
              Tester un rôle :
            </span>
            {quickProfiles.map((p, i) => {
              if (!p.user) return null;
              const isSelected = p.user.id === currentUser?.id;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCurrentUser(p.user!)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs ring-1 ring-blue-400'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700'
                  }`}
                  title={`Basculer immédiatement sur le compte ${p.user.name} (${p.label})`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Right Tools: Instant Search, Notifications, Settings, User Profile */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {/* Quick Module Search Input (Desktop & Tablet sm+) */}
            <div className="relative hidden sm:block">
              <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1 text-xs focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
                <Search className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  className="bg-transparent text-white placeholder-slate-400 text-xs outline-none w-28 md:w-44"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-slate-400 hover:text-white ml-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Instant Search Dropdown */}
              {isSearchFocused && searchQuery.trim() && (
                <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-50 text-xs animate-in fade-in duration-150">
                  <div className="p-2 border-b border-slate-800 bg-slate-950 flex justify-between items-center text-[10px] text-slate-400">
                    <span className="font-bold uppercase tracking-wider">Modules trouvés ({filteredModules.length})</span>
                    <button
                      type="button"
                      onClick={() => setIsSearchFocused(false)}
                      className="hover:text-white cursor-pointer"
                    >
                      Fermer
                    </button>
                  </div>
                  <div className="max-h-60 overflow-y-auto no-scrollbar p-1.5 space-y-1">
                    {filteredModules.length === 0 ? (
                      <div className="p-3 text-center text-slate-400 text-xs italic">
                        Aucun module ne correspond à "{searchQuery}".
                      </div>
                    ) : (
                      filteredModules.map((m) => {
                        const Icon = m.icon;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => handleNavigate(m.id)}
                            className="w-full text-left p-2 rounded-xl hover:bg-blue-600 hover:text-white transition-colors flex items-center justify-between text-slate-200 cursor-pointer group"
                          >
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4 text-blue-400 group-hover:text-white" />
                              <span className="font-bold text-xs">{m.label}</span>
                            </div>
                            <span className="text-[9px] bg-slate-800 group-hover:bg-blue-700 text-slate-400 group-hover:text-white px-1.5 py-0.5 rounded">
                              {m.category}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Notifications Bell */}
            <button
              type="button"
              onClick={onOpenNotifications}
              className="relative p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
              title="Centre de notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Settings button */}
            <button
              type="button"
              onClick={() => handleNavigate('SETTINGS')}
              className={`p-2 rounded-xl transition-all border cursor-pointer ${
                currentTab === 'SETTINGS'
                  ? 'bg-blue-600 text-white border-blue-400'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
              title="Paramètres de l'application"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* User Profile (Clickable to open Fiche Utilisateur) & Logout */}
            {currentUser && (
              <div className="flex items-center gap-1.5 pl-1.5 sm:pl-2 border-l border-slate-800">
                <button
                  type="button"
                  onClick={onOpenUserProfile}
                  className="flex items-center gap-2 px-1.5 py-1 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer text-left group"
                  title="Cliquer pour ouvrir et modifier votre fiche utilisateur"
                >
                  <div className="w-8 h-8 rounded-xl bg-blue-700 group-hover:bg-blue-600 text-white flex items-center justify-center font-bold text-xs border border-blue-500 shrink-0">
                    {currentUser.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="hidden md:block text-left">
                    <span className="text-xs font-bold text-white group-hover:text-blue-300 block leading-tight underline-offset-2 group-hover:underline">
                      {currentUser.name}
                    </span>
                    <span className="text-[10px] text-blue-300 font-medium">
                      {currentUser.role === 'STUDENT'
                        ? `Étudiant (${currentUser.matricule})`
                        : getRoleLabel(currentUser.role)}
                    </span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={logout}
                  className="p-2 rounded-xl bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800/60 transition-colors cursor-pointer"
                  title="Se déconnecter de la session"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Single-line Horizontal Scrollable Role Switcher for Mobile & Tablet (< xl) */}
        <div className="flex xl:hidden items-center gap-1.5 overflow-x-auto no-scrollbar py-1 px-2 bg-slate-800/80 rounded-xl border border-slate-700/80 whitespace-nowrap">
          <span className="text-[10px] uppercase font-bold text-amber-400 flex items-center gap-1 shrink-0 pr-1">
            <Shield className="w-3 h-3" />
            Rôle :
          </span>
          {quickProfiles.map((p, i) => {
            if (!p.user) return null;
            const isSelected = p.user.id === currentUser?.id;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setCurrentUser(p.user!)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer shrink-0 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs ring-1 ring-blue-400'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Main Navigation Bar: Only visible when menuLayout is 'horizontal' */}
      {!isAndroidView && appSettings.menuLayout === 'horizontal' && (
        <>
          <nav className="max-w-7xl mx-auto px-3 sm:px-6 py-2 flex items-center justify-between gap-1 overflow-x-auto no-scrollbar text-xs font-bold relative">
            <div className="flex items-center gap-1.5 flex-nowrap lg:flex-wrap">
              
              {/* 1. Accueil */}
              <button
                type="button"
                onClick={() => handleNavigate('HOME')}
                className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                  currentTab === 'HOME'
                    ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-400'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Home className="w-4 h-4" />
                <span>Accueil</span>
              </button>

              {/* 2. Emploi du Temps */}
              {canRoleAccessTab(currentUser?.role, 'TIMETABLE') && (
                <button
                  type="button"
                  onClick={() => handleNavigate('TIMETABLE')}
                  className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                    currentTab === 'TIMETABLE'
                      ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-400'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Calendar className="w-4 h-4 text-blue-400" />
                  <span>{currentUser?.role === 'STUDENT' ? 'Mon Emploi du Temps' : 'Emploi du Temps'}</span>
                </button>
              )}

              {/* 3. Salles & Équipements */}
              {canRoleAccessTab(currentUser?.role, 'ROOMS') && (
                <button
                  type="button"
                  onClick={() => handleNavigate('ROOMS')}
                  className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                    currentTab === 'ROOMS'
                      ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400'
                      : 'text-emerald-300 hover:text-white hover:bg-slate-800'
                  }`}
                  title="Consulter les salles et personnaliser leurs équipements installés"
                >
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  <span>Salles & Équipements</span>
                </button>
              )}

              {/* 4. Maquettes LMD */}
              {canRoleAccessTab(currentUser?.role, 'LMD_MAQUETTES', currentUser?.customPermissions, customRoles) && (
                <button
                  type="button"
                  onClick={() => handleNavigate('LMD_MAQUETTES')}
                  className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                    currentTab === 'LMD_MAQUETTES'
                      ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-400'
                      : 'text-indigo-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Layers className="w-4 h-4 text-indigo-400" />
                  <span>Maquettes LMD</span>
                </button>
              )}

              {/* 4b. Suivi des Volumes Horaires & Réalisations */}
              {canRoleAccessTab(currentUser?.role, 'VOLUMES', currentUser?.customPermissions, customRoles) && (
                <button
                  type="button"
                  onClick={() => handleNavigate('VOLUMES')}
                  className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                    currentTab === 'VOLUMES'
                      ? 'bg-purple-600 text-white shadow-sm ring-1 ring-purple-400'
                      : 'text-purple-300 hover:text-white hover:bg-slate-800'
                  }`}
                  title="Suivi des Volumes Horaires & Validation des Séances"
                >
                  <Clock className="w-4 h-4 text-purple-400" />
                  <span>Suivi Volumes Horaires</span>
                </button>
              )}

              {/* 5. Notes & Évaluations */}
              {canRoleAccessTab(currentUser?.role, 'GRADES') && (
                <button
                  type="button"
                  onClick={() => handleNavigate('GRADES')}
                  className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                    currentTab === 'GRADES'
                      ? 'bg-amber-600 text-white shadow-sm ring-1 ring-amber-400'
                      : 'text-amber-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Award className="w-4 h-4 text-amber-400" />
                  <span>Notes & Délibérations</span>
                </button>
              )}

              {/* 6. Pointage QR */}
              {canRoleAccessTab(currentUser?.role, 'QR_ATTENDANCE') && (
                <button
                  type="button"
                  onClick={() => handleNavigate('QR_ATTENDANCE')}
                  className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                    currentTab === 'QR_ATTENDANCE'
                      ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400'
                      : 'text-emerald-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <QrCode className="w-4 h-4 text-emerald-400" />
                  <span>Pointage QR</span>
                </button>
              )}

              {/* 7. Finances en Ariary */}
              {canRoleAccessTab(currentUser?.role, 'FINANCIAL') && (
                <button
                  type="button"
                  onClick={() => handleNavigate('FINANCIAL')}
                  className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                    currentTab === 'FINANCIAL'
                      ? 'bg-emerald-700 text-white shadow-sm ring-1 ring-emerald-500'
                      : 'text-emerald-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Banknote className="w-4 h-4 text-emerald-400" />
                  <span>Finances (Ar)</span>
                </button>
              )}

              {/* 8. Devoirs & Cours */}
              {canRoleAccessTab(currentUser?.role, 'HOMEWORK_RESOURCES') && (
                <button
                  type="button"
                  onClick={() => handleNavigate('HOMEWORK_RESOURCES')}
                  className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                    currentTab === 'HOMEWORK_RESOURCES'
                      ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-400'
                      : 'text-blue-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <BookOpen className="w-4 h-4 text-blue-400" />
                  <span>Devoirs & Cours</span>
                </button>
              )}

              {/* 9. Mur & Messagerie */}
              {canRoleAccessTab(currentUser?.role, 'COMMUNICATION', currentUser?.customPermissions, customRoles) && (
                <button
                  type="button"
                  onClick={() => handleNavigate('COMMUNICATION')}
                  className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                    currentTab === 'COMMUNICATION'
                      ? 'bg-purple-600 text-white shadow-sm ring-1 ring-purple-400'
                      : 'text-purple-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <MessageSquare className="w-4 h-4 text-purple-400" />
                  <span>Mur & Messages</span>
                </button>
              )}

              {/* 9b. Espace Parents & Tuteurs */}
              {canRoleAccessTab(currentUser?.role, 'PARENT_PORTAL', currentUser?.customPermissions, customRoles) && (
                <button
                  type="button"
                  onClick={() => handleNavigate('PARENT_PORTAL')}
                  className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                    currentTab === 'PARENT_PORTAL'
                      ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-400'
                      : 'text-indigo-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Users className="w-4 h-4 text-indigo-400" />
                  <span>Espace Parents</span>
                </button>
              )}

              {/* 10. Administration & Outils */}
              {isStaffOrAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    if (currentUser?.role === 'FINANCE') {
                      handleNavigate('STUDENTS');
                    } else if (currentUser?.role === 'ADMIN') {
                      handleNavigate('USERS_MANAGEMENT');
                    } else {
                      handleNavigate('STUDENTS');
                    }
                  }}
                  className={`px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer border ${
                    ['USERS_MANAGEMENT', 'DATA_MANAGEMENT', 'VOLUMES', 'AUDIT', 'EXPORT_STUDENTS', 'TEACHERS', 'STUDENTS', 'BACKUP_SECURITY', 'ACADEMIC_YEARS'].includes(currentTab)
                      ? 'bg-indigo-600 text-white border-indigo-400 shadow-md ring-1 ring-indigo-300'
                      : 'text-indigo-300 hover:text-white hover:bg-slate-800 border-indigo-900/60'
                  }`}
                  title="Accéder aux outils d'administration, annuaire et sauvegardes Cloud SIS"
                >
                  <Shield className="w-4 h-4 text-indigo-300" />
                  <span>Administration & Outils</span>
                </button>
              )}
            </div>
          </nav>
        </>
      )}

      {/* Sub-bar for Administration tools whenever an admin tab is active (both horizontal & vertical layout) */}
      {!isAndroidView &&
        isStaffOrAdmin &&
        ['USERS_MANAGEMENT', 'DATA_MANAGEMENT', 'VOLUMES', 'AUDIT', 'EXPORT_STUDENTS', 'TEACHERS', 'STUDENTS', 'BACKUP_SECURITY', 'ACADEMIC_YEARS'].includes(currentTab) && (
          <div className="bg-slate-950 border-t border-b border-indigo-900/40 px-3 sm:px-6 py-1.5 flex items-center gap-2 overflow-x-auto no-scrollbar text-xs whitespace-nowrap">
            <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1 mr-1 shrink-0">
              <Shield className="w-3.5 h-3.5" /> Administration :
            </span>

            {canRoleAccessTab(currentUser?.role, 'USERS_MANAGEMENT') && (
              <button
                type="button"
                onClick={() => handleNavigate('USERS_MANAGEMENT')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                  currentTab === 'USERS_MANAGEMENT' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-amber-300" />
                <span>Utilisateurs, Fiches & Mots de passe</span>
              </button>
            )}

            {canRoleAccessTab(currentUser?.role, 'ACADEMIC_YEARS', currentUser?.customPermissions, customRoles) && (
              <button
                type="button"
                onClick={() => handleNavigate('ACADEMIC_YEARS')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                  currentTab === 'ACADEMIC_YEARS' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5 text-amber-300" />
                <span>Paramètres Académiques</span>
              </button>
            )}

            {canRoleAccessTab(currentUser?.role, 'STUDENTS') && (
              <button
                type="button"
                onClick={() => handleNavigate('STUDENTS')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                  currentTab === 'STUDENTS' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5 text-cyan-300" />
                <span>Répertoire Étudiants</span>
              </button>
            )}

            {canRoleAccessTab(currentUser?.role, 'TEACHERS') && (
              <button
                type="button"
                onClick={() => handleNavigate('TEACHERS')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                  currentTab === 'TEACHERS' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5 text-indigo-300" />
                <span>Corps Enseignant</span>
              </button>
            )}

            {canRoleAccessTab(currentUser?.role, 'DATA_MANAGEMENT') && (
              <button
                type="button"
                onClick={() => handleNavigate('DATA_MANAGEMENT')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                  currentTab === 'DATA_MANAGEMENT' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Database className="w-3.5 h-3.5 text-teal-300" />
                <span>Création des Données & Salles</span>
              </button>
            )}

            {canRoleAccessTab(currentUser?.role, 'VOLUMES') && (
              <button
                type="button"
                onClick={() => handleNavigate('VOLUMES')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                  currentTab === 'VOLUMES' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-purple-300" />
                <span>Suivi des Volumes Horaires</span>
              </button>
            )}

            {canRoleAccessTab(currentUser?.role, 'BACKUP_SECURITY') && (
              <button
                type="button"
                onClick={() => handleNavigate('BACKUP_SECURITY')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                  currentTab === 'BACKUP_SECURITY' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                <span>Sauvegardes & Cloud SIS</span>
              </button>
            )}

            {canRoleAccessTab(currentUser?.role, 'AUDIT') && (
              <button
                type="button"
                onClick={() => handleNavigate('AUDIT')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                  currentTab === 'AUDIT' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <History className="w-3.5 h-3.5 text-rose-300" />
                <span>Journal d'Audit</span>
              </button>
            )}

            {canRoleAccessTab(currentUser?.role, 'EXPORT_STUDENTS') && (
              <button
                type="button"
                onClick={() => handleNavigate('EXPORT_STUDENTS')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                  currentTab === 'EXPORT_STUDENTS' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-300" />
                <span>Export Étudiants</span>
              </button>
            )}
          </div>
        )}
    </header>
  );
};
