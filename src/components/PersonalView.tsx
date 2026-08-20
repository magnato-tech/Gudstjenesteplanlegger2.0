import React, { useState } from "react";
import {
  DatabaseState,
  getEffektivtBehov,
  svarPaaTildeling,
  velgDatoForPerson,
} from "../services/dataService";
import { Rolle, SvarStatus } from "../types/database";
import { RoleDescriptionModal } from "./RoleDescriptionModal";
import { RolleIkon } from "./RolleIkon";
import {
  MapPin,
  CheckCircle2,
  Clock3,
  Check,
  X,
  Plus,
  Info,
} from "lucide-react";

interface PersonalViewProps {
  db: DatabaseState;
  selectedPersonId: string;
  onUpdateDb: (updatedDb: DatabaseState) => void;
}

type PåmeldingsFilter = "ledige" | "mine" | "alle";
type PåmeldingsStatus = "ledig" | "min-venter" | "min-bekreftet" | "full";

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

function byggPåmeldingsrader(
  db: DatabaseState,
  personId: string,
  rolle: Rolle
) {
  return db.gudstjenester
    .slice()
    .sort((a, b) => `${a.Dato} ${a.Tid}`.localeCompare(`${b.Dato} ${b.Tid}`))
    .map((g) => {
      const tildelinger = db.tildelinger.filter(
        (t) => t.GudstjenesteID === g.GudstjenesteID && t.RolleID === rolle.RolleID
      );
      const personerPå = tildelinger
        .map((t) => {
          const svar = db.svar.find((s) => s.TildelingID === t.TildelingID);
          const status = (svar?.Svar || "Venter") as SvarStatus;
          if (status === "Avvist") return null;
          const p = db.personer.find((pers) => pers.PersonID === t.PersonID);
          return {
            personId: t.PersonID,
            navn: p?.Fornavn || p?.Navn || t.PersonID,
            status,
          };
        })
        .filter((x): x is { personId: string; navn: string; status: SvarStatus } => x !== null);

      const behov = getEffektivtBehov(g.GudstjenesteID, rolle, db.tjenestebehov);
      const ledige = Math.max(0, behov - personerPå.length);
      const min = personerPå.find((p) => p.personId === personId);
      const minAvvist = tildelinger.some((t) => {
        if (t.PersonID !== personId) return false;
        const svar = db.svar.find((s) => s.TildelingID === t.TildelingID);
        return svar?.Svar === "Avvist";
      });

      let status: PåmeldingsStatus = "full";
      if (min?.status === "Bekreftet") status = "min-bekreftet";
      else if (min && min.status !== "Avvist") status = "min-venter";
      else if (ledige > 0 || minAvvist) status = "ledig";

      return { gudstjeneste: g, behov, ledige, personerPå, status };
    });
}

