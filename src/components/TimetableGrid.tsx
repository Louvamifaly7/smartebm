import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
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
} from 'lucide-react';
import { TimetableSession } from '../types';
import { createGoogleCalendarUrl, downloadICSFile } from '../utils/calendarExport';
import { getTeachersForStudent } from '../utils/studentVisibility';

interface TimetableGridProps {
  onOpenCreateModal: () => void;
  onOpenEditModal: (session: TimetableSession) => void;
  onOpenRescheduleModal: (session: TimetableSession) => void;
  onOpenCancelModal: (session: TimetableSession) => void;
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
    currentUser,
    validateSession,
    deleteSession,
  } = useApp();

  const isStudent = currentUser.role === 'STUDENT';

  // Compute student-specific teachers and groups
  const studentTeachers = getTeachersForStudent(currentUser.groupId, courses, ecs, sessions, users);
  const teachers = isStudent ? studentTeachers : users.filter((u) => u.role === 'TEACHER');

  const visibleGroups = isStudent ? groups.filter((g) => g.id === currentUser.groupId) : groups;

  // Filters state
  const [selectedGroupId, setSelectedGroupId] = useState<string>(isStudent ? (currentUser.groupId || 'ALL') : 'ALL');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('ALL');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [weekOffset, setWeekOffset] = useState<number>(0);

  // Time grid slots (08:00 to 19:00)
  const timeSlots = [
    '08:00', '09:00', '10:00', '11:00', '12:00',
    '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'
  ];

  // Helper date for week days
  const getDayInfo = (dayIndex: number) => {
    const now = new Date();
    const currentDay = now.getDay();
    const distanceToMonday = (currentDay + 6) % 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - distanceToMonday + weekOffset * 7 + dayIndex);

    const dateStr = monday.toISOString().split('T')[0];
    const dayNames = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    return {
      dayIndex,
      name: dayNames[dayIndex],
      dateStr,
      displayDate: monday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
      isWeekend: dayIndex >= 5,
    };
  };

  const weekDays = [0, 1, 2, 3, 4, 5, 6].map(getDayInfo);

  // Filter sessions
  const filteredSessions = sessions.filter((s) => {
    // Role-based visibility
    if (currentUser.role === 'STUDENT') {
      if (currentUser.groupId && !s.groupIds.includes(currentUser.groupId)) {
        return false;
      }
    } else if (currentUser.role === 'TEACHER') {
      if (selectedTeacherId === 'ALL' && s.teacherId !== currentUser.id) {
        // By default show teacher's own courses unless admin/filter changed
      }
    }

    if (selectedGroupId !== 'ALL' && !s.groupIds.includes(selectedGroupId)) return false;
    if (selectedTeacherId !== 'ALL' && s.teacherId !== selectedTeacherId) return false;
    if (selectedRoomId !== 'ALL' && s.roomId !== selectedRoomId) return false;
    if (selectedStatus !== 'ALL' && s.status !== selectedStatus) return false;

    return true;
  });

  const canManage =
    currentUser.role === 'ADMIN' ||
    currentUser.role === 'SCHEDULER' ||
    currentUser.role === 'ACADEMIC_HEAD';

  const handleExportICS = () => {
    downloadICSFile('EBM_Emploi_du_Temps', filteredSessions, courses, rooms, users);
  };

  return (
    <div className="space-y-4">
      {/* Action and Filter Toolbar */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          
          {/* Week Navigator */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWeekOffset((prev) => prev - 1)}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors text-slate-700"
              title="Semaine précédente"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-sm font-bold text-slate-900 px-2 min-w-[210px] text-center">
              Semaine du {weekDays[0].displayDate} au {weekDays[4].displayDate}
            </span>

            <button
              onClick={() => setWeekOffset((prev) => prev + 1)}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors text-slate-700"
              title="Semaine suivante"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {weekOffset !== 0 && (
              <button
                onClick={() => setWeekOffset(0)}
                className="text-xs font-semibold text-blue-700 hover:underline px-2"
              >
                Cette semaine
              </button>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExportICS}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-colors border border-slate-200"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              Exporter iCal (.ics)
            </button>

            {canManage && (
              <button
                onClick={onOpenCreateModal}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all hover:shadow-md"
              >
                <Plus className="w-4 h-4" />
                Planifier une séance
              </button>
            )}
          </div>
        </div>

        {/* Filters bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3">
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
              Groupe / Promotion
            </label>
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              disabled={isStudent}
              className={`w-full text-xs p-1.5 border border-slate-200 rounded-lg text-slate-800 font-medium ${
                isStudent ? 'bg-slate-100 cursor-not-allowed' : 'bg-slate-50'
              }`}
            >
              {!isStudent && <option value="ALL">Tous les groupes ({groups.length})</option>}
              {visibleGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.code} ({g.name})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
              {isStudent ? "Vos Enseignants" : "Enseignant"}
            </label>
            <select
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              className="w-full text-xs p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium"
            >
              <option value="ALL">
                {isStudent ? `Tous vos enseignants (${teachers.length})` : `Tous les enseignants (${teachers.length})`}
              </option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
              Salle
            </label>
            <select
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              className="w-full text-xs p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium"
            >
              <option value="ALL">Toutes les salles</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
              Statut séance
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full text-xs p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium"
            >
              <option value="ALL">Tous les statuts</option>
              <option value="PUBLISHED">Publié</option>
              <option value="COMPLETED_VALIDATED">Réalisé & Validé</option>
              <option value="RESCHEDULED">Reporté</option>
              <option value="CANCELLED">Annulé</option>
              <option value="PENDING_APPROVAL">En attente</option>
            </select>
          </div>
        </div>
      </div>

      {/* Week Grid (Lundi au Dimanche) */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-x-auto">
        <div className="min-w-[1100px]">
          {/* Day Headers */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/70">
            {weekDays.map((day) => (
              <div
                key={day.dateStr}
                className={`p-3 text-center border-r border-slate-200 last:border-r-0 ${
                  day.isWeekend ? 'bg-slate-100/70' : ''
                }`}
              >
                <div className="flex items-center justify-center gap-1">
                  <span className={`block text-xs font-bold uppercase tracking-wider ${
                    day.isWeekend ? 'text-slate-500' : 'text-slate-900'
                  }`}>
                    {day.name}
                  </span>
                  {day.isWeekend && (
                    <span className="text-[9px] font-semibold text-slate-400 bg-slate-200/60 px-1 rounded">
                      W-E
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-medium text-slate-500">
                  {day.displayDate}
                </span>
              </div>
            ))}
          </div>

          {/* Day Columns */}
          <div className="grid grid-cols-7 min-h-[560px] divide-x divide-slate-200">
            {weekDays.map((day) => {
              const daySessions = filteredSessions
                .filter((s) => s.date === day.dateStr)
                .sort((a, b) => a.startTime.localeCompare(b.startTime));

              return (
                <div
                  key={day.dateStr}
                  className={`p-2 space-y-2.5 ${
                    day.isWeekend ? 'bg-slate-100/30' : 'bg-slate-50/30'
                  }`}
                >
                  {daySessions.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs italic py-12">
                      <span>{day.isWeekend ? 'Week-end' : 'Aucune séance'}</span>
                      <span className="text-[10px] text-slate-300 not-italic">
                        {day.isWeekend ? 'Libre' : ''}
                      </span>
                    </div>
                  ) : (
                    daySessions.map((session) => {
                      const course = courses.find((c) => c.id === session.courseId);
                      const room = rooms.find((r) => r.id === session.roomId);
                      const teacher = users.find((u) => u.id === session.teacherId);

                      const isCancelled = session.status === 'CANCELLED';
                      const isRescheduled = session.status === 'RESCHEDULED';
                      const isValidated = session.status === 'COMPLETED_VALIDATED';
                      const googleCalUrl = createGoogleCalendarUrl(session, course, room, teacher);

                      return (
                        <div
                          key={session.id}
                          className={`rounded-xl p-3 border shadow-xs transition-all hover:shadow-md text-xs relative ${
                            isCancelled
                              ? 'bg-red-50/70 border-red-200 text-slate-600'
                              : isRescheduled
                              ? 'bg-amber-50/70 border-amber-300 text-slate-800'
                              : isValidated
                              ? 'bg-emerald-50/60 border-emerald-300 text-slate-900'
                              : 'bg-white border-slate-200 text-slate-900'
                          }`}
                        >
                          {/* Top Status & Time */}
                          <div className="flex items-center justify-between gap-1 mb-1.5">
                            <span className="font-bold text-blue-900 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-blue-600" />
                              {session.startTime} - {session.endTime}
                            </span>
                            <span className="text-[10px] text-slate-500 font-semibold">
                              {session.durationHours}h
                            </span>
                          </div>

                          {/* Course title & code */}
                          <div className="font-bold text-slate-900 text-xs leading-snug">
                            <span className={`inline-block ${isCancelled ? 'line-through text-slate-400' : ''}`}>
                              {course?.title || 'Cours'}
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-500 mt-1 font-medium">
                            Code : {course?.code}
                          </div>

                          {/* Room & Teacher info */}
                          <div className="space-y-1 mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-600">
                            <div className="flex items-center gap-1 truncate" title={room?.name}>
                              <MapPin className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                              <span className="truncate">{room?.name || session.roomId}</span>
                            </div>
                            <div className="flex items-center gap-1 truncate" title={teacher?.name}>
                              <UserIcon className="w-3 h-3 text-purple-600 flex-shrink-0" />
                              <span className="truncate">{teacher?.name || 'Enseignant'}</span>
                            </div>
                          </div>

                          {/* Status Badge */}
                          <div className="mt-2.5 flex items-center justify-between flex-wrap gap-1">
                            {isCancelled && (
                              <span className="px-1.5 py-0.5 bg-red-100 text-red-800 font-bold rounded text-[9px] uppercase tracking-wider flex items-center gap-0.5">
                                <AlertTriangle className="w-2.5 h-2.5" /> Annulé
                              </span>
                            )}
                            {isRescheduled && (
                              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 font-bold rounded text-[9px] uppercase tracking-wider flex items-center gap-0.5">
                                <RotateCcw className="w-2.5 h-2.5" /> Reporté
                              </span>
                            )}
                            {isValidated && (
                              <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded text-[9px] uppercase tracking-wider flex items-center gap-0.5">
                                <CheckCircle className="w-2.5 h-2.5" /> Validé ({session.durationHours}h)
                              </span>
                            )}
                            {session.status === 'PUBLISHED' && (
                              <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 font-bold rounded text-[9px] uppercase tracking-wider">
                                Publié
                              </span>
                            )}
                            {session.status === 'PENDING_APPROVAL' && (
                              <span className="px-1.5 py-0.5 bg-purple-100 text-purple-800 font-bold rounded text-[9px] uppercase tracking-wider">
                                En attente
                              </span>
                            )}

                            {/* Direct Google Calendar Link */}
                            <a
                              href={googleCalUrl}
                              target="_blank"
                              rel="noreferrer"
                              title="Ajouter directement à Google Agenda"
                              className="text-slate-400 hover:text-blue-600 p-0.5 rounded transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>

                          {/* Cancellation Note */}
                          {isCancelled && session.cancellationReason && (
                            <div className="mt-2 p-1 bg-red-100/60 rounded text-[10px] text-red-800 italic">
                              Motif: {session.cancellationReason}
                            </div>
                          )}

                          {/* Management Actions */}
                          {canManage && (
                            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-end gap-1 text-[11px]">
                              {!isValidated && !isCancelled && (
                                <>
                                  <button
                                    onClick={() => onOpenRescheduleModal(session)}
                                    title="Reporter le cours"
                                    className="p-1 text-amber-700 hover:bg-amber-100 rounded transition-colors"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => onOpenCancelModal(session)}
                                    title="Annuler le cours"
                                    className="p-1 text-red-700 hover:bg-red-100 rounded transition-colors"
                                  >
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => onOpenEditModal(session)}
                                    title="Modifier la séance"
                                    className="p-1 text-blue-700 hover:bg-blue-100 rounded transition-colors"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}

                              {currentUser.role === 'ACADEMIC_HEAD' && !isValidated && !isCancelled && (
                                <button
                                  onClick={() => validateSession(session.id)}
                                  title="Valider comme séance réalisée"
                                  className="px-2 py-0.5 bg-emerald-600 text-white font-semibold rounded text-[10px] hover:bg-emerald-700 transition-colors"
                                >
                                  Valider
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  if (confirm('Supprimer cette séance ?')) {
                                    deleteSession(session.id);
                                  }
                                }}
                                title="Supprimer définitivement"
                                className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
