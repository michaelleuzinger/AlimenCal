'use strict';

/*
 * Unit-Tests fuer das AlimenCal-Speicherformat (localStorage-Persistenz).
 * Ausfuehrung: node tests/storage.test.js
 */

var storage = require('../js/storage.js');
var costsplit = require('../js/costsplit.js');
global.AlimenCal = global.AlimenCal || {};
global.AlimenCal.costsplit = costsplit;
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

function payloadV2(form) {
  return JSON.stringify(storage.buildFormPayload(form));
}

/* ---------- Payload bauen / lesen (Roundtrip) ---------- */
var form = {
  'pa-income': '5000',
  'spousal-enabled': true,
  __children: [storage.CHILD_DEFAULTS],
  __costsplit: {
    transactions: [{ id: 'tx-1', date: '2025-03-14', description: 'Test', amount: -100 }],
    decisions: { 'tx-1': { mode: 'split', shareA: 0.5 } }
  }
};
var stored = payloadV2(form);
var parsed = storage.parseStored(stored);
ok('Roundtrip: status ok', parsed.status === 'ok');
ok('Roundtrip: Version ' + storage.FORM_VERSION, parsed.version === storage.FORM_VERSION);
ok('Roundtrip: Feld erhalten', parsed.form['pa-income'] === '5000');
ok('Roundtrip: Kind erhalten', parsed.form.__children.length === 1);
ok('Roundtrip: Kostentrennung erhalten', parsed.form.__costsplit.transactions.length === 1);
ok('Roundtrip: kein Re-Save noetig', parsed.changed === false);

/* ---------- Unversionierter Altbestand (Format 1) ---------- */
var legacy = {
  'pa-income': '5000',
  __children: [{ age: 8 }, { age: 'x' }, null],
  __costsplit: {
    transactions: [
      { id: 'tx-1', date: '14.03.2025', description: 'Alt', amount: '-100' },
      { id: 'tx-2', date: 'ungueltig', amount: 50 },
      { date: '2025-01-01', amount: 30 }
    ],
    decisions: {
      'tx-1': { mode: 'split', shareA: '0.3' },
      'tx-2': { mode: 'kaputt' }
    }
  }
};
var legacyParsed = storage.parseStored(JSON.stringify(legacy));
ok('Altbestand: status ok', legacyParsed.status === 'ok');
ok('Altbestand: als Version 1 erkannt', legacyParsed.version === 1);
ok('Altbestand: Migration markiert Re-Save', legacyParsed.changed === true);
ok('Altbestand: ungueltige Kinder verworfen', legacyParsed.form.__children.length === 1);
ok('Altbestand: Kind-Defaults ergaenzt', legacyParsed.form.__children[0].costMode === 'pauschal');
ok('Altbestand: careShareParentB-Default', legacyParsed.form.__children[0].careShareParentB === 100);
ok('Altbestand: CH-Datum normalisiert', legacyParsed.form.__costsplit.transactions[0].date === '2025-03-14');
ok('Altbestand: Betrag normalisiert', legacyParsed.form.__costsplit.transactions[0].amount === -100);
ok('Altbestand: ungueltige Transaktion verworfen', legacyParsed.form.__costsplit.transactions.length === 2);
ok('Altbestand: fehlende Tx-ID ergaenzt', /^tx-\d+$/.test(legacyParsed.form.__costsplit.transactions[1].id));
ok('Altbestand: Decision-Anteil normalisiert', legacyParsed.form.__costsplit.decisions['tx-1'].shareA === 0.3);
ok('Altbestand: ungueltige Decision verworfen',
  !Object.prototype.hasOwnProperty.call(legacyParsed.form.__costsplit.decisions, 'tx-2'));

