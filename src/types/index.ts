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

export type ParentContactRelation =
  | 'PERE'
  | 'MERE'
  | 'TUTEUR'
  | 'TUTRICE'
  | 'FRERE'
  | 'SOEUR'
  | 'CONJOINT'
  | 'AUTRE';

export interface ParentContact {
  id: string;
  nom: string;
  prenoms: string;
  phone: string;
  secondaryPhone?: string;
  email: string;
  relation: ParentContactRelation;
  profession?: string;
  address?: string;
  isPrimaryContact?: boolean;
  isEmergencyContact?: boolean;
  isLegalGuardian?: boolean;
  receiveAcademicInfo?: boolean;
}

export type ParentContactEntry = ParentContact;

export interface StudentAddress {
  addressLine?: string;
  lotNumber?: string;
  neighborhood?: string;
  commune?: string;
  district?: string;
  region?: string;
  country?: string;
  postalCode?: string;
}

export type DocumentVerificationStatus =
  | 'MANQUANT'
  | 'DEPOSE'
  | 'EN_ATTENTE'
  | 'VALIDE'
  | 'REJETE'
  | 'A_REMPLACER'
  | 'EXPIRE';

export type PreviousDiplomaCategory =
  | 'BACCALAUREAT'
  | 'LICENCE'
  | 'MASTER'
  | 'AUTRE_UNIVERSITAIRE'
  | 'PROFESSIONNEL';

export interface StudentPreviousDiploma {
  id: string;
  category: PreviousDiplomaCategory;
  title: string;
  institution: string;
  country: string;
  year: string;
  series?: string;
  diplomaNumber?: string;
  honors?: string;
  documentName?: string;
  documentUrl?: string;
  verificationStatus?: DocumentVerificationStatus;
}

export type StudentAdminDocumentType =
  | 'PHOTO_IDENTITE'
  | 'PIECE_IDENTITE'
  | 'ACTE_NAISSANCE'
  | 'DIPLOME_BAC'
  | 'RELEVE_BAC'
  | 'DIPLOME_UNIV'
  | 'RELEVE_UNIV'
  | 'ATTESTATION'
  | 'AUTRE';

export interface StudentAdminDocument {
  id: string;
  type: StudentAdminDocumentType;
  label: string;
  fileName?: string;
  fileUrl?: string;
  fileSize?: string;
  uploadedAt?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  status: DocumentVerificationStatus;
  rejectionReason?: string;
}

// ===============================================================
// DOSSIER ENSEIGNANT UNIFIÉ EN 7 ONGLETS (Cahier des charges EBM)
// ===============================================================

export interface TeacherEmergencyContact {
  id: string;
  fullName: string;
  relation: string;
  primaryPhone: string;
  secondaryPhone?: string;
  email?: string;
  address?: string;
}

export interface TeacherAcademicDiploma {
  id: string;
  title: string;
  field: string;
  specialty: string;
  level:
    | 'BACCALAUREAT'
    | 'BAC_PLUS_2'
    | 'LICENCE'
    | 'MASTER_1'
    | 'MASTER_2'
    | 'DOCTORAT'
    | 'HDR'
    | 'AUTRE'
    | string;
  institution: string;
  country: string;
  year: string;
  honors?: string;
  diplomaNumber?: string;
  documentName?: string;
  documentUrl?: string;
  verificationStatus: DocumentVerificationStatus;
  rejectionReason?: string;
}

export interface TeacherComplementaryTraining {
  id: string;
  category:
    | 'CERTIFICAT'
    | 'CERTIFICATION_PRO'
    | 'FORMATION_SPECIALISEE'
    | 'FORMATION_PEDAGOGIQUE'
    | 'FORMATION_EN_LIGNE'
    | 'FORMATION_CONTINUE'
    | 'AUTRE';
  title: string;
  organization: string;
  date: string;
  duration?: string;
  skillsAcquired?: string;
  documentName?: string;
  documentUrl?: string;
  verificationStatus?: DocumentVerificationStatus;
}

