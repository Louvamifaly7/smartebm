import React, { useState, useMemo } from 'react';
import {
  Layers,
  Plus,
  BookOpen,
  Trash2,
  Edit2,
  Check,
  AlertCircle,
  CheckCircle2,
  Filter,
  Search,
  Sparkles,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { UniteEnseignement, ElementConstitutif } from '../../types';

export const UeEcWorkspace: React.FC = () => {
  const {
    ues,
    ecs,
    addUe,
    updateUe,
    deleteUe,
    addEc,
    updateEc,
    deleteEc,
    filieres,
    selectedAcademicYear,
  } = useApp();

  const [notification, setNotification] = useState<{ msg: string; isError?: boolean } | null>(null);
  const showNotif = (msg: string, isError = false) => {
    setNotification({ msg, isError });
    setTimeout(() => setNotification(null), 4000);
  };

  // Filter state
  const [search, setSearch] = useState('');
  const [filterFiliere, setFilterFiliere] = useState('ALL');
  const [filterLevel, setFilterLevel] = useState('ALL');
  const [filterSemester, setFilterSemester] = useState('ALL');

  // Form states - UE
  const [showUeModal, setShowUeModal] = useState(false);
  const [ueCode, setUeCode] = useState('');
  const [ueTitle, setUeTitle] = useState('');
  const [ueFiliere, setUeFiliere] = useState(filieres[0]?.id || '');
  const [ueLevel, setUeLevel] = useState('L1');
  const [ueSemester, setUeSemester] = useState('S1');
  const [ueEcts, setUeEcts] = useState(6);
  const [ueCoeff, setUeCoeff] = useState(2);

  // Form states - EC
  const [showEcModal, setShowEcModal] = useState(false);
  const [ecUeId, setEcUeId] = useState('');
  const [ecCode, setEcCode] = useState('');
  const [ecTitle, setEcTitle] = useState('');
  const [ecSemester, setEcSemester] = useState('S1');
  const [ecEcts, setEcEcts] = useState(3);
  const [ecCoeff, setEcCoeff] = useState(1);
  const [ecHours, setEcHours] = useState(30);

  // Filtered UEs
  const filteredUes = useMemo(() => {
    return ues.filter((u) => {
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const codeM = u.code.toLowerCase().includes(q);
        const titleM = u.title.toLowerCase().includes(q);
        if (!codeM && !titleM) return false;
      }
      if (filterFiliere !== 'ALL' && u.filiereId !== filterFiliere) return false;
      if (filterLevel !== 'ALL' && u.level !== filterLevel) return false;
      if (filterSemester !== 'ALL' && u.semester !== filterSemester) return false;
      return true;
    });
  }, [ues, search, filterFiliere, filterLevel, filterSemester]);

  const handleCreateUe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ueCode.trim() || !ueTitle.trim()) {
      showNotif('Code et Titre de l\'UE sont obligatoires.', true);
      return;
    }
    const cleanCode = ueCode.trim().toUpperCase();
    if (ues.some((u) => u.code.toUpperCase() === cleanCode)) {
      showNotif(`Une UE avec le code "${cleanCode}" existe déjà.`, true);
      return;
    }
    const res = addUe({
      code: cleanCode,
      title: ueTitle.trim(),
      filiereId: ueFiliere || filieres[0]?.id || 'fil-1',
      level: ueLevel,
      semester: ueSemester,
      creditsEcts: Number(ueEcts) || 6,
      coefficient: Number(ueCoeff) || 2,
      academicYear: selectedAcademicYear || '2026-2027',
      ecIds: [],
      validationThreshold: 10,
      status: 'ACTIVE',
    });
    if (res.success) {
      showNotif(`Unité d'Enseignement "${cleanCode}" créée avec succès.`);
      setUeCode('');
      setUeTitle('');
      setShowUeModal(false);
    } else {
      showNotif(res.error || 'Erreur lors de la création de l\'UE.', true);
    }
  };

  const handleCreateEc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ecCode.trim() || !ecTitle.trim() || !ecUeId) {
      showNotif('Code, Titre et rattachement à une UE sont obligatoires.', true);
      return;
    }
    const cleanCode = ecCode.trim().toUpperCase();
    if (ecs.some((ec) => ec.code.toUpperCase() === cleanCode)) {
      showNotif(`Un EC avec le code "${cleanCode}" existe déjà.`, true);
      return;
    }
    const res = addEc({
      ueId: ecUeId,
      code: cleanCode,
      title: ecTitle.trim(),
      semester: ecSemester,
      creditsEcts: Number(ecEcts) || 3,
      coefficient: Number(ecCoeff) || 1,
      hourlyVolume: Number(ecHours) || 30,
      teacherIds: [],
      groupIds: [],
      quizWeight: 0.4,
      examWeight: 0.6,
      status: 'ACTIVE',
    });
    if (res.success) {
      showNotif(`Élément Constitutif "${cleanCode}" créé avec succès.`);
      setEcCode('');
      setEcTitle('');
      setShowEcModal(false);
    } else {
      showNotif(res.error || 'Erreur lors de la création de l\'EC.', true);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-xs">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Unités d'Enseignement (UE) & Éléments Constitutifs (EC)
                </h3>
                <p className="text-xs text-slate-500">
                  Structure académique LMD : Définition des blocs d'enseignement, crédits ECTS et coefficients de délibération.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setEcUeId(ues[0]?.id || '');
                setShowEcModal(true);
              }}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 text-emerald-600" />
              Nouvel EC
            </button>
            <button
              type="button"
              onClick={() => setShowUeModal(true)}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Nouvelle UE
            </button>
          </div>
        </div>

        {/* Notifications */}
        {notification && (
          <div
            className={`mt-4 p-3 rounded-2xl flex items-center gap-2 text-xs font-semibold ${
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

        {/* Filters */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-2.5">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une UE ou un EC..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <select
            value={filterFiliere}
            onChange={(e) => setFilterFiliere(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
          >
            <option value="ALL">Toutes les mentions</option>
            {filieres.map((f) => (
              <option key={f.id} value={f.id}>
                {f.code} - {f.name}
              </option>
            ))}
          </select>

          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
          >
            <option value="ALL">Tous les niveaux</option>
            <option value="L1">L1</option>
            <option value="L2">L2</option>
            <option value="L3">L3</option>
            <option value="M1">M1</option>
            <option value="M2">M2</option>
          </select>

          <select
            value={filterSemester}
            onChange={(e) => setFilterSemester(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
          >
            <option value="ALL">Tous les semestres</option>
            {['S1', 'S2', 'S3', 'S4', 'S5', 'S6'].map((s) => (
              <option key={s} value={s}>
                Semestre {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* UEs List */}
      <div className="space-y-3">
        {filteredUes.length === 0 ? (
          <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center text-slate-400">
            <Layers className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="font-semibold text-sm">Aucune Unité d'Enseignement trouvée.</p>
          </div>
        ) : (
          filteredUes.map((ue) => {
            const fil = filieres.find((f) => f.id === ue.filiereId);
            const attachedEcs = ecs.filter((ec) => ec.ueId === ue.id);
            const totalHours = attachedEcs.reduce((acc, ec) => acc + (ec.hourlyVolume || 0), 0);

            return (
              <div
                key={ue.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden"
              >
                {/* UE Header */}
                <div className="p-4 bg-slate-50/75 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3">
                    <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-lg bg-blue-100 text-blue-900 border border-blue-200">
                      {ue.code}
                    </span>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{ue.title}</h4>
                      <p className="text-[11px] text-slate-500">
                        {fil?.name || 'Filière'} • Niveau {ue.level} • Semestre {ue.semester}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap text-xs">
                    <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                      {ue.creditsEcts} Crédits ECTS
                    </span>
                    <span className="px-2 py-1 rounded-full bg-slate-200 text-slate-700 font-semibold text-[11px]">
                      Coeff. {ue.coefficient || 2}
                    </span>
                    <span className="text-slate-500 font-semibold">
                      {totalHours}h au total
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Supprimer l'UE "${ue.title}" (${ue.code}) ?`)) {
                          deleteUe(ue.id);
                          showNotif(`UE "${ue.code}" supprimée.`);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                      title="Supprimer cette UE"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Attached ECs */}
                <div className="p-3 bg-white">
                  {attachedEcs.length === 0 ? (
                    <div className="p-3 text-center text-slate-400 text-xs italic">
                      Aucun Élément Constitutif (EC) rattaché à cette UE.{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setEcUeId(ue.id);
                          setShowEcModal(true);
                        }}
                        className="text-blue-600 font-semibold hover:underline"
                      >
                        + Ajouter un EC
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {attachedEcs.map((ec) => (
                        <div
                          key={ec.id}
                          className="py-2.5 px-3 flex items-center justify-between hover:bg-slate-50 rounded-xl transition-colors text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono font-bold text-[11px] text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                              {ec.code}
                            </span>
                            <span className="font-semibold text-slate-900">{ec.title}</span>
                          </div>

                          <div className="flex items-center gap-3 text-slate-600">
                            <span className="font-bold text-blue-700">{ec.hourlyVolume}h</span>
                            <span>{ec.creditsEcts} ECTS</span>
                            <span>Coeff {ec.coefficient || 1}</span>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Supprimer l'EC "${ec.title}" ?`)) {
                                  deleteEc(ec.id);
                                  showNotif(`EC "${ec.code}" supprimé.`);
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-red-600"
                              title="Supprimer l'EC"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Nouvelle UE */}
      {showUeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h4 className="font-bold text-sm">Créer une Unité d'Enseignement (UE)</h4>
              <button onClick={() => setShowUeModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleCreateUe} className="p-5 space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Code UE * (ex: UE-INFO-101)</label>
                <input
                  type="text"
                  value={ueCode}
                  onChange={(e) => setUeCode(e.target.value.toUpperCase())}
                  className="w-full p-2 bg-slate-50 border rounded-xl font-mono uppercase font-bold text-xs"
                  required
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Intitulé officiel *</label>
                <input
                  type="text"
                  value={ueTitle}
                  onChange={(e) => setUeTitle(e.target.value)}
                  className="w-full p-2 bg-slate-50 border rounded-xl text-xs font-medium"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Filière / Mention *</label>
                  <select
                    value={ueFiliere}
                    onChange={(e) => setUeFiliere(e.target.value)}
                    className="w-full p-2 bg-slate-50 border rounded-xl text-xs"
                  >
                    {filieres.map((f) => (
                      <option key={f.id} value={f.id}>{f.code} - {f.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Niveau *</label>
                  <select
                    value={ueLevel}
                    onChange={(e) => setUeLevel(e.target.value)}
                    className="w-full p-2 bg-slate-50 border rounded-xl text-xs"
                  >
                    <option value="L1">L1</option>
                    <option value="L2">L2</option>
                    <option value="L3">L3</option>
                    <option value="M1">M1</option>
                    <option value="M2">M2</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Semestre *</label>
                  <select
                    value={ueSemester}
                    onChange={(e) => setUeSemester(e.target.value)}
                    className="w-full p-2 bg-slate-50 border rounded-xl text-xs"
                  >
                    {['S1', 'S2', 'S3', 'S4', 'S5', 'S6'].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Crédits ECTS</label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={ueEcts}
                    onChange={(e) => setUeEcts(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Coefficient</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={ueCoeff}
                    onChange={(e) => setUeCoeff(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border rounded-xl text-xs font-bold"
                  />
                </div>
              </div>
              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUeModal(false)}
                  className="px-3.5 py-1.5 border rounded-xl font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 text-white font-bold rounded-xl"
                >
                  Créer l'UE
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nouvel EC */}
      {showEcModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h4 className="font-bold text-sm">Créer un Élément Constitutif (EC)</h4>
              <button onClick={() => setShowEcModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleCreateEc} className="p-5 space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">UE de rattachement *</label>
                <select
                  value={ecUeId}
                  onChange={(e) => setEcUeId(e.target.value)}
                  className="w-full p-2 bg-slate-50 border rounded-xl text-xs font-semibold"
                  required
                >
                  <option value="">-- Sélectionner une UE --</option>
                  {ues.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.code} - {u.title} ({u.level} • {u.semester})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Code EC * (ex: EC-ALGO)</label>
                  <input
                    type="text"
                    value={ecCode}
                    onChange={(e) => setEcCode(e.target.value.toUpperCase())}
                    className="w-full p-2 bg-slate-50 border rounded-xl font-mono uppercase font-bold text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Volume horaire (h) *</label>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={ecHours}
                    onChange={(e) => setEcHours(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border rounded-xl font-bold text-xs"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Intitulé de l'EC *</label>
                <input
                  type="text"
                  value={ecTitle}
                  onChange={(e) => setEcTitle(e.target.value)}
                  className="w-full p-2 bg-slate-50 border rounded-xl text-xs font-medium"
                  required
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Semestre</label>
                  <select
                    value={ecSemester}
                    onChange={(e) => setEcSemester(e.target.value)}
                    className="w-full p-2 bg-slate-50 border rounded-xl text-xs"
                  >
                    {['S1', 'S2', 'S3', 'S4', 'S5', 'S6'].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Crédits ECTS</label>
                  <input
                    type="number"
                    min={1}
                    max={15}
                    value={ecEcts}
                    onChange={(e) => setEcEcts(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Coefficient</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={ecCoeff}
                    onChange={(e) => setEcCoeff(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border rounded-xl text-xs font-bold"
                  />
                </div>
              </div>
              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEcModal(false)}
                  className="px-3.5 py-1.5 border rounded-xl font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 text-white font-bold rounded-xl"
                >
                  Créer l'EC
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
