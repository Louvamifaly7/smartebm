import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  AppNotification,
  AuditLog,
  Course,
  Filiere,
  ImportResult,
  ImportStudentRow,
  Room,
  SessionStatus,
  StudentGroup,
  TimetableSession,
  User,
  UserRole,
  AcademicYear,
  SemesterCode,
  UniteEnseignement,
  ElementConstitutif,
  StudentInscription,
  EcGrade,
  QrAttendanceSession,
  AttendanceRecord,
  InternalMessage,
  GroupPost,
  PaymentMethod,
  StudentFee,
  PaymentTransaction,
  CashRegisterDay,
  HomeworkAssignment,
  HomeworkSubmission,
  LearningResource,
  AppSettings,
  ChatMessage,
  Parcours,
  AcademicValidationRules,
  DeliberationRecord,
  DeliberationDecision,
  SystemBackupSnapshot,
  CustomRoleDefinition,
  ProfileChangeRequest,
  UserModificationLog,
} from '../types';
import {
  initialAuditLogs,
  initialCourses,
  initialFilieres,
  initialGroups,
  initialNotifications,
  initialRooms,
  initialSessions,
  initialUsers,
  initialAcademicYears,
  initialUes,
  initialEcs,
  initialInscriptions,
  initialGrades,
  initialQrSessions,
  initialMessages,
  initialGroupPosts,
  initialFees,
  initialPayments,
  initialCashRegisterDays,
  initialHomework,
  initialSubmissions,
  initialLearningResources,
  initialParcours,
  initialAcademicRules,
  initialDeliberations,
} from '../data/mockData';
import { detectSessionConflicts } from '../utils/conflictDetector';
import { syncSystemRolePermissions } from '../utils/rbacPermissions';
import {
  auth,
  googleProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  FirebaseUser,
  testFirestoreConnection,
} from '../firebase';
import {
  syncDocToFirestore,
  syncCollectionBatch,
  fetchCollectionFromFirestore,
  buildSystemBackupSnapshot,
} from '../services/firestoreSync';

interface CourseHourlyStats {
  totalHours: number;
  scheduledHours: number;
  completedHours: number;
  remainingToComplete: number;
  remainingToSchedule: number;
}

interface TeacherHourlyStats {
  totalScheduled: number;
  totalCompleted: number;
  maxWeekly: number;
}

interface AppContextType {
  currentUser: User;
  setCurrentUser: (user: User) => void;
  switchUserRole: (role: UserRole) => void;
  isAuthenticated: boolean;
  login: (identifier: string, password?: string) => { success: boolean; error?: string };
  logout: () => void;

  users: User[];
  addUser: (userData: Partial<User>) => { success: boolean; error?: string };
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;
  resetUserPassword: (id: string) => void;
  sendUserPasswordResetEmail: (id: string) => Promise<{ success: boolean; message: string }>;
  setDirectUserPassword: (
    id: string,
    newPassword: string,
    forceChangeOnNextLogin?: boolean
  ) => { success: boolean; message: string };

  courses: Course[];
  rooms: Room[];
  groups: StudentGroup[];
  filieres: Filiere[];
  sessions: TimetableSession[];
  notifications: AppNotification[];
  auditLogs: AuditLog[];
  isAndroidView: boolean;
  toggleAndroidView: () => void;
  isOfflineMode: boolean;
  toggleOfflineMode: () => void;
  lastSyncDate: Date;
  activePushBanner: AppNotification | null;
  dismissPushBanner: () => void;

  // Session actions
  addSession: (data: Omit<TimetableSession, 'id' | 'history'>) => { success: boolean; session?: TimetableSession; error?: string };
  updateSession: (id: string, updates: Partial<TimetableSession>, reason?: string) => void;
  rescheduleSession: (id: string, newDate: string, newStartTime: string, newEndTime: string, newRoomId: string, reason: string) => void;
  cancelSession: (id: string, reason: string) => void;
  validateSession: (id: string) => void;
  deleteSession: (id: string) => void;

  // Notification actions
  markAsRead: (id: string, platform: 'WEB' | 'ANDROID') => void;
  markAllAsRead: (platform: 'WEB' | 'ANDROID') => void;
  sendManualPush: (title: string, message: string, type: AppNotification['type']) => void;

  // User & Account actions
  changePassword: (userId: string, newPassword: string) => boolean;
  toggleUserStatus: (userId: string) => void;
  createStudent: (student: Partial<User>) => { success: boolean; error?: string };
  importStudents: (rows: ImportStudentRow[]) => ImportResult;
  toggleGoogleCalendarLink: (userId: string, email?: string) => void;

  // Data Creation and Management CRUD
  addCourse: (data: Omit<Course, 'id'>) => { success: boolean; course?: Course; error?: string };
  updateCourse: (id: string, updates: Partial<Course>) => void;
  deleteCourse: (id: string) => void;

  addRoom: (data: Omit<Room, 'id'>) => { success: boolean; room?: Room; error?: string };
  updateRoom: (id: string, updates: Partial<Room>) => void;
  deleteRoom: (id: string) => void;

  addTeacher: (data: { name: string; email: string; phone?: string; subjects: string[]; weeklyMaxHours?: number }) => { success: boolean; teacher?: User; error?: string };
  updateTeacher: (id: string, updates: Partial<User>) => void;
  deleteTeacher: (id: string) => void;

  addGroup: (data: Omit<StudentGroup, 'id'>) => { success: boolean; group?: StudentGroup; error?: string };
  updateGroup: (id: string, updates: Partial<StudentGroup>) => void;
  deleteGroup: (id: string) => void;

  addFiliere: (data: Omit<Filiere, 'id'>) => { success: boolean; filiere?: Filiere; error?: string };
  updateFiliere: (id: string, updates: Partial<Filiere>) => void;
  deleteFiliere: (id: string) => void;
  domaines: string[];
  addDomaine: (name: string) => { success: boolean; error?: string };
  updateDomaine: (oldName: string, newName: string) => { success: boolean; error?: string };
  deleteDomaine: (name: string) => { success: boolean; error?: string };

  seedBatchDemoData: () => void;

  // Stats calculation
  getCourseHourlyStats: (courseId: string) => CourseHourlyStats;
  getTeacherHourlyStats: (teacherId: string) => TeacherHourlyStats;

  // Academic Years & Maquettes LMD + Parcours + Validation Rules
  academicYears: AcademicYear[];
  selectedAcademicYear: string;
  setSelectedAcademicYear: (year: string) => void;
  createAcademicYear: (data: { code: string; name: string; startDate: string; endDate: string; isCurrent?: boolean; cloneFromPrevious?: boolean }) => { success: boolean; academicYear?: AcademicYear; error?: string };
  updateAcademicYear: (id: string, updates: Partial<AcademicYear>) => void;
  deleteAcademicYear: (id: string) => void;
  setActiveAcademicYear: (code: string) => void;
  parcours: Parcours[];
  addParcours: (data: Omit<Parcours, 'id'>) => { success: boolean; parcours?: Parcours; error?: string };
  updateParcours: (id: string, updates: Partial<Parcours>) => void;
  deleteParcours: (id: string) => void;
  academicRules: AcademicValidationRules[];
  getActiveAcademicRules: (yearCode?: string) => AcademicValidationRules;
  updateAcademicRules: (yearCode: string, updates: Partial<AcademicValidationRules>) => void;
  ues: UniteEnseignement[];
  ecs: ElementConstitutif[];
  inscriptions: StudentInscription[];
  addUe: (data: Omit<UniteEnseignement, 'id'>) => { success: boolean; ue?: UniteEnseignement; error?: string };
  updateUe: (id: string, updates: Partial<UniteEnseignement>) => void;
  deleteUe: (id: string) => void;
  addEc: (data: Omit<ElementConstitutif, 'id'>) => { success: boolean; ec?: ElementConstitutif; error?: string };
  updateEc: (id: string, updates: Partial<ElementConstitutif>) => void;
  deleteEc: (id: string) => void;
  duplicateMaquette: (sourceYear: string, targetYear: string) => { success: boolean; countUe: number; countEc: number; message: string };
  inscribeStudent: (
    studentId: string,
    academicYear: string,
    filiereId: string,
    level: string,
    groupId: string,
    extra?: {
      parcoursId?: string;
      inscriptionType?: 'INSCRIPTION' | 'REINSCRIPTION';
      academicStatus?: StudentInscription['academicStatus'];
      documents?: StudentInscription['documents'];
    }
  ) => { success: boolean; error?: string; inscription?: StudentInscription };

  // Grades / Évaluations LMD & Délibérations du Jury
  grades: EcGrade[];
  saveGrade: (studentId: string, ecId: string, quizScore?: number, examScore?: number, isDraft?: boolean, comment?: string, rattrapageScore?: number) => void;
  publishGrades: (ecId: string) => void;
  calculateEcFinalScore: (quizScore?: number, examScore?: number, ecId?: string) => number | undefined;
  getStudentEcGrade: (studentId: string, ecId: string) => EcGrade | undefined;
  getStudentUeSummary: (studentId: string, ueId: string) => { average: number; isPassed: boolean; totalCredits: number; validatedCredits: number; ecDetails: { ec: ElementConstitutif; grade?: EcGrade; isPassed: boolean }[] };
  deliberations: DeliberationRecord[];
  saveDeliberationRecord: (record: Omit<DeliberationRecord, 'id'> & { id?: string }) => DeliberationRecord;
  lockGroupDeliberations: (academicYear: string, semester: SemesterCode | 'ANNUEL', groupId: string) => void;
  computeStudentDeliberationPreview: (studentId: string, academicYear: string, semester: SemesterCode | 'ANNUEL', bonusPoints?: number) => {
    rawAverage: number;
    finalAverage: number;
    totalCreditsAttempted: number;
    validatedCredits: number;
    hasEliminatoryGrade: boolean;
    attendanceRate: number;
    financialClearance: boolean;
    proposedDecision: DeliberationDecision;
    existingRecord?: DeliberationRecord;
  };

  // QR Code Attendance & Manual Admin Attendance
  qrSessions: QrAttendanceSession[];
  activeQrSession: QrAttendanceSession | null;
  generateQrSession: (sessionId: string, courseTitle: string, ecCode: string, roomName: string, teacherId: string, groupId: string, validityMinutes?: number) => QrAttendanceSession;
  rotateQrSessionToken: (qrSessionId: string, validityMinutes?: number) => string | undefined;
  stopQrSession: (qrSessionId: string) => void;
  scanQrAttendance: (codeToken: string, studentId: string) => { success: boolean; message: string; record?: AttendanceRecord };
  updateAttendanceStatus: (qrSessionId: string, studentId: string, status: 'PRESENT' | 'ABSENT' | 'LATE' | 'JUSTIFIED', reason?: string) => void;
  recordManualAdminAttendance: (data: {
    groupId: string;
    ecCode: string;
    courseTitle: string;
    date: string;
    studentId: string;
    status: 'PRESENT' | 'ABSENT' | 'LATE' | 'JUSTIFIED';
    reason?: string;
    note?: string;
  }) => QrAttendanceSession;

  // Messaging & Group Wall
  internalMessages: InternalMessage[];
  groupPosts: GroupPost[];
  sendMessage: (data: { recipientId?: string; recipientGroupId?: string; subject: string; content: string }) => void;
  markMessageAsRead: (messageId: string) => void;
  createGroupPost: (data: { groupId: string; title: string; content: string; category: GroupPost['category']; isPinned?: boolean }) => void;
  deleteGroupPost: (postId: string) => void;

  // Financial Management in Ariary (Ar) & Cash Register
  fees: StudentFee[];
  payments: PaymentTransaction[];
  cashRegisterDays: CashRegisterDay[];
  addFee: (data: Omit<StudentFee, 'id'>) => void;
  updateFee: (id: string, updates: Partial<StudentFee>) => void;
  deleteFee: (id: string) => void;
  recordPayment: (data: { studentId: string; feeId: string; amountPaidAr: number; paymentMethod: PaymentMethod; referenceNumber?: string; notes?: string }) => { success: boolean; transaction?: PaymentTransaction; receiptNumber?: string; error?: string };
  cancelPayment: (paymentId: string, reason: string) => void;
  closeCashRegisterDay: (date: string, actualClosingAr: number, closureNotes?: string) => { success: boolean; discrepancyAr: number; message: string };
  getStudentFinancialSummary: (studentId: string) => { totalFeesAr: number; totalPaidAr: number; balanceDueAr: number; feeDetails: { fee: StudentFee; paidAr: number; remainingAr: number; status: 'PAID' | 'PARTIAL' | 'UNPAID' }[] };

  // Homework & Learning Resources
  homework: HomeworkAssignment[];
  submissions: HomeworkSubmission[];
  learningResources: LearningResource[];
  createHomework: (data: Omit<HomeworkAssignment, 'id' | 'publishedAt'>) => void;
  submitHomework: (homeworkId: string, fileName: string, fileSize: string, studentComment?: string, fileSizeBytes?: number, fileUrl?: string) => { success: boolean; error?: string; submission?: HomeworkSubmission };
  gradeSubmission: (submissionId: string, grade: number, feedback: string) => void;
  addLearningResource: (data: Omit<LearningResource, 'id' | 'publishedAt'>) => { success: boolean; error?: string; resource?: LearningResource };
  deleteLearningResource: (id: string) => void;
  archiveOldResources: (academicYear?: string) => number;

  // Selective student export
  getSelectiveStudentExportData: (role: 'TEACHER' | 'ADMIN', groupId?: string) => { headers: string[]; rows: string[][] };

  // Application Settings (OpenEduCat vertical/horizontal layout, visible items, etc.)
  appSettings: AppSettings;
  updateAppSettings: (updates: Partial<AppSettings>) => void;

  // Custom RBAC Roles, Profile Change Requests, Student Cards & Parent Portal (SIS v1.2)
  customRoles: CustomRoleDefinition[];
  addCustomRole: (data: Omit<CustomRoleDefinition, 'id' | 'createdAt'>) => CustomRoleDefinition;
  updateCustomRole: (id: string, updates: Partial<CustomRoleDefinition>) => void;
  deleteCustomRole: (id: string) => void;
  profileChangeRequests: ProfileChangeRequest[];
  requestProfileChange: (studentId: string, changes: ProfileChangeRequest['changes'], reason: string) => ProfileChangeRequest;
  approveProfileChangeRequest: (requestId: string, comment?: string) => void;
  rejectProfileChangeRequest: (requestId: string, comment?: string) => void;
  reissueStudentCard: (studentId: string, reason?: string) => { newToken: string; issueNumber: number };
  findStudentByScanCode: (code: string) => { status: 'FOUND' | 'REVOKED' | 'NOT_FOUND'; student?: User; message: string };
  linkParentToStudent: (parentId: string, studentId: string) => void;
  unlinkParentFromStudent: (parentId: string, studentId: string) => void;

  // Messenger / Live Chat
  chatMessages: ChatMessage[];
  sendChatMessage: (recipientId: string, text: string) => void;
  markChatAsRead: (recipientId: string) => void;
  onlineUsers: string[];

  // Cloud Firebase Auth, Firestore Sync & Backup/Restore
  firebaseUser: FirebaseUser | null;
  isCloudConnected: boolean;
  cloudSyncStatus: 'IDLE' | 'SYNCING' | 'SYNCED' | 'ERROR';
  loginWithGoogleFirebase: () => Promise<{ success: boolean; message: string }>;
  syncAllToCloudFirestore: () => Promise<{ success: boolean; totalSynced: number; message: string }>;
  pullFromCloudFirestore: () => Promise<{ success: boolean; totalPulled: number; message: string }>;
  savedBackups: SystemBackupSnapshot[];
  createSystemBackup: (label?: string) => SystemBackupSnapshot;
  restoreSystemBackup: (snapshot: SystemBackupSnapshot) => { success: boolean; message: string };

