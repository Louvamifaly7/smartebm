import React, { useState, useEffect, useMemo } from 'react';
import {
  User,
  StudentAddress,
  TeacherEmergencyContact,
  TeacherAcademicDiploma,
  TeacherComplementaryTraining,
  TeacherWorkExperience,
  TeacherTeachingExperience,
  TeacherLanguageSkill,
  TeacherPedagogicalResponsibility,
  TeacherAdminDocument,
  TeacherDocumentCategory,
  DocumentVerificationStatus,
  TeacherAvailabilitySlot,
} from '../types';
import { useApp } from '../context/AppContext';
import { WIDE_TEACHER_SLOTS, buildWideAvailabilities } from './UserProfileModal';
import { exportTeacherScheduleToPDF } from '../utils/pdfExport';
import { getAntananarivoDateStr } from '../utils/securityAndDateUtils';
import { showAppToast, requestAppConfirm } from './ToastAndConfirmCenter';
import {
  User as UserIcon,
  Mail,
  Phone,
  MapPin,
  GraduationCap,
  Briefcase,
  BookOpen,
  FileText,
  Shield,
  CheckCircle2,
  AlertCircle,
  Clock,
  Edit2,
  Save,
  X,
  Plus,
  Trash2,
  Upload,
  Download,
  Eye,
  EyeOff,
  Printer,
  Calendar,
  Award,
  Globe,
  Lock,
  RefreshCw,
  ExternalLink,
  Check,
  Ban,
  Send,
  Layers,
  Sparkles,
  Building2,
} from 'lucide-react';

export type TeacherDossierTab =
  | 'TAB_1_IDENTITY'
  | 'TAB_2_CONTACT'
  | 'TAB_3_QUALIFICATIONS'
  | 'TAB_4_EXPERIENCE'
  | 'TAB_5_PEDAGOGY'
  | 'TAB_6_DOCUMENTS'
  | 'TAB_7_SECURITY';

export interface TeacherDossierCompleteness {
  percentage: number;
  completedCount: number;
  totalRequired: number;
  missingItems: string[];
  dimensions: {
    personal: number;
    professional: number;
    pedagogical: number;
  };
}

export const NORMALIZED_ACADEMIC_SPECIALTIES: string[] = [
  'Droit privé',
  'Droit public',
  'Gestion',
  'Finance',
  'Comptabilité',
  'Marketing',
  'Informatique',
  'Développement logiciel',
  'Intelligence artificielle',
  'Cybersécurité',
  'Réseaux',
  'Big Data',
  'Économie',
  'Management',
  'Sciences humaines',
];

export const TEACHER_DOC_CATALOG: {
  category: TeacherDocumentCategory;
  type: string;
  label: string;
  required: boolean;
  sensitiveForScheduler?: boolean;
}[] = [
  // Catégorie 1 : Identité
  {
    category: 'IDENTITE',
    type: 'PHOTO_IDENTITE',
    label: "Photo d'identité professionnelle",
    required: true,
    sensitiveForScheduler: false,
  },
  {
    category: 'IDENTITE',
    type: 'CIN_RECTO',
    label: "Pièce d'identité (CIN / Passeport) – Recto",
    required: true,
    sensitiveForScheduler: true,
  },
  {
    category: 'IDENTITE',
    type: 'CIN_VERSO',
    label: "Pièce d'identité (CIN) – Verso",
    required: false,
    sensitiveForScheduler: true,
  },
  {
    category: 'IDENTITE',
    type: 'PASSEPORT',
    label: 'Passeport en cours de validité',
    required: false,
    sensitiveForScheduler: true,
  },
  // Catégorie 2 : Diplômes et qualifications
  {
    category: 'DIPLOMES_QUALIFICATIONS',
    type: 'DIPLOME_BAC',
    label: 'Diplôme du baccalauréat',
    required: false,
  },
  {
    category: 'DIPLOMES_QUALIFICATIONS',
    type: 'DIPLOME_UNIV',
    label: 'Diplôme universitaire le plus élevé (Master / Doctorat / HDR)',
    required: true,
  },
  {
    category: 'DIPLOMES_QUALIFICATIONS',
    type: 'RELEVES_NOTES',
    label: 'Relevés de notes / équivalences académiques',
    required: false,
  },
  {
    category: 'DIPLOMES_QUALIFICATIONS',
    type: 'ATTESTATION_REUSSITE',
    label: 'Attestations de réussite ou d’habilitation',
    required: false,
  },
  {
    category: 'DIPLOMES_QUALIFICATIONS',
    type: 'CERTIFICAT_PRO',
    label: 'Certificats professionnels & attestations de formation',
    required: false,
  },
  // Catégorie 3 : Documents professionnels
  {
    category: 'PROFESSIONNEL',
    type: 'CV_ACADEMIQUE',
    label: 'Curriculum Vitae (CV) académique et professionnel à jour',
    required: true,
  },
  {
    category: 'PROFESSIONNEL',
    type: 'ATTESTATION_EMPLOI',
    label: "Attestations d'emploi / Certificats de travail",
    required: false,
  },
  {
    category: 'PROFESSIONNEL',
    type: 'ATTESTATION_EXPERIENCE',
    label: "Attestations d'expérience d'enseignement",
    required: false,
  },
  {
    category: 'PROFESSIONNEL',
    type: 'REFERENCES_PRO',
    label: 'Lettres de recommandation / Références professionnelles',
    required: false,
  },
  // Catégorie 4 : Documents administratifs EBM
  {
    category: 'ADMINISTRATIF_EBM',
    type: 'CONTRAT_EBM',
    label: "Contrat d'enseignement ou de vacation EBM Institute",
    required: true,
    sensitiveForScheduler: true,
  },
  {
    category: 'ADMINISTRATIF_EBM',
    type: 'AVENANT_CONTRAT',
    label: 'Avenants au contrat',
    required: false,
    sensitiveForScheduler: true,
  },
  {
    category: 'ADMINISTRATIF_EBM',
    type: 'DECISION_RECRUTEMENT',
    label: 'Décision de recrutement / Décision de nomination',
    required: false,
    sensitiveForScheduler: true,
  },
  {
    category: 'ADMINISTRATIF_EBM',
    type: 'ATTESTATION_FONCTION',
    label: 'Attestation de fonction EBM Institute',
    required: false,
  },
  {
    category: 'ADMINISTRATIF_EBM',
    type: 'RIB_BANCAIRE',
    label: 'Relevé d’Identité Bancaire (RIB)',
    required: false,
    sensitiveForScheduler: true,
  },
];

export const TEACHER_DOC_STATUS_CONFIG: Record<
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

const DEFAULT_WEEK_DAYS: TeacherAvailabilitySlot['day'][] = [
  'LUNDI',
  'MARDI',
  'MERCREDI',
  'JEUDI',
  'VENDREDI',
  'SAMEDI',
];

/**
 * Calcule le taux de complétude du dossier enseignant unique (Section 7 du Cahier des charges)
 * en distinguant les champs obligatoires des champs facultatifs.
 */
export function computeTeacherDossierCompleteness(teacher: User): TeacherDossierCompleteness {
  const hasPhoto = Boolean(teacher.photoUrl || teacher.avatarUrl || teacher.avatar);
  const hasIdentity = Boolean(teacher.name && teacher.name.trim().length > 1 && (teacher.gender || teacher.civilite));
  const hasBirth = Boolean(teacher.birthDate && teacher.birthPlace);
  const hasNationality = Boolean(teacher.nationality);
  const hasCin = Boolean(teacher.cin);
  const hasContact = Boolean(teacher.email && teacher.phone);
  const hasAddress = Boolean(
    teacher.address ||
      teacher.permanentAddress?.addressLine ||
      teacher.permanentAddress?.neighborhood ||
      teacher.city
  );
  const hasEmergency = Boolean(
    (teacher.emergencyContacts && teacher.emergencyContacts.length > 0) || teacher.emergencyContact
  );

  // Dimension professionnelle
  const hasDiplomas = Boolean(
    (teacher.teacherDiplomas && teacher.teacherDiplomas.length > 0) || teacher.highestDiploma
  );
  const hasAcademicRank = Boolean(teacher.academicRank || teacher.jobTitle);
  const hasExperience = Boolean(
    (teacher.professionalExperiences && teacher.professionalExperiences.length > 0) ||
      (teacher.teachingExperiences && teacher.teachingExperiences.length > 0) ||
      teacher.profession
  );
  const hasContract = Boolean(teacher.contractType && (teacher.hireDate || teacher.recruitmentDate));
  const hasCv = Boolean(
    teacher.cvFileUrl ||
      teacher.cvFileName ||
      teacher.teacherDocuments?.some((d) => d.type === 'CV_ACADEMIQUE' && d.status !== 'MANQUANT')
  );

  // Dimension pédagogique
  const hasSpecialties = Boolean(
    (teacher.academicSpecialties && teacher.academicSpecialties.length > 0) ||
      teacher.specialty ||
      (teacher.subjects && teacher.subjects.length > 0)
  );
  const hasAvailabilities = Boolean(teacher.availabilities && teacher.availabilities.length > 0);
  const hasLanguagesOrSkills = Boolean(
    (teacher.languagesSpoken && teacher.languagesSpoken.length > 0) ||
      (teacher.technicalSkills && teacher.technicalSkills.length > 0) ||
      (teacher.pedagogicalSkills && teacher.pedagogicalSkills.length > 0)
  );

  const personalChecks = [
    { label: 'Photo professionnelle', ok: hasPhoto },
    { label: 'Identité & Civilité', ok: hasIdentity },
    { label: 'Date et lieu de naissance', ok: hasBirth },
    { label: 'Nationalité', ok: hasNationality },
    { label: "Pièce d'identité (CIN / Passeport)", ok: hasCin },
    { label: 'Email & Téléphone principal', ok: hasContact },
    { label: 'Adresse permanente ou actuelle', ok: hasAddress },
    { label: "Contact d'urgence", ok: hasEmergency },
  ];

  const professionalChecks = [
    { label: 'Diplômes universitaires', ok: hasDiplomas },
    { label: 'Grade universitaire / Fonction', ok: hasAcademicRank },
    { label: 'Expérience professionnelle ou enseignement', ok: hasExperience },
    { label: 'Statut contractuel & prise de fonction EBM', ok: hasContract },
    { label: 'Curriculum Vitae (CV) déposé', ok: hasCv },
  ];

  const pedagogicalChecks = [
    { label: 'Spécialités académiques / Matières', ok: hasSpecialties },
    { label: 'Grille de disponibilités hebdomadaires', ok: hasAvailabilities },
    { label: 'Compétences & Langues d’enseignement', ok: hasLanguagesOrSkills },
  ];

  const allChecks = [...personalChecks, ...professionalChecks, ...pedagogicalChecks];
  const completedCount = allChecks.filter((c) => c.ok).length;
  const totalRequired = allChecks.length;
  const percentage = Math.round((completedCount / totalRequired) * 100);

  const calcDim = (arr: { ok: boolean }[]) =>
    arr.length > 0 ? Math.round((arr.filter((x) => x.ok).length / arr.length) * 100) : 100;

  return {
    percentage,
    completedCount,
    totalRequired,
    missingItems: allChecks.filter((c) => !c.ok).map((c) => c.label),
    dimensions: {
      personal: calcDim(personalChecks),
      professional: calcDim(professionalChecks),
      pedagogical: calcDim(pedagogicalChecks),
    },
  };
}

interface TeacherProfileFormProps {
  teacher: User;
  mode: 'self-service' | 'administration';
  onClose: () => void;
  initialEditMode?: boolean;
  initialTab?: TeacherDossierTab;
  onNavigateToMyCourses?: () => void;
}

