import React, { useState } from 'react';
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
  RotateCcw,
  Eye,
  History,
  Building2,
  Linkedin,
  Phone,
  Mail,
  Sparkles,
  Copy,
  Check,
  UserCheck,
  RefreshCw,
  Lock,
} from 'lucide-react';
import { User, UserRole } from '../types';
import { ROLE_LABELS } from '../utils/rbacPermissions';

const ALL_CONFIGURABLE_TABS: { id: string; label: string }[] = [
  { id: 'HOME', label: 'Accueil & Tableau de Bord' },
  { id: 'TIMETABLE', label: 'Emploi du Temps' },
  { id: 'COURSES', label: 'Cours & Enseignements' },
  { id: 'VOLUMES', label: 'Suivi Volumes Horaires' },
  { id: 'LMD_MAQUETTES', label: 'Maquettes LMD & Parcours' },
  { id: 'GRADES', label: 'Notes & Délibérations' },
  { id: 'QR_ATTENDANCE', label: 'Pointage QR & Absences' },
  { id: 'HOMEWORK', label: 'Devoirs & Ressources' },
  { id: 'ROOMS', label: 'Salles & Calendriers' },
  { id: 'STUDENTS', label: 'Répertoire Étudiants' },
  { id: 'EXPORT_STUDENTS', label: 'Exports & Listes' },
  { id: 'FINANCIAL', label: 'Finances & Caisse' },
  { id: 'COMMUNICATION', label: 'Communication & Annonces' },
  { id: 'PARENT_PORTAL', label: 'Espace Parents / Tuteurs' },
  { id: 'ACADEMIC_YEARS', label: 'Paramètres Académiques' },
  { id: 'USERS_MANAGEMENT', label: 'Utilisateurs & Rôles' },
  { id: 'BACKUP_SECURITY', label: 'Sauvegarde & Audit' },
  { id: 'SETTINGS', label: 'Paramètres Application' },
];

