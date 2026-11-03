import {
  TimetableSession,
  Course,
  User,
  StudentGroup,
  Filiere,
  Parcours,
  UniteEnseignement,
  ElementConstitutif,
  EcGrade,
  QrAttendanceSession,
  HomeworkAssignment,
  HomeworkSubmission,
  SessionPrivateReport,
  SessionReportRevision,
  Room,
} from '../types';

export type HourlyProgressionState = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

// Recommendation #1: Independent Academic Validation State
export type AcademicValidationState =
  | 'VALIDATED'          // Note finale publiée >= 10/20 (ou seuil UE/EC)
  | 'COMPENSATED'        // Note < 10 mais UE validée par compensation
  | 'NOT_VALIDATED'      // Note finale publiée < 10 et UE non acquise
  | 'UNPUBLISHED'        // Note saisie en brouillon mais non publiée
  | 'EVALUATION_PENDING'; // Aucune note finale publiée pour le moment

export type StudentAttendanceStatus =
  | 'PRESENT'
  | 'LATE'
  | 'ABSENT'
  | 'JUSTIFIED'
  | 'UNRECORDED';

export interface StudentSessionAttendanceItem {
  session: TimetableSession;
  attendanceStatus: StudentAttendanceStatus;
  roomName: string;
  teacherName: string;
}

export interface StudentCourseSummary {
  course: Course;
  ue?: UniteEnseignement;
  ec?: ElementConstitutif;
  filiere?: Filiere;
  parcours?: Parcours;
  semester: string;
  creditsEcts: number;
  // 1. Progression horaire (indépendante de la validation académique)
  totalHours: number;
  realizedHours: number;
  remainingHours: number;
  hourlyProgressPercent: number;
  hourlyState: HourlyProgressionState;
  // Compatibilité ascendante
  progressPercent: number;
  // 2. Progression académique (indépendante des heures réalisées)
  academicState: AcademicValidationState;
  publishedGrade?: EcGrade;
  publishedScore?: number;
  quizScore?: number;
  examScore?: number;
  rattrapageScore?: number;
  ueAverage?: number;
  ueValidated?: boolean;
  // 3. Assiduité sur ce cours
  attendanceRate?: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  justifiedCount: number;
  unrecordedCount: number;
  // 4. Séances & pédagogie
  completedSessions: TimetableSession[];
  upcomingSessions: TimetableSession[];
  sessionDetails: StudentSessionAttendanceItem[];
  totalSessionsCount: number;
  publishedReportsCount: number;
  pendingReportsCount: number;
  level: string;
  teacherNames: string;
  homeworkCount: number;
  pendingHomeworkCount: number;
  grade?: number;
}

export interface TeacherCourseSummary {
  course: Course;
  ue?: UniteEnseignement;
  ec?: ElementConstitutif;
  filiere?: Filiere;
  groupNames: string[];
  semester: string;
  totalHours: number;
  realizedHours: number;
  plannedHours: number;
  remainingToComplete: number;
  remainingToSchedule: number;
  progressPercent: number;
  hourlyState: HourlyProgressionState;
  sessions: TimetableSession[];
  validatedSessions: TimetableSession[];
  upcomingSessions: TimetableSession[];
  pastUnvalidatedSessions: TimetableSession[];
  correctionRequestedSessions: TimetableSession[];
  sessionsMissingReport: TimetableSession[];
  sessionsWithRevisions: TimetableSession[];
  averageAttendanceRate?: number;
  gradesEnteredCount: number;
  gradesPublishedCount: number;
  expectedStudentsCount: number;
}

export type AnomalyCategory =
  | 'UNVALIDATED_SESSION'
  | 'MISSING_REPORT'
  | 'INCOHERENT_HOURS'
  | 'CORRECTION_PENDING'
  | 'REPORT_MODIFIED_HISTORY'
  | 'TEACHER_ABSENT_OR_REPLACED'
  | 'ROOM_INCIDENT'
  | 'VOLUME_DELAY'
  | 'UNPLANNED_COURSE';

export interface AdminPilotageAnomaly {
  id: string;
  type: AnomalyCategory;
  severity: 'HIGH' | 'MEDIUM' | 'INFO';
  title: string;
  description: string;
  date: string;
  filiereId?: string;
  filiereName?: string;
  level?: string;
  semester?: string;
  groupId?: string;
  groupName?: string;
  courseId?: string;
  courseCode?: string;
  courseTitle?: string;
  teacherId?: string;
  teacherName?: string;
  sessionId?: string;
  isConfidential?: boolean;
  revisions?: SessionReportRevision[];
}

// Recommendation #3: Executive Synthetic View for Direction by Filière
export type FiliereHealthStatus = 'NORMAL' | 'SURVEILLANCE' | 'RETARD';

export interface FiliereExecutiveSummary {
  filiere: Filiere;
  levels: string[];
  coursesCount: number;
  groupsCount: number;
  studentsCount: number;
  totalTargetHours: number;
  totalPlannedHours: number;
  totalRealizedHours: number;
  realizedProgressPercent: number;
  expectedProgressPercent: number;
  progressGapPercent: number; // realizedProgressPercent - expectedProgressPercent
  completedCoursesCount: number;
  inProgressCoursesCount: number;
  notStartedCoursesCount: number;
  delayedCoursesCount: number;
  pastUnvalidatedSessionsCount: number;
  correctionPendingCount: number;
  modifiedReportsCount: number;
  averageAttendanceRate?: number;
  anomaliesCount: number;
  healthStatus: FiliereHealthStatus;
  statusLabel: string;
}

