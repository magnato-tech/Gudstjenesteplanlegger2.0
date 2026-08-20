/**
 * Tjenestelag for datalagring, forretningslogikk og bemanningsberegning
 * i henhold til Gudstjenesteplanlegger 2.0 datamodellen.
 */

import {
  Person,
  Gruppetype,
  Gruppe,
  Gruppemedlem,
  Rolle,
  Personrolle,
  Rollebeskrivelse,
  Gudstjeneste,
  Tjenestebehov,
  Tildeling,
  Svar,
  SvarStatus,
  LedigOppgave,
  PersonerImport,
  GudstjenesterImport,
  RollebeskrivelseImport,
} from "../types/database";

import {
  initialGruppetyper,
  initialPersoner,
  initialGrupper,
  initialGruppemedlemmer,
  initialRoller,
  initialPersonroller,
  initialRollebeskrivelser,
  initialGudstjenester,
  initialTjenestebehov,
  initialTildelinger,
  initialSvar,
  initialPersonerImport,
  initialGudstjenesterImport,
  initialRollebeskrivelseImport,
} from "../data/initialData";

const STORAGE_KEY = "gudstjenesteplanlegger_db_v2";

export interface DatabaseState {
  gruppetyper: Gruppetype[];
  personer: Person[];
  grupper: Gruppe[];
  gruppemedlemmer: Gruppemedlem[];
  roller: Rolle[];
  personroller: Personrolle[];
  rollebeskrivelser: Rollebeskrivelse[];
  gudstjenester: Gudstjeneste[];
  tjenestebehov: Tjenestebehov[];
  tildelinger: Tildeling[];
  svar: Svar[];
  personerImport: PersonerImport[];
  gudstjenesterImport: GudstjenesterImport[];
  rollebeskrivelseImport: RollebeskrivelseImport[];
}

export function loadDatabase(): DatabaseState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Ensure all collections exist and are arrays
      if (
        Array.isArray(parsed.personer) &&
        Array.isArray(parsed.grupper) &&
        Array.isArray(parsed.roller) &&
        Array.isArray(parsed.gudstjenester)
      ) {
        return {
          gruppetyper: Array.isArray(parsed.gruppetyper) ? parsed.gruppetyper : initialGruppetyper,
          personer: parsed.personer,
          grupper: parsed.grupper,
          gruppemedlemmer: Array.isArray(parsed.gruppemedlemmer) ? parsed.gruppemedlemmer : initialGruppemedlemmer,
          roller: parsed.roller,
          personroller: Array.isArray(parsed.personroller) ? parsed.personroller : initialPersonroller,
          rollebeskrivelser: Array.isArray(parsed.rollebeskrivelser) ? parsed.rollebeskrivelser : initialRollebeskrivelser,
          gudstjenester: parsed.gudstjenester,
          tjenestebehov: Array.isArray(parsed.tjenestebehov) ? parsed.tjenestebehov : initialTjenestebehov,
          tildelinger: Array.isArray(parsed.tildelinger) ? parsed.tildelinger : initialTildelinger,
          svar: Array.isArray(parsed.svar) ? parsed.svar : initialSvar,
          personerImport: Array.isArray(parsed.personerImport) ? parsed.personerImport : initialPersonerImport,
          gudstjenesterImport: Array.isArray(parsed.gudstjenesterImport) ? parsed.gudstjenesterImport : initialGudstjenesterImport,
          rollebeskrivelseImport: Array.isArray(parsed.rollebeskrivelseImport) ? parsed.rollebeskrivelseImport : initialRollebeskrivelseImport,
        };
      }
    }
  } catch (e) {
    console.warn("Kunne ikke laste lagret database, bruker initielle data:", e);
  }

  const initial: DatabaseState = {
    gruppetyper: initialGruppetyper,
    personer: initialPersoner,
    grupper: initialGrupper,
    gruppemedlemmer: initialGruppemedlemmer,
    roller: initialRoller,
    personroller: initialPersonroller,
    rollebeskrivelser: initialRollebeskrivelser,
    gudstjenester: initialGudstjenester,
    tjenestebehov: initialTjenestebehov,
    tildelinger: initialTildelinger,
    svar: initialSvar,
    personerImport: initialPersonerImport,
    gudstjenesterImport: initialGudstjenesterImport,
    rollebeskrivelseImport: initialRollebeskrivelseImport,
  };

  saveDatabase(initial);
  return initial;
}

