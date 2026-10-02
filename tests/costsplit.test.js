'use strict';
/*
 * Unit-Tests für das Kostentrennungs-Modul.
 * Ausführung: node tests/costsplit.test.js
 */

var cs = require('../js/costsplit.js');
var assert = require('assert');

var passed = 0;
function ok(name, cond) {
  if (!cond) {
    console.error('FAIL: ' + name);
    process.exitCode = 1;
  } else {
    passed++;
    console.log('ok  ' + name);
  }
}
function close(a, b, eps) {
  return Math.abs(a - b) <= (eps || 0.01);
}

/* ---------- Betrags- und Datums-Parsing ---------- */

ok('Betragsparse: einfacher Betrag', cs.parseAmount('123.45') === 123.45);
ok('Betragsparse: Apostroph-Tausender', cs.parseAmount("1'234.50") === 1234.50);
ok('Betragsparse: deutsche Notation', cs.parseAmount('1.234,50') === 1234.50);
ok('Betragsparse: Komma-Dezimal', cs.parseAmount('12,50') === 12.50);
ok('Betragsparse: negativ', cs.parseAmount('-45.90') === -45.90);
ok('Betragsparse: leer/ungültig', cs.parseAmount('') === null && cs.parseAmount('abc') === null);

ok('Datumsparse: ISO', cs.parseDate('2025-03-14') === '2025-03-14');
ok('Datumsparse: CH-Format', cs.parseDate('14.03.2025') === '2025-03-14');
ok('Datumsparse: CH-Format einstellig', cs.parseDate('3.4.2025') === '2025-04-03');
ok('Datumsparse: ungültig', cs.parseDate('irgendwas') === null);

ok('Delimiter: Semikolon erkannt', cs.detectDelimiter('a;b;c') === ';');
ok('Delimiter: Tab erkannt', cs.detectDelimiter('a\tb\tc') === '\t');
ok('Delimiter: Komma erkannt', cs.detectDelimiter('a,b,c,') === ',');

ok('CSV-Zeile mit Quotes', JSON.stringify(cs.splitCsvLine('"a;1";b', ';')) === '["a;1","b"]');

/* ---------- CSV-Import: Standardfälle ---------- */

var csvSemikon = [
  '"Datum";"Beschreibung";"Betrag"',
  '"14.03.2025";"Miete Wohnung";"1\'500.00"',
  '"15.03.2025";"Krankenkasse Familie";"-450.00"',
  '"16.03.2025";"Restaurant";"-89.90"'
].join('\n');

var parsed = cs.parseBankCsv(csvSemikon);
ok('CSV: 3 Transaktionen erkannt', parsed.transactions.length === 3);
ok('CSV: Betrag mit Apostroph', close(parsed.transactions[0].amount, 1500.00));
ok('CSV: negativer Betrag', close(parsed.transactions[1].amount, -450.00));
ok('CSV: Datum normalisiert', parsed.transactions[0].date === '2025-03-14');
ok('CSV: Beschreibung übernommen', parsed.transactions[0].description === 'Miete Wohnung');

var csvKomma = [
  'Datum,Description,Amount',
  '2025-03-14,"Rent apartment",1500.00',
  '2025-03-15,"Insurance",-450.00'
].join('\n');
var parsedKomma = cs.parseBankCsv(csvKomma);
ok('CSV Komma-Delimiter: 2 Transaktionen', parsedKomma.transactions.length === 2);
ok('CSV Komma-Delimiter: Betrag', close(parsedKomma.transactions[0].amount, 1500.00));

/* Separate Soll/Haben-Spalten (wie z. B. bei manchen Banken) */
var csvSollHaben = [
  'Datum;Text;Belastung;Gutschrift',
  '01.03.2025;Miete;1500.00;',
  '05.03.2025;Lohn;;5000.00'
].join('\n');
var parsedSH = cs.parseBankCsv(csvSollHaben);
ok('CSV Soll/Haben: 2 Transaktionen', parsedSH.transactions.length === 2);
ok('CSV Soll/Haben: Belastung negativ gewertet', close(parsedSH.transactions[0].amount, -1500.00));
ok('CSV Soll/Haben: Gutschrift positiv', close(parsedSH.transactions[1].amount, 5000.00));

var csvBad = 'Datum;Text;Betrag\nnicht-datum;Foo;12.00';
var parsedBad = cs.parseBankCsv(csvBad);
ok('CSV: ungültige Zeile übersprungen mit Warnung',
  parsedBad.transactions.length === 0 && parsedBad.warnings.length > 0);