/**
 * Formats a YYYY-MM-DD or ISO date string into JJ/MM/AAAA in Indian/Antananarivo timezone.
 */
export function formatPortalDateFr(dateStr?: string): string {
  if (!dateStr) return '—';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  }
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'Indian/Antananarivo',
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

/**
 * Strictly extracts realized hours from a session according to Section 4.3 & Section 10.1:
 * - Only COMPLETED_VALIDATED sessions count.
 * - Only valid numeric `report.actualHours` counts.
 * - NEVER fallback to `durationHours` when `actualHours` is missing.
 */
export function getStrictValidatedSessionHours(session: TimetableSession): {
  hours: number;
  hasMissingOrInvalidActualHours: boolean;
} {
  if (session.status !== 'COMPLETED_VALIDATED') {
    return { hours: 0, hasMissingOrInvalidActualHours: false };
  }
  const raw = session.report?.actualHours;
  if (typeof raw !== 'number' || Number.isNaN(raw) || raw < 0) {
    return { hours: 0, hasMissingOrInvalidActualHours: true };
  }
  if (session.durationHours > 0 && raw > session.durationHours) {
    return { hours: raw, hasMissingOrInvalidActualHours: true };
  }
  return { hours: raw, hasMissingOrInvalidActualHours: false };
}

/**
 * Finds the student's official attendance status for a given session.
 * Never turns an unrecorded session into ABSENT (Section 5.2 & 10.2).
 */
export function getStudentSessionAttendanceStatus(
  student: User,
  sessionId: string,
  qrSessions: QrAttendanceSession[]
): StudentAttendanceStatus {
  const sessionQrs = qrSessions.filter((q) => q.sessionId === sessionId);
  if (sessionQrs.length === 0) {
    return 'UNRECORDED';
  }
  for (const qr of sessionQrs) {
    const rec = (qr.records || []).find(
      (r) =>
        r.studentId === student.id ||
        (student.matricule && r.matricule === student.matricule)
    );
    if (rec) {
      return rec.status;
    }
  }
  return 'UNRECORDED';
}

