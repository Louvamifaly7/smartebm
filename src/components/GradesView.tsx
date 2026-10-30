import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  Award,
  CheckCircle2,
  AlertCircle,
  Send,
  Save,
  Printer,
  Lock,
  BookOpen,
  UserCheck,
  TrendingUp,
  Info,
  Scale,
  ShieldAlert,
  Sparkles,
  FileSpreadsheet,
  Unlock,
  RotateCcw,
  FileText,
  Calendar,
  GraduationCap,
} from 'lucide-react';
import { DeliberationDecision, SemesterCode } from '../types';
import { exportToCsv } from '../utils/csvExport';

export const GradesView: React.FC = () => {
  const {
    currentUser,
    ues,
    ecs,
    users,
    groups,
    filieres,
    parcours,
    grades,
    academicYears,
    selectedAcademicYear,
    setSelectedAcademicYear,
    saveGrade,
    publishGrades,
    calculateEcFinalScore,
    getStudentEcGrade,
    getStudentUeSummary,
    getActiveAcademicRules,
    computeStudentDeliberationPreview,
    saveDeliberationRecord,
    lockGroupDeliberations,
  } = useApp();

  const isStudent = currentUser.role === 'STUDENT';
  const isParent = currentUser.role === 'PARENT';
  const canDeliberate = ['ADMIN', 'SCOLARITE', 'SCHEDULER', 'ACADEMIC_HEAD'].includes(currentUser.role);

  const [activeSubTab, setActiveSubTab] = useState<'SAISIE_NOTES' | 'RELEVES_OFFICIELS' | 'DELIBERATION'>('SAISIE_NOTES');

  // Filter by semester (S1 to S10) and Parcours LMD in Saisie, Relevés & Délibérations
  const [gradeSemesterFilter, setGradeSemesterFilter] = useState<'ALL' | SemesterCode>('ALL');
  const [selectedParcoursFilter, setSelectedParcoursFilter] = useState<string>('ALL');

  const availableEcs =
    currentUser.role === 'TEACHER'
      ? ecs.filter((ec) => ec.teacherIds.includes(currentUser.id))
      : ecs;

  const filteredEcs = useMemo(() => {
    return availableEcs.filter((ec) => {
      if (gradeSemesterFilter !== 'ALL' && ec.semester !== gradeSemesterFilter) return false;
      if (selectedParcoursFilter !== 'ALL') {
        const ue = ues.find((u) => u.id === ec.ueId);
        const targetParc = parcours.find((p) => p.id === selectedParcoursFilter);
        if (ue?.parcoursId && ue.parcoursId !== selectedParcoursFilter) return false;
        if (targetParc && ue && ue.filiereId !== targetParc.filiereId) return false;
      }
      return true;
    });
  }, [availableEcs, gradeSemesterFilter, selectedParcoursFilter, ues, parcours]);

  const [selectedEcId, setSelectedEcId] = useState<string>(availableEcs[0]?.id || '');
  const selectedEc = filteredEcs.find((e) => e.id === selectedEcId) || filteredEcs[0] || availableEcs[0];
  const parentUe = ues.find((u) => u.id === selectedEc?.ueId);

  // Helper to resolve a student's parcoursId
  const getStudentParcoursId = (st: typeof currentUser) => {
    if (st.parcoursId) return st.parcoursId;
    const grp = groups.find((g) => g.id === st.groupId);
    if (grp?.parcoursId) return grp.parcoursId;
    const defaultParc = parcours.find((p) => p.filiereId === grp?.filiereId && p.level === grp?.level);
    return defaultParc?.id || '';
  };

  // Transcript ("Relevé de notes") state: Student selection & Mode (Par Semestre vs 1 Page sur 1 Année)
  const allStudents = useMemo(() => {
    return users.filter((u) => {
      if (u.role !== 'STUDENT') return false;
      if (selectedParcoursFilter !== 'ALL') {
        return getStudentParcoursId(u) === selectedParcoursFilter;
      }
      return true;
    });
  }, [users, selectedParcoursFilter, groups, parcours]);

  const [transcriptStudentId, setTranscriptStudentId] = useState<string>(() => {
    if (isStudent) return currentUser.id;
    if (isParent && currentUser.linkedStudentIds?.[0]) return currentUser.linkedStudentIds[0];
    return users.find((u) => u.role === 'STUDENT')?.id || 'user-student-laurent';
  });
  const [transcriptMode, setTranscriptMode] = useState<'ANNUEL_1_PAGE' | 'SEMESTRE'>('ANNUEL_1_PAGE');
  const [transcriptSemester, setTranscriptSemester] = useState<SemesterCode>('S1');
  const [transcriptAnnualPair, setTranscriptAnnualPair] = useState<'AUTO' | 'S1_S2' | 'S3_S4' | 'S5_S6' | 'S7_S8' | 'S9_S10'>('AUTO');

  // Deliberation state
  const [delibGroupId, setDelibGroupId] = useState<string>(groups[0]?.id || 'grp-l1-info-a');
  const [delibSemester, setDelibSemester] = useState<SemesterCode | 'ANNUEL'>('ANNUEL');
  const [bonusEdits, setBonusEdits] = useState<Record<string, number>>({});
  const [decisionEdits, setDecisionEdits] = useState<Record<string, DeliberationDecision>>({});
  const [obsEdits, setObsEdits] = useState<Record<string, string>>({});
  const [delibBanner, setDelibBanner] = useState<string | null>(null);

  // Local state for editing grades (including rattrapageScore)
  const [localScores, setLocalScores] = useState<{
    [studentId: string]: { quiz?: string; exam?: string; rattrapage?: string; comment?: string };
  }>({});
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const studentsInEcGroups = selectedEc
    ? users.filter((u) => {
        if (u.role !== 'STUDENT') return false;
        if (u.groupId && !selectedEc.groupIds.includes(u.groupId)) return false;
        if (selectedParcoursFilter !== 'ALL' && getStudentParcoursId(u) !== selectedParcoursFilter) return false;
        return true;
      })
    : [];

  const handleScoreChange = (
    studentId: string,
    field: 'quiz' | 'exam' | 'rattrapage' | 'comment',
    value: string
  ) => {
    const existingGrade = selectedEc ? getStudentEcGrade(studentId, selectedEc.id) : undefined;
    const current = localScores[studentId] || {
      quiz: existingGrade?.quizScore !== undefined ? String(existingGrade.quizScore) : '',
      exam: existingGrade?.examScore !== undefined ? String(existingGrade.examScore) : '',
      rattrapage: existingGrade?.rattrapageScore !== undefined ? String(existingGrade.rattrapageScore) : '',
      comment: existingGrade?.comment || '',
    };

    setLocalScores({
      ...localScores,
      [studentId]: {
        ...current,
        [field]: value,
      },
    });
  };

  const handleSaveStudentGrade = (studentId: string, isDraft: boolean) => {
    if (!selectedEc) return;
    const existing = getStudentEcGrade(studentId, selectedEc.id);
    const local = localScores[studentId];

    const quizVal =
      local?.quiz !== undefined ? (local.quiz === '' ? undefined : parseFloat(local.quiz)) : existing?.quizScore;
    const examVal =
      local?.exam !== undefined ? (local.exam === '' ? undefined : parseFloat(local.exam)) : existing?.examScore;
    const rattrapageVal =
      local?.rattrapage !== undefined
        ? local.rattrapage === ''
          ? undefined
          : parseFloat(local.rattrapage)
        : existing?.rattrapageScore;
    const commentVal = local?.comment !== undefined ? local.comment : existing?.comment;

    if (quizVal !== undefined && (isNaN(quizVal) || quizVal < 0 || quizVal > 20)) return;
    if (examVal !== undefined && (isNaN(examVal) || examVal < 0 || examVal > 20)) return;
    if (rattrapageVal !== undefined && (isNaN(rattrapageVal) || rattrapageVal < 0 || rattrapageVal > 20)) return;

    saveGrade(studentId, selectedEc.id, quizVal, examVal, isDraft, commentVal, rattrapageVal);
    setFeedbackMsg(
      isDraft
        ? 'Note (et/ou rattrapage) enregistrée en brouillon.'
        : 'Note validée et publiée pour cet étudiant.'
    );
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const handleSaveAllDrafts = () => {
    if (!selectedEc) return;
    studentsInEcGroups.forEach((st) => {
      if (localScores[st.id]) {
        handleSaveStudentGrade(st.id, true);
      }
    });
    setFeedbackMsg('Toutes les notes modifiées (y compris rattrapages) ont été sauvegardées.');
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  const handlePublishAll = () => {
    if (!selectedEc) return;
    handleSaveAllDrafts();
    publishGrades(selectedEc.id);
    setFeedbackMsg(
      `Publication officielle effectuée pour ${selectedEc.code} ! Les étudiants ont reçu une notification.`
    );
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const activeRules = getActiveAcademicRules(selectedAcademicYear);
  const delibStudents = useMemo(
    () =>
      users.filter((u) => {
        if (u.role !== 'STUDENT') return false;
        if (u.groupId !== delibGroupId) return false;
        if (selectedParcoursFilter !== 'ALL' && getStudentParcoursId(u) !== selectedParcoursFilter) return false;
        return true;
      }),
    [users, delibGroupId, selectedParcoursFilter, groups, parcours]
  );

  const getDecisionBadge = (decision: DeliberationDecision, isAnnual: boolean = false) => {
    switch (decision) {
      case 'ADMIS':
        return (
          <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
            {isAnnual ? 'ADMIS(E) EN ANNÉE SUPÉRIEURE' : 'ADMIS DIRECT'}
          </span>
        );
      case 'ADMIS_COMPENSATION':
        return (
          <span className="px-2.5 py-1 rounded-full bg-teal-100 text-teal-800 font-bold text-[11px]">
            {isAnnual ? 'ADMIS(E) PAR COMPENSATION ANNUELLE' : 'ADMIS PAR COMPENSATION'}
          </span>
        );
      case 'PASSAGE_CONDITIONNEL':
        return (
          <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-bold text-[11px]">
            PASSAGE CONDITIONNEL (DETTE D’UE)
          </span>
        );
      case 'AJOURNE':
        return (
          <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-bold text-[11px]">
            {isAnnual ? 'REDOUBLEMENT AUTORISÉ / AJOURNÉ(E)' : 'SESSION DE RATTRAPAGE / AJOURNÉ'}
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-bold text-[11px]">
            EN ATTENTE
          </span>
        );
    }
  };

  // Helper to render the Official Transcript (By Semester OR 1-Page Full Academic Year) for any student
  const renderOfficialTranscript = (targetStudentId: string) => {
    const targetStudent = users.find((u) => u.id === targetStudentId) || currentUser;
    const studentGroup = groups.find((g) => g.id === targetStudent.groupId);
    const studentFiliere = filieres.find((f) => f.id === studentGroup?.filiereId);
    const studentParcours = parcours.find(
      (p) => p.id === targetStudent.parcoursId || p.id === studentGroup?.parcoursId || p.filiereId === studentFiliere?.id
    );

    const yearUes = ues.filter((u) => u.academicYear === selectedAcademicYear);
    const levelSemMap: Record<string, [SemesterCode, SemesterCode, string, string]> = {
      L1: ['S1', 'S2', 'Premier Semestre Académique (S1)', 'Deuxième Semestre Académique (S2)'],
      L2: ['S3', 'S4', 'Troisième Semestre Académique (S3)', 'Quatrième Semestre Académique (S4)'],
      L3: ['S5', 'S6', 'Cinquième Semestre Académique (S5)', 'Sixième Semestre Académique (S6)'],
      M1: ['S7', 'S8', 'Septième Semestre Master 1 (S7)', 'Huitième Semestre Master 1 (S8)'],
      M2: ['S9', 'S10', 'Neuvième Semestre Master 2 (S9)', 'Dixième Semestre Master 2 (S10)'],
    };
    const pairKeyMap: Record<string, [SemesterCode, SemesterCode, string, string]> = {
      S1_S2: levelSemMap.L1,
      S3_S4: levelSemMap.L2,
      S5_S6: levelSemMap.L3,
      S7_S8: levelSemMap.M1,
      S9_S10: levelSemMap.M2,
    };
    const [semA, semB, semATitle, semBTitle] =
      transcriptAnnualPair !== 'AUTO' && pairKeyMap[transcriptAnnualPair]
        ? pairKeyMap[transcriptAnnualPair]
        : levelSemMap[studentGroup?.level || 'L1'] || levelSemMap.L1;

    const s1Ues = yearUes.filter((u) => u.semester === semA);
    const s2Ues = yearUes.filter((u) => u.semester === semB);

    const computeSemesterStats = (semUes: typeof yearUes) => {
      let totalCr = 0;
      let valCr = 0;
      let weightedSum = 0;
      let rattrapageCount = 0;

      const summaries = semUes.map((ue) => {
        const s = getStudentUeSummary(targetStudent.id, ue.id);
        totalCr += s.totalCredits;
        valCr += s.validatedCredits;
        weightedSum += s.average * s.totalCredits;
        s.ecDetails.forEach((d) => {
          if (d.grade?.rattrapageScore !== undefined || (d.grade?.finalScore !== undefined && d.grade.finalScore < 10)) {
            rattrapageCount++;
          }
        });
        return { ue, summary: s };
      });

      const avg = totalCr > 0 ? Number((weightedSum / totalCr).toFixed(2)) : 0;
      return { summaries, totalCr, valCr, avg, rattrapageCount };
    };

    const s1Stats = computeSemesterStats(s1Ues);
    const s2Stats = computeSemesterStats(s2Ues);
    const annualPreview = computeStudentDeliberationPreview(targetStudent.id, selectedAcademicYear, 'ANNUEL');

    // Official Annual Progression Decision (Redoublement / Passage en classe supérieure)
    const getAnnualDecisionLabel = () => {
      const nextLevelMap: Record<string, string> = {
        L1: 'Licence 2 (L2)',
        L2: 'Licence 3 (L3)',
        L3: 'Master 1 (M1) / Diplômé Licence',
        M1: 'Master 2 (M2)',
        M2: 'Diplômé Master (Grade Master)',
      };
      const currentLvl = studentGroup?.level || 'L1';
      const nextLvl = nextLevelMap[currentLvl] || 'Année supérieure';

      if (annualPreview.proposedDecision === 'ADMIS') {
        return {
          title: `ADMIS(E) EN ${nextLvl.toUpperCase()}`,
          subtitle: 'Validation intégrale de l’année académique (Session normale / Rattrapage inclus).',
          color: 'bg-emerald-50 border-emerald-300 text-emerald-900',
          badge: 'bg-emerald-600 text-white',
        };
      }
      if (annualPreview.proposedDecision === 'ADMIS_COMPENSATION') {
        return {
          title: `ADMIS(E) EN ${nextLvl.toUpperCase()} PAR COMPENSATION ANNUELLE`,
          subtitle: 'Compensation inter-semestrielle (S1 + S2) validée par le Jury LMD.',
          color: 'bg-teal-50 border-teal-300 text-teal-900',
          badge: 'bg-teal-600 text-white',
        };
      }
      if (annualPreview.proposedDecision === 'PASSAGE_CONDITIONNEL') {
        return {
          title: `PASSAGE CONDITIONNEL EN ${nextLvl.toUpperCase()} (AVEC DETTE D'UE)`,
          subtitle: 'Autorisé(e) à passer en année supérieure avec obligation de valider les EC ajournés.',
          color: 'bg-amber-50 border-amber-300 text-amber-900',
          badge: 'bg-amber-600 text-white',
        };
      }
      return {
        title: `REDOUBLEMENT DE L'ANNÉE ${currentLvl} (AJOURNÉ)`,
        subtitle: 'Moyenne annuelle ou crédits ECTS insuffisants après session de rattrapage. Redoublement autorisé.',
        color: 'bg-rose-50 border-rose-300 text-rose-900',
        badge: 'bg-rose-600 text-white',
      };
    };

    const annualDecision = getAnnualDecisionLabel();

    const renderSemesterBlock = (
      semTitle: string,
      semCode: string,
      stats: ReturnType<typeof computeSemesterStats>,
      compact: boolean = false
    ) => (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="bg-slate-900 text-white px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-blue-600 text-white font-mono font-black text-xs rounded">
              {semCode}
            </span>
            <h4 className="font-bold text-xs sm:text-sm uppercase tracking-wider">{semTitle}</h4>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span>
              Moyenne {semCode} :{' '}
              <strong className={stats.avg >= 10 ? 'text-emerald-400' : 'text-amber-300'}>
                {stats.avg.toFixed(2)} / 20
              </strong>
            </span>
            <span>
              Crédits validés :{' '}
              <strong className="text-blue-300">
                {stats.valCr} / {stats.totalCr} ECTS
              </strong>
            </span>
          </div>
        </div>

        <div className="divide-y divide-slate-200">
          {stats.summaries.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 italic">
              Aucune UE configurée pour le semestre {semCode} ({selectedAcademicYear}).
            </div>
          ) : (
            stats.summaries.map(({ ue, summary }) => (
              <div key={ue.id} className="p-3 sm:p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 font-mono font-bold text-[11px] border border-blue-200">
                      {ue.code}
                    </span>
                    <span className="font-bold text-slate-900 text-xs sm:text-sm">{ue.title}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-slate-500">
                      Moy. UE :{' '}
                      <strong className={summary.isPassed ? 'text-emerald-700' : 'text-rose-600'}>
                        {summary.average.toFixed(2)} / 20
                      </strong>
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        summary.isPassed
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {summary.isPassed ? `UE VALIDÉE (${ue.creditsEcts} ECTS)` : 'UE NON VALIDÉE (0 ECTS)'}
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="text-[10px] uppercase text-slate-400 border-b border-slate-100">
                        <th className="py-1.5 pr-2">Code & Élément Constitutif (EC)</th>
                        <th className="py-1.5 px-2 text-center">Crédits</th>
                        <th className="py-1.5 px-2 text-center">Contrôle Continu (CC)</th>
                        <th className="py-1.5 px-2 text-center">Examen</th>
                        <th className="py-1.5 px-2 text-center">Session 1</th>
                        <th className="py-1.5 px-2 text-center bg-amber-50/70 text-amber-800">Rattrapage (S2)</th>
                        <th className="py-1.5 px-2 text-center">Note Retenue</th>
                        <th className="py-1.5 pl-2 text-right">Statut EC</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {summary.ecDetails.map(({ ec, grade }) => {
                        const s1Score =
                          grade?.session1Score ??
                          calculateEcFinalScore(grade?.quizScore, grade?.examScore, ec.id);
                        const rattrapage = grade?.rattrapageScore;
                        const retained = grade?.finalScore;
                        const needsRattrapage = s1Score !== undefined && s1Score < 10 && rattrapage === undefined;
                        const passedAfterRattrapage =
                          rattrapage !== undefined && (retained ?? 0) >= 10 && (s1Score ?? 0) < 10;

                        return (
                          <tr key={ec.id} className="hover:bg-slate-50/80">
                            <td className="py-1.5 pr-2">
                              <span className="font-mono font-bold text-slate-600 mr-1.5">{ec.code}</span>
                              <span className="font-medium text-slate-800">{ec.title}</span>
                              {!compact && grade?.comment && (
                                <p className="text-[10px] text-slate-500 italic mt-0.5">« {grade.comment} »</p>
                              )}
                            </td>
                            <td className="py-1.5 px-2 text-center text-slate-500 font-semibold">
                              {ec.creditsEcts} ECTS
                            </td>
                            <td className="py-1.5 px-2 text-center font-mono text-slate-600">
                              {grade?.quizScore !== undefined ? `${grade.quizScore.toFixed(2)}` : '—'}
                            </td>
                            <td className="py-1.5 px-2 text-center font-mono text-slate-600">
                              {grade?.examScore !== undefined ? `${grade.examScore.toFixed(2)}` : '—'}
                            </td>
                            <td className="py-1.5 px-2 text-center font-mono font-semibold text-slate-700">
                              {s1Score !== undefined ? `${s1Score.toFixed(2)}` : '—'}
                            </td>
                            <td className="py-1.5 px-2 text-center font-mono bg-amber-50/40">
                              {rattrapage !== undefined ? (
                                <span className="font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                                  {rattrapage.toFixed(2)} / 20
                                </span>
                              ) : needsRattrapage ? (
                                <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                                  À rattraper
                                </span>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                            <td className="py-1.5 px-2 text-center font-mono font-black">
                              {retained !== undefined ? (
                                <span className={retained >= 10 ? 'text-emerald-700' : 'text-rose-600'}>
                                  {retained.toFixed(2)} / 20
                                </span>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="py-1.5 pl-2 text-right">
                              {retained === undefined ? (
                                <span className="text-[10px] text-slate-400 italic">En cours</span>
                              ) : passedAfterRattrapage ? (
                                <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                                  Validé après Rattrapage
                                </span>
                              ) : retained >= 10 ? (
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                                  Validé (Session 1)
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
                                  Ajourné (Rattrapage)
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );

    const activeSemUes = yearUes.filter((u) => u.semester === transcriptSemester);
    const activeSemStats = computeSemesterStats(activeSemUes);

    return (
      <div className="space-y-4">
        {/* Controls Bar for Transcript Mode (Semestriel vs Annuel 1 Page) */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3 print:hidden">
          <div className="flex flex-wrap items-center gap-3">
            {!isStudent && (
              <>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Filtrer par Parcours LMD
                  </label>
                  <select
                    value={selectedParcoursFilter}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedParcoursFilter(val);
                      const nextStudents = users.filter(
                        (u) => u.role === 'STUDENT' && (val === 'ALL' || getStudentParcoursId(u) === val)
                      );
                      if (nextStudents[0]) setTranscriptStudentId(nextStudents[0].id);
                    }}
                    className="px-3 py-2 rounded-xl border border-indigo-200 bg-indigo-50/60 text-xs font-bold text-indigo-900"
                  >
                    <option value="ALL">Tous les Parcours ({parcours.length})</option>
                    {parcours.map((p) => (
                      <option key={p.id} value={p.id}>
                        [{p.level}] {p.code} — {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Étudiant sélectionné ({allStudents.length})
                  </label>
                  <select
                    value={targetStudent.id}
                    onChange={(e) => setTranscriptStudentId(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs font-bold text-slate-900"
                  >
                    {allStudents.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.matricule} — {st.name} ({groups.find((g) => g.id === st.groupId)?.code || 'L1'})
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Année Académique
              </label>
              <select
                value={selectedAcademicYear}
                onChange={(e) => setSelectedAcademicYear(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs font-bold text-blue-900"
              >
                {academicYears.map((ay) => (
                  <option key={ay.id} value={ay.code}>
                    {ay.code} {ay.isCurrent ? '(Active)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Format d'affichage du Relevé de Notes
              </label>
              <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => setTranscriptMode('ANNUEL_1_PAGE')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    transcriptMode === 'ANNUEL_1_PAGE'
                      ? 'bg-blue-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  Relevé Annuel sur 1 Page ({semA} + {semB} & Décision Jury)
                </button>
                <button
                  type="button"
                  onClick={() => setTranscriptMode('SEMESTRE')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    transcriptMode === 'SEMESTRE'
                      ? 'bg-blue-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Relevé par Semestre (S1 à S10)
                </button>
              </div>
            </div>

            {transcriptMode === 'ANNUEL_1_PAGE' && (
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Semestres de l'Année (S1 à S10)
                </label>
                <select
                  value={transcriptAnnualPair}
                  onChange={(e) => setTranscriptAnnualPair(e.target.value as any)}
                  className="px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs font-bold text-slate-800"
                >
                  <option value="AUTO">Automatique selon Niveau ({semA} + {semB})</option>
                  <option value="S1_S2">Licence 1 (L1) : Semestres S1 & S2</option>
                  <option value="S3_S4">Licence 2 (L2) : Semestres S3 & S4</option>
                  <option value="S5_S6">Licence 3 (L3) : Semestres S5 & S6</option>
                  <option value="S7_S8">Master 1 (M1) : Semestres S7 & S8</option>
                  <option value="S9_S10">Master 2 (M2) : Semestres S9 & S10</option>
                </select>
              </div>
            )}

            {transcriptMode === 'SEMESTRE' && (
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Choisir le Semestre (S1 à S10)
                </label>
                <div className="flex flex-wrap gap-1">
                  {(['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10'] as SemesterCode[]).map((sem) => (
                    <button
                      key={sem}
                      type="button"
                      onClick={() => setTranscriptSemester(sem)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                        transcriptSemester === sem
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {sem}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer shrink-0"
          >
            <Printer className="w-4 h-4" />
            Imprimer Relevé {transcriptMode === 'ANNUEL_1_PAGE' ? `Annuel (${semA}+${semB})` : `Semestre ${transcriptSemester}`}
          </button>
        </div>

        {/* Printable Official Document */}
        <div className="bg-white rounded-3xl p-6 border-2 border-slate-300 shadow-sm space-y-5 print:border-0 print:shadow-none print:p-0">
          {/* Official University Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b-2 border-slate-900">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex flex-col items-center justify-center font-black shrink-0">
                <span className="text-base leading-none">EBM</span>
                <span className="text-[8px] tracking-widest text-amber-400 uppercase mt-0.5">Institute</span>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-700">
                  République de Madagascar • Enseignement Supérieur LMD
                </p>
                <h3 className="text-lg font-black text-slate-900 uppercase">
                  {transcriptMode === 'ANNUEL_1_PAGE'
                    ? `RELEVÉ DE NOTES ET RÉSULTATS ANNUELS (${studentGroup?.level || 'L1'} — ${semA} & ${semB})`
                    : `RELEVÉ DE NOTES SEMESTRIEL — SEMESTRE ${transcriptSemester}`}
                </h3>
                <p className="text-xs text-slate-600 font-medium">
                  Domaine : <strong>{studentFiliere?.domaine || 'Sciences et Technologies'}</strong> • Mention :{' '}
                  <strong>{studentFiliere?.name || 'Informatique'}</strong> • Parcours :{' '}
                  <strong>{studentParcours?.name || 'Tronc Commun'}</strong>
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs space-y-1 min-w-[240px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Étudiant(e) :</span>
                <span className="font-black text-slate-900">{targetStudent.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Matricule :</span>
                <span className="font-mono font-bold text-blue-700">{targetStudent.matricule || 'EBM-2026'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Promotion / Année :</span>
                <span className="font-bold text-slate-800">
                  {studentGroup?.code || 'L1-INFO-A'} • {selectedAcademicYear}
                </span>
              </div>
            </div>
          </div>

          {transcriptMode === 'ANNUEL_1_PAGE' ? (
            <>
              {/* Consolidated 1-Page Annual View: Semestre A + Semestre B */}
              <div className="space-y-4">
                {renderSemesterBlock(semATitle, semA, s1Stats, true)}
                {renderSemesterBlock(semBTitle, semB, s2Stats, true)}
              </div>

              {/* Annual Summary & Official Jury Progression Decision Box (Passage / Redoublement) */}
              <div className={`p-5 rounded-2xl border-2 ${annualDecision.color} space-y-3`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase ${annualDecision.badge}`}>
                        DÉCISION ANNUELLE DU JURY LMD ({selectedAcademicYear})
                      </span>
                      <span className="text-xs font-bold opacity-80">
                        • Bilan Consolidé sur 1 Page (S1 + S2)
                      </span>
                    </div>
                    <h4 className="text-lg font-black tracking-tight">{annualDecision.title}</h4>
                    <p className="text-xs opacity-90">{annualDecision.subtitle}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-3 bg-white/90 p-3 rounded-xl border border-slate-200 text-center shrink-0">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Moyenne Annuelle</span>
                      <span className="text-lg font-black text-slate-900">
                        {annualPreview.finalAverage.toFixed(2)} <span className="text-xs font-normal">/ 20</span>
                      </span>
                    </div>
                    <div className="border-x border-slate-200 px-3">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Crédits Annuels</span>
                      <span className="text-lg font-black text-blue-700">
                        {annualPreview.validatedCredits}/{annualPreview.totalCreditsAttempted || 60}{' '}
                        <span className="text-[10px]">ECTS</span>
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Assiduité</span>
                      <span className="text-lg font-black text-emerald-700">{annualPreview.attendanceRate}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Single Semester View */
            <div className="space-y-4">
              {renderSemesterBlock(
                `Unités d'Enseignement du Semestre ${transcriptSemester}`,
                transcriptSemester,
                activeSemStats,
                false
              )}

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    Bilan Semestriel ({transcriptSemester})
                  </span>
                  <p className="font-bold text-slate-800 mt-0.5">
                    Note : La décision finale de passage en classe supérieure ou de redoublement est prononcée sur le{' '}
                    <button
                      type="button"
                      onClick={() => setTranscriptMode('ANNUEL_1_PAGE')}
                      className="text-blue-700 underline font-black cursor-pointer"
                    >
                      Relevé Annuel Consolidé (1 Page)
                    </button>
                    .
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-slate-500 block">Moyenne {transcriptSemester}</span>
                    <strong className="text-base font-black text-slate-900">{activeSemStats.avg.toFixed(2)} / 20</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 block">Crédits {transcriptSemester}</span>
                    <strong className="text-base font-black text-blue-700">
                      {activeSemStats.valCr} / {activeSemStats.totalCr} ECTS
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (isStudent || isParent) {
    return (
      <div className="space-y-6">
        {/* Student / Parent Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center">
                <Award className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-widest text-amber-400">
                  Portail Académique LMD • Relevés Semestriels & Bilan Annuel (1 Page)
                </span>
                <h2 className="text-xl font-bold">
                  Notes, Rattrapages EC & Décision Annuelle ({selectedAcademicYear})
                </h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  Consultez vos résultats par semestre (S1, S2) et votre relevé annuel sur 1 page avec décision de passage ou redoublement.
                </p>
              </div>
            </div>
          </div>
        </div>

        {renderOfficialTranscript(isStudent ? currentUser.id : transcriptStudentId)}
      </div>
    );
  }

  // TEACHER / ADMIN / SCOLARITÉ / ACADEMIC_HEAD VIEW
  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Notes, Session de Rattrapage EC, Relevés (Semestriel & Annuel 1 Page) & Jury
            </h2>
            <p className="text-xs text-slate-500">
              Saisie des notes de Contrôle Continu, Examen et Rattrapage EC, Relevés par semestre et sur 1 page annuelle avec décision de passage/redoublement
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Sub-navigation Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveSubTab('SAISIE_NOTES')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'SAISIE_NOTES'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              1. Saisie Notes & Rattrapage EC
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('RELEVES_OFFICIELS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'RELEVES_OFFICIELS'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              2. Relevés (Par Semestre & 1 Page Année)
            </button>
            {canDeliberate && (
              <button
                type="button"
                onClick={() => setActiveSubTab('DELIBERATION')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeSubTab === 'DELIBERATION'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Scale className="w-3.5 h-3.5" />
                3. Délibérations & PV Annuel
              </button>
            )}
          </div>
        </div>
      </div>

      {feedbackMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          {feedbackMsg}
        </div>
      )}

      {/* SUB-TAB 2: RELEVÉS DE NOTES OFFICIELS (PAR SEMESTRE ET 1 PAGE SUR L'ANNÉE) */}
      {activeSubTab === 'RELEVES_OFFICIELS' && renderOfficialTranscript(transcriptStudentId)}

      {/* SUB-TAB 1: SAISIE DES NOTES & RATTRAPAGES EC */}
      {activeSubTab === 'SAISIE_NOTES' && (
        <>
          {/* Filter Bar: Academic Year, Semester & EC Selector */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Année Académique
                </label>
                <select
                  value={selectedAcademicYear}
                  onChange={(e) => setSelectedAcademicYear(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs font-bold text-slate-900"
                >
                  {academicYears.map((ay) => (
                    <option key={ay.id} value={ay.code}>
                      {ay.code}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Filtrer par Semestre (S1 à S10)
                </label>
                <div className="flex flex-wrap bg-slate-100 p-1 rounded-xl gap-1">
                  {(['ALL', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10'] as const).map((sem) => (
                    <button
                      key={sem}
                      type="button"
                      onClick={() => {
                        setGradeSemesterFilter(sem);
                        const nextList =
                          sem === 'ALL' ? availableEcs : availableEcs.filter((e) => e.semester === sem);
                        if (nextList[0]) setSelectedEcId(nextList[0].id);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                        gradeSemesterFilter === sem
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {sem === 'ALL' ? 'Tous (S1–S10)' : sem}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Filtrer par Parcours LMD
                </label>
                <select
                  value={selectedParcoursFilter}
                  onChange={(e) => setSelectedParcoursFilter(e.target.value)}
                  className="px-3.5 py-2 rounded-xl border border-indigo-200 bg-indigo-50/60 text-xs font-bold text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ALL">Tous les Parcours ({parcours.length})</option>
                  {parcours.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.level}] {p.code} — {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Élément Constitutif (EC)
                </label>
                <select
                  value={selectedEc?.id || ''}
                  onChange={(e) => {
                    setSelectedEcId(e.target.value);
                    setLocalScores({});
                  }}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {filteredEcs.map((ec) => (
                    <option key={ec.id} value={ec.id}>
                      [{ec.semester}] {ec.code} — {ec.title} ({ec.creditsEcts} ECTS)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveAllDrafts}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                <Save className="w-4 h-4" />
                Enregistrer Brouillon
              </button>

              <button
                onClick={handlePublishAll}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Send className="w-4 h-4" />
                Publier Notes & Rattrapages
              </button>
            </div>
          </div>

          {/* Selected EC Metadata Card */}
          {selectedEc && (
            <div className="bg-gradient-to-r from-blue-50 via-indigo-50/60 to-amber-50/40 rounded-2xl p-4 border border-blue-200/70 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1.5 rounded-xl bg-blue-600 text-white font-mono font-bold text-xs">
                  {selectedEc.code} • {selectedEc.semester}
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{selectedEc.title}</h3>
                  <p className="text-xs text-slate-600">
                    UE de rattachement : <strong>{parentUe?.code}</strong> ({parentUe?.title}) •{' '}
                    <strong>{selectedEc.creditsEcts} crédits ECTS</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <div className="bg-white px-3 py-1.5 rounded-xl border border-blue-200 font-semibold text-blue-900 flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                  Session 1 (CC + Examen) +{' '}
                  <strong className="text-amber-700">Colonne Rattrapage (2e Session)</strong>
                </div>
              </div>
            </div>
          )}

          {/* Grade Entry Table with Rattrapage Support */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Étudiant</th>
                    <th className="py-3.5 px-3 text-center">Contrôle Continu (CC)</th>
                    <th className="py-3.5 px-3 text-center">Examen S1</th>
                    <th className="py-3.5 px-3 text-center">Moy. Session 1</th>
                    <th className="py-3.5 px-3 text-center bg-amber-50/80 text-amber-900 border-x border-amber-200">
                      Note Rattrapage (/20)
                    </th>
                    <th className="py-3.5 px-3 text-center">Note Finale Retenue</th>
                    <th className="py-3.5 px-3">Appréciation / Motif Rattrapage</th>
                    <th className="py-3.5 px-3 text-center">Statut</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {studentsInEcGroups.map((student) => {
                    const savedGrade = selectedEc ? getStudentEcGrade(student.id, selectedEc.id) : undefined;
                    const local = localScores[student.id];

                    const quizStr =
                      local?.quiz !== undefined
                        ? local.quiz
                        : savedGrade?.quizScore !== undefined
                        ? String(savedGrade.quizScore)
                        : '';
                    const examStr =
                      local?.exam !== undefined
                        ? local.exam
                        : savedGrade?.examScore !== undefined
                        ? String(savedGrade.examScore)
                        : '';
                    const rattrapageStr =
                      local?.rattrapage !== undefined
                        ? local.rattrapage
                        : savedGrade?.rattrapageScore !== undefined
                        ? String(savedGrade.rattrapageScore)
                        : '';
                    const commentStr =
                      local?.comment !== undefined ? local.comment : savedGrade?.comment || '';

                    const quizNum = quizStr !== '' ? parseFloat(quizStr) : undefined;
                    const examNum = examStr !== '' ? parseFloat(examStr) : undefined;
                    const rattrapageNum = rattrapageStr !== '' ? parseFloat(rattrapageStr) : undefined;

                    const s1Preview = calculateEcFinalScore(quizNum, examNum, selectedEc?.id);
                    const finalRetained =
                      rattrapageNum !== undefined && !isNaN(rattrapageNum)
                        ? Number(Math.max(s1Preview ?? 0, rattrapageNum).toFixed(2))
                        : s1Preview;

                    const isS1Failed = s1Preview !== undefined && s1Preview < 10;

                    return (
                      <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={
                                student.avatarUrl ||
                                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'
                              }
                              alt={student.name}
                              className="w-8 h-8 rounded-full object-cover border border-slate-200"
                            />
                            <div>
                              <p className="font-bold text-slate-900">{student.name}</p>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-mono text-slate-500">{student.matricule}</span>
                                {(() => {
                                  const stParcId = getStudentParcoursId(student);
                                  const stParc = parcours.find((p) => p.id === stParcId);
                                  return stParc ? (
                                    <span className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[9px] font-bold">
                                      {stParc.code}
                                    </span>
                                  ) : null;
                                })()}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-center">
                          <input
                            type="number"
                            step="0.25"
                            min="0"
                            max="20"
                            placeholder="0-20"
                            value={quizStr}
                            onChange={(e) => handleScoreChange(student.id, 'quiz', e.target.value)}
                            className="w-20 px-2 py-1.5 text-center font-mono font-bold rounded-lg border border-slate-300 focus:border-blue-600 focus:outline-none"
                          />
                        </td>

                        <td className="py-3 px-3 text-center">
                          <input
                            type="number"
                            step="0.25"
                            min="0"
                            max="20"
                            placeholder="0-20"
                            value={examStr}
                            onChange={(e) => handleScoreChange(student.id, 'exam', e.target.value)}
                            className="w-20 px-2 py-1.5 text-center font-mono font-bold rounded-lg border border-slate-300 focus:border-blue-600 focus:outline-none"
                          />
                        </td>

                        <td className="py-3 px-3 text-center font-mono">
                          {s1Preview !== undefined ? (
                            <span
                              className={`font-bold ${
                                s1Preview >= 10 ? 'text-slate-700' : 'text-rose-600'
                              }`}
                            >
                              {s1Preview.toFixed(2)} / 20
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>

                        {/* Colonne Rattrapage EC */}
                        <td className="py-3 px-3 text-center bg-amber-50/40 border-x border-amber-100">
                          <div className="flex flex-col items-center gap-1">
                            <input
                              type="number"
                              step="0.25"
                              min="0"
                              max="20"
                              placeholder={isS1Failed ? 'Rattrapage' : 'Optionnel'}
                              value={rattrapageStr}
                              onChange={(e) => handleScoreChange(student.id, 'rattrapage', e.target.value)}
                              className={`w-24 px-2 py-1.5 text-center font-mono font-bold rounded-lg border focus:outline-none ${
                                isS1Failed
                                  ? 'border-amber-400 bg-amber-50 text-amber-900 focus:border-amber-600'
                                  : 'border-slate-200 bg-white text-slate-700'
                              }`}
                            />
                            {isS1Failed && rattrapageNum === undefined && (
                              <span className="text-[9px] font-bold text-rose-600 uppercase">
                                Éligible rattrapage (&lt;10)
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-3 text-center">
                          {finalRetained !== undefined ? (
                            <span
                              className={`inline-block px-2.5 py-1 rounded-lg font-mono font-black text-xs ${
                                finalRetained >= 10
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {finalRetained.toFixed(2)} / 20
                            </span>
                          ) : (
                            <span className="text-slate-300 font-mono">—</span>
                          )}
                        </td>

                        <td className="py-3 px-3">
                          <input
                            type="text"
                            placeholder="Observation ou mention rattrapage..."
                            value={commentStr}
                            onChange={(e) => handleScoreChange(student.id, 'comment', e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:border-blue-500 focus:outline-none"
                          />
                        </td>

                        <td className="py-3 px-3 text-center">
                          {rattrapageNum !== undefined && (finalRetained ?? 0) >= 10 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-[10px]">
                              Validé Rattrapage
                            </span>
                          ) : savedGrade?.isPublished ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                              <CheckCircle2 className="w-3 h-3" /> Publié
                            </span>
                          ) : savedGrade?.isDraft ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                              Brouillon
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400">Non saisi</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleSaveStudentGrade(student.id, false)}
                              className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] transition-colors cursor-pointer"
                            >
                              Enregistrer
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setTranscriptStudentId(student.id);
                                setActiveSubTab('RELEVES_OFFICIELS');
                              }}
                              className="px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] cursor-pointer"
                              title="Voir le relevé semestriel et annuel 1 page"
                            >
                              Relevé
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* SUB-TAB 3: JURY DE DÉLIBÉRATION & PV OFFICIELS */}
      {activeSubTab === 'DELIBERATION' && canDeliberate && (
        <div className="space-y-5">
          {delibBanner && (
            <div className="bg-indigo-50 border border-indigo-200 text-indigo-900 px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                {delibBanner}
              </span>
              <button onClick={() => setDelibBanner(null)} className="text-indigo-500 hover:text-indigo-800">
                ✕
              </button>
            </div>
          )}

          {/* Filter & Actions Bar */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Année Universitaire
                </label>
                <span className="inline-block px-3 py-2 rounded-xl bg-blue-50 border border-blue-200 text-xs font-black text-blue-800">
                  {selectedAcademicYear}
                </span>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Promotion / Groupe
                </label>
                <select
                  value={delibGroupId}
                  onChange={(e) => setDelibGroupId(e.target.value)}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs font-bold text-slate-800"
                >
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.code} — {g.name} ({g.level})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Filtrer par Parcours LMD
                </label>
                <select
                  value={selectedParcoursFilter}
                  onChange={(e) => setSelectedParcoursFilter(e.target.value)}
                  className="px-3.5 py-2 rounded-xl border border-indigo-200 bg-indigo-50/60 text-xs font-bold text-indigo-900"
                >
                  <option value="ALL">Tous les Parcours ({parcours.length})</option>
                  {parcours.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.level}] {p.code} — {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Période de Délibération (S1 à S10 ou Bilan Annuel)
                </label>
                <select
                  value={delibSemester}
                  onChange={(e) => setDelibSemester(e.target.value as SemesterCode | 'ANNUEL')}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs font-bold text-slate-800"
                >
                  <option value="ANNUEL">Bilan Annuel Consolidé (Décision Passage / Redoublement)</option>
                  <option value="S1">Semestre 1 (S1 — Licence 1)</option>
                  <option value="S2">Semestre 2 (S2 — Licence 1)</option>
                  <option value="S3">Semestre 3 (S3 — Licence 2)</option>
                  <option value="S4">Semestre 4 (S4 — Licence 2)</option>
                  <option value="S5">Semestre 5 (S5 — Licence 3)</option>
                  <option value="S6">Semestre 6 (S6 — Licence 3)</option>
                  <option value="S7">Semestre 7 (S7 — Master 1)</option>
                  <option value="S8">Semestre 8 (S8 — Master 1)</option>
                  <option value="S9">Semestre 9 (S9 — Master 2)</option>
                  <option value="S10">Semestre 10 (S10 — Master 2)</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const grp = groups.find((g) => g.id === delibGroupId);
                  const headers = [
                    'Matricule',
                    'Étudiant',
                    'Groupe',
                    'Période',
                    'Moyenne Brute (/20)',
                    'Points Jury',
                    'Moyenne Finale (/20)',
                    'Crédits Validés',
                    'Crédits Tentés',
                    'Assiduité (%)',
                    'Quitus Financier',
                    'Décision Officielle du Jury',
                    'Observations',
                  ];
                  const rows = delibStudents.map((st) => {
                    const p = computeStudentDeliberationPreview(
                      st.id,
                      selectedAcademicYear,
                      delibSemester,
                      bonusEdits[st.id]
                    );
                    const finalDec = decisionEdits[st.id] || p.proposedDecision;
                    return [
                      st.matricule || '',
                      st.name,
                      grp?.code || '',
                      delibSemester,
                      p.rawAverage.toFixed(2),
                      String(bonusEdits[st.id] ?? p.existingRecord?.juryBonusPoints ?? 0),
                      p.finalAverage.toFixed(2),
                      String(p.validatedCredits),
                      String(p.totalCreditsAttempted),
                      `${p.attendanceRate}%`,
                      p.financialClearance ? 'En règle' : 'Impayé',
                      finalDec,
                      obsEdits[st.id] ?? p.existingRecord?.juryObservation ?? 'RAS',
                    ];
                  });
                  exportToCsv(`PV_Deliberation_${grp?.code}_${selectedAcademicYear}_${delibSemester}`, headers, rows);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                Exporter PV (CSV / Excel)
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold cursor-pointer"
              >
                <Printer className="w-4 h-4 text-slate-600" />
                Imprimer PV Officiel
              </button>

              <button
                type="button"
                onClick={() => {
                  lockGroupDeliberations(selectedAcademicYear, delibSemester, delibGroupId);
                  setDelibBanner(
                    `Procès-Verbal de délibération verrouillé et signé pour la promotion (${selectedAcademicYear} - ${delibSemester}).`
                  );
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                Clôturer & Verrouiller le PV
              </button>
            </div>
          </div>

          {/* Active Validation Rules Summary */}
          <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs text-indigo-950">
            <div className="flex items-center gap-2 font-bold">
              <Scale className="w-4 h-4 text-indigo-600" />
              <span>Règles LMD appliquées ({selectedAcademicYear}) :</span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-[11px]">
              <span>
                Seuil UE : <strong>{activeRules.uePassingScore}/20</strong>
              </span>
              <span>
                Note éliminatoire : <strong>&lt; {activeRules.eliminatoryScore}/20</strong>
              </span>
              <span>
                Compensation inter-UE :{' '}
                <strong>{activeRules.allowInterUeCompensation ? 'Activée' : 'Désactivée'}</strong>
              </span>
              <span>
                Seuil Passage Conditionnel : <strong>{activeRules.minCreditsForConditionalPass} ECTS</strong>
              </span>
            </div>
          </div>

          {/* Deliberation Jury Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-4">Étudiant</th>
                    <th className="py-3.5 px-3 text-center">Moy. Brute</th>
                    <th className="py-3.5 px-3 text-center">Bonus Jury</th>
                    <th className="py-3.5 px-3 text-center">Moy. Finale</th>
                    <th className="py-3.5 px-3 text-center">Crédits ECTS</th>
                    <th className="py-3.5 px-3 text-center">Assiduité</th>
                    <th className="py-3.5 px-3 text-center">Quitus Finance</th>
                    <th className="py-3.5 px-3 text-center">
                      {delibSemester === 'ANNUEL' ? 'Décision Annuelle (Passage / Redoublement)' : 'Décision Semestre'}
                    </th>
                    <th className="py-3.5 px-3">Observations du Jury</th>
                    <th className="py-3.5 px-4 text-right">Validation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {delibStudents.map((st) => {
                    const bonusVal = bonusEdits[st.id];
                    const preview = computeStudentDeliberationPreview(
                      st.id,
                      selectedAcademicYear,
                      delibSemester,
                      bonusVal
                    );
                    const isLocked = preview.existingRecord?.isLocked || false;
                    const currentDecision = decisionEdits[st.id] || preview.proposedDecision;
                    const currentObs =
                      obsEdits[st.id] !== undefined
                        ? obsEdits[st.id]
                        : preview.existingRecord?.juryObservation || '';

                    return (
                      <tr key={st.id} className="hover:bg-slate-50/90">
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-900">{st.name}</p>
                          <p className="text-[10px] font-mono text-slate-500">{st.matricule}</p>
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-700">
                          {preview.rawAverage.toFixed(2)} / 20
                        </td>
                        <td className="py-3 px-3 text-center">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="2"
                            disabled={isLocked}
                            value={
                              bonusVal !== undefined
                                ? bonusVal
                                : preview.existingRecord?.juryBonusPoints ?? 0
                            }
                            onChange={(e) =>
                              setBonusEdits({
                                ...bonusEdits,
                                [st.id]: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-16 px-2 py-1 text-center font-mono font-bold rounded-lg border border-slate-300 disabled:bg-slate-100"
                          />
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`px-2 py-1 rounded-lg font-mono font-black ${
                              preview.finalAverage >= activeRules.uePassingScore
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {preview.finalAverage.toFixed(2)} / 20
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold">
                          <span
                            className={
                              preview.validatedCredits === preview.totalCreditsAttempted &&
                              preview.totalCreditsAttempted > 0
                                ? 'text-emerald-700'
                                : 'text-amber-700'
                            }
                          >
                            {preview.validatedCredits} / {preview.totalCreditsAttempted} ECTS
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-mono">
                          <span
                            className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                              preview.attendanceRate >= 75
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {preview.attendanceRate}%
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {preview.financialClearance ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                              Quitus OK
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px]">
                              Solde dû
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {isLocked ? (
                            getDecisionBadge(currentDecision, delibSemester === 'ANNUEL')
                          ) : (
                            <select
                              value={currentDecision}
                              onChange={(e) =>
                                setDecisionEdits({
                                  ...decisionEdits,
                                  [st.id]: e.target.value as DeliberationDecision,
                                })
                              }
                              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-bold text-[11px]"
                            >
                              <option value="ADMIS">
                                {delibSemester === 'ANNUEL' ? 'ADMIS EN ANNÉE SUPÉRIEURE' : 'ADMIS DIRECT'}
                              </option>
                              <option value="ADMIS_COMPENSATION">
                                {delibSemester === 'ANNUEL' ? 'ADMIS PAR COMPENSATION ANNUELLE' : 'ADMIS PAR COMPENSATION'}
                              </option>
                              <option value="PASSAGE_CONDITIONNEL">PASSAGE CONDITIONNEL (DETTE UE)</option>
                              <option value="AJOURNE">
                                {delibSemester === 'ANNUEL' ? 'REDOUBLEMENT / AJOURNÉ' : 'AJOURNÉ / RATTRAPAGE'}
                              </option>
                              <option value="EN_ATTENTE">EN ATTENTE</option>
                            </select>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <input
                            type="text"
                            disabled={isLocked}
                            placeholder="Mention, félicitations, redoublement..."
                            value={currentObs}
                            onChange={(e) =>
                              setObsEdits({
                                ...obsEdits,
                                [st.id]: e.target.value,
                              })
                            }
                            className="w-full px-2.5 py-1 rounded-lg border border-slate-200 text-xs disabled:bg-slate-100"
                          />
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                saveDeliberationRecord({
                                  academicYear: selectedAcademicYear,
                                  semester: delibSemester,
                                  groupId: delibGroupId,
                                  studentId: st.id,
                                  rawAverage: preview.rawAverage,
                                  juryBonusPoints:
                                    bonusVal !== undefined
                                      ? bonusVal
                                      : preview.existingRecord?.juryBonusPoints ?? 0,
                                  finalAverage: preview.finalAverage,
                                  totalCreditsAttempted: preview.totalCreditsAttempted,
                                  validatedCredits: preview.validatedCredits,
                                  hasEliminatoryGrade: preview.hasEliminatoryGrade,
                                  attendanceRate: preview.attendanceRate,
                                  financialClearance: preview.financialClearance,
                                  decision: currentDecision,
                                  juryObservation: currentObs,
                                  isLocked: false,
                                });
                                setDelibBanner(`Décision du jury enregistrée pour ${st.name}.`);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                            >
                              {isLocked ? <Unlock className="w-3 h-3" /> : <Save className="w-3 h-3" />}
                              {isLocked ? 'Modifier' : 'Valider'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setTranscriptStudentId(st.id);
                                setTranscriptMode('ANNUEL_1_PAGE');
                                setActiveSubTab('RELEVES_OFFICIELS');
                              }}
                              className="px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] cursor-pointer"
                              title="Voir Relevé 1 Page"
                            >
                              1 Page
                            </button>
                          </div>
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
    </div>
  );
};
