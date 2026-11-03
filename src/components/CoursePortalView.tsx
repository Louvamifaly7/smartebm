import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  computeStudentCourseSummaries,
  computeTeacherCourseSummaries,
  computeAdminPilotageAnomalies,
  computeFiliereExecutiveSummaries,
  formatPortalDateFr,
  getStrictValidatedSessionHours,
  StudentCourseSummary,
  AdminPilotageAnomaly,
  AcademicValidationState,
  StudentAttendanceStatus,
} from '../utils/coursePortalStats';
import {
  BookOpen,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  User,
  FileText,
  Award,
  Search,
  Download,
  Building2,
  Layers,
  GraduationCap,
  ChevronRight,
  ChevronDown,
  ShieldAlert,
  History,
  X,
  FolderOpen,
  ClipboardCheck,
  BarChart3,
  Filter,
  Eye,
  Edit3,
  MapPin,
  ArrowRight,
  Info,
  Printer,
  ListChecks,
  Flag,
} from 'lucide-react';
import { SessionValidationModal } from './SessionValidationModal';
import { showAppToast } from './ToastAndConfirmCenter';
import {
  CourseSessionRegisterModal,
  getEffectiveSessionStatus,
  getEffectiveReportStatus,
  RegisterEffectiveSessionStatus,
  RegisterEffectiveReportStatus,
} from './CourseSessionRegisterModal';
import { TimetableSession, SessionReportRevision } from '../types';

export const CoursePortalView: React.FC = () => {
  const { currentUser } = useApp();

  if (!currentUser) return null;

  if (currentUser.role === 'STUDENT') {
    return <StudentCoursesView />;
  }

  if (currentUser.role === 'TEACHER') {
    return <TeacherCoursesView />;
  }

  return <AdminCoursesView />;
};

// ============================================================================
// HELPER BADGES FOR DUAL PROGRESSION (RECOMMENDATION #1) & ATTENDANCE
// ============================================================================

const renderAcademicBadge = (summary: StudentCourseSummary) => {
  const state: AcademicValidationState = summary.academicState;
  if (state === 'VALIDATED') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
        <Award className="w-3.5 h-3.5 text-emerald-600" />
        UE/EC Validé ({summary.publishedScore?.toFixed(2)}/20)
      </span>
    );
  }
  if (state === 'COMPENSATED') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
        <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
        Validé par compensation ({summary.publishedScore?.toFixed(2)}/20)
      </span>
    );
  }
  if (state === 'NOT_VALIDATED') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
        UE/EC Non validé ({summary.publishedScore?.toFixed(2)}/20)
      </span>
    );
  }
  if (state === 'UNPUBLISHED') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
        <Clock className="w-3.5 h-3.5 text-amber-600" />
        Évaluation en cours de publication
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
      <Clock className="w-3.5 h-3.5 text-slate-500" />
      En attente d’évaluation
    </span>
  );
};

const renderAttendanceBadge = (status: StudentAttendanceStatus) => {
  switch (status) {
    case 'PRESENT':
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800">
          Présent
        </span>
      );
    case 'LATE':
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800">
          En retard
        </span>
      );
    case 'JUSTIFIED':
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800">
          Absence justifiée
        </span>
      );
    case 'ABSENT':
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800">
          Absent
        </span>
      );
    default:
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-600">
          Non renseigné
        </span>
      );
  }
};

