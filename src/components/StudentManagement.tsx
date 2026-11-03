import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  ImportResult,
  ImportStudentRow,
  User,
  StudentInscription,
  EnrollmentAdmissionType,
  EnrollmentSpecialCase,
} from '../types';
import { UniversalStudentSelector } from './UniversalStudentSelector';
import { StudentCardModal } from './StudentCardModal';
import {
  StudentProfileForm,
  StudentDossierTab,
  computeStudentDossierCompleteness,
} from './StudentProfileForm';
import { StudentAcademicDashboardSpace } from './StudentAcademicDashboardSpace';
import { StudentGroupAssignmentSpace } from './StudentGroupAssignmentSpace';
import { StudentCustomListsExporter } from './StudentCustomListsExporter';
import { showAppToast } from './ToastAndConfirmCenter';
import {
  GraduationCap,
  Search,
  UserPlus,
  Upload,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  KeyRound,
  AlertTriangle,
  Users,
  Download,
  CreditCard,
  Printer,
  Edit2,
  Eye,
  History,
  ArrowUpDown,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  BarChart3,
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Layers,
  Clock,
  FileCheck,
  Sparkles,
  Check,
  X,
} from 'lucide-react';

type MainStudentView =
  | 'DASHBOARD'
  | 'REPERTOIRE'
  | 'NEW_ENROLLMENT'
  | 'COLLECTIVE_ENROLLMENT'
  | 'COLLECTIVE_REENROLLMENT'
  | 'GROUP_ASSIGNMENT'
  | 'LISTS_EXPORTS'
  | 'CAMPAIGN_DASHBOARD';

type SortField = 'name' | 'matricule' | 'group' | 'level' | 'inscriptionDate';
type SortOrder = 'asc' | 'desc';

/**
 * RFC-4180 compliant CSV line parser supporting quoted fields, commas/semicolons inside quotes,
 * escaped quotes (""), and UTF-8 characters (Section 11).
 */
