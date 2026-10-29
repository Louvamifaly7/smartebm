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
} from 'lucide-react';

interface HeaderProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenNotifications: () => void;
  onOpenReceptionTests: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  onOpenNotifications,
  onOpenReceptionTests,
}) => {
  const {
    currentUser,
    users,
    setCurrentUser,
    isAndroidView,
    toggleAndroidView,
    notifications,
    logout,
  } = useApp();

  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const unreadCount = notifications.filter(
    (n) => (n.recipientId === currentUser?.id || n.recipientRole === currentUser?.role || !n.recipientId) && !n.isReadWeb
  ).length;

  const quickProfiles = [
    { label: 'Admin', user: users.find((u) => u.role === 'ADMIN') },
    { label: 'Planificateur', user: users.find((u) => u.role === 'SCHEDULER') },
    { label: 'Pédagogie', user: users.find((u) => u.role === 'ACADEMIC_HEAD') },
    { label: 'Enseignant', user: users.find((u) => u.role === 'TEACHER') },
    { label: 'Étudiant', user: users.find((u) => u.role === 'STUDENT' && !u.mustChangePassword) },
    { label: 'Étudiant (1ère connexion)', user: users.find((u) => u.mustChangePassword) },
  ];

  // Quick module search items
  const allSearchableModules = [
    { id: 'HOME', label: 'Accueil / Tableau de bord', icon: Home, category: 'Principal' },
    { id: 'TIMETABLE', label: 'Emploi du Temps', icon: Calendar, category: 'Planning' },
    { id: 'ROOMS', label: 'Salles & Équipements', icon: MapPin, category: 'Planning' },
    { id: 'LMD_MAQUETTES', label: 'Maquettes LMD & ECTS', icon: Layers, category: 'Pédagogie' },
    { id: 'GRADES', label: 'Notes & Évaluations', icon: Award, category: 'Pédagogie' },
    { id: 'QR_ATTENDANCE', label: 'Pointage QR Code & OTP', icon: QrCode, category: 'Présences' },
    { id: 'FINANCIAL', label: 'Finances & Caisse en Ariary', icon: Banknote, category: 'Finances' },
    { id: 'HOMEWORK_RESOURCES', label: 'Devoirs & Supports de Cours', icon: BookOpen, category: 'Pédagogie' },
    { id: 'COMMUNICATION', label: 'Messagerie & Mur de Promotion', icon: MessageSquare, category: 'Campus' },
    { id: 'VOLUMES', label: 'Suivi des Volumes Horaires', icon: Clock, category: 'Planning' },
    { id: 'USERS_MANAGEMENT', label: 'Gestion des Utilisateurs', icon: Users, category: 'Administration' },
    { id: 'DATA_MANAGEMENT', label: 'Création des Données & Salles', icon: Database, category: 'Administration' },
    { id: 'AUDIT', label: 'Journal d’Audit', icon: History, category: 'Administration' },
    { id: 'EXPORT_STUDENTS', label: 'Export Sélectif Étudiants', icon: FileSpreadsheet, category: 'Administration' },
  ];

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

  const isStaffOrAdmin = ['ADMIN', 'SCHEDULER', 'ACADEMIC_HEAD'].includes(currentUser?.role || '');

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-lg">
      {/* 1. Top Bar: Branding, Quick Profile Switcher, Search, Recette & Mode Toggles */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80">
        
        {/* Logo and Brand */}
        <div
          onClick={() => handleNavigate('HOME')}
          className="flex items-center gap-3 cursor-pointer hover:opacity-95 transition-opacity"
          title="Aller à l'accueil"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center font-black text-amber-300 text-sm shadow-md ring-2 ring-blue-400/20">
            EBM
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-black tracking-tight text-white uppercase">
                EBM Institute
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-950 text-blue-300 border border-blue-800 rounded-md">
                v3.2 SIS
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-none mt-0.5">
              Système de Gestion Universitaire Centralisé (Web & Android)
            </p>
          </div>
        </div>

        {/* Quick Role Switcher (Simulateur de Profils) */}
        <div className="hidden xl:flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl text-xs border border-slate-700">
          <span className="text-[10px] uppercase font-bold text-slate-400 px-2">Profil actif :</span>
          {quickProfiles.map((p, i) => {
            if (!p.user) return null;
            const isSelected = p.user.id === currentUser?.id;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setCurrentUser(p.user!)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
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

        {/* Right Tools: Instant Search, REC tests, Android Simulator, Notifications, User Profile */}
        <div className="flex items-center gap-2">
          
          {/* Quick Module Search Input */}
          <div className="relative">
            <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1 text-xs focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
              <Search className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
              <input
                type="text"
                placeholder="Rechercher (ex: Salles, Notes...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                className="bg-transparent text-white placeholder-slate-400 text-xs outline-none w-36 sm:w-48"
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

          {/* Contrôle de Conformité */}
          <button
            type="button"
            onClick={onOpenReceptionTests}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            title="Ouvrir le centre de vérification et de contrôle de conformité"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Contrôle Qualité</span>
          </button>

          {/* Mode Switcher: Desktop Web vs Android Smartphone */}
          <button
            type="button"
            onClick={toggleAndroidView}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
              isAndroidView
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md ring-2 ring-amber-400/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
            title="Basculer entre la vue Portail Web et le simulateur Android Smartphone"
          >
            {isAndroidView ? (
              <>
                <Monitor className="w-3.5 h-3.5" />
                <span>Vue Web</span>
              </>
            ) : (
              <>
                <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Vue Android</span>
                <span className="sm:hidden">Android</span>
              </>
            )}
          </button>

          {/* Notifications Bell */}
          <button
            type="button"
            onClick={onOpenNotifications}
            className="relative p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
            title="Centre de notifications Web & Android"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* User Profile & Logout */}
          {currentUser && (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="w-8 h-8 rounded-xl bg-blue-700 text-white flex items-center justify-center font-bold text-xs border border-blue-500">
                {currentUser.name.substring(0, 2).toUpperCase()}
              </div>
              <div className="hidden md:block text-left">
                <span className="text-xs font-bold text-white block leading-tight">
                  {currentUser.name}
                </span>
                <span className="text-[10px] text-blue-300 font-medium">
                  {currentUser.role === 'STUDENT' ? `Étudiant (${currentUser.matricule})` : currentUser.role}
                </span>
              </div>
              <button
                type="button"
                onClick={logout}
                className="p-1.5 ml-1 rounded-lg bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800/60 transition-colors cursor-pointer"
                title="Se déconnecter de la session"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Main Navigation Bar: 100% DIRECT CLICKABLE TABS */}
      {!isAndroidView && (
        <>
          <nav className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-between gap-1 overflow-x-auto no-scrollbar text-xs font-bold relative">
            <div className="flex items-center gap-1.5 flex-wrap">
              
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

              {/* 3. Salles & Équipements (DIRECT 1-CLICK) */}
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

              {/* 4. Maquettes LMD */}
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

              {/* 5. Notes & Évaluations */}
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
                <span>Notes & Évaluations</span>
              </button>

              {/* 6. Pointage QR */}
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

              {/* 7. Finances en Ariary */}
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

              {/* 8. Devoirs & Cours */}
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

              {/* 9. Mur & Messagerie */}
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

              {/* 10. Administration & Outils (DIRECT 1-CLICK TAB) */}
              <button
                type="button"
                onClick={() => {
                  if (!isStaffOrAdmin) {
                    const adminUser = users.find((u) => u.role === 'ADMIN');
                    if (adminUser) setCurrentUser(adminUser);
                  }
                  handleNavigate('USERS_MANAGEMENT');
                }}
                className={`px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer border ${
                  ['USERS_MANAGEMENT', 'DATA_MANAGEMENT', 'VOLUMES', 'AUDIT', 'EXPORT_STUDENTS', 'TEACHERS', 'STUDENTS'].includes(currentTab)
                    ? 'bg-indigo-600 text-white border-indigo-400 shadow-md ring-1 ring-indigo-300'
                    : isStaffOrAdmin
                    ? 'text-indigo-300 hover:text-white hover:bg-slate-800 border-indigo-900/60'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800 border-slate-800'
                }`}
                title="Accéder aux outils d'administration et de gestion"
              >
                <Shield className="w-4 h-4 text-indigo-300" />
                <span>Administration & Outils</span>
              </button>
            </div>
          </nav>

          {/* Sub-bar for Administration tools whenever an admin tab is active */}
          {isStaffOrAdmin && ['USERS_MANAGEMENT', 'DATA_MANAGEMENT', 'VOLUMES', 'AUDIT', 'EXPORT_STUDENTS', 'TEACHERS', 'STUDENTS'].includes(currentTab) && (
            <div className="bg-slate-950 border-t border-b border-indigo-900/40 px-4 sm:px-6 py-1.5 flex items-center gap-2 overflow-x-auto no-scrollbar text-xs">
              <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1 mr-1">
                <Shield className="w-3.5 h-3.5" /> Administration :
              </span>

              <button
                type="button"
                onClick={() => handleNavigate('USERS_MANAGEMENT')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  currentTab === 'USERS_MANAGEMENT' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-indigo-300" />
                <span>Utilisateurs & Comptes</span>
              </button>

              <button
                type="button"
                onClick={() => handleNavigate('DATA_MANAGEMENT')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  currentTab === 'DATA_MANAGEMENT' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Database className="w-3.5 h-3.5 text-teal-300" />
                <span>Création des Données & Salles</span>
              </button>

              <button
                type="button"
                onClick={() => handleNavigate('VOLUMES')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  currentTab === 'VOLUMES' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-purple-300" />
                <span>Suivi des Volumes Horaires</span>
              </button>

              <button
                type="button"
                onClick={() => handleNavigate('AUDIT')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  currentTab === 'AUDIT' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <History className="w-3.5 h-3.5 text-rose-300" />
                <span>Journal d'Audit</span>
              </button>

              <button
                type="button"
                onClick={() => handleNavigate('EXPORT_STUDENTS')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  currentTab === 'EXPORT_STUDENTS' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-300" />
                <span>Export Étudiants</span>
              </button>
            </div>
          )}
        </>
      )}
    </header>
  );
};
