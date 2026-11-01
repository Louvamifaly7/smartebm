import React from 'react';
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
  ChevronLeft,
  ChevronRight,
  LogOut,
  Database,
  Clock,
  X,
  FileSpreadsheet,
  History,
  UserCheck,
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

export interface NavItemConfig {
  id: string;
  label: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
}

export interface NavSectionConfig {
  id: string;
  label: string;
  description: string;
  items: NavItemConfig[];
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
    customRoles,
  } = useApp();

  const isStaffOrAdmin = ['ADMIN', 'ADMIN_STAFF', 'SCOLARITE', 'SCHEDULER', 'ACADEMIC_HEAD'].includes(
    currentUser?.role || ''
  );

  // Filter menu items by role permissions AND appSettings.visibleMenuItems
  const isVisible = (tabId: string) => {
    if (!canRoleAccessTab(currentUser?.role, tabId, currentUser?.customPermissions, customRoles)) return false;
    if (!appSettings.visibleMenuItems || appSettings.visibleMenuItems.length === 0) return true;
    if (
      tabId === 'BACKUP_SECURITY' ||
      tabId === 'PARENT_PORTAL' ||
      tabId === 'VOLUMES' ||
      tabId === 'DATA_MANAGEMENT' ||
      tabId === 'AUDIT' ||
      tabId === 'EXPORT_STUDENTS'
    ) {
      return true;
    }
    return appSettings.visibleMenuItems.includes(tabId);
  };

  const handleSelectAndClose = (tab: string) => {
    onSelectTab(tab);
    if (onCloseMobile) onCloseMobile();
  };

  const currentYearObj = academicYears.find((y) => y.code === selectedAcademicYear) || academicYears[0];
  const isVerticalDesktop = appSettings.menuLayout === 'vertical';
  const effectiveCollapsed = isCollapsed && !isMobileOpen;

  // 7-Section Job-Oriented Navigation Architecture (Refonte UX/UI — Section 2, Page 3)
  const navSections: NavSectionConfig[] = [
    {
      id: 'DASHBOARD',
      label: '1. Tableau de bord',
      description: "Vue d'ensemble, tâches à traiter, alertes, raccourcis",
      items: [
        {
          id: 'HOME',
          label: 'Tableau de bord',
          title: "Vue d'ensemble, tâches du jour et raccourcis adaptés à votre rôle",
          icon: Home,
        },
      ],
    },
    {
      id: 'PLANNING_ROOMS',
      label: '2. Planning & salles',
      description: 'Emplois du temps, salles, disponibilités, conflits',
      items: [
        {
          id: 'TIMETABLE',
          label: currentUser?.role === 'STUDENT' ? 'Mon emploi du temps' : 'Emplois du temps',
          title: 'Planification hebdomadaire, détection de conflits et export PDF/iCal',
          icon: Calendar,
        },
        {
          id: 'ROOMS',
          label: 'Salles & disponibilités',
          title: 'Occupation des salles, équipements et créneaux libres',
          icon: Layers,
        },
        {
          id: 'VOLUMES',
          label: 'Volumes horaires',
          title: 'Suivi des heures prévues vs réalisées et validation des séances',
          icon: Clock,
        },
      ],
    },
    {
      id: 'ACADEMIC_MGMT',
      label: '3. Gestion académique',
      description: 'Étudiants, enseignants, filières, groupes, matières',
      items: [
        {
          id: 'STUDENTS',
          label: 'Étudiants',
          title: 'Répertoire des étudiants, dossiers académiques et suivi par groupe',
          icon: GraduationCap,
        },
        {
          id: 'TEACHERS',
          label: currentUser?.role === 'TEACHER' ? 'Ma fiche enseignant' : 'Enseignants',
          title: 'Corps enseignant, disponibilités hebdomadaires et charges horaires',
          icon: UserCheck,
        },
        {
          id: 'LMD_MAQUETTES',
          label: 'Filières & maquettes LMD',
          title: 'Parcours, Unités d’Enseignement (UE), Éléments Constitutifs (EC) et crédits',
          icon: BookOpen,
        },
        {
          id: 'DATA_MANAGEMENT',
          label: 'Groupes, cours & référentiel',
          title: 'Création et structuration des groupes, matières et salles',
          icon: Layers,
        },
      ],
    },
    {
      id: 'SCOLARITE',
      label: '4. Scolarité',
      description: 'Inscriptions, présences, notes, évaluations, documents',
      items: [
        {
          id: 'QR_ATTENDANCE',
          label: 'Présences & appel QR',
          title: 'Pointage de présence par QR code dynamique, justificatifs et alertes d’assiduité',
          icon: QrCode,
        },
        {
          id: 'GRADES',
          label: 'Notes & évaluations',
          title: 'Saisie des notes type tableur, délibérations, PV jury et relevés PDF',
          icon: Award,
        },
        {
          id: 'HOMEWORK_RESOURCES',
          label: 'Devoirs & documents',
          title: 'Supports de cours, devoirs à rendre et ressources pédagogiques',
          icon: BookOpen,
        },
        {
          id: 'EXPORT_STUDENTS',
          label: 'Listes & exports officiels',
          title: 'Export sélectif des listes d’étudiants et fiches d’émargement',
          icon: FileSpreadsheet,
        },
      ],
    },
    {
      id: 'FINANCES',
      label: '5. Finances',
      description: 'Paiements, impayés, reçus, états financiers',
      items: [
        {
          id: 'FINANCIAL',
          label: 'Écolages, caisse & reçus',
          title: 'Suivi des paiements en Ariary, Mobile Money, reçus PDF et relances impayés',
          icon: DollarSign,
        },
      ],
    },
    {
      id: 'COMMUNICATION',
      label: '6. Communication',
      description: 'Annonces, messagerie, notifications, rappels',
      items: [
        {
          id: 'COMMUNICATION',
          label: 'Annonces & messagerie',
          title: 'Annonces ciblées avec accusé de lecture et messagerie interne',
          icon: MessageSquare,
        },
        {
          id: 'PARENT_PORTAL',
          label: 'Portail Parents / Tuteurs',
          title: 'Suivi familial de l’assiduité, des résultats et des échéances',
          icon: Users,
        },
      ],
    },
    {
      id: 'ADMINISTRATION',
      label: '7. Administration',
      description: 'Utilisateurs, rôles, paramètres, intégrations, sauvegardes',
      items: [
        {
          id: 'USERS_MANAGEMENT',
          label: 'Gestion des personnes & accès',
          title: 'Fiches individuelles (Étudiants, Enseignants, Personnel), rôles et mots de passe',
          icon: Users,
        },
        {
          id: 'ACADEMIC_YEARS',
          label: 'Années universitaires',
          title: 'Configuration des sessions académiques et bascule annuelle',
          icon: CalendarDays,
          badge: academicYears.length,
        },
        {
          id: 'SETTINGS',
          label: 'Paramètres & configuration',
          title: 'Général, académique, planning, accès RBAC, notifications, intégrations et sécurité',
          icon: Settings,
        },
        {
          id: 'BACKUP_SECURITY',
          label: 'Sauvegardes & Cloud Firestore',
          title: 'Synchronisation temps réel multi-postes, sauvegardes JSON et vérification RBAC',
          icon: Database,
        },
        {
          id: 'AUDIT',
          label: "Journal d'audit",
          title: 'Historique complet et filtrable des opérations sensibles',
          icon: History,
        },
      ],
    },
  ];

  const visibleSections = navSections
    .map((sec) => ({
      ...sec,
      items: sec.items.filter((item) => isVisible(item.id)),
    }))
    .filter((sec) => sec.items.length > 0);

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
        className={`bg-[#17345B] text-white flex flex-col border-r border-[#214575] transition-all duration-300 select-none flex-shrink-0
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
        <div className="p-3.5 border-b border-white/10 flex items-center justify-between gap-2">
          {!effectiveCollapsed && (
            <div className="px-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-blue-200 block">
                Navigation Métier
              </span>
              <span className="text-[10px] text-slate-300 block">
                EBM Institute • Portail Intégré
              </span>
            </div>
          )}
          {/* Mobile Close button */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors ml-auto lg:hidden cursor-pointer"
            title="Fermer le menu"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Desktop Collapse toggle button */}
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden lg:inline-flex p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors ml-auto cursor-pointer"
            title={effectiveCollapsed ? 'Déplier le menu' : 'Replier le menu'}
          >
            {effectiveCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* 2. Centralized Academic Year Indicator */}
        {!effectiveCollapsed ? (
          <div className="px-3 pt-2.5 pb-2 border-b border-white/10">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#102542] border border-white/10 text-xs">
              <div className="flex items-center gap-2 truncate">
                <span className="w-2.5 h-2.5 rounded-full bg-[#1F8A83] flex-shrink-0 ring-2 ring-[#1F8A83]/30" />
                <div className="truncate">
                  <span className="text-[9px] uppercase font-bold text-slate-300 block leading-none">
                    Année universitaire
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
                  className="px-2.5 py-1 rounded-lg bg-[#2F6FED]/25 hover:bg-[#2F6FED] text-blue-100 hover:text-white text-[10px] font-bold transition-colors cursor-pointer"
                  title="Administration > Années universitaires"
                >
                  Gérer
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="p-2 border-b border-white/10 flex justify-center">
            <button
              type="button"
              onClick={() => isStaffOrAdmin && handleSelectAndClose('ACADEMIC_YEARS')}
              className="p-2 bg-[#102542] hover:bg-[#2F6FED] rounded-xl text-blue-200 hover:text-white transition-colors"
              title={`Année universitaire active : ${selectedAcademicYear}`}
            >
              <CalendarDays className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* 3. 7-Section Navigation List */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4 no-scrollbar text-xs">
          {visibleSections.map((section) => (
            <div key={section.id} className="space-y-1">
              {!effectiveCollapsed && (
                <div className="px-2.5 pb-0.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-200/80 block">
                    {section.label}
                  </span>
                </div>
              )}

              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectAndClose(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#2F6FED] text-white shadow-md ring-1 ring-blue-300/40'
                        : 'text-slate-200 hover:text-white hover:bg-white/10'
                    }`}
                    title={item.title}
                  >
                    <Icon
                      className={`w-4 h-4 flex-shrink-0 ${
                        isActive ? 'text-white' : 'text-blue-200'
                      }`}
                    />
                    {!effectiveCollapsed && (
                      <div className="flex items-center justify-between w-full min-w-0">
                        <span className="truncate">{item.label}</span>
                        {item.badge !== undefined && (
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                              isActive
                                ? 'bg-white/20 text-white'
                                : 'bg-[#102542] text-blue-200'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* 4. Footer User Profile Card (Clickable to open Fiche Utilisateur) */}
        {currentUser && (
          <div className="p-3 border-t border-white/10 bg-[#102542]">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  if (onCloseMobile) onCloseMobile();
                  if (onOpenUserProfile) onOpenUserProfile();
                }}
                className="flex items-center gap-2.5 min-w-0 flex-1 text-left p-1.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer group"
                title="Cliquer pour consulter ou modifier votre fiche utilisateur"
              >
                <div className="w-9 h-9 rounded-xl bg-[#2F6FED] group-hover:bg-blue-500 text-white flex items-center justify-center font-bold text-xs border border-blue-300/40 flex-shrink-0">
                  {currentUser.name.substring(0, 2).toUpperCase()}
                </div>
                {!effectiveCollapsed && (
                  <div className="min-w-0 truncate">
                    <span className="font-bold text-xs text-white group-hover:text-blue-200 block truncate leading-tight">
                      {currentUser.name}
                    </span>
                    <span className="text-[10px] text-blue-200 font-medium block truncate">
                      {currentUser.role === 'STUDENT'
                        ? `Étudiant (${currentUser.matricule || currentUser.username})`
                        : getRoleLabel(currentUser.role)}
                    </span>
                  </div>
                )}
              </button>

              <button
                type="button"
                onClick={logout}
                className="p-2 rounded-lg text-slate-300 hover:text-red-300 hover:bg-red-950/50 transition-colors flex-shrink-0 cursor-pointer"
                title="Se déconnecter"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
