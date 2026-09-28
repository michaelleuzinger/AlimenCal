# AlimenCal – Benutzerhandbuch

AlimenCal ist ein mehrsprachiges Orientierungswerkzeug für Unterhaltsfragen bei
Trennung und Scheidung in der Schweiz. Die App läuft vollständig offline im
Browser; es werden keine Daten übertragen.

## Start

`index.html` im Browser öffnen – entweder direkt vom Dateisystem (`file://`)
oder von einem beliebigen statischen Webserver (z. B. GitHub Pages). Es gibt
keine Installation und keine Abhängigkeiten.

## Sprachen

Oben rechts kann die Sprache gewählt werden: **Deutsch, Français, Italiano,
English**. Die Auswahl wird im Browser gespeichert (`localStorage`) und beim
nächsten Öffnen wiederhergestellt.

## Tabs im Überblick

| Tab | Zweck |
|---|---|
| Kindesunterhalt | Barunterhalt und Betreuungsunterhalt pro Kind berechnen |
| Ehegattenunterhalt | Bedarf/Leistungsfähigkeit und allfälliger Beitrag (Art. 176 / Art. 125 ZGB) |
| Kostentrennung | Laufende Kosten ab einem Stichtag separat abrechnen (Bankexport) |
| Richtwerte | Richtwerte einsehen, anpassen, speichern, exportieren/importieren, kantionale Presets laden |

## Tab «Kindesunterhalt»

1. **Eltern**: Nettoeinkommen und allfälliges abweichendes Existenzminimum
   je Partei erfassen (Defaults: CHF 2200 erwerbstätig / CHF 2000 nicht
   erwerbstätig, betreibungsrechtliche Richtwerte als Orientierung).
2. **Kinder hinzufügen**: Alter (vollendete Altersjahre), allenfalls eigene
   Einkünfte und Kinderzulagen, effektive Krankenkassenprämie,
   Fremdbetreuungskosten sowie die Betreuungsanteile (z. B. 60/40).
3. **Resultat**: Grundbedarf (altersgestaffelt), Barunterhalt je Partei
   (aufgeteilt nach wirtschaftlicher Leistungsfähigkeit) und
   Betreuungsunterhalt (netto verrechnet zwischen den Parteien). Bei
   Unterdeckung wird eine Mangellage mit Mankobetrag ausgewiesen.

Hinweise:

- Bei 50/50-Betreuung ergibt der Betreuungsunterhalt netto keinen Saldo.
- Die Zürcher Tabellenwerte beinhalten eine pauschale Kinder-Krankenkassenprämie
  von CHF 130; diese ist im Default bereits abgezogen, damit die effektive
  Prämie nicht doppelt erfasst wird.

## Tab «Ehegattenunterhalt»

1. Checkbox aktivieren, falls ein Ehegattenunterhalt geprüft werden soll.
2. Angaben zum gebührenden Lebensstandard (Bedarf), allfällige Mehrkosten
   sowie Einkommen und Existenzminima beider Parteien erfassen.
3. **Resultat**: Bedarf, Leistungsfähigkeit und der allfällige Beitrag.
   Die App wendet die Überschussmethode (BGE 140 III 337) an; in Mangellagen
   wird der verfügbare Überschuss im Verhältnis der Existenzminima verteilt
   (Mankomethode, BGE 135 III 66).

## Tab «Kostentrennung»

Für Paare, die ihre laufenden Kosten schon **vor** der Scheidung separat
abrechnen wollen – ausführlich beschrieben in
[docs/KOSTENTRENNUNG.md](KOSTENTRENNUNG.md).

Kurz:

1. **Stichtag** wählen – Transaktionen davor werden nicht gewertet.
2. **Bankexport (CSV)** hochladen – Trennzeichen, Datums- und Betragsformate
   werden automatisch erkannt.
3. **Kontoinhaber** angeben (Partei A oder B).
4. Je Transaktion entscheiden: **ignorieren**, **anteilsmässig aufteilen**
   (Anteil je Transaktion konfigurierbar) oder **voll von Partei A bzw. B
   übernehmen**. Sammelaktionen erleichtern die Erstzuordnung.
5. **Ausgleich**: Die App zeigt, welche Partei der anderen wie viel schuldet.

## Tab «Richtwerte»

- Alle Richtwerte (Existenzminima, Grundbedarfe, Betreuungsunterhalt) sind
  hier sichtbar und anpassbar – vgl. die Default-Quellen im README.
- **Speichern** legt die angepassten Werte im Browser ab; **Export/Import**
  (JSON) erlaubt den Transfer zwischen Geräten.
- **Kantonale Presets** (z. B. Zürich 2025) können mit einem Klick geladen
  werden. Für den Kanton Schaffhausen existiert keine publizierte Tabelle;
  das mitgelieferte Preset ist ein Platzhalter mit Verifikations-Checkliste
  und **muss** vor Verwendung mit den effektiven Ansätzen von KESB/Kantonsgericht
  Schaffhausen ausgefüllt werden.

## Datenschutz

Alle Eingaben bleiben lokal im Browser (`localStorage`). Bankexporte werden
ausschliesslich im Browser geparsed – es findet kein Upload auf einen Server
statt. Die App funktioniert deshalb auch vollständig offline.

## Rechtlicher Hinweis

AlimenCal ist **keine Rechtsberatung** und ersetzt keine anwaltliche oder
behördliche Beurteilung. Die Resultate sind erste Orientierungswerte; massgebend
sind die Umstände des Einzelfalls und die Praxis der zuständigen Gerichte bzw.
der KESB. Siehe [docs/RECHTLICHE-GRUNDLAGEN.md](RECHTLICHE-GRUNDLAGEN.md).
