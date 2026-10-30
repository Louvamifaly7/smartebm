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
  const { login, loginWithGoogleFirebase, isAndroidView, toggleAndroidView } = useApp();

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

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setIsLoading(true);
    const res = await loginWithGoogleFirebase();
    setIsLoading(false);
    if (!res.success && res.message) {
      setErrorMessage(res.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col justify-between p-4 sm:p-6 text-slate-100 font-sans">
      
      {/* Top Header Bar */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <div className="bg-white p-1.5 rounded-2xl shadow-lg flex items-center justify-center">
            <img
              src="/assets/aistudio/logo_540e8d94.png"
              alt="EBM Institute Business School"
              className="h-8 w-auto object-contain"
            />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight text-white uppercase">
              EBM Institute
            </h1>
            <p className="text-[11px] text-blue-300">
              Business School Madagascar • SIS Universitaire Officiel
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
          <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-red-600 via-blue-900 to-amber-500"></div>

          {/* Heading with Logo */}
          <div className="text-center mb-5">
            <div className="inline-flex items-center justify-center p-2 rounded-2xl bg-slate-50 border border-slate-100 mb-3 shadow-xs">
              <img
                src="/assets/aistudio/logo_540e8d94.png"
                alt="EBM Institute Business School"
                className="h-9 w-auto object-contain"
              />
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Connexion au Portail SIS
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Accès sécurisé Cloud Firestore & Authentification par Rôle
            </p>
          </div>

          {/* Tab Selector: Student vs Staff */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-2xl mb-4 text-xs font-bold">
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
                setIdentifier('andry.rakotomalala@ebm-institute.edu');
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
              Administration & Corps
            </button>
          </div>

          {/* Error Message Box */}
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
          <form onSubmit={handleSubmit} className="space-y-3.5">
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
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-blue-700 hover:bg-blue-800 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 hover:shadow-lg active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Se connecter à mon espace SIS
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              Connexion SSO Google (Firebase Auth Officiel)
            </button>
          </form>

          {/* Quick 1-Click Fast Login for all 6 SIS Roles */}
          <div className="mt-5 pt-4 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 mb-2.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Accès Direct aux 6 Rôles SIS Officiels (1-clic) :
            </span>

            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => handleQuickLogin('andry.rakotomalala@ebm-institute.edu')}
                className="p-2 rounded-xl text-left bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 transition-all cursor-pointer"
              >
                <span className="font-bold block text-slate-900 truncate">Andry Rakotomalala</span>
                <span className="text-[10px] text-blue-700 font-semibold block">1. Administrateur</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('scolarite@ebm-institute.edu')}
                className="p-2 rounded-xl text-left bg-slate-50 hover:bg-purple-50 border border-slate-200 hover:border-purple-300 transition-all cursor-pointer"
              >
                <span className="font-bold block text-slate-900 truncate">Fanja Rakotoarisoa</span>
                <span className="text-[10px] text-purple-700 font-semibold block">2. Scolarité & Planning</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('ravaka.finance@ebm-institute.edu')}
                className="p-2 rounded-xl text-left bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 transition-all cursor-pointer"
              >
                <span className="font-bold block text-slate-900 truncate">Ravaka Andrianaivo</span>
                <span className="text-[10px] text-emerald-700 font-semibold block">3. Finances & Caisse</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('tiana.rabemananjara@ebm-institute.edu')}
                className="p-2 rounded-xl text-left bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 transition-all cursor-pointer"
              >
                <span className="font-bold block text-slate-900 truncate">Dr. Tiana Rabemananjara</span>
                <span className="text-[10px] text-indigo-700 font-semibold block">4. Resp. Pédagogique</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('hery.andriamalala@ebm-institute.edu')}
                className="p-2 rounded-xl text-left bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 transition-all cursor-pointer"
              >
                <span className="font-bold block text-slate-900 truncate">Dr. Hery Andriamalala</span>
                <span className="text-[10px] text-teal-700 font-semibold block">5. Enseignant</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('EBM-2026-0042', '2005-04-14')}
                className="p-2 rounded-xl text-left bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 transition-all cursor-pointer"
              >
                <span className="font-bold block text-slate-900 truncate">Toky Andriantsoa</span>
                <span className="text-[10px] text-amber-700 font-semibold block">6. Étudiant (0042)</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('EBM-2026-0089', '2005-08-22')}
                className="p-2 rounded-xl text-left bg-amber-50 hover:bg-amber-100 border border-amber-300 transition-all cursor-pointer"
                title="Déclenche le changement obligatoire de mot de passe"
              >
                <span className="font-bold block text-slate-900 truncate">Miora Rasoanaivo</span>
                <span className="text-[10px] text-amber-800 font-semibold block">Étudiant (1ère Connexion)</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('EBM-2026-0999', '2005-01-01')}
                className="p-2 rounded-xl text-left bg-red-50 hover:bg-red-100 border border-red-300 transition-all cursor-pointer"
                title="Teste le blocage d'accès sur compte désactivé"
              >
                <span className="font-bold block text-red-900 truncate flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3 text-red-600" />
                  Mahery Randria
                </span>
                <span className="text-[10px] text-red-700 font-semibold block">Compte Désactivé</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Disclaimer */}
      <footer className="text-center text-xs text-slate-400 py-3">
        <span>© 2026 EBM Institute Madagascar • SIS Cloud Firestore & Sécurité RBAC</span>
      </footer>
    </div>
  );
};
