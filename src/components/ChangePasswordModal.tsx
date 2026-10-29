import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Lock, ShieldCheck, AlertCircle, KeyRound } from 'lucide-react';

export const ChangePasswordModal: React.FC = () => {
  const { currentUser, changePassword } = useApp();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Display only if current user has mustChangePassword === true (RG-03)
  if (!currentUser.mustChangePassword) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError('Le mot de passe doit comporter au moins 6 caractères.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }

    const ok = changePassword(currentUser.id, newPassword);
    if (ok) {
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
      }, 1500);
    } else {
      setError('Une erreur est survenue lors de la mise à jour.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-100 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center gap-3 mb-4 text-blue-900">
          <div className="p-3 bg-blue-100 rounded-xl text-blue-700">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Changement obligatoire de mot de passe
            </h3>
            <span className="inline-block text-xs font-semibold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full mt-0.5">
              Sécurité du Compte • EBM Institute
            </span>
          </div>
        </div>

        <p className="text-sm text-slate-600 mb-5 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
          Bonjour <strong className="text-slate-800">{currentUser.name}</strong> ({currentUser.matricule || currentUser.username}). 
          Votre compte utilise un mot de passe temporaire par défaut (date de naissance). 
          Conformément au cahier des charges de l'EBM Institute, vous devez définir un nouveau mot de passe sécurisé pour accéder à votre espace web et mobile.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-xl text-xs flex items-center gap-2 border border-red-200">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl text-center text-sm font-semibold flex items-center justify-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            Mot de passe mis à jour avec succès !
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Nouveau mot de passe
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 caractères"
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
                  required
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Confirmer le nouveau mot de passe
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Répétez le mot de passe"
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
                  required
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-blue-700 hover:bg-blue-800 text-white font-semibold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 hover:shadow-lg active:scale-[0.99]"
            >
              <ShieldCheck className="w-4 h-4" />
              Enregistrer mon mot de passe et continuer
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
