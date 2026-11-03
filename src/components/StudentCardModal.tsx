import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { User } from '../types';
import { escapeHtml } from '../utils/securityAndDateUtils';
import {
  X,
  Printer,
  RefreshCw,
  ShieldCheck,
  QrCode,
  Barcode,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
} from 'lucide-react';

interface StudentCardModalProps {
  student: User;
  onClose: () => void;
}

export const StudentCardModal: React.FC<StudentCardModalProps> = ({ student: initialStudent, onClose }) => {
  const { users, groups, filieres, parcours, inscriptions, selectedAcademicYear, reissueStudentCard, currentUser } = useApp();

  // Always read latest student state from context so reissuance updates immediately
  const student = users.find((u) => u.id === initialStudent.id) || initialStudent;
  const activeInsc =
    inscriptions.find((i) => i.studentId === student.id && i.academicYear === selectedAcademicYear && i.status !== 'REJECTED') ||
    inscriptions.filter((i) => i.studentId === student.id && i.status !== 'REJECTED').sort((a, b) => b.academicYear.localeCompare(a.academicYear))[0];
  const effectiveGroupId = activeInsc ? activeInsc.groupId : student.groupId;
  const group = groups.find((g) => g.id === effectiveGroupId);
  const effectiveFiliereId = activeInsc?.filiereId || group?.filiereId || student.filiereId;
  const filiere = filieres.find((f) => f.id === effectiveFiliereId);
  const effectiveParcoursId = activeInsc?.parcoursId || group?.parcoursId || student.parcoursId;
  const studentParcours = parcours.find((p) => p.id === effectiveParcoursId);
  const effectiveLevel = activeInsc?.level || group?.level || student.currentLevel || 'L1';

  const [reissueReason, setReissueReason] = useState('Carte perdue / endommagée');
  const [showReissueConfirm, setShowReissueConfirm] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const cardToken = student.cardToken || `EBM-CARD-${(student.matricule || '0000').slice(-4)}-V1`;
  const canReissue =
    currentUser.role === 'ADMIN' ||
    currentUser.role === 'SCOLARITE' ||
    currentUser.role === 'SCHEDULER' ||
    currentUser.role === 'ADMIN_STAFF';

  const handleReissue = () => {
    const res = reissueStudentCard(student.id, reissueReason);
    setShowReissueConfirm(false);
    setToast(
      `Nouvelle carte #${res.issueNumber} émise (${res.newToken}). L'ancien code a été révoqué sans modifier le matricule ${student.matricule}.`
    );
  };

  const handlePrintCard = () => {
    const printWin = window.open('', '_blank', 'width=850,height=650');
    if (!printWin) {
      window.print();
      return;
    }
    printWin.document.write(`
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8" />
        <title>Carte Étudiante Officielle - ${escapeHtml(student.matricule)}</title>
        <style>
          body { font-family: 'Inter', Arial, sans-serif; background: #f8fafc; padding: 32px; color: #0f172a; }
          .card { width: 440px; border: 2px solid #1e293b; border-radius: 18px; overflow: hidden; background: #ffffff; box-shadow: 0 10px 25px rgba(0,0,0,0.08); margin: 0 auto; }
          .header { background: linear-gradient(135deg, #0f172a, #1e3a8a); color: #fff; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; }
          .body { padding: 20px; display: flex; gap: 16px; align-items: center; }
          .avatar { width: 84px; height: 84px; border-radius: 12px; object-fit: cover; border: 2px solid #cbd5e1; background: #e2e8f0; }
          .info h2 { margin: 0 0 4px 0; font-size: 18px; }
          .info p { margin: 2px 0; font-size: 12px; color: #334155; }
          .codes { padding: 14px 20px; background: #f1f5f9; border-top: 1px dashed #cbd5e1; display: flex; justify-content: space-between; align-items: center; }
          .barcode { font-family: monospace; letter-spacing: 3px; font-weight: bold; font-size: 13px; text-align: center; }
          .bars { height: 34px; background: repeating-linear-gradient(90deg, #0f172a 0px, #0f172a 2px, transparent 2px, transparent 5px, #0f172a 5px, #0f172a 9px, transparent 9px, transparent 12px); margin-bottom: 4px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <div>
              <div style="font-weight:900;font-size:15px;">EBM INSTITUTE MADAGASCAR</div>
              <div style="font-size:11px;opacity:0.85;">CARTE D'ÉTUDIANT OFFICIELLE • ${escapeHtml(selectedAcademicYear)}</div>
            </div>
            <div style="font-family:monospace;font-size:12px;background:#dc2626;padding:4px 8px;border-radius:6px;font-weight:bold;">
              ÉD. #${escapeHtml(student.cardIssueNumber || 1)}
            </div>
          </div>
          <div class="body">
            <div class="info" style="flex:1;">
              <h2>${escapeHtml(student.name)}</h2>
              <p><strong>Matricule :</strong> ${escapeHtml(student.matricule)}</p>
              <p><strong>Domaine :</strong> ${escapeHtml(filiere?.domaine || 'Sciences & Technologies')}</p>
              <p><strong>Mention :</strong> ${escapeHtml(filiere?.name || 'Non affectée')}</p>
              <p><strong>Parcours / Niveau :</strong> ${escapeHtml(studentParcours?.code || 'Tronc Commun')} • ${escapeHtml(effectiveLevel)} (${escapeHtml(group?.code || 'Sans groupe')})</p>
            </div>
          </div>
          <div class="codes">
            <div style="width:65%;">
              <div class="bars"></div>
              <div class="barcode">${escapeHtml(cardToken)}</div>
            </div>
            <div style="text-align:right;font-family:monospace;font-size:10px;color:#475569;">
              QR TOKEN SÉCURISÉ<br/><strong>${escapeHtml(cardToken)}</strong>
            </div>
          </div>
        </div>
        <script>window.onload = () => { window.print(); };</script>
      </body>
      </html>
    `);
    printWin.document.close();
  };

  // Deterministic pseudo-QR matrix from cardToken
  const tokenChars = cardToken.split('');

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Top Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CreditCard className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-base font-black">
                Carte Étudiante Officielle & Badge QR / Code-Barres
              </h3>
              <p className="text-xs text-slate-400">
                Identification transversale sécurisée sans exposition de données sensibles (ACC-069, ACC-079)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {toast && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{toast}</span>
            </div>
          )}

          {/* Visual Official Student Card */}
          <div className="rounded-2xl border-2 border-slate-800 overflow-hidden shadow-lg bg-gradient-to-br from-white via-slate-50 to-indigo-50/40">
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src="/assets/aistudio/logo_540e8d94.png"
                  alt="EBM Institute"
                  className="h-8 w-auto bg-white px-2 py-1 rounded-lg object-contain"
                />
                <div>
                  <p className="text-xs font-black tracking-wider uppercase">EBM INSTITUTE MADAGASCAR</p>
                  <p className="text-[10px] text-indigo-200 font-semibold">
                    CARTE D’ÉTUDIANT • ANNÉE {selectedAcademicYear}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="px-2.5 py-1 bg-rose-600 text-white rounded-lg font-mono text-xs font-black">
                  ÉDITION #{student.cardIssueNumber || 1}
                </span>
              </div>
            </div>

            <div className="p-5 flex flex-col sm:flex-row items-center gap-5">
              <div className="w-24 h-28 rounded-2xl bg-slate-200 border-2 border-indigo-200 overflow-hidden shrink-0 flex items-center justify-center font-black text-2xl text-slate-600 shadow-inner">
                {student.avatarUrl ? (
                  <img src={student.avatarUrl} alt={student.name} className="w-full h-full object-cover" />
                ) : (
                  student.name.charAt(0)
                )}
              </div>

              <div className="flex-1 space-y-1.5 text-center sm:text-left">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-indigo-900 text-white rounded-md font-mono text-xs font-bold">
                  MATRICULE : {student.matricule}
                </div>
                <h4 className="text-lg font-black text-slate-900">
                  {student.civilite ? `${student.civilite} ` : ''}
                  {student.name}
                </h4>
                <div className="text-xs text-slate-600 space-y-0.5">
                  <p>
                    <span className="font-bold text-slate-800">Domaine :</span>{' '}
                    {filiere?.domaine || 'Sciences et Technologies'}
                  </p>
                  <p>
                    <span className="font-bold text-slate-800">Mention :</span>{' '}
                    {filiere?.name || 'Informatique & Génie Logiciel'}
                  </p>
                  <p>
                    <span className="font-bold text-slate-800">Parcours & Niveau :</span>{' '}
                    {studentParcours?.name || 'Tronc Commun'} •{' '}
                    <span className="font-bold text-indigo-700">
                      {group?.level || 'L1'} ({group?.code || 'L1-INFO'})
                    </span>
                  </p>
                </div>
              </div>

              {/* Simulated SVG QR Code */}
              <div className="p-2.5 bg-white border-2 border-slate-900 rounded-xl flex flex-col items-center shrink-0">
                <div className="grid grid-cols-7 gap-0.5 w-20 h-20 p-1 bg-white">
                  {Array.from({ length: 49 }).map((_, idx) => {
                    const charCode = tokenChars[idx % tokenChars.length]?.charCodeAt(0) || 65;
                    const isCorner =
                      (idx < 21 && (idx % 7 < 3 || idx % 7 > 3)) ||
                      (idx >= 28 && idx % 7 < 3);
                    const filled = isCorner || (charCode + idx) % 2 === 0;
                    return (
                      <div
                        key={idx}
                        className={`w-full h-full rounded-[1px] ${
                          filled ? 'bg-slate-900' : 'bg-slate-100'
                        }`}
                      />
                    );
                  })}
                </div>
                <span className="text-[9px] font-mono font-bold text-slate-600 mt-1">
                  QR SÉCURISÉ
                </span>
              </div>
            </div>

            {/* Bottom Barcode Band */}
            <div className="px-5 py-3 bg-slate-100 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="w-full sm:w-auto flex-1">
                {/* Visual 1D Barcode Bars */}
                <div className="h-8 w-full bg-[repeating-linear-gradient(90deg,#0f172a_0px,#0f172a_2px,transparent_2px,transparent_4px,#0f172a_4px,#0f172a_7px,transparent_7px,transparent_10px,#0f172a_10px,#0f172a_11px,transparent_11px,transparent_14px)] rounded" />
                <p className="text-center font-mono text-xs font-black tracking-widest text-slate-800 mt-1">
                  * {cardToken} *
                </p>
              </div>
              <div className="text-right text-[11px] text-slate-500 shrink-0">
                <p className="font-bold text-emerald-700 flex items-center gap-1 justify-end">
                  <ShieldCheck className="w-3.5 h-3.5" /> Jeton actif vérifié
                </p>
                <p>Émise le : {student.cardIssuedAt || '2026-09-02'}</p>
              </div>
            </div>
          </div>

          {/* Revoked tokens history if any (ACC-078) */}
          {student.revokedCardTokens && student.revokedCardTokens.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
              <p className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Anciens identifiants de carte désactivés (rejetés automatiquement au scan) :
              </p>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {student.revokedCardTokens.map((tok) => (
                  <span
                    key={tok}
                    className="px-2 py-0.5 bg-amber-100 border border-amber-300 rounded font-mono text-[11px] line-through text-amber-800"
                  >
                    {tok}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Reissue Card Confirmation Panel */}
          {showReissueConfirm && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-3">
              <p className="text-xs font-bold text-rose-900">
                Rééditer une nouvelle carte étudiante (ACC-078) : l’ancien code ({cardToken}) sera immédiatement désactivé, mais le matricule universitaire ({student.matricule}) restera strictement inchangé.
              </p>
              <input
                type="text"
                value={reissueReason}
                onChange={(e) => setReissueReason(e.target.value)}
                placeholder="Motif de réédition (ex: Perte de carte, carte détériorée)..."
                className="w-full px-3 py-2 bg-white border border-rose-300 rounded-xl text-xs font-medium"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowReissueConfirm(false)}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-600"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleReissue}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold"
                >
                  Confirmer la réédition & révoquer l’ancienne carte
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
            {canReissue ? (
              <button
                type="button"
                onClick={() => setShowReissueConfirm(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl text-xs font-bold transition"
              >
                <RefreshCw className="w-4 h-4" />
                Rééditer la carte (Perte / Vol)
              </button>
            ) : (
              <span className="text-xs text-slate-400">
                En cas de perte, contactez le Service Scolarité EBM.
              </span>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrintCard}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
              >
                <Printer className="w-4 h-4" />
                Imprimer / Télécharger PDF
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
