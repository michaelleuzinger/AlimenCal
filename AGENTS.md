# AGENTS.md – Arbeitsregeln für AlimenCal

Diese Regeln gelten für alle (menschengemachten und automatisierten) Änderungen
an diesem Repository.

## Verbindliche Regel: Doku aktuell halten

**Bei jeder Änderung an Code, Konfiguration, Richtwerten, Presets, UI, i18n
oder Tests müssen Doku und README im selben Change mit angepasst und mitgeliefert
werden ("Docs-in-sync-Regel").** Ein Change ohne Doku-Nachführung gilt als
unvollständig und darf nicht gemergt werden.

### Was muss geprüft/angepasst werden?

| Änderung | Nachzuführen in |
|---|---|
| Berechnungslogik (`js/calculator.js`) | `docs/KALKULATION.md`, README-Abschnitt «Tests»/«Richtwerte» |
| Kostentrennung (`js/costsplit.js`, zugehörige UI) | `docs/KOSTENTRENNUNG.md` |
| UI/Bedienung, neue Tabs oder Felder | `docs/BENUTZERHANDBUCH.md`, README-Abschnitt «Nutzung» |
| Richtwerte / Defaults (`js/config.js`) | `docs/KALKULATION.md` (Wertetabelle), README-Abschnitt «Verwendete Richtwerte», Quellenangaben inkl. Datum «Stand: …» |
| Presets (`presets/*.json`, `js/presets.js`) | README-Abschnitt «Kantonale Presets», Preset-`meta` (Quelle, URL, Hinweise) |
| Sprachen / i18n (`js/i18n/*`) | `docs/BENUTZERHANDBUCH.md` (Sprachliste), ggf. README |
| Struktur / neue Dateien | Struktur-Übersicht unten |
| localStorage-Persistenz (`js/storage.js`) | Regel-Abschnitt «Lesbarkeit der Nutzerdaten nach Updates» unten, `docs/BENUTZERHANDBUCH.md` (Datenhaltung), README-Abschnitt «Tests» |
| Screenshots (UI-Änderungen) | `screenshots/` erneuern; Inventar-Tabelle unten **und** Einbettungen im BENUTZERHANDBUCH synchron halten (Inventar-Regel, s. u.) |
| Rechtliches / Rechtsprechungs-Bezug | `docs/RECHTLICHE-GRUNDLAGEN.md` |

### Zusätzlich gilt

- **Screenshots**: Sichtbare UI-Änderungen erfordern erneuerte Screenshots
  der betroffenen Ansichten – in allen vier Sprachen und allen drei
  Geraetetypen (Erzeugung siehe unten).
- **Screenshot-Erstellung**:
  - Ausführen: `node tools/make-screenshots.js` (erzeugt alle Geraetetypen; mit `--devices pc,iphone,ipad` einschraenkbar; nutzt Puppeteer/Headless-Chromium,
    Installation von Puppeteer ausserhalb des Repos: `npm i puppeteer`)
  - Erzeugt automatisch die PNGs unter `screenshots/<geraet>/` (fortlaufend
    nummeriert, Sprache im Suffix, z. B. `pc/01-kindesunterhalt-de.png`),
    je Ansicht in allen vier Sprachen
  - Bei jeder sichtbaren UI-Änderung neu ausführen und die erzeugten PNGs
    committen
- **Screenshot-Inventar (Regel)**: Die Anzahl und der Inhalt der Screenshots
  dürfen und sollen bei Änderungen überdacht und angepasst werden. Massgebend:
  1. **Ein Screenshot pro Ansicht/Feature, Sprache und Geraetetyp** – je
     in allen vier Sprachen (de, fr, it, en) und allen drei Geraetetypen
     (pc, iphone, ipad), jeweils mit aussagekräftigen (anonymisierten)
     Beispieldaten, so dass die Kernfunktion der Ansicht sichtbar ist.
  2. **Duplikate nur bei dokumentiertem Mehrwert** und dann immer aktuell
     halten (Beispiel: Theme-Varianten Classic/Dark, weil das Theme selbst
     das Feature ist).
  4. **Einbettungsort**: README enthält genau einen Hero-Shot (Tab
     Kindesunterhalt); alle weiteren Ansichten sind im
     `docs/BENUTZERHANDBUCH.md` jeweils im zugehörigen Abschnitt eingebettet
     (Pfad von docs/ aus: `../screenshots/…`). Keine Doppel-Einbettungen
     derselben Datei an mehreren Orten ausser dem Hero-Shot im README.
  5. **Nachführung im selben Change**: `tools/make-screenshots.js` (VIEWS),
     Inventar-Tabelle (unten) und die Einbettungen im
     BENUTZERHANDBUCH sind konsistent zu halten; entfernte Screenshots sind
     auch aus README/Handbuch zu löschen (keine toten Links).
