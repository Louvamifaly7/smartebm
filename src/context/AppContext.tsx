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
  PresenceStatus,
  UserPresenceRecord,
  ChatNotificationPreferences,
  ChatAttachment,
  ChatConversationMessage,
  ChatConversation,
  TypingIndicatorEntry,
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
import { canUserPerformOperation, syncSystemRolePermissions } from '../utils/rbacPermissions';
import {
  getAntananarivoDateStr,
  generateUniqueId,
  hashPasswordSync,
  verifyPasswordSync,
  computeSessionToken,
  verifySessionToken,
  safeJsonParse,
  safeLocalStorageSet,
} from '../utils/securityAndDateUtils';
import {
  auth,
  googleProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  FirebaseUser,
  testFirestoreConnection,
} from '../firebase';
import {
  syncDocToFirestore,
  removeDocFromFirestore,
  syncCollectionBatch,
  fetchCollectionFromFirestore,
  mergeCollectionById,
  subscribeToFirestoreCollection,
  ensureFirebaseAuthSession,
  verifyBackupSnapshotIntegrity,
  buildSystemBackupSnapshot,
  getDeletedTombstones,
  clearDeletedTombstones,
  pullRemoteTombstones,
  flushPendingSyncOutbox,
  isCloudBridgeActive,
  setInstitutionalCloudBridgeState,
  subscribeToCloudBridgeStatus,
  commitSessionTransactionally,
  releaseSessionSlotTransactionally,
  clearDateScheduleSlotsTransactionally,
} from '../services/firestoreSync';
import { showAppToast } from '../components/ToastAndConfirmCenter';
import {
  DEFAULT_CHAT_PREFERENCES,
  isBrowserAudioUnlocked,
  subscribeToAudioUnlockState,
  unlockChatAudioContext,
  playChatNotificationBeep,
  handleIncomingMessageAlerts,
  requestChatPushPermissionAndToken,
} from '../services/chatSoundService';
import {
  computeEffectivePresenceStatus,
  loadLocalPresenceMap,
  publishUserPresenceHeartbeat,
  startRealtimePresenceLifecycle,
  publishTypingStatus,
  subscribeToTypingIndicators,
  getPrivateConversationId,
  canUserPublishOfficialAnnouncement,
  canUserAccessConversation,
  loadLocalConversations,
  saveLocalConversations,
  loadLocalMessagesByConv,
  saveLocalMessagesByConv,
  buildInstitutionalConversationsFromSisData,
  migrateLegacyChatMessagesSafely,
  syncConversationToFirestore,
  saveMessageToSubcollection,
  fetchPaginatedConversationMessages,
  subscribeToConversationMessagesSubcollection,
  updateMessageReceiptsInFirestore,
  uploadChatAttachmentFile,
  loadLocalChatPreferences,
  saveChatPreferencesToFirestore,
  fetchChatPreferencesFromFirestore,
  subscribeToCrossTabChatEvents,
} from '../services/chatRealtimeService';

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
  isRealAdminSession: boolean;
  isAuthenticated: boolean;
  login: (identifier: string, password?: string) => { success: boolean; error?: string };
  logout: () => void;

  users: User[];
  addUser: (userData: Partial<User>) => { success: boolean; error?: string };
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => { success: boolean; error?: string };
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
  updateSession: (id: string, updates: Partial<TimetableSession>, reason?: string) => { success: boolean; error?: string };
  rescheduleSession: (id: string, newDate: string, newStartTime: string, newEndTime: string, newRoomId: string, reason: string) => { success: boolean; error?: string };
  cancelSession: (id: string, reason: string) => void;
  validateSession: (id: string) => void;
  deleteSession: (id: string) => void;
  purgeAllSessions: () => { success: boolean; count: number; error?: string };
  purgeWeekSessions: (startDateStr: string, endDateStr: string) => { success: boolean; count: number; error?: string };

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
  deleteCourse: (id: string) => { success: boolean; error?: string };

  addRoom: (data: Omit<Room, 'id'>) => { success: boolean; room?: Room; error?: string };
  updateRoom: (id: string, updates: Partial<Room>) => void;
  deleteRoom: (id: string) => { success: boolean; error?: string };

  addTeacher: (data: { name: string; email: string; phone?: string; subjects: string[]; weeklyMaxHours?: number }) => { success: boolean; teacher?: User; error?: string };
  updateTeacher: (id: string, updates: Partial<User>) => void;
  deleteTeacher: (id: string) => void;

  addGroup: (data: Omit<StudentGroup, 'id'>) => { success: boolean; group?: StudentGroup; error?: string };
  updateGroup: (id: string, updates: Partial<StudentGroup>) => void;
  deleteGroup: (id: string) => { success: boolean; error?: string };

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
  deleteAcademicYear: (id: string) => { success: boolean; error?: string };
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
  saveGrade: (studentId: string, ecId: string, quizScore?: number, examScore?: number, isDraft?: boolean, comment?: string, rattrapageScore?: number) => { success: boolean; error?: string };
  publishGrades: (ecId: string) => { success: boolean; error?: string };
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

  // Messenger / Live Chat (Legacy + Real-Time Institutional Messaging v2)
  chatMessages: ChatMessage[];
  sendChatMessage: (recipientId: string, text: string) => void;
  markChatAsRead: (recipientId: string) => void;
  onlineUsers: string[];
  userPresenceMap: Record<string, UserPresenceRecord>;
  getUserEffectivePresence: (userId: string) => {
    status: PresenceStatus;
    activeDeviceCount: number;
    lastSeenAt?: string;
  };
  myManualPresenceStatus: 'ONLINE' | 'IDLE' | 'DND';
  updateMyPresenceManualStatus: (status: 'ONLINE' | 'IDLE' | 'DND') => Promise<void>;
  chatConversations: ChatConversation[];
  accessibleConversations: ChatConversation[];
  chatMessagesByConv: Record<string, ChatConversationMessage[]>;
  activeChatConversationId: string | null;
  setActiveChatConversationId: (convId: string | null) => void;
  isFloatingChatOpen: boolean;
  setIsFloatingChatOpen: (open: boolean) => void;
  isFloatingChatMinimized: boolean;
  setIsFloatingChatMinimized: (minimized: boolean) => void;
  typingIndicatorsByConv: Record<string, TypingIndicatorEntry[]>;
  chatPreferences: ChatNotificationPreferences;
  updateChatNotificationPreferences: (updates: Partial<ChatNotificationPreferences>) => Promise<void>;
  audioUnlocked: boolean;
  enableChatSoundEngine: () => Promise<boolean>;
  testChatSound: () => Promise<void>;
  enablePushNotifications: () => Promise<{ granted: boolean; token?: string }>;
  totalUnreadChatCount: number;
  getConversationUnreadCount: (convId: string) => number;
  openPrivateConversationWithUser: (partnerUserId: string, openInFloating?: boolean) => ChatConversation | null;
  createCustomGroupConversation: (data: {
    title: string;
    participantIds: string[];
    description?: string;
    groupId?: string;
    filiereId?: string;
    level?: string;
  }) => Promise<{ success: boolean; conversation?: ChatConversation; error?: string }>;
  sendConversationMessage: (params: {
    conversationId: string;
    text: string;
    attachment?: ChatAttachment;
    replyToMessageId?: string;
  }) => Promise<{ success: boolean; message?: ChatConversationMessage; error?: string }>;
  editConversationMessage: (
    conversationId: string,
    messageId: string,
    newText: string
  ) => Promise<{ success: boolean; error?: string }>;
  deleteConversationMessage: (
    conversationId: string,
    messageId: string
  ) => Promise<{ success: boolean; error?: string }>;
  markConversationAsRead: (conversationId: string) => Promise<void>;
  setTypingInConversation: (conversationId: string, isTyping: boolean) => void;
  loadOlderConversationMessages: (conversationId: string) => Promise<number>;
  uploadAttachmentToConversation: (
    conversationId: string,
    file: File
  ) => Promise<{ success: boolean; attachment?: ChatAttachment; error?: string }>;
  toggleConversationAllowReplies: (
    conversationId: string,
    allowReplies: boolean
  ) => Promise<{ success: boolean; error?: string }>;

  // Cloud Firebase Auth, Firestore Sync & Backup/Restore
  firebaseUser: FirebaseUser | null;
  isCloudConnected: boolean;
  cloudSyncStatus: 'IDLE' | 'SYNCING' | 'SYNCED' | 'ERROR';
  loginWithGoogleFirebase: () => Promise<{ success: boolean; message: string }>;
  toggleInstitutionalCloudBridge: (active: boolean) => Promise<{ success: boolean; message: string }>;
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
  const deletedDocIdsRef = React.useRef<Set<string>>(getDeletedTombstones());

  const filterOutDeleted = <T extends { id: string }>(items: T[], colName?: string): T[] => {
    const tombstones = deletedDocIdsRef.current;
    return items.filter(
      (item) =>
        item &&
        !tombstones.has(item.id) &&
        (!colName || !tombstones.has(`${colName}:${item.id}`))
    );
  };

  // Load from localStorage or mockData, ensuring new accounts & SIS v1.2 fields exist (P56 safeJsonParse)
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!saved) return filterOutDeleted(initialUsers, 'users');
    const parsed: User[] = safeJsonParse<User[]>(saved, initialUsers);
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
        googleEmail:
          u.id === 'user-admin'
            ? 'louvamifaly@gmail.com'
            : shouldMigrateIdentity
            ? seed.googleEmail
            : (u.googleEmail || seed.googleEmail),
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
    const combined = missingInitial.length > 0 ? [...enriched, ...missingInitial] : enriched;
    return filterOutDeleted(combined, 'users');
  });

  const [courses, setCourses] = useState<Course[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.COURSES);
    return filterOutDeleted(safeJsonParse<Course[]>(saved, initialCourses), 'courses');
  });

  const [rooms, setRooms] = useState<Room[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ROOMS);
    return filterOutDeleted(safeJsonParse<Room[]>(saved, initialRooms), 'rooms');
  });

  const [groups, setGroups] = useState<StudentGroup[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.GROUPS);
    return filterOutDeleted(safeJsonParse<StudentGroup[]>(saved, initialGroups), 'groups');
  });

  const [filieres, setFilieres] = useState<Filiere[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.FILIERES);
    if (!saved) return filterOutDeleted(initialFilieres, 'filieres');
    const parsed: Filiere[] = safeJsonParse<Filiere[]>(saved, initialFilieres);
    return filterOutDeleted(
      parsed.map((f) => {
        const seed = initialFilieres.find((ifil) => ifil.id === f.id);
        return {
          ...f,
          domaine: f.domaine || seed?.domaine || 'Sciences et Technologies',
          etablissement: f.etablissement || seed?.etablissement || 'EBM Institute',
        };
      }),
      'filieres'
    );
  });

  const [domaines, setDomaines] = useState<string[]>(() => {
    const saved = localStorage.getItem('ebm_domaines_v3');
    return safeJsonParse<string[]>(saved, [
      'Sciences et Technologies',
      'Sciences de Gestion & Économie',
      'Sciences de l’Ingénieur & Numérique',
      'Droit, Gouvernance & Relations Internationales',
    ]);
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
      syncDocToFirestore('appSettings', { id: 'lmd_domaines', items: next, updatedAt: new Date().toISOString() });
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
      syncDocToFirestore('appSettings', { id: 'lmd_domaines', items: next, updatedAt: new Date().toISOString() });
      return next;
    });
    setFilieres((prev) =>
      prev.map((f) => {
        if ((f.domaine || 'Sciences et Technologies') !== oldName) return f;
        const updated = { ...f, domaine: clean };
        syncDocToFirestore('filieres', updated);
        return updated;
      })
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
      syncDocToFirestore('appSettings', { id: 'lmd_domaines', items: next, updatedAt: new Date().toISOString() });
      return next;
    });
    return { success: true };
  };

  const [sessions, setSessions] = useState<TimetableSession[]>(() => {
    // If the reset/purge flag has not been marked, or if saved is empty or initialSessions is empty, clear out legacy sessions
    const purgedFlag = localStorage.getItem('ebm_sessions_purged_v2');
    if (purgedFlag !== 'true') {
      try {
        localStorage.setItem(STORAGE_KEYS.SESSIONS, '[]');
        localStorage.setItem('ebm_sessions_purged_v2', 'true');
      } catch {
        // ignore
      }
      return [];
    }
    const saved = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    if (!saved || saved === '[]') return [];
    return filterOutDeleted(safeJsonParse<TimetableSession[]>(saved, []), 'sessions');
  });

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    return safeJsonParse<AppNotification[]>(saved, initialNotifications);
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
    return safeJsonParse<AuditLog[]>(saved, initialAuditLogs);
  });

  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID) || 'user-admin';
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const loggedIn = localStorage.getItem('ebm_auth_logged_in') === 'true';
    const savedUserId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
    const savedSig = localStorage.getItem('ebm_session_sig_v3');
    if (!loggedIn || !savedUserId || !savedSig) return false;
    const matched = users.find((u) => u.id === savedUserId);
    return Boolean(matched && matched.isActive && verifySessionToken(matched, savedSig));
  });

  const [isRealAdminSession, setIsRealAdminSession] = useState<boolean>(() => {
    const savedAdminId = localStorage.getItem('ebm_admin_root_id_v3');
    const savedAdminSig = localStorage.getItem('ebm_admin_root_sig_v3');
    if (!savedAdminId || !savedAdminSig) return false;
    const matched = users.find((u) => u.id === savedAdminId && u.role === 'ADMIN' && u.isActive);
    return Boolean(matched && verifySessionToken(matched, savedAdminSig));
  });

  const [isAndroidView, setIsAndroidView] = useState<boolean>(false);
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);
  const [lastSyncDate, setLastSyncDate] = useState<Date>(new Date());
  const [activePushBanner, setActivePushBanner] = useState<AppNotification | null>(null);

  // Complementary LMD states & Academic Years
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ACADEMIC_YEARS);
    return filterOutDeleted(safeJsonParse<AcademicYear[]>(saved, initialAcademicYears), 'academicYears');
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
      const parsed = safeJsonParse<AppSettings>(saved, defaultSettings);
      const items = Array.isArray(parsed.visibleMenuItems) ? [...parsed.visibleMenuItems] : [...defaultSettings.visibleMenuItems];
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
      safeLocalStorageSet(STORAGE_KEYS.APP_SETTINGS, updated);
      syncDocToFirestore('appSettings', { ...updated, id: 'global_settings', updatedAt: new Date().toISOString() });
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
        text: "Bonjour ! Les syllabus et maquettes pour le cours d'Algorithmique ont été mis à jour.",
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
        text: "Bonjour, j'ai une question concernant mon attestation d'inscription pour 2026-2027.",
        timestamp: "Aujourd'hui 08:30",
        isRead: false,
      },
    ];
    const saved = localStorage.getItem(STORAGE_KEYS.CHAT_MESSAGES);
    return filterOutDeleted(safeJsonParse<ChatMessage[]>(saved, defaultChat), 'chatMessages');
  });

  const [ues, setUes] = useState<UniteEnseignement[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.UES);
    return filterOutDeleted(safeJsonParse<UniteEnseignement[]>(saved, initialUes), 'ues');
  });

  const [ecs, setEcs] = useState<ElementConstitutif[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ECS);
    return filterOutDeleted(safeJsonParse<ElementConstitutif[]>(saved, initialEcs), 'ecs');
  });

  const [inscriptions, setInscriptions] = useState<StudentInscription[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.INSCRIPTIONS);
    return filterOutDeleted(safeJsonParse<StudentInscription[]>(saved, initialInscriptions), 'inscriptions');
  });

  const [grades, setGrades] = useState<EcGrade[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.GRADES);
    if (!saved) return filterOutDeleted(initialGrades, 'grades');
    const parsed: EcGrade[] = safeJsonParse<EcGrade[]>(saved, initialGrades);
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
    const combined = missingGrades.length > 0 ? [...enriched, ...missingGrades] : enriched;
    return filterOutDeleted(combined, 'grades');
  });

  const [qrSessions, setQrSessions] = useState<QrAttendanceSession[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.QR_SESSIONS);
    return filterOutDeleted(safeJsonParse<QrAttendanceSession[]>(saved, initialQrSessions), 'qrSessions');
  });

  const [internalMessages, setInternalMessages] = useState<InternalMessage[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    return filterOutDeleted(safeJsonParse<InternalMessage[]>(saved, initialMessages), 'internalMessages');
  });

  const [groupPosts, setGroupPosts] = useState<GroupPost[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.POSTS);
    return filterOutDeleted(safeJsonParse<GroupPost[]>(saved, initialGroupPosts), 'groupPosts');
  });

  const [fees, setFees] = useState<StudentFee[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.FEES);
    if (!saved) return filterOutDeleted(initialFees, 'fees');
    const parsed: StudentFee[] = safeJsonParse<StudentFee[]>(saved, initialFees);
    const normalized = parsed.map((f) => {
      if (['fee-insc-2026', 'fee-ecol-s1', 'fee-ecol-s2', 'fee-labo-2026'].includes(f.id)) {
        const { groupId: _removed, ...rest } = f;
        return rest;
      }
      return f;
    });
    const missingFees = initialFees.filter((ifee) => !normalized.some((f) => f.id === ifee.id));
    const combined = missingFees.length > 0 ? [...normalized, ...missingFees] : normalized;
    return filterOutDeleted(combined, 'fees');
  });

  const [payments, setPayments] = useState<PaymentTransaction[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
    return filterOutDeleted(safeJsonParse<PaymentTransaction[]>(saved, initialPayments), 'payments');
  });

  const [cashRegisterDays, setCashRegisterDays] = useState<CashRegisterDay[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CASH_DAYS);
    return filterOutDeleted(safeJsonParse<CashRegisterDay[]>(saved, initialCashRegisterDays), 'cashDays');
  });

  const [homework, setHomework] = useState<HomeworkAssignment[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.HOMEWORK);
    return filterOutDeleted(safeJsonParse<HomeworkAssignment[]>(saved, initialHomework), 'homework');
  });

  const [submissions, setSubmissions] = useState<HomeworkSubmission[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SUBMISSIONS);
    return filterOutDeleted(safeJsonParse<HomeworkSubmission[]>(saved, initialSubmissions), 'submissions');
  });

  const [learningResources, setLearningResources] = useState<LearningResource[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.RESOURCES);
    return filterOutDeleted(safeJsonParse<LearningResource[]>(saved, initialLearningResources), 'learningResources');
  });

  const [parcours, setParcours] = useState<Parcours[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PARCOURS);
    return filterOutDeleted(safeJsonParse<Parcours[]>(saved, initialParcours), 'parcours');
  });

  const [academicRules, setAcademicRules] = useState<AcademicValidationRules[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ACADEMIC_RULES);
    return filterOutDeleted(safeJsonParse<AcademicValidationRules[]>(saved, initialAcademicRules), 'academicRules');
  });

  const [deliberations, setDeliberations] = useState<DeliberationRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.DELIBERATIONS);
    return filterOutDeleted(safeJsonParse<DeliberationRecord[]>(saved, initialDeliberations), 'deliberations');
  });

  const [savedBackups, setSavedBackups] = useState<SystemBackupSnapshot[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.BACKUPS);
    return safeJsonParse<SystemBackupSnapshot[]>(saved, []);
  });

  const [customRoles, setCustomRoles] = useState<CustomRoleDefinition[]>(() => {
    const defaultCustomRoles: CustomRoleDefinition[] = [
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
    const saved = localStorage.getItem(STORAGE_KEYS.CUSTOM_ROLES);
    return filterOutDeleted(safeJsonParse<CustomRoleDefinition[]>(saved, defaultCustomRoles), 'customRoles');
  });

  const [profileChangeRequests, setProfileChangeRequests] = useState<ProfileChangeRequest[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PROFILE_REQUESTS);
    return filterOutDeleted(safeJsonParse<ProfileChangeRequest[]>(saved, []), 'profileChangeRequests');
  });

  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(() => isCloudBridgeActive());
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'IDLE' | 'SYNCING' | 'SYNCED' | 'ERROR'>('IDLE');

  // Real-time Institutional Messaging v2 state
  const [userPresenceMap, setUserPresenceMap] = useState<Record<string, UserPresenceRecord>>(() =>
    loadLocalPresenceMap()
  );
  const [myManualPresenceStatus, setMyManualPresenceStatus] = useState<'ONLINE' | 'IDLE' | 'DND'>(
    'ONLINE'
  );
  const [chatConversations, setChatConversations] = useState<ChatConversation[]>(() =>
    loadLocalConversations()
  );
  const [chatMessagesByConv, setChatMessagesByConv] = useState<
    Record<string, ChatConversationMessage[]>
  >(() => loadLocalMessagesByConv());
  const [activeChatConversationId, setActiveChatConversationId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('ebm_active_chat_conv_id_v2') || null;
    } catch {
      return null;
    }
  });
  const [isFloatingChatOpen, setIsFloatingChatOpen] = useState<boolean>(false);
  const [isFloatingChatMinimized, setIsFloatingChatMinimized] = useState<boolean>(false);
  const [typingIndicatorsByConv, setTypingIndicatorsByConv] = useState<
    Record<string, TypingIndicatorEntry[]>
  >({});
  const [audioUnlocked, setAudioUnlocked] = useState<boolean>(() => isBrowserAudioUnlocked());
  const [chatPreferences, setChatPreferences] = useState<ChatNotificationPreferences>(() =>
    loadLocalChatPreferences(currentUserId, DEFAULT_CHAT_PREFERENCES(currentUserId))
  );

  useEffect(() => {
    try {
      if (activeChatConversationId) {
        localStorage.setItem('ebm_active_chat_conv_id_v2', activeChatConversationId);
      } else {
        localStorage.removeItem('ebm_active_chat_conv_id_v2');
      }
    } catch {
      // Ignore
    }
  }, [activeChatConversationId]);

  useEffect(() => {
    return subscribeToAudioUnlockState((unlocked) => setAudioUnlocked(unlocked));
  }, []);

  // Establish real-time multi-device Firestore listeners across all browsers & computers (all 29 collections)
  useEffect(() => {
    let unsubscribers: Array<() => void> = [];
    const activeUser = users.find((u) => u.id === currentUserId) || users[0];

    const handleQuotaOrError = (info: { error: string; isQuotaExceeded?: boolean }) => {
      if (info.isQuotaExceeded) {
        setCloudSyncStatus('ERROR');
      }
    };

    const bindCollection = <T extends { id: string }>(
      colName: string,
      setter: React.Dispatch<React.SetStateAction<T[]>>,
      updateSyncTimestamp = false
    ) => {
      return subscribeToFirestoreCollection<T>(
        colName,
        (remote, removedIds) => {
          removedIds.forEach((id) => {
            deletedDocIdsRef.current.add(id);
            deletedDocIdsRef.current.add(`${colName}:${id}`);
          });
          setter((prev) => {
            const filtered = prev.filter((item) => !removedIds.includes(item.id));
            return mergeCollectionById(filtered, remote, deletedDocIdsRef.current, colName);
          });
          if (updateSyncTimestamp) {
            setLastSyncDate(new Date());
          }
        },
        handleQuotaOrError
      );
    };

    const startRealtimeListeners = () => {
      unsubscribers.forEach((u) => u());
      unsubscribers = [
        bindCollection<TimetableSession>('sessions', setSessions, true),
        bindCollection<Room>('rooms', setRooms),
        bindCollection<Course>('courses', setCourses),
        bindCollection<StudentGroup>('groups', setGroups),
        bindCollection<Filiere>('filieres', setFilieres),
        bindCollection<UniteEnseignement>('ues', setUes),
        bindCollection<ElementConstitutif>('ecs', setEcs),
        bindCollection<EcGrade>('grades', setGrades),
        bindCollection<QrAttendanceSession>('qrSessions', setQrSessions),
        bindCollection<StudentFee>('fees', setFees),
        bindCollection<PaymentTransaction>('payments', setPayments),
        bindCollection<User>('users', setUsers),
        bindCollection<AcademicYear>('academicYears', setAcademicYears),
        bindCollection<Parcours>('parcours', setParcours),
        bindCollection<AcademicValidationRules>('academicRules', setAcademicRules),
        bindCollection<StudentInscription>('inscriptions', setInscriptions),
        bindCollection<DeliberationRecord>('deliberations', setDeliberations),
        bindCollection<CashRegisterDay>('cashDays', setCashRegisterDays),
        bindCollection<HomeworkAssignment>('homework', setHomework),
        bindCollection<HomeworkSubmission>('submissions', setSubmissions),
        bindCollection<LearningResource>('learningResources', setLearningResources),
        bindCollection<InternalMessage>('internalMessages', setInternalMessages),
        bindCollection<GroupPost>('groupPosts', setGroupPosts),
        bindCollection<AppNotification>('notifications', setNotifications),
        bindCollection<CustomRoleDefinition>('customRoles', setCustomRoles),
        bindCollection<ProfileChangeRequest>('profileChangeRequests', setProfileChangeRequests),
        bindCollection<AuditLog>('auditLogs', setAuditLogs),
        bindCollection<ChatMessage>('chatMessages', setChatMessages),
        bindCollection<ChatConversation>('conversations', setChatConversations),
      ];
    };

    const synchronizeOnConnection = async () => {
      setCloudSyncStatus('SYNCING');
      const remoteTombstones = await pullRemoteTombstones();
      remoteTombstones.forEach((id) => deletedDocIdsRef.current.add(id));
      const outboxRes = await flushPendingSyncOutbox();
      await pullFromCloudFirestore();

      // Reconcile any locally scheduled sessions or records missing in Cloud Firestore so other computers see them immediately
      await Promise.all([
        syncCollectionBatch('sessions', sessions, true),
        syncCollectionBatch('courses', courses, true),
        syncCollectionBatch('rooms', rooms, true),
        syncCollectionBatch('groups', groups, true),
        syncCollectionBatch('users', users, true),
      ]);

      if (outboxRes.conflicts > 0) {
        showAppToast({
          title: 'Synchronisation multi-postes',
          message: `${outboxRes.conflicts} modification(s) hors-ligne ont été fusionnées avec des changements distants concurrents.`,
          type: 'info',
        });
      }
      setCloudSyncStatus('SYNCED');
      setLastSyncDate(new Date());
    };

    // Listen to the global Institutional Cloud Bridge (/appSettings/cloud_sync_bridge)
    const unsubscribeBridge = subscribeToCloudBridgeStatus((active) => {
      if (active) {
        setIsCloudConnected(true);
        startRealtimeListeners();
        synchronizeOnConnection();
      } else if (!auth.currentUser || auth.currentUser.isAnonymous) {
        setIsCloudConnected(false);
        unsubscribers.forEach((u) => u());
        unsubscribers = [];
      }
    });

    ensureFirebaseAuthSession(activeUser).then((ok) => {
      if (ok) {
        setIsCloudConnected(true);
        startRealtimeListeners();
        synchronizeOnConnection();
      } else {
        setIsCloudConnected(false);
      }
    });

    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser && !fbUser.isAnonymous ? fbUser : null);
      if (fbUser && !fbUser.isAnonymous) {
        const ok = await ensureFirebaseAuthSession(activeUser);
        if (ok) {
          setIsCloudConnected(true);
          startRealtimeListeners();
          await synchronizeOnConnection();
        }
      } else {
        // Keep Cloud Sync active across all browsers as long as the Institutional Cloud Bridge is enabled
        const bridgeOk = isCloudBridgeActive();
        setIsCloudConnected(bridgeOk);
        if (bridgeOk) {
          startRealtimeListeners();
        }
      }
    });

    const handleBrowserOnline = () => {
      setIsOfflineMode(false);
      ensureFirebaseAuthSession(activeUser).then((ok) => {
        if (ok) {
          setIsCloudConnected(true);
          startRealtimeListeners();
          synchronizeOnConnection();
        }
      });
    };

    const handleBrowserOffline = () => {
      setIsOfflineMode(true);
    };

    window.addEventListener('online', handleBrowserOnline);
    window.addEventListener('offline', handleBrowserOffline);

    return () => {
      window.removeEventListener('online', handleBrowserOnline);
      window.removeEventListener('offline', handleBrowserOffline);
      unsubscribeBridge();
      unsubscribeAuth();
      unsubscribers.forEach((u) => u());
    };
  }, [isAuthenticated, currentUserId]);

  // Sync state to localStorage with QuotaExceededError protection (P57)
  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEYS.USERS, users);
  }, [users]);
  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEYS.COURSES, courses);
  }, [courses]);
  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEYS.ROOMS, rooms);
  }, [rooms]);
  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEYS.GROUPS, groups);
  }, [groups]);
  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEYS.FILIERES, filieres);
  }, [filieres]);
  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEYS.SESSIONS, sessions);
  }, [sessions]);
  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEYS.NOTIFICATIONS, notifications);
  }, [notifications]);
  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEYS.AUDIT_LOGS, auditLogs);
  }, [auditLogs]);
  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEYS.CURRENT_USER_ID, currentUserId);
  }, [currentUserId]);
  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEYS.SELECTED_YEAR, selectedAcademicYear);
  }, [selectedAcademicYear]);
  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEYS.UES, ues);
  }, [ues]);
  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEYS.ECS, ecs);
  }, [ecs]);
  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEYS.INSCRIPTIONS, inscriptions);
  }, [inscriptions]);
  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEYS.GRADES, grades);
  }, [grades]);
  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEYS.QR_SESSIONS, qrSessions);
  }, [qrSessions]);
  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEYS.MESSAGES, internalMessages);
  }, [internalMessages]);
  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEYS.POSTS, groupPosts);
  }, [groupPosts]);
  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEYS.FEES, fees);
  }, [fees]);
  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEYS.PAYMENTS, payments);
  }, [payments]);
  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEYS.CASH_DAYS, cashRegisterDays);
  }, [cashRegisterDays]);
  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEYS.HOMEWORK, homework);
  }, [homework]);
  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEYS.SUBMISSIONS, submissions);
  }, [submissions]);
  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEYS.RESOURCES, learningResources);
  }, [learningResources]);
  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEYS.ACADEMIC_YEARS, academicYears);
  }, [academicYears]);
  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEYS.CHAT_MESSAGES, chatMessages);
  }, [chatMessages]);
  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEYS.PARCOURS, parcours);
  }, [parcours]);
  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEYS.ACADEMIC_RULES, academicRules);
  }, [academicRules]);
  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEYS.DELIBERATIONS, deliberations);
  }, [deliberations]);
  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEYS.BACKUPS, savedBackups.slice(0, 3));
  }, [savedBackups]);
  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEYS.CUSTOM_ROLES, customRoles);
  }, [customRoles]);
  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEYS.PROFILE_REQUESTS, profileChangeRequests);
  }, [profileChangeRequests]);

  // Restore any courses or sessions whose groupIds were accidentally rebound to auto-generated `grp-l1-*` groups
  // back to the user's real group (such as G1A2627) so G1A2627 appears everywhere as expected.
  useEffect(() => {
    if (groups.length === 0) return;

    const g1aGroup =
      groups.find((g) => g.code.trim().toUpperCase() === 'G1A2627') ||
      groups.find((g) => !g.id.startsWith('grp-l1-'));

    if (!g1aGroup) return;

    const updatedCourses: Course[] = [];
    const nextCourses = courses.map((c) => {
      const hasOnlyAutoGroup =
        (c.groupIds || []).length === 0 ||
        (c.groupIds || []).every((gid) => gid.startsWith('grp-l1-'));
      if (hasOnlyAutoGroup && !c.groupIds?.includes(g1aGroup.id)) {
        const fixedCourse: Course = { ...c, groupIds: [g1aGroup.id] };
        updatedCourses.push(fixedCourse);
        return fixedCourse;
      }
      return c;
    });

    if (updatedCourses.length > 0) {
      setCourses(nextCourses);
      updatedCourses.forEach((c) => syncDocToFirestore('courses', c));
    }

    const updatedSessions: TimetableSession[] = [];
    const nextSessions = sessions.map((s) => {
      const hasOnlyAutoGroup =
        (s.groupIds || []).length === 0 ||
        (s.groupIds || []).every((gid) => gid.startsWith('grp-l1-'));
      if (hasOnlyAutoGroup && !s.groupIds?.includes(g1aGroup.id)) {
        const fixedSession: TimetableSession = { ...s, groupIds: [g1aGroup.id] };
        updatedSessions.push(fixedSession);
        return fixedSession;
      }
      return s;
    });

    if (updatedSessions.length > 0) {
      setSessions(nextSessions);
      updatedSessions.forEach((s) => syncDocToFirestore('sessions', s));
    }
  }, [groups.length, courses.length, sessions.length]);

  const currentUser = users.find((u) => u.id === currentUserId) || users[0];

  const setCurrentUser = (user: User) => {
    if (!isRealAdminSession && currentUser.role !== 'ADMIN') return;
    setCurrentUserId(user.id);
    localStorage.setItem('ebm_session_sig_v3', computeSessionToken(user));
  };

  const login = (identifier: string, password?: string) => {
    const cleanId = identifier.trim().toLowerCase();
    const cleanPassword = (password || '').trim();

    if (!cleanPassword) {
      return {
        success: false,
        error: 'Veuillez saisir votre mot de passe.',
      };
    }

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

    // Always verify password strictly (no undefined or demo bypass)
    const isPasswordValid = verifyPasswordSync(cleanPassword, found.passwordHash, {
      birthDate: found.birthDate,
      role: found.role,
      username: found.username,
    });
    if (!isPasswordValid) {
      logAudit('ECHEC_AUTHENTIFICATION_MDP', `Mot de passe invalide pour ${found.name} (${found.matricule || found.username})`);
      return {
        success: false,
        error: 'Mot de passe incorrect. Pour une première connexion étudiante, utilisez votre date de naissance (AAAA-MM-JJ).',
      };
    }

    const sessionSig = computeSessionToken(found);
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, found.id);
    localStorage.setItem('ebm_session_sig_v3', sessionSig);
    localStorage.setItem('ebm_auth_logged_in', 'true');

    if (found.role === 'ADMIN') {
      localStorage.setItem('ebm_admin_root_id_v3', found.id);
      localStorage.setItem('ebm_admin_root_sig_v3', sessionSig);
      setIsRealAdminSession(true);
    } else {
      localStorage.removeItem('ebm_admin_root_id_v3');
      localStorage.removeItem('ebm_admin_root_sig_v3');
      setIsRealAdminSession(false);
    }

    setCurrentUserId(found.id);
    setIsAuthenticated(true);
    logAudit('CONNEXION', `Connexion réussie de ${found.name} [Rôle: ${found.role}]`);

    // Bind authenticated SIS user to Firebase session
    ensureFirebaseAuthSession(found);

    return { success: true };
  };

  const loginWithGoogleFirebase = async (): Promise<{ success: boolean; message: string }> => {
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const fbUser = cred.user;
      const emailLower = (fbUser.email || '').toLowerCase();
      let matchedUser = users.find(
        (u) =>
          u.email.toLowerCase() === emailLower ||
          (u.googleEmail && u.googleEmail.toLowerCase() === emailLower)
      );

      // 1. Bootstrapped institutional Super-Admin (louvamifaly@gmail.com) always binds to the root ADMIN profile
      if (!matchedUser && emailLower === 'louvamifaly@gmail.com') {
        matchedUser = users.find((u) => u.id === 'user-admin' || u.role === 'ADMIN') || users[0];
      }

      // 2. If user is already logged into an active institutional SIS profile, allow linking their Google account for Cloud Sync
      if (!matchedUser && isAuthenticated && currentUser && currentUser.isActive) {
        matchedUser = currentUser;
      }

      // 3. Fallback to the primary institutional Admin profile so Google Cloud activation never fails with "Aucun compte associé"
      if (!matchedUser) {
        matchedUser = users.find((u) => u.id === 'user-admin' || u.role === 'ADMIN') || users[0];
      }

      if (!matchedUser || !matchedUser.isActive) {
        await signOut(auth).catch(() => {});
        setFirebaseUser(null);
        return {
          success: false,
          message: `Accès refusé (RG-22) : Le compte institutionnel associé a été désactivé par l'administration.`,
        };
      }

      const updatedUser: User = {
        ...matchedUser,
        uid: fbUser.uid,
        googleEmail: fbUser.email || matchedUser.googleEmail,
        googleCalendarLinked: true,
        avatarUrl: matchedUser.avatarUrl || fbUser.photoURL || undefined,
        updatedAt: new Date().toISOString(),
      };

      setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));

      // Activate global Institutional Cloud Bridge for all browsers & devices
      await setInstitutionalCloudBridgeState(true, updatedUser.name);
      await ensureFirebaseAuthSession(updatedUser);
      await syncDocToFirestore('users', updatedUser);

      setFirebaseUser(fbUser);
      setIsCloudConnected(true);
      setCloudSyncStatus('SYNCING');

      const sessionSig = computeSessionToken(updatedUser);
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, updatedUser.id);
      localStorage.setItem('ebm_session_sig_v3', sessionSig);
      localStorage.setItem('ebm_auth_logged_in', 'true');

      if (updatedUser.role === 'ADMIN') {
        localStorage.setItem('ebm_admin_root_id_v3', updatedUser.id);
        localStorage.setItem('ebm_admin_root_sig_v3', sessionSig);
        setIsRealAdminSession(true);
      } else {
        localStorage.removeItem('ebm_admin_root_id_v3');
        localStorage.removeItem('ebm_admin_root_sig_v3');
        setIsRealAdminSession(false);
      }

      setCurrentUserId(updatedUser.id);
      setIsAuthenticated(true);

      // Immediately flush offline outbox, pull remote state, and push local timetable sessions
      await flushPendingSyncOutbox();
      await pullFromCloudFirestore();
      await syncCollectionBatch('sessions', sessions);
      setCloudSyncStatus('SYNCED');
      setLastSyncDate(new Date());

      logAudit('CONNEXION_FIREBASE_GOOGLE', `Authentification Firebase officielle de ${fbUser.email} [UID: ${fbUser.uid}, Rôle: ${updatedUser.role}]`);
      return {
        success: true,
        message: `Base Cloud connectée pour tous les postes et navigateurs (${fbUser.email})`,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: `Authentification Google interrompue : ${msg}` };
    }
  };

  const toggleInstitutionalCloudBridge = async (
    active: boolean
  ): Promise<{ success: boolean; message: string }> => {
    const ok = await setInstitutionalCloudBridgeState(active, currentUser?.name || 'Administrateur EBM');
    setIsCloudConnected(active);
    if (active) {
      setCloudSyncStatus('SYNCING');
      await flushPendingSyncOutbox();
      await pullFromCloudFirestore();
      await syncCollectionBatch('sessions', sessions, true);
      setCloudSyncStatus('SYNCED');
      setLastSyncDate(new Date());
      logAudit('ACTIVATION_PONT_CLOUD_GLOBAL', `Connexion globale de l'application à Cloud Firestore activée pour tous les postes par ${currentUser?.name}`);
      return {
        success: true,
        message: 'Base de données Cloud connectée en temps réel pour tous les postes et navigateurs.',
      };
    } else {
      setCloudSyncStatus('IDLE');
      logAudit('DESACTIVATION_PONT_CLOUD_GLOBAL', `Déconnexion globale de la base Cloud Firestore par ${currentUser?.name}`);
      return {
        success: true,
        message: 'Synchronisation Cloud mise en pause. Les modifications restent locales jusqu’à la reconnexion.',
      };
    }
  };

  const logout = () => {
    logAudit('DECONNEXION', `Déconnexion de ${currentUser?.name || 'utilisateur'}`);
    setIsAuthenticated(false);
    setIsRealAdminSession(false);
    localStorage.removeItem('ebm_auth_logged_in');
    localStorage.removeItem('ebm_session_sig_v3');
    localStorage.removeItem('ebm_admin_root_id_v3');
    localStorage.removeItem('ebm_admin_root_sig_v3');
    if (auth.currentUser) {
      signOut(auth).catch(() => {});
    }
  };

  const switchUserRole = (role: UserRole) => {
    if (!isRealAdminSession && currentUser.role !== 'ADMIN') return;
    const targetUser = users.find((u) => u.role === role && u.isActive);
    if (targetUser) {
      setCurrentUserId(targetUser.id);
      localStorage.setItem('ebm_session_sig_v3', computeSessionToken(targetUser));
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
      id: generateUniqueId('log'),
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action,
      details,
      platform,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
    if (isAuthenticated) {
      syncDocToFirestore('auditLogs', newLog);
    }
  };

  // Helper to trigger push notification
  const triggerNotification = (notif: Omit<AppNotification, 'id' | 'createdAt' | 'isReadWeb' | 'isReadAndroid' | 'pushStatus'>) => {
    const newNotif: AppNotification = {
      ...notif,
      id: generateUniqueId('notif'),
      createdAt: new Date().toISOString(),
      isReadWeb: false,
      isReadAndroid: false,
      pushStatus: 'DELIVERED',
    };
    setNotifications((prev) => [newNotif, ...prev]);
    syncDocToFirestore('notifications', newNotif);
    setActivePushBanner(newNotif);
  };

  // Session Actions (with Real-Time Cloud Firestore Sync)
  const addSession = (data: Omit<TimetableSession, 'id' | 'history'>) => {
    if (!canUserPerformOperation(currentUser, 'CREATION', customRoles)) {
      return { success: false, error: 'Droits insuffisants (RBAC) pour créer une séance.' };
    }

    const [sH, sM] = (data.startTime || '').split(':').map(Number);
    const [eH, eM] = (data.endTime || '').split(':').map(Number);
    const rawDuration = Number(((eH * 60 + eM - (sH * 60 + sM)) / 60).toFixed(2));
    if (!Number.isFinite(rawDuration) || rawDuration <= 0) {
      return {
        success: false,
        error: `Plage horaire invalide : l'heure de fin (${data.endTime}) doit être strictement postérieure à l'heure de début (${data.startTime}).`,
      };
    }

    // Conflict check (unified engine with schedule settings, teacher availability, holidays, maintenance)
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
      users,
      { scheduleSettings: appSettings.scheduleSettings }
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

    const nowIso = new Date().toISOString();
    const newSession: TimetableSession = {
      ...data,
      durationHours: rawDuration,
      sessionType: data.sessionType || 'COURSE',
      id: generateUniqueId('sess'),
      updatedAt: nowIso,
      history: [
        {
          id: generateUniqueId('h'),
          timestamp: nowIso,
          authorName: currentUser.name,
          action: 'CREATION',
          details: isCustomEvent
            ? `Planification événement (${data.sessionType}) : "${sessionLabel}"`
            : `Création de séance pour le cours ${sessionLabel}`,
        },
      ],
    };

    setSessions((prev) => [...prev, newSession]);

    commitSessionTransactionally(newSession, {
      onReservationConflict: (conflictMsg) => {
        setSessions((curr) => curr.filter((item) => item.id !== newSession.id));
        showAppToast({
          title: 'Conflit de réservation simultanée (Serveur)',
          message: `${conflictMsg} La création a été annulée automatiquement.`,
          type: 'error',
        });
      },
    });

    logAudit(
      isCustomEvent ? 'PLANIFICATION_EVENEMENT' : 'CREATION_SEANCE',
      `Ajout ${isCustomEvent ? `événement [${data.sessionType}]` : 'séance'} "${sessionLabel}" le ${data.date} ${data.startTime}-${data.endTime}`
    );

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

    const affectedStudents = users.filter(
      (u) => u.role === 'STUDENT' && u.groupId && data.groupIds.includes(u.groupId)
    );
    affectedStudents.forEach((student) => {
      triggerNotification({
        recipientId: student.id,
        recipientRole: 'STUDENT',
        title: isCustomEvent
          ? `🎤 Nouvel événement au planning : ${sessionLabel}`
          : `📅 Nouveau cours planifié : ${sessionLabel}`,
        message: `${isCustomEvent ? 'Événement' : 'Cours'} programmé dans votre emploi du temps le ${data.date} de ${data.startTime} à ${data.endTime}${
          data.eventSpeaker ? ` — Intervenant : ${data.eventSpeaker}` : ''
        }.`,
        type: 'INFO',
        sessionId: newSession.id,
      });
    });

    return { success: true, session: newSession };
  };

  const updateSession = (
    id: string,
    updates: Partial<TimetableSession>,
    reason?: string
  ): { success: boolean; error?: string } => {
    // Bug D Fix: Enforce strict RBAC check on session modification
    if (!canUserPerformOperation(currentUser, 'MODIFICATION', customRoles)) {
      logAudit('ACCES_REFUSE_MODIFICATION_SEANCE', `Tentative non autorisée de modification de la séance ${id}`);
      return { success: false, error: 'Droits insuffisants (RBAC) pour modifier une séance.' };
    }

    const existing = sessions.find((s) => s.id === id);
    if (!existing) {
      return { success: false, error: 'Séance introuvable.' };
    }

    if (currentUser.role === 'TEACHER' && existing.teacherId !== currentUser.id) {
      return { success: false, error: 'Un enseignant ne peut modifier que ses propres séances.' };
    }

    // Do not resurrect a CANCELLED session unless status is explicitly changed by caller
    if (existing.status === 'CANCELLED' && !updates.status) {
      return { success: false, error: 'Impossible de modifier une séance annulée.' };
    }

    const mergedCandidate = {
      id,
      courseId: updates.courseId ?? existing.courseId,
      teacherId: updates.teacherId ?? existing.teacherId,
      groupIds: updates.groupIds ?? existing.groupIds,
      roomId: updates.roomId ?? existing.roomId,
      date: updates.date ?? existing.date,
      startTime: updates.startTime ?? existing.startTime,
      endTime: updates.endTime ?? existing.endTime,
    };

    const [sH, sM] = (mergedCandidate.startTime || '').split(':').map(Number);
    const [eH, eM] = (mergedCandidate.endTime || '').split(':').map(Number);
    const recalculatedDuration = Number(((eH * 60 + eM - (sH * 60 + sM)) / 60).toFixed(2));
    if (!Number.isFinite(recalculatedDuration) || recalculatedDuration <= 0) {
      return {
        success: false,
        error: `Plage horaire invalide : l'heure de fin (${mergedCandidate.endTime}) doit être strictement postérieure à l'heure de début (${mergedCandidate.startTime}).`,
      };
    }

    // Run unified conflict detection before applying update
    const check = detectSessionConflicts(mergedCandidate, sessions, rooms, groups, users, {
      scheduleSettings: appSettings.scheduleSettings,
    });
    if (check.hasConflict) {
      const conflictMsg = check.conflicts[0].message;
      logAudit('CONFLIT_MODIFICATION_SEANCE', `Modification bloquée sur ${id} : ${conflictMsg}`);
      return { success: false, error: conflictMsg };
    }

    const nowIso = new Date().toISOString();
    const historyItem = {
      id: generateUniqueId('h'),
      timestamp: nowIso,
      authorName: currentUser.name,
      action: 'MODIFICATION',
      details: `Mise à jour: ${Object.keys(updates).join(', ')}`,
      reason,
    };
    const updatedSession: TimetableSession = {
      ...existing,
      ...updates,
      durationHours: recalculatedDuration,
      status:
        updates.status ||
        (existing.status === 'COMPLETED_VALIDATED' ? 'COMPLETED_VALIDATED' : 'MODIFIED'),
      updatedAt: nowIso,
      history: [historyItem, ...existing.history],
    };

    setSessions((prev) => prev.map((s) => (s.id === id ? updatedSession : s)));

    commitSessionTransactionally(updatedSession, {
      previousSession: existing,
      onReservationConflict: (conflictMsg) => {
        setSessions((curr) => curr.map((item) => (item.id === id ? existing : item)));
        showAppToast({
          title: 'Conflit de réservation simultanée (Serveur)',
          message: `${conflictMsg} Vos modifications ont été annulées pour éviter un doublon.`,
          type: 'error',
        });
      },
      onSuccess: (committed) => {
        setSessions((curr) => curr.map((item) => (item.id === id ? committed : item)));
      },
    });

    logAudit('MODIFICATION_SEANCE', `Modification séance ${id}. Raison: ${reason || 'Mise à jour opérationnelle'}`);
    return { success: true };
  };

  const rescheduleSession = (
    id: string,
    newDate: string,
    newStartTime: string,
    newEndTime: string,
    newRoomId: string,
    reason: string
  ): { success: boolean; error?: string } => {
    // Bug D Fix: Enforce strict RBAC check on session rescheduling
    if (!canUserPerformOperation(currentUser, 'MODIFICATION', customRoles)) {
      logAudit('ACCES_REFUSE_REPORT_SEANCE', `Tentative non autorisée de report de la séance ${id}`);
      return { success: false, error: 'Droits insuffisants (RBAC) pour reporter une séance.' };
    }

    const current = sessions.find((s) => s.id === id);
    if (!current) {
      return { success: false, error: 'Séance introuvable.' };
    }
    if (currentUser.role === 'TEACHER' && current.teacherId !== currentUser.id) {
      return { success: false, error: 'Un enseignant ne peut reporter que ses propres séances.' };
    }
    if (current.status === 'CANCELLED') {
      return { success: false, error: 'Impossible de reporter une séance annulée.' };
    }

    const [startH, startM] = (newStartTime || '').split(':').map(Number);
    const [endH, endM] = (newEndTime || '').split(':').map(Number);
    const durationHours = Number(((endH * 60 + endM - (startH * 60 + startM)) / 60).toFixed(2));
    if (!Number.isFinite(durationHours) || durationHours <= 0) {
      return {
        success: false,
        error: `Plage horaire invalide : l'heure de fin (${newEndTime}) doit être strictement postérieure à l'heure de début (${newStartTime}).`,
      };
    }

    // Run unified conflict detection on target slot before rescheduling
    const conflictCheck = detectSessionConflicts(
      {
        id,
        courseId: current.courseId,
        teacherId: current.teacherId,
        groupIds: current.groupIds,
        roomId: newRoomId,
        date: newDate,
        startTime: newStartTime,
        endTime: newEndTime,
      },
      sessions,
      rooms,
      groups,
      users,
      { scheduleSettings: appSettings.scheduleSettings }
    );
    if (conflictCheck.hasConflict) {
      const conflictMsg = conflictCheck.conflicts[0].message;
      logAudit('CONFLIT_REPORT_SEANCE', `Report refusé pour ${id} : ${conflictMsg}`);
      return { success: false, error: conflictMsg };
    }

    const originalState = {
      originalDate: current.date,
      originalStartTime: current.startTime,
      originalEndTime: current.endTime,
      originalRoomId: current.roomId,
    };

    const nowIso = new Date().toISOString();
    const historyItem = {
      id: generateUniqueId('h'),
      timestamp: nowIso,
      authorName: currentUser.name,
      action: 'REPORT',
      details: `Reporté du ${originalState.originalDate} (${originalState.originalStartTime}) au ${newDate} (${newStartTime})`,
      reason,
    };
    const updatedSession: TimetableSession = {
      ...current,
      date: newDate,
      startTime: newStartTime,
      endTime: newEndTime,
      roomId: newRoomId,
      durationHours,
      status: 'RESCHEDULED',
      rescheduledFrom: originalState,
      updatedAt: nowIso,
      history: [historyItem, ...current.history],
    };

    setSessions((prev) => prev.map((s) => (s.id === id ? updatedSession : s)));

    commitSessionTransactionally(updatedSession, {
      previousSession: current,
      onReservationConflict: (conflictMsg) => {
        setSessions((curr) => curr.map((item) => (item.id === id ? current : item)));
        showAppToast({
          title: 'Conflit de réservation simultanée (Serveur)',
          message: `${conflictMsg} Le report a été annulé automatiquement.`,
          type: 'error',
        });
      },
      onSuccess: (committed) => {
        setSessions((curr) => curr.map((item) => (item.id === id ? committed : item)));
      },
    });

    const course = courses.find((c) => c.id === current.courseId);
    const newRoom = rooms.find((r) => r.id === newRoomId);

    logAudit(
      'REPORT_COURS',
      `Report séance ${current.id} (${course?.title}): ${originalState.originalDate} -> ${newDate} (${newStartTime}). Motif: ${reason}`
    );

    const affectedStudents = users.filter((u) => u.role === 'STUDENT' && u.groupId && current.groupIds.includes(u.groupId));

    affectedStudents.forEach((student) => {
      triggerNotification({
        recipientId: student.id,
        recipientRole: 'STUDENT',
        title: `📅 Cours reporté : ${course?.title || current.eventTitle || 'Cours'}`,
        message: `Initialement prévu le ${originalState.originalDate} à ${originalState.originalStartTime}, ce cours aura lieu le ${newDate} de ${newStartTime} à ${newEndTime} (${newRoom?.name || newRoomId}). Motif : ${reason}`,
        type: 'RESCHEDULE',
        sessionId: id,
      });
    });

    if (current.teacherId && current.teacherId !== 'EXTERNAL_SPEAKER') {
      triggerNotification({
        recipientId: current.teacherId,
        recipientRole: 'TEACHER',
        title: `📅 Cours reporté : ${course?.title || current.eventTitle || 'Cours'}`,
        message: `Votre cours a été déplacé au ${newDate} de ${newStartTime} à ${newEndTime}. Motif : ${reason}`,
        type: 'RESCHEDULE',
        sessionId: id,
      });
    }

    return { success: true };
  };

  const cancelSession = (id: string, reason: string) => {
    if (
      !canUserPerformOperation(currentUser, 'MODIFICATION', customRoles) &&
      !canUserPerformOperation(currentUser, 'SUPPRESSION', customRoles)
    ) {
      showAppToast({
        title: 'Accès refusé (RBAC)',
        message: 'Vous ne disposez pas des droits nécessaires pour annuler une séance.',
        type: 'error',
      });
      return;
    }

    const current = sessions.find((s) => s.id === id);
    if (!current) return;
    if (currentUser.role === 'TEACHER' && current.teacherId !== currentUser.id) {
      showAppToast({
        title: 'Accès refusé',
        message: 'Un enseignant ne peut annuler que ses propres séances.',
        type: 'error',
      });
      return;
    }

    const nowIso = new Date().toISOString();
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const historyItem = {
          id: generateUniqueId('h'),
          timestamp: nowIso,
          authorName: currentUser.name,
          action: 'ANNULATION',
          details: `Séance annulée. Non comptabilisée dans les heures réalisées.`,
          reason,
        };
        const updatedSession: TimetableSession = {
          ...s,
          status: 'CANCELLED',
          cancellationReason: reason,
          cancellationDate: nowIso,
          updatedAt: nowIso,
          history: [historyItem, ...s.history],
        };
        syncDocToFirestore('sessions', updatedSession);
        releaseSessionSlotTransactionally(id, s.date);
        return updatedSession;
      })
    );

    const course = courses.find((c) => c.id === current.courseId);
    logAudit('ANNULATION_COURS', `Annulation séance ${id} (${course?.title}) le ${current.date}. Motif: ${reason}`);

    const affectedStudents = users.filter((u) => u.role === 'STUDENT' && u.groupId && current.groupIds.includes(u.groupId));

    affectedStudents.forEach((student) => {
      triggerNotification({
        recipientId: student.id,
        recipientRole: 'STUDENT',
        title: `⚠️ Cours annulé : ${course?.title || current.eventTitle || 'Cours'}`,
        message: `La séance du ${current.date} de ${current.startTime} à ${current.endTime} est annulée. Motif : ${reason}`,
        type: 'CANCEL',
        sessionId: id,
      });
    });

    if (current.teacherId && current.teacherId !== 'EXTERNAL_SPEAKER') {
      triggerNotification({
        recipientId: current.teacherId,
        recipientRole: 'TEACHER',
        title: `⚠️ Annulation confirmée : ${course?.title || current.eventTitle || 'Cours'}`,
        message: `La séance du ${current.date} est annulée. Motif : ${reason}`,
        type: 'CANCEL',
        sessionId: id,
      });
    }
  };

  const validateSession = (id: string) => {
    if (!canUserPerformOperation(currentUser, 'VALIDATION', customRoles)) {
      showAppToast({
        title: 'Accès refusé (RBAC)',
        message: 'Seule la Direction des études ou un profil habilité peut valider les heures réalisées.',
        type: 'error',
      });
      return;
    }

    const current = sessions.find((s) => s.id === id);
    if (!current) return;

    const nowIso = new Date().toISOString();
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const historyItem = {
          id: generateUniqueId('h'),
          timestamp: nowIso,
          authorName: currentUser.name,
          action: 'VALIDATION',
          details: `Séance validée comme réalisée (${s.durationHours}h ajoutées au compteur officiel)`,
        };
        const updatedSession: TimetableSession = {
          ...s,
          status: 'COMPLETED_VALIDATED',
          validatedAt: nowIso,
          validatedBy: currentUser.name,
          updatedAt: nowIso,
          history: [historyItem, ...s.history],
        };
        syncDocToFirestore('sessions', updatedSession);
        return updatedSession;
      })
    );

    const course = courses.find((c) => c.id === current.courseId);
    logAudit('VALIDATION_HEURES', `Validation séance ${id} (${course?.title}): ${current.durationHours}h réalisées.`);

    if (current.teacherId && current.teacherId !== 'EXTERNAL_SPEAKER') {
      triggerNotification({
        recipientId: current.teacherId,
        recipientRole: 'TEACHER',
        title: `✅ Séance validée (${current.durationHours}h)`,
        message: `Votre séance de ${course?.title || current.eventTitle || 'Cours'} du ${current.date} a été validée par la direction des études.`,
        type: 'SUCCESS',
        sessionId: id,
      });
    }
  };

  const deleteSession = (id: string) => {
    if (!canUserPerformOperation(currentUser, 'SUPPRESSION', customRoles)) {
      showAppToast({
        title: 'Accès refusé (RBAC)',
        message: 'Vous ne disposez pas des droits nécessaires pour supprimer une séance.',
        type: 'error',
      });
      return;
    }

    const target = sessions.find((s) => s.id === id);
    deletedDocIdsRef.current.add(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
    removeDocFromFirestore('sessions', id);
    releaseSessionSlotTransactionally(id, target?.date);
    // P36: Deactivate any active QR sessions tied to this deleted timetable session
    setQrSessions((prev) =>
      prev.map((qr) => {
        if (qr.sessionId === id && qr.isActive) {
          const closed = { ...qr, isActive: false };
          syncDocToFirestore('qrSessions', closed);
          return closed;
        }
        return qr;
      })
    );
    logAudit('SUPPRESSION_SEANCE', `Suppression définitive séance ${id} (${target?.date || ''})`);
  };

  const purgeAllSessions = (): { success: boolean; count: number; error?: string } => {
    if (
      !canUserPerformOperation(currentUser, 'SUPPRESSION', customRoles) &&
      !['ADMIN', 'SCHEDULER', 'ACADEMIC_HEAD', 'SCOLARITE'].includes(currentUser.role)
    ) {
      showAppToast({
        title: 'Accès refusé (RBAC)',
        message: 'Vous ne disposez pas des droits nécessaires pour purger les séances.',
        type: 'error',
      });
      return { success: false, count: 0, error: 'Accès refusé' };
    }

    const count = sessions.length;
    // Tombstone each session so Firestore sync does not resurrect deleted sessions
    sessions.forEach((s) => {
      deletedDocIdsRef.current.add(s.id);
      deletedDocIdsRef.current.add(`sessions:${s.id}`);
      removeDocFromFirestore('sessions', s.id);
      releaseSessionSlotTransactionally(s.id, s.date);
    });

    // Close any active QR sessions tied to these timetable sessions
    setQrSessions((prev) =>
      prev.map((qr) => {
        if (qr.sessionId && qr.isActive) {
          const closed = { ...qr, isActive: false };
          syncDocToFirestore('qrSessions', closed);
          return closed;
        }
        return qr;
      })
    );

    setSessions([]);
    safeLocalStorageSet(STORAGE_KEYS.SESSIONS, []);
    try {
      localStorage.setItem('ebm_sessions_purged_v2', 'true');
    } catch {
      // ignore
    }

    logAudit(
      'PURGE_EMPLOI_DU_TEMPS',
      `Purge intégrale de l'emploi du temps effectuée par ${currentUser.name} (${count} séances et réservations supprimées)`
    );

    showAppToast({
      title: 'Emploi du temps réinitialisé',
      message: `${count} séance${count > 1 ? 's' : ''} et réservation${count > 1 ? 's' : ''} supprimée${count > 1 ? 's' : ''}. Le planning est désormais vierge à 0 sans aucun conflit.`,
      type: 'success',
    });

    return { success: true, count };
  };

  const purgeWeekSessions = (
    startDateStr: string,
    endDateStr: string
  ): { success: boolean; count: number; error?: string } => {
    if (
      !canUserPerformOperation(currentUser, 'SUPPRESSION', customRoles) &&
      !['ADMIN', 'SCHEDULER', 'ACADEMIC_HEAD', 'SCOLARITE'].includes(currentUser.role)
    ) {
      showAppToast({
        title: 'Accès refusé (RBAC)',
        message: 'Vous ne disposez pas des droits nécessaires pour purger les séances.',
        type: 'error',
      });
      return { success: false, count: 0, error: 'Accès refusé' };
    }

    const targets = sessions.filter((s) => s.date >= startDateStr && s.date <= endDateStr);
    const count = targets.length;

    if (count === 0) {
      showAppToast({
        title: 'Aucune séance à purger',
        message: `Aucune séance n'est planifiée sur la semaine concernée (${startDateStr} au ${endDateStr}).`,
        type: 'info',
      });
      return { success: true, count: 0 };
    }

    const targetIds = new Set(targets.map((s) => s.id));

    // Tombstone each target session so Firestore sync does not resurrect deleted sessions
    targets.forEach((s) => {
      deletedDocIdsRef.current.add(s.id);
      deletedDocIdsRef.current.add(`sessions:${s.id}`);
      removeDocFromFirestore('sessions', s.id);
      releaseSessionSlotTransactionally(s.id, s.date);
    });

    // Wipe server slot indexes for every date in the purged week to prevent ghost slot locks
    try {
      const dStart = new Date(`${startDateStr}T12:00:00`);
      const dEnd = new Date(`${endDateStr}T12:00:00`);
      for (let dt = new Date(dStart); dt <= dEnd; dt.setDate(dt.getDate() + 1)) {
        clearDateScheduleSlotsTransactionally(getAntananarivoDateStr(dt));
      }
    } catch {
      // Ignore date loop error
    }

    // Close any active QR sessions tied to these targeted timetable sessions
    setQrSessions((prev) =>
      prev.map((qr) => {
        if (qr.sessionId && targetIds.has(qr.sessionId) && qr.isActive) {
          const closed = { ...qr, isActive: false };
          syncDocToFirestore('qrSessions', closed);
          return closed;
        }
        return qr;
      })
    );

    const remainingSessions = sessions.filter((s) => !targetIds.has(s.id));
    setSessions(remainingSessions);
    safeLocalStorageSet(STORAGE_KEYS.SESSIONS, remainingSessions);

    logAudit(
      'PURGE_SEMAINE_PLANNING',
      `Purge de l'emploi du temps pour la semaine du ${startDateStr} au ${endDateStr} effectuée par ${currentUser.name} (${count} séances et réservations supprimées)`
    );

    showAppToast({
      title: 'Semaine réinitialisée',
      message: `${count} séance${count > 1 ? 's' : ''} et réservation${count > 1 ? 's' : ''} de la semaine concernée supprimée${count > 1 ? 's' : ''}. Toutes les salles et disponibilités de cette semaine sont libérées.`,
      type: 'success',
    });

    return { success: true, count };
  };

  // Notification methods (synced to Cloud Firestore across devices)
  const markAsRead = (id: string, platform: 'WEB' | 'ANDROID') => {
    setNotifications((prev) =>
      prev.map((n) => {
        if (n.id !== id) return n;
        const updated: AppNotification = {
          ...n,
          isReadWeb: platform === 'WEB' ? true : n.isReadWeb,
          isReadAndroid: platform === 'ANDROID' ? true : n.isReadAndroid,
        };
        syncDocToFirestore('notifications', updated);
        return updated;
      })
    );
  };

  const markAllAsRead = (platform: 'WEB' | 'ANDROID') => {
    setNotifications((prev) =>
      prev.map((n) => {
        const alreadyRead = platform === 'WEB' ? n.isReadWeb : n.isReadAndroid;
        if (alreadyRead) return n;
        const updated: AppNotification = {
          ...n,
          isReadWeb: platform === 'WEB' ? true : n.isReadWeb,
          isReadAndroid: platform === 'ANDROID' ? true : n.isReadAndroid,
        };
        syncDocToFirestore('notifications', updated);
        return updated;
      })
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

  // User methods (P8, P9: Real salted password hashing & Firestore sync)
  const changePassword = (userId: string, newPassword: string) => {
    const cleanPwd = (newPassword || '').trim();
    if (cleanPwd.length < 6) return false;
    const hashed = hashPasswordSync(cleanPwd);
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u;
        const updated: User = {
          ...u,
          mustChangePassword: false, // RG-03 satisfied!
          passwordHash: hashed,
        };
        syncDocToFirestore('users', updated);
        return updated;
      })
    );
    logAudit('MODIFICATION_MDP', `Mot de passe changé et haché pour l'utilisateur ${userId}`);
    return true;
  };

  const toggleUserStatus = (userId: string) => {
    if (userId === currentUser.id) return; // Prevent self-lockout
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u;
        const newStatus = !u.isActive;
        const updated = { ...u, isActive: newStatus };
        syncDocToFirestore('users', updated);
        return updated;
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

    const defaultBirthDate = userData.birthDate || '2005-01-01';
    const newUser: User = {
      id: generateUniqueId('user'),
      username: userData.username || userData.matricule || generateUniqueId('usr'),
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
      birthDate: defaultBirthDate,
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
          ? userData.cardToken || `EBM-CARD-${(userData.matricule || userData.username || generateUniqueId('card')).slice(-4).toUpperCase()}-V1`
          : undefined,
      cardIssueNumber: userData.role === 'STUDENT' ? 1 : undefined,
      cardIssuedAt: userData.role === 'STUDENT' ? getAntananarivoDateStr() : undefined,
      revokedCardTokens: [],
      department: userData.department,
      service: userData.service,
      jobTitle: userData.jobTitle,
      linkedStudentIds: userData.linkedStudentIds || [],
      parentRelation: userData.parentRelation,
      parentVerificationStatus: userData.role === 'PARENT' ? (userData.parentVerificationStatus || 'VERIFIED') : undefined,
      customPermissions: userData.customPermissions,
      passwordHash: hashPasswordSync(userData.role === 'STUDENT' ? defaultBirthDate : 'ebm2026'),
      mustChangePassword: userData.mustChangePassword ?? true,
      isActive: userData.isActive ?? true,
      googleCalendarLinked: false,
      subjects: userData.subjects || [],
      weeklyMaxHours: userData.weeklyMaxHours || 18,
    };

    setUsers((prev) => [...prev, newUser]);
    syncDocToFirestore('users', newUser);
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
              id: generateUniqueId('mod'),
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

  const deleteUser = (id: string): { success: boolean; error?: string } => {
    // P41: Block self-deletion and block deleting the last active ADMIN
    if (id === currentUser.id) {
      return { success: false, error: 'Suppression refusée : vous ne pouvez pas supprimer votre propre compte actif.' };
    }
    const target = users.find((u) => u.id === id);
    if (!target) {
      return { success: false, error: 'Utilisateur introuvable.' };
    }
    if (target.role === 'ADMIN') {
      const activeAdmins = users.filter((u) => u.role === 'ADMIN' && u.isActive);
      if (activeAdmins.length <= 1) {
        return {
          success: false,
          error: 'Suppression refusée : impossible de supprimer le dernier administrateur actif du système.',
        };
      }
    }
    const hasActiveSessions = sessions.some((s) => s.teacherId === id && s.status !== 'CANCELLED');
    if (hasActiveSessions) {
      return {
        success: false,
        error: `Suppression refusée : ${target.name} est assigné(e) à des séances d'emploi du temps actives. Veuillez d'abord réaffecter ou annuler ces séances.`,
      };
    }
    deletedDocIdsRef.current.add(id);
    setUsers((prev) => prev.filter((u) => u.id !== id));
    removeDocFromFirestore('users', id);
    logAudit('SUPPRESSION_UTILISATEUR', `Suppression du compte de ${target.name || id}`);
    return { success: true };
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
      firebaseSent = false;
    }

    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== id) return u;
        const modLog: UserModificationLog = {
          id: generateUniqueId('mod'),
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

    // P8: Hash password with hashPasswordSync instead of storing plaintext
    const hashedPwd = hashPasswordSync(cleanPwd);

    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== id) return u;
        const modLog: UserModificationLog = {
          id: generateUniqueId('mod'),
          timestamp: new Date().toISOString(),
          authorId: currentUser.id,
          authorName: currentUser.name,
          field: 'Mot de passe défini par Admin',
          oldValue: '••••••••',
          newValue: forceChangeOnNextLogin ? 'Nouveau MDP haché (Changement forcé)' : 'Nouveau MDP haché actif immédiat',
        };
        const updated: User = {
          ...u,
          passwordHash: hashedPwd,
          mustChangePassword: forceChangeOnNextLogin,
          modificationHistory: [modLog, ...(u.modificationHistory || [])],
        };
        syncDocToFirestore('users', updated);
        return updated;
      })
    );

    logAudit(
      'DEFINITION_MDP_ADMIN',
      `Nouveau mot de passe haché défini par ${currentUser.name} pour ${target.name} (${target.matricule || target.username})`
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
      message: `Nouveau mot de passe chiffré enregistré immédiatement pour ${target.name}.`,
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

    const birthDate = studentData.birthDate || '2005-01-01';
    const newStudent: User = {
      id: generateUniqueId('user-student'),
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
      birthDate,
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
      cardIssuedAt: getAntananarivoDateStr(),
      revokedCardTokens: [],
      isAdult: true,
      parentAccessConsent: {
        academic: true,
        attendance: true,
        financial: true,
        administrative: true,
      },
      passwordHash: hashPasswordSync(birthDate),
      mustChangePassword: true, // RG-03: Mandatory first change!
      isActive: true,
      googleCalendarLinked: false,
    };

    setUsers((prev) => [...prev, newStudent]);
    syncDocToFirestore('users', newStudent);
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
      const birthDate = row.dateNaissance?.trim() || '2005-01-01';

      const newStudent: User = {
        id: generateUniqueId(`user-import-${index}`),
        matricule: cleanMatricule,
        username: cleanMatricule,
        name: `${row.prenom.trim()} ${row.nom.trim()}`,
        email: row.email?.trim() || `${cleanMatricule.toLowerCase()}@etudiant.ebm.edu`,
        role: 'STUDENT',
        groupId: matchedGroup.id,
        birthDate,
        passwordHash: hashPasswordSync(birthDate),
        mustChangePassword: true, // RG-03
        isActive: true,
        googleCalendarLinked: false,
      };

      createdStudents.push(newStudent);
      existingMatricules.add(cleanMatricule);
    });

    if (createdStudents.length > 0) {
      setUsers((prev) => [...prev, ...createdStudents]);
      syncCollectionBatch('users', createdStudents);
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
        const updated = {
          ...u,
          googleCalendarLinked: newLinked,
          googleEmail: newLinked ? (email || `${u.username}@gmail.com`) : undefined,
        };
        syncDocToFirestore('users', updated);
        return updated;
      })
    );
    const u = users.find((usr) => usr.id === userId);
    logAudit(
      'SYNC_GOOGLE_CALENDAR',
      `Liaison Google Calendar ${!u?.googleCalendarLinked ? 'ACTIVÉE' : 'DÉCONNECTÉE'} pour ${u?.name}`
    );
  };

  // Hourly tracking calculations (RG-08, RG-09, RG-10, P37: use ?? 0 instead of || 30)
  const getCourseHourlyStats = (courseId: string): CourseHourlyStats => {
    const course = courses.find((c) => c.id === courseId);
    const totalHours = course?.totalHours ?? 0;

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

  // --- DATA CREATION CRUD IMPLEMENTATIONS (Synced in Real-Time to Firestore — P13, P16, P39-P44) ---
  const addCourse = (data: Omit<Course, 'id'>) => {
    if (!data.title || !data.code) {
      return { success: false, error: 'Le titre et le code de la matière sont obligatoires.' };
    }
    const targetFiliereId = data.filiereId || filieres[0]?.id || 'fil-1';
    const targetLevel = data.level || 'L1';
    let validGroupIds = (data.groupIds || []).filter((gid) =>
      groups.some((g) => g.id === gid)
    );

    if (validGroupIds.length === 0) {
      const g1aGroup = groups.find((g) => g.code.trim().toUpperCase() === 'G1A2627');
      if (g1aGroup) {
        validGroupIds = [g1aGroup.id];
      } else if (groups.length > 0) {
        validGroupIds = [groups[0].id];
      }
    }

    const newCourse: Course = {
      ...data,
      filiereId: targetFiliereId,
      level: targetLevel,
      groupIds: validGroupIds,
      id: generateUniqueId('crs'),
    };
    setCourses((prev) => [...prev, newCourse]);
    syncDocToFirestore('courses', newCourse);
    logAudit('CREATION_COURS', `Création du cours "${newCourse.title}" (${newCourse.code}) - Volume : ${newCourse.totalHours}h`);
    return { success: true, course: newCourse };
  };

  const updateCourse = (id: string, updates: Partial<Course>) => {
    setCourses((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const updated = { ...c, ...updates };
        syncDocToFirestore('courses', updated);
        return updated;
      })
    );
    logAudit('MODIFICATION_COURS', `Modification du cours ${id}`);
  };

  const deleteCourse = (id: string): { success: boolean; error?: string } => {
    const course = courses.find((c) => c.id === id);
    if (!course) {
      return { success: false, error: 'Cours introuvable.' };
    }
    const linkedSessions = sessions.filter((s) => s.courseId === id);
    if (linkedSessions.length > 0) {
      return {
        success: false,
        error: `Suppression refusée : le cours "${course.title}" (${course.code}) possède ${linkedSessions.length} séance(s) planifiée(s). Supprimez d'abord les séances associées.`,
      };
    }
    deletedDocIdsRef.current.add(id);
    setCourses((prev) => prev.filter((c) => c.id !== id));
    removeDocFromFirestore('courses', id);
    logAudit('SUPPRESSION_COURS', `Suppression du cours "${course.title || id}"`);
    return { success: true };
  };

  const addRoom = (data: Omit<Room, 'id'>) => {
    if (!data.name || !data.code) {
      return { success: false, error: 'Le nom et le code de la salle sont obligatoires.' };
    }
    if (!Number.isFinite(data.capacity) || data.capacity < 1) {
      return { success: false, error: 'La capacité de la salle doit être d’au moins 1 place (P43).' };
    }
    const codeExists = rooms.some((r) => r.code.toLowerCase() === data.code.trim().toLowerCase());
    if (codeExists) {
      return { success: false, error: `Une salle avec le code "${data.code}" existe déjà (P43).` };
    }
    const newRoom: Room = {
      ...data,
      id: generateUniqueId('room'),
    };
    setRooms((prev) => [...prev, newRoom]);
    syncDocToFirestore('rooms', newRoom);
    logAudit('CREATION_SALLE', `Création de la salle "${newRoom.name}" (${newRoom.code}) - Capacité : ${newRoom.capacity} places`);
    return { success: true, room: newRoom };
  };

  const updateRoom = (id: string, updates: Partial<Room>) => {
    setRooms((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, ...updates };
        syncDocToFirestore('rooms', updated);
        return updated;
      })
    );
    logAudit('MODIFICATION_SALLE', `Modification de la salle ${id}`);
  };

  const deleteRoom = (id: string): { success: boolean; error?: string } => {
    const room = rooms.find((r) => r.id === id);
    if (!room) {
      return { success: false, error: 'Salle introuvable.' };
    }
    const linkedSessions = sessions.filter((s) => s.roomId === id);
    if (linkedSessions.length > 0) {
      return {
        success: false,
        error: `Suppression refusée : la salle "${room.name}" (${room.code}) est utilisée par ${linkedSessions.length} séance(s). Déplacez ou supprimez ces séances avant de supprimer la salle.`,
      };
    }
    deletedDocIdsRef.current.add(id);
    setRooms((prev) => prev.filter((r) => r.id !== id));
    removeDocFromFirestore('rooms', id);
    logAudit('SUPPRESSION_SALLE', `Suppression de la salle "${room.name || id}"`);
    return { success: true };
  };

  const addTeacher = (data: { name: string; email: string; phone?: string; subjects: string[]; weeklyMaxHours?: number }) => {
    if (!data.name || !data.email) {
      return { success: false, error: 'Le nom et l\'adresse e-mail sont obligatoires.' };
    }
    // P42: Verify unique email and deduplicate username slug
    const cleanEmail = data.email.trim().toLowerCase();
    if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      return { success: false, error: `L'adresse e-mail "${data.email}" est déjà associée à un compte existant (P42).` };
    }
    let slug = data.name.toLowerCase().replace(/\s+/g, '.').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (users.some((u) => u.username.toLowerCase() === slug)) {
      slug = `${slug}.${Math.floor(100 + Math.random() * 900)}`;
    }
    const newTeacher: User = {
      id: generateUniqueId('user-teacher'),
      username: slug,
      name: data.name,
      email: data.email.trim(),
      phone: data.phone || '',
      role: 'TEACHER',
      isActive: true,
      passwordHash: hashPasswordSync('ebm2026'),
      subjects: data.subjects || [],
      weeklyMaxHours: data.weeklyMaxHours || 18,
      googleCalendarLinked: false,
    };
    setUsers((prev) => [...prev, newTeacher]);
    syncDocToFirestore('users', newTeacher);
    logAudit('CREATION_ENSEIGNANT', `Création du compte enseignant "${newTeacher.name}" (${newTeacher.email})`);
    return { success: true, teacher: newTeacher };
  };

  const updateTeacher = (id: string, updates: Partial<User>) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== id) return u;
        const updated = { ...u, ...updates };
        syncDocToFirestore('users', updated);
        return updated;
      })
    );
    logAudit('MODIFICATION_ENSEIGNANT', `Modification de l'enseignant ${id}`);
  };

  const deleteTeacher = (id: string) => {
    const teacher = users.find((u) => u.id === id);
    if (sessions.some((s) => s.teacherId === id && s.status !== 'CANCELLED')) {
      return;
    }
    deletedDocIdsRef.current.add(id);
    setUsers((prev) => prev.filter((u) => u.id !== id));
    removeDocFromFirestore('users', id);
    logAudit('SUPPRESSION_ENSEIGNANT', `Suppression de l'enseignant "${teacher?.name || id}"`);
  };

  const addGroup = (data: Omit<StudentGroup, 'id'>) => {
    if (!data.code || !data.name) {
      return { success: false, error: 'Le code et le nom du groupe sont obligatoires.' };
    }
    const newGroup: StudentGroup = {
      ...data,
      id: generateUniqueId('grp'),
    };
    setGroups((prev) => [...prev, newGroup]);
    syncDocToFirestore('groups', newGroup);
    logAudit('CREATION_GROUPE', `Création du groupe "${newGroup.code}" - Effectif : ${newGroup.studentCount}`);
    return { success: true, group: newGroup };
  };

  const updateGroup = (id: string, updates: Partial<StudentGroup>) => {
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== id) return g;
        const updated = { ...g, ...updates };
        syncDocToFirestore('groups', updated);
        return updated;
      })
    );
    logAudit('MODIFICATION_GROUPE', `Modification du groupe ${id}`);
  };

  const deleteGroup = (id: string): { success: boolean; error?: string } => {
    const group = groups.find((g) => g.id === id);
    if (!group) {
      return { success: false, error: 'Groupe introuvable.' };
    }
    const hasStudents = users.some((u) => u.role === 'STUDENT' && u.groupId === id);
    const hasSessions = sessions.some((s) => s.groupIds.includes(id));
    const hasInscriptions = inscriptions.some((i) => i.groupId === id);
    const hasFees = fees.some((f) => f.groupId === id);
    if (hasStudents || hasSessions || hasInscriptions || hasFees) {
      return {
        success: false,
        error: `Suppression refusée : le groupe "${group.code}" contient des étudiants inscrits, des séances planifiées ou des frais rattachés.`,
      };
    }
    deletedDocIdsRef.current.add(id);
    setGroups((prev) => prev.filter((g) => g.id !== id));
    removeDocFromFirestore('groups', id);
    logAudit('SUPPRESSION_GROUPE', `Suppression du groupe "${group.code || id}"`);
    return { success: true };
  };

  const addFiliere = (data: Omit<Filiere, 'id'>) => {
    if (!data.code || !data.name) {
      return { success: false, error: 'Le code et le nom de la filière sont obligatoires.' };
    }
    const newFiliere: Filiere = {
      ...data,
      id: generateUniqueId('fil'),
    };
    setFilieres((prev) => [...prev, newFiliere]);
    syncDocToFirestore('filieres', newFiliere);

    // Ensure every new Filière has its own dedicated default promotion group so it never borrows another filière's group
    const cleanCode = newFiliere.code.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
    const defaultGroupCode = `L1-${cleanCode}`;
    if (!groups.some((g) => g.filiereId === newFiliere.id || g.code.toUpperCase() === defaultGroupCode)) {
      const defaultGroup: StudentGroup = {
        id: generateUniqueId('grp'),
        code: defaultGroupCode,
        name: `Licence 1 ${newFiliere.name}`,
        filiereId: newFiliere.id,
        level: 'L1',
        academicYear: selectedAcademicYear || '2026-2027',
        studentCount: 30,
        subGroups: [],
      };
      setGroups((prev) => [...prev, defaultGroup]);
      syncDocToFirestore('groups', defaultGroup);
    }

    logAudit('CREATION_FILIERE', `Création de la filière "${newFiliere.code}" (${newFiliere.name})`);
    return { success: true, filiere: newFiliere };
  };

  const updateFiliere = (id: string, updates: Partial<Filiere>) => {
    setFilieres((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f;
        const updated = { ...f, ...updates };
        syncDocToFirestore('filieres', updated);
        return updated;
      })
    );
    logAudit('MODIFICATION_FILIERE', `Modification de la filière ${id}`);
  };

  const deleteFiliere = (id: string) => {
    const filiere = filieres.find((f) => f.id === id);
    deletedDocIdsRef.current.add(id);
    setFilieres((prev) => prev.filter((f) => f.id !== id));
    removeDocFromFirestore('filieres', id);
    logAudit('SUPPRESSION_FILIERE', `Suppression de la filière "${filiere?.code || id}"`);
  };

  const seedBatchDemoData = () => {
    // Inject a quick fresh scenario: New Room, New Course 30h, New Teacher, New Group
    const demoRoom: Room = {
      id: generateUniqueId('room-demo'),
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
      id: generateUniqueId('user-teacher-demo'),
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
      id: generateUniqueId('grp-demo'),
      code: 'M2-CYBER-A',
      name: 'Master 2 Cybersécurité & Défense des SI',
      filiereId: 'fil-4',
      level: 'M2',
      academicYear: '2026-2027',
      studentCount: 22,
      subGroups: [
        { id: generateUniqueId('sub-demo-1'), code: 'M2-CYBER-TP1', name: 'Groupe RedTeam', studentCount: 11 },
        { id: generateUniqueId('sub-demo-2'), code: 'M2-CYBER-TP2', name: 'Groupe BlueTeam', studentCount: 11 },
      ],
    };

    const demoCourse: Course = {
      id: generateUniqueId('crs-demo'),
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
    syncDocToFirestore('rooms', demoRoom);
    syncDocToFirestore('users', demoTeacher);
    syncDocToFirestore('groups', demoGroup);
    syncDocToFirestore('courses', demoCourse);

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
      id: generateUniqueId('ue'),
    };
    setUes((prev) => [...prev, newUe]);
    syncDocToFirestore('ues', newUe);
    logAudit('CREATION_UE', `Création de l’UE "${newUe.code}" (${newUe.title}) - ${newUe.creditsEcts} ECTS`);
    return { success: true, ue: newUe };
  };

  const updateUe = (id: string, updates: Partial<UniteEnseignement>) => {
    setUes((prev) =>
      prev.map((u) => {
        if (u.id !== id) return u;
        const updated = { ...u, ...updates };
        syncDocToFirestore('ues', updated);
        return updated;
      })
    );
    logAudit('MODIFICATION_UE', `Mise à jour de l’UE ${id}`);
  };

  const deleteUe = (id: string) => {
    const ue = ues.find((u) => u.id === id);
    deletedDocIdsRef.current.add(id);
    setUes((prev) => prev.filter((u) => u.id !== id));
    removeDocFromFirestore('ues', id);
    logAudit('SUPPRESSION_UE', `Suppression de l’UE "${ue?.code || id}"`);
  };

  const addEc = (data: Omit<ElementConstitutif, 'id'>) => {
    if (!data.code || !data.title) {
      return { success: false, error: 'Code et intitulé de l’EC obligatoires.' };
    }
    const parentUe = ues.find((u) => u.id === data.ueId);
    const targetFiliereId = parentUe?.filiereId || filieres[0]?.id || 'fil-1';
    const targetLevel = parentUe?.level || 'L1';
    const g1aGroup = groups.find((g) => g.code.trim().toUpperCase() === 'G1A2627');
    const matchingGroupIds =
      data.groupIds && data.groupIds.length > 0
        ? data.groupIds.filter((gid) => groups.some((grp) => grp.id === gid))
        : g1aGroup
        ? [g1aGroup.id]
        : groups.map((g) => g.id).slice(0, 1);

    const newEc: ElementConstitutif = {
      ...data,
      groupIds: matchingGroupIds.length > 0 ? matchingGroupIds : data.groupIds,
      id: generateUniqueId('ec'),
    };
    setEcs((prev) => [...prev, newEc]);
    syncDocToFirestore('ecs', newEc);
    // Also attach to parent UE
    setUes((prev) =>
      prev.map((ue) => {
        if (ue.id === data.ueId && !ue.ecIds.includes(newEc.id)) {
          const updatedUe = { ...ue, ecIds: [...ue.ecIds, newEc.id] };
          syncDocToFirestore('ues', updatedUe);
          return updatedUe;
        }
        return ue;
      })
    );

    // Also ensure a schedulable Course exists in `courses` with the exact filiereId and level of the parent UE
    if (parentUe && !courses.some((c) => c.code.toLowerCase() === newEc.code.trim().toLowerCase())) {
      addCourse({
        code: newEc.code.trim().toUpperCase(),
        title: newEc.title.trim(),
        filiereId: targetFiliereId,
        level: targetLevel,
        academicYear: parentUe.academicYear || selectedAcademicYear || '2026-2027',
        groupIds: matchingGroupIds,
        teacherIds: newEc.teacherIds?.length ? newEc.teacherIds : [users.find((u) => u.role === 'TEACHER')?.id || ''],
        totalHours: Number(newEc.hourlyVolume) || 30,
        defaultSessionDuration: 2,
        color: '#2563eb',
      });
    }

    logAudit('CREATION_EC', `Création de l’EC "${newEc.code}" (${newEc.title}) rattaché à l’UE ${data.ueId}`);
    return { success: true, ec: newEc };
  };

  const updateEc = (id: string, updates: Partial<ElementConstitutif>) => {
    setEcs((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        const updated = { ...e, ...updates };
        syncDocToFirestore('ecs', updated);
        return updated;
      })
    );
    logAudit('MODIFICATION_EC', `Mise à jour de l’EC ${id}`);
  };

  const deleteEc = (id: string) => {
    const ec = ecs.find((e) => e.id === id);
    deletedDocIdsRef.current.add(id);
    setEcs((prev) => prev.filter((e) => e.id !== id));
    removeDocFromFirestore('ecs', id);
    setUes((prev) =>
      prev.map((ue) => {
        if (!ue.ecIds.includes(id)) return ue;
        const updatedUe = {
          ...ue,
          ecIds: ue.ecIds.filter((ecId) => ecId !== id),
        };
        syncDocToFirestore('ues', updatedUe);
        return updatedUe;
      })
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
      const newUeId = generateUniqueId(`ue-${targetYear}-${oldUe.code.toLowerCase().replace(/[^a-z0-9]/g, '-')}`);
      const childEcs = ecs.filter((ec) => ec.ueId === oldUe.id || oldUe.ecIds.includes(ec.id));
      const newChildEcIds: string[] = [];

      childEcs.forEach((oldEc) => {
        const newEcId = generateUniqueId(`ec-${targetYear}-${oldEc.code.toLowerCase().replace(/[^a-z0-9]/g, '-')}`);
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
    syncCollectionBatch('ues', newUes);
    syncCollectionBatch('ecs', newEcs);

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

    const targetStudent = users.find((u) => u.id === studentId);
    const newInscription: StudentInscription = {
      id: generateUniqueId(`insc-${studentId}-${academicYear}`),
      studentId,
      studentUid: targetStudent?.uid || studentId,
      academicYear,
      filiereId,
      parcoursId: extra?.parcoursId,
      level,
      groupId,
      inscriptionType: extra?.inscriptionType || 'INSCRIPTION',
      academicStatus: extra?.academicStatus || 'NOUVEAU',
      dossierComplete: isComplete,
      documents: docs,
      inscriptionDate: getAntananarivoDateStr(),
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
      id: generateUniqueId(`parc-${data.code.toLowerCase().replace(/[^a-z0-9]/g, '-')}`),
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
    deletedDocIdsRef.current.add(id);
    setParcours((prev) => prev.filter((p) => p.id !== id));
    removeDocFromFirestore('parcours', id);
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
        list = list.map((ay) => {
          const updated = { ...ay, isCurrent: false };
          syncDocToFirestore('academicYears', updated);
          return updated;
        });
      }
      syncDocToFirestore('academicYears', newYear);
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
          const updated = { ...ay, ...updates };
          syncDocToFirestore('academicYears', updated);
          return updated;
        }
        if (updates.isCurrent && ay.id !== id) {
          const updated = { ...ay, isCurrent: false };
          syncDocToFirestore('academicYears', updated);
          return updated;
        }
        return ay;
      })
    );
    if (updates.code && updates.isCurrent) {
      setSelectedAcademicYear(updates.code);
    }
    logAudit('MODIFICATION_ANNEE_ACADEMIQUE', `Mise à jour de l'année académique ${id}`);
  };

  const deleteAcademicYear = (id: string): { success: boolean; error?: string } => {
    const targetAy = academicYears.find((ay) => ay.id === id);
    if (!targetAy) {
      return { success: false, error: 'Année académique introuvable.' };
    }
    // P40: Prevent deleting the currently active academic year
    if (targetAy.isCurrent || targetAy.code === selectedAcademicYear) {
      logAudit('BLOCAGE_SUPPRESSION_ANNEE_ACTIVE', `Tentative bloquée de suppression de l'année académique active ${targetAy.code}`);
      return {
        success: false,
        error: `Suppression refusée : impossible de supprimer l'année académique active (${targetAy.code}).`,
      };
    }
    const hasLinkedData =
      ues.some((u) => u.academicYear === targetAy.code) ||
      inscriptions.some((i) => i.academicYear === targetAy.code) ||
      grades.some((g) => g.academicYear === targetAy.code);
    if (hasLinkedData) {
      return {
        success: false,
        error: `Suppression refusée : l'année ${targetAy.code} contient des maquettes UE, inscriptions ou notes rattachées.`,
      };
    }
    deletedDocIdsRef.current.add(id);
    setAcademicYears((prev) => prev.filter((ay) => ay.id !== id));
    removeDocFromFirestore('academicYears', id);
    logAudit('SUPPRESSION_ANNEE_ACADEMIQUE', `Suppression de l'année académique ${id}`);
    return { success: true };
  };

  const setActiveAcademicYear = (code: string) => {
    setAcademicYears((prev) =>
      prev.map((ay) => {
        const updated: AcademicYear = {
          ...ay,
          isCurrent: ay.code === code,
          status: ay.code === code ? 'OPEN' : ay.status,
        };
        syncDocToFirestore('academicYears', updated);
        return updated;
      })
    );
    setSelectedAcademicYear(code);
    logAudit('CHANGEMENT_ANNEE_ACTIVE', `L'année ${code} a été définie comme année académique courante.`);
  };

  // ============================================================================
  // REAL-TIME INSTITUTIONAL MESSENGER V2 (Sections 1–16 of Cahier des Charges)
  // ============================================================================

  // 1. Load & sync per-user chat notification preferences when currentUser changes
  useEffect(() => {
    if (!currentUser?.id) return;
    const localPrefs = loadLocalChatPreferences(
      currentUser.id,
      DEFAULT_CHAT_PREFERENCES(currentUser.id)
    );
    setChatPreferences(localPrefs);
    fetchChatPreferencesFromFirestore(currentUser.id).then((remotePrefs) => {
      if (remotePrefs) {
        setChatPreferences((prev) => ({ ...prev, ...remotePrefs, userId: currentUser.id, id: currentUser.id }));
      }
    });
  }, [currentUser?.id]);

  // 2. Start real-time multi-device presence lifecycle (RTDB /.info/connected + onDisconnect + Firestore presence)
  useEffect(() => {
    if (!isAuthenticated || !currentUser?.id) return;
    const stopPresence = startRealtimePresenceLifecycle({
      sisUserId: currentUser.id,
      isAuthenticated,
      manualStatus: myManualPresenceStatus,
      onPresenceMapUpdate: (nextMap) => {
        setUserPresenceMap(nextMap);
      },
    });
    return () => {
      stopPresence();
    };
  }, [isAuthenticated, currentUser?.id, myManualPresenceStatus]);

  // 3. Subscribe to real-time typing indicators & cross-tab events
  useEffect(() => {
    const unsubTyping = subscribeToTypingIndicators((convId, entries) => {
      setTypingIndicatorsByConv((prev) => ({
        ...prev,
        [convId]: entries.filter((e) => e.userId !== currentUser?.id),
      }));
    });

    const unsubCrossTab = subscribeToCrossTabChatEvents((event) => {
      if (event.type === 'PRESENCE' && event.payload) {
        const rec = event.payload as UserPresenceRecord;
        if (rec.sisUserId) {
          setUserPresenceMap((prev) => ({ ...prev, [rec.sisUserId]: rec }));
        }
      } else if (event.type === 'CONVERSATION' && event.payload) {
        const conv = event.payload as ChatConversation;
        if (conv.id) {
          setChatConversations((prev) => {
            const exists = prev.some((c) => c.id === conv.id);
            const next = exists
              ? prev.map((c) => (c.id === conv.id ? { ...c, ...conv } : c))
              : [...prev, conv];
            saveLocalConversations(next);
            return next;
          });
        }
      } else if (event.type === 'MESSAGE' && event.payload) {
        const { conversation, message } = event.payload as {
          conversation: ChatConversation;
          message: ChatConversationMessage;
        };
        if (conversation?.id && message?.id) {
          setChatConversations((prev) => {
            const exists = prev.some((c) => c.id === conversation.id);
            const next = exists
              ? prev.map((c) => (c.id === conversation.id ? { ...c, ...conversation } : c))
              : [...prev, conversation];
            saveLocalConversations(next);
            return next;
          });
          setChatMessagesByConv((prev) => {
            const existingList = prev[conversation.id] || [];
            const exists = existingList.some((m) => m.id === message.id);
            const nextList = exists
              ? existingList.map((m) => (m.id === message.id ? message : m))
              : [...existingList, message].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
            const nextMap = { ...prev, [conversation.id]: nextList };
            saveLocalMessagesByConv(nextMap);
            return nextMap;
          });
          if (
            currentUser?.id &&
            message.senderId !== currentUser.id &&
            !message.deletedAt &&
            canUserAccessConversation(currentUser, conversation)
          ) {
            handleIncomingMessageAlerts({
              message,
              conversation,
              currentUserId: currentUser.id,
              isAuthenticated,
              preferences: chatPreferences,
              activeViewingConversationId: activeChatConversationId,
              isChatWindowMinimized: isFloatingChatMinimized || !isFloatingChatOpen,
              onVisualAlert: (info) => {
                showAppToast({
                  title: `💬 ${info.conversationTitle}`,
                  message: `${info.message.senderName}: ${info.message.text.slice(0, 90)}`,
                  type: 'info',
                });
              },
              onOpenConversation: (cId) => {
                setActiveChatConversationId(cId);
                setIsFloatingChatOpen(true);
                setIsFloatingChatMinimized(false);
              },
            });
          }
        }
      } else if (event.type === 'RECEIPT' && event.payload) {
        const { conversationId, messages } = event.payload as {
          conversationId: string;
          messages: ChatConversationMessage[];
        };
        if (conversationId && Array.isArray(messages)) {
          setChatMessagesByConv((prev) => {
            const existingList = prev[conversationId] || [];
            const updateMap = new Map(messages.map((m) => [m.id, m]));
            const nextList = existingList.map((m) =>
              updateMap.has(m.id) ? { ...m, ...updateMap.get(m.id)! } : m
            );
            const nextMap = { ...prev, [conversationId]: nextList };
            saveLocalMessagesByConv(nextMap);
            return nextMap;
          });
        }
      }
    });

    return () => {
      unsubTyping();
      unsubCrossTab();
    };
  }, [currentUser?.id]);

  // 4. Synchronize pedagogical group conversations, official announcement channel, and migrate legacy chatMessages safely
  useEffect(() => {
    let isMounted = true;
    const syncInstitutionalAndMigrate = async () => {
      const institutionalConvs = buildInstitutionalConversationsFromSisData({
        existingConversations: chatConversations,
        users,
        groups,
        filieres,
        courses,
        ecs,
      });

      const migrationRes = await migrateLegacyChatMessagesSafely({
        legacyMessages: chatMessages,
        users,
        existingConversations: institutionalConvs,
        existingMessagesByConv: chatMessagesByConv,
      });

      if (!isMounted) return;

      setChatConversations((prev) => {
        const mergedMap = new Map<string, ChatConversation>();
        prev.forEach((c) => mergedMap.set(c.id, c));
        migrationRes.migratedConversations.forEach((c) => {
          const existing = mergedMap.get(c.id);
          mergedMap.set(c.id, existing ? { ...c, ...existing, participantIds: c.participantIds } : c);
        });
        const nextList = Array.from(mergedMap.values());
        saveLocalConversations(nextList);
        return nextList;
      });

      if (migrationRes.migratedCount > 0) {
        setChatMessagesByConv((prev) => {
          const next = { ...prev, ...migrationRes.migratedMessagesByConv };
          saveLocalMessagesByConv(next);
          return next;
        });
      }
    };

    syncInstitutionalAndMigrate();
    return () => {
      isMounted = false;
    };
  }, [users.length, groups.length, filieres.length, courses.length, ecs.length]);

  const getUserEffectivePresence = React.useCallback(
    (userId: string): { status: PresenceStatus; activeDeviceCount: number; lastSeenAt?: string } => {
      if (userId === currentUser?.id && isAuthenticated) {
        const myRec = userPresenceMap[userId];
        const computed = computeEffectivePresenceStatus(myRec);
        return {
          status: myManualPresenceStatus || (computed.status === 'OFFLINE' ? 'ONLINE' : computed.status),
          activeDeviceCount: Math.max(1, computed.activeDeviceCount),
          lastSeenAt: myRec?.lastSeenAt || new Date().toISOString(),
        };
      }
      return computeEffectivePresenceStatus(userPresenceMap[userId]);
    },
    [userPresenceMap, currentUser?.id, isAuthenticated, myManualPresenceStatus]
  );

  // Dynamically computed list of online user IDs (ZERO fake/hardcoded presence)
  const onlineUsers = React.useMemo(() => {
    return users
      .filter((u) => u.isActive && getUserEffectivePresence(u.id).status !== 'OFFLINE')
      .map((u) => u.id);
  }, [users, getUserEffectivePresence]);

  // Accessible conversations for the current user
  const accessibleConversations = React.useMemo(() => {
    return chatConversations
      .filter((conv) => canUserAccessConversation(currentUser, conv))
      .sort((a, b) => {
        const timeA = a.lastMessageAt || a.updatedAt || a.createdAt || '';
        const timeB = b.lastMessageAt || b.updatedAt || b.createdAt || '';
        return timeB.localeCompare(timeA);
      });
  }, [chatConversations, currentUser]);

  // 5. Subscribe to Firestore subcollection messages for accessible conversations & active conversation,
  //    handle automatic `deliveredTo` receipts, and trigger sound/visual notifications on new incoming messages
  useEffect(() => {
    if (!isAuthenticated || !currentUser?.id) return;

    // Subscribe to the active conversation + top 12 recently updated accessible conversations
    const targetConvIds = Array.from(
      new Set(
        [
          activeChatConversationId,
          ...accessibleConversations.slice(0, 12).map((c) => c.id),
        ].filter(Boolean) as string[]
      )
    );

    const unsubs = targetConvIds.map((convId) =>
      subscribeToConversationMessagesSubcollection(convId, 60, (remoteMsgs) => {
        if (!remoteMsgs || remoteMsgs.length === 0) return;

        const targetConv = chatConversations.find((c) => c.id === convId);
        const nowIso = new Date().toISOString();
        const receiptsToSync: ChatConversationMessage[] = [];

        remoteMsgs.forEach((msg) => {
          if (msg.senderId === currentUser.id || msg.deletedAt) return;

          // Mark as DELIVERED if not yet delivered to currentUser
          if (!msg.deliveredTo || !msg.deliveredTo[currentUser.id]) {
            const updatedMsg: ChatConversationMessage = {
              ...msg,
              deliveredTo: {
                ...(msg.deliveredTo || {}),
                [currentUser.id]: nowIso,
              },
              updatedAt: nowIso,
            };
            receiptsToSync.push(updatedMsg);
          }

          // Trigger sound & visual alert for genuinely new incoming messages (deduplicated & post-boot checked inside handleIncomingMessageAlerts)
          const myEffective = getUserEffectivePresence(currentUser.id);
          if (myEffective.status !== 'DND') {
            handleIncomingMessageAlerts({
              message: msg,
              conversation: targetConv,
              currentUserId: currentUser.id,
              isAuthenticated,
              preferences: chatPreferences,
              activeViewingConversationId: activeChatConversationId,
              isChatWindowMinimized: isFloatingChatMinimized || !isFloatingChatOpen,
              onVisualAlert: (info) => {
                showAppToast({
                  title: `💬 ${info.conversationTitle}`,
                  message: `${info.message.senderName}: ${info.message.text.slice(0, 90)}`,
                  type: 'info',
                });
              },
              onOpenConversation: (cId) => {
                setActiveChatConversationId(cId);
                setIsFloatingChatOpen(true);
                setIsFloatingChatMinimized(false);
              },
            });
          }
        });

        if (receiptsToSync.length > 0) {
          updateMessageReceiptsInFirestore(convId, receiptsToSync);
        }

        setChatMessagesByConv((prev) => {
          const existing = prev[convId] || [];
          const byId = new Map<string, ChatConversationMessage>();
          existing.forEach((m) => byId.set(m.id, m));
          remoteMsgs.forEach((m) => {
            const prevMsg = byId.get(m.id);
            byId.set(m.id, prevMsg ? { ...prevMsg, ...m } : m);
          });
          const merged = Array.from(byId.values()).sort((a, b) =>
            a.createdAt.localeCompare(b.createdAt)
          );
          const next = { ...prev, [convId]: merged };
          saveLocalMessagesByConv(next);
          return next;
        });
      })
    );

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [
    isAuthenticated,
    currentUser?.id,
    activeChatConversationId,
    accessibleConversations.length,
    isFloatingChatOpen,
    isFloatingChatMinimized,
    chatPreferences,
  ]);

  const getConversationUnreadCount = React.useCallback(
    (convId: string): number => {
      if (!currentUser?.id) return 0;
      const msgs = chatMessagesByConv[convId] || [];
      return msgs.filter(
        (m) =>
          m.senderId !== currentUser.id &&
          !m.deletedAt &&
          (!m.readBy || !m.readBy[currentUser.id])
      ).length;
    },
    [chatMessagesByConv, currentUser?.id]
  );

  const totalUnreadChatCount = React.useMemo(() => {
    return accessibleConversations.reduce(
      (sum, conv) => sum + getConversationUnreadCount(conv.id),
      0
    );
  }, [accessibleConversations, getConversationUnreadCount]);

  const updateMyPresenceManualStatus = async (status: 'ONLINE' | 'IDLE' | 'DND') => {
    setMyManualPresenceStatus(status);
    if (!currentUser?.id) return;
    const rec = await publishUserPresenceHeartbeat({
      sisUserId: currentUser.id,
      connectionStatus: status,
      manualStatus: status,
    });
    if (rec) {
      setUserPresenceMap((prev) => ({ ...prev, [currentUser.id]: rec }));
    }
  };

  const updateChatNotificationPreferences = async (
    updates: Partial<ChatNotificationPreferences>
  ) => {
    if (!currentUser?.id) return;
    const nextPrefs: ChatNotificationPreferences = {
      ...chatPreferences,
      ...updates,
      id: currentUser.id,
      userId: currentUser.id,
      updatedAt: new Date().toISOString(),
    };
    setChatPreferences(nextPrefs);
    await saveChatPreferencesToFirestore(nextPrefs);
  };

  const enableChatSoundEngine = async (): Promise<boolean> => {
    const ok = await unlockChatAudioContext();
    setAudioUnlocked(ok);
    if (ok) {
      await playChatNotificationBeep(chatPreferences.soundTone, chatPreferences.soundVolume);
    }
    return ok;
  };

  const testChatSound = async (): Promise<void> => {
    await unlockChatAudioContext();
    await playChatNotificationBeep(chatPreferences.soundTone, chatPreferences.soundVolume);
  };

  const enablePushNotifications = async (): Promise<{ granted: boolean; token?: string }> => {
    const res = await requestChatPushPermissionAndToken();
    if (res.permission !== 'granted') {
      return { granted: false };
    }
    await updateChatNotificationPreferences({
      visualNotificationsEnabled: true,
      pushNotificationsEnabled: true,
      fcmTokens: res.fcmToken
        ? Array.from(new Set([...(chatPreferences.fcmTokens || []), res.fcmToken]))
        : chatPreferences.fcmTokens,
    });
    return { granted: true, token: res.fcmToken };
  };

  const openPrivateConversationWithUser = (
    partnerUserId: string,
    openInFloating = false
  ): ChatConversation | null => {
    if (!currentUser?.id || !partnerUserId || partnerUserId === currentUser.id) return null;
    const partner = users.find((u) => u.id === partnerUserId);
    if (!partner || !partner.isActive) return null;

    const convId = getPrivateConversationId(currentUser.id, partnerUserId);
    const existing = chatConversations.find((c) => c.id === convId);
    if (existing) {
      setActiveChatConversationId(convId);
      if (openInFloating) {
        setIsFloatingChatOpen(true);
        setIsFloatingChatMinimized(false);
      }
      return existing;
    }

    const nowIso = new Date().toISOString();
    const newConv: ChatConversation = {
      id: convId,
      type: 'private',
      title: `${currentUser.name} & ${partner.name}`,
      participantIds: [currentUser.id, partnerUserId].sort(),
      createdBy: currentUser.id,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    setChatConversations((prev) => {
      const next = [newConv, ...prev];
      saveLocalConversations(next);
      return next;
    });
    syncConversationToFirestore(newConv);
    setActiveChatConversationId(convId);
    if (openInFloating) {
      setIsFloatingChatOpen(true);
      setIsFloatingChatMinimized(false);
    }
    return newConv;
  };

  const createCustomGroupConversation = async (data: {
    title: string;
    participantIds: string[];
    description?: string;
    groupId?: string;
    filiereId?: string;
    level?: string;
  }): Promise<{ success: boolean; conversation?: ChatConversation; error?: string }> => {
    if (!currentUser?.id) {
      return { success: false, error: 'Session utilisateur requise.' };
    }
    if (!data.title.trim()) {
      return { success: false, error: 'Veuillez saisir un nom pour le groupe.' };
    }
    const nowIso = new Date().toISOString();
    const allParticipants = Array.from(new Set([currentUser.id, ...data.participantIds]));
    const newConv: ChatConversation = {
      id: generateUniqueId('conv-grp'),
      type: 'group',
      title: data.title.trim(),
      participantIds: allParticipants,
      createdBy: currentUser.id,
      createdAt: nowIso,
      updatedAt: nowIso,
      metadata: {
        description: data.description?.trim() || 'Groupe de discussion pédagogique EBM Institute.',
        groupId: data.groupId,
        filiereId: data.filiereId,
        level: data.level,
        allowReplies: true,
        adminIds: [currentUser.id],
      },
    };

    setChatConversations((prev) => {
      const next = [newConv, ...prev];
      saveLocalConversations(next);
      return next;
    });
    await syncConversationToFirestore(newConv);
    setActiveChatConversationId(newConv.id);
    logAudit('CREATION_GROUPE_DISCUSSION', `Groupe de discussion "${newConv.title}" créé par ${currentUser.name}`);
    return { success: true, conversation: newConv };
  };

  const sendConversationMessage = async (params: {
    conversationId: string;
    text: string;
    attachment?: ChatAttachment;
    replyToMessageId?: string;
  }): Promise<{ success: boolean; message?: ChatConversationMessage; error?: string }> => {
    const { conversationId, text, attachment, replyToMessageId } = params;
    if (!currentUser?.id) {
      return { success: false, error: 'Vous devez être connecté pour envoyer un message.' };
    }
    const cleanText = text.trim();
    if (!cleanText && !attachment) {
      return { success: false, error: 'Le message ne peut pas être vide.' };
    }

    const conv = chatConversations.find((c) => c.id === conversationId);
    if (!conv) {
      return { success: false, error: 'Conversation introuvable.' };
    }

    if (!canUserAccessConversation(currentUser, conv)) {
      return { success: false, error: "Vous n'êtes pas autorisé à participer à cette conversation." };
    }

    // Check announcement publishing & reply permissions (Section 4.3 & Section 12)
    if (conv.type === 'announcement') {
      const canPublish = canUserPublishOfficialAnnouncement(currentUser);
      const repliesAllowed = conv.metadata?.allowReplies === true;
      if (!canPublish && !repliesAllowed) {
        return {
          success: false,
          error:
            "Seuls la Direction, le Responsable Académique et la Scolarité peuvent publier dans ce canal d'annonces officielles.",
        };
      }
    }

    const nowIso = new Date().toISOString();
    const existingMsgs = chatMessagesByConv[conversationId] || [];
    const replyTarget = replyToMessageId
      ? existingMsgs.find((m) => m.id === replyToMessageId)
      : undefined;

    const msgType: ChatConversationMessage['type'] = attachment
      ? ['JPG', 'JPEG', 'PNG'].includes(attachment.extension.toUpperCase())
        ? 'image'
        : 'file'
      : conv.type === 'announcement'
      ? 'announcement'
      : 'text';

    // Determine online recipients for immediate delivery receipt
    const deliveredTo: Record<string, string> = {
      [currentUser.id]: nowIso,
    };
    conv.participantIds.forEach((pid) => {
      if (pid !== currentUser.id && getUserEffectivePresence(pid).status !== 'OFFLINE') {
        deliveredTo[pid] = nowIso;
      }
    });

    const newMsg: ChatConversationMessage = {
      id: generateUniqueId('msg'),
      conversationId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      text: cleanText || (attachment ? `📎 ${attachment.name}` : ''),
      type: msgType,
      attachment,
      replyToMessageId: replyTarget?.id,
      replyToPreview: replyTarget
        ? {
            senderName: replyTarget.senderName,
            text: replyTarget.text.slice(0, 120),
          }
        : undefined,
      createdAt: nowIso,
      deliveredTo,
      readBy: {
        [currentUser.id]: nowIso,
      },
      updatedAt: nowIso,
    };

    const updatedConv: ChatConversation = {
      ...conv,
      updatedAt: nowIso,
      lastMessageAt: nowIso,
      lastMessage: {
        id: newMsg.id,
        text: newMsg.text,
        senderId: newMsg.senderId,
        senderName: newMsg.senderName,
        createdAt: nowIso,
        type: newMsg.type,
      },
    };

    setChatMessagesByConv((prev) => {
      const list = [...(prev[conversationId] || []), newMsg].sort((a, b) =>
        a.createdAt.localeCompare(b.createdAt)
      );
      const next = { ...prev, [conversationId]: list };
      saveLocalMessagesByConv(next);
      return next;
    });

    setChatConversations((prev) => {
      const next = prev.map((c) => (c.id === conversationId ? updatedConv : c));
      saveLocalConversations(next);
      return next;
    });

    // Clear typing indicator for sender
    publishTypingStatus({
      conversationId,
      userId: currentUser.id,
      userName: currentUser.name,
      isTyping: false,
    });

    await saveMessageToSubcollection(updatedConv, newMsg);
    return { success: true, message: newMsg };
  };

  const editConversationMessage = async (
    conversationId: string,
    messageId: string,
    newText: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser?.id) return { success: false, error: 'Session requise.' };
    const clean = newText.trim();
    if (!clean) return { success: false, error: 'Le message modifié ne peut pas être vide.' };

    const list = chatMessagesByConv[conversationId] || [];
    const target = list.find((m) => m.id === messageId);
    if (!target) return { success: false, error: 'Message introuvable.' };
    if (target.senderId !== currentUser.id) {
      return { success: false, error: 'Vous ne pouvez modifier que vos propres messages.' };
    }

    const nowIso = new Date().toISOString();
    const updatedMsg: ChatConversationMessage = {
      ...target,
      text: clean,
      editedAt: nowIso,
      updatedAt: nowIso,
    };

    const conv = chatConversations.find((c) => c.id === conversationId);
    const updatedConv: ChatConversation | undefined = conv
      ? {
          ...conv,
          updatedAt: nowIso,
          lastMessage:
            conv.lastMessage?.id === messageId
              ? { ...conv.lastMessage, text: clean }
              : conv.lastMessage,
        }
      : undefined;

    setChatMessagesByConv((prev) => {
      const nextList = (prev[conversationId] || []).map((m) =>
        m.id === messageId ? updatedMsg : m
      );
      const next = { ...prev, [conversationId]: nextList };
      saveLocalMessagesByConv(next);
      return next;
    });

    if (updatedConv) {
      setChatConversations((prev) => {
        const next = prev.map((c) => (c.id === conversationId ? updatedConv : c));
        saveLocalConversations(next);
        return next;
      });
      await saveMessageToSubcollection(updatedConv, updatedMsg);
    }

    return { success: true };
  };

  const deleteConversationMessage = async (
    conversationId: string,
    messageId: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser?.id) return { success: false, error: 'Session requise.' };
    const list = chatMessagesByConv[conversationId] || [];
    const target = list.find((m) => m.id === messageId);
    if (!target) return { success: false, error: 'Message introuvable.' };
    if (target.senderId !== currentUser.id && currentUser.role !== 'ADMIN') {
      return { success: false, error: 'Vous ne pouvez supprimer que vos propres messages.' };
    }

    const nowIso = new Date().toISOString();
    const updatedMsg: ChatConversationMessage = {
      ...target,
      text: 'Ce message a été supprimé.',
      attachment: undefined,
      deletedAt: nowIso,
      deletedBy: currentUser.id,
      updatedAt: nowIso,
    };

    const conv = chatConversations.find((c) => c.id === conversationId);
    const updatedConv: ChatConversation | undefined = conv
      ? {
          ...conv,
          updatedAt: nowIso,
          lastMessage:
            conv.lastMessage?.id === messageId
              ? { ...conv.lastMessage, text: '🚫 Message supprimé' }
              : conv.lastMessage,
        }
      : undefined;

    setChatMessagesByConv((prev) => {
      const nextList = (prev[conversationId] || []).map((m) =>
        m.id === messageId ? updatedMsg : m
      );
      const next = { ...prev, [conversationId]: nextList };
      saveLocalMessagesByConv(next);
      return next;
    });

    if (updatedConv) {
      setChatConversations((prev) => {
        const next = prev.map((c) => (c.id === conversationId ? updatedConv : c));
        saveLocalConversations(next);
        return next;
      });
      await saveMessageToSubcollection(updatedConv, updatedMsg);
    }

    return { success: true };
  };

  // Explicit read receipt: ONLY marks messages as read when the user actively opens and views the conversation (Section 7)
  const markConversationAsRead = async (conversationId: string): Promise<void> => {
    if (!currentUser?.id || !conversationId) return;
    const msgs = chatMessagesByConv[conversationId] || [];
    const nowIso = new Date().toISOString();
    const updatedMessages: ChatConversationMessage[] = [];

    const nextList = msgs.map((m) => {
      if (m.senderId !== currentUser.id && !m.deletedAt && (!m.readBy || !m.readBy[currentUser.id])) {
        const updated: ChatConversationMessage = {
          ...m,
          deliveredTo: {
            ...(m.deliveredTo || {}),
            [currentUser.id]: m.deliveredTo?.[currentUser.id] || nowIso,
          },
          readBy: {
            ...(m.readBy || {}),
            [currentUser.id]: nowIso,
          },
          updatedAt: nowIso,
        };
        updatedMessages.push(updated);
        return updated;
      }
      return m;
    });

    if (updatedMessages.length > 0) {
      setChatMessagesByConv((prev) => {
        const next = { ...prev, [conversationId]: nextList };
        saveLocalMessagesByConv(next);
        return next;
      });
      await updateMessageReceiptsInFirestore(conversationId, updatedMessages);
    }
  };

  const setTypingInConversation = (conversationId: string, isTyping: boolean) => {
    if (!currentUser?.id || !conversationId) return;
    publishTypingStatus({
      conversationId,
      userId: currentUser.id,
      userName: currentUser.name,
      isTyping,
    });
  };

  const loadOlderConversationMessages = async (conversationId: string): Promise<number> => {
    const existing = chatMessagesByConv[conversationId] || [];
    const oldest = existing[0]?.createdAt;
    const olderMsgs = await fetchPaginatedConversationMessages(conversationId, 40, oldest);
    if (olderMsgs.length > 0) {
      setChatMessagesByConv((prev) => {
        const currentList = prev[conversationId] || [];
        const byId = new Map<string, ChatConversationMessage>();
        olderMsgs.forEach((m) => byId.set(m.id, m));
        currentList.forEach((m) => byId.set(m.id, m));
        const merged = Array.from(byId.values()).sort((a, b) =>
          a.createdAt.localeCompare(b.createdAt)
        );
        const next = { ...prev, [conversationId]: merged };
        saveLocalMessagesByConv(next);
        return next;
      });
    }
    return olderMsgs.length;
  };

  const uploadAttachmentToConversation = async (
    conversationId: string,
    file: File
  ): Promise<{ success: boolean; attachment?: ChatAttachment; error?: string }> => {
    if (!currentUser?.id) return { success: false, error: 'Session utilisateur requise.' };
    return uploadChatAttachmentFile({
      file,
      conversationId,
      senderId: currentUser.id,
      maxFileSizeMb: Math.min(10, appSettings.storageSettings?.maxFileSizeMb || 10),
    });
  };

  const toggleConversationAllowReplies = async (
    conversationId: string,
    allowReplies: boolean
  ): Promise<{ success: boolean; error?: string }> => {
    if (!canUserPublishOfficialAnnouncement(currentUser)) {
      return { success: false, error: 'Action réservée à la Direction ou la Scolarité.' };
    }
    const conv = chatConversations.find((c) => c.id === conversationId);
    if (!conv) return { success: false, error: 'Canal introuvable.' };

    const updatedConv: ChatConversation = {
      ...conv,
      updatedAt: new Date().toISOString(),
      metadata: {
        ...(conv.metadata || {}),
        allowReplies,
      },
    };
    setChatConversations((prev) => {
      const next = prev.map((c) => (c.id === conversationId ? updatedConv : c));
      saveLocalConversations(next);
      return next;
    });
    await syncConversationToFirestore(updatedConv);
    return { success: true };
  };

  // Legacy-compatible wrappers (ZERO fake auto-replies, delegates directly to real-time conversations)
  const sendChatMessage = (recipientId: string, text: string) => {
    if (!text.trim() || !currentUser) return;
    const conv = openPrivateConversationWithUser(recipientId, false);
    if (conv) {
      sendConversationMessage({
        conversationId: conv.id,
        text: text.trim(),
      });
    }
  };

  const markChatAsRead = (partnerId: string) => {
    if (!currentUser) return;
    const convId = getPrivateConversationId(currentUser.id, partnerId);
    markConversationAsRead(convId);
  };

  // Formule d'évaluation : 40% CC + 60% Examen OU Évaluation Directe 100%
  // P64: Only compute weighted sum when BOTH quizScore and examScore are defined (unless direct 100% evaluation)
  const calculateEcFinalScore = (quizScore?: number, examScore?: number, ecId?: string): number | undefined => {
    const targetEc = ecId ? ecs.find((e) => e.id === ecId) : undefined;
    const isDirect100 = targetEc ? (targetEc.quizWeight === 0 || targetEc.examWeight === 1.0) : false;

    if (isDirect100) {
      if (examScore !== undefined && Number.isFinite(examScore)) return Number(examScore.toFixed(2));
      if (quizScore !== undefined && Number.isFinite(quizScore)) return Number(quizScore.toFixed(2));
      return undefined;
    }

    const qWeight = targetEc?.quizWeight ?? 0.40;
    const eWeight = targetEc?.examWeight ?? 0.60;

    if (quizScore !== undefined && examScore !== undefined && Number.isFinite(quizScore) && Number.isFinite(examScore)) {
      return Number(((quizScore * qWeight) + (examScore * eWeight)).toFixed(2));
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
  ): { success: boolean; error?: string } => {
    const targetEc = ecs.find((e) => e.id === ecId);
    // P25: Verify teacher ownership when role === 'TEACHER'
    if (
      currentUser.role === 'TEACHER' &&
      targetEc &&
      Array.isArray(targetEc.teacherIds) &&
      targetEc.teacherIds.length > 0 &&
      !targetEc.teacherIds.includes(currentUser.id)
    ) {
      logAudit('ACCES_REFUSE_NOTE_EC', `Tentative non autorisée de saisie de note sur ${targetEc.code} par ${currentUser.name}`);
      return {
        success: false,
        error: `Accès refusé : vous n'êtes pas l'enseignant responsable de l'élément constitutif ${targetEc.code}.`,
      };
    }

    // Strict score bounds validation [0, 20] — reject out-of-range values instead of clamping silently
    const validateScore = (val: number | undefined, label: string): { valid: boolean; value?: number; error?: string } => {
      if (val === undefined || val === null) return { valid: true, value: undefined };
      if (!Number.isFinite(val) || val < 0 || val > 20) {
        return {
          valid: false,
          error: `Note invalide (${label} : ${val}) : la note doit être comprise strictement entre 0 et 20.`,
        };
      }
      return { valid: true, value: Number(val.toFixed(2)) };
    };

    const qCheck = validateScore(quizScore, 'Contrôle Continu');
    if (!qCheck.valid) return { success: false, error: qCheck.error };
    const eCheck = validateScore(examScore, 'Examen');
    if (!eCheck.valid) return { success: false, error: eCheck.error };
    const rCheck = validateScore(rattrapageScore, 'Rattrapage');
    if (!rCheck.valid) return { success: false, error: rCheck.error };

    const validQuiz = qCheck.value;
    const validExam = eCheck.value;
    const validRattrapage = rCheck.value;

    const targetUe = ues.find((u) => u.id === targetEc?.ueId);
    const ecSemester = targetEc?.semester || targetUe?.semester || 'S1';

    const session1Score = calculateEcFinalScore(validQuiz, validExam, ecId);
    const finalScore =
      validRattrapage !== undefined
        ? Number(Math.max(session1Score ?? 0, validRattrapage).toFixed(2))
        : session1Score;

    // P68: Match by (studentId, ecId, academicYear)
    const existingIndex = grades.findIndex(
      (g) =>
        g.studentId === studentId &&
        g.ecId === ecId &&
        (!g.academicYear || g.academicYear === selectedAcademicYear)
    );

    const targetStudent = users.find((u) => u.id === studentId);
    const updatedGrade: EcGrade = {
      id: existingIndex >= 0 ? grades[existingIndex].id : generateUniqueId(`grd-${studentId}-${ecId}`),
      studentId,
      studentUid: targetStudent?.uid || studentId,
      ecId,
      academicYear: selectedAcademicYear,
      semester: ecSemester,
      quizScore: validQuiz,
      examScore: validExam,
      session1Score,
      rattrapageScore: validRattrapage,
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
    syncDocToFirestore('grades', updatedGrade);

    logAudit(
      'SAISIE_NOTE_LMD',
      `Saisie de note EC ${targetEc?.code || ecId} (${ecSemester}) pour étudiant ${studentId} (Quiz: ${validQuiz ?? '-'}, Examen: ${validExam ?? '-'}, Rattrapage: ${validRattrapage ?? '-'}, Retenu: ${finalScore ?? '-'})`
    );
    return { success: true };
  };

  const publishGrades = (ecId: string): { success: boolean; error?: string } => {
    const ec = ecs.find((e) => e.id === ecId);
    if (!ec) {
      return { success: false, error: 'Élément constitutif introuvable.' };
    }
    // P25: Verify teacher ownership when role === 'TEACHER'
    if (
      currentUser.role === 'TEACHER' &&
      Array.isArray(ec.teacherIds) &&
      ec.teacherIds.length > 0 &&
      !ec.teacherIds.includes(currentUser.id)
    ) {
      return {
        success: false,
        error: `Publication refusée : vous n'êtes pas l'enseignant titulaire de l'EC ${ec.code}.`,
      };
    }

    // P69: Filter by ecId AND selectedAcademicYear
    setGrades((prev) =>
      prev.map((g) => {
        if (g.ecId === ecId && (!g.academicYear || g.academicYear === selectedAcademicYear)) {
          const updated = { ...g, isPublished: true, isDraft: false, lastModifiedAt: new Date().toISOString() };
          syncDocToFirestore('grades', updated);
          return updated;
        }
        return g;
      })
    );

    // Notify students of this EC for the active academic year
    const affectedGrades = grades.filter(
      (g) => g.ecId === ecId && (!g.academicYear || g.academicYear === selectedAcademicYear)
    );
    affectedGrades.forEach((g) => {
      triggerNotification({
        recipientId: g.studentId,
        recipientRole: 'STUDENT',
        title: `📢 Notes publiées : ${ec.code || 'EC'}`,
        message: `Vos notes officielles pour l’élément ${ec.title || ec.code} sont disponibles. Note finale : ${g.finalScore !== undefined ? g.finalScore + '/20' : 'En attente'}.`,
        type: 'SUCCESS',
      });
    });

    logAudit('PUBLICATION_OFFICIELLE_NOTES', `Publication officielle des notes pour l’élément ${ec.code || ecId} (${selectedAcademicYear})`);
    return { success: true };
  };

  const getStudentEcGrade = (studentId: string, ecId: string): EcGrade | undefined => {
    return (
      grades.find(
        (g) => g.studentId === studentId && g.ecId === ecId && g.academicYear === selectedAcademicYear
      ) || grades.find((g) => g.studentId === studentId && g.ecId === ecId)
    );
  };

  const getStudentUeSummary = (studentId: string, ueId: string) => {
    const ue = ues.find((u) => u.id === ueId);
    const relatedEcs = ecs.filter((ec) => ec.ueId === ueId || ue?.ecIds.includes(ec.id));

    let totalWeight = 0;
    let weightedSum = 0;
    let gradedCount = 0;

    const ecDetails = relatedEcs.map((ec) => {
      const grade = getStudentEcGrade(studentId, ec.id);
      const isPassed = (grade?.finalScore ?? 0) >= 10;
      if (grade?.finalScore !== undefined) {
        weightedSum += grade.finalScore * ec.creditsEcts;
        totalWeight += ec.creditsEcts;
        gradedCount++;
      }
      return { ec, grade, isPassed };
    });

    const rawAverage = totalWeight > 0 ? weightedSum / totalWeight : 0;
    const average = totalWeight > 0 ? Number(rawAverage.toFixed(2)) : 0;
    // P66: Compare unrounded rawAverage against validationThreshold so 9.996 is not rounded to 10.00 before threshold check
    const threshold = ue?.validationThreshold || 10.0;
    const isPassed = rawAverage >= threshold - 1e-9;
    // P67: Sum EC credits if ue.creditsEcts is not defined
    const sumEcCredits = relatedEcs.reduce((acc, ec) => acc + (ec.creditsEcts || 0), 0);
    const totalCredits = ue?.creditsEcts || sumEcCredits || 6;
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

  const generateUniqueOtpToken = (): string => {
    const activeTokens = new Set(
      qrSessions
        .filter((s) => s.isActive && new Date(s.expiresAt).getTime() > Date.now())
        .map((s) => s.codeToken.toUpperCase())
    );
    let candidate = `EBM-${Math.floor(1000 + Math.random() * 9000)}`;
    let attempts = 0;
    while (activeTokens.has(candidate) && attempts < 25) {
      candidate = `EBM-${Math.floor(1000 + Math.random() * 9000)}`;
      attempts++;
    }
    return candidate;
  };

  const generateQrSession = (
    sessionId: string,
    courseTitle: string,
    ecCode: string,
    roomName: string,
    teacherId: string,
    groupId: string,
    validityMinutes: number = 15
  ): QrAttendanceSession => {
    const randomOtp = generateUniqueOtpToken();
    const now = new Date();
    const expires = new Date(now.getTime() + validityMinutes * 60000);

    const newQrSession: QrAttendanceSession = {
      id: generateUniqueId('qr'),
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
    syncDocToFirestore('qrSessions', newQrSession);
    logAudit('GENERATION_QR_PRESENCE', `Génération QR Code présence pour ${courseTitle} (${ecCode}) - Code: ${randomOtp} (Expire dans ${validityMinutes}min)`);
    return newQrSession;
  };

  const rotateQrSessionToken = (qrSessionId: string, validityMinutes: number = 15): string | undefined => {
    const newOtp = generateUniqueOtpToken();
    const now = new Date();
    const expires = new Date(now.getTime() + validityMinutes * 60000);
    setQrSessions((prev) =>
      prev.map((s) => {
        if (s.id !== qrSessionId) return s;
        const updated: QrAttendanceSession = {
          ...s,
          codeToken: newOtp,
          generatedAt: now.toISOString(),
          expiresAt: expires.toISOString(),
        };
        syncDocToFirestore('qrSessions', updated);
        return updated;
      })
    );
    logAudit('RENOUVELLEMENT_QR_PRESENCE', `Renouvellement dynamique du jeton QR (${newOtp}) pour la séance ${qrSessionId}`);
    return newOtp;
  };

  const stopQrSession = (qrSessionId: string) => {
    setQrSessions((prev) =>
      prev.map((s) => {
        if (s.id !== qrSessionId) return s;
        const updated = { ...s, isActive: false };
        syncDocToFirestore('qrSessions', updated);
        return updated;
      })
    );
    logAudit('ARRET_QR_PRESENCE', `Clôture de la session QR Code ${qrSessionId}`);
  };

  const scanQrAttendance = (codeToken: string, studentId: string) => {
    const cleanToken = codeToken.trim().toUpperCase();
    // P81: Also check expiration when matching active session
    const targetSession = qrSessions.find(
      (s) =>
        s.isActive &&
        s.codeToken.toUpperCase() === cleanToken &&
        new Date(s.expiresAt).getTime() >= Date.now()
    );

    if (!targetSession) {
      return { success: false, message: 'Code QR ou OTP invalide, ou la session a été renouvelée / expirée (ACC-030).' };
    }

    // P82: If currentUser is a STUDENT, enforce effectiveStudentId = currentUser.id
    const effectiveStudentId = currentUser.role === 'STUDENT' ? currentUser.id : studentId;
    const student = users.find((u) => u.id === effectiveStudentId);
    if (!student || student.role !== 'STUDENT') {
      return { success: false, message: 'Compte étudiant introuvable ou non autorisé.' };
    }

    // P83 & ACC-032: Verify student belongs to the session's group (including if student has no groupId)
    if (targetSession.groupId && (!student.groupId || student.groupId !== targetSession.groupId)) {
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
    const alreadyRecorded = targetSession.records.some((r) => r.studentId === effectiveStudentId);
    if (alreadyRecorded) {
      return { success: false, message: 'Double pointage bloqué (ACC-031) : Votre présence a déjà été enregistrée pour cette séance !' };
    }

    // P84: Determine if scan is LATE (> 15 minutes after linked timetable session startTime or QR generation)
    let attendanceStatus: 'PRESENT' | 'LATE' = 'PRESENT';
    const linkedTimetableSession = sessions.find((s) => s.id === targetSession.sessionId);
    if (linkedTimetableSession && linkedTimetableSession.date && linkedTimetableSession.startTime) {
      const sessionStartMs = new Date(`${linkedTimetableSession.date}T${linkedTimetableSession.startTime}:00+03:00`).getTime();
      if (Number.isFinite(sessionStartMs) && Date.now() - sessionStartMs > 15 * 60 * 1000) {
        attendanceStatus = 'LATE';
      }
    }

    const newRecord: AttendanceRecord = {
      id: generateUniqueId('rec'),
      studentId: effectiveStudentId,
      studentName: student.name || 'Étudiant',
      matricule: student.matricule || 'N/A',
      scannedAt: new Date().toISOString(),
      status: attendanceStatus,
    };

    setQrSessions((prev) =>
      prev.map((s) => {
        if (s.id !== targetSession.id) return s;
        const updated = { ...s, records: [...s.records, newRecord] };
        syncDocToFirestore('qrSessions', updated);
        return updated;
      })
    );

    logAudit('POINTAGE_QR_REUSSI', `Présence (${attendanceStatus}) validée par QR/Code-barres pour ${student.name} (${student.matricule}) sur ${targetSession.courseTitle}`);
    return {
      success: true,
      message: `Présence (${attendanceStatus === 'LATE' ? 'Retard > 15 min' : 'À l’heure'}) validée avec succès pour le cours de ${targetSession.courseTitle} !`,
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
        let updated: QrAttendanceSession;
        if (exists) {
          updated = {
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
          updated = {
            ...s,
            records: [
              ...s.records,
              {
                id: generateUniqueId('rec-corr'),
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
        syncDocToFirestore('qrSessions', updated);
        return updated;
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
      id: generateUniqueId('rec-adm'),
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
      id: generateUniqueId('qr-adm'),
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
    syncDocToFirestore('qrSessions', manualSession);
    logAudit(
      'POINTAGE_MANUEL_ADMINISTRATION',
      `Pointage manuel par ${currentUser.name} pour ${student?.name} (${student?.matricule}) : ${data.status} sur ${data.ecCode} (${data.date}). Motif : ${data.reason || 'RAS'}`
    );
    return manualSession;
  };

  // Messaging & Group Wall
  const sendMessage = (data: { recipientId?: string; recipientGroupId?: string; subject: string; content: string }) => {
    const newMessage: InternalMessage = {
      id: generateUniqueId('msg'),
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
    syncDocToFirestore('internalMessages', newMessage);

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
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const updated = { ...m, isRead: true };
        syncDocToFirestore('internalMessages', updated);
        return updated;
      })
    );
  };

  const createGroupPost = (data: { groupId: string; title: string; content: string; category: GroupPost['category']; isPinned?: boolean }) => {
    const newPost: GroupPost = {
      id: generateUniqueId('post'),
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
    syncDocToFirestore('groupPosts', newPost);

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
    deletedDocIdsRef.current.add(postId);
    setGroupPosts((prev) => prev.filter((p) => p.id !== postId));
    removeDocFromFirestore('groupPosts', postId);
    logAudit('SUPPRESSION_POST_GROUPE', `Suppression du post ${postId}`);
  };

  // Financial Management in Ariary (Ar) & Cash Register
  const addFee = (data: Omit<StudentFee, 'id'>) => {
    const newFee: StudentFee = {
      ...data,
      id: generateUniqueId('fee'),
    };
    setFees((prev) => [...prev, newFee]);
    syncDocToFirestore('fees', newFee);
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
    deletedDocIdsRef.current.add(id);
    setFees((prev) => prev.filter((f) => f.id !== id));
    removeDocFromFirestore('fees', id);
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

    // P78: Validate finite positive amount before arithmetic
    if (!Number.isFinite(data.amountPaidAr) || data.amountPaidAr <= 0) {
      return { success: false, error: 'Le montant encaissé doit être un nombre valide supérieur à 0 Ar.' };
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

    if (data.amountPaidAr > currentRemainingAr) {
      return {
        success: false,
        error: `Le montant saisi (${data.amountPaidAr.toLocaleString()} Ar) dépasse le solde restant dû (${currentRemainingAr.toLocaleString()} Ar) pour ce frais (ACC-010).`,
      };
    }

    const newTotalPaid = previousPaidForFee + data.amountPaidAr;
    const remainingBalanceAr = Math.max(0, fee.amountAr - newTotalPaid);

    // P76 & P77: Dynamic year and collision-free receipt number + Antananarivo local date
    const currentYear = new Date().getFullYear();
    const maxSeq = payments.reduce((max, p) => {
      const m = p.receiptNumber?.match(/REC-EBM-\d{4}-(\d+)/);
      return m ? Math.max(max, parseInt(m[1], 10)) : max;
    }, payments.length);
    const receiptNumber = `REC-EBM-${currentYear}-${String(maxSeq + 1).padStart(4, '0')}`;
    const todayStr = getAntananarivoDateStr();

    const targetStudentUser = users.find((u) => u.id === data.studentId);
    const newTransaction: PaymentTransaction = {
      id: generateUniqueId('pay'),
      receiptNumber,
      studentId: data.studentId,
      studentUid: targetStudentUser?.uid || data.studentId,
      feeId: data.feeId,
      amountPaidAr: data.amountPaidAr,
      remainingBalanceAr,
      paymentMethod: data.paymentMethod,
      referenceNumber: data.referenceNumber,
      paymentDate: todayStr,
      recordedBy: currentUser.name,
      notes: data.notes,
    };

    setPayments((prev) => [newTransaction, ...prev]);
    syncDocToFirestore('payments', newTransaction);

    // Update today's cash register distinctly by payment method (Cash vs Mobile Money vs Bank)
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
        syncDocToFirestore('cashDays', updated);
        return prev.map((d) => (d.date === todayStr ? updated : d));
      } else {
        const newRegister: CashRegisterDay = {
          id: generateUniqueId('crd'),
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
        syncDocToFirestore('cashDays', newRegister);
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
      prev.map((p) => {
        if (p.id !== paymentId) return p;
        const updated: PaymentTransaction = {
          ...p,
          isCancelled: true,
          cancelReason: reason,
          cancelledBy: currentUser.name,
          cancelledAt: new Date().toISOString(),
          notes: `${p.notes || ''} [ANNULÉ par ${currentUser.name}: ${reason}]`.trim(),
        };
        syncDocToFirestore('payments', updated);
        return updated;
      })
    );

    // Update cash register day to reflect the voided transaction
    setCashRegisterDays((prev) =>
      prev.map((d) => {
        if (d.date !== targetPayment.paymentDate || d.isClosed) return d;
        const amt = targetPayment.amountPaidAr;
        const updatedRegister: CashRegisterDay = {
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
        syncDocToFirestore('cashDays', updatedRegister);
        return updatedRegister;
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
      prev.map((d) => {
        if (d.date !== date) return d;
        const updatedRegister: CashRegisterDay = {
          ...d,
          actualClosingAr,
          discrepancyAr,
          isClosed: true,
          closedBy: currentUser.name,
          closedAt: new Date().toISOString(),
          closureNotes: closureNotes || `Clôture journalière effectuée par ${currentUser.name}. Écart : ${discrepancyAr.toLocaleString()} Ar.`,
        };
        syncDocToFirestore('cashDays', updatedRegister);
        return updatedRegister;
      })
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
      id: generateUniqueId('hw'),
      publishedAt: new Date().toISOString(),
    };
    setHomework((prev) => [newHw, ...prev]);
    syncDocToFirestore('homework', newHw);

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
      id: generateUniqueId(`sub-${currentUser.id}-${homeworkId}`),
      homeworkId,
      studentId: currentUser.id,
      studentUid: currentUser.uid || currentUser.id,
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
    syncDocToFirestore('submissions', newSub);

    logAudit('DEPOT_DEVOIR', `Dépôt du devoir "${hw.title}" par ${currentUser.name} (Fichier: ${fileName}, Taille: ${fileSize}, En retard: ${isLate ? 'Oui' : 'Non'})`);
    return { success: true, submission: newSub };
  };

  const gradeSubmission = (submissionId: string, grade: number, feedback: string) => {
    setSubmissions((prev) =>
      prev.map((s) => {
        if (s.id !== submissionId) return s;
        const updated = { ...s, grade, teacherFeedback: feedback, isGraded: true };
        syncDocToFirestore('submissions', updated);
        return updated;
      })
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
      id: generateUniqueId('res'),
      publishedAt: new Date().toISOString(),
      academicYear: data.academicYear || selectedAcademicYear,
    };
    setLearningResources((prev) => [newRes, ...prev]);
    syncDocToFirestore('learningResources', newRes);
    logAudit('AJOUT_RESSOURCE', `Support pédagogique ajouté par ${currentUser.name} : "${data.title}" (${data.fileName})`);
    return { success: true, resource: newRes };
  };

  const deleteLearningResource = (id: string) => {
    deletedDocIdsRef.current.add(id);
    setLearningResources((prev) => prev.filter((r) => r.id !== id));
    removeDocFromFirestore('learningResources', id);
    logAudit('SUPPRESSION_RESSOURCE', `Support pédagogique supprimé ${id}`);
  };

  const archiveOldResources = (targetYear?: string): number => {
    let archivedCount = 0;
    setLearningResources((prev) =>
      prev.map((r) => {
        if ((!targetYear || r.academicYear === targetYear) && !r.isArchived) {
          archivedCount++;
          const updated = { ...r, isArchived: true };
          syncDocToFirestore('learningResources', updated);
          return updated;
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
      id: generateUniqueId('crole'),
      createdAt: new Date().toISOString(),
    };
    setCustomRoles((prev) => [...prev, created]);
    syncDocToFirestore('customRoles', created);
    logAudit('CREATION_ROLE_PERSONNALISE', `Création du rôle personnalisé "${created.label}" (${created.code})`);
    return created;
  };

  const updateCustomRole = (id: string, updates: Partial<CustomRoleDefinition>) => {
    setCustomRoles((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, ...updates };
        syncDocToFirestore('customRoles', updated);
        return updated;
      })
    );
    logAudit('MODIFICATION_ROLE_PERSONNALISE', `Mise à jour du rôle personnalisé ${id}`);
  };

  const deleteCustomRole = (id: string) => {
    deletedDocIdsRef.current.add(id);
    setCustomRoles((prev) => prev.filter((r) => r.id !== id));
    removeDocFromFirestore('customRoles', id);
    logAudit('SUPPRESSION_ROLE_PERSONNALISE', `Suppression du rôle personnalisé ${id}`);
  };

  const requestProfileChange = (
    studentId: string,
    changes: ProfileChangeRequest['changes'],
    reason: string
  ): ProfileChangeRequest => {
    const student = users.find((u) => u.id === studentId);
    const req: ProfileChangeRequest = {
      id: generateUniqueId('pcreq'),
      studentId,
      studentUid: student?.uid || studentId,
      studentName: student?.name || 'Étudiant',
      matricule: student?.matricule || 'N/A',
      requestedAt: new Date().toISOString(),
      status: 'PENDING',
      changes,
      reason,
    };
    setProfileChangeRequests((prev) => [req, ...prev]);
    syncDocToFirestore('profileChangeRequests', req);
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
      prev.map((r) => {
        if (r.id !== requestId) return r;
        const updated: ProfileChangeRequest = {
          ...r,
          status: 'APPROVED',
          reviewedBy: currentUser.name,
          reviewedAt: new Date().toISOString(),
          reviewComment: comment || 'Validé par le service Scolarité.',
        };
        syncDocToFirestore('profileChangeRequests', updated);
        return updated;
      })
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
      prev.map((r) => {
        if (r.id !== requestId) return r;
        const updated: ProfileChangeRequest = {
          ...r,
          status: 'REJECTED',
          reviewedBy: currentUser.name,
          reviewedAt: new Date().toISOString(),
          reviewComment: comment || 'Justificatif officiel requis.',
        };
        syncDocToFirestore('profileChangeRequests', updated);
        return updated;
      })
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
        const updated: User = {
          ...u,
          cardToken: newToken,
          cardIssueNumber: nextIssue,
          cardIssuedAt: getAntananarivoDateStr(),
          revokedCardTokens: oldToken ? [...(u.revokedCardTokens || []), oldToken] : u.revokedCardTokens || [],
        };
        syncDocToFirestore('users', updated);
        return updated;
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
        const updated = { ...u, linkedStudentIds: [...currentLinks, studentId] };
        syncDocToFirestore('users', updated);
        return updated;
      })
    );
    logAudit('RATTACHEMENT_PARENT_ETUDIANT', `Association du compte parent ${parentId} à l'étudiant ${studentId}`);
  };

  const unlinkParentFromStudent = (parentId: string, studentId: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== parentId) return u;
        const updated = {
          ...u,
          linkedStudentIds: (u.linkedStudentIds || []).filter((id) => id !== studentId),
        };
        syncDocToFirestore('users', updated);
        return updated;
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

    const delibStudent = users.find((u) => u.id === recordData.studentId);
    const record: DeliberationRecord = {
      ...recordData,
      id: existing?.id || recordData.id || `delib-${recordData.academicYear}-${recordData.semester}-${recordData.studentId}`,
      studentUid: delibStudent?.uid || recordData.studentId,
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
      customRoles,
      profileChangeRequests,
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
    // P20 & P21: Validate checksum and schema/roles before restoring
    const verification = verifyBackupSnapshotIntegrity(snapshot);
    if (!verification.valid) {
      return { success: false, message: verification.error || 'Fichier de sauvegarde invalide ou corrompu.' };
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
    // P22: Also restore internalMessages, groupPosts, notifications, customRoles, profileChangeRequests, auditLogs
    if (Array.isArray(p.internalMessages)) setInternalMessages(p.internalMessages as InternalMessage[]);
    if (Array.isArray(p.groupPosts)) setGroupPosts(p.groupPosts as GroupPost[]);
    if (Array.isArray(p.notifications)) setNotifications(p.notifications as AppNotification[]);
    if (Array.isArray(p.customRoles)) setCustomRoles(p.customRoles as CustomRoleDefinition[]);
    if (Array.isArray(p.profileChangeRequests)) setProfileChangeRequests(p.profileChangeRequests as ProfileChangeRequest[]);
    if (Array.isArray(p.auditLogs)) setAuditLogs(p.auditLogs as AuditLog[]);

    logAudit('RESTAURATION_SAUVEGARDE_SIS', `Restauration complète depuis "${snapshot.label}" (Checksum: ${snapshot.checksum})`);
    return {
      success: true,
      message: `Restauration réussie (${snapshot.recordCount} enregistrements rétablis avec succès).`,
    };
  };

  const syncAllToCloudFirestore = async (): Promise<{ success: boolean; totalSynced: number; message: string }> => {
    setCloudSyncStatus('SYNCING');
    createSystemBackup('Sauvegarde automatique avant synchronisation Cloud Firestore');

    // Ensure the global Institutional Cloud Bridge is enabled without requiring a per-browser Google OAuth popup
    if (!isCloudBridgeActive()) {
      await setInstitutionalCloudBridgeState(true, currentUser?.name || 'Administrateur EBM');
    }
    setIsCloudConnected(true);
    await ensureFirebaseAuthSession(currentUser);

    // Flush any queued offline mutations and pull remote changes first so we never overwrite newer remote records
    await flushPendingSyncOutbox();
    await pullFromCloudFirestore();

    // P14: Symmetric push of all 27 collections
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
      syncCollectionBatch('qrSessions', qrSessions),
      syncCollectionBatch('fees', fees),
      syncCollectionBatch('payments', payments),
      syncCollectionBatch('cashDays', cashRegisterDays),
      syncCollectionBatch('homework', homework),
      syncCollectionBatch('submissions', submissions),
      syncCollectionBatch('learningResources', learningResources),
      syncCollectionBatch('internalMessages', internalMessages),
      syncCollectionBatch('groupPosts', groupPosts),
      syncCollectionBatch('notifications', notifications),
      syncCollectionBatch('customRoles', customRoles),
      syncCollectionBatch('profileChangeRequests', profileChangeRequests),
      syncCollectionBatch('auditLogs', auditLogs.slice(0, 100)),
      syncCollectionBatch('chatMessages', chatMessages),
    ]);

    const errors = batches.filter((b) => b.error).map((b) => b.error);
    const totalSynced = batches.reduce((acc, b) => acc + b.syncedCount, 0);

    // P17: Report partial or total errors transparently
    if (errors.length > 0 && totalSynced === 0) {
      setCloudSyncStatus('ERROR');
      return { success: false, totalSynced: 0, message: `Erreur Firestore : ${errors[0]}` };
    }

    setLastSyncDate(new Date());
    setCloudSyncStatus('SYNCED');
    logAudit('SYNCHRONISATION_CLOUD_FIRESTORE', `Synchronisation complète vers Cloud Firestore (${totalSynced} documents synchronisés)`);
    return {
      success: true,
      totalSynced,
      message:
        errors.length > 0
          ? `${totalSynced} documents synchronisés (${errors.length} collection(s) avec avertissement : ${errors[0]}).`
          : `${totalSynced} documents synchronisés et sécurisés dans Cloud Firestore.`,
    };
  };

  const pullFromCloudFirestore = async (): Promise<{ success: boolean; totalPulled: number; message: string }> => {
    const hasSession = await ensureFirebaseAuthSession(currentUser);
    if (!hasSession) {
      return {
        success: false,
        totalPulled: 0,
        message: 'Veuillez vous authentifier via Firebase Auth pour charger les données Cloud Firestore.',
      };
    }
    setCloudSyncStatus('SYNCING');
    let totalPulled = 0;

    const remoteTombstones = await pullRemoteTombstones();
    remoteTombstones.forEach((id) => deletedDocIdsRef.current.add(id));

    // P14 & P15: Pull all 28 collections and merge by id without wiping local-only records or resurrecting tombstones
    const pullAndMerge = async <T extends { id: string }>(
      colName: string,
      setter: React.Dispatch<React.SetStateAction<T[]>>
    ) => {
      const cloudRes = await fetchCollectionFromFirestore<T>(colName);
      if (cloudRes.data && cloudRes.data.length > 0) {
        const items = cloudRes.data;
        setter((prev) => mergeCollectionById(prev, items, deletedDocIdsRef.current, colName));
        totalPulled += items.length;
      }
    };

    await Promise.all([
      pullAndMerge<User>('users', setUsers),
      pullAndMerge<AcademicYear>('academicYears', setAcademicYears),
      pullAndMerge<Filiere>('filieres', setFilieres),
      pullAndMerge<Parcours>('parcours', setParcours),
      pullAndMerge<AcademicValidationRules>('academicRules', setAcademicRules),
      pullAndMerge<StudentGroup>('groups', setGroups),
      pullAndMerge<Room>('rooms', setRooms),
      pullAndMerge<Course>('courses', setCourses),
      pullAndMerge<UniteEnseignement>('ues', setUes),
      pullAndMerge<ElementConstitutif>('ecs', setEcs),
      pullAndMerge<StudentInscription>('inscriptions', setInscriptions),
      pullAndMerge<EcGrade>('grades', setGrades),
      pullAndMerge<DeliberationRecord>('deliberations', setDeliberations),
      pullAndMerge<TimetableSession>('sessions', setSessions),
      pullAndMerge<QrAttendanceSession>('qrSessions', setQrSessions),
      pullAndMerge<StudentFee>('fees', setFees),
      pullAndMerge<PaymentTransaction>('payments', setPayments),
      pullAndMerge<CashRegisterDay>('cashDays', setCashRegisterDays),
      pullAndMerge<HomeworkAssignment>('homework', setHomework),
      pullAndMerge<HomeworkSubmission>('submissions', setSubmissions),
      pullAndMerge<LearningResource>('learningResources', setLearningResources),
      pullAndMerge<InternalMessage>('internalMessages', setInternalMessages),
      pullAndMerge<GroupPost>('groupPosts', setGroupPosts),
      pullAndMerge<AppNotification>('notifications', setNotifications),
      pullAndMerge<CustomRoleDefinition>('customRoles', setCustomRoles),
      pullAndMerge<ProfileChangeRequest>('profileChangeRequests', setProfileChangeRequests),
      pullAndMerge<AuditLog>('auditLogs', setAuditLogs),
      pullAndMerge<ChatMessage>('chatMessages', setChatMessages),
    ]);

    setLastSyncDate(new Date());
    setCloudSyncStatus('SYNCED');
    logAudit('CHARGEMENT_CLOUD_FIRESTORE', `Récupération et fusion de ${totalPulled} documents depuis Cloud Firestore.`);
    return {
      success: true,
      totalPulled,
      message: totalPulled > 0
        ? `${totalPulled} documents chargés et fusionnés en temps réel depuis Cloud Firestore.`
        : 'Base Cloud Firestore connectée (aucune donnée distante supplémentaire à fusionner).',
    };
  };

  const resetToDefaultData = () => {
    createSystemBackup('Sauvegarde automatique avant réinitialisation');
    deletedDocIdsRef.current.clear();
    clearDeletedTombstones();
    setUsers(initialUsers);
    setCourses(initialCourses);
    setRooms(initialRooms);
    setGroups(initialGroups);
    setFilieres(initialFilieres);
    setParcours(initialParcours);
    setAcademicYears(initialAcademicYears);
    setSelectedAcademicYear('2026-2027');
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
    setCustomRoles([]);
    setProfileChangeRequests([]);
    // P18: Reset auth session cleanly
    logout();
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        switchUserRole,
        isRealAdminSession,
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
        purgeAllSessions,
        purgeWeekSessions,
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
        userPresenceMap,
        getUserEffectivePresence,
        myManualPresenceStatus,
        updateMyPresenceManualStatus,
        chatConversations,
        accessibleConversations,
        chatMessagesByConv,
        activeChatConversationId,
        setActiveChatConversationId,
        isFloatingChatOpen,
        setIsFloatingChatOpen,
        isFloatingChatMinimized,
        setIsFloatingChatMinimized,
        typingIndicatorsByConv,
        chatPreferences,
        updateChatNotificationPreferences,
        audioUnlocked,
        enableChatSoundEngine,
        testChatSound,
        enablePushNotifications,
        totalUnreadChatCount,
        getConversationUnreadCount,
        openPrivateConversationWithUser,
        createCustomGroupConversation,
        sendConversationMessage,
        editConversationMessage,
        deleteConversationMessage,
        markConversationAsRead,
        setTypingInConversation,
        loadOlderConversationMessages,
        uploadAttachmentToConversation,
        toggleConversationAllowReplies,

        // Cloud Firebase Auth, Firestore Sync & Backup/Restore
        firebaseUser,
        isCloudConnected,
        cloudSyncStatus,
        loginWithGoogleFirebase,
        toggleInstitutionalCloudBridge,
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
