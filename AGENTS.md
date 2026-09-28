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
| Struktur / neue Dateien | README-Abschnitt «Struktur» |
| Screenshots (UI-Änderungen) | `screenshots/` erneuern **und** README-Tabelle «Screenshots» |
| Rechtliches / Rechtsprechungs-Bezug | `docs/RECHTLICHE-GRUNDLAGEN.md` |

### Zusätzlich gilt

- **Screenshots**: Sichtbare UI-Änderungen erfordern erneuerte Screenshots
  der betroffenen Ansichten (alle vier Sprachen, wenn Sprachtexte betroffen sind).
- **Screenshot-Erstellung**: Die App hat einen integrierten Screenshot-Modus
  (`?screenshot=1` als URL-Parameter bzw. Button im Tab «Über»):
  - Ausführen: `node tools/make-screenshots.js` (nutzt Puppeteer/Headless-Chromium,
    Installation von Puppeteer ausserhalb des Repos: `npm i puppeteer`)
  - Erzeugt automatisch die PNGs unter `screenshots/` (eine Datei je Ansicht
    und Sprache, fortlaufend nummeriert, Sprache im Suffix, z. B.
    `01-kindesunterhalt-de.png`, `07-kostentrennung-de.png`)
  - Bei jeder sichtbaren UI-Änderung neu ausführen und die erzeugten PNGs
    committen; README-Tabelle «Screenshots» ggf. ergänzen/aktualisieren
  - Neue Tabs oder sichtbare neue Funktionen erhalten i. d. R. einen eigenen
    Screenshot (nächste freie Nummer, betroffene Sprachen)
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
- [ ] README aktuell (Features, Nutzung, Richtwerte, Tests, Struktur, Screenshots, Roadmap)
- [ ] Screenshots bei UI-Änderungen erneuert
- [ ] `node tests/*.test.js` grün
- [ ] Rechtlicher Disclaimer bleibt vollständig erhalten

## Allgemeine Regeln

- Kleinste korrekte Änderung; bestehende Nutzerdaten (localStorage-Formate)
  nicht brechen.
- Keine neuen Abhängigkeiten; die App bleibt eine statische, serverlose
  Web-App (Vanilla JS).
- Berechnungs- und Parsing-Kerne (`js/calculator.js`, `js/costsplit.js`)
  bleiben DOM-frei (Node-Tests).
- Keine Secrets oder persönliche Daten (Bankexporte!) committen; Beispiele
  sind anonymisiert.
- Disclaimer: AlimenCal ist kein Rechtsberatungswerkzeug – bei Änderungen mit
  Rechtsbezug bleibt der Disclaimer in README und Doku vollständig erhalten.