### Screenshot-Inventar

Screenshots sind nach Geraetetyp gegliedert: `screenshots/pc/` (1395x2084),
`screenshots/iphone/` (390x844), `screenshots/ipad/` (820x1180).
Vereinbart sind insgesamt 3 Geraetetypen: PC, iPhone, iPad. Jede Ansicht
wird je Geraetetyp in allen vier Sprachen (de, fr, it, en) erzeugt
(Suffix im Dateinamen); insgesamt 8 Ansichten x 4 Sprachen x 3 Geraete
= 96 PNGs.

| Screenshot (je `pc/`, `iphone/`, `ipad/`, Suffix `-de/-fr/-it/-en`) | Inhalt |
|---|---|
| `01-kindesunterhalt-<lang>.png` | Kindesunterhalt inkl. Aufwandsmodus und Resultat; Hero-Shot README + Handbuch |
| `02-ehegattenunterhalt-<lang>.png` | Ehegattenunterhalt mit Bedarf/Leistungsfähigkeit und Resultat |
| `03-kostentrennung-<lang>.png` | Kostentrennung mit anonymisiertem Bankexport, Zuordnungen und Ausgleich |
| `04-austausch-<lang>.png` | Austausch-Tab mit Export/Import |
| `05-hauptmenue-<lang>.png` | Hamburger-Menü geöffnet: alle Navigationseinträge und Sprachwahl |
| `06-richtwerte-<lang>.png` | Richtwerte mit Preset-Auswahl und Wertetabelle |
| `07-themes-classic-<lang>.png` | Themes mit Theme-Editor, Classic |
| `08-themes-dark-<lang>.png` | Themes, Dark-Theme (Duplikat von 07, legitimiert: dokumentiertes Feature) |

### Struktur

```
index.html          UI (Hamburger-Menü oben rechts mit Navigation: Kindesunterhalt, Ehegattenunterhalt, Kostentrennung, Austausch, Richtwerte, Themes, Über und Sprachwahl)
css/style.css       Styles
js/calculator.js    Berechnungskern (DOM-frei, auch in Node.js lauffähig)
js/costsplit.js     Kostentrennung: CSV-Import, Zuordnung, Ausgleich (DOM-frei)
js/themes.js       Theme-Definitionen und -Validierung (DOM-frei, auch in Node.js lauffähig)
js/casedata.js     Falldaten-Austausch: Validierung und Merge (DOM-frei)
js/settings.js     Verbindliche Einstellungen: Two-Party-Lock, Override-Modus, Read-Only-Imports (DOM-frei)
js/casecrypto.js   Verschlüsselter Austausch-Export: ECDH P-256 + AES-GCM (DOM-frei, auch in Node.js lauffähig)
js/config.js        Default-Richtwerte (Zürcher Kinderkosten-Tabelle 1.3.2025)
js/presets.js       Eingebettete Kopie der kantonalen Presets (file://-fähig)
presets/*.json      Kantonale Richtwertsätze inkl. Quellen und Checklisten
js/storage.js      localStorage-Persistenz: Versionierung, Sanitizing, Migration (DOM-frei)
js/app.js           UI-Logik, i18n-Anwendung, localStorage, Import/Export
js/i18n/{de,fr,it,en}.js  Sprachdateien
AGENTS.md           Verbindliche Arbeitsregeln (Doku-in-Sync-Regel, Checklisten)
docs/               Benutzerhandbuch, Berechnungslogik, Kostentrennung, Rechtliches, Verbindliche Einstellungen
schema/             Optionales SQL-Referenzschema (Immutability-Trigger) für spätere Persistenz
screenshots/        Screenshots der App (Inventar-Regel: s. AGENTS.md; Erzeugung tools/make-screenshots.js)
tools/              make-screenshots.js: Screenshot-Generator (Puppeteer, s. AGENTS.md)
tests/              Unit-Tests (node)
```

