import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { User, StudentInscription } from '../types';
import { computeStudentDossierCompleteness } from './StudentProfileForm';
import { showAppToast } from './ToastAndConfirmCenter';
import {
  BarChart3,
  Users,
  UserPlus,
  RefreshCw,
  Clock,
  CheckCircle2,
  PauseCircle,
  UserX,
  UserCheck,
  AlertTriangle,
  Layers,
  TrendingUp,
  ChevronRight,
  ShieldCheck,
  Eye,
  Database,
} from 'lucide-react';

export type DashboardAlertKey =
  | 'UNASSIGNED_STUDENTS'
  | 'INCOMPLETE_DOSSIERS'
  | 'PENDING_ENROLLMENTS'
  | 'FULL_GROUPS'
  | 'ALMOST_FULL_GROUPS'
  | 'REGULARIZE_ACADEMIC';

interface StudentAcademicDashboardSpaceProps {
  onNavigateToSpace: (
    space: 'DASHBOARD' | 'REPERTOIRE' | 'ENROLLMENTS' | 'GROUP_ASSIGNMENT' | 'LISTS_EXPORTS',
    preset?: {
      academicYear?: string;
      assignmentFilter?: 'ALL' | 'ASSIGNED' | 'UNASSIGNED';
      dossierFilter?: 'ALL' | 'COMPLETE' | 'INCOMPLETE';
      statusFilter?: string;
    }
  ) => void;
  onOpenStudentDossier: (student: User) => void;
}

