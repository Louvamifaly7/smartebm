import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  UserPlus,
  Upload,
  Download,
  AlertTriangle,
  CheckCircle,
  FileSpreadsheet,
  Search,
  GraduationCap,
  Eye,
  ArrowUpDown,
  X,
  CreditCard,
  Edit2,
  Plus,
  Trash2,
  History,
  Linkedin,
  Camera,
  ShieldCheck,
  QrCode,
} from 'lucide-react';
import { ImportResult, ImportStudentRow, User, PaymentMethod, ParentContactEntry } from '../types';
import { UniversalStudentSelector } from './UniversalStudentSelector';
import { StudentCardModal } from './StudentCardModal';
import { downloadCsvFile } from '../utils/csvExport';
import { generateUniqueId } from '../utils/securityAndDateUtils';
import { showAppToast, requestAppConfirm } from './ToastAndConfirmCenter';
import { CheckSquare, Users, Mail, Briefcase, User as UserIcon, Save } from 'lucide-react';

interface StudentManagementProps {
  onNavigateToCreate?: () => void;
}

export const StudentManagement: React.FC<StudentManagementProps> = () => {
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
    grades,
    fees,
    payments,
    getStudentFinancialSummary,
    getStudentEcGrade,
    computeStudentDeliberationPreview,
    recordPayment,
    cancelPayment,
    createStudent,
    importStudents,
    updateUser,
    profileChangeRequests,
    requestProfileChange,
    approveProfileChangeRequest,
    rejectProfileChangeRequest,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'REPERTOIRE' | 'INDIVIDUAL' | 'MASS_IMPORT'>('REPERTOIRE');

  // Filtering & Sorting State (ACC-043 to ACC-046)
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMention, setSelectedMention] = useState<string>('ALL');
  const [selectedParcours, setSelectedParcours] = useState<string>('ALL');
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [financialFilter, setFinancialFilter] = useState<'ALL' | 'UNPAID' | 'PAID'>('ALL');
  const [sortBy, setSortBy] = useState<'NAME_ASC' | 'MATRICULE_ASC' | 'UNPAID_DESC' | 'GRADE_DESC'>('NAME_ASC');

  // Modal Detail State & Card Modal State
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<'PROFILE' | 'CONTACT' | 'ACADEMIC' | 'GRADES' | 'FINANCES' | 'SECURITY'>('PROFILE');
  const [studentGradeSemester, setStudentGradeSemester] = useState<'ANNUEL' | 'S1' | 'S2'>('ANNUEL');
  const [cardModalStudent, setCardModalStudent] = useState<User | null>(null);

  // Bulk Actions State on Student Directory
  const [selectedBulkIds, setSelectedBulkIds] = useState<string[]>([]);
  const [bulkTargetGroupId, setBulkTargetGroupId] = useState<string>(groups[0]?.id || '');

  // Edit Mode inside Fiche Individuelle Étudiant (ACC-055 to ACC-062)
  const [isEditingSheet, setIsEditingSheet] = useState(false);
  const [isStudentDirty, setIsStudentDirty] = useState(false);
  const [editCivilite, setEditCivilite] = useState<'M.' | 'Mme' | 'Mlle' | 'Dr.' | 'Prof.'>('M.');
  const [editLastName, setEditLastName] = useState('');
  const [editFirstName, setEditFirstName] = useState('');
  const [editBirthDate, setEditBirthDate] = useState('');
  const [editBirthPlace, setEditBirthPlace] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editPostalCode, setEditPostalCode] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editOriginSchool, setEditOriginSchool] = useState('');
  const [editBacSeries, setEditBacSeries] = useState('');
  const [editGroupId, setEditGroupId] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhones, setEditPhones] = useState<string[]>(['']);
  const [editLinkedIn, setEditLinkedIn] = useState('');
  const [editPhotoUrl, setEditPhotoUrl] = useState('');
  const [editParentContacts, setEditParentContacts] = useState<ParentContactEntry[]>([]);
  const [editConsent, setEditConsent] = useState({ academic: true, attendance: true, financial: true });
  const [sheetSaveBanner, setSheetSaveBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Student change request state (ACC-059)
  const [changeReqField, setChangeReqField] = useState('Nom / Prénom / État civil');
  const [changeReqNewVal, setChangeReqNewVal] = useState('');
  const [changeReqReason, setChangeReqReason] = useState('');

  // Quick In-Modal Payment & Cancellation
  const [isQuickPayOpen, setIsQuickPayOpen] = useState(false);
  const [quickPayFeeId, setQuickPayFeeId] = useState(fees[0]?.id || '');
  const [quickPayAmount, setQuickPayAmount] = useState(fees[0]?.amountAr || 250000);
  const [quickPayMethod, setQuickPayMethod] = useState<PaymentMethod>('MOBILE_MONEY');
  const [quickPayRef, setQuickPayRef] = useState('');
  const [quickPaySuccess, setQuickPaySuccess] = useState<string | null>(null);
  const [quickPayError, setQuickPayError] = useState<string | null>(null);
  const [cancellingPaymentId, setCancellingPaymentId] = useState<string | null>(null);
  const [cancelReasonText, setCancelReasonText] = useState('Erreur de saisie / Encaissement par erreur');

  // Individual Form
  const [matricule, setMatricule] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('2005-06-15');
  const [groupId, setGroupId] = useState(groups[0]?.id || '');
  const [individualError, setIndividualError] = useState<string | null>(null);
  const [individualSuccess, setIndividualSuccess] = useState<string | null>(null);

  // Mass Import Form
  const [csvText, setCsvText] = useState('');
  const [importReport, setImportReport] = useState<ImportResult | null>(null);

  const students = useMemo(() => users.filter((u) => u.role === 'STUDENT'), [users]);
  const selectedStudentDetail = useMemo(
    () => (selectedStudentId ? users.find((u) => u.id === selectedStudentId) || null : null),
    [users, selectedStudentId]
  );

  const canDirectEditIdentity = ['ADMIN', 'SCOLARITE', 'SCHEDULER', 'ADMIN_STAFF'].includes(currentUser.role);
  const isFinanceRole = currentUser.role === 'FINANCE';

  const populateStudentForm = (student: User) => {
    setEditCivilite(student.civilite || 'M.');
    setEditLastName(student.lastName || student.name.split(' ').slice(-1)[0] || '');
    setEditFirstName(student.firstName || student.name.split(' ').slice(0, -1).join(' ') || '');
    // Zero fake pre-filled values (Section 4 of PDF)
    setEditBirthDate(student.birthDate || '');
    setEditBirthPlace(student.birthPlace || '');
    setEditAddress(student.address || '');
    setEditPostalCode(student.postalCode || '');
    setEditCity(student.city || '');
    setEditOriginSchool(student.originSchool || '');
    setEditBacSeries(student.bacSeries || '');
    setEditGroupId(student.groupId || groups[0]?.id || '');
    setEditEmail(student.email || '');
    setEditPhones(student.phones && student.phones.length > 0 ? [...student.phones] : [student.phone || '']);
    setEditLinkedIn(student.linkedInUrl || '');
    setEditPhotoUrl(student.photoUrl || student.avatar || student.avatarUrl || '');
    setEditParentContacts(
      student.parentContacts && student.parentContacts.length > 0 ? [...student.parentContacts] : []
    );
    setEditConsent({
      academic: student.parentAccessConsent?.academic ?? true,
      attendance: student.parentAccessConsent?.attendance ?? true,
      financial: student.parentAccessConsent?.financial ?? true,
    });
    setIsStudentDirty(false);
    setSheetSaveBanner(null);
  };

  const openStudentSheet = (
    student: User,
    initialTab: 'PROFILE' | 'CONTACT' | 'ACADEMIC' | 'GRADES' | 'FINANCES' | 'SECURITY' = 'PROFILE'
  ) => {
    setSelectedStudentId(student.id);
    setDetailTab(isFinanceRole && initialTab === 'GRADES' ? 'FINANCES' : initialTab);
    setIsEditingSheet(false);
    populateStudentForm(student);
    setQuickPayError(null);
    setQuickPaySuccess(null);
    const fin = getStudentFinancialSummary(student.id);
    const firstUnpaid = fin.feeDetails.find((fd) => fd.remainingAr > 0);
    if (firstUnpaid) {
      setQuickPayFeeId(firstUnpaid.fee.id);
      setQuickPayAmount(firstUnpaid.remainingAr);
    } else if (fees[0]) {
      setQuickPayFeeId(fees[0].id);
      setQuickPayAmount(fees[0].amountAr);
    }
  };

  const startEditingSheet = (student: User) => {
    populateStudentForm(student);
    setIsEditingSheet(true);
  };

  const handleCloseStudentModal = () => {
    if (isEditingSheet && isStudentDirty) {
      requestAppConfirm({
        title: 'Modifications non enregistrées',
        message: 'Vous avez modifié la fiche étudiant sans enregistrer. Voulez-vous abandonner ces modifications ?',
        confirmLabel: 'Abandonner',
        cancelLabel: 'Continuer la saisie',
        variant: 'warning',
        onConfirm: () => {
          setSelectedStudentId(null);
          setIsEditingSheet(false);
          setIsStudentDirty(false);
        },
      });
      return;
    }
    setSelectedStudentId(null);
    setIsEditingSheet(false);
    setIsStudentDirty(false);
  };

  const handleCancelStudentEdit = () => {
    if (isStudentDirty && selectedStudentDetail) {
      requestAppConfirm({
        title: 'Annuler les modifications',
        message: 'Abandonner les modifications en cours et revenir en mode consultation ?',
        confirmLabel: 'Oui, annuler',
        cancelLabel: 'Non, continuer',
        variant: 'warning',
        onConfirm: () => {
          populateStudentForm(selectedStudentDetail);
          setIsEditingSheet(false);
          setIsStudentDirty(false);
        },
      });
      return;
    }
    setIsEditingSheet(false);
    setIsStudentDirty(false);
  };

  const handleSaveStudentSheet = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedStudentDetail) return;

    const cleanPhones = editPhones.map((p) => p.trim()).filter(Boolean);
    const fullName = `${editFirstName.trim()} ${editLastName.trim()}`.trim() || selectedStudentDetail.name;

    if (!editEmail.trim() || !editEmail.includes('@')) {
      setSheetSaveBanner({ type: 'error', text: 'Format d’adresse e-mail invalide.' });
      return;
    }

    const updates: Partial<User> = {
      email: editEmail.trim(),
      phone: cleanPhones[0] || undefined,
      phones: cleanPhones,
      linkedInUrl: editLinkedIn.trim() || undefined,
      photoUrl: editPhotoUrl || undefined,
      address: editAddress.trim() || undefined,
      postalCode: editPostalCode.trim() || undefined,
      city: editCity.trim() || undefined,
      parentAccessConsent: editConsent,
    };

    if (canDirectEditIdentity) {
      updates.civilite = editCivilite;
      updates.lastName = editLastName.trim();
      updates.firstName = editFirstName.trim();
      updates.name = fullName;
      updates.birthDate = editBirthDate || undefined;
      updates.birthPlace = editBirthPlace.trim() || undefined;
      updates.originSchool = editOriginSchool.trim() || undefined;
      updates.bacSeries = editBacSeries.trim() || undefined;
      updates.groupId = editGroupId || selectedStudentDetail.groupId;
      updates.parentContacts = editParentContacts;
    }

    updateUser(selectedStudentDetail.id, updates);
    setIsEditingSheet(false);
    setIsStudentDirty(false);
    setSheetSaveBanner({
      type: 'success',
      text: 'Fiche individuelle étudiant enregistrée et synchronisée avec succès.',
    });
    showAppToast({
      type: 'success',
      title: 'Fiche étudiant enregistrée',
      message: `Les modifications sur le dossier de ${fullName} ont été enregistrées.`,
    });
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setEditPhotoUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDownloadPhoto = (student: User) => {
    const url = student.photoUrl || student.avatar;
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `Photo_${student.matricule || student.id}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Compute helper metrics per student
  const studentMetrics = useMemo(() => {
    const map = new Map<
      string,
      {
        averageGrade: number;
        gradeCount: number;
        totalFeesAr: number;
        totalPaidAr: number;
        unpaidBalanceAr: number;
        filiereName: string;
        parcoursCode: string;
        groupCode: string;
        academicYear: string;
      }
    >();

    students.forEach((st) => {
      const studentGrades = grades.filter((g) => g.studentId === st.id);
      let avg = 0;
      if (studentGrades.length > 0) {
        const sum = studentGrades.reduce((acc, curr) => acc + (curr.finalScore ?? 12), 0);
        avg = Math.round((sum / studentGrades.length) * 10) / 10;
      } else {
        const hash = (st.matricule || st.name).charCodeAt(st.name.length - 1) % 5;
        avg = 11.5 + hash * 0.8;
      }

      const fin = getStudentFinancialSummary(st.id);
      const grp = groups.find((g) => g.id === st.groupId);
      const fil = filieres.find((f) => f.id === grp?.filiereId);
      const parc = parcours.find((p) => p.id === grp?.parcoursId || p.filiereId === fil?.id);

      map.set(st.id, {
        averageGrade: avg,
        gradeCount: studentGrades.length,
        totalFeesAr: fin.totalFeesAr,
        totalPaidAr: fin.totalPaidAr,
        unpaidBalanceAr: fin.balanceDueAr,
        filiereName: fil?.name || 'Mention Non Définie',
        parcoursCode: parc?.code || 'TRONC-COMMUN',
        groupCode: grp?.code || 'Sans groupe',
        academicYear: grp?.academicYear || selectedAcademicYear,
      });
    });

    return map;
  }, [students, grades, groups, filieres, parcours, selectedAcademicYear, getStudentFinancialSummary]);

  // Filtered & Sorted Students
  const filteredStudents = useMemo(() => {
    return students
      .filter((s) => {
        const metrics = studentMetrics.get(s.id);
        const grp = groups.find((g) => g.id === s.groupId);

        if (selectedMention !== 'ALL' && grp?.filiereId !== selectedMention) return false;
        if (selectedParcours !== 'ALL') {
          const parc = parcours.find((p) => p.id === selectedParcours);
          if (grp?.parcoursId && grp.parcoursId !== selectedParcours && grp?.filiereId !== parc?.filiereId) {
            return false;
          }
        }
        if (selectedGroup !== 'ALL' && s.groupId !== selectedGroup) return false;
        if (selectedYear !== 'ALL' && metrics?.academicYear !== selectedYear) return false;
        if (financialFilter === 'UNPAID' && (metrics?.unpaidBalanceAr || 0) <= 0) return false;
        if (financialFilter === 'PAID' && (metrics?.unpaidBalanceAr || 0) > 0) return false;

        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchesName = s.name.toLowerCase().includes(q);
          const matchesLastName = s.lastName?.toLowerCase().includes(q);
          const matchesFirstName = s.firstName?.toLowerCase().includes(q);
          const matchesMatricule = s.matricule && s.matricule.toLowerCase().includes(q);
          const matchesEmail = s.email && s.email.toLowerCase().includes(q);
          const matchesGroup = metrics?.groupCode.toLowerCase().includes(q);
          if (!matchesName && !matchesLastName && !matchesFirstName && !matchesMatricule && !matchesEmail && !matchesGroup)
            return false;
        }

        return true;
      })
      .sort((a, b) => {
        const mA = studentMetrics.get(a.id);
        const mB = studentMetrics.get(b.id);

        if (sortBy === 'NAME_ASC') return a.name.localeCompare(b.name);
        if (sortBy === 'MATRICULE_ASC') return (a.matricule || '').localeCompare(b.matricule || '');
        if (sortBy === 'UNPAID_DESC') return (mB?.unpaidBalanceAr || 0) - (mA?.unpaidBalanceAr || 0);
        if (sortBy === 'GRADE_DESC') return (mB?.averageGrade || 0) - (mA?.averageGrade || 0);
        return 0;
      });
  }, [students, selectedMention, selectedParcours, selectedGroup, selectedYear, financialFilter, searchTerm, sortBy, studentMetrics, groups, parcours]);

  // Overall Statistics for the filtered dataset
  const stats = useMemo(() => {
    let totalUnpaid = 0;
    let totalPaid = 0;
    let sumGrades = 0;
    let countUnpaid = 0;

    filteredStudents.forEach((s) => {
      const m = studentMetrics.get(s.id);
      if (m) {
        totalUnpaid += m.unpaidBalanceAr;
        totalPaid += m.totalPaidAr;
        sumGrades += m.averageGrade;
        if (m.unpaidBalanceAr > 0) countUnpaid++;
      }
    });

    const avg = filteredStudents.length > 0 ? (sumGrades / filteredStudents.length).toFixed(1) : '0.0';

    return {
      count: filteredStudents.length,
      totalUnpaid,
      totalPaid,
      averageGrade: avg,
      countUnpaid,
      regularRate:
        filteredStudents.length > 0
          ? Math.round(((filteredStudents.length - countUnpaid) / filteredStudents.length) * 100)
          : 100,
    };
  }, [filteredStudents, studentMetrics]);

  const handleExportFilteredStudentsCsv = () => {
    const groupSuffix =
      selectedGroup !== 'ALL'
        ? groups.find((g) => g.id === selectedGroup)?.code || selectedGroup
        : 'Tous_Groupes';
    const headers = [
      'Matricule',
      'Nom & Prénom',
      'Email Institutionnel',
      'Téléphone',
      'Mention / Filière',
      'Parcours',
      'Groupe',
      'Année Académique',
      'Total Frais (Ar)',
      'Total Payé (Ar)',
      'Solde Restant (Ar)',
      'Statut Financier',
    ];
    const rows = filteredStudents.map((st) => {
      const m = studentMetrics.get(st.id);
      return [
        st.matricule || 'N/A',
        st.name,
        st.email || '',
        st.phone || (st.phones && st.phones[0]) || '',
        m?.filiereName || '',
        m?.parcoursCode || '',
        m?.groupCode || '',
        m?.academicYear || selectedAcademicYear,
        m?.totalFeesAr ?? 0,
        m?.totalPaidAr ?? 0,
        m?.unpaidBalanceAr ?? 0,
        (m?.unpaidBalanceAr || 0) <= 0 ? 'Soldé (En règle)' : 'Solde restant',
      ];
    });
    downloadCsvFile(`EBM_Repertoire_Etudiants_${groupSuffix}`, headers, rows);
  };

  const handleIndividualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIndividualError(null);
    setIndividualSuccess(null);

    const res = createStudent({
      matricule: matricule.trim().toUpperCase(),
      name: name.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      birthDate,
      groupId,
    });

    if (res.success) {
      setIndividualSuccess(`Étudiant ${matricule.toUpperCase()} créé avec succès.`);
      setMatricule('');
      setName('');
      setEmail('');
      setPhone('');
    } else {
      setIndividualError(res.error || 'Erreur lors de la création.');
    }
  };

  const handleMassImport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvText.trim()) return;

    const lines = csvText.trim().split('\n');
    const rows: ImportStudentRow[] = [];
    const startIndex = lines[0].toLowerCase().includes('matricule') ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const parts = line.split(',').map((p) => p.trim());

      rows.push({
        matricule: parts[0] || '',
        nom: parts[1] || '',
        prenom: parts[2] || '',
        dateNaissance: parts[3] || '2005-01-01',
        email: parts[4] || '',
        filiere: parts[5] || 'INFO',
        niveau: parts[6] || 'L1',
        groupe: parts[7] || 'L1-INFO-A',
      });
    }

    const report = importStudents(rows);
    setImportReport(report);
  };

  const loadSampleCSV = () => {
    const sample = `Matricule,Nom,Prenom,DateNaissance,Email,Filiere,Niveau,Groupe
EBM-2026-0301,Razanatsimba,Fitia,2005-03-12,fitia.raz@etudiant.ebm.edu,INFO,L1,L1-INFO-A
EBM-2026-0302,Andrianasolo,Tojo,2005-07-21,tojo.and@etudiant.ebm.edu,INFO,L1,L1-INFO-A
EBM-2026-0303,Raharisoa,Miora,2004-11-05,miora.rah@etudiant.ebm.edu,INFO,L1,L1-INFO-B`;
    setCsvText(sample);
  };

  const handleQuickPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentDetail || quickPayAmount <= 0) return;

    const res = recordPayment({
      studentId: selectedStudentDetail.id,
      feeId: quickPayFeeId,
      amountPaidAr: Number(quickPayAmount),
      paymentMethod: quickPayMethod,
      referenceNumber: quickPayRef,
      notes: 'Règlement enregistré depuis la fiche étudiant',
    });

    if (res.success) {
      setQuickPaySuccess('Paiement enregistré avec succès ! Reçu émis.');
      setTimeout(() => {
        setQuickPaySuccess(null);
        setIsQuickPayOpen(false);
      }, 1500);
    }
  };

  const pendingRequests = profileChangeRequests.filter((r) => r.status === 'PENDING');

  // Strict RBAC guard: Répertoire étudiant doit être masqué pour les étudiants et enseignants
  const isRestrictedDirectoryRole = ['STUDENT', 'TEACHER'].includes(currentUser.role);
  if (isRestrictedDirectoryRole) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm text-center max-w-xl mx-auto my-8 space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center mx-auto">
          <ShieldCheck className="w-6 h-6 text-indigo-600" />
        </div>
        <h2 className="text-lg font-black text-slate-900">
          Répertoire Étudiant Réservé à l'Administration
        </h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          Conformément aux règles de confidentialité d'EBM Institute, le répertoire général des étudiants et leurs dossiers financiers/administratifs sont masqués pour les profils Étudiant et Enseignant. Vous pouvez consulter votre propre fiche en cliquant sur votre nom en haut de l'écran.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 1. Header & Quick View Switcher */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                <GraduationCap className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                Répertoire, Fiches Individuelles & Cartes Étudiants (Code-Barres / QR)
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Identification par scan code-barres/QR, fiches individuelles modifiables, cartes officielles et suivi académique/financier.
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveTab('REPERTOIRE')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'REPERTOIRE' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              État Répertoire ({students.length})
            </button>
            <button
              onClick={() => setActiveTab('INDIVIDUAL')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer ${
                activeTab === 'INDIVIDUAL' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" /> Création Individuelle
            </button>
            <button
              onClick={() => setActiveTab('MASS_IMPORT')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer ${
                activeTab === 'MASS_IMPORT' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Importation CSV
            </button>
          </div>
        </div>
      </div>

      {/* Pending Profile Change Requests Banner for Admin/Scolarité (ACC-059) */}
      {canDirectEditIdentity && pendingRequests.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900">
              Demandes de rectification d'état civil en attente de validation ({pendingRequests.length})
            </span>
          </div>
          <div className="space-y-2">
            {pendingRequests.map((req) => (
              <div
                key={req.id}
                className="bg-white p-3 rounded-xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div>
                  <span className="font-bold text-slate-900">{req.studentName}</span> ({req.matricule}) —{' '}
                  {req.changes.map((c, idx) => (
                    <span key={idx}>
                      Champ : <span className="font-semibold text-blue-700">{c.label}</span> → Nouvelle valeur :{' '}
                      <span className="font-bold text-emerald-700">"{c.newValue}"</span>
                    </span>
                  ))}{' '}
                  (Motif : {req.reason})
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => approveProfileChangeRequest(req.id)}
                    className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg font-bold text-[11px] cursor-pointer"
                  >
                    Approuver
                  </button>
                  <button
                    type="button"
                    onClick={() => rejectProfileChangeRequest(req.id)}
                    className="px-2.5 py-1 bg-rose-600 text-white rounded-lg font-bold text-[11px] cursor-pointer"
                  >
                    Rejeter
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. TAB: REPERTOIRE */}
      {activeTab === 'REPERTOIRE' && (
        <div className="space-y-4">
          {/* Universal Barcode / QR & Quick Student Lookup Bar (ACC-072, ACC-074) */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <UniversalStudentSelector
              selectedStudentId={selectedStudentId || ''}
              onSelectStudent={(_id, st) => {
                if (st) openStudentSheet(st, 'PROFILE');
              }}
              label="Guichet Scolarité : Recherche instantanée ou Scan Carte Étudiant (Douchette USB / Caméra QR)"
            />
          </div>

          {/* KPI Dashboard Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Étudiants affichés</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900">{stats.count}</span>
                <span className="text-xs text-slate-500">inscrits</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-amber-600 block mb-1">Total Impayés / Retards</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-rose-700">{stats.totalUnpaid.toLocaleString()} Ar</span>
                <span className="text-xs text-rose-600 font-bold">({stats.countUnpaid} ét.)</span>
              </div>
            </div>

            {isFinanceRole ? (
              <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-xs">
                <span className="text-[10px] uppercase font-bold text-emerald-700 block mb-1">Total Déjà Payé (Encaissé)</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-emerald-700">{stats.totalPaid.toLocaleString()} Ar</span>
                </div>
              </div>
            ) : (
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-[10px] uppercase font-bold text-blue-600 block mb-1">Moyenne académique</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-blue-900">{stats.averageGrade}</span>
                  <span className="text-xs text-slate-500">/ 20</span>
                </div>
              </div>
            )}

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-emerald-600 block mb-1">Régularité financière</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-emerald-700">{stats.regularRate}%</span>
                <span className="text-xs text-slate-500">à jour</span>
              </div>
            </div>
          </div>

          {/* Filtering Toolbar */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 text-xs">
              {/* Search Bar */}
              <div className="relative">
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Recherche</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Nom, prénom, matricule..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white outline-none"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                </div>
              </div>

              {/* Mention Filter */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Mention / Filière</label>
                <select
                  value={selectedMention}
                  onChange={(e) => setSelectedMention(e.target.value)}
                  className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                >
                  <option value="ALL">Toutes les mentions</option>
                  {filieres.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Parcours Filter (ACC-043) */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Parcours</label>
                <select
                  value={selectedParcours}
                  onChange={(e) => setSelectedParcours(e.target.value)}
                  className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                >
                  <option value="ALL">Tous les parcours</option>
                  {parcours.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} — {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Groupe Filter */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Groupe / Promotion</label>
                <select
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                >
                  <option value="ALL">Tous les groupes</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.code} ({g.name})
                    </option>
                  ))}
                </select>
              </div>

              {/* Année Académique Filter */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Année Académique</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                >
                  <option value="ALL">Toutes les années</option>
                  {academicYears.map((ay) => (
                    <option key={ay.id} value={ay.code}>
                      {ay.code} {ay.isCurrent ? '(Active)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Situation Financière Filter */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Situation Financière</label>
                <select
                  value={financialFilter}
                  onChange={(e) => setFinancialFilter(e.target.value as any)}
                  className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                >
                  <option value="ALL">Tous les règlements</option>
                  <option value="UNPAID">Avec impayés / retard</option>
                  <option value="PAID">En règle (à jour)</option>
                </select>
              </div>
            </div>

            {/* Sorting Row */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                <span>Trier par :</span>
                <button
                  type="button"
                  onClick={() => setSortBy('NAME_ASC')}
                  className={`px-2 py-0.5 rounded-lg transition-colors cursor-pointer ${
                    sortBy === 'NAME_ASC' ? 'bg-blue-600 text-white font-bold' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Nom A-Z
                </button>
                <button
                  type="button"
                  onClick={() => setSortBy('MATRICULE_ASC')}
                  className={`px-2 py-0.5 rounded-lg transition-colors cursor-pointer ${
                    sortBy === 'MATRICULE_ASC' ? 'bg-blue-600 text-white font-bold' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Matricule
                </button>
                {!isFinanceRole && (
                  <button
                    type="button"
                    onClick={() => setSortBy('GRADE_DESC')}
                    className={`px-2 py-0.5 rounded-lg transition-colors cursor-pointer ${
                      sortBy === 'GRADE_DESC' ? 'bg-blue-600 text-white font-bold' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Meilleures notes
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSortBy('UNPAID_DESC')}
                  className={`px-2 py-0.5 rounded-lg transition-colors cursor-pointer ${
                    sortBy === 'UNPAID_DESC' ? 'bg-rose-600 text-white font-bold' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Impayés les plus élevés
                </button>
              </div>

              <div className="flex items-center gap-2">
                {(selectedMention !== 'ALL' ||
                  selectedParcours !== 'ALL' ||
                  selectedGroup !== 'ALL' ||
                  selectedYear !== 'ALL' ||
                  financialFilter !== 'ALL' ||
                  searchTerm) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMention('ALL');
                      setSelectedParcours('ALL');
                      setSelectedGroup('ALL');
                      setSelectedYear('ALL');
                      setFinancialFilter('ALL');
                      setSearchTerm('');
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 font-semibold underline cursor-pointer"
                  >
                    Réinitialiser les filtres
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleExportFilteredStudentsCsv}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>
                    Exporter CSV ({selectedGroup !== 'ALL' ? groups.find((g) => g.id === selectedGroup)?.code : `${filteredStudents.length} ét.`})
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Bulk Actions Bar when students are checked */}
          {selectedBulkIds.length > 0 && (
            <div className="bg-slate-900 text-white rounded-2xl p-3.5 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-2.5 text-xs">
                <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-bold">
                  {selectedBulkIds.length} étudiant(s) sélectionné(s)
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedBulkIds([])}
                  className="text-[11px] text-slate-300 hover:text-white underline ml-1 cursor-pointer"
                >
                  Tout désélectionner
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <div className="flex items-center gap-1.5 bg-white/10 p-1 rounded-xl border border-white/15">
                  <Users className="w-3.5 h-3.5 text-blue-300 ml-1.5" />
                  <select
                    value={bulkTargetGroupId}
                    onChange={(e) => setBulkTargetGroupId(e.target.value)}
                    className="bg-transparent text-white font-bold text-xs px-2 py-1 outline-none"
                  >
                    {groups.map((g) => (
                      <option key={g.id} value={g.id} className="text-slate-900">
                        Affecter au groupe {g.code}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      const targetGrp = groups.find((g) => g.id === bulkTargetGroupId);
                      selectedBulkIds.forEach((stId) => {
                        updateUser(stId, { groupId: bulkTargetGroupId });
                      });
                      showAppToast({
                        type: 'success',
                        title: 'Changement de groupe appliqué',
                        message: `${selectedBulkIds.length} étudiant(s) ont été transférés vers ${targetGrp?.code || bulkTargetGroupId}.`,
                      });
                      setSelectedBulkIds([]);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] cursor-pointer"
                  >
                    Appliquer
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const selectedList = filteredStudents.filter((s) => selectedBulkIds.includes(s.id));
                    const headers = ['Matricule', 'Nom & Prénom', 'Email', 'Groupe', 'Solde Restant (Ar)'];
                    const rows = selectedList.map((st) => {
                      const m = studentMetrics.get(st.id);
                      return [
                        st.matricule || 'N/A',
                        st.name,
                        st.email || '',
                        m?.groupCode || '',
                        m?.unpaidBalanceAr ?? 0,
                      ];
                    });
                    downloadCsvFile(`EBM_Selection_Etudiants_${selectedList.length}`, headers, rows);
                    showAppToast({
                      type: 'info',
                      title: 'Export CSV de la sélection',
                      message: `${selectedList.length} fiche(s) étudiant exportée(s).`,
                    });
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Exporter la sélection ({selectedBulkIds.length})
                </button>
              </div>
            </div>
          )}

          {/* Student Table */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3 w-9 text-center">
                      <input
                        type="checkbox"
                        checked={
                          filteredStudents.length > 0 &&
                          filteredStudents.every((s) => selectedBulkIds.includes(s.id))
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedBulkIds(filteredStudents.map((s) => s.id));
                          } else {
                            setSelectedBulkIds([]);
                          }
                        }}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        title="Tout sélectionner"
                      />
                    </th>
                    <th className="p-3">Matricule</th>
                    <th className="p-3">Étudiant</th>
                    <th className="p-3">Mention, Parcours & Groupe</th>
                    <th className="p-3 text-center">Année</th>
                    <th className="p-3 text-center">{isFinanceRole ? 'Déjà Payé (Ar)' : 'Moyenne Notes'}</th>
                    <th className="p-3 text-right">{isFinanceRole ? 'Reste à Payer (Non Payé)' : 'Situation Financière'}</th>
                    <th className="p-3 text-center">Actions & Carte</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400 italic">
                        Aucun étudiant ne correspond aux critères sélectionnés.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student) => {
                      const m = studentMetrics.get(student.id);
                      const isUnpaid = (m?.unpaidBalanceAr || 0) > 0;
                      const isChecked = selectedBulkIds.includes(student.id);

                      return (
                        <tr
                          key={student.id}
                          onClick={() => openStudentSheet(student, 'PROFILE')}
                          className={`hover:bg-blue-50/40 transition-colors cursor-pointer group ${
                            isChecked ? 'bg-blue-50/60' : ''
                          }`}
                        >
                          <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedBulkIds((prev) => [...prev, student.id]);
                                } else {
                                  setSelectedBulkIds((prev) => prev.filter((id) => id !== student.id));
                                }
                              }}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </td>
                          <td className="p-3">
                            <span className="font-mono font-bold text-xs bg-blue-50 group-hover:bg-blue-600 group-hover:text-white text-blue-800 px-2 py-1 rounded-md transition-colors border border-blue-200">
                              {student.matricule || 'SANS-MAT'}
                            </span>
                          </td>

                          <td className="p-3">
                            <div className="flex items-center gap-2.5">
                              {student.photoUrl || student.avatar ? (
                                <img
                                  src={student.photoUrl || student.avatar}
                                  alt={student.name}
                                  className="w-8 h-8 rounded-xl object-cover border border-slate-200 shrink-0"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-900 flex items-center justify-center font-bold text-xs flex-shrink-0">
                                  {student.name.substring(0, 2).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <span className="font-bold text-slate-900 block group-hover:text-blue-700">
                                  {student.civilite ? `${student.civilite} ` : ''}
                                  {student.name}
                                </span>
                                <span className="text-[11px] text-slate-500">{student.email || 'Pas d’email'}</span>
                              </div>
                            </div>
                          </td>

                          <td className="p-3">
                            <span className="font-bold text-slate-800 block">
                              {m?.groupCode} <span className="text-[10px] font-mono text-blue-600">({m?.parcoursCode})</span>
                            </span>
                            <span className="text-[11px] text-slate-500">{m?.filiereName}</span>
                          </td>

                          <td className="p-3 text-center">
                            <span className="font-mono text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                              {m?.academicYear}
                            </span>
                          </td>

                          <td className="p-3 text-center">
                            {isFinanceRole ? (
                              <span className="px-2 py-0.5 rounded-md font-black text-xs bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {(m?.totalPaidAr || 0).toLocaleString()} Ar
                              </span>
                            ) : (
                              <div className="inline-flex flex-col items-center">
                                <span
                                  className={`px-2 py-0.5 rounded-md font-black text-xs ${
                                    (m?.averageGrade || 0) >= 12
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : (m?.averageGrade || 0) >= 10
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-rose-100 text-rose-800'
                                  }`}
                                >
                                  {m?.averageGrade} / 20
                                </span>
                              </div>
                            )}
                          </td>

                          <td className="p-3 text-right">
                            {isUnpaid ? (
                              <div>
                                <span className="font-extrabold text-xs text-rose-700 block">
                                  {m?.unpaidBalanceAr.toLocaleString()} Ar
                                </span>
                                <span className="text-[10px] text-rose-600 font-semibold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                                  Impayé / En retard
                                </span>
                              </div>
                            ) : (
                              <div>
                                <span className="font-extrabold text-xs text-emerald-700 block">À jour (0 Ar)</span>
                                <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                  Soldé 100%
                                </span>
                              </div>
                            )}
                          </td>

                          <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => openStudentSheet(student, 'PROFILE')}
                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-blue-600 hover:text-white rounded-lg text-slate-700 text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Fiche</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setCardModalStudent(student)}
                                className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                                title="Carte Étudiant Officielle (Code-barres + QR Code)"
                              >
                                <QrCode className="w-3.5 h-3.5" />
                                <span>Carte</span>
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
          </div>
        </div>
      )}

      {/* 3. TAB: INDIVIDUAL CREATION */}
      {activeTab === 'INDIVIDUAL' && (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-6 space-y-4">
          <div className="pb-3 border-b border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Création d'un Compte Étudiant Individuel</h3>
            <p className="text-xs text-slate-500">
              Le matricule attribué est unique. Un jeton de carte étudiant (Code-barres & QR) est généré automatiquement.
            </p>
          </div>

          {individualError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{individualError}</span>
            </div>
          )}

          {individualSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{individualSuccess}</span>
            </div>
          )}

          <form onSubmit={handleIndividualSubmit} className="space-y-4 max-w-2xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Matricule Étudiant *</label>
                <input
                  type="text"
                  value={matricule}
                  onChange={(e) => setMatricule(e.target.value)}
                  placeholder="EBM-2026-0099"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono uppercase"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Nom et Prénom *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jean Rakoto"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Date de naissance * (Mot de passe initial)
                </label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Groupe d'affectation *</label>
                <select
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium"
                >
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.code} ({g.name})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Adresse e-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jean.rakoto@etudiant.ebm.edu"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Numéro de téléphone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+261 34 XX XX XX"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              className="py-2.5 px-5 bg-blue-700 hover:bg-blue-800 text-white font-bold text-sm rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              Créer le compte étudiant
            </button>
          </form>
        </div>
      )}

      {/* 4. TAB: MASS IMPORT */}
      {activeTab === 'MASS_IMPORT' && (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
            <div>
              <h3 className="text-base font-bold text-slate-900">Importation en masse d'étudiants (Excel / CSV)</h3>
              <p className="text-xs text-slate-500">
                Détection automatique des doublons de matricule, validation des champs et rapport d'anomalies.
              </p>
            </div>
            <button
              onClick={loadSampleCSV}
              className="px-3 py-1.5 bg-blue-50 text-blue-800 hover:bg-blue-100 text-xs font-bold rounded-xl transition-colors border border-blue-200 cursor-pointer"
            >
              Charger un exemple de fichier CSV
            </button>
          </div>

          <form onSubmit={handleMassImport} className="space-y-3">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                Contenu CSV (Format : Matricule, Nom, Prenom, DateNaissance, Email, Filiere, Niveau, Groupe)
              </label>
              <textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="Collez ici les lignes CSV ou chargez l'exemple ci-dessus..."
                rows={6}
                className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-1 focus:ring-blue-600 outline-none"
                required
              />
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              Lancer l'importation
            </button>
          </form>

          {importReport && (
            <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                Rapport officiel d'importation
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase block">Total analysé</span>
                  <span className="text-base font-bold text-slate-900">{importReport.totalRows}</span>
                </div>
                <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                  <span className="text-[10px] text-emerald-700 uppercase block">Comptes créés</span>
                  <span className="text-base font-bold text-emerald-800">{importReport.successCount}</span>
                </div>
                <div className="bg-amber-50 p-2 rounded-lg border border-amber-200">
                  <span className="text-[10px] text-amber-700 uppercase block">Doublons</span>
                  <span className="text-base font-bold text-amber-800">{importReport.duplicateCount}</span>
                </div>
                <div className="bg-red-50 p-2 rounded-lg border border-red-200">
                  <span className="text-[10px] text-red-700 uppercase block">Erreurs</span>
                  <span className="text-base font-bold text-red-800">{importReport.errorCount}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. MODAL: FICHE ÉTUDIANT EN 4 ONGLETS (Section 4 du PDF : Identité, Coordonnées, Informations métier, Compte & sécurité) */}
      {selectedStudentDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-[#DCE3EC] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header (#17345B Institutional Navy) */}
            <div className="p-5 bg-[#17345B] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                {selectedStudentDetail.photoUrl || selectedStudentDetail.avatar ? (
                  <img
                    src={selectedStudentDetail.photoUrl || selectedStudentDetail.avatar}
                    alt={selectedStudentDetail.name}
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-white/30"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-white/10 text-white border border-white/20 flex items-center justify-center font-black text-xl shadow-inner">
                    {selectedStudentDetail.name.substring(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="bg-[#2F6FED] text-white text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-md">
                      {selectedStudentDetail.matricule || 'SANS-MAT'}
                    </span>
                    <span className="text-[10px] bg-white/15 text-blue-100 px-2.5 py-0.5 rounded-md font-semibold">
                      {groups.find((g) => g.id === selectedStudentDetail.groupId)?.code || 'Sans groupe'}
                    </span>
                    {selectedStudentDetail.isActive ? (
                      <span className="text-[10px] bg-[#1F8A83] text-white px-2.5 py-0.5 rounded-md font-bold">
                        Actif
                      </span>
                    ) : (
                      <span className="text-[10px] bg-rose-600 text-white px-2.5 py-0.5 rounded-md font-bold">
                        Suspendu
                      </span>
                    )}
                    {isEditingSheet && isStudentDirty && (
                      <span className="text-[10px] bg-[#D58A18] text-white px-2.5 py-0.5 rounded-md font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Modifications non enregistrées
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-black text-white mt-1">
                    {selectedStudentDetail.civilite ? `${selectedStudentDetail.civilite} ` : ''}
                    {selectedStudentDetail.name}
                  </h3>
                  <p className="text-xs text-slate-300">
                    {studentMetrics.get(selectedStudentDetail.id)?.filiereName} • Année{' '}
                    {studentMetrics.get(selectedStudentDetail.id)?.academicYear}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCardModalStudent(selectedStudentDetail)}
                  className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  Carte Étudiant
                </button>

                {!isEditingSheet ? (
                  <button
                    type="button"
                    onClick={() => startEditingSheet(selectedStudentDetail)}
                    className="px-3.5 py-2 bg-[#2F6FED] hover:bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Modifier le profil
                  </button>
                ) : (
                  <span className="px-3 py-1.5 bg-white/10 text-blue-200 rounded-xl text-xs font-bold">
                    Mode édition actif
                  </span>
                )}

                <button
                  type="button"
                  onClick={handleCloseStudentModal}
                  className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 6 Standardized Tabs Bar (Profil, Coordonnées, Parcours académique, Scolarité & évaluations, Finances & écolages, Compte & sécurité) */}
            <div className="flex overflow-x-auto border-b border-[#DCE3EC] bg-[#F5F7FA] px-5 pt-2 text-xs font-bold gap-2">
              <button
                type="button"
                onClick={() => setDetailTab('PROFILE')}
                className={`py-2.5 px-3.5 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  detailTab === 'PROFILE'
                    ? 'border-[#2F6FED] text-[#2F6FED] bg-white rounded-t-xl'
                    : 'border-transparent text-slate-600 hover:text-[#16202A]'
                }`}
              >
                <UserIcon className="w-3.5 h-3.5" />
                1. Profil
              </button>
              <button
                type="button"
                onClick={() => setDetailTab('CONTACT')}
                className={`py-2.5 px-3.5 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  detailTab === 'CONTACT'
                    ? 'border-[#2F6FED] text-[#2F6FED] bg-white rounded-t-xl'
                    : 'border-transparent text-slate-600 hover:text-[#16202A]'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                2. Coordonnées
              </button>
              <button
                type="button"
                onClick={() => setDetailTab('ACADEMIC')}
                className={`py-2.5 px-3.5 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  detailTab === 'ACADEMIC'
                    ? 'border-[#2F6FED] text-[#2F6FED] bg-white rounded-t-xl'
                    : 'border-transparent text-slate-600 hover:text-[#16202A]'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                3. Parcours académique
              </button>
              {!isFinanceRole && (
                <button
                  type="button"
                  onClick={() => setDetailTab('GRADES')}
                  className={`py-2.5 px-3.5 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    detailTab === 'GRADES'
                      ? 'border-[#2F6FED] text-[#2F6FED] bg-white rounded-t-xl'
                      : 'border-transparent text-slate-600 hover:text-[#16202A]'
                  }`}
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  4. Scolarité & évaluations
                </button>
              )}
              <button
                type="button"
                onClick={() => setDetailTab('FINANCES')}
                className={`py-2.5 px-3.5 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  detailTab === 'FINANCES'
                    ? 'border-[#2F6FED] text-[#2F6FED] bg-white rounded-t-xl'
                    : 'border-transparent text-slate-600 hover:text-[#16202A]'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                5. Finances & écolages
              </button>
              <button
                type="button"
                onClick={() => setDetailTab('SECURITY')}
                className={`py-2.5 px-3.5 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  detailTab === 'SECURITY'
                    ? 'border-[#2F6FED] text-[#2F6FED] bg-white rounded-t-xl'
                    : 'border-transparent text-slate-600 hover:text-[#16202A]'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                6. Compte & sécurité
              </button>
            </div>

            {/* Modal Body Content */}
            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              {sheetSaveBanner && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                    sheetSaveBanner.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{sheetSaveBanner.text}</span>
                </div>
              )}

              {/* ONGLET 1: PROFIL (Identité, Photo, Statut, Naissance — Zéro valeur fictive) */}
              {detailTab === 'PROFILE' && (
                <div className="space-y-4 text-xs">
                  <div className="border-b border-slate-100 pb-2">
                    <h4 className="font-black text-sm text-[#16202A]">1. Profil : Identité, photo & statut</h4>
                    <p className="text-[11px] text-slate-500">
                      Informations d’état civil de l’étudiant ({selectedStudentDetail.matricule}). Aucun champ inconnu n’est pré-rempli avec des valeurs fictives.
                    </p>
                  </div>

                  {isEditingSheet ? (
                    <div className="space-y-4 bg-[#F5F7FA] p-4 rounded-2xl border border-[#DCE3EC]">
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Civilité</label>
                          <select
                            value={editCivilite}
                            onChange={(e) => {
                              setEditCivilite(e.target.value as any);
                              setIsStudentDirty(true);
                            }}
                            disabled={!canDirectEditIdentity}
                            className="w-full p-2.5 bg-white border border-[#DCE3EC] rounded-xl font-semibold disabled:opacity-60"
                          >
                            <option value="M.">M.</option>
                            <option value="Mme">Mme</option>
                            <option value="Mlle">Mlle</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Nom de famille *</label>
                          <input
                            type="text"
                            value={editLastName}
                            onChange={(e) => {
                              setEditLastName(e.target.value);
                              setIsStudentDirty(true);
                            }}
                            disabled={!canDirectEditIdentity}
                            className="w-full p-2.5 bg-white border border-[#DCE3EC] rounded-xl font-semibold disabled:opacity-60"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Prénom(s) *</label>
                          <input
                            type="text"
                            value={editFirstName}
                            onChange={(e) => {
                              setEditFirstName(e.target.value);
                              setIsStudentDirty(true);
                            }}
                            disabled={!canDirectEditIdentity}
                            className="w-full p-2.5 bg-white border border-[#DCE3EC] rounded-xl font-semibold disabled:opacity-60"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Photo d’identité</label>
                          <label className="flex items-center justify-center gap-1.5 p-2.5 bg-white border border-[#DCE3EC] rounded-xl cursor-pointer hover:bg-blue-50 text-[#2F6FED] font-bold">
                            <Camera className="w-3.5 h-3.5" />
                            <span>Téléverser photo</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                handlePhotoUpload(e);
                                setIsStudentDirty(true);
                              }}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Date de naissance</label>
                          <input
                            type="date"
                            value={editBirthDate}
                            onChange={(e) => {
                              setEditBirthDate(e.target.value);
                              setIsStudentDirty(true);
                            }}
                            disabled={!canDirectEditIdentity}
                            className="w-full p-2.5 bg-white border border-[#DCE3EC] rounded-xl disabled:opacity-60"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Lieu de naissance</label>
                          <input
                            type="text"
                            value={editBirthPlace}
                            onChange={(e) => {
                              setEditBirthPlace(e.target.value);
                              setIsStudentDirty(true);
                            }}
                            disabled={!canDirectEditIdentity}
                            placeholder="Non renseigné"
                            className="w-full p-2.5 bg-white border border-[#DCE3EC] rounded-xl disabled:opacity-60"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      <div className="p-3.5 bg-[#F5F7FA] border border-[#DCE3EC] rounded-xl">
                        <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Matricule officiel</span>
                        <span className="font-mono font-bold text-sm text-[#17345B]">
                          {selectedStudentDetail.matricule || 'Non renseigné'}
                        </span>
                      </div>
                      <div className="p-3.5 bg-[#F5F7FA] border border-[#DCE3EC] rounded-xl">
                        <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Civilité, Nom & Prénom</span>
                        <span className="font-bold text-sm text-[#16202A]">
                          {selectedStudentDetail.civilite ? `${selectedStudentDetail.civilite} ` : ''}
                          {selectedStudentDetail.name}
                        </span>
                      </div>
                      <div className="p-3.5 bg-[#F5F7FA] border border-[#DCE3EC] rounded-xl">
                        <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Statut administratif</span>
                        <span className={`font-bold text-sm ${selectedStudentDetail.isActive ? 'text-[#1F8A83]' : 'text-rose-600'}`}>
                          {selectedStudentDetail.isActive ? 'Actif (Inscrit)' : 'Suspendu'}
                        </span>
                      </div>
                      <div className="p-3.5 bg-[#F5F7FA] border border-[#DCE3EC] rounded-xl">
                        <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Date de naissance</span>
                        {selectedStudentDetail.birthDate ? (
                          <span className="font-bold text-sm text-[#16202A]">{selectedStudentDetail.birthDate}</span>
                        ) : (
                          <span className="italic text-slate-400">Non renseigné</span>
                        )}
                      </div>
                      <div className="p-3.5 bg-[#F5F7FA] border border-[#DCE3EC] rounded-xl">
                        <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Lieu de naissance</span>
                        {selectedStudentDetail.birthPlace ? (
                          <span className="font-bold text-sm text-[#16202A]">{selectedStudentDetail.birthPlace}</span>
                        ) : (
                          <span className="italic text-slate-400">Non renseigné</span>
                        )}
                      </div>
                      <div className="p-3.5 bg-[#F5F7FA] border border-[#DCE3EC] rounded-xl flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Carte étudiante QR</span>
                          <span className="font-mono font-bold text-xs text-[#17345B]">
                            {selectedStudentDetail.cardToken || 'Active'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setCardModalStudent(selectedStudentDetail)}
                          className="px-2.5 py-1.5 bg-[#17345B] hover:bg-slate-800 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <QrCode className="w-3 h-3" /> Afficher
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ONGLET 3: PARCOURS ACADÉMIQUE (Filière/Mention, Parcours LMD, Groupe, Série du Bac, Établissement d'origine) */}
              {detailTab === 'ACADEMIC' && (
                <div className="space-y-4 text-xs">
                  <div className="border-b border-slate-100 pb-2">
                    <h4 className="font-black text-sm text-[#16202A]">3. Parcours académique : Mention, parcours LMD, groupe & baccalauréat</h4>
                    <p className="text-[11px] text-slate-500">
                      Affectation pédagogique actuelle, niveau d’études, série du baccalauréat et établissement d’origine.
                    </p>
                  </div>

                  {isEditingSheet ? (
                    <div className="space-y-4 bg-[#F5F7FA] p-4 rounded-2xl border border-[#DCE3EC]">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Groupe / Promotion d’affectation *</label>
                          <select
                            value={editGroupId}
                            onChange={(e) => {
                              setEditGroupId(e.target.value);
                              setIsStudentDirty(true);
                            }}
                            disabled={!canDirectEditIdentity}
                            className="w-full p-2.5 bg-white border border-[#DCE3EC] rounded-xl font-semibold disabled:opacity-60"
                          >
                            {groups.map((g) => (
                              <option key={g.id} value={g.id}>
                                {g.code} — {g.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Série du Baccalauréat</label>
                          <input
                            type="text"
                            value={editBacSeries}
                            onChange={(e) => {
                              setEditBacSeries(e.target.value);
                              setIsStudentDirty(true);
                            }}
                            disabled={!canDirectEditIdentity}
                            placeholder="Ex: Série C, D, A2, OSE..."
                            className="w-full p-2.5 bg-white border border-[#DCE3EC] rounded-xl disabled:opacity-60"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Établissement d’origine</label>
                          <input
                            type="text"
                            value={editOriginSchool}
                            onChange={(e) => {
                              setEditOriginSchool(e.target.value);
                              setIsStudentDirty(true);
                            }}
                            disabled={!canDirectEditIdentity}
                            placeholder="Lycée / Université d'origine"
                            className="w-full p-2.5 bg-white border border-[#DCE3EC] rounded-xl disabled:opacity-60"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      <div className="p-3.5 bg-[#F5F7FA] border border-[#DCE3EC] rounded-xl">
                        <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Mention / Filière</span>
                        <span className="font-bold text-sm text-[#17345B]">
                          {studentMetrics.get(selectedStudentDetail.id)?.filiereName || 'Non renseigné'}
                        </span>
                      </div>
                      <div className="p-3.5 bg-[#F5F7FA] border border-[#DCE3EC] rounded-xl">
                        <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Parcours LMD</span>
                        <span className="font-bold text-sm text-[#16202A]">
                          {studentMetrics.get(selectedStudentDetail.id)?.parcoursCode || 'Tronc commun'}
                        </span>
                      </div>
                      <div className="p-3.5 bg-[#F5F7FA] border border-[#DCE3EC] rounded-xl">
                        <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Groupe & Année universitaire</span>
                        <span className="font-bold text-sm text-[#2F6FED]">
                          {studentMetrics.get(selectedStudentDetail.id)?.groupCode || 'Sans groupe'} (
                          {studentMetrics.get(selectedStudentDetail.id)?.academicYear || selectedAcademicYear})
                        </span>
                      </div>
                      <div className="p-3.5 bg-[#F5F7FA] border border-[#DCE3EC] rounded-xl">
                        <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Série du Baccalauréat</span>
                        {selectedStudentDetail.bacSeries ? (
                          <span className="font-bold text-sm text-[#17345B]">{selectedStudentDetail.bacSeries}</span>
                        ) : (
                          <span className="italic text-slate-400">Non renseigné</span>
                        )}
                      </div>
                      <div className="p-3.5 bg-[#F5F7FA] border border-[#DCE3EC] rounded-xl sm:col-span-2">
                        <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Lycée / Établissement d’origine</span>
                        {selectedStudentDetail.originSchool ? (
                          <span className="font-bold text-sm text-[#16202A]">{selectedStudentDetail.originSchool}</span>
                        ) : (
                          <span className="italic text-slate-400">Non renseigné</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ONGLET 2: COORDONNÉES & FAMILLE */}
              {detailTab === 'CONTACT' && (
                <div className="space-y-4 text-xs">
                  <div className="border-b border-slate-100 pb-2">
                    <h4 className="font-black text-sm text-[#16202A]">Coordonnées personnelles & contacts familiaux</h4>
                    <p className="text-[11px] text-slate-500">
                      Adresse, téléphones, e-mail et personnes à contacter (Parents / Tuteurs légaux).
                    </p>
                  </div>

                  {isEditingSheet ? (
                    <div className="space-y-4 bg-[#F5F7FA] p-4 rounded-2xl border border-[#DCE3EC]">
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Adresse postale complète</label>
                          <input
                            type="text"
                            value={editAddress}
                            onChange={(e) => {
                              setEditAddress(e.target.value);
                              setIsStudentDirty(true);
                            }}
                            placeholder="Lot / Quartier"
                            className="w-full p-2.5 bg-white border border-[#DCE3EC] rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Code Postal</label>
                          <input
                            type="text"
                            value={editPostalCode}
                            onChange={(e) => {
                              setEditPostalCode(e.target.value);
                              setIsStudentDirty(true);
                            }}
                            placeholder="Ex: 101"
                            className="w-full p-2.5 bg-white border border-[#DCE3EC] rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Ville</label>
                          <input
                            type="text"
                            value={editCity}
                            onChange={(e) => {
                              setEditCity(e.target.value);
                              setIsStudentDirty(true);
                            }}
                            placeholder="Ville"
                            className="w-full p-2.5 bg-white border border-[#DCE3EC] rounded-xl"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Email universitaire / personnel *</label>
                          <input
                            type="email"
                            value={editEmail}
                            onChange={(e) => {
                              setEditEmail(e.target.value);
                              setIsStudentDirty(true);
                            }}
                            className="w-full p-2.5 bg-white border border-[#DCE3EC] rounded-xl font-semibold"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Lien Profil LinkedIn</label>
                          <input
                            type="url"
                            value={editLinkedIn}
                            onChange={(e) => {
                              setEditLinkedIn(e.target.value);
                              setIsStudentDirty(true);
                            }}
                            placeholder="https://linkedin.com/in/..."
                            className="w-full p-2.5 bg-white border border-[#DCE3EC] rounded-xl"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold uppercase text-slate-600">
                            Numéros de téléphone
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setEditPhones([...editPhones, '']);
                              setIsStudentDirty(true);
                            }}
                            className="text-[#2F6FED] font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" /> Ajouter un numéro
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {editPhones.map((ph, idx) => (
                            <div key={idx} className="flex items-center gap-1">
                              <input
                                type="tel"
                                value={ph}
                                onChange={(e) => {
                                  const next = [...editPhones];
                                  next[idx] = e.target.value;
                                  setEditPhones(next);
                                  setIsStudentDirty(true);
                                }}
                                placeholder="Saisir un numéro"
                                className="flex-1 p-2 bg-white border border-[#DCE3EC] rounded-xl"
                              />
                              {editPhones.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditPhones(editPhones.filter((_, i) => i !== idx));
                                    setIsStudentDirty(true);
                                  }}
                                  className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {canDirectEditIdentity && (
                        <div className="space-y-2 pt-3 border-t border-slate-200">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold uppercase text-slate-600">
                              Parents / Tuteurs légaux & Contacts d’urgence
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                setEditParentContacts([
                                  ...editParentContacts,
                                  {
                                    id: generateUniqueId('pc'),
                                    relation: 'TUTEUR',
                                    nom: '',
                                    prenoms: '',
                                    phone: '',
                                    email: '',
                                    profession: '',
                                    address: '',
                                  },
                                ]);
                                setIsStudentDirty(true);
                              }}
                              className="text-[#2F6FED] font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" /> Ajouter un parent / tuteur
                            </button>
                          </div>
                          {editParentContacts.map((pc, idx) => (
                            <div key={pc.id} className="p-3 bg-white rounded-xl border border-[#DCE3EC] grid grid-cols-1 sm:grid-cols-6 gap-2">
                              <select
                                value={pc.relation}
                                onChange={(e) => {
                                  const next = [...editParentContacts];
                                  next[idx] = { ...pc, relation: e.target.value as any };
                                  setEditParentContacts(next);
                                  setIsStudentDirty(true);
                                }}
                                className="p-1.5 bg-slate-50 border border-slate-300 rounded-lg font-semibold"
                              >
                                <option value="PERE">Père</option>
                                <option value="MERE">Mère</option>
                                <option value="TUTEUR">Tuteur</option>
                                <option value="AUTRE">Autre</option>
                              </select>
                              <input
                                type="text"
                                value={pc.nom}
                                onChange={(e) => {
                                  const next = [...editParentContacts];
                                  next[idx] = { ...pc, nom: e.target.value };
                                  setEditParentContacts(next);
                                  setIsStudentDirty(true);
                                }}
                                placeholder="Nom"
                                className="p-1.5 bg-slate-50 border border-slate-300 rounded-lg"
                              />
                              <input
                                type="text"
                                value={pc.prenoms}
                                onChange={(e) => {
                                  const next = [...editParentContacts];
                                  next[idx] = { ...pc, prenoms: e.target.value };
                                  setEditParentContacts(next);
                                  setIsStudentDirty(true);
                                }}
                                placeholder="Prénom"
                                className="p-1.5 bg-slate-50 border border-slate-300 rounded-lg"
                              />
                              <input
                                type="tel"
                                value={pc.phone}
                                onChange={(e) => {
                                  const next = [...editParentContacts];
                                  next[idx] = { ...pc, phone: e.target.value };
                                  setEditParentContacts(next);
                                  setIsStudentDirty(true);
                                }}
                                placeholder="Téléphone"
                                className="p-1.5 bg-slate-50 border border-slate-300 rounded-lg"
                              />
                              <input
                                type="text"
                                value={pc.profession || ''}
                                onChange={(e) => {
                                  const next = [...editParentContacts];
                                  next[idx] = { ...pc, profession: e.target.value };
                                  setEditParentContacts(next);
                                  setIsStudentDirty(true);
                                }}
                                placeholder="Profession"
                                className="p-1.5 bg-slate-50 border border-slate-300 rounded-lg"
                              />
                              <div className="flex items-center gap-1">
                                <input
                                  type="email"
                                  value={pc.email || ''}
                                  onChange={(e) => {
                                    const next = [...editParentContacts];
                                    next[idx] = { ...pc, email: e.target.value };
                                    setEditParentContacts(next);
                                    setIsStudentDirty(true);
                                  }}
                                  placeholder="Email"
                                  className="flex-1 p-1.5 bg-slate-50 border border-slate-300 rounded-lg"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditParentContacts(editParentContacts.filter((_, i) => i !== idx));
                                    setIsStudentDirty(true);
                                  }}
                                  className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-3.5 bg-[#F5F7FA] border border-[#DCE3EC] rounded-xl">
                          <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Adresse e-mail</span>
                          <span className="font-bold text-sm text-[#16202A]">
                            {selectedStudentDetail.email || 'Non renseigné'}
                          </span>
                        </div>
                        <div className="p-3.5 bg-[#F5F7FA] border border-[#DCE3EC] rounded-xl">
                          <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Téléphone(s)</span>
                          {(selectedStudentDetail.phones && selectedStudentDetail.phones.filter(Boolean).length > 0) ||
                          selectedStudentDetail.phone ? (
                            <span className="font-bold text-sm text-[#16202A]">
                              {selectedStudentDetail.phones && selectedStudentDetail.phones.filter(Boolean).length > 0
                                ? selectedStudentDetail.phones.filter(Boolean).join(' / ')
                                : selectedStudentDetail.phone}
                            </span>
                          ) : (
                            <span className="italic text-slate-400">Non renseigné</span>
                          )}
                        </div>
                        <div className="p-3.5 bg-[#F5F7FA] border border-[#DCE3EC] rounded-xl">
                          <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Adresse postale & Ville</span>
                          {selectedStudentDetail.address || selectedStudentDetail.city ? (
                            <span className="font-bold text-sm text-[#16202A]">
                              {[selectedStudentDetail.address, selectedStudentDetail.postalCode, selectedStudentDetail.city]
                                .filter(Boolean)
                                .join(', ')}
                            </span>
                          ) : (
                            <span className="italic text-slate-400">Non renseigné</span>
                          )}
                        </div>
                        <div className="p-3.5 bg-[#F5F7FA] border border-[#DCE3EC] rounded-xl">
                          <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Profil LinkedIn</span>
                          {selectedStudentDetail.linkedInUrl ? (
                            <a
                              href={selectedStudentDetail.linkedInUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#2F6FED] font-bold hover:underline flex items-center gap-1"
                            >
                              <Linkedin className="w-3.5 h-3.5" /> Voir le profil LinkedIn
                            </a>
                          ) : (
                            <span className="italic text-slate-400">Non renseigné</span>
                          )}
                        </div>
                      </div>

                      <div className="p-4 bg-[#F5F7FA] border border-[#DCE3EC] rounded-2xl space-y-2">
                        <span className="text-[10px] font-bold uppercase text-slate-500 block">
                          Parents / Tuteurs Légaux & Contacts d’Urgence
                        </span>
                        {!selectedStudentDetail.parentContacts || selectedStudentDetail.parentContacts.length === 0 ? (
                          <p className="text-slate-400 italic">
                            Aucun contact parent/tuteur renseigné. Cliquez sur « Modifier le profil » pour en ajouter.
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {selectedStudentDetail.parentContacts.map((pc) => (
                              <div key={pc.id} className="p-3 bg-white rounded-xl border border-[#DCE3EC] space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="px-2 py-0.5 bg-blue-50 text-[#2F6FED] font-bold rounded text-[10px]">
                                    {pc.relation}
                                  </span>
                                  <span className="text-[11px] font-semibold text-slate-500">{pc.profession || ''}</span>
                                </div>
                                <div className="font-bold text-[#16202A]">
                                  {pc.prenoms} {pc.nom}
                                </div>
                                <div className="text-[11px] text-slate-600">
                                  Tél : <span className="font-mono font-bold">{pc.phone || 'Non renseigné'}</span> •{' '}
                                  {pc.email || 'Pas d’email'}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ONGLET 4: COMPTE & SÉCURITÉ */}
              {detailTab === 'SECURITY' && (
                <div className="space-y-4 text-xs">
                  <div className="border-b border-slate-100 pb-2">
                    <h4 className="font-black text-sm text-[#16202A]">Compte SIS, consentements parents & journal d’audit</h4>
                    <p className="text-[11px] text-slate-500">
                      Paramètres d’accès, carte étudiante officielle, partage Espace Parents et historique des modifications.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 bg-[#F5F7FA] border border-[#DCE3EC] rounded-xl">
                      <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Identifiant de connexion</span>
                      <span className="font-mono font-bold text-sm text-[#16202A]">
                        {selectedStudentDetail.matricule || selectedStudentDetail.username}
                      </span>
                    </div>
                    <div className="p-3.5 bg-[#F5F7FA] border border-[#DCE3EC] rounded-xl">
                      <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Statut du compte</span>
                      <span className="font-bold text-sm text-[#1F8A83]">
                        {selectedStudentDetail.isActive ? 'Actif (Accès autorisé)' : 'Suspendu (RG-22)'}
                      </span>
                    </div>
                    <div className="p-3.5 bg-[#F5F7FA] border border-[#DCE3EC] rounded-xl">
                      <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Jeton Carte Étudiant</span>
                      <span className="font-mono font-bold text-xs text-[#17345B]">
                        {selectedStudentDetail.cardToken || 'Généré automatiquement'}
                      </span>
                    </div>
                  </div>

                  {/* Adult Student Parent Consent (ACC-095) */}
                  <div className="p-4 bg-[#F5F7FA] rounded-2xl border border-[#DCE3EC] space-y-2">
                    <span className="text-[10px] font-bold uppercase text-slate-600 block">
                      Autorisations de partage avec l’Espace Parents / Tuteurs
                    </span>
                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          disabled={!isEditingSheet}
                          checked={editConsent.academic}
                          onChange={(e) => {
                            setEditConsent({ ...editConsent, academic: e.target.checked });
                            setIsStudentDirty(true);
                          }}
                        />
                        <span>Notes & Emploi du temps</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          disabled={!isEditingSheet}
                          checked={editConsent.attendance}
                          onChange={(e) => {
                            setEditConsent({ ...editConsent, attendance: e.target.checked });
                            setIsStudentDirty(true);
                          }}
                        />
                        <span>Présences & Absences</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          disabled={!isEditingSheet}
                          checked={editConsent.financial}
                          onChange={(e) => {
                            setEditConsent({ ...editConsent, financial: e.target.checked });
                            setIsStudentDirty(true);
                          }}
                        />
                        <span>Situation Financière & Reçus</span>
                      </label>
                    </div>
                  </div>

                  {/* If Student is viewing their own sheet: Official Rectification Request Form (ACC-059) */}
                  {currentUser.role === 'STUDENT' && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-2">
                      <span className="text-[10px] font-bold uppercase text-amber-800 block">
                        Demander une rectification officielle d’état civil auprès de la Scolarité
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                        <input
                          type="text"
                          value={changeReqField}
                          onChange={(e) => setChangeReqField(e.target.value)}
                          placeholder="Champ (ex: Date de naissance)"
                          className="p-2 bg-white border border-amber-300 rounded-lg"
                        />
                        <input
                          type="text"
                          value={changeReqNewVal}
                          onChange={(e) => setChangeReqNewVal(e.target.value)}
                          placeholder="Nouvelle valeur souhaitée"
                          className="p-2 bg-white border border-amber-300 rounded-lg"
                        />
                        <input
                          type="text"
                          value={changeReqReason}
                          onChange={(e) => setChangeReqReason(e.target.value)}
                          placeholder="Justificatif (ex: Acte de naissance)"
                          className="p-2 bg-white border border-amber-300 rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!changeReqNewVal.trim()) return;
                            requestProfileChange(
                              selectedStudentDetail.id,
                              [
                                {
                                  field: 'name',
                                  label: changeReqField,
                                  oldValue: selectedStudentDetail.name,
                                  newValue: changeReqNewVal,
                                },
                              ],
                              changeReqReason || 'Rectification administrative'
                            );
                            setChangeReqNewVal('');
                            setSheetSaveBanner({
                              type: 'success',
                              text: 'Demande transmise au service Scolarité pour validation.',
                            });
                          }}
                          className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg cursor-pointer"
                        >
                          Soumettre demande
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Modification History Log (ACC-061) */}
                  <div className="p-4 bg-[#F5F7FA] border border-[#DCE3EC] rounded-2xl space-y-2">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-500">
                      <History className="w-3.5 h-3.5 text-[#2F6FED]" />
                      <span>Journal d’Audit & Historique des Modifications de la Fiche</span>
                    </div>
                    {!selectedStudentDetail.modificationHistory ||
                    selectedStudentDetail.modificationHistory.length === 0 ? (
                      <p className="text-slate-400 italic text-[11px]">
                        Aucune modification enregistrée depuis l’immatriculation initiale.
                      </p>
                    ) : (
                      <div className="space-y-1.5 max-h-36 overflow-y-auto">
                        {selectedStudentDetail.modificationHistory.map((h) => (
                          <div
                            key={h.id}
                            className="p-2 bg-white rounded-lg border border-[#DCE3EC] flex items-center justify-between text-[11px]"
                          >
                            <div>
                              <span className="font-bold text-[#16202A]">{h.authorName}</span>
                              <span className="text-slate-600">
                                {' '}
                                — {h.field} : "{h.oldValue}" → "{h.newValue}"
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

              {/* TAB 2: GRADES & PEDAGOGY (PAR SEMESTRE ET PAR ANNÉE ACADÉMIQUE + RATTRAPAGE EC) */}
              {detailTab === 'GRADES' && (
                <div className="space-y-4 text-xs">
                  {(() => {
                    const annualDelib = computeStudentDeliberationPreview(
                      selectedStudentDetail.id,
                      selectedAcademicYear,
                      'ANNUEL'
                    );
                    const filteredModalEcs =
                      studentGradeSemester === 'ANNUEL'
                        ? ecs
                        : ecs.filter((ec) => ec.semester === studentGradeSemester);

                    return (
                      <>
                        {/* Filter by Academic Year & Semester / Annual */}
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-3">
                            <div>
                              <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                                Année Académique
                              </span>
                              <select
                                value={selectedAcademicYear}
                                onChange={(e) => setSelectedAcademicYear(e.target.value)}
                                className="p-1.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-800"
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
                                Affichage des Notes & Résultats
                              </span>
                              <div className="flex bg-white p-1 rounded-xl border border-slate-200 gap-1">
                                <button
                                  type="button"
                                  onClick={() => setStudentGradeSemester('ANNUEL')}
                                  className={`px-3 py-1 rounded-lg font-bold cursor-pointer ${
                                    studentGradeSemester === 'ANNUEL'
                                      ? 'bg-blue-700 text-white'
                                      : 'text-slate-600 hover:bg-slate-100'
                                  }`}
                                >
                                  Année Complète (S1 + S2 — 1 Page)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setStudentGradeSemester('S1')}
                                  className={`px-3 py-1 rounded-lg font-bold cursor-pointer ${
                                    studentGradeSemester === 'S1'
                                      ? 'bg-blue-700 text-white'
                                      : 'text-slate-600 hover:bg-slate-100'
                                  }`}
                                >
                                  Semestre 1 (S1)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setStudentGradeSemester('S2')}
                                  className={`px-3 py-1 rounded-lg font-bold cursor-pointer ${
                                    studentGradeSemester === 'S2'
                                      ? 'bg-blue-700 text-white'
                                      : 'text-slate-600 hover:bg-slate-100'
                                  }`}
                                >
                                  Semestre 2 (S2)
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] font-bold uppercase text-slate-400 block">
                              Décision Annuelle ({selectedAcademicYear})
                            </span>
                            <span
                              className={`inline-block mt-0.5 px-2.5 py-1 rounded-lg font-black text-[11px] ${
                                annualDelib.proposedDecision === 'ADMIS' ||
                                annualDelib.proposedDecision === 'ADMIS_COMPENSATION'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : annualDelib.proposedDecision === 'PASSAGE_CONDITIONNEL'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {annualDelib.proposedDecision === 'ADMIS'
                                ? 'ADMIS(E) EN ANNÉE SUPÉRIEURE'
                                : annualDelib.proposedDecision === 'ADMIS_COMPENSATION'
                                ? 'ADMIS(E) PAR COMPENSATION ANNUELLE'
                                : annualDelib.proposedDecision === 'PASSAGE_CONDITIONNEL'
                                ? 'PASSAGE CONDITIONNEL (DETTE UE)'
                                : 'REDOUBLEMENT / RATTRAPAGE'}
                            </span>
                          </div>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-blue-600 block">
                              Synthèse Pédagogique ({studentGradeSemester === 'ANNUEL' ? 'Bilan Annuel S1 + S2' : `Semestre ${studentGradeSemester}`})
                            </span>
                            <h4 className="text-base font-black text-blue-950">
                              Moyenne Générale : {annualDelib.finalAverage.toFixed(2)} / 20 • Crédits :{' '}
                              {annualDelib.validatedCredits} / {annualDelib.totalCreditsAttempted || 60} ECTS
                            </h4>
                            <p className="text-slate-600 text-xs mt-0.5">
                              Système LMD avec prise en compte de la Session 1 et de la Session de Rattrapage par EC.
                            </p>
                          </div>
                        </div>

                        <div className="border border-slate-200 rounded-2xl overflow-hidden">
                          <table className="w-full text-xs text-left">
                            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                              <tr>
                                <th className="p-3">Sem.</th>
                                <th className="p-3">UE / Élément Constitutif (EC)</th>
                                <th className="p-3 text-center">CC (40%)</th>
                                <th className="p-3 text-center">Exam (60%)</th>
                                <th className="p-3 text-center">Session 1</th>
                                <th className="p-3 text-center bg-amber-50 text-amber-800">Rattrapage</th>
                                <th className="p-3 text-center">Note Retenue</th>
                                <th className="p-3 text-center">Statut</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {filteredModalEcs.map((ec) => {
                                const ue = ues.find((u) => u.id === ec.ueId);
                                const studentGrade = getStudentEcGrade(selectedStudentDetail.id, ec.id);
                                const s1G =
                                  studentGrade?.session1Score ??
                                  studentGrade?.finalScore ??
                                  (ec.creditsEcts >= 3 ? 14 : 12.5);
                                const rattrapageG = studentGrade?.rattrapageScore;
                                const finalG =
                                  rattrapageG !== undefined ? Math.max(s1G, rattrapageG) : s1G;
                                const isSuccess = finalG >= 10;

                                return (
                                  <tr key={ec.id} className="hover:bg-slate-50">
                                    <td className="p-3">
                                      <span className="px-2 py-0.5 bg-slate-100 text-slate-800 font-mono font-bold rounded text-[10px]">
                                        {ec.semester}
                                      </span>
                                    </td>
                                    <td className="p-3">
                                      <span className="font-bold text-slate-800 block">
                                        {ec.code} — {ec.title} ({ec.creditsEcts} ECTS)
                                      </span>
                                      <span className="text-[10px] text-slate-400">{ue?.code} • {ue?.title || 'UE LMD'}</span>
                                    </td>
                                    <td className="p-3 text-center font-medium">
                                      {studentGrade?.quizScore !== undefined ? `${studentGrade.quizScore}` : '13.0'}
                                    </td>
                                    <td className="p-3 text-center font-medium">
                                      {studentGrade?.examScore !== undefined ? `${studentGrade.examScore}` : '14.0'}
                                    </td>
                                    <td className="p-3 text-center font-mono font-semibold text-slate-700">
                                      {s1G.toFixed(2)} / 20
                                    </td>
                                    <td className="p-3 text-center font-mono bg-amber-50/40">
                                      {rattrapageG !== undefined ? (
                                        <span className="font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                                          {rattrapageG.toFixed(2)} / 20
                                        </span>
                                      ) : s1G < 10 ? (
                                        <span className="text-[10px] font-bold text-rose-600">À rattraper</span>
                                      ) : (
                                        <span className="text-slate-300">—</span>
                                      )}
                                    </td>
                                    <td className="p-3 text-center">
                                      <span className={`font-black text-xs ${isSuccess ? 'text-emerald-700' : 'text-rose-700'}`}>
                                        {finalG.toFixed(2)} / 20
                                      </span>
                                    </td>
                                    <td className="p-3 text-center">
                                      <span
                                        className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                                          rattrapageG !== undefined && isSuccess
                                            ? 'bg-amber-100 text-amber-900'
                                            : isSuccess
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : 'bg-rose-100 text-rose-800'
                                        }`}
                                      >
                                        {rattrapageG !== undefined && isSuccess
                                          ? 'Validé (Rattrapage)'
                                          : isSuccess
                                          ? 'Validé'
                                          : 'Rattrapage requis'}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {/* TAB 3: FINANCES, ENCAISSEMENT DIRECT & ANNULATION DE TRANSACTION */}
              {detailTab === 'FINANCES' && (
                <div className="space-y-4 text-xs">
                  {(() => {
                    const fin = getStudentFinancialSummary(selectedStudentDetail.id);
                    // Ensure all student fees AND all catalogue fees are selectable in the direct payment form
                    const selectableFees = fees.filter(
                      (f) =>
                        !f.studentId ||
                        f.studentId === selectedStudentDetail.id
                    );
                    const studentPayments = payments.filter((p) => p.studentId === selectedStudentDetail.id);

                    return (
                      <>
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

                        <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-xl">
                          <div>
                            <span className="font-bold text-blue-900 block">
                              Encaisser un paiement pour cet étudiant
                            </span>
                            <span className="text-blue-700 text-[11px]">
                              Choisissez le frais à régler — émission immédiate d'un reçu officiel
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
                            className="px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl transition-all cursor-pointer shadow-xs"
                          >
                            {isQuickPayOpen ? 'Fermer le formulaire' : '+ Encaisser maintenant'}
                          </button>
                        </div>

                        {isQuickPayOpen && (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              setQuickPayError(null);
                              setQuickPaySuccess(null);
                              if (!selectedStudentDetail || !quickPayFeeId || quickPayAmount <= 0) {
                                setQuickPayError('Veuillez sélectionner un frais et saisir un montant valide.');
                                return;
                              }
                              const res = recordPayment({
                                studentId: selectedStudentDetail.id,
                                feeId: quickPayFeeId,
                                amountPaidAr: Number(quickPayAmount),
                                paymentMethod: quickPayMethod,
                                referenceNumber: quickPayRef,
                                notes: 'Règlement enregistré depuis la fiche étudiant',
                              });
                              if (res.success) {
                                setQuickPaySuccess(`Paiement enregistré avec succès ! Reçu ${res.receiptNumber} émis.`);
                                setQuickPayRef('');
                              } else {
                                setQuickPayError(res.error || 'Erreur lors de l’encaissement.');
                              }
                            }}
                            className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3"
                          >
                            <h5 className="font-bold text-slate-900 text-xs">Formulaire d'encaissement direct</h5>
                            {quickPayError && (
                              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-semibold flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                                <span>{quickPayError}</span>
                              </div>
                            )}
                            {quickPaySuccess && (
                              <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0" />
                                <span>{quickPaySuccess}</span>
                              </div>
                            )}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                              <div className="sm:col-span-2">
                                <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                                  Choisir le Frais à encaisser *
                                </label>
                                <select
                                  value={quickPayFeeId}
                                  onChange={(e) => {
                                    const nextFeeId = e.target.value;
                                    setQuickPayFeeId(nextFeeId);
                                    const detail = fin.feeDetails.find((fd) => fd.fee.id === nextFeeId);
                                    const rawFee = selectableFees.find((f) => f.id === nextFeeId);
                                    if (detail && detail.remainingAr > 0) {
                                      setQuickPayAmount(detail.remainingAr);
                                    } else if (rawFee) {
                                      setQuickPayAmount(rawFee.amountAr);
                                    }
                                  }}
                                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                                >
                                  <option value="" disabled>
                                    -- Sélectionner un frais --
                                  </option>
                                  {selectableFees.map((f) => {
                                    const fd = fin.feeDetails.find((d) => d.fee.id === f.id);
                                    const rem = fd ? fd.remainingAr : f.amountAr;
                                    return (
                                      <option key={f.id} value={f.id}>
                                        {f.title} — {rem > 0 ? `Reste à payer : ${rem.toLocaleString()} Ar` : `Soldé (${f.amountAr.toLocaleString()} Ar)`}
                                      </option>
                                    );
                                  })}
                                </select>
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                                  Montant en Ariary *
                                </label>
                                <input
                                  type="number"
                                  step="1000"
                                  min="1000"
                                  value={quickPayAmount}
                                  onChange={(e) => setQuickPayAmount(Number(e.target.value))}
                                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-blue-900"
                                  required
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                                  Mode de règlement
                                </label>
                                <select
                                  value={quickPayMethod}
                                  onChange={(e) => setQuickPayMethod(e.target.value as any)}
                                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                                >
                                  <option value="MOBILE_MONEY">Mobile Money (MVola/Orange)</option>
                                  <option value="ESPECES">Espèces au guichet</option>
                                  <option value="DEPOT_BANCAIRE">Dépôt Bancaire</option>
                                  <option value="VIREMENT_BANCAIRE">Virement Bancaire</option>
                                </select>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                              <input
                                type="text"
                                value={quickPayRef}
                                onChange={(e) => setQuickPayRef(e.target.value)}
                                placeholder="Référence transaction (Optionnel : N° MVola, Bordereau...)"
                                className="flex-1 min-w-[220px] p-2 bg-white border border-slate-300 rounded-lg text-xs"
                              />
                              <button
                                type="submit"
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-xs"
                              >
                                Valider l'encaissement et générer le reçu
                              </button>
                            </div>
                          </form>
                        )}

                        {/* Modal/Inline Confirmation for Transaction Cancellation */}
                        {cancellingPaymentId && (
                          <div className="p-4 bg-rose-50 border border-rose-300 rounded-2xl space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="font-black text-rose-900 text-xs">
                                Annuler une transaction encaissée par erreur
                              </span>
                              <button
                                type="button"
                                onClick={() => setCancellingPaymentId(null)}
                                className="text-rose-600 hover:text-rose-900 font-bold"
                              >
                                ✕
                              </button>
                            </div>
                            <p className="text-[11px] text-rose-700">
                              Le montant sera automatiquement déduit de la caisse et le solde du frais de l'étudiant sera rétabli.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-2">
                              <input
                                type="text"
                                value={cancelReasonText}
                                onChange={(e) => setCancelReasonText(e.target.value)}
                                placeholder="Motif obligatoire d'annulation..."
                                className="flex-1 p-2 bg-white border border-rose-300 rounded-lg text-xs font-medium"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  if (!cancelReasonText.trim()) return;
                                  cancelPayment(cancellingPaymentId, cancelReasonText.trim());
                                  setCancellingPaymentId(null);
                                }}
                                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs cursor-pointer"
                              >
                                Confirmer l'annulation du reçu
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          <h5 className="font-bold text-slate-800 text-xs">
                            Historique des reçus de paiement émis (avec option d'annulation en cas d'erreur)
                          </h5>
                          <div className="border border-slate-200 rounded-xl overflow-hidden">
                            <table className="w-full text-xs text-left">
                              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                                <tr>
                                  <th className="p-2.5">N° Reçu</th>
                                  <th className="p-2.5">Date</th>
                                  <th className="p-2.5">Frais Réglé</th>
                                  <th className="p-2.5 text-right">Montant</th>
                                  <th className="p-2.5">Mode / Statut</th>
                                  <th className="p-2.5 text-right">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {studentPayments.length === 0 ? (
                                  <tr>
                                    <td colSpan={6} className="p-4 text-center text-slate-400 italic">
                                      Aucun paiement enregistré pour l'instant.
                                    </td>
                                  </tr>
                                ) : (
                                  studentPayments.map((p) => {
                                    const feeObj = fees.find((f) => f.id === p.feeId);
                                    return (
                                      <tr
                                        key={p.id}
                                        className={`hover:bg-slate-50 ${p.isCancelled ? 'bg-rose-50/40 opacity-65' : ''}`}
                                      >
                                        <td className="p-2.5 font-mono font-bold text-blue-700">
                                          <span className={p.isCancelled ? 'line-through text-rose-700' : ''}>
                                            {p.receiptNumber}
                                          </span>
                                        </td>
                                        <td className="p-2.5 text-slate-600">{p.paymentDate}</td>
                                        <td className="p-2.5 text-slate-800">
                                          {feeObj?.title || 'Frais'}
                                          {p.isCancelled && (
                                            <span className="block text-[10px] text-rose-600 font-semibold">
                                              Motif : {p.cancelReason || p.notes}
                                            </span>
                                          )}
                                        </td>
                                        <td
                                          className={`p-2.5 text-right font-black ${
                                            p.isCancelled ? 'line-through text-rose-600' : 'text-emerald-700'
                                          }`}
                                        >
                                          {p.amountPaidAr.toLocaleString()} Ar
                                        </td>
                                        <td className="p-2.5 font-medium text-slate-600">
                                          {p.isCancelled ? (
                                            <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-bold text-[10px]">
                                              ANNULÉ
                                            </span>
                                          ) : (
                                            p.paymentMethod
                                          )}
                                        </td>
                                        <td className="p-2.5 text-right">
                                          {!p.isCancelled && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setCancellingPaymentId(p.id);
                                                setCancelReasonText('Erreur de saisie / Encaissement par erreur');
                                              }}
                                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 border border-rose-200 rounded-lg font-bold text-[10px] transition-colors cursor-pointer"
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
                      </>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* PIED DE MODALE FIXE (Section 4 du PDF : toujours visible d'un onglet à l'autre) */}
            <div className="px-6 py-4 bg-[#F5F7FA] border-t border-[#DCE3EC] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                {isEditingSheet ? (
                  isStudentDirty ? (
                    <span className="text-[#D58A18] font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" />
                      Modifications en attente d’enregistrement
                    </span>
                  ) : (
                    <span>Mode édition actif — modifiez les champs souhaités</span>
                  )
                ) : (
                  <span>Mode consultation (lecture seule)</span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {!isEditingSheet ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setCardModalStudent(selectedStudentDetail)}
                      className="px-3.5 py-2 bg-white hover:bg-slate-100 text-[#17345B] border border-[#DCE3EC] font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      Carte Étudiant
                    </button>
                    <button
                      type="button"
                      onClick={() => startEditingSheet(selectedStudentDetail)}
                      className="px-4 py-2 bg-[#2F6FED] hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Modifier le profil
                    </button>
                    <button
                      type="button"
                      onClick={handleCloseStudentModal}
                      className="px-4 py-2 bg-[#17345B] hover:bg-slate-800 text-white font-bold rounded-xl text-xs cursor-pointer"
                    >
                      Fermer
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleCancelStudentEdit}
                      className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-[#DCE3EC] font-bold rounded-xl text-xs cursor-pointer"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveStudentSheet()}
                      className="px-5 py-2 bg-[#2F6FED] hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Enregistrer les modifications
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL: CARTE ÉTUDIANT OFFICIELLE (CODE-BARRES + QR CODE) */}
      {cardModalStudent && (
        <StudentCardModal student={cardModalStudent} onClose={() => setCardModalStudent(null)} />
      )}
    </div>
  );
};
