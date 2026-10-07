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
| Richtwerte / Defaults (`js/config.js`) | `docs/KALKULATION.md` (Wertetabelle), README-Abschnitt «Richtwerte», Quellenangaben inkl. Datum «Stand: …» |
| Presets (`presets/*.json`, `js/presets.js`) | README-Abschnitt «Richtwerte», Preset-`meta` (Quelle, URL, Hinweise) |
| Sprachen / i18n (`js/i18n/*`) | `docs/BENUTZERHANDBUCH.md` (Sprachliste), ggf. README |
| Struktur / neue Dateien | Struktur-Übersicht unten |
| localStorage-Persistenz (`js/storage.js`) | Regel-Abschnitt «Lesbarkeit der Nutzerdaten nach Updates» unten, `docs/BENUTZERHANDBUCH.md` (Datenhaltung), README-Abschnitt «Tests» |
| Screenshots (nur auf Anfrage oder UI-Änderungen in `main`) | `screenshots/` erneuern; Inventar-Tabelle unten **und** Einbettungen im BENUTZERHANDBUCH synchron halten (Inventar-Regel, s. u.) |
| Rechtliches / Rechtsprechungs-Bezug | `docs/RECHTLICHE-GRUNDLAGEN.md` |
| Kantonale Presets (`presets/`) | `docs/PRESETS.md`, README-Abschnitt «Richtwerte» |
| Roadmap / neue geplante Funktionen | `docs/ROADMAP.md`, README-Abschnitt «Roadmap, Design, Tests & Mitmachen» |
| Design-Stile / Design-Historie | `docs/DESIGN.md`, README-Abschnitt «Roadmap, Design, Tests & Mitmachen» |
| Tests / neue Testdateien | `docs/TESTS.md`, README-Abschnitt «Roadmap, Design, Tests & Mitmachen» |

### Zusätzlich gilt

- **Screenshots (nur auf explizite Anforderung oder bei Main-Merges)**:
  Screenshots werden nur noch erstellt, wenn explizit danach gefragt
  wird, oder wenn UI-relevante Änderungen in `main` committet wurden
  (Vorher-nachher-Prüfung von UI-Änderungen erfolgt über die
  PR-Live-Vorschau auf GitHub Pages, s. u.). Beim Erstellen gelten die
  betroffenen Ansichten – Standard-Ansichten (Views 01–10) in allen
  vier Sprachen und allen drei Geraetetypen, Design-Hero-Shots der
  Nicht-Standard-Stile (Views 11–14) nur `pc/de` (Erzeugung siehe unten).
- **Screenshot-Erstellung**:
  - Ausführen: `node tools/make-screenshots.js` (erzeugt alle Geraetetypen; mit `--devices pc,iphone,ipad` einschraenkbar; nutzt Puppeteer/Headless-Chromium,
    Installation von Puppeteer ausserhalb des Repos: `npm i puppeteer`)
  - Erzeugt automatisch die PNGs unter `screenshots/<geraet>/` (fortlaufend
    nummeriert, Sprache im Suffix, z. B. `pc/01-kindesunterhalt-de.png`),
    je Ansicht in allen vier Sprachen
  - Bei jeder sichtbaren UI-Änderung neu ausführen und die erzeugten PNGs
    committen
- **PR-Live-Vorschau (GitHub Pages)**: Jeder offene Pull Request aus
  diesem Repository wird automatisch als Live-Vorschau unter
  `https://michaelleuzinger.github.io/AlimenCal/pr-<PR-Nr>/` deployt
  (Job `deploy-pr-preview` in `.github/workflows/pages.yml`); der
  Bot kommentiert die URL im PR. Ein Pages-Deployment ist immer die
  komplette Seite (atomare Kopie): Der `main`-Deploy baut daher den
  Root aus `main` plus Unterordner `pr-<Nr>/` aller offenen PRs, der
  Preview-Deploy den Root aus `main` plus den Unterordner des PRs.
  Nach Merge wird die Vorschau mit dem nächsten `main`-Deploy entfernt;
  Nachfolgenutzung: UI-Änderungen im PR direkt im Browser prüfen, bevor
  sie in `main` committet sind.
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
  5. **Hero-Shot im README immer aktuell**: Der Hero-Shot im README
     (aktuell `screenshots/pc/01-kindesunterhalt-de.png`) ist bei JEDER
     sichtbaren UI-Änderung (Layout, Navigation, Design-Stil, Farben,
     Typografie) zwingend im selben Change neu zu erzeugen und zu
     committen – auch wenn die Ansicht selbst unverändert wirkt. Der
     Hero-Shot ist das Aushängeschild des Repos und darf nie einen
     veralteten Stand zeigen.
  6. **Nachführung im selben Change**: `tools/make-screenshots.js` (VIEWS),
     Inventar-Tabelle (unten) und die Einbettungen im
     BENUTZERHANDBUCH sind konsistent zu halten; entfernte Screenshots sind
     auch aus README/Handbuch zu löschen (keine toten Links).
