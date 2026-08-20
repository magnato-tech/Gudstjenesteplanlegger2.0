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

const REMOTE_SCRIPT_URL =
  (import.meta.env.VITE_APPS_SCRIPT_URL as string | undefined) ||
  "https://script.google.com/macros/s/AKfycbznLoq62orP53izSEA0wnA7VdQHiNWpP3upTo2nd1owcL3LDZp13gK8LxrAdsjxWwt7vw/exec";

function getApiBase(): string {
  if (!REMOTE_SCRIPT_URL) return "";
  if (import.meta.env.DEV) return "/gas-api";
  return REMOTE_SCRIPT_URL.replace(/\/$/, "");
}

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

function emptyState(): DatabaseState {
  return {
    gruppetyper: [],
    personer: [],
    grupper: [],
    gruppemedlemmer: [],
    roller: [],
    personroller: [],
    rollebeskrivelser: [],
    gudstjenester: [],
    tjenestebehov: [],
    tildelinger: [],
    svar: [],
    personerImport: [],
    gudstjenesterImport: [],
    rollebeskrivelseImport: [],
  };
}

function normalizeState(parsed: Partial<DatabaseState> | null | undefined): DatabaseState {
  const base = emptyState();
  if (!parsed) return base;
  return {
    gruppetyper: Array.isArray(parsed.gruppetyper) ? parsed.gruppetyper : base.gruppetyper,
    personer: Array.isArray(parsed.personer) ? parsed.personer : base.personer,
    grupper: Array.isArray(parsed.grupper) ? parsed.grupper : base.grupper,
    gruppemedlemmer: Array.isArray(parsed.gruppemedlemmer) ? parsed.gruppemedlemmer : base.gruppemedlemmer,
    roller: Array.isArray(parsed.roller) ? parsed.roller : base.roller,
    personroller: Array.isArray(parsed.personroller) ? parsed.personroller : base.personroller,
    rollebeskrivelser: Array.isArray(parsed.rollebeskrivelser) ? parsed.rollebeskrivelser : base.rollebeskrivelser,
    gudstjenester: Array.isArray(parsed.gudstjenester) ? parsed.gudstjenester : base.gudstjenester,
    tjenestebehov: Array.isArray(parsed.tjenestebehov) ? parsed.tjenestebehov : base.tjenestebehov,
    tildelinger: Array.isArray(parsed.tildelinger) ? parsed.tildelinger : base.tildelinger,
    svar: Array.isArray(parsed.svar) ? parsed.svar : base.svar,
    personerImport: Array.isArray(parsed.personerImport) ? parsed.personerImport : base.personerImport,
    gudstjenesterImport: Array.isArray(parsed.gudstjenesterImport) ? parsed.gudstjenesterImport : base.gudstjenesterImport,
    rollebeskrivelseImport: Array.isArray(parsed.rollebeskrivelseImport)
      ? parsed.rollebeskrivelseImport
      : base.rollebeskrivelseImport,
  };
}

function loadLocalDatabase(): DatabaseState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (
        Array.isArray(parsed.personer) &&
        Array.isArray(parsed.grupper) &&
        Array.isArray(parsed.roller) &&
        Array.isArray(parsed.gudstjenester)
      ) {
        return normalizeState({
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
          rollebeskrivelseImport: Array.isArray(parsed.rollebeskrivelseImport)
            ? parsed.rollebeskrivelseImport
            : initialRollebeskrivelseImport,
        });
      }
    }
  } catch (e) {
    console.warn("Kunne ikke laste lagret database, bruker initielle data:", e);
  }

  return {
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
}

async function fetchJson(url: string, init?: RequestInit): Promise<string> {
  let lastError = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, init);
      const text = await response.text();
      if (text.trim()) return text;
      lastError = "Tomt svar fra Google Sheets.";
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
    await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
  }
  throw new Error(
    lastError || "Kunne ikke nå Google Sheets. Last siden på nytt, eller start npm run dev på nytt."
  );
}

