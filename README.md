# AlimenCal – Unterhaltsrechner für die Schweiz

**AlimenCal** ist ein mehrsprachiges Orientierungswerkzeug (Web-App) für
Unterhaltsfragen bei Trennung und Scheidung in der Schweiz:

- **Kindesunterhalt** (Art. 276, 285 f. ZGB) mit Barunterhalt und
  Betreuungsunterhalt (revidiertes Unterhaltsrecht, in Kraft seit 1. Januar 2017);
  der Grundbedarf kann je Kind pauschal (Richtwerttabelle) oder über die
  effektiven Kosten des Kindes ermittelt werden
- **Ehegattenunterhalt** (Art. 176 ZGB bei Getrenntleben; Art. 125 ZGB
  nachehelich) nach der zweistufig-konkreten Methode (BGE 140 III 337) mit
  Überschussverteilung inklusive Mankoverteilung (BGE 135 III 66)
- **Kostentrennung vor der Scheidung**: Stichtag definieren, Bankexport (CSV
  oder ISO-20022-XML/camt.052–054)
  hochladen, Transaktionen zuordnen (ignorieren / anteilsmässig / voll durch
  eine Partei) – mit automatischem Ausgleich

![Kindesunterhalt (DE)](screenshots/pc/01-kindesunterhalt-de.png)

## QuickStart

AlimenCal ist eine rein statische Web-App (HTML/CSS/Vanilla JS) – keine
Installation, kein Server, keine Abhängigkeiten.

1. Repository klonen (oder auf GitHub **Code → Download ZIP** wählen und entpacken):

   ```bash
   git clone https://github.com/michaelleuzinger/AlimenCal.git
   cd AlimenCal
   ```

2. `index.html` per Doppelklick im Browser öffnen (Chrome, Firefox, Edge …) –
   die App läuft direkt über `file://`.

3. Im Assistenten **Schnellstart** auf dem Tab **Kindesunterhalt** die
   Kinderzahl wählen (oder den Assistenten überspringen), allenfalls unter
   **Richtwerte** das kantonale Preset laden (z. B. Zürcher
   Kinderkosten-Tabelle 1.3.2025) – die Navigation läuft über die Sidebar
   (Desktop) bzw. die Tab-Leiste unten (Mobile), die Sprachwahl liegt in
   der Sidebar.

Alle Eingaben werden automatisch lokal im Browser (localStorage) gespeichert.
Optional kann die App statt über `file://` auch über einen lokalen Webserver
oder beliebiges statisches Hosting (z. B. GitHub Pages) bereitgestellt werden.

## Eigenschaften

- **Responsive Darstellung**: Die App passt sich an Smartphone-, Tablet- und  Desktop-Bildschirme an – Grids brechen um, Tabellen und Tab-Navigation  sind auf schmalen Displays horizontal scrollbar, Touch-Ziele sind  vergrössert
- **Vier Sprachen**: Deutsch, Français, Italiano, English – umschaltbar,
  Auswahl wird lokal gespeichert
- **Konfigurierbare Richtwerte**: Existenzminima, altersgestaffelte
  Grundbedarfe und Betreuungsunterhalts-Richtwerte; speicherbar im Browser
  (localStorage), exportier- und importierbar als JSON
- **Kantonale Presets**: JSON-Dateien unter `presets/`, in der App auswählbar
  (z. B. Zürcher Kinderkosten-Tabelle 1.3.2025)
- **Kostentrennung**: Bankexport-Upload mit automatischer Erkennung von
  Trennzeichen, Datums- und Betragsformaten; je Transaktion ignorieren,
  anteilsmässig aufteilen (Anteil konfigurierbar) oder voll einer Partei
  zuordnen; Sammelaktionen für die Erstzuordnung
- **Design-Stile**: neben den Farb-Themes gibt es im Themes-Tab eine Auswahl
  ganzer Design-Stile (Klassisch, Apple, Material 3, Modern Minimal, Bento,
  Dark Premium, Neo-Brutalismus) – jeder Stil passt Typografie, Karten, Rahmen
  und Schatten des kompletten Erscheinungsbildes an; alle responsiv
