import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Users,
  UserPlus,
  Upload,
  Download,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileSpreadsheet,
  Lock,
  Power,
  Shield,
  Search,
} from 'lucide-react';
import { ImportResult, ImportStudentRow } from '../types';

interface StudentManagementProps {
  onNavigateToCreate?: () => void;
}

export const StudentManagement: React.FC<StudentManagementProps> = ({ onNavigateToCreate }) => {
  const {
    users,
    groups,
    filieres,
    createStudent,
    importStudents,
    toggleUserStatus,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'LIST' | 'INDIVIDUAL' | 'MASS_IMPORT'>('LIST');
  const [searchTerm, setSearchTerm] = useState('');
  const [groupFilter, setGroupFilter] = useState('ALL');

  // Individual Form
  const [matricule, setMatricule] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('2005-06-15');
  const [groupId, setGroupId] = useState(groups[0]?.id || '');
  const [individualError, setIndividualError] = useState<string | null>(null);
  const [individualSuccess, setIndividualSuccess] = useState<string | null>(null);

  // Mass Import Form
  const [csvText, setCsvText] = useState('');
  const [importReport, setImportReport] = useState<ImportResult | null>(null);

  const students = users.filter((u) => u.role === 'STUDENT');

  const filteredStudents = students.filter((s) => {
    if (groupFilter !== 'ALL' && s.groupId !== groupFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        (s.matricule && s.matricule.toLowerCase().includes(q)) ||
        s.email.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleIndividualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIndividualError(null);
    setIndividualSuccess(null);

    const res = createStudent({
      matricule: matricule.trim().toUpperCase(),
      name: name.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      birthDate,
      groupId,
    });

    if (res.success) {
      setIndividualSuccess(`Étudiant ${matricule.toUpperCase()} créé avec succès. Mot de passe initial configuré (date de naissance : ${birthDate}).`);
      setMatricule('');
      setName('');
      setEmail('');
      setPhone('');
    } else {
      setIndividualError(res.error || 'Erreur lors de la création.');
    }
  };

  // Sample data loader for mass import demo
  const loadSampleCSV = () => {
    const sample = `Matricule,Nom,Prenom,DateNaissance,Email,Filiere,Niveau,Groupe
EBM-2026-0201,Dupont,Antoine,2005-02-18,antoine.dupont@etudiant.ebm.edu,INFO,L1,L1-INFO-A
EBM-2026-0202,Ranaivo,Miary,2005-09-04,miary.ranaivo@etudiant.ebm.edu,INFO,L1,L1-INFO-A
EBM-2026-0203,Leroy,Camille,2004-12-10,camille.leroy@etudiant.ebm.edu,INFO,L1,L1-INFO-B
EBM-2026-0042,DoublonTest,Thomas,2005-04-14,thomas.dup@etudiant.ebm.edu,INFO,L1,L1-INFO-A
EBM-2026-0204,Benoit,Alexia,,alexia.benoit@etudiant.ebm.edu,INFO,L1,L1-INFO-A`;
    setCsvText(sample);
  };

  const handleMassImport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvText.trim()) return;

    // Parse CSV rows
    const lines = csvText.trim().split('\n');
    const rows: ImportStudentRow[] = [];

    // Skip header line if present
    const startIndex = lines[0].toLowerCase().includes('matricule') ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const parts = line.split(',').map((p) => p.trim());

      rows.push({
        matricule: parts[0] || '',
        nom: parts[1] || '',
        prenom: parts[2] || '',
        dateNaissance: parts[3] || '2005-01-01',
        email: parts[4] || '',
        filiere: parts[5] || 'INFO',
        niveau: parts[6] || 'L1',
        groupe: parts[7] || 'L1-INFO-A',
      });
    }

    const report = importStudents(rows);
    setImportReport(report);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                <Users className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                Gestion des Comptes Étudiants & Groupes
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Matricule unique comme identifiant, initialisation du mot de passe avec la date de naissance, import CSV et gestion des accès.
            </p>
          </div>

          {/* Sub Navigation */}
          <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveTab('LIST')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'LIST' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Liste des étudiants ({students.length})
            </button>
            <button
              onClick={() => setActiveTab('INDIVIDUAL')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors ${
                activeTab === 'INDIVIDUAL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" /> Création individuelle
            </button>
            <button
              onClick={() => setActiveTab('MASS_IMPORT')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors ${
                activeTab === 'MASS_IMPORT' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Importation en masse
            </button>
            {onNavigateToCreate && (
              <button
                onClick={onNavigateToCreate}
                className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg flex items-center gap-1 font-bold transition-all shadow-xs"
              >
                + Créer un Groupe / Filière
              </button>
            )}
          </div>
        </div>
      </div>

      {/* TAB 1: LIST */}
      {activeTab === 'LIST' && (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
          {/* Filter Bar */}
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="relative w-full sm:w-72">
              <input
                type="text"
                placeholder="Rechercher par nom, matricule ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-1 focus:ring-blue-600"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-slate-500 font-semibold whitespace-nowrap">Filtrer par groupe :</span>
              <select
                value={groupFilter}
                onChange={(e) => setGroupFilter(e.target.value)}
                className="p-2 bg-white border border-slate-300 rounded-xl text-xs font-medium"
              >
                <option value="ALL">Tous les groupes</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.code} ({g.studentCount} ét.)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3">Matricule (Login)</th>
                  <th className="p-3">Nom & Prénom</th>
                  <th className="p-3">Groupe affecté</th>
                  <th className="p-3">Mot de passe</th>
                  <th className="p-3">Google Calendar</th>
                  <th className="p-3">Statut Compte</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((student) => {
                  const studentGroup = groups.find((g) => g.id === student.groupId);

                  return (
                    <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-mono font-bold text-blue-900">
                        {student.matricule || student.username}
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-slate-900 block">{student.name}</span>
                        <span className="text-[11px] text-slate-500">{student.email}</span>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-slate-100 font-semibold text-slate-700 rounded-md">
                          {studentGroup?.code || 'Non assigné'}
                        </span>
                      </td>
                      <td className="p-3">
                        {student.mustChangePassword ? (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold rounded text-[10px]" title="Changement obligatoire à la 1ère connexion">
                            Temporaire
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded text-[10px]">
                            Personnalisé
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        {student.googleCalendarLinked ? (
                          <span className="text-emerald-700 font-semibold flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Lié
                          </span>
                        ) : (
                          <span className="text-slate-400">Non lié</span>
                        )}
                      </td>
                      <td className="p-3">
                        {student.isActive ? (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded text-[10px]">
                            Actif
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-red-100 text-red-800 font-bold rounded text-[10px]">
                            Désactivé (Bloqué Web & Android)
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => toggleUserStatus(student.id)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                            student.isActive
                              ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                          }`}
                        >
                          {student.isActive ? 'Désactiver' : 'Réactiver'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: INDIVIDUAL CREATION */}
      {activeTab === 'INDIVIDUAL' && (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-6 max-w-2xl">
          <h3 className="text-base font-bold text-slate-900 mb-1">
            Création individuelle d'un compte étudiant
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Le matricule généré servira d'identifiant unique pour la plateforme Web et l'application Android.
          </p>

          {individualError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>{individualError}</span>
            </div>
          )}

          {individualSuccess && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{individualSuccess}</span>
            </div>
          )}

          <form onSubmit={handleIndividualSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Matricule unique * (ex: EBM-2026-0150)
                </label>
                <input
                  type="text"
                  value={matricule}
                  onChange={(e) => setMatricule(e.target.value)}
                  placeholder="EBM-2026-XXXX"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Nom et Prénom *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jean Rakoto"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Date de naissance * (Mot de passe initial)
                </label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Groupe d'affectation *
                </label>
                <select
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium"
                >
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.code} ({g.name})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Adresse e-mail (facultative)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jean.rakoto@etudiant.ebm.edu"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Numéro de téléphone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+33 6 XX XX XX XX"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              className="py-2.5 px-5 bg-blue-700 hover:bg-blue-800 text-white font-bold text-sm rounded-xl shadow-xs transition-all flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Créer le compte étudiant
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: MASS IMPORT */}
      {activeTab === 'MASS_IMPORT' && (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Importation en masse d'étudiants (Excel / CSV)
              </h3>
              <p className="text-xs text-slate-500">
                Détection automatique des doublons de matricule, vérification des champs obligatoires et rapport d'erreurs.
              </p>
            </div>
            <button
              onClick={loadSampleCSV}
              className="px-3 py-1.5 bg-blue-50 text-blue-800 hover:bg-blue-100 text-xs font-bold rounded-xl transition-colors border border-blue-200"
            >
              Charger un exemple de fichier CSV
            </button>
          </div>

          <form onSubmit={handleMassImport} className="space-y-3">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                Contenu CSV (Format : Matricule, Nom, Prenom, DateNaissance, Email, Filiere, Niveau, Groupe)
              </label>
              <textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="Collez ici les lignes CSV ou chargez l'exemple ci-dessus..."
                rows={6}
                className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-1 focus:ring-blue-600"
                required
              />
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Lancer l'importation et analyser les données
            </button>
          </form>

          {/* Import Report Section */}
          {importReport && (
            <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 animate-in fade-in duration-150">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                Rapport officiel de traitement de l'importation
              </h4>

              {/* KPI Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase block">Total analysé</span>
                  <span className="text-base font-bold text-slate-900">{importReport.totalRows}</span>
                </div>
                <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                  <span className="text-[10px] text-emerald-700 uppercase block">Comptes créés</span>
                  <span className="text-base font-bold text-emerald-800">{importReport.successCount}</span>
                </div>
                <div className="bg-amber-50 p-2 rounded-lg border border-amber-200">
                  <span className="text-[10px] text-amber-700 uppercase block">Doublons détectés</span>
                  <span className="text-base font-bold text-amber-800">{importReport.duplicateCount}</span>
                </div>
                <div className="bg-red-50 p-2 rounded-lg border border-red-200">
                  <span className="text-[10px] text-red-700 uppercase block">Rejets / Erreurs</span>
                  <span className="text-base font-bold text-red-800">{importReport.errorCount}</span>
                </div>
              </div>

              {/* Errors list */}
              {importReport.errors.length > 0 && (
                <div className="bg-white p-3 rounded-lg border border-red-200">
                  <h5 className="text-[11px] font-bold text-red-800 mb-2 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                    Détail des anomalies détectées :
                  </h5>
                  <ul className="text-xs space-y-1">
                    {importReport.errors.map((err, i) => (
                      <li key={i} className="text-red-700 flex items-start gap-1.5">
                        <span className="font-bold">Ligne {err.row} ({err.matricule}) :</span>
                        <span>{err.reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
