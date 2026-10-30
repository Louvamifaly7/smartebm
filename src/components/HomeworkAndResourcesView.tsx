import React, { useState } from 'react';
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

  // Enforce strict class/group access control for students (ACC-026)
  const visibleHomework = isStudent
    ? homework.filter((h) => (currentUser.groupId ? h.groupId === currentUser.groupId : false))
    : homework;

  const visibleResources = isStudent
    ? learningResources.filter((r) => !r.isArchived && (currentUser.groupId ? r.groupId === currentUser.groupId : false))
    : learningResources.filter((r) => !r.isArchived);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-blue-900 text-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 px-2.5 py-0.5 rounded text-xs font-semibold uppercase">
              Espace Travaux & Ressources
            </span>
            <span className="text-xs text-slate-300">Pédagogie EBM Institute</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Devoirs, Rendus & Supports Pédagogiques</h1>
          <p className="text-slate-300 text-sm mt-1">
            Consultez les devoirs assignés, déposez vos travaux avant échéance et téléchargez les supports de cours magistraux.
          </p>
        </div>

        {isTeacherOrAdmin && (
          <div className="flex items-center gap-2">
            {activeTab === 'HOMEWORK' ? (
              <button
                onClick={() => setShowCreateHwModal(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg transition-all cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" />
                Assigner un devoir
              </button>
            ) : (
              <button
                onClick={() => setShowAddResourceModal(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg transition-all cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" />
                Ajouter un support
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('HOMEWORK')}
          className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm border-b-2 transition-colors ${
            activeTab === 'HOMEWORK'
              ? 'border-indigo-600 text-indigo-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          Devoirs & Évaluations ({visibleHomework.length})
        </button>
        <button
          onClick={() => setActiveTab('RESOURCES')}
          className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm border-b-2 transition-colors ${
            activeTab === 'RESOURCES'
              ? 'border-indigo-600 text-indigo-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          Supports Pédagogiques & Fichiers ({visibleResources.length})
        </button>
      </div>

      {/* TAB 1: HOMEWORK */}
      {activeTab === 'HOMEWORK' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {visibleHomework.length === 0 ? (
              <div className="col-span-2 bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-400">
                <FileText className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-semibold">Aucun devoir assigné pour votre groupe actuellement.</p>
              </div>
            ) : (
              visibleHomework.map((hw) => {
                const ec = ecs.find((e) => e.id === hw.ecId);
                const group = groups.find((g) => g.id === hw.groupId);
                const isPastDue = Date.now() > new Date(hw.dueDate).getTime();
                const mySubmission = submissions.find((s) => s.homeworkId === hw.id && s.studentId === currentUser.id);
              const hwSubmissions = submissions.filter((s) => s.homeworkId === hw.id);

              return (
                <div
                  key={hw.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4 hover:border-indigo-300 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200">
                        {ec?.code} • {group?.code}
                      </span>

                      <div className="flex items-center gap-1.5 text-xs">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span className={`font-semibold ${isPastDue ? 'text-rose-600' : 'text-slate-600'}`}>
                          {isPastDue ? 'Échu le' : 'Date limite :'} {new Date(hw.dueDate).toLocaleString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>

                    <h3 className="font-bold text-base text-slate-800">{hw.title}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">{hw.instructions}</p>
                  </div>

                  {/* Student View: Submission Status */}
                  {isStudent && (
                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      {mySubmission ? (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          <div className="text-xs">
                            <span className="font-bold text-slate-800 block">Travail déposé</span>
                            <span className="text-slate-400 text-[10px]">
                              {mySubmission.fileName} • {mySubmission.isGraded ? `Note: ${mySubmission.grade}/20` : 'En attente de notation'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-amber-600 font-semibold flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4" />
                          <span>Non déposé</span>
                        </div>
                      )}

                      <button
                        onClick={() => {
                          setSelectedHwForSubmit(hw);
                          setShowSubmitModal(true);
                        }}
                        className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                          mySubmission
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                        }`}
                      >
                        <UploadCloud className="w-4 h-4" />
                        {mySubmission ? 'Remplacer le fichier' : 'Déposer mon travail'}
                      </button>
                    </div>
                  )}

                  {/* Teacher View: Submissions Counter & Quick Grading */}
                  {isTeacherOrAdmin && (
                    <div className="pt-4 border-t border-slate-100 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-semibold">
                          Rendus reçus : <span className="font-bold text-slate-800">{hwSubmissions.length}</span>
                        </span>
                        <span className="text-emerald-700 font-semibold">
                          Notés : {hwSubmissions.filter((s) => s.isGraded).length} / {hwSubmissions.length}
                        </span>
                      </div>

                      {hwSubmissions.length > 0 && (
                        <div className="space-y-1.5">
                          {hwSubmissions.map((sub) => (
                            <div
                              key={sub.id}
                              className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                            >
                              <div>
                                <span className="font-bold text-slate-800">{sub.studentName}</span>
                                <div className="text-[10px] text-slate-400">
                                  {sub.fileName} • {sub.isLate ? '⚠️ En retard' : 'À temps'}
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                {sub.isGraded ? (
                                  <span className="font-black text-emerald-600 text-xs">{sub.grade} / 20</span>
                                ) : (
                                  <span className="text-amber-600 text-[10px] font-bold">À noter</span>
                                )}

                                <button
                                  onClick={() => {
                                    setSelectedSubForGrade(sub);
                                    setGradeInput(sub.grade || 15);
                                    setFeedbackInput(sub.teacherFeedback || '');
                                    setShowGradeModal(true);
                                  }}
                                  className="bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer"
                                >
                                  Évaluer
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
        </div>
      )}

      {/* TAB 2: LEARNING RESOURCES */}
      {activeTab === 'RESOURCES' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {visibleResources.length === 0 ? (
              <div className="col-span-3 bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-400">
                <Layers className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-semibold">Aucun support pédagogique disponible pour votre groupe actuellement.</p>
              </div>
            ) : (
              visibleResources.map((res) => {
                const ec = ecs.find((e) => e.id === res.ecId);

              return (
                <div
                  key={res.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                        {ec?.code}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{res.publishedAt}</span>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                        {res.category === 'CODE' ? (
                          <FileCode className="w-5 h-5 text-indigo-600" />
                        ) : res.category === 'SLIDES' ? (
                          <FileSpreadsheet className="w-5 h-5 text-amber-600" />
                        ) : (
                          <FileText className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-slate-800">{res.title}</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{res.description}</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[10px] text-slate-400 font-mono">
                      {res.fileName} {res.fileSize ? `(${res.fileSize})` : ''}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {isTeacherOrAdmin && (
                        <button
                          onClick={() => deleteLearningResource(res.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => triggerRealFileDownload(res.fileName, res.fileUrl, res.description)}
                        className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-2.5 py-1 rounded-lg transition-colors cursor-pointer text-[11px]"
                      >
                        <Download className="w-3.5 h-3.5 text-blue-600" />
                        Télécharger
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        </div>
      )}

      {downloadNotice && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-900 text-white px-4 py-2.5 rounded-xl shadow-xl border border-emerald-500 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{downloadNotice}</span>
        </div>
      )}

      {/* MODAL: Assigner un devoir */}
      {showCreateHwModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateHomeworkSubmit}
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Assigner un Nouveau Devoir</h3>
                <p className="text-xs text-slate-500">Dépôt et notation sur 20 • Pièce jointe énoncé depuis votre appareil</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Élément Constitutif (EC) :</label>
                  <select
                    value={hwForm.ecId}
                    onChange={(e) => setHwForm({ ...hwForm, ecId: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 font-bold"
                  >
                    {ecs.map((ec) => (
                      <option key={ec.id} value={ec.id}>
                        {ec.code} - {ec.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Groupe cible :</label>
                  <select
                    value={hwForm.groupId}
                    onChange={(e) => setHwForm({ ...hwForm, groupId: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 font-bold"
                  >
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.code} ({g.name})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Titre du devoir :</label>
                <input
                  type="text"
                  required
                  placeholder="ex: TP 02 : Arbres AVL & Équilibrage"
                  value={hwForm.title}
                  onChange={(e) => setHwForm({ ...hwForm, title: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 font-medium"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Consignes et barème :</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Détaillez les objectifs, contraintes de rendu (format zip/pdf), et critères..."
                  value={hwForm.instructions}
                  onChange={(e) => setHwForm({ ...hwForm, instructions: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
              </div>

              {/* Sélecteur de fichier réel depuis l'appareil (ACC-019) */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <label className="font-bold text-slate-700 block">
                  Joindre un sujet / énoncé depuis l'appareil (PDF, DOCX, ZIP...) :
                </label>
                <input
                  type="file"
                  accept=".pdf,.docx,.xlsx,.pptx,.jpg,.png,.zip"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setHwForm((prev) => ({
                        ...prev,
                        attachmentFileName: file.name,
                        attachmentFileUrl: URL.createObjectURL(file),
                      }));
                    }
                  }}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-100 file:text-indigo-700 hover:file:bg-indigo-200 cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Date et heure limite :</label>
                  <input
                    type="datetime-local"
                    required
                    value={hwForm.dueDate}
                    onChange={(e) => setHwForm({ ...hwForm, dueDate: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 font-bold"
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="lateCheck"
                    checked={hwForm.allowLateSubmission}
                    onChange={(e) => setHwForm({ ...hwForm, allowLateSubmission: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <label htmlFor="lateCheck" className="font-semibold text-slate-700 cursor-pointer">
                    Autoriser les retards
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateHwModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md cursor-pointer"
              >
                Créer & publier le devoir
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Déposer mon travail (Étudiant - ACC-020, ACC-022, ACC-023) */}
      {showSubmitModal && selectedHwForSubmit && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSubmitHomeworkAction}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Dépôt de Devoir Officiel</h3>
                <p className="text-xs text-slate-500">{selectedHwForSubmit.title}</p>
              </div>
            </div>

            {uploadError && (
              <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs font-bold text-rose-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                <label className="font-bold text-emerald-950 block">
                  1. Choisir un fichier depuis votre appareil :
                </label>
                <input
                  type="file"
                  onChange={(e) => {
                    setUploadError('');
                    const file = e.target.files?.[0];
                    if (file) {
                      setSubmissionFileName(file.name);
                      setSubmissionFileBytes(file.size);
                      setSubmissionFileSize(`${(file.size / (1024 * 1024)).toFixed(2)} MB`);
                      setSubmissionFileUrl(URL.createObjectURL(file));
                    }
                  }}
                  className="w-full text-xs text-slate-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer"
                />
                <div className="text-[10px] text-slate-500">
                  Formats autorisés : <strong>{storageConfig.allowedExtensions.join(', ')}</strong> • Taille max : <strong>{storageConfig.maxFileSizeMb} Mo</strong>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nom du fichier téléversé :</label>
                <input
                  type="text"
                  placeholder={`${currentUser.name.replace(/\s+/g, '_')}_Devoir.zip`}
                  value={submissionFileName}
                  onChange={(e) => {
                    setUploadError('');
                    setSubmissionFileName(e.target.value);
                  }}
                  className="w-full border border-slate-300 rounded-lg p-2 font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Commentaire à destination de l'enseignant :</label>
                <textarea
                  rows={3}
                  placeholder="Remarques éventuelles sur vos tests, bibliothèque utilisée..."
                  value={submissionComment}
                  onChange={(e) => setSubmissionComment(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setUploadError('');
                  setShowSubmitModal(false);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md cursor-pointer"
              >
                Confirmer le dépôt
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Évaluer un devoir (Enseignant) */}
      {showGradeModal && selectedSubForGrade && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleGradeSubmit}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Évaluer le travail</h3>
                <p className="text-xs text-slate-500">Étudiant : {selectedSubForGrade.studentName}</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-600 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800">Fichier soumis :</span> {selectedSubForGrade.fileName}
                  {selectedSubForGrade.studentComment && (
                    <p className="italic text-slate-500 mt-1">"{selectedSubForGrade.studentComment}"</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => triggerRealFileDownload(selectedSubForGrade.fileName, selectedSubForGrade.fileUrl, selectedSubForGrade.studentComment)}
                  className="px-2.5 py-1 bg-blue-600 text-white font-bold rounded-lg text-[10px] flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3 h-3" />
                  Télécharger
                </button>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Note attribuée (/20) :</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="20"
                  required
                  value={gradeInput}
                  onChange={(e) => setGradeInput(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded-lg p-2 font-black text-lg text-blue-600 text-center"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Feedback pédagogique :</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Commentaire de correction..."
                  value={feedbackInput}
                  onChange={(e) => setFeedbackInput(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowGradeModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md cursor-pointer"
              >
                Enregistrer la note
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Ajouter support pédagogique (ACC-019, ACC-022, ACC-023) */}
      {showAddResourceModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleAddResourceSubmit}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Ajouter un Support de Cours</h3>
                <p className="text-xs text-slate-500">Téléversement direct depuis votre appareil</p>
              </div>
            </div>

            {uploadError && (
              <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs font-bold text-rose-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Élément Constitutif (EC) :</label>
                  <select
                    value={resourceForm.ecId}
                    onChange={(e) => setResourceForm({ ...resourceForm, ecId: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 font-bold"
                  >
                    {ecs.map((ec) => (
                      <option key={ec.id} value={ec.id}>
                        {ec.code} - {ec.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Groupe / Classe cible :</label>
                  <select
                    value={resourceForm.groupId}
                    onChange={(e) => setResourceForm({ ...resourceForm, groupId: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 font-bold"
                  >
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.code} ({g.name})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Titre de la ressource :</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Chapitre 4 - Algorithmes de tri"
                  value={resourceForm.title}
                  onChange={(e) => setResourceForm({ ...resourceForm, title: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl space-y-1.5">
                <label className="font-bold text-purple-950 block">
                  Sélectionner le fichier depuis votre appareil :
                </label>
                <input
                  type="file"
                  onChange={(e) => {
                    setUploadError('');
                    const file = e.target.files?.[0];
                    if (file) {
                      setResourceForm((prev) => ({
                        ...prev,
                        fileName: file.name,
                        fileSizeBytes: file.size,
                        fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
                        fileUrl: URL.createObjectURL(file),
                        title: prev.title || file.name.replace(/\.[^/.]+$/, ''),
                      }));
                    }
                  }}
                  className="w-full text-xs text-slate-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-purple-600 file:text-white hover:file:bg-purple-700 cursor-pointer"
                />
                <div className="text-[10px] text-slate-500">
                  Extensions autorisées : <strong>{storageConfig.allowedExtensions.join(', ')}</strong> • Max : <strong>{storageConfig.maxFileSizeMb} Mo</strong>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Type de document :</label>
                  <select
                    value={resourceForm.category}
                    onChange={(e) => setResourceForm({ ...resourceForm, category: e.target.value as LearningResource['category'] })}
                    className="w-full border border-slate-300 rounded-lg p-2 font-semibold"
                  >
                    <option value="PDF">Document PDF</option>
                    <option value="SLIDES">Diapositives / Présentation</option>
                    <option value="CODE">Code source / Archive</option>
                    <option value="VIDEO">Vidéo / Enregistrement</option>
                    <option value="LINK">Lien web documentaire</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Nom du fichier :</label>
                  <input
                    type="text"
                    required
                    value={resourceForm.fileName}
                    onChange={(e) => {
                      setUploadError('');
                      setResourceForm({ ...resourceForm, fileName: e.target.value });
                    }}
                    className="w-full border border-slate-300 rounded-lg p-2 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Description pédagogique :</label>
                <textarea
                  rows={2}
                  placeholder="Brève synthèse du contenu..."
                  value={resourceForm.description}
                  onChange={(e) => setResourceForm({ ...resourceForm, description: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setUploadError('');
                  setShowAddResourceModal(false);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-md cursor-pointer"
              >
                Ajouter la ressource
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
