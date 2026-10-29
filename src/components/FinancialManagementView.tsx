import React, { useState } from 'react';
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
} from 'lucide-react';

export const FinancialManagementView: React.FC = () => {
  const {
    currentUser,
    users,
    groups,
    fees,
    payments,
    cashRegisterDays,
    addFee,
    recordPayment,
    cancelPayment,
    closeCashRegisterDay,
    getStudentFinancialSummary,
    selectedAcademicYear,
    academicYears,
  } = useApp();

  const isStudent = currentUser.role === 'STUDENT';
  const isAdminOrStaff = ['ADMIN', 'SCHEDULER', 'ACADEMIC_HEAD'].includes(currentUser.role);

  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'TRANSACTIONS' | 'CASH_REGISTER' | 'FEES_CATALOG'>('OVERVIEW');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('user-student-laurent');
  const [searchStudent, setSearchStudent] = useState<string>('');

  // Payment Recording Modal
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [matriculeSearch, setMatriculeSearch] = useState<string>('EBM-2026-0042');
  const [paymentForm, setPaymentForm] = useState({
    studentId: 'user-student-laurent',
    feeId: fees[0]?.id || 'fee-insc-2026',
    amountPaidAr: 500000,
    paymentMethod: 'MOBILE_MONEY' as PaymentMethod,
    referenceNumber: '',
    notes: '',
  });

  // Receipt Modal to print/view
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentTransaction | null>(null);

  // Cash Register Closure Modal
  const [showCloseRegisterModal, setShowCloseRegisterModal] = useState<boolean>(false);
  const [actualClosingArInput, setActualClosingArInput] = useState<number>(0);
  const [closureNotesInput, setClosureNotesInput] = useState<string>('');

  // New Fee Modal
  const [showAddFeeModal, setShowAddFeeModal] = useState<boolean>(false);
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

  const handleRecordPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentForm.studentId || !paymentForm.feeId || paymentForm.amountPaidAr <= 0) return;

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

    addFee({
      academicYear: feeForm.academicYear || selectedAcademicYear,
      title: feeForm.title,
      amountAr: Number(feeForm.amountAr),
      dueDate: feeForm.dueDate,
      category: feeForm.category,
      groupId: feeForm.groupId === 'ALL' ? undefined : feeForm.groupId,
    });
    setShowAddFeeModal(false);
  };

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
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2.5 py-0.5 rounded text-xs font-semibold uppercase">
              Gestion Financière Institutionnelle
            </span>
            <span className="text-xs text-slate-300">Norme Ariary (Ar) • EBM Institute</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Comptabilité, Encaissements & Caisse Journalière</h1>
          <p className="text-slate-300 text-sm mt-1">
            Suivi rigoureux des paiements en Ariary, émission de reçus numérotés, et ventilation stricte de caisse (Espèces, Mobile Money, Banque).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowPaymentModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl shadow-lg transition-all cursor-pointer active:scale-95"
          >
            <Banknote className="w-4 h-4" />
            Encaisser un paiement
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('OVERVIEW')}
          className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm border-b-2 transition-colors ${
            activeTab === 'OVERVIEW'
              ? 'border-emerald-600 text-emerald-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <User className="w-4 h-4" />
          Comptes Étudiants & Soldes
        </button>
        <button
          onClick={() => setActiveTab('CASH_REGISTER')}
          className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm border-b-2 transition-colors ${
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
          className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm border-b-2 transition-colors ${
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
          className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm border-b-2 transition-colors ${
            activeTab === 'FEES_CATALOG'
              ? 'border-emerald-600 text-emerald-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          Catalogue des Frais ({fees.length})
        </button>
      </div>

      {/* TAB 1: OVERVIEW / STUDENT ACCOUNTS */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Student Selector List */}
            <div className="lg:col-span-1 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Chercher étudiant..."
                  value={searchStudent}
                  onChange={(e) => setSearchStudent(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                />
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
                          onClick={() => {
                            setPaymentForm((prev) => ({ ...prev, studentId: selectedStudentId }));
                            setShowPaymentModal(true);
                          }}
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
                        <h3 className="font-bold text-xs uppercase text-slate-500">Reçus Émis</h3>
                        {studentPayments.length === 0 ? (
                          <p className="text-xs text-slate-400 italic">Aucun reçu enregistré pour cet étudiant.</p>
                        ) : (
                          <div className="space-y-2">
                            {studentPayments.map((p) => (
                              <div
                                key={p.id}
                                className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                              >
                                <div>
                                  <span className="font-mono font-bold text-blue-700">{p.receiptNumber}</span> •{' '}
                                  <span className="font-extrabold text-slate-800">{p.amountPaidAr.toLocaleString()} Ar</span> •{' '}
                                  <span className="text-slate-500">{p.paymentMethod}</span>
                                  <div className="text-[10px] text-slate-400">Encaissé le {p.paymentDate} par {p.recordedBy}</div>
                                </div>
                                <button
                                  onClick={() => setSelectedReceipt(p)}
                                  className="text-xs bg-white hover:bg-slate-100 border border-slate-300 px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 cursor-pointer"
                                >
                                  <Printer className="w-3 h-3 text-slate-500" />
                                  Imprimer
                                </button>
                              </div>
                            ))}
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

                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono font-bold text-blue-700">{p.receiptNumber}</td>
                      <td className="py-2.5 px-3 text-slate-600">{p.paymentDate}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        {student?.name} <span className="font-mono text-[10px] text-slate-400">({student?.matricule})</span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">{fee?.title || 'Frais'}</td>
                      <td className="py-2.5 px-3 text-right font-extrabold text-emerald-700">
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
                        <button
                          onClick={() => setSelectedReceipt(p)}
                          className="bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                        >
                          Reçu
                        </button>
                      </td>
                    </tr>
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
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Catalogue des Droits & Frais d'Études</h3>
              <p className="text-xs text-slate-500">Tarification institutionnelle par groupe ou promotion</p>
            </div>
            <button
              onClick={() => setShowAddFeeModal(true)}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Nouveau Frais
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fees.map((f) => (
              <div key={f.id} className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
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
                  Année : {f.academicYear} {f.groupId ? `• Groupe : ${groups.find((g) => g.id === f.groupId)?.code}` : '• Tous'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: Encaisser un Paiement */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleRecordPaymentSubmit}
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Banknote className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Encaisser un Règlement</h3>
                <p className="text-xs text-slate-500">Mise à jour immédiate du solde et émission du reçu numéroté</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              {/* Saisie rapide Matricule + Liste de choix commençant par matricule */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <label className="font-bold text-slate-800 flex items-center justify-between text-xs">
                  <span>Étudiant bénéficiaire</span>
                  <span className="text-[10px] text-blue-700 font-semibold">Saisie directe du matricule</span>
                </label>

                {/* Saisie directe du matricule */}
                <input
                  type="text"
                  placeholder="Tapez le matricule (ex: EBM-2026-0042)..."
                  value={matriculeSearch}
                  onChange={(e) => {
                    const val = e.target.value;
                    setMatriculeSearch(val);
                    const clean = val.trim().toLowerCase();
                    if (clean) {
                      const match = students.find((s) => s.matricule && s.matricule.toLowerCase().includes(clean));
                      if (match) {
                        setPaymentForm((prev) => ({ ...prev, studentId: match.id }));
                      }
                    }
                  }}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 font-mono font-bold text-blue-900 focus:ring-1 focus:ring-blue-600 outline-none"
                />

                {/* Liste de choix commençant obligatoirement par le matricule */}
                <div>
                  <span className="text-[10px] text-slate-500 block mb-0.5">Ou sélectionner dans la liste :</span>
                  <select
                    required
                    value={paymentForm.studentId}
                    onChange={(e) => {
                      const stId = e.target.value;
                      setPaymentForm({ ...paymentForm, studentId: stId });
                      const st = students.find((s) => s.id === stId);
                      if (st?.matricule) setMatriculeSearch(st.matricule);
                    }}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 font-medium"
                  >
                    {students.map((st) => {
                      const grp = groups.find((g) => g.id === st.groupId);
                      return (
                        <option key={st.id} value={st.id}>
                          {st.matricule || 'SANS-MAT'} — {st.name} {grp ? `(${grp.code})` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Nom et synthèse de l'étudiant sélectionné affichés directement */}
                {(() => {
                  const currentSt = students.find((s) => s.id === paymentForm.studentId);
                  const currentGrp = groups.find((g) => g.id === currentSt?.groupId);
                  const currentSummary = currentSt ? getStudentFinancialSummary(currentSt.id) : null;
                  if (!currentSt) return null;

                  return (
                    <div className="mt-2 p-2.5 bg-blue-50/90 border border-blue-200 rounded-lg flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block">
                          Étudiant sélectionné :
                        </span>
                        <span className="font-extrabold text-blue-950 text-sm block">
                          {currentSt.name}
                        </span>
                        <span className="text-[11px] text-slate-600">
                          Matricule : <strong className="font-mono text-blue-900">{currentSt.matricule}</strong> • Promo : {currentGrp?.name || 'Sans groupe'}
                        </span>
                      </div>
                      {currentSummary && (
                        <div className="text-right">
                          <span className="text-[10px] text-slate-500 block">Solde à régler</span>
                          <span className={`font-black text-xs ${
                            currentSummary.balanceDueAr > 0 ? 'text-rose-700' : 'text-emerald-700'
                          }`}>
                            {currentSummary.balanceDueAr.toLocaleString()} Ar
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Frais à régler</label>
                <select
                  required
                  value={paymentForm.feeId}
                  onChange={(e) => setPaymentForm({ ...paymentForm, feeId: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 font-bold"
                >
                  {fees.map((fee) => (
                    <option key={fee.id} value={fee.id}>
                      {fee.title} ({fee.amountAr.toLocaleString()} Ar)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Montant versé en Ariary (Ar)</label>
                  <input
                    type="number"
                    min="1000"
                    step="1000"
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

      {/* MODAL: Nouveau Frais */}
      {showAddFeeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateFeeSubmit}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Ajouter un Frais d'Études</h3>
                <p className="text-xs text-slate-500">Année universitaire : {selectedAcademicYear}</p>
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
                onClick={() => setShowAddFeeModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md cursor-pointer"
              >
                Enregistrer le frais
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
