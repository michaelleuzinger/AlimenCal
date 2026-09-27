# AlimenCal

**AlimenCal** ist ein mehrsprachiges Orientierungswerkzeug (Web-App) für Unterhaltsfragen bei Trennung und Scheidung in der Schweiz:

- **Kindesunterhalt** (Art. 276, 285 f. ZGB) mit Barunterhalt und Betreuungsunterhalt (revidiertes Unterhaltsrecht, in Kraft seit 1. Januar 2017)
- **Ehegattenunterhalt** (Art. 176 ZGB bei Getrenntleben; Art. 125 ZGB nachehelich) nach der Notbedarfs-/Bedarfsmethode mit Überschussverteilung (BGE 140 III 337) inkl. Mankoverteilung (BGE 135 III 66)

## Eigenschaften

- **Vier Sprachen**: Deutsch, Français, Italiano, English – umschaltbar, Auswahl wird lokal gespeichert
- **Konfigurierbare Richtwerte**: Existenzminima, altersgestaffelte Grundbedarfe und Betreuungsunterhalts-Richtwerte; speicherbar im Browser (localStorage), exportier- und importierbar als JSON
- **Mangellagen-Erkennung**: Unterdeckung (Manko) wird ausgewiesen, inklusive Hinweis auf die Nachforderungspraxis
- **Kein Server, keine Abhängigkeiten**: reine statische Web-App (HTML/CSS/Vanilla JS), alle Daten bleiben lokal im Browser

## Nutzung

1. `index.html` im Browser öffnen (beliebiger Hosting-Ordner genügt, z. B. GitHub Pages).
2. Tab **Kindesunterhalt**: Einkommen und Existenzminima der Eltern erfassen, Kinder hinzufügen (Alter, eigene Einkünfte, Kinderzulagen, Krankenkassenprämie, Fremdbetreuungskosten, Betreuungsanteile).
3. Tab **Ehegattenunterhalt**: falls gewünscht aktivieren, Angaben zu gebührlichem Lebensstandard, Mehrkosten und Leistungsfähigkeit erfassen.
4. Tab **Richtwerte**: kantonale Werte anpassen, speichern, exportieren/importieren.

## Tests

```bash
node tests/calculator.test.js
```

Prüft u. a.: Grundbedarfstabellen, Aufteilung nach wirtschaftlicher Leistungsfähigkeit, netto-Verrechnung des Betreuungsunterhalts (kein Saldo bei 50/50), Mangellagen-Deckelung auf das frei verfügbare Einkommen, Mehrkindberechnungen sowie die Überschuss- und Mankomethode des Ehegattenunterhalts.

## Struktur

```
index.html          UI (Tabs: Kindesunterhalt, Ehegattenunterhalt, Richtwerte, Über)
css/style.css       Styles
js/calculator.js    Berechnungskern (DOM-frei, auch in Node.js lauffähig)
js/config.js        Default-Richtwerte
js/app.js           UI-Logik, i18n-Anwendung, localStorage, Import/Export
js/i18n/{de,fr,it,en}.js  Sprachdateien
tests/calculator.test.js  Unit-Tests (node)
```

## Rechtlicher Hinweis (Disclaimer)

AlimenCal ist **keine Rechtsberatung** und liefert keine verbindlichen Resultate. Die Berechnung dient ausschliesslich der ersten Orientierung. Massgebend sind stets die konkreten Umstände des Einzelfalls sowie die Praxis der zuständigen Gerichte und der Kindes- und Erwachsenenschutzbehörde (KESB). Die mitgelieferten Richtwerte sind typische Orientierungswerte und müssen vor jedem produktiven Einsatz an die massgebliche kantonale Praxis (z. B. KESB/Kantonsgericht Schaffhausen) angepasst und verifiziert werden.

## Roadmap

- [ ] Kantonal vorkonfigurierte Richtwertsätze
- [ ] PDF-Export des Berechnungsblatts
- [ ] BVG-/Vorsorgeabzüge und steuerliche Saldierung
- [ ] Alimentenindexierung (Art. 129 ZGB)
