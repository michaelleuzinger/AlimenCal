# Roadmap

## Erledigt

- [x] Kantonal vorkonfigurierte Richtwertsätze (Presets ZH / SH-Platzhalter)
- [x] Kostentrennung vor der Scheidung (Stichtag, Bankexport CSV/camt-XML, Ausgleich)
- [x] Vermögensausgleich zum Stichtag, vereinfacht (Salden je Partei, hälftiger Ausgleich; [VERMOEGENSAUSGLEICH.md](VERMOEGENSAUSGLEICH.md))
- [x] Gemerkte Speicherorte für Backup/Export/Restore/Import (File System Access API, automatisches Speichern in den letzten Ordner)
- [x] Themes mit Theme-Editor (vordefinierte Designs, freie Farbanpassung)
- [x] Persistenz aller Eingaben über Browser-Neustarts
- [x] Austausch zwischen Parteien (Export/Import mit Merge, serverlos)
- [x] Verbindliche Einstellungen: Two-Party-Lock, Override-Modus, Read-Only-Imports ([settings-binding-override.md](settings-binding-override.md))
- [x] Serverlose Verbindlichkeit: Hash-Kette und beidseitig signierte Lock-Dateien (Web Crypto, ohne Server)
- [x] Public-Key-verschlüsselter Austausch (ECDH P-256 + AES-GCM)
- [x] Apple-Redesign: Sidebar-Navigation, Schnellstart-Assistent, Apple-Design als Standard

- [x] Geräte-Sync (Same-User): passwortverschlüsselte Sync-Datei in gemerktem Ordner, automatischer Merge beim App-Start (Issue #29)

## Geplant

- [ ] PDF-Export des Berechnungsblatts
- [ ] BVG-/Vorsorgeabzüge und steuerliche Saldierung
- [ ] Alimentenindexierung (Art. 129 ZGB)
- [ ] Vermögensausgleich nach Errungenschaftsbeteiligung: Eigengut-Differenzierung (Art. 198 ZGB), Errungenschafts-Herleitung nach Art. 207 ZGB, Ersatzforderungen (Art. 209 ZGB), Vorschusszins (Art. 208 ZGB), separate FZG-Übertragung

Konkrete Vorschläge und Wünsche gern als GitHub Issue erfassen.
