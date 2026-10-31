import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { HomeworkAssignment, HomeworkSubmission, LearningResource } from '../types';
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Award,
  Download,
  Plus,
  Trash2,
  FileCode,
  FileSpreadsheet,
  File,
  Layers,
  Send,
  Search,
  Filter,
  MessageSquare,
  BookOpen,
} from 'lucide-react';

export const HomeworkAndResourcesView: React.FC = () => {
  const {
    currentUser,
    ecs,
    groups,
    homework,
    submissions,
    learningResources,
    createHomework,
    submitHomework,
    gradeSubmission,
    addLearningResource,
    deleteLearningResource,
    appSettings,
    selectedAcademicYear,
  } = useApp();

  const isStudent = currentUser.role === 'STUDENT';
  const isTeacherOrAdmin = ['TEACHER', 'ADMIN', 'ADMIN_STAFF', 'ACADEMIC_HEAD', 'SCOLARITE', 'SCHEDULER'].includes(currentUser.role);

  const [activeTab, setActiveTab] = useState<'HOMEWORK' | 'RESOURCES'>('HOMEWORK');
  const [uploadError, setUploadError] = useState<string>('');
  const [downloadNotice, setDownloadNotice] = useState<string>('');

  // Practical Filters for Students & Teachers
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterEcId, setFilterEcId] = useState<string>('ALL');
  const [filterGroupId, setFilterGroupId] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'TODO' | 'SUBMITTED' | 'GRADED' | 'TO_GRADE'>('ALL');
  const [filterResourceCategory, setFilterResourceCategory] = useState<string>('ALL');

  const storageConfig = appSettings.storageSettings || {
    maxFileSizeMb: 25,
    allowedExtensions: ['PDF', 'DOCX', 'XLSX', 'PPTX', 'JPG', 'PNG', 'ZIP'],
    globalQuotaMb: 2048,
    autoArchivePreviousYears: false,
  };

  // Real browser file download helper (ACC-021 - no window.alert)
  const triggerRealFileDownload = (fileName: string, fileUrl?: string, description?: string) => {
    const a = document.createElement('a');
    if (fileUrl && fileUrl !== '#') {
      a.href = fileUrl;
    } else {
      const content = `Document Officiel EBM Institute SIS\nFichier : ${fileName}\nDescription : ${description || 'Support pédagogique / Rendu de devoir'}\nAnnée Académique : ${selectedAcademicYear}\nDate d'extraction : ${new Date().toISOString()}`;
      const blob = new Blob([content], { type: 'application/octet-stream' });
      a.href = URL.createObjectURL(blob);
    }
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setDownloadNotice(`Téléchargement lancé : ${fileName}`);
    setTimeout(() => setDownloadNotice(''), 3500);
  };

  // Modals state
  const [showCreateHwModal, setShowCreateHwModal] = useState<boolean>(false);
  const [hwForm, setHwForm] = useState({
    ecId: ecs[0]?.id || 'ec-algo-1',
    groupId: groups[0]?.id || 'grp-l1-info-a',
    title: '',
    instructions: '',
    dueDate: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 16),
    allowLateSubmission: true,
    maxScore: 20,
    attachmentFileName: '',
    attachmentFileUrl: '',
  });

  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);
  const [selectedHwForSubmit, setSelectedHwForSubmit] = useState<HomeworkAssignment | null>(null);
  const [submissionFileName, setSubmissionFileName] = useState<string>('');
  const [submissionFileSize, setSubmissionFileSize] = useState<string>('1.2 MB');
  const [submissionFileBytes, setSubmissionFileBytes] = useState<number>(1258291);
  const [submissionFileUrl, setSubmissionFileUrl] = useState<string>('');
  const [submissionComment, setSubmissionComment] = useState<string>('');

  const [showGradeModal, setShowGradeModal] = useState<boolean>(false);
  const [selectedSubForGrade, setSelectedSubForGrade] = useState<HomeworkSubmission | null>(null);
  const [gradeInput, setGradeInput] = useState<number>(15);
  const [feedbackInput, setFeedbackInput] = useState<string>('');

  const [showAddResourceModal, setShowAddResourceModal] = useState<boolean>(false);
  const [resourceForm, setResourceForm] = useState({
    ecId: ecs[0]?.id || 'ec-algo-1',
    groupId: groups[0]?.id || 'grp-l1-info-a',
    title: '',
    description: '',
    category: 'PDF' as LearningResource['category'],
    fileName: 'Support_Cours.pdf',
    fileSize: '2.4 MB',
    fileSizeBytes: 2516582,
    fileUrl: '',
  });

  const handleCreateHomeworkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hwForm.title.trim()) return;

    createHomework({
      ecId: hwForm.ecId,
      groupId: hwForm.groupId,
      teacherId: currentUser.id,
      title: hwForm.title,
      instructions: hwForm.attachmentFileName
        ? `${hwForm.instructions}\n\n[Pièce jointe énoncé : ${hwForm.attachmentFileName}]`
        : hwForm.instructions,
      dueDate: new Date(hwForm.dueDate).toISOString(),
      allowLateSubmission: hwForm.allowLateSubmission,
      maxScore: Number(hwForm.maxScore),
    });

    setShowCreateHwModal(false);
    setHwForm({
      ecId: ecs[0]?.id || 'ec-algo-1',
      groupId: groups[0]?.id || 'grp-l1-info-a',
      title: '',
      instructions: '',
      dueDate: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 16),
      allowLateSubmission: true,
      maxScore: 20,
      attachmentFileName: '',
      attachmentFileUrl: '',
    });
  };

  const handleSubmitHomeworkAction = (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError('');
    if (!selectedHwForSubmit) return;

    const fileToSubmit = submissionFileName.trim() || `${currentUser.name.replace(/\s+/g, '_')}_Devoir.zip`;
    const res = submitHomework(
      selectedHwForSubmit.id,
      fileToSubmit,
      submissionFileSize,
      submissionComment,
      submissionFileBytes,
      submissionFileUrl || undefined
    );
    if (!res.success) {
      setUploadError(res.error || 'Dépôt refusé.');
      return;
    }
    setShowSubmitModal(false);
    setSelectedHwForSubmit(null);
    setSubmissionFileName('');
    setSubmissionFileUrl('');
    setSubmissionComment('');
  };

  const handleGradeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubForGrade) return;

    gradeSubmission(selectedSubForGrade.id, Number(gradeInput), feedbackInput);
    setShowGradeModal(false);
    setSelectedSubForGrade(null);
    setFeedbackInput('');
  };

  const handleAddResourceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError('');
    if (!resourceForm.title.trim()) return;

    const res = addLearningResource({
      ecId: resourceForm.ecId,
      groupId: resourceForm.groupId,
      teacherId: currentUser.id,
      title: resourceForm.title,
      description: resourceForm.description,
      category: resourceForm.category,
      fileUrl: resourceForm.fileUrl || '#',
      fileName: resourceForm.fileName,
      fileSize: resourceForm.fileSize,
      fileSizeBytes: resourceForm.fileSizeBytes,
      academicYear: selectedAcademicYear,
    });

    if (!res.success) {
      setUploadError(res.error || 'Ressource refusée.');
      return;
    }

    setShowAddResourceModal(false);
    setResourceForm({
      ecId: ecs[0]?.id || 'ec-algo-1',
      groupId: groups[0]?.id || 'grp-l1-info-a',
      title: '',
      description: '',
      category: 'PDF',
      fileName: 'Support_Cours.pdf',
      fileSize: '2.4 MB',
      fileSizeBytes: 2516582,
      fileUrl: '',
    });
  };

  // Base role-filtered lists (strict class/group access control for students)
  const baseHomework = useMemo(() => {
    if (isStudent) {
      return homework.filter((h) => (currentUser.groupId ? h.groupId === currentUser.groupId : false));
    }
    if (currentUser.role === 'TEACHER') {
      // Teachers see their own homework or homework for their assigned ECs
      return homework.filter(
        (h) => h.teacherId === currentUser.id || ecs.some((e) => e.id === h.ecId && e.teacherIds.includes(currentUser.id))
      );
    }
    return homework;
  }, [homework, isStudent, currentUser, ecs]);

  const baseResources = useMemo(() => {
    const activeRes = learningResources.filter((r) => !r.isArchived);
    if (isStudent) {
      return activeRes.filter((r) => (currentUser.groupId ? r.groupId === currentUser.groupId : false));
    }
    return activeRes;
  }, [learningResources, isStudent, currentUser]);

  // Apply interactive user filters
  const visibleHomework = useMemo(() => {
    return baseHomework.filter((hw) => {
      if (filterEcId !== 'ALL' && hw.ecId !== filterEcId) return false;
      if (!isStudent && filterGroupId !== 'ALL' && hw.groupId !== filterGroupId) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const ec = ecs.find((e) => e.id === hw.ecId);
        const matchesTitle = hw.title.toLowerCase().includes(q);
        const matchesInstr = hw.instructions.toLowerCase().includes(q);
        const matchesEc = ec ? ec.title.toLowerCase().includes(q) || ec.code.toLowerCase().includes(q) : false;
        if (!matchesTitle && !matchesInstr && !matchesEc) return false;
      }

      if (filterStatus !== 'ALL') {
        const hwSubs = submissions.filter((s) => s.homeworkId === hw.id);
        const mySub = hwSubs.find((s) => s.studentId === currentUser.id);
        if (isStudent) {
          if (filterStatus === 'TODO' && mySub) return false;
          if (filterStatus === 'SUBMITTED' && !mySub) return false;
          if (filterStatus === 'GRADED' && (!mySub || mySub.grade === undefined)) return false;
        } else {
          if (filterStatus === 'TO_GRADE') {
            const hasUngraded = hwSubs.some((s) => s.grade === undefined);
            if (!hasUngraded) return false;
          }
        }
      }

      return true;
    });
  }, [baseHomework, filterEcId, filterGroupId, searchQuery, filterStatus, isStudent, submissions, currentUser.id, ecs]);

  const visibleResources = useMemo(() => {
    return baseResources.filter((res) => {
      if (filterEcId !== 'ALL' && res.ecId !== filterEcId) return false;
      if (!isStudent && filterGroupId !== 'ALL' && res.groupId !== filterGroupId) return false;
      if (filterResourceCategory !== 'ALL' && res.category !== filterResourceCategory) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const ec = ecs.find((e) => e.id === res.ecId);
        const matchesTitle = res.title.toLowerCase().includes(q) || (res.description || '').toLowerCase().includes(q);
        const matchesFile = res.fileName.toLowerCase().includes(q);
        const matchesEc = ec ? ec.title.toLowerCase().includes(q) || ec.code.toLowerCase().includes(q) : false;
        if (!matchesTitle && !matchesFile && !matchesEc) return false;
      }
      return true;
    });
  }, [baseResources, filterEcId, filterGroupId, filterResourceCategory, searchQuery, isStudent, ecs]);

  // Summary KPIs for quick overview
  const kpiStats = useMemo(() => {
    if (isStudent) {
      const mySubmissions = submissions.filter((s) => s.studentId === currentUser.id);
      const todoCount = baseHomework.filter((h) => !mySubmissions.some((s) => s.homeworkId === h.id)).length;
      const submittedCount = mySubmissions.length;
      const gradedCount = mySubmissions.filter((s) => s.grade !== undefined).length;
      return {
        todoCount,
        submittedCount,
        gradedCount,
        resourcesCount: baseResources.length,
      };
    } else {
      const relevantHwIds = new Set(baseHomework.map((h) => h.id));
      const relevantSubs = submissions.filter((s) => relevantHwIds.has(s.homeworkId));
      const toGradeCount = relevantSubs.filter((s) => s.grade === undefined).length;
      const gradedCount = relevantSubs.filter((s) => s.grade !== undefined).length;
      return {
        todoCount: baseHomework.length,
        submittedCount: relevantSubs.length,
        gradedCount,
        toGradeCount,
        resourcesCount: baseResources.length,
      };
    }
  }, [isStudent, baseHomework, baseResources, submissions, currentUser.id]);

  // Extract attachment filename from instructions if present
  const extractStatementAttachment = (instructions: string): { cleanText: string; attachmentName: string | null } => {
    const match = instructions.match(/\[Pièce jointe énoncé\s*:\s*([^\]]+)\]/i);
    if (!match) return { cleanText: instructions, attachmentName: null };
    return {
      cleanText: instructions.replace(match[0], '').trim(),
      attachmentName: match[1].trim(),
    };
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-blue-900 text-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 px-2.5 py-0.5 rounded text-xs font-semibold uppercase">
              Espace Travaux & Cours
            </span>
            <span className="text-xs text-slate-300">Pédagogie EBM Institute</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Devoirs, Rendus & Supports de Cours</h1>
          <p className="text-slate-300 text-sm mt-1">
            {isStudent
              ? 'Retrouvez vos devoirs à rendre, téléchargez les énoncés et supports de cours en 1 clic, et consultez vos notes et corrections.'
              : 'Assignez des devoirs avec énoncé joint, partagez vos supports de cours et corrigez rapidement les copies déposées.'}
          </p>
        </div>

        {isTeacherOrAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowCreateHwModal(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Assigner un devoir
            </button>
            <button
              onClick={() => setShowAddResourceModal(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg transition-all cursor-pointer active:scale-95"
            >
              <UploadCloud className="w-4 h-4" />
              Publier un support de cours
            </button>
          </div>
        )}
      </div>

      {/* Quick KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => {
            setActiveTab('HOMEWORK');
            setFilterStatus(isStudent ? 'TODO' : 'ALL');
          }}
          className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm hover:border-blue-300 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400">
              {isStudent ? 'Devoirs à rendre' : 'Devoirs publiés'}
            </span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-slate-800 mt-1">{kpiStats.todoCount}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {isStudent ? 'Cliquez pour filtrer vos devoirs à faire' : 'Total des devoirs actifs'}
          </p>
        </div>

        <div
          onClick={() => {
            setActiveTab('HOMEWORK');
            setFilterStatus(isStudent ? 'SUBMITTED' : 'TO_GRADE');
          }}
          className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm hover:border-amber-300 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400">
              {isStudent ? 'Mes dépôts envoyés' : 'Copies à corriger'}
            </span>
            <UploadCloud className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-slate-800 mt-1">
            {isStudent ? kpiStats.submittedCount : kpiStats.toGradeCount}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {isStudent ? 'Travaux transmis aux enseignants' : 'Cliquez pour voir les copies en attente'}
          </p>
        </div>

        <div
          onClick={() => {
            setActiveTab('HOMEWORK');
            setFilterStatus(isStudent ? 'GRADED' : 'ALL');
          }}
          className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm hover:border-emerald-300 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400">
              {isStudent ? 'Devoirs corrigés & notés' : 'Copies déjà corrigées'}
            </span>
            <Award className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-1">{kpiStats.gradedCount}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {isStudent ? 'Avec note et appréciation' : `Sur ${kpiStats.submittedCount} dépôts reçus`}
          </p>
        </div>

        <div
          onClick={() => setActiveTab('RESOURCES')}
          className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm hover:border-indigo-300 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400">Supports de cours</span>
            <BookOpen className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-indigo-700 mt-1">{kpiStats.resourcesCount}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">PDF, Slides, Exercices & TP</p>
        </div>
      </div>

      {/* Download confirmation toast */}
      {downloadNotice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{downloadNotice}</span>
          </div>
          <button onClick={() => setDownloadNotice('')} className="text-emerald-600 hover:underline cursor-pointer">
            Fermer
          </button>
        </div>
      )}

      {/* Navigation Tabs + Practical Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab('HOMEWORK')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'HOMEWORK' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              <FileText className="w-4 h-4" />
              Devoirs & Évaluations ({visibleHomework.length})
            </button>
            <button
              onClick={() => setActiveTab('RESOURCES')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'RESOURCES' ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              <Layers className="w-4 h-4" />
              Supports de Cours & Fichiers ({visibleResources.length})
            </button>
          </div>

          {(searchQuery || filterEcId !== 'ALL' || filterGroupId !== 'ALL' || filterStatus !== 'ALL' || filterResourceCategory !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterEcId('ALL');
                setFilterGroupId('ALL');
                setFilterStatus('ALL');
                setFilterResourceCategory('ALL');
              }}
              className="text-xs font-bold text-rose-600 hover:underline cursor-pointer self-start sm:self-auto"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>

        {/* Multi-criteria Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par titre, matière, mot-clé..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={filterEcId}
              onChange={(e) => setFilterEcId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 font-medium text-slate-700"
            >
              <option value="ALL">Toutes les matières (EC)</option>
              {ecs.map((ec) => (
                <option key={ec.id} value={ec.id}>
                  {ec.code} — {ec.title}
                </option>
              ))}
            </select>
          </div>

          {!isStudent && (
            <div>
              <select
                value={filterGroupId}
                onChange={(e) => setFilterGroupId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 font-medium text-slate-700"
              >
                <option value="ALL">Tous les groupes / promotions</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.level})
                  </option>
                ))}
              </select>
            </div>
          )}

          {activeTab === 'HOMEWORK' ? (
            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 font-medium text-slate-700"
              >
                <option value="ALL">Tous les statuts</option>
                {isStudent ? (
                  <>
                    <option value="TODO">À rendre (Non déposés)</option>
                    <option value="SUBMITTED">Déposés</option>
                    <option value="GRADED">Corrigés & Notés</option>
                  </>
                ) : (
                  <option value="TO_GRADE">Avec copies à corriger</option>
                )}
              </select>
            </div>
          ) : (
            <div>
              <select
                value={filterResourceCategory}
                onChange={(e) => setFilterResourceCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 font-medium text-slate-700"
              >
                <option value="ALL">Tous types de fichiers</option>
                <option value="PDF">Support PDF</option>
                <option value="SLIDES">Présentation / Slides</option>
                <option value="CODE">Code source / Exercices TP</option>
                <option value="VIDEO">Vidéo / Enregistrement</option>
                <option value="OTHER">Autre document</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* TAB 1: HOMEWORK & SUBMISSIONS */}
      {activeTab === 'HOMEWORK' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {visibleHomework.map((hw) => {
            const ec = ecs.find((e) => e.id === hw.ecId);
            const group = groups.find((g) => g.id === hw.groupId);
            const hwSubmissions = submissions.filter((s) => s.homeworkId === hw.id);
            const mySubmission = hwSubmissions.find((s) => s.studentId === currentUser.id);
            const isPastDue = new Date() > new Date(hw.dueDate);
            const { cleanText, attachmentName } = extractStatementAttachment(hw.instructions);

            return (
              <div
                key={hw.id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md transition-all"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                        {ec?.code} - {ec?.title}
                      </span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                        {group?.name}
                      </span>
                    </div>
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0 ${
                        isPastDue ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      Échéance : {new Date(hw.dueDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 mb-2">{hw.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200/60 mb-3 whitespace-pre-line">
                    {cleanText}
                  </p>

                  {/* 1-Click Download of Teacher's Assignment Statement Attachment */}
                  {attachmentName && (
                    <div className="mb-4 flex items-center justify-between bg-indigo-50/70 border border-indigo-200/80 px-3.5 py-2.5 rounded-xl">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                        <div className="truncate">
                          <p className="text-xs font-bold text-indigo-950 truncate">Énoncé joint : {attachmentName}</p>
                          <p className="text-[10px] text-indigo-600">Support / sujet officiel du devoir</p>
                        </div>
                      </div>
                      <button
                        onClick={() => triggerRealFileDownload(attachmentName, undefined, `Énoncé du devoir : ${hw.title}`)}
                        className="flex items-center gap-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg shadow-sm transition-colors cursor-pointer shrink-0"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Télécharger l'énoncé
                      </button>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-3">
                    <span>
                      Barème : <strong className="text-slate-700">/{hw.maxScore} pts</strong>
                    </span>
                    <span>
                      Retard toléré :{' '}
                      <strong className={hw.allowLateSubmission ? 'text-amber-600' : 'text-red-600'}>
                        {hw.allowLateSubmission ? 'Oui (Marqué en retard)' : 'Non (Fermé après délai)'}
                      </strong>
                    </span>
                  </div>

                  {/* Student Submission Status & Teacher Feedback */}
                  {isStudent && (
                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-2.5">
                      {mySubmission ? (
                        <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-emerald-900 truncate">
                                  Rendu déposé : {mySubmission.fileName}
                                </p>
                                <p className="text-[11px] text-emerald-700">
                                  Déposé le {new Date(mySubmission.submittedAt).toLocaleString('fr-FR')}
                                  {mySubmission.isLate && ' (En retard)'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={() =>
                                  triggerRealFileDownload(
                                    mySubmission.fileName,
                                    mySubmission.fileUrl,
                                    mySubmission.studentComment
                                  )
                                }
                                className="p-1.5 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                                title="Télécharger ma copie"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                              {mySubmission.grade !== undefined ? (
                                <div className="bg-white border border-emerald-300 px-3 py-1 rounded-lg text-right shadow-sm">
                                  <span className="text-[10px] text-slate-400 uppercase block font-bold">Note obtenue</span>
                                  <span className="text-sm font-black text-emerald-700">
                                    {mySubmission.grade} / {hw.maxScore}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs font-semibold bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full">
                                  En attente de correction
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Teacher Feedback prominently shown to student */}
                          {mySubmission.teacherFeedback && (
                            <div className="bg-white/90 border border-emerald-200/80 rounded-lg p-2.5 flex items-start gap-2">
                              <MessageSquare className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                              <div>
                                <span className="text-[10px] font-bold uppercase text-indigo-700 block">
                                  Appréciation & Correction de l'enseignant :
                                </span>
                                <p className="text-xs text-slate-700 mt-0.5">{mySubmission.teacherFeedback}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-amber-800 text-xs font-medium">
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>Vous n'avez pas encore déposé votre devoir.</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Teacher View: List of Submissions with Download & Grading */}
                  {isTeacherOrAdmin && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Dépôts Étudiants ({hwSubmissions.length})
                        </h4>
                        {hwSubmissions.some((s) => s.grade === undefined) && (
                          <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                            {hwSubmissions.filter((s) => s.grade === undefined).length} à corriger
                          </span>
                        )}
                      </div>
                      {hwSubmissions.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">Aucun rendu déposé pour le moment.</p>
                      ) : (
                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                          {hwSubmissions.map((sub) => (
                            <div
                              key={sub.id}
                              className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200/70 text-xs gap-2"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-800 truncate">{sub.studentName}</span>
                                  {sub.isLate && (
                                    <span className="text-[10px] font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded shrink-0">
                                      RETARD
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-slate-500 truncate">{sub.fileName}</span>
                                  <span className="text-[10px] text-slate-400">({sub.fileSize})</span>
                                </div>
                                {sub.teacherFeedback && (
                                  <p className="text-[10px] text-indigo-600 italic truncate mt-0.5">
                                    « {sub.teacherFeedback} »
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  onClick={() =>
                                    triggerRealFileDownload(
                                      sub.fileName,
                                      sub.fileUrl,
                                      `Copie de ${sub.studentName} - ${hw.title}`
                                    )
                                  }
                                  className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                                  title="Télécharger la copie de l'étudiant"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                                {sub.grade !== undefined && (
                                  <span className="font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                    {sub.grade}/{hw.maxScore}
                                  </span>
                                )}
                                <button
                                  onClick={() => {
                                    setSelectedSubForGrade(sub);
                                    setGradeInput(sub.grade ?? 15);
                                    setFeedbackInput(sub.teacherFeedback ?? '');
                                    setShowGradeModal(true);
                                  }}
                                  className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg transition-colors cursor-pointer"
                                >
                                  {sub.grade !== undefined ? 'Modifier' : 'Noter'}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Action Footer for Student */}
                {isStudent && (
                  <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200/70 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">
                      {mySubmission ? 'Vous pouvez remplacer votre fichier avant correction' : 'Formats acceptés : PDF, ZIP, DOCX, XLSX'}
                    </span>
                    <button
                      disabled={isPastDue && !hw.allowLateSubmission}
                      onClick={() => {
                        setSelectedHwForSubmit(hw);
                        setSubmissionFileName(mySubmission?.fileName || `${currentUser.name.replace(/\s+/g, '_')}_Rendu.pdf`);
                        setSubmissionComment(mySubmission?.studentComment || '');
                        setShowSubmitModal(true);
                      }}
                      className={`flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer ${
                        isPastDue && !hw.allowLateSubmission
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                      }`}
                    >
                      <UploadCloud className="w-4 h-4" />
                      {mySubmission ? 'Remplacer mon dépôt' : 'Déposer mon devoir'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {visibleHomework.length === 0 && (
            <div className="col-span-full bg-white rounded-2xl p-12 text-center border border-slate-200/80 text-slate-400">
              Aucun devoir ne correspond aux filtres sélectionnés.
            </div>
          )}
        </div>
      )}

      {/* TAB 2: LEARNING RESOURCES */}
      {activeTab === 'RESOURCES' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {visibleResources.map((res) => {
            const ec = ecs.find((e) => e.id === res.ecId);
            const group = groups.find((g) => g.id === res.groupId);

            const getCategoryIcon = () => {
              switch (res.category) {
                case 'PDF':
                  return <FileText className="w-6 h-6 text-rose-500" />;
                case 'SLIDES':
                  return <FileSpreadsheet className="w-6 h-6 text-amber-500" />;
                case 'CODE':
                  return <FileCode className="w-6 h-6 text-indigo-500" />;
                default:
                  return <File className="w-6 h-6 text-blue-500" />;
              }
            };

            return (
              <div
                key={res.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">{getCategoryIcon()}</div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                        {res.category}
                      </span>
                      {group && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                          {group.name}
                        </span>
                      )}
                      {isTeacherOrAdmin && (
                        <button
                          onClick={() => deleteLearningResource(res.id)}
                          className="p-1 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                          title="Supprimer la ressource"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <span className="text-[11px] font-bold text-blue-600 block mb-1">
                    {ec?.code} — {ec?.title}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mb-1.5">{res.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed mb-4">{res.description}</p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-[11px] text-slate-400 truncate max-w-[170px]">
                    <span className="font-semibold text-slate-600">{res.fileName}</span> ({res.fileSize})
                  </div>
                  <button
                    onClick={() => triggerRealFileDownload(res.fileName, res.fileUrl, res.description)}
                    className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Télécharger
                  </button>
                </div>
              </div>
            );
          })}
          {visibleResources.length === 0 && (
            <div className="col-span-full bg-white rounded-2xl p-12 text-center border border-slate-200/80 text-slate-400">
              Aucun support de cours ne correspond aux filtres sélectionnés.
            </div>
          )}
        </div>
      )}

      {/* MODAL: CREATE HOMEWORK */}
      {showCreateHwModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Assigner un Nouveau Devoir</h3>
            <form onSubmit={handleCreateHomeworkSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Élément Constitutif (EC)</label>
                  <select
                    value={hwForm.ecId}
                    onChange={(e) => setHwForm({ ...hwForm, ecId: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2"
                  >
                    {ecs.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.code} - {e.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Promotion Cible</label>
                  <select
                    value={hwForm.groupId}
                    onChange={(e) => setHwForm({ ...hwForm, groupId: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2"
                  >
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Titre du Devoir / Projet</label>
                <input
                  type="text"
                  required
                  value={hwForm.title}
                  onChange={(e) => setHwForm({ ...hwForm, title: e.target.value })}
                  placeholder="Ex: TP N°2 - Arbres Binaires de Recherche"
                  className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Consignes & Barème détaillé</label>
                <textarea
                  rows={3}
                  required
                  value={hwForm.instructions}
                  onChange={(e) => setHwForm({ ...hwForm, instructions: e.target.value })}
                  placeholder="Précisez le format attendu et les critères d'évaluation..."
                  className="w-full text-xs border border-slate-300 rounded-xl p-3"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Joindre un fichier d'énoncé (Optionnel - Max {storageConfig.maxFileSizeMb} Mo)
                </label>
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/40 rounded-xl p-3 cursor-pointer transition-colors">
                  <UploadCloud className="w-5 h-5 text-indigo-600 mb-1" />
                  <span className="text-xs font-bold text-indigo-900">
                    {hwForm.attachmentFileName ? hwForm.attachmentFileName : 'Parcourir pour joindre le sujet (PDF, DOCX, ZIP)...'}
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const objectUrl = URL.createObjectURL(file);
                      setHwForm({
                        ...hwForm,
                        attachmentFileName: file.name,
                        attachmentFileUrl: objectUrl,
                      });
                    }}
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Date & Heure Limite</label>
                  <input
                    type="datetime-local"
                    required
                    value={hwForm.dueDate}
                    onChange={(e) => setHwForm({ ...hwForm, dueDate: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hwForm.allowLateSubmission}
                      onChange={(e) => setHwForm({ ...hwForm, allowLateSubmission: e.target.checked })}
                      className="rounded text-blue-600"
                    />
                    Autoriser les dépôts en retard
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateHwModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow cursor-pointer"
                >
                  Publier le Devoir
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SUBMIT HOMEWORK (STUDENT) */}
      {showSubmitModal && selectedHwForSubmit && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Dépôt de Travail</h3>
            <p className="text-xs text-slate-500 mb-4">{selectedHwForSubmit.title}</p>
            <form onSubmit={handleSubmitHomeworkAction} className="space-y-4">
              {uploadError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-700">
                  {uploadError}
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Sélectionner votre fichier depuis votre appareil (Max {storageConfig.maxFileSizeMb} Mo)
                </label>
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-blue-300 hover:border-blue-500 bg-blue-50/40 rounded-xl p-4 cursor-pointer transition-colors">
                  <UploadCloud className="w-7 h-7 text-blue-600 mb-1" />
                  <span className="text-xs font-bold text-blue-900">
                    {submissionFileName ? submissionFileName : 'Cliquez pour parcourir vos fichiers...'}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-0.5">
                    Extensions autorisées : {storageConfig.allowedExtensions.join(', ')} ({submissionFileSize})
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      setUploadError('');
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const ext = file.name.split('.').pop()?.toUpperCase() || '';
                      if (
                        storageConfig.allowedExtensions.length > 0 &&
                        !storageConfig.allowedExtensions.includes(ext)
                      ) {
                        setUploadError(
                          `Extension .${ext} refusée. Formats autorisés : ${storageConfig.allowedExtensions.join(', ')}`
                        );
                        return;
                      }
                      if (file.size > storageConfig.maxFileSizeMb * 1024 * 1024) {
                        setUploadError(
                          `Fichier trop volumineux (${(file.size / (1024 * 1024)).toFixed(2)} Mo). Limite : ${storageConfig.maxFileSizeMb} Mo.`
                        );
                        return;
                      }
                      const objectUrl = URL.createObjectURL(file);
                      setSubmissionFileName(file.name);
                      setSubmissionFileBytes(file.size);
                      setSubmissionFileSize(`${(file.size / (1024 * 1024)).toFixed(2)} MB`);
                      setSubmissionFileUrl(objectUrl);
                    }}
                  />
                </label>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Nom du fichier (modifiable)</label>
                <input
                  type="text"
                  required
                  value={submissionFileName}
                  onChange={(e) => setSubmissionFileName(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Commentaire pour l'enseignant</label>
                <textarea
                  rows={2}
                  value={submissionComment}
                  onChange={(e) => setSubmissionComment(e.target.value)}
                  placeholder="Remarques éventuelles sur votre rendu..."
                  className="w-full text-xs border border-slate-300 rounded-xl p-3"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  Envoyer mon devoir
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: GRADE SUBMISSION (TEACHER) */}
      {showGradeModal && selectedSubForGrade && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-2 text-indigo-600 mb-1">
              <Award className="w-5 h-5" />
              <h3 className="text-lg font-bold text-slate-900">Correction & Notation</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Étudiant : <strong>{selectedSubForGrade.studentName}</strong> ({selectedSubForGrade.fileName})
            </p>
            <form onSubmit={handleGradeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Note attribuée (/20)</label>
                <input
                  type="number"
                  min={0}
                  max={20}
                  step={0.25}
                  required
                  value={gradeInput}
                  onChange={(e) => setGradeInput(Number(e.target.value))}
                  className="w-full text-sm font-bold border border-slate-300 rounded-xl px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Appréciation & Correction</label>
                <textarea
                  rows={3}
                  value={feedbackInput}
                  onChange={(e) => setFeedbackInput(e.target.value)}
                  placeholder="Points forts, axes d'amélioration..."
                  className="w-full text-xs border border-slate-300 rounded-xl p-3"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGradeModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow cursor-pointer"
                >
                  Enregistrer la Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD LEARNING RESOURCE */}
      {showAddResourceModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Publier un Support de Cours</h3>
            <form onSubmit={handleAddResourceSubmit} className="space-y-4">
              {uploadError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-700">
                  {uploadError}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Matière (EC)</label>
                  <select
                    value={resourceForm.ecId}
                    onChange={(e) => setResourceForm({ ...resourceForm, ecId: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2"
                  >
                    {ecs.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.code} - {e.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Catégorie de Fichier</label>
                  <select
                    value={resourceForm.category}
                    onChange={(e) =>
                      setResourceForm({ ...resourceForm, category: e.target.value as LearningResource['category'] })
                    }
                    className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2"
                  >
                    <option value="PDF">Support PDF</option>
                    <option value="SLIDES">Présentation / Slides</option>
                    <option value="CODE">Code Source / Exercices</option>
                    <option value="VIDEO">Capsule Vidéo</option>
                    <option value="OTHER">Autre Document</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Titre du Support</label>
                <input
                  type="text"
                  required
                  value={resourceForm.title}
                  onChange={(e) => setResourceForm({ ...resourceForm, title: e.target.value })}
                  placeholder="Ex: Chapitre 4 - Programmation Dynamique"
                  className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Description pédagogique</label>
                <textarea
                  rows={2}
                  required
                  value={resourceForm.description}
                  onChange={(e) => setResourceForm({ ...resourceForm, description: e.target.value })}
                  placeholder="Résumé du contenu..."
                  className="w-full text-xs border border-slate-300 rounded-xl p-3"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Importer un fichier local (Max {storageConfig.maxFileSizeMb} Mo)
                </label>
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/40 rounded-xl p-3 cursor-pointer transition-colors mb-2">
                  <UploadCloud className="w-6 h-6 text-emerald-600 mb-1" />
                  <span className="text-xs font-bold text-emerald-900">
                    Choisir un fichier depuis votre ordinateur...
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Formats acceptés : {storageConfig.allowedExtensions.join(', ')}
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      setUploadError('');
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const ext = file.name.split('.').pop()?.toUpperCase() || '';
                      if (
                        storageConfig.allowedExtensions.length > 0 &&
                        !storageConfig.allowedExtensions.includes(ext)
                      ) {
                        setUploadError(
                          `Extension .${ext} non autorisée (${storageConfig.allowedExtensions.join(', ')})`
                        );
                        return;
                      }
                      if (file.size > storageConfig.maxFileSizeMb * 1024 * 1024) {
                        setUploadError(
                          `Fichier trop lourd (${(file.size / (1024 * 1024)).toFixed(2)} Mo). Max: ${storageConfig.maxFileSizeMb} Mo.`
                        );
                        return;
                      }
                      const objectUrl = URL.createObjectURL(file);
                      setResourceForm({
                        ...resourceForm,
                        fileName: file.name,
                        fileSizeBytes: file.size,
                        fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
                        fileUrl: objectUrl,
                      });
                    }}
                  />
                </label>
                <input
                  type="text"
                  required
                  value={resourceForm.fileName}
                  onChange={(e) => setResourceForm({ ...resourceForm, fileName: e.target.value })}
                  className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddResourceModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow cursor-pointer"
                >
                  Mettre en ligne
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
