import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { LoginPage } from './components/LoginPage';
import { HomePage } from './components/HomePage';
import { UserManagement } from './components/UserManagement';
import { TimetableGrid } from './components/TimetableGrid';
import { RoomCalendarView } from './components/RoomCalendarView';
import { CourseVolumeTracker } from './components/CourseVolumeTracker';
import { TeacherManagement } from './components/TeacherManagement';
import { StudentManagement } from './components/StudentManagement';
import { AuditLogView } from './components/AuditLogView';
import { SessionModal } from './components/SessionModal';
import { NotificationCenter } from './components/NotificationCenter';
import { AndroidSimulator } from './components/AndroidSimulator';
import { ReceptionTestsModal } from './components/ReceptionTestsModal';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { AndroidPushBanner } from './components/AndroidPushBanner';
import { DataManagementHub } from './components/DataManagementHub';
import { LmdMaquetteView } from './components/LmdMaquetteView';
import { GradesView } from './components/GradesView';
import { QrAttendanceView } from './components/QrAttendanceView';
import { FinancialManagementView } from './components/FinancialManagementView';
import { CommunicationHub } from './components/CommunicationHub';
import { HomeworkAndResourcesView } from './components/HomeworkAndResourcesView';
import { StudentExportModal } from './components/StudentExportModal';
import { Sidebar } from './components/Sidebar';
import { AcademicYearManagement } from './components/AcademicYearManagement';
import { AppSettingsView } from './components/AppSettingsView';
import { MessengerLiveChat } from './components/MessengerLiveChat';
import { BackupAndSecurityView } from './components/BackupAndSecurityView';
import { ParentPortalView } from './components/ParentPortalView';
import { UserProfileModal } from './components/UserProfileModal';
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
} from 'lucide-react';

