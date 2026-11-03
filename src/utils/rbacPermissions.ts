import { CustomRoleDefinition, RbacOperation, User, UserCustomPermissions, UserRole } from '../types';

export interface RoleDefinition {
  role: UserRole;
  label: string;
  shortLabel: string;
  badgeColor: string;
  description: string;
  allowedTabs: string[];
  defaultOperations: RbacOperation[];
}

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrateur Général',
  ADMIN_STAFF: 'Personnel Administratif',
  SCOLARITE: 'Service Scolarité & Inscriptions',
  SCHEDULER: 'Responsable Planification & Salles',
  FINANCE: 'Finances & Caisse',
  ACADEMIC_HEAD: 'Responsable Pédagogique',
  TEACHER: 'Enseignant',
  STUDENT: 'Étudiant',
  PARENT: 'Parent / Tuteur',
};

const ROLE_HIERARCHY_RANK: Record<UserRole, number> = {
  ADMIN: 100,
  ACADEMIC_HEAD: 80,
  SCOLARITE: 70,
  SCHEDULER: 65,
  FINANCE: 65,
  ADMIN_STAFF: 60,
  TEACHER: 40,
  STUDENT: 20,
  PARENT: 10,
};

export const PROTECTED_ADMIN_TABS = new Set([
  'HOME',
  'USERS_MANAGEMENT',
  'SETTINGS',
  'BACKUP_SECURITY',
  'AUDIT',
]);