export const UserManagement: React.FC = () => {
  const {
    users,
    addUser,
    updateUser,
    deleteUser,
    toggleUserStatus,
    resetUserPassword,
    sendUserPasswordResetEmail,
    setDirectUserPassword,
    groups,
    filieres,
    customRoles,
    currentUser,
    setCurrentUser,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [mentionFilter, setMentionFilter] = useState<string>('ALL');

  // Modal State for Create / Edit User
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // Individual User Sheet Modal (ACC-063 to ACC-068)
  const [selectedUserSheet, setSelectedUserSheet] = useState<User | null>(null);

  // Form State
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
  const [linkedInUrl, setLinkedInUrl] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Antananarivo');
  const [department, setDepartment] = useState('');
  const [service, setService] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [officeLocation, setOfficeLocation] = useState('');
  const [groupId, setGroupId] = useState(groups[0]?.id || '');
  const [birthDate, setBirthDate] = useState('2005-01-01');
  const [subjects, setSubjects] = useState('');
  const [weeklyMaxHours, setWeeklyMaxHours] = useState(18);
  const [hourlyRateAr, setHourlyRateAr] = useState(40000);
  const [contractType, setContractType] = useState<'PERMANENT' | 'VACATAIRE' | 'MISSIONNAIRE'>('VACATAIRE');
  const [allowedTabs, setAllowedTabs] = useState<string[]>([]);
  const [deniedTabs, setDeniedTabs] = useState<string[]>([]);
  const [initialOrNewPassword, setInitialOrNewPassword] = useState<string>('');

  // Dedicated Password Reset / Direct Entry / Random Generator State
  const [passwordModalUser, setPasswordModalUser] = useState<User | null>(null);
  const [directPasswordInput, setDirectPasswordInput] = useState<string>('');
  const [showDirectPassword, setShowDirectPassword] = useState<boolean>(true);
  const [forceChangeNextLogin, setForceChangeNextLogin] = useState<boolean>(false);
  const [randomProposals, setRandomProposals] = useState<string[]>([]);
  const [copiedPwd, setCopiedPwd] = useState<boolean>(false);
  const [pwdFeedback, setPwdFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState<boolean>(false);

  const generateRandomPassword = (prefix = 'Ebm') => {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghijkmnpqrstuvwxyz';
    const digits = '23456789';
    const symbols = '@#!$';
    const pick = (chars: string, len: number) =>
      Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `${prefix}${symbols[Math.floor(Math.random() * symbols.length)]}2026-${pick(upper, 2)}${pick(digits, 3)}${pick(lower, 2)}`;
  };

  const refreshRandomProposals = () => {
    const p1 = generateRandomPassword('Ebm');
    const p2 = generateRandomPassword('Univ');
    const p3 = generateRandomPassword('Sis');
    setRandomProposals([p1, p2, p3]);
    setDirectPasswordInput(p1);
    setCopiedPwd(false);
  };

  const openPasswordModalForUser = (user: User) => {
    setPasswordModalUser(user);
    setPwdFeedback(null);
    setForceChangeNextLogin(false);
    setShowDirectPassword(true);
    const p1 = generateRandomPassword('Ebm');
    const p2 = generateRandomPassword('Univ');
    const p3 = generateRandomPassword('Sis');
    setRandomProposals([p1, p2, p3]);
    setDirectPasswordInput(p1);
    setCopiedPwd(false);
  };

  const handleCopyPassword = (pwd: string) => {
    if (!pwd) return;
    navigator.clipboard?.writeText(pwd).catch(() => {});
    setCopiedPwd(true);
    setTimeout(() => setCopiedPwd(false), 2500);
  };

  const handleSendResetEmail = async (targetUser: User) => {
    setIsSendingEmail(true);
    setPwdFeedback(null);
    const res = await sendUserPasswordResetEmail(targetUser.id);
    setIsSendingEmail(false);
    setPwdFeedback({
      type: res.success ? 'success' : 'error',
      text: res.message,
    });
  };

  const handleApplyDirectPassword = (targetUser: User) => {
    setPwdFeedback(null);
    const res = setDirectUserPassword(targetUser.id, directPasswordInput, forceChangeNextLogin);
    setPwdFeedback({
      type: res.success ? 'success' : 'error',
      text: res.message,
    });
  };

  const [formMsg, setFormMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Extract unique departments
  const departments = Array.from(
    new Set(users.map((u) => u.department || u.service).filter(Boolean))
  ) as string[];

  const filteredUsers = users.filter((u) => {
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
      if (statusFilter === 'ACTIVE' && !u.isActive) return false;
      if (statusFilter === 'INACTIVE' && u.isActive) return false;
    }
    if (departmentFilter !== 'ALL') {
      if (u.department !== departmentFilter && u.service !== departmentFilter) return false;
    }
    if (mentionFilter !== 'ALL') {
      const grp = groups.find((g) => g.id === u.groupId);
      if (grp?.filiereId !== mentionFilter) return false;
    }
    if (searchTerm) {
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

  const handleOpenCreate = () => {
    setEditingUserId(null);
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
    setLinkedInUrl('');
    setAddress('');
    setCity('Antananarivo');
    setDepartment('');
    setService('');
    setJobTitle('');
    setOfficeLocation('');
    setGroupId(groups[0]?.id || '');
    setBirthDate('2005-01-01');
    setSubjects('');
    setWeeklyMaxHours(18);
    setHourlyRateAr(40000);
    setContractType('VACATAIRE');
    setAllowedTabs([]);
    setDeniedTabs([]);
    setInitialOrNewPassword(generateRandomPassword('Ebm'));
    setFormMsg(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUserId(user.id);
    setCivilite(user.civilite || 'M.');
    setLastName(user.lastName || user.name.split(' ').slice(-1)[0] || '');
    setFirstName(user.firstName || user.name.split(' ').slice(0, -1).join(' ') || '');
    setName(user.name);
    setRole(user.role);
    setCustomRoleId(user.customRoleId || '');
    setIdentifier(user.matricule || user.username);
    setEmail(user.email);
    setPhone(user.phone || user.phones?.[0] || '');
    setSecondaryPhone(user.phones?.[1] || '');
    setLinkedInUrl(user.linkedInUrl || '');
    setAddress(user.address || '');
    setCity(user.city || 'Antananarivo');
    setDepartment(user.department || '');
    setService(user.service || '');
    setJobTitle(user.jobTitle || '');
    setOfficeLocation(user.officeLocation || '');
    setGroupId(user.groupId || groups[0]?.id || '');
    setBirthDate(user.birthDate || '2005-01-01');
    setSubjects(user.subjects?.join(', ') || '');
    setWeeklyMaxHours(user.weeklyMaxHours || 18);
    setHourlyRateAr(user.hourlyRateAr || 40000);
    setContractType(user.contractType || 'VACATAIRE');
    setAllowedTabs(user.customPermissions?.allowedTabs || []);
    setDeniedTabs(user.customPermissions?.deniedTabs || []);
    setInitialOrNewPassword('');
    setFormMsg(null);
    setIsModalOpen(true);
  };

  const toggleAllowedTab = (tabId: string) => {
    setAllowedTabs((prev) => (prev.includes(tabId) ? prev.filter((t) => t !== tabId) : [...prev, tabId]));
    setDeniedTabs((prev) => prev.filter((t) => t !== tabId));
  };

  const toggleDeniedTab = (tabId: string) => {
    setDeniedTabs((prev) => (prev.includes(tabId) ? prev.filter((t) => t !== tabId) : [...prev, tabId]));
    setAllowedTabs((prev) => prev.filter((t) => t !== tabId));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormMsg(null);

    const fullName = name.trim() || `${firstName.trim()} ${lastName.trim()}`.trim();
    if (!fullName || !email.trim()) {
      setFormMsg({ type: 'error', text: 'Veuillez renseigner le nom complet et une adresse e-mail valide.' });
      return;
    }

    const phonesList = [phone.trim(), secondaryPhone.trim()].filter(Boolean);

    const commonPayload: Partial<User> = {
      civilite,
      lastName: lastName.trim() || undefined,
      firstName: firstName.trim() || undefined,
      name: fullName,
      role,
      customRoleId: customRoleId || undefined,
      email: email.trim(),
      phone: phone.trim() || undefined,
      phones: phonesList.length > 0 ? phonesList : undefined,
      linkedInUrl: linkedInUrl.trim() || undefined,
      address: address.trim() || undefined,
      city: city.trim() || undefined,
      department: department.trim() || undefined,
      service: service.trim() || undefined,
      jobTitle: jobTitle.trim() || undefined,
      officeLocation: officeLocation.trim() || undefined,
      groupId: role === 'STUDENT' ? groupId : undefined,
      birthDate: role === 'STUDENT' ? birthDate : undefined,
      subjects: role === 'TEACHER' ? subjects.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
      weeklyMaxHours: role === 'TEACHER' ? Number(weeklyMaxHours) : undefined,
      hourlyRateAr: role === 'TEACHER' ? Number(hourlyRateAr) : undefined,
      contractType: role === 'TEACHER' ? contractType : undefined,
      customPermissions:
        allowedTabs.length > 0 || deniedTabs.length > 0
          ? { allowedTabs, deniedTabs }
          : undefined,
    };

    if (editingUserId) {
      updateUser(editingUserId, commonPayload);
      if (initialOrNewPassword.trim().length >= 6) {
        setDirectUserPassword(editingUserId, initialOrNewPassword.trim(), false);
      }
      setFormMsg({ type: 'success', text: 'Fiche utilisateur et permissions mises à jour avec succès !' });
      // Refresh sheet if open
      if (selectedUserSheet?.id === editingUserId) {
        const updated = users.find((u) => u.id === editingUserId);
        if (updated) setSelectedUserSheet({ ...updated, ...commonPayload });
      }
      setTimeout(() => setIsModalOpen(false), 1000);
    } else {
      const cleanInitialPwd = initialOrNewPassword.trim();
      const res = addUser({
        ...(commonPayload as any),
        matricule: role === 'STUDENT' ? identifier.trim().toUpperCase() : undefined,
        username: role === 'STUDENT' ? identifier.trim().toUpperCase() : identifier.trim().toLowerCase(),
        passwordHash: cleanInitialPwd.length >= 6 ? cleanInitialPwd : undefined,
        isActive: true,
        mustChangePassword: cleanInitialPwd.length >= 6 ? false : true,
      });

      if (res.success) {
        setFormMsg({
          type: 'success',
          text: `Compte "${fullName}" créé avec succès${cleanInitialPwd ? ` (Mot de passe : ${cleanInitialPwd})` : ''} !`,
        });
        setTimeout(() => setIsModalOpen(false), 1200);
      } else {
        setFormMsg({ type: 'error', text: res.error || 'Erreur lors de la création.' });
      }
    }
  };

  const getRoleBadge = (uRole: UserRole, cRoleId?: string) => {
    const custom = customRoles.find((cr) => cr.id === cRoleId);
    const label = custom ? custom.label || custom.name : ROLE_LABELS[uRole] || uRole;
    switch (uRole) {
      case 'ADMIN':
        return <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 font-bold rounded-md text-[10px] uppercase">{label}</span>;
      case 'SCOLARITE':
      case 'SCHEDULER':
        return <span className="px-2.5 py-0.5 bg-purple-100 text-purple-800 font-bold rounded-md text-[10px] uppercase">{label}</span>;
      case 'ADMIN_STAFF':
        return <span className="px-2.5 py-0.5 bg-slate-200 text-slate-800 font-bold rounded-md text-[10px] uppercase">{label}</span>;
      case 'FINANCE':
        return <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-md text-[10px] uppercase">{label}</span>;
      case 'ACADEMIC_HEAD':
        return <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 font-bold rounded-md text-[10px] uppercase">{label}</span>;
      case 'TEACHER':
        return <span className="px-2.5 py-0.5 bg-teal-100 text-teal-800 font-bold rounded-md text-[10px] uppercase">{label}</span>;
      case 'PARENT':
        return <span className="px-2.5 py-0.5 bg-rose-100 text-rose-800 font-bold rounded-md text-[10px] uppercase">{label}</span>;
      case 'STUDENT':
        return <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 font-bold rounded-md text-[10px] uppercase">{label}</span>;
    }
  };

  const activeSheetUser = selectedUserSheet ? users.find((u) => u.id === selectedUserSheet.id) || selectedUserSheet : null;

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-xs">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Gestion Centralisée des Utilisateurs, Fiches Individuelles & Rôles RBAC
                </h2>
                <p className="text-xs text-slate-500">
                  Étudiants, Enseignants, Personnel Administratif, Scolarité, Finances, Parents et Rôles personnalisés.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              Créer un Utilisateur
            </button>
          </div>
        </div>
      </div>

      {/* 6 OFFICIAL ROLES DIRECTORY CARDS */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase text-slate-600 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-blue-600" />
            Répartition par les 6 Rôles Officiels de l'Établissement (Cliquer pour filtrer l'annuaire)
          </span>
          {roleFilter !== 'ALL' && (
            <button
              type="button"
              onClick={() => setRoleFilter('ALL')}
              className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
            >
              Afficher tous les comptes ({users.length})
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {[
            {
              key: 'ADMIN',
              label: '1. Administrateur',
              desc: 'Supervision & Sécurité',
              count: users.filter((u) => u.role === 'ADMIN').length,
              badgeClass: 'border-blue-200 bg-blue-50/70 text-blue-900',
            },
            {
              key: 'SCOLARITE',
              label: '2. Scolarité & Planification',
              desc: 'Inscriptions, EDT & Notes',
              count: users.filter((u) => ['SCOLARITE', 'SCHEDULER', 'ACADEMIC_HEAD'].includes(u.role)).length,
              badgeClass: 'border-purple-200 bg-purple-50/70 text-purple-900',
            },
            {
              key: 'ADMIN_STAFF',
              label: '3. Personnel Administratif',
              desc: 'Finances, Caisse &RH',
              count: users.filter((u) => ['ADMIN_STAFF', 'FINANCE'].includes(u.role)).length,
              badgeClass: 'border-emerald-200 bg-emerald-50/70 text-emerald-900',
            },
            {
              key: 'TEACHER',
              label: '4. Enseignant',
              desc: 'Cours, Appel QR & Notes',
              count: users.filter((u) => u.role === 'TEACHER').length,
              badgeClass: 'border-teal-200 bg-teal-50/70 text-teal-900',
            },
            {
              key: 'STUDENT',
              label: '5. Étudiant',
              desc: 'Portail LMD & Relevés',
              count: users.filter((u) => u.role === 'STUDENT').length,
              badgeClass: 'border-amber-200 bg-amber-50/70 text-amber-900',
            },
            {
              key: 'PARENT',
              label: '6. Parent / Tuteur',
              desc: 'Suivi Assiduité & Frais',
              count: users.filter((u) => u.role === 'PARENT').length,
              badgeClass: 'border-rose-200 bg-rose-50/70 text-rose-900',
            },
          ].map((rCard) => {
            const isSelected = roleFilter === rCard.key;
            return (
              <button
                key={rCard.key}
                type="button"
                onClick={() => setRoleFilter(isSelected ? 'ALL' : rCard.key)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'ring-2 ring-blue-600 bg-slate-900 text-white border-slate-900 shadow-sm'
                    : `${rCard.badgeClass} hover:shadow-xs`
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black leading-tight">{rCard.label}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                      isSelected ? 'bg-blue-500 text-white' : 'bg-white/90 text-slate-900'
                    }`}
                  >
                    {rCard.count}
                  </span>
                </div>
                <span className={`text-[10px] block mt-1 ${isSelected ? 'text-slate-300' : 'opacity-75'}`}>
                  {rCard.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter and Search Bar (ACC-043 to ACC-046) */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs">
          {/* Search box */}
          <div className="relative">
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Recherche</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Nom, matricule, fonction, e-mail..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-1 focus:ring-blue-600"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            </div>
          </div>

          {/* Role Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Catégorie / Rôle</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full p-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
            >
              <option value="ALL">Tous les rôles ({users.length})</option>
              <option value="ADMIN">Administrateurs</option>
              <option value="SCOLARITE">Scolarité & Planning</option>
              <option value="ADMIN_STAFF">Personnel Administratif</option>
              <option value="FINANCE">Finances & Caisse</option>
              <option value="ACADEMIC_HEAD">Responsables Pédagogiques</option>
              <option value="TEACHER">Enseignants</option>
              <option value="STUDENT">Étudiants</option>
              <option value="PARENT">Parents / Tuteurs</option>
            </select>
          </div>

          {/* Department / Service Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Département / Service</label>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full p-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
            >
              <option value="ALL">Tous les départements</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Mention Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Mention (Étudiants)</label>
            <select
              value={mentionFilter}
              onChange={(e) => setMentionFilter(e.target.value)}
              className="w-full p-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
            >
              <option value="ALL">Toutes les mentions</option>
              {filieres.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.code} — {f.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Statut du compte</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full p-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
            >
              <option value="ALL">Tous les statuts</option>
              <option value="ACTIVE">Actifs uniquement</option>
              <option value="INACTIVE">Désactivés (Suspendus)</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
              <tr>
                <th className="p-3">Utilisateur / Fonction</th>
                <th className="p-3">Rôle & Permissions</th>
                <th className="p-3">Identifiant / Matricule</th>
                <th className="p-3">Département / Rattachement</th>
                <th className="p-3">Contact</th>
                <th className="p-3">Statut</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((user) => {
                const assignedGroup = groups.find((g) => g.id === user.groupId);
                const hasCustomPerms =
                  (user.customPermissions?.allowedTabs?.length || 0) > 0 ||
                  (user.customPermissions?.deniedTabs?.length || 0) > 0;

                return (
                  <tr
                    key={user.id}
                    onClick={() => setSelectedUserSheet(user)}
                    className="hover:bg-blue-50/40 transition-colors cursor-pointer"
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-900 font-bold flex items-center justify-center text-xs flex-shrink-0">
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
                          {user.role === 'STUDENT' && (
                            <span className="text-[10px] text-blue-600 font-semibold">
                              Groupe : {assignedGroup?.code || 'Non assigné'}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="p-3">
                      <div className="flex flex-col items-start gap-1">
                        {getRoleBadge(user.role, user.customRoleId)}
                        {hasCustomPerms && (
                          <span className="text-[9px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200 font-bold">
                            Droits RBAC personnalisés
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-3 font-mono font-bold text-blue-950">{user.matricule || user.username}</td>

                    <td className="p-3 text-slate-600">
                      <span className="font-semibold text-slate-800 block">
                        {user.department || user.service || (user.role === 'STUDENT' ? assignedGroup?.name : '—')}
                      </span>
                      {user.officeLocation && (
                        <span className="text-[10px] text-slate-400">Bureau : {user.officeLocation}</span>
                      )}
                    </td>

                    <td className="p-3 text-slate-600">
                      <span className="block truncate max-w-[180px]">{user.email}</span>
                      {(user.phone || user.phones?.[0]) && (
                        <span className="text-[10px] text-slate-400">{user.phone || user.phones?.[0]}</span>
                      )}
                    </td>

                    <td className="p-3">
                      {user.isActive ? (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded text-[10px]">
                          Actif
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-red-100 text-red-800 font-bold rounded text-[10px] inline-flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3 text-red-600" />
                          Désactivé
                        </span>
                      )}
                    </td>

                    <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        <button
                          onClick={() => {
                            setSelectedUserSheet(user);
                            const p1 = generateRandomPassword('Ebm');
                            const p2 = generateRandomPassword('Univ');
                            const p3 = generateRandomPassword('Sis');
                            setRandomProposals([p1, p2, p3]);
                            setDirectPasswordInput(p1);
                            setPwdFeedback(null);
                          }}
                          className="px-2.5 py-1 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg text-[11px] font-bold transition-colors cursor-pointer inline-flex items-center gap-1"
                          title="Voir la fiche individuelle complète et gérer le mot de passe"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-600" />
                          <span>Voir Fiche</span>
                        </button>

                        <button
                          onClick={() => openPasswordModalForUser(user)}
                          className="px-2.5 py-1 text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg text-[11px] font-bold transition-colors cursor-pointer inline-flex items-center gap-1"
                          title="Réinitialiser par mail, saisir un nouveau mot de passe ou générer un mot de passe aléatoire"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-amber-700" />
                          <span>Mot de passe</span>
                        </button>

                        <button
                          onClick={() => setCurrentUser(user)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer inline-flex items-center gap-1 ${
                            user.id === currentUser?.id
                              ? 'bg-emerald-600 text-white'
                              : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200'
                          }`}
                          title={`Tester immédiatement l'application avec le profil de ${user.name} (${ROLE_LABELS[user.role]})`}
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>{user.id === currentUser?.id ? 'Actif' : 'Tester ce rôle'}</span>
                        </button>

                        <button
                          onClick={() => handleOpenEdit(user)}
                          className="p-1.5 text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Modifier la fiche et les permissions"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => toggleUserStatus(user.id)}
                          className={`p-1.5 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                            user.isActive ? 'text-red-700 hover:bg-red-50' : 'text-emerald-700 hover:bg-emerald-50'
                          }`}
                          title={user.isActive ? 'Désactiver le compte' : 'Réactiver le compte'}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>

                        {user.id !== currentUser?.id && (
                          <button
                            onClick={() => deleteUser(user.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                            title="Supprimer définitivement"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

      {/* INDIVIDUAL USER SHEET MODAL (ACC-063 to ACC-068) */}
      {activeSheetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 my-8">
            <div className="p-5 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center font-black text-xl">
                  {activeSheetUser.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    {getRoleBadge(activeSheetUser.role, activeSheetUser.customRoleId)}
                    <span className="font-mono text-xs text-blue-200">{activeSheetUser.matricule || activeSheetUser.username}</span>
                  </div>
                  <h3 className="text-lg font-black mt-1">
                    {activeSheetUser.civilite ? `${activeSheetUser.civilite} ` : ''}
                    {activeSheetUser.name}
                  </h3>
                  <p className="text-xs text-slate-300">
                    {activeSheetUser.jobTitle || ROLE_LABELS[activeSheetUser.role]} • {activeSheetUser.department || activeSheetUser.service || 'EBM Institute'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentUser(activeSheetUser);
                    setSelectedUserSheet(null);
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  title="Basculer sur ce compte pour tester son rôle et ses accès"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  Tester ce rôle
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUserSheet(null);
                    handleOpenEdit(activeSheetUser);
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Modifier la fiche
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedUserSheet(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-xl"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
              {/* GESTION DU MOT DE PASSE DIRECTEMENT DANS LA FICHE UTILISATEUR */}
              <div className="p-4 bg-gradient-to-r from-amber-50 via-orange-50/60 to-amber-50/40 rounded-2xl border border-amber-200 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-amber-500 text-white rounded-lg">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider">
                        Gestion du Mot de Passe & Accès du Compte
                      </h4>
                      <p className="text-[11px] text-slate-600">
                        Réinitialisez par e-mail ({activeSheetUser.email}), saisissez un nouveau mot de passe ou utilisez une proposition aléatoire.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isSendingEmail}
                    onClick={() => handleSendResetEmail(activeSheetUser)}
                    className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-60"
                  >
                    <Mail className="w-3.5 h-3.5 text-amber-400" />
                    {isSendingEmail ? 'Envoi en cours...' : `Réinitialiser par Mail (${activeSheetUser.email})`}
                  </button>
                </div>

                {pwdFeedback && (
                  <div
                    className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                      pwdFeedback.type === 'success'
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        : 'bg-rose-100 text-rose-900 border border-rose-300'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{pwdFeedback.text}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-end pt-1">
                  <div className="md:col-span-6">
                    <label className="block text-[10px] font-bold uppercase text-amber-900 mb-1">
                      Saisir ou Choisir un Nouveau Mot de Passe Immédiat
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type={showDirectPassword ? 'text' : 'password'}
                        value={directPasswordInput}
                        onChange={(e) => setDirectPasswordInput(e.target.value)}
                        placeholder="Nouveau mot de passe (min. 6 caractères)"
                        className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl font-mono font-bold text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleCopyPassword(directPasswordInput)}
                        className="px-2.5 py-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-slate-700 font-bold text-[11px] flex items-center gap-1 cursor-pointer shrink-0"
                        title="Copier le mot de passe"
                      >
                        {copiedPwd ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedPwd ? 'Copié' : 'Copier'}
                      </button>
                    </div>
                  </div>

                  <div className="md:col-span-3">
                    <button
                      type="button"
                      onClick={refreshRandomProposals}
                      className="w-full px-3 py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Proposition aléatoire
                    </button>
                  </div>

                  <div className="md:col-span-3">
                    <button
                      type="button"
                      onClick={() => handleApplyDirectPassword(activeSheetUser)}
                      className="w-full px-3 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Appliquer tout de suite
                    </button>
                  </div>
                </div>

                {/* Random Password Proposals Chips */}
                {randomProposals.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-[10px] font-bold uppercase text-amber-800 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Suggestions aléatoires (cliquer pour choisir) :
                    </span>
                    {randomProposals.map((prop) => (
                      <button
                        key={prop}
                        type="button"
                        onClick={() => {
                          setDirectPasswordInput(prop);
                          setCopiedPwd(false);
                        }}
                        className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold border transition-all cursor-pointer ${
                          directPasswordInput === prop
                            ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                            : 'bg-white text-slate-800 border-amber-300 hover:bg-amber-100'
                        }`}
                      >
                        {prop}
                      </button>
                    ))}
                    <label className="ml-auto flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={forceChangeNextLogin}
                        onChange={(e) => setForceChangeNextLogin(e.target.checked)}
                        className="rounded border-slate-300"
                      />
                      Demander de changer à la 1re connexion
                    </label>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Identité & Coordonnées</span>
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Nom & Prénom :</span>
                      <span className="font-bold text-slate-900">
                        {activeSheetUser.civilite} {activeSheetUser.lastName || activeSheetUser.name} {activeSheetUser.firstName || ''}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Email :</span>
                      <span className="font-semibold text-slate-800">{activeSheetUser.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Téléphones :</span>
                      <span className="font-semibold text-slate-800">
                        {activeSheetUser.phones?.join(' / ') || activeSheetUser.phone || 'Non renseigné'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Adresse :</span>
                      <span className="font-semibold text-slate-800">
                        {activeSheetUser.address ? `${activeSheetUser.address}, ${activeSheetUser.city || ''}` : 'Non renseignée'}
                      </span>
                    </div>
                    {activeSheetUser.linkedInUrl && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">LinkedIn :</span>
                        <a
                          href={activeSheetUser.linkedInUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 font-bold hover:underline flex items-center gap-1"
                        >
                          <Linkedin className="w-3 h-3" /> Profil LinkedIn
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Rattachement & Fonction</span>
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Département / Service :</span>
                      <span className="font-bold text-slate-900">{activeSheetUser.department || activeSheetUser.service || 'Général'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Fonction :</span>
                      <span className="font-semibold text-slate-800">{activeSheetUser.jobTitle || ROLE_LABELS[activeSheetUser.role]}</span>
                    </div>
                    {activeSheetUser.officeLocation && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Bureau :</span>
                        <span className="font-semibold text-slate-800">{activeSheetUser.officeLocation}</span>
                      </div>
                    )}
                    {activeSheetUser.role === 'TEACHER' && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Matières :</span>
                          <span className="font-semibold text-slate-800">{activeSheetUser.subjects?.join(', ') || 'Toutes'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Quota horaire :</span>
                          <span className="font-bold text-blue-700">{activeSheetUser.weeklyMaxHours || 18}h / sem.</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Taux Horaire (Paie) :</span>
                          <span className="font-black text-emerald-700">
                            {(activeSheetUser.hourlyRateAr || 40000).toLocaleString()} Ar / h
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Contrat :</span>
                          <span className="font-bold text-indigo-700">{activeSheetUser.contractType || 'VACATAIRE'}</span>
                        </div>
                        {activeSheetUser.bankRib && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">RIB :</span>
                            <span className="font-mono font-semibold text-slate-700">{activeSheetUser.bankRib}</span>
                          </div>
                        )}
                      </>
                    )}
                    {activeSheetUser.role === 'PARENT' && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Enfants rattachés :</span>
                        <span className="font-bold text-emerald-700">
                          {(activeSheetUser.linkedStudentIds || []).length} étudiant(s)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Teacher Availability & Payroll Summary inside User Sheet */}
              {activeSheetUser.role === 'TEACHER' && (
                <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-emerald-800">
                      Disponibilités Hebdomadaires (Emploi du Temps) & Estimation Paie
                    </span>
                    <span className="text-xs font-black text-emerald-900">
                      Paie mensuelle estimée :{' '}
                      {(
                        (activeSheetUser.weeklyMaxHours || 18) *
                        4 *
                        (activeSheetUser.hourlyRateAr || 40000)
                      ).toLocaleString()}{' '}
                      Ar
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-1.5 text-[10px]">
                    {(['LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI'] as const).map((day) => {
                      const m =
                        activeSheetUser.availabilities?.find((a) => a.day === day && a.slot === 'MATIN')?.available ??
                        day !== 'SAMEDI';
                      const ap =
                        activeSheetUser.availabilities?.find((a) => a.day === day && a.slot === 'APRES_MIDI')
                          ?.available ?? day !== 'SAMEDI';
                      return (
                        <div key={day} className="bg-white p-2 rounded-xl border border-slate-200 text-center space-y-1">
                          <span className="font-bold text-slate-800 block">{day}</span>
                          <span
                            className={`block px-1 py-0.5 rounded font-semibold ${
                              m ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-700'
                            }`}
                          >
                            Matin: {m ? 'Libre' : 'Occupé'}
                          </span>
                          <span
                            className={`block px-1 py-0.5 rounded font-semibold ${
                              ap ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-700'
                            }`}
                          >
                            PM: {ap ? 'Libre' : 'Occupé'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Modification History (ACC-067) */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-500">
                  <History className="w-3.5 h-3.5 text-blue-600" />
                  <span>Historique des modifications de la fiche</span>
                </div>
                {!activeSheetUser.modificationHistory || activeSheetUser.modificationHistory.length === 0 ? (
                  <p className="text-slate-400 italic text-[11px]">Aucune modification enregistrée depuis la création.</p>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {activeSheetUser.modificationHistory.map((h) => (
                      <div key={h.id} className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-[11px]">
                        <div>
                          <span className="font-bold text-slate-800">{h.authorName}</span>
                          <span className="text-slate-500">
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
          </div>
        </div>
      )}

      {/* Create / Edit User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-200 my-8 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                  {editingUserId ? <Edit2 className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    {editingUserId ? 'Modifier la Fiche Utilisateur & Permissions RBAC' : 'Créer un Nouvel Utilisateur'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Identité complète, rattachement administratif et droits d'accès sur mesure
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formMsg && (
              <div
                className={`mt-3 p-3 rounded-xl text-xs flex items-center gap-2 ${
                  formMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {formMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                )}
                <span>{formMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-bold uppercase text-slate-700 mb-1">Civilité</label>
                  <select
                    value={civilite}
                    onChange={(e) => setCivilite(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold"
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
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-bold uppercase text-slate-700 mb-1">Prénom(s) / Nom d'affichage *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jean Rakoto"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold uppercase text-slate-700 mb-1">Rôle Système *</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                  >
                    <option value="STUDENT">Étudiant</option>
                    <option value="TEACHER">Enseignant</option>
                    <option value="ADMIN_STAFF">Personnel Administratif</option>
                    <option value="SCOLARITE">Scolarité & Planning</option>
                    <option value="FINANCE">Finances & Caisse</option>
                    <option value="ACADEMIC_HEAD">Responsable Pédagogique</option>
                    <option value="PARENT">Parent / Tuteur</option>
                    <option value="ADMIN">Administrateur Général</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold uppercase text-slate-700 mb-1">Rôle sur mesure (Optionnel)</label>
                  <select
                    value={customRoleId}
                    onChange={(e) => setCustomRoleId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                  >
                    <option value="">— Rôle standard —</option>
                    {customRoles.map((cr) => (
                      <option key={cr.id} value={cr.id}>
                        {cr.label || cr.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold uppercase text-slate-700 mb-1">
                    {role === 'STUDENT' ? 'Matricule *' : "Nom d'utilisateur *"}
                  </label>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder={role === 'STUDENT' ? 'EBM-2026-XXXX' : 'prenom.nom'}
                    disabled={!!editingUserId}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold disabled:opacity-60"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold uppercase text-slate-700 mb-1">Adresse e-mail *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@ebm-institute.edu"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase text-slate-700 mb-1">Téléphone principal</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+261 34 XX XXX XX"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase text-slate-700 mb-1">Téléphone secondaire</label>
                  <input
                    type="tel"
                    value={secondaryPhone}
                    onChange={(e) => setSecondaryPhone(e.target.value)}
                    placeholder="+261 32 XX XXX XX"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold uppercase text-slate-700 mb-1">Département / Service</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Ex: Direction Scolarité"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase text-slate-700 mb-1">Fonction / Poste</label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="Ex: Secrétaire Pédagogique"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase text-slate-700 mb-1">Profil LinkedIn</label>
                  <input
                    type="url"
                    value={linkedInUrl}
                    onChange={(e) => setLinkedInUrl(e.target.value)}
                    placeholder="https://linkedin.com/in/..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              {/* Conditional: If Student -> Group & BirthDate */}
              {role === 'STUDENT' && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-amber-50/60 rounded-xl border border-amber-200">
                  <div>
                    <label className="block font-bold uppercase text-amber-900 mb-1">Groupe d'affectation</label>
                    <select
                      value={groupId}
                      onChange={(e) => setGroupId(e.target.value)}
                      className="w-full p-2 bg-white border border-amber-300 rounded-xl"
                    >
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.code} ({g.name})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold uppercase text-amber-900 mb-1">Date de Naissance</label>
                    <input
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="w-full p-2 bg-white border border-amber-300 rounded-xl font-mono"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Conditional: If Teacher -> Subjects, Quota & Taux Horaire */}
              {role === 'TEACHER' && (
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3 bg-blue-50/60 rounded-xl border border-blue-200">
                  <div className="sm:col-span-2">
                    <label className="block font-bold uppercase text-blue-900 mb-1">Matières enseignées</label>
                    <input
                      type="text"
                      value={subjects}
                      onChange={(e) => setSubjects(e.target.value)}
                      placeholder="Algorithmique, Bases de Données"
                      className="w-full p-2 bg-white border border-blue-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-bold uppercase text-blue-900 mb-1">Contrat hebdo max (h)</label>
                    <input
                      type="number"
                      value={weeklyMaxHours}
                      onChange={(e) => setWeeklyMaxHours(Number(e.target.value))}
                      min={4}
                      max={40}
                      className="w-full p-2 bg-white border border-blue-300 rounded-xl font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold uppercase text-emerald-900 mb-1">Taux Horaire (Ar/h)</label>
                    <input
                      type="number"
                      step={1000}
                      value={hourlyRateAr}
                      onChange={(e) => setHourlyRateAr(Number(e.target.value))}
                      className="w-full p-2 bg-white border border-emerald-400 rounded-xl font-black text-emerald-800"
                    />
                  </div>
                </div>
              )}

              {/* Per-User RBAC Custom Permissions (ACC-036, ACC-037) */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 uppercase text-[10px]">
                    Permissions RBAC spécifiques à cet utilisateur (Surcharge individuelle)
                  </span>
                  <span className="text-[10px] text-slate-500">
                    +{allowedTabs.length} autorisés / -{deniedTabs.length} restreints
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-40 overflow-y-auto p-1">
                  {ALL_CONFIGURABLE_TABS.map((t) => {
                    const isAllowed = allowedTabs.includes(t.id);
                    const isDenied = deniedTabs.includes(t.id);
                    return (
                      <div
                        key={t.id}
                        className="flex items-center justify-between p-1.5 bg-white rounded-lg border border-slate-200 text-[10px]"
                      >
                        <span className="truncate font-medium text-slate-700 pr-1">{t.label}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => toggleAllowedTab(t.id)}
                            className={`px-1.5 py-0.5 rounded font-bold cursor-pointer ${
                              isAllowed ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
                            }`}
                            title="Autoriser explicitement cet écran"
                          >
                            +
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleDeniedTab(t.id)}
                            className={`px-1.5 py-0.5 rounded font-bold cursor-pointer ${
                              isDenied ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-500'
                            }`}
                            title="Interdire explicitement cet écran"
                          >
                            -
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Password Setup / Random Proposal inside Create & Edit Modal */}
              <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-900 uppercase text-[10px] flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                    {editingUserId
                      ? 'Définir immédiatement un nouveau mot de passe (Optionnel)'
                      : 'Mot de passe initial du compte (avec proposition aléatoire)'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setInitialOrNewPassword(generateRandomPassword('Ebm'))}
                    className="px-2.5 py-1 bg-amber-200/80 hover:bg-amber-300 text-amber-950 rounded-lg font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    Générer un mot de passe aléatoire
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={initialOrNewPassword}
                    onChange={(e) => setInitialOrNewPassword(e.target.value)}
                    placeholder={
                      editingUserId
                        ? 'Laisser vide pour ne pas changer le mot de passe actuel'
                        : 'Ex: Ebm@2026-K9x!p4'
                    }
                    className="w-full p-2 bg-white border border-amber-300 rounded-xl font-mono font-bold text-slate-900"
                  />
                  {initialOrNewPassword && (
                    <button
                      type="button"
                      onClick={() => handleCopyPassword(initialOrNewPassword)}
                      className="px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-[11px] text-slate-700 hover:bg-slate-100 cursor-pointer shrink-0"
                    >
                      {copiedPwd ? 'Copié ✓' : 'Copier'}
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-100 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  {editingUserId ? 'Enregistrer les modifications' : 'Créer l’Utilisateur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DEDICATED PASSWORD MANAGEMENT MODAL (Email Reset, Immediate Entry & Random Proposals) */}
      {passwordModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 my-8">
            <div className="p-5 bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 text-white flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center">
                  <KeyRound className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-amber-300 block">
                    Sécurité & Authentification Administrateur
                  </span>
                  <h3 className="text-base font-black">
                    Mot de passe de {passwordModalUser.name}
                  </h3>
                  <p className="text-[11px] text-slate-300 font-mono">
                    {passwordModalUser.matricule || passwordModalUser.username} • {passwordModalUser.email}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPasswordModalUser(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {pwdFeedback && (
                <div
                  className={`p-3 rounded-xl font-bold flex items-center gap-2 ${
                    pwdFeedback.type === 'success'
                      ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                      : 'bg-rose-50 text-rose-900 border border-rose-200'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{pwdFeedback.text}</span>
                </div>
              )}

              {/* Option 1: Reset by Email */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-600 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-blue-600" />
                    Option 1 — Réinitialiser le mot de passe par E-mail
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Envoie un lien sécurisé de réinitialisation à l'adresse <strong>{passwordModalUser.email}</strong>.
                </p>
                <button
                  type="button"
                  disabled={isSendingEmail}
                  onClick={() => handleSendResetEmail(passwordModalUser)}
                  className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-60"
                >
                  <Mail className="w-4 h-4 text-amber-400" />
                  {isSendingEmail
                    ? 'Envoi de l’e-mail en cours...'
                    : `Envoyer le mail de réinitialisation à ${passwordModalUser.email}`}
                </button>
              </div>

              {/* Option 2: Direct Password Input + Random Generator */}
              <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-amber-900 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-700" />
                    Option 2 — Saisir tout de suite un nouveau mot de passe
                  </span>
                  <button
                    type="button"
                    onClick={refreshRandomProposals}
                    className="px-2.5 py-1 bg-amber-200/80 hover:bg-amber-300 text-amber-950 rounded-lg font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Nouvelle proposition aléatoire
                  </button>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                    Nouveau mot de passe (saisie libre ou choix aléatoire ci-dessous)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type={showDirectPassword ? 'text' : 'password'}
                      value={directPasswordInput}
                      onChange={(e) => setDirectPasswordInput(e.target.value)}
                      placeholder="Saisissez le nouveau mot de passe..."
                      className="w-full px-3 py-2.5 bg-white border border-amber-300 rounded-xl font-mono font-bold text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopyPassword(directPasswordInput)}
                      className="px-3 py-2.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl font-bold text-slate-700 flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      {copiedPwd ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      {copiedPwd ? 'Copié' : 'Copier'}
                    </button>
                  </div>
                </div>

                {/* 3 Clickable Random Password Proposals */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase text-amber-800 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Propositions aléatoires de mot de passe (cliquer pour utiliser) :
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                    {randomProposals.map((prop) => (
                      <button
                        key={prop}
                        type="button"
                        onClick={() => {
                          setDirectPasswordInput(prop);
                          setCopiedPwd(false);
                        }}
                        className={`p-2 rounded-xl font-mono text-[11px] font-bold border text-center transition-all cursor-pointer ${
                          directPasswordInput === prop
                            ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                            : 'bg-white text-slate-800 border-amber-300 hover:bg-amber-100'
                        }`}
                      >
                        {prop}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={forceChangeNextLogin}
                    onChange={(e) => setForceChangeNextLogin(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  Demander à l'utilisateur de modifier ce mot de passe lors de sa prochaine connexion
                </label>

                <button
                  type="button"
                  onClick={() => handleApplyDirectPassword(passwordModalUser)}
                  className="w-full py-2.5 px-4 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Enregistrer ce nouveau mot de passe immédiatement
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
