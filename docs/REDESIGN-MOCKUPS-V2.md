# Redesign V2 – Vier neue Konzepte (nach Main-Update)

Nach dem Merge des Responsive-/Hamburger-Updates auf `main` gefiel das bisherige
Design-Konzept nicht mehr. `design/mockups-v2/` enthält daher vier **grundlegend
neue, komplette Design-Konzepte** – jedes denkt Navigation (kein Hamburger-
Menü), Layout, Typografie und Informationsdarstellung von Null aus. Die
früheren Stil-Vorgaben (Apple/Material/Minimal/Bento/Dark/Neo-Brutalismus)
werden hier bewusst nicht weiterverfolgt.

Galerie mit Vorschau-Bildern (je Desktop + Mobile): 
[`design/mockups-v2/index.html`](../design/mockups-v2/index.html)

| Konzept | Datei | Kernidee | Navigation statt Hamburger |
|---|---|---|---|
| **1 · Sidebar-Workspace** | [`mockup-sidebar.html`](../design/mockups-v2/mockup-sidebar.html) | Feste, immer sichtbare Navigationsleiste links; ruhiges SaaS-Layout mit Kennzahlen-Karten | Sidebar (Desktop) → Bottom-Tabbar (Mobile) |
| **2 · Geführter Wizard** | [`mockup-wizard.html`](../design/mockups-v2/mockup-wizard.html) | Fragen-Antwort-Fluss mit Stepper statt Formular-Tabellen; Live-Resultat-Vorschau unten; Expertenmodus optional | Keine Navigation nötig – geführter linearer Fluss |
| **3 · Editorial / Legal** | [`mockup-editorial.html`](../design/mockups-v2/mockup-editorial.html) | Serifen-Typografie, römische Ziffern-Gliederung, „Urkunden“-Resultatkarte – juristische Dokument-Anmutung | Klassische Text-Link-Navigation im Kopf |
| **4 · Taskboard / Command-Center** | [`mockup-command.html`](../design/mockups-v2/mockup-command.html) | Drei-Spalten-Workspace (Fall-Bausteine / Arbeitsfläche / Live-Inspector), Fall als „Dashboard“, dunkel | Registerkarten-Leiste (offene Tabs) + ⌘K-Suche |

Vorschau-Bilder je Konzept (Desktop + Mobile): 
[`previews/`](../design/mockups-v2/previews/) – erzeugt mit
`tools/make-mockup-previews.js`.

## Bewertung / Empfehlung

- **Sidebar-Workspace (1)** – beste Allround-Wahl: alle Funktionen immer
  sichtbar, geringste Umgewöhnung, sauber responsive (Tabbar am Handy).
- **Geführter Wizard (2)** – die stärkste **UX**-Idee für Laien: fragt-
  getrieben, verhindert Fehler, belastet nicht mit Formularen; als
  „Einstiegsmodus“ vor einem Expertenmodus denkbar.
- **Editorial (3)** – passt am besten zur rechtlichen Natur der App und hebt
  sich am stärksten von „yet another tool“ ab; Risiko: Betreuungsanteile als
  reine Textseite wirkt weniger „App“.
- **Command-Center (4)** – ehrgeizigster Wurf und ideal für Power-User
  (Anwält:innen); für Laien im Trennungsstress vermutlich zu dicht.

Empfohlene Kombination für die Umsetzung: **Konzept 1 als Gerüst** (Sidebar /
Tabbar), mit dem **Wizard als geführtem Einstieg** und der
**Editorial-Ergebniskarte** für das Resultat.

Die Empfehlung ist als eigenes, komplettes Mockup umgesetzt:
[`mockup-empfehlung.html`](../design/mockups-v2/mockup-empfehlung.html) mit
fünf Vorschau-Screenshots (Desktop: Navigation/Wizard, Eingaben, Resultat;
Mobile: komplette Ansicht und Resultat) unter
[`previews/`](../design/mockups-v2/previews/) (Dateien `empfehlung-1` bis
`empfehlung-5`).

**Apple-Variante der Empfehlung** (auf Wunsch priorisiert):
[`mockup-empfehlung-apple.html`](../design/mockups-v2/mockup-empfehlung-apple.html)
– gleiche Struktur (Sidebar, Wizard, Resultatkarte), aber konsequent an den
Apple Human Interface Guidelines ausgerichtet: Hintergrund `#f5f5f7`, weisse
Karten, einziger Blau-Akzent `#0071e3`, 18px-Radien, Pill-Buttons, SF-artige
Typografie mit negativem Letter-Spacing, translucente Sidebar
(`backdrop-filter`), grüne Erfolgs-Badges (`#34c759`). Vorschau-Screenshots:
`apple-empfehlung-1` bis `-5` (Desktop-Top/Eingaben/Resultat, Mobile
komplett, Mobile-Resultat).

## Abgrenzung zu V1

- `design/mockups/` (V1, Apple/Material/…-Stile) bleibt als Historie erhalten;
  die dortigen Stil-Presets sind in der App weiterhin wählbar.
- V2 ersetzt keine Produktiv-Dateien; es sind statische Konzepte ohne JS und
  ohne Berechnungslogik.

## Pflege

Änderungen an den V2-Mockups werden hier (Tabelle, Empfehlung) und die
Vorschau-PNGs mit `tools/make-mockup-previews.js` im selben Change
nachgeführt (Docs-in-sync-Regel, AGENTS.md).
