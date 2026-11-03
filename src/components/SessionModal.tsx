import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  User,
  Users,
  AlertTriangle,
  Sparkles,
  CheckCircle,
  RotateCcw,
  Ban,
  ChevronUp,
  ChevronDown,
  Check,
} from 'lucide-react';
import { TimetableSession, SessionActivityType } from '../types';
import { detectSessionConflicts } from '../utils/conflictDetector';
import { getAntananarivoDateStr, getDefaultPlanningDateStr } from '../utils/securityAndDateUtils';
import { showAppToast } from './ToastAndConfirmCenter';

interface SessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionToEdit?: TimetableSession | null;
  mode?: 'CREATE' | 'EDIT' | 'RESCHEDULE' | 'CANCEL';
}

export const SessionModal: React.FC<SessionModalProps> = ({
  isOpen,
  onClose,
  sessionToEdit,
  mode = 'CREATE',
}) => {
  const {
    currentUser,
    filieres,
    courses,
    ecs,
    rooms,
    groups,
    users,
    sessions,
    addSession,
    updateSession,
    rescheduleSession,
    cancelSession,
    appSettings,
  } = useApp();

  const teachers = useMemo(() => users.filter((u) => u.role === 'TEACHER'), [users]);

  const sortedRooms = useMemo(() => {
    return [...rooms].sort((a, b) => a.name.localeCompare(b.name));
  }, [rooms]);

  const scheduleConfig = appSettings.scheduleSettings || {
    dayStartTime: '07:00',
    dayEndTime: '18:00',
    slotIntervalMinutes: 15,
  };

  // Always offer quarter-hour (15-minute) intervals so courses can start after a 15-minute break (e.g., 10:00 -> 10:15)
  const configurableTimeSlots = useMemo(() => {
    const [startH, startM] = (scheduleConfig.dayStartTime || '07:00').split(':').map(Number);
    const [endH, endM] = (scheduleConfig.dayEndTime || '18:00').split(':').map(Number);
    const step = 15;
    const startTotal = (isNaN(startH) ? 7 : startH) * 60 + (isNaN(startM) ? 0 : startM);
    const endTotal = (isNaN(endH) ? 18 : endH) * 60 + (isNaN(endM) ? 0 : endM);
    const slots: string[] = [];
    for (let m = startTotal; m <= endTotal; m += step) {
      const hh = String(Math.floor(m / 60)).padStart(2, '0');
      const mm = String(m % 60).padStart(2, '0');
      slots.push(`${hh}:${mm}`);
    }
    return slots;
  }, [scheduleConfig.dayStartTime, scheduleConfig.dayEndTime]);

  // Form State
  const [sessionType, setSessionType] = useState<SessionActivityType>('COURSE');
  const [modalFiliereId, setModalFiliereId] = useState<string>('ALL');
  const [showOtherFiliereGroups, setShowOtherFiliereGroups] = useState<boolean>(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventSpeaker, setEventSpeaker] = useState('');
  const [eventCategoryLabel, setEventCategoryLabel] = useState('');
  const [courseId, setCourseId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [roomId, setRoomId] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('08:30');
  const [endTime, setEndTime] = useState('10:30');
  const [notes, setNotes] = useState('');

  // Reschedule & Cancel state
  const [reason, setReason] = useState('');
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleStartTime, setRescheduleStartTime] = useState('14:00');
  const [rescheduleEndTime, setRescheduleEndTime] = useState('16:00');
  const [rescheduleRoomId, setRescheduleRoomId] = useState('');

  // Conflict & Assistant state
  const [conflictResult, setConflictResult] = useState<ReturnType<typeof detectSessionConflicts>>({
    hasConflict: false,
    conflicts: [],
    suggestions: [],
  });
  const [showSmartAssistant, setShowSmartAssistant] = useState<boolean>(false);
  const [desiredDurationHours, setDesiredDurationHours] = useState<number>(2);
  const [assistantAppliedMsg, setAssistantAppliedMsg] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isRecurring, setIsRecurring] = useState<boolean>(false);
  const [repeatWeeks, setRepeatWeeks] = useState<number>(12);

  const conflictBoxRef = useRef<HTMLDivElement>(null);

  const resolveGroupsForCourse = (crsId: string, fallbackFiliereId?: string): string[] => {
    const crs = courses.find((c) => c.id === crsId);
    if (crs && crs.groupIds && crs.groupIds.length > 0) {
      const existingCourseGroups = crs.groupIds.filter((gid) =>
        groups.some((grp) => grp.id === gid)
      );
      if (existingCourseGroups.length > 0) return existingCourseGroups;
    }

    const targetFilId =
      crs?.filiereId && crs.filiereId !== 'ALL'
        ? crs.filiereId
        : fallbackFiliereId && fallbackFiliereId !== 'ALL'
        ? fallbackFiliereId
        : undefined;

    if (targetFilId) {
      const targetFilObj = filieres.find((f) => f.id === targetFilId);
      const targetFilCode = targetFilObj?.code?.trim().toUpperCase();

      const matchingLevel = groups.filter(
        (g) => g.filiereId === targetFilId && (!crs?.level || g.level === crs.level)
      );
      if (matchingLevel.length > 0) return [matchingLevel[0].id];

      const matchingFiliere = groups.filter((g) => g.filiereId === targetFilId);
      if (matchingFiliere.length > 0) return [matchingFiliere[0].id];

      if (targetFilCode) {
        const prefixMatch = groups.filter((g) => {
          const c = g.code.toUpperCase();
          return (
            c.startsWith(targetFilCode) ||
            (targetFilCode === 'DTA' && c.startsWith('D1')) ||
            (targetFilCode === 'GAE' && c.startsWith('G1'))
          );
        });
        if (prefixMatch.length > 0) return [prefixMatch[0].id];
      }
    }

    return groups[0] ? [groups[0].id] : [];
  };

  // Initialize form when opened or mode changed
  useEffect(() => {
    setFormError(null);
    setAssistantAppliedMsg(null);
    setShowOtherFiliereGroups(false);
    if (sessionToEdit) {
      const editCourse = courses.find((c) => c.id === sessionToEdit.courseId);
      setModalFiliereId(editCourse?.filiereId || 'ALL');
      setSessionType(sessionToEdit.sessionType || 'COURSE');
      setEventTitle(sessionToEdit.eventTitle || '');
      setEventSpeaker(sessionToEdit.eventSpeaker || '');
      setEventCategoryLabel(sessionToEdit.eventCategoryLabel || '');
      setCourseId(sessionToEdit.courseId);
      setTeacherId(sessionToEdit.teacherId);
      setGroupIds(sessionToEdit.groupIds);
      setRoomId(sessionToEdit.roomId);
      setDate(sessionToEdit.date);
      setStartTime(sessionToEdit.startTime);
      setEndTime(sessionToEdit.endTime);
      setNotes(sessionToEdit.notes || '');

      setRescheduleDate(sessionToEdit.date);
      setRescheduleStartTime(sessionToEdit.startTime);
      setRescheduleEndTime(sessionToEdit.endTime);
      setRescheduleRoomId(sessionToEdit.roomId);
    } else {
      // Read active filiere filter from TimetableGrid if set
      let activeTimetableFiliere = 'ALL';
      try {
        const raw = localStorage.getItem(`ebm_timetable_filters_v2_${currentUser?.id}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.filiereId && parsed.filiereId !== 'ALL') {
            activeTimetableFiliere = parsed.filiereId;
          }
        }
      } catch {
        // Ignore
      }

      setModalFiliereId(activeTimetableFiliere);
      const candidateCourses =
        activeTimetableFiliere !== 'ALL'
          ? courses.filter((c) => c.filiereId === activeTimetableFiliere)
          : courses;
      const defaultCourse = candidateCourses[0] || courses[0];

      setSessionType('COURSE');
      setEventTitle('');
      setEventSpeaker('');
      setEventCategoryLabel('');
      setCourseId(defaultCourse?.id || '');
      setTeacherId(defaultCourse?.teacherIds[0] || teachers[0]?.id || '');
      setGroupIds(resolveGroupsForCourse(defaultCourse?.id || '', activeTimetableFiliere));
      setRoomId(rooms[0]?.id || '');

      const defaultDateStr = getDefaultPlanningDateStr();
      setDate(defaultDateStr);
      setStartTime('08:30');
      setEndTime('10:30');
      setNotes('');
      setReason('');
    }
  }, [sessionToEdit, isOpen]);

  // Real-time conflict detection effect (for CREATE, EDIT, and RESCHEDULE) with light debounce for fluid UI
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mode === 'RESCHEDULE' && sessionToEdit && rescheduleDate && rescheduleStartTime && rescheduleEndTime) {
        const result = detectSessionConflicts(
          {
            id: sessionToEdit.id,
            courseId: sessionToEdit.courseId,
            teacherId: sessionToEdit.teacherId,
            groupIds: sessionToEdit.groupIds,
            roomId: rescheduleRoomId || sessionToEdit.roomId,
            date: rescheduleDate,
            startTime: rescheduleStartTime,
            endTime: rescheduleEndTime,
          },
          sessions,
          rooms,
          groups,
          users,
          {
            scheduleSettings: appSettings.scheduleSettings,
            courses,
            filieres,
          }
        );
        setConflictResult(result);
        return;
      }

      const validActivity = sessionType === 'COURSE' ? Boolean(courseId) : Boolean(eventTitle.trim());
      if ((mode === 'CREATE' || mode === 'EDIT') && validActivity && roomId && date && startTime && endTime) {
        const result = detectSessionConflicts(
          {
            id: sessionToEdit?.id,
            courseId: sessionType === 'COURSE' ? courseId : `EVENT-${sessionType}`,
            teacherId: teacherId || 'EXTERNAL_SPEAKER',
            groupIds,
            roomId,
            date,
            startTime,
            endTime,
          },
          sessions,
          rooms,
          groups,
          users,
          {
            scheduleSettings: appSettings.scheduleSettings,
            courses,
            filieres,
          }
        );
        setConflictResult(result);
      } else {
        setConflictResult({ hasConflict: false, conflicts: [], suggestions: [] });
      }
    }, 60);

    return () => clearTimeout(timer);
  }, [
    sessionType,
    eventTitle,
    courseId,
    teacherId,
    groupIds,
    roomId,
    date,
    startTime,
    endTime,
    rescheduleDate,
    rescheduleStartTime,
    rescheduleEndTime,
    rescheduleRoomId,
    mode,
    sessionToEdit?.id,
    sessionToEdit?.courseId,
    sessionToEdit?.teacherId,
    sessionToEdit?.groupIds,
    sessionToEdit?.roomId,
    sessions,
    rooms,
    groups,
    users,
    appSettings.scheduleSettings,
  ]);

  // Handle course change auto-populating teacher & group defaults strictly within the course's filiere
  const handleCourseChange = (newCourseId: string) => {
    setCourseId(newCourseId);
    const crs = courses.find((c) => c.id === newCourseId);
    if (crs) {
      if (crs.teacherIds && crs.teacherIds.length > 0) setTeacherId(crs.teacherIds[0]);
      setGroupIds(resolveGroupsForCourse(newCourseId, crs.filiereId));
      setShowOtherFiliereGroups(false);
    }
  };

  const handleModalFiliereChange = (newFilId: string) => {
    setModalFiliereId(newFilId);
    setShowOtherFiliereGroups(false);
    const matchingCourses =
      newFilId === 'ALL' ? courses : courses.filter((c) => c.filiereId === newFilId);
    if (matchingCourses.length > 0) {
      const firstCrs = matchingCourses[0];
      setCourseId(firstCrs.id);
      if (firstCrs.teacherIds && firstCrs.teacherIds.length > 0) setTeacherId(firstCrs.teacherIds[0]);
      setGroupIds(resolveGroupsForCourse(firstCrs.id, newFilId));
    } else if (newFilId !== 'ALL') {
      const filObj = filieres.find((f) => f.id === newFilId);
      const filCode = filObj?.code?.trim().toUpperCase();
      const filGroups = groups.filter((g) => {
        if (g.filiereId === newFilId) return true;
        if (filCode) {
          const c = g.code.toUpperCase();
          return (
            c.startsWith(filCode) ||
            (filCode === 'DTA' && c.startsWith('D1')) ||
            (filCode === 'GAE' && c.startsWith('G1'))
          );
        }
        return false;
      });
      if (filGroups.length > 0) setGroupIds([filGroups[0].id]);
    }
  };

  const selectedCourseObj = useMemo(
    () => courses.find((c) => c.id === courseId),
    [courses, courseId]
  );

  const activeFiliereIdForGroups = useMemo(() => {
    if (modalFiliereId !== 'ALL') return modalFiliereId;
    if (sessionType === 'COURSE' && selectedCourseObj?.filiereId) {
      return selectedCourseObj.filiereId;
    }
    return null;
  }, [modalFiliereId, sessionType, selectedCourseObj?.filiereId]);

  // Filter groups: when a filière is selected, ONLY show groups belonging to that filière in primary list
  const { primaryFiliereGroups, otherFiliereGroups } = useMemo(() => {
    if (activeFiliereIdForGroups && activeFiliereIdForGroups !== 'ALL') {
      const activeFilObj = filieres.find((f) => f.id === activeFiliereIdForGroups);
      const activeFilCode = activeFilObj?.code?.trim().toUpperCase();

      const matching = groups.filter((g) => {
        if (g.filiereId === activeFiliereIdForGroups) return true;
        if (activeFilCode) {
          const c = g.code.toUpperCase();
          if (
            c.startsWith(activeFilCode) ||
            (activeFilCode === 'DTA' && c.startsWith('D1')) ||
            (activeFilCode === 'GAE' && c.startsWith('G1')) ||
            g.name.toUpperCase().includes(activeFilCode)
          ) {
            return true;
          }
        }
        return false;
      });

      const remaining = groups.filter((g) => !matching.some((m) => m.id === g.id));

      if (matching.length === 0) {
        return {
          primaryFiliereGroups: groups,
          otherFiliereGroups: [],
        };
      }

      return {
        primaryFiliereGroups: matching.sort((a, b) => a.code.localeCompare(b.code)),
        otherFiliereGroups: remaining.sort((a, b) => a.code.localeCompare(b.code)),
      };
    }

    return {
      primaryFiliereGroups: groups.slice().sort((a, b) => a.code.localeCompare(b.code)),
      otherFiliereGroups: [],
    };
  }, [groups, filieres, activeFiliereIdForGroups]);

  const filteredModalCourses = useMemo(() => {
    return modalFiliereId === 'ALL'
      ? courses
      : courses.filter((c) => c.filiereId === modalFiliereId);
  }, [courses, modalFiliereId]);

  const toggleGroupSelection = (gid: string) => {
    setGroupIds((prev) => {
      if (prev.includes(gid)) {
        return prev.length > 1 ? prev.filter((id) => id !== gid) : prev;
      }
      return [...prev, gid];
    });
  };

  const calculateDuration = (start: string, end: string) => {
    const [sH, sM] = start.split(':').map(Number);
    const [eH, eM] = end.split(':').map(Number);
    return Number(((eH * 60 + eM - (sH * 60 + sM)) / 60).toFixed(2));
  };

  const currentDurationHours = calculateDuration(startTime, endTime);

  // Find if there is a previous session on the same day for the selected group(s) or teacher to offer a 1-click "+15 min pause" start
  const previousDaySessionEnd = useMemo(() => {
    if (!date) return null;
    const sameDaySessions = sessions.filter(
      (s) =>
        s.date === date &&
        s.status !== 'CANCELLED' &&
        s.id !== sessionToEdit?.id &&
        (s.teacherId === teacherId || s.groupIds.some((gid) => groupIds.includes(gid)))
    );
    if (sameDaySessions.length === 0) return null;
    const sorted = [...sameDaySessions].sort((a, b) => b.endTime.localeCompare(a.endTime));
    const latestEnd = sorted[0].endTime;
    const [h, m] = latestEnd.split(':').map(Number);
    const afterBreakTotal = h * 60 + m + 15;
    if (afterBreakTotal >= 18 * 60) return null;
    const nextStart = `${String(Math.floor(afterBreakTotal / 60)).padStart(2, '0')}:${String(
      afterBreakTotal % 60
    ).padStart(2, '0')}`;
    const durMin = Math.max(60, Math.round((currentDurationHours > 0 ? currentDurationHours : 2) * 60));
    const nextEndTotal = Math.min(18 * 60, afterBreakTotal + durMin);
    const nextEnd = `${String(Math.floor(nextEndTotal / 60)).padStart(2, '0')}:${String(
      nextEndTotal % 60
    ).padStart(2, '0')}`;
    return {
      previousEnd: latestEnd,
      suggestedStart: nextStart,
      suggestedEnd: nextEnd,
    };
  }, [date, sessions, sessionToEdit?.id, teacherId, groupIds, currentDurationHours]);

  // Smart Scheduling Assistant: Compute best available (date, startTime, endTime, room) slots efficiently
  const smartRecommendedSlots = useMemo(() => {
    if (!showSmartAssistant) return [];

    const selectedTeacherObj = users.find((u) => u.id === teacherId);
    const totalStudentsNeeded = groupIds.reduce((sum, gid) => {
      const grp = groups.find((g) => g.id === gid);
      return sum + (grp?.studentCount || 25);
    }, 0);

    const compatibleRooms = rooms.filter((r) => r.capacity >= Math.max(15, totalStudentsNeeded));
    const candidateRooms = (compatibleRooms.length > 0 ? compatibleRooms : rooms)
      .slice()
      .sort((a, b) => a.capacity - b.capacity)
      .slice(0, 3); // Test top 3 closest capacity rooms for high performance

    const baseDate = date ? new Date(date) : new Date();
    const dayOfWeek = baseDate.getDay();
    const diffToMonday = (dayOfWeek + 6) % 7;
    const monday = new Date(baseDate);
    monday.setDate(baseDate.getDate() - diffToMonday);

    const mondayStr = getAntananarivoDateStr(monday);
    const satObj = new Date(monday);
    satObj.setDate(monday.getDate() + 5);
    const satStr = getAntananarivoDateStr(satObj);

    // Filter relevant sessions for this week only - shrinks search space by 90%+
    const weekSessions = sessions.filter(
      (s) => s.status !== 'CANCELLED' && s.date >= mondayStr && s.date <= satStr
    );

    const dayNamesFr = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const candidateTimeStarts = ['07:00', '08:00', '09:00', '10:00', '13:30', '14:00', '15:00'];

    const recommendations: Array<{
      date: string;
      dayLabel: string;
      startTime: string;
      endTime: string;
      roomId: string;
      roomName: string;
      roomCapacity: number;
      teacherDeclaredAvailable: boolean;
    }> = [];

    for (let dIdx = 0; dIdx < 6; dIdx++) {
      const dObj = new Date(monday);
      dObj.setDate(monday.getDate() + dIdx);
      const dStr = getAntananarivoDateStr(dObj);
      const dayName = dayNamesFr[dIdx];

      for (const st of candidateTimeStarts) {
        const [sH, sM] = st.split(':').map(Number);
        const endMinutes = sH * 60 + sM + desiredDurationHours * 60;
        if (endMinutes > 18 * 60) continue;
        const eH = String(Math.floor(endMinutes / 60)).padStart(2, '0');
        const eM = String(endMinutes % 60).padStart(2, '0');
        const et = `${eH}:${eM}`;

        // Check if teacher declared availability covers this slot
        const teacherAvail =
          selectedTeacherObj?.availabilities && selectedTeacherObj.availabilities.length > 0
            ? selectedTeacherObj.availabilities.some(
                (av) =>
                  av.day === dayName &&
                  (av.startTime || '07:00') <= st &&
                  (av.endTime || '17:00') >= et
              )
            : true;

        for (const rm of candidateRooms) {
          const check = detectSessionConflicts(
            {
              id: sessionToEdit?.id,
              courseId: sessionType === 'COURSE' ? courseId : `EVENT-${sessionType}`,
              teacherId: teacherId || 'EXTERNAL_SPEAKER',
              groupIds,
              roomId: rm.id,
              date: dStr,
              startTime: st,
              endTime: et,
            },
            weekSessions,
            rooms,
            groups,
            users,
            {
              scheduleSettings: appSettings.scheduleSettings,
            }
          );

          if (!check.hasConflict) {
            recommendations.push({
              date: dStr,
              dayLabel: `${dayName} ${dObj.toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: 'short',
              })}`,
              startTime: st,
              endTime: et,
              roomId: rm.id,
              roomName: rm.name,
              roomCapacity: rm.capacity,
              teacherDeclaredAvailable: teacherAvail,
            });
            break; // One best room per time slot is enough to keep suggestions diverse
          }
        }
        if (recommendations.length >= 6) break;
      }
      if (recommendations.length >= 6) break;
    }

    // Prioritize slots where teacher explicitly declared availability
    return recommendations
      .sort((a, b) => Number(b.teacherDeclaredAvailable) - Number(a.teacherDeclaredAvailable))
      .slice(0, 6);
  }, [
    showSmartAssistant,
    date,
    desiredDurationHours,
    teacherId,
    groupIds,
    rooms,
    sessions,
    users,
    appSettings.scheduleSettings,
    courseId,
    sessionType,
    sessionToEdit?.id,
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (mode === 'CANCEL') {
      if (!sessionToEdit || !reason.trim()) {
        setFormError('Le motif d’annulation est obligatoire.');
        return;
      }
      cancelSession(sessionToEdit.id, reason.trim());
      onClose();
      return;
    }

    if (mode === 'RESCHEDULE') {
      if (!sessionToEdit || !reason.trim()) {
        setFormError('Le motif de report est obligatoire.');
        return;
      }
      if (rescheduleStartTime >= rescheduleEndTime) {
        setFormError(
          'L’heure de fin du report doit être strictement postérieure à l’heure de début.'
        );
        return;
      }
      const res = rescheduleSession(
        sessionToEdit.id,
        rescheduleDate,
        rescheduleStartTime,
        rescheduleEndTime,
        rescheduleRoomId || sessionToEdit.roomId,
        reason.trim()
      );
      if (!res.success) {
        setFormError(`Impossible de reporter la séance : ${res.error}`);
        return;
      }
      onClose();
      return;
    }

    // CREATE or EDIT
    if (startTime >= endTime) {
      setFormError('L’heure de fin doit être strictement postérieure à l’heure de début.');
      return;
    }
    const durationHours = calculateDuration(startTime, endTime);
    if (!Number.isFinite(durationHours) || durationHours <= 0) {
      setFormError('Plage horaire invalide : la durée de la séance doit être strictement positive.');
      return;
    }
    const isCustomEvent = sessionType !== 'COURSE';

    if (isCustomEvent && !eventTitle.trim()) {
      setFormError('Veuillez saisir le titre de la conférence ou de l’événement.');
      return;
    }

    if (groupIds.length === 0) {
      setFormError('Veuillez sélectionner au moins un groupe d’étudiants.');
      return;
    }

    if (mode === 'CREATE') {
      const totalOccurrences = isRecurring ? Math.max(2, Math.min(20, repeatWeeks)) : 1;
      let createdCount = 0;
      const skippedReasons: string[] = [];

      for (let w = 0; w < totalOccurrences; w++) {
        const targetDateObj = new Date(date);
        targetDateObj.setDate(targetDateObj.getDate() + w * 7);
        const targetDateStr = w === 0 ? date : getAntananarivoDateStr(targetDateObj);

        const res = addSession({
          courseId: isCustomEvent ? `EVENT-${sessionType}` : courseId,
          sessionType,
          eventTitle: isCustomEvent ? eventTitle.trim() : undefined,
          eventSpeaker: isCustomEvent ? eventSpeaker.trim() : undefined,
          eventCategoryLabel:
            sessionType === 'AUTRE_EVENEMENT' && eventCategoryLabel.trim()
              ? eventCategoryLabel.trim()
              : undefined,
          teacherId: teacherId || 'EXTERNAL_SPEAKER',
          groupIds,
          roomId,
          date: targetDateStr,
          startTime,
          endTime,
          durationHours,
          status: 'PUBLISHED',
          notes: isRecurring
            ? `${notes ? notes + ' · ' : ''}Séance récurrente (${w + 1}/${totalOccurrences})`
            : notes,
        });

        if (!res.success) {
          if (w === 0 && !isRecurring) {
            setFormError(`Impossible d’enregistrer : ${res.error}`);
            showAppToast({
              type: 'error',
              title: 'Création refusée (Conflit)',
              message: res.error,
            });
            return;
          }
          skippedReasons.push(`${targetDateStr} : ${res.error}`);
        } else {
          createdCount += 1;
        }
      }

      if (createdCount === 0) {
        setFormError(
          `Aucune séance n'a pu être planifiée : ${skippedReasons[0] || 'Conflit détecté'}`
        );
        return;
      }

      showAppToast({
        type: skippedReasons.length > 0 ? 'warning' : 'success',
        title:
          totalOccurrences > 1
            ? `${createdCount}/${totalOccurrences} séances récurrentes planifiées`
            : 'Séance planifiée avec succès',
        message:
          skippedReasons.length > 0
            ? `${skippedReasons.length} semaine(s) ignorée(s) pour conflit (${skippedReasons[0]}).`
            : `Créneau ${startTime} - ${endTime} enregistré dans l'emploi du temps.`,
      });
    } else if (mode === 'EDIT' && sessionToEdit) {
      const res = updateSession(
        sessionToEdit.id,
        {
          courseId: isCustomEvent ? `EVENT-${sessionType}` : courseId,
          sessionType,
          eventTitle: isCustomEvent ? eventTitle.trim() : undefined,
          eventSpeaker: isCustomEvent ? eventSpeaker.trim() : undefined,
          eventCategoryLabel:
            sessionType === 'AUTRE_EVENEMENT' && eventCategoryLabel.trim()
              ? eventCategoryLabel.trim()
              : undefined,
          teacherId: teacherId || 'EXTERNAL_SPEAKER',
          groupIds,
          roomId,
          date,
          startTime,
          endTime,
          durationHours,
          notes,
        },
        'Modification planifiée'
      );
      if (!res.success) {
        setFormError(`Impossible de modifier la séance : ${res.error}`);
        showAppToast({
          type: 'error',
          title: 'Modification refusée',
          message: res.error,
        });
        return;
      }
      showAppToast({
        type: 'success',
        title: 'Séance mise à jour',
        message: `Modifications enregistrées pour le ${date} (${startTime} - ${endTime}).`,
      });
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Modal Container constrained to 90vh with Fixed Header, Scrollable Body, and Fixed Footer */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92dvh] sm:max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-150"
      >
        {/* 1. FIXED / STICKY HEADER (Always visible) */}
        <div className="shrink-0 bg-white px-4 sm:px-6 py-3.5 border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`p-2 rounded-xl text-white shrink-0 ${
                mode === 'CANCEL'
                  ? 'bg-red-600'
                  : mode === 'RESCHEDULE'
                  ? 'bg-amber-600'
                  : 'bg-[#17345B]'
              }`}
            >
              {mode === 'CANCEL' ? (
                <Ban className="w-5 h-5" />
              ) : mode === 'RESCHEDULE' ? (
                <RotateCcw className="w-5 h-5" />
              ) : (
                <Calendar className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                {mode === 'CREATE' && 'Planifier un Cours, une Conférence ou un Événement'}
                {mode === 'EDIT' && 'Modifier la séance ou l’événement'}
                {mode === 'RESCHEDULE' && 'Reporter la séance'}
                {mode === 'CANCEL' && 'Annuler la séance (Notification automatique)'}
              </h3>
              <p className="text-[11px] text-slate-500 truncate">
                {mode === 'CANCEL'
                  ? 'Déclenche des notifications automatiques aux étudiants et à l’enseignant'
                  : 'Insertion directe dans l’emploi du temps avec contrôle temps réel des conflits'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
            title="Fermer la fenêtre"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. SCROLLABLE FORM BODY (Vertical scroll, never clipped) */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-6 py-4 space-y-3.5">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-900 font-semibold flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="whitespace-normal break-words">{formError}</span>
            </div>
          )}

          {/* MODE: CANCEL */}
          {mode === 'CANCEL' && (
            <div className="space-y-3">
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
                <p className="font-semibold mb-1">
                  Attention : Vous vous apprêtez à annuler cette séance.
                </p>
                <p>
                  Les étudiants concernés ainsi que l’enseignant recevront immédiatement une
                  notification Push Android et une alerte sur le portail Web.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Motif d'annulation *
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ex: Absence maladie de l'enseignant, maintenance de la salle, intempéries..."
                  rows={3}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:bg-white"
                  required
                />
              </div>
            </div>
          )}

          {/* MODE: RESCHEDULE */}
          {mode === 'RESCHEDULE' && (
            <div className="space-y-3.5">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                <span className="font-semibold block mb-0.5">Report officiel de séance</span>
                L'ancienne date ({sessionToEdit?.date} à {sessionToEdit?.startTime}) sera conservée
                dans l'historique et transmise aux étudiants via notification Push.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Nouvelle date *
                  </label>
                  <input
                    type="date"
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Nouvelle salle
                  </label>
                  <select
                    value={rescheduleRoomId}
                    onChange={(e) => setRescheduleRoomId(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm"
                  >
                    {sortedRooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.capacity} pl.)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Début (15 mn)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const [sH, sM] = rescheduleStartTime.split(':').map(Number);
                        const durMin = Math.max(
                          30,
                          Math.round(calculateDuration(rescheduleStartTime, rescheduleEndTime) * 60) || 120
                        );
                        const newStartMin = Math.min(17 * 60 + 45, sH * 60 + sM + 15);
                        const newEndMin = Math.min(18 * 60, newStartMin + durMin);
                        setRescheduleStartTime(
                          `${String(Math.floor(newStartMin / 60)).padStart(2, '0')}:${String(
                            newStartMin % 60
                          ).padStart(2, '0')}`
                        );
                        setRescheduleEndTime(
                          `${String(Math.floor(newEndMin / 60)).padStart(2, '0')}:${String(
                            newEndMin % 60
                          ).padStart(2, '0')}`
                        );
                      }}
                      className="text-[10px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-1.5 py-0.5 rounded cursor-pointer"
                    >
                      +15 min pause
                    </button>
                  </div>
                  <select
                    value={rescheduleStartTime}
                    onChange={(e) => {
                      const st = e.target.value;
                      const durMin = Math.max(
                        30,
                        Math.round(calculateDuration(rescheduleStartTime, rescheduleEndTime) * 60) || 120
                      );
                      setRescheduleStartTime(st);
                      const [h, m] = st.split(':').map(Number);
                      const endMin = Math.min(18 * 60, h * 60 + m + durMin);
                      setRescheduleEndTime(
                        `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(
                          endMin % 60
                        ).padStart(2, '0')}`
                      );
                    }}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-mono font-bold"
                    required
                  >
                    {configurableTimeSlots.slice(0, -1).map((slot) => (
                      <option key={`resc-start-${slot}`} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Fin (15 mn)
                  </label>
                  <select
                    value={rescheduleEndTime}
                    onChange={(e) => setRescheduleEndTime(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-mono font-bold"
                    required
                  >
                    {configurableTimeSlots
                      .filter((slot) => slot > rescheduleStartTime)
                      .map((slot) => (
                        <option key={`resc-end-${slot}`} value={slot}>
                          {slot}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Motif du report *
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ex: Participation jury académique, demande des délégués..."
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm"
                  required
                />
              </div>

              {/* Conflict Alert Box for Reschedule */}
              {conflictResult.hasConflict && (
                <div
                  ref={conflictBoxRef}
                  className="p-3.5 bg-red-50 border border-red-300 rounded-xl text-xs space-y-2"
                >
                  <div className="flex items-center gap-2 text-red-800 font-bold">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>Conflit détecté sur le nouveau créneau :</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-red-700 whitespace-normal break-words">
                    {conflictResult.conflicts.map((c, i) => (
                      <li key={i} className="leading-relaxed">
                        {c.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* MODE: CREATE OR EDIT */}
          {(mode === 'CREATE' || mode === 'EDIT') && (
            <>
              {/* 1. Type d'activité */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                  Type d'activité à planifier *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 text-xs">
                  {[
                    { id: 'COURSE', label: '📚 Cours' },
                    { id: 'CONFERENCE', label: '🎤 Conférence' },
                    { id: 'SEMINAIRE', label: '🏛️ Séminaire' },
                    { id: 'SOUTENANCE', label: '🎓 Soutenance' },
                    { id: 'EXAMEN', label: '📝 Examen' },
                    { id: 'AUTRE_EVENEMENT', label: '📌 Autre' },
                  ].map((typeOpt) => (
                    <button
                      key={typeOpt.id}
                      type="button"
                      onClick={() => setSessionType(typeOpt.id as SessionActivityType)}
                      className={`px-2.5 py-1.5 rounded-xl font-bold text-center border transition-all cursor-pointer truncate ${
                        sessionType === typeOpt.id
                          ? 'bg-[#17345B] text-white border-[#17345B] shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                      title={typeOpt.label}
                    >
                      {typeOpt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Filière, Matière / Événement & Enseignant */}
              {sessionType === 'COURSE' ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Filière / Mention
                      </label>
                      <select
                        value={modalFiliereId}
                        onChange={(e) => handleModalFiliereChange(e.target.value)}
                        className="w-full h-10 px-3 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs sm:text-sm font-bold text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                      >
                        <option value="ALL">Toutes les filières ({courses.length} cours)</option>
                        {filieres.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.code} — {f.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Matière / Cours *
                      </label>
                      <select
                        value={courseId}
                        onChange={(e) => handleCourseChange(e.target.value)}
                        className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                        required
                      >
                        {(filteredModalCourses.length > 0 ? filteredModalCourses : courses).map((c) => {
                          const fil = filieres.find((f) => f.id === c.filiereId);
                          return (
                            <option key={c.id} value={c.id}>
                              {fil ? `[${fil.code}] ` : ''}
                              {c.code} - {c.title} ({c.totalHours}h)
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Enseignant responsable *
                      </label>
                      <select
                        value={teacherId}
                        onChange={(e) => setTeacherId(e.target.value)}
                        className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                        required
                      >
                        {teachers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 p-3 bg-purple-50/60 border border-purple-200 rounded-xl">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className={sessionType === 'AUTRE_EVENEMENT' ? '' : 'sm:col-span-2'}>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-purple-900 mb-1">
                        Intitulé de la conférence / événement *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Conférence sur l'Entrepreneuriat & FinTech à Madagascar"
                        value={eventTitle}
                        onChange={(e) => setEventTitle(e.target.value)}
                        className="w-full h-10 px-3 bg-white border border-purple-300 rounded-xl text-xs sm:text-sm font-bold text-slate-900"
                      />
                    </div>

                    {sessionType === 'AUTRE_EVENEMENT' && (
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-purple-900 mb-1">
                          Catégorie personnalisée
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: Forum Entreprises, Visite d'étude..."
                          value={eventCategoryLabel}
                          onChange={(e) => setEventCategoryLabel(e.target.value)}
                          className="w-full h-10 px-3 bg-white border border-purple-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-800"
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-purple-900 mb-1">
                        Intervenant(e) / Conférencier
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: M. Tahiry Rakotoarisoa (DG FinTech Mada)"
                        value={eventSpeaker}
                        onChange={(e) => setEventSpeaker(e.target.value)}
                        className="w-full h-10 px-3 bg-white border border-purple-300 rounded-xl text-xs font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-purple-900 mb-1">
                        Enseignant référent / Modérateur (optionnel)
                      </label>
                      <select
                        value={teacherId}
                        onChange={(e) => setTeacherId(e.target.value)}
                        className="w-full h-10 px-3 bg-white border border-purple-300 rounded-xl text-xs"
                      >
                        <option value="EXTERNAL_SPEAKER">-- Intervenant externe uniquement --</option>
                        {teachers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. Groupe(s) d'étudiants & Salle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                <div>
                  <div className="flex items-center justify-between mb-1 gap-1">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                      Groupe(s) d'étudiants *{' '}
                      {activeFiliereIdForGroups && activeFiliereIdForGroups !== 'ALL' && (
                        <span className="text-indigo-700 font-extrabold">
                          ({filieres.find((f) => f.id === activeFiliereIdForGroups)?.code || activeFiliereIdForGroups})
                        </span>
                      )}
                    </label>
                    <div className="flex items-center gap-1.5">
                      {otherFiliereGroups.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowOtherFiliereGroups((v) => !v)}
                          className="text-[10px] font-bold text-indigo-700 hover:text-indigo-900 hover:underline cursor-pointer"
                        >
                          {showOtherFiliereGroups ? 'Filière uniquement' : '+ Autres filières'}
                        </button>
                      )}
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                        {groupIds.length} sélectionné(s)
                      </span>
                    </div>
                  </div>

                  {/* Interactive Group Chips (Strictly filtered by the active filiere) */}
                  <div className="flex flex-wrap gap-1 mb-1.5 max-h-24 overflow-y-auto p-1.5 bg-slate-50 border border-slate-200 rounded-xl">
                    {primaryFiliereGroups.map((g) => {
                      const active = groupIds.includes(g.id);
                      return (
                        <button
                          key={`chip-${g.id}`}
                          type="button"
                          onClick={() => toggleGroupSelection(g.id)}
                          className={`px-2 py-1 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 border transition-colors cursor-pointer ${
                            active
                              ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {active && <Check className="w-3 h-3 shrink-0" />}
                          <span>
                            {g.code} ({g.studentCount})
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {otherFiliereGroups.length > 0 && (
                    <div className="mb-1">
                      <button
                        type="button"
                        onClick={() => setShowOtherFiliereGroups((v) => !v)}
                        className="text-[10px] font-semibold text-indigo-700 hover:underline cursor-pointer"
                      >
                        {showOtherFiliereGroups
                          ? 'Masquer les groupes des autres filières'
                          : '+ Afficher les groupes des autres filières (Tronc commun)'}
                      </button>
                      {showOtherFiliereGroups && (
                        <div className="flex flex-wrap gap-1 mt-1 p-1.5 bg-indigo-50/40 border border-indigo-200 rounded-xl">
                          {otherFiliereGroups.map((g) => {
                            const active = groupIds.includes(g.id);
                            const filCode = filieres.find((f) => f.id === g.filiereId)?.code;
                            return (
                              <button
                                key={`other-chip-${g.id}`}
                                type="button"
                                onClick={() => toggleGroupSelection(g.id)}
                                className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold inline-flex items-center gap-1 border transition-colors cursor-pointer ${
                                  active
                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                {active && <Check className="w-2.5 h-2.5 shrink-0" />}
                                <span>
                                  {filCode ? `[${filCode}] ` : ''}{g.code} ({g.studentCount})
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Native multiple select preserved for accessibility & keyboard selection */}
                  <select
                    multiple
                    value={groupIds}
                    onChange={(e) => {
                      const selected = Array.from(
                        e.target.selectedOptions,
                        (option) => option.value
                      );
                      if (selected.length > 0) setGroupIds(selected);
                    }}
                    className="sr-only"
                    aria-label="Sélection multiple des groupes d'étudiants"
                  >
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.code} ({g.studentCount} étudiants)
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-slate-500 block">
                    {activeFiliereIdForGroups && activeFiliereIdForGroups !== 'ALL'
                      ? `Affichage exclusif des groupes de la mention sélectionnée (${primaryFiliereGroups.length} groupe(s)).`
                      : `Sélectionnez un ou plusieurs groupes d'étudiants.`}
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Salle de cours / Labo *
                  </label>
                  <select
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    required
                  >
                    {sortedRooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.capacity} pl.{r.status === 'maintenance' ? ' - Maintenance' : ''})
                      </option>
                    ))}
                  </select>
                  <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500 px-1">
                    <span>
                      Effectif total :{' '}
                      <strong className="text-slate-800">
                        {groupIds.reduce(
                          (sum, gid) =>
                            sum + (groups.find((g) => g.id === gid)?.studentCount || 0),
                          0
                        )}{' '}
                        étudiants
                      </strong>
                    </span>
                    <span>
                      Capacité salle :{' '}
                      <strong className="text-slate-800">
                        {sortedRooms.find((r) => r.id === roomId)?.capacity || 0} places
                      </strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* 4. Date, Heure de début (pas de 15 min / 1/4 d'heure), Heure de fin */}
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Date *
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      required
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                        Heure début (15 mn)
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const [sH, sM] = startTime.split(':').map(Number);
                          const durMin = Math.max(
                            30,
                            Math.round((currentDurationHours > 0 ? currentDurationHours : 2) * 60)
                          );
                          const newStartMin = Math.min(17 * 60 + 45, sH * 60 + sM + 15);
                          const newEndMin = Math.min(18 * 60, newStartMin + durMin);
                          setStartTime(
                            `${String(Math.floor(newStartMin / 60)).padStart(2, '0')}:${String(
                              newStartMin % 60
                            ).padStart(2, '0')}`
                          );
                          setEndTime(
                            `${String(Math.floor(newEndMin / 60)).padStart(2, '0')}:${String(
                              newEndMin % 60
                            ).padStart(2, '0')}`
                          );
                        }}
                        title="Décaler le début de +15 minutes (pause d'un quart d'heure)"
                        className="text-[10px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                      >
                        +15 min pause
                      </button>
                    </div>
                    <select
                      value={startTime}
                      onChange={(e) => {
                        const st = e.target.value;
                        const preservedMinutes = Math.max(
                          30,
                          Math.round((currentDurationHours > 0 ? currentDurationHours : 2) * 60)
                        );
                        setStartTime(st);
                        const [h, m] = st.split(':').map(Number);
                        const endMinutes = Math.min(18 * 60, h * 60 + m + preservedMinutes);
                        const endH = String(Math.floor(endMinutes / 60)).padStart(2, '0');
                        const endM = String(endMinutes % 60).padStart(2, '0');
                        setEndTime(`${endH}:${endM}`);
                      }}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      required
                    >
                      {configurableTimeSlots.slice(0, -1).map((slot) => (
                        <option key={`create-start-${slot}`} value={slot}>
                          {slot}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                        Heure fin (15 mn)
                      </label>
                      {currentDurationHours > 0 && (
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                          {currentDurationHours}h
                        </span>
                      )}
                    </div>
                    <select
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      required
                    >
                      {configurableTimeSlots
                        .filter((slot) => slot > startTime)
                        .map((slot) => (
                          <option key={`create-end-${slot}`} value={slot}>
                            {slot}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* Quick 15-min break helper & quick duration chips */}
                <div className="flex flex-wrap items-center justify-between gap-2 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px]">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-bold text-slate-600">Durée rapide :</span>
                    {[
                      { label: '1h', min: 60 },
                      { label: '1h30', min: 90 },
                      { label: '1h45', min: 105 },
                      { label: '2h', min: 120 },
                      { label: '2h30', min: 150 },
                      { label: '3h', min: 180 },
                      { label: '4h', min: 240 },
                    ].map((d) => {
                      const isCurrent = Math.round(currentDurationHours * 60) === d.min;
                      return (
                        <button
                          key={d.label}
                          type="button"
                          onClick={() => {
                            const [h, m] = startTime.split(':').map(Number);
                            const endMin = Math.min(18 * 60, h * 60 + m + d.min);
                            setEndTime(
                              `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(
                                endMin % 60
                              ).padStart(2, '0')}`
                            );
                          }}
                          className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                            isCurrent
                              ? 'bg-indigo-600 text-white'
                              : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>

                  {previousDaySessionEnd && (
                    <button
                      type="button"
                      onClick={() => {
                        setStartTime(previousDaySessionEnd.suggestedStart);
                        setEndTime(previousDaySessionEnd.suggestedEnd);
                      }}
                      className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer transition-colors"
                      title={`Un cours se termine à ${previousDaySessionEnd.previousEnd} ce jour-là. Cliquez pour démarrer à ${previousDaySessionEnd.suggestedStart} (après 15 min de pause).`}
                    >
                      <Clock className="w-3 h-3 text-amber-700" />
                      <span>
                        Après pause 15 mn : {previousDaySessionEnd.suggestedStart} –{' '}
                        {previousDaySessionEnd.suggestedEnd} (fin cours précédent :{' '}
                        {previousDaySessionEnd.previousEnd})
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {/* 5. REAL-TIME CONFLICT ALERT BOX (Full visibility, never truncated) */}
              {conflictResult.hasConflict && (
                <div
                  ref={conflictBoxRef}
                  className="p-3.5 bg-red-50 border-2 border-red-300 rounded-xl text-xs space-y-2.5 shadow-2xs"
                >
                  <div className="flex items-center justify-between gap-2 text-red-900 font-bold">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>
                        {conflictResult.conflicts.length} conflit(s) détecté(s) avant publication :
                      </span>
                    </div>
                    <span className="text-[10px] uppercase tracking-wider bg-red-200/80 text-red-900 px-2 py-0.5 rounded-md font-extrabold">
                      Enregistrement bloqué
                    </span>
                  </div>

                  <ul className="list-disc pl-5 space-y-1.5 text-red-800 whitespace-normal break-words">
                    {conflictResult.conflicts.map((c, i) => (
                      <li key={i} className="leading-relaxed font-medium">
                        {c.message}
                      </li>
                    ))}
                  </ul>

                  {/* Assisted Scheduling Suggestions from Conflict Detector */}
                  {conflictResult.suggestions && conflictResult.suggestions.length > 0 && (
                    <div className="pt-2.5 border-t border-red-200">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5 mb-2">
                        <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>Créneaux alternatifs suggérés sans aucun conflit (1 clic) :</span>
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                        {conflictResult.suggestions.map((sug, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setDate(sug.date);
                              setStartTime(sug.startTime);
                              setEndTime(sug.endTime);
                              setRoomId(sug.roomId);
                              setAssistantAppliedMsg(
                                `Créneau sans conflit appliqué : ${sug.date} (${sug.startTime}-${sug.endTime}) en ${sug.roomName}`
                              );
                            }}
                            className="px-2.5 py-1.5 bg-white hover:bg-blue-50 text-blue-900 border border-blue-300 rounded-lg text-[11px] font-semibold text-left transition-all hover:shadow-xs cursor-pointer flex items-center justify-between gap-1"
                          >
                            <span className="truncate">
                              {sug.date} • {sug.startTime}–{sug.endTime} ({sug.roomName})
                            </span>
                            <span className="text-[10px] font-bold text-blue-600 shrink-0">
                              Choisir
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 6. COMPACT & COLLAPSIBLE SMART SCHEDULING ASSISTANT */}
              <div className="p-3 bg-gradient-to-r from-indigo-50/90 via-blue-50/90 to-slate-50 border border-indigo-200 rounded-xl space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSmartAssistant((prev) => !prev)}
                    className="flex items-center gap-2 text-left cursor-pointer group"
                  >
                    <div className="p-1.5 bg-indigo-600 text-white rounded-lg shrink-0">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-indigo-950 group-hover:text-indigo-700">
                          Assistant de Planification (Placement Intelligent)
                        </span>
                        <span className="text-[10px] font-bold bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded">
                          {showSmartAssistant
                            ? `${smartRecommendedSlots.length} créneau(x) libre(s)`
                            : 'Suggestions intelligentes'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-600 block">
                        Disponibilités enseignant, groupes d'étudiants et capacité des salles
                      </span>
                    </div>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <select
                      value={desiredDurationHours}
                      onChange={(e) => setDesiredDurationHours(Number(e.target.value))}
                      className="text-[11px] font-bold bg-white border border-indigo-200 rounded-lg px-2 py-1 text-indigo-900 cursor-pointer"
                      title="Durée souhaitée"
                    >
                      <option value={1}>Durée : 1h</option>
                      <option value={1.5}>Durée : 1h30</option>
                      <option value={2}>Durée : 2h</option>
                      <option value={3}>Durée : 3h</option>
                      <option value={4}>Durée : 4h</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowSmartAssistant((prev) => !prev)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-white hover:bg-indigo-100/70 border border-indigo-200 rounded-lg px-2.5 py-1 transition-colors cursor-pointer"
                    >
                      <span>{showSmartAssistant ? 'Masquer' : 'Afficher'}</span>
                      {showSmartAssistant ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {assistantAppliedMsg && (
                  <div className="p-2 bg-emerald-100/90 border border-emerald-300 rounded-lg text-[11px] font-bold text-emerald-900 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <span>{assistantAppliedMsg}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAssistantAppliedMsg(null)}
                      className="text-emerald-700 hover:text-emerald-950"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {showSmartAssistant && (
                  <div className="pt-1">
                    {smartRecommendedSlots.length === 0 ? (
                      <p className="text-[11px] text-slate-500 italic py-1">
                        Aucun créneau automatique libre trouvé sur cette semaine. Essayez une autre
                        date ou durée.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                        {smartRecommendedSlots.map((slot, idx) => {
                          const isCurrentlySelected =
                            date === slot.date &&
                            startTime === slot.startTime &&
                            endTime === slot.endTime &&
                            roomId === slot.roomId;

                          return (
                            <button
                              key={`${slot.date}-${slot.startTime}-${slot.roomId}-${idx}`}
                              type="button"
                              onClick={() => {
                                setDate(slot.date);
                                setStartTime(slot.startTime);
                                setEndTime(slot.endTime);
                                setRoomId(slot.roomId);
                                setAssistantAppliedMsg(
                                  `Créneau appliqué : ${slot.dayLabel} (${slot.startTime}–${slot.endTime}) en ${slot.roomName}`
                                );
                              }}
                              className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-1.5 ${
                                isCurrentlySelected
                                  ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                                  : 'bg-white hover:bg-indigo-50/70 text-slate-800 border-indigo-200/80'
                              }`}
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-1 flex-wrap">
                                  <span className="font-bold text-[11px] truncate">
                                    {slot.dayLabel}
                                  </span>
                                  {slot.teacherDeclaredAvailable && (
                                    <span
                                      className={`text-[9px] px-1 py-0.2 rounded font-bold ${
                                        isCurrentlySelected
                                          ? 'bg-emerald-400 text-slate-950'
                                          : 'bg-emerald-100 text-emerald-800'
                                      }`}
                                    >
                                      Prof Dispo
                                    </span>
                                  )}
                                </div>
                                <div
                                  className={`text-[10px] font-mono font-bold mt-0.5 truncate ${
                                    isCurrentlySelected ? 'text-indigo-100' : 'text-indigo-700'
                                  }`}
                                >
                                  {slot.startTime}–{slot.endTime} • {slot.roomName} (
                                  {slot.roomCapacity}p)
                                </div>
                              </div>
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${
                                  isCurrentlySelected
                                    ? 'bg-white text-indigo-700'
                                    : 'bg-indigo-100 text-indigo-800'
                                }`}
                              >
                                {isCurrentlySelected ? '✓' : 'Choisir'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 7. Répétition hebdomadaire & Notes de la séance */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                {mode === 'CREATE' && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isRecurring}
                          onChange={(e) => setIsRecurring(e.target.checked)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                        />
                        <span>Répéter chaque semaine</span>
                      </label>
                      {isRecurring && (
                        <select
                          value={repeatWeeks}
                          onChange={(e) => setRepeatWeeks(Number(e.target.value))}
                          className="px-2 py-1 rounded-lg border border-slate-300 bg-white font-bold text-slate-900 text-xs"
                        >
                          <option value={4}>4 semaines (1 mois)</option>
                          <option value={8}>8 semaines (Demi-semestre)</option>
                          <option value={12}>12 semaines (Semestre)</option>
                          <option value={15}>15 semaines (Complet)</option>
                        </select>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 leading-snug">
                      {isRecurring
                        ? `Planifie automatiquement ce créneau (${startTime}–${endTime}) sur ${repeatWeeks} semaines avec contrôle des conflits.`
                        : 'Cochez pour répéter automatiquement ce cours sur tout le semestre.'}
                    </p>
                  </div>
                )}

                <div className={mode === 'CREATE' ? '' : 'sm:col-span-2'}>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Notes de la séance / Objectifs pédagogiques
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ex: TP sur machines, prévoir ordinateurs portables..."
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* 3. FIXED / STICKY ACTION FOOTER (Always visible at bottom of modal) */}
        <div className="shrink-0 bg-slate-50 px-4 sm:px-6 py-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {conflictResult.hasConflict ? (
              <button
                type="button"
                onClick={() =>
                  conflictBoxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }
                className="inline-flex items-center gap-1.5 text-xs font-bold text-red-700 bg-red-100 hover:bg-red-200/80 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                <span>
                  {conflictResult.conflicts.length} conflit(s) — Voir les détails
                </span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Aucun conflit détecté • Créneau valide</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 bg-white text-slate-700 text-xs sm:text-sm font-semibold rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={mode !== 'CANCEL' && conflictResult.hasConflict}
              className={`px-5 py-2 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all cursor-pointer ${
                mode !== 'CANCEL' && conflictResult.hasConflict
                  ? 'bg-slate-400 cursor-not-allowed'
                  : mode === 'CANCEL'
                  ? 'bg-red-600 hover:bg-red-700'
                  : mode === 'RESCHEDULE'
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-[#17345B] hover:bg-[#2F6FED]'
              }`}
            >
              {mode === 'CREATE' && 'Enregistrer / Publier'}
              {mode === 'EDIT' && 'Enregistrer les modifications'}
              {mode === 'RESCHEDULE' && 'Confirmer le report & Notifier'}
              {mode === 'CANCEL' && 'Confirmer l’annulation & Notifier'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
