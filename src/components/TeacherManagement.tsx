import React from 'react';
import { useApp } from '../context/AppContext';
import { UserCheck, Clock, AlertTriangle, Mail, Phone, BookOpen, Shield, CheckCircle } from 'lucide-react';
import { getTeachersForStudent } from '../utils/studentVisibility';

interface TeacherManagementProps {
  onNavigateToCreate?: () => void;
}

export const TeacherManagement: React.FC<TeacherManagementProps> = ({ onNavigateToCreate }) => {
  const { users, sessions, courses, ecs, currentUser, getTeacherHourlyStats } = useApp();

  const isStudent = currentUser.role === 'STUDENT';
  const allTeachers = users.filter((u) => u.role === 'TEACHER');
  const studentTeachers = getTeachersForStudent(currentUser.groupId, courses, ecs, sessions, users);
  const teachers = isStudent ? studentTeachers : allTeachers;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                <UserCheck className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                Corps Enseignant & Charge Horaire
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Fiches professionnelles, matières enseignées, heures programmées, réalisées et alertes de dépassement.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-3 py-1.5 bg-blue-50 text-blue-800 rounded-xl border border-blue-200">
              {teachers.length} enseignants actifs
            </span>
            {onNavigateToCreate && (
              <button
                onClick={onNavigateToCreate}
                className="px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1"
              >
                + Ajouter un Enseignant
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Teachers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teachers.map((teacher) => {
          const stats = getTeacherHourlyStats(teacher.id);
          const teacherSessions = sessions.filter((s) => s.teacherId === teacher.id);
          const cancelledSessions = teacherSessions.filter((s) => s.status === 'CANCELLED');
          const rescheduledSessions = teacherSessions.filter((s) => s.status === 'RESCHEDULED');

          // Hourly quota check (Section 7)
          const isOverCapacity = stats.totalScheduled > stats.maxWeekly;

          return (
            <div
              key={teacher.id}
              className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200 flex flex-col justify-between transition-all hover:shadow-md"
            >
              <div>
                {/* Profile Header */}
                <div className="flex items-start gap-3 pb-3 border-b border-slate-100">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-900 flex items-center justify-center font-bold text-base border border-blue-200 flex-shrink-0 shadow-xs">
                    {teacher.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-slate-900 truncate">
                      {teacher.name}
                    </h3>
                    <p className="text-xs text-slate-500 truncate flex items-center gap-1 mt-0.5">
                      <Mail className="w-3 h-3 text-slate-400" /> {teacher.email}
                    </p>
                    {teacher.phone && (
                      <p className="text-xs text-slate-500 truncate flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" /> {teacher.phone}
                      </p>
                    )}
                  </div>
                </div>

                {/* Subjects list */}
                <div className="mt-3">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                    Matières enseignées
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {teacher.subjects && teacher.subjects.length > 0 ? (
                      teacher.subjects.map((sub, i) => (
                        <span key={i} className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium">
                          {sub}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">Génie Logiciel & Systèmes</span>
                    )}
                  </div>
                </div>

                {/* Hourly Stats (Section 7) */}
                <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 text-center">
                    <span className="text-[10px] text-slate-500 uppercase block font-semibold">Programmées</span>
                    <span className="text-sm font-bold text-blue-900">{stats.totalScheduled} h</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 text-center">
                    <span className="text-[10px] text-slate-500 uppercase block font-semibold">Validées</span>
                    <span className="text-sm font-bold text-emerald-800">{stats.totalCompleted} h</span>
                  </div>
                </div>

                {/* Overtime warning if applicable */}
                {isOverCapacity && (
                  <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-1.5 font-medium">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span>Dépassement de charge hebdomadaire (&gt; {stats.maxWeekly}h max).</span>
                  </div>
                )}
              </div>

              {/* Footer status summary */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  Contrat : {stats.maxWeekly}h/semaine
                </span>
                {teacher.googleCalendarLinked ? (
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Synchro Google
                  </span>
                ) : (
                  <span className="text-slate-400">Non lié Google</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
