import React from "react";
import { Rolle, Rollebeskrivelse, Gruppe } from "../types/database";
import { X, BookOpen, Users, Clock } from "lucide-react";

interface RoleDescriptionModalProps {
  rolle: Rolle | null;
  rollebeskrivelse: Rollebeskrivelse | null;
  gruppe: Gruppe | null;
  onClose: () => void;
}

const FORKORTELSER = new Set([
  "kl",
  "ca",
  "f.eks",
  "bl.a",
  "m.m",
  "t.d",
  "osv",
  "evt",
]);

/** Del instruks-tekst i lesbare punkter uten å kreve ny tabell. */
export function splittInstruks(tekst: string): string[] {
  const raw = String(tekst || "").replace(/\r\n/g, "\n").trim();
  if (!raw) return [];

  const linjer = raw
    .split(/\n+/)
    .map((l) => l.replace(/^\s*(?:\d+[.)]|[-•*])\s*/, "").trim())
    .filter(Boolean);
  if (linjer.length > 1) return linjer;

  const enLinje = linjer[0] || raw;
  if (enLinje.includes(";")) {
    const deler = enLinje
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);
    if (deler.length > 1) return deler;
  }

  const setninger: string[] = [];
  let buf = "";
  const parts = enLinje.split(/(\.\s+)/);
  for (let i = 0; i < parts.length; i++) {
    buf += parts[i];
    if (!/^\.\s+$/.test(parts[i])) continue;
    const forrigeOrd = buf.replace(/\.\s+$/, "").split(/\s+/).pop() || "";
    const neste = (parts[i + 1] || "").trim();
    const nesteStart = neste.charAt(0);
    if (
      neste &&
      /[A-ZÆØÅ]/.test(nesteStart) &&
      !FORKORTELSER.has(forrigeOrd.replace(/\.$/, "").toLowerCase())
    ) {
      setninger.push(buf.trim());
      buf = "";
    }
  }
  if (buf.trim()) setninger.push(buf.trim());
  return setninger.length > 1 ? setninger : [enLinje];
}

export const RoleDescriptionModal: React.FC<RoleDescriptionModalProps> = ({
  rolle,
  rollebeskrivelse,
  gruppe,
  onClose,
}) => {
  if (!rolle) return null;

  const punkter = splittInstruks(rollebeskrivelse?.Rollebeskrivelse || "");

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between pb-4 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#eef5f1] text-[#2d5a3f] rounded-xl border border-[#d2e8d9]">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#2d5a3f]">
                Instruks
              </span>
              <h2 className="text-xl font-bold text-slate-900">{rolle.Rollenavn}</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="text-xs text-slate-500 flex items-center gap-1.5 mb-1">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>Tjenestegruppe</span>
            </div>
            <div className="font-semibold text-slate-900 text-sm">
              {gruppe ? gruppe.Gruppenavn : "Ikke spesifisert"}
            </div>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="text-xs text-slate-500 flex items-center gap-1.5 mb-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Standard behov</span>
            </div>
            <div className="font-semibold text-slate-900 text-sm">
              {rolle.Behov} {rolle.Behov === 1 ? "person" : "personer"}
            </div>
          </div>
        </div>

        {rolle.Beskrivelse && (
          <p className="text-sm text-slate-600 leading-relaxed mb-5">
            {rolle.Beskrivelse}
          </p>
        )}

        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
            Mine instrukser
          </h3>
          {punkter.length > 0 ? (
            <ol className="space-y-3">
              {punkter.map((punkt, i) => (
                <li key={i} className="flex gap-3 items-start">
                  <span className="w-6 h-6 rounded-full bg-sky-50 text-sky-700 text-xs font-bold flex items-center justify-center shrink-0 border border-sky-100">
                    {i + 1}
                  </span>
                  <span className="text-sm text-slate-800 leading-relaxed pt-0.5">
                    {punkt.replace(/\.$/, "")}.
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-slate-500">
              Ingen utvidet instruks er registrert for denne rollen ennå.
            </p>
          )}
        </div>

        <div className="flex justify-end pt-4 mt-5 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-lg cursor-pointer"
          >
            Lukk
          </button>
        </div>
      </div>
    </div>
  );
};
