import React, { useState, useEffect } from "react";
import { loadDatabase, resetDatabase, DatabaseState } from "./services/dataService";
import { Header } from "./components/Header";
import { PersonalView } from "./components/PersonalView";
import { GroupLeaderView } from "./components/GroupLeaderView";
import { AdminView } from "./components/AdminView";

export default function App() {
  const [db, setDb] = useState<DatabaseState>(() => loadDatabase());
  const [activeView, setActiveView] = useState<"personal" | "leader" | "admin">("personal");
  const [selectedPersonId, setSelectedPersonId] = useState<string>("P001");

  // Les inn URL-parametre ved oppstart (f.eks. ?personId=P002 eller ?view=admin)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const personIdParam = params.get("personId");
      const viewParam = params.get("view");

      if (personIdParam && db.personer.some((p) => p.PersonID === personIdParam)) {
        setSelectedPersonId(personIdParam);
        setActiveView("personal");
      }

      if (viewParam === "admin" || viewParam === "leader" || viewParam === "personal") {
        setActiveView(viewParam);
      }
    } catch (e) {
      console.warn("Kunne ikke lese URL-parametre:", e);
    }
  }, [db.personer]);

  const handleUpdateDb = (updatedDb: DatabaseState) => {
    setDb(updatedDb);
  };

  const handleResetData = () => {
    const refreshed = resetDatabase();
    setDb(refreshed);
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 font-sans flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Toppmeny med bytte av visning og person */}
      <Header
        db={db}
        activeView={activeView}
        setActiveView={setActiveView}
        selectedPersonId={selectedPersonId}
        setSelectedPersonId={setSelectedPersonId}
        onResetData={handleResetData}
      />

      {/* Hovedinnhold basert på valgt modus */}
      <main className="flex-1 pb-16">
        {activeView === "personal" && (
          <PersonalView
            db={db}
            selectedPersonId={selectedPersonId}
            onUpdateDb={handleUpdateDb}
            onSelectPerson={(personId) => setSelectedPersonId(personId)}
          />
        )}

        {activeView === "leader" && (
          <GroupLeaderView
            db={db}
            selectedPersonId={selectedPersonId}
            onUpdateDb={handleUpdateDb}
            onSelectPerson={(personId) => setSelectedPersonId(personId)}
          />
        )}

        {activeView === "admin" && (
          <AdminView
            db={db}
            onUpdateDb={handleUpdateDb}
            onSelectPerson={(personId) => setSelectedPersonId(personId)}
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

