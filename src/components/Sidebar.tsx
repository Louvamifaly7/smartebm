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
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenReceptionTests?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  onOpenReceptionTests,
}) => {
  const {
    currentUser,
    logout,
    academicYears,
    selectedAcademicYear,
    setSelectedAcademicYear,
    setActiveAcademicYear,
    appSettings,
    notifications,
  } = useApp();

  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);

  const isStaffOrAdmin = ['ADMIN', 'SCHEDULER', 'ACADEMIC_HEAD'].includes(currentUser?.role || '');

  const unreadCount = notifications.filter(
    (n) => (n.recipientId === currentUser?.id || n.recipientRole === currentUser?.role || !n.recipientId) && !n.isReadWeb
  ).length;

  // Filter menu items by appSettings.visibleMenuItems
  const isVisible = (tabId: string) => {
    if (!appSettings.visibleMenuItems || appSettings.visibleMenuItems.length === 0) return true;
    return appSettings.visibleMenuItems.includes(tabId);
  };

  const currentYearObj = academicYears.find((y) => y.code === selectedAcademicYear) || academicYears[0];

  return (
    <aside
      className={`bg-slate-900 text-white flex flex-col border-r border-slate-800 transition-all duration-300 z-30 select-none ${
        isCollapsed ? 'w-20' : 'w-72'
      } min-h-screen flex-shrink-0 sticky top-0 h-screen`}
    >
      {/* 1. Header of Sidebar */}
      <div className="p-3.5 border-b border-slate-800/80 flex items-center justify-between gap-2">
        {!isCollapsed && (
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
            Menu Navigation
          </span>
        )}
        {/* Collapse toggle button */}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-auto"
          title={isCollapsed ? 'Déplier le menu' : 'Replier le menu'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* 2. Academic Year Selector Widget (OpenEduCat 19 ergonomics) */}
      {!isCollapsed ? (
        <div className="px-3 pt-3 pb-2 border-b border-slate-800/60 relative">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Année Académique Active
          </label>
          <button
            type="button"
            onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
            className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-white transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2 truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
              <span className="truncate">{currentYearObj?.name || selectedAcademicYear}</span>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
          </button>

          {/* Dropdown Menu */}
          {isYearDropdownOpen && (
            <div className="absolute left-3 right-3 top-full mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-xl p-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {academicYears.map((ay) => (
                  <button
                    key={ay.id}
                    type="button"
                    onClick={() => {
                      setSelectedAcademicYear(ay.code);
                      if (isStaffOrAdmin) {
                        setActiveAcademicYear(ay.code);
                      }
                      setIsYearDropdownOpen(false);
                    }}
                    className={`w-full text-left p-2 rounded-lg flex items-center justify-between gap-2 transition-colors ${
                      ay.code === selectedAcademicYear
                        ? 'bg-blue-600 text-white font-bold'
                        : 'text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <div className="truncate">
                      <span className="block font-semibold truncate">{ay.code}</span>
                      <span className="text-[10px] text-slate-300/80 block truncate">{ay.name}</span>
                    </div>
                    {ay.code === selectedAcademicYear && <Check className="w-4 h-4 flex-shrink-0" />}
                  </button>
                ))}
              </div>

              {isStaffOrAdmin && (
                <div className="mt-1 pt-1 border-t border-slate-700">
                  <button
                    type="button"
                    onClick={() => {
                      setIsYearDropdownOpen(false);
                      onSelectTab('ACADEMIC_YEARS');
                    }}
                    className="w-full text-left p-2 rounded-lg text-blue-400 hover:bg-slate-700 hover:text-blue-300 font-bold flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Gérer & Créer les Années</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="p-2 border-b border-slate-800 flex justify-center">
          <button
            type="button"
            onClick={() => onSelectTab('ACADEMIC_YEARS')}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-blue-400"
            title={`Année active: ${selectedAcademicYear}`}
          >
            <CalendarDays className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* 3. Navigation Links List */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4 no-scrollbar text-xs">
        
        {/* SECTION: VUE GÉNÉRALE */}
        <div className="space-y-1">
          {!isCollapsed && (
            <span className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Général
            </span>
          )}
          {isVisible('HOME') && (
            <button
              type="button"
              onClick={() => onSelectTab('HOME')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold transition-all ${
                currentTab === 'HOME'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/90'
              }`}
              title="Accueil & Tableau de bord"
            >
              <Home className="w-4 h-4 text-blue-400 flex-shrink-0" />
              {!isCollapsed && <span>Accueil</span>}
            </button>
          )}
        </div>

        {/* SECTION: PÉDAGOGIE & COURS */}
        <div className="space-y-1">
          {!isCollapsed && (
            <span className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Pédagogie & Cours
            </span>
          )}

          {isVisible('TIMETABLE') && (
            <button
              type="button"
              onClick={() => onSelectTab('TIMETABLE')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold transition-all ${
                currentTab === 'TIMETABLE'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/90'
              }`}
              title="Emploi du Temps hebdomadaire"
            >
              <Calendar className="w-4 h-4 text-indigo-400 flex-shrink-0" />
              {!isCollapsed && <span>Emploi du Temps</span>}
            </button>
          )}

          {isVisible('ROOMS') && (
            <button
              type="button"
              onClick={() => onSelectTab('ROOMS')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold transition-all ${
                currentTab === 'ROOMS'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/90'
              }`}
              title="Salles de cours & Équipements"
            >
              <Layers className="w-4 h-4 text-amber-400 flex-shrink-0" />
              {!isCollapsed && <span>Salles & Équipements</span>}
            </button>
          )}

          {isVisible('LMD_MAQUETTES') && (
            <button
              type="button"
              onClick={() => onSelectTab('LMD_MAQUETTES')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold transition-all ${
                currentTab === 'LMD_MAQUETTES'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/90'
              }`}
              title="Maquettes LMD, UEs et ECs"
            >
              <GraduationCap className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              {!isCollapsed && <span>Maquettes LMD</span>}
            </button>
          )}

          {isVisible('GRADES') && (
            <button
              type="button"
              onClick={() => onSelectTab('GRADES')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold transition-all ${
                currentTab === 'GRADES'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/90'
              }`}
              title="Notes, Évaluations 40/60 ou 100%"
            >
              <Award className="w-4 h-4 text-rose-400 flex-shrink-0" />
              {!isCollapsed && <span>Notes & Évaluations</span>}
            </button>
          )}

          {isVisible('HOMEWORK_RESOURCES') && (
            <button
              type="button"
              onClick={() => onSelectTab('HOMEWORK_RESOURCES')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold transition-all ${
                currentTab === 'HOMEWORK_RESOURCES'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/90'
              }`}
              title="Devoirs, exercices & supports de cours"
            >
              <BookOpen className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              {!isCollapsed && <span>Devoirs & Cours</span>}
            </button>
          )}
        </div>

        {/* SECTION: VIE SCOLAIRE & CAMPUS */}
        <div className="space-y-1">
          {!isCollapsed && (
            <span className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Vie Scolaire & Campus
            </span>
          )}

          {isVisible('QR_ATTENDANCE') && (
            <button
              type="button"
              onClick={() => onSelectTab('QR_ATTENDANCE')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold transition-all ${
                currentTab === 'QR_ATTENDANCE'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/90'
              }`}
              title="Pointage de présence par QR Code dynamique"
            >
              <QrCode className="w-4 h-4 text-amber-400 flex-shrink-0" />
              {!isCollapsed && <span>Présence & Pointage QR</span>}
            </button>
          )}

          {isVisible('COMMUNICATION') && (
            <button
              type="button"
              onClick={() => onSelectTab('COMMUNICATION')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold transition-all ${
                currentTab === 'COMMUNICATION'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/90'
              }`}
              title="Mur de la promotion et messagerie"
            >
              <MessageSquare className="w-4 h-4 text-purple-400 flex-shrink-0" />
              {!isCollapsed && <span>Mur & Messages</span>}
            </button>
          )}
        </div>

        {/* SECTION: ANNUAIRE & SUIVI (ÉTUDIANTS & ENSEIGNANTS) */}
        <div className="space-y-1">
          {!isCollapsed && (
            <span className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Annuaire & Suivi
            </span>
          )}

          {isVisible('STUDENTS') && (
            <button
              type="button"
              onClick={() => onSelectTab('STUDENTS')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold transition-all ${
                currentTab === 'STUDENTS'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/90'
              }`}
              title="Répertoire des Étudiants (Notes, Impayés, Profil)"
            >
              <GraduationCap className="w-4 h-4 text-sky-400 flex-shrink-0" />
              {!isCollapsed && <span>Répertoire Étudiants</span>}
            </button>
          )}

          {isVisible('TEACHERS') && (
            <button
              type="button"
              onClick={() => onSelectTab('TEACHERS')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold transition-all ${
                currentTab === 'TEACHERS'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/90'
              }`}
              title="Corps Enseignant & Charges Horaires"
            >
              <Users className="w-4 h-4 text-indigo-400 flex-shrink-0" />
              {!isCollapsed && <span>Corps Enseignant</span>}
            </button>
          )}
        </div>

        {/* SECTION: GESTION & FINANCE */}
        <div className="space-y-1">
          {!isCollapsed && (
            <span className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Gestion Financière
            </span>
          )}

          {isVisible('FINANCIAL') && (
            <button
              type="button"
              onClick={() => onSelectTab('FINANCIAL')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold transition-all ${
                currentTab === 'FINANCIAL'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/90'
              }`}
              title="Écolages, caisse en Ariary et reçus"
            >
              <DollarSign className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              {!isCollapsed && <span>Finances & Caisse (Ar)</span>}
            </button>
          )}
        </div>

        {/* SECTION: CONFIGURATION & ADMINISTRATION */}
        <div className="space-y-1">
          {!isCollapsed && (
            <span className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Configuration & Outils
            </span>
          )}

          {isVisible('ACADEMIC_YEARS') && (
            <button
              type="button"
              onClick={() => onSelectTab('ACADEMIC_YEARS')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold transition-all ${
                currentTab === 'ACADEMIC_YEARS'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-indigo-300 hover:text-white hover:bg-slate-800/90'
              }`}
              title="Gestion des Années Académiques"
            >
              <CalendarDays className="w-4 h-4 text-indigo-400 flex-shrink-0" />
              {!isCollapsed && (
                <div className="flex items-center justify-between w-full">
                  <span>Années Académiques</span>
                  <span className="text-[10px] bg-indigo-900/60 text-indigo-300 px-1.5 py-0.2 rounded font-mono">
                    {academicYears.length}
                  </span>
                </div>
              )}
            </button>
          )}

          {isVisible('SETTINGS') && (
            <button
              type="button"
              onClick={() => onSelectTab('SETTINGS')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold transition-all ${
                currentTab === 'SETTINGS'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-indigo-300 hover:text-white hover:bg-slate-800/90'
              }`}
              title="Paramètres de l'Application (Menu, Affichage)"
            >
              <Settings className="w-4 h-4 text-indigo-400 flex-shrink-0" />
              {!isCollapsed && <span>Paramètres Système</span>}
            </button>
          )}

          {isVisible('USERS_MANAGEMENT') && (
            <button
              type="button"
              onClick={() => onSelectTab('USERS_MANAGEMENT')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold transition-all ${
                ['USERS_MANAGEMENT', 'DATA_MANAGEMENT', 'VOLUMES', 'AUDIT', 'EXPORT_STUDENTS', 'TEACHERS', 'STUDENTS'].includes(currentTab)
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-indigo-300 hover:text-white hover:bg-slate-800/90'
              }`}
              title="Administration générale et utilisateurs"
            >
              <Users className="w-4 h-4 text-indigo-300 flex-shrink-0" />
              {!isCollapsed && <span>Administration & Outils</span>}
            </button>
          )}

          <button
            type="button"
            onClick={onOpenReceptionTests}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-emerald-400 hover:text-white hover:bg-emerald-950/40 transition-all border border-emerald-900/50"
            title="Banc de Contrôle Qualité & Tests"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            {!isCollapsed && <span>Contrôle Qualité</span>}
          </button>
        </div>
      </nav>

      {/* 4. Footer User Profile Card */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/50">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-700 text-white flex items-center justify-center font-bold text-xs border border-blue-500 flex-shrink-0">
              {currentUser.name.substring(0, 2).toUpperCase()}
            </div>
            {!isCollapsed && (
              <div className="min-w-0 truncate">
                <span className="font-bold text-xs text-white block truncate leading-tight">
                  {currentUser.name}
                </span>
                <span className="text-[10px] text-blue-300 font-medium block truncate">
                  {currentUser.role === 'STUDENT' ? `Étudiant (${currentUser.matricule})` : currentUser.role}
                </span>
              </div>
            )}
          </div>

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
  );
};
