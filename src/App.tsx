import React, { useState, Suspense, lazy, useEffect, useRef } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { LoginPage } from './components/LoginPage';
import { HomePage } from './components/HomePage';
import { Sidebar } from './components/Sidebar';
import { SessionModal } from './components/SessionModal';
import { NotificationCenter } from './components/NotificationCenter';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { AndroidPushBanner } from './components/AndroidPushBanner';
import { UserProfileModal } from './components/UserProfileModal';
import { ToastAndConfirmCenter } from './components/ToastAndConfirmCenter';
import { useBrowserNotifications } from './hooks/usePWAInstall';
import { canRoleAccessTab } from './utils/rbacPermissions';
import { TimetableSession } from './types';
import {
  Smartphone,
  Monitor,
  ShieldCheck,
  Lock,
  Database,
  Home,
  Calendar,
  Award,
  Banknote,
  QrCode,
  Menu,
  Users,
  RefreshCw,
  ChevronRight,
  User as UserIcon,
} from 'lucide-react';

// Code-splitting by screen for faster initial load on mobile connections
const UserManagement = lazy(() =>
  import('./components/UserManagement').then((m) => ({ default: m.UserManagement }))
);
const TimetableGrid = lazy(() =>
  import('./components/TimetableGrid').then((m) => ({ default: m.TimetableGrid }))
);
const RoomCalendarView = lazy(() =>
  import('./components/RoomCalendarView').then((m) => ({ default: m.RoomCalendarView }))
);
const CourseVolumeTracker = lazy(() =>
  import('./components/CourseVolumeTracker').then((m) => ({ default: m.CourseVolumeTracker }))
);
const TeacherManagement = lazy(() =>
  import('./components/TeacherManagement').then((m) => ({ default: m.TeacherManagement }))
);
const StudentManagement = lazy(() =>
  import('./components/StudentManagement').then((m) => ({ default: m.StudentManagement }))
);
const AuditLogView = lazy(() =>
  import('./components/AuditLogView').then((m) => ({ default: m.AuditLogView }))
);
const DataManagementHub = lazy(() =>
  import('./components/DataManagementHub').then((m) => ({ default: m.DataManagementHub }))
);
const LmdMaquetteView = lazy(() =>
  import('./components/LmdMaquetteView').then((m) => ({ default: m.LmdMaquetteView }))
);
const GradesView = lazy(() =>
  import('./components/GradesView').then((m) => ({ default: m.GradesView }))
);
const QrAttendanceView = lazy(() =>
  import('./components/QrAttendanceView').then((m) => ({ default: m.QrAttendanceView }))
);
const FinancialManagementView = lazy(() =>
  import('./components/FinancialManagementView').then((m) => ({ default: m.FinancialManagementView }))
);
const CommunicationHub = lazy(() =>
  import('./components/CommunicationHub').then((m) => ({ default: m.CommunicationHub }))
);
const HomeworkAndResourcesView = lazy(() =>
  import('./components/HomeworkAndResourcesView').then((m) => ({ default: m.HomeworkAndResourcesView }))
);
const StudentExportModal = lazy(() =>
  import('./components/StudentExportModal').then((m) => ({ default: m.StudentExportModal }))
);
const AcademicYearManagement = lazy(() =>
  import('./components/AcademicYearManagement').then((m) => ({ default: m.AcademicYearManagement }))
);
const AppSettingsView = lazy(() =>
  import('./components/AppSettingsView').then((m) => ({ default: m.AppSettingsView }))
);
const MessengerLiveChat = lazy(() =>
  import('./components/MessengerLiveChat').then((m) => ({ default: m.MessengerLiveChat }))
);
const BackupAndSecurityView = lazy(() =>
  import('./components/BackupAndSecurityView').then((m) => ({ default: m.BackupAndSecurityView }))
);
const ParentPortalView = lazy(() =>
  import('./components/ParentPortalView').then((m) => ({ default: m.ParentPortalView }))
);
const CoursePortalView = lazy(() =>
  import('./components/CoursePortalView').then((m) => ({ default: m.CoursePortalView }))
);
const AndroidSimulator = lazy(() =>
  import('./components/AndroidSimulator').then((m) => ({ default: m.AndroidSimulator }))
);
const ReceptionTestsModal = lazy(() =>
  import('./components/ReceptionTestsModal').then((m) => ({ default: m.ReceptionTestsModal }))
);