const AppContent: React.FC = () => {
  const { isAndroidView, toggleAndroidView, currentUser, isAuthenticated, appSettings, customRoles } = useApp();

  const [currentTab, setCurrentTab] = useState<string>('HOME');
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isReceptionTestsOpen, setIsReceptionTestsOpen] = useState(false);
  const [isUserProfileOpen, setIsUserProfileOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  // If user is not authenticated yet: show the Login Page (or Android Simulator if toggled)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900">
        <AndroidPushBanner />
        {isAndroidView ? (
          <div className="p-4 flex flex-col items-center">
            <div className="mb-4 flex items-center justify-between w-full max-w-sm">
              <span className="text-xs text-slate-300 font-bold">Simulateur Mobile Android</span>
              <button
                onClick={toggleAndroidView}
                className="text-xs bg-slate-800 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700"
              >
                Retour Page Login Web
              </button>
            </div>
            <AndroidSimulator />
          </div>
        ) : (
          <LoginPage />
        )}
      </div>
    );
  }

  const isVertical = !isAndroidView && appSettings.menuLayout === 'vertical';
  const hasTabAccess = canRoleAccessTab(currentUser?.role, currentTab, currentUser?.customPermissions, customRoles);

  return (
    <div
      className={`min-h-screen bg-slate-100 text-slate-900 flex flex-col ${
        isVertical ? 'lg:flex-row' : ''
      } font-sans relative pb-16 lg:pb-0`}
    >
      {/* Top Simulated Android Push Notification Toast */}
      <AndroidPushBanner />

      {/* Mandatory first-login password change for default birthdate accounts */}
      <ChangePasswordModal />

      {/* Responsive Sidebar Navigation (Slide-over Drawer on Mobile < lg, Sticky Sidebar on Desktop lg+ when vertical) */}
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
        {/* Central Header */}
        <Header
          currentTab={currentTab}
          onSelectTab={(tab) => setCurrentTab(tab)}
          onOpenNotifications={() => setIsNotifOpen(true)}
          onOpenReceptionTests={() => setIsReceptionTestsOpen(true)}
          onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onOpenUserProfile={() => setIsUserProfileOpen(true)}
        />

        {/* Main Body */}
        <main className={`flex-1 w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 ${appSettings.compactMode ? 'max-w-full' : 'max-w-7xl'}`}>
          
          {/* Conditional View: Android Smartphone View vs Web Portal View */}
          {isAndroidView ? (
            <div className="space-y-4">
              {/* Explanatory banner */}
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-950">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500 text-slate-950 rounded-xl font-black">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">
                      Simulateur Application Mobile Android EBM
                    </h3>
                    <p className="text-slate-600">
                      Connecté avec le compte <strong>{currentUser?.name}</strong> ({currentUser?.role}). 
                      Les notifications push, l'emploi du temps mobile et le mode hors-ligne sont synchronisés en direct.
                    </p>
                  </div>
                </div>
                <button
                  onClick={toggleAndroidView}
                  className="px-3.5 py-1.5 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-slate-800 transition-colors flex items-center gap-1.5"
                >
                  <Monitor className="w-3.5 h-3.5" />
                  Retour au Portail Web
                </button>
              </div>

              {/* Android Device Simulator */}
              <AndroidSimulator />
            </div>
          ) : !hasTabAccess ? (
            <div className="bg-white rounded-3xl p-8 border border-rose-200 shadow-sm text-center space-y-3 max-w-lg mx-auto my-8">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-base font-black text-slate-900">
                Accès Restreint par Contrôle RBAC (ACC-041)
              </h3>
              <p className="text-xs text-slate-600">
                Votre profil actuel (<strong>{currentUser?.name}</strong> — Rôle : <strong>{currentUser?.role}</strong>) ne dispose pas des autorisations requises pour consulter ce module.
              </p>
              <button
                onClick={() => setCurrentTab('HOME')}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
              >
                Retour au Tableau de Bord
              </button>
            </div>
          ) : (
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
                <AppSettingsView onOpenReceptionTests={() => setIsReceptionTestsOpen(true)} />
              )}

              {currentTab === 'LMD_MAQUETTES' && <LmdMaquetteView />}

              {currentTab === 'GRADES' && <GradesView />}

              {currentTab === 'QR_ATTENDANCE' && <QrAttendanceView />}

              {currentTab === 'FINANCIAL' && <FinancialManagementView />}

              {currentTab === 'COMMUNICATION' && <CommunicationHub />}

              {currentTab === 'HOMEWORK_RESOURCES' && <HomeworkAndResourcesView />}

              {currentTab === 'PARENT_PORTAL' && <ParentPortalView />}

              {currentTab === 'EXPORT_STUDENTS' && (
                <StudentExportModal
                  isOpen={true}
                  onClose={() => setCurrentTab('HOME')}
                />
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

              {currentTab === 'ROOMS' && <RoomCalendarView onNavigateToCreate={() => setCurrentTab('DATA_MANAGEMENT')} />}

              {currentTab === 'VOLUMES' && <CourseVolumeTracker onNavigateToCreate={() => setCurrentTab('DATA_MANAGEMENT')} />}

              {currentTab === 'TEACHERS' && <TeacherManagement onNavigateToCreate={() => setCurrentTab('DATA_MANAGEMENT')} />}

              {(currentTab === 'STUDENTS' || currentTab === 'STUDENTS_OVERVIEW') && (
                <StudentManagement onNavigateToCreate={() => setCurrentTab('DATA_MANAGEMENT')} />
              )}

              {currentTab === 'AUDIT' && <AuditLogView />}

              {currentTab === 'BACKUP_SECURITY' && <BackupAndSecurityView />}
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-slate-200 py-5 text-xs text-slate-500 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-1.5">
              <span className="font-bold text-slate-800">EBM Institute Business School</span>
              <span>· Système Universitaire Intégré (SIS Production)</span>
            </div>

            <div className="flex items-center justify-center gap-3 sm:gap-4 text-slate-600 flex-wrap">
              <button
                onClick={() => setCurrentTab('HOME')}
                className="hover:text-blue-700 font-semibold cursor-pointer"
              >
                Accueil
              </button>
              <button
                onClick={() => setCurrentTab('ACADEMIC_YEARS')}
                className="hover:text-blue-700 font-semibold cursor-pointer"
              >
                Années Académiques
              </button>
              <button
                onClick={() => setCurrentTab('BACKUP_SECURITY')}
                className="hover:text-blue-700 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Database className="w-3.5 h-3.5 text-indigo-600" />
                Sauvegardes & Cloud
              </button>
              <button
                onClick={() => setCurrentTab('SETTINGS')}
                className="hover:text-blue-700 font-semibold cursor-pointer"
              >
                Paramètres
              </button>
              {currentUser?.role === 'ADMIN' && (
                <button
                  onClick={() => setIsReceptionTestsOpen(true)}
                  className="hover:text-blue-700 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Contrôle Qualité
                </button>
              )}
              <button
                onClick={() => setIsNotifOpen(true)}
                className="hover:text-blue-700 font-semibold cursor-pointer"
              >
                Centre de notifications
              </button>
            </div>
          </div>
        </footer>
      </div>

      {/* Mobile Bottom Navigation Bar (< lg) */}
      {!isAndroidView && (
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 text-white px-2 py-1.5 grid grid-cols-5 gap-1 shadow-2xl">
          <button
            type="button"
            onClick={() => setCurrentTab('HOME')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl text-[10px] font-bold transition-colors cursor-pointer ${
              currentTab === 'HOME' ? 'text-blue-400 bg-slate-800/80' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Home className="w-4 h-4 mb-0.5" />
            <span className="truncate">Accueil</span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentTab('TIMETABLE')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl text-[10px] font-bold transition-colors cursor-pointer ${
              currentTab === 'TIMETABLE' ? 'text-blue-400 bg-slate-800/80' : 'text-slate-400 hover:text-white'
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
                currentTab === 'PARENT_PORTAL' ? 'text-indigo-400 bg-slate-800/80' : 'text-slate-400 hover:text-white'
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
                currentTab === 'GRADES' ? 'text-amber-400 bg-slate-800/80' : 'text-slate-400 hover:text-white'
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
                currentTab === 'FINANCIAL' ? 'text-emerald-400 bg-slate-800/80' : 'text-slate-400 hover:text-white'
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
                currentTab === 'QR_ATTENDANCE' ? 'text-emerald-400 bg-slate-800/80' : 'text-slate-400 hover:text-white'
              }`}
            >
              <QrCode className="w-4 h-4 mb-0.5" />
              <span className="truncate">Présence</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="flex flex-col items-center justify-center py-1 rounded-xl text-[10px] font-bold text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <Menu className="w-4 h-4 mb-0.5 text-indigo-400" />
            <span className="truncate">Menu</span>
          </button>
        </nav>
      )}

      {/* Floating Messenger Live Chat Dock & Online Users */}
      <MessengerLiveChat />

      {/* Session Modal (Create, Edit, Reschedule, Cancel) */}
      <SessionModal
        isOpen={isSessionModalOpen}
        onClose={() => setIsSessionModalOpen(false)}
        sessionToEdit={selectedSessionToEdit}
        mode={sessionModalMode}
      />

      {/* Notifications Drawer / Modal */}
      <NotificationCenter
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
      />

      {/* User Profile Modal (Opened when clicking on user name in Header or Sidebar) */}
      <UserProfileModal
        isOpen={isUserProfileOpen}
        onClose={() => setIsUserProfileOpen(false)}
      />

      {/* Reception Test Suite Modal (Strictly Admin) */}
      {currentUser?.role === 'ADMIN' && (
        <ReceptionTestsModal
          isOpen={isReceptionTestsOpen}
          onClose={() => setIsReceptionTestsOpen(false)}
          onNavigateTab={(tab) => setCurrentTab(tab)}
        />
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
