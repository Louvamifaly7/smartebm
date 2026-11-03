import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { TeacherAvailabilitySlot, User, UserRole } from '../types';
import { getRoleLabel, ROLE_LABELS } from '../utils/rbacPermissions';
import { showAppToast } from './ToastAndConfirmCenter';
import { StudentProfileForm, StudentDossierTab } from './StudentProfileForm';
import { TeacherProfileForm, TeacherDossierTab } from './TeacherProfileForm';
import {
  X,
  User as UserIcon,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  Calendar,
  CheckCircle2,
  Save,
  Shield,
  Banknote,
  Clock,
  Edit2,
  Eye,
  AlertTriangle,
  KeyRound,
  Lock,
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  History,
  Power,
  FileText,
} from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser?: User | null;
  initialEditMode?: boolean;
  initialTab?: 'IDENTITY' | 'CONTACT' | 'JOB' | 'SECURITY';
}

const WEEK_DAYS: TeacherAvailabilitySlot['day'][] = [
  'LUNDI',
  'MARDI',
  'MERCREDI',
  'JEUDI',
  'VENDREDI',
  'SAMEDI',
];

export const WIDE_TEACHER_SLOTS = [
  { code: '07H_09H', label: '07h00 – 09h00', period: 'MATIN' },
  { code: '09H_11H', label: '09h00 – 11h00', period: 'MATIN' },
  { code: '11H_13H', label: '11h00 – 13h00', period: 'MATIN' },
  { code: '13H_15H', label: '13h00 – 15h00', period: 'APRES_MIDI' },
  { code: '15H_17H', label: '15h00 – 17h00', period: 'APRES_MIDI' },
] as const;