export interface TeacherWorkExperience {
  id: string;
  jobTitle: string;
  organization: string;
  sector: string;
  country: string;
  city: string;
  startDate: string;
  endDate?: string;
  isCurrent: boolean;
  responsibilities: string;
  achievements?: string;
  documentName?: string;
  documentUrl?: string;
}

export interface TeacherTeachingExperience {
  id: string;
  institution: string;
  roleTitle: string;
  taughtDomain: string;
  teachingLevel: string;
  startDate: string;
  endDate?: string;
  yearsOfExperience: number;
  trainingTypes: string;
  references?: string;
}

export interface TeacherLanguageSkill {
  id: string;
  language: string;
  level: 'DEBUTANT' | 'INTERMEDIAIRE' | 'AVANCE' | 'COURANT' | 'LANGUE_MATERNELLE';
}

export interface TeacherPedagogicalResponsibility {
  id: string;
  type:
    | 'RESPONSABLE_FILIERE'
    | 'RESPONSABLE_PARCOURS'
    | 'COORDINATEUR_PEDAGOGIQUE'
    | 'RESPONSABLE_UE'
    | 'DIRECTEUR_MEMOIRE'
    | 'ENCADREUR_STAGE'
    | 'AUTRE';
  title: string;
  scope?: string;
  startDate: string;
  endDate?: string;
  isActive: boolean;
}

export type TeacherDocumentCategory =
  | 'IDENTITE'
  | 'DIPLOMES_QUALIFICATIONS'
  | 'PROFESSIONNEL'
  | 'ADMINISTRATIF_EBM';

