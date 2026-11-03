import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  Course,
  TimetableSession,
  SessionReportStatus,
  SessionAnomalyCategory,
} from '../types';
import {
  formatPortalDateFr,
  getStrictValidatedSessionHours,
} from '../utils/coursePortalStats';
import {
  X,
  BookOpen,
  Calendar,
  Clock,
  User,
  Users,
  MapPin,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Download,
  Printer,
  Filter,
  Search,
  Eye,
  Edit3,
  History,
  Paperclip,
  Flag,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { SessionValidationModal } from './SessionValidationModal';
import { showAppToast } from './ToastAndConfirmCenter';

export type RegisterEffectiveSessionStatus =
  | 'PROGRAMMEE'
  | 'REALISEE'
  | 'ANNULEE'
  | 'REPORTEE';

export type RegisterEffectiveReportStatus =
  | 'ABSENT_MANQUANT'
  | 'EN_ATTENTE_BROUILLON'
  | 'SOUMIS'
  | 'A_CORRIGER'
  | 'REJETE'
  | 'VALIDE'
  | 'PUBLIE'
  | 'NON_REQUIS';

export function getEffectiveSessionStatus(session: TimetableSession): RegisterEffectiveSessionStatus {
  if (session.status === 'CANCELLED') return 'ANNULEE';
  if (
    session.status === 'COMPLETED_VALIDATED' ||
    Boolean(session.isRealizedConfirmed)
  ) {
    return 'REALISEE';
  }
  if (session.status === 'RESCHEDULED' || Boolean(session.rescheduledFrom)) {
    return 'REPORTEE';
  }
  return 'PROGRAMMEE';
}

export function getEffectiveReportStatus(session: TimetableSession): RegisterEffectiveReportStatus {
  const sessStatus = getEffectiveSessionStatus(session);
  if (sessStatus === 'ANNULEE') return 'NON_REQUIS';

  if (session.correctionRequested) {
    return session.report?.reportStatus === 'REJECTED' ? 'REJETE' : 'A_CORRIGER';
  }

  if (session.report && session.report.content && session.report.content.trim().length > 0) {
    const rawStatus: SessionReportStatus | undefined = session.report.reportStatus;
    if (rawStatus === 'DRAFT') return 'EN_ATTENTE_BROUILLON';
    if (rawStatus === 'SUBMITTED') return 'SOUMIS';
    if (rawStatus === 'CORRECTION_REQUESTED') return 'A_CORRIGER';
    if (rawStatus === 'REJECTED') return 'REJETE';
    if (rawStatus === 'VALIDATED') return 'VALIDE';
    if (rawStatus === 'PUBLISHED') return 'PUBLIE';
    // Backward compatibility: existing COMPLETED_VALIDATED sessions with report are published
    if (session.status === 'COMPLETED_VALIDATED') return 'PUBLIE';
    return 'SOUMIS';
  }

  // No report content: if session was marked realized or is COMPLETED_VALIDATED without report -> ABSENT_MANQUANT
  if (sessStatus === 'REALISEE') {
    return 'ABSENT_MANQUANT';
  }

  return 'EN_ATTENTE_BROUILLON';
}

interface CourseSessionRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  initialSessionId?: string | null;
}

