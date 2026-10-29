import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Database,
  PlusCircle,
  MapPin,
  BookOpen,
  UserCheck,
  Users,
  GraduationCap,
  Sparkles,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Layers,
  Clock,
  Tv,
  Check,
  Plus,
  RotateCcw,
  X,
  Sliders,
} from 'lucide-react';
import { Course, Filiere, Room, StudentGroup, User } from '../types';

export const DataManagementHub: React.FC = () => {
  const {
    rooms,
    addRoom,
    updateRoom,
    deleteRoom,
    courses,
    addCourse,
    updateCourse,
    deleteCourse,
    users,
    addTeacher,
    updateTeacher,
    deleteTeacher,
    groups,
    addGroup,
    updateGroup,
    deleteGroup,
    filieres,
    addFiliere,
    updateFiliere,
    deleteFiliere,
    seedBatchDemoData,
    resetToDefaultData,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'ROOMS' | 'COURSES' | 'TEACHERS' | 'GROUPS' | 'FILIERES' | 'GENERATOR'>('COURSES');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const showNotification = (msg: string, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setSuccessMsg(null);
    } else {
      setSuccessMsg(msg);
      setErrorMsg(null);
    }
    setTimeout(() => {
      setSuccessMsg(null);
      setErrorMsg(null);
    }, 4000);
  };

  const teachers = users.filter((u) => u.role === 'TEACHER');

  // --- STATE FOR ROOM CREATION ---
  const [roomCode, setRoomCode] = useState('');
  const [roomName, setRoomName] = useState('');
  const [roomBuilding, setRoomBuilding] = useState('Bâtiment Principal EBM');
  const [roomFloor, setRoomFloor] = useState('1er Étage');
  const [roomCapacity, setRoomCapacity] = useState(35);
  const [roomColor, setRoomColor] = useState('#2563eb');
  const [roomStatus, setRoomStatus] = useState<'available' | 'maintenance'>('available');
  const [roomEquipments, setRoomEquipments] = useState<string[]>([
    'Vidéoprojecteur 4K laser',
    'Tableau blanc interactif',
  ]);
  const [customRoomEquipInput, setCustomRoomEquipInput] = useState<string>('');

  // Editing existing room equipment
  const [editingRoomEquip, setEditingRoomEquip] = useState<Room | null>(null);
  const [editRoomEquipList, setEditRoomEquipList] = useState<string[]>([]);
  const [editCustomInput, setEditCustomInput] = useState<string>('');

  const handleAddCustomEquipToForm = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = customRoomEquipInput.trim();
    if (!clean) return;
    if (!roomEquipments.includes(clean)) {
      setRoomEquipments((prev) => [...prev, clean]);
    }
    setCustomRoomEquipInput('');
  };

  const handleRemoveEquipFromForm = (item: string) => {
    setRoomEquipments((prev) => prev.filter((eq) => eq !== item));
  };

  const openEditRoomEquip = (room: Room) => {
    setEditingRoomEquip(room);
    setEditRoomEquipList([...room.equipment]);
    setEditCustomInput('');
  };

  const handleSaveExistingRoomEquip = () => {
    if (!editingRoomEquip) return;
    updateRoom(editingRoomEquip.id, { equipment: editRoomEquipList });
    showNotification(`Équipements de la salle "${editingRoomEquip.name}" mis à jour !`);
    setEditingRoomEquip(null);
  };

  const availableEquipList = [
    'Double Vidéoprojecteur 4K laser',
    'Vidéoprojecteur HD',
    'Écran interactif 85"',
    'Système audio & Micros HF',
    'Caméra visio motorisée',
    '30 Postes stations IA GPU RTX',
    '35 Postes Linux/Windows i7 32GB',
    'Microphones de plafond captation 360°',
    'Tableau blanc connecté',
    'Climatisation réversible',
    'Réseau Gigabit dédié',
  ];

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const res = addRoom({
      code: roomCode.trim().toUpperCase(),
      name: roomName.trim(),
      building: roomBuilding.trim(),
      floor: roomFloor.trim(),
      capacity: Number(roomCapacity) || 30,
      equipment: roomEquipments,
      status: roomStatus,
      colorCode: roomColor,
    });
    if (res.success) {
      showNotification(`Salle "${roomName}" (${roomCode.toUpperCase()}) créée avec succès !`);
      setRoomCode('');
      setRoomName('');
    } else {
      showNotification(res.error || 'Erreur lors de la création de la salle.', true);
    }
  };

  // --- STATE FOR COURSE CREATION ---
  const [courseCode, setCourseCode] = useState('');
  const [courseTitle, setCourseTitle] = useState('');
  const [courseTotalHours, setCourseTotalHours] = useState(30);
  const [courseDuration, setCourseDuration] = useState(2);
  const [courseFiliere, setCourseFiliere] = useState(filieres[0]?.id || '');
  const [courseLevel, setCourseLevel] = useState('L1');
  const [courseTeacherId, setCourseTeacherId] = useState(teachers[0]?.id || '');
  const [courseGroupIds, setCourseGroupIds] = useState<string[]>([groups[0]?.id || '']);
  const [courseColor, setCourseColor] = useState('#3b82f6');
  const [courseDesc, setCourseDesc] = useState('');

  const handleCreateCourse = (e: React.FormEvent) => {
    e.preventDefault();
    const res = addCourse({
      code: courseCode.trim().toUpperCase(),
      title: courseTitle.trim(),
      filiereId: courseFiliere || filieres[0]?.id || 'fil-1',
      level: courseLevel,
      academicYear: '2026-2027',
      groupIds: courseGroupIds.length > 0 ? courseGroupIds : [groups[0]?.id || ''],
      teacherIds: courseTeacherId ? [courseTeacherId] : [teachers[0]?.id || ''],
      totalHours: Number(courseTotalHours) || 30,
      defaultSessionDuration: Number(courseDuration) || 2,
      color: courseColor,
      description: courseDesc.trim() || undefined,
    });
    if (res.success) {
      showNotification(`Module "${courseTitle}" (${courseCode.toUpperCase()}) de ${courseTotalHours}h créé avec succès !`);
      setCourseCode('');
      setCourseTitle('');
      setCourseDesc('');
    } else {
      showNotification(res.error || 'Erreur lors de la création du cours.', true);
    }
  };

  // --- STATE FOR TEACHER CREATION ---
  const [teacherName, setTeacherName] = useState('');
  const [teacherEmail, setTeacherEmail] = useState('');
  const [teacherPhone, setTeacherPhone] = useState('');
  const [teacherSubjects, setTeacherSubjects] = useState('Génie Logiciel, Algorithmique');
  const [teacherMaxHours, setTeacherMaxHours] = useState(18);

  const handleCreateTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    const subjectsArray = teacherSubjects.split(',').map((s) => s.trim()).filter(Boolean);
    const res = addTeacher({
      name: teacherName.trim(),
      email: teacherEmail.trim(),
      phone: teacherPhone.trim() || undefined,
      subjects: subjectsArray,
      weeklyMaxHours: Number(teacherMaxHours) || 18,
    });
    if (res.success) {
      showNotification(`Enseignant "${teacherName}" ajouté avec succès !`);
      setTeacherName('');
      setTeacherEmail('');
      setTeacherPhone('');
    } else {
      showNotification(res.error || 'Erreur lors de la création de l\'enseignant.', true);
    }
  };

  // --- STATE FOR GROUP CREATION ---
  const [groupCode, setGroupCode] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupFiliere, setGroupFiliere] = useState(filieres[0]?.id || '');
  const [groupLevel, setGroupLevel] = useState('L1');
  const [groupCount, setGroupCount] = useState(32);
  const [hasSubgroups, setHasSubgroups] = useState(true);

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = groupCode.trim().toUpperCase();
    const subGroups = hasSubgroups
      ? [
          { id: `sub-${cleanCode.toLowerCase()}-1`, code: `${cleanCode}-TP1`, name: 'Groupe TP 1', studentCount: Math.ceil(groupCount / 2) },
          { id: `sub-${cleanCode.toLowerCase()}-2`, code: `${cleanCode}-TP2`, name: 'Groupe TP 2', studentCount: Math.floor(groupCount / 2) },
        ]
      : [];

    const res = addGroup({
      code: cleanCode,
      name: groupName.trim(),
      filiereId: groupFiliere || filieres[0]?.id || 'fil-1',
      level: groupLevel,
      academicYear: '2026-2027',
      studentCount: Number(groupCount) || 30,
      subGroups,
    });
    if (res.success) {
      showNotification(`Promotion / Groupe "${cleanCode}" créé avec succès !`);
      setGroupCode('');
      setGroupName('');
    } else {
      showNotification(res.error || 'Erreur lors de la création du groupe.', true);
    }
  };

  // --- STATE FOR FILIERE CREATION ---
  const [filiereCode, setFiliereCode] = useState('');
  const [filiereName, setFiliereName] = useState('');
  const [filiereDept, setFiliereDept] = useState('Pôle Technologies Numériques');

  const handleCreateFiliere = (e: React.FormEvent) => {
    e.preventDefault();
    const res = addFiliere({
      code: filiereCode.trim().toUpperCase(),
      name: filiereName.trim(),
      department: filiereDept.trim(),
    });
    if (res.success) {
      showNotification(`Filière "${filiereCode.toUpperCase()}" créée avec succès !`);
      setFiliereCode('');
      setFiliereName('');
    } else {
      showNotification(res.error || 'Erreur lors de la création de la filière.', true);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-xs">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Outil de Création & Gestion des Données
                </h2>
                <p className="text-xs text-slate-500">
                  Création complète des Salles, Cours, Enseignants, Groupes, Filières et Génération automatisée.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                seedBatchDemoData();
                showNotification('Jeu de données de test complet injecté avec succès !');
              }}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              Générer Données Démo (1-clic)
            </button>
          </div>
        </div>

        {/* Global Notifications */}
        {successMsg && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-800 text-xs font-semibold rounded-xl flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Sub Navigation Bar */}
        <div className="flex gap-1.5 overflow-x-auto pt-4 border-t border-slate-100 mt-4 no-scrollbar text-xs font-bold">
          <button
            onClick={() => setActiveTab('COURSES')}
            className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'COURSES' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Créer un Cours / Module ({courses.length})
          </button>

          <button
            onClick={() => setActiveTab('ROOMS')}
            className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'ROOMS' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <MapPin className="w-4 h-4" />
            Créer une Salle ({rooms.length})
          </button>

          <button
            onClick={() => setActiveTab('TEACHERS')}
            className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'TEACHERS' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            Créer un Enseignant ({teachers.length})
          </button>

          <button
            onClick={() => setActiveTab('GROUPS')}
            className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'GROUPS' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            Créer un Groupe ({groups.length})
          </button>

          <button
            onClick={() => setActiveTab('FILIERES')}
            className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'FILIERES' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            Filières & Pôles ({filieres.length})
          </button>

          <button
            onClick={() => setActiveTab('GENERATOR')}
            className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'GENERATOR' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            Générateur de Données
          </button>
        </div>
      </div>

      {/* --- TAB 1: COURSES CREATION --- */}
      {activeTab === 'COURSES' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Creation Form */}
          <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
              <PlusCircle className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-sm text-slate-900">
                Formulaire : Nouveau Cours / Module
              </h3>
            </div>
            <form onSubmit={handleCreateCourse} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold uppercase text-slate-700 mb-1">
                  Code du Cours * (ex: INF-201)
                </label>
                <input
                  type="text"
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value)}
                  placeholder="INF-201"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold font-mono text-xs focus:ring-1 focus:ring-blue-600"
                  required
                />
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-700 mb-1">
                  Intitulé du Cours *
                </label>
                <input
                  type="text"
                  value={courseTitle}
                  onChange={(e) => setCourseTitle(e.target.value)}
                  placeholder="Ex: Programmation Web Avancée"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-1 focus:ring-blue-600"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold uppercase text-slate-700 mb-1">
                    Volume Total Prévu *
                  </label>
                  <input
                    type="number"
                    value={courseTotalHours}
                    onChange={(e) => setCourseTotalHours(Number(e.target.value))}
                    min={6}
                    max={120}
                    step={2}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs"
                    required
                  />
                  <span className="text-[10px] text-slate-500">Ex: 30 h</span>
                </div>
                <div>
                  <label className="block font-bold uppercase text-slate-700 mb-1">
                    Durée standard séance
                  </label>
                  <select
                    value={courseDuration}
                    onChange={(e) => setCourseDuration(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  >
                    <option value={1.5}>1h30</option>
                    <option value={2}>2h00</option>
                    <option value={3}>3h00</option>
                    <option value={4}>4h00</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold uppercase text-slate-700 mb-1">
                    Filière
                  </label>
                  <select
                    value={courseFiliere}
                    onChange={(e) => setCourseFiliere(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  >
                    {filieres.map((f) => (
                      <option key={f.id} value={f.id}>{f.code} - {f.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold uppercase text-slate-700 mb-1">
                    Niveau
                  </label>
                  <select
                    value={courseLevel}
                    onChange={(e) => setCourseLevel(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  >
                    <option value="L1">Licence 1 (L1)</option>
                    <option value="L2">Licence 2 (L2)</option>
                    <option value="L3">Licence 3 (L3)</option>
                    <option value="M1">Master 1 (M1)</option>
                    <option value="M2">Master 2 (M2)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-700 mb-1">
                  Enseignant Responsable
                </label>
                <select
                  value={courseTeacherId}
                  onChange={(e) => setCourseTeacherId(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                >
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-700 mb-1">
                  Groupe(s) concerné(s) (cours partagé multi-groupes)
                </label>
                <select
                  multiple
                  value={courseGroupIds}
                  onChange={(e) => {
                    const sel = Array.from(e.target.selectedOptions, (opt) => opt.value);
                    setCourseGroupIds(sel);
                  }}
                  className="w-full p-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs h-18"
                >
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.code} ({g.studentCount} ét.)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-700 mb-1">
                  Description / Objectifs pédagogiques
                </label>
                <textarea
                  value={courseDesc}
                  onChange={(e) => setCourseDesc(e.target.value)}
                  placeholder="Compétences visées, prérequis..."
                  rows={2}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Enregistrer le cours ({courseTotalHours}h)
              </button>
            </form>
          </div>

          {/* Existing Courses List */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-xs border border-slate-200 flex flex-col">
            <h3 className="font-bold text-sm text-slate-900 pb-2 border-b border-slate-100 mb-3">
              Modules d'enseignement configurés ({courses.length})
            </h3>
            <div className="space-y-2.5 overflow-y-auto max-h-[560px] pr-1">
              {courses.map((c) => {
                const assignedTeacher = users.find((u) => u.id === c.teacherIds[0]);
                const assignedGroupNames = c.groupIds.map((gId) => groups.find((g) => g.id === gId)?.code).filter(Boolean);

                return (
                  <div
                    key={c.id}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-blue-900 bg-blue-100 px-2 py-0.5 rounded text-[10px]">
                          {c.code}
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm truncate">{c.title}</h4>
                        <span className="font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded text-[10px]">
                          {c.totalHours} h totales
                        </span>
                      </div>
                      <p className="text-slate-600 mt-1">
                        Professeur : <strong>{assignedTeacher?.name || 'Non assigné'}</strong> • Groupes : {assignedGroupNames.join(', ')}
                      </p>
                      {c.description && (
                        <p className="text-slate-500 italic mt-0.5 text-[11px] line-clamp-1">{c.description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        if (confirm(`Supprimer le cours "${c.title}" ?`)) {
                          deleteCourse(c.id);
                          showNotification(`Cours "${c.title}" supprimé.`);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                      title="Supprimer ce cours"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 2: ROOMS CREATION --- */}
      {activeTab === 'ROOMS' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Creation Form */}
          <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
              <PlusCircle className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-sm text-slate-900">
                Formulaire : Nouvelle Salle de Cours / Labo
              </h3>
            </div>
            <form onSubmit={handleCreateRoom} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold uppercase text-slate-700 mb-1">
                  Code Salle * (ex: LAB-DATA-1, AMPHI-B)
                </label>
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value)}
                  placeholder="SALLE-C105"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold font-mono text-xs focus:ring-1 focus:ring-blue-600"
                  required
                />
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-700 mb-1">
                  Nom d'usage de la Salle *
                </label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="Ex: Laboratoire Intelligence Artificielle"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-1 focus:ring-blue-600"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold uppercase text-slate-700 mb-1">
                    Bâtiment
                  </label>
                  <input
                    type="text"
                    value={roomBuilding}
                    onChange={(e) => setRoomBuilding(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase text-slate-700 mb-1">
                    Étage
                  </label>
                  <input
                    type="text"
                    value={roomFloor}
                    onChange={(e) => setRoomFloor(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold uppercase text-slate-700 mb-1">
                    Capacité assise (places) *
                  </label>
                  <input
                    type="number"
                    value={roomCapacity}
                    onChange={(e) => setRoomCapacity(Number(e.target.value))}
                    min={5}
                    max={300}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase text-slate-700 mb-1">
                    Statut initial
                  </label>
                  <select
                    value={roomStatus}
                    onChange={(e) => setRoomStatus(e.target.value as any)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  >
                    <option value="available">Disponible</option>
                    <option value="maintenance">En maintenance</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Équipements choisis ({roomEquipments.length})</span>
                  <span className="text-[10px] text-blue-600 font-normal">Personnalisables</span>
                </label>

                {/* Selected chips with remove cross */}
                <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl min-h-[42px] mb-2">
                  {roomEquipments.length === 0 ? (
                    <span className="text-[11px] text-slate-400 italic">Aucun équipement sélectionné.</span>
                  ) : (
                    roomEquipments.map((eq, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 bg-white border border-blue-200 text-blue-900 px-2 py-0.5 rounded-lg text-[11px] font-semibold"
                      >
                        <span className="truncate max-w-[140px]">{eq}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveEquipFromForm(eq)}
                          className="text-slate-400 hover:text-red-600 rounded-full"
                          title={`Retirer ${eq}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))
                  )}
                </div>

                {/* Custom equipment text input */}
                <div className="flex gap-1.5 mb-2">
                  <input
                    type="text"
                    value={customRoomEquipInput}
                    onChange={(e) => setCustomRoomEquipInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomEquipToForm();
                      }
                    }}
                    placeholder="Saisir équipement libre (ex: Imprimante 3D)..."
                    className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-1 focus:ring-blue-600"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddCustomEquipToForm()}
                    disabled={!customRoomEquipInput.trim()}
                    className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    +
                  </button>
                </div>

                {/* Presets checkboxes */}
                <div className="space-y-1 max-h-28 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-xl">
                  {availableEquipList.map((eq) => {
                    const isChecked = roomEquipments.includes(eq);
                    return (
                      <label key={eq} className="flex items-center gap-2 text-[11px] cursor-pointer hover:text-blue-700">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setRoomEquipments((prev) => [...prev, eq]);
                            } else {
                              setRoomEquipments((prev) => prev.filter((item) => item !== eq));
                            }
                          }}
                          className="rounded text-blue-600"
                        />
                        <span>{eq}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Créer la salle ({roomCapacity} pl.)
              </button>
            </form>
          </div>

          {/* Existing Rooms List */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-xs border border-slate-200 flex flex-col">
            <h3 className="font-bold text-sm text-slate-900 pb-2 border-b border-slate-100 mb-3 flex items-center justify-between">
              <span>Salles et Amphithéâtres enregistrés ({rooms.length})</span>
              <span className="text-[11px] font-normal text-slate-500">Équipements 100% éditables</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto max-h-[560px] pr-1">
              {rooms.map((r) => (
                <div
                  key={r.id}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between text-xs hover:border-slate-300"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-blue-900 bg-blue-100 px-2 py-0.5 rounded text-[10px]">
                        {r.code}
                      </span>
                      <span className="font-bold text-slate-800 text-[11px]">
                        {r.capacity} places
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm mt-1">{r.name}</h4>
                    <p className="text-slate-500 text-[11px]">{r.building} • {r.floor}</p>
                    
                    <div className="flex flex-wrap gap-1 mt-2">
                      {r.equipment.slice(0, 3).map((eq, i) => (
                        <span key={i} className="text-[9px] bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-600 truncate max-w-[130px]">
                          {eq}
                        </span>
                      ))}
                      {r.equipment.length > 3 && (
                        <span className="text-[9px] text-slate-400">+{r.equipment.length - 3} autres</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-slate-200 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className={`font-semibold ${r.status === 'available' ? 'text-emerald-700' : 'text-amber-700'}`}>
                        ● {r.status === 'available' ? 'Disponible' : 'Maintenance'}
                      </span>
                      <button
                        type="button"
                        onClick={() => openEditRoomEquip(r)}
                        className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded font-semibold text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                        title="Personnaliser les équipements de cette salle"
                      >
                        <Sliders className="w-2.5 h-2.5" />
                        Équipements
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Supprimer la salle "${r.name}" ?`)) {
                          deleteRoom(r.id);
                          showNotification(`Salle "${r.name}" supprimée.`);
                        }
                      }}
                      className="text-slate-400 hover:text-red-600 p-1 cursor-pointer"
                      title="Supprimer la salle"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 3: TEACHERS CREATION --- */}
      {activeTab === 'TEACHERS' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
              <PlusCircle className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-sm text-slate-900">
                Formulaire : Nouvel Enseignant
              </h3>
            </div>
            <form onSubmit={handleCreateTeacher} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold uppercase text-slate-700 mb-1">
                  Nom & Titre académique * (ex: Dr. Julien Morel)
                </label>
                <input
                  type="text"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  placeholder="Dr. Julien Morel"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-1 focus:ring-blue-600"
                  required
                />
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-700 mb-1">
                  Adresse e-mail institutionnelle *
                </label>
                <input
                  type="email"
                  value={teacherEmail}
                  onChange={(e) => setTeacherEmail(e.target.value)}
                  placeholder="julien.morel@ebm-institute.edu"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-1 focus:ring-blue-600"
                  required
                />
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-700 mb-1">
                  Téléphone professionnel
                </label>
                <input
                  type="tel"
                  value={teacherPhone}
                  onChange={(e) => setTeacherPhone(e.target.value)}
                  placeholder="+33 6 12 34 56 78"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-700 mb-1">
                  Matières d'enseignement (séparées par des virgules)
                </label>
                <input
                  type="text"
                  value={teacherSubjects}
                  onChange={(e) => setTeacherSubjects(e.target.value)}
                  placeholder="Algorithmique, Bases de Données, Sécurité"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-700 mb-1">
                  Charge horaire hebdomadaire max (heures/semaine)
                </label>
                <input
                  type="number"
                  value={teacherMaxHours}
                  onChange={(e) => setTeacherMaxHours(Number(e.target.value))}
                  min={4}
                  max={40}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Créer le compte enseignant
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-xs border border-slate-200">
            <h3 className="font-bold text-sm text-slate-900 pb-2 border-b border-slate-100 mb-3">
              Corps enseignant ({teachers.length})
            </h3>
            <div className="space-y-2.5 overflow-y-auto max-h-[560px] pr-1">
              {teachers.map((t) => (
                <div
                  key={t.id}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-900 font-bold flex items-center justify-center text-sm">
                      {t.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{t.name}</h4>
                      <p className="text-slate-500 text-[11px]">{t.email} • Contrat : {t.weeklyMaxHours || 18}h/semaine</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {t.subjects?.map((s, i) => (
                          <span key={i} className="text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-600">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm(`Supprimer l'enseignant "${t.name}" ?`)) {
                        deleteTeacher(t.id);
                        showNotification(`Enseignant "${t.name}" supprimé.`);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 4: GROUPS CREATION --- */}
      {activeTab === 'GROUPS' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
              <PlusCircle className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-sm text-slate-900">
                Formulaire : Nouveau Groupe / Promotion
              </h3>
            </div>
            <form onSubmit={handleCreateGroup} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold uppercase text-slate-700 mb-1">
                  Code du Groupe * (ex: L2-INFO-C)
                </label>
                <input
                  type="text"
                  value={groupCode}
                  onChange={(e) => setGroupCode(e.target.value)}
                  placeholder="L2-INFO-C"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold font-mono text-xs focus:ring-1 focus:ring-blue-600"
                  required
                />
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-700 mb-1">
                  Nom Complet du Groupe *
                </label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Licence 2 Informatique - Section C"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-1 focus:ring-blue-600"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold uppercase text-slate-700 mb-1">
                    Filière
                  </label>
                  <select
                    value={groupFiliere}
                    onChange={(e) => setGroupFiliere(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  >
                    {filieres.map((f) => (
                      <option key={f.id} value={f.id}>{f.code}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold uppercase text-slate-700 mb-1">
                    Niveau
                  </label>
                  <select
                    value={groupLevel}
                    onChange={(e) => setGroupLevel(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  >
                    <option value="L1">L1</option>
                    <option value="L2">L2</option>
                    <option value="L3">L3</option>
                    <option value="M1">M1</option>
                    <option value="M2">M2</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-700 mb-1">
                  Effectif total d'étudiants *
                </label>
                <input
                  type="number"
                  value={groupCount}
                  onChange={(e) => setGroupCount(Number(e.target.value))}
                  min={5}
                  max={200}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs"
                  required
                />
              </div>

              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={hasSubgroups}
                  onChange={(e) => setHasSubgroups(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span>Créer automatiquement 2 sous-groupes de TP (TP1 et TP2)</span>
              </label>

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Créer le groupe ({groupCount} étudiants)
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-xs border border-slate-200">
            <h3 className="font-bold text-sm text-slate-900 pb-2 border-b border-slate-100 mb-3">
              Groupes et Promotions ({groups.length})
            </h3>
            <div className="space-y-2.5 overflow-y-auto max-h-[560px] pr-1">
              {groups.map((g) => (
                <div
                  key={g.id}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start justify-between text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-blue-900 bg-blue-100 px-2 py-0.5 rounded text-[10px]">
                        {g.code}
                      </span>
                      <h4 className="font-bold text-slate-900 text-sm">{g.name}</h4>
                      <span className="font-bold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded text-[10px]">
                        {g.studentCount} étudiants
                      </span>
                    </div>
                    {g.subGroups.length > 0 && (
                      <div className="flex gap-2 mt-2">
                        {g.subGroups.map((sg) => (
                          <span key={sg.id} className="text-[10px] bg-purple-50 text-purple-800 border border-purple-200 px-2 py-0.5 rounded font-medium">
                            {sg.code} ({sg.studentCount} ét.)
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      if (confirm(`Supprimer le groupe "${g.code}" ?`)) {
                        deleteGroup(g.id);
                        showNotification(`Groupe "${g.code}" supprimé.`);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 5: FILIERES CREATION --- */}
      {activeTab === 'FILIERES' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
              <PlusCircle className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-sm text-slate-900">
                Formulaire : Nouvelle Filière
              </h3>
            </div>
            <form onSubmit={handleCreateFiliere} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold uppercase text-slate-700 mb-1">
                  Code Filière * (ex: CYBER, IA, FIN)
                </label>
                <input
                  type="text"
                  value={filiereCode}
                  onChange={(e) => setFiliereCode(e.target.value)}
                  placeholder="CYBER"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold font-mono text-xs focus:ring-1 focus:ring-blue-600"
                  required
                />
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-700 mb-1">
                  Nom Complet de la Filière *
                </label>
                <input
                  type="text"
                  value={filiereName}
                  onChange={(e) => setFiliereName(e.target.value)}
                  placeholder="Cybersécurité & Défense des SI"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-1 focus:ring-blue-600"
                  required
                />
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-700 mb-1">
                  Département / Pôle académique *
                </label>
                <input
                  type="text"
                  value={filiereDept}
                  onChange={(e) => setFiliereDept(e.target.value)}
                  placeholder="Pôle Technologies Numériques"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Créer la filière
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-xs border border-slate-200">
            <h3 className="font-bold text-sm text-slate-900 pb-2 border-b border-slate-100 mb-3">
              Filières et Départements ({filieres.length})
            </h3>
            <div className="space-y-2.5 overflow-y-auto max-h-[560px] pr-1">
              {filieres.map((f) => (
                <div
                  key={f.id}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-blue-900 bg-blue-100 px-2 py-0.5 rounded text-[10px]">
                        {f.code}
                      </span>
                      <h4 className="font-bold text-slate-900 text-sm">{f.name}</h4>
                    </div>
                    <p className="text-slate-500 text-[11px] mt-0.5">{f.department}</p>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm(`Supprimer la filière "${f.name}" ?`)) {
                        deleteFiliere(f.id);
                        showNotification(`Filière "${f.name}" supprimée.`);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 6: DATA GENERATOR & RESET --- */}
      {activeTab === 'GENERATOR' && (
        <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200 space-y-5">
          <div>
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Générateur & Réinitialisation des Données
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Générez instantanément des entités pour tester la planification assistée, la détection des conflits et les volumes horaires de l'EBM Institute.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                Générer un module complet de test (1-clic)
              </div>
              <p className="text-xs text-slate-600">
                Crée automatiquement la salle <strong>LABO-CYBER</strong> (28 places avec équipements réseau), le cours <strong>CYB-501</strong>, l'enseignante <strong>Dr. Claire Dubois</strong> et la promotion <strong>M2-CYBER-A</strong>.
              </p>
              <button
                onClick={() => {
                  seedBatchDemoData();
                  showNotification('Module complet généré avec succès !');
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs"
              >
                Exécuter la génération automatique
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                <RotateCcw className="w-4 h-4 text-slate-600" />
                Réinitialisation aux données d'origine
              </div>
              <p className="text-xs text-slate-600">
                Efface les modifications du cache local et restaure le jeu de données initial de démonstration de l'EBM Institute (Version 3.2).
              </p>
              <button
                onClick={() => {
                  if (confirm('Voulez-vous réinitialiser toutes les données aux valeurs par défaut ?')) {
                    resetToDefaultData();
                    showNotification('Données réinitialisées avec succès.');
                  }
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition-colors shadow-xs"
              >
                Réinitialiser les données
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: ÉDITION RAPIDE DES ÉQUIPEMENTS D'UNE SALLE EXISTANTE --- */}
      {editingRoomEquip && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-600 rounded-xl text-white">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm leading-tight">
                    Équipements • {editingRoomEquip.name}
                  </h4>
                  <p className="text-[11px] text-blue-200">
                    Code : {editingRoomEquip.code} • Capacité : {editingRoomEquip.capacity} pl.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingRoomEquip(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto text-xs">
              <div>
                <label className="font-bold uppercase text-slate-700 block mb-1.5">
                  Équipements configurés ({editRoomEquipList.length}) :
                </label>
                <div className="flex flex-wrap gap-1.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl min-h-[50px]">
                  {editRoomEquipList.length === 0 ? (
                    <span className="text-slate-400 italic">Aucun équipement affecté.</span>
                  ) : (
                    editRoomEquipList.map((eq, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 bg-white border border-blue-200 text-blue-900 font-semibold px-2.5 py-1 rounded-lg shadow-2xs"
                      >
                        <span>{eq}</span>
                        <button
                          type="button"
                          onClick={() => setEditRoomEquipList((prev) => prev.filter((item) => item !== eq))}
                          className="text-slate-400 hover:text-red-600 rounded-full cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* Free text custom adder */}
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1.5">
                <label className="font-bold text-blue-900 block">
                  Ajouter un équipement libre sur-mesure :
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editCustomInput}
                    onChange={(e) => setEditCustomInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const val = editCustomInput.trim();
                        if (val && !editRoomEquipList.includes(val)) {
                          setEditRoomEquipList((prev) => [...prev, val]);
                          setEditCustomInput('');
                        }
                      }
                    }}
                    placeholder="Ex: Écran interactif 85 pouces, Kit Arduino..."
                    className="flex-1 px-2.5 py-1.5 bg-white border border-blue-300 rounded-lg text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const val = editCustomInput.trim();
                      if (val && !editRoomEquipList.includes(val)) {
                        setEditRoomEquipList((prev) => [...prev, val]);
                        setEditCustomInput('');
                      }
                    }}
                    disabled={!editCustomInput.trim()}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Ajouter
                  </button>
                </div>
              </div>

              {/* Catalog toggles */}
              <div>
                <label className="font-bold uppercase text-slate-700 block mb-1.5">
                  Suggestions prédéfinies :
                </label>
                <div className="space-y-1 max-h-36 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-xl">
                  {availableEquipList.map((eq) => {
                    const isChecked = editRoomEquipList.includes(eq);
                    return (
                      <label key={eq} className="flex items-center gap-2 cursor-pointer hover:text-blue-700 py-0.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditRoomEquipList((prev) => [...prev, eq]);
                            } else {
                              setEditRoomEquipList((prev) => prev.filter((item) => item !== eq));
                            }
                          }}
                          className="rounded text-blue-600"
                        />
                        <span>{eq}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingRoomEquip(null)}
                className="px-3.5 py-1.5 border border-slate-300 hover:bg-slate-100 rounded-xl text-slate-700 font-semibold cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSaveExistingRoomEquip}
                className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                Enregistrer ({editRoomEquipList.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