export interface TeacherAdminDocument {
  id: string;
  category: TeacherDocumentCategory;
  type: string;
  label: string;
  fileName?: string;
  fileUrl?: string;
  fileSize?: string;
  uploadedAt?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  expiryDate?: string;
  status: DocumentVerificationStatus;
  rejectionReason?: string;
}

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
  userRole?: UserRole;
  requestedAt: string;
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';
  changes: {
    field: string;
    label: string;
    oldValue: string;
    newValue: string;
  }[];
  reason: string;
  supportingDocName?: string;
  supportingDocUrl?: string;
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
  staffMatricule?: string; // Matricule du personnel enseignant / administratif (ex: ENS-EBM-0014)
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
  contractType?:
    | 'PERMANENT'
    | 'VACATAIRE'
    | 'CONTRACTUEL'
    | 'CONSULTANT'
    | 'INTERVENANT_EXTERNE'
    | 'MISSIONNAIRE';
  availabilities?: TeacherAvailabilitySlot[]; // Disponibilités hebdomadaires pour l'emploi du temps (07h-17h)
  specialty?: string;
  academicRank?: string;   // Grade universitaire (Professeur Titulaire, Maître de Conférences, Docteur / HDR, Chargé de cours, Assistant)
  highestDiploma?: string; // Diplôme le plus élevé (Doctorat / PhD, Master Recherche, Ingénieur...)
  almaMater?: string;      // Université / Établissement d'origine du diplôme
  secondaryPhone?: string; // Téléphone secondaire / WhatsApp
  orcidUrl?: string;       // Lien ORCID / Google Scholar / ResearchGate
  hireDate?: string;       // Date de prise de fonction à EBM Institute
  recruitmentDate?: string; // Date de recrutement
  contractDuration?: string; // Durée du contrat
  contractEndDate?: string;  // Date de fin de contrat
  supervisorName?: string;   // Responsable hiérarchique
  teacherStatus?: 'ACTIF' | 'SUSPENDU' | 'INACTIF' | 'ANCIEN_ENSEIGNANT';
  emergencyContact?: string; // Contact d'urgence (Nom & Téléphone)
  emergencyContacts?: TeacherEmergencyContact[]; // Contacts d'urgence multiples (Section 3 - Onglet 2.D)
  cin?: string;
  bankRib?: string;
  cvFileName?: string;     // Nom du fichier CV téléversé (ex: CV_Prof_Rakotoarisoa.pdf)
  cvFileUrl?: string;      // URL / DataURL du CV téléversé
  cvUploadedAt?: string;   // Date de mise à jour du CV
  updatedAt?: string;      // Horodatage ISO pour la synchronisation temps réel Cloud

  // ===============================================================
  // DOSSIER ÉTUDIANT & ENSEIGNANT UNIFIÉ EN 7 ONGLETS (Cahier des charges EBM)
  // ===============================================================
  // Onglet 1 – Identité & État civil
  preferredName?: string;          // Nom d'usage
  gender?: 'M' | 'F' | 'AUTRE';    // Sexe
  birthCountry?: string;           // Pays de naissance
  nationality?: string;            // Nationalité principale
  secondaryNationality?: string;   // Nationalité secondaire
  maritalStatus?: 'CELIBATAIRE' | 'MARIE' | 'DIVORCE' | 'VEUF' | 'AUTRE';
  identityDocType?: 'CIN' | 'PASSEPORT' | 'AUTRE';
  identityDocOtherLabel?: string;  // Précision si AUTRE
  identityIssueDate?: string;      // Date de délivrance
  identityIssuePlace?: string;     // Lieu de délivrance
  identityIssuingAuthority?: string; // Autorité de délivrance
  identityIssuingCountry?: string; // Pays émetteur
  identityExpiryDate?: string;     // Date d'expiration (Passeport / Autre)
  identityFrontName?: string;      // Copie recto (nom fichier)
  identityFrontUrl?: string;       // Copie recto (URL/DataURL)
  identityBackName?: string;       // Copie verso (nom fichier)
  identityBackUrl?: string;        // Copie verso (URL/DataURL)
  identityVerificationStatus?: DocumentVerificationStatus;
  preferredLanguage?: string;      // Langue préférée
  administrativeNotes?: string;    // Autres informations administratives

  // Onglet 2 – Coordonnées
  personalEmail?: string;          // Email personnel (distinct de l'email institutionnel)
  whatsappPhone?: string;          // Numéro WhatsApp
  websiteUrl?: string;             // Site personnel ou portfolio
  permanentAddress?: StudentAddress; // Adresse permanente structurée
  currentAddress?: StudentAddress;   // Adresse actuelle structurée
  sameAsPermanentAddress?: boolean;  // Case « Identique à l'adresse permanente »

  // Onglet 3 (Enseignant) – Formation, Diplômes & Qualifications
  teacherDiplomas?: TeacherAcademicDiploma[];
  complementaryTrainings?: TeacherComplementaryTraining[];
  academicSpecialties?: string[];
  secondarySpecialties?: string[];

  // Onglet 4 (Étudiant) – Parcours académique & Synchronisation inscriptions annuelles
  filiereId?: string;              // Mention / Filière active synchronisée
  currentLevel?: string;           // Niveau d'études actif synchronisé (L1, L2, L3, M1, M2)
  academicYearJoined?: string;     // Année académique d'entrée (ex: 2026-2027)
  studyMode?: 'PRESENTIEL' | 'HYBRIDE' | 'EN_LIGNE' | 'ALTERNANCE' | 'FORMATION_CONTINUE' | string;
  administrativeFolderStatus?: 'COMPLET' | 'INCOMPLET';
  enrollmentDate?: string;         // Date d'inscription active synchronisée
  enrollmentStatus?: 'CONFIRMED' | 'PENDING' | 'DRAFT' | 'REJECTED' | 'SUSPENDED' | string;
  firstRegistrationDate?: string;  // Date de première inscription
  reRegistrationDate?: string;     // Date de réinscription
  admissionType?: 'CONCOURS' | 'DOSSIER' | 'EQUIVALENCE' | 'TRANSFERT' | 'REINSCRIPTION';
  registrationStatus?: 'CONFIRMED' | 'PENDING' | 'SUSPENDED';
  trainingMode?: 'PRESENTIEL' | 'HYBRIDE' | 'EN_LIGNE' | 'ALTERNANCE';
  targetDegree?: 'LICENCE' | 'MASTER' | 'INGENIEUR' | 'CERTIFICAT';
  currentSemesterCode?: 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6' | 'S7' | 'S8' | 'S9' | 'S10';
  trainingRegime?: 'INITIAL' | 'CONTINU' | 'SALARIE';
  previousDiplomas?: StudentPreviousDiploma[];

  // Onglet 4 (Enseignant) / Onglet 5 (Étudiant) – Expérience & Situation professionnelle
  employmentStatus?:
    | 'ETUDIANT_TEMPS_PLEIN'
    | 'SALARIE'
    | 'ENTREPRENEUR'
    | 'FONCTIONNAIRE'
    | 'CONSULTANT'
    | 'ENSEIGNANT_CHERCHEUR'
    | 'STAGIAIRE'
    | 'RECHERCHE_EMPLOI'
    | 'AUTRE';
  profession?: string;
  employer?: string;
  jobFunction?: string;
  activitySector?: string;
  workAddress?: string;
  workPhone?: string;
  workEmail?: string;
  workExperience?: string;
  professionalExperiences?: TeacherWorkExperience[];
  teachingExperiences?: TeacherTeachingExperience[];
  isWorkingStudent?: boolean;      // Statut étudiant salarié
  isEntrepreneur?: boolean;        // Entrepreneur ou indépendant
  isContinuingEducation?: boolean; // Formation continue
  secondFiliere?: string;          // Deuxième filière éventuelle

  // Onglet 5 (Enseignant) – Compétences, Spécialités & Responsabilités pédagogiques
  competenceDomains?: string[];
  technicalSkills?: string[];
  pedagogicalSkills?: string[];
  languagesSpoken?: TeacherLanguageSkill[];
  softwareTools?: string[];
  pedagogicalResponsibilities?: TeacherPedagogicalResponsibility[];

  // Onglet 6 – Documents & Justificatifs
  studentDocuments?: StudentAdminDocument[];
  teacherDocuments?: TeacherAdminDocument[];

  // Onglet 7 – Compte & Sécurité
  moodleUsername?: string;         // Compte Moodle associé
  moodleLinked?: boolean;
  createdAt?: string;              // Date de création du compte
  lastLoginAt?: string;            // Dernière connexion
  emailVerified?: boolean;         // Vérification de l'email
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
  maxCapacity?: number;   // Capacité maximale (ex: 40 places)
  status?: 'ACTIVE' | 'ARCHIVED';
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
  semester?: SemesterCode;
  ueId?: string;
  ecId?: string;
  parcoursId?: string;
  courseType?: 'CM' | 'TD' | 'TP' | 'AUTRE' | string;
  status?: 'ACTIVE' | 'ARCHIVED';
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
  cancellationCategory?:
    | 'ABSENT_UNNOTIFIED'
    | 'ABSENT_NOTIFIED'
    | 'TECHNICAL_ISSUE'
    | 'FORCE_MAJEURE'
    | 'OTHER';
  rescheduledFrom?: {
    originalDate: string;
    originalStartTime: string;
    originalEndTime: string;
    originalRoomId: string;
  };
  validatedAt?: string;
  validatedBy?: string;
  publishedAt?: string;
  publishedBy?: string;
  isRealizedConfirmed?: boolean;   // Confirmation explicite que la séance a bien eu lieu (même si CR en attente/manquant)
  report?: {
    content: string;               // Contenu réellement enseigné / Résumé du cours
    chapterTitle?: string;         // Chapitre ou thème traité
    objectives?: string;           // Objectifs de la séance
    plannedContent?: string;       // Contenu initialement prévu
    keyTakeaways?: string;         // Points essentiels à retenir
    pedagogicalMethods?: string;   // Méthodes pédagogiques utilisées
    exercisesAndPracticalWork?: string; // Exercices et travaux pratiques réalisés
    difficultiesEncountered?: string;   // Difficultés rencontrées (masqué côté étudiant)
    remarks?: string;              // Observations de l'enseignant (masqué côté étudiant)
    directionObservations?: string; // Observations de la Direction (masqué côté étudiant)
    actualHours: number;           // Durée effective réellement dispensée
    teacherPresence?:
      | 'PRESENT'
      | 'LATE'
      | 'REPLACED'
      | 'ABSENT_UNNOTIFIED'
      | 'ABSENT_NOTIFIED';
    replacementName?: string;
    incident?: string;
    homework?: string;             // Travail à préparer pour la prochaine séance
    nextSessionPlan?: string;      // Préparation de la prochaine séance
    attachments?: SessionReportAttachment[]; // Supports, exercices, TP, justificatifs
    reportStatus?: SessionReportStatus;      // Brouillon, Soumis, À corriger, Validé, Publié, Rejeté
    createdAt?: string;
    submittedAt?: string;
    submittedBy?: string;
    validatedAt?: string;
    validatedBy?: string;
    publishedAt?: string;
    publishedBy?: string;
    writtenBy: string;
    writtenAt: string;
    updatedAt?: string;
    revisions?: SessionReportRevision[];
  };
  correctionRequested?: boolean;
  correctionReason?: string;
  correctionRequestedAt?: string;
  correctionRequestedBy?: string;
  anomalyReports?: SessionAnomalyReport[]; // Signalements d'anomalies (Section 3.7)
  updatedAt?: string;
  history: SessionHistoryItem[];
}

