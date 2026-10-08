# AlimenCal – Vermögensausgleich zum Stichtag (vereinfacht)

Modul: `js/assetsplit.js` · UI-Tab: **Vermögensausgleich** · Tests:
`tests/assetsplit.test.js` (40 Tests)

## Zweck

Erfasst die Vermögenswerte beider Parteien (Konten, Anlagen, ETF,
Bargeld, Immobilien, Vorsorge, Schulden) als **Saldo zu einem Stichtag**
und berechnet einen einfachen Ausgleich: Das Nettovermögen beider
Parteien wird addiert und **hälftig geteilt**; die Partei mit dem
höheren Nettovermögen gleicht die Differenz zur Hälfte aus.

Dieser **vereinfachte Stichtags-Modus** leitet bewusst **keine
Errungenschaften** her und prüft **kein Eigengut** (Art. 198 ZGB). Er
liefert einen Orientierungswert, kein güterrechtliches Resultat nach
Art. 207/208 ZGB. Die Errungenschaftsbeteiligung ist als Ausbaustufe
unter Roadmap ([ROADMAP.md](ROADMAP.md)) aufgenommen.

## Ablauf

### 1. Stichtag wählen

Der Stichtag dokumentiert, per wann die Salden gelten. Empfohlen und per
Knopf übernehmbar: der **Tag vor dem Stichtag der Kostentrennung**
(`js/costsplit.js`, Tab «Kostentrennung»), z. B. der Tag vor dem
Getrenntleben. Das Feld ist frei überschreibbar, da die güterrechtliche
Auseinandersetzung rechtlich andere Stichtage kennt (Einzugsdatum
Scheidegrund, Rechtskraft der Scheidung).

### 2. Vermögenswerte erfassen

Pro Vermögenswert (Zeile):

| Feld | Bedeutung |
|---|---|
| Bezeichnung | z. B. «Konto bei Bank X», «ETF-Depot», «Bargeld» |
| Kategorie | Konto, Anlage, ETF/Wertschriften, Bargeld, Immobilie, Vorsorge (FZG), Anderes |
| Partei | A, B oder gemeinsam (mit Anteil A in %) |
| Saldo (CHF) | Stand per Stichtag; **Schulden als negative Werte** |
| Anteil A (%) | nur bei «gemeinsam»: Aufteilung des Werts (Standard 50 %) |

### 3. Ausgleich ablesen

Die App zeigt Nettovermögen je Partei, Total, hälftigen Soll und den
Ausgleichsbetrag (wer zahlt wie viel an wen).

## Rechtliche Hinweise (in der UI sichtbar)

- **Eigengut** (Art. 198 ZGB, z. B. Erbschaften, Schenkungen,
  Eigengutserklärungen nach Art. 199/200 ZGB) wird im vereinfachten
  Modus nicht separat behandelt – die hälftige Teilung des
  Totalvermögens kann daher danebenliegen.
- **Vorsorgeguthaben** (Freizügigkeitskonten und -policen, Art. 2 FZG)
  werden in der Regel nicht über den güterrechtlichen Ausgleich
  geteilt, sondern separat nach FZG übertragen; die Kategorie dient
  der Vollständigkeit der Vermögensaufnahme.
- Die Saldo-Erfassung zum Stichtag ersetzt keine Herleitung der
  Errungenschaft nach Art. 207 ZGB (Tageswerte der Errungenschaften,
  Ersatzforderungen nach Art. 209 ZGB, Vorschusszins nach Art. 208 ZGB).
- Kein Ersatz für eine Rechtsberatung; Bemessung obliegt Gericht und
  KESB.

## Persistenz und Austausch

- `localStorage`-Payload Version 4 (`js/storage.js`): `__assetsplit`
  mit `date` und `assets`; Migration von Version 3 ohne Datenverlust.
- Austausch zwischen Parteien: Abschnitt `assetsplit` in
  `js/casedata.js` (Validierung, Merge, Backup/Restore, Locks analog
  Kostentrennung, siehe [KOSTENTRENNUNG.md](KOSTENTRENNUNG.md) und
  [settings-binding-override.md](settings-binding-override.md)).

## Berechnung (Kurzform)

```
sumA = Σ Werte Partei A + joint·Anteil A
sumB = Σ Werte Partei B + joint·(1 − Anteil A)
total = sumA + sumB
half = total / 2
amount = |sumA − sumB| / 2  (gezahlt von der Partei mit dem höheren
                             Nettovermögen, gerundet auf 5 Rp.)
```
