import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  RotateCcw,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Copy,
  Trash2,
  Users,
  Clock,
  Sparkles,
  Download,
  Upload,
  AlertCircle,
  CheckCircle2,
  Filter,
  CheckSquare,
  Square,
  FileSpreadsheet,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Course } from '../../types';
import { CourseWizardModal } from './CourseWizardModal';
import { BulkCourseModal } from './BulkCourseModal';
import { CourseImportExportModal } from './CourseImportExportModal';

export const CoursesWorkspace: React.FC = () => {
  const {
    courses,
    deleteCourse,
    filieres,
    groups,
    users,
    ues,
    ecs,
    parcours,
    academicYears,
    getCourseHourlyStats,
  } = useApp();

  const teachers = useMemo(() => users.filter((u) => u.role === 'TEACHER'), [users]);

  // Notifications
  const [notification, setNotification] = useState<{ msg: string; isError?: boolean } | null>(null);
  const showNotif = (msg: string, isError = false) => {
    setNotification({ msg, isError });
    setTimeout(() => setNotification(null), 4000);
  };

  // Modals state
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardCourse, setWizardCourse] = useState<Course | null>(null);
  const [isDuplicateMode, setIsDuplicateMode] = useState(false);

  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [selectedSemester, setSelectedSemester] = useState<string>('ALL');
  const [selectedFiliere, setSelectedFiliere] = useState<string>('ALL');
  const [selectedParcours, setSelectedParcours] = useState<string>('ALL');
  const [selectedLevel, setSelectedLevel] = useState<string>('ALL');
  const [selectedUe, setSelectedUe] = useState<string>('ALL');
  const [selectedEc, setSelectedEc] = useState<string>('ALL');
  const [selectedTeacher, setSelectedTeacher] = useState<string>('ALL');
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Sorting
  const [sortField, setSortField] = useState<'code' | 'title' | 'level' | 'totalHours' | 'filiere'>('code');
  const [sortAsc, setSortAsc] = useState(true);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectAllAcrossPages, setSelectAllAcrossPages] = useState(false);

  // Reset Filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedYear('ALL');
    setSelectedSemester('ALL');
    setSelectedFiliere('ALL');
    setSelectedParcours('ALL');
    setSelectedLevel('ALL');
    setSelectedUe('ALL');
    setSelectedEc('ALL');
    setSelectedTeacher('ALL');
    setSelectedGroup('ALL');
    setSelectedType('ALL');
    setSelectedStatus('ALL');
    setCurrentPage(1);
    setSelectedIds([]);
    setSelectAllAcrossPages(false);
  };

  // Filter Logic
  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      // Search text (code, title, description)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const codeMatch = c.code.toLowerCase().includes(q);
        const titleMatch = c.title.toLowerCase().includes(q);
        const descMatch = c.description?.toLowerCase().includes(q);
        const teacherMatch = (c.teacherIds || []).some((tid) => {
          const t = users.find((u) => u.id === tid);
          return t?.name.toLowerCase().includes(q) || t?.email.toLowerCase().includes(q);
        });
        const groupMatch = (c.groupIds || []).some((gid) => {
          const g = groups.find((grp) => grp.id === gid);
          return g?.code.toLowerCase().includes(q);
        });
        if (!codeMatch && !titleMatch && !descMatch && !teacherMatch && !groupMatch) {
          return false;
        }
      }

      if (selectedYear !== 'ALL' && c.academicYear && c.academicYear !== selectedYear) return false;
      if (selectedSemester !== 'ALL' && c.semester && c.semester !== selectedSemester) return false;
      if (selectedFiliere !== 'ALL' && c.filiereId !== selectedFiliere) return false;
      if (selectedParcours !== 'ALL' && c.parcoursId !== selectedParcours) return false;
      if (selectedLevel !== 'ALL' && c.level !== selectedLevel) return false;
      if (selectedUe !== 'ALL' && c.ueId !== selectedUe) return false;
      if (selectedEc !== 'ALL' && c.ecId !== selectedEc) return false;
      if (selectedTeacher !== 'ALL' && !(c.teacherIds || []).includes(selectedTeacher)) return false;
      if (selectedGroup !== 'ALL' && !(c.groupIds || []).includes(selectedGroup)) return false;
      if (selectedType !== 'ALL' && c.courseType && c.courseType !== selectedType) return false;
      if (selectedStatus !== 'ALL') {
        const currentStatus = c.status || 'ACTIVE';
        if (currentStatus !== selectedStatus) return false;
      }

      return true;
    });
  }, [
    courses,
    searchQuery,
    selectedYear,
    selectedSemester,
    selectedFiliere,
    selectedParcours,
    selectedLevel,
    selectedUe,
    selectedEc,
    selectedTeacher,
    selectedGroup,
    selectedType,
    selectedStatus,
    users,
    groups,
  ]);

  // Sort Logic
  const sortedCourses = useMemo(() => {
    return [...filteredCourses].sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';

      if (sortField === 'code') {
        valA = a.code;
        valB = b.code;
      } else if (sortField === 'title') {
        valA = a.title;
        valB = b.title;
      } else if (sortField === 'level') {
        valA = a.level;
        valB = b.level;
      } else if (sortField === 'totalHours') {
        valA = a.totalHours || 0;
        valB = b.totalHours || 0;
      } else if (sortField === 'filiere') {
        valA = filieres.find((f) => f.id === a.filiereId)?.name || '';
        valB = filieres.find((f) => f.id === b.filiereId)?.name || '';
      }

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [filteredCourses, sortField, sortAsc, filieres]);

  // Pagination Logic
  const totalPages = Math.max(1, Math.ceil(sortedCourses.length / pageSize));
  const paginatedCourses = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedCourses.slice(start, start + pageSize);
  }, [sortedCourses, currentPage, pageSize]);

  // Selection handlers
  const handleToggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id];
      if (next.length !== filteredCourses.length) setSelectAllAcrossPages(false);
      return next;
    });
  };

  const isCurrentPageAllSelected = useMemo(() => {
    if (paginatedCourses.length === 0) return false;
    return paginatedCourses.every((c) => selectedIds.includes(c.id));
  }, [paginatedCourses, selectedIds]);

  const handleToggleCurrentPage = () => {
    if (isCurrentPageAllSelected) {
      const pageIds = new Set(paginatedCourses.map((c) => c.id));
      setSelectedIds((prev) => prev.filter((id) => !pageIds.has(id)));
      setSelectAllAcrossPages(false);
    } else {
      const pageIds = paginatedCourses.map((c) => c.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleSelectAllFiltered = () => {
    setSelectedIds(filteredCourses.map((c) => c.id));
    setSelectAllAcrossPages(true);
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
    setSelectAllAcrossPages(false);
  };

  // Individual Actions
  const handleOpenCreate = () => {
    setWizardCourse(null);
    setIsDuplicateMode(false);
    setIsWizardOpen(true);
  };

  const handleOpenEdit = (course: Course) => {
    setWizardCourse(course);
    setIsDuplicateMode(false);
    setIsWizardOpen(true);
  };

  const handleOpenDuplicate = (course: Course) => {
    setWizardCourse(course);
    setIsDuplicateMode(true);
    setIsWizardOpen(true);
  };

  const handleDelete = (course: Course) => {
    if (window.confirm(`Confirmez-vous la suppression du cours "${course.title}" (${course.code}) ?`)) {
      const res = deleteCourse(course.id);
      if (res.success) {
        showNotif(`Cours "${course.code}" supprimé avec succès.`);
        setSelectedIds((prev) => prev.filter((id) => id !== course.id));
      } else {
        showNotif(res.error || 'Erreur lors de la suppression.', true);
      }
    }
  };

  // KPIs
  const kpis = useMemo(() => {
    const total = courses.length;
    const totalHours = courses.reduce((acc, c) => acc + (c.totalHours || 0), 0);
    const withoutTeacher = courses.filter((c) => !c.teacherIds || c.teacherIds.length === 0).length;
    const withoutGroup = courses.filter((c) => !c.groupIds || c.groupIds.length === 0).length;
    const archived = courses.filter((c) => c.status === 'ARCHIVED').length;
    return { total, totalHours, withoutTeacher, withoutGroup, archived };
  }, [courses]);

  return (
    <div className="space-y-4">
      {/* Top Indicators / KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 block uppercase">Total des Cours</span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-xl font-extrabold text-slate-900">{kpis.total}</span>
            <span className="text-[10px] text-slate-500 font-semibold">matières</span>
          </div>
        </div>

        <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 block uppercase">Volume Maquette</span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-xl font-extrabold text-blue-600">{kpis.totalHours}</span>
            <span className="text-[10px] text-slate-500 font-semibold">heures total</span>
          </div>
        </div>

        <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 block uppercase">Sans Enseignant</span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className={`text-xl font-extrabold ${kpis.withoutTeacher > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
              {kpis.withoutTeacher}
            </span>
            <span className="text-[10px] text-slate-500 font-semibold">à affecter</span>
          </div>
        </div>

        <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 block uppercase">Sans Groupes</span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className={`text-xl font-extrabold ${kpis.withoutGroup > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
              {kpis.withoutGroup}
            </span>
            <span className="text-[10px] text-slate-500 font-semibold">à rattacher</span>
          </div>
        </div>

        <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs col-span-2 sm:col-span-1">
          <span className="text-[11px] font-bold text-slate-400 block uppercase">Cours Archivés</span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-xl font-extrabold text-slate-600">{kpis.archived}</span>
            <span className="text-[10px] text-slate-400 font-semibold">inactifs</span>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div
          className={`p-3 rounded-2xl flex items-center gap-2 text-xs font-semibold ${
            notification.isError
              ? 'bg-red-50 border border-red-200 text-red-800'
              : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
          }`}
        >
          {notification.isError ? (
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          )}
          <span>{notification.msg}</span>
        </div>
      )}

      {/* Main Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Header Actions Bar */}
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              Répertoire des Cours & Matières LMD
            </h3>
            <p className="text-xs text-slate-500">
              Consultez, filtrez et modifiez les cours ainsi que leurs affectations de promotions et d'enseignants.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setIsImportExportOpen(true)}
              className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Import / Export CSV</span>
            </button>

            <button
              type="button"
              onClick={handleOpenCreate}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Nouveau Cours (3 étapes)</span>
            </button>
          </div>
        </div>

        {/* Filter Toolbar (Combinable Filters) */}
        <div className="p-4 border-b border-slate-200 space-y-3 bg-white">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Live Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Recherche instantanée par code, titre, enseignant, groupe..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-blue-500 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Quick Top Selectors */}
            <select
              value={selectedFiliere}
              onChange={(e) => {
                setSelectedFiliere(e.target.value);
                setCurrentPage(1);
              }}
              className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
            >
              <option value="ALL">Toutes les mentions / filières</option>
              {filieres.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.code} - {f.name}
                </option>
              ))}
            </select>

            <select
              value={selectedLevel}
              onChange={(e) => {
                setSelectedLevel(e.target.value);
                setCurrentPage(1);
              }}
              className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
            >
              <option value="ALL">Tous les niveaux</option>
              <option value="L1">L1</option>
              <option value="L2">L2</option>
              <option value="L3">L3</option>
              <option value="M1">M1</option>
              <option value="M2">M2</option>
            </select>

            <button
              type="button"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`px-3 py-2 border rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
                showAdvancedFilters
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filtres avancés</span>
              {showAdvancedFilters ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={handleResetFilters}
              title="Réinitialiser tous les filtres"
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Collapsible Advanced Filters Row */}
          {showAdvancedFilters && (
            <div className="pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5 animate-in fade-in">
              {/* Semestre */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Semestre</label>
                <select
                  value={selectedSemester}
                  onChange={(e) => {
                    setSelectedSemester(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  <option value="ALL">Tous les semestres</option>
                  {['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10'].map((s) => (
                    <option key={s} value={s}>
                      Semestre {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Enseignant */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Enseignant</label>
                <select
                  value={selectedTeacher}
                  onChange={(e) => {
                    setSelectedTeacher(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  <option value="ALL">Tous les enseignants</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Groupe */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Groupe</label>
                <select
                  value={selectedGroup}
                  onChange={(e) => {
                    setSelectedGroup(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  <option value="ALL">Tous les groupes</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.code} ({g.studentCount} étud.)
                    </option>
                  ))}
                </select>
              </div>

              {/* Type CM/TD/TP */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Type Enseignement</label>
                <select
                  value={selectedType}
                  onChange={(e) => {
                    setSelectedType(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  <option value="ALL">Tous les types</option>
                  <option value="CM">CM (Cours Magistral)</option>
                  <option value="TD">TD (Travaux Dirigés)</option>
                  <option value="TP">TP (Travaux Pratiques)</option>
                  <option value="AUTRE">AUTRE</option>
                </select>
              </div>

              {/* Statut */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Statut</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => {
                    setSelectedStatus(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  <option value="ALL">Tous les statuts</option>
                  <option value="ACTIVE">Actif uniquement</option>
                  <option value="ARCHIVED">Archivé uniquement</option>
                </select>
              </div>

              {/* Année universitaire */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Année</label>
                <select
                  value={selectedYear}
                  onChange={(e) => {
                    setSelectedYear(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  <option value="ALL">Toutes les années</option>
                  {academicYears.map((ay) => (
                    <option key={ay.id} value={ay.code}>
                      {ay.code}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Results Count & Select All across pages Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 pt-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-800">
                {filteredCourses.length} cours trouvé{filteredCourses.length > 1 ? 's' : ''}
              </span>
              <span>sur un total de {courses.length}</span>
              {(searchQuery || selectedFiliere !== 'ALL' || selectedLevel !== 'ALL' || selectedSemester !== 'ALL' || selectedStatus !== 'ALL') && (
                <span className="text-blue-600 font-semibold">• Filtres actifs</span>
              )}
            </div>

            {selectedIds.length > 0 && selectedIds.length < filteredCourses.length && (
              <button
                type="button"
                onClick={handleSelectAllFiltered}
                className="text-xs text-blue-600 hover:underline font-bold mt-1 sm:mt-0"
              >
                Sélectionner l'ensemble des {filteredCourses.length} cours filtrés sur toutes les pages
              </button>
            )}
          </div>
        </div>

        {/* Floating Bulk Action Bar (when >= 1 course selected) */}
        {selectedIds.length > 0 && (
          <div className="px-4 py-3 bg-blue-50 border-b border-blue-200 flex flex-col md:flex-row md:items-center justify-between gap-3 animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                {selectedIds.length}
              </span>
              <span className="font-bold text-blue-950 text-xs">
                {selectedIds.length} cours sélectionné{selectedIds.length > 1 ? 's' : ''}
                {selectAllAcrossPages ? ' (toutes les pages filtrées)' : ''}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setIsBulkModalOpen(true)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Gérer les Groupes en masse (Section 6)</span>
              </button>

              <button
                type="button"
                onClick={() => setIsBulkModalOpen(true)}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
              >
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span>Autres actions groupées...</span>
              </button>

              <button
                type="button"
                onClick={handleClearSelection}
                className="text-xs text-slate-500 hover:text-slate-800 underline font-semibold ml-1"
              >
                Désélectionner tout
              </button>
            </div>
          </div>
        )}

        {/* Courses Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/75 text-slate-600 font-bold border-b border-slate-200 select-none">
              <tr>
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isCurrentPageAllSelected}
                    onChange={handleToggleCurrentPage}
                    className="rounded text-blue-600 cursor-pointer"
                  />
                </th>
                <th
                  onClick={() => {
                    if (sortField === 'code') setSortAsc(!sortAsc);
                    else {
                      setSortField('code');
                      setSortAsc(true);
                    }
                  }}
                  className="p-3 cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center gap-1">
                    <span>Code</span>
                    {sortField === 'code' && (sortAsc ? '↑' : '↓')}
                  </div>
                </th>
                <th
                  onClick={() => {
                    if (sortField === 'title') setSortAsc(!sortAsc);
                    else {
                      setSortField('title');
                      setSortAsc(true);
                    }
                  }}
                  className="p-3 cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center gap-1">
                    <span>Intitulé du Cours / Matière</span>
                    {sortField === 'title' && (sortAsc ? '↑' : '↓')}
                  </div>
                </th>
                <th
                  onClick={() => {
                    if (sortField === 'filiere') setSortAsc(!sortAsc);
                    else {
                      setSortField('filiere');
                      setSortAsc(true);
                    }
                  }}
                  className="p-3 cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center gap-1">
                    <span>Filière & Parcours</span>
                    {sortField === 'filiere' && (sortAsc ? '↑' : '↓')}
                  </div>
                </th>
                <th
                  onClick={() => {
                    if (sortField === 'level') setSortAsc(!sortAsc);
                    else {
                      setSortField('level');
                      setSortAsc(true);
                    }
                  }}
                  className="p-3 cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center gap-1">
                    <span>Niveau / Sem.</span>
                    {sortField === 'level' && (sortAsc ? '↑' : '↓')}
                  </div>
                </th>
                <th className="p-3">Type</th>
                <th className="p-3">Enseignant(s)</th>
                <th className="p-3">Groupes Concernés</th>
                <th
                  onClick={() => {
                    if (sortField === 'totalHours') setSortAsc(!sortAsc);
                    else {
                      setSortField('totalHours');
                      setSortAsc(true);
                    }
                  }}
                  className="p-3 cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center gap-1">
                    <span>Volume Horaire</span>
                    {sortField === 'totalHours' && (sortAsc ? '↑' : '↓')}
                  </div>
                </th>
                <th className="p-3">Statut</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {paginatedCourses.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-slate-400">
                    <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-semibold text-sm">Aucun cours ne correspond aux critères.</p>
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="text-xs text-blue-600 hover:underline mt-1 font-semibold"
                    >
                      Réinitialiser tous les filtres
                    </button>
                  </td>
                </tr>
              ) : (
                paginatedCourses.map((c) => {
                  const isSelected = selectedIds.includes(c.id);
                  const filiereObj = filieres.find((f) => f.id === c.filiereId);
                  const parcoursObj = parcours.find((p) => p.id === c.parcoursId);
                  const teacherNames = (c.teacherIds || [])
                    .map((tid) => teachers.find((t) => t.id === tid)?.name || '')
                    .filter(Boolean);
                  const assignedGroups = (c.groupIds || [])
                    .map((gid) => groups.find((g) => g.id === gid))
                    .filter(Boolean);

                  const hourlyStats = getCourseHourlyStats(c.id);
                  const progressPct = hourlyStats.totalHours > 0
                    ? Math.min(100, Math.round((hourlyStats.scheduledHours / hourlyStats.totalHours) * 100))
                    : 0;

                  return (
                    <tr
                      key={c.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleRow(c.id)}
                          className="rounded text-blue-600 cursor-pointer"
                        />
                      </td>

                      {/* Code */}
                      <td className="p-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: c.color || '#2563eb' }}
                          />
                          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                            {c.code}
                          </span>
                        </div>
                      </td>

                      {/* Title */}
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{c.title}</div>
                        {c.description && (
                          <p className="text-[11px] text-slate-400 line-clamp-1 max-w-xs">{c.description}</p>
                        )}
                      </td>

                      {/* Filière & Parcours */}
                      <td className="p-3 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">{filiereObj?.code || '-'}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[120px]">
                          {parcoursObj ? parcoursObj.code : filiereObj?.name || ''}
                        </div>
                      </td>

                      {/* Level & Semester */}
                      <td className="p-3 whitespace-nowrap">
                        <span className="font-bold text-slate-800">{c.level}</span>
                        <span className="text-slate-400 ml-1">({c.semester || 'S1'})</span>
                      </td>

                      {/* Type */}
                      <td className="p-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-slate-100 text-slate-700">
                          {c.courseType || 'CM'}
                        </span>
                      </td>

                      {/* Teachers */}
                      <td className="p-3">
                        {teacherNames.length > 0 ? (
                          <div className="font-medium text-slate-700 max-w-[140px] truncate" title={teacherNames.join(', ')}>
                            {teacherNames.join(', ')}
                          </div>
                        ) : (
                          <span className="text-amber-600 italic text-[11px]">Non affecté</span>
                        )}
                      </td>

                      {/* Groups */}
                      <td className="p-3">
                        {assignedGroups.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-[180px]">
                            {assignedGroups.map((grp) => (
                              <span
                                key={grp!.id}
                                className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[10px]"
                                title={`${grp!.name} (${grp!.studentCount} étudiants)`}
                              >
                                {grp!.code}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-red-500 italic text-[11px]">Aucun groupe</span>
                        )}
                      </td>

                      {/* Volume & Progression */}
                      <td className="p-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800">
                          <span>{c.totalHours || 30}h</span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            ({hourlyStats.scheduledHours}h planifiées)
                          </span>
                        </div>
                        <div className="w-24 h-1.5 bg-slate-200 rounded-full mt-1 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              progressPct >= 100 ? 'bg-emerald-500' : 'bg-blue-600'
                            }`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </td>

                      {/* Status */}
                      <td className="p-3 whitespace-nowrap">
                        {c.status === 'ARCHIVED' ? (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-bold text-[10px]">
                            Archivé
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                            Actif
                          </span>
                        )}
                      </td>

                      {/* Row Actions */}
                      <td className="p-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(c)}
                            title="Modifier ce cours"
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenDuplicate(c)}
                            title="Dupliquer ce cours (Section 8)"
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(c)}
                            title="Supprimer ce cours"
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination & Page Size */}
        <div className="p-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span>Afficher par page :</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="p-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
            >
              <option value={10}>10 cours</option>
              <option value={25}>25 cours</option>
              <option value={50}>50 cours</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <span>
              Page <span className="font-bold text-slate-800">{currentPage}</span> sur{' '}
              <span className="font-bold text-slate-800">{totalPages}</span>
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 border border-slate-300 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 border border-slate-300 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CourseWizardModal
        isOpen={isWizardOpen}
        onClose={() => {
          setIsWizardOpen(false);
          setWizardCourse(null);
          setIsDuplicateMode(false);
        }}
        initialCourse={wizardCourse}
        isDuplicateMode={isDuplicateMode}
        onSaved={(c) => {
          showNotif(
            isDuplicateMode
              ? `Cours dupliqué avec succès : ${c.code}`
              : wizardCourse
              ? `Cours ${c.code} mis à jour avec succès`
              : `Nouveau cours créé avec succès : ${c.code}`
          );
        }}
      />

      <BulkCourseModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        selectedCourseIds={selectedIds}
        onComplete={() => {
          showNotif(`Mise à jour groupée appliquée à ${selectedIds.length} cours.`);
          setSelectedIds([]);
        }}
      />

      <CourseImportExportModal
        isOpen={isImportExportOpen}
        onClose={() => setIsImportExportOpen(false)}
        filteredCourses={filteredCourses}
        onImportCompleted={() => {
          showNotif('Importation des cours réalisée avec succès.');
        }}
      />
    </div>
  );
};
