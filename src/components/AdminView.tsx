import React, { useState } from "react";
import {
  DatabaseState,
  UkjentImportSlot,
  finnUkjenteImportnavn,
  finnTjenestegrupperForPerson,
  getEffektivtBehov,
  genererPersonligLenke,
  opprettPersonIRegister,
  saveDatabase,
  hentTilgang,
  AppView,
} from "../services/dataService";
import {
  Rolle,
  Gudstjeneste,
  Tildeling,
  Tjenestebehov,
} from "../types/database";
import { RoleDescriptionModal } from "./RoleDescriptionModal";
import { ImportMigrationModal } from "./ImportMigrationModal";
import { GroupAdminModal } from "./GroupAdminModal";
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
  Star,
  Database,
  Sliders,
  AlertTriangle,
  ChevronDown,
} from "lucide-react";

interface AdminViewProps {
  db: DatabaseState;
  onUpdateDb: (updatedDb: DatabaseState) => void;
  onSelectPerson: (personId: string) => void;
}

const GRUPPEFILTER = [
  { id: "tjenestegruppe", label: "Tjenestegrupper", aliases: ["tjenestegruppe", "tjenestegrupper"], seksjon: null as string | null },
  { id: "husgruppe", label: "Husgruppe", aliases: ["husgruppe"], seksjon: null },
  { id: "lederskap", label: "Lederskap", aliases: ["lederskap", "ledergruppe"], seksjon: "Ledelse" },
  { id: "gruppeledergruppe", label: "Gruppeledergruppe", aliases: ["gruppeledergruppe"], seksjon: "Ledelse" },
  { id: "strategigrupper", label: "Strategigrupper", aliases: ["strategigruppe", "strategigrupper"], seksjon: "Ledelse" },
];

function gruppetypeIderForFilter(db: DatabaseState, filterId: string): string[] {
  const filter = GRUPPEFILTER.find((f) => f.id === filterId);
  if (!filter) return [];
  return db.gruppetyper
    .filter((gt) => filter.aliases.includes(String(gt.Navn || "").trim().toLowerCase()))
    .map((gt) => gt.GruppetypeID);
}

function antallGrupperForFilter(db: DatabaseState, filterId: string): number {
  const ids = gruppetypeIderForFilter(db, filterId);
  if (ids.length === 0) {
    return filterId === "tjenestegruppe" ? db.grupper.length : 0;
  }
  return db.grupper.filter((g) => ids.includes(g.GruppetypeID)).length;
}

