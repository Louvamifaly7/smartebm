import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  User,
  ParentContact,
  ParentContactRelation,
  StudentAddress,
  DocumentVerificationStatus,
  StudentPreviousDiploma,
  PreviousDiplomaCategory,
  StudentAdminDocument,
  StudentAdminDocumentType,
} from '../types';
import { showAppToast } from './ToastAndConfirmCenter';
import {
  X,
  User as UserIcon,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  CheckCircle2,
  Save,
  Shield,
  Edit2,
  AlertTriangle,
  KeyRound,
  Lock,
  Sparkles,
  Copy,
  Check,
  History,
  FileText,
  Upload,
  Plus,
  Trash2,
  Users,
  Printer,
  QrCode,
  CreditCard,
  Award,
  CheckCircle,
  XCircle,
  Clock,
  Globe,
  Camera,
  Eye,
  Download,
} from 'lucide-react';

export type StudentDossierTab =
  | 'TAB_1_IDENTITY'
  | 'TAB_2_CONTACT'
  | 'TAB_3_PARENTS'
  | 'TAB_4_ACADEMIC'
  | 'TAB_5_PROFESSIONAL'
  | 'TAB_6_DOCUMENTS'
  | 'TAB_7_SECURITY'
  | 'EXT_GRADES'
  | 'EXT_FINANCES';

export interface StudentDossierCompleteness {
  percentage: number;
  completedCount: number;
  totalRequired: number;
  missingItems: string[];
}

export const REQUIRED_DOCUMENT_CATALOG: {
  type: StudentAdminDocumentType;
  label: string;
  required: boolean;
}[] = [
  { type: 'PHOTO_IDENTITE', label: "Photo d'identité officielle", required: true },
  { type: 'PIECE_IDENTITE', label: "Copie CIN ou Passeport", required: true },
  { type: 'ACTE_NAISSANCE', label: 'Acte de naissance', required: true },
  { type: 'DIPLOME_BAC', label: 'Diplôme du baccalauréat', required: true },
  { type: 'RELEVE_BAC', label: 'Relevé de notes du baccalauréat', required: true },
  { type: 'DIPLOME_UNIV', label: 'Diplômes universitaires antérieurs', required: false },
  { type: 'RELEVE_UNIV', label: 'Relevés de notes universitaires', required: false },
  { type: 'ATTESTATION', label: 'Attestations diverses (travail, stage, bourse)', required: false },
  { type: 'AUTRE', label: 'Autres justificatifs complémentaires', required: false },
];

export const RELATION_LABELS: Record<ParentContactRelation, string> = {
  PERE: 'Père',
  MERE: 'Mère',
  TUTEUR: 'Tuteur',
  TUTRICE: 'Tutrice',
  FRERE: 'Frère',
  SOEUR: 'Sœur',
  CONJOINT: 'Conjoint(e)',
  AUTRE: 'Autre',
};

export const DOC_STATUS_CONFIG: Record<
  DocumentVerificationStatus,
  { label: string; badgeClass: string }