/* Nach dem Re-Save ist das Ergebnis stabil (Roundtrip der migrierten Daten). */
var reparsed = storage.parseStored(payloadV2(legacyParsed.form));
ok('Nach Migration: Re-Save lesbar', reparsed.status === 'ok');
ok('Nach Migration: kein weiterer Re-Save', reparsed.changed === false);
ok('Nach Migration: Daten identisch',
  JSON.stringify(reparsed.form) === JSON.stringify(legacyParsed.form));

/* ---------- Ungueltige Payloads ---------- */
ok('Leerer String -> empty', storage.parseStored('').status === 'empty');
ok('null -> empty', storage.parseStored(null).status === 'empty');
ok('Kein JSON -> invalid', storage.parseStored('{broken').status === 'invalid');
ok('Zahl statt Objekt -> invalid', storage.parseStored('42').status === 'invalid');
var wrongApp = JSON.stringify({ app: 'other', kind: 'form', version: 2, form: {} });
ok('Fremde App-ID -> invalid', storage.parseStored(wrongApp).status === 'invalid');
var wrongKind = JSON.stringify({ app: 'alimencal', kind: 'other', version: 2, form: {} });
ok('Falsche kind -> invalid', storage.parseStored(wrongKind).status === 'invalid');
var tooNew = JSON.stringify({ app: 'alimencal', kind: 'form', version: 99, form: {} });
ok('Zu neue Version -> invalid', storage.parseStored(tooNew).status === 'invalid');
var noForm = JSON.stringify({ app: 'alimencal', kind: 'form', version: 2 });
ok('Payload ohne form -> invalid', storage.parseStored(noForm).status === 'invalid');

/* Version 1-Payload mit Header-Feldern (nicht v1, sondern unversioniert) */
var versionedV1 = JSON.stringify({
  app: 'alimencal', kind: 'form', version: 1, form: { 'pa-income': '1' }
});
var v1Parsed = storage.parseStored(versionedV1);
ok('Versionierter v1-Payload: ok', v1Parsed.status === 'ok');
ok('Versionierter v1-Payload: Re-Save markiert', v1Parsed.changed === true);


/* ---------- v3-Migration: Abschnitt-Locks ---------- */
var v2Payload = JSON.stringify({ app: 'alimencal', kind: 'form', version: 2, form: { 'pa-income': '5000', __sectionLocks: ['parentA', 'bogus', 'children'] } });
var v2Parsed = storage.parseStored(v2Payload);
ok('v3-Migration: v2-Payload lesbar', v2Parsed.status === 'ok');
ok('v3-Migration: ungueltige Lock-Keys entfernt', v2Parsed.form.__sectionLocks.indexOf('parentA') >= 0 && v2Parsed.form.__sectionLocks.indexOf('bogus') < 0);
ok('v3-Migration: changed gesetzt', v2Parsed.changed === true);
var v3Payload = storage.buildFormPayload({ 'pa-income': '5000', __sectionLocks: ['parentB'] });
ok('v3: buildFormPayload version=3', v3Payload.version === 3);
var v3Parsed = storage.parseStored(JSON.stringify(v3Payload));
ok('v3: Roundtrip sectionLocks', v3Parsed.form.__sectionLocks[0] === 'parentB');
ok('v3: Altdaten ohne sectionLocks => kein Lock-Array', (function () {
  var p = storage.parseStored(JSON.stringify({ app: 'alimencal', kind: 'form', version: 2, form: { 'pa-income': '1' } }));
  return p.status === 'ok' && !Array.isArray(p.form.__sectionLocks);
})());
/* ---------- Normalisierungs-Einzelne ---------- */
ok('Kind ohne Alter -> null', storage.normalizeChild({ costMode: 'pauschal' }) === null);
ok('Kind mit Alter 100 -> null', storage.normalizeChild({ age: 100 }) === null);
ok('Kinder ohne Array -> null', storage.normalizeChildren('x') === null);
ok('Kostentrennung ohne transactions -> null', storage.normalizeCostsplit({}) === null);

console.log(passed + ' Tests bestanden');
