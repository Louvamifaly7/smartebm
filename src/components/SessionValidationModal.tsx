import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  SessionReportAttachment,
  SessionReportAttachmentCategory,
  SessionReportStatus,
} from '../types';
import {
  CheckCircle2,
  AlertTriangle,
  X,
  ShieldCheck,
  Clock,
  Calendar,
  MapPin,
  Users,
  User,
  Paperclip,
  Plus,
  Trash2,
  Send,
  Save,
  Eye,
  Lock,
  Ban,
} from 'lucide-react';
import { showAppToast } from './ToastAndConfirmCenter';

interface SessionValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
}

const CANCELLATION_CATEGORY_LABELS: Record<
  'ABSENT_UNNOTIFIED' | 'ABSENT_NOTIFIED' | 'TECHNICAL_ISSUE' | 'FORCE_MAJEURE' | 'OTHER',
  string
> = {
  ABSENT_UNNOTIFIED: 'Enseignant absent sans avoir prévenu (Absence non signalée)',
  ABSENT_NOTIFIED: "Enseignant absent (ayant prévenu l'administration)",
  TECHNICAL_ISSUE: 'Problème technique ou salle indisponible',
  FORCE_MAJEURE: 'Force majeure / Intempéries / Événement institutionnel',
  OTHER: "Autre motif d'annulation",
};

