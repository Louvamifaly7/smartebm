import React, { useState } from 'react';
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
} from 'lucide-react';
import { getTeachersForStudent } from '../utils/studentVisibility';
import { TeacherAvailabilitySlot, User } from '../types';
import { WIDE_TEACHER_SLOTS, buildWideAvailabilities } from './UserProfileModal';
import { exportTeacherScheduleToPDF } from '../utils/pdfExport';
import { downloadCsvFile } from '../utils/csvExport';

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

export const TeacherManagement: React.FC<TeacherManagementProps> = ({ onNavigateToCreate }) => {
  const { users, sessions, courses, ecs, rooms, groups, currentUser, getTeacherHourlyStats, updateTeacher } = useApp();

  const isStudent = currentUser.role === 'STUDENT';
  const isTeacher = currentUser.role === 'TEACHER';
  const canEditFinanceOrSchedule = ['ADMIN', 'ADMIN_STAFF', 'SCOLARITE', 'SCHEDULER', 'ACADEMIC_HEAD', 'FINANCE'].includes(
    currentUser.role
  );

  const allTeachers = users.filter((u) => u.role === 'TEACHER');
  const studentTeachers = getTeachersForStudent(currentUser.groupId, courses, ecs, sessions, users);
  // Si connecté en tant qu'enseignant, il voit uniquement sa propre fiche enseignant
  const teachers = isTeacher
    ? allTeachers.filter((t) => t.id === currentUser.id)
    : isStudent
    ? studentTeachers
    : allTeachers;

  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);

  // Full University Teacher Sheet State (modifiable by Administration AND by the Teacher themselves)
  const [editCivilite, setEditCivilite] = useState<'M.' | 'Mme' | 'Mlle' | 'Dr.' | 'Prof.'>('Dr.');
  const [editName, setEditName] = useState<string>('');
  const [editAcademicRank, setEditAcademicRank] = useState<string>('Maître de Conférences');
  const [editHighestDiploma, setEditHighestDiploma] = useState<string>('Doctorat (PhD)');
  const [editAlmaMater, setEditAlmaMater] = useState<string>('');
  const [editSpecialty, setEditSpecialty] = useState<string>('');
  const [editDepartment, setEditDepartment] = useState<string>('');
  const [editOfficeLocation, setEditOfficeLocation] = useState<string>('');
  const [editEmail, setEditEmail] = useState<string>('');
  const [editPhone, setEditPhone] = useState<string>('');
  const [editSecondaryPhone, setEditSecondaryPhone] = useState<string>('');
  const [editAddress, setEditAddress] = useState<string>('');
  const [editCity, setEditCity] = useState<string>('Antananarivo');
  const [editEmergencyContact, setEditEmergencyContact] = useState<string>('');
  const [editLinkedIn, setEditLinkedIn] = useState<string>('');
  const [editOrcid, setEditOrcid] = useState<string>('');
  const [editSubjectsText, setEditSubjectsText] = useState<string>('');
  const [editHourlyRate, setEditHourlyRate] = useState<number>(40000);
  const [editWeeklyMax, setEditWeeklyMax] = useState<number>(18);
  const [editContractType, setEditContractType] = useState<'PERMANENT' | 'VACATAIRE' | 'MISSIONNAIRE'>('VACATAIRE');
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

  const handleOpenTeacherModal = (teacher: User) => {
    setSelectedTeacherId(teacher.id);
    setEditCivilite(teacher.civilite || 'Dr.');
    setEditName(teacher.name || '');
    setEditAcademicRank(teacher.academicRank || 'Maître de Conférences');
    setEditHighestDiploma(teacher.highestDiploma || 'Doctorat (PhD)');
    setEditAlmaMater(teacher.almaMater || "Université d'Antananarivo / EBM Institute");
    setEditSpecialty(teacher.specialty || teacher.subjects?.join(', ') || '');
    setEditDepartment(teacher.department || 'Pôle Sciences & Technologies');
    setEditOfficeLocation(teacher.officeLocation || 'Salle des Professeurs EBM');
    setEditEmail(teacher.email || '');
    setEditPhone(teacher.phone || '');
    setEditSecondaryPhone(teacher.secondaryPhone || '');
    setEditAddress(teacher.address || '');
    setEditCity(teacher.city || 'Antananarivo');
    setEditEmergencyContact(teacher.emergencyContact || '');
    setEditLinkedIn(teacher.linkedInUrl || '');
    setEditOrcid(teacher.orcidUrl || '');
    setEditSubjectsText((teacher.subjects || []).join(', '));
    setEditHourlyRate(teacher.hourlyRateAr || 40000);
    setEditWeeklyMax(teacher.weeklyMaxHours || 18);
    setEditContractType(teacher.contractType || 'VACATAIRE');
    setEditBankRib(teacher.bankRib || '');
    setEditCin(teacher.cin || '');
    setEditCvFileName(teacher.cvFileName || '');
    setEditCvFileUrl(teacher.cvFileUrl || '');
    setEditCvUploadedAt(teacher.cvUploadedAt || '');
    setSaveFeedback(null);
  };

  const handleSaveTeacherProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTeacher || !canEditActiveTeacher) return;

    const parsedSubjects = editSubjectsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    updateTeacher(activeTeacher.id, {
      civilite: editCivilite,
      name: editName.trim() || activeTeacher.name,
      academicRank: editAcademicRank.trim() || undefined,
      highestDiploma: editHighestDiploma.trim() || undefined,
      almaMater: editAlmaMater.trim() || undefined,
      specialty: editSpecialty.trim() || undefined,
      department: editDepartment.trim() || undefined,
      officeLocation: editOfficeLocation.trim() || undefined,
      email: editEmail.trim() || activeTeacher.email,
      phone: editPhone.trim() || undefined,
      secondaryPhone: editSecondaryPhone.trim() || undefined,
      address: editAddress.trim() || undefined,
      city: editCity.trim() || undefined,
      emergencyContact: editEmergencyContact.trim() || undefined,
      linkedInUrl: editLinkedIn.trim() || undefined,
      orcidUrl: editOrcid.trim() || undefined,
      subjects: parsedSubjects.length > 0 ? parsedSubjects : activeTeacher.subjects,
      hourlyRateAr: canEditFinanceOrSchedule ? Number(editHourlyRate) || 40000 : activeTeacher.hourlyRateAr,
      weeklyMaxHours: Number(editWeeklyMax) || 18,
      contractType: canEditFinanceOrSchedule ? editContractType : activeTeacher.contractType,
      bankRib: editBankRib.trim() || undefined,
      cin: editCin.trim() || undefined,
      cvFileName: editCvFileName || undefined,
      cvFileUrl: editCvFileUrl || undefined,
      cvUploadedAt: editCvUploadedAt || undefined,
    });
    setSaveFeedback('Fiche universitaire enseignant, CV, coordonnées et disponibilités enregistrées avec succès !');
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
      const startStr = monday.toISOString().split('T')[0];
      const endStr = sunday.toISOString().split('T')[0];
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                <UserCheck className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                Corps Enseignant, Disponibilités & Taux Horaires (Paie)
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Cliquez sur un enseignant pour ouvrir sa fiche complète, gérer ses disponibilités hebdomadaires et consulter son taux horaire (Ar/h) pour la paie.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold px-3 py-1.5 bg-blue-50 text-blue-800 rounded-xl border border-blue-200">
              {teachers.length} enseignants actifs
            </span>
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
                    'Taux Horaire (Ar/h)',
                    'Paie Validée (Ar)',
                  ];
                  const rows = teachers.map((t) => {
                    const st = getTeacherHourlyStats(t.id);
                    const rate = t.hourlyRateAr || 40000;
                    return [
                      t.civilite || 'Dr.',
                      t.name,
                      t.academicRank || 'Enseignant-Chercheur',
                      t.highestDiploma || 'Doctorat / Master',
                      t.specialty || (t.subjects || []).join(', '),
                      t.contractType || 'VACATAIRE',
                      t.email,
                      t.phone || '',
                      st.totalScheduled,
                      st.totalCompleted,
                      st.maxWeekly,
                      rate,
                      st.totalCompleted * rate,
                    ];
                  });
                  downloadCsvFile('Etat_Corps_Enseignant_et_Paie.csv', headers, rows);
                }}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Exporter CSV (Enseignants & Paie)
              </button>
            )}
            {onNavigateToCreate && !isStudent && (
              <button
                onClick={onNavigateToCreate}
                className="px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer"
              >
                + Ajouter un Enseignant
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Teachers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teachers.map((teacher) => {
          const stats = getTeacherHourlyStats(teacher.id);
          const isOverCapacity = stats.totalScheduled > stats.maxWeekly;
          const hourlyRate = teacher.hourlyRateAr || 40000;
          const availGrid = buildWideAvailabilities(teacher.availabilities);
          const availableCount = availGrid.filter((a) => a.available).length;

          return (
            <div
              key={teacher.id}
              onClick={() => handleOpenTeacherModal(teacher)}
              className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200 flex flex-col justify-between transition-all hover:shadow-md hover:border-blue-400 cursor-pointer group"
            >
              <div>
                {/* Profile Header */}
                <div className="flex items-start gap-3 pb-3 border-b border-slate-100">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-900 flex items-center justify-center font-bold text-base border border-blue-200 flex-shrink-0 shadow-xs group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    {teacher.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <h3 className="text-sm font-bold text-slate-900 truncate group-hover:text-blue-700">
                        {teacher.civilite ? `${teacher.civilite} ` : ''}{teacher.name}
                      </h3>
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-[9px] font-bold uppercase shrink-0">
                        {teacher.contractType || 'VACATAIRE'}
                      </span>
                    </div>
                    <p className="text-[11px] font-semibold text-indigo-700 truncate">
                      {teacher.academicRank || 'Enseignant-Chercheur'} • {teacher.highestDiploma || 'Doctorat / Master'}
                    </p>
                    <p className="text-xs text-slate-500 truncate flex items-center gap-1 mt-0.5">
                      <Mail className="w-3 h-3 text-slate-400" /> {teacher.email}
                    </p>
                    {teacher.phone && (
                      <p className="text-xs text-slate-500 truncate flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" /> {teacher.phone}
                      </p>
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
                      <span className="text-[10px] text-slate-400 italic">Génie Logiciel & Systèmes</span>
                    )}
                  </div>
                </div>

                {/* Hourly Stats & Hourly Rate (Taux horaire) */}
                <div className="grid grid-cols-3 gap-2 mt-4 text-xs">
                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 text-center">
                    <span className="text-[9px] text-slate-500 uppercase block font-semibold">Programmées</span>
                    <span className="text-xs font-bold text-blue-900">{stats.totalScheduled} h</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 text-center">
                    <span className="text-[9px] text-slate-500 uppercase block font-semibold">Validées</span>
                    <span className="text-xs font-bold text-emerald-800">{stats.totalCompleted} h</span>
                  </div>
                  {!isStudent && (
                    <div className="bg-emerald-50/80 p-2 rounded-xl border border-emerald-200 text-center">
                      <span className="text-[9px] text-emerald-700 uppercase block font-bold">Taux Horaire</span>
                      <span className="text-xs font-black text-emerald-900">
                        {hourlyRate.toLocaleString()} Ar/h
                      </span>
                    </div>
                  )}
                </div>

                {/* Availability preview (07h00 - 17h00) */}
                <div className="mt-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
                  <div className="flex items-center justify-between text-[10px] mb-1.5">
                    <span className="font-bold text-slate-700 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-blue-600" />
                      Disponibilités (07h–17h) :
                    </span>
                    <span className="font-bold text-emerald-700">
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
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  Quota : {stats.maxWeekly}h/sem.
                </span>
                <span className="text-blue-700 font-bold flex items-center gap-1 group-hover:underline">
                  <Eye className="w-3.5 h-3.5" />
                  Ouvrir Fiche & Paie →
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL: FICHE INDIVIDUELLE COMPLÈTE ENSEIGNANT (Disponibilités + Taux Horaire + Paie) */}
      {activeTeacher && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center font-black text-2xl">
                  {activeTeacher.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-blue-500/30 border border-blue-400/40 text-blue-200 rounded-full text-[10px] font-bold uppercase">
                      Fiche Individuelle Enseignant
                    </span>
                    <span className="px-2.5 py-0.5 bg-emerald-500/30 border border-emerald-400/40 text-emerald-200 rounded-full text-[10px] font-bold uppercase">
                      {activeTeacher.contractType || 'VACATAIRE'}
                    </span>
                    {!isStudent && (
                      <span className="px-2.5 py-0.5 bg-amber-400 text-slate-950 rounded-full text-[11px] font-black">
                        Taux Horaire : {(activeTeacher.hourlyRateAr || 40000).toLocaleString()} Ar / heure
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-black mt-1">{activeTeacher.name}</h3>
                  <p className="text-xs text-slate-300">
                    {activeTeacher.jobTitle || 'Enseignant-Chercheur'} • {activeTeacher.department || 'EBM Institute'} •{' '}
                    {activeTeacher.email}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTeacherId(null)}
                className="self-end sm:self-center p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs">
              {saveFeedback && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-bold flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{saveFeedback}</span>
                </div>
              )}

              {/* 1. SECTION PAIE, COMPTABILITÉ & TAUX HORAIRE */}
              {!isStudent && (
                <div className="bg-gradient-to-r from-emerald-50 via-teal-50/60 to-slate-50 p-5 rounded-2xl border border-emerald-200 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/70 pb-3">
                    <div className="flex items-center gap-2">
                      <Banknote className="w-5 h-5 text-emerald-700" />
                      <div>
                        <h4 className="font-black text-sm text-slate-900">
                          Comptabilité & Paie de Fin de Mois (Taux Horaire & Vacations)
                        </h4>
                        <p className="text-[11px] text-slate-600">
                          Calcul automatique des honoraires d'enseignement selon le taux horaire en Ariary (Ar).
                        </p>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-bold text-emerald-800 bg-white px-3 py-1 rounded-lg border border-emerald-200">
                      RIB : {activeTeacher.bankRib || 'Non renseigné'}
                    </span>
                  </div>

                  {(() => {
                    const stats = getTeacherHourlyStats(activeTeacher.id);
                    const rate = activeTeacher.hourlyRateAr || 40000;
                    const payCompletedAr = stats.totalCompleted * rate;
                    const payScheduledAr = stats.totalScheduled * rate;
                    const payMonthlyEstimateAr = stats.totalScheduled * 4 * rate;

                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-2xs">
                          <span className="text-[10px] font-bold uppercase text-slate-400 block">
                            Taux Horaire Officiel
                          </span>
                          <span className="text-lg font-black text-emerald-700">
                            {rate.toLocaleString()} Ar / h
                          </span>
                          <span className="text-[10px] text-slate-500 block mt-0.5">
                            Contrat {activeTeacher.contractType || 'VACATAIRE'}
                          </span>
                        </div>

                        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                          <span className="text-[10px] font-bold uppercase text-slate-400 block">
                            Paie Heures Réalisées ({stats.totalCompleted}h)
                          </span>
                          <span className="text-lg font-black text-slate-900">
                            {payCompletedAr.toLocaleString()} Ar
                          </span>
                          <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">
                            Séances validées émargées
                          </span>
                        </div>

                        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                          <span className="text-[10px] font-bold uppercase text-slate-400 block">
                            Paie Semaine Planifiée ({stats.totalScheduled}h)
                          </span>
                          <span className="text-lg font-black text-blue-800">
                            {payScheduledAr.toLocaleString()} Ar
                          </span>
                          <span className="text-[10px] text-slate-500 block mt-0.5">
                            Sur quota max de {stats.maxWeekly}h/sem
                          </span>
                        </div>

                        <div className="bg-slate-900 text-white p-3.5 rounded-xl shadow-2xs">
                          <span className="text-[10px] font-bold uppercase text-emerald-300 block">
                            Estimation Paie Fin de Mois (4 sem.)
                          </span>
                          <span className="text-lg font-black text-amber-300">
                            {payMonthlyEstimateAr.toLocaleString()} Ar
                          </span>
                          <span className="text-[10px] text-slate-300 block mt-0.5">
                            Base : {stats.totalScheduled * 4}h mensuelles
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {canEditFinanceOrSchedule && (
                    <form onSubmit={handleSaveTeacherProfile} className="pt-3 border-t border-emerald-200/70 grid grid-cols-1 sm:grid-cols-6 gap-3 items-end">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">
                          Taux Horaire (Ar/h) *
                        </label>
                        <input
                          type="number"
                          step="1000"
                          min="5000"
                          value={editHourlyRate}
                          onChange={(e) => setEditHourlyRate(Number(e.target.value))}
                          className="w-full p-2 bg-white border border-emerald-300 rounded-lg font-black text-emerald-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">
                          Type de Contrat
                        </label>
                        <select
                          value={editContractType}
                          onChange={(e) => setEditContractType(e.target.value as any)}
                          className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold"
                        >
                          <option value="PERMANENT">Permanent</option>
                          <option value="VACATAIRE">Vacataire</option>
                          <option value="MISSIONNAIRE">Missionnaire</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">
                          Quota Max (h/sem)
                        </label>
                        <input
                          type="number"
                          min="2"
                          max="40"
                          value={editWeeklyMax}
                          onChange={(e) => setEditWeeklyMax(Number(e.target.value))}
                          className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">
                          N° CIN
                        </label>
                        <input
                          type="text"
                          value={editCin}
                          onChange={(e) => setEditCin(e.target.value)}
                          placeholder="101 231..."
                          className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">
                          RIB / Compte Paie
                        </label>
                        <input
                          type="text"
                          value={editBankRib}
                          onChange={(e) => setEditBankRib(e.target.value)}
                          placeholder="BNI / BOA / MVola..."
                          className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono"
                        />
                      </div>
                      <div>
                        <button
                          type="submit"
                          className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs cursor-pointer"
                        >
                          Enregistrer Paie
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* 1B. FICHE UNIVERSITAIRE COMPLÈTE & CONTACTS (MODIFIABLE PAR L'ADMINISTRATION ET PAR L'ENSEIGNANT LUI-MÊME) */}
              <form onSubmit={handleSaveTeacherProfile} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-indigo-600" />
                    <div>
                      <h4 className="font-black text-sm text-slate-900">
                        Informations Universitaires, Grade, Diplômes & Coordonnées de Contact
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Fiche complète requise pour un enseignant universitaire — modifiable par l'Administration et par l'Enseignant lui-même.
                      </p>
                    </div>
                  </div>
                  {canEditActiveTeacher && (
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-xs cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Enregistrer la Fiche Enseignant
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Civilité</label>
                    <select
                      value={editCivilite}
                      disabled={!canEditActiveTeacher}
                      onChange={(e) => setEditCivilite(e.target.value as any)}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-900"
                    >
                      <option value="Prof.">Prof.</option>
                      <option value="Dr.">Dr.</option>
                      <option value="M.">M.</option>
                      <option value="Mme">Mme</option>
                      <option value="Mlle">Mlle</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Nom & Prénom(s) Officiels *</label>
                    <input
                      type="text"
                      required
                      disabled={!canEditActiveTeacher}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Grade Universitaire</label>
                    <select
                      value={editAcademicRank}
                      disabled={!canEditActiveTeacher}
                      onChange={(e) => setEditAcademicRank(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-indigo-900"
                    >
                      <option value="Professeur Titulaire">Professeur Titulaire</option>
                      <option value="Maître de Conférences">Maître de Conférences</option>
                      <option value="Assistant d'Enseignement Supérieur">Assistant d'ESR</option>
                      <option value="Enseignant-Chercheur">Enseignant-Chercheur</option>
                      <option value="Chargé de Cours / Expert Pro">Chargé de Cours / Expert Pro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Diplôme le plus élevé</label>
                    <input
                      type="text"
                      disabled={!canEditActiveTeacher}
                      value={editHighestDiploma}
                      onChange={(e) => setEditHighestDiploma(e.target.value)}
                      placeholder="Doctorat (PhD), HDR, Master..."
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Université d'origine</label>
                    <input
                      type="text"
                      disabled={!canEditActiveTeacher}
                      value={editAlmaMater}
                      onChange={(e) => setEditAlmaMater(e.target.value)}
                      placeholder="Université d'Antananarivo, Paris-Saclay..."
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Spécialité Académique</label>
                    <input
                      type="text"
                      disabled={!canEditActiveTeacher}
                      value={editSpecialty}
                      onChange={(e) => setEditSpecialty(e.target.value)}
                      placeholder="Génie Logiciel, IA, Finance..."
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Département / Pôle</label>
                    <input
                      type="text"
                      disabled={!canEditActiveTeacher}
                      value={editDepartment}
                      onChange={(e) => setEditDepartment(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg"
                    />
                  </div>

                  {/* CONTACTS COMPLETS */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-blue-700 mb-1">Email Professionnel *</label>
                    <input
                      type="email"
                      required
                      disabled={!canEditActiveTeacher}
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full p-2 bg-blue-50/40 border border-blue-200 rounded-lg font-semibold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-blue-700 mb-1">Téléphone Principal *</label>
                    <input
                      type="text"
                      disabled={!canEditActiveTeacher}
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="+261 34 00 000 00"
                      className="w-full p-2 bg-blue-50/40 border border-blue-200 rounded-lg font-semibold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-blue-700 mb-1">Téléphone Secondaire / WhatsApp</label>
                    <input
                      type="text"
                      disabled={!canEditActiveTeacher}
                      value={editSecondaryPhone}
                      onChange={(e) => setEditSecondaryPhone(e.target.value)}
                      placeholder="+261 32 00 000 00"
                      className="w-full p-2 bg-blue-50/40 border border-blue-200 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-blue-700 mb-1">Bureau / Salle Profs</label>
                    <input
                      type="text"
                      disabled={!canEditActiveTeacher}
                      value={editOfficeLocation}
                      onChange={(e) => setEditOfficeLocation(e.target.value)}
                      placeholder="Bâtiment A - Bureau 204"
                      className="w-full p-2 bg-blue-50/40 border border-blue-200 rounded-lg"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Adresse Domicile & Ville</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        disabled={!canEditActiveTeacher}
                        value={editAddress}
                        onChange={(e) => setEditAddress(e.target.value)}
                        placeholder="Lot II M 45 Antsakaviro..."
                        className="flex-1 p-2 bg-slate-50 border border-slate-300 rounded-lg"
                      />
                      <input
                        type="text"
                        disabled={!canEditActiveTeacher}
                        value={editCity}
                        onChange={(e) => setEditCity(e.target.value)}
                        placeholder="Ville"
                        className="w-32 p-2 bg-slate-50 border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Contact d'Urgence</label>
                    <input
                      type="text"
                      disabled={!canEditActiveTeacher}
                      value={editEmergencyContact}
                      onChange={(e) => setEditEmergencyContact(e.target.value)}
                      placeholder="Nom & Tél. d'urgence"
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Profil LinkedIn / ORCID</label>
                    <input
                      type="text"
                      disabled={!canEditActiveTeacher}
                      value={editLinkedIn || editOrcid}
                      onChange={(e) => setEditLinkedIn(e.target.value)}
                      placeholder="https://linkedin.com/in/..."
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Matières / EC enseignés (séparés par une virgule)
                    </label>
                    <input
                      type="text"
                      disabled={!canEditActiveTeacher}
                      value={editSubjectsText}
                      onChange={(e) => setEditSubjectsText(e.target.value)}
                      placeholder="Architecture Logicielle, Base de Données, Intelligence Artificielle..."
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-medium"
                    />
                  </div>

                  {!isStudent && (
                    <>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">N° CIN</label>
                        <input
                          type="text"
                          disabled={!canEditActiveTeacher}
                          value={editCin}
                          onChange={(e) => setEditCin(e.target.value)}
                          placeholder="101 231..."
                          className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">RIB / Compte Bancaire ou Mobile Money</label>
                        <input
                          type="text"
                          disabled={!canEditActiveTeacher}
                          value={editBankRib}
                          onChange={(e) => setEditBankRib(e.target.value)}
                          placeholder="BNI / BOA / MVola..."
                          className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono"
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* CV DE L'ENSEIGNANT : UPLOAD & TÉLÉCHARGEMENT */}
                <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      Curriculum Vitae (CV Académique & Universitaire)
                    </span>
                    <span className="text-[11px] text-slate-600 block mt-0.5">
                      {editCvFileName ? (
                        <>
                          Fichier enregistré : <strong className="text-emerald-700">{editCvFileName}</strong>
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
                            const content = `CURRICULUM VITAE OFFICIEL - EBM INSTITUTE\nEnseignant : ${editCivilite} ${editName}\nGrade : ${editAcademicRank}\nDiplôme le plus élevé : ${editHighestDiploma}\nUniversité : ${editAlmaMater}\nSpécialité : ${editSpecialty}`;
                            a.href = URL.createObjectURL(new Blob([content], { type: 'application/pdf' }));
                          }
                          a.download = editCvFileName;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                        }}
                        className="px-3 py-1.5 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-emerald-600" />
                        Télécharger CV
                      </button>
                    )}

                    {canEditActiveTeacher && (
                      <label className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{editCvFileName ? 'Mettre à jour le CV' : 'Uploader CV (PDF/DOCX)'}</span>
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
                              setSaveFeedback(`CV "${file.name}" téléversé et rattaché à la fiche de ${activeTeacher.name} !`);
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>
              </form>

              {/* 2. GRILLE DE DISPONIBILITÉS HEBDOMADAIRES LARGE (07H00 À 17H00) POUR L'EMPLOI DU TEMPS */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      Disponibilités Hebdomadaires de l'Enseignant — Plage Large de 07h00 à 17h00
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Cliquez sur un créneau (de 07h00 à 17h00) ou sur « Journée 07h–17h » pour indiquer vos disponibilités à l'emploi du temps.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] font-bold">
                    <span className="flex items-center gap-1 text-emerald-700">
                      <span className="w-3 h-3 rounded bg-emerald-500 inline-block"></span> Disponible
                    </span>
                    <span className="flex items-center gap-1 text-rose-700">
                      <span className="w-3 h-3 rounded bg-rose-500 inline-block"></span> Indisponible
                    </span>
                  </div>
                </div>

                {(() => {
                  const grid = buildWideAvailabilities(activeTeacher.availabilities);
                  return (
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-center border-collapse text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                          <tr>
                            <th className="p-2.5 text-left">Plage Horaire (07h00 – 17h00)</th>
                            {DEFAULT_WEEK_DAYS.map((day) => (
                              <th key={day} className="p-2">
                                <div className="font-black text-slate-800">{day}</div>
                                {canEditActiveTeacher && (
                                  <div className="flex items-center justify-center gap-1 mt-1">
                                    <button
                                      type="button"
                                      onClick={() => handleSetFullDayAvailability(activeTeacher, day, true)}
                                      className="px-1.5 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded text-[9px] font-bold cursor-pointer"
                                      title="Tout cocher disponible de 07h à 17h"
                                    >
                                      07h–17h ✓
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSetFullDayAvailability(activeTeacher, day, false)}
                                      className="px-1.5 py-0.5 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded text-[9px] font-bold cursor-pointer"
                                      title="Tout marquer indisponible"
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
                              <td className="p-2.5 text-left font-bold text-slate-800 bg-slate-50/60 whitespace-nowrap">
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
                                      className={`w-full py-2 px-2 rounded-xl font-bold text-[11px] border transition-all ${
                                        canEditActiveTeacher ? 'cursor-pointer hover:scale-[1.02]' : 'cursor-default'
                                      } ${
                                        isAvail
                                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                          : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                                      }`}
                                    >
                                      <span className="block">{isAvail ? '✓ Disponible' : '✕ Indisponible'}</span>
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

              {/* 3. SÉANCES AFFECTÉES À L'EMPLOI DU TEMPS */}
              <div className="grid grid-cols-1 gap-4">

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-black uppercase text-slate-800 block">
                        Séances Planifiées chez EBM & Export PDF du Planning
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Choisissez la période (Semaine, Mois, Semestre) pour exporter en PDF tous les cours de cet enseignant chez EBM.
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={pdfPeriodType}
                        onChange={(e) => setPdfPeriodType(e.target.value as 'WEEK' | 'MONTH' | 'SEMESTER')}
                        className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
                      >
                        <option value="WEEK">Période : Cette Semaine</option>
                        <option value="MONTH">Période : Ce Mois</option>
                        <option value="SEMESTER">Période : Tout le Semestre</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => handleExportTeacherPdf(activeTeacher, pdfPeriodType)}
                        className="px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
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
                      <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                        {teacherSessions.map((s) => {
                          const crs = courses.find((c) => c.id === s.courseId);
                          const rm = rooms.find((r) => r.id === s.roomId);
                          const grps = s.groupIds.map((gid) => groups.find((g) => g.id === gid)?.code).filter(Boolean);
                          return (
                            <div
                              key={s.id}
                              className="p-2 bg-white rounded-xl border border-slate-200 flex items-center justify-between"
                            >
                              <div>
                                <div className="font-bold text-slate-900">{crs?.title || 'Cours'}</div>
                                <div className="text-[10px] text-slate-500">
                                  {s.date} • {s.startTime}–{s.endTime} ({s.durationHours}h) • Groupes : {grps.join(', ')}
                                </div>
                              </div>
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-800 font-mono font-bold rounded text-[10px]">
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
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedTeacherId(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs cursor-pointer"
              >
                Fermer la fiche enseignant
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

