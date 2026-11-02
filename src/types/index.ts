export type UserRole = 
  | 'ADMIN'             // Administrateur général
  | 'ADMIN_STAFF'       // Personnel administratif
  | 'SCOLARITE'         // Service Scolarité & Planification
  | 'SCHEDULER'         // Responsable des emplois du temps (alias Scolarité)
  | 'FINANCE'           // Service Financier, Comptabilité & Caisse
  | 'ACADEMIC_HEAD'     // Responsable pédagogique / Chef de mention
  | 'TEACHER'           // Enseignant
  | 'STUDENT'           // Étudiant
  | 'PARENT';           // Parent / Tuteur légal

export type RbacOperation =
  | 'CONSULTATION'
  | 'CREATION'
  | 'MODIFICATION'
  | 'SUPPRESSION'
  | 'VALIDATION'
  | 'TELECHARGEMENT'
  | 'EXPORTATION';

export interface UserCustomPermissions {
  allowedTabs?: string[];
  deniedTabs?: string[];
  allowedOperations?: RbacOperation[];
  deniedOperations?: RbacOperation[];
  canAccessSensitiveData?: boolean;
  restrictedFiliereIds?: string[];
  restrictedParcoursIds?: string[];
  restrictedDepartments?: string[];
}

export interface CustomRoleDefinition {
  id: string;
  code: string;
  label: string;
  name?: string;
  baseRole: UserRole;
  description: string;
  allowedTabs: string[];
  allowedOperations: RbacOperation[];
  canAccessSensitiveData: boolean;
  createdAt: string;
}

export interface ParentContact {
  id: string;
  nom: string;
  prenoms: string;
  phone: string;
  email: string;
  relation: 'PERE' | 'MERE' | 'TUTEUR' | 'AUTRE';
  profession?: string;
  address?: string;
}

export type ParentContactEntry = ParentContact;

export interface UserModificationLog {
  id: string;
  timestamp: string;
  authorId: string;
  authorName: string;
  field: string;
  oldValue: string;
  newValue: string;
}

export interface ProfileChangeRequest {
  id: string;
  studentId: string;
  studentUid?: string;
  studentName: string;
  matricule: string;
  requestedAt: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  changes: {
    field: 'name' | 'lastName' | 'firstName' | 'birthDate' | 'birthPlace';
    label: string;
    oldValue: string;
    newValue: string;
  }[];
  reason: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewComment?: string;
}

export type SessionStatus = 
  | 'DRAFT'             // Brouillon
  | 'PENDING_APPROVAL'  // En attente de validation
  | 'PUBLISHED'         // Publié
  | 'MODIFIED'          // Modifié
  | 'CANCELLED'         // Annulé
  | 'RESCHEDULED'       // Reporté
  | 'COMPLETED_VALIDATED'; // Réalisé et validé

export interface TeacherAvailabilitySlot {
  day:
    | 'Lundi'
    | 'Mardi'
    | 'Mercredi'
    | 'Jeudi'
    | 'Vendredi'
    | 'Samedi'
    | 'LUNDI'
    | 'MARDI'
    | 'MERCREDI'
    | 'JEUDI'
    | 'VENDREDI'
    | 'SAMEDI';
  slot:
    | 'MATIN'
    | 'APRES_MIDI'
    | '07H_09H'
    | '09H_11H'
    | '11H_13H'
    | '13H_15H'
    | '15H_17H'
    | string;
  startTime?: string;
  endTime?: string;
  available: boolean;
  note?: string;
}

