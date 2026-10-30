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
    toggleAndroidView,
    getCourseHourlyStats,
    getTeacherHourlyStats,
  } = useApp();

  if (!currentUser) return null;

  const todayStr = new Date().toISOString().split('T')[0];

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
              <span className="px-3 py-1 bg-blue-800/80 text-blue-200 font-semibold text-xs rounded-lg border border-blue-700/60">
                {currentUser.role === 'STUDENT'
                  ? `Matricule : ${currentUser.matricule}`
                  : currentUser.role === 'PARENT'
                  ? 'Compte Parent / Tuteur Légal Vérifié'
                  : currentUser.role}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Bonjour, {currentUser.name} 👋
            </h1>

            <p className="text-sm text-blue-200 max-w-2xl leading-relaxed">
              Bienvenue sur votre portail unifié <strong>EBM Institute</strong>. Retrouvez ici en temps réel vos cours, salles attribuées, volumes horaires et notifications officielles.
            </p>
          </div>

          {/* Quick Dual Mode Action on Banner */}
          <div className="flex flex-col sm:flex-row md:flex-col gap-2 flex-shrink-0">
            <button
              onClick={onOpenUserProfile}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserIcon className="w-4 h-4 text-slate-950" />
              Ma Fiche Utilisateur & Contacts
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
