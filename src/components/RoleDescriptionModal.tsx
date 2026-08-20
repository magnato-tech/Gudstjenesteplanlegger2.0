import React from "react";
import { Rolle, Rollebeskrivelse, Gruppe } from "../types/database";
import { X, BookOpen, Users, Clock, CheckCircle2 } from "lucide-react";

interface RoleDescriptionModalProps {
  rolle: Rolle | null;
  rollebeskrivelse: Rollebeskrivelse | null;
  gruppe: Gruppe | null;
  onClose: () => void;
}

export const RoleDescriptionModal: React.FC<RoleDescriptionModalProps> = ({
  rolle,
  rollebeskrivelse,
  gruppe,
  onClose,
}) => {
  if (!rolle) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#eef5f1] text-[#2d5a3f] rounded-xl border border-[#d2e8d9]">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#2d5a3f]">
                Rollebeskrivelse ({rolle.RolleID})
              </span>
              <h2 className="text-xl font-bold text-slate-900">
                {rolle.Rollenavn}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nøkkelinfo */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="text-xs text-slate-500 flex items-center gap-1.5 mb-1">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>Ansvarlig tjenestegruppe</span>
            </div>
            <div className="font-semibold text-slate-900 text-sm">
              {gruppe ? gruppe.Gruppenavn : "Ikke spesifisert"}
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="text-xs text-slate-500 flex items-center gap-1.5 mb-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Standard rollebehov</span>
            </div>
            <div className="font-semibold text-slate-900 text-sm">
              {rolle.Behov} {rolle.Behov === 1 ? "person" : "personer"} per gudstjeneste
            </div>
          </div>
        </div>

        {/* Kort beskrivelse */}
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Kort formål
          </h3>
          <p className="text-sm text-slate-700 leading-relaxed bg-slate-50/50 p-3 rounded-lg border border-slate-100">
            {rolle.Beskrivelse || "Ingen kortbeskrivelse oppgitt."}
          </p>
        </div>

        {/* Fullstendig instruks */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Oppgaver og instruksjoner
          </h3>
          {rollebeskrivelse ? (
            <div className="text-sm text-slate-800 leading-relaxed bg-[#eef5f1]/60 p-4 rounded-xl border border-[#d2e8d9] whitespace-pre-line">
              {rollebeskrivelse.Rollebeskrivelse}
            </div>
          ) : (
            <p className="text-sm text-slate-500 italic">
              Ingen utvidet instruks er registrert for denne rollen ennå.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-lg shadow-sm transition cursor-pointer"
          >
            Lukk
          </button>
        </div>
      </div>
    </div>
  );
};
