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

  // Initialize form when opened or mode changed
  useEffect(() => {
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
      
      const todayStr = new Date().toISOString().split('T')[0];
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
    return Math.max(0.5, (eH * 60 + eM - (sH * 60 + sM)) / 60);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'CANCEL') {
      if (!sessionToEdit || !reason.trim()) {
        alert('Le motif d’annulation est obligatoire.');
        return;
      }
      cancelSession(sessionToEdit.id, reason.trim());
      onClose();
      return;
    }

    if (mode === 'RESCHEDULE') {
      if (!sessionToEdit || !reason.trim()) {
        alert('Le motif de report est obligatoire.');
        return;
      }
      rescheduleSession(
        sessionToEdit.id,
        rescheduleDate,
        rescheduleStartTime,
        rescheduleEndTime,
        rescheduleRoomId || sessionToEdit.roomId,
        reason.trim()
      );
      onClose();
      return;
    }

    // CREATE or EDIT
    const durationHours = calculateDuration(startTime, endTime);
    const isCustomEvent = sessionType !== 'COURSE';

    if (isCustomEvent && !eventTitle.trim()) {
      alert('Veuillez saisir le titre de la conférence ou de l’événement.');
      return;
    }

    if (mode === 'CREATE') {
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
        date,
        startTime,
        endTime,
        durationHours,
        status: 'PUBLISHED',
        notes,
      });

      if (!res.success) {
        alert(`Impossible d’enregistrer : ${res.error}`);
        return;
      }
    } else if (mode === 'EDIT' && sessionToEdit) {
      updateSession(
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
