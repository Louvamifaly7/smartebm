import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Calendar,
  Clock,
  MapPin,
  User as UserIcon,
  Bell,
  Wifi,
  WifiOff,
  BatteryCharging,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  ChevronRight,
  Shield,
  Smartphone,
  Info,
  CalendarDays,
  FileText,
  Lock,
  Layers,
  Award,
  QrCode,
  Banknote,
  MessageSquare,
  Send,
  Plus,
  Download,
  KeyRound,
  FileCode,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
  Menu,
  LayoutGrid,
  Pin,
  UploadCloud,
  ChevronLeft,
  LogOut,
  Fingerprint,
  Eye,
  EyeOff,
} from 'lucide-react';
import { createGoogleCalendarUrl } from '../utils/calendarExport';
import { TimetableSession, SemesterCode, GroupPost, HomeworkAssignment } from '../types';
import { getTeachersForStudent } from '../utils/studentVisibility';

export const AndroidSimulator: React.FC = () => {
  const {
    currentUser,
    sessions,
    courses,
    rooms,
    users,
    groups,
    ues,
    ecs,
    grades,
    getStudentEcGrade,
    getStudentUeSummary,
    qrSessions,
    activeQrSession,
    scanQrAttendance,
    generateQrSession,
    stopQrSession,
    fees,
    payments,
    getStudentFinancialSummary,
    homework,
    submissions,
    learningResources,
    submitHomework,
    internalMessages,
    groupPosts,
    sendMessage,
    markMessageAsRead,
    notifications,
    markAsRead,
    markAllAsRead,
    isOfflineMode,
    toggleOfflineMode,
    lastSyncDate,
    toggleGoogleCalendarLink,
    changePassword,
    getTeacherHourlyStats,
    login,
    logout,
  } = useApp();

  // Android Device Authentication state
  const [isDeviceLoggedIn, setIsDeviceLoggedIn] = useState<boolean>(true);
  const [loginIdentifier, setLoginIdentifier] = useState<string>('EBM-2026-0042');
  const [loginPassword, setLoginPassword] = useState<string>('etudiant123');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isBiometricScanning, setIsBiometricScanning] = useState<boolean>(false);

  // Navigation tab state
  type AndroidTab =
    | 'AGENDA'
    | 'LMD_COURS'
    | 'NOTES'
    | 'QR_SCAN'
    | 'FINANCES'
    | 'DEVOIRS'
    | 'COMMUNICATION'
    | 'NOTIFS'
    | 'PROFILE';

  const [activeTab, setActiveTab] = useState<AndroidTab>('AGENDA');
  const [agendaMode, setAgendaMode] = useState<'TODAY' | 'WEEK'>('TODAY');
  const [selectedDayOffset, setSelectedDayOffset] = useState<number>(0);
  const [selectedSession, setSelectedSession] = useState<TimetableSession | null>(null);

  // Student specific filtering
  const isStudent = currentUser.role === 'STUDENT';
  const myEnrolledGroup = groups.find((g) => g.id === currentUser.groupId);
  const studentTeachers = getTeachersForStudent(currentUser.groupId, courses, ecs, sessions, users);

  // Password change state
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [pwdMsg, setPwdMsg] = useState<string | null>(null);

  // QR Attendance scanning state
  const [inputOtp, setInputOtp] = useState<string>('');
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string } | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);

  // Homework submit state
  const [selectedHwToSubmit, setSelectedHwToSubmit] = useState<HomeworkAssignment | null>(null);
  const [submitFileName, setSubmitFileName] = useState<string>('');
  const [submitComment, setSubmitComment] = useState<string>('');
  const [submitNotice, setSubmitNotice] = useState<string | null>(null);

  // Messaging & Mur state
  const [commSubTab, setCommSubTab] = useState<'WALL' | 'MESSAGES'>('WALL');
  const [msgRecipientId, setMsgRecipientId] = useState<string>('');
  const [msgSubject, setMsgSubject] = useState<string>('');
  const [msgBody, setMsgBody] = useState<string>('');
  const [msgNotice, setMsgNotice] = useState<string | null>(null);
  const [showNewMsgModal, setShowNewMsgModal] = useState<boolean>(false);

  // Active receipt modal for finances
  const [activeReceiptModal, setActiveReceiptModal] = useState<any | null>(null);

  // Services App Drawer modal state
  const [isServicesDrawerOpen, setIsServicesDrawerOpen] = useState<boolean>(false);

  // Timer countdown for active QR
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

  // Helper date offset
  const getDateStr = (offset: number) => {
    const now = new Date();
    const currentDay = now.getDay();
    const distanceToMonday = (currentDay + 6) % 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - distanceToMonday + offset);
    return monday.toISOString().split('T')[0];
  };

  const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  // Filter sessions according to current user
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

  // Check if Saturday or Sunday have sessions for the current week
  const hasSaturdayAndroid = userSessions.some((s) => s.date === getDateStr(5));
  const hasSundayAndroid = userSessions.some((s) => s.date === getDateStr(6));

  const androidDayOffsets = [0, 1, 2, 3, 4];
  if (hasSaturdayAndroid) androidDayOffsets.push(5);
  if (hasSundayAndroid) androidDayOffsets.push(6);

  const todayDateStr = getDateStr(selectedDayOffset);
  const todaySessions = userSessions.filter((s) => s.date === todayDateStr);

  // User notifications
  const userNotifs = notifications.filter(
    (n) => n.recipientId === currentUser.id || n.recipientRole === currentUser.role || !n.recipientId
  );
  const unreadAndroidCount = userNotifs.filter((n) => !n.isReadAndroid).length;

  // Filtered UEs for student or current view
  const visibleUes = isStudent
    ? ues.filter((ue) => {
        // If student is in L1 info, show L1 UEs
        return ue.level === 'L1';
      })
    : ues;

  // Filtered Homework for student
  const visibleHomework = isStudent
    ? homework.filter((h) => currentUser.groupId ? h.groupId === currentUser.groupId : true)
    : homework;

  // Filtered Resources for student
  const visibleResources = isStudent
    ? learningResources.filter((r) => currentUser.groupId ? r.groupId === currentUser.groupId : true)
    : learningResources;

  // Filtered Wall Posts: strictly student's group
  const activeGroupId = isStudent ? (currentUser.groupId || 'grp-l1-info-a') : (currentUser.groupId || groups[0]?.id || 'grp-l1-info-a');
  const visiblePosts = groupPosts.filter((p) => p.groupId === activeGroupId);

  // Filtered Messages
  const myMessages = internalMessages.filter(
    (m) =>
      m.senderId === currentUser.id ||
      m.recipientId === currentUser.id ||
      (m.recipientGroupId && m.recipientGroupId === currentUser.groupId) ||
      (!m.recipientId && !m.recipientGroupId)
  );

  // Financial summary
  const targetStudentId = isStudent ? currentUser.id : 'user-student-laurent';
  const financialSummary = getStudentFinancialSummary(targetStudentId);
  const targetStudentFees = fees.filter((f) => f.studentId === targetStudentId);
  const targetStudentPayments = payments.filter((p) => p.studentId === targetStudentId && !p.isCancelled);

  const formatAriary = (amount: number) => {
    return `${Number(amount).toLocaleString('fr-MG')} Ar`;
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPasswordInput.length < 6) {
      setPwdMsg('Erreur: Minimum 6 caractères.');
      return;
    }
    changePassword(currentUser.id, newPasswordInput);
    setPwdMsg('✅ Mot de passe mis à jour.');
    setTimeout(() => {
      setIsChangingPassword(false);
      setPwdMsg(null);
      setNewPasswordInput('');
    }, 1500);
  };

  const handleStudentScan = () => {
    if (!activeQrSession) return;
    const res = scanQrAttendance(activeQrSession.codeToken, currentUser.id);
    setScanResult(res);
  };

  const handleStudentOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputOtp.trim()) return;
    const res = scanQrAttendance(inputOtp.trim(), currentUser.id);
    setScanResult(res);
    setInputOtp('');
  };

  const handleHomeworkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHwToSubmit) return;
    const fileName = submitFileName.trim() || `${currentUser.name.replace(/\s+/g, '_')}_Devoir.pdf`;
    submitHomework(selectedHwToSubmit.id, fileName, '1.4 MB', submitComment);
    setSubmitNotice('Devoir déposé avec succès !');
    setTimeout(() => {
      setSelectedHwToSubmit(null);
      setSubmitFileName('');
      setSubmitComment('');
      setSubmitNotice(null);
    }, 1200);
  };

  const handleSendDirectMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgRecipientId || !msgBody.trim()) return;
    sendMessage({
      recipientId: msgRecipientId,
      subject: msgSubject || 'Message depuis Android',
      content: msgBody,
    });
    setMsgNotice('Message envoyé !');
    setTimeout(() => {
      setShowNewMsgModal(false);
      setMsgRecipientId('');
      setMsgSubject('');
      setMsgBody('');
      setMsgNotice(null);
    }, 1000);
  };

  const getStatusBadge = (status: TimetableSession['status']) => {
    switch (status) {
      case 'CANCELLED':
        return <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 font-bold rounded text-[9px] uppercase">Annulé</span>;
      case 'RESCHEDULED':
        return <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 font-bold rounded text-[9px] uppercase">Reporté</span>;
      case 'COMPLETED_VALIDATED':
        return <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 font-bold rounded text-[9px] uppercase">Validé</span>;
      default:
        return <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 font-bold rounded text-[9px] uppercase">Confirmé</span>;
    }
  };

  const handleDeviceLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoginError(null);
    if (!loginIdentifier.trim()) {
      setLoginError('Veuillez saisir votre matricule ou email.');
      return;
    }
    const result = login(loginIdentifier.trim(), loginPassword);
    if (result.success) {
      setIsDeviceLoggedIn(true);
      setActiveTab('AGENDA');
      setLoginError(null);
    } else {
      setLoginError(result.error || 'Identifiant ou mot de passe incorrect.');
    }
  };

  const handleQuickDemoLogin = (identifier: string) => {
    setLoginError(null);
    setLoginIdentifier(identifier);
    const result = login(identifier);
    if (result.success) {
      setIsDeviceLoggedIn(true);
      setActiveTab('AGENDA');
      setLoginError(null);
    } else {
      setLoginError(result.error || 'Erreur de connexion');
    }
  };

  const handleBiometricLogin = () => {
    setLoginError(null);
    setIsBiometricScanning(true);
    setTimeout(() => {
      setIsBiometricScanning(false);
      const idToUse = loginIdentifier.trim() || 'EBM-2026-0042';
      const result = login(idToUse);
      if (result.success) {
        setIsDeviceLoggedIn(true);
        setActiveTab('AGENDA');
        setLoginError(null);
      } else {
        setLoginError('Empreinte biométrique reconnue mais compte inactif ou introuvable.');
      }
    }, 700);
  };

  const handleDeviceLogout = () => {
    setIsDeviceLoggedIn(false);
    setLoginError(null);
  };

  return (
    <div className="flex justify-center p-2 sm:p-4 bg-slate-900/95 rounded-2xl">
      {/* Android Device Frame */}
      <div className="w-[380px] h-[780px] bg-slate-950 rounded-[50px] p-3 shadow-2xl border-4 border-slate-700 relative flex flex-col overflow-hidden select-none">
        
        {/* Device Top Speaker & Camera Notch */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-32 h-4 bg-black rounded-full z-40 flex items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-800 mr-2"></div>
          <div className="w-12 h-1 bg-slate-800 rounded-full"></div>
        </div>

        {/* Android Screen Display */}
        <div className="w-full h-full bg-slate-50 rounded-[40px] flex flex-col overflow-hidden relative">
          
          {/* 1. Android Status Bar */}
          <div className="pt-2.5 px-6 pb-1 bg-slate-950 text-white flex justify-between items-center text-[11px] font-medium z-30">
            <span className="font-semibold tracking-wide">09:41</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-blue-400">5G</span>
              {isOfflineMode ? (
                <WifiOff className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
            </div>
          </div>

          {!isDeviceLoggedIn ? (
            /* Dedicated Android Login Screen */
            <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-4 flex flex-col justify-between bg-gradient-to-b from-slate-950 via-slate-900 to-blue-950 text-white">
              {/* Header & Logo */}
              <div className="space-y-2 text-center mt-1">
                <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-800 shadow-xl border border-blue-400/30">
                  <Smartphone className="w-7 h-7 text-white" />
                </div>
                <div>
                  <div className="inline-block px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[9px] font-bold border border-blue-400/30 uppercase tracking-wider mb-1">
                    EBM Mobile v3.2
                  </div>
                  <h2 className="text-lg font-black text-white tracking-tight">EBM Institute</h2>
                  <p className="text-[11px] text-slate-400">Portail Universitaire Mobile • Madagascar</p>
                </div>
              </div>

              {/* Login Form */}
              <form onSubmit={handleDeviceLogin} className="space-y-3 my-2">
                {loginError && (
                  <div className="p-2 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-200 text-xs flex items-start gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                    <span className="leading-tight text-[10px]">{loginError}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-300 block">Identifiant :</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                      <UserIcon className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="text"
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      placeholder="Matricule (ex: EBM-2026-0042) ou Email"
                      className="w-full bg-slate-800/80 border border-slate-700 focus:border-blue-500 rounded-xl py-1.5 pl-8 pr-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-300 block">Mot de passe :</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Mot de passe"
                      className="w-full bg-slate-800/80 border border-slate-700 focus:border-blue-500 rounded-xl py-1.5 pl-8 pr-8 text-xs text-white placeholder-slate-500 outline-none transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-900/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  Se connecter
                </button>

                {/* Biometric Instant Login */}
                <button
                  type="button"
                  onClick={handleBiometricLogin}
                  disabled={isBiometricScanning}
                  className="w-full py-1.5 bg-slate-800/90 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                >
                  <Fingerprint className={`w-3.5 h-3.5 text-cyan-400 ${isBiometricScanning ? 'animate-pulse' : ''}`} />
                  <span className="text-[11px]">{isBiometricScanning ? 'Scan biométrique...' : 'Empreinte biométrique (Touch ID)'}</span>
                </button>

                {/* Fast Demo Profiles Selector */}
                <div className="pt-2 border-t border-slate-800/80 space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block text-center">
                    Connexion Rapide Démo
                  </span>
                  <div className="grid grid-cols-1 gap-1">
                    <button
                      type="button"
                      onClick={() => handleQuickDemoLogin('EBM-2026-0042')}
                      className="w-full p-1.5 bg-blue-950/60 hover:bg-blue-900/60 border border-blue-500/30 rounded-lg text-left flex items-center justify-between text-xs transition-colors cursor-pointer"
                    >
                      <div>
                        <span className="font-bold text-blue-200 block text-[10px]">Laurent Randria (Étudiant L1)</span>
                        <span className="text-[9px] text-slate-400 font-mono">EBM-2026-0042 • L1-INFO-G1</span>
                      </div>
                      <span className="text-[8px] bg-blue-500/30 text-blue-300 font-bold px-1.5 py-0.5 rounded">
                        Étudiant
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleQuickDemoLogin('hery.rakoto@ebm.mg')}
                      className="w-full p-1.5 bg-purple-950/60 hover:bg-purple-900/60 border border-purple-500/30 rounded-lg text-left flex items-center justify-between text-xs transition-colors cursor-pointer"
                    >
                      <div>
                        <span className="font-bold text-purple-200 block text-[10px]">Dr. Hery Rakoto (Enseignant)</span>
                        <span className="text-[9px] text-slate-400 font-mono">hery.rakoto@ebm.mg</span>
                      </div>
                      <span className="text-[8px] bg-purple-500/30 text-purple-300 font-bold px-1.5 py-0.5 rounded">
                        Enseignant
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleQuickDemoLogin('admin@ebm.mg')}
                      className="w-full p-1.5 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-500/30 rounded-lg text-left flex items-center justify-between text-xs transition-colors cursor-pointer"
                    >
                      <div>
                        <span className="font-bold text-emerald-200 block text-[10px]">Dr. Razafy (Administration)</span>
                        <span className="text-[9px] text-slate-400 font-mono">admin@ebm.mg • Responsable</span>
                      </div>
                      <span className="text-[8px] bg-emerald-500/30 text-emerald-300 font-bold px-1.5 py-0.5 rounded">
                        Admin
                      </span>
                    </button>
                  </div>
                </div>
              </form>

              {/* Security info note */}
              <div className="bg-slate-900/80 rounded-xl p-2 border border-slate-800 text-[9px] text-slate-400 space-y-0.5 text-center mb-4">
                <span className="text-slate-300 font-semibold block">Filtrage étudiant strict actif</span>
                <span>Chaque étudiant n'accède qu'à son groupe, ses enseignants et son mur de promotion.</span>
              </div>
            </div>
          ) : (
            <>
              {/* 2. Android App Top Bar */}
              <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white px-4 pt-1 pb-2.5 flex items-center justify-between shadow-md z-30">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center font-black text-amber-300 text-xs shadow-inner">
                    EBM
                  </div>
                  <div className="leading-tight">
                    <h1 className="text-xs font-black tracking-tight flex items-center gap-1.5">
                      EBM Mobile
                      {isStudent && (
                        <span className="bg-blue-500/30 text-blue-300 text-[9px] px-1.5 py-0.2 rounded font-normal">
                          {myEnrolledGroup?.code || 'L1-INFO'}
                        </span>
                      )}
                    </h1>
                    <p className="text-[10px] text-slate-300 truncate max-w-[150px]">
                      {currentUser.name} {isStudent && `• ${currentUser.matricule}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Offline toggle button */}
                  <button
                    onClick={toggleOfflineMode}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all border ${
                      isOfflineMode
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    }`}
                    title="Basculer le mode hors-ligne"
                  >
                    {isOfflineMode ? 'Hors-ligne' : 'En ligne'}
                  </button>

                  {/* Android Logout Button in Top Bar */}
                  <button
                    onClick={handleDeviceLogout}
                    className="p-1 rounded-lg bg-white/10 hover:bg-rose-500/30 text-slate-300 hover:text-rose-200 transition-colors border border-white/10 cursor-pointer"
                    title="Se déconnecter (Écran de connexion Android)"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 3. Horizontal Android Material Chip Bar (Fast Tab Switching) */}
              <div className="bg-slate-900 text-slate-200 px-2 py-1.5 flex gap-1.5 overflow-x-auto no-scrollbar border-b border-slate-800 shrink-0 z-20">
            {[
              { id: 'AGENDA' as AndroidTab, label: 'Agenda', icon: Calendar },
              { id: 'LMD_COURS' as AndroidTab, label: 'Maquette LMD', icon: Layers },
              { id: 'NOTES' as AndroidTab, label: 'Notes & Relevés', icon: Award },
              { id: 'QR_SCAN' as AndroidTab, label: 'Pointage QR', icon: QrCode },
              { id: 'FINANCES' as AndroidTab, label: 'Finances (Ar)', icon: Banknote },
              { id: 'DEVOIRS' as AndroidTab, label: 'Devoirs', icon: Clock },
              { id: 'COMMUNICATION' as AndroidTab, label: 'Mur & Msg', icon: MessageSquare },
              { id: 'NOTIFS' as AndroidTab, label: `Alertes (${unreadAndroidCount})`, icon: Bell },
              { id: 'PROFILE' as AndroidTab, label: 'Profil', icon: UserIcon },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-400/40'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* 4. Scrollable Screen Content Body */}
          <div className="flex-1 overflow-y-auto no-scrollbar p-3 pb-16 space-y-3">
            
            {/* SCREEN 1: AGENDA (Aujourd'hui & Semaine) */}
            {activeTab === 'AGENDA' && (
              <div className="space-y-3">
                {/* Sub-tabs: Aujourd'hui vs Semaine */}
                <div className="flex bg-slate-200 p-0.5 rounded-xl text-xs font-bold">
                  <button
                    onClick={() => setAgendaMode('TODAY')}
                    className={`flex-1 py-1.5 rounded-lg transition-all ${
                      agendaMode === 'TODAY' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    Aujourd'hui ({todaySessions.length})
                  </button>
                  <button
                    onClick={() => setAgendaMode('WEEK')}
                    className={`flex-1 py-1.5 rounded-lg transition-all ${
                      agendaMode === 'WEEK' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    {androidDayOffsets.length === 5 ? 'Semaine (Lun-Ven)' : `Semaine (${androidDayOffsets.length}j)`}
                  </button>
                </div>

                {/* Day selector chips (Lundi à Vendredi, et Samedi/Dimanche si activités créées) */}
                <div className="flex justify-between gap-1 overflow-x-auto no-scrollbar pb-0.5">
                  {androidDayOffsets.map((offset) => {
                    const isSelected = selectedDayOffset === offset;
                    const isWeekend = offset >= 5;
                    return (
                      <button
                        key={offset}
                        onClick={() => setSelectedDayOffset(offset)}
                        className={`flex-1 min-w-[36px] py-1.5 rounded-xl flex flex-col items-center text-[10px] font-bold transition-all ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-sm'
                            : isWeekend
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-white text-slate-600 border border-slate-200'
                        }`}
                      >
                        <span className="uppercase text-[9px]">{dayNames[offset]}</span>
                        <span className="text-xs">{new Date(getDateStr(offset)).getDate()}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Sessions List */}
                <div className="space-y-2">
                  {todaySessions.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-400">
                      <CalendarDays className="w-8 h-8 mx-auto text-slate-300 mb-1" />
                      <p className="text-xs font-semibold">Aucun cours planifié ce jour.</p>
                    </div>
                  ) : (
                    todaySessions.map((session) => {
                      const course = courses.find((c) => c.id === session.courseId);
                      const room = rooms.find((r) => r.id === session.roomId);
                      const teacher = users.find((u) => u.id === session.teacherId);
                      const googleCalUrl = createGoogleCalendarUrl(session, course, room, teacher);

                      return (
                        <div
                          key={session.id}
                          onClick={() => setSelectedSession(session)}
                          className="bg-white rounded-2xl p-3 border border-slate-200 shadow-xs hover:border-blue-300 transition-all cursor-pointer space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                              {course?.code}
                            </span>
                            {getStatusBadge(session.status)}
                          </div>

                          <h3 className="font-bold text-xs text-slate-900 leading-tight">
                            {course?.title}
                          </h3>

                          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                            <div className="flex items-center gap-1 font-semibold text-slate-700">
                              <Clock className="w-3 h-3 text-blue-600" />
                              <span>{session.startTime} - {session.endTime}</span>
                            </div>
                            <div className="flex items-center gap-1 font-medium text-slate-600">
                              <MapPin className="w-3 h-3 text-emerald-600" />
                              <span>{room?.name}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-1 text-[10px]">
                            <span className="text-slate-500 truncate max-w-[180px]">
                              👤 {teacher?.name}
                            </span>
                            <a
                              href={googleCalUrl}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-blue-600 font-bold hover:underline flex items-center gap-0.5"
                            >
                              Agenda <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* SCREEN 2: MAQUETTE LMD & COURS */}
            {activeTab === 'LMD_COURS' && (
              <div className="space-y-3 text-xs">
                {/* Header Badge */}
                <div className="bg-indigo-900 text-white p-3 rounded-2xl shadow-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                      Parcours Académique LMD
                    </span>
                    <span className="bg-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded text-amber-300">
                      30 Crédits / Semestre
                    </span>
                  </div>
                  <h2 className="text-sm font-bold">
                    {isStudent ? (myEnrolledGroup ? myEnrolledGroup.name : 'Licence 1 Informatique') : 'Maquette Officielle EBM'}
                  </h2>
                  <p className="text-[10px] text-indigo-200">
                    {isStudent
                      ? `Groupe : ${myEnrolledGroup?.code} • Seuls vos cours et enseignants référents sont affichés`
                      : 'Vue d’ensemble des Unités et Éléments Constitutifs'}
                  </p>
                </div>

                {/* UEs List */}
                <div className="space-y-2.5">
                  {visibleUes.map((ue) => {
                    const ueEcs = ecs.filter((ec) => ec.ueId === ue.id);

                    return (
                      <div key={ue.id} className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="bg-indigo-600 text-white font-bold text-[10px] px-2 py-0.5 rounded">
                            {ue.code} • {ue.semester}
                          </span>
                          <span className="bg-amber-100 text-amber-800 font-bold text-[10px] px-2 py-0.5 rounded">
                            {ue.creditsEcts} ECTS
                          </span>
                        </div>

                        <h3 className="font-bold text-slate-800 text-xs">{ue.title}</h3>

                        {/* Child ECs */}
                        <div className="space-y-1.5 pt-1.5 border-t border-slate-100">
                          {ueEcs.map((ec) => {
                            const ecTeacher = users.find((u) => ec.teacherIds?.includes(u.id));
                            return (
                              <div key={ec.id} className="p-2 bg-slate-50 rounded-xl border border-slate-200 text-[11px] space-y-1">
                                <div className="flex items-center justify-between font-bold text-slate-900">
                                  <span>{ec.title}</span>
                                  <span className="text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded font-mono">
                                    {ec.code}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-[10px] text-slate-500">
                                  <span>👤 {ecTeacher?.name || 'Enseignant référent'}</span>
                                  <span className="font-semibold text-slate-700">{ec.hourlyVolume}h • {ec.creditsEcts} ECTS</span>
                                </div>
                                <div className="text-[9px] text-slate-400 font-mono">
                                  Évaluation : Quiz {Math.round(ec.quizWeight * 100)}% + Examen {Math.round(ec.examWeight * 100)}%
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SCREEN 3: NOTES & ÉVALUATIONS LMD (40/60) */}
            {activeTab === 'NOTES' && (
              <div className="space-y-3 text-xs">
                {/* Official LMD Formula Pill */}
                <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white p-3 rounded-2xl shadow-sm space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider">
                    <Award className="w-3.5 h-3.5" />
                    Relevé Officiel de Notes LMD
                  </div>
                  <div className="bg-white/20 p-1.5 rounded-lg font-mono text-[10px] font-bold text-center">
                    Note finale = (Quiz × 0.40) + (Examen × 0.60)
                  </div>
                  <p className="text-[9px] text-amber-100 text-center">
                    Validation de l'UE à partir de 10.00 / 20 • Capitalisation intégrale des ECTS
                  </p>
                </div>

                {/* UE Summaries and EC Grades */}
                <div className="space-y-2.5">
                  {visibleUes.map((ue) => {
                    const ueSummary = getStudentUeSummary(targetStudentId, ue.id);
                    const ueEcs = ecs.filter((ec) => ec.ueId === ue.id);

                    return (
                      <div key={ue.id} className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-bold text-slate-900 text-xs">{ue.title}</span>
                            <span className="text-[10px] text-slate-400 block">{ue.code} • {ue.semester}</span>
                          </div>
                          <div className="text-right">
                            <span
                              className={`text-sm font-black ${
                                ueSummary.average >= ue.validationThreshold ? 'text-emerald-600' : 'text-rose-600'
                              }`}
                            >
                              {ueSummary.average.toFixed(2)}/20
                            </span>
                            <span
                              className={`block text-[9px] font-bold uppercase px-1.5 py-0.2 rounded ${
                                ueSummary.isPassed
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {ueSummary.isPassed ? `Validée (${ue.creditsEcts} ECTS)` : 'Ajournée'}
                            </span>
                          </div>
                        </div>

                        {/* EC Breakdown */}
                        <div className="space-y-1 pt-1.5 border-t border-slate-100">
                          {ueEcs.map((ec) => {
                            const ecGrade = getStudentEcGrade(targetStudentId, ec.id);
                            return (
                              <div
                                key={ec.id}
                                className="p-2 bg-slate-50 rounded-xl text-[10px] flex items-center justify-between"
                              >
                                <div>
                                  <span className="font-semibold text-slate-800 block truncate max-w-[170px]">
                                    {ec.title}
                                  </span>
                                  <span className="text-slate-400">
                                    Quiz: {ecGrade?.quizScore !== undefined ? `${ecGrade.quizScore}/20` : '-'} • Examen: {ecGrade?.examScore !== undefined ? `${ecGrade.examScore}/20` : '-'}
                                  </span>
                                </div>
                                <div className="text-right">
                                  <span className="font-bold text-slate-900 text-xs">
                                    {ecGrade?.finalScore !== undefined ? `${ecGrade.finalScore.toFixed(2)}` : 'N/A'}
                                  </span>
                                  <span className="text-[9px] text-slate-400 block font-mono">/ 20</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SCREEN 4: POINTAGE QR CODE PRÉSENCE */}
            {activeTab === 'QR_SCAN' && (
              <div className="space-y-3 text-xs">
                <div className="bg-emerald-900 text-white p-3 rounded-2xl shadow-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-emerald-300">
                      Émargement & Pointage Officiel
                    </span>
                    <span className="bg-emerald-800 text-[10px] font-mono text-emerald-200 px-2 py-0.5 rounded">
                      GPS / OTP
                    </span>
                  </div>
                  <h2 className="text-sm font-bold">Pointage Numérique des Séances</h2>
                  <p className="text-[10px] text-emerald-200">
                    Validez votre présence lors de la séance en scannant le QR code ou par code OTP à 4 chiffres.
                  </p>
                </div>

                {/* Scan Notice Feedback */}
                {scanResult && (
                  <div
                    className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                      scanResult.success
                        ? 'bg-emerald-100 border border-emerald-300 text-emerald-800'
                        : 'bg-rose-100 border border-rose-300 text-rose-800'
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

                {/* Active Session Scan Trigger */}
                {activeQrSession ? (
                  <div className="bg-white rounded-2xl border-2 border-emerald-500 p-4 shadow-sm space-y-3 text-center">
                    <div className="flex items-center justify-between text-[10px] font-bold">
                      <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                        Séance Active en Cours
                      </span>
                      <span className="text-rose-600 font-mono">
                        {Math.floor(remainingSeconds / 60)}:{(remainingSeconds % 60).toString().padStart(2, '0')}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-bold text-sm text-slate-900">{activeQrSession.courseTitle}</h3>
                      <p className="text-[11px] text-slate-500">
                        Salle {activeQrSession.roomName} • OTP : {activeQrSession.codeToken}
                      </p>
                    </div>

                    <button
                      onClick={handleStudentScan}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                    >
                      <QrCode className="w-4 h-4" />
                      Scanner le QR Code (1-Clic)
                    </button>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-5 text-center text-slate-400 space-y-1">
                    <Clock className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="font-semibold text-xs text-slate-700">Aucune séance de pointage active</p>
                    <p className="text-[10px] text-slate-400">
                      L'enseignant lancera le pointage dès l'ouverture du cours dans la salle.
                    </p>
                  </div>
                )}

                {/* OTP Code Fallback Input */}
                <form onSubmit={handleStudentOtpSubmit} className="bg-white rounded-2xl border border-slate-200 p-3.5 space-y-2 shadow-xs">
                  <label className="text-[11px] font-bold text-slate-700 block">
                    Code OTP de secours (affiché sous le QR) :
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="ex: EBM-8429"
                      value={inputOtp}
                      onChange={(e) => setInputOtp(e.target.value.toUpperCase())}
                      className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold uppercase outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      type="submit"
                      className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all cursor-pointer"
                    >
                      Valider
                    </button>
                  </div>
                </form>

                {/* Pointage History */}
                <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs space-y-2">
                  <h4 className="font-bold text-xs text-slate-800">Derniers Émargements Enregistrés</h4>
                  <div className="space-y-1.5 divide-y divide-slate-100">
                    <div className="pt-1.5 flex items-center justify-between text-[11px]">
                      <div>
                        <span className="font-semibold text-slate-800 block">Algorithmique & Structures</span>
                        <span className="text-[10px] text-slate-400">Aujourd'hui 08:30 • Amphi A</span>
                      </div>
                      <span className="bg-emerald-100 text-emerald-800 font-bold text-[9px] px-2 py-0.5 rounded-full">
                        Présent
                      </span>
                    </div>
                    <div className="pt-1.5 flex items-center justify-between text-[11px]">
                      <div>
                        <span className="font-semibold text-slate-800 block">Modélisation UML & BDD</span>
                        <span className="text-[10px] text-slate-400">Hier 14:15 • Salle Info 2</span>
                      </div>
                      <span className="bg-emerald-100 text-emerald-800 font-bold text-[9px] px-2 py-0.5 rounded-full">
                        Présent
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SCREEN 5: FINANCES & QUITTANCES (ARIARY) */}
            {activeTab === 'FINANCES' && (
              <div className="space-y-3 text-xs">
                {/* Financial Overview Card */}
                <div className="bg-gradient-to-r from-teal-900 via-emerald-950 to-slate-900 text-white p-4 rounded-2xl shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-emerald-300">
                      Scolarité • 100% Ariary (Ar)
                    </span>
                    <span className="bg-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                      Année 2026-2027
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-300 block uppercase font-medium">Solde restant dû</span>
                    <h2 className="text-xl font-black text-amber-300">
                      {formatAriary(financialSummary.balanceDueAr)}
                    </h2>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-800/60 text-[10px]">
                    <div>
                      <span className="text-slate-400 block">Total Frais</span>
                      <span className="font-bold text-white">{formatAriary(financialSummary.totalFeesAr)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Total Réglé</span>
                      <span className="font-bold text-emerald-400">{formatAriary(financialSummary.totalPaidAr)}</span>
                    </div>
                  </div>
                </div>

                {/* Status Notice */}
                {financialSummary.balanceDueAr > 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Un solde reste à régler avant la prochaine session d'examens.</span>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-[11px] flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Frais de scolarité intégralement soldés.</span>
                  </div>
                )}

                {/* Official Receipts List */}
                <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs space-y-2">
                  <h3 className="font-bold text-xs text-slate-800 flex items-center justify-between">
                    <span>Quittances & Reçus Officiels</span>
                    <span className="text-[10px] text-slate-400">({targetStudentPayments.length})</span>
                  </h3>

                  <div className="space-y-2">
                    {targetStudentPayments.map((p) => (
                      <div
                        key={p.id}
                        className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] flex items-center justify-between"
                      >
                        <div>
                          <span className="font-mono font-bold text-blue-900 block">{p.receiptNumber}</span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(p.paymentDate).toLocaleDateString('fr-FR')} • {p.paymentMethod}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-black text-emerald-700 block">{formatAriary(p.amountPaidAr)}</span>
                          <button
                            onClick={() => setActiveReceiptModal(p)}
                            className="text-[10px] text-blue-600 font-bold hover:underline"
                          >
                            Voir reçu
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* SCREEN 6: DEVOIRS & SUPPORTS DE COURS */}
            {activeTab === 'DEVOIRS' && (
              <div className="space-y-3 text-xs">
                {/* Header Banner */}
                <div className="bg-gradient-to-r from-blue-950 to-indigo-900 text-white p-3.5 rounded-2xl shadow-sm space-y-1">
                  <span className="text-[10px] font-bold uppercase text-blue-300">Travaux & Pédagogie</span>
                  <h2 className="text-sm font-bold">Devoirs à Rendre & Supports</h2>
                  <p className="text-[10px] text-blue-200">
                    Déposez vos travaux avant la date limite et consultez les polycopiés de cours.
                  </p>
                </div>

                {/* Devoirs List */}
                <div className="space-y-2">
                  <h3 className="font-bold text-xs text-slate-800">Devoirs assignés ({visibleHomework.length})</h3>
                  {visibleHomework.map((hw) => {
                    const ec = ecs.find((e) => e.id === hw.ecId);
                    const mySub = submissions.find((s) => s.homeworkId === hw.id && s.studentId === currentUser.id);
                    const isDue = Date.now() > new Date(hw.dueDate).getTime();

                    return (
                      <div key={hw.id} className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded">
                            {ec?.code}
                          </span>
                          <span className={`text-[10px] font-bold ${isDue ? 'text-rose-600' : 'text-slate-500'}`}>
                            {isDue ? 'Échu' : 'Échéance :'} {new Date(hw.dueDate).toLocaleDateString('fr-FR')}
                          </span>
                        </div>

                        <div>
                          <h4 className="font-bold text-slate-900 text-xs">{hw.title}</h4>
                          <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{hw.instructions}</p>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                          {mySub ? (
                            <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-[10px]">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Rendu • {mySub.grade !== undefined ? `Note : ${mySub.grade}/20` : 'En attente de note'}</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => setSelectedHwToSubmit(hw)}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] rounded-lg transition-colors cursor-pointer"
                            >
                              Rendre mon travail
                            </button>
                          )}
                          <span className="text-[10px] text-slate-400 font-medium">Barème: / {hw.maxScore}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Supports de cours */}
                <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs space-y-2">
                  <h3 className="font-bold text-xs text-slate-800">Supports & Polycopiés PDF ({visibleResources.length})</h3>
                  <div className="space-y-1.5">
                    {visibleResources.map((res) => (
                      <div
                        key={res.id}
                        className="p-2 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-[11px]"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                            <FileText className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-800 block truncate max-w-[170px]">{res.title}</span>
                            <span className="text-[9px] text-slate-400">{res.fileName} • {res.fileSize}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => alert(`Téléchargement de : ${res.fileName}`)}
                          className="p-1.5 bg-white border border-slate-200 text-blue-600 hover:bg-blue-50 rounded-lg text-[10px] font-bold"
                          title="Télécharger le support"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* SCREEN 7: COMMUNICATION & MUR DU GROUPE */}
            {activeTab === 'COMMUNICATION' && (
              <div className="space-y-3 text-xs">
                {/* Sub tabs: Mur du Groupe vs Messagerie */}
                <div className="flex bg-slate-200 p-0.5 rounded-xl text-xs font-bold">
                  <button
                    onClick={() => setCommSubTab('WALL')}
                    className={`flex-1 py-1.5 rounded-lg transition-all ${
                      commSubTab === 'WALL' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    Mur {isStudent ? myEnrolledGroup?.code : 'Promotion'}
                  </button>
                  <button
                    onClick={() => setCommSubTab('MESSAGES')}
                    className={`flex-1 py-1.5 rounded-lg transition-all ${
                      commSubTab === 'MESSAGES' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    Messages ({myMessages.filter((m) => !m.isRead && m.senderId !== currentUser.id).length})
                  </button>
                </div>

                {commSubTab === 'WALL' ? (
                  <div className="space-y-2.5">
                    {/* Locked promotion info */}
                    <div className="bg-blue-50 border border-blue-200 p-2.5 rounded-xl text-[11px] text-blue-950 flex items-center gap-2">
                      <Lock className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>
                        Mur officiel du groupe <strong>{myEnrolledGroup?.code || 'L1-INFO-A'}</strong> (Accès restreint).
                      </span>
                    </div>

                    {/* Posts List */}
                    {visiblePosts.length === 0 ? (
                      <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-6 text-center text-slate-400">
                        <MessageSquare className="w-8 h-8 mx-auto text-slate-300 mb-1" />
                        <p className="font-semibold text-xs">Aucune publication sur le mur.</p>
                      </div>
                    ) : (
                      visiblePosts.map((post) => (
                        <div
                          key={post.id}
                          className={`bg-white rounded-2xl border p-3 shadow-xs space-y-1.5 ${
                            post.isPinned ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 text-xs">{post.authorName}</span>
                              <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded">
                                {post.authorRole}
                              </span>
                            </div>
                            {post.isPinned && (
                              <span className="flex items-center gap-0.5 text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded">
                                <Pin className="w-2.5 h-2.5" /> Épinglé
                              </span>
                            )}
                          </div>
                          <h4 className="font-bold text-slate-900 text-xs">{post.title}</h4>
                          <p className="text-[11px] text-slate-600 leading-relaxed whitespace-pre-line">{post.content}</p>
                          <span className="text-[9px] text-slate-400 block pt-1 border-t border-slate-100">
                            {new Date(post.createdAt).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  /* Messaging Subtab */
                  <div className="space-y-2.5">
                    <button
                      onClick={() => setShowNewMsgModal(true)}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Nouveau Message Direct
                    </button>

                    {/* Messages list */}
                    <div className="space-y-1.5">
                      {myMessages.length === 0 ? (
                        <div className="py-6 text-center text-slate-400 text-xs italic">
                          Boîte de messagerie vide.
                        </div>
                      ) : (
                        myMessages.map((msg) => {
                          const isSentByMe = msg.senderId === currentUser.id;
                          return (
                            <div
                              key={msg.id}
                              onClick={() => !msg.isRead && markMessageAsRead(msg.id)}
                              className={`p-2.5 rounded-xl border text-xs cursor-pointer ${
                                !msg.isRead && !isSentByMe
                                  ? 'bg-blue-50/80 border-blue-200 font-semibold'
                                  : 'bg-white border-slate-200'
                              }`}
                            >
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="font-bold text-slate-900">
                                  {isSentByMe ? 'Envoyé' : `De: ${msg.senderName}`}
                                </span>
                                <span className="text-slate-400">
                                  {new Date(msg.timestamp).toLocaleDateString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <h5 className="font-bold text-slate-800 text-[11px] mt-0.5">{msg.subject}</h5>
                              <p className="text-[10px] text-slate-600 line-clamp-2 mt-0.5">{msg.content}</p>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SCREEN 8: NOTIFICATIONS PUSH */}
            {activeTab === 'NOTIFS' && (
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                  <h3 className="font-bold text-slate-800">Alertes & Notifications Push</h3>
                  {unreadAndroidCount > 0 && (
                    <button
                      onClick={() => markAllAsRead('ANDROID')}
                      className="text-[10px] text-blue-600 font-bold hover:underline"
                    >
                      Tout marquer comme lu
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {userNotifs.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs italic">
                      Aucune notification reçue.
                    </div>
                  ) : (
                    userNotifs.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => !n.isReadAndroid && markAsRead(n.id, 'ANDROID')}
                        className={`p-3 rounded-2xl border text-xs space-y-1 transition-all cursor-pointer ${
                          !n.isReadAndroid
                            ? 'bg-blue-50/70 border-blue-200 font-semibold shadow-xs'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-xs">{n.title}</span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(n.createdAt).toLocaleDateString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* SCREEN 9: MON PROFIL & SÉCURITÉ */}
            {activeTab === 'PROFILE' && (
              <div className="space-y-3 text-xs">
                {/* Profile Card */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-700 text-white flex items-center justify-center font-black text-sm">
                    {currentUser.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{currentUser.name}</h3>
                    <p className="text-[11px] text-slate-500">{currentUser.email}</p>
                    <span className="text-[9px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full inline-block mt-1">
                      {isStudent ? `Étudiant • ${currentUser.matricule}` : currentUser.role}
                    </span>
                  </div>
                </div>

                {/* Academic Enrollment Info */}
                {isStudent && (
                  <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs space-y-1.5">
                    <h4 className="font-bold text-xs text-slate-800">Données Pédagogiques</h4>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Promotion / Groupe</span>
                        <span className="font-bold text-slate-900">{myEnrolledGroup?.name} ({myEnrolledGroup?.code})</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Enseignants référents</span>
                        <span className="font-bold text-slate-900">{studentTeachers.length} assignés</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Google Calendar Sync Card */}
                <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="font-bold text-xs text-slate-800">Synchronisation Google Agenda</span>
                    <p className="text-[10px] text-slate-500">Mise à jour automatique des cours</p>
                  </div>
                  <button
                    onClick={() => toggleGoogleCalendarLink(currentUser.id)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-[10px] transition-colors border ${
                      currentUser.googleCalendarLinked
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : 'bg-slate-100 text-slate-700 border-slate-300'
                    }`}
                  >
                    {currentUser.googleCalendarLinked ? 'Synchronisé' : 'Activer'}
                  </button>
                </div>

                {/* Change Password Trigger */}
                <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-xs text-slate-800">Sécurité du Compte</span>
                      <p className="text-[10px] text-slate-500">Mot de passe personnel</p>
                    </div>
                    <button
                      onClick={() => setIsChangingPassword(!isChangingPassword)}
                      className="px-3 py-1 bg-slate-900 text-white font-bold text-[10px] rounded-lg"
                    >
                      {isChangingPassword ? 'Annuler' : 'Modifier'}
                    </button>
                  </div>

                  {isChangingPassword && (
                    <form onSubmit={handlePasswordSubmit} className="pt-2 border-t border-slate-100 space-y-2">
                      {pwdMsg && <div className="text-[10px] font-bold text-emerald-700">{pwdMsg}</div>}
                      <input
                        type="password"
                        placeholder="Nouveau mot de passe (min 6 car.)"
                        value={newPasswordInput}
                        onChange={(e) => setNewPasswordInput(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
                      />
                      <button
                        type="submit"
                        className="w-full py-2 bg-blue-600 text-white font-bold rounded-lg text-xs"
                      >
                        Enregistrer
                      </button>
                    </form>
                  )}
                </div>

                {/* Mobile Logout Button in Profile Screen */}
                <div className="pt-2">
                  <button
                    onClick={handleDeviceLogout}
                    className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    Se déconnecter de l'application mobile
                  </button>
                  <p className="text-[10px] text-center text-slate-400 mt-1">
                    Ferme la session et affiche l'écran de connexion mobile.
                  </p>
                </div>
              </div>
            )}
          </div>
        </>
      )}

          {/* 5. Session Details Bottom Sheet Modal */}
          {selectedSession && (
            <div className="absolute inset-0 bg-slate-950/70 z-50 flex flex-col justify-end">
              <div className="bg-white rounded-t-[32px] p-4 space-y-3 max-h-[85%] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom duration-200">
                <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-2"></div>
                {(() => {
                  const course = courses.find((c) => c.id === selectedSession.courseId);
                  const room = rooms.find((r) => r.id === selectedSession.roomId);
                  const teacher = users.find((u) => u.id === selectedSession.teacherId);
                  const googleCalUrl = createGoogleCalendarUrl(selectedSession, course, room, teacher);

                  return (
                    <div className="space-y-2.5 text-xs">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                            {course?.code}
                          </span>
                          <h3 className="text-sm font-bold text-slate-900 mt-1">{course?.title}</h3>
                        </div>
                        {getStatusBadge(selectedSession.status)}
                      </div>

                      <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 border border-slate-200 text-slate-700">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-blue-600" />
                          <span>{selectedSession.date} • {selectedSession.startTime} à {selectedSession.endTime}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{room?.name} ({room?.building})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <UserIcon className="w-3.5 h-3.5 text-purple-600" />
                          <span>{teacher?.name} ({teacher?.email})</span>
                        </div>
                      </div>

                      <a
                        href={googleCalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-900 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 border border-blue-200"
                      >
                        <Calendar className="w-3.5 h-3.5 text-blue-600" />
                        Ajouter à Google Agenda
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </a>

                      <button
                        onClick={() => setSelectedSession(null)}
                        className="w-full py-2 bg-slate-900 text-white font-semibold text-xs rounded-xl"
                      >
                        Fermer
                      </button>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* 6. Modal: Submit Homework */}
          {selectedHwToSubmit && (
            <div className="absolute inset-0 bg-slate-950/70 z-50 flex flex-col justify-end">
              <form onSubmit={handleHomeworkSubmit} className="bg-white rounded-t-[32px] p-4 space-y-3 max-h-[85%] overflow-y-auto">
                <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-2"></div>
                <h3 className="font-bold text-sm text-slate-900">Déposer un Devoir</h3>
                <p className="text-[11px] text-slate-500">{selectedHwToSubmit.title}</p>

                {submitNotice && (
                  <div className="p-2 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-lg">
                    {submitNotice}
                  </div>
                )}

                <div className="space-y-2 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Nom du fichier :</label>
                    <input
                      type="text"
                      placeholder="ex: TP_Algorithmique_Laurent.pdf"
                      value={submitFileName}
                      onChange={(e) => setSubmitFileName(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg p-2"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Commentaire éventuel :</label>
                    <textarea
                      rows={2}
                      placeholder="Message pour l'enseignant..."
                      value={submitComment}
                      onChange={(e) => setSubmitComment(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg p-2"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedHwToSubmit(null)}
                    className="flex-1 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-md"
                  >
                    Envoyer
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* 7. Modal: New Direct Message */}
          {showNewMsgModal && (
            <div className="absolute inset-0 bg-slate-950/70 z-50 flex flex-col justify-end">
              <form onSubmit={handleSendDirectMessage} className="bg-white rounded-t-[32px] p-4 space-y-3 max-h-[85%] overflow-y-auto">
                <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-2"></div>
                <h3 className="font-bold text-sm text-slate-900">Écrire un Message Direct</h3>

                {msgNotice && (
                  <div className="p-2 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-lg">
                    {msgNotice}
                  </div>
                )}

                <div className="space-y-2 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Destinataire :</label>
                    <select
                      value={msgRecipientId}
                      onChange={(e) => setMsgRecipientId(e.target.value)}
                      required
                      className="w-full border border-slate-300 rounded-lg p-2 font-medium"
                    >
                      <option value="">-- Choisir un destinataire --</option>
                      {isStudent ? (
                        <>
                          <optgroup label="Vos Enseignants (Promotion)">
                            {studentTeachers.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name} (Enseignant)
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="Direction & Scolarité">
                            {users
                              .filter((u) => ['ADMIN', 'ACADEMIC_HEAD'].includes(u.role))
                              .map((u) => (
                                <option key={u.id} value={u.id}>
                                  {u.name} ({u.role})
                                </option>
                              ))}
                          </optgroup>
                        </>
                      ) : (
                        users
                          .filter((u) => u.id !== currentUser.id)
                          .map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name} ({u.role})
                            </option>
                          ))
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Objet :</label>
                    <input
                      type="text"
                      placeholder="ex: Question sur le TP"
                      value={msgSubject}
                      onChange={(e) => setMsgSubject(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg p-2"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Message :</label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Rédigez votre message..."
                      value={msgBody}
                      onChange={(e) => setMsgBody(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg p-2"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNewMsgModal(false)}
                    className="flex-1 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-md"
                  >
                    Envoyer
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* 8. Modal: Receipt View */}
          {activeReceiptModal && (
            <div className="absolute inset-0 bg-slate-950/70 z-50 flex flex-col justify-end">
              <div className="bg-white rounded-t-[32px] p-4 space-y-3 max-h-[85%] overflow-y-auto">
                <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-2"></div>
                <div className="text-center space-y-1">
                  <span className="text-[9px] font-bold uppercase text-emerald-700 tracking-wider">
                    EBM Institute • Quittance Officielle
                  </span>
                  <h3 className="font-mono font-black text-sm text-slate-900">{activeReceiptModal.receiptNumber}</h3>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Montant réglé :</span>
                    <span className="font-black text-emerald-700">{formatAriary(activeReceiptModal.amountPaidAr)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Date d'encaissement :</span>
                    <span className="font-semibold text-slate-800">{new Date(activeReceiptModal.paymentDate).toLocaleDateString('fr-FR')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Mode de paiement :</span>
                    <span className="font-semibold text-slate-800">{activeReceiptModal.paymentMethod}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Encaissé par :</span>
                    <span className="font-semibold text-slate-800">{activeReceiptModal.recordedBy}</span>
                  </div>
                </div>

                <button
                  onClick={() => setActiveReceiptModal(null)}
                  className="w-full py-2 bg-slate-900 text-white font-semibold text-xs rounded-xl"
                >
                  Fermer
                </button>
              </div>
            </div>
          )}

          {/* Services App Drawer Bottom Sheet */}
          {isServicesDrawerOpen && (
            <div
              className="absolute inset-0 bg-slate-950/70 z-40 flex flex-col justify-end"
              onClick={() => setIsServicesDrawerOpen(false)}
            >
              <div
                className="bg-white rounded-t-[32px] p-4 pb-20 space-y-3.5 max-h-[85%] overflow-y-auto no-scrollbar shadow-2xl animate-in slide-in-from-bottom duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-1"></div>
                <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                  <div>
                    <h3 className="font-black text-sm text-slate-900">Services EBM Mobile</h3>
                    <p className="text-[10px] text-slate-500">Accès rapide à tous les modules universitaires</p>
                  </div>
                  <button
                    onClick={() => setIsServicesDrawerOpen(false)}
                    className="p-1 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Pole 1: Pédagogie & Cursus */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Pédagogie & Cours
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      onClick={() => { setActiveTab('AGENDA'); setIsServicesDrawerOpen(false); }}
                      className="p-2.5 bg-blue-50/60 hover:bg-blue-100/60 border border-blue-200 rounded-xl text-left flex items-center gap-2 text-blue-900 cursor-pointer"
                    >
                      <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                      <div className="min-w-0">
                        <span className="font-bold text-[11px] block">Agenda</span>
                        <span className="text-[9px] text-slate-500">Cours & Salles</span>
                      </div>
                    </button>

                    <button
                      onClick={() => { setActiveTab('LMD_COURS'); setIsServicesDrawerOpen(false); }}
                      className="p-2.5 bg-indigo-50/60 hover:bg-indigo-100/60 border border-indigo-200 rounded-xl text-left flex items-center gap-2 text-indigo-900 cursor-pointer"
                    >
                      <Layers className="w-4 h-4 text-indigo-600 shrink-0" />
                      <div className="min-w-0">
                        <span className="font-bold text-[11px] block">Maquette LMD</span>
                        <span className="text-[9px] text-slate-500">UE, EC & ECTS</span>
                      </div>
                    </button>

                    <button
                      onClick={() => { setActiveTab('NOTES'); setIsServicesDrawerOpen(false); }}
                      className="p-2.5 bg-amber-50/60 hover:bg-amber-100/60 border border-amber-200 rounded-xl text-left flex items-center gap-2 text-amber-900 cursor-pointer"
                    >
                      <Award className="w-4 h-4 text-amber-600 shrink-0" />
                      <div className="min-w-0">
                        <span className="font-bold text-[11px] block">Notes 40/60</span>
                        <span className="text-[9px] text-slate-500">Quiz & Examens</span>
                      </div>
                    </button>

                    <button
                      onClick={() => { setActiveTab('DEVOIRS'); setIsServicesDrawerOpen(false); }}
                      className="p-2.5 bg-blue-50/60 hover:bg-blue-100/60 border border-blue-200 rounded-xl text-left flex items-center gap-2 text-blue-900 cursor-pointer"
                    >
                      <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                      <div className="min-w-0">
                        <span className="font-bold text-[11px] block">Devoirs</span>
                        <span className="text-[9px] text-slate-500">Dépôts & Sujets</span>
                      </div>
                    </button>
                    <button
                      onClick={() => { setActiveTab('QR_SCAN'); setIsServicesDrawerOpen(false); }}
                      className="p-2.5 bg-emerald-50/60 hover:bg-emerald-100/60 border border-emerald-200 rounded-xl text-left flex items-center gap-2 text-emerald-900 cursor-pointer col-span-2"
                    >
                      <QrCode className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div className="min-w-0">
                        <span className="font-bold text-[11px] block">Pointage QR & Présences</span>
                        <span className="text-[9px] text-slate-500">Scan QR Code dynamique & code OTP</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Pole 2: Pôle Finances & Caisse (Séparé de Communication) */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                    Pôle Finances & Caisse
                  </span>
                  <div className="grid grid-cols-1 gap-2 text-xs">
                    <button
                      onClick={() => { setActiveTab('FINANCES'); setIsServicesDrawerOpen(false); }}
                      className="p-2.5 bg-emerald-50/60 hover:bg-emerald-100/60 border border-emerald-200 rounded-xl text-left flex items-center gap-2 text-emerald-900 cursor-pointer"
                    >
                      <Banknote className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div className="min-w-0">
                        <span className="font-bold text-[11px] block">Finances & Caisse (Ar)</span>
                        <span className="text-[9px] text-slate-500">Frais d'études, échéancier, solde & reçus officiels</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Pole 3: Pôle Communication (Séparé de Finances & Caisse) */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">
                    Pôle Communication
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      onClick={() => { setActiveTab('COMMUNICATION'); setIsServicesDrawerOpen(false); }}
                      className="p-2.5 bg-purple-50/60 hover:bg-purple-100/60 border border-purple-200 rounded-xl text-left flex items-center gap-2 text-purple-900 cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4 text-purple-600 shrink-0" />
                      <div className="min-w-0">
                        <span className="font-bold text-[11px] block">Mur & Messages</span>
                        <span className="text-[9px] text-slate-500">Échanges directs</span>
                      </div>
                    </button>

                    <button
                      onClick={() => { setActiveTab('NOTIFS'); setIsServicesDrawerOpen(false); }}
                      className="p-2.5 bg-rose-50/60 hover:bg-rose-100/60 border border-rose-200 rounded-xl text-left flex items-center gap-2 text-rose-900 cursor-pointer"
                    >
                      <Bell className="w-4 h-4 text-rose-600 shrink-0" />
                      <div className="min-w-0">
                        <span className="font-bold text-[11px] block">Alertes Push</span>
                        <span className="text-[9px] text-slate-500">{unreadAndroidCount} non lues</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Pole 3: Compte */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => { setActiveTab('PROFILE'); setIsServicesDrawerOpen(false); }}
                    className="text-xs font-bold text-slate-700 hover:text-blue-700 flex items-center gap-1.5 cursor-pointer"
                  >
                    <UserIcon className="w-3.5 h-3.5" />
                    Mon Profil
                  </button>
                  <button
                    onClick={() => { handleDeviceLogout(); setIsServicesDrawerOpen(false); }}
                    className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Déconnexion
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 9. Android Bottom Navigation Bar (4 Core Action Tabs + Central Services Launcher) */}
          {isDeviceLoggedIn && (
            <div className="absolute bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 flex justify-around py-2 z-30">
              <button
                onClick={() => { setActiveTab('AGENDA'); setIsServicesDrawerOpen(false); }}
                className={`flex flex-col items-center gap-0.5 text-[10px] font-medium transition-colors cursor-pointer ${
                  activeTab === 'AGENDA' && !isServicesDrawerOpen ? 'text-blue-900 font-bold' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Calendar className="w-4 h-4" />
                Agenda
              </button>

              <button
                onClick={() => { setActiveTab('NOTES'); setIsServicesDrawerOpen(false); }}
                className={`flex flex-col items-center gap-0.5 text-[10px] font-medium transition-colors cursor-pointer ${
                  activeTab === 'NOTES' && !isServicesDrawerOpen ? 'text-blue-900 font-bold' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Award className="w-4 h-4" />
                Notes
              </button>

              <button
                onClick={() => { setActiveTab('QR_SCAN'); setIsServicesDrawerOpen(false); }}
                className={`flex flex-col items-center gap-0.5 text-[10px] font-medium transition-colors cursor-pointer ${
                  activeTab === 'QR_SCAN' && !isServicesDrawerOpen ? 'text-blue-900 font-bold' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <QrCode className="w-4 h-4" />
                Pointage
              </button>

              <button
                onClick={() => setIsServicesDrawerOpen(!isServicesDrawerOpen)}
                className={`flex flex-col items-center gap-0.5 text-[10px] font-medium transition-colors cursor-pointer ${
                  isServicesDrawerOpen ? 'text-blue-700 font-bold' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <div className={`p-1 rounded-lg ${isServicesDrawerOpen ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                  <LayoutGrid className="w-3.5 h-3.5" />
                </div>
                <span>Services</span>
              </button>

              <button
                onClick={() => { setActiveTab('PROFILE'); setIsServicesDrawerOpen(false); }}
                className={`flex flex-col items-center gap-0.5 text-[10px] font-medium transition-colors cursor-pointer ${
                  activeTab === 'PROFILE' && !isServicesDrawerOpen ? 'text-blue-900 font-bold' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <UserIcon className="w-4 h-4" />
                Profil
              </button>
            </div>
          )}

          {/* Android Home Navigation Pill */}
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-28 h-1 bg-slate-300 rounded-full z-40"></div>
        </div>
      </div>
    </div>
  );
};