export const StudentAcademicDashboardSpace: React.FC<StudentAcademicDashboardSpaceProps> = ({
  onNavigateToSpace,
  onOpenStudentDossier,
}) => {
  const {
    users,
    groups,
    filieres,
    parcours,
    academicYears,
    selectedAcademicYear,
    inscriptions,
    inscribeStudent,
  } = useApp();

  // Section 3.2: Dynamic Dashboard Filters
  const [yearFilter, setYearFilter] = useState<string>(selectedAcademicYear || '2026-2027');
  const [filiereFilter, setFiliereFilter] = useState<string>('ALL');
  const [parcoursFilter, setParcoursFilter] = useState<string>('ALL');
  const [levelFilter, setLevelFilter] = useState<string>('ALL');
  const [groupFilter, setGroupFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const [activeAlertDetail, setActiveAlertDetail] = useState<DashboardAlertKey | null>(null);
  const [showMigrationDiag, setShowMigrationDiag] = useState<boolean>(false);

  const studentsById = useMemo(() => {
    const map = new Map<string, User>();
    users.forEach((u) => {
      if (u.role === 'STUDENT') map.set(u.id, u);
    });
    return map;
  }, [users]);

  // Strictly calculate from annual inscriptions (Section 3.3 & Section 12)
  const filteredYearInscriptions = useMemo(() => {
    return inscriptions.filter((insc) => {
      if (!studentsById.has(insc.studentId)) return false;
      if (yearFilter !== 'ALL' && insc.academicYear !== yearFilter) return false;
      if (filiereFilter !== 'ALL' && insc.filiereId !== filiereFilter) return false;
      if (parcoursFilter !== 'ALL' && (insc.parcoursId || '') !== parcoursFilter) return false;
      if (levelFilter !== 'ALL' && insc.level !== levelFilter) return false;
      if (groupFilter !== 'ALL') {
        if (groupFilter === 'UNASSIGNED') {
          if (insc.groupId) return false;
        } else if (insc.groupId !== groupFilter) {
          return false;
        }
      }
      if (statusFilter !== 'ALL' && insc.status !== statusFilter) return false;
      return true;
    });
  }, [
    inscriptions,
    studentsById,
    yearFilter,
    filiereFilter,
    parcoursFilter,
    levelFilter,
    groupFilter,
    statusFilter,
  ]);

  // Section 3.3: 9 KPI Cards calculated strictly from annual inscriptions
  const kpis = useMemo(() => {
    const activeInscs = filteredYearInscriptions.filter((i) => i.status !== 'REJECTED');
    const totalEnrolled = activeInscs.length;

    const newEnrollments = activeInscs.filter(
      (i) => i.inscriptionType !== 'REINSCRIPTION' && i.inscriptionType !== 'REINSCRIPTION_INTERRUPTION'
    ).length;

    const reEnrollments = activeInscs.filter(
      (i) => i.inscriptionType === 'REINSCRIPTION' || i.inscriptionType === 'REINSCRIPTION_INTERRUPTION'
    ).length;

    const pendingEnrollments = filteredYearInscriptions.filter(
      (i) => i.status === 'PENDING' || i.status === 'DRAFT'
    ).length;

    const confirmedEnrollments = filteredYearInscriptions.filter(
      (i) => i.status === 'CONFIRMED'
    ).length;

    const suspendedEnrollments = filteredYearInscriptions.filter(
      (i) => i.status === 'SUSPENDED'
    ).length;

    const unassignedStudents = activeInscs.filter((i) => !i.groupId).length;
    const assignedStudents = activeInscs.filter((i) => Boolean(i.groupId)).length;

    const incompleteDossiers = activeInscs.filter((i) => {
      const st = studentsById.get(i.studentId);
      if (!st) return false;
      const comp = computeStudentDossierCompleteness(st);
      const isComplete =
        comp.percentage >= 80 ||
        Boolean(i.dossierComplete) ||
        st.administrativeFolderStatus === 'COMPLET';
      return !isComplete;
    }).length;

    return {
      totalEnrolled,
      newEnrollments,
      reEnrollments,
      pendingEnrollments,
      confirmedEnrollments,
      suspendedEnrollments,
      unassignedStudents,
      assignedStudents,
      incompleteDossiers,
    };
  }, [filteredYearInscriptions, studentsById]);

  // Section 3.4: 7 Visual Breakdowns / Charts
  const chartsData = useMemo(() => {
    const activeInscs = filteredYearInscriptions.filter((i) => i.status !== 'REJECTED');
    const total = Math.max(1, activeInscs.length);

    // 1. Inscriptions par filière
    const byFiliere = filieres.map((f) => {
      const count = activeInscs.filter((i) => i.filiereId === f.id).length;
      return {
        id: f.id,
        label: `${f.code} — ${f.name}`,
        shortLabel: f.code,
        count,
        pct: Math.round((count / total) * 100),
      };
    });

    // 2. Inscriptions par niveau
    const byLevel = ['L1', 'L2', 'L3', 'M1', 'M2'].map((lvl) => {
      const count = activeInscs.filter((i) => i.level === lvl).length;
      return {
        level: lvl,
        count,
        pct: Math.round((count / total) * 100),
      };
    });

    // 3. Inscriptions par parcours
    const byParcours = [
      ...parcours
        .filter((p) => filiereFilter === 'ALL' || p.filiereId === filiereFilter)
        .map((p) => {
          const count = activeInscs.filter((i) => i.parcoursId === p.id).length;
          return {
            id: p.id,
            label: `${p.code} — ${p.name}`,
            count,
            pct: Math.round((count / total) * 100),
          };
        }),
      {
        id: 'TRONC_COMMUN',
        label: 'Tronc commun (Sans parcours spécifique)',
        count: activeInscs.filter((i) => !i.parcoursId).length,
        pct: Math.round((activeInscs.filter((i) => !i.parcoursId).length / total) * 100),
      },
    ];

    // 4. Inscriptions par groupe
    const scopedGroups = groups.filter((g) => {
      if (filiereFilter !== 'ALL' && g.filiereId !== filiereFilter) return false;
      if (levelFilter !== 'ALL' && g.level !== levelFilter) return false;
      return true;
    });
    const byGroup = scopedGroups.map((g) => {
      const count = activeInscs.filter((i) => i.groupId === g.id).length;
      const cap = g.maxCapacity || Math.max(g.studentCount || 40, 40);
      return {
        id: g.id,
        code: g.code,
        name: g.name,
        level: g.level,
        count,
        capacity: cap,
        fillPct: Math.min(100, Math.round((count / cap) * 100)),
      };
    });

    // 5. Nouvelles inscriptions vs réinscriptions
    const newVsRe = {
      newCount: kpis.newEnrollments,
      newPct: Math.round((kpis.newEnrollments / total) * 100),
      reCount: kpis.reEnrollments,
      rePct: Math.round((kpis.reEnrollments / total) * 100),
    };

    // 6. Évolution mensuelle des inscriptions
    const monthLabels: Record<string, string> = {
      '01': 'Jan',
      '02': 'Fév',
      '03': 'Mar',
      '04': 'Avr',
      '05': 'Mai',
      '06': 'Juin',
      '07': 'Juil',
      '08': 'Août',
      '09': 'Sep',
      '10': 'Oct',
      '11': 'Nov',
      '12': 'Déc',
    };
    const monthCounts = new Map<string, number>();
    activeInscs.forEach((i) => {
      const m = (i.inscriptionDate || '2026-09-01').slice(0, 7); // YYYY-MM
      monthCounts.set(m, (monthCounts.get(m) || 0) + 1);
    });
    const monthlyEvolution = Array.from(monthCounts.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([ym, count]) => {
        const [yr, mo] = ym.split('-');
        return {
          ym,
          label: `${monthLabels[mo] || mo} ${yr}`,
          count,
        };
      });

    // 7. Comparaison des années académiques
    const byAcademicYear = academicYears.map((ay) => {
      const yrInscs = inscriptions.filter(
        (i) =>
          i.academicYear === ay.code &&
          i.status !== 'REJECTED' &&
          studentsById.has(i.studentId) &&
          (filiereFilter === 'ALL' || i.filiereId === filiereFilter) &&
          (levelFilter === 'ALL' || i.level === levelFilter)
      );
      return {
        code: ay.code,
        isCurrent: ay.isCurrent,
        total: yrInscs.length,
        newCount: yrInscs.filter((i) => i.inscriptionType !== 'REINSCRIPTION').length,
        reCount: yrInscs.filter((i) => i.inscriptionType === 'REINSCRIPTION').length,
      };
    });

    return {
      byFiliere,
      byLevel,
      byParcours,
      byGroup,
      newVsRe,
      monthlyEvolution,
      byAcademicYear,
    };
  }, [
    filteredYearInscriptions,
    filieres,
    parcours,
    groups,
    academicYears,
    inscriptions,
    studentsById,
    filiereFilter,
    levelFilter,
    kpis.newEnrollments,
    kpis.reEnrollments,
  ]);

  // Section 3.5: 6 Clickable Administrative Alerts
  const alertsData = useMemo(() => {
    const activeInscs = filteredYearInscriptions.filter((i) => i.status !== 'REJECTED');

    const unassignedList = activeInscs.filter((i) => !i.groupId);
    const incompleteList = activeInscs.filter((i) => {
      const st = studentsById.get(i.studentId);
      if (!st) return false;
      const comp = computeStudentDossierCompleteness(st);
      return !(
        comp.percentage >= 80 ||
        Boolean(i.dossierComplete) ||
        st.administrativeFolderStatus === 'COMPLET'
      );
    });
    const pendingList = filteredYearInscriptions.filter(
      (i) => i.status === 'PENDING' || i.status === 'DRAFT'
    );
    const fullGroupsList = chartsData.byGroup.filter((g) => g.count >= g.capacity);
    const almostFullGroupsList = chartsData.byGroup.filter(
      (g) => g.count < g.capacity && g.fillPct >= 80
    );
    const regularizeAcademicList = filteredYearInscriptions.filter(
      (i) =>
        i.academicStatus === 'PASSAGE_CONDITIONNEL' ||
        i.specialCaseType === 'PASSAGE_CONDITIONNEL' ||
        i.specialCaseType === 'REORIENTATION' ||
        i.specialCaseType === 'TRANSFERT' ||
        i.status === 'SUSPENDED'
    );

    return {
      unassignedList,
      incompleteList,
      pendingList,
      fullGroupsList,
      almostFullGroupsList,
      regularizeAcademicList,
    };
  }, [filteredYearInscriptions, studentsById, chartsData.byGroup]);

  // Phase 6: Non-destructive data diagnostic on existing users & inscriptions
  const migrationDiagnostic = useMemo(() => {
    const allStudents = Array.from(studentsById.values());
    const studentsWithoutAnyInscription = allStudents.filter(
      (st) => !inscriptions.some((i) => i.studentId === st.id)
    );
    const duplicateActiveInscriptions: { studentId: string; academicYear: string; count: number }[] = [];
    const seenMap = new Map<string, number>();
    inscriptions
      .filter((i) => i.status !== 'REJECTED')
      .forEach((i) => {
        const key = `${i.studentId}__${i.academicYear}`;
        seenMap.set(key, (seenMap.get(key) || 0) + 1);
      });
    seenMap.forEach((count, key) => {
      if (count > 1) {
        const [studentId, academicYear] = key.split('__');
        duplicateActiveInscriptions.push({ studentId, academicYear, count });
      }
    });

    return {
      totalStudentProfiles: allStudents.length,
      totalInscriptions: inscriptions.length,
      studentsWithoutAnyInscription,
      duplicateActiveInscriptions,
    };
  }, [studentsById, inscriptions]);

  return (
    <div className="space-y-5 text-xs">
      {/* Section 3.2 : Barre des 6 Filtres Dynamiques du Tableau de Bord */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#2F6FED]" />
            <h2 className="text-sm font-black text-[#17345B] uppercase tracking-wider">
              Pilotage & Tableau de bord académique des étudiants
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowMigrationDiag(!showMigrationDiag)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Database className="w-3.5 h-3.5 text-[#2F6FED]" />
              <span>Audit d’intégrité des données</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
          {/* 1. Année académique */}
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
          >
            <option value="ALL">Toutes les années</option>
            {academicYears.map((ay) => (
              <option key={ay.id} value={ay.code}>
                Année : {ay.code} {ay.isCurrent ? '(Active)' : ''}
              </option>
            ))}
          </select>

          {/* 2. Mention / Filière */}
          <select
            value={filiereFilter}
            onChange={(e) => {
              setFiliereFilter(e.target.value);
              setParcoursFilter('ALL');
              setGroupFilter('ALL');
            }}
            className="p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700"
          >
            <option value="ALL">Toutes les Filières</option>
            {filieres.map((f) => (
              <option key={f.id} value={f.id}>
                {f.code} — {f.name}
              </option>
            ))}
          </select>

          {/* 3. Parcours */}
          <select
            value={parcoursFilter}
            onChange={(e) => setParcoursFilter(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700"
          >
            <option value="ALL">Tous les Parcours</option>
            {parcours
              .filter((p) => filiereFilter === 'ALL' || p.filiereId === filiereFilter)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} — {p.name}
                </option>
              ))}
          </select>

          {/* 4. Niveau */}
          <select
            value={levelFilter}
            onChange={(e) => {
              setLevelFilter(e.target.value);
              setGroupFilter('ALL');
            }}
            className="p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700"
          >
            <option value="ALL">Tous les Niveaux (L1–M2)</option>
            {['L1', 'L2', 'L3', 'M1', 'M2'].map((lvl) => (
              <option key={lvl} value={lvl}>
                Niveau {lvl}
              </option>
            ))}
          </select>

          {/* 5. Groupe */}
          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700"
          >
            <option value="ALL">Tous les Groupes</option>
            <option value="UNASSIGNED">Sans groupe (Non affectés)</option>
            {groups
              .filter((g) => {
                if (filiereFilter !== 'ALL' && g.filiereId !== filiereFilter) return false;
                if (levelFilter !== 'ALL' && g.level !== levelFilter) return false;
                return true;
              })
              .map((g) => (
                <option key={g.id} value={g.id}>
                  {g.code} — {g.name}
                </option>
              ))}
          </select>

          {/* 6. Statut */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700"
          >
            <option value="ALL">Tous les Statuts</option>
            <option value="CONFIRMED">Inscriptions confirmées</option>
            <option value="PENDING">En attente</option>
            <option value="DRAFT">Brouillons</option>
            <option value="SUSPENDED">Suspendues</option>
            <option value="REJECTED">Rejetées</option>
          </select>
        </div>

        {/* Phase 6 : Panneau de diagnostic et migration non destructive */}
        {showMigrationDiag && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-black text-[#17345B]">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>
                  Diagnostic d’architecture : Dossiers permanents (`users`) vs Inscriptions annuelles (`inscriptions`)
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                Clé d’unicité : studentId + academicYear
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">
                  Dossiers étudiants permanents
                </span>
                <span className="text-lg font-black text-[#17345B]">
                  {migrationDiagnostic.totalStudentProfiles}
                </span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">
                  Inscriptions annuelles enregistrées
                </span>
                <span className="text-lg font-black text-[#2F6FED]">
                  {migrationDiagnostic.totalInscriptions}
                </span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">
                  Étudiants au répertoire sans inscription
                </span>
                <span className="text-lg font-black text-amber-700">
                  {migrationDiagnostic.studentsWithoutAnyInscription.length}
                </span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">
                  Doublons actifs détectés
                </span>
                <span className="text-lg font-black text-emerald-700">
                  {migrationDiagnostic.duplicateActiveInscriptions.length}
                </span>
              </div>
            </div>
            {migrationDiagnostic.studentsWithoutAnyInscription.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <span className="text-amber-900 font-semibold">
                  {migrationDiagnostic.studentsWithoutAnyInscription.length} profil(s) étudiant(s) existent dans le répertoire sans fiche d’inscription annuelle rattachée.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    let migrated = 0;
                    migrationDiagnostic.studentsWithoutAnyInscription.forEach((st) => {
                      const grp = groups.find((g) => g.id === st.groupId);
                      const filId = st.filiereId || grp?.filiereId || filieres[0]?.id || 'fil-1';
                      const lvl = st.currentLevel || grp?.level || 'L1';
                      const yr = st.academicYearJoined || selectedAcademicYear || '2026-2027';
                      const res = inscribeStudent(st.id, yr, filId, lvl, st.groupId || '', {
                        parcoursId: st.parcoursId || grp?.parcoursId,
                        inscriptionType: 'PREMIERE_INSCRIPTION',
                        status: 'CONFIRMED',
                      });
                      if (res.success) migrated++;
                    });
                    showAppToast({
                      type: 'success',
                      title: 'Synchronisation non destructive terminée',
                      message: `${migrated} inscription(s) annuelle(s) générée(s) à partir des profils existants.`,
                    });
                  }}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg cursor-pointer"
                >
                  Rattacher à l’année active (Sans perte de données)
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Section 3.3 : Les 9 Cartes d'Indicateurs Officiels (Calculées sur les inscriptions annuelles) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-9 gap-3">
        {[
          {
            title: '1. Total inscrits',
            value: kpis.totalEnrolled,
            sub: yearFilter === 'ALL' ? 'Toutes années' : `Année ${yearFilter}`,
            color: 'text-[#17345B]',
            bg: 'bg-blue-50 text-[#2F6FED]',
            icon: Users,
          },
          {
            title: '2. Nouvelles insc.',
            value: kpis.newEnrollments,
            sub: 'Premières admissions',
            color: 'text-[#2F6FED]',
            bg: 'bg-blue-50 text-[#2F6FED]',
            icon: UserPlus,
          },
          {
            title: '3. Réinscriptions',
            value: kpis.reEnrollments,
            sub: 'Anciens étudiants EBM',
            color: 'text-indigo-700',
            bg: 'bg-indigo-50 text-indigo-600',
            icon: RefreshCw,
          },
          {
            title: '4. En attente',
            value: kpis.pendingEnrollments,
            sub: 'À valider / Brouillons',
            color: 'text-amber-600',
            bg: 'bg-amber-50 text-amber-600',
            icon: Clock,
          },
          {
            title: '5. Confirmées',
            value: kpis.confirmedEnrollments,
            sub: 'Inscriptions validées',
            color: 'text-emerald-700',
            bg: 'bg-emerald-50 text-emerald-600',
            icon: CheckCircle2,
          },
          {
            title: '6. Suspendues',
            value: kpis.suspendedEnrollments,
            sub: 'Interruption / Suspension',
            color: 'text-rose-600',
            bg: 'bg-rose-50 text-rose-600',
            icon: PauseCircle,
          },
          {
            title: '7. Sans groupe',
            value: kpis.unassignedStudents,
            sub: 'En attente d’affectation',
            color: 'text-amber-700',
            bg: 'bg-amber-100 text-amber-800',
            icon: UserX,
          },
          {
            title: '8. Affectés',
            value: kpis.assignedStudents,
            sub: 'Ayant un groupe actif',
            color: 'text-emerald-700',
            bg: 'bg-emerald-50 text-emerald-700',
            icon: UserCheck,
          },
          {
            title: '9. Dossiers incompl.',
            value: kpis.incompleteDossiers,
            sub: 'Pièces à régulariser',
            color: 'text-orange-600',
            bg: 'bg-orange-50 text-orange-600',
            icon: AlertTriangle,
          },
        ].map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between"
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 leading-tight">
                  {card.title}
                </span>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${card.bg}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2">
                <span className={`text-2xl font-black block leading-none ${card.color}`}>
                  {card.value}
                </span>
                <span className="text-[10px] text-slate-500 mt-1 block truncate">{card.sub}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Section 3.5 : Les 6 Alertes Administratives Cliquables */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-[#17345B] uppercase tracking-wider">
              Alertes administratives & Contrôle de cohérence (Cliquables)
            </h3>
            <p className="text-[11px] text-slate-500">
              Cliquez sur une alerte pour consulter immédiatement la liste correspondante ou accéder à l’espace de traitement.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            {
              key: 'UNASSIGNED_STUDENTS' as DashboardAlertKey,
              title: '1. Étudiants inscrits mais non affectés',
              count: alertsData.unassignedList.length,
              desc: 'Inscrits sans groupe pédagogique attribué',
              tone:
                alertsData.unassignedList.length > 0
                  ? 'border-amber-300 bg-amber-50/70 text-amber-950'
                  : 'border-slate-200 bg-slate-50 text-slate-600',
              actionLabel: 'Affecter aux groupes',
            },
            {
              key: 'INCOMPLETE_DOSSIERS' as DashboardAlertKey,
              title: '2. Dossiers administratifs incomplets',
              count: alertsData.incompleteList.length,
              desc: 'Pièces justificatives ou informations manquantes',
              tone:
                alertsData.incompleteList.length > 0
                  ? 'border-orange-300 bg-orange-50/70 text-orange-950'
                  : 'border-slate-200 bg-slate-50 text-slate-600',
              actionLabel: 'Voir les dossiers',
            },
            {
              key: 'PENDING_ENROLLMENTS' as DashboardAlertKey,
              title: '3. Inscriptions en attente de validation',
              count: alertsData.pendingList.length,
              desc: 'Dossiers soumis ou brouillons à confirmer',
              tone:
                alertsData.pendingList.length > 0
                  ? 'border-blue-300 bg-blue-50/70 text-blue-950'
                  : 'border-slate-200 bg-slate-50 text-slate-600',
              actionLabel: 'Vérifier la liste',
            },
            {
              key: 'FULL_GROUPS' as DashboardAlertKey,
              title: '4. Groupes ayant atteint leur capacité',
              count: alertsData.fullGroupsList.length,
              desc: 'Aucune place restante sans dérogation',
              tone:
                alertsData.fullGroupsList.length > 0
                  ? 'border-rose-300 bg-rose-50/70 text-rose-950'
                  : 'border-slate-200 bg-slate-50 text-slate-600',
              actionLabel: 'Inspecter les groupes',
            },
            {
              key: 'ALMOST_FULL_GROUPS' as DashboardAlertKey,
              title: '5. Groupes presque complets (≥ 80%)',
              count: alertsData.almostFullGroupsList.length,
              desc: 'Seuil d’alerte de capacité proche',
              tone:
                alertsData.almostFullGroupsList.length > 0
                  ? 'border-indigo-300 bg-indigo-50/70 text-indigo-950'
                  : 'border-slate-200 bg-slate-50 text-slate-600',
              actionLabel: 'Voir les capacités',
            },
            {
              key: 'REGULARIZE_ACADEMIC' as DashboardAlertKey,
              title: '6. Situations académiques à régulariser',
              count: alertsData.regularizeAcademicList.length,
              desc: 'Passages conditionnels, transferts ou suspensions',
              tone:
                alertsData.regularizeAcademicList.length > 0
                  ? 'border-purple-300 bg-purple-50/70 text-purple-950'
                  : 'border-slate-200 bg-slate-50 text-slate-600',
              actionLabel: 'Consulter les cas',
            },
          ].map((alertItem) => (
            <button
              key={alertItem.key}
              type="button"
              onClick={() =>
                setActiveAlertDetail((prev) => (prev === alertItem.key ? null : alertItem.key))
              }
              className={`p-4 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 cursor-pointer hover:shadow-sm ${alertItem.tone}`}
            >
              <div>
                <div className="font-black text-xs">{alertItem.title}</div>
                <p className="text-[11px] opacity-80 mt-0.5">{alertItem.desc}</p>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold underline mt-2">
                  <span>{alertItem.actionLabel}</span>
                  <ChevronRight className="w-3 h-3" />
                </span>
              </div>
              <div className="text-2xl font-black px-3 py-1.5 bg-white/80 rounded-xl border border-black/5 shrink-0">
                {alertItem.count}
              </div>
            </button>
          ))}
        </div>

        {/* Liste détaillée ouverte au clic sur une alerte */}
        {activeAlertDetail && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
              <span className="font-black text-[#17345B] uppercase">
                Détail de l’alerte sélectionnée : {activeAlertDetail}
              </span>
              <div className="flex items-center gap-2">
                {activeAlertDetail === 'UNASSIGNED_STUDENTS' && (
                  <button
                    type="button"
                    onClick={() =>
                      onNavigateToSpace('GROUP_ASSIGNMENT', {
                        academicYear: yearFilter === 'ALL' ? selectedAcademicYear : yearFilter,
                      })
                    }
                    className="px-3 py-1.5 bg-[#2F6FED] text-white rounded-lg font-bold cursor-pointer"
                  >
                    Ouvrir l’Espace 4 (Affectation aux groupes)
                  </button>
                )}
                {activeAlertDetail === 'INCOMPLETE_DOSSIERS' && (
                  <button
                    type="button"
                    onClick={() =>
                      onNavigateToSpace('LISTS_EXPORTS', {
                        academicYear: yearFilter,
                        dossierFilter: 'INCOMPLETE',
                      })
                    }
                    className="px-3 py-1.5 bg-[#2F6FED] text-white rounded-lg font-bold cursor-pointer"
                  >
                    Exporter la liste des dossiers incomplets
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setActiveAlertDetail(null)}
                  className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg font-bold cursor-pointer"
                >
                  Fermer
                </button>
              </div>
            </div>

            {activeAlertDetail === 'FULL_GROUPS' || activeAlertDetail === 'ALMOST_FULL_GROUPS' ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {(activeAlertDetail === 'FULL_GROUPS'
                  ? alertsData.fullGroupsList
                  : alertsData.almostFullGroupsList
                ).map((g) => (
                  <div key={g.id} className="p-3 bg-white rounded-xl border border-slate-200">
                    <div className="flex justify-between font-bold">
                      <span className="font-mono text-[#17345B]">{g.code}</span>
                      <span>
                        {g.count} / {g.capacity} places ({g.fillPct}%)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{g.name}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto max-h-60">
                <table className="w-full text-left text-xs bg-white rounded-xl overflow-hidden">
                  <thead className="bg-slate-100 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500">
                    <tr>
                      <th className="p-2.5">Matricule</th>
                      <th className="p-2.5">Étudiant</th>
                      <th className="p-2.5">Année & Niveau</th>
                      <th className="p-2.5">Groupe</th>
                      <th className="p-2.5">Statut</th>
                      <th className="p-2.5 text-right">Dossier</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(activeAlertDetail === 'UNASSIGNED_STUDENTS'
                      ? alertsData.unassignedList
                      : activeAlertDetail === 'INCOMPLETE_DOSSIERS'
                      ? alertsData.incompleteList
                      : activeAlertDetail === 'PENDING_ENROLLMENTS'
                      ? alertsData.pendingList
                      : alertsData.regularizeAcademicList
                    ).map((insc) => {
                      const st = studentsById.get(insc.studentId);
                      if (!st) return null;
                      const grp = groups.find((g) => g.id === insc.groupId);
                      return (
                        <tr key={insc.id} className="hover:bg-slate-50">
                          <td className="p-2.5 font-mono font-bold text-[#17345B]">
                            {st.matricule}
                          </td>
                          <td className="p-2.5 font-bold">{st.name}</td>
                          <td className="p-2.5">
                            {insc.academicYear} • {insc.level}
                          </td>
                          <td className="p-2.5 font-mono">
                            {grp ? grp.code : 'Sans groupe'}
                          </td>
                          <td className="p-2.5">{insc.status}</td>
                          <td className="p-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => onOpenStudentDossier(st)}
                              className="px-2.5 py-1 bg-blue-50 text-[#2F6FED] rounded-lg font-bold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Ouvrir fiche</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Section 3.4 : Les 7 Graphiques & Répartitions Visuelles */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Graphique 1 : Inscriptions par filière */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
          <h4 className="font-black text-[#17345B] uppercase">
            1. Inscriptions par Mention / Filière
          </h4>
          <div className="space-y-2.5">
            {chartsData.byFiliere.map((item) => (
              <div key={item.id} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-slate-800">{item.label}</span>
                  <span className="font-mono font-bold text-[#17345B]">
                    {item.count} inscrit(s) ({item.pct}%)
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#2F6FED] rounded-full transition-all"
                    style={{ width: `${item.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Graphique 2 : Inscriptions par niveau & Graphique 5 : Nouvelles vs Réinscriptions */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div>
            <h4 className="font-black text-[#17345B] uppercase mb-2.5">
              2. Inscriptions par Niveau d’études (L1 à M2)
            </h4>
            <div className="grid grid-cols-5 gap-2.5">
              {chartsData.byLevel.map((item) => (
                <div
                  key={item.level}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center"
                >
                  <span className="text-xs font-black text-[#2F6FED] block">{item.level}</span>
                  <span className="text-lg font-black text-[#17345B] mt-1 block">{item.count}</span>
                  <span className="text-[10px] text-slate-500">{item.pct}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100">
            <h4 className="font-black text-[#17345B] uppercase mb-2">
              5. Nouvelles inscriptions vs Réinscriptions
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-blue-700 block">
                    Nouvelles inscriptions
                  </span>
                  <span className="text-xl font-black text-[#17345B]">
                    {chartsData.newVsRe.newCount}
                  </span>
                </div>
                <span className="font-mono font-bold text-blue-800">
                  {chartsData.newVsRe.newPct}%
                </span>
              </div>
              <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-indigo-700 block">
                    Réinscriptions
                  </span>
                  <span className="text-xl font-black text-indigo-950">
                    {chartsData.newVsRe.reCount}
                  </span>
                </div>
                <span className="font-mono font-bold text-indigo-800">
                  {chartsData.newVsRe.rePct}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Graphique 3 : Inscriptions par parcours */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
          <h4 className="font-black text-[#17345B] uppercase">3. Inscriptions par Parcours</h4>
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {chartsData.byParcours.map((p) => (
              <div key={p.id} className="space-y-1">
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-700">{p.label}</span>
                  <span className="font-mono font-bold">
                    {p.count} ({p.pct}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full"
                    style={{ width: `${p.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Graphique 4 : Inscriptions par groupe & Capacités */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-black text-[#17345B] uppercase">
              4. Inscriptions par Groupe & Taux de remplissage
            </h4>
            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-bold text-[10px]">
              Sans groupe : {kpis.unassignedStudents}
            </span>
          </div>
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {chartsData.byGroup.map((g) => (
              <div key={g.id} className="space-y-1">
                <div className="flex justify-between">
                  <span className="font-mono font-bold text-[#17345B]">
                    {g.code} <span className="font-sans font-normal text-slate-500">({g.name})</span>
                  </span>
                  <span className="font-mono font-bold">
                    {g.count} / {g.capacity} pl. ({g.fillPct}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      g.count >= g.capacity
                        ? 'bg-rose-600'
                        : g.fillPct >= 80
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${g.fillPct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Graphique 6 : Évolution mensuelle des inscriptions */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#2F6FED]" />
            <h4 className="font-black text-[#17345B] uppercase">
              6. Évolution mensuelle des inscriptions
            </h4>
          </div>
          {chartsData.monthlyEvolution.length === 0 ? (
            <p className="text-slate-400 italic">Aucune donnée mensuelle pour cette sélection.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {chartsData.monthlyEvolution.map((m) => (
                <div
                  key={m.ym}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between"
                >
                  <span className="font-bold text-slate-700">{m.label}</span>
                  <span className="font-mono font-black text-sm text-[#2F6FED]">{m.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Graphique 7 : Comparaison des années académiques */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#2F6FED]" />
            <h4 className="font-black text-[#17345B] uppercase">
              7. Comparaison multi-années académiques
            </h4>
          </div>
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500">
                <tr>
                  <th className="p-2.5">Année académique</th>
                  <th className="p-2.5 text-right">Nouvelles insc.</th>
                  <th className="p-2.5 text-right">Réinscriptions</th>
                  <th className="p-2.5 text-right">Total inscrits</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {chartsData.byAcademicYear.map((row) => (
                  <tr key={row.code} className="hover:bg-slate-50">
                    <td className="p-2.5 font-mono font-bold text-[#17345B]">
                      {row.code}{' '}
                      {row.isCurrent && (
                        <span className="ml-1 px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[9px] font-sans">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="p-2.5 text-right font-mono text-blue-700 font-bold">
                      {row.newCount}
                    </td>
                    <td className="p-2.5 text-right font-mono text-indigo-700 font-bold">
                      {row.reCount}
                    </td>
                    <td className="p-2.5 text-right font-mono font-black text-slate-900">
                      {row.total}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
