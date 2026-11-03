import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { User, StudentInscription } from '../types';
import { computeStudentDossierCompleteness } from './StudentProfileForm';
import { escapeHtml } from '../utils/securityAndDateUtils';
import { showAppToast } from './ToastAndConfirmCenter';
import {
  FileSpreadsheet,
  Download,
  Printer,
  FileText,
  Search,
  SlidersHorizontal,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  CheckSquare,
  Square,
  Bookmark,
  Plus,
  Trash2,
  RotateCcw,
  ShieldCheck,
  Eye,
} from 'lucide-react';

export type ExportColumnId =
  | 'matricule'
  | 'lastName'
  | 'firstName'
  | 'gender'
  | 'birthDate'
  | 'birthPlace'
  | 'cin'
  | 'phone'
  | 'email'
  | 'address'
  | 'guardian'
  | 'filiere'
  | 'parcours'
  | 'level'
  | 'group'
  | 'academicYear'
  | 'inscriptionType'
  | 'status'
  | 'inscriptionDate';

interface ColumnDef {
  id: ExportColumnId;
  label: string;
  restrictedForTeacher?: boolean;
}

export const ALL_EXPORT_COLUMNS: ColumnDef[] = [
  { id: 'matricule', label: 'Matricule' },
  { id: 'lastName', label: 'Nom' },
  { id: 'firstName', label: 'Prénom(s)' },
  { id: 'gender', label: 'Sexe' },
  { id: 'birthDate', label: 'Date de naissance', restrictedForTeacher: true },
  { id: 'birthPlace', label: 'Lieu de naissance', restrictedForTeacher: true },
  { id: 'cin', label: 'CIN', restrictedForTeacher: true },
  { id: 'phone', label: 'Téléphone', restrictedForTeacher: true },
  { id: 'email', label: 'Email' },
  { id: 'address', label: 'Adresse', restrictedForTeacher: true },
  { id: 'guardian', label: 'Responsable / Parent', restrictedForTeacher: true },
  { id: 'filiere', label: 'Filière' },
  { id: 'parcours', label: 'Parcours' },
  { id: 'level', label: 'Niveau' },
  { id: 'group', label: 'Groupe' },
  { id: 'academicYear', label: 'Année académique' },
  { id: 'inscriptionType', label: 'Type d’inscription' },
  { id: 'status', label: 'Statut' },
  { id: 'inscriptionDate', label: 'Date d’inscription' },
];

export interface SavedListTemplate {
  id: string;
  name: string;
  description: string;
  isBuiltIn?: boolean;
  columns: ExportColumnId[];
  presetFilters?: {
    assignmentStatus?: 'ALL' | 'ASSIGNED' | 'UNASSIGNED';
    dossierStatus?: 'ALL' | 'COMPLETE' | 'INCOMPLETE';
    enrollmentStatus?: string;
  };
  includeAttendanceSignatureCol?: boolean;
}

const BUILTIN_TEMPLATES: SavedListTemplate[] = [
  {
    id: 'tpl-presence',
    name: 'Liste officielle de présence',
    description: 'Matricule, Nom, Prénom(s), Niveau, Groupe avec colonne d’émargement PDF/Impression',
    isBuiltIn: true,
    columns: ['matricule', 'lastName', 'firstName', 'filiere', 'level', 'group'],
    presetFilters: { enrollmentStatus: 'CONFIRMED' },
    includeAttendanceSignatureCol: true,
  },
  {
    id: 'tpl-admin-contacts',
    name: 'Liste administrative avec contacts',
    description: 'Coordonnées complètes (CIN, Téléphone, Email, Adresse, Responsable légal)',
    isBuiltIn: true,
    columns: [
      'matricule',
      'lastName',
      'firstName',
      'cin',
      'phone',
      'email',
      'address',
      'guardian',
      'filiere',
      'level',
      'group',
    ],
  },
  {
    id: 'tpl-pedagogique',
    name: 'Liste pédagogique pour enseignants',
    description: 'Liste conforme RGPD sans coordonnées privées sensibles',
    isBuiltIn: true,
    columns: ['matricule', 'lastName', 'firstName', 'email', 'filiere', 'parcours', 'level', 'group', 'status'],
    presetFilters: { enrollmentStatus: 'CONFIRMED' },
  },
  {
    id: 'tpl-sans-groupe',
    name: 'Liste des étudiants sans groupe',
    description: 'Étudiants inscrits pour l’année mais en attente d’affectation à un groupe',
    isBuiltIn: true,
    columns: [
      'matricule',
      'lastName',
      'firstName',
      'filiere',
      'parcours',
      'level',
      'inscriptionType',
      'status',
      'inscriptionDate',
    ],
    presetFilters: { assignmentStatus: 'UNASSIGNED' },
  },
  {
    id: 'tpl-promotion',
    name: 'Liste des étudiants par promotion',
    description: 'Synthèse académique complète par année, mention, parcours et niveau',
    isBuiltIn: true,
    columns: [
      'matricule',
      'lastName',
      'firstName',
      'gender',
      'birthDate',
      'filiere',
      'parcours',
      'level',
      'group',
      'academicYear',
      'inscriptionType',
    ],
  },
  {
    id: 'tpl-dossiers-incomplets',
    name: 'Liste des dossiers incomplets',
    description: 'Étudiants ayant des pièces justificatives ou champs obligatoires manquants',
    isBuiltIn: true,
    columns: [
      'matricule',
      'lastName',
      'firstName',
      'phone',
      'email',
      'filiere',
      'level',
      'group',
      'status',
    ],
    presetFilters: { dossierStatus: 'INCOMPLETE' },
  },
];