export function saveDatabase(state: DatabaseState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Kunne ikke lagre til localStorage:", e);
  }
}

export function resetDatabase(): DatabaseState {
  localStorage.removeItem(STORAGE_KEY);
  return loadDatabase();
}

/**
 * Beregner effektivt behov for en rolle på en bestemt gudstjeneste
 * Regel: Hvis Tjenestebehov har en aktiv rad for GudstjenesteID + RolleID, brukes Antall.
 * Hvis ikke, brukes Roller.Behov.
 */
export function getEffektivtBehov(
  arg1: string | DatabaseState,
  arg2: Rolle | string,
  arg3?: Tjenestebehov[] | string | DatabaseState | Rolle
): number {
  // Case 1: getEffektivtBehov(db, gudstjenesteID, rolleID)
  if (typeof arg1 === "object" && arg1 !== null && "tjenestebehov" in arg1) {
    const db = arg1 as DatabaseState;
    const gudstjenesteID = String(arg2 || "");
    let rolleID = "";
    if (typeof arg3 === "string") {
      rolleID = arg3;
    } else if (arg3 && typeof arg3 === "object" && "RolleID" in arg3) {
      rolleID = (arg3 as Rolle).RolleID;
    }
    const rolle = db.roller.find((r) => r.RolleID === rolleID);
    const overstyring = (db.tjenestebehov || []).find(
      (tb) =>
        tb.GudstjenesteID === gudstjenesteID &&
        tb.RolleID === rolleID &&
        tb.Aktiv
    );
    return overstyring !== undefined ? overstyring.Antall : (rolle?.Behov ?? 1);
  }

  // Case 2: getEffektivtBehov(gudstjenesteID, rolle, tjenestebehovListe)
  const gudstjenesteID = String(arg1 || "");
  const rolleObj = typeof arg2 === "object" && arg2 !== null ? (arg2 as Rolle) : null;
  const rolleID = rolleObj ? rolleObj.RolleID : String(arg2 || "");

  let tjenestebehovListe: Tjenestebehov[] = [];
  if (Array.isArray(arg3)) {
    tjenestebehovListe = arg3;
  } else if (arg3 && typeof arg3 === "object" && "tjenestebehov" in arg3) {
    tjenestebehovListe = (arg3 as DatabaseState).tjenestebehov || [];
  }

  const overstyring = tjenestebehovListe.find(
    (tb) =>
      tb.GudstjenesteID === gudstjenesteID &&
      tb.RolleID === rolleID &&
      tb.Aktiv
  );
  if (overstyring !== undefined) {
    return overstyring.Antall;
  }
  return rolleObj ? rolleObj.Behov : 1;
}

/**
 * Beregner ledige oppgaver (avledet sannhet) for alle eller spesifikke gudstjenester
 */