export const buildWideAvailabilities = (existing?: TeacherAvailabilitySlot[]): TeacherAvailabilitySlot[] => {
  const result: TeacherAvailabilitySlot[] = [];
  for (const day of WEEK_DAYS) {
    for (const s of WIDE_TEACHER_SLOTS) {
      const exact = existing?.find((a) => a.day === day && a.slot === s.code);
      const fallbackHalfDay = existing?.find((a) => a.day === day && a.slot === s.period);
      const isAvail =
        exact !== undefined
          ? exact.available
          : fallbackHalfDay !== undefined
          ? fallbackHalfDay.available
          : day !== 'SAMEDI';
      result.push({
        day,
        slot: s.code,
        available: isAvail,
        note: isAvail ? 'Disponible' : 'Indisponible',
      });
    }
    const matinSlots = result.filter((r) => r.day === day && ['07H_09H', '09H_11H', '11H_13H'].includes(r.slot));
    const apremSlots = result.filter((r) => r.day === day && ['13H_15H', '15H_17H'].includes(r.slot));
    result.push({
      day,
      slot: 'MATIN',
      available: matinSlots.some((m) => m.available),
    });
    result.push({
      day,
      slot: 'APRES_MIDI',
      available: apremSlots.some((a) => a.available),
    });
  }
  return result;
};

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  targetUser,
  initialEditMode = false,
  initialTab = 'IDENTITY',
}) => {
  const {
    currentUser,
    users,
    groups,
    filieres,
    parcours,
    selectedAcademicYear,
    updateUser,
    updateTeacher,
    toggleUserStatus,
    sendUserPasswordResetEmail,
    setDirectUserPassword,
    getTeacherHourlyStats,
  } = useApp();

  const userToView = targetUser ? users.find((u) => u.id === targetUser.id) || targetUser : currentUser;

  // 4-Tab Architecture (Section 4, Pages 5 & 6)
  const [activeTab, setActiveTab] = useState<'IDENTITY' | 'CONTACT' | 'JOB' | 'SECURITY'>(initialTab);
  // Open in consultation mode by default unless initialEditMode is true
  const [isEditing, setIsEditing] = useState<boolean>(initialEditMode);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState<boolean>(false);

  // Tab 1: Identité (Unknown values remain empty "", NEVER pre-filled with fake personal data)
  const [civilite, setCivilite] = useState<'M.' | 'Mme' | 'Mlle' | 'Dr.' | 'Prof.'>('M.');
  const [name, setName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [birthPlace, setBirthPlace] = useState('');
  const [cin, setCin] = useState('');
  const [highestDiploma, setHighestDiploma] = useState('');
  const [almaMater, setAlmaMater] = useState('');

  // Tab 2: Coordonnées
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [secondaryPhone, setSecondaryPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [linkedInUrl, setLinkedInUrl] = useState('');
  const [orcidUrl, setOrcidUrl] = useState('');

  // Tab 3: Informations métier (Étudiant / Enseignant / Personnel / Finances)
  const [groupId, setGroupId] = useState('');
  const [officeLocation, setOfficeLocation] = useState('');
  const [department, setDepartment] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [academicRank, setAcademicRank] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [contractType, setContractType] = useState<NonNullable<User['contractType']>>('VACATAIRE');
  const [weeklyMaxHours, setWeeklyMaxHours] = useState<number>(18);
  const [hourlyRateAr, setHourlyRateAr] = useState<number>(40000);
  const [subjectsText, setSubjectsText] = useState('');
  const [bankRib, setBankRib] = useState('');
  const [hireDate, setHireDate] = useState('');
  const [cvFileName, setCvFileName] = useState('');
  const [cvFileUrl, setCvFileUrl] = useState('');
  const [cvUploadedAt, setCvUploadedAt] = useState('');
  const [availabilities, setAvailabilities] = useState<TeacherAvailabilitySlot[]>([]);

  // Tab 4: Compte & sécurité
  const [roleValue, setRoleValue] = useState<UserRole>('STUDENT');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [forceChangeNextLogin, setForceChangeNextLogin] = useState(false);
  const [copiedPwd, setCopiedPwd] = useState(false);
  const [isSendingResetEmail, setIsSendingResetEmail] = useState(false);
  const [securityFeedback, setSecurityFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [savedBanner, setSavedBanner] = useState<string | null>(null);

  const hydrateFromUser = (u: User) => {
    setCivilite(u.civilite || (u.role === 'TEACHER' ? 'Dr.' : 'M.'));
    setName(u.name || '');
    const parts = (u.name || '').trim().split(/\s+/);
    setLastName(u.lastName || (parts.length > 1 ? parts[parts.length - 1] : parts[0] || ''));
    setFirstName(u.firstName || (parts.length > 1 ? parts.slice(0, -1).join(' ') : ''));
    // Unknown personal fields left empty — no fictional data
    setBirthDate(u.birthDate || '');
    setBirthPlace(u.birthPlace || '');
    setCin(u.cin || '');
    setHighestDiploma(u.highestDiploma || u.bacSeries || '');
    setAlmaMater(u.almaMater || u.originSchool || '');

    setEmail(u.email || '');
    setPhone(u.phone || u.phones?.[0] || '');
    setSecondaryPhone(u.secondaryPhone || u.phones?.[1] || '');
    setAddress(u.address || '');
    setCity(u.city || '');
    setEmergencyContact(u.emergencyContact || '');
    setLinkedInUrl(u.linkedInUrl || '');
    setOrcidUrl(u.orcidUrl || '');

    setGroupId(u.groupId || '');
    setOfficeLocation(u.officeLocation || '');
    setDepartment(u.department || u.service || '');
    setJobTitle(u.jobTitle || '');
    setAcademicRank(u.academicRank || '');
    setSpecialty(u.specialty || '');
    setContractType(u.contractType || 'VACATAIRE');
    setWeeklyMaxHours(u.weeklyMaxHours ?? 18);
    setHourlyRateAr(u.hourlyRateAr ?? 40000);
    setSubjectsText((u.subjects || []).join(', '));
    setBankRib(u.bankRib || '');
    setHireDate(u.hireDate || '');
    setCvFileName(u.cvFileName || '');
    setCvFileUrl(u.cvFileUrl || '');
    setCvUploadedAt(u.cvUploadedAt || '');
    setAvailabilities(buildWideAvailabilities(u.availabilities));

    setRoleValue(u.role);
    setNewPasswordInput('');
    setSecurityFeedback(null);
    setIsDirty(false);
    setConfirmDiscardOpen(false);
  };

  useEffect(() => {
    if (!userToView || !isOpen) return;
    hydrateFromUser(userToView);
    setIsEditing(initialEditMode);
    setActiveTab(initialTab);
    setSavedBanner(null);
  }, [userToView?.id, isOpen, initialEditMode, initialTab]);

  if (!isOpen || !userToView) return null;

  const isSelf = currentUser.id === userToView.id;
  const isAdmin = currentUser.role === 'ADMIN';
  const isAdminOrStaff = ['ADMIN', 'SCOLARITE', 'SCHEDULER', 'ADMIN_STAFF', 'ACADEMIC_HEAD', 'FINANCE'].includes(
    currentUser.role
  );
  const canEdit = isSelf || isAdminOrStaff;
  // Sensitive payroll/financial data strictly visible/editable for authorized roles (Section 4, Page 6)
  const canAccessSensitiveFinancial = ['ADMIN', 'FINANCE', 'SCOLARITE', 'SCHEDULER'].includes(currentUser.role);

  const isTeacherProfile = userToView.role === 'TEACHER';
  const isStudentProfile = userToView.role === 'STUDENT';

  if (isStudentProfile) {
    const mappedTab: StudentDossierTab =
      initialTab === 'CONTACT'
        ? 'TAB_2_CONTACT'
        : initialTab === 'JOB'
        ? 'TAB_4_ACADEMIC'
        : initialTab === 'SECURITY'
        ? 'TAB_7_SECURITY'
        : 'TAB_1_IDENTITY';

    return (
      <StudentProfileForm
        student={userToView}
        mode={isAdminOrStaff ? 'administration' : 'self-service'}
        onClose={onClose}
        initialEditMode={initialEditMode}
        initialTab={mappedTab}
        showAcademicAndFinanceExtensions={isAdminOrStaff}
      />
    );
  }

  if (isTeacherProfile) {
    const mappedTeacherTab: TeacherDossierTab =
      initialTab === 'CONTACT'
        ? 'TAB_2_CONTACT'
        : initialTab === 'JOB'
        ? 'TAB_5_PEDAGOGY'
        : initialTab === 'SECURITY'
        ? 'TAB_7_SECURITY'
        : 'TAB_1_IDENTITY';

    return (
      <TeacherProfileForm
        teacher={userToView}
        mode={isAdminOrStaff ? 'administration' : 'self-service'}
        onClose={onClose}
        initialEditMode={initialEditMode}
        initialTab={mappedTeacherTab}
      />
    );
  }

  const studentGroup = groups.find((g) => g.id === (groupId || userToView.groupId));
  const studentFiliere = filieres.find((f) => f.id === studentGroup?.filiereId);
  const studentParcours = parcours.find((p) => p.id === userToView.parcoursId || p.id === studentGroup?.parcoursId);

  const teacherStats = isTeacherProfile && getTeacherHourlyStats ? getTeacherHourlyStats(userToView.id) : null;

  const markDirty = () => {
    if (!isDirty) setIsDirty(true);
  };

  const handleRequestClose = () => {
    if (isEditing && isDirty) {
      setConfirmDiscardOpen(true);
      return;
    }
    onClose();
  };

  const handleCancelEdit = () => {
    if (isDirty) {
      setConfirmDiscardOpen(true);
      return;
    }
    hydrateFromUser(userToView);
    setIsEditing(false);
  };

  const handleConfirmDiscard = () => {
    hydrateFromUser(userToView);
    setIsEditing(false);
    setConfirmDiscardOpen(false);
  };

  const handleToggleSlot = (day: TeacherAvailabilitySlot['day'], slotCode: string) => {
    if (!canEdit || !isEditing) return;
    markDirty();
    const next = availabilities.map((item) =>
      item.day === day && item.slot === slotCode
        ? { ...item, available: !item.available, note: !item.available ? 'Disponible' : 'Indisponible' }
        : item
    );
    const matinAvail = next
      .filter((r) => r.day === day && ['07H_09H', '09H_11H', '11H_13H'].includes(r.slot))
      .some((r) => r.available);
    const apremAvail = next
      .filter((r) => r.day === day && ['13H_15H', '15H_17H'].includes(r.slot))
      .some((r) => r.available);

    const synced = next.map((item) => {
      if (item.day === day && item.slot === 'MATIN') return { ...item, available: matinAvail };
      if (item.day === day && item.slot === 'APRES_MIDI') return { ...item, available: apremAvail };
      return item;
    });
    setAvailabilities(synced);
  };

  const handleToggleFullDay7h17h = (day: TeacherAvailabilitySlot['day'], makeAvailable: boolean) => {
    if (!canEdit || !isEditing) return;
    markDirty();
    const synced = availabilities.map((item) =>
      item.day === day
        ? { ...item, available: makeAvailable, note: makeAvailable ? 'Disponible (07h-17h)' : 'Indisponible' }
        : item
    );
    setAvailabilities(synced);
  };

  const generateRandomPassword = () => {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghijkmnpqrstuvwxyz';
    const digits = '23456789';
    const pick = (chars: string, len: number) =>
      Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `Ebm@2026-${pick(upper, 2)}${pick(digits, 3)}${pick(lower, 2)}`;
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;

    const computedName = name.trim() || `${firstName.trim()} ${lastName.trim()}`.trim();
    if (!computedName || !email.trim()) {
      showAppToast({
        type: 'error',
        title: 'Champs obligatoires manquants',
        message: 'Veuillez renseigner au minimum le nom complet et une adresse e-mail valide.',
      });
      return;
    }

    const phonesList = [phone.trim(), secondaryPhone.trim()].filter(Boolean);

    const commonUpdates: Partial<User> = {
      civilite,
      name: isStudentProfile && !isAdminOrStaff ? userToView.name : computedName,
      firstName: isStudentProfile && !isAdminOrStaff ? userToView.firstName : firstName.trim() || undefined,
      lastName: isStudentProfile && !isAdminOrStaff ? userToView.lastName : lastName.trim() || undefined,
      email: email.trim(),
      phone: phone.trim() || undefined,
      secondaryPhone: secondaryPhone.trim() || undefined,
      phones: phonesList,
      address: address.trim() || undefined,
      city: city.trim() || undefined,
      officeLocation: officeLocation.trim() || undefined,
      department: department.trim() || undefined,
      jobTitle: jobTitle.trim() || undefined,
      highestDiploma: highestDiploma.trim() || undefined,
      almaMater: almaMater.trim() || undefined,
      cin: cin.trim() || undefined,
      birthDate: birthDate || undefined,
      birthPlace: birthPlace.trim() || undefined,
      linkedInUrl: linkedInUrl.trim() || undefined,
      orcidUrl: orcidUrl.trim() || undefined,
      emergencyContact: emergencyContact.trim() || undefined,
      cvFileName: cvFileName || undefined,
      cvFileUrl: cvFileUrl || undefined,
      cvUploadedAt: cvUploadedAt || undefined,
      ...(isStudentProfile && isAdminOrStaff ? { groupId: groupId || userToView.groupId } : {}),
      ...(isAdmin && roleValue !== userToView.role ? { role: roleValue } : {}),
    };

    if (isTeacherProfile) {
      const parsedSubjects = subjectsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const teacherUpdates: Partial<User> = {
        ...commonUpdates,
        academicRank: academicRank.trim() || undefined,
        specialty: specialty.trim() || undefined,
        subjects: parsedSubjects,
        hireDate: hireDate || undefined,
        availabilities,
        ...(canAccessSensitiveFinancial
          ? {
              bankRib: bankRib.trim() || undefined,
              contractType,
              weeklyMaxHours: Number(weeklyMaxHours) || 18,
              hourlyRateAr: Number(hourlyRateAr) || 40000,
            }
          : {}),
      };
      updateTeacher(userToView.id, teacherUpdates);
    } else {
      updateUser(userToView.id, commonUpdates);
    }

    setIsDirty(false);
    setIsEditing(false);
    setSavedBanner('Modifications enregistrées avec succès.');
    setTimeout(() => setSavedBanner(null), 3500);
  };

  // Helper to render read-only value or "Non renseigné" placeholder
  const renderValueOrEmpty = (val?: string | number | null, mono = false) => {
    if (val === undefined || val === null || String(val).trim() === '') {
      return <span className="text-slate-400 italic font-normal">Non renseigné</span>;
    }
    return <span className={`font-semibold text-slate-900 ${mono ? 'font-mono' : ''}`}>{val}</span>;
  };

  // Profile completeness check for status badge
  const isProfileIncomplete = !userToView.phone && !userToView.cin && !userToView.birthDate;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-4 max-h-[92vh] flex flex-col">
        {/* 1. Institutional Navy Header (#17345B) */}
        <div className="p-5 sm:p-6 bg-[#17345B] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-14 h-14 rounded-2xl bg-[#2F6FED] border border-blue-300/40 flex items-center justify-center font-black text-xl text-white shrink-0 shadow-sm">
              {userToView.name.substring(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="px-2.5 py-0.5 bg-white/15 text-blue-100 rounded-md text-[10px] font-bold uppercase tracking-wider">
                  {getRoleLabel(userToView.role)}
                </span>
                {userToView.isActive !== false ? (
                  <span className="px-2.5 py-0.5 bg-[#1F8A83] text-white rounded-md text-[10px] font-bold">
                    Actif
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 bg-red-600 text-white rounded-md text-[10px] font-bold">
                    Suspendu
                  </span>
                )}
                {isProfileIncomplete && (
                  <span className="px-2.5 py-0.5 bg-[#D58A18] text-white rounded-md text-[10px] font-bold">
                    À compléter
                  </span>
                )}
                {isEditing && isDirty && (
                  <span className="px-2.5 py-0.5 bg-[#D58A18] text-white rounded-md text-[10px] font-bold flex items-center gap-1 animate-pulse">
                    <AlertTriangle className="w-3 h-3" />
                    Modifications non enregistrées
                  </span>
                )}
              </div>
              <h3 className="text-lg sm:text-xl font-black mt-1 truncate">
                {userToView.civilite ? `${userToView.civilite} ` : ''}
                {userToView.name}
              </h3>
              <p className="text-xs text-blue-200 truncate">
                {userToView.matricule || userToView.username} • {userToView.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {canEdit && !isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-3.5 py-2 bg-[#2F6FED] hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Modifier le profil</span>
              </button>
            )}
            {isEditing && (
              <span className="px-3 py-1.5 bg-white/10 border border-white/20 text-blue-100 rounded-xl text-xs font-bold flex items-center gap-1.5">
                <Edit2 className="w-3.5 h-3.5 text-blue-300" />
                Mode édition
              </span>
            )}
            <button
              type="button"
              onClick={handleRequestClose}
              className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition cursor-pointer"
              title="Fermer la fiche"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. Unsaved Changes Confirmation Banner */}
        {confirmDiscardOpen && (
          <div className="px-6 py-3 bg-amber-50 border-b border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-amber-950 font-semibold">
              <AlertTriangle className="w-4 h-4 text-[#D58A18] shrink-0" />
              <span>Vous avez des modifications non enregistrées. Voulez-vous vraiment les abandonner ?</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setConfirmDiscardOpen(false)}
                className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg font-bold cursor-pointer"
              >
                Continuer l'édition
              </button>
              <button
                type="button"
                onClick={handleConfirmDiscard}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold cursor-pointer"
              >
                Abandonner les modifications
              </button>
            </div>
          </div>
        )}

        {/* 3. 4-Tab Navigation Bar (Identité | Coordonnées | Informations métier | Compte & sécurité) */}
        <div className="bg-[#F5F7FA] border-b border-slate-200 px-4 sm:px-6 flex items-center gap-1 overflow-x-auto no-scrollbar">
          {[
            { id: 'IDENTITY', label: 'Identité', icon: UserIcon },
            { id: 'CONTACT', label: 'Coordonnées', icon: Mail },
            { id: 'JOB', label: 'Informations métier', icon: Briefcase },
            { id: 'SECURITY', label: 'Compte & sécurité', icon: Shield },
          ].map((tab) => {
            const Icon = tab.icon;
            const isTabActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  isTabActive
                    ? 'border-[#2F6FED] text-[#17345B] bg-white'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isTabActive ? 'text-[#2F6FED]' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* 4. Tab Content Body */}
        <form onSubmit={handleSave} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs flex-1 bg-white">
            {savedBanner && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#1F8A83] shrink-0" />
                <span>{savedBanner}</span>
              </div>
            )}

            {/* ==================== TAB 1: IDENTITÉ ==================== */}
            {activeTab === 'IDENTITY' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div>
                    <h4 className="font-bold text-[#17345B] text-sm">État civil, identifiant & diplôme</h4>
                    <p className="text-[11px] text-slate-500">
                      Les champs non renseignés restent vides jusqu'à leur saisie officielle.
                    </p>
                  </div>
                  <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-[#F5F7FA] border border-slate-200 text-[#17345B]">
                    ID : {userToView.matricule || userToView.username}
                  </span>
                </div>

                {!isEditing ? (
                  /* Mode Consultation (Read-Only) */
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-[#F5F7FA] p-4 rounded-2xl border border-slate-200">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">Civilité / Titre</span>
                      <div className="mt-1">{renderValueOrEmpty(civilite)}</div>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">Nom</span>
                      <div className="mt-1">{renderValueOrEmpty(lastName || name)}</div>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">Prénom(s)</span>
                      <div className="mt-1">{renderValueOrEmpty(firstName)}</div>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">Nom complet affiché</span>
                      <div className="mt-1">{renderValueOrEmpty(name)}</div>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">Date de naissance</span>
                      <div className="mt-1">
                        {birthDate
                          ? new Date(birthDate).toLocaleDateString('fr-FR')
                          : renderValueOrEmpty('')}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">Lieu de naissance</span>
                      <div className="mt-1">{renderValueOrEmpty(birthPlace)}</div>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">
                        N° CIN / Pièce d'identité
                      </span>
                      <div className="mt-1">{renderValueOrEmpty(cin, true)}</div>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">
                        Diplôme le plus élevé
                      </span>
                      <div className="mt-1">{renderValueOrEmpty(highestDiploma)}</div>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">
                        Université / Établissement d'origine
                      </span>
                      <div className="mt-1">{renderValueOrEmpty(almaMater)}</div>
                    </div>
                  </div>
                ) : (
                  /* Mode Édition */
                  <div className="space-y-4 bg-[#F5F7FA] p-4 rounded-2xl border border-slate-200">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">
                          Civilité
                        </label>
                        <select
                          value={civilite}
                          onChange={(e) => {
                            setCivilite(e.target.value as any);
                            markDirty();
                          }}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold"
                        >
                          <option value="M.">M.</option>
                          <option value="Mme">Mme</option>
                          <option value="Mlle">Mlle</option>
                          <option value="Dr.">Dr.</option>
                          <option value="Prof.">Prof.</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">
                          Nom *
                        </label>
                        <input
                          type="text"
                          value={lastName}
                          disabled={isStudentProfile && !isAdminOrStaff}
                          onChange={(e) => {
                            setLastName(e.target.value);
                            setName(`${firstName} ${e.target.value}`.trim());
                            markDirty();
                          }}
                          placeholder="Non renseigné"
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-semibold disabled:bg-slate-100"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">
                          Prénom(s) *
                        </label>
                        <input
                          type="text"
                          value={firstName}
                          disabled={isStudentProfile && !isAdminOrStaff}
                          onChange={(e) => {
                            setFirstName(e.target.value);
                            setName(`${e.target.value} ${lastName}`.trim());
                            markDirty();
                          }}
                          placeholder="Non renseigné"
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-semibold disabled:bg-slate-100"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">
                          Nom complet d'affichage *
                        </label>
                        <input
                          type="text"
                          required
                          value={name}
                          disabled={isStudentProfile && !isAdminOrStaff}
                          onChange={(e) => {
                            setName(e.target.value);
                            markDirty();
                          }}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold disabled:bg-slate-100"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">
                          Date de naissance
                        </label>
                        <input
                          type="date"
                          value={birthDate}
                          onChange={(e) => {
                            setBirthDate(e.target.value);
                            markDirty();
                          }}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">
                          Lieu de naissance
                        </label>
                        <input
                          type="text"
                          value={birthPlace}
                          onChange={(e) => {
                            setBirthPlace(e.target.value);
                            markDirty();
                          }}
                          placeholder="Non renseigné"
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">
                          N° CIN / Passeport
                        </label>
                        <input
                          type="text"
                          value={cin}
                          onChange={(e) => {
                            setCin(e.target.value);
                            markDirty();
                          }}
                          placeholder="Non renseigné"
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">
                          Diplôme le plus élevé
                        </label>
                        <input
                          type="text"
                          value={highestDiploma}
                          onChange={(e) => {
                            setHighestDiploma(e.target.value);
                            markDirty();
                          }}
                          placeholder="Ex: Doctorat, Master 2, Bac..."
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">
                          Établissement d'origine
                        </label>
                        <input
                          type="text"
                          value={almaMater}
                          onChange={(e) => {
                            setAlmaMater(e.target.value);
                            markDirty();
                          }}
                          placeholder="Non renseigné"
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ==================== TAB 2: COORDONNÉES ==================== */}
            {activeTab === 'CONTACT' && (
              <div className="space-y-5">
                <div className="border-b border-slate-100 pb-2.5">
                  <h4 className="font-bold text-[#17345B] text-sm">Coordonnées de contact & adresse</h4>
                  <p className="text-[11px] text-slate-500">
                    Moyens de communication principaux, adresse postale et personne à contacter en cas d'urgence.
                  </p>
                </div>

                {!isEditing ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-[#F5F7FA] p-4 rounded-2xl border border-slate-200">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">
                        Email institutionnel / professionnel
                      </span>
                      <div className="mt-1">{renderValueOrEmpty(email)}</div>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">
                        Téléphone principal
                      </span>
                      <div className="mt-1">{renderValueOrEmpty(phone)}</div>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">
                        Téléphone secondaire / WhatsApp
                      </span>
                      <div className="mt-1">{renderValueOrEmpty(secondaryPhone)}</div>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">Adresse / Quartier</span>
                      <div className="mt-1">{renderValueOrEmpty(address)}</div>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">Ville</span>
                      <div className="mt-1">{renderValueOrEmpty(city)}</div>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">
                        Contact d'urgence (Nom & Tél)
                      </span>
                      <div className="mt-1">{renderValueOrEmpty(emergencyContact)}</div>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">
                        Profil LinkedIn / ORCID
                      </span>
                      <div className="mt-1">{renderValueOrEmpty(linkedInUrl || orcidUrl)}</div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 bg-[#F5F7FA] p-4 rounded-2xl border border-slate-200">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">
                          Email institutionnel *
                        </label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            markDirty();
                          }}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">
                          Téléphone principal *
                        </label>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => {
                            setPhone(e.target.value);
                            markDirty();
                          }}
                          placeholder="+261 34..."
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">
                          Téléphone secondaire / WhatsApp
                        </label>
                        <input
                          type="tel"
                          value={secondaryPhone}
                          onChange={(e) => {
                            setSecondaryPhone(e.target.value);
                            markDirty();
                          }}
                          placeholder="Non renseigné"
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">
                          Adresse postale / Quartier
                        </label>
                        <input
                          type="text"
                          value={address}
                          onChange={(e) => {
                            setAddress(e.target.value);
                            markDirty();
                          }}
                          placeholder="Non renseigné"
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">Ville</label>
                        <input
                          type="text"
                          value={city}
                          onChange={(e) => {
                            setCity(e.target.value);
                            markDirty();
                          }}
                          placeholder="Non renseigné"
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">
                          Contact d'urgence
                        </label>
                        <input
                          type="text"
                          value={emergencyContact}
                          onChange={(e) => {
                            setEmergencyContact(e.target.value);
                            markDirty();
                          }}
                          placeholder="Nom et téléphone"
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">
                        Lien LinkedIn ou ORCID
                      </label>
                      <input
                        type="text"
                        value={linkedInUrl || orcidUrl}
                        onChange={(e) => {
                          setLinkedInUrl(e.target.value);
                          setOrcidUrl(e.target.value);
                          markDirty();
                        }}
                        placeholder="https://..."
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ==================== TAB 3: INFORMATIONS MÉTIER ==================== */}
            {activeTab === 'JOB' && (
              <div className="space-y-5">
                {/* CASE A: ÉTUDIANT */}
                {isStudentProfile && (
                  <div className="space-y-4">
                    <div className="border-b border-slate-100 pb-2.5">
                      <h4 className="font-bold text-[#17345B] text-sm">Dossier d'inscription académique (Étudiant)</h4>
                      <p className="text-[11px] text-slate-500">
                        Affectation LMD, filière, parcours, niveau, groupe et année universitaire.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-[#F5F7FA] p-4 rounded-2xl border border-slate-200">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-500 block">Matricule étudiant</span>
                        <div className="mt-1 font-mono font-bold text-[#17345B]">
                          {userToView.matricule || 'Non attribué'}
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-500 block">Filière / Mention</span>
                        <div className="mt-1">{renderValueOrEmpty(studentFiliere?.name)}</div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-500 block">Parcours</span>
                        <div className="mt-1">{renderValueOrEmpty(studentParcours?.name || 'Tronc commun')}</div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-500 block">Niveau</span>
                        <div className="mt-1">{renderValueOrEmpty(studentGroup?.level)}</div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-500 block">Groupe</span>
                        {isEditing && isAdminOrStaff ? (
                          <select
                            value={groupId}
                            onChange={(e) => {
                              setGroupId(e.target.value);
                              markDirty();
                            }}
                            className="mt-1 w-full p-2 bg-white border border-slate-300 rounded-xl font-bold"
                          >
                            {groups.map((g) => (
                              <option key={g.id} value={g.id}>
                                {g.code} — {g.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="mt-1">{renderValueOrEmpty(studentGroup?.code)}</div>
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-500 block">
                          Année universitaire
                        </span>
                        <div className="mt-1 font-bold text-[#1F8A83]">{selectedAcademicYear}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* CASE B: ENSEIGNANT */}
                {isTeacherProfile && (
                  <div className="space-y-5">
                    <div className="border-b border-slate-100 pb-2.5 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-[#17345B] text-sm">
                          Dossier académique, matières & disponibilités (Enseignant)
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Grade universitaire, spécialité, matières affectées, volumes horaires et disponibilités.
                        </p>
                      </div>
                      {teacherStats && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 font-bold text-[#17345B]">
                            Prévu : {teacherStats.totalScheduled}h
                          </span>
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 font-bold text-[#1F8A83]">
                            Réalisé : {teacherStats.totalCompleted}h
                          </span>
                        </div>
                      )}
                    </div>

                    {!isEditing ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-[#F5F7FA] p-4 rounded-2xl border border-slate-200">
                        <div>
                          <span className="text-[10px] font-bold uppercase text-slate-500 block">
                            Grade universitaire
                          </span>
                          <div className="mt-1">{renderValueOrEmpty(academicRank)}</div>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase text-slate-500 block">Spécialité</span>
                          <div className="mt-1">{renderValueOrEmpty(specialty)}</div>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase text-slate-500 block">
                            Département de rattachement
                          </span>
                          <div className="mt-1">{renderValueOrEmpty(department)}</div>
                        </div>
                        <div className="sm:col-span-2">
                          <span className="text-[10px] font-bold uppercase text-slate-500 block">
                            Matières / EC affectés
                          </span>
                          <div className="mt-1">{renderValueOrEmpty(subjectsText)}</div>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase text-slate-500 block">Bureau</span>
                          <div className="mt-1">{renderValueOrEmpty(officeLocation)}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4 bg-[#F5F7FA] p-4 rounded-2xl border border-slate-200">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">
                              Grade universitaire
                            </label>
                            <select
                              value={academicRank}
                              onChange={(e) => {
                                setAcademicRank(e.target.value);
                                markDirty();
                              }}
                              className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold"
                            >
                              <option value="">— Non renseigné —</option>
                              <option value="Professeur Titulaire">Professeur Titulaire</option>
                              <option value="Maître de Conférences">Maître de Conférences</option>
                              <option value="Docteur / HDR">Docteur / HDR</option>
                              <option value="Chargé de Cours">Chargé de Cours</option>
                              <option value="Assistant d'Enseignement Supérieur">
                                Assistant d'Enseignement Supérieur
                              </option>
                              <option value="Expert Professionnel / Vacataire">
                                Expert Professionnel / Vacataire
                              </option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">
                              Spécialité académique
                            </label>
                            <input
                              type="text"
                              value={specialty}
                              onChange={(e) => {
                                setSpecialty(e.target.value);
                                markDirty();
                              }}
                              placeholder="Non renseigné"
                              className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-semibold"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">
                              Département
                            </label>
                            <input
                              type="text"
                              value={department}
                              onChange={(e) => {
                                setDepartment(e.target.value);
                                markDirty();
                              }}
                              placeholder="Non renseigné"
                              className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="sm:col-span-2">
                            <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">
                              Matières / EC enseignés (séparés par des virgules)
                            </label>
                            <input
                              type="text"
                              value={subjectsText}
                              onChange={(e) => {
                                setSubjectsText(e.target.value);
                                markDirty();
                              }}
                              placeholder="Algorithmique, Bases de données..."
                              className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">
                              Bureau / Salle
                            </label>
                            <input
                              type="text"
                              value={officeLocation}
                              onChange={(e) => {
                                setOfficeLocation(e.target.value);
                                markDirty();
                              }}
                              placeholder="Non renseigné"
                              className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* CV Document Upload / Download */}
                    <div className="p-4 bg-[#F5F7FA] border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-[#2F6FED] shrink-0" />
                        <div>
                          <span className="text-xs font-bold text-[#17345B] block">
                            Curriculum Vitae (CV académique)
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {cvFileName
                              ? `${cvFileName}${cvUploadedAt ? ` (ajouté le ${cvUploadedAt})` : ''}`
                              : 'Aucun CV déposé'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {cvFileName && (
                          <button
                            type="button"
                            onClick={() => {
                              const a = document.createElement('a');
                              if (cvFileUrl) {
                                a.href = cvFileUrl;
                              } else {
                                const blob = new Blob(
                                  [`CV EBM Institute - ${userToView.name}\nGrade: ${academicRank || 'Non renseigné'}`],
                                  { type: 'application/pdf' }
                                );
                                a.href = URL.createObjectURL(blob);
                              }
                              a.download = cvFileName;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                            }}
                            className="px-3 py-1.5 bg-white hover:bg-slate-100 text-[#17345B] border border-slate-300 rounded-xl font-bold text-xs cursor-pointer"
                          >
                            Télécharger
                          </button>
                        )}
                        {isEditing && canEdit && (
                          <label className="px-3.5 py-1.5 bg-[#2F6FED] hover:bg-blue-600 text-white rounded-xl font-bold text-xs cursor-pointer">
                            {cvFileName ? 'Remplacer le CV' : 'Joindre un CV'}
                            <input
                              type="file"
                              accept=".pdf,.doc,.docx"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setCvFileName(file.name);
                                  setCvFileUrl(URL.createObjectURL(file));
                                  setCvUploadedAt(new Date().toLocaleDateString('fr-FR'));
                                  markDirty();
                                }
                              }}
                            />
                          </label>
                        )}
                      </div>
                    </div>

                    {/* Sensitive Financial / Payroll Block — Strictly Restricted to Authorized Roles (Page 6) */}
                    {canAccessSensitiveFinancial && (
                      <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#17345B] flex items-center gap-1.5">
                            <Banknote className="w-4 h-4 text-[#1F8A83]" />
                            Données financières & contrat (Visibilité restreinte : Direction / Finances / Scolarité)
                          </span>
                        </div>
                        {!isEditing ? (
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                            <div>
                              <span className="text-[10px] font-bold uppercase text-slate-500 block">Contrat</span>
                              <div className="mt-1">{renderValueOrEmpty(contractType)}</div>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold uppercase text-slate-500 block">
                                Quota hebdo max
                              </span>
                              <div className="mt-1">{renderValueOrEmpty(`${weeklyMaxHours} h / sem.`)}</div>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold uppercase text-slate-500 block">
                                Taux horaire (Ar/h)
                              </span>
                              <div className="mt-1 font-bold text-[#1F8A83]">
                                {hourlyRateAr ? `${hourlyRateAr.toLocaleString()} Ar` : renderValueOrEmpty('')}
                              </div>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold uppercase text-slate-500 block">
                                RIB / Coordonnées bancaires
                              </span>
                              <div className="mt-1">{renderValueOrEmpty(bankRib, true)}</div>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                            <div>
                              <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">
                                Type de contrat
                              </label>
                              <select
                                value={contractType}
                                onChange={(e) => {
                                  setContractType(e.target.value as any);
                                  markDirty();
                                }}
                                className="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold"
                              >
                                <option value="PERMANENT">Permanent</option>
                                <option value="VACATAIRE">Vacataire</option>
                                <option value="MISSIONNAIRE">Missionnaire</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">
                                Quota max (h/sem)
                              </label>
                              <input
                                type="number"
                                value={weeklyMaxHours}
                                onChange={(e) => {
                                  setWeeklyMaxHours(Number(e.target.value));
                                  markDirty();
                                }}
                                className="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">
                                Taux horaire (Ar/h)
                              </label>
                              <input
                                type="number"
                                step={1000}
                                value={hourlyRateAr}
                                onChange={(e) => {
                                  setHourlyRateAr(Number(e.target.value));
                                  markDirty();
                                }}
                                className="w-full p-2 bg-white border border-emerald-400 rounded-xl font-bold text-[#1F8A83]"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">
                                RIB / Mobile Money
                              </label>
                              <input
                                type="text"
                                value={bankRib}
                                onChange={(e) => {
                                  setBankRib(e.target.value);
                                  markDirty();
                                }}
                                placeholder="Non renseigné"
                                className="w-full p-2 bg-white border border-slate-300 rounded-xl font-mono"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Weekly Availability Grid (07h00 – 17h00) */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <h5 className="font-bold text-[#17345B] text-xs flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-[#2F6FED]" />
                          Disponibilités hebdomadaires (07h00 – 17h00)
                        </h5>
                        {!isEditing && canEdit && (
                          <span className="text-[11px] text-slate-500">
                            Cliquez sur « Modifier le profil » pour ajuster les créneaux
                          </span>
                        )}
                      </div>

                      <div className="overflow-x-auto border border-slate-200 rounded-xl">
                        <table className="w-full text-center border-collapse text-xs">
                          <thead className="bg-[#17345B] text-white text-[10px] uppercase font-bold">
                            <tr>
                              <th className="p-2.5 text-left">Créneau</th>
                              {WEEK_DAYS.map((day) => (
                                <th key={day} className="p-2">
                                  <div>{day}</div>
                                  {isEditing && canEdit && (
                                    <div className="flex justify-center gap-1 mt-1">
                                      <button
                                        type="button"
                                        onClick={() => handleToggleFullDay7h17h(day, true)}
                                        className="px-1.5 py-0.5 bg-[#1F8A83] hover:opacity-90 text-white rounded text-[9px] cursor-pointer"
                                      >
                                        Tout ✓
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleToggleFullDay7h17h(day, false)}
                                        className="px-1.5 py-0.5 bg-red-600 hover:opacity-90 text-white rounded text-[9px] cursor-pointer"
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
                            {WIDE_TEACHER_SLOTS.map((slotObj) => (
                              <tr key={slotObj.code} className="hover:bg-slate-50/70">
                                <td className="p-2 text-left font-bold text-slate-800 bg-[#F5F7FA] whitespace-nowrap">
                                  <span className="font-mono text-[#17345B]">{slotObj.label}</span>
                                </td>
                                {WEEK_DAYS.map((day) => {
                                  const cell = availabilities.find((a) => a.day === day && a.slot === slotObj.code);
                                  const isAvail = cell?.available ?? day !== 'SAMEDI';
                                  return (
                                    <td key={`${day}-${slotObj.code}`} className="p-1.5">
                                      <button
                                        type="button"
                                        disabled={!isEditing || !canEdit}
                                        onClick={() => handleToggleSlot(day, slotObj.code)}
                                        className={`w-full py-1.5 px-2 rounded-lg font-bold text-[11px] border transition ${
                                          isAvail
                                            ? 'bg-emerald-50 text-[#1F8A83] border-emerald-300'
                                            : 'bg-rose-50 text-rose-800 border-rose-200'
                                        } ${isEditing && canEdit ? 'cursor-pointer hover:opacity-85' : 'cursor-default'}`}
                                      >
                                        {isAvail ? 'Disponible' : 'Indisponible'}
                                      </button>
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* CASE C: PERSONNEL ADMINISTRATIF / DIRECTION / PARENT */}
                {!isStudentProfile && !isTeacherProfile && (
                  <div className="space-y-4">
                    <div className="border-b border-slate-100 pb-2.5">
                      <h4 className="font-bold text-[#17345B] text-sm">Fonction, service & rattachement</h4>
                      <p className="text-[11px] text-slate-500">
                        Poste occupé au sein de l'établissement, département et localisation.
                      </p>
                    </div>

                    {!isEditing ? (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#F5F7FA] p-4 rounded-2xl border border-slate-200">
                        <div>
                          <span className="text-[10px] font-bold uppercase text-slate-500 block">
                            Fonction / Poste
                          </span>
                          <div className="mt-1">{renderValueOrEmpty(jobTitle || getRoleLabel(userToView.role))}</div>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase text-slate-500 block">
                            Service / Département
                          </span>
                          <div className="mt-1">{renderValueOrEmpty(department)}</div>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase text-slate-500 block">
                            Bureau / Localisation
                          </span>
                          <div className="mt-1">{renderValueOrEmpty(officeLocation)}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#F5F7FA] p-4 rounded-2xl border border-slate-200">
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">
                            Fonction / Poste
                          </label>
                          <input
                            type="text"
                            value={jobTitle}
                            onChange={(e) => {
                              setJobTitle(e.target.value);
                              markDirty();
                            }}
                            placeholder="Non renseigné"
                            className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-semibold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">
                            Service / Département
                          </label>
                          <input
                            type="text"
                            value={department}
                            onChange={(e) => {
                              setDepartment(e.target.value);
                              markDirty();
                            }}
                            placeholder="Non renseigné"
                            className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">
                            Bureau / Campus
                          </label>
                          <input
                            type="text"
                            value={officeLocation}
                            onChange={(e) => {
                              setOfficeLocation(e.target.value);
                              markDirty();
                            }}
                            placeholder="Non renseigné"
                            className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ==================== TAB 4: COMPTE & SÉCURITÉ ==================== */}
            {activeTab === 'SECURITY' && (
              <div className="space-y-5">
                <div className="border-b border-slate-100 pb-2.5">
                  <h4 className="font-bold text-[#17345B] text-sm">
                    Identifiant de connexion, statut du compte & sécurité
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Aucun mot de passe n'est affiché en clair. La réinitialisation génère un nouveau secret sécurisé.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#F5F7FA] p-4 rounded-2xl border border-slate-200">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">
                      Identifiant de connexion
                    </span>
                    <div className="mt-1 font-mono font-bold text-[#17345B]">
                      {userToView.matricule || userToView.username}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">État du compte</span>
                    <div className="mt-1 flex items-center gap-2">
                      {userToView.isActive !== false ? (
                        <span className="px-2.5 py-0.5 bg-[#1F8A83] text-white rounded-md text-[11px] font-bold">
                          Actif
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 bg-red-600 text-white rounded-md text-[11px] font-bold">
                          Suspendu
                        </span>
                      )}
                      {isAdmin && userToView.id !== currentUser.id && (
                        <button
                          type="button"
                          onClick={() => toggleUserStatus(userToView.id)}
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-[11px] font-bold text-slate-700 cursor-pointer flex items-center gap-1"
                        >
                          <Power className="w-3 h-3" />
                          {userToView.isActive !== false ? 'Suspendre' : 'Réactiver'}
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">Rôle système</span>
                    {isEditing && isAdmin && userToView.id !== currentUser.id ? (
                      <select
                        value={roleValue}
                        onChange={(e) => {
                          setRoleValue(e.target.value as UserRole);
                          markDirty();
                        }}
                        className="mt-1 w-full p-2 bg-white border border-slate-300 rounded-xl font-bold"
                      >
                        {Object.entries(ROLE_LABELS).map(([k, lbl]) => (
                          <option key={k} value={k}>
                            {lbl}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="mt-1 font-bold text-[#17345B]">{getRoleLabel(userToView.role)}</div>
                    )}
                  </div>
                </div>

                {/* Password Reset Section (Accessible to Admins or Self) */}
                {(isAdmin || isSelf) && (
                  <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <KeyRound className="w-4 h-4 text-[#D58A18]" />
                        <h5 className="font-bold text-[#17345B] text-xs uppercase tracking-wider">
                          Réinitialisation du mot de passe
                        </h5>
                      </div>
                      <button
                        type="button"
                        disabled={isSendingResetEmail}
                        onClick={async () => {
                          setIsSendingResetEmail(true);
                          setSecurityFeedback(null);
                          const res = await sendUserPasswordResetEmail(userToView.id);
                          setIsSendingResetEmail(false);
                          setSecurityFeedback({
                            type: res.success ? 'success' : 'error',
                            text: res.message,
                          });
                        }}
                        className="px-3 py-1.5 bg-[#17345B] hover:bg-[#102542] text-white rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                      >
                        <Mail className="w-3.5 h-3.5 text-amber-300" />
                        {isSendingResetEmail ? 'Envoi...' : `Envoyer un lien par e-mail (${userToView.email})`}
                      </button>
                    </div>

                    {securityFeedback && (
                      <div
                        className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                          securityFeedback.type === 'success'
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : 'bg-rose-100 text-rose-900 border border-rose-300'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>{securityFeedback.text}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end pt-1">
                      <div className="sm:col-span-6">
                        <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">
                          Nouveau mot de passe (min. 6 caractères)
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={newPasswordInput}
                            onChange={(e) => setNewPasswordInput(e.target.value)}
                            placeholder="Saisir ou générer un nouveau mot de passe"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900 text-xs"
                          />
                          {newPasswordInput && (
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard?.writeText(newPasswordInput).catch(() => {});
                                setCopiedPwd(true);
                                setTimeout(() => setCopiedPwd(false), 2000);
                              }}
                              className="px-2.5 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-700 cursor-pointer shrink-0"
                              title="Copier"
                            >
                              {copiedPwd ? <Check className="w-3.5 h-3.5 text-[#1F8A83]" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="sm:col-span-3">
                        <button
                          type="button"
                          onClick={() => {
                            setNewPasswordInput(generateRandomPassword());
                            setCopiedPwd(false);
                          }}
                          className="w-full px-3 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-[#2F6FED]" />
                          Générer
                        </button>
                      </div>
                      <div className="sm:col-span-3">
                        <button
                          type="button"
                          onClick={() => {
                            const res = setDirectUserPassword(
                              userToView.id,
                              newPasswordInput,
                              forceChangeNextLogin
                            );
                            setSecurityFeedback({
                              type: res.success ? 'success' : 'error',
                              text: res.message,
                            });
                            if (res.success) setNewPasswordInput('');
                          }}
                          className="w-full px-3 py-2 bg-[#2F6FED] hover:bg-blue-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          Appliquer
                        </button>
                      </div>
                    </div>

                    {isAdmin && (
                      <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-700 cursor-pointer pt-1">
                        <input
                          type="checkbox"
                          checked={forceChangeNextLogin}
                          onChange={(e) => setForceChangeNextLogin(e.target.checked)}
                          className="rounded border-slate-300"
                        />
                        Demander le changement du mot de passe à la prochaine connexion
                      </label>
                    )}
                  </div>
                )}

                {/* Modification History */}
                <div className="p-4 bg-[#F5F7FA] rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-500">
                    <History className="w-3.5 h-3.5 text-[#2F6FED]" />
                    <span>Historique des modifications de la fiche</span>
                  </div>
                  {!userToView.modificationHistory || userToView.modificationHistory.length === 0 ? (
                    <p className="text-slate-400 italic text-[11px]">
                      Aucune modification enregistrée depuis la création du profil.
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                      {userToView.modificationHistory.map((h) => (
                        <div
                          key={h.id}
                          className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-[11px]"
                        >
                          <div>
                            <span className="font-bold text-slate-800">{h.authorName}</span>
                            <span className="text-slate-500">
                              {' '}
                              — {h.field} : « {h.oldValue} » → « {h.newValue} »
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
          </div>

          {/* 5. Fixed Footer Across All 4 Tabs (Section 4, Page 6) */}
          <div className="px-5 sm:px-6 py-3.5 bg-[#F5F7FA] border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
            <div className="text-xs text-slate-500 flex items-center gap-2">
              {isEditing ? (
                isDirty ? (
                  <span className="text-[#D58A18] font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    Modifications non enregistrées
                  </span>
                ) : (
                  <span>Mode édition actif — Aucune modification en attente</span>
                )
              ) : (
                <span className="flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-slate-400" />
                  Mode consultation
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              {!isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={handleRequestClose}
                    className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold rounded-xl text-xs cursor-pointer"
                  >
                    Fermer
                  </button>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2 bg-[#2F6FED] hover:bg-blue-600 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Modifier le profil
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold rounded-xl text-xs cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#2F6FED] hover:bg-blue-600 text-white font-bold rounded-xl text-xs shadow-sm flex items-center gap-2 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    Enregistrer
                  </button>
                </>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
