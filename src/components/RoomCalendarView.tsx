import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  MapPin,
  Users,
  Tv,
  CheckCircle2,
  Calendar,
  Clock,
  Layers,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  Plus,
  X,
  Sliders,
  Wrench,
  Check,
  Sparkles,
  Settings2,
} from 'lucide-react';
import { Room } from '../types';

interface RoomCalendarViewProps {
  onNavigateToCreate?: () => void;
}

const PRESET_EQUIPMENT_CATALOG = [
  'Vidéoprojecteur Laser 4K Ultra HD',
  'Écran Tactile Interactif 85"',
  'Caméra PTZ motorisée avec auto-tracking',
  'Microphones de plafond captation 360°',
  'Sonorisation amplifiée & Micros HF sans fil',
  '30 Postes Stations IA GPU RTX 4090',
  '35 Postes Linux/Windows i7 32GB RAM',
  'Réseau Gigabit dédié & Switch manageable',
  'Prises secteur & USB-C intégrées par table',
  'Tableau blanc céramique magnétique',
  'Tableau blanc interactif tactile',
  'Climatisation réversible Inverter',
  'Kit Baie de brassage & Équipements Réseau Cisco',
  'Imprimante 3D & Stations de prototypage',
  'Casques Réalité Virtuelle Meta Quest 3',
  'Oscilloscopes & Bacs électroniques',
];