export const ROLE_DEFINITIONS: Record<UserRole, RoleDefinition> = {
  ADMIN: {
    role: 'ADMIN',
    label: 'Administrateur Général',
    shortLabel: 'Administrateur',
    badgeColor: 'bg-red-100 text-red-800 border-red-300',
    description: 'Accès intégral : gouvernance, sécurité Firebase, sauvegardes, délibérations, finances, portail parents et référentiels.',
    allowedTabs: [
      'HOME',
      'TIMETABLE',
      'ROOMS',
      'VOLUMES',
      'QR_ATTENDANCE',
      'LMD_MAQUETTES',
      'GRADES',
      'HOMEWORK_RESOURCES',
      'FINANCIAL',
      'COMMUNICATION',
      'STUDENTS',
      'TEACHERS',
      'PARENT_PORTAL',
      'EXPORT_STUDENTS',
      'ACADEMIC_YEARS',
      'USERS_MANAGEMENT',
      'DATA_MANAGEMENT',
      'AUDIT',
      'BACKUP_SECURITY',
      'SETTINGS',
      'MY_COURSES',
    ],
    defaultOperations: ['CONSULTATION', 'CREATION', 'MODIFICATION', 'SUPPRESSION', 'VALIDATION', 'TELECHARGEMENT', 'EXPORTATION'],
  },
  ADMIN_STAFF: {
    role: 'ADMIN_STAFF',
    label: 'Personnel Administratif',
    shortLabel: 'Personnel Admin',
    badgeColor: 'bg-slate-100 text-slate-800 border-slate-300',
    description: 'Gestion administrative courante, annuaire global, fiches individuelles, communication et suivi documentaire.',
    allowedTabs: [
      'HOME',
      'TIMETABLE',
      'ROOMS',
      'VOLUMES',
      'STUDENTS',
      'TEACHERS',
      'PARENT_PORTAL',
      'COMMUNICATION',
      'EXPORT_STUDENTS',
      'SETTINGS',
      'MY_COURSES',
    ],
    defaultOperations: ['CONSULTATION', 'CREATION', 'MODIFICATION', 'TELECHARGEMENT', 'EXPORTATION'],
  },
  SCOLARITE: {
    role: 'SCOLARITE',
    label: 'Service Scolarité & Inscriptions',
    shortLabel: 'Scolarité',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
    description: 'Gestion officielle des inscriptions, réinscriptions, dossiers étudiants, cartes étudiantes, rectifications d’état civil, absences et relevés.',
    allowedTabs: [
      'HOME',
      'TIMETABLE',
      'ROOMS',
      'VOLUMES',
      'QR_ATTENDANCE',
      'LMD_MAQUETTES',
      'GRADES',
      'COMMUNICATION',
      'STUDENTS',
      'TEACHERS',
      'PARENT_PORTAL',
      'EXPORT_STUDENTS',
      'ACADEMIC_YEARS',
      'DATA_MANAGEMENT',
      'AUDIT',
      'SETTINGS',
      'MY_COURSES',
    ],
    defaultOperations: ['CONSULTATION', 'CREATION', 'MODIFICATION', 'VALIDATION', 'TELECHARGEMENT', 'EXPORTATION'],
  },
  SCHEDULER: {
    role: 'SCHEDULER',
    label: 'Responsable Planification & Salles',
    shortLabel: 'Planification',
    badgeColor: 'bg-violet-100 text-violet-800 border-violet-300',
    description: 'Planification des emplois du temps, gestion des occupations de salles, détection des conflits, reports de séances et suivi des volumes horaires.',
    allowedTabs: [
      'HOME',
      'TIMETABLE',
      'ROOMS',
      'VOLUMES',
      'QR_ATTENDANCE',
      'LMD_MAQUETTES',
      'COMMUNICATION',
      'STUDENTS',
      'TEACHERS',
      'EXPORT_STUDENTS',
      'DATA_MANAGEMENT',
      'SETTINGS',
      'MY_COURSES',
    ],
    defaultOperations: ['CONSULTATION', 'CREATION', 'MODIFICATION', 'VALIDATION', 'TELECHARGEMENT', 'EXPORTATION'],
  },
  FINANCE: {
    role: 'FINANCE',
    label: 'Direction Financière & Caisse',
    shortLabel: 'Finances & Caisse',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    description: 'Gestion des frais de scolarité, échéanciers, encaissements en Ariary, reçus, clôtures de caisse et suivi des impayés.',
    allowedTabs: [
      'HOME',
      'FINANCIAL',
      'STUDENTS',
      'EXPORT_STUDENTS',
      'COMMUNICATION',
      'AUDIT',
      'SETTINGS',
    ],
    defaultOperations: ['CONSULTATION', 'CREATION', 'MODIFICATION', 'VALIDATION', 'TELECHARGEMENT', 'EXPORTATION'],
  },
  ACADEMIC_HEAD: {
    role: 'ACADEMIC_HEAD',
    label: 'Responsable Pédagogique / Chef de Mention',
    shortLabel: 'Resp. Pédagogique',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    description: 'Configuration des années, semestres, mentions, parcours, UE/EC, règles LMD, volumes horaires et délibérations du jury.',
    allowedTabs: [
      'HOME',
      'TIMETABLE',
      'ROOMS',
      'VOLUMES',
      'QR_ATTENDANCE',
      'LMD_MAQUETTES',
      'GRADES',
      'HOMEWORK_RESOURCES',
      'COMMUNICATION',
      'STUDENTS',
      'TEACHERS',
      'EXPORT_STUDENTS',
      'ACADEMIC_YEARS',
      'DATA_MANAGEMENT',
      'AUDIT',
      'SETTINGS',
      'MY_COURSES',
    ],
    defaultOperations: ['CONSULTATION', 'CREATION', 'MODIFICATION', 'SUPPRESSION', 'VALIDATION', 'TELECHARGEMENT', 'EXPORTATION'],
  },
  TEACHER: {
    role: 'TEACHER',
    label: 'Enseignant',
    shortLabel: 'Enseignant',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
    description: 'Emploi du temps personnel uniquement, fiche enseignant & disponibilités 07h-17h, appel QR & présences, saisie des notes de ses EC, devoirs et supports de cours.',
    allowedTabs: [
      'HOME',
      'TIMETABLE',
      'ROOMS',
      'VOLUMES',
      'QR_ATTENDANCE',
      'GRADES',
      'HOMEWORK_RESOURCES',
      'COMMUNICATION',
      'TEACHERS',
      'SETTINGS',
      'MY_COURSES',
    ],
    defaultOperations: ['CONSULTATION', 'CREATION', 'MODIFICATION', 'TELECHARGEMENT', 'EXPORTATION'],
  },
  STUDENT: {
    role: 'STUDENT',
    label: 'Étudiant',
    shortLabel: 'Étudiant',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
    description: 'Consultation de son emploi du temps, sa maquette LMD d’inscription, ses notes & relevés officiels, ses présences, ses devoirs et sa situation financière personnelle.',
    allowedTabs: [
      'HOME',
      'TIMETABLE',
      'LMD_MAQUETTES',
      'GRADES',
      'QR_ATTENDANCE',
      'FINANCIAL',
      'HOMEWORK_RESOURCES',
      'COMMUNICATION',
      'SETTINGS',
      'MY_COURSES',
    ],
    defaultOperations: ['CONSULTATION', 'TELECHARGEMENT'],
  },
  PARENT: {
    role: 'PARENT',
    label: 'Parent / Tuteur Légal',
    shortLabel: 'Parent / Tuteur',
    badgeColor: 'bg-teal-100 text-teal-800 border-teal-300',
    description: 'Suivi académique, emploi du temps de son enfant, assiduité, échéanciers financiers, reçus et notifications des étudiants rattachés (lecture seule).',
    allowedTabs: [
      'HOME',
      'PARENT_PORTAL',
      'TIMETABLE',
      'COMMUNICATION',
    ],
    defaultOperations: ['CONSULTATION', 'TELECHARGEMENT'],
  },
};