export function beregnLedigeOppgaver(
  db: DatabaseState,
  gudstjenesteIDFilter?: string
): LedigOppgave[] {
  const result: LedigOppgave[] = [];

  const gudstjenester = gudstjenesteIDFilter
    ? db.gudstjenester.filter((g) => g.GudstjenesteID === gudstjenesteIDFilter)
    : db.gudstjenester;

  const aktiveRoller = db.roller.filter((r) => r.Aktiv);

  for (const g of gudstjenester) {
    for (const r of aktiveRoller) {
      const effektivtBehov = getEffektivtBehov(g.GudstjenesteID, r, db.tjenestebehov);

      // Finn tildelinger for denne gudstjenesten og rollen
      const tildelingerForRolle = db.tildelinger.filter(
        (t) => t.GudstjenesteID === g.GudstjenesteID && t.RolleID === r.RolleID
      );

      // Aktive tildelinger: tildelinger der svar ikke er "Avvist"
      const aktiveTildelinger = tildelingerForRolle.filter((t) => {
        const svar = db.svar.find((s) => s.TildelingID === t.TildelingID);
        return !svar || svar.Svar !== "Avvist";
      });

      const antallTildelt = aktiveTildelinger.length;
      const ledigePlasser = Math.max(0, effektivtBehov - antallTildelt);

      const gruppe = db.grupper.find((grp) => grp.GruppeID === r.GruppeID);

      result.push({
        GudstjenesteID: g.GudstjenesteID,
        RolleID: r.RolleID,
        Rollenavn: r.Rollenavn,
        Dato: g.Dato,
        Tid: g.Tid,
        Sted: g.Sted,
        Tema: g.Tema,
        EffektivtBehov: effektivtBehov,
        AntallTildelt: antallTildelt,
        LedigePlasser: ledigePlasser,
        AnsvarligGruppeID: r.GruppeID,
        AnsvarligGruppeNavn: gruppe ? gruppe.Gruppenavn : undefined,
      });
    }
  }

  return result;
}

/**
 * Frivillig påmelding:
 * Finner ledige oppgaver som matcher personens aktive Personroller og der det er ledig kapasitet.
 */
export function finnLedigeOppgaverForPerson(
  db: DatabaseState,
  personID: string
): LedigOppgave[] {
  const personensRoller = db.personroller
    .filter((pr) => pr.PersonID === personID && pr.Aktiv)
    .map((pr) => pr.RolleID);

  if (personensRoller.length === 0) return [];

  const alleLedige = beregnLedigeOppgaver(db);

  return alleLedige.filter((oppgave) => {
    // 1. Rollen må matche personens aktive roller
    if (!personensRoller.includes(oppgave.RolleID)) return false;

    // 2. Det må faktisk være ledige plasser
    if (oppgave.LedigePlasser <= 0) return false;

    // 3. Personen må ikke allerede være tildelt denne rollen på denne gudstjenesten
    const alleredeTildelt = db.tildelinger.some(
      (t) =>
        t.GudstjenesteID === oppgave.GudstjenesteID &&
        t.RolleID === oppgave.RolleID &&
        t.PersonID === personID
    );

    return !alleredeTildelt;
  });
}

/**
 * Atomisk frivillig påmelding:
 * 1. Validerer personrolle og kapasitet
 * 2. Oppretter Tildeling
 * 3. Oppretter Svar med "Bekreftet"
 */