export function computeStudentCourseSummaries(
  student: User,
  courses: Course[],
  sessions: TimetableSession[],
  teachers: User[],
  grades: EcGrade[],
  options?: {
    ues?: UniteEnseignement[];
    ecs?: ElementConstitutif[];
    filieres?: Filiere[];
    parcours?: Parcours[];
    rooms?: Room[];
    qrSessions?: QrAttendanceSession[];
    homework?: HomeworkAssignment[];
    submissions?: HomeworkSubmission[];
    inscriptions?: {
      studentId?: string;
      studentUid?: string;
      matricule?: string;
      academicYear?: string;
      filiereId?: string;
      parcoursId?: string;
      level?: string;
      groupId?: string;
      registrationStatus?: string;
    }[];
    academicYear?: string;
    getStudentUeSummary?: (
      studentId: string,
      ueId: string
    ) => {
      average: number;
      isPassed: boolean;
      totalCredits: number;
      validatedCredits: number;
      ecDetails: { ec: ElementConstitutif; grade?: EcGrade; isPassed: boolean }[];
    };
  }
): StudentCourseSummary[] {
  if (!student) return [];

  const inscriptions = options?.inscriptions || [];
  const activeInscription = inscriptions.find(
    (ins) =>
      (ins.studentId === student.id ||
        (student.uid && ins.studentUid === student.uid) ||
        (student.matricule && ins.matricule === student.matricule)) &&
      (!options?.academicYear || !ins.academicYear || ins.academicYear === options.academicYear) &&
      ins.registrationStatus !== 'CANCELLED' &&
      ins.registrationStatus !== 'ABANDONED'
  );

  const studentGroupId = activeInscription?.groupId || student.groupId;
  const studentFiliereId = activeInscription?.filiereId || student.filiereId;
  const studentLevel = activeInscription?.level || student.currentLevel;

  if (!studentGroupId && !studentFiliereId) return [];

  const ues = options?.ues || [];
  const ecs = options?.ecs || [];
  const filieres = options?.filieres || [];
  const parcoursList = options?.parcours || [];
  const rooms = options?.rooms || [];
  const qrSessions = options?.qrSessions || [];
  const homeworkList = options?.homework || [];
  const submissions = options?.submissions || [];

  const studentCourses = courses.filter((c) => {
    if (c.status === 'ARCHIVED') return false;
    if (studentGroupId && c.groupIds && c.groupIds.includes(studentGroupId)) {
      return true;
    }
    if (
      (!c.groupIds || c.groupIds.length === 0) &&
      studentFiliereId &&
      c.filiereId === studentFiliereId &&
      (!studentLevel || c.level === studentLevel)
    ) {
      return true;
    }
    return false;
  });

  return studentCourses.map((course) => {
    const ue = ues.find((u) => u.id === course.ueId);
    const ec =
      ecs.find((e) => e.id === course.ecId) ||
      ecs.find((e) => e.code === course.code || e.title === course.title);
    const filiere = filieres.find((f) => f.id === course.filiereId);
    const parcours = parcoursList.find((p) => p.id === (course.parcoursId || ue?.parcoursId));
    const semester = course.semester || ec?.semester || ue?.semester || 'S1';
    const level = course.level || studentLevel || 'L1';
    const creditsEcts = ec?.creditsEcts ?? ue?.creditsEcts ?? 3;

    const courseSessions = sessions.filter(
      (s) =>
        s.courseId === course.id &&
        (!studentGroupId ||
          !s.groupIds ||
          s.groupIds.length === 0 ||
          s.groupIds.includes(studentGroupId)) &&
        (!s.subGroupId || !student.subGroupId || s.subGroupId === student.subGroupId)
    );

    const completedSessions = courseSessions
      .filter((s) => s.status === 'COMPLETED_VALIDATED')
      .sort((a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime));

    const upcomingSessions = courseSessions
      .filter((s) => s.status !== 'COMPLETED_VALIDATED' && s.status !== 'CANCELLED')
      .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));

    const publishedReportsCount = completedSessions.filter(
      (s) =>
        Boolean(
          s.report &&
            s.report.content &&
            s.report.content.trim().length > 0 &&
            !s.correctionRequested &&
            s.report.reportStatus !== 'DRAFT' &&
            s.report.reportStatus !== 'SUBMITTED' &&
            s.report.reportStatus !== 'CORRECTION_REQUESTED' &&
            s.report.reportStatus !== 'REJECTED'
        )
    ).length;

    const pendingReportsCount = courseSessions.filter(
      (s) =>
        s.status !== 'CANCELLED' &&
        (s.correctionRequested ||
          s.report?.reportStatus === 'DRAFT' ||
          s.report?.reportStatus === 'SUBMITTED' ||
          s.report?.reportStatus === 'CORRECTION_REQUESTED' ||
          (s.status === 'COMPLETED_VALIDATED' && (!s.report || !s.report.content)))
    ).length;

    // Strict calculation of realized hours (Section 4.3)
    const realizedHours = Number(
      completedSessions
        .reduce((sum, s) => sum + getStrictValidatedSessionHours(s).hours, 0)
        .toFixed(2)
    );

    const totalHours = course.totalHours || ec?.hourlyVolume || 30;
    const remainingHours = Math.max(0, Number((totalHours - realizedHours).toFixed(2)));
    const hourlyProgressPercent =
      totalHours > 0 ? Math.min(100, Math.round((realizedHours / totalHours) * 100)) : 0;

    const hourlyState: HourlyProgressionState =
      realizedHours <= 0
        ? 'NOT_STARTED'
        : realizedHours >= totalHours
        ? 'COMPLETED'
        : 'IN_PROGRESS';

    const teacherNames =
      course.teacherIds && course.teacherIds.length > 0
        ? course.teacherIds
            .map((tid) => teachers.find((t) => t.id === tid)?.name || tid)
            .join(', ')
        : 'Non assigné';

    // Recommendation #1: Independent Academic Validation State
    // Match grade by ecId or course code
    const targetEcId = ec?.id || course.ecId || course.id;
    const rawStudentGrade = grades.find(
      (g) =>
        (g.ecId === targetEcId || (ec && g.ecId === ec.id)) &&
        (g.studentId === student.id || (student.uid && g.studentUid === student.uid))
    );

    // Strictly hide unpublished grades from student view (Section 10.3)
    const publishedGrade =
      rawStudentGrade && rawStudentGrade.isPublished && !rawStudentGrade.isDraft
        ? rawStudentGrade
        : undefined;

    let ueAverage: number | undefined;
    let ueValidated: boolean | undefined;
    if (options?.getStudentUeSummary && ue) {
      const ueSummary = options.getStudentUeSummary(student.id, ue.id);
      if (ueSummary) {
        ueAverage = ueSummary.average;
        ueValidated = ueSummary.isPassed;
      }
    }

    const publishedScore = publishedGrade?.finalScore;
    let academicState: AcademicValidationState = 'EVALUATION_PENDING';

    if (publishedGrade && typeof publishedScore === 'number') {
      if (publishedScore >= 10) {
        academicState = 'VALIDATED';
      } else if (ueValidated) {
        academicState = 'COMPENSATED';
      } else {
        academicState = 'NOT_VALIDATED';
      }
    } else if (rawStudentGrade && (!rawStudentGrade.isPublished || rawStudentGrade.isDraft)) {
      academicState = 'UNPUBLISHED';
    }

    // Attendance per non-cancelled session
    const nonCancelledSessions = courseSessions
      .filter((s) => s.status !== 'CANCELLED')
      .sort((a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime));

    let presentCount = 0;
    let lateCount = 0;
    let absentCount = 0;
    let justifiedCount = 0;
    let unrecordedCount = 0;

    const sessionDetails: StudentSessionAttendanceItem[] = nonCancelledSessions.map((sess) => {
      const status = getStudentSessionAttendanceStatus(student, sess.id, qrSessions);
      if (status === 'PRESENT') presentCount++;
      else if (status === 'LATE') lateCount++;
      else if (status === 'ABSENT') absentCount++;
      else if (status === 'JUSTIFIED') justifiedCount++;
      else unrecordedCount++;

      const roomName = rooms.find((r) => r.id === sess.roomId)?.name || sess.roomId;
      const teacherName =
        sess.eventSpeaker ||
        teachers.find((t) => t.id === sess.teacherId)?.name ||
        teacherNames;

      return {
        session: sess,
        attendanceStatus: status,
        roomName,
        teacherName,
      };
    });

    const recordedTotal = presentCount + lateCount + absentCount + justifiedCount;
    const attendanceRate =
      recordedTotal > 0
        ? Math.round(((presentCount + lateCount + justifiedCount) / recordedTotal) * 100)
        : undefined;

    // Homework for this course/EC
    const courseHomework = homeworkList.filter(
      (h) =>
        (!studentGroupId || h.groupId === studentGroupId) &&
        (h.ecId === targetEcId || h.ecId === course.id || h.ecId === course.ecId)
    );
    const pendingHomeworkCount = courseHomework.filter(
      (h) => !submissions.some((sub) => sub.homeworkId === h.id && sub.studentId === student.id)
    ).length;

    return {
      course,
      ue,
      ec,
      filiere,
      parcours,
      semester,
      level,
      creditsEcts,
      totalHours,
      realizedHours,
      remainingHours,
      hourlyProgressPercent,
      hourlyState,
      progressPercent: hourlyProgressPercent,
      academicState,
      publishedGrade,
      publishedScore,
      quizScore: publishedGrade?.quizScore,
      examScore: publishedGrade?.examScore,
      rattrapageScore: publishedGrade?.rattrapageScore,
      ueAverage,
      ueValidated,
      attendanceRate,
      presentCount,
      lateCount,
      absentCount,
      justifiedCount,
      unrecordedCount,
      completedSessions,
      upcomingSessions,
      sessionDetails,
      totalSessionsCount: courseSessions.filter((s) => s.status !== 'CANCELLED').length,
      publishedReportsCount,
      pendingReportsCount,
      teacherNames,
      homeworkCount: courseHomework.length,
      pendingHomeworkCount,
      grade: publishedScore,
    };
  });
}

