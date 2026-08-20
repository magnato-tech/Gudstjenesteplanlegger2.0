/**
 * Gudstjenesteplanlegger 2.0 — Google Apps Script backend
 *
 * Leser og skriver det eksisterende regnearket. Frontend (React) skal kalle
 * denne Web App-en som JSON-API. Import-faner skrives aldri.
 *
 * Publisering: Distribuer → Ny distribusjon → Nettapp
 * Kjør som: Meg
 * Hvem har tilgang: Alle
 */

var SPREADSHEET_ID = "15RPvcvccYA3yO8-8v_H1OatSgyx8WzXGqq0N4cJI0dU";

var MASTER_SHEETS = {
  gruppetyper: {
    name: "Gruppetyper",
    columns: ["GruppetypeID", "Navn", "Beskrivelse", "Aktiv", "OpprettetDato", "SistEndret"],
    booleans: ["Aktiv"],
  },
  personer: {
    name: "Personer",
    columns: [
      "PersonID", "Navn", "Fornavn", "Etternavn", "Epost", "Telefon", "BildeURL",
      "Fødselsår", "Fødselsdato", "Kjønn", "Adresse", "Postnummer", "Poststed",
      "Notat", "Aktiv", "OpprettetDato", "SistEndret",
    ],
    booleans: ["Aktiv"],
    numbers: ["Fødselsår"],
  },
  grupper: {
    name: "Grupper",
    columns: [
      "GruppeID", "Gruppenavn", "GruppetypeID", "GruppelederID", "NestlederID",
      "Beskrivelse", "Aktiv", "OpprettetDato", "SistEndret",
    ],
    booleans: ["Aktiv"],
  },
  gruppemedlemmer: {
    name: "Gruppemedlemmer",
    columns: [
      "GruppeMedlemID", "GruppeID", "PersonID", "Medlemsrolle", "Aktiv",
      "FraDato", "TilDato", "Notat", "OpprettetDato", "SistEndret",
    ],
    booleans: ["Aktiv"],
  },
  roller: {
    name: "Roller",
    columns: [
      "RolleID", "Rollenavn", "Beskrivelse", "Aktiv", "Behov", "GruppeID",
      "OpprettetDato", "SistEndret",
    ],
    booleans: ["Aktiv"],
    numbers: ["Behov"],
  },
  personroller: {
    name: "Personroller",
    columns: [
      "PersonRolleID", "PersonID", "RolleID", "Aktiv", "FraDato", "TilDato",
      "Notat", "OpprettetDato", "SistEndret",
    ],
    booleans: ["Aktiv"],
  },
  rollebeskrivelser: {
    name: "Rollebeskrivelser",
    columns: ["RolleID", "Rollebeskrivelse", "Aktiv", "OpprettetDato", "SistEndret"],
    booleans: ["Aktiv"],
  },
  gudstjenester: {
    name: "Gudstjenester",
    columns: ["GudstjenesteID", "Dato", "Tid", "Sted", "Tema", "Bibeltekst", "Kollekt", "Merknad"],
  },
  tjenestebehov: {
    name: "Tjenestebehov",
    columns: [
      "TjenestebehovID", "GudstjenesteID", "RolleID", "Antall", "Aktiv",
      "Notat", "OpprettetDato", "SistEndret",
    ],
    booleans: ["Aktiv"],
    numbers: ["Antall"],
  },
  tildelinger: {
    name: "Tildelinger",
    columns: ["TildelingID", "GudstjenesteID", "RolleID", "PersonID", "OpprettetDato", "SistEndret"],
  },
  svar: {
    name: "Svar",
    columns: ["SvarID", "TildelingID", "PersonID", "Svar", "Kommentar", "SvartDato"],
  },
};

var IMPORT_SHEETS = {
  personerImport: {
    name: "Personer_import",
    columns: [
      "PersonID", "Navn", "Epost", "Telefon",
      "Tjenesteområde1", "Tjenesteområde2", "Tjenesteområde3",
      "Tjenesteområde4", "Tjenesteområde5", "Aktiv",
    ],
    booleans: ["Aktiv"],
  },
  gudstjenesterImport: {
    name: "Gudstjenester_import",
    columns: [
      "GudstjenesteID", "Dato", "Tid", "Tema",
      "MøtelederGammel", "TalerGammel", "LovsangGammel", "LydGammel", "VertGammel",
    ],
  },
  rollebeskrivelseImport: {
    name: "Rollebeskrivelse_import",
    columns: ["RolleID", "Rollenavn", "FullBeskrivelse", "SjekklisteGammel"],
  },
};

