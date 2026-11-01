import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  UserCheck,
  Clock,
  AlertTriangle,
  Mail,
  Phone,
  BookOpen,
  CheckCircle,
  Banknote,
  Calendar,
  X,
  Edit2,
  Eye,
  Briefcase,
  CreditCard,
  MapPin,
  Save,
  GraduationCap,
  FileText,
  Download,
  Upload,
  Printer,
  Search,
  RotateCcw,
  ShieldCheck,
  User as UserIcon,
  Lock,
} from 'lucide-react';
import { getTeachersForStudent } from '../utils/studentVisibility';
import { TeacherAvailabilitySlot, User } from '../types';
import { WIDE_TEACHER_SLOTS, buildWideAvailabilities } from './UserProfileModal';
import { exportTeacherScheduleToPDF } from '../utils/pdfExport';
import { downloadCsvFile } from '../utils/csvExport';
import { getAntananarivoDateStr } from '../utils/securityAndDateUtils';
import { requestAppConfirm, showAppToast } from './ToastAndConfirmCenter';

interface TeacherManagementProps {
  onNavigateToCreate?: () => void;
}

const DEFAULT_WEEK_DAYS: TeacherAvailabilitySlot['day'][] = [
  'LUNDI',
  'MARDI',
  'MERCREDI',
  'JEUDI',
  'VENDREDI',
  'SAMEDI',
];

type TeacherSheetTab = 'IDENTITY' | 'CONTACT' | 'PROFESSIONAL' | 'SECURITY';

