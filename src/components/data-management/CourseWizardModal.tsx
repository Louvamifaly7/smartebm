import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Check,
  BookOpen,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  Sparkles,
  Users,
  Clock,
  Layers,
  GraduationCap,
  Copy,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Course } from '../../types';

interface CourseWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCourse?: Course | null;
  isDuplicateMode?: boolean;
  onSaved?: (course: Course) => void;
}

const PRESET_COLORS = [
  '#2563eb', // Blue
  '#4f46e5', // Indigo
  '#7c3aed', // Purple
  '#9333ea', // Violet
  '#059669', // Emerald
  '#0d9488', // Teal
  '#d97706', // Amber
  '#ea580c', // Orange
  '#e11d48', // Rose
  '#db2777', // Pink
  '#0284c7', // Sky
  '#475569', // Slate
];

export const CourseWizardModal: React.FC<CourseWizardModalProps> = ({
  isOpen,
  onClose,
  initialCourse,
  isDuplicateMode = false,
  onSaved,
}) => {
  const {
    courses,
    addCourse,
    updateCourse,
    duplicateCourse,
    filieres,
    groups,
    users,
    ues,
    ecs,
    parcours,
    academicYears,
    selectedAcademicYear,
  } = useApp();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [createAnother, setCreateAnother] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const teachers = useMemo(() => users.filter((u) => u.role === 'TEACHER'), [users]);

  // Form states
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ueId, setUeId] = useState('');
  const [ecId, setEcId] = useState('');
  const [courseType, setCourseType] = useState<'CM' | 'TD' | 'TP' | 'AUTRE'>('CM');
  const [semester, setSemester] = useState<string>('S1');
  const [academicYear, setAcademicYear] = useState<string>(selectedAcademicYear || '2026-2027');

  const [filiereId, setFiliereId] = useState('');
  const [parcoursId, setParcoursId] = useState('');
  const [level, setLevel] = useState('L1');
  const [teacherIds, setTeacherIds] = useState<string[]>([]);
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [totalHours, setTotalHours] = useState(30);
  const [defaultDuration, setDefaultDuration] = useState(2);
  const [color, setColor] = useState('#2563eb');
  const [status, setStatus] = useState<'ACTIVE' | 'ARCHIVED'>('ACTIVE');

  // Filtered lists based on selections
  const availableParcours = useMemo(() => {
    return parcours.filter((p) => !filiereId || p.filiereId === filiereId);
  }, [parcours, filiereId]);

  const availableUes = useMemo(() => {
    return ues.filter((u) => (!filiereId || u.filiereId === filiereId) && (!level || u.level === level));
  }, [ues, filiereId, level]);

  const availableEcs = useMemo(() => {
    return ecs.filter((ec) => !ueId || ec.ueId === ueId);
  }, [ecs, ueId]);

  const availableGroups = useMemo(() => {
    return groups.filter((g) => (!filiereId || g.filiereId === filiereId) && (!level || g.level === level));
  }, [groups, filiereId, level]);

  const otherGroups = useMemo(() => {
    return groups.filter((g) => (filiereId && g.filiereId !== filiereId) || (level && g.level !== level));
  }, [groups, filiereId, level]);

  // Reset or load initial data when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setCurrentStep(1);
    setErrorMessage(null);

    if (initialCourse) {
      if (isDuplicateMode) {
        setCode(`${initialCourse.code}-COPIE`);
        setTitle(`${initialCourse.title} (Copie)`);
      } else {
        setCode(initialCourse.code);
        setTitle(initialCourse.title);
      }
      setDescription(initialCourse.description || '');
      setUeId(initialCourse.ueId || '');
      setEcId(initialCourse.ecId || '');
      setCourseType((initialCourse.courseType as 'CM' | 'TD' | 'TP' | 'AUTRE') || 'CM');
      setSemester(initialCourse.semester || 'S1');
      setAcademicYear(initialCourse.academicYear || selectedAcademicYear || '2026-2027');
      setFiliereId(initialCourse.filiereId || filieres[0]?.id || '');
      setParcoursId(initialCourse.parcoursId || '');
      setLevel(initialCourse.level || 'L1');
      setTeacherIds(initialCourse.teacherIds || []);
      setGroupIds(initialCourse.groupIds || []);
      setTotalHours(initialCourse.totalHours || 30);
      setDefaultDuration(initialCourse.defaultSessionDuration || 2);
      setColor(initialCourse.color || '#2563eb');
      setStatus(initialCourse.status || 'ACTIVE');
    } else {
      // Default new course values
      const defaultFil = filieres[0]?.id || '';
      setCode('');
      setTitle('');
      setDescription('');
      setUeId('');
      setEcId('');
      setCourseType('CM');
      setSemester('S1');
      setAcademicYear(selectedAcademicYear || '2026-2027');
      setFiliereId(defaultFil);
      setParcoursId('');
      setLevel('L1');
      setTeacherIds(teachers[0] ? [teachers[0].id] : []);
      // Pre-select group for default filiere if available
      const filGroups = groups.filter((g) => g.filiereId === defaultFil && g.level === 'L1');
      setGroupIds(filGroups.length > 0 ? [filGroups[0].id] : []);
      setTotalHours(30);
      setDefaultDuration(2);
      setColor('#2563eb');
      setStatus('ACTIVE');
    }
  }, [isOpen, initialCourse, isDuplicateMode, filieres, groups, teachers, selectedAcademicYear]);

  // Code duplicate check
  const isCodeDuplicate = useMemo(() => {
    const clean = code.trim().toUpperCase();
    if (!clean) return false;
    if (initialCourse && !isDuplicateMode) {
      return courses.some((c) => c.id !== initialCourse.id && c.code.trim().toUpperCase() === clean);
    }
    return courses.some((c) => c.code.trim().toUpperCase() === clean);
  }, [code, courses, initialCourse, isDuplicateMode]);

  // Auto-fill when selecting EC
  const handleSelectEc = (selectedEcId: string) => {
    setEcId(selectedEcId);
    if (!selectedEcId) return;
    const selectedEc = ecs.find((e) => e.id === selectedEcId);
    if (selectedEc) {
      if (!code) setCode(selectedEc.code);
      if (!title) setTitle(selectedEc.title);
      if (selectedEc.hourlyVolume) setTotalHours(selectedEc.hourlyVolume);
      if (selectedEc.semester) setSemester(selectedEc.semester);
      if (selectedEc.teacherIds?.length) setTeacherIds(selectedEc.teacherIds);
      if (selectedEc.groupIds?.length) setGroupIds(selectedEc.groupIds);
      if (!ueId && selectedEc.ueId) setUeId(selectedEc.ueId);
    }
  };

  const handleToggleGroup = (gid: string) => {
    setGroupIds((prev) => (prev.includes(gid) ? prev.filter((id) => id !== gid) : [...prev, gid]));
  };

  const handleSelectAllFiliereGroups = () => {
    const filGids = availableGroups.map((g) => g.id);
    setGroupIds((prev) => Array.from(new Set([...prev, ...filGids])));
  };

  const handleDeselectAllGroups = () => {
    setGroupIds([]);
  };

  const validateStep1 = () => {
    if (!code.trim()) {
      setErrorMessage('Le code du cours est obligatoire.');
      return false;
    }
    if (isCodeDuplicate) {
      setErrorMessage(`Le code cours "${code.trim().toUpperCase()}" existe déjà.`);
      return false;
    }
    if (!title.trim()) {
      setErrorMessage('L\'intitulé du cours est obligatoire.');
      return false;
    }
    setErrorMessage(null);
    return true;
  };

  const validateStep2 = () => {
    if (!filiereId) {
      setErrorMessage('Veuillez sélectionner une filière / mention.');
      return false;
    }
    if (groupIds.length === 0) {
      setErrorMessage('Veuillez affecter au moins un groupe d\'étudiants au cours.');
      return false;
    }
    if (totalHours <= 0) {
      setErrorMessage('Le volume horaire doit être supérieur à 0.');
      return false;
    }
    setErrorMessage(null);
    return true;
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (validateStep1()) setCurrentStep(2);
    } else if (currentStep === 2) {
      if (validateStep2()) setCurrentStep(3);
    }
  };

  const handlePreviousStep = () => {
    setErrorMessage(null);
    if (currentStep === 3) setCurrentStep(2);
    else if (currentStep === 2) setCurrentStep(1);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validateStep1() || !validateStep2()) return;

    const payload: Omit<Course, 'id'> = {
      code: code.trim().toUpperCase(),
      title: title.trim(),
      description: description.trim() || undefined,
      ueId: ueId || undefined,
      ecId: ecId || undefined,
      courseType,
      semester,
      academicYear,
      filiereId: filiereId || filieres[0]?.id || 'fil-1',
      parcoursId: parcoursId || undefined,
      level,
      teacherIds: teacherIds.length > 0 ? teacherIds : teachers[0] ? [teachers[0].id] : [],
      groupIds,
      totalHours: Number(totalHours) || 30,
      defaultSessionDuration: Number(defaultDuration) || 2,
      color,
      status,
    };

    if (isDuplicateMode && initialCourse) {
      const res = duplicateCourse(initialCourse.id, payload.code, payload.title);
      if (res.success && res.course) {
        // Apply additional fields if customized
        updateCourse(res.course.id, payload);
        onSaved?.({ ...res.course, ...payload });
        if (createAnother) {
          setCode('');
          setTitle('');
          setCurrentStep(1);
        } else {
          onClose();
        }
      } else {
        setErrorMessage(res.error || 'Erreur lors de la duplication.');
      }
      return;
    }

    if (initialCourse && !isDuplicateMode) {
      updateCourse(initialCourse.id, payload);
      onSaved?.({ ...initialCourse, ...payload });
      onClose();
    } else {
      const res = addCourse(payload);
      if (res.success && res.course) {
        onSaved?.(res.course);
        if (createAnother) {
          setCode('');
          setTitle('');
          setDescription('');
          setCurrentStep(1);
        } else {
          onClose();
        }
      } else {
        setErrorMessage(res.error || 'Erreur lors de la création du cours.');
      }
    }
  };

  if (!isOpen) return null;

  const currentFiliere = filieres.find((f) => f.id === filiereId);
  const currentParcours = parcours.find((p) => p.id === parcoursId);
  const currentUe = ues.find((u) => u.id === ueId);
  const currentEc = ecs.find((e) => e.id === ecId);
  const assignedTeachers = teachers.filter((t) => teacherIds.includes(t.id));
  const assignedGroups = groups.filter((g) => groupIds.includes(g.id));

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 rounded-2xl text-white shadow-xs">
              {isDuplicateMode ? <Copy className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">
                  {isDuplicateMode
                    ? 'Dupliquer le cours / matière'
                    : initialCourse
                    ? 'Modifier le cours / matière'
                    : 'Nouveau cours / matière (Création guidée)'}
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/30">
                  Étape {currentStep} sur 3
                </span>
              </div>
              <p className="text-xs text-slate-300">
                {currentStep === 1
                  ? 'Étape 1 : Renseignez les informations pédagogiques et l\'attachement LMD'
                  : currentStep === 2
                  ? 'Étape 2 : Définissez les affectations (filière, groupes, enseignants, heures)'
                  : 'Étape 3 : Vérifiez le récapitulatif avant enregistrement sécurisé'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Progress Bar */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-semibold">
          <div
            onClick={() => setCurrentStep(1)}
            className={`flex items-center gap-2 cursor-pointer transition-colors ${
              currentStep === 1 ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                currentStep === 1
                  ? 'bg-blue-600 text-white'
                  : currentStep > 1
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {currentStep > 1 ? <Check className="w-3.5 h-3.5" /> : '1'}
            </span>
            <span>1. Infos pédagogiques</span>
          </div>

          <div className="h-0.5 flex-1 mx-3 bg-slate-200">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: currentStep === 1 ? '0%' : currentStep === 2 ? '50%' : '100%' }}
            />
          </div>

          <div
            onClick={() => {
              if (validateStep1()) setCurrentStep(2);
            }}
            className={`flex items-center gap-2 cursor-pointer transition-colors ${
              currentStep === 2 ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                currentStep === 2
                  ? 'bg-blue-600 text-white'
                  : currentStep > 2
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {currentStep > 2 ? <Check className="w-3.5 h-3.5" /> : '2'}
            </span>
            <span>2. Affectations & Volume</span>
          </div>

          <div className="h-0.5 flex-1 mx-3 bg-slate-200">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: currentStep === 3 ? '100%' : '0%' }}
            />
          </div>

          <div
            onClick={() => {
              if (validateStep1() && validateStep2()) setCurrentStep(3);
            }}
            className={`flex items-center gap-2 cursor-pointer transition-colors ${
              currentStep === 3 ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                currentStep === 3 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              3
            </span>
            <span>3. Vérification</span>
          </div>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2.5 text-xs text-red-700 font-semibold">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 text-xs space-y-4">
          {/* STEP 1: PÉDAGOGIQUE */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-center gap-2 text-blue-900">
                <Sparkles className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span>
                  Indiquez le code unique, l'intitulé officiel et rattachez le cours à une Unité d'Enseignement (UE) ou un EC existant.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="font-bold text-slate-700 block mb-1">
                    Code du cours / EC *
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="Ex: INF-101, DRO-201"
                    className={`w-full p-2.5 bg-slate-50 border rounded-xl font-mono uppercase font-bold text-xs ${
                      isCodeDuplicate
                        ? 'border-red-400 bg-red-50 text-red-700 focus:ring-red-400'
                        : 'border-slate-300 focus:border-blue-500'
                    }`}
                    required
                  />
                  {isCodeDuplicate ? (
                    <p className="text-[11px] text-red-600 mt-1">Code déjà utilisé par un autre cours.</p>
                  ) : (
                    <p className="text-[11px] text-slate-400 mt-1">Code court d'identification unique.</p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">
                    Intitulé complet du cours / matière *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Algorithmique et Structures de Données"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-xs focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              {/* LMD Attachment (UE & EC) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                <div>
                  <label className="font-bold text-slate-700 block mb-1 flex items-center justify-between">
                    <span>Unité d'Enseignement (UE)</span>
                    <span className="text-[10px] text-slate-400 font-normal">Optionnel</span>
                  </label>
                  <select
                    value={ueId}
                    onChange={(e) => {
                      setUeId(e.target.value);
                      setEcId('');
                    }}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs"
                  >
                    <option value="">-- Aucune UE rattachée --</option>
                    {availableUes.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.code} - {u.title} ({u.level} • {u.creditsEcts} ECTS)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1 flex items-center justify-between">
                    <span>Élément Constitutif (EC)</span>
                    <span className="text-[10px] text-slate-400 font-normal">Optionnel</span>
                  </label>
                  <select
                    value={ecId}
                    onChange={(e) => handleSelectEc(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs"
                  >
                    <option value="">-- Aucun EC rattaché --</option>
                    {availableEcs.map((ec) => (
                      <option key={ec.id} value={ec.id}>
                        {ec.code} - {ec.title} ({ec.hourlyVolume}h)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Type d'enseignement & Semestre */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Type d'enseignement *
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(['CM', 'TD', 'TP', 'AUTRE'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setCourseType(t)}
                        className={`py-2 text-center rounded-xl font-bold border transition-all ${
                          courseType === t
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Semestre *</label>
                  <select
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                  >
                    {['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10'].map((s) => (
                      <option key={s} value={s}>
                        Semestre {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Année universitaire *</label>
                  <select
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  >
                    {academicYears.map((ay) => (
                      <option key={ay.id} value={ay.code}>
                        {ay.name} ({ay.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="font-bold text-slate-700 block mb-1 flex items-center justify-between">
                  <span>Description / Objectifs pédagogiques</span>
                  <span className="text-[10px] text-slate-400 font-normal">Facultatif</span>
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Objectifs, prérequis, syllabus ou compétences visées..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {/* STEP 2: AFFECTATIONS & VOLUME */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in">
              {/* Filière, Parcours & Niveau */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Filière / Mention *</label>
                  <select
                    value={filiereId}
                    onChange={(e) => {
                      setFiliereId(e.target.value);
                      setParcoursId('');
                    }}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                    required
                  >
                    {filieres.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.code} - {f.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1 flex items-center justify-between">
                    <span>Parcours de spécialisation</span>
                    <span className="text-[10px] text-slate-400 font-normal">Optionnel</span>
                  </label>
                  <select
                    value={parcoursId}
                    onChange={(e) => setParcoursId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  >
                    <option value="">Tronc Commun / Tous parcours</option>
                    {availableParcours.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} - {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Niveau d'études *</label>
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                  >
                    <option value="L1">Licence 1 (L1)</option>
                    <option value="L2">Licence 2 (L2)</option>
                    <option value="L3">Licence 3 (L3)</option>
                    <option value="M1">Master 1 (M1)</option>
                    <option value="M2">Master 2 (M2)</option>
                  </select>
                </div>
              </div>

              {/* Enseignant(s) */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Enseignant(s) responsable(s)
                </label>
                <select
                  value={teacherIds[0] || ''}
                  onChange={(e) => setTeacherIds(e.target.value ? [e.target.value] : [])}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                >
                  <option value="">-- Aucun enseignant assigné --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.specialty ? `(${t.specialty})` : ''} - {t.email}
                    </option>
                  ))}
                </select>
              </div>

              {/* Groupes d'étudiants concernés (RG-10) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-slate-700 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-600" />
                    <span>Groupes d'étudiants concernés *</span>
                    <span className="text-[11px] text-blue-600 font-semibold">
                      ({groupIds.length} sélectionné{groupIds.length > 1 ? 's' : ''})
                    </span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllFiliereGroups}
                      className="text-[11px] text-blue-600 hover:underline font-semibold"
                    >
                      Sélectionner filière ({availableGroups.length})
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={handleDeselectAllGroups}
                      className="text-[11px] text-slate-500 hover:underline"
                    >
                      Tout désélectionner
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl max-h-44 overflow-y-auto space-y-2.5">
                  <div>
                    <div className="text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                      Groupes de la filière sélectionnée ({currentFiliere?.code || 'Filière'} - {level})
                    </div>
                    {availableGroups.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic">Aucun groupe créé pour ce niveau et cette filière.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {availableGroups.map((grp) => {
                          const isSelected = groupIds.includes(grp.id);
                          return (
                            <button
                              key={grp.id}
                              type="button"
                              onClick={() => handleToggleGroup(grp.id)}
                              className={`px-3 py-1.5 rounded-xl border font-bold text-xs flex items-center gap-1.5 transition-all ${
                                isSelected
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                              }`}
                            >
                              <span>{grp.code}</span>
                              <span className={`text-[10px] font-normal px-1 rounded ${isSelected ? 'bg-blue-700 text-blue-100' : 'bg-slate-100 text-slate-500'}`}>
                                {grp.studentCount} étud.
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {otherGroups.length > 0 && (
                    <div className="pt-2 border-t border-slate-200">
                      <div className="text-[11px] font-bold text-slate-400 mb-1.5">Autres groupes de l'institut (inter-filière)</div>
                      <div className="flex flex-wrap gap-1.5">
                        {otherGroups.map((grp) => {
                          const isSelected = groupIds.includes(grp.id);
                          return (
                            <button
                              key={grp.id}
                              type="button"
                              onClick={() => handleToggleGroup(grp.id)}
                              className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium flex items-center gap-1 transition-all ${
                                isSelected
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              <span>{grp.code}</span>
                              <span className="text-[10px] opacity-75">({grp.studentCount})</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Volume horaire, Durée de séance & Couleur */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Volume horaire total (h) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={totalHours}
                    onChange={(e) => setTotalHours(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                    required
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Quota officiel de la maquette.</p>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Durée d'une séance type *
                  </label>
                  <select
                    value={defaultDuration}
                    onChange={(e) => setDefaultDuration(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  >
                    <option value={1}>1 heure (1h00)</option>
                    <option value={1.5}>1 heure 30 (1h30)</option>
                    <option value={2}>2 heures (2h00 - Standard)</option>
                    <option value={3}>3 heures (3h00)</option>
                    <option value={4}>4 heures (4h00)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Couleur d'identification</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-10 h-9 p-0.5 rounded-xl border border-slate-300 cursor-pointer"
                    />
                    <div className="flex flex-wrap gap-1 flex-1">
                      {PRESET_COLORS.slice(0, 6).map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setColor(c)}
                          className="w-5 h-5 rounded-full border border-white shadow-xs cursor-pointer hover:scale-110 transition-transform"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: VÉRIFICATION & RÉSUMÉ */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
                <div className="p-2 bg-emerald-600 rounded-xl text-white">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-emerald-950 text-sm">
                    Prêt pour l'enregistrement
                  </h4>
                  <p className="text-emerald-800 text-[11px]">
                    Vérifiez les caractéristiques du cours ci-dessous avant d'enregistrer.
                  </p>
                </div>
              </div>

              {/* Summary Card */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold px-2 py-0.5 rounded-lg bg-blue-100 text-blue-800">
                        {code.trim().toUpperCase()}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold text-[10px]">
                        {courseType}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold text-[10px]">
                        Semestre {semester}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm mt-1">{title}</h4>
                    {description && <p className="text-slate-500 text-[11px] mt-0.5">{description}</p>}
                  </div>
                  <div
                    className="w-6 h-6 rounded-xl border border-white shadow-xs flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                  <div>
                    <span className="text-slate-400 block">Filière / Mention</span>
                    <span className="font-bold text-slate-800">{currentFiliere?.name || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Niveau & Parcours</span>
                    <span className="font-bold text-slate-800">
                      {level} {currentParcours ? `• ${currentParcours.code}` : ''}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Volume horaire</span>
                    <span className="font-bold text-slate-800">{totalHours} heures</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Séance type</span>
                    <span className="font-bold text-slate-800">{defaultDuration}h / séance</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                  <div>
                    <span className="text-slate-400 block mb-1">Enseignant responsable</span>
                    {assignedTeachers.length > 0 ? (
                      <span className="font-bold text-slate-800">
                        {assignedTeachers.map((t) => t.name).join(', ')}
                      </span>
                    ) : (
                      <span className="text-amber-600 italic">Aucun enseignant assigné</span>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1">Groupes affectés ({assignedGroups.length})</span>
                    <div className="flex flex-wrap gap-1">
                      {assignedGroups.map((g) => (
                        <span key={g.id} className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[10px]">
                          {g.code}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {(currentUe || currentEc) && (
                  <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-600">
                    <span className="text-slate-400">Rattachement académique : </span>
                    {currentUe && <span className="font-semibold">UE : {currentUe.code} ({currentUe.title})</span>}
                    {currentEc && <span className="font-semibold ml-2">EC : {currentEc.code}</span>}
                  </div>
                )}
              </div>

              {/* Duplicate or Create Another Options */}
              {!initialCourse && (
                <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-2xl flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-blue-900 text-xs">
                    <input
                      type="checkbox"
                      checked={createAnother}
                      onChange={(e) => setCreateAnother(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <span>Enregistrer et créer un autre cours immédiatement</span>
                  </label>
                  <span className="text-[11px] text-blue-600">Gain de temps pour saisies multiples</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handlePreviousStep}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-100 rounded-xl text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Précédent
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-100 rounded-xl text-slate-700 font-bold text-xs transition-colors"
            >
              Annuler
            </button>

            {currentStep < 3 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-all"
              >
                Suivant
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSubmit()}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-all"
              >
                <Check className="w-4 h-4" />
                {isDuplicateMode
                  ? 'Confirmer la duplication'
                  : initialCourse
                  ? 'Enregistrer les modifications'
                  : 'Créer le cours'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
