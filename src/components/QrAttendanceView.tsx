import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  QrCode,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  ShieldCheck,
  Maximize2,
  RefreshCw,
  XCircle,
  HelpCircle,
  UserCheck,
  Camera,
  KeyRound,
} from 'lucide-react';

export const QrAttendanceView: React.FC = () => {
  const {
    currentUser,
    sessions,
    courses,
    rooms,
    groups,
    users,
    qrSessions,
    activeQrSession,
    generateQrSession,
    stopQrSession,
    scanQrAttendance,
    updateAttendanceStatus,
  } = useApp();

  const isStudent = currentUser.role === 'STUDENT';
  const isTeacherOrAdmin = ['TEACHER', 'ADMIN', 'ACADEMIC_HEAD', 'SCHEDULER'].includes(currentUser.role);

  // Teacher generator state
  const [selectedSessionId, setSelectedSessionId] = useState<string>(sessions[0]?.id || 'sess-101');
  const [validityMinutes, setValidityMinutes] = useState<number>(15);
  const [isProjectionFullscreen, setIsProjectionFullscreen] = useState<boolean>(false);

  // Student scanning state
  const [inputOtp, setInputOtp] = useState<string>('');
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string } | null>(null);

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

  const currentSessionData = activeQrSession;
  const targetGroup = groups.find((g) => g.id === currentSessionData?.groupId);
  const totalEnrolled = targetGroup?.studentCount || 36;
  const presentCount = currentSessionData?.records.filter((r) => r.status === 'PRESENT').length || 0;

  // Student's own attendance records across all sessions
  const studentRecords = qrSessions.flatMap((s) =>
    s.records
      .filter((r) => r.studentId === currentUser.id)
      .map((r) => ({ ...r, sessionTitle: s.courseTitle, roomName: s.roomName }))
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-teal-900 via-emerald-950 to-slate-900 text-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2.5 py-0.5 rounded text-xs font-semibold uppercase">
              Pointage Dynamique EBM
            </span>
            <span className="text-xs text-slate-300">Contrôle de présence en temps réel</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Pointage des Présences par QR Code</h1>
          <p className="text-slate-300 text-sm mt-1">
            {isStudent
              ? 'Validez votre présence en scannant le QR code projeté en salle ou en saisissant le code OTP de la séance.'
              : 'Générez un QR code éphémère sécurisé avec compte à rebours pour la projection en amphithéâtre ou en salle.'}
          </p>
        </div>

        {isTeacherOrAdmin && (
          <div className="flex items-center gap-2">
            {activeQrSession && (
              <button
                onClick={() => setIsProjectionFullscreen(true)}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold px-4 py-2.5 rounded-xl border border-white/20 transition-all cursor-pointer"
              >
                <Maximize2 className="w-4 h-4 text-emerald-400" />
                Mode Grand Écran
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
                  Le code à 4 chiffres s'affiche sous le QR code projeté par l'enseignant.
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
                      <div className="font-semibold text-slate-800">{rec.sessionTitle}</div>
                      <div className="text-[11px] text-slate-500">{rec.roomName} • {new Date(rec.scannedAt).toLocaleString('fr-FR')}</div>
                    </div>
                    <span
                      className={`font-bold px-2.5 py-0.5 rounded-full text-[10px] ${
                        rec.status === 'PRESENT'
                          ? 'bg-emerald-100 text-emerald-800'
                          : rec.status === 'LATE'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {rec.status === 'PRESENT' ? 'Présent' : rec.status === 'LATE' ? 'En retard' : 'Absent'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TEACHER / ADMIN VIEW */}
      {isTeacherOrAdmin && (
        <div className="space-y-6">
          {/* Active Session Display OR Creator */}
          {activeQrSession ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-200 gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-xs font-bold text-emerald-700 uppercase">Séance de pointage active</span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-800 mt-1">{activeQrSession.courseTitle}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {activeQrSession.roomName} • Code EC: {activeQrSession.ecCode}
                  </p>
                </div>

                <div className="flex items-center gap-4">
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

                  <button
                    onClick={() => stopQrSession(activeQrSession.id)}
                    className="bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 font-bold text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 transition-colors"
                  >
                    Clôturer la séance
                  </button>
                </div>
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
                      {/* Corner markers */}
                      <rect x="5" y="5" width="25" height="25" fill="#0f172a" rx="3" />
                      <rect x="10" y="10" width="15" height="15" fill="#ffffff" rx="2" />
                      <rect x="13" y="13" width="9" height="9" fill="#0f172a" rx="1" />

                      <rect x="70" y="5" width="25" height="25" fill="#0f172a" rx="3" />
                      <rect x="75" y="10" width="15" height="15" fill="#ffffff" rx="2" />
                      <rect x="78" y="13" width="9" height="9" fill="#0f172a" rx="1" />

                      <rect x="5" y="70" width="25" height="25" fill="#0f172a" rx="3" />
                      <rect x="10" y="75" width="15" height="15" fill="#ffffff" rx="2" />
                      <rect x="13" y="78" width="9" height="9" fill="#0f172a" rx="1" />

                      {/* Random data pattern blocks representing QR modules */}
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
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Code OTP de secours</span>
                    <span className="text-xl font-mono font-extrabold tracking-widest text-yellow-400">
                      {activeQrSession.codeToken}
                    </span>
                  </div>
                </div>

                {/* Scanned Attendees Table with Quick Correction */}
                <div className="lg:col-span-2 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 text-sm">
                      Étudiants ayant pointé ({activeQrSession.records.length})
                    </h3>
                    <span className="text-xs text-slate-400">Anti-double pointage actif</span>
                  </div>

                  <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-96">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="py-2.5 px-3">Matricule & Nom</th>
                          <th className="py-2.5 px-3">Heure</th>
                          <th className="py-2.5 px-3 text-center">Statut</th>
                          <th className="py-2.5 px-3 text-right">Correction</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activeQrSession.records.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-8 text-center text-slate-400 italic">
                              En attente des premiers scans étudiants...
                            </td>
                          </tr>
                        ) : (
                          activeQrSession.records.map((rec) => (
                            <tr key={rec.id} className="hover:bg-slate-50">
                              <td className="py-2.5 px-3">
                                <span className="font-bold text-slate-800 block">{rec.studentName}</span>
                                <span className="font-mono text-[10px] text-blue-600">{rec.matricule}</span>
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-600">
                                {new Date(rec.scannedAt).toLocaleTimeString('fr-FR')}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
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
                                    ? 'Justifiée'
                                    : 'Absent'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <div className="inline-flex gap-1">
                                  <button
                                    onClick={() => updateAttendanceStatus(activeQrSession.id, rec.studentId, 'LATE')}
                                    className="px-1.5 py-0.5 text-[10px] font-semibold bg-slate-100 hover:bg-amber-50 hover:text-amber-700 rounded transition-colors"
                                  >
                                    Retard
                                  </button>
                                  <button
                                    onClick={() => updateAttendanceStatus(activeQrSession.id, rec.studentId, 'JUSTIFIED')}
                                    className="px-1.5 py-0.5 text-[10px] font-semibold bg-slate-100 hover:bg-blue-50 hover:text-blue-700 rounded transition-colors"
                                  >
                                    Justifier
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Launch New QR Session Card */
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4 max-w-xl mx-auto text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
                <QrCode className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Lancer une séance de pointage</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Choisissez la séance de cours pour générer le QR code dynamique et le code OTP éphémère.
                </p>
              </div>

              <div className="space-y-3 text-left text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Séance planifiée :</label>
                  <select
                    value={selectedSessionId}
                    onChange={(e) => setSelectedSessionId(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 font-medium"
                  >
                    {sessions.map((s) => {
                      const c = courses.find((crs) => crs.id === s.courseId);
                      const r = rooms.find((rm) => rm.id === s.roomId);
                      return (
                        <option key={s.id} value={s.id}>
                          {c?.title} ({c?.code}) • {s.date} • {s.startTime}-{s.endTime} ({r?.code})
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
                        className={`py-2 text-xs font-bold rounded-lg transition-all ${
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
                Générer le QR Code & Lancer la séance
              </button>
            </div>
          )}
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
