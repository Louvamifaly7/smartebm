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
    domaines,
    addDomaine,
    updateDomaine,
    deleteDomaine,
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

  // --- STATES & HANDLERS FOR FULL ENTITY MODIFICATION ---
  // 1. Course editing
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editCourseCode, setEditCourseCode] = useState('');
  const [editCourseTitle, setEditCourseTitle] = useState('');
  const [editCourseTotalHours, setEditCourseTotalHours] = useState(30);
  const [editCourseDuration, setEditCourseDuration] = useState(2);
  const [editCourseFiliere, setEditCourseFiliere] = useState('');
  const [editCourseLevel, setEditCourseLevel] = useState('L1');
  const [editCourseTeacherId, setEditCourseTeacherId] = useState('');
  const [editCourseGroupIds, setEditCourseGroupIds] = useState<string[]>([]);
  const [editCourseColor, setEditCourseColor] = useState('#3b82f6');
  const [editCourseDesc, setEditCourseDesc] = useState('');

  const openEditCourse = (c: Course) => {
    setEditingCourse(c);
    setEditCourseCode(c.code);
    setEditCourseTitle(c.title);
    setEditCourseTotalHours(c.totalHours || 30);
    setEditCourseDuration(c.defaultSessionDuration || 2);
    setEditCourseFiliere(c.filiereId || filieres[0]?.id || '');
    setEditCourseLevel(c.level || 'L1');
    setEditCourseTeacherId(c.teacherIds?.[0] || teachers[0]?.id || '');
    setEditCourseGroupIds(c.groupIds || []);
    setEditCourseColor(c.color || '#3b82f6');
    setEditCourseDesc(c.description || '');
  };

  const handleSaveEditCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourse) return;
    if (!editCourseCode.trim() || !editCourseTitle.trim()) {
      showNotification('Le code et le titre du cours sont obligatoires.', true);
      return;
    }
    updateCourse(editingCourse.id, {
      code: editCourseCode.trim().toUpperCase(),
      title: editCourseTitle.trim(),
      totalHours: Number(editCourseTotalHours) || 30,
      defaultSessionDuration: Number(editCourseDuration) || 2,
      filiereId: editCourseFiliere || filieres[0]?.id || 'fil-1',
      level: editCourseLevel,
      teacherIds: editCourseTeacherId ? [editCourseTeacherId] : [],
      groupIds: editCourseGroupIds,
      color: editCourseColor,
      description: editCourseDesc.trim() || undefined,
    });
    showNotification(`Module "${editCourseTitle}" mis à jour avec succès !`);
    setEditingCourse(null);
  };

  // 2. Full Room editing
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [editRoomCode, setEditRoomCode] = useState('');
  const [editRoomName, setEditRoomName] = useState('');
  const [editRoomBuilding, setEditRoomBuilding] = useState('');
  const [editRoomFloor, setEditRoomFloor] = useState('');
  const [editRoomCapacity, setEditRoomCapacity] = useState(35);
  const [editRoomStatus, setEditRoomStatus] = useState<Room['status']>('available');
  const [editRoomColor, setEditRoomColor] = useState('#2563eb');
  const [editRoomEquips, setEditRoomEquips] = useState<string[]>([]);
  const [editRoomCustomEquipInput, setEditRoomCustomEquipInput] = useState('');

  const openEditRoom = (r: Room) => {
    setEditingRoom(r);
    setEditRoomCode(r.code);
    setEditRoomName(r.name);
    setEditRoomBuilding(r.building || 'Bâtiment Principal EBM');
    setEditRoomFloor(r.floor || '1er Étage');
    setEditRoomCapacity(r.capacity || 30);
    setEditRoomStatus(r.status || 'available');
    setEditRoomColor(r.colorCode || '#2563eb');
    setEditRoomEquips([...(r.equipment || [])]);
    setEditRoomCustomEquipInput('');
  };

  const handleSaveEditRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoom) return;
    if (!editRoomCode.trim() || !editRoomName.trim()) {
      showNotification('Le code et le nom de la salle sont obligatoires.', true);
      return;
    }
    updateRoom(editingRoom.id, {
      code: editRoomCode.trim().toUpperCase(),
      name: editRoomName.trim(),
      building: editRoomBuilding.trim(),
      floor: editRoomFloor.trim(),
      capacity: Number(editRoomCapacity) || 30,
      status: editRoomStatus,
      colorCode: editRoomColor,
      equipment: editRoomEquips,
    });
    showNotification(`Salle "${editRoomName}" mise à jour avec succès !`);
    setEditingRoom(null);
  };

  // 3. Teacher editing
  const [editingTeacher, setEditingTeacher] = useState<User | null>(null);
  const [editTeacherName, setEditTeacherName] = useState('');
  const [editTeacherEmail, setEditTeacherEmail] = useState('');
  const [editTeacherPhone, setEditTeacherPhone] = useState('');
  const [editTeacherSubjects, setEditTeacherSubjects] = useState('');
  const [editTeacherMaxHours, setEditTeacherMaxHours] = useState(18);
  const [editTeacherIsActive, setEditTeacherIsActive] = useState(true);

  const openEditTeacher = (t: User) => {
    setEditingTeacher(t);
    setEditTeacherName(t.name);
    setEditTeacherEmail(t.email);
    setEditTeacherPhone(t.phone || '');
    setEditTeacherSubjects(t.subjects ? t.subjects.join(', ') : '');
    setEditTeacherMaxHours(t.weeklyMaxHours || 18);
    setEditTeacherIsActive(t.isActive ?? true);
  };

  const handleSaveEditTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacher) return;
    if (!editTeacherName.trim() || !editTeacherEmail.trim()) {
      showNotification('Le nom et l\'email de l\'enseignant sont obligatoires.', true);
      return;
    }
    const subjectsArray = editTeacherSubjects.split(',').map((s) => s.trim()).filter(Boolean);
    updateTeacher(editingTeacher.id, {
      name: editTeacherName.trim(),
      email: editTeacherEmail.trim(),
      phone: editTeacherPhone.trim() || undefined,
      subjects: subjectsArray,
      weeklyMaxHours: Number(editTeacherMaxHours) || 18,
      isActive: editTeacherIsActive,
    });
    showNotification(`Enseignant "${editTeacherName}" mis à jour avec succès !`);
    setEditingTeacher(null);
  };

  // 4. Group editing
  const [editingGroup, setEditingGroup] = useState<StudentGroup | null>(null);
  const [editGroupCode, setEditGroupCode] = useState('');
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupFiliere, setEditGroupFiliere] = useState('');
  const [editGroupLevel, setEditGroupLevel] = useState('L1');
  const [editGroupCount, setEditGroupCount] = useState(32);
  const [editGroupHasSubgroups, setEditGroupHasSubgroups] = useState(true);

  const openEditGroup = (g: StudentGroup) => {
    setEditingGroup(g);
    setEditGroupCode(g.code);
    setEditGroupName(g.name);
    setEditGroupFiliere(g.filiereId || filieres[0]?.id || '');
    setEditGroupLevel(g.level || 'L1');
    setEditGroupCount(g.studentCount || 30);
    setEditGroupHasSubgroups(Boolean(g.subGroups && g.subGroups.length > 0));
  };

  const handleSaveEditGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroup) return;
    if (!editGroupCode.trim() || !editGroupName.trim()) {
      showNotification('Le code et le nom du groupe sont obligatoires.', true);
      return;
    }
    const cleanCode = editGroupCode.trim().toUpperCase();
    let subGroups = editingGroup.subGroups || [];
    if (editGroupHasSubgroups && subGroups.length === 0) {
      subGroups = [
        { id: `sub-${cleanCode.toLowerCase()}-1`, code: `${cleanCode}-TP1`, name: 'Groupe TP 1', studentCount: Math.ceil(Number(editGroupCount) / 2) },
        { id: `sub-${cleanCode.toLowerCase()}-2`, code: `${cleanCode}-TP2`, name: 'Groupe TP 2', studentCount: Math.floor(Number(editGroupCount) / 2) },
      ];
    } else if (!editGroupHasSubgroups) {
      subGroups = [];
    }
    updateGroup(editingGroup.id, {
      code: cleanCode,
      name: editGroupName.trim(),
      filiereId: editGroupFiliere || filieres[0]?.id || 'fil-1',
      level: editGroupLevel,
      studentCount: Number(editGroupCount) || 30,
      subGroups,
    });
    showNotification(`Groupe "${cleanCode}" mis à jour avec succès !`);
    setEditingGroup(null);
  };

  // 5. Filière editing
  const [editingFiliere, setEditingFiliere] = useState<Filiere | null>(null);
  const [editFiliereCode, setEditFiliereCode] = useState('');
  const [editFiliereName, setEditFiliereName] = useState('');
  const [editFiliereDomaine, setEditFiliereDomaine] = useState('');
  const [editFiliereDept, setEditFiliereDept] = useState('');

  const openEditFiliere = (f: Filiere) => {
    setEditingFiliere(f);
    setEditFiliereCode(f.code);
    setEditFiliereName(f.name);
    setEditFiliereDomaine(f.domaine || domaines[0] || 'Sciences et Technologies');
    setEditFiliereDept(f.department || 'Pôle Technologies Numériques');
  };

  const handleSaveEditFiliere = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFiliere) return;
    if (!editFiliereCode.trim() || !editFiliereName.trim()) {
      showNotification('Le code et le nom de la filière sont obligatoires.', true);
      return;
    }
    updateFiliere(editingFiliere.id, {
      code: editFiliereCode.trim().toUpperCase(),
      name: editFiliereName.trim(),
      domaine: editFiliereDomaine || domaines[0] || 'Sciences et Technologies',
      department: editFiliereDept.trim(),
    });
    showNotification(`Mention "${editFiliereCode}" mise à jour avec succès !`);
    setEditingFiliere(null);
  };

  // 6. Domaine editing
  const [editingDomaine, setEditingDomaine] = useState<string | null>(null);
  const [editDomaineName, setEditDomaineName] = useState('');

  const openEditDomaine = (dom: string) => {
    setEditingDomaine(dom);
    setEditDomaineName(dom);
  };

  const handleSaveEditDomaine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDomaine) return;
    const clean = editDomaineName.trim();
    if (!clean) {
      showNotification('Le nom du domaine ne peut pas être vide.', true);
      return;
    }
    const res = updateDomaine(editingDomaine, clean);
    if (res.success) {
      showNotification(`Domaine renommé en "${clean}" avec succès !`);
      setEditingDomaine(null);
    } else {
      showNotification(res.error || 'Erreur lors de la modification du domaine.', true);
    }
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
  const [courseGroupIds, setCourseGroupIds] = useState<string[]>(() => {
    const g1a = groups.find((g) => g.code.trim().toUpperCase() === 'G1A2627');
    if (g1a) return [g1a.id];
    const initialFil = filieres[0]?.id || '';
    const matching = groups.filter((g) => g.filiereId === initialFil);
    return matching.length > 0 ? [matching[0].id] : groups[0] ? [groups[0].id] : [];
  });
  const [courseColor, setCourseColor] = useState('#3b82f6');
  const [courseDesc, setCourseDesc] = useState('');

  const handleFiliereChangeForCourse = (newFiliereId: string, level = courseLevel) => {
    setCourseFiliere(newFiliereId);
    const g1a = groups.find((g) => g.code.trim().toUpperCase() === 'G1A2627');
    if (g1a && courseGroupIds.includes(g1a.id)) {
      return;
    }
    const matchingLevel = groups.filter((g) => g.filiereId === newFiliereId && g.level === level);
    const matchingAny = groups.filter((g) => g.filiereId === newFiliereId);
    if (g1a) {
      setCourseGroupIds([g1a.id]);
    } else if (matchingLevel.length > 0) {
      setCourseGroupIds([matchingLevel[0].id]);
    } else if (matchingAny.length > 0) {
      setCourseGroupIds([matchingAny[0].id]);
    } else if (groups[0]) {
      setCourseGroupIds([groups[0].id]);
    }
  };

  const handleCreateCourse = (e: React.FormEvent) => {
    e.preventDefault();
    const targetFilId = courseFiliere || filieres[0]?.id || 'fil-1';
    const validSelectedGroups = courseGroupIds.filter((gid) =>
      groups.some((g) => g.id === gid)
    );
    const res = addCourse({
      code: courseCode.trim().toUpperCase(),
      title: courseTitle.trim(),
      filiereId: targetFilId,
      level: courseLevel,
      academicYear: '2026-2027',
      groupIds: validSelectedGroups,
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

  // --- STATE FOR FILIERE & DOMAINE CREATION ---
  const [filiereCode, setFiliereCode] = useState('');
  const [filiereName, setFiliereName] = useState('');
  const [filiereDomaine, setFiliereDomaine] = useState(domaines[0] || 'Sciences et Technologies');
  const [filiereDept, setFiliereDept] = useState('Pôle Technologies Numériques');
  const [newDomaineName, setNewDomaineName] = useState('');

  const handleCreateFiliere = (e: React.FormEvent) => {
    e.preventDefault();
    const res = addFiliere({
      code: filiereCode.trim().toUpperCase(),
      name: filiereName.trim(),
      domaine: filiereDomaine,
      department: filiereDept.trim(),
    });
    if (res.success) {
      showNotification(`Mention / Filière "${filiereCode.toUpperCase()}" créée avec succès !`);
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
            Domaines & Mentions ({filieres.length})
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
                    onChange={(e) => handleFiliereChangeForCourse(e.target.value, courseLevel)}
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
                    onChange={(e) => {
                      const nextLvl = e.target.value;
                      setCourseLevel(nextLvl);
                      handleFiliereChangeForCourse(courseFiliere, nextLvl);
                    }}
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
                  Groupe(s) d'étudiants concerné(s)
                </label>
                <select
                  multiple
                  value={courseGroupIds}
                  onChange={(e) => {
                    const sel = Array.from(e.target.selectedOptions, (opt) => opt.value);
                    setCourseGroupIds(sel);
                  }}
                  className="w-full p-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs h-22"
                >
                  {[...groups]
                    .sort((a, b) => {
                      const aIsG1A = a.code.trim().toUpperCase() === 'G1A2627' ? 1 : 0;
                      const bIsG1A = b.code.trim().toUpperCase() === 'G1A2627' ? 1 : 0;
                      if (aIsG1A !== bIsG1A) return bIsG1A - aIsG1A;
                      return a.code.localeCompare(b.code);
                    })
                    .map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.code} — {g.name} ({g.studentCount} ét.)
                      </option>
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
                const courseFil = filieres.find((f) => f.id === c.filiereId);
                const assignedGroupNames = c.groupIds.map((gId) => groups.find((g) => g.id === gId)?.code).filter(Boolean);

                return (
                  <div
                    key={c.id}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-blue-900 bg-blue-100 px-2 py-0.5 rounded text-[10px]">
                          {c.code}
                        </span>
                        {courseFil && (
                          <span className="font-bold text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded text-[10px]">
                            {courseFil.code} • {c.level || 'L1'}
                          </span>
                        )}
                        <h4 className="font-bold text-slate-900 text-sm truncate">{c.title}</h4>
                        <span className="font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded text-[10px]">
                          {c.totalHours} h totales
                        </span>
                      </div>
                      <p className="text-slate-600 mt-1">
                        Filière : <strong>{courseFil?.name || 'Non spécifiée'}</strong> • Professeur : <strong>{assignedTeacher?.name || 'Non assigné'}</strong> • Groupes : {assignedGroupNames.join(', ') || 'Aucun'}
                      </p>
                      {c.description && (
                        <p className="text-slate-500 italic mt-0.5 text-[11px] line-clamp-1">{c.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditCourse(c)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                        title="Modifier ce cours / module"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const res = deleteCourse(c.id);
                          if (!res.success) {
                            showNotification(res.error || 'Suppression refusée.', true);
                          } else {
                            showNotification(`Cours "${c.title}" supprimé.`);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                        title="Supprimer ce cours"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditRoom(r)}
                        className="text-slate-500 hover:text-blue-600 p-1 cursor-pointer rounded hover:bg-blue-50 transition-colors"
                        title="Modifier cette salle"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const res = deleteRoom(r.id);
                          if (!res.success) {
                            showNotification(res.error || 'Suppression refusée.', true);
                          } else {
                            showNotification(`Salle "${r.name}" supprimée.`);
                          }
                        }}
                        className="text-slate-400 hover:text-red-600 p-1 cursor-pointer rounded hover:bg-red-50 transition-colors"
                        title="Supprimer la salle"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
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
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditTeacher(t)}
                      className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                      title="Modifier cet enseignant"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        deleteTeacher(t.id);
                        showNotification(`Enseignant "${t.name}" supprimé.`);
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                      title="Supprimer cet enseignant"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
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
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditGroup(g)}
                      className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                      title="Modifier ce groupe"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const res = deleteGroup(g.id);
                        if (!res.success) {
                          showNotification(res.error || 'Suppression refusée.', true);
                        } else {
                          showNotification(`Groupe "${g.code}" supprimé.`);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                      title="Supprimer ce groupe"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 5: DOMAINES & MENTIONS (FILIERES) CREATION --- */}
      {activeTab === 'FILIERES' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="space-y-4">
            {/* Formulaire Domaine LMD */}
            <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                <PlusCircle className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  1. Nouveau Domaine LMD
                </h3>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const res = addDomaine(newDomaineName);
                  if (res.success) {
                    showNotification(`Domaine LMD "${newDomaineName}" ajouté !`);
                    setFiliereDomaine(newDomaineName.trim());
                    setNewDomaineName('');
                  } else {
                    showNotification(res.error || 'Erreur domaine', true);
                  }
                }}
                className="space-y-2.5 text-xs"
              >
                <div>
                  <label className="block font-bold uppercase text-slate-700 mb-1">
                    Intitulé du Domaine *
                  </label>
                  <input
                    type="text"
                    value={newDomaineName}
                    onChange={(e) => setNewDomaineName(e.target.value)}
                    placeholder="Ex: Sciences Agronomiques & Environnement"
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter ce Domaine LMD
                </button>
              </form>
            </div>

            {/* Formulaire Mention / Filière */}
            <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                <PlusCircle className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  2. Nouvelle Mention (Filière)
                </h3>
              </div>
              <form onSubmit={handleCreateFiliere} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold uppercase text-slate-700 mb-1">
                    Domaine LMD de rattachement *
                  </label>
                  <select
                    value={filiereDomaine}
                    onChange={(e) => setFiliereDomaine(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-xs"
                  >
                    {domaines.map((dom) => (
                      <option key={dom} value={dom}>
                        {dom}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold uppercase text-slate-700 mb-1">
                    Code Mention / Filière * (ex: CYBER, IA, FIN)
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
                    Nom Complet de la Mention *
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
                  className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Créer la Mention / Filière
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-xs border border-slate-200 space-y-5">
            <div>
              <h3 className="font-bold text-sm text-slate-900 pb-2 border-b border-slate-100 mb-3">
                Domaines LMD configurés ({domaines.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {domaines.map((dom) => (
                  <span
                    key={dom}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-bold"
                  >
                    <span>{dom}</span>
                    <button
                      type="button"
                      onClick={() => openEditDomaine(dom)}
                      className="text-emerald-700 hover:text-blue-600 cursor-pointer p-0.5 rounded transition-colors"
                      title="Renommer ce domaine"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    {domaines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => deleteDomaine(dom)}
                        className="text-emerald-600 hover:text-rose-600 cursor-pointer"
                        title="Supprimer ce domaine"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-bold text-sm text-slate-900 pb-2 border-b border-slate-100 mb-3">
                Mentions (Filières) et Départements ({filieres.length})
              </h3>
              <div className="space-y-2.5 overflow-y-auto max-h-[420px] pr-1">
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
                      <p className="text-slate-500 text-[11px] mt-0.5">
                        Domaine : <strong>{f.domaine || 'Sciences et Technologies'}</strong> • {f.department}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditFiliere(f)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                        title="Modifier cette mention / filière"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          deleteFiliere(f.id);
                          showNotification(`Mention "${f.name}" supprimée.`);
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 cursor-pointer transition-colors"
                        title="Supprimer cette mention / filière"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
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

      {/* --- MODAL 1: MODIFIER UN COURS / MODULE --- */}
      {editingCourse && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-600 rounded-xl text-white">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm leading-tight">
                    Modifier le cours • {editingCourse.code}
                  </h4>
                  <p className="text-[11px] text-blue-200">{editingCourse.title}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingCourse(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditCourse} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 space-y-3.5 overflow-y-auto text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Code du module *</label>
                    <input
                      type="text"
                      value={editCourseCode}
                      onChange={(e) => setEditCourseCode(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-mono uppercase font-bold text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Intitulé du cours *</label>
                    <input
                      type="text"
                      value={editCourseTitle}
                      onChange={(e) => setEditCourseTitle(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Filière / Mention *</label>
                    <select
                      value={editCourseFiliere}
                      onChange={(e) => setEditCourseFiliere(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                    >
                      {filieres.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.code} - {f.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Niveau académique *</label>
                    <select
                      value={editCourseLevel}
                      onChange={(e) => setEditCourseLevel(e.target.value)}
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

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Volume horaire total (h)</label>
                    <input
                      type="number"
                      min={1}
                      max={300}
                      value={editCourseTotalHours}
                      onChange={(e) => setEditCourseTotalHours(Number(e.target.value))}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Durée standard (h)</label>
                    <input
                      type="number"
                      step={0.5}
                      min={0.5}
                      max={8}
                      value={editCourseDuration}
                      onChange={(e) => setEditCourseDuration(Number(e.target.value))}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Couleur calendrier</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={editCourseColor}
                        onChange={(e) => setEditCourseColor(e.target.value)}
                        className="w-9 h-9 p-0.5 border border-slate-300 rounded-lg cursor-pointer"
                      />
                      <span className="font-mono text-[11px] text-slate-600">{editCourseColor}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Enseignant responsable</label>
                  <select
                    value={editCourseTeacherId}
                    onChange={(e) => setEditCourseTeacherId(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  >
                    <option value="">-- Aucun enseignant assigné --</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Groupes d'étudiants concernés ({editCourseGroupIds.length} sélectionné(s))
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl max-h-36 overflow-y-auto">
                    {groups.map((g) => {
                      const isChecked = editCourseGroupIds.includes(g.id);
                      return (
                        <label
                          key={g.id}
                          className="flex items-center gap-2 p-1 rounded-lg hover:bg-white cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditCourseGroupIds((prev) => [...prev, g.id]);
                              } else {
                                setEditCourseGroupIds((prev) => prev.filter((id) => id !== g.id));
                              }
                            }}
                            className="rounded text-blue-600"
                          />
                          <span className="truncate">
                            <strong>{g.code}</strong> - {g.name}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Description / Objectifs</label>
                  <textarea
                    rows={2}
                    value={editCourseDesc}
                    onChange={(e) => setEditCourseDesc(e.target.value)}
                    placeholder="Programme, pré-requis, objectifs pédagogiques..."
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingCourse(null)}
                  className="px-3.5 py-1.5 border border-slate-300 hover:bg-slate-100 rounded-xl text-slate-700 font-semibold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  Enregistrer les modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: MODIFIER UNE SALLE COMPLÈTE --- */}
      {editingRoom && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-600 rounded-xl text-white">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm leading-tight">
                    Modifier la salle • {editingRoom.code}
                  </h4>
                  <p className="text-[11px] text-blue-200">{editingRoom.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingRoom(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditRoom} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 space-y-3.5 overflow-y-auto text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Code de la salle *</label>
                    <input
                      type="text"
                      value={editRoomCode}
                      onChange={(e) => setEditRoomCode(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-mono uppercase font-bold text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Nom usuel complet *</label>
                    <input
                      type="text"
                      value={editRoomName}
                      onChange={(e) => setEditRoomName(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Bâtiment *</label>
                    <input
                      type="text"
                      value={editRoomBuilding}
                      onChange={(e) => setEditRoomBuilding(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Étage *</label>
                    <input
                      type="text"
                      value={editRoomFloor}
                      onChange={(e) => setEditRoomFloor(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Capacité (places) *</label>
                    <input
                      type="number"
                      min={1}
                      max={500}
                      value={editRoomCapacity}
                      onChange={(e) => setEditRoomCapacity(Number(e.target.value))}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Statut opérationnel</label>
                    <select
                      value={editRoomStatus}
                      onChange={(e) => setEditRoomStatus(e.target.value as Room['status'])}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                    >
                      <option value="available">Disponible</option>
                      <option value="maintenance">En maintenance</option>
                      <option value="occupied">Occupée</option>
                      <option value="unavailable">Indisponible</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Couleur</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={editRoomColor}
                        onChange={(e) => setEditRoomColor(e.target.value)}
                        className="w-9 h-9 p-0.5 border border-slate-300 rounded-lg cursor-pointer"
                      />
                      <span className="font-mono text-[11px] text-slate-600">{editRoomColor}</span>
                    </div>
                  </div>
                </div>

                {/* Équipements */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Équipements ({editRoomEquips.length})
                  </label>
                  <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl min-h-[44px] mb-2">
                    {editRoomEquips.length === 0 ? (
                      <span className="text-slate-400 italic">Aucun équipement affecté.</span>
                    ) : (
                      editRoomEquips.map((eq, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 bg-white border border-blue-200 text-blue-900 font-semibold px-2 py-0.5 rounded-lg text-[11px]"
                        >
                          <span>{eq}</span>
                          <button
                            type="button"
                            onClick={() => setEditRoomEquips((prev) => prev.filter((item) => item !== eq))}
                            className="text-slate-400 hover:text-red-600 rounded-full cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editRoomCustomEquipInput}
                      onChange={(e) => setEditRoomCustomEquipInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = editRoomCustomEquipInput.trim();
                          if (val && !editRoomEquips.includes(val)) {
                            setEditRoomEquips((prev) => [...prev, val]);
                            setEditRoomCustomEquipInput('');
                          }
                        }
                      }}
                      placeholder="Ajouter un équipement (ex: Caméra 4K, 30 PC GPU...)"
                      className="flex-1 p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = editRoomCustomEquipInput.trim();
                        if (val && !editRoomEquips.includes(val)) {
                          setEditRoomEquips((prev) => [...prev, val]);
                          setEditRoomCustomEquipInput('');
                        }
                      }}
                      className="px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-900 rounded-xl font-bold cursor-pointer"
                    >
                      Ajouter
                    </button>
                  </div>
                </div>
              </div>

              <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingRoom(null)}
                  className="px-3.5 py-1.5 border border-slate-300 hover:bg-slate-100 rounded-xl text-slate-700 font-semibold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  Enregistrer les modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 3: MODIFIER UN ENSEIGNANT --- */}
      {editingTeacher && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-600 rounded-xl text-white">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm leading-tight">
                    Modifier l'enseignant • {editingTeacher.name}
                  </h4>
                  <p className="text-[11px] text-blue-200">{editingTeacher.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingTeacher(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditTeacher} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 space-y-3.5 overflow-y-auto text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nom complet *</label>
                  <input
                    type="text"
                    value={editTeacherName}
                    onChange={(e) => setEditTeacherName(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Email institutionnel *</label>
                    <input
                      type="email"
                      value={editTeacherEmail}
                      onChange={(e) => setEditTeacherEmail(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Téléphone mobile</label>
                    <input
                      type="text"
                      value={editTeacherPhone}
                      onChange={(e) => setEditTeacherPhone(e.target.value)}
                      placeholder="+261 34 00 000 00"
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Matières et spécialités enseignées (séparées par virgules)
                  </label>
                  <input
                    type="text"
                    value={editTeacherSubjects}
                    onChange={(e) => setEditTeacherSubjects(e.target.value)}
                    placeholder="Génie Logiciel, Algorithmique, BDD..."
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Quota max heures hebdo</label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={editTeacherMaxHours}
                      onChange={(e) => setEditTeacherMaxHours(Number(e.target.value))}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Statut du compte</label>
                    <select
                      value={editTeacherIsActive ? 'active' : 'inactive'}
                      onChange={(e) => setEditTeacherIsActive(e.target.value === 'active')}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                    >
                      <option value="active">Actif</option>
                      <option value="inactive">Suspendu / Inactif</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingTeacher(null)}
                  className="px-3.5 py-1.5 border border-slate-300 hover:bg-slate-100 rounded-xl text-slate-700 font-semibold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  Enregistrer les modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 4: MODIFIER UN GROUPE / PROMOTION --- */}
      {editingGroup && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-600 rounded-xl text-white">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm leading-tight">
                    Modifier le groupe • {editingGroup.code}
                  </h4>
                  <p className="text-[11px] text-blue-200">{editingGroup.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingGroup(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditGroup} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 space-y-3.5 overflow-y-auto text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Code du groupe *</label>
                    <input
                      type="text"
                      value={editGroupCode}
                      onChange={(e) => setEditGroupCode(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-mono uppercase font-bold text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Nom complet *</label>
                    <input
                      type="text"
                      value={editGroupName}
                      onChange={(e) => setEditGroupName(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Filière associée *</label>
                    <select
                      value={editGroupFiliere}
                      onChange={(e) => setEditGroupFiliere(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                    >
                      {filieres.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.code} - {f.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Niveau d'études *</label>
                    <select
                      value={editGroupLevel}
                      onChange={(e) => setEditGroupLevel(e.target.value)}
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
                  <label className="font-bold text-slate-700 block mb-1">Effectif total d'étudiants *</label>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={editGroupCount}
                    onChange={(e) => setEditGroupCount(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                    required
                  />
                </div>

                <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-purple-900">
                    <input
                      type="checkbox"
                      checked={editGroupHasSubgroups}
                      onChange={(e) => setEditGroupHasSubgroups(e.target.checked)}
                      className="rounded text-purple-600"
                    />
                    <span>Activer les sous-groupes TP (TP1 et TP2)</span>
                  </label>
                  <p className="text-[11px] text-purple-700 mt-1 pl-6">
                    Divise automatiquement la promotion en 2 sous-groupes équilibrés pour les travaux pratiques en laboratoire.
                  </p>
                </div>
              </div>

              <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingGroup(null)}
                  className="px-3.5 py-1.5 border border-slate-300 hover:bg-slate-100 rounded-xl text-slate-700 font-semibold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  Enregistrer les modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 5: MODIFIER UNE FILIÈRE / MENTION --- */}
      {editingFiliere && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-600 rounded-xl text-white">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm leading-tight">
                    Modifier la filière • {editingFiliere.code}
                  </h4>
                  <p className="text-[11px] text-blue-200">{editingFiliere.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingFiliere(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditFiliere} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 space-y-3.5 overflow-y-auto text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Code de la mention *</label>
                    <input
                      type="text"
                      value={editFiliereCode}
                      onChange={(e) => setEditFiliereCode(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-mono uppercase font-bold text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Intitulé complet *</label>
                    <input
                      type="text"
                      value={editFiliereName}
                      onChange={(e) => setEditFiliereName(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Domaine LMD *</label>
                  <select
                    value={editFiliereDomaine}
                    onChange={(e) => setEditFiliereDomaine(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  >
                    {domaines.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Département / Pôle académique *</label>
                  <input
                    type="text"
                    value={editFiliereDept}
                    onChange={(e) => setEditFiliereDept(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                    required
                  />
                </div>
              </div>

              <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingFiliere(null)}
                  className="px-3.5 py-1.5 border border-slate-300 hover:bg-slate-100 rounded-xl text-slate-700 font-semibold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  Enregistrer les modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 6: MODIFIER / RENOMMER UN DOMAINE --- */}
      {editingDomaine && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-600 rounded-xl text-white">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm leading-tight">Renommer le domaine</h4>
                  <p className="text-[11px] text-emerald-200">{editingDomaine}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingDomaine(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditDomaine} className="p-5 space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nouveau libellé du domaine *</label>
                <input
                  type="text"
                  value={editDomaineName}
                  onChange={(e) => setEditDomaineName(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                  required
                  autoFocus
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Le changement sera immédiatement répercuté sur toutes les filières rattachées.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingDomaine(null)}
                  className="px-3.5 py-1.5 border border-slate-300 hover:bg-slate-100 rounded-xl text-slate-700 font-semibold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  Renommer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