export type SessionReportStatus =
  | 'DRAFT'                 // Brouillon (enseignant en cours de rédaction)
  | 'SUBMITTED'             // Soumis (en attente de validation administrative)
  | 'CORRECTION_REQUESTED'  // À corriger (demande de correction)
  | 'REJECTED'              // Rejeté avec motif
  | 'VALIDATED'             // Validé par l'administration / Direction
  | 'PUBLISHED';            // Publié officiellement (visible par les étudiants inscrits)

export type SessionReportAttachmentCategory =
  | 'SUPPORT_COURS'
  | 'EXERCICES'
  | 'TP'
  | 'COMPLEMENTAIRE'
  | 'JUSTIFICATIF';

export interface SessionReportAttachment {
  id: string;
  title: string;
  category: SessionReportAttachmentCategory;
  fileName: string;
  fileUrl?: string;
  fileSize?: string;
  allowStudentDownload: boolean;
  uploadedAt: string;
  uploadedBy: string;
}

export type SessionAnomalyCategory =
  | 'SESSION_NOT_HELD'      // Séance indiquée comme réalisée alors qu'elle n'a pas eu lieu
  | 'WRONG_DATE_TIME'       // Date ou horaire incorrect
  | 'INACCESSIBLE_REPORT'   // Compte rendu inaccessible
  | 'MISSING_DOCUMENT'      // Document manquant
  | 'CONTENT_ERROR'         // Erreur concernant le contenu publié
  | 'OTHER';

