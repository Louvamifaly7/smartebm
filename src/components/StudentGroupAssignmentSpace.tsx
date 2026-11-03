import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { User, StudentInscription } from '../types';
import { showAppToast } from './ToastAndConfirmCenter';
import {
  Layers,
  Users,
  UserCheck,
  UserX,
  CheckCircle2,
  AlertTriangle,
  Search,
  CheckSquare,
  Square,
  Eye,
  ArrowRightLeft,
  History,
  ShieldAlert,
} from 'lucide-react';

interface StudentGroupAssignmentSpaceProps {
  initialAcademicYear?: string;
  initialFiliereId?: string;
  initialLevel?: string;
  onOpenStudentDossier: (student: User) => void;
}

export const StudentGroupAssignmentSpace: React.FC<StudentGroupAssignmentSpaceProps> = ({
  initialAcademicYear,
  initialFiliereId = 'ALL',
  initialLevel = 'ALL',
  onOpenStudentDossier,
}) => {
  const {
    currentUser,
    users,
    groups,
    filieres,
    parcours,
    academicYears,
    selectedAcademicYear,
    inscriptions,
    updateEnrollment,
  } = useApp();

  const [subTab, setSubTab] = useState<'INITIAL_ASSIGNMENT' | 'GROUP_TRANSFER' | 'ASSIGNMENT_HISTORY'>(
    'INITIAL_ASSIGNMENT'
  );

  // Section 6.3: Dependent Hierarchical Filters (1. Année -> 2. Filière -> 3. Parcours -> 4. Niveau -> 5. Groupe destination)
  const [academicYear, setAcademicYear] = useState<string>(
    initialAcademicYear || selectedAcademicYear || '2026-2027'
  );
  const [filiereId, setFiliereId] = useState<string>(initialFiliereId);
  const [parcoursId, setParcoursId] = useState<string>('ALL');
  const [level, setLevel] = useState<string>(initialLevel);
  const [destinationGroupId, setDestinationGroupId] = useState<string>('');

  const [unassignedSearch, setUnassignedSearch] = useState<string>('');
  const [selectedInscriptionIds, setSelectedInscriptionIds] = useState<Set<string>>(new Set());
  const [allowCapacityDerogation, setAllowCapacityDerogation] = useState<boolean>(false);
  const [derogationReason, setDerogationReason] = useState<string>(
    'Dérogation administrative exceptionnelle de capacité (Direction / Scolarité)'
  );
  const [assignmentReason, setAssignmentReason] = useState<string>(
    'Affectation pédagogique initiale au groupe'
  );

  // Section 6.6: Group Transfer state
  const [originGroupId, setOriginGroupId] = useState<string>('');
  const [transferTargetGroupId, setTransferTargetGroupId] = useState<string>('');
  const [transferStudentIds, setTransferStudentIds] = useState<Set<string>>(new Set());
  const [transferReason, setTransferReason] = useState<string>(
    'Rééquilibrage pédagogique des effectifs de groupe'
  );
  const [transferDate, setTransferDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

  const canAuthorizeDerogation = ['ADMIN', 'SCOLARITE', 'ACADEMIC_HEAD'].includes(currentUser.role);

  const studentsById = useMemo(() => {
    const map = new Map<string, User>();
    users.forEach((u) => {
      if (u.role === 'STUDENT') map.set(u.id, u);
    });
    return map;
  }, [users]);

  // All confirmed/active enrollments for the selected academic year
  const activeYearInscriptions = useMemo(() => {
    return inscriptions.filter(
      (i) =>
        i.academicYear === academicYear &&
        i.status !== 'REJECTED' &&
        i.status !== 'SUSPENDED' &&
        studentsById.has(i.studentId)
    );
  }, [inscriptions, academicYear, studentsById]);

  // Enrich groups with live seat counts from activeYearInscriptions
  const enrichedGroups = useMemo(() => {
    return groups
      .filter((g) => !g.academicYear || g.academicYear === academicYear)
      .map((g) => {
        const assignedInscs = activeYearInscriptions.filter(
          (i) => i.groupId === g.id && i.status === 'CONFIRMED'
        );
        const currentCount = assignedInscs.length;
        const maxCapacity = g.maxCapacity || Math.max(g.studentCount || 40, 40);
        const remainingSeats = Math.max(0, maxCapacity - currentCount);
        const isFull = remainingSeats <= 0;
        const isAlmostFull = !isFull && currentCount / maxCapacity >= 0.85;
        return {
          ...g,
          currentCount,
          maxCapacity,
          remainingSeats,
          isFull,
          isAlmostFull,
        };
      });
  }, [groups, academicYear, activeYearInscriptions]);

  // Section 6.2: Dashboard KPIs for Group Assignment
  const assignmentKpis = useMemo(() => {
    const scopedInscs = activeYearInscriptions.filter((i) => {
      if (filiereId !== 'ALL' && i.filiereId !== filiereId) return false;
      if (parcoursId !== 'ALL' && (i.parcoursId || '') !== parcoursId) return false;
      if (level !== 'ALL' && i.level !== level) return false;
      return true;
    });

    const scopedGroups = enrichedGroups.filter((g) => {
      if (filiereId !== 'ALL' && g.filiereId !== filiereId) return false;
      if (parcoursId !== 'ALL' && g.parcoursId && g.parcoursId !== parcoursId) return false;
      if (level !== 'ALL' && g.level !== level) return false;
      return true;
    });

    const totalEnrolled = scopedInscs.length;
    const totalAssigned = scopedInscs.filter((i) => Boolean(i.groupId)).length;
    const totalUnassigned = scopedInscs.filter((i) => !i.groupId).length;
    const availableGroupsCount = scopedGroups.filter((g) => !g.isFull).length;
    const fullGroupsCount = scopedGroups.filter((g) => g.isFull).length;
    const remainingSeatsCount = scopedGroups.reduce((acc, g) => acc + g.remainingSeats, 0);

    return {
      totalEnrolled,
      totalAssigned,
      totalUnassigned,
      availableGroupsCount,
      fullGroupsCount,
      remainingSeatsCount,
      scopedGroups,
    };
  }, [activeYearInscriptions, enrichedGroups, filiereId, parcoursId, level]);

  // Section 6.4: List of Unassigned Students (confirmed enrollment, matching filiere/level, no group)
  const unassignedList = useMemo(() => {
    const q = unassignedSearch.trim().toLowerCase();
    return activeYearInscriptions
      .filter((i) => {
        if (i.groupId) return false;
        if (filiereId !== 'ALL' && i.filiereId !== filiereId) return false;
        if (parcoursId !== 'ALL' && (i.parcoursId || '') !== parcoursId) return false;
        if (level !== 'ALL' && i.level !== level) return false;
        const st = studentsById.get(i.studentId);
        if (!st) return false;
        if (q) {
          const hay = `${st.matricule || ''} ${st.name || ''} ${st.cin || ''} ${st.email || ''}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .map((insc) => {
        const student = studentsById.get(insc.studentId)!;
        const fil = filieres.find((f) => f.id === insc.filiereId);
        const parc = parcours.find((p) => p.id === insc.parcoursId);
        return {
          inscription: insc,
          student,
          filiere: fil,
          parcours: parc,
        };
      });
  }, [activeYearInscriptions, filiereId, parcoursId, level, unassignedSearch, studentsById, filieres, parcours]);

  // Compatible destination groups for the currently selected filiere/level
  const compatibleDestinationGroups = useMemo(() => {
    return enrichedGroups.filter((g) => {
      if (filiereId !== 'ALL' && g.filiereId !== filiereId) return false;
      if (level !== 'ALL' && g.level !== level) return false;
      if (parcoursId !== 'ALL' && g.parcoursId && g.parcoursId !== parcoursId) return false;
      return true;
    });
  }, [enrichedGroups, filiereId, level, parcoursId]);

  const selectedDestinationGroup = useMemo(
    () => enrichedGroups.find((g) => g.id === destinationGroupId),
    [enrichedGroups, destinationGroupId]
  );

  const selectedCount = selectedInscriptionIds.size;
  const exceedsCapacity =
    selectedDestinationGroup !== undefined &&
    selectedCount > selectedDestinationGroup.remainingSeats;

  const toggleSelectInsc = (inscId: string) => {
    setSelectedInscriptionIds((prev) => {
      const next = new Set(prev);
      if (next.has(inscId)) next.delete(inscId);
      else next.add(inscId);
      return next;
    });
  };

  const toggleSelectAllUnassigned = () => {
    const allIds = unassignedList.map((u) => u.inscription.id);
    const allSelected = allIds.length > 0 && allIds.every((id) => selectedInscriptionIds.has(id));
    if (allSelected) {
      setSelectedInscriptionIds(new Set());
    } else {
      setSelectedInscriptionIds(new Set(allIds));
    }
  };

  // Section 6.5: Execute Initial Assignment to Destination Group
  const handleConfirmInitialAssignment = () => {
    if (!selectedDestinationGroup) {
      showAppToast({
        type: 'warning',
        title: 'Groupe de destination requis',
        message: 'Veuillez sélectionner un groupe de destination.',
      });
      return;
    }

    if (selectedCount === 0) {
      showAppToast({
        type: 'warning',
        title: 'Aucun étudiant sélectionné',
        message: 'Veuillez cocher au moins un étudiant sans groupe à affecter.',
      });
      return;
    }

    if (exceedsCapacity && (!allowCapacityDerogation || !canAuthorizeDerogation)) {
      showAppToast({
        type: 'error',
        title: 'Capacité disponible dépassée',
        message: `Le groupe ${selectedDestinationGroup.code} dispose de ${selectedDestinationGroup.remainingSeats} place(s) restante(s) pour ${selectedCount} étudiant(s) sélectionné(s). Activez une dérogation administrative si autorisé.`,
      });
      return;
    }

    let assignedCount = 0;
    selectedInscriptionIds.forEach((inscId) => {
      const insc = inscriptions.find((i) => i.id === inscId);
      if (!insc) return;

      // Verify level & filiere coherence
      if (
        insc.filiereId !== selectedDestinationGroup.filiereId ||
        insc.level !== selectedDestinationGroup.level
      ) {
        return;
      }

      const finalReason = exceedsCapacity
        ? `${assignmentReason} [DÉROGATION CAPACITÉ : ${derogationReason}]`
        : assignmentReason;

      const res = updateEnrollment(
        insc.id,
        {
          groupId: selectedDestinationGroup.id,
          status: 'CONFIRMED',
        },
        finalReason
      );
      if (res.success) assignedCount++;
    });

    setSelectedInscriptionIds(new Set());
    setAllowCapacityDerogation(false);
    showAppToast({
      type: 'success',
      title: 'Affectation aux groupes enregistrée',
      message: `${assignedCount} étudiant(s) ont été affectés au groupe ${selectedDestinationGroup.code} avec historisation complète.`,
    });
  };

  // Section 6.6: Group Transfer (Changement de groupe d'étudiants déjà affectés)
  const originGroupStudents = useMemo(() => {
    if (!originGroupId) return [];
    return activeYearInscriptions
      .filter((i) => i.groupId === originGroupId)
      .map((i) => ({
        inscription: i,
        student: studentsById.get(i.studentId)!,
      }))
      .filter((item) => Boolean(item.student));
  }, [activeYearInscriptions, originGroupId, studentsById]);

  const originGroupObj = useMemo(
    () => enrichedGroups.find((g) => g.id === originGroupId),
    [enrichedGroups, originGroupId]
  );

  const compatibleTransferTargetGroups = useMemo(() => {
    if (!originGroupObj) return [];
    return enrichedGroups.filter(
      (g) =>
        g.id !== originGroupObj.id &&
        g.filiereId === originGroupObj.filiereId &&
        g.level === originGroupObj.level
    );
  }, [enrichedGroups, originGroupObj]);

  const handleExecuteGroupTransfer = () => {
    if (!originGroupId || !transferTargetGroupId) {
      showAppToast({
        type: 'warning',
        title: 'Groupes requis',
        message: 'Veuillez sélectionner le groupe d’origine et le groupe de destination.',
      });
      return;
    }
    if (transferStudentIds.size === 0) {
      showAppToast({
        type: 'warning',
        title: 'Aucun étudiant sélectionné',
        message: 'Veuillez sélectionner au moins un étudiant à transférer.',
      });
      return;
    }
    if (!transferReason.trim()) {
      showAppToast({
        type: 'warning',
        title: 'Motif obligatoire',
        message: 'Veuillez saisir le motif administratif du changement de groupe.',
      });
      return;
    }

    const targetGrp = enrichedGroups.find((g) => g.id === transferTargetGroupId);
    if (!targetGrp) return;

    let count = 0;
    transferStudentIds.forEach((studentId) => {
      const insc = activeYearInscriptions.find(
        (i) => i.studentId === studentId && i.groupId === originGroupId
      );
      if (!insc) return;
      const res = updateEnrollment(
        insc.id,
        {
          groupId: targetGrp.id,
        },
        `${transferReason.trim()} (Opération du ${transferDate} par ${currentUser.name})`
      );
      if (res.success) count++;
    });

    setTransferStudentIds(new Set());
    showAppToast({
      type: 'success',
      title: 'Changement de groupe effectué',
      message: `${count} étudiant(s) transféré(s) de ${originGroupObj?.code} vers ${targetGrp.code} sans créer de nouvelle inscription annuelle.`,
    });
  };

  // All group assignment history logs for the selected academic year
  const assignmentHistoryLogs = useMemo(() => {
    return activeYearInscriptions
      .flatMap((insc) => {
        const st = studentsById.get(insc.studentId);
        return (insc.history || [])
          .filter(
            (h) =>
              h.action === 'AFFECTATION_INITIALE' ||
              h.action === 'CHANGEMENT_GROUPE' ||
              (h.newGroupId && h.previousGroupId !== h.newGroupId)
          )
          .map((h) => ({
            ...h,
            student: st,
            academicYear: insc.academicYear,
            level: insc.level,
            filiereId: insc.filiereId,
          }));
      })
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [activeYearInscriptions, studentsById]);

  return (
    <div className="space-y-5 text-xs">
      {/* Section 6.2 : Tableau de bord de l'affectation (6 indicateurs) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">
            1. Total inscrits ({academicYear})
          </span>
          <span className="text-2xl font-black text-[#17345B] mt-1 block">
            {assignmentKpis.totalEnrolled}
          </span>
          <span className="text-[10px] text-slate-500">Inscriptions actives</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">
            2. Étudiants affectés
          </span>
          <span className="text-2xl font-black text-emerald-700 mt-1 block">
            {assignmentKpis.totalAssigned}
          </span>
          <span className="text-[10px] text-emerald-700 font-semibold">Ayant un groupe</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/40 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-amber-800 block">
            3. Étudiants sans groupe
          </span>
          <span className="text-2xl font-black text-amber-700 mt-1 block">
            {assignmentKpis.totalUnassigned}
          </span>
          <span className="text-[10px] text-amber-800 font-semibold">En attente d’affectation</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">
            4. Groupes disponibles
          </span>
          <span className="text-2xl font-black text-[#2F6FED] mt-1 block">
            {assignmentKpis.availableGroupsCount}
          </span>
          <span className="text-[10px] text-slate-500">Avec places ouvertes</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">
            5. Groupes complets
          </span>
          <span className="text-2xl font-black text-rose-600 mt-1 block">
            {assignmentKpis.fullGroupsCount}
          </span>
          <span className="text-[10px] text-rose-700">Capacité max atteinte</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">
            6. Places restantes
          </span>
          <span className="text-2xl font-black text-indigo-700 mt-1 block">
            {assignmentKpis.remainingSeatsCount}
          </span>
          <span className="text-[10px] text-slate-500">Cumul des groupes filtrés</span>
        </div>
      </div>

      {/* Navigation interne de l'Espace 4 */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSubTab('INITIAL_ASSIGNMENT')}
            className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 cursor-pointer ${
              subTab === 'INITIAL_ASSIGNMENT'
                ? 'bg-[#17345B] text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>1. Affectation des étudiants sans groupe ({assignmentKpis.totalUnassigned})</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('GROUP_TRANSFER')}
            className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 cursor-pointer ${
              subTab === 'GROUP_TRANSFER'
                ? 'bg-[#17345B] text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>2. Changement / Transfert de groupe</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('ASSIGNMENT_HISTORY')}
            className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 cursor-pointer ${
              subTab === 'ASSIGNMENT_HISTORY'
                ? 'bg-[#17345B] text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            <span>3. Historique des affectations ({assignmentHistoryLogs.length})</span>
          </button>
        </div>
      </div>

      {/* SOUS-ONGLET 1 : AFFECTATION INITIALE DES ÉTUDIANTS SANS GROUPE */}
      {subTab === 'INITIAL_ASSIGNMENT' && (
        <div className="space-y-5">
          {/* Section 6.3 : Filtres hiérarchiques dépendants (1 -> 2 -> 3 -> 4 -> 5) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-black text-[#17345B] uppercase tracking-wider">
                Filtres hiérarchiques dépendants d’affectation
              </h3>
              <p className="text-[11px] text-slate-500">
                Sélectionnez dans l’ordre : 1. Année académique → 2. Mention / Filière → 3. Parcours → 4. Niveau → 5. Groupe de destination.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* 1. Année académique */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                  1. Année académique *
                </label>
                <select
                  value={academicYear}
                  onChange={(e) => {
                    setAcademicYear(e.target.value);
                    setDestinationGroupId('');
                    setSelectedInscriptionIds(new Set());
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                >
                  {academicYears.map((ay) => (
                    <option key={ay.id} value={ay.code}>
                      {ay.code}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Mention / Filière */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                  2. Mention / Filière *
                </label>
                <select
                  value={filiereId}
                  onChange={(e) => {
                    setFiliereId(e.target.value);
                    setParcoursId('ALL');
                    setDestinationGroupId('');
                    setSelectedInscriptionIds(new Set());
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                >
                  <option value="ALL">Toutes les filières</option>
                  {filieres.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.code} — {f.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Parcours */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                  3. Parcours
                </label>
                <select
                  value={parcoursId}
                  onChange={(e) => {
                    setParcoursId(e.target.value);
                    setDestinationGroupId('');
                    setSelectedInscriptionIds(new Set());
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                >
                  <option value="ALL">Tous parcours / Tronc commun</option>
                  {parcours
                    .filter((p) => filiereId === 'ALL' || p.filiereId === filiereId)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} — {p.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* 4. Niveau */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                  4. Niveau *
                </label>
                <select
                  value={level}
                  onChange={(e) => {
                    setLevel(e.target.value);
                    setDestinationGroupId('');
                    setSelectedInscriptionIds(new Set());
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                >
                  <option value="ALL">Tous les niveaux</option>
                  {['L1', 'L2', 'L3', 'M1', 'M2'].map((l) => (
                    <option key={l} value={l}>
                      Niveau {l}
                    </option>
                  ))}
                </select>
              </div>

              {/* 5. Groupe de destination */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                  5. Groupe de destination *
                </label>
                <select
                  value={destinationGroupId}
                  onChange={(e) => setDestinationGroupId(e.target.value)}
                  className="w-full p-2.5 bg-blue-50 border border-[#2F6FED] rounded-xl font-bold text-[#17345B]"
                >
                  <option value="">-- Choisir le groupe cible --</option>
                  {compatibleDestinationGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.code} — {g.currentCount}/{g.maxCapacity} ({g.remainingSeats} pl. dispo)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Section 6.4 : Liste des étudiants non affectés (2/3 largeur) */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="font-black text-[#17345B] uppercase">
                    Étudiants inscrits sans groupe ({unassignedList.length})
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Étudiants ayant une inscription active en {academicYear} et en attente d’affectation.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={unassignedSearch}
                      onChange={(e) => setUnassignedSearch(e.target.value)}
                      placeholder="Chercher matricule, nom..."
                      className="pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={toggleSelectAllUnassigned}
                    className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl font-bold cursor-pointer"
                  >
                    Tout sélectionner
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto max-h-[420px]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100 sticky top-0 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500">
                    <tr>
                      <th className="p-3 w-10 text-center">Sél.</th>
                      <th className="p-3">Matricule</th>
                      <th className="p-3">Étudiant</th>
                      <th className="p-3">Filière / Parcours</th>
                      <th className="p-3">Niveau</th>
                      <th className="p-3">Statut insc.</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {unassignedList.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400">
                          Aucun étudiant sans groupe pour les critères sélectionnés.
                        </td>
                      </tr>
                    ) : (
                      unassignedList.map(({ inscription, student, filiere, parcours: parc }) => {
                        const isChecked = selectedInscriptionIds.has(inscription.id);
                        return (
                          <tr
                            key={inscription.id}
                            className={`hover:bg-slate-50 ${isChecked ? 'bg-blue-50/50' : ''}`}
                          >
                            <td className="p-3 text-center">
                              <button
                                type="button"
                                onClick={() => toggleSelectInsc(inscription.id)}
                                className="cursor-pointer text-slate-400 hover:text-[#2F6FED]"
                              >
                                {isChecked ? (
                                  <CheckSquare className="w-4 h-4 text-[#2F6FED]" />
                                ) : (
                                  <Square className="w-4 h-4" />
                                )}
                              </button>
                            </td>
                            <td className="p-3 font-mono font-bold text-[#17345B]">
                              {student.matricule}
                            </td>
                            <td className="p-3">
                              <span className="font-bold text-slate-900 block">{student.name}</span>
                              <span className="text-[10px] text-slate-500">{student.email}</span>
                            </td>
                            <td className="p-3">
                              <span className="font-bold text-slate-800">
                                {filiere?.code || inscription.filiereId}
                              </span>
                              {parc && (
                                <span className="ml-1 text-[10px] text-indigo-700 font-semibold">
                                  ({parc.code})
                                </span>
                              )}
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 bg-blue-50 text-[#2F6FED] border border-blue-200 rounded font-black text-[10px]">
                                {inscription.level}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded font-bold text-[10px]">
                                {inscription.status === 'CONFIRMED' ? 'Confirmée' : inscription.status}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <button
                                type="button"
                                onClick={() => onOpenStudentDossier(student)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-[#2F6FED] text-slate-700 hover:text-white rounded-lg font-bold text-[10px] inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Consulter la fiche</span>
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

            {/* Section 6.5 : Récapitulatif et Confirmation d'Affectation vers le groupe (1/3 largeur) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h4 className="font-black text-[#17345B] uppercase">
                  Récapitulatif avant confirmation d’affectation
                </h4>
                <p className="text-[11px] text-slate-500">
                  Vérifiez la capacité d’accueil et la cohérence académique avant de confirmer.
                </p>
              </div>

              {selectedDestinationGroup ? (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Code du groupe :</span>
                    <span className="font-mono font-black text-sm text-[#17345B]">
                      {selectedDestinationGroup.code}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Filière :</span>
                    <span className="font-bold">
                      {filieres.find((f) => f.id === selectedDestinationGroup.filiereId)?.name || '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Parcours :</span>
                    <span className="font-semibold">
                      {parcours.find((p) => p.id === selectedDestinationGroup.parcoursId)?.code ||
                        'Tronc commun'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Niveau & Année :</span>
                    <span className="font-bold">
                      {selectedDestinationGroup.level} • {academicYear}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 bg-white rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 block">Effectif actuel</span>
                      <span className="font-black text-sm text-slate-800">
                        {selectedDestinationGroup.currentCount}
                      </span>
                    </div>
                    <div className="p-2 bg-white rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 block">Capacité max</span>
                      <span className="font-black text-sm text-slate-800">
                        {selectedDestinationGroup.maxCapacity}
                      </span>
                    </div>
                    <div className="p-2 bg-white rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 block">Places rest.</span>
                      <span
                        className={`font-black text-sm ${
                          selectedDestinationGroup.remainingSeats > 0
                            ? 'text-emerald-700'
                            : 'text-rose-700'
                        }`}
                      >
                        {selectedDestinationGroup.remainingSeats}
                      </span>
                    </div>
                  </div>
                  <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
                    <span className="font-bold text-blue-900">Étudiants à affecter :</span>
                    <span className="text-base font-black text-[#2F6FED]">{selectedCount}</span>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900">
                  Veuillez sélectionner un <strong>Groupe de destination</strong> dans le filtre n°5 ci-dessus pour afficher sa capacité et activer l’affectation.
                </div>
              )}

              {/* Contrôle de capacité & Dérogation administrative */}
              {exceedsCapacity && selectedDestinationGroup && (
                <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-2xl space-y-2 text-rose-900">
                  <div className="flex items-center gap-2 font-black">
                    <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Dépassement de la capacité disponible !</span>
                  </div>
                  <p className="text-[11px]">
                    Vous avez sélectionné <strong>{selectedCount}</strong> étudiant(s) alors qu’il ne reste que{' '}
                    <strong>{selectedDestinationGroup.remainingSeats}</strong> place(s) dans{' '}
                    {selectedDestinationGroup.code}.
                  </p>
                  {canAuthorizeDerogation && (
                    <div className="pt-1 space-y-2">
                      <label className="flex items-center gap-2 font-bold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={allowCapacityDerogation}
                          onChange={(e) => setAllowCapacityDerogation(e.target.checked)}
                        />
                        <span>Autoriser une dérogation administrative explicite</span>
                      </label>
                      {allowCapacityDerogation && (
                        <input
                          type="text"
                          value={derogationReason}
                          onChange={(e) => setDerogationReason(e.target.value)}
                          placeholder="Motif de la dérogation..."
                          className="w-full p-2 bg-white border border-rose-300 rounded-lg text-xs"
                        />
                      )}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                  Observation / Motif d’affectation
                </label>
                <input
                  type="text"
                  value={assignmentReason}
                  onChange={(e) => setAssignmentReason(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <button
                type="button"
                disabled={
                  !selectedDestinationGroup ||
                  selectedCount === 0 ||
                  (exceedsCapacity && !allowCapacityDerogation)
                }
                onClick={handleConfirmInitialAssignment}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl font-black flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmer l’affectation ({selectedCount} étudiant(s))</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SOUS-ONGLET 2 : CHANGEMENT DE GROUPE (SECTION 6.6) */}
      {subTab === 'GROUP_TRANSFER' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-black text-[#17345B] uppercase tracking-wider">
              Transfert / Changement de groupe d’étudiants déjà affectés
            </h3>
            <p className="text-[11px] text-slate-500">
              Transférez un ou plusieurs étudiants vers un autre groupe compatible de la même filière et du même niveau sans créer de nouvelle inscription annuelle.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                1. Groupe d’origine *
              </label>
              <select
                value={originGroupId}
                onChange={(e) => {
                  setOriginGroupId(e.target.value);
                  setTransferTargetGroupId('');
                  setTransferStudentIds(new Set());
                }}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold"
              >
                <option value="">-- Choisir le groupe d’origine --</option>
                {enrichedGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.code} — {g.name} ({g.currentCount} inscrits)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                2. Groupe de destination compatible *
              </label>
              <select
                value={transferTargetGroupId}
                disabled={!originGroupId}
                onChange={(e) => setTransferTargetGroupId(e.target.value)}
                className="w-full p-2.5 bg-blue-50 border border-[#2F6FED] rounded-xl font-bold text-[#17345B] disabled:opacity-50"
              >
                <option value="">-- Choisir le groupe de destination --</option>
                {compatibleTransferTargetGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.code} — {g.currentCount}/{g.maxCapacity} ({g.remainingSeats} pl. dispo)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                3. Date de l’opération *
              </label>
              <input
                type="date"
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                4. Administrateur responsable
              </label>
              <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-700">
                {currentUser.name}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
              5. Motif obligatoire du changement de groupe *
            </label>
            <input
              type="text"
              value={transferReason}
              onChange={(e) => setTransferReason(e.target.value)}
              placeholder="Indiquez le motif du transfert (ex: rééquilibrage d'effectif, incompatibilité horaire justifiée)..."
              className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-semibold"
            />
          </div>

          {originGroupId && (
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <span className="font-bold text-[#17345B]">
                  Étudiants actuellement affectés au groupe {originGroupObj?.code} ({originGroupStudents.length})
                </span>
                <span className="font-bold text-[#2F6FED]">
                  {transferStudentIds.size} sélectionné(s) pour le transfert
                </span>
              </div>
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500">
                  <tr>
                    <th className="p-2.5 w-10 text-center">Sél.</th>
                    <th className="p-2.5">Matricule</th>
                    <th className="p-2.5">Nom & Prénom</th>
                    <th className="p-2.5">Niveau</th>
                    <th className="p-2.5">Groupe actuel</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {originGroupStudents.map(({ student, inscription }) => {
                    const checked = transferStudentIds.has(student.id);
                    return (
                      <tr key={student.id} className="hover:bg-slate-50">
                        <td className="p-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setTransferStudentIds((prev) => {
                                const next = new Set(prev);
                                if (next.has(student.id)) next.delete(student.id);
                                else next.add(student.id);
                                return next;
                              });
                            }}
                          />
                        </td>
                        <td className="p-2.5 font-mono font-bold text-[#17345B]">
                          {student.matricule}
                        </td>
                        <td className="p-2.5 font-bold">{student.name}</td>
                        <td className="p-2.5">{inscription.level}</td>
                        <td className="p-2.5 font-mono font-bold">{originGroupObj?.code}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleExecuteGroupTransfer}
              className="px-5 py-2.5 bg-[#2F6FED] hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-2 cursor-pointer"
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>Valider le changement de groupe ({transferStudentIds.size})</span>
            </button>
          </div>
        </div>
      )}

      {/* SOUS-ONGLET 3 : HISTORIQUE DES AFFECTATIONS */}
      {subTab === 'ASSIGNMENT_HISTORY' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <h3 className="text-sm font-black text-[#17345B] uppercase tracking-wider">
              Journal d’Audit des Affectations & Changements de Groupe ({academicYear})
            </h3>
            <p className="text-[11px] text-slate-500">
              Traçabilité complète : groupe d’origine, groupe de destination, motif, auteur et horodatage.
            </p>
          </div>
          <div className="overflow-x-auto max-h-[460px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500">
                <tr>
                  <th className="p-3">Date & Heure</th>
                  <th className="p-3">Matricule</th>
                  <th className="p-3">Étudiant</th>
                  <th className="p-3">Opération</th>
                  <th className="p-3">Groupe d’origine</th>
                  <th className="p-3">Groupe de destination</th>
                  <th className="p-3">Motif</th>
                  <th className="p-3">Responsable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assignmentHistoryLogs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      Aucun mouvement d’affectation enregistré pour l’année {academicYear}.
                    </td>
                  </tr>
                ) : (
                  assignmentHistoryLogs.map((log) => {
                    const prevGrp = groups.find((g) => g.id === log.previousGroupId);
                    const nextGrp = groups.find((g) => g.id === log.newGroupId);
                    return (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="p-3 font-mono text-[11px] text-slate-500">
                          {new Date(log.timestamp).toLocaleString('fr-FR')}
                        </td>
                        <td className="p-3 font-mono font-bold text-[#17345B]">
                          {log.student?.matricule || '—'}
                        </td>
                        <td className="p-3 font-bold text-slate-900">
                          {log.student?.name || 'Étudiant'}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                              log.action === 'AFFECTATION_INITIALE'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-slate-600">
                          {prevGrp ? prevGrp.code : 'Sans groupe'}
                        </td>
                        <td className="p-3 font-mono font-bold text-emerald-700">
                          {nextGrp ? nextGrp.code : 'Sans groupe'}
                        </td>
                        <td className="p-3 text-slate-600">{log.reason || '—'}</td>
                        <td className="p-3 font-semibold text-slate-700">{log.authorName}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
