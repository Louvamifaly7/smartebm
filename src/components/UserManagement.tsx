import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Users,
  UserPlus,
  Shield,
  ShieldAlert,
  Search,
  Filter,
  KeyRound,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  X,
  Phone,
  Mail,
  GraduationCap,
  Briefcase,
  Lock,
  Power,
  RotateCcw,
} from 'lucide-react';
import { User, UserRole } from '../types';

export const UserManagement: React.FC = () => {
  const {
    users,
    addUser,
    updateUser,
    deleteUser,
    toggleUserStatus,
    resetUserPassword,
    groups,
    currentUser,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal State for Create / Edit User
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('STUDENT');
  const [identifier, setIdentifier] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [groupId, setGroupId] = useState(groups[0]?.id || '');
  const [birthDate, setBirthDate] = useState('2005-01-01');
  const [subjects, setSubjects] = useState('');
  const [weeklyMaxHours, setWeeklyMaxHours] = useState(18);

  const [formMsg, setFormMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const filteredUsers = users.filter((u) => {
    if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'ACTIVE' && !u.isActive) return false;
      if (statusFilter === 'INACTIVE' && u.isActive) return false;
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        (u.matricule && u.matricule.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleOpenCreate = () => {
    setEditingUserId(null);
    setName('');
    setRole('STUDENT');
    setIdentifier('');
    setEmail('');
    setPhone('');
    setGroupId(groups[0]?.id || '');
    setBirthDate('2005-01-01');
    setSubjects('');
    setWeeklyMaxHours(18);
    setFormMsg(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUserId(user.id);
    setName(user.name);
    setRole(user.role);
    setIdentifier(user.matricule || user.username);
    setEmail(user.email);
    setPhone(user.phone || '');
    setGroupId(user.groupId || groups[0]?.id || '');
    setBirthDate(user.birthDate || '2005-01-01');
    setSubjects(user.subjects?.join(', ') || '');
    setWeeklyMaxHours(user.weeklyMaxHours || 18);
    setFormMsg(null);
    setIsModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormMsg(null);

    if (editingUserId) {
      // Edit User
      updateUser(editingUserId, {
        name: name.trim(),
        role,
        email: email.trim(),
        phone: phone.trim() || undefined,
        groupId: role === 'STUDENT' ? groupId : undefined,
        birthDate: role === 'STUDENT' ? birthDate : undefined,
        subjects: role === 'TEACHER' ? subjects.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
        weeklyMaxHours: role === 'TEACHER' ? Number(weeklyMaxHours) : undefined,
      });
      setFormMsg({ type: 'success', text: 'Utilisateur mis à jour avec succès !' });
      setTimeout(() => setIsModalOpen(false), 1200);
    } else {
      // Create User
      const res = addUser({
        name: name.trim(),
        role,
        matricule: role === 'STUDENT' ? identifier.trim().toUpperCase() : undefined,
        username: role === 'STUDENT' ? identifier.trim().toUpperCase() : identifier.trim().toLowerCase(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        groupId: role === 'STUDENT' ? groupId : undefined,
        birthDate: role === 'STUDENT' ? birthDate : undefined,
        subjects: role === 'TEACHER' ? subjects.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
        weeklyMaxHours: role === 'TEACHER' ? Number(weeklyMaxHours) : undefined,
        isActive: true,
        mustChangePassword: true, // RG-03
      });

      if (res.success) {
        setFormMsg({ type: 'success', text: `Compte "${name}" créé avec succès !` });
        setTimeout(() => setIsModalOpen(false), 1200);
      } else {
        setFormMsg({ type: 'error', text: res.error || 'Erreur lors de la création.' });
      }
    }
  };

  const getRoleBadge = (uRole: UserRole) => {
    switch (uRole) {
      case 'ADMIN':
        return <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 font-bold rounded-md text-[10px] uppercase">Administrateur</span>;
      case 'SCHEDULER':
        return <span className="px-2.5 py-0.5 bg-purple-100 text-purple-800 font-bold rounded-md text-[10px] uppercase">Planificateur</span>;
      case 'ACADEMIC_HEAD':
        return <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 font-bold rounded-md text-[10px] uppercase">Resp. Pédagogique</span>;
      case 'TEACHER':
        return <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-md text-[10px] uppercase">Enseignant</span>;
      case 'STUDENT':
        return <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 font-bold rounded-md text-[10px] uppercase">Étudiant</span>;
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
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Gestion Centralisée des Utilisateurs & Droits d'Accès
                </h2>
                <p className="text-xs text-slate-500">
                  Comptes utilisateurs, habilitations et accès sécurisés (Web & Android).
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
            >
              <UserPlus className="w-4 h-4" />
              Créer un Utilisateur
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200 space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          {/* Search box */}
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              placeholder="Rechercher par nom, matricule, e-mail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-1 focus:ring-blue-600"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
            >
              <option value="ALL">Tous les rôles ({users.length})</option>
              <option value="ADMIN">Administrateurs</option>
              <option value="SCHEDULER">Planificateurs</option>
              <option value="ACADEMIC_HEAD">Responsables Pédagogiques</option>
              <option value="TEACHER">Enseignants</option>
              <option value="STUDENT">Étudiants</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
            >
              <option value="ALL">Tous les statuts</option>
              <option value="ACTIVE">Actifs uniquement</option>
              <option value="INACTIVE">Désactivés (Accès suspendu)</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
              <tr>
                <th className="p-3">Utilisateur / Nom</th>
                <th className="p-3">Rôle</th>
                <th className="p-3">Identifiant / Matricule</th>
                <th className="p-3">Contact</th>
                <th className="p-3">Mot de passe</th>
                <th className="p-3">Statut</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((user) => {
                const assignedGroup = groups.find((g) => g.id === user.groupId);

                return (
                  <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-900 font-bold flex items-center justify-center text-xs flex-shrink-0">
                          {user.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block">{user.name}</span>
                          {user.role === 'STUDENT' && (
                            <span className="text-[10px] text-slate-500 font-medium">
                              Groupe : {assignedGroup?.code || 'Non assigné'}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="p-3">
                      {getRoleBadge(user.role)}
                    </td>

                    <td className="p-3 font-mono font-bold text-blue-950">
                      {user.matricule || user.username}
                    </td>

                    <td className="p-3 text-slate-600">
                      <span className="block truncate max-w-[200px]">{user.email}</span>
                      {user.phone && <span className="text-[10px] text-slate-400">{user.phone}</span>}
                    </td>

                    <td className="p-3">
                      {user.mustChangePassword ? (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold rounded text-[10px] inline-flex items-center gap-1">
                          <KeyRound className="w-3 h-3 text-amber-600" />
                          Temporaire (Changement obligatoire)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded text-[10px]">
                          Personnalisé
                        </span>
                      )}
                    </td>

                    <td className="p-3">
                      {user.isActive ? (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded text-[10px]">
                          Actif
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-red-100 text-red-800 font-bold rounded text-[10px] inline-flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3 text-red-600" />
                          Désactivé
                        </span>
                      )}
                    </td>

                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Toggle Active / Deactivate */}
                        <button
                          onClick={() => toggleUserStatus(user.id)}
                          className={`p-1.5 rounded-lg text-[10px] font-bold transition-colors ${
                            user.isActive
                              ? 'text-red-700 hover:bg-red-50'
                              : 'text-emerald-700 hover:bg-emerald-50'
                          }`}
                          title={user.isActive ? 'Désactiver le compte' : 'Réactiver le compte'}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>

                        {/* Reset Password */}
                        <button
                          onClick={() => {
                            if (confirm(`Réinitialiser le mot de passe de ${user.name} ? Un changement sera exigé à sa prochaine connexion.`)) {
                              resetUserPassword(user.id);
                            }
                          }}
                          className="p-1.5 text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Réinitialiser le mot de passe"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit User */}
                        <button
                          onClick={() => handleOpenEdit(user)}
                          className="p-1.5 text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Modifier l'utilisateur"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete User */}
                        {user.id !== currentUser?.id && (
                          <button
                            onClick={() => {
                              if (confirm(`Supprimer définitivement le compte de ${user.name} ?`)) {
                                deleteUser(user.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                            title="Supprimer définitivement"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 my-8 animate-in fade-in zoom-in duration-150">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                  {editingUserId ? <Edit2 className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    {editingUserId ? 'Modifier l’Utilisateur' : 'Créer un Nouvel Utilisateur'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Attribution de rôle et paramètres d'accès EBM Institute
                  </p>
                </div>
              </div>
              <button
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
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {formMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                )}
                <span>{formMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold uppercase text-slate-700 mb-1">
                  Nom et Prénom *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Jean Rakoto"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-blue-600"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase text-slate-700 mb-1">
                    Rôle de l'Utilisateur *
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                  >
                    <option value="STUDENT">Étudiant</option>
                    <option value="TEACHER">Enseignant</option>
                    <option value="SCHEDULER">Responsable Planning</option>
                    <option value="ACADEMIC_HEAD">Responsable Pédagogique</option>
                    <option value="ADMIN">Administrateur Général</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold uppercase text-slate-700 mb-1">
                    {role === 'STUDENT' ? 'Matricule *' : 'Nom d\'utilisateur *'}
                  </label>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder={role === 'STUDENT' ? 'EBM-2026-XXXX' : 'prenom.nom'}
                    disabled={!!editingUserId}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-xs disabled:opacity-60"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase text-slate-700 mb-1">
                    Adresse e-mail
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@ebm-institute.edu"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase text-slate-700 mb-1">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+33 6 XX XX XX XX"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* Conditional: If Student -> Group & BirthDate */}
              {role === 'STUDENT' && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-amber-50/60 rounded-xl border border-amber-200">
                  <div>
                    <label className="block font-bold uppercase text-amber-900 mb-1">
                      Groupe d'affectation
                    </label>
                    <select
                      value={groupId}
                      onChange={(e) => setGroupId(e.target.value)}
                      className="w-full p-2 bg-white border border-amber-300 rounded-xl text-xs"
                    >
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>{g.code} ({g.name})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold uppercase text-amber-900 mb-1">
                      Date de Naissance (Mot de passe initial)
                    </label>
                    <input
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="w-full p-2 bg-white border border-amber-300 rounded-xl text-xs font-mono"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Conditional: If Teacher -> Subjects & Quota */}
              {role === 'TEACHER' && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-blue-50/60 rounded-xl border border-blue-200">
                  <div>
                    <label className="block font-bold uppercase text-blue-900 mb-1">
                      Matières enseignées (virgules)
                    </label>
                    <input
                      type="text"
                      value={subjects}
                      onChange={(e) => setSubjects(e.target.value)}
                      placeholder="Algorithmique, Bases de Données"
                      className="w-full p-2 bg-white border border-blue-300 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold uppercase text-blue-900 mb-1">
                      Contrat hebdo max (h/semaine)
                    </label>
                    <input
                      type="number"
                      value={weeklyMaxHours}
                      onChange={(e) => setWeeklyMaxHours(Number(e.target.value))}
                      min={4}
                      max={40}
                      className="w-full p-2 bg-white border border-blue-300 rounded-xl text-xs font-bold"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-100"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl shadow-xs"
                >
                  {editingUserId ? 'Enregistrer les modifications' : 'Créer l’Utilisateur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