function doGet(e) {
  try {
    var params = (e && e.parameter) ? e.parameter : {};
    var action = String(params.action || "load");

    if (action === "ui") {
      return HtmlService.createHtmlOutputFromFile("Bruker")
        .setTitle("Gudstjenesteplanlegger 2.0 — API")
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }

    if (action === "ping") {
      return json_({ ok: true, service: "Gudstjenesteplanlegger2.0", spreadsheetId: SPREADSHEET_ID });
    }

    if (action === "load") {
      return json_({ ok: true, data: loadDatabase() });
    }

    return json_({ ok: false, error: "Ukjent action: " + action }, 400);
  } catch (err) {
    return json_({ ok: false, error: String(err) }, 500);
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    var body = parseBody_(e);
    var action = String(body.action || ((e.parameter && e.parameter.action) || "save"));

    if (action === "load") {
      return json_({ ok: true, data: loadDatabase() });
    }

    if (action === "save") {
      if (!body.data) {
        return json_({ ok: false, error: "Mangler data" }, 400);
      }
      saveDatabase(body.data);
      return json_({ ok: true, data: loadDatabase() });
    }

    return json_({ ok: false, error: "Ukjent action: " + action }, 400);
  } catch (err) {
    return json_({ ok: false, error: String(err) }, 500);
  } finally {
    lock.releaseLock();
  }
}

function loadDatabase() {
  ensureSchema_();
  var ss = getSpreadsheet_();
  var state = {};
  var key;

  for (key in MASTER_SHEETS) {
    state[key] = readSheet_(ss, MASTER_SHEETS[key]);
  }
  for (key in IMPORT_SHEETS) {
    state[key] = readSheet_(ss, IMPORT_SHEETS[key]);
  }
  return state;
}

function saveDatabase(state) {
  ensureSchema_();
  var ss = getSpreadsheet_();
  var key;
  for (key in MASTER_SHEETS) {
    if (state[key]) {
      writeSheet_(ss, MASTER_SHEETS[key], state[key]);
    }
  }
  // Import-faner skrives aldri.
}

function getSpreadsheet_() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function ensureSchema_() {
  var ss = getSpreadsheet_();
  var key;
  for (key in MASTER_SHEETS) {
    ensureSheet_(ss, MASTER_SHEETS[key]);
  }
  for (key in IMPORT_SHEETS) {
    ensureSheet_(ss, IMPORT_SHEETS[key]);
  }
}

function ensureSheet_(ss, spec) {
  var sheet = ss.getSheetByName(spec.name);
  if (!sheet) {
    sheet = ss.insertSheet(spec.name);
    sheet.getRange(1, 1, 1, spec.columns.length).setValues([spec.columns]);
    sheet.setFrozenRows(1);
    return;
  }
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, spec.columns.length).setValues([spec.columns]);
    sheet.setFrozenRows(1);
  }
}

function readSheet_(ss, spec) {
  var sheet = ss.getSheetByName(spec.name);
  if (!sheet) return [];
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 1 || lastCol < 1) return [];

  var values = sheet.getRange(1, 1, lastRow, lastCol).getDisplayValues();
  if (!values.length) return [];

  var headers = values[0].map(function (h) { return String(h).trim(); });
  var rows = [];
  var i;
  var j;

  for (i = 1; i < values.length; i++) {
    var raw = values[i];
    var empty = true;
    for (j = 0; j < raw.length; j++) {
      if (String(raw[j]).trim() !== "") {
        empty = false;
        break;
      }
    }
    if (empty) continue;

    var obj = {};
    for (j = 0; j < spec.columns.length; j++) {
      var col = spec.columns[j];
      var idx = headers.indexOf(col);
      var val = idx >= 0 ? raw[idx] : "";
      obj[col] = coerce_(col, val, spec);
    }

    if (isBlankRecord_(obj, spec)) continue;
    enrichRecord_(obj, spec);
    rows.push(obj);
  }
  return rows;
}

