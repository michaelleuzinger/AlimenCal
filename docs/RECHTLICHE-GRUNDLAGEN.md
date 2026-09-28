# AlimenCal – Rechtliche Grundlagen

Dieses Dokument fasst die rechtlichen Grundlagen zusammen, auf denen die
Berechnungen von AlimenCal beruhen. Es dient der Transparenz und ist **keine
Rechtsberatung**.

## 1. Rechtsquellen

| Thema | Rechtsgrundlage |
|---|---|
| Kindesunterhalt | Art. 276, Art. 285 f. ZGB (revidiertes Unterhaltsrecht, in Kraft seit 1. Januar 2017) |
| Ehegattenunterhalt bei Getrenntleben | Art. 176 ZGB |
| Nachehelicher Unterhalt | Art. 125 ZGB |
| Indexierung der Unterhaltsbeiträge | Art. 129 ZGB |
| Existenzminimum (betreibungsrechtlich) | Art. 93 SchKG, Richtlinien K Konferenz der Betreibungs- und Konkursbeamten (KK-BSV) |

## 2. Methodische Grundsätze der Rechtsprechung

### Kindesunterhalt

- Der Unterhalt umfasst **Barunterhalt** und **Betreuungsunterhalt**
  (Art. 285 Abs. 2 ZGB).
- Der Grundbedarf richtet sich nach den Bedürfnissen des Kindes und den
  Verhältnissen der Eltern; bei der Bemessung ist das Kind in die
  Verhältnisse (Lebensstandard) der Familie einzubeziehen.
- Aufteilung des Barunterhalts nach **wirtschaftlicher Leistungsfähigkeit**
  der Eltern (verfügbares Einkommen nach Abzug des Existenzminimums).
- Der Betreuungsunterhalt entschädigt die Betreuungsleistung der betreuenden
  Person und wird hier **netto verrechnet**.

### Ehegattenunterhalt

- **Zweistufig-konkrete Methode** (BGE 140 III 337; bestätigt und für die
  nacheheliche Zeit präzisiert durch **BGer 147 III 265**): Massgebend ist
  der konkrete, in der Ehe gepflegte Lebensstandard; pauschalierende
  Tabellen sind unzulässig.
- **Überschussmethode**: Der Bedarf wird mit der Leistungsfähigkeit des
  Unterhaltspflichtigen verglichen.
- **Mankomethode** (BGE 135 III 66): Reicht das Einkommen nicht, wird der
  verfügbare Überschuss im Verhältnis der Existenzminima verteilt; der
  ungedeckte Bedarf bleibt ausgewiesen.

## 3. Richtwerte (Default) und ihre Grenzen

Die mitgelieferten Defaults beruhen auf der Zürcher Kinderkosten-Tabelle vom
1. März 2025 (abzüglich der enthaltenen Kinder-Krankenkassenprämie von
CHF 130, da die effektive Prämie separat erfasst wird) sowie auf
betreibungsrechtlichen Richtwerten für die Existenzminima.

Wichtige Einschränkungen:

- Seit **BGer 147 III 265** ist die zweistufig-konkrete Methode verbindlich;
  pauschalierende Tabellen sind unzulässig. Tabellenwerte dienen deshalb
  nur noch als **Vergleichsmasse** und müssen im Einzelfall begründet werden.
- Die Zürcher Kinderkosten-Tabelle wird **per 2026 nicht mehr weitergeführt**.
- Richtwerte für den Betreuungsunterhalt sind Orientierungswerte; die
  kantonale Praxis ist massgebend.

## 4. Kanton Schaffhausen

- Es existiert **keine publizierte kantonale Unterhaltstabelle** für den
  Kanton Schaffhausen.
- Die KESB Schaffhausen wendet nach eigener Angaben (Merkblatt zum neuen
  Unterhaltsrecht, Ziff. 4) dasselbe Berechnungsmodell wie das Kantonsgericht
  Schaffhausen an; die konkreten Ansätze sind jedoch **nicht veröffentlicht**.
- Für Schaffhauser Fälle **müssen** die Richtwerte deshalb zwingend über die
  Konfiguration (Tab «Richtwerte») angepasst und mit den effektiven Ansätzen
  der KESB Schaffhausen (Mühlentalstrasse 65A, 8200 Schaffhausen) oder
  anwaltlich verifiziert werden. Das Preset `schaffhausen-offen.json` enthält
  hierzu eine Verifikations-Checkliste.

## 5. Kostentrennung vor der Scheidung

Die einvernehmliche Separation der laufenden Kosten vor der Scheidung ist
privatrechtlich eine Vereinbarung zwischen den Parteien; es besteht keine
gesetzliche Methode. Der von AlimenCal berechnete Ausgleich ist eine
Orientierungsrechnung auf Basis der getroffenen Zuordnungen. Für die
Zuordnung einzelner Posten zum Commonut/Eigengut sowie für steuerliche
Folgen sind die konkreten Umstände massgebend.

## 6. Disclaimer

AlimenCal ist ein Orientierungswerkzeug und **keine Rechtsberatung**. Es
liefert keine verbindlichen Resultate und ersetzt nicht die Beurteilung
durch Anwältinnen/Anwälte, die KESB oder das zuständige Gericht. Massgebend
sind stets der Einzelfall und die Praxis der zuständigen Instanzen.
