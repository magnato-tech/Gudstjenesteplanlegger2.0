import React, { useState, useEffect } from "react";
import { loadDatabase, loadLocalDatabase, resetDatabase, DatabaseState, hentTilgang, visningErTillatt, AppView } from "./services/dataService";
import { Header } from "./components/Header";
import { PersonalView } from "./components/PersonalView";
import { GroupLeaderView } from "./components/GroupLeaderView";
import { AdminView } from "./components/AdminView";

export default function App() {
  // Start umiddelbart med lokal/initial database så skjermen rendres momentant
  const [db, setDb] = useState<DatabaseState>(() => loadLocalDatabase());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<AppView>("personal");
  const [selectedPersonId, setSelectedPersonId] = useState<string>("P001");

  useEffect(() => {
    let cancelled = false;
    loadDatabase()
      .then((loaded) => {
        if (!cancelled) {
          setDb(loaded);
          setLoadError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : String(e));
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Les inn URL-parametre ved oppstart (f.eks. ?personId=P002 eller ?view=admin)
  useEffect(() => {
    if (!db) return;
    try {
      const params = new URLSearchParams(window.location.search);
      const personIdParam = params.get("personId");
      const viewParam = params.get("view");

      let personId = selectedPersonId;
      if (personIdParam && db.personer.some((p) => p.PersonID === personIdParam)) {
        personId = personIdParam;
        setSelectedPersonId(personIdParam);
      }

      const tilgang = hentTilgang(db, personId);
      const requested = viewParam as AppView;
      if (requested === "admin" || requested === "leader" || requested === "personal") {
        setActiveView(visningErTillatt(tilgang, requested) ? requested : "personal");
      } else if (personIdParam) {
        setActiveView("personal");
      }
    } catch (e) {
      console.warn("Kunne ikke lese URL-parametre:", e);
    }
  }, [db]);

  useEffect(() => {
    if (!db) return;
    const tilgang = hentTilgang(db, selectedPersonId);
    if (!visningErTillatt(tilgang, activeView)) {
      setActiveView("personal");
    }
  }, [db, selectedPersonId]);

  const handleSelectPerson = (personId: string) => {
    setSelectedPersonId(personId);
    if (!db) return;
    const tilgang = hentTilgang(db, personId);
    if (!visningErTillatt(tilgang, activeView)) {
      setActiveView("personal");
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
      <div className="min-h-screen bg-slate-100/70 text-slate-900 font-sans flex items-center justify-center">
        <p className="text-sm text-slate-600">
          {loadError ? `Kunne ikke laste data: ${loadError}` : "Laster data fra menighetsarket …"}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 font-sans flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Toppmeny med bytte av visning og person */}
      <Header
        db={db}
        activeView={activeView}
        setActiveView={setActiveView}
        selectedPersonId={selectedPersonId}
        setSelectedPersonId={handleSelectPerson}
        onResetData={handleResetData}
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
            onSelectPerson={handleSelectPerson}
          />
        )}
      </main>

      {/* Enkel, ren bunntekst */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <strong>Gudstjenesteplanlegger 2.0</strong> &bull; Basert på autoritativ relasjonell datamodell
          </div>
          <div className="text-slate-400">
            Klar for integrasjon mot Google Apps Script / Google Sheets backend
          </div>
        </div>
      </footer>
    </div>
  );
}

