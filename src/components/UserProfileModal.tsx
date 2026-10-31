import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { TeacherAvailabilitySlot, User } from '../types';
import { getRoleLabel } from '../utils/rbacPermissions';
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
  BookOpen,
  CreditCard,
  Globe,
} from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser?: User | null;
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
    // Keep compatibility with MATIN / APRES_MIDI summary + 5 detailed slots from 07:00 to 17:00
    for (const s of WIDE_TEACHER_SLOTS) {
      const exact = existing?.find((a) => a.day === day && a.slot === s.code);
      const fallbackHalfDay = existing?.find((a) => a.day === day && a.slot === s.period);
      const isAvail = exact !== undefined ? exact.available : fallbackHalfDay !== undefined ? fallbackHalfDay.available : day !== 'SAMEDI';
      result.push({
        day,
        slot: s.code,
        available: isAvail,
        note: isAvail ? 'Disponible' : 'Indisponible',
      });
    }
    // Also maintain MATIN and APRES_MIDI summary entries for backwards compatibility
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
      available: apremSlots.some((m) => m.available),
    });
  }
  return result;
};

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose, targetUser }) => {
  const { currentUser, users, groups, filieres, parcours, updateUser, updateTeacher, getTeacherHourlyStats } = useApp();

  const userToView = targetUser ? users.find((u) => u.id === targetUser.id) || targetUser : currentUser;

  const [civilite, setCivilite] = useState<'M.' | 'Mme' | 'Mlle' | 'Dr.' | 'Prof.'>('M.');
  const [name, setName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [secondaryPhone, setSecondaryPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [officeLocation, setOfficeLocation] = useState('');
  const [department, setDepartment] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [linkedInUrl, setLinkedInUrl] = useState('');
  const [orcidUrl, setOrcidUrl] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');

  // Teacher specific fields
  const [academicRank, setAcademicRank] = useState('Maître de Conférences');
  const [specialty, setSpecialty] = useState('');
  const [highestDiploma, setHighestDiploma] = useState('Doctorat / PhD');
  const [almaMater, setAlmaMater] = useState('');
  const [contractType, setContractType] = useState<'PERMANENT' | 'VACATAIRE' | 'MISSIONNAIRE'>('VACATAIRE');
  const [weeklyMaxHours, setWeeklyMaxHours] = useState<number>(18);
  const [hourlyRateAr, setHourlyRateAr] = useState<number>(40000);
  const [subjectsText, setSubjectsText] = useState('');
  const [cin, setCin] = useState('');
  const [birthDate, setBirthDate] = useState('1985-05-15');
  const [birthPlace, setBirthPlace] = useState('Antananarivo');
  const [bankRib, setBankRib] = useState('');
  const [hireDate, setHireDate] = useState('2024-09-01');
  const [cvFileName, setCvFileName] = useState('');
  const [cvFileUrl, setCvFileUrl] = useState('');
  const [cvUploadedAt, setCvUploadedAt] = useState('');
  const [availabilities, setAvailabilities] = useState<TeacherAvailabilitySlot[]>([]);

  const [savedBanner, setSavedBanner] = useState<string | null>(null);

  useEffect(() => {
    if (!userToView) return;
    setCivilite(userToView.civilite || (userToView.role === 'TEACHER' ? 'Dr.' : 'M.'));
    setName(userToView.name || '');
    const parts = (userToView.name || '').split(' ');
    setLastName(userToView.lastName || parts.slice(-1)[0] || '');
    setFirstName(userToView.firstName || parts.slice(0, -1).join(' ') || '');
    setEmail(userToView.email || '');
    setPhone(userToView.phone || '');
    setSecondaryPhone(userToView.secondaryPhone || userToView.phones?.[1] || '');
    setAddress(userToView.address || 'Antananarivo, Madagascar');
    setCity(userToView.city || 'Antananarivo');
    setOfficeLocation(userToView.officeLocation || (userToView.role === 'TEACHER' ? 'Salle des Professeurs EBM' : 'Campus EBM'));
    setDepartment(userToView.department || 'Pôle Académique EBM Institute');
    setJobTitle(userToView.jobTitle || getRoleLabel(userToView.role));
    setLinkedInUrl(userToView.linkedInUrl || '');
    setOrcidUrl(userToView.orcidUrl || '');
    setEmergencyContact(userToView.emergencyContact || '');

    setAcademicRank(userToView.academicRank || 'Maître de Conférences');
    setSpecialty(userToView.specialty || userToView.subjects?.join(', ') || 'Informatique & Sciences de Gestion');
    setHighestDiploma(
      userToView.highestDiploma ||
        (userToView.role === 'TEACHER'
          ? 'Doctorat / PhD'
          : userToView.role === 'STUDENT'
          ? userToView.bacSeries || 'Baccalauréat Général'
          : 'Master 2 / Ingénieur')
    );
    setAlmaMater(userToView.almaMater || userToView.originSchool || 'Université d’Antananarivo / EBM Institute');
    setContractType(userToView.contractType || 'VACATAIRE');
    setWeeklyMaxHours(userToView.weeklyMaxHours || 18);
    setHourlyRateAr(userToView.hourlyRateAr || 40000);
    setSubjectsText((userToView.subjects || []).join(', '));
    setCin(userToView.cin || '101 241 098 412');
    setBirthDate(userToView.birthDate || (userToView.role === 'STUDENT' ? '2005-04-12' : '1984-06-18'));
    setBirthPlace(userToView.birthPlace || 'Antananarivo');
    setBankRib(userToView.bankRib || '');
    setHireDate(userToView.hireDate || '2024-10-01');
    setCvFileName(userToView.cvFileName || '');
    setCvFileUrl(userToView.cvFileUrl || '');
    setCvUploadedAt(userToView.cvUploadedAt || '');
    setAvailabilities(buildWideAvailabilities(userToView.availabilities));
    setSavedBanner(null);
  }, [userToView, isOpen]);

  if (!isOpen || !userToView) return null;

  const isSelf = currentUser.id === userToView.id;
  const isAdminOrStaff = ['ADMIN', 'SCOLARITE', 'SCHEDULER', 'ADMIN_STAFF', 'ACADEMIC_HEAD', 'FINANCE'].includes(currentUser.role);
  const canEdit = isSelf || isAdminOrStaff;
  const canEditPayroll = ['ADMIN', 'FINANCE', 'SCOLARITE', 'SCHEDULER'].includes(currentUser.role);

  const isTeacherProfile = userToView.role === 'TEACHER';
  const isStudentProfile = userToView.role === 'STUDENT';

  const studentGroup = groups.find((g) => g.id === userToView.groupId);
  const studentFiliere = filieres.find((f) => f.id === studentGroup?.filiereId);
  const studentParcours = parcours.find((p) => p.id === userToView.parcoursId || p.id === studentGroup?.parcoursId);

  const handleToggleSlot = (day: TeacherAvailabilitySlot['day'], slotCode: string) => {
    if (!canEdit) return;
    const next = availabilities.map((item) =>
      item.day === day && item.slot === slotCode
        ? { ...item, available: !item.available, note: !item.available ? 'Disponible' : 'Indisponible' }
        : item
    );
    // Recompute MATIN and APRES_MIDI summary flags for that day
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
    if (!canEdit) return;
    const synced = availabilities.map((item) =>
      item.day === day
        ? { ...item, available: makeAvailable, note: makeAvailable ? 'Disponible (07h-17h)' : 'Indisponible' }
        : item
    );
    setAvailabilities(synced);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;

    const fullName = name.trim() || `${civilite} ${firstName} ${lastName}`.trim();
    const phonesList = [phone.trim(), secondaryPhone.trim()].filter(Boolean);

    const commonUpdates: Partial<User> = {
      civilite,
      name: isStudentProfile && !isAdminOrStaff ? userToView.name : fullName,
      firstName: isStudentProfile && !isAdminOrStaff ? userToView.firstName : firstName.trim(),
      lastName: isStudentProfile && !isAdminOrStaff ? userToView.lastName : lastName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      secondaryPhone: secondaryPhone.trim(),
      phones: phonesList,
      address: address.trim(),
      city: city.trim(),
      officeLocation: officeLocation.trim(),
      department: department.trim(),
      jobTitle: jobTitle.trim(),
      highestDiploma: highestDiploma.trim(),
      almaMater: almaMater.trim(),
      cin: cin.trim(),
      birthDate,
      birthPlace: birthPlace.trim(),
      linkedInUrl: linkedInUrl.trim(),
      orcidUrl: orcidUrl.trim(),
      emergencyContact: emergencyContact.trim(),
      cvFileName: cvFileName || undefined,
      cvFileUrl: cvFileUrl || undefined,
      cvUploadedAt: cvUploadedAt || undefined,
    };

    if (isTeacherProfile) {
      const parsedSubjects = subjectsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const teacherUpdates: Partial<User> = {
        ...commonUpdates,
        academicRank,
        specialty: specialty.trim(),
        subjects: parsedSubjects.length > 0 ? parsedSubjects : userToView.subjects,
        bankRib: bankRib.trim(),
        hireDate,
        availabilities,
        ...(canEditPayroll
          ? {
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

    setSavedBanner('Votre fiche officielle utilisateur (avec diplôme le plus élevé et coordonnées) a été enregistrée !');
    setTimeout(() => setSavedBanner(null), 3500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center font-black text-xl text-white shrink-0">
              {userToView.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 bg-blue-500/20 border border-blue-400/40 text-blue-200 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  Fiche Officielle Utilisateur • {getRoleLabel(userToView.role)}
                </span>
                {userToView.matricule && (
                  <span className="px-2.5 py-0.5 bg-amber-500/20 border border-amber-400/40 text-amber-200 rounded-full text-[10px] font-mono font-bold">
                    Matricule : {userToView.matricule}
                  </span>
                )}
              </div>
              <h3 className="text-xl font-black mt-1">{userToView.name}</h3>
              <p className="text-xs text-slate-300">
                {userToView.email} • {userToView.phone || 'Téléphone non renseigné'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-6 text-xs flex-1">
          {savedBanner && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{savedBanner}</span>
            </div>
          )}

          {/* Student Academic Identity Banner */}
          {isStudentProfile && (
            <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Matricule Officiel</span>
                <span className="font-mono font-black text-blue-800 text-sm">{userToView.matricule || 'EBM-2026'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Domaine & Mention</span>
                <span className="font-bold text-slate-900 block">{studentFiliere?.name || 'Formation LMD'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Niveau & Groupe</span>
                <span className="font-bold text-indigo-800 block">
                  {studentGroup?.level || 'L1'} • {studentGroup?.code || 'Groupe'}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Parcours</span>
                <span className="font-bold text-slate-800 block">{studentParcours?.name || 'Tronc Commun'}</span>
              </div>
            </div>
          )}

          {/* 1. Identité & Coordonnées de Contact */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
            <h4 className="font-black text-slate-900 text-sm flex items-center gap-2 border-b border-slate-200 pb-2.5">
              <UserIcon className="w-4 h-4 text-blue-600" />
              1. Identité, Contacts & Coordonnées Personnelles
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Civilité / Titre</label>
                <select
                  value={civilite}
                  onChange={(e) => setCivilite(e.target.value as any)}
                  disabled={!canEdit}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold"
                >
                  <option value="Dr.">Dr.</option>
                  <option value="Prof.">Prof.</option>
                  <option value="M.">M.</option>
                  <option value="Mme">Mme</option>
                  <option value="Mlle">Mlle</option>
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                  Nom complet affiché {isStudentProfile && !isAdminOrStaff ? '(État civil protégé)' : '*'}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  disabled={!canEdit || (isStudentProfile && !isAdminOrStaff)}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 disabled:bg-slate-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                  Email institutionnel / professionnel *
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    disabled={!canEdit}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-8 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                  Téléphone principal (Mobile) *
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={phone}
                    disabled={!canEdit}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+261 34 00 000 00"
                    className="w-full pl-8 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                  Téléphone secondaire / WhatsApp
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-emerald-600 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={secondaryPhone}
                    disabled={!canEdit}
                    onChange={(e) => setSecondaryPhone(e.target.value)}
                    placeholder="+261 32 00 000 00"
                    className="w-full pl-8 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl font-semibold"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Adresse postale / Quartier</label>
                <input
                  type="text"
                  value={address}
                  disabled={!canEdit}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Lot II M..."
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Ville</label>
                <input
                  type="text"
                  value={city}
                  disabled={!canEdit}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Antananarivo"
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                  Contact d'urgence (Nom & Tél)
                </label>
                <input
                  type="text"
                  value={emergencyContact}
                  disabled={!canEdit}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  placeholder="Ex: Conjoint / Parent (+261...)"
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                />
              </div>
            </div>

            {/* État Civil & Diplôme Le Plus Élevé (Affiché pour TOUS les profils) */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-200/80">
              <div>
                <label className="block text-[10px] font-bold uppercase text-indigo-800 mb-1">
                  🎓 Diplôme le plus élevé *
                </label>
                <input
                  type="text"
                  value={highestDiploma}
                  disabled={!canEdit}
                  onChange={(e) => setHighestDiploma(e.target.value)}
                  placeholder="Doctorat / PhD, Master 2, Ingénieur, Licence, Bac..."
                  className="w-full p-2.5 bg-indigo-50/60 border border-indigo-300 rounded-xl font-bold text-indigo-950"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                  Université / Établissement d'origine
                </label>
                <input
                  type="text"
                  value={almaMater}
                  disabled={!canEdit}
                  onChange={(e) => setAlmaMater(e.target.value)}
                  placeholder="Université d'Antananarivo, EBM..."
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-medium"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                  Date & Lieu de naissance
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="date"
                    value={birthDate}
                    disabled={!canEdit}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-1/2 p-2 bg-white border border-slate-300 rounded-xl text-[11px]"
                  />
                  <input
                    type="text"
                    value={birthPlace}
                    disabled={!canEdit}
                    onChange={(e) => setBirthPlace(e.target.value)}
                    placeholder="Lieu"
                    className="w-1/2 p-2 bg-white border border-slate-300 rounded-xl text-[11px]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                  N° CIN / Pièce d'identité
                </label>
                <input
                  type="text"
                  value={cin}
                  disabled={!canEdit}
                  onChange={(e) => setCin(e.target.value)}
                  placeholder="101 241..."
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono"
                />
              </div>
            </div>

            {!isTeacherProfile && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200/80">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                    Fonction / Poste Occupé
                  </label>
                  <input
                    type="text"
                    value={jobTitle}
                    disabled={!canEdit}
                    onChange={(e) => setJobTitle(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                    Département / Direction / Service
                  </label>
                  <input
                    type="text"
                    value={department}
                    disabled={!canEdit}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                    Bureau / Localisation Campus
                  </label>
                  <input
                    type="text"
                    value={officeLocation}
                    disabled={!canEdit}
                    onChange={(e) => setOfficeLocation(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 2. Section Spécifique Enseignant d'Université */}
          {isTeacherProfile && (
            <>
              <div className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-200 space-y-4">
                <h4 className="font-black text-indigo-950 text-sm flex items-center gap-2 border-b border-indigo-200 pb-2.5">
                  <GraduationCap className="w-4 h-4 text-indigo-600" />
                  2. Dossier Académique, Diplôme & CV de l'Enseignant
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">
                      Grade Universitaire Officiel
                    </label>
                    <select
                      value={academicRank}
                      disabled={!canEdit}
                      onChange={(e) => setAcademicRank(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-indigo-900"
                    >
                      <option value="Professeur Titulaire">Professeur Titulaire</option>
                      <option value="Maître de Conférences">Maître de Conférences</option>
                      <option value="Docteur / HDR">Docteur / HDR</option>
                      <option value="Chargé de Cours">Chargé de Cours</option>
                      <option value="Assistant d'Enseignement Supérieur">Assistant d'Enseignement Supérieur</option>
                      <option value="Expert Professionnel / Vacataire">Expert Professionnel / Vacataire</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">
                      Diplôme le plus élevé
                    </label>
                    <input
                      type="text"
                      value={highestDiploma}
                      disabled={!canEdit}
                      onChange={(e) => setHighestDiploma(e.target.value)}
                      placeholder="Doctorat / PhD, Master Recherche, Ingénieur..."
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">
                      Université / Établissement d'origine
                    </label>
                    <input
                      type="text"
                      value={almaMater}
                      disabled={!canEdit}
                      onChange={(e) => setAlmaMater(e.target.value)}
                      placeholder="Université d'Antananarivo, Paris-Saclay..."
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">
                      Spécialité académique & Domaine de recherche
                    </label>
                    <input
                      type="text"
                      value={specialty}
                      disabled={!canEdit}
                      onChange={(e) => setSpecialty(e.target.value)}
                      placeholder="Architecture Logicielle, IA, Finance..."
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">
                      Département de rattachement
                    </label>
                    <input
                      type="text"
                      value={department}
                      disabled={!canEdit}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="Département Informatique / Sciences de Gestion"
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">
                      Bureau / Salle de permanence
                    </label>
                    <input
                      type="text"
                      value={officeLocation}
                      disabled={!canEdit}
                      onChange={(e) => setOfficeLocation(e.target.value)}
                      placeholder="Bâtiment A - Bureau 204"
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
                      disabled={!canEdit}
                      onChange={(e) => setSubjectsText(e.target.value)}
                      placeholder="Algorithmique, Bases de Données, Génie Logiciel..."
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">
                      Profil LinkedIn / ORCID / Google Scholar
                    </label>
                    <input
                      type="text"
                      value={orcidUrl || linkedInUrl}
                      disabled={!canEdit}
                      onChange={(e) => {
                        setOrcidUrl(e.target.value);
                        setLinkedInUrl(e.target.value);
                      }}
                      placeholder="https://orcid.org/0000-..."
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                    />
                  </div>
                </div>

                {/* Upload & Téléchargement du CV Enseignant */}
                <div className="p-4 bg-white border border-indigo-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-black text-indigo-950 block">
                      📄 Curriculum Vitae (CV Académique & Professionnel)
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {cvFileName ? (
                        <>
                          Fichier actuel : <strong className="text-emerald-700">{cvFileName}</strong>
                          {cvUploadedAt ? ` (mis à jour le ${cvUploadedAt})` : ''}
                        </>
                      ) : (
                        'Aucun CV téléversé pour le moment (Formats acceptés : PDF, DOCX)'
                      )}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {cvFileName && (
                      <button
                        type="button"
                        onClick={() => {
                          const a = document.createElement('a');
                          if (cvFileUrl) {
                            a.href = cvFileUrl;
                          } else {
                            const blob = new Blob(
                              [`CV Officiel EBM Institute - ${userToView.name}\nDiplôme: ${highestDiploma}\nGrade: ${academicRank}`],
                              { type: 'application/pdf' }
                            );
                            a.href = URL.createObjectURL(blob);
                          }
                          a.download = cvFileName;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                        }}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl font-bold text-xs cursor-pointer"
                      >
                        Télécharger le CV
                      </button>
                    )}
                    {canEdit && (
                      <label className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs cursor-pointer shadow-2xs">
                        {cvFileName ? 'Remplacer le CV' : 'Uploader un CV (PDF/DOCX)'}
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
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-indigo-200/60">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">N° CIN / Passeport</label>
                    <input
                      type="text"
                      value={cin}
                      disabled={!canEdit}
                      onChange={(e) => setCin(e.target.value)}
                      placeholder="101 231 456 789"
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">
                      RIB / Coordonnées Bancaires & Mobile Money
                    </label>
                    <input
                      type="text"
                      value={bankRib}
                      disabled={!canEdit}
                      onChange={(e) => setBankRib(e.target.value)}
                      placeholder="BNI / BOA / MVola..."
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">
                      Statut Contractuel & Quota
                    </label>
                    <div className="flex gap-1.5">
                      <select
                        value={contractType}
                        disabled={!canEditPayroll}
                        onChange={(e) => setContractType(e.target.value as any)}
                        className="flex-1 p-2.5 bg-white border border-slate-300 rounded-xl font-bold disabled:bg-slate-100"
                      >
                        <option value="PERMANENT">Permanent</option>
                        <option value="VACATAIRE">Vacataire</option>
                        <option value="MISSIONNAIRE">Missionnaire</option>
                      </select>
                      <input
                        type="number"
                        value={weeklyMaxHours}
                        disabled={!canEditPayroll}
                        onChange={(e) => setWeeklyMaxHours(Number(e.target.value))}
                        className="w-16 p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-center disabled:bg-slate-100"
                        title="Quota d'heures max / semaine"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-emerald-800 mb-1">
                      Taux Horaire Officiel (Ar/h)
                    </label>
                    <input
                      type="number"
                      step="1000"
                      value={hourlyRateAr}
                      disabled={!canEditPayroll}
                      onChange={(e) => setHourlyRateAr(Number(e.target.value))}
                      className="w-full p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl font-black text-emerald-900 disabled:opacity-80"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Disponibilités Hebdomadaires étendues de 07h00 à 17h00 */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      3. Disponibilités Hebdomadaires de l'Enseignant (Plage Large : 07h00 à 17h00)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Cliquez sur chaque tranche horaire entre <strong>07h00 et 17h00</strong> ou activez toute la journée (07h–17h) en 1 clic.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-center border-collapse text-xs">
                    <thead className="bg-slate-900 text-white text-[10px] uppercase font-bold">
                      <tr>
                        <th className="p-2.5 text-left">Plage Horaire (07h00 – 17h00)</th>
                        {WEEK_DAYS.map((day) => (
                          <th key={day} className="p-2">
                            <div>{day}</div>
                            {canEdit && (
                              <div className="flex justify-center gap-1 mt-1">
                                <button
                                  type="button"
                                  onClick={() => handleToggleFullDay7h17h(day, true)}
                                  className="px-1.5 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[9px] cursor-pointer"
                                  title="Disponible toute la journée 07h00-17h00"
                                >
                                  7h–17h ✓
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleFullDay7h17h(day, false)}
                                  className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-[9px] cursor-pointer"
                                  title="Indisponible toute la journée"
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
                          <td className="p-2.5 text-left font-bold text-slate-800 bg-slate-50 whitespace-nowrap">
                            <span className="font-mono text-blue-700 mr-1.5">{slotObj.label}</span>
                            <span className="text-[10px] text-slate-400">
                              ({slotObj.period === 'MATIN' ? 'Matin' : 'Après-midi'})
                            </span>
                          </td>
                          {WEEK_DAYS.map((day) => {
                            const cell = availabilities.find((a) => a.day === day && a.slot === slotObj.code);
                            const isAvail = cell?.available ?? day !== 'SAMEDI';
                            return (
                              <td key={`${day}-${slotObj.code}`} className="p-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleToggleSlot(day, slotObj.code)}
                                  className={`w-full py-1.5 px-2 rounded-lg font-bold text-[11px] border transition ${
                                    isAvail
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                      : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                                  }`}
                                >
                                  {isAvail ? '✓ Dispo' : '✕ Indispo'}
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
            </>
          )}

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
            >
              Fermer
            </button>
            {canEdit && (
              <button
                type="submit"
                className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl text-xs shadow-md flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                Enregistrer les modifications de la fiche
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