export const TeacherManagement: React.FC<TeacherManagementProps> = ({ onNavigateToCreate }) => {
  const {
    users,
    sessions,
    courses,
    ecs,
    rooms,
    groups,
    currentUser,
    getTeacherHourlyStats,
    updateTeacher,
    toggleUserStatus,
    sendUserPasswordResetEmail,
  } = useApp();

  const isStudent = currentUser.role === 'STUDENT';
  const isTeacher = currentUser.role === 'TEACHER';
  const canEditFinanceOrSchedule = ['ADMIN', 'ADMIN_STAFF', 'SCOLARITE', 'SCHEDULER', 'ACADEMIC_HEAD', 'FINANCE'].includes(
    currentUser.role
  );
  const canViewFinancialPayroll = ['ADMIN', 'FINANCE', 'SCOLARITE', 'SCHEDULER'].includes(currentUser.role);

  const allTeachers = users.filter((u) => u.role === 'TEACHER');
  const studentTeachers = getTeachersForStudent(currentUser.groupId, courses, ecs, sessions, users);
  const baseTeachers = isTeacher
    ? allTeachers.filter((t) => t.id === currentUser.id)
    : isStudent
    ? studentTeachers
    : allTeachers;

  // List Toolbar Filters (Section 3 of PDF)
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'INCOMPLETE' | 'SUSPENDED'>('ALL');
  const [filterContract, setFilterContract] = useState<'ALL' | 'PERMANENT' | 'VACATAIRE' | 'MISSIONNAIRE'>('ALL');

  const isTeacherIncomplete = (t: User) =>
    !t.phone || !t.specialty || !t.academicRank || !t.highestDiploma || (!isStudent && !t.cin);

  const teachers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return baseTeachers.filter((t) => {
      if (q) {
        const hay = `${t.name} ${t.email} ${t.specialty || ''} ${t.academicRank || ''} ${(t.subjects || []).join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filterStatus === 'ACTIVE' && !t.isActive) return false;
      if (filterStatus === 'SUSPENDED' && t.isActive) return false;
      if (filterStatus === 'INCOMPLETE' && !isTeacherIncomplete(t)) return false;
      if (filterContract !== 'ALL' && (t.contractType || 'VACATAIRE') !== filterContract) return false;
      return true;
    });
  }, [baseTeachers, searchTerm, filterStatus, filterContract]);

  const hasActiveFilters = Boolean(searchTerm.trim() || filterStatus !== 'ALL' || filterContract !== 'ALL');

  // KPI metrics (Section 3 of PDF: 4 KPI cards)
  const kpiMetrics = useMemo(() => {
    const total = baseTeachers.length;
    const active = baseTeachers.filter((t) => t.isActive).length;
    const incomplete = baseTeachers.filter((t) => isTeacherIncomplete(t)).length;
    const overloaded = baseTeachers.filter((t) => {
      const st = getTeacherHourlyStats(t.id);
      return st.totalScheduled > st.maxWeekly || st.totalCompleted > st.maxWeekly;
    }).length;
    return { total, active, incomplete, overloaded };
  }, [baseTeachers, sessions]);

  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [sheetTab, setSheetTab] = useState<TeacherSheetTab>('IDENTITY');
  const [isEditingTeacherSheet, setIsEditingTeacherSheet] = useState<boolean>(false);
  const [isTeacherDirty, setIsTeacherDirty] = useState<boolean>(false);

  // Full University Teacher Sheet State — NEVER pre-filled with fake defaults
  const [editCivilite, setEditCivilite] = useState<'M.' | 'Mme' | 'Mlle' | 'Dr.' | 'Prof.'>('Dr.');
  const [editName, setEditName] = useState<string>('');
  const [editBirthDate, setEditBirthDate] = useState<string>('');
  const [editBirthPlace, setEditBirthPlace] = useState<string>('');
  const [editAcademicRank, setEditAcademicRank] = useState<string>('');
  const [editHighestDiploma, setEditHighestDiploma] = useState<string>('');
  const [editAlmaMater, setEditAlmaMater] = useState<string>('');
  const [editSpecialty, setEditSpecialty] = useState<string>('');
  const [editDepartment, setEditDepartment] = useState<string>('');
  const [editOfficeLocation, setEditOfficeLocation] = useState<string>('');
  const [editEmail, setEditEmail] = useState<string>('');
  const [editPhone, setEditPhone] = useState<string>('');
  const [editSecondaryPhone, setEditSecondaryPhone] = useState<string>('');
  const [editAddress, setEditAddress] = useState<string>('');
  const [editCity, setEditCity] = useState<string>('');
  const [editEmergencyContact, setEditEmergencyContact] = useState<string>('');
  const [editLinkedIn, setEditLinkedIn] = useState<string>('');
  const [editOrcid, setEditOrcid] = useState<string>('');
  const [editSubjectsText, setEditSubjectsText] = useState<string>('');
  const [editHourlyRate, setEditHourlyRate] = useState<number>(40000);
  const [editWeeklyMax, setEditWeeklyMax] = useState<number>(18);
  const [editContractType, setEditContractType] = useState<'PERMANENT' | 'VACATAIRE' | 'MISSIONNAIRE'>('VACATAIRE');
  const [editHireDate, setEditHireDate] = useState<string>('');
  const [editBankRib, setEditBankRib] = useState<string>('');
  const [editCin, setEditCin] = useState<string>('');
  const [editCvFileName, setEditCvFileName] = useState<string>('');
  const [editCvFileUrl, setEditCvFileUrl] = useState<string>('');
  const [editCvUploadedAt, setEditCvUploadedAt] = useState<string>('');
  const [pdfPeriodType, setPdfPeriodType] = useState<'WEEK' | 'MONTH' | 'SEMESTER'>('WEEK');
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  const activeTeacher = selectedTeacherId ? users.find((u) => u.id === selectedTeacherId) || null : null;
  const canEditActiveTeacher = Boolean(
    activeTeacher && (canEditFinanceOrSchedule || currentUser.id === activeTeacher.id)
  );

  const populateTeacherForm = (teacher: User) => {
    setEditCivilite(teacher.civilite || 'Dr.');
    setEditName(teacher.name || '');
    setEditBirthDate(teacher.birthDate || '');
    setEditBirthPlace(teacher.birthPlace || '');
    setEditAcademicRank(teacher.academicRank || '');
    setEditHighestDiploma(teacher.highestDiploma || '');
    setEditAlmaMater(teacher.almaMater || '');
    setEditSpecialty(teacher.specialty || '');
    setEditDepartment(teacher.department || '');
    setEditOfficeLocation(teacher.officeLocation || '');
    setEditEmail(teacher.email || '');
    setEditPhone(teacher.phone || '');
    setEditSecondaryPhone(teacher.secondaryPhone || '');
    setEditAddress(teacher.address || '');
    setEditCity(teacher.city || '');
    setEditEmergencyContact(teacher.emergencyContact || '');
    setEditLinkedIn(teacher.linkedInUrl || '');
    setEditOrcid(teacher.orcidUrl || '');
    setEditSubjectsText((teacher.subjects || []).join(', '));
    setEditHourlyRate(teacher.hourlyRateAr || 40000);
    setEditWeeklyMax(teacher.weeklyMaxHours || 18);
    setEditContractType(teacher.contractType || 'VACATAIRE');
    setEditHireDate(teacher.hireDate || '');
    setEditBankRib(teacher.bankRib || '');
    setEditCin(teacher.cin || '');
    setEditCvFileName(teacher.cvFileName || '');
    setEditCvFileUrl(teacher.cvFileUrl || '');
    setEditCvUploadedAt(teacher.cvUploadedAt || '');
    setIsTeacherDirty(false);
    setSaveFeedback(null);
  };

  // Opens by default in CONSULTATION mode (Section 4 of PDF)
  const handleOpenTeacherModal = (teacher: User, startInEditMode = false) => {
    setSelectedTeacherId(teacher.id);
    setSheetTab('IDENTITY');
    setIsEditingTeacherSheet(startInEditMode);
    populateTeacherForm(teacher);
  };

  const handleCloseTeacherModal = () => {
    if (isEditingTeacherSheet && isTeacherDirty) {
      requestAppConfirm({
        title: 'Modifications non enregistrées',
        message: 'Vous avez modifié la fiche enseignant sans enregistrer. Voulez-vous abandonner ces modifications ?',
        confirmLabel: 'Abandonner',
        cancelLabel: 'Continuer la saisie',
        variant: 'warning',
        onConfirm: () => {
          setSelectedTeacherId(null);
          setIsEditingTeacherSheet(false);
          setIsTeacherDirty(false);
        },
      });
      return;
    }
    setSelectedTeacherId(null);
    setIsEditingTeacherSheet(false);
    setIsTeacherDirty(false);
  };

  const handleCancelTeacherEdit = () => {
    if (isTeacherDirty && activeTeacher) {
      requestAppConfirm({
        title: 'Annuler les modifications',
        message: 'Abandonner les modifications en cours et revenir en mode consultation ?',
        confirmLabel: 'Oui, annuler',
        cancelLabel: 'Non, continuer',
        variant: 'warning',
        onConfirm: () => {
          populateTeacherForm(activeTeacher);
          setIsEditingTeacherSheet(false);
          setIsTeacherDirty(false);
        },
      });
      return;
    }
    setIsEditingTeacherSheet(false);
    setIsTeacherDirty(false);
  };

  const handleSaveTeacherProfile = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeTeacher || !canEditActiveTeacher) return;

    if (!editName.trim() || !editEmail.trim()) {
      showAppToast({
        type: 'error',
        title: 'Champs obligatoires manquants',
        message: 'Le nom complet et l’adresse e-mail institutionnelle sont obligatoires.',
      });
      return;
    }

    const parsedSubjects = editSubjectsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    updateTeacher(activeTeacher.id, {
      civilite: editCivilite,
      name: editName.trim(),
      birthDate: editBirthDate.trim() || undefined,
      birthPlace: editBirthPlace.trim() || undefined,
      academicRank: editAcademicRank.trim() || undefined,
      highestDiploma: editHighestDiploma.trim() || undefined,
      almaMater: editAlmaMater.trim() || undefined,
      specialty: editSpecialty.trim() || undefined,
      department: editDepartment.trim() || undefined,
      officeLocation: editOfficeLocation.trim() || undefined,
      email: editEmail.trim(),
      phone: editPhone.trim() || undefined,
      secondaryPhone: editSecondaryPhone.trim() || undefined,
      address: editAddress.trim() || undefined,
      city: editCity.trim() || undefined,
      emergencyContact: editEmergencyContact.trim() || undefined,
      linkedInUrl: editLinkedIn.trim() || undefined,
      orcidUrl: editOrcid.trim() || undefined,
      subjects: parsedSubjects,
      hourlyRateAr: canViewFinancialPayroll ? Number(editHourlyRate) || 40000 : activeTeacher.hourlyRateAr,
      weeklyMaxHours: Number(editWeeklyMax) || 18,
      contractType: canViewFinancialPayroll ? editContractType : activeTeacher.contractType,
      hireDate: editHireDate.trim() || undefined,
      bankRib: canViewFinancialPayroll ? editBankRib.trim() || undefined : activeTeacher.bankRib,
      cin: editCin.trim() || undefined,
      cvFileName: editCvFileName || undefined,
      cvFileUrl: editCvFileUrl || undefined,
      cvUploadedAt: editCvUploadedAt || undefined,
    });

    setIsTeacherDirty(false);
    setIsEditingTeacherSheet(false);
    setSaveFeedback('Fiche enseignant enregistrée et synchronisée avec succès.');
    showAppToast({
      type: 'success',
      title: 'Fiche enseignant mise à jour',
      message: `Les modifications sur le profil de ${editName.trim()} ont été enregistrées.`,
    });
    setTimeout(() => setSaveFeedback(null), 3500);
  };

  const handleExportTeacherPdf = (teacher: User, period: 'WEEK' | 'MONTH' | 'SEMESTER') => {
    const allTeacherSessions = sessions.filter((s) => s.teacherId === teacher.id);
    const now = new Date();
    let filtered = allTeacherSessions;
    let periodLabel = 'Semestre complet';

    if (period === 'WEEK') {
      const day = now.getDay();
      const diffToMonday = (day + 6) % 7;
      const monday = new Date(now);
      monday.setDate(now.getDate() - diffToMonday);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      const startStr = getAntananarivoDateStr(monday);
      const endStr = getAntananarivoDateStr(sunday);
      const weekSessions = allTeacherSessions.filter((s) => s.date >= startStr && s.date <= endStr);
      filtered = weekSessions.length > 0 ? weekSessions : allTeacherSessions;
      periodLabel = `Semaine du ${monday.toLocaleDateString('fr-FR')} au ${sunday.toLocaleDateString('fr-FR')}`;
    } else if (period === 'MONTH') {
      const ym = now.toISOString().slice(0, 7);
      const monthSessions = allTeacherSessions.filter((s) => s.date.startsWith(ym));
      filtered = monthSessions.length > 0 ? monthSessions : allTeacherSessions;
      periodLabel = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    } else {
      filtered = allTeacherSessions;
      periodLabel = 'Semestre Académique Complet';
    }

    exportTeacherScheduleToPDF({
      teacher,
      periodType: period,
      periodLabel,
      sessions: filtered,
      courses,
      rooms,
      groups,
    });
  };

  const handleToggleAvailabilitySlot = (
    teacher: User,
    day: TeacherAvailabilitySlot['day'],
    slot: TeacherAvailabilitySlot['slot']
  ) => {
    if (!canEditFinanceOrSchedule && currentUser.id !== teacher.id) return;
    const currentGrid = buildWideAvailabilities(teacher.availabilities);
    const updatedGrid = currentGrid.map((cell) =>
      cell.day === day && cell.slot === slot
        ? { ...cell, available: !cell.available, note: !cell.available ? 'Disponible' : 'Indisponible' }
        : cell
    );
    updateTeacher(teacher.id, { availabilities: updatedGrid });
    setSaveFeedback(`Disponibilité mise à jour (${day} • ${slot}).`);
    setTimeout(() => setSaveFeedback(null), 2500);
  };

  const handleSetFullDayAvailability = (teacher: User, day: TeacherAvailabilitySlot['day'], available: boolean) => {
    if (!canEditFinanceOrSchedule && currentUser.id !== teacher.id) return;
    const currentGrid = buildWideAvailabilities(teacher.availabilities);
    const updatedGrid = currentGrid.map((cell) =>
      cell.day === day ? { ...cell, available, note: available ? 'Disponible (07h-17h)' : 'Indisponible' } : cell
    );
    updateTeacher(teacher.id, { availabilities: updatedGrid });
    setSaveFeedback(`Journée ${day} basculée en ${available ? 'Disponible (07h00–17h00)' : 'Indisponible'}.`);
    setTimeout(() => setSaveFeedback(null), 2500);
  };

  const renderReadOnlyField = (label: string, value?: string | number | null, isMono = false) => {
    const hasVal = value !== undefined && value !== null && String(value).trim() !== '';
    return (
      <div className="p-3 bg-[#F5F7FA] rounded-xl border border-[#DCE3EC]">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">{label}</span>
        {hasVal ? (
          <span className={`text-sm font-bold text-[#16202A] ${isMono ? 'font-mono' : ''}`}>{value}</span>
        ) : (
          <span className="text-xs italic text-slate-400">Non renseigné</span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* 1. EN-TÊTE DE PAGE UNIFIÉ (Modèle Section 3 PDF) */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-[#DCE3EC]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-[#17345B] text-white rounded-xl shadow-xs">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-[#16202A] tracking-tight">
                  Gestion des enseignants
                </h2>
                <p className="text-xs text-slate-500">
                  Répertoire académique, disponibilités hebdomadaires (07h–17h), charges horaires et suivi des vacations.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!isStudent && (
              <button
                type="button"
                onClick={() => {
                  const headers = [
                    'Civilité',
                    'Nom Complet',
                    'Grade Universitaire',
                    'Diplôme le plus élevé',
                    'Spécialité',
                    'Type Contrat',
                    'Email',
                    'Téléphone',
                    'Heures Planifiées (h)',
                    'Heures Validées (h)',
                    'Quota Max Hebdo (h)',
                    ...(canViewFinancialPayroll ? ['Taux Horaire (Ar/h)', 'Paie Validée (Ar)'] : []),
                  ];
                  const rows = teachers.map((t) => {
                    const st = getTeacherHourlyStats(t.id);
                    const rate = t.hourlyRateAr || 40000;
                    return [
                      t.civilite || '',
                      t.name,
                      t.academicRank || 'Non renseigné',
                      t.highestDiploma || 'Non renseigné',
                      t.specialty || (t.subjects || []).join(', '),
                      t.contractType || 'VACATAIRE',
                      t.email,
                      t.phone || 'Non renseigné',
                      st.totalScheduled,
                      st.totalCompleted,
                      st.maxWeekly,
                      ...(canViewFinancialPayroll ? [rate, st.totalCompleted * rate] : []),
                    ];
                  });
                  downloadCsvFile('Etat_Corps_Enseignant_EBM.csv', headers, rows);
                }}
                className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-[#DCE3EC] text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                Exporter CSV
              </button>
            )}
            {onNavigateToCreate && !isStudent && (
              <button
                type="button"
                onClick={onNavigateToCreate}
                className="px-4 py-2 bg-[#2F6FED] hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                + Ajouter un enseignant
              </button>
            )}
          </div>
        </div>

        {/* 2. 4 CARTES D'INDICATEURS KPI (Section 3 PDF) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setFilterStatus('ALL')}
            className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
              filterStatus === 'ALL'
                ? 'bg-[#17345B]/5 border-[#17345B]'
                : 'bg-[#F5F7FA] border-[#DCE3EC] hover:border-slate-300'
            }`}
          >
            <span className="text-[11px] font-bold uppercase text-slate-500 block">Enseignants</span>
            <span className="text-xl font-black text-[#16202A] mt-0.5 block">{kpiMetrics.total}</span>
            <span className="text-[11px] text-slate-500">Corps enseignant rattaché</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus(filterStatus === 'ACTIVE' ? 'ALL' : 'ACTIVE')}
            className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
              filterStatus === 'ACTIVE'
                ? 'bg-[#1F8A83]/10 border-[#1F8A83]'
                : 'bg-[#F5F7FA] border-[#DCE3EC] hover:border-slate-300'
            }`}
          >
            <span className="text-[11px] font-bold uppercase text-[#1F8A83] block">Actifs</span>
            <span className="text-xl font-black text-[#1F8A83] mt-0.5 block">{kpiMetrics.active}</span>
            <span className="text-[11px] text-slate-500">Comptes actifs & autorisés</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus(filterStatus === 'INCOMPLETE' ? 'ALL' : 'INCOMPLETE')}
            className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
              filterStatus === 'INCOMPLETE'
                ? 'bg-[#D58A18]/15 border-[#D58A18]'
                : 'bg-[#F5F7FA] border-[#DCE3EC] hover:border-slate-300'
            }`}
          >
            <span className="text-[11px] font-bold uppercase text-[#D58A18] block">À compléter</span>
            <span className="text-xl font-black text-[#D58A18] mt-0.5 block">{kpiMetrics.incomplete}</span>
            <span className="text-[11px] text-slate-500">Fiches à vérifier (tél, grade, CIN)</span>
          </button>

          <div className="p-3.5 rounded-xl border bg-[#F5F7FA] border-[#DCE3EC]">
            <span className="text-[11px] font-bold uppercase text-slate-500 block">En surcharge (&gt; quota)</span>
            <span className="text-xl font-black text-rose-700 mt-0.5 block">{kpiMetrics.overloaded}</span>
            <span className="text-[11px] text-slate-500">Dépassement du quota hebdo</span>
          </div>
        </div>

        {/* 3. BARRE DE RECHERCHE & FILTRES FRÉQUENTS (Section 3 PDF) */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher un enseignant par nom, e-mail, grade, matière..."
              className="w-full pl-9 pr-4 py-2 bg-[#F5F7FA] border border-[#DCE3EC] rounded-xl text-xs font-medium focus:bg-white focus:border-[#2F6FED] outline-none"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-3 py-2 bg-[#F5F7FA] border border-[#DCE3EC] rounded-xl text-xs font-semibold text-[#16202A]"
          >
            <option value="ALL">Tous les statuts ({kpiMetrics.total})</option>
            <option value="ACTIVE">Actifs ({kpiMetrics.active})</option>
            <option value="INCOMPLETE">À compléter ({kpiMetrics.incomplete})</option>
            <option value="SUSPENDED">Suspendus / Inactifs</option>
          </select>

          <select
            value={filterContract}
            onChange={(e) => setFilterContract(e.target.value as any)}
            className="px-3 py-2 bg-[#F5F7FA] border border-[#DCE3EC] rounded-xl text-xs font-semibold text-[#16202A]"
          >
            <option value="ALL">Tous les contrats</option>
            <option value="PERMANENT">Permanent</option>
            <option value="VACATAIRE">Vacataire</option>
            <option value="MISSIONNAIRE">Missionnaire / Visiteur</option>
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setFilterStatus('ALL');
                setFilterContract('ALL');
              }}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Réinitialiser les filtres
            </button>
          )}
        </div>
      </div>

      {/* SUIVI DES HEURES SUPPLÉMENTAIRES À PAYER & ALERTES DE SURCHARGE / INDISPONIBILITÉS */}
      {!isStudent && (
        <div className="bg-white rounded-2xl p-5 border border-[#DCE3EC] shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#D58A18] block">
                Contrôle de Charge Hebdomadaire, Indisponibilités & Vacations
              </span>
              <h3 className="text-sm font-black text-[#16202A]">
                Alertes de Surcharge Enseignant & Suivi des Heures Supplémentaires
              </h3>
            </div>
            {canViewFinancialPayroll && (
              <button
                type="button"
                onClick={() => {
                  const headers = [
                    'Enseignant',
                    'Contrat',
                    'Quota Hebdo Max (h)',
                    'Heures Planifiées (h)',
                    'Heures Réalisées (h)',
                    'Heures Supplémentaires (h)',
                    'Taux Horaire (Ar/h)',
                    'Montant Heures Sup. à Payer (Ar)',
                    'Total Paie Validée (Ar)',
                    'Conflits Indisponibilité Déclarée',
                  ];
                  const rows = teachers.map((t) => {
                    const st = getTeacherHourlyStats(t.id);
                    const rate = t.hourlyRateAr || 40000;
                    const overtimeH = Math.max(0, st.totalCompleted - st.maxWeekly);
                    const availGrid = buildWideAvailabilities(t.availabilities);
                    const unavailDays = DEFAULT_WEEK_DAYS.filter((d) =>
                      availGrid.filter((a) => a.day === d).some((a) => !a.available)
                    );
                    return [
                      t.name,
                      t.contractType || 'VACATAIRE',
                      st.maxWeekly,
                      st.totalScheduled,
                      st.totalCompleted,
                      overtimeH,
                      rate,
                      overtimeH * rate,
                      st.totalCompleted * rate,
                      unavailDays.length > 0 ? `Indisponible sur certains créneaux (${unavailDays.join(', ')})` : 'RAS',
                    ];
                  });
                  downloadCsvFile('Suivi_Heures_Supplementaires_et_Surcharges_Enseignants.csv', headers, rows);
                }}
                className="px-3 py-1.5 rounded-xl bg-[#D58A18] hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer self-start"
              >
                <Download className="w-3.5 h-3.5" />
                Exporter État Heures Sup. (CSV)
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F5F7FA] border-b border-[#DCE3EC] text-[10px] font-bold uppercase text-slate-500">
                  <th className="py-2.5 px-3">Enseignant</th>
                  <th className="py-2.5 px-3">Statut Fiche</th>
                  <th className="py-2.5 px-3 text-center">Quota Hebdo</th>
                  <th className="py-2.5 px-3 text-center">Planifiées / Validées</th>
                  <th className="py-2.5 px-3 text-center">Heures Sup.</th>
                  {canViewFinancialPayroll && (
                    <th className="py-2.5 px-3 text-right">Heures Sup. à Payer (Ar)</th>
                  )}
                  <th className="py-2.5 px-3">Alerte Surcharge / Indisponibilité</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {teachers.map((t) => {
                  const st = getTeacherHourlyStats(t.id);
                  const rate = t.hourlyRateAr || 40000;
                  const overtimeCompleted = Math.max(0, st.totalCompleted - st.maxWeekly);
                  const overtimeScheduled = Math.max(0, st.totalScheduled - st.maxWeekly);
                  const effectiveOvertime = Math.max(overtimeCompleted, overtimeScheduled);
                  const overtimePayAr = effectiveOvertime * rate;
                  const availGrid = buildWideAvailabilities(t.availabilities);
                  const unavailableSlotsCount = availGrid.filter((a) => !a.available).length;
                  const isOverloaded = st.totalScheduled > st.maxWeekly || st.totalCompleted > st.maxWeekly;
                  const incomplete = isTeacherIncomplete(t);

                  return (
                    <tr
                      key={t.id}
                      onClick={() => handleOpenTeacherModal(t, false)}
                      className="hover:bg-slate-50 cursor-pointer"
                    >
                      <td className="py-2.5 px-3 font-bold text-[#16202A]">
                        {t.civilite ? `${t.civilite} ` : ''}{t.name}
                        <span className="block text-[10px] font-normal text-slate-500">
                          {canViewFinancialPayroll ? `${rate.toLocaleString('fr-FR')} Ar/h • ` : ''}
                          {t.contractType || 'VACATAIRE'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        {!t.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px]">
                            Suspendu
                          </span>
                        ) : incomplete ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#D58A18]/15 text-[#D58A18] border border-[#D58A18]/30 font-bold text-[10px]">
                            À compléter
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#1F8A83]/15 text-[#1F8A83] border border-[#1F8A83]/30 font-bold text-[10px]">
                            Actif
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700 tabular-nums">
                        {st.maxWeekly} h
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800 tabular-nums">
                        {st.totalScheduled}h / <span className="text-[#1F8A83]">{st.totalCompleted}h</span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-black tabular-nums">
                        {effectiveOvertime > 0 ? (
                          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                            +{effectiveOvertime} h
                          </span>
                        ) : (
                          <span className="text-slate-400">0 h</span>
                        )}
                      </td>
                      {canViewFinancialPayroll && (
                        <td className="py-2.5 px-3 text-right font-mono font-black text-amber-800 tabular-nums">
                          {overtimePayAr > 0 ? `${overtimePayAr.toLocaleString('fr-FR')} Ar` : '0 Ar'}
                        </td>
                      )}
                      <td className="py-2.5 px-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {isOverloaded ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px]">
                              <AlertTriangle className="w-3 h-3" />
                              Surcharge (+{effectiveOvertime}h &gt; {st.maxWeekly}h)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                              Charge normale
                            </span>
                          )}
                          {unavailableSlotsCount > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 font-semibold text-[10px]">
                              {unavailableSlotsCount} créneau(x) indisponible(s)
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Teachers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teachers.map((teacher) => {
          const stats = getTeacherHourlyStats(teacher.id);
          const isOverCapacity = stats.totalScheduled > stats.maxWeekly;
          const hourlyRate = teacher.hourlyRateAr || 40000;
          const availGrid = buildWideAvailabilities(teacher.availabilities);
          const availableCount = availGrid.filter((a) => a.available).length;
          const incomplete = isTeacherIncomplete(teacher);

          return (
            <div
              key={teacher.id}
              onClick={() => handleOpenTeacherModal(teacher, false)}
              className="bg-white rounded-2xl p-4 shadow-xs border border-[#DCE3EC] flex flex-col justify-between transition-all hover:shadow-md hover:border-[#2F6FED] cursor-pointer group"
            >
              <div>
                {/* Profile Header */}
                <div className="flex items-start gap-3 pb-3 border-b border-slate-100">
                  <div className="w-12 h-12 rounded-xl bg-[#17345B]/10 text-[#17345B] flex items-center justify-center font-bold text-base border border-[#17345B]/20 flex-shrink-0 shadow-xs group-hover:bg-[#17345B] group-hover:text-white transition-colors">
                    {teacher.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <h3 className="text-sm font-bold text-[#16202A] truncate group-hover:text-[#2F6FED]">
                        {teacher.civilite ? `${teacher.civilite} ` : ''}{teacher.name}
                      </h3>
                      <div className="flex items-center gap-1 shrink-0">
                        {!teacher.isActive ? (
                          <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded text-[9px] font-bold">
                            Suspendu
                          </span>
                        ) : incomplete ? (
                          <span className="px-2 py-0.5 bg-[#D58A18]/15 text-[#D58A18] rounded text-[9px] font-bold">
                            À compléter
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-[#1F8A83]/15 text-[#1F8A83] rounded text-[9px] font-bold">
                            Actif
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-[11px] font-semibold text-[#17345B] truncate">
                      {teacher.academicRank || 'Grade non renseigné'} • {teacher.contractType || 'VACATAIRE'}
                    </p>
                    <p className="text-xs text-slate-500 truncate flex items-center gap-1 mt-0.5">
                      <Mail className="w-3 h-3 text-slate-400" /> {teacher.email}
                    </p>
                    {teacher.phone ? (
                      <p className="text-xs text-slate-500 truncate flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" /> {teacher.phone}
                      </p>
                    ) : (
                      <p className="text-[11px] text-amber-600 italic mt-0.5">Téléphone non renseigné</p>
                    )}
                  </div>
                </div>

                {/* Subjects list */}
                <div className="mt-3">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                    Matières enseignées
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {teacher.subjects && teacher.subjects.length > 0 ? (
                      teacher.subjects.map((sub, i) => (
                        <span
                          key={i}
                          className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium"
                        >
                          {sub}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">Aucune matière rattachée</span>
                    )}
                  </div>
                </div>

                {/* Hourly Stats & Hourly Rate */}
                <div className={`grid ${canViewFinancialPayroll ? 'grid-cols-3' : 'grid-cols-2'} gap-2 mt-4 text-xs`}>
                  <div className="bg-[#F5F7FA] p-2 rounded-xl border border-[#DCE3EC] text-center">
                    <span className="text-[9px] text-slate-500 uppercase block font-semibold">Programmées</span>
                    <span className="text-xs font-bold text-[#17345B]">{stats.totalScheduled} h</span>
                  </div>
                  <div className="bg-[#F5F7FA] p-2 rounded-xl border border-[#DCE3EC] text-center">
                    <span className="text-[9px] text-slate-500 uppercase block font-semibold">Validées</span>
                    <span className="text-xs font-bold text-[#1F8A83]">{stats.totalCompleted} h</span>
                  </div>
                  {canViewFinancialPayroll && (
                    <div className="bg-[#1F8A83]/10 p-2 rounded-xl border border-[#1F8A83]/30 text-center">
                      <span className="text-[9px] text-[#1F8A83] uppercase block font-bold">Taux Horaire</span>
                      <span className="text-xs font-black text-[#16202A]">
                        {hourlyRate.toLocaleString()} Ar/h
                      </span>
                    </div>
                  )}
                </div>

                {/* Availability preview (07h00 - 17h00) */}
                <div className="mt-3 p-2.5 bg-[#F5F7FA] rounded-xl border border-[#DCE3EC]">
                  <div className="flex items-center justify-between text-[10px] mb-1.5">
                    <span className="font-bold text-slate-700 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-[#2F6FED]" />
                      Disponibilités (07h–17h) :
                    </span>
                    <span className="font-bold text-[#1F8A83]">
                      {availableCount} / {availGrid.length} plages libres
                    </span>
                  </div>
                  <div className="grid grid-cols-6 gap-1 text-[9px] text-center">
                    {DEFAULT_WEEK_DAYS.map((d) => {
                      const daySlots = availGrid.filter((a) => a.day === d);
                      const availInDay = daySlots.filter((a) => a.available).length;
                      return (
                        <div
                          key={d}
                          className={`py-1 rounded font-bold border ${
                            availInDay === daySlots.length
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : availInDay > 0
                              ? 'bg-amber-100 text-amber-800 border-amber-200'
                              : 'bg-rose-100 text-rose-700 border-rose-200'
                          }`}
                          title={`${d}: ${availInDay}/${daySlots.length} créneaux disponibles entre 07h00 et 17h00`}
                        >
                          {d.slice(0, 3)}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Overtime warning if applicable */}
                {isOverCapacity && (
                  <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-1.5 font-medium">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span>Dépassement de charge hebdomadaire (&gt; {stats.maxWeekly}h max).</span>
                  </div>
                )}
              </div>

              {/* Footer status summary */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#2F6FED]" />
                  Quota : {stats.maxWeekly}h/sem.
                </span>
                <span className="text-[#2F6FED] font-bold flex items-center gap-1 group-hover:underline">
                  <Eye className="w-3.5 h-3.5" />
                  Consulter la fiche →
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* =======================================================================
          4. FICHE ENSEIGNANT EN 4 ONGLETS (Section 4 du PDF : Identité, Coordonnées, Informations métier, Compte & sécurité)
             - Ouverture en mode consultation par défaut
             - Bouton explicite « Modifier le profil »
             - Zéro valeur personnelle fictive par défaut
             - Indicateur de modifications non enregistrées & pied de modale fixe
         ======================================================================= */}
      {activeTeacher && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-[#DCE3EC] overflow-hidden my-4 max-h-[92vh] flex flex-col">
            {/* Modal Header (#17345B Institutional Navy) */}
            <div className="p-5 bg-[#17345B] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center font-black text-xl shrink-0">
                  {activeTeacher.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-white/15 text-white rounded-md text-[10px] font-bold uppercase tracking-wider">
                      Fiche Enseignant
                    </span>
                    <span className="px-2.5 py-0.5 bg-[#2F6FED] text-white rounded-md text-[10px] font-bold uppercase">
                      {activeTeacher.contractType || 'VACATAIRE'}
                    </span>
                    {activeTeacher.isActive ? (
                      <span className="px-2.5 py-0.5 bg-[#1F8A83] text-white rounded-md text-[10px] font-bold">
                        Actif
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 bg-rose-600 text-white rounded-md text-[10px] font-bold">
                        Suspendu
                      </span>
                    )}
                    {isEditingTeacherSheet && isTeacherDirty && (
                      <span className="px-2.5 py-0.5 bg-[#D58A18] text-white rounded-md text-[10px] font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Modifications non enregistrées
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-black mt-1">
                    {activeTeacher.civilite ? `${activeTeacher.civilite} ` : ''}{activeTeacher.name}
                  </h3>
                  <p className="text-xs text-slate-300">
                    {activeTeacher.academicRank || 'Grade non renseigné'} • {activeTeacher.department || 'Département non renseigné'} •{' '}
                    {activeTeacher.email}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                {canEditActiveTeacher && !isEditingTeacherSheet && (
                  <button
                    type="button"
                    onClick={() => setIsEditingTeacherSheet(true)}
                    className="px-3.5 py-2 bg-[#2F6FED] hover:bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Modifier le profil
                  </button>
                )}
                {isEditingTeacherSheet && (
                  <span className="px-3 py-1.5 bg-white/10 text-blue-200 rounded-xl text-xs font-bold">
                    Mode édition actif
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleCloseTeacherModal}
                  className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl cursor-pointer"
                  title="Fermer la fiche"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 4 Standardized Tabs Bar (Section 4 of PDF) */}
            <div className="flex overflow-x-auto border-b border-[#DCE3EC] bg-[#F5F7FA] px-5 pt-2 text-xs font-bold gap-2">
              <button
                type="button"
                onClick={() => setSheetTab('IDENTITY')}
                className={`py-2.5 px-3.5 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  sheetTab === 'IDENTITY'
                    ? 'border-[#2F6FED] text-[#2F6FED] bg-white rounded-t-xl'
                    : 'border-transparent text-slate-600 hover:text-[#16202A]'
                }`}
              >
                <UserIcon className="w-3.5 h-3.5" />
                1. Identité
              </button>
              <button
                type="button"
                onClick={() => setSheetTab('CONTACT')}
                className={`py-2.5 px-3.5 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  sheetTab === 'CONTACT'
                    ? 'border-[#2F6FED] text-[#2F6FED] bg-white rounded-t-xl'
                    : 'border-transparent text-slate-600 hover:text-[#16202A]'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                2. Coordonnées
              </button>
              <button
                type="button"
                onClick={() => setSheetTab('PROFESSIONAL')}
                className={`py-2.5 px-3.5 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  sheetTab === 'PROFESSIONAL'
                    ? 'border-[#2F6FED] text-[#2F6FED] bg-white rounded-t-xl'
                    : 'border-transparent text-slate-600 hover:text-[#16202A]'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                3. Informations métier (Disponibilités, CV & Paie)
              </button>
              <button
                type="button"
                onClick={() => setSheetTab('SECURITY')}
                className={`py-2.5 px-3.5 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  sheetTab === 'SECURITY'
                    ? 'border-[#2F6FED] text-[#2F6FED] bg-white rounded-t-xl'
                    : 'border-transparent text-slate-600 hover:text-[#16202A]'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                4. Compte & sécurité
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex-1 overflow-y-auto space-y-5 text-xs">
              {saveFeedback && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-bold flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{saveFeedback}</span>
                </div>
              )}

              {/* ONGLET 1 : IDENTITÉ */}
              {sheetTab === 'IDENTITY' && (
                <div className="space-y-4">
                  <div className="border-b border-slate-100 pb-2">
                    <h4 className="text-sm font-black text-[#16202A]">État civil & identité universitaire</h4>
                    <p className="text-[11px] text-slate-500">
                      Informations personnelles officielles. Aucun champ inconnu n’est pré-rempli avec des valeurs fictives.
                    </p>
                  </div>

                  {!isEditingTeacherSheet ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {renderReadOnlyField('Civilité', activeTeacher.civilite)}
                      {renderReadOnlyField('Nom & Prénom(s) officiels', activeTeacher.name)}
                      {renderReadOnlyField('Grade universitaire', activeTeacher.academicRank)}
                      {renderReadOnlyField('Date de naissance', activeTeacher.birthDate)}
                      {renderReadOnlyField('Lieu de naissance', activeTeacher.birthPlace)}
                      {!isStudent && renderReadOnlyField('Numéro CIN / Pièce d’identité', activeTeacher.cin, true)}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 bg-[#F5F7FA] p-4 rounded-2xl border border-[#DCE3EC]">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Civilité</label>
                        <select
                          value={editCivilite}
                          onChange={(e) => {
                            setEditCivilite(e.target.value as any);
                            setIsTeacherDirty(true);
                          }}
                          className="w-full p-2.5 bg-white border border-[#DCE3EC] rounded-xl font-bold text-[#16202A]"
                        >
                          <option value="Prof.">Prof.</option>
                          <option value="Dr.">Dr.</option>
                          <option value="M.">M.</option>
                          <option value="Mme">Mme</option>
                          <option value="Mlle">Mlle</option>
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                          Nom & Prénom(s) officiels *
                        </label>
                        <input
                          type="text"
                          required
                          value={editName}
                          onChange={(e) => {
                            setEditName(e.target.value);
                            setIsTeacherDirty(true);
                          }}
                          placeholder="Ex: Rakotoarisoa Hery"
                          className="w-full p-2.5 bg-white border border-[#DCE3EC] rounded-xl font-bold text-[#16202A]"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                          Grade universitaire
                        </label>
                        <select
                          value={editAcademicRank}
                          onChange={(e) => {
                            setEditAcademicRank(e.target.value);
                            setIsTeacherDirty(true);
                          }}
                          className="w-full p-2.5 bg-white border border-[#DCE3EC] rounded-xl font-semibold text-[#16202A]"
                        >
                          <option value="">-- Non renseigné --</option>
                          <option value="Professeur Titulaire">Professeur Titulaire</option>
                          <option value="Maître de Conférences">Maître de Conférences</option>
                          <option value="Assistant d'Enseignement Supérieur">Assistant d'ESR</option>
                          <option value="Enseignant-Chercheur">Enseignant-Chercheur</option>
                          <option value="Chargé de Cours / Expert Pro">Chargé de Cours / Expert Pro</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                          Date de naissance
                        </label>
                        <input
                          type="date"
                          value={editBirthDate}
                          onChange={(e) => {
                            setEditBirthDate(e.target.value);
                            setIsTeacherDirty(true);
                          }}
                          className="w-full p-2.5 bg-white border border-[#DCE3EC] rounded-xl"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                          Lieu de naissance
                        </label>
                        <input
                          type="text"
                          value={editBirthPlace}
                          onChange={(e) => {
                            setEditBirthPlace(e.target.value);
                            setIsTeacherDirty(true);
                          }}
                          placeholder="Ville / Pays de naissance"
                          className="w-full p-2.5 bg-white border border-[#DCE3EC] rounded-xl"
                        />
                      </div>

                      {!isStudent && (
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                            Numéro CIN
                          </label>
                          <input
                            type="text"
                            value={editCin}
                            onChange={(e) => {
                              setEditCin(e.target.value);
                              setIsTeacherDirty(true);
                            }}
                            placeholder="101 231..."
                            className="w-full p-2.5 bg-white border border-[#DCE3EC] rounded-xl font-mono"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ONGLET 2 : COORDONNÉES */}
              {sheetTab === 'CONTACT' && (
                <div className="space-y-4">
                  <div className="border-b border-slate-100 pb-2">
                    <h4 className="text-sm font-black text-[#16202A]">Coordonnées de contact & localisation</h4>
                    <p className="text-[11px] text-slate-500">
                      Moyens de contact direct pour la scolarité, l’administration et les notifications de cours.
                    </p>
                  </div>

                  {!isEditingTeacherSheet ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {renderReadOnlyField('Adresse e-mail professionnelle', activeTeacher.email)}
                      {renderReadOnlyField('Téléphone principal', activeTeacher.phone)}
                      {renderReadOnlyField('Téléphone secondaire / WhatsApp', activeTeacher.secondaryPhone)}
                      {renderReadOnlyField('Bureau / Salle des professeurs', activeTeacher.officeLocation)}
                      {renderReadOnlyField('Adresse postale', activeTeacher.address)}
                      {renderReadOnlyField('Ville', activeTeacher.city)}
                      {renderReadOnlyField('Contact d’urgence', activeTeacher.emergencyContact)}
                      {renderReadOnlyField('Profil LinkedIn / ORCID', activeTeacher.linkedInUrl || activeTeacher.orcidUrl)}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 bg-[#F5F7FA] p-4 rounded-2xl border border-[#DCE3EC]">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                          Email professionnel *
                        </label>
                        <input
                          type="email"
                          required
                          value={editEmail}
                          onChange={(e) => {
                            setEditEmail(e.target.value);
                            setIsTeacherDirty(true);
                          }}
                          className="w-full p-2.5 bg-white border border-[#DCE3EC] rounded-xl font-semibold"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                          Téléphone principal
                        </label>
                        <input
                          type="tel"
                          value={editPhone}
                          onChange={(e) => {
                            setEditPhone(e.target.value);
                            setIsTeacherDirty(true);
                          }}
                          placeholder="Saisir le numéro"
                          className="w-full p-2.5 bg-white border border-[#DCE3EC] rounded-xl"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                          Téléphone secondaire / WhatsApp
                        </label>
                        <input
                          type="tel"
                          value={editSecondaryPhone}
                          onChange={(e) => {
                            setEditSecondaryPhone(e.target.value);
                            setIsTeacherDirty(true);
                          }}
                          placeholder="Optionnel"
                          className="w-full p-2.5 bg-white border border-[#DCE3EC] rounded-xl"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                          Bureau / Salle des professeurs
                        </label>
                        <input
                          type="text"
                          value={editOfficeLocation}
                          onChange={(e) => {
                            setEditOfficeLocation(e.target.value);
                            setIsTeacherDirty(true);
                          }}
                          placeholder="Ex: Bâtiment A - Bureau 204"
                          className="w-full p-2.5 bg-white border border-[#DCE3EC] rounded-xl"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                          Adresse domicile
                        </label>
                        <input
                          type="text"
                          value={editAddress}
                          onChange={(e) => {
                            setEditAddress(e.target.value);
                            setIsTeacherDirty(true);
                          }}
                          placeholder="Lot / Quartier"
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
                            setIsTeacherDirty(true);
                          }}
                          placeholder="Ville de résidence"
                          className="w-full p-2.5 bg-white border border-[#DCE3EC] rounded-xl"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                          Contact d’urgence
                        </label>
                        <input
                          type="text"
                          value={editEmergencyContact}
                          onChange={(e) => {
                            setEditEmergencyContact(e.target.value);
                            setIsTeacherDirty(true);
                          }}
                          placeholder="Nom & téléphone d'urgence"
                          className="w-full p-2.5 bg-white border border-[#DCE3EC] rounded-xl"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                          Lien LinkedIn / ORCID
                        </label>
                        <input
                          type="text"
                          value={editLinkedIn || editOrcid}
                          onChange={(e) => {
                            setEditLinkedIn(e.target.value);
                            setIsTeacherDirty(true);
                          }}
                          placeholder="https://linkedin.com/in/..."
                          className="w-full p-2.5 bg-white border border-[#DCE3EC] rounded-xl"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ONGLET 3 : INFORMATIONS MÉTIER (QUALIFICATIONS, CV, DISPONIBILITÉS 07h-17h, PAIE & SÉANCES) */}
              {sheetTab === 'PROFESSIONAL' && (
                <div className="space-y-5">
                  {/* 3A. Qualifications, Contrat & Matières */}
                  <div className="space-y-3">
                    <div className="border-b border-slate-100 pb-2">
                      <h4 className="text-sm font-black text-[#16202A]">
                        Qualifications académiques, contrat & matières enseignées
                      </h4>
                    </div>

                    {!isEditingTeacherSheet ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {renderReadOnlyField('Spécialité académique', activeTeacher.specialty)}
                        {renderReadOnlyField('Diplôme le plus élevé', activeTeacher.highestDiploma)}
                        {renderReadOnlyField('Université d’origine (Alma Mater)', activeTeacher.almaMater)}
                        {renderReadOnlyField('Département / Pôle', activeTeacher.department)}
                        {renderReadOnlyField('Type de contrat', activeTeacher.contractType || 'VACATAIRE')}
                        {renderReadOnlyField('Quota horaire max / semaine', `${activeTeacher.weeklyMaxHours || 18} h`)}
                        <div className="sm:col-span-2 lg:col-span-3">
                          {renderReadOnlyField(
                            'Matières / EC enseignés',
                            activeTeacher.subjects && activeTeacher.subjects.length > 0
                              ? activeTeacher.subjects.join(', ')
                              : undefined
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 bg-[#F5F7FA] p-4 rounded-2xl border border-[#DCE3EC]">
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                            Spécialité académique
                          </label>
                          <input
                            type="text"
                            value={editSpecialty}
                            onChange={(e) => {
                              setEditSpecialty(e.target.value);
                              setIsTeacherDirty(true);
                            }}
                            placeholder="Génie Logiciel, IA, Finance..."
                            className="w-full p-2.5 bg-white border border-[#DCE3EC] rounded-xl font-semibold"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                            Diplôme le plus élevé
                          </label>
                          <input
                            type="text"
                            value={editHighestDiploma}
                            onChange={(e) => {
                              setEditHighestDiploma(e.target.value);
                              setIsTeacherDirty(true);
                            }}
                            placeholder="Doctorat (PhD), HDR, Master..."
                            className="w-full p-2.5 bg-white border border-[#DCE3EC] rounded-xl"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                            Université d’origine
                          </label>
                          <input
                            type="text"
                            value={editAlmaMater}
                            onChange={(e) => {
                              setEditAlmaMater(e.target.value);
                              setIsTeacherDirty(true);
                            }}
                            placeholder="Établissement d'obtention du diplôme"
                            className="w-full p-2.5 bg-white border border-[#DCE3EC] rounded-xl"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                            Département / Pôle EBM
                          </label>
                          <input
                            type="text"
                            value={editDepartment}
                            onChange={(e) => {
                              setEditDepartment(e.target.value);
                              setIsTeacherDirty(true);
                            }}
                            placeholder="Pôle Technologies Numériques..."
                            className="w-full p-2.5 bg-white border border-[#DCE3EC] rounded-xl"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                            Quota horaire max (h/semaine)
                          </label>
                          <input
                            type="number"
                            min="2"
                            max="40"
                            value={editWeeklyMax}
                            onChange={(e) => {
                              setEditWeeklyMax(Number(e.target.value));
                              setIsTeacherDirty(true);
                            }}
                            className="w-full p-2.5 bg-white border border-[#DCE3EC] rounded-xl font-bold"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                            Date de prise de fonction
                          </label>
                          <input
                            type="date"
                            value={editHireDate}
                            onChange={(e) => {
                              setEditHireDate(e.target.value);
                              setIsTeacherDirty(true);
                            }}
                            className="w-full p-2.5 bg-white border border-[#DCE3EC] rounded-xl"
                          />
                        </div>

                        <div className="sm:col-span-2 lg:col-span-3">
                          <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                            Matières / EC enseignés (séparés par une virgule)
                          </label>
                          <input
                            type="text"
                            value={editSubjectsText}
                            onChange={(e) => {
                              setEditSubjectsText(e.target.value);
                              setIsTeacherDirty(true);
                            }}
                            placeholder="Architecture Logicielle, Base de Données, Intelligence Artificielle..."
                            className="w-full p-2.5 bg-white border border-[#DCE3EC] rounded-xl"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 3B. Paie & Rémunération (Strictement restreint à ADMIN, FINANCE, SCOLARITE, SCHEDULER — Règle PDF) */}
                  {canViewFinancialPayroll && (
                    <div className="bg-[#F5F7FA] p-4 rounded-2xl border border-[#DCE3EC] space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                        <div className="flex items-center gap-2">
                          <Banknote className="w-4 h-4 text-[#1F8A83]" />
                          <div>
                            <h5 className="font-black text-xs text-[#16202A]">
                              Données financières & Paie des vacations (Accès habilité Administration / Finances)
                            </h5>
                          </div>
                        </div>
                        <span className="font-mono text-[11px] font-bold text-[#17345B] bg-white px-2.5 py-1 rounded-lg border border-[#DCE3EC]">
                          RIB : {activeTeacher.bankRib || 'Non renseigné'}
                        </span>
                      </div>

                      {(() => {
                        const stats = getTeacherHourlyStats(activeTeacher.id);
                        const rate = activeTeacher.hourlyRateAr || 40000;
                        const payCompletedAr = stats.totalCompleted * rate;
                        const payScheduledAr = stats.totalScheduled * rate;
                        return (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="bg-white p-3 rounded-xl border border-[#DCE3EC]">
                              <span className="text-[10px] font-bold uppercase text-slate-500 block">Taux Horaire</span>
                              <span className="text-base font-black text-[#1F8A83]">{rate.toLocaleString()} Ar / h</span>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-[#DCE3EC]">
                              <span className="text-[10px] font-bold uppercase text-slate-500 block">
                                Heures Validées ({stats.totalCompleted}h)
                              </span>
                              <span className="text-base font-black text-[#16202A]">
                                {payCompletedAr.toLocaleString()} Ar
                              </span>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-[#DCE3EC]">
                              <span className="text-[10px] font-bold uppercase text-slate-500 block">
                                Semaine Planifiée ({stats.totalScheduled}h)
                              </span>
                              <span className="text-base font-black text-[#17345B]">
                                {payScheduledAr.toLocaleString()} Ar
                              </span>
                            </div>
                          </div>
                        );
                      })()}

                      {isEditingTeacherSheet && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200">
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                              Taux Horaire (Ar/h)
                            </label>
                            <input
                              type="number"
                              step="1000"
                              min="5000"
                              value={editHourlyRate}
                              onChange={(e) => {
                                setEditHourlyRate(Number(e.target.value));
                                setIsTeacherDirty(true);
                              }}
                              className="w-full p-2 bg-white border border-[#DCE3EC] rounded-xl font-black text-[#1F8A83]"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                              Type de contrat
                            </label>
                            <select
                              value={editContractType}
                              onChange={(e) => {
                                setEditContractType(e.target.value as any);
                                setIsTeacherDirty(true);
                              }}
                              className="w-full p-2 bg-white border border-[#DCE3EC] rounded-xl font-bold"
                            >
                              <option value="PERMANENT">Permanent</option>
                              <option value="VACATAIRE">Vacataire</option>
                              <option value="MISSIONNAIRE">Missionnaire</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                              RIB / Compte bancaire ou Mobile Money
                            </label>
                            <input
                              type="text"
                              value={editBankRib}
                              onChange={(e) => {
                                setEditBankRib(e.target.value);
                                setIsTeacherDirty(true);
                              }}
                              placeholder="BNI / BOA / MVola..."
                              className="w-full p-2 bg-white border border-[#DCE3EC] rounded-xl font-mono"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 3C. CV Académique */}
                  <div className="p-4 bg-[#F5F7FA] border border-[#DCE3EC] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-black text-[#16202A] flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-[#2F6FED]" />
                        Curriculum Vitae (CV Académique & Universitaire)
                      </span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        {editCvFileName ? (
                          <>
                            Fichier enregistré : <strong className="text-[#1F8A83]">{editCvFileName}</strong>
                            {editCvUploadedAt ? ` • Déposé le ${editCvUploadedAt}` : ''}
                          </>
                        ) : (
                          'Aucun CV déposé sur cette fiche enseignant (Formats : PDF, DOCX)'
                        )}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {editCvFileName && (
                        <button
                          type="button"
                          onClick={() => {
                            const a = document.createElement('a');
                            if (editCvFileUrl) {
                              a.href = editCvFileUrl;
                            } else {
                              const content = `CURRICULUM VITAE OFFICIEL - EBM INSTITUTE\nEnseignant : ${editCivilite} ${editName}\nGrade : ${editAcademicRank || 'Non renseigné'}\nDiplôme : ${editHighestDiploma || 'Non renseigné'}\nUniversité : ${editAlmaMater || 'Non renseigné'}\nSpécialité : ${editSpecialty || 'Non renseigné'}`;
                              a.href = URL.createObjectURL(new Blob([content], { type: 'application/pdf' }));
                            }
                            a.download = editCvFileName;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                          }}
                          className="px-3 py-1.5 bg-white hover:bg-slate-50 text-[#1F8A83] border border-[#1F8A83]/40 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Télécharger CV
                        </button>
                      )}

                      {canEditActiveTeacher && (
                        <label className="px-3.5 py-1.5 bg-[#2F6FED] hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs">
                          <Upload className="w-3.5 h-3.5" />
                          <span>{editCvFileName ? 'Remplacer le CV' : 'Déposer un CV (PDF/DOCX)'}</span>
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const nowStr = new Date().toLocaleDateString('fr-FR');
                                const url = URL.createObjectURL(file);
                                setEditCvFileName(file.name);
                                setEditCvFileUrl(url);
                                setEditCvUploadedAt(nowStr);
                                updateTeacher(activeTeacher.id, {
                                  cvFileName: file.name,
                                  cvFileUrl: url,
                                  cvUploadedAt: nowStr,
                                });
                                setSaveFeedback(`CV "${file.name}" rattaché à la fiche de ${activeTeacher.name}.`);
                              }
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* 3D. Grille de Disponibilités Hebdomadaires (07h00–17h00) */}
                  <div className="bg-white rounded-2xl border border-[#DCE3EC] p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-xs text-[#16202A] flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-[#2F6FED]" />
                          Disponibilités hebdomadaires de l’enseignant (07h00 à 17h00)
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Cliquez sur un créneau pour basculer entre Disponible et Indisponible.
                        </p>
                      </div>
                    </div>

                    {(() => {
                      const grid = buildWideAvailabilities(activeTeacher.availabilities);
                      return (
                        <div className="overflow-x-auto border border-[#DCE3EC] rounded-xl">
                          <table className="w-full text-center border-collapse text-xs">
                            <thead className="bg-[#F5F7FA] border-b border-[#DCE3EC] text-slate-600 font-bold uppercase text-[10px]">
                              <tr>
                                <th className="p-2.5 text-left">Plage (07h00 – 17h00)</th>
                                {DEFAULT_WEEK_DAYS.map((day) => (
                                  <th key={day} className="p-2">
                                    <div className="font-black text-[#16202A]">{day}</div>
                                    {canEditActiveTeacher && (
                                      <div className="flex items-center justify-center gap-1 mt-1">
                                        <button
                                          type="button"
                                          onClick={() => handleSetFullDayAvailability(activeTeacher, day, true)}
                                          className="px-1.5 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded text-[9px] font-bold cursor-pointer"
                                        >
                                          07h–17h ✓
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleSetFullDayAvailability(activeTeacher, day, false)}
                                          className="px-1.5 py-0.5 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded text-[9px] font-bold cursor-pointer"
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    )}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {WIDE_TEACHER_SLOTS.map(({ code, label }) => (
                                <tr key={code}>
                                  <td className="p-2 text-left font-bold text-slate-800 bg-slate-50/60 whitespace-nowrap">
                                    {label}
                                  </td>
                                  {DEFAULT_WEEK_DAYS.map((day) => {
                                    const cell = grid.find((a) => a.day === day && a.slot === code);
                                    const isAvail = cell?.available ?? true;
                                    return (
                                      <td key={`${day}-${code}`} className="p-1.5">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            canEditActiveTeacher && handleToggleAvailabilitySlot(activeTeacher, day, code)
                                          }
                                          className={`w-full py-1.5 px-2 rounded-lg font-bold text-[10px] border transition-all ${
                                            canEditActiveTeacher ? 'cursor-pointer' : 'cursor-default'
                                          } ${
                                            isAvail
                                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                              : 'bg-rose-50 text-rose-800 border-rose-200'
                                          }`}
                                        >
                                          {isAvail ? '✓ Libre' : '✕ Indispo'}
                                        </button>
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()}
                  </div>

                  {/* 3E. Séances Planifiées & Export PDF */}
                  <div className="p-4 bg-[#F5F7FA] rounded-2xl border border-[#DCE3EC] space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="text-xs font-black uppercase text-[#16202A] block">
                          Séances planifiées & Export PDF de l’emploi du temps
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={pdfPeriodType}
                          onChange={(e) => setPdfPeriodType(e.target.value as 'WEEK' | 'MONTH' | 'SEMESTER')}
                          className="px-2.5 py-1.5 bg-white border border-[#DCE3EC] rounded-xl text-xs font-bold text-[#16202A]"
                        >
                          <option value="WEEK">Période : Cette Semaine</option>
                          <option value="MONTH">Période : Ce Mois</option>
                          <option value="SEMESTER">Période : Tout le Semestre</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => handleExportTeacherPdf(activeTeacher, pdfPeriodType)}
                          className="px-3.5 py-1.5 bg-[#17345B] hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Exporter Planning PDF
                        </button>
                      </div>
                    </div>
                    {(() => {
                      const teacherSessions = sessions.filter((s) => s.teacherId === activeTeacher.id);
                      if (teacherSessions.length === 0) {
                        return <p className="text-slate-400 italic py-2">Aucune séance planifiée pour le moment.</p>;
                      }
                      return (
                        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                          {teacherSessions.map((s) => {
                            const crs = courses.find((c) => c.id === s.courseId);
                            const rm = rooms.find((r) => r.id === s.roomId);
                            const grps = s.groupIds.map((gid) => groups.find((g) => g.id === gid)?.code).filter(Boolean);
                            return (
                              <div
                                key={s.id}
                                className="p-2.5 bg-white rounded-xl border border-[#DCE3EC] flex items-center justify-between"
                              >
                                <div>
                                  <div className="font-bold text-[#16202A]">{crs?.title || 'Cours'}</div>
                                  <div className="text-[10px] text-slate-500">
                                    {s.date} • {s.startTime}–{s.endTime} ({s.durationHours}h) • Groupes : {grps.join(', ')}
                                  </div>
                                </div>
                                <span className="px-2 py-0.5 bg-blue-50 text-[#2F6FED] font-mono font-bold rounded text-[10px]">
                                  {rm?.code || 'Salle'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* ONGLET 4 : COMPTE & SÉCURITÉ */}
              {sheetTab === 'SECURITY' && (
                <div className="space-y-4">
                  <div className="border-b border-slate-100 pb-2">
                    <h4 className="text-sm font-black text-[#16202A]">Accès au portail SIS, statut & sécurité</h4>
                    <p className="text-[11px] text-slate-500">
                      Paramètres d’authentification, liaison Google Calendar et statut d’activation du compte.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {renderReadOnlyField('Identifiant de connexion', activeTeacher.username, true)}
                    {renderReadOnlyField('Rôle système', 'Enseignant (TEACHER)')}
                    {renderReadOnlyField(
                      'Statut du compte',
                      activeTeacher.isActive ? 'Actif (Accès autorisé)' : 'Suspendu (Accès bloqué RG-22)'
                    )}
                    {renderReadOnlyField(
                      'Synchronisation Google Calendar',
                      activeTeacher.googleCalendarLinked
                        ? `Associé (${activeTeacher.googleEmail || activeTeacher.email})`
                        : 'Non associé'
                    )}
                    {renderReadOnlyField('Dernière mise à jour', activeTeacher.updatedAt ? new Date(activeTeacher.updatedAt).toLocaleString('fr-FR') : undefined)}
                  </div>

                  {canEditFinanceOrSchedule && (
                    <div className="p-4 bg-[#F5F7FA] rounded-2xl border border-[#DCE3EC] flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <span className="font-bold text-xs text-[#16202A] block">
                          Actions administratives de sécurité sur ce compte
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Envoyer un lien de réinitialisation de mot de passe ou suspendre temporairement l’accès.
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            const res = await sendUserPasswordResetEmail(activeTeacher.id);
                            showAppToast({
                              type: res.success ? 'success' : 'error',
                              title: res.success ? 'E-mail de réinitialisation envoyé' : 'Avertissement',
                              message: res.message,
                            });
                          }}
                          className="px-3.5 py-2 bg-white hover:bg-slate-50 text-[#17345B] border border-[#DCE3EC] rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          Réinitialiser le mot de passe
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            toggleUserStatus(activeTeacher.id);
                            showAppToast({
                              type: 'info',
                              title: activeTeacher.isActive ? 'Compte enseignant suspendu' : 'Compte enseignant réactivé',
                              message: `Le statut de ${activeTeacher.name} a été mis à jour.`,
                            });
                          }}
                          className={`px-3.5 py-2 rounded-xl font-bold text-xs cursor-pointer ${
                            activeTeacher.isActive
                              ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                              : 'bg-[#1F8A83] hover:bg-teal-700 text-white'
                          }`}
                        >
                          {activeTeacher.isActive ? 'Suspendre le compte' : 'Réactiver le compte'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* PIED DE MODALE FIXE (Section 4 du PDF : toujours visible d'un onglet à l'autre) */}
            <div className="px-6 py-4 bg-[#F5F7FA] border-t border-[#DCE3EC] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                {isEditingTeacherSheet ? (
                  isTeacherDirty ? (
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
                {!isEditingTeacherSheet ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleExportTeacherPdf(activeTeacher, pdfPeriodType)}
                      className="px-3.5 py-2 bg-white hover:bg-slate-100 text-[#17345B] border border-[#DCE3EC] font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Exporter Planning PDF
                    </button>
                    {canEditActiveTeacher && (
                      <button
                        type="button"
                        onClick={() => setIsEditingTeacherSheet(true)}
                        className="px-4 py-2 bg-[#2F6FED] hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Modifier le profil
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleCloseTeacherModal}
                      className="px-4 py-2 bg-[#17345B] hover:bg-slate-800 text-white font-bold rounded-xl text-xs cursor-pointer"
                    >
                      Fermer
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleCancelTeacherEdit}
                      className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-[#DCE3EC] font-bold rounded-xl text-xs cursor-pointer"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveTeacherProfile()}
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
    </div>
  );
};


