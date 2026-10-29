export type UserRole = 
  | 'ADMIN'             // Administrateur général
  | 'SCHEDULER'         // Responsable des emplois du temps
  | 'ACADEMIC_HEAD'     // Responsable pédagogique ou administratif
  | 'TEACHER'           // Enseignant
  | 'STUDENT';          // Étudiant

export type SessionStatus = 
  | 'DRAFT'             // Brouillon
  | 'PENDING_APPROVAL'  // En attente de validation
  | 'PUBLISHED'         // Publié
  | 'MODIFIED'          // Modifié
  | 'CANCELLED'         // Annulé
  | 'RESCHEDULED'       // Reporté
  | 'COMPLETED_VALIDATED'; // Réalisé et validé

export interface User {
  id: string;
  matricule?: string;      // RG-02: login for students (e.g. EBM-2026-0042)
  username: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  groupId?: string;        // For students
  subGroupId?: string;     // For students (sub-group)
  birthDate?: string;      // For students: temporary password default (YYYY-MM-DD)
  passwordHash?: string;
  mustChangePassword?: boolean; // RG-03: Mandatory first login password change
  isActive: boolean;       // RG-22: deactivated account is blocked on web & android
  avatarUrl?: string;
  googleCalendarLinked?: boolean; // RG-17: Optional Google Calendar link
  googleEmail?: string;
  subjects?: string[];     // For teachers: taught subjects
  weeklyMaxHours?: number; // For teachers: contract quota
}

export interface Filiere {
  id: string;
  code: string;
  name: string;
  department: string;
}

export interface StudentGroup {
  id: string;
  code: string;           // e.g. L1-INFO-A
  name: string;
  filiereId: string;
  level: string;          // L1, L2, L3, M1, M2
  academicYear: string;   // e.g. 2026-2027
  studentCount: number;
  subGroups: { id: string; code: string; name: string; studentCount: number }[];
}

export interface Room {
  id: string;
  code: string;           // e.g. A101
  name: string;           // e.g. Amphi Turing
  building: string;
  floor: string;
  capacity: number;
  equipment: string[];    // e.g. 'Vidéoprojecteur 4K', 'Postes informatiques (30)', 'Micro HF', 'Caméra visio'
  status: 'available' | 'maintenance' | 'occupied';
  colorCode: string;
}

export interface Course {
  id: string;
  code: string;           // e.g. INF-101
  title: string;          // e.g. Algorithmique & Structures de Données
  filiereId: string;
  level: string;
  academicYear: string;
  groupIds: string[];     // Can be shared among multiple groups (RG-10)
  teacherIds: string[];
  totalHours: number;     // e.g. 30h (RG-08)
  defaultSessionDuration: number; // e.g. 2h or 3h
  color: string;
  description?: string;
}

export interface TimetableSession {
  id: string;
  courseId: string;
  teacherId: string;
  groupIds: string[];     // Groups assigned to this session
  subGroupId?: string;    // Optional specific subgroup (TP/TD)
  roomId: string;
  date: string;           // YYYY-MM-DD
  startTime: string;      // HH:mm (e.g. 08:30)
  endTime: string;        // HH:mm (e.g. 10:30)
  durationHours: number;  // e.g. 2.0
  status: SessionStatus;
  notes?: string;
  cancellationReason?: string;
  cancellationDate?: string;
  rescheduledFrom?: {
    originalDate: string;
    originalStartTime: string;
    originalEndTime: string;
    originalRoomId: string;
  };
  validatedAt?: string;
  validatedBy?: string;
  history: SessionHistoryItem[];
}

export interface SessionHistoryItem {
  id: string;
  timestamp: string;
  authorName: string;
  action: string;         // 'CREATION', 'MODIFICATION', 'REPORT', 'ANNULATION', 'VALIDATION'
  details: string;
  reason?: string;
}

export interface AppNotification {
  id: string;
  recipientId: string;
  recipientRole?: UserRole;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'CANCEL' | 'RESCHEDULE' | 'CHANGE' | 'SUCCESS';
  sessionId?: string;
  createdAt: string;
  isReadWeb: boolean;
  isReadAndroid: boolean;
  pushStatus: 'SENT' | 'DELIVERED' | 'FAILED' | 'RETRY';
}

