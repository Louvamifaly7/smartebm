import React from 'react';
import { useApp } from '../context/AppContext';
import {
  Calendar,
  Clock,
  MapPin,
  User as UserIcon,
  Shield,
  Bell,
  Smartphone,
  ChevronRight,
  Sparkles,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Users,
  Database,
  ArrowRight,
  CalendarDays,
  Activity,
  Layers,
  Award,
  QrCode,
  Banknote,
  MessageSquare,
  FileSpreadsheet,
  History,
  GraduationCap,
} from 'lucide-react';
import { createGoogleCalendarUrl } from '../utils/calendarExport';
import { getAntananarivoDateStr } from '../utils/securityAndDateUtils';
import { PWAInstallButton } from './PWAInstallButton';

interface HomePageProps {
  onNavigateTab: (tab: string) => void;
  onOpenNotifications: () => void;
  onOpenReceptionTests: () => void;
  onOpenUserProfile?: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onNavigateTab,
  onOpenNotifications,
  onOpenReceptionTests,
  onOpenUserProfile,
}) => {
  const {
    currentUser,
    sessions,
    courses,
    rooms,
    users,
    groups,
    notifications,
    homework,
    qrSessions,
    fees,
    getStudentFinancialSummary,
    toggleAndroidView,
    getCourseHourlyStats,
    getTeacherHourlyStats,
  } = useApp();

  if (!currentUser) return null;

  const todayStr = getAntananarivoDateStr();

  // Filter sessions according to role
  const userSessions = sessions.filter((session) => {
    if (currentUser.role === 'ADMIN' || currentUser.role === 'SCHEDULER' || currentUser.role === 'ACADEMIC_HEAD') {
      return true;
    }
    if (currentUser.role === 'TEACHER') {
      return session.teacherId === currentUser.id;
    }
    if (currentUser.role === 'STUDENT') {
      return currentUser.groupId ? session.groupIds.includes(currentUser.groupId) : false;
    }
    return true;
  });

  const todaySessions = userSessions
    .filter((s) => s.date === todayStr)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const upcomingSessions = userSessions
    .filter((s) => s.date >= todayStr && s.status !== 'CANCELLED')
    .slice(0, 4);

  const userNotifs = notifications.filter(
    (n) => n.recipientId === currentUser.id || n.recipientRole === currentUser.role || !n.recipientId
  );
  const unreadNotifs = userNotifs.filter((n) => !n.isReadWeb);

  const cancelledCount = userSessions.filter((s) => s.status === 'CANCELLED').length;
  const rescheduledCount = userSessions.filter((s) => s.status === 'RESCHEDULED').length;

  return (
    <div className="space-y-6">
      
      {/* 1. Institutional Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-blue-800/40">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-500/20 via-transparent to-transparent pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={onOpenUserProfile}
                className="px-3 py-1 bg-blue-800/80 hover:bg-blue-700 text-blue-200 font-semibold text-xs rounded-lg border border-blue-700/60 cursor-pointer transition-colors"
                title="Ouvrir ma Fiche Officielle Utilisateur"
              >
                {currentUser.role === 'STUDENT'
                  ? `Matricule : ${currentUser.matricule}`
                  : currentUser.role === 'PARENT'
                  ? 'Compte Parent / Tuteur Légal Vérifié'
                  : currentUser.role}
              </button>
              {currentUser.highestDiploma && (
                <span className="px-2.5 py-1 bg-indigo-800/80 text-amber-200 font-bold text-xs rounded-lg border border-indigo-600/60">
                  🎓 Diplôme : {currentUser.highestDiploma}
                </span>
              )}
            </div>

            <h1
              onClick={onOpenUserProfile}
              className="text-2xl sm:text-3xl font-black tracking-tight text-white hover:text-amber-300 transition-colors cursor-pointer inline-flex items-center gap-2"
              title="Cliquez pour afficher votre Fiche Officielle Utilisateur complète"
            >
              Bonjour, {currentUser.name} 👋
            </h1>

            <p className="text-sm text-blue-200 max-w-2xl leading-relaxed">
              Bienvenue sur votre portail unifié <strong>EBM Institute</strong>. Cliquez sur votre nom ou sur le bouton à droite pour afficher votre <strong>Fiche Officielle Utilisateur</strong> complète (état civil, diplôme le plus élevé, contacts, CV et disponibilités).
            </p>
          </div>

          {/* Quick Dual Mode Action on Banner */}
          <div className="flex flex-col sm:flex-row md:flex-col gap-2 flex-shrink-0">
            <PWAInstallButton />
            <button
              onClick={onOpenUserProfile}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserIcon className="w-4 h-4 text-slate-950" />
              Fiche Officielle Utilisateur Complète
            </button>
            <button
              onClick={() => onNavigateTab('TIMETABLE')}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs rounded-xl border border-white/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Calendar className="w-4 h-4" />
              Consulter l'emploi du temps
            </button>
          </div>
        </div>
      </div>

      {/* 2. Critical Course Change Alert (if any cancelled or rescheduled) */}
      {(cancelledCount > 0 || rescheduledCount > 0) && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex items-center justify-between gap-4 text-xs text-amber-950 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500 text-white rounded-xl">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-amber-900">
                Modifications récentes de votre emploi du temps
              </h4>
              <p className="text-slate-700 mt-0.5">
                {cancelledCount > 0 && <span><strong>{cancelledCount}</strong> séance(s) annulée(s) • </span>}
                {rescheduledCount > 0 && <span><strong>{rescheduledCount}</strong> séance(s) reportée(s) avec notification automatique.</span>}
              </p>
            </div>
          </div>
          <button
            onClick={onOpenNotifications}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs whitespace-nowrap transition-colors"
          >
            Voir les alertes ({unreadNotifs.length})
          </button>
        </div>
      )}

      {/* 3. Role-Adapted KPIs Section */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* KPI 1 */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Cours aujourd'hui</span>
            <div className="p-1.5 bg-blue-50 text-blue-700 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{todaySessions.length}</div>
          <p className="text-[11px] text-slate-500 mt-1">
            {todaySessions.length === 0 ? 'Aucun cours programmé ce jour' : 'Séances prévues dans votre planning'}
          </p>
        </div>

        {/* KPI 2 */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Salles de cours</span>
            <div className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
              <MapPin className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{rooms.length}</div>
          <p className="text-[11px] text-slate-500 mt-1">
            Chaque salle avec calendrier dédié
          </p>
        </div>

        {/* KPI 3 */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Matières</span>
            <div className="p-1.5 bg-purple-50 text-purple-700 rounded-lg">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{courses.length}</div>
          <p className="text-[11px] text-slate-500 mt-1">
            Suivi des heures & validation officielle
          </p>
        </div>

        {/* KPI 4 */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Alertes Push & Web</span>
            <div className="p-1.5 bg-amber-50 text-amber-700 rounded-lg">
              <Bell className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{userNotifs.length}</div>
          <p className="text-[11px] text-slate-500 mt-1">
            {unreadNotifs.length} non lue{unreadNotifs.length > 1 ? 's' : ''} • Synchronisées Web & Android
          </p>
        </div>
      </div>

      {/* 3b. Role-Tailored Priority Cockpit & Pilotage Dashboard */}
      {(() => {
        const nowHour = new Date().getHours();
        const currentSlotStr = `${String(Math.max(8, Math.min(18, nowHour))).padStart(2, '0')}:00`;
        const occupiedRoomIdsNow = new Set(
          sessions
            .filter(
              (s) =>
                s.date === todayStr &&
                s.status !== 'CANCELLED' &&
                s.startTime <= currentSlotStr &&
                s.endTime > currentSlotStr
            )
            .map((s) => s.roomId)
        );
        const freeRoomsNow = rooms.filter(
          (r) => r.status === 'available' && !occupiedRoomIdsNow.has(r.id)
        );

        // Total hours completed vs planned across all courses
        const totalPlannedHours = courses.reduce((acc, c) => acc + c.totalHours, 0);
        const totalCompletedHours = courses.reduce(
          (acc, c) => acc + getCourseHourlyStats(c.id).completedHours,
          0
        );
        const globalCompletionPct =
          totalPlannedHours > 0 ? Math.round((totalCompletedHours / totalPlannedHours) * 100) : 0;

        // Students at risk (absences >= 2 or unpaid > 500 000 Ar)
        const allStudents = users.filter((u) => u.role === 'STUDENT');
        const atRiskStudents = allStudents
          .map((st) => {
            let absences = 0;
            qrSessions.forEach((qs) => {
              const rec = qs.records.find((r) => r.studentId === st.id);
              if (rec && rec.status === 'ABSENT') absences += 1;
            });
            const fin = getStudentFinancialSummary(st.id);
            return {
              student: st,
              absences,
              unpaidAr: fin.balanceDueAr,
              isAtRisk: absences >= 2 || fin.balanceDueAr >= 500000,
            };
          })
          .filter((item) => item.isAtRisk);

        if (currentUser.role === 'TEACHER') {
          const tStats = getTeacherHourlyStats(currentUser.id);
          const weeklyMax = currentUser.weeklyMaxHours || 18;
          const hourlyRate = currentUser.hourlyRateAr || 40000;
          const overtimeHours = Math.max(0, tStats.totalCompleted - weeklyMax);
          const overtimePayAr = overtimeHours * hourlyRate;
          const earnedAmountAr = tStats.totalCompleted * hourlyRate;
          return (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-sm font-black text-slate-900">
                    Mon Espace Enseignant — Prochains Cours & Charge Horaire
                  </h2>
                  <p className="text-xs text-slate-500">
                    Suivi en direct de vos séances, de votre quota hebdomadaire ({weeklyMax}h/sem) et de vos vacations.
                  </p>
                </div>
                <button
                  onClick={() => onNavigateTab('TEACHERS')}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer self-start"
                >
                  Ma Fiche & Heures Sup.
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="text-slate-500 font-semibold">Heures Réalisées / Planifiées</div>
                  <div className="text-xl font-black text-slate-900 tabular-nums">
                    {tStats.totalCompleted}h / {tStats.totalScheduled}h
                  </div>
                  <div className="text-[11px] text-emerald-700 font-semibold">
                    Rémunération validée : {earnedAmountAr.toLocaleString('fr-FR')} Ar
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="text-slate-500 font-semibold">Heures Supplémentaires à payer</div>
                  <div className="text-xl font-black text-amber-700 tabular-nums">{overtimeHours}h sup.</div>
                  <div className="text-[11px] text-slate-600">
                    Montant estimé : <strong>{overtimePayAr.toLocaleString('fr-FR')} Ar</strong>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="text-slate-500 font-semibold">Salles libres maintenant ({currentSlotStr})</div>
                  <div className="text-xl font-black text-emerald-700 tabular-nums">
                    {freeRoomsNow.length} / {rooms.length} libres
                  </div>
                  <div className="text-[11px] text-slate-600 truncate">
                    {freeRoomsNow.map((r) => r.name).join(' · ') || 'Aucune salle libre'}
                  </div>
                </div>
              </div>
            </div>
          );
        }

        if (currentUser.role === 'STUDENT') {
          const fin = getStudentFinancialSummary(currentUser.id);
          const myHomeworks = homework
            .filter((h) => !currentUser.groupId || h.groupId === currentUser.groupId)
            .slice(0, 3);
          return (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-sm font-black text-slate-900">
                    Mon Espace Étudiant — Cours du Jour & Échéances Proches
                  </h2>
                  <p className="text-xs text-slate-500">
                    Emploi du temps consultable hors ligne, devoirs à remettre et situation financière.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => onNavigateTab('MY_COURSES')}
                    className="px-3.5 py-1.5 rounded-xl bg-[#17345B] hover:bg-blue-950 text-white text-xs font-bold cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Suivi des cours & CR</span>
                  </button>
                  <button
                    onClick={() => onNavigateTab('HOMEWORK_RESOURCES')}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
                  >
                    Mes Devoirs ({myHomeworks.length})
                  </button>
                  <button
                    onClick={() => onNavigateTab('FINANCIAL')}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
                  >
                    Mes Frais (Ar)
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="text-slate-500 font-semibold">Cours prévus aujourd'hui</div>
                  <div className="text-xl font-black text-slate-900 tabular-nums">{todaySessions.length} séance(s)</div>
                  <div className="text-[11px] text-slate-600">
                    {todaySessions[0]
                      ? `Prochain : ${todaySessions[0].startTime} - ${todaySessions[0].endTime}`
                      : 'Journée libre'}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="text-slate-500 font-semibold">Devoirs & Travaux à rendre</div>
                  <div className="text-xl font-black text-indigo-700 tabular-nums">{myHomeworks.length}</div>
                  <div className="text-[11px] text-slate-600 truncate">
                    {myHomeworks[0] ? `À rendre : ${myHomeworks[0].title} (${myHomeworks[0].dueDate})` : 'Aucun devoir en attente'}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="text-slate-500 font-semibold">Solde Écolage & Frais</div>
                  <div
                    className={`text-xl font-black tabular-nums ${
                      fin.balanceDueAr > 0 ? 'text-amber-700' : 'text-emerald-700'
                    }`}
                  >
                    {fin.balanceDueAr > 0
                      ? `${fin.balanceDueAr.toLocaleString('fr-FR')} Ar à régler`
                      : '100% Soldé'}
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Payé : {fin.totalPaidAr.toLocaleString('fr-FR')} Ar
                  </div>
                </div>
              </div>
            </div>
          );
        }

        if (currentUser.role === 'FINANCE') {
          const totalUnpaidAll = allStudents.reduce(
            (acc, st) => acc + getStudentFinancialSummary(st.id).balanceDueAr,
            0
          );
          const overdueFeesCount = fees.filter((f) => f.dueDate <= todayStr).length;
          return (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-sm font-black text-slate-900">
                    Pilotage Caisse & Finances — Impayés du Jour & Mobile Money
                  </h2>
                  <p className="text-xs text-slate-500">
                    Suivi des échéances dépassées, relances WhatsApp/SMS et rapprochement MVola / Orange Money / Airtel Money.
                  </p>
                </div>
                <button
                  onClick={() => onNavigateTab('FINANCIAL')}
                  className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold cursor-pointer self-start"
                >
                  Ouvrir la Caisse & Rapprochement Mobile Money
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="text-slate-500 font-semibold">Reste à recouvrer global</div>
                  <div className="text-xl font-black text-rose-700 tabular-nums">
                    {totalUnpaidAll.toLocaleString('fr-FR')} Ar
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Sur {allStudents.length} dossiers étudiants actifs
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="text-slate-500 font-semibold">Étudiants avec impayés critiques</div>
                  <div className="text-xl font-black text-amber-700 tabular-nums">
                    {atRiskStudents.filter((s) => s.unpaidAr > 0).length} étudiant(s)
                  </div>
                  <div className="text-[11px] text-slate-600">Relance WhatsApp / SMS directe disponible</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="text-slate-500 font-semibold">Échéances échues ou du jour</div>
                  <div className="text-xl font-black text-slate-900 tabular-nums">{overdueFeesCount} tranche(s)</div>
                  <div className="text-[11px] text-slate-600">Reçu PDF automatique avec QR de contrôle</div>
                </div>
              </div>
            </div>
          );
        }

        // Default for ADMIN / SCOLARITE / SCHEDULER / ACADEMIC_HEAD / ADMIN_STAFF: Executive Pilotage Dashboard
        const roomOccupancyRate =
          rooms.length > 0 ? Math.round((occupiedRoomIdsNow.size / rooms.length) * 100) : 0;

        return (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-black text-slate-900">
                  Tableau de Bord de Pilotage Direction & Scolarité
                </h2>
                <p className="text-xs text-slate-500">
                  Indicateurs temps réel : taux d'occupation des salles, heures réalisées contre prévues, et étudiants à risque.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => onNavigateTab('ROOMS')}
                  className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold cursor-pointer"
                >
                  Salles libres ({freeRoomsNow.length})
                </button>
                <button
                  onClick={() => onNavigateTab('VOLUMES')}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
                >
                  Volumes Horaires ({globalCompletionPct}%)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between text-slate-500 font-semibold">
                  <span>Occupation des salles ({currentSlotStr})</span>
                  <span className="font-mono font-bold text-slate-900 tabular-nums">{roomOccupancyRate}%</span>
                </div>
                <div className="text-lg font-black text-emerald-700 tabular-nums">
                  {freeRoomsNow.length} salle(s) libre(s) maintenant
                </div>
                <div className="text-[11px] text-slate-600 truncate">
                  Libres : {freeRoomsNow.map((r) => r.name).join(' · ') || 'Toutes occupées'}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between text-slate-500 font-semibold">
                  <span>Heures réalisées contre prévues</span>
                  <span className="font-mono font-bold text-blue-700 tabular-nums">{globalCompletionPct}%</span>
                </div>
                <div className="text-lg font-black text-slate-900 tabular-nums">
                  {totalCompletedHours}h réalisées / {totalPlannedHours}h prévues
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full"
                    style={{ width: `${Math.min(100, globalCompletionPct)}%` }}
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between text-slate-500 font-semibold">
                  <span>Étudiants à risque (Assiduité / Écolage)</span>
                  <button
                    onClick={() => onNavigateTab('STUDENTS')}
                    className="text-blue-600 hover:underline font-bold cursor-pointer"
                  >
                    Voir la liste
                  </button>
                </div>
                <div className="text-lg font-black text-rose-700 tabular-nums">
                  {atRiskStudents.length} étudiant(s) signalé(s)
                </div>
                <div className="text-[11px] text-slate-600 truncate">
                  {atRiskStudents
                    .slice(0, 2)
                    .map(
                      (a) =>
                        `${a.student.name} (${a.absences} abs., ${(a.unpaidAr / 1000).toFixed(0)}k Ar impayé)`
                    )
                    .join(' · ') || 'Aucun étudiant en situation critique'}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 4. Structured Role-Based Workspace Hub (Conforme Cahier des Charges Complémentaire Section 17) */}
      <div className="space-y-6">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <div>
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              Espaces de Travail & Modules {currentUser.role === 'STUDENT' ? 'Étudiants' : 'Universitaires'}
            </h2>
            <p className="text-xs text-slate-500">
              Organisation thématique par pôles de responsabilité selon vos habilitations ({currentUser.role}).
            </p>
          </div>
          <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
            {currentUser.role === 'STUDENT' ? 'Parcours Étudiant' : 'Portail Général'}
          </span>
        </div>

        {/* --- STUDENT VIEW --- */}
        {currentUser.role === 'STUDENT' ? (
          <div className="space-y-5">
            {/* Pole 1: Mon Parcours Académique & Présences */}
            <div className="space-y-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-800 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
                Pôle Académique, Cours & Présences
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div
                  onClick={() => onNavigateTab('TIMETABLE')}
                  className="p-3.5 bg-white hover:bg-blue-50/50 rounded-2xl border border-slate-200 hover:border-blue-300 shadow-xs transition-all cursor-pointer group flex items-start justify-between"
                >
                  <div className="space-y-1">
                    <div className="p-2 w-8 h-8 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center font-bold">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-xs text-slate-900 group-hover:text-blue-700">Mon Emploi du Temps</h3>
                    <p className="text-[11px] text-slate-500">Séances hebdomadaires de mon groupe inscrit.</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-all" />
                </div>

                <div
                  onClick={() => onNavigateTab('LMD_MAQUETTES')}
                  className="p-3.5 bg-white hover:bg-indigo-50/50 rounded-2xl border border-slate-200 hover:border-indigo-300 shadow-xs transition-all cursor-pointer group flex items-start justify-between"
                >
                  <div className="space-y-1">
                    <div className="p-2 w-8 h-8 bg-indigo-100 text-indigo-700 rounded-xl flex items-center justify-center font-bold">
                      <Layers className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-xs text-slate-900 group-hover:text-indigo-700">Maquette LMD & ECTS</h3>
                    <p className="text-[11px] text-slate-500">UEs, ECs et crédits de ma formation.</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-all" />
                </div>

                <div
                  onClick={() => onNavigateTab('GRADES')}
                  className="p-3.5 bg-white hover:bg-amber-50/50 rounded-2xl border border-slate-200 hover:border-amber-300 shadow-xs transition-all cursor-pointer group flex items-start justify-between"
                >
                  <div className="space-y-1">
                    <div className="p-2 w-8 h-8 bg-amber-100 text-amber-700 rounded-xl flex items-center justify-center font-bold">
                      <Award className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-xs text-slate-900 group-hover:text-amber-700">Mes Notes & Relevés</h3>
                    <p className="text-[11px] text-slate-500">Moyennes, crédits ECTS et relevés officiels.</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-all" />
                </div>

                <div
                  onClick={() => onNavigateTab('HOMEWORK_RESOURCES')}
                  className="p-3.5 bg-white hover:bg-blue-50/50 rounded-2xl border border-slate-200 hover:border-blue-300 shadow-xs transition-all cursor-pointer group flex items-start justify-between"
                >
                  <div className="space-y-1">
                    <div className="p-2 w-8 h-8 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center font-bold">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-xs text-slate-900 group-hover:text-blue-700">Devoirs & Supports</h3>
                    <p className="text-[11px] text-slate-500">Dépôts de devoirs et fichiers de cours.</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-all" />
                </div>

                <div
                  onClick={() => onNavigateTab('QR_ATTENDANCE')}
                  className="p-3.5 bg-white hover:bg-emerald-50/50 rounded-2xl border border-slate-200 hover:border-emerald-300 shadow-xs transition-all cursor-pointer group flex items-start justify-between"
                >
                  <div className="space-y-1">
                    <div className="p-2 w-8 h-8 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center font-bold">
                      <QrCode className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-xs text-slate-900 group-hover:text-emerald-700">Pointage des Présences</h3>
                    <p className="text-[11px] text-slate-500">Scan QR Code dynamique et code OTP.</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </div>

            {/* Pole 2 (Separated): Pôle Finances & Caisse vs Pôle Communication */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Pôle Finances & Caisse */}
              <div className="space-y-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                  <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                  Pôle Finances & Caisse
                </span>
                <div className="grid grid-cols-1 gap-3">
                  <div
                    onClick={() => onNavigateTab('FINANCIAL')}
                    className="p-3.5 bg-white hover:bg-emerald-50/50 rounded-2xl border border-slate-200 hover:border-emerald-300 shadow-xs transition-all cursor-pointer group flex items-start justify-between"
                  >
                    <div className="space-y-1">
                      <div className="p-2 w-8 h-8 bg-emerald-100 text-emerald-800 rounded-xl flex items-center justify-center font-bold">
                        <Banknote className="w-4 h-4" />
                      </div>
                      <h3 className="font-bold text-xs text-slate-900 group-hover:text-emerald-800">Ma Situation Financière & Caisse (Ar)</h3>
                      <p className="text-[11px] text-slate-500">Frais de scolarité en Ariary, échéancier, solde dû et reçus officiels.</p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </div>

              {/* Pôle Communication */}
              <div className="space-y-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-800 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-purple-600" />
                  Pôle Communication
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => onNavigateTab('COMMUNICATION')}
                    className="p-3.5 bg-white hover:bg-purple-50/50 rounded-2xl border border-slate-200 hover:border-purple-300 shadow-xs transition-all cursor-pointer group flex items-start justify-between"
                  >
                    <div className="space-y-1">
                      <div className="p-2 w-8 h-8 bg-purple-100 text-purple-700 rounded-xl flex items-center justify-center font-bold">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <h3 className="font-bold text-xs text-slate-900 group-hover:text-purple-700">Mur de Promo & Messagerie</h3>
                      <p className="text-[11px] text-slate-500">Publications de mon groupe et échanges avec mes enseignants.</p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-all" />
                  </div>

                  <div
                    onClick={onOpenNotifications}
                    className="p-3.5 bg-white hover:bg-purple-50/50 rounded-2xl border border-slate-200 hover:border-purple-300 shadow-xs transition-all cursor-pointer group flex items-start justify-between"
                  >
                    <div className="space-y-1">
                      <div className="p-2 w-8 h-8 bg-purple-100 text-purple-700 rounded-xl flex items-center justify-center font-bold">
                        <Bell className="w-4 h-4" />
                      </div>
                      <h3 className="font-bold text-xs text-slate-900 group-hover:text-purple-700">Annonces & Alertes Push</h3>
                      <p className="text-[11px] text-slate-500">Notifications officielles et alertes de cours ({unreadNotifs.length} non lues).</p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : currentUser.role === 'PARENT' ? (
          /* --- PARENT / GUARDIAN VIEW --- */
          <div className="space-y-5">
            <div className="p-5 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-100 px-2.5 py-0.5 rounded-full">
                  Espace Parents & Tuteurs Officiel
                </span>
                <h3 className="text-base font-black text-slate-900">
                  Suivi Scolaire, Assiduité & Situation Financière de vos Enfants
                </h3>
                <p className="text-xs text-slate-600">
                  Consultez les notes, moyennes, présences, emplois du temps, écolages en Ariary et reçus officiels de chaque étudiant rattaché à votre compte.
                </p>
              </div>
              <button
                onClick={() => onNavigateTab('PARENT_PORTAL')}
                className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 whitespace-nowrap cursor-pointer"
              >
                <Users className="w-4 h-4" />
                Ouvrir l'Espace Parents / Tuteurs
              </button>
            </div>
          </div>
        ) : (
          /* --- STAFF, TEACHER & ADMIN VIEW --- */
          <div className="space-y-6">
            
            {/* Cluster 1: Planning & Espaces */}
            {['ADMIN', 'SCOLARITE', 'SCHEDULER', 'ACADEMIC_HEAD', 'TEACHER'].includes(currentUser.role) && (
              <div className="space-y-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  Pôle Planning, Espaces & Présences
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div
                    onClick={() => onNavigateTab('TIMETABLE')}
                    className="p-3.5 bg-white hover:bg-blue-50/50 rounded-2xl border border-slate-200 hover:border-blue-300 shadow-xs transition-all cursor-pointer group flex items-start justify-between"
                  >
                    <div className="space-y-1">
                      <div className="p-2 w-8 h-8 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center font-bold">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <h3 className="font-bold text-xs text-slate-900 group-hover:text-blue-700">Emploi du Temps</h3>
                      <p className="text-[11px] text-slate-500">Grille hebdomadaire, filtres et gestion des séances.</p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-all" />
                  </div>

                  <div
                    onClick={() => onNavigateTab('ROOMS')}
                    className="p-3.5 bg-white hover:bg-emerald-50/50 rounded-2xl border border-slate-200 hover:border-emerald-300 shadow-xs transition-all cursor-pointer group flex items-start justify-between"
                  >
                    <div className="space-y-1">
                      <div className="p-2 w-8 h-8 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center font-bold">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <h3 className="font-bold text-xs text-slate-900 group-hover:text-emerald-700">Salles & Calendriers</h3>
                      <p className="text-[11px] text-slate-500">Planning distinct pour chaque salle et équipements.</p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-all" />
                  </div>

                  {['ADMIN', 'SCOLARITE', 'SCHEDULER', 'ACADEMIC_HEAD'].includes(currentUser.role) && (
                    <div
                      onClick={() => onNavigateTab('VOLUMES')}
                      className="p-3.5 bg-white hover:bg-purple-50/50 rounded-2xl border border-slate-200 hover:border-purple-300 shadow-xs transition-all cursor-pointer group flex items-start justify-between"
                    >
                      <div className="space-y-1">
                        <div className="p-2 w-8 h-8 bg-purple-100 text-purple-700 rounded-xl flex items-center justify-center font-bold">
                          <Clock className="w-4 h-4" />
                        </div>
                        <h3 className="font-bold text-xs text-slate-900 group-hover:text-purple-700">Volumes Horaires</h3>
                        <p className="text-[11px] text-slate-500">Suivi des heures prévues, programmées et réalisées.</p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-all" />
                    </div>
                  )}

                  <div
                    onClick={() => onNavigateTab('QR_ATTENDANCE')}
                    className="p-3.5 bg-white hover:bg-emerald-50/50 rounded-2xl border border-slate-200 hover:border-emerald-300 shadow-xs transition-all cursor-pointer group flex items-start justify-between"
                  >
                    <div className="space-y-1">
                      <div className="p-2 w-8 h-8 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center font-bold">
                        <QrCode className="w-4 h-4" />
                      </div>
                      <h3 className="font-bold text-xs text-slate-900 group-hover:text-emerald-700">Pointage QR Dynamique</h3>
                      <p className="text-[11px] text-slate-500">Projection grand écran, compte à rebours et OTP.</p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </div>
            )}

            {/* Cluster 2: Pédagogie & Cursus LMD */}
            {['ADMIN', 'SCOLARITE', 'SCHEDULER', 'ACADEMIC_HEAD', 'TEACHER'].includes(currentUser.role) && (
              <div className="space-y-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                  Pôle Pédagogie, Examens & Maquettes LMD
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {currentUser.role !== 'TEACHER' && (
                    <div
                      onClick={() => onNavigateTab('LMD_MAQUETTES')}
                      className="p-3.5 bg-white hover:bg-indigo-50/50 rounded-2xl border border-slate-200 hover:border-indigo-300 shadow-xs transition-all cursor-pointer group flex items-start justify-between"
                    >
                      <div className="space-y-1">
                        <div className="p-2 w-8 h-8 bg-indigo-100 text-indigo-700 rounded-xl flex items-center justify-center font-bold">
                          <Layers className="w-4 h-4" />
                        </div>
                        <h3 className="font-bold text-xs text-slate-900 group-hover:text-indigo-700">Maquettes LMD & ECTS</h3>
                        <p className="text-[11px] text-slate-500">UE, EC, crédits et duplication de maquette annuelle.</p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-all" />
                    </div>
                  )}

                  <div
                    onClick={() => onNavigateTab('GRADES')}
                    className="p-3.5 bg-white hover:bg-amber-50/50 rounded-2xl border border-slate-200 hover:border-amber-300 shadow-xs transition-all cursor-pointer group flex items-start justify-between"
                  >
                    <div className="space-y-1">
                      <div className="p-2 w-8 h-8 bg-amber-100 text-amber-700 rounded-xl flex items-center justify-center font-bold">
                        <Award className="w-4 h-4" />
                      </div>
                      <h3 className="font-bold text-xs text-slate-900 group-hover:text-amber-700">Notes, Relevés & Délibérations</h3>
                      <p className="text-[11px] text-slate-500">Saisie des notes, PV de délibération jury et bulletins.</p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-all" />
                  </div>

                  <div
                    onClick={() => onNavigateTab('HOMEWORK_RESOURCES')}
                    className="p-3.5 bg-white hover:bg-blue-50/50 rounded-2xl border border-slate-200 hover:border-blue-300 shadow-xs transition-all cursor-pointer group flex items-start justify-between"
                  >
                    <div className="space-y-1">
                      <div className="p-2 w-8 h-8 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center font-bold">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <h3 className="font-bold text-xs text-slate-900 group-hover:text-blue-700">Devoirs & Ressources</h3>
                      <p className="text-[11px] text-slate-500">Sujets, échéances, notations et supports PDF de cours.</p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </div>
            )}

            {/* Cluster 3 (Strictly Separated): Pôle Finances & Caisse */}
            {['ADMIN', 'FINANCE'].includes(currentUser.role) && (
              <div className="space-y-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                  <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                  Pôle Finances & Caisse
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => onNavigateTab('FINANCIAL')}
                    className="p-3.5 bg-white hover:bg-emerald-50/50 rounded-2xl border border-slate-200 hover:border-emerald-300 shadow-xs transition-all cursor-pointer group flex items-start justify-between"
                  >
                    <div className="space-y-1">
                      <div className="p-2 w-8 h-8 bg-emerald-100 text-emerald-800 rounded-xl flex items-center justify-center font-bold">
                        <Banknote className="w-4 h-4" />
                      </div>
                      <h3 className="font-bold text-xs text-slate-900 group-hover:text-emerald-800">Finances & Caisse en Ariary</h3>
                      <p className="text-[11px] text-slate-500">Encaissements en Ariary (Ar), échéanciers, reçus officiels et clôture ventilée.</p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-all" />
                  </div>

                  <div
                    onClick={() => onNavigateTab('STUDENTS')}
                    className="p-3.5 bg-white hover:bg-emerald-50/50 rounded-2xl border border-slate-200 hover:border-emerald-300 shadow-xs transition-all cursor-pointer group flex items-start justify-between"
                  >
                    <div className="space-y-1">
                      <div className="p-2 w-8 h-8 bg-emerald-100 text-emerald-800 rounded-xl flex items-center justify-center font-bold">
                        <Users className="w-4 h-4" />
                      </div>
                      <h3 className="font-bold text-xs text-slate-900 group-hover:text-emerald-800">Suivi des Soldes, Impayés & Quitus</h3>
                      <p className="text-[11px] text-slate-500">État financier par promotion, retards de paiement et quitus d'examen.</p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </div>
            )}

            {/* Cluster 4 (Strictly Separated): Pôle Communication */}
            {['ADMIN', 'SCOLARITE', 'SCHEDULER', 'ACADEMIC_HEAD', 'TEACHER'].includes(currentUser.role) && (
              <div className="space-y-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-purple-600" />
                  Pôle Communication
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => onNavigateTab('COMMUNICATION')}
                    className="p-3.5 bg-white hover:bg-purple-50/50 rounded-2xl border border-slate-200 hover:border-purple-300 shadow-xs transition-all cursor-pointer group flex items-start justify-between"
                  >
                    <div className="space-y-1">
                      <div className="p-2 w-8 h-8 bg-purple-100 text-purple-700 rounded-xl flex items-center justify-center font-bold">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <h3 className="font-bold text-xs text-slate-900 group-hover:text-purple-700">Messagerie & Mur de Promotion</h3>
                      <p className="text-[11px] text-slate-500">Échanges directs, annonces officielles épinglées et discussions par groupe.</p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-all" />
                  </div>

                  <div
                    onClick={onOpenNotifications}
                    className="p-3.5 bg-white hover:bg-purple-50/50 rounded-2xl border border-slate-200 hover:border-purple-300 shadow-xs transition-all cursor-pointer group flex items-start justify-between"
                  >
                    <div className="space-y-1">
                      <div className="p-2 w-8 h-8 bg-purple-100 text-purple-700 rounded-xl flex items-center justify-center font-bold">
                        <Bell className="w-4 h-4" />
                      </div>
                      <h3 className="font-bold text-xs text-slate-900 group-hover:text-purple-700">Centre de Notifications Web & Push</h3>
                      <p className="text-[11px] text-slate-500">Diffusion d'alertes en temps réel aux étudiants et enseignants ({unreadNotifs.length} non lues).</p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </div>
            )}

            {/* Cluster 5: Gouvernance, Annuaire, Sauvegardes Cloud & Audit (Admin / Directions) */}
            {['ADMIN', 'SCOLARITE', 'SCHEDULER', 'FINANCE', 'ACADEMIC_HEAD'].includes(currentUser.role) && (
              <div className="space-y-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-slate-600" />
                  Pôle Direction, Annuaires, Sauvegardes Cloud & Audit Institutionnel
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {['ADMIN', 'SCOLARITE', 'SCHEDULER', 'FINANCE', 'ACADEMIC_HEAD'].includes(currentUser.role) && (
                    <div
                      onClick={() => onNavigateTab('STUDENTS')}
                      className="p-3.5 bg-white hover:bg-sky-50/50 rounded-2xl border border-slate-200 hover:border-sky-300 shadow-xs transition-all cursor-pointer group flex items-start justify-between"
                    >
                      <div className="space-y-1">
                        <div className="p-2 w-8 h-8 bg-sky-100 text-sky-700 rounded-xl flex items-center justify-center font-bold">
                          <GraduationCap className="w-4 h-4" />
                        </div>
                        <h3 className="font-bold text-xs text-slate-900 group-hover:text-sky-700">Répertoire Étudiants & Export</h3>
                        <p className="text-[11px] text-slate-500">Dossiers étudiants, tri par mention/groupe, notes et export sélectif.</p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-all" />
                    </div>
                  )}

                  {currentUser.role === 'ADMIN' && (
                    <div
                      onClick={() => onNavigateTab('USERS_MANAGEMENT')}
                      className="p-3.5 bg-white hover:bg-indigo-50/50 rounded-2xl border border-slate-200 hover:border-indigo-300 shadow-xs transition-all cursor-pointer group flex items-start justify-between"
                    >
                      <div className="space-y-1">
                        <div className="p-2 w-8 h-8 bg-indigo-100 text-indigo-700 rounded-xl flex items-center justify-center font-bold">
                          <Users className="w-4 h-4" />
                        </div>
                        <h3 className="font-bold text-xs text-slate-900 group-hover:text-indigo-700">Gestion des Utilisateurs</h3>
                        <p className="text-[11px] text-slate-500">6 rôles SIS, comptes et gestion des accès.</p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-all" />
                    </div>
                  )}

                  {['ADMIN', 'SCOLARITE', 'SCHEDULER', 'ACADEMIC_HEAD'].includes(currentUser.role) && (
                    <div
                      onClick={() => onNavigateTab('DATA_MANAGEMENT')}
                      className="p-3.5 bg-white hover:bg-teal-50/50 rounded-2xl border border-slate-200 hover:border-teal-300 shadow-xs transition-all cursor-pointer group flex items-start justify-between"
                    >
                      <div className="space-y-1">
                        <div className="p-2 w-8 h-8 bg-teal-100 text-teal-700 rounded-xl flex items-center justify-center font-bold">
                          <Database className="w-4 h-4" />
                        </div>
                        <h3 className="font-bold text-xs text-slate-900 group-hover:text-teal-700">Création des Données</h3>
                        <p className="text-[11px] text-slate-500">Salles, matières, promotions et filières.</p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-all" />
                    </div>
                  )}

                  {['ADMIN', 'SCOLARITE', 'SCHEDULER'].includes(currentUser.role) && (
                    <div
                      onClick={() => onNavigateTab('BACKUP_SECURITY')}
                      className="p-3.5 bg-white hover:bg-blue-50/50 rounded-2xl border border-slate-200 hover:border-blue-300 shadow-xs transition-all cursor-pointer group flex items-start justify-between"
                    >
                      <div className="space-y-1">
                        <div className="p-2 w-8 h-8 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center font-bold">
                          <Database className="w-4 h-4" />
                        </div>
                        <h3 className="font-bold text-xs text-slate-900 group-hover:text-blue-700">Sauvegardes & Cloud SIS</h3>
                        <p className="text-[11px] text-slate-500">Cloud Firestore, snapshots JSON et restauration.</p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-all" />
                    </div>
                  )}

                  {['ADMIN', 'FINANCE'].includes(currentUser.role) && (
                    <div
                      onClick={() => onNavigateTab('AUDIT')}
                      className="p-3.5 bg-white hover:bg-rose-50/50 rounded-2xl border border-slate-200 hover:border-rose-300 shadow-xs transition-all cursor-pointer group flex items-start justify-between"
                    >
                      <div className="space-y-1">
                        <div className="p-2 w-8 h-8 bg-rose-100 text-rose-700 rounded-xl flex items-center justify-center font-bold">
                          <History className="w-4 h-4" />
                        </div>
                        <h3 className="font-bold text-xs text-slate-900 group-hover:text-rose-700">Journal d'Audit</h3>
                        <p className="text-[11px] text-slate-500">Traçabilité complète des opérations sensibles.</p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-all" />
                    </div>
                  )}

                  {currentUser.role === 'ADMIN' && (
                    <div
                      onClick={onOpenReceptionTests}
                      className="p-3.5 bg-emerald-50/70 hover:bg-emerald-100/70 rounded-2xl border border-emerald-300 shadow-xs transition-all cursor-pointer group flex items-start justify-between"
                    >
                      <div className="space-y-1">
                        <div className="p-2 w-8 h-8 bg-emerald-600 text-white rounded-xl flex items-center justify-center font-bold">
                          <Shield className="w-4 h-4" />
                        </div>
                        <h3 className="font-bold text-xs text-emerald-950 group-hover:text-emerald-800">Contrôle Qualité (Admin)</h3>
                        <p className="text-[11px] text-emerald-800">Vérification complète réservée à l'administrateur.</p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-emerald-700 group-hover:translate-x-1 transition-all" />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5. Today's Classes & Next Courses Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Today's Schedule */}
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              Programme d'Aujourd'hui ({new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })})
            </h3>
            <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full">
              {todaySessions.length} cours
            </span>
          </div>

          {todaySessions.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs italic">
              <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
              Aucun cours prévu pour vous aujourd'hui.
            </div>
          ) : (
            <div className="space-y-2.5">
              {todaySessions.map((session) => {
                const course = courses.find((c) => c.id === session.courseId);
                const room = rooms.find((r) => r.id === session.roomId);
                const teacher = users.find((u) => u.id === session.teacherId);
                const googleCalUrl = createGoogleCalendarUrl(session, course, room, teacher);
                const isCustomEvent = session.sessionType && session.sessionType !== 'COURSE';
                const displayTitle = isCustomEvent
                  ? session.eventTitle || 'Conférence / Événement'
                  : course?.title || 'Séance académique';
                const displayCode = isCustomEvent
                  ? session.sessionType === 'CONFERENCE'
                    ? '🎤 CONFÉRENCE'
                    : session.sessionType === 'SEMINAIRE'
                    ? '🏛️ SÉMINAIRE'
                    : session.sessionType === 'SOUTENANCE'
                    ? '🎓 SOUTENANCE'
                    : session.eventCategoryLabel || '📌 ÉVÉNEMENT'
                  : course?.code;
                const displaySpeaker = isCustomEvent
                  ? session.eventSpeaker || teacher?.name || 'Intervenant EBM'
                  : teacher?.name || 'Enseignant';

                return (
                  <div
                    key={session.id}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-blue-900 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-blue-600" />
                          {session.startTime} - {session.endTime}
                        </span>
                        <span className="text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-700 font-mono">
                          {displayCode}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm truncate">{displayTitle}</h4>
                      <p className="text-slate-500 text-[11px] flex items-center gap-3">
                        <span>📍 {room?.name || session.roomId}</span>
                        <span>👤 {displaySpeaker}</span>
                      </p>
                    </div>

                    <a
                      href={googleCalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1.5 bg-white hover:bg-blue-50 text-blue-700 border border-slate-200 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors flex-shrink-0"
                    >
                      Agenda
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Latest Announcements & Notifications */}
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-600" />
                Dernières Notifications & Alertes Campus
              </h3>
              <button
                onClick={onOpenNotifications}
                className="text-xs text-blue-700 font-bold hover:underline"
              >
                Tout voir ({userNotifs.length})
              </button>
            </div>

            {userNotifs.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs italic">
                Aucune alerte reçue.
              </div>
            ) : (
              <div className="space-y-2">
                {userNotifs.slice(0, 4).map((notif) => (
                  <div
                    key={notif.id}
                    className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-[11px]">{notif.title}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(notif.createdAt).toLocaleDateString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed line-clamp-2">
                      {notif.message}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Alerte automatique pour annulations & reports.</span>
            <span className="text-emerald-700 font-bold">Synchronisé Web & Android</span>
          </div>
        </div>
      </div>
    </div>
  );
};
