import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  Clock,
  BookOpen,
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Filter,
  Users,
  CheckSquare,
  Sparkles,
  MapPin,
} from 'lucide-react';

interface CourseVolumeTrackerProps {
  onNavigateToCreate?: () => void;
}

export const CourseVolumeTracker: React.FC<CourseVolumeTrackerProps> = () => {
  const {
    courses,
    users,
    sessions,
    groups,
    rooms,
    getCourseHourlyStats,
    getTeacherHourlyStats,
    validateSession,
    currentUser,
  } = useApp();

  const isTeacher = currentUser?.role === 'TEACHER';
  const canValidate = ['ADMIN', 'ACADEMIC_HEAD', 'SCOLARITE', 'SCHEDULER', 'ADMIN_STAFF', 'TEACHER'].includes(
    currentUser?.role || ''
  );

  const todayStr = new Date().toISOString().split('T')[0];

  // Filters State
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('ALL');
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState<string>(
    isTeacher ? currentUser.id : 'ALL'
  );
  const [dateFilterMode, setDateFilterMode] = useState<'ALL' | 'TODAY' | 'WEEK' | 'CUSTOM_DATE'>('ALL');
  const [customDate, setCustomDate] = useState<string>(todayStr);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'TO_VALIDATE' | 'VALIDATED'>('ALL');
  const [validationBanner, setValidationBanner] = useState<string | null>(null);

  const teachers = useMemo(
    () =>
      isTeacher
        ? users.filter((u) => u.id === currentUser?.id)
        : users.filter((u) => u.role === 'TEACHER'),
    [users, isTeacher, currentUser]
  );

  // Compute current week Monday & Sunday for 'WEEK' filter
  const currentWeekBounds = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = (day + 6) % 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - diffToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
      start: monday.toISOString().split('T')[0],
      end: sunday.toISOString().split('T')[0],
    };
  }, []);

  // Filtered Sessions for Daily / Group Quick Validation
  const filteredSessions = useMemo(() => {
    return sessions
      .filter((s) => {
        if (s.status === 'CANCELLED') return false;
        if (isTeacher && s.teacherId !== currentUser?.id) return false;
        if (!isTeacher && selectedTeacherFilter !== 'ALL' && s.teacherId !== selectedTeacherFilter) {
          return false;
        }
        if (selectedGroupFilter !== 'ALL' && !s.groupIds.includes(selectedGroupFilter)) {
          return false;
        }
        if (dateFilterMode === 'TODAY' && s.date !== todayStr) return false;
        if (
          dateFilterMode === 'WEEK' &&
          (s.date < currentWeekBounds.start || s.date > currentWeekBounds.end)
        ) {
          return false;
        }
        if (dateFilterMode === 'CUSTOM_DATE' && s.date !== customDate) return false;

        if (statusFilter === 'TO_VALIDATE' && s.status === 'COMPLETED_VALIDATED') return false;
        if (statusFilter === 'VALIDATED' && s.status !== 'COMPLETED_VALIDATED') return false;

        return true;
      })
      .sort((a, b) => {
        const d = a.date.localeCompare(b.date);
        if (d !== 0) return d;
        return a.startTime.localeCompare(b.startTime);
      });
  }, [
    sessions,
    isTeacher,
    currentUser,
    selectedTeacherFilter,
    selectedGroupFilter,
    dateFilterMode,
    todayStr,
    currentWeekBounds,
    customDate,
    statusFilter,
  ]);

  const unvalidatedFilteredSessions = useMemo(
    () => filteredSessions.filter((s) => s.status !== 'COMPLETED_VALIDATED'),
    [filteredSessions]
  );

  // Group filtered sessions by date for easy day-by-day validation
  const sessionsGroupedByDate = useMemo(() => {
    const map = new Map<string, typeof filteredSessions>();
    filteredSessions.forEach((s) => {
      const list = map.get(s.date) || [];
      list.push(s);
      map.set(s.date, list);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredSessions]);

  const handleBatchValidateAllFiltered = () => {
    if (unvalidatedFilteredSessions.length === 0) return;
    const count = unvalidatedFilteredSessions.length;
    unvalidatedFilteredSessions.forEach((s) => validateSession(s.id));
    setValidationBanner(
      `${count} séance(s) ont été validées comme "Effectuées & Réalisées" en un clic.`
    );
    setTimeout(() => setValidationBanner(null), 4000);
  };

  const handleBatchValidateDay = (dayDate: string, daySessions: typeof filteredSessions) => {
    const pending = daySessions.filter((s) => s.status !== 'COMPLETED_VALIDATED');
    if (pending.length === 0) return;
    pending.forEach((s) => validateSession(s.id));
    setValidationBanner(
      `Toutes les séances du ${new Date(dayDate).toLocaleDateString('fr-FR')} (${pending.length} séance(s)) ont été validées.`
    );
    setTimeout(() => setValidationBanner(null), 4000);
  };

  // Filtered Courses for Course Volume Progress
  const visibleCourses = useMemo(() => {
    return courses.filter((c) => {
      if (isTeacher && !c.teacherIds.includes(currentUser?.id || '')) return false;
      if (!isTeacher && selectedTeacherFilter !== 'ALL' && !c.teacherIds.includes(selectedTeacherFilter)) {
        return false;
      }
      if (selectedGroupFilter !== 'ALL' && !c.groupIds.includes(selectedGroupFilter)) {
        return false;
      }
      return true;
    });
  }, [courses, isTeacher, currentUser, selectedTeacherFilter, selectedGroupFilter]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-950 via-indigo-900 to-slate-900 text-white rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-purple-500/20 text-purple-200 border border-purple-400/30 px-2.5 py-0.5 rounded text-xs font-bold uppercase">
              Pédagogie & Réalisations LMD
            </span>
            <span className="text-xs text-slate-300">Validation Officielle des Heures</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
            <Clock className="w-6 h-6 text-purple-300" />
            Suivi des Volumes Horaires & Validation Quotidienne
          </h1>
          <p className="text-xs sm:text-sm text-purple-200 mt-1">
            Filtrez par groupe, par jour ou par enseignant et validez en 1 clic les séances réalisées chaque jour.
          </p>
        </div>

        {canValidate && unvalidatedFilteredSessions.length > 0 && (
          <button
            type="button"
            onClick={handleBatchValidateAllFiltered}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer shrink-0"
          >
            <CheckSquare className="w-4 h-4" />
            Tout valider ({unvalidatedFilteredSessions.length} séance{unvalidatedFilteredSessions.length > 1 ? 's' : ''})
          </button>
        )}
      </div>

      {validationBanner && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl text-xs font-bold text-emerald-900 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{validationBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setValidationBanner(null)}
            className="text-emerald-700 hover:underline text-[11px]"
          >
            Fermer
          </button>
        </div>
      )}

      {/* Interactive Filter Bar (Par Groupe, Par Jour, Par Enseignant, Par Statut) */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-100">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-purple-600" />
            Filtres Rapides & Sélection par Jour / Groupe
          </span>

          {/* Quick Day Mode Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setDateFilterMode('TODAY')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                dateFilterMode === 'TODAY'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Aujourd'hui ({todayStr})
            </button>
            <button
              type="button"
              onClick={() => setDateFilterMode('WEEK')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                dateFilterMode === 'WEEK'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Cette semaine
            </button>
            <button
              type="button"
              onClick={() => setDateFilterMode('CUSTOM_DATE')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                dateFilterMode === 'CUSTOM_DATE'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Choisir un jour précis
            </button>
            <button
              type="button"
              onClick={() => setDateFilterMode('ALL')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                dateFilterMode === 'ALL'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Tous les jours
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Groupe Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
              Groupe / Promotion
            </label>
            <select
              value={selectedGroupFilter}
              onChange={(e) => setSelectedGroupFilter(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
            >
              <option value="ALL">Tous les groupes ({groups.length})</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.code} — {g.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Picker when CUSTOM_DATE or quick jump */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
              Jour / Date à valider
            </label>
            <input
              type="date"
              value={customDate}
              onChange={(e) => {
                setCustomDate(e.target.value);
                setDateFilterMode('CUSTOM_DATE');
              }}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-800"
            />
          </div>

          {/* Teacher Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
              Enseignant
            </label>
            <select
              value={isTeacher ? currentUser.id : selectedTeacherFilter}
              onChange={(e) => !isTeacher && setSelectedTeacherFilter(e.target.value)}
              disabled={isTeacher}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 disabled:opacity-60"
            >
              {!isTeacher && <option value="ALL">Tous les enseignants ({teachers.length})</option>}
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
              Statut de validation
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
            >
              <option value="ALL">Toutes les séances ({filteredSessions.length})</option>
              <option value="TO_VALIDATE">À valider uniquement ({unvalidatedFilteredSessions.length})</option>
              <option value="VALIDATED">Déjà validées uniquement</option>
            </select>
          </div>
        </div>
      </div>

      {/* SECTION 1: VALIDATION QUOTIDIENNE PAR JOUR & PAR GROUPE */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              Validation Rapide des Séances par Jour & par Groupe
            </h3>
            <p className="text-xs text-slate-500">
              Validez individuellement chaque cours ou validez toute une journée en un seul clic pour incrémenter les heures réalisées.
            </p>
          </div>
          <span className="text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-full border border-purple-200">
            {filteredSessions.length} séance(s) affichée(s) • {unvalidatedFilteredSessions.length} en attente de validation
          </span>
        </div>

        {sessionsGroupedByDate.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            Aucune séance ne correspond aux filtres sélectionnés (Groupe / Jour / Statut).
          </div>
        ) : (
          <div className="space-y-4">
            {sessionsGroupedByDate.map(([dayDate, daySessions]) => {
              const pendingInDay = daySessions.filter((s) => s.status !== 'COMPLETED_VALIDATED');
              const totalHoursDay = daySessions.reduce((acc, s) => acc + (s.durationHours || 2), 0);
              const validatedHoursDay = daySessions
                .filter((s) => s.status === 'COMPLETED_VALIDATED')
                .reduce((acc, s) => acc + (s.durationHours || 2), 0);

              return (
                <div
                  key={dayDate}
                  className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs"
                >
                  {/* Day Header Bar */}
                  <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="p-1.5 bg-purple-100 text-purple-700 rounded-lg">
                        <Calendar className="w-4 h-4" />
                      </span>
                      <div>
                        <span className="font-black text-xs sm:text-sm text-slate-900 capitalize">
                          {new Date(dayDate).toLocaleDateString('fr-FR', {
                            weekday: 'long',
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </span>
                        <span className="text-[11px] text-slate-500 ml-2 font-semibold">
                          ({validatedHoursDay}h validées / {totalHoursDay}h prévues)
                        </span>
                      </div>
                    </div>

                    {canValidate && pendingInDay.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => handleBatchValidateDay(dayDate, daySessions)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckSquare className="w-3.5 h-3.5" />
                        Valider tout ce jour ({pendingInDay.length} séance{pendingInDay.length > 1 ? 's' : ''})
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Journée 100% validée
                      </span>
                    )}
                  </div>

                  {/* Day Sessions List */}
                  <div className="divide-y divide-slate-100">
                    {daySessions.map((session) => {
                      const course = courses.find((c) => c.id === session.courseId);
                      const teacher = users.find((u) => u.id === session.teacherId);
                      const room = rooms.find((r) => r.id === session.roomId);
                      const groupBadges = session.groupIds
                        .map((gid) => groups.find((g) => g.id === gid)?.code || gid)
                        .join(', ');
                      const isValidated = session.status === 'COMPLETED_VALIDATED';

                      return (
                        <div
                          key={session.id}
                          className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors ${
                            isValidated ? 'bg-emerald-50/30' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono font-bold text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                                {session.startTime} - {session.endTime} ({session.durationHours}h)
                              </span>
                              <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-800 font-bold border border-purple-200 flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {groupBadges}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-slate-500" />
                                {room?.name || session.roomId}
                              </span>
                            </div>

                            <div className="font-bold text-sm text-slate-900">
                              {session.eventTitle || course?.title || 'Séance de cours'}{' '}
                              {course?.code && (
                                <span className="text-xs font-mono text-slate-500">({course.code})</span>
                              )}
                            </div>

                            <div className="text-[11px] text-slate-500">
                              Enseignant : <strong className="text-slate-700">{session.eventSpeaker || teacher?.name || 'N/A'}</strong>
                              {session.notes && <span> • Note : {session.notes}</span>}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {isValidated ? (
                              <span className="px-3 py-1.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl font-bold text-xs flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                Réalisé & Validé (+{session.durationHours}h)
                              </span>
                            ) : canValidate ? (
                              <button
                                type="button"
                                onClick={() => {
                                  validateSession(session.id);
                                  setValidationBanner(
                                    `Séance "${session.eventTitle || course?.title}" (${session.durationHours}h) validée.`
                                  );
                                  setTimeout(() => setValidationBanner(null), 3000);
                                }}
                                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                Valider cette séance ({session.durationHours}h)
                              </button>
                            ) : (
                              <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg font-semibold">
                                En attente de validation
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 2: Course Volume Progress */}
      <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Suivi des Volumes Horaires par Matière (EC)
              </h3>
              <p className="text-xs text-slate-500">
                Comparaison temps réel : Heures totales prévues vs Planifiées vs Réalisées & Validées
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visibleCourses.map((course) => {
            const stats = getCourseHourlyStats(course.id);
            const teacherNames = course.teacherIds
              .map((tid) => users.find((u) => u.id === tid)?.name)
              .filter(Boolean)
              .join(', ');
            const groupCodes = course.groupIds
              .map((gid) => groups.find((g) => g.id === gid)?.code || gid)
              .join(', ');

            const scheduledPercent = Math.min(
              100,
              Math.round((stats.scheduledHours / stats.totalHours) * 100)
            );
            const completedPercent = Math.min(
              100,
              Math.round((stats.completedHours / stats.totalHours) * 100)
            );

            return (
              <div
                key={course.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md">
                        {course.code}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-100 text-purple-800 rounded-md">
                        {groupCodes}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm mt-1">
                      {course.title}
                    </h4>
                    <p className="text-xs text-slate-500">{teacherNames}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-extrabold text-slate-900">
                      {stats.completedHours}h / {stats.totalHours}h
                    </span>
                    <span className="block text-[10px] text-slate-500">
                      Restant à planifier : {stats.remainingToSchedule}h
                    </span>
                  </div>
                </div>

                {/* Progress Bars */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-medium">
                    <span className="text-blue-700">
                      Planifié : {stats.scheduledHours}h ({scheduledPercent}%)
                    </span>
                    <span className="text-emerald-700">
                      Effectué validé : {stats.completedHours}h ({completedPercent}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden flex">
                    <div
                      style={{ width: `${completedPercent}%` }}
                      className="bg-emerald-600 h-full transition-all duration-300"
                      title={`Validé : ${stats.completedHours}h`}
                    />
                    <div
                      style={{
                        width: `${Math.max(0, scheduledPercent - completedPercent)}%`,
                      }}
                      className="bg-blue-500 h-full transition-all duration-300"
                      title={`Planifié : ${stats.scheduledHours - stats.completedHours}h`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 3: Teacher Hourly Load & Quota */}
      <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="p-2 bg-purple-100 text-purple-700 rounded-xl">
            <UserIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Charge Horaire des Enseignants
            </h3>
            <p className="text-xs text-slate-500">
              Suivi des heures planifiées et validées par enseignant par rapport à leur quota hebdomadaire
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {teachers.map((teacher) => {
            const tStats = getTeacherHourlyStats(teacher.id);
            const isOverloaded = tStats.totalScheduled > tStats.maxWeekly;

            return (
              <div
                key={teacher.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900">
                    {teacher.name}
                  </span>
                  {isOverloaded ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                      <AlertCircle className="w-3 h-3" /> Dépassement
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      <CheckCircle2 className="w-3 h-3" /> Quota OK
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                  <div className="p-2 bg-white rounded-lg border border-slate-200/80">
                    <span className="block text-[10px] text-slate-500">Planifié</span>
                    <span className="font-extrabold text-sm text-blue-700">
                      {tStats.totalScheduled}h
                    </span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200/80">
                    <span className="block text-[10px] text-slate-500">Validé</span>
                    <span className="font-extrabold text-sm text-emerald-700">
                      {tStats.totalCompleted}h
                    </span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200/80">
                    <span className="block text-[10px] text-slate-500">Quota Max</span>
                    <span className="font-extrabold text-sm text-slate-800">
                      {tStats.maxWeekly}h
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
