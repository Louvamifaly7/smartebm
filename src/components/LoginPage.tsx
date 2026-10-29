import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Lock,
  User as UserIcon,
  ShieldCheck,
  AlertCircle,
  GraduationCap,
  Briefcase,
  Smartphone,
  ChevronRight,
  Sparkles,
  KeyRound,
  ShieldAlert,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, isAndroidView, toggleAndroidView, users } = useApp();

  const [activeTab, setActiveTab] = useState<'STUDENT' | 'STAFF'>('STUDENT');
  const [identifier, setIdentifier] = useState('EBM-2026-0042');
  const [password, setPassword] = useState('2005-04-14');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    setTimeout(() => {
      const res = login(identifier, password);
      setIsLoading(false);
      if (!res.success) {
        setErrorMessage(res.error || 'Erreur d’authentification');
      }
    }, 350);
  };

  const handleQuickLogin = (quickId: string, quickPwd = '') => {
    setIdentifier(quickId);
    setPassword(quickPwd);
    setErrorMessage(null);
    const res = login(quickId, quickPwd);
    if (!res.success) {
      setErrorMessage(res.error || 'Erreur d’authentification');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col justify-between p-4 sm:p-6 text-slate-100 font-sans">
      
      {/* Top Header Bar */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-black text-amber-300 text-base shadow-lg ring-2 ring-blue-400/30">
            EBM
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight text-white uppercase">
              EBM Institute
            </h1>
            <p className="text-[11px] text-blue-300">
              Portail Numérique Officiel • Version 3.2
            </p>
          </div>
        </div>

        {/* Dual Mode Switcher Button */}
        <button
          onClick={toggleAndroidView}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-xs font-semibold rounded-xl border border-slate-700 text-slate-200 transition-colors"
        >
          <Smartphone className="w-4 h-4 text-amber-400" />
          <span className="hidden sm:inline">Simulateur Mobile Android</span>
          <span className="sm:hidden">Android</span>
        </button>
      </header>

      {/* Main Login Card */}
      <main className="max-w-md w-full mx-auto my-auto py-6">
        <div className="bg-white text-slate-900 rounded-3xl shadow-2xl p-6 sm:p-8 border border-slate-100 relative overflow-hidden">
          
          {/* Decorative Top Accent */}
          <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-amber-500"></div>

          {/* Heading */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-50 text-blue-800 mb-3 shadow-inner">
              <Lock className="w-6 h-6 text-blue-700" />
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Connexion au Portail
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Accès unifié Web & Android • Emplois du temps & Salles
            </p>
          </div>

          {/* Tab Selector: Student vs Staff */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-2xl mb-5 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setActiveTab('STUDENT');
                setIdentifier('EBM-2026-0042');
                setPassword('2005-04-14');
                setErrorMessage(null);
              }}
              className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'STUDENT'
                  ? 'bg-white text-blue-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              Étudiants (Matricule)
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('STAFF');
                setIdentifier('alexandre.morel@ebm-institute.edu');
                setPassword('••••••••');
                setErrorMessage(null);
              }}
              className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'STAFF'
                  ? 'bg-white text-blue-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              Personnel & Enseignants
            </button>
          </div>

          {/* Error Message Box (e.g. RG-22 account deactivation) */}
          {errorMessage && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold block mb-0.5">Échec de connexion</span>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                {activeTab === 'STUDENT' ? 'Matricule Étudiant *' : 'Adresse e-mail ou Identifiant *'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={activeTab === 'STUDENT' ? 'EBM-2026-0042' : 'prenom.nom@ebm-institute.edu'}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all font-mono"
                  required
                />
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
              {activeTab === 'STUDENT' && (
                <span className="text-[10px] text-slate-400 block mt-1">
                  Format officiel : EBM-2026-XXXX (fourni lors de votre inscription)
                </span>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Mot de passe *
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all font-mono"
                  required
                />
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
              {activeTab === 'STUDENT' && (
                <span className="text-[10px] text-slate-400 block mt-1">
                  Mot de passe initial = votre date de naissance (changement obligatoire à la 1ère connexion)
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-blue-700 hover:bg-blue-800 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 hover:shadow-lg active:scale-[0.99] disabled:opacity-50"
            >
              {isLoading ? (
                <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Se connecter à mon espace
                </>
              )}
            </button>
          </form>

          {/* Quick 1-Click Fast Login / Demonstration Selector */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 mb-2.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Comptes de test prédéfinis (Connexion en 1-clic) :
            </span>

            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => handleQuickLogin('alexandre.morel@ebm-institute.edu')}
                className="p-2 rounded-xl text-left bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 transition-all"
              >
                <span className="font-bold block text-slate-900 truncate">Alexandre Morel</span>
                <span className="text-[10px] text-blue-700 font-semibold block">Administrateur</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('sandrine.girard@ebm-institute.edu')}
                className="p-2 rounded-xl text-left bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 transition-all"
              >
                <span className="font-bold block text-slate-900 truncate">Sandrine Girard</span>
                <span className="text-[10px] text-purple-700 font-semibold block">Resp. Planning</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('marc.vasseur@ebm-institute.edu')}
                className="p-2 rounded-xl text-left bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 transition-all"
              >
                <span className="font-bold block text-slate-900 truncate">Dr. Marc Vasseur</span>
                <span className="text-[10px] text-emerald-700 font-semibold block">Enseignant</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('EBM-2026-0042', '2005-04-14')}
                className="p-2 rounded-xl text-left bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 transition-all"
              >
                <span className="font-bold block text-slate-900 truncate">Thomas Laurent</span>
                <span className="text-[10px] text-amber-700 font-semibold block">Étudiant L1 (0042)</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('EBM-2026-0089', '2005-08-22')}
                className="p-2 rounded-xl text-left bg-amber-50 hover:bg-amber-100 border border-amber-300 transition-all"
                title="Déclenche le changement obligatoire de mot de passe"
              >
                <span className="font-bold block text-slate-900 truncate">Sarah Kaboré</span>
                <span className="text-[10px] text-amber-800 font-semibold block">1ère Connexion</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('EBM-2026-0999', '2005-01-01')}
                className="p-2 rounded-xl text-left bg-red-50 hover:bg-red-100 border border-red-300 transition-all"
                title="Teste le blocage d'accès sur compte désactivé"
              >
                <span className="font-bold block text-red-900 truncate flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3 text-red-600" />
                  Maxime Suspendu
                </span>
                <span className="text-[10px] text-red-700 font-semibold block">Compte Désactivé</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Disclaimer */}
      <footer className="text-center text-xs text-slate-400 py-3">
        <span>© 2026 EBM Institute • Système Unique Centralisé Web & Mobile Android</span>
      </footer>
    </div>
  );
};