export const CourseSessionRegisterModal: React.FC<CourseSessionRegisterModalProps> = ({
  isOpen,
  onClose,
  courseId,
  initialSessionId = null,
}) => {
  const {
    currentUser,
    courses,
    sessions,
    users,
    groups,
    rooms,
    ues,
    ecs,
    filieres,
    parcours,
    qrSessions,
    learningResources,
    getSessionPrivateReport,
    publishSessionReport,
    confirmSessionRealizedWithoutReport,
    reportSessionAnomaly,
    resolveSessionAnomaly,
    selectedAcademicYear,
  } = useApp();

  const isStudent = currentUser.role === 'STUDENT';
  const isTeacher = currentUser.role === 'TEACHER';
  const isAdminOrDirection = ['ADMIN', 'ACADEMIC_HEAD', 'SCOLARITE', 'SCHEDULER'].includes(
    currentUser.role
  );
  const canViewConfidential =
    currentUser.role === 'ADMIN' ||
    currentUser.role === 'ACADEMIC_HEAD' ||
    currentUser.role === 'SCOLARITE';

  const course: Course | undefined = useMemo(
    () => courses.find((c) => c.id === courseId),
    [courses, courseId]
  );

  const ue = useMemo(() => ues.find((u) => u.id === course?.ueId), [ues, course]);
  const ec = useMemo(
    () =>
      ecs.find((e) => e.id === course?.ecId) ||
      ecs.find((e) => e.code === course?.code || e.title === course?.title),
    [ecs, course]
  );
  const filiere = useMemo(
    () => filieres.find((f) => f.id === course?.filiereId),
    [filieres, course]
  );
  const parc = useMemo(
    () => parcours.find((p) => p.id === (course?.parcoursId || ue?.parcoursId)),
    [parcours, course, ue]
  );

  // Filter state (Section 2.2 & 2.3)
  const [searchTerm, setSearchTerm] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [teacherFilter, setTeacherFilter] = useState('ALL');
  const [sessionStatusFilter, setSessionStatusFilter] = useState<string>('ALL');
  const [reportStatusFilter, setReportStatusFilter] = useState<string>('ALL');
  const [sortField, setSortField] = useState<'CHRONO' | 'DATE_DESC' | 'DURATION' | 'STATUS'>('CHRONO');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Selected session for detailed CR consultation drawer/view (Section 2.5 & 3.4)
  const [selectedDetailSessionId, setSelectedDetailSessionId] = useState<string | null>(
    initialSessionId
  );
  // Selected session for editing/validation modal
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  // Selected session for student/staff anomaly reporting (Section 3.7)
  const [anomalyModalSessionId, setAnomalyModalSessionId] = useState<string | null>(null);
  const [anomalyCategory, setAnomalyCategory] =
    useState<SessionAnomalyCategory>('SESSION_NOT_HELD');
  const [anomalyDescription, setAnomalyDescription] = useState('');
  const [showAttendanceListInDetail, setShowAttendanceListInDetail] = useState(false);

  // All sessions for this course (filtered for student's group if student)
  const rawCourseSessions = useMemo(() => {
    if (!course) return [];
    return sessions
      .filter((s) => {
        if (s.courseId !== course.id) return false;
        if (isStudent && currentUser.groupId) {
          if (!s.groupIds.includes(currentUser.groupId)) return false;
          if (s.subGroupId && currentUser.subGroupId && s.subGroupId !== currentUser.subGroupId) {
            return false;
          }
        }
        return true;
      })
      .sort(
        (a, b) =>
          a.date.localeCompare(b.date) ||
          a.startTime.localeCompare(b.startTime) ||
          a.id.localeCompare(b.id)
      );
  }, [sessions, course, isStudent, currentUser.groupId, currentUser.subGroupId]);

  // Expected students enrolled in the course's groups
  const enrolledStudentsForCourse = useMemo(() => {
    if (!course) return [];
    return users.filter(
      (u) =>
        u.role === 'STUDENT' &&
        u.isActive !== false &&
        u.groupId &&
        (course.groupIds || []).includes(u.groupId)
    );
  }, [users, course]);

  // Build enriched chronological register rows
  const chronologicalRows = useMemo(() => {
    return rawCourseSessions.map((sess, index) => {
      const chronoNumber = index + 1;
      const effectiveSessionStatus = getEffectiveSessionStatus(sess);
      const effectiveReportStatus = getEffectiveReportStatus(sess);
      const teacherUser = users.find((u) => u.id === sess.teacherId);
      const teacherName = sess.eventSpeaker || teacherUser?.name || 'Non assigné';
      const roomObj = rooms.find((r) => r.id === sess.roomId);
      const roomName = roomObj?.name || sess.roomId || 'Salle N/A';

      // Attendance computation from qrSessions
      const sessionQrs = qrSessions.filter((q) => q.sessionId === sess.id);
      const allRecords = sessionQrs.flatMap((q) => q.records || []);
      const expectedGroupStudents = users.filter(
        (u) =>
          u.role === 'STUDENT' &&
          u.isActive !== false &&
          u.groupId &&
          (sess.groupIds || []).includes(u.groupId)
      );
      const expectedCount =
        expectedGroupStudents.length || enrolledStudentsForCourse.length || 0;

      const presentRecords = allRecords.filter((r) => r.status === 'PRESENT');
      const lateRecords = allRecords.filter((r) => r.status === 'LATE');
      const justifiedRecords = allRecords.filter((r) => r.status === 'JUSTIFIED');
      const explicitAbsentRecords = allRecords.filter((r) => r.status === 'ABSENT');

      const hasAttendanceData = sessionQrs.length > 0 && allRecords.length > 0;
      const presentCount = presentRecords.length + lateRecords.length;
      const lateCount = lateRecords.length;
      const absentCount = hasAttendanceData
        ? explicitAbsentRecords.length > 0
          ? explicitAbsentRecords.length
          : Math.max(0, expectedCount - presentCount - justifiedRecords.length)
        : 0;

      const validatedHoursInfo = getStrictValidatedSessionHours(sess);
      const effectiveHours =
        effectiveSessionStatus === 'REALISEE'
          ? sess.report?.actualHours !== undefined
            ? sess.report.actualHours
            : validatedHoursInfo.hours
          : null;

      return {
        chronoNumber,
        session: sess,
        effectiveSessionStatus,
        effectiveReportStatus,
        teacherName,
        roomName,
        hasAttendanceData,
        expectedCount,
        presentCount,
        absentCount,
        lateCount,
        justifiedCount: justifiedRecords.length,
        allAttendanceRecords: allRecords,
        expectedGroupStudents,
        effectiveHours,
      };
    });
  }, [rawCourseSessions, users, rooms, qrSessions, enrolledStudentsForCourse]);

  // Course Synthesis Metrics (Section 2.4 & Section 3.6 & Section 4)
  const synthesisMetrics = useMemo(() => {
    const totalPlannedSessions = chronologicalRows.length;
    const realizedSessions = chronologicalRows.filter(
      (r) => r.effectiveSessionStatus === 'REALISEE'
    ).length;
    const cancelledSessions = chronologicalRows.filter(
      (r) => r.effectiveSessionStatus === 'ANNULEE'
    ).length;
    const rescheduledSessions = chronologicalRows.filter(
      (r) =>
        r.effectiveSessionStatus === 'REPORTEE' || Boolean(r.session.rescheduledFrom)
    ).length;
    const remainingSessions = chronologicalRows.filter(
      (r) =>
        r.effectiveSessionStatus === 'PROGRAMMEE' ||
        r.effectiveSessionStatus === 'REPORTEE'
    ).length;

    const plannedVolumeHours = Number(
      (
        course?.totalHours ||
        ec?.hourlyVolume ||
        chronologicalRows
          .filter((r) => r.effectiveSessionStatus !== 'ANNULEE')
          .reduce((acc, r) => acc + (r.session.durationHours || 0), 0)
      ).toFixed(1)
    );

    const scheduledInTimetableHours = Number(
      chronologicalRows
        .filter((r) => r.effectiveSessionStatus !== 'ANNULEE')
        .reduce((acc, r) => acc + (r.session.durationHours || 0), 0)
        .toFixed(1)
    );

    const realizedVolumeHours = Number(
      chronologicalRows
        .filter((r) => r.effectiveSessionStatus === 'REALISEE')
        .reduce((acc, r) => acc + (r.effectiveHours ?? 0), 0)
        .toFixed(1)
    );

    const publishedCrCount = chronologicalRows.filter(
      (r) => r.effectiveReportStatus === 'PUBLIE'
    ).length;
    const validatedCrCount = chronologicalRows.filter(
      (r) =>
        r.effectiveReportStatus === 'PUBLIE' || r.effectiveReportStatus === 'VALIDE'
    ).length;
    const pendingCrCount = chronologicalRows.filter(
      (r) =>
        r.effectiveReportStatus === 'SOUMIS' ||
        r.effectiveReportStatus === 'EN_ATTENTE_BROUILLON' ||
        r.effectiveReportStatus === 'A_CORRIGER'
    ).length;
    const missingCrCount = chronologicalRows.filter(
      (r) => r.effectiveReportStatus === 'ABSENT_MANQUANT'
    ).length;

    return {
      totalPlannedSessions,
      realizedSessions,
      cancelledSessions,
      rescheduledSessions,
      remainingSessions,
      plannedVolumeHours,
      scheduledInTimetableHours,
      realizedVolumeHours,
      publishedCrCount,
      validatedCrCount,
      pendingCrCount,
      missingCrCount,
    };
  }, [chronologicalRows, course, ec]);

  // Distinct teachers on this course
  const courseTeachers = useMemo(() => {
    const map = new Map<string, string>();
    chronologicalRows.forEach((r) => {
      if (r.session.teacherId) {
        map.set(r.session.teacherId, r.teacherName);
      }
    });
    return Array.from(map.entries());
  }, [chronologicalRows]);

  // Filtered & sorted rows
  const filteredRows = useMemo(() => {
    const list = chronologicalRows.filter((row) => {
      if (periodStart && row.session.date < periodStart) return false;
      if (periodEnd && row.session.date > periodEnd) return false;
      if (teacherFilter !== 'ALL' && row.session.teacherId !== teacherFilter) return false;
      if (
        sessionStatusFilter !== 'ALL' &&
        row.effectiveSessionStatus !== sessionStatusFilter
      ) {
        return false;
      }
      if (
        reportStatusFilter !== 'ALL' &&
        row.effectiveReportStatus !== reportStatusFilter
      ) {
        return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const contentMatch =
          (!isStudent || row.effectiveReportStatus === 'PUBLIE') &&
          ((row.session.report?.content || '').toLowerCase().includes(q) ||
            (row.session.report?.chapterTitle || '').toLowerCase().includes(q) ||
            (row.session.report?.objectives || '').toLowerCase().includes(q));
        const metaMatch =
          row.teacherName.toLowerCase().includes(q) ||
          row.roomName.toLowerCase().includes(q) ||
          row.session.date.includes(q) ||
          `#${row.chronoNumber}`.includes(q);
        if (!contentMatch && !metaMatch) return false;
      }
      return true;
    });

    if (sortField === 'DATE_DESC') {
      return [...list].reverse();
    }
    if (sortField === 'DURATION') {
      return [...list].sort(
        (a, b) => (b.effectiveHours ?? b.session.durationHours) - (a.effectiveHours ?? a.session.durationHours)
      );
    }
    if (sortField === 'STATUS') {
      return [...list].sort((a, b) =>
        a.effectiveSessionStatus.localeCompare(b.effectiveSessionStatus)
      );
    }
    return list;
  }, [
    chronologicalRows,
    periodStart,
    periodEnd,
    teacherFilter,
    sessionStatusFilter,
    reportStatusFilter,
    searchTerm,
    sortField,
    isStudent,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  const selectedDetailRow = useMemo(
    () =>
      chronologicalRows.find((r) => r.session.id === selectedDetailSessionId) || null,
    [chronologicalRows, selectedDetailSessionId]
  );

  const selectedPrivateReport = useMemo(
    () =>
      selectedDetailRow && !isStudent
        ? getSessionPrivateReport(selectedDetailRow.session.id)
        : undefined,
    [selectedDetailRow, isStudent, getSessionPrivateReport]
  );

  if (!isOpen || !course) return null;

  const formatDateTimeFr = (iso?: string) => {
    if (!iso) return 'Non renseigné';
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

  // Status labels adapted to Role (Section 3.5 for Student vs Section 2.2/5 for Staff)
  const renderSessionStatusText = (status: RegisterEffectiveSessionStatus) => {
    if (isStudent) {
      switch (status) {
        case 'PROGRAMMEE':
          return (
            <span className="text-slate-600 font-semibold">Séance programmée</span>
          );
        case 'REALISEE':
          return (
            <span className="text-emerald-700 font-bold">Séance effectuée</span>
          );
        case 'ANNULEE':
          return <span className="text-rose-700 font-bold">Séance annulée</span>;
        case 'REPORTEE':
          return <span className="text-amber-700 font-bold">Séance reportée</span>;
      }
    }
    switch (status) {
      case 'PROGRAMMEE':
        return <span className="text-slate-600 font-semibold">Programmée</span>;
      case 'REALISEE':
        return <span className="text-emerald-700 font-bold">Réalisée</span>;
      case 'ANNULEE':
        return <span className="text-rose-700 font-bold">Annulée</span>;
      case 'REPORTEE':
        return <span className="text-amber-700 font-bold">Reportée</span>;
    }
  };

  const renderReportStatusText = (
    reportStatus: RegisterEffectiveReportStatus,
    sessStatus: RegisterEffectiveSessionStatus
  ) => {
    if (isStudent) {
      // Section 3.5: Student-specific wording, never expose rejected status/content
      if (sessStatus === 'ANNULEE') {
        return <span className="text-slate-400">Non applicable</span>;
      }
      if (reportStatus === 'PUBLIE') {
        return (
          <span className="text-emerald-700 font-bold">Compte rendu disponible</span>
        );
      }
      if (reportStatus === 'SOUMIS' || reportStatus === 'VALIDE') {
        return (
          <span className="text-blue-700 font-semibold">
            Compte rendu en cours de validation
          </span>
        );
      }
      return (
        <span className="text-amber-700 font-semibold">
          Compte rendu en préparation
        </span>
      );
    }

    // Staff / Direction view (Section 2.2 & 5)
    switch (reportStatus) {
      case 'PUBLIE':
        return <span className="text-emerald-700 font-bold">CR publié</span>;
      case 'VALIDE':
        return <span className="text-teal-700 font-bold">CR validé (à publier)</span>;
      case 'SOUMIS':
        return <span className="text-blue-700 font-bold">CR soumis</span>;
      case 'A_CORRIGER':
        return <span className="text-amber-700 font-bold">CR à corriger</span>;
      case 'REJETE':
        return <span className="text-rose-700 font-bold">CR rejeté</span>;
      case 'ABSENT_MANQUANT':
        return (
          <span className="text-rose-700 font-black flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            CR manquant
          </span>
        );
      case 'NON_REQUIS':
        return <span className="text-slate-400">Séance annulée</span>;
      default:
        return <span className="text-slate-500 font-semibold">CR en attente</span>;
    }
  };

  // Export Register to Excel-compatible CSV (UTF-8 BOM)
  const handleExportRegisterExcel = () => {
    const headers = isStudent
      ? [
          'N° Séance',
          'Date',
          'Horaire',
          'Enseignant',
          'Durée effective (h)',
          'Chapitre / Contenu traité',
          'Statut séance',
          'Statut Compte Rendu',
        ]
      : [
          'N° Séance',
          'ID Séance',
          'Date',
          'Heure début',
          'Heure fin',
          'Enseignant',
          'Salle',
          'Durée prévue (h)',
          'Durée effective (h)',
          'Chapitre / Contenu traité',
          'Effectif présent',
          'Effectif absent',
          'Statut séance',
          'Statut CR',
        ];

    const csvRows = filteredRows.map((r) => {
      const canSeeContent = !isStudent || r.effectiveReportStatus === 'PUBLIE';
      const contentSummary = canSeeContent
        ? [r.session.report?.chapterTitle, r.session.report?.content]
            .filter(Boolean)
            .join(' — ')
        : '';

      if (isStudent) {
        return [
          r.chronoNumber,
          formatPortalDateFr(r.session.date),
          `${r.session.startTime}-${r.session.endTime}`,
          `"${r.teacherName.replace(/"/g, '""')}"`,
          r.effectiveHours ?? '—',
          `"${contentSummary.replace(/"/g, '""')}"`,
          r.effectiveSessionStatus,
          r.effectiveReportStatus === 'PUBLIE' ? 'Disponible' : 'Non disponible',
        ].join(';');
      }

      return [
        r.chronoNumber,
        r.session.id,
        formatPortalDateFr(r.session.date),
        r.session.startTime,
        r.session.endTime,
        `"${r.teacherName.replace(/"/g, '""')}"`,
        `"${r.roomName.replace(/"/g, '""')}"`,
        r.session.durationHours,
        r.effectiveHours ?? '—',
        `"${contentSummary.replace(/"/g, '""')}"`,
        r.hasAttendanceData ? r.presentCount : 'Non pointé',
        r.hasAttendanceData ? r.absentCount : 'Non pointé',
        r.effectiveSessionStatus,
        r.effectiveReportStatus,
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `registre_seances_${course.code}_${selectedAcademicYear}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleAnomalySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!anomalyModalSessionId) return;
    const res = reportSessionAnomaly(
      anomalyModalSessionId,
      anomalyCategory,
      anomalyDescription
    );
    if (!res.success) {
      showAppToast({
        type: 'error',
        title: 'Signalement impossible',
        message: res.error || 'Veuillez vérifier votre saisie.',
      });
      return;
    }
    showAppToast({
      type: 'success',
      title: 'Anomalie transmise à l’administration',
      message:
        'Votre signalement a été enregistré et notifié à la Direction des études pour vérification.',
    });
    setAnomalyModalSessionId(null);
    setAnomalyDescription('');
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-7xl max-h-[95vh] flex flex-col overflow-hidden">
        {/* Top Institutional Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#17345B] via-[#1E4273] to-slate-900 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0 print:bg-white print:text-slate-900 print:border-b print:border-slate-300">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-xs text-blue-200 print:text-slate-600">
              <span className="font-mono font-bold text-white bg-white/15 px-2 py-0.5 rounded">
                {course.code}
              </span>
              <span>·</span>
              <span>{filiere?.name || 'Filière EBM'}</span>
              {parc && (
                <>
                  <span>·</span>
                  <span>Parcours {parc.name}</span>
                </>
              )}
              <span>·</span>
              <span>
                Niveau {course.level} ({course.semester || 'S1'})
              </span>
              {ue && (
                <>
                  <span>·</span>
                  <span>
                    UE {ue.code} ({ue.title})
                  </span>
                </>
              )}
              <span>·</span>
              <span>Année {course.academicYear || selectedAcademicYear}</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black tracking-tight flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-300 shrink-0 print:hidden" />
              <span>
                Registre Officiel des Séances & Comptes Rendus — {course.title}
              </span>
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <button
              type="button"
              onClick={handleExportRegisterExcel}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exporter Excel (CSV)</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white font-bold rounded-xl text-xs inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimer / PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              title="Fermer le registre"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Scrollable Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-5 text-xs">
          {/* 1. SYNTHÈSE DU COURS (Section 2.4 & 3.6 & 4) */}
          {isStudent ? (
            /* 6 Student Synthesis Indicators (Section 3.6) */
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-500">
                  1. Séances réalisées
                </span>
                <p className="text-xl font-black text-emerald-700 mt-0.5 tabular-nums">
                  {synthesisMetrics.realizedSessions}
                </p>
                <span className="text-[10px] text-slate-500">
                  Sur {synthesisMetrics.totalPlannedSessions} au planning
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-500">
                  2. Séances restantes
                </span>
                <p className="text-xl font-black text-slate-900 mt-0.5 tabular-nums">
                  {synthesisMetrics.remainingSessions}
                </p>
                <span className="text-[10px] text-slate-500">
                  Programmées à venir
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-500">
                  3. CR publiés
                </span>
                <p className="text-xl font-black text-blue-700 mt-0.5 tabular-nums">
                  {synthesisMetrics.publishedCrCount}
                </p>
                <span className="text-[10px] text-slate-500">
                  Disponibles à la lecture
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-500">
                  4. CR en attente
                </span>
                <p className="text-xl font-black text-amber-700 mt-0.5 tabular-nums">
                  {synthesisMetrics.pendingCrCount + synthesisMetrics.missingCrCount}
                </p>
                <span className="text-[10px] text-slate-500">
                  En préparation / validation
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-500">
                  5. Volume horaire prévu
                </span>
                <p className="text-xl font-black text-slate-900 mt-0.5 tabular-nums">
                  {synthesisMetrics.plannedVolumeHours}h
                </p>
                <span className="text-[10px] text-slate-500">
                  Maquette officielle
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-500">
                  6. Volume effectué
                </span>
                <p className="text-xl font-black text-emerald-700 mt-0.5 tabular-nums">
                  {synthesisMetrics.realizedVolumeHours}h
                </p>
                <span className="text-[10px] text-slate-500">
                  Reste{' '}
                  {Math.max(
                    0,
                    Number(
                      (
                        synthesisMetrics.plannedVolumeHours -
                        synthesisMetrics.realizedVolumeHours
                      ).toFixed(1)
                    )
                  )}
                  h
                </span>
              </div>
            </div>
          ) : (
            /* 10 Administration / Direction Synthesis Indicators (Section 2.4 & 4) */
            <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2.5">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">
                  Séances prévues
                </span>
                <p className="text-lg font-black text-slate-900 mt-0.5 tabular-nums">
                  {synthesisMetrics.totalPlannedSessions}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200">
                <span className="text-[10px] font-bold uppercase text-emerald-800 block">
                  Réalisées
                </span>
                <p className="text-lg font-black text-emerald-700 mt-0.5 tabular-nums">
                  {synthesisMetrics.realizedSessions}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-rose-50/40 border border-rose-200">
                <span className="text-[10px] font-bold uppercase text-rose-800 block">
                  Annulées
                </span>
                <p className="text-lg font-black text-rose-700 mt-0.5 tabular-nums">
                  {synthesisMetrics.cancelledSessions}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-amber-50/40 border border-amber-200">
                <span className="text-[10px] font-bold uppercase text-amber-800 block">
                  Reportées
                </span>
                <p className="text-lg font-black text-amber-700 mt-0.5 tabular-nums">
                  {synthesisMetrics.rescheduledSessions}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">
                  Restantes
                </span>
                <p className="text-lg font-black text-slate-800 mt-0.5 tabular-nums">
                  {synthesisMetrics.remainingSessions}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-blue-50/40 border border-blue-200">
                <span className="text-[10px] font-bold uppercase text-blue-800 block">
                  Volume prévu
                </span>
                <p className="text-lg font-black text-blue-900 mt-0.5 tabular-nums">
                  {synthesisMetrics.plannedVolumeHours}h
                </p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200">
                <span className="text-[10px] font-bold uppercase text-emerald-800 block">
                  Volume effectué
                </span>
                <p className="text-lg font-black text-emerald-700 mt-0.5 tabular-nums">
                  {synthesisMetrics.realizedVolumeHours}h
                </p>
              </div>
              <div className="p-3 rounded-xl bg-indigo-50/40 border border-indigo-200">
                <span className="text-[10px] font-bold uppercase text-indigo-800 block">
                  CR validés/publiés
                </span>
                <p className="text-lg font-black text-indigo-700 mt-0.5 tabular-nums">
                  {synthesisMetrics.validatedCrCount}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-200">
                <span className="text-[10px] font-bold uppercase text-amber-800 block">
                  CR en attente
                </span>
                <p className="text-lg font-black text-amber-700 mt-0.5 tabular-nums">
                  {synthesisMetrics.pendingCrCount}
                </p>
              </div>
              <div
                className={`p-3 rounded-xl border ${
                  synthesisMetrics.missingCrCount > 0
                    ? 'bg-rose-50 border-rose-300'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <span className="text-[10px] font-bold uppercase text-rose-800 block">
                  CR manquants
                </span>
                <p className="text-lg font-black text-rose-700 mt-0.5 tabular-nums">
                  {synthesisMetrics.missingCrCount}
                </p>
              </div>
            </div>
          )}

          {/* Alert if realized sessions are missing a CR (Section 2.6 & 5) */}
          {!isStudent && synthesisMetrics.missingCrCount > 0 && (
            <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-xl flex flex-wrap items-center justify-between gap-3 text-rose-950">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>
                  <strong>Alerte de contrôle pédagogique :</strong>{' '}
                  {synthesisMetrics.missingCrCount} séance(s) marquée(s) comme réalisée(s) ne
                  dispose(nt) d’aucun compte rendu enregistré.
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  setReportStatusFilter(
                    reportStatusFilter === 'ABSENT_MANQUANT'
                      ? 'ALL'
                      : 'ABSENT_MANQUANT'
                  )
                }
                className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs cursor-pointer"
              >
                {reportStatusFilter === 'ABSENT_MANQUANT'
                  ? 'Afficher toutes les séances'
                  : 'Filtrer les CR manquants'}
              </button>
            </div>
          )}

          {/* 2. BARRE DE FILTRES ET RECHERCHE DU REGISTRE (Section 2.2 & 2.3) */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3 print:hidden">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
              <div className="relative lg:col-span-2">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Rechercher un chapitre, contenu, salle, enseignant..."
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-500 shrink-0">Du</span>
                <input
                  type="date"
                  value={periodStart}
                  onChange={(e) => {
                    setPeriodStart(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-500 shrink-0">Au</span>
                <input
                  type="date"
                  value={periodEnd}
                  onChange={(e) => {
                    setPeriodEnd(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <select
                value={sessionStatusFilter}
                onChange={(e) => {
                  setSessionStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
              >
                <option value="ALL">Statut séance : Toutes</option>
                <option value="PROGRAMMEE">
                  {isStudent ? 'Séances programmées' : 'Programmées'}
                </option>
                <option value="REALISEE">
                  {isStudent ? 'Séances effectuées' : 'Réalisées'}
                </option>
                <option value="REPORTEE">Reportées</option>
                <option value="ANNULEE">Annulées</option>
              </select>

              <select
                value={reportStatusFilter}
                onChange={(e) => {
                  setReportStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
              >
                <option value="ALL">Statut CR : Tous</option>
                <option value="PUBLIE">
                  {isStudent ? 'CR disponibles (Publiés)' : 'CR publiés'}
                </option>
                {!isStudent && (
                  <>
                    <option value="VALIDE">CR validés (non publiés)</option>
                    <option value="SOUMIS">CR soumis (à valider)</option>
                    <option value="EN_ATTENTE_BROUILLON">CR en attente / brouillon</option>
                    <option value="A_CORRIGER">CR à corriger</option>
                    <option value="REJETE">CR rejetés</option>
                    <option value="ABSENT_MANQUANT">Séances réalisées sans CR</option>
                  </>
                )}
              </select>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/70">
              <div className="flex flex-wrap items-center gap-2">
                {courseTeachers.length > 1 && (
                  <select
                    value={teacherFilter}
                    onChange={(e) => {
                      setTeacherFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700"
                  >
                    <option value="ALL">Tous les enseignants ({courseTeachers.length})</option>
                    {courseTeachers.map(([tid, tname]) => (
                      <option key={tid} value={tid}>
                        {tname}
                      </option>
                    ))}
                  </select>
                )}

                <div className="flex items-center gap-1 text-[11px] text-slate-600">
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  <span>Tri :</span>
                  <button
                    type="button"
                    onClick={() =>
                      setSortField(sortField === 'CHRONO' ? 'DATE_DESC' : 'CHRONO')
                    }
                    className="px-2 py-0.5 bg-white border border-slate-200 rounded font-bold hover:bg-slate-100 cursor-pointer"
                  >
                    {sortField === 'CHRONO'
                      ? 'Ordre chronologique (#1 → #N)'
                      : 'Plus récentes d’abord'}
                  </button>
                </div>
              </div>

              {(searchTerm ||
                periodStart ||
                periodEnd ||
                teacherFilter !== 'ALL' ||
                sessionStatusFilter !== 'ALL' ||
                reportStatusFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setPeriodStart('');
                    setPeriodEnd('');
                    setTeacherFilter('ALL');
                    setSessionStatusFilter('ALL');
                    setReportStatusFilter('ALL');
                    setCurrentPage(1);
                  }}
                  className="text-[11px] font-bold text-blue-700 hover:underline cursor-pointer"
                >
                  Réinitialiser les filtres
                </button>
              )}
            </div>
          </div>

          {/* 3. FICHE COMPLÈTE DE CONSULTATION D'UN COMPTE RENDU (Section 2.5 & 3.4) */}
          {selectedDetailRow && (
            <div className="rounded-2xl border-2 border-[#17345B] bg-white shadow-lg overflow-hidden animate-in fade-in duration-150">
              <div className="px-5 py-3.5 bg-[#17345B] text-white flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-300" />
                  <h3 className="font-black text-sm">
                    Fiche Complète du Compte Rendu — Séance #{selectedDetailRow.chronoNumber} du{' '}
                    {formatPortalDateFr(selectedDetailRow.session.date)} (
                    {selectedDetailRow.session.startTime} - {selectedDetailRow.session.endTime})
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  {!isStudent && (isAdminOrDirection || (isTeacher && selectedDetailRow.session.teacherId === currentUser.id)) && (
                    <button
                      type="button"
                      onClick={() => setEditingSessionId(selectedDetailRow.session.id)}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>
                        {selectedDetailRow.session.report
                          ? 'Modifier / Valider / Réviser CR'
                          : 'Rédiger le CR'}
                      </span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setAnomalyModalSessionId(selectedDetailRow.session.id)}
                    className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/30 font-bold rounded-lg text-xs inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Flag className="w-3.5 h-3.5" />
                    <span>Signaler une anomalie</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedDetailSessionId(null)}
                    className="px-2.5 py-1 bg-white/15 hover:bg-white/25 text-white font-bold rounded-lg text-xs cursor-pointer"
                  >
                    Fermer la fiche ✕
                  </button>
                </div>
              </div>

              <div className="p-5 space-y-5">
                {/* Check if Student is trying to view an unpublished report (Section 3.5) */}
                {isStudent && selectedDetailRow.effectiveReportStatus !== 'PUBLIE' ? (
                  <div className="p-6 bg-amber-50 border border-amber-200 rounded-xl text-center space-y-2">
                    <Clock className="w-8 h-8 text-amber-600 mx-auto" />
                    <h4 className="font-bold text-amber-950 text-sm">
                      Compte rendu non encore publié
                    </h4>
                    <p className="text-xs text-amber-800 max-w-lg mx-auto">
                      Conformément au règlement pédagogique d’EBM Institute, le contenu détaillé du
                      compte rendu devient accessible aux étudiants uniquement après sa validation
                      et sa publication officielle.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* A. Informations générales (Section 2.5.A & 3.4.A) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">
                          A.1 — Rattachement Académique
                        </span>
                        <p className="font-bold text-slate-900">
                          {course.title} ({course.code})
                        </p>
                        <p className="text-slate-600">
                          UE : <strong>{ue ? `${ue.code} — ${ue.title}` : 'Non renseigné'}</strong>
                        </p>
                        <p className="text-slate-600">
                          Filière : <strong>{filiere?.name || 'Non renseigné'}</strong>
                          {parc ? ` · Parcours ${parc.name}` : ''}
                        </p>
                        <p className="text-slate-600">
                          Niveau : <strong>{course.level}</strong> · Semestre{' '}
                          <strong>{course.semester || 'S1'}</strong> · Année{' '}
                          <strong>{course.academicYear || selectedAcademicYear}</strong>
                        </p>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">
                          A.2 — Planification & Intervenant
                        </span>
                        <p className="text-slate-700">
                          Date de la séance :{' '}
                          <strong className="font-mono">
                            {formatPortalDateFr(selectedDetailRow.session.date)}
                          </strong>
                        </p>
                        <p className="text-slate-700">
                          Horaire :{' '}
                          <strong className="font-mono">
                            {selectedDetailRow.session.startTime} -{' '}
                            {selectedDetailRow.session.endTime}
                          </strong>
                        </p>
                        <p className="text-slate-700">
                          Enseignant : <strong>{selectedDetailRow.teacherName}</strong>
                        </p>
                        <p className="text-slate-700">
                          Salle attribuée : <strong>{selectedDetailRow.roomName}</strong>
                        </p>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">
                          A.3 — Volumes Horaires & Statuts
                        </span>
                        <p className="text-slate-700">
                          Durée prévue :{' '}
                          <strong className="font-mono">
                            {selectedDetailRow.session.durationHours}h
                          </strong>
                        </p>
                        <p className="text-slate-700">
                          Durée effective :{' '}
                          <strong className="font-mono text-emerald-700">
                            {selectedDetailRow.effectiveHours !== null
                              ? `${selectedDetailRow.effectiveHours}h`
                              : 'Non renseignée'}
                          </strong>
                        </p>
                        <p className="text-slate-700">
                          Statut séance :{' '}
                          {renderSessionStatusText(selectedDetailRow.effectiveSessionStatus)}
                        </p>
                        <p className="text-slate-700">
                          Statut CR :{' '}
                          {renderReportStatusText(
                            selectedDetailRow.effectiveReportStatus,
                            selectedDetailRow.effectiveSessionStatus
                          )}
                        </p>
                      </div>
                    </div>

                    {/* B. Informations pédagogiques (Section 2.5.B & 3.4.B) */}
                    <div className="p-4 rounded-xl border border-slate-200 space-y-3">
                      <h4 className="font-black text-slate-900 uppercase tracking-wider text-xs border-b border-slate-100 pb-2">
                        B. Contenu & Informations Pédagogiques
                      </h4>

                      {!selectedDetailRow.session.report ? (
                        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>
                            Aucun compte rendu pédagogique n’a encore été enregistré pour cette
                            séance.
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
                              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                                Chapitre ou thème traité
                              </span>
                              <p className="font-bold text-slate-900 mt-0.5">
                                {selectedDetailRow.session.report.chapterTitle ||
                                  'Non renseigné'}
                              </p>
                            </div>
                            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
                              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                                Objectifs de la séance
                              </span>
                              <p className="font-semibold text-slate-800 mt-0.5">
                                {selectedDetailRow.session.report.objectives || 'Non renseigné'}
                              </p>
                            </div>
                          </div>

                          {!isStudent && selectedDetailRow.session.report.plannedContent && (
                            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
                              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                                Contenu initialement prévu
                              </span>
                              <p className="text-slate-800 mt-0.5">
                                {selectedDetailRow.session.report.plannedContent}
                              </p>
                            </div>
                          )}

                          <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-200">
                            <span className="text-[10px] font-bold uppercase text-blue-900 block">
                              Contenu réellement enseigné / Résumé détaillé du cours
                            </span>
                            <p className="text-slate-900 mt-1 whitespace-pre-line leading-relaxed">
                              {selectedDetailRow.session.report.content}
                            </p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {selectedDetailRow.session.report.keyTakeaways && (
                              <div className="p-3 rounded-lg bg-emerald-50/50 border border-emerald-200">
                                <span className="text-[10px] font-bold uppercase text-emerald-900 block">
                                  Points essentiels à retenir
                                </span>
                                <p className="text-slate-800 mt-0.5 whitespace-pre-line">
                                  {selectedDetailRow.session.report.keyTakeaways}
                                </p>
                              </div>
                            )}

                            {selectedDetailRow.session.report.exercisesAndPracticalWork && (
                              <div className="p-3 rounded-lg bg-indigo-50/50 border border-indigo-200">
                                <span className="text-[10px] font-bold uppercase text-indigo-900 block">
                                  Exercices, activités et travaux pratiques réalisés
                                </span>
                                <p className="text-slate-800 mt-0.5 whitespace-pre-line">
                                  {selectedDetailRow.session.report.exercisesAndPracticalWork}
                                </p>
                              </div>
                            )}
                          </div>

                          {!isStudent && selectedDetailRow.session.report.pedagogicalMethods && (
                            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                              <span className="text-[10px] font-bold uppercase text-slate-500 block">
                                Méthodes pédagogiques utilisées
                              </span>
                              <p className="text-slate-800 mt-0.5">
                                {selectedDetailRow.session.report.pedagogicalMethods}
                              </p>
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {selectedDetailRow.session.report.homework && (
                              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-950">
                                <span className="text-[10px] font-bold uppercase text-amber-800 block">
                                  Travail à préparer pour la prochaine séance
                                </span>
                                <p className="font-semibold mt-0.5">
                                  {selectedDetailRow.session.report.homework}
                                </p>
                              </div>
                            )}
                            {selectedDetailRow.session.report.nextSessionPlan && (
                              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-800">
                                <span className="text-[10px] font-bold uppercase text-slate-500 block">
                                  Préparation de la prochaine séance
                                </span>
                                <p className="font-semibold mt-0.5">
                                  {selectedDetailRow.session.report.nextSessionPlan}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Internal Pedagogical Observations — strictly hidden from students (Section 3.4) */}
                          {!isStudent && canViewConfidential && (
                            <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-300 space-y-2.5">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-800 uppercase">
                                  <Lock className="w-3.5 h-3.5 text-amber-700" />
                                  <span>
                                    Informations internes Direction & Enseignant (Non visibles par
                                    les étudiants)
                                  </span>
                                </div>
                                {(selectedPrivateReport?.teacherPresence ||
                                  selectedPrivateReport?.cancellationCategory ||
                                  selectedDetailRow.session.cancellationCategory) && (
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                      selectedPrivateReport?.teacherPresence ===
                                        'ABSENT_UNNOTIFIED' ||
                                      selectedPrivateReport?.cancellationCategory ===
                                        'ABSENT_UNNOTIFIED' ||
                                      selectedDetailRow.session.cancellationCategory ===
                                        'ABSENT_UNNOTIFIED'
                                        ? 'bg-rose-100 text-rose-800 border-rose-300'
                                        : selectedPrivateReport?.teacherPresence ===
                                            'ABSENT_NOTIFIED' ||
                                          selectedDetailRow.session.status === 'CANCELLED'
                                        ? 'bg-amber-100 text-amber-900 border-amber-300'
                                        : 'bg-white text-slate-700 border-slate-300'
                                    }`}
                                  >
                                    Présence enseignant :{' '}
                                    {selectedPrivateReport?.teacherPresence === 'ABSENT_UNNOTIFIED'
                                      ? 'Absent sans avoir prévenu (Cours annulé — 0h)'
                                      : selectedPrivateReport?.teacherPresence === 'ABSENT_NOTIFIED'
                                      ? 'Absent ayant prévenu (Cours annulé — 0h)'
                                      : selectedPrivateReport?.teacherPresence === 'LATE'
                                      ? 'En retard'
                                      : selectedPrivateReport?.teacherPresence === 'REPLACED'
                                      ? `Remplacé (${selectedPrivateReport?.replacementName || 'Remplaçant'})`
                                      : 'Présent'}
                                  </span>
                                )}
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
                                <div>
                                  <span className="text-slate-500 block">
                                    Difficultés / Incident interne :
                                  </span>
                                  <strong>
                                    {selectedPrivateReport?.difficultiesEncountered ||
                                      selectedPrivateReport?.incident ||
                                      'Aucune difficulté signalée'}
                                  </strong>
                                </div>
                                <div>
                                  <span className="text-slate-500 block">
                                    Observations internes / Motif :
                                  </span>
                                  <strong>
                                    {selectedPrivateReport?.remarks || 'Aucune observation'}
                                  </strong>
                                </div>
                                <div>
                                  <span className="text-slate-500 block">
                                    Observations de la Direction :
                                  </span>
                                  <strong className="text-indigo-900">
                                    {selectedPrivateReport?.directionObservations ||
                                      'Aucune observation de la Direction'}
                                  </strong>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* C. Assiduité & Présences (Section 2.5.C — Staff/Teacher only, never expose other students' absences to a student) */}
                    {!isStudent && (
                      <div className="p-4 rounded-xl border border-slate-200 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                          <h4 className="font-black text-slate-900 uppercase tracking-wider text-xs flex items-center gap-1.5">
                            <Users className="w-4 h-4 text-emerald-600" />
                            <span>C. Assiduité & Présences enregistrées sur la séance</span>
                          </h4>
                          {selectedDetailRow.hasAttendanceData && (
                            <button
                              type="button"
                              onClick={() => setShowAttendanceListInDetail((prev) => !prev)}
                              className="text-[11px] font-bold text-blue-700 hover:underline cursor-pointer"
                            >
                              {showAttendanceListInDetail
                                ? 'Masquer la liste nominative ▲'
                                : 'Voir la liste détaillée des présences / absences ▼'}
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                            <span className="text-[10px] text-slate-500 uppercase font-bold block">
                              Effectif inscrit attendu
                            </span>
                            <strong className="text-base font-black text-slate-900">
                              {selectedDetailRow.expectedCount}
                            </strong>
                          </div>
                          <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                            <span className="text-[10px] text-emerald-800 uppercase font-bold block">
                              Présents
                            </span>
                            <strong className="text-base font-black text-emerald-700">
                              {selectedDetailRow.hasAttendanceData
                                ? selectedDetailRow.presentCount
                                : 'Non pointé'}
                            </strong>
                          </div>
                          <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200">
                            <span className="text-[10px] text-rose-800 uppercase font-bold block">
                              Absents
                            </span>
                            <strong className="text-base font-black text-rose-700">
                              {selectedDetailRow.hasAttendanceData
                                ? selectedDetailRow.absentCount
                                : 'Non pointé'}
                            </strong>
                          </div>
                          <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                            <span className="text-[10px] text-amber-800 uppercase font-bold block">
                              Retards
                            </span>
                            <strong className="text-base font-black text-amber-700">
                              {selectedDetailRow.hasAttendanceData
                                ? selectedDetailRow.lateCount
                                : 'Non pointé'}
                            </strong>
                          </div>
                        </div>

                        {showAttendanceListInDetail && selectedDetailRow.hasAttendanceData && (
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 max-h-52 overflow-y-auto">
                            <table className="w-full text-left text-[11px]">
                              <thead>
                                <tr className="border-b border-slate-200 text-slate-500">
                                  <th className="py-1.5 px-2">Matricule</th>
                                  <th className="py-1.5 px-2">Étudiant</th>
                                  <th className="py-1.5 px-2">Statut pointage</th>
                                  <th className="py-1.5 px-2">Horodatage</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200/60">
                                {selectedDetailRow.expectedGroupStudents.map((st) => {
                                  const rec = selectedDetailRow.allAttendanceRecords.find(
                                    (r) =>
                                      r.studentId === st.id ||
                                      (st.matricule && r.matricule === st.matricule)
                                  );
                                  const stStatus = rec?.status || 'ABSENT';
                                  return (
                                    <tr key={st.id}>
                                      <td className="py-1.5 px-2 font-mono font-bold">
                                        {st.matricule || st.id}
                                      </td>
                                      <td className="py-1.5 px-2 font-semibold text-slate-900">
                                        {st.name}
                                      </td>
                                      <td className="py-1.5 px-2">
                                        <span
                                          className={`font-bold ${
                                            stStatus === 'PRESENT'
                                              ? 'text-emerald-700'
                                              : stStatus === 'LATE'
                                              ? 'text-amber-700'
                                              : stStatus === 'JUSTIFIED'
                                              ? 'text-blue-700'
                                              : 'text-rose-700'
                                          }`}
                                        >
                                          {stStatus === 'PRESENT'
                                            ? 'Présent'
                                            : stStatus === 'LATE'
                                            ? 'En retard'
                                            : stStatus === 'JUSTIFIED'
                                            ? 'Absence justifiée'
                                            : 'Absent'}
                                        </span>
                                      </td>
                                      <td className="py-1.5 px-2 font-mono text-slate-500">
                                        {rec?.scannedAt
                                          ? formatDateTimeFr(rec.scannedAt)
                                          : '—'}
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

                    {/* D. Documents & Supports pédagogiques joints (Section 2.5.D & 3.4.C) */}
                    <div className="p-4 rounded-xl border border-slate-200 space-y-2.5">
                      <h4 className="font-black text-slate-900 uppercase tracking-wider text-xs flex items-center gap-1.5">
                        <Paperclip className="w-4 h-4 text-indigo-600" />
                        <span>D. Documents & Supports Pédagogiques Joints</span>
                      </h4>

                      {(() => {
                        const reportAttachments = (
                          selectedDetailRow.session.report?.attachments || []
                        ).filter((a) => !isStudent || a.category !== 'JUSTIFICATIF');
                        const linkedCourseResources = learningResources.filter(
                          (r) =>
                            !r.isArchived &&
                            (r.ecId === ec?.id ||
                              r.ecId === course.id ||
                              r.ecId === course.ecId)
                        );

                        if (
                          reportAttachments.length === 0 &&
                          linkedCourseResources.length === 0
                        ) {
                          return (
                            <p className="text-slate-400 italic">
                              Aucun document joint à cette séance.
                            </p>
                          );
                        }

                        return (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {reportAttachments.map((att) => {
                              const canDownload = !isStudent || att.allowStudentDownload;
                              return (
                                <div
                                  key={att.id}
                                  className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-2"
                                >
                                  <div>
                                    <p className="font-bold text-slate-900">{att.title}</p>
                                    <p className="text-[10px] text-slate-500">
                                      {att.category} · {att.fileName} ({att.fileSize || 'PDF'})
                                    </p>
                                  </div>
                                  {canDownload ? (
                                    <a
                                      href={
                                        att.fileUrl ||
                                        `data:text/plain;charset=utf-8,${encodeURIComponent(
                                          `Document pédagogique EBM Institute : ${att.title} (${course.code})`
                                        )}`
                                      }
                                      download={att.fileName}
                                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded text-[11px] inline-flex items-center gap-1 shrink-0"
                                    >
                                      <Download className="w-3 h-3" />
                                      <span>Télécharger</span>
                                    </a>
                                  ) : (
                                    <span className="text-[10px] font-semibold text-slate-400">
                                      Téléchargement non autorisé
                                    </span>
                                  )}
                                </div>
                              );
                            })}

                            {linkedCourseResources.slice(0, 4).map((res) => (
                              <div
                                key={res.id}
                                className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-2"
                              >
                                <div>
                                  <p className="font-bold text-slate-900">{res.title}</p>
                                  <p className="text-[10px] text-slate-500">
                                    Ressource du cours ({res.category}) ·{' '}
                                    {formatPortalDateFr(res.publishedAt)}
                                  </p>
                                </div>
                                <a
                                  href={
                                    res.fileUrl ||
                                    `data:text/plain;charset=utf-8,${encodeURIComponent(
                                      res.description || res.title
                                    )}`
                                  }
                                  download={res.fileName || `${res.title}.txt`}
                                  className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded text-[11px] inline-flex items-center gap-1 shrink-0"
                                >
                                  <Download className="w-3 h-3" />
                                  <span>Support</span>
                                </a>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>

                    {/* E. Traçabilité, Publication & Validation (Section 2.5.E & 3.4.D) */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                      <h4 className="font-black text-slate-900 uppercase tracking-wider text-xs flex items-center gap-1.5">
                        <History className="w-4 h-4 text-slate-600" />
                        <span>
                          {isStudent
                            ? 'D. Informations de Publication Officielle'
                            : 'E. Traçabilité, Validation & Historique des Modifications'}
                        </span>
                      </h4>

                      {isStudent ? (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
                          <div>
                            <span className="text-slate-500 block">Statut de publication :</span>
                            <strong className="text-emerald-700">
                              Compte rendu validé et publié
                            </strong>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Date de publication :</span>
                            <strong className="font-mono">
                              {formatDateTimeFr(
                                selectedDetailRow.session.report?.publishedAt ||
                                  selectedDetailRow.session.publishedAt ||
                                  selectedDetailRow.session.validatedAt ||
                                  selectedDetailRow.session.report?.writtenAt
                              )}
                            </strong>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Enseignant rédacteur :</span>
                            <strong>
                              {selectedDetailRow.session.report?.writtenBy ||
                                selectedDetailRow.teacherName}
                            </strong>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-[11px]">
                            <div>
                              <span className="text-slate-500 block">Auteur du CR :</span>
                              <strong>
                                {selectedDetailRow.session.report?.writtenBy || '—'}
                              </strong>
                            </div>
                            <div>
                              <span className="text-slate-500 block">Date de création :</span>
                              <strong className="font-mono">
                                {formatDateTimeFr(
                                  selectedDetailRow.session.report?.createdAt ||
                                    selectedDetailRow.session.report?.writtenAt
                                )}
                              </strong>
                            </div>
                            <div>
                              <span className="text-slate-500 block">Date de soumission :</span>
                              <strong className="font-mono">
                                {formatDateTimeFr(
                                  selectedDetailRow.session.report?.submittedAt ||
                                    selectedDetailRow.session.report?.writtenAt
                                )}
                              </strong>
                            </div>
                            <div>
                              <span className="text-slate-500 block">Validation :</span>
                              <strong className="font-mono">
                                {formatDateTimeFr(
                                  selectedDetailRow.session.report?.validatedAt ||
                                    selectedDetailRow.session.validatedAt
                                )}
                              </strong>
                              {(selectedDetailRow.session.report?.validatedBy ||
                                selectedDetailRow.session.validatedBy) && (
                                <span className="block text-[10px] text-slate-500">
                                  par{' '}
                                  {selectedDetailRow.session.report?.validatedBy ||
                                    selectedDetailRow.session.validatedBy}
                                </span>
                              )}
                            </div>
                            <div>
                              <span className="text-slate-500 block">Publication :</span>
                              <strong className="font-mono text-emerald-700">
                                {formatDateTimeFr(
                                  selectedDetailRow.session.report?.publishedAt ||
                                    selectedDetailRow.session.publishedAt ||
                                    selectedDetailRow.session.validatedAt
                                )}
                              </strong>
                            </div>
                          </div>

                          {/* Administrative Quick Validation / Publication Bar (Section 2.7) */}
                          {isAdminOrDirection && selectedDetailRow.session.report && (
                            <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                              <span className="text-[11px] font-bold text-slate-600">
                                Actions administratives de contrôle :
                              </span>
                              <div className="flex flex-wrap items-center gap-2">
                                {selectedDetailRow.effectiveReportStatus !== 'PUBLIE' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const res = publishSessionReport(
                                        selectedDetailRow.session.id
                                      );
                                      if (res.success) {
                                        showAppToast({
                                          type: 'success',
                                          title: 'CR validé et publié',
                                          message:
                                            'Le compte rendu est désormais publié dans l’espace étudiant.',
                                        });
                                      }
                                    }}
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Valider & Publier le CR</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEditingSessionId(selectedDetailRow.session.id)
                                  }
                                  className="px-3 py-1.5 bg-[#17345B] hover:bg-blue-950 text-white font-bold rounded-lg text-xs cursor-pointer"
                                >
                                  Demander une correction / Réviser
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Anomaly reports on this session */}
                          {(selectedDetailRow.session.anomalyReports || []).length > 0 && (
                            <div className="pt-2 border-t border-slate-200 space-y-2">
                              <span className="text-[11px] font-black text-rose-800 uppercase block">
                                Signalements d'anomalies sur cette séance (
                                {(selectedDetailRow.session.anomalyReports || []).length})
                              </span>
                              {(selectedDetailRow.session.anomalyReports || []).map((anom) => (
                                <div
                                  key={anom.id}
                                  className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 flex flex-wrap items-center justify-between gap-2 text-[11px]"
                                >
                                  <div>
                                    <span className="font-bold text-rose-900">
                                      [{anom.category}] signalé par {anom.reportedByName} (
                                      {anom.reportedByRole})
                                    </span>{' '}
                                    <span className="text-slate-600">
                                      le {formatDateTimeFr(anom.reportedAt)}
                                    </span>
                                    <p className="text-slate-800 mt-0.5">{anom.description}</p>
                                  </div>
                                  {isAdminOrDirection && anom.status === 'OPEN' ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        resolveSessionAnomaly(
                                          selectedDetailRow.session.id,
                                          anom.id,
                                          'RESOLVED',
                                          'Vérifié et pris en compte par la Direction'
                                        );
                                        showAppToast({
                                          type: 'success',
                                          title: 'Signalement traité',
                                          message: 'Le signalement a été marqué comme résolu.',
                                        });
                                      }}
                                      className="px-2.5 py-1 bg-emerald-600 text-white font-bold rounded text-[10px] cursor-pointer"
                                    >
                                      Marquer traité
                                    </button>
                                  ) : (
                                    <span className="font-bold text-emerald-700">
                                      Statut : {anom.status}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* 4. TABLEAU CHRONOLOGIQUE DES SÉANCES (Section 2.2 : 12 colonnes Admin / Section 3.3 : 9 colonnes Étudiant) */}
          {chronologicalRows.length === 0 ? (
            <div className="p-12 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700">
                Aucune séance enregistrée pour ce cours
              </h3>
              <p className="text-xs text-slate-500">
                Dès que des séances seront planifiées dans l’emploi du temps pour{' '}
                <strong>{course.title}</strong>, elles apparaîtront automatiquement dans ce
                registre chronologique.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    {isStudent ? (
                      /* 9 Mandatory Columns for Student (Section 3.3) */
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase text-slate-600">
                        <th className="py-3 px-3">1. N°</th>
                        <th className="py-3 px-3">2. Date</th>
                        <th className="py-3 px-3">3. Horaire</th>
                        <th className="py-3 px-3">4. Enseignant</th>
                        <th className="py-3 px-3">5. Durée</th>
                        <th className="py-3 px-4">6. Contenu / Chapitre traité</th>
                        <th className="py-3 px-3">7. Statut</th>
                        <th className="py-3 px-3">8. Compte rendu</th>
                        <th className="py-3 px-3 text-right print:hidden">9. Action</th>
                      </tr>
                    ) : (
                      /* 12 Mandatory Columns for Administration / Direction (Section 2.2) */
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase text-slate-600">
                        <th className="py-3 px-2.5">1. N°</th>
                        <th className="py-3 px-2.5">2. Date</th>
                        <th className="py-3 px-2.5">3. Horaire</th>
                        <th className="py-3 px-2.5">4. Enseignant</th>
                        <th className="py-3 px-2.5">5. Salle</th>
                        <th className="py-3 px-2.5">6. Durée prévue</th>
                        <th className="py-3 px-2.5">7. Durée eff.</th>
                        <th className="py-3 px-3">8. Contenu traité</th>
                        <th className="py-3 px-2.5">9. Présence</th>
                        <th className="py-3 px-2.5">10. Statut séance</th>
                        <th className="py-3 px-2.5">11. Statut CR</th>
                        <th className="py-3 px-3 text-right print:hidden">12. Action</th>
                      </tr>
                    )}
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {paginatedRows.map((row) => {
                      const isSelected = selectedDetailSessionId === row.session.id;
                      const isMissingCrWarning =
                        row.effectiveReportStatus === 'ABSENT_MANQUANT';
                      const canStudentReadCr = row.effectiveReportStatus === 'PUBLIE';

                      if (isStudent) {
                        return (
                          <tr
                            key={row.session.id}
                            className={`hover:bg-slate-50/90 transition-colors ${
                              isSelected ? 'bg-blue-50/60' : ''
                            }`}
                          >
                            <td className="py-3 px-3 font-mono font-bold text-slate-700">
                              #{row.chronoNumber}
                            </td>
                            <td className="py-3 px-3 font-mono font-semibold text-slate-900">
                              {formatPortalDateFr(row.session.date)}
                            </td>
                            <td className="py-3 px-3 font-mono text-slate-700">
                              {row.session.startTime} - {row.session.endTime}
                            </td>
                            <td className="py-3 px-3 text-slate-800 font-medium">
                              {row.teacherName}
                            </td>
                            <td className="py-3 px-3 font-mono font-bold text-slate-800">
                              {row.effectiveHours !== null
                                ? `${row.effectiveHours}h`
                                : `${row.session.durationHours}h (prévu)`}
                            </td>
                            <td className="py-3 px-4 max-w-xs">
                              {canStudentReadCr && row.session.report ? (
                                <div>
                                  {row.session.report.chapterTitle && (
                                    <div className="font-bold text-slate-900">
                                      {row.session.report.chapterTitle}
                                    </div>
                                  )}
                                  <div className="text-slate-600 line-clamp-2">
                                    {row.session.report.content}
                                  </div>
                                </div>
                              ) : row.effectiveSessionStatus === 'ANNULEE' ? (
                                <span className="text-rose-600 italic">
                                  Séance annulée
                                  {row.session.cancellationReason
                                    ? ` (${row.session.cancellationReason})`
                                    : ''}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">
                                  {row.effectiveSessionStatus === 'PROGRAMMEE'
                                    ? 'Séance à venir'
                                    : 'Contenu visible dès publication du compte rendu'}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              {renderSessionStatusText(row.effectiveSessionStatus)}
                            </td>
                            <td className="py-3 px-3">
                              {renderReportStatusText(
                                row.effectiveReportStatus,
                                row.effectiveSessionStatus
                              )}
                            </td>
                            <td className="py-3 px-3 text-right print:hidden">
                              <div className="inline-flex items-center gap-1.5">
                                {canStudentReadCr ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setSelectedDetailSessionId(
                                        isSelected ? null : row.session.id
                                      )
                                    }
                                    className="px-2.5 py-1 bg-[#17345B] hover:bg-blue-950 text-white font-bold rounded-lg text-[11px] cursor-pointer"
                                  >
                                    Consulter le CR
                                  </button>
                                ) : (
                                  <span className="text-[11px] text-slate-400 px-2">
                                    Non publié
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setAnomalyModalSessionId(row.session.id)}
                                  className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg cursor-pointer"
                                  title="Signaler une anomalie sur cette séance"
                                >
                                  <Flag className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      // Admin / Direction / Teacher 12-Column Row
                      return (
                        <tr
                          key={row.session.id}
                          className={`hover:bg-slate-50/90 transition-colors ${
                            isSelected
                              ? 'bg-blue-50/60'
                              : isMissingCrWarning
                              ? 'bg-rose-50/30'
                              : ''
                          }`}
                        >
                          <td className="py-3 px-2.5 font-mono font-bold text-slate-700">
                            #{row.chronoNumber}
                          </td>
                          <td className="py-3 px-2.5 font-mono font-semibold text-slate-900">
                            <div>{formatPortalDateFr(row.session.date)}</div>
                            {row.session.rescheduledFrom && (
                              <div className="text-[10px] text-amber-700">
                                Init. {formatPortalDateFr(row.session.rescheduledFrom.originalDate)}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-2.5 font-mono text-slate-700 whitespace-nowrap">
                            {row.session.startTime} - {row.session.endTime}
                          </td>
                          <td className="py-3 px-2.5 text-slate-800 font-medium">
                            {row.teacherName}
                          </td>
                          <td className="py-3 px-2.5 text-slate-700">{row.roomName}</td>
                          <td className="py-3 px-2.5 font-mono text-slate-700">
                            {row.session.durationHours}h
                          </td>
                          <td className="py-3 px-2.5 font-mono font-bold">
                            {row.effectiveHours !== null ? (
                              <span className="text-emerald-700">{row.effectiveHours}h</span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-3 px-3 max-w-xs">
                            {row.session.report?.content ? (
                              <div>
                                {row.session.report.chapterTitle && (
                                  <div className="font-bold text-slate-900">
                                    {row.session.report.chapterTitle}
                                  </div>
                                )}
                                <div className="text-slate-600 line-clamp-2">
                                  {row.session.report.content}
                                </div>
                              </div>
                            ) : isMissingCrWarning ? (
                              <span className="text-rose-700 font-bold flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                Séance réalisée sans compte rendu
                              </span>
                            ) : row.effectiveSessionStatus === 'ANNULEE' ? (
                              <span className="text-rose-600 italic">
                                Annulée{' '}
                                {row.session.cancellationReason
                                  ? `: ${row.session.cancellationReason}`
                                  : ''}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">
                                Aucun CR enregistré
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-2.5 whitespace-nowrap">
                            {row.hasAttendanceData ? (
                              <div className="text-[11px]">
                                <span className="font-bold text-emerald-700">
                                  {row.presentCount} prés.
                                </span>
                                <span className="text-slate-400"> · </span>
                                <span className="font-bold text-rose-700">
                                  {row.absentCount} abs.
                                </span>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400">Non pointé</span>
                            )}
                          </td>
                          <td className="py-3 px-2.5">
                            {renderSessionStatusText(row.effectiveSessionStatus)}
                          </td>
                          <td className="py-3 px-2.5">
                            {renderReportStatusText(
                              row.effectiveReportStatus,
                              row.effectiveSessionStatus
                            )}
                          </td>
                          <td className="py-3 px-3 text-right print:hidden">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedDetailSessionId(
                                    isSelected ? null : row.session.id
                                  )
                                }
                                className="px-2.5 py-1 bg-[#17345B] hover:bg-blue-950 text-white font-bold rounded-lg text-[11px] cursor-pointer"
                              >
                                Consulter
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingSessionId(row.session.id)}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg text-[11px] cursor-pointer"
                                title="Saisir, valider ou réviser le CR"
                              >
                                {row.session.report ? 'CR / Éditer' : 'Saisir CR'}
                              </button>
                              {row.effectiveSessionStatus === 'PROGRAMMEE' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const res = confirmSessionRealizedWithoutReport(
                                      row.session.id,
                                      row.session.durationHours
                                    );
                                    if (res.success) {
                                      showAppToast({
                                        type: 'warning',
                                        title: 'Séance marquée réalisée (sans CR)',
                                        message:
                                          'La séance est confirmée réalisée et signalée avec CR manquant.',
                                      });
                                    }
                                  }}
                                  className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-semibold rounded-lg text-[10px] cursor-pointer"
                                  title="Confirmer que la séance a eu lieu même si le CR n'est pas encore soumis"
                                >
                                  Réalisée sans CR
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Bar */}
              <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 print:hidden">
                <div>
                  Affichage de{' '}
                  <strong>
                    {filteredRows.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
                  </strong>{' '}
                  à{' '}
                  <strong>
                    {Math.min(currentPage * pageSize, filteredRows.length)}
                  </strong>{' '}
                  sur <strong>{filteredRows.length}</strong> séance(s)
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="px-2 py-1 bg-white border border-slate-200 rounded font-semibold"
                  >
                    <option value={10}>10 / page</option>
                    <option value={15}>15 / page</option>
                    <option value={25}>25 / page</option>
                    <option value={50}>50 / page</option>
                  </select>

                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-1 rounded bg-white border border-slate-200 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-bold">
                    Page {currentPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1 rounded bg-white border border-slate-200 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Saisie / Validation / Révision du CR */}
      {editingSessionId && (
        <SessionValidationModal
          isOpen={true}
          sessionId={editingSessionId}
          onClose={() => setEditingSessionId(null)}
        />
      )}

      {/* Modal de Signalement d'Anomalie (Section 3.7) */}
      {anomalyModalSessionId && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-5 py-3.5 bg-amber-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Flag className="w-4 h-4" />
                <span>Signaler une anomalie sur la séance</span>
              </div>
              <button
                type="button"
                onClick={() => setAnomalyModalSessionId(null)}
                className="p-1 rounded hover:bg-white/20 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAnomalySubmit} className="p-5 space-y-3.5 text-xs">
              <p className="text-slate-600">
                Ce signalement sera transmis à l’administration et à la Direction des études pour
                vérification.
              </p>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nature de l’anomalie constatée *
                </label>
                <select
                  value={anomalyCategory}
                  onChange={(e) =>
                    setAnomalyCategory(e.target.value as SessionAnomalyCategory)
                  }
                  className="w-full h-9 px-3 bg-slate-50 border border-slate-300 rounded-lg font-semibold"
                >
                  <option value="SESSION_NOT_HELD">
                    Séance indiquée comme réalisée alors qu'elle n'a pas eu lieu
                  </option>
                  <option value="WRONG_DATE_TIME">Date ou horaire incorrect</option>
                  <option value="INACCESSIBLE_REPORT">Compte rendu inaccessible</option>
                  <option value="MISSING_DOCUMENT">Document pédagogique manquant</option>
                  <option value="CONTENT_ERROR">
                    Erreur concernant le contenu publié
                  </option>
                  <option value="OTHER">Autre observation</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Précisions (minimum 10 caractères) *
                </label>
                <textarea
                  value={anomalyDescription}
                  onChange={(e) => setAnomalyDescription(e.target.value)}
                  rows={3}
                  placeholder="Décrivez précisément l'anomalie constatée..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAnomalyModalSessionId(null)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg cursor-pointer"
                >
                  Transmettre à l’administration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