function parseCsvContentRfc4180(rawText: string): string[][] {
  const cleaned = rawText.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const firstLine = cleaned.split('\n')[0] || '';
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const delimiter = tabCount > commaCount && tabCount > semicolonCount ? '\t' : semicolonCount > commaCount ? ';' : ',';

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    const nextCh = cleaned[i + 1];

    if (inQuotes) {
      if (ch === '"' && nextCh === '"') {
        currentField += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        currentField += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === delimiter) {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (ch === '\n') {
        currentRow.push(currentField.trim());
        if (currentRow.some((cell) => cell.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
      } else {
        currentField += ch;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((cell) => cell.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

const NEXT_LEVEL_MAP: Record<string, string> = {
  L1: 'L2',
  L2: 'L3',
  L3: 'M1',
  M1: 'M2',
  M2: 'M2',
};

interface StudentManagementProps {
  onNavigateToCreate?: () => void;
}

export const StudentManagement: React.FC<StudentManagementProps> = () => {
  const {
    users,
    groups,
    filieres,
    parcours,
    academicYears,
    selectedAcademicYear,
    setSelectedAcademicYear,
    inscriptions,
    grades,
    deliberations,
    createStudent,
    generateNextStudentMatricule,
    inscribeStudent,
    updateEnrollment,
    importStudents,
    computeStudentDeliberationPreview,
    currentUser,
  } = useApp();

  // ============================================================================
  // NAVIGATION PRINCIPALE (5 ESPACES DU CAHIER DES CHARGES — SECTION 2)
  // Le Tableau de bord est la première page par défaut du module (Section 3.1)
  // ============================================================================
  const [activeView, setActiveView] = useState<MainStudentView>('DASHBOARD');
  const [groupAssignmentInitialFilter, setGroupAssignmentInitialFilter] = useState<
    { filiereId?: string; level?: string } | undefined
  >(undefined);

  // ============================================================================
  // 1. ÉTATS DU RÉPERTOIRE DES ÉTUDIANTS & CRÉATION SANS INSCRIPTION (SECTION 4)
  // ============================================================================
  const [isStandaloneCreateOpen, setIsStandaloneCreateOpen] = useState<boolean>(false);
  const [standalonePreSearch, setStandalonePreSearch] = useState<string>('');
  const [standaloneCreatedStudent, setStandaloneCreatedStudent] = useState<User | null>(null);
  const [standaloneForceHomonym, setStandaloneForceHomonym] = useState<boolean>(false);
  const [standaloneForm, setStandaloneForm] = useState<{
    matricule: string;
    civilite: 'M.' | 'Mme' | 'Mlle';
    lastName: string;
    firstName: string;
    birthDate: string;
    birthPlace: string;
    nationality: string;
    cin: string;
    phone: string;
    email: string;
    address: string;
    city: string;
  }>({
    matricule: '',
    civilite: 'M.',
    lastName: '',
    firstName: '',
    birthDate: '2005-05-15',
    birthPlace: 'Antananarivo',
    nationality: 'Malagasy',
    cin: '',
    phone: '',
    email: '',
    address: '',
    city: 'Antananarivo',
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [yearFilter, setYearFilter] = useState<string>(selectedAcademicYear || 'ALL');
  const [filiereFilter, setFiliereFilter] = useState<string>('ALL');
  const [parcoursFilter, setParcoursFilter] = useState<string>('ALL');
  const [levelFilter, setLevelFilter] = useState<string>('ALL');
  const [groupFilter, setGroupFilter] = useState<string>('ALL');
  const [enrollmentStatusFilter, setEnrollmentStatusFilter] = useState<string>('ALL');
  const [dossierFilter, setDossierFilter] = useState<'ALL' | 'COMPLETE' | 'INCOMPLETE'>('ALL');

  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [pageSize, setPageSize] = useState<25 | 50 | 100>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  // Bulk group change state
  const [bulkTargetGroupId, setBulkTargetGroupId] = useState<string>('');
  const [bulkChangeReason, setBulkChangeReason] = useState<string>('Réorganisation pédagogique de promotion');
  const [isBulkGroupModalOpen, setIsBulkGroupModalOpen] = useState<boolean>(false);

  // Modales Fiche, Carte & Historique Académique
  const [cardModalStudent, setCardModalStudent] = useState<User | null>(null);
  const [dossierModalStudent, setDossierModalStudent] = useState<User | null>(null);
  const [dossierInitialEdit, setDossierInitialEdit] = useState<boolean>(false);
  const [dossierInitialTab, setDossierInitialTab] = useState<StudentDossierTab>('TAB_1_IDENTITY');
  const [historyModalStudent, setHistoryModalStudent] = useState<User | null>(null);

  // Quick single-student group change modal (with history tracking)
  const [groupChangeTarget, setGroupChangeTarget] = useState<{
    student: User;
    enrollment?: StudentInscription;
    newGroupId: string;
    reason: string;
  } | null>(null);

  // ============================================================================
  // 2. ÉTATS DE L'ASSISTANT D'INSCRIPTION INDIVIDUELLE (4 ÉTAPES - PARTIE IV)
  // ============================================================================
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);
  const [reuseExistingStudent, setReuseExistingStudent] = useState<User | null>(null);
  const [manualMatriculeMode, setManualMatriculeMode] = useState<boolean>(false);
  const [indivForm, setIndivForm] = useState<{
    matricule: string;
    civilite: 'M.' | 'Mme' | 'Mlle';
    lastName: string;
    firstName: string;
    birthDate: string;
    birthPlace: string;
    cin: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    photoUrl: string;
    academicYear: string;
    filiereId: string;
    parcoursId: string;
    level: string;
    groupId: string; // '' ou 'SANS_GROUPE' = Sans affectation immédiate (Groupe non obligatoire)
    inscriptionType: EnrollmentAdmissionType;
    trainingMode: 'PRESENTIEL' | 'HYBRIDE' | 'EN_LIGNE' | 'ALTERNANCE';
    trainingRegime: 'INITIAL' | 'CONTINU' | 'SALARIE';
    inscriptionDate: string;
    status: 'CONFIRMED' | 'PENDING' | 'DRAFT';
    notes: string;
    documents: {
      cinOrBirthCert: boolean;
      baccOriginal: boolean;
      photosId: boolean;
      medicalCert: boolean;
      financialClearance: boolean;
      equivalenceOrTransferDoc: boolean;
      registrationFormSigned: boolean;
    };
  }>(() => ({
    matricule: '',
    civilite: 'M.',
    lastName: '',
    firstName: '',
    birthDate: '2005-05-15',
    birthPlace: 'Antananarivo',
    cin: '',
    phone: '',
    email: '',
    address: '',
    city: 'Antananarivo',
    photoUrl: '',
    academicYear: selectedAcademicYear || '2026-2027',
    filiereId: '',
    parcoursId: '',
    level: '',
    groupId: 'SANS_GROUPE',
    inscriptionType: 'PREMIERE_INSCRIPTION',
    trainingMode: 'PRESENTIEL',
    trainingRegime: 'INITIAL',
    inscriptionDate: new Date().toISOString().slice(0, 10),
    status: 'CONFIRMED',
    notes: '',
    documents: {
      cinOrBirthCert: true,
      baccOriginal: true,
      photosId: true,
      medicalCert: true,
      financialClearance: false,
      equivalenceOrTransferDoc: false,
      registrationFormSigned: true,
    },
  }));
  const [lastCreatedEnrollmentSummary, setLastCreatedEnrollmentSummary] = useState<{
    student: User;
    inscription: StudentInscription;
  } | null>(null);

  // ============================================================================
  // 3. ÉTATS DES INSCRIPTIONS COLLECTIVES (SECTIONS 5.5, 5.6, 5.7 & CSV)
  // ============================================================================
  const [collectiveMethod, setCollectiveMethod] = useState<
    'EXISTING_ELIGIBLE' | 'TABLE_ENTRY' | 'CSV_IMPORT'
  >('EXISTING_ELIGIBLE');
  const [eligibleSearchQuery, setEligibleSearchQuery] = useState<string>('');
  const [selectedEligibleStudentIds, setSelectedEligibleStudentIds] = useState<Set<string>>(new Set());
  const [collectiveStatus, setCollectiveStatus] = useState<'CONFIRMED' | 'PENDING'>('CONFIRMED');
  const [collectiveDate, setCollectiveDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [collectiveAcademicTarget, setCollectiveAcademicTarget] = useState<{
    academicYear: string;
    filiereId: string;
    parcoursId: string;
    level: string;
    groupId: string;
    inscriptionType: EnrollmentAdmissionType;
  }>({
    academicYear: selectedAcademicYear || '2026-2027',
    filiereId: filieres[0]?.id || '',
    parcoursId: '',
    level: 'L1',
    groupId: 'SANS_GROUPE',
    inscriptionType: 'PREMIERE_INSCRIPTION',
  });

  const [directTableRows, setDirectTableRows] = useState<
    {
      id: string;
      matricule: string;
      nom: string;
      prenom: string;
      dateNaissance: string;
      cin: string;
      telephone: string;
      email: string;
      adresse: string;
    }[]
  >([
    {
      id: 'row-1',
      matricule: '',
      nom: '',
      prenom: '',
      dateNaissance: '2005-01-01',
      cin: '',
      telephone: '',
      email: '',
      adresse: '',
    },
    {
      id: 'row-2',
      matricule: '',
      nom: '',
      prenom: '',
      dateNaissance: '2005-01-01',
      cin: '',
      telephone: '',
      email: '',
      adresse: '',
    },
    {
      id: 'row-3',
      matricule: '',
      nom: '',
      prenom: '',
      dateNaissance: '2005-01-01',
      cin: '',
      telephone: '',
      email: '',
      adresse: '',
    },
  ]);

  const [csvRawText, setCsvRawText] = useState<string>(
    'Matricule;Nom;Prénom;DateNaissance;CIN;Téléphone;Email;AnnéeAcadémique;Mention;Parcours;Niveau;Groupe\n' +
      'EBM-2026-0801;RAKOTOMALALA;Tiana;2005-03-14;101241012345;+261 34 11 223 34;tiana.rakoto@etudiant.ebm.edu;2026-2027;INFO;;L1;L1-INFO-A\n' +
      'EBM-2026-0802;ANDRIANAIVO;Sarobidy;2004-11-22;101242054321;+261 32 44 556 67;sarobidy.andria@etudiant.ebm.edu;2026-2027;INFO;;L1;L1-INFO-A'
  );
  const [csvEditableRows, setCsvEditableRows] = useState<ImportStudentRow[]>([]);
  const [csvStep, setCsvStep] = useState<'UPLOAD' | 'PREVIEW' | 'REPORT'>('UPLOAD');
  const [collectiveReport, setCollectiveReport] = useState<ImportResult | null>(null);

  // ============================================================================
  // 4. ÉTATS DES RÉINSCRIPTIONS ANNUELLES & COLLECTIVES (PARTIE VI : 5 ÉTAPES)
  // ============================================================================
  const [reenrollMode, setReenrollMode] = useState<'COLLECTIVE_WIZARD' | 'INDIVIDUAL_QUICK'>('COLLECTIVE_WIZARD');

  // Réinscription individuelle rapide
  const [quickReenrollSearch, setQuickReenrollSearch] = useState<string>('');
  const [quickReenrollStudent, setQuickReenrollStudent] = useState<User | null>(null);
  const [quickReenrollTarget, setQuickReenrollTarget] = useState<{
    academicYear: string;
    filiereId: string;
    parcoursId: string;
    level: string;
    groupId: string;
    specialCaseType: EnrollmentSpecialCase;
    referenceDecision: string;
    notes: string;
  }>({
    academicYear: '2026-2027',
    filiereId: '',
    parcoursId: '',
    level: 'L2',
    groupId: '',
    specialCaseType: 'PASSAGE_SUPERIEUR',
    referenceDecision: 'ADMIS',
    notes: '',
  });

  // Assistant Réinscription Collective en 5 étapes
  const [reenrollStep, setReenrollStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [sourcePromo, setSourcePromo] = useState<{
    academicYear: string;
    filiereId: string;
    parcoursId: string;
    level: string;
    groupId: string;
  }>({
    academicYear: academicYears.find((y) => !y.isCurrent)?.code || selectedAcademicYear || '2025-2026',
    filiereId: filieres[0]?.id || '',
    parcoursId: '',
    level: 'L1',
    groupId: 'ALL',
  });
  const [reenrollDecisionFilter, setReenrollDecisionFilter] = useState<
    'ALL' | 'ADMIS' | 'ADMIS_COMPENSATION' | 'PASSAGE_CONDITIONNEL' | 'AJOURNE'
  >('ALL');
  const [selectedReenrollStudentIds, setSelectedReenrollStudentIds] = useState<Set<string>>(new Set());
  const [targetPromo, setTargetPromo] = useState<{
    academicYear: string;
    filiereId: string;
    parcoursId: string;
    level: string;
    groupId: string;
  }>({
    academicYear: selectedAcademicYear || '2026-2027',
    filiereId: filieres[0]?.id || '',
    parcoursId: '',
    level: 'L2',
    groupId: '',
  });
  const [perStudentReenrollOverrides, setPerStudentReenrollOverrides] = useState<
    Record<
      string,
      {
        targetLevel: string;
        targetFiliereId: string;
        targetParcoursId: string;
        targetGroupId: string;
        specialCaseType: EnrollmentSpecialCase;
      }
    >
  >({});
  const [isSubmittingReenrollment, setIsSubmittingReenrollment] = useState<boolean>(false);
  const [reenrollmentReport, setReenrollmentReport] = useState<{
    totalProcessed: number;
    successCount: number;
    skippedCount: number;
    details: { studentName: string; matricule: string; status: 'SUCCESS' | 'SKIPPED'; message: string }[];
  } | null>(null);

  // ============================================================================
  // 5. ÉTATS DU SUIVI DES CAMPAGNES D'INSCRIPTION (PARTIE VII)
  // ============================================================================
  const [campaignYearFilter, setCampaignYearFilter] = useState<string>(selectedAcademicYear || '2026-2027');
  const [campaignFiliereFilter, setCampaignFiliereFilter] = useState<string>('ALL');
  const [campaignParcoursFilter, setCampaignParcoursFilter] = useState<string>('ALL');

  // ============================================================================
  // CALCULS ACADÉMIQUES PURS & CORRIGÉS (PARTIE X – SECTION 22 : ZÉRO NOTE FICTIVE)
  // ============================================================================
  const students = useMemo(() => users.filter((u) => u.role === 'STUDENT'), [users]);

  /**
   * Retourne l'inscription active de l'étudiant pour l'année sélectionnée (ou sa dernière inscription connue).
   */
  const getStudentEnrollmentForYear = (student: User, yearCode: string): StudentInscription | undefined => {
    const exact = inscriptions.find(
      (i) => i.studentId === student.id && (yearCode === 'ALL' || i.academicYear === yearCode)
    );
    if (exact) return exact;
    if (yearCode === 'ALL') {
      const sorted = inscriptions
        .filter((i) => i.studentId === student.id)
        .sort((a, b) => b.academicYear.localeCompare(a.academicYear));
      return sorted[0];
    }
    return undefined;
  };

  /**
   * Section 22 : Calcul strict de la moyenne réelle d'un étudiant.
   * Ne génère JAMAIS de note fictive (12/20 ou hash aléatoire) et ne retourne jamais NaN.
   * Retourne `null` lorsqu'aucune note validée/enregistrée n'existe.
   */
  const getStudentRealAcademicAverage = (studentId: string, academicYear?: string): number | null => {
    const studentGrades = grades.filter(
      (g) =>
        g.studentId === studentId &&
        (!academicYear || academicYear === 'ALL' || !g.academicYear || g.academicYear === academicYear) &&
        g.finalScore !== undefined &&
        g.finalScore !== null &&
        Number.isFinite(g.finalScore)
    );
    if (studentGrades.length === 0) return null;
    const sum = studentGrades.reduce((acc, g) => acc + Number(g.finalScore), 0);
    const avg = sum / studentGrades.length;
    return Number.isFinite(avg) ? Number(avg.toFixed(2)) : null;
  };

  // Enrichissement des étudiants pour le Répertoire (ZÉRO donnée financière !)
  const enrichedDirectoryStudents = useMemo(() => {
    return students.map((st) => {
      const enrollment = getStudentEnrollmentForYear(st, yearFilter);
      const effectiveGroupId = enrollment ? enrollment.groupId : st.groupId || '';
      const group = groups.find((g) => g.id === effectiveGroupId);
      const effectiveFiliereId = enrollment?.filiereId || group?.filiereId || st.filiereId || '';
      const filiere = filieres.find((f) => f.id === effectiveFiliereId);
      const effectiveParcoursId = enrollment?.parcoursId || st.parcoursId || group?.parcoursId || '';
      const studentParcours = parcours.find((p) => p.id === effectiveParcoursId);
      const effectiveLevel = enrollment?.level || group?.level || st.currentLevel || 'L1';
      const effectiveYear =
        enrollment?.academicYear || group?.academicYear || st.academicYearJoined || selectedAcademicYear || '2026-2027';
      const effectiveStatus: StudentInscription['status'] =
        enrollment?.status ||
        (st.enrollmentStatus === 'EN_ATTENTE'
          ? 'PENDING'
          : st.enrollmentStatus === 'SUSPENDUE'
          ? 'SUSPENDED'
          : 'CONFIRMED');
      const inscriptionDate = enrollment?.inscriptionDate || st.enrollmentDate || '2026-09-01';
      const completeness = computeStudentDossierCompleteness(st);
      const isDossierComplete =
        completeness.percentage >= 80 ||
        Boolean(enrollment?.dossierComplete) ||
        st.administrativeFolderStatus === 'COMPLET';
      const realAverage = getStudentRealAcademicAverage(st.id, effectiveYear);

      return {
        student: st,
        enrollment,
        group,
        filiere,
        parcours: studentParcours,
        level: effectiveLevel,
        academicYear: effectiveYear,
        enrollmentStatus: effectiveStatus,
        inscriptionDate,
        completeness,
        isDossierComplete,
        realAverage,
      };
    });
  }, [students, inscriptions, groups, filieres, parcours, grades, yearFilter, selectedAcademicYear]);

  // ============================================================================
  // SECTION 4 : LES 4 CARTES D'INDICATEURS ACADÉMIQUES DU RÉPERTOIRE
  // ============================================================================
  const directoryKpis = useMemo(() => {
    const scoped = enrichedDirectoryStudents.filter((item) => {
      if (yearFilter !== 'ALL' && item.academicYear !== yearFilter) return false;
      return true;
    });

    const activeCount = scoped.filter(
      (item) => item.student.isActive && item.enrollmentStatus === 'CONFIRMED'
    ).length;
    const completeDossiersCount = scoped.filter((item) => item.isDossierComplete).length;
    const incompleteDossiersCount = scoped.filter((item) => !item.isDossierComplete).length;
    const pendingEnrollmentsCount = scoped.filter(
      (item) => item.enrollmentStatus === 'PENDING' || item.enrollmentStatus === 'DRAFT'
    ).length;

    return {
      activeCount,
      completeDossiersCount,
      incompleteDossiersCount,
      pendingEnrollmentsCount,
      totalScoped: scoped.length,
    };
  }, [enrichedDirectoryStudents, yearFilter]);

  // ============================================================================
  // SECTION 5 & 6 : FILTRAGE COMBINÉ & TRI DU RÉPERTOIRE
  // ============================================================================
  const filteredAndSortedStudents = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    const filtered = enrichedDirectoryStudents.filter((item) => {
      const { student } = item;
      const matchesSearch =
        !q ||
        (student.name || '').toLowerCase().includes(q) ||
        (student.lastName || '').toLowerCase().includes(q) ||
        (student.firstName || '').toLowerCase().includes(q) ||
        (student.matricule || '').toLowerCase().includes(q) ||
        (student.email || '').toLowerCase().includes(q) ||
        (student.cin || '').toLowerCase().includes(q) ||
        (student.cardToken || '').toLowerCase().includes(q);

      const matchesYear = yearFilter === 'ALL' || item.academicYear === yearFilter;
      const matchesFiliere = filiereFilter === 'ALL' || item.filiere?.id === filiereFilter;
      const matchesParcours = parcoursFilter === 'ALL' || item.parcours?.id === parcoursFilter;
      const matchesLevel = levelFilter === 'ALL' || item.level === levelFilter;
      const matchesGroup =
        groupFilter === 'ALL' ||
        (groupFilter === 'UNASSIGNED' ? !item.group : item.group?.id === groupFilter);
      const matchesStatus =
        enrollmentStatusFilter === 'ALL' || item.enrollmentStatus === enrollmentStatusFilter;
      const matchesDossier =
        dossierFilter === 'ALL' ||
        (dossierFilter === 'COMPLETE' && item.isDossierComplete) ||
        (dossierFilter === 'INCOMPLETE' && !item.isDossierComplete);

      return (
        matchesSearch &&
        matchesYear &&
        matchesFiliere &&
        matchesParcours &&
        matchesLevel &&
        matchesGroup &&
        matchesStatus &&
        matchesDossier
      );
    });

    return [...filtered].sort((a, b) => {
      const dir = sortOrder === 'asc' ? 1 : -1;
      if (sortField === 'name') {
        return (a.student.name || '').localeCompare(b.student.name || '', 'fr') * dir;
      }
      if (sortField === 'matricule') {
        return (a.student.matricule || '').localeCompare(b.student.matricule || '', 'fr', { numeric: true }) * dir;
      }
      if (sortField === 'group') {
        return (a.group?.code || 'ZZZ').localeCompare(b.group?.code || 'ZZZ', 'fr') * dir;
      }
      if (sortField === 'level') {
        return (a.level || '').localeCompare(b.level || '', 'fr') * dir;
      }
      if (sortField === 'inscriptionDate') {
        return (a.inscriptionDate || '').localeCompare(b.inscriptionDate || '') * dir;
      }
      return 0;
    });
  }, [
    enrichedDirectoryStudents,
    searchTerm,
    yearFilter,
    filiereFilter,
    parcoursFilter,
    levelFilter,
    groupFilter,
    enrollmentStatusFilter,
    dossierFilter,
    sortField,
    sortOrder,
  ]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredAndSortedStudents.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedStudents = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredAndSortedStudents.slice(start, start + pageSize);
  }, [filteredAndSortedStudents, safeCurrentPage, pageSize]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Multi-selection helpers
  const toggleSelectStudent = (id: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllCurrentPage = () => {
    const pageIds = paginatedStudents.map((item) => item.student.id);
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedStudentIds.has(id));
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  // Export CSV (Sélection ou Liste filtrée — purement académique, sans données financières)
  const handleExportAcademicCsv = (onlySelected = false) => {
    const source = onlySelected
      ? filteredAndSortedStudents.filter((item) => selectedStudentIds.has(item.student.id))
      : filteredAndSortedStudents;

    if (source.length === 0) {
      showAppToast({
        type: 'warning',
        title: 'Aucun étudiant à exporter',
        message: 'Veuillez sélectionner au moins un étudiant ou élargir vos filtres.',
      });
      return;
    }

    const headers = [
      'Matricule',
      'Nom & Prénom',
      'CIN',
      'Date de naissance',
      'Email',
      'Téléphone',
      'Mention / Filière',
      'Parcours',
      'Niveau',
      'Groupe / Promotion',
      'Année académique',
      'Statut inscription',
      'Complétude dossier (%)',
      'État dossier',
    ];

    const rows = source.map((item) => [
      item.student.matricule || '',
      item.student.name || '',
      item.student.cin || '',
      item.student.birthDate || '',
      item.student.email || '',
      item.student.phone || '',
      item.filiere ? `${item.filiere.code} - ${item.filiere.name}` : 'Non affecté',
      item.parcours ? `${item.parcours.code} - ${item.parcours.name}` : 'Tronc commun',
      item.level,
      item.group ? item.group.code : 'Sans affectation immédiate',
      item.academicYear,
      item.enrollmentStatus,
      `${item.completeness.percentage}%`,
      item.isDossierComplete ? 'Complet' : 'Incomplet',
    ]);

    const csvContent =
      '\uFEFF' +
      [headers, ...rows]
        .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';'))
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Repertoire_Etudiants_EBM_${yearFilter}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Bulk group change execution
  const handleExecuteBulkGroupChange = () => {
    if (selectedStudentIds.size === 0) return;
    const targetGroup = groups.find((g) => g.id === bulkTargetGroupId);
    let updatedCount = 0;

    selectedStudentIds.forEach((studentId) => {
      const item = enrichedDirectoryStudents.find((e) => e.student.id === studentId);
      if (!item) return;
      if (item.enrollment) {
        updateEnrollment(
          item.enrollment.id,
          {
            groupId: bulkTargetGroupId,
            level: targetGroup?.level || item.enrollment.level,
            filiereId: targetGroup?.filiereId || item.enrollment.filiereId,
            parcoursId: targetGroup?.parcoursId || item.enrollment.parcoursId,
          },
          bulkChangeReason || 'Changement de groupe collectif'
        );
        updatedCount++;
      } else {
        inscribeStudent(
          studentId,
          yearFilter === 'ALL' ? selectedAcademicYear : yearFilter,
          targetGroup?.filiereId || item.filiere?.id || filieres[0]?.id || 'fil-1',
          targetGroup?.level || item.level || 'L1',
          bulkTargetGroupId,
          {
            parcoursId: targetGroup?.parcoursId || item.parcours?.id,
            inscriptionType: 'INSCRIPTION',
          }
        );
        updatedCount++;
      }
    });

    setIsBulkGroupModalOpen(false);
    setSelectedStudentIds(new Set());
    showAppToast({
      type: 'success',
      title: 'Affectation de groupe mise à jour',
      message: `${updatedCount} étudiant(s) ont été réaffectés avec historisation complète.`,
    });
  };

  // ============================================================================
  // LOGIQUE SECTION 4.2 & 4.3 : CRÉATION DE PROFIL ÉTUDIANT SANS INSCRIPTION
  // AVEC DÉTECTION INTELLIGENTE DES DOUBLONS À 3 NIVEAUX
  // ============================================================================
  const standalonePreSearchResults = useMemo(() => {
    const q = standalonePreSearch.trim().toLowerCase();
    if (!q) return [];
    return students
      .filter((st) => {
        const cinClean = (st.cin || '').replace(/\s+/g, '').toLowerCase();
        const qClean = q.replace(/\s+/g, '');
        return (
          st.name.toLowerCase().includes(q) ||
          (st.matricule || '').toLowerCase().includes(q) ||
          (st.email || '').toLowerCase().includes(q) ||
          (st.phone || '').toLowerCase().includes(q) ||
          (cinClean && cinClean.includes(qClean)) ||
          (st.birthDate || '').includes(q)
        );
      })
      .slice(0, 6);
  }, [standalonePreSearch, students]);

  const standaloneDuplicateAnalysis = useMemo(() => {
    const matClean = standaloneForm.matricule.trim().toLowerCase();
    const cinClean = standaloneForm.cin.replace(/\s+/g, '').toLowerCase();
    const emailClean = standaloneForm.email.trim().toLowerCase();
    const phoneClean = standaloneForm.phone.replace(/\s+/g, '').toLowerCase();
    const lName = standaloneForm.lastName.trim().toLowerCase();
    const fName = standaloneForm.firstName.trim().toLowerCase();
    const bDate = standaloneForm.birthDate.trim();

    const level1Strict: { student: User; reason: string }[] = [];
    const level2Strong: { student: User; reason: string }[] = [];
    const level3Info: { student: User; reason: string }[] = [];

    students.forEach((st) => {
      const stCin = (st.cin || '').replace(/\s+/g, '').toLowerCase();
      const stPhone = (st.phone || '').replace(/\s+/g, '').toLowerCase();
      const stNameLower = st.name.toLowerCase();

      // Niveau 1 — Blocage strict (CIN, Matricule ou Email déjà existant)
      if (matClean && (st.matricule || '').toLowerCase() === matClean) {
        level1Strict.push({ student: st, reason: `Matricule permanent déjà attribué (${st.matricule})` });
        return;
      }
      if (cinClean && stCin && stCin === cinClean) {
        level1Strict.push({ student: st, reason: `Numéro CIN / Passeport déjà existant (${st.cin})` });
        return;
      }
      if (emailClean && (st.email || '').toLowerCase() === emailClean) {
        level1Strict.push({ student: st, reason: `Email déjà utilisé (${st.email})` });
        return;
      }

      // Niveau 2 — Alerte forte (Même nom + même prénom + même date de naissance)
      if (lName && fName && stNameLower.includes(lName) && stNameLower.includes(fName)) {
        if (bDate && st.birthDate === bDate) {
          level2Strong.push({
            student: st,
            reason: `Même Nom + Prénom + Date de naissance (${st.birthDate})`,
          });
          return;
        }
        // Niveau 3 — Alerte informative (Homonyme proche)
        level3Info.push({ student: st, reason: `Nom et prénom proches (${st.name})` });
        return;
      }

      if (phoneClean && stPhone && stPhone === phoneClean) {
        level3Info.push({ student: st, reason: `Téléphone identique (${st.phone})` });
      }
    });

    return { level1Strict, level2Strong, level3Info };
  }, [standaloneForm, students]);

  const handleOpenStandaloneCreate = () => {
    setStandaloneCreatedStudent(null);
    setStandaloneForceHomonym(false);
    setStandalonePreSearch('');
    setStandaloneForm({
      matricule: generateNextStudentMatricule(selectedAcademicYear),
      civilite: 'M.',
      lastName: '',
      firstName: '',
      birthDate: '2005-05-15',
      birthPlace: 'Antananarivo',
      nationality: 'Malagasy',
      cin: '',
      phone: '',
      email: '',
      address: '',
      city: 'Antananarivo',
    });
    setIsStandaloneCreateOpen(true);
  };

  const handleSubmitStandaloneStudent = () => {
    if (!standaloneForm.lastName.trim() || !standaloneForm.firstName.trim()) {
      showAppToast({
        type: 'warning',
        title: 'Champs obligatoires',
        message: 'Veuillez renseigner le nom et le prénom de l’étudiant.',
      });
      return;
    }

    if (standaloneDuplicateAnalysis.level1Strict.length > 0) {
      showAppToast({
        type: 'error',
        title: 'Création bloquée (Doublon Niveau 1)',
        message: standaloneDuplicateAnalysis.level1Strict[0].reason,
      });
      return;
    }

    if (standaloneDuplicateAnalysis.level2Strong.length > 0 && !standaloneForceHomonym) {
      showAppToast({
        type: 'warning',
        title: 'Confirmation requise (Doublon potentiel Niveau 2)',
        message: 'Veuillez ouvrir le dossier existant ou cocher "Confirmer qu’il s’agit d’un homonyme".',
      });
      return;
    }

    const matToUse =
      standaloneForm.matricule.trim() || generateNextStudentMatricule(selectedAcademicYear);
    const res = createStudent({
      matricule: matToUse,
      civilite: standaloneForm.civilite,
      lastName: standaloneForm.lastName.trim().toUpperCase(),
      firstName: standaloneForm.firstName.trim(),
      name: `${standaloneForm.firstName.trim()} ${standaloneForm.lastName.trim().toUpperCase()}`.trim(),
      birthDate: standaloneForm.birthDate,
      birthPlace: standaloneForm.birthPlace.trim() || 'Antananarivo',
      nationality: standaloneForm.nationality.trim() || 'Malagasy',
      cin: standaloneForm.cin.trim(),
      phone: standaloneForm.phone.trim(),
      email: standaloneForm.email.trim() || `${matToUse.toLowerCase()}@etudiant.ebm.edu`,
      address: standaloneForm.address.trim(),
      city: standaloneForm.city.trim() || 'Antananarivo',
      groupId: '', // Aucun groupe ni inscription imposée à la création du profil
    });

    if (!res.success || !res.student) {
      showAppToast({
        type: 'error',
        title: 'Erreur lors de la création',
        message: res.error || 'Veuillez vérifier les informations saisies.',
      });
      return;
    }

    setStandaloneCreatedStudent(res.student);
    showAppToast({
      type: 'success',
      title: 'Profil étudiant créé dans le répertoire',
      message: `${res.student.name} (${res.student.matricule}) est enregistré sans inscription automatique.`,
    });
  };

  // ============================================================================
  // LOGIQUE PARTIE IV : NOUVELLE INSCRIPTION INDIVIDUELLE (4 ÉTAPES)
  // ============================================================================
  const duplicateMatches = useMemo(() => {
    if (reuseExistingStudent) return [];
    const lName = indivForm.lastName.trim().toLowerCase();
    const fName = indivForm.firstName.trim().toLowerCase();
    const cinClean = indivForm.cin.replace(/\s+/g, '').toLowerCase();
    const emailClean = indivForm.email.trim().toLowerCase();
    const matClean = indivForm.matricule.trim().toLowerCase();

    if (!lName && !cinClean && !emailClean && !matClean) return [];

    return students.filter((st) => {
      if (matClean && st.matricule?.toLowerCase() === matClean) return true;
      if (cinClean && st.cin && st.cin.replace(/\s+/g, '').toLowerCase() === cinClean) return true;
      if (emailClean && st.email?.toLowerCase() === emailClean) return true;
      if (
        lName &&
        fName &&
        st.name.toLowerCase().includes(lName) &&
        st.name.toLowerCase().includes(fName) &&
        (!indivForm.birthDate || st.birthDate === indivForm.birthDate)
      ) {
        return true;
      }
      return false;
    });
  }, [indivForm, students, reuseExistingStudent]);

  // Groupes filtrés hiérarchiquement pour l'Étape 2 (Année -> Mention -> Parcours -> Niveau -> Groupe)
  const hierarchicalGroupsForStep2 = useMemo(() => {
    if (!indivForm.filiereId || !indivForm.level) return [];
    return groups
      .filter((g) => {
        if (g.filiereId !== indivForm.filiereId) return false;
        if (g.level !== indivForm.level) return false;
        if (indivForm.parcoursId && g.parcoursId && g.parcoursId !== indivForm.parcoursId) {
          return false;
        }
        return true;
      })
      .map((g) => {
        const currentCount = students.filter((s) => s.groupId === g.id).length;
        const maxCapacity = g.maxCapacity || Math.max(g.studentCount || 40, 40);
        const availableSeats = Math.max(0, maxCapacity - currentCount);
        return {
          ...g,
          currentCount,
          maxCapacity,
          availableSeats,
        };
      });
  }, [groups, indivForm.filiereId, indivForm.parcoursId, indivForm.level, students]);

  const handleInitNewEnrollment = (studentToEnroll?: User) => {
    const nextMat = generateNextStudentMatricule(selectedAcademicYear);
    setLastCreatedEnrollmentSummary(null);
    setManualMatriculeMode(false);
    if (studentToEnroll) {
      setReuseExistingStudent(studentToEnroll);
      setWizardStep(2);
      setIndivForm((prev) => ({
        ...prev,
        matricule: studentToEnroll.matricule || nextMat,
        lastName: studentToEnroll.lastName || studentToEnroll.name.split(' ').slice(-1).join(' '),
        firstName: studentToEnroll.firstName || studentToEnroll.name.split(' ').slice(0, -1).join(' '),
        birthDate: studentToEnroll.birthDate || prev.birthDate,
        birthPlace: studentToEnroll.birthPlace || prev.birthPlace,
        cin: studentToEnroll.cin || '',
        phone: studentToEnroll.phone || '',
        email: studentToEnroll.email || '',
        address: studentToEnroll.address || '',
        academicYear: selectedAcademicYear || '2026-2027',
        filiereId: studentToEnroll.filiereId || '',
        parcoursId: studentToEnroll.parcoursId || '',
        level: studentToEnroll.currentLevel || 'L1',
        groupId: 'SANS_GROUPE',
        inscriptionType: inscriptions.some((i) => i.studentId === studentToEnroll.id)
          ? 'REINSCRIPTION'
          : 'PREMIERE_INSCRIPTION',
        status: 'CONFIRMED',
      }));
    } else {
      setReuseExistingStudent(null);
      setWizardStep(1);
      setIndivForm((prev) => ({
        ...prev,
        matricule: nextMat,
        lastName: '',
        firstName: '',
        cin: '',
        phone: '',
        email: '',
        address: '',
        photoUrl: '',
        academicYear: selectedAcademicYear || '2026-2027',
        filiereId: '',
        parcoursId: '',
        level: '',
        groupId: 'SANS_GROUPE', // Groupe non obligatoire par défaut (Section 5.2)
        status: 'CONFIRMED',
      }));
    }
  };

  const handleFinalizeIndividualEnrollment = (overrideStatus?: 'DRAFT' | 'PENDING' | 'CONFIRMED') => {
    const finalStatus = overrideStatus || indivForm.status;
    const effectiveGroupId = indivForm.groupId === 'SANS_GROUPE' ? '' : indivForm.groupId;

    let targetStudent: User | undefined = reuseExistingStudent || undefined;

    if (!targetStudent) {
      const matToUse = indivForm.matricule.trim() || generateNextStudentMatricule(indivForm.academicYear);
      const createRes = createStudent({
        matricule: matToUse,
        civilite: indivForm.civilite,
        lastName: indivForm.lastName.trim().toUpperCase(),
        firstName: indivForm.firstName.trim(),
        name: `${indivForm.firstName.trim()} ${indivForm.lastName.trim().toUpperCase()}`.trim(),
        birthDate: indivForm.birthDate,
        birthPlace: indivForm.birthPlace.trim() || 'Antananarivo',
        cin: indivForm.cin.trim(),
        phone: indivForm.phone.trim(),
        email: indivForm.email.trim() || `${matToUse.toLowerCase()}@etudiant.ebm.edu`,
        address: indivForm.address.trim(),
        city: indivForm.city.trim() || 'Antananarivo',
        photoUrl: indivForm.photoUrl || undefined,
        avatarUrl: indivForm.photoUrl || undefined,
        groupId: effectiveGroupId,
        parcoursId: indivForm.parcoursId || undefined,
        filiereId: indivForm.filiereId,
        currentLevel: indivForm.level as User['currentLevel'],
        academicYearJoined: indivForm.academicYear,
        enrollmentDate: indivForm.inscriptionDate,
      });

      if (!createRes.success || !createRes.student) {
        showAppToast({
          type: 'error',
          title: 'Échec de création du dossier',
          message: createRes.error || 'Veuillez vérifier les informations saisies.',
        });
        return;
      }
      targetStudent = createRes.student;
    }

    const inscRes = inscribeStudent(
      targetStudent.id,
      indivForm.academicYear,
      indivForm.filiereId,
      indivForm.level,
      effectiveGroupId,
      {
        parcoursId: indivForm.parcoursId || undefined,
        inscriptionType: reuseExistingStudent ? 'REINSCRIPTION' : indivForm.inscriptionType,
        trainingMode: indivForm.trainingMode,
        trainingRegime: indivForm.trainingRegime,
        academicStatus: reuseExistingStudent ? 'PASSANT' : 'NOUVEAU',
        documents: indivForm.documents,
        status: finalStatus,
        inscriptionDate: indivForm.inscriptionDate,
        notes: indivForm.notes,
      }
    );

    if (!inscRes.success || !inscRes.inscription) {
      showAppToast({
        type: 'error',
        title: 'Inscription bloquée',
        message: inscRes.error || 'Impossible de valider cette inscription.',
      });
      return;
    }

    setLastCreatedEnrollmentSummary({
      student: targetStudent,
      inscription: inscRes.inscription,
    });

    showAppToast({
      type: 'success',
      title:
        finalStatus === 'DRAFT'
          ? 'Brouillon enregistré'
          : 'Inscription académique validée avec succès',
      message: `${targetStudent.name} (${targetStudent.matricule}) est enregistré pour l'année ${indivForm.academicYear}${effectiveGroupId ? '' : ' (Sans groupe — affectation ultérieure)'}.`,
    });
  };

  // ============================================================================
  // LOGIQUE SECTIONS 5.5, 5.6, 5.7, 5.8 : INSCRIPTION COLLECTIVE INTELLIGENTE
  // ============================================================================
  const eligibleExistingStudentsForCollective = useMemo(() => {
    const q = eligibleSearchQuery.trim().toLowerCase();
    return students
      .map((st) => {
        const studentInscs = inscriptions
          .filter((i) => i.studentId === st.id && i.status !== 'REJECTED')
          .sort((a, b) => b.academicYear.localeCompare(a.academicYear));
        const latestInsc = studentInscs[0];
        const alreadyInTargetYear = inscriptions.some(
          (i) =>
            i.studentId === st.id &&
            i.academicYear === collectiveAcademicTarget.academicYear &&
            i.status !== 'REJECTED'
        );
        const completeness = computeStudentDossierCompleteness(st);
        const isDossierIncomplete = completeness.percentage < 80;

        let eligibilityStatus: 'ELIGIBLE' | 'ALREADY_ENROLLED' | 'INCOMPLETE_WARNING' = 'ELIGIBLE';
        let observation = 'Prêt pour inscription collective';
        if (alreadyInTargetYear) {
          eligibilityStatus = 'ALREADY_ENROLLED';
          observation = `Déjà inscrit en ${collectiveAcademicTarget.academicYear} (Bloqué)`;
        } else if (isDossierIncomplete) {
          eligibilityStatus = 'INCOMPLETE_WARNING';
          observation = `Dossier complété à ${completeness.percentage}% (Autorisé avec avertissement)`;
        }

        return {
          student: st,
          lastYear: latestInsc?.academicYear || 'Aucune (Nouveau profil)',
          lastLevel: latestInsc?.level || st.currentLevel || 'Non inscrit',
          eligibilityStatus,
          observation,
        };
      })
      .filter((item) => {
        if (!q) return true;
        return (
          item.student.name.toLowerCase().includes(q) ||
          (item.student.matricule || '').toLowerCase().includes(q) ||
          (item.student.cin || '').toLowerCase().includes(q)
        );
      });
  }, [students, inscriptions, collectiveAcademicTarget.academicYear, eligibleSearchQuery]);

  const handleConfirmEligibleCollectiveEnrollment = () => {
    if (!collectiveAcademicTarget.filiereId || !collectiveAcademicTarget.level) {
      showAppToast({
        type: 'warning',
        title: 'Paramètres académiques incomplets',
        message: 'Veuillez sélectionner l’Année académique, la Mention/Filière et le Niveau cible.',
      });
      return;
    }

    const selectedItems = eligibleExistingStudentsForCollective.filter(
      (item) =>
        selectedEligibleStudentIds.has(item.student.id) &&
        item.eligibilityStatus !== 'ALREADY_ENROLLED'
    );

    if (selectedItems.length === 0) {
      showAppToast({
        type: 'warning',
        title: 'Aucun étudiant éligible sélectionné',
        message: 'Veuillez cocher au moins un étudiant éligible dans le tableau.',
      });
      return;
    }

    const effectiveGroupId =
      !collectiveAcademicTarget.groupId || collectiveAcademicTarget.groupId === 'SANS_GROUPE'
        ? ''
        : collectiveAcademicTarget.groupId;

    let successCount = 0;
    const errors: { row: number; matricule: string; reason: string }[] = [];
    const createdStudentsList: User[] = [];

    selectedItems.forEach((item, index) => {
      const res = inscribeStudent(
        item.student.id,
        collectiveAcademicTarget.academicYear,
        collectiveAcademicTarget.filiereId,
        collectiveAcademicTarget.level,
        effectiveGroupId,
        {
          parcoursId: collectiveAcademicTarget.parcoursId || undefined,
          inscriptionType: collectiveAcademicTarget.inscriptionType,
          status: collectiveStatus,
          inscriptionDate: collectiveDate,
        }
      );

      if (res.success) {
        successCount++;
        createdStudentsList.push(item.student);
      } else {
        errors.push({
          row: index + 1,
          matricule: item.student.matricule || item.student.name,
          reason: res.error || 'Inscription refusée',
        });
      }
    });

    setCollectiveReport({
      totalRows: selectedItems.length,
      successCount,
      errorCount: errors.length,
      duplicateCount: 0,
      errors,
      createdStudents: createdStudentsList,
    });
    setSelectedEligibleStudentIds(new Set());
    showAppToast({
      type: successCount > 0 ? 'success' : 'error',
      title: `Inscription collective validée (${successCount}/${selectedItems.length})`,
      message: `${successCount} étudiant(s) inscrit(s) pour ${collectiveAcademicTarget.academicYear}${effectiveGroupId ? '' : ' (Sans groupe)'}.`,
    });
  };

  const handleAddDirectRows = (count = 1) => {
    setDirectTableRows((prev) => {
      const additions = Array.from({ length: count }, (_, idx) => ({
        id: `row-${Date.now()}-${prev.length + idx}`,
        matricule: '',
        nom: '',
        prenom: '',
        dateNaissance: '2005-01-01',
        cin: '',
        telephone: '',
        email: '',
        adresse: '',
      }));
      return [...prev, ...additions];
    });
  };

  const handleSubmitDirectTableEnrollment = () => {
    if (!collectiveAcademicTarget.filiereId || !collectiveAcademicTarget.level) {
      showAppToast({
        type: 'warning',
        title: 'Affectation commune incomplète',
        message: 'Veuillez sélectionner la Mention et le Niveau cible (le Groupe est optionnel).',
      });
      return;
    }

    const nonEmptyRows = directTableRows.filter(
      (r) => r.nom.trim().length > 0 || r.prenom.trim().length > 0 || r.matricule.trim().length > 0
    );

    if (nonEmptyRows.length === 0) {
      showAppToast({
        type: 'warning',
        title: 'Tableau vide',
        message: 'Veuillez renseigner au moins un étudiant dans le tableau.',
      });
      return;
    }

    const filObj = filieres.find((f) => f.id === collectiveAcademicTarget.filiereId);
    const parcObj = parcours.find((p) => p.id === collectiveAcademicTarget.parcoursId);
    const grpObj = groups.find((g) => g.id === collectiveAcademicTarget.groupId);

    const payload: ImportStudentRow[] = nonEmptyRows.map((r) => ({
      matricule: r.matricule.trim(),
      nom: r.nom.trim(),
      prenom: r.prenom.trim(),
      dateNaissance: r.dateNaissance || '2005-01-01',
      cin: r.cin.trim(),
      telephone: r.telephone.trim(),
      email: r.email.trim(),
      adresse: r.adresse.trim(),
      anneeAcademique: collectiveAcademicTarget.academicYear,
      filiere: filObj?.code || collectiveAcademicTarget.filiereId,
      parcours: parcObj?.code || '',
      niveau: collectiveAcademicTarget.level,
      groupe:
        !collectiveAcademicTarget.groupId || collectiveAcademicTarget.groupId === 'SANS_GROUPE'
          ? 'SANS_GROUPE'
          : grpObj?.code || collectiveAcademicTarget.groupId,
      typeAdmission: collectiveAcademicTarget.inscriptionType,
    }));

    const res = importStudents(payload);
    setCollectiveReport(res);
    showAppToast({
      type: res.successCount > 0 ? 'success' : 'error',
      title: `Inscription collective terminée (${res.successCount}/${res.totalRows})`,
      message: `${res.successCount} inscrit(s), ${res.errorCount} rejet(s).`,
    });
  };

  const handleDownloadCsvTemplate = () => {
    const template =
      '\uFEFFMatricule;Nom;Prénom;DateNaissance;CIN;Téléphone;Email;AnnéeAcadémique;Mention;Parcours;Niveau;Groupe\n' +
      'EBM-2026-0901;RAKOTOARISOA;Fanja;2005-04-12;101241098765;+261 34 01 020 30;fanja.rakoto@etudiant.ebm.edu;2026-2027;INFO;;L1;\n' +
      ';RANDRIANASOLO;Tojo;2004-08-19;101242011223;+261 33 12 345 67;tojo.randria@etudiant.ebm.edu;2026-2027;INFO;;L1;L1-INFO-A\n';
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Modele_Inscription_Collective_EBM.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleParseCsvToPreview = () => {
    const parsedMatrix = parseCsvContentRfc4180(csvRawText);
    if (parsedMatrix.length === 0) {
      showAppToast({
        type: 'warning',
        title: 'Fichier vide',
        message: 'Aucune ligne détectée dans le contenu CSV.',
      });
      return;
    }

    const firstRowLower = parsedMatrix[0].map((c) => c.toLowerCase());
    const hasHeader =
      firstRowLower.some((c) => c.includes('nom')) ||
      firstRowLower.some((c) => c.includes('matricule'));
    const dataRows = hasHeader ? parsedMatrix.slice(1) : parsedMatrix;

    const mapped: ImportStudentRow[] = dataRows.map((cols) => {
      if (cols.length >= 10) {
        return {
          matricule: cols[0] || '',
          nom: cols[1] || '',
          prenom: cols[2] || '',
          dateNaissance: cols[3] || '2005-01-01',
          cin: cols[4] || '',
          telephone: cols[5] || '',
          email: cols[6] || '',
          anneeAcademique: cols[7] || selectedAcademicYear || '2026-2027',
          filiere: cols[8] || 'INFO',
          parcours: cols[9] || '',
          niveau: cols[10] || 'L1',
          groupe: cols[11] || '',
        };
      }
      // Format court (8 colonnes historiques : Matricule;Nom;Prénom;DateNaissance;Email;Filière;Niveau;Groupe)
      return {
        matricule: cols[0] || '',
        nom: cols[1] || '',
        prenom: cols[2] || '',
        dateNaissance: cols[3] || '2005-01-01',
        email: cols[4] || '',
        filiere: cols[5] || 'INFO',
        niveau: cols[6] || 'L1',
        groupe: cols[7] || '',
        anneeAcademique: selectedAcademicYear || '2026-2027',
      };
    });

    setCsvEditableRows(mapped);
    setCsvStep('PREVIEW');
  };

  // Diagnostic en temps réel de chaque ligne du tableau de prévisualisation CSV (Groupe optionnel !)
  const previewRowDiagnostics = useMemo(() => {
    const existingMats = new Set(users.map((u) => (u.matricule || '').toUpperCase()).filter(Boolean));
    const existingEmails = new Set(users.map((u) => (u.email || '').toLowerCase()).filter(Boolean));
    const seenMats = new Set<string>();

    return csvEditableRows.map((row) => {
      const issues: string[] = [];
      const mat = row.matricule.trim().toUpperCase();
      if (!row.nom.trim() || !row.prenom.trim()) {
        issues.push('Nom ou prénom manquant');
      }
      if (mat) {
        if (existingMats.has(mat)) issues.push(`Matricule ${mat} déjà existant`);
        if (seenMats.has(mat)) issues.push(`Matricule ${mat} en doublon dans le fichier`);
        seenMats.add(mat);
      }
      if (row.email.trim() && existingEmails.has(row.email.trim().toLowerCase())) {
        issues.push('Email déjà utilisé');
      }
      const fil = filieres.find(
        (f) =>
          f.code.toLowerCase() === row.filiere.trim().toLowerCase() ||
          f.name.toLowerCase() === row.filiere.trim().toLowerCase() ||
          f.id === row.filiere.trim()
      );
      if (!fil) {
        issues.push(`Mention "${row.filiere || '?'}" introuvable`);
      }
      const validLevels = ['L1', 'L2', 'L3', 'M1', 'M2'];
      if (!validLevels.includes(row.niveau.trim().toUpperCase())) {
        issues.push(`Niveau "${row.niveau}" invalide`);
      }
      const grpCode = row.groupe.trim();
      if (grpCode && grpCode.toUpperCase() !== 'SANS_GROUPE') {
        const grp = groups.find(
          (g) => g.code.toLowerCase() === grpCode.toLowerCase() || g.id === grpCode
        );
        if (!grp) {
          issues.push(`Groupe "${grpCode}" introuvable`);
        } else if (grp.level !== row.niveau.trim().toUpperCase()) {
          issues.push(`Groupe ${grp.code} (${grp.level}) incompatible avec niveau ${row.niveau}`);
        }
      }

      return {
        isValid: issues.length === 0,
        issues,
      };
    });
  }, [csvEditableRows, users, filieres, groups]);

  const handleValidateCsvImport = (onlyValidRows: boolean) => {
    const rowsToSubmit = onlyValidRows
      ? csvEditableRows.filter((_, idx) => previewRowDiagnostics[idx]?.isValid)
      : csvEditableRows;

    if (rowsToSubmit.length === 0) {
      showAppToast({
        type: 'error',
        title: 'Aucune ligne valide à importer',
        message: 'Veuillez corriger les cellules en erreur directement dans le tableau.',
      });
      return;
    }

    const res = importStudents(rowsToSubmit);
    setCollectiveReport(res);
    setCsvStep('REPORT');
  };

  // ============================================================================
  // LOGIQUE PARTIE VI : RÉINSCRIPTIONS ANNUELLES & COLLECTIVES (5 ÉTAPES)
  // ============================================================================
  const sourcePromotionStudents = useMemo(() => {
    return students
      .map((st) => {
        const sourceInsc = inscriptions.find(
          (i) => i.studentId === st.id && i.academicYear === sourcePromo.academicYear
        );
        const grp = groups.find((g) => g.id === (sourceInsc?.groupId || st.groupId));
        const filId = sourceInsc?.filiereId || grp?.filiereId || st.filiereId || '';
        const parcId = sourceInsc?.parcoursId || st.parcoursId || grp?.parcoursId || '';
        const lvl = sourceInsc?.level || grp?.level || st.currentLevel || 'L1';

        const matchesFiliere = !sourcePromo.filiereId || filId === sourcePromo.filiereId;
        const matchesParcours = !sourcePromo.parcoursId || parcId === sourcePromo.parcoursId;
        const matchesLevel = !sourcePromo.level || lvl === sourcePromo.level;
        const matchesGroup =
          sourcePromo.groupId === 'ALL' || (sourceInsc?.groupId || st.groupId) === sourcePromo.groupId;

        if (!matchesFiliere || !matchesParcours || !matchesLevel || !matchesGroup) {
          return null;
        }

        // Délibération & Moyenne réelle
        const delib = deliberations.find(
          (d) =>
            d.studentId === st.id &&
            d.academicYear === sourcePromo.academicYear &&
            d.semester === 'ANNUEL'
        );
        const previewDelib = computeStudentDeliberationPreview(
          st.id,
          sourcePromo.academicYear,
          'ANNUEL'
        );
        const effectiveDecision = delib?.decision || previewDelib.proposedDecision;
        const realAvg = getStudentRealAcademicAverage(st.id, sourcePromo.academicYear);

        // Vérifier si déjà inscrit dans l'année cible
        const alreadyEnrolledInTarget = inscriptions.some(
          (i) =>
            i.studentId === st.id &&
            i.academicYear === targetPromo.academicYear &&
            i.status === 'CONFIRMED'
        );

        return {
          student: st,
          sourceGroup: grp,
          sourceLevel: lvl,
          sourceFiliereId: filId,
          sourceParcoursId: parcId,
          realAverage: realAvg,
          decision: effectiveDecision,
          validatedCredits: delib?.validatedCredits ?? previewDelib.validatedCredits,
          alreadyEnrolledInTarget,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .filter((item) => {
        if (reenrollDecisionFilter === 'ALL') return true;
        return item.decision === reenrollDecisionFilter;
      });
  }, [
    students,
    inscriptions,
    groups,
    deliberations,
    sourcePromo,
    targetPromo.academicYear,
    reenrollDecisionFilter,
    grades,
  ]);

  const handleInitReenrollStep3 = () => {
    const proposedNextLevel = NEXT_LEVEL_MAP[sourcePromo.level] || sourcePromo.level;
    const defaultTargetGroups = groups.filter(
      (g) => g.filiereId === sourcePromo.filiereId && g.level === proposedNextLevel
    );
    const defaultSameLevelGroups = groups.filter(
      (g) => g.filiereId === sourcePromo.filiereId && g.level === sourcePromo.level
    );

    setTargetPromo((prev) => ({
      ...prev,
      filiereId: sourcePromo.filiereId,
      parcoursId: sourcePromo.parcoursId,
      level: proposedNextLevel,
      groupId: defaultTargetGroups[0]?.id || '',
    }));

    const overrides: typeof perStudentReenrollOverrides = {};
    sourcePromotionStudents.forEach((item) => {
      if (!selectedReenrollStudentIds.has(item.student.id)) return;
      const isRepeating = item.decision === 'AJOURNE';
      const studentTargetLevel = isRepeating ? item.sourceLevel : proposedNextLevel;
      const studentTargetGroup = isRepeating
        ? defaultSameLevelGroups[0]?.id || item.sourceGroup?.id || ''
        : defaultTargetGroups[0]?.id || '';
      const specialCase: EnrollmentSpecialCase =
        item.decision === 'AJOURNE'
          ? 'REDOUBLEMENT'
          : item.decision === 'PASSAGE_CONDITIONNEL'
          ? 'PASSAGE_CONDITIONNEL'
          : 'PASSAGE_SUPERIEUR';

      overrides[item.student.id] = {
        targetLevel: studentTargetLevel,
        targetFiliereId: sourcePromo.filiereId,
        targetParcoursId: sourcePromo.parcoursId,
        targetGroupId: studentTargetGroup,
        specialCaseType: specialCase,
      };
    });

    setPerStudentReenrollOverrides(overrides);
    setReenrollStep(3);
  };

  const handleExecuteCollectiveReenrollment = () => {
    if (isSubmittingReenrollment) return;
    setIsSubmittingReenrollment(true);

    const details: NonNullable<typeof reenrollmentReport>['details'] = [];
    let successCount = 0;
    let skippedCount = 0;

    selectedReenrollStudentIds.forEach((studentId) => {
      const item = sourcePromotionStudents.find((s) => s.student.id === studentId);
      if (!item) return;

      const ov = perStudentReenrollOverrides[studentId] || {
        targetLevel: targetPromo.level,
        targetFiliereId: targetPromo.filiereId,
        targetParcoursId: targetPromo.parcoursId,
        targetGroupId: targetPromo.groupId,
        specialCaseType: 'PASSAGE_SUPERIEUR' as EnrollmentSpecialCase,
      };

      const res = inscribeStudent(
        studentId,
        targetPromo.academicYear,
        ov.targetFiliereId || targetPromo.filiereId,
        ov.targetLevel || targetPromo.level,
        ov.targetGroupId === 'SANS_GROUPE' ? '' : ov.targetGroupId,
        {
          parcoursId: ov.targetParcoursId || undefined,
          inscriptionType: 'REINSCRIPTION',
          specialCaseType: ov.specialCaseType,
          referenceDecision: item.decision,
          academicStatus:
            ov.specialCaseType === 'REDOUBLEMENT'
              ? 'REDOUBLANT'
              : ov.specialCaseType === 'PASSAGE_CONDITIONNEL'
              ? 'PASSAGE_CONDITIONNEL'
              : ov.specialCaseType === 'DIPLOME'
              ? 'DIPLOME'
              : 'PASSANT',
          status: 'CONFIRMED',
        }
      );

      if (res.success) {
        successCount++;
        details.push({
          studentName: item.student.name,
          matricule: item.student.matricule || '',
          status: 'SUCCESS',
          message: `Réinscrit en ${ov.targetLevel} (${ov.specialCaseType}) pour ${targetPromo.academicYear}`,
        });
      } else {
        skippedCount++;
        details.push({
          studentName: item.student.name,
          matricule: item.student.matricule || '',
          status: 'SKIPPED',
          message: res.error || 'Déjà inscrit ou erreur',
        });
      }
    });

    setReenrollmentReport({
      totalProcessed: selectedReenrollStudentIds.size,
      successCount,
      skippedCount,
      details,
    });
    setIsSubmittingReenrollment(false);
    setReenrollStep(5);
  };

  // ============================================================================
  // LOGIQUE PARTIE VII : TABLEAU DE BORD DES CAMPAGNES D'INSCRIPTION
  // ============================================================================
  const campaignStats = useMemo(() => {
    const yearInscriptions = inscriptions.filter((i) => {
      if (i.academicYear !== campaignYearFilter) return false;
      if (campaignFiliereFilter !== 'ALL' && i.filiereId !== campaignFiliereFilter) return false;
      if (campaignParcoursFilter !== 'ALL' && i.parcoursId !== campaignParcoursFilter) return false;
      return true;
    });

    const targetGroups = groups.filter((g) => {
      if (campaignFiliereFilter !== 'ALL' && g.filiereId !== campaignFiliereFilter) return false;
      if (campaignParcoursFilter !== 'ALL' && g.parcoursId !== campaignParcoursFilter) return false;
      return true;
    });

    const expectedHeadcount = Math.max(
      targetGroups.reduce((acc, g) => acc + (g.maxCapacity || g.studentCount || 35), 0),
      students.length
    );

    const newEnrolledCount = yearInscriptions.filter(
      (i) => i.inscriptionType !== 'REINSCRIPTION' && i.status !== 'REJECTED'
    ).length;
    const reenrolledCount = yearInscriptions.filter(
      (i) => i.inscriptionType === 'REINSCRIPTION' && i.status !== 'REJECTED'
    ).length;
    const confirmedCount = yearInscriptions.filter((i) => i.status === 'CONFIRMED').length;
    const pendingCount = yearInscriptions.filter(
      (i) => i.status === 'PENDING' || i.status === 'DRAFT'
    ).length;
    const rejectedOrSuspendedCount = yearInscriptions.filter(
      (i) => i.status === 'REJECTED' || i.status === 'SUSPENDED'
    ).length;

    const enrolledStudentIdSet = new Set(yearInscriptions.map((i) => i.studentId));
    const notYetReenrolledCount = students.filter((st) => {
      if (enrolledStudentIdSet.has(st.id)) return false;
      const grp = groups.find((g) => g.id === st.groupId);
      if (campaignFiliereFilter !== 'ALL' && (st.filiereId || grp?.filiereId) !== campaignFiliereFilter) {
        return false;
      }
      return true;
    }).length;

    const progressRate =
      expectedHeadcount > 0 ? Math.min(100, Math.round((confirmedCount / expectedHeadcount) * 100)) : 0;

    const levels = ['L1', 'L2', 'L3', 'M1', 'M2'];
    const byLevel = levels.map((lvl) => {
      const lvlInscs = yearInscriptions.filter((i) => i.level === lvl);
      const lvlGroups = targetGroups.filter((g) => g.level === lvl);
      const expected = lvlGroups.reduce((acc, g) => acc + (g.maxCapacity || g.studentCount || 30), 0) || 30;
      const newCount = lvlInscs.filter((i) => i.inscriptionType !== 'REINSCRIPTION').length;
      const reCount = lvlInscs.filter((i) => i.inscriptionType === 'REINSCRIPTION').length;
      const validCount = lvlInscs.filter((i) => i.status === 'CONFIRMED').length;
      const waitCount = lvlInscs.filter((i) => i.status === 'PENDING' || i.status === 'DRAFT').length;
      const rate = expected > 0 ? Math.min(100, Math.round((validCount / expected) * 100)) : 0;

      return {
        level: lvl,
        expected,
        newCount,
        reCount,
        validCount,
        waitCount,
        rate,
      };
    });

    return {
      expectedHeadcount,
      newEnrolledCount,
      reenrolledCount,
      confirmedCount,
      pendingCount,
      rejectedOrSuspendedCount,
      notYetReenrolledCount,
      progressRate,
      byLevel,
    };
  }, [inscriptions, groups, students, campaignYearFilter, campaignFiliereFilter, campaignParcoursFilter]);

  return (
    <div className="space-y-6">
      {/* =====================================================================
          EN-TÊTE INSTITUTIONNEL & NAVIGATION DES 5 ESPACES (SECTION 2)
         ===================================================================== */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5 print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#17345B] flex items-center justify-center text-white shadow-md shadow-slate-900/10 shrink-0">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-[#17345B] tracking-tight">
                  Gestion Académique → Étudiants
                </h1>
                <span className="px-2.5 py-0.5 bg-blue-50 text-[#2F6FED] border border-blue-200 rounded-md text-[10px] font-black uppercase">
                  EBM Institute • LMD
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Architecture unifiée : Profil étudiant permanent • Inscriptions annuelles distinctes • Affectation de groupe indépendante • Traçabilité complète.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {['ADMIN', 'SCOLARITE'].includes(currentUser.role) && (
              <button
                type="button"
                onClick={handleOpenStandaloneCreate}
                className="px-3.5 py-2.5 bg-white hover:bg-slate-50 text-[#17345B] border border-slate-300 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 text-[#2F6FED]" />
                <span>Créer profil (Sans inscription)</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                handleInitNewEnrollment();
                setActiveView('NEW_ENROLLMENT');
              }}
              className="px-4 py-2.5 bg-[#2F6FED] hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Inscrire / Réinscrire</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setCollectiveReport(null);
                setCollectiveMethod('EXISTING_ELIGIBLE');
                setActiveView('COLLECTIVE_ENROLLMENT');
              }}
              className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Inscription collective</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView('GROUP_ASSIGNMENT')}
              className="px-3.5 py-2.5 bg-[#17345B] hover:bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Layers className="w-4 h-4" />
              <span>Affecter aux groupes</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView('LISTS_EXPORTS')}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Listes & Exports</span>
            </button>
          </div>
        </div>

        {/* Barre d'onglets des 5 espaces principaux du Cahier des Charges (Section 2) */}
        <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-slate-100">
          {[
            { id: 'DASHBOARD', label: '1. Tableau de bord', icon: BarChart3 },
            { id: 'REPERTOIRE', label: '2. Répertoire des étudiants', icon: Users },
            { id: 'NEW_ENROLLMENT', label: '3. Inscriptions et réinscriptions', icon: UserPlus },
            { id: 'GROUP_ASSIGNMENT', label: '4. Affectation aux groupes', icon: Layers },
            { id: 'LISTS_EXPORTS', label: '5. Listes et exportations', icon: FileSpreadsheet },
          ].map((tab) => {
            const Icon = tab.icon;
            const isEnrollmentSpace =
              tab.id === 'NEW_ENROLLMENT' &&
              ['NEW_ENROLLMENT', 'COLLECTIVE_ENROLLMENT', 'COLLECTIVE_REENROLLMENT', 'CAMPAIGN_DASHBOARD'].includes(
                activeView
              );
            const isActive = activeView === tab.id || isEnrollmentSpace;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  if (tab.id === 'NEW_ENROLLMENT' && !indivForm.matricule) {
                    handleInitNewEnrollment();
                  }
                  setActiveView(tab.id as MainStudentView);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#17345B] text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/70'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Sous-navigation lorsque l'utilisateur est dans l'Espace 3 : Inscriptions et réinscriptions */}
        {['NEW_ENROLLMENT', 'COLLECTIVE_ENROLLMENT', 'COLLECTIVE_REENROLLMENT', 'CAMPAIGN_DASHBOARD'].includes(
          activeView
        ) && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mr-1">
              Mode d’inscription :
            </span>
            {[
              { id: 'NEW_ENROLLMENT', label: '3A. Inscription / Réinscription individuelle (Groupe optionnel)', icon: UserPlus },
              { id: 'COLLECTIVE_ENROLLMENT', label: '3B. Inscription collective (Étudiants éligibles, Tableau & CSV)', icon: FileSpreadsheet },
              { id: 'COLLECTIVE_REENROLLMENT', label: '3C. Passage de promotion & Réinscription annuelle', icon: RefreshCw },
              { id: 'CAMPAIGN_DASHBOARD', label: '3D. Bilan des campagnes par niveau', icon: BarChart3 },
            ].map((sub) => {
              const SubIcon = sub.icon;
              const isSubActive = activeView === sub.id;
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => {
                    if (sub.id === 'NEW_ENROLLMENT' && !indivForm.matricule) {
                      handleInitNewEnrollment();
                    }
                    setActiveView(sub.id as MainStudentView);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                    isSubActive
                      ? 'bg-[#2F6FED] text-white shadow-2xs'
                      : 'bg-blue-50/60 text-[#17345B] hover:bg-blue-100/70 border border-blue-200/60'
                  }`}
                >
                  <SubIcon className="w-3.5 h-3.5" />
                  <span>{sub.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* =====================================================================
          ESPACE 1 : TABLEAU DE BORD DU MODULE ÉTUDIANTS (SECTION 3 — PAR DÉFAUT)
         ===================================================================== */}
      {activeView === 'DASHBOARD' && (
        <StudentAcademicDashboardSpace
          onNavigateToSpace={(space, filterContext) => {
            if (filterContext?.assignmentFilter === 'UNASSIGNED') {
              setGroupFilter('UNASSIGNED');
            }
            if (filterContext?.dossierFilter) {
              setDossierFilter(filterContext.dossierFilter);
            }
            if (filterContext?.statusFilter) {
              setEnrollmentStatusFilter(filterContext.statusFilter);
            }
            if (space === 'ENROLLMENTS') {
              handleInitNewEnrollment();
              setActiveView('NEW_ENROLLMENT');
            } else {
              setActiveView(space);
            }
          }}
          onOpenStudentDossier={(st, editMode = false) => {
            setDossierModalStudent(st);
            setDossierInitialEdit(editMode);
            setDossierInitialTab('TAB_1_IDENTITY');
          }}
        />
      )}

      {/* =====================================================================
          ESPACE 4 : AFFECTATION AUX GROUPES PÉDAGOGIQUES (SECTION 6)
         ===================================================================== */}
      {activeView === 'GROUP_ASSIGNMENT' && (
        <StudentGroupAssignmentSpace
          initialFiliereId={groupAssignmentInitialFilter?.filiereId}
          initialLevel={groupAssignmentInitialFilter?.level}
          onOpenStudentDossier={(st) => {
            setDossierModalStudent(st);
            setDossierInitialEdit(false);
            setDossierInitialTab('TAB_1_IDENTITY');
          }}
        />
      )}

      {/* =====================================================================
          ESPACE 5 : LISTES ET EXPORTATIONS PERSONNALISÉES (SECTION 7)
         ===================================================================== */}
      {activeView === 'LISTS_EXPORTS' && <StudentCustomListsExporter />}

      {/* =====================================================================
          ESPACE 2 : RÉPERTOIRE DES ÉTUDIANTS (SECTION 4)
         ===================================================================== */}
      {activeView === 'REPERTOIRE' && (
        <div className="space-y-5">
          {/* Section 4 : Les 4 Cartes d'Indicateurs Académiques (Zéro indicateur financier) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  1. Étudiants Actifs
                </span>
                <span className="text-2xl font-black text-[#17345B] mt-1 block">
                  {directoryKpis.activeCount}
                </span>
                <span className="text-[11px] text-emerald-700 font-semibold">
                  Sur {directoryKpis.totalScoped} dossier(s) ({yearFilter === 'ALL' ? 'Toutes années' : yearFilter})
                </span>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-blue-50 text-[#2F6FED] flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  2. Dossiers Administratifs Complets
                </span>
                <span className="text-2xl font-black text-emerald-700 mt-1 block">
                  {directoryKpis.completeDossiersCount}
                </span>
                <span className="text-[11px] text-slate-500">
                  Pièces obligatoires vérifiées
                </span>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <FileCheck className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  3. Dossiers Administratifs Incomplets
                </span>
                <span className="text-2xl font-black text-amber-600 mt-1 block">
                  {directoryKpis.incompleteDossiersCount}
                </span>
                <span className="text-[11px] text-amber-700 font-semibold">
                  Pièces justificatives à compléter
                </span>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  4. Inscriptions en Attente
                </span>
                <span className="text-2xl font-black text-indigo-700 mt-1 block">
                  {directoryKpis.pendingEnrollmentsCount}
                </span>
                <span className="text-[11px] text-slate-500">
                  Brouillons ou en cours de validation
                </span>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Section 5 : Identification Rapide par Scan Code-Barres USB / Caméra QR */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs print:hidden">
            <UniversalStudentSelector
              selectedStudentId={dossierModalStudent?.id || ''}
              onSelectStudent={(studentId, studentObj) => {
                const found = studentObj || students.find((s) => s.id === studentId) || null;
                if (found) {
                  setDossierModalStudent(found);
                  setDossierInitialEdit(false);
                  setDossierInitialTab('TAB_1_IDENTITY');
                }
              }}
              label="Identification rapide d’un étudiant (Douchette Code-barres USB, Caméra QR Code ou Matricule)"
              placeholder="Scannez une carte étudiante EBM ou tapez un nom / matricule / CIN pour ouvrir son dossier unique..."
            />
          </div>

          {/* Section 5 & 6 : Barre de Recherche Instantanée & 7 Filtres Académiques Combinés */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3 print:hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="relative lg:col-span-2">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Rechercher par Nom, Prénom, Matricule, Email ou N° CIN..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#2F6FED]"
                />
              </div>

              <div>
                <select
                  value={yearFilter}
                  onChange={(e) => {
                    setYearFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                >
                  <option value="ALL">Toutes les années académiques</option>
                  {academicYears.map((ay) => (
                    <option key={ay.id} value={ay.code}>
                      Année : {ay.code} {ay.isCurrent ? '(Active)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={filiereFilter}
                  onChange={(e) => {
                    setFiliereFilter(e.target.value);
                    setParcoursFilter('ALL');
                    setGroupFilter('ALL');
                    setCurrentPage(1);
                  }}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                >
                  <option value="ALL">Toutes les Mentions / Filières</option>
                  {filieres.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.code} — {f.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <select
                value={parcoursFilter}
                onChange={(e) => {
                  setParcoursFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
              >
                <option value="ALL">Tous les Parcours</option>
                {parcours
                  .filter((p) => filiereFilter === 'ALL' || p.filiereId === filiereFilter)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} — {p.name}
                    </option>
                  ))}
              </select>

              <select
                value={levelFilter}
                onChange={(e) => {
                  setLevelFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
              >
                <option value="ALL">Tous les Niveaux (L1–M2)</option>
                {['L1', 'L2', 'L3', 'M1', 'M2'].map((lvl) => (
                  <option key={lvl} value={lvl}>
                    Niveau {lvl}
                  </option>
                ))}
              </select>

              <select
                value={groupFilter}
                onChange={(e) => {
                  setGroupFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
              >
                <option value="ALL">Tous les Groupes / Promotions</option>
                <option value="UNASSIGNED">Sans affectation immédiate</option>
                {groups
                  .filter((g) => {
                    if (filiereFilter !== 'ALL' && g.filiereId !== filiereFilter) return false;
                    if (levelFilter !== 'ALL' && g.level !== levelFilter) return false;
                    return true;
                  })
                  .map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.code} — {g.name}
                    </option>
                  ))}
              </select>

              <select
                value={enrollmentStatusFilter}
                onChange={(e) => {
                  setEnrollmentStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
              >
                <option value="ALL">Tous les statuts d’inscription</option>
                <option value="CONFIRMED">Inscrit / Validée</option>
                <option value="PENDING">En attente</option>
                <option value="DRAFT">Brouillon</option>
                <option value="SUSPENDED">Suspendu</option>
                <option value="REJECTED">Rejetée</option>
              </select>

              <select
                value={dossierFilter}
                onChange={(e) => {
                  setDossierFilter(e.target.value as 'ALL' | 'COMPLETE' | 'INCOMPLETE');
                  setCurrentPage(1);
                }}
                className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
              >
                <option value="ALL">État du dossier : Tous</option>
                <option value="COMPLETE">Dossiers complets</option>
                <option value="INCOMPLETE">Dossiers incomplets</option>
              </select>
            </div>
          </div>

          {/* Barre d'actions groupées lors d'une sélection multiple */}
          {selectedStudentIds.size > 0 && (
            <div className="bg-[#17345B] text-white p-3.5 rounded-2xl shadow-md flex flex-wrap items-center justify-between gap-3 print:hidden">
              <div className="flex items-center gap-2.5 text-xs font-bold">
                <CheckSquare className="w-4 h-4 text-blue-300" />
                <span>{selectedStudentIds.size} étudiant(s) sélectionné(s)</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setBulkTargetGroupId(groups[0]?.id || '');
                    setIsBulkGroupModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-[#2F6FED] hover:bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Changer de groupe (lot)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportAcademicCsv(true)}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Exporter la sélection (CSV)</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimer la liste</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStudentIds(new Set())}
                  className="px-2.5 py-1.5 bg-rose-500/20 hover:bg-rose-500/40 text-rose-200 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Désélectionner
                </button>
              </div>
            </div>
          )}

          {/* Section 7 : Tableau Principal des Étudiants à 11 Colonnes */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="p-3 w-10 text-center print:hidden">
                      <button
                        type="button"
                        onClick={toggleSelectAllCurrentPage}
                        className="text-slate-500 hover:text-[#17345B] cursor-pointer"
                        title="Tout sélectionner sur cette page"
                      >
                        {paginatedStudents.length > 0 &&
                        paginatedStudents.every((item) => selectedStudentIds.has(item.student.id)) ? (
                          <CheckSquare className="w-4 h-4 text-[#2F6FED]" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    <th className="p-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleSort('matricule')}
                        className="flex items-center gap-1 hover:text-[#17345B] cursor-pointer uppercase"
                      >
                        <span>Matricule</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="p-3 min-w-[210px]">
                      <button
                        type="button"
                        onClick={() => handleSort('name')}
                        className="flex items-center gap-1 hover:text-[#17345B] cursor-pointer uppercase"
                      >
                        <span>Photo & Identité</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="p-3">Mention / Filière</th>
                    <th className="p-3">Parcours</th>
                    <th className="p-3">
                      <button
                        type="button"
                        onClick={() => handleSort('level')}
                        className="flex items-center gap-1 hover:text-[#17345B] cursor-pointer uppercase"
                      >
                        <span>Niveau</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="p-3">
                      <button
                        type="button"
                        onClick={() => handleSort('group')}
                        className="flex items-center gap-1 hover:text-[#17345B] cursor-pointer uppercase"
                      >
                        <span>Groupe / Promotion</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="p-3">
                      <button
                        type="button"
                        onClick={() => handleSort('inscriptionDate')}
                        className="flex items-center gap-1 hover:text-[#17345B] cursor-pointer uppercase"
                      >
                        <span>Année acad.</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="p-3">Statut Inscription</th>
                    <th className="p-3">Complétude Dossier</th>
                    <th className="p-3 text-right print:hidden">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {paginatedStudents.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-10 text-center text-slate-400">
                        Aucun étudiant ne correspond aux critères de recherche ou aux filtres sélectionnés.
                      </td>
                    </tr>
                  ) : (
                    paginatedStudents.map((item) => {
                      const { student } = item;
                      const isSelected = selectedStudentIds.has(student.id);
                      const photoSrc = student.photoUrl || student.avatarUrl || student.avatar;

                      return (
                        <tr
                          key={student.id}
                          className={`hover:bg-slate-50/90 transition-colors ${
                            isSelected ? 'bg-blue-50/40' : ''
                          }`}
                        >
                          {/* 1. Sélection */}
                          <td className="p-3 text-center print:hidden">
                            <button
                              type="button"
                              onClick={() => toggleSelectStudent(student.id)}
                              className="text-slate-400 hover:text-[#2F6FED] cursor-pointer"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-[#2F6FED]" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                          </td>

                          {/* 2. Matricule intégral (sans coupure) */}
                          <td className="p-3 whitespace-nowrap">
                            <span className="font-mono font-black text-[#17345B] bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 inline-block">
                              {student.matricule || 'N/A'}
                            </span>
                          </td>

                          {/* 3. Photo et identité (sans coupure excessive) */}
                          <td className="p-3">
                            <div className="flex items-center gap-2.5">
                              {photoSrc ? (
                                <img
                                  src={photoSrc}
                                  alt={student.name}
                                  className="w-9 h-9 rounded-xl object-cover border border-slate-200 shrink-0"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-xl bg-[#17345B] text-white font-black text-xs flex items-center justify-center shrink-0">
                                  {(student.name || 'ET')
                                    .split(' ')
                                    .map((p) => p[0])
                                    .slice(0, 2)
                                    .join('')
                                    .toUpperCase()}
                                </div>
                              )}
                              <div className="min-w-[160px]">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDossierModalStudent(student);
                                    setDossierInitialEdit(false);
                                    setDossierInitialTab('TAB_1_IDENTITY');
                                  }}
                                  className="font-bold text-slate-900 hover:text-[#2F6FED] text-left block leading-snug cursor-pointer"
                                >
                                  {student.name}
                                </button>
                                <span className="text-[11px] text-slate-500 block">
                                  {student.email}
                                  {student.cin ? ` • CIN: ${student.cin}` : ''}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* 4. Mention / Filière */}
                          <td className="p-3">
                            {item.filiere ? (
                              <div>
                                <span className="font-bold text-slate-800 block">
                                  {item.filiere.code}
                                </span>
                                <span className="text-[10px] text-slate-500">
                                  {item.filiere.name}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Non affectée</span>
                            )}
                          </td>

                          {/* 5. Parcours */}
                          <td className="p-3">
                            {item.parcours ? (
                              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md font-bold text-[10px]">
                                {item.parcours.code}
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-500">Tronc commun</span>
                            )}
                          </td>

                          {/* 6. Niveau */}
                          <td className="p-3">
                            <span className="px-2.5 py-0.5 bg-blue-50 text-[#2F6FED] border border-blue-200 rounded-md font-black text-[11px]">
                              {item.level}
                            </span>
                          </td>

                          {/* 7. Groupe / Promotion */}
                          <td className="p-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              {item.group ? (
                                <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                  {item.group.code}
                                </span>
                              ) : (
                                <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-semibold">
                                  Sans affectation
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  setGroupChangeTarget({
                                    student,
                                    enrollment: item.enrollment,
                                    newGroupId: item.group?.id || '',
                                    reason: 'Changement de groupe administratif',
                                  })
                                }
                                className="p-1 text-slate-400 hover:text-[#2F6FED] rounded hover:bg-blue-50 cursor-pointer print:hidden"
                                title="Modifier le groupe d'affectation (avec historique)"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            </div>
                          </td>

                          {/* 8. Année académique */}
                          <td className="p-3 whitespace-nowrap">
                            <span className="font-mono font-bold text-slate-700">
                              {item.academicYear}
                            </span>
                            <span className="block text-[10px] text-slate-400 font-mono">
                              Inscrit le {item.inscriptionDate}
                            </span>
                          </td>

                          {/* 9. Statut de l'inscription */}
                          <td className="p-3 whitespace-nowrap">
                            <span
                              className={`px-2.5 py-1 rounded-lg font-bold text-[10px] inline-flex items-center gap-1 border ${
                                item.enrollmentStatus === 'CONFIRMED'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : item.enrollmentStatus === 'PENDING' || item.enrollmentStatus === 'DRAFT'
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : item.enrollmentStatus === 'SUSPENDED'
                                  ? 'bg-orange-50 text-orange-800 border-orange-200'
                                  : 'bg-rose-50 text-rose-800 border-rose-200'
                              }`}
                            >
                              {item.enrollmentStatus === 'CONFIRMED'
                                ? 'Inscrit (Validé)'
                                : item.enrollmentStatus === 'PENDING'
                                ? 'En attente'
                                : item.enrollmentStatus === 'DRAFT'
                                ? 'Brouillon'
                                : item.enrollmentStatus === 'SUSPENDED'
                                ? 'Suspendu'
                                : 'Rejeté'}
                            </span>
                          </td>

                          {/* 10. Complétude du dossier */}
                          <td className="p-3">
                            <div className="w-28 space-y-1">
                              <div className="flex items-center justify-between text-[10px] font-bold">
                                <span
                                  className={
                                    item.isDossierComplete ? 'text-emerald-700' : 'text-amber-700'
                                  }
                                >
                                  {item.isDossierComplete ? 'Complet' : 'Incomplet'}
                                </span>
                                <span className="font-mono text-slate-600">
                                  {item.completeness.percentage}%
                                </span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    item.isDossierComplete ? 'bg-emerald-500' : 'bg-amber-500'
                                  }`}
                                  style={{ width: `${item.completeness.percentage}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* 11. Actions (Consulter, Modifier, Afficher carte, Imprimer carte, Historique académique) */}
                          <td className="p-3 text-right whitespace-nowrap print:hidden">
                            <div className="inline-flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setDossierModalStudent(student);
                                  setDossierInitialEdit(false);
                                  setDossierInitialTab('TAB_1_IDENTITY');
                                }}
                                className="px-2.5 py-1.5 bg-blue-50 hover:bg-[#2F6FED] text-[#2F6FED] hover:text-white rounded-lg font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                                title="Consulter la fiche complète de l'étudiant"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Fiche</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setDossierModalStudent(student);
                                  setDossierInitialEdit(true);
                                  setDossierInitialTab('TAB_1_IDENTITY');
                                }}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                                title="Modifier la fiche étudiant"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  handleInitNewEnrollment(student);
                                  setActiveView('NEW_ENROLLMENT');
                                }}
                                className="p-1.5 bg-amber-50 hover:bg-amber-600 text-amber-800 hover:text-white rounded-lg transition-colors cursor-pointer"
                                title="Sélectionner pour une inscription ou réinscription académique"
                              >
                                <UserPlus className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => setCardModalStudent(student)}
                                className="p-1.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white rounded-lg transition-colors cursor-pointer"
                                title="Afficher et imprimer la carte étudiante"
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => setHistoryModalStudent(student)}
                                className="p-1.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white rounded-lg transition-colors cursor-pointer"
                                title="Consulter l'historique académique multi-années"
                              >
                                <History className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Barre de Pagination (25, 50, 100 lignes par page) */}
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs print:hidden">
              <div className="flex items-center gap-2 text-slate-600">
                <span>
                  Affichage de{' '}
                  <strong>
                    {filteredAndSortedStudents.length === 0
                      ? 0
                      : (safeCurrentPage - 1) * pageSize + 1}
                  </strong>{' '}
                  à{' '}
                  <strong>
                    {Math.min(safeCurrentPage * pageSize, filteredAndSortedStudents.length)}
                  </strong>{' '}
                  sur <strong>{filteredAndSortedStudents.length}</strong> étudiant(s)
                </span>
                <span className="text-slate-300">|</span>
                <label className="flex items-center gap-1.5">
                  <span>Lignes par page :</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value) as 25 | 50 | 100);
                      setCurrentPage(1);
                    }}
                    className="p-1 bg-white border border-slate-300 rounded-lg font-bold"
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </label>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={safeCurrentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-bold disabled:opacity-40 cursor-pointer flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Précédent
                </button>
                <span className="px-3 py-1.5 font-bold text-[#17345B]">
                  Page {safeCurrentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={safeCurrentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-bold disabled:opacity-40 cursor-pointer flex items-center gap-1"
                >
                  Suivant
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          VUE 2 : NOUVELLE INSCRIPTION INDIVIDUELLE EN 4 ÉTAPES (PARTIE IV)
         ===================================================================== */}
      {activeView === 'NEW_ENROLLMENT' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {/* Stepper Header */}
          <div className="p-5 bg-slate-50 border-b border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-black text-[#17345B]">
                  Assistant d’Inscription Académique Individuelle
                </h2>
                <p className="text-xs text-slate-500">
                  Parcours guidé en 4 étapes avec contrôle des doublons, affectation de groupe optionnelle et génération de la carte étudiante.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {[
                  { step: 1, title: '1. Identification' },
                  { step: 2, title: '2. Affectation académique' },
                  { step: 3, title: '3. Admission & Documents' },
                  { step: 4, title: '4. Récapitulatif & Validation' },
                ].map((s) => (
                  <button
                    key={s.step}
                    type="button"
                    onClick={() => setWizardStep(s.step as 1 | 2 | 3 | 4)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      wizardStep === s.step
                        ? 'bg-[#2F6FED] text-white shadow-xs'
                        : wizardStep > s.step
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-white text-slate-500 border border-slate-200'
                    }`}
                  >
                    {s.title}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* ÉTAPE 1 : IDENTIFICATION DE L'ÉTUDIANT */}
            {wizardStep === 1 && (
              <div className="space-y-5 text-xs">
                {reuseExistingStudent && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase text-blue-700 block">
                        Réutilisation d’un dossier permanent existant (Sans doublon de compte)
                      </span>
                      <span className="font-black text-sm text-[#17345B]">
                        {reuseExistingStudent.name} — Matricule : {reuseExistingStudent.matricule}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleInitNewEnrollment()}
                      className="px-3 py-1.5 bg-white border border-blue-300 text-blue-700 rounded-xl font-bold cursor-pointer"
                    >
                      Créer plutôt un nouvel étudiant
                    </button>
                  </div>
                )}

                {/* Alerte de détection de doublon en temps réel */}
                {duplicateMatches.length > 0 && (
                  <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2 text-amber-900 font-black">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>
                        Attention : Un ou plusieurs dossiers existants correspondent à ces informations (Contrôle anti-doublon)
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {duplicateMatches.map((dup) => (
                        <div
                          key={dup.id}
                          className="p-2.5 bg-white rounded-xl border border-amber-200 flex flex-wrap items-center justify-between gap-2"
                        >
                          <div>
                            <span className="font-mono font-bold text-[#17345B] mr-2">
                              {dup.matricule}
                            </span>
                            <span className="font-bold text-slate-900">{dup.name}</span>
                            <span className="text-slate-500 ml-2">
                              (Né le {dup.birthDate || 'N/A'} • {dup.email})
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setReuseExistingStudent(dup);
                              setIndivForm((prev) => ({
                                ...prev,
                                matricule: dup.matricule || prev.matricule,
                                lastName: dup.lastName || dup.name.split(' ').slice(-1).join(' '),
                                firstName: dup.firstName || dup.name.split(' ').slice(0, -1).join(' '),
                                birthDate: dup.birthDate || prev.birthDate,
                                birthPlace: dup.birthPlace || prev.birthPlace,
                                cin: dup.cin || '',
                                phone: dup.phone || '',
                                email: dup.email || '',
                                address: dup.address || '',
                                inscriptionType: 'REINSCRIPTION',
                              }));
                            }}
                            className="px-3 py-1 bg-[#17345B] text-white rounded-lg font-bold text-[11px] cursor-pointer"
                          >
                            Réutiliser ce dossier pour une réinscription
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-bold uppercase text-slate-500">
                        Matricule étudiant EBM *
                      </label>
                      {['ADMIN', 'SCOLARITE'].includes(currentUser.role) && !reuseExistingStudent && (
                        <button
                          type="button"
                          onClick={() => {
                            if (manualMatriculeMode) {
                              setIndivForm((prev) => ({
                                ...prev,
                                matricule: generateNextStudentMatricule(prev.academicYear),
                              }));
                            }
                            setManualMatriculeMode(!manualMatriculeMode);
                          }}
                          className="text-[10px] font-bold text-[#2F6FED] hover:underline cursor-pointer"
                        >
                          {manualMatriculeMode ? 'Revenir au matricule auto' : 'Saisie manuelle autorisée'}
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly={!manualMatriculeMode || Boolean(reuseExistingStudent)}
                        value={indivForm.matricule}
                        onChange={(e) =>
                          setIndivForm({ ...indivForm, matricule: e.target.value.toUpperCase() })
                        }
                        placeholder="EBM-2026-XXXX"
                        className={`w-full p-2.5 rounded-xl border font-mono font-bold ${
                          manualMatriculeMode && !reuseExistingStudent
                            ? 'bg-white border-blue-400 text-slate-900'
                            : 'bg-slate-100 border-slate-200 text-[#17345B]'
                        }`}
                      />
                      {!reuseExistingStudent && (
                        <button
                          type="button"
                          onClick={() =>
                            setIndivForm((prev) => ({
                              ...prev,
                              matricule: generateNextStudentMatricule(prev.academicYear),
                            }))
                          }
                          className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold flex items-center gap-1 cursor-pointer"
                          title="Régénérer le prochain matricule libre"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-[#2F6FED]" />
                          Auto
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Civilité / Sexe *
                    </label>
                    <select
                      value={indivForm.civilite}
                      onChange={(e) =>
                        setIndivForm({ ...indivForm, civilite: e.target.value as 'M.' | 'Mme' | 'Mlle' })
                      }
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold"
                    >
                      <option value="M.">M. (Masculin)</option>
                      <option value="Mme">Mme (Féminin)</option>
                      <option value="Mlle">Mlle (Féminin)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Numéro CIN / Passeport
                    </label>
                    <input
                      type="text"
                      value={indivForm.cin}
                      onChange={(e) => setIndivForm({ ...indivForm, cin: e.target.value })}
                      placeholder="101 241 012 345"
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Nom de famille *
                    </label>
                    <input
                      type="text"
                      value={indivForm.lastName}
                      onChange={(e) =>
                        setIndivForm({ ...indivForm, lastName: e.target.value.toUpperCase() })
                      }
                      placeholder="RAKOTONDRABE"
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Prénom(s) *
                    </label>
                    <input
                      type="text"
                      value={indivForm.firstName}
                      onChange={(e) => setIndivForm({ ...indivForm, firstName: e.target.value })}
                      placeholder="Tahina"
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Date de naissance *
                    </label>
                    <input
                      type="date"
                      value={indivForm.birthDate}
                      onChange={(e) => setIndivForm({ ...indivForm, birthDate: e.target.value })}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Lieu de naissance *
                    </label>
                    <input
                      type="text"
                      value={indivForm.birthPlace}
                      onChange={(e) => setIndivForm({ ...indivForm, birthPlace: e.target.value })}
                      placeholder="Antananarivo"
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Téléphone *
                    </label>
                    <input
                      type="tel"
                      value={indivForm.phone}
                      onChange={(e) => setIndivForm({ ...indivForm, phone: e.target.value })}
                      placeholder="+261 34 00 000 00"
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Email institutionnel ou personnel *
                    </label>
                    <input
                      type="email"
                      value={indivForm.email}
                      onChange={(e) => setIndivForm({ ...indivForm, email: e.target.value })}
                      placeholder="prenom.nom@etudiant.ebm.edu"
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Adresse de résidence (Quartier, Lot, Ville)
                    </label>
                    <input
                      type="text"
                      value={indivForm.address}
                      onChange={(e) => setIndivForm({ ...indivForm, address: e.target.value })}
                      placeholder="Lot II M 45 Antsakaviro, Antananarivo 101"
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      if (!indivForm.lastName.trim() || !indivForm.firstName.trim()) {
                        showAppToast({
                          type: 'warning',
                          title: 'Champs obligatoires',
                          message: 'Veuillez renseigner le nom et le prénom de l’étudiant.',
                        });
                        return;
                      }
                      setWizardStep(2);
                    }}
                    className="px-5 py-2.5 bg-[#2F6FED] hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-2 cursor-pointer"
                  >
                    <span>Continuer vers l’affectation académique</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ÉTAPE 2 : AFFECTATION ACADÉMIQUE HIÉRARCHIQUE (GROUPE NON OBLIGATOIRE — SECTION 5.2) */}
            {wizardStep === 2 && (
              <div className="space-y-5 text-xs">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                  <p className="font-bold text-[#17345B]">
                    Sélection hiérarchique : 1. Année académique → 2. Mention / Filière → 3. Parcours → 4. Niveau → 5. Groupe (Optionnel)
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Le choix du groupe pédagogique n’est pas obligatoire à l’étape d’inscription : vous pouvez inscrire l’étudiant sans groupe puis l’affecter ultérieurement dans l’Espace 4.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* 1. Année académique */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      1. Année académique *
                    </label>
                    <select
                      value={indivForm.academicYear}
                      onChange={(e) =>
                        setIndivForm({ ...indivForm, academicYear: e.target.value })
                      }
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold"
                    >
                      {academicYears.map((ay) => (
                        <option key={ay.id} value={ay.code}>
                          {ay.code} — {ay.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 2. Mention / Filière */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      2. Mention / Filière *
                    </label>
                    <select
                      value={indivForm.filiereId}
                      onChange={(e) =>
                        setIndivForm({
                          ...indivForm,
                          filiereId: e.target.value,
                          parcoursId: '',
                          level: '',
                          groupId: 'SANS_GROUPE',
                        })
                      }
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold"
                    >
                      <option value="">-- Choisir la Mention / Filière --</option>
                      {filieres.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.code} — {f.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 3. Parcours */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      3. Parcours (filtré par Mention)
                    </label>
                    <select
                      value={indivForm.parcoursId}
                      disabled={!indivForm.filiereId}
                      onChange={(e) =>
                        setIndivForm({
                          ...indivForm,
                          parcoursId: e.target.value,
                          groupId: 'SANS_GROUPE',
                        })
                      }
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-semibold disabled:bg-slate-100"
                    >
                      <option value="">Tronc commun / Tous parcours</option>
                      {parcours
                        .filter((p) => p.filiereId === indivForm.filiereId)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.code} — {p.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* 4. Niveau */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      4. Niveau d’études *
                    </label>
                    <select
                      value={indivForm.level}
                      disabled={!indivForm.filiereId}
                      onChange={(e) =>
                        setIndivForm({
                          ...indivForm,
                          level: e.target.value,
                          groupId: 'SANS_GROUPE',
                        })
                      }
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold disabled:bg-slate-100"
                    >
                      <option value="">-- Choisir le Niveau --</option>
                      {['L1', 'L2', 'L3', 'M1', 'M2'].map((lvl) => (
                        <option key={lvl} value={lvl}>
                          {lvl}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 5. Sélection optionnelle du Groupe / Promotion */}
                {indivForm.filiereId && indivForm.level && (
                  <div className="space-y-3 pt-2">
                    <label className="block text-[10px] font-bold uppercase text-slate-500">
                      5. Sélection du Groupe / Promotion (Optionnel — Vous pouvez laisser "Sans affectation immédiate")
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {/* Option par défaut : Sans affectation immédiate */}
                      <button
                        type="button"
                        onClick={() => setIndivForm({ ...indivForm, groupId: 'SANS_GROUPE' })}
                        className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                          !indivForm.groupId || indivForm.groupId === 'SANS_GROUPE'
                            ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-400/30'
                            : 'bg-slate-50 border-dashed border-slate-300 hover:border-amber-400'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-black text-sm text-amber-900">
                            Sans affectation immédiate
                          </span>
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-[10px] font-bold">
                            Recommandé si groupes non constitués
                          </span>
                        </div>
                        <p className="text-slate-600 text-[11px] mt-1">
                          Inscrire l’étudiant dans la filière et le niveau sans lui attribuer de groupe dans l’immédiat.
                        </p>
                      </button>

                      {hierarchicalGroupsForStep2.map((grp) => {
                        const isSelected = indivForm.groupId === grp.id;
                        const isFull = grp.availableSeats <= 0;
                        return (
                          <button
                            key={grp.id}
                            type="button"
                            disabled={isFull}
                            onClick={() => setIndivForm({ ...indivForm, groupId: grp.id })}
                            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-blue-50/80 border-[#2F6FED] ring-2 ring-[#2F6FED]/20'
                                : isFull
                                ? 'bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed'
                                : 'bg-white border-slate-200 hover:border-blue-300'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-black text-sm text-[#17345B]">
                                {grp.code}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  isFull
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {grp.availableSeats} place(s) dispo.
                              </span>
                            </div>
                            <p className="font-semibold text-slate-700 mt-1">{grp.name}</p>
                            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100">
                              <span>Effectif : {grp.currentCount}</span>
                              <span>Capacité max : {grp.maxCapacity}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setWizardStep(1)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Retour
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!indivForm.filiereId || !indivForm.level) {
                        showAppToast({
                          type: 'warning',
                          title: 'Affectation académique incomplète',
                          message:
                            'Veuillez sélectionner la Mention / Filière et le Niveau d’études (le Groupe est optionnel).',
                        });
                        return;
                      }
                      if (!indivForm.groupId) {
                        setIndivForm((prev) => ({ ...prev, groupId: 'SANS_GROUPE' }));
                      }
                      setWizardStep(3);
                    }}
                    className="px-5 py-2.5 bg-[#2F6FED] hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-2 cursor-pointer"
                  >
                    <span>Continuer vers Admission & Documents</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ÉTAPE 3 : ADMISSION & DOCUMENTS REQUIS */}
            {wizardStep === 3 && (
              <div className="space-y-5 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Type d’inscription / Admission *
                    </label>
                    <select
                      value={indivForm.inscriptionType}
                      onChange={(e) =>
                        setIndivForm({
                          ...indivForm,
                          inscriptionType: e.target.value as EnrollmentAdmissionType,
                        })
                      }
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold"
                    >
                      <option value="PREMIERE_INSCRIPTION">Première inscription</option>
                      <option value="REINSCRIPTION">Réinscription</option>
                      <option value="REINSCRIPTION_INTERRUPTION">Réinscription après interruption</option>
                      <option value="ADMISSION_PARALLELE">Admission parallèle / Sur dossier</option>
                      <option value="TRANSFERT">Transfert d’établissement</option>
                      <option value="REORIENTATION">Réorientation</option>
                      <option value="EQUIVALENCE">Admission par équivalence</option>
                      <option value="CONCOURS">Admission par concours</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Mode de formation *
                    </label>
                    <select
                      value={indivForm.trainingMode}
                      onChange={(e) =>
                        setIndivForm({
                          ...indivForm,
                          trainingMode: e.target.value as typeof indivForm.trainingMode,
                        })
                      }
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold"
                    >
                      <option value="PRESENTIEL">Présentiel</option>
                      <option value="HYBRIDE">Hybride (Présentiel + Moodle)</option>
                      <option value="EN_LIGNE">En ligne / FOAD</option>
                      <option value="ALTERNANCE">Alternance</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Régime d’études *
                    </label>
                    <select
                      value={indivForm.trainingRegime}
                      onChange={(e) =>
                        setIndivForm({
                          ...indivForm,
                          trainingRegime: e.target.value as typeof indivForm.trainingRegime,
                        })
                      }
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold"
                    >
                      <option value="INITIAL">Formation Initiale</option>
                      <option value="CONTINU">Formation Continue</option>
                      <option value="SALARIE">Étudiant Salarié</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Date d’inscription *
                    </label>
                    <input
                      type="date"
                      value={indivForm.inscriptionDate}
                      onChange={(e) =>
                        setIndivForm({ ...indivForm, inscriptionDate: e.target.value })
                      }
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono"
                    />
                  </div>
                </div>

                {/* Checklist des pièces justificatives */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <h3 className="text-xs font-black uppercase text-[#17345B]">
                    Checklist des documents administratifs remis
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[
                      { key: 'cinOrBirthCert', label: 'Copie CIN ou Acte de naissance (Obligatoire)' },
                      { key: 'baccOriginal', label: 'Diplôme ou Relevé officiel du Baccalauréat (Obligatoire)' },
                      { key: 'photosId', label: 'Photos d’identité officielles (Obligatoire)' },
                      { key: 'medicalCert', label: 'Certificat médical d’aptitude (Obligatoire)' },
                      { key: 'registrationFormSigned', label: 'Fiche d’inscription signée' },
                      ...(indivForm.inscriptionType === 'EQUIVALENCE' ||
                      indivForm.inscriptionType === 'TRANSFERT'
                        ? [
                            {
                              key: 'equivalenceOrTransferDoc',
                              label: 'Arrêté d’équivalence / Attestation de transfert',
                            },
                          ]
                        : []),
                    ].map((docItem) => {
                      const docKey = docItem.key as keyof typeof indivForm.documents;
                      return (
                        <label
                          key={docItem.key}
                          className="p-3 bg-white rounded-xl border border-slate-200 flex items-center gap-2.5 font-semibold text-slate-800 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={Boolean(indivForm.documents[docKey])}
                            onChange={(e) =>
                              setIndivForm({
                                ...indivForm,
                                documents: {
                                  ...indivForm.documents,
                                  [docKey]: e.target.checked,
                                },
                              })
                            }
                            className="rounded text-[#2F6FED]"
                          />
                          <span>{docItem.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setWizardStep(2)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Retour
                  </button>
                  <button
                    type="button"
                    onClick={() => setWizardStep(4)}
                    className="px-5 py-2.5 bg-[#2F6FED] hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-2 cursor-pointer"
                  >
                    <span>Continuer vers le Récapitulatif</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ÉTAPE 4 : RÉCAPITULATIF & VALIDATION */}
            {wizardStep === 4 && (
              <div className="space-y-5 text-xs">
                {lastCreatedEnrollmentSummary ? (
                  <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />
                      <div>
                        <h3 className="text-base font-black text-emerald-950">
                          Inscription enregistrée avec succès !
                        </h3>
                        <p className="text-emerald-800">
                          Étudiant : <strong>{lastCreatedEnrollmentSummary.student.name}</strong> • Matricule :{' '}
                          <strong className="font-mono">{lastCreatedEnrollmentSummary.student.matricule}</strong> • Statut :{' '}
                          <strong>{lastCreatedEnrollmentSummary.inscription.status}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="p-3.5 bg-white rounded-xl border border-emerald-200 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-slate-700">
                        <KeyRound className="w-4 h-4 text-[#2F6FED]" />
                        <span>
                          Identifiant de connexion :{' '}
                          <strong className="font-mono">{lastCreatedEnrollmentSummary.student.matricule}</strong> • Mot de passe initial :{' '}
                          <strong className="font-mono">{lastCreatedEnrollmentSummary.student.birthDate}</strong> (changement obligatoire au 1er accès)
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setCardModalStudent(lastCreatedEnrollmentSummary.student)}
                        className="px-4 py-2.5 bg-[#17345B] hover:bg-slate-800 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>Générer / Imprimer la Carte Étudiante</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="px-4 py-2.5 bg-white border border-emerald-300 text-emerald-900 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Printer className="w-4 h-4" />
                        <span>Imprimer la fiche d’inscription</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInitNewEnrollment()}
                        className="px-4 py-2.5 bg-[#2F6FED] text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>Inscrire un autre étudiant</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveView('REPERTOIRE')}
                        className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold cursor-pointer"
                      >
                        Retour au Répertoire
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                        <h4 className="font-black uppercase text-[#17345B] border-b border-slate-200 pb-1.5">
                          1. Identité de l’étudiant
                        </h4>
                        <p>
                          <strong>Matricule :</strong>{' '}
                          <span className="font-mono font-bold text-[#2F6FED]">{indivForm.matricule}</span>
                        </p>
                        <p>
                          <strong>Nom complet :</strong> {indivForm.civilite} {indivForm.firstName}{' '}
                          {indivForm.lastName}
                        </p>
                        <p>
                          <strong>Naissance :</strong> {indivForm.birthDate} à {indivForm.birthPlace}
                        </p>
                        <p>
                          <strong>CIN :</strong> {indivForm.cin || 'Non renseigné'}
                        </p>
                        <p>
                          <strong>Contact :</strong> {indivForm.phone || '—'} • {indivForm.email || 'Auto'}
                        </p>
                      </div>

                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                        <h4 className="font-black uppercase text-[#17345B] border-b border-slate-200 pb-1.5">
                          2. Affectation Académique & Admission
                        </h4>
                        <p>
                          <strong>Année académique :</strong> {indivForm.academicYear}
                        </p>
                        <p>
                          <strong>Mention / Filière :</strong>{' '}
                          {filieres.find((f) => f.id === indivForm.filiereId)?.name || '—'}
                        </p>
                        <p>
                          <strong>Parcours :</strong>{' '}
                          {parcours.find((p) => p.id === indivForm.parcoursId)?.name || 'Tronc commun'}
                        </p>
                        <p>
                          <strong>Niveau & Groupe :</strong> {indivForm.level} —{' '}
                          {!indivForm.groupId || indivForm.groupId === 'SANS_GROUPE'
                            ? 'Sans affectation immédiate (Affectation ultérieure)'
                            : groups.find((g) => g.id === indivForm.groupId)?.code || '—'}
                        </p>
                        <p>
                          <strong>Admission / Formation :</strong> {indivForm.inscriptionType} ({indivForm.trainingMode} / {indivForm.trainingRegime})
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setWizardStep(3)}
                        className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Retour pour modification
                      </button>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => window.print()}
                          className="px-4 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Printer className="w-4 h-4" />
                          Imprimer la fiche
                        </button>
                        <button
                          type="button"
                          onClick={() => handleFinalizeIndividualEnrollment('DRAFT')}
                          className="px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl font-bold cursor-pointer"
                        >
                          Enregistrer comme brouillon
                        </button>
                        <button
                          type="button"
                          onClick={() => handleFinalizeIndividualEnrollment('CONFIRMED')}
                          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-xs cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Valider l’inscription officielle
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          VUE 3 : INSCRIPTION COLLECTIVE (SECTIONS 5.5, 5.6, 5.7, TABLEAU & CSV)
         ===================================================================== */}
      {activeView === 'COLLECTIVE_ENROLLMENT' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-[#17345B]">
                Inscriptions Collectives Intelligentes (Groupe Optionnel)
              </h2>
              <p className="text-xs text-slate-500">
                Inscrivez collectivement des étudiants existants éligibles, saisissez un lot en tableau ou importez un fichier CSV / Excel sans obligation de groupe immédiat.
              </p>
            </div>
            <div className="flex flex-wrap bg-white p-1 rounded-xl border border-slate-200 gap-1">
              <button
                type="button"
                onClick={() => {
                  setCollectiveMethod('EXISTING_ELIGIBLE');
                  setCollectiveReport(null);
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                  collectiveMethod === 'EXISTING_ELIGIBLE'
                    ? 'bg-[#17345B] text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Méthode 1 : Étudiants existants éligibles (Section 5.6)
              </button>
              <button
                type="button"
                onClick={() => {
                  setCollectiveMethod('TABLE_ENTRY');
                  setCollectiveReport(null);
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                  collectiveMethod === 'TABLE_ENTRY'
                    ? 'bg-[#17345B] text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Méthode 2 : Saisie directe en tableau
              </button>
              <button
                type="button"
                onClick={() => {
                  setCollectiveMethod('CSV_IMPORT');
                  setCollectiveReport(null);
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                  collectiveMethod === 'CSV_IMPORT'
                    ? 'bg-[#17345B] text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Méthode 3 : Importation CSV / Excel
              </button>
            </div>
          </div>

          <div className="p-6 space-y-5 text-xs">
            {/* MÉTHODE 1 : INSCRIPTION COLLECTIVE INTELLIGENTE D'ÉTUDIANTS EXISTANTS ÉLIGIBLES (SECTIONS 5.5, 5.6, 5.7) */}
            {collectiveMethod === 'EXISTING_ELIGIBLE' && (
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <h3 className="font-black uppercase text-[#17345B]">
                    Étape 1 — Sélection des paramètres académiques communs (Groupe non obligatoire)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                        1. Année académique *
                      </label>
                      <select
                        value={collectiveAcademicTarget.academicYear}
                        onChange={(e) => {
                          setCollectiveAcademicTarget({
                            ...collectiveAcademicTarget,
                            academicYear: e.target.value,
                          });
                          setSelectedEligibleStudentIds(new Set());
                        }}
                        className="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold"
                      >
                        {academicYears.map((ay) => (
                          <option key={ay.id} value={ay.code}>
                            {ay.code}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                        2. Mention / Filière *
                      </label>
                      <select
                        value={collectiveAcademicTarget.filiereId}
                        onChange={(e) =>
                          setCollectiveAcademicTarget({
                            ...collectiveAcademicTarget,
                            filiereId: e.target.value,
                            parcoursId: '',
                            groupId: 'SANS_GROUPE',
                          })
                        }
                        className="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold"
                      >
                        <option value="">-- Choisir la Filière --</option>
                        {filieres.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.code} — {f.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                        3. Parcours (Optionnel)
                      </label>
                      <select
                        value={collectiveAcademicTarget.parcoursId}
                        onChange={(e) =>
                          setCollectiveAcademicTarget({
                            ...collectiveAcademicTarget,
                            parcoursId: e.target.value,
                          })
                        }
                        className="w-full p-2 bg-white border border-slate-300 rounded-xl font-semibold"
                      >
                        <option value="">Tronc commun / Tous parcours</option>
                        {parcours
                          .filter((p) => p.filiereId === collectiveAcademicTarget.filiereId)
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.code} — {p.name}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                        4. Niveau cible *
                      </label>
                      <select
                        value={collectiveAcademicTarget.level}
                        onChange={(e) =>
                          setCollectiveAcademicTarget({
                            ...collectiveAcademicTarget,
                            level: e.target.value,
                            groupId: 'SANS_GROUPE',
                          })
                        }
                        className="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold"
                      >
                        {['L1', 'L2', 'L3', 'M1', 'M2'].map((l) => (
                          <option key={l} value={l}>
                            Niveau {l}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                        5. Type d’inscription *
                      </label>
                      <select
                        value={collectiveAcademicTarget.inscriptionType}
                        onChange={(e) =>
                          setCollectiveAcademicTarget({
                            ...collectiveAcademicTarget,
                            inscriptionType: e.target.value as EnrollmentAdmissionType,
                          })
                        }
                        className="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold"
                      >
                        <option value="PREMIERE_INSCRIPTION">Première inscription</option>
                        <option value="REINSCRIPTION">Réinscription</option>
                        <option value="REINSCRIPTION_INTERRUPTION">Réinscription après interruption</option>
                        <option value="ADMISSION_PARALLELE">Admission parallèle</option>
                        <option value="TRANSFERT">Transfert</option>
                        <option value="REORIENTATION">Réorientation</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                        6. Statut d’inscription *
                      </label>
                      <select
                        value={collectiveStatus}
                        onChange={(e) =>
                          setCollectiveStatus(e.target.value as 'CONFIRMED' | 'PENDING')
                        }
                        className="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold"
                      >
                        <option value="CONFIRMED">Inscrit (Confirmé)</option>
                        <option value="PENDING">En attente de validation</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                        7. Date d’inscription *
                      </label>
                      <input
                        type="date"
                        value={collectiveDate}
                        onChange={(e) => setCollectiveDate(e.target.value)}
                        className="w-full p-2 bg-white border border-slate-300 rounded-xl font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                        8. Groupe pédagogique (Optionnel)
                      </label>
                      <select
                        value={collectiveAcademicTarget.groupId}
                        onChange={(e) =>
                          setCollectiveAcademicTarget({
                            ...collectiveAcademicTarget,
                            groupId: e.target.value,
                          })
                        }
                        className="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold"
                      >
                        <option value="SANS_GROUPE">Sans affectation immédiate (Par défaut)</option>
                        {groups
                          .filter(
                            (g) =>
                              g.filiereId === collectiveAcademicTarget.filiereId &&
                              g.level === collectiveAcademicTarget.level
                          )
                          .map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.code} — {g.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Étape 2 & 3 : Filtrage intelligent et Tableau à 7 colonnes (Section 5.6) */}
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="relative flex-1 min-w-[260px]">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={eligibleSearchQuery}
                        onChange={(e) => setEligibleSearchQuery(e.target.value)}
                        placeholder="Filtrer les étudiants du répertoire par Matricule, Nom, Prénom ou CIN..."
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const allEligibleIds = eligibleExistingStudentsForCollective
                            .filter((item) => item.eligibilityStatus !== 'ALREADY_ENROLLED')
                            .map((item) => item.student.id);
                          setSelectedEligibleStudentIds(new Set(allEligibleIds));
                        }}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#2F6FED] rounded-lg font-bold cursor-pointer"
                      >
                        Tout sélectionner (Éligibles uniquement)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedEligibleStudentIds(new Set())}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-bold cursor-pointer"
                      >
                        Tout désélectionner
                      </button>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-80 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500 sticky top-0">
                        <tr>
                          <th className="p-2.5 w-10">1. Choix</th>
                          <th className="p-2.5">2. Matricule</th>
                          <th className="p-2.5">3. Nom et prénom</th>
                          <th className="p-2.5">4. Dernière année connue</th>
                          <th className="p-2.5">5. Dernier niveau connu</th>
                          <th className="p-2.5">6. Statut d’éligibilité</th>
                          <th className="p-2.5">7. Observation éventuelle</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {eligibleExistingStudentsForCollective.map((item) => {
                          const isBlocked = item.eligibilityStatus === 'ALREADY_ENROLLED';
                          const isChecked = selectedEligibleStudentIds.has(item.student.id);
                          return (
                            <tr
                              key={item.student.id}
                              className={
                                isBlocked
                                  ? 'bg-slate-50/80 opacity-60'
                                  : isChecked
                                  ? 'bg-blue-50/40'
                                  : 'hover:bg-slate-50'
                              }
                            >
                              <td className="p-2.5">
                                <input
                                  type="checkbox"
                                  disabled={isBlocked}
                                  checked={isChecked}
                                  onChange={() => {
                                    const next = new Set(selectedEligibleStudentIds);
                                    if (next.has(item.student.id)) next.delete(item.student.id);
                                    else next.add(item.student.id);
                                    setSelectedEligibleStudentIds(next);
                                  }}
                                  className="rounded text-[#2F6FED] cursor-pointer disabled:cursor-not-allowed"
                                />
                              </td>
                              <td className="p-2.5 font-mono font-bold text-[#17345B]">
                                {item.student.matricule}
                              </td>
                              <td className="p-2.5 font-bold text-slate-900">
                                {item.student.name}
                              </td>
                              <td className="p-2.5 font-mono text-slate-600">{item.lastYear}</td>
                              <td className="p-2.5 font-bold text-slate-700">{item.lastLevel}</td>
                              <td className="p-2.5">
                                {item.eligibilityStatus === 'ELIGIBLE' ? (
                                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">
                                    Éligible
                                  </span>
                                ) : item.eligibilityStatus === 'INCOMPLETE_WARNING' ? (
                                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-bold text-[10px]">
                                    Dossier incomplet (Avertissement)
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-bold text-[10px]">
                                    Déjà inscrit (Bloqué)
                                  </span>
                                )}
                              </td>
                              <td className="p-2.5 text-slate-600">{item.observation}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Section 5.7 : Vérification avant validation (Récapitulatif obligatoire) */}
                <div className="p-4 bg-[#17345B] text-white rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 flex-1">
                    <div>
                      <span className="text-[10px] uppercase text-blue-200 block">Année</span>
                      <span className="font-mono font-black">
                        {collectiveAcademicTarget.academicYear}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-blue-200 block">Filière</span>
                      <span className="font-bold">
                        {filieres.find((f) => f.id === collectiveAcademicTarget.filiereId)?.code || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-blue-200 block">Parcours</span>
                      <span className="font-bold">
                        {parcours.find((p) => p.id === collectiveAcademicTarget.parcoursId)?.code ||
                          'Tronc commun'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-blue-200 block">Niveau</span>
                      <span className="font-black text-amber-300">
                        {collectiveAcademicTarget.level}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-blue-200 block">Groupe</span>
                      <span className="font-mono font-bold text-emerald-300">
                        {!collectiveAcademicTarget.groupId ||
                        collectiveAcademicTarget.groupId === 'SANS_GROUPE'
                          ? 'Sans groupe'
                          : groups.find((g) => g.id === collectiveAcademicTarget.groupId)?.code ||
                            'Sans groupe'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-blue-200 block">
                        Étudiants sélectionnés
                      </span>
                      <span className="font-mono font-black text-base text-white">
                        {selectedEligibleStudentIds.size}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-blue-200 block">
                        Exclus (Déjà inscrits)
                      </span>
                      <span className="font-mono font-bold text-rose-300">
                        {
                          eligibleExistingStudentsForCollective.filter(
                            (i) => i.eligibilityStatus === 'ALREADY_ENROLLED'
                          ).length
                        }
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleConfirmEligibleCollectiveEnrollment}
                    className="px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black text-xs flex items-center gap-2 shadow-md cursor-pointer shrink-0"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirmer l’inscription collective</span>
                  </button>
                </div>
              </div>
            )}

            {/* MÉTHODE 2 : SAISIE DIRECTE EN TABLEAU */}
            {collectiveMethod === 'TABLE_ENTRY' && (
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <h3 className="font-black uppercase text-[#17345B]">
                    1. Paramètres académiques communs au lot d’étudiants (Groupe optionnel)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                        Année académique *
                      </label>
                      <select
                        value={collectiveAcademicTarget.academicYear}
                        onChange={(e) =>
                          setCollectiveAcademicTarget({
                            ...collectiveAcademicTarget,
                            academicYear: e.target.value,
                          })
                        }
                        className="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold"
                      >
                        {academicYears.map((ay) => (
                          <option key={ay.id} value={ay.code}>
                            {ay.code}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                        Mention / Filière *
                      </label>
                      <select
                        value={collectiveAcademicTarget.filiereId}
                        onChange={(e) =>
                          setCollectiveAcademicTarget({
                            ...collectiveAcademicTarget,
                            filiereId: e.target.value,
                            parcoursId: '',
                            groupId: '',
                          })
                        }
                        className="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold"
                      >
                        <option value="">-- Choisir --</option>
                        {filieres.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.code} — {f.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                        Parcours
                      </label>
                      <select
                        value={collectiveAcademicTarget.parcoursId}
                        onChange={(e) =>
                          setCollectiveAcademicTarget({
                            ...collectiveAcademicTarget,
                            parcoursId: e.target.value,
                          })
                        }
                        className="w-full p-2 bg-white border border-slate-300 rounded-xl"
                      >
                        <option value="">Tronc commun</option>
                        {parcours
                          .filter((p) => p.filiereId === collectiveAcademicTarget.filiereId)
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.code} — {p.name}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                        Niveau *
                      </label>
                      <select
                        value={collectiveAcademicTarget.level}
                        onChange={(e) =>
                          setCollectiveAcademicTarget({
                            ...collectiveAcademicTarget,
                            level: e.target.value,
                            groupId: '',
                          })
                        }
                        className="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold"
                      >
                        {['L1', 'L2', 'L3', 'M1', 'M2'].map((l) => (
                          <option key={l} value={l}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                        Groupe / Promotion *
                      </label>
                      <select
                        value={collectiveAcademicTarget.groupId}
                        onChange={(e) =>
                          setCollectiveAcademicTarget({
                            ...collectiveAcademicTarget,
                            groupId: e.target.value,
                          })
                        }
                        className="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold"
                      >
                        <option value="">-- Choisir un groupe --</option>
                        <option value="SANS_GROUPE">Sans affectation immédiate</option>
                        {groups
                          .filter(
                            (g) =>
                              g.filiereId === collectiveAcademicTarget.filiereId &&
                              g.level === collectiveAcademicTarget.level
                          )
                          .map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.code} ({g.name})
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Tableau de saisie directe */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500">
                        <tr>
                          <th className="p-2.5 w-10">#</th>
                          <th className="p-2.5">Matricule (Auto si vide)</th>
                          <th className="p-2.5">Nom *</th>
                          <th className="p-2.5">Prénom(s) *</th>
                          <th className="p-2.5">Date naissance</th>
                          <th className="p-2.5">CIN</th>
                          <th className="p-2.5">Téléphone</th>
                          <th className="p-2.5">Email</th>
                          <th className="p-2.5 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {directTableRows.map((row, idx) => (
                          <tr key={row.id}>
                            <td className="p-2 font-mono text-slate-400">{idx + 1}</td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={row.matricule}
                                onChange={(e) => {
                                  const next = [...directTableRows];
                                  next[idx] = { ...row, matricule: e.target.value.toUpperCase() };
                                  setDirectTableRows(next);
                                }}
                                placeholder="Auto EBM-..."
                                className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-[11px]"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={row.nom}
                                onChange={(e) => {
                                  const next = [...directTableRows];
                                  next[idx] = { ...row, nom: e.target.value.toUpperCase() };
                                  setDirectTableRows(next);
                                }}
                                placeholder="NOM"
                                className="w-full p-1.5 bg-white border border-slate-300 rounded-lg font-bold uppercase"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={row.prenom}
                                onChange={(e) => {
                                  const next = [...directTableRows];
                                  next[idx] = { ...row, prenom: e.target.value };
                                  setDirectTableRows(next);
                                }}
                                placeholder="Prénom"
                                className="w-full p-1.5 bg-white border border-slate-300 rounded-lg font-semibold"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="date"
                                value={row.dateNaissance}
                                onChange={(e) => {
                                  const next = [...directTableRows];
                                  next[idx] = { ...row, dateNaissance: e.target.value };
                                  setDirectTableRows(next);
                                }}
                                className="w-full p-1.5 bg-white border border-slate-200 rounded-lg"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={row.cin}
                                onChange={(e) => {
                                  const next = [...directTableRows];
                                  next[idx] = { ...row, cin: e.target.value };
                                  setDirectTableRows(next);
                                }}
                                placeholder="CIN"
                                className="w-full p-1.5 bg-white border border-slate-200 rounded-lg font-mono"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={row.telephone}
                                onChange={(e) => {
                                  const next = [...directTableRows];
                                  next[idx] = { ...row, telephone: e.target.value };
                                  setDirectTableRows(next);
                                }}
                                placeholder="+261..."
                                className="w-full p-1.5 bg-white border border-slate-200 rounded-lg"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="email"
                                value={row.email}
                                onChange={(e) => {
                                  const next = [...directTableRows];
                                  next[idx] = { ...row, email: e.target.value };
                                  setDirectTableRows(next);
                                }}
                                placeholder="Auto si vide"
                                className="w-full p-1.5 bg-white border border-slate-200 rounded-lg"
                              />
                            </td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() =>
                                  setDirectTableRows((prev) => prev.filter((_, i) => i !== idx))
                                }
                                className="text-slate-400 hover:text-rose-600 cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleAddDirectRows(1)}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Ajouter 1 ligne
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddDirectRows(5)}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Ajouter 5 lignes
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleSubmitDirectTableEnrollment}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Valider l’inscription collective du tableau
                  </button>
                </div>
              </div>
            )}

            {/* MÉTHODE B : IMPORTATION CSV / EXCEL AVANCÉE (SECTION 11) */}
            {collectiveMethod === 'CSV_IMPORT' && (
              <div className="space-y-4">
                {csvStep === 'UPLOAD' && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-blue-50 border border-blue-200 rounded-2xl">
                      <div>
                        <h4 className="font-black text-[#17345B]">
                          Modèle officiel d’importation CSV / Excel EBM Institute
                        </h4>
                        <p className="text-[11px] text-slate-600">
                          Gère les guillemets, virgules internes, points-virgules, accents UTF-8 et vérifie strictement l’existence des groupes.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleDownloadCsvTemplate}
                        className="px-3.5 py-2 bg-[#2F6FED] hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        Télécharger le modèle CSV
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold cursor-pointer flex items-center gap-2">
                        <Upload className="w-4 h-4 text-[#2F6FED]" />
                        <span>Charger un fichier .csv</span>
                        <input
                          type="file"
                          accept=".csv,.txt"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              setCsvRawText(String(ev.target?.result || ''));
                            };
                            reader.readAsText(file, 'UTF-8');
                          }}
                        />
                      </label>
                      <span className="text-slate-400">ou collez directement vos lignes CSV ci-dessous :</span>
                    </div>

                    <textarea
                      rows={6}
                      value={csvRawText}
                      onChange={(e) => setCsvRawText(e.target.value)}
                      className="w-full p-3.5 bg-slate-900 text-emerald-400 font-mono text-xs rounded-2xl border border-slate-700"
                    />

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleParseCsvToPreview}
                        className="px-5 py-2.5 bg-[#17345B] hover:bg-slate-800 text-white rounded-xl font-bold flex items-center gap-2 cursor-pointer"
                      >
                        <span>Analyser et Prévisualiser les lignes</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {csvStep === 'PREVIEW' && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-lg font-bold">
                          {previewRowDiagnostics.filter((d) => d.isValid).length} ligne(s) valide(s)
                        </span>
                        <span className="px-3 py-1 bg-rose-100 text-rose-800 rounded-lg font-bold">
                          {previewRowDiagnostics.filter((d) => !d.isValid).length} ligne(s) avec erreur
                        </span>
                        <span className="text-slate-500">
                          Vous pouvez corriger directement les cellules en erreur dans le tableau ci-dessous avant validation.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCsvStep('UPLOAD')}
                        className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-bold cursor-pointer"
                      >
                        Modifier la source CSV
                      </button>
                    </div>

                    <div className="border border-slate-200 rounded-2xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500">
                            <tr>
                              <th className="p-2.5">#</th>
                              <th className="p-2.5">Matricule</th>
                              <th className="p-2.5">Nom *</th>
                              <th className="p-2.5">Prénom *</th>
                              <th className="p-2.5">Mention *</th>
                              <th className="p-2.5">Niveau *</th>
                              <th className="p-2.5">Code Groupe *</th>
                              <th className="p-2.5">Diagnostic</th>
                              <th className="p-2.5"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {csvEditableRows.map((row, idx) => {
                              const diag = previewRowDiagnostics[idx];
                              return (
                                <tr
                                  key={idx}
                                  className={diag?.isValid ? 'bg-white' : 'bg-rose-50/40'}
                                >
                                  <td className="p-2 font-mono">{idx + 1}</td>
                                  <td className="p-2">
                                    <input
                                      type="text"
                                      value={row.matricule}
                                      onChange={(e) => {
                                        const next = [...csvEditableRows];
                                        next[idx] = { ...row, matricule: e.target.value };
                                        setCsvEditableRows(next);
                                      }}
                                      placeholder="Auto"
                                      className="w-28 p-1 bg-white border border-slate-300 rounded font-mono"
                                    />
                                  </td>
                                  <td className="p-2">
                                    <input
                                      type="text"
                                      value={row.nom}
                                      onChange={(e) => {
                                        const next = [...csvEditableRows];
                                        next[idx] = { ...row, nom: e.target.value };
                                        setCsvEditableRows(next);
                                      }}
                                      className="w-28 p-1 bg-white border border-slate-300 rounded font-bold"
                                    />
                                  </td>
                                  <td className="p-2">
                                    <input
                                      type="text"
                                      value={row.prenom}
                                      onChange={(e) => {
                                        const next = [...csvEditableRows];
                                        next[idx] = { ...row, prenom: e.target.value };
                                        setCsvEditableRows(next);
                                      }}
                                      className="w-28 p-1 bg-white border border-slate-300 rounded"
                                    />
                                  </td>
                                  <td className="p-2">
                                    <input
                                      type="text"
                                      value={row.filiere}
                                      onChange={(e) => {
                                        const next = [...csvEditableRows];
                                        next[idx] = { ...row, filiere: e.target.value };
                                        setCsvEditableRows(next);
                                      }}
                                      className="w-20 p-1 bg-white border border-slate-300 rounded font-bold"
                                    />
                                  </td>
                                  <td className="p-2">
                                    <input
                                      type="text"
                                      value={row.niveau}
                                      onChange={(e) => {
                                        const next = [...csvEditableRows];
                                        next[idx] = { ...row, niveau: e.target.value.toUpperCase() };
                                        setCsvEditableRows(next);
                                      }}
                                      className="w-14 p-1 bg-white border border-slate-300 rounded font-bold"
                                    />
                                  </td>
                                  <td className="p-2">
                                    <input
                                      type="text"
                                      value={row.groupe}
                                      onChange={(e) => {
                                        const next = [...csvEditableRows];
                                        next[idx] = { ...row, groupe: e.target.value };
                                        setCsvEditableRows(next);
                                      }}
                                      className="w-28 p-1 bg-white border border-slate-300 rounded font-mono font-bold"
                                    />
                                  </td>
                                  <td className="p-2">
                                    {diag?.isValid ? (
                                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">
                                        Prêt à inscrire
                                      </span>
                                    ) : (
                                      <span className="text-rose-700 font-semibold text-[11px] block">
                                        {diag?.issues.join(' • ')}
                                      </span>
                                    )}
                                  </td>
                                  <td className="p-2 text-center">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setCsvEditableRows((prev) => prev.filter((_, i) => i !== idx))
                                      }
                                      className="text-slate-400 hover:text-rose-600 cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleValidateCsvImport(true)}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold cursor-pointer"
                      >
                        Importer uniquement les lignes valides (
                        {previewRowDiagnostics.filter((d) => d.isValid).length})
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Rapport d'importation / inscription collective */}
            {collectiveReport && (
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-[#17345B]">
                    Rapport final d’inscription collective
                  </h4>
                  <span className="font-bold text-emerald-700">
                    {collectiveReport.successCount} inscrit(s) sur {collectiveReport.totalRows} ligne(s)
                  </span>
                </div>
                {collectiveReport.errors.length > 0 && (
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {collectiveReport.errors.map((err, i) => (
                      <div
                        key={i}
                        className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-[11px]"
                      >
                        <strong>Ligne {err.row} ({err.matricule}) :</strong> {err.reason}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          VUE 4 : RÉINSCRIPTION ANNUELLE & COLLECTIVE EN 5 ÉTAPES (PARTIE VI)
         ===================================================================== */}
      {activeView === 'COLLECTIVE_REENROLLMENT' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-[#17345B]">
                Réinscriptions Annuelles & Passage de Promotion (L1 → L2 → L3 → M1 → M2)
              </h2>
              <p className="text-xs text-slate-500">
                Conserve le compte unique, le matricule permanent et l’historique de notes/présences tout en créant une nouvelle inscription annuelle.
              </p>
            </div>
            <div className="flex bg-white p-1 rounded-xl border border-slate-200 gap-1">
              <button
                type="button"
                onClick={() => setReenrollMode('COLLECTIVE_WIZARD')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                  reenrollMode === 'COLLECTIVE_WIZARD'
                    ? 'bg-[#17345B] text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Assistant collectif (5 étapes)
              </button>
              <button
                type="button"
                onClick={() => setReenrollMode('INDIVIDUAL_QUICK')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                  reenrollMode === 'INDIVIDUAL_QUICK'
                    ? 'bg-[#17345B] text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Réinscription individuelle d’un ancien étudiant
              </button>
            </div>
          </div>

          <div className="p-6 text-xs space-y-5">
            {/* MODE INDIVIDUEL RAPIDE (SECTION 13) */}
            {reenrollMode === 'INDIVIDUAL_QUICK' && (
              <div className="space-y-4">
                <div className="max-w-xl">
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Rechercher un étudiant existant (Matricule, Nom, Prénom ou CIN)
                  </label>
                  <input
                    type="text"
                    value={quickReenrollSearch}
                    onChange={(e) => setQuickReenrollSearch(e.target.value)}
                    placeholder="Tapez un matricule (ex: EBM-2026-0001) ou un nom..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                  />
                </div>

                {quickReenrollSearch.trim().length > 0 && !quickReenrollStudent && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {students
                      .filter((st) => {
                        const q = quickReenrollSearch.toLowerCase();
                        return (
                          st.name.toLowerCase().includes(q) ||
                          (st.matricule || '').toLowerCase().includes(q) ||
                          (st.cin || '').toLowerCase().includes(q)
                        );
                      })
                      .slice(0, 6)
                      .map((st) => {
                        const grp = groups.find((g) => g.id === st.groupId);
                        return (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => {
                              const nextLvl = NEXT_LEVEL_MAP[grp?.level || 'L1'] || 'L2';
                              setQuickReenrollStudent(st);
                              setQuickReenrollTarget({
                                academicYear: selectedAcademicYear || '2026-2027',
                                filiereId: grp?.filiereId || st.filiereId || filieres[0]?.id || '',
                                parcoursId: st.parcoursId || grp?.parcoursId || '',
                                level: nextLvl,
                                groupId: '',
                                specialCaseType: 'PASSAGE_SUPERIEUR',
                                referenceDecision: 'ADMIS',
                                notes: '',
                              });
                            }}
                            className="p-3 bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded-xl text-left flex items-center justify-between cursor-pointer"
                          >
                            <div>
                              <span className="font-mono font-bold text-[#17345B] mr-2">
                                {st.matricule}
                              </span>
                              <span className="font-bold text-slate-900">{st.name}</span>
                            </div>
                            <span className="px-2 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px]">
                              {grp?.code || 'Sans groupe'}
                            </span>
                          </button>
                        );
                      })}
                  </div>
                )}

                {quickReenrollStudent && (
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-blue-700 block">
                          Dossier permanent chargé (Conservation du compte et du matricule)
                        </span>
                        <h3 className="text-sm font-black text-[#17345B]">
                          {quickReenrollStudent.name} ({quickReenrollStudent.matricule})
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setQuickReenrollStudent(null)}
                        className="px-3 py-1 bg-white border border-slate-300 rounded-lg font-bold cursor-pointer"
                      >
                        Changer d’étudiant
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                          Nouvelle année *
                        </label>
                        <select
                          value={quickReenrollTarget.academicYear}
                          onChange={(e) =>
                            setQuickReenrollTarget({
                              ...quickReenrollTarget,
                              academicYear: e.target.value,
                            })
                          }
                          className="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold"
                        >
                          {academicYears.map((ay) => (
                            <option key={ay.id} value={ay.code}>
                              {ay.code}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                          Cas / Décision *
                        </label>
                        <select
                          value={quickReenrollTarget.specialCaseType}
                          onChange={(e) =>
                            setQuickReenrollTarget({
                              ...quickReenrollTarget,
                              specialCaseType: e.target.value as EnrollmentSpecialCase,
                            })
                          }
                          className="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold"
                        >
                          <option value="PASSAGE_SUPERIEUR">Passage en niveau supérieur</option>
                          <option value="REDOUBLEMENT">Redoublement</option>
                          <option value="PASSAGE_CONDITIONNEL">Passage conditionnel</option>
                          <option value="REORIENTATION">Réorientation de filière</option>
                          <option value="CHANGEMENT_PARCOURS">Changement de parcours</option>
                          <option value="REPRISE">Reprise après interruption</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                          Mention cible *
                        </label>
                        <select
                          value={quickReenrollTarget.filiereId}
                          onChange={(e) =>
                            setQuickReenrollTarget({
                              ...quickReenrollTarget,
                              filiereId: e.target.value,
                              groupId: '',
                            })
                          }
                          className="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold"
                        >
                          {filieres.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.code} — {f.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                          Nouveau niveau *
                        </label>
                        <select
                          value={quickReenrollTarget.level}
                          onChange={(e) =>
                            setQuickReenrollTarget({
                              ...quickReenrollTarget,
                              level: e.target.value,
                              groupId: '',
                            })
                          }
                          className="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold"
                        >
                          {['L1', 'L2', 'L3', 'M1', 'M2'].map((l) => (
                            <option key={l} value={l}>
                              {l}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                          Nouveau groupe *
                        </label>
                        <select
                          value={quickReenrollTarget.groupId}
                          onChange={(e) =>
                            setQuickReenrollTarget({
                              ...quickReenrollTarget,
                              groupId: e.target.value,
                            })
                          }
                          className="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold"
                        >
                          <option value="">-- Choisir un groupe --</option>
                          <option value="SANS_GROUPE">Sans affectation immédiate</option>
                          {groups
                            .filter(
                              (g) =>
                                g.filiereId === quickReenrollTarget.filiereId &&
                                g.level === quickReenrollTarget.level
                            )
                            .map((g) => (
                              <option key={g.id} value={g.id}>
                                {g.code} ({g.name})
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          if (!quickReenrollTarget.groupId) {
                            showAppToast({
                              type: 'warning',
                              title: 'Groupe requis',
                              message: 'Veuillez choisir le nouveau groupe ou "Sans affectation immédiate".',
                            });
                            return;
                          }
                          const res = inscribeStudent(
                            quickReenrollStudent.id,
                            quickReenrollTarget.academicYear,
                            quickReenrollTarget.filiereId,
                            quickReenrollTarget.level,
                            quickReenrollTarget.groupId === 'SANS_GROUPE' ? '' : quickReenrollTarget.groupId,
                            {
                              parcoursId: quickReenrollTarget.parcoursId || undefined,
                              inscriptionType: 'REINSCRIPTION',
                              specialCaseType: quickReenrollTarget.specialCaseType,
                              academicStatus:
                                quickReenrollTarget.specialCaseType === 'REDOUBLEMENT'
                                  ? 'REDOUBLANT'
                                  : 'PASSANT',
                              status: 'CONFIRMED',
                            }
                          );
                          if (res.success) {
                            showAppToast({
                              type: 'success',
                              title: 'Réinscription validée',
                              message: `${quickReenrollStudent.name} est réinscrit en ${quickReenrollTarget.level} pour ${quickReenrollTarget.academicYear}.`,
                            });
                            setQuickReenrollStudent(null);
                          } else {
                            showAppToast({
                              type: 'error',
                              title: 'Réinscription refusée',
                              message: res.error || 'Erreur lors de la réinscription.',
                            });
                          }
                        }}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold cursor-pointer"
                      >
                        Valider la réinscription individuelle
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ASSISTANT COLLECTIF EN 5 ÉTAPES (SECTION 14 À 16) */}
            {reenrollMode === 'COLLECTIVE_WIZARD' && (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3">
                  {[
                    { s: 1, label: 'Étape 1 : Promotion d’origine' },
                    { s: 2, label: 'Étape 2 : Sélection des étudiants' },
                    { s: 3, label: 'Étape 3 : Nouvelle affectation & Cas particuliers' },
                    { s: 4, label: 'Étape 4 : Prévisualisation & Capacités' },
                    { s: 5, label: 'Étape 5 : Validation & Rapport' },
                  ].map((item) => (
                    <span
                      key={item.s}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs ${
                        reenrollStep === item.s
                          ? 'bg-[#2F6FED] text-white'
                          : reenrollStep > item.s
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {item.label}
                    </span>
                  ))}
                </div>

                {/* ÉTAPE 1 : PROMOTION D'ORIGINE */}
                {reenrollStep === 1 && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                          Année académique d’origine *
                        </label>
                        <select
                          value={sourcePromo.academicYear}
                          onChange={(e) =>
                            setSourcePromo({ ...sourcePromo, academicYear: e.target.value })
                          }
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold"
                        >
                          {academicYears.map((ay) => (
                            <option key={ay.id} value={ay.code}>
                              {ay.code}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                          Mention / Filière d’origine *
                        </label>
                        <select
                          value={sourcePromo.filiereId}
                          onChange={(e) =>
                            setSourcePromo({
                              ...sourcePromo,
                              filiereId: e.target.value,
                              groupId: 'ALL',
                            })
                          }
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold"
                        >
                          {filieres.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.code} — {f.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                          Niveau d’origine *
                        </label>
                        <select
                          value={sourcePromo.level}
                          onChange={(e) =>
                            setSourcePromo({
                              ...sourcePromo,
                              level: e.target.value,
                              groupId: 'ALL',
                            })
                          }
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold"
                        >
                          {['L1', 'L2', 'L3', 'M1', 'M2'].map((l) => (
                            <option key={l} value={l}>
                              {l}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                          Groupe d’origine
                        </label>
                        <select
                          value={sourcePromo.groupId}
                          onChange={(e) =>
                            setSourcePromo({ ...sourcePromo, groupId: e.target.value })
                          }
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold"
                        >
                          <option value="ALL">Tous les groupes de ce niveau</option>
                          {groups
                            .filter(
                              (g) =>
                                g.filiereId === sourcePromo.filiereId &&
                                g.level === sourcePromo.level
                            )
                            .map((g) => (
                              <option key={g.id} value={g.id}>
                                {g.code} — {g.name}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          const eligibleIds = sourcePromotionStudents
                            .filter((s) => !s.alreadyEnrolledInTarget)
                            .map((s) => s.student.id);
                          setSelectedReenrollStudentIds(new Set(eligibleIds));
                          setReenrollStep(2);
                        }}
                        className="px-5 py-2.5 bg-[#2F6FED] hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-2 cursor-pointer"
                      >
                        <span>Charger les étudiants de la promotion ({sourcePromotionStudents.length})</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* ÉTAPE 2 : SÉLECTION DES ÉTUDIANTS & RÉSULTATS DE DÉLIBÉRATION */}
                {reenrollStep === 2 && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {[
                          { id: 'ALL', label: 'Tous les étudiants' },
                          { id: 'ADMIS', label: 'Admis' },
                          { id: 'ADMIS_COMPENSATION', label: 'Admis par compensation' },
                          { id: 'PASSAGE_CONDITIONNEL', label: 'Passages conditionnels' },
                          { id: 'AJOURNE', label: 'Ajournés / Redoublants' },
                        ].map((f) => (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() =>
                              setReenrollDecisionFilter(
                                f.id as typeof reenrollDecisionFilter
                              )
                            }
                            className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer ${
                              reenrollDecisionFilter === f.id
                                ? 'bg-[#17345B] text-white'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                      <span className="font-bold text-slate-600">
                        {selectedReenrollStudentIds.size} étudiant(s) coché(s)
                      </span>
                    </div>

                    <div className="border border-slate-200 rounded-2xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500">
                          <tr>
                            <th className="p-2.5 w-10 text-center">Sél.</th>
                            <th className="p-2.5">Matricule</th>
                            <th className="p-2.5">Nom & Prénom</th>
                            <th className="p-2.5">Groupe actuel</th>
                            <th className="p-2.5">Moyenne réelle</th>
                            <th className="p-2.5">Décision jury</th>
                            <th className="p-2.5">Statut</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {sourcePromotionStudents.map((item) => {
                            const checked = selectedReenrollStudentIds.has(item.student.id);
                            return (
                              <tr key={item.student.id} className="hover:bg-slate-50">
                                <td className="p-2.5 text-center">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => {
                                      setSelectedReenrollStudentIds((prev) => {
                                        const next = new Set(prev);
                                        if (next.has(item.student.id)) next.delete(item.student.id);
                                        else next.add(item.student.id);
                                        return next;
                                      });
                                    }}
                                  />
                                </td>
                                <td className="p-2.5 font-mono font-bold text-[#17345B]">
                                  {item.student.matricule}
                                </td>
                                <td className="p-2.5 font-bold text-slate-900">
                                  {item.student.name}
                                </td>
                                <td className="p-2.5 font-mono">
                                  {item.sourceGroup?.code || item.sourceLevel}
                                </td>
                                <td className="p-2.5 font-mono font-bold">
                                  {item.realAverage !== null
                                    ? `${item.realAverage.toFixed(2)} / 20`
                                    : 'Non disponible'}
                                </td>
                                <td className="p-2.5">
                                  <span
                                    className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                                      item.decision === 'ADMIS' ||
                                      item.decision === 'ADMIS_COMPENSATION'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : item.decision === 'PASSAGE_CONDITIONNEL'
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-rose-100 text-rose-800'
                                    }`}
                                  >
                                    {item.decision}
                                  </span>
                                </td>
                                <td className="p-2.5">
                                  {item.alreadyEnrolledInTarget ? (
                                    <span className="text-amber-700 font-bold text-[10px]">
                                      Déjà inscrit en {targetPromo.academicYear}
                                    </span>
                                  ) : (
                                    <span className="text-emerald-700 font-semibold text-[10px]">
                                      Éligible
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex justify-between">
                      <button
                        type="button"
                        onClick={() => setReenrollStep(1)}
                        className="px-4 py-2 bg-slate-100 rounded-xl font-bold cursor-pointer"
                      >
                        Retour
                      </button>
                      <button
                        type="button"
                        disabled={selectedReenrollStudentIds.size === 0}
                        onClick={handleInitReenrollStep3}
                        className="px-5 py-2.5 bg-[#2F6FED] text-white rounded-xl font-bold disabled:opacity-40 cursor-pointer"
                      >
                        Définir la nouvelle affectation ({selectedReenrollStudentIds.size})
                      </button>
                    </div>
                  </div>
                )}

                {/* ÉTAPE 3 : DÉFINITION DE LA NOUVELLE AFFECTATION & CAS PARTICULIERS */}
                {reenrollStep === 3 && (
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-blue-900 mb-1">
                          Nouvelle Année Académique Cible *
                        </label>
                        <select
                          value={targetPromo.academicYear}
                          onChange={(e) =>
                            setTargetPromo({ ...targetPromo, academicYear: e.target.value })
                          }
                          className="w-full p-2 bg-white border border-blue-300 rounded-xl font-bold"
                        >
                          {academicYears.map((ay) => (
                            <option key={ay.id} value={ay.code}>
                              {ay.code}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="sm:col-span-2 flex items-center text-blue-900 font-semibold">
                        Proposition intelligente appliquée : passage en niveau supérieur ({NEXT_LEVEL_MAP[sourcePromo.level] || sourcePromo.level}) pour les étudiants Admis, et maintien en {sourcePromo.level} pour les Ajournés. Vous pouvez ajuster chaque étudiant individuellement ci-dessous.
                      </div>
                    </div>

                    <div className="border border-slate-200 rounded-2xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500">
                          <tr>
                            <th className="p-2.5">Étudiant</th>
                            <th className="p-2.5">Décision Jury</th>
                            <th className="p-2.5">Cas de réinscription</th>
                            <th className="p-2.5">Niveau cible</th>
                            <th className="p-2.5">Groupe cible</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {sourcePromotionStudents
                            .filter((s) => selectedReenrollStudentIds.has(s.student.id))
                            .map((item) => {
                              const ov = perStudentReenrollOverrides[item.student.id] || {
                                targetLevel: targetPromo.level,
                                targetFiliereId: targetPromo.filiereId,
                                targetParcoursId: targetPromo.parcoursId,
                                targetGroupId: targetPromo.groupId,
                                specialCaseType: 'PASSAGE_SUPERIEUR' as EnrollmentSpecialCase,
                              };
                              const availableTargetGroups = groups.filter(
                                (g) =>
                                  g.filiereId === ov.targetFiliereId &&
                                  g.level === ov.targetLevel
                              );

                              return (
                                <tr key={item.student.id}>
                                  <td className="p-2.5">
                                    <span className="font-mono font-bold text-[#17345B] mr-1.5">
                                      {item.student.matricule}
                                    </span>
                                    <span className="font-bold">{item.student.name}</span>
                                  </td>
                                  <td className="p-2.5 font-bold">{item.decision}</td>
                                  <td className="p-2.5">
                                    <select
                                      value={ov.specialCaseType}
                                      onChange={(e) => {
                                        const sc = e.target.value as EnrollmentSpecialCase;
                                        const newLvl =
                                          sc === 'REDOUBLEMENT'
                                            ? item.sourceLevel
                                            : NEXT_LEVEL_MAP[item.sourceLevel] || item.sourceLevel;
                                        setPerStudentReenrollOverrides({
                                          ...perStudentReenrollOverrides,
                                          [item.student.id]: {
                                            ...ov,
                                            specialCaseType: sc,
                                            targetLevel: newLvl,
                                          },
                                        });
                                      }}
                                      className="p-1.5 bg-white border border-slate-300 rounded-lg font-bold"
                                    >
                                      <option value="PASSAGE_SUPERIEUR">Passage niveau supérieur</option>
                                      <option value="REDOUBLEMENT">Redoublement</option>
                                      <option value="PASSAGE_CONDITIONNEL">Passage conditionnel</option>
                                      <option value="REORIENTATION">Réorientation</option>
                                      <option value="CHANGEMENT_PARCOURS">Changement de parcours</option>
                                      <option value="CHANGEMENT_GROUPE">Changement de groupe</option>
                                      <option value="DIPLOME">Diplômé / Fin de cycle</option>
                                    </select>
                                  </td>
                                  <td className="p-2.5">
                                    <select
                                      value={ov.targetLevel}
                                      onChange={(e) =>
                                        setPerStudentReenrollOverrides({
                                          ...perStudentReenrollOverrides,
                                          [item.student.id]: {
                                            ...ov,
                                            targetLevel: e.target.value,
                                            targetGroupId: '',
                                          },
                                        })
                                      }
                                      className="p-1.5 bg-white border border-slate-300 rounded-lg font-bold"
                                    >
                                      {['L1', 'L2', 'L3', 'M1', 'M2'].map((l) => (
                                        <option key={l} value={l}>
                                          {l}
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                  <td className="p-2.5">
                                    <select
                                      value={ov.targetGroupId}
                                      onChange={(e) =>
                                        setPerStudentReenrollOverrides({
                                          ...perStudentReenrollOverrides,
                                          [item.student.id]: {
                                            ...ov,
                                            targetGroupId: e.target.value,
                                          },
                                        })
                                      }
                                      className="p-1.5 bg-white border border-slate-300 rounded-lg font-bold"
                                    >
                                      <option value="SANS_GROUPE">Sans affectation immédiate</option>
                                      {availableTargetGroups.map((g) => (
                                        <option key={g.id} value={g.id}>
                                          {g.code} ({g.name})
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex justify-between">
                      <button
                        type="button"
                        onClick={() => setReenrollStep(2)}
                        className="px-4 py-2 bg-slate-100 rounded-xl font-bold cursor-pointer"
                      >
                        Retour
                      </button>
                      <button
                        type="button"
                        onClick={() => setReenrollStep(4)}
                        className="px-5 py-2.5 bg-[#2F6FED] text-white rounded-xl font-bold cursor-pointer"
                      >
                        Prévisualiser avant validation
                      </button>
                    </div>
                  </div>
                )}

                {/* ÉTAPE 4 : PRÉVISUALISATION & CONTRÔLES */}
                {reenrollStep === 4 && (
                  <div className="space-y-4">
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
                      <h4 className="font-black text-emerald-950">
                        Vérification avant validation collective ({selectedReenrollStudentIds.size} étudiant(s))
                      </h4>
                      <p className="text-emerald-800 text-[11px]">
                        Les comptes utilisateurs, matricules permanents, notes et présences antérieures seront intégralement préservés.
                      </p>
                    </div>

                    <div className="flex justify-between">
                      <button
                        type="button"
                        onClick={() => setReenrollStep(3)}
                        className="px-4 py-2 bg-slate-100 rounded-xl font-bold cursor-pointer"
                      >
                        Retour
                      </button>
                      <button
                        type="button"
                        disabled={isSubmittingReenrollment}
                        onClick={handleExecuteCollectiveReenrollment}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-2 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Confirmer et Valider la Réinscription Collective</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* ÉTAPE 5 : RAPPORT FINAL DE RÉINSCRIPTION */}
                {reenrollStep === 5 && reenrollmentReport && (
                  <div className="space-y-4">
                    <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl">
                      <h3 className="text-base font-black text-emerald-950">
                        Réinscription collective terminée : {reenrollmentReport.successCount} validée(s),{' '}
                        {reenrollmentReport.skippedCount} ignorée(s)
                      </h3>
                    </div>

                    <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-64 overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500">
                          <tr>
                            <th className="p-2.5">Matricule</th>
                            <th className="p-2.5">Étudiant</th>
                            <th className="p-2.5">Statut</th>
                            <th className="p-2.5">Détail</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {reenrollmentReport.details.map((d, i) => (
                            <tr key={i}>
                              <td className="p-2.5 font-mono font-bold">{d.matricule}</td>
                              <td className="p-2.5 font-bold">{d.studentName}</td>
                              <td className="p-2.5">
                                <span
                                  className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                                    d.status === 'SUCCESS'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {d.status === 'SUCCESS' ? 'Réinscrit' : 'Ignoré'}
                                </span>
                              </td>
                              <td className="p-2.5 text-slate-600">{d.message}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setActiveView('REPERTOIRE')}
                        className="px-4 py-2 bg-[#17345B] text-white rounded-xl font-bold cursor-pointer"
                      >
                        Retour au Répertoire des étudiants
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          VUE 5 : SUIVI DES CAMPAGNES D'INSCRIPTION (PARTIE VII, SECTIONS 17–18)
         ===================================================================== */}
      {activeView === 'CAMPAIGN_DASHBOARD' && (
        <div className="space-y-5">
          {/* Filtres de campagne */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={campaignYearFilter}
                onChange={(e) => setCampaignYearFilter(e.target.value)}
                className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
              >
                {academicYears.map((ay) => (
                  <option key={ay.id} value={ay.code}>
                    Campagne : {ay.code}
                  </option>
                ))}
              </select>

              <select
                value={campaignFiliereFilter}
                onChange={(e) => setCampaignFiliereFilter(e.target.value)}
                className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
              >
                <option value="ALL">Toutes les Mentions / Filières</option>
                {filieres.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.code} — {f.name}
                  </option>
                ))}
              </select>

              <select
                value={campaignParcoursFilter}
                onChange={(e) => setCampaignParcoursFilter(e.target.value)}
                className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
              >
                <option value="ALL">Tous les Parcours</option>
                {parcours
                  .filter((p) => campaignFiliereFilter === 'ALL' || p.filiereId === campaignFiliereFilter)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} — {p.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimer le bilan
              </button>
            </div>
          </div>

          {/* Section 17 : Les 8 Indicateurs de Campagne */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                1. Effectif attendu
              </span>
              <span className="text-2xl font-black text-[#17345B] mt-1 block">
                {campaignStats.expectedHeadcount}
              </span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                2. Nouveaux inscrits
              </span>
              <span className="text-2xl font-black text-[#2F6FED] mt-1 block">
                {campaignStats.newEnrolledCount}
              </span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                3. Anciens réinscrits
              </span>
              <span className="text-2xl font-black text-indigo-700 mt-1 block">
                {campaignStats.reenrolledCount}
              </span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                4. Inscriptions validées
              </span>
              <span className="text-2xl font-black text-emerald-700 mt-1 block">
                {campaignStats.confirmedCount}
              </span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                5. Inscriptions en attente
              </span>
              <span className="text-2xl font-black text-amber-600 mt-1 block">
                {campaignStats.pendingCount}
              </span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                6. Rejetées / Suspendues
              </span>
              <span className="text-2xl font-black text-rose-600 mt-1 block">
                {campaignStats.rejectedOrSuspendedCount}
              </span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                7. Non encore réinscrits
              </span>
              <span className="text-2xl font-black text-orange-600 mt-1 block">
                {campaignStats.notYetReenrolledCount}
              </span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                8. Taux d’avancement
              </span>
              <span className="text-2xl font-black text-emerald-700 mt-1 block">
                {campaignStats.progressRate}%
              </span>
            </div>
          </div>

          {/* Section 18 : Tableau de suivi par niveau (L1 à M2) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <h3 className="text-sm font-black text-[#17345B] uppercase tracking-wider">
                Suivi détaillé de la campagne par Niveau d’études (L1 à M2)
              </h3>
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500">
                <tr>
                  <th className="p-3">Niveau</th>
                  <th className="p-3">Effectif attendu</th>
                  <th className="p-3">Nouveaux inscrits</th>
                  <th className="p-3">Réinscrits</th>
                  <th className="p-3">Inscriptions validées</th>
                  <th className="p-3">En attente</th>
                  <th className="p-3">Taux de réalisation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {campaignStats.byLevel.map((row) => (
                  <tr key={row.level} className="hover:bg-slate-50">
                    <td className="p-3">
                      <span className="px-2.5 py-1 bg-blue-50 text-[#2F6FED] border border-blue-200 rounded-lg font-black">
                        {row.level}
                      </span>
                    </td>
                    <td className="p-3 font-mono font-bold">{row.expected}</td>
                    <td className="p-3 font-mono text-blue-700 font-bold">{row.newCount}</td>
                    <td className="p-3 font-mono text-indigo-700 font-bold">{row.reCount}</td>
                    <td className="p-3 font-mono text-emerald-700 font-black">{row.validCount}</td>
                    <td className="p-3 font-mono text-amber-700 font-bold">{row.waitCount}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-28 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${row.rate}%` }}
                          />
                        </div>
                        <span className="font-mono font-bold text-slate-700">{row.rate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODALES : DOSSIER ÉTUDIANT UNIQUE, CARTE ÉTUDIANTE & HISTORIQUE
         ===================================================================== */}
      {dossierModalStudent && (
        <StudentProfileForm
          student={dossierModalStudent}
          mode="administration"
          initialEditMode={dossierInitialEdit}
          initialTab={dossierInitialTab}
          showAcademicAndFinanceExtensions={['ADMIN', 'SCOLARITE', 'FINANCE', 'ACADEMIC_HEAD'].includes(
            currentUser.role
          )}
          onClose={() => setDossierModalStudent(null)}
          onOpenCardModal={(st) => {
            setDossierModalStudent(null);
            setCardModalStudent(st);
          }}
        />
      )}

      {cardModalStudent && (
        <StudentCardModal
          student={cardModalStudent}
          onClose={() => setCardModalStudent(null)}
        />
      )}

      {/* Modale d'Historique Académique Multi-Années & Résultats Réels */}
      {historyModalStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[88vh] flex flex-col overflow-hidden">
            <div className="p-5 bg-[#17345B] text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-blue-300 block">
                  Parcours Académique Multi-Années & Traçabilité
                </span>
                <h3 className="text-base font-black">
                  {historyModalStudent.name} — Matricule : {historyModalStudent.matricule}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setHistoryModalStudent(null)}
                className="p-1.5 bg-white/10 hover:bg-white/20 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {(() => {
                const studentEnrollments = inscriptions
                  .filter((i) => i.studentId === historyModalStudent.id)
                  .sort((a, b) => b.academicYear.localeCompare(a.academicYear));

                return (
                  <>
                    <div className="space-y-2">
                      <h4 className="font-black uppercase text-[#17345B]">
                        1. Inscriptions annuelles successives
                      </h4>
                      <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500">
                            <tr>
                              <th className="p-2.5">Année</th>
                              <th className="p-2.5">Mention</th>
                              <th className="p-2.5">Niveau</th>
                              <th className="p-2.5">Groupe</th>
                              <th className="p-2.5">Type / Cas</th>
                              <th className="p-2.5">Moyenne réelle</th>
                              <th className="p-2.5">Statut</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {studentEnrollments.map((insc) => {
                              const fil = filieres.find((f) => f.id === insc.filiereId);
                              const grp = groups.find((g) => g.id === insc.groupId);
                              const avg = getStudentRealAcademicAverage(
                                historyModalStudent.id,
                                insc.academicYear
                              );
                              return (
                                <tr key={insc.id}>
                                  <td className="p-2.5 font-mono font-bold text-[#17345B]">
                                    {insc.academicYear}
                                  </td>
                                  <td className="p-2.5 font-semibold">
                                    {fil ? `${fil.code} — ${fil.name}` : insc.filiereId}
                                  </td>
                                  <td className="p-2.5 font-bold">{insc.level}</td>
                                  <td className="p-2.5 font-mono">
                                    {grp ? grp.code : 'Sans affectation'}
                                  </td>
                                  <td className="p-2.5">
                                    {insc.inscriptionType || 'INSCRIPTION'}
                                    {insc.specialCaseType && insc.specialCaseType !== 'NORMAL'
                                      ? ` (${insc.specialCaseType})`
                                      : ''}
                                  </td>
                                  <td className="p-2.5 font-mono font-bold">
                                    {avg !== null ? `${avg.toFixed(2)} / 20` : 'Non disponible'}
                                  </td>
                                  <td className="p-2.5 font-bold">{insc.status}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-black uppercase text-[#17345B]">
                        2. Journal d’audit des changements d’affectation (Groupe / Parcours / Niveau)
                      </h4>
                      <div className="space-y-1.5">
                        {studentEnrollments
                          .flatMap((i) => i.history || [])
                          .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
                          .map((h) => {
                            const prevG = groups.find((g) => g.id === h.previousGroupId);
                            const nextG = groups.find((g) => g.id === h.newGroupId);
                            return (
                              <div
                                key={h.id}
                                className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between"
                              >
                                <div>
                                  <span className="font-bold text-slate-900">{h.action}</span>
                                  {h.previousGroupId !== undefined &&
                                    h.previousGroupId !== h.newGroupId && (
                                      <span className="text-slate-600 ml-2">
                                        Groupe : {prevG?.code || 'Aucun'} →{' '}
                                        <strong>{nextG?.code || 'Sans affectation'}</strong>
                                      </span>
                                    )}
                                  {h.reason && (
                                    <span className="text-slate-500 ml-2">• Motif : {h.reason}</span>
                                  )}
                                </div>
                                <span className="font-mono text-[10px] text-slate-400">
                                  Par {h.authorName} le {new Date(h.timestamp).toLocaleDateString('fr-FR')}
                                </span>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Modale de changement rapide de groupe (avec historisation) */}
      {groupChangeTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-5 space-y-4 text-xs">
            <h3 className="text-sm font-black text-[#17345B]">
              Modifier l’affectation de groupe — {groupChangeTarget.student.name}
            </h3>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                Nouveau groupe / promotion
              </label>
              <select
                value={groupChangeTarget.newGroupId}
                onChange={(e) =>
                  setGroupChangeTarget({ ...groupChangeTarget, newGroupId: e.target.value })
                }
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold"
              >
                <option value="">Sans affectation immédiate</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.code} — {g.name} ({g.level})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                Motif du changement (enregistré dans l’historique)
              </label>
              <input
                type="text"
                value={groupChangeTarget.reason}
                onChange={(e) =>
                  setGroupChangeTarget({ ...groupChangeTarget, reason: e.target.value })
                }
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setGroupChangeTarget(null)}
                className="px-3.5 py-2 bg-slate-100 rounded-xl font-bold cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetGrp = groups.find((g) => g.id === groupChangeTarget.newGroupId);
                  if (groupChangeTarget.enrollment) {
                    updateEnrollment(
                      groupChangeTarget.enrollment.id,
                      {
                        groupId: groupChangeTarget.newGroupId,
                        level: targetGrp?.level || groupChangeTarget.enrollment.level,
                        filiereId: targetGrp?.filiereId || groupChangeTarget.enrollment.filiereId,
                      },
                      groupChangeTarget.reason
                    );
                  } else {
                    inscribeStudent(
                      groupChangeTarget.student.id,
                      selectedAcademicYear,
                      targetGrp?.filiereId || filieres[0]?.id || 'fil-1',
                      targetGrp?.level || 'L1',
                      groupChangeTarget.newGroupId
                    );
                  }
                  setGroupChangeTarget(null);
                  showAppToast({
                    type: 'success',
                    title: 'Groupe mis à jour',
                    message: 'Le changement de groupe a été enregistré et historisé.',
                  });
                }}
                className="px-4 py-2 bg-[#2F6FED] text-white rounded-xl font-bold cursor-pointer"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale de changement de groupe en lot */}
      {isBulkGroupModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-5 space-y-4 text-xs">
            <h3 className="text-sm font-black text-[#17345B]">
              Affectation de groupe en lot ({selectedStudentIds.size} étudiant(s))
            </h3>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                Groupe cible
              </label>
              <select
                value={bulkTargetGroupId}
                onChange={(e) => setBulkTargetGroupId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold"
              >
                <option value="">Sans affectation immédiate</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.code} — {g.name} ({g.level})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                Motif d’audit
              </label>
              <input
                type="text"
                value={bulkChangeReason}
                onChange={(e) => setBulkChangeReason(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsBulkGroupModalOpen(false)}
                className="px-3.5 py-2 bg-slate-100 rounded-xl font-bold cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleExecuteBulkGroupChange}
                className="px-4 py-2 bg-[#2F6FED] text-white rounded-xl font-bold cursor-pointer"
              >
                Appliquer au lot
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODALE SECTION 4.1, 4.2 & 4.3 : CRÉATION D'UN PROFIL ÉTUDIANT PERMANENT
          SANS INSCRIPTION ACADÉMIQUE OBLIGATOIRE + ANTI-DOUBLONS 3 NIVEAUX
         ===================================================================== */}
      {isStandaloneCreateOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden text-xs">
            <div className="p-5 bg-[#17345B] text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-300 block">
                  EBM Institute • Répertoire Permanent (Sections 4.1 à 4.3)
                </span>
                <h3 className="text-base font-black">
                  Créer un profil étudiant permanent (Sans inscription académique obligatoire)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsStandaloneCreateOpen(false)}
                className="p-1.5 bg-white/10 hover:bg-white/20 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              {standaloneCreatedStudent ? (
                <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />
                    <div>
                      <h4 className="text-base font-black text-emerald-950">
                        Profil étudiant permanent créé dans le répertoire !
                      </h4>
                      <p className="text-emerald-800">
                        <strong>{standaloneCreatedStudent.name}</strong> • Matricule permanent :{' '}
                        <strong className="font-mono">{standaloneCreatedStudent.matricule}</strong> •
                        Statut : <strong>Enregistré dans le répertoire (Non inscrit cette année)</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        const st = standaloneCreatedStudent;
                        setIsStandaloneCreateOpen(false);
                        handleInitNewEnrollment(st);
                        setActiveView('NEW_ENROLLMENT');
                      }}
                      className="px-4 py-2.5 bg-[#2F6FED] hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Procéder maintenant à son inscription académique</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const st = standaloneCreatedStudent;
                        setIsStandaloneCreateOpen(false);
                        setDossierModalStudent(st);
                        setDossierInitialEdit(true);
                        setDossierInitialTab('TAB_1_IDENTITY');
                      }}
                      className="px-4 py-2.5 bg-[#17345B] text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Compléter son dossier administratif complet (7 onglets)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsStandaloneCreateOpen(false)}
                      className="px-4 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl font-bold cursor-pointer"
                    >
                      Fermer (Inscrire plus tard)
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Section 4.1 : Vérification préalable avant création */}
                  <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-3">
                    <label className="block text-[11px] font-black uppercase text-[#17345B]">
                      1. Vérification préalable instantanée avant création (Matricule, Nom, Prénom, CIN, Date de naissance, Email, Téléphone)
                    </label>
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={standalonePreSearch}
                        onChange={(e) => setStandalonePreSearch(e.target.value)}
                        placeholder="Vérifiez d’abord si l’étudiant existe déjà dans la base EBM..."
                        className="w-full pl-10 pr-4 py-2 bg-white border border-blue-300 rounded-xl font-semibold"
                      />
                    </div>

                    {standalonePreSearchResults.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] font-black uppercase text-blue-900 block">
                          Étudiant(s) trouvé(s) dans le répertoire — Actions directes :
                        </span>
                        {standalonePreSearchResults.map((st) => (
                          <div
                            key={st.id}
                            className="p-2.5 bg-white rounded-xl border border-blue-200 flex flex-wrap items-center justify-between gap-2"
                          >
                            <div>
                              <span className="font-mono font-black text-[#17345B] mr-2">
                                {st.matricule}
                              </span>
                              <span className="font-bold text-slate-900">{st.name}</span>
                              <span className="text-slate-500 ml-2">
                                (Né le {st.birthDate || '—'} • CIN : {st.cin || '—'})
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setIsStandaloneCreateOpen(false);
                                  setDossierModalStudent(st);
                                  setDossierInitialEdit(false);
                                }}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[11px] cursor-pointer"
                              >
                                Consulter la fiche
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsStandaloneCreateOpen(false);
                                  setDossierModalStudent(st);
                                  setDossierInitialEdit(true);
                                }}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[11px] cursor-pointer"
                              >
                                Modifier la fiche
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsStandaloneCreateOpen(false);
                                  setHistoryModalStudent(st);
                                }}
                                className="px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-lg font-bold text-[11px] cursor-pointer"
                              >
                                Consulter l’historique
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsStandaloneCreateOpen(false);
                                  handleInitNewEnrollment(st);
                                  setActiveView('NEW_ENROLLMENT');
                                }}
                                className="px-2.5 py-1 bg-[#2F6FED] text-white rounded-lg font-bold text-[11px] cursor-pointer"
                              >
                                Sélectionner pour une inscription
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Section 4.3 : Détection intelligente des doublons à 3 niveaux */}
                  {standaloneDuplicateAnalysis.level1Strict.length > 0 && (
                    <div className="p-4 bg-rose-50 border border-rose-300 rounded-2xl space-y-2">
                      <div className="flex items-center gap-2 text-rose-900 font-black">
                        <XCircle className="w-4 h-4 text-rose-600" />
                        <span>
                          Niveau 1 — Blocage strict : Identifiant unique déjà existant dans la base
                        </span>
                      </div>
                      {standaloneDuplicateAnalysis.level1Strict.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 bg-white rounded-xl border border-rose-200 flex items-center justify-between"
                        >
                          <span>
                            <strong>{item.student.name}</strong> ({item.student.matricule}) —{' '}
                            <span className="text-rose-700 font-semibold">{item.reason}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setIsStandaloneCreateOpen(false);
                              setDossierModalStudent(item.student);
                            }}
                            className="px-3 py-1 bg-rose-700 text-white rounded-lg font-bold text-[11px] cursor-pointer"
                          >
                            Ouvrir le dossier existant
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {standaloneDuplicateAnalysis.level2Strong.length > 0 && (
                    <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl space-y-2">
                      <div className="flex items-center gap-2 text-amber-900 font-black">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span>
                          Niveau 2 — Alerte forte : Même nom + même prénom + même date de naissance
                        </span>
                      </div>
                      {standaloneDuplicateAnalysis.level2Strong.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 bg-white rounded-xl border border-amber-200 flex flex-wrap items-center justify-between gap-2"
                        >
                          <span>
                            <strong>{item.student.name}</strong> ({item.student.matricule}) —{' '}
                            {item.reason}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setIsStandaloneCreateOpen(false);
                              setDossierModalStudent(item.student);
                            }}
                            className="px-3 py-1 bg-[#17345B] text-white rounded-lg font-bold text-[11px] cursor-pointer"
                          >
                            Ouvrir le dossier existant
                          </button>
                        </div>
                      ))}
                      <label className="flex items-center gap-2 pt-1 font-bold text-amber-950 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={standaloneForceHomonym}
                          onChange={(e) => setStandaloneForceHomonym(e.target.checked)}
                          className="rounded text-amber-600"
                        />
                        <span>
                          Confirmer qu’il s’agit d’un homonyme distinct et autoriser la création
                        </span>
                      </label>
                    </div>
                  )}

                  {standaloneDuplicateAnalysis.level3Info.length > 0 && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900">
                      <span className="font-bold">
                        Niveau 3 — Alerte informative (Vérification recommandée) :{' '}
                      </span>
                      {standaloneDuplicateAnalysis.level3Info.map((i) => i.reason).join(' • ')}
                    </div>
                  )}

                  {/* Formulaire de création du profil permanent */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                        Matricule permanent EBM *
                      </label>
                      <input
                        type="text"
                        value={standaloneForm.matricule}
                        onChange={(e) =>
                          setStandaloneForm({
                            ...standaloneForm,
                            matricule: e.target.value.toUpperCase(),
                          })
                        }
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-[#17345B]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                        Civilité / Sexe *
                      </label>
                      <select
                        value={standaloneForm.civilite}
                        onChange={(e) =>
                          setStandaloneForm({
                            ...standaloneForm,
                            civilite: e.target.value as 'M.' | 'Mme' | 'Mlle',
                          })
                        }
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold"
                      >
                        <option value="M.">M. (Masculin)</option>
                        <option value="Mme">Mme (Féminin)</option>
                        <option value="Mlle">Mlle (Féminin)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                        Numéro CIN / Passeport
                      </label>
                      <input
                        type="text"
                        value={standaloneForm.cin}
                        onChange={(e) =>
                          setStandaloneForm({ ...standaloneForm, cin: e.target.value })
                        }
                        placeholder="101 241 012 345"
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                        Nom de famille *
                      </label>
                      <input
                        type="text"
                        value={standaloneForm.lastName}
                        onChange={(e) =>
                          setStandaloneForm({
                            ...standaloneForm,
                            lastName: e.target.value.toUpperCase(),
                          })
                        }
                        placeholder="RAKOTOARISOA"
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold uppercase"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                        Prénom(s) *
                      </label>
                      <input
                        type="text"
                        value={standaloneForm.firstName}
                        onChange={(e) =>
                          setStandaloneForm({ ...standaloneForm, firstName: e.target.value })
                        }
                        placeholder="Miora"
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                        Date de naissance *
                      </label>
                      <input
                        type="date"
                        value={standaloneForm.birthDate}
                        onChange={(e) =>
                          setStandaloneForm({ ...standaloneForm, birthDate: e.target.value })
                        }
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                        Lieu de naissance
                      </label>
                      <input
                        type="text"
                        value={standaloneForm.birthPlace}
                        onChange={(e) =>
                          setStandaloneForm({ ...standaloneForm, birthPlace: e.target.value })
                        }
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                        Téléphone
                      </label>
                      <input
                        type="tel"
                        value={standaloneForm.phone}
                        onChange={(e) =>
                          setStandaloneForm({ ...standaloneForm, phone: e.target.value })
                        }
                        placeholder="+261 34 00 000 00"
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={standaloneForm.email}
                        onChange={(e) =>
                          setStandaloneForm({ ...standaloneForm, email: e.target.value })
                        }
                        placeholder="Auto si vide"
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                    <span className="text-[11px] text-slate-500">
                      Ce profil sera enregistré dans le répertoire sans aucune obligation d’inscription ni de groupe.
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsStandaloneCreateOpen(false)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                      >
                        Annuler
                      </button>
                      <button
                        type="button"
                        disabled={standaloneDuplicateAnalysis.level1Strict.length > 0}
                        onClick={handleSubmitStandaloneStudent}
                        className="px-5 py-2.5 bg-[#17345B] hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl font-bold flex items-center gap-2 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Enregistrer le profil dans le répertoire</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