export const PersonalView: React.FC<PersonalViewProps> = ({
  db,
  selectedPersonId,
  onUpdateDb,
}) => {
  const [selectedRolleForModal, setSelectedRolleForModal] = useState<Rolle | null>(null);
  const [showDatePickerForRolle, setShowDatePickerForRolle] = useState<Rolle | null>(null);
  const [datePickerFilter, setDatePickerFilter] = useState<"ledige" | "mine" | "alle">("alle");
  const [visAlleFor, setVisAlleFor] = useState<Record<string, boolean>>({});
  const [actionFeedback, setActionFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const openDatePicker = (rolle: Rolle) => {
    setDatePickerFilter("alle");
    setShowDatePickerForRolle(rolle);
  };

  const person = db.personer.find((p) => p.PersonID === selectedPersonId);

  if (!person) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 text-center">
        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 inline-block mb-3">
          <Info className="w-8 h-8 text-amber-600 mx-auto" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Ingen person valgt</h2>
        <p className="text-sm text-slate-600 mt-1">Velg en person øverst til høyre for å se Min side.</p>
      </div>
    );
  }

  // 1. Personens aktive personroller
  const personensRolleIds = db.personroller
    .filter((pr) => pr.PersonID === person.PersonID && pr.Aktiv)
    .map((pr) => pr.RolleID);
  
  const personensRoller = db.roller.filter((r) => personensRolleIds.includes(r.RolleID));

  // Formater listen over roller i hilsningsteksten ("Møtevert, Nattverd og Kirkekaffe")
  const rolleNavnTekst = (() => {
    if (personensRoller.length === 0) return "oppgaver";
    if (personensRoller.length === 1) return personensRoller[0].Rollenavn;
    if (personensRoller.length === 2) {
      return `${personensRoller[0].Rollenavn} og ${personensRoller[1].Rollenavn}`;
    }
    const forste = personensRoller.slice(0, -1).map((r) => r.Rollenavn).join(", ");
    const siste = personensRoller[personensRoller.length - 1].Rollenavn;
    return `${forste} og ${siste}`;
  })();

  // 2. Personens egne tildelinger
  const personensTildelinger = db.tildelinger
    .filter((t) => t.PersonID === person.PersonID)
    .map((t) => {
      const gudstjeneste = db.gudstjenester.find((g) => g.GudstjenesteID === t.GudstjenesteID);
      const rolle = db.roller.find((r) => r.RolleID === t.RolleID);
      const svar = db.svar.find((s) => s.TildelingID === t.TildelingID);
      return {
        tildeling: t,
        gudstjeneste,
        rolle,
        svar,
        status: (svar ? svar.Svar : "Venter") as SvarStatus,
      };
    })
    .filter((item) => item.gudstjeneste !== undefined && item.rolle !== undefined)
    .sort((a, b) => {
      const dateA = a.gudstjeneste!.Dato + " " + a.gudstjeneste!.Tid;
      const dateB = b.gudstjeneste!.Dato + " " + b.gudstjeneste!.Tid;
      return dateA.localeCompare(dateB);
    });

  // Håndter bekreftelse ("Dette passer")
  const handleBekreft = (tildelingId: string, rolleNavn: string, dato: string) => {
    const updatedDb = svarPaaTildeling(
      db,
      tildelingId,
      person.PersonID,
      "Bekreftet",
      "Bekreftet av frivillig"
    );
    onUpdateDb(updatedDb);
    setActionFeedback({
      type: "success",
      message: `Takk! Du har bekreftet oppgaven som ${rolleNavn} den ${dato}.`,
    });
    setTimeout(() => setActionFeedback(null), 4500);
  };

  // Håndter avkreftelse ("Kan ikke")
  const handleAvkreft = (tildelingId: string, rolleNavn: string, dato: string, rolle: Rolle) => {
    const updatedDb = svarPaaTildeling(
      db,
      tildelingId,
      person.PersonID,
      "Avvist",
      "Meldt forfall"
    );
    onUpdateDb(updatedDb);
    setActionFeedback({
      type: "error",
      message: `Du har meldt at ${dato} ikke passer for ${rolleNavn}. Du kan velge en annen dato nedenfor hvis du har anledning!`,
    });
    setTimeout(() => setActionFeedback(null), 6000);
  };

  // Håndter valg av ny/annen dato
  const handleVelgAnnenDato = (gudstjenesteId: string, rolle: Rolle) => {
    const result = velgDatoForPerson(db, person.PersonID, gudstjenesteId, rolle.RolleID);
    if (result.success && result.updatedDb) {
      onUpdateDb(result.updatedDb);
      const g = db.gudstjenester.find((item) => item.GudstjenesteID === gudstjenesteId);
      setActionFeedback({
        type: "success",
        message: `Du er påmeldt som ${rolle.Rollenavn} ${g?.Dato || ""}. Du kan melde deg på flere datoer.`,
      });
    } else {
      setActionFeedback({
        type: "error",
        message: result.message,
      });
    }
    setTimeout(() => setActionFeedback(null), 4500);
  };

  // Samle alle unike roller som personen enten har i personroller ELLER har tildelinger for
  const visningsRoller: Rolle[] = [];
  const visningsRolleIds = new Set<string>();

  // Legg til personens registrerte roller først
  personensRoller.forEach((r) => {
    visningsRoller.push(r);
    visningsRolleIds.add(r.RolleID);
  });

  // Legg til eventuelle roller personen er tildelt men ikke har i personroller
  personensTildelinger.forEach((item) => {
    if (item.rolle && !visningsRolleIds.has(item.rolle.RolleID)) {
      visningsRoller.push(item.rolle);
      visningsRolleIds.add(item.rolle.RolleID);
    }
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Tilbakemeldingsbanner */}
      {actionFeedback && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-sm shadow-xs transition animate-fadeIn ${
            actionFeedback.type === "success"
              ? "bg-[#eef5f1] text-[#1e3e2b] border border-[#d2e8d9]"
              : "bg-amber-50 text-amber-900 border border-amber-200"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {actionFeedback.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-[#2d5a3f] shrink-0" />
            ) : (
              <Info className="w-5 h-5 text-amber-700 shrink-0" />
            )}
            <span className="font-medium leading-snug">{actionFeedback.message}</span>
          </div>
          <button
            onClick={() => setActionFeedback(null)}
            className="text-xs font-semibold underline cursor-pointer ml-3 shrink-0"
          >
            Lukk
          </button>
        </div>
      )}

      {/* 1. TOPP-KORT: Hilsen og velkomst som i referansebildet BekreftOppgave.png */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-4">
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Lillesand Misjonskirke
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Hei {person.Fornavn}</span>
            <span className="text-2xl sm:text-3xl">👋</span>
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Takk for at du vil bidra i menigheten. Her ser du forslagene vi har laget for deg.
          </p>
        </div>

        {/* Lys grønn infoboks */}
        <div className="bg-[#f4f8f5] border-l-4 border-[#2d5a3f] rounded-2xl p-4 sm:p-5 text-xs sm:text-sm text-slate-700 leading-relaxed shadow-2xs">
          <p>
            Du har sagt ja til å bidra med{" "}
            <strong className="text-[#1e3e2b] font-bold">{rolleNavnTekst}</strong> i menigheten.
            Vi har satt opp et forslag til datoer ut fra gudstjenesteplanen, men forslagene er ikke
            bindende. Det er helt opp til deg å vurdere hvilke datoer som passer.
          </p>
        </div>
      </div>

      {/* Oppgaver gruppert per gudstjeneste-dato */}
      {(() => {
        const iDag = new Date().toISOString().split("T")[0];
        const kommende = db.gudstjenester
          .filter((g) => g.Dato >= iDag)
          .slice()
          .sort((a, b) => `${a.Dato} ${a.Tid}`.localeCompare(`${b.Dato} ${b.Tid}`));

        if (kommende.length === 0) {
          return (
            <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-2">
              <Info className="w-8 h-8 text-slate-400 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">Ingen kommende gudstjenester</h3>
            </div>
          );
        }

        const personerIRolle = (gudstjenesteId: string, rolleId: string) =>
          db.tildelinger
            .filter((t) => t.GudstjenesteID === gudstjenesteId && t.RolleID === rolleId)
            .map((t) => {
              const svar = (db.svar.find((s) => s.TildelingID === t.TildelingID)?.Svar ||
                "Venter") as SvarStatus;
              if (svar === "Avvist") return null;
              const p = db.personer.find((pers) => pers.PersonID === t.PersonID);
              const navn = p?.Fornavn || p?.Navn;
              if (!navn) return null;
              return { personId: t.PersonID, navn, status: svar };
            })
            .filter(
              (x): x is { personId: string; navn: string; status: SvarStatus } =>
                x !== null
            );

        return (
          <div className="space-y-4">
            {visningsRoller.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {visningsRoller.map((rolle) => (
                  <button
                    key={rolle.RolleID}
                    type="button"
                    onClick={() => openDatePicker(rolle)}
                    className="text-xs font-semibold text-[#2d5a3f] bg-white hover:bg-[#eef5f1] border border-[#d2e8d9] px-3 py-1.5 rounded-full cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 inline mr-1" />
                    Velg dato for {rolle.Rollenavn}
                  </button>
                ))}
              </div>
            )}

            {kommende.map((gudstjeneste) => {
              const mine = personensTildelinger.filter(
                (item) => item.gudstjeneste?.GudstjenesteID === gudstjeneste.GudstjenesteID
              );
              const visAlle = Boolean(visAlleFor[gudstjeneste.GudstjenesteID]);
              const rollerIOversikt = db.roller.filter((r) => r.Aktiv);

              return (
                <div
                  key={gudstjeneste.GudstjenesteID}
                  className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden"
                >
                  <div className="px-5 sm:px-6 pt-5 pb-3">
                    <span className="text-[11px] font-bold text-[#2d5a3f] uppercase tracking-wider">
                      {formatDato(gudstjeneste.Dato)}
                      {gudstjeneste.Tid ? ` · kl. ${gudstjeneste.Tid}` : ""}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900">
                      {gudstjeneste.Tema || "Gudstjeneste"}
                    </h3>
                    {gudstjeneste.Sted && (
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />
                        {gudstjeneste.Sted}
                      </p>
                    )}
                  </div>

                  {mine.length > 0 && (
                    <div className="px-5 sm:px-6 pb-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                        Mine oppgaver
                      </p>
                      {mine.map((item) => {
                        const isBekreftet = item.status === "Bekreftet";
                        const isAvvist = item.status === "Avvist";
                        const isVenter = !isBekreftet && !isAvvist;
                        return (
                          <div key={item.tildeling.TildelingID} className="border-b border-slate-100 py-3 last:border-0">
                            <div className="flex items-center justify-between gap-3 min-h-[1.5rem]">
                              <span className="inline-flex items-center gap-2.5 min-w-0">
                                <RolleIkon rollenavn={item.rolle?.Rollenavn || ""} />
                                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                  {item.rolle?.Rollenavn}
                                </span>
                              </span>
                              <span className="text-sm font-semibold text-slate-800 text-right inline-flex items-center justify-end gap-1.5 min-h-[1.25rem]">
                                {isAvvist ? null : (
                                  <>
                                    <span
                                      className={`w-2 h-2 rounded-full shrink-0 ${
                                        isBekreftet ? "bg-emerald-500" : "bg-amber-400"
                                      }`}
                                      title={isBekreftet ? "Bekreftet" : "Forespurt"}
                                      aria-hidden
                                    />
                                    {person.Fornavn || person.Navn}
                                  </>
                                )}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <button
                                type="button"
                                onClick={() =>
                                  handleBekreft(
                                    item.tildeling.TildelingID,
                                    item.rolle!.Rollenavn,
                                    gudstjeneste.Dato
                                  )
                                }
                                className={`px-3 py-1.5 text-xs font-semibold rounded-xl border cursor-pointer ${
                                  isBekreftet
                                    ? "bg-[#eef5f1] text-[#1e3e2b] border-[#86efac]"
                                    : "bg-white hover:bg-[#eef5f1] text-[#2d5a3f] border-[#bbf7d0]"
                                }`}
                              >
                                {isBekreftet ? "Bekreftet" : "Dette passer"}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleAvkreft(
                                    item.tildeling.TildelingID,
                                    item.rolle!.Rollenavn,
                                    gudstjeneste.Dato,
                                    item.rolle!
                                  )
                                }
                                className={`px-3 py-1.5 text-xs font-semibold rounded-xl border cursor-pointer ${
                                  isAvvist
                                    ? "bg-rose-100 text-rose-800 border-rose-300"
                                    : "bg-white hover:bg-rose-50 text-rose-700 border-rose-200"
                                }`}
                              >
                                Kan ikke
                              </button>
                              <button
                                type="button"
                                onClick={() => setSelectedRolleForModal(item.rolle!)}
                                className="text-xs text-[#2d5a3f] underline cursor-pointer ml-auto"
                              >
                                Instruks
                              </button>
                            </div>
                            {isVenter && (
                              <p className="text-[11px] text-amber-800 mt-1.5">Du er forespurt</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {mine.length === 0 && (
                    <p className="px-5 sm:px-6 pb-3 text-xs text-slate-400">
                      Du er ikke satt opp denne dagen.
                    </p>
                  )}

                  <div className="px-5 sm:px-6 pb-4">
                    <button
                      type="button"
                      onClick={() =>
                        setVisAlleFor((prev) => ({
                          ...prev,
                          [gudstjeneste.GudstjenesteID]: !visAlle,
                        }))
                      }
                      className="text-xs font-semibold text-[#2d5a3f] hover:underline cursor-pointer"
                    >
                      {visAlle ? "Skjul alle" : "Vis alle"}
                    </button>

                    {visAlle && (
                      <div className="mt-2">
                        <p className="text-[11px] text-slate-400 mb-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden />
                            Bekreftet
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-400" aria-hidden />
                            Forespurt
                          </span>
                        </p>
                        {rollerIOversikt.map((rolle) => {
                          const personer = personerIRolle(
                            gudstjeneste.GudstjenesteID,
                            rolle.RolleID
                          );
                          return (
                            <div
                              key={rolle.RolleID}
                              className="flex items-center justify-between gap-3 py-2.5 border-b border-slate-100 last:border-0 min-h-[2.5rem]"
                            >
                              <span className="inline-flex items-center gap-2.5 min-w-0">
                                <RolleIkon rollenavn={rolle.Rollenavn} />
                                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                  {rolle.Rollenavn}
                                </span>
                              </span>
                              <span className="text-sm font-semibold text-slate-800 text-right min-h-[1.25rem] inline-flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
                                {personer.map((p) => (
                                  <span
                                    key={p.personId}
                                    className="inline-flex items-center gap-1.5"
                                  >
                                    <span
                                      className={`w-2 h-2 rounded-full shrink-0 ${
                                        p.status === "Bekreftet"
                                          ? "bg-emerald-500"
                                          : "bg-amber-400"
                                      }`}
                                      title={
                                        p.status === "Bekreftet" ? "Bekreftet" : "Forespurt"
                                      }
                                      aria-hidden
                                    />
                                    {p.navn}
                                  </span>
                                ))}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Påmelding: nesten fullskjerm */}
      {showDatePickerForRolle && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="bg-white w-full h-full sm:h-auto sm:max-h-[100dvh] sm:max-w-5xl sm:my-4 sm:rounded-3xl shadow-2xl border-0 sm:border sm:border-slate-200 flex flex-col overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-3 shrink-0">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Meld deg på
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
                  {showDatePickerForRolle.Rollenavn}
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  Se ledige, ubekreftede og fulle søndager. Ett trykk melder deg på.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDatePickerForRolle(null)}
                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer shrink-0"
                aria-label="Lukk"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {actionFeedback && (
              <div
                className={`mx-4 sm:mx-6 mt-4 p-3 rounded-2xl text-sm ${
                  actionFeedback.type === "success"
                    ? "bg-[#eef5f1] text-[#1e3e2b] border border-[#d2e8d9]"
                    : "bg-amber-50 text-amber-900 border border-amber-200"
                }`}
              >
                {actionFeedback.message}
              </div>
            )}

            {(() => {
              const rader = byggPåmeldingsrader(db, person.PersonID, showDatePickerForRolle);
              const antallLedige = rader.filter((r) => r.status === "ledig").length;
              const antallMine = rader.filter(
                (r) => r.status === "min-venter" || r.status === "min-bekreftet"
              ).length;
              const antallFulle = rader.filter((r) => r.status === "full").length;
              const filtrert = rader.filter((r) => {
                if (datePickerFilter === "ledige") return r.status === "ledig";
                if (datePickerFilter === "mine") {
                  return r.status === "min-venter" || r.status === "min-bekreftet";
                }
                return true;
              });

              return (
                <>
                  <div className="px-4 sm:px-6 py-3 flex flex-wrap gap-2 shrink-0">
                    {(
                      [
                        ["alle", `Alle (${rader.length})`],
                        ["ledige", `Ledige (${antallLedige})`],
                        ["mine", `Mine (${antallMine})`],
                      ] as const
                    ).map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setDatePickerFilter(id)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition ${
                          datePickerFilter === id
                            ? "bg-[#2d5a3f] text-white"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                    <span className="text-xs text-slate-400 self-center ml-auto">
                      {antallFulle} fulle
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-4 space-y-2">
                    {filtrert.length === 0 ? (
                      <div className="text-center py-12 text-sm text-slate-500">
                        Ingen gudstjenester i dette filteret.
                      </div>
                    ) : (
                      filtrert.map((rad) => {
                        const { gudstjeneste: g, behov, ledige, personerPå, status } = rad;
                        const kanMelde = status === "ledig";
                        return (
                          <div
                            key={g.GudstjenesteID}
                            className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                              status === "ledig"
                                ? "bg-[#f4f8f5] border-[#d2e8d9]"
                                : status === "full"
                                ? "bg-slate-50 border-slate-200"
                                : "bg-white border-slate-200"
                            }`}
                          >
                            <div className="min-w-0 space-y-1.5">
                              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                                <span className="text-base font-bold text-slate-900">
                                  {formatDato(g.Dato)}
                                </span>
                                {g.Tid && (
                                  <span className="text-sm text-slate-500">kl. {g.Tid}</span>
                                )}
                              </div>
                              <div className="text-sm text-slate-600">
                                {g.Tema || "Gudstjeneste"}
                                {g.Sted ? ` · ${g.Sted}` : ""}
                              </div>
                              <div className="text-xs text-slate-500">
                                {personerPå.length} av {behov} påmeldt
                                {ledige > 0 ? ` · ${ledige} ledig` : ""}
                              </div>
                              {personerPå.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 pt-0.5">
                                  {personerPå.map((p) => (
                                    <span
                                      key={p.personId}
                                      className={`text-[11px] font-medium px-2 py-0.5 rounded-lg ${
                                        p.status === "Bekreftet"
                                          ? "bg-[#eef5f1] text-[#1e3e2b] border border-[#d2e8d9]"
                                          : "bg-amber-50 text-amber-800 border border-amber-200"
                                      }`}
                                    >
                                      {p.navn}
                                      {p.status === "Venter" ? " (venter)" : ""}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="shrink-0 self-stretch sm:self-center">
                              {kanMelde ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleVelgAnnenDato(g.GudstjenesteID, showDatePickerForRolle)
                                  }
                                  className="w-full sm:w-auto px-5 py-3 bg-[#2d5a3f] hover:bg-[#1e3e2b] text-white text-sm font-semibold rounded-2xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                  <Check className="w-4 h-4" />
                                  <span>Meld meg på</span>
                                </button>
                              ) : status === "min-bekreftet" ? (
                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1e3e2b] bg-[#eef5f1] border border-[#d2e8d9] px-3 py-2 rounded-xl">
                                  <Check className="w-4 h-4" />
                                  Du stiller
                                </span>
                              ) : status === "min-venter" ? (
                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl">
                                  <Clock3 className="w-4 h-4" />
                                  Ditt forslag venter
                                </span>
                              ) : (
                                <span className="inline-flex text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-2 rounded-xl">
                                  Fullt
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="px-4 sm:px-6 py-3 border-t border-slate-100 flex justify-end shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowDatePickerForRolle(null)}
                      className="px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                    >
                      Ferdig
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Rollebeskrivelsesmodal */}
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
    </div>
  );
};