export const DEFAULT_SYSTEM_ROLE_TABS: Record<UserRole, string[]> = {
  ADMIN: [...ROLE_DEFINITIONS.ADMIN.allowedTabs],
  ADMIN_STAFF: [...ROLE_DEFINITIONS.ADMIN_STAFF.allowedTabs],
  SCOLARITE: [...ROLE_DEFINITIONS.SCOLARITE.allowedTabs],
  SCHEDULER: [...ROLE_DEFINITIONS.SCHEDULER.allowedTabs],
  FINANCE: [...ROLE_DEFINITIONS.FINANCE.allowedTabs],
  ACADEMIC_HEAD: [...ROLE_DEFINITIONS.ACADEMIC_HEAD.allowedTabs],
  TEACHER: [...ROLE_DEFINITIONS.TEACHER.allowedTabs],
  STUDENT: [...ROLE_DEFINITIONS.STUDENT.allowedTabs],
  PARENT: [...ROLE_DEFINITIONS.PARENT.allowedTabs],
};

// Reactive in-memory copy updated alongside React state in AppContext (P12)
let activeSystemRoleTabs: Record<UserRole, string[]> = {
  ...DEFAULT_SYSTEM_ROLE_TABS,
};

export function syncSystemRolePermissions(overrides?: Partial<Record<UserRole, string[]>>): Record<UserRole, string[]> {
  const next: Record<UserRole, string[]> = { ...DEFAULT_SYSTEM_ROLE_TABS };
  (Object.keys(ROLE_DEFINITIONS) as UserRole[]).forEach((role) => {
    if (role === 'ADMIN') {
      next.ADMIN = [...DEFAULT_SYSTEM_ROLE_TABS.ADMIN];
      ROLE_DEFINITIONS.ADMIN.allowedTabs = [...DEFAULT_SYSTEM_ROLE_TABS.ADMIN];
      return;
    }
    const customTabs = overrides?.[role];
    if (Array.isArray(customTabs)) {
      next[role] = [...customTabs];
      ROLE_DEFINITIONS[role].allowedTabs = [...customTabs];
    } else {
      next[role] = [...DEFAULT_SYSTEM_ROLE_TABS[role]];
      ROLE_DEFINITIONS[role].allowedTabs = [...DEFAULT_SYSTEM_ROLE_TABS[role]];
    }
  });
  activeSystemRoleTabs = next;
  return next;
}

export const SYSTEM_ROLE_DEFINITIONS: RoleDefinition[] = Object.values(ROLE_DEFINITIONS);

export function getRoleLabel(role?: UserRole, customRoleLabel?: string): string {
  if (customRoleLabel) return customRoleLabel;
  if (!role) return 'Utilisateur';
  return ROLE_DEFINITIONS[role]?.label || role;
}

export function getRoleShortLabel(role?: UserRole, customRoleLabel?: string): string {
  if (customRoleLabel) return customRoleLabel;
  if (!role) return 'Utilisateur';
  return ROLE_DEFINITIONS[role]?.shortLabel || role;
}

export function canRoleAccessTab(
  role: UserRole | undefined,
  tabId: string,
  userOrPerms?: User | UserCustomPermissions,
  customRoles?: CustomRoleDefinition[],
  roleOverrides?: Partial<Record<UserRole, string[]>>
): boolean {
  if (!role) return false;

  // P26: Never allow an ADMIN to be locked out of critical governance modules
  if (role === 'ADMIN' && PROTECTED_ADMIN_TABS.has(tabId)) {
    return true;
  }

  const perms: UserCustomPermissions | undefined =
    userOrPerms && 'id' in userOrPerms ? userOrPerms.customPermissions : (userOrPerms as UserCustomPermissions | undefined);
  const customRoleId = userOrPerms && 'id' in userOrPerms ? userOrPerms.customRoleId : undefined;

  // Individual explicit deny takes precedence (except protected admin tabs handled above)
  if (perms?.deniedTabs?.includes(tabId)) {
    return false;
  }
  // Individual explicit allow
  if (perms?.allowedTabs?.includes(tabId)) {
    return true;
  }
  // Custom role definition if assigned
  if (customRoleId && customRoles) {
    const customDef = customRoles.find((cr) => cr.id === customRoleId);
    if (customDef) {
      return customDef.allowedTabs.includes(tabId);
    }
  }
  if (role === 'ADMIN') return true;
  const effectiveTabs = roleOverrides?.[role] || activeSystemRoleTabs[role] || ROLE_DEFINITIONS[role]?.allowedTabs;
  if (!effectiveTabs) return false;
  return effectiveTabs.includes(tabId);
}

