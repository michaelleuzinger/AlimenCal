# Redesign-Mockups

Statische HTML/CSS-Mockups als Diskussionsgrundlage für ein Redesign der
AlimenCal-UI. Alle Mockups zeigen denselben Funktionsumfang am Beispiel des
Tabs **Kindesunterhalt** (Eltern-Daten, Kinderliste, Berechnung, Resultat) –
jeweils in einem anderen Design-System. Sie sind rein statisch, ohne
JavaScript und ohne Abhängigkeiten und laufen direkt über `file://`.

## Übersicht

Galerie mit Farbmustern und Kurzbeschreibung: [`design/mockups/index.html`](../design/mockups/index.html)

| Mockup | Design-Richtung | Charakteristik |
|---|---|---|
| [`mockup-apple.html`](../design/mockups/mockup-apple.html) | Apple (Human Interface Guidelines) | Translucent Topbar, viel Weissraum, 18px-Karten, ein einziger blauer Akzent, Segmented Control, iOS-Switches |
| [`mockup-google.html`](../design/mockups/mockup-google.html) | Google (Material 3 / Material You) | M3-Farbtokens, Tonal Elevation, Outlined Text Fields, Segmented Buttons, Chips, States-Layer |
| [`mockup-minimal.html`](../design/mockups/mockup-minimal.html) | Modern Minimal / Calm UI (Best Practice) | Neutrale Palette, feine 1px-Border, tabellarische Ziffern, nur das Resultat farbig – Schule Linear/Notion |
| [`mockup-bento.html`](../design/mockups/mockup-bento.html) | Bento Grid (Best Practice / Trend) | Dunkle modulare Kacheln, Resultat als grösste Kachel, Kennzahlen-Dashboard-Charakter |
| [`mockup-dark.html`](../design/mockups/mockup-dark.html) | Dark Premium (Best Practice) | Dark Mode first, flächige Ebenen, Gold-Akzent, grosse Serifen-Ziffern fürs Resultat |
| [`mockup-neubrutalism.html`](../design/mockups/mockup-neubrutalism.html) | Neo-Brutalismus (Trend) | Harte Kanten, dicke Border, Offset-Schatten, knallige Akzente (Gumroad-Stil) |

Vorschau-Screenshots (je Mockup, full-page): [`previews/`](../design/mockups/previews/) –
erzeugt mit `tools/make-mockup-previews.js`, eingebettet in der README
(Abschnitt «Redesign-Mockups»). Bei Änderungen an den Mockups sind die PNGs
neu zu erzeugen.

Hinweis fürs Betrachten auf GitHub: `.html`-Dateien werden im Blob-View nur
als Quellcode angezeigt. Die Screenshots in der README zeigen daher das
Ergebnis; für die interaktive Ansicht die Dateien lokal im Browser öffnen.

## Bewertung / Empfehlung

Für den Einsatz in AlimenCal (ernstes, rechtliches Orientierungswerkzeug)
empfehlen sich die zurückhaltenden Richtungen:

1. **Apple-Inspired** – hohe Vertrauenswirkung, exzellente Lesbarkeit,
   minimaler Implementationsaufwand über die bestehenden CSS-Variablen
   (`--bg`, `--card`, `--accent`, `--banner-bg`, `--radius` …).
2. **Modern Minimal / Calm** – neutrale, ruhige Anmutung; das farbige
   Resultat-Element führt den Blick gezielt auf die wichtigste Zahl.
3. **Material 3** – falls eine serverlose Google-näher gestaltet werden soll;
   Chips/Tonal-Elevation funktionieren gut für die Kinderliste.

**Bento** und **Dark Premium** sind als zusätzliche Theme-Presets denkbar,
sind aber für ein rechtliches Tool eher sekundär. **Neo-Brutalismus** eignet
sich nicht für die Zielgruppe (Trennung/Scheidung); er ist als Trend-Beleg
aufgenommen, aber nicht zur Umsetzung empfohlen.

## Umsetzung (Status: umgesetzt)

Alle sechs Design-Konzepte sind als **Design-Stile in die App eingebaut**:

- **Auswahl**: Themes-Tab, neuer Abschnitt «Design-Stil» mit Karten je Stil
  (Klassisch, Apple, Material 3, Modern Minimal, Bento, Dark Premium,
  Neo-Brutalismus) – neben der bestehenden Farb-Theme-Auswahl und dem
  Theme-Editor.
- **Technik**: Jeder Stil besteht aus einem Farb-Preset (`js/themes.js`,
  `PRESETS`) plus Stil-Merkmalen (Typografie, Rahmen, Schatten) über
  `data-design` am `<html>`-Element (`css/style.css`). Der Theme-Editor
  (Farb-Feinjustierung) funktioniert in jedem Stil weiter; der gewählte
  Stil bleibt beim Anpassen erhalten.
- **Responsiv**: Alle Stile basieren auf dem bestehenden flexiblen Layout;
  die Design-Karten ordnen sich auf kleinen Bildschirmen zweispaltig an,
  Smoke-Tests prüfen 375px-Breite ohne horizontalen Overflow.
- **Screenshots**: `tools/make-screenshots.js` erzeugt die Standard-App-Ansichten
  im Apple-Stil (`design: 'apple'`) sowie je einen Hero-Shot (Kindesunterhalt)
  pro weiterem Stil; vgl. Screenshot-Inventar in AGENTS.md.
- Die Mockup-Dateien unter `design/mockups/` bleiben als ursprüngliche
  Referenz erhalten.

## Pflege

Änderungen an den Mockups werden in dieser Datei (Tabelle, Empfehlung)
nachgeführt (Docs-in-sync-Regel, AGENTS.md).