export function meldPaaFrivillig(
  db: DatabaseState,
  personID: string,
  gudstjenesteID: string,
  rolleID: string,
  kommentar?: string
): { success: boolean; message: string; updatedDb?: DatabaseState } {
  // 1. Valider person
  const person = db.personer.find((p) => p.PersonID === personID && p.Aktiv);
  if (!person) {
    return { success: false, message: "Personen finnes ikke eller er ikke aktiv." };
  }

  // 2. Valider personrolle
  const harRolle = db.personroller.some(
    (pr) => pr.PersonID === personID && pr.RolleID === rolleID && pr.Aktiv
  );
  if (!harRolle) {
    return {
      success: false,
      message: "Personen har ikke registrert denne rollen i sine personroller.",
    };
  }

  // 3. Valider kapasitet
  const ledige = beregnLedigeOppgaver(db, gudstjenesteID).find(
    (o) => o.RolleID === rolleID
  );
  if (!ledige || ledige.LedigePlasser <= 0) {
    return {
      success: false,
      message: "Det er dessverre ingen ledige plasser igjen for denne rollen.",
    };
  }

  // 4. Valider at personen ikke allerede er tildelt denne rollen på denne datoen
  const eksisterende = db.tildelinger.find(
    (t) =>
      t.GudstjenesteID === gudstjenesteID &&
      t.RolleID === rolleID &&
      t.PersonID === personID
  );
  if (eksisterende) {
    return {
      success: false,
      message: "Du er allerede registrert på denne oppgaven.",
    };
  }

  // Generer nye ID-er
  const maxTildelingNr = db.tildelinger.reduce((max, t) => {
    const num = parseInt(t.TildelingID.replace(/\D/g, ""), 10);
    return !isNaN(num) && num > max ? num : max;
  }, 0);
  const newTildelingID = `T${String(maxTildelingNr + 1).padStart(3, "0")}`;

  const maxSvarNr = db.svar.reduce((max, s) => {
    const num = parseInt(s.SvarID.replace(/\D/g, ""), 10);
    return !isNaN(num) && num > max ? num : max;
  }, 0);
  const newSvarID = `S${String(maxSvarNr + 1).padStart(3, "0")}`;

  const now = new Date().toISOString().split("T")[0];

  const nyTildeling: Tildeling = {
    TildelingID: newTildelingID,
    GudstjenesteID: gudstjenesteID,
    RolleID: rolleID,
    PersonID: personID,
    OpprettetDato: now,
    SistEndret: now,
  };

  const nyttSvar: Svar = {
    SvarID: newSvarID,
    TildelingID: newTildelingID,
    PersonID: personID,
    Svar: "Bekreftet",
    Kommentar: kommentar || "Frivillig påmeldt via personlig visning",
    SvartDato: now,
  };

  const updatedDb: DatabaseState = {
    ...db,
    tildelinger: [...db.tildelinger, nyTildeling],
    svar: [...db.svar, nyttSvar],
  };

  saveDatabase(updatedDb);

  return {
    success: true,
    message: "Du er nå bekreftet påmeldt til rollen!",
    updatedDb,
  };
}

/**
 * Velg eller legg til en dato for en person på en rolle
 */
export function velgDatoForPerson(
  db: DatabaseState,
  personID: string,
  gudstjenesteID: string,
  rolleID: string
): { success: boolean; message: string; updatedDb?: DatabaseState } {
  // Sjekk om det allerede finnes en tildeling for personen på denne gudstjenesten og rollen
  const eksisterendeTildeling = db.tildelinger.find(
    (t) =>
      t.GudstjenesteID === gudstjenesteID &&
      t.RolleID === rolleID &&
      t.PersonID === personID
  );

  if (eksisterendeTildeling) {
    const updatedDb = svarPaaTildeling(
      db,
      eksisterendeTildeling.TildelingID,
      personID,
      "Bekreftet",
      "Valgt av person via Min side"
    );
    return {
      success: true,
      message: "Datoen er nå bekreftet for din oppgave!",
      updatedDb,
    };
  }

  // Hvis ingen tildeling finnes fra før, opprett ny tildeling og bekreftet svar
  const maxTildelingNr = db.tildelinger.reduce((max, t) => {
    const num = parseInt(t.TildelingID.replace(/\D/g, ""), 10);
    return !isNaN(num) && num > max ? num : max;
  }, 0);
  const newTildelingID = `T${String(maxTildelingNr + 1).padStart(3, "0")}`;

  const maxSvarNr = db.svar.reduce((max, s) => {
    const num = parseInt(s.SvarID.replace(/\D/g, ""), 10);
    return !isNaN(num) && num > max ? num : max;
  }, 0);
  const newSvarID = `S${String(maxSvarNr + 1).padStart(3, "0")}`;

  const now = new Date().toISOString().split("T")[0];

  const nyTildeling: Tildeling = {
    TildelingID: newTildelingID,
    GudstjenesteID: gudstjenesteID,
    RolleID: rolleID,
    PersonID: personID,
    OpprettetDato: now,
    SistEndret: now,
  };

  const nyttSvar: Svar = {
    SvarID: newSvarID,
    TildelingID: newTildelingID,
    PersonID: personID,
    Svar: "Bekreftet",
    Kommentar: "Valgt av person via Min side",
    SvartDato: now,
  };

  const updatedDb: DatabaseState = {
    ...db,
    tildelinger: [...db.tildelinger, nyTildeling],
    svar: [...db.svar, nyttSvar],
  };

  saveDatabase(updatedDb);

  return {
    success: true,
    message: "Datoen er lagt til og bekreftet for din oppgave!",
    updatedDb,
  };
}