- **Themes**: vordefinierte Farb-Designs (Classic, Dark, High Contrast, Warm,
  Blue) und ein Theme-Editor, mit dem alle Farben (inklusive Bannerfarbe) und
  der Eckenradius frei anpassbar sind; Auswahl wird lokal gespeichert
- **Persistenz**: alle Eingaben (inkl. Kinderliste, Kostentrennung mit
  Bankexport und Zuordnungen) werden automatisch gespeichert und nach einem
  Browser-Neustart wiederhergestellt – keine Daten gehen verloren
- **Nach Updates lesbar**: versioniertes Speicherformat (`js/storage.js`) mit
  Migration und Sanitizing – nach einem App-Update werden vorhandene
  Eingaben in jedem Fall wieder gelesen; Altbestände werden beim Start
  migriert (Regel in AGENTS.md, «Lesbarkeit der Nutzerdaten nach Updates»)
- **Austausch zwischen Parteien**: Jede Partei erfasst nur ihre eigenen Daten
  auf ihrem PC, exportiert sie als JSON-Datei und stellt sie der anderen Partei
  zu; der Import übernimmt nur die enthaltenen Abschnitte (Merge) – eigene
  Eingaben bleiben unverändert
- **Verschlüsselter Export (Public-Key)**: Der Austausch-Export kann mit dem
  öffentlichen Schlüssel der Gegenseite verschlüsselt werden (ECDH P-256 +
  AES-GCM, Web Crypto) – nur die Gegenseite kann die Datei öffnen
- **Mangellagen-Erkennung**: Unterdeckung (Manko) wird ausgewiesen, inklusive
  Hinweis auf die Nachforderungspraxis
- **Kein Server, keine Abhängigkeiten**: reine statische Web-App
  (HTML/CSS/Vanilla JS), alle Daten bleiben lokal im Browser

## Nutzung

Über die Sidebar-Navigation (Desktop) bzw. die Tab-Leiste unten (Mobile)
sind alle Funktionen erreichbar: Kindesunterhalt, Ehegattenunterhalt,
Kostentrennung, Austausch sowie Richtwerte, Themes und Über. Die
Sprachwahl (Deutsch, Français, Italiano, English) liegt in der Sidebar.

Schritt-für-Schritt-Anleitung aller Tabs:
[docs/BENUTZERHANDBUCH.md](docs/BENUTZERHANDBUCH.md)

## Dokumentation

| Dokument | Inhalt |
|---|---|
| [docs/BENUTZERHANDBUCH.md](docs/BENUTZERHANDBUCH.md) | Schritt-für-Schritt-Anleitung aller Tabs |
| [docs/KALKULATION.md](docs/KALKULATION.md) | Berechnungslogik Kindes- und Ehegattenunterhalt |
| [docs/KOSTENTRENNUNG.md](docs/KOSTENTRENNUNG.md) | Modul Kostentrennung: CSV- und camt-XML-Import, Zuordnung, Ausgleich |
| [docs/RECHTLICHE-GRUNDLAGEN.md](docs/RECHTLICHE-GRUNDLAGEN.md) | Rechtsquellen, Rechtsprechung, kantonale Praxis, Disclaimer |
| [docs/PRESETS.md](docs/PRESETS.md) | Kantonale Presets: Aufbau, Verifikation, eigene Presets |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Erledigte und geplante Funktionen |
| [docs/DESIGN.md](docs/DESIGN.md) | Design-Stile, Mockups, Apple-Redesign-Grundgerüst |
| [docs/TESTS.md](docs/TESTS.md) | Test-Übersicht und Ausführung |
| [docs/REDESIGN-MOCKUPS.md](docs/REDESIGN-MOCKUPS.md) | Design-Konzepte V1 (Apple, Material 3, Minimal, Bento, Dark, Neo-Brutalismus) |
| [docs/REDESIGN-MOCKUPS-V2.md](docs/REDESIGN-MOCKUPS-V2.md) | Design-Konzepte V2 (Sidebar, Wizard, Editorial, Command-Center) |

