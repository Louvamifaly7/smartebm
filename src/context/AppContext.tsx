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
} from '../data/mockData';
import { detectSessionConflicts } from '../utils/conflictDetector';

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

  seedBatchDemoData: () => void;

  // Stats calculation
  getCourseHourlyStats: (courseId: string) => CourseHourlyStats;
  getTeacherHourlyStats: (teacherId: string) => TeacherHourlyStats;

  // Academic Years & Maquettes LMD
  academicYears: AcademicYear[];
  selectedAcademicYear: string;
  setSelectedAcademicYear: (year: string) => void;
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
  inscribeStudent: (studentId: string, academicYear: string, filiereId: string, level: string, groupId: string) => void;

  // Grades / Évaluations LMD
  grades: EcGrade[];
  saveGrade: (studentId: string, ecId: string, quizScore?: number, examScore?: number, isDraft?: boolean, comment?: string) => void;
  publishGrades: (ecId: string) => void;
  calculateEcFinalScore: (quizScore?: number, examScore?: number) => number | undefined;
  getStudentEcGrade: (studentId: string, ecId: string) => EcGrade | undefined;
  getStudentUeSummary: (studentId: string, ueId: string) => { average: number; isPassed: boolean; totalCredits: number; validatedCredits: number; ecDetails: { ec: ElementConstitutif; grade?: EcGrade; isPassed: boolean }[] };

  // QR Code Attendance
  qrSessions: QrAttendanceSession[];
  activeQrSession: QrAttendanceSession | null;
  generateQrSession: (sessionId: string, courseTitle: string, ecCode: string, roomName: string, teacherId: string, groupId: string, validityMinutes?: number) => QrAttendanceSession;
  stopQrSession: (qrSessionId: string) => void;
  scanQrAttendance: (codeToken: string, studentId: string) => { success: boolean; message: string; record?: AttendanceRecord };
  updateAttendanceStatus: (qrSessionId: string, studentId: string, status: 'PRESENT' | 'ABSENT' | 'LATE' | 'JUSTIFIED', reason?: string) => void;

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
  recordPayment: (data: { studentId: string; feeId: string; amountPaidAr: number; paymentMethod: PaymentMethod; referenceNumber?: string; notes?: string }) => { success: boolean; transaction?: PaymentTransaction; receiptNumber?: string; error?: string };
  cancelPayment: (paymentId: string, reason: string) => void;
  closeCashRegisterDay: (date: string, actualClosingAr: number, closureNotes?: string) => { success: boolean; discrepancyAr: number; message: string };
  getStudentFinancialSummary: (studentId: string) => { totalFeesAr: number; totalPaidAr: number; balanceDueAr: number; feeDetails: { fee: StudentFee; paidAr: number; remainingAr: number; status: 'PAID' | 'PARTIAL' | 'UNPAID' }[] };

  // Homework & Learning Resources
  homework: HomeworkAssignment[];
  submissions: HomeworkSubmission[];
  learningResources: LearningResource[];
  createHomework: (data: Omit<HomeworkAssignment, 'id' | 'publishedAt'>) => void;
  submitHomework: (homeworkId: string, fileName: string, fileSize: string, studentComment?: string) => { success: boolean; submission?: HomeworkSubmission };
  gradeSubmission: (submissionId: string, grade: number, feedback: string) => void;
  addLearningResource: (data: Omit<LearningResource, 'id' | 'publishedAt'>) => void;
  deleteLearningResource: (id: string) => void;

  // Selective student export
  getSelectiveStudentExportData: (role: 'TEACHER' | 'ADMIN', groupId?: string) => { headers: string[]; rows: string[][] };

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
  SESSIONS: 'ebm_sessions_v3',
  NOTIFICATIONS: 'ebm_notifications_v3',
  AUDIT_LOGS: 'ebm_audit_logs_v3',
  CURRENT_USER_ID: 'ebm_current_user_id_v3',
  ACADEMIC_YEARS: 'ebm_academic_years_v3',
  SELECTED_YEAR: 'ebm_selected_year_v3',
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
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load from localStorage or mockData
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.USERS);
    return saved ? JSON.parse(saved) : initialUsers;
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
    return saved ? JSON.parse(saved) : initialFilieres;
  });

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

  // Complementary LMD states
  const [academicYears] = useState<AcademicYear[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ACADEMIC_YEARS);
    return saved ? JSON.parse(saved) : initialAcademicYears;
  });

  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.SELECTED_YEAR) || '2026-2027';
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
    return saved ? JSON.parse(saved) : initialGrades;
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
    return saved ? JSON.parse(saved) : initialFees;
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

  const currentUser = users.find((u) => u.id === currentUserId) || users[0];

  const setCurrentUser = (user: User) => {
    setCurrentUserId(user.id);
  };

  const login = (identifier: string, _password?: string) => {
    const cleanId = identifier.trim().toLowerCase();
    const found = users.find(
      (u) =>
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

    return { success: true };
  };

  const logout = () => {
    logAudit('DECONNEXION', `Déconnexion de ${currentUser?.name || 'utilisateur'}`);
    setIsAuthenticated(false);
    localStorage.removeItem('ebm_auth_logged_in');
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

    const newSession: TimetableSession = {
      ...data,
      id: `sess-${Date.now()}`,
      history: [
        {
          id: `h-${Date.now()}`,
          timestamp: new Date().toISOString(),
          authorName: currentUser.name,
          action: 'CREATION',
          details: `Création de séance pour le cours ${data.courseId}`,
        },
      ],
    };

    setSessions((prev) => [...prev, newSession]);

    const course = courses.find((c) => c.id === data.courseId);
    logAudit('CREATION_SEANCE', `Ajout séance "${course?.title || data.courseId}" le ${data.date} ${data.startTime}-${data.endTime}`);

    // Notify affected teacher
    triggerNotification({
      recipientId: data.teacherId,
      recipientRole: 'TEACHER',
      title: '📅 Nouvelle séance ajoutée',
      message: `Une séance de ${course?.title} vous a été attribuée le ${data.date} de ${data.startTime} à ${data.endTime}.`,
      type: 'INFO',
      sessionId: newSession.id,
    });

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
      email: userData.email || `${identifier}@ebm-institute.edu`,
      phone: userData.phone || '',
      role: userData.role || 'STUDENT',
      groupId: userData.groupId,
      subGroupId: userData.subGroupId,
      birthDate: userData.birthDate || '2005-01-01',
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
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...updates } : u)));
    logAudit('MODIFICATION_UTILISATEUR', `Mise à jour du profil utilisateur ${id}`);
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
        return {
          ...u,
          mustChangePassword: true, // RG-03: force change
        };
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
      email: studentData.email || `${studentData.matricule.toLowerCase()}@etudiant.ebm.edu`,
      phone: studentData.phone || '',
      role: 'STUDENT',
      groupId: studentData.groupId || 'grp-l1-info-a',
      subGroupId: studentData.subGroupId,
      birthDate: studentData.birthDate || '2005-01-01',
      mustChangePassword: true, // RG-03: Mandatory first change!
      isActive: true,
      googleCalendarLinked: false,
    };

    setUsers((prev) => [...prev, newStudent]);
    logAudit('CREATION_ETUDIANT', `Création individuelle étudiant ${newStudent.name} (${newStudent.matricule})`);
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
      username: 'claire.dubois',
      name: 'Dr. Claire Dubois',
      email: 'claire.dubois@ebm-institute.edu',
      phone: '+33 6 45 67 89 01',
      role: 'TEACHER',
      isActive: true,
      subjects: ['Sécurité Offensive', 'Cryptographie Appliquée', 'Audit Forensics'],
      weeklyMaxHours: 18,
      googleCalendarLinked: true,
      googleEmail: 'claire.dubois.sec@gmail.com',
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

    logAudit('GENERATION_DONNEES_DEMO', 'Génération automatique d’un module complet : Salle Labo Cyber + Enseignant Dr. Claire Dubois + Groupe M2 Cyber + Cours.');
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

  const inscribeStudent = (studentId: string, academicYear: string, filiereId: string, level: string, groupId: string) => {
    const newInscription: StudentInscription = {
      id: `insc-${studentId}-${academicYear}-${Date.now()}`,
      studentId,
      academicYear,
      filiereId,
      level,
      groupId,
      inscriptionDate: new Date().toISOString().split('T')[0],
      status: 'CONFIRMED',
    };
    setInscriptions((prev) => {
      const filtered = prev.filter((i) => !(i.studentId === studentId && i.academicYear === academicYear));
      return [...filtered, newInscription];
    });
    logAudit('INSCRIPTION_ETUDIANT', `Inscription de l’étudiant ${studentId} pour l’année ${academicYear} (Groupe: ${groupId})`);
  };

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

  const saveGrade = (studentId: string, ecId: string, quizScore?: number, examScore?: number, isDraft: boolean = true, comment?: string) => {
    const finalScore = calculateEcFinalScore(quizScore, examScore, ecId);
    const existingIndex = grades.findIndex((g) => g.studentId === studentId && g.ecId === ecId);

    const updatedGrade: EcGrade = {
      id: existingIndex >= 0 ? grades[existingIndex].id : `grd-${studentId}-${ecId}-${Date.now()}`,
      studentId,
      ecId,
      academicYear: selectedAcademicYear,
      semester: 'S1',
      quizScore,
      examScore,
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

    logAudit('SAISIE_NOTE_LMD', `Saisie de note EC ${ecId} pour étudiant ${studentId} (Quiz: ${quizScore ?? '-'}, Examen: ${examScore ?? '-'}, Final: ${finalScore ?? '-'})`);
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
      return { success: false, message: 'Code QR ou OTP invalide, ou la session a expiré.' };
    }

    if (new Date(targetSession.expiresAt).getTime() < Date.now()) {
      return { success: false, message: 'Cette session de pointage a expiré.' };
    }

    const alreadyRecorded = targetSession.records.some((r) => r.studentId === studentId);
    if (alreadyRecorded) {
      return { success: false, message: 'Votre présence a déjà été enregistrée pour cette séance !' };
    }

    const student = users.find((u) => u.id === studentId);
    const newRecord: AttendanceRecord = {
      id: `rec-${Date.now()}`,
      studentId,
      studentName: student?.name || 'Étudiant',
      matricule: student?.matricule || 'N/A',
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

    logAudit('POINTAGE_QR_REUSSI', `Présence validée par QR/OTP pour ${student?.name} (${student?.matricule}) sur ${targetSession.courseTitle}`);
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
          // If closed, return as is (strict lock)
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
          openingBalanceAr: 500000, // 500 000 Ar ouverture standard
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
    setPayments((prev) =>
      prev.map((p) => (p.id === paymentId ? { ...p, isCancelled: true, notes: `${p.notes || ''} [ANNULÉ: ${reason}]` } : p))
    );
    logAudit('ANNULATION_PAIEMENT', `Annulation du reçu de paiement ${paymentId}. Motif : ${reason}`);
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
    const applicableFees = fees.filter(
      (f) =>
        f.academicYear === selectedAcademicYear &&
        (f.studentId === studentId || (student?.groupId && f.groupId === student?.groupId) || (!f.studentId && !f.groupId))
    );

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

  const submitHomework = (homeworkId: string, fileName: string, fileSize: string, studentComment?: string) => {
    const hw = homework.find((h) => h.id === homeworkId);
    if (!hw) return { success: false };

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
      studentComment,
      isGraded: false,
    };

    setSubmissions((prev) => {
      const filtered = prev.filter((s) => !(s.homeworkId === homeworkId && s.studentId === currentUser.id));
      return [newSub, ...filtered];
    });

    logAudit('DEPOT_DEVOIR', `Dépôt du devoir "${hw.title}" par ${currentUser.name} (Fichier: ${fileName}, En retard: ${isLate ? 'Oui' : 'Non'})`);
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
    const newRes: LearningResource = {
      ...data,
      id: `res-${Date.now()}`,
      publishedAt: new Date().toISOString(),
    };
    setLearningResources((prev) => [newRes, ...prev]);
    logAudit('AJOUT_RESSOURCE', `Support pédagogique ajouté : "${data.title}" (${data.category})`);
  };

  const deleteLearningResource = (id: string) => {
    setLearningResources((prev) => prev.filter((r) => r.id !== id));
    logAudit('SUPPRESSION_RESSOURCE', `Support pédagogique supprimé ${id}`);
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

  const resetToDefaultData = () => {
    setUsers(initialUsers);
    setCourses(initialCourses);
    setRooms(initialRooms);
    setGroups(initialGroups);
    setFilieres(initialFilieres);
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
    localStorage.clear();
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
        seedBatchDemoData,
        getCourseHourlyStats,
        getTeacherHourlyStats,

        // Complementary LMD Exports
        academicYears,
        selectedAcademicYear,
        setSelectedAcademicYear,
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
        qrSessions,
        activeQrSession,
        generateQrSession,
        stopQrSession,
        scanQrAttendance,
        updateAttendanceStatus,
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
        getSelectiveStudentExportData,

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