export interface User {
  id: string;
  uid?: string;            // Firebase Auth UID when linked
  matricule?: string;      // RG-02: login for students (e.g. EBM-2026-0042)
  username: string;
  name: string;
  civilite?: 'M.' | 'Mme' | 'Mlle' | 'Dr.' | 'Prof.';
  lastName?: string;
  firstName?: string;
  email: string;
  phone?: string;
  phones?: string[];       // Plusieurs numéros de téléphone (Section 9)
  role: UserRole;
  customRoleId?: string;   // Rôle personnalisé dynamique (Section 6)
  groupId?: string;        // For students
  subGroupId?: string;     // For students (sub-group)
  parcoursId?: string;     // Spécialisation / Parcours LMD
  birthDate?: string;      // For students: temporary password default (YYYY-MM-DD)
  birthPlace?: string;     // Lieu de naissance
  address?: string;        // Adresse complète
  postalCode?: string;     // Code postal
  city?: string;           // Ville
  originSchool?: string;   // Établissement d'origine
  bacSeries?: string;      // Série du baccalauréat (ex: Série C, D, S, OSE, Technique)
  linkedInUrl?: string;    // Lien profil LinkedIn
  parentContacts?: ParentContact[]; // Plusieurs parents ou tuteurs (Section 9)
  isAdult?: boolean;       // Étudiant majeur (Section 12.6)
  parentAccessConsent?: {
    academic: boolean;
    attendance: boolean;
    financial: boolean;
    administrative?: boolean;
  };
  // Identification transversale Code-Barres / QR Code (Section 11)
  cardToken?: string;      // Identifiant unique sécurisé encodé dans le QR/Code-barres (ex: EBM-CARD-0042-V1)
  cardIssueNumber?: number; // Numéro d'édition de la carte (1, 2...)
  cardIssuedAt?: string;
  revokedCardTokens?: string[]; // Anciens tokens désactivés en cas de perte
  // Champs Annuaire élargi (Section 7)
  department?: string;
  service?: string;
  jobTitle?: string;
  officeLocation?: string;
  // Champs Parent / Tuteur (Section 12)
  linkedStudentIds?: string[]; // Plusieurs enfants rattachés au même parent
  parentRelation?: string;
  parentVerificationStatus?: 'VERIFIED' | 'PENDING' | 'SUSPENDED' | 'REVOKED';
  // Autorisations RBAC individuelles & Historique (Section 6 & 9 & 10)
  customPermissions?: UserCustomPermissions;
  modificationHistory?: UserModificationLog[];
  passwordHash?: string;
  mustChangePassword?: boolean; // RG-03: Mandatory first login password change
  isActive: boolean;       // RG-22: deactivated account is blocked on web & android
  avatarUrl?: string;
  photoUrl?: string;
  avatar?: string;
  googleCalendarLinked?: boolean; // RG-17: Optional Google Calendar link
  googleEmail?: string;
  subjects?: string[];     // For teachers: taught subjects
  weeklyMaxHours?: number; // For teachers: contract quota
  hourlyRateAr?: number;   // For teachers: taux horaire en Ariary (Ar/h) pour la paie et comptabilité
  contractType?: 'PERMANENT' | 'VACATAIRE' | 'MISSIONNAIRE';
  availabilities?: TeacherAvailabilitySlot[]; // Disponibilités hebdomadaires pour l'emploi du temps (07h-17h)
  specialty?: string;
  academicRank?: string;   // Grade universitaire (Professeur Titulaire, Maître de Conférences, Docteur / HDR, Chargé de cours, Assistant)
  highestDiploma?: string; // Diplôme le plus élevé (Doctorat / PhD, Master Recherche, Ingénieur...)
  almaMater?: string;      // Université / Établissement d'origine du diplôme
  secondaryPhone?: string; // Téléphone secondaire / WhatsApp
  orcidUrl?: string;       // Lien ORCID / Google Scholar / ResearchGate
  hireDate?: string;       // Date de prise de fonction à EBM Institute
  emergencyContact?: string; // Contact d'urgence (Nom & Téléphone)
  cin?: string;
  bankRib?: string;
  cvFileName?: string;     // Nom du fichier CV téléversé (ex: CV_Prof_Rakotoarisoa.pdf)
  cvFileUrl?: string;      // URL / DataURL du CV téléversé
  cvUploadedAt?: string;   // Date de mise à jour du CV
  updatedAt?: string;      // Horodatage ISO pour la synchronisation temps réel Cloud
}