### Screenshot-Inventar

Screenshots sind nach Geraetetyp gegliedert: `screenshots/pc/` (1395x2084),
`screenshots/iphone/` (390x844), `screenshots/ipad/` (820x1180).
Vereinbart sind insgesamt 3 Geraetetypen: PC, iPhone, iPad. Die
Standard-Ansichten (Views 01-10) werden je Geraetetyp in allen vier
Sprachen (de, fr, it, en) erzeugt (Suffix im Dateinamen); die
Design-Hero-Shots der Nicht-Standard-Stile (Views 11-14) nur `pc/de`.
Insgesamt 14 Ansichten x 4 Sprachen x 3 Geraete + 4 Hero-Shots
= 172 PNGs.

| Screenshot (je `pc/`, `iphone/`, `ipad/`, Suffix `-de/-fr/-it/-en`) | Inhalt |
|---|---|
| `01-kindesunterhalt-<lang>.png` | Kindesunterhalt inkl. Aufwandsmodus und Resultat; Hero-Shot README + Handbuch |
| `02-ehegattenunterhalt-<lang>.png` | Ehegattenunterhalt mit Bedarf/Leistungsfähigkeit und Resultat |
| `03-kostentrennung-<lang>.png` | Kostentrennung mit anonymisiertem Bankexport, Zuordnungen und Ausgleich |
| `04-austausch-<lang>.png` | Austausch-Tab mit Export/Import |
| `05-hauptmenue-<lang>.png` | Navigation: Topbar mit Hauptfunktionen und Befehlspalette (Desktop; Mobile: Tab-Leiste) |
| `06-richtwerte-<lang>.png` | Richtwerte mit Preset-Auswahl und Wertetabelle |
| `07-themes-classic-<lang>.png` | Themes mit Theme-Editor, Classic |
| `08-themes-dark-<lang>.png` | Themes, Dark-Theme (Duplikat von 07, legitimiert: dokumentiertes Feature) |
| `09-themes-designs-<lang>.png` | Themes-Tab mit Design-Stil-Auswahl (Karten), Calm-Stil aktiv |
| `10-hero-calm-<lang>.png` | Hero-Shot Design-Stil Calm (Standard): Kindesunterhalt mit Live-Ergebnis-Panel |
| `11-hero-classic-de.png` (nur `pc/de`) | Hero-Shot Design-Stil Klassisch: Kindesunterhalt |
| `12-hero-calm-dark-de.png` (nur `pc/de`) | Hero-Shot Design-Stil Calm Dark: Kindesunterhalt |
| `13-hero-editorial-de.png` (nur `pc/de`) | Hero-Shot Design-Stil Editorial/Legal: Kindesunterhalt |
| `14-hero-neubrutalism-de.png` (nur `pc/de`) | Hero-Shot Design-Stil Neo-Brutalismus: Kindesunterhalt |
| `15-backup-<lang>.png` | Austausch-Tab mit Backup-Funktion: Statusmeldung nach erstelltem Backup |
| `16-restore-<lang>.png` | Austausch-Tab mit Restore-Funktion: Statusmeldung nach importiertem Backup |
| `17-backup-reminder-<lang>.png` | Backup-Erinnerungs-Banner (altes Backup / viele Änderungen) mit Ein-Tipp-Backup |
| `18-backup-reminder-initial-<lang>.png` | Erst-Erinnerung: noch kein Backup, aber bereits Daten erfasst |

Hinweis: Alle Standard-App-Ansichten (01–08) werden seit dem
SOTA-Redesign im Design-Stil «Calm» erzeugt (`design: 'calm'` in
VIEWS, `tools/make-screenshots.js`); die Farb-Theme-Screenshots 07/08
bleiben als Classic/Dark-Beleg erhalten, da das Farb-Theme dort das
Feature ist. Die Design-Hero-Shots: 10 (Calm, Standard-Stil) wird wie
alle Standard-Ansichten je Geraetetyp und Sprache erzeugt; die
Nicht-Standard-Stile 11–14 nur als `pc/de`-Beleg (`langs: ['de'],
devices: ['pc']` in VIEWS).

### Struktur

