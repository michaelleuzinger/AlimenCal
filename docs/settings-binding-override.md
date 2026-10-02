# Verbindliche Einstellungen, Override-Modus und Read-Only-Imports

## Ziel

1. Berechnungsrelevante Einstellungen (z. B. Richtwerte, Preset-Werte) können
   **verbindlich festgelegt** werden und sind danach **für beide Parteien
   read-only**.
2. In den Einstellungen lässt sich ein **Override-Modus** aktivieren: Andere
   Werte können erfasst werden, **ohne die Originalwerte zu ändern**; die durch
   die Anpassung veränderte Situation wird dargestellt (Original- und
   Override-Wert nebeneinander, Ergebnis-Delta).
3. **Imports sind per Default read-only** (Vorschau) und werden nach dem
   Commit als unveränderlicher Snapshot gespeichert. Korrekturen erfolgen als
   neue Version.

## Architektur

```
Base (verbindlich, read-only)
  ├── Overrides (Szenario-Layer, verändert Base nie)
  └── Import-Snapshots (write-once, read-only)
Berechnung = f(Base ⊕ Overrides)
```

### Komponenten

| Komponente | Datei | Aufgabe |
|---|---|---|
| Modul (DOM-frei, Browser + Node) | `js/settings.js` | Two-Party-Lock, Override-Layer, `resolve()`, Import-Preview/Commit |
| SQL-Referenz (optional) | `schema/calc_settings.sql` | Tabellen + Immutability-Trigger für eine spätere Persistenz-Schicht |
| Tests | `tests/settings.test.js` | Unit-Tests (Node), 21 Tests |

Das Modul ist bewusst DOM-frei gehalten (gleiche Konvention wie
`js/calculator.js`, `js/costsplit.js`, `js/casedata.js`): Die UI-Schicht
(`js/app.js`) bedient es, die Regeln gelten unabhängig vom DOM. Die App bleibt
durchaus eine rein statische Web-App; das optionale SQL-Schema ist eine
Referenz für den Fall, dass die verbindlichen Werte später serverseitig
persistiert werden müssen (z. B. beim Austausch zwischen Parteien).

## 1. Verbindliche Festlegung (Two-Party-Lock)

- Eine Einstellung ist **verbindlich**, sobald **beide Parteien** sie
  bestätigt haben (`confirmBinding('A')` und `confirmBinding('B')`).
- Vor der Bestätigung kann nur die Rolle `APPROVER` den Wert ändern.
- Nach der Bestätigung verweigert `updateBaseValue()` jede Mutation
  (`SettingError`); SQL-seitig erzwingt ein Trigger die Unveränderlichkeit.
- Jede Aktion wird im Audit-Eintrag der Einstellung festgehalten (Akteur,
  Aktion, alter/neuer Wert).

**Änderung nach Verbindlichkeit (Rebase):** `rebaseSetting()` erstellt eine
neue Version (`version += 1`), setzt beide Locks zurück und erfordert eine
erneute beidseitige Bestätigung. Bestehende Overrides bleiben erhalten und
sind am neuen Base-Wert zu prüfen.

## 2. Override-Modus

- `createOverride(settingId, scenarioId, value)` schreibt einen abweichenden
  Wert in den Szenario-Layer — **der Base-Wert bleibt unverändert** (auch bei
  verbindlich festgelegter Einstellung erlaubt, da nur der Layer mutiert wird).
- `resolve(settingId, scenarioId)` ist die **einzige Lesefunktion** der
  Berechnung: Sie liefert den Override-Wert, falls vorhanden, sonst den
  Base-Wert. Kein Codepfad kann Base-Werte direkt mutieren.
- `resolveWithContext()` liefert der UI beide Werte samt Status für die
  Darstellung:

```json
{
  "baseValue": 12.5,
  "effectiveValue": 20,
  "overridden": true,
  "overrideReason": "Szenario: erhöhte Proteinzufuhr",
  "isLocked": true,
  "version": 1
}
```

- Darstellung: Originalwert als Referenz (grau), Override hervorgehoben
  (Badge «überschrieben»), Delta = Berechnung mit Base vs. Berechnung mit
  effektivem Wert.
- `deleteOverride()` stellt die Original-Berechnung automatisch wieder her.
- Wiederholtes `createOverride` für dasselbe Szenario aktualisiert den
  bestehenden Eintrag.

### Rollen

| Rolle | Rechte |
|---|---|
| `VIEWER` | nur `resolve` (read-only) |
| `EDITOR` | `resolve`, Overrides anlegen/löschen |
| `APPROVER` | alles: Base bestätigen (Lock), Rebase, Imports committen |

## 3. Read-Only-Imports

- `previewImport(source, payload)` liefert per Default einen
  **Read-Only-Vorschau-Snapshot** (Status `pending`, Prüfsumme) — noch keine
  Datenübernahme.
- `commitImport(snapshot)` friert den Snapshot ein: Status `committed`; jeder
  weitere Commit-Versuch wirft `SettingError`. DB-seitig erzwingt ein Trigger
  die Unveränderlichkeit.
- **Korrektur = neue Version:** `supersedeImport(old, payload)` erzeugt einen
  neuen Snapshot (`version = old.version + 1`, `supersedes = old.id`). Der
  alte Snapshot bleibt unverändert erhalten (Revisionssicherheit).
- Dasselbe gilt sinngemäss für den bestehenden Falldaten-Austausch
  (`js/casedata.js`): Importe sind validierend und führen Daten zusammen,
  ohne die bestehenden Falldaten der Gegenseite zu überschreiben.

## Tests

```bash
node tests/settings.test.js   # 21 Tests
```

Abgedeckt: Editierbarkeit vor Lock, Lock nach beiden Bestätigungen,
Mutationssperre nach Lock, Rebase, Rollen-Rechte, Override ohne
Base-Änderung, Side-by-Side-Kontext, Override-Löschen, Import-Preview,
Commit-Freeze, Supersede-Kette.
