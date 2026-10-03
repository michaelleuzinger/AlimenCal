# Design

Alle neun Design-Stile (Apple, Material 3, Modern Minimal, Bento,
Dark Premium, Neo-Brutalismus, Editorial/Legal, Command-Center, Base)
sind im Tab **Themes** wählbar;
**Apple ist der Standard**. Der gewählte Stil passt Typografie, Karten,
Rahmen und Schatten des kompletten Erscheinungsbildes an und ist
vollständig responsiv; die freie Farb-Feinjustierung im Theme-Editor
funktioniert in jedem Stil weiter.

## Grundgerüst seit dem Apple-Redesign

- **Apple.com-Anmutung**: zentrierter, sticky Kopf mit Frosted-Glass
  (72% Deckkraft, blur 20px), enge negative Letter-Spacing-Typografik,
  weisse Karten ohne Schatten auf #f5f5f7, Pill-Buttons in #0071e3
- **Sidebar-Navigation** (Desktop, mit Icons) bzw. **iOS-Tab-Leiste unten**
  (Mobile: 4 Hauptfunktionen mit Icons + «Mehr»-Bottom-Sheet für
  Richtwerte, Themes, Über und Sprachwahl) statt Hamburger-Menü
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
  Wizard, Editorial/Legal, Command-Center) ohne Hamburger-Menü. Alle vier
  sind umgesetzt: Sidebar + Wizard bilden das heutige Apple-Grundgerüst
  (siehe oben); **Editorial/Legal** (warme Papier-Töne, Serif-Typografie,
  Dokument-Anmutung) und **Command-Center** (dunkles Dashboard,
  Monospace-Ziffern, GitHub-artige Palette) sind als Design-Stile im
  Themes-Tab wählbar (Hero-Shots 16/17 in `screenshots/pc/`). Die
  statischen Mockup-Dateien sind nach der Umsetzung aus dem Repository
  entfernt worden.

## Runde 3 (offen): State-of-the-Art-Redesign als Mockups

Auftrag: alle bisherigen Design-Regeln (eigene wie vom Nutzer gesetzte)
hinterfragen und frische, genuin verschiedene Konzepte als responsive
Mockups vorschlagen.

### Hinterfragung der bisherigen Regeln

| Regel (bisher) | Kritik | Runde-3-Folgerung |
|---|---|---|
| Apple.com-Getreue (Frosted Glass, Pill-Buttons, enge Typografie) | Orientiert sich an ein Konsumgüter-Marketing, nicht an ein Rechen-Werkzeug; blurs sind teuer und wenig robust über Browser hinweg | Loslassen: Werkzeug-Ästhetik (Linear/Stripe-Schule) statt Marketing-Ästhetik |
| Apple als Standard-Stil, 9 parallele Stile | Neun Stile sind nine-fache Maintenance, verwässern die Identität und niemand wählt aktiv «schlechter» | Fokussieren: ein starker Stil, Dunkelmodus via `prefers-color-scheme` statt als separater Stil |
| Sidebar + iOS-Tab-Leiste als Navigations-Orthodoxie | Gilt als Best Practice, aber nicht alternativlos: nicht-modale Topbar (Linear) oder Command-Bar (Ctrl+K) skalieren besser bei Fachpublikum | Konzepte zeigen Alternativen, keine Vorentscheidung |
| Wizard-Assistent als Onboarding | Bringt Struktur, bricht aber den Fluss und versteckt das Ergebnis hinter Schritten | Alternativen: Live-Ergebnis-Panel (nie versteckt) oder Frage-Antwort-Fluss mit eingebettetem Ergebnis |
| Einziger Blau-Akzent, Weiss auf Hellgrau | Sicher, aber beliebig; keine emotionale Verankerung für ein sensibles Thema (Trennung, Kinder) | Wärmere Töne und Kontraste prüfen (Guidance Flow) |
| Mobile = iOS-Tab-Bar-Nachbau | Imitiert ein Betriebssystem statt eine Aufgabe zu lösen; 5 Slots sind ein Engpass | Task-first Tab-Leiste (Fall/Kinder/Ehegatte/Kosten/Mehr) testen |

### Drei SOTA-Konzepte (`design/mockups-v3/`)

1. **Calm Fintech** (`mockup-calm-fintech.html`) – Werkzeug-Denken im Stil
   von Linear/Stripe: schmale, nicht-modale Topbar (kein Hamburger, kein
   Frosted Glass), kompakte Tabellen-Inputs (32px), live aktualisierendes
   Ergebnis-Panel (sticky rechts), systemweiter Dunkelmodus via
   `prefers-color-scheme`, tabellarische Ziffern, Fokus-Ringe statt Glas.
   Hypothese: Hierarchie durch Dichte und Typografie statt durch Dekor.
2. **Guidance Flow** (`mockup-guidance-flow.html`) – kontextuelles Rechnen
   als geführter Frage-Antwort-Fluss: jeder Block erklärt, warum eine
   Angabe massgebend ist; das Ergebnis ist als dunkle Karte eingebettet
   (nie hinter Schritten versteckt) inkl. Balken-Visualisierung der
   Einkommensaufteilung. Hypothese: niedrigste Hemmschwelle für fachfremde
   Nutzer; Erklärung statt Tab-Sprüngen.
3. **Workspace Hub** (`mockup-workspace-hub.html`) – dark-first Fall-Akte:
   der Fall (nicht das Formular) ist das Objekt; Dashboard-Kacheln
   (Total, Quote, Leistungsfähigkeit, Richtwerte), Command-Bar (Ctrl+K)
   als Navigationsprinzip, Aktivitäts-/Verlaufsstreifen als
   Transparenz-Feature, auf Mobile task-first Tab-Leiste. Hypothese:
   optimal für intensive, repetierende Nutzung (Fachpersonen).

Galerie mit Previews (Desktop + Mobile je Konzept):
`design/mockups-v3/index.html`. Previews erzeugt mit
`node tools/make-mockup-previews.js` (Puppeteer).

### Offener Entscheid

Keines der drei Konzepte ist umgesetzt; gemäss Hygiene-Regel sind die
Mockups Referenz-Dateien (in diesem Dokument verlinkt, aktiv verfolgt) und
werden im Change der Umsetzungs- oder Verwurfsentscheidung gelöscht.
Offene Fragen: Welches Konzept (oder welche Mischung) wird verfolgt?
Ersetzt der gewählte Stil die neun parallelen Design-Stile?
