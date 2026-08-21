import React, { useState } from "react";
import { DatabaseState, genererPersonligLenke, hentTilgang, AppView } from "../services/dataService";
import {
  Calendar,
  Users,
  ShieldCheck,
  UserCheck,
  RotateCcw,
  Share2,
  Check,
  Info,
  ChevronDown,
  Church,
  TableProperties,
} from "lucide-react";

interface HeaderProps {
  db: DatabaseState;
  activeView: AppView;
  setActiveView: (view: AppView) => void;
  selectedPersonId: string;
  setSelectedPersonId: (id: string) => void;
  onResetData: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  db,
  activeView,
  setActiveView,
  selectedPersonId,
  setSelectedPersonId,
  onResetData,
}) => {
  const [copied, setCopied] = useState(false);
  const [showPersonDropdown, setShowPersonDropdown] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const selectedPerson = db.personer.find((p) => p.PersonID === selectedPersonId);
  const tilgang = hentTilgang(db, selectedPersonId);

  const handleCopyLink = () => {
    const link = genererPersonligLenke(
      selectedPersonId,
      activeView !== "personal" ? activeView : undefined
    );
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <header className="bg-white border-b border-slate-200/90 sticky top-0 z-30 shadow-xs">
      {/* Pilot-varsel */}
      <div className="bg-amber-50/90 border-b border-amber-200/80 px-4 py-1.5 text-xs text-amber-900 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-amber-700 shrink-0" />
          <span>
            <strong>Pilotversjon (åpen modell):</strong> Ingen innlogging i første versjon. Velg hvem du vil se systemet som nedenfor.
          </span>
        </div>
        <button
          onClick={() => setShowResetConfirm(true)}
          className="text-amber-800 hover:text-amber-950 underline flex items-center gap-1 text-xs cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" />
          Tilbakestill eksempeldata
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Tittel som i referansebildet */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#eef5f1] border border-[#d2e8d9] text-[#2d5a3f] flex items-center justify-center shadow-2xs shrink-0">
              <Church className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Lillesand Misjonskirke
              </div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                Menighetsaktivitet
              </h1>
            </div>
          </div>

          {/* Høyre del: Person-velger & handlinger */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowPersonDropdown(!showPersonDropdown)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-slate-100 text-slate-800 text-sm font-medium transition cursor-pointer"
              >
                <div className="w-6 h-6 rounded-full bg-[#eef5f1] text-[#2d5a3f] border border-[#d2e8d9] flex items-center justify-center text-xs font-bold">
                  {selectedPerson ? selectedPerson.Fornavn[0] : "P"}
                </div>
                <div className="text-left">
                  <div className="text-[10px] text-slate-400 font-normal leading-none mb-0.5">Aktiv person:</div>
                  <div className="text-xs sm:text-sm font-semibold truncate max-w-[120px] sm:max-w-[180px] text-slate-900 leading-tight">
                    {selectedPerson?.Navn || "Velg person"}
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {showPersonDropdown && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 max-h-96 overflow-y-auto">
                  <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    Velg person (Pilot)
                  </div>
                  {db.personer
                    .filter((p) => p.Aktiv)
                    .map((person) => {
                      const personTilgang = hentTilgang(db, person.PersonID);

                      return (
                        <button
                          key={person.PersonID}
                          type="button"
                          onClick={() => {
                            setSelectedPersonId(person.PersonID);
                            setShowPersonDropdown(false);
                          }}
                          className={`w-full text-left px-3 py-2 flex items-center justify-between text-sm hover:bg-[#eef5f1]/60 transition cursor-pointer ${
                            selectedPersonId === person.PersonID
                              ? "bg-[#eef5f1] font-semibold text-[#1e3e2b]"
                              : "text-slate-700"
                          }`}
                        >
                          <div>
                            <div className="font-medium text-slate-900">
                              {person.Navn}
                            </div>
                            <div className="text-xs text-slate-500 flex items-center gap-1.5">
                              <span className="font-mono text-[11px]">{person.PersonID}</span>
                              {personTilgang.isAdmin && (
                                <span className="bg-slate-100 text-slate-800 text-[10px] px-1.5 py-0.5 rounded font-medium border border-slate-200">
                                  Admin
                                </span>
                              )}
                              {personTilgang.isLeader && (
                                <span className="bg-[#eef5f1] text-[#2d5a3f] text-[10px] px-1.5 py-0.5 rounded font-medium border border-[#d2e8d9]">
                                  Tjenestegruppeleder
                                </span>
                              )}
                            </div>
                          </div>
                          {selectedPersonId === person.PersonID && (
                            <Check className="w-4 h-4 text-[#2d5a3f]" />
                          )}
                        </button>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Kopier personlig lenke */}
            <button
              onClick={handleCopyLink}
              title="Kopier direkte personlig lenke"
              className="p-2 text-slate-700 hover:text-[#2d5a3f] hover:bg-[#eef5f1] rounded-xl border border-slate-200 transition cursor-pointer flex items-center gap-1.5 text-xs font-medium"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="hidden md:inline text-emerald-700 font-medium">Lenke kopiert!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  <span className="hidden md:inline">Kopier min lenke</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Hovednavigasjon / Faner etter referansebildet med mørkegrønn aktiv knapp */}
        <nav className="flex space-x-1 border-t border-slate-100 py-2 overflow-x-auto">
          <button
            onClick={() => setActiveView("personal")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition cursor-pointer ${
              activeView === "personal"
                ? "bg-[#2d5a3f] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Min side ({selectedPerson?.Fornavn})</span>
          </button>

          {tilgang.views.includes("leader") && (
          <button
            onClick={() => setActiveView("leader")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition cursor-pointer ${
              activeView === "leader"
                ? "bg-[#2d5a3f] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Tjenestegruppeleder</span>
            {tilgang.isLeader && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  activeView === "leader"
                    ? "bg-[#1e3e2b] text-white"
                    : "bg-[#eef5f1] text-[#2d5a3f] border border-[#d2e8d9]"
                }`}
              >
                Aktiv
              </span>
            )}
          </button>
          )}

          {tilgang.views.includes("admin") && (
          <button
            onClick={() => setActiveView("admin")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition cursor-pointer ${
              activeView === "admin"
                ? "bg-[#2d5a3f] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Administrator</span>
          </button>
          )}
        </nav>
      </div>

      {/* Bekreftelse modal for reset */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Tilbakestill til startdata?
            </h3>
            <p className="text-sm text-slate-600 mb-6">
              Dette vil tilbakestille alle personer, roller, gudstjenester, behov, tildelinger og svar til de opprinnelige eksempeldataene fra prosjektet.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Avbryt
              </button>
              <button
                type="button"
                onClick={() => {
                  onResetData();
                  setShowResetConfirm(false);
                }}
                className="px-4 py-2 text-sm bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-xl shadow-xs transition cursor-pointer"
              >
                Ja, tilbakestill
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
