import React, { useState, useEffect } from 'react';
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
  FileText,
  RotateCcw,
  Ban,
} from 'lucide-react';
import { TimetableSession, SessionActivityType } from '../types';
import { detectSessionConflicts } from '../utils/conflictDetector';
import { getAntananarivoDateStr } from '../utils/securityAndDateUtils';
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
    courses,
    rooms,
    groups,
    users,
    sessions,
    addSession,
    updateSession,
    rescheduleSession,
    cancelSession,
    validateSession,
    appSettings,
  } = useApp();

  const teachers = users.filter((u) => u.role === 'TEACHER');

  const scheduleConfig = appSettings.scheduleSettings || {
    dayStartTime: '07:00',
    dayEndTime: '18:00',
    slotIntervalMinutes: 30,
  };

  const configurableTimeSlots = (() => {
    const [startH, startM] = (scheduleConfig.dayStartTime || '07:00').split(':').map(Number);
    const [endH, endM] = (scheduleConfig.dayEndTime || '18:00').split(':').map(Number);
    const step = scheduleConfig.slotIntervalMinutes || 30;
    const startTotal = (isNaN(startH) ? 7 : startH) * 60 + (isNaN(startM) ? 0 : startM);
    const endTotal = (isNaN(endH) ? 18 : endH) * 60 + (isNaN(endM) ? 0 : endM);
    const slots: string[] = [];
    for (let m = startTotal; m <= endTotal; m += step) {
      const hh = String(Math.floor(m / 60)).padStart(2, '0');
      const mm = String(m % 60).padStart(2, '0');
      slots.push(`${hh}:${mm}`);
    }
    return slots.length >= 2 ? slots : ['07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'];
  })();

  // Form State
  const [sessionType, setSessionType] = useState<SessionActivityType>('COURSE');
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

  // Conflict state
  const [conflictResult, setConflictResult] = useState<ReturnType<typeof detectSessionConflicts>>({
    hasConflict: false,
    conflicts: [],
    suggestions: [],
  });
  const [showSmartAssistant, setShowSmartAssistant] = useState<boolean>(true);
  const [desiredDurationHours, setDesiredDurationHours] = useState<number>(2);
  const [assistantAppliedMsg, setAssistantAppliedMsg] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isRecurring, setIsRecurring] = useState<boolean>(false);
  const [repeatWeeks, setRepeatWeeks] = useState<number>(12);

  // Initialize form when opened or mode changed
  useEffect(() => {
    setFormError(null);
    if (sessionToEdit) {
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
      const defaultCourse = courses[0];
      setSessionType('COURSE');
      setEventTitle('');
      setEventSpeaker('');
      setEventCategoryLabel('');
      setCourseId(defaultCourse?.id || '');
      setTeacherId(defaultCourse?.teacherIds[0] || teachers[0]?.id || '');
      setGroupIds(defaultCourse?.groupIds || [groups[0]?.id || '']);
      setRoomId(rooms[0]?.id || '');
      
      const todayStr = getAntananarivoDateStr();
      setDate(todayStr);
      setStartTime('08:30');
      setEndTime('10:30');
      setNotes('');
      setReason('');
    }
  }, [sessionToEdit, isOpen]);

  // Real-time conflict detection effect
  useEffect(() => {
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
        users
      );
      setConflictResult(result);
    } else {
      setConflictResult({ hasConflict: false, conflicts: [], suggestions: [] });
    }
  }, [sessionType, eventTitle, courseId, teacherId, groupIds, roomId, date, startTime, endTime, mode, sessionToEdit, sessions]);

  if (!isOpen) return null;

  // Handle course change auto-populating teacher & group defaults
  const handleCourseChange = (newCourseId: string) => {
    setCourseId(newCourseId);
    const crs = courses.find((c) => c.id === newCourseId);
    if (crs) {
      if (crs.teacherIds.length > 0) setTeacherId(crs.teacherIds[0]);
      if (crs.groupIds.length > 0) setGroupIds(crs.groupIds);
    }
  };

  const calculateDuration = (start: string, end: string) => {
    const [sH, sM] = start.split(':').map(Number);
    const [eH, eM] = end.split(':').map(Number);
    return Number((((eH * 60 + eM) - (sH * 60 + sM)) / 60).toFixed(2));
  };

  // Smart Scheduling Assistant: Compute best available (date, startTime, endTime, room) slots
  const smartRecommendedSlots = (() => {
    const selectedTeacherObj = users.find((u) => u.id === teacherId);
    const totalStudentsNeeded = groupIds.reduce((sum, gid) => {
      const grp = groups.find((g) => g.id === gid);
      return sum + (grp?.studentCount || 25);
    }, 0);

    const compatibleRooms = rooms.filter((r) => r.capacity >= Math.max(15, totalStudentsNeeded));
    const candidateRooms = compatibleRooms.length > 0 ? compatibleRooms : rooms;

    const baseDate = date ? new Date(date) : new Date();
    const dayOfWeek = baseDate.getDay();
    const diffToMonday = (dayOfWeek + 6) % 7;
    const monday = new Date(baseDate);
    monday.setDate(baseDate.getDate() - diffToMonday);

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
          selectedTeacherObj?.availabilities?.some(
            (av) => av.day === dayName && (av.startTime || '07:00') <= st && (av.endTime || '17:00') >= et
          ) ?? true;

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
            sessions,
            rooms,
            groups,
            users
          );

          if (!check.hasConflict) {
            recommendations.push({
              date: dStr,
              dayLabel: `${dayName} ${dObj.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}`,
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
        if (recommendations.length >= 9) break;
      }
      if (recommendations.length >= 9) break;
    }

    // Prioritize slots where teacher explicitly declared availability
    return recommendations.sort(
      (a, b) => Number(b.teacherDeclaredAvailable) - Number(a.teacherDeclaredAvailable)
    ).slice(0, 6);
  })();

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
        setFormError('L’heure de fin du report doit être strictement postérieure à l’heure de début.');
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
          notes: isRecurring ? `${notes ? notes + ' · ' : ''}Séance récurrente (${w + 1}/${totalOccurrences})` : notes,
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
        setFormError(`Aucune séance n'a pu être planifiée : ${skippedReasons[0] || 'Conflit détecté'}`);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 border border-slate-200 my-8 animate-in fade-in zoom-in duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2.5 rounded-xl text-white ${
                mode === 'CANCEL'
                  ? 'bg-red-600'
                  : mode === 'RESCHEDULE'
                  ? 'bg-amber-600'
                  : 'bg-blue-600'
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
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {mode === 'CREATE' && 'Planifier un Cours, une Conférence ou un Événement'}
                {mode === 'EDIT' && 'Modifier la séance ou l’événement'}
                {mode === 'RESCHEDULE' && 'Reporter la séance'}
                {mode === 'CANCEL' && 'Annuler la séance (Notification automatique)'}
              </h3>
              <p className="text-xs text-slate-500">
                {mode === 'CANCEL'
                  ? 'Déclenche des notifications automatiques'
                  : 'Insertion directe dans l’emploi du temps des étudiants avec vérification des conflits'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-900 font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}
          
          {/* MODE: CANCEL */}
          {mode === 'CANCEL' && (
            <div className="space-y-3">
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
                <p className="font-semibold mb-1">
                  Attention : Vous vous apprêtez à annuler cette séance.
                </p>
                <p>
                  Les étudiants concernés ainsi que l’enseignant recevront immédiatement une notification Push Android et une alerte sur le portail Web.
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
            <div className="space-y-3">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                <span className="font-semibold block mb-0.5">Report officiel de séance</span>
                L'ancienne date ({sessionToEdit?.date} à {sessionToEdit?.startTime}) sera conservée dans l'historique et transmise aux étudiants via notification Push.
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
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-sm"
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
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                  >
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.capacity} pl.)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Début ({scheduleConfig.slotIntervalMinutes} mn)
                  </label>
                  <select
                    value={rescheduleStartTime}
                    onChange={(e) => setRescheduleStartTime(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold"
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
                    Fin ({scheduleConfig.slotIntervalMinutes} mn)
                  </label>
                  <select
                    value={rescheduleEndTime}
                    onChange={(e) => setRescheduleEndTime(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold"
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
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                  required
                />
              </div>
            </div>
          )}

          {/* MODE: CREATE OR EDIT */}
          {(mode === 'CREATE' || mode === 'EDIT') && (
            <>
              {/* Type d'activité à insérer dans l'emploi du temps */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Type d'activité à planifier *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  {[
                    { id: 'COURSE', label: '📚 Cours académique' },
                    { id: 'CONFERENCE', label: '🎤 Conférence' },
                    { id: 'SEMINAIRE', label: '🏛️ Séminaire / Atelier' },
                    { id: 'SOUTENANCE', label: '🎓 Soutenance / Jury' },
                    { id: 'EXAMEN', label: '📝 Examen / Épreuve' },
                    { id: 'AUTRE_EVENEMENT', label: '📌 Autre événement' },
                  ].map((typeOpt) => (
                    <button
                      key={typeOpt.id}
                      type="button"
                      onClick={() => setSessionType(typeOpt.id as SessionActivityType)}
                      className={`px-3 py-2 rounded-xl font-bold text-left border transition-all cursor-pointer ${
                        sessionType === typeOpt.id
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {typeOpt.label}
                    </button>
                  ))}
                </div>
              </div>

              {sessionType === 'COURSE' ? (
                /* Course & Teacher */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Matière / Cours *
                    </label>
                    <select
                      value={courseId}
                      onChange={(e) => handleCourseChange(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium"
                      required
                    >
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.code} - {c.title} ({c.totalHours}h)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Enseignant responsable *
                    </label>
                    <select
                      value={teacherId}
                      onChange={(e) => setTeacherId(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm"
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
              ) : (
                /* Custom Event / Conference Fields */
                <div className="space-y-3 p-3.5 bg-purple-50/60 border border-purple-200 rounded-xl">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className={sessionType === 'AUTRE_EVENEMENT' ? '' : 'sm:col-span-2'}>
                      <label className="block text-xs font-bold uppercase tracking-wider text-purple-900 mb-1">
                        Intitulé de la conférence / événement *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Conférence sur l'Entrepreneuriat & FinTech à Madagascar"
                        value={eventTitle}
                        onChange={(e) => setEventTitle(e.target.value)}
                        className="w-full p-2.5 bg-white border border-purple-300 rounded-xl text-sm font-bold text-slate-900"
                      />
                    </div>

                    {sessionType === 'AUTRE_EVENEMENT' && (
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-purple-900 mb-1">
                          Catégorie personnalisée
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: Forum Entreprises, Visite d'étude..."
                          value={eventCategoryLabel}
                          onChange={(e) => setEventCategoryLabel(e.target.value)}
                          className="w-full p-2.5 bg-white border border-purple-300 rounded-xl text-sm font-semibold text-slate-800"
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-purple-900 mb-1">
                        Intervenant(e) / Conférencier
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: M. Tahiry Rakotoarisoa (DG FinTech Mada)"
                        value={eventSpeaker}
                        onChange={(e) => setEventSpeaker(e.target.value)}
                        className="w-full p-2 bg-white border border-purple-300 rounded-xl text-xs font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-purple-900 mb-1">
                        Enseignant référent / Modérateur (optionnel)
                      </label>
                      <select
                        value={teacherId}
                        onChange={(e) => setTeacherId(e.target.value)}
                        className="w-full p-2 bg-white border border-purple-300 rounded-xl text-xs"
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

              {/* Group selection & Room selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Groupe(s) d'étudiants *
                  </label>
                  <select
                    multiple
                    value={groupIds}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions, (option) => option.value);
                      setGroupIds(selected);
                    }}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs h-20"
                    required
                  >
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.code} ({g.studentCount} étudiants)
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Maintenez Ctrl (ou Cmd) pour sélectionner plusieurs groupes (cours partagé).
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Salle de cours / Labo *
                  </label>
                  <select
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                    required
                  >
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.capacity} pl.)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ASSISTANT INTELLIGENT DE PLANIFICATION (Aide au placement Date, Heure & Salle) */}
              <div className="p-3.5 bg-gradient-to-r from-indigo-50 via-blue-50 to-slate-50 border border-indigo-200 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-600 text-white rounded-lg">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-xs font-black text-indigo-950 block">
                        Assistant de Planification (Placement Intelligent Date, Heure & Salle)
                      </span>
                      <span className="text-[10px] text-slate-600">
                        Analyse les disponibilités de l'enseignant, l'emploi du temps des étudiants et la capacité des salles
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <select
                      value={desiredDurationHours}
                      onChange={(e) => setDesiredDurationHours(Number(e.target.value))}
                      className="text-[11px] font-bold bg-white border border-indigo-200 rounded-lg px-2 py-1 text-indigo-900"
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
                      className="text-[11px] font-bold text-indigo-700 hover:underline px-1.5 cursor-pointer"
                    >
                      {showSmartAssistant ? 'Masquer' : 'Afficher'}
                    </button>
                  </div>
                </div>

                {assistantAppliedMsg && (
                  <div className="p-2 bg-emerald-100/90 border border-emerald-300 rounded-xl text-[11px] font-bold text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span>{assistantAppliedMsg}</span>
                  </div>
                )}

                {showSmartAssistant && (
                  <div className="space-y-2 pt-1">
                    {smartRecommendedSlots.length === 0 ? (
                      <p className="text-[11px] text-slate-500 italic">
                        Aucun créneau automatique trouvé sur cette semaine. Vous pouvez changer la date de référence ci-dessous.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                                  `Créneau appliqué : ${slot.dayLabel} de ${slot.startTime} à ${slot.endTime} en salle ${slot.roomName}`
                                );
                              }}
                              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                                isCurrentlySelected
                                  ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
                                  : 'bg-white hover:bg-indigo-50/70 text-slate-800 border-indigo-200/80'
                              }`}
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-xs truncate">{slot.dayLabel}</span>
                                  {slot.teacherDeclaredAvailable && (
                                    <span
                                      className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
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
                                  className={`text-[11px] font-mono font-bold mt-0.5 ${
                                    isCurrentlySelected ? 'text-indigo-100' : 'text-indigo-700'
                                  }`}
                                >
                                  {slot.startTime} - {slot.endTime} • {slot.roomName} ({slot.roomCapacity} pl.)
                                </div>
                              </div>
                              <span
                                className={`text-[10px] font-bold px-2 py-1 rounded-lg shrink-0 ${
                                  isCurrentlySelected
                                    ? 'bg-white text-indigo-700'
                                    : 'bg-indigo-100 text-indigo-800'
                                }`}
                              >
                                {isCurrentlySelected ? 'Choisi ✓' : 'Choisir'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Date, Start time, End time */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Heure début ({scheduleConfig.slotIntervalMinutes} mn)
                  </label>
                  <select
                    value={startTime}
                    onChange={(e) => {
                      const st = e.target.value;
                      setStartTime(st);
                      const [h, m] = st.split(':').map(Number);
                      const endMinutes = Math.min(18 * 60, h * 60 + m + 120);
                      const endH = String(Math.floor(endMinutes / 60)).padStart(2, '0');
                      const endM = String(endMinutes % 60).padStart(2, '0');
                      setEndTime(`${endH}:${endM}`);
                    }}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold"
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
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Heure fin ({scheduleConfig.slotIntervalMinutes} mn)
                  </label>
                  <select
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold"
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

              {/* Recurring Weekly Option (Séances récurrentes sur le semestre) */}
              {mode === 'CREATE' && (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isRecurring}
                        onChange={(e) => setIsRecurring(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Répéter chaque semaine (Séance récurrente sur le semestre)</span>
                    </label>
                    {isRecurring && (
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-slate-600 font-semibold">Pendant :</span>
                        <select
                          value={repeatWeeks}
                          onChange={(e) => setRepeatWeeks(Number(e.target.value))}
                          className="px-2 py-1 rounded-lg border border-slate-300 bg-white font-bold text-slate-900 text-xs"
                        >
                          <option value={4}>4 semaines (1 mois)</option>
                          <option value={8}>8 semaines (Demi-semestre)</option>
                          <option value={12}>12 semaines (Semestre standard)</option>
                          <option value={15}>15 semaines (Semestre complet)</option>
                        </select>
                      </div>
                    )}
                  </div>
                  {isRecurring && (
                    <p className="text-[11px] text-slate-500">
                      Ce créneau ({startTime} - {endTime}) sera planifié automatiquement le même jour de chaque semaine pendant{' '}
                      <strong>{repeatWeeks} semaines</strong> avec contrôle individuel des conflits.
                    </p>
                  )}
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Notes de la séance / Objectifs pédagogiques
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: TP sur machines, prévoir ordinateurs portables..."
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                />
              </div>

              {/* Real-time Conflict Alert Box (Section 9.2, RG-12) */}
              {conflictResult.hasConflict && (
                <div className="p-3.5 bg-red-50 border border-red-300 rounded-xl text-xs space-y-2">
                  <div className="flex items-center gap-2 text-red-800 font-bold">
                    <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                    <span>Conflit détecté avant publication :</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-red-700">
                    {conflictResult.conflicts.map((c, i) => (
                      <li key={i}>{c.message}</li>
                    ))}
                  </ul>

                  {/* Assisted Scheduling Suggestions */}
                  {conflictResult.suggestions && conflictResult.suggestions.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-red-200">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5 mb-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                        Créneaux alternatifs suggérés sans conflit :
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {conflictResult.suggestions.map((sug, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setDate(sug.date);
                              setStartTime(sug.startTime);
                              setEndTime(sug.endTime);
                              setRoomId(sug.roomId);
                            }}
                            className="px-2.5 py-1 bg-white hover:bg-blue-50 text-blue-800 border border-blue-300 rounded-lg text-[11px] font-semibold transition-all hover:shadow-xs"
                          >
                            {sug.date} • {sug.startTime}-{sug.endTime} ({sug.roomName})
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={conflictResult.hasConflict}
              className={`px-5 py-2 text-white text-sm font-bold rounded-xl shadow-md transition-all ${
                conflictResult.hasConflict
                  ? 'bg-slate-400 cursor-not-allowed'
                  : mode === 'CANCEL'
                  ? 'bg-red-600 hover:bg-red-700'
                  : mode === 'RESCHEDULE'
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-blue-700 hover:bg-blue-800'
              }`}
            >
              {mode === 'CREATE' && 'Créer la séance'}
              {mode === 'EDIT' && 'Enregistrer les modifications'}
              {mode === 'RESCHEDULE' && 'Confirmer le report & Notifier'}
              {mode === 'CANCEL' && 'Confirmer l’annulation & Notifier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