export function canUserPerformOperation(
  user: User | undefined,
  operation: RbacOperation,
  customRoles?: CustomRoleDefinition[]
): boolean {
  if (!user) return false;
  if (user.role === 'PARENT' && operation !== 'CONSULTATION' && operation !== 'TELECHARGEMENT') {
    return false; // ACC-089: Parent is strictly read-only
  }
  // P26: ADMIN always retains core governance operations
  if (user.role === 'ADMIN' && (operation === 'CONSULTATION' || operation === 'MODIFICATION')) {
    return true;
  }
  if (user.customPermissions?.deniedOperations?.includes(operation)) {
    return false;
  }
  if (user.customPermissions?.allowedOperations?.includes(operation)) {
    return true;
  }
  if (user.customRoleId && customRoles) {
    const customDef = customRoles.find((cr) => cr.id === user.customRoleId);
    if (customDef) {
      return customDef.allowedOperations.includes(operation);
    }
  }
  if (user.role === 'ADMIN') return true;
  const def = ROLE_DEFINITIONS[user.role];
  return def ? def.defaultOperations.includes(operation) : false;
}

export const RBAC = {
  isAdmin: (role?: UserRole) => role === 'ADMIN',
  isAdminStaff: (role?: UserRole) => role === 'ADMIN' || role === 'ADMIN_STAFF',
  isScolarite: (role?: UserRole) => role === 'ADMIN' || role === 'SCOLARITE' || role === 'SCHEDULER' || role === 'ADMIN_STAFF',
  isFinance: (role?: UserRole) => role === 'ADMIN' || role === 'FINANCE',
  isAcademicHead: (role?: UserRole) => role === 'ADMIN' || role === 'ACADEMIC_HEAD',
  isTeacher: (role?: UserRole) => role === 'ADMIN' || role === 'ACADEMIC_HEAD' || role === 'TEACHER',
  isParent: (role?: UserRole) => role === 'PARENT',
  isStaff: (role?: UserRole) => role !== undefined && role !== 'STUDENT' && role !== 'PARENT',
  canConfigureAcademics: (role?: UserRole) =>
    role === 'ADMIN' || role === 'ACADEMIC_HEAD' || role === 'SCOLARITE' || role === 'SCHEDULER',
  canRunJuryDeliberation: (role?: UserRole) => role === 'ADMIN' || role === 'ACADEMIC_HEAD',
  canManageInscriptions: (role?: UserRole) =>
    role === 'ADMIN' || role === 'SCOLARITE' || role === 'SCHEDULER' || role === 'ACADEMIC_HEAD' || role === 'ADMIN_STAFF',
  canManageFinances: (role?: UserRole) => role === 'ADMIN' || role === 'FINANCE',
  canViewFinancialStatus: (role?: UserRole) =>
    role === 'ADMIN' || role === 'FINANCE' || role === 'SCOLARITE' || role === 'SCHEDULER',
  canManageBackups: (role?: UserRole) => role === 'ADMIN',
  // P24: Enforce strict role hierarchy when editing user sheets
  canEditUserSheet: (actor?: User, target?: User) => {
    if (!actor || !target) return false;
    if (actor.role === 'PARENT') return false;
    if (actor.customPermissions?.deniedOperations?.includes('MODIFICATION')) return false;
    if (actor.role === 'ADMIN') return true;
    // Non-admins can never edit an ADMIN account
    if (target.role === 'ADMIN') return false;
    const actorRank = ROLE_HIERARCHY_RANK[actor.role] || 0;
    const targetRank = ROLE_HIERARCHY_RANK[target.role] || 0;
    if (
      (actor.role === 'SCOLARITE' ||
        actor.role === 'SCHEDULER' ||
        actor.role === 'ADMIN_STAFF' ||
        actor.role === 'ACADEMIC_HEAD') &&
      actorRank >= targetRank
    ) {
      return true;
    }
    if (actor.id === target.id && (actor.role === 'STUDENT' || actor.role === 'TEACHER' || actor.role === 'FINANCE')) {
      return true; // Self-service personal & teacher profile fields
    }
    return false;
  },
};
