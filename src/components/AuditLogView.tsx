import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { History, Shield, Smartphone, Monitor, Search, Filter } from 'lucide-react';

export const AuditLogView: React.FC = () => {
  const { auditLogs } = useApp();
  const [filterAction, setFilterAction] = useState('ALL');
  const [platformFilter, setPlatformFilter] = useState('ALL');

  const filteredLogs = auditLogs.filter((log) => {
    if (filterAction !== 'ALL' && log.action !== filterAction) return false;
    if (platformFilter !== 'ALL' && log.platform !== platformFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                <History className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                Journal d'Audit & Traçabilité des Opérations
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Historique inaltérable des créations, modifications, annulations, reports, validations et accès multi-plateformes.
            </p>
          </div>

          <span className="text-xs font-semibold px-3 py-1.5 bg-blue-50 text-blue-800 rounded-xl border border-blue-200">
            {auditLogs.length} événements enregistrés
          </span>
        </div>
      </div>

      {/* Filter and Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-bold">Action :</span>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="p-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 font-medium"
            >
              <option value="ALL">Toutes les actions</option>
              <option value="CREATION_SEANCE">Création de séance</option>
              <option value="MODIFICATION_SEANCE">Modification</option>
              <option value="REPORT_COURS">Report de cours</option>
              <option value="ANNULATION_COURS">Annulation de cours</option>
              <option value="VALIDATION_HEURES">Validation des heures</option>
              <option value="IMPORTATION_MASSE">Importation masse</option>
              <option value="CONSULTATION_ANDROID">Connexion Android</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-bold">Plateforme :</span>
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="p-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 font-medium"
            >
              <option value="ALL">Web & Android</option>
              <option value="WEB">Portail Web</option>
              <option value="ANDROID">Mobile Android</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
              <tr>
                <th className="p-3">Horodatage</th>
                <th className="p-3">Auteur / Compte</th>
                <th className="p-3">Rôle</th>
                <th className="p-3">Action exécutée</th>
                <th className="p-3">Plateforme</th>
                <th className="p-3">Détails de l'opération</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 text-slate-500 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString('fr-FR')}
                  </td>
                  <td className="p-3 font-bold text-slate-900 font-sans">
                    {log.userName}
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-sans text-[10px] font-bold">
                      {log.userRole}
                    </span>
                  </td>
                  <td className="p-3 font-bold text-blue-900 font-sans">
                    {log.action}
                  </td>
                  <td className="p-3">
                    {log.platform === 'ANDROID' ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-sans text-[10px] font-bold">
                        <Smartphone className="w-3 h-3" /> Android
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-sans text-[10px] font-bold">
                        <Monitor className="w-3 h-3" /> Web
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-slate-700 font-sans max-w-md">
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