const ScreenLoadingFallback: React.FC = () => (
  <div className="bg-white rounded-2xl border border-slate-200 p-8 flex items-center justify-center gap-3 text-slate-600 text-xs font-bold my-4">
    <RefreshCw className="w-4 h-4 text-[#2F6FED] animate-spin" />
    <span>Chargement du module…</span>
  </div>
);

// Breadcrumb metadata mapping each screen to its parent section & sibling tabs (Refonte UX/UI — Section 2, Page 3)
const BREADCRUMB_MAP: Record<
  string,
  {
    section: string;
    sectionDefaultTab: string;
    title: string;
    siblings?: { id: string; label: string }[];
  }
> = {
  HOME: {
    section: 'Tableau de bord',
    sectionDefaultTab: 'HOME',
    title: "Vue d'ensemble & activités du jour",
  },
  TIMETABLE: {
    section: 'Planning & salles',
    sectionDefaultTab: 'TIMETABLE',
    title: 'Emplois du temps',
    siblings: [
      { id: 'TIMETABLE', label: 'Emplois du temps' },
      { id: 'MY_COURSES', label: 'Portail des cours' },
      { id: 'ROOMS', label: 'Salles & disponibilités' },
      { id: 'VOLUMES', label: 'Volumes horaires' },
    ],
  },
  MY_COURSES: {
    section: 'Planning & salles',
    sectionDefaultTab: 'TIMETABLE',
    title: 'Portail des cours & parcours',
    siblings: [
      { id: 'TIMETABLE', label: 'Emplois du temps' },
      { id: 'MY_COURSES', label: 'Portail des cours' },
      { id: 'ROOMS', label: 'Salles & disponibilités' },
      { id: 'VOLUMES', label: 'Volumes horaires' },
    ],
  },
  ROOMS: {
    section: 'Planning & salles',
    sectionDefaultTab: 'TIMETABLE',
    title: 'Salles & disponibilités',
    siblings: [
      { id: 'TIMETABLE', label: 'Emplois du temps' },
      { id: 'ROOMS', label: 'Salles & disponibilités' },
      { id: 'VOLUMES', label: 'Volumes horaires' },
    ],
  },
  VOLUMES: {
    section: 'Planning & salles',
    sectionDefaultTab: 'TIMETABLE',
    title: 'Suivi des volumes horaires',
    siblings: [
      { id: 'TIMETABLE', label: 'Emplois du temps' },
      { id: 'ROOMS', label: 'Salles & disponibilités' },
      { id: 'VOLUMES', label: 'Volumes horaires' },
    ],
  },
  STUDENTS: {
    section: 'Gestion académique',
    sectionDefaultTab: 'STUDENTS',
    title: 'Étudiants',
    siblings: [
      { id: 'STUDENTS', label: 'Étudiants' },
      { id: 'TEACHERS', label: 'Enseignants' },
      { id: 'LMD_MAQUETTES', label: 'Filières & maquettes LMD' },
      { id: 'DATA_MANAGEMENT', label: 'Groupes & cours' },
    ],
  },
  TEACHERS: {
    section: 'Gestion académique',
    sectionDefaultTab: 'STUDENTS',
    title: 'Enseignants',
    siblings: [
      { id: 'STUDENTS', label: 'Étudiants' },
      { id: 'TEACHERS', label: 'Enseignants' },
      { id: 'LMD_MAQUETTES', label: 'Filières & maquettes LMD' },
      { id: 'DATA_MANAGEMENT', label: 'Groupes & cours' },
    ],
  },
  LMD_MAQUETTES: {
    section: 'Gestion académique',
    sectionDefaultTab: 'STUDENTS',
    title: 'Filières, parcours & maquettes LMD',
    siblings: [
      { id: 'STUDENTS', label: 'Étudiants' },
      { id: 'TEACHERS', label: 'Enseignants' },
      { id: 'LMD_MAQUETTES', label: 'Filières & maquettes LMD' },
      { id: 'DATA_MANAGEMENT', label: 'Groupes & cours' },
    ],
  },
  DATA_MANAGEMENT: {
    section: 'Gestion académique',
    sectionDefaultTab: 'STUDENTS',
    title: 'Groupes, cours & référentiel',
    siblings: [
      { id: 'STUDENTS', label: 'Étudiants' },
      { id: 'TEACHERS', label: 'Enseignants' },
      { id: 'LMD_MAQUETTES', label: 'Filières & maquettes LMD' },
      { id: 'DATA_MANAGEMENT', label: 'Groupes & cours' },
    ],
  },
  QR_ATTENDANCE: {
    section: 'Scolarité',
    sectionDefaultTab: 'GRADES',
    title: 'Présences & appel QR code',
    siblings: [
      { id: 'QR_ATTENDANCE', label: 'Présences & appel QR' },
      { id: 'GRADES', label: 'Notes & évaluations' },
      { id: 'HOMEWORK_RESOURCES', label: 'Devoirs & documents' },
      { id: 'EXPORT_STUDENTS', label: 'Exports listes' },
    ],
  },
  GRADES: {
    section: 'Scolarité',
    sectionDefaultTab: 'GRADES',
    title: 'Notes, évaluations & délibérations',
    siblings: [
      { id: 'QR_ATTENDANCE', label: 'Présences & appel QR' },
      { id: 'GRADES', label: 'Notes & évaluations' },
      { id: 'HOMEWORK_RESOURCES', label: 'Devoirs & documents' },
      { id: 'EXPORT_STUDENTS', label: 'Exports listes' },
    ],
  },
  HOMEWORK_RESOURCES: {
    section: 'Scolarité',
    sectionDefaultTab: 'GRADES',
    title: 'Devoirs & documents académiques',
    siblings: [
      { id: 'QR_ATTENDANCE', label: 'Présences & appel QR' },
      { id: 'GRADES', label: 'Notes & évaluations' },
      { id: 'HOMEWORK_RESOURCES', label: 'Devoirs & documents' },
      { id: 'EXPORT_STUDENTS', label: 'Exports listes' },
    ],
  },
  EXPORT_STUDENTS: {
    section: 'Scolarité',
    sectionDefaultTab: 'GRADES',
    title: 'Listes & exports officiels',
    siblings: [
      { id: 'QR_ATTENDANCE', label: 'Présences & appel QR' },
      { id: 'GRADES', label: 'Notes & évaluations' },
      { id: 'HOMEWORK_RESOURCES', label: 'Devoirs & documents' },
      { id: 'EXPORT_STUDENTS', label: 'Exports listes' },
    ],
  },
  FINANCIAL: {
    section: 'Finances',
    sectionDefaultTab: 'FINANCIAL',
    title: 'Paiements, impayés, reçus & états financiers',
  },
  COMMUNICATION: {
    section: 'Communication',
    sectionDefaultTab: 'COMMUNICATION',
    title: 'Annonces, messagerie & rappels',
    siblings: [
      { id: 'COMMUNICATION', label: 'Annonces & messagerie' },
      { id: 'PARENT_PORTAL', label: 'Portail Parents / Tuteurs' },
    ],
  },
  PARENT_PORTAL: {
    section: 'Communication',
    sectionDefaultTab: 'COMMUNICATION',
    title: 'Portail Parents / Tuteurs',
    siblings: [
      { id: 'COMMUNICATION', label: 'Annonces & messagerie' },
      { id: 'PARENT_PORTAL', label: 'Portail Parents / Tuteurs' },
    ],
  },
  USERS_MANAGEMENT: {
    section: 'Administration',
    sectionDefaultTab: 'USERS_MANAGEMENT',
    title: 'Gestion des personnes & rôles',
    siblings: [
      { id: 'USERS_MANAGEMENT', label: 'Personnes & rôles' },
      { id: 'ACADEMIC_YEARS', label: 'Années universitaires' },
      { id: 'SETTINGS', label: 'Paramètres' },
      { id: 'BACKUP_SECURITY', label: 'Sauvegardes & sécurité' },
      { id: 'AUDIT', label: "Journal d'audit" },
    ],
  },
  ACADEMIC_YEARS: {
    section: 'Administration',
    sectionDefaultTab: 'USERS_MANAGEMENT',
    title: 'Années universitaires & périodes',
    siblings: [
      { id: 'USERS_MANAGEMENT', label: 'Personnes & rôles' },
      { id: 'ACADEMIC_YEARS', label: 'Années universitaires' },
      { id: 'SETTINGS', label: 'Paramètres' },
      { id: 'BACKUP_SECURITY', label: 'Sauvegardes & sécurité' },
      { id: 'AUDIT', label: "Journal d'audit" },
    ],
  },
  SETTINGS: {
    section: 'Administration',
    sectionDefaultTab: 'USERS_MANAGEMENT',
    title: 'Paramètres & configuration',
    siblings: [
      { id: 'USERS_MANAGEMENT', label: 'Personnes & rôles' },
      { id: 'ACADEMIC_YEARS', label: 'Années universitaires' },
      { id: 'SETTINGS', label: 'Paramètres' },
      { id: 'BACKUP_SECURITY', label: 'Sauvegardes & sécurité' },
      { id: 'AUDIT', label: "Journal d'audit" },
    ],
  },
  BACKUP_SECURITY: {
    section: 'Administration',
    sectionDefaultTab: 'USERS_MANAGEMENT',
    title: 'Sauvegardes, Cloud Firestore & sécurité RBAC',
    siblings: [
      { id: 'USERS_MANAGEMENT', label: 'Personnes & rôles' },
      { id: 'ACADEMIC_YEARS', label: 'Années universitaires' },
      { id: 'SETTINGS', label: 'Paramètres' },
      { id: 'BACKUP_SECURITY', label: 'Sauvegardes & sécurité' },
      { id: 'AUDIT', label: "Journal d'audit" },
    ],
  },
  AUDIT: {
    section: 'Administration',
    sectionDefaultTab: 'USERS_MANAGEMENT',
    title: "Journal d'audit immuable",
    siblings: [
      { id: 'USERS_MANAGEMENT', label: 'Personnes & rôles' },
      { id: 'ACADEMIC_YEARS', label: 'Années universitaires' },
      { id: 'SETTINGS', label: 'Paramètres' },
      { id: 'BACKUP_SECURITY', label: 'Sauvegardes & sécurité' },
      { id: 'AUDIT', label: "Journal d'audit" },
    ],
  },
};