export interface Filiere {
  id: string;
  code: string;
  name: string;
  department: string;
  domaine?: string;        // Domaine LMD (ex: Sciences et Technologies, Sciences de Gestion)
  etablissement?: string;  // Établissement (ex: EBM Institute)
}

export interface Parcours {
  id: string;
  code: string;           // e.g. PARC-GL, PARC-FIN, PARC-MKT
  name: string;           // e.g. Génie Logiciel & Cloud, Finance d'Entreprise & Audit
  filiereId: string;
  level: string;          // L1, L2, L3, M1, M2
  description?: string;
  status: 'ACTIVE' | 'ARCHIVED';
}

export interface AcademicValidationRules {
  id: string;
  academicYear: string;   // e.g. "2026-2027"
  ecPassingScore: number; // default 10.0 / 20
  uePassingScore: number; // default 10.0 / 20
  eliminatoryScore: number; // default 6.0 / 20
  allowIntraUeCompensation: boolean; // Compensation entre EC d'une même UE
  allowInterUeCompensation: boolean; // Compensation générale entre UE d'un semestre
  creditsForDirectPass: number; // ex: 60 ECTS pour Admis direct
  minCreditsForConditionalPass: number; // ex: 45 ECTS pour Passage conditionnel (dette d'UE)
  defaultQuizWeight: number; // ex: 0.40
  defaultExamWeight: number; // ex: 0.60
  blockTranscriptIfUnpaid: boolean; // Contrôle du quitus financier
  updatedAt?: string;
  updatedBy?: string;
}

export type DeliberationDecision =
  | 'ADMIS'
  | 'ADMIS_COMPENSATION'
  | 'PASSAGE_CONDITIONNEL'
  | 'AJOURNE'
  | 'EN_ATTENTE';

export interface DeliberationRecord {
  id: string;
  academicYear: string;
  semester: SemesterCode | 'ANNUEL';
  groupId: string;
  studentId: string;
  studentUid?: string;
  rawAverage: number;
  juryBonusPoints: number;
  finalAverage: number;
  totalCreditsAttempted: number;
  validatedCredits: number;
  hasEliminatoryGrade: boolean;
  attendanceRate: number;
  financialClearance: boolean;
  decision: DeliberationDecision;
  juryObservation?: string;
  isLocked: boolean;
  deliberatedBy?: string;
  deliberatedAt?: string;
}

export interface SystemBackupSnapshot {
  id: string;
  version: string;
  createdAt: string;
  createdBy: string;
  label: string;
  checksum: string;
  recordCount: number;
  payload: Record<string, unknown>;
}