export const SessionValidationModal: React.FC<SessionValidationModalProps> = ({
  isOpen,
  onClose,
  sessionId,
}) => {
  const {
    sessions,
    courses,
    rooms,
    users,
    groups,
    ues,
    filieres,
    parcours,
    validateSession,
    requestCorrection,
    publishSessionReport,
    getSessionPrivateReport,
    currentUser,
  } = useApp();

  const session = sessions.find((s) => s.id === sessionId);
  const privateReport = sessionId ? getSessionPrivateReport(sessionId) : undefined;
  const course = courses.find((c) => c.id === session?.courseId);
  const ue = ues.find((u) => u.id === course?.ueId);
  const filiere = filieres.find((f) => f.id === course?.filiereId);
  const parc = parcours.find((p) => p.id === (course?.parcoursId || ue?.parcoursId));
  const room = rooms.find((r) => r.id === session?.roomId);
  const teacher = users.find((u) => u.id === session?.teacherId);

  const isAdminOrDirection = ['ADMIN', 'ACADEMIC_HEAD', 'SCOLARITE', 'SCHEDULER'].includes(
    currentUser.role
  );
  const canViewConfidentialRemarks =
    isAdminOrDirection || (currentUser.role === 'TEACHER' && session?.teacherId === currentUser.id);

  const groupNames = session?.groupIds
    .map((gid) => groups.find((g) => g.id === gid)?.code || gid)
    .join(', ');

  // Form state — Pedagogical & Public fields
  const [chapterTitle, setChapterTitle] = useState('');
  const [objectives, setObjectives] = useState('');
  const [plannedContent, setPlannedContent] = useState('');
  const [content, setContent] = useState('');
  const [keyTakeaways, setKeyTakeaways] = useState('');
  const [pedagogicalMethods, setPedagogicalMethods] = useState('');
  const [exercisesAndPracticalWork, setExercisesAndPracticalWork] = useState('');
  const [homework, setHomework] = useState('');
  const [nextSessionPlan, setNextSessionPlan] = useState('');
  const [actualHours, setActualHours] = useState<number>(2);
  const [attachments, setAttachments] = useState<SessionReportAttachment[]>([]);

  // Form state — Confidential / Internal fields & Cancellation during validation
  const [isCancelledCourse, setIsCancelledCourse] = useState(false);
  const [cancellationCategory, setCancellationCategory] = useState<
    'ABSENT_UNNOTIFIED' | 'ABSENT_NOTIFIED' | 'TECHNICAL_ISSUE' | 'FORCE_MAJEURE' | 'OTHER'
  >('ABSENT_UNNOTIFIED');
  const [difficultiesEncountered, setDifficultiesEncountered] = useState('');
  const [remarks, setRemarks] = useState('');
  const [directionObservations, setDirectionObservations] = useState('');
  const [teacherPresence, setTeacherPresence] = useState<
    'PRESENT' | 'LATE' | 'REPLACED' | 'ABSENT_UNNOTIFIED' | 'ABSENT_NOTIFIED'
  >('PRESENT');
  const [replacementName, setReplacementName] = useState('');
  const [incident, setIncident] = useState('');
  const [certified, setCertified] = useState(false);
  const [revisionReason, setRevisionReason] = useState('');

  // Attachment adder state
  const [newAttTitle, setNewAttTitle] = useState('');
  const [newAttCategory, setNewAttCategory] =
    useState<SessionReportAttachmentCategory>('SUPPORT_COURS');
  const [newAttAllowStudent, setNewAttAllowStudent] = useState(true);
  const [newAttFileName, setNewAttFileName] = useState('');
  const [newAttFileUrl, setNewAttFileUrl] = useState('');
  const [newAttFileSize, setNewAttFileSize] = useState('');

  // Correction / Rejection mode
  const [isAskingCorrection, setIsAskingCorrection] = useState(false);
  const [isRejectionMode, setIsRejectionMode] = useState(false);
  const [correctionReason, setCorrectionReason] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [showRevisionHistory, setShowRevisionHistory] = useState(false);

  const contentRef = useRef<HTMLTextAreaElement>(null);

  const wasAlreadyPublished = Boolean(
    session?.report &&
      (session.report.reportStatus === 'PUBLISHED' ||
        (!session.report.reportStatus && session.status === 'COMPLETED_VALIDATED'))
  );

  useEffect(() => {
    if (isOpen && session) {
      const initialPresence =
        privateReport?.teacherPresence ?? session.report?.teacherPresence ?? 'PRESENT';
      const initialCancelled =
        session.status === 'CANCELLED' ||
        initialPresence === 'ABSENT_UNNOTIFIED' ||
        initialPresence === 'ABSENT_NOTIFIED';
      const initialCancelCat =
        privateReport?.cancellationCategory ??
        session.cancellationCategory ??
        (initialPresence === 'ABSENT_NOTIFIED' ? 'ABSENT_NOTIFIED' : 'ABSENT_UNNOTIFIED');

      setIsCancelledCourse(initialCancelled);
      setCancellationCategory(initialCancelCat);
      setChapterTitle(session.report?.chapterTitle || '');
      setObjectives(session.report?.objectives || '');
      setPlannedContent(session.report?.plannedContent || '');
      setContent(session.report?.content || '');
      setKeyTakeaways(session.report?.keyTakeaways || '');
      setPedagogicalMethods(session.report?.pedagogicalMethods || '');
      setExercisesAndPracticalWork(session.report?.exercisesAndPracticalWork || '');
      setHomework(session.report?.homework || '');
      setNextSessionPlan(session.report?.nextSessionPlan || '');
      setActualHours(
        initialCancelled ? 0 : session.report?.actualHours ?? session.durationHours ?? 2
      );
      setAttachments(session.report?.attachments || []);

      setDifficultiesEncountered(
        privateReport?.difficultiesEncountered ?? session.report?.difficultiesEncountered ?? ''
      );
      setRemarks(privateReport?.remarks ?? session.report?.remarks ?? '');
      setDirectionObservations(
        privateReport?.directionObservations ?? session.report?.directionObservations ?? ''
      );
      setTeacherPresence(initialPresence);
      setReplacementName(
        privateReport?.replacementName ?? session.report?.replacementName ?? ''
      );
      setIncident(privateReport?.incident ?? session.report?.incident ?? '');
      setCertified(Boolean(session.report) || initialCancelled);
      setRevisionReason('');
      setIsAskingCorrection(false);
      setIsRejectionMode(false);
      setCorrectionReason('');
      setFormError(null);

      setTimeout(() => {
        contentRef.current?.focus();
      }, 100);
    }
  }, [isOpen, sessionId, session, privateReport]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !session) return null;

  const revisions = privateReport?.revisions || session.report?.revisions || [];

  const handleToggleCancelledMode = (cancelled: boolean) => {
    setFormError(null);
    setIsCancelledCourse(cancelled);
    if (cancelled) {
      setActualHours(0);
      setCertified(true);
      if (teacherPresence !== 'ABSENT_UNNOTIFIED' && teacherPresence !== 'ABSENT_NOTIFIED') {
        setTeacherPresence('ABSENT_UNNOTIFIED');
        setCancellationCategory('ABSENT_UNNOTIFIED');
      }
      if (!content.trim() || content.trim().length < 20) {
        setContent(
          'Séance annulée (0h réalisée) — Cours non assuré à la date prévue et reporté à une séance de rattrapage.'
        );
      }
    } else {
      setActualHours(
        session.report?.actualHours && session.report.actualHours > 0
          ? session.report.actualHours
          : session.durationHours || 2
      );
      if (teacherPresence === 'ABSENT_UNNOTIFIED' || teacherPresence === 'ABSENT_NOTIFIED') {
        setTeacherPresence('PRESENT');
      }
    }
  };

  const handleCancellationCategoryChange = (
    cat: 'ABSENT_UNNOTIFIED' | 'ABSENT_NOTIFIED' | 'TECHNICAL_ISSUE' | 'FORCE_MAJEURE' | 'OTHER'
  ) => {
    setCancellationCategory(cat);
    if (cat === 'ABSENT_UNNOTIFIED') {
      setTeacherPresence('ABSENT_UNNOTIFIED');
    } else if (cat === 'ABSENT_NOTIFIED') {
      setTeacherPresence('ABSENT_NOTIFIED');
    } else if (teacherPresence === 'ABSENT_UNNOTIFIED' || teacherPresence === 'ABSENT_NOTIFIED') {
      setTeacherPresence('PRESENT');
    }
  };

  const handleTeacherPresenceChange = (
    pres: 'PRESENT' | 'LATE' | 'REPLACED' | 'ABSENT_UNNOTIFIED' | 'ABSENT_NOTIFIED'
  ) => {
    setTeacherPresence(pres);
    if (pres === 'ABSENT_UNNOTIFIED' || pres === 'ABSENT_NOTIFIED') {
      setIsCancelledCourse(true);
      setActualHours(0);
      setCertified(true);
      setCancellationCategory(pres);
      if (!content.trim() || content.trim().length < 20) {
        setContent(
          'Séance annulée (0h réalisée) — Cours non assuré à la date prévue et reporté à une séance de rattrapage.'
        );
      }
    }
  };

  const formatDateTimeFr = (iso?: string) => {
    if (!iso) return 'N/A';
    try {
      return new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Indian/Antananarivo',
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNewAttFileName(file.name);
    if (!newAttTitle.trim()) {
      setNewAttTitle(file.name.replace(/\.[^/.]+$/, ''));
    }
    const sizeKb = Math.max(1, Math.round(file.size / 1024));
    setNewAttFileSize(sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} Mo` : `${sizeKb} Ko`);

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setNewAttFileUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddAttachment = () => {
    if (!newAttTitle.trim() && !newAttFileName.trim()) {
      setFormError('Veuillez renseigner un titre ou sélectionner un fichier joint.');
      return;
    }
    const item: SessionReportAttachment = {
      id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: newAttTitle.trim() || newAttFileName.trim(),
      category: newAttCategory,
      fileName: newAttFileName.trim() || `${newAttTitle.trim().replace(/\s+/g, '_')}.pdf`,
      fileUrl: newAttFileUrl || undefined,
      fileSize: newAttFileSize || 'Document joint',
      allowStudentDownload: newAttAllowStudent,
      uploadedAt: new Date().toISOString(),
      uploadedBy: currentUser.name,
    };
    setAttachments((prev) => [...prev, item]);
    setNewAttTitle('');
    setNewAttFileName('');
    setNewAttFileUrl('');
    setNewAttFileSize('');
  };

  const handleRemoveAttachment = (attId: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== attId));
  };

  const submitWithStatus = (targetStatus: SessionReportStatus) => {
    setFormError(null);

    if (isCancelledCourse) {
      if (!certified) {
        setFormError(
          "Veuillez cocher la case de certification pour enregistrer officiellement l'annulation de cette séance."
        );
        return;
      }

      const nowIso = new Date().toISOString();
      const cancelLabel = CANCELLATION_CATEGORY_LABELS[cancellationCategory];
      const publicCancelContent =
        content.trim() ||
        'Séance annulée (0h réalisée) — Cours non assuré à la date prévue.';

      const reportData = {
        chapterTitle: chapterTitle.trim() || 'Séance annulée (Cours non tenu)',
        objectives: objectives.trim() || undefined,
        plannedContent: plannedContent.trim() || undefined,
        content: publicCancelContent,
        keyTakeaways: keyTakeaways.trim() || undefined,
        pedagogicalMethods: pedagogicalMethods.trim() || undefined,
        exercisesAndPracticalWork: exercisesAndPracticalWork.trim() || undefined,
        difficultiesEncountered: difficultiesEncountered.trim() || undefined,
        remarks:
          remarks.trim() ||
          `Cours annulé lors de la validation : ${cancelLabel}`,
        directionObservations: directionObservations.trim() || undefined,
        actualHours: 0,
        teacherPresence:
          cancellationCategory === 'ABSENT_UNNOTIFIED'
            ? ('ABSENT_UNNOTIFIED' as const)
            : cancellationCategory === 'ABSENT_NOTIFIED'
            ? ('ABSENT_NOTIFIED' as const)
            : teacherPresence,
        replacementName: undefined,
        incident: incident.trim() || cancelLabel,
        homework: homework.trim() || undefined,
        nextSessionPlan: nextSessionPlan.trim() || undefined,
        attachments,
        reportStatus: targetStatus,
        writtenBy: session.report?.writtenBy || currentUser.name,
        writtenAt: session.report?.writtenAt || nowIso,
        revisionReason:
          revisionReason.trim() ||
          `Enregistrement en cours annulé (${cancelLabel})`,
        isCancelledDuringValidation: true,
        cancellationCategory,
        cancellationReason: cancelLabel,
      };

      const res = validateSession(session.id, reportData);
      if (!res.success) {
        setFormError(res.error || "Erreur lors de l'enregistrement de l'annulation du cours.");
        return;
      }

      showAppToast({
        type: 'warning',
        title: 'Cours enregistré comme annulé (0h)',
        message: `Motif enregistré : ${cancelLabel}. Le volume horaire réalisé pour cette séance est fixé à 0h.`,
      });
      onClose();
      return;
    }

    if (targetStatus !== 'DRAFT') {
      if (!content.trim() || content.trim().length < 20) {
        setFormError(
          'Le contenu réellement enseigné est obligatoire et doit comporter au moins 20 caractères.'
        );
        contentRef.current?.focus();
        return;
      }

      if (actualHours < 0 || actualHours > session.durationHours) {
        setFormError(
          `Les heures réelles doivent être comprises entre 0 et la durée prévue (${session.durationHours}h).`
        );
        return;
      }

      if (!certified) {
        setFormError(
          'Vous devez cocher la case de certification pour soumettre ou valider officiellement cette séance.'
        );
        return;
      }

      if (wasAlreadyPublished && !revisionReason.trim()) {
        setFormError(
          'Ce compte rendu a déjà été publié. Toute modification nécessite un motif de révision qui sera archivé dans l’historique.'
        );
        return;
      }
    }

    const nowIso = new Date().toISOString();
    const reportData = {
      chapterTitle: chapterTitle.trim() || undefined,
      objectives: objectives.trim() || undefined,
      plannedContent: plannedContent.trim() || undefined,
      content: content.trim(),
      keyTakeaways: keyTakeaways.trim() || undefined,
      pedagogicalMethods: pedagogicalMethods.trim() || undefined,
      exercisesAndPracticalWork: exercisesAndPracticalWork.trim() || undefined,
      difficultiesEncountered: difficultiesEncountered.trim() || undefined,
      remarks: remarks.trim() || undefined,
      directionObservations: directionObservations.trim() || undefined,
      actualHours,
      teacherPresence,
      replacementName:
        teacherPresence === 'REPLACED' ? replacementName.trim() || undefined : undefined,
      incident: incident.trim() || undefined,
      homework: homework.trim() || undefined,
      nextSessionPlan: nextSessionPlan.trim() || undefined,
      attachments,
      reportStatus: targetStatus,
      writtenBy: session.report?.writtenBy || currentUser.name,
      writtenAt: session.report?.writtenAt || nowIso,
      revisionReason: revisionReason.trim() || undefined,
      isCancelledDuringValidation: false,
    };

    const res = validateSession(session.id, reportData);
    if (!res.success) {
      setFormError(res.error || 'Erreur lors de l’enregistrement du compte rendu.');
      return;
    }

    const toastTitle =
      targetStatus === 'DRAFT'
        ? 'Brouillon enregistré'
        : targetStatus === 'SUBMITTED'
        ? 'Compte rendu soumis pour validation'
        : targetStatus === 'VALIDATED'
        ? 'Compte rendu validé par l’administration'
        : 'Compte rendu validé et publié';

    showAppToast({
      type: 'success',
      title: toastTitle,
      message:
        targetStatus === 'DRAFT'
          ? 'Votre brouillon a été sauvegardé. Vous pourrez le soumettre ultérieurement.'
          : `Le compte rendu (${actualHours}h) est à l'état [${targetStatus}].`,
    });
    onClose();
  };

  const handleRequestCorrectionSubmit = () => {
    if (!correctionReason.trim()) {
      setFormError('Veuillez saisir le motif de la demande de correction ou du rejet.');
      return;
    }
    const res = requestCorrection(
      session.id,
      correctionReason.trim(),
      directionObservations.trim() || undefined,
      isRejectionMode
    );
    if (!res.success) {
      setFormError(res.error || 'Erreur lors de la transmission.');
      return;
    }

    showAppToast({
      type: 'warning',
      title: isRejectionMode ? 'Compte rendu rejeté' : 'Correction demandée',
      message: 'L’enseignant a été notifié avec le motif indiqué.',
    });
    onClose();
  };

  const handleQuickPublish = () => {
    const res = publishSessionReport(session.id, directionObservations.trim() || undefined);
    if (!res.success) {
      setFormError(res.error || 'Impossible de publier ce compte rendu.');
      return;
    }
    showAppToast({
      type: 'success',
      title: 'Compte rendu publié officiellement',
      message: 'Le compte rendu est désormais consultable par les étudiants inscrits au cours.',
    });
    onClose();
  };

  const currentReportStatus: SessionReportStatus | 'NONE' = session.report
    ? session.correctionRequested
      ? 'CORRECTION_REQUESTED'
      : session.report.reportStatus ||
        (session.status === 'COMPLETED_VALIDATED' ? 'PUBLISHED' : 'DRAFT')
    : 'NONE';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#17345B] to-blue-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <ShieldCheck className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold">
                  Fiche de Compte Rendu Pédagogique & Validation de Séance
                </h3>
                <span className="px-2 py-0.5 rounded bg-white/15 text-[10px] font-mono uppercase">
                  Statut CR : {currentReportStatus}
                </span>
              </div>
              <p className="text-xs text-blue-200">
                Source unique de données EBM Institute — Séparation stricte des données publiques (Étudiants) et internes (Direction)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-5 text-xs">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-900 font-semibold flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {session.correctionRequested && (
            <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-950 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold flex items-center gap-1.5 text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  {session.report?.reportStatus === 'REJECTED'
                    ? 'Compte rendu rejeté — Révision requise'
                    : 'Demande de correction en cours'}
                </span>
                {session.correctionRequestedAt && (
                  <span className="text-[10px] font-mono text-amber-700">
                    {formatDateTimeFr(session.correctionRequestedAt)}
                    {session.correctionRequestedBy ? ` · par ${session.correctionRequestedBy}` : ''}
                  </span>
                )}
              </div>
              <p className="text-xs text-amber-900">
                <strong>Motif :</strong>{' '}
                {session.correctionReason || 'Merci de vérifier et compléter le compte rendu.'}
              </p>
            </div>
          )}

          {/* A. Read-only General Session Information Card (Section 2.5.A & 3) */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                <span className="font-mono font-bold text-blue-900 bg-blue-100/80 px-2 py-0.5 rounded">
                  ID Séance : {session.id}
                </span>
                <span>·</span>
                <span>
                  Filière : <strong>{filiere?.name || 'N/A'}</strong>
                </span>
                {parc && (
                  <>
                    <span>·</span>
                    <span>
                      Parcours : <strong>{parc.name}</strong>
                    </span>
                  </>
                )}
                <span>·</span>
                <span>
                  Niveau : <strong>{course?.level || 'N/A'}</strong> ({course?.semester || 'S1'})
                </span>
                {ue && (
                  <>
                    <span>·</span>
                    <span>
                      UE : <strong>{ue.code} — {ue.title}</strong>
                    </span>
                  </>
                )}
              </div>
              <span className="font-mono font-bold px-2.5 py-0.5 bg-slate-200 text-slate-800 rounded text-[11px]">
                {session.date} · {session.startTime} - {session.endTime} ({session.durationHours}h prévues)
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/80">
              <div>
                <h4 className="text-sm font-black text-slate-900">
                  {session.eventTitle || course?.title || 'Séance de cours'}
                  {course?.code && (
                    <span className="font-mono text-xs text-slate-500 ml-1.5">({course.code})</span>
                  )}
                </h4>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-600">
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-purple-600" />
                  Groupe(s) : <strong>{groupNames || 'N/A'}</strong>
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  Salle : <strong>{room?.name || session.roomId}</strong>
                </span>
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-emerald-600" />
                  Enseignant : <strong>{session.eventSpeaker || teacher?.name || 'N/A'}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Revision History Accordion (Section 2.5.E & Recommendation #2) */}
          {revisions.length > 0 && (
            <div className="border border-indigo-200 bg-indigo-50/50 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowRevisionHistory((prev) => !prev)}
                className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-indigo-100/60 transition-colors cursor-pointer"
              >
                <span className="font-bold text-indigo-950 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  Historique des versions du compte rendu ({revisions.length} version
                  {revisions.length > 1 ? 's' : ''} antérieure{revisions.length > 1 ? 's' : ''})
                </span>
                <span className="text-[11px] font-bold text-indigo-700">
                  {showRevisionHistory ? 'Masquer ▲' : 'Consulter ▼'}
                </span>
              </button>
              {showRevisionHistory && (
                <div className="p-4 border-t border-indigo-200 bg-white space-y-2.5 max-h-56 overflow-y-auto">
                  {revisions.map((rev) => (
                    <div
                      key={rev.id}
                      className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1 text-[11px]"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <span className="font-bold text-slate-800">
                          Version v{rev.versionNumber} · archivée par {rev.modifiedBy}
                        </span>
                        <span className="font-mono text-[10px] text-slate-500">
                          {formatDateTimeFr(rev.modifiedAt)}
                        </span>
                      </div>
                      {rev.reason && (
                        <div className="text-amber-800 bg-amber-50 border border-amber-200 px-2 py-1 rounded text-[10px]">
                          <strong>Motif de révision :</strong> {rev.reason}
                        </div>
                      )}
                      <div className="text-slate-700">
                        <strong>Heures déclarées :</strong> {rev.previousActualHours}h —{' '}
                        {rev.previousChapterTitle && (
                          <span>
                            <strong>Chapitre :</strong> {rev.previousChapterTitle} —{' '}
                          </span>
                        )}
                        <strong>Contenu antérieur :</strong> {rev.previousContent}
                      </div>
                      {canViewConfidentialRemarks &&
                        (rev.previousRemarks ||
                          rev.previousIncident ||
                          rev.previousDifficulties) && (
                          <div className="text-slate-500 italic text-[10px]">
                            {rev.previousDifficulties && (
                              <span>Difficultés : {rev.previousDifficulties}. </span>
                            )}
                            {rev.previousRemarks && (
                              <span>Observations internes : {rev.previousRemarks}. </span>
                            )}
                            {rev.previousIncident && <span>Incident : {rev.previousIncident}.</span>}
                          </div>
                        )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Ask Correction / Rejection Mode */}
          {isAskingCorrection ? (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-900 font-bold">
                  <AlertTriangle className="w-4 h-4 text-amber-700" />
                  <span>
                    {isRejectionMode
                      ? 'Rejeter le compte rendu avec motif'
                      : "Demander une correction à l'enseignant"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsRejectionMode(false)}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer ${
                      !isRejectionMode
                        ? 'bg-amber-600 text-white'
                        : 'bg-white text-amber-800 border border-amber-300'
                    }`}
                  >
                    À corriger
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsRejectionMode(true)}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer ${
                      isRejectionMode
                        ? 'bg-rose-600 text-white'
                        : 'bg-white text-rose-800 border border-rose-300'
                    }`}
                  >
                    Rejeter le CR
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-amber-800">
                Précisez les corrections attendues ou le motif du rejet. Ce motif reste strictement interne et n’est jamais exposé aux étudiants.
              </p>
              <textarea
                value={correctionReason}
                onChange={(e) => setCorrectionReason(e.target.value)}
                placeholder="Ex: Merci de préciser les objectifs pédagogiques, les exercices traités et de vérifier la durée effective..."
                rows={3}
                className="w-full p-2.5 bg-white border border-amber-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                required
              />
              <div>
                <label className="block font-bold text-amber-900 text-[11px] mb-1">
                  Observations internes de la Direction (confidentiel)
                </label>
                <input
                  type="text"
                  value={directionObservations}
                  onChange={(e) => setDirectionObservations(e.target.value)}
                  placeholder="Note interne de suivi pédagogique..."
                  className="w-full h-9 px-3 bg-white border border-amber-300 rounded-lg text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAskingCorrection(false)}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleRequestCorrectionSubmit}
                  className={`px-4 py-1.5 text-white font-bold rounded-lg shadow-xs cursor-pointer ${
                    isRejectionMode
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-amber-600 hover:bg-amber-700'
                  }`}
                >
                  {isRejectionMode
                    ? 'Confirmer le rejet du CR'
                    : 'Envoyer la demande de correction'}
                </button>
              </div>
            </div>
          ) : (
            /* Main Pedagogical Report & Validation Form */
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitWithStatus('PUBLISHED');
              }}
              className="space-y-5"
            >
              {/* Mode Selector: Séance tenue vs Cours annulé (ex: enseignant absent sans avoir prévenu) */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wider block">
                      Statut de tenue de la séance lors de la validation
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Indiquez si la séance a bien eu lieu ou si le cours a été annulé (ex: enseignant absent sans avoir prévenu).
                    </span>
                  </div>
                  <div className="inline-flex rounded-xl p-1 bg-slate-200/80 border border-slate-300 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleCancelledMode(false)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        !isCancelledCourse
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-700 hover:text-slate-900'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Séance tenue (Valider le CR)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleCancelledMode(true)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        isCancelledCourse
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'text-rose-800 hover:bg-rose-50'
                      }`}
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>Cours annulé (0h)</span>
                    </button>
                  </div>
                </div>

                {isCancelledCourse && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 space-y-3 animate-in fade-in duration-150">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-rose-900 font-bold text-xs">
                        <Ban className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>
                          Enregistrement en « Cours annulé » — Volume horaire effectif verrouillé à 0h
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-rose-200/80 text-rose-950 font-mono font-bold text-[10px]">
                        Statut séance : CANCELLED · 0h réalisée
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-rose-950 text-[11px] mb-1">
                          Motif de l'annulation du cours *
                        </label>
                        <select
                          value={cancellationCategory}
                          onChange={(e) =>
                            handleCancellationCategoryChange(
                              e.target.value as
                                | 'ABSENT_UNNOTIFIED'
                                | 'ABSENT_NOTIFIED'
                                | 'TECHNICAL_ISSUE'
                                | 'FORCE_MAJEURE'
                                | 'OTHER'
                            )
                          }
                          className="w-full h-9 px-3 bg-white border border-rose-300 rounded-lg text-xs font-bold text-rose-950 focus:outline-none focus:ring-2 focus:ring-rose-500"
                        >
                          <option value="ABSENT_UNNOTIFIED">
                            Enseignant absent sans avoir prévenu (Absence non signalée)
                          </option>
                          <option value="ABSENT_NOTIFIED">
                            Enseignant absent (ayant prévenu l'administration)
                          </option>
                          <option value="TECHNICAL_ISSUE">
                            Problème technique ou salle indisponible
                          </option>
                          <option value="FORCE_MAJEURE">
                            Force majeure / Intempéries / Événement institutionnel
                          </option>
                          <option value="OTHER">Autre motif d'annulation</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-rose-950 text-[11px] mb-1">
                          Précision interne (Direction / Scolarité uniquement)
                        </label>
                        <input
                          type="text"
                          value={remarks}
                          onChange={(e) => setRemarks(e.target.value)}
                          placeholder="Ex: Enseignant injoignable à 08h15, étudiants libérés par la scolarité..."
                          className="w-full h-9 px-3 bg-white border border-rose-300 rounded-lg text-xs"
                        />
                      </div>
                    </div>

                    <p className="text-[11px] text-rose-800">
                      <strong>Sécurité & Confidentialité :</strong> Le motif interne («{' '}
                      {CANCELLATION_CATEGORY_LABELS[cancellationCategory]} ») est enregistré dans le
                      registre confidentiel de la Direction et remonte dans les alertes de pilotage.
                      Les étudiants voient uniquement que la séance est annulée (0h).
                    </p>
                  </div>
                )}
              </div>

              {/* Section B : Informations pédagogiques (Publiques après publication) */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="font-black text-slate-900 uppercase tracking-wider text-xs flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-blue-600" />
                    <span>
                      {isCancelledCourse
                        ? 'B. Mention publique affichée pour la séance annulée'
                        : 'B. Informations Pédagogiques (Publiées aux étudiants après validation)'}
                    </span>
                  </h4>
                  <span className="text-[10px] text-slate-500">
                    Cahier de textes officiel
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 text-[11px] mb-1">
                      Chapitre ou thème traité
                    </label>
                    <input
                      type="text"
                      value={chapterTitle}
                      onChange={(e) => setChapterTitle(e.target.value)}
                      placeholder={
                        isCancelledCourse
                          ? 'Séance annulée (Cours non tenu)'
                          : 'Ex: Chapitre 2 — Structures de données arborescentes'
                      }
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 text-[11px] mb-1">
                      Objectifs de la séance
                    </label>
                    <input
                      type="text"
                      value={objectives}
                      onChange={(e) => setObjectives(e.target.value)}
                      placeholder="Ex: Maîtriser le parcours préfixe/infixe et l'équilibrage AVL"
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>

                {!isCancelledCourse && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 text-[11px] mb-1">
                        Contenu prévu au syllabus
                      </label>
                      <input
                        type="text"
                        value={plannedContent}
                        onChange={(e) => setPlannedContent(e.target.value)}
                        placeholder="Ex: Arbres binaires de recherche et complexité"
                        className="w-full h-9 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 text-[11px] mb-1">
                        Méthodes pédagogiques utilisées
                      </label>
                      <input
                        type="text"
                        value={pedagogicalMethods}
                        onChange={(e) => setPedagogicalMethods(e.target.value)}
                        placeholder="Ex: Cours magistral interactif, démonstration au tableau, étude de cas"
                        className="w-full h-9 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block font-bold text-slate-700 text-[11px] mb-1">
                    {isCancelledCourse
                      ? 'Information publique sur le report / annulation de la séance'
                      : 'Contenu réellement enseigné / Résumé détaillé de la séance *'}{' '}
                    {!isCancelledCourse && (
                      <span className="text-slate-400 font-normal">(Min. 20 caractères)</span>
                    )}
                  </label>
                  <textarea
                    ref={contentRef}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={
                      isCancelledCourse
                        ? 'Séance annulée (0h réalisée) — Cours non assuré à la date prévue et reporté à une séance de rattrapage.'
                        : 'Décrivez précisément les notions enseignées, le déroulé réel de la séance et les explications données...'
                    }
                    rows={3}
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                  {!isCancelledCourse && (
                    <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                      <span>{content.trim().length} / 20 caractères minimum requis pour validation</span>
                      <span
                        className={
                          content.trim().length >= 20
                            ? 'text-emerald-600 font-bold'
                            : 'text-amber-600 font-bold'
                        }
                      >
                        {content.trim().length >= 20 ? '✓ Longueur conforme' : 'Minimum 20 caractères'}
                      </span>
                    </div>
                  )}
                </div>

                {!isCancelledCourse && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 text-[11px] mb-1">
                          Points essentiels à retenir
                        </label>
                        <textarea
                          value={keyTakeaways}
                          onChange={(e) => setKeyTakeaways(e.target.value)}
                          placeholder="Synthèse des points clés pour les étudiants..."
                          rows={2}
                          className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 text-[11px] mb-1">
                          Exercices, activités et travaux pratiques réalisés
                        </label>
                        <textarea
                          value={exercisesAndPracticalWork}
                          onChange={(e) => setExercisesAndPracticalWork(e.target.value)}
                          placeholder="Ex: TD Série 2 (Exercices 1 à 3), implémentation en salle machine..."
                          rows={2}
                          className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 text-[11px] mb-1">
                          Travail à préparer / Devoirs pour la prochaine séance
                        </label>
                        <input
                          type="text"
                          value={homework}
                          onChange={(e) => setHomework(e.target.value)}
                          placeholder="Ex: Terminer l'exercice 4 et préparer le mini-projet..."
                          className="w-full h-9 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 text-[11px] mb-1">
                          Programme prévu pour la prochaine séance
                        </label>
                        <input
                          type="text"
                          value={nextSessionPlan}
                          onChange={(e) => setNextSessionPlan(e.target.value)}
                          placeholder="Ex: Chapitre 3 — Graphes et algorithme de Dijkstra"
                          className="w-full h-9 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Section C : Durée effective, Présence Enseignant & Informations internes confidentielles */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h4 className="font-black text-slate-900 uppercase tracking-wider text-xs flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-amber-600" />
                    <span>
                      C. Contrôle Horaire & Observations Internes (Strictement confidentiel — Non visible par les étudiants)
                    </span>
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 text-[11px] mb-1">
                      Durée effective réalisée (h) *
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max={session.durationHours}
                      value={isCancelledCourse ? 0 : actualHours}
                      disabled={isCancelledCourse}
                      onChange={(e) => setActualHours(Number(e.target.value))}
                      className={`w-full h-9 px-3 border rounded-lg text-xs font-bold font-mono ${
                        isCancelledCourse
                          ? 'bg-rose-50 border-rose-300 text-rose-800 cursor-not-allowed'
                          : 'bg-white border-slate-300'
                      }`}
                      required
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      Durée prévue : {session.durationHours}h
                      {isCancelledCourse ? ' · Verrouillé à 0h (Cours annulé)' : ''}
                    </span>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 text-[11px] mb-1">
                      Présence de l'enseignant *
                    </label>
                    <select
                      value={teacherPresence}
                      onChange={(e) =>
                        handleTeacherPresenceChange(
                          e.target.value as
                            | 'PRESENT'
                            | 'LATE'
                            | 'REPLACED'
                            | 'ABSENT_UNNOTIFIED'
                            | 'ABSENT_NOTIFIED'
                        )
                      }
                      className={`w-full h-9 px-3 border rounded-lg text-xs font-bold ${
                        teacherPresence === 'ABSENT_UNNOTIFIED' ||
                        teacherPresence === 'ABSENT_NOTIFIED'
                          ? 'bg-rose-50 border-rose-300 text-rose-900'
                          : 'bg-white border-slate-300'
                      }`}
                    >
                      <option value="PRESENT">Présent(e)</option>
                      <option value="LATE">En retard</option>
                      <option value="REPLACED">Remplacé(e)</option>
                      <option value="ABSENT_UNNOTIFIED">
                        Absent(e) sans avoir prévenu — Cours annulé (0h)
                      </option>
                      <option value="ABSENT_NOTIFIED">
                        Absent(e) ayant prévenu — Cours annulé (0h)
                      </option>
                    </select>
                  </div>

                  {teacherPresence === 'REPLACED' ? (
                    <div>
                      <label className="block font-bold text-slate-700 text-[11px] mb-1">
                        Enseignant remplaçant *
                      </label>
                      <input
                        type="text"
                        value={replacementName}
                        onChange={(e) => setReplacementName(e.target.value)}
                        placeholder="Nom du remplaçant"
                        className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-xs"
                        required
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block font-bold text-slate-700 text-[11px] mb-1">
                        Incident technique / disciplinaire
                      </label>
                      <input
                        type="text"
                        value={incident}
                        onChange={(e) => setIncident(e.target.value)}
                        placeholder="Ex: Vidéoprojecteur en panne..."
                        className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 text-[11px] mb-1">
                      Difficultés pédagogiques rencontrées (Interne)
                    </label>
                    <input
                      type="text"
                      value={difficultiesEncountered}
                      onChange={(e) => setDifficultiesEncountered(e.target.value)}
                      placeholder="Ex: Prérequis mathématiques hétérogènes dans le groupe..."
                      className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 text-[11px] mb-1">
                      Observations internes (Enseignant / Scolarité)
                    </label>
                    <input
                      type="text"
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="Ex: Bonne participation globale ou note sur l'absence..."
                      className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                </div>

                {isAdminOrDirection && (
                  <div>
                    <label className="block font-bold text-indigo-900 text-[11px] mb-1">
                      Observations de la Direction des Études (Interne Direction)
                    </label>
                    <input
                      type="text"
                      value={directionObservations}
                      onChange={(e) => setDirectionObservations(e.target.value)}
                      placeholder="Visa pédagogique, remarque de conformité au syllabus ou suivi d'absence..."
                      className="w-full h-9 px-3 bg-white border border-indigo-200 rounded-lg text-xs"
                    />
                  </div>
                )}
              </div>

              {/* Section D : Documents & Pièces jointes pédagogiques */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="font-black text-slate-900 uppercase tracking-wider text-xs flex items-center gap-1.5">
                    <Paperclip className="w-4 h-4 text-indigo-600" />
                    <span>D. Documents & Supports joints ({attachments.length})</span>
                  </h4>
                  <span className="text-[10px] text-slate-500">
                    Supports de cours, exercices, TP et justificatifs
                  </span>
                </div>

                {attachments.length > 0 && (
                  <div className="space-y-1.5">
                    {attachments.map((att) => (
                      <div
                        key={att.id}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px]"
                      >
                        <div className="flex items-center gap-2">
                          <Paperclip className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <div>
                            <span className="font-bold text-slate-900">{att.title}</span>
                            <span className="text-slate-500 ml-2">
                              ({att.category} · {att.fileName})
                            </span>
                            <span
                              className={`ml-2 text-[10px] font-semibold ${
                                att.allowStudentDownload ? 'text-emerald-700' : 'text-amber-700'
                              }`}
                            >
                              {att.allowStudentDownload
                                ? '· Téléchargement étudiant autorisé'
                                : '· Consultation restreinte'}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(att.id)}
                          className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                          title="Retirer le document"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div className="sm:col-span-4">
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">
                      Intitulé du support / document
                    </label>
                    <input
                      type="text"
                      value={newAttTitle}
                      onChange={(e) => setNewAttTitle(e.target.value)}
                      placeholder="Ex: Support Chapitre 2 (Slides PDF)"
                      className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded text-xs"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">
                      Catégorie
                    </label>
                    <select
                      value={newAttCategory}
                      onChange={(e) =>
                        setNewAttCategory(e.target.value as SessionReportAttachmentCategory)
                      }
                      className="w-full h-8 px-2 bg-white border border-slate-300 rounded text-xs font-semibold"
                    >
                      <option value="SUPPORT_COURS">Support de cours</option>
                      <option value="EXERCICES">Exercices / TD</option>
                      <option value="TP">Travaux pratiques (TP)</option>
                      <option value="COMPLEMENTAIRE">Document complémentaire</option>
                      <option value="JUSTIFICATIF">Justificatif administratif</option>
                    </select>
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">
                      Fichier (PDF, Doc, Archive)
                    </label>
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      className="w-full text-[10px] text-slate-600 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </div>
                  <div className="sm:col-span-2 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={handleAddAttachment}
                      className="w-full h-8 px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded text-xs flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Joindre</span>
                    </button>
                  </div>
                  <div className="sm:col-span-12 flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="att-student-dl"
                      checked={newAttAllowStudent}
                      onChange={(e) => setNewAttAllowStudent(e.target.checked)}
                      className="w-3.5 h-3.5 text-blue-600 rounded"
                    />
                    <label htmlFor="att-student-dl" className="text-[11px] text-slate-700 cursor-pointer">
                      Autoriser les étudiants inscrits à télécharger ce document dès la publication du CR
                    </label>
                  </div>
                </div>
              </div>

              {/* Mandatory Revision Reason if already published (Section 2.7) */}
              {wasAlreadyPublished && !isCancelledCourse && (
                <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl space-y-1.5">
                  <label className="block font-bold text-amber-950 text-xs">
                    Motif obligatoire de révision post-publication (Section 2.7 — Révision historisée) *
                  </label>
                  <p className="text-[11px] text-amber-800">
                    Ce compte rendu ayant déjà été publié, la version actuelle sera archivée dans l’historique des modifications avec votre nom et la date.
                  </p>
                  <input
                    type="text"
                    value={revisionReason}
                    onChange={(e) => setRevisionReason(e.target.value)}
                    placeholder="Ex: Ajout des exercices complémentaires et précision sur le chapitre 2..."
                    className="w-full h-9 px-3 bg-white border border-amber-400 rounded-lg text-xs"
                    required
                  />
                </div>
              )}

              {/* Digital Certification Checkbox */}
              <div
                className={`p-3 rounded-xl flex items-start gap-2.5 border ${
                  isCancelledCourse
                    ? 'bg-rose-50/70 border-rose-200'
                    : 'bg-blue-50/70 border-blue-200'
                }`}
              >
                <input
                  type="checkbox"
                  id="certified-check"
                  checked={certified}
                  onChange={(e) => setCertified(e.target.checked)}
                  className="w-4 h-4 mt-0.5 text-blue-600 rounded border-blue-300 focus:ring-blue-500 cursor-pointer"
                />
                <label
                  htmlFor="certified-check"
                  className={`text-xs font-semibold cursor-pointer select-none ${
                    isCancelledCourse ? 'text-rose-950' : 'text-blue-950'
                  }`}
                >
                  {isCancelledCourse
                    ? "Je certifie que cette séance n'a pas pu se tenir (0h réalisée) et j'enregistre officiellement l'annulation du cours dans le registre de suivi pédagogique."
                    : 'Je certifie l’exactitude de ces informations pédagogiques et la réalisation effective des heures déclarées dans le cadre du contrôle de service fait (Cahier de textes officiel EBM Institute).'}
                </label>
              </div>

              {/* Footer Workflow Actions */}
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5 pt-3 border-t border-slate-200">
                <div className="flex flex-wrap items-center gap-2">
                  {isAdminOrDirection && !isCancelledCourse && (
                    <button
                      type="button"
                      onClick={() => setIsAskingCorrection(true)}
                      className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                    >
                      Demander une correction / Rejeter...
                    </button>
                  )}
                  {!isCancelledCourse && (
                    <button
                      type="button"
                      onClick={() => submitWithStatus('DRAFT')}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Enregistrer brouillon</span>
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Fermer
                  </button>

                  {!isCancelledCourse && currentUser.role === 'TEACHER' && (
                    <button
                      type="button"
                      onClick={() => submitWithStatus('SUBMITTED')}
                      disabled={!certified || content.trim().length < 20}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Soumettre pour validation</span>
                    </button>
                  )}

                  {!isCancelledCourse &&
                    isAdminOrDirection &&
                    session.report?.reportStatus === 'SUBMITTED' && (
                      <button
                        type="button"
                        onClick={handleQuickPublish}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approuver & Publier tel quel</span>
                      </button>
                    )}

                  {isCancelledCourse ? (
                    <button
                      type="submit"
                      disabled={!certified}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Ban className="w-4 h-4" />
                      <span>Confirmer l'annulation du cours (0h)</span>
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={!certified || content.trim().length < 20}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        {wasAlreadyPublished
                          ? 'Enregistrer la révision historisée'
                          : 'Valider & Publier le CR'}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