/**
 * Oppdaterer eller oppretter svar på en tildeling (Bekreftet / Avvist)
 */
export function svarPaaTildeling(
  db: DatabaseState,
  tildelingID: string,
  personID: string,
  nyttSvarStatus: SvarStatus,
  kommentar?: string
): DatabaseState {
  const now = new Date().toISOString().split("T")[0];
  const eksisterendeSvarIndex = db.svar.findIndex(
    (s) => s.TildelingID === tildelingID && s.PersonID === personID
  );

  let updatedSvarListe: Svar[];

  if (eksisterendeSvarIndex >= 0) {
    updatedSvarListe = [...db.svar];
    updatedSvarListe[eksisterendeSvarIndex] = {
      ...updatedSvarListe[eksisterendeSvarIndex],
      Svar: nyttSvarStatus,
      Kommentar: kommentar !== undefined ? kommentar : updatedSvarListe[eksisterendeSvarIndex].Kommentar,
      SvartDato: now,
    };
  } else {
    const maxSvarNr = db.svar.reduce((max, s) => {
      const num = parseInt(s.SvarID.replace(/\D/g, ""), 10);
      return !isNaN(num) && num > max ? num : max;
    }, 0);
    const newSvarID = `S${String(maxSvarNr + 1).padStart(3, "0")}`;

    const nyttSvar: Svar = {
      SvarID: newSvarID,
      TildelingID: tildelingID,
      PersonID: personID,
      Svar: nyttSvarStatus,
      Kommentar: kommentar || "",
      SvartDato: now,
    };
    updatedSvarListe = [...db.svar, nyttSvar];
  }

  const updatedDb: DatabaseState = {
    ...db,
    svar: updatedSvarListe,
  };

  saveDatabase(updatedDb);
  return updatedDb;
}

/**
 * Gruppeleder-hjelpefunksjoner:
 * Finner grupper der personen er registrert som GruppelederID eller NestlederID
 */
export function finnGrupperForGruppeleder(
  db: DatabaseState,
  personID: string
): Gruppe[] {
  return db.grupper.filter(
    (g) =>
      g.Aktiv &&
      (g.GruppelederID === personID || g.NestlederID === personID)
  );
}

/**
 * Finner aktive medlemmer i en gitt gruppe
 */
export function finnMedlemmerIGruppe(
  db: DatabaseState,
  gruppeID: string
): { person: Person; medlemskap: Gruppemedlem; personroller: Rolle[] }[] {
  const medlemskapListe = db.gruppemedlemmer.filter(
    (gm) => gm.GruppeID === gruppeID && gm.Aktiv
  );

  return medlemskapListe
    .map((gm) => {
      const person = db.personer.find((p) => p.PersonID === gm.PersonID);
      if (!person) return null;

      const rolleIDs = db.personroller
        .filter((pr) => pr.PersonID === person.PersonID && pr.Aktiv)
        .map((pr) => pr.RolleID);

      const roller = db.roller.filter((r) => rolleIDs.includes(r.RolleID));

      return {
        person,
        medlemskap: gm,
        personroller: roller,
      };
    })
    .filter(Boolean) as {
    person: Person;
    medlemskap: Gruppemedlem;
    personroller: Rolle[];
  }[];
}

/**
 * Genererer en personlig direktelenke
 */
export function genererPersonligLenke(personID: string): string {
  const origin = window.location.origin;
  const path = window.location.pathname;
  return `${origin}${path}?personId=${personID}`;
}
