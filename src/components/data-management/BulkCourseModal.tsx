import React, { useState, useMemo } from 'react';
import {
  X,
  Check,
  Users,
  AlertTriangle,
  UserCheck,
  Calendar,
  Layers,
  ArrowRight,
  ShieldAlert,
  Clock,
  Archive,
  RefreshCw,
  Plus,
  Minus,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Course } from '../../types';

interface BulkCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCourseIds: string[];
  onComplete: () => void;
}

type BulkTab = 'GROUPS' | 'TEACHER' | 'SEMESTER' | 'VOLUME_STATUS';
type GroupBulkMode = 'REPLACE' | 'ADD' | 'REMOVE';

export const BulkCourseModal: React.FC<BulkCourseModalProps> = ({
  isOpen,
  onClose,
  selectedCourseIds,
  onComplete,
}) => {
  const {
    courses,
    groups,
    filieres,
    users,
    sessions,
    bulkUpdateCourseGroups,
    bulkUpdateCourses,
  } = useApp();

  const [activeTab, setActiveTab] = useState<BulkTab>('GROUPS');
  const [groupMode, setGroupMode] = useState<GroupBulkMode>('REPLACE');
  const [targetGroupIds, setTargetGroupIds] = useState<string[]>([]);
  const [filterFiliere, setFilterFiliere] = useState<string>('ALL');
  const [confirmStep, setConfirmStep] = useState(false);
  const [notification, setNotification] = useState<{ msg: string; isError?: boolean } | null>(null);

  // Other bulk states
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('S1');
  const [selectedStatus, setSelectedStatus] = useState<'ACTIVE' | 'ARCHIVED'>('ACTIVE');
  const [bulkHours, setBulkHours] = useState(30);

  const teachers = useMemo(() => users.filter((u) => u.role === 'TEACHER'), [users]);

  // The actual course objects selected
  const targetCourses = useMemo(() => {
    return courses.filter((c) => selectedCourseIds.includes(c.id));
  }, [courses, selectedCourseIds]);

  // Timetable sessions linked to the selected courses
  const linkedSessions = useMemo(() => {
    const idSet = new Set(selectedCourseIds);
    return sessions.filter((s) => idSet.has(s.courseId) && s.status !== 'CANCELLED');
  }, [sessions, selectedCourseIds]);

  // Filtered groups available for selection
  const filteredGroups = useMemo(() => {
    if (filterFiliere === 'ALL') return groups;
    return groups.filter((g) => g.filiereId === filterFiliere);
  }, [groups, filterFiliere]);

  // Group toggle
  const toggleGroupSelection = (gid: string) => {
    setTargetGroupIds((prev) =>
      prev.includes(gid) ? prev.filter((id) => id !== gid) : [...prev, gid]
    );
  };

  const selectAllFilteredGroups = () => {
    const ids = filteredGroups.map((g) => g.id);
    setTargetGroupIds((prev) => Array.from(new Set([...prev, ...ids])));
  };

  const clearGroupSelection = () => {
    setTargetGroupIds([]);
  };

  // Preview before and after for each course
  const previewDiff = useMemo(() => {
    return targetCourses.map((c) => {
      const currentGids = c.groupIds || [];
      let newGids: string[] = [];

      if (groupMode === 'REPLACE') {
        newGids = [...targetGroupIds];
      } else if (groupMode === 'ADD') {
        newGids = Array.from(new Set([...currentGids, ...targetGroupIds]));
      } else {
        // REMOVE
        const removeSet = new Set(targetGroupIds);
        newGids = currentGids.filter((gid) => !removeSet.has(gid));
      }

      const currentNames = currentGids
        .map((id) => groups.find((g) => g.id === id)?.code || id)
        .join(', ');
      const newNames = newGids
        .map((id) => groups.find((g) => g.id === id)?.code || id)
        .join(', ');

      return {
        course: c,
        currentNames: currentNames || 'Aucun groupe',
        newNames: newNames || 'Aucun groupe',
        hasChanged: currentNames !== newNames,
      };
    });
  }, [targetCourses, targetGroupIds, groupMode, groups]);

  const handleApplyGroups = () => {
    if (targetGroupIds.length === 0 && (groupMode === 'REPLACE' || groupMode === 'ADD')) {
      setNotification({ msg: 'Veuillez cocher au moins un groupe d\'étudiants cible.', isError: true });
      return;
    }
    const res = bulkUpdateCourseGroups(selectedCourseIds, groupMode, targetGroupIds);
    if (res.success) {
      setNotification({
        msg: `Groupes d'étudiants mis à jour avec succès sur ${res.count} cours (Mode: ${
          groupMode === 'REPLACE' ? 'Remplacement complet' : groupMode === 'ADD' ? 'Ajout' : 'Retrait'
        }) !`,
      });
      setTimeout(() => {
        onComplete();
        onClose();
      }, 1200);
    }
  };

  const handleApplyTeacher = () => {
    if (!selectedTeacherId) {
      setNotification({ msg: 'Veuillez sélectionner un enseignant.', isError: true });
      return;
    }
    const teacher = teachers.find((t) => t.id === selectedTeacherId);
    bulkUpdateCourses(selectedCourseIds, { teacherIds: [selectedTeacherId] });
    setNotification({ msg: `Enseignant "${teacher?.name}" réaffecté à ${selectedCourseIds.length} cours !` });
    setTimeout(() => {
      onComplete();
      onClose();
    }, 1200);
  };

  const handleApplySemester = () => {
    bulkUpdateCourses(selectedCourseIds, { semester: selectedSemester });
    setNotification({ msg: `Semestre ${selectedSemester} appliqué à ${selectedCourseIds.length} cours !` });
    setTimeout(() => {
      onComplete();
      onClose();
    }, 1200);
  };

  const handleApplyVolumeStatus = () => {
    bulkUpdateCourses(selectedCourseIds, {
      totalHours: Number(bulkHours) || 30,
      status: selectedStatus,
    });
    setNotification({ msg: `Volume (${bulkHours}h) et Statut (${selectedStatus}) appliqués à ${selectedCourseIds.length} cours !` });
    setTimeout(() => {
      onComplete();
      onClose();
    }, 1200);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 rounded-2xl text-white shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">
                  Modification groupée de cours
                </h3>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/30">
                  {selectedCourseIds.length} cours sélectionné{selectedCourseIds.length > 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Gérez en masse les groupes d'étudiants, enseignants, semestres et volumes horaires sans ressaisies unitaires.
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

        {/* Action Tabs */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex gap-2 overflow-x-auto no-scrollbar text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setActiveTab('GROUPS');
              setConfirmStep(false);
            }}
            className={`px-3.5 py-2 rounded-xl flex items-center gap-2 transition-all ${
              activeTab === 'GROUPS'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Groupes d'étudiants (Section 6)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('TEACHER');
              setConfirmStep(false);
            }}
            className={`px-3.5 py-2 rounded-xl flex items-center gap-2 transition-all ${
              activeTab === 'TEACHER'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Réaffecter l'Enseignant</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('SEMESTER');
              setConfirmStep(false);
            }}
            className={`px-3.5 py-2 rounded-xl flex items-center gap-2 transition-all ${
              activeTab === 'SEMESTER'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Changer Semestre</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('VOLUME_STATUS');
              setConfirmStep(false);
            }}
            className={`px-3.5 py-2 rounded-xl flex items-center gap-2 transition-all ${
              activeTab === 'VOLUME_STATUS'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Volume & Statut</span>
          </button>
        </div>

        {/* Notifications */}
        {notification && (
          <div
            className={`mx-6 mt-3 p-3 rounded-2xl flex items-center gap-2 text-xs font-semibold ${
              notification.isError
                ? 'bg-red-50 border border-red-200 text-red-800'
                : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
            }`}
          >
            {notification.isError ? (
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
            ) : (
              <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            )}
            <span>{notification.msg}</span>
          </div>
        )}

        {/* Tab 1: Groupes d'étudiants en masse */}
        <div className="flex-1 overflow-y-auto p-6 text-xs space-y-4">
          {activeTab === 'GROUPS' && !confirmStep && (
            <div className="space-y-4 animate-in fade-in">
              {/* Mandatory 3-Mode Selector */}
              <div>
                <label className="font-bold text-slate-900 block mb-2 text-sm">
                  1. Choisissez le mode d'application aux cours sélectionnés :
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Mode A */}
                  <div
                    onClick={() => setGroupMode('REPLACE')}
                    className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                      groupMode === 'REPLACE'
                        ? 'border-blue-600 bg-blue-50/70 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-blue-900 text-xs flex items-center gap-1.5">
                        <RefreshCw className="w-4 h-4 text-blue-600" />
                        Mode A — Remplacer
                      </span>
                      {groupMode === 'REPLACE' && (
                        <span className="w-2 h-2 rounded-full bg-blue-600" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 leading-snug">
                      Remplace l'ensemble des groupes actuels par les nouveaux groupes sélectionnés.
                    </p>
                  </div>

                  {/* Mode B */}
                  <div
                    onClick={() => setGroupMode('ADD')}
                    className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                      groupMode === 'ADD'
                        ? 'border-emerald-600 bg-emerald-50/70 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-emerald-900 text-xs flex items-center gap-1.5">
                        <Plus className="w-4 h-4 text-emerald-600" />
                        Mode B — Ajouter
                      </span>
                      {groupMode === 'ADD' && (
                        <span className="w-2 h-2 rounded-full bg-emerald-600" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 leading-snug">
                      Ajoute les groupes choisis sans supprimer les affectations existantes.
                    </p>
                  </div>

                  {/* Mode C */}
                  <div
                    onClick={() => setGroupMode('REMOVE')}
                    className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                      groupMode === 'REMOVE'
                        ? 'border-rose-600 bg-rose-50/70 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-rose-900 text-xs flex items-center gap-1.5">
                        <Minus className="w-4 h-4 text-rose-600" />
                        Mode C — Retirer
                      </span>
                      {groupMode === 'REMOVE' && (
                        <span className="w-2 h-2 rounded-full bg-rose-600" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 leading-snug">
                      Retire uniquement les groupes choisis de la liste des cours sans modifier les autres.
                    </p>
                  </div>
                </div>
              </div>

              {/* Group selection area */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">
                      2. Sélectionnez les groupes cibles :
                    </span>
                    <span className="text-blue-600 font-bold text-xs">
                      ({targetGroupIds.length} coché{targetGroupIds.length > 1 ? 's' : ''})
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={filterFiliere}
                      onChange={(e) => setFilterFiliere(e.target.value)}
                      className="p-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                    >
                      <option value="ALL">Toutes les mentions / filières</option>
                      {filieres.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.code} - {f.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={selectAllFilteredGroups}
                      className="px-2.5 py-1 bg-blue-100 text-blue-800 hover:bg-blue-200 rounded-lg font-bold text-[11px]"
                    >
                      Tout cocher
                    </button>
                    <button
                      type="button"
                      onClick={clearGroupSelection}
                      className="px-2 py-1 text-slate-500 hover:text-slate-800 text-[11px]"
                    >
                      Effacer
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1">
                  {filteredGroups.map((grp) => {
                    const isChecked = targetGroupIds.includes(grp.id);
                    return (
                      <label
                        key={grp.id}
                        className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleGroupSelection(grp.id)}
                            className="rounded text-blue-600"
                          />
                          <span className="font-bold truncate">{grp.code}</span>
                        </div>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded ${
                            isChecked ? 'bg-blue-700 text-blue-100' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {grp.studentCount}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Course selection recap list */}
              <div>
                <h4 className="font-bold text-slate-700 mb-2">
                  Cours concernés par cette mise à jour ({targetCourses.length}) :
                </h4>
                <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-2xl divide-y divide-slate-100">
                  {targetCourses.map((c) => (
                    <div key={c.id} className="p-2.5 bg-white flex items-center justify-between">
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-mono font-bold text-blue-700 px-1.5 py-0.5 bg-blue-50 rounded text-[11px]">
                          {c.code}
                        </span>
                        <span className="font-semibold text-slate-800 truncate">{c.title}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 flex-shrink-0">
                        <span>Groupes actuels :</span>
                        <span className="font-medium text-slate-700">
                          {c.groupIds?.length
                            ? c.groupIds
                                .map((gid) => groups.find((g) => g.id === gid)?.code || gid)
                                .join(', ')
                            : 'Aucun'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Group Diff & Confirmation Step */}
          {activeTab === 'GROUPS' && confirmStep && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-amber-950 text-sm">
                    Vérification avant validation finale
                  </h4>
                  <p className="text-amber-800 text-xs mt-0.5">
                    Vous allez appliquer le mode{' '}
                    <span className="font-bold uppercase">
                      {groupMode === 'REPLACE' ? 'Remplacement' : groupMode === 'ADD' ? 'Ajout' : 'Retrait'}
                    </span>{' '}
                    sur <span className="font-bold">{targetCourses.length} cours</span>.
                  </p>
                  {linkedSessions.length > 0 && (
                    <p className="text-red-700 font-bold text-xs mt-2 p-2 bg-red-100/70 rounded-xl border border-red-200">
                      ⚠️ Avertissement : {linkedSessions.length} séance(s) d'emploi du temps sont déjà planifiées
                      pour ces cours. Les groupes d'étudiants concernés par les séances existantes resteront liés à la séance,
                      mais les futures planifications utiliseront la nouvelle configuration.
                    </p>
                  )}
                </div>
              </div>

              {/* Diff Preview Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0">
                    <tr>
                      <th className="p-2.5">Code & Cours</th>
                      <th className="p-2.5">Groupes actuels</th>
                      <th className="p-2.5">Nouveaux groupes résultants</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewDiff.map((p) => (
                      <tr key={p.course.id} className="hover:bg-slate-50">
                        <td className="p-2.5 font-bold text-slate-800">
                          <span className="font-mono text-blue-700">{p.course.code}</span> - {p.course.title}
                        </td>
                        <td className="p-2.5 text-slate-500 line-through">{p.currentNames}</td>
                        <td className="p-2.5 font-bold text-emerald-700">{p.newNames}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 2: Enseignant */}
          {activeTab === 'TEACHER' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl">
                <h4 className="font-bold text-blue-900 text-sm mb-1">
                  Réaffectation de l'enseignant responsable
                </h4>
                <p className="text-blue-800 text-xs">
                  Sélectionnez le nouvel enseignant qui deviendra le responsable pédagogique des {selectedCourseIds.length} cours sélectionnés.
                </p>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Nouvel enseignant responsable *
                </label>
                <select
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                >
                  <option value="">-- Sélectionner un enseignant --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.specialty ? `(${t.specialty})` : ''} - {t.email}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Tab 3: Semestre */}
          {activeTab === 'SEMESTER' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl">
                <h4 className="font-bold text-blue-900 text-sm mb-1">
                  Changement de semestre LMD
                </h4>
                <p className="text-blue-800 text-xs">
                  Modifiez en un clic le semestre d'affectation pour l'ensemble des cours sélectionnés.
                </p>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Semestre cible *</label>
                <select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                >
                  {['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10'].map((s) => (
                    <option key={s} value={s}>
                      Semestre {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Tab 4: Volume & Statut */}
          {activeTab === 'VOLUME_STATUS' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <label className="font-bold text-slate-700 block">Volume horaire total (h)</label>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={bulkHours}
                    onChange={(e) => setBulkHours(Number(e.target.value))}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold"
                  />
                  <p className="text-[11px] text-slate-400">
                    Fixe le quota d'heures de maquette pour tous les cours choisis.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <label className="font-bold text-slate-700 block">Statut du cours</label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value as 'ACTIVE' | 'ARCHIVED')}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold"
                  >
                    <option value="ACTIVE">Actif (Planifiable dans l'emploi du temps)</option>
                    <option value="ARCHIVED">Archivé (Masqué par défaut)</option>
                  </select>
                  <p className="text-[11px] text-slate-400">
                    Les cours archivés n'apparaîtront plus dans les sélecteurs de planification.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 hover:bg-slate-100 rounded-xl text-slate-700 font-bold text-xs transition-colors"
          >
            Annuler
          </button>

          <div className="flex items-center gap-2">
            {activeTab === 'GROUPS' && !confirmStep && (
              <button
                type="button"
                onClick={() => setConfirmStep(true)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-all"
              >
                <span>Vérifier le diff & Confirmer</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {activeTab === 'GROUPS' && confirmStep && (
              <>
                <button
                  type="button"
                  onClick={() => setConfirmStep(false)}
                  className="px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold"
                >
                  Retour
                </button>
                <button
                  type="button"
                  onClick={handleApplyGroups}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-all"
                >
                  <Check className="w-4 h-4" />
                  <span>Valider l'application des groupes</span>
                </button>
              </>
            )}

            {activeTab === 'TEACHER' && (
              <button
                type="button"
                onClick={handleApplyTeacher}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-all"
              >
                <Check className="w-4 h-4" />
                <span>Réaffecter l'enseignant</span>
              </button>
            )}

            {activeTab === 'SEMESTER' && (
              <button
                type="button"
                onClick={handleApplySemester}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-all"
              >
                <Check className="w-4 h-4" />
                <span>Changer le semestre</span>
              </button>
            )}

            {activeTab === 'VOLUME_STATUS' && (
              <button
                type="button"
                onClick={handleApplyVolumeStatus}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-all"
              >
                <Check className="w-4 h-4" />
                <span>Appliquer volume & statut</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