var parsedEmpty = cs.parseBankCsv('');
ok('CSV: leerer Text -> Warnung, keine Transaktionen',
  parsedEmpty.transactions.length === 0 && parsedEmpty.warnings.indexOf('empty') >= 0);

/* ---------- Auswertung: Entscheidungen ---------- */

var txs = [
  { id: 't1', date: '2025-01-05', description: 'Miete', amount: 1500 },
  { id: 't2', date: '2025-01-10', description: 'KK-Prämie', amount: -450 },
  { id: 't3', date: '2025-02-01', description: 'Restaurant', amount: -120 },
  { id: 't4', date: '2025-02-15', description: 'Ferien', amount: -2000 },
  { id: 't5', date: '2025-03-01', description: 'Persönlich A', amount: -100 }
];

var decisions = {
  t1: { mode: 'split', shareA: 0.5 },
  t2: { mode: 'split', shareA: 0.6 },
  t3: { mode: 'partyA' },
  t4: { mode: 'partyB' },
  t5: { mode: 'ignore' }
};

var totals = cs.computeSplit(txs, decisions, null);
ok('Split ohne Datum: alle 5 kategorisiert', totals.countConsidered === 5);
// sumA = t1(750) + t2(-270) + t3 partyA(-120) = 360
// sumB = t1(750) + t2(-180) + t4 partyB(-2000) = -1430
ok('Split 50/50 (t1) + 60/40 (t2) + partyA/partyB: A 360, B -1430',
  close(totals.sumA, 360) && close(totals.sumB, -1430));
ok('Split-Kategorie total = t1 + t2',
  close(totals.perCategory.split, 1500 - 450));
ok('partyA übernimmt t3: A trägt -120',
  close(totals.perCategory.partyA, -120));
ok('partyB übernimmt t4: B trägt -2000',
  close(totals.perCategory.partyB, -2000));
ok('ignore: t5 nicht gewertet', close(totals.perCategory.ignore, -100));
ok('Totale konsistent', close(totals.total, totals.sumA + totals.sumB));

/* Abgrenzungsdatum */
var totalsFromDate = cs.computeSplit(txs, decisions, '2025-02-01');
ok('Abgrenzung: 2 Transaktionen vor Datum ausgeschlossen',
  totalsFromDate.countBeforeDate === 2);
ok('Abgrenzung: nur ab Februar gewertet',
  close(totalsFromDate.sumA, -120) && close(totalsFromDate.sumB, -2000));

/* Unkategorisierte Transaktionen werden ignoriert, aber gezählt */
var totalsMissing = cs.computeSplit(txs, { t1: { mode: 'split', shareA: 0.5 } }, null);
ok('Unkategorisiert: 4 gezählt, 1 gewertet',
  totalsMissing.countIgnored === 4 && totalsMissing.countConsidered === 1);

/* Anteilsvalidierung */
var totalsClamp = cs.computeSplit(
  [{ id: 'x', date: '2025-01-01', description: '', amount: 100 }],
  { x: { mode: 'split', shareA: 7 } }, null);
ok('Anteil >1 wird auf 1 geklemmt', close(totalsClamp.sumA, 100));

/* ---------- Ausgleich (Kontoinhaber-Logik) ---------- */

// Konto gehört A; B übernimmt 1000 an Kosten -> B zahlt A 1000
var st1 = cs.computeSettlement({ sumA: 0, sumB: -1000 }, true);
ok('Ausgleich: B (Nicht-Inhaber) übernimmt Kosten -> B zahlt A',
  st1.from === 'B' && st1.to === 'A' && close(st1.amount, 1000));

// Konto gehört A; B erhält 500 Ertrag -> A zahlt B 500
var st2 = cs.computeSettlement({ sumA: 0, sumB: 500 }, true);
ok('Ausgleich: B erhält Ertrag -> A zahlt B',
  st2.from === 'A' && st2.to === 'B' && close(st2.amount, 500));

// Konto gehört B; A übernimmt 750 an Kosten -> A zahlt B 750
var st3 = cs.computeSettlement({ sumA: -750, sumB: 0 }, false);
ok('Ausgleich: A (Nicht-Inhaber) übernimmt Kosten -> A zahlt B',
  st3.from === 'A' && st3.to === 'B' && close(st3.amount, 750));

// Ausgeglichen
var st4 = cs.computeSettlement({ sumA: 0, sumB: 0 }, true);
ok('Ausgleich: ausgeglichen -> kein Zahlungsfluss',
  st4.amount === 0 && st4.from === null && st4.to === null);

