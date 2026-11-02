import React, { useState, useRef } from 'react';
import {
  X,
  Check,
  Upload,
  Download,
  FileSpreadsheet,
  AlertTriangle,
  FileCheck,
  CheckCircle2,
  HelpCircle,
  FileText,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Course } from '../../types';

interface CourseImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  filteredCourses?: Course[];
  onImportCompleted?: () => void;
}

interface ParsedRow {
  index: number;
  code: string;
  title: string;
  filiereCode: string;
  level: string;
  semester: string;
  courseType: string;
  teacherEmail: string;
  groupCodes: string[];
  totalHours: number;
  ueCode: string;
  description: string;
  status: 'VALID' | 'WARNING' | 'ERROR';
  issues: string[];
  coursePayload?: Omit<Course, 'id'>;
}

export const CourseImportExportModal: React.FC<CourseImportExportModalProps> = ({
  isOpen,
  onClose,
  filteredCourses,
  onImportCompleted,
}) => {
  const {
    courses,
    addCourse,
    filieres,
    groups,
    users,
    ues,
    selectedAcademicYear,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'IMPORT' | 'EXPORT'>('IMPORT');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importSummary, setImportSummary] = useState<{ success: number; skipped: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const teachers = users.filter((u) => u.role === 'TEACHER');

  if (!isOpen) return null;

  // 1. Download CSV template
  const handleDownloadTemplate = () => {
    const headers = [
      'CODE',
      'TITRE',
      'FILIERE_CODE',
      'NIVEAU',
      'SEMESTRE',
      'TYPE',
      'ENSEIGNANT_EMAIL',
      'GROUPES_CODES',
      'VOLUME_HORAIRE',
      'UE_CODE',
      'DESCRIPTION',
    ].join(';');

    const sampleRows = [
      'INF-101;Algorithmique & Structures de Données;INFO;L1;S1;CM;prof.dupont@ebm.edu;G1A2627,L1-INFO-A;30;UE-INFO-101;Fondements de la programmation impérative et structures de données',
      'INF-102;Bases de Données Relationnelles & SQL;INFO;L1;S1;TD;prof.martin@ebm.edu;G1A2627;25;UE-INFO-101;Modélisation Entité-Association et requêtes SQL',
      'DRO-101;Introduction générale au Droit Privé;DTA;L1;S1;CM;prof.rakoto@ebm.edu;D1A2627;30;;Notions fondamentales de droit civil et des obligations',
    ].join('\n');

    const csvContent = `\uFEFF${headers}\n${sampleRows}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'modele_import_cours_ebm.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 2. Parse CSV file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setImportSummary(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length < 2) {
          setParsedRows([]);
          setIsProcessing(false);
          return;
        }

        // Determine delimiter (, or ;)
        const delimiter = lines[0].includes(';') ? ';' : ',';
        const rowsToParse = lines.slice(1);
        const results: ParsedRow[] = [];

        rowsToParse.forEach((line, idx) => {
          const cols = line.split(delimiter).map((c) => c.trim().replace(/^"|"$/g, ''));
          if (cols.length < 2 || !cols[0]) return;

          const rowCode = cols[0].toUpperCase();
          const rowTitle = cols[1];
          const rowFiliereCode = cols[2]?.toUpperCase() || '';
          const rowLevel = cols[3]?.toUpperCase() || 'L1';
          const rowSemester = cols[4]?.toUpperCase() || 'S1';
          const rowType = cols[5]?.toUpperCase() || 'CM';
          const rowTeacherEmail = cols[6]?.toLowerCase() || '';
          const rowGroupCodes = cols[7] ? cols[7].split(',').map((g) => g.trim().toUpperCase()) : [];
          const rowHours = Number(cols[8]) || 30;
          const rowUeCode = cols[9]?.toUpperCase() || '';
          const rowDesc = cols[10] || '';

          const issues: string[] = [];
          let status: 'VALID' | 'WARNING' | 'ERROR' = 'VALID';

          if (!rowCode) {
            issues.push('Code cours manquant');
            status = 'ERROR';
          }
          if (!rowTitle) {
            issues.push('Intitulé de la matière manquant');
            status = 'ERROR';
          }

          // Check duplicate in current database
          const existsInDb = courses.some((c) => c.code.toUpperCase() === rowCode);
          if (existsInDb) {
            issues.push(`Le code ${rowCode} existe déjà dans la base (sera ignoré ou mis à jour)`);
            status = 'WARNING';
          }

          // Resolve Filiere
          const matchingFiliere = filieres.find(
            (f) => f.code.toUpperCase() === rowFiliereCode || f.id === rowFiliereCode
          );
          const filiereId = matchingFiliere?.id || filieres[0]?.id || 'fil-1';
          if (!matchingFiliere && rowFiliereCode) {
            issues.push(`Filière "${rowFiliereCode}" non reconnue, filière par défaut assignée`);
            if (status !== 'ERROR') status = 'WARNING';
          }

          // Resolve Teacher
          const matchingTeacher = teachers.find(
            (t) => t.email.toLowerCase() === rowTeacherEmail || t.name.toLowerCase().includes(rowTeacherEmail)
          );
          const teacherIds = matchingTeacher ? [matchingTeacher.id] : [];
          if (!matchingTeacher && rowTeacherEmail) {
            issues.push(`Enseignant "${rowTeacherEmail}" introuvable`);
            if (status !== 'ERROR') status = 'WARNING';
          }

          // Resolve Groups
          const targetGroupIds: string[] = [];
          rowGroupCodes.forEach((gCode) => {
            const grp = groups.find((g) => g.code.toUpperCase() === gCode);
            if (grp) targetGroupIds.push(grp.id);
            else {
              issues.push(`Groupe "${gCode}" introuvable`);
              if (status !== 'ERROR') status = 'WARNING';
            }
          });

          // Resolve UE
          const matchingUe = ues.find((u) => u.code.toUpperCase() === rowUeCode);

          const coursePayload: Omit<Course, 'id'> = {
            code: rowCode,
            title: rowTitle,
            description: rowDesc || undefined,
            filiereId,
            level: ['L1', 'L2', 'L3', 'M1', 'M2'].includes(rowLevel) ? rowLevel : 'L1',
            semester: rowSemester,
            courseType: ['CM', 'TD', 'TP', 'AUTRE'].includes(rowType) ? rowType : 'CM',
            teacherIds,
            groupIds: targetGroupIds.length > 0 ? targetGroupIds : groups[0] ? [groups[0].id] : [],
            totalHours: rowHours,
            defaultSessionDuration: 2,
            color: '#2563eb',
            academicYear: selectedAcademicYear || '2026-2027',
            ueId: matchingUe?.id,
            status: 'ACTIVE',
          };

          results.push({
            index: idx + 2,
            code: rowCode,
            title: rowTitle,
            filiereCode: rowFiliereCode,
            level: rowLevel,
            semester: rowSemester,
            courseType: rowType,
            teacherEmail: rowTeacherEmail,
            groupCodes: rowGroupCodes,
            totalHours: rowHours,
            ueCode: rowUeCode,
            description: rowDesc,
            status,
            issues,
            coursePayload,
          });
        });

        setParsedRows(results);
      } catch (err) {
        console.error('Erreur parsing CSV:', err);
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsText(file);
  };

  // 3. Confirm and import valid rows
  const handleConfirmImport = () => {
    let successCount = 0;
    let skippedCount = 0;

    parsedRows.forEach((row) => {
      if (row.status === 'ERROR') {
        skippedCount++;
        return;
      }
      if (courses.some((c) => c.code.toUpperCase() === row.code)) {
        skippedCount++;
        return;
      }
      if (row.coursePayload) {
        addCourse(row.coursePayload);
        successCount++;
      }
    });

    setImportSummary({ success: successCount, skipped: skippedCount });
    onImportCompleted?.();
  };

  // 4. Export current or filtered courses
  const handleExportCourses = () => {
    const listToExport = filteredCourses && filteredCourses.length > 0 ? filteredCourses : courses;

    const headers = [
      'CODE',
      'TITRE',
      'FILIERE',
      'NIVEAU',
      'SEMESTRE',
      'TYPE',
      'ENSEIGNANT',
      'GROUPES',
      'VOLUME_HORAIRE',
      'UE_RATTACHEE',
      'STATUT',
      'DESCRIPTION',
    ].join(';');

    const rows = listToExport.map((c) => {
      const filiereName = filieres.find((f) => f.id === c.filiereId)?.code || '';
      const teacherNames = (c.teacherIds || [])
        .map((tid) => teachers.find((t) => t.id === tid)?.name || '')
        .filter(Boolean)
        .join(', ');
      const groupCodes = (c.groupIds || [])
        .map((gid) => groups.find((g) => g.id === gid)?.code || '')
        .filter(Boolean)
        .join(', ');
      const ueCode = ues.find((u) => u.id === c.ueId)?.code || '';

      return [
        `"${c.code}"`,
        `"${c.title.replace(/"/g, '""')}"`,
        `"${filiereName}"`,
        `"${c.level}"`,
        `"${c.semester || 'S1'}"`,
        `"${c.courseType || 'CM'}"`,
        `"${teacherNames}"`,
        `"${groupCodes}"`,
        c.totalHours || 30,
        `"${ueCode}"`,
        `"${c.status || 'ACTIVE'}"`,
        `"${(c.description || '').replace(/"/g, '""')}"`,
      ].join(';');
    });

    const csvData = `\uFEFF${headers}\n${rows.join('\n')}`;
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `export_cours_ebm_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const validCount = parsedRows.filter((r) => r.status === 'VALID').length;
  const warningCount = parsedRows.filter((r) => r.status === 'WARNING').length;
  const errorCount = parsedRows.filter((r) => r.status === 'ERROR').length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 rounded-2xl text-white shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                Importation & Exportation Excel / CSV des Cours
              </h3>
              <p className="text-xs text-slate-300">
                Créez des dizaines de cours en quelques secondes ou exportez l'annuaire complet avec filtres.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('IMPORT')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'IMPORT'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Importer des cours (Fichier CSV)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('EXPORT')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'EXPORT'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Exporter les cours ({filteredCourses?.length ?? courses.length})</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 text-xs space-y-4">
          {activeTab === 'IMPORT' && (
            <div className="space-y-4 animate-in fade-in">
              {/* Actions & Template download */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-blue-50/70 border border-blue-200 rounded-2xl">
                <div>
                  <h4 className="font-bold text-blue-950 text-xs">
                    Modèle officiel d'importation des cours
                  </h4>
                  <p className="text-blue-800 text-[11px] mt-0.5">
                    Utilisez le fichier CSV modèle préconfiguré pour garantir la conformité des colonnes et des codes.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-xs flex-shrink-0 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Télécharger le Modèle CSV
                </button>
              </div>

              {/* Upload Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-6 text-center bg-slate-50/50 hover:bg-blue-50/30 cursor-pointer transition-colors"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".csv,text/csv"
                  className="hidden"
                />
                <Upload className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <h4 className="font-bold text-slate-800 text-sm">
                  Cliquez ou glissez-déposez votre fichier CSV ici
                </h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  Format encodé en UTF-8 (séparateur point-virgule ou virgule)
                </p>
              </div>

              {/* Summary of Parsed Results */}
              {parsedRows.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-100 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-800">
                        {parsedRows.length} lignes analysées :
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                        {validCount} valides
                      </span>
                      {warningCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                          {warningCount} alertes
                        </span>
                      )}
                      {errorCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-bold text-[10px]">
                          {errorCount} rejets
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Preview Table */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-56 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0">
                        <tr>
                          <th className="p-2">Ligne</th>
                          <th className="p-2">Statut</th>
                          <th className="p-2">Code</th>
                          <th className="p-2">Intitulé</th>
                          <th className="p-2">Filière</th>
                          <th className="p-2">Niveau</th>
                          <th className="p-2">Remarques / Anomalies</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedRows.map((r) => (
                          <tr key={r.index} className="hover:bg-slate-50">
                            <td className="p-2 text-slate-400 font-mono text-[10px]">#{r.index}</td>
                            <td className="p-2">
                              {r.status === 'VALID' ? (
                                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold text-[10px]">
                                  Valide
                                </span>
                              ) : r.status === 'WARNING' ? (
                                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 font-bold text-[10px]">
                                  Avertissement
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 font-bold text-[10px]">
                                  Erreur
                                </span>
                              )}
                            </td>
                            <td className="p-2 font-mono font-bold text-slate-800">{r.code}</td>
                            <td className="p-2 font-medium text-slate-800 truncate max-w-xs">{r.title}</td>
                            <td className="p-2 text-slate-600">{r.filiereCode}</td>
                            <td className="p-2 text-slate-600">{r.level}</td>
                            <td className="p-2 text-[11px] text-slate-500">
                              {r.issues.length > 0 ? r.issues.join(' • ') : 'Conforme'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Import completed banner */}
              {importSummary && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <div>
                    <h4 className="font-bold text-emerald-950 text-sm">
                      Importation terminée avec succès !
                    </h4>
                    <p className="text-emerald-800 text-xs">
                      {importSummary.success} cours ajoutés à la base. {importSummary.skipped} ligne(s) ignorée(s) (doublons ou erreurs).
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'EXPORT' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <h4 className="font-bold text-slate-900 text-sm">
                  Exportation au format CSV standard
                </h4>
                <p className="text-slate-600 text-xs">
                  Le fichier téléchargé inclura tous les champs pédagogiques : code, intitulé, filière, niveau, semestre, type d'enseignement, enseignants responsables, groupes affectés, volume horaire et statut.
                </p>

                <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span className="font-semibold text-slate-800">
                      Cours prêts à être exportés :
                    </span>
                  </div>
                  <span className="font-bold text-blue-600 text-sm">
                    {filteredCourses?.length ?? courses.length} cours
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleExportCourses}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Télécharger le fichier CSV complet
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 hover:bg-slate-100 rounded-xl text-slate-700 font-bold text-xs transition-colors"
          >
            Fermer
          </button>

          {activeTab === 'IMPORT' && parsedRows.length > 0 && !importSummary && (
            <button
              type="button"
              onClick={handleConfirmImport}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Importer les {validCount + warningCount} cours valides</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
