import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  Bell,
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
  User as UserIcon,
  HelpCircle,
} from 'lucide-react';
import { canRoleAccessTab, getRoleLabel } from '../utils/rbacPermissions';
import { OfflineAndSyncIndicator, PWAInstallButton } from './PWAInstallButton';
import { showAppToast } from './ToastAndConfirmCenter';

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
    rooms,
    courses,
    groups,
    setCurrentUser,
    isAndroidView,
    notifications,
    logout,
    academicYears,
    selectedAcademicYear,
    setSelectedAcademicYear,
    appSettings,
    customRoles,
    isRealAdminSession,
  } = useApp();

  const [isYearPickerOpen, setIsYearPickerOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isGlobalSearchModalOpen, setIsGlobalSearchModalOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsGlobalSearchModalOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setIsGlobalSearchModalOpen(false);
        setIsSearchFocused(false);
        setIsUserMenuOpen(false);
        setIsYearPickerOpen(false);
      }
    };
    const onClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onClickOutside);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onClickOutside);
    };
  }, []);

  const unreadCount = notifications.filter(
    (n) =>
      (n.recipientId === currentUser?.id || n.recipientRole === currentUser?.role || !n.recipientId) &&
      !n.isReadWeb
  ).length;

  const quickProfiles = [
    { label: 'Admin', user: users.find((u) => u.role === 'ADMIN') },
    {
      label: 'Scolarité',
      user: users.find((u) => u.role === 'SCOLARITE') || users.find((u) => u.role === 'SCHEDULER'),
    },
    { label: 'Finances', user: users.find((u) => u.role === 'FINANCE') },
    { label: 'Pédagogie', user: users.find((u) => u.role === 'ACADEMIC_HEAD') },
    { label: 'Enseignant', user: users.find((u) => u.role === 'TEACHER') },
    { label: 'Étudiant', user: users.find((u) => u.role === 'STUDENT' && !u.mustChangePassword) },
    { label: 'Parent', user: users.find((u) => u.role === 'PARENT') },
  ];

  // Quick module search items mapped to the 7 sections
  const allSearchableModules = [
    { id: 'HOME', label: 'Tableau de bord', icon: Home, category: 'Tableau de bord' },
    { id: 'TIMETABLE', label: 'Emplois du temps', icon: Calendar, category: 'Planning & salles' },
    { id: 'ROOMS', label: 'Salles & disponibilités', icon: MapPin, category: 'Planning & salles' },
    { id: 'VOLUMES', label: 'Suivi des volumes horaires', icon: Clock, category: 'Planning & salles' },
    { id: 'STUDENTS', label: 'Étudiants (Répertoire & dossiers)', icon: GraduationCap, category: 'Gestion académique' },
    { id: 'TEACHERS', label: 'Enseignants & charges horaires', icon: UserCheck, category: 'Gestion académique' },
    { id: 'LMD_MAQUETTES', label: 'Filières, parcours & maquettes LMD', icon: Layers, category: 'Gestion académique' },
    { id: 'DATA_MANAGEMENT', label: 'Groupes, cours & référentiel', icon: Database, category: 'Gestion académique' },
    { id: 'QR_ATTENDANCE', label: 'Présences & appel QR code', icon: QrCode, category: 'Scolarité' },
    { id: 'GRADES', label: 'Notes, évaluations & délibérations', icon: Award, category: 'Scolarité' },
    { id: 'HOMEWORK_RESOURCES', label: 'Devoirs & documents pédagogiques', icon: BookOpen, category: 'Scolarité' },
    { id: 'EXPORT_STUDENTS', label: 'Listes & exports étudiants', icon: FileSpreadsheet, category: 'Scolarité' },
    { id: 'FINANCIAL', label: 'Finances, écolages & caisse (Ar)', icon: Banknote, category: 'Finances' },
    { id: 'COMMUNICATION', label: 'Annonces & messagerie', icon: MessageSquare, category: 'Communication' },
    { id: 'PARENT_PORTAL', label: 'Portail Parents / Tuteurs', icon: Users, category: 'Communication' },
    { id: 'USERS_MANAGEMENT', label: 'Gestion des personnes & rôles', icon: Users, category: 'Administration' },
    { id: 'ACADEMIC_YEARS', label: 'Années universitaires', icon: CalendarDays, category: 'Administration' },
    { id: 'SETTINGS', label: 'Paramètres & configuration', icon: Settings, category: 'Administration' },
    { id: 'BACKUP_SECURITY', label: 'Sauvegardes & Cloud Firestore', icon: ShieldCheck, category: 'Administration' },
    { id: 'AUDIT', label: "Journal d'audit", icon: History, category: 'Administration' },
  ].filter((m) => canRoleAccessTab(currentUser?.role, m.id, currentUser?.customPermissions, customRoles));

  const q = searchQuery.trim().toLowerCase();

  const globalSearchResults = React.useMemo(() => {
    if (!q) return [];
    const results: {
      id: string;
      title: string;
      subtitle: string;
      category: 'Étudiant' | 'Enseignant' | 'Salle' | 'Cours' | 'Module';
      targetTab: string;
    }[] = [];

    // 1. Modules
    allSearchableModules.forEach((m) => {
      if (m.label.toLowerCase().includes(q) || m.category.toLowerCase().includes(q)) {
        results.push({
          id: `mod-${m.id}`,
          title: m.label,
          subtitle: `Section · ${m.category}`,
          category: 'Module',
          targetTab: m.id,
        });
      }
    });

    // 2. Étudiants
    if (currentUser?.role !== 'STUDENT') {
      users
        .filter((u) => u.role === 'STUDENT')
        .forEach((st) => {
          if (
            st.name.toLowerCase().includes(q) ||
            (st.matricule && st.matricule.toLowerCase().includes(q)) ||
            st.email.toLowerCase().includes(q)
          ) {
            const grp = groups.find((g) => g.id === st.groupId);
            results.push({
              id: `stu-${st.id}`,
              title: st.name,
              subtitle: `${st.matricule || 'Étudiant'} · ${grp?.code || 'Sans groupe'}`,
              category: 'Étudiant',
              targetTab: 'STUDENTS',
            });
          }
        });
    }

    // 3. Enseignants
    users
      .filter((u) => u.role === 'TEACHER')
      .forEach((tc) => {
        if (
          tc.name.toLowerCase().includes(q) ||
          (tc.specialty && tc.specialty.toLowerCase().includes(q)) ||
          (tc.subjects && tc.subjects.some((s) => s.toLowerCase().includes(q)))
        ) {
          results.push({
            id: `tch-${tc.id}`,
            title: `${tc.civilite || 'Dr.'} ${tc.name}`,
            subtitle: tc.specialty || tc.academicRank || 'Corps Enseignant',
            category: 'Enseignant',
            targetTab: canRoleAccessTab(currentUser?.role, 'TEACHERS', currentUser?.customPermissions, customRoles)
              ? 'TEACHERS'
              : 'TIMETABLE',
          });
        }
      });

    // 4. Salles
    rooms.forEach((rm) => {
      if (rm.name.toLowerCase().includes(q) || rm.building.toLowerCase().includes(q)) {
        results.push({
          id: `rm-${rm.id}`,
          title: rm.name,
          subtitle: `${rm.building} · Capacité ${rm.capacity} places`,
          category: 'Salle',
          targetTab: canRoleAccessTab(currentUser?.role, 'ROOMS', currentUser?.customPermissions, customRoles)
            ? 'ROOMS'
            : 'TIMETABLE',
        });
      }
    });

    // 5. Cours & EC
    courses.forEach((c) => {
      if (c.title.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)) {
        results.push({
          id: `crs-${c.id}`,
          title: `${c.code} — ${c.title}`,
          subtitle: `${c.totalHours}h prévues · Planning & Volumes`,
          category: 'Cours',
          targetTab: 'TIMETABLE',
        });
      }
    });

    return results.slice(0, 14);
  }, [q, allSearchableModules, users, rooms, courses, groups, currentUser, customRoles]);

  const handleNavigate = (tabId: string, toastText?: string) => {
    onSelectTab(tabId);
    setSearchQuery('');
    setIsSearchFocused(false);
    setIsGlobalSearchModalOpen(false);
    setIsUserMenuOpen(false);
    if (toastText) {
      showAppToast({
        type: 'info',
        title: toastText,
      });
    }
  };

  const isStaffOrAdmin = ['ADMIN', 'ADMIN_STAFF', 'SCOLARITE', 'SCHEDULER', 'FINANCE', 'ACADEMIC_HEAD'].includes(
    currentUser?.role || ''
  );

  return (
    <header className="bg-[#17345B] text-white border-b border-[#214575] sticky top-0 z-30 shadow-md">
      {/* 1. Top Bar: Branding, Quick Profile Switcher, Global Search, Notifications & User Profile Menu */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 flex flex-col gap-2 border-b border-white/10">
        <div className="flex items-center justify-between gap-2">
          {/* Left: Hamburger Menu + Official Logo & Academic Year */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Mobile Drawer Trigger (< lg) */}
            {onOpenMobileMenu && (
              <button
                type="button"
                onClick={onOpenMobileMenu}
                className="p-2 rounded-xl bg-[#102542] text-slate-200 hover:text-white hover:bg-white/10 border border-white/15 transition-colors lg:hidden cursor-pointer flex-shrink-0"
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
                className="hidden lg:inline-flex p-1.5 rounded-lg text-slate-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Afficher / Replier le menu latéral"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            <div
              onClick={() => handleNavigate('HOME')}
              className="flex items-center gap-2 cursor-pointer hover:opacity-95 transition-opacity flex-shrink-0"
              title="Aller au Tableau de bord"
            >
              <div className="bg-white px-2 py-1 rounded-xl shadow-xs flex-shrink-0 flex items-center justify-center">
                <img
                  src="/assets/aistudio/logo_540e8d94.png"
                  alt="Logo Officiel EBM Institute"
                  className="h-7 sm:h-8 w-auto object-contain"
                />
              </div>
            </div>

            {/* Persistent Academic Year Switcher */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsYearPickerOpen(!isYearPickerOpen)}
                className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#102542] hover:bg-white/10 text-[11px] sm:text-xs font-bold text-white border border-white/15 transition-all cursor-pointer"
                title="Changer d'année universitaire active"
              >
                <CalendarDays className="w-3.5 h-3.5 text-blue-300 shrink-0" />
                <span className="truncate max-w-[72px] sm:max-w-none">{selectedAcademicYear}</span>
                <ChevronDown className="w-3 h-3 text-slate-300 shrink-0" />
              </button>

              {isYearPickerOpen && (
                <div className="absolute left-0 top-full mt-1.5 w-60 bg-[#102542] border border-white/15 rounded-xl shadow-2xl p-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                  <div className="text-[10px] uppercase font-bold text-blue-200 px-2 py-1">
                    Année universitaire active
                  </div>
                  {academicYears.map((ay) => (
                    <button
                      key={ay.id}
                      type="button"
                      onClick={() => {
                        setSelectedAcademicYear(ay.code);
                        setIsYearPickerOpen(false);
                      }}
                      className={`w-full text-left p-2 rounded-lg flex items-center justify-between text-xs transition-colors cursor-pointer ${
                        ay.code === selectedAcademicYear
                          ? 'bg-[#2F6FED] text-white font-bold'
                          : 'text-slate-200 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span>
                        {ay.code} {ay.isCurrent ? '(Active)' : ''}
                      </span>
                      {ay.code === selectedAcademicYear && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                  {isStaffOrAdmin && (
                    <div className="mt-1 pt-1 border-t border-white/10">
                      <button
                        type="button"
                        onClick={() => {
                          setIsYearPickerOpen(false);
                          handleNavigate('ACADEMIC_YEARS');
                        }}
                        className="w-full text-left p-1.5 text-blue-300 hover:text-white font-bold text-[11px] cursor-pointer"
                      >
                        + Gérer les années universitaires
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Center (Desktop xl+): Quick Role Switcher — strictly visible for authenticated Admin sessions */}
          {isRealAdminSession && (
            <div className="hidden xl:flex items-center gap-1 bg-[#102542] p-1 rounded-xl text-xs border border-white/15">
              <span className="text-[10px] uppercase font-bold text-[#D58A18] px-2 flex items-center gap-1">
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
                        ? 'bg-[#2F6FED] text-white shadow-xs ring-1 ring-blue-300'
                        : 'text-slate-200 hover:text-white hover:bg-white/10'
                    }`}
                    title={`Basculer immédiatement sur le compte ${p.user.name} (${p.label})`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Right Tools: Global Search, Connection/Sync Status, PWA Install, Notifications, Settings, User Profile Dropdown */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {/* Global Search Trigger for Mobile (< sm) */}
            <button
              type="button"
              onClick={() => setIsGlobalSearchModalOpen(true)}
              className="sm:hidden p-2 rounded-xl bg-[#102542] hover:bg-white/10 text-slate-200 border border-white/15 cursor-pointer"
              title="Recherche globale (Étudiant, Enseignant, Salle, Cours)"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Global Search Input (Desktop & Tablet sm+) */}
            <div className="relative hidden sm:block">
              <div className="flex items-center bg-[#102542] border border-white/15 rounded-xl px-2.5 py-1 text-xs focus-within:border-[#2F6FED] focus-within:ring-1 focus-within:ring-[#2F6FED] transition-all">
                <Search className="w-3.5 h-3.5 text-slate-300 mr-1.5 shrink-0" />
                <input
                  type="text"
                  placeholder="Rechercher étudiant, prof, salle… (Ctrl+K)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  className="bg-transparent text-white placeholder-slate-300 text-xs outline-none w-36 md:w-56"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-slate-300 hover:text-white ml-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Instant Global Search Dropdown */}
              {isSearchFocused && searchQuery.trim() && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-[#102542] border border-white/20 rounded-2xl shadow-2xl overflow-hidden z-50 text-xs animate-in fade-in duration-150">
                  <div className="p-2.5 border-b border-white/10 bg-[#0b1b32] flex justify-between items-center text-[11px] text-slate-300">
                    <span className="font-bold">Résultats de recherche ({globalSearchResults.length})</span>
                    <button
                      type="button"
                      onClick={() => setIsSearchFocused(false)}
                      className="hover:text-white cursor-pointer"
                    >
                      Fermer
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto no-scrollbar p-1.5 space-y-1">
                    {globalSearchResults.length === 0 ? (
                      <div className="p-4 text-center text-slate-300 text-xs">
                        Aucun étudiant, enseignant, salle ou cours trouvé pour « {searchQuery} ».
                      </div>
                    ) : (
                      globalSearchResults.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleNavigate(item.targetTab, `${item.category} : ${item.title}`)}
                          className="w-full text-left p-2 rounded-xl hover:bg-[#2F6FED] hover:text-white transition-colors flex items-center justify-between text-slate-100 cursor-pointer group gap-2"
                        >
                          <div className="min-w-0">
                            <div className="font-bold text-xs truncate">{item.title}</div>
                            <div className="text-[10px] text-slate-300 group-hover:text-blue-100 truncate">
                              {item.subtitle}
                            </div>
                          </div>
                          <span className="text-[10px] font-semibold text-blue-200 group-hover:text-white shrink-0">
                            {item.category}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Connection & Real-Time Sync Indicator + PWA Install */}
            <OfflineAndSyncIndicator />
            <div className="hidden md:block">
              <PWAInstallButton compact />
            </div>

            {/* Notifications Bell */}
            <button
              type="button"
              onClick={onOpenNotifications}
              className="relative p-2 rounded-xl bg-[#102542] hover:bg-white/10 text-slate-100 border border-white/15 transition-colors cursor-pointer"
              title="Centre de notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* User Profile Dropdown Menu (Section 2, Page 3: "Un menu profil regroupe préférences, aide et déconnexion") */}
            {currentUser && (
              <div className="relative pl-1.5 sm:pl-2 border-l border-white/15" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen((prev) => !prev)}
                  className="flex items-center gap-2 px-2 py-1 rounded-xl bg-[#102542] hover:bg-white/10 border border-white/15 transition-colors cursor-pointer text-left group"
                  title="Menu Profil, Préférences, Aide et Déconnexion"
                >
                  <div className="w-7 h-7 rounded-lg bg-[#2F6FED] text-white flex items-center justify-center font-bold text-xs shrink-0">
                    {currentUser.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="hidden md:block text-left">
                    <span className="text-xs font-bold text-white block leading-tight truncate max-w-[130px]">
                      {currentUser.name}
                    </span>
                    <span className="text-[10px] text-blue-200 font-medium block leading-none mt-0.5">
                      {currentUser.role === 'STUDENT'
                        ? `Étudiant (${currentUser.matricule || currentUser.username})`
                        : getRoleLabel(currentUser.role)}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white text-slate-900 border border-slate-200 rounded-2xl shadow-2xl overflow-hidden z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
                    <div className="p-3.5 bg-[#17345B] text-white">
                      <div className="font-bold text-sm truncate">{currentUser.name}</div>
                      <div className="text-[11px] text-blue-200 truncate">{currentUser.email}</div>
                      <div className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/15 text-[10px] font-bold text-white">
                        <span>{getRoleLabel(currentUser.role)}</span>
                        {currentUser.matricule && <span>• {currentUser.matricule}</span>}
                      </div>
                    </div>

                    <div className="p-1.5 space-y-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          if (onOpenUserProfile) onOpenUserProfile();
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 flex items-center gap-2.5 font-semibold text-slate-800 cursor-pointer"
                      >
                        <UserIcon className="w-4 h-4 text-[#2F6FED]" />
                        <div>
                          <span className="block font-bold">Ma fiche profil</span>
                          <span className="text-[10px] text-slate-500">Identité, coordonnées et métier</span>
                        </div>
                      </button>

                      {canRoleAccessTab(currentUser.role, 'SETTINGS', currentUser.customPermissions, customRoles) && (
                        <button
                          type="button"
                          onClick={() => handleNavigate('SETTINGS')}
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 flex items-center gap-2.5 font-semibold text-slate-800 cursor-pointer"
                        >
                          <Settings className="w-4 h-4 text-[#17345B]" />
                          <div>
                            <span className="block font-bold">Préférences & paramètres</span>
                            <span className="text-[10px] text-slate-500">Affichage, planning, notifications</span>
                          </div>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          setIsGlobalSearchModalOpen(true);
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 flex items-center gap-2.5 font-semibold text-slate-800 cursor-pointer"
                      >
                        <HelpCircle className="w-4 h-4 text-[#1F8A83]" />
                        <div>
                          <span className="block font-bold">Recherche rapide & aide</span>
                          <span className="text-[10px] text-slate-500">Raccourci clavier : Ctrl+K</span>
                        </div>
                      </button>

                      {currentUser.role === 'ADMIN' && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            onOpenReceptionTests();
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 flex items-center gap-2.5 font-semibold text-slate-800 cursor-pointer"
                        >
                          <ShieldCheck className="w-4 h-4 text-[#1F8A83]" />
                          <div>
                            <span className="block font-bold">Contrôles & diagnostic</span>
                            <span className="text-[10px] text-slate-500">Matrice qualité & sécurité RBAC</span>
                          </div>
                        </button>
                      )}
                    </div>

                    <div className="p-1.5 border-t border-slate-100 bg-slate-50">
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          logout();
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-red-50 text-red-700 flex items-center gap-2.5 font-bold cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Se déconnecter</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Single-line Horizontal Scrollable Role Switcher for Mobile & Tablet (< xl) — strictly visible for authenticated Admin sessions */}
        {isRealAdminSession && (
          <div className="flex xl:hidden items-center gap-1.5 overflow-x-auto no-scrollbar py-1 px-2 bg-[#102542] rounded-xl border border-white/15 whitespace-nowrap">
            <span className="text-[10px] uppercase font-bold text-[#D58A18] flex items-center gap-1 shrink-0 pr-1">
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
                      ? 'bg-[#2F6FED] text-white shadow-xs'
                      : 'text-slate-200 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Main Navigation Bar: Only visible when menuLayout is 'horizontal' — Grouped into the 7 sections */}
      {!isAndroidView && appSettings.menuLayout === 'horizontal' && (
        <nav className="max-w-7xl mx-auto px-3 sm:px-6 py-2 flex items-center justify-between gap-1 overflow-x-auto no-scrollbar text-xs font-bold relative">
          <div className="flex items-center gap-1.5 flex-nowrap lg:flex-wrap">
            {/* 1. Tableau de bord */}
            <button
              type="button"
              onClick={() => handleNavigate('HOME')}
              className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                currentTab === 'HOME'
                  ? 'bg-[#2F6FED] text-white shadow-xs'
                  : 'text-slate-200 hover:text-white hover:bg-white/10'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>Tableau de bord</span>
            </button>

            {/* 2. Planning & salles */}
            {canRoleAccessTab(currentUser?.role, 'TIMETABLE') && (
              <button
                type="button"
                onClick={() => handleNavigate('TIMETABLE')}
                className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                  ['TIMETABLE', 'ROOMS', 'VOLUMES'].includes(currentTab)
                    ? 'bg-[#2F6FED] text-white shadow-xs'
                    : 'text-slate-200 hover:text-white hover:bg-white/10'
                }`}
              >
                <Calendar className="w-4 h-4 text-blue-300" />
                <span>Planning & salles</span>
              </button>
            )}

            {/* 3. Gestion académique */}
            {(canRoleAccessTab(currentUser?.role, 'STUDENTS') ||
              canRoleAccessTab(currentUser?.role, 'TEACHERS') ||
              canRoleAccessTab(currentUser?.role, 'LMD_MAQUETTES')) && (
              <button
                type="button"
                onClick={() =>
                  handleNavigate(
                    canRoleAccessTab(currentUser?.role, 'STUDENTS')
                      ? 'STUDENTS'
                      : canRoleAccessTab(currentUser?.role, 'TEACHERS')
                      ? 'TEACHERS'
                      : 'LMD_MAQUETTES'
                  )
                }
                className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                  ['STUDENTS', 'TEACHERS', 'LMD_MAQUETTES', 'DATA_MANAGEMENT'].includes(currentTab)
                    ? 'bg-[#2F6FED] text-white shadow-xs'
                    : 'text-slate-200 hover:text-white hover:bg-white/10'
                }`}
              >
                <GraduationCap className="w-4 h-4 text-blue-300" />
                <span>Gestion académique</span>
              </button>
            )}

            {/* 4. Scolarité */}
            {(canRoleAccessTab(currentUser?.role, 'GRADES') ||
              canRoleAccessTab(currentUser?.role, 'QR_ATTENDANCE') ||
              canRoleAccessTab(currentUser?.role, 'HOMEWORK_RESOURCES')) && (
              <button
                type="button"
                onClick={() => handleNavigate('GRADES')}
                className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                  ['GRADES', 'QR_ATTENDANCE', 'HOMEWORK_RESOURCES', 'EXPORT_STUDENTS'].includes(currentTab)
                    ? 'bg-[#2F6FED] text-white shadow-xs'
                    : 'text-slate-200 hover:text-white hover:bg-white/10'
                }`}
              >
                <Award className="w-4 h-4 text-amber-300" />
                <span>Scolarité</span>
              </button>
            )}

            {/* 5. Finances */}
            {canRoleAccessTab(currentUser?.role, 'FINANCIAL') && (
              <button
                type="button"
                onClick={() => handleNavigate('FINANCIAL')}
                className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                  currentTab === 'FINANCIAL'
                    ? 'bg-[#1F8A83] text-white shadow-xs'
                    : 'text-slate-200 hover:text-white hover:bg-white/10'
                }`}
              >
                <Banknote className="w-4 h-4 text-emerald-300" />
                <span>Finances</span>
              </button>
            )}

            {/* 6. Communication */}
            {(canRoleAccessTab(currentUser?.role, 'COMMUNICATION', currentUser?.customPermissions, customRoles) ||
              canRoleAccessTab(currentUser?.role, 'PARENT_PORTAL', currentUser?.customPermissions, customRoles)) && (
              <button
                type="button"
                onClick={() =>
                  handleNavigate(
                    canRoleAccessTab(currentUser?.role, 'COMMUNICATION', currentUser?.customPermissions, customRoles)
                      ? 'COMMUNICATION'
                      : 'PARENT_PORTAL'
                  )
                }
                className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                  ['COMMUNICATION', 'PARENT_PORTAL'].includes(currentTab)
                    ? 'bg-[#2F6FED] text-white shadow-xs'
                    : 'text-slate-200 hover:text-white hover:bg-white/10'
                }`}
              >
                <MessageSquare className="w-4 h-4 text-blue-300" />
                <span>Communication</span>
              </button>
            )}

            {/* 7. Administration */}
            {isStaffOrAdmin && (
              <button
                type="button"
                onClick={() =>
                  handleNavigate(
                    canRoleAccessTab(currentUser?.role, 'USERS_MANAGEMENT') ? 'USERS_MANAGEMENT' : 'SETTINGS'
                  )
                }
                className={`px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer border ${
                  ['USERS_MANAGEMENT', 'ACADEMIC_YEARS', 'SETTINGS', 'BACKUP_SECURITY', 'AUDIT'].includes(currentTab)
                    ? 'bg-[#2F6FED] text-white border-blue-300 shadow-xs'
                    : 'text-blue-200 hover:text-white hover:bg-white/10 border-white/15'
                }`}
              >
                <Shield className="w-4 h-4 text-blue-200" />
                <span>Administration</span>
              </button>
            )}
          </div>
        </nav>
      )}

      {/* Global Search Modal (Mobile & Ctrl+K) */}
      {isGlobalSearchModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-start justify-center p-4 pt-16">
          <div className="bg-[#17345B] border border-white/20 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden text-white">
            <div className="p-3 border-b border-white/15 flex items-center gap-2 bg-[#102542]">
              <Search className="w-4 h-4 text-blue-300 shrink-0" />
              <input
                type="text"
                autoFocus
                placeholder="Rechercher un étudiant, un enseignant, une salle, un cours..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-white placeholder-slate-300 text-xs outline-none"
              />
              <button
                type="button"
                onClick={() => setIsGlobalSearchModalOpen(false)}
                className="text-slate-300 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto p-2 space-y-1">
              {!searchQuery.trim() ? (
                <div className="p-4 text-center text-slate-200 text-xs">
                  Tapez un nom d'étudiant, un matricule, un nom d'enseignant, une salle ou un cours.
                </div>
              ) : globalSearchResults.length === 0 ? (
                <div className="p-4 text-center text-slate-200 text-xs">
                  Aucun résultat pour « {searchQuery} ».
                </div>
              ) : (
                globalSearchResults.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavigate(item.targetTab, `${item.category} : ${item.title}`)}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-[#2F6FED] transition-colors flex items-center justify-between gap-2 cursor-pointer group"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-white truncate">{item.title}</div>
                      <div className="text-[11px] text-slate-300 group-hover:text-blue-100 truncate">
                        {item.subtitle}
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-blue-200 group-hover:text-white shrink-0">
                      {item.category}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