const AppContent: React.FC = () => {
  const { isAndroidView, toggleAndroidView, currentUser, isAuthenticated, appSettings, customRoles, notifications } =
    useApp();
  const { sendBrowserNotification } = useBrowserNotifications();
  const lastSeenNotifIdRef = useRef<string | null>(notifications[0]?.id || null);

  const [currentTab, setCurrentTab] = useState<string>('HOME');
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isReceptionTestsOpen, setIsReceptionTestsOpen] = useState(false);
  const [isUserProfileOpen, setIsUserProfileOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Trigger real PWA Web Notification when a new notification arrives for currentUser
  useEffect(() => {
    const latest = notifications[0];
    if (!latest || latest.id === lastSeenNotifIdRef.current) return;
    lastSeenNotifIdRef.current = latest.id;
    const isForUser =
      !latest.recipientId ||
      latest.recipientId === currentUser?.id ||
      latest.recipientRole === currentUser?.role;
    if (isAuthenticated && isForUser) {
      sendBrowserNotification(latest.title, latest.message);
    }
  }, [notifications, isAuthenticated, currentUser, sendBrowserNotification]);

  // Session Modal State
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [sessionModalMode, setSessionModalMode] = useState<'CREATE' | 'EDIT' | 'RESCHEDULE' | 'CANCEL'>('CREATE');
  const [selectedSessionToEdit, setSelectedSessionToEdit] = useState<TimetableSession | null>(null);

  const handleOpenCreate = () => {
    setSelectedSessionToEdit(null);
    setSessionModalMode('CREATE');
    setIsSessionModalOpen(true);
  };

  const handleOpenEdit = (session: TimetableSession) => {
    setSelectedSessionToEdit(session);
    setSessionModalMode('EDIT');
    setIsSessionModalOpen(true);
  };

  const handleOpenReschedule = (session: TimetableSession) => {
    setSelectedSessionToEdit(session);
    setSessionModalMode('RESCHEDULE');
    setIsSessionModalOpen(true);
  };

  const handleOpenCancel = (session: TimetableSession) => {
    setSelectedSessionToEdit(session);
    setSessionModalMode('CANCEL');
    setIsSessionModalOpen(true);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#17345B]">
        <ToastAndConfirmCenter />
        <AndroidPushBanner />
        {isAndroidView ? (
          <div className="p-4 flex flex-col items-center">
            <div className="mb-4 flex items-center justify-between w-full max-w-sm">
              <span className="text-xs text-slate-200 font-bold">Mode Mobile / PWA EBM</span>
              <button
                onClick={toggleAndroidView}
                className="text-xs bg-[#102542] text-slate-200 px-3 py-1.5 rounded-lg border border-white/15"
              >
                Retour Page Login Web
              </button>
            </div>
            <Suspense fallback={<ScreenLoadingFallback />}>
              <AndroidSimulator />
            </Suspense>
          </div>
        ) : (
          <LoginPage />
        )}
      </div>
    );
  }

  const isVertical = !isAndroidView && appSettings.menuLayout === 'vertical';
  const hasTabAccess = canRoleAccessTab(currentUser?.role, currentTab, currentUser?.customPermissions, customRoles);
  const breadcrumbInfo = BREADCRUMB_MAP[currentTab] || {
    section: 'Navigation',
    sectionDefaultTab: 'HOME',
    title: currentTab,
  };
  const visibleSiblings = (breadcrumbInfo.siblings || []).filter((s) =>
    canRoleAccessTab(currentUser?.role, s.id, currentUser?.customPermissions, customRoles)
  );

  return (
    <div
      className={`min-h-screen bg-[#F5F7FA] text-slate-900 flex flex-col ${
        isVertical ? 'lg:flex-row' : ''
      } font-sans relative pb-16 lg:pb-0`}
    >
      {/* Global Discrete Toasts & Clean Undoable Confirmations */}
      <ToastAndConfirmCenter />

      {/* Top Notification Toast */}
      <AndroidPushBanner />

      {/* Mandatory first-login password change for default accounts */}
      <ChangePasswordModal />

      {/* Responsive Sidebar Navigation */}
      {!isAndroidView && (
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => setCurrentTab(tab)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          onOpenReceptionTests={() => setIsReceptionTestsOpen(true)}
          onOpenUserProfile={() => setIsUserProfileOpen(true)}
        />
      )}

      {/* Content Area */}
      <div className="flex-1 flex flex-col min-w-0 w-full">
        <Header
          currentTab={currentTab}
          onSelectTab={(tab) => setCurrentTab(tab)}
          onOpenNotifications={() => setIsNotifOpen(true)}
          onOpenReceptionTests={() => setIsReceptionTestsOpen(true)}
          onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onOpenUserProfile={() => setIsUserProfileOpen(true)}
        />

        {/* Contextual Breadcrumb Bar (Fil d'Ariane — Section 2, Page 3) */}
        {!isAndroidView && currentTab !== 'HOME' && (
          <div className="bg-white border-b border-slate-200/90 px-3 sm:px-6 py-2">
            <div
              className={`mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
                appSettings.compactMode ? 'max-w-full' : 'max-w-7xl'
              }`}
            >
              {/* Breadcrumb Trail */}
              <div className="flex items-center gap-1.5 text-slate-500 flex-wrap">
                <button
                  type="button"
                  onClick={() => setCurrentTab('HOME')}
                  className="hover:text-[#2F6FED] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Home className="w-3.5 h-3.5 text-[#17345B]" />
                  <span>Tableau de bord</span>
                </button>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <button
                  type="button"
                  onClick={() => setCurrentTab(breadcrumbInfo.sectionDefaultTab)}
                  className="hover:text-[#2F6FED] font-semibold text-slate-600 cursor-pointer transition-colors"
                >
                  {breadcrumbInfo.section}
                </button>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="font-bold text-[#17345B]">{breadcrumbInfo.title}</span>
              </div>

              {/* Contextual Sub-Navigation within the active section */}
              {visibleSiblings.length > 1 && (
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                  {visibleSiblings.map((sib) => {
                    const isSibActive = sib.id === currentTab;
                    return (
                      <button
                        key={sib.id}
                        type="button"
                        onClick={() => setCurrentTab(sib.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap cursor-pointer ${
                          isSibActive
                            ? 'bg-[#17345B] text-white shadow-2xs'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        {sib.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Body */}
        <main
          className={`flex-1 w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 ${
            appSettings.compactMode ? 'max-w-full' : 'max-w-7xl'
          }`}
        >
          {isAndroidView ? (
            <div className="space-y-4">
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-950">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500 text-slate-950 rounded-xl font-black">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">Aperçu Mobile & Application PWA Hors-Ligne EBM</h3>
                    <p className="text-slate-600">
                      Connecté avec le compte <strong>{currentUser?.name}</strong> ({currentUser?.role}). Vous pouvez
                      installer directement l'application PWA depuis la barre supérieure pour recevoir de vraies
                      notifications système et consulter votre emploi du temps hors ligne.
                    </p>
                  </div>
                </div>
                <button
                  onClick={toggleAndroidView}
                  className="px-3.5 py-1.5 bg-[#17345B] text-white font-bold rounded-xl text-xs hover:bg-[#102542] transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Monitor className="w-3.5 h-3.5" />
                  Retour au Portail Web
                </button>
              </div>

              <Suspense fallback={<ScreenLoadingFallback />}>
                <AndroidSimulator />
              </Suspense>
            </div>
          ) : !hasTabAccess ? (
            <div className="bg-white rounded-3xl p-8 border border-rose-200 shadow-sm text-center space-y-3 max-w-lg mx-auto my-8">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-base font-black text-slate-900">Accès Restreint par Contrôle RBAC (ACC-041)</h3>
              <p className="text-xs text-slate-600">
                Votre profil actuel (<strong>{currentUser?.name}</strong> — Rôle :{' '}
                <strong>{currentUser?.role}</strong>) ne dispose pas des autorisations requises pour consulter ce
                module.
              </p>
              <button
                onClick={() => setCurrentTab('HOME')}
                className="px-4 py-2 bg-[#17345B] text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Retour au Tableau de Bord
              </button>
            </div>
          ) : (
            <Suspense fallback={<ScreenLoadingFallback />}>
              <div>
                {currentTab === 'HOME' && (
                  <HomePage
                    onNavigateTab={(tab) => setCurrentTab(tab)}
                    onOpenNotifications={() => setIsNotifOpen(true)}
                    onOpenReceptionTests={() => setIsReceptionTestsOpen(true)}
                    onOpenUserProfile={() => setIsUserProfileOpen(true)}
                  />
                )}

                {currentTab === 'ACADEMIC_YEARS' && <AcademicYearManagement />}

                {currentTab === 'SETTINGS' && (
                  <AppSettingsView
                    onOpenReceptionTests={() => setIsReceptionTestsOpen(true)}
                    onNavigateTab={(tab) => setCurrentTab(tab)}
                  />
                )}

                {currentTab === 'LMD_MAQUETTES' && <LmdMaquetteView />}

                {currentTab === 'GRADES' && <GradesView />}

                {currentTab === 'QR_ATTENDANCE' && <QrAttendanceView />}

                {currentTab === 'FINANCIAL' && <FinancialManagementView />}

                {currentTab === 'COMMUNICATION' && <CommunicationHub />}

                {currentTab === 'HOMEWORK_RESOURCES' && <HomeworkAndResourcesView />}

                {currentTab === 'PARENT_PORTAL' && <ParentPortalView />}

                {currentTab === 'EXPORT_STUDENTS' && (
                  <StudentExportModal isOpen={true} onClose={() => setCurrentTab('HOME')} />
                )}

                {currentTab === 'USERS_MANAGEMENT' && <UserManagement />}

                {currentTab === 'DATA_MANAGEMENT' && <DataManagementHub />}

                {currentTab === 'TIMETABLE' && (
                  <TimetableGrid
                    onOpenCreateModal={handleOpenCreate}
                    onOpenEditModal={handleOpenEdit}
                    onOpenRescheduleModal={handleOpenReschedule}
                    onOpenCancelModal={handleOpenCancel}
                  />
                )}

                {currentTab === 'MY_COURSES' && <CoursePortalView />}

                {currentTab === 'ROOMS' && (
                  <RoomCalendarView onNavigateToCreate={() => setCurrentTab('DATA_MANAGEMENT')} />
                )}

                {currentTab === 'VOLUMES' && (
                  <CourseVolumeTracker onNavigateToCreate={() => setCurrentTab('DATA_MANAGEMENT')} />
                )}

                {currentTab === 'TEACHERS' && (
                  <TeacherManagement onNavigateToCreate={() => setCurrentTab('DATA_MANAGEMENT')} />
                )}

                {(currentTab === 'STUDENTS' || currentTab === 'STUDENTS_OVERVIEW') && (
                  <StudentManagement onNavigateToCreate={() => setCurrentTab('DATA_MANAGEMENT')} />
                )}

                {currentTab === 'AUDIT' && <AuditLogView />}

                {currentTab === 'BACKUP_SECURITY' && <BackupAndSecurityView />}
              </div>
            </Suspense>
          )}
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-slate-200 py-4 text-xs text-slate-500 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-1.5">
              <span className="font-bold text-[#17345B]">EBM Institute Business School</span>
              <span>· Portail Académique & Administratif Intégré</span>
            </div>

            <div className="flex items-center justify-center gap-3 sm:gap-4 text-slate-600 flex-wrap">
              <button
                onClick={() => setCurrentTab('HOME')}
                className="hover:text-[#2F6FED] font-semibold cursor-pointer"
              >
                Tableau de bord
              </button>
              <button
                onClick={() => setIsUserProfileOpen(true)}
                className="hover:text-[#2F6FED] font-semibold flex items-center gap-1 cursor-pointer"
              >
                <UserIcon className="w-3.5 h-3.5 text-[#2F6FED]" />
                Ma fiche profil
              </button>
              <button
                onClick={() => setCurrentTab('BACKUP_SECURITY')}
                className="hover:text-[#2F6FED] font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Database className="w-3.5 h-3.5 text-[#1F8A83]" />
                Sauvegardes & Cloud
              </button>
              <button
                onClick={() => setCurrentTab('SETTINGS')}
                className="hover:text-[#2F6FED] font-semibold cursor-pointer"
              >
                Paramètres
              </button>
              {currentUser?.role === 'ADMIN' && (
                <button
                  onClick={() => setIsReceptionTestsOpen(true)}
                  className="hover:text-[#2F6FED] font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-[#1F8A83]" />
                  Contrôle Qualité
                </button>
              )}
            </div>
          </div>
        </footer>
      </div>

      {/* Mobile Bottom Navigation Bar (< lg) */}
      {!isAndroidView && (
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-[#17345B]/95 backdrop-blur-md border-t border-white/15 text-white px-2 py-1.5 grid grid-cols-5 gap-1 shadow-2xl">
          <button
            type="button"
            onClick={() => setCurrentTab('HOME')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl text-[10px] font-bold transition-colors cursor-pointer ${
              currentTab === 'HOME' ? 'text-white bg-[#2F6FED]' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Home className="w-4 h-4 mb-0.5" />
            <span className="truncate">Accueil</span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentTab('TIMETABLE')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl text-[10px] font-bold transition-colors cursor-pointer ${
              currentTab === 'TIMETABLE' ? 'text-white bg-[#2F6FED]' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Calendar className="w-4 h-4 mb-0.5" />
            <span className="truncate">Planning</span>
          </button>

          {currentUser?.role === 'PARENT' ? (
            <button
              type="button"
              onClick={() => setCurrentTab('PARENT_PORTAL')}
              className={`flex flex-col items-center justify-center py-1 rounded-xl text-[10px] font-bold transition-colors cursor-pointer ${
                currentTab === 'PARENT_PORTAL' ? 'text-white bg-[#2F6FED]' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4 mb-0.5" />
              <span className="truncate">Famille</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCurrentTab('GRADES')}
              className={`flex flex-col items-center justify-center py-1 rounded-xl text-[10px] font-bold transition-colors cursor-pointer ${
                currentTab === 'GRADES' ? 'text-white bg-[#2F6FED]' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Award className="w-4 h-4 mb-0.5" />
              <span className="truncate">Notes</span>
            </button>
          )}

          {canRoleAccessTab(currentUser?.role, 'FINANCIAL', currentUser?.customPermissions, customRoles) ? (
            <button
              type="button"
              onClick={() => setCurrentTab('FINANCIAL')}
              className={`flex flex-col items-center justify-center py-1 rounded-xl text-[10px] font-bold transition-colors cursor-pointer ${
                currentTab === 'FINANCIAL' ? 'text-white bg-[#1F8A83]' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Banknote className="w-4 h-4 mb-0.5" />
              <span className="truncate">Finances</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCurrentTab('QR_ATTENDANCE')}
              className={`flex flex-col items-center justify-center py-1 rounded-xl text-[10px] font-bold transition-colors cursor-pointer ${
                currentTab === 'QR_ATTENDANCE' ? 'text-white bg-[#1F8A83]' : 'text-slate-300 hover:text-white'
              }`}
            >
              <QrCode className="w-4 h-4 mb-0.5" />
              <span className="truncate">Présence</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="flex flex-col items-center justify-center py-1 rounded-xl text-[10px] font-bold text-slate-200 hover:text-white transition-colors cursor-pointer"
          >
            <Menu className="w-4 h-4 mb-0.5 text-blue-300" />
            <span className="truncate">Menu</span>
          </button>
        </nav>
      )}

      {/* Floating Messenger Live Chat Dock */}
      <Suspense fallback={null}>
        <MessengerLiveChat />
      </Suspense>

      {/* Session Modal */}
      <SessionModal
        isOpen={isSessionModalOpen}
        onClose={() => setIsSessionModalOpen(false)}
        sessionToEdit={selectedSessionToEdit}
        mode={sessionModalMode}
      />

      {/* Notifications Drawer / Modal */}
      <NotificationCenter isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />

      {/* User Profile Modal */}
      <UserProfileModal isOpen={isUserProfileOpen} onClose={() => setIsUserProfileOpen(false)} />

      {/* Reception Test Suite Modal */}
      {currentUser?.role === 'ADMIN' && isReceptionTestsOpen && (
        <Suspense fallback={null}>
          <ReceptionTestsModal
            isOpen={isReceptionTestsOpen}
            onClose={() => setIsReceptionTestsOpen(false)}
            onNavigateTab={(tab) => setCurrentTab(tab)}
          />
        </Suspense>
      )}
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