export interface StudentGroup {
  id: string;
  code: string;           // e.g. L1-INFO-A
  name: string;
  filiereId: string;
  parcoursId?: string;
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
  defectiveEquipment?: string[]; // Équipements signalés défectueux / hors service
  status: 'available' | 'maintenance' | 'occupied' | 'unavailable';
  maintenanceReason?: string;
  maintenanceStartDate?: string; // Date de début de maintenance (YYYY-MM-DD)
  maintenanceEndDate?: string;   // Date de fin de maintenance (YYYY-MM-DD)
  blockedUntil?: string;
  colorCode: string;
  updatedAt?: string;
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

export type SessionActivityType = 'COURSE' | 'CONFERENCE' | 'SEMINAIRE' | 'SOUTENANCE' | 'EXAMEN' | 'AUTRE_EVENEMENT';

export interface TimetableSession {
  id: string;
  courseId: string;
  teacherId: string;
  sessionType?: SessionActivityType; // 'COURSE' par défaut, ou conférence / événement personnalisé
  eventTitle?: string;               // Titre personnalisé (Conférence, Séminaire, Soutenance, etc.)
  eventSpeaker?: string;             // Conférencier / Intervenant externe / Responsable
  eventCategoryLabel?: string;       // Libellé personnalisé si 'AUTRE_EVENEMENT'
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
  updatedAt?: string;
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
    type: 'TIME' | 'ROOM' | 'TEACHER' | 'GROUP' | 'CAPACITY' | 'AVAILABILITY' | 'QUOTA' | 'HOLIDAY';
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

export type SemesterCode = 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6' | 'S7' | 'S8' | 'S9' | 'S10' | string;

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
  parcoursId?: string;
  level: string;           // L1, L2, L3, M1, M2
  semester: SemesterCode;  // S1 ou S2
  creditsEcts: number;     // e.g. 6 crédits
  coefficient?: number;    // Coefficient pondérateur de l'UE
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
  coefficient?: number;    // Coefficient de l'EC dans l'UE
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
  studentUid?: string;
  academicYear: string;    // e.g. "2026-2027"
  filiereId: string;
  parcoursId?: string;
  level: string;
  groupId: string;
  inscriptionType?: 'INSCRIPTION' | 'REINSCRIPTION';
  academicStatus?: 'NOUVEAU' | 'PASSANT' | 'PASSAGE_CONDITIONNEL' | 'REDOUBLANT' | 'DIPLOME';
  dossierComplete?: boolean;
  documents?: {
    cinOrBirthCert: boolean;
    baccOriginal: boolean;
    photosId: boolean;
    medicalCert: boolean;
    financialClearance: boolean;
  };
  inscriptionDate: string;
  status: 'CONFIRMED' | 'PENDING' | 'SUSPENDED';
}

export interface EcGrade {
  id: string;
  studentId: string;
  studentUid?: string;
  ecId: string;
  academicYear: string;
  semester: SemesterCode;
  quizScore?: number;      // Note sur 20 (40%)
  examScore?: number;      // Note sur 20 (60%)
  session1Score?: number;  // Note de 1ère session avant rattrapage
  rattrapageScore?: number; // Note de 2ème session (Rattrapage) sur 20
  finalScore?: number;     // Note finale retenue (max(session1, rattrapage) ou (quiz * 0.4) + (exam * 0.6))
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
  createdAt?: string;
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
  studentUid?: string;
  feeId: string;
  amountPaidAr: number;    // Montant payé en Ariary
  remainingBalanceAr: number; // Solde restant
  paymentMethod: PaymentMethod;
  referenceNumber?: string; // ex: Réf transaction MVola / Chèque
  paymentDate: string;
  recordedBy: string;      // Utilisateur ayant encaissé
  notes?: string;
  status?: 'COMPLETED' | 'CANCELLED';
  isCancelled?: boolean;
  cancelledAt?: string;
  cancelledBy?: string;
  cancelReason?: string;
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
  studentUid?: string;
  studentName: string;
  submittedAt: string;
  isLate: boolean;
  fileName: string;
  fileSize: string;
  fileSizeBytes?: number;
  fileUrl?: string;
  studentComment?: string;
  grade?: number;          // Note attribuée
  teacherFeedback?: string;
  isGraded: boolean;
  academicYear?: string;
  isArchived?: boolean;
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
  fileSizeBytes?: number;
  publishedAt: string;
  academicYear?: string;
  isArchived?: boolean;
}

export interface StorageSettings {
  maxFileSizeMb: number;             // ex: 15 Mo par défaut
  allowedExtensions: string[];       // ex: ['PDF', 'DOCX', 'XLSX', 'PPTX', 'JPG', 'PNG', 'ZIP']
  globalQuotaMb: number;             // ex: 5000 Mo (5 Go)
  studentQuotaMb?: number;           // ex: 100 Mo par étudiant
  teacherQuotaMb?: number;           // ex: 500 Mo par enseignant
  autoArchiveClosedYears?: boolean;
  autoArchivePreviousYears?: boolean;
}

export interface ScheduleSettings {
  dayStartTime: string;        // ex: "07:00" par défaut
  dayEndTime: string;          // ex: "18:00" par défaut
  slotIntervalMinutes: number; // ex: 30 (toutes les 30 mn)
}

export interface AppSettings {
  menuLayout: 'vertical' | 'horizontal'; // Sidebar vertical (OpenEduCat) ou Topbar horizontal
  visibleMenuItems: string[];            // Identifiants des onglets visibles dans le menu
  compactMode: boolean;
  showLiveChat: boolean;
  theme: 'light' | 'dark' | 'system';
  primaryColor: string;
  storageSettings?: StorageSettings;
  scheduleSettings?: ScheduleSettings;
  systemRolePermissions?: Partial<Record<UserRole, string[]>>; // Modules autorisés personnalisés par rôle système
}

export interface ChatMessage {
  id: string;
  senderId: string;
  recipientId: string;
  text: string;
  timestamp: string;
  isRead: boolean;
  updatedAt?: string;
}

// ==========================================
// REFONTE MESSAGERIE INSTANTANÉE & PRÉSENCE TEMPS RÉEL (EBM INSTITUTE)
// ==========================================

export type PresenceStatus = 'ONLINE' | 'IDLE' | 'DND' | 'OFFLINE';

export interface UserPresenceConnection {
  connectionId: string;
  status: PresenceStatus;
  updatedAt: string;
  deviceLabel: string;
}

export interface UserPresenceRecord {
  id: string; // sisUserId
  sisUserId: string;
  status: PresenceStatus;
  manualStatus?: 'ONLINE' | 'IDLE' | 'DND';
  lastSeenAt: string;
  connections: Record<string, UserPresenceConnection>;
  updatedAt: string;
}

export type ChatSoundTone = 'CRISTAL' | 'INSTITUTIONNEL' | 'DISCRET' | 'MODERNE';

export interface ChatNotificationPreferences {
  id: string; // userId
  userId: string;
  soundEnabled: boolean;
  soundVolume: number; // 0.0 to 1.0
  soundTone: ChatSoundTone;
  privateSoundEnabled: boolean;
  groupSoundEnabled: boolean;
  announcementSoundEnabled: boolean;
  muteActiveConversation: boolean;
  visualNotificationsEnabled: boolean;
  pushNotificationsEnabled: boolean;
  fcmTokens?: string[];
  updatedAt: string;
}

export type ChatConversationType = 'private' | 'group' | 'announcement';

export interface ChatAttachment {
  name: string;
  url: string;
  mimeType: string;
  extension: string;
  sizeBytes: number;
  sizeFormatted: string;
  storagePath?: string;
}

export interface ChatConversationMessage {
  id: string;
  conversationId: string;
  senderId: string; // SIS user.id
  senderName: string;
  senderRole: UserRole;
  text: string;
  type: 'text' | 'attachment' | 'image' | 'file' | 'announcement' | 'system';
  attachment?: ChatAttachment;
  replyToMessageId?: string;
  replyPreview?: {
    id: string;
    senderId: string;
    senderName: string;
    text: string;
  };
  replyToPreview?: {
    senderName: string;
    text: string;
  };
  createdAt: string;
  editedAt?: string;
  deletedAt?: string;
  deletedBy?: string;
  deliveredTo: Record<string, string>; // sisUserId -> ISO timestamp
  readBy: Record<string, string>;      // sisUserId -> ISO timestamp
  updatedAt?: string;
}

export interface ChatConversation {
  id: string;
  type: ChatConversationType;
  title: string;
  participantIds: string[]; // SIS user.id[] or ['ALL'] for general announcements
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lastMessage?: {
    id: string;
    text: string;
    senderId: string;
    senderName: string;
    createdAt: string;
    type?: 'text' | 'attachment' | 'image' | 'file' | 'announcement' | 'system';
  };
  lastMessageAt?: string;
  metadata?: {
    groupId?: string;
    filiereId?: string;
    level?: string;
    courseId?: string;
    allowReplies?: boolean;
    isOfficialAnnouncement?: boolean;
    description?: string;
    adminIds?: string[];
  };
}

export interface TypingIndicatorEntry {
  userId: string;
  userName: string;
  conversationId: string;
  timestamp: number;
}

