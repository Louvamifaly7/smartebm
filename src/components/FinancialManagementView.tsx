import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { PaymentMethod, StudentFee, PaymentTransaction, CashRegisterDay } from '../types';
import {
  Banknote,
  Receipt,
  CreditCard,
  Smartphone,
  Lock,
  Unlock,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Calendar,
  Layers,
  ArrowDownCircle,
  FileText,
  User,
  Search,
  TrendingUp,
  PieChart as PieChartIcon,
  BarChart3,
  Activity,
  Filter,
  Edit2,
  Trash2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { UniversalStudentSelector } from './UniversalStudentSelector';

export const FinancialManagementView: React.FC = () => {
  const {
    currentUser,
    users,
    groups,
    fees,
    payments,
    cashRegisterDays,
    addFee,
    updateFee,
    deleteFee,
    recordPayment,
    cancelPayment,
    closeCashRegisterDay,
    getStudentFinancialSummary,
    selectedAcademicYear,
    academicYears,
  } = useApp();

  const isStudent = currentUser.role === 'STUDENT';
  const canAccessFinances = ['ADMIN', 'FINANCE', 'STUDENT', 'SCOLARITE', 'SCHEDULER', 'ADMIN_STAFF'].includes(
    currentUser.role
  );
  const isAdminOrStaff = ['ADMIN', 'FINANCE', 'ADMIN_STAFF', 'SCOLARITE', 'SCHEDULER'].includes(currentUser.role);

  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'ANALYTICS' | 'TRANSACTIONS' | 'CASH_REGISTER' | 'FEES_CATALOG'>('OVERVIEW');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('user-student-laurent');
  const [searchStudent, setSearchStudent] = useState<string>('');
  const [dashboardGroupFilter, setDashboardGroupFilter] = useState<string>('ALL');
  const [dashboardMethodFilter, setDashboardMethodFilter] = useState<string>('ALL');
  const [showChartsInOverview, setShowChartsInOverview] = useState<boolean>(true);

  // Payment Recording Modal
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [paymentError, setPaymentError] = useState<string>('');
  const [paymentForm, setPaymentForm] = useState({
    studentId: 'user-student-laurent',
    feeId: '',
    amountPaidAr: 500000,
    paymentMethod: 'MOBILE_MONEY' as PaymentMethod,
    referenceNumber: '',
    notes: '',
  });

  // Receipt Modal to print/view
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentTransaction | null>(null);
  const [cancellingTxId, setCancellingTxId] = useState<string | null>(null);
  const [cancelTxReason, setCancelTxReason] = useState<string>('Erreur de saisie caisse / Annulation');

  // Cash Register Closure Modal
  const [showCloseRegisterModal, setShowCloseRegisterModal] = useState<boolean>(false);
  const [actualClosingArInput, setActualClosingArInput] = useState<number>(0);
  const [closureNotesInput, setClosureNotesInput] = useState<string>('');

  // New / Edit Fee Modal
  const [showAddFeeModal, setShowAddFeeModal] = useState<boolean>(false);
  const [editingFeeId, setEditingFeeId] = useState<string | null>(null);
  const [feeForm, setFeeForm] = useState({
    title: '',
    amountAr: 1500000,
    dueDate: new Date().toISOString().split('T')[0],
    category: 'ECOLAGE' as StudentFee['category'],
    academicYear: selectedAcademicYear || '2025-2026',
    groupId: 'ALL',
  });

  const students = users.filter((u) => u.role === 'STUDENT');

  const todayStr = new Date().toISOString().split('T')[0];
  const todayRegister = cashRegisterDays.find((d) => d.date === todayStr);

  // ==========================================
  // REAL-TIME ANALYTICS DATA FOR RECHARTS DASHBOARD
  // ==========================================
  const financialAnalytics = useMemo(() => {
    const filteredStudents = students.filter(
      (st) => dashboardGroupFilter === 'ALL' || st.groupId === dashboardGroupFilter
    );
    const filteredStudentIds = new Set(filteredStudents.map((s) => s.id));

    const validPayments = payments.filter(
      (p) =>
        p.status !== 'CANCELLED' &&
        filteredStudentIds.has(p.studentId) &&
        (dashboardMethodFilter === 'ALL' || p.paymentMethod === dashboardMethodFilter)
    );

    // 1. Global KPIs & Student Debt Distribution
    let totalExpectedAr = 0;
    let totalCollectedAr = 0;
    let totalDebtAr = 0;
    let fullyPaidStudentsCount = 0;
    let partialStudentsCount = 0;
    let unpaidStudentsCount = 0;

    const debtByCategoryMap: Record<string, { name: string; debtAr: number; paidAr: number }> = {
      INSCRIPTION: { name: "Droits d'inscription", debtAr: 0, paidAr: 0 },
      ECOLAGE: { name: 'Écolage semestriel', debtAr: 0, paidAr: 0 },
      EXAMEN: { name: "Frais d'examen", debtAr: 0, paidAr: 0 },
      INDIVIDUEL: { name: 'Frais individuels', debtAr: 0, paidAr: 0 },
    };

    const debtByGroupMap: Record<string, { groupCode: string; paidAr: number; debtAr: number; studentCount: number }> = {};

    const studentDebtRankings: Array<{
      id: string;
      name: string;
      matricule: string;
      groupCode: string;
      totalFeesAr: number;
      totalPaidAr: number;
      balanceDueAr: number;
      recoveryRate: number;
      status: 'SOLDÉ' | 'PARTIEL' | 'IMPAYÉ';
    }> = [];

    filteredStudents.forEach((st) => {
      const summary = getStudentFinancialSummary(st.id);
      const groupObj = groups.find((g) => g.id === st.groupId);
      const groupCode = groupObj?.code || 'Sans groupe';

      totalExpectedAr += summary.totalFeesAr;
      totalCollectedAr += summary.totalPaidAr;
      totalDebtAr += summary.balanceDueAr;

      if (summary.balanceDueAr === 0 && summary.totalFeesAr > 0) {
        fullyPaidStudentsCount += 1;
      } else if (summary.totalPaidAr > 0) {
        partialStudentsCount += 1;
      } else {
        unpaidStudentsCount += 1;
      }

      if (!debtByGroupMap[groupCode]) {
        debtByGroupMap[groupCode] = { groupCode, paidAr: 0, debtAr: 0, studentCount: 0 };
      }
      debtByGroupMap[groupCode].paidAr += summary.totalPaidAr;
      debtByGroupMap[groupCode].debtAr += summary.balanceDueAr;
      debtByGroupMap[groupCode].studentCount += 1;

      summary.feeDetails.forEach((fd) => {
        const cat = fd.fee.category || 'ECOLAGE';
        if (!debtByCategoryMap[cat]) {
          debtByCategoryMap[cat] = { name: cat, debtAr: 0, paidAr: 0 };
        }
        debtByCategoryMap[cat].debtAr += fd.remainingAr;
        debtByCategoryMap[cat].paidAr += fd.paidAr;
      });

      const rate = summary.totalFeesAr > 0 ? Math.round((summary.totalPaidAr / summary.totalFeesAr) * 100) : 100;
      studentDebtRankings.push({
        id: st.id,
        name: st.name,
        matricule: st.matricule || 'N/A',
        groupCode,
        totalFeesAr: summary.totalFeesAr,
        totalPaidAr: summary.totalPaidAr,
        balanceDueAr: summary.balanceDueAr,
        recoveryRate: rate,
        status: summary.balanceDueAr === 0 ? 'SOLDÉ' : summary.totalPaidAr > 0 ? 'PARTIEL' : 'IMPAYÉ',
      });
    });

    const globalRecoveryRate =
      totalExpectedAr > 0 ? Math.min(100, Math.round((totalCollectedAr / totalExpectedAr) * 1000) / 10) : 0;

    // 2. Real-Time Payment Tracking Timeline (by date & payment method)
    const timelineMap: Record<
      string,
      {
        date: string;
        label: string;
        totalAr: number;
        especesAr: number;
        mobileMoneyAr: number;
        banqueAr: number;
        txCount: number;
      }
    > = {};

    // Seed with cashRegisterDays so the chart always has rich chronological continuity
    cashRegisterDays.forEach((crd) => {
      if (dashboardGroupFilter === 'ALL' && dashboardMethodFilter === 'ALL') {
        const shortLabel = crd.date.slice(5); // MM-DD
        timelineMap[crd.date] = {
          date: crd.date,
          label: shortLabel,
          totalAr: crd.totalCollectedAr,
          especesAr: crd.cashCollectedAr,
          mobileMoneyAr: crd.mobileMoneyCollectedAr,
          banqueAr: crd.bankCollectedAr,
          txCount: 0,
        };
      }
    });

    // Aggregate actual live transactions
    validPayments.forEach((p) => {
      const d = p.paymentDate;
      if (!timelineMap[d]) {
        timelineMap[d] = {
          date: d,
          label: d.slice(5),
          totalAr: 0,
          especesAr: 0,
          mobileMoneyAr: 0,
          banqueAr: 0,
          txCount: 0,
        };
      }
      // If we seeded from cashRegisterDays and no filters are active, avoid double counting unless date wasn't in cashRegisterDays
      const wasSeededFromRegister =
        dashboardGroupFilter === 'ALL' &&
        dashboardMethodFilter === 'ALL' &&
        cashRegisterDays.some((c) => c.date === d);

      if (!wasSeededFromRegister) {
        timelineMap[d].totalAr += p.amountPaidAr;
        if (p.paymentMethod === 'ESPECES') timelineMap[d].especesAr += p.amountPaidAr;
        else if (p.paymentMethod === 'MOBILE_MONEY') timelineMap[d].mobileMoneyAr += p.amountPaidAr;
        else timelineMap[d].banqueAr += p.amountPaidAr;
      }
      timelineMap[d].txCount += 1;
    });

    // Also ensure that if today has live transactions exceeding or differing from static register, it reflects actual payments
    const realtimeTimeline = Object.values(timelineMap).sort((a, b) => a.date.localeCompare(b.date));

    // 3. Monthly Recovery Rate (Taux de recouvrement par mois)
    const academicMonths = [
      { key: '09', label: 'Sept.' },
      { key: '10', label: 'Oct.' },
      { key: '11', label: 'Nov.' },
      { key: '12', label: 'Déc.' },
      { key: '01', label: 'Janv.' },
      { key: '02', label: 'Févr.' },
      { key: '03', label: 'Mars' },
      { key: '04', label: 'Avril' },
      { key: '05', label: 'Mai' },
      { key: '06', label: 'Juin' },
    ];

    const monthlyMap: Record<
      string,
      { month: string; attenduAr: number; encaisseAr: number; tauxRecouvrement: number }
    > = {};
    academicMonths.forEach((m) => {
      monthlyMap[m.key] = { month: m.label, attenduAr: 0, encaisseAr: 0, tauxRecouvrement: 0 };
    });

    // Compute expected fees per month based on fee dueDate for filtered students
    filteredStudents.forEach((st) => {
      const summary = getStudentFinancialSummary(st.id);
      summary.feeDetails.forEach((fd) => {
        const monthKey = fd.fee.dueDate?.split('-')[1] || '10';
        const targetKey = monthlyMap[monthKey] ? monthKey : '10';
        monthlyMap[targetKey].attenduAr += fd.fee.amountAr;
      });
    });

    // Compute collected payments per month based on paymentDate
    validPayments.forEach((p) => {
      const monthKey = p.paymentDate?.split('-')[1] || '10';
      const targetKey = monthlyMap[monthKey] ? monthKey : '10';
      monthlyMap[targetKey].encaisseAr += p.amountPaidAr;
    });

    // Calculate cumulative & monthly recovery rates
    let cumulativeExpected = 0;
    let cumulativeCollected = 0;
    const monthlyRecoveryData = academicMonths
      .map((m) => {
        const item = monthlyMap[m.key];
        cumulativeExpected += item.attenduAr;
        cumulativeCollected += item.encaisseAr;
        const rate =
          item.attenduAr > 0
            ? Math.min(100, Math.round((item.encaisseAr / item.attenduAr) * 100))
            : cumulativeExpected > 0
            ? Math.min(100, Math.round((cumulativeCollected / cumulativeExpected) * 100))
            : 0;
        return {
          ...item,
          attenduMillions: Number((item.attenduAr / 1000000).toFixed(2)),
          encaisseMillions: Number((item.encaisseAr / 1000000).toFixed(2)),
          tauxRecouvrement: rate,
        };
      })
      .filter((m) => m.attenduAr > 0 || m.encaisseAr > 0);

    // 4. Debt Distribution Data (Pie & Bars)
    const debtStatusPieData = [
      { name: 'Étudiants Soldés (0 Ar dû)', value: fullyPaidStudentsCount, color: '#059669' },
      { name: 'Règlement Partiel', value: partialStudentsCount, color: '#d97706' },
      { name: 'Aucun Règlement (Impayé)', value: unpaidStudentsCount, color: '#e11d48' },
    ].filter((d) => d.value > 0);

    const debtCategoryPieData = Object.values(debtByCategoryMap)
      .filter((c) => c.debtAr > 0 || c.paidAr > 0)
      .map((c, idx) => ({
        name: c.name,
        debtAr: c.debtAr,
        paidAr: c.paidAr,
        color: ['#0f766e', '#d97706', '#2563eb', '#e11d48'][idx % 4],
      }));

    const debtByGroupData = Object.values(debtByGroupMap);

    return {
      totalExpectedAr,
      totalCollectedAr,
      totalDebtAr,
      globalRecoveryRate,
      fullyPaidStudentsCount,
      partialStudentsCount,
      unpaidStudentsCount,
      validPaymentsCount: validPayments.length,
      realtimeTimeline,
      monthlyRecoveryData,
      debtStatusPieData,
      debtCategoryPieData,
      debtByGroupData,
      studentDebtRankings: studentDebtRankings.sort((a, b) => b.balanceDueAr - a.balanceDueAr),
    };
  }, [students, payments, fees, groups, cashRegisterDays, dashboardGroupFilter, dashboardMethodFilter, getStudentFinancialSummary]);

  const formatAriaryShort = (val: number) => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M Ar`;
    if (val >= 1000) return `${Math.round(val / 1000)}k Ar`;
    return `${val} Ar`;
  };

  // Helper to get exclusively unpaid/partially paid fees for a student (ACC-009, ACC-010)
  const getUnpaidFeesForStudent = (stId: string) => {
    const summary = getStudentFinancialSummary(stId);
    return summary.feeDetails.filter((fd) => fd.remainingAr > 0);
  };

  const openPaymentModalForStudent = (stId: string) => {
    setPaymentError('');
    const unpaid = getUnpaidFeesForStudent(stId);
    const firstUnpaid = unpaid[0];
    const fallbackFee = fees[0];
    setPaymentForm({
      studentId: stId,
      feeId: firstUnpaid ? firstUnpaid.fee.id : fallbackFee?.id || '',
      amountPaidAr: firstUnpaid ? firstUnpaid.remainingAr : fallbackFee?.amountAr || 500000,
      paymentMethod: 'MOBILE_MONEY',
      referenceNumber: '',
      notes: '',
    });
    setShowPaymentModal(true);
  };

  const handleRecordPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError('');
    if (!paymentForm.studentId || !paymentForm.feeId || paymentForm.amountPaidAr <= 0) {
      setPaymentError('Veuillez sélectionner un étudiant, un frais non soldé et un montant valide.');
      return;
    }

    const res = recordPayment({
      studentId: paymentForm.studentId,
      feeId: paymentForm.feeId,
      amountPaidAr: Number(paymentForm.amountPaidAr),
      paymentMethod: paymentForm.paymentMethod,
      referenceNumber: paymentForm.referenceNumber,
      notes: paymentForm.notes,
    });

    if (res.success && res.transaction) {
      setShowPaymentModal(false);
      setSelectedReceipt(res.transaction);
    } else if (res.error) {
      setPaymentError(res.error);
    }
  };

  const handleCloseRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!todayRegister) return;

    closeCashRegisterDay(todayRegister.date, Number(actualClosingArInput), closureNotesInput);
    setShowCloseRegisterModal(false);
  };

  const handleCreateFeeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feeForm.title.trim() || feeForm.amountAr <= 0) return;

    if (editingFeeId) {
      updateFee(editingFeeId, {
        academicYear: feeForm.academicYear || selectedAcademicYear,
        title: feeForm.title.trim(),
        amountAr: Number(feeForm.amountAr),
        dueDate: feeForm.dueDate,
        category: feeForm.category,
        groupId: feeForm.groupId === 'ALL' ? undefined : feeForm.groupId,
      });
    } else {
      addFee({
        academicYear: feeForm.academicYear || selectedAcademicYear,
        title: feeForm.title.trim(),
        amountAr: Number(feeForm.amountAr),
        dueDate: feeForm.dueDate,
        category: feeForm.category,
        groupId: feeForm.groupId === 'ALL' ? undefined : feeForm.groupId,
      });
    }
    setEditingFeeId(null);
    setShowAddFeeModal(false);
  };

  // ==========================================
  // STRICT RBAC GUARD: BLOCK TEACHERS & UNAUTHORIZED ROLES FROM STUDENT PAYMENTS
  // ==========================================
  if (!canAccessFinances) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-rose-200 shadow-sm text-center max-w-xl mx-auto my-8 space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-black text-slate-900">
          Accès Restreint — Confidentialité Financière
        </h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          Conformément à la politique de confidentialité d'EBM Institute, les enseignants et rôles non habilités n'ont pas accès aux paiements, écolages ou soldes financiers des étudiants.
        </p>
      </div>
    );
  }

  // ==========================================
  // STUDENT VIEW: Mes finances & Reçus
  // ==========================================
  if (isStudent) {
    const studentSummary = getStudentFinancialSummary(currentUser.id);
    const myPayments = payments.filter((p) => p.studentId === currentUser.id);

    return (
      <div className="space-y-6">
        {/* Banner */}
        <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 text-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2.5 py-0.5 rounded text-xs font-semibold uppercase">
                Comptabilité Étudiant EBM
              </span>
              <span className="text-xs text-slate-300">Monnaie officielle : Ariary (Ar)</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Mes Frais Universitaires & Paiements</h1>
            <p className="text-slate-300 text-sm mt-1">
              Suivi de mes droits d’inscription, écolages semestriels et téléchargement de mes reçus officiels numérotés.
            </p>
          </div>

          <div className="flex gap-4">
            <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/20 text-center">
              <span className="text-[11px] text-emerald-200 block uppercase font-semibold">Total Payé</span>
              <span className="text-xl font-extrabold text-emerald-300">
                {studentSummary.totalPaidAr.toLocaleString()} Ar
              </span>
            </div>

            <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/20 text-center">
              <span className="text-[11px] text-rose-200 block uppercase font-semibold">Solde Dû</span>
              <span className={`text-xl font-extrabold ${studentSummary.balanceDueAr === 0 ? 'text-emerald-300' : 'text-amber-300'}`}>
                {studentSummary.balanceDueAr.toLocaleString()} Ar
              </span>
            </div>
          </div>
        </div>

        {/* Fees Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-800">Détail des Frais d'Études ({selectedAcademicYear})</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[11px] bg-slate-50">
                  <th className="py-3 px-4">Libellé du Frais</th>
                  <th className="py-3 px-4">Catégorie</th>
                  <th className="py-3 px-4">Date d'échéance</th>
                  <th className="py-3 px-4 text-right">Montant Total</th>
                  <th className="py-3 px-4 text-right">Montant Réglé</th>
                  <th className="py-3 px-4 text-right">Reste à payer</th>
                  <th className="py-3 px-4 text-center">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {studentSummary.feeDetails.map(({ fee, paidAr, remainingAr, status }) => (
                  <tr key={fee.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-800">{fee.title}</td>
                    <td className="py-3 px-4 text-slate-600">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-semibold">
                        {fee.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{fee.dueDate}</td>
                    <td className="py-3 px-4 text-right font-extrabold text-slate-800">
                      {fee.amountAr.toLocaleString()} Ar
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-600">
                      {paidAr.toLocaleString()} Ar
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-amber-600">
                      {remainingAr.toLocaleString()} Ar
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                          status === 'PAID'
                            ? 'bg-emerald-100 text-emerald-800'
                            : status === 'PARTIAL'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {status === 'PAID' ? 'Soldé' : status === 'PARTIAL' ? 'Partiel' : 'Non payé'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* My Receipts */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-800">Mes Reçus de Paiement Officiels</h2>
          {myPayments.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-4">Aucun paiement enregistré pour l'instant.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myPayments.map((p) => (
                <div
                  key={p.id}
                  className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-blue-600" />
                      <span className="font-mono font-bold text-xs text-blue-800">{p.receiptNumber}</span>
                    </div>
                    <div className="text-base font-extrabold text-slate-800 mt-1">
                      {p.amountPaidAr.toLocaleString()} Ar
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {p.paymentDate} • Via {p.paymentMethod} {p.referenceNumber ? `(${p.referenceNumber})` : ''}
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedReceipt(p)}
                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Voir reçu
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Receipt Modal */}
        {selectedReceipt && (
          <ReceiptModal
            receipt={selectedReceipt}
            student={currentUser}
            fee={fees.find((f) => f.id === selectedReceipt.feeId)}
            onClose={() => setSelectedReceipt(null)}
          />
        )}
      </div>
    );
  }

  // ==========================================
  // ADMIN / STAFF VIEW
  // ==========================================
  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 text-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs text-emerald-300 font-semibold">
            <span>Gestion Financière Institutionnelle</span>
            <span aria-hidden="true">·</span>
            <span className="text-slate-300">Norme Ariary (Ar) · EBM Institute</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Comptabilité, Encaissements & Caisse Journalière</h1>
          <p className="text-slate-300 text-sm mt-1">
            Suivi en temps réel des paiements en Ariary, taux de recouvrement mensuel, répartition des dettes étudiantes et journal de caisse.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowChartsInOverview((prev) => !prev)}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-xs px-3.5 py-2.5 rounded-xl transition-all cursor-pointer"
          >
            <BarChart3 className="w-4 h-4 text-emerald-300" />
            {showChartsInOverview ? 'Masquer Graphiques' : 'Afficher Graphiques'}
          </button>
          <button
            onClick={() => openPaymentModalForStudent(selectedStudentId)}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl shadow-lg transition-all cursor-pointer active:scale-95"
          >
            <Banknote className="w-4 h-4" />
            Encaisser un paiement
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap border-b border-slate-200">
        <button
          onClick={() => setActiveTab('OVERVIEW')}
          className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm border-b-2 transition-colors cursor-pointer ${
            activeTab === 'OVERVIEW'
              ? 'border-emerald-600 text-emerald-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <User className="w-4 h-4" />
          Comptes Étudiants & Pilotage
        </button>
        <button
          onClick={() => setActiveTab('ANALYTICS')}
          className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm border-b-2 transition-colors cursor-pointer ${
            activeTab === 'ANALYTICS'
              ? 'border-emerald-600 text-emerald-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Tableau de Bord Graphique (Temps Réel)
        </button>
        <button
          onClick={() => setActiveTab('CASH_REGISTER')}
          className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm border-b-2 transition-colors cursor-pointer ${
            activeTab === 'CASH_REGISTER'
              ? 'border-emerald-600 text-emerald-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Journal de Caisse Journalière
        </button>
        <button
          onClick={() => setActiveTab('TRANSACTIONS')}
          className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm border-b-2 transition-colors cursor-pointer ${
            activeTab === 'TRANSACTIONS'
              ? 'border-emerald-600 text-emerald-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Receipt className="w-4 h-4" />
          Historique des Transactions ({payments.length})
        </button>
        <button
          onClick={() => setActiveTab('FEES_CATALOG')}
          className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm border-b-2 transition-colors cursor-pointer ${
            activeTab === 'FEES_CATALOG'
              ? 'border-emerald-600 text-emerald-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          Catalogue des Frais ({fees.length})
        </button>
      </div>

      {/* ==========================================
          VISUAL ANALYTICS DASHBOARD (RECHARTS)
          Shown in ANALYTICS tab AND in OVERVIEW when showChartsInOverview is true
          ========================================== */}
      {(activeTab === 'ANALYTICS' || (activeTab === 'OVERVIEW' && showChartsInOverview)) && (
        <div className="space-y-6 bg-slate-50/70 p-5 rounded-2xl border border-slate-200">
          {/* Header & Interactive Filters */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
                <Activity className="w-3.5 h-3.5" />
                <span>Pilotage Financier Temps Réel · Année {selectedAcademicYear}</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                Suivi des Encaissements, Taux de Recouvrement Mensuel & Répartition des Dettes
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 text-xs">
              <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-3 py-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-500 font-medium">Promotion :</span>
                <select
                  value={dashboardGroupFilter}
                  onChange={(e) => setDashboardGroupFilter(e.target.value)}
                  className="font-bold text-slate-800 bg-transparent outline-none cursor-pointer"
                >
                  <option value="ALL">Toutes les promotions ({students.length} étud.)</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.code} — {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-3 py-1.5">
                <span className="text-slate-500 font-medium">Canal :</span>
                <select
                  value={dashboardMethodFilter}
                  onChange={(e) => setDashboardMethodFilter(e.target.value)}
                  className="font-bold text-slate-800 bg-transparent outline-none cursor-pointer"
                >
                  <option value="ALL">Tous modes de paiement</option>
                  <option value="ESPECES">Espèces (Guichet)</option>
                  <option value="MOBILE_MONEY">Mobile Money</option>
                  <option value="DEPOT_BANCAIRE">Dépôt Bancaire</option>
                  <option value="VIREMENT_BANCAIRE">Virement Bancaire</option>
                </select>
              </div>
            </div>
          </div>

          {/* 4 Key Financial Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Total Facturé (Attendu)</span>
                <FileText className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-xl font-extrabold text-slate-900 font-mono">
                {financialAnalytics.totalExpectedAr.toLocaleString()} Ar
              </div>
              <div className="text-[11px] text-slate-500">
                Base écolages & droits · {students.length} étudiants inscrits
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-xs text-emerald-700 font-semibold">
                <span>Encaissements Temps Réel</span>
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-xl font-extrabold text-emerald-700 font-mono">
                {financialAnalytics.totalCollectedAr.toLocaleString()} Ar
              </div>
              <div className="text-[11px] text-slate-500">
                {financialAnalytics.validPaymentsCount} transactions validées en caisse
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-sm space-y-1.5">
              <div className="flex items-center justify-between text-xs text-blue-800 font-semibold">
                <span>Taux de Recouvrement Global</span>
                <span className="font-mono font-bold text-blue-700">{financialAnalytics.globalRecoveryRate}%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, financialAnalytics.globalRecoveryRate)}%` }}
                />
              </div>
              <div className="text-[11px] text-slate-500 flex items-center justify-between">
                <span>{financialAnalytics.fullyPaidStudentsCount} étudiants soldés à 100%</span>
                <span>Cible : 85%</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-xs text-rose-700 font-semibold">
                <span>Dettes Étudiantes Restantes</span>
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              </div>
              <div className="text-xl font-extrabold text-rose-700 font-mono">
                {financialAnalytics.totalDebtAr.toLocaleString()} Ar
              </div>
              <div className="text-[11px] text-slate-500">
                {financialAnalytics.partialStudentsCount} partiels · {financialAnalytics.unpaidStudentsCount} sans règlement
              </div>
            </div>
          </div>

          {/* Row 1 Charts: Real-Time Payments Stream & Monthly Recovery Rate */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* CHART 1: Suivi des paiements en temps réel par canal */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    1. Suivi des Paiements en Temps Réel par Canal
                  </h3>
                  <p className="text-xs text-slate-500">
                    Flux chronologique des encaissements (Espèces, Mobile Money, Banque) en Ariary
                  </p>
                </div>
                <span className="text-xs font-mono text-emerald-700 font-semibold">
                  Mise à jour directe
                </span>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={financialAnalytics.realtimeTimeline} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorEspeces" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#059669" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#059669" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="colorMobile" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#d97706" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#d97706" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="colorBanque" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis
                      tickFormatter={formatAriaryShort}
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      width={68}
                    />
                    <Tooltip
                      formatter={(value: any, name: any) => [`${Number(value).toLocaleString()} Ar`, name]}
                      labelFormatter={(label) => `Date : ${label}`}
                      contentStyle={{
                        borderRadius: '12px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Area
                      type="monotone"
                      dataKey="especesAr"
                      name="Espèces"
                      stackId="1"
                      stroke="#059669"
                      strokeWidth={2}
                      fill="url(#colorEspeces)"
                    />
                    <Area
                      type="monotone"
                      dataKey="mobileMoneyAr"
                      name="Mobile Money"
                      stackId="1"
                      stroke="#d97706"
                      strokeWidth={2}
                      fill="url(#colorMobile)"
                    />
                    <Area
                      type="monotone"
                      dataKey="banqueAr"
                      name="Banque & Virement"
                      stackId="1"
                      stroke="#2563eb"
                      strokeWidth={2}
                      fill="url(#colorBanque)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* CHART 2: Taux de recouvrement par mois */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    2. Taux de Recouvrement par Mois (%) & Volumes
                  </h3>
                  <p className="text-xs text-slate-500">
                    Comparaison mensuelle Échéances Attendues vs Encaissé et courbe de recouvrement (%)
                  </p>
                </div>
                <span className="text-xs font-mono text-blue-700 font-semibold">
                  Global : {financialAnalytics.globalRecoveryRate}%
                </span>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={financialAnalytics.monthlyRecoveryData}
                    margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis
                      yAxisId="left"
                      tickFormatter={formatAriaryShort}
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      width={68}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      domain={[0, 100]}
                      tickFormatter={(v) => `${v}%`}
                      tick={{ fontSize: 11, fill: '#1d4ed8' }}
                      width={42}
                    />
                    <Tooltip
                      formatter={(value: any, name: any) => {
                        if (String(name).includes('%')) return [`${value}%`, name];
                        return [`${Number(value).toLocaleString()} Ar`, name];
                      }}
                      contentStyle={{
                        borderRadius: '12px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar
                      yAxisId="left"
                      dataKey="attenduAr"
                      name="Échéances Attendues (Ar)"
                      fill="#cbd5e1"
                      radius={[6, 6, 0, 0]}
                      barSize={20}
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="encaisseAr"
                      name="Montant Recouvré (Ar)"
                      fill="#059669"
                      radius={[6, 6, 0, 0]}
                      barSize={20}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="tauxRecouvrement"
                      name="Taux de Recouvrement (%)"
                      stroke="#1d4ed8"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#1d4ed8' }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Row 2 Charts: Répartition des dettes étudiantes */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* CHART 3A: Répartition des étudiants par statut de dette (Donut) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  3. Répartition des Dettes Étudiantes
                </h3>
                <p className="text-xs text-slate-500">
                  Ventilation des dossiers étudiants par statut de solvabilité
                </p>
              </div>

              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={financialAnalytics.debtStatusPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={78}
                      paddingAngle={4}
                    >
                      {financialAnalytics.debtStatusPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any, name: any) => [`${val} étudiant(s)`, name]}
                      contentStyle={{
                        borderRadius: '12px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Breakdown by Fee Category */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="text-[11px] font-bold uppercase text-slate-500">
                  Dettes Restantes par Nature de Frais
                </div>
                {financialAnalytics.debtCategoryPieData.map((cat) => (
                  <div key={cat.name} className="flex items-center justify-between text-xs">
                    <span className="text-slate-700 font-medium">{cat.name}</span>
                    <span className="font-mono font-bold text-rose-700">
                      {cat.debtAr.toLocaleString()} Ar
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* CHART 3B: Dettes vs Encaissements par Promotion / Groupe */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Dettes & Recouvrement par Promotion
                </h3>
                <p className="text-xs text-slate-500">
                  Comparaison des montants réglés et des impayés par groupe académique
                </p>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={financialAnalytics.debtByGroupData}
                    layout="vertical"
                    margin={{ top: 5, right: 16, left: 8, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                    <XAxis type="number" tickFormatter={formatAriaryShort} tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis
                      type="category"
                      dataKey="groupCode"
                      tick={{ fontSize: 11, fill: '#334155', fontWeight: 700 }}
                      width={70}
                    />
                    <Tooltip
                      formatter={(value: any, name: any) => [`${Number(value).toLocaleString()} Ar`, name]}
                      contentStyle={{
                        borderRadius: '12px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="paidAr" name="Encaissé (Ar)" stackId="a" fill="#059669" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="debtAr" name="Dette Restante (Ar)" stackId="a" fill="#e11d48" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* CHART 3C: Liste Prioritaire des Créances Étudiantes Actionnable */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">
                    Suivi Individuel des Créances
                  </h3>
                  <span className="text-[11px] text-rose-700 font-semibold">
                    Action rapide
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Cliquez sur un étudiant pour ouvrir son dossier ou encaisser un règlement
                </p>
              </div>

              <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto pr-1">
                {financialAnalytics.studentDebtRankings.map((item) => (
                  <div
                    key={item.id}
                    className="py-2.5 flex items-center justify-between gap-2 hover:bg-slate-50 rounded-lg px-2 transition-colors"
                  >
                    <div
                      onClick={() => {
                        setSelectedStudentId(item.id);
                        setActiveTab('OVERVIEW');
                      }}
                      className="cursor-pointer flex-1 min-w-0"
                    >
                      <div className="font-bold text-xs text-slate-800 truncate">{item.name}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                        <span className="font-mono text-blue-700">{item.matricule}</span>
                        <span aria-hidden="true">·</span>
                        <span>{item.groupCode}</span>
                        <span aria-hidden="true">·</span>
                        <span>Recouvré : {item.recoveryRate}%</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0 flex items-center gap-2">
                      <div>
                        <div
                          className={`text-xs font-extrabold font-mono ${
                            item.balanceDueAr === 0 ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {item.balanceDueAr.toLocaleString()} Ar
                        </div>
                        <div className="text-[10px] text-slate-400">
                          sur {formatAriaryShort(item.totalFeesAr)}
                        </div>
                      </div>

                      {item.balanceDueAr > 0 && (
                        <button
                          type="button"
                          onClick={() => openPaymentModalForStudent(item.id)}
                          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg transition-colors cursor-pointer"
                        >
                          Encaisser
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: OVERVIEW / STUDENT ACCOUNTS */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Student Selector List */}
            <div className="lg:col-span-1 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase text-slate-600">
                  Rechercher un étudiant (Nom ou Matricule)
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Saisir matricule ou nom de l'étudiant..."
                    value={searchStudent}
                    onChange={(e) => setSearchStudent(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>
              </div>

              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                {students
                  .filter((s) => s.name.toLowerCase().includes(searchStudent.toLowerCase()) || (s.matricule && s.matricule.toLowerCase().includes(searchStudent.toLowerCase())))
                  .map((st) => {
                    const sum = getStudentFinancialSummary(st.id);
                    const isSelected = st.id === selectedStudentId;

                    return (
                      <button
                        key={st.id}
                        onClick={() => setSelectedStudentId(st.id)}
                        className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between cursor-pointer ${
                          isSelected ? 'bg-emerald-50 border border-emerald-300' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-xs text-slate-800">{st.name}</div>
                          <span className="font-mono text-[10px] text-blue-600">{st.matricule || 'N/A'}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block uppercase font-bold">Solde restant</span>
                          <span
                            className={`text-xs font-extrabold ${
                              sum.balanceDueAr === 0 ? 'text-emerald-600' : 'text-amber-600'
                            }`}
                          >
                            {sum.balanceDueAr.toLocaleString()} Ar
                          </span>
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Selected Student Account Details */}
            {selectedStudentId && (
              <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                {(() => {
                  const student = users.find((u) => u.id === selectedStudentId);
                  const summary = getStudentFinancialSummary(selectedStudentId);
                  const studentPayments = payments.filter((p) => p.studentId === selectedStudentId);

                  return (
                    <>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="text-lg font-bold text-slate-900">{student?.name}</h2>
                            <span className="bg-blue-100 text-blue-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded">
                              {student?.matricule}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Email: {student?.email} • Téléphone: {student?.phone || 'Non renseigné'}
                          </p>
                        </div>

                        <button
                          onClick={() => openPaymentModalForStudent(selectedStudentId)}
                          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-sm"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Encaisser
                        </button>
                      </div>

                      {/* KPI Cards */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Frais</span>
                          <span className="text-base font-extrabold text-slate-800">
                            {summary.totalFeesAr.toLocaleString()} Ar
                          </span>
                        </div>
                        <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-center">
                          <span className="text-[10px] uppercase font-bold text-emerald-700 block">Total Encaissé</span>
                          <span className="text-base font-extrabold text-emerald-700">
                            {summary.totalPaidAr.toLocaleString()} Ar
                          </span>
                        </div>
                        <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-center">
                          <span className="text-[10px] uppercase font-bold text-amber-700 block">Solde Restant Dû</span>
                          <span className="text-base font-extrabold text-amber-800">
                            {summary.balanceDueAr.toLocaleString()} Ar
                          </span>
                        </div>
                      </div>

                      {/* Fee Breakdown */}
                      <div className="space-y-3">
                        <h3 className="font-bold text-xs uppercase text-slate-500">Détail des Frais d'Études</h3>
                        <div className="overflow-x-auto border border-slate-200 rounded-xl">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead className="bg-slate-50 text-slate-400 font-bold uppercase text-[10px] border-b border-slate-200">
                              <tr>
                                <th className="py-2.5 px-3">Frais</th>
                                <th className="py-2.5 px-3 text-right">Montant</th>
                                <th className="py-2.5 px-3 text-right">Payé</th>
                                <th className="py-2.5 px-3 text-right">Solde</th>
                                <th className="py-2.5 px-3 text-center">Statut</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {summary.feeDetails.map(({ fee, paidAr, remainingAr, status }) => (
                                <tr key={fee.id} className="hover:bg-slate-50">
                                  <td className="py-2.5 px-3 font-semibold text-slate-800">{fee.title}</td>
                                  <td className="py-2.5 px-3 text-right text-slate-700">{fee.amountAr.toLocaleString()} Ar</td>
                                  <td className="py-2.5 px-3 text-right text-emerald-600 font-bold">{paidAr.toLocaleString()} Ar</td>
                                  <td className="py-2.5 px-3 text-right text-amber-700 font-bold">{remainingAr.toLocaleString()} Ar</td>
                                  <td className="py-2.5 px-3 text-center">
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        status === 'PAID'
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : status === 'PARTIAL'
                                          ? 'bg-amber-100 text-amber-800'
                                          : 'bg-rose-100 text-rose-800'
                                      }`}
                                    >
                                      {status === 'PAID' ? 'Soldé' : status === 'PARTIAL' ? 'Partiel' : 'Non réglé'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Payment History */}
                      <div className="space-y-3">
                        <h3 className="font-bold text-xs uppercase text-slate-500">Reçus Émis & Annulation de Transaction</h3>
                        {studentPayments.length === 0 ? (
                          <p className="text-xs text-slate-400 italic">Aucun reçu enregistré pour cet étudiant.</p>
                        ) : (
                          <div className="space-y-2">
                            {studentPayments.map((p) => {
                              const isCancelled = p.status === 'CANCELLED';
                              const feeObj = fees.find((f) => f.id === p.feeId);
                              return (
                                <div
                                  key={p.id}
                                  className={`p-3 rounded-xl border text-xs space-y-2 ${
                                    isCancelled
                                      ? 'bg-rose-50/40 border-rose-200 opacity-75'
                                      : 'bg-slate-50 border-slate-200'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className={`font-mono font-bold ${isCancelled ? 'line-through text-rose-700' : 'text-blue-700'}`}>
                                          {p.receiptNumber}
                                        </span>
                                        <span className={`font-extrabold ${isCancelled ? 'line-through text-slate-500' : 'text-slate-800'}`}>
                                          {p.amountPaidAr.toLocaleString()} Ar
                                        </span>
                                        <span className="text-slate-500">• {p.paymentMethod}</span>
                                        {isCancelled && (
                                          <span className="px-2 py-0.5 bg-rose-100 text-rose-800 font-black rounded text-[10px]">
                                            ANNULÉ
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-[10px] text-slate-500 mt-0.5">
                                        {feeObj?.title || 'Frais de scolarité'} • Encaissé le {p.paymentDate} par {p.recordedBy}
                                      </div>
                                      {isCancelled && p.cancelReason && (
                                        <div className="text-[10px] text-rose-700 font-semibold mt-0.5">
                                          Motif d'annulation : {p.cancelReason} ({p.cancelledBy})
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => setSelectedReceipt(p)}
                                        className="text-xs bg-white hover:bg-slate-100 border border-slate-300 px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 cursor-pointer"
                                      >
                                        <Printer className="w-3 h-3 text-slate-500" />
                                        Reçu
                                      </button>
                                      {!isCancelled && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setCancellingTxId(p.id);
                                            setCancelTxReason('Erreur de saisie caisse / Annulation');
                                          }}
                                          className="text-xs bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-2.5 py-1 rounded-lg font-bold cursor-pointer"
                                        >
                                          Annuler
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  {cancellingTxId === p.id && !isCancelled && (
                                    <div className="pt-2 border-t border-rose-200 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-rose-50/70 p-2 rounded-lg">
                                      <input
                                        type="text"
                                        value={cancelTxReason}
                                        onChange={(e) => setCancelTxReason(e.target.value)}
                                        placeholder="Motif de l'annulation..."
                                        className="flex-1 px-2.5 py-1 bg-white border border-rose-300 rounded text-xs"
                                      />
                                      <div className="flex items-center gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            cancelPayment(p.id, cancelTxReason);
                                            setCancellingTxId(null);
                                          }}
                                          className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded text-[11px] cursor-pointer"
                                        >
                                          Confirmer l'annulation
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setCancellingTxId(null)}
                                          className="px-2.5 py-1 bg-white border border-slate-300 text-slate-600 rounded text-[11px] cursor-pointer"
                                        >
                                          Fermer
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CASH REGISTER JOURNAL */}
      {activeTab === 'CASH_REGISTER' && (
        <div className="space-y-6">
          {/* Today's Active Cash Register */}
          {todayRegister && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2">
                    {todayRegister.isClosed ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
                        <Lock className="w-3.5 h-3.5" />
                        Caisse Clôturée & Verrouillée
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                        <Unlock className="w-3.5 h-3.5" />
                        Session de Caisse Active (Aujourd'hui)
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 mt-1">
                    Caisse Journalière du {new Date(todayRegister.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">{todayRegister.closureNotes}</p>
                </div>

                {!todayRegister.isClosed && (
                  <button
                    onClick={() => {
                      setActualClosingArInput(todayRegister.theoreticalClosingAr);
                      setShowCloseRegisterModal(true);
                    }}
                    className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    <Lock className="w-4 h-4" />
                    Procéder à la Clôture Journalière
                  </button>
                )}
              </div>

              {/* STRICT BREAKDOWN: Cash vs Mobile Money vs Bank */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase text-slate-500">
                    Ventilation Stricte des Encaissements du Jour (Non fusionnés)
                  </h3>
                  <span className="text-[11px] text-slate-400">Rapprochement financier comptable</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Espèces */}
                  <div className="bg-emerald-50/70 border border-emerald-200 p-4 rounded-xl">
                    <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold mb-1">
                      <Banknote className="w-4 h-4" />
                      <span>Espèces en Caisse</span>
                    </div>
                    <div className="text-xl font-extrabold text-emerald-700">
                      {todayRegister.cashCollectedAr.toLocaleString()} Ar
                    </div>
                    <span className="text-[10px] text-emerald-600">Billets & pièces comptabilisés</span>
                  </div>

                  {/* Mobile Money */}
                  <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-xl">
                    <div className="flex items-center gap-2 text-amber-800 text-xs font-bold mb-1">
                      <Smartphone className="w-4 h-4" />
                      <span>Mobile Money</span>
                    </div>
                    <div className="text-xl font-extrabold text-amber-800">
                      {todayRegister.mobileMoneyCollectedAr.toLocaleString()} Ar
                    </div>
                    <span className="text-[10px] text-amber-700">MVola, Orange Money, Airtel Money</span>
                  </div>

                  {/* Virement / Banque */}
                  <div className="bg-blue-50/70 border border-blue-200 p-4 rounded-xl">
                    <div className="flex items-center gap-2 text-blue-800 text-xs font-bold mb-1">
                      <CreditCard className="w-4 h-4" />
                      <span>Banque & Virements</span>
                    </div>
                    <div className="text-xl font-extrabold text-blue-800">
                      {todayRegister.bankCollectedAr.toLocaleString()} Ar
                    </div>
                    <span className="text-[10px] text-blue-600">Dépôts bordereaux & virements</span>
                  </div>

                  {/* Total Journée */}
                  <div className="bg-slate-900 text-white p-4 rounded-xl shadow-inner">
                    <div className="text-[11px] text-slate-300 font-bold uppercase mb-1">Solde Théorique Total</div>
                    <div className="text-xl font-extrabold text-emerald-400">
                      {todayRegister.theoreticalClosingAr.toLocaleString()} Ar
                    </div>
                    <span className="text-[10px] text-slate-400">
                      Ouverture ({todayRegister.openingBalanceAr.toLocaleString()} Ar) + Encaissements ({todayRegister.totalCollectedAr.toLocaleString()} Ar)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Past Registers Log */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="font-bold text-slate-800 text-sm">Historique des Clôtures de Caisse</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3 text-right">Espèces</th>
                    <th className="py-2.5 px-3 text-right">Mobile Money</th>
                    <th className="py-2.5 px-3 text-right">Banque</th>
                    <th className="py-2.5 px-3 text-right">Total Encaissé</th>
                    <th className="py-2.5 px-3 text-right">Solde Théorique</th>
                    <th className="py-2.5 px-3 text-right">Réel Compté</th>
                    <th className="py-2.5 px-3 text-center">Écart (Discrepancy)</th>
                    <th className="py-2.5 px-3 text-center">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cashRegisterDays.map((crd) => (
                    <tr key={crd.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-bold text-slate-800">{crd.date}</td>
                      <td className="py-2.5 px-3 text-right text-emerald-700">{crd.cashCollectedAr.toLocaleString()} Ar</td>
                      <td className="py-2.5 px-3 text-right text-amber-700">{crd.mobileMoneyCollectedAr.toLocaleString()} Ar</td>
                      <td className="py-2.5 px-3 text-right text-blue-700">{crd.bankCollectedAr.toLocaleString()} Ar</td>
                      <td className="py-2.5 px-3 text-right font-extrabold text-slate-900">{crd.totalCollectedAr.toLocaleString()} Ar</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700">{crd.theoreticalClosingAr.toLocaleString()} Ar</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {crd.actualClosingAr !== undefined ? crd.actualClosingAr.toLocaleString() + ' Ar' : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {crd.discrepancyAr !== undefined ? (
                          <span
                            className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                              crd.discrepancyAr === 0
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {crd.discrepancyAr === 0 ? '0 Ar (Conforme)' : `${crd.discrepancyAr.toLocaleString()} Ar`}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">En cours</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            crd.isClosed
                              ? 'bg-slate-200 text-slate-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {crd.isClosed ? 'Clôturée' : 'Ouverte'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ALL TRANSACTIONS */}
      {activeTab === 'TRANSACTIONS' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h3 className="font-bold text-slate-800 text-sm">Registre Général des Encaissements</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                  <th className="py-2.5 px-3">N° Reçu</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Étudiant</th>
                  <th className="py-2.5 px-3">Frais concerné</th>
                  <th className="py-2.5 px-3 text-right">Montant Encaissé</th>
                  <th className="py-2.5 px-3 text-right">Solde Restant</th>
                  <th className="py-2.5 px-3">Mode de Paiement</th>
                  <th className="py-2.5 px-3">Opérateur / Caissier</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => {
                  const student = users.find((u) => u.id === p.studentId);
                  const fee = fees.find((f) => f.id === p.feeId);
                  const isCancelled = p.status === 'CANCELLED';

                  return (
                    <React.Fragment key={p.id}>
                      <tr className={isCancelled ? 'bg-rose-50/40 opacity-75' : 'hover:bg-slate-50'}>
                        <td className="py-2.5 px-3 font-mono font-bold text-blue-700">
                          <span className={isCancelled ? 'line-through text-rose-700' : ''}>{p.receiptNumber}</span>
                          {isCancelled && (
                            <span className="ml-1.5 px-1.5 py-0.5 bg-rose-100 text-rose-800 font-black rounded text-[9px]">
                              ANNULÉ
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">{p.paymentDate}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                          {student?.name} <span className="font-mono text-[10px] text-slate-400">({student?.matricule})</span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">
                          {fee?.title || 'Frais'}
                          {isCancelled && p.cancelReason && (
                            <span className="block text-[10px] text-rose-700 font-semibold">
                              Motif : {p.cancelReason}
                            </span>
                          )}
                        </td>
                        <td className={`py-2.5 px-3 text-right font-extrabold ${isCancelled ? 'line-through text-slate-400' : 'text-emerald-700'}`}>
                          {p.amountPaidAr.toLocaleString()} Ar
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-amber-700">
                          {p.remainingBalanceAr.toLocaleString()} Ar
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-semibold">
                            {p.paymentMethod}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px]">{p.recordedBy}</td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedReceipt(p)}
                              className="bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                            >
                              Reçu
                            </button>
                            {!isCancelled && (
                              <button
                                type="button"
                                onClick={() => {
                                  setCancellingTxId(p.id);
                                  setCancelTxReason('Erreur de saisie caisse / Annulation');
                                }}
                                className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                              >
                                Annuler
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {cancellingTxId === p.id && !isCancelled && (
                        <tr className="bg-rose-50/80">
                          <td colSpan={9} className="p-3">
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                              <span className="text-xs font-bold text-rose-900">
                                Annuler le reçu {p.receiptNumber} ({p.amountPaidAr.toLocaleString()} Ar) — Motif :
                              </span>
                              <input
                                type="text"
                                value={cancelTxReason}
                                onChange={(e) => setCancelTxReason(e.target.value)}
                                className="flex-1 max-w-md px-2.5 py-1 bg-white border border-rose-300 rounded text-xs"
                                placeholder="Saisir le motif d'annulation..."
                              />
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    cancelPayment(p.id, cancelTxReason);
                                    setCancellingTxId(null);
                                  }}
                                  className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded text-xs cursor-pointer"
                                >
                                  Confirmer l'annulation
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setCancellingTxId(null)}
                                  className="px-2.5 py-1 bg-white border border-slate-300 text-slate-600 rounded text-xs cursor-pointer"
                                >
                                  Fermer
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: FEES CATALOG */}
      {activeTab === 'FEES_CATALOG' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Catalogue des Droits & Frais d'Études</h3>
              <p className="text-xs text-slate-500">
                Tarification institutionnelle par groupe ou promotion • Modification en direct
              </p>
            </div>
            <button
              onClick={() => {
                setEditingFeeId(null);
                setFeeForm({
                  title: '',
                  amountAr: 1500000,
                  dueDate: new Date().toISOString().split('T')[0],
                  category: 'ECOLAGE',
                  academicYear: selectedAcademicYear || '2025-2026',
                  groupId: 'ALL',
                });
                setShowAddFeeModal(true);
              }}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Nouveau Frais
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fees.map((f) => (
              <div key={f.id} className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                      {f.category}
                    </span>
                    <span className="font-mono text-xs text-slate-400">Échéance : {f.dueDate}</span>
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm">{f.title}</h4>
                  <div className="text-lg font-extrabold text-blue-900">
                    {f.amountAr.toLocaleString()} Ar
                  </div>
                  <div className="text-xs text-slate-500">
                    Année : {f.academicYear} {f.groupId ? `• Groupe : ${groups.find((g) => g.id === f.groupId)?.code}` : '• Tous les groupes'}
                  </div>
                </div>

                {isAdminOrStaff && (
                  <div className="pt-3 mt-2 border-t border-slate-200 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingFeeId(f.id);
                        setFeeForm({
                          title: f.title,
                          amountAr: f.amountAr,
                          dueDate: f.dueDate,
                          category: f.category,
                          academicYear: f.academicYear,
                          groupId: f.groupId || 'ALL',
                        });
                        setShowAddFeeModal(true);
                      }}
                      className="px-3 py-1.5 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Modifier
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteFee(f.id)}
                      className="px-2.5 py-1.5 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Supprimer ce frais du catalogue"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: Encaisser un Paiement (ACC-006 à ACC-013) */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleRecordPaymentSubmit}
            className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 my-6"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Banknote className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Encaisser un Règlement (Ariary)</h3>
                  <p className="text-xs text-slate-500">
                    Identification par Matricule, Nom, Prénom, Code-barres ou QR Code • Filtrage exclusif des frais non soldés
                  </p>
                </div>
              </div>
            </div>

            {paymentError && (
              <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs font-bold text-rose-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{paymentError}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              {/* Composant Universel de Recherche & Scan Étudiant (ACC-006, ACC-007, ACC-008, ACC-013) */}
              <UniversalStudentSelector
                selectedStudentId={paymentForm.studentId}
                onSelectStudent={(stId) => {
                  setPaymentError('');
                  const unpaid = getUnpaidFeesForStudent(stId);
                  const firstUnpaid = unpaid[0];
                  const fallbackFee = fees[0];
                  setPaymentForm((prev) => ({
                    ...prev,
                    studentId: stId,
                    feeId: firstUnpaid ? firstUnpaid.fee.id : fallbackFee?.id || '',
                    amountPaidAr: firstUnpaid ? firstUnpaid.remainingAr : fallbackFee?.amountAr || 500000,
                  }));
                }}
                label="Étudiant bénéficiaire (Matricule, Nom, Prénom, Liste, Code-barres ou QR)"
              />

              {/* Sélection des frais à régler (Frais non soldés + Catalogue complet disponible) */}
              {(() => {
                const studentSummary = getStudentFinancialSummary(paymentForm.studentId);
                const unpaidFeeList = studentSummary.feeDetails.filter((fd) => fd.remainingAr > 0);
                const selectedFeeDetail = studentSummary.feeDetails.find((fd) => fd.fee.id === paymentForm.feeId);
                const selectedCatalogFee = fees.find((f) => f.id === paymentForm.feeId);
                const activeFeeId = paymentForm.feeId || unpaidFeeList[0]?.fee.id || fees[0]?.id || '';

                return (
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-slate-700">
                          Frais d'études à régler *
                        </label>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {unpaidFeeList.length} frais en attente • {fees.length} au catalogue
                        </span>
                      </div>

                      <select
                        required
                        value={activeFeeId}
                        onChange={(e) => {
                          const fId = e.target.value;
                          const foundDetail = studentSummary.feeDetails.find((fd) => fd.fee.id === fId);
                          const foundCatalog = fees.find((f) => f.id === fId);
                          setPaymentForm({
                            ...paymentForm,
                            feeId: fId,
                            amountPaidAr:
                              foundDetail && foundDetail.remainingAr > 0
                                ? foundDetail.remainingAr
                                : foundCatalog
                                ? foundCatalog.amountAr
                                : paymentForm.amountPaidAr,
                          });
                        }}
                        className="w-full border border-slate-300 rounded-lg p-2.5 font-bold bg-white text-slate-900"
                      >
                        <option value="">-- Choisir un frais à encaisser --</option>
                        {unpaidFeeList.length > 0 && (
                          <optgroup label="Frais de l'étudiant en attente de règlement">
                            {unpaidFeeList.map(({ fee, paidAr, remainingAr, status }) => (
                              <option key={fee.id} value={fee.id}>
                                {fee.title} — Reste : {remainingAr.toLocaleString()} Ar{' '}
                                {status === 'PARTIAL'
                                  ? `(Partiel • déjà payé : ${paidAr.toLocaleString()} Ar)`
                                  : `(Total : ${fee.amountAr.toLocaleString()} Ar)`}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        <optgroup label="Tous les frais du catalogue institutionnel">
                          {fees.map((f) => (
                            <option key={`cat-${f.id}`} value={f.id}>
                              {f.title} ({f.category}) — {f.amountAr.toLocaleString()} Ar
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </div>

                    {(selectedFeeDetail || selectedCatalogFee) && (
                      <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl grid grid-cols-3 gap-2 text-center">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-500 block">Montant du Frais</span>
                          <span className="font-bold text-slate-800">
                            {(selectedFeeDetail?.fee.amountAr || selectedCatalogFee?.amountAr || 0).toLocaleString()} Ar
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-emerald-700 block">Déjà Réglé</span>
                          <span className="font-bold text-emerald-700">
                            {(selectedFeeDetail?.paidAr || 0).toLocaleString()} Ar
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-rose-700 block">Solde Restant Dû</span>
                          <span className="font-black text-rose-700">
                            {(selectedFeeDetail?.remainingAr ?? selectedCatalogFee?.amountAr ?? 0).toLocaleString()} Ar
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">
                          Montant versé en Ariary (Ar) *
                        </label>
                        <input
                          type="number"
                          min="100"
                          step="100"
                          required
                          value={paymentForm.amountPaidAr}
                          onChange={(e) => setPaymentForm({ ...paymentForm, amountPaidAr: Number(e.target.value) })}
                          className="w-full border border-slate-300 rounded-lg p-2 font-extrabold text-blue-700 text-sm"
                        />
                      </div>

                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">Mode de règlement</label>
                        <select
                          value={paymentForm.paymentMethod}
                          onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value as PaymentMethod })}
                          className="w-full border border-slate-300 rounded-lg p-2 font-semibold"
                        >
                          <option value="ESPECES">Espèces (Guichet)</option>
                          <option value="MOBILE_MONEY">Mobile Money (MVola/Orange)</option>
                          <option value="DEPOT_BANCAIRE">Dépôt Bancaire (Bordereau)</option>
                          <option value="VIREMENT_BANCAIRE">Virement Bancaire</option>
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Référence Transaction / Chèque (facultatif)</label>
                <input
                  type="text"
                  placeholder="ex: MVOLA-98124 ou BNI-DEP-741"
                  value={paymentForm.referenceNumber}
                  onChange={(e) => setPaymentForm({ ...paymentForm, referenceNumber: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Notes / Remarques</label>
                <input
                  type="text"
                  placeholder="ex: 1ère tranche écolage S1"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md cursor-pointer"
              >
                Valider l'encaissement & émettre le reçu
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Clôture Journalière de Caisse */}
      {showCloseRegisterModal && todayRegister && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCloseRegisterSubmit}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Clôture Journalière de Caisse</h3>
                <p className="text-xs text-slate-500">Date : {todayRegister.date}</p>
              </div>
            </div>

            <div className="space-y-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-600">Solde théorique calculé :</span>
                <span className="font-extrabold text-slate-900 font-mono">
                  {todayRegister.theoreticalClosingAr.toLocaleString()} Ar
                </span>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Montant réel compté en caisse (Espèces + relevés Mobile Money/Banque) :
                </label>
                <input
                  type="number"
                  required
                  value={actualClosingArInput}
                  onChange={(e) => setActualClosingArInput(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 font-mono font-extrabold text-blue-700"
                />
              </div>

              <div className="flex justify-between items-center py-1 border-t border-slate-200 pt-2">
                <span className="font-bold text-slate-700">Écart constaté :</span>
                <span
                  className={`font-black font-mono ${
                    actualClosingArInput - todayRegister.theoreticalClosingAr === 0
                      ? 'text-emerald-600'
                      : 'text-rose-600'
                  }`}
                >
                  {(actualClosingArInput - todayRegister.theoreticalClosingAr).toLocaleString()} Ar
                </span>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Notes de clôture :</label>
                <input
                  type="text"
                  placeholder="ex: Caisse conforme, zéro écart."
                  value={closureNotesInput}
                  onChange={(e) => setClosureNotesInput(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2"
                />
              </div>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>
                Attention : Une fois clôturée, la caisse du jour est verrouillée. Aucun encaissement direct ne pourra être ajouté rétroactivement sans régularisation.
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCloseRegisterModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md cursor-pointer"
              >
                Confirmer la Clôture Définitive
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Nouveau / Modifier Frais */}
      {showAddFeeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateFeeSubmit}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                {editingFeeId ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  {editingFeeId ? "Modifier le Frais d'Études" : "Ajouter un Frais d'Études"}
                </h3>
                <p className="text-xs text-slate-500">Catalogue des Droits & Frais d'Études ({feeForm.academicYear})</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Intitulé du frais</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Frais d'examen Session Normale"
                  value={feeForm.title}
                  onChange={(e) => setFeeForm({ ...feeForm, title: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Montant en Ariary (Ar)</label>
                  <input
                    type="number"
                    step="10000"
                    required
                    value={feeForm.amountAr}
                    onChange={(e) => setFeeForm({ ...feeForm, amountAr: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-lg p-2 font-bold text-blue-700"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Catégorie</label>
                  <select
                    value={feeForm.category}
                    onChange={(e) => setFeeForm({ ...feeForm, category: e.target.value as StudentFee['category'] })}
                    className="w-full border border-slate-300 rounded-lg p-2 font-medium"
                  >
                    <option value="INSCRIPTION">Droits d'inscription</option>
                    <option value="ECOLAGE">Écolage semestriel</option>
                    <option value="EXAMEN">Frais d'examen</option>
                    <option value="INDIVIDUEL">Individuel / Matériel</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Année Académique *</label>
                  <select
                    value={feeForm.academicYear}
                    onChange={(e) => setFeeForm({ ...feeForm, academicYear: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 font-bold text-xs"
                  >
                    {academicYears.map((ay) => (
                      <option key={ay.id} value={ay.code}>
                        {ay.code} {ay.isCurrent ? '(Active)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Groupe / Promotion *</label>
                  <select
                    value={feeForm.groupId}
                    onChange={(e) => setFeeForm({ ...feeForm, groupId: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 font-medium text-xs"
                  >
                    <option value="ALL">Tous les groupes (Généralisé)</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.code} ({g.name})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Date d'échéance</label>
                <input
                  type="date"
                  required
                  value={feeForm.dueDate}
                  onChange={(e) => setFeeForm({ ...feeForm, dueDate: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setEditingFeeId(null);
                  setShowAddFeeModal(false);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md cursor-pointer"
              >
                {editingFeeId ? 'Enregistrer les modifications' : 'Enregistrer le frais'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PRINTABLE RECEIPT MODAL */}
      {selectedReceipt && (
        <ReceiptModal
          receipt={selectedReceipt}
          student={users.find((u) => u.id === selectedReceipt.studentId)}
          fee={fees.find((f) => f.id === selectedReceipt.feeId)}
          onClose={() => setSelectedReceipt(null)}
        />
      )}
    </div>
  );
};

// Sub-component: Official Printable Receipt Modal
interface ReceiptModalProps {
  receipt: PaymentTransaction;
  student?: any;
  fee?: StudentFee;
  onClose: () => void;
}

const ReceiptModal: React.FC<ReceiptModalProps> = ({ receipt, student, fee, onClose }) => {
  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl border border-slate-200 space-y-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Header Institution */}
        <div className="text-center pb-4 border-b border-slate-200 space-y-1">
          <div className="inline-block bg-slate-900 text-white font-extrabold text-xs px-3 py-1 rounded-full uppercase tracking-wider mb-1">
            EBM Institute Madagascar
          </div>
          <h2 className="text-xl font-black text-slate-900">REÇU DE PAIEMENT OFFICIEL</h2>
          <p className="text-xs text-slate-500 font-mono">N° {receipt.receiptNumber}</p>
        </div>

        {/* Receipt Details */}
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Étudiant(e)</span>
              <span className="font-bold text-slate-800 text-sm">{student?.name || 'Étudiant'}</span>
              <div className="font-mono text-blue-600">{student?.matricule || 'N/A'}</div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Date du versement</span>
              <span className="font-bold text-slate-800">{receipt.paymentDate}</span>
              <div className="text-slate-500 text-[11px]">{receipt.paymentMethod}</div>
            </div>
          </div>

          <div className="p-4 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex justify-between items-center text-slate-600">
              <span>Motif :</span>
              <span className="font-bold text-slate-800">{fee?.title || 'Frais de scolarité'}</span>
            </div>
            {receipt.referenceNumber && (
              <div className="flex justify-between items-center text-slate-600">
                <span>Réf. Transaction :</span>
                <span className="font-mono font-semibold text-slate-700">{receipt.referenceNumber}</span>
              </div>
            )}
            <div className="border-t border-slate-200 pt-2 flex justify-between items-center text-sm">
              <span className="font-bold text-slate-700">Montant Encaissé :</span>
              <span className="text-lg font-black text-emerald-600">
                {receipt.amountPaidAr.toLocaleString()} Ar
              </span>
            </div>
            <div className="flex justify-between items-center text-xs text-amber-700 font-semibold">
              <span>Solde restant dû :</span>
              <span>{receipt.remainingBalanceAr.toLocaleString()} Ar</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 text-center italic">
            Encaissé et certifié par : {receipt.recordedBy} • Document faisant foi de quittance légale.
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
          >
            Fermer
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Imprimer le Reçu
          </button>
        </div>
      </div>
    </div>
  );
};
