import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Plus,
  Download,
  Filter,
  Clock,
  MapPin,
  User as UserIcon,
  AlertTriangle,
  RotateCcw,
  CheckCircle,
  ExternalLink,
  Edit2,
  Trash2,
  Printer,
  Upload,
  Link2,
  Sparkles,
  X,
  RefreshCw,
  FileSpreadsheet,
  FileText,
  List,
  LayoutGrid,
  CalendarDays,
  CalendarRange,
  Check,
  Info,
  SlidersHorizontal,
} from 'lucide-react';
import { TimetableSession, SessionActivityType } from '../types';
import { createGoogleCalendarUrl, downloadICSFile } from '../utils/calendarExport';
import { getTeachersForStudent } from '../utils/studentVisibility';
import { exportTimetableToPDF, exportTeacherScheduleToPDF } from '../utils/pdfExport';
import { downloadCsvFile, downloadMultiSheetExcelWorkbook } from '../utils/csvExport';
import { getAntananarivoDateStr, getDefaultPlanningDateStr } from '../utils/securityAndDateUtils';
import { detectSessionConflicts } from '../utils/conflictDetector';
import { showAppToast, requestAppConfirm } from './ToastAndConfirmCenter';
import { SessionValidationModal } from './SessionValidationModal';

interface TimetableGridProps {
  onOpenCreateModal: () => void;
  onOpenEditModal: (session: TimetableSession) => void;
  onOpenRescheduleModal: (session: TimetableSession) => void;
  onOpenCancelModal: (session: TimetableSession) => void;
}

type TimetableViewMode = 'DAY' | 'WEEK' | 'MONTH' | 'LIST';

interface SavedTimetableFilters {
  filiereId: string;
  level: string;
  groupId: string;
  teacherId: string;
  roomId: string;
  sessionType: string;
  status: string;
  viewMode: TimetableViewMode;
  workWeekOnly: boolean;
}

function getISOWeekNumber(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function addDaysToDateStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1, 12, 0, 0);
  dt.setDate(dt.getDate() + days);
  return getAntananarivoDateStr(dt);
}

function getMondayOfDateStr(dateStr: string, advanceWeekendToNextMonday = true): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1, 12, 0, 0);
  const day = dt.getDay();
  if (advanceWeekendToNextMonday && day === 0) {
    dt.setDate(dt.getDate() + 1);
  } else if (advanceWeekendToNextMonday && day === 6) {
    dt.setDate(dt.getDate() + 2);
  } else {
    const diffToMonday = (day + 6) % 7;
    dt.setDate(dt.getDate() - diffToMonday);
  }
  return getAntananarivoDateStr(dt);
}

