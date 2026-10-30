import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  QrCode,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  Maximize2,
  RefreshCw,
  XCircle,
  Camera,
  KeyRound,
  Plus,
  BarChart3,
  ClipboardCheck,
  ScanBarcode,
  Calendar,
} from 'lucide-react';
import { UniversalStudentSelector } from './UniversalStudentSelector';
import { User } from '../types';

export const QrAttendanceView: React.FC = () => {
  const {
    currentUser,
    sessions,
    courses,
    rooms,
    groups,
    users,
    ecs,
    ues,
    academicYears,
    selectedAcademicYear,
    qrSessions,
    activeQrSession,
    generateQrSession,
    rotateQrSessionToken,
    stopQrSession,
    scanQrAttendance,
    updateAttendanceStatus,
    recordManualAdminAttendance,
    addSession,
  } = useApp();

  const isStudent = currentUser.role === 'STUDENT';
  const isTeacherOrAdmin = ['TEACHER', 'ADMIN', 'ACADEMIC_HEAD', 'SCOLARITE', 'SCHEDULER', 'ADMIN_STAFF'].includes(
    currentUser.role
  );

  // Sub-tabs for Teacher/Admin
  const [subTab, setSubTab] = useState<'POINTAGE' | 'ABSENCES_ADMIN' | 'STATISTIQUES'>('POINTAGE');

  // Manual Administration Attendance / Absence state
  const [adminGroupId, setAdminGroupId] = useState<string>(groups[0]?.id || 'grp-l1-info-a');
  const [adminCourseId, setAdminCourseId] = useState<string>(courses[0]?.id || 'crs-1');
  const [adminDate, setAdminDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [adminNote, setAdminNote] = useState<string>('');
  const [adminFeedback, setAdminFeedback] = useState<string | null>(null);

  // Teacher generator state
  const [selectedSessionId, setSelectedSessionId] = useState<string>(sessions[0]?.id || 'sess-101');
  const [validityMinutes, setValidityMinutes] = useState<number>(15);
  const [isProjectionFullscreen, setIsProjectionFullscreen] = useState<boolean>(false);

  // Direct on-the-fly session creation state (ACC-027)
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);
  const [newCourseId, setNewCourseId] = useState(courses[0]?.id || '');
  const [newRoomId, setNewRoomId] = useState(rooms[0]?.id || '');
  const [newGroupId, setNewGroupId] = useState(groups[0]?.id || '');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newStartTime, setNewStartTime] = useState('08:00');
  const [newEndTime, setNewEndTime] = useState('10:00');

  // Student or Desk scanning state
  const [inputOtp, setInputOtp] = useState<string>('');
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string } | null>(null);
  const [deskSelectedStudent, setDeskSelectedStudent] = useState<User | null>(null);

  // Statistics filters (ACC-034)
  const [statGroupFilter, setStatGroupFilter] = useState<string>('ALL');
  const [statEcFilter, setStatEcFilter] = useState<string>('ALL');
  const [statSemesterFilter, setStatSemesterFilter] = useState<string>('ALL');
  const [statYearFilter, setStatYearFilter] = useState<string>(selectedAcademicYear || 'ALL');
  const [statStudentSearch, setStatStudentSearch] = useState<string>('');

  // Remaining seconds countdown for active session
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);

  useEffect(() => {
    if (!activeQrSession) {
      setRemainingSeconds(0);
      return;
    }

    const updateTimer = () => {
      const diffMs = new Date(activeQrSession.expiresAt).getTime() - Date.now();
      setRemainingSeconds(Math.max(0, Math.floor(diffMs / 1000)));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeQrSession]);

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleGenerate = () => {
    const sess = sessions.find((s) => s.id === selectedSessionId);
    const crs = courses.find((c) => c.id === sess?.courseId);
    const rm = rooms.find((r) => r.id === sess?.roomId);

    generateQrSession(
      selectedSessionId,
      crs?.title || 'Cours Magistral',
      crs?.code || 'EC-LMD',
      rm?.name || 'Salle de cours',
      currentUser.id,
      sess?.groupIds[0] || 'grp-l1-info-a',
      validityMinutes
    );
  };

  const handleCreateAndLaunchSession = (e: React.FormEvent) => {
    e.preventDefault();
    const crs = courses.find((c) => c.id === newCourseId);
    const rm = rooms.find((r) => r.id === newRoomId);

    addSession({
      courseId: newCourseId,
      teacherId: currentUser.role === 'TEACHER' ? currentUser.id : crs?.teacherIds?.[0] || currentUser.id,
      groupIds: [newGroupId],
      roomId: newRoomId,
      date: newDate,
      startTime: newStartTime,
      endTime: newEndTime,
      durationHours: 2,
      status: 'PUBLISHED',
    });

    const newSessId = `sess-${Date.now()}`;
    generateQrSession(
      newSessId,
      crs?.title || 'Séance de cours',
      crs?.code || 'EC-LMD',
      rm?.name || 'Salle de cours',
      currentUser.id,
      newGroupId,
      validityMinutes
    );
    setShowNewSessionModal(false);
  };

  const handleStudentScanOrOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputOtp.trim()) return;

    const res = scanQrAttendance(inputOtp, currentUser.id);
    setScanResult(res);
    if (res.success) {
      setInputOtp('');
    }
    setTimeout(() => setScanResult(null), 5000);
  };

  const handleDeskStudentScan = (student: User | null) => {
    setDeskSelectedStudent(student);
    if (student && activeQrSession) {
      const res = scanQrAttendance(activeQrSession.codeToken, student.id);
      setScanResult(res);
      setTimeout(() => setScanResult(null), 5000);
    }
  };

  const currentSessionData = activeQrSession;
  const targetGroup = groups.find((g) => g.id === currentSessionData?.groupId);
  const groupStudents = useMemo(
    () => users.filter((u) => u.role === 'STUDENT' && (!currentSessionData?.groupId || u.groupId === currentSessionData.groupId)),
    [users, currentSessionData?.groupId]
  );
  const totalEnrolled = groupStudents.length || targetGroup?.studentCount || 36;
  const presentCount =
    currentSessionData?.records.filter((r) => r.status === 'PRESENT' || r.status === 'LATE').length || 0;

  // Student's own attendance records across all sessions
  const studentRecords = qrSessions.flatMap((s) =>
    s.records
      .filter((r) => r.studentId === currentUser.id)
      .map((r) => ({ ...r, sessionTitle: s.courseTitle, roomName: s.roomName, ecCode: s.ecCode }))
  );

  // Compute Attendance Statistics per student (ACC-034)
  const attendanceStats = useMemo(() => {
    const allStudents = users.filter((u) => {
      if (u.role !== 'STUDENT') return false;
      if (statGroupFilter !== 'ALL' && u.groupId !== statGroupFilter) return false;
      if (statYearFilter !== 'ALL') {
        const grp = groups.find((g) => g.id === u.groupId);
        if (grp && grp.academicYear !== statYearFilter) return false;
      }
      if (statStudentSearch.trim()) {
        const q = statStudentSearch.toLowerCase();
        const matchName = u.name.toLowerCase().includes(q);
        const matchMat = u.matricule?.toLowerCase().includes(q);
        if (!matchName && !matchMat) return false;
      }
      return true;
    });

    const filteredQrSessions = qrSessions.filter((qs) => {
      if (statGroupFilter !== 'ALL' && qs.groupId !== statGroupFilter) return false;
      if (statEcFilter !== 'ALL' && qs.ecCode !== statEcFilter) return false;
      if (statSemesterFilter !== 'ALL') {
        const ecObj = ecs.find((e) => e.code === qs.ecCode);
        const ueObj = ues.find((u) => u.id === ecObj?.ueId);
        if (ueObj && ueObj.semester !== statSemesterFilter) return false;
      }
      return true;
    });

    return allStudents.map((st) => {
      const relevantSessions = filteredQrSessions.filter((qs) => qs.groupId === st.groupId);
      const totalSessions = Math.max(relevantSessions.length, 1);
      let present = 0;
      let late = 0;
      let justified = 0;
      let absent = 0;

      relevantSessions.forEach((qs) => {
        const rec = qs.records.find((r) => r.studentId === st.id);
        if (!rec || rec.status === 'ABSENT') {
          absent++;
        } else if (rec.status === 'PRESENT') {
          present++;
        } else if (rec.status === 'LATE') {
          late++;
        } else if (rec.status === 'JUSTIFIED') {
          justified++;
        }
      });

      const rate = relevantSessions.length > 0 ? Math.round(((present + late + justified) / totalSessions) * 100) : 100;
      const grp = groups.find((g) => g.id === st.groupId);

      return {
        student: st,
        groupCode: grp?.code || 'N/A',
        academicYear: grp?.academicYear || selectedAcademicYear,
        totalSessions: relevantSessions.length,
        present,
        late,
        justified,
        absent,
        rate,
      };
    });
  }, [users, qrSessions, groups, ecs, ues, statGroupFilter, statEcFilter, statSemesterFilter, statYearFilter, statStudentSearch, selectedAcademicYear]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-teal-900 via-emerald-950 to-slate-900 text-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2.5 py-0.5 rounded text-xs font-semibold uppercase">
              Pointage Dynamique & Appel EBM
            </span>
            <span className="text-xs text-slate-300">Contrôle d'assiduité en temps réel</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Pointage des Présences (QR Code, Carte & Appel)</h1>
          <p className="text-slate-300 text-sm mt-1">
            {isStudent
              ? 'Validez votre présence en scannant le QR code projeté en salle ou en saisissant le code OTP de la séance.'
              : 'Générez un QR code éphémère, scannez les cartes étudiants au pupitre ou effectuez la feuille d’appel manuelle.'}
          </p>
        </div>

        {isTeacherOrAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="bg-white/10 p-1 rounded-xl flex flex-wrap items-center gap-1 border border-white/15">
              <button
                type="button"
                onClick={() => setSubTab('POINTAGE')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  subTab === 'POINTAGE' ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-white hover:bg-white/10'
                }`}
              >
                <ClipboardCheck className="w-3.5 h-3.5" />
                Séance QR & Appel
              </button>
              <button
                type="button"
                onClick={() => setSubTab('ABSENCES_ADMIN')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  subTab === 'ABSENCES_ADMIN' ? 'bg-amber-400 text-slate-950 shadow-sm' : 'text-white hover:bg-white/10'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Marquer Absence Manuellement (Administration)
              </button>
              <button
                type="button"
                onClick={() => setSubTab('STATISTIQUES')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  subTab === 'STATISTIQUES' ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-white hover:bg-white/10'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                Statistiques d'Assiduité
              </button>
            </div>

            {activeQrSession && subTab === 'POINTAGE' && (
              <button
                onClick={() => setIsProjectionFullscreen(true)}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-3.5 py-2 rounded-xl border border-white/20 transition-all cursor-pointer"
              >
                <Maximize2 className="w-4 h-4 text-emerald-400" />
                Grand Écran
              </button>
            )}
          </div>
        )}
      </div>

      {/* STUDENT VIEW */}
      {isStudent && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Pointage Card */}
          <div className="md:col-span-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Enregistrer ma présence</h3>
                <p className="text-xs text-slate-500">Séance active en cours</p>
              </div>
            </div>

            {scanResult && (
              <div
                className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  scanResult.success
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {scanResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{scanResult.message}</span>
              </div>
            )}

            {/* Simulated instant QR Scanner trigger */}
            {activeQrSession && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Séance détectée :</span>
                <div className="text-xs text-slate-700">
                  <div className="font-bold text-slate-900">{activeQrSession.courseTitle}</div>
                  <div className="text-slate-500">{activeQrSession.roomName}</div>
                </div>
                <button
                  onClick={() => {
                    const res = scanQrAttendance(activeQrSession.codeToken, currentUser.id);
                    setScanResult(res);
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl shadow-md transition-all cursor-pointer active:scale-95"
                >
                  <QrCode className="w-4 h-4" />
                  Scanner le QR Code (1-Clic)
                </button>
              </div>
            )}

            {/* OTP Fallback */}
            <form onSubmit={handleStudentScanOrOtp} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Saisie manuelle du code OTP :
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="ex: EBM-8429"
                    value={inputOtp}
                    onChange={(e) => setInputOtp(e.target.value.toUpperCase())}
                    className="w-full pl-9 pr-3 py-2 text-xs font-mono font-bold uppercase border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Le code OTP s'affiche sous le QR code projeté par l'enseignant.
                </p>
              </div>

              <button
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs py-2 rounded-xl transition-all cursor-pointer"
              >
                Valider par code OTP
              </button>
            </form>
          </div>

          {/* Student History */}
          <div className="md:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-sm">Mon Historique de Présences</h3>
            {studentRecords.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 italic">
                Aucun pointage enregistré pour le moment.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {studentRecords.map((rec) => (
                  <div key={rec.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-800">
                        {rec.sessionTitle} <span className="font-mono text-[10px] text-slate-400">({rec.ecCode})</span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {rec.roomName} • {new Date(rec.scannedAt).toLocaleString('fr-FR')}
                      </div>
                    </div>
                    <span
                      className={`font-bold px-2.5 py-0.5 rounded-full text-[10px] ${
                        rec.status === 'PRESENT'
                          ? 'bg-emerald-100 text-emerald-800'
                          : rec.status === 'LATE'
                          ? 'bg-amber-100 text-amber-800'
                          : rec.status === 'JUSTIFIED'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {rec.status === 'PRESENT'
                        ? 'Présent'
                        : rec.status === 'LATE'
                        ? 'En retard'
                        : rec.status === 'JUSTIFIED'
                        ? 'Justifié'
                        : 'Absent'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TEACHER / ADMIN VIEW: SUBTAB POINTAGE */}
      {isTeacherOrAdmin && subTab === 'POINTAGE' && (
        <div className="space-y-6">
          {activeQrSession ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-200 gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-xs font-bold text-emerald-700 uppercase">Séance de pointage active</span>
                    <span className="text-[11px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded border border-blue-200">
                      Groupe : {targetGroup?.code || activeQrSession.groupId}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-800 mt-1">{activeQrSession.courseTitle}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {activeQrSession.roomName} • Code EC: {activeQrSession.ecCode}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Countdown */}
                  <div className="bg-rose-50 border border-rose-200 px-4 py-2 rounded-xl text-center">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800">
                      <Clock className="w-3.5 h-3.5 animate-spin" />
                      <span>Temps restant</span>
                    </div>
                    <div className="text-xl font-mono font-extrabold text-rose-600 mt-0.5">
                      {formatTimer(remainingSeconds)}
                    </div>
                  </div>

                  {/* Attendees */}
                  <div className="bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl text-center">
                    <div className="text-xs font-bold text-emerald-800">Présents</div>
                    <div className="text-xl font-extrabold text-emerald-600 mt-0.5">
                      {presentCount} <span className="text-xs font-normal text-emerald-700">/ {totalEnrolled}</span>
                    </div>
                  </div>

                  {/* Rotate Token Button (ACC-029) */}
                  <button
                    type="button"
                    onClick={() => rotateQrSessionToken(activeQrSession.id)}
                    className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs px-3.5 py-2.5 rounded-xl border border-amber-200 transition-colors cursor-pointer"
                    title="Générer immédiatement un nouveau jeton anti-fraude (invalide l'ancien QR)"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Actualiser le QR
                  </button>

                  <button
                    type="button"
                    onClick={() => stopQrSession(activeQrSession.id)}
                    className="bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 font-bold text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 transition-colors cursor-pointer"
                  >
                    Clôturer la séance
                  </button>
                </div>
              </div>

              {/* Desk Scan by Student Card (Barcode / QR) (ACC-075) */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ScanBarcode className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-slate-800">
                      Pointage au Pupitre Enseignant (Scan Carte Étudiant Code-barres / QR ou Recherche)
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500">
                    Sélectionner ou scanner une carte enregistre immédiatement la présence
                  </span>
                </div>

                {scanResult && (
                  <div
                    className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                      scanResult.success
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border border-rose-200'
                    }`}
                  >
                    {scanResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span>{scanResult.message}</span>
                  </div>
                )}

                <UniversalStudentSelector
                  selectedStudentId={deskSelectedStudent?.id || ''}
                  onSelectStudent={(_id, st) => handleDeskStudentScan(st || null)}
                  label="Identifier ou scanner la carte d'un étudiant pour pointer sa présence"
                />
              </div>

              {/* QR Code and Attendees Columns */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* QR Projection Preview */}
                <div className="lg:col-span-1 bg-slate-900 text-white p-6 rounded-2xl flex flex-col items-center justify-center text-center shadow-inner space-y-4">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    Scanner pour valider la présence
                  </span>

                  {/* Stylized QR Matrix Render */}
                  <div className="bg-white p-4 rounded-xl shadow-lg border-4 border-emerald-400">
                    <svg viewBox="0 0 100 100" className="w-48 h-48">
                      <rect x="5" y="5" width="25" height="25" fill="#0f172a" rx="3" />
                      <rect x="10" y="10" width="15" height="15" fill="#ffffff" rx="2" />
                      <rect x="13" y="13" width="9" height="9" fill="#0f172a" rx="1" />

                      <rect x="70" y="5" width="25" height="25" fill="#0f172a" rx="3" />
                      <rect x="75" y="10" width="15" height="15" fill="#ffffff" rx="2" />
                      <rect x="78" y="13" width="9" height="9" fill="#0f172a" rx="1" />

                      <rect x="5" y="70" width="25" height="25" fill="#0f172a" rx="3" />
                      <rect x="10" y="75" width="15" height="15" fill="#ffffff" rx="2" />
                      <rect x="13" y="78" width="9" height="9" fill="#0f172a" rx="1" />

                      <rect x="35" y="10" width="8" height="8" fill="#0f172a" />
                      <rect x="47" y="10" width="8" height="8" fill="#0f172a" />
                      <rect x="58" y="10" width="8" height="8" fill="#0f172a" />

                      <rect x="35" y="25" width="12" height="6" fill="#0f172a" />
                      <rect x="52" y="25" width="12" height="6" fill="#0f172a" />

                      <rect x="10" y="35" width="12" height="10" fill="#0f172a" />
                      <rect x="26" y="35" width="8" height="8" fill="#0f172a" />
                      <rect x="40" y="38" width="20" height="20" fill="#059669" rx="3" />
                      <text x="50" y="52" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">
                        EBM
                      </text>

                      <rect x="65" y="35" width="10" height="8" fill="#0f172a" />
                      <rect x="80" y="35" width="12" height="10" fill="#0f172a" />

                      <rect x="10" y="52" width="10" height="12" fill="#0f172a" />
                      <rect x="25" y="52" width="10" height="10" fill="#0f172a" />
                      <rect x="65" y="52" width="12" height="10" fill="#0f172a" />
                      <rect x="82" y="52" width="10" height="10" fill="#0f172a" />

                      <rect x="35" y="65" width="14" height="8" fill="#0f172a" />
                      <rect x="55" y="65" width="10" height="8" fill="#0f172a" />
                      <rect x="70" y="65" width="12" height="8" fill="#0f172a" />

                      <rect x="35" y="80" width="10" height="12" fill="#0f172a" />
                      <rect x="50" y="80" width="12" height="12" fill="#0f172a" />
                      <rect x="68" y="80" width="15" height="12" fill="#0f172a" />
                    </svg>
                  </div>

                  <div className="bg-slate-800 px-4 py-2 rounded-xl border border-slate-700">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">
                      Jeton dynamique / Code OTP
                    </span>
                    <span className="text-xl font-mono font-extrabold tracking-widest text-yellow-400">
                      {activeQrSession.codeToken}
                    </span>
                  </div>
                </div>

                {/* Manual Roll-Call Sheet & Scanned Attendees (ACC-028, ACC-033) */}
                <div className="lg:col-span-2 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">
                        Feuille d'Appel Complète — Groupe {targetGroup?.code} ({groupStudents.length} inscrits)
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Pointage mixte : automatique par QR Code / Carte ou prise d'appel manuelle par l'enseignant.
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                      Anti-double pointage actif
                    </span>
                  </div>

                  <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-96">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="py-2.5 px-3">Matricule & Étudiant</th>
                          <th className="py-2.5 px-3">Heure de pointage</th>
                          <th className="py-2.5 px-3 text-center">Statut actuel</th>
                          <th className="py-2.5 px-3 text-right">Appel Manuel / Correction</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {groupStudents.map((st) => {
                          const rec = activeQrSession.records.find((r) => r.studentId === st.id);
                          const currentStatus = rec?.status || 'ABSENT';

                          return (
                            <tr key={st.id} className="hover:bg-slate-50">
                              <td className="py-2.5 px-3">
                                <span className="font-bold text-slate-800 block">{st.name}</span>
                                <span className="font-mono text-[10px] text-blue-600">{st.matricule}</span>
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-600">
                                {rec ? new Date(rec.scannedAt).toLocaleTimeString('fr-FR') : '—'}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                    currentStatus === 'PRESENT'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : currentStatus === 'LATE'
                                      ? 'bg-amber-100 text-amber-800'
                                      : currentStatus === 'JUSTIFIED'
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-rose-100 text-rose-800'
                                  }`}
                                >
                                  {currentStatus === 'PRESENT'
                                    ? 'Présent'
                                    : currentStatus === 'LATE'
                                    ? 'En retard'
                                    : currentStatus === 'JUSTIFIED'
                                    ? 'Justifié'
                                    : 'Non pointé / Absent'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <div className="inline-flex gap-1">
                                  <button
                                    type="button"
                                    onClick={() => updateAttendanceStatus(activeQrSession.id, st.id, 'PRESENT')}
                                    className={`px-2 py-1 text-[10px] font-bold rounded transition-colors cursor-pointer ${
                                      currentStatus === 'PRESENT'
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700'
                                    }`}
                                  >
                                    Présent
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => updateAttendanceStatus(activeQrSession.id, st.id, 'LATE')}
                                    className={`px-2 py-1 text-[10px] font-bold rounded transition-colors cursor-pointer ${
                                      currentStatus === 'LATE'
                                        ? 'bg-amber-500 text-white'
                                        : 'bg-slate-100 hover:bg-amber-50 hover:text-amber-700 text-slate-700'
                                    }`}
                                  >
                                    Retard
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => updateAttendanceStatus(activeQrSession.id, st.id, 'JUSTIFIED')}
                                    className={`px-2 py-1 text-[10px] font-bold rounded transition-colors cursor-pointer ${
                                      currentStatus === 'JUSTIFIED'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700'
                                    }`}
                                  >
                                    Justifié
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => updateAttendanceStatus(activeQrSession.id, st.id, 'ABSENT')}
                                    className={`px-2 py-1 text-[10px] font-bold rounded transition-colors cursor-pointer ${
                                      currentStatus === 'ABSENT' && rec
                                        ? 'bg-rose-600 text-white'
                                        : 'bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700'
                                    }`}
                                  >
                                    Absent
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Launch New QR Session Card */
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5 max-w-2xl mx-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <QrCode className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Lancer une séance de pointage</h3>
                    <p className="text-xs text-slate-500">
                      Sélectionnez une séance de l'emploi du temps ou créez une nouvelle séance à la volée.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNewSessionModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl border border-blue-200 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Créer une séance à la volée
                </button>
              </div>

              <div className="space-y-4 text-left text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Séance planifiée :</label>
                  <select
                    value={selectedSessionId}
                    onChange={(e) => setSelectedSessionId(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 font-medium"
                  >
                    {sessions.map((s) => {
                      const c = courses.find((crs) => crs.id === s.courseId);
                      const r = rooms.find((rm) => rm.id === s.roomId);
                      const g = groups.find((grp) => grp.id === s.groupIds[0]);
                      return (
                        <option key={s.id} value={s.id}>
                          [{g?.code || 'Groupe'}] {c?.title} ({c?.code}) • {s.date} • {s.startTime}-{s.endTime} ({r?.code})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Durée de validité du QR Code :</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[5, 10, 15, 30].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setValidityMinutes(mins)}
                        className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                          validityMinutes === mins
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {mins} minutes
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={handleGenerate}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm py-3 rounded-xl shadow-lg transition-all cursor-pointer active:scale-95"
              >
                <QrCode className="w-5 h-5" />
                Générer le QR Code & Ouvrir la Feuille d'Appel
              </button>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  Besoin de saisir une absence sans lancer de QR Code ?
                </span>
                <button
                  type="button"
                  onClick={() => setSubTab('ABSENCES_ADMIN')}
                  className="font-bold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-xl cursor-pointer"
                >
                  Ouvrir le Pointage Manuel d'Absence (Administration) →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TEACHER / ADMIN VIEW: SUBTAB ABSENCES_ADMIN (Saisie manuelle par l'administration) */}
      {isTeacherOrAdmin && subTab === 'ABSENCES_ADMIN' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 rounded text-[10px] font-black uppercase">
                  Administration & Scolarité
                </span>
                <h2 className="text-base font-bold text-slate-900">
                  Pointage Manuel des Absences, Retards & Justifications par l'Administration
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Marquez manuellement les absences, présences ou justificatifs médicaux d'un groupe pour n'importe quelle séance ou date, même hors session QR en direct.
              </p>
            </div>
            {adminFeedback && (
              <div className="px-3.5 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{adminFeedback}</span>
              </div>
            )}
          </div>

          {/* Selection Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                1. Promotion / Groupe *
              </label>
              <select
                value={adminGroupId}
                onChange={(e) => setAdminGroupId(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-800"
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.code} — {g.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                2. Matière / Cours (EC) *
              </label>
              <select
                value={adminCourseId}
                onChange={(e) => setAdminCourseId(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-semibold text-slate-800"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                3. Date du cours *
              </label>
              <input
                type="date"
                value={adminDate}
                onChange={(e) => setAdminDate(e.target.value)}
                className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-800"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                Motif / Observation (optionnel)
              </label>
              <input
                type="text"
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Ex: Certificat médical, Absence non justifiée..."
                className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-800"
              />
            </div>
          </div>

          {/* Manual Roll Call Table for Selected Group */}
          {(() => {
            const selectedCourseObj = courses.find((c) => c.id === adminCourseId) || courses[0];
            const selectedGroupObj = groups.find((g) => g.id === adminGroupId);
            const studentsInAdminGroup = users.filter((u) => u.role === 'STUDENT' && u.groupId === adminGroupId);
            const targetSession = qrSessions.find(
              (qs) =>
                qs.groupId === adminGroupId &&
                qs.ecCode === (selectedCourseObj?.code || 'EC-ADMIN') &&
                (qs.generatedAt || qs.createdAt || '').startsWith(adminDate)
            );

            const handleMarkStudent = (st: User, status: 'PRESENT' | 'ABSENT' | 'LATE' | 'JUSTIFIED') => {
              recordManualAdminAttendance({
                groupId: adminGroupId,
                ecCode: selectedCourseObj?.code || 'EC-ADMIN',
                courseTitle: selectedCourseObj?.title || 'Séance Administrative',
                date: adminDate,
                studentId: st.id,
                status,
                note: adminNote,
              });
              setAdminFeedback(
                `Pointage enregistré : ${st.name} (${st.matricule}) marqué(e) ${
                  status === 'ABSENT'
                    ? 'ABSENT(E)'
                    : status === 'JUSTIFIED'
                    ? 'ABSENCE JUSTIFIÉE'
                    : status === 'LATE'
                    ? 'EN RETARD'
                    : 'PRÉSENT(E)'
                }.`
              );
              setTimeout(() => setAdminFeedback(null), 4000);
            };

            return (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-bold text-slate-700">
                    Liste des étudiants — {selectedGroupObj?.code} ({studentsInAdminGroup.length} étudiants) • Séance du {adminDate}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        studentsInAdminGroup.forEach((st) => handleMarkStudent(st, 'PRESENT'));
                        setAdminFeedback(`Tous les étudiants du groupe ${selectedGroupObj?.code} ont été marqués PRÉSENTS.`);
                      }}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold cursor-pointer"
                    >
                      Tout marquer Présent
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="p-3">Matricule</th>
                        <th className="p-3">Étudiant</th>
                        <th className="p-3 text-center">Statut sur cette séance</th>
                        <th className="p-3 text-right">Action Manuelle (Administration / Scolarité)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {studentsInAdminGroup.map((st) => {
                        const existingRec = targetSession?.records.find((r) => r.studentId === st.id);
                        const status = existingRec?.status;

                        return (
                          <tr key={st.id} className="hover:bg-slate-50">
                            <td className="p-3 font-mono font-bold text-blue-700">{st.matricule}</td>
                            <td className="p-3 font-bold text-slate-900">{st.name}</td>
                            <td className="p-3 text-center">
                              {status ? (
                                <span
                                  className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                                    status === 'PRESENT'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : status === 'LATE'
                                      ? 'bg-amber-100 text-amber-800'
                                      : status === 'JUSTIFIED'
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-rose-100 text-rose-800'
                                  }`}
                                >
                                  {status === 'PRESENT'
                                    ? 'Présent'
                                    : status === 'LATE'
                                    ? 'En retard'
                                    : status === 'JUSTIFIED'
                                    ? 'Absence Justifiée'
                                    : 'Absent'}
                                </span>
                              ) : (
                                <span className="text-[11px] text-slate-400 italic">Non pointé</span>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              <div className="inline-flex flex-wrap justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleMarkStudent(st, 'ABSENT')}
                                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] cursor-pointer transition-colors ${
                                    status === 'ABSENT'
                                      ? 'bg-rose-600 text-white shadow-xs'
                                      : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                                  }`}
                                >
                                  Marquer Absent
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMarkStudent(st, 'JUSTIFIED')}
                                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] cursor-pointer transition-colors ${
                                    status === 'JUSTIFIED'
                                      ? 'bg-blue-600 text-white shadow-xs'
                                      : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200'
                                  }`}
                                >
                                  Justifié
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMarkStudent(st, 'LATE')}
                                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] cursor-pointer transition-colors ${
                                    status === 'LATE'
                                      ? 'bg-amber-500 text-white shadow-xs'
                                      : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
                                  }`}
                                >
                                  Retard
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMarkStudent(st, 'PRESENT')}
                                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] cursor-pointer transition-colors ${
                                    status === 'PRESENT'
                                      ? 'bg-emerald-600 text-white shadow-xs'
                                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                                  }`}
                                >
                                  Présent
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* TEACHER / ADMIN VIEW: SUBTAB STATISTIQUES (ACC-034) */}
      {isTeacherOrAdmin && subTab === 'STATISTIQUES' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Statistiques de Présence & d'Absence Multi-Critères
              </h2>
              <p className="text-xs text-slate-500">
                Analyse détaillée de l'assiduité par étudiant, matière (EC), classe/groupe, semestre et année universitaire.
              </p>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Recherche Étudiant</label>
              <input
                type="text"
                value={statStudentSearch}
                onChange={(e) => setStatStudentSearch(e.target.value)}
                placeholder="Matricule ou nom..."
                className="w-full p-2 bg-white border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Classe / Groupe</label>
              <select
                value={statGroupFilter}
                onChange={(e) => setStatGroupFilter(e.target.value)}
                className="w-full p-2 bg-white border border-slate-300 rounded-lg font-medium"
              >
                <option value="ALL">Tous les groupes</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.code} ({g.name})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Matière (EC)</label>
              <select
                value={statEcFilter}
                onChange={(e) => setStatEcFilter(e.target.value)}
                className="w-full p-2 bg-white border border-slate-300 rounded-lg font-medium"
              >
                <option value="ALL">Toutes les matières</option>
                {ecs.map((ec) => (
                  <option key={ec.id} value={ec.code}>
                    {ec.code} — {ec.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Semestre</label>
              <select
                value={statSemesterFilter}
                onChange={(e) => setStatSemesterFilter(e.target.value)}
                className="w-full p-2 bg-white border border-slate-300 rounded-lg font-medium"
              >
                <option value="ALL">Tous les semestres</option>
                {['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10'].map((sem) => (
                  <option key={sem} value={sem}>
                    Semestre {sem}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Année Universitaire</label>
              <select
                value={statYearFilter}
                onChange={(e) => setStatYearFilter(e.target.value)}
                className="w-full p-2 bg-white border border-slate-300 rounded-lg font-medium"
              >
                <option value="ALL">Toutes les années</option>
                {academicYears.map((ay) => (
                  <option key={ay.id} value={ay.code}>
                    {ay.code}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Stats Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3">Matricule</th>
                  <th className="p-3">Étudiant</th>
                  <th className="p-3">Groupe & Année</th>
                  <th className="p-3 text-center">Séances</th>
                  <th className="p-3 text-center">Présences</th>
                  <th className="p-3 text-center">Retards</th>
                  <th className="p-3 text-center">Justifiées</th>
                  <th className="p-3 text-center">Absences</th>
                  <th className="p-3 text-right">Taux d'assiduité</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attendanceStats.map((row) => (
                  <tr key={row.student.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-blue-700">{row.student.matricule}</td>
                    <td className="p-3 font-bold text-slate-900">{row.student.name}</td>
                    <td className="p-3">
                      <span className="font-semibold text-slate-800">{row.groupCode}</span>
                      <span className="text-[10px] text-slate-400 block">{row.academicYear}</span>
                    </td>
                    <td className="p-3 text-center font-bold text-slate-700">{row.totalSessions}</td>
                    <td className="p-3 text-center font-bold text-emerald-700">{row.present}</td>
                    <td className="p-3 text-center font-bold text-amber-700">{row.late}</td>
                    <td className="p-3 text-center font-bold text-blue-700">{row.justified}</td>
                    <td className="p-3 text-center font-bold text-rose-700">{row.absent}</td>
                    <td className="p-3 text-right">
                      <span
                        className={`px-2.5 py-1 rounded-full font-black text-xs ${
                          row.rate >= 80
                            ? 'bg-emerald-100 text-emerald-800'
                            : row.rate >= 60
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {row.rate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: CREATE SESSION ON THE FLY (ACC-027) */}
      {showNewSessionModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-base">Créer une séance de cours & pointer</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewSessionModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAndLaunchSession} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Matière / Cours (EC) *</label>
                <select
                  value={newCourseId}
                  onChange={(e) => setNewCourseId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Groupe d'étudiants *</label>
                  <select
                    value={newGroupId}
                    onChange={(e) => setNewGroupId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                  >
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.code} ({g.name})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Salle *</label>
                  <select
                    value={newRoomId}
                    onChange={(e) => setNewRoomId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                  >
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Date *</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Début *</label>
                  <input
                    type="time"
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fin *</label>
                  <input
                    type="time"
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewSessionModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-semibold text-slate-600"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl"
                >
                  Créer & Lancer le QR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULLSCREEN PROJECTION MODAL FOR AMPHI / PROJECTOR */}
      {isProjectionFullscreen && activeQrSession && (
        <div className="fixed inset-0 bg-slate-950 text-white z-50 flex flex-col items-center justify-between p-8 animate-in fade-in duration-200">
          {/* Header */}
          <div className="w-full flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <span className="text-emerald-400 font-bold uppercase tracking-widest text-xs">
                EBM Institute • Pointage Officiel des Présences
              </span>
              <h1 className="text-3xl font-extrabold mt-1">{activeQrSession.courseTitle}</h1>
              <p className="text-slate-400 text-sm">
                Salle : {activeQrSession.roomName} • Groupe : {targetGroup?.code}
              </p>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-center">
                <span className="text-xs text-slate-400 block uppercase font-bold">Temps restant</span>
                <span className="text-4xl font-mono font-black text-rose-400">{formatTimer(remainingSeconds)}</span>
              </div>
              <div className="text-center">
                <span className="text-xs text-slate-400 block uppercase font-bold">Présents</span>
                <span className="text-4xl font-mono font-black text-emerald-400">
                  {presentCount} <span className="text-lg text-slate-500">/ {totalEnrolled}</span>
                </span>
              </div>
              <button
                onClick={() => rotateQrSessionToken(activeQrSession.id)}
                className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 px-3 py-2 rounded-xl text-xs font-bold border border-amber-400/30 flex items-center gap-1.5"
              >
                <RefreshCw className="w-4 h-4" />
                Nouveau Jeton
              </button>
              <button
                onClick={() => setIsProjectionFullscreen(false)}
                className="bg-white/10 hover:bg-white/20 text-white p-2.5 rounded-xl transition-all"
                title="Quitter le plein écran"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Central Large QR Code */}
          <div className="flex flex-col items-center justify-center space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-2xl border-8 border-emerald-400">
              <svg viewBox="0 0 100 100" className="w-80 h-80">
                <rect x="5" y="5" width="25" height="25" fill="#0f172a" rx="3" />
                <rect x="10" y="10" width="15" height="15" fill="#ffffff" rx="2" />
                <rect x="13" y="13" width="9" height="9" fill="#0f172a" rx="1" />

                <rect x="70" y="5" width="25" height="25" fill="#0f172a" rx="3" />
                <rect x="75" y="10" width="15" height="15" fill="#ffffff" rx="2" />
                <rect x="78" y="13" width="9" height="9" fill="#0f172a" rx="1" />

                <rect x="5" y="70" width="25" height="25" fill="#0f172a" rx="3" />
                <rect x="10" y="75" width="15" height="15" fill="#ffffff" rx="2" />
                <rect x="13" y="78" width="9" height="9" fill="#0f172a" rx="1" />

                <rect x="35" y="10" width="8" height="8" fill="#0f172a" />
                <rect x="47" y="10" width="8" height="8" fill="#0f172a" />
                <rect x="58" y="10" width="8" height="8" fill="#0f172a" />
                <rect x="35" y="25" width="12" height="6" fill="#0f172a" />
                <rect x="52" y="25" width="12" height="6" fill="#0f172a" />

                <rect x="40" y="38" width="20" height="20" fill="#059669" rx="3" />
                <text x="50" y="52" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">
                  EBM
                </text>

                <rect x="10" y="35" width="12" height="10" fill="#0f172a" />
                <rect x="26" y="35" width="8" height="8" fill="#0f172a" />
                <rect x="65" y="35" width="10" height="8" fill="#0f172a" />
                <rect x="80" y="35" width="12" height="10" fill="#0f172a" />

                <rect x="10" y="52" width="10" height="12" fill="#0f172a" />
                <rect x="25" y="52" width="10" height="10" fill="#0f172a" />
                <rect x="65" y="52" width="12" height="10" fill="#0f172a" />
                <rect x="82" y="52" width="10" height="10" fill="#0f172a" />

                <rect x="35" y="65" width="14" height="8" fill="#0f172a" />
                <rect x="55" y="65" width="10" height="8" fill="#0f172a" />
                <rect x="70" y="65" width="12" height="8" fill="#0f172a" />

                <rect x="35" y="80" width="10" height="12" fill="#0f172a" />
                <rect x="50" y="80" width="12" height="12" fill="#0f172a" />
                <rect x="68" y="80" width="15" height="12" fill="#0f172a" />
              </svg>
            </div>

            <div className="bg-slate-900 border-2 border-emerald-500/40 px-8 py-3 rounded-2xl text-center shadow-xl">
              <span className="text-xs text-slate-400 block uppercase font-bold tracking-widest">
                Code OTP de secours à saisir
              </span>
              <span className="text-4xl font-mono font-black text-yellow-300 tracking-wider">
                {activeQrSession.codeToken}
              </span>
            </div>
          </div>

          {/* Footer banner */}
          <div className="w-full text-center text-slate-500 text-xs border-t border-slate-800 pt-4">
            Scannez le code avec votre application EBM mobile ou entrez l'OTP • Prévention automatique des doubles pointages
          </div>
        </div>
      )}
    </div>
  );
};
