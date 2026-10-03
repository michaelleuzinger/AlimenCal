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

## Umsetzung (Vorschlag)

- Die Mockups sind bewusst nicht in `index.html`/`css/style.css` integriert.
- Umsetzungspfad: neue vordefinierte Themes in `js/themes.js` plus gezielte
  CSS-Erweiterungen (z. B. Segmented Control, Switch-Komponente, tabellarische
  Ziffern) – die bestehende Theme-Editor-Logik (CSS-Variablen inkl.
  `--radius`) bleibt dabei vollständig kompatibel.
- Diese Dateien sind reine Design-Konzepte («nicht produktiv») und enthalten
  keine Berechnungslogik; sie sind vom Screenshot-Inventar ausgenommen.

## Pflege

Änderungen an den Mockups werden in dieser Datei (Tabelle, Empfehlung)
nachgeführt (Docs-in-sync-Regel, AGENTS.md).