// ============================================================================
// 1. VUE ÉTUDIANT (« Suivi des cours » — Section 3)
// ============================================================================
const StudentCoursesView: React.FC = () => {
  const {
    currentUser,
    courses,
    sessions,
    users,
    grades,
    homework,
    submissions,
    learningResources,
    ues,
    ecs,
    filieres,
    parcours,
    groups,
    inscriptions,
    rooms,
    qrSessions,
    selectedAcademicYear,
    getStudentUeSummary,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [semesterFilter, setSemesterFilter] = useState<string>('ALL');
  const [ueFilter, setUeFilter] = useState<string>('ALL');
  const [hourlyStatusFilter, setHourlyStatusFilter] = useState<
    'ALL' | 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'
  >('ALL');
  const [academicStatusFilter, setAcademicStatusFilter] = useState<
    'ALL' | 'VALIDATED' | 'NOT_VALIDATED' | 'PENDING'
  >('ALL');
  const [displayMode, setDisplayMode] = useState<'HIERARCHY' | 'CARDS'>('HIERARCHY');
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [registerCourseId, setRegisterCourseId] = useState<string | null>(null);

  const teachers = useMemo(() => users.filter((u) => u.role === 'TEACHER'), [users]);

  const summaries = useMemo(
    () =>
      computeStudentCourseSummaries(currentUser, courses, sessions, teachers, grades, {
        ues,
        ecs,
        filieres,
        parcours,
        rooms,
        qrSessions,
        homework,
        submissions,
        inscriptions,
        academicYear: selectedAcademicYear,
        getStudentUeSummary,
      }),
    [
      currentUser,
      courses,
      sessions,
      teachers,
      grades,
      ues,
      ecs,
      filieres,
      parcours,
      rooms,
      qrSessions,
      homework,
      submissions,
      inscriptions,
      selectedAcademicYear,
      getStudentUeSummary,
    ]
  );

  // Student active academic enrollment context (Filière -> Parcours -> Niveau -> Groupe)
  const studentEnrollmentInfo = useMemo(() => {
    const activeIns = inscriptions.find(
      (ins) =>
        (ins.studentId === currentUser.id ||
          (currentUser.uid && ins.studentUid === currentUser.uid)) &&
        (!ins.academicYear || ins.academicYear === selectedAcademicYear) &&
        ins.status !== 'SUSPENDED' &&
        ins.status !== 'REJECTED'
    );
    const groupObj = groups.find(
      (g) => g.id === (activeIns?.groupId || currentUser.groupId)
    );
    const filiereObj = filieres.find(
      (f) => f.id === (activeIns?.filiereId || currentUser.filiereId || groupObj?.filiereId)
    );
    const parcoursObj = parcours.find(
      (p) => p.id === (activeIns?.parcoursId || currentUser.parcoursId || groupObj?.parcoursId)
    );
    const levelLabel =
      activeIns?.level ||
      currentUser.currentLevel ||
      groupObj?.level ||
      summaries[0]?.level ||
      'L1';

    return {
      filiereName: filiereObj?.name || summaries[0]?.filiere?.name || 'Filière EBM',
      filiereCode: filiereObj?.code || summaries[0]?.filiere?.code || 'EBM',
      parcoursName: parcoursObj?.name || summaries[0]?.parcours?.name || 'Tronc commun',
      level: levelLabel,
      groupCode: groupObj?.code || currentUser.groupId || 'Groupe',
    };
  }, [inscriptions, currentUser, selectedAcademicYear, groups, filieres, parcours, summaries]);

  // Global synthesis metrics for Student (Section 3.2 & 6.2)
  const studentGlobalMetrics = useMemo(() => {
    const totalCourses = summaries.length;
    const startedCourses = summaries.filter(
      (s) => s.realizedHours > 0 && s.hourlyState !== 'COMPLETED'
    ).length;
    const completedHourlyCourses = summaries.filter((s) => s.hourlyState === 'COMPLETED').length;
    const validatedAcademicCourses = summaries.filter(
      (s) => s.academicState === 'VALIDATED' || s.academicState === 'COMPENSATED'
    ).length;

    const totalPublishedReports = summaries.reduce((acc, s) => acc + s.publishedReportsCount, 0);
    const totalPendingReports = summaries.reduce((acc, s) => acc + s.pendingReportsCount, 0);
    const totalRealizedSessions = summaries.reduce(
      (acc, s) => acc + s.completedSessions.length,
      0
    );

    let present = 0;
    let late = 0;
    let absent = 0;
    let justified = 0;
    summaries.forEach((s) => {
      present += s.presentCount;
      late += s.lateCount;
      absent += s.absentCount;
      justified += s.justifiedCount;
    });
    const totalRecorded = present + late + absent + justified;
    const globalAttendanceRate =
      totalRecorded > 0 ? Math.round(((present + late + justified) / totalRecorded) * 100) : null;

    const distinctUeIds = Array.from(
      new Set(summaries.map((s) => s.ue?.id).filter(Boolean) as string[])
    );
    const validatedCredits = distinctUeIds.reduce((sum, ueId) => {
      const ueSum = getStudentUeSummary(currentUser.id, ueId);
      return sum + (ueSum?.validatedCredits || 0);
    }, 0);
    const totalAttemptedCredits =
      summaries.reduce((acc, s) => acc + (s.creditsEcts || 0), 0) || 60;

    const allUpcoming = summaries
      .flatMap((s) =>
        s.upcomingSessions.map((sess) => ({
          session: sess,
          course: s.course,
          roomName: rooms.find((r) => r.id === sess.roomId)?.name || sess.roomId,
        }))
      )
      .sort(
        (a, b) =>
          a.session.date.localeCompare(b.session.date) ||
          a.session.startTime.localeCompare(b.session.startTime)
      );

    return {
      totalCourses,
      startedCourses,
      completedHourlyCourses,
      validatedAcademicCourses,
      totalPublishedReports,
      totalPendingReports,
      totalRealizedSessions,
      present,
      late,
      absent,
      justified,
      totalRecorded,
      globalAttendanceRate,
      validatedCredits,
      totalAttemptedCredits,
      nextSession: allUpcoming[0] || null,
    };
  }, [summaries, currentUser.id, getStudentUeSummary, rooms]);

  const availableSemesters = useMemo(
    () => Array.from(new Set(summaries.map((s) => s.semester))).sort(),
    [summaries]
  );

  const availableUes = useMemo(() => {
    const map = new Map<string, string>();
    summaries.forEach((s) => {
      if (s.ue) map.set(s.ue.id, `${s.ue.code} — ${s.ue.title}`);
    });
    return Array.from(map.entries());
  }, [summaries]);

  const filteredSummaries = useMemo(() => {
    return summaries.filter((s) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        s.course.title.toLowerCase().includes(q) ||
        s.course.code.toLowerCase().includes(q) ||
        s.teacherNames.toLowerCase().includes(q) ||
        (s.ue?.code || '').toLowerCase().includes(q) ||
        (s.ue?.title || '').toLowerCase().includes(q);

      if (!matchesSearch) return false;
      if (semesterFilter !== 'ALL' && s.semester !== semesterFilter) return false;
      if (ueFilter !== 'ALL' && s.course.ueId !== ueFilter) return false;
      if (hourlyStatusFilter !== 'ALL' && s.hourlyState !== hourlyStatusFilter) return false;

      if (academicStatusFilter === 'VALIDATED') {
        if (s.academicState !== 'VALIDATED' && s.academicState !== 'COMPENSATED') return false;
      } else if (academicStatusFilter === 'NOT_VALIDATED') {
        if (s.academicState !== 'NOT_VALIDATED') return false;
      } else if (academicStatusFilter === 'PENDING') {
        if (s.academicState !== 'EVALUATION_PENDING' && s.academicState !== 'UNPUBLISHED')
          return false;
      }

      return true;
    });
  }, [
    summaries,
    searchQuery,
    semesterFilter,
    ueFilter,
    hourlyStatusFilter,
    academicStatusFilter,
  ]);

  // Hierarchical grouping for Student (Section 3.1 : Filière → Parcours → Niveau → Semestre → UE → Cours)
  const groupedBySemesterAndUe = useMemo(() => {
    const semMap = new Map<
      string,
      Map<string, { ueTitle: string; ueCode: string; items: StudentCourseSummary[] }>
    >();

    filteredSummaries.forEach((item) => {
      const sem = item.semester || 'S1';
      if (!semMap.has(sem)) {
        semMap.set(sem, new Map());
      }
      const ueKey = item.ue?.id || 'SANS_UE';
      const ueCode = item.ue?.code || 'UE Générale';
      const ueTitle = item.ue?.title || 'Enseignements rattachés au parcours';

      const ueMap = semMap.get(sem)!;
      if (!ueMap.has(ueKey)) {
        ueMap.set(ueKey, { ueCode, ueTitle, items: [] });
      }
      ueMap.get(ueKey)!.items.push(item);
    });

    return Array.from(semMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([semester, ueMap]) => ({
        semester,
        ues: Array.from(ueMap.entries()).map(([ueId, data]) => ({
          ueId,
          ...data,
        })),
      }));
  }, [filteredSummaries]);

  const selectedSummary = useMemo(
    () => summaries.find((s) => s.course.id === selectedCourseId) || null,
    [summaries, selectedCourseId]
  );

  const firstName =
    currentUser.firstName || currentUser.name.split(' ').slice(-1)[0] || currentUser.name;

  // Helper to check if a session's report is officially published for students (Section 3.3 & 3.5)
  const isReportPublishedForStudent = (sess: TimetableSession) => {
    return getEffectiveReportStatus(sess) === 'PUBLIE';
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#17345B] via-[#1E4273] to-blue-900 rounded-2xl p-6 text-white shadow-lg flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-blue-200 text-xs font-semibold">
              <GraduationCap className="w-4 h-4 text-emerald-300" />
              <span>Suivi des cours & Comptes rendus • Année {selectedAcademicYear}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-xs font-bold">
              <span>{studentEnrollmentInfo.filiereName}</span>
              <span>→</span>
              <span>{studentEnrollmentInfo.parcoursName}</span>
              <span>→</span>
              <span>Niveau {studentEnrollmentInfo.level}</span>
              <span>({studentEnrollmentInfo.groupCode})</span>
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            Bonjour {firstName}, bienvenue dans votre espace Suivi des cours.
          </h1>
          <p className="text-xs sm:text-sm text-blue-100 max-w-2xl">
            Consultez le registre chronologique des séances de vos cours, accédez aux comptes rendus publiés par vos enseignants et suivez votre progression horaire et académique.
          </p>
        </div>

        {/* Recommendation #1 Explainer Box */}
        <div className="bg-white/10 backdrop-blur-xs border border-white/15 rounded-xl p-3.5 max-w-md text-xs space-y-1">
          <div className="font-bold text-amber-300 flex items-center gap-1.5">
            <Info className="w-4 h-4 shrink-0" />
            <span>Distinction Horaire vs Académique</span>
          </div>
          <p className="text-blue-100 text-[11px] leading-relaxed">
            Un cours peut avoir <strong>100 % de ses heures réalisées</strong> au planning sans que l'UE ou l'EC soit encore validé académiquement. Les comptes rendus sont accessibles dès leur publication officielle.
          </p>
        </div>
      </div>

      {/* 4 Synthesis Cards (Section 6.2 + CR publiés) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Assiduité globale */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              1. Assiduité globale
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <ClipboardCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="my-2">
            <p className="text-2xl font-black text-slate-900">
              {studentGlobalMetrics.globalAttendanceRate !== null
                ? `${studentGlobalMetrics.globalAttendanceRate}%`
                : 'Non renseigné'}
            </p>
            <p className="text-[11px] text-slate-500">
              Sur {studentGlobalMetrics.totalRecorded} séance(s) pointée(s)
            </p>
          </div>
          <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-100 text-[11px]">
            <span className="text-emerald-700 font-semibold">
              • Présences : {studentGlobalMetrics.present}
            </span>
            <span className="text-amber-700 font-semibold">
              • Retards : {studentGlobalMetrics.late}
            </span>
            <span className="text-rose-700 font-semibold">
              • Absences : {studentGlobalMetrics.absent}
            </span>
            <span className="text-blue-700 font-semibold">
              • Justifiées : {studentGlobalMetrics.justified}
            </span>
          </div>
        </div>

        {/* Card 2: Séances & Comptes rendus publiés */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              2. Séances & CR publiés
            </span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="my-2">
            <p className="text-2xl font-black text-slate-900">
              {studentGlobalMetrics.totalPublishedReports} CR disponible(s)
            </p>
            <p className="text-[11px] text-slate-500">
              Sur {studentGlobalMetrics.totalRealizedSessions} séance(s) effectuée(s) ({studentGlobalMetrics.totalCourses} cours)
            </p>
          </div>
          <div className="space-y-1 pt-2 border-t border-slate-100 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-600">Heures terminées (100%) :</span>
              <strong className="text-blue-700">
                {studentGlobalMetrics.completedHourlyCourses} / {studentGlobalMetrics.totalCourses}
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">CR en cours de validation :</span>
              <strong className="text-amber-700">{studentGlobalMetrics.totalPendingReports}</strong>
            </div>
          </div>
        </div>

        {/* Card 3: Crédits académiques */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              3. Crédits académiques LMD
            </span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="my-2">
            <p className="text-2xl font-black text-slate-900">
              {studentGlobalMetrics.validatedCredits}{' '}
              <span className="text-sm font-bold text-slate-400">
                / {studentGlobalMetrics.totalAttemptedCredits} ECTS
              </span>
            </p>
            <p className="text-[11px] text-slate-500">
              {studentGlobalMetrics.validatedAcademicCourses} EC validé(s) sur {studentGlobalMetrics.totalCourses}
            </p>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mt-1">
            <div
              className="h-full bg-purple-600 rounded-full transition-all"
              style={{
                width: `${Math.min(
                  100,
                  Math.round(
                    (studentGlobalMetrics.validatedCredits /
                      Math.max(1, studentGlobalMetrics.totalAttemptedCredits)) *
                      100
                  )
                )}%`,
              }}
            />
          </div>
        </div>

        {/* Card 4: Prochaine séance */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              4. Prochaine séance
            </span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          {studentGlobalMetrics.nextSession ? (
            <div className="my-1.5 space-y-1">
              <p className="text-xs font-black text-slate-900 line-clamp-1">
                {studentGlobalMetrics.nextSession.course.title}
              </p>
              <p className="text-xs font-bold text-blue-700 font-mono">
                {formatPortalDateFr(studentGlobalMetrics.nextSession.session.date)} •{' '}
                {studentGlobalMetrics.nextSession.session.startTime}-
                {studentGlobalMetrics.nextSession.session.endTime}
              </p>
              <p className="text-[11px] text-slate-500 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400" />
                Salle : {studentGlobalMetrics.nextSession.roomName}
              </p>
            </div>
          ) : (
            <div className="my-2">
              <p className="text-sm font-bold text-slate-400">Aucune séance programmée</p>
              <p className="text-[11px] text-slate-400">Votre planning à venir est libre.</p>
            </div>
          )}
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un cours, code EC, UE ou enseignant..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <select
            value={semesterFilter}
            onChange={(e) => setSemesterFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
          >
            <option value="ALL">Tous les semestres</option>
            {availableSemesters.map((sem) => (
              <option key={sem} value={sem}>
                Semestre {sem}
              </option>
            ))}
          </select>

          <select
            value={hourlyStatusFilter}
            onChange={(e) => setHourlyStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
          >
            <option value="ALL">Progression horaire : Tous</option>
            <option value="IN_PROGRESS">Heures en cours</option>
            <option value="COMPLETED">100% Heures terminées</option>
            <option value="NOT_STARTED">Non commencé (0h)</option>
          </select>

          <select
            value={academicStatusFilter}
            onChange={(e) => setAcademicStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
          >
            <option value="ALL">Validation académique : Tous</option>
            <option value="VALIDATED">UE/EC Validé (ou compensé)</option>
            <option value="NOT_VALIDATED">UE/EC Non validé (&lt; 10/20)</option>
            <option value="PENDING">En attente d'évaluation</option>
          </select>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setDisplayMode('HIERARCHY')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                displayMode === 'HIERARCHY'
                  ? 'bg-[#17345B] text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Par Semestre / UE
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode('CARDS')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                displayMode === 'CARDS'
                  ? 'bg-[#17345B] text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Grille directe
            </button>
          </div>
        </div>

        {availableUes.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Filtrer par UE :
            </span>
            <button
              type="button"
              onClick={() => setUeFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                ueFilter === 'ALL'
                  ? 'bg-[#17345B] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Toutes les UE
            </button>
            {availableUes.map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setUeFilter(id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                  ueFilter === id
                    ? 'bg-[#17345B] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Course Cards (Section 3.1 : Filière → Parcours → Niveau → Semestre → UE → Cours) */}
      {filteredSummaries.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700">Aucun cours trouvé</h3>
          <p className="text-xs text-slate-500 mt-1">
            Aucun cours ne correspond aux filtres sélectionnés pour votre inscription académique.
          </p>
        </div>
      ) : displayMode === 'HIERARCHY' ? (
        <div className="space-y-6">
          {groupedBySemesterAndUe.map((semGroup) => (
            <div
              key={semGroup.semester}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden"
            >
              <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-black text-slate-900">
                  <span className="px-2.5 py-1 rounded-lg bg-[#17345B] text-white">
                    Semestre {semGroup.semester}
                  </span>
                  <span className="text-slate-400">•</span>
                  <span>
                    {studentEnrollmentInfo.filiereName} ({studentEnrollmentInfo.parcoursName}) — Niveau{' '}
                    {studentEnrollmentInfo.level}
                  </span>
                </div>
                <span className="text-[11px] font-bold text-slate-500">
                  {semGroup.ues.reduce((acc, u) => acc + u.items.length, 0)} cours dans ce semestre
                </span>
              </div>

              <div className="p-5 space-y-6">
                {semGroup.ues.map((ueBlock) => (
                  <div key={ueBlock.ueId} className="space-y-3">
                    <div className="flex items-center gap-2 border-l-4 border-purple-600 pl-3 py-0.5">
                      <span className="font-mono font-black text-xs text-purple-900 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                        {ueBlock.ueCode}
                      </span>
                      <h3 className="text-sm font-black text-slate-800">{ueBlock.ueTitle}</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {ueBlock.items.map((s) => renderStudentCourseCard(s))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSummaries.map((s) => renderStudentCourseCard(s))}
        </div>
      )}

      {/* Detailed Course Modal / Drawer */}
      {selectedSummary && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-[#17345B] to-blue-900 text-white flex items-center justify-between shrink-0">
              <div>
                <div className="flex items-center gap-2 text-xs text-blue-200 font-mono">
                  <span>{selectedSummary.course.code}</span>
                  <span>•</span>
                  <span>{selectedSummary.semester}</span>
                  <span>•</span>
                  <span>{selectedSummary.creditsEcts} crédits ECTS</span>
                </div>
                <h3 className="text-lg font-black">{selectedSummary.course.title}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const cId = selectedSummary.course.id;
                    setSelectedCourseId(null);
                    setRegisterCourseId(cId);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs cursor-pointer flex items-center gap-1.5"
                >
                  <ListChecks className="w-4 h-4" />
                  <span>Ouvrir le registre complet des séances & CR</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCourseId(null)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6 text-xs">
              {/* Section A: Informations générales & Double Indicateur */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <h4 className="font-black text-slate-900 uppercase tracking-wider text-[11px]">
                    A.1 — Progression Horaire (Séances)
                  </h4>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xl font-black text-blue-900">
                      {selectedSummary.realizedHours}h / {selectedSummary.totalHours}h
                    </span>
                    <span className="font-bold text-slate-600">
                      {selectedSummary.hourlyProgressPercent}% réalisé ({selectedSummary.remainingHours}h restantes)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full"
                      style={{ width: `${selectedSummary.hourlyProgressPercent}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Enseignant(s) : <strong>{selectedSummary.teacherNames}</strong> •{' '}
                    <strong>{selectedSummary.publishedReportsCount}</strong> CR publié(s)
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <h4 className="font-black text-slate-900 uppercase tracking-wider text-[11px]">
                    A.2 — Progression Académique (Validation UE/EC)
                  </h4>
                  <div className="flex items-center justify-between">
                    {renderAcademicBadge(selectedSummary)}
                    {selectedSummary.ue && (
                      <span className="text-[11px] font-bold text-purple-800">
                        UE : {selectedSummary.ue.code}
                      </span>
                    )}
                  </div>
                  {selectedSummary.publishedGrade ? (
                    <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
                      <div className="p-2 bg-white rounded-lg border border-slate-200">
                        <span className="text-slate-400 block">Contrôle continu</span>
                        <strong>{selectedSummary.quizScore ?? '—'} / 20</strong>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-slate-200">
                        <span className="text-slate-400 block">Examen</span>
                        <strong>{selectedSummary.examScore ?? '—'} / 20</strong>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-slate-200">
                        <span className="text-slate-400 block">Note finale</span>
                        <strong className="text-blue-900">
                          {selectedSummary.publishedScore?.toFixed(2) ?? '—'} / 20
                        </strong>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500 pt-1">
                      Les notes finales ne sont affichées qu’après leur publication officielle par le jury ou la scolarité.
                    </p>
                  )}
                </div>
              </div>

              {/* Section B: Historique des séances réalisées (uniquement CR publiés) */}
              <div className="space-y-3">
                <h4 className="font-black text-slate-900 uppercase tracking-wider text-xs flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  <span>
                    B. Cahier de textes officiel & séances réalisées ({selectedSummary.completedSessions.length})
                  </span>
                </h4>

                {selectedSummary.completedSessions.length === 0 ? (
                  <p className="text-slate-400 italic p-4 bg-slate-50 rounded-xl border border-slate-200">
                    Aucune séance validée pour ce cours jusqu'à présent.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {selectedSummary.completedSessions.map((sess) => {
                      const detail = selectedSummary.sessionDetails.find(
                        (d) => d.session.id === sess.id
                      );
                      const isPublished = isReportPublishedForStudent(sess);
                      return (
                        <div
                          key={sess.id}
                          className="p-4 rounded-xl border border-slate-200 bg-white space-y-2 shadow-2xs"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-blue-900 bg-blue-50 px-2.5 py-0.5 rounded-md">
                                {formatPortalDateFr(sess.date)} • {sess.startTime}-{sess.endTime}
                              </span>
                              <span className="font-bold text-emerald-700">
                                {sess.report?.actualHours ?? 0}h réalisées
                              </span>
                              <span className="text-slate-500">
                                • Salle : {detail?.roomName || sess.roomId}
                              </span>
                            </div>
                            {detail && renderAttendanceBadge(detail.attendanceStatus)}
                          </div>

                          {isPublished && sess.report?.content ? (
                            <>
                              <div className="text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1">
                                {sess.report.chapterTitle && (
                                  <div className="font-black text-blue-900">
                                    Chapitre : {sess.report.chapterTitle}
                                  </div>
                                )}
                                <strong className="text-slate-900 block">
                                  Contenu pédagogique abordé :
                                </strong>
                                <p>{sess.report.content}</p>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                                {sess.report.homework && (
                                  <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-900">
                                    <strong>Travail à faire :</strong> {sess.report.homework}
                                  </div>
                                )}
                                {sess.report.nextSessionPlan && (
                                  <div className="p-2 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-900">
                                    <strong>Prochaine séance :</strong>{' '}
                                    {sess.report.nextSessionPlan}
                                  </div>
                                )}
                              </div>
                            </>
                          ) : (
                            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px] italic">
                              Compte rendu en cours de validation par la Direction.
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Section C: Séances à venir */}
              <div className="space-y-2">
                <h4 className="font-black text-slate-900 uppercase tracking-wider text-xs flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-600" />
                  <span>
                    C. Séances programmées à venir ({selectedSummary.upcomingSessions.length})
                  </span>
                </h4>
                {selectedSummary.upcomingSessions.length === 0 ? (
                  <p className="text-slate-400 italic">Aucune séance programmée prochainement.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedSummary.upcomingSessions.map((sess) => {
                      const roomName = rooms.find((r) => r.id === sess.roomId)?.name || sess.roomId;
                      return (
                        <div
                          key={sess.id}
                          className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between"
                        >
                          <div>
                            <p className="font-bold text-slate-900">
                              {formatPortalDateFr(sess.date)} ({sess.startTime}-{sess.endTime})
                            </p>
                            <p className="text-[11px] text-slate-500">Salle : {roomName}</p>
                          </div>
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-mono font-bold">
                            {sess.durationHours}h
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Section D & E: Travaux demandés & Ressources */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                <div className="space-y-2">
                  <h4 className="font-black text-slate-900 uppercase tracking-wider text-xs flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-amber-600" />
                    <span>D. Devoirs & Travaux ({selectedSummary.homeworkCount})</span>
                  </h4>
                  {homework
                    .filter(
                      (h) =>
                        (!currentUser.groupId || h.groupId === currentUser.groupId) &&
                        (h.ecId === selectedSummary.ec?.id ||
                          h.ecId === selectedSummary.course.id ||
                          h.ecId === selectedSummary.course.ecId)
                    )
                    .map((hw) => {
                      const sub = submissions.find(
                        (s) => s.homeworkId === hw.id && s.studentId === currentUser.id
                      );
                      return (
                        <div
                          key={hw.id}
                          className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <strong className="text-slate-900">{hw.title}</strong>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                sub
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {sub
                                ? sub.grade !== undefined
                                  ? `Corrigé (${sub.grade}/20)`
                                  : 'Remis'
                                : 'À rendre'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600">{hw.instructions}</p>
                          <p className="text-[10px] text-slate-500">
                            Date limite : {formatPortalDateFr(hw.dueDate)}
                          </p>
                        </div>
                      );
                    })}
                  {selectedSummary.homeworkCount === 0 && (
                    <p className="text-slate-400 italic">Aucun devoir rattaché.</p>
                  )}
                </div>

                <div className="space-y-2">
                  <h4 className="font-black text-slate-900 uppercase tracking-wider text-xs flex items-center gap-1.5">
                    <FolderOpen className="w-4 h-4 text-indigo-600" />
                    <span>E. Supports & Ressources de cours</span>
                  </h4>
                  {learningResources
                    .filter(
                      (r) =>
                        !r.isArchived &&
                        (r.ecId === selectedSummary.ec?.id ||
                          r.ecId === selectedSummary.course.id ||
                          r.groupId === currentUser.groupId)
                    )
                    .slice(0, 5)
                    .map((res) => (
                      <div
                        key={res.id}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-bold text-slate-900">{res.title}</p>
                          <p className="text-[10px] text-slate-500">
                            {res.category} • Publié le {formatPortalDateFr(res.publishedAt)}
                          </p>
                        </div>
                        <span className="px-2 py-1 bg-indigo-50 text-indigo-700 font-bold rounded text-[10px]">
                          Disponible
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Registre détaillé des séances et CR (Section 3.2 - 3.6) */}
      {registerCourseId && (
        <CourseSessionRegisterModal
          isOpen={true}
          courseId={registerCourseId}
          onClose={() => setRegisterCourseId(null)}
        />
      )}
    </div>
  );

  // Renders an individual student course card with all 9 mandatory items from Section 3.1
  function renderStudentCourseCard(s: StudentCourseSummary) {
    const publishedSessions = s.completedSessions.filter((sess) =>
      isReportPublishedForStudent(sess)
    );
    const lastPublishedSession = publishedSessions[0];
    const nextSession = s.upcomingSessions[0];
    const isHourlyDoneButNotAcademic =
      s.hourlyState === 'COMPLETED' &&
      s.academicState !== 'VALIDATED' &&
      s.academicState !== 'COMPENSATED';

    return (
      <div
        key={s.course.id}
        className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between space-y-4"
      >
        <div className="space-y-3">
          {/* Top meta badges */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="px-2.5 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 font-mono font-bold text-xs rounded-lg">
                {s.course.code}
              </span>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold text-[11px] rounded-lg">
                {s.semester} • {s.creditsEcts} ECTS
              </span>
              {s.ue && (
                <span className="px-2 py-0.5 bg-purple-50 text-purple-800 font-semibold text-[11px] rounded-lg">
                  UE : {s.ue.code}
                </span>
              )}
            </div>
            {s.attendanceRate !== undefined && (
              <span
                className={`px-2 py-0.5 rounded-lg text-[11px] font-bold ${
                  s.attendanceRate >= 80
                    ? 'bg-emerald-50 text-emerald-700'
                    : s.attendanceRate >= 60
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-rose-50 text-rose-700'
                }`}
              >
                Assiduité : {s.attendanceRate}%
              </span>
            )}
          </div>

          {/* Course Title & Teacher */}
          <div>
            <h3 className="text-base font-black text-slate-900">{s.course.title}</h3>
            <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>Enseignant : {s.teacherNames}</span>
            </p>
          </div>

          {/* Section 3.1 Mandatory Indicators Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[11px]">
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-500 block">Vol. prévu</span>
              <strong className="text-slate-900 font-black">{s.totalHours}h</strong>
            </div>
            <div className="p-2 rounded-xl bg-emerald-50/60 border border-emerald-200">
              <span className="text-emerald-800 block">Vol. réalisé</span>
              <strong className="text-emerald-700 font-black">{s.realizedHours}h</strong>
            </div>
            <div className="p-2 rounded-xl bg-blue-50/60 border border-blue-200">
              <span className="text-blue-800 block">Séances faites</span>
              <strong className="text-blue-700 font-black">
                {s.completedSessions.length} / {s.totalSessionsCount}
              </strong>
            </div>
            <div className="p-2 rounded-xl bg-indigo-50/60 border border-indigo-200">
              <span className="text-indigo-800 block">CR publiés</span>
              <strong className="text-indigo-700 font-black">{s.publishedReportsCount}</strong>
            </div>
          </div>

          {/* DUAL PROGRESSION BOX (Recommendation #1) */}
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-3">
            {/* 1. Progression Horaire */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  1. Progression horaire : {s.realizedHours}h / {s.totalHours}h
                </span>
                <span
                  className={`font-black ${
                    s.hourlyState === 'COMPLETED'
                      ? 'text-blue-700'
                      : s.hourlyState === 'IN_PROGRESS'
                      ? 'text-amber-700'
                      : 'text-slate-500'
                  }`}
                >
                  {s.hourlyProgressPercent}% (Reste {s.remainingHours}h)
                </span>
              </div>
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    s.hourlyState === 'COMPLETED' ? 'bg-blue-600' : 'bg-amber-500'
                  }`}
                  style={{ width: `${s.hourlyProgressPercent}%` }}
                />
              </div>
            </div>

            {/* 2. Progression / Validation Académique */}
            <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-purple-600" />
                2. Validation académique :
              </span>
              {renderAcademicBadge(s)}
            </div>

            {isHourlyDoneButNotAcademic && (
              <div className="p-2 bg-amber-50/90 border border-amber-200 rounded-lg text-[11px] text-amber-900 flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>100 % des heures sont terminées</strong>, mais la validation académique dépend du résultat officiel aux évaluations.
                </span>
              </div>
            )}
          </div>

          {/* Last Published Report Preview (Section 3.3 & 3.5) */}
          {lastPublishedSession?.report ? (
            <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 text-xs space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold text-blue-900">
                <span>
                  Dernier CR publié ({formatPortalDateFr(lastPublishedSession.date)})
                </span>
                <span>{lastPublishedSession.report.actualHours}h effectuées</span>
              </div>
              {lastPublishedSession.report.chapterTitle && (
                <p className="text-[11px] font-bold text-slate-900">
                  {lastPublishedSession.report.chapterTitle}
                </p>
              )}
              <p className="text-slate-700 line-clamp-2">{lastPublishedSession.report.content}</p>
              {lastPublishedSession.report.homework && (
                <p className="text-[11px] text-amber-800 font-semibold pt-0.5">
                  📌 Travail à préparer : {lastPublishedSession.report.homework}
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">
              {s.pendingReportsCount > 0
                ? `${s.pendingReportsCount} compte(s) rendu(s) en cours de validation administrative.`
                : 'Aucun compte rendu publié pour le moment.'}
            </p>
          )}
        </div>

        {/* Card Footer */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div className="text-[11px] text-slate-500">
            {nextSession ? (
              <span>
                Prochaine :{' '}
                <strong className="text-slate-800">
                  {formatPortalDateFr(nextSession.date)} ({nextSession.startTime})
                </strong>
              </span>
            ) : (
              <span>Aucune séance à venir</span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedCourseId(s.course.id)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs cursor-pointer"
            >
              Notes & Devoirs
            </button>
            <button
              type="button"
              onClick={() => setRegisterCourseId(s.course.id)}
              className="px-3.5 py-1.5 bg-[#17345B] hover:bg-blue-950 text-white font-bold rounded-xl text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ListChecks className="w-3.5 h-3.5" />
              <span>Registre des séances & CR</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }
};

// ============================================================================
// 2. VUE ENSEIGNANT (« Mes enseignements » — Section 4)
// ============================================================================
const TeacherCoursesView: React.FC = () => {
  const {
    currentUser,
    courses,
    sessions,
    ues,
    ecs,
    filieres,
    groups,
    users,
    grades,
    qrSessions,
    rooms,
    sessionPrivateReports,
    getSessionPrivateReport,
    selectedAcademicYear,
  } = useApp();

  const [viewMode, setViewMode] = useState<'BY_COURSE' | 'BY_SEMESTER' | 'TODO'>('BY_COURSE');
  const [selectedSessionForModal, setSelectedSessionForModal] = useState<string | null>(null);
  const [inspectHistorySessionId, setInspectHistorySessionId] = useState<string | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [registerCourseId, setRegisterCourseId] = useState<string | null>(null);

  const summaries = useMemo(
    () =>
      computeTeacherCourseSummaries(currentUser, courses, sessions, {
        ues,
        ecs,
        filieres,
        groups,
        users,
        grades,
        qrSessions,
        privateReports: sessionPrivateReports,
      }),
    [
      currentUser,
      courses,
      sessions,
      ues,
      ecs,
      filieres,
      groups,
      users,
      grades,
      qrSessions,
      sessionPrivateReports,
    ]
  );

  const globalStats = useMemo(() => {
    const totalCourses = summaries.length;
    const totalTarget = summaries.reduce((s, c) => s + c.totalHours, 0);
    const totalPlanned = summaries.reduce((s, c) => s + c.plannedHours, 0);
    const totalRealized = summaries.reduce((s, c) => s + c.realizedHours, 0);
    const totalRemaining = Math.max(0, Number((totalTarget - totalRealized).toFixed(1)));
    const pastUnvalidated = summaries.flatMap((c) => c.pastUnvalidatedSessions);
    const corrections = summaries.flatMap((c) => c.correctionRequestedSessions);
    const missingReports = summaries.flatMap((c) => c.sessionsMissingReport);
    const modifiedSessions = summaries.flatMap((c) => c.sessionsWithRevisions);

    return {
      totalCourses,
      totalTarget,
      totalPlanned,
      totalRealized,
      totalRemaining,
      pastUnvalidated,
      corrections,
      missingReports,
      modifiedSessions,
    };
  }, [summaries]);

  const inspectSession = useMemo(
    () => sessions.find((s) => s.id === inspectHistorySessionId) || null,
    [sessions, inspectHistorySessionId]
  );
  const inspectPrivateReport = inspectHistorySessionId
    ? getSessionPrivateReport(inspectHistorySessionId)
    : undefined;
  const inspectRevisions: SessionReportRevision[] =
    inspectPrivateReport?.revisions || inspectSession?.report?.revisions || [];

  const renderTeacherCrBadge = (sess: TimetableSession) => {
    const st = getEffectiveReportStatus(sess);
    if (st === 'PUBLIE') {
      return (
        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold">
          CR Publié
        </span>
      );
    }
    if (st === 'VALIDE') {
      return (
        <span className="px-2 py-0.5 bg-teal-100 text-teal-800 rounded text-[10px] font-bold">
          CR Validé
        </span>
      );
    }
    if (st === 'SOUMIS') {
      return (
        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-[10px] font-bold">
          CR Soumis (En attente)
        </span>
      );
    }
    if (st === 'EN_ATTENTE_BROUILLON') {
      return (
        <span className="px-2 py-0.5 bg-slate-200 text-slate-800 rounded text-[10px] font-bold">
          Brouillon / En attente
        </span>
      );
    }
    if (st === 'A_CORRIGER') {
      return (
        <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded text-[10px] font-bold">
          À corriger
        </span>
      );
    }
    if (st === 'REJETE') {
      return (
        <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded text-[10px] font-bold">
          CR Rejeté
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded text-[10px] font-bold">
        CR manquant
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#17345B] via-blue-900 to-indigo-950 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-blue-200 text-xs font-semibold">
            <BookOpen className="w-4 h-4 text-emerald-300" />
            <span>Portail Enseignant • Année {selectedAcademicYear}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black">
            Bonjour {currentUser.name}, voici le suivi de vos enseignements.
          </h1>
          <p className="text-xs sm:text-sm text-blue-100">
            Rédigez et soumettez vos comptes rendus de séances, suivez vos volumes horaires validés et consultez le registre complet de chaque cours.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode('BY_COURSE')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'BY_COURSE'
                ? 'bg-white text-[#17345B] shadow-sm'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            Par cours ({summaries.length})
          </button>
          <button
            type="button"
            onClick={() => setViewMode('BY_SEMESTER')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'BY_SEMESTER'
                ? 'bg-white text-[#17345B] shadow-sm'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            Par semestre
          </button>
          <button
            type="button"
            onClick={() => setViewMode('TODO')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'TODO'
                ? 'bg-amber-400 text-slate-950 shadow-sm'
                : 'bg-amber-500/20 text-amber-200 hover:bg-amber-500/30 border border-amber-400/30'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>
              À traiter ({globalStats.pastUnvalidated.length + globalStats.corrections.length})
            </span>
          </button>
        </div>
      </div>

      {/* 6 Synthesis Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Cours attribués</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{globalStats.totalCourses}</p>
          <span className="text-[11px] text-slate-400">Volume cible : {globalStats.totalTarget}h</span>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Heures planifiées</span>
          <p className="text-2xl font-black text-blue-700 mt-1">{globalStats.totalPlanned}h</p>
          <span className="text-[11px] text-slate-400">Au planning officiel</span>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Heures validées</span>
          <p className="text-2xl font-black text-emerald-700 mt-1">{globalStats.totalRealized}h</p>
          <span className="text-[11px] text-slate-400">Avec compte rendu</span>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Heures restantes</span>
          <p className="text-2xl font-black text-slate-800 mt-1">{globalStats.totalRemaining}h</p>
          <span className="text-[11px] text-slate-400">À réaliser sur l'année</span>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-amber-200 bg-amber-50/40 shadow-xs">
          <span className="text-[11px] font-bold text-amber-800 uppercase">À valider / CR</span>
          <p className="text-2xl font-black text-amber-700 mt-1">
            {globalStats.pastUnvalidated.length}
          </p>
          <span className="text-[11px] text-amber-700">Séances passées</span>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-rose-200 bg-rose-50/40 shadow-xs">
          <span className="text-[11px] font-bold text-rose-800 uppercase">Corrections</span>
          <p className="text-2xl font-black text-rose-700 mt-1">
            {globalStats.corrections.length}
          </p>
          <span className="text-[11px] text-rose-700">
            {globalStats.modifiedSessions.length} version(s) archivée(s)
          </span>
        </div>
      </div>

      {/* Priority "À faire" Section */}
      {(viewMode === 'TODO' ||
        globalStats.corrections.length > 0 ||
        globalStats.pastUnvalidated.length > 0) && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-amber-950 uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Actions prioritaires (« À faire »)</span>
            </h2>
            <span className="text-xs font-bold text-amber-800">
              {globalStats.corrections.length} correction(s) • {globalStats.pastUnvalidated.length} séance(s) à documenter
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {globalStats.corrections.map((sess) => {
              const c = courses.find((crs) => crs.id === sess.courseId);
              return (
                <div
                  key={sess.id}
                  className="bg-white p-4 rounded-xl border border-rose-300 shadow-2xs flex flex-col justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 bg-rose-100 text-rose-800 font-bold text-[10px] rounded">
                        CORRECTION DEMANDÉE
                      </span>
                      <span className="text-[11px] font-mono text-slate-500">
                        Séance du {formatPortalDateFr(sess.date)}
                      </span>
                    </div>
                    <h4 className="font-black text-slate-900 text-xs">
                      {c?.title || sess.eventTitle} ({c?.code})
                    </h4>
                    <p className="text-xs text-rose-900 bg-rose-50 p-2 rounded-lg border border-rose-200">
                      <strong>Motif :</strong>{' '}
                      {sess.correctionReason || 'Merci de compléter le compte rendu.'}
                    </p>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedSessionForModal(sess.id)}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Corriger & Archiver l'ancienne version</span>
                    </button>
                  </div>
                </div>
              );
            })}

            {globalStats.pastUnvalidated.slice(0, 6).map((sess) => {
              const c = courses.find((crs) => crs.id === sess.courseId);
              return (
                <div
                  key={sess.id}
                  className="bg-white p-4 rounded-xl border border-amber-300 shadow-2xs flex items-center justify-between gap-3"
                >
                  <div>
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold text-[10px] rounded">
                      SÉANCE PASSÉE NON VALIDÉE
                    </span>
                    <h4 className="font-black text-slate-900 text-xs mt-1">
                      {c?.title || sess.eventTitle} ({c?.code})
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      {formatPortalDateFr(sess.date)} • {sess.startTime}-{sess.endTime} (
                      {sess.durationHours}h prévues)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedSessionForModal(sess.id)}
                    className="px-3 py-1.5 bg-[#17345B] hover:bg-blue-950 text-white font-bold rounded-lg text-xs shrink-0 cursor-pointer"
                  >
                    Rédiger le CR
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Teacher Courses List */}
      <div className="grid grid-cols-1 gap-4">
        {summaries
          .slice()
          .sort((a, b) =>
            viewMode === 'BY_SEMESTER'
              ? a.semester.localeCompare(b.semester) || a.course.code.localeCompare(b.course.code)
              : a.course.code.localeCompare(b.course.code)
          )
          .map((item) => {
            const isExpanded = selectedCourseId === item.course.id;
            return (
              <div
                key={item.course.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden"
              >
                <div className="p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 font-mono font-bold text-xs rounded-lg">
                        {item.course.code}
                      </span>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold text-[11px] rounded-lg">
                        {item.semester} • Niveau {item.course.level}
                      </span>
                      {item.filiere && (
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-800 font-semibold text-[11px] rounded-lg">
                          {item.filiere.name}
                        </span>
                      )}
                      <span className="text-xs text-slate-500">
                        Groupes : <strong>{item.groupNames.join(', ') || 'N/A'}</strong>
                      </span>
                    </div>
                    <h3 className="text-base font-black text-slate-900">{item.course.title}</h3>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                      <span>
                        Volume prévu : <strong>{item.totalHours}h</strong>
                      </span>
                      <span>
                        Planifié : <strong>{item.plannedHours}h</strong>
                      </span>
                      <span className="text-emerald-700 font-bold">
                        Validé : {item.realizedHours}h ({item.progressPercent}%)
                      </span>
                      <span>
                        Reste à faire : <strong>{item.remainingToComplete}h</strong>
                      </span>
                      {item.averageAttendanceRate !== undefined && (
                        <span>
                          Assiduité moyenne : <strong>{item.averageAttendanceRate}%</strong>
                        </span>
                      )}
                      <span>
                        Notes publiées :{' '}
                        <strong>
                          {item.gradesPublishedCount}/{item.expectedStudentsCount}
                        </strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {item.sessionsWithRevisions.length > 0 && (
                      <span className="px-2.5 py-1 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-xl text-[11px] font-bold flex items-center gap-1">
                        <History className="w-3.5 h-3.5" />
                        {item.sessionsWithRevisions.length} CR révisé(s)
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setRegisterCourseId(item.course.id)}
                      className="px-3.5 py-2 bg-[#17345B] hover:bg-blue-950 text-white font-bold rounded-xl text-xs inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <ListChecks className="w-4 h-4" />
                      <span>Registre du cours & CR</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedCourseId(isExpanded ? null : item.course.id)
                      }
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>
                        {isExpanded
                          ? 'Masquer les séances'
                          : `Voir les séances (${item.sessions.length})`}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="px-5 pb-4">
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 rounded-full transition-all"
                      style={{ width: `${item.progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Expanded Sessions Table */}
                {isExpanded && (
                  <div className="border-t border-slate-200 bg-slate-50 p-5 space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                      Journal des séances & Comptes rendus (Cliquer pour compléter ou réviser)
                    </h4>
                    {item.sessions.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">
                        Aucune séance planifiée pour ce cours.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {item.sessions.map((sess) => {
                          const priv = getSessionPrivateReport(sess.id);
                          const revs = priv?.revisions || sess.report?.revisions || [];
                          const roomName =
                            rooms.find((r) => r.id === sess.roomId)?.name || sess.roomId;

                          return (
                            <div
                              key={sess.id}
                              className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs"
                            >
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-mono font-bold text-slate-900">
                                    {formatPortalDateFr(sess.date)} ({sess.startTime}-{sess.endTime})
                                  </span>
                                  <span className="text-slate-500">• Salle {roomName}</span>
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      sess.status === 'COMPLETED_VALIDATED'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-amber-100 text-amber-800'
                                    }`}
                                  >
                                    {sess.status === 'COMPLETED_VALIDATED'
                                      ? `Effectuée (${sess.report?.actualHours ?? 0}h / ${sess.durationHours}h)`
                                      : `Programmée (${sess.durationHours}h prévues)`}
                                  </span>
                                  {renderTeacherCrBadge(sess)}
                                  {revs.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => setInspectHistorySessionId(sess.id)}
                                      className="px-2 py-0.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-900 rounded text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer"
                                    >
                                      <History className="w-3 h-3" />
                                      <span>Historique ({revs.length} v.)</span>
                                    </button>
                                  )}
                                </div>

                                {sess.report?.content ? (
                                  <p className="text-slate-600 line-clamp-2">
                                    <strong>
                                      {sess.report.chapterTitle
                                        ? `${sess.report.chapterTitle} — `
                                        : 'Contenu public : '}
                                    </strong>
                                    {sess.report.content}
                                  </p>
                                ) : (
                                  <p className="text-amber-700 italic">
                                    Aucun compte rendu saisi.
                                  </p>
                                )}

                                {(priv?.remarks ||
                                  priv?.difficultiesEncountered ||
                                  priv?.incident) && (
                                  <p className="text-[11px] text-slate-500 italic">
                                    🔒 <strong>Note interne (privée) :</strong>{' '}
                                    {priv.difficultiesEncountered
                                      ? `Difficultés : ${priv.difficultiesEncountered} `
                                      : ''}
                                    {priv.remarks || ''}{' '}
                                    {priv.incident ? `| Incident : ${priv.incident}` : ''}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setSelectedSessionForModal(sess.id)}
                                  className="px-3 py-1.5 bg-[#17345B] hover:bg-blue-950 text-white font-bold rounded-lg text-xs cursor-pointer"
                                >
                                  {sess.report ? 'Modifier / Réviser CR' : 'Saisir CR & Valider'}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {selectedSessionForModal && (
        <SessionValidationModal
          isOpen={true}
          sessionId={selectedSessionForModal}
          onClose={() => setSelectedSessionForModal(null)}
        />
      )}

      {registerCourseId && (
        <CourseSessionRegisterModal
          isOpen={true}
          courseId={registerCourseId}
          onClose={() => setRegisterCourseId(null)}
        />
      )}

      {/* Revision History Inspector Modal */}
      {inspectSession && (
        <RevisionHistoryModal
          session={inspectSession}
          revisions={inspectRevisions}
          canViewConfidential={true}
          onClose={() => setInspectHistorySessionId(null)}
        />
      )}
    </div>
  );
};

// ============================================================================
// 3. VUE ADMINISTRATION & DIRECTION (« Pilotage des cours » — Section 2 & 7)
// ============================================================================
const AdminCoursesView: React.FC = () => {
  const {
    currentUser,
    sessions,
    courses,
    groups,
    rooms,
    filieres,
    parcours,
    ues,
    users,
    qrSessions,
    sessionPrivateReports,
    getSessionPrivateReport,
    publishSessionReport,
    selectedAcademicYear,
  } = useApp();

  const canViewConfidential =
    currentUser.role === 'ADMIN' || currentUser.role === 'ACADEMIC_HEAD';

  const pageTitle =
    currentUser.role === 'SCOLARITE' || currentUser.role === 'SCHEDULER'
      ? 'Suivi des enseignements & Registre des séances'
      : 'Pilotage des cours & Vue synthétique de la Direction';

  // Global Filters (Section 2.3 & 7.1)
  const [filiereFilter, setFiliereFilter] = useState<string>('ALL');
  const [parcoursFilter, setParcoursFilter] = useState<string>('ALL');
  const [levelFilter, setLevelFilter] = useState<string>('ALL');
  const [semesterFilter, setSemesterFilter] = useState<string>('ALL');
  const [ueFilter, setUeFilter] = useState<string>('ALL');
  const [courseFilter, setCourseFilter] = useState<string>('ALL');
  const [groupFilter, setGroupFilter] = useState<string>('ALL');
  const [teacherFilter, setTeacherFilter] = useState<string>('ALL');
  const [periodStart, setPeriodStart] = useState<string>('');
  const [periodEnd, setPeriodEnd] = useState<string>('');
  const [sessionStatusFilter, setSessionStatusFilter] = useState<
    'ALL' | RegisterEffectiveSessionStatus | 'SANS_CR'
  >('ALL');
  const [reportStatusFilter, setReportStatusFilter] = useState<
    'ALL' | RegisterEffectiveReportStatus
  >('ALL');
  const [quickControlFilter, setQuickControlFilter] = useState<
    'ALL' | 'SANS_CR' | 'PENDING_VALIDATION' | 'CORRECTION_OR_REJECTED' | 'STUDENT_ANOMALIES'
  >('ALL');
  const [anomalyTypeFilter, setAnomalyTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [drilldownMode, setDrilldownMode] = useState<'HIERARCHY' | 'TABLE'>('HIERARCHY');

  const [activeTab, setActiveTab] = useState<
    'EXECUTIVE' | 'COURSES_DRILLDOWN' | 'SESSION_REGISTER' | 'ANOMALIES' | 'REVISIONS'
  >('EXECUTIVE');

  const [selectedSessionForModal, setSelectedSessionForModal] = useState<string | null>(null);
  const [selectedCourseIdForRegister, setSelectedCourseIdForRegister] = useState<string | null>(
    null
  );
  const [inspectHistorySessionId, setInspectHistorySessionId] = useState<string | null>(null);

  const teachersList = useMemo(() => users.filter((u) => u.role === 'TEACHER'), [users]);

  const allAnomalies = useMemo(
    () =>
      computeAdminPilotageAnomalies(sessions, courses, groups, rooms, 15, {
        filieres,
        users,
        privateReports: sessionPrivateReports,
        canViewConfidential,
      }),
    [sessions, courses, groups, rooms, filieres, users, sessionPrivateReports, canViewConfidential]
  );

  // Executive Synthetic View by Filière
  const filiereSummaries = useMemo(
    () =>
      computeFiliereExecutiveSummaries(
        filieres,
        courses,
        sessions,
        groups,
        users,
        qrSessions,
        allAnomalies,
        {
          academicYear: selectedAcademicYear,
          semesterFilter,
          levelFilter,
        }
      ),
    [
      filieres,
      courses,
      sessions,
      groups,
      users,
      qrSessions,
      allAnomalies,
      selectedAcademicYear,
      semesterFilter,
      levelFilter,
    ]
  );

  // Filtered Courses for Drill-down (Section 2.1)
  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      if (c.status === 'ARCHIVED') return false;
      if (filiereFilter !== 'ALL' && c.filiereId !== filiereFilter) return false;
      if (parcoursFilter !== 'ALL' && c.parcoursId !== parcoursFilter) return false;
      if (levelFilter !== 'ALL' && c.level !== levelFilter) return false;
      if (semesterFilter !== 'ALL' && c.semester !== semesterFilter) return false;
      if (ueFilter !== 'ALL' && c.ueId !== ueFilter) return false;
      if (courseFilter !== 'ALL' && c.id !== courseFilter) return false;
      if (groupFilter !== 'ALL' && !(c.groupIds || []).includes(groupFilter)) return false;
      if (teacherFilter !== 'ALL' && !(c.teacherIds || []).includes(teacherFilter)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = c.title.toLowerCase().includes(q) || c.code.toLowerCase().includes(q);
        if (!matchTitle) return false;
      }
      return true;
    });
  }, [
    courses,
    filiereFilter,
    parcoursFilter,
    levelFilter,
    semesterFilter,
    ueFilter,
    courseFilter,
    groupFilter,
    teacherFilter,
    searchQuery,
  ]);

  // Hierarchical grouping for Admin Drilldown: Filière → Niveau → Semestre → UE → Cours (Section 2.1)
  const hierarchicalCourses = useMemo(() => {
    const map = new Map<
      string,
      {
        filiereName: string;
        filiereCode: string;
        levels: Map<
          string,
          Map<
            string,
            Map<
              string,
              {
                ueCode: string;
                ueTitle: string;
                courses: typeof filteredCourses;
              }
            >
          >
        >;
      }
    >();

    filteredCourses.forEach((c) => {
      const fil = filieres.find((f) => f.id === c.filiereId);
      const filKey = fil?.id || 'AUTRE';
      if (!map.has(filKey)) {
        map.set(filKey, {
          filiereName: fil?.name || 'Autres enseignements',
          filiereCode: fil?.code || 'GEN',
          levels: new Map(),
        });
      }
      const lvl = c.level || 'L1';
      const filEntry = map.get(filKey)!;
      if (!filEntry.levels.has(lvl)) {
        filEntry.levels.set(lvl, new Map());
      }
      const sem = c.semester || 'S1';
      const lvlEntry = filEntry.levels.get(lvl)!;
      if (!lvlEntry.has(sem)) {
        lvlEntry.set(sem, new Map());
      }
      const ue = ues.find((u) => u.id === c.ueId);
      const ueKey = ue?.id || 'SANS_UE';
      const semEntry = lvlEntry.get(sem)!;
      if (!semEntry.has(ueKey)) {
        semEntry.set(ueKey, {
          ueCode: ue?.code || 'UE',
          ueTitle: ue?.title || 'Unité d’enseignement',
          courses: [],
        });
      }
      semEntry.get(ueKey)!.courses.push(c);
    });

    return Array.from(map.entries());
  }, [filteredCourses, filieres, ues]);

  // Transversal Session Register across filtered courses (Sections 2.3 & 2.6)
  const transversalSessions = useMemo(() => {
    const allowedCourseIds = new Set(filteredCourses.map((c) => c.id));
    return sessions
      .filter((s) => {
        if (!allowedCourseIds.has(s.courseId)) return false;
        if (periodStart && s.date < periodStart) return false;
        if (periodEnd && s.date > periodEnd) return false;

        const effSess = getEffectiveSessionStatus(s);
        const effRep = getEffectiveReportStatus(s);

        if (sessionStatusFilter !== 'ALL') {
          if (sessionStatusFilter === 'SANS_CR') {
            if (effRep !== 'ABSENT_MANQUANT') return false;
          } else if (effSess !== sessionStatusFilter) {
            return false;
          }
        }
        if (reportStatusFilter !== 'ALL' && effRep !== reportStatusFilter) return false;

        if (quickControlFilter === 'SANS_CR') {
          if (effRep !== 'ABSENT_MANQUANT') return false;
        } else if (quickControlFilter === 'PENDING_VALIDATION') {
          if (effRep !== 'SOUMIS' && effRep !== 'EN_ATTENTE_BROUILLON')
            return false;
        } else if (quickControlFilter === 'CORRECTION_OR_REJECTED') {
          if (effRep !== 'A_CORRIGER' && effRep !== 'REJETE') return false;
        } else if (quickControlFilter === 'STUDENT_ANOMALIES') {
          if (!s.anomalyReports || s.anomalyReports.length === 0) return false;
        }

        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime));
  }, [
    sessions,
    filteredCourses,
    periodStart,
    periodEnd,
    sessionStatusFilter,
    reportStatusFilter,
    quickControlFilter,
  ]);

  // Global 7 Synthesis Cards
  const globalKpis = useMemo(() => {
    const activeCoursesCount = filteredCourses.length;
    let targetHours = 0;
    let plannedHours = 0;
    let realizedHours = 0;
    let completedCourses = 0;
    let inProgressCourses = 0;
    let notStartedCourses = 0;

    filteredCourses.forEach((c) => {
      const target = c.totalHours || 30;
      targetHours += target;
      const cSessions = sessions.filter((s) => s.courseId === c.id && s.status !== 'CANCELLED');
      const planned = cSessions.reduce((sum, s) => sum + (s.durationHours || 0), 0);
      const realized = cSessions
        .filter((s) => s.status === 'COMPLETED_VALIDATED')
        .reduce((sum, s) => sum + getStrictValidatedSessionHours(s).hours, 0);

      plannedHours += planned;
      realizedHours += realized;

      if (realized <= 0) notStartedCourses++;
      else if (realized >= target) completedCourses++;
      else inProgressCourses++;
    });

    const progressPct =
      targetHours > 0 ? Math.min(100, Math.round((realizedHours / targetHours) * 100)) : 0;

    const todayStr = new Date().toISOString().split('T')[0];
    const pastUnvalidatedCount = sessions.filter(
      (s) => s.status !== 'CANCELLED' && s.status !== 'COMPLETED_VALIDATED' && s.date < todayStr
    ).length;

    const correctionPendingCount = sessions.filter((s) => Boolean(s.correctionRequested)).length;
    const modifiedReportsCount = sessions.filter((s) => {
      const priv = sessionPrivateReports.find((r) => r.id === s.id || r.sessionId === s.id);
      return (priv?.revisions || s.report?.revisions || []).length > 0;
    }).length;

    const missingCrSessionsCount = sessions.filter(
      (s) => getEffectiveReportStatus(s) === 'ABSENT_MANQUANT'
    ).length;

    const studentAnomaliesCount = sessions.reduce(
      (acc, s) =>
        acc + (s.anomalyReports || []).filter((a) => a.status === 'OPEN').length,
      0
    );

    return {
      activeCoursesCount,
      completedCourses,
      inProgressCourses,
      notStartedCourses,
      targetHours: Number(targetHours.toFixed(1)),
      plannedHours: Number(plannedHours.toFixed(1)),
      realizedHours: Number(realizedHours.toFixed(1)),
      progressPct,
      pastUnvalidatedCount,
      correctionPendingCount,
      modifiedReportsCount,
      missingCrSessionsCount,
      studentAnomaliesCount,
    };
  }, [filteredCourses, sessions, sessionPrivateReports]);

  const filteredAnomalies = useMemo(() => {
    return allAnomalies.filter((a) => {
      if (filiereFilter !== 'ALL' && a.filiereId && a.filiereId !== filiereFilter) return false;
      if (levelFilter !== 'ALL' && a.level && a.level !== levelFilter) return false;
      if (semesterFilter !== 'ALL' && a.semester && a.semester !== semesterFilter) return false;
      if (groupFilter !== 'ALL' && a.groupId && a.groupId !== groupFilter) return false;
      if (teacherFilter !== 'ALL' && a.teacherId && a.teacherId !== teacherFilter) return false;
      if (anomalyTypeFilter !== 'ALL' && a.type !== anomalyTypeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          a.title.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          (a.courseCode || '').toLowerCase().includes(q) ||
          (a.teacherName || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [
    allAnomalies,
    filiereFilter,
    levelFilter,
    semesterFilter,
    groupFilter,
    teacherFilter,
    anomalyTypeFilter,
    searchQuery,
  ]);

  const sessionsWithRevisionHistory = useMemo(() => {
    return sessions
      .filter((s) => {
        const priv = sessionPrivateReports.find((r) => r.id === s.id || r.sessionId === s.id);
        return (priv?.revisions || s.report?.revisions || []).length > 0;
      })
      .sort((a, b) => (b.updatedAt || b.date).localeCompare(a.updatedAt || a.date));
  }, [sessions, sessionPrivateReports]);

  // CSV Export of courses progression
  const handleExportCsv = () => {
    const headers = [
      'Code Cours',
      'Intitulé Cours',
      'Filière',
      'Niveau',
      'Semestre',
      'UE',
      'Enseignant(s)',
      'Volume Prévu (h)',
      'Heures Planifiées (h)',
      'Heures Validées (h)',
      'Progression (%)',
      'Séances Validées',
      'CR Publiés',
      'CR Manquants',
      'Versions Modifiées (CR)',
    ];

    const rows = filteredCourses.map((c) => {
      const fil = filieres.find((f) => f.id === c.filiereId)?.name || c.filiereId;
      const ue = ues.find((u) => u.id === c.ueId)?.code || '';
      const tNames = (c.teacherIds || [])
        .map((tid) => users.find((u) => u.id === tid)?.name || tid)
        .join(' / ');
      const cSessions = sessions.filter((s) => s.courseId === c.id && s.status !== 'CANCELLED');
      const planned = cSessions.reduce((sum, s) => sum + (s.durationHours || 0), 0);
      const validated = cSessions.filter((s) => s.status === 'COMPLETED_VALIDATED');
      const realized = validated.reduce(
        (sum, s) => sum + getStrictValidatedSessionHours(s).hours,
        0
      );
      const publishedCount = cSessions.filter(
        (s) => getEffectiveReportStatus(s) === 'PUBLIE'
      ).length;
      const missingCount = cSessions.filter(
        (s) => getEffectiveReportStatus(s) === 'ABSENT_MANQUANT'
      ).length;
      const pct = c.totalHours > 0 ? Math.round((realized / c.totalHours) * 100) : 0;
      const revCount = cSessions.reduce((acc, s) => {
        const priv = sessionPrivateReports.find((r) => r.id === s.id || r.sessionId === s.id);
        return acc + (priv?.revisions || s.report?.revisions || []).length;
      }, 0);

      return [
        c.code,
        `"${c.title.replace(/"/g, '""')}"`,
        `"${fil}"`,
        c.level,
        c.semester || 'S1',
        ue,
        `"${tNames}"`,
        c.totalHours,
        planned,
        realized,
        `${pct}%`,
        validated.length,
        publishedCount,
        missingCount,
        revCount,
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pilotage_cours_ebm_${selectedAcademicYear}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export Transversal Sessions & CR Register (Section 7.1)
  const handleExportTransversalSessionsCsv = () => {
    const headers = [
      'Date',
      'Horaire',
      'Code Cours',
      'Intitulé Cours',
      'Filière',
      'Niveau',
      'Semestre',
      'Enseignant',
      'Salle',
      'Durée prévue (h)',
      'Durée effective (h)',
      'Statut Séance',
      'Statut CR',
      'Chapitre',
      'Contenu traité',
    ];

    const rows = transversalSessions.map((s) => {
      const c = courses.find((crs) => crs.id === s.courseId);
      const fil = filieres.find((f) => f.id === c?.filiereId);
      const tName =
        s.eventSpeaker || users.find((u) => u.id === s.teacherId)?.name || 'Non assigné';
      const roomName = rooms.find((r) => r.id === s.roomId)?.name || s.roomId;
      const effSess = getEffectiveSessionStatus(s);
      const effRep = getEffectiveReportStatus(s);
      const effHours =
        s.status === 'COMPLETED_VALIDATED' ? getStrictValidatedSessionHours(s).hours : '';

      return [
        formatPortalDateFr(s.date),
        `${s.startTime}-${s.endTime}`,
        c?.code || 'EVT',
        `"${(c?.title || s.eventTitle || '').replace(/"/g, '""')}"`,
        `"${fil?.name || ''}"`,
        c?.level || '',
        c?.semester || '',
        `"${tName.replace(/"/g, '""')}"`,
        `"${roomName}"`,
        s.durationHours,
        effHours,
        effSess,
        effRep,
        `"${(s.report?.chapterTitle || '').replace(/"/g, '""')}"`,
        `"${(s.report?.content || '').replace(/"/g, '""')}"`,
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `registre_transversal_seances_cr_${selectedAcademicYear}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const inspectSession = useMemo(
    () => sessions.find((s) => s.id === inspectHistorySessionId) || null,
    [sessions, inspectHistorySessionId]
  );
  const inspectPrivateReport = inspectHistorySessionId
    ? getSessionPrivateReport(inspectHistorySessionId)
    : undefined;
  const inspectRevisions: SessionReportRevision[] =
    inspectPrivateReport?.revisions || inspectSession?.report?.revisions || [];

  // Renders a course row with the improved "Ouvrir CR" button (Section 2.1)
  const renderAdminCourseRow = (c: (typeof courses)[0]) => {
    const fil = filieres.find((f) => f.id === c.filiereId);
    const ue = ues.find((u) => u.id === c.ueId);
    const grpCodes = (c.groupIds || [])
      .map((gid) => groups.find((g) => g.id === gid)?.code || gid)
      .join(', ');
    const tNames = (c.teacherIds || [])
      .map((tid) => users.find((u) => u.id === tid)?.name || tid)
      .join(', ');

    const cSessions = sessions.filter((s) => s.courseId === c.id);
    const nonCancelledSessions = cSessions.filter((s) => s.status !== 'CANCELLED');
    const planned = nonCancelledSessions.reduce((sum, s) => sum + (s.durationHours || 0), 0);
    const validated = nonCancelledSessions.filter((s) => s.status === 'COMPLETED_VALIDATED');
    const publishedCrCount = nonCancelledSessions.filter(
      (s) => getEffectiveReportStatus(s) === 'PUBLIE'
    ).length;
    const missingCrCount = nonCancelledSessions.filter(
      (s) => getEffectiveReportStatus(s) === 'ABSENT_MANQUANT'
    ).length;
    const realized = Number(
      validated
        .reduce((sum, s) => sum + getStrictValidatedSessionHours(s).hours, 0)
        .toFixed(1)
    );
    const target = c.totalHours || 30;
    const pct = target > 0 ? Math.min(100, Math.round((realized / target) * 100)) : 0;

    return (
      <tr key={c.id} className="hover:bg-slate-50/80">
        <td className="py-3 px-4">
          <div className="font-mono font-bold text-blue-900">{c.code}</div>
          <div className="font-bold text-slate-900">{c.title}</div>
          {ue && (
            <div className="text-[10px] text-purple-700 font-semibold">
              UE : {ue.code} — {ue.title}
            </div>
          )}
        </td>
        <td className="py-3 px-3">
          <div className="font-semibold text-slate-800">{fil?.name || 'N/A'}</div>
          <div className="text-[11px] text-slate-500">
            Niveau {c.level} • {c.semester || 'S1'}
          </div>
        </td>
        <td className="py-3 px-3 font-mono font-bold text-slate-700">{grpCodes || 'N/A'}</td>
        <td className="py-3 px-3 text-slate-700">{tNames || 'Non assigné'}</td>
        <td className="py-3 px-3">
          <div className="font-black text-slate-900">
            {realized}h <span className="text-slate-400 font-normal">/ {target}h</span>
          </div>
          <div className="text-[10px] text-slate-500">Planifié : {planned}h</div>
        </td>
        <td className="py-3 px-3 w-40">
          <div className="flex items-center justify-between text-[11px] font-bold mb-1">
            <span>{pct}%</span>
            <span className="text-slate-400">Reste {Math.max(0, target - realized)}h</span>
          </div>
          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                pct >= 100
                  ? 'bg-emerald-600'
                  : pct >= 40
                  ? 'bg-blue-600'
                  : 'bg-amber-500'
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </td>
        <td className="py-3 px-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-[11px] space-y-0.5">
              <div className="font-bold text-slate-800">
                {validated.length}/{nonCancelledSessions.length} séances réalisées
              </div>
              <div className="flex items-center gap-2 text-[10px]">
                <span className="text-emerald-700 font-bold">{publishedCrCount} CR publiés</span>
                {missingCrCount > 0 && (
                  <span className="text-rose-700 font-bold">• {missingCrCount} sans CR</span>
                )}
              </div>
            </div>

            {/* Section 2.1: Button "Ouvrir CR" ALWAYS opens the course's Detailed Session Register */}
            <button
              type="button"
              onClick={() => setSelectedCourseIdForRegister(c.id)}
              className="px-3 py-1.5 bg-[#17345B] hover:bg-blue-950 text-white font-bold rounded-xl text-xs inline-flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <ListChecks className="w-3.5 h-3.5 text-emerald-300" />
              <span>Ouvrir CR ({cSessions.length})</span>
            </button>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Executive Header */}
      <div className="bg-gradient-to-r from-[#17345B] via-[#1E4273] to-slate-900 rounded-2xl p-6 text-white shadow-lg flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-blue-200 text-xs font-semibold">
            <BarChart3 className="w-4 h-4 text-emerald-300" />
            <span>Direction des Études & Gouvernance LMD • {selectedAcademicYear}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black">{pageTitle}</h1>
          <p className="text-xs sm:text-sm text-blue-100 max-w-2xl">
            Consultez le registre détaillé de toutes les séances programmées et réalisées, contrôlez les comptes rendus par filière, niveau, semestre, UE et cours, et publiez les CR vers l’espace étudiant.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs inline-flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Synthèse Cours (Excel)</span>
          </button>
          <button
            type="button"
            onClick={handleExportTransversalSessionsCsv}
            className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs inline-flex items-center gap-1.5 border border-white/15 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-300" />
            <span>Export Registre Séances ({transversalSessions.length})</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs inline-flex items-center gap-1.5 border border-white/15 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4 text-blue-200" />
            <span>Imprimer PDF</span>
          </button>
        </div>
      </div>

      {/* 7 Global Synthesis Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase">1. Cours actifs</span>
          <p className="text-xl font-black text-slate-900 mt-1">{globalKpis.activeCoursesCount}</p>
          <span className="text-[10px] text-slate-500">
            {globalKpis.completedCourses} terminés • {globalKpis.inProgressCourses} en cours
          </span>
        </div>

        <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase">2. Heures prévues</span>
          <p className="text-xl font-black text-slate-900 mt-1">{globalKpis.targetHours}h</p>
          <span className="text-[10px] text-blue-700 font-semibold">
            {globalKpis.plannedHours}h au planning
          </span>
        </div>

        <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase">3. Heures réalisées</span>
          <p className="text-xl font-black text-emerald-700 mt-1">{globalKpis.realizedHours}h</p>
          <span className="text-[10px] text-emerald-700 font-semibold">
            Progression : {globalKpis.progressPct}%
          </span>
        </div>

        <div className="bg-white rounded-2xl p-3.5 border border-amber-200 bg-amber-50/40 shadow-xs">
          <span className="text-[10px] font-bold text-amber-800 uppercase">4. Non validées</span>
          <p className="text-xl font-black text-amber-700 mt-1">
            {globalKpis.pastUnvalidatedCount}
          </p>
          <span className="text-[10px] text-amber-800">Séances passées</span>
        </div>

        <div className="bg-white rounded-2xl p-3.5 border border-rose-200 bg-rose-50/40 shadow-xs">
          <span className="text-[10px] font-bold text-rose-800 uppercase">5. Sans CR / Rejetés</span>
          <p className="text-xl font-black text-rose-700 mt-1">
            {globalKpis.missingCrSessionsCount + globalKpis.correctionPendingCount}
          </p>
          <span className="text-[10px] text-rose-800">
            {globalKpis.missingCrSessionsCount} sans CR • {globalKpis.correctionPendingCount} à corriger
          </span>
        </div>

        <div className="bg-white rounded-2xl p-3.5 border border-indigo-200 bg-indigo-50/40 shadow-xs">
          <span className="text-[10px] font-bold text-indigo-800 uppercase">6. CR révisés</span>
          <p className="text-xl font-black text-indigo-700 mt-1">
            {globalKpis.modifiedReportsCount}
          </p>
          <span className="text-[10px] text-indigo-800">Historique versions</span>
        </div>

        <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase">7. Alertes & Signal.</span>
          <p className="text-xl font-black text-rose-600 mt-1">
            {filteredAnomalies.length + globalKpis.studentAnomaliesCount}
          </p>
          <span className="text-[10px] text-slate-500">
            Dont {globalKpis.studentAnomaliesCount} signalement(s)
          </span>
        </div>
      </div>

      {/* Navigation Tabs inside Pilotage */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('EXECUTIVE')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'EXECUTIVE'
                ? 'bg-[#17345B] text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>1. Vue synthétique Direction</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('COURSES_DRILLDOWN')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'COURSES_DRILLDOWN'
                ? 'bg-[#17345B] text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>2. Suivi par Filière → Niveau → Semestre → UE → Cours ({filteredCourses.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('SESSION_REGISTER')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'SESSION_REGISTER'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
            }`}
          >
            <ListChecks className="w-4 h-4" />
            <span>3. Registre transversal des séances & CR ({transversalSessions.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ANOMALIES')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'ANOMALIES'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>4. Anomalies ({filteredAnomalies.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('REVISIONS')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'REVISIONS'
                ? 'bg-indigo-700 text-white shadow-xs'
                : 'bg-indigo-50 text-indigo-900 hover:bg-indigo-100'
            }`}
          >
            <History className="w-4 h-4" />
            <span>5. Historique révisions CR ({sessionsWithRevisionHistory.length})</span>
          </button>
        </div>

        {(filiereFilter !== 'ALL' ||
          parcoursFilter !== 'ALL' ||
          levelFilter !== 'ALL' ||
          semesterFilter !== 'ALL' ||
          ueFilter !== 'ALL' ||
          courseFilter !== 'ALL' ||
          teacherFilter !== 'ALL') && (
          <button
            type="button"
            onClick={() => {
              setFiliereFilter('ALL');
              setParcoursFilter('ALL');
              setLevelFilter('ALL');
              setSemesterFilter('ALL');
              setUeFilter('ALL');
              setCourseFilter('ALL');
              setGroupFilter('ALL');
              setTeacherFilter('ALL');
              setPeriodStart('');
              setPeriodEnd('');
              setSessionStatusFilter('ALL');
              setReportStatusFilter('ALL');
              setQuickControlFilter('ALL');
            }}
            className="px-3 py-1.5 bg-blue-50 text-blue-800 hover:bg-blue-100 rounded-lg text-xs font-bold cursor-pointer"
          >
            Réinitialiser tous les filtres ✕
          </button>
        )}
      </div>

      {/* Global Multi-Criteria Filter Bar (Section 2.3 : Année, Filière, Parcours, Niveau, Semestre, UE, Cours, Enseignant) */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-2.5">
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un cours, code, enseignant..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <select
            value={filiereFilter}
            onChange={(e) => {
              setFiliereFilter(e.target.value);
              setParcoursFilter('ALL');
              setUeFilter('ALL');
              setCourseFilter('ALL');
            }}
            className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
          >
            <option value="ALL">Filière : Toutes ({filieres.length})</option>
            {filieres.map((f) => (
              <option key={f.id} value={f.id}>
                {f.code} — {f.name}
              </option>
            ))}
          </select>

          <select
            value={parcoursFilter}
            onChange={(e) => setParcoursFilter(e.target.value)}
            className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
          >
            <option value="ALL">Parcours : Tous</option>
            {parcours
              .filter((p) => filiereFilter === 'ALL' || p.filiereId === filiereFilter)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} — {p.name}
                </option>
              ))}
          </select>

          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
          >
            <option value="ALL">Niveau : Tous</option>
            {['L1', 'L2', 'L3', 'M1', 'M2'].map((lvl) => (
              <option key={lvl} value={lvl}>
                Niveau {lvl}
              </option>
            ))}
          </select>

          <select
            value={semesterFilter}
            onChange={(e) => setSemesterFilter(e.target.value)}
            className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
          >
            <option value="ALL">Semestre : Tous</option>
            {['S1', 'S2', 'S3', 'S4', 'S5', 'S6'].map((sem) => (
              <option key={sem} value={sem}>
                Semestre {sem}
              </option>
            ))}
          </select>

          <select
            value={ueFilter}
            onChange={(e) => {
              setUeFilter(e.target.value);
              setCourseFilter('ALL');
            }}
            className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
          >
            <option value="ALL">UE : Toutes</option>
            {ues
              .filter(
                (u) =>
                  (filiereFilter === 'ALL' || u.filiereId === filiereFilter) &&
                  (semesterFilter === 'ALL' || u.semester === semesterFilter)
              )
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.code} — {u.title}
                </option>
              ))}
          </select>

          <select
            value={teacherFilter}
            onChange={(e) => setTeacherFilter(e.target.value)}
            className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
          >
            <option value="ALL">Enseignant : Tous</option>
            {teachersList.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* TAB 1: VUE SYNTHÉTIQUE DE LA DIRECTION PAR FILIÈRE */}
      {activeTab === 'EXECUTIVE' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#17345B]" />
                <span>Vue synthétique de la Direction — État d'avancement par Filière</span>
              </h2>
              <p className="text-xs text-slate-500">
                Repérez immédiatement les filières qui avancent normalement et celles qui accusent un retard de volume horaire ou de validation, puis cliquez sur « Explorer la filière » pour accéder aux cours et ouvrir leurs CR.
              </p>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-bold">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                ● Avancement normal (
                {filiereSummaries.filter((f) => f.healthStatus === 'NORMAL').length})
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
                ● À surveiller (
                {filiereSummaries.filter((f) => f.healthStatus === 'SURVEILLANCE').length})
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 border border-rose-200">
                ● En retard (
                {filiereSummaries.filter((f) => f.healthStatus === 'RETARD').length})
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filiereSummaries
              .filter((fs) => filiereFilter === 'ALL' || fs.filiere.id === filiereFilter)
              .map((fs) => {
                const borderClass =
                  fs.healthStatus === 'RETARD'
                    ? 'border-rose-300 bg-rose-50/15'
                    : fs.healthStatus === 'SURVEILLANCE'
                    ? 'border-amber-300 bg-amber-50/15'
                    : 'border-emerald-300 bg-white';

                const badgeClass =
                  fs.healthStatus === 'RETARD'
                    ? 'bg-rose-100 text-rose-800 border-rose-300'
                    : fs.healthStatus === 'SURVEILLANCE'
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-emerald-100 text-emerald-800 border-emerald-300';

                return (
                  <div
                    key={fs.filiere.id}
                    className={`rounded-2xl border-2 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 bg-white ${borderClass}`}
                  >
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-mono font-bold text-xs text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            {fs.filiere.code}
                          </span>
                          <h3 className="text-base font-black text-slate-900 mt-1">
                            {fs.filiere.name}
                          </h3>
                          <p className="text-[11px] text-slate-500">
                            {fs.filiere.domaine || fs.filiere.department} • Niveaux :{' '}
                            <strong>{fs.levels.join(', ') || 'L1-M2'}</strong>
                          </p>
                        </div>

                        <span
                          className={`px-2.5 py-1 rounded-xl text-[11px] font-black border shrink-0 ${badgeClass}`}
                        >
                          {fs.statusLabel}
                        </span>
                      </div>

                      {/* Realized vs Expected Progress Bars */}
                      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5 text-xs">
                        <div>
                          <div className="flex justify-between font-bold text-slate-800 mb-1">
                            <span>Heures validées (Réalisé)</span>
                            <span className="text-emerald-700">
                              {fs.totalRealizedHours}h / {fs.totalTargetHours}h (
                              {fs.realizedProgressPercent}%)
                            </span>
                          </div>
                          <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                fs.healthStatus === 'RETARD'
                                  ? 'bg-rose-600'
                                  : fs.healthStatus === 'SURVEILLANCE'
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-600'
                              }`}
                              style={{ width: `${fs.realizedProgressPercent}%` }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-[11px] text-slate-600 mb-1">
                            <span>Volume planifié / attendu à date</span>
                            <span className="font-semibold">
                              {fs.totalPlannedHours}h planifiées (Attendu ~
                              {fs.expectedProgressPercent}%)
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${fs.expectedProgressPercent}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Key Filière Indicators */}
                      <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                        <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                          <span className="text-slate-500 block">Cours actifs</span>
                          <strong className="text-sm text-slate-900">{fs.coursesCount}</strong>
                          <span className="text-[10px] text-emerald-700 block">
                            {fs.completedCoursesCount} terminés
                          </span>
                        </div>
                        <div
                          className={`p-2 rounded-xl border ${
                            fs.delayedCoursesCount > 0
                              ? 'bg-rose-50 border-rose-200 text-rose-900'
                              : 'bg-slate-50 border-slate-200 text-slate-700'
                          }`}
                        >
                          <span className="block">Cours en retard</span>
                          <strong className="text-sm font-black">{fs.delayedCoursesCount}</strong>
                          <span className="text-[10px] block">
                            {fs.pastUnvalidatedSessionsCount} séance(s) non val.
                          </span>
                        </div>
                        <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                          <span className="text-slate-500 block">Assiduité</span>
                          <strong className="text-sm text-slate-900">
                            {fs.averageAttendanceRate !== undefined
                              ? `${fs.averageAttendanceRate}%`
                              : 'N/A'}
                          </strong>
                          <span className="text-[10px] text-slate-500 block">
                            {fs.studentsCount} étudiant(s)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer Drill-Down */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-500">
                        {fs.anomaliesCount} alerte(s) • {fs.modifiedReportsCount} CR révisé(s)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setFiliereFilter(fs.filiere.id);
                          setActiveTab('COURSES_DRILLDOWN');
                        }}
                        className="px-3 py-1.5 bg-[#17345B] hover:bg-blue-950 text-white font-bold rounded-xl text-xs inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>Suivi détaillé & CR</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* TAB 2: SUIVI DÉTAILLÉ PAR FILIÈRE → NIVEAU → SEMESTRE → UE → COURS (Section 2.1) */}
      {activeTab === 'COURSES_DRILLDOWN' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Suivi détaillé par Filière → Niveau → Semestre → UE → Cours
              </h2>
              <p className="text-xs text-slate-500">
                Cliquez sur le bouton « Ouvrir CR » d’un cours pour afficher le registre chronologique complet de ses séances et consulter chaque compte rendu.
              </p>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setDrilldownMode('HIERARCHY')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                  drilldownMode === 'HIERARCHY'
                    ? 'bg-[#17345B] text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Arborescence Filière → Niveau → Semestre → UE
              </button>
              <button
                type="button"
                onClick={() => setDrilldownMode('TABLE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                  drilldownMode === 'TABLE'
                    ? 'bg-[#17345B] text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tableau plat ({filteredCourses.length})
              </button>
            </div>
          </div>

          {drilldownMode === 'HIERARCHY' ? (
            <div className="space-y-5">
              {hierarchicalCourses.map(([filKey, filData]) => (
                <div
                  key={filKey}
                  className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden"
                >
                  <div className="px-5 py-3.5 bg-gradient-to-r from-[#17345B] to-slate-900 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-white/15 rounded font-mono text-xs font-bold">
                        {filData.filiereCode}
                      </span>
                      <h3 className="text-sm font-black">{filData.filiereName}</h3>
                    </div>
                  </div>

                  <div className="p-4 space-y-4">
                    {Array.from(filData.levels.entries()).map(([lvl, semMap]) => (
                      <div
                        key={lvl}
                        className="border border-slate-200 rounded-xl overflow-hidden"
                      >
                        <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs font-black text-slate-800">
                          <span>Niveau {lvl}</span>
                        </div>

                        <div className="p-3 space-y-4">
                          {Array.from(semMap.entries()).map(([sem, ueMap]) => (
                            <div key={sem} className="space-y-2">
                              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-900 text-xs font-black">
                                <span>Semestre {sem}</span>
                              </div>

                              {Array.from(ueMap.entries()).map(([ueId, ueBlock]) => (
                                <div
                                  key={ueId}
                                  className="border border-slate-200 rounded-xl overflow-hidden bg-white"
                                >
                                  <div className="px-4 py-2 bg-purple-50/60 border-b border-slate-200 flex items-center gap-2 text-xs">
                                    <span className="font-mono font-bold text-purple-900">
                                      {ueBlock.ueCode}
                                    </span>
                                    <span className="font-bold text-slate-800">
                                      — {ueBlock.ueTitle}
                                    </span>
                                  </div>

                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse text-xs">
                                      <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500">
                                          <th className="py-2.5 px-4">Cours / EC</th>
                                          <th className="py-2.5 px-3">Filière & Niveau</th>
                                          <th className="py-2.5 px-3">Groupe(s)</th>
                                          <th className="py-2.5 px-3">Enseignant(s)</th>
                                          <th className="py-2.5 px-3">Heures (Réalisé / Prévu)</th>
                                          <th className="py-2.5 px-3">Progression</th>
                                          <th className="py-2.5 px-3">Séances & Registre CR</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-200">
                                        {ueBlock.courses.map((c) => renderAdminCourseRow(c))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase text-slate-600">
                      <th className="py-3 px-4">Cours / EC</th>
                      <th className="py-3 px-3">Filière & Niveau</th>
                      <th className="py-3 px-3">Groupe(s)</th>
                      <th className="py-3 px-3">Enseignant(s)</th>
                      <th className="py-3 px-3">Heures (Réalisé / Prévu)</th>
                      <th className="py-3 px-3">Progression</th>
                      <th className="py-3 px-3">Séances & Registre CR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredCourses.map((c) => renderAdminCourseRow(c))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: REGISTRE TRANSVERSAL DES SÉANCES & CONTRÔLE CR (Sections 2.2, 2.3, 2.6, 2.7) */}
      {activeTab === 'SESSION_REGISTER' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <ListChecks className="w-4 h-4 text-emerald-700" />
                <span>
                  Registre transversal des séances & Contrôle des Comptes Rendus ({transversalSessions.length})
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Identifiez immédiatement les séances réalisées sans compte rendu, validez et publiez les CR soumis par les enseignants.
              </p>
            </div>

            {/* Quick Control Filter Pills (Section 2.6) */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setQuickControlFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                  quickControlFilter === 'ALL'
                    ? 'bg-[#17345B] text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Toutes les séances
              </button>
              <button
                type="button"
                onClick={() => setQuickControlFilter('SANS_CR')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                  quickControlFilter === 'SANS_CR'
                    ? 'bg-rose-600 text-white'
                    : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
                }`}
              >
                Séances réalisées sans CR ({globalKpis.missingCrSessionsCount})
              </button>
              <button
                type="button"
                onClick={() => setQuickControlFilter('PENDING_VALIDATION')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                  quickControlFilter === 'PENDING_VALIDATION'
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-amber-50 text-amber-900 hover:bg-amber-100'
                }`}
              >
                CR en attente de validation
              </button>
              <button
                type="button"
                onClick={() => setQuickControlFilter('CORRECTION_OR_REJECTED')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                  quickControlFilter === 'CORRECTION_OR_REJECTED'
                    ? 'bg-orange-600 text-white'
                    : 'bg-orange-50 text-orange-900 hover:bg-orange-100'
                }`}
              >
                CR à corriger / rejetés ({globalKpis.correctionPendingCount})
              </button>
              <button
                type="button"
                onClick={() => setQuickControlFilter('STUDENT_ANOMALIES')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1 ${
                  quickControlFilter === 'STUDENT_ANOMALIES'
                    ? 'bg-purple-700 text-white'
                    : 'bg-purple-50 text-purple-900 hover:bg-purple-100'
                }`}
              >
                <Flag className="w-3 h-3" />
                <span>Signalements étudiants ({globalKpis.studentAnomaliesCount})</span>
              </button>
            </div>
          </div>

          {/* Period & Status Filters (Section 2.3) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
            >
              <option value="ALL">Cours : Tous ({filteredCourses.length})</option>
              {filteredCourses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.title}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700"
              title="Date de début"
            />

            <input
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700"
              title="Date de fin"
            />

            <select
              value={sessionStatusFilter}
              onChange={(e) => setSessionStatusFilter(e.target.value as any)}
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
            >
              <option value="ALL">Statut séance : Tous</option>
              <option value="PROGRAMMEE">Programmée</option>
              <option value="REALISEE">Réalisée</option>
              <option value="SANS_CR">Réalisée sans CR</option>
              <option value="ANNULEE">Annulée</option>
              <option value="REPORTEE">Reportée</option>
            </select>

            <select
              value={reportStatusFilter}
              onChange={(e) => setReportStatusFilter(e.target.value as any)}
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
            >
              <option value="ALL">Statut CR : Tous</option>
              <option value="PUBLIE">Publié</option>
              <option value="VALIDE">Validé</option>
              <option value="SOUMIS">Soumis</option>
              <option value="BROUILLON">Brouillon</option>
              <option value="A_CORRIGER">À corriger</option>
              <option value="REJETE">Rejeté</option>
              <option value="ABSENT_MANQUANT">Absent / Manquant</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase text-slate-600">
                  <th className="py-3 px-3">Date & Horaire</th>
                  <th className="py-3 px-3">Cours / Filière</th>
                  <th className="py-3 px-3">Enseignant & Salle</th>
                  <th className="py-3 px-2.5">Durée (Eff./Prév.)</th>
                  <th className="py-3 px-3">Contenu / Chapitre</th>
                  <th className="py-3 px-2.5">Statut Séance</th>
                  <th className="py-3 px-2.5">Statut CR</th>
                  <th className="py-3 px-3 text-right">Actions de contrôle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {transversalSessions.slice(0, 60).map((s) => {
                  const c = courses.find((crs) => crs.id === s.courseId);
                  const fil = filieres.find((f) => f.id === c?.filiereId);
                  const tName =
                    s.eventSpeaker ||
                    users.find((u) => u.id === s.teacherId)?.name ||
                    'Non assigné';
                  const roomName = rooms.find((r) => r.id === s.roomId)?.name || s.roomId;
                  const effSess = getEffectiveSessionStatus(s);
                  const effRep = getEffectiveReportStatus(s);
                  const effHours =
                    s.status === 'COMPLETED_VALIDATED'
                      ? getStrictValidatedSessionHours(s).hours
                      : null;

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/90">
                      <td className="py-3 px-3 font-mono">
                        <div className="font-bold text-slate-900">
                          {formatPortalDateFr(s.date)}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {s.startTime} - {s.endTime}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-mono font-bold text-blue-900">{c?.code || 'EVT'}</div>
                        <div className="font-bold text-slate-900">{c?.title || s.eventTitle}</div>
                        <div className="text-[10px] text-slate-500">
                          {fil?.code || ''} • {c?.level} • {c?.semester}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800">{tName}</div>
                        <div className="text-[11px] text-slate-500">Salle {roomName}</div>
                      </td>
                      <td className="py-3 px-2.5 font-mono font-bold">
                        {effHours !== null ? (
                          <span className="text-emerald-700">{effHours}h</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}{' '}
                        / {s.durationHours}h
                      </td>
                      <td className="py-3 px-3 max-w-xs">
                        {s.report?.content ? (
                          <div>
                            {s.report.chapterTitle && (
                              <div className="font-bold text-slate-900 line-clamp-1">
                                {s.report.chapterTitle}
                              </div>
                            )}
                            <p className="text-slate-600 line-clamp-2">{s.report.content}</p>
                          </div>
                        ) : (
                          <span className="text-rose-700 italic text-[11px]">
                            Aucun CR rédigé
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-2.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            effSess === 'REALISEE' && effRep === 'ABSENT_MANQUANT'
                              ? 'bg-rose-100 text-rose-800'
                              : effSess === 'REALISEE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : effSess === 'ANNULEE'
                              ? 'bg-slate-200 text-slate-700'
                              : effSess === 'REPORTEE'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {effSess === 'REALISEE' && effRep === 'ABSENT_MANQUANT'
                            ? 'SANS_CR'
                            : effSess}
                        </span>
                      </td>
                      <td className="py-3 px-2.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            effRep === 'PUBLIE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : effRep === 'VALIDE'
                              ? 'bg-teal-100 text-teal-800'
                              : effRep === 'SOUMIS'
                              ? 'bg-blue-100 text-blue-800'
                              : effRep === 'A_CORRIGER' || effRep === 'REJETE'
                              ? 'bg-rose-100 text-rose-800'
                              : effRep === 'ABSENT_MANQUANT'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {effRep}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {s.report && effRep !== 'PUBLIE' && (
                            <button
                              type="button"
                              onClick={() => {
                                const res = publishSessionReport(s.id);
                                if (res.success) {
                                  showAppToast({
                                    type: 'success',
                                    title: 'CR Publié',
                                    message:
                                      'Le compte rendu a été validé et publié vers l’espace étudiant.',
                                  });
                                }
                              }}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] cursor-pointer"
                            >
                              Publier
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedCourseIdForRegister(s.courseId)}
                            className="px-2.5 py-1 bg-[#17345B] hover:bg-blue-950 text-white font-bold rounded-lg text-[11px] cursor-pointer"
                          >
                            Registre CR
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedSessionForModal(s.id)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg text-[11px] cursor-pointer"
                          >
                            Éditer
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
      )}

      {/* TAB 4: CENTRE DES ANOMALIES */}
      {activeTab === 'ANOMALIES' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <span>Centre de contrôle des anomalies ({filteredAnomalies.length})</span>
            </h2>

            <select
              value={anomalyTypeFilter}
              onChange={(e) => setAnomalyTypeFilter(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
            >
              <option value="ALL">Toutes les catégories d'anomalies</option>
              <option value="UNVALIDATED_SESSION">Séances passées non validées</option>
              <option value="MISSING_REPORT">Comptes rendus manquants</option>
              <option value="INCOHERENT_HOURS">Heures réelles absentes / incohérentes</option>
              <option value="CORRECTION_PENDING">Corrections en attente</option>
              <option value="REPORT_MODIFIED_HISTORY">Comptes rendus modifiés (Historique)</option>
              <option value="VOLUME_DELAY">Retards de progression horaire</option>
              <option value="UNPLANNED_COURSE">Cours sans séance planifiée</option>
              {canViewConfidential && (
                <>
                  <option value="TEACHER_ABSENT_OR_REPLACED">Enseignant en retard / remplacé</option>
                  <option value="ROOM_INCIDENT">Incidents signalés en séance</option>
                </>
              )}
            </select>
          </div>

          {filteredAnomalies.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center border border-slate-200">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800">Aucune anomalie détectée</p>
              <p className="text-xs text-slate-500">
                Toutes les séances et progressions correspondent aux critères sélectionnés.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredAnomalies.map((anom) => (
                <div
                  key={anom.id}
                  className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          anom.severity === 'HIGH'
                            ? 'bg-rose-100 text-rose-800'
                            : anom.severity === 'MEDIUM'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-indigo-100 text-indigo-800'
                        }`}
                      >
                        {anom.type}
                      </span>
                      {anom.filiereName && (
                        <span className="text-[11px] font-bold text-slate-600">
                          {anom.filiereName} ({anom.level})
                        </span>
                      )}
                      {anom.groupName && (
                        <span className="text-[11px] font-mono text-slate-500">
                          • Groupe {anom.groupName}
                        </span>
                      )}
                      {anom.teacherName && (
                        <span className="text-[11px] text-slate-500">• {anom.teacherName}</span>
                      )}
                    </div>
                    <h4 className="text-xs font-black text-slate-900">{anom.title}</h4>
                    <p className="text-xs text-slate-600">{anom.description}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {anom.courseId && (
                      <button
                        type="button"
                        onClick={() => setSelectedCourseIdForRegister(anom.courseId!)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg text-xs cursor-pointer"
                      >
                        Ouvrir registre cours
                      </button>
                    )}
                    {anom.revisions && anom.revisions.length > 0 && anom.sessionId && (
                      <button
                        type="button"
                        onClick={() => setInspectHistorySessionId(anom.sessionId!)}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 font-bold rounded-lg text-xs cursor-pointer flex items-center gap-1"
                      >
                        <History className="w-3.5 h-3.5" />
                        <span>Versions ({anom.revisions.length})</span>
                      </button>
                    )}
                    {anom.sessionId && (
                      <button
                        type="button"
                        onClick={() => setSelectedSessionForModal(anom.sessionId!)}
                        className="px-3 py-1.5 bg-[#17345B] hover:bg-blue-950 text-white font-bold rounded-lg text-xs cursor-pointer"
                      >
                        Examiner la séance
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: HISTORIQUE DES MODIFICATIONS DE COMPTES RENDUS */}
      {activeTab === 'REVISIONS' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-600" />
              <span>
                Journal d'audit des modifications de comptes rendus ({sessionsWithRevisionHistory.length})
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Chaque correction ou révision de compte rendu conserve intégralement les anciennes versions, l’auteur de la modification, la date et le motif pour le suivi des contestations.
            </p>
          </div>

          {sessionsWithRevisionHistory.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
              <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">
                Aucun compte rendu n'a encore fait l'objet d'une révision post-validation.
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Lorsqu'un compte rendu est modifié après une demande de correction ou révision, ses versions antérieures apparaissent automatiquement ici.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessionsWithRevisionHistory.map((sess) => {
                const c = courses.find((crs) => crs.id === sess.courseId);
                const priv = getSessionPrivateReport(sess.id);
                const revs = priv?.revisions || sess.report?.revisions || [];

                return (
                  <div
                    key={sess.id}
                    className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-900 font-bold rounded text-[10px]">
                          {revs.length} VERSION(S) ARCHIVÉE(S)
                        </span>
                        <span className="font-mono font-bold text-slate-800">
                          Séance du {formatPortalDateFr(sess.date)} ({sess.startTime}-{sess.endTime})
                        </span>
                      </div>
                      <h4 className="font-black text-slate-900">
                        {c?.title || sess.eventTitle} ({c?.code})
                      </h4>
                      <p className="text-slate-600 line-clamp-1">
                        <strong>Version actuelle ({sess.report?.actualHours}h) :</strong>{' '}
                        {sess.report?.content}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setInspectHistorySessionId(sess.id)}
                        className="px-3.5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white font-bold rounded-xl text-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Comparer les versions</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Registre détaillé des séances du cours sélectionné (Section 2.1 - 2.8) */}
      {selectedCourseIdForRegister && (
        <CourseSessionRegisterModal
          isOpen={true}
          courseId={selectedCourseIdForRegister}
          onClose={() => setSelectedCourseIdForRegister(null)}
        />
      )}

      {selectedSessionForModal && (
        <SessionValidationModal
          isOpen={true}
          sessionId={selectedSessionForModal}
          onClose={() => setSelectedSessionForModal(null)}
        />
      )}

      {inspectSession && (
        <RevisionHistoryModal
          session={inspectSession}
          revisions={inspectRevisions}
          canViewConfidential={canViewConfidential}
          onClose={() => setInspectHistorySessionId(null)}
        />
      )}
    </div>
  );
};

// ============================================================================
// MODAL D'INSPECTION DE L'HISTORIQUE DES MODIFICATIONS (RECOMMENDATION #2)
// ============================================================================
interface RevisionHistoryModalProps {
  session: TimetableSession;
  revisions: SessionReportRevision[];
  canViewConfidential: boolean;
  onClose: () => void;
}

const RevisionHistoryModal: React.FC<RevisionHistoryModalProps> = ({
  session,
  revisions,
  canViewConfidential,
  onClose,
}) => {
  const { courses, getSessionPrivateReport } = useApp();
  const course = courses.find((c) => c.id === session.courseId);
  const priv = getSessionPrivateReport(session.id);

  const formatDateTime = (iso?: string) => {
    if (!iso) return '—';
    try {
      return new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Indian/Antananarivo',
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-5 py-4 bg-gradient-to-r from-indigo-950 to-[#17345B] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <History className="w-5 h-5 text-indigo-300" />
            <div>
              <h3 className="text-base font-bold">
                Historique des modifications du compte rendu
              </h3>
              <p className="text-xs text-indigo-200">
                {course?.title || session.eventTitle} • Séance du {formatPortalDateFr(session.date)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Current Active Version */}
          <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-300 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="px-2.5 py-0.5 bg-emerald-700 text-white font-bold rounded text-[10px]">
                VERSION ACTUELLE EN VIGUEUR (v{revisions.length + 1})
              </span>
              <span className="font-mono text-[11px] text-emerald-900">
                Validée par {session.report?.writtenBy || session.validatedBy} •{' '}
                {formatDateTime(session.report?.updatedAt || session.report?.writtenAt)}
              </span>
            </div>
            <div className="font-bold text-slate-900">
              Heures réellement effectuées : {session.report?.actualHours}h (sur{' '}
              {session.durationHours}h prévues)
            </div>
            <div className="p-3 bg-white rounded-lg border border-emerald-200 text-slate-800">
              <strong>Contenu :</strong> {session.report?.content}
            </div>
            {canViewConfidential &&
              (priv?.remarks || priv?.difficultiesEncountered || priv?.incident) && (
                <div className="text-[11px] text-slate-600 italic">
                  🔒 Données internes : {priv.remarks || 'Aucune remarque'}{' '}
                  {priv.difficultiesEncountered
                    ? `| Difficultés : ${priv.difficultiesEncountered}`
                    : ''}{' '}
                  {priv.incident ? `| Incident : ${priv.incident}` : ''}
                </div>
              )}
          </div>

          {/* Prior Archived Versions */}
          <div className="space-y-3">
            <h4 className="font-black text-slate-700 uppercase tracking-wider text-[11px]">
              Versions antérieures archivées ({revisions.length})
            </h4>
            {revisions.map((rev) => (
              <div
                key={rev.id}
                className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="px-2 py-0.5 bg-slate-200 text-slate-800 font-bold rounded text-[10px]">
                    VERSION ANTÉRIEURE v{rev.versionNumber}
                  </span>
                  <span className="font-mono text-[11px] text-slate-600">
                    Modifiée le {formatDateTime(rev.modifiedAt)} par{' '}
                    <strong>{rev.modifiedBy}</strong>
                  </span>
                </div>
                {rev.reason && (
                  <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-[11px]">
                    <strong>Motif de modification / correction :</strong> {rev.reason}
                  </div>
                )}
                <div className="font-bold text-slate-800">
                  Heures déclarées dans cette version : {rev.previousActualHours}h
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-200 text-slate-700">
                  <strong>Contenu antérieur :</strong> {rev.previousContent}
                </div>
                {canViewConfidential &&
                  (rev.previousRemarks ||
                    rev.previousDifficulties ||
                    rev.previousIncident) && (
                    <div className="text-[11px] text-slate-500 italic">
                      🔒 Données internes antérieures : {rev.previousRemarks || '—'}{' '}
                      {rev.previousDifficulties
                        ? `| Difficultés : ${rev.previousDifficulties}`
                        : ''}{' '}
                      {rev.previousIncident ? `| Incident : ${rev.previousIncident}` : ''}
                    </div>
                  )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
