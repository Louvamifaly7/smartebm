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
import { TimetableSession } from '../types';
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
  } = useApp();

  const teachers = users.filter((u) => u.role === 'TEACHER');

  // Form State
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
    if ((mode === 'CREATE' || mode === 'EDIT') && courseId && teacherId && roomId && date && startTime && endTime) {
      const result = detectSessionConflicts(
        {
          id: sessionToEdit?.id,
          courseId,
          teacherId,
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
  }, [courseId, teacherId, groupIds, roomId, date, startTime, endTime, mode, sessionToEdit, sessions]);

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

    if (mode === 'CREATE') {
      const res = addSession({
        courseId,
        teacherId,
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
          courseId,
          teacherId,
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
                {mode === 'CREATE' && 'Planifier une nouvelle séance'}
                {mode === 'EDIT' && 'Modifier la séance'}
                {mode === 'RESCHEDULE' && 'Reporter la séance de cours'}
                {mode === 'CANCEL' && 'Annuler la séance (Notification automatique)'}
              </h3>
              <p className="text-xs text-slate-500">
                {mode === 'CANCEL'
                  ? 'Déclenche des notifications automatiques'
                  : 'Vérification automatique des conflits de salle, enseignant et groupe'}
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
                    Début
                  </label>
                  <input
                    type="time"
                    value={rescheduleStartTime}
                    onChange={(e) => setRescheduleStartTime(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Fin
                  </label>
                  <input
                    type="time"
                    value={rescheduleEndTime}
                    onChange={(e) => setRescheduleEndTime(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                    required
                  />
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
              {/* Course & Teacher */}
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
                    Heure début
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Heure fin
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                    required
                  />
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
