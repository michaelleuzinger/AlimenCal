# Tests

Alle Tests laufen ohne Abhängigkeiten direkt mit Node.js:

```bash
node tests/calculator.test.js   # Berechnungskern (53 Tests)
node tests/presets.test.js      # Presets: JSON-Gültigkeit, Konsistenz JS/JSON (29 Tests)
node tests/costsplit.test.js    # Kostentrennung: CSV- und camt-XML-Parsing, Zuordnung, Ausgleich (54 Tests)
node tests/themes.test.js       # Themes: Presets, Design-Stile, Token, Validierung, Sanitizing (215 Tests)
node tests/casedata.test.js     # Falldaten-Austausch und Backup/Restore inkl. Binding/Keys/Partei-Namen: Validierung, Merge, Roundtrip (70 Tests)
node tests/settings.test.js     # Verbindliche Einstellungen: Two-Party-Lock, Override-Modus, Read-Only-Imports (21 Tests)
node tests/crypto.test.js       # Serverlose Verbindlichkeit: Hash-Kette, signierte Lock-Dateien (17 Tests)
node tests/casecrypto.test.js   # Verschlüsselter Austausch: ECDH/AES-GCM-Export (14 Tests)
node tests/storage.test.js      # localStorage-Persistenz: Versionierung, Migration v3/v4 (Abschnitt-Locks, Partei-Namen), Sanitizing, Backup-Erinnerung inkl. Erst-Erinnerung (64 Tests)
```

Oder alle auf einmal:

```bash
for f in tests/*.test.js; do node "$f"; done
```

Geprüft werden u. a. Grundbedarfstabellen, Aufteilung nach wirtschaftlicher
Leistungsfähigkeit, Mangellagen-Deckelung, die Überschuss- und Mankomethode
des Ehegattenunterhalts sowie CSV-Parsing und Ausgleichslogik; die
Berechnungslogik im Detail: [KALKULATION.md](KALKULATION.md).

Zusätzlich zur Repository-Hygiene vor jedem Merge:

```bash
node tools/check-links.js   # defekte interne Links/Referenzen in MD + HTML
```

Sichtbare UI-Änderungen erfordern ausserdem erneuerte Screenshots der
betroffenen Ansichten – Erzeugung und Regeln: [AGENTS.md](../AGENTS.md)
bzw. `tools/make-screenshots.js`.