export function computeTeacherCourseSummaries(
  teacher: User,
  courses: Course[],
  sessions: TimetableSession[],
  options?: {
    ues?: UniteEnseignement[];
    ecs?: ElementConstitutif[];
    filieres?: Filiere[];
    groups?: StudentGroup[];
    users?: User[];
    grades?: EcGrade[];
    qrSessions?: QrAttendanceSession[];
    privateReports?: SessionPrivateReport[];
    todayDateStr?: string;
  }
): TeacherCourseSummary[] {
  if (!teacher) return [];

  const ues = options?.ues || [];
  const ecs = options?.ecs || [];
  const filieres = options?.filieres || [];
  const groups = options?.groups || [];
  const allUsers = options?.users || [];
  const grades = options?.grades || [];
  const qrSessions = options?.qrSessions || [];
  const privateReports = options?.privateReports || [];
  const todayStr = options?.todayDateStr || new Date().toISOString().split('T')[0];

  const teacherCourses = courses.filter(
    (c) =>
      c.status !== 'ARCHIVED' &&
      ((c.teacherIds && c.teacherIds.includes(teacher.id)) ||
        sessions.some((s) => s.courseId === c.id && s.teacherId === teacher.id))
  );

  return teacherCourses.map((course) => {
    const ue = ues.find((u) => u.id === course.ueId);
    const ec =
      ecs.find((e) => e.id === course.ecId) ||
      ecs.find((e) => e.code === course.code || e.title === course.title);
    const filiere = filieres.find((f) => f.id === course.filiereId);
    const semester = course.semester || ec?.semester || ue?.semester || 'S1';

    const courseSessions = sessions
      .filter((s) => s.courseId === course.id && s.status !== 'CANCELLED')
      .sort((a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime));

    const validatedSessions = courseSessions.filter((s) => s.status === 'COMPLETED_VALIDATED');
    const upcomingSessions = courseSessions
      .filter((s) => s.status !== 'COMPLETED_VALIDATED' && s.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));

    const pastUnvalidatedSessions = courseSessions.filter(
      (s) => s.status !== 'COMPLETED_VALIDATED' && s.date < todayStr
    );

    const correctionRequestedSessions = courseSessions.filter((s) => Boolean(s.correctionRequested));

    const sessionsMissingReport = courseSessions.filter(
      (s) =>
        (s.date < todayStr || s.status === 'COMPLETED_VALIDATED') &&
        (!s.report || !s.report.content || s.report.content.trim().length < 20)
    );

    const sessionsWithRevisions = courseSessions.filter((s) => {
      const priv = privateReports.find((r) => r.id === s.id || r.sessionId === s.id);
      const revCount = (priv?.revisions || s.report?.revisions || []).length;
      return revCount > 0;
    });

    const realizedHours = Number(
      validatedSessions
        .reduce((sum, s) => sum + getStrictValidatedSessionHours(s).hours, 0)
        .toFixed(2)
    );

    const plannedHours = Number(
      courseSessions.reduce((sum, s) => sum + (s.durationHours || 0), 0).toFixed(2)
    );

    const totalHours = course.totalHours || ec?.hourlyVolume || 30;
    const remainingToComplete = Math.max(0, Number((totalHours - realizedHours).toFixed(2)));
    const remainingToSchedule = Math.max(0, Number((totalHours - plannedHours).toFixed(2)));
    const progressPercent =
      totalHours > 0 ? Math.min(100, Math.round((realizedHours / totalHours) * 100)) : 0;

    const hourlyState: HourlyProgressionState =
      realizedHours <= 0
        ? 'NOT_STARTED'
        : realizedHours >= totalHours
        ? 'COMPLETED'
        : 'IN_PROGRESS';

    const groupNames = (course.groupIds || []).map(
      (gid) => groups.find((g) => g.id === gid)?.code || gid
    );

    // Attendance across QR sessions of this course
    const sessionIds = new Set(courseSessions.map((s) => s.id));
    const courseQr = qrSessions.filter((q) => sessionIds.has(q.sessionId));
    let presentOrLate = 0;
    let totalRecords = 0;
    courseQr.forEach((q) => {
      (q.records || []).forEach((r) => {
        totalRecords++;
        if (r.status === 'PRESENT' || r.status === 'LATE' || r.status === 'JUSTIFIED') {
          presentOrLate++;
        }
      });
    });
    const averageAttendanceRate =
      totalRecords > 0 ? Math.round((presentOrLate / totalRecords) * 100) : undefined;

    // Grades progress
    const expectedStudentsCount = allUsers.filter(
      (u) => u.role === 'STUDENT' && u.isActive && u.groupId && (course.groupIds || []).includes(u.groupId)
    ).length;
    const targetEcId = ec?.id || course.ecId || course.id;
    const courseGrades = grades.filter((g) => g.ecId === targetEcId || g.ecId === course.id);
    const gradesEnteredCount = courseGrades.filter((g) => g.finalScore !== undefined).length;
    const gradesPublishedCount = courseGrades.filter(
      (g) => g.isPublished && !g.isDraft && g.finalScore !== undefined
    ).length;

    return {
      course,
      ue,
      ec,
      filiere,
      groupNames,
      semester,
      totalHours,
      realizedHours,
      plannedHours,
      remainingToComplete,
      remainingToSchedule,
      progressPercent,
      hourlyState,
      sessions: courseSessions,
      validatedSessions,
      upcomingSessions,
      pastUnvalidatedSessions,
      correctionRequestedSessions,
      sessionsMissingReport,
      sessionsWithRevisions,
      averageAttendanceRate,
      gradesEnteredCount,
      gradesPublishedCount,
      expectedStudentsCount,
    };
  });
}