export interface ConflictResult {
  hasConflict: boolean;
  conflicts: {
    type: 'ROOM' | 'TEACHER' | 'GROUP' | 'CAPACITY';
    message: string;
    conflictingSession?: TimetableSession;
  }[];
  suggestions?: {
    date: string;
    startTime: string;
    endTime: string;
    roomId: string;
    roomName: string;
  }[];
}

export interface ImportStudentRow {
  matricule: string;
  nom: string;
  prenom: string;
  dateNaissance: string;  // JJ/MM/AAAA or AAAA-MM-JJ
  email: string;
  filiere: string;
  niveau: string;
  groupe: string;
}

export interface ImportResult {
  totalRows: number;
  successCount: number;
  duplicateCount: number;
  errorCount: number;
  createdStudents: User[];
  errors: { row: number; matricule: string; reason: string }[];
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  details: string;
  platform: 'WEB' | 'ANDROID';
}

// ==========================================
// CAHIER DES CHARGES COMPLÉMENTAIRE v3.0 LMD
// ==========================================

export type SemesterCode = 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6';

export interface AcademicYear {
  id: string;
  code: string;            // e.g. "2026-2027"
  name: string;            // e.g. "Année Universitaire 2026-2027"
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  status: 'OPEN' | 'CLOSED' | 'ARCHIVED';
  semesters: {
    code: SemesterCode;
    name: string;
    startDate: string;
    endDate: string;
    isActive: boolean;
  }[];
}

export type MaquetteStatus = 'DRAFT' | 'IN_REVIEW' | 'VALIDATED' | 'PUBLISHED' | 'ARCHIVED';

export interface UniteEnseignement {
  id: string;
  code: string;            // e.g. "UE-INFO-101"
  title: string;           // e.g. "Algorithmique & Fondements Numériques"
  filiereId: string;
  level: string;           // L1, L2, L3, M1, M2
  semester: SemesterCode;  // S1 ou S2
  creditsEcts: number;     // e.g. 6 crédits
  academicYear: string;    // e.g. "2026-2027"
  ecIds: string[];         // Éléments Constitutifs rattachés
  validationThreshold: number; // e.g. 10.0 / 20
  status: 'ACTIVE' | 'ARCHIVED';
}

export interface ElementConstitutif {
  id: string;
  ueId: string;            // UE de rattachement
  code: string;            // e.g. "EC-ALGO"
  title: string;           // e.g. "Algorithmique Avancée & C++"
  semester: SemesterCode;
  creditsEcts: number;     // e.g. 3 crédits
  hourlyVolume: number;    // e.g. 30h
  teacherIds: string[];    // Enseignants responsables
  groupIds: string[];      // Groupes concernés
  quizWeight: number;      // 0.40 (40%)
  examWeight: number;      // 0.60 (60%)
  status: 'ACTIVE' | 'ARCHIVED';
}

export interface StudentInscription {
  id: string;
  studentId: string;
  academicYear: string;    // e.g. "2026-2027"
  filiereId: string;
  level: string;
  groupId: string;
  inscriptionDate: string;
  status: 'CONFIRMED' | 'PENDING' | 'SUSPENDED';
}

export interface EcGrade {
  id: string;
  studentId: string;
  ecId: string;
  academicYear: string;
  semester: SemesterCode;
  quizScore?: number;      // Note sur 20 (40%)
  examScore?: number;      // Note sur 20 (60%)
  finalScore?: number;     // (quiz * 0.4) + (exam * 0.6)
  isPublished: boolean;
  isDraft: boolean;
  lastModifiedBy?: string;
  lastModifiedAt?: string;
  comment?: string;
}

export interface QrAttendanceSession {
  id: string;
  sessionId: string;       // Séance liée
  courseTitle: string;
  ecCode: string;
  roomName: string;
  teacherId: string;
  groupId: string;
  codeToken: string;       // Code secret ou OTP dynamique
  generatedAt: string;
  expiresAt: string;       // Expiration automatique
  isActive: boolean;
  records: AttendanceRecord[];
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  matricule: string;
  scannedAt: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'JUSTIFIED';
  justificationReason?: string;
  correctedBy?: string;
  correctedAt?: string;
}

