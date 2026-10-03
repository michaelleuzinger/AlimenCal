# Design

AlimenCal nutzt seit Runde 3 ein **State-of-the-Art-Grundgerüst
(«Calm Fintech»)** mit **vier verdichteten Design-Stilen**: **Calm**
(Standard), **Calm Dark**, **Editorial/Legal** und **Neo-Brutalismus**,
plus **Klassisch** (Base) als Referenz-Stil – wählbar im Tab **Themes**.
Der gewählte Stil passt Farben, Typografie, Rahmen und Schatten des
kompletten Erscheinungsbildes an und ist vollständig responsiv; die freie
Farb-Feinjustierung im Theme-Editor funktioniert in jedem Stil weiter.

## Grundgerüst seit Runde 3 (SOTA-Redesign)

- **Topbar statt Sidebar**: schmale, nicht-modale Kopfzeile (56px) mit den
  vier Hauptfunktionen; keine Hamburger-Menüs, kein Frosted Glass
- **Befehlspalette (Ctrl+K bzw. ⌘K)**: Navigation zu allen Tabs inkl.
  Richtwerte, Themes, Über – auf Mobile über den «Mehr»-Slot der
  Tab-Leiste erreichbar
- **Task-first Mobile-Tab-Leiste**: 4 Hauptfunktionen + «Mehr» am unteren
  Rand (kein iOS-Tab-Bar-Nachbau)
- **Live-Ergebnis-Panel**: das Resultat des Kindesunterhalts aktualisiert
  sich bei jeder Eingabe live im sticky Seitenpanel – kein separates
  «Berechnen», kein Wizard
- **Werkzeug-Ästhetik**: 32px-Inputs, tabellarische Ziffern,
  Fokus-Ringe, feine Linien – Hierarchie durch Dichte und Typografie
  statt durch Dekor
- **Dunkelmodus als eigener Stil** (Calm Dark) statt verstecktem
  prefers-color-Schema-Fallback, da Nutzer aktiv hell/dunkel wählen

## Design-Stile

| Stil | Charakter |
|---|---|
| Calm (Standard) | Helles Werkzeug-Design (Linear/Stripe-Schule): weisse Karten, feine Linien, ein Akzent (#635bff) |
| Klassisch (Base) | Ursprüngliches Projekt-Aussehen als Referenz |
| Calm Dark | Dieselbe Anmutung dunkel (#0b0b0d/#131316) |
| Editorial/Legal | Warme Papier-Töne, Serif-Typografie – Dokument-Anmutung für den Rechtskontext |
| Neo-Brutalismus | Harte Schatten, dicke Ränder, kein Radius – der bewusste Kontrapunkt |

Gestrichen wurden Apple, Material 3, Modern Minimal, Bento, Dark Premium
und Command-Center (Runde 3: sechs Stile mit starker Überschneidung;
die guten Elemente von Apple/Command-Center leben im Grundgerüst weiter).

## Design-Historie (kurz)

- **Runde 1 (Mockups V1, entfernt):** Sechs Stil-Konzepte als statische
  Mockups; alle als Design-Stile umgesetzt, Mockups danach gelöscht.
- **Runde 2 (Redesign V2, entfernt):** Vier neue Konzepte
  (Sidebar-Workspace, Wizard, Editorial/Legal, Command-Center); Sidebar +
  Wizard wurden das Apple-Grundgerüst, Editorial + Command-Center wurden
  Stile. Mockups nach Umsetzung gelöscht.
- **Runde 3 (SOTA-Redesign, umgesetzt):** Auftrag, alle Design-Regeln zu
  hinterfragen (Apple-Getreue, Frosted Glass, Sidebar/iOS-Tab-Bar,
  Wizard, 9 parallele Stile, Pill-Buttons). Drei Mockup-Konzepte
  (Calm Fintech, Guidance Flow, Workspace Hub) wurden als Referenz
  gebaut und in derselben Entscheidung verworfen bzw. umgesetzt:
  **Calm Fintech** wurde das neue Grundgerüst (Topbar, Live-Ergebnis,
  Ctrl+K-Palette); Ideen aus **Workspace Hub** (Ctrl+K,
  task-first Tabs) flossen direkt ein; **Guidance Flow** wurde nicht
  umgesetzt (zweites Layout wäre Wartungsdoppelung). Die
  Stilauswahl wurde von 9 auf 4 verdichtet. Mockups (design/mockups-v3)
  gemäss Hygiene-Regel im Change der Entscheidung gelöscht.
