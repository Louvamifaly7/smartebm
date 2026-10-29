import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  CalendarDays,
  Plus,
  CheckCircle2,
  Clock,
  Layers,
  Copy,
  Edit2,
  Trash2,
  AlertCircle,
  X,
  Sparkles,
  ChevronRight,
  Shield,
  FileCheck,
  Check,
} from 'lucide-react';
import { AcademicYear, SemesterCode } from '../types';

export const AcademicYearManagement: React.FC = () => {
  const {
    academicYears,
    selectedAcademicYear,
    setSelectedAcademicYear,
    setActiveAcademicYear,
    createAcademicYear,
    updateAcademicYear,
    deleteAcademicYear,
    duplicateMaquette,
    ues,
    ecs,
    inscriptions,
    currentUser,
  } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingYear, setEditingYear] = useState<AcademicYear | null>(null);

  // Form states
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isCurrent, setIsCurrent] = useState(false);
  const [cloneFromPrevious, setCloneFromPrevious] = useState(true);
  const [formMsg, setFormMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isStaffOrAdmin = ['ADMIN', 'SCHEDULER', 'ACADEMIC_HEAD'].includes(currentUser?.role || '');

  const openCreateModal = () => {
    const nextStartYear = new Date().getFullYear() + 1;
    const nextCode = `${nextStartYear}-${nextStartYear + 1}`;
    setEditingYear(null);
    setCode(nextCode);
    setName(`Année Universitaire ${nextCode}`);
    setStartDate(`${nextStartYear}-09-01`);
    setEndDate(`${nextStartYear + 1}-06-30`);
    setIsCurrent(false);
    setCloneFromPrevious(true);
    setFormMsg(null);
    setIsModalOpen(true);
  };

  const openEditModal = (ay: AcademicYear) => {
    setEditingYear(ay);
    setCode(ay.code);
    setName(ay.name);
    setStartDate(ay.startDate);
    setEndDate(ay.endDate);
    setIsCurrent(ay.isCurrent);
    setCloneFromPrevious(false);
    setFormMsg(null);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingYear) {
      updateAcademicYear(editingYear.id, {
        code: code.trim(),
        name: name.trim(),
        startDate,
        endDate,
        isCurrent,
      });
      setFormMsg({ type: 'success', text: `Année académique "${code}" mise à jour !` });
      setTimeout(() => setIsModalOpen(false), 900);
    } else {
      const res = createAcademicYear({
        code,
        name,
        startDate,
        endDate,
        isCurrent,
        cloneFromPrevious,
      });
      if (res.success) {
        setFormMsg({ type: 'success', text: `Année académique "${code}" créée avec succès !` });
        setTimeout(() => setIsModalOpen(false), 900);
      } else {
        setFormMsg({ type: 'error', text: res.error || 'Erreur lors de la création.' });
      }
    }
  };

  const activeYearObj = academicYears.find((y) => y.isCurrent) || academicYears[0];
  const activeInscriptionsCount = inscriptions.filter((i) => i.academicYear === selectedAcademicYear).length;
  const activeUesCount = ues.filter((u) => u.academicYear === selectedAcademicYear).length;
  const activeEcsCount = ecs.filter((e) => {
    const parentUe = ues.find((u) => u.id === e.ueId);
    return parentUe?.academicYear === selectedAcademicYear;
  }).length;

  return (
    <div className="space-y-6">
      {/* 1. Header & Actions */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-600 text-white rounded-xl shadow-xs">
              <CalendarDays className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                Gestion des Années Académiques
                <span className="text-xs bg-indigo-50 text-indigo-700 font-semibold px-2.5 py-0.5 rounded-full border border-indigo-200">
                  Système LMD
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Créez, configurez et basculez en 1-clic l'année académique active de l'EBM Institute.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isStaffOrAdmin && (
              <button
                type="button"
                onClick={openCreateModal}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Créer une Année Académique
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Active Year Hero Banner (OpenEduCat 19 ergonomics) */}
      <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-blue-950 text-white rounded-2xl p-6 shadow-md border border-indigo-800/60 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-6">
          <CalendarDays className="w-56 h-56 text-white" />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-bold border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              ANNÉE ACADÉMIQUE COURANTE : {activeYearObj?.code}
            </div>
            <h3 className="text-2xl font-black text-white tracking-tight">
              {activeYearObj?.name}
            </h3>
            <p className="text-xs text-slate-300 flex items-center gap-4 flex-wrap">
              <span>
                Période officielle : <strong>{activeYearObj?.startDate}</strong> au{' '}
                <strong>{activeYearObj?.endDate}</strong>
              </span>
              <span>•</span>
              <span>
                Statut : <strong className="text-emerald-300">Ouverte & Active</strong>
              </span>
            </p>
          </div>

          {/* Quick Stats for this active year */}
          <div className="grid grid-cols-3 gap-3 bg-slate-800/80 p-3 rounded-xl border border-slate-700/80 backdrop-blur-sm text-center">
            <div className="px-3">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Étudiants Inscrits</span>
              <span className="text-xl font-black text-white">{activeInscriptionsCount}</span>
            </div>
            <div className="px-3 border-l border-slate-700">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Unités d'Enseignement</span>
              <span className="text-xl font-black text-indigo-300">{activeUesCount}</span>
            </div>
            <div className="px-3 border-l border-slate-700">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Matières (ECs)</span>
              <span className="text-xl font-black text-emerald-300">{activeEcsCount}</span>
            </div>
          </div>
        </div>

        {/* Semesters Sub-bar */}
        <div className="mt-6 pt-4 border-t border-indigo-800/40 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {activeYearObj?.semesters?.map((sem) => (
            <div
              key={sem.code}
              className={`p-3 rounded-xl border flex items-center justify-between ${
                sem.isActive
                  ? 'bg-blue-600/20 border-blue-400/40 text-blue-200'
                  : 'bg-slate-800/50 border-slate-700/60 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-bold px-2 py-0.5 bg-white/10 rounded text-[11px] font-mono">
                  {sem.code}
                </span>
                <div>
                  <span className="font-bold block">{sem.name}</span>
                  <span className="text-[10px] text-slate-400">
                    {sem.startDate} → {sem.endDate}
                  </span>
                </div>
              </div>
              {sem.isActive ? (
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 font-bold rounded-full text-[10px] border border-emerald-500/30">
                  En cours
                </span>
              ) : (
                <span className="text-[10px] text-slate-400">À venir / Clos</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 3. Academic Years Directory List */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-sm text-slate-900">
              Répertoire de Toutes les Années Académiques ({academicYears.length})
            </h3>
            <p className="text-xs text-slate-500">
              Sélectionnez une année pour filtrer l'ensemble du système ou définir l'année en cours.
            </p>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {academicYears.map((ay) => {
            const isSelected = ay.code === selectedAcademicYear;
            const isCur = ay.isCurrent;
            const yearUes = ues.filter((u) => u.academicYear === ay.code);
            const yearInscriptions = inscriptions.filter((i) => i.academicYear === ay.code);

            return (
              <div
                key={ay.id}
                className={`p-4 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isCur ? 'bg-indigo-50/40' : isSelected ? 'bg-blue-50/30' : 'hover:bg-slate-50/70'
                }`}
              >
                {/* Year Info */}
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2.5 rounded-xl text-white font-bold text-xs flex-shrink-0 ${
                      isCur ? 'bg-emerald-600' : 'bg-slate-700'
                    }`}
                  >
                    <CalendarDays className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-slate-900 text-sm">{ay.code}</span>
                      {isCur && (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-600" />
                          Année Active
                        </span>
                      )}
                      {isSelected && !isCur && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded-full">
                          Affichage sélectionné
                        </span>
                      )}
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-semibold rounded-full">
                        {ay.status === 'OPEN' ? 'Ouverte' : ay.status === 'CLOSED' ? 'Clôturée' : 'Archivée'}
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-900 text-sm mt-0.5">{ay.name}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Du <strong>{ay.startDate}</strong> au <strong>{ay.endDate}</strong> • {yearUes.length} UEs •{' '}
                      {yearInscriptions.length} étudiants inscrits
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end md:self-center flex-wrap">
                  {/* Select Year for Viewing */}
                  <button
                    type="button"
                    onClick={() => setSelectedAcademicYear(ay.code)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {isSelected ? '✓ Affichée' : 'Afficher'}
                  </button>

                  {/* Make Active */}
                  {isStaffOrAdmin && !isCur && (
                    <button
                      type="button"
                      onClick={() => setActiveAcademicYear(ay.code)}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      title="Définir comme année académique courante de l'établissement"
                    >
                      Définir Active
                    </button>
                  )}

                  {/* Edit */}
                  {isStaffOrAdmin && (
                    <button
                      type="button"
                      onClick={() => openEditModal(ay)}
                      className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                      title="Modifier les paramètres"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}

                  {/* Delete (if not active and has no students) */}
                  {isStaffOrAdmin && !isCur && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Confirmez-vous la suppression de l'année académique ${ay.code} ?`)) {
                          deleteAcademicYear(ay.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Supprimer l'année académique"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Modal: Create or Edit Academic Year */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    {editingYear ? 'Modifier l’Année Académique' : 'Créer une Nouvelle Année Académique'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Configuration des dates, semestres et basculement d'année
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formMsg && (
              <div
                className={`mt-3 p-3 rounded-xl text-xs flex items-center gap-2 ${
                  formMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {formMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                )}
                <span>{formMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase text-slate-700 mb-1">
                    Code de l'année *
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="2027-2028"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-xs focus:ring-1 focus:ring-indigo-600"
                    required
                  />
                  <span className="text-[10px] text-slate-400">Format : AAAA-AAAA</span>
                </div>

                <div>
                  <label className="block font-bold uppercase text-slate-700 mb-1">
                    Intitulé officiel *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Année Universitaire 2027-2028"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-indigo-600"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase text-slate-700 mb-1">
                    Date de début officielle *
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase text-slate-700 mb-1">
                    Date de fin officielle *
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs"
                    required
                  />
                </div>
              </div>

              {/* Options */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isCurrent}
                    onChange={(e) => setIsCurrent(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <span className="font-bold text-slate-800">
                    Définir immédiatement comme Année Académique Active
                  </span>
                </label>

                {!editingYear && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cloneFromPrevious}
                      onChange={(e) => setCloneFromPrevious(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <span className="text-slate-700 font-medium">
                      Dupliquer automatiquement les maquettes LMD et cours de l'année précédente (
                      {selectedAcademicYear})
                    </span>
                  </label>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all shadow-xs"
                >
                  {editingYear ? 'Enregistrer les modifications' : 'Créer l’Année Académique'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