export interface InternalMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  recipientId?: string;    // Utilisateur précis
  recipientGroupId?: string; // Ou groupe d'étudiants
  subject: string;
  content: string;
  timestamp: string;
  isRead: boolean;
  attachments?: { name: string; url: string; size: string }[];
}

export interface GroupPost {
  id: string;
  groupId: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  title: string;
  content: string;
  category: 'ANNOUNCEMENT' | 'EXAM' | 'HOMEWORK' | 'SCHEDULE' | 'ADMIN';
  isPinned: boolean;
  createdAt: string;
  attachments?: { name: string; url: string }[];
  commentsCount: number;
}

export type PaymentMethod = 'ESPECES' | 'MOBILE_MONEY' | 'DEPOT_BANCAIRE' | 'VIREMENT_BANCAIRE';

export interface StudentFee {
  id: string;
  studentId?: string;      // Frais individuel si présent, ou frais collectif si null
  groupId?: string;        // Pour un groupe entier
  academicYear: string;
  title: string;           // e.g. "Droits d'inscription annuels", "Écolage Semestre 1"
  amountAr: number;        // Montant en Ariary (Ar)
  dueDate: string;
  category: 'INSCRIPTION' | 'ECOLAGE' | 'EXAMEN' | 'INDIVIDUEL';
}

export interface PaymentTransaction {
  id: string;
  receiptNumber: string;   // e.g. "REC-EBM-2026-0042"
  studentId: string;
  feeId: string;
  amountPaidAr: number;    // Montant payé en Ariary
  remainingBalanceAr: number; // Solde restant
  paymentMethod: PaymentMethod;
  referenceNumber?: string; // ex: Réf transaction MVola / Chèque
  paymentDate: string;
  recordedBy: string;      // Utilisateur ayant encaissé
  notes?: string;
  isCancelled?: boolean;
}

export interface CashRegisterDay {
  id: string;
  date: string;            // YYYY-MM-DD
  openingBalanceAr: number; // Solde d'ouverture
  cashCollectedAr: number; // Espèces
  mobileMoneyCollectedAr: number; // Mobile Money
  bankCollectedAr: number; // Banque / Virement
  totalCollectedAr: number;
  refundsAr: number;
  theoreticalClosingAr: number;
  actualClosingAr?: number;
  discrepancyAr?: number;  // Écart
  isClosed: boolean;
  closedBy?: string;
  closedAt?: string;
  closureNotes?: string;
}

export interface HomeworkAssignment {
  id: string;
  ecId: string;
  groupId: string;
  teacherId: string;
  title: string;
  instructions: string;
  publishedAt: string;
  dueDate: string;         // Date & heure limite
  allowLateSubmission: boolean;
  maxScore: number;        // ex: 20
  attachments?: { name: string; url: string }[];
}

export interface HomeworkSubmission {
  id: string;
  homeworkId: string;
  studentId: string;
  studentName: string;
  submittedAt: string;
  isLate: boolean;
  fileName: string;
  fileSize: string;
  studentComment?: string;
  grade?: number;          // Note attribuée
  teacherFeedback?: string;
  isGraded: boolean;
}

export interface LearningResource {
  id: string;
  ecId: string;
  groupId?: string;
  teacherId: string;
  title: string;
  description?: string;
  category: 'PDF' | 'SLIDES' | 'VIDEO' | 'CODE' | 'LINK';
  fileUrl: string;
  fileName: string;
  fileSize?: string;
  publishedAt: string;
}

export interface AppSettings {
  menuLayout: 'vertical' | 'horizontal'; // Sidebar vertical (OpenEduCat) ou Topbar horizontal
  visibleMenuItems: string[];            // Identifiants des onglets visibles dans le menu
  compactMode: boolean;
  showLiveChat: boolean;
  theme: 'light' | 'dark' | 'system';
  primaryColor: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  recipientId: string;
  text: string;
  timestamp: string;
  isRead: boolean;
}
