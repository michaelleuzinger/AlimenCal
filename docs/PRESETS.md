# Kantonale Presets

Unter `presets/` liegen kantonsbezogene Richtwertsätze als JSON, auswählbar im
Tab **Richtwerte**.

## Verfügbare Presets

| Datei | Kanton | Status |
|---|---|---|
| `zuerich-2025.json` | Zürich | Kinderkosten-Tabelle vom 1. März 2025 (Referenz, identisch mit App-Default) |
| `schaffhausen-offen.json` | Schaffhausen | **Platzhalter mit Verifikations-Checkliste**: Der Kanton Schaffhausen hat keine publizierte Tabelle; die effektiven Ansätze von KESB/Kantonsgericht Schaffhausen MÜSSEN vor Verwendung erhoben und eingetragen werden (die Checkliste nennt KESB-Kontakt, Gebühren, Quellen). |

## Aufbau eines Presets

Jedes Preset enthält `meta` (Name, Kanton, Quelle, URL, Hinweise,
Verifikations-Checkliste) und die Wertfelder. `js/presets.js` hält eine
eingebettete Kopie bereit, damit die App auch ohne Webserver via `file://`
funktioniert; `tests/presets.test.js` prüft die Konsistenz zwischen beiden.

## Eigene Presets erstellen

1. Vorlage: eine bestehende JSON-Datei unter `presets/` kopieren.
2. `meta` (Name, Kanton, Quelle, URL) und die Wertfelder gemäss kantonaler
   Praxis erfassen; die Verifikations-Checkliste ausfüllen.
3. Im Tab **Richtwerte** importieren und speichern.

Hinweis: Seit **BGer 147 III 265** ist die zweistufig-konkrete Methode
verbindlich; die Zürcher Tabelle wird per 2026 nicht mehr weitergeführt.
Kantonale Werte sind vor jedem produktiven Einsatz zu verifizieren –
Details: [RECHTLICHE-GRUNDLAGEN.md](RECHTLICHE-GRUNDLAGEN.md).