export interface SessionAnomalyReport {
  id: string;
  sessionId: string;
  courseId: string;
  reportedById: string;
  reportedByName: string;
  reportedByRole: UserRole;
  reportedByMatricule?: string;
  reportedAt: string;
  category: SessionAnomalyCategory;
  description: string;
  status: 'OPEN' | 'RESOLVED' | 'REJECTED';
  resolutionNote?: string;
  resolvedBy?: string;
  resolvedAt?: string;
}

export interface SessionReportRevision {
  id: string;
  versionNumber: number;
  modifiedAt: string;
  modifiedBy: string;
  modifiedByRole?: UserRole;
  reason?: string;
  previousContent: string;
  previousChapterTitle?: string;
  previousObjectives?: string;
  previousActualHours: number;
  previousHomework?: string;
  previousNextSessionPlan?: string;
  previousRemarks?: string;
  previousDifficulties?: string;
  previousDirectionObservations?: string;
  previousIncident?: string;
  previousTeacherPresence?:
    | 'PRESENT'
    | 'LATE'
    | 'REPLACED'
    | 'ABSENT_UNNOTIFIED'
    | 'ABSENT_NOTIFIED';
  previousReplacementName?: string;
  previousReportStatus?: SessionReportStatus;
}

export interface SessionPrivateReport {
  id: string;
  sessionId: string;
  remarks?: string;
  difficultiesEncountered?: string;
  directionObservations?: string;
  rejectionReason?: string;
  cancellationCategory?:
    | 'ABSENT_UNNOTIFIED'
    | 'ABSENT_NOTIFIED'
    | 'TECHNICAL_ISSUE'
    | 'FORCE_MAJEURE'
    | 'OTHER';
  teacherPresence:
    | 'PRESENT'
    | 'LATE'
    | 'REPLACED'
    | 'ABSENT_UNNOTIFIED'
    | 'ABSENT_NOTIFIED';
  replacementName?: string;
  incident?: string;
  internalNotes?: string;
  writtenBy: string;
  writtenAt: string;
  updatedAt?: string;
  revisions?: SessionReportRevision[];
}