- **Tests**: Neue Funktionalität erhält Unit-Tests; wird die Anzahl/geprüfte
  Fälle geändert, sind die Test-Zahlen im README zu aktualisieren.
- **Roadmap**: Erledigte Punkte im README werden abgehakt, neue geplante
  Features aufgenommen.
- **Quellen**: Geänderte Richtwerte erfordern eine geprüfte Quellenangabe
  (Dokument, Datum, URL); für den Kanton Schaffhausen bleibt die
  Verifikations-Checkliste (`presets/schaffhausen-offen.json`) verbindlich.
- **Commit**: Doku- und Code-Änderungen gehören in denselben Commit bzw.
  dieselbe PR; die Commit-Message nennt die nachgeführten Dokumente.

### Kurz-Checkliste vor jedem Merge

- [ ] Alle betroffenen `docs/*.md` aktualisiert
- [ ] README aktuell (Features, QuickStart, Nutzung, Richtwerte, Tests, Roadmap)
- [ ] Screenshots bei UI-Änderungen erneuert
- [ ] `node tests/*.test.js` grün
- [ ] Persistenz-Kompatibilität geprüft (Checkliste oben)
- [ ] Rechtlicher Disclaimer bleibt vollständig erhalten

## Verbindliche Regel: Lesbarkeit der Nutzerdaten nach Updates

**Bei jeder Änderung, die gespeicherte Datenstrukturen betrifft, muss
sichergestellt sein, dass bestehende Nutzerdaten nach dem Update gelesen
werden können ("Persistenz-Kompatibilitäts-Regel").** Der Nachweis erfolgt
durch Unit-Tests; ein Change ohne grünen Kompatibilitätstest gilt als
unvollständig und darf nicht gemergt werden.

### Was bedeutet das konkret?

| Bereich | Persistenz | Vorgabe bei Änderung |
|---|---|---|
| Formular, Kinder, Kostentrennung | `alimencal.form` über `js/storage.js` (`AlimenCal.storage`) | `FORM_VERSION` in `js/storage.js` erhöhen, Migration in `migrateForm` ergänzen, Test mit Payload der vorherigen Version in `tests/storage.test.js` |
| Falldaten-Import/Export | JSON-Dateien über `js/casedata.js` | `CASE_VERSION` erhöhen und `sanitizeCase`/Migrationspfad ergänzen; Roundtrip-Test in `tests/casedata.test.js` |
| Richtwerte/Config | `alimencal.config` über `getCfg` (Merge mit Defaults) | Neue Felder müssen Defaults aus `js/config.js` erben; bestehende Felder nicht umbenennen oder entfernen |
| Themes | `alimencal.theme`, `alimencal.themevalues` über `js/themes.js`-Validierung | Ungültige Werte müssen still auf Defaults fallen; Test in `tests/themes.test.js` |
| Schlüssel/Lock-Dateien (`js/settings.js`) | `alimencal.keys`, signierte Dateien | Version in den Dateien führen (`version: 1`) und beim Einlesen prüfen |

### Kurz-Checkliste Persistenz vor jedem Merge

- [ ] Schema-Änderungen? -> `FORM_VERSION`/`CASE_VERSION` erhöht + Migration + Test mit Altdaten
- [ ] Keine Feld-/Schlüsselnamen ohne Migrationspfad umbenannt oder entfernt
- [ ] `node tests/storage.test.js` (und `node tests/casedata.test.js`) grün
- [ ] Neue Felder tolerieren fehlende Werte (Defaults, kein Absturz beim Lesen von Altdaten)

## Allgemeine Regeln

- Kleinste korrekte Änderung; bestehende Nutzerdaten (localStorage-Formate)
  nicht brechen (Details: Persistenz-Kompatibilitäts-Regel oben).
- Keine neuen Abhängigkeiten; die App bleibt eine statische, serverlose
  Web-App (Vanilla JS).
- Berechnungs- und Parsing-Kerne (`js/calculator.js`, `js/costsplit.js`)
  bleiben DOM-frei (Node-Tests).
- Keine Secrets oder persönliche Daten (Bankexporte!) committen; Beispiele
  sind anonymisiert.
- Disclaimer: AlimenCal ist kein Rechtsberatungswerkzeug – bei Änderungen mit
  Rechtsbezug bleibt der Disclaimer in README und Doku vollständig erhalten.
