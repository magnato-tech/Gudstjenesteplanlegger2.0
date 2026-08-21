import React, { useState } from "react";
import {
  DatabaseState,
  DeltakelseStatus,
  finnGrupperForGruppeleder,
  finnMedlemmerIGruppe,
  getEffektivtBehov,
  genererPersonligLenke,
  saveDatabase,
  settDeltakelseForPerson,
  sikreGruppemedlemskap,
} from "../services/dataService";
import { Person, Rolle, Tjenestebehov } from "../types/database";
import { RoleDescriptionModal } from "./RoleDescriptionModal";
import { RolleIkon } from "./RolleIkon";
import {
  GroupLeaderGuide,
  GRUPPELEDER_VEILEDNING_KEY,
} from "./GroupLeaderGuide";
import {
  Users,
  Shield,
  Share2,
  Check,
  AlertCircle,
  UserPlus,
  BookOpen,
  Search,
  X,
  HelpCircle,
} from "lucide-react";

interface GroupLeaderViewProps {
  db: DatabaseState;
  selectedPersonId: string;
  onUpdateDb: (updatedDb: DatabaseState) => void;
  onSelectPerson: (personId: string) => void;
}

function formatDato(dato: string): string {
  const parsed = new Date(`${dato}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return dato;
  return parsed.toLocaleDateString("nb-NO", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export const GroupLeaderView: React.FC<GroupLeaderViewProps> = ({
  db,
  selectedPersonId,
  onUpdateDb,
  onSelectPerson,
}) => {
  const [copiedPersonId, setCopiedPersonId] = useState<string | null>(null);
  const [selectedRolleForModal, setSelectedRolleForModal] = useState<Rolle | null>(null);
  const [assignModal, setAssignModal] = useState<{
    gudstjenesteId: string;
    rolleId: string;
    rolleNavn: string;
    gudstjenesteDato: string;
  } | null>(null);
  const [medlemSok, setMedlemSok] = useState("");
  const [valgtMenighetsmedlem, setValgtMenighetsmedlem] = useState<Person | null>(null);
  const [redigerMin, setRedigerMin] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(() => {
    try {
      return localStorage.getItem(GRUPPELEDER_VEILEDNING_KEY) !== "1";
    } catch {
      return false;
    }
  });

  const lukkVeiledning = () => {
    setGuideOpen(false);
    try {
      localStorage.setItem(GRUPPELEDER_VEILEDNING_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  const person = db.personer.find((p) => p.PersonID === selectedPersonId);

  // Finn grupper som denne personen leder eller er nestleder for
  const lededeGrupper = person
    ? finnGrupperForGruppeleder(db, person.PersonID)
    : [];

  // Alle gruppeledere i systemet for raskt bytte dersom valgt person ikke er leder
  const alleGruppeledere = db.personer.filter((p) =>
    db.grupper.some(
      (g) => g.Aktiv && (g.GruppelederID === p.PersonID || g.NestlederID === p.PersonID)
    )
  );

  const [activeGruppeId, setActiveGruppeId] = useState<string>(
    lededeGrupper[0]?.GruppeID || ""
  );

  // Synkroniser activeGruppeId dersom ledede grupper endres
  React.useEffect(() => {
    if (lededeGrupper.length > 0 && !lededeGrupper.some((g) => g.GruppeID === activeGruppeId)) {
      setActiveGruppeId(lededeGrupper[0].GruppeID);
    }
  }, [lededeGrupper, activeGruppeId]);

  const currentGruppe = db.grupper.find((g) => g.GruppeID === activeGruppeId);

  const handleCopyLink = (targetPersonId: string) => {
    const link = genererPersonligLenke(targetPersonId);
    navigator.clipboard.writeText(link).then(() => {
      setCopiedPersonId(targetPersonId);
      setTimeout(() => setCopiedPersonId(null), 2500);
    });
  };

  const handleAssignPerson = (personId: string) => {
    if (!assignModal) return;
    const updated = settDeltakelseForPerson(
      db,
      personId,
      assignModal.gudstjenesteId,
      assignModal.rolleId,
      "Avventer",
      "Forespurt av gruppeleder"
    );
    onUpdateDb(updated);
    handleCopyLink(personId);
    setAssignModal(null);
  };

  // Hvis personen ikke er registrert som leder for noen grupper:
  if (lededeGrupper.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-xs text-center">
          <Shield className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-slate-900">
            {person?.Navn || "Valgt person"} er ikke registrert som tjenestegruppeleder
          </h2>
          <p className="text-slate-600 text-sm mt-1 max-w-md mx-auto">
            I Gudstjenesteplanlegger 2.0 får gruppeledere tilgang til sin tjenestegruppe, gruppemedlemmer og bemanning for tilknyttede roller.
          </p>

          <div className="mt-6 pt-6 border-t border-slate-100 max-w-lg mx-auto">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-3">
              Velg en tjenestegruppeleder for å teste visningen:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {alleGruppeledere.map((leder) => {
                const gruppenavn = db.grupper
                  .filter((g) => g.GruppelederID === leder.PersonID || g.NestlederID === leder.PersonID)
                  .map((g) => g.Gruppenavn)
                  .join(", ");

                return (
                  <button
                    key={leder.PersonID}
                    type="button"
                    onClick={() => onSelectPerson(leder.PersonID)}
                    className="p-3 text-left bg-[#eef5f1]/70 hover:bg-[#eef5f1] border border-[#d2e8d9] rounded-xl transition cursor-pointer"
                  >
                    <div className="font-bold text-[#1e3e2b] text-sm">{leder.Navn}</div>
                    <div className="text-xs text-[#2d5a3f] mt-0.5 truncate">{gruppenavn}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Gruppens medlemmer (inkl. leder/nestleder hvis de mangler medlemsrad)
  const gruppensMedlemmer = currentGruppe
    ? finnMedlemmerIGruppe(db, currentGruppe.GruppeID)
    : [];
  const oversiktPersoner: Person[] = (() => {
    const byId = new Map<string, Person>();
    for (const m of gruppensMedlemmer) byId.set(m.person.PersonID, m.person);
    if (currentGruppe?.GruppelederID) {
      const leder = db.personer.find((p) => p.PersonID === currentGruppe.GruppelederID);
      if (leder) byId.set(leder.PersonID, leder);
    }
    if (currentGruppe?.NestlederID) {
      const nest = db.personer.find((p) => p.PersonID === currentGruppe.NestlederID);
      if (nest) byId.set(nest.PersonID, nest);
    }
    return Array.from(byId.values());
  })();

  // Roller som tilhører denne gruppen
  const gruppensRoller = currentGruppe
    ? db.roller.filter((r) => r.GruppeID === currentGruppe.GruppeID && r.Aktiv)
    : [];

  const handleSettStatus = (
    personId: string,
    gudstjenesteId: string,
    rolleId: string,
    status: DeltakelseStatus,
    kopierLenke: boolean
  ) => {
    const kommentar =
      status === "Deltar"
        ? "Bekreftet av gruppeleder"
        : status === "Avventer"
          ? "Forespurt av gruppeleder"
          : status === "Avvist"
            ? "Avvist av gruppeleder"
            : undefined;
    const updated = settDeltakelseForPerson(
      db,
      personId,
      gudstjenesteId,
      rolleId,
      status,
      kommentar
    );
    onUpdateDb(updated);
    if (kopierLenke) handleCopyLink(personId);
  };

  const handleLeggTilMedlem = (personId: string) => {
    if (!currentGruppe) return;
    const updatedDb: DatabaseState = {
      ...db,
      gruppemedlemmer: sikreGruppemedlemskap(
        db.gruppemedlemmer,
        currentGruppe.GruppeID,
        personId,
        "Medlem"
      ),
    };
    saveDatabase(updatedDb);
    onUpdateDb(updatedDb);
    setMedlemSok("");
    setValgtMenighetsmedlem(null);
  };

  const handleSettMinBehov = (gudstjenesteId: string, rolleId: string, antall: number) => {
    const now = new Date().toISOString().split("T")[0];
    const verdi = Math.max(0, antall);
    const existingIndex = db.tjenestebehov.findIndex(
      (tb) => tb.GudstjenesteID === gudstjenesteId && tb.RolleID === rolleId
    );
    let tjenestebehov: Tjenestebehov[];
    if (existingIndex >= 0) {
      tjenestebehov = db.tjenestebehov.map((tb, i) =>
        i === existingIndex ? { ...tb, Antall: verdi, Aktiv: true, SistEndret: now } : tb
      );
    } else {
      const maxNr = db.tjenestebehov.reduce((max, tb) => {
        const num = parseInt(tb.TjenestebehovID.replace(/\D/g, ""), 10);
        return !isNaN(num) && num > max ? num : max;
      }, 0);
      tjenestebehov = [
        ...db.tjenestebehov,
        {
          TjenestebehovID: `TB${String(maxNr + 1).padStart(3, "0")}`,
          GudstjenesteID: gudstjenesteId,
          RolleID: rolleId,
          Antall: verdi,
          Aktiv: true,
          OpprettetDato: now,
          SistEndret: now,
        },
      ];
    }
    const updatedDb = { ...db, tjenestebehov };
    saveDatabase(updatedDb);
    onUpdateDb(updatedDb);
  };

  const medlemKandidater = (() => {
    const q = medlemSok.trim().toLowerCase();
    if (!q) return [];
    return db.personer
      .filter((p) => p.Aktiv)
      .filter((p) => !oversiktPersoner.some((m) => m.PersonID === p.PersonID))
      .filter(
        (p) =>
          p.Navn.toLowerCase().includes(q) ||
          (p.Fornavn || "").toLowerCase().includes(q)
      )
      .slice()
      .sort((a, b) => a.Navn.localeCompare(b.Navn, "nb"))
      .slice(0, 8);
  })();

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      {/* Gruppevelger hvis leder har flere grupper */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#2d5a3f] uppercase tracking-wider">
            <Users className="w-4 h-4" />
            <span>Tjenestegruppeleder</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">
            {currentGruppe?.Gruppenavn || "Tjenestegruppe"}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {currentGruppe?.Beskrivelse}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setGuideOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2d5a3f] bg-[#eef5f1] hover:bg-[#dceee3] border border-[#d2e8d9] px-3 py-1.5 rounded-xl cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            Slik gjør du det
          </button>
        {lededeGrupper.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
              Bytt tjenestegruppe:
            </span>
            <select
              value={activeGruppeId}
              onChange={(e) => setActiveGruppeId(e.target.value)}
              className="text-sm font-medium border border-slate-300 rounded-xl px-3 py-2 bg-slate-50 focus:ring-2 focus:ring-[#2d5a3f] focus:outline-hidden"
            >
              {lededeGrupper.map((g) => (
                <option key={g.GruppeID} value={g.GruppeID}>
                  {g.Gruppenavn}
                </option>
              ))}
            </select>
          </div>
        )}
        </div>
        </div>

        <div data-guide="medlemmer">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Gruppemedlemmer
          </h3>
          <div className="relative max-w-md mb-3">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={medlemSok}
              onChange={(e) => setMedlemSok(e.target.value)}
              placeholder="Søk i menigheten..."
              className="w-full text-sm border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-[#2d5a3f]"
            />
            {medlemSok.trim() && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                {medlemKandidater.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-slate-500">Ingen treff i registeret.</div>
                ) : (
                  medlemKandidater.map((p) => (
                    <button
                      key={p.PersonID}
                      type="button"
                      onClick={() => {
                        setValgtMenighetsmedlem(p);
                        setMedlemSok("");
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer"
                    >
                      {p.Navn}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {valgtMenighetsmedlem && (
            <div className="flex flex-wrap items-center gap-2 mb-3 bg-slate-50 border border-slate-200 rounded-xl p-3">
              <span className="text-sm font-semibold text-slate-900 flex-1 min-w-[8rem]">
                {valgtMenighetsmedlem.Navn}
              </span>
              <button
                type="button"
                onClick={() => handleLeggTilMedlem(valgtMenighetsmedlem.PersonID)}
                className="text-xs font-semibold text-white bg-[#2d5a3f] px-3 py-1.5 rounded-lg cursor-pointer"
              >
                Legg til
              </button>
            </div>
          )}

          {oversiktPersoner.length === 0 ? (
            <p className="text-xs text-slate-400">Ingen medlemmer i gruppen ennå.</p>
          ) : (
            <ul className="space-y-1.5" data-guide="del-lenke">
              {oversiktPersoner
                .slice()
                .sort((a, b) => a.Navn.localeCompare(b.Navn, "nb"))
                .map((m) => (
                  <li
                    key={m.PersonID}
                    className="flex items-center justify-between gap-2 px-1 py-1"
                  >
                    <span className="text-sm font-medium text-slate-800">{m.Navn}</span>
                    <button
                      type="button"
                      onClick={() => handleCopyLink(m.PersonID)}
                      className="p-1 text-slate-400 hover:text-[#2d5a3f] cursor-pointer"
                      title="Kopier Min side-lenke"
                    >
                      {copiedPersonId === m.PersonID ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Share2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </div>
      </div>

      <div className="space-y-2" data-guide="gudstjenester">
        <h3 className="text-sm font-bold text-slate-900">Kommende gudstjenester</h3>

        {gruppensRoller.length === 0 ? (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center">
            <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <p className="text-sm text-slate-600">
              Ingen roller er tilknyttet denne tjenestegruppen i dagens register.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {db.gudstjenester
              .filter((g) => g.Dato >= new Date().toISOString().split("T")[0])
              .slice()
              .sort((a, b) => `${a.Dato} ${a.Tid}`.localeCompare(`${b.Dato} ${b.Tid}`))
              .map((gudstjeneste) => {
              const åpneSettOpp = (rolle: Rolle) =>
                setAssignModal({
                  gudstjenesteId: gudstjeneste.GudstjenesteID,
                  rolleId: rolle.RolleID,
                  rolleNavn: rolle.Rollenavn,
                  gudstjenesteDato: gudstjeneste.Dato,
                });

              return (
                <div
                  key={gudstjeneste.GudstjenesteID}
                  className="bg-white rounded-2xl px-4 py-2.5 border border-slate-200 shadow-xs space-y-2"
                >
                  <p className="text-xs sm:text-sm text-slate-700 truncate">
                    <span className="font-semibold text-[#2d5a3f]">
                      {formatDato(gudstjeneste.Dato)}
                      {gudstjeneste.Tid ? ` · kl. ${gudstjeneste.Tid}` : ""}
                    </span>
                    <span className="font-semibold text-slate-900">
                      {" · "}
                      {gudstjeneste.Tema || "Gudstjeneste"}
                    </span>
                    {gudstjeneste.Sted ? (
                      <span className="text-slate-500"> · {gudstjeneste.Sted}</span>
                    ) : null}
                  </p>

                  <div className="space-y-2">
                    {gruppensRoller.map((rolle) => {
                      const minBehov = getEffektivtBehov(
                        gudstjeneste.GudstjenesteID,
                        rolle,
                        db.tjenestebehov
                      );

                      const tildelinger = db.tildelinger.filter(
                        (t) =>
                          t.GudstjenesteID === gudstjeneste.GudstjenesteID &&
                          t.RolleID === rolle.RolleID
                      );

                      const synlige = tildelinger.filter((t) => {
                        const svar = db.svar.find((s) => s.TildelingID === t.TildelingID);
                        return svar?.Svar !== "Avvist";
                      });

                      const antallTildelt = synlige.length;
                      const dekkerMin = antallTildelt >= minBehov;
                      const harLedig = antallTildelt < minBehov;
                      const minNokkel = `${gudstjeneste.GudstjenesteID}:${rolle.RolleID}`;
                      const viserMinFelt = redigerMin === minNokkel;

                      const settOppKnapp = (
                        <button
                          type="button"
                          onClick={() => åpneSettOpp(rolle)}
                          data-guide="sett-opp"
                          className="px-2.5 py-1 bg-[#2d5a3f] hover:bg-[#234731] text-white rounded-md text-xs font-semibold inline-flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          <UserPlus className="w-3 h-3" />
                          <span>Sett opp</span>
                        </button>
                      );

                      return (
                        <div
                          key={rolle.RolleID}
                          className={`px-3 py-2 rounded-xl border ${
                            dekkerMin ? "border-slate-200" : "border-amber-200"
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-2 min-w-0">
                              <RolleIkon rollenavn={rolle.Rollenavn} />
                              <span className="font-bold text-sm text-slate-900">
                                {rolle.Rollenavn}
                              </span>
                              <button
                                type="button"
                                onClick={() => setSelectedRolleForModal(rolle)}
                                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                                title="Instruks"
                              >
                                <BookOpen className="w-3.5 h-3.5" />
                              </button>
                            </span>
                            <div className="flex items-center gap-2">
                              {viserMinFelt && (
                                <label className="text-[11px] text-slate-500 flex items-center gap-1">
                                  Min.
                                  <input
                                    type="number"
                                    min={0}
                                    autoFocus
                                    value={minBehov}
                                    onChange={(e) =>
                                      handleSettMinBehov(
                                        gudstjeneste.GudstjenesteID,
                                        rolle.RolleID,
                                        parseInt(e.target.value, 10) || 0
                                      )
                                    }
                                    onBlur={() => setRedigerMin(null)}
                                    className="w-14 border border-slate-200 rounded-lg px-1.5 py-0.5 text-xs bg-white"
                                  />
                                </label>
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  setRedigerMin(viserMinFelt ? null : minNokkel)
                                }
                                className={`text-[11px] font-bold px-2 py-0.5 rounded-full cursor-pointer ${
                                  dekkerMin
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-amber-100 text-amber-900"
                                }`}
                                title="Endre minimum"
                              >
                                {antallTildelt} / {minBehov}
                              </button>
                              {harLedig ? settOppKnapp : null}
                            </div>
                          </div>

                          {synlige.length > 0 && (
                            <div className="mt-1">
                              {synlige.map((t) => {
                                const p = db.personer.find((pers) => pers.PersonID === t.PersonID);
                                const svar = db.svar.find((s) => s.TildelingID === t.TildelingID);
                                const erBekreftet = svar?.Svar === "Bekreftet";
                                const visningsnavn = p?.Fornavn || p?.Navn || t.PersonID;

                                return (
                                  <div
                                    key={t.TildelingID}
                                    data-guide="status"
                                    className="flex items-center gap-2 py-1 border-t border-slate-100"
                                  >
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleSettStatus(
                                          t.PersonID,
                                          gudstjeneste.GudstjenesteID,
                                          rolle.RolleID,
                                          erBekreftet ? "Avventer" : "Deltar",
                                          false
                                        )
                                      }
                                      className="flex-1 min-w-0 flex items-center justify-between gap-2 text-left cursor-pointer rounded-lg px-1 py-0.5 hover:bg-slate-50"
                                      title={
                                        erBekreftet
                                          ? "Trykk for å sette tilbake til forespurt"
                                          : "Trykk for å bekrefte"
                                      }
                                    >
                                      <span className="text-sm font-medium text-slate-800 truncate">
                                        {visningsnavn}
                                      </span>
                                      <span
                                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                          erBekreftet ? "bg-emerald-500" : "bg-amber-400"
                                        }`}
                                        aria-hidden
                                      />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleSettStatus(
                                          t.PersonID,
                                          gudstjeneste.GudstjenesteID,
                                          rolle.RolleID,
                                          "Deltar ikke",
                                          false
                                        )
                                      }
                                      className="p-1 text-slate-300 hover:text-rose-600 cursor-pointer"
                                      title="Fjern"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal for å tildele medlem */}
      {assignModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-0.5">
              Sett opp {assignModal.rolleNavn}
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              {formatDato(assignModal.gudstjenesteDato)}
            </p>
            {(() => {
              const opptatt = new Set(
                db.tildelinger
                  .filter(
                    (t) =>
                      t.GudstjenesteID === assignModal.gudstjenesteId &&
                      t.RolleID === assignModal.rolleId
                  )
                  .filter((t) => {
                    const svar = db.svar.find((s) => s.TildelingID === t.TildelingID);
                    return svar?.Svar !== "Avvist";
                  })
                  .map((t) => t.PersonID)
              );
              const ledige = oversiktPersoner
                .filter((p) => !opptatt.has(p.PersonID))
                .slice()
                .sort((a, b) =>
                  (a.Fornavn || a.Navn).localeCompare(b.Fornavn || b.Navn, "nb")
                );
              if (ledige.length === 0) {
                return (
                  <p className="text-sm text-slate-500">
                    Alle i gruppen er allerede satt opp denne dagen.
                  </p>
                );
              }
              return (
                <ul className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                  {ledige.map((p) => (
                    <li key={p.PersonID}>
                      <button
                        type="button"
                        onClick={() => handleAssignPerson(p.PersonID)}
                        className="w-full text-left px-4 py-3 text-sm font-medium text-slate-900 hover:bg-[#eef5f1] cursor-pointer"
                      >
                        {p.Fornavn || p.Navn}
                      </button>
                    </li>
                  ))}
                </ul>
              );
            })()}
            <div className="flex justify-end mt-4">
              <button
                type="button"
                onClick={() => setAssignModal(null)}
                className="px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Avbryt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for rollebeskrivelse */}
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
              : currentGruppe || null
          }
          onClose={() => setSelectedRolleForModal(null)}
        />
      )}

      <GroupLeaderGuide open={guideOpen} onClose={lukkVeiledning} />
    </div>
  );
};