const CUSTOM_TEMPLATES_STORAGE_KEY = 'ebm_custom_student_list_templates_v1';

interface StudentCustomListsExporterProps {
  initialYear?: string;
  initialAssignmentFilter?: 'ALL' | 'ASSIGNED' | 'UNASSIGNED';
  initialDossierFilter?: 'ALL' | 'COMPLETE' | 'INCOMPLETE';
  onOpenStudentDossier?: (student: User) => void;
}

export const StudentCustomListsExporter: React.FC<StudentCustomListsExporterProps> = ({
  initialYear,
  initialAssignmentFilter = 'ALL',
  initialDossierFilter = 'ALL',
  onOpenStudentDossier,
}) => {
  const {
    currentUser,
    users,
    groups,
    filieres,
    parcours,
    academicYears,
    selectedAcademicYear,
    inscriptions,
  } = useApp();

  const isTeacher = currentUser.role === 'TEACHER';

  const availableColumns = useMemo(
    () => ALL_EXPORT_COLUMNS.filter((c) => !(isTeacher && c.restrictedForTeacher)),
    [isTeacher]
  );

  // 10 Combinable Filters (Section 7.2)
  const [searchQuery, setSearchQuery] = useState('');
  const [yearFilter, setYearFilter] = useState<string>(initialYear || selectedAcademicYear || '2026-2027');
  const [filiereFilter, setFiliereFilter] = useState<string>('ALL');
  const [parcoursFilter, setParcoursFilter] = useState<string>('ALL');
  const [levelFilter, setLevelFilter] = useState<string>('ALL');
  const [groupFilter, setGroupFilter] = useState<string>('ALL');
  const [inscriptionTypeFilter, setInscriptionTypeFilter] = useState<string>('ALL');
  const [enrollmentStatusFilter, setEnrollmentStatusFilter] = useState<string>('ALL');
  const [academicStatusFilter, setAcademicStatusFilter] = useState<string>('ALL');
  const [assignmentFilter, setAssignmentFilter] = useState<'ALL' | 'ASSIGNED' | 'UNASSIGNED'>(
    initialAssignmentFilter
  );
  const [dossierFilter, setDossierFilter] = useState<'ALL' | 'COMPLETE' | 'INCOMPLETE'>(
    initialDossierFilter
  );

  useEffect(() => {
    if (initialYear) setYearFilter(initialYear);
  }, [initialYear]);

  useEffect(() => {
    setAssignmentFilter(initialAssignmentFilter);
  }, [initialAssignmentFilter]);

  useEffect(() => {
    setDossierFilter(initialDossierFilter);
  }, [initialDossierFilter]);

  // Selected & ordered columns (Section 7.3)
  const [selectedColumns, setSelectedColumns] = useState<ExportColumnId[]>(() =>
    isTeacher
      ? ['matricule', 'lastName', 'firstName', 'email', 'filiere', 'parcours', 'level', 'group', 'status']
      : [
          'matricule',
          'lastName',
          'firstName',
          'gender',
          'cin',
          'phone',
          'email',
          'filiere',
          'parcours',
          'level',
          'group',
          'academicYear',
          'inscriptionType',
          'status',
        ]
  );

  const [documentTitle, setDocumentTitle] = useState<string>('Liste Officielle des Étudiants');
  const [includeSignatureCol, setIncludeSignatureCol] = useState<boolean>(false);

  // Custom saved templates (Section 7.6)
  const [customTemplates, setCustomTemplates] = useState<SavedListTemplate[]>(() => {
    try {
      const raw = localStorage.getItem(CUSTOM_TEMPLATES_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [newTemplateName, setNewTemplateName] = useState('');
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  // Sorting & row selection for interactive preview (Section 7.4)
  const [sortCol, setSortCol] = useState<ExportColumnId>('lastName');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [excludedStudentIds, setExcludedStudentIds] = useState<Set<string>>(new Set());

  const students = useMemo(() => users.filter((u) => u.role === 'STUDENT'), [users]);

  // Build enriched student records based on annual inscriptions
  const enrichedRows = useMemo(() => {
    return students
      .map((st) => {
        const matchedInsc: StudentInscription | undefined =
          yearFilter === 'ALL'
            ? inscriptions
                .filter((i) => i.studentId === st.id && i.status !== 'REJECTED')
                .sort((a, b) => b.academicYear.localeCompare(a.academicYear))[0]
            : inscriptions.find((i) => i.studentId === st.id && i.academicYear === yearFilter);

        // If filtering on a specific academic year, only include students who have an inscription in that year
        if (yearFilter !== 'ALL' && !matchedInsc) {
          return null;
        }

        const effectiveGroupId = matchedInsc ? matchedInsc.groupId : st.groupId || '';
        const grp = groups.find((g) => g.id === effectiveGroupId);
        const effectiveFiliereId = matchedInsc?.filiereId || grp?.filiereId || st.filiereId || '';
        const fil = filieres.find((f) => f.id === effectiveFiliereId);
        const effectiveParcoursId = matchedInsc?.parcoursId || grp?.parcoursId || st.parcoursId || '';
        const parc = parcours.find((p) => p.id === effectiveParcoursId);
        const effectiveLevel = matchedInsc?.level || grp?.level || st.currentLevel || 'L1';
        const effectiveYear = matchedInsc?.academicYear || yearFilter;
        const effectiveStatus = matchedInsc?.status || 'CONFIRMED';
        const effectiveInscType = matchedInsc?.inscriptionType || 'INSCRIPTION';
        const effectiveAcademicStatus = matchedInsc?.academicStatus || 'NOUVEAU';
        const effectiveInscDate = matchedInsc?.inscriptionDate || st.enrollmentDate || '—';

        const completeness = computeStudentDossierCompleteness(st);
        const isDossierComplete =
          completeness.percentage >= 80 ||
          Boolean(matchedInsc?.dossierComplete) ||
          st.administrativeFolderStatus === 'COMPLET';

        // Extract lastName & firstName reliably
        const nameParts = (st.name || '').trim().split(/\s+/);
        const resolvedLastName =
          st.lastName ||
          (nameParts.length > 1 ? nameParts[nameParts.length - 1].toUpperCase() : st.name.toUpperCase());
        const resolvedFirstName =
          st.firstName ||
          (nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : st.name);

        const primaryParent = st.parentContacts?.[0];
        const guardianText = primaryParent
          ? `${primaryParent.prenoms} ${primaryParent.nom} (${primaryParent.phone})`.trim()
          : st.emergencyContact || 'Non renseigné';

        const addressText =
          st.permanentAddress?.addressLine ||
          st.currentAddress?.addressLine ||
          st.address ||
          st.city ||
          'Non renseignée';

        return {
          student: st,
          inscription: matchedInsc,
          group: grp,
          filiere: fil,
          parcours: parc,
          level: effectiveLevel,
          academicYear: effectiveYear,
          status: effectiveStatus,
          inscriptionType: effectiveInscType,
          academicStatus: effectiveAcademicStatus,
          inscriptionDate: effectiveInscDate,
          isAssigned: Boolean(effectiveGroupId && grp),
          isDossierComplete,
          completenessPct: completeness.percentage,
          cells: {
            matricule: st.matricule || 'N/A',
            lastName: resolvedLastName,
            firstName: resolvedFirstName,
            gender: st.gender || (st.civilite === 'M.' ? 'M' : st.civilite ? 'F' : '—'),
            birthDate: st.birthDate || '—',
            birthPlace: st.birthPlace || '—',
            cin: st.cin || '—',
            phone: st.phone || '—',
            email: st.email || '—',
            address: addressText,
            guardian: guardianText,
            filiere: fil ? `${fil.code} - ${fil.name}` : 'Non affectée',
            parcours: parc ? `${parc.code} - ${parc.name}` : 'Tronc commun',
            level: effectiveLevel,
            group: grp ? grp.code : 'Sans groupe',
            academicYear: effectiveYear,
            inscriptionType: effectiveInscType,
            status:
              effectiveStatus === 'CONFIRMED'
                ? 'Confirmée'
                : effectiveStatus === 'PENDING'
                ? 'En attente'
                : effectiveStatus === 'DRAFT'
                ? 'Brouillon'
                : effectiveStatus === 'SUSPENDED'
                ? 'Suspendue'
                : 'Rejetée',
            inscriptionDate: effectiveInscDate,
          } as Record<ExportColumnId, string>,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);
  }, [students, inscriptions, groups, filieres, parcours, yearFilter]);

  const filteredAndSortedRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const filtered = enrichedRows.filter((row) => {
      if (q) {
        const hay = `${row.cells.matricule} ${row.cells.lastName} ${row.cells.firstName} ${row.cells.cin} ${row.cells.email} ${row.cells.phone}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filiereFilter !== 'ALL' && row.filiere?.id !== filiereFilter) return false;
      if (parcoursFilter !== 'ALL' && row.parcours?.id !== parcoursFilter) return false;
      if (levelFilter !== 'ALL' && row.level !== levelFilter) return false;
      if (groupFilter !== 'ALL') {
        if (groupFilter === 'UNASSIGNED') {
          if (row.isAssigned) return false;
        } else if (row.group?.id !== groupFilter) {
          return false;
        }
      }
      if (inscriptionTypeFilter !== 'ALL' && row.inscriptionType !== inscriptionTypeFilter) return false;
      if (enrollmentStatusFilter !== 'ALL' && row.status !== enrollmentStatusFilter) return false;
      if (academicStatusFilter !== 'ALL' && row.academicStatus !== academicStatusFilter) return false;
      if (assignmentFilter === 'ASSIGNED' && !row.isAssigned) return false;
      if (assignmentFilter === 'UNASSIGNED' && row.isAssigned) return false;
      if (dossierFilter === 'COMPLETE' && !row.isDossierComplete) return false;
      if (dossierFilter === 'INCOMPLETE' && row.isDossierComplete) return false;

      return true;
    });

    return [...filtered].sort((a, b) => {
      const valA = a.cells[sortCol] || '';
      const valB = b.cells[sortCol] || '';
      const cmp = valA.localeCompare(valB, 'fr', { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [
    enrichedRows,
    searchQuery,
    filiereFilter,
    parcoursFilter,
    levelFilter,
    groupFilter,
    inscriptionTypeFilter,
    enrollmentStatusFilter,
    academicStatusFilter,
    assignmentFilter,
    dossierFilter,
    sortCol,
    sortDir,
  ]);

  const retainedRows = useMemo(
    () => filteredAndSortedRows.filter((r) => !excludedStudentIds.has(r.student.id)),
    [filteredAndSortedRows, excludedStudentIds]
  );

  const toggleColumn = (colId: ExportColumnId) => {
    setSelectedColumns((prev) =>
      prev.includes(colId) ? prev.filter((c) => c !== colId) : [...prev, colId]
    );
  };

  const moveColumn = (index: number, direction: -1 | 1) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= selectedColumns.length) return;
    const next = [...selectedColumns];
    const [removed] = next.splice(index, 1);
    next.splice(targetIdx, 0, removed);
    setSelectedColumns(next);
  };

  const applyTemplate = (tpl: SavedListTemplate) => {
    const validCols = tpl.columns.filter((c) => availableColumns.some((ac) => ac.id === c));
    setSelectedColumns(validCols);
    setDocumentTitle(tpl.name);
    setIncludeSignatureCol(Boolean(tpl.includeAttendanceSignatureCol));
    if (tpl.presetFilters) {
      setAssignmentFilter(tpl.presetFilters.assignmentStatus || 'ALL');
      setDossierFilter(tpl.presetFilters.dossierStatus || 'ALL');
      setEnrollmentStatusFilter(tpl.presetFilters.enrollmentStatus || 'ALL');
    } else {
      setAssignmentFilter('ALL');
      setDossierFilter('ALL');
      setEnrollmentStatusFilter('ALL');
    }
    showAppToast({
      type: 'info',
      title: `Modèle « ${tpl.name} » chargé`,
      message: `${validCols.length} colonnes configurées automatiquement.`,
    });
  };

  const handleSaveCustomTemplate = () => {
    if (!newTemplateName.trim()) return;
    const newTpl: SavedListTemplate = {
      id: `custom-tpl-${Date.now()}`,
      name: newTemplateName.trim(),
      description: `${selectedColumns.length} colonnes personnalisées`,
      columns: selectedColumns,
      presetFilters: {
        assignmentStatus: assignmentFilter,
        dossierStatus: dossierFilter,
        enrollmentStatus: enrollmentStatusFilter,
      },
      includeAttendanceSignatureCol: includeSignatureCol,
    };
    const next = [...customTemplates, newTpl];
    setCustomTemplates(next);
    try {
      localStorage.setItem(CUSTOM_TEMPLATES_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage quota errors
    }
    setNewTemplateName('');
    setIsSavingTemplate(false);
    showAppToast({
      type: 'success',
      title: 'Modèle de liste sauvegardé',
      message: `Le modèle "${newTpl.name}" est désormais disponible en un clic.`,
    });
  };

  const handleDeleteCustomTemplate = (id: string) => {
    const next = customTemplates.filter((t) => t.id !== id);
    setCustomTemplates(next);
    try {
      localStorage.setItem(CUSTOM_TEMPLATES_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore
    }
  };

  // Export CSV UTF-8
  const handleExportCsv = () => {
    if (retainedRows.length === 0) {
      showAppToast({
        type: 'warning',
        title: 'Liste vide',
        message: 'Aucun étudiant sélectionné pour l’exportation.',
      });
      return;
    }

    const headers = selectedColumns.map(
      (colId) => ALL_EXPORT_COLUMNS.find((c) => c.id === colId)?.label || colId
    );
    const dataMatrix = retainedRows.map((row) =>
      selectedColumns.map((colId) => row.cells[colId] || '')
    );

    const csvContent =
      '\uFEFF' +
      [headers, ...dataMatrix]
        .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';'))
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `EBM_${documentTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${yearFilter}_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    showAppToast({
      type: 'success',
      title: 'Export CSV UTF-8 téléchargé',
      message: `${retainedRows.length} étudiant(s) exporté(s) avec ${selectedColumns.length} colonnes.`,
    });
  };

  // Export Excel (.xlsx / SpreadsheetML XML)
  const handleExportExcel = () => {
    if (retainedRows.length === 0) {
      showAppToast({
        type: 'warning',
        title: 'Liste vide',
        message: 'Aucun étudiant sélectionné pour l’exportation Excel.',
      });
      return;
    }

    const headers = selectedColumns.map(
      (colId) => ALL_EXPORT_COLUMNS.find((c) => c.id === colId)?.label || colId
    );

    const xmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Title">
   <Font ss:Bold="1" ss:Size="13" ss:Color="#17345B"/>
  </Style>
  <Style ss:ID="Header">
   <Font ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#17345B" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="Cell">
   <Font ss:Size="10"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Etudiants EBM">
  <Table>`;

    const titleRow = `
   <Row>
    <Cell ss:StyleID="Title"><Data ss:Type="String">EBM INSTITUTE — ${escapeHtml(
      documentTitle
    )} (${escapeHtml(yearFilter)})</Data></Cell>
   </Row>`;

    const headerRow = `
   <Row>
    ${headers
      .map(
        (h) => `<Cell ss:StyleID="Header"><Data ss:Type="String">${escapeHtml(h)}</Data></Cell>`
      )
      .join('')}
   </Row>`;

    const bodyRows = retainedRows
      .map(
        (row) => `
   <Row>
    ${selectedColumns
      .map(
        (colId) =>
          `<Cell ss:StyleID="Cell"><Data ss:Type="String">${escapeHtml(
            row.cells[colId] || ''
          )}</Data></Cell>`
      )
      .join('')}
   </Row>`
      )
      .join('');

    const xmlFooter = `
  </Table>
 </Worksheet>
</Workbook>`;

    const fullXml = xmlHeader + titleRow + headerRow + bodyRows + xmlFooter;
    const blob = new Blob([fullXml], {
      type: 'application/vnd.ms-excel;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `EBM_${documentTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${yearFilter}.xls`;
    link.click();
    URL.revokeObjectURL(url);

    showAppToast({
      type: 'success',
      title: 'Classeur Excel généré',
      message: `${retainedRows.length} étudiant(s) exporté(s) au format tableur Excel.`,
    });
  };

  // Export PDF / Official Institutional Print (Section 7.5)
  const handlePrintOfficialPdf = () => {
    if (retainedRows.length === 0) {
      showAppToast({
        type: 'warning',
        title: 'Liste vide',
        message: 'Aucun étudiant retenu pour l’impression officielle.',
      });
      return;
    }

    const filObj = filieres.find((f) => f.id === filiereFilter);
    const grpObj = groups.find((g) => g.id === groupFilter);
    const headers = selectedColumns.map(
      (colId) => ALL_EXPORT_COLUMNS.find((c) => c.id === colId)?.label || colId
    );

    const htmlDoc = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(documentTitle)} - EBM Institute</title>
  <style>
    @page { size: A4 landscape; margin: 12mm; }
    body { font-family: 'Inter', Arial, sans-serif; color: #0f172a; margin: 0; padding: 16px; font-size: 11px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #17345B; padding-bottom: 12px; margin-bottom: 14px; }
    .brand { display: flex; align-items: center; gap: 12px; }
    .logo-box { width: 44px; height: 44px; border-radius: 10px; background: #17345B; color: #fff; font-weight: 900; font-size: 16px; display: flex; align-items: center; justify-content: center; }
    .meta { text-align: right; font-size: 10px; color: #475569; }
    h1 { font-size: 16px; margin: 0 0 4px 0; color: #17345B; text-transform: uppercase; }
    .sub { font-size: 11px; color: #334155; font-weight: 600; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th { background: #17345B; color: #ffffff; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; padding: 7px 6px; text-align: left; border: 1px solid #17345B; }
    td { padding: 6px; border: 1px solid #cbd5e1; font-size: 10px; vertical-align: middle; }
    tr:nth-child(even) { background: #f8fafc; }
    .footer { margin-top: 18px; display: flex; justify-content: space-between; font-size: 10px; color: #475569; }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <div class="logo-box">EBM</div>
      <div>
        <h1>EBM INSTITUTE MADAGASCAR</h1>
        <div class="sub">${escapeHtml(documentTitle)}</div>
        <div style="font-size:10px;color:#64748b;margin-top:2px;">
          Année académique : <strong>${escapeHtml(yearFilter)}</strong>
          • Filière : <strong>${escapeHtml(filObj ? `${filObj.code} - ${filObj.name}` : 'Toutes filières')}</strong>
          • Niveau : <strong>${escapeHtml(levelFilter === 'ALL' ? 'Tous niveaux' : levelFilter)}</strong>
          • Groupe : <strong>${escapeHtml(
            groupFilter === 'ALL'
              ? 'Tous groupes'
              : groupFilter === 'UNASSIGNED'
              ? 'Sans groupe'
              : grpObj?.code || groupFilter
          )}</strong>
        </div>
      </div>
    </div>
    <div class="meta">
      <div><strong>Date d’édition :</strong> ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
      <div><strong>Effectif retenu :</strong> ${retainedRows.length} étudiant(s)</div>
      <div><strong>Édité par :</strong> ${escapeHtml(currentUser.name)}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:28px;text-align:center;">N°</th>
        ${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}
        ${includeSignatureCol ? '<th style="width:110px;">Émargement / Signature</th>' : ''}
      </tr>
    </thead>
    <tbody>
      ${retainedRows
        .map(
          (row, idx) => `
        <tr>
          <td style="text-align:center;font-weight:bold;">${idx + 1}</td>
          ${selectedColumns
            .map((colId) => `<td>${escapeHtml(row.cells[colId] || '')}</td>`)
            .join('')}
          ${includeSignatureCol ? '<td></td>' : ''}
        </tr>`
        )
        .join('')}
    </tbody>
  </table>

  <div class="footer">
    <div>Document officiel généré par le Système d’Information Académique EBM Institute.</div>
    <div>Visa de la Scolarité / Direction : ____________________________</div>
  </div>
</body>
</html>`;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(htmlDoc);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1500);
      }, 250);
    }
  };

  return (
    <div className="space-y-5 text-xs">
      {/* 1. Modèles de listes préconfigurés et enregistrables (Section 7.6) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-[#2F6FED]" />
            <h3 className="text-sm font-black text-[#17345B] uppercase tracking-wider">
              1. Modèles de listes officiels & enregistrés
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setIsSavingTemplate(!isSavingTemplate)}
            className="px-3 py-1.5 bg-blue-50 hover:bg-[#2F6FED] text-[#2F6FED] hover:text-white rounded-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Enregistrer la configuration actuelle comme modèle</span>
          </button>
        </div>

        {isSavingTemplate && (
          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              placeholder="Nom du modèle personnalisé (ex: Liste Boursiers L2 INFO)..."
              className="flex-1 min-w-[240px] p-2 bg-white border border-blue-300 rounded-lg font-semibold"
            />
            <button
              type="button"
              onClick={handleSaveCustomTemplate}
              className="px-4 py-2 bg-[#2F6FED] text-white font-bold rounded-lg cursor-pointer"
            >
              Sauvegarder
            </button>
            <button
              type="button"
              onClick={() => setIsSavingTemplate(false)}
              className="px-3 py-2 bg-white text-slate-600 border border-slate-200 font-bold rounded-lg cursor-pointer"
            >
              Annuler
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {[...BUILTIN_TEMPLATES, ...customTemplates].map((tpl) => (
            <div
              key={tpl.id}
              className="p-3 rounded-xl border border-slate-200 hover:border-[#2F6FED] bg-slate-50/60 hover:bg-blue-50/40 transition-all flex items-start justify-between gap-2"
            >
              <button
                type="button"
                onClick={() => applyTemplate(tpl)}
                className="text-left flex-1 cursor-pointer"
              >
                <div className="font-bold text-[#17345B] flex items-center gap-1.5">
                  <span>{tpl.name}</span>
                  {!tpl.isBuiltIn && (
                    <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-800 rounded text-[9px] font-black">
                      Perso
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{tpl.description}</p>
              </button>
              {!tpl.isBuiltIn && (
                <button
                  type="button"
                  onClick={() => handleDeleteCustomTemplate(tpl.id)}
                  className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                  title="Supprimer ce modèle"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 2. Les 10 Filtres Combinables (Section 7.2) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-[#2F6FED]" />
            <h3 className="text-sm font-black text-[#17345B] uppercase tracking-wider">
              2. Filtres combinables de sélection (10 critères)
            </h3>
          </div>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setFiliereFilter('ALL');
              setParcoursFilter('ALL');
              setLevelFilter('ALL');
              setGroupFilter('ALL');
              setInscriptionTypeFilter('ALL');
              setEnrollmentStatusFilter('ALL');
              setAcademicStatusFilter('ALL');
              setAssignmentFilter('ALL');
              setDossierFilter('ALL');
              setExcludedStudentIds(new Set());
            }}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Réinitialiser les filtres</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Recherche libre */}
          <div className="relative lg:col-span-2">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par Matricule, Nom, Prénom, CIN, Email..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
            />
          </div>

          {/* 1. Année académique */}
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700"
          >
            <option value="ALL">1. Toutes les années académiques</option>
            {academicYears.map((ay) => (
              <option key={ay.id} value={ay.code}>
                1. Année : {ay.code}
              </option>
            ))}
          </select>

          {/* 2. Mention / Filière */}
          <select
            value={filiereFilter}
            onChange={(e) => {
              setFiliereFilter(e.target.value);
              setParcoursFilter('ALL');
              setGroupFilter('ALL');
            }}
            className="p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700"
          >
            <option value="ALL">2. Toutes les Filières</option>
            {filieres.map((f) => (
              <option key={f.id} value={f.id}>
                {f.code} — {f.name}
              </option>
            ))}
          </select>

          {/* 3. Parcours */}
          <select
            value={parcoursFilter}
            onChange={(e) => setParcoursFilter(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700"
          >
            <option value="ALL">3. Tous les Parcours</option>
            {parcours
              .filter((p) => filiereFilter === 'ALL' || p.filiereId === filiereFilter)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} — {p.name}
                </option>
              ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2.5">
          {/* 4. Niveau */}
          <select
            value={levelFilter}
            onChange={(e) => {
              setLevelFilter(e.target.value);
              setGroupFilter('ALL');
            }}
            className="p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700"
          >
            <option value="ALL">4. Tous Niveaux</option>
            {['L1', 'L2', 'L3', 'M1', 'M2'].map((l) => (
              <option key={l} value={l}>
                Niveau {l}
              </option>
            ))}
          </select>

          {/* 5. Groupe */}
          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700"
          >
            <option value="ALL">5. Tous Groupes</option>
            <option value="UNASSIGNED">Sans groupe</option>
            {groups
              .filter((g) => {
                if (filiereFilter !== 'ALL' && g.filiereId !== filiereFilter) return false;
                if (levelFilter !== 'ALL' && g.level !== levelFilter) return false;
                return true;
              })
              .map((g) => (
                <option key={g.id} value={g.id}>
                  {g.code}
                </option>
              ))}
          </select>

          {/* 6. Type d'inscription */}
          <select
            value={inscriptionTypeFilter}
            onChange={(e) => setInscriptionTypeFilter(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700"
          >
            <option value="ALL">6. Tous Types d’insc.</option>
            <option value="PREMIERE_INSCRIPTION">Première inscription</option>
            <option value="REINSCRIPTION">Réinscription</option>
            <option value="ADMISSION_DOSSIER">Admission sur dossier</option>
            <option value="CONCOURS">Concours</option>
            <option value="EQUIVALENCE">Équivalence</option>
            <option value="TRANSFERT">Transfert</option>
            <option value="REORIENTATION">Réorientation</option>
          </select>

          {/* 7. Statut d'inscription */}
          <select
            value={enrollmentStatusFilter}
            onChange={(e) => setEnrollmentStatusFilter(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700"
          >
            <option value="ALL">7. Tous Statuts</option>
            <option value="CONFIRMED">Confirmée</option>
            <option value="PENDING">En attente</option>
            <option value="DRAFT">Brouillon</option>
            <option value="SUSPENDED">Suspendue</option>
            <option value="REJECTED">Rejetée</option>
          </select>

          {/* 8. Situation académique */}
          <select
            value={academicStatusFilter}
            onChange={(e) => setAcademicStatusFilter(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700"
          >
            <option value="ALL">8. Toute Situation</option>
            <option value="NOUVEAU">Nouveau</option>
            <option value="PASSANT">Passant</option>
            <option value="PASSAGE_CONDITIONNEL">Passage conditionnel</option>
            <option value="REDOUBLANT">Redoublant</option>
            <option value="REORIENTE">Réorienté</option>
            <option value="TRANSFERE">Transféré</option>
          </select>

          {/* 9. Affecté / Non affecté */}
          <select
            value={assignmentFilter}
            onChange={(e) => setAssignmentFilter(e.target.value as 'ALL' | 'ASSIGNED' | 'UNASSIGNED')}
            className="p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700"
          >
            <option value="ALL">9. Affectation : Tous</option>
            <option value="ASSIGNED">Affectés à un groupe</option>
            <option value="UNASSIGNED">Sans groupe (Non affectés)</option>
          </select>

          {/* 10. Dossier complet / Incomplet */}
          <select
            value={dossierFilter}
            onChange={(e) => setDossierFilter(e.target.value as 'ALL' | 'COMPLETE' | 'INCOMPLETE')}
            className="p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700"
          >
            <option value="ALL">10. Dossier : Tous</option>
            <option value="COMPLETE">Dossier Complet</option>
            <option value="INCOMPLETE">Dossier Incomplet</option>
          </select>
        </div>
      </div>

      {/* 3. Choix & Réorganisation des Colonnes (Section 7.3) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-black text-[#17345B] uppercase tracking-wider">
              3. Colonnes à afficher et ordre d’apparition ({selectedColumns.length} sélectionnées)
            </h3>
            <p className="text-[11px] text-slate-500">
              Cochez les données souhaitées et utilisez les flèches pour réorganiser l’ordre des colonnes avant export.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 font-bold text-slate-700 cursor-pointer bg-slate-100 px-3 py-1.5 rounded-xl">
              <input
                type="checkbox"
                checked={includeSignatureCol}
                onChange={(e) => setIncludeSignatureCol(e.target.checked)}
              />
              <span>Ajouter colonne « Émargement / Signature » à l’impression PDF</span>
            </label>
          </div>
        </div>

        {/* Cases à cocher de toutes les colonnes disponibles */}
        <div className="flex flex-wrap gap-1.5">
          {availableColumns.map((col) => {
            const isChecked = selectedColumns.includes(col.id);
            return (
              <button
                key={col.id}
                type="button"
                onClick={() => toggleColumn(col.id)}
                className={`px-2.5 py-1.5 rounded-xl font-bold text-[11px] flex items-center gap-1.5 border transition-all cursor-pointer ${
                  isChecked
                    ? 'bg-[#17345B] text-white border-[#17345B]'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {isChecked ? <CheckSquare className="w-3.5 h-3.5 text-blue-300" /> : <Square className="w-3.5 h-3.5" />}
                <span>{col.label}</span>
              </button>
            );
          })}
        </div>

        {/* Ordre actif des colonnes avec boutons gauche/droite */}
        {selectedColumns.length > 0 && (
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">
              Ordre actif des colonnes dans le tableau et le fichier exporté :
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {selectedColumns.map((colId, idx) => {
                const colDef = ALL_EXPORT_COLUMNS.find((c) => c.id === colId);
                return (
                  <div
                    key={colId}
                    className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg flex items-center gap-1.5 shadow-2xs"
                  >
                    <span className="font-mono text-[10px] text-slate-400">{idx + 1}.</span>
                    <span className="font-bold text-slate-800">{colDef?.label || colId}</span>
                    <div className="flex items-center gap-0.5 ml-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveColumn(idx, -1)}
                        className="p-0.5 text-slate-400 hover:text-[#17345B] disabled:opacity-30 cursor-pointer"
                        title="Déplacer vers la gauche"
                      >
                        <ArrowUp className="w-3 h-3 -rotate-90" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === selectedColumns.length - 1}
                        onClick={() => moveColumn(idx, 1)}
                        className="p-0.5 text-slate-400 hover:text-[#17345B] disabled:opacity-30 cursor-pointer"
                        title="Déplacer vers la droite"
                      >
                        <ArrowDown className="w-3 h-3 -rotate-90" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 4. Barre d'Exportation & Prévisualisation Interactive (Sections 7.4 & 7.5) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-0.5">
                Titre officiel du document à générer
              </label>
              <input
                type="text"
                value={documentTitle}
                onChange={(e) => setDocumentTitle(e.target.value)}
                className="p-2 bg-white border border-slate-300 rounded-xl font-bold text-[#17345B] min-w-[260px]"
              />
            </div>
            <div className="px-3.5 py-2 bg-blue-50 border border-blue-200 rounded-xl">
              <span className="text-[10px] font-bold uppercase text-blue-700 block">
                Étudiants retenus
              </span>
              <span className="text-base font-black text-[#17345B]">
                {retainedRows.length} / {filteredAndSortedRows.length}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Exporter Excel (.xls)</span>
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              className="px-4 py-2.5 bg-[#2F6FED] hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Exporter CSV UTF-8</span>
            </button>
            <button
              type="button"
              onClick={handlePrintOfficialPdf}
              className="px-4 py-2.5 bg-[#17345B] hover:bg-slate-800 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>PDF / Impression Officielle EBM</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[480px]">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-100 sticky top-0 z-10 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-600">
              <tr>
                <th className="p-2.5 w-10 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      if (excludedStudentIds.size === 0) {
                        setExcludedStudentIds(new Set(filteredAndSortedRows.map((r) => r.student.id)));
                      } else {
                        setExcludedStudentIds(new Set());
                      }
                    }}
                    className="cursor-pointer text-slate-600 hover:text-[#17345B]"
                    title="Tout sélectionner / Tout désélectionner"
                  >
                    {excludedStudentIds.size === 0 && filteredAndSortedRows.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-[#2F6FED]" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="p-2.5 w-10">#</th>
                {selectedColumns.map((colId) => {
                  const colDef = ALL_EXPORT_COLUMNS.find((c) => c.id === colId);
                  const isSorted = sortCol === colId;
                  return (
                    <th key={colId} className="p-2.5 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          if (sortCol === colId) {
                            setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
                          } else {
                            setSortCol(colId);
                            setSortDir('asc');
                          }
                        }}
                        className="flex items-center gap-1 hover:text-[#17345B] cursor-pointer uppercase"
                      >
                        <span>{colDef?.label || colId}</span>
                        <ArrowUpDown className={`w-3 h-3 ${isSorted ? 'text-[#2F6FED]' : 'opacity-40'}`} />
                      </button>
                    </th>
                  );
                })}
                {onOpenStudentDossier && <th className="p-2.5 text-right">Dossier</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAndSortedRows.length === 0 ? (
                <tr>
                  <td colSpan={selectedColumns.length + 3} className="p-8 text-center text-slate-400">
                    Aucun étudiant ne correspond aux filtres sélectionnés.
                  </td>
                </tr>
              ) : (
                filteredAndSortedRows.map((row, idx) => {
                  const isIncluded = !excludedStudentIds.has(row.student.id);
                  return (
                    <tr
                      key={row.student.id}
                      className={`hover:bg-slate-50 ${!isIncluded ? 'opacity-45 bg-slate-50' : ''}`}
                    >
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setExcludedStudentIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(row.student.id)) next.delete(row.student.id);
                              else next.add(row.student.id);
                              return next;
                            });
                          }}
                          className="cursor-pointer"
                        >
                          {isIncluded ? (
                            <CheckSquare className="w-4 h-4 text-[#2F6FED]" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                      </td>
                      <td className="p-2.5 font-mono text-slate-400">{idx + 1}</td>
                      {selectedColumns.map((colId) => (
                        <td
                          key={colId}
                          className={`p-2.5 whitespace-nowrap ${
                            colId === 'matricule'
                              ? 'font-mono font-bold text-[#17345B]'
                              : colId === 'lastName'
                              ? 'font-bold text-slate-900'
                              : colId === 'group' && row.cells.group === 'Sans groupe'
                              ? 'text-amber-700 font-semibold'
                              : 'text-slate-700'
                          }`}
                        >
                          {row.cells[colId]}
                        </td>
                      ))}
                      {onOpenStudentDossier && (
                        <td className="p-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => onOpenStudentDossier(row.student)}
                            className="px-2 py-1 bg-blue-50 hover:bg-[#2F6FED] text-[#2F6FED] hover:text-white rounded-lg font-bold text-[10px] inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Fiche</span>
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>
              {isTeacher
                ? 'Mode Enseignant : protection RGPD active (données personnelles sensibles masquées).'
                : 'Mode Administration : accès complet aux colonnes administratives, académiques et de contact.'}
            </span>
          </div>
          <span className="font-mono">
            {retainedRows.length} ligne(s) prête(s) à exporter
          </span>
        </div>
      </div>
    </div>
  );
};
