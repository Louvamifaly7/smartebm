import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { UniteEnseignement, ElementConstitutif, SemesterCode } from '../types';
import {
  BookOpen,
  Copy,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  GraduationCap,
  Sparkles,
  Calendar,
  Layers,
  ArrowRight,
  UserCheck,
  Lock,
  Sliders,
  Compass,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { getTeachersForStudent } from '../utils/studentVisibility';
import { UniversalStudentSelector } from './UniversalStudentSelector';

export const LmdMaquetteView: React.FC = () => {
  const {
    currentUser,
    academicYears,
    selectedAcademicYear,
    setSelectedAcademicYear,
    ues,
    ecs,
    courses,
    sessions,
    filieres,
    addFiliere,
    updateFiliere,
    deleteFiliere,
    domaines,
    addDomaine,
    updateDomaine,
    deleteDomaine,
    groups,
    users,
    inscriptions,
    parcours,
    addParcours,
    updateParcours,
    deleteParcours,
    getActiveAcademicRules,
    updateAcademicRules,
    addUe,
    updateUe,
    deleteUe,
    addEc,
    updateEc,
    deleteEc,
    duplicateMaquette,
    inscribeStudent,
  } = useApp();

  const isStudent = currentUser.role === 'STUDENT';
  const myInscription = inscriptions.find(
    (i) => i.studentId === currentUser.id && i.academicYear === selectedAcademicYear
  ) || inscriptions.find((i) => i.studentId === currentUser.id);
  const myGroup = groups.find((g) => g.id === (currentUser.groupId || myInscription?.groupId));
  const studentFiliereId = myGroup?.filiereId || myInscription?.filiereId;
  const studentLevel = myGroup?.level || myInscription?.level;
  const studentParcoursId = currentUser.parcoursId || myGroup?.parcoursId || myInscription?.parcoursId;
  const isAcademicStaff = ['ADMIN', 'ADMIN_STAFF', 'ACADEMIC_HEAD', 'SCOLARITE', 'SCHEDULER'].includes(currentUser.role);

  const [activeTab, setActiveTab] = useState<'MAQUETTES' | 'DOMAINES_MENTIONS' | 'PARCOURS' | 'RULES' | 'INSCRIPTIONS'>('MAQUETTES');
  const [selectedSemester, setSelectedSemester] = useState<SemesterCode | 'ALL'>('ALL');
  const [selectedDomaine, setSelectedDomaine] = useState<string>('ALL');
  const [selectedFiliere, setSelectedFiliere] = useState<string>('ALL');
  const [selectedParcoursFilter, setSelectedParcoursFilter] = useState<string>('ALL');
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<string>('ALL');

  // State for adding/editing Domaine & Mention (Filière)
  const [newDomaineInput, setNewDomaineInput] = useState<string>('');
  const [editingDomaineName, setEditingDomaineName] = useState<string | null>(null);
  const [editingDomaineValue, setEditingDomaineValue] = useState<string>('');
  const [editingFiliereId, setEditingFiliereId] = useState<string | null>(null);
  const [domaineFeedback, setDomaineFeedback] = useState<string | null>(null);
  const [newMentionForm, setNewMentionForm] = useState({
    code: '',
    name: '',
    domaine: domaines[0] || 'Sciences et Technologies',
    department: 'Pôle Technologies & Sciences',
  });

  const activeRules = getActiveAcademicRules(selectedAcademicYear);
  const [rulesSavedNotice, setRulesSavedNotice] = useState<string | null>(null);

  // Parcours modal state
  const [showAddParcoursModal, setShowAddParcoursModal] = useState<boolean>(false);
  const [editingParcoursId, setEditingParcoursId] = useState<string | null>(null);
  const [parcoursForm, setParcoursForm] = useState({
    code: '',
    name: '',
    filiereId: filieres[0]?.id || 'fil-1',
    level: 'L1',
    description: '',
  });

  // Modals state
  const [showDuplicateModal, setShowDuplicateModal] = useState<boolean>(false);
  const [sourceYear, setSourceYear] = useState<string>(selectedAcademicYear);
  const [targetYear, setTargetYear] = useState<string>('2027-2028');
  const [duplicateSuccessMsg, setDuplicateSuccessMsg] = useState<string | null>(null);

  const [showAddUeModal, setShowAddUeModal] = useState<boolean>(false);
  const [editingUeId, setEditingUeId] = useState<string | null>(null);
  const [ueFormData, setUeFormData] = useState({
    code: '',
    title: '',
    filiereId: filieres[0]?.id || 'fil-1',
    parcoursId: '',
    level: 'L1',
    semester: 'S1' as SemesterCode,
    creditsEcts: 6,
    coefficient: 6,
    validationThreshold: 10.0,
  });

  const [showAddEcModal, setShowAddEcModal] = useState<boolean>(false);
  const [editingEcId, setEditingEcId] = useState<string | null>(null);
  const [selectedUeForEc, setSelectedUeForEc] = useState<UniteEnseignement | null>(null);
  const [ecFormData, setEcFormData] = useState({
    code: '',
    title: '',
    semester: 'S1' as SemesterCode,
    creditsEcts: 3,
    coefficient: 3,
    hourlyVolume: 30,
    teacherIds: [] as string[],
    groupIds: [] as string[],
    quizWeight: 0.4,
    examWeight: 0.6,
  });

  const [showInscribeModal, setShowInscribeModal] = useState<boolean>(false);
  const [inscribeError, setInscribeError] = useState<string>('');
  const [inscribeFormData, setInscribeFormData] = useState({
    studentId: 'user-student-laurent',
    academicYear: selectedAcademicYear,
    filiereId: filieres[0]?.id || 'fil-1',
    parcoursId: parcours[0]?.id || '',
    level: 'L1',
    groupId: groups[0]?.id || 'grp-l1-info-a',
    inscriptionType: 'INSCRIPTION' as 'INSCRIPTION' | 'REINSCRIPTION',
    academicStatus: 'NOUVEAU' as 'NOUVEAU' | 'PASSANT' | 'PASSAGE_CONDITIONNEL' | 'REDOUBLANT' | 'DIPLOME',
    cinOrBirthCert: true,
    baccOriginal: true,
    photosId: true,
    medicalCert: true,
    financialClearance: true,
  });

  // Filter UEs according to current academic year, domaine, filiere, parcours, level and semester (ACC-047 to ACC-054)
  const filteredUes = ues.filter((ue) => {
    if (ue.academicYear !== selectedAcademicYear) return false;
    const ueFiliere = filieres.find((f) => f.id === ue.filiereId);
    if (isStudent) {
      if (studentFiliereId && ue.filiereId !== studentFiliereId) return false;
      if (studentLevel && ue.level !== studentLevel) return false;
      if (studentParcoursId && ue.parcoursId && ue.parcoursId !== studentParcoursId) return false;
    } else {
      if (selectedDomaine !== 'ALL' && ueFiliere?.domaine !== selectedDomaine) return false;
      if (selectedFiliere !== 'ALL' && ue.filiereId !== selectedFiliere) return false;
      if (selectedParcoursFilter !== 'ALL' && ue.parcoursId && ue.parcoursId !== selectedParcoursFilter) return false;
      if (selectedLevelFilter !== 'ALL' && ue.level !== selectedLevelFilter) return false;
    }
    if (selectedSemester !== 'ALL' && ue.semester !== selectedSemester) return false;
    return true;
  });

  const visibleParcours = isStudent
    ? parcours.filter(
        (p) =>
          (!studentFiliereId || p.filiereId === studentFiliereId) &&
          (!studentLevel || p.level === studentLevel) &&
          (!studentParcoursId || p.id === studentParcoursId)
      )
    : parcours;

  const handleDuplicate = () => {
    if (!targetYear.trim()) return;
    const res = duplicateMaquette(sourceYear, targetYear);
    if (res.success) {
      setDuplicateSuccessMsg(res.message);
      setTimeout(() => {
        setShowDuplicateModal(false);
        setDuplicateSuccessMsg(null);
        setSelectedAcademicYear(targetYear);
      }, 1800);
    }
  };

  const handleCreateUe = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUeId) {
      updateUe(editingUeId, {
        code: ueFormData.code.trim().toUpperCase(),
        title: ueFormData.title.trim(),
        filiereId: ueFormData.filiereId,
        parcoursId: ueFormData.parcoursId || undefined,
        level: ueFormData.level,
        semester: ueFormData.semester,
        creditsEcts: ueFormData.creditsEcts,
        coefficient: ueFormData.coefficient,
        validationThreshold: ueFormData.validationThreshold,
      });
      setShowAddUeModal(false);
      setEditingUeId(null);
      return;
    }
    const res = addUe({
      ...ueFormData,
      academicYear: selectedAcademicYear,
      ecIds: [],
      status: 'ACTIVE',
    });
    if (res.success) {
      setShowAddUeModal(false);
      setUeFormData({
        code: '',
        title: '',
        filiereId: filieres[0]?.id || 'fil-1',
        parcoursId: '',
        level: 'L1',
        semester: 'S1',
        creditsEcts: 6,
        coefficient: 2,
        validationThreshold: 10.0,
      });
    }
  };

  const openEditUeModal = (ue: UniteEnseignement) => {
    setEditingUeId(ue.id);
    setUeFormData({
      code: ue.code,
      title: ue.title,
      filiereId: ue.filiereId,
      parcoursId: ue.parcoursId || '',
      level: ue.level,
      semester: ue.semester,
      creditsEcts: ue.creditsEcts,
      coefficient: ue.coefficient || ue.creditsEcts,
      validationThreshold: ue.validationThreshold,
    });
    setShowAddUeModal(true);
  };

  const handleCreateEc = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingEcId) {
      updateEc(editingEcId, {
        code: ecFormData.code.trim().toUpperCase(),
        title: ecFormData.title.trim(),
        semester: ecFormData.semester,
        creditsEcts: ecFormData.creditsEcts,
        coefficient: ecFormData.coefficient,
        hourlyVolume: ecFormData.hourlyVolume,
        teacherIds: ecFormData.teacherIds.filter(Boolean),
        groupIds: ecFormData.groupIds,
        quizWeight: ecFormData.quizWeight,
        examWeight: ecFormData.examWeight,
      });
      setShowAddEcModal(false);
      setEditingEcId(null);
      setSelectedUeForEc(null);
      return;
    }
    if (!selectedUeForEc) return;
    const res = addEc({
      ...ecFormData,
      ueId: selectedUeForEc.id,
      status: 'ACTIVE',
    });
    if (res.success) {
      setShowAddEcModal(false);
      setSelectedUeForEc(null);
      setEcFormData({
        code: '',
        title: '',
        semester: 'S1',
        creditsEcts: 3,
        coefficient: 1,
        hourlyVolume: 30,
        teacherIds: [],
        groupIds: [],
        quizWeight: 0.4,
        examWeight: 0.6,
      });
    }
  };

  const openEditEcModal = (ue: UniteEnseignement, ec: ElementConstitutif) => {
    setSelectedUeForEc(ue);
    setEditingEcId(ec.id);
    setEcFormData({
      code: ec.code,
      title: ec.title,
      semester: ec.semester,
      creditsEcts: ec.creditsEcts,
      coefficient: ec.coefficient || ec.creditsEcts,
      hourlyVolume: ec.hourlyVolume,
      teacherIds: ec.teacherIds || [],
      groupIds: ec.groupIds || [],
      quizWeight: ec.quizWeight ?? 0.4,
      examWeight: ec.examWeight ?? 0.6,
    });
    setShowAddEcModal(true);
  };

  const handleInscribeStudent = (e: React.FormEvent) => {
    e.preventDefault();
    setInscribeError('');
    if (!inscribeFormData.studentId) {
      setInscribeError('Veuillez sélectionner ou scanner un étudiant.');
      return;
    }
    const res = inscribeStudent(
      inscribeFormData.studentId,
      inscribeFormData.academicYear,
      inscribeFormData.filiereId,
      inscribeFormData.level,
      inscribeFormData.groupId,
      {
        parcoursId: inscribeFormData.parcoursId || undefined,
        inscriptionType: inscribeFormData.inscriptionType,
        academicStatus: inscribeFormData.academicStatus,
        documents: {
          cinOrBirthCert: inscribeFormData.cinOrBirthCert,
          baccOriginal: inscribeFormData.baccOriginal,
          photosId: inscribeFormData.photosId,
          medicalCert: inscribeFormData.medicalCert,
          financialClearance: inscribeFormData.financialClearance,
        },
      }
    );
    if (!res.success) {
      setInscribeError(res.error || 'Inscription refusée.');
      return;
    }
    setShowInscribeModal(false);
  };

  const handleCreateParcours = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingParcoursId) {
      updateParcours(editingParcoursId, {
        code: parcoursForm.code.trim().toUpperCase(),
        name: parcoursForm.name.trim(),
        filiereId: parcoursForm.filiereId,
        level: parcoursForm.level,
        description: parcoursForm.description.trim(),
      });
      setShowAddParcoursModal(false);
      setEditingParcoursId(null);
      return;
    }
    const res = addParcours({
      ...parcoursForm,
      status: 'ACTIVE',
    });
    if (res.success) {
      setShowAddParcoursModal(false);
      setParcoursForm({
        code: '',
        name: '',
        filiereId: filieres[0]?.id || 'fil-1',
        level: 'L1',
        description: '',
      });
    }
  };

  const teachers = users.filter((u) => u.role === 'TEACHER');
  const students = users.filter((u) => u.role === 'STUDENT');

  // RBAC Restriction: Maquette LMD ne doit pas être visible par les enseignants
  if (currentUser.role === 'TEACHER') {
    return (
      <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center space-y-3 max-w-lg mx-auto my-8 shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-base font-black text-slate-900">
          Accès restreint — Maquettes & Structure Académique LMD
        </h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          Conformément à la politique d’accès de l’EBM Institute, le module des Maquettes LMD est réservé à l’Administration, à la Direction Pédagogique, à la Scolarité et à la consultation étudiante par parcours.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wider">
              Référentiel Pédagogique LMD
            </span>
            <span className="text-xs text-slate-300">Norme ECTS EBM Institute</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Maquettes & Structure Académique LMD</h1>
          <p className="text-slate-300 text-sm mt-1">
            {isStudent
              ? 'Consultation de la maquette pédagogique LMD officielle correspondant exclusivement à votre formation d’inscription.'
              : "Gestion indépendante par année universitaire : Unités d'Enseignement (UE), Éléments Constitutifs (EC) et crédits ECTS."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Academic Year Switcher */}
          <div className="flex items-center bg-white/10 backdrop-blur-md rounded-xl p-1 border border-white/20">
            <Calendar className="w-4 h-4 text-blue-300 ml-2" />
            <select
              value={selectedAcademicYear}
              onChange={(e) => setSelectedAcademicYear(e.target.value)}
              className="bg-transparent text-white text-sm font-semibold px-2 py-1 outline-none cursor-pointer"
            >
              {academicYears.map((ay) => (
                <option key={ay.id} value={ay.code} className="bg-slate-900 text-white">
                  Année {ay.code} {ay.isCurrent ? '⭐ (En cours)' : ''}
                </option>
              ))}
            </select>
          </div>

          {isAcademicStaff && (
            <>
              <button
                onClick={() => setActiveTab('DOMAINES_MENTIONS')}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-md transition-all cursor-pointer active:scale-95"
              >
                <GraduationCap className="w-4 h-4" />
                + Domaine / Mention
              </button>
              <button
                onClick={() => setShowDuplicateModal(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-md transition-all cursor-pointer active:scale-95"
              >
                <Copy className="w-4 h-4" />
                Dupliquer la maquette
              </button>
              <button
                onClick={() => {
                  setEditingUeId(null);
                  setUeFormData({
                    code: '',
                    title: '',
                    filiereId: filieres[0]?.id || 'fil-1',
                    parcoursId: '',
                    level: 'L1',
                    semester: 'S1',
                    creditsEcts: 6,
                    coefficient: 6,
                    validationThreshold: 10.0,
                  });
                  setShowAddUeModal(true);
                }}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-md transition-all cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" />
                Nouvelle UE
              </button>
            </>
          )}
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap border-b border-slate-200 gap-1">
        <button
          onClick={() => setActiveTab('MAQUETTES')}
          className={`flex items-center gap-2 px-5 py-3 font-semibold text-xs sm:text-sm border-b-2 transition-colors cursor-pointer ${
            activeTab === 'MAQUETTES'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          Maquette UE / EC & ECTS ({filteredUes.length})
        </button>

        {!isStudent && (
          <button
            onClick={() => setActiveTab('DOMAINES_MENTIONS')}
            className={`flex items-center gap-2 px-5 py-3 font-semibold text-xs sm:text-sm border-b-2 transition-colors cursor-pointer ${
              activeTab === 'DOMAINES_MENTIONS'
                ? 'border-emerald-600 text-emerald-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            Domaines & Mentions ({domaines.length} / {filieres.length})
          </button>
        )}

        {!isStudent && (
          <button
            onClick={() => setActiveTab('PARCOURS')}
            className={`flex items-center gap-2 px-5 py-3 font-semibold text-xs sm:text-sm border-b-2 transition-colors cursor-pointer ${
              activeTab === 'PARCOURS'
                ? 'border-indigo-600 text-indigo-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Compass className="w-4 h-4" />
            Parcours & Spécialisations ({visibleParcours.length})
          </button>
        )}

        {!isStudent && (
          <button
            onClick={() => setActiveTab('RULES')}
            className={`flex items-center gap-2 px-5 py-3 font-semibold text-xs sm:text-sm border-b-2 transition-colors cursor-pointer ${
              activeTab === 'RULES'
                ? 'border-amber-600 text-amber-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sliders className="w-4 h-4" />
            Règles de Validation & Compensation
          </button>
        )}

        {!isStudent && (
          <button
            onClick={() => setActiveTab('INSCRIPTIONS')}
            className={`flex items-center gap-2 px-5 py-3 font-semibold text-xs sm:text-sm border-b-2 transition-colors cursor-pointer ${
              activeTab === 'INSCRIPTIONS'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            Inscriptions & Réinscriptions ({inscriptions.filter((i) => i.academicYear === selectedAcademicYear).length})
          </button>
        )}
      </div>

      {activeTab === 'MAQUETTES' && (
        <div className="space-y-6">
          {/* Filters Bar: Hiérarchie LMD complète Établissement → Domaine → Mention → Parcours → Niveau → Semestre (ACC-047 à ACC-054) */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <Layers className="w-4 h-4 text-blue-600" />
                <span>Hiérarchie LMD : EBM Institute → Domaine → Mention → Parcours → Niveau → Semestre (S1 à S10)</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {(['ALL', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10'] as const).map((sem) => (
                  <button
                    key={sem}
                    onClick={() => setSelectedSemester(sem)}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                      selectedSemester === sem
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {sem === 'ALL' ? 'Tous (S1–S10)' : sem}
                  </button>
                ))}
              </div>
            </div>

            {isStudent ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase text-slate-500 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-blue-600" />
                  Votre Maquette LMD d'inscription :
                </span>
                <span className="bg-blue-50 text-blue-800 border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-bold">
                  {filieres.find((f) => f.id === studentFiliereId)?.domaine || 'Sciences & Technologies'} •{' '}
                  {filieres.find((f) => f.id === studentFiliereId)?.name || 'Informatique'} • Niveau {studentLevel || 'L1'} ({myGroup?.code || 'Groupe inscrit'})
                </span>
                {studentParcoursId && (
                  <span className="bg-indigo-50 text-indigo-800 border border-indigo-200 px-3 py-1.5 rounded-lg text-xs font-bold">
                    Parcours : {parcours.find((p) => p.id === studentParcoursId)?.name || studentParcoursId}
                  </span>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Domaine LMD</label>
                  <select
                    value={selectedDomaine}
                    onChange={(e) => setSelectedDomaine(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-800 font-semibold rounded-lg px-2.5 py-1.5 outline-none"
                  >
                    <option value="ALL">Tous les Domaines</option>
                    {Array.from(new Set([...domaines, ...filieres.map((f) => f.domaine || 'Sciences et Technologies')])).map((dom) => (
                      <option key={dom} value={dom}>
                        {dom}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Mention (Filière)</label>
                  <select
                    value={selectedFiliere}
                    onChange={(e) => setSelectedFiliere(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-800 font-semibold rounded-lg px-2.5 py-1.5 outline-none"
                  >
                    <option value="ALL">Toutes les Mentions</option>
                    {filieres
                      .filter((f) => selectedDomaine === 'ALL' || (f.domaine || 'Sciences et Technologies') === selectedDomaine)
                      .map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.code} — {f.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Parcours</label>
                  <select
                    value={selectedParcoursFilter}
                    onChange={(e) => setSelectedParcoursFilter(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-800 font-semibold rounded-lg px-2.5 py-1.5 outline-none"
                  >
                    <option value="ALL">Tous les Parcours / Tronc commun</option>
                    {parcours
                      .filter((p) => selectedFiliere === 'ALL' || p.filiereId === selectedFiliere)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.code} — {p.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Niveau d'étude</label>
                  <select
                    value={selectedLevelFilter}
                    onChange={(e) => setSelectedLevelFilter(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-800 font-semibold rounded-lg px-2.5 py-1.5 outline-none"
                  >
                    <option value="ALL">Tous Niveaux (L1–M2)</option>
                    {['L1', 'L2', 'L3', 'M1', 'M2'].map((lvl) => (
                      <option key={lvl} value={lvl}>
                        Niveau {lvl} ({lvl.startsWith('L') ? 'Cycle Licence S1–S6' : 'Cycle Master S7–S10'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* List of UEs & Child ECs */}
          <div className="space-y-4">
            {filteredUes.length === 0 ? (
              <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center text-slate-500">
                <BookOpen className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <h3 className="font-semibold text-slate-700">Aucune Unité d'Enseignement pour cette sélection</h3>
                <p className="text-sm mt-1 max-w-md mx-auto">
                  La maquette pour l’année {selectedAcademicYear} ne comporte pas encore d'UEs dans cette catégorie. Vous pouvez en créer une ou dupliquer l'année précédente.
                </p>
                {isAcademicStaff && (
                  <button
                    onClick={() => setShowAddUeModal(true)}
                    className="mt-4 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg"
                  >
                    <Plus className="w-4 h-4" />
                    Créer la première UE
                  </button>
                )}
              </div>
            ) : (
              filteredUes.map((ue) => {
                const filiere = filieres.find((f) => f.id === ue.filiereId);
                const ueParc = parcours.find((p) => p.id === ue.parcoursId);
                const childEcs = ecs.filter((ec) => ec.ueId === ue.id || ue.ecIds.includes(ec.id));

                return (
                  <div
                    key={ue.id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:border-blue-300 transition-all"
                  >
                    {/* UE Header */}
                    <div className="bg-slate-50 p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex items-start md:items-center gap-3">
                        <span className="bg-blue-600 text-white text-xs font-bold px-2.5 py-1 rounded-md shadow-sm">
                          {ue.code}
                        </span>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-slate-800 text-base">{ue.title}</h3>
                            <span className="text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded">
                              {ue.semester}
                            </span>
                            {ueParc && (
                              <span className="text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded">
                                Parcours : {ueParc.code}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Domaine : {filiere?.domaine || 'Sciences et Technologies'} • Mention : {filiere?.code} ({ue.level}) • Seuil : {ue.validationThreshold}/20
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-xs uppercase font-semibold text-slate-400 block">Crédits ECTS</span>
                          <span className="text-sm font-extrabold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                            {ue.creditsEcts} ECTS
                          </span>
                        </div>

                        {isAcademicStaff && (
                          <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
                            <button
                              onClick={() => openEditUeModal(ue)}
                              className="text-xs flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold px-2.5 py-1.5 rounded-lg border border-blue-200 transition-colors cursor-pointer"
                              title="Modifier cette Unité d'Enseignement"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              Modifier UE
                            </button>
                            <button
                              onClick={() => {
                                setEditingEcId(null);
                                setSelectedUeForEc(ue);
                                setEcFormData({
                                  code: '',
                                  title: '',
                                  semester: ue.semester,
                                  creditsEcts: 3,
                                  coefficient: 3,
                                  hourlyVolume: 30,
                                  teacherIds: [],
                                  groupIds: [],
                                  quizWeight: 0.4,
                                  examWeight: 0.6,
                                });
                                setShowAddEcModal(true);
                              }}
                              className="text-xs flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold px-2.5 py-1.5 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
                              title="Ajouter un élément constitutif"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Ajouter EC
                            </button>
                            <button
                              onClick={() => deleteUe(ue.id)}
                              className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Supprimer cette UE"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Child ECs Table */}
                    <div className="p-4">
                      {childEcs.length === 0 ? (
                        <div className="py-4 text-center text-xs text-slate-400 italic">
                          Aucun Élément Constitutif (EC) rattaché à cette UE. Cliquez sur "Ajouter EC" pour en définir un.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                <th className="py-2 px-3">Code & Intitulé EC</th>
                                <th className="py-2 px-3">Enseignant(s)</th>
                                <th className="py-2 px-3">Groupes</th>
                                <th className="py-2 px-3 text-center">Volume</th>
                                <th className="py-2 px-3 text-center">Crédits</th>
                                <th className="py-2 px-3 text-center">Pondération LMD</th>
                                {isAcademicStaff && <th className="py-2 px-3 text-right">Actions</th>}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs">
                              {childEcs.map((ec) => {
                                const ecTeachers = teachers.filter((t) => ec.teacherIds.includes(t.id));
                                const ecGroups = groups.filter((g) => ec.groupIds.includes(g.id));

                                return (
                                  <tr key={ec.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="py-3 px-3">
                                      <div className="font-semibold text-slate-800">{ec.title}</div>
                                      <span className="text-[10px] text-slate-400 font-mono">{ec.code}</span>
                                    </td>
                                    <td className="py-3 px-3">
                                      {ecTeachers.length > 0 ? (
                                        <div className="flex flex-col gap-0.5">
                                          {ecTeachers.map((t) => (
                                            <span key={t.id} className="text-slate-700 font-medium">
                                              {t.name}
                                            </span>
                                          ))}
                                        </div>
                                      ) : (
                                        <span className="text-slate-400 italic">À assigner</span>
                                      )}
                                    </td>
                                    <td className="py-3 px-3">
                                      {ecGroups.length > 0 ? (
                                        <div className="flex flex-wrap gap-1">
                                          {ecGroups.map((g) => (
                                            <span
                                              key={g.id}
                                              className="bg-slate-100 text-slate-700 font-mono text-[10px] px-1.5 py-0.5 rounded"
                                            >
                                              {g.code}
                                            </span>
                                          ))}
                                        </div>
                                      ) : (
                                        <span className="text-slate-400 italic">Tous</span>
                                      )}
                                    </td>
                                    <td className="py-3 px-3 text-center font-bold text-slate-700">
                                      {ec.hourlyVolume}h
                                    </td>
                                    <td className="py-3 px-3 text-center">
                                      <span className="bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded border border-indigo-200">
                                        {ec.creditsEcts} ECTS
                                      </span>
                                    </td>
                                    <td className="py-3 px-3 text-center">
                                      <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 font-bold px-2 py-0.5 rounded text-[11px] border border-amber-200">
                                        Quiz {Math.round(ec.quizWeight * 100)}% + Examen {Math.round(ec.examWeight * 100)}%
                                      </span>
                                    </td>
                                    {isAcademicStaff && (
                                      <td className="py-3 px-3 text-right">
                                        <div className="inline-flex items-center gap-1">
                                          <button
                                            onClick={() => openEditEcModal(ue, ec)}
                                            className="text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-lg transition-colors inline-flex items-center gap-1 font-semibold cursor-pointer"
                                            title="Modifier cet EC"
                                          >
                                            <Edit2 className="w-3.5 h-3.5" />
                                            <span>Modifier</span>
                                          </button>
                                          <button
                                            onClick={() => deleteEc(ec.id)}
                                            className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors cursor-pointer"
                                            title="Supprimer cet EC"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </td>
                                    )}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB: DOMAINES & MENTIONS (FILIÈRES) */}
      {activeTab === 'DOMAINES_MENTIONS' && (
        <div className="space-y-6">
          {domaineFeedback && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{domaineFeedback}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. GESTION DES DOMAINES LMD */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  Niveau 1 LMD
                </span>
                <h2 className="text-base font-bold text-slate-900 mt-1">
                  Domaines de Formation LMD ({domaines.length})
                </h2>
                <p className="text-xs text-slate-500">
                  Ex: Sciences et Technologies, Sciences de la Société, Économie et Gestion, Sciences de l'Ingénieur...
                </p>
              </div>

              {isAcademicStaff && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const res = addDomaine(newDomaineInput);
                    if (res.success) {
                      setDomaineFeedback(`Domaine "${newDomaineInput}" ajouté avec succès !`);
                      setNewDomaineInput('');
                      setTimeout(() => setDomaineFeedback(null), 3500);
                    } else if (res.error) {
                      setDomaineFeedback(res.error);
                    }
                  }}
                  className="flex gap-2 text-xs"
                >
                  <input
                    type="text"
                    required
                    value={newDomaineInput}
                    onChange={(e) => setNewDomaineInput(e.target.value)}
                    placeholder="Intitulé du nouveau Domaine LMD..."
                    className="flex-1 p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter Domaine
                  </button>
                </form>
              )}

              <div className="space-y-2">
                {domaines.map((dom) => {
                  const mentionsCount = filieres.filter((f) => (f.domaine || 'Sciences et Technologies') === dom).length;
                  const isEditingThisDom = editingDomaineName === dom;
                  return (
                    <div
                      key={dom}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-2 text-xs"
                    >
                      {isEditingThisDom ? (
                        <div className="flex-1 flex items-center gap-2">
                          <input
                            type="text"
                            value={editingDomaineValue}
                            onChange={(e) => setEditingDomaineValue(e.target.value)}
                            className="flex-1 p-1.5 bg-white border border-blue-400 rounded-lg font-bold text-slate-900"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const res = updateDomaine(dom, editingDomaineValue);
                              if (res.success) {
                                setDomaineFeedback(`Domaine "${dom}" renommé en "${editingDomaineValue.trim()}" !`);
                                setEditingDomaineName(null);
                                setTimeout(() => setDomaineFeedback(null), 3500);
                              } else if (res.error) {
                                setDomaineFeedback(res.error);
                              }
                            }}
                            className="px-2.5 py-1.5 bg-blue-600 text-white font-bold rounded-lg cursor-pointer"
                          >
                            Enregistrer
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingDomaineName(null)}
                            className="px-2 py-1.5 bg-slate-200 text-slate-700 font-semibold rounded-lg cursor-pointer"
                          >
                            Annuler
                          </button>
                        </div>
                      ) : (
                        <>
                          <div>
                            <div className="font-bold text-slate-900">{dom}</div>
                            <span className="text-[11px] text-slate-500">{mentionsCount} Mention(s) rattachée(s)</span>
                          </div>
                          {isAcademicStaff && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingDomaineName(dom);
                                  setEditingDomaineValue(dom);
                                }}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                                title="Modifier ce domaine"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              {domaines.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => deleteDomaine(dom)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                                  title="Supprimer ce domaine"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. GESTION DES MENTIONS / FILIÈRES */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <span className="text-[10px] font-black uppercase text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                  Niveau 2 LMD
                </span>
                <h2 className="text-base font-bold text-slate-900 mt-1">
                  Mentions / Filières Universitaires ({filieres.length})
                </h2>
                <p className="text-xs text-slate-500">
                  Créez ou modifiez une Mention rattachée à un Domaine LMD (ex: INFO, GEST, DROIT, BTP...).
                </p>
              </div>

              {isAcademicStaff && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (editingFiliereId) {
                      updateFiliere(editingFiliereId, {
                        code: newMentionForm.code.trim().toUpperCase(),
                        name: newMentionForm.name.trim(),
                        domaine: newMentionForm.domaine,
                        department: newMentionForm.department.trim(),
                      });
                      setDomaineFeedback(`Mention "${newMentionForm.code.toUpperCase()} — ${newMentionForm.name}" mise à jour avec succès !`);
                      setEditingFiliereId(null);
                      setNewMentionForm({
                        code: '',
                        name: '',
                        domaine: domaines[0] || 'Sciences et Technologies',
                        department: 'Pôle Technologies & Sciences',
                      });
                      setTimeout(() => setDomaineFeedback(null), 3500);
                      return;
                    }
                    const res = addFiliere({
                      code: newMentionForm.code.trim().toUpperCase(),
                      name: newMentionForm.name.trim(),
                      domaine: newMentionForm.domaine,
                      department: newMentionForm.department.trim(),
                    });
                    if (res.success) {
                      setDomaineFeedback(`Mention "${newMentionForm.code.toUpperCase()} — ${newMentionForm.name}" créée avec succès !`);
                      setNewMentionForm({
                        ...newMentionForm,
                        code: '',
                        name: '',
                      });
                      setTimeout(() => setDomaineFeedback(null), 3500);
                    } else if (res.error) {
                      setDomaineFeedback(res.error);
                    }
                  }}
                  className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Domaine LMD de rattachement *</label>
                      <select
                        value={newMentionForm.domaine}
                        onChange={(e) => setNewMentionForm({ ...newMentionForm, domaine: e.target.value })}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg font-semibold"
                      >
                        {domaines.map((dom) => (
                          <option key={dom} value={dom}>
                            {dom}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Code Mention * (ex: INFO, GEST)</label>
                      <input
                        type="text"
                        required
                        value={newMentionForm.code}
                        onChange={(e) => setNewMentionForm({ ...newMentionForm, code: e.target.value })}
                        placeholder="ex: TELECOM"
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold uppercase"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Intitulé complet de la Mention *</label>
                      <input
                        type="text"
                        required
                        value={newMentionForm.name}
                        onChange={(e) => setNewMentionForm({ ...newMentionForm, name: e.target.value })}
                        placeholder="ex: Télécommunications & Réseaux"
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Département / Pôle *</label>
                      <input
                        type="text"
                        required
                        value={newMentionForm.department}
                        onChange={(e) => setNewMentionForm({ ...newMentionForm, department: e.target.value })}
                        placeholder="ex: Pôle Sciences & Ingénierie"
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {editingFiliereId ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      {editingFiliereId ? 'Enregistrer les modifications de la Mention' : 'Enregistrer la nouvelle Mention (Filière)'}
                    </button>
                    {editingFiliereId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingFiliereId(null);
                          setNewMentionForm({
                            code: '',
                            name: '',
                            domaine: domaines[0] || 'Sciences et Technologies',
                            department: 'Pôle Technologies & Sciences',
                          });
                        }}
                        className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl cursor-pointer"
                      >
                        Annuler
                      </button>
                    )}
                  </div>
                </form>
              )}

              <div className="space-y-2 max-h-72 overflow-y-auto">
                {filieres.map((f) => (
                  <div
                    key={f.id}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded text-[10px]">
                          {f.code}
                        </span>
                        <span className="font-bold text-slate-900">{f.name}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Domaine : <strong>{f.domaine || 'Sciences et Technologies'}</strong> • {f.department}
                      </div>
                    </div>
                    {isAcademicStaff && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingFiliereId(f.id);
                            setNewMentionForm({
                              code: f.code,
                              name: f.name,
                              domaine: f.domaine || domaines[0] || 'Sciences et Technologies',
                              department: f.department,
                            });
                          }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                          title="Modifier cette mention"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteFiliere(f.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                          title="Supprimer cette mention"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: PARCOURS & SPÉCIALISATIONS */}
      {activeTab === 'PARCOURS' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-slate-800 text-sm">
                Parcours & Spécialisations par Formation et Niveau
              </h2>
              <p className="text-xs text-slate-500">
                Configuration 100 % dynamique sans modification du code source.
              </p>
            </div>
            {isAcademicStaff && (
              <button
                type="button"
                onClick={() => {
                  setEditingParcoursId(null);
                  setParcoursForm({
                    code: '',
                    name: '',
                    filiereId: filieres[0]?.id || 'fil-1',
                    level: 'L1',
                    description: '',
                  });
                  setShowAddParcoursModal(true);
                }}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Nouveau Parcours
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleParcours.map((parc) => {
              const fil = filieres.find((f) => f.id === parc.filiereId);
              return (
                <div
                  key={parc.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between gap-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded font-mono text-xs font-bold">
                        {parc.code}
                      </span>
                      <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        Niveau {parc.level}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm">{parc.name}</h3>
                    <p className="text-xs text-blue-700 font-semibold">
                      Mention : {fil?.name || parc.filiereId}
                    </p>
                    {parc.description && (
                      <p className="text-xs text-slate-500 leading-relaxed">{parc.description}</p>
                    )}
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                      {parc.status === 'ACTIVE' ? 'Actif' : 'Archivé'}
                    </span>
                    {isAcademicStaff && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingParcoursId(parc.id);
                            setParcoursForm({
                              code: parc.code,
                              name: parc.name,
                              filiereId: parc.filiereId,
                              level: parc.level,
                              description: parc.description || '',
                            });
                            setShowAddParcoursModal(true);
                          }}
                          className="text-blue-600 hover:bg-blue-50 px-2 py-1 rounded flex items-center gap-1 font-semibold cursor-pointer"
                          title="Modifier ce parcours"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Modifier</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteParcours(parc.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded cursor-pointer"
                          title="Supprimer ce parcours"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB: RÈGLES DE VALIDATION & COMPENSATION LMD */}
      {activeTab === 'RULES' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 text-base">
                  Paramétrage des Règles de Validation, Compensation & Passage ({selectedAcademicYear})
                </h2>
                <p className="text-xs text-slate-500">
                  Modifiez les seuils, notes éliminatoires et règles de compensation LMD sans toucher au code source.
                </p>
              </div>
            </div>
            {rulesSavedNotice && (
              <span className="px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                {rulesSavedNotice}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <label className="font-bold text-slate-800 block">Seuil de validation d'une UE (/20)</label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="20"
                value={activeRules.uePassingScore}
                onChange={(e) => {
                  updateAcademicRules(selectedAcademicYear, { uePassingScore: Number(e.target.value) });
                  setRulesSavedNotice('Règle enregistrée');
                }}
                className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold text-sm text-blue-700"
              />
              <span className="text-[11px] text-slate-500 block">Moyenne requise pour acquérir les crédits ECTS de l'UE.</span>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <label className="font-bold text-slate-800 block">Seuil de validation d'un EC (/20)</label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="20"
                value={activeRules.ecPassingScore}
                onChange={(e) => {
                  updateAcademicRules(selectedAcademicYear, { ecPassingScore: Number(e.target.value) });
                  setRulesSavedNotice('Règle enregistrée');
                }}
                className="w-full p-4 sm:p-2 bg-white border border-slate-300 rounded-lg font-bold text-sm text-indigo-700"
              />
              <span className="text-[11px] text-slate-500 block">Moyenne minimale pour valider une matière sans rattrapage.</span>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <label className="font-bold text-slate-800 block">Note plancher / éliminatoire (/20)</label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="20"
                value={activeRules.eliminatoryScore}
                onChange={(e) => {
                  updateAcademicRules(selectedAcademicYear, { eliminatoryScore: Number(e.target.value) });
                  setRulesSavedNotice('Règle enregistrée');
                }}
                className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold text-sm text-rose-700"
              />
              <span className="text-[11px] text-slate-500 block">En dessous de cette note, la compensation automatique est bloquée.</span>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <label className="font-bold text-slate-800 block">Crédits ECTS requis — Admis direct</label>
              <input
                type="number"
                min="1"
                max="60"
                value={activeRules.creditsForDirectPass}
                onChange={(e) => {
                  updateAcademicRules(selectedAcademicYear, { creditsForDirectPass: Number(e.target.value) });
                  setRulesSavedNotice('Règle enregistrée');
                }}
                className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold text-sm text-emerald-700"
              />
              <span className="text-[11px] text-slate-500 block">Norme LMD annuelle : 60 ECTS (30 ECTS par semestre).</span>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <label className="font-bold text-slate-800 block">Crédits ECTS min. — Passage conditionnel</label>
              <input
                type="number"
                min="1"
                max="60"
                value={activeRules.minCreditsForConditionalPass}
                onChange={(e) => {
                  updateAcademicRules(selectedAcademicYear, { minCreditsForConditionalPass: Number(e.target.value) });
                  setRulesSavedNotice('Règle enregistrée');
                }}
                className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold text-sm text-amber-700"
              />
              <span className="text-[11px] text-slate-500 block">Autorise le passage en année supérieure avec dette d'UE (ex: 45 ECTS).</span>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
              <label className="font-bold text-slate-800 block">Options de Compensation & Quitus</label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activeRules.allowIntraUeCompensation}
                  onChange={(e) => {
                    updateAcademicRules(selectedAcademicYear, { allowIntraUeCompensation: e.target.checked });
                    setRulesSavedNotice('Règle enregistrée');
                  }}
                />
                <span>Autoriser la compensation intra-UE (entre EC)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activeRules.allowInterUeCompensation}
                  onChange={(e) => {
                    updateAcademicRules(selectedAcademicYear, { allowInterUeCompensation: e.target.checked });
                    setRulesSavedNotice('Règle enregistrée');
                  }}
                />
                <span>Autoriser la compensation inter-UE (semestrielle)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activeRules.blockTranscriptIfUnpaid}
                  onChange={(e) => {
                    updateAcademicRules(selectedAcademicYear, { blockTranscriptIfUnpaid: e.target.checked });
                    setRulesSavedNotice('Règle enregistrée');
                  }}
                />
                <span>Exiger le quitus financier pour éditer le relevé officiel</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'INSCRIPTIONS' && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-slate-800 text-sm">
                Gestion des Inscriptions & Réinscriptions Annuelles ({selectedAcademicYear})
              </h2>
              <p className="text-xs text-slate-500">
                Suivi administratif complet : affectation Mention, Niveau, Parcours, Groupe et contrôle des pièces du dossier.
              </p>
            </div>
            {isAcademicStaff && (
              <button
                onClick={() => setShowInscribeModal(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Nouvelle Inscription / Réinscription
              </button>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Matricule</th>
                    <th className="py-3 px-4">Étudiant</th>
                    <th className="py-3 px-4">Type & Régime</th>
                    <th className="py-3 px-4">Mention / Niveau / Parcours</th>
                    <th className="py-3 px-4">Groupe</th>
                    <th className="py-3 px-4">Dossier Administratif</th>
                    <th className="py-3 px-4 text-center">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inscriptions.map((insc) => {
                    const st = students.find((s) => s.id === insc.studentId);
                    const grp = groups.find((g) => g.id === insc.groupId);
                    const fil = filieres.find((f) => f.id === insc.filiereId);
                    const parc = parcours.find((p) => p.id === insc.parcoursId);

                    return (
                      <tr key={insc.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-mono font-bold text-blue-600">
                          {st?.matricule || 'N/A'}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          {st?.name || 'Étudiant'}
                          <span className="block text-[10px] text-slate-400 font-normal">
                            Année {insc.academicYear} • {insc.inscriptionDate}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                              insc.inscriptionType === 'REINSCRIPTION'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}
                          >
                            {insc.inscriptionType || 'INSCRIPTION'}
                          </span>
                          <span className="block text-[10px] text-slate-500 mt-0.5 font-semibold">
                            {insc.academicStatus || 'PASSANT'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          <span className="font-bold">{fil?.code} — {insc.level}</span>
                          {parc && (
                            <span className="block text-[10px] text-indigo-600 font-semibold">
                              Parcours : {parc.code}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-700">
                          {grp?.code || insc.groupId}
                        </td>
                        <td className="py-3 px-4">
                          {insc.dossierComplete !== false ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                              <ShieldCheck className="w-3.5 h-3.5" /> Dossier Complet
                            </span>
                          ) : (
                            <span className="text-amber-700 font-semibold text-[11px]">
                              Pièces en attente
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-2 py-0.5 rounded-full text-[10px]">
                            {insc.status}
                          </span>
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

      {/* Modal: Duplication de Maquette */}
      {showDuplicateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                <Copy className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Dupliquer la Maquette LMD</h3>
                <p className="text-xs text-slate-500">
                  Report automatique des UEs, ECs et crédits ECTS vers une nouvelle année universitaire.
                </p>
              </div>
            </div>

            {duplicateSuccessMsg ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <p className="text-sm font-bold">{duplicateSuccessMsg}</p>
                <p className="text-xs text-emerald-600">Redirection vers la nouvelle année...</p>
              </div>
            ) : (
              <>
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Année Source (Modèle existant) :</label>
                    <select
                      value={sourceYear}
                      onChange={(e) => setSourceYear(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 font-medium"
                    >
                      {academicYears.map((ay) => (
                        <option key={ay.id} value={ay.code}>
                          {ay.name} ({ay.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex justify-center text-slate-400 py-1">
                    <ArrowRight className="w-5 h-5 transform rotate-90 md:rotate-0" />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Année Cible (Nouvelle maquette) :</label>
                    <input
                      type="text"
                      value={targetYear}
                      onChange={(e) => setTargetYear(e.target.value)}
                      placeholder="ex: 2027-2028"
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 font-bold text-blue-600"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Une copie intégrale de toutes les UEs et ECs de l'année source sera générée avec de nouveaux identifiants indépendants.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setShowDuplicateModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleDuplicate}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    Lancer la duplication
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal: Créer UE */}
      {showAddUeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateUe}
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  {editingUeId ? "Modifier l'Unité d'Enseignement (UE)" : "Nouvelle Unité d'Enseignement (UE)"}
                </h3>
                <p className="text-xs text-slate-500">Année universitaire : {selectedAcademicYear}</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Code UE (ex: UE-INFO-104)</label>
                  <input
                    type="text"
                    required
                    value={ueFormData.code}
                    onChange={(e) => setUeFormData({ ...ueFormData, code: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 font-mono"
                    placeholder="UE-INFO-104"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Semestre (S1 à S10)</label>
                  <select
                    value={ueFormData.semester}
                    onChange={(e) => setUeFormData({ ...ueFormData, semester: e.target.value as SemesterCode })}
                    className="w-full border border-slate-300 rounded-lg p-2 font-bold"
                  >
                    <optgroup label="Cycle Licence (S1 à S6)">
                      <option value="S1">Semestre 1 (S1 - L1)</option>
                      <option value="S2">Semestre 2 (S2 - L1)</option>
                      <option value="S3">Semestre 3 (S3 - L2)</option>
                      <option value="S4">Semestre 4 (S4 - L2)</option>
                      <option value="S5">Semestre 5 (S5 - L3)</option>
                      <option value="S6">Semestre 6 (S6 - L3)</option>
                    </optgroup>
                    <optgroup label="Cycle Master (S7 à S10)">
                      <option value="S7">Semestre 7 (S7 - M1)</option>
                      <option value="S8">Semestre 8 (S8 - M1)</option>
                      <option value="S9">Semestre 9 (S9 - M2)</option>
                      <option value="S10">Semestre 10 (S10 - M2)</option>
                    </optgroup>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Intitulé de l'UE</label>
                <input
                  type="text"
                  required
                  value={ueFormData.title}
                  onChange={(e) => setUeFormData({ ...ueFormData, title: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2"
                  placeholder="ex: Conception Orientée Objet & Modélisation UML"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Mention (Filière)</label>
                  <select
                    value={ueFormData.filiereId}
                    onChange={(e) => setUeFormData({ ...ueFormData, filiereId: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2"
                  >
                    {filieres.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.code} - {f.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Parcours</label>
                  <select
                    value={ueFormData.parcoursId}
                    onChange={(e) => setUeFormData({ ...ueFormData, parcoursId: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2"
                  >
                    <option value="">Tronc commun</option>
                    {parcours
                      .filter((p) => p.filiereId === ueFormData.filiereId)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.code} — {p.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Niveau</label>
                  <select
                    value={ueFormData.level}
                    onChange={(e) => setUeFormData({ ...ueFormData, level: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 font-bold"
                  >
                    <option value="L1">Licence 1 (L1)</option>
                    <option value="L2">Licence 2 (L2)</option>
                    <option value="L3">Licence 3 (L3)</option>
                    <option value="M1">Master 1 (M1)</option>
                    <option value="M2">Master 2 (M2)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Crédits ECTS</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    required
                    value={ueFormData.creditsEcts}
                    onChange={(e) => setUeFormData({ ...ueFormData, creditsEcts: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-lg p-2 font-bold text-blue-600"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Seuil de validation (/20)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="20"
                    required
                    value={ueFormData.validationThreshold}
                    onChange={(e) => setUeFormData({ ...ueFormData, validationThreshold: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-lg p-2 font-bold text-slate-700"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddUeModal(false);
                  setEditingUeId(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md cursor-pointer"
              >
                {editingUeId ? 'Enregistrer les modifications' : "Créer l'UE"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Créer ou Modifier EC */}
      {showAddEcModal && selectedUeForEc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleCreateEc}
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-6"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                {editingEcId ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  {editingEcId ? "Modifier l'Élément Constitutif (EC)" : "Ajouter un Élément Constitutif (EC)"}
                </h3>
                <p className="text-xs text-slate-500">Rattaché à : {selectedUeForEc.code} ({selectedUeForEc.title})</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Code EC (ex: EC-UML-1)</label>
                  <input
                    type="text"
                    required
                    value={ecFormData.code}
                    onChange={(e) => setEcFormData({ ...ecFormData, code: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 font-mono"
                    placeholder="EC-UML-1"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Volume Horaire (heures)</label>
                  <input
                    type="number"
                    min="1"
                    max="150"
                    required
                    value={ecFormData.hourlyVolume}
                    onChange={(e) => setEcFormData({ ...ecFormData, hourlyVolume: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-lg p-2 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Intitulé de l'élément</label>
                <input
                  type="text"
                  required
                  value={ecFormData.title}
                  onChange={(e) => setEcFormData({ ...ecFormData, title: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2"
                  placeholder="ex: Diagrammes de classes & Design Patterns"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Crédits ECTS</label>
                  <input
                    type="number"
                    min="1"
                    max="15"
                    required
                    value={ecFormData.creditsEcts}
                    onChange={(e) => setEcFormData({ ...ecFormData, creditsEcts: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-lg p-2 font-bold text-blue-600"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Enseignant Responsable</label>
                  <select
                    value={ecFormData.teacherIds[0] || ''}
                    onChange={(e) => setEcFormData({ ...ecFormData, teacherIds: e.target.value ? [e.target.value] : [] })}
                    className="w-full border border-slate-300 rounded-lg p-2"
                  >
                    <option value="">Sélectionner un enseignant</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Groupes concernés</label>
                <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                  {groups.map((grp) => {
                    const isChecked = ecFormData.groupIds.includes(grp.id);
                    return (
                      <label
                        key={grp.id}
                        className={`px-2 py-1 rounded border text-[11px] font-semibold cursor-pointer flex items-center gap-1 ${
                          isChecked
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-700 border-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={isChecked}
                          onChange={() => {
                            const next = isChecked
                              ? ecFormData.groupIds.filter((id) => id !== grp.id)
                              : [...ecFormData.groupIds, grp.id];
                            setEcFormData({ ...ecFormData, groupIds: next });
                          }}
                        />
                        {grp.code}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Pondération d'Évaluation LMD Officielle (Modifiable) */}
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200">
                <span className="font-bold text-amber-900 block mb-1.5">Pondération d'Évaluation LMD</span>
                <div className="grid grid-cols-2 gap-3 text-amber-900">
                  <div>
                    <label className="text-[11px] font-semibold block mb-1">Quiz / Contrôle continu (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="5"
                      value={Math.round(ecFormData.quizWeight * 100)}
                      onChange={(e) => {
                        const qPct = Math.min(100, Math.max(0, Number(e.target.value)));
                        setEcFormData({
                          ...ecFormData,
                          quizWeight: Number((qPct / 100).toFixed(2)),
                          examWeight: Number(((100 - qPct) / 100).toFixed(2)),
                        });
                      }}
                      className="w-full bg-white px-2.5 py-1.5 rounded-lg border border-amber-300 font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold block mb-1">Examen final (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="5"
                      value={Math.round(ecFormData.examWeight * 100)}
                      onChange={(e) => {
                        const exPct = Math.min(100, Math.max(0, Number(e.target.value)));
                        setEcFormData({
                          ...ecFormData,
                          examWeight: Number((exPct / 100).toFixed(2)),
                          quizWeight: Number(((100 - exPct) / 100).toFixed(2)),
                        });
                      }}
                      className="w-full bg-white px-2.5 py-1.5 rounded-lg border border-amber-300 font-bold"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddEcModal(false);
                  setEditingEcId(null);
                  setSelectedUeForEc(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md cursor-pointer"
              >
                {editingEcId ? 'Enregistrer les modifications' : "Ajouter l'EC"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Créer ou Modifier Parcours */}
      {showAddParcoursModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateParcours}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4"
          >
            <h3 className="text-lg font-bold text-slate-800">
              {editingParcoursId ? 'Modifier le Parcours Académique' : 'Nouveau Parcours Académique'}
            </h3>
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Code Parcours *</label>
                  <input
                    type="text"
                    required
                    value={parcoursForm.code}
                    onChange={(e) => setParcoursForm({ ...parcoursForm, code: e.target.value })}
                    placeholder="PARC-DEV"
                    className="w-full border border-slate-300 rounded-lg p-2 font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Niveau *</label>
                  <select
                    value={parcoursForm.level}
                    onChange={(e) => setParcoursForm({ ...parcoursForm, level: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 font-bold"
                  >
                    {['L1', 'L2', 'L3', 'M1', 'M2'].map((lvl) => (
                      <option key={lvl} value={lvl}>{lvl}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Intitulé du Parcours *</label>
                <input
                  type="text"
                  required
                  value={parcoursForm.name}
                  onChange={(e) => setParcoursForm({ ...parcoursForm, name: e.target.value })}
                  placeholder="ex: Ingénierie Logicielle & Cloud"
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Mention / Formation de rattachement</label>
                <select
                  value={parcoursForm.filiereId}
                  onChange={(e) => setParcoursForm({ ...parcoursForm, filiereId: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2"
                >
                  {filieres.map((f) => (
                    <option key={f.id} value={f.id}>{f.code} - {f.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={parcoursForm.description}
                  onChange={(e) => setParcoursForm({ ...parcoursForm, description: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddParcoursModal(false);
                  setEditingParcoursId(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl cursor-pointer"
              >
                {editingParcoursId ? 'Enregistrer les modifications' : 'Enregistrer le Parcours'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Inscrire / Réinscrire Étudiant (ACC-014 à ACC-018) */}
      {showInscribeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleInscribeStudent}
            className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-6"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Inscription & Réinscription Officielle</h3>
                <p className="text-xs text-slate-500">
                  Année universitaire : {selectedAcademicYear} • Identification par Matricule, Nom, Prénom, Code-barres ou QR Code
                </p>
              </div>
            </div>

            {inscribeError && (
              <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs font-bold text-rose-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{inscribeError}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              {/* Recherche & Scan Étudiant Universel (ACC-014, ACC-015, ACC-016, ACC-018) */}
              <UniversalStudentSelector
                selectedStudentId={inscribeFormData.studentId}
                onSelectStudent={(stId) => {
                  setInscribeError('');
                  setInscribeFormData((prev) => ({ ...prev, studentId: stId }));
                }}
                label="Étudiant à inscrire / réinscrire (Matricule, Nom, Prénom, Liste, Code-barres ou QR)"
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Type d'opération</label>
                  <select
                    value={inscribeFormData.inscriptionType}
                    onChange={(e) =>
                      setInscribeFormData({
                        ...inscribeFormData,
                        inscriptionType: e.target.value as 'INSCRIPTION' | 'REINSCRIPTION',
                      })
                    }
                    className="w-full border border-slate-300 rounded-lg p-2 font-bold"
                  >
                    <option value="INSCRIPTION">1ère Inscription</option>
                    <option value="REINSCRIPTION">Réinscription Annuelle</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Statut Académique</label>
                  <select
                    value={inscribeFormData.academicStatus}
                    onChange={(e) =>
                      setInscribeFormData({
                        ...inscribeFormData,
                        academicStatus: e.target.value as typeof inscribeFormData.academicStatus,
                      })
                    }
                    className="w-full border border-slate-300 rounded-lg p-2 font-bold"
                  >
                    <option value="NOUVEAU">Nouvel admis</option>
                    <option value="PASSANT">Passant en année supérieure</option>
                    <option value="PASSAGE_CONDITIONNEL">Passage conditionnel (Dette UE)</option>
                    <option value="REDOUBLANT">Redoublant</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Groupe / Promotion</label>
                  <select
                    value={inscribeFormData.groupId}
                    onChange={(e) => {
                      const grp = groups.find((g) => g.id === e.target.value);
                      setInscribeFormData({
                        ...inscribeFormData,
                        groupId: e.target.value,
                        filiereId: grp?.filiereId || inscribeFormData.filiereId,
                        level: grp?.level || inscribeFormData.level,
                      });
                    }}
                    className="w-full border border-slate-300 rounded-lg p-2 font-bold"
                  >
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.code} - {g.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Parcours de spécialisation</label>
                  <select
                    value={inscribeFormData.parcoursId}
                    onChange={(e) => setInscribeFormData({ ...inscribeFormData, parcoursId: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2"
                  >
                    <option value="">Tronc commun</option>
                    {parcours.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} — {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <span className="font-bold text-slate-800 block">Pièces justificatives vérifiées par la Scolarité :</span>
                <div className="grid grid-cols-2 gap-1.5">
                  <label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={inscribeFormData.cinOrBirthCert}
                      onChange={(e) => setInscribeFormData({ ...inscribeFormData, cinOrBirthCert: e.target.checked })}
                    />
                    <span>CIN / Acte de naissance</span>
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={inscribeFormData.baccOriginal}
                      onChange={(e) => setInscribeFormData({ ...inscribeFormData, baccOriginal: e.target.checked })}
                    />
                    <span>Diplôme / Relevé Bacc</span>
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={inscribeFormData.photosId}
                      onChange={(e) => setInscribeFormData({ ...inscribeFormData, photosId: e.target.checked })}
                    />
                    <span>4 Photos d'identité</span>
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={inscribeFormData.financialClearance}
                      onChange={(e) => setInscribeFormData({ ...inscribeFormData, financialClearance: e.target.checked })}
                    />
                    <span>Quitus / Droits d'inscription</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowInscribeModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md cursor-pointer"
              >
                Valider l'inscription
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
