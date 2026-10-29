import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Award,
  CheckCircle2,
  AlertCircle,
  Send,
  Save,
  Filter,
  FileText,
  User,
  Calculator,
  Sparkles,
  Search,
} from 'lucide-react';

export const GradesView: React.FC = () => {
  const {
    currentUser,
    users,
    groups,
    ecs,
    ues,
    grades,
    saveGrade,
    updateEc,
    publishGrades,
    getStudentEcGrade,
    getStudentUeSummary,
    selectedAcademicYear,
  } = useApp();

  const isStudent = currentUser.role === 'STUDENT';
  const isTeacherOrAdmin = ['TEACHER', 'ADMIN', 'ACADEMIC_HEAD', 'SCHEDULER'].includes(currentUser.role);

  // Teacher / Admin selection state
  const [selectedGroupId, setSelectedGroupId] = useState<string>(groups[0]?.id || 'grp-l1-info-a');
  const [selectedEcId, setSelectedEcId] = useState<string>(ecs[0]?.id || 'ec-algo-1');
  const [searchStudent, setSearchStudent] = useState<string>('');
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);

  // Local draft inputs for current EC (studentId -> { quiz, exam, comment })
  const [draftInputs, setDraftInputs] = useState<Record<string, { quiz: string; exam: string; comment: string }>>({});

  const selectedEc = ecs.find((e) => e.id === selectedEcId);
  const selectedGroup = groups.find((g) => g.id === selectedGroupId);
  const selectedGroupStudents = users.filter((u) => u.role === 'STUDENT' && u.groupId === selectedGroupId);

  const isDirect100 = selectedEc ? (selectedEc.quizWeight === 0 || selectedEc.examWeight === 1.0) : false;

  const filteredStudents = selectedGroupStudents.filter((st) =>
    st.name.toLowerCase().includes(searchStudent.toLowerCase()) ||
    (st.matricule && st.matricule.toLowerCase().includes(searchStudent.toLowerCase()))
  );

  // Initialize or read draft values
  const getInputValue = (studentId: string) => {
    if (draftInputs[studentId]) {
      return draftInputs[studentId];
    }
    const savedGrade = getStudentEcGrade(studentId, selectedEcId);
    return {
      quiz: savedGrade?.quizScore !== undefined ? String(savedGrade.quizScore) : '',
      exam: savedGrade?.examScore !== undefined ? String(savedGrade.examScore) : '',
      comment: savedGrade?.comment || '',
    };
  };

  const handleInputChange = (studentId: string, field: 'quiz' | 'exam' | 'comment', value: string) => {
    const current = getInputValue(studentId);
    setDraftInputs((prev) => ({
      ...prev,
      [studentId]: {
        ...current,
        [field]: value,
      },
    }));
  };

  const handleSaveStudentGrade = (studentId: string, isDraft: boolean = true) => {
    const current = getInputValue(studentId);
    const quiz = isDirect100 ? undefined : (current.quiz !== '' ? parseFloat(current.quiz) : undefined);
    const exam = current.exam !== '' ? parseFloat(current.exam) : (isDirect100 && current.quiz !== '' ? parseFloat(current.quiz) : undefined);

    saveGrade(studentId, selectedEcId, quiz, exam, isDraft, current.comment);

    setSaveSuccessNotice(`Note enregistrée pour l'étudiant !`);
    setTimeout(() => setSaveSuccessNotice(null), 2000);
  };

  const handlePublishAll = () => {
    // Save any pending drafts first
    Object.entries(draftInputs).forEach(([studentId, inputs]) => {
      const quiz = isDirect100 ? undefined : (inputs.quiz !== '' ? parseFloat(inputs.quiz) : undefined);
      const exam = inputs.exam !== '' ? parseFloat(inputs.exam) : (isDirect100 && inputs.quiz !== '' ? parseFloat(inputs.quiz) : undefined);
      saveGrade(studentId, selectedEcId, quiz, exam, false, inputs.comment);
    });

    publishGrades(selectedEcId);
    setSaveSuccessNotice('📢 Notes publiées officiellement ! Les notifications push ont été envoyées aux étudiants.');
    setTimeout(() => setSaveSuccessNotice(null), 3500);
  };

  // Helper formula preview: 100% direct or (Quiz * 0.40) + (Examen * 0.60)
  const computeLiveFinal = (quizStr: string, examStr: string): number | null => {
    if (isDirect100) {
      const val = examStr !== '' ? parseFloat(examStr) : (quizStr !== '' ? parseFloat(quizStr) : null);
      return val !== null && !isNaN(val) ? Number(val.toFixed(2)) : null;
    }
    const q = quizStr !== '' ? parseFloat(quizStr) : null;
    const e = examStr !== '' ? parseFloat(examStr) : null;
    const qW = selectedEc?.quizWeight ?? 0.40;
    const eW = selectedEc?.examWeight ?? 0.60;
    if (q !== null && e !== null && !isNaN(q) && !isNaN(e)) {
      return Number(((q * qW) + (e * eW)).toFixed(2));
    }
    if (e !== null && !isNaN(e) && q === null) {
      return Number((e * eW).toFixed(2));
    }
    return null;
  };

  // ==========================================
  // STUDENT VIEW: Official Personal Transcript
  // ==========================================
  if (isStudent) {
    // Filter UEs for student level / filiere
    const studentUes = ues.filter((u) => u.academicYear === selectedAcademicYear);

    let totalEctsAttempted = 0;
    let totalEctsAcquired = 0;

    studentUes.forEach((ue) => {
      totalEctsAttempted += ue.creditsEcts;
      const summary = getStudentUeSummary(currentUser.id, ue.id);
      totalEctsAcquired += summary.validatedCredits;
    });

    return (
      <div className="space-y-6">
        {/* Banner */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-blue-400/20 text-blue-200 border border-blue-400/30 px-2.5 py-0.5 rounded text-xs font-semibold uppercase">
                Relevé de Notes LMD Officiel
              </span>
              <span className="text-xs text-blue-300">Année {selectedAcademicYear}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Mes Résultats & Crédits ECTS</h1>
            <p className="text-blue-100 text-sm mt-1">
              Étudiant : <span className="font-semibold text-white">{currentUser.name}</span> • Matricule :{' '}
              <span className="font-mono font-bold text-yellow-300">{currentUser.matricule}</span>
            </p>
          </div>

          <div className="flex gap-3">
            <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/20 text-center">
              <span className="text-xs text-blue-200 block uppercase font-semibold">Crédits ECTS Validés</span>
              <span className="text-2xl font-extrabold text-emerald-300">
                {totalEctsAcquired} <span className="text-sm font-normal text-blue-200">/ {totalEctsAttempted}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Formula reminder box */}
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Calculator className="w-5 h-5 text-amber-700 shrink-0" />
            <div className="text-xs text-amber-900">
              <span className="font-bold">Règle d'évaluation LMD EBM Institute :</span>{' '}
              La note finale de chaque Élément Constitutif (EC) est calculée selon la formule officielle :{' '}
              <code className="bg-white px-2 py-0.5 rounded border border-amber-300 font-bold">
                Note finale = (Quiz × 0.40) + (Examen × 0.60)
              </code>
            </div>
          </div>
        </div>

        {/* UEs & ECs Transcript */}
        <div className="space-y-5">
          {studentUes.map((ue) => {
            const summary = getStudentUeSummary(currentUser.id, ue.id);

            return (
              <div
                key={ue.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
              >
                {/* UE Header */}
                <div className="bg-slate-50 p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="bg-blue-600 text-white text-xs font-bold px-2.5 py-1 rounded-md">
                      {ue.code}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-800 text-sm">{ue.title}</h3>
                        <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded">
                          {ue.semester}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">Seuil de validation : {ue.validationThreshold}/20</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-xs text-slate-400 block uppercase font-semibold">Moyenne UE</span>
                      <span
                        className={`text-base font-extrabold ${
                          summary.average >= ue.validationThreshold ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {summary.average.toFixed(2)} / 20
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-slate-400 block uppercase font-semibold">Statut UE</span>
                      <span
                        className={`text-xs font-extrabold px-2.5 py-1 rounded-full border ${
                          summary.isPassed
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                            : 'bg-rose-50 text-rose-700 border-rose-300'
                        }`}
                      >
                        {summary.isPassed ? `Validée (${ue.creditsEcts} ECTS)` : 'Ajournée (0 ECTS)'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Child ECs */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px]">
                        <th className="py-2.5 px-4">Élément Constitutif (EC)</th>
                        <th className="py-2.5 px-4 text-center">Crédits ECTS</th>
                        <th className="py-2.5 px-4 text-center">Quiz / CC</th>
                        <th className="py-2.5 px-4 text-center">Examen / Éval.</th>
                        <th className="py-2.5 px-4 text-center font-bold">Note Finale</th>
                        <th className="py-2.5 px-4 text-center">Résultat</th>
                        <th className="py-2.5 px-4">Appréciation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {summary.ecDetails.map(({ ec, grade, isPassed }) => {
                        const isEcDirect100 = ec.quizWeight === 0 || ec.examWeight === 1.0;
                        return (
                          <tr key={ec.id} className="hover:bg-slate-50/70">
                            <td className="py-3 px-4">
                              <span className="font-semibold text-slate-800 block">{ec.title}</span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="font-mono text-[10px] text-slate-400">{ec.code}</span>
                                {isEcDirect100 && (
                                  <span className="text-[9px] bg-emerald-50 text-emerald-700 font-semibold px-1.5 py-0.2 rounded border border-emerald-200">
                                    Éval. 100% directe
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center font-medium text-slate-600">
                              {ec.creditsEcts} ECTS
                            </td>
                            <td className="py-3 px-4 text-center">
                              {isEcDirect100 ? (
                                <span className="text-slate-400 italic text-[11px]">- (100% direct)</span>
                              ) : grade?.quizScore !== undefined ? (
                                <span className="font-bold text-slate-700">{grade.quizScore.toFixed(1)} / 20</span>
                              ) : (
                                <span className="text-slate-300 italic">-</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {grade?.examScore !== undefined ? (
                                <span className="font-bold text-slate-700">{grade.examScore.toFixed(1)} / 20</span>
                              ) : (
                                <span className="text-slate-300 italic">-</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {grade?.finalScore !== undefined ? (
                              <span
                                className={`text-sm font-black ${
                                  grade.finalScore >= 10 ? 'text-emerald-600' : 'text-rose-600'
                                }`}
                              >
                                {grade.finalScore.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-slate-300 italic">En attente</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {grade?.finalScore !== undefined ? (
                              <span
                                className={`inline-flex items-center gap-1 font-bold text-[10px] px-2 py-0.5 rounded-full ${
                                  isPassed
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {isPassed ? 'Admis' : 'Rattrapage'}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[10px]">Non évalué</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-600 italic text-[11px]">
                            {grade?.comment || (grade?.finalScore !== undefined ? 'Validé' : 'Session en cours')}
                          </td>
                        </tr>
                      );
                    })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ==========================================
  // TEACHER / ADMIN VIEW: Grade Entry & Publication
  // ==========================================
  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 px-2.5 py-0.5 rounded text-xs font-semibold uppercase">
              Évaluations & Notes LMD
            </span>
            <span className="text-xs text-slate-300">Mode au choix : 40/60 ou Évaluation Directe 100%</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Saisie & Publication des Notes</h1>
          <p className="text-slate-300 text-sm mt-1">
            Choisissez pour chaque matière entre la formule standard (40% CC + 60% Examen) ou une note directe à 100%.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePublishAll}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow-lg transition-all cursor-pointer active:scale-95"
          >
            <Send className="w-4 h-4" />
            Publier les notes officielles
          </button>
        </div>
      </div>

      {saveSuccessNotice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-3 rounded-xl flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="text-sm font-semibold">{saveSuccessNotice}</span>
        </div>
      )}

      {/* Selectors Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Groupe / Promo :</label>
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="bg-slate-50 border border-slate-300 text-slate-800 text-xs font-bold rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.code} ({g.name})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Élément Constitutif (EC) :</label>
            <select
              value={selectedEcId}
              onChange={(e) => {
                setSelectedEcId(e.target.value);
                setDraftInputs({});
              }}
              className="bg-slate-50 border border-slate-300 text-slate-800 text-xs font-bold rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            >
              {ecs.map((ec) => (
                <option key={ec.id} value={ec.id}>
                  {ec.code} - {ec.title} ({ec.creditsEcts} ECTS)
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Rechercher un étudiant..."
            value={searchStudent}
            onChange={(e) => setSearchStudent(e.target.value)}
            className="pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* EC Details Summary Bar & 100% Formula Selector */}
      {selectedEc && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold text-blue-700 uppercase bg-blue-100 px-2 py-0.5 rounded">
                Matière : {selectedEc.code}
              </span>
              <h2 className="text-base font-bold text-slate-800 mt-1">
                {selectedEc.title}
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Volume horaire : {selectedEc.hourlyVolume}h • Crédits : {selectedEc.creditsEcts} ECTS
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-white px-3 py-1.5 rounded-xl border border-blue-200 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Étudiants</span>
                <span className="font-extrabold text-sm text-slate-800">{selectedGroupStudents.length}</span>
              </div>
              <div className="bg-white px-3 py-1.5 rounded-xl border border-blue-200 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Seuil admis</span>
                <span className="font-extrabold text-sm text-emerald-600">≥ 10.0 / 20</span>
              </div>
            </div>
          </div>

          {/* Formula Mode Toggle for this Subject */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-blue-200">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block">
                Mode de calcul de la note pour cette matière :
              </span>
              <span className="text-xs font-bold text-slate-800">
                {isDirect100 ? '⭐ Évaluation Directe à 100% (Note unique)' : '⚖️ Standard 40% Contrôle Continu + 60% Examen'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  updateEc(selectedEc.id, { quizWeight: 0.40, examWeight: 0.60 });
                  setSaveSuccessNotice(`Formule 40/60 appliquée à ${selectedEc.code}`);
                  setTimeout(() => setSaveSuccessNotice(null), 2500);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  !isDirect100
                    ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-400'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Formule 40/60
              </button>
              <button
                type="button"
                onClick={() => {
                  updateEc(selectedEc.id, { quizWeight: 0, examWeight: 1.0 });
                  setSaveSuccessNotice(`Mode Direct 100% activé pour ${selectedEc.code} !`);
                  setTimeout(() => setSaveSuccessNotice(null), 2500);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isDirect100
                    ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Direct 100% (Sans 40/60)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grade Entry Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Matricule & Nom Étudiant</th>
                {!isDirect100 ? (
                  <>
                    <th className="py-3 px-4 text-center w-28">Quiz / CC (40%)</th>
                    <th className="py-3 px-4 text-center w-28">Examen (60%)</th>
                  </>
                ) : (
                  <th className="py-3 px-4 text-center w-40 text-emerald-700">
                    Note Unique (100% / sur 20)
                  </th>
                )}
                <th className="py-3 px-4 text-center w-28 font-bold text-blue-700">Note Finale</th>
                <th className="py-3 px-4 text-center w-28">Statut</th>
                <th className="py-3 px-4">Commentaire pédagogique</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={isDirect100 ? 6 : 7} className="py-8 text-center text-slate-400 italic">
                    Aucun étudiant trouvé dans ce groupe.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st) => {
                  const savedGrade = getStudentEcGrade(st.id, selectedEcId);
                  const currentVals = getInputValue(st.id);
                  const liveFinal = computeLiveFinal(currentVals.quiz, currentVals.exam);
                  const displayFinal = liveFinal !== null ? liveFinal : savedGrade?.finalScore;
                  const isPassed = displayFinal !== undefined && displayFinal >= 10.0;

                  return (
                    <tr key={st.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800">{st.name}</div>
                        <span className="font-mono text-[10px] text-blue-600">{st.matricule || 'N/A'}</span>
                      </td>

                      {/* Standard 40/60 inputs */}
                      {!isDirect100 ? (
                        <>
                          <td className="py-3 px-4 text-center">
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              max="20"
                              placeholder="Note /20"
                              value={currentVals.quiz}
                              onChange={(e) => handleInputChange(st.id, 'quiz', e.target.value)}
                              className="w-20 text-center font-bold text-slate-800 border border-slate-300 rounded-lg py-1 px-1.5 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                          </td>
                          <td className="py-3 px-4 text-center">
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              max="20"
                              placeholder="Note /20"
                              value={currentVals.exam}
                              onChange={(e) => handleInputChange(st.id, 'exam', e.target.value)}
                              className="w-20 text-center font-bold text-slate-800 border border-slate-300 rounded-lg py-1 px-1.5 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                          </td>
                        </>
                      ) : (
                        /* Direct 100% single input */
                        <td className="py-3 px-4 text-center">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max="20"
                            placeholder="Note 100% /20"
                            value={currentVals.exam !== '' ? currentVals.exam : currentVals.quiz}
                            onChange={(e) => {
                              handleInputChange(st.id, 'exam', e.target.value);
                            }}
                            className="w-28 text-center font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-lg py-1 px-2 focus:ring-2 focus:ring-emerald-500 outline-none"
                          />
                        </td>
                      )}

                      {/* Live Calculated Final Score */}
                      <td className="py-3 px-4 text-center">
                        {displayFinal !== undefined ? (
                          <span
                            className={`font-black text-sm px-2 py-0.5 rounded ${
                              isPassed
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {displayFinal.toFixed(2)} / 20
                          </span>
                        ) : (
                          <span className="text-slate-300 italic">-</span>
                        )}
                      </td>

                      {/* Publication Status */}
                      <td className="py-3 px-4 text-center">
                        {savedGrade?.isPublished ? (
                          <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full text-[10px]">
                            Publiée
                          </span>
                        ) : (
                          <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full text-[10px]">
                            Brouillon
                          </span>
                        )}
                      </td>

                      {/* Comment */}
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          placeholder="Appréciation (facultatif)"
                          value={currentVals.comment}
                          onChange={(e) => handleInputChange(st.id, 'comment', e.target.value)}
                          className="w-full text-xs border border-slate-200 rounded-lg py-1 px-2 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleSaveStudentGrade(st.id, true)}
                          className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                          title="Enregistrer le brouillon"
                        >
                          <Save className="w-3.5 h-3.5" />
                          Sauver
                        </button>
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
  );
};