## Kantonale Presets

Kantonale Richtwertsätze (z. B. Zürcher Kinderkosten-Tabelle 1.3.2025,
Schaffhausen-Platzhalter mit Verifikations-Checkliste) liegen unter
`presets/` und sind im Tab **Richtwerte** ladbar. Eigene Presets sind als
JSON importierbar – Aufbau und Verifikation:
[docs/PRESETS.md](docs/PRESETS.md).

## Design

Alle sieben Design-Stile (Apple, Material 3, Modern Minimal, Bento,
Dark Premium, Neo-Brutalismus, Base) sind im Tab **Themes** wählbar;
Apple ist der Standard. Konzepte, Mockups und das aktuelle
Grundgerüst: [docs/DESIGN.md](docs/DESIGN.md).

## Tests

Über 500 Tests (Berechnungskern, Presets, Kostentrennung, Themes, Austausch,
Verschlüsselung, Persistenz) laufen ohne Abhängigkeiten mit Node.js –
Übersicht und Ausführung: [docs/TESTS.md](docs/TESTS.md).

## Verwendete Richtwerte (Default)

Die Default-Richtwerte (Stand: März 2025) basieren auf der Zürcher
Kinderkosten-Tabelle vom 1. März 2025 sowie auf betreibungsrechtlichen
Existenzminima (Art. 93 SchKG) als Orientierung. Wertetabelle mit Quellen:
[docs/KALKULATION.md](docs/KALKULATION.md); Rechtslage und kantonale Praxis:
[docs/RECHTLICHE-GRUNDLAGEN.md](docs/RECHTLICHE-GRUNDLAGEN.md).

## Rechtlicher Hinweis (Disclaimer)

AlimenCal ist **keine Rechtsberatung** und liefert keine verbindlichen
Resultate. Die Berechnung dient ausschliesslich der ersten Orientierung.
Massgebend sind stets die konkreten Umstände des Einzelfalls sowie die Praxis
der zuständigen Gerichte und der Kindes- und Erwachsenenschutzbehörde (KESB).
Die mitgelieferten Richtwerte sind typische Orientierungswerte und müssen vor
jedem produktiven Einsatz an die massgebliche kantonale Praxis (z. B.
KESB/Kantonsgericht Schaffhausen) angepasst und verifiziert werden. Details:
[docs/RECHTLICHE-GRUNDLAGEN.md](docs/RECHTLICHE-GRUNDLAGEN.md).

## Roadmap & Mitmachen

Geplante Funktionen (u. a. PDF-Export, BVG-/Vorsorgeabzüge,
Alimentenindexierung): [docs/ROADMAP.md](docs/ROADMAP.md).

### Mitmachen

Beiträge sind willkommen:

1. **Fehler und Vorschläge**: GitHub Issue erfassen (möglichst mit
   Reproduktionsschritten, Browser und Sprache).
2. **Code-Beiträge**: Branch erstellen, Änderungen mit Tests und – bei
   sichtbaren UI-Änderungen – erneuerten Screenshots (4 Sprachen ×
   3 Gerätetypen) einreichen; die Regeln dazu stehen in
   [AGENTS.md](AGENTS.md).
3. **Doku-Beiträge**: Alle Detail-Dokumente leben unter `docs/` – die
   Docs-in-sync-Regel (AGENTS.md) verlangt die Nachführung der jeweils
   zugehörige Doku im selben Change.
4. **Kantonale Presets**: Eigene Richtwertsätze als JSON – Aufbau und
   Verifikations-Checkliste: [docs/PRESETS.md](docs/PRESETS.md).

Vor dem ersten Beitrag [AGENTS.md](AGENTS.md) lesen: Architektur,
Screenshot-Regeln und Test-Ausführung sind dort verbindlich beschrieben.
