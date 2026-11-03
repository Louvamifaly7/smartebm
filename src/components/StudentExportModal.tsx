import React from 'react';
import { FileSpreadsheet, X } from 'lucide-react';
import { StudentCustomListsExporter } from './StudentCustomListsExporter';

interface StudentExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StudentExportModal: React.FC<StudentExportModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-50 rounded-3xl max-w-6xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 bg-white px-5 py-4 rounded-2xl shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#17345B] text-white flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-[#17345B]">
                Générateur de Listes Personnalisées & Exportations Officielles
              </h2>
              <p className="text-xs text-slate-500">
                Filtres multicritères, colonnes réorganisables, modèles enregistrés et exports Excel, CSV UTF-8 et PDF Officiel EBM.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 pr-1">
          <StudentCustomListsExporter />
        </div>
      </div>
    </div>
  );
};

