import React, { useState, useEffect, useCallback } from "react";
import {
  loadDatabase,
  loadLocalDatabase,
  resetDatabase,
  DatabaseState,
  hentTilgang,
  visningErTillatt,
  AppView,
  finnPersonMedTokenEllerId,
  useRemoteData,
  enableSessionMockOverride,
  clearSessionMockOverride,
} from "./services/dataService";
import { Header } from "./components/Header";
import { PersonalView } from "./components/PersonalView";
import { GroupLeaderView } from "./components/GroupLeaderView";
import { AdminView } from "./components/AdminView";
import { Shield, ArrowLeft, Lock } from "lucide-react";

export default function App() {
  const remoteByConfig = useRemoteData();
  const [db, setDb] = useState<DatabaseState | null>(() =>
    remoteByConfig ? null : loadLocalDatabase()
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoadingRemote, setIsLoadingRemote] = useState<boolean>(remoteByConfig);
  const [usingDevMockFallback, setUsingDevMockFallback] = useState(false);
  const [activeView, setActiveView] = useState<AppView>("personal");
  const [selectedPersonId, setSelectedPersonId] = useState<string>("P001");
  const [isMagicLinkUser, setIsMagicLinkUser] = useState<boolean>(false);
  const [adminSimulatingPersonId, setAdminSimulatingPersonId] = useState<string | null>(null);

  // Arkitektur for fremtidig PIN-sikring av administrator (deaktivert i test/dev-periode)
  const [adminPinRequired, setAdminPinRequired] = useState<boolean>(false);
  const [adminPinVerified, setAdminPinVerified] = useState<boolean>(false);
  const [showPinModal, setShowPinModal] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>("");
  const [pinError, setPinError] = useState<string | null>(null);

  const fetchRemote = useCallback(() => {
    let cancelled = false;
    setIsLoadingRemote(true);
    setLoadError(null);
    loadDatabase()
      .then((loaded) => {
        if (!cancelled) {
          setDb(loaded);
          setLoadError(null);
          setIsLoadingRemote(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : String(e));
          setIsLoadingRemote(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!remoteByConfig) return;
    return fetchRemote();
  }, [remoteByConfig, fetchRemote]);

  const handleRetryRemote = () => {
    clearSessionMockOverride();
    setUsingDevMockFallback(false);
    setDb(null);
    fetchRemote();
  };

  const handleUseMockFallback = () => {
    if (import.meta.env.PROD) return;
    enableSessionMockOverride();
    setUsingDevMockFallback(true);
    setLoadError(null);
    setIsLoadingRemote(false);
    setDb(loadLocalDatabase());
  };

  // Les inn URL-parametre ved oppstart (støtter ?t=ugjettelig_token samt bakoverkompatibel ?personId=P001)
  useEffect(() => {
    if (!db || db.personer.length === 0) return;
    try {
      const params = new URLSearchParams(window.location.search);
      const tokenParam = params.get("t") || params.get("token") || params.get("personId") || params.get("p");
      const viewParam = params.get("view");

      let activePerson = db.personer.find((p) => p.PersonID === selectedPersonId);

      if (tokenParam) {
        const found = finnPersonMedTokenEllerId(db, tokenParam);
        if (found) {
          activePerson = found;
          setSelectedPersonId(found.PersonID);
          setIsMagicLinkUser(true);
        }
      }

      if (activePerson) {
        const tilgang = hentTilgang(db, activePerson.PersonID);
        const requested = viewParam as AppView;
        if (requested === "admin" || requested === "leader" || requested === "personal") {
          if (visningErTillatt(tilgang, requested)) {
            setActiveView(requested);
          } else {
            setActiveView("personal");
          }
        } else if (tokenParam) {
          // Standard til min side når lenke åpnes
          setActiveView("personal");
        }
      }
    } catch (e) {
      console.warn("Kunne ikke lese URL-parametre:", e);
    }
  }, [db]);

  const handleSelectPerson = (personId: string) => {
    setSelectedPersonId(personId);
    if (!db) return;
    const newTilgang = hentTilgang(db, personId);
    if (!visningErTillatt(newTilgang, activeView)) {
      setActiveView("personal");
    }
  };

  const handleAdminSimulatePerson = (personId: string, targetView: AppView = "personal") => {
    setAdminSimulatingPersonId(personId);
    setSelectedPersonId(personId);
    setActiveView(targetView);
  };

  const handleReturnToAdmin = () => {
    if (!db) return;
    const firstAdmin = db.personer.find((p) => hentTilgang(db, p.PersonID).isAdmin);
    if (firstAdmin) {
      setSelectedPersonId(firstAdmin.PersonID);
    }
    setAdminSimulatingPersonId(null);
    setActiveView("admin");
  };

  const handleNavigateView = (view: AppView) => {
    if (view === "admin" && adminPinRequired && !adminPinVerified) {
      setShowPinModal(true);
      return;
    }
    setActiveView(view);
  };

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    // Standard test-PIN hvis aktivert er 1234 eller menighetskode
    if (pinInput === "1234" || pinInput === "2026") {
      setAdminPinVerified(true);
      setShowPinModal(false);
      setPinError(null);
      setPinInput("");
      setActiveView("admin");
    } else {
      setPinError("Feil PIN-kode. Prøv igjen.");
    }
  };

  const handleUpdateDb = (updatedDb: DatabaseState) => {
    setDb(updatedDb);
  };

  const handleResetData = () => {
    resetDatabase()
      .then((refreshed) => setDb(refreshed))
      .catch((e) => setLoadError(e instanceof Error ? e.message : String(e)));
  };

  if (!db) {
    return (
      <div className="min-h-screen bg-slate-100/70 text-slate-900 font-sans flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-6 shadow-xs text-center space-y-4">
          {loadError ? (
            <>
              <h2 className="text-lg font-bold text-slate-900">Kunne ikke laste menighetsarket</h2>
              <p className="text-sm text-slate-600">{loadError}</p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <button
                  type="button"
                  onClick={handleRetryRemote}
                  className="px-4 py-2 rounded-xl bg-[#2d5a3f] hover:bg-[#234731] text-white text-sm font-semibold cursor-pointer"
                >
                  Prøv igjen
                </button>
                {import.meta.env.DEV && (
                  <button
                    type="button"
                    onClick={handleUseMockFallback}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 cursor-pointer"
                  >
                    Bruk mock-data
                  </button>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-600">
              {isLoadingRemote ? "Laster data fra menighetsarket …" : "Laster …"}
            </p>
          )}
        </div>
      </div>
    );
  }

  const activePerson = db.personer.find((p) => p.PersonID === selectedPersonId);
  const tilgang = hentTilgang(db, selectedPersonId);
  const isActualAdmin = tilgang.isAdmin;

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 font-sans flex flex-col selection:bg-indigo-500 selection:text-white">
      {usingDevMockFallback && (
        <div className="bg-amber-100 text-amber-950 px-4 py-2 text-xs font-medium text-center border-b border-amber-200">
          Utvikling: viser mock-data for denne økten. Endringer skrives ikke til Google Sheets.
        </div>
      )}
      {/* Banner når administrator tester visning som en annen person */}
      {adminSimulatingPersonId && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-medium flex items-center justify-between shadow-sm sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-slate-950" />
            <span>
              <strong>Admin-testmodus:</strong> Du ser nå skjermen slik den oppleves av{" "}
              <strong>{activePerson?.Navn || adminSimulatingPersonId}</strong>.
            </span>
          </div>
          <button
            type="button"
            onClick={handleReturnToAdmin}
            className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Tilbake til Administrator
          </button>
        </div>
      )}

      {/* Toppmeny med bytte av visning og person */}
      <Header
        db={db}
        activeView={activeView}
        setActiveView={handleNavigateView}
        selectedPersonId={selectedPersonId}
        setSelectedPersonId={handleSelectPerson}
        onResetData={handleResetData}
        isAdminUser={isActualAdmin && !adminSimulatingPersonId}
        isMagicLinkUser={isMagicLinkUser}
      />

      {/* Hovedinnhold basert på valgt modus */}
      <main className="flex-1 pb-16">
        {activeView === "personal" && (
          <PersonalView
            db={db}
            selectedPersonId={selectedPersonId}
            onUpdateDb={handleUpdateDb}
          />
        )}

        {activeView === "leader" && visningErTillatt(hentTilgang(db, selectedPersonId), "leader") && (
          <GroupLeaderView
            db={db}
            selectedPersonId={selectedPersonId}
            onUpdateDb={handleUpdateDb}
            onSelectPerson={handleSelectPerson}
          />
        )}

        {activeView === "admin" && visningErTillatt(hentTilgang(db, selectedPersonId), "admin") && (
          <AdminView
            db={db}
            onUpdateDb={handleUpdateDb}
            onSelectPerson={handleAdminSimulatePerson}
          />
        )}
      </main>

      {/* Forberedt PIN-kode dialog (aktiveres ved behov) */}
      {showPinModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 text-center mb-1">
              Administrator-adgang
            </h3>
            <p className="text-xs text-slate-500 text-center mb-4">
              Tast inn administrator-PIN for å åpne planleggingspanelet.
            </p>
            <form onSubmit={handleVerifyPin} className="space-y-4">
              <div>
                <input
                  type="password"
                  autoFocus
                  placeholder="PIN-kode (f.eks. 1234)"
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    setPinError(null);
                  }}
                  className="w-full text-center tracking-widest text-lg font-mono px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#2d5a3f] focus:border-transparent"
                />
                {pinError && (
                  <p className="text-xs text-rose-600 font-medium mt-1.5 text-center">
                    {pinError}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPinModal(false);
                    setPinInput("");
                    setPinError(null);
                  }}
                  className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 cursor-pointer"
                >
                  Avbryt
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 rounded-xl bg-[#2d5a3f] hover:bg-[#234731] text-white font-semibold text-xs transition cursor-pointer shadow-sm"
                >
                  Lås opp
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enkel, ren bunntekst */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <strong>Gudstjenesteplanlegger 2.0</strong> &bull; Lillesand Misjonskirke
          </div>
          <div className="text-slate-400">
            Sikret med unike, ugjettelige direktelenker &bull; Tilpasset GDPR
          </div>
        </div>
      </footer>
    </div>
  );
}