```
index.html          UI (Topbar-Navigation mit 4 Hauptfunktionen + Befehlspalette Ctrl+K fuer alle Tabs; auf Mobile task-first Tab-Leiste unten mit 4 Hauptfunktionen + «Mehr» (oeffnet Palette); Tab Kindesunterhalt mit Live-Ergebnis-Panel)
css/style.css       Styles
js/calculator.js    Berechnungskern (DOM-frei, auch in Node.js lauffähig)
js/costsplit.js     Kostentrennung: CSV-Import, Zuordnung, Ausgleich (DOM-frei)
js/themes.js       Theme-Definitionen und -Validierung (DOM-frei, auch in Node.js lauffähig)
js/casedata.js     Falldaten-Austausch und Backup/Restore: Validierung und Merge (DOM-frei)
js/settings.js     Verbindliche Einstellungen: Two-Party-Lock, Override-Modus, Read-Only-Imports (DOM-frei)
js/casecrypto.js   Verschlüsselter Austausch-Export: ECDH P-256 + AES-GCM (DOM-frei, auch in Node.js lauffähig)
js/config.js        Default-Richtwerte (Zürcher Kinderkosten-Tabelle 1.3.2025)
js/presets.js       Eingebettete Kopie der kantonalen Presets (file://-fähig)
presets/*.json      Kantonale Richtwertsätze inkl. Quellen und Checklisten
js/storage.js      localStorage-Persistenz: Versionierung, Sanitizing, Migration (DOM-frei)
js/app.js           UI-Logik, i18n-Anwendung, localStorage, Import/Export, Service-Worker-Registrierung (PWA)
manifest.json       Web-App-Manifest (PWA-Installation, Icons, Farbschema)
sw.js               Service Worker: Cache der App-Dateien für Offline-Nutzung (PWA)
icons/*.png         App-Icons für PWA-Installation und Home-Bildschirm (192/512 px, maskierbar, apple-touch)
js/i18n/{de,fr,it,en}.js  Sprachdateien
AGENTS.md           Verbindliche Arbeitsregeln (Doku-in-Sync-Regel, Checklisten)
docs/               Benutzerhandbuch, Berechnungslogik, Kostentrennung, Rechtliches, Verbindliche Einstellungen, Design (inkl. Design-Historie), Tests, Presets, Roadmap
schema/             Optionales SQL-Referenzschema (Immutability-Trigger) für spätere Persistenz
screenshots/        Screenshots der App (Inventar-Regel: s. AGENTS.md; Erzeugung tools/make-screenshots.js)
tools/              make-screenshots.js: Screenshot-Generator (Puppeteer, s. AGENTS.md)
tools/              check-links.js: Link-/Referenzpruefung fuer Repository-Hygiene (s. AGENTS.md)
tests/              Unit-Tests (node)
.github/workflows/  CI: tests.yml (Unit-Tests), pages.yml (Deployment auf GitHub Pages inkl. PR-Live-Vorschau pr-<PR-Nr>/)
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
- [ ] Hygiene: `git ls-files` enthält nur Produktiv-/Erzeugnis-/Referenz-Dateien
- [ ] Hygiene: keine neuen Dateien ohne Eintrag in der Struktur-Tabelle
- [ ] Hygiene: `node tools/check-links.js` grün
- [ ] Hygiene: gelöschte Dateien ohne verbleibende Referenzen (grep)

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

## Verbindliche Regel: Repository-Hygiene (clean Repository)

**Jede Datei im Repository muss einer von drei Kategorien angehoeren –
sonst wird sie geloescht:**

| Kategorie | Test | Beispiele |
|---|---|---|
| **Produktiv** | Wird von `index.html` geladen oder von Tests ausgefuehrt | `js/*`, `css/*`, `js/i18n/*` |
| **Erzeugnis** | Wird von einem Tool generiert **und** in Doku/README referenziert | `screenshots/*`, `presets/*.json` |
| **Referenz** | In Doku verlinkt **und** beschreibt einen nicht umgesetzten, aktiv verfolgten Gedanken | `schema/calc_settings.sql` |

### Konsequenzen

- **Mockups, Prototypen, Explorationen** werden im selben Change geloescht,
  in dem die Umsetzungs- (oder Verwurfs-) Entscheidung faellt. Der
  Entscheidungsstand lebt in `docs/`, nicht in Dateien (Historie:
  design/mockups, design/mockups-v2 und design/mockups-v3 wurden
  jeweils nach Umsetzung entfernt).
- **Erzeugnisse ohne Erzeugung**: Was das Tool nicht mehr erzeugt (z. B.
  alte Screenshot-Schemata), wird beim naechsten Generator-Lauf per
  `git rm` entfernt, nicht liegen gelassen.
- **Keine neuen Dateien ohne Struktur-Tabellen-Eintrag** (unten): Wer keine
  Zeile in der Struktur-Tabelle findet, hinterfragt die Datei.
- **Binärdateien** (PNG, JSON-Daten) nur, wenn in Doku eingebettet oder von
  einem Test validiert; jede Erzeugnis-Kategorie hat genau ein Tool.
- **Single-Home fuer Doku**: Jedes Thema hat genau ein Dokument
  (`docs/DESIGN.md`, `docs/TESTS.md`, ...); README haelt pro Thema maximal
  eine kurze Einleitung + Link – keine duplizierten Inhalte. README-
  Abschnitts-Umbenennungen ziehen die Verweise in dieser Datei im selben
  Change nach.

### Link- und Referenzpruefung

Vor jedem Merge laeuft `node tools/check-links.js` (prueft alle MD- und
HTML-Dateien auf interne Links/src/href; Exit-Code 1 bei defekten
Verweisen). Nach dem Loeschen von Dateien zusaetzlich per grep pruefen,
dass keine Referenzen mehr auf die geloeschten Namen zeigen.

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