export function computeAdminPilotageAnomalies(
  sessions: TimetableSession[],
  courses: Course[],
  groups: StudentGroup[],
  rooms: Room[],
  thresholdPercent: number = 15,
  options?: {
    filieres?: Filiere[];
    users?: User[];
    privateReports?: SessionPrivateReport[];
    canViewConfidential?: boolean;
    todayDateStr?: string;
  }
): AdminPilotageAnomaly[] {
  const anomalies: AdminPilotageAnomaly[] = [];
  const todayStr = options?.todayDateStr || new Date().toISOString().split('T')[0];
  const filieres = options?.filieres || [];
  const users = options?.users || [];
  const privateReports = options?.privateReports || [];
  const canViewConfidential = options?.canViewConfidential ?? true;

  // 1. Session-level anomalies
  sessions.forEach((s) => {
    const course = courses.find((c) => c.id === s.courseId);
    const courseTitle = course?.title || s.eventTitle || 'Séance';
    const courseCode = course?.code || 'EVT';
    const filiere = filieres.find((f) => f.id === course?.filiereId);
    const groupId = s.groupIds?.[0];
    const group = groups.find((g) => g.id === groupId);
    const teacher = users.find((u) => u.id === s.teacherId);
    const priv = privateReports.find((r) => r.id === s.id || r.sessionId === s.id);
    const revisions = priv?.revisions || s.report?.revisions || [];

    if (s.status === 'CANCELLED') {
      const isUnnotifiedAbsence =
        s.cancellationCategory === 'ABSENT_UNNOTIFIED' ||
        priv?.cancellationCategory === 'ABSENT_UNNOTIFIED' ||
        priv?.teacherPresence === 'ABSENT_UNNOTIFIED';

      if (canViewConfidential && isUnnotifiedAbsence) {
        anomalies.push({
          id: `anomaly-cancel-unnotified-${s.id}`,
          type: 'TEACHER_ABSENT_OR_REPLACED',
          severity: 'HIGH',
          title: `Cours annulé — Enseignant absent sans avoir prévenu : ${courseTitle}`,
          description: `Séance du ${formatPortalDateFr(s.date)} (${s.startTime}-${s.endTime}) annulée lors de la validation : absence non signalée de l'enseignant (0h réalisée).`,
          date: s.date,
          filiereId: course?.filiereId,
          filiereName: filiere?.name,
          level: course?.level || group?.level,
          semester: course?.semester,
          groupId,
          groupName: group?.code,
          courseId: s.courseId,
          courseCode,
          courseTitle,
          teacherId: s.teacherId,
          teacherName: teacher?.name || s.eventSpeaker,
          sessionId: s.id,
        });
      }
      return;
    }

    // Past session not validated
    if (s.date < todayStr && s.status !== 'COMPLETED_VALIDATED') {
      anomalies.push({
        id: `anomaly-unval-${s.id}`,
        type: 'UNVALIDATED_SESSION',
        severity: 'HIGH',
        title: `Séance passée non validée : ${courseTitle}`,
        description: `Séance du ${formatPortalDateFr(s.date)} (${s.startTime}-${s.endTime}) en attente de validation officielle.`,
        date: s.date,
        filiereId: course?.filiereId,
        filiereName: filiere?.name,
        level: course?.level || group?.level,
        semester: course?.semester,
        groupId,
        groupName: group?.code,
        courseId: s.courseId,
        courseCode,
        courseTitle,
        teacherId: s.teacherId,
        teacherName: teacher?.name || s.eventSpeaker,
        sessionId: s.id,
      });
    }

    // Validated session missing report or with incoherent actualHours
    if (s.status === 'COMPLETED_VALIDATED') {
      if (!s.report || !s.report.content || s.report.content.trim().length < 20) {
        anomalies.push({
          id: `anomaly-noreport-${s.id}`,
          type: 'MISSING_REPORT',
          severity: 'HIGH',
          title: `Compte rendu manquant ou incomplet : ${courseTitle}`,
          description: `Séance validée du ${formatPortalDateFr(s.date)} sans compte rendu réglementaire complet.`,
          date: s.date,
          filiereId: course?.filiereId,
          filiereName: filiere?.name,
          level: course?.level || group?.level,
          semester: course?.semester,
          groupId,
          groupName: group?.code,
          courseId: s.courseId,
          courseCode,
          courseTitle,
          teacherId: s.teacherId,
          teacherName: teacher?.name || s.eventSpeaker,
          sessionId: s.id,
        });
      }

      const { hasMissingOrInvalidActualHours } = getStrictValidatedSessionHours(s);
      if (hasMissingOrInvalidActualHours) {
        anomalies.push({
          id: `anomaly-hours-${s.id}`,
          type: 'INCOHERENT_HOURS',
          severity: 'HIGH',
          title: `Heures réelles absentes ou incohérentes : ${courseTitle}`,
          description: `La séance validée du ${formatPortalDateFr(s.date)} présente des heures réelles absentes ou supérieures à la durée prévue (${s.durationHours}h). Elle est comptabilisée à 0h jusqu'à régularisation.`,
          date: s.date,
          filiereId: course?.filiereId,
          filiereName: filiere?.name,
          level: course?.level || group?.level,
          semester: course?.semester,
          groupId,
          groupName: group?.code,
          courseId: s.courseId,
          courseCode,
          courseTitle,
          teacherId: s.teacherId,
          teacherName: teacher?.name || s.eventSpeaker,
          sessionId: s.id,
        });
      }
    }

    // Pending correction request
    if (s.correctionRequested) {
      anomalies.push({
        id: `anomaly-corr-${s.id}`,
        type: 'CORRECTION_PENDING',
        severity: 'MEDIUM',
        title: `Correction demandée en attente : ${courseTitle}`,
        description: `Motif : "${s.correctionReason || 'À préciser'}" (${formatPortalDateFr(s.date)}).`,
        date: s.date,
        filiereId: course?.filiereId,
        filiereName: filiere?.name,
        level: course?.level || group?.level,
        semester: course?.semester,
        groupId,
        groupName: group?.code,
        courseId: s.courseId,
        courseCode,
        courseTitle,
        teacherId: s.teacherId,
        teacherName: teacher?.name || s.eventSpeaker,
        sessionId: s.id,
        revisions,
      });
    }

    // Recommendation #2: Report with modification history (traceability for contestations)
    if (revisions.length > 0) {
      anomalies.push({
        id: `anomaly-rev-${s.id}`,
        type: 'REPORT_MODIFIED_HISTORY',
        severity: 'INFO',
        title: `Compte rendu modifié (${revisions.length} version${revisions.length > 1 ? 's' : ''} antérieure${revisions.length > 1 ? 's' : ''}) : ${courseTitle}`,
        description: `Dernière révision par ${revisions[0].modifiedBy} (${formatPortalDateFr(revisions[0].modifiedAt)}). Version initiale conservée pour suivi des contestations.`,
        date: s.date,
        filiereId: course?.filiereId,
        filiereName: filiere?.name,
        level: course?.level || group?.level,
        semester: course?.semester,
        groupId,
        groupName: group?.code,
        courseId: s.courseId,
        courseCode,
        courseTitle,
        teacherId: s.teacherId,
        teacherName: teacher?.name || s.eventSpeaker,
        sessionId: s.id,
        revisions,
      });
    }

    // Confidential internal report anomalies (only visible to ADMIN / ACADEMIC_HEAD)
    if (canViewConfidential) {
      const presence = priv?.teacherPresence || s.report?.teacherPresence;
      const replacement = priv?.replacementName || s.report?.replacementName;
      const incident = priv?.incident || s.report?.incident;

      if (presence === 'LATE' || presence === 'REPLACED') {
        anomalies.push({
          id: `anomaly-presence-${s.id}`,
          type: 'TEACHER_ABSENT_OR_REPLACED',
          severity: 'MEDIUM',
          title:
            presence === 'REPLACED'
              ? `Enseignant remplacé : ${courseTitle}`
              : `Retard enseignant signalé : ${courseTitle}`,
          description:
            presence === 'REPLACED'
              ? `Séance du ${formatPortalDateFr(s.date)} assurée par ${replacement || 'un remplaçant'}.`
              : `Retard signalé sur la séance du ${formatPortalDateFr(s.date)}.`,
          date: s.date,
          filiereId: course?.filiereId,
          filiereName: filiere?.name,
          level: course?.level || group?.level,
          semester: course?.semester,
          groupId,
          groupName: group?.code,
          courseId: s.courseId,
          courseCode,
          courseTitle,
          teacherId: s.teacherId,
          teacherName: teacher?.name || s.eventSpeaker,
          sessionId: s.id,
          isConfidential: true,
        });
      }

      if (incident && incident.trim().length > 0) {
        const roomName = rooms.find((r) => r.id === s.roomId)?.name || s.roomId;
        anomalies.push({
          id: `anomaly-incident-${s.id}`,
          type: 'ROOM_INCIDENT',
          severity: 'HIGH',
          title: `Incident signalé (${roomName}) : ${courseTitle}`,
          description: `Incident du ${formatPortalDateFr(s.date)} : "${incident}"`,
          date: s.date,
          filiereId: course?.filiereId,
          filiereName: filiere?.name,
          level: course?.level || group?.level,
          semester: course?.semester,
          groupId,
          groupName: group?.code,
          courseId: s.courseId,
          courseCode,
          courseTitle,
          teacherId: s.teacherId,
          teacherName: teacher?.name || s.eventSpeaker,
          sessionId: s.id,
          isConfidential: true,
        });
      }
    }
  });

  // 2. Course-level anomalies (Volume delay or Unplanned course)
  courses
    .filter((c) => c.status !== 'ARCHIVED')
    .forEach((c) => {
      const courseSessions = sessions.filter(
        (s) => s.courseId === c.id && s.status !== 'CANCELLED'
      );
      const filiere = filieres.find((f) => f.id === c.filiereId);
      const groupId = c.groupIds?.[0];
      const group = groups.find((g) => g.id === groupId);
      const teacher = users.find((u) => u.id === c.teacherIds?.[0]);

      if (courseSessions.length === 0) {
        anomalies.push({
          id: `anomaly-unplanned-${c.id}`,
          type: 'UNPLANNED_COURSE',
          severity: 'MEDIUM',
          title: `Cours sans aucune séance planifiée : ${c.title}`,
          description: `Le cours ${c.code} (${c.totalHours}h prévues) n'a encore aucun créneau programmé dans l'emploi du temps.`,
          date: todayStr,
          filiereId: c.filiereId,
          filiereName: filiere?.name,
          level: c.level,
          semester: c.semester,
          groupId,
          groupName: group?.code,
          courseId: c.id,
          courseCode: c.code,
          courseTitle: c.title,
          teacherId: c.teacherIds?.[0],
          teacherName: teacher?.name,
        });
        return;
      }

      const pastPlannedHours = courseSessions
        .filter((s) => s.date <= todayStr)
        .reduce((sum, s) => sum + (s.durationHours || 0), 0);

      const realizedHours = courseSessions
        .filter((s) => s.status === 'COMPLETED_VALIDATED')
        .reduce((sum, s) => sum + getStrictValidatedSessionHours(s).hours, 0);

      const totalHours = c.totalHours || 30;
      const expectedPercent =
        totalHours > 0 ? Math.min(100, Math.round((pastPlannedHours / totalHours) * 100)) : 0;
      const actualPercent =
        totalHours > 0 ? Math.min(100, Math.round((realizedHours / totalHours) * 100)) : 0;

      if (expectedPercent - actualPercent >= thresholdPercent) {
        anomalies.push({
          id: `anomaly-delay-${c.id}`,
          type: 'VOLUME_DELAY',
          severity: expectedPercent - actualPercent >= 30 ? 'HIGH' : 'MEDIUM',
          title: `Retard de progression horaire (${actualPercent}% réalisé vs ${expectedPercent}% attendu) : ${c.title}`,
          description: `${realizedHours}h validées sur ${pastPlannedHours}h déjà échues au planning (Volume cible : ${totalHours}h).`,
          date: todayStr,
          filiereId: c.filiereId,
          filiereName: filiere?.name,
          level: c.level,
          semester: c.semester,
          groupId,
          groupName: group?.code,
          courseId: c.id,
          courseCode: c.code,
          courseTitle: c.title,
          teacherId: c.teacherIds?.[0],
          teacherName: teacher?.name,
        });
      }
    });

  return anomalies.sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Recommendation #3: Executive Synthetic View for Direction ("Vue synthétique de la direction")
 * Aggregates progression, delays, attendance, and anomalies per Filière so management can identify
 * in a few seconds which filières advance normally and which have delays.
 */
export function computeFiliereExecutiveSummaries(
  filieres: Filiere[],
  courses: Course[],
  sessions: TimetableSession[],
  groups: StudentGroup[],
  users: User[],
  qrSessions: QrAttendanceSession[],
  anomalies: AdminPilotageAnomaly[],
  options?: {
    academicYear?: string;
    semesterFilter?: string;
    levelFilter?: string;
    delayThresholdPercent?: number;
    todayDateStr?: string;
  }
): FiliereExecutiveSummary[] {
  const todayStr = options?.todayDateStr || new Date().toISOString().split('T')[0];
  const threshold = options?.delayThresholdPercent ?? 15;

  return filieres.map((filiere) => {
    const filiereCourses = courses.filter(
      (c) =>
        c.status !== 'ARCHIVED' &&
        c.filiereId === filiere.id &&
        (!options?.academicYear || !c.academicYear || c.academicYear === options.academicYear) &&
        (!options?.semesterFilter || options.semesterFilter === 'ALL' || c.semester === options.semesterFilter) &&
        (!options?.levelFilter || options.levelFilter === 'ALL' || c.level === options.levelFilter)
    );

    const filiereGroups = groups.filter(
      (g) =>
        g.filiereId === filiere.id &&
        (!options?.levelFilter || options.levelFilter === 'ALL' || g.level === options.levelFilter)
    );
    const groupIdSet = new Set(filiereGroups.map((g) => g.id));
    const studentsCount = users.filter(
      (u) => u.role === 'STUDENT' && u.isActive && u.groupId && groupIdSet.has(u.groupId)
    ).length;

    const levels = Array.from(
      new Set([
        ...filiereCourses.map((c) => c.level).filter(Boolean),
        ...filiereGroups.map((g) => g.level).filter(Boolean),
      ])
    ).sort();

    let totalTargetHours = 0;
    let totalPlannedHours = 0;
    let totalPastPlannedHours = 0;
    let totalRealizedHours = 0;
    let completedCoursesCount = 0;
    let inProgressCoursesCount = 0;
    let notStartedCoursesCount = 0;
    let delayedCoursesCount = 0;
    let pastUnvalidatedSessionsCount = 0;
    let correctionPendingCount = 0;
    let modifiedReportsCount = 0;

    const courseIdSet = new Set(filiereCourses.map((c) => c.id));

    filiereCourses.forEach((course) => {
      const target = course.totalHours || 30;
      totalTargetHours += target;

      const cSessions = sessions.filter(
        (s) => s.courseId === course.id && s.status !== 'CANCELLED'
      );

      const planned = cSessions.reduce((sum, s) => sum + (s.durationHours || 0), 0);
      const pastPlanned = cSessions
        .filter((s) => s.date <= todayStr)
        .reduce((sum, s) => sum + (s.durationHours || 0), 0);
      const realized = cSessions
        .filter((s) => s.status === 'COMPLETED_VALIDATED')
        .reduce((sum, s) => sum + getStrictValidatedSessionHours(s).hours, 0);

      totalPlannedHours += planned;
      totalPastPlannedHours += pastPlanned;
      totalRealizedHours += realized;

      if (realized <= 0) notStartedCoursesCount++;
      else if (realized >= target) completedCoursesCount++;
      else inProgressCoursesCount++;

      const expectedPct = target > 0 ? Math.min(100, (pastPlanned / target) * 100) : 0;
      const actualPct = target > 0 ? Math.min(100, (realized / target) * 100) : 0;
      if (expectedPct - actualPct >= threshold || cSessions.length === 0) {
        delayedCoursesCount++;
      }

      cSessions.forEach((s) => {
        if (s.date < todayStr && s.status !== 'COMPLETED_VALIDATED') {
          pastUnvalidatedSessionsCount++;
        }
        if (s.correctionRequested) {
          correctionPendingCount++;
        }
        if ((s.report?.revisions || []).length > 0) {
          modifiedReportsCount++;
        }
      });
    });

    const realizedProgressPercent =
      totalTargetHours > 0
        ? Math.min(100, Math.round((totalRealizedHours / totalTargetHours) * 100))
        : 0;

    // Expected progress based on scheduled hours up to today (or minimum 25% benchmark if active courses have no past sessions scheduled yet)
    const rawExpectedPercent =
      totalTargetHours > 0
        ? Math.min(100, Math.round((totalPastPlannedHours / totalTargetHours) * 100))
        : 0;
    const expectedProgressPercent =
      rawExpectedPercent > 0 ? rawExpectedPercent : filiereCourses.length > 0 ? 25 : 0;

    const progressGapPercent = realizedProgressPercent - expectedProgressPercent;

    // Attendance across this filière
    const filiereSessionIds = new Set(
      sessions.filter((s) => courseIdSet.has(s.courseId) && s.status !== 'CANCELLED').map((s) => s.id)
    );
    const filiereQr = qrSessions.filter((q) => filiereSessionIds.has(q.sessionId));
    let presentCount = 0;
    let totalRecs = 0;
    filiereQr.forEach((q) => {
      (q.records || []).forEach((r) => {
        totalRecs++;
        if (r.status === 'PRESENT' || r.status === 'LATE' || r.status === 'JUSTIFIED') {
          presentCount++;
        }
      });
    });
    const averageAttendanceRate =
      totalRecs > 0 ? Math.round((presentCount / totalRecs) * 100) : undefined;

    const filiereAnomalies = anomalies.filter((a) => a.filiereId === filiere.id);

    let healthStatus: FiliereHealthStatus = 'NORMAL';
    let statusLabel = 'Avancement normal';

    if (
      delayedCoursesCount >= Math.ceil(Math.max(1, filiereCourses.length) * 0.4) ||
      progressGapPercent <= -20 ||
      pastUnvalidatedSessionsCount >= 3
    ) {
      healthStatus = 'RETARD';
      statusLabel = 'Retard détecté';
    } else if (
      delayedCoursesCount > 0 ||
      progressGapPercent <= -10 ||
      pastUnvalidatedSessionsCount > 0 ||
      correctionPendingCount > 0
    ) {
      healthStatus = 'SURVEILLANCE';
      statusLabel = 'À surveiller';
    }

    return {
      filiere,
      levels,
      coursesCount: filiereCourses.length,
      groupsCount: filiereGroups.length,
      studentsCount,
      totalTargetHours: Number(totalTargetHours.toFixed(1)),
      totalPlannedHours: Number(totalPlannedHours.toFixed(1)),
      totalRealizedHours: Number(totalRealizedHours.toFixed(1)),
      realizedProgressPercent,
      expectedProgressPercent,
      progressGapPercent,
      completedCoursesCount,
      inProgressCoursesCount,
      notStartedCoursesCount,
      delayedCoursesCount,
      pastUnvalidatedSessionsCount,
      correctionPendingCount,
      modifiedReportsCount,
      averageAttendanceRate,
      anomaliesCount: filiereAnomalies.length,
      healthStatus,
      statusLabel,
    };
  });
}
