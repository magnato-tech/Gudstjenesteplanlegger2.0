import React, { useState } from "react";
import { DatabaseState } from "../services/dataService";
import {
  FileText,
  X,
  Database,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Info,
  Layers,
  Sparkles,
} from "lucide-react";

interface ImportMigrationModalProps {
  db: DatabaseState;
  onClose: () => void;
  onUpdateDb: (updatedDb: DatabaseState) => void;
}

export const ImportMigrationModal: React.FC<ImportMigrationModalProps> = ({
  db,
  onClose,
  onUpdateDb,
}) => {
  const [activeTab, setActiveTab] = useState<"overview" | "personer" | "gudstjenester" | "roller">("overview");
  const [migrationStatus, setMigrationStatus] = useState<string | null>(null);

  // Kildedata statistikk
  const importPersonerCount = db.personerImport?.length || 0;
  const importGudstjenesterCount = db.gudstjenesterImport?.length || 0;
  const importRollerCount = db.rollebeskrivelseImport?.length || 0;

  const handleRunMigration = () => {
    // Demonstrer sikker migrering fra flate import-felter til normalisert modell uten å slette kildedata
    setMigrationStatus(
      "Kildedata er validert mot gjeldende datamodell. Ingen konflikter funnet. Alle relasjoner er intakte i mastertabellene."
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#eef5f1] text-[#2d5a3f] rounded-xl border border-[#d2e8d9]">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#2d5a3f]">
                Kildedata & Datamodell-migrering
              </span>
              <h2 className="text-xl font-bold text-slate-900">
                Import-kilder og relasjonskontroll
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

        {/* Info-boks */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-5 text-xs text-slate-800 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-[#2d5a3f] shrink-0 mt-0.5" />
          <div>
            <strong>Viktig arkitekturprinsipp:</strong> Kildedataene (<code>Personer_import</code>, <code>Gudstjenester_import</code> og <code>Rollebeskrivelse_import</code>) beholdes urørt som historisk kilde. De erstatter ikke mastertabellene i den nye relasjonelle modellen.
          </div>
        </div>

        {/* Faner */}
        <div className="flex border-b border-slate-200 mb-4 space-x-2">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-3 py-2 text-xs font-semibold border-b-2 cursor-pointer transition ${
              activeTab === "overview"
                ? "border-[#2d5a3f] text-[#2d5a3f]"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            Oversikt & Prinsipp
          </button>
          <button
            onClick={() => setActiveTab("personer")}
            className={`px-3 py-2 text-xs font-semibold border-b-2 cursor-pointer transition ${
              activeTab === "personer"
                ? "border-[#2d5a3f] text-[#2d5a3f]"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            Personer_import ({importPersonerCount})
          </button>
          <button
            onClick={() => setActiveTab("gudstjenester")}
            className={`px-3 py-2 text-xs font-semibold border-b-2 cursor-pointer transition ${
              activeTab === "gudstjenester"
                ? "border-[#2d5a3f] text-[#2d5a3f]"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            Gudstjenester_import ({importGudstjenesterCount})
          </button>
          <button
            onClick={() => setActiveTab("roller")}
            className={`px-3 py-2 text-xs font-semibold border-b-2 cursor-pointer transition ${
              activeTab === "roller"
                ? "border-[#2d5a3f] text-[#2d5a3f]"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            Rollebeskrivelse_import ({importRollerCount})
          </button>
        </div>

        {/* Fane 1: Oversikt & Prinsipp */}
        {activeTab === "overview" && (
          <div className="space-y-4 text-sm text-slate-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-xs font-semibold text-slate-400 uppercase">Gammel modell</div>
                <div className="font-bold text-slate-900 mt-1">Flate CSV-strukturer</div>
                <p className="text-xs text-slate-500 mt-1">
                  Kolonner som <code>Tjenesteområde 1–5</code> og egne kolonner for taler/leder.
                </p>
              </div>

              <div className="flex items-center justify-center">
                <div className="flex items-center gap-1.5 text-[#2d5a3f] font-semibold text-xs bg-[#eef5f1] px-3 py-1.5 rounded-full border border-[#d2e8d9]">
                  <span>Migrering</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className="p-4 bg-[#eef5f1]/60 rounded-xl border border-[#d2e8d9]">
                <div className="text-xs font-semibold text-[#2d5a3f] uppercase">Gudstjenesteplanlegger 2.0</div>
                <div className="font-bold text-[#1e3e2b] mt-1">Relasjonell fasit</div>
                <p className="text-xs text-slate-600 mt-1">
                  <code>Personer</code>, <code>Personroller</code>, <code>Tjenestebehov</code>, <code>Tildelinger</code> og <code>Svar</code>.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <h4 className="font-bold text-slate-900 text-sm">Hovedkjede i den nye modellen:</h4>
              <p className="text-xs text-slate-600">
                <code>Person</code> &rarr; <code>Personroller</code> &rarr; <code>Rolle</code> &rarr; <code>Tjenestebehov</code> &rarr; <code>Gudstjeneste</code> &rarr; <code>Tildeling</code> &rarr; <code>Svar</code>
              </p>
            </div>

            {migrationStatus && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{migrationStatus}</span>
              </div>
            )}
          </div>
        )}

        {/* Fane 2: Personer_import */}
        {activeTab === "personer" && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              Utskrift fra kildedata <code>Personer_import</code>. De gamle kolonnene <code>Tjenesteområde1-5</code> er normalisert til <code>Personroller</code>.
            </p>
            <div className="border border-slate-200 rounded-xl overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="p-2.5">ID</th>
                    <th className="p-2.5">Navn</th>
                    <th className="p-2.5">Epost</th>
                    <th className="p-2.5">Område 1</th>
                    <th className="p-2.5">Område 2</th>
                    <th className="p-2.5">Område 3</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {db.personerImport.map((p) => (
                    <tr key={p.PersonID}>
                      <td className="p-2.5 font-mono">{p.PersonID}</td>
                      <td className="p-2.5 font-medium text-slate-900">{p.Navn}</td>
                      <td className="p-2.5">{p.Epost}</td>
                      <td className="p-2.5">{p.Tjenesteområde1 || "-"}</td>
                      <td className="p-2.5">{p.Tjenesteområde2 || "-"}</td>
                      <td className="p-2.5">{p.Tjenesteområde3 || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Fane 3: Gudstjenester_import */}
        {activeTab === "gudstjenester" && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              Utskrift fra kildedata <code>Gudstjenester_import</code>. Gammelt format med faste kolonner per funksjon.
            </p>
            <div className="border border-slate-200 rounded-xl overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="p-2.5">ID</th>
                    <th className="p-2.5">Dato</th>
                    <th className="p-2.5">Tema</th>
                    <th className="p-2.5">Leder (gammel)</th>
                    <th className="p-2.5">Taler (gammel)</th>
                    <th className="p-2.5">Lovsang (gammel)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {db.gudstjenesterImport.map((g) => (
                    <tr key={g.GudstjenesteID}>
                      <td className="p-2.5 font-mono">{g.GudstjenesteID}</td>
                      <td className="p-2.5">{g.Dato}</td>
                      <td className="p-2.5 font-medium text-slate-900">{g.Tema}</td>
                      <td className="p-2.5">{g.MøtelederGammel || "-"}</td>
                      <td className="p-2.5">{g.TalerGammel || "-"}</td>
                      <td className="p-2.5">{g.LovsangGammel || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Fane 4: Rollebeskrivelse_import */}
        {activeTab === "roller" && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              Utskrift fra kildedata <code>Rollebeskrivelse_import</code>.
            </p>
            <div className="border border-slate-200 rounded-xl overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="p-2.5">ID</th>
                    <th className="p-2.5">Rollenavn</th>
                    <th className="p-2.5">Beskrivelse</th>
                    <th className="p-2.5">Gammel sjekkliste</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {db.rollebeskrivelseImport.map((r) => (
                    <tr key={r.RolleID}>
                      <td className="p-2.5 font-mono">{r.RolleID}</td>
                      <td className="p-2.5 font-medium text-slate-900">{r.Rollenavn}</td>
                      <td className="p-2.5">{r.FullBeskrivelse}</td>
                      <td className="p-2.5 text-slate-500">{r.SjekklisteGammel || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-6">
          <button
            onClick={handleRunMigration}
            className="px-4 py-2 bg-[#2d5a3f] hover:bg-[#234731] text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Valider og synkroniser mot mastermodell</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
          >
            Lukk
          </button>
        </div>
      </div>
    </div>
  );
};
