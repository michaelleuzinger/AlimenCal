# AlimenCal – Berechnungslogik

Dieses Dokument beschreibt, wie der Berechnungskern (`js/calculator.js`)
arbeitet. Der Kern ist frei von DOM-Zugriff und damit auch in Node.js
(Unit-Tests) lauffähig. Implementierung und Tests:
`tests/calculator.test.js` (53 Tests).

## 1. Kindesunterhalt (Art. 276, 285 f. ZGB)

Rechtsgrundlage ist das revidierte Unterhaltsrecht (in Kraft seit
1. Januar 2017): Der Unterhalt umfasst den **Barunterhalt** (Grundbedarf,
direkte Kosten) und den **Betreuungsunterhalt** der betreuenden Person.

### 1.1 Verfügbares Einkommen der Eltern

```
verfügbares Einkommen = max(0, Nettoeinkommen − Existenzminimum)
```

- Das Existenzminimum ist je Partei übersteuerbar; sonst gilt der
  konfigurierte Default (CHF 2200 erwerbstätig / CHF 2000 nicht erwerbstätig,
  betreibungsrechtliche Richtlinien als Orientierung, Art. 93 SchKG).
- Massgebend für die Aufteilung ist die **wirtschaftliche
  Leistungsfähigkeit**: Barunterhalt wird im Verhältnis der verfügbaren
  Einkommen verteilt.

### 1.2 Grundbedarf des Kindes (Barunterhalt)

- Altersgestaffelte Tabelle (`childNeedTable`), Default: Zürcher
  Kinderkosten-Tabelle vom 1. März 2025 (Einzelkind), abzüglich der
  enthaltenen pauschalen Kinder-Krankenkassenprämie von CHF 130, da die
  effektive Prämie separat erfasst wird:

| Altersjahr | Gesamtkosten lt. Tabelle | Default-Grundbedarf (abzgl. CHF 130) |
|---|---|---|
| 1.–6. | CHF 1440 | CHF 1310 |
| 7.–12. | CHF 1575 | CHF 1445 |
| 13.–17. | CHF 1920 | CHF 1790 |
| ab 18 (bis 21) | CHF 1920 | CHF 1790 |

- Dazu: effektive Kinder-Krankenkassenprämie, allfällige eigene Einkünfte und
  Kinderzulagen des Kindes (werden abgezogen) sowie Fremdbetreuungskosten
  (direkte Kosten, werden zum Grundbedarf addiert und analog verteilt).

### 1.3 Aufwandsmodus: Pauschale oder effektive Kosten

Pro Kind kann umgeschaltet werden, wie der Grundbedarf ermittelt wird
(Feld **Aufwandsmodus**):

- **Pauschale (Richtwerttabelle)**: Standard; der Grundbedarf ergibt sich
  aus der altersgestaffelten Tabelle wie in Abschnitt 1.2 beschrieben.
- **Effektive Kosten**: Der Grundbedarf wird aus den effektiv angegeben
  Kosten des Kindes (Total CHF/Monat) abgeleitet. Da Krankenkassenprämie
  und Fremdbetreuungskosten als direkte Kosten separat erfasst und
  addiert werden, werden sie von den effektiven Kosten abgezogen, um eine
  Doppelerfassung zu vermeiden:

```
Grundbedarf (effektiv) = max(0, effektive Kosten total
                             − Krankenkassenprämie − Fremdbetreuungskosten)
```

Die übrige Berechnung (Abzug des Kindeseinkommens, Aufteilung nach
wirtschaftlicher Leistungsfähigkeit, Mangellage) ist identisch zum
pauschalen Modus. Das Resultat weist den gewählten Modus je Kind aus.

### 1.4 Aufteilung des Barunterhalts

```
Anteil Partei A = verfügbares Einkommen A / (verfügbar A + verfügbar B)
Anteil Partei B = 1 − Anteil A
```

Ist nur eine Partei leistungsfähig, trägt diese den gesamten Barunterhalt.

### 1.5 Betreuungsunterhalt

- Richtwerte je Altersklasse (Default: CHF 700–1100, Orientierungswerte).
- Der Betreuungsunterhalt wird **netto verrechnet**: Jede Partei erhält für
  ihre tatsächlichen Betreuungsanteile einen Betreuungsunterhaltsanspruch;
  die Differenz fliesst als Saldo von der einen zur anderen Partei. Bei
  50/50-Betreuung ergibt sich daher kein Saldo.
- Betreuungsanteile ergeben in Summe immer 100 %: In der UI wird das
  Gegenfeld automatisch ergänzt (A + B = 100 %, Werte auf [0, 100] geklemmt);
  in der Berechnung werden Anteile zusätzlich normalisiert (Summe ≠ 100 %
  wird skaliert; leere Angabe gilt als 50/50). Betreuungsunterhalt entfällt
  ab dem 18. Altersjahr (`careSupportMaxAge`).

### 1.6 Mangellage (Manko)

Übersteigen die Bedarfe die verfügbaren Mittel, wird die Mangellage erkannt:

- Jede Partei zahlt höchstens ihr verfügbares Einkommen.
- Der ungedeckte Bedarf (Manko) wird ausgewiesen, inklusive Hinweis auf die
  Nachforderungspraxis.

## 2. Ehegattenunterhalt (Art. 176 ZGB; nachehelich Art. 125 ZGB)

Methodisch folgt die App der Rechtsprechung des Bundesgerichts:

### 2.1 Überschussmethode (keine Mangellage)

```
Bedarf (Bedarfspartei)      = gebührender Lebensstandard + Mehrkosten
Leistungsfähigkeit (Zahler) = Einkommen − Existenzminimum
Beitrag = min(Bedarf, Leistungsfähigkeit)
```

Massgebend ist die zweistufig-konkrete Methode (BGE 140 III 337; bestätigt
durch BGer 147 III 265): Der Bedarf wird aus der konkreten Lebenshaltung
während der Ehe abgeleitet, pauschalierende Tabellen sind unzulässig.

### 2.2 Mankomethode (Mangellage)

Reicht das verfügbare Einkommen nicht:

```
Beitrag = verfügbarer Überschuss × (Existenzminimum Bedarfspartei /
           (Existenzminimum A + Existenzminimum B))
```

Der ungedeckte Restbedarf wird ausgewiesen (vgl. BGE 135 III 66).

## 3. Rundung

Alle Zahlungen werden auf Rappen kaufmännisch gerundet (`round2`); Anteile
werden auf [0, 1] geklemmt.

## 4. Kostentrennung

Siehe [docs/KOSTENTRENNUNG.md](KOSTENTRENNUNG.md) und `js/costsplit.js`
(42 Tests in `tests/costsplit.test.js`).
