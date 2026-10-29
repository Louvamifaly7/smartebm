import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  BookOpen,
  CheckCircle,
  Clock,
  Calendar,
  AlertCircle,
  Users,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface CourseVolumeTrackerProps {
  onNavigateToCreate?: () => void;
}

export const CourseVolumeTracker: React.FC<CourseVolumeTrackerProps> = ({ onNavigateToCreate }) => {
  const { courses, sessions, groups, users, currentUser, getCourseHourlyStats, validateSession } = useApp();
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(courses[0]?.id || null);

  const canValidate = currentUser.role === 'ACADEMIC_HEAD' || currentUser.role === 'ADMIN';

  return (
    <div className="space-y-4">
      {/* Overview Header */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                <Clock className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                Suivi des Volumes Horaires & Réalisations
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Suivi en temps réel de l'avancement horaire, cours partagés et validation académique des séances.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl font-semibold border border-slate-200">
              {courses.length} modules d'enseignement
            </span>
            {onNavigateToCreate && (
              <button
                onClick={onNavigateToCreate}
                className="px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1"
              >
                + Créer un Cours
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Courses Cards & Table */}
      <div className="space-y-3">
        {courses.map((course) => {
          const stats = getCourseHourlyStats(course.id);
          const isExpanded = expandedCourseId === course.id;
          const courseSessions = sessions.filter((s) => s.courseId === course.id);
          const assignedGroups = course.groupIds.map((gId) => groups.find((g) => g.id === gId)?.code).filter(Boolean);
          const assignedTeacher = users.find((u) => u.id === course.teacherIds[0]);

          const percentCompleted = Math.round((stats.completedHours / stats.totalHours) * 100) || 0;
          const percentScheduled = Math.round((stats.scheduledHours / stats.totalHours) * 100) || 0;

          return (
            <div
              key={course.id}
              className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden transition-all"
            >
              {/* Card Header Summary */}
              <div
                onClick={() => setExpandedCourseId(isExpanded ? null : course.id)}
                className="p-4 cursor-pointer hover:bg-slate-50/80 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-xs shadow-xs flex-shrink-0"
                    style={{ backgroundColor: course.color || '#2563eb' }}
                  >
                    {course.code.substring(0, 4)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                        {course.code}
                      </span>
                      <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                        {course.level} • {assignedGroups.join(', ')}
                      </span>
                      {course.groupIds.length > 1 && (
                        <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full" title="Volume comptabilisé une seule fois">
                          Cours partagé
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mt-1">
                      {course.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Enseignant : <strong className="text-slate-700">{assignedTeacher?.name || 'Non assigné'}</strong>
                    </p>
                  </div>
                </div>

                {/* Progress Indicators Table (matches Cahier des Charges Section 6.2 table) */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <div className="px-2">
                    <span className="text-[10px] text-slate-500 uppercase block font-semibold">Total Prévu</span>
                    <span className="text-sm font-black text-slate-900">{stats.totalHours} h</span>
                  </div>
                  <div className="px-2 border-l border-slate-200">
                    <span className="text-[10px] text-blue-600 uppercase block font-semibold">Programmées</span>
                    <span className="text-sm font-black text-blue-800">{stats.scheduledHours} h</span>
                  </div>
                  <div className="px-2 border-l border-slate-200">
                    <span className="text-[10px] text-emerald-600 uppercase block font-semibold">Réalisées</span>
                    <span className="text-sm font-black text-emerald-800">{stats.completedHours} h</span>
                  </div>
                  <div className="px-2 border-l border-slate-200">
                    <span className="text-[10px] text-amber-600 uppercase block font-semibold">Reste à Réaliser</span>
                    <span className="text-sm font-black text-amber-800">{stats.remainingToComplete} h</span>
                  </div>
                  <div className="px-2 border-l border-slate-200">
                    <span className="text-[10px] text-purple-600 uppercase block font-semibold">Reste à Programmer</span>
                    <span className="text-sm font-black text-purple-800">{stats.remainingToSchedule} h</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end lg:self-center">
                  <div className="text-right hidden sm:block">
                    <span className="text-xs font-bold text-slate-800 block">{percentCompleted}% validé</span>
                    <span className="text-[10px] text-slate-500">{percentScheduled}% planifié</span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  )}
                </div>
              </div>

              {/* Expanded Sessions Details & Validation Workflow */}
              {isExpanded && (
                <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                      Détail des séances programmées pour ce cours ({courseSessions.length})
                    </h4>
                    {canValidate && (
                      <span className="text-[11px] text-emerald-800 font-semibold bg-emerald-100 px-2.5 py-0.5 rounded-full">
                        Habilité à valider les heures réalisées
                      </span>
                    )}
                  </div>

                  {courseSessions.length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-3 text-center">
                      Aucune séance programmée pour l'instant.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                          <tr>
                            <th className="p-2.5">Date & Heure</th>
                            <th className="p-2.5">Durée</th>
                            <th className="p-2.5">Salle</th>
                            <th className="p-2.5">Statut</th>
                            <th className="p-2.5">Validation / Motif</th>
                            {canValidate && <th className="p-2.5 text-right">Action</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {courseSessions.map((session) => {
                            const isValidated = session.status === 'COMPLETED_VALIDATED';
                            const isCancelled = session.status === 'CANCELLED';

                            return (
                              <tr key={session.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-2.5 font-semibold text-slate-900">
                                  {session.date} • {session.startTime}-{session.endTime}
                                </td>
                                <td className="p-2.5 font-bold text-blue-900">
                                  {session.durationHours} h
                                </td>
                                <td className="p-2.5 text-slate-700">
                                  {session.roomId}
                                </td>
                                <td className="p-2.5">
                                  {isValidated && (
                                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded text-[10px]">
                                      Réalisé & Validé
                                    </span>
                                  )}
                                  {isCancelled && (
                                    <span className="px-2 py-0.5 bg-red-100 text-red-800 font-bold rounded text-[10px]">
                                      Annulé (Non compté)
                                    </span>
                                  )}
                                  {session.status === 'PUBLISHED' && (
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-bold rounded text-[10px]">
                                      Publié
                                    </span>
                                  )}
                                  {session.status === 'RESCHEDULED' && (
                                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold rounded text-[10px]">
                                      Reporté
                                    </span>
                                  )}
                                  {session.status === 'PENDING_APPROVAL' && (
                                    <span className="px-2 py-0.5 bg-purple-100 text-purple-800 font-bold rounded text-[10px]">
                                      En attente
                                    </span>
                                  )}
                                </td>
                                <td className="p-2.5 text-slate-600">
                                  {isValidated && session.validatedBy ? (
                                    <span className="text-emerald-700 font-medium">
                                      Validé par {session.validatedBy}
                                    </span>
                                  ) : isCancelled ? (
                                    <span className="text-red-700 italic">
                                      {session.cancellationReason || 'Annulé'}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">En attente réalisation</span>
                                  )}
                                </td>
                                {canValidate && (
                                  <td className="p-2.5 text-right">
                                    {!isValidated && !isCancelled && (
                                      <button
                                        onClick={() => validateSession(session.id)}
                                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[10px] transition-colors shadow-xs"
                                      >
                                        Valider séance ({session.durationHours}h)
                                      </button>
                                    )}
                                    {isValidated && (
                                      <span className="text-emerald-700 font-bold text-[10px]">
                                        ✓ Comptabilisé
                                      </span>
                                    )}
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
            </div>
          );
        })}
      </div>
    </div>
  );
};