  // Helpers
  resetToDefaultData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  USERS: 'ebm_users_v3',
  COURSES: 'ebm_courses_v3',
  ROOMS: 'ebm_rooms_v3',
  GROUPS: 'ebm_groups_v3',
  FILIERES: 'ebm_filieres_v3',
  PARCOURS: 'ebm_parcours_v3',
  ACADEMIC_RULES: 'ebm_academic_rules_v3',
  DELIBERATIONS: 'ebm_deliberations_v3',
  BACKUPS: 'ebm_backups_v3',
  SESSIONS: 'ebm_sessions_v3',
  NOTIFICATIONS: 'ebm_notifications_v3',
  AUDIT_LOGS: 'ebm_audit_logs_v3',
  CURRENT_USER_ID: 'ebm_current_user_id_v3',
  ACADEMIC_YEARS: 'ebm_academic_years_v3',
  SELECTED_YEAR: 'ebm_selected_year_v3',
  APP_SETTINGS: 'ebm_app_settings_v3',
  CHAT_MESSAGES: 'ebm_chat_messages_v3',
  UES: 'ebm_ues_v3',
  ECS: 'ebm_ecs_v3',
  INSCRIPTIONS: 'ebm_inscriptions_v3',
  GRADES: 'ebm_grades_v3',
  QR_SESSIONS: 'ebm_qr_sessions_v3',
  MESSAGES: 'ebm_messages_v3',
  POSTS: 'ebm_posts_v3',
  FEES: 'ebm_fees_v3',
  PAYMENTS: 'ebm_payments_v3',
  CASH_DAYS: 'ebm_cash_days_v3',
  HOMEWORK: 'ebm_homework_v3',
  SUBMISSIONS: 'ebm_submissions_v3',
  RESOURCES: 'ebm_resources_v3',
  CUSTOM_ROLES: 'ebm_custom_roles_v3',
  PROFILE_REQUESTS: 'ebm_profile_requests_v3',
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load from localStorage or mockData, ensuring new accounts & SIS v1.2 fields exist
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!saved) return initialUsers;
    const parsed: User[] = JSON.parse(saved);
    const legacyEuropeanNames = new Set([
      'Alexandre Morel',
      'Sandrine Girard',
      'Dr. Patrice Dumas',
      'Dr. Marc Vasseur',
      'Prof. Sophie Martin',
      'Ing. David Leroy',
      'Thomas Laurent',
      'Sarah Kaboré',
      'Lucas Petit',
      'Maxime Désactivé',
      'Mme Lalao Petit (Mère)',
      'Dr. Claire Dubois',
    ]);
    const enriched: User[] = parsed.map((u): User => {
      const seed = initialUsers.find((iu) => iu.id === u.id);
      if (!seed) {
        if (u.name === 'Dr. Claire Dubois') {
          return {
            ...u,
            username: 'mialy.ravelojaona',
            name: 'Dr. Mialy Ravelojaona',
            civilite: 'Dr.' as const,
            lastName: 'Ravelojaona',
            firstName: 'Mialy',
            email: 'mialy.ravelojaona@ebm-institute.edu',
            phone: '+261 34 45 678 90',
          };
        }
        if (u.role === 'STUDENT' && !u.cardToken) {
          return {
            ...u,
            cardToken: `EBM-CARD-${(u.matricule || u.id).slice(-4)}-V1`,
            cardIssueNumber: 1,
            cardIssuedAt: '2026-09-01',
          };
        }
        return u;
      }
      const shouldMigrateIdentity = legacyEuropeanNames.has(u.name);
      return {
        ...seed,
        ...u,
        name: shouldMigrateIdentity ? seed.name : u.name,
        username: shouldMigrateIdentity ? seed.username : u.username,
        civilite: shouldMigrateIdentity ? seed.civilite : (u.civilite || seed.civilite),
        lastName: shouldMigrateIdentity ? seed.lastName : (u.lastName || seed.lastName),
        firstName: shouldMigrateIdentity ? seed.firstName : (u.firstName || seed.firstName),
        email: shouldMigrateIdentity ? seed.email : u.email,
        parentRelation: shouldMigrateIdentity ? seed.parentRelation : (u.parentRelation || seed.parentRelation),
        cardToken: u.cardToken || seed.cardToken,
        cardIssueNumber: u.cardIssueNumber || seed.cardIssueNumber || 1,
        cardIssuedAt: u.cardIssuedAt || seed.cardIssuedAt,
        revokedCardTokens: u.revokedCardTokens || seed.revokedCardTokens || [],
        parentContacts: shouldMigrateIdentity ? seed.parentContacts : (u.parentContacts || seed.parentContacts),
        phones: u.phones || seed.phones || (u.phone ? [u.phone] : []),
        birthPlace: u.birthPlace || seed.birthPlace,
        address: u.address || seed.address,
        postalCode: u.postalCode || seed.postalCode,
        city: u.city || seed.city,
        originSchool: shouldMigrateIdentity ? seed.originSchool : (u.originSchool || seed.originSchool),
        bacSeries: u.bacSeries || seed.bacSeries,
        linkedInUrl: shouldMigrateIdentity ? seed.linkedInUrl : (u.linkedInUrl || seed.linkedInUrl),
        department: u.department || seed.department,
        service: u.service || seed.service,
        jobTitle: shouldMigrateIdentity ? seed.jobTitle : (u.jobTitle || seed.jobTitle),
        academicRank: u.academicRank || seed.academicRank,
        highestDiploma: u.highestDiploma || seed.highestDiploma,
        almaMater: u.almaMater || seed.almaMater,
        hireDate: u.hireDate || seed.hireDate,
        hourlyRateAr: u.hourlyRateAr ?? seed.hourlyRateAr,
        contractType: u.contractType || seed.contractType,
        availabilities: u.availabilities && u.availabilities.length > 0 ? u.availabilities : seed.availabilities,
        specialty: u.specialty || seed.specialty,
        cin: u.cin || seed.cin,
        bankRib: u.bankRib || seed.bankRib,
        officeLocation: u.officeLocation || seed.officeLocation,
        linkedStudentIds: u.linkedStudentIds || seed.linkedStudentIds,
        parentVerificationStatus: u.parentVerificationStatus || seed.parentVerificationStatus,
        parentAccessConsent: u.parentAccessConsent || seed.parentAccessConsent,
        isAdult: u.isAdult ?? seed.isAdult,
      };
    });
    const missingInitial = initialUsers.filter((iu) => !enriched.some((p) => p.id === iu.id));
    return missingInitial.length > 0 ? [...enriched, ...missingInitial] : enriched;
  });

  const [courses, setCourses] = useState<Course[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.COURSES);
    return saved ? JSON.parse(saved) : initialCourses;
  });

  const [rooms, setRooms] = useState<Room[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ROOMS);
    return saved ? JSON.parse(saved) : initialRooms;
  });

  const [groups, setGroups] = useState<StudentGroup[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.GROUPS);
    return saved ? JSON.parse(saved) : initialGroups;
  });

  const [filieres, setFilieres] = useState<Filiere[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.FILIERES);
    if (!saved) return initialFilieres;
    const parsed: Filiere[] = JSON.parse(saved);
    return parsed.map((f) => {
      const seed = initialFilieres.find((ifil) => ifil.id === f.id);
      return {
        ...f,
        domaine: f.domaine || seed?.domaine || 'Sciences et Technologies',
        etablissement: f.etablissement || seed?.etablissement || 'EBM Institute',
      };
    });
  });

  const [domaines, setDomaines] = useState<string[]>(() => {
    const saved = localStorage.getItem('ebm_domaines_v3');
    if (saved) return JSON.parse(saved);
    return [
      'Sciences et Technologies',
      'Sciences de Gestion & Économie',
      'Sciences de l’Ingénieur & Numérique',
      'Droit, Gouvernance & Relations Internationales',
    ];
  });

  const addDomaine = (name: string): { success: boolean; error?: string } => {
    const clean = name.trim();
    if (!clean) return { success: false, error: 'Le nom du domaine est obligatoire.' };
    if (domaines.includes(clean)) {
      return { success: false, error: 'Ce domaine existe déjà.' };
    }
    setDomaines((prev) => {
      const next = [...prev, clean];
      localStorage.setItem('ebm_domaines_v3', JSON.stringify(next));
      return next;
    });
    return { success: true };
  };

  const updateDomaine = (oldName: string, newName: string): { success: boolean; error?: string } => {
    const clean = newName.trim();
    if (!clean) return { success: false, error: 'Le nouveau nom du domaine est obligatoire.' };
    if (clean !== oldName && domaines.includes(clean)) {
      return { success: false, error: 'Ce domaine existe déjà.' };
    }
    setDomaines((prev) => {
      const next = prev.map((d) => (d === oldName ? clean : d));
      localStorage.setItem('ebm_domaines_v3', JSON.stringify(next));
      return next;
    });
    setFilieres((prev) =>
      prev.map((f) => ((f.domaine || 'Sciences et Technologies') === oldName ? { ...f, domaine: clean } : f))
    );
    logAudit('MODIFICATION_DOMAINE_LMD', `Renommage du domaine LMD "${oldName}" en "${clean}"`);
    return { success: true };
  };

  const deleteDomaine = (name: string): { success: boolean; error?: string } => {
    const linked = filieres.some((f) => (f.domaine || 'Sciences et Technologies') === name);
    if (linked) {
      return {
        success: false,
        error: `Impossible de supprimer le domaine "${name}" car des Mentions y sont rattachées.`,
      };
    }
    setDomaines((prev) => {
      const next = prev.filter((d) => d !== name);
      localStorage.setItem('ebm_domaines_v3', JSON.stringify(next));
      return next;
    });
    return { success: true };
  };

  const [sessions, setSessions] = useState<TimetableSession[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    return saved ? JSON.parse(saved) : initialSessions;
  });

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    return saved ? JSON.parse(saved) : initialNotifications;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
    return saved ? JSON.parse(saved) : initialAuditLogs;
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('ebm_auth_logged_in') === 'true';
  });

  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID) || 'user-admin';
  });

  const [isAndroidView, setIsAndroidView] = useState<boolean>(false);
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);
  const [lastSyncDate, setLastSyncDate] = useState<Date>(new Date());
  const [activePushBanner, setActivePushBanner] = useState<AppNotification | null>(null);

  // Complementary LMD states & Academic Years
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ACADEMIC_YEARS);
    return saved ? JSON.parse(saved) : initialAcademicYears;
  });

  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.SELECTED_YEAR) || '2026-2027';
  });

  // App Settings (OpenEduCat vertical vs horizontal layout, custom visible items, storage settings)
  const [appSettings, setAppSettings] = useState<AppSettings>(() => {
    const defaultSettings: AppSettings = {
      menuLayout: 'vertical', // OpenEduCat 19 vertical sidebar by default!
      visibleMenuItems: [
        'HOME',
        'TIMETABLE',
        'ROOMS',
        'LMD_MAQUETTES',
        'GRADES',
        'QR_ATTENDANCE',
        'STUDENTS',
        'TEACHERS',
        'PARENT_PORTAL',
        'FINANCIAL',
        'HOMEWORK_RESOURCES',
        'COMMUNICATION',
        'ACADEMIC_YEARS',
        'SETTINGS',
        'USERS_MANAGEMENT',
      ],
      compactMode: false,
      showLiveChat: true,
      theme: 'light',
      primaryColor: '#c2182b',
      storageSettings: {
        maxFileSizeMb: 15,
        allowedExtensions: ['PDF', 'DOCX', 'XLSX', 'PPTX', 'JPG', 'PNG', 'ZIP'],
        globalQuotaMb: 5000,
        studentQuotaMb: 100,
        teacherQuotaMb: 500,
        autoArchiveClosedYears: true,
      },
    };
    const saved = localStorage.getItem(STORAGE_KEYS.APP_SETTINGS);
    if (saved) {
      const parsed = JSON.parse(saved);
      const items = parsed.visibleMenuItems || [];
      if (!items.includes('STUDENTS')) items.push('STUDENTS');
      if (!items.includes('TEACHERS')) items.push('TEACHERS');
      if (!items.includes('PARENT_PORTAL')) items.push('PARENT_PORTAL');
      return {
        ...defaultSettings,
        ...parsed,
        visibleMenuItems: items,
        storageSettings: { ...defaultSettings.storageSettings!, ...(parsed.storageSettings || {}) },
      };
    }
    return defaultSettings;
  });

  const updateAppSettings = (updates: Partial<AppSettings>) => {
    setAppSettings((prev) => {
      const updated = { ...prev, ...updates };
      if (updates.systemRolePermissions !== undefined) {
        syncSystemRolePermissions(updated.systemRolePermissions);
      }
      localStorage.setItem(STORAGE_KEYS.APP_SETTINGS, JSON.stringify(updated));
      return updated;
    });
  };

  // Keep system role permissions synchronized with appSettings
  syncSystemRolePermissions(appSettings.systemRolePermissions);

  // Live Chat / Messenger Messages
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    const defaultChat: ChatMessage[] = [
      {
        id: 'msg-1',
        senderId: 'user-teacher-1',
        recipientId: 'user-admin',
        text: 'Bonjour ! Les syllabus et maquettes pour le cours d\'Algorithmique ont été mis à jour.',
        timestamp: 'Hier 16:40',
        isRead: true,
      },
      {
        id: 'msg-2',
        senderId: 'user-admin',
        recipientId: 'user-teacher-1',
        text: 'Parfait Dr. Hery, les étudiants peuvent désormais y accéder sur Web & Android.',
        timestamp: 'Hier 17:15',
        isRead: true,
      },
      {
        id: 'msg-3',
        senderId: 'user-student-1',
        recipientId: 'user-admin',
        text: 'Bonjour, j\'ai une question concernant mon attestation d\'inscription pour 2026-2027.',
        timestamp: 'Aujourd\'hui 08:30',
        isRead: false,
      },
    ];
    const saved = localStorage.getItem(STORAGE_KEYS.CHAT_MESSAGES);
    return saved ? JSON.parse(saved) : defaultChat;
  });

  const [ues, setUes] = useState<UniteEnseignement[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.UES);
    return saved ? JSON.parse(saved) : initialUes;
  });

  const [ecs, setEcs] = useState<ElementConstitutif[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ECS);
    return saved ? JSON.parse(saved) : initialEcs;
  });

  const [inscriptions, setInscriptions] = useState<StudentInscription[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.INSCRIPTIONS);
    return saved ? JSON.parse(saved) : initialInscriptions;
  });

  const [grades, setGrades] = useState<EcGrade[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.GRADES);
    if (!saved) return initialGrades;
    const parsed: EcGrade[] = JSON.parse(saved);
    const enriched = parsed.map((g) => {
      const seed = initialGrades.find((ig) => ig.id === g.id);
      const ec = initialEcs.find((e) => e.id === g.ecId);
      return {
        ...seed,
        ...g,
        semester: g.semester || ec?.semester || 'S1',
        session1Score: g.session1Score ?? seed?.session1Score ?? g.finalScore,
        rattrapageScore: g.rattrapageScore ?? seed?.rattrapageScore,
      };
    });
    const missingGrades = initialGrades.filter((ig) => !enriched.some((g) => g.id === ig.id));
    return missingGrades.length > 0 ? [...enriched, ...missingGrades] : enriched;
  });

  const [qrSessions, setQrSessions] = useState<QrAttendanceSession[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.QR_SESSIONS);
    return saved ? JSON.parse(saved) : initialQrSessions;
  });

  const [internalMessages, setInternalMessages] = useState<InternalMessage[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    return saved ? JSON.parse(saved) : initialMessages;
  });

  const [groupPosts, setGroupPosts] = useState<GroupPost[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.POSTS);
    return saved ? JSON.parse(saved) : initialGroupPosts;
  });

  const [fees, setFees] = useState<StudentFee[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.FEES);
    if (!saved) return initialFees;
    const parsed: StudentFee[] = JSON.parse(saved);
    // Ensure standard institutional fees are not locked to a single groupId so all students can select them
    const normalized = parsed.map((f) => {
      if (['fee-insc-2026', 'fee-ecol-s1', 'fee-ecol-s2', 'fee-labo-2026'].includes(f.id)) {
        const { groupId: _removed, ...rest } = f;
        return rest;
      }
      return f;
    });
    const missingFees = initialFees.filter((ifee) => !normalized.some((f) => f.id === ifee.id));
    return missingFees.length > 0 ? [...normalized, ...missingFees] : normalized;
  });

  const [payments, setPayments] = useState<PaymentTransaction[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
    return saved ? JSON.parse(saved) : initialPayments;
  });

  const [cashRegisterDays, setCashRegisterDays] = useState<CashRegisterDay[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CASH_DAYS);
    return saved ? JSON.parse(saved) : initialCashRegisterDays;
  });

  const [homework, setHomework] = useState<HomeworkAssignment[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.HOMEWORK);
    return saved ? JSON.parse(saved) : initialHomework;
  });

  const [submissions, setSubmissions] = useState<HomeworkSubmission[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SUBMISSIONS);
    return saved ? JSON.parse(saved) : initialSubmissions;
  });

  const [learningResources, setLearningResources] = useState<LearningResource[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.RESOURCES);
    return saved ? JSON.parse(saved) : initialLearningResources;
  });

  const [parcours, setParcours] = useState<Parcours[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PARCOURS);
    return saved ? JSON.parse(saved) : initialParcours;
  });

  const [academicRules, setAcademicRules] = useState<AcademicValidationRules[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ACADEMIC_RULES);
    return saved ? JSON.parse(saved) : initialAcademicRules;
  });

  const [deliberations, setDeliberations] = useState<DeliberationRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.DELIBERATIONS);
    return saved ? JSON.parse(saved) : initialDeliberations;
  });

  const [savedBackups, setSavedBackups] = useState<SystemBackupSnapshot[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.BACKUPS);
    return saved ? JSON.parse(saved) : [];
  });

  const [customRoles, setCustomRoles] = useState<CustomRoleDefinition[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CUSTOM_ROLES);
    if (saved) return JSON.parse(saved);
    return [
      {
        id: 'crole-surveillant',
        code: 'SURVEILLANT_EXAMEN',
        label: 'Surveillant d’Examens & Assiduité',
        baseRole: 'ADMIN_STAFF',
        description: 'Pointage QR Code, contrôle des cartes étudiantes et consultation des salles d’examen.',
        allowedTabs: ['HOME', 'TIMETABLE', 'ROOMS', 'QR_ATTENDANCE', 'STUDENTS'],
        allowedOperations: ['CONSULTATION', 'VALIDATION'],
        canAccessSensitiveData: false,
        createdAt: '2026-09-01T08:00:00.000Z',
      },
      {
        id: 'crole-bibliothecaire',
        code: 'RESPONSABLE_RESSOURCES',
        label: 'Responsable Bibliothèque & Supports',
        baseRole: 'ADMIN_STAFF',
        description: 'Gestion des supports pédagogiques, vérification des cartes étudiantes par code-barres et annuaire.',
        allowedTabs: ['HOME', 'HOMEWORK_RESOURCES', 'STUDENTS', 'COMMUNICATION'],
        allowedOperations: ['CONSULTATION', 'CREATION', 'MODIFICATION', 'TELECHARGEMENT'],
        canAccessSensitiveData: false,
        createdAt: '2026-09-01T08:00:00.000Z',
      },
    ];
  });

  const [profileChangeRequests, setProfileChangeRequests] = useState<ProfileChangeRequest[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PROFILE_REQUESTS);
    return saved ? JSON.parse(saved) : [];
  });

  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(false);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'IDLE' | 'SYNCING' | 'SYNCED' | 'ERROR'>('IDLE');

  // Listen to Firebase Auth state & verify Cloud Firestore connection
  useEffect(() => {
    testFirestoreConnection().then((res) => {
      setIsCloudConnected(res.connected);
    });
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        setIsCloudConnected(true);
      }
    });
    return () => unsubscribe();
  }, []);

  // Sync state to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }, [users]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(courses));
  }, [courses]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(rooms));
  }, [rooms]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(groups));
  }, [groups]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.FILIERES, JSON.stringify(filieres));
  }, [filieres]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
  }, [sessions]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
  }, [notifications]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(auditLogs));
  }, [auditLogs]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, currentUserId);
  }, [currentUserId]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SELECTED_YEAR, selectedAcademicYear);
  }, [selectedAcademicYear]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.UES, JSON.stringify(ues));
  }, [ues]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ECS, JSON.stringify(ecs));
  }, [ecs]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.INSCRIPTIONS, JSON.stringify(inscriptions));
  }, [inscriptions]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.GRADES, JSON.stringify(grades));
  }, [grades]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.QR_SESSIONS, JSON.stringify(qrSessions));
  }, [qrSessions]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(internalMessages));
  }, [internalMessages]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(groupPosts));
  }, [groupPosts]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.FEES, JSON.stringify(fees));
  }, [fees]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));
  }, [payments]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CASH_DAYS, JSON.stringify(cashRegisterDays));
  }, [cashRegisterDays]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.HOMEWORK, JSON.stringify(homework));
  }, [homework]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(submissions));
  }, [submissions]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.RESOURCES, JSON.stringify(learningResources));
  }, [learningResources]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ACADEMIC_YEARS, JSON.stringify(academicYears));
  }, [academicYears]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CHAT_MESSAGES, JSON.stringify(chatMessages));
  }, [chatMessages]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PARCOURS, JSON.stringify(parcours));
  }, [parcours]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ACADEMIC_RULES, JSON.stringify(academicRules));
  }, [academicRules]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DELIBERATIONS, JSON.stringify(deliberations));
  }, [deliberations]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.BACKUPS, JSON.stringify(savedBackups));
  }, [savedBackups]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CUSTOM_ROLES, JSON.stringify(customRoles));
  }, [customRoles]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PROFILE_REQUESTS, JSON.stringify(profileChangeRequests));
  }, [profileChangeRequests]);

  const currentUser = users.find((u) => u.id === currentUserId) || users[0];

  const setCurrentUser = (user: User) => {
    setCurrentUserId(user.id);
  };

  const login = (identifier: string, _password?: string) => {
    const cleanId = identifier.trim().toLowerCase();
    const legacyAliasMap: Record<string, string> = {
      'alexandre.morel@ebm-institute.edu': 'user-admin',
      'sandrine.girard@ebm-institute.edu': 'user-scheduler',
      'patrice.dumas@ebm-institute.edu': 'user-academic',
      'marc.vasseur@ebm-institute.edu': 'user-teacher-vasseur',
      'sophie.martin@ebm-institute.edu': 'user-teacher-martin',
      'david.leroy@ebm-institute.edu': 'user-teacher-leroy',
      'lalao.petit@parent.ebm.mg': 'user-parent-2',
    };
    const mappedUserId = legacyAliasMap[cleanId];
    const found = users.find(
      (u) =>
        (mappedUserId && u.id === mappedUserId) ||
        u.matricule?.toLowerCase() === cleanId ||
        u.username.toLowerCase() === cleanId ||
        u.email.toLowerCase() === cleanId
    );

    if (!found) {
      return {
        success: false,
        error: `Identifiant "${identifier}" introuvable. Veuillez vérifier votre matricule (ex: EBM-2026-0042) ou adresse e-mail institutionnelle.`,
      };
    }

    // RG-22 Check: Account deactivation blocks access on Web and Android
    if (!found.isActive) {
      logAudit('TENTATIVE_CONNEXION_BLOQUEE', `Tentative de connexion sur compte désactivé : ${found.name} (${found.matricule || found.username})`);
      return {
        success: false,
        error: `Accès refusé (RG-22) : Le compte de ${found.name} (${found.matricule || found.username}) a été désactivé par l'administration. Veuillez contacter la scolarité de l'EBM Institute.`,
      };
    }

    setCurrentUserId(found.id);
    setIsAuthenticated(true);
    localStorage.setItem('ebm_auth_logged_in', 'true');
    logAudit('CONNEXION', `Connexion réussie de ${found.name} [Rôle: ${found.role}]`);

    // Ensure background anonymous or active Firebase session if available
    if (!auth.currentUser) {
      signInAnonymously(auth).catch(() => {
        // Ignore if anonymous auth is not enabled in console; Google Sign-In is primary
      });
    }

    return { success: true };
  };

  const loginWithGoogleFirebase = async (): Promise<{ success: boolean; message: string }> => {
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const fbUser = cred.user;
      setFirebaseUser(fbUser);
      setIsCloudConnected(true);

      const emailLower = (fbUser.email || '').toLowerCase();
      let matchedUser = users.find((u) => u.email.toLowerCase() === emailLower);

      if (!matchedUser) {
        const isBootstrappedAdmin = emailLower === 'louvamifaly@gmail.com';
        const newPortalUser: User = {
          id: `user-fb-${fbUser.uid.slice(0, 8)}`,
          uid: fbUser.uid,
          username: emailLower.split('@')[0] || 'user.ebm',
          name: fbUser.displayName || 'Administrateur EBM',
          email: fbUser.email || 'admin@ebm-institute.edu',
          role: isBootstrappedAdmin ? 'ADMIN' : 'ADMIN',
          isActive: true,
          avatarUrl: fbUser.photoURL || undefined,
          googleCalendarLinked: true,
          googleEmail: fbUser.email || undefined,
        };
        setUsers((prev) => [newPortalUser, ...prev]);
        matchedUser = newPortalUser;
        await syncDocToFirestore('users', newPortalUser);
      } else {
        const updatedUser = { ...matchedUser, uid: fbUser.uid };
        setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
        await syncDocToFirestore('users', updatedUser);
      }

      setCurrentUserId(matchedUser.id);
      setIsAuthenticated(true);
      localStorage.setItem('ebm_auth_logged_in', 'true');
      logAudit('CONNEXION_FIREBASE_GOOGLE', `Authentification Firebase officielle de ${fbUser.email} [UID: ${fbUser.uid}]`);
      return { success: true, message: `Connecté via Firebase Authentication (${fbUser.email})` };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: `Authentification Google interrompue : ${msg}` };
    }
  };

  const logout = () => {
    logAudit('DECONNEXION', `Déconnexion de ${currentUser?.name || 'utilisateur'}`);
    setIsAuthenticated(false);
    localStorage.removeItem('ebm_auth_logged_in');
    if (auth.currentUser) {
      signOut(auth).catch(() => {});
    }
  };

  const switchUserRole = (role: UserRole) => {
    const targetUser = users.find((u) => u.role === role && u.isActive);
    if (targetUser) {
      setCurrentUserId(targetUser.id);
    }
  };

  const toggleAndroidView = () => {
    setIsAndroidView((prev) => !prev);
  };

  const toggleOfflineMode = () => {
    setIsOfflineMode((prev) => !prev);
    if (!isOfflineMode) {
      setLastSyncDate(new Date());
    }
  };

  const dismissPushBanner = () => {
    setActivePushBanner(null);
  };

  const logAudit = (action: string, details: string, platform: 'WEB' | 'ANDROID' = isAndroidView ? 'ANDROID' : 'WEB') => {
    const newLog: AuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action,
      details,
      platform,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
    // Persist immutable audit log to Cloud Firestore when authenticated
    syncDocToFirestore('auditLogs', newLog);
  };

  // Helper to trigger push notification
  const triggerNotification = (notif: Omit<AppNotification, 'id' | 'createdAt' | 'isReadWeb' | 'isReadAndroid' | 'pushStatus'>) => {
    const newNotif: AppNotification = {
      ...notif,
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      isReadWeb: false,
      isReadAndroid: false,
      pushStatus: 'DELIVERED',
    };
    setNotifications((prev) => [newNotif, ...prev]);
    // Trigger simulated Android Push Banner
    setActivePushBanner(newNotif);
  };

  // Session Actions
  const addSession = (data: Omit<TimetableSession, 'id' | 'history'>) => {
    // Conflict check
    const check = detectSessionConflicts(
      {
        courseId: data.courseId,
        teacherId: data.teacherId,
        groupIds: data.groupIds,
        roomId: data.roomId,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
      },
      sessions,
      rooms,
      groups,
      users
    );

    if (check.hasConflict) {
      const topConflict = check.conflicts[0].message;
      return { success: false, error: topConflict };
    }

    const course = courses.find((c) => c.id === data.courseId);
    const isCustomEvent = data.sessionType && data.sessionType !== 'COURSE';
    const sessionLabel = isCustomEvent
      ? data.eventTitle || 'Conférence / Événement'
      : course?.title || data.courseId;

    const newSession: TimetableSession = {
      ...data,
      sessionType: data.sessionType || 'COURSE',
      id: `sess-${Date.now()}`,
      history: [
        {
          id: `h-${Date.now()}`,
          timestamp: new Date().toISOString(),
          authorName: currentUser.name,
          action: 'CREATION',
          details: isCustomEvent
            ? `Planification événement (${data.sessionType}) : "${sessionLabel}"`
            : `Création de séance pour le cours ${sessionLabel}`,
        },
      ],
    };

    setSessions((prev) => [...prev, newSession]);

    logAudit(
      isCustomEvent ? 'PLANIFICATION_EVENEMENT' : 'CREATION_SEANCE',
      `Ajout ${isCustomEvent ? `événement [${data.sessionType}]` : 'séance'} "${sessionLabel}" le ${data.date} ${data.startTime}-${data.endTime}`
    );

    // Notify affected teacher if assigned
    if (data.teacherId && data.teacherId !== 'EXTERNAL_SPEAKER') {
      triggerNotification({
        recipientId: data.teacherId,
        recipientRole: 'TEACHER',
        title: isCustomEvent ? `🎤 Événement planifié : ${sessionLabel}` : '📅 Nouvelle séance ajoutée',
        message: `Une séance "${sessionLabel}" vous a été attribuée le ${data.date} de ${data.startTime} à ${data.endTime}.`,
        type: 'INFO',
        sessionId: newSession.id,
      });
    }

    // Notify affected students when a conference or special event is inserted in their timetable
    if (isCustomEvent) {
      const affectedStudents = users.filter(
        (u) => u.role === 'STUDENT' && u.groupId && data.groupIds.includes(u.groupId)
      );
      affectedStudents.forEach((student) => {
        triggerNotification({
          recipientId: student.id,
          recipientRole: 'STUDENT',
          title: `🎤 Nouvel événement au planning : ${sessionLabel}`,
          message: `Événement programmé dans votre emploi du temps le ${data.date} de ${data.startTime} à ${data.endTime}${
            data.eventSpeaker ? ` — Intervenant : ${data.eventSpeaker}` : ''
          }.`,
          type: 'INFO',
          sessionId: newSession.id,
        });
      });
    }

    return { success: true, session: newSession };
  };

  const updateSession = (id: string, updates: Partial<TimetableSession>, reason?: string) => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const historyItem = {
          id: `h-${Date.now()}`,
          timestamp: new Date().toISOString(),
          authorName: currentUser.name,
          action: 'MODIFICATION',
          details: `Mise à jour: ${Object.keys(updates).join(', ')}`,
          reason,
        };
        return {
          ...s,
          ...updates,
          status: 'MODIFIED',
          history: [historyItem, ...s.history],
        };
      })
    );
    logAudit('MODIFICATION_SEANCE', `Modification séance ${id}. Raison: ${reason || 'Mise à jour opérationnelle'}`);
  };

  const rescheduleSession = (
    id: string,
    newDate: string,
    newStartTime: string,
    newEndTime: string,
    newRoomId: string,
    reason: string
  ) => {
    const current = sessions.find((s) => s.id === id);
    if (!current) return;

    // Calculate duration
    const [startH, startM] = newStartTime.split(':').map(Number);
    const [endH, endM] = newEndTime.split(':').map(Number);
    const durationHours = (endH * 60 + endM - (startH * 60 + startM)) / 60;

    const originalState = {
      originalDate: current.date,
      originalStartTime: current.startTime,
      originalEndTime: current.endTime,
      originalRoomId: current.roomId,
    };

    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const historyItem = {
          id: `h-${Date.now()}`,
          timestamp: new Date().toISOString(),
          authorName: currentUser.name,
          action: 'REPORT',
          details: `Reporté du ${originalState.originalDate} (${originalState.originalStartTime}) au ${newDate} (${newStartTime})`,
          reason,
        };
        return {
          ...s,
          date: newDate,
          startTime: newStartTime,
          endTime: newEndTime,
          roomId: newRoomId,
          durationHours,
          status: 'RESCHEDULED',
          rescheduledFrom: originalState,
          history: [historyItem, ...s.history],
        };
      })
    );

    const course = courses.find((c) => c.id === current.courseId);
    const newRoom = rooms.find((r) => r.id === newRoomId);

    logAudit(
      'REPORT_COURS',
      `Report séance ${current.id} (${course?.title}): ${originalState.originalDate} -> ${newDate} (${newStartTime}). Motif: ${reason}`
    );

    // RG-14: Notify students of the affected groups & teacher
    const affectedStudents = users.filter((u) => u.role === 'STUDENT' && u.groupId && current.groupIds.includes(u.groupId));

    affectedStudents.forEach((student) => {
      triggerNotification({
        recipientId: student.id,
        recipientRole: 'STUDENT',
        title: `📅 Cours reporté : ${course?.title || 'Cours'}`,
        message: `Initialement prévu le ${originalState.originalDate} à ${originalState.originalStartTime}, ce cours aura lieu le ${newDate} de ${newStartTime} à ${newEndTime} (${newRoom?.name || newRoomId}). Motif : ${reason}`,
        type: 'RESCHEDULE',
        sessionId: id,
      });
    });

    triggerNotification({
      recipientId: current.teacherId,
      recipientRole: 'TEACHER',
      title: `📅 Cours reporté : ${course?.title || 'Cours'}`,
      message: `Votre cours a été déplacé au ${newDate} de ${newStartTime} à ${newEndTime}. Motif : ${reason}`,
      type: 'RESCHEDULE',
      sessionId: id,
    });
  };

  const cancelSession = (id: string, reason: string) => {
    const current = sessions.find((s) => s.id === id);
    if (!current) return;

    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const historyItem = {
          id: `h-${Date.now()}`,
          timestamp: new Date().toISOString(),
          authorName: currentUser.name,
          action: 'ANNULATION',
          details: `Séance annulée. Non comptabilisée dans les heures réalisées.`,
          reason,
        };
        return {
          ...s,
          status: 'CANCELLED',
          cancellationReason: reason,
          cancellationDate: new Date().toISOString(),
          history: [historyItem, ...s.history],
        };
      })
    );

    const course = courses.find((c) => c.id === current.courseId);
    logAudit('ANNULATION_COURS', `Annulation séance ${id} (${course?.title}) le ${current.date}. Motif: ${reason}`);

    // RG-14: Notify all affected students + teacher
    const affectedStudents = users.filter((u) => u.role === 'STUDENT' && u.groupId && current.groupIds.includes(u.groupId));

    affectedStudents.forEach((student) => {
      triggerNotification({
        recipientId: student.id,
        recipientRole: 'STUDENT',
        title: `⚠️ Cours annulé : ${course?.title || 'Cours'}`,
        message: `La séance du ${current.date} de ${current.startTime} à ${current.endTime} est annulée. Motif : ${reason}`,
        type: 'CANCEL',
        sessionId: id,
      });
    });

    triggerNotification({
      recipientId: current.teacherId,
      recipientRole: 'TEACHER',
      title: `⚠️ Annulation confirmée : ${course?.title || 'Cours'}`,
      message: `La séance du ${current.date} est annulée. Motif : ${reason}`,
      type: 'CANCEL',
      sessionId: id,
    });
  };

  const validateSession = (id: string) => {
    const current = sessions.find((s) => s.id === id);
    if (!current) return;

    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const historyItem = {
          id: `h-${Date.now()}`,
          timestamp: new Date().toISOString(),
          authorName: currentUser.name,
          action: 'VALIDATION',
          details: `Séance validée comme réalisée (${s.durationHours}h ajoutées au compteur officiel)`,
        };
        return {
          ...s,
          status: 'COMPLETED_VALIDATED',
          validatedAt: new Date().toISOString(),
          validatedBy: currentUser.name,
          history: [historyItem, ...s.history],
        };
      })
    );

    const course = courses.find((c) => c.id === current.courseId);
    logAudit('VALIDATION_HEURES', `Validation séance ${id} (${course?.title}): ${current.durationHours}h réalisées.`);

    // Notification to teacher
    triggerNotification({
      recipientId: current.teacherId,
      recipientRole: 'TEACHER',
      title: `✅ Séance validée (${current.durationHours}h)`,
      message: `Votre séance de ${course?.title} du ${current.date} a été validée par la direction des études.`,
      type: 'SUCCESS',
      sessionId: id,
    });
  };

  const deleteSession = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    logAudit('SUPPRESSION_SEANCE', `Suppression définitive séance ${id}`);
  };

  // Notification methods
  const markAsRead = (id: string, platform: 'WEB' | 'ANDROID') => {
    setNotifications((prev) =>
      prev.map((n) => {
        if (n.id !== id) return n;
        return {
          ...n,
          isReadWeb: platform === 'WEB' ? true : n.isReadWeb,
          isReadAndroid: platform === 'ANDROID' ? true : n.isReadAndroid,
        };
      })
    );
  };

  const markAllAsRead = (platform: 'WEB' | 'ANDROID') => {
    setNotifications((prev) =>
      prev.map((n) => ({
        ...n,
        isReadWeb: platform === 'WEB' ? true : n.isReadWeb,
        isReadAndroid: platform === 'ANDROID' ? true : n.isReadAndroid,
      }))
    );
  };

  const sendManualPush = (title: string, message: string, type: AppNotification['type']) => {
    triggerNotification({
      recipientId: currentUser.id,
      recipientRole: currentUser.role,
      title,
      message,
      type,
    });
    logAudit('TEST_PUSH_NOTIFICATION', `Notification manuelle envoyée : "${title}"`);
  };

  // User methods
  const changePassword = (userId: string, newPassword: string) => {
    if (!newPassword || newPassword.length < 6) return false;
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u;
        return {
          ...u,
          mustChangePassword: false, // RG-03 satisfied!
          passwordHash: `hash-${newPassword.length}-secure`,
        };
      })
    );
    logAudit('MODIFICATION_MDP', `Mot de passe changé pour l'utilisateur ${userId}`);
    return true;
  };

  const toggleUserStatus = (userId: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u;
        const newStatus = !u.isActive;
        return { ...u, isActive: newStatus };
      })
    );
    const target = users.find((u) => u.id === userId);
    logAudit('MODIFICATION_STATUT_COMPTE', `Statut compte ${target?.name} (${userId}) changé à : ${!target?.isActive ? 'ACTIF' : 'DÉSACTIVÉ'}`);
  };

  // Global User Management (Section 4, RG-01, RG-05, RG-22)
  const addUser = (userData: Partial<User>) => {
    if (!userData.name || (!userData.username && !userData.matricule)) {
      return { success: false, error: 'Le nom et l\'identifiant sont obligatoires.' };
    }

    const identifier = (userData.matricule || userData.username || '').toLowerCase();
    const existing = users.find(
      (u) =>
        (u.matricule && u.matricule.toLowerCase() === identifier) ||
        u.username.toLowerCase() === identifier
    );

    if (existing) {
      return { success: false, error: `L'identifiant "${identifier}" est déjà utilisé par un autre compte.` };
    }

    const newUser: User = {
      id: `user-${Date.now()}`,
      username: userData.username || userData.matricule || `user.${Date.now()}`,
      matricule: userData.role === 'STUDENT' ? (userData.matricule || userData.username) : undefined,
      name: userData.name,
      civilite: userData.civilite,
      lastName: userData.lastName,
      firstName: userData.firstName,
      email: userData.email || `${identifier}@ebm-institute.edu`,
      phone: userData.phone || '',
      phones: userData.phones || (userData.phone ? [userData.phone] : []),
      role: userData.role || 'STUDENT',
      customRoleId: userData.customRoleId,
      groupId: userData.groupId,
      subGroupId: userData.subGroupId,
      parcoursId: userData.parcoursId,
      birthDate: userData.birthDate || '2005-01-01',
      birthPlace: userData.birthPlace,
      address: userData.address,
      postalCode: userData.postalCode,
      city: userData.city || 'Antananarivo',
      originSchool: userData.originSchool,
      bacSeries: userData.bacSeries,
      linkedInUrl: userData.linkedInUrl,
      parentContacts: userData.parentContacts || [],
      cardToken:
        userData.role === 'STUDENT'
          ? userData.cardToken || `EBM-CARD-${(userData.matricule || userData.username || String(Date.now())).slice(-4).toUpperCase()}-V1`
          : undefined,
      cardIssueNumber: userData.role === 'STUDENT' ? 1 : undefined,
      cardIssuedAt: userData.role === 'STUDENT' ? new Date().toISOString().split('T')[0] : undefined,
      revokedCardTokens: [],
      department: userData.department,
      service: userData.service,
      jobTitle: userData.jobTitle,
      linkedStudentIds: userData.linkedStudentIds || [],
      parentRelation: userData.parentRelation,
      parentVerificationStatus: userData.role === 'PARENT' ? (userData.parentVerificationStatus || 'VERIFIED') : undefined,
      customPermissions: userData.customPermissions,
      mustChangePassword: userData.mustChangePassword ?? true,
      isActive: userData.isActive ?? true,
      googleCalendarLinked: false,
      subjects: userData.subjects || [],
      weeklyMaxHours: userData.weeklyMaxHours || 18,
    };

    setUsers((prev) => [...prev, newUser]);
    logAudit('CREATION_UTILISATEUR', `Création du compte ${newUser.name} [Rôle: ${newUser.role}] (${newUser.matricule || newUser.username})`);
    return { success: true };
  };

  const updateUser = (id: string, updates: Partial<User>) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== id) return u;
        const newLogs: UserModificationLog[] = [];
        const trackedKeys: (keyof User)[] = [
          'name',
          'email',
          'phone',
          'address',
          'city',
          'birthDate',
          'birthPlace',
          'originSchool',
          'bacSeries',
          'linkedInUrl',
          'role',
          'groupId',
          'parcoursId',
          'department',
          'service',
          'jobTitle',
        ];
        trackedKeys.forEach((key) => {
          if (updates[key] !== undefined && String(updates[key]) !== String(u[key] ?? '')) {
            newLogs.push({
              id: `mod-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              timestamp: new Date().toISOString(),
              authorId: currentUser.id,
              authorName: currentUser.name,
              field: String(key),
              oldValue: String(u[key] ?? 'Non renseigné'),
              newValue: String(updates[key]),
            });
          }
        });
        const updatedUser: User = {
          ...u,
          ...updates,
          modificationHistory:
            newLogs.length > 0
              ? [...newLogs, ...(u.modificationHistory || [])]
              : u.modificationHistory,
        };
        syncDocToFirestore('users', updatedUser);
        return updatedUser;
      })
    );
    logAudit('MODIFICATION_UTILISATEUR', `Mise à jour de la fiche utilisateur ${id} par ${currentUser.name}`);
  };

  const deleteUser = (id: string) => {
    const target = users.find((u) => u.id === id);
    setUsers((prev) => prev.filter((u) => u.id !== id));
    logAudit('SUPPRESSION_UTILISATEUR', `Suppression du compte de ${target?.name || id}`);
  };

  const resetUserPassword = (id: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== id) return u;
        const updated = {
          ...u,
          mustChangePassword: true, // RG-03: force change
        };
        syncDocToFirestore('users', updated);
        return updated;
      })
    );
    const target = users.find((u) => u.id === id);
    logAudit('REINITIALISATION_MDP', `Mot de passe réinitialisé pour ${target?.name} (Changement forcé à la prochaine connexion RG-03)`);
    triggerNotification({
      recipientId: id,
      recipientRole: target?.role,
      title: '🔑 Mot de passe réinitialisé',
      message: 'Votre mot de passe a été réinitialisé par un administrateur. Vous devez définir un nouveau mot de passe lors de votre prochaine connexion.',
      type: 'INFO',
    });
  };

  const sendUserPasswordResetEmail = async (id: string): Promise<{ success: boolean; message: string }> => {
    const target = users.find((u) => u.id === id);
    if (!target || !target.email) {
      return { success: false, message: 'Utilisateur ou adresse e-mail introuvable.' };
    }

    let firebaseSent = false;
    try {
      await sendPasswordResetEmail(auth, target.email);
      firebaseSent = true;
    } catch {
      // If email is not yet registered in Firebase Auth Email/Password provider, still process SIS reset notification & email dispatch record
      firebaseSent = false;
    }

    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== id) return u;
        const modLog: UserModificationLog = {
          id: `mod-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: new Date().toISOString(),
          authorId: currentUser.id,
          authorName: currentUser.name,
          field: 'Réinitialisation Mot de Passe (Email)',
          oldValue: 'Actif',
          newValue: `Lien envoyé à ${target.email}`,
        };
        const updated: User = {
          ...u,
          mustChangePassword: true,
          modificationHistory: [modLog, ...(u.modificationHistory || [])],
        };
        syncDocToFirestore('users', updated);
        return updated;
      })
    );

    logAudit(
      'ENVOI_EMAIL_REINITIALISATION_MDP',
      `E-mail de réinitialisation de mot de passe envoyé à ${target.email} pour ${target.name} (${target.matricule || target.username})`
    );

    triggerNotification({
      recipientId: id,
      recipientRole: target.role,
      title: '📧 Lien de réinitialisation envoyé par e-mail',
      message: `Un lien sécurisé de réinitialisation de mot de passe a été envoyé à ${target.email}.`,
      type: 'INFO',
    });

    return {
      success: true,
      message: firebaseSent
        ? `E-mail officiel Firebase de réinitialisation envoyé à ${target.email}.`
        : `Demande et lien de réinitialisation envoyés à ${target.email} (changement activé à la connexion).`,
    };
  };

  const setDirectUserPassword = (
    id: string,
    newPassword: string,
    forceChangeOnNextLogin: boolean = false
  ): { success: boolean; message: string } => {
    const cleanPwd = newPassword.trim();
    if (cleanPwd.length < 6) {
      return {
        success: false,
        message: 'Le nouveau mot de passe doit contenir au moins 6 caractères.',
      };
    }

    const target = users.find((u) => u.id === id);
    if (!target) {
      return { success: false, message: 'Utilisateur introuvable.' };
    }

    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== id) return u;
        const modLog: UserModificationLog = {
          id: `mod-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: new Date().toISOString(),
          authorId: currentUser.id,
          authorName: currentUser.name,
          field: 'Mot de passe défini par Admin',
          oldValue: '••••••••',
          newValue: forceChangeOnNextLogin ? 'Nouveau MDP (Changement forcé)' : 'Nouveau MDP actif immédiat',
        };
        const updated: User = {
          ...u,
          passwordHash: cleanPwd,
          mustChangePassword: forceChangeOnNextLogin,
          modificationHistory: [modLog, ...(u.modificationHistory || [])],
        };
        syncDocToFirestore('users', updated);
        return updated;
      })
    );

    logAudit(
      'DEFINITION_MDP_ADMIN',
      `Nouveau mot de passe défini directement par ${currentUser.name} pour ${target.name} (${target.matricule || target.username})`
    );

    triggerNotification({
      recipientId: id,
      recipientRole: target.role,
      title: '🔐 Mot de passe mis à jour par l’Administration',
      message: `Votre mot de passe a été mis à jour par l'administration EBM Institute.${
        forceChangeOnNextLogin ? ' Vous devrez le personnaliser à votre prochaine connexion.' : ''
      }`,
      type: 'SUCCESS',
    });

    return {
      success: true,
      message: `Nouveau mot de passe enregistré immédiatement pour ${target.name}.`,
    };
  };

  const createStudent = (studentData: Partial<User>) => {
    if (!studentData.matricule || !studentData.name) {
      return { success: false, error: 'Matricule et nom sont obligatoires.' };
    }

    const existing = users.find((u) => u.matricule?.toLowerCase() === studentData.matricule?.toLowerCase());
    if (existing) {
      return { success: false, error: `Le matricule ${studentData.matricule} existe déjà (RG-04).` };
    }

    const newStudent: User = {
      id: `user-student-${Date.now()}`,
      matricule: studentData.matricule,
      username: studentData.matricule,
      name: studentData.name,
      civilite: studentData.civilite || 'M.',
      lastName: studentData.lastName,
      firstName: studentData.firstName,
      email: studentData.email || `${studentData.matricule.toLowerCase()}@etudiant.ebm.edu`,
      phone: studentData.phone || '',
      phones: studentData.phones || (studentData.phone ? [studentData.phone] : []),
      role: 'STUDENT',
      groupId: studentData.groupId || 'grp-l1-info-a',
      subGroupId: studentData.subGroupId,
      parcoursId: studentData.parcoursId,
      birthDate: studentData.birthDate || '2005-01-01',
      birthPlace: studentData.birthPlace || 'Antananarivo',
      address: studentData.address || '',
      postalCode: studentData.postalCode || '101',
      city: studentData.city || 'Antananarivo',
      originSchool: studentData.originSchool || '',
      bacSeries: studentData.bacSeries || 'Série C',
      linkedInUrl: studentData.linkedInUrl || '',
      parentContacts: studentData.parentContacts || [],
      cardToken: `EBM-CARD-${studentData.matricule.slice(-4).toUpperCase()}-V1`,
      cardIssueNumber: 1,
      cardIssuedAt: new Date().toISOString().split('T')[0],
      revokedCardTokens: [],
      isAdult: true,
      parentAccessConsent: {
        academic: true,
        attendance: true,
        financial: true,
        administrative: true,
      },
      mustChangePassword: true, // RG-03: Mandatory first change!
      isActive: true,
      googleCalendarLinked: false,
    };

    setUsers((prev) => [...prev, newStudent]);
    logAudit('CREATION_ETUDIANT', `Création individuelle étudiant ${newStudent.name} (${newStudent.matricule}) - Carte: ${newStudent.cardToken}`);
    return { success: true };
  };

  const importStudents = (rows: ImportStudentRow[]): ImportResult => {
    const createdStudents: User[] = [];
    const errors: ImportResult['errors'] = [];
    let duplicateCount = 0;
    const existingMatricules = new Set(users.map((u) => u.matricule?.toUpperCase()).filter(Boolean));
    const batchMatricules = new Set<string>();

    rows.forEach((row, index) => {
      const rowNum = index + 1;
      const cleanMatricule = row.matricule?.trim().toUpperCase();

      if (!cleanMatricule) {
        errors.push({ row: rowNum, matricule: 'VIDE', reason: 'Matricule manquant ou vide' });
        return;
      }

      if (!row.nom || !row.prenom) {
        errors.push({ row: rowNum, matricule: cleanMatricule, reason: 'Nom ou prénom manquant' });
        return;
      }

      // Check duplicates
      if (existingMatricules.has(cleanMatricule) || batchMatricules.has(cleanMatricule)) {
        duplicateCount++;
        errors.push({ row: rowNum, matricule: cleanMatricule, reason: `Matricule ${cleanMatricule} déjà existant dans la base ou le lot (RG-04)` });
        return;
      }

      batchMatricules.add(cleanMatricule);

      // Match group or fallback
      const matchedGroup = groups.find((g) => g.code.toLowerCase() === row.groupe?.trim().toLowerCase()) || groups[0];

      const newStudent: User = {
        id: `user-import-${Date.now()}-${index}`,
        matricule: cleanMatricule,
        username: cleanMatricule,
        name: `${row.prenom.trim()} ${row.nom.trim()}`,
        email: row.email?.trim() || `${cleanMatricule.toLowerCase()}@etudiant.ebm.edu`,
        role: 'STUDENT',
        groupId: matchedGroup.id,
        birthDate: row.dateNaissance?.trim() || '2005-01-01',
        mustChangePassword: true, // RG-03
        isActive: true,
        googleCalendarLinked: false,
      };

      createdStudents.push(newStudent);
      existingMatricules.add(cleanMatricule);
    });

    if (createdStudents.length > 0) {
      setUsers((prev) => [...prev, ...createdStudents]);
      logAudit(
        'IMPORTATION_MASSE',
        `Importation de ${createdStudents.length} étudiants réussie. ${duplicateCount} doublons détectés, ${errors.length} rejets.`
      );
    }

    return {
      totalRows: rows.length,
      successCount: createdStudents.length,
      duplicateCount,
      errorCount: errors.length,
      createdStudents,
      errors,
    };
  };

  const toggleGoogleCalendarLink = (userId: string, email?: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u;
        const newLinked = !u.googleCalendarLinked;
        return {
          ...u,
          googleCalendarLinked: newLinked,
          googleEmail: newLinked ? (email || `${u.username}@gmail.com`) : undefined,
        };
      })
    );
    const u = users.find((usr) => usr.id === userId);
    logAudit(
      'SYNC_GOOGLE_CALENDAR',
      `Liaison Google Calendar ${!u?.googleCalendarLinked ? 'ACTIVÉE' : 'DÉCONNECTÉE'} pour ${u?.name}`
    );
  };

  // Hourly tracking calculations (RG-08, RG-09, RG-10)
  const getCourseHourlyStats = (courseId: string): CourseHourlyStats => {
    const course = courses.find((c) => c.id === courseId);
    const totalHours = course?.totalHours || 30;

    // Filter sessions for this course
    const courseSessions = sessions.filter((s) => s.courseId === courseId);

    // Scheduled: all non-cancelled sessions
    const scheduledHours = courseSessions
      .filter((s) => s.status !== 'CANCELLED')
      .reduce((acc, s) => acc + s.durationHours, 0);

    // Completed & Validated by academic head (RG-09)
    const completedHours = courseSessions
      .filter((s) => s.status === 'COMPLETED_VALIDATED')
      .reduce((acc, s) => acc + s.durationHours, 0);

    const remainingToComplete = Math.max(0, totalHours - completedHours);
    const remainingToSchedule = Math.max(0, totalHours - scheduledHours);

    return {
      totalHours,
      scheduledHours,
      completedHours,
      remainingToComplete,
      remainingToSchedule,
    };
  };

  const getTeacherHourlyStats = (teacherId: string): TeacherHourlyStats => {
    const teacher = users.find((u) => u.id === teacherId);
    const teacherSessions = sessions.filter((s) => s.teacherId === teacherId);

    const totalScheduled = teacherSessions
      .filter((s) => s.status !== 'CANCELLED')
      .reduce((acc, s) => acc + s.durationHours, 0);

    const totalCompleted = teacherSessions
      .filter((s) => s.status === 'COMPLETED_VALIDATED')
      .reduce((acc, s) => acc + s.durationHours, 0);

    return {
      totalScheduled,
      totalCompleted,
      maxWeekly: teacher?.weeklyMaxHours || 18,
    };
  };

  // --- DATA CREATION CRUD IMPLEMENTATIONS ---
  const addCourse = (data: Omit<Course, 'id'>) => {
    if (!data.title || !data.code) {
      return { success: false, error: 'Le titre et le code de la matière sont obligatoires.' };
    }
    const newCourse: Course = {
      ...data,
      id: `crs-${Date.now()}`,
    };
    setCourses((prev) => [...prev, newCourse]);
    logAudit('CREATION_COURS', `Création du cours "${newCourse.title}" (${newCourse.code}) - Volume : ${newCourse.totalHours}h`);
    return { success: true, course: newCourse };
  };

  const updateCourse = (id: string, updates: Partial<Course>) => {
    setCourses((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    logAudit('MODIFICATION_COURS', `Modification du cours ${id}`);
  };

  const deleteCourse = (id: string) => {
    const course = courses.find((c) => c.id === id);
    setCourses((prev) => prev.filter((c) => c.id !== id));
    logAudit('SUPPRESSION_COURS', `Suppression du cours "${course?.title || id}"`);
  };

  const addRoom = (data: Omit<Room, 'id'>) => {
    if (!data.name || !data.code) {
      return { success: false, error: 'Le nom et le code de la salle sont obligatoires.' };
    }
    const newRoom: Room = {
      ...data,
      id: `room-${Date.now()}`,
    };
    setRooms((prev) => [...prev, newRoom]);
    logAudit('CREATION_SALLE', `Création de la salle "${newRoom.name}" (${newRoom.code}) - Capacité : ${newRoom.capacity} places`);
    return { success: true, room: newRoom };
  };

  const updateRoom = (id: string, updates: Partial<Room>) => {
    setRooms((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
    logAudit('MODIFICATION_SALLE', `Modification de la salle ${id}`);
  };

  const deleteRoom = (id: string) => {
    const room = rooms.find((r) => r.id === id);
    setRooms((prev) => prev.filter((r) => r.id !== id));
    logAudit('SUPPRESSION_SALLE', `Suppression de la salle "${room?.name || id}"`);
  };

  const addTeacher = (data: { name: string; email: string; phone?: string; subjects: string[]; weeklyMaxHours?: number }) => {
    if (!data.name || !data.email) {
      return { success: false, error: 'Le nom et l\'adresse e-mail sont obligatoires.' };
    }
    const slug = data.name.toLowerCase().replace(/\s+/g, '.').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const newTeacher: User = {
      id: `user-teacher-${Date.now()}`,
      username: slug,
      name: data.name,
      email: data.email,
      phone: data.phone || '',
      role: 'TEACHER',
      isActive: true,
      subjects: data.subjects || [],
      weeklyMaxHours: data.weeklyMaxHours || 18,
      googleCalendarLinked: false,
    };
    setUsers((prev) => [...prev, newTeacher]);
    logAudit('CREATION_ENSEIGNANT', `Création du compte enseignant "${newTeacher.name}" (${newTeacher.email})`);
    return { success: true, teacher: newTeacher };
  };

  const updateTeacher = (id: string, updates: Partial<User>) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...updates } : u)));
    logAudit('MODIFICATION_ENSEIGNANT', `Modification de l'enseignant ${id}`);
  };

  const deleteTeacher = (id: string) => {
    const teacher = users.find((u) => u.id === id);
    setUsers((prev) => prev.filter((u) => u.id !== id));
    logAudit('SUPPRESSION_ENSEIGNANT', `Suppression de l'enseignant "${teacher?.name || id}"`);
  };

  const addGroup = (data: Omit<StudentGroup, 'id'>) => {
    if (!data.code || !data.name) {
      return { success: false, error: 'Le code et le nom du groupe sont obligatoires.' };
    }
    const newGroup: StudentGroup = {
      ...data,
      id: `grp-${Date.now()}`,
    };
    setGroups((prev) => [...prev, newGroup]);
    logAudit('CREATION_GROUPE', `Création du groupe "${newGroup.code}" - Effectif : ${newGroup.studentCount}`);
    return { success: true, group: newGroup };
  };

  const updateGroup = (id: string, updates: Partial<StudentGroup>) => {
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, ...updates } : g)));
    logAudit('MODIFICATION_GROUPE', `Modification du groupe ${id}`);
  };

  const deleteGroup = (id: string) => {
    const group = groups.find((g) => g.id === id);
    setGroups((prev) => prev.filter((g) => g.id !== id));
    logAudit('SUPPRESSION_GROUPE', `Suppression du groupe "${group?.code || id}"`);
  };

  const addFiliere = (data: Omit<Filiere, 'id'>) => {
    if (!data.code || !data.name) {
      return { success: false, error: 'Le code et le nom de la filière sont obligatoires.' };
    }
    const newFiliere: Filiere = {
      ...data,
      id: `fil-${Date.now()}`,
    };
    setFilieres((prev) => [...prev, newFiliere]);
    logAudit('CREATION_FILIERE', `Création de la filière "${newFiliere.code}" (${newFiliere.name})`);
    return { success: true, filiere: newFiliere };
  };

  const updateFiliere = (id: string, updates: Partial<Filiere>) => {
    setFilieres((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));
    logAudit('MODIFICATION_FILIERE', `Modification de la filière ${id}`);
  };

  const deleteFiliere = (id: string) => {
    const filiere = filieres.find((f) => f.id === id);
    setFilieres((prev) => prev.filter((f) => f.id !== id));
    logAudit('SUPPRESSION_FILIERE', `Suppression de la filière "${filiere?.code || id}"`);
  };

  const seedBatchDemoData = () => {
    // Inject a quick fresh scenario: New Room, New Course 30h, New Teacher, New Group
    const timestamp = Date.now();
    const demoRoom: Room = {
      id: `room-demo-${timestamp}`,
      code: 'LABO-CYBER',
      name: 'Laboratoire Cybersécurité & Hacking Éthique',
      building: 'Pôle Technologies Numériques',
      floor: '3ème Étage',
      capacity: 28,
      equipment: ['28 Postes isolés Dual-NIC', 'Serveurs Proxmox VE', 'Firewall physique Cisco ASA', 'Écran 4K 86"'],
      status: 'available',
      colorCode: '#059669',
    };

    const demoTeacher: User = {
      id: `user-teacher-demo-${timestamp}`,
      username: 'mialy.ravelojaona',
      name: 'Dr. Mialy Ravelojaona',
      civilite: 'Dr.',
      lastName: 'Ravelojaona',
      firstName: 'Mialy',
      email: 'mialy.ravelojaona@ebm-institute.edu',
      phone: '+261 34 45 678 90',
      phones: ['+261 34 45 678 90'],
      role: 'TEACHER',
      department: 'Pôle Technologies Numériques',
      service: 'Corps Professoral Cybersécurité',
      jobTitle: 'Maître de Conférences en Cybersécurité',
      academicRank: 'Maître de Conférences',
      highestDiploma: 'Doctorat en Cybersécurité & Cryptographie',
      almaMater: 'Université d’Antananarivo (ESPA)',
      contractType: 'PERMANENT',
      hourlyRateAr: 45000,
      city: 'Antananarivo',
      isActive: true,
      subjects: ['Sécurité Offensive', 'Cryptographie Appliquée', 'Audit Forensics'],
      weeklyMaxHours: 18,
      googleCalendarLinked: true,
      googleEmail: 'mialy.ravelojaona.sec@gmail.com',
    };

    const demoGroup: StudentGroup = {
      id: `grp-demo-${timestamp}`,
      code: 'M2-CYBER-A',
      name: 'Master 2 Cybersécurité & Défense des SI',
      filiereId: 'fil-4',
      level: 'M2',
      academicYear: '2026-2027',
      studentCount: 22,
      subGroups: [
        { id: `sub-demo-1-${timestamp}`, code: 'M2-CYBER-TP1', name: 'Groupe RedTeam', studentCount: 11 },
        { id: `sub-demo-2-${timestamp}`, code: 'M2-CYBER-TP2', name: 'Groupe BlueTeam', studentCount: 11 },
      ],
    };

    const demoCourse: Course = {
      id: `crs-demo-${timestamp}`,
      code: 'CYB-501',
      title: 'Sécurité Offensive & Tests d’Intrusion Avancés',
      filiereId: 'fil-4',
      level: 'M2',
      academicYear: '2026-2027',
      groupIds: [demoGroup.id],
      teacherIds: [demoTeacher.id],
      totalHours: 30, // 30h standard
      defaultSessionDuration: 3,
      color: '#059669',
      description: 'Méthodologie PTES, analyse de vulnérabilités et exploitation de binaires.',
    };

    setRooms((prev) => [demoRoom, ...prev]);
    setUsers((prev) => [demoTeacher, ...prev]);
    setGroups((prev) => [demoGroup, ...prev]);
    setCourses((prev) => [demoCourse, ...prev]);

    logAudit('GENERATION_DONNEES_DEMO', 'Génération automatique d’un module complet : Salle Labo Cyber + Enseignant Dr. Mialy Ravelojaona + Groupe M2 Cyber + Cours.');
    triggerNotification({
      recipientId: demoTeacher.id,
      recipientRole: 'TEACHER',
      title: '✨ Nouveau jeu de données de test généré',
      message: 'Le module CYB-501, la salle LABO-CYBER et la promotion M2-CYBER-A ont été créés et sont prêts à être planifiés.',
      type: 'SUCCESS',
    });
  };

  // ==========================================
  // COMPLEMENTARY LMD LOGIC & WORKFLOWS
  // ==========================================

  const addUe = (data: Omit<UniteEnseignement, 'id'>) => {
    if (!data.code || !data.title) {
      return { success: false, error: 'Code et intitulé de l’UE obligatoires.' };
    }
    const newUe: UniteEnseignement = {
      ...data,
      id: `ue-${Date.now()}`,
    };
    setUes((prev) => [...prev, newUe]);
    logAudit('CREATION_UE', `Création de l’UE "${newUe.code}" (${newUe.title}) - ${newUe.creditsEcts} ECTS`);
    return { success: true, ue: newUe };
  };

  const updateUe = (id: string, updates: Partial<UniteEnseignement>) => {
    setUes((prev) => prev.map((u) => (u.id === id ? { ...u, ...updates } : u)));
    logAudit('MODIFICATION_UE', `Mise à jour de l’UE ${id}`);
  };

  const deleteUe = (id: string) => {
    const ue = ues.find((u) => u.id === id);
    setUes((prev) => prev.filter((u) => u.id !== id));
    logAudit('SUPPRESSION_UE', `Suppression de l’UE "${ue?.code || id}"`);
  };

  const addEc = (data: Omit<ElementConstitutif, 'id'>) => {
    if (!data.code || !data.title) {
      return { success: false, error: 'Code et intitulé de l’EC obligatoires.' };
    }
    const newEc: ElementConstitutif = {
      ...data,
      id: `ec-${Date.now()}`,
    };
    setEcs((prev) => [...prev, newEc]);
    // Also attach to parent UE
    setUes((prev) =>
      prev.map((ue) =>
        ue.id === data.ueId && !ue.ecIds.includes(newEc.id)
          ? { ...ue, ecIds: [...ue.ecIds, newEc.id] }
          : ue
      )
    );
    logAudit('CREATION_EC', `Création de l’EC "${newEc.code}" (${newEc.title}) rattaché à l’UE ${data.ueId}`);
    return { success: true, ec: newEc };
  };

  const updateEc = (id: string, updates: Partial<ElementConstitutif>) => {
    setEcs((prev) => prev.map((e) => (e.id === id ? { ...e, ...updates } : e)));
    logAudit('MODIFICATION_EC', `Mise à jour de l’EC ${id}`);
  };

  const deleteEc = (id: string) => {
    const ec = ecs.find((e) => e.id === id);
    setEcs((prev) => prev.filter((e) => e.id !== id));
    setUes((prev) =>
      prev.map((ue) => ({
        ...ue,
        ecIds: ue.ecIds.filter((ecId) => ecId !== id),
      }))
    );
    logAudit('SUPPRESSION_EC', `Suppression de l’EC "${ec?.code || id}"`);
  };

  const duplicateMaquette = (sourceYear: string, targetYear: string) => {
    const sourceUes = ues.filter((u) => u.academicYear === sourceYear);
    if (sourceUes.length === 0) {
      return { success: false, countUe: 0, countEc: 0, message: `Aucune UE trouvée pour l’année ${sourceYear}.` };
    }

    let createdUeCount = 0;
    let createdEcCount = 0;

    const newUes: UniteEnseignement[] = [];
    const newEcs: ElementConstitutif[] = [];

    sourceUes.forEach((oldUe) => {
      const newUeId = `ue-${targetYear}-${oldUe.code.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`;
      const childEcs = ecs.filter((ec) => ec.ueId === oldUe.id || oldUe.ecIds.includes(ec.id));
      const newChildEcIds: string[] = [];

      childEcs.forEach((oldEc) => {
        const newEcId = `ec-${targetYear}-${oldEc.code.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`;
        newChildEcIds.push(newEcId);
        newEcs.push({
          ...oldEc,
          id: newEcId,
          ueId: newUeId,
        });
        createdEcCount++;
      });

      newUes.push({
        ...oldUe,
        id: newUeId,
        academicYear: targetYear,
        ecIds: newChildEcIds,
      });
      createdUeCount++;
    });

    setUes((prev) => [...prev, ...newUes]);
    setEcs((prev) => [...prev, ...newEcs]);

    logAudit(
      'DUPLICATION_MAQUETTE_LMD',
      `Duplication de la maquette pédagogique de ${sourceYear} vers ${targetYear} (${createdUeCount} UEs et ${createdEcCount} ECs dupliqués)`
    );

    triggerNotification({
      recipientId: currentUser.id,
      title: '📋 Maquette LMD dupliquée avec succès',
      message: `${createdUeCount} Unités d’Enseignement et ${createdEcCount} Éléments Constitutifs ont été reportés vers l’année ${targetYear}.`,
      type: 'SUCCESS',
    });

    return {
      success: true,
      countUe: createdUeCount,
      countEc: createdEcCount,
      message: `Maquette dupliquée : ${createdUeCount} UEs et ${createdEcCount} ECs créés pour ${targetYear}.`,
    };
  };

  const inscribeStudent = (
    studentId: string,
    academicYear: string,
    filiereId: string,
    level: string,
    groupId: string,
    extra?: {
      parcoursId?: string;
      inscriptionType?: 'INSCRIPTION' | 'REINSCRIPTION';
      academicStatus?: StudentInscription['academicStatus'];
      documents?: StudentInscription['documents'];
    }
  ): { success: boolean; error?: string; inscription?: StudentInscription } => {
    const existingForYear = inscriptions.find(
      (i) =>
        i.studentId === studentId &&
        i.academicYear === academicYear &&
        i.filiereId === filiereId &&
        (i.parcoursId || '') === (extra?.parcoursId || '')
    );

    // ACC-017: Prevent duplicate enrollment for the same student, academic year and parcours
    if (existingForYear && extra?.inscriptionType !== 'REINSCRIPTION') {
      const student = users.find((u) => u.id === studentId);
      return {
        success: false,
        error: `Doublon bloqué (ACC-017) : L’étudiant ${student?.name || studentId} (${student?.matricule || ''}) est déjà inscrit pour l’année ${academicYear} dans cette mention/parcours.`,
      };
    }

    const docs = extra?.documents || {
      cinOrBirthCert: true,
      baccOriginal: true,
      photosId: true,
      medicalCert: true,
      financialClearance: true,
    };
    const isComplete = Object.values(docs).every(Boolean);

    const newInscription: StudentInscription = {
      id: `insc-${studentId}-${academicYear}-${Date.now()}`,
      studentId,
      academicYear,
      filiereId,
      parcoursId: extra?.parcoursId,
      level,
      groupId,
      inscriptionType: extra?.inscriptionType || 'INSCRIPTION',
      academicStatus: extra?.academicStatus || 'NOUVEAU',
      dossierComplete: isComplete,
      documents: docs,
      inscriptionDate: new Date().toISOString().split('T')[0],
      status: 'CONFIRMED',
    };
    setInscriptions((prev) => {
      const filtered = prev.filter((i) => !(i.studentId === studentId && i.academicYear === academicYear));
      return [...filtered, newInscription];
    });
    // Also update student's current groupId & parcoursId if this is for the active year
    setUsers((prev) =>
      prev.map((u) =>
        u.id === studentId
          ? { ...u, groupId, parcoursId: extra?.parcoursId || u.parcoursId }
          : u
      )
    );
    syncDocToFirestore('inscriptions', newInscription);
    logAudit(
      extra?.inscriptionType === 'REINSCRIPTION' ? 'REINSCRIPTION_ETUDIANT' : 'INSCRIPTION_ETUDIANT',
      `${extra?.inscriptionType === 'REINSCRIPTION' ? 'Réinscription' : 'Inscription'} de l’étudiant ${studentId} pour l’année ${academicYear} (Groupe: ${groupId}, Niveau: ${level})`
    );
    return { success: true, inscription: newInscription };
  };

  // Parcours CRUD (Configurable without code changes)
  const addParcours = (data: Omit<Parcours, 'id'>) => {
    if (!data.code.trim() || !data.name.trim()) {
      return { success: false, error: 'Le code et le nom du parcours sont requis.' };
    }
    const newParc: Parcours = {
      ...data,
      id: `parc-${data.code.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`,
    };
    setParcours((prev) => [...prev, newParc]);
    syncDocToFirestore('parcours', newParc);
    logAudit('CREATION_PARCOURS', `Création du parcours académique ${newParc.code} - ${newParc.name} (${newParc.level})`);
    return { success: true, parcours: newParc };
  };

  const updateParcours = (id: string, updates: Partial<Parcours>) => {
    setParcours((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const updated = { ...p, ...updates };
          syncDocToFirestore('parcours', updated);
          return updated;
        }
        return p;
      })
    );
    logAudit('MODIFICATION_PARCOURS', `Mise à jour du parcours ${id}`);
  };

  const deleteParcours = (id: string) => {
    setParcours((prev) => prev.filter((p) => p.id !== id));
    logAudit('SUPPRESSION_PARCOURS', `Suppression du parcours ${id}`);
  };

  // Configurable Academic Validation Rules
  const getActiveAcademicRules = (yearCode = selectedAcademicYear): AcademicValidationRules => {
    const found = academicRules.find((r) => r.academicYear === yearCode);
    if (found) return found;
    return (
      academicRules[0] || {
        id: `rules-${yearCode}`,
        academicYear: yearCode,
        ecPassingScore: 10.0,
        uePassingScore: 10.0,
        eliminatoryScore: 6.0,
        allowIntraUeCompensation: true,
        allowInterUeCompensation: true,
        creditsForDirectPass: 60,
        minCreditsForConditionalPass: 45,
        defaultQuizWeight: 0.4,
        defaultExamWeight: 0.6,
        blockTranscriptIfUnpaid: false,
      }
    );
  };

  const updateAcademicRules = (yearCode: string, updates: Partial<AcademicValidationRules>) => {
    setAcademicRules((prev) => {
      const exists = prev.some((r) => r.academicYear === yearCode);
      if (exists) {
        return prev.map((r) => {
          if (r.academicYear === yearCode) {
            const updated: AcademicValidationRules = {
              ...r,
              ...updates,
              updatedAt: new Date().toISOString(),
              updatedBy: currentUser.name,
            };
            syncDocToFirestore('academicRules', updated);
            return updated;
          }
          return r;
        });
      } else {
        const created: AcademicValidationRules = {
          ...getActiveAcademicRules(yearCode),
          ...updates,
          id: `rules-${yearCode}`,
          academicYear: yearCode,
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser.name,
        };
        syncDocToFirestore('academicRules', created);
        return [...prev, created];
      }
    });
    logAudit('MODIFICATION_REGLES_LMD', `Mise à jour des règles de validation et compensation pour l'année ${yearCode}`);
  };

  // Academic Year Management Functions (OpenEduCat inspiration)
  const createAcademicYear = (data: {
    code: string;
    name: string;
    startDate: string;
    endDate: string;
    isCurrent?: boolean;
    cloneFromPrevious?: boolean;
  }): { success: boolean; academicYear?: AcademicYear; error?: string } => {
    const cleanCode = data.code.trim();
    const cleanName = data.name.trim();
    if (!cleanCode || !cleanName) {
      return { success: false, error: 'Le code et l’intitulé de l’année sont obligatoires.' };
    }
    if (academicYears.some((ay) => ay.code.toLowerCase() === cleanCode.toLowerCase())) {
      return { success: false, error: `L’année académique "${cleanCode}" existe déjà.` };
    }

    const startYear = cleanCode.split('-')[0] || '2027';
    const endYear = cleanCode.split('-')[1] || String(Number(startYear) + 1);

    const newYear: AcademicYear = {
      id: `ay-${cleanCode.replace(/[^a-zA-Z0-9]/g, '-')}`,
      code: cleanCode,
      name: cleanName,
      startDate: data.startDate || `${startYear}-09-01`,
      endDate: data.endDate || `${endYear}-06-30`,
      isCurrent: !!data.isCurrent,
      status: 'OPEN',
      semesters: [
        { code: 'S1', name: 'Semestre 1 (Automne)', startDate: data.startDate || `${startYear}-09-01`, endDate: `${startYear}-12-31`, isActive: true },
        { code: 'S2', name: 'Semestre 2 (Printemps)', startDate: `${endYear}-01-01`, endDate: data.endDate || `${endYear}-06-30`, isActive: false },
      ],
    };

    setAcademicYears((prev) => {
      let list = [...prev];
      if (data.isCurrent) {
        list = list.map((ay) => ({ ...ay, isCurrent: false }));
      }
      return [newYear, ...list];
    });

    if (data.isCurrent) {
      setSelectedAcademicYear(newYear.code);
    }

    if (data.cloneFromPrevious && selectedAcademicYear) {
      duplicateMaquette(selectedAcademicYear, newYear.code);
    }

    logAudit('CREATION_ANNEE_ACADEMIQUE', `Création de l'année académique ${newYear.code} (${newYear.name})`);
    return { success: true, academicYear: newYear };
  };

  const updateAcademicYear = (id: string, updates: Partial<AcademicYear>) => {
    setAcademicYears((prev) =>
      prev.map((ay) => {
        if (ay.id === id) {
          return { ...ay, ...updates };
        }
        if (updates.isCurrent && ay.id !== id) {
          return { ...ay, isCurrent: false };
        }
        return ay;
      })
    );
    if (updates.code && updates.isCurrent) {
      setSelectedAcademicYear(updates.code);
    }
    logAudit('MODIFICATION_ANNEE_ACADEMIQUE', `Mise à jour de l'année académique ${id}`);
  };

  const deleteAcademicYear = (id: string) => {
    setAcademicYears((prev) => prev.filter((ay) => ay.id !== id));
    logAudit('SUPPRESSION_ANNEE_ACADEMIQUE', `Suppression de l'année académique ${id}`);
  };

  const setActiveAcademicYear = (code: string) => {
    setAcademicYears((prev) =>
      prev.map((ay) => ({
        ...ay,
        isCurrent: ay.code === code,
        status: ay.code === code ? 'OPEN' : ay.status,
      }))
    );
    setSelectedAcademicYear(code);
    logAudit('CHANGEMENT_ANNEE_ACTIVE', `L'année ${code} a été définie comme année académique courante.`);
  };

  // Messenger / Live Chat Functions
  const sendChatMessage = (recipientId: string, text: string) => {
    if (!text.trim() || !currentUser) return;
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const newMsg: ChatMessage = {
      id: `chat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      senderId: currentUser.id,
      recipientId,
      text: text.trim(),
      timestamp: timeStr,
      isRead: false,
    };

    setChatMessages((prev) => [...prev, newMsg]);

    setTimeout(() => {
      const recipientUser = users.find((u) => u.id === recipientId);
      if (recipientUser && recipientUser.id !== currentUser.id) {
        const smartReplies: Record<string, string[]> = {
          TEACHER: [
            "Bonjour, j'ai bien pris note de votre message. Le document est disponible sur le portail.",
            "Merci pour votre message ! Nous aborderons ce sujet également lors de la prochaine séance.",
            "Bien reçu, je consulte le dossier sur la plateforme EBM.",
          ],
          STUDENT: [
            "Bonjour ! Merci pour le retour, je regarde tout de suite.",
            "C'est bien noté, je prépare le devoir demandé.",
            "Merci beaucoup pour votre disponibilité !",
          ],
          ADMIN: [
            "Bonjour, votre demande a bien été enregistrée par l'administration EBM.",
            "C'est validé dans le système central EBM Institute.",
            "N'hésitez pas si vous avez besoin d'une attestation ou d'un relevé officiel.",
          ],
        };
        const pool = smartReplies[recipientUser.role] || smartReplies.ADMIN;
        const randomReply = pool[Math.floor(Math.random() * pool.length)];

        const replyMsg: ChatMessage = {
          id: `chat-${Date.now()}-reply`,
          senderId: recipientId,
          recipientId: currentUser.id,
          text: randomReply,
          timestamp: timeStr,
          isRead: false,
        };
        setChatMessages((prev) => [...prev, replyMsg]);
      }
    }, 1500);
  };

  const markChatAsRead = (partnerId: string) => {
    if (!currentUser) return;
    setChatMessages((prev) =>
      prev.map((m) =>
        m.senderId === partnerId && m.recipientId === currentUser.id
          ? { ...m, isRead: true }
          : m
      )
    );
  };

  const onlineUsers = [
    currentUser?.id,
    'user-admin',
    'user-teacher-1',
    'user-student-1',
    'user-scheduler',
  ].filter(Boolean) as string[];

  // Formule d'évaluation : 40% CC + 60% Examen OU Évaluation Directe 100%
  const calculateEcFinalScore = (quizScore?: number, examScore?: number, ecId?: string): number | undefined => {
    const targetEc = ecId ? ecs.find((e) => e.id === ecId) : undefined;
    const isDirect100 = targetEc ? (targetEc.quizWeight === 0 || targetEc.examWeight === 1.0) : false;

    if (isDirect100) {
      if (examScore !== undefined) return Number(examScore.toFixed(2));
      if (quizScore !== undefined) return Number(quizScore.toFixed(2));
      return undefined;
    }

    const qWeight = targetEc?.quizWeight ?? 0.40;
    const eWeight = targetEc?.examWeight ?? 0.60;

    if (quizScore !== undefined && examScore !== undefined) {
      return Number(((quizScore * qWeight) + (examScore * eWeight)).toFixed(2));
    }
    if (quizScore !== undefined) {
      return Number((quizScore * qWeight).toFixed(2));
    }
    if (examScore !== undefined) {
      return Number((examScore * eWeight).toFixed(2));
    }
    return undefined;
  };

  const saveGrade = (
    studentId: string,
    ecId: string,
    quizScore?: number,
    examScore?: number,
    isDraft: boolean = true,
    comment?: string,
    rattrapageScore?: number
  ) => {
    const targetEc = ecs.find((e) => e.id === ecId);
    const targetUe = ues.find((u) => u.id === targetEc?.ueId);
    const ecSemester = targetEc?.semester || targetUe?.semester || 'S1';

    const session1Score = calculateEcFinalScore(quizScore, examScore, ecId);
    const finalScore =
      rattrapageScore !== undefined
        ? Number(Math.max(session1Score ?? 0, rattrapageScore).toFixed(2))
        : session1Score;

    const existingIndex = grades.findIndex((g) => g.studentId === studentId && g.ecId === ecId);

    const updatedGrade: EcGrade = {
      id: existingIndex >= 0 ? grades[existingIndex].id : `grd-${studentId}-${ecId}-${Date.now()}`,
      studentId,
      ecId,
      academicYear: selectedAcademicYear,
      semester: ecSemester,
      quizScore,
      examScore,
      session1Score,
      rattrapageScore,
      finalScore,
      isPublished: !isDraft,
      isDraft,
      lastModifiedBy: currentUser.name,
      lastModifiedAt: new Date().toISOString(),
      comment,
    };

    if (existingIndex >= 0) {
      setGrades((prev) => prev.map((g, idx) => (idx === existingIndex ? updatedGrade : g)));
    } else {
      setGrades((prev) => [...prev, updatedGrade]);
    }

    logAudit(
      'SAISIE_NOTE_LMD',
      `Saisie de note EC ${targetEc?.code || ecId} (${ecSemester}) pour étudiant ${studentId} (Quiz: ${quizScore ?? '-'}, Examen: ${examScore ?? '-'}, Rattrapage: ${rattrapageScore ?? '-'}, Retenu: ${finalScore ?? '-'})`
    );
  };

  const publishGrades = (ecId: string) => {
    const ec = ecs.find((e) => e.id === ecId);
    setGrades((prev) =>
      prev.map((g) =>
        g.ecId === ecId ? { ...g, isPublished: true, isDraft: false, lastModifiedAt: new Date().toISOString() } : g
      )
    );

    // Notify students of this EC
    const affectedGrades = grades.filter((g) => g.ecId === ecId);
    affectedGrades.forEach((g) => {
      triggerNotification({
        recipientId: g.studentId,
        recipientRole: 'STUDENT',
        title: `📢 Notes publiées : ${ec?.code || 'EC'}`,
        message: `Vos notes officielles pour l’élément ${ec?.title || ec?.code} sont disponibles. Note finale : ${g.finalScore !== undefined ? g.finalScore + '/20' : 'En attente'}.`,
        type: 'SUCCESS',
      });
    });

    logAudit('PUBLICATION_OFFICIELLE_NOTES', `Publication officielle des notes pour l’élément ${ec?.code || ecId}`);
  };

  const getStudentEcGrade = (studentId: string, ecId: string): EcGrade | undefined => {
    return grades.find((g) => g.studentId === studentId && g.ecId === ecId);
  };

  const getStudentUeSummary = (studentId: string, ueId: string) => {
    const ue = ues.find((u) => u.id === ueId);
    const relatedEcs = ecs.filter((ec) => ec.ueId === ueId || ue?.ecIds.includes(ec.id));

    let totalWeight = 0;
    let weightedSum = 0;
    let gradedCount = 0;

    const ecDetails = relatedEcs.map((ec) => {
      const grade = grades.find((g) => g.studentId === studentId && g.ecId === ec.id);
      const isPassed = (grade?.finalScore ?? 0) >= 10;
      if (grade?.finalScore !== undefined) {
        weightedSum += grade.finalScore * ec.creditsEcts;
        totalWeight += ec.creditsEcts;
        gradedCount++;
      }
      return { ec, grade, isPassed };
    });

    const average = totalWeight > 0 ? Number((weightedSum / totalWeight).toFixed(2)) : 0;
    const isPassed = average >= (ue?.validationThreshold || 10.0);
    const totalCredits = ue?.creditsEcts || 6;
    const validatedCredits = isPassed ? totalCredits : 0;

    return {
      average,
      isPassed,
      totalCredits,
      validatedCredits,
      ecDetails,
      isComplete: gradedCount === relatedEcs.length && relatedEcs.length > 0,
    };
  };

  // QR Attendance
  const activeQrSession = qrSessions.find(
    (s) => s.isActive && new Date(s.expiresAt).getTime() > Date.now()
  ) || null;

  const generateQrSession = (
    sessionId: string,
    courseTitle: string,
    ecCode: string,
    roomName: string,
    teacherId: string,
    groupId: string,
    validityMinutes: number = 15
  ): QrAttendanceSession => {
    const randomOtp = `EBM-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date();
    const expires = new Date(now.getTime() + validityMinutes * 60000);

    const newQrSession: QrAttendanceSession = {
      id: `qr-${Date.now()}`,
      sessionId,
      courseTitle,
      ecCode,
      roomName,
      teacherId,
      groupId,
      codeToken: randomOtp,
      generatedAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      isActive: true,
      records: [],
    };

    setQrSessions((prev) => [newQrSession, ...prev]);
    logAudit('GENERATION_QR_PRESENCE', `Génération QR Code présence pour ${courseTitle} (${ecCode}) - Code: ${randomOtp} (Expire dans ${validityMinutes}min)`);
    return newQrSession;
  };

  const rotateQrSessionToken = (qrSessionId: string, validityMinutes: number = 15): string | undefined => {
    const newOtp = `EBM-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date();
    const expires = new Date(now.getTime() + validityMinutes * 60000);
    setQrSessions((prev) =>
      prev.map((s) =>
        s.id === qrSessionId
          ? {
              ...s,
              codeToken: newOtp,
              generatedAt: now.toISOString(),
              expiresAt: expires.toISOString(),
            }
          : s
      )
    );
    logAudit('RENOUVELLEMENT_QR_PRESENCE', `Renouvellement dynamique du jeton QR (${newOtp}) pour la séance ${qrSessionId}`);
    return newOtp;
  };

  const stopQrSession = (qrSessionId: string) => {
    setQrSessions((prev) =>
      prev.map((s) => (s.id === qrSessionId ? { ...s, isActive: false } : s))
    );
    logAudit('ARRET_QR_PRESENCE', `Clôture de la session QR Code ${qrSessionId}`);
  };

  const scanQrAttendance = (codeToken: string, studentId: string) => {
    const cleanToken = codeToken.trim().toUpperCase();
    const targetSession = qrSessions.find(
      (s) => s.isActive && s.codeToken.toUpperCase() === cleanToken
    );

    if (!targetSession) {
      return { success: false, message: 'Code QR ou OTP invalide, ou la session a été renouvelée / expirée (ACC-030).' };
    }

    if (new Date(targetSession.expiresAt).getTime() < Date.now()) {
      return { success: false, message: 'Ce QR Code de présence a expiré (ACC-030).' };
    }

    const student = users.find((u) => u.id === studentId);
    if (!student || student.role !== 'STUDENT') {
      return { success: false, message: 'Compte étudiant introuvable ou non autorisé.' };
    }

    // ACC-032: Verify student belongs to the session's group
    if (targetSession.groupId && student.groupId && student.groupId !== targetSession.groupId) {
      logAudit(
        'POINTAGE_QR_REJETE_GROUPE',
        `Rejet pointage QR : ${student.name} (${student.matricule}) n'appartient pas au groupe ${targetSession.groupId}`
      );
      return {
        success: false,
        message: `Pointage refusé (ACC-032) : L'étudiant ${student.name} (${student.matricule}) n'est pas inscrit dans le groupe concerné par cette séance.`,
      };
    }

    // ACC-031: Prevent duplicate check-in for the same session
    const alreadyRecorded = targetSession.records.some((r) => r.studentId === studentId);
    if (alreadyRecorded) {
      return { success: false, message: 'Double pointage bloqué (ACC-031) : Votre présence a déjà été enregistrée pour cette séance !' };
    }

    const newRecord: AttendanceRecord = {
      id: `rec-${Date.now()}`,
      studentId,
      studentName: student.name || 'Étudiant',
      matricule: student.matricule || 'N/A',
      scannedAt: new Date().toISOString(),
      status: 'PRESENT',
    };

    setQrSessions((prev) =>
      prev.map((s) =>
        s.id === targetSession.id
          ? { ...s, records: [...s.records, newRecord] }
          : s
      )
    );

    logAudit('POINTAGE_QR_REUSSI', `Présence validée par QR/Code-barres pour ${student.name} (${student.matricule}) sur ${targetSession.courseTitle}`);
    return {
      success: true,
      message: `Présence validée avec succès pour le cours de ${targetSession.courseTitle} !`,
      record: newRecord,
    };
  };

  const updateAttendanceStatus = (
    qrSessionId: string,
    studentId: string,
    status: 'PRESENT' | 'ABSENT' | 'LATE' | 'JUSTIFIED',
    reason?: string
  ) => {
    setQrSessions((prev) =>
      prev.map((s) => {
        if (s.id !== qrSessionId) return s;
        const exists = s.records.some((r) => r.studentId === studentId);
        if (exists) {
          return {
            ...s,
            records: s.records.map((r) =>
              r.studentId === studentId
                ? {
                    ...r,
                    status,
                    justificationReason: reason || r.justificationReason,
                    correctedBy: currentUser.name,
                    correctedAt: new Date().toISOString(),
                  }
                : r
            ),
          };
        } else {
          const student = users.find((u) => u.id === studentId);
          return {
            ...s,
            records: [
              ...s.records,
              {
                id: `rec-corr-${Date.now()}`,
                studentId,
                studentName: student?.name || 'Étudiant',
                matricule: student?.matricule || 'N/A',
                scannedAt: new Date().toISOString(),
                status,
                justificationReason: reason,
                correctedBy: currentUser.name,
                correctedAt: new Date().toISOString(),
              },
            ],
          };
        }
      })
    );

    logAudit('CORRECTION_PRESENCE', `Mise à jour statut présence étudiant ${studentId} -> ${status} (Séance QR: ${qrSessionId})`);
  };

  const recordManualAdminAttendance = (data: {
    groupId: string;
    ecCode: string;
    courseTitle: string;
    date: string;
    studentId: string;
    status: 'PRESENT' | 'ABSENT' | 'LATE' | 'JUSTIFIED';
    reason?: string;
    note?: string;
  }): QrAttendanceSession => {
    const effectiveReason = data.reason || data.note;
    const student = users.find((u) => u.id === data.studentId);
    const existingSession = qrSessions.find(
      (s) =>
        s.groupId === data.groupId &&
        s.ecCode === data.ecCode &&
        s.generatedAt.startsWith(data.date)
    );

    if (existingSession) {
      updateAttendanceStatus(existingSession.id, data.studentId, data.status, effectiveReason);
      return existingSession;
    }

    const newRecord: AttendanceRecord = {
      id: `rec-adm-${Date.now()}`,
      studentId: data.studentId,
      studentName: student?.name || 'Étudiant',
      matricule: student?.matricule || 'N/A',
      scannedAt: `${data.date}T08:30:00.000Z`,
      status: data.status,
      justificationReason: effectiveReason || 'Pointage manuel Administration / Scolarité',
      correctedBy: currentUser.name,
      correctedAt: new Date().toISOString(),
    };

    const manualSession: QrAttendanceSession = {
      id: `qr-adm-${Date.now()}`,
      sessionId: `adm-sess-${data.date}`,
      courseTitle: data.courseTitle,
      ecCode: data.ecCode,
      roomName: 'Secrétariat / Pointage Administratif',
      teacherId: currentUser.id,
      groupId: data.groupId,
      codeToken: `ADM-${Math.floor(1000 + Math.random() * 9000)}`,
      generatedAt: `${data.date}T08:00:00.000Z`,
      expiresAt: `${data.date}T18:00:00.000Z`,
      isActive: false,
      records: [newRecord],
    };

    setQrSessions((prev) => [manualSession, ...prev]);
    logAudit(
      'POINTAGE_MANUEL_ADMINISTRATION',
      `Pointage manuel par ${currentUser.name} pour ${student?.name} (${student?.matricule}) : ${data.status} sur ${data.ecCode} (${data.date}). Motif : ${data.reason || 'RAS'}`
    );
    return manualSession;
  };

  // Messaging & Group Wall
  const sendMessage = (data: { recipientId?: string; recipientGroupId?: string; subject: string; content: string }) => {
    const newMessage: InternalMessage = {
      id: `msg-${Date.now()}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      recipientId: data.recipientId,
      recipientGroupId: data.recipientGroupId,
      subject: data.subject,
      content: data.content,
      timestamp: new Date().toISOString(),
      isRead: false,
    };

    setInternalMessages((prev) => [newMessage, ...prev]);

    if (data.recipientId) {
      triggerNotification({
        recipientId: data.recipientId,
        title: `📩 Nouveau message : ${data.subject}`,
        message: `${currentUser.name} vous a envoyé un message : "${data.content.slice(0, 80)}..."`,
        type: 'INFO',
      });
    }

    logAudit('ENVOI_MESSAGE_INTERNE', `Message envoyé par ${currentUser.name} : "${data.subject}"`);
  };

  const markMessageAsRead = (messageId: string) => {
    setInternalMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, isRead: true } : m))
    );
  };

  const createGroupPost = (data: { groupId: string; title: string; content: string; category: GroupPost['category']; isPinned?: boolean }) => {
    const newPost: GroupPost = {
      id: `post-${Date.now()}`,
      groupId: data.groupId,
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorRole: currentUser.role,
      title: data.title,
      content: data.content,
      category: data.category,
      isPinned: data.isPinned || false,
      createdAt: new Date().toISOString(),
      commentsCount: 0,
    };

    setGroupPosts((prev) => [newPost, ...prev]);

    // Notify all group students
    const groupStudents = users.filter((u) => u.groupId === data.groupId);
    groupStudents.forEach((st) => {
      triggerNotification({
        recipientId: st.id,
        recipientRole: 'STUDENT',
        title: `📢 Publication groupe : ${data.title}`,
        message: `${currentUser.name} a publié sur le mur du groupe : "${data.content.slice(0, 75)}..."`,
        type: 'INFO',
      });
    });

    logAudit('PUBLICATION_MUR_GROUPE', `Publication mur groupe ${data.groupId} : "${data.title}"`);
  };

  const deleteGroupPost = (postId: string) => {
    setGroupPosts((prev) => prev.filter((p) => p.id !== postId));
    logAudit('SUPPRESSION_POST_GROUPE', `Suppression du post ${postId}`);
  };

  // Financial Management in Ariary (Ar) & Cash Register
  const addFee = (data: Omit<StudentFee, 'id'>) => {
    const newFee: StudentFee = {
      ...data,
      id: `fee-${Date.now()}`,
    };
    setFees((prev) => [...prev, newFee]);
    logAudit('CREATION_FRAIS', `Création d’un frais : ${newFee.title} - Montant: ${newFee.amountAr.toLocaleString()} Ar`);
  };

  const updateFee = (id: string, updates: Partial<StudentFee>) => {
    setFees((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f;
        const updated = { ...f, ...updates };
        syncDocToFirestore('fees', updated);
        return updated;
      })
    );
    logAudit('MODIFICATION_FRAIS', `Modification du tarif/frais ${id} (${updates.title || ''}) par ${currentUser.name}`);
  };

  const deleteFee = (id: string) => {
    const target = fees.find((f) => f.id === id);
    setFees((prev) => prev.filter((f) => f.id !== id));
    logAudit('SUPPRESSION_FRAIS', `Suppression du frais "${target?.title || id}" du catalogue par ${currentUser.name}`);
  };

  const recordPayment = (data: {
    studentId: string;
    feeId: string;
    amountPaidAr: number;
    paymentMethod: PaymentMethod;
    referenceNumber?: string;
    notes?: string;
  }) => {
    const fee = fees.find((f) => f.id === data.feeId);
    if (!fee) {
      return { success: false, error: 'Frais introuvable.' };
    }

    const previousPaidForFee = payments
      .filter((p) => p.studentId === data.studentId && p.feeId === data.feeId && !p.isCancelled)
      .reduce((sum, p) => sum + p.amountPaidAr, 0);

    const currentRemainingAr = Math.max(0, fee.amountAr - previousPaidForFee);

    // ACC-009 & ACC-012: Block double payment if fee is already 100% paid
    if (currentRemainingAr <= 0) {
      return {
        success: false,
        error: `Double paiement bloqué (ACC-012) : Le frais "${fee.title}" est déjà intégralement soldé (0 Ar restant).`,
      };
    }

    if (data.amountPaidAr <= 0) {
      return { success: false, error: 'Le montant encaissé doit être supérieur à 0 Ar.' };
    }

    if (data.amountPaidAr > currentRemainingAr) {
      return {
        success: false,
        error: `Le montant saisi (${data.amountPaidAr.toLocaleString()} Ar) dépasse le solde restant dû (${currentRemainingAr.toLocaleString()} Ar) pour ce frais (ACC-010).`,
      };
    }

    const newTotalPaid = previousPaidForFee + data.amountPaidAr;
    const remainingBalanceAr = Math.max(0, fee.amountAr - newTotalPaid);

    const receiptNumber = `REC-EBM-2026-${String(payments.length + 1).padStart(4, '0')}`;
    const newTransaction: PaymentTransaction = {
      id: `pay-${Date.now()}`,
      receiptNumber,
      studentId: data.studentId,
      feeId: data.feeId,
      amountPaidAr: data.amountPaidAr,
      remainingBalanceAr,
      paymentMethod: data.paymentMethod,
      referenceNumber: data.referenceNumber,
      paymentDate: new Date().toISOString().split('T')[0],
      recordedBy: currentUser.name,
      notes: data.notes,
    };

    setPayments((prev) => [newTransaction, ...prev]);

    // Update today's cash register distinctly by payment method (Cash vs Mobile Money vs Bank)
    const todayStr = new Date().toISOString().split('T')[0];
    setCashRegisterDays((prev) => {
      const todayRegister = prev.find((d) => d.date === todayStr);
      if (todayRegister) {
        if (todayRegister.isClosed) {
          return prev;
        }
        const updated: CashRegisterDay = {
          ...todayRegister,
          cashCollectedAr:
            data.paymentMethod === 'ESPECES'
              ? todayRegister.cashCollectedAr + data.amountPaidAr
              : todayRegister.cashCollectedAr,
          mobileMoneyCollectedAr:
            data.paymentMethod === 'MOBILE_MONEY'
              ? todayRegister.mobileMoneyCollectedAr + data.amountPaidAr
              : todayRegister.mobileMoneyCollectedAr,
          bankCollectedAr:
            data.paymentMethod === 'DEPOT_BANCAIRE' || data.paymentMethod === 'VIREMENT_BANCAIRE'
              ? todayRegister.bankCollectedAr + data.amountPaidAr
              : todayRegister.bankCollectedAr,
          totalCollectedAr: todayRegister.totalCollectedAr + data.amountPaidAr,
          theoreticalClosingAr: todayRegister.theoreticalClosingAr + data.amountPaidAr,
        };
        return prev.map((d) => (d.date === todayStr ? updated : d));
      } else {
        const newRegister: CashRegisterDay = {
          id: `crd-${Date.now()}`,
          date: todayStr,
          openingBalanceAr: 500000,
          cashCollectedAr: data.paymentMethod === 'ESPECES' ? data.amountPaidAr : 0,
          mobileMoneyCollectedAr: data.paymentMethod === 'MOBILE_MONEY' ? data.amountPaidAr : 0,
          bankCollectedAr:
            data.paymentMethod === 'DEPOT_BANCAIRE' || data.paymentMethod === 'VIREMENT_BANCAIRE'
              ? data.amountPaidAr
              : 0,
          totalCollectedAr: data.amountPaidAr,
          refundsAr: 0,
          theoreticalClosingAr: 500000 + data.amountPaidAr,
          isClosed: false,
          closureNotes: 'Session de caisse active.',
        };
        return [newRegister, ...prev];
      }
    });

    const student = users.find((u) => u.id === data.studentId);
    triggerNotification({
      recipientId: data.studentId,
      recipientRole: 'STUDENT',
      title: `🧾 Reçu de paiement émis : ${receiptNumber}`,
      message: `Votre règlement de ${data.amountPaidAr.toLocaleString()} Ar pour "${fee.title}" a été validé. Solde restant : ${remainingBalanceAr.toLocaleString()} Ar.`,
      type: 'SUCCESS',
    });

    // Notify linked parents (ACC-090)
    const linkedParents = users.filter(
      (u) => u.role === 'PARENT' && u.linkedStudentIds?.includes(data.studentId)
    );
    linkedParents.forEach((par) => {
      triggerNotification({
        recipientId: par.id,
        recipientRole: 'PARENT',
        title: `🧾 Paiement enregistré (${student?.name}) : ${receiptNumber}`,
        message: `Règlement de ${data.amountPaidAr.toLocaleString()} Ar validé pour "${fee.title}". Solde restant : ${remainingBalanceAr.toLocaleString()} Ar.`,
        type: 'SUCCESS',
      });
    });

    logAudit(
      'ENCAISSEMENT_PAIEMENT_ARIARY',
      `Encaissé ${data.amountPaidAr.toLocaleString()} Ar pour l’étudiant ${student?.name} (${receiptNumber}) via ${data.paymentMethod}. Solde restant: ${remainingBalanceAr.toLocaleString()} Ar.`
    );

    return {
      success: true,
      transaction: newTransaction,
      receiptNumber,
    };
  };

  const cancelPayment = (paymentId: string, reason: string) => {
    const targetPayment = payments.find((p) => p.id === paymentId);
    if (!targetPayment || targetPayment.isCancelled) return;

    setPayments((prev) =>
      prev.map((p) =>
        p.id === paymentId
          ? {
              ...p,
              isCancelled: true,
              cancelReason: reason,
              cancelledBy: currentUser.name,
              cancelledAt: new Date().toISOString(),
              notes: `${p.notes || ''} [ANNULÉ par ${currentUser.name}: ${reason}]`.trim(),
            }
          : p
      )
    );

    // Update cash register day to reflect the voided transaction
    setCashRegisterDays((prev) =>
      prev.map((d) => {
        if (d.date !== targetPayment.paymentDate || d.isClosed) return d;
        const amt = targetPayment.amountPaidAr;
        return {
          ...d,
          cashCollectedAr:
            targetPayment.paymentMethod === 'ESPECES' ? Math.max(0, d.cashCollectedAr - amt) : d.cashCollectedAr,
          mobileMoneyCollectedAr:
            targetPayment.paymentMethod === 'MOBILE_MONEY'
              ? Math.max(0, d.mobileMoneyCollectedAr - amt)
              : d.mobileMoneyCollectedAr,
          bankCollectedAr:
            targetPayment.paymentMethod === 'DEPOT_BANCAIRE' || targetPayment.paymentMethod === 'VIREMENT_BANCAIRE'
              ? Math.max(0, d.bankCollectedAr - amt)
              : d.bankCollectedAr,
          totalCollectedAr: Math.max(0, d.totalCollectedAr - amt),
          refundsAr: (d.refundsAr || 0) + amt,
          theoreticalClosingAr: Math.max(0, d.theoreticalClosingAr - amt),
        };
      })
    );

    logAudit(
      'ANNULATION_PAIEMENT',
      `Annulation du reçu de paiement ${targetPayment.receiptNumber} (${targetPayment.amountPaidAr.toLocaleString()} Ar). Motif : ${reason}`
    );
  };

  const closeCashRegisterDay = (date: string, actualClosingAr: number, closureNotes?: string) => {
    const register = cashRegisterDays.find((d) => d.date === date);
    if (!register) {
      return { success: false, discrepancyAr: 0, message: 'Journée de caisse introuvable.' };
    }
    if (register.isClosed) {
      return { success: false, discrepancyAr: 0, message: 'Cette journée de caisse est déjà clôturée et verrouillée.' };
    }

    const discrepancyAr = actualClosingAr - register.theoreticalClosingAr;

    setCashRegisterDays((prev) =>
      prev.map((d) =>
        d.date === date
          ? {
              ...d,
              actualClosingAr,
              discrepancyAr,
              isClosed: true,
              closedBy: currentUser.name,
              closedAt: new Date().toISOString(),
              closureNotes: closureNotes || `Clôture journalière effectuée par ${currentUser.name}. Écart : ${discrepancyAr.toLocaleString()} Ar.`,
            }
          : d
      )
    );

    logAudit(
      'CLOTURE_CAISSE_JOURNALIERE',
      `Clôture caisse du ${date} par ${currentUser.name}. Réel compté: ${actualClosingAr.toLocaleString()} Ar, Théorique: ${register.theoreticalClosingAr.toLocaleString()} Ar, Écart: ${discrepancyAr.toLocaleString()} Ar.`
    );

    return {
      success: true,
      discrepancyAr,
      message: `Caisse clôturée avec succès. Écart constaté : ${discrepancyAr.toLocaleString()} Ar.`,
    };
  };

  const getStudentFinancialSummary = (studentId: string) => {
    const student = users.find((u) => u.id === studentId);
    let applicableFees = fees.filter(
      (f) =>
        f.academicYear === selectedAcademicYear &&
        (f.studentId === studentId || (student?.groupId && f.groupId === student?.groupId) || (!f.studentId && !f.groupId))
    );

    // Fallback: if a student's group has no specific fees yet, include general institutional fees of the academic year
    if (applicableFees.length === 0) {
      applicableFees = fees.filter((f) => f.academicYear === selectedAcademicYear && !f.studentId);
    }

    let totalFeesAr = 0;
    let totalPaidAr = 0;

    const feeDetails = applicableFees.map((fee) => {
      totalFeesAr += fee.amountAr;
      const paidForFee = payments
        .filter((p) => p.studentId === studentId && p.feeId === fee.id && !p.isCancelled)
        .reduce((sum, p) => sum + p.amountPaidAr, 0);

      totalPaidAr += paidForFee;
      const remainingAr = Math.max(0, fee.amountAr - paidForFee);
      const status: 'PAID' | 'PARTIAL' | 'UNPAID' =
        remainingAr === 0 ? 'PAID' : paidForFee > 0 ? 'PARTIAL' : 'UNPAID';

      return {
        fee,
        paidAr: paidForFee,
        remainingAr,
        status,
      };
    });

    const balanceDueAr = Math.max(0, totalFeesAr - totalPaidAr);

    return {
      totalFeesAr,
      totalPaidAr,
      balanceDueAr,
      feeDetails,
    };
  };

  // Homework & Learning Resources
  const createHomework = (data: Omit<HomeworkAssignment, 'id' | 'publishedAt'>) => {
    const newHw: HomeworkAssignment = {
      ...data,
      id: `hw-${Date.now()}`,
      publishedAt: new Date().toISOString(),
    };
    setHomework((prev) => [newHw, ...prev]);

    // Notify group students
    const groupStudents = users.filter((u) => u.groupId === data.groupId);
    groupStudents.forEach((st) => {
      triggerNotification({
        recipientId: st.id,
        recipientRole: 'STUDENT',
        title: `📝 Nouveau devoir : ${data.title}`,
        message: `Date limite de dépôt : ${new Date(data.dueDate).toLocaleString('fr-FR')}.`,
        type: 'INFO',
      });
    });

    logAudit('CREATION_DEVOIR', `Nouveau devoir créé par ${currentUser.name} : "${data.title}" pour groupe ${data.groupId}`);
  };

  const submitHomework = (
    homeworkId: string,
    fileName: string,
    fileSize: string,
    studentComment?: string,
    fileSizeBytes?: number,
    fileUrl?: string
  ) => {
    const hw = homework.find((h) => h.id === homeworkId);
    if (!hw) return { success: false, error: 'Devoir introuvable.' };

    // ACC-026: Ensure student belongs to the homework's group
    if (currentUser.role === 'STUDENT' && currentUser.groupId && hw.groupId && currentUser.groupId !== hw.groupId) {
      return {
        success: false,
        error: 'Accès refusé (ACC-026) : Vous ne pouvez pas déposer un devoir pour une classe à laquelle vous n’appartenez pas.',
      };
    }

    // ACC-022 & ACC-023: Validate file extension and max size
    const storageCfg = appSettings.storageSettings || {
      maxFileSizeMb: 15,
      allowedExtensions: ['PDF', 'DOCX', 'XLSX', 'PPTX', 'JPG', 'PNG', 'ZIP'],
      globalQuotaMb: 5000,
      studentQuotaMb: 100,
      teacherQuotaMb: 500,
      autoArchiveClosedYears: true,
    };

    const ext = fileName.includes('.') ? fileName.split('.').pop()?.toUpperCase() || '' : '';
    if (!ext || !storageCfg.allowedExtensions.includes(ext)) {
      return {
        success: false,
        error: `Format de fichier refusé (ACC-023) : L’extension ".${ext || '?'}" n’est pas autorisée. Formats acceptés : ${storageCfg.allowedExtensions.join(', ')}.`,
      };
    }

    const maxBytes = storageCfg.maxFileSizeMb * 1024 * 1024;
    if (fileSizeBytes && fileSizeBytes > maxBytes) {
      return {
        success: false,
        error: `Fichier trop volumineux (ACC-022) : La taille (${(fileSizeBytes / (1024 * 1024)).toFixed(2)} Mo) dépasse la limite autorisée de ${storageCfg.maxFileSizeMb} Mo.`,
      };
    }

    const isLate = Date.now() > new Date(hw.dueDate).getTime();
    if (isLate && !hw.allowLateSubmission) {
      return { success: false, error: 'La date limite est dépassée et les dépôts tardifs ne sont pas acceptés.' };
    }

    const newSub: HomeworkSubmission = {
      id: `sub-${currentUser.id}-${homeworkId}-${Date.now()}`,
      homeworkId,
      studentId: currentUser.id,
      studentName: currentUser.name,
      submittedAt: new Date().toISOString(),
      isLate,
      fileName,
      fileSize,
      fileSizeBytes: fileSizeBytes || 1250000,
      fileUrl: fileUrl || `#blob-${encodeURIComponent(fileName)}`,
      studentComment,
      isGraded: false,
      academicYear: selectedAcademicYear,
    };

    setSubmissions((prev) => {
      const filtered = prev.filter((s) => !(s.homeworkId === homeworkId && s.studentId === currentUser.id));
      return [newSub, ...filtered];
    });

    logAudit('DEPOT_DEVOIR', `Dépôt du devoir "${hw.title}" par ${currentUser.name} (Fichier: ${fileName}, Taille: ${fileSize}, En retard: ${isLate ? 'Oui' : 'Non'})`);
    return { success: true, submission: newSub };
  };

  const gradeSubmission = (submissionId: string, grade: number, feedback: string) => {
    setSubmissions((prev) =>
      prev.map((s) =>
        s.id === submissionId
          ? { ...s, grade, teacherFeedback: feedback, isGraded: true }
          : s
      )
    );

    const sub = submissions.find((s) => s.id === submissionId);
    if (sub) {
      triggerNotification({
        recipientId: sub.studentId,
        recipientRole: 'STUDENT',
        title: `✅ Devoir noté : ${grade}/20`,
        message: `Votre travail a été évalué par l’enseignant. Feedback : "${feedback}".`,
        type: 'SUCCESS',
      });
    }

    logAudit('EVALUATION_DEVOIR', `Devoir évalué par ${currentUser.name} : Note ${grade}/20`);
  };

  const addLearningResource = (data: Omit<LearningResource, 'id' | 'publishedAt'>) => {
    const storageCfg = appSettings.storageSettings || {
      maxFileSizeMb: 15,
      allowedExtensions: ['PDF', 'DOCX', 'XLSX', 'PPTX', 'JPG', 'PNG', 'ZIP'],
      globalQuotaMb: 5000,
      studentQuotaMb: 100,
      teacherQuotaMb: 500,
      autoArchiveClosedYears: true,
    };

    if (data.category !== 'LINK' && data.fileName) {
      const ext = data.fileName.includes('.') ? data.fileName.split('.').pop()?.toUpperCase() || '' : '';
      if (ext && !storageCfg.allowedExtensions.includes(ext)) {
        return {
          success: false,
          error: `Format de fichier refusé (ACC-023) : L’extension ".${ext}" n’est pas autorisée (${storageCfg.allowedExtensions.join(', ')}).`,
        };
      }
      const maxBytes = storageCfg.maxFileSizeMb * 1024 * 1024;
      if (data.fileSizeBytes && data.fileSizeBytes > maxBytes) {
        return {
          success: false,
          error: `Fichier trop volumineux (ACC-022) : ${(data.fileSizeBytes / (1024 * 1024)).toFixed(2)} Mo dépasse le plafond de ${storageCfg.maxFileSizeMb} Mo.`,
        };
      }
    }

    const newRes: LearningResource = {
      ...data,
      id: `res-${Date.now()}`,
      publishedAt: new Date().toISOString(),
      academicYear: data.academicYear || selectedAcademicYear,
    };
    setLearningResources((prev) => [newRes, ...prev]);
    logAudit('AJOUT_RESSOURCE', `Support pédagogique ajouté par ${currentUser.name} : "${data.title}" (${data.fileName})`);
    return { success: true, resource: newRes };
  };

  const deleteLearningResource = (id: string) => {
    setLearningResources((prev) => prev.filter((r) => r.id !== id));
    logAudit('SUPPRESSION_RESSOURCE', `Support pédagogique supprimé ${id}`);
  };

  const archiveOldResources = (targetYear?: string): number => {
    let archivedCount = 0;
    setLearningResources((prev) =>
      prev.map((r) => {
        if ((!targetYear || r.academicYear === targetYear) && !r.isArchived) {
          archivedCount++;
          return { ...r, isArchived: true };
        }
        return r;
      })
    );
    logAudit('ARCHIVAGE_RESSOURCES', `Archivage de ${archivedCount} ressources pédagogiques (${targetYear || 'toutes années'})`);
    return archivedCount;
  };

  // Custom RBAC Roles, Student Profile Validation Workflow, Student Cards & Parent Links (SIS v1.2)
  const addCustomRole = (data: Omit<CustomRoleDefinition, 'id' | 'createdAt'>): CustomRoleDefinition => {
    const created: CustomRoleDefinition = {
      ...data,
      id: `crole-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setCustomRoles((prev) => [...prev, created]);
    logAudit('CREATION_ROLE_PERSONNALISE', `Création du rôle personnalisé "${created.label}" (${created.code})`);
    return created;
  };

  const updateCustomRole = (id: string, updates: Partial<CustomRoleDefinition>) => {
    setCustomRoles((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
    logAudit('MODIFICATION_ROLE_PERSONNALISE', `Mise à jour du rôle personnalisé ${id}`);
  };

  const deleteCustomRole = (id: string) => {
    setCustomRoles((prev) => prev.filter((r) => r.id !== id));
    logAudit('SUPPRESSION_ROLE_PERSONNALISE', `Suppression du rôle personnalisé ${id}`);
  };

  const requestProfileChange = (
    studentId: string,
    changes: ProfileChangeRequest['changes'],
    reason: string
  ): ProfileChangeRequest => {
    const student = users.find((u) => u.id === studentId);
    const req: ProfileChangeRequest = {
      id: `pcreq-${Date.now()}`,
      studentId,
      studentName: student?.name || 'Étudiant',
      matricule: student?.matricule || 'N/A',
      requestedAt: new Date().toISOString(),
      status: 'PENDING',
      changes,
      reason,
    };
    setProfileChangeRequests((prev) => [req, ...prev]);
    logAudit(
      'DEMANDE_RECTIFICATION_ETAT_CIVIL',
      `Demande de validation administrative déposée par ${req.studentName} (${req.matricule}) : ${changes.map((c) => `${c.label}: ${c.oldValue} -> ${c.newValue}`).join(', ')}`
    );
    return req;
  };

  const approveProfileChangeRequest = (requestId: string, comment?: string) => {
    const req = profileChangeRequests.find((r) => r.id === requestId);
    if (!req) return;
    const updates: Partial<User> = {};
    req.changes.forEach((c) => {
      updates[c.field] = c.newValue;
    });
    updateUser(req.studentId, updates);
    setProfileChangeRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? {
              ...r,
              status: 'APPROVED',
              reviewedBy: currentUser.name,
              reviewedAt: new Date().toISOString(),
              reviewComment: comment || 'Validé par le service Scolarité.',
            }
          : r
      )
    );
    triggerNotification({
      recipientId: req.studentId,
      recipientRole: 'STUDENT',
      title: '✅ Rectification administrative approuvée',
      message: `Votre demande de modification d'état civil a été validée par ${currentUser.name}.`,
      type: 'SUCCESS',
    });
    logAudit('VALIDATION_RECTIFICATION_ETAT_CIVIL', `Approbation de la demande ${requestId} pour ${req.studentName}`);
  };

  const rejectProfileChangeRequest = (requestId: string, comment?: string) => {
    const req = profileChangeRequests.find((r) => r.id === requestId);
    if (!req) return;
    setProfileChangeRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? {
              ...r,
              status: 'REJECTED',
              reviewedBy: currentUser.name,
              reviewedAt: new Date().toISOString(),
              reviewComment: comment || 'Justificatif officiel requis.',
            }
          : r
      )
    );
    triggerNotification({
      recipientId: req.studentId,
      recipientRole: 'STUDENT',
      title: '⚠️ Demande de rectification refusée',
      message: `Motif : ${comment || 'Veuillez présenter un justificatif officiel au secrétariat.'}`,
      type: 'WARNING',
    });
    logAudit('REJET_RECTIFICATION_ETAT_CIVIL', `Rejet de la demande ${requestId} pour ${req.studentName}`);
  };

  const reissueStudentCard = (studentId: string, reason = 'Perte / Renouvellement de carte'): { newToken: string; issueNumber: number } => {
    const student = users.find((u) => u.id === studentId);
    const nextIssue = (student?.cardIssueNumber || 1) + 1;
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const newToken = `EBM-CARD-${(student?.matricule || studentId).slice(-4).toUpperCase()}-V${nextIssue}-${suffix}`;
    const oldToken = student?.cardToken;

    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== studentId) return u;
        return {
          ...u,
          cardToken: newToken,
          cardIssueNumber: nextIssue,
          cardIssuedAt: new Date().toISOString().split('T')[0],
          revokedCardTokens: oldToken ? [...(u.revokedCardTokens || []), oldToken] : u.revokedCardTokens || [],
        };
      })
    );

    logAudit(
      'REEDITION_CARTE_ETUDIANTE',
      `Réédition carte étudiante #${nextIssue} pour ${student?.name} (${student?.matricule}). Ancien token révoqué: ${oldToken || 'Aucun'} -> Nouveau token: ${newToken}. Motif: ${reason}`
    );
    return { newToken, issueNumber: nextIssue };
  };

  const findStudentByScanCode = (code: string): { status: 'FOUND' | 'REVOKED' | 'NOT_FOUND'; student?: User; message: string } => {
    const clean = code.trim().toUpperCase();
    if (!clean) {
      return { status: 'NOT_FOUND', message: 'Veuillez scanner ou saisir un code valide.' };
    }

    // 1. Check if code matches a revoked card token (ACC-078)
    const revokedOwner = users.find(
      (u) => u.role === 'STUDENT' && u.revokedCardTokens?.some((t) => t.toUpperCase() === clean)
    );
    if (revokedOwner) {
      logAudit('SCAN_CARTE_REVOQUEE_BLOQUE', `Tentative de scan d'une ancienne carte désactivée (${clean}) appartenant à ${revokedOwner.name}`);
      return {
        status: 'REVOKED',
        student: revokedOwner,
        message: `Carte désactivée (ACC-078) : Le code "${clean}" correspond à une ancienne carte perdue ou remplacée de ${revokedOwner.name} (${revokedOwner.matricule}). Veuillez utiliser la carte active (${revokedOwner.cardToken}).`,
      };
    }

    // 2. Check active cardToken or exact matricule
    const matched = users.find(
      (u) =>
        u.role === 'STUDENT' &&
        (u.cardToken?.toUpperCase() === clean || u.matricule?.toUpperCase() === clean)
    );

    if (matched) {
      return {
        status: 'FOUND',
        student: matched,
        message: `Étudiant identifié : ${matched.name} (${matched.matricule})`,
      };
    }

    // ACC-077: Unknown code handling
    return {
      status: 'NOT_FOUND',
      message: `Code inconnu ou invalide (ACC-077) : Aucun étudiant actif ne correspond au code-barres / QR "${clean}".`,
    };
  };

  const linkParentToStudent = (parentId: string, studentId: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== parentId) return u;
        const currentLinks = u.linkedStudentIds || [];
        if (currentLinks.includes(studentId)) return u;
        return { ...u, linkedStudentIds: [...currentLinks, studentId] };
      })
    );
    logAudit('RATTACHEMENT_PARENT_ETUDIANT', `Association du compte parent ${parentId} à l'étudiant ${studentId}`);
  };

  const unlinkParentFromStudent = (parentId: string, studentId: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== parentId) return u;
        return {
          ...u,
          linkedStudentIds: (u.linkedStudentIds || []).filter((id) => id !== studentId),
        };
      })
    );
    logAudit('REVOCATION_LIEN_PARENT_ETUDIANT', `Révocation de l'accès du parent ${parentId} au dossier de l'étudiant ${studentId}`);
  };

  // Selective student export: Teacher export strictly excludes telephone & private data (RG-17)
  const getSelectiveStudentExportData = (role: 'TEACHER' | 'ADMIN', groupId?: string) => {
    const studentUsers = users.filter((u) => u.role === 'STUDENT' && (!groupId || u.groupId === groupId));

    if (role === 'TEACHER') {
      const headers = ['Matricule', 'Nom & Prénom', 'Filière', 'Niveau', 'Groupe', 'Statut Compte'];
      const rows = studentUsers.map((st) => {
        const group = groups.find((g) => g.id === st.groupId);
        const filiere = filieres.find((f) => f.id === group?.filiereId);
        return [
          st.matricule || 'N/A',
          st.name,
          filiere?.code || 'INFO',
          group?.level || 'L1',
          group?.code || 'L1-INFO-A',
          st.isActive ? 'Actif' : 'Désactivé',
        ];
      });
      return { headers, rows };
    }

    // Role ADMIN: Complete administrative export with financials and contacts
    const headers = [
      'Matricule',
      'Nom & Prénom',
      'Date de Naissance',
      'Email Institutionnel',
      'Téléphone',
      'Filière',
      'Niveau',
      'Groupe',
      'Statut Compte',
      'Total Frais (Ar)',
      'Total Payé (Ar)',
      'Solde Restant (Ar)',
    ];
    const rows = studentUsers.map((st) => {
      const group = groups.find((g) => g.id === st.groupId);
      const filiere = filieres.find((f) => f.id === group?.filiereId);
      const fin = getStudentFinancialSummary(st.id);
      return [
        st.matricule || 'N/A',
        st.name,
        st.birthDate || 'N/A',
        st.email,
        st.phone || 'Non renseigné',
        filiere?.code || 'INFO',
        group?.level || 'L1',
        group?.code || 'L1-INFO-A',
        st.isActive ? 'Actif' : 'Désactivé',
        fin.totalFeesAr.toLocaleString() + ' Ar',
        fin.totalPaidAr.toLocaleString() + ' Ar',
        fin.balanceDueAr.toLocaleString() + ' Ar',
      ];
    });

    return { headers, rows };
  };

  // Jury Deliberations & Official Decision Engine
  const computeStudentDeliberationPreview = (
    studentId: string,
    academicYear: string,
    semester: SemesterCode | 'ANNUEL',
    bonusPoints?: number
  ) => {
    const rules = getActiveAcademicRules(academicYear);
    const student = users.find((u) => u.id === studentId);
    const studentGroup = groups.find((g) => g.id === student?.groupId);

    const existingRecord = deliberations.find(
      (d) => d.studentId === studentId && d.academicYear === academicYear && d.semester === semester
    );

    const relevantUes = ues.filter((u) => {
      if (u.academicYear !== academicYear) return false;
      if (studentGroup && u.filiereId !== studentGroup.filiereId) return false;
      if (semester !== 'ANNUEL' && u.semester !== semester) return false;
      return true;
    });

    let totalCreditsAttempted = 0;
    let directValidatedCredits = 0;
    let weightedUeSum = 0;
    let totalUeCoef = 0;
    let hasEliminatoryGrade = false;

    relevantUes.forEach((ue) => {
      const summary = getStudentUeSummary(studentId, ue.id);
      const coef = ue.coefficient || ue.creditsEcts || 1;
      totalCreditsAttempted += ue.creditsEcts;
      weightedUeSum += summary.average * coef;
      totalUeCoef += coef;

      if (summary.average >= rules.uePassingScore) {
        directValidatedCredits += ue.creditsEcts;
      }

      summary.ecDetails.forEach((d) => {
        if (d.grade?.finalScore !== undefined && d.grade.finalScore < rules.eliminatoryScore) {
          hasEliminatoryGrade = true;
        }
      });
    });

    const rawAverage = totalUeCoef > 0 ? Number((weightedUeSum / totalUeCoef).toFixed(2)) : 0;
    const appliedBonus = bonusPoints !== undefined ? bonusPoints : (existingRecord?.juryBonusPoints ?? 0);
    const finalAverage = Math.min(20, Number((rawAverage + appliedBonus).toFixed(2)));

    // If inter-UE compensation is enabled and finalAverage >= uePassingScore without eliminatory grade, all attempted credits are validated
    const isCompensatedPass =
      rules.allowInterUeCompensation &&
      finalAverage >= rules.uePassingScore &&
      !hasEliminatoryGrade &&
      totalCreditsAttempted > 0;

    const validatedCredits = isCompensatedPass ? totalCreditsAttempted : directValidatedCredits;

    // Attendance rate
    const groupQr = qrSessions.filter((s) => s.groupId === student?.groupId);
    const presentCount = groupQr.filter((s) =>
      s.records.some((r) => r.studentId === studentId && (r.status === 'PRESENT' || r.status === 'JUSTIFIED'))
    ).length;
    const attendanceRate = groupQr.length > 0 ? Math.round((presentCount / groupQr.length) * 100) : 100;

    // Financial clearance
    const finSummary = getStudentFinancialSummary(studentId);
    const financialClearance = finSummary.balanceDueAr <= 0;

    // Proposed decision
    let proposedDecision: DeliberationDecision = 'AJOURNE';
    if (totalCreditsAttempted === 0) {
      proposedDecision = 'EN_ATTENTE';
    } else if (directValidatedCredits >= totalCreditsAttempted && finalAverage >= rules.uePassingScore && !hasEliminatoryGrade) {
      proposedDecision = 'ADMIS';
    } else if (isCompensatedPass) {
      proposedDecision = 'ADMIS_COMPENSATION';
    } else if (
      validatedCredits >= Math.min(rules.minCreditsForConditionalPass, Math.ceil(totalCreditsAttempted * 0.75)) &&
      !hasEliminatoryGrade
    ) {
      proposedDecision = 'PASSAGE_CONDITIONNEL';
    } else {
      proposedDecision = 'AJOURNE';
    }

    return {
      rawAverage,
      finalAverage,
      totalCreditsAttempted,
      validatedCredits,
      hasEliminatoryGrade,
      attendanceRate,
      financialClearance,
      proposedDecision: existingRecord?.decision || proposedDecision,
      existingRecord,
    };
  };

  const saveDeliberationRecord = (recordData: Omit<DeliberationRecord, 'id'> & { id?: string }): DeliberationRecord => {
    const existing = deliberations.find(
      (d) =>
        d.studentId === recordData.studentId &&
        d.academicYear === recordData.academicYear &&
        d.semester === recordData.semester
    );

    const record: DeliberationRecord = {
      ...recordData,
      id: existing?.id || recordData.id || `delib-${recordData.academicYear}-${recordData.semester}-${recordData.studentId}`,
      deliberatedBy: currentUser.name,
      deliberatedAt: new Date().toISOString(),
    };

    setDeliberations((prev) => {
      const idx = prev.findIndex((d) => d.id === record.id);
      if (idx >= 0) {
        return prev.map((d, i) => (i === idx ? record : d));
      }
      return [...prev, record];
    });

    syncDocToFirestore('deliberations', record);
    logAudit(
      'DELIBERATION_JURY',
      `Délibération étudiant ${record.studentId} (${record.academicYear} - ${record.semester}) : Moyenne ${record.finalAverage}/20, Crédits ${record.validatedCredits}/${record.totalCreditsAttempted} ECTS -> Décision: ${record.decision}`
    );
    return record;
  };

  const lockGroupDeliberations = (academicYear: string, semester: SemesterCode | 'ANNUEL', groupId: string) => {
    const groupStudents = users.filter((u) => u.role === 'STUDENT' && u.groupId === groupId);
    groupStudents.forEach((st) => {
      const preview = computeStudentDeliberationPreview(st.id, academicYear, semester);
      saveDeliberationRecord({
        academicYear,
        semester,
        groupId,
        studentId: st.id,
        rawAverage: preview.rawAverage,
        juryBonusPoints: preview.existingRecord?.juryBonusPoints ?? 0,
        finalAverage: preview.finalAverage,
        totalCreditsAttempted: preview.totalCreditsAttempted,
        validatedCredits: preview.validatedCredits,
        hasEliminatoryGrade: preview.hasEliminatoryGrade,
        attendanceRate: preview.attendanceRate,
        financialClearance: preview.financialClearance,
        decision: preview.proposedDecision,
        juryObservation: preview.existingRecord?.juryObservation || 'Validé en séance plénière du jury EBM Institute.',
        isLocked: true,
      });
    });
    logAudit(
      'VERROUILLAGE_PV_DELIBERATION',
      `Verrouillage officiel du Procès-Verbal de délibération pour le groupe ${groupId} (${academicYear} - ${semester})`
    );
  };

  // Cloud Firestore Synchronization & Backup/Restore
  const createSystemBackup = (label = `Sauvegarde SIS du ${new Date().toLocaleString('fr-FR')}`): SystemBackupSnapshot => {
    const collectionsMap: Record<string, unknown[]> = {
      users,
      courses,
      rooms,
      groups,
      filieres,
      parcours,
      academicYears,
      academicRules,
      ues,
      ecs,
      inscriptions,
      grades,
      deliberations,
      sessions,
      qrSessions,
      fees,
      payments,
      cashRegisterDays,
      homework,
      submissions,
      learningResources,
      internalMessages,
      groupPosts,
      notifications,
      auditLogs,
    };
    const snapshot = buildSystemBackupSnapshot(collectionsMap, currentUser.name, label);
    setSavedBackups((prev) => [snapshot, ...prev.slice(0, 9)]);
    syncDocToFirestore('backups', {
      id: snapshot.id,
      version: snapshot.version,
      createdAt: snapshot.createdAt,
      createdBy: snapshot.createdBy,
      label: snapshot.label,
      checksum: snapshot.checksum,
      recordCount: snapshot.recordCount,
    });
    logAudit('SAUVEGARDE_COMPLETE_SIS', `Création de la sauvegarde système "${snapshot.label}" (${snapshot.recordCount} enregistrements, Checksum: ${snapshot.checksum})`);
    return snapshot;
  };

  const restoreSystemBackup = (snapshot: SystemBackupSnapshot): { success: boolean; message: string } => {
    if (!snapshot || !snapshot.payload) {
      return { success: false, message: 'Fichier de sauvegarde invalide ou incomplet.' };
    }
    // Always create an automatic safety snapshot before restoring
    createSystemBackup(`Sauvegarde auto pré-restauration (${new Date().toLocaleTimeString('fr-FR')})`);

    const p = snapshot.payload as Record<string, unknown[]>;
    if (Array.isArray(p.users)) setUsers(p.users as User[]);
    if (Array.isArray(p.courses)) setCourses(p.courses as Course[]);
    if (Array.isArray(p.rooms)) setRooms(p.rooms as Room[]);
    if (Array.isArray(p.groups)) setGroups(p.groups as StudentGroup[]);
    if (Array.isArray(p.filieres)) setFilieres(p.filieres as Filiere[]);
    if (Array.isArray(p.parcours)) setParcours(p.parcours as Parcours[]);
    if (Array.isArray(p.academicYears)) setAcademicYears(p.academicYears as AcademicYear[]);
    if (Array.isArray(p.academicRules)) setAcademicRules(p.academicRules as AcademicValidationRules[]);
    if (Array.isArray(p.ues)) setUes(p.ues as UniteEnseignement[]);
    if (Array.isArray(p.ecs)) setEcs(p.ecs as ElementConstitutif[]);
    if (Array.isArray(p.inscriptions)) setInscriptions(p.inscriptions as StudentInscription[]);
    if (Array.isArray(p.grades)) setGrades(p.grades as EcGrade[]);
    if (Array.isArray(p.deliberations)) setDeliberations(p.deliberations as DeliberationRecord[]);
    if (Array.isArray(p.sessions)) setSessions(p.sessions as TimetableSession[]);
    if (Array.isArray(p.qrSessions)) setQrSessions(p.qrSessions as QrAttendanceSession[]);
    if (Array.isArray(p.fees)) setFees(p.fees as StudentFee[]);
    if (Array.isArray(p.payments)) setPayments(p.payments as PaymentTransaction[]);
    if (Array.isArray(p.cashRegisterDays)) setCashRegisterDays(p.cashRegisterDays as CashRegisterDay[]);
    if (Array.isArray(p.homework)) setHomework(p.homework as HomeworkAssignment[]);
    if (Array.isArray(p.submissions)) setSubmissions(p.submissions as HomeworkSubmission[]);
    if (Array.isArray(p.learningResources)) setLearningResources(p.learningResources as LearningResource[]);

    logAudit('RESTAURATION_SAUVEGARDE_SIS', `Restauration complète depuis "${snapshot.label}" (Checksum: ${snapshot.checksum})`);
    return {
      success: true,
      message: `Restauration réussie (${snapshot.recordCount} enregistrements rétablis avec succès).`,
    };
  };

  const syncAllToCloudFirestore = async (): Promise<{ success: boolean; totalSynced: number; message: string }> => {
    setCloudSyncStatus('SYNCING');
    // Create a local backup before cloud sync
    createSystemBackup('Sauvegarde automatique avant synchronisation Cloud Firestore');

    if (!auth.currentUser) {
      try {
        await signInAnonymously(auth);
      } catch {
        // If anonymous auth is disabled, require Google Sign-In
      }
    }

    if (!auth.currentUser) {
      setCloudSyncStatus('ERROR');
      return {
        success: false,
        totalSynced: 0,
        message: 'Veuillez vous connecter avec votre compte Google (Firebase Auth) pour écrire dans Cloud Firestore.',
      };
    }

    const batches = await Promise.all([
      syncCollectionBatch('users', users),
      syncCollectionBatch('academicYears', academicYears),
      syncCollectionBatch('filieres', filieres),
      syncCollectionBatch('parcours', parcours),
      syncCollectionBatch('academicRules', academicRules),
      syncCollectionBatch('groups', groups),
      syncCollectionBatch('rooms', rooms),
      syncCollectionBatch('courses', courses),
      syncCollectionBatch('ues', ues),
      syncCollectionBatch('ecs', ecs),
      syncCollectionBatch('inscriptions', inscriptions),
      syncCollectionBatch('grades', grades),
      syncCollectionBatch('deliberations', deliberations),
      syncCollectionBatch('sessions', sessions),
      syncCollectionBatch('fees', fees),
      syncCollectionBatch('payments', payments),
      syncCollectionBatch('cashDays', cashRegisterDays),
      syncCollectionBatch('auditLogs', auditLogs.slice(0, 100)),
    ]);

    const firstError = batches.find((b) => b.error)?.error;
    const totalSynced = batches.reduce((acc, b) => acc + b.syncedCount, 0);

    if (firstError && totalSynced === 0) {
      setCloudSyncStatus('ERROR');
      return { success: false, totalSynced: 0, message: `Erreur Firestore : ${firstError}` };
    }

    setLastSyncDate(new Date());
    setCloudSyncStatus('SYNCED');
    logAudit('SYNCHRONISATION_CLOUD_FIRESTORE', `Synchronisation complète vers Cloud Firestore (${totalSynced} documents synchronisés)`);
    return {
      success: true,
      totalSynced,
      message: `${totalSynced} documents synchronisés et sécurisés dans Cloud Firestore.`,
    };
  };

  const pullFromCloudFirestore = async (): Promise<{ success: boolean; totalPulled: number; message: string }> => {
    if (!auth.currentUser) {
      return {
        success: false,
        totalPulled: 0,
        message: 'Veuillez vous authentifier via Firebase Auth pour charger les données Cloud Firestore.',
      };
    }
    setCloudSyncStatus('SYNCING');
    let totalPulled = 0;

    const cloudUsers = await fetchCollectionFromFirestore<User>('users');
    if (cloudUsers && cloudUsers.length > 0) {
      setUsers(cloudUsers);
      totalPulled += cloudUsers.length;
    }
    const cloudYears = await fetchCollectionFromFirestore<AcademicYear>('academicYears');
    if (cloudYears && cloudYears.length > 0) {
      setAcademicYears(cloudYears);
      totalPulled += cloudYears.length;
    }
    const cloudParcours = await fetchCollectionFromFirestore<Parcours>('parcours');
    if (cloudParcours && cloudParcours.length > 0) {
      setParcours(cloudParcours);
      totalPulled += cloudParcours.length;
    }
    const cloudRules = await fetchCollectionFromFirestore<AcademicValidationRules>('academicRules');
    if (cloudRules && cloudRules.length > 0) {
      setAcademicRules(cloudRules);
      totalPulled += cloudRules.length;
    }
    const cloudUes = await fetchCollectionFromFirestore<UniteEnseignement>('ues');
    if (cloudUes && cloudUes.length > 0) {
      setUes(cloudUes);
      totalPulled += cloudUes.length;
    }
    const cloudEcs = await fetchCollectionFromFirestore<ElementConstitutif>('ecs');
    if (cloudEcs && cloudEcs.length > 0) {
      setEcs(cloudEcs);
      totalPulled += cloudEcs.length;
    }
    const cloudGrades = await fetchCollectionFromFirestore<EcGrade>('grades');
    if (cloudGrades && cloudGrades.length > 0) {
      setGrades(cloudGrades);
      totalPulled += cloudGrades.length;
    }
    const cloudDelibs = await fetchCollectionFromFirestore<DeliberationRecord>('deliberations');
    if (cloudDelibs && cloudDelibs.length > 0) {
      setDeliberations(cloudDelibs);
      totalPulled += cloudDelibs.length;
    }
    const cloudPayments = await fetchCollectionFromFirestore<PaymentTransaction>('payments');
    if (cloudPayments && cloudPayments.length > 0) {
      setPayments(cloudPayments);
      totalPulled += cloudPayments.length;
    }

    setLastSyncDate(new Date());
    setCloudSyncStatus('SYNCED');
    logAudit('CHARGEMENT_CLOUD_FIRESTORE', `Récupération de ${totalPulled} documents depuis Cloud Firestore.`);
    return {
      success: true,
      totalPulled,
      message: totalPulled > 0
        ? `${totalPulled} documents chargés depuis Cloud Firestore.`
        : 'Base Cloud Firestore connectée (aucune donnée distante supplémentaire à fusionner).',
    };
  };

  const resetToDefaultData = () => {
    createSystemBackup('Sauvegarde automatique avant réinitialisation');
    setUsers(initialUsers);
    setCourses(initialCourses);
    setRooms(initialRooms);
    setGroups(initialGroups);
    setFilieres(initialFilieres);
    setParcours(initialParcours);
    setAcademicRules(initialAcademicRules);
    setDeliberations(initialDeliberations);
    setSessions(initialSessions);
    setNotifications(initialNotifications);
    setAuditLogs(initialAuditLogs);
    setUes(initialUes);
    setEcs(initialEcs);
    setInscriptions(initialInscriptions);
    setGrades(initialGrades);
    setQrSessions(initialQrSessions);
    setInternalMessages(initialMessages);
    setGroupPosts(initialGroupPosts);
    setFees(initialFees);
    setPayments(initialPayments);
    setCashRegisterDays(initialCashRegisterDays);
    setHomework(initialHomework);
    setSubmissions(initialSubmissions);
    setLearningResources(initialLearningResources);
    setCurrentUserId('user-admin');
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        switchUserRole,
        isAuthenticated,
        login,
        logout,
        users,
        addUser,
        updateUser,
        deleteUser,
        resetUserPassword,
        sendUserPasswordResetEmail,
        setDirectUserPassword,
        courses,
        rooms,
        groups,
        filieres,
        sessions,
        notifications,
        auditLogs,
        isAndroidView,
        toggleAndroidView,
        isOfflineMode,
        toggleOfflineMode,
        lastSyncDate,
        activePushBanner,
        dismissPushBanner,
        addSession,
        updateSession,
        rescheduleSession,
        cancelSession,
        validateSession,
        deleteSession,
        markAsRead,
        markAllAsRead,
        sendManualPush,
        changePassword,
        toggleUserStatus,
        createStudent,
        importStudents,
        toggleGoogleCalendarLink,
        addCourse,
        updateCourse,
        deleteCourse,
        addRoom,
        updateRoom,
        deleteRoom,
        addTeacher,
        updateTeacher,
        deleteTeacher,
        addGroup,
        updateGroup,
        deleteGroup,
        addFiliere,
        updateFiliere,
        deleteFiliere,
        domaines,
        addDomaine,
        updateDomaine,
        deleteDomaine,
        seedBatchDemoData,
        getCourseHourlyStats,
        getTeacherHourlyStats,

        // Complementary LMD Exports & Academic Years + Parcours + Rules
        academicYears,
        selectedAcademicYear,
        setSelectedAcademicYear,
        createAcademicYear,
        updateAcademicYear,
        deleteAcademicYear,
        setActiveAcademicYear,
        parcours,
        addParcours,
        updateParcours,
        deleteParcours,
        academicRules,
        getActiveAcademicRules,
        updateAcademicRules,
        ues,
        ecs,
        inscriptions,
        addUe,
        updateUe,
        deleteUe,
        addEc,
        updateEc,
        deleteEc,
        duplicateMaquette,
        inscribeStudent,
        grades,
        saveGrade,
        publishGrades,
        calculateEcFinalScore,
        getStudentEcGrade,
        getStudentUeSummary,
        deliberations,
        saveDeliberationRecord,
        lockGroupDeliberations,
        computeStudentDeliberationPreview,
        qrSessions,
        activeQrSession,
        generateQrSession,
        rotateQrSessionToken,
        stopQrSession,
        scanQrAttendance,
        updateAttendanceStatus,
        recordManualAdminAttendance,
        internalMessages,
        groupPosts,
        sendMessage,
        markMessageAsRead,
        createGroupPost,
        deleteGroupPost,
        fees,
        payments,
        cashRegisterDays,
        addFee,
        updateFee,
        deleteFee,
        recordPayment,
        cancelPayment,
        closeCashRegisterDay,
        getStudentFinancialSummary,
        homework,
        submissions,
        learningResources,
        createHomework,
        submitHomework,
        gradeSubmission,
        addLearningResource,
        deleteLearningResource,
        archiveOldResources,
        getSelectiveStudentExportData,

        // Application Settings (Layout, Menus) & Live Messenger
        appSettings,
        updateAppSettings,
        customRoles,
        addCustomRole,
        updateCustomRole,
        deleteCustomRole,
        profileChangeRequests,
        requestProfileChange,
        approveProfileChangeRequest,
        rejectProfileChangeRequest,
        reissueStudentCard,
        findStudentByScanCode,
        linkParentToStudent,
        unlinkParentFromStudent,
        chatMessages,
        sendChatMessage,
        markChatAsRead,
        onlineUsers,

        // Cloud Firebase Auth, Firestore Sync & Backup/Restore
        firebaseUser,
        isCloudConnected,
        cloudSyncStatus,
        loginWithGoogleFirebase,
        syncAllToCloudFirestore,
        pullFromCloudFirestore,
        savedBackups,
        createSystemBackup,
        restoreSystemBackup,

        resetToDefaultData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