export interface SessionHistoryItem {
  id: string;
  timestamp: string;
  authorName: string;
  action: string;         // 'CREATION', 'MODIFICATION', 'REPORT', 'ANNULATION', 'VALIDATION', 'PUBLICATION', 'SOUMISSION', 'ANOMALIE'
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
    type: 'TIME' | 'ROOM' | 'TEACHER' | 'GROUP' | 'CAPACITY' | 'AVAILABILITY' | 'QUOTA' | 'HOLIDAY' | 'CALENDAR_CLOSURE';
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
  lieuNaissance?: string;
  cin?: string;
  telephone?: string;
  email: string;
  adresse?: string;
  anneeAcademique?: string;
  filiere: string;
  parcours?: string;
  niveau: string;
  groupe: string;
  typeAdmission?: StudentInscription['inscriptionType'];
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

export type AcademicCalendarEventType =
  | 'HOLIDAY'             // Jour férié national / officiel
  | 'VACATION'            // Vacances universitaires (Toussaint, Noël, Pâques, intersemestre)
  | 'EXAM'                // Période d'examens / rattrapages
  | 'PEDAGOGICAL_CLOSURE' // Fermeture pédagogique / administrative exceptionnelle
  | 'INSTITUTIONAL_EVENT'; // Rentrée solennelle, forum, diplomation

export type AcademicCalendarScope =
  | 'ESTABLISHMENT' // Tout l'établissement (toutes les filières et groupes)
  | 'FILIERE'       // Une filière spécifique
  | 'LEVEL'         // Une promotion / niveau (ex: L1, L2, L3, M1, M2)
  | 'GROUP';        // Un groupe ou sous-groupe d'étudiants spécifique

export type WeeklyDayOfWeek = 'LUNDI' | 'MARDI' | 'MERCREDI' | 'JEUDI' | 'VENDREDI' | 'SAMEDI' | 'DIMANCHE';

export interface WeeklyWorkingDayConfig {
  day: WeeklyDayOfWeek;
  dayIndex: number;           // 0=Dimanche, 1=Lundi, ..., 6=Samedi
  isWorked: boolean;          // Est-ce un jour ouvré ?
  morningWorked: boolean;     // Matinée travaillée
  afternoonWorked: boolean;   // Après-midi travaillée
  standardStartTime: string;  // e.g. "07:30"
  standardEndTime: string;    // e.g. "18:30"
}

export interface AcademicCalendarEvent {
  id: string;
  academicYearId: string;     // ID ou code de l'année académique
  title: string;              // e.g. "Vacances de fin d'année", "Période d'Examens S1"
  description?: string;
  type: AcademicCalendarEventType;
  scope: AcademicCalendarScope;
  targetFiliereId?: string;   // Si scope === 'FILIERE'
  targetLevel?: string;       // Si scope === 'LEVEL'
  targetGroupId?: string;     // Si scope === 'GROUP'
  targetGroupIds?: string[];  // Multiples groupes cibles
  startDate: string;          // YYYY-MM-DD
  endDate: string;            // YYYY-MM-DD
  isFullDay: boolean;
  startTime?: string;         // e.g. "07:30" si demi-journée ou fermeture partielle
  endTime?: string;           // e.g. "12:30"
  isRecurringAnnual?: boolean;// Recalculé sur chaque année
  isWorkedExceptionAllowed?: boolean; // Autorise-t-il une dérogation de travail ?
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CalendarWorkedException {
  id: string;
  academicYearId: string;
  eventId?: string;           // Référence à l'événement de fermeture / vacance exempté
  title: string;              // e.g. "Rattrapage exceptionnel Droit Fiscal L3"
  date: string;               // YYYY-MM-DD
  reason: string;             // Justification obligatoire
  scope: AcademicCalendarScope;
  targetFiliereId?: string;
  targetLevel?: string;
  targetGroupId?: string;
  targetGroupIds?: string[];
  approvedBy: string;         // Nom ou UID de l'approbateur (Admin ou Scolarité)
  approvedByRole: UserRole;
  approvedAt: string;         // ISO timestamp
  status: 'APPROVED' | 'REVOKED';
  createdAt: string;
}

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
  workingDays?: WeeklyWorkingDayConfig[];
  calendarEvents?: AcademicCalendarEvent[];
  calendarExceptions?: CalendarWorkedException[];
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

export interface EnrollmentHistoryItem {
  id: string;
  timestamp: string;
  authorId?: string;
  authorName: string;
  action:
    | 'CREATION'
    | 'VALIDATION'
    | 'AFFECTATION_INITIALE'
    | 'CHANGEMENT_GROUPE'
    | 'CHANGEMENT_PARCOURS'
    | 'CHANGEMENT_NIVEAU'
    | 'CHANGEMENT_STATUT'
    | 'REORIENTATION'
    | 'SUSPENSION'
    | 'REPRISE'
    | 'MODIFICATION_DOSSIER';
  previousGroupId?: string;
  newGroupId?: string;
  previousParcoursId?: string;
  newParcoursId?: string;
  previousLevel?: string;
  newLevel?: string;
  previousStatus?: string;
  newStatus?: string;
  isDerogation?: boolean;
  reason?: string;
}

export type EnrollmentAdmissionType =
  | 'PREMIERE_INSCRIPTION'
  | 'ADMISSION_DOSSIER'
  | 'CONCOURS'
  | 'EQUIVALENCE'
  | 'TRANSFERT'
  | 'REINSCRIPTION'
  | 'REINSCRIPTION_INTERRUPTION'
  | 'REORIENTATION'
  | 'INSCRIPTION';

export type EnrollmentSpecialCase =
  | 'NORMAL'
  | 'PASSAGE_SUPERIEUR'
  | 'REDOUBLEMENT'
  | 'PASSAGE_CONDITIONNEL'
  | 'REORIENTATION'
  | 'CHANGEMENT_PARCOURS'
  | 'CHANGEMENT_GROUPE'
  | 'TRANSFERT'
  | 'INTERRUPTION'
  | 'REPRISE'
  | 'DIPLOME';

export interface StudentInscription {
  id: string;
  studentId: string;
  studentUid?: string;
  registrationReference?: string; // Clé unique studentId + academicYear
  academicYear: string;           // e.g. "2026-2027"
  filiereId: string;
  parcoursId?: string;
  level: string;
  groupId: string;                // ID du groupe ou '' si "Sans affectation immédiate" (Optionnel)
  inscriptionType?: EnrollmentAdmissionType;
  trainingMode?: 'PRESENTIEL' | 'HYBRIDE' | 'EN_LIGNE' | 'ALTERNANCE';
  trainingRegime?: 'INITIAL' | 'CONTINU' | 'SALARIE';
  academicStatus?: 'NOUVEAU' | 'PASSANT' | 'PASSAGE_CONDITIONNEL' | 'REDOUBLANT' | 'DIPLOME' | 'REORIENTE' | 'TRANSFERE' | 'SUSPENDU';
  specialCaseType?: EnrollmentSpecialCase;
  referenceDecision?: string;
  validationReason?: string;
  dossierComplete?: boolean;
  documents?: {
    cinOrBirthCert: boolean;
    baccOriginal: boolean;
    photosId: boolean;
    medicalCert: boolean;
    financialClearance: boolean;
    equivalenceOrTransferDoc?: boolean;
    registrationFormSigned?: boolean;
  };
  inscriptionDate: string;
  status: 'DRAFT' | 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'SUSPENDED';
  agentId?: string;
  agentName?: string;
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: string;
  validatedAt?: string;
  notes?: string;
  history?: EnrollmentHistoryItem[];
}

export type StudentEnrollment = StudentInscription;

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
  deliveryStatus?: 'SENDING' | 'SENT' | 'FAILED'; // Statut réel de confirmation distante Firestore
  sendError?: string;                              // Motif en cas d'erreur de transmission
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

