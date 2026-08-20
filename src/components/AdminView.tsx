import React, { useState } from "react";
import {
  DatabaseState,
  getEffektivtBehov,
  genererPersonligLenke,
  saveDatabase,
} from "../services/dataService";
import {
  Person,
  Gruppe,
  Rolle,
  Gudstjeneste,
  Tildeling,
  Tjenestebehov,
  Personrolle,
  Rollebeskrivelse,
} from "../types/database";
import { RoleDescriptionModal } from "./RoleDescriptionModal";
import { ImportMigrationModal } from "./ImportMigrationModal";
import {
  Calendar,
  Users,
  Shield,
  Layers,
  Plus,
  Trash2,
  Edit2,
  Share2,
  Check,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Search,
  Filter,
  BookOpen,
  Database,
  Sliders,
  Sparkles,
} from "lucide-react";

interface AdminViewProps {
  db: DatabaseState;
  onUpdateDb: (updatedDb: DatabaseState) => void;
  onSelectPerson: (personId: string) => void;
}

export const AdminView: React.FC<AdminViewProps> = ({
  db,
  onUpdateDb,
  onSelectPerson,
}) => {
  const [activeTab, setActiveTab] = useState<"services" | "people" | "groups_roles">(
    "services"
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGroupFilter, setSelectedGroupFilter] = useState("all");
  const [copiedPersonId, setCopiedPersonId] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedRolleForModal, setSelectedRolleForModal] = useState<Rolle | null>(null);

  // Modaler for oppretting/redigering
  const [newServiceModal, setNewServiceModal] = useState(false);
  const [newServiceData, setNewServiceData] = useState<Partial<Gudstjeneste>>({
    Dato: "",
    Tid: "11:00",
    Sted: "Hovedsalen, Sentrumskirken",
    Tema: "",
    Bibeltekst: "",
    Kollekt: "",
    Merknad: "",
  });

  const [newPersonModal, setNewPersonModal] = useState(false);
  const [newPersonData, setNewPersonData] = useState<Partial<Person>>({
    Navn: "",
    Fornavn: "",
    Etternavn: "",
    Epost: "",
    Telefon: "",
    Aktiv: true,
  });

  const [editNeedModal, setEditNeedModal] = useState<{
    gudstjenesteId: string;
    rolleId: string;
    currentBehov: number;
    rolleNavn: string;
  } | null>(null);
  const [customNeedInput, setCustomNeedInput] = useState<number>(1);

  const [assignModal, setAssignModal] = useState<{
    gudstjenesteId: string;
    rolleId: string;
    rolleNavn: string;
  } | null>(null);
  const [personToAssign, setPersonToAssign] = useState<string>("");

  const handleCopyLink = (personId: string) => {
    const link = genererPersonligLenke(personId);
    navigator.clipboard.writeText(link).then(() => {
      setCopiedPersonId(personId);
      setTimeout(() => setCopiedPersonId(null), 2500);
    });
  };

  // 1. Opprett Gudstjeneste
  const handleSaveNewService = () => {
    if (!newServiceData.Dato || !newServiceData.Tema) return;

    const maxGudstjenesteNr = db.gudstjenester.reduce((max, g) => {
      const num = parseInt(g.GudstjenesteID.replace(/\D/g, ""), 10);
      return !isNaN(num) && num > max ? num : max;
    }, 0);
    const newID = `GUD${String(maxGudstjenesteNr + 1).padStart(3, "0")}`;

    const newGudstjeneste: Gudstjeneste = {
      GudstjenesteID: newID,
      Dato: newServiceData.Dato,
      Tid: newServiceData.Tid || "11:00",
      Sted: newServiceData.Sted || "Sentrumskirken",
      Tema: newServiceData.Tema,
      Bibeltekst: newServiceData.Bibeltekst || "",
      Kollekt: newServiceData.Kollekt || "",
      Merknad: newServiceData.Merknad || "",
    };

    const updatedDb: DatabaseState = {
      ...db,
      gudstjenester: [...db.gudstjenester, newGudstjeneste],
    };

    saveDatabase(updatedDb);
    onUpdateDb(updatedDb);
    setNewServiceModal(false);
    setNewServiceData({
      Dato: "",
      Tid: "11:00",
      Sted: "Hovedsalen, Sentrumskirken",
      Tema: "",
      Bibeltekst: "",
      Kollekt: "",
      Merknad: "",
    });
  };

  // 2. Opprett Person
  const handleSaveNewPerson = () => {
    if (!newPersonData.Navn || !newPersonData.Epost) return;

    const maxPersonNr = db.personer.reduce((max, p) => {
      const num = parseInt(p.PersonID.replace(/\D/g, ""), 10);
      return !isNaN(num) && num > max ? num : max;
    }, 0);
    const newID = `P${String(maxPersonNr + 1).padStart(3, "0")}`;

    const names = newPersonData.Navn.trim().split(" ");
    const fornavn = names[0] || "";
    const etternavn = names.slice(1).join(" ") || "";
    const now = new Date().toISOString().split("T")[0];

    const newPerson: Person = {
      PersonID: newID,
      Navn: newPersonData.Navn,
      Fornavn: fornavn,
      Etternavn: etternavn,
      Epost: newPersonData.Epost,
      Telefon: newPersonData.Telefon || "",
      Aktiv: true,
      OpprettetDato: now,
      SistEndret: now,
    };

    const updatedDb: DatabaseState = {
      ...db,
      personer: [...db.personer, newPerson],
    };

    saveDatabase(updatedDb);
    onUpdateDb(updatedDb);
    setNewPersonModal(false);
    setNewPersonData({
      Navn: "",
      Fornavn: "",
      Etternavn: "",
      Epost: "",
      Telefon: "",
      Aktiv: true,
    });
  };

  // 3. Overstyr Tjenestebehov
  const handleSaveCustomNeed = () => {
    if (!editNeedModal) return;

    const now = new Date().toISOString().split("T")[0];
    const existingIndex = db.tjenestebehov.findIndex(
      (tb) =>
        tb.GudstjenesteID === editNeedModal.gudstjenesteId &&
        tb.RolleID === editNeedModal.rolleId
    );

    let updatedTjenestebehov: Tjenestebehov[];

    if (existingIndex >= 0) {
      updatedTjenestebehov = [...db.tjenestebehov];
      updatedTjenestebehov[existingIndex] = {
        ...updatedTjenestebehov[existingIndex],
        Antall: customNeedInput,
        Aktiv: true,
        SistEndret: now,
      };
    } else {
      const maxNr = db.tjenestebehov.reduce((max, tb) => {
        const num = parseInt(tb.TjenestebehovID.replace(/\D/g, ""), 10);
        return !isNaN(num) && num > max ? num : max;
      }, 0);
      const newID = `TB${String(maxNr + 1).padStart(3, "0")}`;

      const newTB: Tjenestebehov = {
        TjenestebehovID: newID,
        GudstjenesteID: editNeedModal.gudstjenesteId,
        RolleID: editNeedModal.rolleId,
        Antall: customNeedInput,
        Aktiv: true,
        OpprettetDato: now,
        SistEndret: now,
      };
      updatedTjenestebehov = [...db.tjenestebehov, newTB];
    }

    const updatedDb: DatabaseState = {
      ...db,
      tjenestebehov: updatedTjenestebehov,
    };

    saveDatabase(updatedDb);
    onUpdateDb(updatedDb);
    setEditNeedModal(null);
  };

  // 4. Manuell Tildeling
  const handleAssignPerson = () => {
    if (!assignModal || !personToAssign) return;

    const maxTildelingNr = db.tildelinger.reduce((max, t) => {
      const num = parseInt(t.TildelingID.replace(/\D/g, ""), 10);
      return !isNaN(num) && num > max ? num : max;
    }, 0);
    const newTildelingID = `T${String(maxTildelingNr + 1).padStart(3, "0")}`;

    const now = new Date().toISOString().split("T")[0];
    const nyTildeling: Tildeling = {
      TildelingID: newTildelingID,
      GudstjenesteID: assignModal.gudstjenesteId,
      RolleID: assignModal.rolleId,
      PersonID: personToAssign,
      OpprettetDato: now,
      SistEndret: now,
    };

    const updatedDb: DatabaseState = {
      ...db,
      tildelinger: [...db.tildelinger, nyTildeling],
    };

    saveDatabase(updatedDb);
    onUpdateDb(updatedDb);
    setAssignModal(null);
    setPersonToAssign("");
  };

  // 5. Fjern Tildeling
  const handleRemoveTildeling = (tildelingId: string) => {
    const updatedDb: DatabaseState = {
      ...db,
      tildelinger: db.tildelinger.filter((t) => t.TildelingID !== tildelingId),
      svar: db.svar.filter((s) => s.TildelingID !== tildelingId),
    };

    saveDatabase(updatedDb);
    onUpdateDb(updatedDb);
  };

  // Filtrering for personer
  const filteredPersoner = db.personer.filter((p) => {
    const matchesSearch =
      p.Navn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.Epost.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.PersonID.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedGroupFilter !== "all") {
      const isMember = db.gruppemedlemmer.some(
        (gm) =>
          gm.PersonID === p.PersonID &&
          gm.GruppeID === selectedGroupFilter &&
          gm.Aktiv
      );
      if (!isMember) return false;
    }

    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Topp-overskrift & hurtighandlinger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#2d5a3f] uppercase tracking-wider">
            <Shield className="w-4 h-4" />
            <span>Administratorpanel</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">
            Gudstjenesteplanlegging & Masterdata
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Full tilgang til alle gudstjenester, personer, grupper, roller og kildedata.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            className="px-3.5 py-2 bg-[#eef5f1] hover:bg-[#dff0e6] text-[#2d5a3f] border border-[#d2e8d9] text-xs font-semibold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Database className="w-4 h-4" />
            <span>Kildedata & Migrering</span>
          </button>
        </div>
      </div>

      {/* Admin Faner */}
      <div className="flex border-b border-slate-200 space-x-2">
        <button
          onClick={() => setActiveTab("services")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 cursor-pointer transition ${
            activeTab === "services"
              ? "border-[#2d5a3f] text-[#2d5a3f]"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Gudstjenester & Bemanningsstatus ({db.gudstjenester.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("people")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 cursor-pointer transition ${
            activeTab === "people"
              ? "border-[#2d5a3f] text-[#2d5a3f]"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Personregister ({db.personer.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("groups_roles")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 cursor-pointer transition ${
            activeTab === "groups_roles"
              ? "border-[#2d5a3f] text-[#2d5a3f]"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Tjenestegrupper ({db.grupper.length}) & Roller ({db.roller.length})</span>
        </button>
      </div>

      {/* FANE 1: GUDSTJENESTER & BEMANNINGSMATRISE */}
      {activeTab === "services" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Kommende gudstjenester
              </h3>
              <p className="text-xs text-slate-500">
                Se og juster bemanningsbehov, tildel personer og overvåk svarstatus.
              </p>
            </div>
            <button
              onClick={() => setNewServiceModal(true)}
              className="px-3.5 py-2 bg-[#2d5a3f] hover:bg-[#234731] text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Ny gudstjeneste</span>
            </button>
          </div>

          <div className="space-y-6">
            {db.gudstjenester.map((gudstjeneste) => {
              return (
                <div
                  key={gudstjeneste.GudstjenesteID}
                  className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4"
                >
                  {/* Gudstjeneste Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="bg-[#eef5f1] text-[#2d5a3f] text-xs font-mono font-bold px-2 py-0.5 rounded border border-[#d2e8d9]">
                          {gudstjeneste.GudstjenesteID}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                          {new Date(gudstjeneste.Dato).toLocaleDateString("no-NO", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}{" "}
                          &bull; kl. {gudstjeneste.Tid}
                        </span>
                      </div>
                      <h4 className="text-lg font-bold text-slate-900 mt-1">
                        {gudstjeneste.Tema}
                      </h4>
                      {gudstjeneste.Bibeltekst && (
                        <p className="text-xs text-slate-500">
                          Bibeltekst: {gudstjeneste.Bibeltekst}
                        </p>
                      )}
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      <div>{gudstjeneste.Sted}</div>
                      {gudstjeneste.Kollekt && (
                        <div className="text-[#2d5a3f] font-medium">
                          Kollekt: {gudstjeneste.Kollekt}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Rollegitter */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {db.roller
                      .filter((r) => r.Aktiv)
                      .map((rolle) => {
                        const effektivtBehov = getEffektivtBehov(
                          gudstjeneste.GudstjenesteID,
                          rolle,
                          db.tjenestebehov
                        );

                        const isOverridden = db.tjenestebehov.some(
                          (tb) =>
                            tb.GudstjenesteID === gudstjeneste.GudstjenesteID &&
                            tb.RolleID === rolle.RolleID &&
                            tb.Aktiv
                        );

                        const tildelinger = db.tildelinger.filter(
                          (t) =>
                            t.GudstjenesteID === gudstjeneste.GudstjenesteID &&
                            t.RolleID === rolle.RolleID
                        );

                        const aktiveTildelinger = tildelinger.filter((t) => {
                          const svar = db.svar.find((s) => s.TildelingID === t.TildelingID);
                          return !svar || svar.Svar !== "Avvist";
                        });

                        const antallTildelt = aktiveTildelinger.length;
                        const ledigePlasser = Math.max(0, effektivtBehov - antallTildelt);
                        const erFull = ledigePlasser === 0;

                        return (
                          <div
                            key={rolle.RolleID}
                            className={`p-3.5 rounded-xl border flex flex-col justify-between ${
                              erFull
                                ? "bg-slate-50/60 border-slate-200"
                                : "bg-amber-50/40 border-amber-200"
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-bold text-xs text-slate-900">
                                  {rolle.Rollenavn}
                                </span>
                                <div className="flex items-center gap-1">
                                  <span
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                      erFull
                                        ? "bg-emerald-100 text-emerald-800"
                                        : "bg-amber-100 text-amber-900"
                                    }`}
                                  >
                                    {antallTildelt} / {effektivtBehov}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditNeedModal({
                                        gudstjenesteId: gudstjeneste.GudstjenesteID,
                                        rolleId: rolle.RolleID,
                                        currentBehov: effektivtBehov,
                                        rolleNavn: rolle.Rollenavn,
                                      });
                                      setCustomNeedInput(effektivtBehov);
                                    }}
                                    title="Overstyr rollebehov"
                                    className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-200 cursor-pointer"
                                  >
                                    <Sliders className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>

                              {isOverridden && (
                                <span className="text-[10px] text-[#2d5a3f] bg-[#eef5f1] border border-[#d2e8d9] px-1.5 py-0.5 rounded block mb-2 w-fit">
                                  Overstyrt rollebehov (Std: {rolle.Behov})
                                </span>
                              )}

                              {/* Tildelte personer */}
                              <div className="space-y-1.5 my-2">
                                {tildelinger.length === 0 ? (
                                  <span className="text-xs text-slate-400 italic block">
                                    Ingen tildelt
                                  </span>
                                ) : (
                                  tildelinger.map((t) => {
                                    const p = db.personer.find((pers) => pers.PersonID === t.PersonID);
                                    const svar = db.svar.find((s) => s.TildelingID === t.TildelingID);
                                    const svarStatus = svar?.Svar || "Venter";

                                    return (
                                      <div
                                        key={t.TildelingID}
                                        className="flex items-center justify-between text-xs bg-white p-1.5 rounded-lg border border-slate-200 shadow-2xs"
                                      >
                                        <div className="truncate mr-1.5">
                                          <span className="font-medium text-slate-900 block truncate">
                                            {p?.Navn || t.PersonID}
                                          </span>
                                        </div>

                                        <div className="flex items-center gap-1 shrink-0">
                                          {svarStatus === "Bekreftet" && (
                                            <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                              <CheckCircle2 className="w-3 h-3" />
                                              Bekreftet
                                            </span>
                                          )}
                                          {svarStatus === "Avvist" && (
                                            <span className="text-[10px] text-rose-700 font-bold bg-rose-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                              <XCircle className="w-3 h-3" />
                                              Forfall
                                            </span>
                                          )}
                                          {svarStatus === "Venter" && (
                                            <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                              <HelpCircle className="w-3 h-3" />
                                              Venter
                                            </span>
                                          )}

                                          <button
                                            type="button"
                                            onClick={() => handleRemoveTildeling(t.TildelingID)}
                                            title="Fjern tildeling"
                                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 cursor-pointer ml-1"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            </div>

                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                              <button
                                type="button"
                                onClick={() => setSelectedRolleForModal(rolle)}
                                className="text-[11px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
                              >
                                Instruks
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setAssignModal({
                                    gudstjenesteId: gudstjeneste.GudstjenesteID,
                                    rolleId: rolle.RolleID,
                                    rolleNavn: rolle.Rollenavn,
                                  })
                                }
                                className="px-2 py-1 bg-[#eef5f1] hover:bg-[#dff0e6] text-[#2d5a3f] rounded-md text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition border border-[#d2e8d9]"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Tildel</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* FANE 2: PERSONREGISTER */}
      {activeTab === "people" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Personregister ({filteredPersoner.length})
              </h3>
              <p className="text-xs text-slate-500">
                Administrer personer, tildelte personroller og generer personlige lenker.
              </p>
            </div>

            <button
              onClick={() => setNewPersonModal(true)}
              className="px-3.5 py-2 bg-[#2d5a3f] hover:bg-[#234731] text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Ny person</span>
            </button>
          </div>

          {/* Søk og filter */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3.5 rounded-2xl border border-slate-200">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Søk på navn, e-post eller ID (e.g. P001)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#2d5a3f]"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={selectedGroupFilter}
                onChange={(e) => setSelectedGroupFilter(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-xl p-2 bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-[#2d5a3f]"
              >
                <option value="all">Alle tjenestegrupper</option>
                {db.grupper.map((g) => (
                  <option key={g.GruppeID} value={g.GruppeID}>
                    {g.Gruppenavn}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Persontabell */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-3">ID</th>
                  <th className="p-3">Navn</th>
                  <th className="p-3">Kontaktinfo</th>
                  <th className="p-3">Personroller (Godkjente)</th>
                  <th className="p-3">Tjenestegrupper</th>
                  <th className="p-3 text-right">Personlig lenke</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredPersoner.map((person) => {
                  const isCopied = copiedPersonId === person.PersonID;
                  const personensRolleIds = db.personroller
                    .filter((pr) => pr.PersonID === person.PersonID && pr.Aktiv)
                    .map((pr) => pr.RolleID);
                  const personensRoller = db.roller.filter((r) =>
                    personensRolleIds.includes(r.RolleID)
                  );

                  const personensGrupper = db.gruppemedlemmer
                    .filter((gm) => gm.PersonID === person.PersonID && gm.Aktiv)
                    .map((gm) => db.grupper.find((g) => g.GruppeID === gm.GruppeID))
                    .filter(Boolean);

                  return (
                    <tr key={person.PersonID} className="hover:bg-slate-50/70 transition">
                      <td className="p-3 font-mono font-bold text-[#2d5a3f]">
                        {person.PersonID}
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{person.Navn}</div>
                        {person.Notat && (
                          <div className="text-[11px] text-slate-400 italic">
                            {person.Notat}
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <div>{person.Epost}</div>
                        <div className="text-slate-400">{person.Telefon}</div>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {personensRoller.map((r) => (
                            <span
                              key={r.RolleID}
                              className="bg-[#eef5f1] text-[#2d5a3f] text-[10px] font-medium px-1.5 py-0.5 rounded border border-[#d2e8d9]"
                            >
                              {r.Rollenavn}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {personensGrupper.map((g) => (
                            <span
                              key={g?.GruppeID}
                              className="bg-slate-100 text-slate-700 text-[10px] px-1.5 py-0.5 rounded"
                            >
                              {g?.Gruppenavn}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleCopyLink(person.PersonID)}
                          className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition inline-flex items-center gap-1 cursor-pointer ${
                            isCopied
                              ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                              : "bg-slate-50 hover:bg-[#eef5f1] border-slate-200 text-slate-700 hover:text-[#2d5a3f]"
                          }`}
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>Kopiert</span>
                            </>
                          ) : (
                            <>
                              <Share2 className="w-3 h-3" />
                              <span>Kopier lenke</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FANE 3: TJENESTEGRUPPER & ROLLER */}
      {activeTab === "groups_roles" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tjenestegrupper */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              <span>Tjenestegrupper ({db.grupper.length})</span>
            </h3>

            <div className="space-y-3">
              {db.grupper.map((gruppe) => {
                const leder = db.personer.find((p) => p.PersonID === gruppe.GruppelederID);
                const medlemmer = db.gruppemedlemmer.filter(
                  (gm) => gm.GruppeID === gruppe.GruppeID && gm.Aktiv
                );

                return (
                  <div
                    key={gruppe.GruppeID}
                    className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-900 text-sm">
                        {gruppe.Gruppenavn}
                      </h4>
                      <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                        {gruppe.GruppeID}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{gruppe.Beskrivelse}</p>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                      <div>
                        Leder:{" "}
                        <span className="font-medium text-slate-900">
                          {leder?.Navn || "Ikke oppgitt"}
                        </span>
                      </div>
                      <div className="text-slate-400">
                        {medlemmer.length} aktive medlemmer
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Roller */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#2d5a3f]" />
              <span>Roller & Standardbehov ({db.roller.length})</span>
            </h3>

            <div className="space-y-3">
              {db.roller.map((rolle) => {
                const gruppe = db.grupper.find((g) => g.GruppeID === rolle.GruppeID);
                const antallKvalifiserte = db.personroller.filter(
                  (pr) => pr.RolleID === rolle.RolleID && pr.Aktiv
                ).length;

                return (
                  <div
                    key={rolle.RolleID}
                    className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-900 text-sm">
                        {rolle.Rollenavn}
                      </h4>
                      <span className="text-xs font-mono bg-[#eef5f1] text-[#2d5a3f] px-2 py-0.5 rounded font-bold border border-[#d2e8d9]">
                        {rolle.RolleID}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{rolle.Beskrivelse}</p>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                      <div>
                        Tjenestegruppe:{" "}
                        <span className="font-medium text-slate-900">
                          {gruppe?.Gruppenavn || "Ingen"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-500">
                          Std. behov: <strong>{rolle.Behov}</strong>
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedRolleForModal(rolle)}
                          className="text-[#2d5a3f] hover:underline font-medium cursor-pointer"
                        >
                          Se instruks
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Ny Gudstjeneste */}
      {newServiceModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-3">
              Opprett ny gudstjeneste
            </h3>

            <div className="space-y-3 mb-6 text-xs">
              <div>
                <label className="font-semibold text-slate-600 block mb-1">
                  Dato (YYYY-MM-DD)*:
                </label>
                <input
                  type="date"
                  value={newServiceData.Dato}
                  onChange={(e) =>
                    setNewServiceData((prev) => ({ ...prev, Dato: e.target.value }))
                  }
                  className="w-full border border-slate-300 rounded-xl p-2 bg-slate-50"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">
                  Tema / Tittel*:
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bønn og faste"
                  value={newServiceData.Tema}
                  onChange={(e) =>
                    setNewServiceData((prev) => ({ ...prev, Tema: e.target.value }))
                  }
                  className="w-full border border-slate-300 rounded-xl p-2 bg-slate-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">
                    Klokkeslett:
                  </label>
                  <input
                    type="text"
                    value={newServiceData.Tid}
                    onChange={(e) =>
                      setNewServiceData((prev) => ({ ...prev, Tid: e.target.value }))
                    }
                    className="w-full border border-slate-300 rounded-xl p-2 bg-slate-50"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">
                    Sted:
                  </label>
                  <input
                    type="text"
                    value={newServiceData.Sted}
                    onChange={(e) =>
                      setNewServiceData((prev) => ({ ...prev, Sted: e.target.value }))
                    }
                    className="w-full border border-slate-300 rounded-xl p-2 bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">
                  Bibeltekst:
                </label>
                <input
                  type="text"
                  placeholder="e.g. Johannes 3:16"
                  value={newServiceData.Bibeltekst}
                  onChange={(e) =>
                    setNewServiceData((prev) => ({ ...prev, Bibeltekst: e.target.value }))
                  }
                  className="w-full border border-slate-300 rounded-xl p-2 bg-slate-50"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setNewServiceModal(false)}
                className="px-4 py-2 text-xs text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Avbryt
              </button>
              <button
                type="button"
                disabled={!newServiceData.Dato || !newServiceData.Tema}
                onClick={handleSaveNewService}
                className="px-4 py-2 text-xs bg-[#2d5a3f] hover:bg-[#234731] disabled:opacity-50 text-white font-semibold rounded-xl shadow-xs transition cursor-pointer"
              >
                Opprett gudstjeneste
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Ny Person */}
      {newPersonModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-3">
              Legg til ny person
            </h3>

            <div className="space-y-3 mb-6 text-xs">
              <div>
                <label className="font-semibold text-slate-600 block mb-1">
                  Fullt navn*:
                </label>
                <input
                  type="text"
                  placeholder="Fornavn Etternavn"
                  value={newPersonData.Navn}
                  onChange={(e) =>
                    setNewPersonData((prev) => ({ ...prev, Navn: e.target.value }))
                  }
                  className="w-full border border-slate-300 rounded-xl p-2 bg-slate-50"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">
                  E-postadresse*:
                </label>
                <input
                  type="email"
                  placeholder="navn@example.com"
                  value={newPersonData.Epost}
                  onChange={(e) =>
                    setNewPersonData((prev) => ({ ...prev, Epost: e.target.value }))
                  }
                  className="w-full border border-slate-300 rounded-xl p-2 bg-slate-50"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">
                  Telefonnummer:
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 912 34 567"
                  value={newPersonData.Telefon}
                  onChange={(e) =>
                    setNewPersonData((prev) => ({ ...prev, Telefon: e.target.value }))
                  }
                  className="w-full border border-slate-300 rounded-xl p-2 bg-slate-50"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setNewPersonModal(false)}
                className="px-4 py-2 text-xs text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Avbryt
              </button>
              <button
                type="button"
                disabled={!newPersonData.Navn || !newPersonData.Epost}
                onClick={handleSaveNewPerson}
                className="px-4 py-2 text-xs bg-[#2d5a3f] hover:bg-[#234731] disabled:opacity-50 text-white font-semibold rounded-xl shadow-xs transition cursor-pointer"
              >
                Lagre person
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Overstyr Behov */}
      {editNeedModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Juster rollebehov
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Rolle: {editNeedModal.rolleNavn} for gudstjeneste {editNeedModal.gudstjenesteId}
            </p>

            <div className="space-y-3 mb-6">
              <label className="text-xs font-semibold text-slate-600 block">
                Antall personer som trengs:
              </label>
              <input
                type="number"
                min="0"
                max="20"
                value={customNeedInput}
                onChange={(e) => setCustomNeedInput(parseInt(e.target.value, 10) || 0)}
                className="w-full text-base font-bold border border-slate-300 rounded-xl p-2.5 bg-slate-50 text-center"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditNeedModal(null)}
                className="px-4 py-2 text-xs text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Avbryt
              </button>
              <button
                type="button"
                onClick={handleSaveCustomNeed}
                className="px-4 py-2 text-xs bg-[#2d5a3f] hover:bg-[#234731] text-white font-semibold rounded-xl shadow-xs transition cursor-pointer"
              >
                Lagre behov
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Tildel person */}
      {assignModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Tildel person til {assignModal.rolleNavn}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Gudstjeneste: {assignModal.gudstjenesteId}
            </p>

            <div className="space-y-3 mb-6">
              <label className="text-xs font-semibold text-slate-600 block">
                Velg person fra registeret:
              </label>
              <select
                value={personToAssign}
                onChange={(e) => setPersonToAssign(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-xl p-2.5 bg-slate-50 focus:ring-2 focus:ring-[#2d5a3f] focus:outline-hidden"
              >
                <option value="">-- Velg person --</option>
                <optgroup label="Personer med denne rollen godkjent">
                  {db.personer
                    .filter((p) =>
                      db.personroller.some(
                        (pr) =>
                          pr.PersonID === p.PersonID &&
                          pr.RolleID === assignModal.rolleId &&
                          pr.Aktiv
                      )
                    )
                    .map((p) => (
                      <option key={p.PersonID} value={p.PersonID}>
                        {p.Navn} ({p.PersonID})
                      </option>
                    ))}
                </optgroup>
                <optgroup label="Øvrige personer i registeret">
                  {db.personer
                    .filter(
                      (p) =>
                        !db.personroller.some(
                          (pr) =>
                            pr.PersonID === p.PersonID &&
                            pr.RolleID === assignModal.rolleId &&
                            pr.Aktiv
                        )
                    )
                    .map((p) => (
                      <option key={p.PersonID} value={p.PersonID}>
                        {p.Navn} ({p.PersonID})
                      </option>
                    ))}
                </optgroup>
              </select>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAssignModal(null)}
                className="px-4 py-2 text-xs text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Avbryt
              </button>
              <button
                type="button"
                disabled={!personToAssign}
                onClick={handleAssignPerson}
                className="px-4 py-2 text-xs bg-[#2d5a3f] hover:bg-[#234731] disabled:opacity-50 text-white font-semibold rounded-xl shadow-xs transition cursor-pointer"
              >
                Lagre tildeling
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Rollebeskrivelse */}
      {selectedRolleForModal && (
        <RoleDescriptionModal
          rolle={selectedRolleForModal}
          rollebeskrivelse={
            db.rollebeskrivelser.find(
              (rb) => rb.RolleID === selectedRolleForModal.RolleID
            ) || null
          }
          gruppe={
            selectedRolleForModal.GruppeID
              ? db.grupper.find((g) => g.GruppeID === selectedRolleForModal.GruppeID) || null
              : null
          }
          onClose={() => setSelectedRolleForModal(null)}
        />
      )}

      {/* MODAL: Kildedata & Migrering */}
      {showImportModal && (
        <ImportMigrationModal
          db={db}
          onClose={() => setShowImportModal(false)}
          onUpdateDb={onUpdateDb}
        />
      )}
    </div>
  );
};
