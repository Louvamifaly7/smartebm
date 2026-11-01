import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { RBAC } from '../utils/rbacPermissions';
import { escapeHtml, getAntananarivoDateStr } from '../utils/securityAndDateUtils';
import {
  Users,
  GraduationCap,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Wallet,
  Receipt,
  Bell,
  ShieldCheck,
  Lock,
  Printer,
  Link2,
  Unlink,
  UserPlus,
  Clock,
  BookOpen,
  FileCheck2,
  Eye,
  ChevronLeft,
  ChevronRight,
  MapPin,
} from 'lucide-react';

export const ParentPortalView: React.FC = () => {
  const {
    currentUser,
    users,
    groups,
    filieres,
    parcours,
    ues,
    sessions,
    courses,
    rooms,
    qrSessions,
    inscriptions,
    payments,
    fees,
    selectedAcademicYear,
    getStudentUeSummary,
    getStudentFinancialSummary,
    linkParentToStudent,
    unlinkParentFromStudent,
    addUser,
    updateUser,
  } = useApp();

  const isStaffManager =
    RBAC.isAdmin(currentUser.role) ||
    RBAC.isScolarite(currentUser.role) ||
    RBAC.isAdminStaff(currentUser.role);

  const parentUsers = users.filter((u) => u.role === 'PARENT');
  const allStudents = users.filter((u) => u.role === 'STUDENT');

  // If currentUser is PARENT, lock to their own account (ACC-088). If Admin/Scolarité, allow inspecting any parent account.
  const [selectedParentId, setSelectedParentId] = useState<string>(() => {
    if (currentUser.role === 'PARENT') return currentUser.id;
    return parentUsers[0]?.id || '';
  });

  const activeParent =
    currentUser.role === 'PARENT'
      ? currentUser
      : parentUsers.find((p) => p.id === selectedParentId) || parentUsers[0];

  // Strictly filter linked students (ACC-088: parent can ONLY see students explicitly linked to their account)
  const linkedStudents = allStudents.filter((st) =>
    activeParent?.linkedStudentIds?.includes(st.id)
  );

  const [selectedChildId, setSelectedChildId] = useState<string>(
    () => linkedStudents[0]?.id || ''
  );

  // Ensure selectedChildId belongs to linkedStudents
  const selectedChild =
    linkedStudents.find((st) => st.id === selectedChildId) || linkedStudents[0];

  const [activeSubTab, setActiveSubTab] = useState<
    'ACADEMIC' | 'ATTENDANCE' | 'FINANCIAL' | 'ADMIN_NOTIFS' | 'GOVERNANCE'
  >('ACADEMIC');
  const [parentWeekOffset, setParentWeekOffset] = useState<number>(0);

  // Governance form states (Admin/Scolarité)
  const [linkParentId, setLinkParentId] = useState(parentUsers[0]?.id || '');
  const [linkStudentId, setLinkStudentId] = useState(allStudents[0]?.id || '');
  const [newParentName, setNewParentName] = useState('');
  const [newParentEmail, setNewParentEmail] = useState('');
  const [newParentPhone, setNewParentPhone] = useState('');
  const [newParentStudentId, setNewParentStudentId] = useState(allStudents[0]?.id || '');
  const [govFeedback, setGovFeedback] = useState<string | null>(null);

  const childGroup = groups.find((g) => g.id === selectedChild?.groupId);
  const childFiliere = filieres.find((f) => f.id === childGroup?.filiereId);
  const childParcours = parcours.find((p) => p.id === selectedChild?.parcoursId);

  const consent = selectedChild?.parentAccessConsent || {
    academic: true,
    attendance: true,
    financial: true,
    administrative: true,
  };

  // Academic data for selected child
  const childUes = ues.filter(
    (u) =>
      u.academicYear === selectedAcademicYear &&
      (!childGroup || u.filiereId === childGroup.filiereId)
  );

  const childSessions = sessions.filter(
    (s) => selectedChild?.groupId && s.groupIds.includes(selectedChild.groupId) && s.status !== 'CANCELLED'
  );

  // Attendance data for selected child
  const childQrSessions = qrSessions.filter(
    (qs) => qs.groupId === selectedChild?.groupId
  );

  const attendanceRecords = childQrSessions.map((qs) => {
    const rec = qs.records.find((r) => r.studentId === selectedChild?.id);
    return {
      session: qs,
      status: rec?.status || 'ABSENT',
      scannedAt: rec?.scannedAt,
      reason: rec?.justificationReason,
    };
  });

  const presentCount = attendanceRecords.filter(
    (r) => r.status === 'PRESENT' || r.status === 'JUSTIFIED'
  ).length;
  const lateCount = attendanceRecords.filter((r) => r.status === 'LATE').length;
  const absentCount = attendanceRecords.filter((r) => r.status === 'ABSENT').length;
  const attendanceRate =
    childQrSessions.length > 0
      ? Math.round(((presentCount + lateCount) / childQrSessions.length) * 100)
      : 100;

  // Financial data for selected child
  const finSummary = selectedChild
    ? getStudentFinancialSummary(selectedChild.id)
    : { totalFeesAr: 0, totalPaidAr: 0, balanceDueAr: 0, feeDetails: [] };

  const childPayments = payments.filter(
    (p) => p.studentId === selectedChild?.id && !p.isCancelled
  );

  // Administrative inscription for selected child
  const childInscription = inscriptions.find(
    (i) => i.studentId === selectedChild?.id && i.academicYear === selectedAcademicYear
  );

  const handlePrintReceipt = (paymentId: string) => {
    const pay = payments.find((p) => p.id === paymentId);
    if (!pay || !selectedChild) return;
    const fee = fees.find((f) => f.id === pay.feeId);
    const win = window.open('', '_blank', 'width=720,height=560');
    if (!win) return;
    win.document.write(`
      <html>
        <head><title>Reçu ${escapeHtml(pay.receiptNumber)}</title></head>
        <body style="font-family:Arial,sans-serif;padding:28px;color:#0f172a;">
          <h2 style="margin:0;">EBM INSTITUTE MADAGASCAR — REÇU OFFICIEL</h2>
          <p style="color:#475569;font-size:13px;">Portail Parents / Tuteurs • N° Reçu : <strong>${escapeHtml(pay.receiptNumber)}</strong></p>
          <hr/>
          <p><strong>Étudiant :</strong> ${escapeHtml(selectedChild.name)} (${escapeHtml(selectedChild.matricule)})</p>
          <p><strong>Motif / Frais :</strong> ${escapeHtml(fee?.title || 'Frais académiques')}</p>
          <p><strong>Montant réglé :</strong> ${escapeHtml(pay.amountPaidAr.toLocaleString())} Ar</p>
          <p><strong>Solde restant :</strong> ${escapeHtml(pay.remainingBalanceAr.toLocaleString())} Ar</p>
          <p><strong>Mode de règlement :</strong> ${escapeHtml(pay.paymentMethod)} (${escapeHtml(pay.referenceNumber || 'Standard')})</p>
          <p><strong>Date :</strong> ${escapeHtml(pay.paymentDate)}</p>
          <script>window.onload = () => window.print();</script>
        </body>
      </html>
    `);
    win.document.close();
  };

  const handleCreateParentAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newParentName.trim() || !newParentEmail.trim()) return;
    const username = `parent.${newParentName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10)}`;
    const res = addUser({
      name: newParentName.trim(),
      username,
      email: newParentEmail.trim(),
      phone: newParentPhone.trim(),
      role: 'PARENT',
      linkedStudentIds: newParentStudentId ? [newParentStudentId] : [],
      parentVerificationStatus: 'VERIFIED',
      department: 'Association des Parents EBM',
      service: 'Parent / Tuteur Légal',
      jobTitle: 'Parent / Tuteur Légal',
    });
    if (res.success) {
      setNewParentName('');
      setNewParentEmail('');
      setNewParentPhone('');
      setGovFeedback('Compte Parent / Tuteur créé et rattaché avec succès (ACC-080, ACC-095).');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-teal-900 via-emerald-900 to-slate-900 rounded-3xl p-6 text-white shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-500/20 border border-teal-400/30 rounded-full text-xs font-bold text-teal-200">
              <Users className="w-3.5 h-3.5" />
              ESPACE PARENTS & TUTEURS LÉGAUX • ANNÉE {selectedAcademicYear}
            </div>
            <h2 className="text-2xl font-black tracking-tight">
              Portail Famille & Suivi Pédagogique, Assiduité et Finances
            </h2>
            <p className="text-xs text-teal-100/90 max-w-2xl">
              Accès sécurisé en lecture seule aux résultats académiques, à l’emploi du temps, à l’assiduité et aux échéanciers financiers des étudiants rattachés (ACC-080 à ACC-095).
            </p>
          </div>

          {/* Read-only Security Badge (ACC-088 & ACC-089) */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="px-3.5 py-2 bg-white/10 backdrop-blur border border-white/15 rounded-2xl text-xs">
              <div className="flex items-center gap-1.5 font-extrabold text-emerald-300">
                <Lock className="w-3.5 h-3.5" />
                Mode Consultation Strict (ACC-089)
              </div>
              <p className="text-[11px] text-teal-100">
                Isolation par rattachement familial vérifié
              </p>
            </div>

            {isStaffManager && (
              <div className="bg-slate-900/80 border border-teal-500/40 rounded-2xl px-3.5 py-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-teal-300">
                  Simuler / Inspecter un compte Parent :
                </label>
                <select
                  value={activeParent?.id || ''}
                  onChange={(e) => {
                    setSelectedParentId(e.target.value);
                    const par = parentUsers.find((p) => p.id === e.target.value);
                    if (par?.linkedStudentIds?.[0]) {
                      setSelectedChildId(par.linkedStudentIds[0]);
                    }
                  }}
                  className="mt-0.5 bg-transparent text-white text-xs font-bold focus:outline-none cursor-pointer"
                >
                  {parentUsers.map((p) => (
                    <option key={p.id} value={p.id} className="text-slate-900">
                      {p.name} ({p.linkedStudentIds?.length || 0} enfant(s))
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Multi-Child Selector Bar (ACC-081, ACC-082, ACC-094) */}
        <div className="mt-5 pt-4 border-t border-white/15 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-teal-200 uppercase tracking-wider mr-1">
              Étudiant(s) rattaché(s) à {activeParent?.name || 'ce compte'} :
            </span>
            {linkedStudents.length === 0 ? (
              <span className="px-3 py-1 bg-amber-500/20 border border-amber-400/40 rounded-xl text-xs font-bold text-amber-200">
                Aucun étudiant rattaché à ce compte parent
              </span>
            ) : (
              linkedStudents.map((child) => {
                const grp = groups.find((g) => g.id === child.groupId);
                const isSelected = child.id === selectedChild?.id;
                return (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => setSelectedChildId(child.id)}
                    className={`flex items-center gap-2.5 px-3.5 py-2 rounded-2xl text-xs font-bold transition border ${
                      isSelected
                        ? 'bg-white text-slate-900 border-white shadow-lg'
                        : 'bg-teal-950/60 text-teal-100 border-teal-700/60 hover:bg-teal-800/50'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center font-black text-[11px] overflow-hidden">
                      {child.avatarUrl ? (
                        <img src={child.avatarUrl} alt={child.name} className="w-full h-full object-cover" />
                      ) : (
                        child.name.charAt(0)
                      )}
                    </div>
                    <div className="text-left">
                      <p className="leading-tight">{child.name}</p>
                      <p className={`text-[10px] font-mono ${isSelected ? 'text-teal-700' : 'text-teal-300'}`}>
                        {child.matricule} • {grp?.code || 'L1'}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {selectedChild && (
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2.5 py-1 bg-emerald-500/20 border border-emerald-400/30 rounded-xl font-bold text-emerald-200 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Statut Parent : {activeParent?.parentVerificationStatus || 'VERIFIED'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Sub-tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
        <button
          type="button"
          onClick={() => setActiveSubTab('ACADEMIC')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            activeSubTab === 'ACADEMIC'
              ? 'bg-teal-700 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          A. Suivi Académique & Emploi du Temps
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('ATTENDANCE')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            activeSubTab === 'ATTENDANCE'
              ? 'bg-teal-700 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-4 h-4" />
          B. Assiduité, Présences & Retards
          {absentCount > 0 && (
            <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded-full text-[10px] font-extrabold">
              {absentCount} abs.
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('FINANCIAL')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            activeSubTab === 'FINANCIAL'
              ? 'bg-teal-700 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Wallet className="w-4 h-4" />
          C. Situation Financière & Reçus
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('ADMIN_NOTIFS')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            activeSubTab === 'ADMIN_NOTIFS'
              ? 'bg-teal-700 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Bell className="w-4 h-4" />
          D. Dossier Administratif & Alertes
        </button>
        {isStaffManager && (
          <button
            type="button"
            onClick={() => setActiveSubTab('GOVERNANCE')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ml-auto ${
              activeSubTab === 'GOVERNANCE'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Link2 className="w-4 h-4" />
            Administration & Rattachements Parents (ACC-093 / ACC-095)
          </button>
        )}
      </div>

      {!selectedChild && activeSubTab !== 'GOVERNANCE' ? (
        <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-2">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
          <h3 className="text-base font-black text-slate-900">
            Aucun étudiant rattaché à ce compte parent
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Conformément à la règle ACC-088, un compte parent/tuteur ne peut consulter aucun dossier tant que l’administration n’a pas validé le rattachement familial.
          </p>
        </div>
      ) : (
        <>
          {/* TAB A: ACADEMIC & TIMETABLE (ACC-084) */}
          {activeSubTab === 'ACADEMIC' && selectedChild && (
            <div className="space-y-6">
              {!consent.academic ? (
                <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl text-xs font-bold text-amber-900">
                  L’étudiant majeur ({selectedChild.name}) a restreint le partage de ses notes détaillées (ACC-092).
                </div>
              ) : (
                <>
                  {/* Academic Identity Summary Card */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                      <p className="text-[11px] font-bold text-slate-400 uppercase">Domaine & Mention</p>
                      <p className="text-sm font-black text-slate-900 mt-1">
                        {childFiliere?.domaine || 'Sciences et Technologies'}
                      </p>
                      <p className="text-xs font-semibold text-teal-700">
                        {childFiliere?.name || 'Informatique & Génie Logiciel'}
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                      <p className="text-[11px] font-bold text-slate-400 uppercase">Parcours & Niveau</p>
                      <p className="text-sm font-black text-slate-900 mt-1">
                        {childParcours?.name || 'Génie Logiciel & Cloud'}
                      </p>
                      <p className="text-xs font-semibold text-indigo-700">
                        Niveau {childGroup?.level || 'L1'} • Groupe {childGroup?.code || 'L1-INFO-A'}
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                      <p className="text-[11px] font-bold text-slate-400 uppercase">Année & Semestre</p>
                      <p className="text-sm font-black text-slate-900 mt-1">{selectedAcademicYear}</p>
                      <p className="text-xs font-semibold text-emerald-700">Semestres S1 & S2 actifs</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                      <p className="text-[11px] font-bold text-slate-400 uppercase">Crédits ECTS Validés</p>
                      <p className="text-xl font-black text-teal-700 mt-1">
                        {childUes.reduce(
                          (acc, ue) => acc + getStudentUeSummary(selectedChild.id, ue.id).validatedCredits,
                          0
                        )}{' '}
                        /{' '}
                        {childUes.reduce((acc, ue) => acc + ue.creditsEcts, 0)} ECTS
                      </p>
                      <p className="text-[11px] text-slate-500">Progression annuelle LMD</p>
                    </div>
                  </div>

                  {/* Published Grades & UE Validation Table */}
                  <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-teal-600" />
                          Résultats Académiques Publiés, Moyennes & Validation des UE (ACC-084)
                        </h3>
                        <p className="text-xs text-slate-500">
                          Seules les notes officiellement publiées par l’administration sont affichées.
                        </p>
                      </div>
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[11px] font-bold flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" /> Lecture seule
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {childUes.map((ue) => {
                        const summary = getStudentUeSummary(selectedChild.id, ue.id);
                        return (
                          <div key={ue.id} className="p-5 space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <span className="px-2 py-0.5 bg-slate-900 text-white rounded font-mono text-xs font-bold mr-2">
                                  {ue.code}
                                </span>
                                <span className="text-sm font-black text-slate-900">{ue.title}</span>
                                <span className="ml-2 text-xs text-slate-500">
                                  ({ue.semester} • {ue.creditsEcts} ECTS)
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-bold text-slate-700">
                                  Moyenne UE :{' '}
                                  <strong className="text-sm text-slate-900">{summary.average}/20</strong>
                                </span>
                                <span
                                  className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                    summary.isPassed
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {summary.isPassed ? 'UE Validée' : 'En cours / À compenser'}
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {summary.ecDetails.map(({ ec, grade }) => (
                                <div
                                  key={ec.id}
                                  className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs"
                                >
                                  <div>
                                    <p className="font-bold text-slate-800">
                                      {ec.code} — {ec.title}
                                    </p>
                                    <p className="text-[11px] text-slate-500">
                                      {ec.creditsEcts} ECTS • CC: {grade?.isPublished ? grade.quizScore ?? '-' : 'Non publié'}/20 | Exam: {grade?.isPublished ? grade.examScore ?? '-' : 'Non publié'}/20
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg font-black text-slate-900">
                                      {grade?.isPublished && grade.finalScore !== undefined
                                        ? `${grade.finalScore}/20`
                                        : 'En attente'}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Child Weekly Timetable with Full Week Navigation */}
                  <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
                    {(() => {
                      const getChildWeekDayInfo = (dayIdx: number) => {
                        const now = new Date();
                        const currentDay = now.getDay();
                        const distanceToMonday = (currentDay + 6) % 7;
                        const monday = new Date(now);
                        monday.setDate(now.getDate() - distanceToMonday + parentWeekOffset * 7 + dayIdx);
                        const dateStr = getAntananarivoDateStr(monday);
                        const dayNames = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
                        return {
                          dayIdx,
                          name: dayNames[dayIdx],
                          dateStr,
                          displayDate: monday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
                        };
                      };

                      const childWeekDays = [0, 1, 2, 3, 4, 5].map(getChildWeekDayInfo);

                      return (
                        <>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                            <div>
                              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-indigo-600" />
                                Emploi du Temps Hebdomadaire de {selectedChild.name} ({childGroup?.code})
                              </h3>
                              <p className="text-xs text-slate-500">
                                Consultez les cours, horaires, salles et enseignants de votre enfant semaine par semaine.
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                                <button
                                  type="button"
                                  onClick={() => setParentWeekOffset((p) => p - 1)}
                                  className="p-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 cursor-pointer"
                                  title="Semaine précédente"
                                >
                                  <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="px-2.5 text-xs font-bold text-slate-900 min-w-[160px] text-center">
                                  {childWeekDays[0]?.displayDate} au {childWeekDays[5]?.displayDate}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setParentWeekOffset((p) => p + 1)}
                                  className="p-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 cursor-pointer"
                                  title="Semaine suivante"
                                >
                                  <ChevronRight className="w-4 h-4" />
                                </button>
                              </div>
                              {parentWeekOffset !== 0 && (
                                <button
                                  type="button"
                                  onClick={() => setParentWeekOffset(0)}
                                  className="px-2.5 py-1.5 bg-indigo-50 text-indigo-700 font-bold rounded-xl text-xs border border-indigo-200 cursor-pointer"
                                >
                                  Cette semaine
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Weekly Grid (Lundi to Samedi) */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
                            {childWeekDays.map((day) => {
                              const daySessions = childSessions
                                .filter((s) => s.date === day.dateStr)
                                .sort((a, b) => a.startTime.localeCompare(b.startTime));

                              return (
                                <div
                                  key={day.dateStr}
                                  className="bg-slate-50/80 rounded-2xl p-2.5 border border-slate-200 flex flex-col min-h-[190px]"
                                >
                                  <div className="text-center pb-2 mb-2 border-b border-slate-200">
                                    <span className="block text-xs font-black text-slate-800 uppercase">
                                      {day.name}
                                    </span>
                                    <span className="text-[10px] font-semibold text-slate-500">
                                      {day.displayDate}
                                    </span>
                                  </div>

                                  <div className="space-y-2 flex-1">
                                    {daySessions.length === 0 ? (
                                      <div className="h-full flex items-center justify-center text-[11px] text-slate-400 italic py-6">
                                        Aucun cours
                                      </div>
                                    ) : (
                                      daySessions.map((sess) => {
                                        const crs = courses.find((c) => c.id === sess.courseId);
                                        const rm = rooms.find((r) => r.id === sess.roomId);
                                        const teacher = users.find((u) => u.id === sess.teacherId);
                                        return (
                                          <div
                                            key={sess.id}
                                            className="p-2.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1 text-xs"
                                          >
                                            <div className="flex items-center justify-between text-[11px] font-bold text-indigo-700">
                                              <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {sess.startTime}–{sess.endTime}
                                              </span>
                                              <span className="text-[10px] text-slate-400">{sess.durationHours}h</span>
                                            </div>
                                            <p className="font-black text-slate-900 leading-snug">
                                              {crs?.title || 'Cours LMD'}
                                            </p>
                                            <p className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                                              <MapPin className="w-3 h-3 shrink-0" />
                                              {rm?.name || sess.roomId}
                                            </p>
                                            <p className="text-[10px] text-slate-500 truncate">
                                              Prof : {teacher?.name || 'Enseignant'}
                                            </p>
                                          </div>
                                        );
                                      })
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB B: ATTENDANCE (ACC-085, ACC-091) */}
          {activeSubTab === 'ATTENDANCE' && selectedChild && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200">
                  <p className="text-xs font-bold text-slate-500">Taux d’assiduité global</p>
                  <p className="text-2xl font-black text-emerald-600 mt-1">{attendanceRate}%</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200">
                  <p className="text-xs font-bold text-slate-500">Séances Présent / Justifié</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">{presentCount}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200">
                  <p className="text-xs font-bold text-slate-500">Retards enregistrés</p>
                  <p className="text-2xl font-black text-amber-600 mt-1">{lateCount}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200">
                  <p className="text-xs font-bold text-slate-500">Absences non justifiées</p>
                  <p className="text-2xl font-black text-rose-600 mt-1">{absentCount}</p>
                </div>
              </div>

              {absentCount > 0 && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-xs text-rose-900">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                  <div>
                    <p className="font-black">Alerte Assiduité Parent / Tuteur (ACC-091)</p>
                    <p>
                      {absentCount} absence(s) constatée(s) sur les séances enregistrées. Veuillez transmettre un justificatif médical ou administratif au Service Scolarité si nécessaire.
                    </p>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                  <h3 className="text-sm font-black text-slate-900">
                    Historique détaillé des Présences, Retards et Absences ({selectedChild.name})
                  </h3>
                </div>
                <div className="divide-y divide-slate-100">
                  {attendanceRecords.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500">
                      Aucune séance d’appel enregistrée pour ce groupe.
                    </div>
                  ) : (
                    attendanceRecords.map(({ session, status, scannedAt, reason }) => (
                      <div
                        key={session.id}
                        className="px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <p className="font-bold text-slate-900">
                            {session.courseTitle} ({session.ecCode})
                          </p>
                          <p className="text-slate-500">
                            Salle : {session.roomName} • Date :{' '}
                            {new Date(session.generatedAt).toLocaleDateString('fr-FR')}
                            {scannedAt ? ` • Pointé à ${new Date(scannedAt).toLocaleTimeString('fr-FR')}` : ''}
                          </p>
                          {reason && (
                            <p className="text-indigo-700 font-semibold mt-0.5">
                              Justificatif : {reason}
                            </p>
                          )}
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full font-bold ${
                            status === 'PRESENT'
                              ? 'bg-emerald-100 text-emerald-800'
                              : status === 'JUSTIFIED'
                              ? 'bg-blue-100 text-blue-800'
                              : status === 'LATE'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {status === 'PRESENT'
                            ? 'Présent'
                            : status === 'JUSTIFIED'
                            ? 'Justifié'
                            : status === 'LATE'
                            ? 'En retard'
                            : 'Absent'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB C: FINANCIAL STATUS & RECEIPTS (ACC-086, ACC-087) */}
          {activeSubTab === 'FINANCIAL' && selectedChild && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200">
                  <p className="text-xs font-bold text-slate-500 uppercase">Total Frais Annuels ({selectedAcademicYear})</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">
                    {finSummary.totalFeesAr.toLocaleString()} Ar
                  </p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-emerald-200 bg-emerald-50/30">
                  <p className="text-xs font-bold text-emerald-700 uppercase">Total Payé & Validé</p>
                  <p className="text-2xl font-black text-emerald-700 mt-1">
                    {finSummary.totalPaidAr.toLocaleString()} Ar
                  </p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-rose-200 bg-rose-50/30">
                  <p className="text-xs font-bold text-rose-700 uppercase">Solde Restant Dû</p>
                  <p className="text-2xl font-black text-rose-700 mt-1">
                    {finSummary.balanceDueAr.toLocaleString()} Ar
                  </p>
                </div>
              </div>

              {/* Fee breakdown */}
              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                  <h3 className="text-sm font-black text-slate-900">
                    Échéancier des Frais de Scolarité ({selectedChild.name})
                  </h3>
                </div>
                <div className="divide-y divide-slate-100">
                  {finSummary.feeDetails.map(({ fee, paidAr, remainingAr, status }) => (
                    <div
                      key={fee.id}
                      className="px-6 py-4 flex flex-wrap items-center justify-between gap-4 text-xs"
                    >
                      <div>
                        <p className="font-black text-slate-900 text-sm">{fee.title}</p>
                        <p className="text-slate-500">
                          Échéance : <strong>{fee.dueDate}</strong> • Catégorie : {fee.category}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="text-right">
                          <p className="text-slate-500">
                            Montant : <strong>{fee.amountAr.toLocaleString()} Ar</strong> | Payé :{' '}
                            <strong className="text-emerald-700">{paidAr.toLocaleString()} Ar</strong>
                          </p>
                          <p className="font-bold text-rose-700">
                            Reste à payer : {remainingAr.toLocaleString()} Ar
                          </p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full font-bold ${
                            status === 'PAID'
                              ? 'bg-emerald-100 text-emerald-800'
                              : status === 'PARTIAL'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {status === 'PAID'
                            ? 'Payé intégralement'
                            : status === 'PARTIAL'
                            ? 'Partiellement payé'
                            : 'Impayé'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Receipts list (ACC-087) */}
              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-emerald-600" />
                    Historique des Règlements & Téléchargement des Reçus Officiels (ACC-087)
                  </h3>
                </div>
                <div className="divide-y divide-slate-100">
                  {childPayments.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500">
                      Aucun règlement enregistré pour cet étudiant.
                    </div>
                  ) : (
                    childPayments.map((pay) => {
                      const fee = fees.find((f) => f.id === pay.feeId);
                      return (
                        <div
                          key={pay.id}
                          className="px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs"
                        >
                          <div>
                            <span className="px-2 py-0.5 bg-emerald-900 text-white rounded font-mono font-bold mr-2">
                              {pay.receiptNumber}
                            </span>
                            <span className="font-bold text-slate-900">
                              {fee?.title || 'Règlement scolarité'}
                            </span>
                            <p className="text-slate-500 mt-0.5">
                              Date : {pay.paymentDate} • Mode : {pay.paymentMethod} • Montant réglé :{' '}
                              <strong className="text-emerald-700">
                                {pay.amountPaidAr.toLocaleString()} Ar
                              </strong>{' '}
                              (Reste : {pay.remainingBalanceAr.toLocaleString()} Ar)
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handlePrintReceipt(pay.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 rounded-xl font-bold transition"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            Télécharger / Imprimer Reçu
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB D: ADMINISTRATIVE STATUS & NOTIFICATIONS (ACC-090, ACC-091) */}
          {activeSubTab === 'ADMIN_NOTIFS' && selectedChild && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-teal-600" />
                  Statut d’Inscription & Pièces Administratives ({selectedAcademicYear})
                </h3>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Statut d’inscription :</span>
                    <span className="font-black text-emerald-700">
                      {childInscription?.status === 'CONFIRMED' ? 'INSCRIT OFFICIELLEMENT' : 'CONFIRMÉ'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Type :</span>
                    <span className="font-bold text-slate-800">
                      {childInscription?.inscriptionType || 'INSCRIPTION'} ({childInscription?.academicStatus || 'PASSANT'})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Quitus financier :</span>
                    <span className={`font-bold ${finSummary.balanceDueAr === 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {finSummary.balanceDueAr === 0 ? 'À jour (0 Ar dû)' : `Échéance en cours (${finSummary.balanceDueAr.toLocaleString()} Ar)`}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-indigo-600" />
                  Notifications Ciblées Parents / Tuteurs (ACC-090, ACC-091)
                </h3>
                <div className="space-y-2.5 text-xs">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-emerald-950">Publication officielle des notes S1</p>
                      <p className="text-emerald-800">
                        Les résultats des évaluations publiées pour {selectedChild.name} sont consultables dans l’onglet Suivi Académique.
                      </p>
                    </div>
                  </div>
                  {finSummary.balanceDueAr > 0 && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-amber-950">Rappel d’échéance financière</p>
                        <p className="text-amber-800">
                          Un solde de {finSummary.balanceDueAr.toLocaleString()} Ar reste à régulariser pour l’année {selectedAcademicYear}.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* TAB E: GOVERNANCE & PARENT-STUDENT ASSOCIATIONS (ACC-092, ACC-093, ACC-095) */}
      {activeSubTab === 'GOVERNANCE' && isStaffManager && (
        <div className="space-y-6">
          {govFeedback && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-900 flex items-center justify-between">
              <span>{govFeedback}</span>
              <button onClick={() => setGovFeedback(null)} className="text-emerald-700 font-black">
                ×
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Link existing parent to student */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Link2 className="w-4 h-4 text-teal-600" />
                Associer un Compte Parent / Tuteur à un ou plusieurs Étudiants (ACC-081, ACC-095)
              </h3>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Compte Parent / Tuteur :</label>
                  <select
                    value={linkParentId}
                    onChange={(e) => setLinkParentId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  >
                    {parentUsers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Étudiant à rattacher :</label>
                  <select
                    value={linkStudentId}
                    onChange={(e) => setLinkStudentId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  >
                    {allStudents.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.matricule} — {st.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (linkParentId && linkStudentId) {
                      linkParentToStudent(linkParentId, linkStudentId);
                      setGovFeedback('Rattachement Parent ↔ Étudiant enregistré et journalisé.');
                    }
                  }}
                  className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold transition"
                >
                  Valider le rattachement familial
                </button>
              </div>

              {/* Active links list */}
              <div className="pt-4 border-t border-slate-100 space-y-2">
                <p className="text-xs font-bold text-slate-500 uppercase">Associations actives :</p>
                {parentUsers.map((par) => (
                  <div key={par.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-slate-900">{par.name}</span>
                      <select
                        value={par.parentVerificationStatus || 'VERIFIED'}
                        onChange={(e) =>
                          updateUser(par.id, {
                            parentVerificationStatus: e.target.value as 'VERIFIED' | 'PENDING' | 'SUSPENDED' | 'REVOKED',
                            isActive: e.target.value === 'VERIFIED' || e.target.value === 'PENDING',
                          })
                        }
                        className="px-2 py-0.5 bg-white border border-slate-300 rounded text-[11px] font-bold"
                      >
                        <option value="VERIFIED">Vérifié & Actif</option>
                        <option value="PENDING">En attente</option>
                        <option value="SUSPENDED">Suspendu</option>
                        <option value="REVOKED">Révoqué</option>
                      </select>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(par.linkedStudentIds || []).map((stId) => {
                        const st = allStudents.find((s) => s.id === stId);
                        return (
                          <span
                            key={stId}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-lg font-semibold"
                          >
                            {st?.matricule} — {st?.name}
                            <button
                              type="button"
                              onClick={() => unlinkParentFromStudent(par.id, stId)}
                              className="text-rose-600 hover:text-rose-800"
                              title="Révoquer ce rattachement (ACC-093)"
                            >
                              <Unlink className="w-3 h-3" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Create new Parent Account */}
            <form
              onSubmit={handleCreateParentAccount}
              className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4"
            >
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-indigo-600" />
                Créer un Nouveau Compte Parent / Tuteur (ACC-080)
              </h3>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nom & Prénoms du Parent / Tuteur :</label>
                  <input
                    type="text"
                    required
                    value={newParentName}
                    onChange={(e) => setNewParentName(e.target.value)}
                    placeholder="Ex: M. Jean-Aimé Ravelojaona"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Adresse e-mail :</label>
                  <input
                    type="email"
                    required
                    value={newParentEmail}
                    onChange={(e) => setNewParentEmail(e.target.value)}
                    placeholder="parent@ebm.mg"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Téléphone :</label>
                  <input
                    type="text"
                    value={newParentPhone}
                    onChange={(e) => setNewParentPhone(e.target.value)}
                    placeholder="+261 34 00 000 00"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Premier étudiant rattaché :</label>
                  <select
                    value={newParentStudentId}
                    onChange={(e) => setNewParentStudentId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  >
                    {allStudents.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.matricule} — {st.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition"
                >
                  Créer & Activer le compte Parent
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