// End-to-End: CSV -> Entscheid -> Ausgleich
// Konto gehört A; A zahlt Miete -1500 (50/50) und Restaurant -100 (voll B)
var csvE2E = [
  '"Datum";"Beschreibung";"Betrag"',
  '"14.03.2025";"Miete";"-1500.00"',
  '"15.03.2025";"Restaurant";"-100.00"'
].join('\n');
var parsedE2E = cs.parseBankCsv(csvE2E);
var decisionsE2E = {
  'tx-1': { mode: 'split', shareA: 0.5 },   // Miete je 750
  'tx-2': { mode: 'partyB' }                  // Restaurant voll B
};
var totalsE2E = cs.computeSplit(parsedE2E.transactions, decisionsE2E, null);
var settlementE2E = cs.computeSettlement(totalsE2E, true);
// Konto A: A-Anteil 750; B zahlt an A den Ausgleich: Miete-Anteil 750 + Restaurant 100 = 850
ok('E2E Ausgleich: B zahlt A 850',
  settlementE2E.from === 'B' && settlementE2E.to === 'A' &&
  close(settlementE2E.amount, 850));

/* ---------- camt.053 XML-Import (ISO 20022) ---------- */
var camtXml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.053.001.02">',
  '  <BkToCstmrAcctRpt>',
  '    <Stmt>',
  '      <Acct>',
  '        <Id><IBAN>CH001234000123456789</IBAN></Id>',
  '      </Acct>',
  '      <Ntry>',
  '        <Amt Ccy="CHF">1500.00</Amt>',
  '        <CdtDbfInd>DBIT</CdtDbfInd>',
  '        <BookgDt><Dt>2025-03-14</Dt></BookgDt>',
  '        <NtryDtls><TxDtls>',
  '          <RmtInf><Ustrd>Miete M&auml;rz</Ustrd></RmtInf>',
  '        </TxDtls></NtryDtls>',
  '      </Ntry>',
  '      <Ntry>',
  '        <Amt Ccy="CHF">2500.55</Amt>',
  '        <CdtDbfInd>CRDT</CdtDbfInd>',
  '        <BookgDt><Dt>2025-03-15</Dt></BookgDt>',
  '        <AddtlNtryInf>Lohn</AddtlNtryInf>',
  '      </Ntry>',
  '      <Ntry>',
  '        <Amt Ccy="CHF">100.00</Amt>',
  '        <CdtDbfInd>DBIT</CdtDbfInd>',
  '        <ValDt><Dt>2025-03-16</Dt></ValDt>',
  '      </Ntry>',
  '    </Stmt>',
  '  </BkToCstmrAcctRpt>',
  '</Document>'
].join('\n');

var parsedCamt = cs.parseCamtXml(camtXml);
ok('camt: 3 Transaktionen erkannt', parsedCamt.transactions.length === 3);
ok('camt: Betrag DBIT negativ', close(parsedCamt.transactions[0].amount, -1500));
ok('camt: Betrag CRDT positiv', close(parsedCamt.transactions[1].amount, 2500.55));
ok('camt: Buchungsdatum ISO', parsedCamt.transactions[0].date === '2025-03-14');
ok('camt: Valutadatum als Fallback', parsedCamt.transactions[2].date === '2025-03-16');
ok('camt: Ustrd als Beschreibung', /Miete M\u00e4rz/.test(parsedCamt.transactions[0].description));
ok('camt: XML-Entity dekodiert', parsedCamt.transactions[0].description.indexOf('März') >= 0);
ok('camt: AddtlNtryInf als Beschreibung', parsedCamt.transactions[1].description === 'Lohn');
ok('camt: BkTxCd-Fallback leer akzeptiert', typeof parsedCamt.transactions[2].description === 'string');

var camtNamespaced = camtXml.replace(/<Amt /g, '<ns:Amt ').replace(/<\/Amt>/g, '</ns:Amt>');
ok('camt: ungültiges XML erkannt', cs.parseCamtXml('nicht xml').warnings.indexOf('invalidXml') >= 0 || cs.parseCamtXml('nicht xml').warnings.length > 0);
ok('camt: leere Eingabe ohne Transaktionen', cs.parseCamtXml('').transactions.length === 0);

var camtDecisions = {
  'tx-1': { mode: 'split', shareA: 0.5 },
  'tx-2': { mode: 'partyA' },
  'tx-3': { mode: 'ignore' }
};
var camtTotals = cs.computeSplit(parsedCamt.transactions, camtDecisions, null);
var camtSettlement = cs.computeSettlement(camtTotals, true);
ok('camt E2E: Ausgleich berechnet', isFinite(camtSettlement.amount) && camtSettlement.amount >= 0);

/* ---------- Zusammenfassung ---------- */

console.log('\n' + passed + ' Tests bestanden' +
  (process.exitCode ? ', FEHLER vorhanden' : ', keine Fehler'));
