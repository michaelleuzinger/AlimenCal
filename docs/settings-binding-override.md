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
| UI-Integration | `index.html` (Tab Richtwerte) + `js/app.js` | Bestätigungs-Buttons, Override-Modus, effektive Werte in der Berechnung |
| SQL-Referenz (optional) | `schema/calc_settings.sql` | Tabellen + Immutability-Trigger für eine spätere Persistenz-Schicht |
| Tests | `tests/settings.test.js`, `tests/crypto.test.js` | Unit-Tests (Node): 21 + 15 Tests |

Das Modul ist bewusst DOM-frei gehalten (gleiche Konvention wie
`js/calculator.js`, `js/costsplit.js`, `js/casedata.js`): Die UI-Schicht
(`js/app.js`) bedient es, die Regeln gelten unabhängig vom DOM.

### UI-Integration (Tab «Richtwerte»)

- Die vier Basiswerte (Existenzminima erwerbstätig/nichterwerbstätig,
  Standard Lebensstandard, Fallback Grundbedarf) sind im Service
  registriert (`BINDINGS` in `js/app.js`).
- **Bestätigung:** Pro Wert existieren Buttons «Partei A» / «Partei B»;
  nach beidseitiger Bestätigung sind die Formularfelder `disabled`
  (read-only) und jede Änderung wird vom Service verweigert.
- **Rollenwahl (Meine Rolle):** Über das Dropdown «Meine Rolle» wird  festgelegt, als welche Partei diese App-Instanz betrieben wird  (localStorage-Schlüssel `alimencal.bindingrole`; «Gemeinsam / keine  Rolle» erhält das bisherige Verhalten, z. B. für Mediation). Mit  gewählter Rolle (A oder B) sind nur die eigenen Bestätigungs-Buttons  sowie die Schlüssel-Aktionen (erzeugen/exportieren/importieren) und  das Signieren der Lock-Datei für die eigene Partei bedienbar; bei der  Gegenpartei erscheint der Hinweis «Nur durch {Partei} möglich». Deren  Bestätigung muss aus deren Instanz oder über den Import der  (signierten) Lock-Datei stammen.
- **Override-Modus:** Die Checkbox «Override-Modus aktivieren» schaltet die
  Override-Spalte der Tabelle frei; Eingaben erzeugen Overrides im Szenario
  `ui_override`. `effectiveCfg()` liefert der Berechnung Base ⊕ Override;
  ohne aktiven Override-Modus rechnet die App mit den Base-Werten.
- Der verbindliche Wert bleibt sichtbar (durchgestrichen, solange ein
  Override aktiv ist); «Zurücksetzen» löscht den Override.
- Persistenz: Locks und Overrides werden unter dem localStorage-Schlüssel
  `alimencal.binding` gespeichert.

### Serverlose Verbindlichkeit (Kryptografie, ohne Server)

Manipulationen lassen sich ohne Server **nachweisbar** machen – nicht
verhindern, aber erkennbar. Zwei Mechanismen (beide in `js/settings.js`,
UI im Tab Richtwerte):

**1. Hash-Kette (Manipulationserkennung der Historie)**

- Jede Aktion (`update`, `confirm_lock`, `rebase`, `override`,
  `override_update`, `override_delete`) erhält einen Ketten-Eintrag:
  `hash = SHA-256(prevHash | action | kanonisches JSON des Payloads)`.
- `verifyChain()` prüft die komplette Kette; nachträgliches Ändern,
  Löschen oder Einfügen von Einträgen bricht die Verkettung → erkennbar.
- Die Kette wird mit `alimencal.binding` persistiert; der Status ist in
  der UI sichtbar («Historie (Hash-Kette) intakt (n)»).
- Das Anfügen ist serialisiert (interne Promise-Queue), da Web Crypto
  asynchron siegelt.

**2. Beidseitig signierte Lock-Dateien (ECDSA P-256, Web Crypto)**

- Pro Partei lässt sich ein Schlüsselpaar erzeugen (privater Schlüssel
  bleibt lokal im Browser, `alimencal.keys`; öffentlicher Schlüssel wird
  als JSON-Datei exportiert und von der Gegenseite importiert).
- `exportBindingFile()` erzeugt die Lock-Datei mit `valueHash =
  SHA-256(kanonisches JSON der gelockten Werte)`; beide Parteien
  signieren diesen Hash (`signBindingFile`).
- `verifyBindingFile()` prüft beim Import: Format, Werte-Hash (wurden die
  Werte nach dem Signieren verändert?), beide Signaturen (fremde
  Signaturen sind nicht fälschbar) und Abgleich mit den eigenen gelockten
  Werten. Das Resultat wird in der UI konkret benannt.
- Workflow: Partei A exportiert/signiert → Datei an Partei B → B signiert
  dieselbe Datei → ab dann kann jede Seite jede empfangene Datei prüfen.

**Was serverlos möglich ist / nicht möglich ist:**

- Möglich: Nachweis, dass ein Wert manipuliert wurde (Hash-Kette,
  Werte-Hash) und dass beide Parteien einen konkreten Stand bestätigt
  haben (Signaturen). Das genügt für dokumentierte Verbindlichkeit.
- Nicht möglich: technische Schreibsperre im Browser des anderen
  (localStorage ist lokal zugänglich). Wer in seinem eigenen Browser
  trotzdem ändert, verliert aber den Status «verbindlich bestätigt» –
  und das ist nachweisbar.

### Grenzen im rein lokalen Betrieb (SPA)

Der Two-Party-Lock wirkt **pro Browser-Instanz** (localStorage); die
kryptografische Prüfung (Kette + Signaturen) macht Abweichungen davon
nachweisbar. Eine parteiübergreifend *erzwungene* Verbindlichkeit
(Schreibsperre auf gemeinsamer Ablage) bleibt ohne Server
ausgeschlossen; dafür steht `schema/calc_settings.sql` als Referenz
bereit. Im lokalen Betrieb gilt: verbindlich = beidseitig bestätigt,
lokal fixiert und signiert; Export/Import (JSON) dient dem Abgleich
zwischen den Parteien. Die App bleibt
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
