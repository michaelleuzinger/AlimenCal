# AlimenCal – Kostentrennung vor der Scheidung (Bankexport-Abgleich)

Modul: `js/costsplit.js` · UI-Tab: **Kostentrennung** · Tests:
`tests/costsplit.test.js` (54 Tests)

## Zweck

Entscheidet sich ein Paar, seine laufenden Kosten schon **vor** der Scheidung
zu separieren, erlaubt dieses Modul einen einfachen Ausgleich: Es wird ein
Stichtag definiert, ab dem die Kosten getrennt gewertet werden. Ein
Ein Bankexport (CSV oder ISO-20022-XML/camt) dient als Belegliste; jede Transaktion wird einer Partei
zugeordnet (ignorieren, anteilsmässig, voll). Die App berechnet, welche Partei
der anderen einen Ausgleichsbetrag bezahlt.

Alle Daten bleiben lokal im Browser – Bankexporte werden **nicht** übertragen.

## Ablauf

### 1. Stichtag wählen

Das Datum definiert, per wann die Kosten separiert werden. Transaktionen
**vor** dem Stichtag werden ausgegraut und nicht gewertet (sie zählen in der
Statistik unter «Vor Stichtag»).

### 2. Bankexport hochladen (CSV oder camt-XML)

Unterstützt werden gängige Schweizer Bankexporte:

- **Trennzeichen**: Semikolon, Komma oder Tabulator (automatische Erkennung)
- **Spalten**: `Datum`, `Beschreibung/Text`, `Betrag` – oder separate
  Spalten für Belastung/Gutschrift (Soll/Haben)
- **Datumsformate**: ISO (`2025-03-01`) und schweizerisch (`01.03.2025`,
  auch einstellig)
- **Beträge**: `1'234.56`, `1234,56`, negatives Vorzeichen; Apostroph als
  Tausenderzeichen wird ignoriert
- **Kopfzeile**: Spaltennamen werden normalisiert und erkannt; ungültige
  Zeilen werden mit Warnung übersprungen

Zusätzlich werden **ISO-20022-XML-Dateien** (camt.052/053/054, wie sie viele
Schweizer E-Banking-Portale als alternativen Export anbieten) direkt gelesen:

- **Erkennung**: Dateien, die mit `<` beginnen, werden als XML geparsed
- **Buchungsdatum**: `BookgDt` (Fallback `ValDt`)
- **Betrag**: `Amt` mit Vorzeichen gemäss `CdtDbfInd` (`DBIT` negativ,
  `CRDT` positiv)
- **Beschreibung**: `RmtInf/Ustrd`, sonst `AddtlNtryInf`, sonst `BkTxCd/Prtry`
- Ungültige Einträge werden mit Warnung übersprungen; alles bleibt lokal im
  Browser (kein XML-Validator externer Herkunft, kein Upload)

### 3. Kontoinhaber angeben

Das Bankkonto gehört **Partei A** oder **Partei B**. Daraus ergibt sich der
Ausgleichssinn: Der Kontoinhaber hat alle Zahlungen von diesem Konto geleistet;
die andere Partei bezahlt ihm ihren Anteil – umgekehrt bei Erträgen.

### 4. Je Transaktion entscheiden

| Aktion | Bedeutung |
|---|---|
| **Ignorieren** | Transaktion wird nicht gewertet (z. B. private Ausgabe des Kontoinhabers, Innentransfers) |
| **Anteilsmässig aufteilen** | Betrag wird nach Anteil aufgeteilt (Default 50/50); der **Anteil ist je Transaktion konfigurierbar** (z. B. 60 % Partei A / 40 % Partei B) |
| **Partei A übernimmt** | Voller Betrag geht zu Lasten von Partei A |
| **Partei B übernimmt** | Voller Betrag geht zu Lasten von Partei B |

Sammelaktionen erleichtern die Erstzuordnung: «alle anteilsmässig 50/50»,
«alle ignorieren», danach Feinjustierung einzelner Transaktionen.

### 5. Ausgleich

```
Summe Partei A = Summe aller Beträge, die A zu tragen hat
Summe Partei B = Summe aller Beträge, die B zu tragen hat
Gezahlt hat alles: der Kontoinhaber
```

- Haben beide gleich viel zu tragen, ist der Stand **ausgeglichen**.
- Andernfalls errechnet die App den Ausgleichsbetrag: Die Partei mit dem
  kleineren Anteil bezahlt der anderen Partei die Differenz.
- **Erträge** (Gutschriften, positive Beträge) werden gegengleich
  behandelt: Wer einen Ertrag voll übernimmt, erhält ihn gutgeschrieben;
  der Ausgleichssinn kehrt sich entsprechend um.

Die Statistik zeigt laufend: gewertete, nicht kategorisierte und
vor-Stichtag-Transaktionen.

## Berechnungsregeln (Implementierung)

- Anteile werden auf [0, 1] geklemmt; Rundung auf Rappen.
- Der Ausgleich (`computeSettlement`) bestimmt aus `sumA`/`sumB` und dem
  Kontoinhaber, wer wem wie viel zahlt; bei Saldo 0 kein Zahlungsfluss.
- Details und Grenzfälle: `tests/costsplit.test.js` (Parsing,
  Zuordnungsregeln, Abgrenzung Stichtag, Ausgleichslogik, E2E).

## Abgrenzung zum Vermögensausgleich

Die Kostentrennung erfasst **laufende Kosten** ab dem Stichtag. Die
güterrechtliche Auseinandersetzung der **Vermögenswerte** (Saldo je
Partei zum Stichtag, vereinfachter hälftiger Ausgleich) ist ein eigenes
Modul: `js/assetsplit.js`, Tab «Vermögensausgleich», beschrieben in
[VERMOEGENSAUSGLEICH.md](VERMOEGENSAUSGLEICH.md). Der dortige Stichtag
lässt sich per Knopf als «Tag vor dem Kostentrennungs-Stichtag»
übernehmen.

## Rechtliche Einordnung

Die Kostentrennung vor der Scheidung ist eine privatrechtliche Vereinbarung
zwischen den Parteien. AlimenCal liefert eine rechnerische Orientierung für
den Ausgleich; sie ersetzt keine Einigung, keine gerichtliche Beurteilung und
keine Rechtsberatung. Für die steuerliche und sachenrechtliche Behandlung
(Allgemeingut/Eigengut, Nutzungsentschädigung) sind die konkreten Umstände
massgebend – im Zweifel anwaltlich klären.

## Datenschutz

Bankexporte werden ausschliesslich lokal im Browser geparsed und verarbeitet
(`FileReader`). Es gibt keinen Server-Upload, keine Protokollierung und keine
Übertragung der Daten.
