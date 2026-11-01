import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  Users,
  UserPlus,
  Shield,
  ShieldAlert,
  Search,
  KeyRound,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  X,
  Power,
  Eye,
  Mail,
  Sparkles,
  Copy,
  Check,
  UserCheck,
  RefreshCw,
  Lock,
  SlidersHorizontal,
  ArrowUpDown,
  RotateCcw,
} from 'lucide-react';
import { User, UserRole } from '../types';
import { ROLE_LABELS } from '../utils/rbacPermissions';
import { UserProfileModal } from './UserProfileModal';
import { requestAppConfirm } from './ToastAndConfirmCenter';

const ALL_CONFIGURABLE_TABS: { id: string; label: string }[] = [
  { id: 'HOME', label: 'Tableau de bord' },
  { id: 'TIMETABLE', label: 'Emplois du temps' },
  { id: 'VOLUMES', label: 'Volumes horaires' },
  { id: 'LMD_MAQUETTES', label: 'Filières & maquettes LMD' },
  { id: 'GRADES', label: 'Notes & évaluations' },
  { id: 'QR_ATTENDANCE', label: 'Présences & appel QR' },
  { id: 'HOMEWORK_RESOURCES', label: 'Devoirs & documents' },
  { id: 'ROOMS', label: 'Salles & disponibilités' },
  { id: 'STUDENTS', label: 'Étudiants' },
  { id: 'EXPORT_STUDENTS', label: 'Exports & listes' },
  { id: 'FINANCIAL', label: 'Finances & caisse' },
  { id: 'COMMUNICATION', label: 'Annonces & messagerie' },
  { id: 'PARENT_PORTAL', label: 'Portail Parents / Tuteurs' },
  { id: 'ACADEMIC_YEARS', label: 'Années universitaires' },
  { id: 'USERS_MANAGEMENT', label: 'Personnes & rôles' },
  { id: 'BACKUP_SECURITY', label: 'Sauvegardes & sécurité' },
  { id: 'SETTINGS', label: 'Paramètres' },
];

