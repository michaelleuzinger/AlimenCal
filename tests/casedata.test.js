'use strict';
/*
 * Unit-Tests für das AlimenCal-Falldaten-Austauschmodul.
 * Ausführung: node tests/casedata.test.js
 */
var casedata = require('../js/casedata.js');
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

/* ---------- Grundstruktur ---------- */
ok('APP-ID und Version gesetzt', typeof casedata.buildFile({}) === 'object');
ok('buildFile setzt app=alimencal', casedata.buildFile({}).app === 'alimencal');
ok('buildFile setzt version=1', casedata.buildFile({}).version === 1);
ok('buildFile enthält exportedAt (ISO)', /^\d{4}-\d{2}-\d{2}T/.test(casedata.buildFile({}).exportedAt));
ok('Alle 7 Abschnitte definiert', casedata.SECTIONS.length === 7);

/* ---------- Validierung: Datei-Ebene ---------- */
ok('sanitizeCase: null => invalid', casedata.sanitizeCase(null).valid === false);
ok('sanitizeCase: kein Objekt => invalid', casedata.sanitizeCase('text').valid === false);
ok('sanitizeCase: falsche APP-ID => invalid', casedata.sanitizeCase({ app: 'other', version: 1, sections: { parentA: {} } }).valid === false);
ok('sanitizeCase: falsche Version => invalid', casedata.sanitizeCase({ app: 'alimencal', version: 2, sections: { parentA: {} } }).valid === false);
ok('sanitizeCase: fehlende sections => invalid', casedata.sanitizeCase({ app: 'alimencal', version: 1 }).valid === false);
ok('sanitizeCase: leere sections => invalid', casedata.sanitizeCase({ app: 'alimencal', version: 1, sections: {} }).valid === false);

/* ---------- Validierung: Abschnitte ---------- */
var validFile = {
  app: 'alimencal',
  version: 1,
  sections: {
    parentA: { income: 7800, existenzminimum: '2200', employed: true },
    parentB: { income: '5800', existenzminimum: '', employed: 'false' },
    children: [{ age: 8, ownIncome: 0, childAllowance: 250, kkPremium: 130, externalCareCosts: 500, careShareParentA: 0.6, careShareParentB: 0.4 }],
    spousalApplicant: { income: 1500, existenzminimum: '', targetStandard: 4000, extraCosts: 200 },
    spousalRespondent: { income: 6000, existenzminimum: '', childSupportPaid: 800 },
    spousalEnabled: true,
    costsplit: {
      transactions: [{ id: 't1', date: '2025-02-05', description: 'Miete', amount: -1500 }],
      decisions: { t1: { mode: 'split', shareA: 0.5 } }
    }
  }
};

var res = casedata.sanitizeCase(validFile);
ok('Gültige Datei: valid', res.valid === true);
ok('Gültige Datei: 7 Abschnitte', Object.keys(res.sections).length === 7);
ok('Gültige Datei: keine invalid', res.invalid.length === 0);
ok('parentA.income = 7800', res.sections.parentA.income === 7800);
ok('parentB.employed: "false" => false', res.sections.parentB.employed === false);
ok('parentB.existenzminimum: "" => ""', res.sections.parentB.existenzminimum === '');
ok('children[0].age = 8', res.sections.children[0].age === 8);
ok('spousalEnabled: true', res.sections.spousalEnabled === true);
ok('costsplit.transactions[0].amount = -1500', res.sections.costsplit.transactions[0].amount === -1500);
ok('costsplit.decisions.t1.mode = split', res.sections.costsplit.decisions.t1.mode === 'split');

/* ---------- Validierung: ungültige Abschnitte werden verworfen ---------- */
var partiallyValid = {
  app: 'alimencal',
  version: 1,
  sections: {
    parentA: { income: 5000 },
    children: 'kein array',
    costsplit: { transactions: [{ id: 'x', date: '2025-02-05', description: 'x', amount: 'abc' }] }
  }
};
var res2 = casedata.sanitizeCase(partiallyValid);
ok('Teilweise gültig: valid (parentA ok)', res2.valid === true);
ok('Teilweise gültig: nur parentA übernommen', Object.keys(res2.sections).length === 1 && 'parentA' in res2.sections);
ok('Ungültiges children verworfen', res2.invalid.indexOf('children') >= 0);
ok('Ungültiges costsplit verworfen', res2.invalid.indexOf('costsplit') >= 0);

/* ---------- Transaction/Decision-Details ---------- */
ok('Transaction: fehlende id => null', casedata.sanitizeTransaction({ date: '2025-02-05', amount: 10 }) === null);
ok('Transaction: falsches Datumsformat => null', casedata.sanitizeTransaction({ id: 't', date: '05.02.2025', amount: 10 }) === null);
ok('Transaction: Betrag NaN => null', casedata.sanitizeTransaction({ id: 't', date: '2025-02-05', amount: 'abc' }) === null);
ok('Transaction: numerischer String-Betrag ok', casedata.sanitizeTransaction({ id: 't', date: '2025-02-05', amount: '-1500' }).amount === -1500);
ok('Decision: unbekannter Modus => null', casedata.sanitizeDecision({ mode: 'hack', shareA: 0.5 }) === null);
ok('Decision: shareA ausserhalb [0,1] => 0.5', casedata.sanitizeDecision({ mode: 'split', shareA: 1.5 }).shareA === 0.5);
ok('Decision: fehlender shareA => 0.5', casedata.sanitizeDecision({ mode: 'split' }).shareA === 0.5);

/* ---------- Merge ---------- */
var current = {
  parentA: { income: 111, existenzminimum: '', employed: true },
  parentB: { income: 222, existenzminimum: '', employed: true },
  children: null,
  spousalApplicant: null,
  spousalRespondent: null,
  spousalEnabled: false,
  costsplit: null
};
var merged = casedata.mergeCase(current, { parentB: { income: 999, existenzminimum: '', employed: false } });
ok('Merge: importierter Abschnitt ersetzt', merged.parentB.income === 999);
ok('Merge: nicht enthaltener Abschnitt bleibt', merged.parentA.income === 111);
ok('Merge: nicht importierte bleiben null', merged.children === null);
ok('Merge: __count zählt importierte', merged.__count === 1);

/* ---------- Roundtrip ---------- */
var exported = casedata.buildFile({ parentA: { income: 7800, existenzminimum: '', employed: true } });
var roundtrip = casedata.sanitizeCase(exported);
ok('Roundtrip: valid', roundtrip.valid === true);
ok('Roundtrip: income erhalten', roundtrip.sections.parentA.income === 7800);

/* ---------- Zusammenfassung ---------- */
console.log('\n' + passed + ' Tests bestanden' +
  (process.exitCode ? ', FEHLER vorhanden' : ', keine Fehler'));
