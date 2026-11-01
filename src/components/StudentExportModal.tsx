import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Download, ShieldCheck, FileSpreadsheet, X, CheckCircle2 } from 'lucide-react';
import { downloadCsvFile } from '../utils/csvExport';

interface StudentExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StudentExportModal: React.FC<StudentExportModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, groups, getSelectiveStudentExportData } = useApp();
  const [selectedGroupId, setSelectedGroupId] = useState<string>('ALL');
  const [downloadSuccessNotice, setDownloadSuccessNotice] = useState<boolean>(false);

  if (!isOpen) return null;

  const isTeacher = currentUser.role === 'TEACHER';
  const exportRole: 'TEACHER' | 'ADMIN' = isTeacher ? 'TEACHER' : 'ADMIN';

  const exportData = getSelectiveStudentExportData(
    exportRole,
    selectedGroupId === 'ALL' ? undefined : selectedGroupId
  );

  const handleDownloadCsv = () => {
    const groupSuffix =
      selectedGroupId === 'ALL'
        ? 'Tous_Groupes'
        : groups.find((g) => g.id === selectedGroupId)?.code || selectedGroupId;
    const fileName = isTeacher
      ? `EBM_Liste_Etudiants_Pedagogique_${groupSuffix}`
      : `EBM_Export_Etudiants_${groupSuffix}`;

    downloadCsvFile(fileName, exportData.headers, exportData.rows);

    setDownloadSuccessNotice(true);
    setTimeout(() => setDownloadSuccessNotice(false), 3000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col justify-between">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-800">Export Sélectif des Étudiants</h2>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isTeacher
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                  }`}
                >
                  {isTeacher ? 'Profil Enseignant (RGPD / Données restreintes)' : 'Profil Direction (Export Complet)'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isTeacher
                  ? 'Pour respecter la confidentialité des étudiants, les numéros de téléphone et adresses personnelles sont masqués.'
                  : 'Export administratif incluant contacts, matricules et soldes financiers en Ariary.'}
              </p>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Group Filter */}
        <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-bold text-slate-600 uppercase">Filtrer par Groupe :</span>
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 font-semibold outline-none"
            >
              <option value="ALL">Tous les groupes ({exportData.rows.length} étudiants)</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.code} ({g.name})
                </option>
              ))}
            </select>
          </div>

          <span className="text-[11px] text-slate-500 font-mono">
            {exportData.rows.length} enregistrements trouvés
          </span>
        </div>

        {/* Preview Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-2xl flex-1 max-h-72">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
              <tr>
                {exportData.headers.map((h, idx) => (
                  <th key={idx} className="py-2.5 px-3 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {exportData.rows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-slate-50">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="py-2 px-3 whitespace-nowrap text-slate-700">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Download Success Notice */}
        {downloadSuccessNotice && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Fichier CSV généré et téléchargé avec succès !</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Format compatible Microsoft Excel (.csv UTF-8 point-virgule)</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Fermer
            </button>
            <button
              onClick={handleDownloadCsv}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all cursor-pointer active:scale-95"
            >
              <Download className="w-4 h-4" />
              Télécharger l'Export CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