function isBlankRecord_(obj, spec) {
  var idCol = spec.columns[0];
  var idVal = obj[idCol];
  if (idVal !== "" && idVal !== 0 && idVal !== false && idVal != null) return false;
  if (obj.Navn && String(obj.Navn).trim()) return false;
  if (obj.PersonID && String(obj.PersonID).trim()) return false;
  if (obj.GruppeID && String(obj.GruppeID).trim()) return false;
  if (obj.RolleID && String(obj.RolleID).trim()) return false;
  if (obj.Dato && String(obj.Dato).trim()) return false;
  return true;
}

function enrichRecord_(obj, spec) {
  if (spec.columns.indexOf("Fornavn") < 0) return;
  if (obj.Navn && !obj.Fornavn) {
    var parts = String(obj.Navn).trim().split(/\s+/);
    obj.Fornavn = parts[0] || "";
    if (!obj.Etternavn) obj.Etternavn = parts.slice(1).join(" ");
  }
}

function writeSheet_(ss, spec, records) {
  var sheet = ss.getSheetByName(spec.name);
  if (!sheet) {
    sheet = ss.insertSheet(spec.name);
  }

  var existingRows = Math.max(sheet.getMaxRows(), 1);
  var existingCols = Math.max(sheet.getMaxColumns(), spec.columns.length);
  sheet.clearContents();
  if (existingCols < spec.columns.length) {
    sheet.insertColumnsAfter(existingCols, spec.columns.length - existingCols);
  }

  var output = [spec.columns];
  var i;
  var j;
  for (i = 0; i < records.length; i++) {
    var rec = records[i] || {};
    var row = [];
    for (j = 0; j < spec.columns.length; j++) {
      row.push(serialize_(spec.columns[j], rec[spec.columns[j]], spec));
    }
    output.push(row);
  }

  sheet.getRange(1, 1, output.length, spec.columns.length).setValues(output);
  sheet.setFrozenRows(1);
}

function coerce_(col, val, spec) {
  if (val === null || val === undefined) return "";
  var text = String(val).trim();
  var booleans = spec.booleans || [];
  var numbers = spec.numbers || [];

  if (booleans.indexOf(col) >= 0) {
    // Tom Aktiv-celle i arket betyr «ikke satt» — da er raden aktiv.
    return asBool_(text, true);
  }
  if (numbers.indexOf(col) >= 0) {
    if (text === "") return col === "Fødselsår" ? "" : 0;
    var n = Number(String(text).replace(",", "."));
    return isNaN(n) ? 0 : n;
  }
  return text;
}

function serialize_(col, val, spec) {
  var booleans = spec.booleans || [];
  if (booleans.indexOf(col) >= 0) {
    return asBool_(val) ? "TRUE" : "FALSE";
  }
  if (val === null || val === undefined) return "";
  return val;
}

function asBool_(val, defaultIfEmpty) {
  if (val === true || val === 1) return true;
  if (val === false || val === 0) return false;
  if (val === "" || val === null || val === undefined) {
    return defaultIfEmpty === undefined ? false : defaultIfEmpty;
  }
  var s = String(val).trim().toUpperCase();
  if (s === "TRUE" || s === "JA" || s === "1" || s === "X") return true;
  if (s === "FALSE" || s === "NEI" || s === "0") return false;
  return defaultIfEmpty === undefined ? false : defaultIfEmpty;
}

function parseBody_(e) {
  if (!e) return {};
  if (e.postData && e.postData.contents) {
    var raw = e.postData.contents;
    try {
      return JSON.parse(raw);
    } catch (err) {
      return { raw: raw };
    }
  }
  return (e.parameter) ? e.parameter : {};
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Test fra editor: Kjør loadDatabase */
function testLoad() {
  var data = loadDatabase();
  Logger.log("Personer: " + data.personer.length);
  Logger.log("Gudstjenester: " + data.gudstjenester.length);
  Logger.log("Tildelinger: " + data.tildelinger.length);
  return data;
}