> = {
  MANQUANT: {
    label: 'Manquant',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
  },
  DEPOSE: {
    label: 'Déposé',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  EN_ATTENTE: {
    label: 'En attente de vérification',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  VALIDE: {
    label: 'Validé',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  REJETE: {
    label: 'Rejeté',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
  },
  A_REMPLACER: {
    label: 'À remplacer',
    badgeClass: 'bg-orange-50 text-orange-800 border-orange-200',
  },
  EXPIRE: {
    label: 'Expiré',
    badgeClass: 'bg-red-100 text-red-800 border-red-300',
  },
};

/**
 * Computes the unified Student Dossier completeness indicator (Section 5.3)
 */
export function computeStudentDossierCompleteness(student: User): StudentDossierCompleteness {
  const checks: { label: string; ok: boolean }[] = [
    { label: 'Photo d’identité', ok: Boolean(student.photoUrl || student.avatar || student.avatarUrl) },
    { label: 'Nom et Prénoms', ok: Boolean(student.name && student.name.trim().length > 1) },
    { label: 'Sexe / Civilité', ok: Boolean(student.gender || student.civilite) },
    { label: 'Date et lieu de naissance', ok: Boolean(student.birthDate && student.birthPlace) },
    { label: 'Nationalité', ok: Boolean(student.nationality) },
    { label: 'Numéro de pièce d’identité (CIN/Passeport)', ok: Boolean(student.cin) },
    { label: 'Email institutionnel ou personnel', ok: Boolean(student.email || student.personalEmail) },
    { label: 'Téléphone principal', ok: Boolean(student.phone) },
    {
      label: 'Adresse permanente',
      ok: Boolean(
        student.permanentAddress?.addressLine ||
          student.permanentAddress?.commune ||
          student.address ||
          student.city
      ),
    },
    {
      label: 'Contact Parent / Tuteur ou Urgence',
      ok: Boolean((student.parentContacts && student.parentContacts.length > 0) || student.emergencyContact),
    },
    {
      label: 'Diplôme antérieur (Baccalauréat)',
      ok: Boolean(
        (student.previousDiplomas && student.previousDiplomas.length > 0) ||
          student.bacSeries ||
          student.originSchool
      ),
    },
  ];

  // Check mandatory documents
  const docs = student.studentDocuments || [];
  const hasPhotoDoc =
    Boolean(student.photoUrl || student.avatar) ||
    docs.some((d) => d.type === 'PHOTO_IDENTITE' && d.status !== 'MANQUANT' && d.status !== 'REJETE');
  const hasIdentityDoc =
    Boolean(student.identityFrontUrl) ||
    docs.some((d) => d.type === 'PIECE_IDENTITE' && d.status !== 'MANQUANT' && d.status !== 'REJETE');
  const hasBacDoc =
    docs.some((d) => d.type === 'DIPLOME_BAC' && d.status !== 'MANQUANT' && d.status !== 'REJETE') ||
    Boolean(student.previousDiplomas?.some((p) => p.documentUrl));

  checks.push(
    { label: 'Pièce justificative : Photo d’identité', ok: hasPhotoDoc },
    { label: 'Pièce justificative : Copie CIN / Passeport', ok: hasIdentityDoc },
    { label: 'Pièce justificative : Diplôme du Baccalauréat', ok: hasBacDoc }
  );

  const completedCount = checks.filter((c) => c.ok).length;
  const totalRequired = checks.length;
  const percentage = Math.round((completedCount / totalRequired) * 100);
  const missingItems = checks.filter((c) => !c.ok).map((c) => c.label);

  return {
    percentage,
    completedCount,
    totalRequired,
    missingItems,
  };
}

interface StudentProfileFormProps {
  student: User;
  mode: 'self-service' | 'administration';
  onClose: () => void;
  initialEditMode?: boolean;
  initialTab?: StudentDossierTab;
  showAcademicAndFinanceExtensions?: boolean;
  onOpenCardModal?: (student: User) => void;
}

export const StudentProfileForm: React.FC<StudentProfileFormProps> = ({
  student: propStudent,
  mode,
  onClose,
  initialEditMode = false,
  initialTab = 'TAB_1_IDENTITY',
  showAcademicAndFinanceExtensions = false,
  onOpenCardModal,
}) => {
  const {
    currentUser,
    users,
    groups,
    filieres,
    parcours,
    academicYears,
    selectedAcademicYear,
    setSelectedAcademicYear,
    ues,
    ecs,
    inscriptions,
    grades,
    fees,
    payments,
    profileChangeRequests,
    updateUser,
    requestProfileChange,
    approveProfileChangeRequest,
    rejectProfileChangeRequest,
    toggleUserStatus,
    sendUserPasswordResetEmail,
    setDirectUserPassword,
    computeStudentDeliberationPreview,
    getStudentEcGrade,
    getStudentFinancialSummary,
    recordPayment,
    cancelPayment,
  } = useApp();

  // Always read live user from context so real-time Firestore updates reflect immediately
  const student = useMemo(
    () => users.find((u) => u.id === propStudent.id) || propStudent,
    [users, propStudent]
  );

  const isAdminMode = mode === 'administration';
  const isSelfService = mode === 'self-service';
  const isFinanceRole = currentUser.role === 'FINANCE';
  const canEditDossier =
    isSelfService ||
    ['ADMIN', 'SCOLARITE', 'SCHEDULER', 'ADMIN_STAFF', 'ACADEMIC_HEAD'].includes(currentUser.role);

  const [activeTab, setActiveTab] = useState<StudentDossierTab>(initialTab);
  const [isEditing, setIsEditing] = useState<boolean>(initialEditMode);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [showMissingDetails, setShowMissingDetails] = useState<boolean>(false);
  const [savedBanner, setSavedBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ============================================================================
  // ONGLET 1 – IDENTITÉ & ÉTAT CIVIL
  // ============================================================================
  const [photoUrl, setPhotoUrl] = useState('');
  const [civilite, setCivilite] = useState<'M.' | 'Mme' | 'Mlle' | 'Dr.' | 'Prof.'>('M.');
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [preferredName, setPreferredName] = useState('');
  const [gender, setGender] = useState<'M' | 'F' | 'AUTRE'>('M');
  const [birthDate, setBirthDate] = useState('');
  const [birthPlace, setBirthPlace] = useState('');
  const [birthCountry, setBirthCountry] = useState('Madagascar');
  const [nationality, setNationality] = useState('Malagasy');
  const [secondaryNationality, setSecondaryNationality] = useState('');
  const [maritalStatus, setMaritalStatus] = useState<
    'CELIBATAIRE' | 'MARIE' | 'DIVORCE' | 'VEUF' | 'AUTRE'
  >('CELIBATAIRE');

  // B. Pièce d'identité (choix dynamique)
  const [identityDocType, setIdentityDocType] = useState<'CIN' | 'PASSEPORT' | 'AUTRE'>('CIN');
  const [identityDocOtherLabel, setIdentityDocOtherLabel] = useState('');
  const [cin, setCin] = useState('');
  const [identityIssueDate, setIdentityIssueDate] = useState('');
  const [identityIssuePlace, setIdentityIssuePlace] = useState('');
  const [identityIssuingAuthority, setIdentityIssuingAuthority] = useState('');
  const [identityIssuingCountry, setIdentityIssuingCountry] = useState('Madagascar');
  const [identityExpiryDate, setIdentityExpiryDate] = useState('');
  const [identityFrontName, setIdentityFrontName] = useState('');
  const [identityFrontUrl, setIdentityFrontUrl] = useState('');
  const [identityBackName, setIdentityBackName] = useState('');
  const [identityBackUrl, setIdentityBackUrl] = useState('');
  const [identityVerificationStatus, setIdentityVerificationStatus] =
    useState<DocumentVerificationStatus>('MANQUANT');

  // C. Informations complémentaires
  const [preferredLanguage, setPreferredLanguage] = useState('Français');
  const [administrativeNotes, setAdministrativeNotes] = useState('');

  // ============================================================================
  // ONGLET 2 – COORDONNÉES
  // ============================================================================
  const [personalEmail, setPersonalEmail] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [secondaryPhone, setSecondaryPhone] = useState('');
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [linkedInUrl, setLinkedInUrl] = useState('');
  const [orcidUrl, setOrcidUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');

  const [permanentAddress, setPermanentAddress] = useState<StudentAddress>({
    addressLine: '',
    lotNumber: '',
    neighborhood: '',
    commune: '',
    district: '',
    region: 'Analamanga',
    country: 'Madagascar',
    postalCode: '101',
  });
  const [sameAsPermanentAddress, setSameAsPermanentAddress] = useState<boolean>(true);
  const [currentAddress, setCurrentAddress] = useState<StudentAddress>({
    addressLine: '',
    lotNumber: '',
    neighborhood: '',
    commune: '',
    district: '',
    region: 'Analamanga',
    country: 'Madagascar',
    postalCode: '101',
  });

  // ============================================================================
  // ONGLET 3 – PARENTS & TUTEURS
  // ============================================================================
  const [parentContacts, setParentContacts] = useState<ParentContact[]>([]);

  // ============================================================================
  // ONGLET 4 – PARCOURS ACADÉMIQUE
  // ============================================================================
  const [matricule, setMatricule] = useState('');
  const [firstRegistrationDate, setFirstRegistrationDate] = useState('');
  const [reRegistrationDate, setReRegistrationDate] = useState('');
  const [admissionType, setAdmissionType] = useState<
    'CONCOURS' | 'DOSSIER' | 'EQUIVALENCE' | 'TRANSFERT' | 'REINSCRIPTION'
  >('DOSSIER');
  const [registrationStatus, setRegistrationStatus] = useState<'CONFIRMED' | 'PENDING' | 'SUSPENDED'>(
    'CONFIRMED'
  );
  const [trainingMode, setTrainingMode] = useState<'PRESENTIEL' | 'HYBRIDE' | 'EN_LIGNE' | 'ALTERNANCE'>(
    'PRESENTIEL'
  );
  const [groupId, setGroupId] = useState('');
  const [parcoursId, setParcoursId] = useState('');
  const [targetDegree, setTargetDegree] = useState<'LICENCE' | 'MASTER' | 'INGENIEUR' | 'CERTIFICAT'>(
    'LICENCE'
  );
  const [currentSemesterCode, setCurrentSemesterCode] = useState<
    'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6' | 'S7' | 'S8' | 'S9' | 'S10'
  >('S1');
  const [trainingRegime, setTrainingRegime] = useState<'INITIAL' | 'CONTINU' | 'SALARIE'>('INITIAL');
  const [previousDiplomas, setPreviousDiplomas] = useState<StudentPreviousDiploma[]>([]);

  // ============================================================================
  // ONGLET 5 – SITUATION PERSONNELLE & PROFESSIONNELLE
  // ============================================================================
  const [employmentStatus, setEmploymentStatus] = useState<NonNullable<User['employmentStatus']>>(
    'ETUDIANT_TEMPS_PLEIN'
  );
  const [profession, setProfession] = useState('');
  const [employer, setEmployer] = useState('');
  const [jobFunction, setJobFunction] = useState('');
  const [activitySector, setActivitySector] = useState('');
  const [workAddress, setWorkAddress] = useState('');
  const [workPhone, setWorkPhone] = useState('');
  const [workEmail, setWorkEmail] = useState('');
  const [workExperience, setWorkExperience] = useState('');
  const [isWorkingStudent, setIsWorkingStudent] = useState(false);
  const [isEntrepreneur, setIsEntrepreneur] = useState(false);
  const [isContinuingEducation, setIsContinuingEducation] = useState(false);
  const [secondFiliere, setSecondFiliere] = useState('');

  // ============================================================================
  // ONGLET 6 – DOCUMENTS & JUSTIFICATIFS
  // ============================================================================
  const [studentDocuments, setStudentDocuments] = useState<StudentAdminDocument[]>([]);
  const [rejectingDocId, setRejectingDocId] = useState<string | null>(null);
  const [rejectDocReason, setRejectDocReason] = useState<string>('');

  // ============================================================================
  // ONGLET 7 – COMPTE & SÉCURITÉ + DEMANDES DE VALIDATION
  // ============================================================================
  const [moodleUsername, setMoodleUsername] = useState('');
  const [moodleLinked, setMoodleLinked] = useState(false);
  const [emailVerified, setEmailVerified] = useState(true);
  const [isAdult, setIsAdult] = useState(false);
  const [parentConsent, setParentConsent] = useState({
    academic: true,
    attendance: true,
    financial: true,
    administrative: true,
  });

  // Security password controls
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [forceChangeNextLogin, setForceChangeNextLogin] = useState(false);
  const [securityFeedback, setSecurityFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [isSendingResetEmail, setIsSendingResetEmail] = useState(false);

  // Student change request form (Section 6)
  const [reqField, setReqField] = useState<string>('name');
  const [reqNewValue, setReqNewValue] = useState<string>('');
  const [reqReason, setReqReason] = useState<string>('');
  const [reqDocName, setReqDocName] = useState<string>('');
  const [reqDocUrl, setReqDocUrl] = useState<string>('');
  const [adminRejectComment, setAdminRejectComment] = useState<Record<string, string>>({});

  // Extensions (Grades & Finances for Administration)
  const [studentGradeSemester, setStudentGradeSemester] = useState<'ANNUEL' | 'S1' | 'S2'>('ANNUEL');
  const [isQuickPayOpen, setIsQuickPayOpen] = useState(false);
  const [quickPayFeeId, setQuickPayFeeId] = useState('');
  const [quickPayAmount, setQuickPayAmount] = useState<number>(0);
  const [quickPayMethod, setQuickPayMethod] = useState<
    'MOBILE_MONEY' | 'ESPECES' | 'DEPOT_BANCAIRE' | 'VIREMENT_BANCAIRE'
  >('MOBILE_MONEY');
  const [quickPayRef, setQuickPayRef] = useState('');
  const [quickPayError, setQuickPayError] = useState<string | null>(null);
  const [quickPaySuccess, setQuickPaySuccess] = useState<string | null>(null);
  const [cancellingPaymentId, setCancellingPaymentId] = useState<string | null>(null);
  const [cancelReasonText, setCancelReasonText] = useState('');

  // Hydrate all 7 tabs from the unified User document
  const hydrateFromStudent = (u: User) => {
    const nameParts = (u.name || '').trim().split(/\s+/);
    const inferredLastName = u.lastName || (nameParts.length > 1 ? nameParts.slice(-1).join(' ') : u.name || '');
    const inferredFirstName = u.firstName || (nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : '');

    setPhotoUrl(u.photoUrl || u.avatar || u.avatarUrl || '');
    setCivilite(u.civilite || 'M.');
    setLastName(inferredLastName);
    setFirstName(inferredFirstName);
    setPreferredName(u.preferredName || '');
    setGender(u.gender || (u.civilite === 'Mme' || u.civilite === 'Mlle' ? 'F' : 'M'));
    setBirthDate(u.birthDate || '');
    setBirthPlace(u.birthPlace || '');
    setBirthCountry(u.birthCountry || 'Madagascar');
    setNationality(u.nationality || 'Malagasy');
    setSecondaryNationality(u.secondaryNationality || '');
    setMaritalStatus(u.maritalStatus || 'CELIBATAIRE');

    setIdentityDocType(u.identityDocType || 'CIN');
    setIdentityDocOtherLabel(u.identityDocOtherLabel || '');
    setCin(u.cin || '');
    setIdentityIssueDate(u.identityIssueDate || '');
    setIdentityIssuePlace(u.identityIssuePlace || '');
    setIdentityIssuingAuthority(u.identityIssuingAuthority || '');
    setIdentityIssuingCountry(u.identityIssuingCountry || 'Madagascar');
    setIdentityExpiryDate(u.identityExpiryDate || '');
    setIdentityFrontName(u.identityFrontName || '');
    setIdentityFrontUrl(u.identityFrontUrl || '');
    setIdentityBackName(u.identityBackName || '');
    setIdentityBackUrl(u.identityBackUrl || '');
    setIdentityVerificationStatus(
      u.identityVerificationStatus || (u.identityFrontUrl || u.cin ? 'DEPOSE' : 'MANQUANT')
    );
    setPreferredLanguage(u.preferredLanguage || 'Français');
    setAdministrativeNotes(u.administrativeNotes || '');

    // Onglet 2
    setEmail(u.email || '');
    setPersonalEmail(u.personalEmail || '');
    setPhone(u.phone || (u.phones && u.phones[0]) || '');
    setSecondaryPhone(u.secondaryPhone || (u.phones && u.phones[1]) || '');
    setWhatsappPhone(u.whatsappPhone || u.secondaryPhone || u.phone || '');
    setLinkedInUrl(u.linkedInUrl || '');
    setOrcidUrl(u.orcidUrl || '');
    setWebsiteUrl(u.websiteUrl || '');

    const permAddr: StudentAddress = u.permanentAddress || {
      addressLine: u.address || '',
      lotNumber: '',
      neighborhood: '',
      commune: u.city || 'Antananarivo',
      district: 'Antananarivo Renivohitra',
      region: 'Analamanga',
      country: 'Madagascar',
      postalCode: u.postalCode || '101',
    };
    setPermanentAddress(permAddr);
    const isSame = u.sameAsPermanentAddress ?? true;
    setSameAsPermanentAddress(isSame);
    setCurrentAddress(isSame ? { ...permAddr } : u.currentAddress || { ...permAddr });

    // Onglet 3
    if (u.parentContacts && u.parentContacts.length > 0) {
      setParentContacts(
        u.parentContacts.map((p, idx) => ({
          ...p,
          isPrimaryContact: p.isPrimaryContact ?? idx === 0,
          isEmergencyContact: p.isEmergencyContact ?? idx === 0,
          isLegalGuardian: p.isLegalGuardian ?? true,
          receiveAcademicInfo: p.receiveAcademicInfo ?? true,
        }))
      );
    } else {
      setParentContacts([]);
    }

    // Onglet 4
    setMatricule(u.matricule || u.username || '');
    setFirstRegistrationDate(u.firstRegistrationDate || '2025-10-01');
    setReRegistrationDate(u.reRegistrationDate || '2026-09-15');
    setAdmissionType(u.admissionType || 'DOSSIER');
    setRegistrationStatus(u.registrationStatus || (u.isActive ? 'CONFIRMED' : 'SUSPENDED'));
    setTrainingMode(u.trainingMode || 'PRESENTIEL');
    setGroupId(u.groupId || '');
    setParcoursId(u.parcoursId || '');
    const grp = groups.find((g) => g.id === u.groupId);
    const inferredDegree =
      grp?.code?.startsWith('M') ? 'MASTER' : grp?.code?.startsWith('ING') ? 'INGENIEUR' : 'LICENCE';
    setTargetDegree(u.targetDegree || inferredDegree);
    setCurrentSemesterCode(u.currentSemesterCode || 'S1');
    setTrainingRegime(u.trainingRegime || 'INITIAL');

    if (u.previousDiplomas && u.previousDiplomas.length > 0) {
      setPreviousDiplomas(u.previousDiplomas);
    } else if (u.bacSeries || u.originSchool) {
      setPreviousDiplomas([
        {
          id: 'dipl-bac-init',
          category: 'BACCALAUREAT',
          title: `Baccalauréat ${u.bacSeries || 'Enseignement Général'}`,
          institution: u.originSchool || 'Lycée d’origine',
          country: 'Madagascar',
          year: '2024',
          series: u.bacSeries || 'Série C/D',
          honors: 'Assez Bien',
          verificationStatus: 'VALIDE',
        },
      ]);
    } else {
      setPreviousDiplomas([]);
    }

    // Onglet 5
    setEmploymentStatus(u.employmentStatus || 'ETUDIANT_TEMPS_PLEIN');
    setProfession(u.profession || '');
    setEmployer(u.employer || '');
    setJobFunction(u.jobFunction || '');
    setActivitySector(u.activitySector || '');
    setWorkAddress(u.workAddress || '');
    setWorkPhone(u.workPhone || '');
    setWorkEmail(u.workEmail || '');
    setWorkExperience(u.workExperience || '');
    setIsWorkingStudent(Boolean(u.isWorkingStudent));
    setIsEntrepreneur(Boolean(u.isEntrepreneur));
    setIsContinuingEducation(Boolean(u.isContinuingEducation));
    setSecondFiliere(u.secondFiliere || '');

    // Onglet 6
    const existingDocs = u.studentDocuments || [];
    const hydratedDocs: StudentAdminDocument[] = REQUIRED_DOCUMENT_CATALOG.map((cat) => {
      const found = existingDocs.find((d) => d.type === cat.type);
      if (found) return found;
      if (cat.type === 'PHOTO_IDENTITE' && (u.photoUrl || u.avatar)) {
        return {
          id: `doc-${cat.type}`,
          type: cat.type,
          label: cat.label,
          fileName: 'photo_identite.jpg',
          fileUrl: u.photoUrl || u.avatar,
          uploadedAt: u.updatedAt || new Date().toISOString().slice(0, 10),
          status: 'VALIDE',
        };
      }
      if (cat.type === 'PIECE_IDENTITE' && u.identityFrontUrl) {
        return {
          id: `doc-${cat.type}`,
          type: cat.type,
          label: cat.label,
          fileName: u.identityFrontName || 'piece_identite.pdf',
          fileUrl: u.identityFrontUrl,
          uploadedAt: u.updatedAt || new Date().toISOString().slice(0, 10),
          status: u.identityVerificationStatus || 'DEPOSE',
        };
      }
      return {
        id: `doc-${cat.type}`,
        type: cat.type,
        label: cat.label,
        status: 'MANQUANT',
      };
    });
    setStudentDocuments(hydratedDocs);

    // Onglet 7
    setMoodleUsername(u.moodleUsername || (u.matricule ? u.matricule.toLowerCase() : u.username));
    setMoodleLinked(u.moodleLinked ?? true);
    setEmailVerified(u.emailVerified ?? true);
    setIsAdult(u.isAdult ?? true);
    setParentConsent({
      academic: u.parentAccessConsent?.academic ?? true,
      attendance: u.parentAccessConsent?.attendance ?? true,
      financial: u.parentAccessConsent?.financial ?? true,
      administrative: u.parentAccessConsent?.administrative ?? true,
    });

    setIsDirty(false);
  };

  useEffect(() => {
    hydrateFromStudent(student);
  }, [student.id]);

  const markDirty = () => {
    if (!isDirty) setIsDirty(true);
  };

  // Academic context metadata
  const currentGroup = groups.find((g) => g.id === (groupId || student.groupId));
  const currentFiliere = filieres.find((f) => f.id === currentGroup?.filiereId);
  const currentParcours = parcours.find(
    (p) => p.id === (parcoursId || student.parcoursId || currentGroup?.parcoursId)
  );
  const completeness = useMemo(() => computeStudentDossierCompleteness(student), [student]);

  const studentPendingRequests = useMemo(
    () => profileChangeRequests.filter((r) => r.studentId === student.id),
    [profileChangeRequests, student.id]
  );

  // File upload helper (reads file as DataURL for instant preview & persistence)
  const handleFileUpload = (
    file: File,
    onLoaded: (fileName: string, dataUrl: string, sizeLabel: string) => void
  ) => {
    if (file.size > 2 * 1024 * 1024) {
      showAppToast({
        type: 'error',
        title: 'Fichier trop volumineux',
        message: 'La taille maximale par justificatif est de 2 Mo.',
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const sizeKb = Math.max(1, Math.round(file.size / 1024));
      onLoaded(file.name, result, `${sizeKb} Ko`);
      markDirty();
    };
    reader.readAsDataURL(file);
  };

  // Save handler (respects Section 6 permissions: Self-service vs Administration)
  const handleSaveDossier = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!canEditDossier) return;

    const resolvedPermAddress: StudentAddress = { ...permanentAddress };
    const resolvedCurrAddress: StudentAddress = sameAsPermanentAddress
      ? { ...permanentAddress }
      : { ...currentAddress };

    const formattedFullAddress = [
      resolvedCurrAddress.lotNumber,
      resolvedCurrAddress.addressLine,
      resolvedCurrAddress.neighborhood,
    ]
      .filter(Boolean)
      .join(' — ');

    const phonesList = [phone.trim(), secondaryPhone.trim(), whatsappPhone.trim()].filter(Boolean);

    // Fields editable in both Self-Service and Administration
    const updates: Partial<User> = {
      photoUrl: photoUrl || undefined,
      avatar: photoUrl || undefined,
      preferredName: preferredName.trim() || undefined,
      maritalStatus,
      preferredLanguage: preferredLanguage.trim() || 'Français',
      identityFrontName: identityFrontName || undefined,
      identityFrontUrl: identityFrontUrl || undefined,
      identityBackName: identityBackName || undefined,
      identityBackUrl: identityBackUrl || undefined,
      personalEmail: personalEmail.trim() || undefined,
      phone: phone.trim() || undefined,
      secondaryPhone: secondaryPhone.trim() || undefined,
      whatsappPhone: whatsappPhone.trim() || undefined,
      phones: phonesList,
      linkedInUrl: linkedInUrl.trim() || undefined,
      orcidUrl: orcidUrl.trim() || undefined,
      websiteUrl: websiteUrl.trim() || undefined,
      permanentAddress: resolvedPermAddress,
      currentAddress: resolvedCurrAddress,
      sameAsPermanentAddress,
      address: formattedFullAddress || student.address,
      city: resolvedCurrAddress.commune || student.city || 'Antananarivo',
      postalCode: resolvedCurrAddress.postalCode || student.postalCode || '101',
      parentContacts,
      previousDiplomas,
      employmentStatus,
      profession: profession.trim() || undefined,
      employer: employer.trim() || undefined,
      jobFunction: jobFunction.trim() || undefined,
      activitySector: activitySector.trim() || undefined,
      workAddress: workAddress.trim() || undefined,
      workPhone: workPhone.trim() || undefined,
      workEmail: workEmail.trim() || undefined,
      workExperience: workExperience.trim() || undefined,
      isWorkingStudent,
      isEntrepreneur,
      isContinuingEducation,
      secondFiliere: secondFiliere.trim() || undefined,
      studentDocuments,
      isAdult,
      parentAccessConsent: parentConsent,
      updatedAt: new Date().toISOString(),
    };

    // Protected fields directly editable by Administration (Section 6.2 & 6.3)
    if (isAdminMode) {
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim() || student.name;
      const firstBac = previousDiplomas.find((d) => d.category === 'BACCALAUREAT');

      Object.assign(updates, {
        civilite,
        name: fullName,
        lastName: lastName.trim() || undefined,
        firstName: firstName.trim() || undefined,
        gender,
        birthDate: birthDate || student.birthDate,
        birthPlace: birthPlace.trim() || undefined,
        birthCountry: birthCountry.trim() || undefined,
        nationality: nationality.trim() || undefined,
        secondaryNationality: secondaryNationality.trim() || undefined,
        identityDocType,
        identityDocOtherLabel: identityDocOtherLabel.trim() || undefined,
        cin: cin.trim() || undefined,
        identityIssueDate: identityIssueDate || undefined,
        identityIssuePlace: identityIssuePlace.trim() || undefined,
        identityIssuingAuthority: identityIssuingAuthority.trim() || undefined,
        identityIssuingCountry: identityIssuingCountry.trim() || undefined,
        identityExpiryDate: identityExpiryDate || undefined,
        identityVerificationStatus,
        administrativeNotes: administrativeNotes.trim() || undefined,
        email: email.trim() || student.email,
        matricule: matricule.trim() || student.matricule,
        firstRegistrationDate: firstRegistrationDate || undefined,
        reRegistrationDate: reRegistrationDate || undefined,
        admissionType,
        registrationStatus,
        trainingMode,
        groupId: groupId || student.groupId,
        parcoursId: parcoursId || student.parcoursId,
        targetDegree,
        currentSemesterCode,
        trainingRegime,
        bacSeries: firstBac?.series || student.bacSeries,
        originSchool: firstBac?.institution || student.originSchool,
        moodleUsername: moodleUsername.trim() || undefined,
        moodleLinked,
        emailVerified,
      });
    }

    updateUser(student.id, updates);
    setIsDirty(false);
    setIsEditing(false);
    setSavedBanner({
      type: 'success',
      text: 'Le dossier étudiant unique a été enregistré et synchronisé en temps réel.',
    });
    showAppToast({
      type: 'success',
      title: 'Dossier étudiant mis à jour',
      message: `Les modifications du dossier de ${student.name} sont synchronisées.`,
    });
    setTimeout(() => setSavedBanner(null), 4000);
  };

  const handleCancelEdit = () => {
    hydrateFromStudent(student);
    setIsEditing(false);
    setIsDirty(false);
  };

  const handlePrintSheet = () => {
    window.print();
  };

  // Parent contacts management (Tab 3)
  const handleAddParentContact = () => {
    const isFirst = parentContacts.length === 0;
    const next: ParentContact = {
      id: `parent-${Date.now()}`,
      nom: '',
      prenoms: '',
      relation: isFirst ? 'PERE' : 'MERE',
      phone: '',
      secondaryPhone: '',
      email: '',
      profession: '',
      address: permanentAddress.addressLine || '',
      isPrimaryContact: isFirst,
      isEmergencyContact: isFirst,
      isLegalGuardian: true,
      receiveAcademicInfo: true,
    };
    setParentContacts((prev) => [...prev, next]);
    markDirty();
  };

  const handleUpdateParentContact = (idx: number, patch: Partial<ParentContact>) => {
    setParentContacts((prev) =>
      prev.map((item, i) => {
        if (i === idx) {
          return { ...item, ...patch };
        }
        // Only one primary contact at a time if toggled true
        if (patch.isPrimaryContact && item.isPrimaryContact) {
          return { ...item, isPrimaryContact: false };
        }
        return item;
      })
    );
    markDirty();
  };

  const handleRemoveParentContact = (idx: number) => {
    setParentContacts((prev) => prev.filter((_, i) => i !== idx));
    markDirty();
  };

  // Previous diplomas management (Tab 4)
  const handleAddDiploma = () => {
    const next: StudentPreviousDiploma = {
      id: `dipl-${Date.now()}`,
      category: previousDiplomas.length === 0 ? 'BACCALAUREAT' : 'LICENCE',
      title: '',
      institution: '',
      country: 'Madagascar',
      year: '2024',
      series: '',
      diplomaNumber: '',
      honors: 'Assez Bien',
      verificationStatus: 'EN_ATTENTE',
    };
    setPreviousDiplomas((prev) => [...prev, next]);
    markDirty();
  };

  const handleUpdateDiploma = (idx: number, patch: Partial<StudentPreviousDiploma>) => {
    setPreviousDiplomas((prev) => prev.map((d, i) => (i === idx ? { ...d, ...patch } : d)));
    markDirty();
  };

  const handleRemoveDiploma = (idx: number) => {
    setPreviousDiplomas((prev) => prev.filter((_, i) => i !== idx));
    markDirty();
  };

  // Documents management (Tab 6)
  const handleUploadAdminDoc = (docType: StudentAdminDocumentType, file: File) => {
    handleFileUpload(file, (fileName, dataUrl, sizeLabel) => {
      const today = new Date().toISOString().slice(0, 10);
      setStudentDocuments((prev) =>
        prev.map((doc) =>
          doc.type === docType
            ? {
                ...doc,
                fileName,
                fileUrl: dataUrl,
                fileSize: sizeLabel,
                uploadedAt: today,
                status: isAdminMode ? 'VALIDE' : 'EN_ATTENTE',
                verifiedAt: isAdminMode ? today : undefined,
                verifiedBy: isAdminMode ? currentUser.name : undefined,
                rejectionReason: undefined,
              }
            : doc
        )
      );
      if (docType === 'PHOTO_IDENTITE') {
        setPhotoUrl(dataUrl);
      }
      if (docType === 'PIECE_IDENTITE') {
        setIdentityFrontName(fileName);
        setIdentityFrontUrl(dataUrl);
        setIdentityVerificationStatus(isAdminMode ? 'VALIDE' : 'EN_ATTENTE');
      }
    });
  };

  const handleVerifyAdminDoc = (
    docType: StudentAdminDocumentType,
    newStatus: DocumentVerificationStatus,
    reason?: string
  ) => {
    if (!isAdminMode) return;
    const today = new Date().toISOString().slice(0, 10);
    const updatedDocs = studentDocuments.map((doc) =>
      doc.type === docType
        ? {
            ...doc,
            status: newStatus,
            verifiedAt: today,
            verifiedBy: currentUser.name,
            rejectionReason: newStatus === 'REJETE' || newStatus === 'A_REMPLACER' ? reason : undefined,
          }
        : doc
    );
    setStudentDocuments(updatedDocs);
    const extraUpdates: Partial<User> = { studentDocuments: updatedDocs };
    if (docType === 'PIECE_IDENTITE') {
      setIdentityVerificationStatus(newStatus);
      extraUpdates.identityVerificationStatus = newStatus;
    }
    updateUser(student.id, extraUpdates);
    setRejectingDocId(null);
    setRejectDocReason('');
    showAppToast({
      type: newStatus === 'VALIDE' ? 'success' : 'info',
      title: 'Statut du justificatif mis à jour',
      message: `Le document a été marqué comme « ${DOC_STATUS_CONFIG[newStatus].label} ».`,
    });
  };

  const generateRandomPassword = () => {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghijkmnpqrstuvwxyz';
    const digits = '23456789';
    const pick = (chars: string, len: number) =>
      Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `Ebm@2026-${pick(upper, 2)}${pick(digits, 3)}${pick(lower, 2)}`;
  };

  const renderReadOnlyOrEmpty = (val?: string | number | null, mono = false) => {
    if (val === undefined || val === null || String(val).trim() === '') {
      return <span className="text-slate-400 italic font-normal">Non renseigné</span>;
    }
    return <span className={`font-semibold text-slate-900 ${mono ? 'font-mono' : ''}`}>{val}</span>;
  };

  // Protected fields list for student validation requests
  const PROTECTED_FIELD_OPTIONS: { field: string; label: string; currentVal: string }[] = [
    { field: 'name', label: 'Nom complet officiel', currentVal: student.name || '' },
    { field: 'lastName', label: 'Nom de famille', currentVal: lastName || '' },
    { field: 'firstName', label: 'Prénoms', currentVal: firstName || '' },
    { field: 'birthDate', label: 'Date de naissance', currentVal: birthDate || '' },
    { field: 'birthPlace', label: 'Lieu de naissance', currentVal: birthPlace || '' },
    { field: 'nationality', label: 'Nationalité', currentVal: nationality || '' },
    { field: 'cin', label: 'Numéro CIN / Passeport', currentVal: cin || '' },
    { field: 'identityIssueDate', label: 'Date de délivrance CIN/Passeport', currentVal: identityIssueDate || '' },
    { field: 'identityIssuePlace', label: 'Lieu de délivrance CIN/Passeport', currentVal: identityIssuePlace || '' },
  ];

  const TABS_LIST: { id: StudentDossierTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'TAB_1_IDENTITY', label: '1. Identité & État civil', icon: <UserIcon className="w-3.5 h-3.5" /> },
    { id: 'TAB_2_CONTACT', label: '2. Coordonnées', icon: <MapPin className="w-3.5 h-3.5" /> },
    {
      id: 'TAB_3_PARENTS',
      label: '3. Parents & Tuteurs',
      icon: <Users className="w-3.5 h-3.5" />,
      badge: parentContacts.length,
    },
    { id: 'TAB_4_ACADEMIC', label: '4. Parcours académique', icon: <GraduationCap className="w-3.5 h-3.5" /> },
    { id: 'TAB_5_PROFESSIONAL', label: '5. Situation perso. & pro.', icon: <Briefcase className="w-3.5 h-3.5" /> },
    {
      id: 'TAB_6_DOCUMENTS',
      label: '6. Documents & Justificatifs',
      icon: <FileText className="w-3.5 h-3.5" />,
      badge: studentDocuments.filter((d) => d.status !== 'MANQUANT').length,
    },
    {
      id: 'TAB_7_SECURITY',
      label: '7. Compte & Sécurité',
      icon: <Shield className="w-3.5 h-3.5" />,
      badge: studentPendingRequests.filter((r) => r.status === 'PENDING').length || undefined,
    },
  ];

  if (showAcademicAndFinanceExtensions) {
    if (!isFinanceRole) {
      TABS_LIST.push({
        id: 'EXT_GRADES',
        label: 'Notes & Délibération',
        icon: <Award className="w-3.5 h-3.5 text-amber-600" />,
      });
    }
    TABS_LIST.push({
      id: 'EXT_FINANCES',
      label: 'Finances & Écolages',
      icon: <CreditCard className="w-3.5 h-3.5 text-emerald-600" />,
    });
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:bg-white print:p-0">
      <div className="bg-white rounded-3xl max-w-6xl w-full shadow-2xl border border-[#DCE3EC] overflow-hidden my-2 max-h-[94vh] flex flex-col print:max-h-none print:shadow-none print:border-none">
        {/* =====================================================================
            SECTION 5 : EN-TÊTE COMMUN DU DOSSIER ÉTUDIANT + JAUGE DE COMPLÉTUDE
           ===================================================================== */}
        <div className="p-4 sm:p-6 bg-[#17345B] text-white border-b border-white/10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Left: Photo + Identity + Academic Context */}
            <div className="flex items-start sm:items-center gap-4 min-w-0">
              <div className="relative group shrink-0">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt={student.name}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-white/30 shadow-md"
                  />
                ) : (
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#2F6FED] border-2 border-blue-300/40 flex items-center justify-center font-black text-2xl text-white shadow-md">
                    {student.name.substring(0, 2).toUpperCase()}
                  </div>
                )}
                {isEditing && canEditDossier && (
                  <label
                    title="Changer la photo d'identité"
                    className="absolute -bottom-1.5 -right-1.5 p-1.5 bg-[#2F6FED] hover:bg-blue-500 text-white rounded-xl shadow-lg cursor-pointer border border-white/40 transition-transform hover:scale-105"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleUploadAdminDoc('PHOTO_IDENTITE', file);
                        }
                      }}
                    />
                  </label>
                )}
              </div>

              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="px-2.5 py-0.5 bg-[#2F6FED] text-white rounded-md text-[11px] font-mono font-bold tracking-wide">
                    {student.matricule || student.username}
                  </span>
                  <span className="px-2.5 py-0.5 bg-white/15 text-blue-100 rounded-md text-[10px] font-bold uppercase tracking-wider">
                    Dossier Étudiant Unique • {isAdminMode ? 'Vue Administration' : 'Espace Personnel'}
                  </span>
                  {student.isActive !== false ? (
                    <span className="px-2.5 py-0.5 bg-[#1F8A83] text-white rounded-md text-[10px] font-bold">
                      Inscrit / Actif
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 bg-rose-600 text-white rounded-md text-[10px] font-bold">
                      Suspendu
                    </span>
                  )}
                  {isEditing && isDirty && (
                    <span className="px-2.5 py-0.5 bg-[#D58A18] text-white rounded-md text-[10px] font-bold flex items-center gap-1 animate-pulse">
                      <AlertTriangle className="w-3 h-3" />
                      Modifications non enregistrées
                    </span>
                  )}
                </div>

                <h2 className="text-lg sm:text-xl font-black tracking-tight text-white truncate">
                  {civilite ? `${civilite} ` : ''}
                  {student.name}
                  {preferredName ? (
                    <span className="text-xs font-normal text-blue-200 ml-2">
                      (Nom d’usage : {preferredName})
                    </span>
                  ) : null}
                </h2>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-blue-100">
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-blue-300" />
                    {student.email}
                  </span>
                  <span>•</span>
                  <span className="font-semibold text-white">
                    {currentFiliere?.name || 'Filière EBM'}
                  </span>
                  <span>•</span>
                  <span>
                    Parcours : <strong className="text-white">{currentParcours?.code || 'Tronc Commun'}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Groupe : <strong className="text-white">{currentGroup?.code || 'Non affecté'}</strong> (Sem.{' '}
                    {currentSemesterCode})
                  </span>
                  <span>•</span>
                  <span className="font-mono text-[11px] bg-white/10 px-2 py-0.5 rounded">
                    Année {selectedAcademicYear}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Section 5.2 Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 shrink-0 print:hidden">
              {onOpenCardModal && (
                <button
                  type="button"
                  onClick={() => onOpenCardModal(student)}
                  className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  Carte Étudiant
                </button>
              )}

              <button
                type="button"
                onClick={handlePrintSheet}
                className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Imprimer la fiche officielle du dossier étudiant"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimer la fiche
              </button>

              {canEditDossier && !isEditing && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-[#2F6FED] hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Modifier
                </button>
              )}

              {canEditDossier && isEditing && (
                <>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveDossier()}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Enregistrer
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={onClose}
                className="p-2 text-blue-200 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                title="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Section 5.3 : Indicateur de complétude du dossier étudiant */}
          <div className="mt-4 pt-3 border-t border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-bold text-blue-100 flex items-center gap-2">
                  <span>Dossier étudiant : {completeness.percentage} % complet</span>
                  <span className="text-[11px] font-normal text-blue-200">
                    ({completeness.completedCount}/{completeness.totalRequired} éléments obligatoires renseignés)
                  </span>
                </span>
                {completeness.missingItems.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowMissingDetails(!showMissingDetails)}
                    className="text-[11px] font-bold text-amber-300 hover:text-amber-200 underline cursor-pointer print:hidden"
                  >
                    {showMissingDetails
                      ? 'Masquer les éléments manquants'
                      : `Voir les ${completeness.missingItems.length} élément(s) à compléter`}
                  </button>
                )}
              </div>
              <div className="w-full h-2 bg-white/15 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    completeness.percentage >= 85
                      ? 'bg-emerald-400'
                      : completeness.percentage >= 55
                      ? 'bg-amber-400'
                      : 'bg-rose-400'
                  }`}
                  style={{ width: `${completeness.percentage}%` }}
                />
              </div>
            </div>
          </div>

          {showMissingDetails && completeness.missingItems.length > 0 && (
            <div className="mt-2.5 p-3 bg-white/10 border border-white/20 rounded-xl text-xs">
              <span className="font-bold text-amber-300 block mb-1">
                Éléments restants à compléter ou justificatifs à déposer :
              </span>
              <div className="flex flex-wrap gap-1.5">
                {completeness.missingItems.map((item, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 bg-white/15 text-white rounded-md text-[11px] font-medium"
                  >
                    • {item}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* =====================================================================
            BARRE DES 7 ONGLETS OBLIGATOIRES COMMUNS (Section 3)
           ===================================================================== */}
        <div className="flex overflow-x-auto border-b border-[#DCE3EC] bg-[#F5F7FA] px-4 pt-2 text-xs font-bold gap-1.5 shrink-0 print:hidden">
          {TABS_LIST.map((t) => {
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`py-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'border-[#2F6FED] text-[#2F6FED] bg-white rounded-t-xl shadow-2xs'
                    : 'border-transparent text-slate-600 hover:text-[#16202A] hover:bg-white/50 rounded-t-xl'
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
                {t.badge !== undefined && t.badge > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      isActive ? 'bg-blue-100 text-[#2F6FED]' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {t.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* =====================================================================
            CORPS DU DOSSIER ÉTUDIANT (CONTENU DES 7 ONGLETS)
           ===================================================================== */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto space-y-5 bg-slate-50/40">
          {savedBanner && (
            <div
              className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between gap-2 ${
                savedBanner.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{savedBanner.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setSavedBanner(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>
          )}

          {/* Notice for Student Self-Service Mode on Protected Fields */}
          {isSelfService && isEditing && (
            <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-blue-900">
              <div className="flex items-start gap-2.5">
                <Shield className="w-4 h-4 text-[#2F6FED] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Règle de gestion du dossier officiel : </span>
                  Vous pouvez modifier directement vos coordonnées, adresses, contacts parents, situation professionnelle et téléverser vos justificatifs. Les champs d'état civil et d'affectation académique nécessitent une demande de validation administrative (Onglet 7).
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('TAB_7_SECURITY')}
                className="px-3 py-1.5 bg-[#2F6FED] text-white font-bold rounded-xl whitespace-nowrap cursor-pointer text-[11px]"
              >
                Demander une rectification officielle
              </button>
            </div>
          )}

          {/* =================================================================
              ONGLET 1 – IDENTITÉ & ÉTAT CIVIL
             ================================================================= */}
          {activeTab === 'TAB_1_IDENTITY' && (
            <div className="space-y-5 text-xs">
              {/* A. Identité personnelle */}
              <div className="bg-white p-5 rounded-2xl border border-[#DCE3EC] shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-black text-[#17345B] uppercase tracking-wider">
                      A. Identité personnelle & État civil
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Informations officielles figurant sur l’acte de naissance et les diplômes.
                    </p>
                  </div>
                  {isSelfService && (
                    <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-[10px] font-bold">
                      État civil soumis à validation administrative
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Civilité
                    </label>
                    {isEditing && isAdminMode ? (
                      <select
                        value={civilite}
                        onChange={(e) => {
                          setCivilite(e.target.value as any);
                          markDirty();
                        }}
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                      >
                        <option value="M.">M.</option>
                        <option value="Mme">Mme</option>
                        <option value="Mlle">Mlle</option>
                      </select>
                    ) : (
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        {renderReadOnlyOrEmpty(civilite)}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Nom de famille *
                    </label>
                    {isEditing && isAdminMode ? (
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => {
                          setLastName(e.target.value);
                          markDirty();
                        }}
                        placeholder="RAKOTO"
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold uppercase"
                      />
                    ) : (
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        {renderReadOnlyOrEmpty(lastName)}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Prénoms *
                    </label>
                    {isEditing && isAdminMode ? (
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => {
                          setFirstName(e.target.value);
                          markDirty();
                        }}
                        placeholder="Jean"
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-semibold"
                      />
                    ) : (
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        {renderReadOnlyOrEmpty(firstName)}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Nom d’usage (modifiable)
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={preferredName}
                        onChange={(e) => {
                          setPreferredName(e.target.value);
                          markDirty();
                        }}
                        placeholder="Nom d'usage éventuel"
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-medium"
                      />
                    ) : (
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        {renderReadOnlyOrEmpty(preferredName)}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Sexe *
                    </label>
                    {isEditing && isAdminMode ? (
                      <select
                        value={gender}
                        onChange={(e) => {
                          setGender(e.target.value as 'M' | 'F' | 'AUTRE');
                          markDirty();
                        }}
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-semibold"
                      >
                        <option value="M">Masculin (M)</option>
                        <option value="F">Féminin (F)</option>
                        <option value="AUTRE">Autre</option>
                      </select>
                    ) : (
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        {renderReadOnlyOrEmpty(
                          gender === 'M' ? 'Masculin (M)' : gender === 'F' ? 'Féminin (F)' : 'Autre'
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Date de naissance *
                    </label>
                    {isEditing && isAdminMode ? (
                      <input
                        type="date"
                        value={birthDate}
                        onChange={(e) => {
                          setBirthDate(e.target.value);
                          markDirty();
                        }}
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-semibold"
                      />
                    ) : (
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        {renderReadOnlyOrEmpty(birthDate, true)}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Lieu de naissance *
                    </label>
                    {isEditing && isAdminMode ? (
                      <input
                        type="text"
                        value={birthPlace}
                        onChange={(e) => {
                          setBirthPlace(e.target.value);
                          markDirty();
                        }}
                        placeholder="Antananarivo"
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-semibold"
                      />
                    ) : (
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        {renderReadOnlyOrEmpty(birthPlace)}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Pays de naissance
                    </label>
                    {isEditing && isAdminMode ? (
                      <input
                        type="text"
                        value={birthCountry}
                        onChange={(e) => {
                          setBirthCountry(e.target.value);
                          markDirty();
                        }}
                        placeholder="Madagascar"
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-semibold"
                      />
                    ) : (
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        {renderReadOnlyOrEmpty(birthCountry)}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Nationalité principale *
                    </label>
                    {isEditing && isAdminMode ? (
                      <input
                        type="text"
                        value={nationality}
                        onChange={(e) => {
                          setNationality(e.target.value);
                          markDirty();
                        }}
                        placeholder="Malagasy"
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-semibold"
                      />
                    ) : (
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        {renderReadOnlyOrEmpty(nationality)}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Nationalité secondaire
                    </label>
                    {isEditing && isAdminMode ? (
                      <input
                        type="text"
                        value={secondaryNationality}
                        onChange={(e) => {
                          setSecondaryNationality(e.target.value);
                          markDirty();
                        }}
                        placeholder="Optionnel"
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-medium"
                      />
                    ) : (
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        {renderReadOnlyOrEmpty(secondaryNationality)}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Situation matrimoniale
                    </label>
                    {isEditing ? (
                      <select
                        value={maritalStatus}
                        onChange={(e) => {
                          setMaritalStatus(e.target.value as any);
                          markDirty();
                        }}
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-semibold"
                      >
                        <option value="CELIBATAIRE">Célibataire</option>
                        <option value="MARIE">Marié(e)</option>
                        <option value="DIVORCE">Divorcé(e)</option>
                        <option value="VEUF">Veuf / Veuve</option>
                        <option value="AUTRE">Autre</option>
                      </select>
                    ) : (
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        {renderReadOnlyOrEmpty(
                          maritalStatus === 'CELIBATAIRE'
                            ? 'Célibataire'
                            : maritalStatus === 'MARIE'
                            ? 'Marié(e)'
                            : maritalStatus === 'DIVORCE'
                            ? 'Divorcé(e)'
                            : maritalStatus === 'VEUF'
                            ? 'Veuf / Veuve'
                            : 'Autre'
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* B. Pièce d'identité (choix dynamique) */}
              <div className="bg-white p-5 rounded-2xl border border-[#DCE3EC] shadow-2xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-black text-[#17345B] uppercase tracking-wider">
                      B. Pièce d’identité officielle (Choix dynamique)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Carte d’Identité Nationale (CIN), Passeport ou autre document officiel avec copies recto/verso.
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                      DOC_STATUS_CONFIG[identityVerificationStatus].badgeClass
                    }`}
                  >
                    Statut vérification : {DOC_STATUS_CONFIG[identityVerificationStatus].label}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Type de pièce d’identité
                    </label>
                    {isEditing && isAdminMode ? (
                      <select
                        value={identityDocType}
                        onChange={(e) => {
                          setIdentityDocType(e.target.value as 'CIN' | 'PASSEPORT' | 'AUTRE');
                          markDirty();
                        }}
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold"
                      >
                        <option value="CIN">Carte d’Identité Nationale (CIN)</option>
                        <option value="PASSEPORT">Passeport</option>
                        <option value="AUTRE">Autre document officiel</option>
                      </select>
                    ) : (
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        {renderReadOnlyOrEmpty(
                          identityDocType === 'CIN'
                            ? 'Carte d’Identité Nationale (CIN)'
                            : identityDocType === 'PASSEPORT'
                            ? 'Passeport'
                            : `Autre (${identityDocOtherLabel || 'Document officiel'})`
                        )}
                      </div>
                    )}
                  </div>

                  {identityDocType === 'AUTRE' && (
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                        Préciser le type de document
                      </label>
                      {isEditing && isAdminMode ? (
                        <input
                          type="text"
                          value={identityDocOtherLabel}
                          onChange={(e) => {
                            setIdentityDocOtherLabel(e.target.value);
                            markDirty();
                          }}
                          placeholder="Carte de résident, Acte..."
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                        />
                      ) : (
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                          {renderReadOnlyOrEmpty(identityDocOtherLabel)}
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Numéro de la pièce ({identityDocType}) *
                    </label>
                    {isEditing && isAdminMode ? (
                      <input
                        type="text"
                        value={cin}
                        onChange={(e) => {
                          setCin(e.target.value);
                          markDirty();
                        }}
                        placeholder="101 231 456 789"
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono font-bold"
                      />
                    ) : (
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        {renderReadOnlyOrEmpty(cin, true)}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Date de délivrance
                    </label>
                    {isEditing && isAdminMode ? (
                      <input
                        type="date"
                        value={identityIssueDate}
                        onChange={(e) => {
                          setIdentityIssueDate(e.target.value);
                          markDirty();
                        }}
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                      />
                    ) : (
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        {renderReadOnlyOrEmpty(identityIssueDate, true)}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Lieu de délivrance
                    </label>
                    {isEditing && isAdminMode ? (
                      <input
                        type="text"
                        value={identityIssuePlace}
                        onChange={(e) => {
                          setIdentityIssuePlace(e.target.value);
                          markDirty();
                        }}
                        placeholder="Firaisana Antananarivo I"
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                      />
                    ) : (
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        {renderReadOnlyOrEmpty(identityIssuePlace)}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Autorité de délivrance
                    </label>
                    {isEditing && isAdminMode ? (
                      <input
                        type="text"
                        value={identityIssuingAuthority}
                        onChange={(e) => {
                          setIdentityIssuingAuthority(e.target.value);
                          markDirty();
                        }}
                        placeholder="Chef de District / Ministère"
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                      />
                    ) : (
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        {renderReadOnlyOrEmpty(identityIssuingAuthority)}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Pays émetteur
                    </label>
                    {isEditing && isAdminMode ? (
                      <input
                        type="text"
                        value={identityIssuingCountry}
                        onChange={(e) => {
                          setIdentityIssuingCountry(e.target.value);
                          markDirty();
                        }}
                        placeholder="Madagascar"
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                      />
                    ) : (
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        {renderReadOnlyOrEmpty(identityIssuingCountry)}
                      </div>
                    )}
                  </div>

                  {(identityDocType === 'PASSEPORT' || identityDocType === 'AUTRE') && (
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                        Date d’expiration
                      </label>
                      {isEditing && isAdminMode ? (
                        <input
                          type="date"
                          value={identityExpiryDate}
                          onChange={(e) => {
                            setIdentityExpiryDate(e.target.value);
                            markDirty();
                          }}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                        />
                      ) : (
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                          {renderReadOnlyOrEmpty(identityExpiryDate, true)}
                        </div>
                      )}
                    </div>
                  )}

                  {isAdminMode && isEditing && (
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                        Statut de vérification (Scolarité)
                      </label>
                      <select
                        value={identityVerificationStatus}
                        onChange={(e) => {
                          setIdentityVerificationStatus(e.target.value as DocumentVerificationStatus);
                          markDirty();
                        }}
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold"
                      >
                        {Object.entries(DOC_STATUS_CONFIG).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Copies Recto / Verso */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">
                        Copie Recto ({identityDocType})
                      </span>
                      <span className="font-semibold text-slate-800 block truncate max-w-[220px]">
                        {identityFrontName || 'Aucun fichier déposé'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {identityFrontUrl && (
                        <a
                          href={identityFrontUrl}
                          download={identityFrontName || 'recto_identite'}
                          className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-700 font-bold flex items-center gap-1 hover:bg-slate-100"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Voir
                        </a>
                      )}
                      {isEditing && (
                        <label className="px-3 py-1.5 bg-[#2F6FED] hover:bg-blue-700 text-white rounded-lg font-bold cursor-pointer flex items-center gap-1">
                          <Upload className="w-3.5 h-3.5" />
                          <span>Déposer</span>
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) {
                                handleFileUpload(f, (name, url) => {
                                  setIdentityFrontName(name);
                                  setIdentityFrontUrl(url);
                                  setIdentityVerificationStatus(isAdminMode ? 'VALIDE' : 'EN_ATTENTE');
                                });
                              }
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">
                        Copie Verso ({identityDocType})
                      </span>
                      <span className="font-semibold text-slate-800 block truncate max-w-[220px]">
                        {identityBackName || 'Aucun fichier déposé'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {identityBackUrl && (
                        <a
                          href={identityBackUrl}
                          download={identityBackName || 'verso_identite'}
                          className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-700 font-bold flex items-center gap-1 hover:bg-slate-100"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Voir
                        </a>
                      )}
                      {isEditing && (
                        <label className="px-3 py-1.5 bg-[#2F6FED] hover:bg-blue-700 text-white rounded-lg font-bold cursor-pointer flex items-center gap-1">
                          <Upload className="w-3.5 h-3.5" />
                          <span>Déposer</span>
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) {
                                handleFileUpload(f, (name, url) => {
                                  setIdentityBackName(name);
                                  setIdentityBackUrl(url);
                                });
                              }
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* C. Informations complémentaires */}
              <div className="bg-white p-5 rounded-2xl border border-[#DCE3EC] shadow-2xs space-y-4">
                <h3 className="text-sm font-black text-[#17345B] uppercase tracking-wider border-b border-slate-100 pb-2">
                  C. Informations complémentaires
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Langue préférée de communication
                    </label>
                    {isEditing ? (
                      <select
                        value={preferredLanguage}
                        onChange={(e) => {
                          setPreferredLanguage(e.target.value);
                          markDirty();
                        }}
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-semibold"
                      >
                        <option value="Français">Français</option>
                        <option value="Malagasy">Malagasy</option>
                        <option value="Anglais">Anglais</option>
                      </select>
                    ) : (
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        {renderReadOnlyOrEmpty(preferredLanguage)}
                      </div>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Autres informations administratives / Observations dossier
                    </label>
                    {isEditing && isAdminMode ? (
                      <input
                        type="text"
                        value={administrativeNotes}
                        onChange={(e) => {
                          setAdministrativeNotes(e.target.value);
                          markDirty();
                        }}
                        placeholder="Mention particulière, bourse externe, aménagement..."
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                      />
                    ) : (
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        {renderReadOnlyOrEmpty(administrativeNotes)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================
              ONGLET 2 – COORDONNÉES
             ================================================================= */}
          {activeTab === 'TAB_2_CONTACT' && (
            <div className="space-y-5 text-xs">
              {/* A. Coordonnées électroniques & téléphoniques */}
              <div className="bg-white p-5 rounded-2xl border border-[#DCE3EC] shadow-2xs space-y-4">
                <h3 className="text-sm font-black text-[#17345B] uppercase tracking-wider border-b border-slate-100 pb-2">
                  A. Coordonnées électroniques & téléphoniques
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Email institutionnel EBM
                    </label>
                    {isEditing && isAdminMode ? (
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          markDirty();
                        }}
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-semibold"
                      />
                    ) : (
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        {renderReadOnlyOrEmpty(email)}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Email personnel
                    </label>
                    {isEditing ? (
                      <input
                        type="email"
                        value={personalEmail}
                        onChange={(e) => {
                          setPersonalEmail(e.target.value);
                          markDirty();
                        }}
                        placeholder="prenom.nom@gmail.com"
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                      />
                    ) : (
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        {renderReadOnlyOrEmpty(personalEmail)}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Téléphone principal *
                    </label>
                    {isEditing ? (
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => {
                          setPhone(e.target.value);
                          markDirty();
                        }}
                        placeholder="+261 34 00 000 00"
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-semibold"
                      />
                    ) : (
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        {renderReadOnlyOrEmpty(phone)}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Téléphone secondaire
                    </label>
                    {isEditing ? (
                      <input
                        type="tel"
                        value={secondaryPhone}
                        onChange={(e) => {
                          setSecondaryPhone(e.target.value);
                          markDirty();
                        }}
                        placeholder="+261 32 / 33 00 000 00"
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                      />
                    ) : (
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        {renderReadOnlyOrEmpty(secondaryPhone)}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Numéro WhatsApp
                    </label>
                    {isEditing ? (
                      <input
                        type="tel"
                        value={whatsappPhone}
                        onChange={(e) => {
                          setWhatsappPhone(e.target.value);
                          markDirty();
                        }}
                        placeholder="+261 34 00 000 00"
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                      />
                    ) : (
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        {renderReadOnlyOrEmpty(whatsappPhone)}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Profil LinkedIn
                    </label>
                    {isEditing ? (
                      <input
                        type="url"
                        value={linkedInUrl}
                        onChange={(e) => {
                          setLinkedInUrl(e.target.value);
                          markDirty();
                        }}
                        placeholder="https://linkedin.com/in/..."
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                      />
                    ) : (
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        {renderReadOnlyOrEmpty(linkedInUrl)}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      ORCID ou Site personnel / Portfolio
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={websiteUrl || orcidUrl}
                        onChange={(e) => {
                          setWebsiteUrl(e.target.value);
                          setOrcidUrl(e.target.value);
                          markDirty();
                        }}
                        placeholder="https://..."
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                      />
                    ) : (
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        {renderReadOnlyOrEmpty(websiteUrl || orcidUrl)}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* B. Adresse permanente */}
              <div className="bg-white p-5 rounded-2xl border border-[#DCE3EC] shadow-2xs space-y-4">
                <h3 className="text-sm font-black text-[#17345B] uppercase tracking-wider border-b border-slate-100 pb-2">
                  B. Adresse permanente
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Adresse / Rue
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={permanentAddress.addressLine || ''}
                        onChange={(e) => {
                          setPermanentAddress({ ...permanentAddress, addressLine: e.target.value });
                          markDirty();
                        }}
                        placeholder="Rue, résidence..."
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                      />
                    ) : (
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        {renderReadOnlyOrEmpty(permanentAddress.addressLine)}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Lot et numéro
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={permanentAddress.lotNumber || ''}
                        onChange={(e) => {
                          setPermanentAddress({ ...permanentAddress, lotNumber: e.target.value });
                          markDirty();
                        }}
                        placeholder="Lot II M 45 Bis"
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                      />
                    ) : (
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        {renderReadOnlyOrEmpty(permanentAddress.lotNumber)}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Quartier (Fokontany)
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={permanentAddress.neighborhood || ''}
                        onChange={(e) => {
                          setPermanentAddress({ ...permanentAddress, neighborhood: e.target.value });
                          markDirty();
                        }}
                        placeholder="Ankadivato / Ambatomitsangana"
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                      />
                    ) : (
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        {renderReadOnlyOrEmpty(permanentAddress.neighborhood)}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Commune / Ville
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={permanentAddress.commune || ''}
                        onChange={(e) => {
                          setPermanentAddress({ ...permanentAddress, commune: e.target.value });
                          markDirty();
                        }}
                        placeholder="Antananarivo"
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                      />
                    ) : (
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        {renderReadOnlyOrEmpty(permanentAddress.commune)}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      District
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={permanentAddress.district || ''}
                        onChange={(e) => {
                          setPermanentAddress({ ...permanentAddress, district: e.target.value });
                          markDirty();
                        }}
                        placeholder="Antananarivo Renivohitra"
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                      />
                    ) : (
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        {renderReadOnlyOrEmpty(permanentAddress.district)}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Région
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={permanentAddress.region || ''}
                        onChange={(e) => {
                          setPermanentAddress({ ...permanentAddress, region: e.target.value });
                          markDirty();
                        }}
                        placeholder="Analamanga"
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                      />
                    ) : (
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        {renderReadOnlyOrEmpty(permanentAddress.region)}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                        Code postal
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={permanentAddress.postalCode || ''}
                          onChange={(e) => {
                            setPermanentAddress({ ...permanentAddress, postalCode: e.target.value });
                            markDirty();
                          }}
                          placeholder="101"
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono"
                        />
                      ) : (
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                          {renderReadOnlyOrEmpty(permanentAddress.postalCode, true)}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                        Pays
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={permanentAddress.country || ''}
                          onChange={(e) => {
                            setPermanentAddress({ ...permanentAddress, country: e.target.value });
                            markDirty();
                          }}
                          placeholder="Madagascar"
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                        />
                      ) : (
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                          {renderReadOnlyOrEmpty(permanentAddress.country)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* C. Adresse actuelle */}
              <div className="bg-white p-5 rounded-2xl border border-[#DCE3EC] shadow-2xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-black text-[#17345B] uppercase tracking-wider">
                    C. Adresse actuelle de résidence
                  </h3>
                  <label className="flex items-center gap-2 text-xs font-bold text-[#2F6FED] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sameAsPermanentAddress}
                      disabled={!isEditing}
                      onChange={(e) => {
                        setSameAsPermanentAddress(e.target.checked);
                        if (e.target.checked) {
                          setCurrentAddress({ ...permanentAddress });
                        }
                        markDirty();
                      }}
                      className="rounded border-slate-300 text-[#2F6FED]"
                    />
                    <span>Identique à l’adresse permanente</span>
                  </label>
                </div>

                {sameAsPermanentAddress ? (
                  <p className="text-slate-500 italic">
                    L’adresse actuelle est synchronisée avec l’adresse permanente ci-dessus.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                        Adresse / Rue actuelle
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={currentAddress.addressLine || ''}
                          onChange={(e) => {
                            setCurrentAddress({ ...currentAddress, addressLine: e.target.value });
                            markDirty();
                          }}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                        />
                      ) : (
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                          {renderReadOnlyOrEmpty(currentAddress.addressLine)}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                        Lot et numéro
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={currentAddress.lotNumber || ''}
                          onChange={(e) => {
                            setCurrentAddress({ ...currentAddress, lotNumber: e.target.value });
                            markDirty();
                          }}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                        />
                      ) : (
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                          {renderReadOnlyOrEmpty(currentAddress.lotNumber)}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                        Quartier
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={currentAddress.neighborhood || ''}
                          onChange={(e) => {
                            setCurrentAddress({ ...currentAddress, neighborhood: e.target.value });
                            markDirty();
                          }}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                        />
                      ) : (
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                          {renderReadOnlyOrEmpty(currentAddress.neighborhood)}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                        Commune
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={currentAddress.commune || ''}
                          onChange={(e) => {
                            setCurrentAddress({ ...currentAddress, commune: e.target.value });
                            markDirty();
                          }}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                        />
                      ) : (
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                          {renderReadOnlyOrEmpty(currentAddress.commune)}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                        District
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={currentAddress.district || ''}
                          onChange={(e) => {
                            setCurrentAddress({ ...currentAddress, district: e.target.value });
                            markDirty();
                          }}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                        />
                      ) : (
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                          {renderReadOnlyOrEmpty(currentAddress.district)}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                        Région
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={currentAddress.region || ''}
                          onChange={(e) => {
                            setCurrentAddress({ ...currentAddress, region: e.target.value });
                            markDirty();
                          }}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                        />
                      ) : (
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                          {renderReadOnlyOrEmpty(currentAddress.region)}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                        Code postal / Pays
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={currentAddress.postalCode || ''}
                          onChange={(e) => {
                            setCurrentAddress({ ...currentAddress, postalCode: e.target.value });
                            markDirty();
                          }}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                        />
                      ) : (
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                          {renderReadOnlyOrEmpty(currentAddress.postalCode)}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* =================================================================
              ONGLET 3 – PARENTS & TUTEURS
             ================================================================= */}
          {activeTab === 'TAB_3_PARENTS' && (
            <div className="space-y-4 text-xs">
              <div className="bg-white p-5 rounded-2xl border border-[#DCE3EC] shadow-2xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-black text-[#17345B] uppercase tracking-wider">
                      Parents, Tuteurs légaux & Contacts d’urgence
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Plusieurs contacts autorisés avec définition du contact principal, d’urgence et représentant légal.
                    </p>
                  </div>
                  {isEditing && (
                    <button
                      type="button"
                      onClick={handleAddParentContact}
                      className="px-3.5 py-2 bg-[#2F6FED] hover:bg-blue-700 text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Ajouter un parent / tuteur
                    </button>
                  )}
                </div>

                {parentContacts.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-2">
                    <Users className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="font-bold text-slate-700">Aucun parent ou tuteur enregistré</p>
                    <p className="text-slate-500 text-[11px]">
                      Cliquez sur « Modifier » puis « Ajouter un parent / tuteur » pour renseigner les contacts familiaux et d’urgence.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {parentContacts.map((p, idx) => (
                      <div
                        key={p.id || idx}
                        className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2.5 py-0.5 bg-[#17345B] text-white rounded-md font-bold text-[10px]">
                              {RELATION_LABELS[p.relation] || p.relation}
                            </span>
                            {p.isPrimaryContact && (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md font-bold text-[10px]">
                                ★ Contact principal
                              </span>
                            )}
                            {p.isEmergencyContact && (
                              <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded-md font-bold text-[10px]">
                                🚨 Contact d’urgence
                              </span>
                            )}
                            {p.isLegalGuardian && (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md font-bold text-[10px]">
                                Représentant légal
                              </span>
                            )}
                          </div>
                          {isEditing && (
                            <button
                              type="button"
                              onClick={() => handleRemoveParentContact(idx)}
                              className="text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 cursor-pointer text-[11px]"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Supprimer
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                              Lien de parenté
                            </label>
                            {isEditing ? (
                              <select
                                value={p.relation}
                                onChange={(e) =>
                                  handleUpdateParentContact(idx, {
                                    relation: e.target.value as ParentContactRelation,
                                  })
                                }
                                className="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold"
                              >
                                {Object.entries(RELATION_LABELS).map(([code, label]) => (
                                  <option key={code} value={code}>
                                    {label}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <div className="p-2 bg-white rounded-xl border border-slate-200">
                                {renderReadOnlyOrEmpty(RELATION_LABELS[p.relation] || p.relation)}
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                              Nom *
                            </label>
                            {isEditing ? (
                              <input
                                type="text"
                                value={p.nom}
                                onChange={(e) => handleUpdateParentContact(idx, { nom: e.target.value })}
                                placeholder="Nom de famille"
                                className="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold uppercase"
                              />
                            ) : (
                              <div className="p-2 bg-white rounded-xl border border-slate-200">
                                {renderReadOnlyOrEmpty(p.nom)}
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                              Prénoms *
                            </label>
                            {isEditing ? (
                              <input
                                type="text"
                                value={p.prenoms}
                                onChange={(e) =>
                                  handleUpdateParentContact(idx, { prenoms: e.target.value })
                                }
                                placeholder="Prénoms"
                                className="w-full p-2 bg-white border border-slate-300 rounded-xl"
                              />
                            ) : (
                              <div className="p-2 bg-white rounded-xl border border-slate-200">
                                {renderReadOnlyOrEmpty(p.prenoms)}
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                              Profession
                            </label>
                            {isEditing ? (
                              <input
                                type="text"
                                value={p.profession || ''}
                                onChange={(e) =>
                                  handleUpdateParentContact(idx, { profession: e.target.value })
                                }
                                placeholder="Profession / Fonction"
                                className="w-full p-2 bg-white border border-slate-300 rounded-xl"
                              />
                            ) : (
                              <div className="p-2 bg-white rounded-xl border border-slate-200">
                                {renderReadOnlyOrEmpty(p.profession)}
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                              Téléphone principal *
                            </label>
                            {isEditing ? (
                              <input
                                type="tel"
                                value={p.phone}
                                onChange={(e) =>
                                  handleUpdateParentContact(idx, { phone: e.target.value })
                                }
                                placeholder="+261 34 00 000 00"
                                className="w-full p-2 bg-white border border-slate-300 rounded-xl font-semibold"
                              />
                            ) : (
                              <div className="p-2 bg-white rounded-xl border border-slate-200">
                                {renderReadOnlyOrEmpty(p.phone)}
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                              Téléphone secondaire
                            </label>
                            {isEditing ? (
                              <input
                                type="tel"
                                value={p.secondaryPhone || ''}
                                onChange={(e) =>
                                  handleUpdateParentContact(idx, { secondaryPhone: e.target.value })
                                }
                                placeholder="Optionnel"
                                className="w-full p-2 bg-white border border-slate-300 rounded-xl"
                              />
                            ) : (
                              <div className="p-2 bg-white rounded-xl border border-slate-200">
                                {renderReadOnlyOrEmpty(p.secondaryPhone)}
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                              Email
                            </label>
                            {isEditing ? (
                              <input
                                type="email"
                                value={p.email}
                                onChange={(e) =>
                                  handleUpdateParentContact(idx, { email: e.target.value })
                                }
                                placeholder="parent@email.com"
                                className="w-full p-2 bg-white border border-slate-300 rounded-xl"
                              />
                            ) : (
                              <div className="p-2 bg-white rounded-xl border border-slate-200">
                                {renderReadOnlyOrEmpty(p.email)}
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                              Adresse
                            </label>
                            {isEditing ? (
                              <input
                                type="text"
                                value={p.address || ''}
                                onChange={(e) =>
                                  handleUpdateParentContact(idx, { address: e.target.value })
                                }
                                placeholder="Domicile du parent/tuteur"
                                className="w-full p-2 bg-white border border-slate-300 rounded-xl"
                              />
                            ) : (
                              <div className="p-2 bg-white rounded-xl border border-slate-200">
                                {renderReadOnlyOrEmpty(p.address)}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-200/80">
                          <label className="flex items-center gap-1.5 font-semibold text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(p.isPrimaryContact)}
                              disabled={!isEditing}
                              onChange={(e) =>
                                handleUpdateParentContact(idx, { isPrimaryContact: e.target.checked })
                              }
                            />
                            <span>Définir comme contact principal</span>
                          </label>

                          <label className="flex items-center gap-1.5 font-semibold text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(p.isEmergencyContact)}
                              disabled={!isEditing}
                              onChange={(e) =>
                                handleUpdateParentContact(idx, { isEmergencyContact: e.target.checked })
                              }
                            />
                            <span>Définir comme contact d’urgence</span>
                          </label>

                          <label className="flex items-center gap-1.5 font-semibold text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(p.isLegalGuardian)}
                              disabled={!isEditing}
                              onChange={(e) =>
                                handleUpdateParentContact(idx, { isLegalGuardian: e.target.checked })
                              }
                            />
                            <span>Représentant légal</span>
                          </label>

                          <label className="flex items-center gap-1.5 font-semibold text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(p.receiveAcademicInfo)}
                              disabled={!isEditing}
                              onChange={(e) =>
                                handleUpdateParentContact(idx, {
                                  receiveAcademicInfo: e.target.checked,
                                })
                              }
                            />
                            <span>Autorisé à recevoir les informations académiques</span>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* =================================================================
              ONGLET 4 – PARCOURS ACADÉMIQUE
             ================================================================= */}
          {activeTab === 'TAB_4_ACADEMIC' && (
            <div className="space-y-5 text-xs">
              {/* A. Inscription actuelle & B. Formation actuelle */}
              <div className="bg-white p-5 rounded-2xl border border-[#DCE3EC] shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div>
                    <h3 className="text-sm font-black text-[#17345B] uppercase tracking-wider">
                      A & B. Inscription administrative & Formation actuelle (EBM Institute)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Affectation LMD officielle gérée par la Scolarité et la Direction Académique.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Matricule étudiant
                    </label>
                    <div className="p-2.5 bg-slate-100 rounded-xl border border-slate-200 font-mono font-bold text-[#17345B]">
                      {matricule || student.matricule}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Année académique
                    </label>
                    <div className="p-2.5 bg-slate-100 rounded-xl border border-slate-200 font-bold">
                      {selectedAcademicYear}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Date de 1ère inscription
                    </label>
                    {isEditing && isAdminMode ? (
                      <input
                        type="date"
                        value={firstRegistrationDate}
                        onChange={(e) => {
                          setFirstRegistrationDate(e.target.value);
                          markDirty();
                        }}
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                      />
                    ) : (
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        {renderReadOnlyOrEmpty(firstRegistrationDate, true)}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Date de réinscription
                    </label>
                    {isEditing && isAdminMode ? (
                      <input
                        type="date"
                        value={reRegistrationDate}
                        onChange={(e) => {
                          setReRegistrationDate(e.target.value);
                          markDirty();
                        }}
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                      />
                    ) : (
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        {renderReadOnlyOrEmpty(reRegistrationDate, true)}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Type d’admission
                    </label>
                    {isEditing && isAdminMode ? (
                      <select
                        value={admissionType}
                        onChange={(e) => {
                          setAdmissionType(e.target.value as any);
                          markDirty();
                        }}
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-semibold"
                      >
                        <option value="DOSSIER">Sélection sur dossier</option>
                        <option value="CONCOURS">Concours d’entrée</option>
                        <option value="EQUIVALENCE">Admission par équivalence</option>
                        <option value="TRANSFERT">Transfert inter-établissement</option>
                        <option value="REINSCRIPTION">Réinscription annuelle</option>
                      </select>
                    ) : (
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        {renderReadOnlyOrEmpty(admissionType)}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Statut d’inscription
                    </label>
                    {isEditing && isAdminMode ? (
                      <select
                        value={registrationStatus}
                        onChange={(e) => {
                          setRegistrationStatus(e.target.value as any);
                          markDirty();
                        }}
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold"
                      >
                        <option value="CONFIRMED">Inscrit / Confirmé</option>
                        <option value="PENDING">En attente de pièces</option>
                        <option value="SUSPENDED">Suspendu</option>
                      </select>
                    ) : (
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        {renderReadOnlyOrEmpty(
                          registrationStatus === 'CONFIRMED'
                            ? 'Inscrit / Confirmé'
                            : registrationStatus === 'PENDING'
                            ? 'En attente de pièces'
                            : 'Suspendu'
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Mode de formation
                    </label>
                    {isEditing && isAdminMode ? (
                      <select
                        value={trainingMode}
                        onChange={(e) => {
                          setTrainingMode(e.target.value as any);
                          markDirty();
                        }}
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-semibold"
                      >
                        <option value="PRESENTIEL">Présentiel</option>
                        <option value="HYBRIDE">Hybride (Présentiel + Moodle)</option>
                        <option value="EN_LIGNE">En ligne / FOAD</option>
                        <option value="ALTERNANCE">Alternance</option>
                      </select>
                    ) : (
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        {renderReadOnlyOrEmpty(trainingMode)}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Régime de formation
                    </label>
                    {isEditing && isAdminMode ? (
                      <select
                        value={trainingRegime}
                        onChange={(e) => {
                          setTrainingRegime(e.target.value as any);
                          markDirty();
                        }}
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-semibold"
                      >
                        <option value="INITIAL">Formation Initiale</option>
                        <option value="CONTINU">Formation Continue</option>
                        <option value="SALARIE">Régime Étudiant Salarié</option>
                      </select>
                    ) : (
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        {renderReadOnlyOrEmpty(trainingRegime)}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Groupe pédagogique (Optionnel)
                    </label>
                    {isEditing && isAdminMode ? (
                      <select
                        value={groupId}
                        onChange={(e) => {
                          setGroupId(e.target.value);
                          markDirty();
                        }}
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold"
                      >
                        <option value="">-- Sans affectation immédiate --</option>
                        {groups.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.code} — {g.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        {renderReadOnlyOrEmpty(
                          currentGroup ? `${currentGroup.code} (${currentGroup.name})` : 'En attente d’affectation'
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Filière de rattachement
                    </label>
                    <div className="p-2.5 bg-slate-100 rounded-xl border border-slate-200 font-semibold">
                      {currentFiliere?.name || 'Non affectée'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Parcours LMD
                    </label>
                    {isEditing && isAdminMode ? (
                      <select
                        value={parcoursId}
                        onChange={(e) => {
                          setParcoursId(e.target.value);
                          markDirty();
                        }}
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-semibold"
                      >
                        <option value="">-- Parcours du groupe --</option>
                        {parcours.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.code} — {p.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        {renderReadOnlyOrEmpty(
                          currentParcours ? `${currentParcours.code} — ${currentParcours.name}` : 'Tronc commun'
                        )}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                        Diplôme préparé
                      </label>
                      {isEditing && isAdminMode ? (
                        <select
                          value={targetDegree}
                          onChange={(e) => {
                            setTargetDegree(e.target.value as any);
                            markDirty();
                          }}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold"
                        >
                          <option value="LICENCE">Licence</option>
                          <option value="MASTER">Master</option>
                          <option value="INGENIEUR">Ingénieur</option>
                          <option value="CERTIFICAT">Certificat</option>
                        </select>
                      ) : (
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                          {renderReadOnlyOrEmpty(targetDegree)}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                        Semestre
                      </label>
                      {isEditing && isAdminMode ? (
                        <select
                          value={currentSemesterCode}
                          onChange={(e) => {
                            setCurrentSemesterCode(e.target.value as any);
                            markDirty();
                          }}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold"
                        >
                          {['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10'].map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                          {renderReadOnlyOrEmpty(currentSemesterCode, true)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* C. Diplômes antérieurs (Bac, Licence, Master, Professionnel...) */}
              <div className="bg-white p-5 rounded-2xl border border-[#DCE3EC] shadow-2xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-black text-[#17345B] uppercase tracking-wider">
                      C. Diplômes antérieurs (Baccalauréat, Licence, Master, Certificats)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Historique complet des titres obtenus avant ou pendant le cursus avec justificatifs joints.
                    </p>
                  </div>
                  {isEditing && (
                    <button
                      type="button"
                      onClick={handleAddDiploma}
                      className="px-3.5 py-2 bg-[#2F6FED] hover:bg-blue-700 text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Ajouter un diplôme antérieur
                    </button>
                  )}
                </div>

                {previousDiplomas.length === 0 ? (
                  <p className="text-slate-400 italic p-4 text-center">
                    Aucun diplôme antérieur enregistré.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {previousDiplomas.map((d, idx) => (
                      <div
                        key={d.id || idx}
                        className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3"
                      >
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                          <span className="px-2.5 py-0.5 bg-[#17345B] text-white rounded-md font-bold text-[10px]">
                            {d.category}
                          </span>
                          {isEditing && (
                            <button
                              type="button"
                              onClick={() => handleRemoveDiploma(idx)}
                              className="text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Supprimer
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                              Type de diplôme
                            </label>
                            {isEditing ? (
                              <select
                                value={d.category}
                                onChange={(e) =>
                                  handleUpdateDiploma(idx, {
                                    category: e.target.value as PreviousDiplomaCategory,
                                  })
                                }
                                className="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold"
                              >
                                <option value="BACCALAUREAT">Baccalauréat</option>
                                <option value="LICENCE">Licence (Bac+3)</option>
                                <option value="MASTER">Master (Bac+5)</option>
                                <option value="AUTRE_UNIVERSITAIRE">Autre diplôme universitaire</option>
                                <option value="PROFESSIONNEL">Diplôme professionnel</option>
                              </select>
                            ) : (
                              <div className="p-2 bg-white rounded-xl border border-slate-200">
                                {renderReadOnlyOrEmpty(d.category)}
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                              Intitulé du diplôme *
                            </label>
                            {isEditing ? (
                              <input
                                type="text"
                                value={d.title}
                                onChange={(e) => handleUpdateDiploma(idx, { title: e.target.value })}
                                placeholder="Ex: Baccalauréat Série C"
                                className="w-full p-2 bg-white border border-slate-300 rounded-xl font-semibold"
                              />
                            ) : (
                              <div className="p-2 bg-white rounded-xl border border-slate-200">
                                {renderReadOnlyOrEmpty(d.title)}
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                              Établissement d’obtention *
                            </label>
                            {isEditing ? (
                              <input
                                type="text"
                                value={d.institution}
                                onChange={(e) =>
                                  handleUpdateDiploma(idx, { institution: e.target.value })
                                }
                                placeholder="Lycée / Université"
                                className="w-full p-2 bg-white border border-slate-300 rounded-xl"
                              />
                            ) : (
                              <div className="p-2 bg-white rounded-xl border border-slate-200">
                                {renderReadOnlyOrEmpty(d.institution)}
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                                Année
                              </label>
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={d.year}
                                  onChange={(e) => handleUpdateDiploma(idx, { year: e.target.value })}
                                  placeholder="2024"
                                  className="w-full p-2 bg-white border border-slate-300 rounded-xl font-mono"
                                />
                              ) : (
                                <div className="p-2 bg-white rounded-xl border border-slate-200">
                                  {renderReadOnlyOrEmpty(d.year, true)}
                                </div>
                              )}
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                                Pays
                              </label>
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={d.country}
                                  onChange={(e) =>
                                    handleUpdateDiploma(idx, { country: e.target.value })
                                  }
                                  placeholder="Madagascar"
                                  className="w-full p-2 bg-white border border-slate-300 rounded-xl"
                                />
                              ) : (
                                <div className="p-2 bg-white rounded-xl border border-slate-200">
                                  {renderReadOnlyOrEmpty(d.country)}
                                </div>
                              )}
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                              Série ou spécialité
                            </label>
                            {isEditing ? (
                              <input
                                type="text"
                                value={d.series || ''}
                                onChange={(e) => handleUpdateDiploma(idx, { series: e.target.value })}
                                placeholder="Série C, D, S, OSE, Informatique..."
                                className="w-full p-2 bg-white border border-slate-300 rounded-xl"
                              />
                            ) : (
                              <div className="p-2 bg-white rounded-xl border border-slate-200">
                                {renderReadOnlyOrEmpty(d.series)}
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                              Numéro du diplôme
                            </label>
                            {isEditing ? (
                              <input
                                type="text"
                                value={d.diplomaNumber || ''}
                                onChange={(e) =>
                                  handleUpdateDiploma(idx, { diplomaNumber: e.target.value })
                                }
                                placeholder="N° officiel"
                                className="w-full p-2 bg-white border border-slate-300 rounded-xl font-mono"
                              />
                            ) : (
                              <div className="p-2 bg-white rounded-xl border border-slate-200">
                                {renderReadOnlyOrEmpty(d.diplomaNumber, true)}
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                              Mention obtenue
                            </label>
                            {isEditing ? (
                              <select
                                value={d.honors || 'Passable'}
                                onChange={(e) => handleUpdateDiploma(idx, { honors: e.target.value })}
                                className="w-full p-2 bg-white border border-slate-300 rounded-xl"
                              >
                                <option value="Très Bien">Très Bien</option>
                                <option value="Bien">Bien</option>
                                <option value="Assez Bien">Assez Bien</option>
                                <option value="Passable">Passable</option>
                              </select>
                            ) : (
                              <div className="p-2 bg-white rounded-xl border border-slate-200">
                                {renderReadOnlyOrEmpty(d.honors)}
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                              Document justificatif joint
                            </label>
                            <div className="flex items-center gap-2">
                              {d.documentUrl && (
                                <a
                                  href={d.documentUrl}
                                  download={d.documentName || 'diplome.pdf'}
                                  className="px-2.5 py-2 bg-white border border-slate-300 rounded-xl font-bold text-blue-700 hover:bg-slate-50"
                                >
                                  Voir ({d.documentName?.slice(0, 12)}...)
                                </a>
                              )}
                              {isEditing && (
                                <label className="px-3 py-2 bg-[#2F6FED] text-white rounded-xl font-bold cursor-pointer flex items-center gap-1">
                                  <Upload className="w-3.5 h-3.5" />
                                  <span>Joindre fichier</span>
                                  <input
                                    type="file"
                                    accept="image/*,.pdf"
                                    className="hidden"
                                    onChange={(e) => {
                                      const f = e.target.files?.[0];
                                      if (f) {
                                        handleFileUpload(f, (name, url) => {
                                          handleUpdateDiploma(idx, {
                                            documentName: name,
                                            documentUrl: url,
                                            verificationStatus: isAdminMode ? 'VALIDE' : 'EN_ATTENTE',
                                          });
                                        });
                                      }
                                    }}
                                  />
                                </label>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* D. Historique des inscriptions annuelles & Changements d'affectation (Partie III & VIII) */}
              {(() => {
                const studentEnrollments = inscriptions
                  .filter((i) => i.studentId === student.id)
                  .sort((a, b) => b.academicYear.localeCompare(a.academicYear));
                const allHistoryLogs = studentEnrollments
                  .flatMap((insc) =>
                    (insc.history || []).map((h) => ({
                      ...h,
                      academicYear: insc.academicYear,
                    }))
                  )
                  .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

                return (
                  <div className="bg-white p-5 rounded-2xl border border-[#DCE3EC] shadow-2xs space-y-4">
                    <div className="border-b border-slate-100 pb-3">
                      <h3 className="text-sm font-black text-[#17345B] uppercase tracking-wider">
                        D. Historique des inscriptions annuelles & Affectations académiques
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Suivi multi-années des inscriptions, promotions, redoublements, passages conditionnels et changements de groupe.
                      </p>
                    </div>

                    {studentEnrollments.length === 0 ? (
                      <p className="text-slate-400 italic p-4 text-center">
                        Aucune inscription annuelle enregistrée.
                      </p>
                    ) : (
                      <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500">
                            <tr>
                              <th className="p-2.5">Année</th>
                              <th className="p-2.5">Mention / Filière</th>
                              <th className="p-2.5">Parcours</th>
                              <th className="p-2.5">Niveau</th>
                              <th className="p-2.5">Groupe</th>
                              <th className="p-2.5">Type / Cas</th>
                              <th className="p-2.5">Date</th>
                              <th className="p-2.5">Statut</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {studentEnrollments.map((insc) => {
                              const fil = filieres.find((f) => f.id === insc.filiereId);
                              const parc = parcours.find((p) => p.id === insc.parcoursId);
                              const grp = groups.find((g) => g.id === insc.groupId);
                              return (
                                <tr key={insc.id} className="hover:bg-slate-50">
                                  <td className="p-2.5 font-mono font-bold text-[#17345B]">
                                    {insc.academicYear}
                                  </td>
                                  <td className="p-2.5 font-semibold text-slate-800">
                                    {fil ? `${fil.code} — ${fil.name}` : insc.filiereId}
                                  </td>
                                  <td className="p-2.5 text-slate-700">
                                    {parc ? `${parc.code} — ${parc.name}` : 'Tronc commun'}
                                  </td>
                                  <td className="p-2.5">
                                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded font-bold text-[10px]">
                                      {insc.level}
                                    </span>
                                  </td>
                                  <td className="p-2.5 font-mono font-bold text-slate-800">
                                    {grp ? grp.code : 'Sans affectation immédiate'}
                                  </td>
                                  <td className="p-2.5 text-[11px] text-slate-600">
                                    {insc.inscriptionType || 'INSCRIPTION'}
                                    {insc.specialCaseType && insc.specialCaseType !== 'NORMAL'
                                      ? ` (${insc.specialCaseType})`
                                      : ''}
                                  </td>
                                  <td className="p-2.5 font-mono text-[11px] text-slate-500">
                                    {insc.inscriptionDate}
                                  </td>
                                  <td className="p-2.5">
                                    <span
                                      className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                                        insc.status === 'CONFIRMED'
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : insc.status === 'PENDING' || insc.status === 'DRAFT'
                                          ? 'bg-amber-100 text-amber-800'
                                          : 'bg-rose-100 text-rose-800'
                                      }`}
                                    >
                                      {insc.status === 'CONFIRMED'
                                        ? 'Validée'
                                        : insc.status === 'PENDING'
                                        ? 'En attente'
                                        : insc.status === 'DRAFT'
                                        ? 'Brouillon'
                                        : insc.status === 'SUSPENDED'
                                        ? 'Suspendue'
                                        : 'Rejetée'}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {allHistoryLogs.length > 0 && (
                      <div className="pt-2 space-y-2">
                        <h4 className="text-[11px] font-black text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                          <History className="w-3.5 h-3.5 text-[#2F6FED]" />
                          Journal des changements d’affectation (Groupe / Parcours / Niveau)
                        </h4>
                        <div className="space-y-1.5 max-h-40 overflow-y-auto">
                          {allHistoryLogs.map((log) => {
                            const prevGrp = groups.find((g) => g.id === log.previousGroupId);
                            const nextGrp = groups.find((g) => g.id === log.newGroupId);
                            return (
                              <div
                                key={log.id}
                                className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px]"
                              >
                                <div>
                                  <span className="font-mono font-bold text-[#17345B] mr-2">
                                    [{log.academicYear}]
                                  </span>
                                  <span className="font-bold text-slate-800">{log.action}</span>
                                  {log.previousGroupId !== undefined &&
                                    log.previousGroupId !== log.newGroupId && (
                                      <span className="text-slate-600 ml-1.5">
                                        • Groupe : {prevGrp?.code || 'Aucun'} →{' '}
                                        <strong>{nextGrp?.code || 'Sans affectation'}</strong>
                                      </span>
                                    )}
                                  {log.reason && (
                                    <span className="text-slate-500 ml-1.5">({log.reason})</span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  Par {log.authorName} •{' '}
                                  {new Date(log.timestamp).toLocaleDateString('fr-FR')}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* =================================================================
              ONGLET 5 – SITUATION PERSONNELLE & PROFESSIONNELLE
             ================================================================= */}
          {activeTab === 'TAB_5_PROFESSIONAL' && (
            <div className="bg-white p-5 rounded-2xl border border-[#DCE3EC] shadow-2xs space-y-4 text-xs">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-[#17345B] uppercase tracking-wider">
                  Situation personnelle, professionnelle & activités parallèles
                </h3>
                <p className="text-[11px] text-slate-500">
                  Permet d’identifier les étudiants salariés, entrepreneurs, en formation continue ou inscrits en double cursus.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <label className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2 font-bold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isWorkingStudent}
                    disabled={!isEditing}
                    onChange={(e) => {
                      setIsWorkingStudent(e.target.checked);
                      markDirty();
                    }}
                  />
                  <span>Statut Étudiant salarié</span>
                </label>

                <label className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2 font-bold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isEntrepreneur}
                    disabled={!isEditing}
                    onChange={(e) => {
                      setIsEntrepreneur(e.target.checked);
                      markDirty();
                    }}
                  />
                  <span>Entrepreneur / Indépendant</span>
                </label>

                <label className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2 font-bold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isContinuingEducation}
                    disabled={!isEditing}
                    onChange={(e) => {
                      setIsContinuingEducation(e.target.checked);
                      markDirty();
                    }}
                  />
                  <span>Formation continue</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Situation professionnelle actuelle
                  </label>
                  {isEditing ? (
                    <select
                      value={employmentStatus}
                      onChange={(e) => {
                        setEmploymentStatus(e.target.value as any);
                        markDirty();
                      }}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-semibold"
                    >
                      <option value="ETUDIANT_TEMPS_PLEIN">Étudiant à temps plein</option>
                      <option value="SALARIE">Salarié(e) en entreprise / administration</option>
                      <option value="ENTREPRENEUR">Entrepreneur / Indépendant</option>
                      <option value="STAGIAIRE">Stagiaire / Alternant</option>
                      <option value="RECHERCHE_EMPLOI">En recherche d’emploi</option>
                      <option value="AUTRE">Autre situation</option>
                    </select>
                  ) : (
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      {renderReadOnlyOrEmpty(employmentStatus)}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Profession
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={profession}
                      onChange={(e) => {
                        setProfession(e.target.value);
                        markDirty();
                      }}
                      placeholder="Ex: Développeur, Comptable..."
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                    />
                  ) : (
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      {renderReadOnlyOrEmpty(profession)}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Employeur / Organisme
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={employer}
                      onChange={(e) => {
                        setEmployer(e.target.value);
                        markDirty();
                      }}
                      placeholder="Nom de l'entreprise"
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                    />
                  ) : (
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      {renderReadOnlyOrEmpty(employer)}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Fonction occupée
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={jobFunction}
                      onChange={(e) => {
                        setJobFunction(e.target.value);
                        markDirty();
                      }}
                      placeholder="Poste occupé"
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                    />
                  ) : (
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      {renderReadOnlyOrEmpty(jobFunction)}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Secteur d’activité
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={activitySector}
                      onChange={(e) => {
                        setActivitySector(e.target.value);
                        markDirty();
                      }}
                      placeholder="Informatique, Banque, BTP, Santé..."
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                    />
                  ) : (
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      {renderReadOnlyOrEmpty(activitySector)}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Deuxième filière / Établissement parallèle
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={secondFiliere}
                      onChange={(e) => {
                        setSecondFiliere(e.target.value);
                        markDirty();
                      }}
                      placeholder="Optionnel"
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                    />
                  ) : (
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      {renderReadOnlyOrEmpty(secondFiliere)}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Adresse professionnelle
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={workAddress}
                      onChange={(e) => {
                        setWorkAddress(e.target.value);
                        markDirty();
                      }}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                    />
                  ) : (
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      {renderReadOnlyOrEmpty(workAddress)}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Téléphone professionnel
                  </label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={workPhone}
                      onChange={(e) => {
                        setWorkPhone(e.target.value);
                        markDirty();
                      }}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                    />
                  ) : (
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      {renderReadOnlyOrEmpty(workPhone)}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Email professionnel
                  </label>
                  {isEditing ? (
                    <input
                      type="email"
                      value={workEmail}
                      onChange={(e) => {
                        setWorkEmail(e.target.value);
                        markDirty();
                      }}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                    />
                  ) : (
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      {renderReadOnlyOrEmpty(workEmail)}
                    </div>
                  )}
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Expérience professionnelle & Compétences clés
                  </label>
                  {isEditing ? (
                    <textarea
                      rows={3}
                      value={workExperience}
                      onChange={(e) => {
                        setWorkExperience(e.target.value);
                        markDirty();
                      }}
                      placeholder="Stages réalisés, projets professionnels, années d'expérience..."
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                    />
                  ) : (
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      {renderReadOnlyOrEmpty(workExperience)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* =================================================================
              ONGLET 6 – DOCUMENTS & JUSTIFICATIFS
             ================================================================= */}
          {activeTab === 'TAB_6_DOCUMENTS' && (
            <div className="bg-white p-5 rounded-2xl border border-[#DCE3EC] shadow-2xs space-y-4 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-black text-[#17345B] uppercase tracking-wider">
                    Pièces administratives & Justificatifs du Dossier Étudiant
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Centralisation des pièces déposées, dates de vérification, agent vérificateur et motifs éventuels de rejet.
                  </p>
                </div>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500">
                    <tr>
                      <th className="p-3">Type de document</th>
                      <th className="p-3">Fichier déposé</th>
                      <th className="p-3">Date dépôt</th>
                      <th className="p-3">Statut</th>
                      <th className="p-3">Vérification (Agent / Date)</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {studentDocuments.map((doc) => {
                      const catInfo = REQUIRED_DOCUMENT_CATALOG.find((c) => c.type === doc.type);
                      const statusCfg = DOC_STATUS_CONFIG[doc.status];
                      return (
                        <tr key={doc.type} className="hover:bg-slate-50/80">
                          <td className="p-3">
                            <span className="font-bold text-slate-900 block">
                              {doc.label}
                              {catInfo?.required && (
                                <span className="ml-1.5 text-[10px] text-rose-600 font-bold">
                                  * Requis
                                </span>
                              )}
                            </span>
                            {doc.rejectionReason && (
                              <span className="text-[11px] text-rose-600 font-semibold block mt-0.5">
                                Motif : {doc.rejectionReason}
                              </span>
                            )}
                          </td>

                          <td className="p-3">
                            {doc.fileName ? (
                              <span className="font-mono text-[11px] text-blue-700 font-semibold">
                                {doc.fileName} {doc.fileSize ? `(${doc.fileSize})` : ''}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Aucun fichier</span>
                            )}
                          </td>

                          <td className="p-3 font-mono text-[11px] text-slate-600">
                            {doc.uploadedAt || '—'}
                          </td>

                          <td className="p-3">
                            <span
                              className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold border ${statusCfg.badgeClass}`}
                            >
                              {statusCfg.label}
                            </span>
                          </td>

                          <td className="p-3 text-[11px] text-slate-600">
                            {doc.verifiedBy ? (
                              <span>
                                Par <strong>{doc.verifiedBy}</strong> le {doc.verifiedAt}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          <td className="p-3 text-right">
                            <div className="flex flex-wrap items-center justify-end gap-1.5">
                              {doc.fileUrl && (
                                <a
                                  href={doc.fileUrl}
                                  download={doc.fileName || `${doc.type}.pdf`}
                                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[11px] flex items-center gap-1"
                                >
                                  <Download className="w-3 h-3" />
                                  Voir
                                </a>
                              )}

                              <label className="px-2.5 py-1 bg-[#2F6FED] hover:bg-blue-700 text-white rounded-lg font-bold text-[11px] cursor-pointer flex items-center gap-1">
                                <Upload className="w-3 h-3" />
                                <span>{doc.fileUrl ? 'Remplacer' : 'Téléverser'}</span>
                                <input
                                  type="file"
                                  accept="image/*,.pdf"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      handleUploadAdminDoc(doc.type, file);
                                    }
                                  }}
                                />
                              </label>

                              {isAdminMode && doc.status !== 'MANQUANT' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleVerifyAdminDoc(doc.type, 'VALIDE')}
                                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[10px] cursor-pointer"
                                    title="Valider la pièce"
                                  >
                                    Valider
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRejectingDocId(doc.type);
                                      setRejectDocReason(doc.rejectionReason || 'Document illisible ou non conforme');
                                    }}
                                    className="px-2 py-1 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 border border-rose-200 rounded-lg font-bold text-[10px] cursor-pointer"
                                    title="Rejeter ou demander le remplacement"
                                  >
                                    Rejeter
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {rejectingDocId && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex flex-col sm:flex-row items-center gap-3">
                  <input
                    type="text"
                    value={rejectDocReason}
                    onChange={(e) => setRejectDocReason(e.target.value)}
                    placeholder="Motif du rejet ou du remplacement demandé à l'étudiant..."
                    className="flex-1 p-2.5 bg-white border border-rose-300 rounded-xl text-xs"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleVerifyAdminDoc(
                          rejectingDocId as StudentAdminDocumentType,
                          'REJETE',
                          rejectDocReason
                        )
                      }
                      className="px-3.5 py-2 bg-rose-600 text-white font-bold rounded-xl cursor-pointer"
                    >
                      Confirmer Rejet
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleVerifyAdminDoc(
                          rejectingDocId as StudentAdminDocumentType,
                          'A_REMPLACER',
                          rejectDocReason
                        )
                      }
                      className="px-3.5 py-2 bg-orange-600 text-white font-bold rounded-xl cursor-pointer"
                    >
                      Demander remplacement
                    </button>
                    <button
                      type="button"
                      onClick={() => setRejectingDocId(null)}
                      className="px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =================================================================
              ONGLET 7 – COMPTE & SÉCURITÉ + DEMANDES DE VALIDATION (Section 3 & 6)
             ================================================================= */}
          {activeTab === 'TAB_7_SECURITY' && (
            <div className="space-y-5 text-xs">
              {/* Paramètres du compte & Moodle */}
              <div className="bg-white p-5 rounded-2xl border border-[#DCE3EC] shadow-2xs space-y-4">
                <h3 className="text-sm font-black text-[#17345B] uppercase tracking-wider border-b border-slate-100 pb-2">
                  Informations du compte & Accès numérique EBM
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Identifiant utilisateur
                    </label>
                    <div className="p-2.5 bg-slate-100 rounded-xl border border-slate-200 font-mono font-bold">
                      {student.matricule || student.username}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Email de connexion
                    </label>
                    <div className="p-2.5 bg-slate-100 rounded-xl border border-slate-200 font-semibold">
                      {student.email}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Compte Moodle associé
                    </label>
                    {isEditing && isAdminMode ? (
                      <input
                        type="text"
                        value={moodleUsername}
                        onChange={(e) => {
                          setMoodleUsername(e.target.value);
                          markDirty();
                        }}
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono"
                      />
                    ) : (
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                        <span className="font-mono font-bold">{moodleUsername}</span>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold">
                          Lié LMS
                        </span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Rôle & Statut du compte
                    </label>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                      <span className="font-bold">ÉTUDIANT</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          student.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {student.isActive ? 'Actif' : 'Suspendu'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Date de création du compte
                    </label>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-mono">
                      {student.createdAt || student.cardIssuedAt || '2025-10-01'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Dernière connexion / synchro
                    </label>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-mono">
                      {student.lastLoginAt ||
                        (student.updatedAt ? new Date(student.updatedAt).toLocaleDateString('fr-FR') : 'Récente')}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Vérification de l’email
                    </label>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold">
                        {emailVerified ? 'Vérifié' : 'En attente'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Mot de passe (Sécurité)
                    </label>
                    <div className="p-2.5 bg-slate-100 rounded-xl border border-slate-200 text-slate-500 font-mono">
                      •••••••••••• (Haché — jamais affiché)
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 6 : Workflow des demandes de rectification d'état civil ou académiques */}
              <div className="bg-amber-50/70 p-5 rounded-2xl border border-amber-200 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-black text-amber-950 uppercase tracking-wider">
                      Demandes de validation administrative (Champs protégés)
                    </h3>
                    <p className="text-[11px] text-amber-800">
                      Toute modification de nom, prénoms, date/lieu de naissance, nationalité ou numéro CIN soumise par l’étudiant est validée ici par la Scolarité.
                    </p>
                  </div>
                </div>

                {/* Form to submit a new request */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 bg-white p-3.5 rounded-xl border border-amber-200">
                  <select
                    value={reqField}
                    onChange={(e) => setReqField(e.target.value)}
                    className="p-2 bg-slate-50 border border-slate-300 rounded-lg font-bold"
                  >
                    {PROTECTED_FIELD_OPTIONS.map((opt) => (
                      <option key={opt.field} value={opt.field}>
                        {opt.label}
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    value={reqNewValue}
                    onChange={(e) => setReqNewValue(e.target.value)}
                    placeholder="Nouvelle valeur demandée..."
                    className="p-2 bg-white border border-slate-300 rounded-lg"
                  />

                  <input
                    type="text"
                    value={reqReason}
                    onChange={(e) => setReqReason(e.target.value)}
                    placeholder="Motif / Justificatif (ex: Acte de naissance)"
                    className="p-2 bg-white border border-slate-300 rounded-lg"
                  />

                  <button
                    type="button"
                    onClick={() => {
                      if (!reqNewValue.trim()) return;
                      const chosen =
                        PROTECTED_FIELD_OPTIONS.find((o) => o.field === reqField) ||
                        PROTECTED_FIELD_OPTIONS[0];
                      requestProfileChange(
                        student.id,
                        [
                          {
                            field: chosen.field,
                            label: chosen.label,
                            oldValue: chosen.currentVal || 'Non renseigné',
                            newValue: reqNewValue.trim(),
                          },
                        ],
                        reqReason.trim() || 'Demande de rectification officielle'
                      );
                      setReqNewValue('');
                      setReqReason('');
                      showAppToast({
                        type: 'success',
                        title: 'Demande soumise à la Scolarité',
                        message: 'Votre demande de rectification est en attente de validation.',
                      });
                    }}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg cursor-pointer"
                  >
                    Soumettre pour validation
                  </button>
                </div>

                {/* List of requests for this student */}
                {studentPendingRequests.length > 0 && (
                  <div className="space-y-2">
                    {studentPendingRequests.map((req) => (
                      <div
                        key={req.id}
                        className="p-3.5 bg-white rounded-xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                req.status === 'APPROVED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : req.status === 'REJECTED'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {req.status === 'APPROVED'
                                ? 'VALIDÉE'
                                : req.status === 'REJECTED'
                                ? 'REJETÉE'
                                : 'EN ATTENTE DE VALIDATION'}
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono">
                              {new Date(req.requestedAt).toLocaleString('fr-FR')}
                            </span>
                          </div>
                          {req.changes.map((c, i) => (
                            <p key={i} className="font-bold text-slate-900">
                              {c.label} : <span className="line-through text-slate-400">{c.oldValue}</span> →{' '}
                              <span className="text-blue-700">{c.newValue}</span>
                            </p>
                          ))}
                          <p className="text-[11px] text-slate-600">Motif : {req.reason}</p>
                          {req.reviewComment && (
                            <p className="text-[11px] font-semibold text-slate-700">
                              Décision ({req.reviewedBy}) : {req.reviewComment}
                            </p>
                          )}
                        </div>

                        {isAdminMode && req.status === 'PENDING' && (
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              type="text"
                              value={adminRejectComment[req.id] || ''}
                              onChange={(e) =>
                                setAdminRejectComment({
                                  ...adminRejectComment,
                                  [req.id]: e.target.value,
                                })
                              }
                              placeholder="Commentaire ou motif..."
                              className="p-1.5 border border-slate-300 rounded-lg text-[11px]"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                approveProfileChangeRequest(
                                  req.id,
                                  adminRejectComment[req.id] || 'Validé sur présentation de pièce officielle'
                                )
                              }
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer"
                            >
                              Approuver & Appliquer
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                rejectProfileChangeRequest(
                                  req.id,
                                  adminRejectComment[req.id] || 'Justificatif officiel manquant ou non conforme'
                                )
                              }
                              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg cursor-pointer"
                            >
                              Rejeter
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Gestion de la sécurité (Réinitialisation mot de passe / Suspension Admin) */}
              {isAdminMode && (
                <div className="bg-white p-5 rounded-2xl border border-[#DCE3EC] shadow-2xs space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-sm font-black text-[#17345B] uppercase tracking-wider">
                        Gestion administrative de la sécurité du compte
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Réinitialisation par email, définition d’un mot de passe temporaire haché ou suspension d’accès.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isSendingResetEmail}
                        onClick={async () => {
                          setIsSendingResetEmail(true);
                          const res = await sendUserPasswordResetEmail(student.id);
                          setIsSendingResetEmail(false);
                          setSecurityFeedback({
                            type: res.success ? 'success' : 'error',
                            text: res.message,
                          });
                        }}
                        className="px-3.5 py-2 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 border border-blue-200 font-bold rounded-xl cursor-pointer transition-colors"
                      >
                        Envoyer un lien de réinitialisation par e-mail
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleUserStatus(student.id)}
                        className={`px-3.5 py-2 font-bold rounded-xl cursor-pointer border ${
                          student.isActive
                            ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-600 hover:text-white'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-600 hover:text-white'
                        }`}
                      >
                        {student.isActive ? 'Suspendre le compte' : 'Réactiver le compte'}
                      </button>
                    </div>
                  </div>

                  {securityFeedback && (
                    <div
                      className={`p-3 rounded-xl font-bold ${
                        securityFeedback.type === 'success'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}
                    >
                      {securityFeedback.text}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="text"
                      value={newPasswordInput}
                      onChange={(e) => setNewPasswordInput(e.target.value)}
                      placeholder="Définir un nouveau mot de passe temporaire (min. 6 caractères)"
                      className="flex-1 p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setNewPasswordInput(generateRandomPassword());
                        setCopiedPassword(false);
                      }}
                      className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      Générer
                    </button>
                    {newPasswordInput && (
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(newPasswordInput);
                          setCopiedPassword(true);
                          setTimeout(() => setCopiedPassword(false), 2000);
                        }}
                        className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl flex items-center gap-1 cursor-pointer"
                      >
                        {copiedPassword ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        Copier
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        const res = setDirectUserPassword(student.id, newPasswordInput, forceChangeNextLogin);
                        setSecurityFeedback({
                          type: res.success ? 'success' : 'error',
                          text: res.message,
                        });
                        if (res.success) setNewPasswordInput('');
                      }}
                      className="px-4 py-2.5 bg-[#17345B] hover:bg-slate-800 text-white font-bold rounded-xl cursor-pointer"
                    >
                      Appliquer le mot de passe
                    </button>
                  </div>
                </div>
              )}

              {/* Historique des modifications du dossier (Section 3 - Onglet 7) */}
              <div className="bg-white p-5 rounded-2xl border border-[#DCE3EC] shadow-2xs space-y-3">
                <div className="flex items-center gap-2 text-xs font-black uppercase text-[#17345B]">
                  <History className="w-4 h-4 text-[#2F6FED]" />
                  <span>Historique traçable des modifications du dossier</span>
                </div>
                {!student.modificationHistory || student.modificationHistory.length === 0 ? (
                  <p className="text-slate-400 italic">
                    Aucune modification enregistrée depuis l’immatriculation initiale.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {student.modificationHistory.map((h) => (
                      <div
                        key={h.id}
                        className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2"
                      >
                        <div>
                          <span className="font-bold text-slate-900">{h.authorName}</span>
                          <span className="text-slate-600">
                            {' '}
                            — Champ <strong>{h.field}</strong> : « {h.oldValue} » → « {h.newValue} »
                          </span>
                        </div>
                        <span className="font-mono text-[10px] text-slate-400">
                          {new Date(h.timestamp).toLocaleString('fr-FR')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* =================================================================
              EXTENSION ADMINISTRATION 1 : NOTES & DÉLIBÉRATION LMD
             ================================================================= */}
          {activeTab === 'EXT_GRADES' && (
            <div className="space-y-4 text-xs">
              {(() => {
                const annualDelib = computeStudentDeliberationPreview(
                  student.id,
                  selectedAcademicYear,
                  'ANNUEL'
                );
                const studentGroupObj = groups.find((g) => g.id === student.groupId);
                const filteredModalEcs = ecs.filter((ec) => {
                  const ue = ues.find((u) => u.id === ec.ueId);
                  if (ue && studentGroupObj && ue.filiereId !== studentGroupObj.filiereId) {
                    return false;
                  }
                  if (studentGradeSemester !== 'ANNUEL' && ec.semester !== studentGradeSemester) {
                    return false;
                  }
                  return true;
                });

                const recordedGradesForYear = grades.filter(
                  (g) =>
                    g.studentId === student.id &&
                    (!g.academicYear || g.academicYear === selectedAcademicYear) &&
                    g.finalScore !== undefined &&
                    Number.isFinite(g.finalScore)
                );
                const hasRealGrades = recordedGradesForYear.length > 0;

                return (
                  <div className="bg-white p-5 rounded-2xl border border-[#DCE3EC] shadow-2xs space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <div>
                          <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                            Année Académique
                          </span>
                          <select
                            value={selectedAcademicYear}
                            onChange={(e) => setSelectedAcademicYear(e.target.value)}
                            className="p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                          >
                            {academicYears.map((ay) => (
                              <option key={ay.id} value={ay.code}>
                                {ay.code}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                            Période LMD
                          </span>
                          <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                            {(['ANNUEL', 'S1', 'S2'] as const).map((sem) => (
                              <button
                                key={sem}
                                type="button"
                                onClick={() => setStudentGradeSemester(sem)}
                                className={`px-3 py-1 rounded-lg font-bold cursor-pointer ${
                                  studentGradeSemester === sem
                                    ? 'bg-[#2F6FED] text-white'
                                    : 'text-slate-600 hover:bg-white'
                                }`}
                              >
                                {sem === 'ANNUEL' ? 'Annuel (S1+S2)' : sem}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">
                          Moyenne Générale & Crédits ECTS
                        </span>
                        {hasRealGrades ? (
                          <span className="text-base font-black text-[#17345B]">
                            {annualDelib.finalAverage.toFixed(2)} / 20 • {annualDelib.validatedCredits} /{' '}
                            {annualDelib.totalCreditsAttempted || 60} ECTS
                          </span>
                        ) : (
                          <span className="text-sm font-bold text-slate-400 italic">
                            Non disponible (aucune note enregistrée)
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="border border-slate-200 rounded-2xl overflow-hidden">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                          <tr>
                            <th className="p-3">Sem.</th>
                            <th className="p-3">UE / Élément Constitutif (EC)</th>
                            <th className="p-3 text-center">Session 1</th>
                            <th className="p-3 text-center">Rattrapage</th>
                            <th className="p-3 text-center">Note Retenue</th>
                            <th className="p-3 text-center">Statut</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredModalEcs.map((ec) => {
                            const ue = ues.find((u) => u.id === ec.ueId);
                            const studentGrade = getStudentEcGrade(student.id, ec.id);
                            const s1G = studentGrade?.session1Score ?? studentGrade?.finalScore;
                            const rattrapageG = studentGrade?.rattrapageScore;
                            const finalG =
                              s1G !== undefined && rattrapageG !== undefined
                                ? Math.max(s1G, rattrapageG)
                                : rattrapageG !== undefined
                                ? rattrapageG
                                : s1G;
                            const hasScore = finalG !== undefined && Number.isFinite(finalG);
                            const isSuccess = hasScore && finalG >= 10;

                            return (
                              <tr key={ec.id} className="hover:bg-slate-50">
                                <td className="p-3 font-mono font-bold">{ec.semester}</td>
                                <td className="p-3">
                                  <span className="font-bold text-slate-800 block">
                                    {ec.code} — {ec.title} ({ec.creditsEcts} ECTS)
                                  </span>
                                  <span className="text-[10px] text-slate-400">
                                    {ue?.code} • {ue?.title}
                                  </span>
                                </td>
                                <td className="p-3 text-center font-mono">
                                  {s1G !== undefined && Number.isFinite(s1G)
                                    ? `${s1G.toFixed(2)} / 20`
                                    : 'Non disponible'}
                                </td>
                                <td className="p-3 text-center font-mono">
                                  {rattrapageG !== undefined && Number.isFinite(rattrapageG)
                                    ? `${rattrapageG.toFixed(2)} / 20`
                                    : '—'}
                                </td>
                                <td className="p-3 text-center font-black">
                                  {hasScore ? (
                                    <span className={isSuccess ? 'text-emerald-700' : 'text-rose-700'}>
                                      {finalG.toFixed(2)} / 20
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 font-normal italic">
                                      Non disponible
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 text-center">
                                  {hasScore ? (
                                    <span
                                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                        isSuccess
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : 'bg-rose-100 text-rose-800'
                                      }`}
                                    >
                                      {isSuccess ? 'Validé' : 'À rattraper'}
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500">
                                      En attente
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* =================================================================
              EXTENSION ADMINISTRATION 2 : FINANCES & ÉCOLAGES
             ================================================================= */}
          {activeTab === 'EXT_FINANCES' && (
            <div className="space-y-4 text-xs">
              {(() => {
                const fin = getStudentFinancialSummary(student.id);
                const selectableFees = fees.filter((f) => !f.studentId || f.studentId === student.id);
                const studentPayments = payments.filter((p) => p.studentId === student.id);

                return (
                  <div className="bg-white p-5 rounded-2xl border border-[#DCE3EC] shadow-2xs space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                          Total Facturé
                        </span>
                        <span className="text-lg font-black text-slate-900">
                          {fin.totalFeesAr.toLocaleString()} Ar
                        </span>
                      </div>
                      <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl">
                        <span className="text-[10px] font-bold text-emerald-700 uppercase block mb-1">
                          Total Réglé Encaissé
                        </span>
                        <span className="text-lg font-black text-emerald-800">
                          {fin.totalPaidAr.toLocaleString()} Ar
                        </span>
                      </div>
                      <div
                        className={`p-3.5 rounded-2xl border ${
                          fin.balanceDueAr > 0
                            ? 'bg-rose-50 border-rose-300 text-rose-900'
                            : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                        }`}
                      >
                        <span className="text-[10px] font-bold uppercase block mb-1">Solde Impayé / Dû</span>
                        <span className="text-lg font-black">{fin.balanceDueAr.toLocaleString()} Ar</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3.5 bg-blue-50 border border-blue-200 rounded-xl">
                      <div>
                        <span className="font-bold text-blue-900 block">
                          Encaisser un règlement pour {student.name}
                        </span>
                        <span className="text-blue-700 text-[11px]">
                          Émission immédiate d’un reçu officiel synchronisé avec la comptabilité
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setQuickPayError(null);
                          setQuickPaySuccess(null);
                          const firstUnpaid = fin.feeDetails.find((fd) => fd.remainingAr > 0);
                          if (firstUnpaid) {
                            setQuickPayFeeId(firstUnpaid.fee.id);
                            setQuickPayAmount(firstUnpaid.remainingAr);
                          } else if (selectableFees[0]) {
                            setQuickPayFeeId(selectableFees[0].id);
                            setQuickPayAmount(selectableFees[0].amountAr);
                          }
                          setIsQuickPayOpen(!isQuickPayOpen);
                        }}
                        className="px-3.5 py-2 bg-[#2F6FED] hover:bg-blue-700 text-white font-bold rounded-xl cursor-pointer"
                      >
                        {isQuickPayOpen ? 'Fermer' : '+ Encaisser maintenant'}
                      </button>
                    </div>

                    {isQuickPayOpen && (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          setQuickPayError(null);
                          setQuickPaySuccess(null);
                          if (!quickPayFeeId || quickPayAmount <= 0) {
                            setQuickPayError('Veuillez sélectionner un frais et un montant valide.');
                            return;
                          }
                          const res = recordPayment({
                            studentId: student.id,
                            feeId: quickPayFeeId,
                            amountPaidAr: Number(quickPayAmount),
                            paymentMethod: quickPayMethod,
                            referenceNumber: quickPayRef,
                            notes: 'Règlement enregistré depuis le Dossier Étudiant Unique',
                          });
                          if (res.success) {
                            setQuickPaySuccess(`Paiement enregistré ! Reçu ${res.receiptNumber} émis.`);
                            setQuickPayRef('');
                          } else {
                            setQuickPayError(res.error || 'Erreur lors de l’encaissement.');
                          }
                        }}
                        className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3"
                      >
                        {quickPayError && (
                          <div className="p-2.5 bg-rose-50 text-rose-800 rounded-lg font-bold">
                            {quickPayError}
                          </div>
                        )}
                        {quickPaySuccess && (
                          <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-lg font-bold">
                            {quickPaySuccess}
                          </div>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <select
                            value={quickPayFeeId}
                            onChange={(e) => setQuickPayFeeId(e.target.value)}
                            className="p-2 bg-white border border-slate-300 rounded-lg font-bold"
                          >
                            {selectableFees.map((f) => (
                              <option key={f.id} value={f.id}>
                                {f.title} ({f.amountAr.toLocaleString()} Ar)
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            value={quickPayAmount}
                            onChange={(e) => setQuickPayAmount(Number(e.target.value))}
                            className="p-2 bg-white border border-slate-300 rounded-lg font-bold"
                          />
                          <select
                            value={quickPayMethod}
                            onChange={(e) => setQuickPayMethod(e.target.value as any)}
                            className="p-2 bg-white border border-slate-300 rounded-lg font-semibold"
                          >
                            <option value="MOBILE_MONEY">Mobile Money</option>
                            <option value="ESPECES">Espèces</option>
                            <option value="DEPOT_BANCAIRE">Dépôt Bancaire</option>
                            <option value="VIREMENT_BANCAIRE">Virement Bancaire</option>
                          </select>
                        </div>
                        <div className="flex justify-end">
                          <button
                            type="submit"
                            className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-xl cursor-pointer"
                          >
                            Valider l’encaissement
                          </button>
                        </div>
                      </form>
                    )}

                    {cancellingPaymentId && (
                      <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2">
                        <input
                          type="text"
                          value={cancelReasonText}
                          onChange={(e) => setCancelReasonText(e.target.value)}
                          placeholder="Motif d'annulation du reçu..."
                          className="flex-1 p-2 bg-white border border-rose-300 rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!cancelReasonText.trim()) return;
                            cancelPayment(cancellingPaymentId, cancelReasonText.trim());
                            setCancellingPaymentId(null);
                          }}
                          className="px-3 py-2 bg-rose-600 text-white font-bold rounded-lg cursor-pointer"
                        >
                          Confirmer annulation
                        </button>
                      </div>
                    )}

                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500">
                          <tr>
                            <th className="p-2.5">N° Reçu</th>
                            <th className="p-2.5">Date</th>
                            <th className="p-2.5">Frais</th>
                            <th className="p-2.5 text-right">Montant</th>
                            <th className="p-2.5 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {studentPayments.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="p-4 text-center text-slate-400 italic">
                                Aucun paiement enregistré.
                              </td>
                            </tr>
                          ) : (
                            studentPayments.map((p) => {
                              const feeObj = fees.find((f) => f.id === p.feeId);
                              return (
                                <tr key={p.id} className={p.isCancelled ? 'opacity-50 line-through' : ''}>
                                  <td className="p-2.5 font-mono font-bold text-blue-700">{p.receiptNumber}</td>
                                  <td className="p-2.5">{p.paymentDate}</td>
                                  <td className="p-2.5">{feeObj?.title || 'Frais'}</td>
                                  <td className="p-2.5 text-right font-black text-emerald-700">
                                    {p.amountPaidAr.toLocaleString()} Ar
                                  </td>
                                  <td className="p-2.5 text-right">
                                    {!p.isCancelled && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setCancellingPaymentId(p.id);
                                          setCancelReasonText('Erreur de saisie');
                                        }}
                                        className="px-2 py-1 bg-rose-50 text-rose-700 rounded font-bold text-[10px]"
                                      >
                                        Annuler
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* =====================================================================
            PIED DE MODALE FIXE (ACTIONS COMMUNES)
           ===================================================================== */}
        <div className="px-6 py-3.5 bg-[#F5F7FA] border-t border-[#DCE3EC] flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="text-xs text-slate-500">
            {isEditing ? (
              isDirty ? (
                <span className="text-[#D58A18] font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  Modifications en attente d’enregistrement
                </span>
              ) : (
                <span>Mode édition actif ({isAdminMode ? 'Administration complète' : 'Champs autorisés étudiant'})</span>
              )
            ) : (
              <span>Dossier étudiant unique EBM Institute — Source de données centralisée Firestore</span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!isEditing ? (
              <>
                {canEditDossier && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 bg-[#2F6FED] hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Modifier le dossier
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-[#17345B] hover:bg-slate-800 text-white font-bold rounded-xl text-xs cursor-pointer"
                >
                  Fermer
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-[#DCE3EC] font-bold rounded-xl text-xs cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveDossier()}
                  className="px-5 py-2 bg-[#2F6FED] hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  Enregistrer le dossier
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
