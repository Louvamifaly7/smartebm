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
} from 'lucide-react';
import { getTeachersForStudent } from '../utils/studentVisibility';

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
    groups,
    users,
    inscriptions,
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
  const myGroup = groups.find((g) => g.id === currentUser.groupId);
  const isAcademicStaff = ['ADMIN', 'ACADEMIC_HEAD', 'SCHEDULER'].includes(currentUser.role);

  const [activeTab, setActiveTab] = useState<'MAQUETTES' | 'INSCRIPTIONS'>('MAQUETTES');
  const [selectedSemester, setSelectedSemester] = useState<SemesterCode | 'ALL'>('ALL');
  const [selectedFiliere, setSelectedFiliere] = useState<string>('ALL');

  // Modals state
  const [showDuplicateModal, setShowDuplicateModal] = useState<boolean>(false);
  const [sourceYear, setSourceYear] = useState<string>(selectedAcademicYear);
  const [targetYear, setTargetYear] = useState<string>('2027-2028');
  const [duplicateSuccessMsg, setDuplicateSuccessMsg] = useState<string | null>(null);

  const [showAddUeModal, setShowAddUeModal] = useState<boolean>(false);
  const [ueFormData, setUeFormData] = useState({
    code: '',
    title: '',
    filiereId: filieres[0]?.id || 'fil-1',
    level: 'L1',
    semester: 'S1' as SemesterCode,
    creditsEcts: 6,
    validationThreshold: 10.0,
  });

  const [showAddEcModal, setShowAddEcModal] = useState<boolean>(false);
  const [selectedUeForEc, setSelectedUeForEc] = useState<UniteEnseignement | null>(null);
  const [ecFormData, setEcFormData] = useState({
    code: '',
    title: '',
    semester: 'S1' as SemesterCode,
    creditsEcts: 3,
    hourlyVolume: 30,
    teacherIds: [] as string[],
    groupIds: [] as string[],
    quizWeight: 0.4,
    examWeight: 0.6,
  });

  const [showInscribeModal, setShowInscribeModal] = useState<boolean>(false);
  const [inscribeFormData, setInscribeFormData] = useState({
    studentId: '',
    academicYear: selectedAcademicYear,
    filiereId: filieres[0]?.id || 'fil-1',
    level: 'L1',
    groupId: groups[0]?.id || 'grp-l1-info-a',
  });

  // Filter UEs according to current academic year, filiere and semester
  const filteredUes = ues.filter((ue) => {
    if (ue.academicYear !== selectedAcademicYear) return false;
    if (isStudent) {
      if (myGroup?.filiereId && ue.filiereId !== myGroup.filiereId) return false;
      if (ue.level !== 'L1') return false;
    } else {
      if (selectedFiliere !== 'ALL' && ue.filiereId !== selectedFiliere) return false;
    }
    if (selectedSemester !== 'ALL' && ue.semester !== selectedSemester) return false;
    return true;
  });

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
        level: 'L1',
        semester: 'S1',
        creditsEcts: 6,
        validationThreshold: 10.0,
      });
    }
  };

  const handleCreateEc = (e: React.FormEvent) => {
    e.preventDefault();
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
        hourlyVolume: 30,
        teacherIds: [],
        groupIds: [],
        quizWeight: 0.4,
        examWeight: 0.6,
      });
    }
  };

  const handleInscribeStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inscribeFormData.studentId) return;
    inscribeStudent(
      inscribeFormData.studentId,
      inscribeFormData.academicYear,
      inscribeFormData.filiereId,
      inscribeFormData.level,
      inscribeFormData.groupId
    );
    setShowInscribeModal(false);
  };

  const teachers = users.filter((u) => u.role === 'TEACHER');
  const students = users.filter((u) => u.role === 'STUDENT');

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
            Gestion indépendante par année universitaire : Unités d'Enseignement (UE), Éléments Constitutifs (EC 40/60) et crédits ECTS.
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
                onClick={() => setShowDuplicateModal(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-md transition-all cursor-pointer active:scale-95"
              >
                <Copy className="w-4 h-4" />
                Dupliquer la maquette
              </button>
              <button
                onClick={() => setShowAddUeModal(true)}
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
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('MAQUETTES')}
          className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm border-b-2 transition-colors ${
            activeTab === 'MAQUETTES'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          Maquette des Cours & ECTS ({filteredUes.length} UEs)
        </button>
        {/* Inscriptions tab visible only for staff */}
        {!isStudent && (
          <button
            onClick={() => setActiveTab('INSCRIPTIONS')}
            className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm border-b-2 transition-colors ${
              activeTab === 'INSCRIPTIONS'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            Inscriptions Annuelles des Étudiants ({inscriptions.filter(i => i.academicYear === selectedAcademicYear).length})
          </button>
        )}
      </div>

      {activeTab === 'MAQUETTES' && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold uppercase text-slate-500">Filtrer par Semestre :</span>
              <div className="flex gap-1.5">
                {(['ALL', 'S1', 'S2'] as const).map((sem) => (
                  <button
                    key={sem}
                    onClick={() => setSelectedSemester(sem)}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                      selectedSemester === sem
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {sem === 'ALL' ? 'Tous les Semestres' : sem}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isStudent ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase text-slate-500 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-blue-600" />
                    Votre filière inscrite :
                  </span>
                  <span className="bg-blue-50 text-blue-800 border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-bold">
                    {filieres.find((f) => f.id === myGroup?.filiereId)?.name || 'Informatique'} ({myGroup?.code})
                  </span>
                </div>
              ) : (
                <>
                  <span className="text-xs font-semibold uppercase text-slate-500">Filière :</span>
                  <select
                    value={selectedFiliere}
                    onChange={(e) => setSelectedFiliere(e.target.value)}
                    className="bg-slate-50 border border-slate-300 text-slate-800 text-xs font-semibold rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ALL">Toutes les filières</option>
                    {filieres.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.code} - {f.name}
                      </option>
                    ))}
                  </select>
                </>
              )}
            </div>
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
                const childEcs = ecs.filter((ec) => ec.ueId === ue.id || ue.ecIds.includes(ec.id));
                const totalEcCredits = childEcs.reduce((sum, ec) => sum + ec.creditsEcts, 0);

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
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-800 text-base">{ue.title}</h3>
                            <span className="text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded">
                              {ue.semester}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Filière {filiere?.code} ({ue.level}) • Seuil de validation : {ue.validationThreshold}/20
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
                              onClick={() => {
                                setSelectedUeForEc(ue);
                                setShowAddEcModal(true);
                              }}
                              className="text-xs flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold px-2.5 py-1.5 rounded-lg border border-emerald-200 transition-colors"
                              title="Ajouter un élément constitutif"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Ajouter EC
                            </button>
                            <button
                              onClick={() => deleteUe(ue.id)}
                              className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
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
                                        <button
                                          onClick={() => deleteEc(ec.id)}
                                          className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                                          title="Supprimer cet EC"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
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

      {activeTab === 'INSCRIPTIONS' && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-800 text-sm">Inscriptions Annuelles des Étudiants</h2>
              <p className="text-xs text-slate-500">
                Chaque étudiant possède un parcours multi-années avec historique de rattachement aux groupes.
              </p>
            </div>
            {isAcademicStaff && (
              <button
                onClick={() => setShowInscribeModal(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all"
              >
                <Plus className="w-4 h-4" />
                Inscrire un étudiant
              </button>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Matricule</th>
                    <th className="py-3 px-4">Nom de l'étudiant</th>
                    <th className="py-3 px-4">Année Universitaire</th>
                    <th className="py-3 px-4">Filière & Niveau</th>
                    <th className="py-3 px-4">Groupe</th>
                    <th className="py-3 px-4">Date d'inscription</th>
                    <th className="py-3 px-4 text-center">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inscriptions.map((insc) => {
                    const st = students.find((s) => s.id === insc.studentId);
                    const grp = groups.find((g) => g.id === insc.groupId);
                    const fil = filieres.find((f) => f.id === insc.filiereId);

                    return (
                      <tr key={insc.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-mono font-bold text-blue-600">
                          {st?.matricule || 'N/A'}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          {st?.name || 'Étudiant inconnu'}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">
                          {insc.academicYear}
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          {fil?.code} - {insc.level}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-700">
                          {grp?.code || insc.groupId}
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {insc.inscriptionDate}
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
                <h3 className="text-lg font-bold text-slate-800">Nouvelle Unité d'Enseignement (UE)</h3>
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
                  <label className="font-semibold text-slate-700 block mb-1">Semestre</label>
                  <select
                    value={ueFormData.semester}
                    onChange={(e) => setUeFormData({ ...ueFormData, semester: e.target.value as SemesterCode })}
                    className="w-full border border-slate-300 rounded-lg p-2 font-bold"
                  >
                    <option value="S1">Semestre 1 (S1)</option>
                    <option value="S2">Semestre 2 (S2)</option>
                    <option value="S3">Semestre 3 (S3)</option>
                    <option value="S4">Semestre 4 (S4)</option>
                    <option value="S5">Semestre 5 (S5)</option>
                    <option value="S6">Semestre 6 (S6)</option>
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Filière</label>
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
                onClick={() => setShowAddUeModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md cursor-pointer"
              >
                Créer l'UE
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Créer EC */}
      {showAddEcModal && selectedUeForEc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateEc}
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Ajouter un Élément Constitutif (EC)</h3>
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
                  <label className="font-semibold text-slate-700 block mb-1">Volume Horaire</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
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
                    onChange={(e) => setEcFormData({ ...ecFormData, teacherIds: [e.target.value] })}
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

              {/* Formule Officielle LMD 40/60 */}
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200">
                <span className="font-bold text-amber-900 block mb-1">Pondération d'Évaluation LMD Officielle</span>
                <div className="grid grid-cols-2 gap-3 text-amber-800">
                  <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-amber-200">
                    <span>Quiz / Contrôle continu :</span>
                    <span className="font-extrabold">40%</span>
                  </div>
                  <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-amber-200">
                    <span>Examen final :</span>
                    <span className="font-extrabold">60%</span>
                  </div>
                </div>
                <p className="text-[10px] text-amber-700 mt-1.5">
                  Formule appliquée : <code>Note finale = (Quiz × 0.40) + (Examen × 0.60)</code>
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddEcModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md cursor-pointer"
              >
                Ajouter l'EC
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Inscrire Étudiant */}
      {showInscribeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleInscribeStudent}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Inscrire un Étudiant</h3>
                <p className="text-xs text-slate-500">Rattachement à l'année {selectedAcademicYear}</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Étudiant</label>
                <select
                  required
                  value={inscribeFormData.studentId}
                  onChange={(e) => setInscribeFormData({ ...inscribeFormData, studentId: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 font-medium"
                >
                  <option value="">Sélectionner un étudiant</option>
                  {students.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} ({st.matricule || 'Sans matricule'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Groupe / Promotion</label>
                <select
                  value={inscribeFormData.groupId}
                  onChange={(e) => setInscribeFormData({ ...inscribeFormData, groupId: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 font-bold"
                >
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.code} - {g.name}
                    </option>
                  ))}
                </select>
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