export const UserManagement: React.FC = () => {
  const {
    users,
    addUser,
    updateUser,
    deleteUser,
    toggleUserStatus,
    sendUserPasswordResetEmail,
    setDirectUserPassword,
    groups,
    filieres,
    customRoles,
    currentUser,
    setCurrentUser,
    isRealAdminSession,
  } = useApp();

  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filters & Sorting (Section 3, Page 4)
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [mentionFilter, setMentionFilter] = useState<string>('ALL');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);
  const [sortField, setSortField] = useState<'name' | 'role' | 'identifier' | 'status'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Unified 4-Tab User Profile Modal State (Pages 5 & 6)
  const [profileModalUser, setProfileModalUser] = useState<User | null>(null);
  const [profileModalInitialEdit, setProfileModalInitialEdit] = useState<boolean>(false);
  const [profileModalInitialTab, setProfileModalInitialTab] = useState<'IDENTITY' | 'CONTACT' | 'JOB' | 'SECURITY'>(
    'IDENTITY'
  );

  // Create New User Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [civilite, setCivilite] = useState<'M.' | 'Mme' | 'Mlle' | 'Dr.' | 'Prof.'>('M.');
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('STUDENT');
  const [customRoleId, setCustomRoleId] = useState<string>('');
  const [identifier, setIdentifier] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [secondaryPhone, setSecondaryPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [groupId, setGroupId] = useState(groups[0]?.id || '');
  const [birthDate, setBirthDate] = useState('');
  const [subjects, setSubjects] = useState('');
  const [weeklyMaxHours, setWeeklyMaxHours] = useState(18);
  const [hourlyRateAr, setHourlyRateAr] = useState(40000);
  const [contractType, setContractType] = useState<'PERMANENT' | 'VACATAIRE' | 'MISSIONNAIRE'>('VACATAIRE');
  const [allowedTabs, setAllowedTabs] = useState<string[]>([]);
  const [deniedTabs, setDeniedTabs] = useState<string[]>([]);
  const [initialOrNewPassword, setInitialOrNewPassword] = useState<string>('');
  const [copiedPwd, setCopiedPwd] = useState<boolean>(false);
  const [formMsg, setFormMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const generateRandomPassword = (prefix = 'Ebm') => {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghijkmnpqrstuvwxyz';
    const digits = '23456789';
    const symbols = '@#!$';
    const pick = (chars: string, len: number) =>
      Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `${prefix}${symbols[Math.floor(Math.random() * symbols.length)]}2026-${pick(upper, 2)}${pick(digits, 3)}${pick(lower, 2)}`;
  };

  // Profile completeness check ("À compléter / À vérifier" badge from Page 1 & Page 4)
  const isUserIncomplete = (u: User) => {
    if (!u.email || !u.phone) return true;
    if (u.role === 'STUDENT' && !u.groupId) return true;
    return false;
  };

  // KPI Metrics (3–4 clean metric cards — Page 1 & Page 4)
  const totalCount = users.length;
  const activeCount = users.filter((u) => u.isActive !== false).length;
  const incompleteCount = users.filter((u) => u.isActive !== false && isUserIncomplete(u)).length;
  const suspendedCount = users.filter((u) => u.isActive === false).length;

  const departments = Array.from(new Set(users.map((u) => u.department || u.service).filter(Boolean))) as string[];

  const hasActiveFilters =
    searchTerm.trim() !== '' ||
    roleFilter !== 'ALL' ||
    statusFilter !== 'ALL' ||
    departmentFilter !== 'ALL' ||
    mentionFilter !== 'ALL';

  const handleResetFilters = () => {
    setSearchTerm('');
    setRoleFilter('ALL');
    setStatusFilter('ALL');
    setDepartmentFilter('ALL');
    setMentionFilter('ALL');
  };

  const handleSort = (field: 'name' | 'role' | 'identifier' | 'status') => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedUsers = useMemo(() => {
    const list = users.filter((u) => {
      if (roleFilter !== 'ALL') {
        if (roleFilter === 'SCOLARITE') {
          if (u.role !== 'SCOLARITE' && u.role !== 'SCHEDULER' && u.role !== 'ACADEMIC_HEAD') return false;
        } else if (roleFilter === 'ADMIN_STAFF') {
          if (u.role !== 'ADMIN_STAFF' && u.role !== 'FINANCE') return false;
        } else if (u.role !== roleFilter) {
          return false;
        }
      }
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'ACTIVE' && u.isActive === false) return false;
        if (statusFilter === 'INCOMPLETE' && !isUserIncomplete(u)) return false;
        if (statusFilter === 'INACTIVE' && u.isActive !== false) return false;
      }
      if (departmentFilter !== 'ALL') {
        if (u.department !== departmentFilter && u.service !== departmentFilter) return false;
      }
      if (mentionFilter !== 'ALL') {
        const grp = groups.find((g) => g.id === u.groupId);
        if (grp?.filiereId !== mentionFilter) return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          u.name.toLowerCase().includes(q) ||
          (u.lastName && u.lastName.toLowerCase().includes(q)) ||
          (u.firstName && u.firstName.toLowerCase().includes(q)) ||
          u.email.toLowerCase().includes(q) ||
          u.username.toLowerCase().includes(q) ||
          (u.matricule && u.matricule.toLowerCase().includes(q)) ||
          (u.jobTitle && u.jobTitle.toLowerCase().includes(q))
        );
      }
      return true;
    });

    return [...list].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') {
        cmp = a.name.localeCompare(b.name, 'fr');
      } else if (sortField === 'role') {
        cmp = (ROLE_LABELS[a.role] || a.role).localeCompare(ROLE_LABELS[b.role] || b.role, 'fr');
      } else if (sortField === 'identifier') {
        cmp = (a.matricule || a.username).localeCompare(b.matricule || b.username, 'fr');
      } else if (sortField === 'status') {
        cmp = Number(b.isActive !== false) - Number(a.isActive !== false);
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [users, roleFilter, statusFilter, departmentFilter, mentionFilter, searchTerm, groups, sortField, sortDirection]);

  const handleOpenCreate = () => {
    setCivilite('M.');
    setLastName('');
    setFirstName('');
    setName('');
    setRole('STUDENT');
    setCustomRoleId('');
    setIdentifier('');
    setEmail('');
    setPhone('');
    setSecondaryPhone('');
    setDepartment('');
    setJobTitle('');
    setGroupId(groups[0]?.id || '');
    setBirthDate('');
    setSubjects('');
    setWeeklyMaxHours(18);
    setHourlyRateAr(40000);
    setContractType('VACATAIRE');
    setAllowedTabs([]);
    setDeniedTabs([]);
    setInitialOrNewPassword(generateRandomPassword('Ebm'));
    setFormMsg(null);
    setIsCreateModalOpen(true);
  };

  const handleOpenUserProfile = (
    user: User,
    editMode = false,
    tab: 'IDENTITY' | 'CONTACT' | 'JOB' | 'SECURITY' = 'IDENTITY'
  ) => {
    setProfileModalUser(user);
    setProfileModalInitialEdit(editMode);
    setProfileModalInitialTab(tab);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormMsg(null);

    const fullName = name.trim() || `${firstName.trim()} ${lastName.trim()}`.trim();
    if (!fullName || !email.trim()) {
      setFormMsg({ type: 'error', text: 'Veuillez renseigner le nom complet et une adresse e-mail valide.' });
      return;
    }

    const phonesList = [phone.trim(), secondaryPhone.trim()].filter(Boolean);
    const cleanInitialPwd = initialOrNewPassword.trim();

    const res = addUser({
      civilite,
      lastName: lastName.trim() || undefined,
      firstName: firstName.trim() || undefined,
      name: fullName,
      role,
      customRoleId: customRoleId || undefined,
      matricule: role === 'STUDENT' ? identifier.trim().toUpperCase() : undefined,
      username: role === 'STUDENT' ? identifier.trim().toUpperCase() : identifier.trim().toLowerCase(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      phones: phonesList.length > 0 ? phonesList : undefined,
      department: department.trim() || undefined,
      jobTitle: jobTitle.trim() || undefined,
      groupId: role === 'STUDENT' ? groupId : undefined,
      birthDate: birthDate || undefined,
      subjects:
        role === 'TEACHER'
          ? subjects
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined,
      weeklyMaxHours: role === 'TEACHER' ? Number(weeklyMaxHours) : undefined,
      hourlyRateAr: role === 'TEACHER' ? Number(hourlyRateAr) : undefined,
      contractType: role === 'TEACHER' ? contractType : undefined,
      customPermissions: allowedTabs.length > 0 || deniedTabs.length > 0 ? { allowedTabs, deniedTabs } : undefined,
      passwordHash: cleanInitialPwd.length >= 6 ? cleanInitialPwd : undefined,
      isActive: true,
      mustChangePassword: cleanInitialPwd.length >= 6 ? false : true,
    } as any);

    if (res.success) {
      setFormMsg({
        type: 'success',
        text: `Personne « ${fullName} » ajoutée avec succès.`,
      });
      setTimeout(() => setIsCreateModalOpen(false), 1000);
    } else {
      setFormMsg({ type: 'error', text: res.error || 'Erreur lors de la création.' });
    }
  };

  const getRoleBadge = (uRole: UserRole, cRoleId?: string) => {
    const custom = customRoles.find((cr) => cr.id === cRoleId);
    const label = custom ? custom.label || custom.name : ROLE_LABELS[uRole] || uRole;
    switch (uRole) {
      case 'ADMIN':
        return (
          <span className="px-2.5 py-0.5 bg-[#17345B] text-white font-bold rounded-md text-[10px] uppercase">
            {label}
          </span>
        );
      case 'SCOLARITE':
      case 'SCHEDULER':
        return (
          <span className="px-2.5 py-0.5 bg-purple-100 text-purple-900 font-bold rounded-md text-[10px] uppercase">
            {label}
          </span>
        );
      case 'ADMIN_STAFF':
        return (
          <span className="px-2.5 py-0.5 bg-slate-200 text-slate-800 font-bold rounded-md text-[10px] uppercase">
            {label}
          </span>
        );
      case 'FINANCE':
        return (
          <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-900 font-bold rounded-md text-[10px] uppercase">
            {label}
          </span>
        );
      case 'ACADEMIC_HEAD':
        return (
          <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-900 font-bold rounded-md text-[10px] uppercase">
            {label}
          </span>
        );
      case 'TEACHER':
        return (
          <span className="px-2.5 py-0.5 bg-teal-100 text-teal-900 font-bold rounded-md text-[10px] uppercase">
            {label}
          </span>
        );
      case 'PARENT':
        return (
          <span className="px-2.5 py-0.5 bg-rose-100 text-rose-900 font-bold rounded-md text-[10px] uppercase">
            {label}
          </span>
        );
      case 'STUDENT':
        return (
          <span className="px-2.5 py-0.5 bg-blue-100 text-blue-900 font-bold rounded-md text-[10px] uppercase">
            {label}
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Standard Page Header (Pages 1 & 4: Titre, sous-titre et 1 action principale en haut à droite) */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#17345B] text-white rounded-xl shadow-xs">
              <Users className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-[#17345B]">
                Gestion des personnes — Étudiants, enseignants et personnel
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Consultez et mettez à jour les fiches individuelles, les coordonnées, les informations métier et les accès.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-4 py-2.5 bg-[#2F6FED] hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer self-start sm:self-auto shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Ajouter une personne</span>
          </button>
        </div>
      </div>

      {/* 2. 4 Clean KPI Cards (Pages 1 & 4: Personnes | Actifs | À compléter | Suspendus) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => setStatusFilter('ALL')}
          className={`bg-white p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'ALL' ? 'border-[#2F6FED] ring-1 ring-[#2F6FED]/30' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <span className="text-[11px] font-bold uppercase text-slate-500 block">Personnes</span>
          <span className="text-2xl font-black text-[#17345B] mt-1 block">{totalCount}</span>
          <span className="text-[11px] text-slate-400">Total annuaire établissement</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'ACTIVE' ? 'ALL' : 'ACTIVE')}
          className={`bg-white p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'ACTIVE'
              ? 'border-[#1F8A83] ring-1 ring-[#1F8A83]/30'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <span className="text-[11px] font-bold uppercase text-[#1F8A83] block">Actifs</span>
          <span className="text-2xl font-black text-[#1F8A83] mt-1 block">{activeCount}</span>
          <span className="text-[11px] text-slate-400">Comptes autorisés à se connecter</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'INCOMPLETE' ? 'ALL' : 'INCOMPLETE')}
          className={`bg-white p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'INCOMPLETE'
              ? 'border-[#D58A18] ring-1 ring-[#D58A18]/30'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <span className="text-[11px] font-bold uppercase text-[#D58A18] block">À compléter</span>
          <span className="text-2xl font-black text-[#D58A18] mt-1 block">{incompleteCount}</span>
          <span className="text-[11px] text-slate-400">Fiches avec coordonnées manquantes</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'INACTIVE' ? 'ALL' : 'INACTIVE')}
          className={`bg-white p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'INACTIVE'
              ? 'border-red-500 ring-1 ring-red-200'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <span className="text-[11px] font-bold uppercase text-slate-500 block">Suspendus</span>
          <span className="text-2xl font-black text-slate-700 mt-1 block">{suspendedCount}</span>
          <span className="text-[11px] text-slate-400">Comptes désactivés</span>
        </button>
      </div>

      {/* 3. Search, Frequent Filters & Collapsible Advanced Filters (Page 1 & Page 4) */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5 text-xs">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Rechercher par nom, matricule, fonction, e-mail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-[#F5F7FA] border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:border-[#2F6FED] outline-none"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Frequent Filter 1: Role */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 bg-[#F5F7FA] border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
          >
            <option value="ALL">Rôle : Tous ({users.length})</option>
            <option value="STUDENT">Étudiants ({users.filter((u) => u.role === 'STUDENT').length})</option>
            <option value="TEACHER">Enseignants ({users.filter((u) => u.role === 'TEACHER').length})</option>
            <option value="SCOLARITE">Scolarité & Planning</option>
            <option value="ADMIN_STAFF">Personnel & Finances</option>
            <option value="PARENT">Parents / Tuteurs</option>
            <option value="ADMIN">Administrateurs</option>
          </select>

          {/* Frequent Filter 2: Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-[#F5F7FA] border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
          >
            <option value="ALL">Statut : Tous</option>
            <option value="ACTIVE">Actifs uniquement</option>
            <option value="INCOMPLETE">À compléter / À vérifier</option>
            <option value="INACTIVE">Suspendus</option>
          </select>

          {/* Advanced Filters Toggle */}
          <button
            type="button"
            onClick={() => setShowAdvancedFilters((prev) => !prev)}
            className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
              showAdvancedFilters || departmentFilter !== 'ALL' || mentionFilter !== 'ALL'
                ? 'bg-[#17345B] text-white border-[#17345B]'
                : 'bg-[#F5F7FA] text-slate-700 border-slate-300 hover:bg-slate-100'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filtres avancés</span>
          </button>

          {/* Reset Filters Button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
              title="Réinitialiser tous les filtres"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Réinitialiser</span>
            </button>
          )}
        </div>

        {/* Collapsible Advanced Filters Panel */}
        {showAdvancedFilters && (
          <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                Service / Département
              </label>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="w-full p-2 bg-[#F5F7FA] border border-slate-300 rounded-xl font-semibold"
              >
                <option value="ALL">Tous les départements</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                Filière / Mention (Étudiants)
              </label>
              <select
                value={mentionFilter}
                onChange={(e) => setMentionFilter(e.target.value)}
                className="w-full p-2 bg-[#F5F7FA] border border-slate-300 rounded-xl font-semibold"
              >
                <option value="ALL">Toutes les filières</option>
                {filieres.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.code} — {f.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {actionFeedback && (
          <div
            className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
              actionFeedback.type === 'error'
                ? 'bg-red-50 text-red-800 border-red-200'
                : 'bg-emerald-50 text-emerald-900 border-emerald-200'
            }`}
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{actionFeedback.text}</span>
          </div>
        )}

        {/* 4. Main Directory Table with Sortable Columns */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#F5F7FA] text-[#17345B] font-bold uppercase text-[10px] border-b border-slate-200">
              <tr>
                <th className="p-3">
                  <button
                    type="button"
                    onClick={() => handleSort('name')}
                    className="flex items-center gap-1 hover:text-[#2F6FED] cursor-pointer uppercase font-bold"
                  >
                    <span>Nom & fonction</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="p-3">
                  <button
                    type="button"
                    onClick={() => handleSort('role')}
                    className="flex items-center gap-1 hover:text-[#2F6FED] cursor-pointer uppercase font-bold"
                  >
                    <span>Rôle</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="p-3">
                  <button
                    type="button"
                    onClick={() => handleSort('identifier')}
                    className="flex items-center gap-1 hover:text-[#2F6FED] cursor-pointer uppercase font-bold"
                  >
                    <span>Identifiant</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="p-3">Service / Groupe</th>
                <th className="p-3">Contact</th>
                <th className="p-3">
                  <button
                    type="button"
                    onClick={() => handleSort('status')}
                    className="flex items-center gap-1 hover:text-[#2F6FED] cursor-pointer uppercase font-bold"
                  >
                    <span>Statut</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAndSortedUsers.length === 0 ? (
                /* Explicit Empty State with Direct Action (Section 5, Page 7) */
                <tr>
                  <td colSpan={7} className="p-8 text-center">
                    <div className="max-w-sm mx-auto space-y-2">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
                        <Users className="w-5 h-5" />
                      </div>
                      <div className="font-bold text-slate-800 text-sm">
                        Aucune personne ne correspond aux filtres sélectionnés
                      </div>
                      <p className="text-xs text-slate-500">
                        Modifiez votre recherche ou réinitialisez les filtres actifs pour afficher l'annuaire complet.
                      </p>
                      {hasActiveFilters && (
                        <button
                          type="button"
                          onClick={handleResetFilters}
                          className="mt-2 px-3.5 py-1.5 bg-[#2F6FED] text-white rounded-xl text-xs font-bold cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Réinitialiser les filtres
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAndSortedUsers.map((user) => {
                  const assignedGroup = groups.find((g) => g.id === user.groupId);
                  const incomplete = isUserIncomplete(user);

                  return (
                    <tr
                      key={user.id}
                      onClick={() => handleOpenUserProfile(user, false, 'IDENTITY')}
                      className="hover:bg-blue-50/40 transition-colors cursor-pointer"
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-[#17345B]/10 text-[#17345B] font-bold flex items-center justify-center text-xs flex-shrink-0">
                            {user.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">
                              {user.civilite ? `${user.civilite} ` : ''}
                              {user.name}
                            </span>
                            {user.jobTitle && (
                              <span className="text-[10px] text-slate-500 font-medium block">{user.jobTitle}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="p-3">{getRoleBadge(user.role, user.customRoleId)}</td>

                      <td className="p-3 font-mono font-bold text-[#17345B]">
                        {user.matricule || user.username}
                      </td>

                      <td className="p-3 text-slate-700">
                        <span className="font-semibold block">
                          {user.role === 'STUDENT'
                            ? assignedGroup?.code || 'Sans groupe'
                            : user.department || user.service || '—'}
                        </span>
                      </td>

                      <td className="p-3 text-slate-600">
                        <span className="block truncate max-w-[180px]">{user.email}</span>
                        <span className="text-[10px] text-slate-400">
                          {user.phone || user.phones?.[0] || 'Tél. non renseigné'}
                        </span>
                      </td>

                      {/* Semantic Status Badges Combining Color + Explicit Text (Page 1 & Page 7) */}
                      <td className="p-3">
                        <div className="flex flex-wrap items-center gap-1">
                          {user.isActive !== false ? (
                            <span className="px-2 py-0.5 bg-[#1F8A83]/15 text-[#1F8A83] border border-[#1F8A83]/30 font-bold rounded-md text-[10px]">
                              Actif
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-red-100 text-red-800 border border-red-200 font-bold rounded-md text-[10px] inline-flex items-center gap-1">
                              <ShieldAlert className="w-3 h-3 text-red-600" />
                              Suspendu
                            </span>
                          )}
                          {user.isActive !== false && incomplete && (
                            <span className="px-2 py-0.5 bg-amber-100 text-[#D58A18] border border-amber-300 font-bold rounded-md text-[10px]">
                              À vérifier
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleOpenUserProfile(user, false, 'IDENTITY')}
                            className="px-2.5 py-1 text-[#17345B] bg-[#F5F7FA] hover:bg-slate-200 border border-slate-200 rounded-lg text-[11px] font-bold transition-colors cursor-pointer inline-flex items-center gap-1"
                            title="Ouvrir la fiche en mode consultation"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#2F6FED]" />
                            <span>Voir</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenUserProfile(user, true, 'IDENTITY')}
                            className="px-2.5 py-1 text-white bg-[#2F6FED] hover:bg-blue-600 rounded-lg text-[11px] font-bold transition-colors cursor-pointer inline-flex items-center gap-1"
                            title="Modifier la fiche utilisateur"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Modifier</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenUserProfile(user, false, 'SECURITY')}
                            className="p-1.5 text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors cursor-pointer"
                            title="Compte & mot de passe"
                          >
                            <KeyRound className="w-3.5 h-3.5 text-[#D58A18]" />
                          </button>

                          {isRealAdminSession && (
                            <button
                              type="button"
                              onClick={() => setCurrentUser(user)}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer inline-flex items-center gap-1 ${
                                user.id === currentUser?.id
                                  ? 'bg-[#1F8A83] text-white'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                              }`}
                              title={`Tester avec le profil de ${user.name}`}
                            >
                              <UserCheck className="w-3 h-3" />
                              <span>{user.id === currentUser?.id ? 'Actif' : 'Tester'}</span>
                            </button>
                          )}

                          {user.id !== currentUser?.id && (
                            <button
                              type="button"
                              onClick={() => {
                                requestAppConfirm({
                                  title: `Supprimer ${user.name} ?`,
                                  message: `Voulez-vous supprimer le compte de ${user.name} (${user.matricule || user.username}) ?`,
                                  confirmLabel: 'Supprimer',
                                  variant: 'danger',
                                  onConfirm: () => {
                                    const res = deleteUser(user.id);
                                    if (!res.success) {
                                      setActionFeedback({ type: 'error', text: res.error || 'Suppression refusée.' });
                                    } else {
                                      setActionFeedback({ type: 'success', text: `Compte de ${user.name} supprimé.` });
                                    }
                                    setTimeout(() => setActionFeedback(null), 5000);
                                  },
                                });
                              }}
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                              title="Supprimer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
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

      {/* Unified 4-Tab User Profile Sheet Modal (Pages 5 & 6) */}
      <UserProfileModal
        isOpen={!!profileModalUser}
        onClose={() => setProfileModalUser(null)}
        targetUser={profileModalUser}
        initialEditMode={profileModalInitialEdit}
        initialTab={profileModalInitialTab}
      />

      {/* Create New Person Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 my-8">
            <div className="p-5 bg-[#17345B] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#2F6FED] text-white rounded-xl">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Ajouter une personne</h3>
                  <p className="text-xs text-blue-200">
                    Création d'une fiche étudiant, enseignant ou personnel administratif
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-300 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 text-xs max-h-[82vh] overflow-y-auto">
              {formMsg && (
                <div
                  className={`p-3 rounded-xl flex items-center gap-2 font-bold ${
                    formMsg.type === 'success'
                      ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                >
                  {formMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-[#1F8A83] shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <span>{formMsg.text}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-bold uppercase text-slate-700 mb-1">Civilité</label>
                  <select
                    value={civilite}
                    onChange={(e) => setCivilite(e.target.value as any)}
                    className="w-full p-2.5 bg-[#F5F7FA] border border-slate-300 rounded-xl font-semibold"
                  >
                    <option value="M.">M.</option>
                    <option value="Mme">Mme</option>
                    <option value="Mlle">Mlle</option>
                    <option value="Dr.">Dr.</option>
                    <option value="Prof.">Prof.</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold uppercase text-slate-700 mb-1">Nom *</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => {
                      setLastName(e.target.value);
                      setName(`${firstName} ${e.target.value}`.trim());
                    }}
                    placeholder="Rakoto"
                    className="w-full p-2.5 bg-[#F5F7FA] border border-slate-300 rounded-xl font-semibold"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-bold uppercase text-slate-700 mb-1">Prénom(s) / Nom complet *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jean Rakoto"
                    className="w-full p-2.5 bg-[#F5F7FA] border border-slate-300 rounded-xl font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold uppercase text-slate-700 mb-1">Rôle *</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full p-2.5 bg-[#F5F7FA] border border-slate-300 rounded-xl font-semibold"
                  >
                    <option value="STUDENT">Étudiant</option>
                    <option value="TEACHER">Enseignant</option>
                    <option value="ADMIN_STAFF">Personnel Administratif</option>
                    <option value="SCOLARITE">Scolarité & Planning</option>
                    <option value="FINANCE">Finances & Caisse</option>
                    <option value="ACADEMIC_HEAD">Responsable Pédagogique</option>
                    <option value="PARENT">Parent / Tuteur</option>
                    <option value="ADMIN">Administrateur</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold uppercase text-slate-700 mb-1">
                    {role === 'STUDENT' ? 'Matricule *' : 'Identifiant *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder={role === 'STUDENT' ? 'EBM-2026-XXXX' : 'prenom.nom'}
                    className="w-full p-2.5 bg-[#F5F7FA] border border-slate-300 rounded-xl font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase text-slate-700 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nom@ebm-institute.mg"
                    className="w-full p-2.5 bg-[#F5F7FA] border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold uppercase text-slate-700 mb-1">Téléphone principal</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+261 34..."
                    className="w-full p-2.5 bg-[#F5F7FA] border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase text-slate-700 mb-1">Département / Service</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Non renseigné"
                    className="w-full p-2.5 bg-[#F5F7FA] border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase text-slate-700 mb-1">Fonction / Poste</label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="Non renseigné"
                    className="w-full p-2.5 bg-[#F5F7FA] border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              {role === 'STUDENT' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-[#F5F7FA] rounded-xl border border-slate-200">
                  <div>
                    <label className="block font-bold uppercase text-slate-700 mb-1">Groupe d'affectation</label>
                    <select
                      value={groupId}
                      onChange={(e) => setGroupId(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold"
                    >
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.code} ({g.name})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold uppercase text-slate-700 mb-1">
                      Date de naissance (optionnel)
                    </label>
                    <input
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-300 rounded-xl"
                    />
                  </div>
                </div>
              )}

              {/* Initial Password Generator */}
              <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 uppercase text-[10px] flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-[#D58A18]" />
                    Mot de passe initial du compte
                  </span>
                  <button
                    type="button"
                    onClick={() => setInitialOrNewPassword(generateRandomPassword('Ebm'))}
                    className="px-2.5 py-1 bg-white border border-amber-300 text-slate-800 rounded-lg font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-[#D58A18]" />
                    Nouveau mot de passe aléatoire
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={initialOrNewPassword}
                    onChange={(e) => setInitialOrNewPassword(e.target.value)}
                    className="w-full p-2 bg-white border border-amber-300 rounded-xl font-mono font-bold text-slate-900"
                  />
                  {initialOrNewPassword && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(initialOrNewPassword).catch(() => {});
                        setCopiedPwd(true);
                        setTimeout(() => setCopiedPwd(false), 2000);
                      }}
                      className="px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-[11px] text-slate-700 cursor-pointer shrink-0"
                    >
                      {copiedPwd ? 'Copié ✓' : 'Copier'}
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-100 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#2F6FED] hover:bg-blue-600 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