export const AdminView: React.FC<AdminViewProps> = ({
  db,
  onUpdateDb,
  onSelectPerson,
}) => {
  const [activeTab, setActiveTab] = useState<"services" | "people" | "groups" | "roles">(
    "services"
  );
  const [groupTypeFilter, setGroupTypeFilter] = useState("tjenestegruppe");
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [editingGruppeId, setEditingGruppeId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGroupFilter, setSelectedGroupFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState<"all" | "leaders" | "admins" | "members">("all");
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
  const [newFornavn, setNewFornavn] = useState("");
  const [newPersonSlots, setNewPersonSlots] = useState<UkjentImportSlot[]>([]);
  const [newPersonGudstjenesteId, setNewPersonGudstjenesteId] = useState("");
  const [newPersonRolleId, setNewPersonRolleId] = useState("");
  const [assignNewFornavn, setAssignNewFornavn] = useState("");

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

  const ukjenteImportnavn = finnUkjenteImportnavn(db);

  const openNewPersonModal = (prefill?: { fornavn?: string; slots?: UkjentImportSlot[] }) => {
    setNewFornavn(prefill?.fornavn || "");
    setNewPersonSlots(prefill?.slots || []);
    setNewPersonGudstjenesteId(prefill?.slots?.[0]?.gudstjenesteId || "");
    setNewPersonRolleId(prefill?.slots?.[0]?.rolleId || "");
    setNewPersonModal(true);
  };

  const handleCopyLink = (personId: string, view?: AppView) => {
    const link = genererPersonligLenke(personId, view);
    navigator.clipboard.writeText(link).then(() => {
      const key = view ? `${personId}-${view}` : personId;
      setCopiedPersonId(key);
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

  const handleSaveNewPerson = () => {
    const fornavn = newFornavn.trim();
    if (!fornavn) return;

    let slots = newPersonSlots;
    if (slots.length === 0 && newPersonGudstjenesteId && newPersonRolleId) {
      const rolle = db.roller.find((r) => r.RolleID === newPersonRolleId);
      const gud = db.gudstjenester.find((g) => g.GudstjenesteID === newPersonGudstjenesteId);
      slots = [
        {
          gudstjenesteId: newPersonGudstjenesteId,
          rolleId: newPersonRolleId,
          rolleNavn: rolle?.Rollenavn || "",
          dato: gud?.Dato || "",
        },
      ];
    }

    const updatedDb = opprettPersonIRegister(db, { Navn: fornavn }, slots);
    saveDatabase(updatedDb);
    onUpdateDb(updatedDb);
    setNewPersonModal(false);
    setNewFornavn("");
    setNewPersonSlots([]);
    setNewPersonGudstjenesteId("");
    setNewPersonRolleId("");
  };

  const handleCreateAndAssign = () => {
    if (!assignModal) return;
    const fornavn = assignNewFornavn.trim();
    if (!fornavn) return;
    const gud = db.gudstjenester.find((g) => g.GudstjenesteID === assignModal.gudstjenesteId);
    const updatedDb = opprettPersonIRegister(db, { Navn: fornavn }, [
      {
        gudstjenesteId: assignModal.gudstjenesteId,
        rolleId: assignModal.rolleId,
        rolleNavn: assignModal.rolleNavn,
        dato: gud?.Dato || "",
      },
    ]);
    saveDatabase(updatedDb);
    onUpdateDb(updatedDb);
    setAssignModal(null);
    setPersonToAssign("");
    setAssignNewFornavn("");
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

  const handleSettRolleGruppe = (rolleId: string, gruppeId: string) => {
    const now = new Date().toISOString().split("T")[0];
    const updatedDb: DatabaseState = {
      ...db,
      roller: db.roller.map((r) =>
        r.RolleID === rolleId
          ? { ...r, GruppeID: gruppeId || undefined, SistEndret: now }
          : r
      ),
    };
    saveDatabase(updatedDb);
    onUpdateDb(updatedDb);
  };

  // Filtrering for personer
  const filteredPersoner = db.personer.filter((p) => {
    const matchesSearch =
      p.Navn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.Epost || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.PersonID.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedGroupFilter !== "all") {
      const tilknyttet = finnTjenestegrupperForPerson(db, p.PersonID).some(
        (t) => t.gruppe.GruppeID === selectedGroupFilter
      );
      if (!tilknyttet) return false;
    }

    if (roleFilter !== "all") {
      const tilgang = hentTilgang(db, p.PersonID);
      if (roleFilter === "leaders" && !tilgang.isLeader) return false;
      if (roleFilter === "admins" && !tilgang.isAdmin) return false;
      if (roleFilter === "members" && (tilgang.isLeader || tilgang.isAdmin)) return false;
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

      {ukjenteImportnavn.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-950">
                Ukjente navn i oppgavefordelingen
              </p>
              <p className="text-xs text-amber-800 mt-0.5">
                Disse står i importen, men ikke i personregisteret. Etternavn tas med hvis det står i tabellen. Opprett og tildel herfra — uten å redigere arket.
              </p>
            </div>
          </div>
          <ul className="space-y-2">
            {ukjenteImportnavn.map((item) => (
              <li
                key={item.navn}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white/70 rounded-xl px-3 py-2 border border-amber-100"
              >
                <div>
                  <div className="text-sm font-semibold text-slate-900">{item.navn}</div>
                  <div className="text-xs text-slate-600">
                    {item.slots
                      .map((s) => `${s.rolleNavn} · ${s.gudstjenesteId}${s.dato ? ` (${s.dato})` : ""}`)
                      .join(" · ")}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openNewPersonModal({ fornavn: item.navn, slots: item.slots })}
                  className="px-3 py-1.5 bg-[#2d5a3f] hover:bg-[#234731] text-white text-xs font-semibold rounded-lg cursor-pointer self-start"
                >
                  Opprett person
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Admin Faner */}
      <div className="flex border-b border-slate-200 space-x-2 overflow-x-auto">
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
          onClick={() => setActiveTab("groups")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 cursor-pointer transition ${
            activeTab === "groups"
              ? "border-[#2d5a3f] text-[#2d5a3f]"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Grupper ({db.grupper.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("roles")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 cursor-pointer transition ${
            activeTab === "roles"
              ? "border-[#2d5a3f] text-[#2d5a3f]"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Roller ({db.roller.length})</span>
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
              onClick={() => openNewPersonModal()}
              className="px-3.5 py-2 bg-[#2d5a3f] hover:bg-[#234731] text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Ny person</span>
            </button>
          </div>

          {/* Søk og filter */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-3.5 rounded-2xl border border-slate-200">
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
                <option value="all">Alle grupper</option>
                {db.grupper.map((g) => (
                  <option key={g.GruppeID} value={g.GruppeID}>
                    {g.Gruppenavn}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as any)}
                className="w-full text-xs border border-slate-200 rounded-xl p-2 bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-[#2d5a3f]"
              >
                <option value="all">Alle tilganger / roller</option>
                <option value="leaders">Kun tjenestegruppeledere</option>
                <option value="admins">Kun administratorer</option>
                <option value="members">Kun ordinære medlemmer</option>
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
                  <th className="p-3">Tilgang & Lederansvar</th>
                  <th className="p-3">Personroller (Godkjente)</th>
                  <th className="p-3">Tjenestegrupper</th>
                  <th className="p-3 text-right">Direktelenker</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredPersoner.map((person) => {
                  const personTilgang = hentTilgang(db, person.PersonID);
                  const isCopiedGeneral = copiedPersonId === person.PersonID;
                  const isCopiedLeader = copiedPersonId === `${person.PersonID}-leader`;
                  const isCopiedPersonal = copiedPersonId === `${person.PersonID}-personal`;

                  const personensRolleIds = db.personroller
                    .filter((pr) => pr.PersonID === person.PersonID && pr.Aktiv)
                    .map((pr) => pr.RolleID);
                  const personensRoller = db.roller.filter((r) =>
                    personensRolleIds.includes(r.RolleID)
                  );

                  const personensGrupper = finnTjenestegrupperForPerson(db, person.PersonID);
                  const lederGrupper = personensGrupper.filter((t) => t.tilknytning === "Leder" || t.tilknytning === "Nestleder");

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
                        <div className="flex flex-col gap-1 items-start">
                          {personTilgang.isAdmin && (
                            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-amber-200">
                              <Shield className="w-3 h-3" />
                              Administrator
                            </span>
                          )}
                          {personTilgang.isLeader && (
                            <span className="inline-flex items-center gap-1 bg-sky-50 text-sky-800 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-sky-200">
                              <Star className="w-3 h-3 fill-sky-500 text-sky-500" />
                              Tjenestegruppeleder
                              {lederGrupper.length > 0 && ` (${lederGrupper.map((g) => g.gruppe.Gruppenavn).join(", ")})`}
                            </span>
                          )}
                          {!personTilgang.isAdmin && !personTilgang.isLeader && (
                            <span className="inline-flex items-center text-slate-500 text-[11px]">
                              Medlem (Min side)
                            </span>
                          )}
                        </div>
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
                          {personensGrupper.map((t) => (
                            <span
                              key={t.gruppe.GruppeID}
                              className="bg-slate-100 text-slate-700 text-[10px] px-1.5 py-0.5 rounded"
                            >
                              {t.gruppe.Gruppenavn}
                              {t.tilknytning !== "Medlem" ? ` (${t.tilknytning})` : ""}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <div className="inline-flex flex-col sm:flex-row items-end sm:items-center justify-end gap-1.5">
                          {personTilgang.isLeader && (
                            <button
                              type="button"
                              onClick={() => handleCopyLink(person.PersonID, "leader")}
                              className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition inline-flex items-center gap-1 cursor-pointer ${
                                isCopiedLeader
                                  ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                                  : "bg-sky-50 hover:bg-sky-100 border-sky-200 text-sky-800"
                              }`}
                              title="Kopier lenke som åpner Tjenestegruppeleder-fanen direkte for denne lederen"
                            >
                              {isCopiedLeader ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span>Lederlenke kopiert!</span>
                                </>
                              ) : (
                                <>
                                  <Star className="w-3 h-3 fill-sky-500 text-sky-500" />
                                  <span>Kopier leder-lenke</span>
                                </>
                              )}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleCopyLink(person.PersonID)}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition inline-flex items-center gap-1 cursor-pointer ${
                              isCopiedGeneral || isCopiedPersonal
                                ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                                : "bg-slate-50 hover:bg-[#eef5f1] border-slate-200 text-slate-700 hover:text-[#2d5a3f]"
                            }`}
                            title="Kopier standard personlig lenke"
                          >
                            {isCopiedGeneral || isCopiedPersonal ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span>Kopiert!</span>
                              </>
                            ) : (
                              <>
                                <Share2 className="w-3 h-3" />
                                <span>Kopier Min side</span>
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FANE 3: GRUPPER */}
      {activeTab === "groups" && (
        <div className="space-y-6">
          {/* Tjenestegruppeledere Oversiktskort */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Star className="w-4 h-4 fill-sky-500 text-sky-500" />
                  <span>Oversikt over Tjenestegruppeledere & Direktelenker</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Her har du full oversikt over hvem som leder hver gruppe. Kopier leder-lenken og send til vedkommende så de får full tilgang til både Min side og Tjenestegruppeleder-fanen.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {db.grupper
                .filter((g) => g.Aktiv)
                .map((gruppe) => {
                  const leder = db.personer.find((p) => p.PersonID === gruppe.GruppelederID);
                  const nestleder = db.personer.find((p) => p.PersonID === gruppe.NestlederID);
                  const isCopiedLeder = leder && copiedPersonId === `${leder.PersonID}-leader`;
                  const isCopiedNestleder = nestleder && copiedPersonId === `${nestleder.PersonID}-leader`;

                  return (
                    <div
                      key={gruppe.GruppeID}
                      className="bg-slate-50/70 border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-sm">
                            {gruppe.Gruppenavn}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                            {gruppe.GruppeID}
                          </span>
                        </div>

                        {/* Gruppeleder */}
                        <div className="bg-white p-2.5 rounded-lg border border-slate-200/90 space-y-1.5">
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1.5 font-semibold text-slate-900 text-xs">
                              <Star className="w-3.5 h-3.5 fill-sky-500 text-sky-500 shrink-0" />
                              <span>{leder ? leder.Navn : "Ingen leder tildelt"}</span>
                            </div>
                            <span className="text-[10px] bg-sky-50 text-sky-700 font-medium px-1.5 py-0.5 rounded border border-sky-200">
                              Leder
                            </span>
                          </div>
                          {leder && (
                            <div className="text-[11px] text-slate-500 truncate">
                              {leder.Epost} {leder.Telefon ? `· ${leder.Telefon}` : ""}
                            </div>
                          )}
                          {leder && (
                            <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100">
                              <button
                                type="button"
                                onClick={() => handleCopyLink(leder.PersonID, "leader")}
                                className={`flex-1 px-2 py-1 text-[11px] font-semibold rounded-md border transition inline-flex items-center justify-center gap-1 cursor-pointer ${
                                  isCopiedLeder
                                    ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                                    : "bg-sky-50 hover:bg-sky-100 border-sky-200 text-sky-800"
                                }`}
                                title="Kopier direktelenke til lederfanen"
                              >
                                {isCopiedLeder ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-600" />
                                    <span>Lederlenke kopiert!</span>
                                  </>
                                ) : (
                                  <>
                                    <Share2 className="w-3 h-3" />
                                    <span>Kopier leder-lenke</span>
                                  </>
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => onSelectPerson(leder.PersonID)}
                                className="px-2 py-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md border border-slate-200 cursor-pointer"
                                title="Se appen som denne lederen"
                              >
                                Se som
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Nestleder */}
                        {nestleder && (
                          <div className="bg-white p-2.5 rounded-lg border border-slate-200/90 space-y-1.5">
                            <div className="flex items-center justify-between gap-1">
                              <div className="flex items-center gap-1.5 font-semibold text-slate-900 text-xs">
                                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                                <span>{nestleder.Navn}</span>
                              </div>
                              <span className="text-[10px] bg-amber-50 text-amber-700 font-medium px-1.5 py-0.5 rounded border border-amber-200">
                                Nestleder
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">
                              {nestleder.Epost} {nestleder.Telefon ? `· ${nestleder.Telefon}` : ""}
                            </div>
                            <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100">
                              <button
                                type="button"
                                onClick={() => handleCopyLink(nestleder.PersonID, "leader")}
                                className={`flex-1 px-2 py-1 text-[11px] font-semibold rounded-md border transition inline-flex items-center justify-center gap-1 cursor-pointer ${
                                  isCopiedNestleder
                                    ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                                    : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                                }`}
                                title="Kopier direktelenke for nestleder"
                              >
                                {isCopiedNestleder ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-600" />
                                    <span>Lederlenke kopiert!</span>
                                  </>
                                ) : (
                                  <>
                                    <Share2 className="w-3 h-3" />
                                    <span>Kopier leder-lenke</span>
                                  </>
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => onSelectPerson(nestleder.PersonID)}
                                className="px-2 py-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md border border-slate-200 cursor-pointer"
                                title="Se appen som denne nestlederen"
                              >
                                Se som
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Gruppeliste */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-[#2d5a3f]" />
              <span>Gruppedetaljer & Medlemmer</span>
            </h3>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={groupTypeFilter}
                onChange={(e) => setGroupTypeFilter(e.target.value)}
                className="text-xs border border-slate-200 rounded-xl p-2 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#2d5a3f] min-w-[220px]"
              >
                {GRUPPEFILTER.filter((f) => !f.seksjon).map((f) => {
                  const n = antallGrupperForFilter(db, f.id);
                  return (
                    <option key={f.id} value={f.id} disabled={n === 0}>
                      {f.label}
                      {n === 0 ? " (ingen ennå)" : ` (${n})`}
                    </option>
                  );
                })}
                <optgroup label="Ledelse">
                  {GRUPPEFILTER.filter((f) => f.seksjon === "Ledelse").map((f) => {
                    const n = antallGrupperForFilter(db, f.id);
                    return (
                      <option key={f.id} value={f.id} disabled={n === 0}>
                        {f.label}
                        {n === 0 ? " (ingen ennå)" : ` (${n})`}
                      </option>
                    );
                  })}
                </optgroup>
              </select>
            </div>
          </div>

          <div className="space-y-3 max-w-3xl">
            {db.grupper
              .filter((gruppe) => {
                const ids = gruppetypeIderForFilter(db, groupTypeFilter);
                if (ids.length === 0 && groupTypeFilter === "tjenestegruppe") return true;
                return ids.includes(gruppe.GruppetypeID);
              })
              .map((gruppe) => {
                const medlemIds = new Set(
                  db.gruppemedlemmer
                    .filter((gm) => gm.GruppeID === gruppe.GruppeID && gm.Aktiv)
                    .map((gm) => gm.PersonID)
                );
                if (gruppe.GruppelederID) medlemIds.add(gruppe.GruppelederID);
                if (gruppe.NestlederID) medlemIds.add(gruppe.NestlederID);
                const medlemsnavn = Array.from(medlemIds)
                  .map((id) => db.personer.find((p) => p.PersonID === id))
                  .filter((p): p is NonNullable<typeof p> => Boolean(p))
                  .sort((a, b) => a.Navn.localeCompare(b.Navn, "nb"));
                const leder = db.personer.find((p) => p.PersonID === gruppe.GruppelederID);
                const nestleder = db.personer.find((p) => p.PersonID === gruppe.NestlederID);
                const typeNavn = db.gruppetyper.find(
                  (gt) => gt.GruppetypeID === gruppe.GruppetypeID
                )?.Navn;
                const apen = expandedGroupId === gruppe.GruppeID;

                return (
                  <div
                    key={gruppe.GruppeID}
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      setExpandedGroupId(apen ? null : gruppe.GruppeID)
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setExpandedGroupId(apen ? null : gruppe.GruppeID);
                      }
                    }}
                    className="w-full text-left bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3 hover:border-[#2d5a3f]/40 cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">
                          {gruppe.Gruppenavn}
                        </h4>
                        {typeNavn && (
                          <div className="text-[11px] text-slate-400">{typeNavn}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingGruppeId(gruppe.GruppeID);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#2d5a3f] bg-[#eef5f1] hover:bg-[#d2e8d9] px-2.5 py-1 rounded-lg cursor-pointer border border-[#d2e8d9]"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Rediger
                        </button>
                        <ChevronDown
                          className={`w-4 h-4 text-slate-400 transition ${apen ? "rotate-180" : ""}`}
                        />
                      </div>
                    </div>

                    {gruppe.Beskrivelse && (
                      <p className="text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-xl p-2.5">
                        {gruppe.Beskrivelse}
                      </p>
                    )}

                    <div className="text-xs space-y-1">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <Star className="w-3.5 h-3.5 fill-sky-500 text-sky-500 shrink-0" />
                        <span className="font-medium">{leder?.Navn || "Ikke satt"}</span>
                        <span className="text-slate-400">Gruppeleder</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                        <span className="font-medium">{nestleder?.Navn || "Ikke satt"}</span>
                        <span className="text-slate-400">Nestleder</span>
                      </div>
                    </div>
                    <div className="text-xs text-slate-400">
                      {medlemsnavn.length} medlemmer
                    </div>

                    {apen && (
                      <ul className="pt-2 border-t border-slate-100 space-y-1">
                        {medlemsnavn.length === 0 && (
                          <li className="text-xs text-slate-400">Ingen medlemmer.</li>
                        )}
                        {medlemsnavn.map((p) => (
                          <li key={p.PersonID} className="text-sm text-slate-700 flex items-center gap-1.5">
                            {gruppe.GruppelederID === p.PersonID && (
                              <Star className="w-3 h-3 fill-sky-500 text-sky-500 shrink-0" />
                            )}
                            {gruppe.NestlederID === p.PersonID && (
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                            )}
                            <span>{p.Navn}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            {db.grupper.filter((gruppe) => {
              const ids = gruppetypeIderForFilter(db, groupTypeFilter);
              if (ids.length === 0 && groupTypeFilter === "tjenestegruppe") return true;
              return ids.includes(gruppe.GruppetypeID);
            }).length === 0 && (
              <p className="text-sm text-slate-500 bg-white border border-dashed border-slate-200 rounded-2xl p-6 text-center">
                Ingen grupper i denne kategorien ennå.
              </p>
            )}
          </div>
        </div>
      )}

      {/* FANE 4: ROLLER */}
      {activeTab === "roles" && (
        <div className="space-y-4 max-w-2xl">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#2d5a3f]" />
            <span>Roller & Standardbehov ({db.roller.length})</span>
          </h3>
          <p className="text-xs text-slate-500">
            Tjenestegruppe på hver rolle styrer hva gruppelederen ser. Endringen lagres i arket (fanen Roller, kolonnen GruppeID).
          </p>

          <div className="space-y-3">
            {db.roller.map((rolle) => {
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

                  <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="font-medium text-slate-600">Tjenestegruppe</label>
                      <select
                        value={rolle.GruppeID || ""}
                        onChange={(e) => handleSettRolleGruppe(rolle.RolleID, e.target.value)}
                        className="border border-slate-200 rounded-xl p-1.5 bg-slate-50 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#2d5a3f]"
                      >
                        <option value="">Ingen</option>
                        {db.grupper
                          .filter((g) => g.Aktiv)
                          .slice()
                          .sort((a, b) => a.Gruppenavn.localeCompare(b.Gruppenavn, "nb"))
                          .map((g) => (
                            <option key={g.GruppeID} value={g.GruppeID}>
                              {g.Gruppenavn}
                            </option>
                          ))}
                      </select>
                      {antallKvalifiserte > 0 && (
                        <span className="text-slate-400"> · {antallKvalifiserte} med personrolle</span>
                      )}
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
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Legg til person
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Fornavn er nok. Etternavn tas med hvis det står i tabellen eller skrives inn.
            </p>

            <div className="space-y-3 mb-6 text-xs">
              <div>
                <label className="font-semibold text-slate-600 block mb-1">
                  Navn
                </label>
                <input
                  type="text"
                  placeholder="F.eks. Magnar eller Pål Brenne"
                  value={newFornavn}
                  onChange={(e) => setNewFornavn(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2 bg-slate-50"
                />
              </div>

              {newPersonSlots.length > 0 ? (
                <div className="bg-[#eef5f1] border border-[#d2e8d9] rounded-xl p-3 text-slate-800">
                  <div className="font-semibold mb-1">Tjeneste som tildeles</div>
                  {newPersonSlots.map((s) => (
                    <div key={`${s.gudstjenesteId}-${s.rolleId}`}>
                      {s.rolleNavn} · {s.gudstjenesteId}
                      {s.dato ? ` · ${s.dato}` : ""}
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div>
                    <label className="font-semibold text-slate-600 block mb-1">
                      Gudstjeneste (valgfritt)
                    </label>
                    <select
                      value={newPersonGudstjenesteId}
                      onChange={(e) => setNewPersonGudstjenesteId(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl p-2 bg-slate-50"
                    >
                      <option value="">Ingen tildeling nå</option>
                      {db.gudstjenester.map((g) => (
                        <option key={g.GudstjenesteID} value={g.GudstjenesteID}>
                          {g.Dato} · {g.Tema}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-600 block mb-1">
                      Tjeneste / rolle (valgfritt)
                    </label>
                    <select
                      value={newPersonRolleId}
                      onChange={(e) => setNewPersonRolleId(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl p-2 bg-slate-50"
                    >
                      <option value="">Velg rolle</option>
                      {db.roller
                        .filter((r) => r.Aktiv)
                        .map((r) => (
                          <option key={r.RolleID} value={r.RolleID}>
                            {r.Rollenavn}
                          </option>
                        ))}
                    </select>
                  </div>
                </>
              )}
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
                disabled={!newFornavn.trim()}
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

            <div className="border-t border-slate-100 pt-3 space-y-2">
              <label className="text-xs font-semibold text-slate-600 block">
                Eller opprett ny person
              </label>
              <input
                type="text"
                placeholder="Fornavn, eller fornavn etternavn"
                value={assignNewFornavn}
                onChange={(e) => setAssignNewFornavn(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-xl p-2.5 bg-slate-50"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setAssignModal(null);
                  setAssignNewFornavn("");
                }}
                className="px-4 py-2 text-xs text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Avbryt
              </button>
              {assignNewFornavn.trim() ? (
                <button
                  type="button"
                  onClick={handleCreateAndAssign}
                  className="px-4 py-2 text-xs bg-[#2d5a3f] hover:bg-[#234731] text-white font-semibold rounded-xl shadow-xs transition cursor-pointer"
                >
                  Opprett og tildel
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!personToAssign}
                  onClick={handleAssignPerson}
                  className="px-4 py-2 text-xs bg-[#2d5a3f] hover:bg-[#234731] disabled:opacity-50 text-white font-semibold rounded-xl shadow-xs transition cursor-pointer"
                >
                  Lagre tildeling
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {editingGruppeId && (
        <GroupAdminModal
          key={editingGruppeId}
          gruppeId={editingGruppeId}
          db={db}
          onUpdateDb={onUpdateDb}
          onClose={() => setEditingGruppeId(null)}
        />
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
