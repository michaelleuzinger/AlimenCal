# Design

Alle sieben Design-Stile (Apple, Material 3, Modern Minimal, Bento,
Dark Premium, Neo-Brutalismus, Base) sind im Tab **Themes** wählbar;
**Apple ist der Standard**. Der gewählte Stil passt Typografie, Karten,
Rahmen und Schatten des kompletten Erscheinungsbildes an und ist
vollständig responsiv; die freie Farb-Feinjustierung im Theme-Editor
funktioniert in jedem Stil weiter.

## Grundgerüst seit dem Apple-Redesign

- **Sidebar-Navigation** (Desktop) bzw. **Tab-Leiste unten** (Mobile) statt
  Hamburger-Menü; Sprachwahl in der Sidebar
- **Schnellstart-Assistent** im Tab Kindesunterhalt (Kinderzahl, Fokus aufs
  erste Einkommensfeld, überspringbar)
- **Helles Apple-Grau** (`#f5f5f7`) als Header- und Seitenhintergrund,
  Frosted-Glass-Effekt, einziger Blau-Akzent `#0071e3`, 18px-Radien,
  Pill-Buttons

## Design-Historie (kurz)

- **Runde 1 (Mockups V1, entfernt):** Sechs Stil-Konzepte (Apple, Material 3,
  Modern Minimal, Bento, Dark Premium, Neo-Brutalismus) als statische Mockups;
  alle sechs sind als Design-Stile in der App umgesetzt. Die Mockup-Dateien
  sind nach der Umsetzung aus dem Repository entfernt worden – der
  Referenzstand lebt in den Design-Stilen und den Hero-Screenshots
  (Views 10–15 in `screenshots/`).
- **Runde 2 (Redesign V2):** Vier grundlegend neue Konzepte (Sidebar-Workspace,
  Wizard, Editorial/Legal, Command-Center) ohne Hamburger-Menü. Davon umgesetzt:
  Sidebar + Wizard in der Apple-Variante der Empfehlung (heutiges
  Grundgerüst, siehe oben). Nicht umgesetzt und als statische Referenz
  erhalten: **Editorial/Legal** und **Command-Center** unter
  [`design/mockups-v2/`](../design/mockups-v2/index.html) mit je einem
  Desktop- und Mobile-Vorschau-Bild.

Hinweis fürs Betrachten auf GitHub: `.html`-Dateien werden im Blob-View nur
als Quellcode angezeigt; die Vorschau-PNGs zeigen das Ergebnis, für die
interaktive Ansicht die Dateien lokal im Browser (`file://`) öffnen.