export const TeacherProfileForm: React.FC<TeacherProfileFormProps> = ({
  teacher,
  mode,
  onClose,
  initialEditMode = false,
  initialTab = 'TAB_1_IDENTITY',
  onNavigateToMyCourses,
}) => {
  const {
    currentUser,
    users,
    courses,
    ues,
    ecs,
    groups,
    filieres,
    parcours,
    rooms,
    sessions,
    homework,
    submissions,
    selectedAcademicYear,
    updateTeacher,
    updateUser,
    updateCourse,
    getTeacherHourlyStats,
    toggleUserStatus,
    toggleGoogleCalendarLink,
    sendUserPasswordResetEmail,
    setDirectUserPassword,
    changePassword,
    profileChangeRequests,
    requestProfileChange,
    approveProfileChangeRequest,
    rejectProfileChangeRequest,
  } = useApp();

  // Live reactive teacher reference from context
  const liveTeacher = useMemo(
    () => users.find((u) => u.id === teacher.id) || teacher,
    [users, teacher]
  );

  // ===============================================================
  // RÔLES ET PERMISSIONS (Section 4 & Section 9 du Cahier des charges)
  // ===============================================================
  const isSelf = currentUser.id === liveTeacher.id;
  const isSuperAdmin = currentUser.role === 'ADMIN';
  const isAcademicHead = currentUser.role === 'ACADEMIC_HEAD';
  const isScolariteOrHr = ['SCOLARITE', 'ADMIN_STAFF'].includes(currentUser.role);
  const isFinance = currentUser.role === 'FINANCE';
  const isScheduler = currentUser.role === 'SCHEDULER';

  // Administration full access (Super Admin, Direction académique, Scolarité/RH)
  const canAdminValidateAndEditAll = isSuperAdmin || isAcademicHead || isScolariteOrHr;
  // Who can view/edit contractual & payroll data (Section 9: Protected from SCHEDULER)
  const canViewContractAndPayroll = isSuperAdmin || isAcademicHead || isScolariteOrHr || isFinance || isSelf;
  const canEditContractAndPayroll = isSuperAdmin || isAcademicHead || isScolariteOrHr || isFinance;
  // Who can view sensitive identity/contract documents (Section 9: SCHEDULER has no automatic access to identity docs or contracts)
  const canViewSensitiveDocs = isSuperAdmin || isAcademicHead || isScolariteOrHr || isFinance || isSelf;
  // Who can edit pedagogical assignments & availabilities
  const canEditPedagogyAndSchedule = canAdminValidateAndEditAll || isScheduler;
  // Can open edit mode on allowed fields
  const canEnterEditMode = isSelf || canAdminValidateAndEditAll || isFinance || isScheduler;

  const [activeTab, setActiveTab] = useState<TeacherDossierTab>(initialTab);
  const [isEditing, setIsEditing] = useState<boolean>(initialEditMode);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [showRibClear, setShowRibClear] = useState<boolean>(false);
  const [pdfPeriod, setPdfPeriod] = useState<'WEEK' | 'MONTH' | 'SEMESTER'>('WEEK');

  // ===============================================================
  // ÉTAT LOCAL DU FORMULAIRE (Hydraté depuis liveTeacher sans perte)
  // ===============================================================
  // Onglet 1 – Identité & État civil
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [civilite, setCivilite] = useState<'M.' | 'Mme' | 'Mlle' | 'Dr.' | 'Prof.'>('Dr.');
  const [lastName, setLastName] = useState<string>('');
  const [firstName, setFirstName] = useState<string>('');
  const [preferredName, setPreferredName] = useState<string>('');
  const [gender, setGender] = useState<'M' | 'F' | 'AUTRE'>('M');
  const [birthDate, setBirthDate] = useState<string>('');
  const [birthPlace, setBirthPlace] = useState<string>('');
  const [birthCountry, setBirthCountry] = useState<string>('Madagascar');
  const [nationality, setNationality] = useState<string>('Malagasy');
  const [secondaryNationality, setSecondaryNationality] = useState<string>('');
  const [maritalStatus, setMaritalStatus] = useState<
    'CELIBATAIRE' | 'MARIE' | 'DIVORCE' | 'VEUF' | 'AUTRE'
  >('CELIBATAIRE');

  // Pièce d'identité
  const [identityDocType, setIdentityDocType] = useState<'CIN' | 'PASSEPORT' | 'AUTRE'>('CIN');
  const [identityDocOtherLabel, setIdentityDocOtherLabel] = useState<string>('');
  const [cin, setCin] = useState<string>('');
  const [identityIssueDate, setIdentityIssueDate] = useState<string>('');
  const [identityIssuePlace, setIdentityIssuePlace] = useState<string>('');
  const [identityIssuingAuthority, setIdentityIssuingAuthority] = useState<string>('');
  const [identityIssuingCountry, setIdentityIssuingCountry] = useState<string>('Madagascar');
  const [identityExpiryDate, setIdentityExpiryDate] = useState<string>('');
  const [identityFrontName, setIdentityFrontName] = useState<string>('');
  const [identityFrontUrl, setIdentityFrontUrl] = useState<string>('');
  const [identityBackName, setIdentityBackName] = useState<string>('');
  const [identityBackUrl, setIdentityBackUrl] = useState<string>('');
  const [identityVerificationStatus, setIdentityVerificationStatus] =
    useState<DocumentVerificationStatus>('EN_ATTENTE');

  // Informations administratives
  const [staffMatricule, setStaffMatricule] = useState<string>('');
  const [teacherStatus, setTeacherStatus] = useState<
    'ACTIF' | 'SUSPENDU' | 'INACTIF' | 'ANCIEN_ENSEIGNANT'
  >('ACTIF');
  const [administrativeNotes, setAdministrativeNotes] = useState<string>('');

  // Onglet 2 – Coordonnées
  const [personalEmail, setPersonalEmail] = useState<string>('');
  const [workEmail, setWorkEmail] = useState<string>('');
  const [email, setEmail] = useState<string>(''); // Email institutionnel EBM
  const [phone, setPhone] = useState<string>('');
  const [secondaryPhone, setSecondaryPhone] = useState<string>('');
  const [whatsappPhone, setWhatsappPhone] = useState<string>('');
  const [linkedInUrl, setLinkedInUrl] = useState<string>('');
  const [orcidUrl, setOrcidUrl] = useState<string>('');
  const [websiteUrl, setWebsiteUrl] = useState<string>('');
  const [officeLocation, setOfficeLocation] = useState<string>('');
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
  const [emergencyContacts, setEmergencyContacts] = useState<TeacherEmergencyContact[]>([]);

  // Onglet 3 – Formation, Diplômes & Qualifications
  const [academicRank, setAcademicRank] = useState<string>('');
  const [highestDiploma, setHighestDiploma] = useState<string>('');
  const [almaMater, setAlmaMater] = useState<string>('');
  const [teacherDiplomas, setTeacherDiplomas] = useState<TeacherAcademicDiploma[]>([]);
  const [complementaryTrainings, setComplementaryTrainings] = useState<
    TeacherComplementaryTraining[]
  >([]);
  const [academicSpecialties, setAcademicSpecialties] = useState<string[]>([]);
  const [customSpecialtyInput, setCustomSpecialtyInput] = useState<string>('');

  // Onglet 4 – Expérience & Situation professionnelle
  const [employmentStatus, setEmploymentStatus] = useState<User['employmentStatus']>('ENSEIGNANT_CHERCHEUR');
  const [profession, setProfession] = useState<string>('');
  const [employer, setEmployer] = useState<string>('');
  const [jobFunction, setJobFunction] = useState<string>('');
  const [activitySector, setActivitySector] = useState<string>('');
  const [workAddress, setWorkAddress] = useState<string>('');
  const [workPhone, setWorkPhone] = useState<string>('');
  const [professionalExperiences, setProfessionalExperiences] = useState<TeacherWorkExperience[]>(
    []
  );
  const [teachingExperiences, setTeachingExperiences] = useState<TeacherTeachingExperience[]>([]);

  // Situation contractuelle à EBM Institute
  const [recruitmentDate, setRecruitmentDate] = useState<string>('');
  const [hireDate, setHireDate] = useState<string>('');
  const [contractType, setContractType] = useState<NonNullable<User['contractType']>>('VACATAIRE');
  const [jobTitle, setJobTitle] = useState<string>('');
  const [department, setDepartment] = useState<string>('');
  const [service, setService] = useState<string>('');
  const [supervisorName, setSupervisorName] = useState<string>('');
  const [contractDuration, setContractDuration] = useState<string>('');
  const [contractEndDate, setContractEndDate] = useState<string>('');
  const [hourlyRateAr, setHourlyRateAr] = useState<number>(40000);
  const [weeklyMaxHours, setWeeklyMaxHours] = useState<number>(18);
  const [bankRib, setBankRib] = useState<string>('');

  // Onglet 5 – Compétences, Spécialités & Affectations pédagogiques
  const [competenceDomains, setCompetenceDomains] = useState<string[]>([]);
  const [secondarySpecialties, setSecondarySpecialties] = useState<string[]>([]);
  const [technicalSkills, setTechnicalSkills] = useState<string[]>([]);
  const [pedagogicalSkills, setPedagogicalSkills] = useState<string[]>([]);
  const [languagesSpoken, setLanguagesSpoken] = useState<TeacherLanguageSkill[]>([]);
  const [softwareTools, setSoftwareTools] = useState<string[]>([]);
  const [pedagogicalResponsibilities, setPedagogicalResponsibilities] = useState<
    TeacherPedagogicalResponsibility[]
  >([]);
  const [newSkillText, setNewSkillText] = useState<{
    domain: string;
    secondary: string;
    technical: string;
    pedagogical: string;
    tool: string;
  }>({ domain: '', secondary: '', technical: '', pedagogical: '', tool: '' });
  const [selectedCourseToAssign, setSelectedCourseToAssign] = useState<string>('');

  // Onglet 6 – Documents & Justificatifs
  const [teacherDocuments, setTeacherDocuments] = useState<TeacherAdminDocument[]>([]);
  const [docCategoryFilter, setDocCategoryFilter] = useState<TeacherDocumentCategory | 'ALL'>('ALL');
  const [previewDoc, setPreviewDoc] = useState<{ title: string; url: string; fileName?: string } | null>(
    null
  );
  const [rejectingDocId, setRejectingDocId] = useState<string | null>(null);
  const [rejectionReasonText, setRejectionReasonText] = useState<string>('');

  // Onglet 7 – Compte & Sécurité + Demandes de rectification (Section 6)
  const [moodleUsername, setMoodleUsername] = useState<string>('');
  const [moodleLinked, setMoodleLinked] = useState<boolean>(false);
  const [newPasswordInput, setNewPasswordInput] = useState<string>('');
  const [forceChangeNextLogin, setForceChangeNextLogin] = useState<boolean>(false);
  const [rectificationField, setRectificationField] = useState<string>('name');
  const [rectificationNewValue, setRectificationNewValue] = useState<string>('');
  const [rectificationReason, setRectificationReason] = useState<string>('');

  // Hydrate all fields from liveTeacher
  const hydrateFromTeacher = (t: User) => {
    setPhotoUrl(t.photoUrl || t.avatarUrl || t.avatar || '');
    setCivilite(t.civilite || 'Dr.');

    // Split name if lastName / firstName not explicitly stored
    if (t.lastName || t.firstName) {
      setLastName(t.lastName || '');
      setFirstName(t.firstName || '');
    } else {
      const parts = (t.name || '').trim().split(/\s+/);
      if (parts.length > 1) {
        setLastName(parts[0]);
        setFirstName(parts.slice(1).join(' '));
      } else {
        setLastName(t.name || '');
        setFirstName('');
      }
    }

    setPreferredName(t.preferredName || '');
    setGender(t.gender || (t.civilite === 'Mme' || t.civilite === 'Mlle' ? 'F' : 'M'));
    setBirthDate(t.birthDate || '');
    setBirthPlace(t.birthPlace || '');
    setBirthCountry(t.birthCountry || 'Madagascar');
    setNationality(t.nationality || 'Malagasy');
    setSecondaryNationality(t.secondaryNationality || '');
    setMaritalStatus(t.maritalStatus || 'CELIBATAIRE');

    setIdentityDocType(t.identityDocType || 'CIN');
    setIdentityDocOtherLabel(t.identityDocOtherLabel || '');
    setCin(t.cin || '');
    setIdentityIssueDate(t.identityIssueDate || '');
    setIdentityIssuePlace(t.identityIssuePlace || '');
    setIdentityIssuingAuthority(t.identityIssuingAuthority || '');
    setIdentityIssuingCountry(t.identityIssuingCountry || 'Madagascar');
    setIdentityExpiryDate(t.identityExpiryDate || '');
    setIdentityFrontName(t.identityFrontName || '');
    setIdentityFrontUrl(t.identityFrontUrl || '');
    setIdentityBackName(t.identityBackName || '');
    setIdentityBackUrl(t.identityBackUrl || '');
    setIdentityVerificationStatus(
      t.identityVerificationStatus || (t.cin ? 'VALIDE' : 'MANQUANT')
    );

    setStaffMatricule(
      t.staffMatricule ||
        t.matricule ||
        `ENS-EBM-${t.id.replace(/[^0-9]/g, '').padStart(4, '0').slice(-4) || '0001'}`
    );
    setTeacherStatus(t.teacherStatus || (t.isActive ? 'ACTIF' : 'SUSPENDU'));
    setAdministrativeNotes(t.administrativeNotes || '');

    setPersonalEmail(t.personalEmail || '');
    setWorkEmail(t.workEmail || '');
    setEmail(t.email || '');
    setPhone(t.phone || '');
    setSecondaryPhone(t.secondaryPhone || '');
    setWhatsappPhone(t.whatsappPhone || t.secondaryPhone || '');
    setLinkedInUrl(t.linkedInUrl || '');
    setOrcidUrl(t.orcidUrl || '');
    setWebsiteUrl(t.websiteUrl || '');
    setOfficeLocation(t.officeLocation || '');

    const permAddr: StudentAddress = t.permanentAddress || {
      addressLine: t.address || '',
      lotNumber: '',
      neighborhood: '',
      commune: t.city || 'Antananarivo',
      district: 'Antananarivo Renivohitra',
      region: 'Analamanga',
      country: 'Madagascar',
      postalCode: t.postalCode || '101',
    };
    setPermanentAddress(permAddr);
    setSameAsPermanentAddress(t.sameAsPermanentAddress ?? true);
    setCurrentAddress(t.currentAddress || permAddr);

    // Hydrate emergencyContacts from legacy emergencyContact if needed
    if (t.emergencyContacts && t.emergencyContacts.length > 0) {
      setEmergencyContacts(t.emergencyContacts);
    } else if (t.emergencyContact) {
      setEmergencyContacts([
        {
          id: 'emg-legacy-1',
          fullName: t.emergencyContact,
          relation: 'Proche / Conjoint(e)',
          primaryPhone: t.secondaryPhone || t.phone || '',
          address: t.address || '',
        },
      ]);
    } else {
      setEmergencyContacts([]);
    }

    // Onglet 3 : Diplômes & Spécialités
    setAcademicRank(t.academicRank || 'Maître de Conférences');
    setHighestDiploma(t.highestDiploma || '');
    setAlmaMater(t.almaMater || '');

    if (t.teacherDiplomas && t.teacherDiplomas.length > 0) {
      setTeacherDiplomas(t.teacherDiplomas);
    } else if (t.highestDiploma) {
      setTeacherDiplomas([
        {
          id: 'dip-legacy-1',
          title: t.highestDiploma,
          field: t.department || 'Enseignement Supérieur',
          specialty: t.specialty || (t.subjects && t.subjects[0]) || 'Général',
          level: t.highestDiploma.toLowerCase().includes('doctorat')
            ? 'DOCTORAT'
            : t.highestDiploma.toLowerCase().includes('hdr')
            ? 'HDR'
            : 'MASTER_2',
          institution: t.almaMater || 'Université d’Antananarivo',
          country: 'Madagascar',
          year: '2018',
          honors: 'Très Honorable',
          verificationStatus: 'VALIDE',
        },
      ]);
    } else {
      setTeacherDiplomas([]);
    }

    setComplementaryTrainings(t.complementaryTrainings || []);

    const specs = new Set<string>(t.academicSpecialties || []);
    if (t.specialty) specs.add(t.specialty);
    (t.subjects || []).forEach((s) => specs.add(s));
    setAcademicSpecialties(Array.from(specs));

    // Onglet 4 : Expériences & Contrat EBM
    setEmploymentStatus(t.employmentStatus || 'ENSEIGNANT_CHERCHEUR');
    setProfession(t.profession || t.academicRank || 'Enseignant-Chercheur');
    setEmployer(t.employer || 'EBM Institute');
    setJobFunction(t.jobFunction || t.jobTitle || t.academicRank || 'Enseignant');
    setActivitySector(t.activitySector || 'Enseignement Supérieur & Recherche');
    setWorkAddress(t.workAddress || 'Campus EBM Institute, Antananarivo');
    setWorkPhone(t.workPhone || t.phone || '');
    setProfessionalExperiences(t.professionalExperiences || []);
    setTeachingExperiences(
      t.teachingExperiences && t.teachingExperiences.length > 0
        ? t.teachingExperiences
        : [
            {
              id: 'teachexp-ebm-1',
              institution: 'EBM Institute',
              roleTitle: t.academicRank || 'Enseignant',
              taughtDomain: t.specialty || (t.subjects || []).join(', ') || 'Enseignement supérieur',
              teachingLevel: 'Licence & Master (LMD)',
              startDate: t.hireDate || '2023-09-01',
              yearsOfExperience: 4,
              trainingTypes: 'Formation initiale & continue (Présentiel / Hybride)',
            },
          ]
    );

    setRecruitmentDate(t.recruitmentDate || t.hireDate || '');
    setHireDate(t.hireDate || '');
    setContractType(t.contractType || 'VACATAIRE');
    setJobTitle(t.jobTitle || t.academicRank || 'Enseignant');
    setDepartment(t.department || 'Sciences & Technologies / Gestion');
    setService(t.service || 'Direction Pédagogique');
    setSupervisorName(t.supervisorName || 'Direction Académique EBM');
    setContractDuration(t.contractDuration || (t.contractType === 'PERMANENT' ? 'CDI' : 'Année universitaire'));
    setContractEndDate(t.contractEndDate || '');
    setHourlyRateAr(t.hourlyRateAr || 40000);
    setWeeklyMaxHours(t.weeklyMaxHours || 18);
    setBankRib(t.bankRib || '');

    // Onglet 5 : Compétences & Responsabilités
    setCompetenceDomains(
      t.competenceDomains && t.competenceDomains.length > 0
        ? t.competenceDomains
        : t.department
        ? [t.department]
        : ['Enseignement Supérieur']
    );
    setSecondarySpecialties(t.secondarySpecialties || []);
    setTechnicalSkills(t.technicalSkills || (t.subjects || []));
    setPedagogicalSkills(
      t.pedagogicalSkills && t.pedagogicalSkills.length > 0
        ? t.pedagogicalSkills
        : ['Pédagogie active LMD', 'Encadrement de projets', 'Évaluation par compétences']
    );
    setLanguagesSpoken(
      t.languagesSpoken && t.languagesSpoken.length > 0
        ? t.languagesSpoken
        : [
            { id: 'lang-fr', language: 'Français', level: 'COURANT' },
            { id: 'lang-mg', language: 'Malagasy', level: 'LANGUE_MATERNELLE' },
            { id: 'lang-en', language: 'Anglais', level: 'AVANCE' },
          ]
    );
    setSoftwareTools(
      t.softwareTools && t.softwareTools.length > 0
        ? t.softwareTools
        : ['Moodle LMS', 'Google Workspace', 'Suite Bureautique & Recherche']
    );
    setPedagogicalResponsibilities(t.pedagogicalResponsibilities || []);

    // Onglet 6 : Documents & Justificatifs
    const existingDocs = t.teacherDocuments || [];
    const mergedDocs: TeacherAdminDocument[] = TEACHER_DOC_CATALOG.map((catItem) => {
      const found = existingDocs.find((d) => d.type === catItem.type);
      if (found) return found;

      // Auto-hydrate from legacy CV or CIN fields
      if (catItem.type === 'CV_ACADEMIQUE' && (t.cvFileName || t.cvFileUrl)) {
        return {
          id: `tdoc-${catItem.type}`,
          category: catItem.category,
          type: catItem.type,
          label: catItem.label,
          fileName: t.cvFileName || 'CV_Enseignant.pdf',
          fileUrl: t.cvFileUrl || '#cv-enseignant',
          uploadedAt: t.cvUploadedAt || getAntananarivoDateStr(),
          status: 'VALIDE',
        };
      }
      if (catItem.type === 'PHOTO_IDENTITE' && (t.photoUrl || t.avatarUrl)) {
        return {
          id: `tdoc-${catItem.type}`,
          category: catItem.category,
          type: catItem.type,
          label: catItem.label,
          fileName: 'Photo_Professionnelle.jpg',
          fileUrl: t.photoUrl || t.avatarUrl,
          uploadedAt: getAntananarivoDateStr(),
          status: 'VALIDE',
        };
      }
      if (catItem.type === 'CIN_RECTO' && t.identityFrontUrl) {
        return {
          id: `tdoc-${catItem.type}`,
          category: catItem.category,
          type: catItem.type,
          label: catItem.label,
          fileName: t.identityFrontName || 'CIN_Recto.pdf',
          fileUrl: t.identityFrontUrl,
          uploadedAt: getAntananarivoDateStr(),
          status: t.identityVerificationStatus || 'EN_ATTENTE',
        };
      }

      return {
        id: `tdoc-${catItem.type}`,
        category: catItem.category,
        type: catItem.type,
        label: catItem.label,
        status: 'MANQUANT',
      };
    });
    // Include any custom documents added previously
    existingDocs.forEach((d) => {
      if (!mergedDocs.some((m) => m.id === d.id || m.type === d.type)) {
        mergedDocs.push(d);
      }
    });
    setTeacherDocuments(mergedDocs);

    // Onglet 7 : Compte & Sécurité
    setMoodleUsername(t.moodleUsername || t.username || '');
    setMoodleLinked(Boolean(t.moodleLinked));
    setIsDirty(false);
  };

  useEffect(() => {
    hydrateFromTeacher(liveTeacher);
  }, [liveTeacher.id]);

  const markDirty = () => {
    if (!isDirty) setIsDirty(true);
  };

  // ===============================================================
  // SYNCHRONISATION AVEC LE SYSTÈME ACADÉMIQUE (Section 8)
  // ===============================================================
  const assignedCourses = useMemo(
    () => courses.filter((c) => (c.teacherIds || []).includes(liveTeacher.id)),
    [courses, liveTeacher.id]
  );

  const assignedEcs = useMemo(
    () => ecs.filter((ec) => (ec.teacherIds || []).includes(liveTeacher.id)),
    [ecs, liveTeacher.id]
  );

  const teacherSessions = useMemo(
    () => sessions.filter((s) => s.teacherId === liveTeacher.id && s.status !== 'CANCELLED'),
    [sessions, liveTeacher.id]
  );

  const pedagogicalMetrics = useMemo(() => {
    const hourlyStats = getTeacherHourlyStats(liveTeacher.id);
    const groupIdsSet = new Set<string>();
    assignedCourses.forEach((c) => (c.groupIds || []).forEach((gid) => groupIdsSet.add(gid)));
    teacherSessions.forEach((s) => (s.groupIds || []).forEach((gid) => groupIdsSet.add(gid)));

    const completedSessions = teacherSessions.filter(
      (s) => s.status === 'COMPLETED_VALIDATED'
    ).length;
    const pendingReports = teacherSessions.filter(
      (s) => s.status !== 'COMPLETED_VALIDATED' && !s.report?.content
    ).length;

    const assignedEcIds = new Set(assignedEcs.map((e) => e.id));
    const teacherHomework = homework.filter(
      (hw) => hw.teacherId === liveTeacher.id || assignedEcIds.has(hw.ecId)
    );
    const teacherHwIds = new Set(teacherHomework.map((h) => h.id));
    const ungradedSubmissions = submissions.filter(
      (sub) => teacherHwIds.has(sub.homeworkId) && !sub.isGraded
    ).length;

    const totalPlannedCourseHours = assignedCourses.reduce(
      (acc, c) => acc + (c.totalHours || 0),
      0
    );
    const remainingHours = Math.max(0, totalPlannedCourseHours - hourlyStats.totalCompleted);

    return {
      coursesCount: assignedCourses.length + assignedEcs.filter((e) => !assignedCourses.some((c) => c.code === e.code)).length,
      groupsCount: groupIdsSet.size,
      completedSessionsCount: completedSessions,
      totalSessionsCount: teacherSessions.length,
      validatedHours: hourlyStats.totalCompleted,
      scheduledHours: hourlyStats.totalScheduled,
      maxWeeklyHours: hourlyStats.maxWeekly,
      remainingHours,
      pendingReportsCount: pendingReports,
      pendingGradingCount: ungradedSubmissions,
    };
  }, [assignedCourses, assignedEcs, teacherSessions, homework, submissions, liveTeacher.id]);

  const completeness = useMemo(
    () => computeTeacherDossierCompleteness(liveTeacher),
    [liveTeacher]
  );

  const teacherChangeRequests = useMemo(
    () => profileChangeRequests.filter((r) => r.studentId === liveTeacher.id),
    [profileChangeRequests, liveTeacher.id]
  );

  // ===============================================================
  // ENREGISTREMENT DU DOSSIER UNIQUE DANS FIRESTORE
  // ===============================================================
  const handleSaveDossier = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const fullName = `${lastName.trim()} ${firstName.trim()}`.trim() || liveTeacher.name;
    if (!fullName || !email.trim()) {
      showAppToast({
        type: 'error',
        title: 'Champs obligatoires manquants',
        message: 'Le nom complet et l’email institutionnel EBM sont obligatoires.',
      });
      return;
    }

    const cvDoc = teacherDocuments.find((d) => d.type === 'CV_ACADEMIQUE' && d.fileUrl);

    const updates: Partial<User> = {
      photoUrl: photoUrl || undefined,
      avatarUrl: photoUrl || undefined,
      civilite,
      // Only Admin/Scolarité/Direction can directly overwrite official civil identity; teacher uses rectification request if locked
      ...(canAdminValidateAndEditAll
        ? {
            name: fullName,
            lastName: lastName.trim(),
            firstName: firstName.trim(),
            birthDate: birthDate || undefined,
            birthPlace: birthPlace.trim() || undefined,
            birthCountry: birthCountry.trim() || undefined,
            nationality: nationality.trim() || undefined,
            cin: cin.trim() || undefined,
            identityDocType,
            identityDocOtherLabel: identityDocOtherLabel.trim() || undefined,
            identityIssueDate: identityIssueDate || undefined,
            identityIssuePlace: identityIssuePlace.trim() || undefined,
            identityIssuingAuthority: identityIssuingAuthority.trim() || undefined,
            identityIssuingCountry: identityIssuingCountry.trim() || undefined,
            identityExpiryDate: identityExpiryDate || undefined,
            identityVerificationStatus,
            staffMatricule: staffMatricule.trim() || undefined,
            teacherStatus,
            isActive: teacherStatus === 'ACTIF',
            administrativeNotes: administrativeNotes.trim() || undefined,
          }
        : {}),
      preferredName: preferredName.trim() || undefined,
      gender,
      secondaryNationality: secondaryNationality.trim() || undefined,
      maritalStatus,
      identityFrontName: identityFrontName || undefined,
      identityFrontUrl: identityFrontUrl || undefined,
      identityBackName: identityBackName || undefined,
      identityBackUrl: identityBackUrl || undefined,

      // Coordonnées
      personalEmail: personalEmail.trim() || undefined,
      workEmail: workEmail.trim() || undefined,
      ...(canAdminValidateAndEditAll ? { email: email.trim() } : {}),
      phone: phone.trim() || undefined,
      secondaryPhone: secondaryPhone.trim() || undefined,
      whatsappPhone: whatsappPhone.trim() || undefined,
      linkedInUrl: linkedInUrl.trim() || undefined,
      orcidUrl: orcidUrl.trim() || undefined,
      websiteUrl: websiteUrl.trim() || undefined,
      officeLocation: officeLocation.trim() || undefined,
      permanentAddress,
      sameAsPermanentAddress,
      currentAddress: sameAsPermanentAddress ? permanentAddress : currentAddress,
      address:
        (sameAsPermanentAddress ? permanentAddress.addressLine : currentAddress.addressLine) ||
        liveTeacher.address,
      city:
        (sameAsPermanentAddress ? permanentAddress.commune : currentAddress.commune) ||
        liveTeacher.city,
      postalCode:
        (sameAsPermanentAddress ? permanentAddress.postalCode : currentAddress.postalCode) ||
        liveTeacher.postalCode,
      emergencyContacts,
      emergencyContact:
        emergencyContacts.length > 0
          ? `${emergencyContacts[0].fullName} (${emergencyContacts[0].primaryPhone})`
          : liveTeacher.emergencyContact,

      // Formation, Diplômes & Qualifications
      academicRank: academicRank.trim() || undefined,
      highestDiploma:
        teacherDiplomas[0]?.title || highestDiploma.trim() || liveTeacher.highestDiploma,
      almaMater:
        teacherDiplomas[0]?.institution || almaMater.trim() || liveTeacher.almaMater,
      teacherDiplomas,
      complementaryTrainings,
      academicSpecialties,
      specialty: academicSpecialties[0] || liveTeacher.specialty,
      subjects: academicSpecialties.length > 0 ? academicSpecialties : liveTeacher.subjects,

      // Expérience & Situation professionnelle
      employmentStatus,
      profession: profession.trim() || undefined,
      employer: employer.trim() || undefined,
      jobFunction: jobFunction.trim() || undefined,
      activitySector: activitySector.trim() || undefined,
      workAddress: workAddress.trim() || undefined,
      workPhone: workPhone.trim() || undefined,
      professionalExperiences,
      teachingExperiences,

      // Situation contractuelle EBM (protégée par permissions)
      ...(canEditContractAndPayroll
        ? {
            recruitmentDate: recruitmentDate || undefined,
            hireDate: hireDate || undefined,
            contractType,
            jobTitle: jobTitle.trim() || undefined,
            department: department.trim() || undefined,
            service: service.trim() || undefined,
            supervisorName: supervisorName.trim() || undefined,
            contractDuration: contractDuration.trim() || undefined,
            contractEndDate: contractEndDate || undefined,
            hourlyRateAr: Number(hourlyRateAr) || 40000,
            weeklyMaxHours: Number(weeklyMaxHours) || 18,
            bankRib: bankRib.trim() || undefined,
          }
        : {}),

      // Compétences & Responsabilités
      competenceDomains,
      secondarySpecialties,
      technicalSkills,
      pedagogicalSkills,
      languagesSpoken,
      softwareTools,
      ...(canAdminValidateAndEditAll ? { pedagogicalResponsibilities } : {}),

      // Documents & Justificatifs
      teacherDocuments,
      cvFileName: cvDoc?.fileName || liveTeacher.cvFileName,
      cvFileUrl: cvDoc?.fileUrl || liveTeacher.cvFileUrl,
      cvUploadedAt: cvDoc?.uploadedAt || liveTeacher.cvUploadedAt,

      // Compte & Sécurité
      moodleUsername: moodleUsername.trim() || undefined,
      moodleLinked,
      updatedAt: new Date().toISOString(),
    };

    updateTeacher(liveTeacher.id, updates);
    setIsDirty(false);
    setIsEditing(false);

    showAppToast({
      type: 'success',
      title: 'Dossier enseignant synchronisé',
      message: `Le dossier unique de ${fullName} a été enregistré et mis à jour en temps réel.`,
    });
  };

  const handleRequestClose = () => {
    if (isEditing && isDirty) {
      requestAppConfirm({
        title: 'Modifications non enregistrées',
        message:
          'Vous avez des modifications non enregistrées dans ce dossier enseignant. Voulez-vous vraiment fermer sans enregistrer ?',
        confirmLabel: 'Abandonner',
        cancelLabel: 'Continuer la saisie',
        variant: 'warning',
        onConfirm: () => {
          setIsEditing(false);
          setIsDirty(false);
          onClose();
        },
      });
      return;
    }
    onClose();
  };

  // ===============================================================
  // GESTION DES DISPONIBILITÉS HEBDOMADAIRES (07h–17h) & EXPORT PDF
  // ===============================================================
  const availGrid = useMemo(
    () => buildWideAvailabilities(liveTeacher.availabilities),
    [liveTeacher.availabilities]
  );

  const handleToggleSlot = (
    day: TeacherAvailabilitySlot['day'],
    slot: TeacherAvailabilitySlot['slot']
  ) => {
    if (!canEditPedagogyAndSchedule && !isSelf) return;
    const updatedGrid = availGrid.map((cell) =>
      cell.day === day && cell.slot === slot
        ? {
            ...cell,
            available: !cell.available,
            note: !cell.available ? 'Disponible' : 'Indisponible',
          }
        : cell
    );
    updateTeacher(liveTeacher.id, { availabilities: updatedGrid });
    showAppToast({
      type: 'info',
      title: 'Disponibilité mise à jour',
      message: `Créneau ${day} (${slot}) mis à jour.`,
    });
  };

  const handleSetDayAvailability = (
    day: TeacherAvailabilitySlot['day'],
    available: boolean
  ) => {
    if (!canEditPedagogyAndSchedule && !isSelf) return;
    const updatedGrid = availGrid.map((cell) =>
      cell.day === day
        ? { ...cell, available, note: available ? 'Disponible (07h-17h)' : 'Indisponible' }
        : cell
    );
    updateTeacher(liveTeacher.id, { availabilities: updatedGrid });
  };

  const handleExportSchedulePdf = (period: 'WEEK' | 'MONTH' | 'SEMESTER') => {
    const allTeacherSessions = sessions.filter((s) => s.teacherId === liveTeacher.id);
    const now = new Date();
    let filtered = allTeacherSessions;
    let periodLabel = 'Semestre Académique Complet';

    if (period === 'WEEK') {
      const day = now.getDay();
      const diffToMonday = (day + 6) % 7;
      const monday = new Date(now);
      monday.setDate(now.getDate() - diffToMonday);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      const startStr = getAntananarivoDateStr(monday);
      const endStr = getAntananarivoDateStr(sunday);
      const weekSessions = allTeacherSessions.filter(
        (s) => s.date >= startStr && s.date <= endStr
      );
      filtered = weekSessions.length > 0 ? weekSessions : allTeacherSessions;
      periodLabel = `Semaine du ${monday.toLocaleDateString('fr-FR')} au ${sunday.toLocaleDateString('fr-FR')}`;
    } else if (period === 'MONTH') {
      const ym = now.toISOString().slice(0, 7);
      const monthSessions = allTeacherSessions.filter((s) => s.date.startsWith(ym));
      filtered = monthSessions.length > 0 ? monthSessions : allTeacherSessions;
      periodLabel = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    }

    exportTeacherScheduleToPDF({
      teacher: liveTeacher,
      periodType: period,
      periodLabel,
      sessions: filtered,
      courses,
      rooms,
      groups,
    });
  };

  // ===============================================================
  // GESTION DE TELEVERSEMENT DE FICHIERS (Base64 / DataURL)
  // ===============================================================
  const handleFileUpload = (
    file: File | undefined,
    onLoaded: (fileName: string, dataUrl: string, sizeLabel: string) => void
  ) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      showAppToast({
        type: 'error',
        title: 'Fichier trop volumineux',
        message: 'La taille maximale autorisée par justificatif est de 10 Mo.',
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const sizeKb = Math.round(file.size / 1024);
      const sizeLabel = sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} Mo` : `${sizeKb} Ko`;
      onLoaded(file.name, String(reader.result || ''), sizeLabel);
      markDirty();
    };
    reader.readAsDataURL(file);
  };

  const renderFieldBox = (
    label: string,
    value: string | number | undefined | null,
    mono = false
  ) => {
    const hasVal = value !== undefined && value !== null && String(value).trim() !== '';
    return (
      <div className="p-3 bg-[#F5F7FA] rounded-xl border border-[#DCE3EC]">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
          {label}
        </span>
        {hasVal ? (
          <span className={`text-sm font-bold text-[#16202A] break-words ${mono ? 'font-mono' : ''}`}>
            {value}
          </span>
        ) : (
          <span className="text-xs italic text-slate-400">Non renseigné</span>
        )}
      </div>
    );
  };

  const TABS_CONFIG: {
    id: TeacherDossierTab;
    number: number;
    label: string;
    shortLabel: string;
    icon: React.FC<{ className?: string }>;
  }[] = [
    {
      id: 'TAB_1_IDENTITY',
      number: 1,
      label: 'Identité & État civil',
      shortLabel: '1. Identité',
      icon: UserIcon,
    },
    {
      id: 'TAB_2_CONTACT',
      number: 2,
      label: 'Coordonnées',
      shortLabel: '2. Coordonnées',
      icon: MapPin,
    },
    {
      id: 'TAB_3_QUALIFICATIONS',
      number: 3,
      label: 'Formation, Diplômes & Qualifications',
      shortLabel: '3. Diplômes',
      icon: GraduationCap,
    },
    {
      id: 'TAB_4_EXPERIENCE',
      number: 4,
      label: 'Expérience & Situation professionnelle',
      shortLabel: '4. Expérience & Contrat',
      icon: Briefcase,
    },
    {
      id: 'TAB_5_PEDAGOGY',
      number: 5,
      label: 'Compétences, Spécialités & Affectations',
      shortLabel: '5. Pédagogie & Cours',
      icon: BookOpen,
    },
    {
      id: 'TAB_6_DOCUMENTS',
      number: 6,
      label: 'Documents & Justificatifs',
      shortLabel: '6. Documents',
      icon: FileText,
    },
    {
      id: 'TAB_7_SECURITY',
      number: 7,
      label: 'Compte & Sécurité',
      shortLabel: '7. Compte & Sécurité',
      icon: Shield,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-6xl w-full shadow-2xl border border-[#DCE3EC] overflow-hidden my-auto max-h-[95vh] flex flex-col">
        {/* =================================================================
            EN-TÊTE COMMUN DU DOSSIER ENSEIGNANT (Section 5 du Cahier des charges)
           ================================================================= */}
        <div className="bg-[#17345B] text-white p-4 sm:p-6 shrink-0">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Identité & Photo professionnelle */}
            <div className="flex items-start sm:items-center gap-4">
              <div className="relative group shrink-0">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt={liveTeacher.name}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-white/30 shadow-md"
                  />
                ) : (
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 border-2 border-white/25 flex items-center justify-center font-black text-2xl text-white shadow-md">
                    {liveTeacher.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                )}
                {isEditing && (
                  <label className="absolute -bottom-1.5 -right-1.5 p-1.5 rounded-xl bg-[#2F6FED] hover:bg-blue-600 text-white shadow-md cursor-pointer transition-all">
                    <Upload className="w-3.5 h-3.5" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        handleFileUpload(e.target.files?.[0], (_, url) => setPhotoUrl(url))
                      }
                    />
                  </label>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-white/15 text-white text-[10px] font-black uppercase tracking-wider">
                    Dossier Enseignant Unique • EBM Institute
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md bg-[#2F6FED] text-white text-[10px] font-mono font-bold">
                    Matricule : {staffMatricule}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      teacherStatus === 'ACTIF'
                        ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30'
                        : teacherStatus === 'SUSPENDU'
                        ? 'bg-rose-500/20 text-rose-200 border border-rose-400/30'
                        : 'bg-amber-500/20 text-amber-200 border border-amber-400/30'
                    }`}
                  >
                    {teacherStatus === 'ACTIF'
                      ? '● Actif'
                      : teacherStatus === 'SUSPENDU'
                      ? '● Suspendu'
                      : teacherStatus === 'ANCIEN_ENSEIGNANT'
                      ? '● Ancien enseignant'
                      : '● Inactif'}
                  </span>
                  {isEditing && (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase">
                      Mode Édition {isDirty ? '• Modifications non enregistrées' : ''}
                    </span>
                  )}
                </div>

                <h2 className="text-lg sm:text-xl font-black tracking-tight mt-1 truncate">
                  {civilite} {lastName} {firstName}
                  {preferredName ? ` (${preferredName})` : ''}
                </h2>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-200 mt-1">
                  <span className="flex items-center gap-1 font-semibold text-amber-300">
                    <Award className="w-3.5 h-3.5" />
                    {academicRank || jobTitle || 'Enseignant'} • {contractType}
                  </span>
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-slate-300" />
                    {department || 'Département non renseigné'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-slate-300" />
                    {email}
                  </span>
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                    Spécialité : {academicSpecialties[0] || liveTeacher.specialty || 'À préciser'}
                  </span>
                </div>
              </div>
            </div>

            {/* Jauge de complétude (Section 7) & Actions d'en-tête */}
            <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end justify-between gap-3 shrink-0">
              {/* Indicateur de complétude */}
              <div className="bg-white/10 border border-white/15 rounded-2xl px-3.5 py-2 min-w-[240px]">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-slate-200">
                    Dossier enseignant : {completeness.percentage} % complet
                  </span>
                  <span className="text-[10px] font-mono text-emerald-300 font-bold">
                    {completeness.completedCount}/{completeness.totalRequired} requis
                  </span>
                </div>
                <div className="w-full h-2 bg-white/15 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      completeness.percentage >= 85
                        ? 'bg-emerald-400'
                        : completeness.percentage >= 60
                        ? 'bg-amber-400'
                        : 'bg-rose-400'
                    }`}
                    style={{ width: `${completeness.percentage}%` }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-1.5 mt-1.5 text-[9px] text-slate-200 font-semibold">
                  <span>Perso : {completeness.dimensions.personal}%</span>
                  <span>Pro : {completeness.dimensions.professional}%</span>
                  <span>Péda : {completeness.dimensions.pedagogical}%</span>
                </div>
              </div>

              {/* Boutons d'action de l'en-tête */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                  title="Imprimer la fiche enseignant officielle"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Imprimer
                </button>

                {!isEditing && canEnterEditMode && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-[#2F6FED] hover:bg-blue-600 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Modifier le dossier
                  </button>
                )}

                {isEditing && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        hydrateFromTeacher(liveTeacher);
                        setIsEditing(false);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold cursor-pointer"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveDossier()}
                      className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Enregistrer
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={handleRequestClose}
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-rose-500/80 text-white cursor-pointer transition-colors"
                  title="Fermer le dossier"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Barre des 7 Onglets Communs (Section 3) */}
          <div className="flex items-center gap-1.5 overflow-x-auto mt-4 pt-3 border-t border-white/15 no-scrollbar">
            {TABS_CONFIG.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white text-[#17345B] shadow-xs font-black'
                      : 'text-slate-200 hover:bg-white/10'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#2F6FED]' : 'text-slate-300'}`} />
                  <span>{tab.shortLabel}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* =================================================================
            CORPS DU DOSSIER ENSEIGNANT (7 ONGLETS)
           ================================================================= */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6 bg-[#F8FAFC]">
          {/* Alerte éléments manquants si incomplet */}
          {completeness.missingItems.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-900">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-black">
                    Éléments requis restants pour compléter le dossier à 100 % :
                  </span>{' '}
                  <span>{completeness.missingItems.join(' • ')}</span>
                </div>
              </div>
              {!isEditing && canEnterEditMode && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold shrink-0 self-start sm:self-center cursor-pointer"
                >
                  Compléter maintenant
                </button>
              )}
            </div>
          )}

          {/* ===============================================================
              ONGLET 1 – IDENTITÉ & ÉTAT CIVIL
             =============================================================== */}
          {activeTab === 'TAB_1_IDENTITY' && (
            <div className="space-y-6">
              {/* A. Identité personnelle */}
              <div className="bg-white p-5 rounded-2xl border border-[#DCE3EC] shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#2F6FED]">
                      Section 1.A • Dossier Personnel
                    </span>
                    <h3 className="text-base font-black text-[#16202A]">Identité personnelle</h3>
                  </div>
                  {!canAdminValidateAndEditAll && isSelf && (
                    <span className="text-[11px] px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                      État civil officiel : modification soumise à validation (Onglet 7)
                    </span>
                  )}
                </div>

                {!isEditing ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    {renderFieldBox('Civilité / Titre', civilite)}
                    {renderFieldBox('Nom', lastName)}
                    {renderFieldBox('Prénoms', firstName)}
                    {renderFieldBox("Nom d'usage", preferredName)}
                    {renderFieldBox(
                      'Sexe',
                      gender === 'M' ? 'Masculin' : gender === 'F' ? 'Féminin' : 'Autre'
                    )}
                    {renderFieldBox('Date de naissance', birthDate)}
                    {renderFieldBox('Lieu de naissance', birthPlace)}
                    {renderFieldBox('Pays de naissance', birthCountry)}
                    {renderFieldBox('Nationalité principale', nationality)}
                    {renderFieldBox('Nationalité secondaire', secondaryNationality)}
                    {renderFieldBox('Situation matrimoniale', maritalStatus)}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1">
                        Civilité
                      </label>
                      <select
                        value={civilite}
                        onChange={(e) => {
                          setCivilite(e.target.value as any);
                          markDirty();
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-[#DCE3EC] text-xs font-bold bg-white"
                      >
                        <option value="Prof.">Prof.</option>
                        <option value="Dr.">Dr.</option>
                        <option value="M.">M.</option>
                        <option value="Mme">Mme</option>
                        <option value="Mlle">Mlle</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1">
                        Nom {!canAdminValidateAndEditAll && '🔒'}
                      </label>
                      <input
                        type="text"
                        disabled={!canAdminValidateAndEditAll}
                        value={lastName}
                        onChange={(e) => {
                          setLastName(e.target.value);
                          markDirty();
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-[#DCE3EC] text-xs font-bold disabled:bg-slate-100"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1">
                        Prénoms {!canAdminValidateAndEditAll && '🔒'}
                      </label>
                      <input
                        type="text"
                        disabled={!canAdminValidateAndEditAll}
                        value={firstName}
                        onChange={(e) => {
                          setFirstName(e.target.value);
                          markDirty();
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-[#DCE3EC] text-xs font-bold disabled:bg-slate-100"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1">
                        Nom d'usage
                      </label>
                      <input
                        type="text"
                        value={preferredName}
                        onChange={(e) => {
                          setPreferredName(e.target.value);
                          markDirty();
                        }}
                        placeholder="Optionnel"
                        className="w-full px-3 py-2 rounded-xl border border-[#DCE3EC] text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1">
                        Sexe
                      </label>
                      <select
                        value={gender}
                        onChange={(e) => {
                          setGender(e.target.value as any);
                          markDirty();
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-[#DCE3EC] text-xs font-bold bg-white"
                      >
                        <option value="M">Masculin</option>
                        <option value="F">Féminin</option>
                        <option value="AUTRE">Autre</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1">
                        Date de naissance {!canAdminValidateAndEditAll && '🔒'}
                      </label>
                      <input
                        type="date"
                        disabled={!canAdminValidateAndEditAll}
                        value={birthDate}
                        onChange={(e) => {
                          setBirthDate(e.target.value);
                          markDirty();
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-[#DCE3EC] text-xs font-medium disabled:bg-slate-100"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1">
                        Lieu de naissance {!canAdminValidateAndEditAll && '🔒'}
                      </label>
                      <input
                        type="text"
                        disabled={!canAdminValidateAndEditAll}
                        value={birthPlace}
                        onChange={(e) => {
                          setBirthPlace(e.target.value);
                          markDirty();
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-[#DCE3EC] text-xs font-medium disabled:bg-slate-100"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1">
                        Pays de naissance
                      </label>
                      <input
                        type="text"
                        disabled={!canAdminValidateAndEditAll}
                        value={birthCountry}
                        onChange={(e) => {
                          setBirthCountry(e.target.value);
                          markDirty();
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-[#DCE3EC] text-xs font-medium disabled:bg-slate-100"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1">
                        Nationalité {!canAdminValidateAndEditAll && '🔒'}
                      </label>
                      <input
                        type="text"
                        disabled={!canAdminValidateAndEditAll}
                        value={nationality}
                        onChange={(e) => {
                          setNationality(e.target.value);
                          markDirty();
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-[#DCE3EC] text-xs font-medium disabled:bg-slate-100"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1">
                        Nationalité secondaire
                      </label>
                      <input
                        type="text"
                        value={secondaryNationality}
                        onChange={(e) => {
                          setSecondaryNationality(e.target.value);
                          markDirty();
                        }}
                        placeholder="Optionnel"
                        className="w-full px-3 py-2 rounded-xl border border-[#DCE3EC] text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1">
                        Situation matrimoniale
                      </label>
                      <select
                        value={maritalStatus}
                        onChange={(e) => {
                          setMaritalStatus(e.target.value as any);
                          markDirty();
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-[#DCE3EC] text-xs font-bold bg-white"
                      >
                        <option value="CELIBATAIRE">Célibataire</option>
                        <option value="MARIE">Marié(e)</option>
                        <option value="DIVORCE">Divorcé(e)</option>
                        <option value="VEUF">Veuf / Veuve</option>
                        <option value="AUTRE">Autre</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* B. Pièce d'identité (choix dynamique CIN / Passeport / Autre) */}
              <div className="bg-white p-5 rounded-2xl border border-[#DCE3EC] shadow-2xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#2F6FED]">
                      Section 1.B • Justificatif Officiel
                    </span>
                    <h3 className="text-base font-black text-[#16202A]">
                      Pièce d'identité ({identityDocType})
                    </h3>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                      TEACHER_DOC_STATUS_CONFIG[identityVerificationStatus]?.badgeClass ||
                      'bg-slate-100 text-slate-700'
                    }`}
                  >
                    Statut : {TEACHER_DOC_STATUS_CONFIG[identityVerificationStatus]?.label}
                  </span>
                </div>

                {!canViewSensitiveDocs ? (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3 text-xs text-slate-600">
                    <Lock className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>
                      Conformément aux règles de sécurité EBM (Section 9), les détails et copies des pièces d’identité sont restreints aux services habilités (Administration, RH/Scolarité et titulaire du compte).
                    </span>
                  </div>
                ) : !isEditing ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    {renderFieldBox('Type de pièce', identityDocType)}
                    {renderFieldBox(`Numéro ${identityDocType}`, cin, true)}
                    {renderFieldBox('Date de délivrance', identityIssueDate)}
                    {renderFieldBox('Lieu de délivrance', identityIssuePlace)}
                    {renderFieldBox('Autorité de délivrance', identityIssuingAuthority)}
                    {identityDocType !== 'CIN' &&
                      renderFieldBox('Pays émetteur', identityIssuingCountry)}
                    {identityDocType !== 'CIN' &&
                      renderFieldBox("Date d'expiration", identityExpiryDate)}
                    {renderFieldBox('Copie Recto', identityFrontName || (identityFrontUrl ? 'Fichier joint' : undefined))}
                    {identityDocType === 'CIN' &&
                      renderFieldBox('Copie Verso', identityBackName || (identityBackUrl ? 'Fichier joint' : undefined))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1">
                        Type de pièce d'identité
                      </label>
                      <select
                        disabled={!canAdminValidateAndEditAll}
                        value={identityDocType}
                        onChange={(e) => {
                          setIdentityDocType(e.target.value as any);
                          markDirty();
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-[#DCE3EC] text-xs font-bold bg-white disabled:bg-slate-100"
                      >
                        <option value="CIN">Carte d’Identité Nationale (CIN)</option>
                        <option value="PASSEPORT">Passeport</option>
                        <option value="AUTRE">Autre document officiel</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1">
                        Numéro de la pièce {!canAdminValidateAndEditAll && '🔒'}
                      </label>
                      <input
                        type="text"
                        disabled={!canAdminValidateAndEditAll}
                        value={cin}
                        onChange={(e) => {
                          setCin(e.target.value);
                          markDirty();
                        }}
                        placeholder="Ex: 101 231 456 789"
                        className="w-full px-3 py-2 rounded-xl border border-[#DCE3EC] text-xs font-mono font-bold disabled:bg-slate-100"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1">
                        Date de délivrance
                      </label>
                      <input
                        type="date"
                        disabled={!canAdminValidateAndEditAll}
                        value={identityIssueDate}
                        onChange={(e) => {
                          setIdentityIssueDate(e.target.value);
                          markDirty();
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-[#DCE3EC] text-xs font-medium disabled:bg-slate-100"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1">
                        Lieu de délivrance
                      </label>
                      <input
                        type="text"
                        disabled={!canAdminValidateAndEditAll}
                        value={identityIssuePlace}
                        onChange={(e) => {
                          setIdentityIssuePlace(e.target.value);
                          markDirty();
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-[#DCE3EC] text-xs font-medium disabled:bg-slate-100"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1">
                        Autorité de délivrance
                      </label>
                      <input
                        type="text"
                        value={identityIssuingAuthority}
                        onChange={(e) => {
                          setIdentityIssuingAuthority(e.target.value);
                          markDirty();
                        }}
                        placeholder="Ex: Chef de District / Ministère"
                        className="w-full px-3 py-2 rounded-xl border border-[#DCE3EC] text-xs font-medium"
                      />
                    </div>
                    {identityDocType !== 'CIN' && (
                      <>
                        <div>
                          <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1">
                            Pays émetteur
                          </label>
                          <input
                            type="text"
                            value={identityIssuingCountry}
                            onChange={(e) => {
                              setIdentityIssuingCountry(e.target.value);
                              markDirty();
                            }}
                            className="w-full px-3 py-2 rounded-xl border border-[#DCE3EC] text-xs font-medium"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1">
                            Date d'expiration
                          </label>
                          <input
                            type="date"
                            value={identityExpiryDate}
                            onChange={(e) => {
                              setIdentityExpiryDate(e.target.value);
                              markDirty();
                            }}
                            className="w-full px-3 py-2 rounded-xl border border-[#DCE3EC] text-xs font-medium"
                          />
                        </div>
                      </>
                    )}
                    {canAdminValidateAndEditAll && (
                      <div>
                        <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1">
                          Statut de vérification (Admin)
                        </label>
                        <select
                          value={identityVerificationStatus}
                          onChange={(e) => {
                            setIdentityVerificationStatus(e.target.value as DocumentVerificationStatus);
                            markDirty();
                          }}
                          className="w-full px-3 py-2 rounded-xl border border-[#DCE3EC] text-xs font-bold bg-white"
                        >
                          <option value="MANQUANT">Manquant</option>
                          <option value="DEPOSE">Déposé</option>
                          <option value="EN_ATTENTE">En attente de vérification</option>
                          <option value="VALIDE">Validé</option>
                          <option value="REJETE">Rejeté</option>
                          <option value="A_REMPLACER">À remplacer</option>
                          <option value="EXPIRE">Expiré</option>
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* C. Informations administratives */}
              <div className="bg-white p-5 rounded-2xl border border-[#DCE3EC] shadow-2xs space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#2F6FED]">
                    Section 1.C • Référentiel Établissement
                  </span>
                  <h3 className="text-base font-black text-[#16202A]">
                    Informations administratives
                  </h3>
                </div>

                {!isEditing ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    {renderFieldBox('Identifiant interne', liveTeacher.id, true)}
                    {renderFieldBox('Matricule du personnel', staffMatricule, true)}
                    {renderFieldBox(
                      'Date de création du dossier',
                      liveTeacher.createdAt
                        ? new Date(liveTeacher.createdAt).toLocaleDateString('fr-FR')
                        : '01/09/2025'
                    )}
                    {renderFieldBox('Statut administratif', teacherStatus)}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    {renderFieldBox('Identifiant interne (Système)', liveTeacher.id, true)}
                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1">
                        Matricule du personnel {!canAdminValidateAndEditAll && '🔒'}
                      </label>
                      <input
                        type="text"
                        disabled={!canAdminValidateAndEditAll}
                        value={staffMatricule}
                        onChange={(e) => {
                          setStaffMatricule(e.target.value);
                          markDirty();
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-[#DCE3EC] text-xs font-mono font-bold disabled:bg-slate-100"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1">
                        Statut administratif {!canAdminValidateAndEditAll && '🔒'}
                      </label>
                      <select
                        disabled={!canAdminValidateAndEditAll}
                        value={teacherStatus}
                        onChange={(e) => {
                          setTeacherStatus(e.target.value as any);
                          markDirty();
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-[#DCE3EC] text-xs font-bold bg-white disabled:bg-slate-100"
                      >
                        <option value="ACTIF">Actif</option>
                        <option value="SUSPENDU">Suspendu</option>
                        <option value="INACTIF">Inactif</option>
                        <option value="ANCIEN_ENSEIGNANT">Ancien enseignant</option>
                      </select>
                    </div>
                    {canAdminValidateAndEditAll && (
                      <div className="sm:col-span-2 lg:col-span-4">
                        <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1">
                          Observations administratives internes
                        </label>
                        <textarea
                          rows={2}
                          value={administrativeNotes}
                          onChange={(e) => {
                            setAdministrativeNotes(e.target.value);
                            markDirty();
                          }}
                          placeholder="Notes de suivi RH / Direction académique..."
                          className="w-full px-3 py-2 rounded-xl border border-[#DCE3EC] text-xs font-medium"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===============================================================
              ONGLET 2 – COORDONNÉES
             =============================================================== */}
          {activeTab === 'TAB_2_CONTACT' && (
            <div className="space-y-6">
              {/* A. Coordonnées électroniques & téléphoniques */}
              <div className="bg-white p-5 rounded-2xl border border-[#DCE3EC] shadow-2xs space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#2F6FED]">
                    Section 2.A • Canaux de communication
                  </span>
                  <h3 className="text-base font-black text-[#16202A]">
                    Coordonnées électroniques, téléphoniques & académiques
                  </h3>
                </div>

                {!isEditing ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {renderFieldBox('Email institutionnel EBM', email)}
                    {renderFieldBox('Email personnel', personalEmail)}
                    {renderFieldBox('Email professionnel', workEmail)}
                    {renderFieldBox('Téléphone principal', phone)}
                    {renderFieldBox('Téléphone secondaire', secondaryPhone)}
                    {renderFieldBox('Numéro WhatsApp', whatsappPhone)}
                    {renderFieldBox('Profil LinkedIn', linkedInUrl)}
                    {renderFieldBox('Identifiant ORCID / Google Scholar', orcidUrl)}
                    {renderFieldBox('Site personnel ou portfolio', websiteUrl)}
                    {renderFieldBox('Bureau / Salle des professeurs', officeLocation)}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1">
                        Email institutionnel EBM {!canAdminValidateAndEditAll && '🔒'}
                      </label>
                      <input
                        type="email"
                        disabled={!canAdminValidateAndEditAll}
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          markDirty();
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-[#DCE3EC] text-xs font-bold disabled:bg-slate-100"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1">
                        Email personnel
                      </label>
                      <input
                        type="email"
                        value={personalEmail}
                        onChange={(e) => {
                          setPersonalEmail(e.target.value);
                          markDirty();
                        }}
                        placeholder="prenom.nom@gmail.com"
                        className="w-full px-3 py-2 rounded-xl border border-[#DCE3EC] text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1">
                        Email professionnel externe
                      </label>
                      <input
                        type="email"
                        value={workEmail}
                        onChange={(e) => {
                          setWorkEmail(e.target.value);
                          markDirty();
                        }}
                        placeholder="contact@cabinet-organisation.mg"
                        className="w-full px-3 py-2 rounded-xl border border-[#DCE3EC] text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1">
                        Téléphone principal *
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => {
                          setPhone(e.target.value);
                          markDirty();
                        }}
                        placeholder="+261 34 00 000 00"
                        className="w-full px-3 py-2 rounded-xl border border-[#DCE3EC] text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1">
                        Téléphone secondaire
                      </label>
                      <input
                        type="tel"
                        value={secondaryPhone}
                        onChange={(e) => {
                          setSecondaryPhone(e.target.value);
                          markDirty();
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-[#DCE3EC] text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1">
                        Numéro WhatsApp
                      </label>
                      <input
                        type="tel"
                        value={whatsappPhone}
                        onChange={(e) => {
                          setWhatsappPhone(e.target.value);
                          markDirty();
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-[#DCE3EC] text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1">
                        Lien LinkedIn
                      </label>
                      <input
                        type="url"
                        value={linkedInUrl}
                        onChange={(e) => {
                          setLinkedInUrl(e.target.value);
                          markDirty();
                        }}
                        placeholder="https://linkedin.com/in/..."
                        className="w-full px-3 py-2 rounded-xl border border-[#DCE3EC] text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1">
                        ORCID / Google Scholar
                      </label>
                      <input
                        type="url"
                        value={orcidUrl}
                        onChange={(e) => {
                          setOrcidUrl(e.target.value);
                          markDirty();
                        }}
                        placeholder="https://orcid.org/0000-..."
                        className="w-full px-3 py-2 rounded-xl border border-[#DCE3EC] text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1">
                        Site personnel ou portfolio
                      </label>
                      <input
                        type="url"
                        value={websiteUrl}
                        onChange={(e) => {
                          setWebsiteUrl(e.target.value);
                          markDirty();
                        }}
                        placeholder="https://..."
                        className="w-full px-3 py-2 rounded-xl border border-[#DCE3EC] text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1">
                        Bureau / Localisation sur campus
                      </label>
                      <input
                        type="text"
                        value={officeLocation}
                        onChange={(e) => {
                          setOfficeLocation(e.target.value);
                          markDirty();
                        }}
                        placeholder="Ex: Bâtiment A - Bureau 204"
                        className="w-full px-3 py-2 rounded-xl border border-[#DCE3EC] text-xs font-medium"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* B & C. Adresse permanente & Adresse actuelle */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* B. Adresse permanente */}
                <div className="bg-white p-5 rounded-2xl border border-[#DCE3EC] shadow-2xs space-y-4">
                  <div className="border-b border-slate-100 pb-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#2F6FED]">
                      Section 2.B • Domicile Principal
                    </span>
                    <h3 className="text-base font-black text-[#16202A]">Adresse permanente</h3>
                  </div>

                  {!isEditing ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {renderFieldBox('Adresse', permanentAddress.addressLine)}
                      {renderFieldBox('Lot et numéro', permanentAddress.lotNumber)}
                      {renderFieldBox('Quartier / Fokontany', permanentAddress.neighborhood)}
                      {renderFieldBox('Commune / Ville', permanentAddress.commune)}
                      {renderFieldBox('District', permanentAddress.district)}
                      {renderFieldBox('Région', permanentAddress.region)}
                      {renderFieldBox('Pays', permanentAddress.country)}
                      {renderFieldBox('Code postal', permanentAddress.postalCode)}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2">
                        <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1">
                          Adresse complète
                        </label>
                        <input
                          type="text"
                          value={permanentAddress.addressLine || ''}
                          onChange={(e) => {
                            setPermanentAddress({
                              ...permanentAddress,
                              addressLine: e.target.value,
                            });
                            markDirty();
                          }}
                          className="w-full px-3 py-2 rounded-xl border border-[#DCE3EC] text-xs font-medium"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1">
                          Lot et numéro
                        </label>
                        <input
                          type="text"
                          value={permanentAddress.lotNumber || ''}
                          onChange={(e) => {
                            setPermanentAddress({ ...permanentAddress, lotNumber: e.target.value });
                            markDirty();
                          }}
                          className="w-full px-3 py-2 rounded-xl border border-[#DCE3EC] text-xs font-medium"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1">
                          Quartier / Fokontany
                        </label>
                        <input
                          type="text"
                          value={permanentAddress.neighborhood || ''}
                          onChange={(e) => {
                            setPermanentAddress({
                              ...permanentAddress,
                              neighborhood: e.target.value,
                            });
                            markDirty();
                          }}
                          className="w-full px-3 py-2 rounded-xl border border-[#DCE3EC] text-xs font-medium"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1">
                          Commune / Ville
                        </label>
                        <input
                          type="text"
                          value={permanentAddress.commune || ''}
                          onChange={(e) => {
                            setPermanentAddress({ ...permanentAddress, commune: e.target.value });
                            markDirty();
                          }}
                          className="w-full px-3 py-2 rounded-xl border border-[#DCE3EC] text-xs font-medium"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1">
                          District
                        </label>
                        <input
                          type="text"
                          value={permanentAddress.district || ''}
                          onChange={(e) => {
                            setPermanentAddress({ ...permanentAddress, district: e.target.value });
                            markDirty();
                          }}
                          className="w-full px-3 py-2 rounded-xl border border-[#DCE3EC] text-xs font-medium"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1">
                          Région
                        </label>
                        <input
                          type="text"
                          value={permanentAddress.region || ''}
                          onChange={(e) => {
                            setPermanentAddress({ ...permanentAddress, region: e.target.value });
                            markDirty();
                          }}
                          className="w-full px-3 py-2 rounded-xl border border-[#DCE3EC] text-xs font-medium"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1">
                          Code postal
                        </label>
                        <input
                          type="text"
                          value={permanentAddress.postalCode || ''}
                          onChange={(e) => {
                            setPermanentAddress({
                              ...permanentAddress,
                              postalCode: e.target.value,
                            });
                            markDirty();
                          }}
                          className="w-full px-3 py-2 rounded-xl border border-[#DCE3EC] text-xs font-medium"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* C. Adresse actuelle */}
                <div className="bg-white p-5 rounded-2xl border border-[#DCE3EC] shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#2F6FED]">
                        Section 2.C • Résidence Effective
                      </span>
                      <h3 className="text-base font-black text-[#16202A]">Adresse actuelle</h3>
                    </div>
                    <label className="flex items-center gap-2 text-xs font-bold text-[#17345B] cursor-pointer">
                      <input
                        type="checkbox"
                        disabled={!isEditing}
                        checked={sameAsPermanentAddress}
                        onChange={(e) => {
                          setSameAsPermanentAddress(e.target.checked);
                          if (e.target.checked) setCurrentAddress(permanentAddress);
                          markDirty();
                        }}
                        className="rounded text-[#2F6FED]"
                      />
                      Identique à l'adresse permanente
                    </label>
                  </div>

                  {sameAsPermanentAddress ? (
                    <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900 font-semibold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        L’adresse actuelle de l’enseignant est identique à son adresse permanente ({permanentAddress.addressLine || permanentAddress.commune || 'Antananarivo'}).
                      </span>
                    </div>
                  ) : !isEditing ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {renderFieldBox('Adresse', currentAddress.addressLine)}
                      {renderFieldBox('Lot et numéro', currentAddress.lotNumber)}
                      {renderFieldBox('Quartier / Fokontany', currentAddress.neighborhood)}
                      {renderFieldBox('Commune / Ville', currentAddress.commune)}
                      {renderFieldBox('District', currentAddress.district)}
                      {renderFieldBox('Région', currentAddress.region)}
                      {renderFieldBox('Pays', currentAddress.country)}
                      {renderFieldBox('Code postal', currentAddress.postalCode)}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2">
                        <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1">
                          Adresse actuelle
                        </label>
                        <input
                          type="text"
                          value={currentAddress.addressLine || ''}
                          onChange={(e) => {
                            setCurrentAddress({ ...currentAddress, addressLine: e.target.value });
                            markDirty();
                          }}
                          className="w-full px-3 py-2 rounded-xl border border-[#DCE3EC] text-xs font-medium"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1">
                          Lot et numéro
                        </label>
                        <input
                          type="text"
                          value={currentAddress.lotNumber || ''}
                          onChange={(e) => {
                            setCurrentAddress({ ...currentAddress, lotNumber: e.target.value });
                            markDirty();
                          }}
                          className="w-full px-3 py-2 rounded-xl border border-[#DCE3EC] text-xs font-medium"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1">
                          Quartier
                        </label>
                        <input
                          type="text"
                          value={currentAddress.neighborhood || ''}
                          onChange={(e) => {
                            setCurrentAddress({ ...currentAddress, neighborhood: e.target.value });
                            markDirty();
                          }}
                          className="w-full px-3 py-2 rounded-xl border border-[#DCE3EC] text-xs font-medium"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1">
                          Commune / Ville
                        </label>
                        <input
                          type="text"
                          value={currentAddress.commune || ''}
                          onChange={(e) => {
                            setCurrentAddress({ ...currentAddress, commune: e.target.value });
                            markDirty();
                          }}
                          className="w-full px-3 py-2 rounded-xl border border-[#DCE3EC] text-xs font-medium"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1">
                          Code postal
                        </label>
                        <input
                          type="text"
                          value={currentAddress.postalCode || ''}
                          onChange={(e) => {
                            setCurrentAddress({ ...currentAddress, postalCode: e.target.value });
                            markDirty();
                          }}
                          className="w-full px-3 py-2 rounded-xl border border-[#DCE3EC] text-xs font-medium"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* D. Contacts d'urgence multiples */}
              <div className="bg-white p-5 rounded-2xl border border-[#DCE3EC] shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#2F6FED]">
                      Section 2.D • Personnes à prévenir en cas d'urgence
                    </span>
                    <h3 className="text-base font-black text-[#16202A]">
                      Contacts d'urgence ({emergencyContacts.length})
                    </h3>
                  </div>
                  {isEditing && (
                    <button
                      type="button"
                      onClick={() => {
                        setEmergencyContacts([
                          ...emergencyContacts,
                          {
                            id: `emg-${Date.now()}`,
                            fullName: '',
                            relation: 'Conjoint(e)',
                            primaryPhone: '',
                            secondaryPhone: '',
                            email: '',
                            address: '',
                          },
                        ]);
                        markDirty();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#2F6FED] hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Ajouter un contact d'urgence
                    </button>
                  )}
                </div>

                {emergencyContacts.length === 0 ? (
                  <p className="text-xs italic text-slate-400">
                    Aucun contact d'urgence enregistré.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {emergencyContacts.map((contact, idx) => (
                      <div
                        key={contact.id}
                        className="p-4 rounded-2xl bg-[#F5F7FA] border border-[#DCE3EC] space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-[#17345B]">
                            Contact d'urgence #{idx + 1}
                          </span>
                          {isEditing && (
                            <button
                              type="button"
                              onClick={() => {
                                setEmergencyContacts(
                                  emergencyContacts.filter((c) => c.id !== contact.id)
                                );
                                markDirty();
                              }}
                              className="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        {!isEditing ? (
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-slate-400 block text-[10px]">Nom complet</span>
                              <span className="font-bold text-slate-800">{contact.fullName}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">Lien</span>
                              <span className="font-bold text-slate-800">{contact.relation}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">Tél. principal</span>
                              <span className="font-bold text-slate-800">
                                {contact.primaryPhone}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">Email</span>
                              <span className="font-medium text-slate-700">
                                {contact.email || '—'}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <input
                              type="text"
                              placeholder="Nom et prénoms *"
                              value={contact.fullName}
                              onChange={(e) => {
                                const next = [...emergencyContacts];
                                next[idx] = { ...contact, fullName: e.target.value };
                                setEmergencyContacts(next);
                                markDirty();
                              }}
                              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold"
                            />
                            <input
                              type="text"
                              placeholder="Lien (Conjoint, Parent, Frère...)"
                              value={contact.relation}
                              onChange={(e) => {
                                const next = [...emergencyContacts];
                                next[idx] = { ...contact, relation: e.target.value };
                                setEmergencyContacts(next);
                                markDirty();
                              }}
                              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                            />
                            <input
                              type="tel"
                              placeholder="Téléphone principal *"
                              value={contact.primaryPhone}
                              onChange={(e) => {
                                const next = [...emergencyContacts];
                                next[idx] = { ...contact, primaryPhone: e.target.value };
                                setEmergencyContacts(next);
                                markDirty();
                              }}
                              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold"
                            />
                            <input
                              type="tel"
                              placeholder="Téléphone secondaire"
                              value={contact.secondaryPhone || ''}
                              onChange={(e) => {
                                const next = [...emergencyContacts];
                                next[idx] = { ...contact, secondaryPhone: e.target.value };
                                setEmergencyContacts(next);
                                markDirty();
                              }}
                              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                            />
                            <input
                              type="email"
                              placeholder="Email"
                              value={contact.email || ''}
                              onChange={(e) => {
                                const next = [...emergencyContacts];
                                next[idx] = { ...contact, email: e.target.value };
                                setEmergencyContacts(next);
                                markDirty();
                              }}
                              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                            />
                            <input
                              type="text"
                              placeholder="Adresse"
                              value={contact.address || ''}
                              onChange={(e) => {
                                const next = [...emergencyContacts];
                                next[idx] = { ...contact, address: e.target.value };
                                setEmergencyContacts(next);
                                markDirty();
                              }}
                              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===============================================================
              ONGLET 3 – FORMATION, DIPLÔMES & QUALIFICATIONS
             =============================================================== */}
          {activeTab === 'TAB_3_QUALIFICATIONS' && (
            <div className="space-y-6">
              {/* A. Diplômes universitaires (multiples, liste extensible) */}
              <div className="bg-white p-5 rounded-2xl border border-[#DCE3EC] shadow-2xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#2F6FED]">
                      Section 3.A • Dossier Professionnel & Académique
                    </span>
                    <h3 className="text-base font-black text-[#16202A]">
                      Diplômes universitaires ({teacherDiplomas.length})
                    </h3>
                  </div>
                  {isEditing && (
                    <button
                      type="button"
                      onClick={() => {
                        setTeacherDiplomas([
                          ...teacherDiplomas,
                          {
                            id: `tdip-${Date.now()}`,
                            title: '',
                            field: '',
                            specialty: '',
                            level: 'MASTER_2',
                            institution: '',
                            country: 'Madagascar',
                            year: new Date().getFullYear().toString(),
                            honors: 'Bien',
                            diplomaNumber: '',
                            verificationStatus: 'EN_ATTENTE',
                          },
                        ]);
                        markDirty();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#2F6FED] hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Ajouter un diplôme universitaire
                    </button>
                  )}
                </div>

                {teacherDiplomas.length === 0 ? (
                  <p className="text-xs italic text-slate-400">
                    Aucun diplôme universitaire enregistré.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {teacherDiplomas.map((dip, idx) => (
                      <div
                        key={dip.id}
                        className="p-4 rounded-2xl bg-[#F5F7FA] border border-[#DCE3EC] space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-md bg-[#17345B] text-white text-[10px] font-black uppercase">
                              {dip.level}
                            </span>
                            <h4 className="text-sm font-black text-[#16202A]">
                              {dip.title || `Diplôme #${idx + 1}`}
                            </h4>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                TEACHER_DOC_STATUS_CONFIG[dip.verificationStatus]?.badgeClass
                              }`}
                            >
                              {TEACHER_DOC_STATUS_CONFIG[dip.verificationStatus]?.label}
                            </span>
                            {isEditing && (
                              <button
                                type="button"
                                onClick={() => {
                                  setTeacherDiplomas(
                                    teacherDiplomas.filter((d) => d.id !== dip.id)
                                  );
                                  markDirty();
                                }}
                                className="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {!isEditing ? (
                          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 text-xs">
                            <div>
                              <span className="text-[10px] text-slate-400 block">Domaine & Spécialité</span>
                              <span className="font-bold text-slate-800">
                                {dip.field} {dip.specialty ? `• ${dip.specialty}` : ''}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block">Établissement & Pays</span>
                              <span className="font-bold text-slate-800">
                                {dip.institution} ({dip.country})
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block">Année & Mention</span>
                              <span className="font-bold text-slate-800">
                                {dip.year} {dip.honors ? `• ${dip.honors}` : ''}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block">N° du diplôme</span>
                              <span className="font-mono font-bold text-slate-700">
                                {dip.diplomaNumber || 'Non renseigné'}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block">Justificatif</span>
                              {dip.documentUrl ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPreviewDoc({
                                      title: dip.title,
                                      url: dip.documentUrl!,
                                      fileName: dip.documentName,
                                    })
                                  }
                                  className="text-[#2F6FED] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  {dip.documentName || 'Voir copie'}
                                </button>
                              ) : (
                                <span className="italic text-slate-400">Non joint</span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                            <input
                              type="text"
                              placeholder="Intitulé du diplôme *"
                              value={dip.title}
                              onChange={(e) => {
                                const next = [...teacherDiplomas];
                                next[idx] = { ...dip, title: e.target.value };
                                setTeacherDiplomas(next);
                                markDirty();
                              }}
                              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold"
                            />
                            <select
                              value={dip.level}
                              onChange={(e) => {
                                const next = [...teacherDiplomas];
                                next[idx] = { ...dip, level: e.target.value };
                                setTeacherDiplomas(next);
                                markDirty();
                              }}
                              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold"
                            >
                              <option value="BACCALAUREAT">Baccalauréat</option>
                              <option value="BAC_PLUS_2">Bac+2 (BTS / DTS / DEUG)</option>
                              <option value="LICENCE">Licence (Bac+3)</option>
                              <option value="MASTER_1">Master 1 (Maîtrise)</option>
                              <option value="MASTER_2">Master 2 / DEA / Ingénieur</option>
                              <option value="DOCTORAT">Doctorat / PhD</option>
                              <option value="HDR">HDR (Habilitation à Diriger des Recherches)</option>
                              <option value="AUTRE">Autre diplôme académique</option>
                            </select>
                            <input
                              type="text"
                              placeholder="Domaine de formation"
                              value={dip.field}
                              onChange={(e) => {
                                const next = [...teacherDiplomas];
                                next[idx] = { ...dip, field: e.target.value };
                                setTeacherDiplomas(next);
                                markDirty();
                              }}
                              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                            />
                            <input
                              type="text"
                              placeholder="Spécialité"
                              value={dip.specialty}
                              onChange={(e) => {
                                const next = [...teacherDiplomas];
                                next[idx] = { ...dip, specialty: e.target.value };
                                setTeacherDiplomas(next);
                                markDirty();
                              }}
                              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                            />
                            <input
                              type="text"
                              placeholder="Établissement / Université *"
                              value={dip.institution}
                              onChange={(e) => {
                                const next = [...teacherDiplomas];
                                next[idx] = { ...dip, institution: e.target.value };
                                setTeacherDiplomas(next);
                                markDirty();
                              }}
                              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold"
                            />
                            <input
                              type="text"
                              placeholder="Pays"
                              value={dip.country}
                              onChange={(e) => {
                                const next = [...teacherDiplomas];
                                next[idx] = { ...dip, country: e.target.value };
                                setTeacherDiplomas(next);
                                markDirty();
                              }}
                              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                            />
                            <input
                              type="text"
                              placeholder="Année d'obtention"
                              value={dip.year}
                              onChange={(e) => {
                                const next = [...teacherDiplomas];
                                next[idx] = { ...dip, year: e.target.value };
                                setTeacherDiplomas(next);
                                markDirty();
                              }}
                              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                            />
                            <input
                              type="text"
                              placeholder="Mention / Numéro du diplôme"
                              value={dip.diplomaNumber || ''}
                              onChange={(e) => {
                                const next = [...teacherDiplomas];
                                next[idx] = { ...dip, diplomaNumber: e.target.value };
                                setTeacherDiplomas(next);
                                markDirty();
                              }}
                              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-mono"
                            />
                            <div className="flex items-center gap-2 sm:col-span-2">
                              <label className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-bold text-[#2F6FED] cursor-pointer flex items-center gap-1.5">
                                <Upload className="w-3.5 h-3.5" />
                                {dip.documentName || 'Joindre copie du diplôme'}
                                <input
                                  type="file"
                                  accept=".pdf,image/*"
                                  className="hidden"
                                  onChange={(e) =>
                                    handleFileUpload(e.target.files?.[0], (fName, url) => {
                                      const next = [...teacherDiplomas];
                                      next[idx] = {
                                        ...dip,
                                        documentName: fName,
                                        documentUrl: url,
                                        verificationStatus: canAdminValidateAndEditAll
                                          ? 'VALIDE'
                                          : 'EN_ATTENTE',
                                      };
                                      setTeacherDiplomas(next);
                                    })
                                  }
                                />
                              </label>
                              {canAdminValidateAndEditAll && (
                                <select
                                  value={dip.verificationStatus}
                                  onChange={(e) => {
                                    const next = [...teacherDiplomas];
                                    next[idx] = {
                                      ...dip,
                                      verificationStatus: e.target.value as DocumentVerificationStatus,
                                    };
                                    setTeacherDiplomas(next);
                                    markDirty();
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold"
                                >
                                  <option value="EN_ATTENTE">En attente</option>
                                  <option value="VALIDE">Validé</option>
                                  <option value="REJETE">Rejeté</option>
                                  <option value="A_REMPLACER">À remplacer</option>
                                </select>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* B. Formation complémentaire & Certifications */}
              <div className="bg-white p-5 rounded-2xl border border-[#DCE3EC] shadow-2xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#2F6FED]">
                      Section 3.B • Qualifications Complémentaires
                    </span>
                    <h3 className="text-base font-black text-[#16202A]">
                      Certificats, Certifications professionnelles & Formations continues (
                      {complementaryTrainings.length})
                    </h3>
                  </div>
                  {isEditing && (
                    <button
                      type="button"
                      onClick={() => {
                        setComplementaryTrainings([
                          ...complementaryTrainings,
                          {
                            id: `tcert-${Date.now()}`,
                            category: 'CERTIFICATION_PRO',
                            title: '',
                            organization: '',
                            date: new Date().getFullYear().toString(),
                            duration: '',
                            skillsAcquired: '',
                            verificationStatus: 'DEPOSE',
                          },
                        ]);
                        markDirty();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#2F6FED] hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Ajouter une certification / formation
                    </button>
                  )}
                </div>

                {complementaryTrainings.length === 0 ? (
                  <p className="text-xs italic text-slate-400">
                    Aucune formation complémentaire ou certification enregistrée.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {complementaryTrainings.map((tr, idx) => (
                      <div
                        key={tr.id}
                        className="p-4 rounded-2xl bg-[#F5F7FA] border border-[#DCE3EC] space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                            {tr.category.replace(/_/g, ' ')}
                          </span>
                          {isEditing && (
                            <button
                              type="button"
                              onClick={() => {
                                setComplementaryTrainings(
                                  complementaryTrainings.filter((x) => x.id !== tr.id)
                                );
                                markDirty();
                              }}
                              className="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        {!isEditing ? (
                          <div className="text-xs space-y-1">
                            <p className="font-black text-[#16202A]">{tr.title}</p>
                            <p className="text-slate-600">
                              {tr.organization} • {tr.date} {tr.duration ? `(${tr.duration})` : ''}
                            </p>
                            {tr.skillsAcquired && (
                              <p className="text-slate-500 text-[11px]">
                                Compétences : {tr.skillsAcquired}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <select
                              value={tr.category}
                              onChange={(e) => {
                                const next = [...complementaryTrainings];
                                next[idx] = { ...tr, category: e.target.value as any };
                                setComplementaryTrainings(next);
                                markDirty();
                              }}
                              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold"
                            >
                              <option value="CERTIFICAT">Certificat</option>
                              <option value="CERTIFICATION_PRO">Certification professionnelle</option>
                              <option value="FORMATION_SPECIALISEE">Formation spécialisée</option>
                              <option value="FORMATION_PEDAGOGIQUE">Formation pédagogique</option>
                              <option value="FORMATION_EN_LIGNE">Formation en ligne (MOOC)</option>
                              <option value="FORMATION_CONTINUE">Formation continue</option>
                              <option value="AUTRE">Autre qualification</option>
                            </select>
                            <input
                              type="text"
                              placeholder="Intitulé de la formation *"
                              value={tr.title}
                              onChange={(e) => {
                                const next = [...complementaryTrainings];
                                next[idx] = { ...tr, title: e.target.value };
                                setComplementaryTrainings(next);
                                markDirty();
                              }}
                              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold"
                            />
                            <input
                              type="text"
                              placeholder="Organisme formateur"
                              value={tr.organization}
                              onChange={(e) => {
                                const next = [...complementaryTrainings];
                                next[idx] = { ...tr, organization: e.target.value };
                                setComplementaryTrainings(next);
                                markDirty();
                              }}
                              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                            />
                            <input
                              type="text"
                              placeholder="Date & Durée (ex: 2024 • 40h)"
                              value={tr.date}
                              onChange={(e) => {
                                const next = [...complementaryTrainings];
                                next[idx] = { ...tr, date: e.target.value };
                                setComplementaryTrainings(next);
                                markDirty();
                              }}
                              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                            />
                            <input
                              type="text"
                              placeholder="Compétences acquises"
                              value={tr.skillsAcquired || ''}
                              onChange={(e) => {
                                const next = [...complementaryTrainings];
                                next[idx] = { ...tr, skillsAcquired: e.target.value };
                                setComplementaryTrainings(next);
                                markDirty();
                              }}
                              className="sm:col-span-2 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* C. Spécialités académiques (Liste normalisée + saisie libre contrôlée) */}
              <div className="bg-white p-5 rounded-2xl border border-[#DCE3EC] shadow-2xs space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#2F6FED]">
                    Section 3.C • Référentiel Académique Normalisé
                  </span>
                  <h3 className="text-base font-black text-[#16202A]">
                    Spécialités académiques ({academicSpecialties.length})
                  </h3>
                </div>

                <div className="flex flex-wrap gap-2">
                  {NORMALIZED_ACADEMIC_SPECIALTIES.map((spec) => {
                    const selected = academicSpecialties.includes(spec);
                    return (
                      <button
                        key={spec}
                        type="button"
                        disabled={!isEditing}
                        onClick={() => {
                          if (!isEditing) return;
                          if (selected) {
                            setAcademicSpecialties(
                              academicSpecialties.filter((s) => s !== spec)
                            );
                          } else {
                            setAcademicSpecialties([...academicSpecialties, spec]);
                          }
                          markDirty();
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                          selected
                            ? 'bg-[#17345B] text-white border-[#17345B]'
                            : 'bg-[#F5F7FA] text-slate-600 border-[#DCE3EC] hover:border-slate-400'
                        } ${isEditing ? 'cursor-pointer' : 'cursor-default'}`}
                      >
                        {selected ? '✓ ' : ''}
                        {spec}
                      </button>
                    );
                  })}
                </div>

                {/* Spécialités personnalisées ajoutées */}
                {academicSpecialties.filter((s) => !NORMALIZED_ACADEMIC_SPECIALTIES.includes(s))
                  .length > 0 && (
                  <div className="pt-2">
                    <span className="text-[11px] font-bold uppercase text-slate-500 block mb-1.5">
                      Spécialités complémentaires spécifiques :
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {academicSpecialties
                        .filter((s) => !NORMALIZED_ACADEMIC_SPECIALTIES.includes(s))
                        .map((customSpec) => (
                          <span
                            key={customSpec}
                            className="px-3 py-1 rounded-xl bg-blue-50 text-blue-800 border border-blue-200 text-xs font-bold flex items-center gap-1.5"
                          >
                            {customSpec}
                            {isEditing && (
                              <button
                                type="button"
                                onClick={() => {
                                  setAcademicSpecialties(
                                    academicSpecialties.filter((s) => s !== customSpec)
                                  );
                                  markDirty();
                                }}
                                className="text-rose-600 hover:text-rose-800 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </span>
                        ))}
                    </div>
                  </div>
                )}

                {isEditing && (
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="text"
                      value={customSpecialtyInput}
                      onChange={(e) => setCustomSpecialtyInput(e.target.value)}
                      placeholder="Ajouter une autre spécialité académique contrôlée..."
                      className="flex-1 max-w-md px-3 py-2 rounded-xl border border-[#DCE3EC] text-xs font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = customSpecialtyInput.trim();
                        if (val && !academicSpecialties.includes(val)) {
                          setAcademicSpecialties([...academicSpecialties, val]);
                          setCustomSpecialtyInput('');
                          markDirty();
                        }
                      }}
                      className="px-3.5 py-2 rounded-xl bg-[#2F6FED] text-white text-xs font-bold cursor-pointer"
                    >
                      Ajouter
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===============================================================
              ONGLET 4 – EXPÉRIENCE & SITUATION PROFESSIONNELLE
             =============================================================== */}
          {activeTab === 'TAB_4_EXPERIENCE' && (
            <div className="space-y-6">
              {/* A. Situation professionnelle actuelle */}
              <div className="bg-white p-5 rounded-2xl border border-[#DCE3EC] shadow-2xs space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#2F6FED]">
                    Section 4.A • Activité Principale
                  </span>
                  <h3 className="text-base font-black text-[#16202A]">
                    Situation professionnelle actuelle
                  </h3>
                </div>

                {!isEditing ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    {renderFieldBox('Statut professionnel', employmentStatus)}
                    {renderFieldBox('Profession principale', profession)}
                    {renderFieldBox('Employeur principal', employer)}
                    {renderFieldBox('Fonction occupée', jobFunction)}
                    {renderFieldBox("Secteur d'activité", activitySector)}
                    {renderFieldBox('Adresse professionnelle', workAddress)}
                    {renderFieldBox('Téléphone professionnel', workPhone)}
                    {renderFieldBox('Email professionnel', workEmail)}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1">
                        Statut professionnel
                      </label>
                      <select
                        value={employmentStatus || 'ENSEIGNANT_CHERCHEUR'}
                        onChange={(e) => {
                          setEmploymentStatus(e.target.value as any);
                          markDirty();
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-[#DCE3EC] text-xs font-bold bg-white"
                      >
                        <option value="ENSEIGNANT_CHERCHEUR">Enseignant-Chercheur</option>
                        <option value="SALARIE">Salarié / Cadre d'entreprise</option>
                        <option value="FONCTIONNAIRE">Haut Fonctionnaire / Administration</option>
                        <option value="CONSULTANT">Consultant / Expert indépendant</option>
                        <option value="ENTREPRENEUR">Dirigeant / Entrepreneur</option>
                        <option value="AUTRE">Autre</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1">
                        Profession principale
                      </label>
                      <input
                        type="text"
                        value={profession}
                        onChange={(e) => {
                          setProfession(e.target.value);
                          markDirty();
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-[#DCE3EC] text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1">
                        Employeur principal
                      </label>
                      <input
                        type="text"
                        value={employer}
                        onChange={(e) => {
                          setEmployer(e.target.value);
                          markDirty();
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-[#DCE3EC] text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1">
                        Fonction occupée
                      </label>
                      <input
                        type="text"
                        value={jobFunction}
                        onChange={(e) => {
                          setJobFunction(e.target.value);
                          markDirty();
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-[#DCE3EC] text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1">
                        Secteur d'activité
                      </label>
                      <input
                        type="text"
                        value={activitySector}
                        onChange={(e) => {
                          setActivitySector(e.target.value);
                          markDirty();
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-[#DCE3EC] text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1">
                        Adresse professionnelle
                      </label>
                      <input
                        type="text"
                        value={workAddress}
                        onChange={(e) => {
                          setWorkAddress(e.target.value);
                          markDirty();
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-[#DCE3EC] text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1">
                        Téléphone professionnel
                      </label>
                      <input
                        type="tel"
                        value={workPhone}
                        onChange={(e) => {
                          setWorkPhone(e.target.value);
                          markDirty();
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-[#DCE3EC] text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1">
                        Email professionnel
                      </label>
                      <input
                        type="email"
                        value={workEmail}
                        onChange={(e) => {
                          setWorkEmail(e.target.value);
                          markDirty();
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-[#DCE3EC] text-xs font-medium"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* B. Expériences professionnelles (multiples) */}
              <div className="bg-white p-5 rounded-2xl border border-[#DCE3EC] shadow-2xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#2F6FED]">
                      Section 4.B • Parcours en Entreprise / Institution
                    </span>
                    <h3 className="text-base font-black text-[#16202A]">
                      Expériences professionnelles ({professionalExperiences.length})
                    </h3>
                  </div>
                  {isEditing && (
                    <button
                      type="button"
                      onClick={() => {
                        setProfessionalExperiences([
                          ...professionalExperiences,
                          {
                            id: `wexp-${Date.now()}`,
                            jobTitle: '',
                            organization: '',
                            sector: '',
                            country: 'Madagascar',
                            city: 'Antananarivo',
                            startDate: '',
                            endDate: '',
                            isCurrent: false,
                            responsibilities: '',
                            achievements: '',
                          },
                        ]);
                        markDirty();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#2F6FED] hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Ajouter une expérience professionnelle
                    </button>
                  )}
                </div>

                {professionalExperiences.length === 0 ? (
                  <p className="text-xs italic text-slate-400">
                    Aucune expérience professionnelle externe renseignée.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {professionalExperiences.map((exp, idx) => (
                      <div
                        key={exp.id}
                        className="p-4 rounded-2xl bg-[#F5F7FA] border border-[#DCE3EC] space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-[#17345B]">
                            {exp.jobTitle || `Expérience #${idx + 1}`} — {exp.organization}
                          </span>
                          {isEditing && (
                            <button
                              type="button"
                              onClick={() => {
                                setProfessionalExperiences(
                                  professionalExperiences.filter((x) => x.id !== exp.id)
                                );
                                markDirty();
                              }}
                              className="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        {!isEditing ? (
                          <div className="text-xs space-y-1">
                            <p className="text-slate-600 font-semibold">
                              {exp.sector} • {exp.city}, {exp.country} • {exp.startDate} →{' '}
                              {exp.isCurrent ? 'Poste actuel' : exp.endDate || '—'}
                            </p>
                            <p className="text-slate-700">{exp.responsibilities}</p>
                            {exp.achievements && (
                              <p className="text-slate-500 italic">
                                Réalisations : {exp.achievements}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            <input
                              type="text"
                              placeholder="Poste occupé *"
                              value={exp.jobTitle}
                              onChange={(e) => {
                                const next = [...professionalExperiences];
                                next[idx] = { ...exp, jobTitle: e.target.value };
                                setProfessionalExperiences(next);
                                markDirty();
                              }}
                              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold"
                            />
                            <input
                              type="text"
                              placeholder="Organisation / Entreprise *"
                              value={exp.organization}
                              onChange={(e) => {
                                const next = [...professionalExperiences];
                                next[idx] = { ...exp, organization: e.target.value };
                                setProfessionalExperiences(next);
                                markDirty();
                              }}
                              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold"
                            />
                            <input
                              type="text"
                              placeholder="Secteur d'activité"
                              value={exp.sector}
                              onChange={(e) => {
                                const next = [...professionalExperiences];
                                next[idx] = { ...exp, sector: e.target.value };
                                setProfessionalExperiences(next);
                                markDirty();
                              }}
                              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                            />
                            <input
                              type="text"
                              placeholder="Ville & Pays"
                              value={exp.city}
                              onChange={(e) => {
                                const next = [...professionalExperiences];
                                next[idx] = { ...exp, city: e.target.value };
                                setProfessionalExperiences(next);
                                markDirty();
                              }}
                              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                            />
                            <input
                              type="date"
                              value={exp.startDate}
                              onChange={(e) => {
                                const next = [...professionalExperiences];
                                next[idx] = { ...exp, startDate: e.target.value };
                                setProfessionalExperiences(next);
                                markDirty();
                              }}
                              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                            />
                            <div className="flex items-center gap-2">
                              <input
                                type="date"
                                disabled={exp.isCurrent}
                                value={exp.endDate || ''}
                                onChange={(e) => {
                                  const next = [...professionalExperiences];
                                  next[idx] = { ...exp, endDate: e.target.value };
                                  setProfessionalExperiences(next);
                                  markDirty();
                                }}
                                className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs disabled:bg-slate-100"
                              />
                              <label className="flex items-center gap-1 text-[11px] font-bold whitespace-nowrap">
                                <input
                                  type="checkbox"
                                  checked={exp.isCurrent}
                                  onChange={(e) => {
                                    const next = [...professionalExperiences];
                                    next[idx] = { ...exp, isCurrent: e.target.checked };
                                    setProfessionalExperiences(next);
                                    markDirty();
                                  }}
                                />
                                Actuel
                              </label>
                            </div>
                            <textarea
                              rows={2}
                              placeholder="Description des responsabilités et principales réalisations"
                              value={exp.responsibilities}
                              onChange={(e) => {
                                const next = [...professionalExperiences];
                                next[idx] = { ...exp, responsibilities: e.target.value };
                                setProfessionalExperiences(next);
                                markDirty();
                              }}
                              className="sm:col-span-3 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* C. Expérience dans l'enseignement (distincte de l'expérience générale) */}
              <div className="bg-white p-5 rounded-2xl border border-[#DCE3EC] shadow-2xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#2F6FED]">
                      Section 4.C • Carrière Académique & Universitaire
                    </span>
                    <h3 className="text-base font-black text-[#16202A]">
                      Expérience dans l'enseignement ({teachingExperiences.length})
                    </h3>
                  </div>
                  {isEditing && (
                    <button
                      type="button"
                      onClick={() => {
                        setTeachingExperiences([
                          ...teachingExperiences,
                          {
                            id: `texp-${Date.now()}`,
                            institution: '',
                            roleTitle: 'Chargé de cours',
                            taughtDomain: '',
                            teachingLevel: 'Licence / Master',
                            startDate: '',
                            endDate: '',
                            yearsOfExperience: 1,
                            trainingTypes: 'Formation initiale',
                            references: '',
                          },
                        ]);
                        markDirty();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#2F6FED] hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Ajouter une expérience d'enseignement
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {teachingExperiences.map((texp, idx) => (
                    <div
                      key={texp.id}
                      className="p-4 rounded-2xl bg-[#F5F7FA] border border-[#DCE3EC] space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-[#17345B]">
                          {texp.institution || `Établissement #${idx + 1}`} — {texp.roleTitle}
                        </span>
                        {isEditing && (
                          <button
                            type="button"
                            onClick={() => {
                              setTeachingExperiences(
                                teachingExperiences.filter((x) => x.id !== texp.id)
                              );
                              markDirty();
                            }}
                            className="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      {!isEditing ? (
                        <div className="text-xs space-y-1">
                          <p className="font-bold text-slate-800">
                            Domaine : {texp.taughtDomain} ({texp.teachingLevel})
                          </p>
                          <p className="text-slate-600">
                            {texp.yearsOfExperience} an(s) d'expérience • {texp.trainingTypes}
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Établissement d'enseignement *"
                            value={texp.institution}
                            onChange={(e) => {
                              const next = [...teachingExperiences];
                              next[idx] = { ...texp, institution: e.target.value };
                              setTeachingExperiences(next);
                              markDirty();
                            }}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold"
                          />
                          <input
                            type="text"
                            placeholder="Fonction (Professeur, Chargé de cours...)"
                            value={texp.roleTitle}
                            onChange={(e) => {
                              const next = [...teachingExperiences];
                              next[idx] = { ...texp, roleTitle: e.target.value };
                              setTeachingExperiences(next);
                              markDirty();
                            }}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                          />
                          <input
                            type="text"
                            placeholder="Domaine enseigné"
                            value={texp.taughtDomain}
                            onChange={(e) => {
                              const next = [...teachingExperiences];
                              next[idx] = { ...texp, taughtDomain: e.target.value };
                              setTeachingExperiences(next);
                              markDirty();
                            }}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                          />
                          <input
                            type="text"
                            placeholder="Niveau (L1, L2, L3, Master...)"
                            value={texp.teachingLevel}
                            onChange={(e) => {
                              const next = [...teachingExperiences];
                              next[idx] = { ...texp, teachingLevel: e.target.value };
                              setTeachingExperiences(next);
                              markDirty();
                            }}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                          />
                          <input
                            type="number"
                            min={0}
                            placeholder="Années d'expérience"
                            value={texp.yearsOfExperience}
                            onChange={(e) => {
                              const next = [...teachingExperiences];
                              next[idx] = {
                                ...texp,
                                yearsOfExperience: Number(e.target.value) || 0,
                              };
                              setTeachingExperiences(next);
                              markDirty();
                            }}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                          />
                          <input
                            type="text"
                            placeholder="Types de formations dispensées"
                            value={texp.trainingTypes}
                            onChange={(e) => {
                              const next = [...teachingExperiences];
                              next[idx] = { ...texp, trainingTypes: e.target.value };
                              setTeachingExperiences(next);
                              markDirty();
                            }}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* D. Situation contractuelle à EBM Institute (Protégée selon les permissions) */}
              <div className="bg-white p-5 rounded-2xl border border-[#DCE3EC] shadow-2xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#1F8A83]">
                      Section 4.D • Rattachement Administratif & Contractuel EBM Institute
                    </span>
                    <h3 className="text-base font-black text-[#16202A]">
                      Situation contractuelle à EBM Institute
                    </h3>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-bold flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-[#17345B]" />
                    Géré par l'administration
                  </span>
                </div>

                {!canViewContractAndPayroll ? (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3 text-xs text-slate-600">
                    <Lock className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>
                      Les conditions contractuelles et éléments de rémunération sont confidentiels et réservés à la Direction, aux Ressources Humaines / Scolarité, à la Comptabilité et à l’enseignant titulaire (Section 9).
                    </span>
                  </div>
                ) : !isEditing || !canEditContractAndPayroll ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    {renderFieldBox('Statut contractuel', contractType)}
                    {renderFieldBox('Fonction au sein d’EBM', jobTitle)}
                    {renderFieldBox('Département / Service', `${department} • ${service}`)}
                    {renderFieldBox('Responsable hiérarchique', supervisorName)}
                    {renderFieldBox('Date de recrutement', recruitmentDate)}
                    {renderFieldBox('Date de prise de fonction', hireDate)}
                    {renderFieldBox('Durée du contrat', contractDuration)}
                    {renderFieldBox('Date de fin de contrat', contractEndDate || 'CDI / En cours')}
                    {renderFieldBox('Quota horaire hebdomadaire', `${weeklyMaxHours} h / semaine`, true)}
                    {renderFieldBox(
                      'Taux horaire de vacation',
                      `${hourlyRateAr.toLocaleString('fr-FR')} Ar / h`,
                      true
                    )}
                    <div className="sm:col-span-2 p-3 bg-[#F5F7FA] rounded-xl border border-[#DCE3EC] flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                          Coordonnées Bancaires (RIB)
                        </span>
                        <span className="text-sm font-mono font-bold text-[#16202A]">
                          {bankRib
                            ? showRibClear
                              ? bankRib
                              : `${bankRib.slice(0, 6)} •••• •••• ${bankRib.slice(-4)}`
                            : 'Non renseigné'}
                        </span>
                      </div>
                      {bankRib && (
                        <button
                          type="button"
                          onClick={() => setShowRibClear(!showRibClear)}
                          className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700 flex items-center gap-1 cursor-pointer"
                        >
                          {showRibClear ? (
                            <>
                              <EyeOff className="w-3.5 h-3.5" /> Masquer
                            </>
                          ) : (
                            <>
                              <Eye className="w-3.5 h-3.5" /> Afficher
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1">
                        Statut / Type de contrat
                      </label>
                      <select
                        value={contractType}
                        onChange={(e) => {
                          setContractType(e.target.value as any);
                          markDirty();
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-[#DCE3EC] text-xs font-bold bg-white"
                      >
                        <option value="PERMANENT">Enseignant permanent</option>
                        <option value="VACATAIRE">Enseignant vacataire</option>
                        <option value="CONTRACTUEL">Enseignant contractuel</option>
                        <option value="CONSULTANT">Consultant académique</option>
                        <option value="INTERVENANT_EXTERNE">Intervenant externe</option>
                        <option value="MISSIONNAIRE">Missionnaire / Professeur invité</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1">
                        Fonction au sein d'EBM
                      </label>
                      <input
                        type="text"
                        value={jobTitle}
                        onChange={(e) => {
                          setJobTitle(e.target.value);
                          markDirty();
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-[#DCE3EC] text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1">
                        Département / Service
                      </label>
                      <input
                        type="text"
                        value={department}
                        onChange={(e) => {
                          setDepartment(e.target.value);
                          markDirty();
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-[#DCE3EC] text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1">
                        Responsable hiérarchique
                      </label>
                      <input
                        type="text"
                        value={supervisorName}
                        onChange={(e) => {
                          setSupervisorName(e.target.value);
                          markDirty();
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-[#DCE3EC] text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1">
                        Date de recrutement
                      </label>
                      <input
                        type="date"
                        value={recruitmentDate}
                        onChange={(e) => {
                          setRecruitmentDate(e.target.value);
                          markDirty();
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-[#DCE3EC] text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1">
                        Date de prise de fonction
                      </label>
                      <input
                        type="date"
                        value={hireDate}
                        onChange={(e) => {
                          setHireDate(e.target.value);
                          markDirty();
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-[#DCE3EC] text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1">
                        Durée du contrat
                      </label>
                      <input
                        type="text"
                        value={contractDuration}
                        onChange={(e) => {
                          setContractDuration(e.target.value);
                          markDirty();
                        }}
                        placeholder="Ex: 1 année universitaire / CDI"
                        className="w-full px-3 py-2 rounded-xl border border-[#DCE3EC] text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1">
                        Date de fin de contrat
                      </label>
                      <input
                        type="date"
                        value={contractEndDate}
                        onChange={(e) => {
                          setContractEndDate(e.target.value);
                          markDirty();
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-[#DCE3EC] text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1">
                        Quota hebdomadaire (h)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={45}
                        value={weeklyMaxHours}
                        onChange={(e) => {
                          setWeeklyMaxHours(Number(e.target.value) || 18);
                          markDirty();
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-[#DCE3EC] text-xs font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1">
                        Taux horaire (Ar / h)
                      </label>
                      <input
                        type="number"
                        step={1000}
                        value={hourlyRateAr}
                        onChange={(e) => {
                          setHourlyRateAr(Number(e.target.value) || 40000);
                          markDirty();
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-[#DCE3EC] text-xs font-mono font-bold"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1">
                        RIB Bancaire (Virement des vacations)
                      </label>
                      <input
                        type="text"
                        value={bankRib}
                        onChange={(e) => {
                          setBankRib(e.target.value);
                          markDirty();
                        }}
                        placeholder="Code Banque / Guichet / Compte / Clé"
                        className="w-full px-3 py-2 rounded-xl border border-[#DCE3EC] text-xs font-mono font-bold"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===============================================================
              ONGLET 5 – COMPÉTENCES, SPÉCIALITÉS & AFFECTATIONS PÉDAGOGIQUES
             =============================================================== */}
          {activeTab === 'TAB_5_PEDAGOGY' && (
            <div className="space-y-6">
              {/* C. Activités pédagogiques synchronisées en temps réel (Section 8) */}
              <div className="bg-white p-5 rounded-2xl border border-[#DCE3EC] shadow-2xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#1F8A83]">
                      Section 5.C & Section 8 • Synchronisation Temps Réel Système Académique
                    </span>
                    <h3 className="text-base font-black text-[#16202A]">
                      Indicateurs d'activités pédagogiques ({selectedAcademicYear})
                    </h3>
                  </div>

                  {onNavigateToMyCourses && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onNavigateToMyCourses();
                      }}
                      className="px-3.5 py-2 rounded-xl bg-[#17345B] hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Ouvrir le module « Mes enseignements »
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                  <div className="p-3 rounded-xl bg-[#F5F7FA] border border-[#DCE3EC] text-center">
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">
                      Cours attribués
                    </span>
                    <span className="text-lg font-black text-[#17345B]">
                      {pedagogicalMetrics.coursesCount}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#F5F7FA] border border-[#DCE3EC] text-center">
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">
                      Groupes encadrés
                    </span>
                    <span className="text-lg font-black text-[#2F6FED]">
                      {pedagogicalMetrics.groupsCount}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#F5F7FA] border border-[#DCE3EC] text-center">
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">
                      Séances réalisées
                    </span>
                    <span className="text-lg font-black text-[#1F8A83]">
                      {pedagogicalMetrics.completedSessionsCount} /{' '}
                      {pedagogicalMetrics.totalSessionsCount}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                    <span className="text-[10px] font-bold uppercase text-emerald-700 block">
                      Heures validées
                    </span>
                    <span className="text-lg font-black text-emerald-800 font-mono">
                      {pedagogicalMetrics.validatedHours} h
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#F5F7FA] border border-[#DCE3EC] text-center">
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">
                      Heures restantes
                    </span>
                    <span className="text-lg font-black text-slate-800 font-mono">
                      {pedagogicalMetrics.remainingHours} h
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-center">
                    <span className="text-[10px] font-bold uppercase text-amber-800 block">
                      CR en attente
                    </span>
                    <span className="text-lg font-black text-amber-900">
                      {pedagogicalMetrics.pendingReportsCount}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-center">
                    <span className="text-[10px] font-bold uppercase text-blue-800 block">
                      Copies à corriger
                    </span>
                    <span className="text-lg font-black text-blue-900">
                      {pedagogicalMetrics.pendingGradingCount}
                    </span>
                  </div>
                </div>
              </div>

              {/* B. Affectations académiques synchronisées (sans base dupliquée) */}
              <div className="bg-white p-5 rounded-2xl border border-[#DCE3EC] shadow-2xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#2F6FED]">
                      Section 5.B • Maquettes LMD & Cours Attribués
                    </span>
                    <h3 className="text-base font-black text-[#16202A]">
                      Affectations académiques synchronisées ({assignedCourses.length})
                    </h3>
                  </div>

                  {canEditPedagogyAndSchedule && (
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedCourseToAssign}
                        onChange={(e) => setSelectedCourseToAssign(e.target.value)}
                        className="px-3 py-1.5 rounded-xl border border-[#DCE3EC] text-xs font-semibold bg-[#F5F7FA]"
                      >
                        <option value="">+ Affecter un cours existant à cet enseignant...</option>
                        {courses
                          .filter((c) => !(c.teacherIds || []).includes(liveTeacher.id))
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              [{c.code}] {c.title} ({c.totalHours}h)
                            </option>
                          ))}
                      </select>
                      <button
                        type="button"
                        disabled={!selectedCourseToAssign}
                        onClick={() => {
                          if (!selectedCourseToAssign) return;
                          const targetCourse = courses.find((c) => c.id === selectedCourseToAssign);
                          if (!targetCourse) return;
                          const nextTeacherIds = Array.from(
                            new Set([...(targetCourse.teacherIds || []), liveTeacher.id])
                          );
                          updateCourse(selectedCourseToAssign, { teacherIds: nextTeacherIds });
                          setSelectedCourseToAssign('');
                          showAppToast({
                            type: 'success',
                            title: 'Affectation pédagogique enregistrée',
                            message: `Le cours a été rattaché à ${liveTeacher.name}.`,
                          });
                        }}
                        className="px-3 py-1.5 rounded-xl bg-[#2F6FED] disabled:opacity-40 text-white text-xs font-bold cursor-pointer"
                      >
                        Affecter
                      </button>
                    </div>
                  )}
                </div>

                {assignedCourses.length === 0 ? (
                  <p className="text-xs italic text-slate-400">
                    Aucun cours actuellement affecté dans la maquette pédagogique.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#F5F7FA] border-b border-[#DCE3EC] text-[10px] font-bold uppercase text-slate-500">
                          <th className="py-2.5 px-3">Année</th>
                          <th className="py-2.5 px-3">Filière & Parcours</th>
                          <th className="py-2.5 px-3">Niveau / Sem.</th>
                          <th className="py-2.5 px-3">UE / EC (Cours)</th>
                          <th className="py-2.5 px-3">Groupes</th>
                          <th className="py-2.5 px-3 text-center">Volume prévu</th>
                          <th className="py-2.5 px-3 text-center">Statut</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {assignedCourses.map((c) => {
                          const fil = filieres.find((f) => f.id === c.filiereId);
                          const matchedEc = ecs.find(
                            (e) => e.code.toLowerCase() === c.code.toLowerCase()
                          );
                          const matchedUe = ues.find((u) => u.id === matchedEc?.ueId);
                          const parc = parcours.find(
                            (p) => p.id === matchedUe?.parcoursId || p.filiereId === c.filiereId
                          );
                          const courseGroups = groups.filter((g) =>
                            (c.groupIds || []).includes(g.id)
                          );
                          const completedH = sessions
                            .filter(
                              (s) =>
                                s.courseId === c.id && s.status === 'COMPLETED_VALIDATED'
                            )
                            .reduce(
                              (acc, s) => acc + (s.report?.actualHours ?? s.durationHours),
                              0
                            );

                          return (
                            <tr key={c.id} className="hover:bg-slate-50">
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-600">
                                {matchedUe?.academicYear || selectedAcademicYear}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="font-bold text-[#16202A] block">
                                  {fil?.name || fil?.code || 'Tronc commun'}
                                </span>
                                <span className="text-[10px] text-slate-500">
                                  {parc ? `${parc.code} — ${parc.name}` : 'Tous parcours'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-bold text-[#17345B]">
                                {c.level || 'L1'} • {matchedUe?.semester || 'S1'}
                              </td>
                              <td className="py-2.5 px-3">
                                {matchedUe && (
                                  <span className="text-[10px] font-bold text-[#2F6FED] block">
                                    UE {matchedUe.code} : {matchedUe.title}
                                  </span>
                                )}
                                <span className="font-black text-[#16202A]">
                                  [{c.code}] {c.title}
                                </span>
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="flex flex-wrap gap-1">
                                  {courseGroups.map((g) => (
                                    <span
                                      key={g.id}
                                      className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px]"
                                    >
                                      {g.code}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono font-bold">
                                {completedH}h / {c.totalHours}h
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px]">
                                  Affecté & Actif
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* A. Compétences, Langues & Outils */}
              <div className="bg-white p-5 rounded-2xl border border-[#DCE3EC] shadow-2xs space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#2F6FED]">
                    Section 5.A • Cartographie des Compétences
                  </span>
                  <h3 className="text-base font-black text-[#16202A]">
                    Compétences techniques, pédagogiques, langues & outils maîtrisés
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Compétences techniques */}
                  <div className="p-4 rounded-2xl bg-[#F5F7FA] border border-[#DCE3EC] space-y-2.5">
                    <span className="text-xs font-black text-[#17345B] block">
                      Compétences techniques & scientifiques
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {technicalSkills.map((sk) => (
                        <span
                          key={sk}
                          className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-800 flex items-center gap-1"
                        >
                          {sk}
                          {isEditing && (
                            <button
                              type="button"
                              onClick={() => {
                                setTechnicalSkills(technicalSkills.filter((x) => x !== sk));
                                markDirty();
                              }}
                              className="text-rose-500 cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                    {isEditing && (
                      <div className="flex gap-1.5 pt-1">
                        <input
                          type="text"
                          placeholder="Ajouter compétence technique..."
                          value={newSkillText.technical}
                          onChange={(e) =>
                            setNewSkillText({ ...newSkillText, technical: e.target.value })
                          }
                          className="flex-1 px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const v = newSkillText.technical.trim();
                            if (v && !technicalSkills.includes(v)) {
                              setTechnicalSkills([...technicalSkills, v]);
                              setNewSkillText({ ...newSkillText, technical: '' });
                              markDirty();
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#2F6FED] text-white text-xs font-bold cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Compétences pédagogiques */}
                  <div className="p-4 rounded-2xl bg-[#F5F7FA] border border-[#DCE3EC] space-y-2.5">
                    <span className="text-xs font-black text-[#17345B] block">
                      Compétences pédagogiques
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {pedagogicalSkills.map((sk) => (
                        <span
                          key={sk}
                          className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-800 flex items-center gap-1"
                        >
                          {sk}
                          {isEditing && (
                            <button
                              type="button"
                              onClick={() => {
                                setPedagogicalSkills(pedagogicalSkills.filter((x) => x !== sk));
                                markDirty();
                              }}
                              className="text-rose-500 cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                    {isEditing && (
                      <div className="flex gap-1.5 pt-1">
                        <input
                          type="text"
                          placeholder="Ajouter méthode pédagogique..."
                          value={newSkillText.pedagogical}
                          onChange={(e) =>
                            setNewSkillText({ ...newSkillText, pedagogical: e.target.value })
                          }
                          className="flex-1 px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const v = newSkillText.pedagogical.trim();
                            if (v && !pedagogicalSkills.includes(v)) {
                              setPedagogicalSkills([...pedagogicalSkills, v]);
                              setNewSkillText({ ...newSkillText, pedagogical: '' });
                              markDirty();
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#2F6FED] text-white text-xs font-bold cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Outils et logiciels maîtrisés */}
                  <div className="p-4 rounded-2xl bg-[#F5F7FA] border border-[#DCE3EC] space-y-2.5">
                    <span className="text-xs font-black text-[#17345B] block">
                      Outils & logiciels maîtrisés
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {softwareTools.map((tool) => (
                        <span
                          key={tool}
                          className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-800 flex items-center gap-1"
                        >
                          {tool}
                          {isEditing && (
                            <button
                              type="button"
                              onClick={() => {
                                setSoftwareTools(softwareTools.filter((x) => x !== tool));
                                markDirty();
                              }}
                              className="text-rose-500 cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                    {isEditing && (
                      <div className="flex gap-1.5 pt-1">
                        <input
                          type="text"
                          placeholder="Ajouter logiciel / outil..."
                          value={newSkillText.tool}
                          onChange={(e) =>
                            setNewSkillText({ ...newSkillText, tool: e.target.value })
                          }
                          className="flex-1 px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const v = newSkillText.tool.trim();
                            if (v && !softwareTools.includes(v)) {
                              setSoftwareTools([...softwareTools, v]);
                              setNewSkillText({ ...newSkillText, tool: '' });
                              markDirty();
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#2F6FED] text-white text-xs font-bold cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Langues maîtrisées + niveau */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-[#17345B]">
                      Langues d'enseignement et niveau de maîtrise
                    </span>
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => {
                          setLanguagesSpoken([
                            ...languagesSpoken,
                            {
                              id: `lang-${Date.now()}`,
                              language: '',
                              level: 'COURANT',
                            },
                          ]);
                          markDirty();
                        }}
                        className="text-xs font-bold text-[#2F6FED] hover:underline cursor-pointer"
                      >
                        + Ajouter une langue
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {languagesSpoken.map((l, idx) =>
                      !isEditing ? (
                        <div
                          key={l.id}
                          className="px-3 py-1.5 rounded-xl bg-[#F5F7FA] border border-[#DCE3EC] text-xs font-bold flex items-center gap-2"
                        >
                          <Globe className="w-3.5 h-3.5 text-[#2F6FED]" />
                          <span>{l.language}</span>
                          <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px]">
                            {l.level.replace(/_/g, ' ')}
                          </span>
                        </div>
                      ) : (
                        <div
                          key={l.id}
                          className="flex items-center gap-1.5 p-1.5 rounded-xl bg-[#F5F7FA] border border-[#DCE3EC]"
                        >
                          <input
                            type="text"
                            placeholder="Langue"
                            value={l.language}
                            onChange={(e) => {
                              const next = [...languagesSpoken];
                              next[idx] = { ...l, language: e.target.value };
                              setLanguagesSpoken(next);
                              markDirty();
                            }}
                            className="w-28 px-2 py-1 rounded bg-white border border-slate-300 text-xs font-bold"
                          />
                          <select
                            value={l.level}
                            onChange={(e) => {
                              const next = [...languagesSpoken];
                              next[idx] = { ...l, level: e.target.value as any };
                              setLanguagesSpoken(next);
                              markDirty();
                            }}
                            className="px-2 py-1 rounded bg-white border border-slate-300 text-xs"
                          >
                            <option value="DEBUTANT">Débutant</option>
                            <option value="INTERMEDIAIRE">Intermédiaire</option>
                            <option value="AVANCE">Avancé</option>
                            <option value="COURANT">Courant / Académique</option>
                            <option value="LANGUE_MATERNELLE">Langue maternelle</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => {
                              setLanguagesSpoken(languagesSpoken.filter((x) => x.id !== l.id));
                              markDirty();
                            }}
                            className="text-rose-600 p-1 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>

              {/* D. Responsabilités pédagogiques */}
              <div className="bg-white p-5 rounded-2xl border border-[#DCE3EC] shadow-2xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#2F6FED]">
                      Section 5.D • Mandats & Encadrements Académiques
                    </span>
                    <h3 className="text-base font-black text-[#16202A]">
                      Responsabilités pédagogiques ({pedagogicalResponsibilities.length})
                    </h3>
                  </div>
                  {isEditing && canAdminValidateAndEditAll && (
                    <button
                      type="button"
                      onClick={() => {
                        setPedagogicalResponsibilities([
                          ...pedagogicalResponsibilities,
                          {
                            id: `resp-${Date.now()}`,
                            type: 'RESPONSABLE_UE',
                            title: 'Responsable d’Unité d’Enseignement',
                            scope: '',
                            startDate: getAntananarivoDateStr(),
                            isActive: true,
                          },
                        ]);
                        markDirty();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#2F6FED] hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Attribuer une responsabilité
                    </button>
                  )}
                </div>

                {pedagogicalResponsibilities.length === 0 ? (
                  <p className="text-xs italic text-slate-400">
                    Aucune responsabilité pédagogique spécifique enregistrée (Responsable de filière, parcours, UE, direction de mémoire ou stage).
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {pedagogicalResponsibilities.map((resp, idx) => (
                      <div
                        key={resp.id}
                        className="p-4 rounded-2xl bg-[#F5F7FA] border border-[#DCE3EC] space-y-2"
                      >
                        {!isEditing || !canAdminValidateAndEditAll ? (
                          <div className="flex items-start justify-between gap-2 text-xs">
                            <div>
                              <span className="px-2 py-0.5 rounded bg-[#17345B] text-white text-[10px] font-bold uppercase">
                                {resp.type.replace(/_/g, ' ')}
                              </span>
                              <p className="font-black text-[#16202A] mt-1">{resp.title}</p>
                              <p className="text-slate-600">
                                Périmètre : {resp.scope || 'EBM Institute'} • Depuis le{' '}
                                {resp.startDate}
                              </p>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                resp.isActive
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {resp.isActive ? 'En cours' : 'Terminé'}
                            </span>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <select
                              value={resp.type}
                              onChange={(e) => {
                                const next = [...pedagogicalResponsibilities];
                                next[idx] = { ...resp, type: e.target.value as any };
                                setPedagogicalResponsibilities(next);
                                markDirty();
                              }}
                              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold"
                            >
                              <option value="RESPONSABLE_FILIERE">Responsable de filière</option>
                              <option value="RESPONSABLE_PARCOURS">Responsable de parcours</option>
                              <option value="COORDINATEUR_PEDAGOGIQUE">
                                Coordinateur pédagogique
                              </option>
                              <option value="RESPONSABLE_UE">Responsable d'UE</option>
                              <option value="DIRECTEUR_MEMOIRE">Directeur de mémoire</option>
                              <option value="ENCADREUR_STAGE">Encadreur de stage</option>
                              <option value="AUTRE">Autre responsabilité académique</option>
                            </select>
                            <input
                              type="text"
                              placeholder="Intitulé précis *"
                              value={resp.title}
                              onChange={(e) => {
                                const next = [...pedagogicalResponsibilities];
                                next[idx] = { ...resp, title: e.target.value };
                                setPedagogicalResponsibilities(next);
                                markDirty();
                              }}
                              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold"
                            />
                            <input
                              type="text"
                              placeholder="Filière / Parcours / Promotion"
                              value={resp.scope || ''}
                              onChange={(e) => {
                                const next = [...pedagogicalResponsibilities];
                                next[idx] = { ...resp, scope: e.target.value };
                                setPedagogicalResponsibilities(next);
                                markDirty();
                              }}
                              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                            />
                            <div className="flex items-center gap-2">
                              <input
                                type="date"
                                value={resp.startDate}
                                onChange={(e) => {
                                  const next = [...pedagogicalResponsibilities];
                                  next[idx] = { ...resp, startDate: e.target.value };
                                  setPedagogicalResponsibilities(next);
                                  markDirty();
                                }}
                                className="flex-1 px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setPedagogicalResponsibilities(
                                    pedagogicalResponsibilities.filter((x) => x.id !== resp.id)
                                  );
                                  markDirty();
                                }}
                                className="text-rose-600 p-1 cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Grille des disponibilités hebdomadaires (07h00–17h00) & Export PDF */}
              <div className="bg-white p-5 rounded-2xl border border-[#DCE3EC] shadow-2xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#2F6FED]">
                      Planification & Emploi du Temps
                    </span>
                    <h3 className="text-base font-black text-[#16202A]">
                      Disponibilités hebdomadaires de l'enseignant (07h00 – 17h00)
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={pdfPeriod}
                      onChange={(e) => setPdfPeriod(e.target.value as any)}
                      className="px-2.5 py-1.5 rounded-xl border border-[#DCE3EC] text-xs font-bold bg-[#F5F7FA]"
                    >
                      <option value="WEEK">Semaine en cours</option>
                      <option value="MONTH">Mois en cours</option>
                      <option value="SEMESTER">Semestre complet</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => handleExportSchedulePdf(pdfPeriod)}
                      className="px-3 py-1.5 rounded-xl bg-[#17345B] hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Exporter Emploi du Temps (PDF)
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-center border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#F5F7FA] border-b border-[#DCE3EC] text-[10px] font-bold uppercase text-slate-600">
                        <th className="py-2 px-3 text-left">Jour</th>
                        {WIDE_TEACHER_SLOTS.map((sl) => (
                          <th key={sl.code} className="py-2 px-2">
                            {sl.label}
                          </th>
                        ))}
                        <th className="py-2 px-2">Journée entière</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {DEFAULT_WEEK_DAYS.map((day) => {
                        const dayCells = availGrid.filter((c) => c.day === day);
                        const allAvail = dayCells.every((c) => c.available);
                        return (
                          <tr key={day} className="hover:bg-slate-50">
                            <td className="py-2 px-3 text-left font-black text-[#17345B]">{day}</td>
                            {WIDE_TEACHER_SLOTS.map((sl) => {
                              const cell = dayCells.find((c) => c.slot === sl.code);
                              const isAvail = cell ? cell.available : true;
                              return (
                                <td key={sl.code} className="py-1.5 px-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleSlot(day, sl.code)}
                                    className={`w-full py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                                      isAvail
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                        : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                                    }`}
                                  >
                                    {isAvail ? 'Disponible' : 'Indisponible'}
                                  </button>
                                </td>
                              );
                            })}
                            <td className="py-1.5 px-2">
                              <button
                                type="button"
                                onClick={() => handleSetDayAvailability(day, !allAvail)}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold cursor-pointer"
                              >
                                {allAvail ? 'Tout bloquer' : 'Tout libérer'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ===============================================================
              ONGLET 6 – DOCUMENTS & JUSTIFICATIFS
             =============================================================== */}
          {activeTab === 'TAB_6_DOCUMENTS' && (
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-2xl border border-[#DCE3EC] shadow-2xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#2F6FED]">
                      Onglet 6 • Gestion Électronique des Documents (GED Enseignant)
                    </span>
                    <h3 className="text-base font-black text-[#16202A]">
                      Documents & Justificatifs officiels
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {(
                      [
                        { id: 'ALL', label: 'Toutes les catégories' },
                        { id: 'IDENTITE', label: '1. Identité' },
                        { id: 'DIPLOMES_QUALIFICATIONS', label: '2. Diplômes & Qualifications' },
                        { id: 'PROFESSIONNEL', label: '3. Documents professionnels' },
                        { id: 'ADMINISTRATIF_EBM', label: '4. Documents administratifs EBM' },
                      ] as const
                    ).map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setDocCategoryFilter(cat.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                          docCategoryFilter === cat.id
                            ? 'bg-[#17345B] text-white'
                            : 'bg-[#F5F7FA] text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {isScheduler && (
                  <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-blue-700 shrink-0" />
                    <span>
                      Note de confidentialité (Section 9) : Le rôle Planification / Emploi du temps n'a pas d'accès automatique aux pièces d'identité ni aux contrats financiers.
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {teacherDocuments
                    .filter(
                      (doc) =>
                        docCategoryFilter === 'ALL' || doc.category === docCategoryFilter
                    )
                    .map((doc) => {
                      const catMeta = TEACHER_DOC_CATALOG.find((c) => c.type === doc.type);
                      const isRestrictedForCurrentUser =
                        Boolean(catMeta?.sensitiveForScheduler) && !canViewSensitiveDocs;
                      const statusCfg =
                        TEACHER_DOC_STATUS_CONFIG[doc.status] ||
                        TEACHER_DOC_STATUS_CONFIG.MANQUANT;

                      return (
                        <div
                          key={doc.id}
                          className="p-4 rounded-2xl bg-[#F5F7FA] border border-[#DCE3EC] flex flex-col justify-between gap-3"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="text-[10px] font-black uppercase text-slate-400 block">
                                  {doc.category.replace(/_/g, ' ')}
                                  {catMeta?.required ? ' • Requis' : ' • Facultatif'}
                                </span>
                                <h4 className="text-sm font-black text-[#16202A]">{doc.label}</h4>
                              </div>
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${statusCfg.badgeClass}`}
                              >
                                {statusCfg.label}
                              </span>
                            </div>

                            {isRestrictedForCurrentUser ? (
                              <p className="text-xs italic text-slate-500 mt-2 flex items-center gap-1.5">
                                <Lock className="w-3.5 h-3.5" />
                                Accès restreint (Document confidentiel RH / Identité)
                              </p>
                            ) : (
                              <>
                                {doc.fileName ? (
                                  <p className="text-xs text-slate-600 mt-2 font-medium">
                                    Fichier : <span className="font-bold">{doc.fileName}</span>{' '}
                                    {doc.fileSize ? `(${doc.fileSize})` : ''}{' '}
                                    {doc.uploadedAt ? `• Déposé le ${doc.uploadedAt}` : ''}
                                  </p>
                                ) : (
                                  <p className="text-xs italic text-slate-400 mt-2">
                                    Aucun fichier téléversé pour le moment.
                                  </p>
                                )}

                                {doc.rejectionReason && (
                                  <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2 mt-2 font-semibold">
                                    Motif du refus : {doc.rejectionReason}
                                  </p>
                                )}
                              </>
                            )}
                          </div>

                          {!isRestrictedForCurrentUser && (
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/70">
                              <div className="flex flex-wrap items-center gap-1.5">
                                {/* Téléverser / Remplacer */}
                                <label className="px-2.5 py-1.5 rounded-lg bg-[#2F6FED] hover:bg-blue-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer">
                                  <Upload className="w-3 h-3" />
                                  {doc.fileUrl ? 'Remplacer' : 'Téléverser'}
                                  <input
                                    type="file"
                                    accept=".pdf,image/*,.doc,.docx"
                                    className="hidden"
                                    onChange={(e) =>
                                      handleFileUpload(
                                        e.target.files?.[0],
                                        (fName, url, sizeLabel) => {
                                          const updatedDocs = teacherDocuments.map((d) =>
                                            d.id === doc.id
                                              ? {
                                                  ...d,
                                                  fileName: fName,
                                                  fileUrl: url,
                                                  fileSize: sizeLabel,
                                                  uploadedAt: getAntananarivoDateStr(),
                                                  status: (canAdminValidateAndEditAll
                                                    ? 'VALIDE'
                                                    : 'EN_ATTENTE') as DocumentVerificationStatus,
                                                  rejectionReason: undefined,
                                                }
                                              : d
                                          );
                                          setTeacherDocuments(updatedDocs);
                                          updateTeacher(liveTeacher.id, {
                                            teacherDocuments: updatedDocs,
                                            ...(doc.type === 'CV_ACADEMIQUE'
                                              ? {
                                                  cvFileName: fName,
                                                  cvFileUrl: url,
                                                  cvUploadedAt: getAntananarivoDateStr(),
                                                }
                                              : {}),
                                          });
                                          showAppToast({
                                            type: 'success',
                                            title: 'Document déposé',
                                            message: `${doc.label} (${fName}) a été enregistré.`,
                                          });
                                        }
                                      )
                                    }
                                  />
                                </label>

                                {/* Visualiser */}
                                {doc.fileUrl && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPreviewDoc({
                                        title: doc.label,
                                        url: doc.fileUrl!,
                                        fileName: doc.fileName,
                                      })
                                    }
                                    className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                  >
                                    <Eye className="w-3 h-3" />
                                    Visualiser
                                  </button>
                                )}

                                {/* Télécharger */}
                                {doc.fileUrl && (
                                  <a
                                    href={doc.fileUrl}
                                    download={doc.fileName || `${doc.type}.pdf`}
                                    className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-[11px] font-bold flex items-center gap-1"
                                  >
                                    <Download className="w-3 h-3" />
                                    Télécharger
                                  </a>
                                )}
                              </div>

                              {/* Actions de vérification administrative */}
                              {canAdminValidateAndEditAll && doc.fileUrl && (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updatedDocs = teacherDocuments.map((d) =>
                                        d.id === doc.id
                                          ? {
                                              ...d,
                                              status: 'VALIDE' as DocumentVerificationStatus,
                                              verifiedAt: getAntananarivoDateStr(),
                                              verifiedBy: currentUser.name,
                                              rejectionReason: undefined,
                                            }
                                          : d
                                      );
                                      setTeacherDocuments(updatedDocs);
                                      updateTeacher(liveTeacher.id, {
                                        teacherDocuments: updatedDocs,
                                      });
                                      showAppToast({
                                        type: 'success',
                                        title: 'Document validé',
                                        message: `Le document "${doc.label}" a été marqué comme Validé.`,
                                      });
                                    }}
                                    className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                                  >
                                    <Check className="w-3 h-3" />
                                    Vérifier
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRejectingDocId(doc.id);
                                      setRejectionReasonText(doc.rejectionReason || '');
                                    }}
                                    className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                                  >
                                    <Ban className="w-3 h-3" />
                                    Refuser
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Zone de saisie du motif de rejet */}
                          {rejectingDocId === doc.id && (
                            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 space-y-2">
                              <input
                                type="text"
                                placeholder="Préciser le motif du refus (ex: copie illisible, document expiré)..."
                                value={rejectionReasonText}
                                onChange={(e) => setRejectionReasonText(e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-rose-300 bg-white text-xs"
                              />
                              <div className="flex justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setRejectingDocId(null)}
                                  className="px-2.5 py-1 rounded bg-white text-slate-600 text-[11px] font-bold"
                                >
                                  Annuler
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updatedDocs = teacherDocuments.map((d) =>
                                      d.id === doc.id
                                        ? {
                                            ...d,
                                            status: 'REJETE' as DocumentVerificationStatus,
                                            rejectionReason:
                                              rejectionReasonText.trim() ||
                                              'Document non conforme, veuillez le remplacer.',
                                          }
                                        : d
                                    );
                                    setTeacherDocuments(updatedDocs);
                                    updateTeacher(liveTeacher.id, {
                                      teacherDocuments: updatedDocs,
                                    });
                                    setRejectingDocId(null);
                                  }}
                                  className="px-2.5 py-1 rounded bg-rose-600 text-white text-[11px] font-bold cursor-pointer"
                                >
                                  Confirmer le refus
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}

          {/* ===============================================================
              ONGLET 7 – COMPTE & SÉCURITÉ + VALIDATION ADMINISTRATIVE (Section 6)
             =============================================================== */}
          {activeTab === 'TAB_7_SECURITY' && (
            <div className="space-y-6">
              {/* A. Informations du compte utilisateur & synchronisation */}
              <div className="bg-white p-5 rounded-2xl border border-[#DCE3EC] shadow-2xs space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#2F6FED]">
                    Section 7.A • Authentification & Accès Système
                  </span>
                  <h3 className="text-base font-black text-[#16202A]">
                    Paramètres du compte enseignant & synchronisation
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {renderFieldBox('Identifiant utilisateur', liveTeacher.username, true)}
                  {renderFieldBox('Email de connexion', liveTeacher.email)}
                  {renderFieldBox('Email institutionnel', liveTeacher.email)}
                  {renderFieldBox('Rôle système', 'TEACHER (Corps Enseignant)')}
                  {renderFieldBox(
                    'Statut du compte',
                    liveTeacher.isActive ? 'Actif & Autorisé' : 'Compte Désactivé / Suspendu'
                  )}
                  {renderFieldBox(
                    'Date de création',
                    liveTeacher.createdAt
                      ? new Date(liveTeacher.createdAt).toLocaleDateString('fr-FR')
                      : '01/09/2025'
                  )}
                  {renderFieldBox(
                    'Dernière connexion',
                    liveTeacher.lastLoginAt
                      ? new Date(liveTeacher.lastLoginAt).toLocaleString('fr-FR')
                      : 'Session active'
                  )}
                  {renderFieldBox(
                    'Vérification de l’email',
                    liveTeacher.emailVerified !== false ? 'Email vérifié ✓' : 'En attente'
                  )}
                </div>

                {/* Synchronisation Google Calendar & Moodle */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-2xl bg-[#F5F7FA] border border-[#DCE3EC] flex items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-black text-[#17345B] block">
                        Synchronisation Google Calendar
                      </span>
                      <span className="text-[11px] text-slate-600">
                        {liveTeacher.googleCalendarLinked
                          ? `Connecté (${liveTeacher.googleEmail || liveTeacher.email})`
                          : 'Non connecté à Google Calendar'}
                      </span>
                    </div>
                    {(isSelf || canAdminValidateAndEditAll) && (
                      <button
                        type="button"
                        onClick={() => toggleGoogleCalendarLink(liveTeacher.id, liveTeacher.email)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                          liveTeacher.googleCalendarLinked
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-[#2F6FED] text-white'
                        }`}
                      >
                        {liveTeacher.googleCalendarLinked ? 'Déconnecter' : 'Activer la liaison'}
                      </button>
                    )}
                  </div>

                  <div className="p-4 rounded-2xl bg-[#F5F7FA] border border-[#DCE3EC] flex items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-black text-[#17345B] block">
                        Compte LMS Moodle Associé
                      </span>
                      <span className="text-[11px] text-slate-600">
                        {moodleLinked
                          ? `Synchronisé (Identifiant : ${moodleUsername})`
                          : 'Liaison LMS prête à être activée'}
                      </span>
                    </div>
                    {(isSelf || canAdminValidateAndEditAll) && (
                      <button
                        type="button"
                        onClick={() => {
                          const nextState = !moodleLinked;
                          setMoodleLinked(nextState);
                          updateTeacher(liveTeacher.id, {
                            moodleLinked: nextState,
                            moodleUsername: moodleUsername || liveTeacher.username,
                          });
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                          moodleLinked ? 'bg-emerald-100 text-emerald-800' : 'bg-[#17345B] text-white'
                        }`}
                      >
                        {moodleLinked ? 'Synchronisé ✓' : 'Lier le compte Moodle'}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* B. Sécurité & Gestion des accès (Aucun mot de passe en clair) */}
              <div className="bg-white p-5 rounded-2xl border border-[#DCE3EC] shadow-2xs space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#2F6FED]">
                    Section 7.B & Section 9 • Gestion Sécurisée des Accès
                  </span>
                  <h3 className="text-base font-black text-[#16202A]">
                    Sécurité du mot de passe et statut d'accès (Zéro mot de passe en clair)
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-[#F5F7FA] border border-[#DCE3EC] space-y-3">
                    <span className="text-xs font-black text-[#17345B] block">
                      Mise à jour ou réinitialisation du mot de passe
                    </span>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="password"
                        value={newPasswordInput}
                        onChange={(e) => setNewPasswordInput(e.target.value)}
                        placeholder="Nouveau mot de passe (min. 6 caractères)"
                        className="flex-1 px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (isSelf) {
                            const ok = changePassword(liveTeacher.id, newPasswordInput);
                            if (ok) {
                              setNewPasswordInput('');
                              showAppToast({
                                type: 'success',
                                title: 'Mot de passe modifié',
                                message: 'Votre mot de passe a été mis à jour avec succès.',
                              });
                            } else {
                              showAppToast({
                                type: 'error',
                                title: 'Mot de passe trop court',
                                message: 'Veuillez saisir au moins 6 caractères.',
                              });
                            }
                          } else if (canAdminValidateAndEditAll) {
                            const res = setDirectUserPassword(
                              liveTeacher.id,
                              newPasswordInput,
                              forceChangeNextLogin
                            );
                            if (res.success) {
                              setNewPasswordInput('');
                              showAppToast({
                                type: 'success',
                                title: 'Mot de passe mis à jour',
                                message: res.message,
                              });
                            } else {
                              showAppToast({
                                type: 'error',
                                title: 'Erreur',
                                message: res.message,
                              });
                            }
                          }
                        }}
                        className="px-4 py-2 rounded-xl bg-[#2F6FED] hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
                      >
                        Appliquer
                      </button>
                    </div>
                    {canAdminValidateAndEditAll && !isSelf && (
                      <label className="flex items-center gap-2 text-xs text-slate-600">
                        <input
                          type="checkbox"
                          checked={forceChangeNextLogin}
                          onChange={(e) => setForceChangeNextLogin(e.target.checked)}
                        />
                        Forcer le changement du mot de passe à la prochaine connexion
                      </label>
                    )}
                  </div>

                  {canAdminValidateAndEditAll && (
                    <div className="p-4 rounded-2xl bg-[#F5F7FA] border border-[#DCE3EC] flex flex-col justify-between gap-3">
                      <div>
                        <span className="text-xs font-black text-[#17345B] block">
                          Actions administratives sur le compte
                        </span>
                        <p className="text-[11px] text-slate-600 mt-1">
                          Envoyer un lien officiel de réinitialisation par e-mail ou suspendre/réactiver l’accès de l’enseignant.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            const res = await sendUserPasswordResetEmail(liveTeacher.id);
                            showAppToast({
                              type: res.success ? 'success' : 'error',
                              title: 'Réinitialisation par e-mail',
                              message: res.message,
                            });
                          }}
                          className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Envoyer lien de réinitialisation
                        </button>
                        {!isSelf && (
                          <button
                            type="button"
                            onClick={() => toggleUserStatus(liveTeacher.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                              liveTeacher.isActive
                                ? 'bg-rose-600 text-white'
                                : 'bg-emerald-600 text-white'
                            }`}
                          >
                            {liveTeacher.isActive ? 'Suspendre le compte' : 'Réactiver le compte'}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* C. Workflow de validation des modifications soumises (Section 6) */}
              <div className="bg-white p-5 rounded-2xl border border-[#DCE3EC] shadow-2xs space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#D58A18]">
                    Section 6 • Validation Administrative des Informations Officielles
                  </span>
                  <h3 className="text-base font-black text-[#16202A]">
                    Demandes de modification soumises à validation ({teacherChangeRequests.length})
                  </h3>
                </div>

                {isSelf && (
                  <div className="p-4 rounded-2xl bg-[#F5F7FA] border border-[#DCE3EC] space-y-3">
                    <span className="text-xs font-black text-[#17345B] block">
                      Soumettre une demande de rectification (Identité officielle, CIN/Passeport, Grade, Diplôme)
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <select
                        value={rectificationField}
                        onChange={(e) => setRectificationField(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold"
                      >
                        <option value="name">Nom et Prénoms officiels</option>
                        <option value="cin">Numéro de CIN / Passeport</option>
                        <option value="birthDate">Date de naissance</option>
                        <option value="academicRank">Grade universitaire</option>
                        <option value="highestDiploma">Diplôme officiel le plus élevé</option>
                      </select>
                      <input
                        type="text"
                        placeholder="Nouvelle valeur demandée *"
                        value={rectificationNewValue}
                        onChange={(e) => setRectificationNewValue(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold"
                      />
                      <input
                        type="text"
                        placeholder="Motif / Référence du justificatif *"
                        value={rectificationReason}
                        onChange={(e) => setRectificationReason(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!rectificationNewValue.trim() || !rectificationReason.trim()) {
                          showAppToast({
                            type: 'error',
                            title: 'Champs requis',
                            message:
                              'Veuillez préciser la nouvelle valeur souhaitée et le motif.',
                          });
                          return;
                        }
                        const labelMap: Record<string, string> = {
                          name: 'Nom et Prénoms',
                          cin: 'Numéro CIN / Passeport',
                          birthDate: 'Date de naissance',
                          academicRank: 'Grade universitaire',
                          highestDiploma: 'Diplôme officiel',
                        };
                        requestProfileChange(
                          liveTeacher.id,
                          [
                            {
                              field: rectificationField,
                              label: labelMap[rectificationField] || rectificationField,
                              oldValue: String((liveTeacher as any)[rectificationField] || '—'),
                              newValue: rectificationNewValue.trim(),
                            },
                          ],
                          rectificationReason.trim()
                        );
                        setRectificationNewValue('');
                        setRectificationReason('');
                        showAppToast({
                          type: 'success',
                          title: 'Demande transmise à l’administration',
                          message:
                            'Votre demande de modification est en attente de validation administrative.',
                        });
                      }}
                      className="px-4 py-2 rounded-xl bg-[#17345B] hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Soumettre pour validation administrative
                    </button>
                  </div>
                )}

                {teacherChangeRequests.length > 0 && (
                  <div className="space-y-2.5">
                    {teacherChangeRequests.map((req) => (
                      <div
                        key={req.id}
                        className="p-3.5 rounded-xl bg-[#F5F7FA] border border-[#DCE3EC] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                req.status === 'APPROVED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : req.status === 'REJECTED'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {req.status === 'APPROVED'
                                ? 'Validé'
                                : req.status === 'REJECTED'
                                ? 'Refusé'
                                : 'En attente de validation'}
                            </span>
                            <span className="text-slate-400 text-[11px]">
                              {new Date(req.requestedAt).toLocaleString('fr-FR')}
                            </span>
                          </div>
                          {req.changes.map((ch, i) => (
                            <p key={i} className="font-bold text-slate-800 mt-1">
                              {ch.label} : <span className="line-through text-slate-400">{ch.oldValue}</span>{' '}
                              → <span className="text-[#2F6FED]">{ch.newValue}</span>
                            </p>
                          ))}
                          <p className="text-slate-600 text-[11px]">Motif : {req.reason}</p>
                        </div>

                        {canAdminValidateAndEditAll && req.status === 'PENDING' && (
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => approveProfileChangeRequest(req.id)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold cursor-pointer"
                            >
                              Valider
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                rejectProfileChangeRequest(
                                  req.id,
                                  'Justificatif complémentaire requis'
                                )
                              }
                              className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-bold cursor-pointer"
                            >
                              Refuser
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* D. Historique des modifications (Traçabilité) */}
              <div className="bg-white p-5 rounded-2xl border border-[#DCE3EC] shadow-2xs space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Section 7.C • Journal d'Audit & Traçabilité
                  </span>
                  <h3 className="text-base font-black text-[#16202A]">
                    Historique des modifications du dossier (
                    {(liveTeacher.modificationHistory || []).length})
                  </h3>
                </div>

                {!liveTeacher.modificationHistory ||
                liveTeacher.modificationHistory.length === 0 ? (
                  <p className="text-xs italic text-slate-400">
                    Aucune modification récente enregistrée dans l'historique.
                  </p>
                ) : (
                  <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 text-xs">
                    {liveTeacher.modificationHistory.slice(0, 25).map((log) => (
                      <div key={log.id} className="py-2.5 flex items-center justify-between gap-3">
                        <div>
                          <span className="font-bold text-[#17345B]">{log.field}</span> :{' '}
                          <span className="text-slate-400 line-through">{log.oldValue}</span> →{' '}
                          <span className="font-bold text-emerald-700">{log.newValue}</span>
                        </div>
                        <div className="text-right text-[11px] text-slate-500 shrink-0">
                          <span className="font-semibold">{log.authorName}</span> •{' '}
                          {new Date(log.timestamp).toLocaleString('fr-FR')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* =================================================================
            PIED DE MODALE FIXE (Actions rapides)
           ================================================================= */}
        <div className="px-5 py-3.5 bg-white border-t border-[#DCE3EC] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Layers className="w-4 h-4 text-[#17345B]" />
            <span>
              Source unique Firestore (<code className="font-mono">users/{liveTeacher.id}</code>) • Synchronisation bidirectionnelle active
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    hydrateFromTeacher(liveTeacher);
                    setIsEditing(false);
                  }}
                  className="px-4 py-2 rounded-xl border border-[#DCE3EC] bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveDossier()}
                  className="px-5 py-2 rounded-xl bg-[#2F6FED] hover:bg-blue-700 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  Enregistrer le dossier enseignant
                </button>
              </>
            ) : (
              <>
                {canEnterEditMode && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 rounded-xl bg-[#2F6FED] hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Modifier
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleRequestClose}
                  className="px-4 py-2 rounded-xl border border-[#DCE3EC] bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold cursor-pointer"
                >
                  Fermer
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Fenêtre d'aperçu de justificatif */}
      {previewDoc && (
        <div className="fixed inset-0 z-60 bg-slate-950/75 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[88vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 bg-[#17345B] text-white flex items-center justify-between">
              <div>
                <h4 className="text-sm font-black">{previewDoc.title}</h4>
                {previewDoc.fileName && (
                  <p className="text-[11px] text-slate-300">{previewDoc.fileName}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 flex-1 overflow-y-auto bg-slate-100 flex items-center justify-center">
              {previewDoc.url.startsWith('data:image/') ? (
                <img
                  src={previewDoc.url}
                  alt={previewDoc.title}
                  className="max-h-[65vh] rounded-xl shadow-md object-contain"
                />
              ) : previewDoc.url.startsWith('data:application/pdf') ? (
                <iframe
                  src={previewDoc.url}
                  title={previewDoc.title}
                  className="w-full h-[65vh] rounded-xl border bg-white"
                />
              ) : (
                <div className="p-8 bg-white rounded-2xl border text-center space-y-3">
                  <FileText className="w-12 h-12 text-[#2F6FED] mx-auto" />
                  <p className="text-sm font-bold text-slate-800">
                    Document officiel : {previewDoc.fileName || previewDoc.title}
                  </p>
                  <a
                    href={previewDoc.url}
                    download={previewDoc.fileName || 'document_enseignant.pdf'}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2F6FED] text-white text-xs font-bold"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Télécharger le fichier
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