export const RoomCalendarView: React.FC<RoomCalendarViewProps> = ({ onNavigateToCreate }) => {
  const { rooms, sessions, courses, users, groups, updateRoom } = useApp();
  const [selectedRoomId, setSelectedRoomId] = useState<string>(rooms[0]?.id || '');
  const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState<boolean>(false);
  const [inlineEquipInput, setInlineEquipInput] = useState<string>('');
  const [customEquipModalInput, setCustomEquipModalInput] = useState<string>('');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const activeRoom = rooms.find((r) => r.id === selectedRoomId) || rooms[0];

  // Temp editing state for modal
  const [modalEquipments, setModalEquipments] = useState<string[]>(activeRoom?.equipment || []);
  const [modalCapacity, setModalCapacity] = useState<number>(activeRoom?.capacity || 30);
  const [modalStatus, setModalStatus] = useState<Room['status']>(activeRoom?.status || 'available');

  const openCustomizeModal = () => {
    if (activeRoom) {
      setModalEquipments([...activeRoom.equipment]);
      setModalCapacity(activeRoom.capacity);
      setModalStatus(activeRoom.status);
      setCustomEquipModalInput('');
      setIsCustomizeModalOpen(true);
    }
  };

  const showNotification = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  // Quick remove single equipment
  const handleRemoveSingleEquipment = (eqToRemove: string) => {
    if (!activeRoom) return;
    const updated = activeRoom.equipment.filter((item) => item !== eqToRemove);
    updateRoom(activeRoom.id, { equipment: updated });
    showNotification(`Équipement "${eqToRemove}" retiré de ${activeRoom.code}`);
  };

  // Quick add single equipment
  const handleQuickAddEquipment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRoom || !inlineEquipInput.trim()) return;
    const clean = inlineEquipInput.trim();
    if (activeRoom.equipment.includes(clean)) {
      showNotification(`"${clean}" est déjà installé dans cette salle.`);
      setInlineEquipInput('');
      return;
    }
    const updated = [...activeRoom.equipment, clean];
    updateRoom(activeRoom.id, { equipment: updated });
    setInlineEquipInput('');
    showNotification(`Équipement "${clean}" ajouté à ${activeRoom.code} !`);
  };

  // Modal actions
  const handleToggleModalPreset = (eq: string) => {
    if (modalEquipments.includes(eq)) {
      setModalEquipments(modalEquipments.filter((item) => item !== eq));
    } else {
      setModalEquipments([...modalEquipments, eq]);
    }
  };

  const handleAddCustomToModal = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = customEquipModalInput.trim();
    if (!clean) return;
    if (modalEquipments.includes(clean)) {
      showNotification(`"${clean}" est déjà dans la sélection.`);
      return;
    }
    setModalEquipments([...modalEquipments, clean]);
    setCustomEquipModalInput('');
  };

  const handleRemoveFromModal = (eqToRemove: string) => {
    setModalEquipments(modalEquipments.filter((item) => item !== eqToRemove));
  };

  const handleSaveModalCustomization = () => {
    if (!activeRoom) return;
    updateRoom(activeRoom.id, {
      equipment: modalEquipments,
      capacity: Number(modalCapacity) || activeRoom.capacity,
      status: modalStatus,
    });
    setIsCustomizeModalOpen(false);
    showNotification(`Équipements et fiche de la salle ${activeRoom.code} mis à jour avec succès !`);
  };

  // Helper date for days of current week
  const getDayInfo = (offset: number) => {
    const now = new Date();
    const currentDay = now.getDay();
    const distanceToMonday = (currentDay + 6) % 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - distanceToMonday + offset);
    return {
      dateStr: monday.toISOString().split('T')[0],
      display: monday.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }),
    };
  };

  const weekDays = [0, 1, 2, 3, 4, 5, 6].map(getDayInfo);

  // Sessions assigned to this specific room
  const roomSessions = sessions.filter(
    (s) => s.roomId === activeRoom?.id && s.status !== 'CANCELLED'
  );

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                <MapPin className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                Gestion des Salles & Calendriers Dédiés
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Chaque salle dispose de sa fiche technique (capacité, équipements) et de son calendrier distinct.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-3 py-1.5 bg-blue-50 text-blue-800 rounded-xl border border-blue-200">
              {rooms.length} salles répertoriées
            </span>
            {onNavigateToCreate && (
              <button
                onClick={onNavigateToCreate}
                className="px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1"
              >
                + Créer une Salle
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Room Selection Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {rooms.map((room) => {
          const isSelected = room.id === activeRoom?.id;
          const assignedCount = sessions.filter((s) => s.roomId === room.id && s.status !== 'CANCELLED').length;

          return (
            <button
              key={room.id}
              onClick={() => setSelectedRoomId(room.id)}
              className={`p-3 rounded-2xl border text-left transition-all min-w-[190px] flex-shrink-0 cursor-pointer ${
                isSelected
                  ? 'bg-blue-900 text-white border-blue-900 shadow-md ring-2 ring-blue-600/30'
                  : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className={`text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                  isSelected ? 'bg-blue-800 text-blue-200' : 'bg-slate-100 text-slate-600'
                }`}>
                  {room.code}
                </span>
                <span className={`text-[10px] font-semibold ${isSelected ? 'text-blue-200' : 'text-slate-400'}`}>
                  {assignedCount} cours
                </span>
              </div>
              <h4 className="text-xs font-bold truncate leading-tight">{room.name}</h4>
              <p className={`text-[11px] mt-1 ${isSelected ? 'text-blue-200' : 'text-slate-500'}`}>
                {room.capacity} places • {room.floor}
              </p>
            </button>
          );
        })}
      </div>

      {/* Selected Room Technical Sheet + Dedicated Calendar */}
      {activeRoom && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          
          {/* Room Technical Card */}
          <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200 space-y-4">
            {feedbackMsg && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 animate-fadeIn">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span className="font-semibold">{feedbackMsg}</span>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-blue-600 tracking-wider">
                  Fiche Technique Salle
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  activeRoom.status === 'available' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  ● {activeRoom.status === 'available' ? 'Disponible' : 'Maintenance'}
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 mt-0.5">
                {activeRoom.name}
              </h3>
              <p className="text-xs text-slate-500">
                {activeRoom.building} • {activeRoom.floor}
              </p>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-blue-600" /> Capacité assise :
                </span>
                <span className="font-bold text-slate-800">{activeRoom.capacity} étudiants</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Statut :
                </span>
                <span className="font-bold text-emerald-700 capitalize">{activeRoom.status}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-purple-600" /> Réservations :
                </span>
                <span className="font-bold text-slate-800">{roomSessions.length} séances</span>
              </div>
            </div>

            {/* Equipment Section with Full Customization */}
            <div className="space-y-2.5 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Tv className="w-3.5 h-3.5 text-blue-600" /> Équipements ({activeRoom.equipment.length})
                </h4>
                <button
                  type="button"
                  onClick={openCustomizeModal}
                  className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold rounded-lg border border-blue-200 flex items-center gap-1 transition-colors cursor-pointer"
                  title="Personnaliser et ajouter des équipements"
                >
                  <Sliders className="w-3 h-3" />
                  Personnaliser
                </button>
              </div>

              {/* Installed items with remove cross */}
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {activeRoom.equipment.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">
                    Aucun équipement renseigné pour cette salle.
                  </p>
                ) : (
                  activeRoom.equipment.map((eq, i) => (
                    <div
                      key={i}
                      className="group flex items-center justify-between gap-1.5 p-1.5 bg-slate-50 hover:bg-blue-50/50 rounded-lg border border-slate-200 text-xs text-slate-700 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                        <span className="truncate" title={eq}>{eq}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveSingleEquipment(eq)}
                        className="opacity-60 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition-all cursor-pointer"
                        title={`Retirer "${eq}"`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Quick inline custom equipment adder */}
              <form onSubmit={handleQuickAddEquipment} className="pt-2">
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                  Ajout rapide d'un équipement libre :
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={inlineEquipInput}
                    onChange={(e) => setInlineEquipInput(e.target.value)}
                    placeholder="Ex: Switch Cisco 24p, Tableau mobile..."
                    className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-blue-600 focus:bg-white"
                  />
                  <button
                    type="submit"
                    disabled={!inlineEquipInput.trim()}
                    className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Ajouter
                  </button>
                </div>
              </form>

              <button
                type="button"
                onClick={openCustomizeModal}
                className="w-full mt-2 py-2 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Settings2 className="w-3.5 h-3.5" />
                Ouvrir le catalogue & Personnalisation
              </button>
            </div>
          </div>

          {/* Room Dedicated Calendar */}
          <div className="lg:col-span-3 bg-white rounded-2xl shadow-xs border border-slate-200 p-4 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  Planning d'occupation officiel de {activeRoom.name}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Détection des chevauchements active : aucune double attribution autorisée.
                </p>
              </div>

              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg">
                Semaine complète (7 jours)
              </span>
            </div>

            {/* Week days columns (Lundi à Dimanche) */}
            <div className="grid grid-cols-1 sm:grid-cols-7 gap-2 flex-1 min-h-[380px]">
              {weekDays.map((day) => {
                const daySessions = roomSessions
                  .filter((s) => s.date === day.dateStr)
                  .sort((a, b) => a.startTime.localeCompare(b.startTime));

                return (
                  <div key={day.dateStr} className="bg-slate-50/70 rounded-xl p-2.5 border border-slate-200 flex flex-col">
                    <div className="text-center pb-2 border-b border-slate-200 mb-2">
                      <span className="block text-xs font-bold text-slate-800 uppercase">
                        {day.display}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {day.dateStr}
                      </span>
                    </div>

                    <div className="space-y-2 flex-1">
                      {daySessions.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-[11px] text-slate-400 italic py-8">
                          Salle libre
                        </div>
                      ) : (
                        daySessions.map((session) => {
                          const course = courses.find((c) => c.id === session.courseId);
                          const teacher = users.find((u) => u.id === session.teacherId);
                          const assignedGroups = session.groupIds.map((gId) => groups.find((g) => g.id === gId)?.code);

                          return (
                            <div
                              key={session.id}
                              className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-xs text-xs space-y-1"
                            >
                              <div className="flex items-center justify-between text-[11px] font-bold text-blue-900">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-blue-600" />
                                  {session.startTime} - {session.endTime}
                                </span>
                                <span className="text-[10px] text-slate-500 font-semibold">
                                  {session.durationHours}h
                                </span>
                              </div>

                              <h5 className="font-bold text-slate-900 leading-snug">
                                {course?.title}
                              </h5>

                              <p className="text-[10px] text-slate-600 font-medium">
                                Prof: {teacher?.name}
                              </p>

                              <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                                <span>{assignedGroups.join(', ')}</span>
                                <span className="text-emerald-700 font-semibold">Occupée</span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: PERSONNALISATION COMPLÈTE DES ÉQUIPEMENTS DE LA SALLE --- */}
      {isCustomizeModalOpen && activeRoom && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[90vh] animate-scaleIn">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600 text-white rounded-2xl shadow-xs">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">
                    Personnaliser les Équipements de la Salle
                  </h3>
                  <p className="text-xs text-blue-200">
                    {activeRoom.name} <span className="font-mono font-bold">({activeRoom.code})</span> • {activeRoom.building}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCustomizeModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              
              {/* Active equipments pills */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-bold uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Équipements actuellement affectés ({modalEquipments.length}) :
                  </label>
                  {modalEquipments.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setModalEquipments([])}
                      className="text-[11px] text-red-600 hover:underline cursor-pointer"
                    >
                      Tout effacer
                    </button>
                  )}
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl min-h-[50px] flex flex-wrap gap-2 items-center">
                  {modalEquipments.length === 0 ? (
                    <span className="text-slate-400 italic text-xs">
                      Aucun équipement affecté pour l'instant. Choisissez dans le catalogue ci-dessous ou ajoutez un équipement personnalisé.
                    </span>
                  ) : (
                    modalEquipments.map((eq, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-blue-200 text-blue-900 font-semibold rounded-xl text-xs shadow-2xs hover:border-blue-300"
                      >
                        <span>{eq}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFromModal(eq)}
                          className="text-slate-400 hover:text-red-600 rounded-full p-0.5 hover:bg-red-50 cursor-pointer"
                          title={`Supprimer ${eq}`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* Free text custom equipment adder */}
              <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-200/80 space-y-2">
                <label className="font-bold text-blue-900 block">
                  ✨ Saisir un équipement sur-mesure / personnalisé :
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customEquipModalInput}
                    onChange={(e) => setCustomEquipModalInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomToModal();
                      }
                    }}
                    placeholder="Ex: Écran interactif 85 pouces, Kit Réseau Cisco, 30 Casques VR..."
                    className="flex-1 px-3 py-2 bg-white border border-blue-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-600"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddCustomToModal()}
                    disabled={!customEquipModalInput.trim()}
                    className="px-4 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-40 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter
                  </button>
                </div>
                <p className="text-[11px] text-blue-700/80">
                  Tapez le libellé souhaité et cliquez sur <strong>Ajouter</strong> (ou appuyez sur Entrée). Vous êtes 100% libre de nommer vos équipements.
                </p>
              </div>

              {/* Preset equipment catalog */}
              <div>
                <label className="font-bold uppercase text-slate-700 tracking-wider block mb-2">
                  Catalogue & Suggestions universitaires (Cliquer pour activer / désactiver) :
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                  {PRESET_EQUIPMENT_CATALOG.map((item) => {
                    const isSelected = modalEquipments.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => handleToggleModalPreset(item)}
                        className={`p-2.5 rounded-xl border text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 font-semibold shadow-xs'
                            : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        <span className="truncate text-xs">{item}</span>
                        {isSelected ? (
                          <div className="w-4 h-4 rounded-full bg-white text-blue-600 flex items-center justify-center flex-shrink-0">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        ) : (
                          <Plus className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Room capacity and status adjustments */}
              <div className="pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Capacité assise (étudiants) :
                  </label>
                  <input
                    type="number"
                    value={modalCapacity}
                    onChange={(e) => setModalCapacity(Number(e.target.value))}
                    min={1}
                    max={500}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Statut opérationnel :
                  </label>
                  <select
                    value={modalStatus}
                    onChange={(e) => setModalStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                  >
                    <option value="available">Disponible pour cours</option>
                    <option value="maintenance">En maintenance technique</option>
                  </select>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsCustomizeModalOpen(false)}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSaveModalCustomization}
                className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                Enregistrer les équipements ({modalEquipments.length})
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