export const TimetableGrid: React.FC<TimetableGridProps> = ({
  onOpenCreateModal,
  onOpenEditModal,
  onOpenRescheduleModal,
  onOpenCancelModal,
}) => {
  const {
    sessions,
    courses,
    ecs,
    rooms,
    users,
    groups,
    filieres,
    academicYears,
    selectedAcademicYear,
    setSelectedAcademicYear,
    currentUser,
    validateSession,
    deleteSession,
    purgeAllSessions,
    purgeWeekSessions,
    addSession,
    rescheduleSession,
    isCloudConnected,
    cloudSyncStatus,
    syncAllToCloudFirestore,
    lastSyncDate,
  } = useApp();

  const isStudent = currentUser.role === 'STUDENT';
  const isTeacher = currentUser.role === 'TEACHER';
  const isParent = currentUser.role === 'PARENT';

  const canManage =
    currentUser.role === 'ADMIN' ||
    currentUser.role === 'SCOLARITE' ||
    currentUser.role === 'SCHEDULER' ||
    currentUser.role === 'ACADEMIC_HEAD';

  const canValidate = canManage || currentUser.role === 'TEACHER';

  // For PARENT role, find all groupIds of linked children
  const parentChildrenGroups = useMemo(
    () =>
      isParent
        ? Array.from(
            new Set(
              users
                .filter((u) => u.role === 'STUDENT' && currentUser.linkedStudentIds?.includes(u.id))
                .map((u) => u.groupId)
                .filter(Boolean) as string[]
            )
          )
        : [],
    [isParent, users, currentUser.linkedStudentIds]
  );

  // Load persisted filters per user from localStorage
  const filterStorageKey = `ebm_timetable_filters_v2_${currentUser.id}`;
  const initialSavedFilters = useMemo<SavedTimetableFilters | null>(() => {
    try {
      const raw = localStorage.getItem(filterStorageKey);
      if (!raw) return null;
      return JSON.parse(raw) as SavedTimetableFilters;
    } catch {
      return null;
    }
  }, [filterStorageKey]);

  // Reference Date (YYYY-MM-DD) driving Day, Week, Month, and List navigation
  const todayStr = getAntananarivoDateStr();
  const defaultPlanningDateStr = getDefaultPlanningDateStr();
  const [referenceDateStr, setReferenceDateStr] = useState<string>(defaultPlanningDateStr);
  const [viewMode, setViewMode] = useState<TimetableViewMode>(initialSavedFilters?.viewMode || 'WEEK');
  const [workWeekOnly, setWorkWeekOnly] = useState<boolean>(
    initialSavedFilters?.workWeekOnly !== undefined ? initialSavedFilters.workWeekOnly : true
  );

  // Combinable Filters State
  const [selectedFiliereId, setSelectedFiliereId] = useState<string>(initialSavedFilters?.filiereId || 'ALL');
  const [selectedLevel, setSelectedLevel] = useState<string>(initialSavedFilters?.level || 'ALL');
  const [selectedGroupId, setSelectedGroupId] = useState<string>(
    isStudent
      ? currentUser.groupId || 'ALL'
      : isParent
      ? parentChildrenGroups[0] || 'ALL'
      : initialSavedFilters?.groupId || 'ALL'
  );
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(
    isTeacher ? currentUser.id : initialSavedFilters?.teacherId || 'ALL'
  );
  const [selectedRoomId, setSelectedRoomId] = useState<string>(initialSavedFilters?.roomId || 'ALL');
  const [selectedSessionType, setSelectedSessionType] = useState<string>(initialSavedFilters?.sessionType || 'ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>(initialSavedFilters?.status || 'ALL');
  const [mobileDayFilter, setMobileDayFilter] = useState<string>('ALL');

  // Persist filters on change
  useEffect(() => {
    try {
      const toSave: SavedTimetableFilters = {
        filiereId: selectedFiliereId,
        level: selectedLevel,
        groupId: selectedGroupId,
        teacherId: selectedTeacherId,
        roomId: selectedRoomId,
        sessionType: selectedSessionType,
        status: selectedStatus,
        viewMode,
        workWeekOnly,
      };
      localStorage.setItem(filterStorageKey, JSON.stringify(toSave));
    } catch {
      // Ignore storage quota issues
    }
  }, [
    filterStorageKey,
    selectedFiliereId,
    selectedLevel,
    selectedGroupId,
    selectedTeacherId,
    selectedRoomId,
    selectedSessionType,
    selectedStatus,
    viewMode,
    workWeekOnly,
  ]);

  // Dropdown menus state (Zone C: Exporter & Synchronisation)
  const [isExportMenuOpen, setIsExportMenuOpen] = useState<boolean>(false);
  const [isSyncMenuOpen, setIsSyncMenuOpen] = useState<boolean>(false);
  const [teacherPdfPeriod, setTeacherPdfPeriod] = useState<'WEEK' | 'MONTH' | 'SEMESTER'>('WEEK');
  const [exportTeacherTargetId, setExportTeacherTargetId] = useState<string>(
    isTeacher ? currentUser.id : selectedTeacherId !== 'ALL' ? selectedTeacherId : ''
  );
  const [isSyncingNow, setIsSyncingNow] = useState<boolean>(false);
  const [validationModalSessionId, setValidationModalSessionId] = useState<string | null>(null);

  const exportMenuRef = useRef<HTMLDivElement | null>(null);
  const syncMenuRef = useRef<HTMLDivElement | null>(null);
  const dateInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Close dropdowns on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setIsExportMenuOpen(false);
      }
      if (syncMenuRef.current && !syncMenuRef.current.contains(e.target as Node)) {
        setIsSyncMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsExportMenuOpen(false);
        setIsSyncMenuOpen(false);
      }
      // Keyboard shortcuts when not typing in an input/textarea/select
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        handleNavigatePeriod(-1);
      } else if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        handleNavigatePeriod(1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  });

  // Compute student-specific or teacher-specific teachers and groups
  const studentTeachers = useMemo(
    () => getTeachersForStudent(currentUser.groupId, courses, ecs, sessions, users),
    [currentUser.groupId, courses, ecs, sessions, users]
  );

  const teachers = useMemo(
    () =>
      isTeacher
        ? users.filter((u) => u.id === currentUser.id)
        : isStudent
        ? studentTeachers
        : users.filter((u) => u.role === 'TEACHER'),
    [isTeacher, isStudent, users, currentUser.id, studentTeachers]
  );

  useEffect(() => {
    if (!exportTeacherTargetId && teachers[0]) {
      setExportTeacherTargetId(teachers[0].id);
    }
  }, [exportTeacherTargetId, teachers]);

  // Groups visible in filter bar: keep all groups (especially G1A2627) accessible even when a Filiere or Level is selected
  const visibleGroups = useMemo(() => {
    const base = isStudent
      ? groups.filter((g) => g.id === currentUser.groupId)
      : isParent
      ? groups.filter((g) => parentChildrenGroups.includes(g.id))
      : [...groups];

    return base.sort((a, b) => {
      const aIsG1A = a.code.trim().toUpperCase() === 'G1A2627' ? 1 : 0;
      const bIsG1A = b.code.trim().toUpperCase() === 'G1A2627' ? 1 : 0;
      if (aIsG1A !== bIsG1A) return bIsG1A - aIsG1A;
      if (selectedFiliereId !== 'ALL') {
        const aFil = a.filiereId === selectedFiliereId ? 1 : 0;
        const bFil = b.filiereId === selectedFiliereId ? 1 : 0;
        if (aFil !== bFil) return bFil - aFil;
      }
      if (selectedLevel !== 'ALL') {
        const aLvl = a.level === selectedLevel ? 1 : 0;
        const bLvl = b.level === selectedLevel ? 1 : 0;
        if (aLvl !== bLvl) return bLvl - aLvl;
      }
      return a.code.localeCompare(b.code);
    });
  }, [isStudent, isParent, groups, currentUser.groupId, parentChildrenGroups, selectedFiliereId, selectedLevel]);

  // Drag & Drop state with live conflict preview
  const [draggedSession, setDraggedSession] = useState<TimetableSession | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [dragConflictPreview, setDragConflictPreview] = useState<{
    hasConflict: boolean;
    message?: string;
  } | null>(null);

  // "Salles disponibles" panel state
  const [showFreeRoomsNow, setShowFreeRoomsNow] = useState<boolean>(false);
  const [freeRoomCheckDate, setFreeRoomCheckDate] = useState<string>(defaultPlanningDateStr);
  const [freeRoomCheckStart, setFreeRoomCheckStart] = useState<string>('08:00');
  const [freeRoomCheckEnd, setFreeRoomCheckEnd] = useState<string>('10:00');

  // Excel / CSV Timetable Import Modal state
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [importText, setImportText] = useState<string>('');
  const [importFileName, setImportFileName] = useState<string>('');
  const [importReport, setImportReport] = useState<{
    imported: number;
    errors: { line: number; raw: string; error: string }[];
  } | null>(null);

  // Calendar Subscription Modal state
  const [showCalSubModal, setShowCalSubModal] = useState<boolean>(false);

  // Navigation helpers
  const handleNavigatePeriod = (direction: -1 | 1) => {
    if (viewMode === 'DAY') {
      setReferenceDateStr((prev) => addDaysToDateStr(prev, direction));
    } else if (viewMode === 'MONTH') {
      const [y, m, d] = referenceDateStr.split('-').map(Number);
      const dt = new Date(y, (m || 1) - 1 + direction, Math.min(d || 1, 28));
      setReferenceDateStr(getAntananarivoDateStr(dt));
    } else {
      // WEEK or LIST
      setReferenceDateStr((prev) => addDaysToDateStr(prev, direction * 7));
    }
  };

  const handleGoToToday = () => {
    setReferenceDateStr(viewMode === 'DAY' ? todayStr : defaultPlanningDateStr);
    setMobileDayFilter('ALL');
  };

  // Active Filter Count & Reset
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedFiliereId !== 'ALL') count++;
    if (selectedLevel !== 'ALL') count++;
    if (!isStudent && !isParent && selectedGroupId !== 'ALL') count++;
    if (!isTeacher && selectedTeacherId !== 'ALL') count++;
    if (selectedRoomId !== 'ALL') count++;
    if (selectedSessionType !== 'ALL') count++;
    if (selectedStatus !== 'ALL') count++;
    return count;
  }, [
    selectedFiliereId,
    selectedLevel,
    selectedGroupId,
    selectedTeacherId,
    selectedRoomId,
    selectedSessionType,
    selectedStatus,
    isStudent,
    isParent,
    isTeacher,
  ]);

  const handleResetFilters = () => {
    setSelectedFiliereId('ALL');
    setSelectedLevel('ALL');
    if (!isStudent && !isParent) setSelectedGroupId('ALL');
    if (!isTeacher) setSelectedTeacherId('ALL');
    setSelectedRoomId('ALL');
    setSelectedSessionType('ALL');
    setSelectedStatus('ALL');
    setMobileDayFilter('ALL');
    showAppToast({
      type: 'info',
      title: 'Filtres réinitialisés',
      message: 'Tous les critères de recherche ont été remis à zéro.',
    });
  };

  // Filter sessions with strict RBAC isolation + all 7 combinable filters
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      // 1. Role-based visibility
      if (isStudent) {
        if (currentUser.groupId && !s.groupIds.includes(currentUser.groupId)) {
          return false;
        }
      } else if (isTeacher) {
        if (s.teacherId !== currentUser.id) {
          return false;
        }
      } else if (isParent) {
        if (!s.groupIds.some((gid) => parentChildrenGroups.includes(gid))) {
          return false;
        }
      }

      // 2. Academic Year filter (match via course or assigned groups if specified)
      if (selectedAcademicYear) {
        const courseObj = courses.find((c) => c.id === s.courseId);
        const sessionGroups = groups.filter((g) => s.groupIds.includes(g.id));
        const yearMatchesCourse = !courseObj?.academicYear || courseObj.academicYear === selectedAcademicYear;
        const yearMatchesGroups =
          sessionGroups.length === 0 || sessionGroups.some((g) => g.academicYear === selectedAcademicYear);
        if (!yearMatchesCourse && !yearMatchesGroups) {
          return false;
        }
      }

      // 3. Filière filter (Strict isolation by course filiere when course has a filiereId)
      if (selectedFiliereId !== 'ALL') {
        const courseObj = courses.find((c) => c.id === s.courseId);
        const isCourseSession = (s.sessionType || 'COURSE') === 'COURSE' && Boolean(courseObj?.filiereId);
        if (isCourseSession) {
          if (courseObj?.filiereId !== selectedFiliereId) return false;
        } else {
          const matchesGroupFiliere = s.groupIds.some(
            (gid) => groups.find((g) => g.id === gid)?.filiereId === selectedFiliereId
          );
          if (!matchesGroupFiliere) return false;
        }
      }

      // 4. Niveau filter (L1, L2, L3, M1, M2)
      if (selectedLevel !== 'ALL') {
        const courseObj = courses.find((c) => c.id === s.courseId);
        const isCourseSession = (s.sessionType || 'COURSE') === 'COURSE' && Boolean(courseObj?.level);
        if (isCourseSession) {
          if (courseObj?.level !== selectedLevel) return false;
        } else {
          const matchesGroupLevel = s.groupIds.some(
            (gid) => groups.find((g) => g.id === gid)?.level === selectedLevel
          );
          if (!matchesGroupLevel) return false;
        }
      }

      // 5. Promotion / Groupe filter
      if (selectedGroupId !== 'ALL' && !s.groupIds.includes(selectedGroupId)) return false;

      // 6. Enseignant filter
      if (!isTeacher && selectedTeacherId !== 'ALL' && s.teacherId !== selectedTeacherId) return false;

      // 7. Salle filter
      if (selectedRoomId !== 'ALL' && s.roomId !== selectedRoomId) return false;

      // 8. Type de séance filter
      if (selectedSessionType !== 'ALL') {
        const effectiveType = s.sessionType || 'COURSE';
        if (effectiveType !== selectedSessionType) return false;
      }

      // 9. Statut filter
      if (selectedStatus !== 'ALL' && s.status !== selectedStatus) return false;

      return true;
    });
  }, [
    sessions,
    isStudent,
    isTeacher,
    isParent,
    currentUser.groupId,
    currentUser.id,
    parentChildrenGroups,
    selectedAcademicYear,
    selectedFiliereId,
    selectedLevel,
    selectedGroupId,
    selectedTeacherId,
    selectedRoomId,
    selectedSessionType,
    selectedStatus,
    courses,
    groups,
  ]);

  // Compute Monday of the active week
  const mondayDateStr = useMemo(() => getMondayOfDateStr(referenceDateStr), [referenceDateStr]);
  const sundayDateStr = useMemo(() => addDaysToDateStr(mondayDateStr, 6), [mondayDateStr]);
  const isoWeekNumber = useMemo(() => getISOWeekNumber(referenceDateStr), [referenceDateStr]);

  // Compute all sessions in this concerned week (Monday to Sunday)
  const activeWeekSessions = useMemo(
    () => sessions.filter((s) => s.date >= mondayDateStr && s.date <= sundayDateStr),
    [sessions, mondayDateStr, sundayDateStr]
  );

  const activeWeekLabel = useMemo(() => {
    const [sy, sm, sd] = mondayDateStr.split('-').map(Number);
    const [ey, em, ed] = sundayDateStr.split('-').map(Number);
    const sDate = new Date(sy, (sm || 1) - 1, sd || 1);
    const eDate = new Date(ey, (em || 1) - 1, ed || 1);
    return `du ${sDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} au ${eDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  }, [mondayDateStr, sundayDateStr]);

  // Helper date for week days
  const getDayInfo = (dayIndex: number) => {
    const dateStr = addDaysToDateStr(mondayDateStr, dayIndex);
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, (m || 1) - 1, d || 1);
    const dayNames = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    return {
      dayIndex,
      name: dayNames[dayIndex],
      dateStr,
      displayDate: dt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
      fullDisplayDate: dt.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
      isWeekend: dayIndex >= 5,
      isToday: dateStr === todayStr,
    };
  };

  // Check if Saturday (5) or Sunday (6) have activities/sessions in the filtered range
  const saturdayInfo = getDayInfo(5);
  const sundayInfo = getDayInfo(6);
  const hasSaturdaySessions = filteredSessions.some((s) => s.date === saturdayInfo.dateStr);
  const hasSundaySessions = filteredSessions.some((s) => s.date === sundayInfo.dateStr);

  const displaySaturday = !workWeekOnly || hasSaturdaySessions;
  const displaySunday = !workWeekOnly || hasSundaySessions;

  const activeDayIndices = [0, 1, 2, 3, 4];
  if (displaySaturday) activeDayIndices.push(5);
  if (displaySunday) activeDayIndices.push(6);

  const weekDays = activeDayIndices.map(getDayInfo);

  // Compute Month Grid days when viewMode === 'MONTH'
  const monthCalendarDays = useMemo(() => {
    const [y, m] = referenceDateStr.split('-').map(Number);
    const firstDayOfMonth = new Date(y, (m || 1) - 1, 1);
    const lastDayOfMonth = new Date(y, m || 1, 0);
    const firstMondayStr = getMondayOfDateStr(getAntananarivoDateStr(firstDayOfMonth));
    const totalDays = 42; // 6 weeks x 7 days
    const days: {
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isWeekend: boolean;
    }[] = [];

    for (let i = 0; i < totalDays; i++) {
      const dStr = addDaysToDateStr(firstMondayStr, i);
      const [dy, dm, dd] = dStr.split('-').map(Number);
      const isCurrentMonth = dy === y && dm === m;
      days.push({
        dateStr: dStr,
        dayNumber: dd,
        isCurrentMonth,
        isToday: dStr === todayStr,
        isWeekend: i % 7 >= 5,
      });
    }
    // Trim last week if entirely in next month
    const lastWeek = days.slice(35, 42);
    if (lastWeek.every((d) => !d.isCurrentMonth) && lastDayOfMonth.getDate() >= 28) {
      return days.slice(0, 35);
    }
    return days;
  }, [referenceDateStr, todayStr]);

  // Period range and sessions for the currently viewed period (Day, Week, Month, List)
  const { periodStartStr, periodEndStr, periodLabel, periodSessions } = useMemo(() => {
    if (viewMode === 'DAY') {
      const [y, m, d] = referenceDateStr.split('-').map(Number);
      const dt = new Date(y, (m || 1) - 1, d || 1);
      const label = dt.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      return {
        periodStartStr: referenceDateStr,
        periodEndStr: referenceDateStr,
        periodLabel: label.charAt(0).toUpperCase() + label.slice(1),
        periodSessions: filteredSessions.filter((s) => s.date === referenceDateStr),
      };
    }

    if (viewMode === 'MONTH') {
      const [y, m] = referenceDateStr.split('-').map(Number);
      const dt = new Date(y, (m || 1) - 1, 1);
      const ymPrefix = referenceDateStr.slice(0, 7);
      const label = dt.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      return {
        periodStartStr: `${ymPrefix}-01`,
        periodEndStr: `${ymPrefix}-31`,
        periodLabel: label.charAt(0).toUpperCase() + label.slice(1),
        periodSessions: filteredSessions.filter((s) => s.date.startsWith(ymPrefix)),
      };
    }

    // WEEK or LIST view
    const start = weekDays[0]?.dateStr || mondayDateStr;
    const end = weekDays[weekDays.length - 1]?.dateStr || addDaysToDateStr(mondayDateStr, 6);
    const [sy, sm, sd] = start.split('-').map(Number);
    const [ey, em, ed] = end.split('-').map(Number);
    const sDate = new Date(sy, (sm || 1) - 1, sd || 1);
    const eDate = new Date(ey, (em || 1) - 1, ed || 1);
    const label = `${sDate.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    })} – ${eDate.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })}`;
    return {
      periodStartStr: start,
      periodEndStr: end,
      periodLabel: label,
      periodSessions: filteredSessions.filter((s) => s.date >= start && s.date <= end),
    };
  }, [viewMode, referenceDateStr, filteredSessions, weekDays, mondayDateStr]);

  // 3. REAL-DATA SUMMARY INDICATORS (Section 3 of recommendations)
  const periodMetrics = useMemo(() => {
    const activePeriodSessions = periodSessions.filter((s) => s.status !== 'CANCELLED');
    const totalSessionsCount = periodSessions.length;
    const plannedHours = Number(
      activePeriodSessions.reduce((acc, s) => acc + (Number(s.durationHours) || 0), 0).toFixed(1)
    );
    const validatedHours = Number(
      activePeriodSessions
        .filter((s) => s.status === 'COMPLETED_VALIDATED')
        .reduce((acc, s) => acc + (Number(s.durationHours) || 0), 0)
        .toFixed(1)
    );
    const unvalidatedCount = activePeriodSessions.filter(
      (s) => s.status !== 'COMPLETED_VALIDATED'
    ).length;

    // Real conflict detection across sessions of the active period
    let conflictCount = 0;
    for (const s of activePeriodSessions) {
      const check = detectSessionConflicts(
        {
          id: s.id,
          courseId: s.courseId,
          teacherId: s.teacherId,
          groupIds: s.groupIds,
          roomId: s.roomId,
          date: s.date,
          startTime: s.startTime,
          endTime: s.endTime,
        },
        sessions,
        rooms,
        groups,
        users
      );
      if (check.hasConflict) {
        conflictCount++;
      }
    }

    return {
      totalSessionsCount,
      plannedHours,
      validatedHours,
      conflictCount,
      unvalidatedCount,
    };
  }, [periodSessions, sessions, rooms, groups, users]);

  // Export handlers (All preserved)
  const handleExportICS = () => {
    downloadICSFile('EBM_Emploi_du_Temps', filteredSessions, courses, rooms, users);
    setIsExportMenuOpen(false);
    showAppToast({
      type: 'success',
      title: 'Calendrier iCal (.ics) généré',
      message: 'Vous pouvez importer ce fichier dans Google Agenda, Apple Calendar ou Outlook.',
    });
  };

  const handleExportTimetablePDF = () => {
    const selectedGroupObj = groups.find((g) => g.id === selectedGroupId);
    const selectedTeacherObj = users.find((u) => u.id === (isTeacher ? currentUser.id : selectedTeacherId));

    exportTimetableToPDF({
      title: selectedGroupObj
        ? `Emploi du Temps — ${selectedGroupObj.code} (${selectedGroupObj.name})`
        : isTeacher
        ? `Emploi du Temps Enseignant — ${currentUser.name}`
        : 'Emploi du Temps Officiel EBM Institute',
      subtitle: selectedTeacherObj
        ? `Enseignant : ${selectedTeacherObj.name}`
        : selectedGroupObj
        ? `Promotion : ${selectedGroupObj.code}`
        : `Année universitaire ${selectedAcademicYear}`,
      weekLabel: `${periodLabel} (Sem. ${isoWeekNumber})`,
      sessions: periodSessions.length > 0 ? periodSessions : filteredSessions,
      courses,
      rooms,
      users,
      groups,
    });
    setIsExportMenuOpen(false);
  };

  const handleExportTimetableCSV = () => {
    const listToExport = (periodSessions.length > 0 ? periodSessions : filteredSessions)
      .slice()
      .sort((a, b) => {
        const d = a.date.localeCompare(b.date);
        return d !== 0 ? d : a.startTime.localeCompare(b.startTime);
      });
    const headers = [
      'Date',
      'Heure Début',
      'Heure Fin',
      'Durée (h)',
      'Type',
      'Code Cours',
      'Matière / Événement',
      'Enseignant / Intervenant',
      'Groupes / Promotions',
      'Salle',
      'Statut',
    ];
    const rows = listToExport.map((s) => {
      const course = courses.find((c) => c.id === s.courseId);
      const teacher = users.find((u) => u.id === s.teacherId);
      const room = rooms.find((r) => r.id === s.roomId);
      const grpCodes = s.groupIds.map((gid) => groups.find((g) => g.id === gid)?.code || gid).join(', ');
      return [
        s.date,
        s.startTime,
        s.endTime,
        s.durationHours,
        s.sessionType || 'COURSE',
        course?.code || s.sessionType || '',
        s.eventTitle || course?.title || 'Séance',
        s.eventSpeaker || teacher?.name || 'N/A',
        grpCodes,
        room?.name || s.roomId,
        s.status,
      ];
    });
    downloadCsvFile(`Emploi_du_Temps_${periodStartStr || 'Complet'}.csv`, headers, rows);
    setIsExportMenuOpen(false);
    showAppToast({
      type: 'success',
      title: 'Export Excel / CSV terminé',
      message: `${listToExport.length} séance(s) exportée(s).`,
    });
  };

  const handleExportMultiSheetExcel = () => {
    const listToExport = (periodSessions.length > 0 ? periodSessions : filteredSessions)
      .slice()
      .sort((a, b) => {
        const d = a.date.localeCompare(b.date);
        return d !== 0 ? d : a.startTime.localeCompare(b.startTime);
      });

    const commonHeaders = [
      'Date',
      'Heure Début',
      'Heure Fin',
      'Durée (h)',
      'Type',
      'Code Cours',
      'Matière / Événement',
      'Enseignant / Intervenant',
      'Groupes / Promotions',
      'Salle',
      'Statut',
    ];

    const mapSessionRow = (s: TimetableSession) => {
      const course = courses.find((c) => c.id === s.courseId);
      const teacher = users.find((u) => u.id === s.teacherId);
      const room = rooms.find((r) => r.id === s.roomId);
      const grpCodes = s.groupIds.map((gid) => groups.find((g) => g.id === gid)?.code || gid).join(', ');
      return [
        s.date,
        s.startTime,
        s.endTime,
        s.durationHours,
        s.sessionType || 'COURSE',
        course?.code || s.sessionType || '',
        s.eventTitle || course?.title || 'Séance',
        s.eventSpeaker || teacher?.name || 'N/A',
        grpCodes,
        room?.name || s.roomId,
        s.status,
      ];
    };

    const byTeacherRows = listToExport
      .slice()
      .sort((a, b) => {
        const tA = users.find((u) => u.id === a.teacherId)?.name || a.eventSpeaker || '';
        const tB = users.find((u) => u.id === b.teacherId)?.name || b.eventSpeaker || '';
        const cmp = tA.localeCompare(tB);
        if (cmp !== 0) return cmp;
        const d = a.date.localeCompare(b.date);
        return d !== 0 ? d : a.startTime.localeCompare(b.startTime);
      })
      .map(mapSessionRow);

    const byGroupRows = listToExport
      .slice()
      .sort((a, b) => {
        const gA = a.groupIds.map((gid) => groups.find((g) => g.id === gid)?.code || gid).join(', ');
        const gB = b.groupIds.map((gid) => groups.find((g) => g.id === gid)?.code || gid).join(', ');
        const cmp = gA.localeCompare(gB);
        if (cmp !== 0) return cmp;
        const d = a.date.localeCompare(b.date);
        return d !== 0 ? d : a.startTime.localeCompare(b.startTime);
      })
      .map(mapSessionRow);

    const byRoomRows = listToExport
      .slice()
      .sort((a, b) => {
        const rA = rooms.find((r) => r.id === a.roomId)?.name || a.roomId;
        const rB = rooms.find((r) => r.id === b.roomId)?.name || b.roomId;
        const cmp = rA.localeCompare(rB);
        if (cmp !== 0) return cmp;
        const d = a.date.localeCompare(b.date);
        return d !== 0 ? d : a.startTime.localeCompare(b.startTime);
      })
      .map(mapSessionRow);

    downloadMultiSheetExcelWorkbook(`EBM_Emploi_du_Temps_MultiFeuilles_${periodStartStr || 'Complet'}.xls`, [
      {
        sheetName: 'Planning Global',
        headers: commonHeaders,
        rows: listToExport.map(mapSessionRow),
      },
      {
        sheetName: 'Par Enseignant',
        headers: commonHeaders,
        rows: byTeacherRows,
      },
      {
        sheetName: 'Par Groupe',
        headers: commonHeaders,
        rows: byGroupRows,
      },
      {
        sheetName: 'Par Salle',
        headers: commonHeaders,
        rows: byRoomRows,
      },
    ]);

    setIsExportMenuOpen(false);
    showAppToast({
      type: 'success',
      title: 'Classeur Excel multi-feuilles exporté',
      message: '4 feuilles générées : Planning Global, Par Enseignant, Par Groupe, Par Salle.',
    });
  };

  const handleExportTeacherPeriodPDF = (period: 'WEEK' | 'MONTH' | 'SEMESTER') => {
    const targetTeacherId = isTeacher
      ? currentUser.id
      : exportTeacherTargetId || (selectedTeacherId !== 'ALL' ? selectedTeacherId : teachers[0]?.id);
    const teacherObj = users.find((u) => u.id === targetTeacherId) || currentUser;
    const allTeacherSessions = sessions.filter((s) => s.teacherId === teacherObj.id);
    let targetSessions = allTeacherSessions;
    let label = 'Semestre Académique Complet';

    if (period === 'WEEK') {
      const startStr = weekDays[0]?.dateStr || mondayDateStr;
      const endStr = weekDays[weekDays.length - 1]?.dateStr || addDaysToDateStr(mondayDateStr, 6);
      const wk = allTeacherSessions.filter((s) => s.date >= startStr && s.date <= endStr);
      targetSessions = wk.length > 0 ? wk : allTeacherSessions;
      label = `Semaine du ${weekDays[0]?.displayDate || ''} au ${weekDays[weekDays.length - 1]?.displayDate || ''}`;
    } else if (period === 'MONTH') {
      const ym = referenceDateStr.slice(0, 7);
      const mo = allTeacherSessions.filter((s) => s.date.startsWith(ym));
      targetSessions = mo.length > 0 ? mo : allTeacherSessions;
      label = `Mois de ${new Date(`${ym}-01`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`;
    }

    exportTeacherScheduleToPDF({
      teacher: teacherObj,
      periodType: period,
      periodLabel: label,
      sessions: targetSessions,
      courses,
      rooms,
      groups,
    });
    setIsExportMenuOpen(false);
  };

  // Handle Excel / CSV file chooser upload
  const handleExcelFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = String(evt.target?.result || '');
      setImportText(content);
      setImportReport(null);
      setShowImportModal(true);
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  };

  // Drag & Drop handlers with real-time conflict check BEFORE dropping
  const handleSessionDragStart = (e: React.DragEvent, session: TimetableSession) => {
    if (!canManage || session.status === 'CANCELLED' || session.status === 'COMPLETED_VALIDATED') {
      e.preventDefault();
      return;
    }
    setDraggedSession(session);
    e.dataTransfer.setData('text/plain', session.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDayDragOver = (e: React.DragEvent, targetDateStr: string) => {
    if (!draggedSession || !canManage) return;
    e.preventDefault();
    if (dragOverDate !== targetDateStr) {
      setDragOverDate(targetDateStr);
      if (targetDateStr === draggedSession.date) {
        setDragConflictPreview({ hasConflict: false, message: 'Même jour' });
      } else {
        const check = detectSessionConflicts(
          {
            id: draggedSession.id,
            courseId: draggedSession.courseId,
            teacherId: draggedSession.teacherId,
            groupIds: draggedSession.groupIds,
            roomId: draggedSession.roomId,
            date: targetDateStr,
            startTime: draggedSession.startTime,
            endTime: draggedSession.endTime,
          },
          sessions,
          rooms,
          groups,
          users
        );
        setDragConflictPreview({
          hasConflict: check.hasConflict,
          message: check.conflicts[0]?.message,
        });
      }
    }
    e.dataTransfer.dropEffect = dragConflictPreview?.hasConflict ? 'none' : 'move';
  };

  const handleDayDrop = (e: React.DragEvent, targetDateStr: string) => {
    e.preventDefault();
    const session = draggedSession;
    setDraggedSession(null);
    setDragOverDate(null);
    setDragConflictPreview(null);

    if (!session || !canManage || session.date === targetDateStr) return;

    const prevDate = session.date;
    const prevStart = session.startTime;
    const prevEnd = session.endTime;
    const prevRoom = session.roomId;

    const res = rescheduleSession(
      session.id,
      targetDateStr,
      session.startTime,
      session.endTime,
      session.roomId,
      `Déplacement par glisser-déposer du ${prevDate} vers le ${targetDateStr}`
    );

    if (!res.success) {
      showAppToast({
        type: 'error',
        title: 'Déplacement bloqué par un conflit',
        message: res.error,
      });
      return;
    }

    showAppToast({
      type: 'success',
      title: `Séance déplacée au ${targetDateStr}`,
      message: `Horaire conservé (${session.startTime} - ${session.endTime}). Notifications envoyées.`,
      undoLabel: 'Annuler le déplacement',
      onUndo: () => {
        rescheduleSession(
          session.id,
          prevDate,
          prevStart,
          prevEnd,
          prevRoom,
          'Annulation du déplacement par glisser-déposer'
        );
      },
    });
  };

  const handleImportExcelTimetable = (e: React.FormEvent) => {
    e.preventDefault();
    const lines = importText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    let imported = 0;
    const errors: { line: number; raw: string; error: string }[] = [];

    lines.forEach((rawLine, idx) => {
      if (idx === 0 && /date|cours|debut|salle/i.test(rawLine)) return;
      const parts = rawLine.split(/[;\t,]/).map((p) => p.trim());
      if (parts.length < 5) {
        errors.push({
          line: idx + 1,
          raw: rawLine,
          error: 'Format attendu : Date(YYYY-MM-DD);HeureDébut(HH:MM);HeureFin(HH:MM);CodeCours;NomSalle;CodeGroupe',
        });
        return;
      }
      const [dateVal, startVal, endVal, courseCode, roomCode, groupCode] = parts;
      const courseObj =
        courses.find(
          (c) =>
            c.code.toLowerCase() === courseCode.toLowerCase() ||
            c.title.toLowerCase().includes(courseCode.toLowerCase())
        ) || courses[0];
      const roomObj =
        rooms.find(
          (r) =>
            r.name.toLowerCase().includes(roomCode.toLowerCase()) ||
            r.id.toLowerCase() === roomCode.toLowerCase()
        ) || rooms[0];
      const groupObj = groupCode
        ? groups.find(
            (g) =>
              g.code.toLowerCase() === groupCode.toLowerCase() ||
              g.id.toLowerCase() === groupCode.toLowerCase()
          )
        : undefined;

      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateVal)) {
        errors.push({ line: idx + 1, raw: rawLine, error: `Date invalide (${dateVal}). Utilisez AAAA-MM-JJ.` });
        return;
      }

      const [sH, sM] = startVal.split(':').map(Number);
      const [eH, eM] = endVal.split(':').map(Number);
      const dur = Number((((eH * 60 + eM) - (sH * 60 + sM)) / 60).toFixed(2));
      if (!Number.isFinite(dur) || dur <= 0) {
        errors.push({ line: idx + 1, raw: rawLine, error: `Plage horaire invalide (${startVal} - ${endVal}).` });
        return;
      }

      const res = addSession({
        courseId: courseObj.id,
        teacherId: courseObj.teacherIds[0] || teachers[0]?.id || 'user-teacher-vasseur',
        groupIds: groupObj ? [groupObj.id] : courseObj.groupIds,
        roomId: roomObj.id,
        date: dateVal,
        startTime: startVal,
        endTime: endVal,
        durationHours: dur,
        status: 'PUBLISHED',
        notes: importFileName ? `Import fichier ${importFileName}` : 'Import Excel/CSV',
      });

      if (!res.success) {
        errors.push({ line: idx + 1, raw: rawLine, error: res.error || 'Conflit détecté' });
      } else {
        imported += 1;
      }
    });

    setImportReport({ imported, errors });
    showAppToast({
      type: errors.length > 0 && imported === 0 ? 'error' : errors.length > 0 ? 'warning' : 'success',
      title: `Import Emploi du Temps : ${imported} séance(s) créée(s)`,
      message: errors.length > 0 ? `${errors.length} ligne(s) rejetée(s) (voir rapport détaillé).` : undefined,
    });
  };

  const renderSessionStatusBadge = (session: TimetableSession) => {
    if (session.status === 'CANCELLED') {
      return (
        <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 font-semibold rounded-md text-[10px] flex items-center gap-1">
          <AlertTriangle className="w-2.5 h-2.5" /> Annulé
        </span>
      );
    }
    if (session.status === 'RESCHEDULED') {
      return (
        <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 font-semibold rounded-md text-[10px] flex items-center gap-1">
          <RotateCcw className="w-2.5 h-2.5" /> Reporté
        </span>
      );
    }
    if (session.status === 'COMPLETED_VALIDATED') {
      return (
        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold rounded-md text-[10px] flex items-center gap-1">
          <CheckCircle className="w-2.5 h-2.5" /> Validé ({session.durationHours}h)
        </span>
      );
    }
    if (session.status === 'PENDING_APPROVAL') {
      return (
        <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 font-semibold rounded-md text-[10px]">
          Non validé
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 bg-blue-50 text-[#17345B] border border-blue-200 font-semibold rounded-md text-[10px]">
        Publié
      </span>
    );
  };

  const getActivityTypeLabel = (type?: SessionActivityType, customLabel?: string) => {
    switch (type) {
      case 'CONFERENCE':
        return 'Conférence';
      case 'SEMINAIRE':
        return 'Séminaire';
      case 'SOUTENANCE':
        return 'Soutenance';
      case 'EXAMEN':
        return 'Examen';
      case 'AUTRE_EVENEMENT':
        return customLabel || 'Événement';
      default:
        return 'Cours';
    }
  };

  const renderSessionCard = (session: TimetableSession, compact = false) => {
    const course = courses.find((c) => c.id === session.courseId);
    const room = rooms.find((r) => r.id === session.roomId);
    const teacher = users.find((u) => u.id === session.teacherId);
    const isCustomEvent = session.sessionType && session.sessionType !== 'COURSE';
    const isCancelled = session.status === 'CANCELLED';
    const isRescheduled = session.status === 'RESCHEDULED';
    const isValidated = session.status === 'COMPLETED_VALIDATED';
    const googleCalUrl = createGoogleCalendarUrl(session, course, room, teacher);
    const groupLabels = session.groupIds
      .map((gid) => groups.find((g) => g.id === gid)?.code || gid)
      .join(', ');

    return (
      <div
        key={session.id}
        draggable={canManage && !isValidated && !isCancelled}
        onDragStart={(e) => handleSessionDragStart(e, session)}
        onDragEnd={() => {
          setDraggedSession(null);
          setDragOverDate(null);
          setDragConflictPreview(null);
        }}
        className={`rounded-xl p-3 border transition-all text-xs relative group bg-white ${
          canManage && !isValidated && !isCancelled ? 'cursor-grab active:cursor-grabbing' : ''
        } ${
          isCancelled
            ? 'border-l-4 border-l-rose-500 border-slate-200 bg-rose-50/20 opacity-80'
            : isRescheduled
            ? 'border-l-4 border-l-amber-500 border-slate-200 hover:shadow-sm'
            : isValidated
            ? 'border-l-4 border-l-emerald-600 border-slate-200 hover:shadow-sm'
            : 'border-l-4 border-l-[#17345B] border-slate-200 hover:shadow-sm'
        }`}
      >
        {/* Top Time & Duration */}
        <div className="flex items-center justify-between gap-1.5 mb-1.5">
          <span className="font-bold text-[#17345B] flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-[#2F6FED] shrink-0" />
            <span>
              {session.startTime} – {session.endTime}
            </span>
          </span>
          <div className="flex items-center gap-1">
            {isCustomEvent && (
              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[10px]">
                {getActivityTypeLabel(session.sessionType, session.eventCategoryLabel)}
              </span>
            )}
            <span className="text-[10px] text-slate-500 font-semibold bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200/80">
              {session.durationHours}h
            </span>
          </div>
        </div>

        {/* Title & Course Code */}
        <div className="font-bold text-slate-900 text-xs leading-snug">
          <span className={isCancelled ? 'line-through text-slate-400' : ''}>
            {session.eventTitle || course?.title || 'Séance académique'}
          </span>
        </div>

        <div className="flex items-center justify-between gap-1 mt-1 text-[11px] text-slate-500 font-medium">
          <span className="truncate">
            {isCustomEvent ? session.notes || 'Événement institutionnel' : course?.code || 'EC'}
          </span>
          {groupLabels && (
            <span className="text-[10px] font-bold text-[#17345B] bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
              {groupLabels}
            </span>
          )}
        </div>

        {/* Room & Teacher */}
        {!compact && (
          <div className="space-y-1 mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-600">
            <div className="flex items-center gap-1.5 truncate" title={`Salle : ${room?.name || session.roomId}`}>
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate font-medium text-slate-700">{room?.name || session.roomId}</span>
            </div>
            <div
              className="flex items-center gap-1.5 truncate"
              title={`Intervenant : ${session.eventSpeaker || teacher?.name || 'Intervenant'}`}
            >
              <UserIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{session.eventSpeaker || teacher?.name || 'Intervenant'}</span>
            </div>
          </div>
        )}

        {/* Status Badge & Google Calendar quick link */}
        <div className="mt-2.5 flex items-center justify-between gap-1">
          {renderSessionStatusBadge(session)}

          <a
            href={googleCalUrl}
            target="_blank"
            rel="noreferrer"
            title="Ajouter cette séance à Google Agenda"
            className="text-slate-400 hover:text-[#2F6FED] p-1 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {isCancelled && session.cancellationReason && (
          <div className="mt-2 p-1.5 bg-rose-50 border border-rose-100 rounded-lg text-[10px] text-rose-800 italic">
            Motif : {session.cancellationReason}
          </div>
        )}

        {/* Management Actions */}
        {canManage && (
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-end gap-1">
            {!isValidated && !isCancelled && (
              <>
                <button
                  type="button"
                  onClick={() => onOpenRescheduleModal(session)}
                  title="Reporter cette séance"
                  className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onOpenCancelModal(session)}
                  title="Annuler cette séance"
                  className="p-1.5 text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onOpenEditModal(session)}
                  title="Modifier cette séance"
                  className="p-1.5 text-slate-600 hover:text-[#2F6FED] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            {canValidate &&
              !isValidated &&
              !isCancelled && (
                <button
                  type="button"
                  onClick={() => setValidationModalSessionId(session.id)}
                  title="Valider avec compte rendu et cahier de textes"
                  className={`px-2 py-1 font-semibold rounded-lg text-[10px] transition-colors cursor-pointer flex items-center gap-1 ${
                    session.report
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  {session.report ? '📄 Rédigé / Valider' : 'Valider'}
                </button>
              )}

            <button
              type="button"
              onClick={() => {
                const snapshot = { ...session };
                requestAppConfirm({
                  title: 'Supprimer cette séance ?',
                  message: `La séance "${
                    session.eventTitle || course?.title || 'Cours'
                  }" du ${session.date} (${session.startTime} - ${session.endTime}) sera retirée de l'emploi du temps.`,
                  confirmLabel: 'Supprimer la séance',
                  undoMessage: 'Séance supprimée',
                  onConfirm: () => deleteSession(session.id),
                  onUndoAfterConfirm: () => {
                    addSession({
                      courseId: snapshot.courseId,
                      sessionType: snapshot.sessionType,
                      eventTitle: snapshot.eventTitle,
                      eventSpeaker: snapshot.eventSpeaker,
                      eventCategoryLabel: snapshot.eventCategoryLabel,
                      teacherId: snapshot.teacherId,
                      groupIds: snapshot.groupIds,
                      roomId: snapshot.roomId,
                      date: snapshot.date,
                      startTime: snapshot.startTime,
                      endTime: snapshot.endTime,
                      durationHours: snapshot.durationHours,
                      status: snapshot.status,
                      notes: snapshot.notes,
                    });
                  },
                });
              }}
              title="Supprimer la séance"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3.5 bg-slate-50/60 rounded-2xl">
      {/* Hidden File Input for direct Excel/CSV selection */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.txt,.tsv,.xls,.xlsx"
        onChange={handleExcelFileUpload}
        className="hidden"
      />

      {/* =====================================================================
          1. BARRE SUPÉRIEURE RÉORGANISÉE EN 3 ZONES (A: Navigation, B: Actions, C: Outils)
         ===================================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-3 sm:p-3.5 space-y-3">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          {/* ZONE A — NAVIGATION TEMPORELLE */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Prev / Today / Next group */}
            <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => handleNavigatePeriod(-1)}
                className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Période précédente (Alt + Flèche gauche)"
                aria-label="Période précédente"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleGoToToday}
                className={`h-8 px-2.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  referenceDateStr === todayStr
                    ? 'text-[#17345B] bg-slate-100/80 font-bold'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
                title="Revenir à la date d'aujourd'hui"
              >
                Aujourd'hui
              </button>
              <button
                type="button"
                onClick={() => handleNavigatePeriod(1)}
                className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Période suivante (Alt + Flèche droite)"
                aria-label="Période suivante"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Period Label & Week Number Badge */}
            <div className="flex items-center gap-2 px-1">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                {periodLabel}
              </h2>
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-[#17345B] border border-slate-200"
                title={`Numéro de semaine ISO : Semaine ${isoWeekNumber}`}
              >
                Sem. {isoWeekNumber}
              </span>
            </div>

            {/* Date Picker with Calendar */}
            <div className="relative flex items-center">
              <input
                ref={dateInputRef}
                type="date"
                value={referenceDateStr}
                onChange={(e) => {
                  if (e.target.value) {
                    setReferenceDateStr(e.target.value);
                    setMobileDayFilter('ALL');
                  }
                }}
                className="h-9 px-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#2F6FED] cursor-pointer"
                title="Sélectionner une date précise dans le calendrier"
                aria-label="Choisir une date dans le calendrier"
              />
            </div>

            {/* View Switcher: Jour, Semaine, Mois, Liste */}
            <div
              className="inline-flex items-center rounded-xl bg-slate-100 p-0.5 border border-slate-200"
              role="group"
              aria-label="Sélecteur de vue d'emploi du temps"
            >
              {(
                [
                  { id: 'DAY', label: 'Jour', icon: CalendarIcon },
                  { id: 'WEEK', label: 'Semaine', icon: CalendarRange },
                  { id: 'MONTH', label: 'Mois', icon: CalendarDays },
                  { id: 'LIST', label: 'Liste', icon: List },
                ] as const
              ).map((v) => {
                const Icon = v.icon;
                const active = viewMode === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setViewMode(v.id)}
                    className={`h-8 px-2.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                      active
                        ? 'bg-white text-[#17345B] shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title={`Afficher la vue ${v.label}`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{v.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Workdays (5j) vs Full Week (7j) Selector */}
            {viewMode === 'WEEK' && (
              <div
                className="inline-flex items-center rounded-xl bg-slate-100 p-0.5 border border-slate-200 text-xs"
                title="Basculer entre les jours ouvrables (Lun–Ven) et toute la semaine (Lun–Dim)"
              >
                <button
                  type="button"
                  onClick={() => setWorkWeekOnly(true)}
                  className={`h-8 px-2.5 rounded-lg font-semibold transition-all cursor-pointer ${
                    workWeekOnly
                      ? 'bg-white text-[#17345B] shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Lun–Ven
                </button>
                <button
                  type="button"
                  onClick={() => setWorkWeekOnly(false)}
                  className={`h-8 px-2.5 rounded-lg font-semibold transition-all cursor-pointer ${
                    !workWeekOnly
                      ? 'bg-white text-[#17345B] shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  7 jours
                </button>
              </div>
            )}
          </div>

          {/* ZONE B (Actions principales) & ZONE C (Outils complémentaires) */}
          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2">
            {/* ZONE B — ACTIONS PRINCIPALES */}
            <div className="flex flex-wrap items-center gap-2">
              {canManage && (
                <button
                  type="button"
                  onClick={onOpenCreateModal}
                  className="h-9 px-3.5 bg-[#17345B] hover:bg-[#2F6FED] text-white text-xs font-bold rounded-xl shadow-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                  title="Planifier un nouveau cours, TD, TP, examen ou conférence"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Planifier une séance</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowFreeRoomsNow((prev) => !prev)}
                className={`h-9 px-3 text-xs font-semibold rounded-xl border transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
                  showFreeRoomsNow
                    ? 'bg-[#17345B] text-white border-[#17345B]'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                }`}
                title="Rechercher les salles disponibles sur un créneau horaire"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Salles disponibles</span>
              </button>

              {canManage && (
                <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white overflow-hidden">
                  <button
                    type="button"
                    onClick={() => {
                      setImportReport(null);
                      setShowImportModal(true);
                    }}
                    className="h-9 px-3 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                    title="Importer un emploi du temps depuis un fichier Excel ou CSV"
                  >
                    <Upload className="w-3.5 h-3.5 text-slate-500" />
                    <span>Importer</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-9 px-2 border-l border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-800 text-[11px] font-semibold transition-colors cursor-pointer"
                    title="Choisir directement un fichier Excel / CSV depuis votre ordinateur"
                  >
                    Fichier…
                  </button>
                </div>
              )}
            </div>

            {/* ZONE C — OUTILS COMPLÉMENTAIRES (Menus déroulants Exporter & Synchronisation) */}
            <div className="flex items-center gap-2">
              {/* Menu déroulant EXPORTER */}
              <div className="relative" ref={exportMenuRef}>
                <button
                  type="button"
                  onClick={() => {
                    setIsExportMenuOpen((prev) => !prev);
                    setIsSyncMenuOpen(false);
                  }}
                  className="h-9 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Exporter l'emploi du temps (PDF, Planning enseignant, Excel/CSV, iCal)"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Exporter</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {isExportMenuOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 text-xs space-y-1">
                    <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Documents & Exports officiels
                    </div>

                    <button
                      type="button"
                      onClick={handleExportTimetablePDF}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 flex items-center justify-between text-slate-700 font-semibold transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <Printer className="w-4 h-4 text-[#17345B]" />
                        <span>Emploi du temps PDF</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">PDF A4</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleExportMultiSheetExcel}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 flex items-center justify-between text-slate-700 font-semibold transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                        <span>Classeur Excel multi-feuilles</span>
                      </span>
                      <span className="text-[10px] text-emerald-700 font-mono font-bold">.XLS (4 onglets)</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleExportTimetableCSV}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 flex items-center justify-between text-slate-700 font-semibold transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                        <span>Export Excel / CSV</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">.CSV</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleExportICS}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 flex items-center justify-between text-slate-700 font-semibold transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4 text-blue-600" />
                        <span>Export iCal (.ics)</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">.ICS</span>
                    </button>

                    {!isStudent && !isParent && (
                      <div className="pt-2 mt-1 border-t border-slate-100 px-2.5 pb-1.5 space-y-2">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800">
                          <FileText className="w-3.5 h-3.5 text-[#17345B]" />
                          <span>Planning enseignant PDF</span>
                        </div>

                        {!isTeacher && (
                          <select
                            value={exportTeacherTargetId}
                            onChange={(e) => setExportTeacherTargetId(e.target.value)}
                            className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800"
                          >
                            {teachers.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name}
                              </option>
                            ))}
                          </select>
                        )}

                        <div className="grid grid-cols-3 gap-1">
                          {(
                            [
                              { id: 'WEEK', label: 'Semaine' },
                              { id: 'MONTH', label: 'Mois' },
                              { id: 'SEMESTER', label: 'Semestre' },
                            ] as const
                          ).map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                setTeacherPdfPeriod(p.id);
                                handleExportTeacherPeriodPDF(p.id);
                              }}
                              className="py-1.5 px-2 rounded-lg font-semibold text-[11px] bg-slate-100 hover:bg-[#17345B] hover:text-white text-slate-700 transition-colors cursor-pointer text-center"
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Menu déroulant SYNCHRONISATION */}
              <div className="relative" ref={syncMenuRef}>
                <button
                  type="button"
                  onClick={() => {
                    setIsSyncMenuOpen((prev) => !prev);
                    setIsExportMenuOpen(false);
                  }}
                  className="h-9 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Abonnement automatique aux agendas et paramètres de synchronisation Cloud"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingNow ? 'animate-spin text-[#2F6FED]' : 'text-slate-500'}`} />
                  <span>Synchronisation</span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isCloudConnected ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  />
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {isSyncMenuOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 z-50 text-xs space-y-2.5">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div>
                        <div className="font-bold text-slate-900">Synchronisation & Agendas</div>
                        <div className="text-[11px] text-slate-500">
                          {isCloudConnected
                            ? `Cloud Temps Réel actif · Synchro ${lastSyncDate.toLocaleTimeString('fr-FR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}`
                            : 'Mode local actif'}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          cloudSyncStatus === 'ERROR'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {isCloudConnected ? 'En ligne' : 'Local'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsSyncMenuOpen(false);
                        setShowCalSubModal(true);
                      }}
                      className="w-full text-left p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 flex items-start gap-2.5 transition-colors cursor-pointer"
                    >
                      <Link2 className="w-4 h-4 text-[#2F6FED] shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-slate-800">Abonnement automatique (Webcal / iCal)</div>
                        <div className="text-[11px] text-slate-500">
                          Google Agenda, Outlook et smartphone mis à jour automatiquement.
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      disabled={isSyncingNow}
                      onClick={async () => {
                        setIsSyncingNow(true);
                        const res = await syncAllToCloudFirestore();
                        setIsSyncingNow(false);
                        setIsSyncMenuOpen(false);
                        showAppToast({
                          type: res.success ? 'success' : 'error',
                          title: res.success ? 'Synchronisation Cloud effectuée' : 'Erreur de synchronisation',
                          message: res.message,
                        });
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-[#17345B] hover:bg-[#2F6FED] text-white font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncingNow ? 'animate-spin' : ''}`} />
                      <span>Synchroniser maintenant avec le Cloud</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Bouton de réinitialisation de la semaine sélectionnée uniquement */}
              {canManage && (
                <button
                  type="button"
                  onClick={() => {
                    requestAppConfirm({
                      title: `Purger la semaine (${activeWeekLabel}) ?`,
                      message: `Attention : cette action va supprimer uniquement les ${activeWeekSessions.length} séance(s) et réservations de salles de la semaine sélectionnée (${activeWeekLabel}). Les séances des autres semaines, ainsi que toutes les matières, filières, groupes et enseignants restent intacts.`,
                      confirmLabel: 'Confirmer la purge de la semaine',
                      undoMessage: 'Semaine réinitialisée',
                      onConfirm: () => {
                        purgeWeekSessions(mondayDateStr, sundayDateStr);
                      },
                    });
                  }}
                  className="h-9 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  title={`Supprimer uniquement les séances de la semaine concernée (${activeWeekLabel}) pour repartir à zéro sans conflit`}
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Purger la semaine</span>
                  {activeWeekSessions.length > 0 && (
                    <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-200/80 text-rose-800">
                      {activeWeekSessions.length}
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* =====================================================================
            2. BARRE DE FILTRES COMBINABLES (Année, Filière, Niveau, Groupe, Enseignant, Salle, Type, Statut)
           ===================================================================== */}
        <div className="pt-2.5 border-t border-slate-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-2 items-end">
            {/* 1. Année universitaire */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Année univ.
              </label>
              <select
                value={selectedAcademicYear}
                onChange={(e) => setSelectedAcademicYear(e.target.value)}
                className="w-full h-8 px-2 text-xs bg-slate-50 hover:bg-white border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:border-[#2F6FED]"
                title="Filtrer par année universitaire"
              >
                {academicYears.map((ay) => (
                  <option key={ay.id} value={ay.code}>
                    {ay.code}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Filière */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Filière
              </label>
              <select
                value={selectedFiliereId}
                onChange={(e) => {
                  setSelectedFiliereId(e.target.value);
                  if (!isStudent && !isParent) setSelectedGroupId('ALL');
                }}
                disabled={isStudent}
                className="w-full h-8 px-2 text-xs bg-slate-50 hover:bg-white border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:border-[#2F6FED] disabled:opacity-60"
                title="Filtrer par filière ou mention"
              >
                <option value="ALL">Toutes les filières</option>
                {filieres.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.code} — {f.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Niveau */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Niveau
              </label>
              <select
                value={selectedLevel}
                onChange={(e) => {
                  setSelectedLevel(e.target.value);
                  if (!isStudent && !isParent) setSelectedGroupId('ALL');
                }}
                disabled={isStudent}
                className="w-full h-8 px-2 text-xs bg-slate-50 hover:bg-white border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:border-[#2F6FED] disabled:opacity-60"
                title="Filtrer par niveau d'études LMD"
              >
                <option value="ALL">Tous les niveaux</option>
                {['L1', 'L2', 'L3', 'M1', 'M2'].map((lvl) => (
                  <option key={lvl} value={lvl}>
                    Niveau {lvl}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Promotion / Groupe */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Promotion / Groupe
              </label>
              <select
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                disabled={isStudent}
                className="w-full h-8 px-2 text-xs bg-slate-50 hover:bg-white border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:border-[#2F6FED] disabled:opacity-60"
                title="Filtrer par groupe ou promotion"
              >
                {!isStudent && <option value="ALL">Tous les groupes ({visibleGroups.length})</option>}
                {visibleGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.code} ({g.name})
                  </option>
                ))}
              </select>
            </div>

            {/* 5. Enseignant */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                {isTeacher ? 'Mon planning' : 'Enseignant'}
              </label>
              <select
                value={isTeacher ? currentUser.id : selectedTeacherId}
                onChange={(e) => !isTeacher && setSelectedTeacherId(e.target.value)}
                disabled={isTeacher}
                className="w-full h-8 px-2 text-xs bg-slate-50 hover:bg-white border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:border-[#2F6FED] disabled:opacity-60"
                title="Filtrer par enseignant"
              >
                {!isTeacher && <option value="ALL">Tous les enseignants ({teachers.length})</option>}
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 6. Salle */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Salle
              </label>
              <select
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(e.target.value)}
                className="w-full h-8 px-2 text-xs bg-slate-50 hover:bg-white border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:border-[#2F6FED]"
                title="Filtrer par salle de cours ou amphithéâtre"
              >
                <option value="ALL">Toutes les salles</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 7. Type de séance */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Type de séance
              </label>
              <select
                value={selectedSessionType}
                onChange={(e) => setSelectedSessionType(e.target.value)}
                className="w-full h-8 px-2 text-xs bg-slate-50 hover:bg-white border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:border-[#2F6FED]"
                title="Filtrer par type d'activité pédagogique"
              >
                <option value="ALL">Tous les types</option>
                <option value="COURSE">Cours / TD / TP</option>
                <option value="EXAMEN">Examen / Évaluation</option>
                <option value="CONFERENCE">Conférence</option>
                <option value="SEMINAIRE">Séminaire</option>
                <option value="SOUTENANCE">Soutenance</option>
                <option value="AUTRE_EVENEMENT">Autre événement</option>
              </select>
            </div>

            {/* 8. Statut + Réinitialisation rapide */}
            <div className="flex items-end gap-1.5">
              <div className="flex-1 min-w-0">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Statut
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full h-8 px-2 text-xs bg-slate-50 hover:bg-white border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:border-[#2F6FED]"
                  title="Filtrer par statut de validation"
                >
                  <option value="ALL">Tous les statuts</option>
                  <option value="PUBLISHED">Publié</option>
                  <option value="COMPLETED_VALIDATED">Validé</option>
                  <option value="RESCHEDULED">Reporté</option>
                  <option value="PENDING_APPROVAL">Non validé</option>
                  <option value="CANCELLED">Annulé</option>
                </select>
              </div>

              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="h-8 px-2.5 rounded-lg border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold inline-flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                  title="Réinitialiser tous les filtres actifs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>({activeFilterCount})</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Live "Salles disponibles" Interactive Panel */}
        {showFreeRoomsNow && (
          <div className="pt-3 border-t border-slate-200 bg-slate-50 rounded-xl p-3 space-y-2.5 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#2F6FED]" />
                <span>Disponibilité des salles en direct & réservation rapide</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="date"
                  value={freeRoomCheckDate}
                  onChange={(e) => setFreeRoomCheckDate(e.target.value)}
                  className="h-8 px-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold"
                />
                <input
                  type="time"
                  value={freeRoomCheckStart}
                  onChange={(e) => setFreeRoomCheckStart(e.target.value)}
                  className="h-8 px-2 rounded-lg border border-slate-300 bg-white text-xs font-mono font-semibold"
                />
                <span className="text-slate-500">à</span>
                <input
                  type="time"
                  value={freeRoomCheckEnd}
                  onChange={(e) => setFreeRoomCheckEnd(e.target.value)}
                  className="h-8 px-2 rounded-lg border border-slate-300 bg-white text-xs font-mono font-semibold"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
              {rooms.map((rm) => {
                const isBusy =
                  rm.status !== 'available' ||
                  sessions.some(
                    (s) =>
                      s.roomId === rm.id &&
                      s.date === freeRoomCheckDate &&
                      s.status !== 'CANCELLED' &&
                      s.startTime < freeRoomCheckEnd &&
                      s.endTime > freeRoomCheckStart
                  );
                return (
                  <div
                    key={rm.id}
                    className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
                      isBusy
                        ? 'bg-slate-100 border-slate-200 text-slate-500'
                        : 'bg-white border-emerald-200 text-slate-900 shadow-2xs'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-bold truncate">{rm.name}</div>
                      <div className="text-[10px] text-slate-500">
                        {rm.capacity} places ·{' '}
                        <span className={isBusy ? 'text-rose-600 font-semibold' : 'text-emerald-700 font-semibold'}>
                          {isBusy ? 'Occupée' : 'Disponible'}
                        </span>
                      </div>
                    </div>
                    {!isBusy && canManage && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRoomId(rm.id);
                          onOpenCreateModal();
                        }}
                        className="px-2.5 py-1 rounded-lg bg-[#17345B] hover:bg-[#2F6FED] text-white font-semibold text-[10px] cursor-pointer shrink-0"
                      >
                        Planifier
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* =====================================================================
          3. INDICATEURS DE SYNTHÈSE COMPACTS (Calculés sur les données réelles)
         ===================================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="bg-white rounded-xl border border-slate-200 px-3.5 py-2.5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-500 block">Séances de la période</span>
            <span className="text-lg font-bold text-slate-900">{periodMetrics.totalSessionsCount}</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-slate-100 text-[#17345B] flex items-center justify-center">
            <CalendarIcon className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 px-3.5 py-2.5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-500 block">Volume horaire planifié</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-slate-900">{periodMetrics.plannedHours} h</span>
              <span className="text-[10px] font-semibold text-emerald-700">
                ({periodMetrics.validatedHours} h validées)
              </span>
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-slate-100 text-[#2F6FED] flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 px-3.5 py-2.5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-500 block">Conflits détectés</span>
            <span
              className={`text-lg font-bold ${
                periodMetrics.conflictCount > 0 ? 'text-rose-600' : 'text-emerald-700'
              }`}
            >
              {periodMetrics.conflictCount}
            </span>
          </div>
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              periodMetrics.conflictCount > 0
                ? 'bg-rose-50 text-rose-600'
                : 'bg-emerald-50 text-emerald-600'
            }`}
          >
            {periodMetrics.conflictCount > 0 ? (
              <AlertTriangle className="w-4 h-4" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 px-3.5 py-2.5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-500 block">Séances non validées</span>
            <span
              className={`text-lg font-bold ${
                periodMetrics.unvalidatedCount > 0 ? 'text-amber-700' : 'text-slate-900'
              }`}
            >
              {periodMetrics.unvalidatedCount}
            </span>
          </div>
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              periodMetrics.unvalidatedCount > 0
                ? 'bg-amber-50 text-amber-600'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            <Info className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* =====================================================================
          4. VUES DU PLANNING (SEMAINE, JOUR, MOIS, LISTE)
         ===================================================================== */}

      {/* VUE 1 : SEMAINE (WEEK) */}
      {viewMode === 'WEEK' && (
        <>
          {/* MOBILE VIEW (< md): Day Selector Pills + Vertical Day-by-Day Cards */}
          <div className="md:hidden space-y-3">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              <button
                type="button"
                onClick={() => setMobileDayFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer ${
                  mobileDayFilter === 'ALL'
                    ? 'bg-[#17345B] text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200'
                }`}
              >
                Toute la semaine
              </button>
              {weekDays.map((day) => {
                const count = filteredSessions.filter((s) => s.date === day.dateStr).length;
                return (
                  <button
                    key={day.dateStr}
                    type="button"
                    onClick={() => setMobileDayFilter(day.dateStr)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer flex items-center gap-1.5 ${
                      mobileDayFilter === day.dateStr
                        ? 'bg-[#17345B] text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-200'
                    }`}
                  >
                    <span>
                      {day.name.slice(0, 3)}. {day.displayDate}
                    </span>
                    {count > 0 && (
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                          mobileDayFilter === day.dateStr
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {weekDays
              .filter((day) => mobileDayFilter === 'ALL' || day.dateStr === mobileDayFilter)
              .map((day) => {
                const daySessions = filteredSessions
                  .filter((s) => s.date === day.dateStr)
                  .sort((a, b) => a.startTime.localeCompare(b.startTime));

                return (
                  <div
                    key={day.dateStr}
                    className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden"
                  >
                    <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                      <div className="font-bold text-xs text-slate-900 uppercase tracking-wide flex items-center gap-2">
                        <span>
                          {day.name} · {day.displayDate}
                        </span>
                        {day.isToday && (
                          <span className="px-2 py-0.5 rounded bg-[#2F6FED] text-white text-[10px] font-bold">
                            Aujourd'hui
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-semibold text-slate-500">
                        {daySessions.length} séance(s)
                      </span>
                    </div>

                    {daySessions.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400 italic">
                        Aucune séance programmée ce jour.
                      </div>
                    ) : (
                      <div className="p-3 space-y-2.5">
                        {daySessions.map((session) => renderSessionCard(session))}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>

          {/* DESKTOP & TABLET WEEK GRID (md+) */}
          <div className="hidden md:block bg-white rounded-2xl shadow-xs border border-slate-200 overflow-x-auto">
            <div style={{ minWidth: weekDays.length <= 5 ? '860px' : '1080px' }}>
              {/* Day Headers */}
              <div
                className="grid border-b border-slate-200 bg-slate-50/80"
                style={{ gridTemplateColumns: `repeat(${weekDays.length}, minmax(0, 1fr))` }}
              >
                {weekDays.map((day) => (
                  <div
                    key={day.dateStr}
                    onClick={() => {
                      setReferenceDateStr(day.dateStr);
                    }}
                    className={`py-2.5 px-3 text-center border-r border-slate-200 last:border-r-0 cursor-pointer hover:bg-slate-100/70 transition-colors ${
                      day.isToday ? 'bg-blue-50/50' : day.isWeekend ? 'bg-slate-100/40' : ''
                    }`}
                    title="Cliquer pour centrer sur cette date"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span
                        className={`text-xs font-bold uppercase tracking-wider ${
                          day.isToday ? 'text-[#2F6FED]' : 'text-slate-800'
                        }`}
                      >
                        {day.name}
                      </span>
                      {day.isToday && (
                        <span className="w-2 h-2 rounded-full bg-[#2F6FED]" title="Aujourd'hui" />
                      )}
                    </div>
                    <span
                      className={`text-[11px] font-medium ${
                        day.isToday ? 'text-[#17345B] font-bold' : 'text-slate-500'
                      }`}
                    >
                      {day.displayDate}
                    </span>
                  </div>
                ))}
              </div>

              {/* Day Columns */}
              <div
                className="grid min-h-[520px] divide-x divide-slate-200"
                style={{ gridTemplateColumns: `repeat(${weekDays.length}, minmax(0, 1fr))` }}
              >
                {weekDays.map((day) => {
                  const daySessions = filteredSessions
                    .filter((s) => s.date === day.dateStr)
                    .sort((a, b) => a.startTime.localeCompare(b.startTime));

                  const isDropTarget = dragOverDate === day.dateStr && draggedSession?.date !== day.dateStr;
                  const isDropConflict = isDropTarget && dragConflictPreview?.hasConflict;

                  return (
                    <div
                      key={day.dateStr}
                      onDragOver={(e) => handleDayDragOver(e, day.dateStr)}
                      onDragLeave={() => {
                        if (dragOverDate === day.dateStr) {
                          setDragOverDate(null);
                          setDragConflictPreview(null);
                        }
                      }}
                      onDrop={(e) => handleDayDrop(e, day.dateStr)}
                      className={`p-2 space-y-2.5 transition-colors ${
                        isDropConflict
                          ? 'bg-rose-50 ring-2 ring-inset ring-rose-500'
                          : isDropTarget
                          ? 'bg-emerald-50/70 ring-2 ring-inset ring-emerald-500'
                          : day.isToday
                          ? 'bg-blue-50/15'
                          : day.isWeekend
                          ? 'bg-slate-50/60'
                          : 'bg-white'
                      }`}
                    >
                      {isDropTarget && (
                        <div
                          className={`p-2 rounded-xl text-[11px] font-bold border ${
                            isDropConflict
                              ? 'bg-rose-600 text-white border-rose-700 shadow-sm'
                              : 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                          }`}
                        >
                          {isDropConflict
                            ? `Conflit : ${dragConflictPreview?.message || 'Créneau occupé'}`
                            : `Déposer au ${day.name} ${day.displayDate}`}
                        </div>
                      )}

                      {daySessions.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs py-12">
                          <span>{day.isWeekend ? 'Week-end' : 'Aucune séance'}</span>
                          {canManage && (
                            <span className="text-[10px] text-slate-300 mt-0.5">
                              Glissez une séance ici
                            </span>
                          )}
                        </div>
                      ) : (
                        daySessions.map((session) => renderSessionCard(session))
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {/* VUE 2 : JOUR (DAY) */}
      {viewMode === 'DAY' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900">{periodLabel}</span>
              {referenceDateStr === todayStr && (
                <span className="px-2 py-0.5 rounded-md bg-[#2F6FED] text-white text-[10px] font-bold">
                  Aujourd'hui
                </span>
              )}
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {periodSessions.length} séance(s) programmée(s) · {periodMetrics.plannedHours} h
            </span>
          </div>

          {periodSessions.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <CalendarIcon className="w-8 h-8 text-slate-300 mx-auto" />
              <div className="text-sm font-bold text-slate-700">Aucune séance planifiée pour cette journée</div>
              <p className="text-xs text-slate-500">
                Utilisez les flèches de navigation ou cliquez sur « + Planifier une séance ».
              </p>
            </div>
          ) : (
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {periodSessions
                .slice()
                .sort((a, b) => a.startTime.localeCompare(b.startTime))
                .map((session) => renderSessionCard(session))}
            </div>
          )}
        </div>
      )}

      {/* VUE 3 : MOIS (MONTH) */}
      {viewMode === 'MONTH' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center py-2 text-[11px] font-bold uppercase tracking-wider text-slate-600">
            <div>Lun</div>
            <div>Mar</div>
            <div>Mer</div>
            <div>Jeu</div>
            <div>Ven</div>
            <div className="text-slate-400">Sam</div>
            <div className="text-slate-400">Dim</div>
          </div>

          <div className="grid grid-cols-7 divide-x divide-y divide-slate-200">
            {monthCalendarDays.map((dayCell) => {
              const dayList = filteredSessions
                .filter((s) => s.date === dayCell.dateStr)
                .sort((a, b) => a.startTime.localeCompare(b.startTime));

              return (
                <div
                  key={dayCell.dateStr}
                  onClick={() => {
                    setReferenceDateStr(dayCell.dateStr);
                    setViewMode('DAY');
                  }}
                  className={`min-h-[104px] p-1.5 sm:p-2 transition-colors cursor-pointer hover:bg-slate-50 ${
                    !dayCell.isCurrentMonth
                      ? 'bg-slate-50/50 text-slate-400'
                      : dayCell.isToday
                      ? 'bg-blue-50/20'
                      : 'bg-white'
                  }`}
                  title={`Voir le détail du ${dayCell.dateStr} (${dayList.length} séance(s))`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-bold w-6 h-6 inline-flex items-center justify-center rounded-full ${
                        dayCell.isToday
                          ? 'bg-[#2F6FED] text-white'
                          : dayCell.isCurrentMonth
                          ? 'text-slate-800'
                          : 'text-slate-400'
                      }`}
                    >
                      {dayCell.dayNumber}
                    </span>
                    {dayList.length > 0 && (
                      <span className="text-[10px] font-semibold text-slate-400 hidden sm:inline">
                        {dayList.length} séa.
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    {dayList.slice(0, 3).map((s) => {
                      const c = courses.find((crs) => crs.id === s.courseId);
                      const isCancelled = s.status === 'CANCELLED';
                      return (
                        <div
                          key={s.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (canManage) onOpenEditModal(s);
                          }}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium truncate border ${
                            isCancelled
                              ? 'bg-rose-50 text-rose-700 border-rose-200 line-through'
                              : s.status === 'COMPLETED_VALIDATED'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-slate-100 text-[#17345B] border-slate-200'
                          }`}
                          title={`${s.startTime}-${s.endTime} : ${s.eventTitle || c?.title || 'Séance'}`}
                        >
                          <span className="font-bold">{s.startTime}</span> {s.eventTitle || c?.code || c?.title}
                        </div>
                      );
                    })}
                    {dayList.length > 3 && (
                      <div className="text-[10px] font-bold text-[#2F6FED] pl-1">
                        + {dayList.length - 3} autre(s)
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VUE 4 : LISTE CHRONOLOGIQUE (LIST) */}
      {viewMode === 'LIST' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Liste chronologique des séances ({periodSessions.length})
            </span>
            <span className="text-xs text-slate-500">{periodLabel}</span>
          </div>

          {periodSessions.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-400 italic">
              Aucune séance ne correspond aux filtres sélectionnés sur cette période.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/60 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-2.5 px-4">Date & Horaire</th>
                    <th className="py-2.5 px-4">Cours / Événement</th>
                    <th className="py-2.5 px-4">Promotion / Groupe</th>
                    <th className="py-2.5 px-4">Enseignant</th>
                    <th className="py-2.5 px-4">Salle</th>
                    <th className="py-2.5 px-4">Statut</th>
                    {canManage && <th className="py-2.5 px-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {periodSessions
                    .slice()
                    .sort((a, b) => {
                      const d = a.date.localeCompare(b.date);
                      return d !== 0 ? d : a.startTime.localeCompare(b.startTime);
                    })
                    .map((session) => {
                      const course = courses.find((c) => c.id === session.courseId);
                      const room = rooms.find((r) => r.id === session.roomId);
                      const teacher = users.find((u) => u.id === session.teacherId);
                      const groupCodes = session.groupIds
                        .map((gid) => groups.find((g) => g.id === gid)?.code || gid)
                        .join(', ');
                      const isValidated = session.status === 'COMPLETED_VALIDATED';
                      const isCancelled = session.status === 'CANCELLED';

                      return (
                        <tr key={session.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-4 whitespace-nowrap">
                            <div className="font-bold text-slate-900">{session.date}</div>
                            <div className="text-[11px] text-slate-500">
                              {session.startTime} – {session.endTime} ({session.durationHours}h)
                            </div>
                          </td>
                          <td className="py-2.5 px-4">
                            <div className={`font-bold text-slate-900 ${isCancelled ? 'line-through text-slate-400' : ''}`}>
                              {session.eventTitle || course?.title || 'Séance'}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {course?.code || getActivityTypeLabel(session.sessionType, session.eventCategoryLabel)}
                            </div>
                          </td>
                          <td className="py-2.5 px-4">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-[#17345B] font-bold text-[11px]">
                              {groupCodes || 'Tous'}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-slate-700 font-medium">
                            {session.eventSpeaker || teacher?.name || 'N/A'}
                          </td>
                          <td className="py-2.5 px-4 text-slate-700 font-medium">
                            {room?.name || session.roomId}
                          </td>
                          <td className="py-2.5 px-4">{renderSessionStatusBadge(session)}</td>
                          {canManage && (
                            <td className="py-2.5 px-4 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1">
                                {!isValidated && !isCancelled && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => onOpenRescheduleModal(session)}
                                      className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg cursor-pointer"
                                      title="Reporter"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => onOpenEditModal(session)}
                                      className="p-1.5 text-slate-600 hover:text-[#2F6FED] hover:bg-blue-50 rounded-lg cursor-pointer"
                                      title="Modifier"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
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
      )}

      {/* Modal: Import Excel / CSV Timetable */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Importer l'Emploi du Temps depuis Excel / CSV
                </h3>
                <p className="text-xs text-slate-500">
                  Sélectionnez un fichier Excel/CSV ou collez vos lignes : Date ; Heure Début ; Heure Fin ; Code Cours ; Salle ; Groupe
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleImportExcelTimetable} className="space-y-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-mono text-[11px] text-slate-600">
                  Format : 2026-11-03;08:00;10:00;INFO-101;Amphi A;L1-INFO-A
                  {importFileName && (
                    <span className="block text-[#2F6FED] font-sans font-bold mt-0.5">
                      Fichier chargé : {importFileName}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Choisir un fichier Excel / CSV</span>
                </button>
              </div>

              <textarea
                rows={6}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="2026-11-03;08:00;10:00;INFO-101;Amphi A;L1-INFO-A"
                className="w-full p-3 rounded-xl border border-slate-300 font-mono text-xs"
                required
              />

              {importReport && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2 max-h-44 overflow-y-auto">
                  <div className="font-bold text-slate-900">
                    Résultat : {importReport.imported} séance(s) importée(s) · {importReport.errors.length} erreur(s)
                  </div>
                  {importReport.errors.map((err, i) => (
                    <div key={i} className="text-[11px] text-rose-700">
                      <strong>Ligne {err.line} :</strong> {err.error} ({err.raw})
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  Fermer
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#17345B] hover:bg-[#2F6FED] text-white font-bold cursor-pointer"
                >
                  Vérifier les conflits & Importer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Lien d'abonnement au calendrier (Google Agenda / Téléphone) */}
      {showCalSubModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Abonnement Calendrier Dynamique (Google Agenda / iOS / Outlook)
                </h3>
                <p className="text-xs text-slate-500">
                  Synchronisation automatique sur votre téléphone lorsqu'un cours est reporté ou déplacé.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCalSubModal(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {(() => {
              const feedTarget =
                selectedGroupId !== 'ALL'
                  ? `group=${selectedGroupId}`
                  : isTeacher
                  ? `teacher=${currentUser.id}`
                  : `user=${currentUser.id}`;
              const feedUrl = `${window.location.origin}/ical/ebm-schedule.ics?${feedTarget}&token=${currentUser.id}`;
              return (
                <div className="space-y-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      URL d'abonnement iCal / Webcal personnel :
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={feedUrl}
                        className="flex-1 p-2 rounded-xl bg-slate-50 border border-slate-300 font-mono text-[11px] text-slate-800"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(feedUrl);
                          showAppToast({
                            type: 'success',
                            title: 'Lien d’abonnement copié',
                            message: 'Collez ce lien dans Google Agenda > Autres agendas > À partir de l’URL.',
                          });
                        }}
                        className="px-3 py-2 rounded-xl bg-[#17345B] hover:bg-[#2F6FED] text-white font-bold cursor-pointer shrink-0"
                      >
                        Copier le lien
                      </button>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 space-y-1">
                    <div className="font-bold text-slate-800">Comment l'ajouter sur votre téléphone :</div>
                    <p>1. Dans Google Agenda ou Apple Calendrier, choisissez « S'abonner à partir d'une URL ».</p>
                    <p>2. Vous pouvez aussi télécharger instantanément la version à jour (.ics) ci-dessous.</p>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleExportICS}
                      className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold cursor-pointer"
                    >
                      Télécharger le fichier .ics maintenant
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      <SessionValidationModal
        isOpen={Boolean(validationModalSessionId)}
        onClose={() => setValidationModalSessionId(null)}
        sessionId={validationModalSessionId || ''}
      />
    </div>
  );
};