export async function loadDatabase(): Promise<DatabaseState> {
  const base = getApiBase();
  if (!base) {
    const local = loadLocalDatabase();
    saveDatabase(local);
    return local;
  }

  const text = await fetchJson(`${base}?action=load`);
  let payload: { ok?: boolean; error?: string; data?: Partial<DatabaseState> };
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error("Ugyldig svar fra Google Sheets. Prøv å laste siden på nytt.");
  }
  if (!payload?.ok) {
    throw new Error(payload?.error || "Kunne ikke laste data fra Google Sheets");
  }
  return normalizeState(payload.data);
}

export function saveDatabase(state: DatabaseState): void {
  const base = getApiBase();
  if (!base) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error("Kunne ikke lagre til localStorage:", e);
    }
    return;
  }

  void fetch(base, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: "save", data: state }),
  }).then(async (response) => {
    const payload = await response.json().catch(() => null);
    if (!payload?.ok) {
      console.error("Kunne ikke lagre til Google Sheets:", payload?.error || response.statusText);
    }
  }).catch((e) => {
    console.error("Kunne ikke lagre til Google Sheets:", e);
  });
}

export async function resetDatabase(): Promise<DatabaseState> {
  if (getApiBase()) {
    return loadDatabase();
  }
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

export type AppView = "personal" | "leader" | "admin";

export interface PersonTilgang {
  isLeader: boolean;
  isAdmin: boolean;
  views: AppView[];
}

function erAdministrator(db: DatabaseState, personID: string): boolean {
  const person = db.personer.find((p) => p.PersonID === personID);
  if (!person || !person.Aktiv) return false;

  const adminRolle = (db.roller || []).find(
    (r) => r.Aktiv && String(r.Rollenavn || "").trim().toLowerCase() === "administrator"
  );
  if (adminRolle) {
    const harRolle = (db.personroller || []).some(
      (pr) => pr.Aktiv && pr.PersonID === personID && pr.RolleID === adminRolle.RolleID
    );
    if (harRolle) return true;
  }

  if (person.PersonID === "P009") return true;
  const navn = String(person.Navn || "").trim().toLowerCase();
  const fornavn = String(person.Fornavn || "").trim().toLowerCase();
  return fornavn === "magnar" || navn === "magnar" || navn.startsWith("magnar ");
}

/** Tilgang for aktiv person: vanlige brukere, gruppeledere og administrator (Magnar). */
export function hentTilgang(db: DatabaseState, personID: string): PersonTilgang {
  const isAdmin = erAdministrator(db, personID);
  const isLeader = finnGrupperForGruppeleder(db, personID).length > 0;
  const views: AppView[] = ["personal"];
  if (isLeader || isAdmin) views.push("leader");
  if (isAdmin) views.push("admin");
  return { isLeader, isAdmin, views };
}

export function visningErTillatt(tilgang: PersonTilgang, view: AppView): boolean {
  return tilgang.views.indexOf(view) >= 0;
}

export interface PersonGruppeTilknytning {
  gruppe: Gruppe;
  tilknytning: "Leder" | "Nestleder" | "Medlem";
}

/** Grupper personen leder, er nestleder for, eller er medlem av. */
export function finnTjenestegrupperForPerson(
  db: DatabaseState,
  personID: string
): PersonGruppeTilknytning[] {
  const byId = new Map<string, PersonGruppeTilknytning>();

  for (const gruppe of db.grupper) {
    if (!gruppe.Aktiv) continue;
    if (gruppe.GruppelederID === personID) {
      byId.set(gruppe.GruppeID, { gruppe, tilknytning: "Leder" });
    } else if (gruppe.NestlederID === personID) {
      byId.set(gruppe.GruppeID, { gruppe, tilknytning: "Nestleder" });
    }
  }

  for (const gm of db.gruppemedlemmer) {
    if (!gm.Aktiv || gm.PersonID !== personID) continue;
    if (byId.has(gm.GruppeID)) continue;
    const gruppe = db.grupper.find((g) => g.GruppeID === gm.GruppeID);
    if (gruppe) byId.set(gruppe.GruppeID, { gruppe, tilknytning: "Medlem" });
  }

  return Array.from(byId.values());
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

const IMPORT_ROLE_COLUMNS: { col: keyof GudstjenesterImport; rolleId: string }[] = [
  { col: "Leder", rolleId: "R001" },
  { col: "Taler", rolleId: "R002" },
  { col: "Forbønn", rolleId: "R003" },
  { col: "Barnekirke", rolleId: "R004" },
  { col: "Lovsang", rolleId: "R005" },
  { col: "Lyd", rolleId: "R006" },
  { col: "Bilde", rolleId: "R007" },
  { col: "Møtevert", rolleId: "R008" },
  { col: "Rigging", rolleId: "R009" },
  { col: "Kjøkken", rolleId: "R010" },
  { col: "Baking", rolleId: "R011" },
  { col: "Pynting", rolleId: "R012" },
];

function normalizePersonName(value: string): string {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function splitImportNames(value: unknown): string[] {
  return String(value ?? "")
    .split(/[,;]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function matchPersonByName(db: DatabaseState, rawName: string): Person | null {
  const key = normalizePersonName(rawName);
  if (!key) return null;
  const byNavn = db.personer.filter((p) => normalizePersonName(p.Navn) === key);
  if (byNavn.length === 1) return byNavn[0];
  if (byNavn.length > 1) return null;
  const byFornavn = db.personer.filter((p) => {
    const fn = normalizePersonName(p.Fornavn) || normalizePersonName(p.Navn).split(" ")[0];
    return fn === key;
  });
  return byFornavn.length === 1 ? byFornavn[0] : null;
}

export interface UkjentImportSlot {
  gudstjenesteId: string;
  rolleId: string;
  rolleNavn: string;
  dato: string;
}

export interface UkjentImportnavn {
  navn: string;
  slots: UkjentImportSlot[];
}

/** Navn i Gudstjenester_import som ikke matcher Personer — admin kan opprette dem. */
export function finnUkjenteImportnavn(db: DatabaseState): UkjentImportnavn[] {
  const grouped = new Map<string, UkjentImportnavn>();

  for (const row of db.gudstjenesterImport || []) {
    const gudstjenesteId = String(row.GudstjenesteID || "").trim();
    if (!gudstjenesteId) continue;
    const gud = db.gudstjenester.find((g) => g.GudstjenesteID === gudstjenesteId);

    for (const mapping of IMPORT_ROLE_COLUMNS) {
      const names = splitImportNames(row[mapping.col]);
      const rolle = db.roller.find((r) => r.RolleID === mapping.rolleId);
      for (const navn of names) {
        if (matchPersonByName(db, navn)) continue;
        const key = normalizePersonName(navn);
        const existing = grouped.get(key) || { navn, slots: [] };
        const already = existing.slots.some(
          (s) => s.gudstjenesteId === gudstjenesteId && s.rolleId === mapping.rolleId
        );
        if (!already) {
          existing.slots.push({
            gudstjenesteId,
            rolleId: mapping.rolleId,
            rolleNavn: rolle?.Rollenavn || mapping.col,
            dato: gud?.Dato || row.Dato || "",
          });
        }
        grouped.set(key, existing);
      }
    }
  }

  return Array.from(grouped.values());
}

function nesteNummerertId<T>(records: T[], field: keyof T, prefix: string): string {
  const max = records.reduce((acc, rec) => {
    const num = parseInt(String(rec[field] ?? "").replace(/\D/g, ""), 10);
    return !isNaN(num) && num > acc ? num : acc;
  }, 0);
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

export function nesteGruppeMedlemId(gruppemedlemmer: Gruppemedlem[]): string {
  return nesteNummerertId(gruppemedlemmer, "GruppeMedlemID", "GM");
}

/** Aktiver eksisterende rad, eller opprett ny GM…-rad for personen i gruppen. */
export function sikreGruppemedlemskap(
  gruppemedlemmer: Gruppemedlem[],
  gruppeId: string,
  personId: string,
  medlemsrolle?: string
): Gruppemedlem[] {
  if (!personId) return gruppemedlemmer;
  const now = new Date().toISOString().split("T")[0];
  const existing = gruppemedlemmer.find(
    (gm) => gm.GruppeID === gruppeId && gm.PersonID === personId
  );
  if (existing) {
    return gruppemedlemmer.map((gm) =>
      gm.GruppeMedlemID === existing.GruppeMedlemID
        ? {
            ...gm,
            Aktiv: true,
            Medlemsrolle:
              medlemsrolle !== undefined ? medlemsrolle : gm.Medlemsrolle,
            SistEndret: now,
          }
        : gm
    );
  }
  const ny: Gruppemedlem = {
    GruppeMedlemID: nesteGruppeMedlemId(gruppemedlemmer),
    GruppeID: gruppeId,
    PersonID: personId,
    Medlemsrolle: medlemsrolle || "Medlem",
    Aktiv: true,
    FraDato: now,
    TilDato: "",
    Notat: "",
    OpprettetDato: now,
    SistEndret: now,
  };
  return [...gruppemedlemmer, ny];
}

/** Ett felt: fornavn alene, eller fornavn + etternavn når det står i kilden / skrives inn. */
export function splittVisningsnavn(raw: string): { Navn: string; Fornavn: string; Etternavn: string } {
  const parts = String(raw || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { Navn: "", Fornavn: "", Etternavn: "" };
  if (parts.length === 1) {
    return { Navn: parts[0], Fornavn: parts[0], Etternavn: "" };
  }
  const etternavn = parts[parts.length - 1];
  const fornavn = parts.slice(0, -1).join(" ");
  return { Navn: `${fornavn} ${etternavn}`.trim(), Fornavn: fornavn, Etternavn: etternavn };
}

/** Opprett person. Etternavn lagres bare hvis navnet har mer enn ett ord. */
export function opprettPersonIRegister(
  db: DatabaseState,
  input: { Navn: string },
  slots: UkjentImportSlot[] = []
): DatabaseState {
  const now = new Date().toISOString().split("T")[0];
  const navn = splittVisningsnavn(input.Navn);
  const person: Person = {
    PersonID: nesteNummerertId(db.personer, "PersonID", "P"),
    Navn: navn.Navn,
    Fornavn: navn.Fornavn,
    Etternavn: navn.Etternavn,
    Epost: "",
    Telefon: "",
    Notat: "",
    Aktiv: true,
    OpprettetDato: now,
    SistEndret: now,
  };

  let tildelinger = [...db.tildelinger];
  let svar = [...db.svar];
  let personroller = [...db.personroller];

  for (const slot of slots) {
    const alreadyAssigned = tildelinger.some(
      (t) =>
        t.GudstjenesteID === slot.gudstjenesteId &&
        t.RolleID === slot.rolleId &&
        t.PersonID === person.PersonID
    );
    if (alreadyAssigned) continue;

    const tildelingId = nesteNummerertId(tildelinger, "TildelingID", "T");
    tildelinger = [
      ...tildelinger,
      {
        TildelingID: tildelingId,
        GudstjenesteID: slot.gudstjenesteId,
        RolleID: slot.rolleId,
        PersonID: person.PersonID,
        OpprettetDato: now,
        SistEndret: now,
      },
    ];
    svar = [
      ...svar,
      {
        SvarID: nesteNummerertId(svar, "SvarID", "S"),
        TildelingID: tildelingId,
        PersonID: person.PersonID,
        Svar: "Venter",
        Kommentar: "",
        SvartDato: "",
      },
    ];

    const hasRolle = personroller.some(
      (pr) => pr.PersonID === person.PersonID && pr.RolleID === slot.rolleId && pr.Aktiv
    );
    if (!hasRolle) {
      personroller = [
        ...personroller,
        {
          PersonRolleID: nesteNummerertId(personroller, "PersonRolleID", "PR"),
          PersonID: person.PersonID,
          RolleID: slot.rolleId,
          Aktiv: true,
          FraDato: now,
          TilDato: "",
          Notat: "",
          OpprettetDato: now,
          SistEndret: now,
        },
      ];
    }
  }

  return {
    ...db,
    personer: [...db.personer, person],
    tildelinger,
    svar,
    personroller,
  };
}
