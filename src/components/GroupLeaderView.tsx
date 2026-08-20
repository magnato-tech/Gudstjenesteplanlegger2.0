import React, { useState } from "react";
import {
  DatabaseState,
  finnGrupperForGruppeleder,
  finnMedlemmerIGruppe,
  getEffektivtBehov,
  genererPersonligLenke,
  saveDatabase,
} from "../services/dataService";
import { Gruppe, Person, Rolle, Tildeling } from "../types/database";
import { RoleDescriptionModal } from "./RoleDescriptionModal";
import {
  Users,
  Calendar,
  Clock,
  Shield,
  Share2,
  Check,
  CheckCircle2,
  XCircle,
  HelpCircle,
  AlertCircle,
  UserPlus,
  BookOpen,
  Mail,
  Phone,
  Sparkles,
} from "lucide-react";

interface GroupLeaderViewProps {
  db: DatabaseState;
  selectedPersonId: string;
  onUpdateDb: (updatedDb: DatabaseState) => void;
  onSelectPerson: (personId: string) => void;
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
  const [personToAssign, setPersonToAssign] = useState<string>("");

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

  const handleExecuteAssign = () => {
    if (!assignModal || !personToAssign) return;

    // Generer tildeling ID
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

  // Gruppens medlemmer
  const gruppensMedlemmer = currentGruppe
    ? finnMedlemmerIGruppe(db, currentGruppe.GruppeID)
    : [];

  // Roller som tilhører denne gruppen
  const gruppensRoller = currentGruppe
    ? db.roller.filter((r) => r.GruppeID === currentGruppe.GruppeID && r.Aktiv)
    : [];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      {/* Gruppevelger hvis leder har flere grupper */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#2d5a3f] uppercase tracking-wider">
            <Users className="w-4 h-4" />
            <span>Tjenestegruppeleder-visning for {person?.Navn}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">
            {currentGruppe?.Gruppenavn || "Tjenestegruppe"}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {currentGruppe?.Beskrivelse}
          </p>
        </div>

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

      {/* SEKSJON 1: Bemanningsstatus for tjenestegruppens roller */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#2d5a3f]" />
              <span>Bemanningsstatus for tjenestegruppens roller</span>
            </h3>
            <p className="text-xs text-slate-500">
              Oversikt over kommende gudstjenester for rollene tilknyttet {currentGruppe?.Gruppenavn}.
            </p>
          </div>
        </div>

        {gruppensRoller.length === 0 ? (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center">
            <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <p className="text-sm text-slate-600">
              Ingen roller er tilknyttet denne tjenestegruppen i dagens register.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {db.gudstjenester.map((gudstjeneste) => {
              return (
                <div
                  key={gudstjeneste.GudstjenesteID}
                  className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div>
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        {new Date(gudstjeneste.Dato).toLocaleDateString("no-NO", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        })}{" "}
                        &bull; kl. {gudstjeneste.Tid}
                      </span>
                      <h4 className="text-base sm:text-lg font-bold text-slate-900">
                        {gudstjeneste.Tema || "Gudstjeneste"}
                      </h4>
                    </div>
                    <span className="text-xs text-slate-500 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200 self-start sm:self-auto">
                      {gudstjeneste.Sted}
                    </span>
                  </div>

                  {/* Rollekort per gudstjeneste */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {gruppensRoller.map((rolle) => {
                      const effektivtBehov = getEffektivtBehov(
                        gudstjeneste.GudstjenesteID,
                        rolle,
                        db.tjenestebehov
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
                      const erFullbemannet = ledigePlasser === 0;

                      return (
                        <div
                          key={rolle.RolleID}
                          className={`p-3.5 rounded-xl border flex flex-col justify-between ${
                            erFullbemannet
                              ? "bg-emerald-50/40 border-emerald-200"
                              : "bg-amber-50/40 border-amber-200"
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1 mb-2">
                              <span className="font-bold text-sm text-slate-900">
                                {rolle.Rollenavn}
                              </span>
                              <span
                                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                  erFullbemannet
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-amber-100 text-amber-900"
                                }`}
                              >
                                {antallTildelt} / {effektivtBehov}
                              </span>
                            </div>

                            {/* Tildelte personer */}
                            <div className="space-y-1.5 my-2">
                              {tildelinger.length === 0 ? (
                                <span className="text-xs text-slate-400 italic block">
                                  Ingen satt opp ennå
                                </span>
                              ) : (
                                tildelinger.map((t) => {
                                  const p = db.personer.find((pers) => pers.PersonID === t.PersonID);
                                  const svar = db.svar.find((s) => s.TildelingID === t.TildelingID);
                                  const svarStatus = svar?.Svar || "Venter";

                                  return (
                                    <div
                                      key={t.TildelingID}
                                      className="flex items-center justify-between text-xs bg-white/80 p-1.5 rounded-lg border border-slate-200/70"
                                    >
                                      <span className="font-medium text-slate-800 truncate mr-2">
                                        {p?.Navn || t.PersonID}
                                      </span>
                                      <div className="shrink-0 flex items-center gap-1">
                                        {svarStatus === "Bekreftet" && (
                                          <span className="text-[10px] text-emerald-700 bg-emerald-50 font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                            <CheckCircle2 className="w-3 h-3" />
                                            Bekreftet
                                          </span>
                                        )}
                                        {svarStatus === "Avvist" && (
                                          <span className="text-[10px] text-rose-700 bg-rose-50 font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                            <XCircle className="w-3 h-3" />
                                            Forfall
                                          </span>
                                        )}
                                        {svarStatus === "Venter" && (
                                          <span className="text-[10px] text-amber-700 bg-amber-50 font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                            <HelpCircle className="w-3 h-3" />
                                            Venter
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>

                          {/* Handlinger */}
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                            <button
                              type="button"
                              onClick={() => setSelectedRolleForModal(rolle)}
                              className="text-slate-500 hover:text-slate-800 underline flex items-center gap-1 cursor-pointer"
                            >
                              <BookOpen className="w-3 h-3" />
                              Instruks
                            </button>

                            {ledigePlasser > 0 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setAssignModal({
                                    gudstjenesteId: gudstjeneste.GudstjenesteID,
                                    rolleId: rolle.RolleID,
                                    rolleNavn: rolle.Rollenavn,
                                    gudstjenesteDato: gudstjeneste.Dato,
                                  })
                                }
                                className="px-2 py-1 bg-[#2d5a3f] hover:bg-[#234731] text-white rounded-md font-semibold flex items-center gap-1 cursor-pointer transition shadow-2xs"
                              >
                                <UserPlus className="w-3 h-3" />
                                <span>Tildel ({ledigePlasser} ledig)</span>
                              </button>
                            )}
                          </div>
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

      {/* SEKSJON 2: Medlemmer i tjenestegruppen & personlige lenker */}
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-[#2d5a3f]" />
              <span>Medlemmer i {currentGruppe?.Gruppenavn} ({gruppensMedlemmer.length})</span>
            </h3>
            <p className="text-xs text-slate-500">
              Generer og kopier personlige direktelenker for medlemmene i tjenestegruppen.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {gruppensMedlemmer.map(({ person: mPerson, medlemskap, personroller }) => {
            const isCopied = copiedPersonId === mPerson.PersonID;

            return (
              <div
                key={mPerson.PersonID}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 text-base">
                          {mPerson.Navn}
                        </h4>
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                          {mPerson.PersonID}
                        </span>
                      </div>
                      <div className="text-xs text-[#2d5a3f] font-medium mt-0.5">
                        Funksjon: {medlemskap.Medlemsrolle || "Medlem"}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopyLink(mPerson.PersonID)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                        isCopied
                          ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                          : "bg-[#eef5f1] hover:bg-[#dff0e6] border-[#d2e8d9] text-[#2d5a3f]"
                      }`}
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Lenke kopiert!</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="w-3.5 h-3.5" />
                          <span>Kopier personlig lenke</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="mt-3 space-y-1 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>{mPerson.Epost}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{mPerson.Telefon}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider block mb-1">
                    Registrerte personroller:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {personroller.length > 0 ? (
                      personroller.map((r) => (
                        <span
                          key={r.RolleID}
                          className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded-md"
                        >
                          {r.Rollenavn}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 italic">
                        Ingen roller registrert
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal for å tildele medlem */}
      {assignModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Tildel person til {assignModal.rolleNavn}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Gudstjeneste: {assignModal.gudstjenesteDato} ({assignModal.gudstjenesteId})
            </p>

            <div className="space-y-3 mb-6">
              <label className="text-xs font-semibold text-slate-600 block">
                Velg person:
              </label>
              <select
                value={personToAssign}
                onChange={(e) => setPersonToAssign(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-xl p-2.5 bg-slate-50 focus:ring-2 focus:ring-[#2d5a3f] focus:outline-hidden"
              >
                <option value="">-- Velg person --</option>
                {/* Foreslå først personer som har denne rollen */}
                <optgroup label="Gruppens medlemmer med denne rollen">
                  {gruppensMedlemmer
                    .filter((m) =>
                      m.personroller.some((r) => r.RolleID === assignModal.rolleId)
                    )
                    .map((m) => (
                      <option key={m.person.PersonID} value={m.person.PersonID}>
                        {m.person.Navn} ({m.person.PersonID})
                      </option>
                    ))}
                </optgroup>
                <optgroup label="Øvrige gruppemedlemmer">
                  {gruppensMedlemmer
                    .filter(
                      (m) =>
                        !m.personroller.some((r) => r.RolleID === assignModal.rolleId)
                    )
                    .map((m) => (
                      <option key={m.person.PersonID} value={m.person.PersonID}>
                        {m.person.Navn} ({m.person.PersonID})
                      </option>
                    ))}
                </optgroup>
              </select>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAssignModal(null)}
                className="px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Avbryt
              </button>
              <button
                type="button"
                disabled={!personToAssign}
                onClick={handleExecuteAssign}
                className="px-4 py-2 text-sm bg-[#2d5a3f] hover:bg-[#234731] disabled:opacity-50 text-white font-semibold rounded-xl shadow-xs transition cursor-pointer"
              >
                Lagre tildeling
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
          gruppe={currentGruppe || null}
          onClose={() => setSelectedRolleForModal(null)}
        />
      )}
    </div>
  );
};
