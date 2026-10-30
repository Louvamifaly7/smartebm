import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { User } from '../types';
import {
  Search,
  Barcode,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  X,
  Camera,
  ChevronDown,
  GraduationCap,
  ShieldCheck,
} from 'lucide-react';

interface UniversalStudentSelectorProps {
  selectedStudentId: string;
  onSelectStudent: (studentId: string, student?: User) => void;
  label?: string;
  placeholder?: string;
  filterGroupId?: string;
  onlyActive?: boolean;
  compact?: boolean;
  showIdentityBanner?: boolean;
}

export const UniversalStudentSelector: React.FC<UniversalStudentSelectorProps> = ({
  selectedStudentId,
  onSelectStudent,
  label = 'Identification de l’étudiant (Matricule, Nom, Prénom, Code-barres ou QR Code)',
  placeholder = 'Saisir matricule (ex: EBM-2026-0042), nom, prénom ou scanner...',
  filterGroupId,
  onlyActive = false,
  compact = false,
  showIdentityBanner = true,
}) => {
  const { users, groups, filieres, parcours, findStudentByScanCode } = useApp();

  const students = users.filter(
    (u) =>
      u.role === 'STUDENT' &&
      (!onlyActive || u.isActive) &&
      (!filterGroupId || filterGroupId === 'ALL' || u.groupId === filterGroupId)
  );

  const selectedStudent = users.find((u) => u.id === selectedStudentId && u.role === 'STUDENT');
  const selectedGroup = groups.find((g) => g.id === selectedStudent?.groupId);
  const selectedFiliere = filieres.find((f) => f.id === selectedGroup?.filiereId);
  const selectedParcours = parcours.find((p) => p.id === selectedStudent?.parcoursId);

  const [query, setQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [scanMode, setScanMode] = useState<'NONE' | 'BARCODE' | 'QR'>('NONE');
  const [scanInput, setScanInput] = useState('');
  const [scanFeedback, setScanFeedback] = useState<{
    type: 'SUCCESS' | 'ERROR' | 'REVOKED';
    message: string;
  } | null>(null);

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scanMode === 'BARCODE' && barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, [scanMode]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredStudents = students.filter((st) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase().trim();
    return (
      (st.matricule || '').toLowerCase().includes(q) ||
      st.name.toLowerCase().includes(q) ||
      (st.lastName || '').toLowerCase().includes(q) ||
      (st.firstName || '').toLowerCase().includes(q) ||
      (st.cardToken || '').toLowerCase().includes(q) ||
      st.email.toLowerCase().includes(q)
    );
  });

  const handleChooseStudent = (st: User) => {
    onSelectStudent(st.id, st);
    setQuery(`${st.matricule || st.username} — ${st.name}`);
    setIsDropdownOpen(false);
    setScanFeedback({
      type: 'SUCCESS',
      message: `Étudiant sélectionné : ${st.name} (${st.matricule})`,
    });
  };

  const handleExecuteScan = (codeToProcess: string) => {
    const result = findStudentByScanCode(codeToProcess);
    if (result.status === 'FOUND' && result.student) {
      onSelectStudent(result.student.id, result.student);
      setQuery(`${result.student.matricule} — ${result.student.name}`);
      setScanFeedback({
        type: 'SUCCESS',
        message: result.message,
      });
      setScanInput('');
      if (scanMode === 'QR') {
        setTimeout(() => setScanMode('NONE'), 700);
      }
    } else if (result.status === 'REVOKED') {
      setScanFeedback({
        type: 'REVOKED',
        message: result.message,
      });
    } else {
      setScanFeedback({
        type: 'ERROR',
        message: result.message,
      });
    }
  };

  return (
    <div ref={wrapperRef} className="space-y-2.5">
      {label && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            {label}
          </label>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setScanMode(scanMode === 'BARCODE' ? 'NONE' : 'BARCODE');
                setScanFeedback(null);
              }}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition border ${
                scanMode === 'BARCODE'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
              }`}
              title="Activer le lecteur code-barres USB / Bluetooth (Keyboard Wedge)"
            >
              <Barcode className="w-3.5 h-3.5" />
              Lecteur Code-Barres
            </button>
            <button
              type="button"
              onClick={() => {
                setScanMode(scanMode === 'QR' ? 'NONE' : 'QR');
                setScanFeedback(null);
              }}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition border ${
                scanMode === 'QR'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              }`}
              title="Scanner le QR Code de la carte étudiante"
            >
              <QrCode className="w-3.5 h-3.5" />
              Scanner QR Carte
            </button>
          </div>
        </div>
      )}

      {/* Search + Integrated Selectable List Input */}
      <div className="relative">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1 min-w-0">
            <Search className="w-5 h-5 text-indigo-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onFocus={() => setIsDropdownOpen(true)}
              onChange={(e) => {
                const val = e.target.value;
                setQuery(val);
                setIsDropdownOpen(true);
                setScanFeedback(null);

                // Direct exact match auto-selection (matricule or cardToken)
                const clean = val.trim().toUpperCase();
                const exact = students.find(
                  (s) =>
                    s.matricule?.toUpperCase() === clean ||
                    s.cardToken?.toUpperCase() === clean
                );
                if (exact) {
                  onSelectStudent(exact.id, exact);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && query.trim()) {
                  e.preventDefault();
                  // Check if it's a barcode/QR token or matricule
                  const scanRes = findStudentByScanCode(query.trim());
                  if (scanRes.status === 'FOUND' && scanRes.student) {
                    handleChooseStudent(scanRes.student);
                  } else if (scanRes.status === 'REVOKED') {
                    setScanFeedback({ type: 'REVOKED', message: scanRes.message });
                  } else if (filteredStudents.length === 1) {
                    handleChooseStudent(filteredStudents[0]);
                  } else {
                    setScanFeedback({ type: 'ERROR', message: scanRes.message });
                  }
                }
              }}
              placeholder={placeholder}
              className={`w-full pl-11 pr-10 ${
                compact ? 'py-2.5 text-xs sm:text-sm' : 'py-3.5 text-sm sm:text-base'
              } bg-slate-50 border-2 border-slate-300 rounded-xl font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition shadow-2xs`}
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setScanFeedback(null);
                  setIsDropdownOpen(true);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Direct Dropdown Select fallback */}
          <div className="relative sm:w-64 shrink-0">
            <select
              value={selectedStudentId}
              onChange={(e) => {
                const id = e.target.value;
                const st = users.find((u) => u.id === id);
                onSelectStudent(id, st);
                if (st) {
                  setQuery(`${st.matricule || st.username} — ${st.name}`);
                  setScanFeedback(null);
                } else {
                  setQuery('');
                }
              }}
              className={`w-full pl-3.5 pr-9 ${
                compact ? 'py-2.5 text-xs' : 'py-3.5 text-xs sm:text-sm'
              } bg-white border-2 border-slate-300 rounded-xl font-bold text-slate-700 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none appearance-none cursor-pointer`}
            >
              <option value="">-- Liste rapide ({students.length} étudiants) --</option>
              {students.map((st) => {
                const grp = groups.find((g) => g.id === st.groupId);
                return (
                  <option key={st.id} value={st.id}>
                    {st.matricule} — {st.name} ({grp?.code || 'L1'})
                  </option>
                );
              })}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Autocomplete Dropdown Menu */}
        {isDropdownOpen && (
          <div className="absolute z-40 mt-1.5 w-full bg-white border border-slate-200 rounded-2xl shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100">
            {filteredStudents.length === 0 ? (
              <div className="p-3.5 text-center text-xs text-slate-500">
                Aucun étudiant trouvé pour « {query} ». Essayez par matricule, nom, prénom ou lecteur code-barres.
              </div>
            ) : (
              filteredStudents.map((st) => {
                const grp = groups.find((g) => g.id === st.groupId);
                const fil = filieres.find((f) => f.id === grp?.filiereId);
                const isSelected = st.id === selectedStudentId;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => handleChooseStudent(st)}
                    className={`w-full px-3.5 py-2.5 text-left flex items-center justify-between hover:bg-indigo-50/70 transition ${
                      isSelected ? 'bg-indigo-50/90' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="px-2 py-0.5 bg-slate-900 text-white rounded font-mono text-[11px] font-bold shrink-0">
                        {st.matricule || st.username}
                      </span>
                      <div className="truncate">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {st.name}
                          {!st.isActive && (
                            <span className="ml-1.5 text-[10px] px-1.5 py-0.5 bg-red-100 text-red-700 rounded font-bold">
                              Inactif
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {fil?.name || 'Informatique'} • Groupe {grp?.code || 'N/A'} • Carte: {st.cardToken || 'Standard'}
                        </p>
                      </div>
                    </div>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* USB / Bluetooth Barcode Scanner Mode (Keyboard Wedge) */}
      {scanMode === 'BARCODE' && (
        <div className="p-3.5 bg-indigo-950 text-white rounded-2xl border border-indigo-700 space-y-2.5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Barcode className="w-5 h-5 text-indigo-300 animate-pulse" />
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-indigo-200">
                  Mode Douchette Code-Barres USB / Bluetooth (Keyboard Wedge)
                </p>
                <p className="text-[11px] text-indigo-300">
                  Scannez la carte étudiante ou appuyez sur Entrée après lecture optique.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setScanMode('NONE')}
              className="text-indigo-300 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-2">
            <input
              ref={barcodeInputRef}
              type="text"
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleExecuteScan(scanInput);
                }
              }}
              placeholder="Flux douchette USB (ex: EBM-CARD-0042-V1 ou EBM-2026-0042)..."
              className="flex-1 px-3 py-2 bg-indigo-900/80 border border-indigo-500 rounded-xl text-xs font-mono text-white placeholder-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <button
              type="button"
              onClick={() => handleExecuteScan(scanInput)}
              className="px-3.5 py-2 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl text-xs font-bold transition"
            >
              Valider Scan
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] text-indigo-300 font-semibold">Simulation rapide :</span>
            {students.slice(0, 3).map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => handleExecuteScan(st.cardToken || st.matricule || '')}
                className="px-2 py-0.5 bg-indigo-800 hover:bg-indigo-700 text-indigo-100 rounded text-[10px] font-mono transition"
              >
                {st.cardToken || st.matricule} ({st.name.split(' ')[0]})
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleExecuteScan('EBM-CARD-0042-OLD')}
              className="px-2 py-0.5 bg-amber-800/80 hover:bg-amber-700 text-amber-100 rounded text-[10px] font-mono transition"
              title="Tester le rejet d'une ancienne carte perdue/révoquée (ACC-078)"
            >
              Carte perdue (EBM-CARD-0042-OLD)
            </button>
            <button
              type="button"
              onClick={() => handleExecuteScan('CODE-INCONNU-999')}
              className="px-2 py-0.5 bg-rose-800/80 hover:bg-rose-700 text-rose-100 rounded text-[10px] font-mono transition"
              title="Tester le rejet d'un code inconnu (ACC-077)"
            >
              Code inconnu
            </button>
          </div>
        </div>
      )}

      {/* Camera / QR Code Scanner Mode */}
      {scanMode === 'QR' && (
        <div className="p-3.5 bg-slate-900 text-white rounded-2xl border border-emerald-600/60 space-y-2.5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-emerald-300">
                  Scanner QR Code Carte Étudiante (Caméra Web / Mobile)
                </p>
                <p className="text-[11px] text-slate-300">
                  Présentez le QR Code sécurisé de la carte devant l’objectif ou sélectionnez un badge détecté.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setScanMode('NONE')}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
            {students.slice(0, 3).map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => handleExecuteScan(st.cardToken || st.matricule || '')}
                className="p-2.5 bg-slate-800 hover:bg-emerald-950/80 border border-slate-700 hover:border-emerald-500 rounded-xl text-left transition flex items-center gap-2.5"
              >
                <QrCode className="w-6 h-6 text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">{st.name}</p>
                  <p className="text-[10px] font-mono text-emerald-300 truncate">
                    {st.cardToken || st.matricule}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Scan feedback message (ACC-077, ACC-078) */}
      {scanFeedback && (
        <div
          className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center justify-between gap-2 ${
            scanFeedback.type === 'SUCCESS'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : scanFeedback.type === 'REVOKED'
              ? 'bg-amber-50 border-amber-300 text-amber-900'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {scanFeedback.type === 'SUCCESS' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{scanFeedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setScanFeedback(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Selected Student Essential Verification Card (ACC-008 & ACC-016) */}
      {showIdentityBanner && selectedStudent && (
        <div className="p-3 bg-gradient-to-r from-indigo-50/90 via-white to-slate-50 border border-indigo-200/80 rounded-2xl flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shrink-0 overflow-hidden">
              {selectedStudent.avatarUrl ? (
                <img
                  src={selectedStudent.avatarUrl}
                  alt={selectedStudent.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                selectedStudent.name.charAt(0)
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 bg-indigo-900 text-white rounded text-[11px] font-mono font-bold">
                  {selectedStudent.matricule}
                </span>
                <span className="text-sm font-black text-slate-900">
                  {selectedStudent.civilite ? `${selectedStudent.civilite} ` : ''}
                  {selectedStudent.lastName && selectedStudent.firstName
                    ? `${selectedStudent.lastName.toUpperCase()} ${selectedStudent.firstName}`
                    : selectedStudent.name}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold">
                  <UserCheck className="w-3 h-3" /> Identité vérifiée
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 mt-0.5">
                <span className="inline-flex items-center gap-1 font-semibold text-indigo-900">
                  <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                  {selectedFiliere?.domaine ? `${selectedFiliere.domaine} • ` : ''}
                  {selectedFiliere?.name || 'Formation LMD'}
                </span>
                <span>
                  Niveau : <strong>{selectedGroup?.level || 'L1'}</strong> ({selectedGroup?.code || 'N/A'})
                </span>
                {selectedParcours && (
                  <span>
                    Parcours : <strong>{selectedParcours.code}</strong>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px]">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 rounded-lg font-mono text-slate-700">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Carte : {selectedStudent.cardToken || 'EBM-CARD-V1'} (Éd. #{selectedStudent.cardIssueNumber || 1})
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
