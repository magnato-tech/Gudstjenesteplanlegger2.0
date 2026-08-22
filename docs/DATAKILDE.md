# Datakilde: mock vs Google Sheets

## Hvordan utvikler bruker mock-data

På localhost er mock standard.

```bash
npm run dev
```

La `VITE_USE_REMOTE_DATA` være unset eller `false` (se `.env.example`). Appen leser `localStorage` (`gudstjenesteplanlegger_db_v2`) eller `src/data/initialData.ts`. Endringer lagres kun lokalt og sendes ikke til Google Sheets.

## Hvordan utvikler tester ekte Google Sheets lokalt

1. Kopier `.env.example` til `.env`.
2. Sett:

```
VITE_USE_REMOTE_DATA=true
```

3. Stopp og start `npm run dev` på nytt (Vite leser env ved oppstart).

Appen kaller da `/gas-api?action=load` (proxy mot Apps Script). Timeout er 15 sekunder.

Hvis kallet feiler, vises feil + **Prøv igjen**. I utvikling vises også **Bruk mock-data** for denne økten. Mock-fallback skriver ikke til arket. Last siden på nytt for å prøve Sheets igjen.

## Hvordan produksjon bruker Google Sheets

`npm run build` setter `import.meta.env.PROD`. Produksjon bruker alltid Apps Script / Google Sheets, uansett `VITE_USE_REMOTE_DATA`. Det finnes ingen mock-fallback.

Standard Web App-URL er den i `VITE_APPS_SCRIPT_URL` (innbakt ved build) eller den hardkodede menighets-URL-en.

Verifiser før deployment:

```bash
npm run build
npm run preview
```

Preview kaller Google direkte (ikke `/gas-api`). Du skal se data fra arket, ikke Magnar Totland fra mock.

## Hva brukeren ser hvis backend er nede

- Lasteskjerm: «Laster data fra menighetsarket …»
- Ved feil: «Kunne ikke laste menighetsarket» + **Prøv igjen**
- Produksjon: ingen mock-knapp og ingen stille testdata
- Utvikling med `VITE_USE_REMOTE_DATA=true`: samme skjerm, pluss **Bruk mock-data**

## Environment variables

| Variabel | Utvikling | Produksjon |
|---|---|---|
| `VITE_USE_REMOTE_DATA` | `false` / unset = mock. `true` = Sheets | Ignoreres (alltid Sheets) |
| `VITE_APPS_SCRIPT_URL` | Apps Script `/exec`-URL (valgfri; har default) | Innbakes ved build |

`GEMINI_API_KEY` og `APP_URL` brukes ikke av datalaget mot Sheets.

## Hvordan verifisere produksjonsflyten før deployment

1. Localhost + mock: `npm run dev` uten flagg — mock-personer (f.eks. Magnar Totland P001).
2. Localhost + Sheets: `.env` med `VITE_USE_REMOTE_DATA=true`, restart — arket (ikke mock).
3. Produksjonsbuild: `npm run build && npm run preview` mot gyldig URL — arket, ingen mock ved feil.
4. Simulert API-feil: bygg med ugyldig `VITE_APPS_SCRIPT_URL` og kjør preview — feilskjerm + Prøv igjen, ingen mock.
