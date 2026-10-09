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
ok('v3: buildFormPayload version=aktuell (Migration getestet)', v3Payload.version === storage.FORM_VERSION);
var v3Parsed = storage.parseStored(JSON.stringify(v3Payload));
ok('v3: Roundtrip sectionLocks', v3Parsed.form.__sectionLocks[0] === 'parentB');
/* ---------- v5-Migration: Vermoegensausgleich ---------- */
ok('v5: FORM_VERSION = 5', storage.FORM_VERSION === 5);
var v4PayloadAS = JSON.stringify({ app: 'alimencal', kind: 'form', version: 4, form: { 'pa-income': '5000', 'party-name-a': 'Anna' } });
var v4ParsedAS = storage.parseStored(v4PayloadAS);
ok('v5-Migration: v4-Payload lesbar', v4ParsedAS.status === 'ok');
ok('v5-Migration: changed gesetzt', v4ParsedAS.changed === true);
ok('v5-Migration: Partei-Name erhalten', v4ParsedAS.form['party-name-a'] === 'Anna');
var v5Payload = storage.buildFormPayload({ 'pa-income': '5000', __assetsplit: { date: '2025-05-31', assets: [
  { id: 'a1', label: 'Konto A', category: 'account', owner: 'A', value: 1200 },
  { label: 'ungueltig', value: 'abc' }
] } });
ok('v5: buildFormPayload version=5', v5Payload.version === 5);
var v5Parsed = storage.parseStored(JSON.stringify(v5Payload));
ok('v5: Roundtrip assetsplit.date', v5Parsed.form.__assetsplit.date === '2025-05-31');
ok('v5: Roundtrip assets[0].value', v5Parsed.form.__assetsplit.assets[0].value === 1200);
ok('v5: ungueltiger Eintrag verworfen', (function () { var n = storage.normalizeAssetsplit(v5Parsed.form.__assetsplit); return n !== null && n.assets.length === 1; })());
ok('v5: normalizeAssetsplit ohne assets -> null', storage.normalizeAssetsplit({ date: '2025-01-01' }) === null);
ok('v5: normalizeAssetsplit ungueltiges Datum -> leer', (function () {
  var n = storage.normalizeAssetsplit({ date: '31.12.2025', assets: [] });
  return n !== null && n.date === '';
})());
ok('v5: normalizeAssetsplit fehlendes Datum -> leer', storage.normalizeAssetsplit({ assets: [] }).date === '');
ok('v5: v4-Payload ohne assetsplit: kein Schluessel', !('___assetsplit' in v4ParsedAS.form));

ok('v3: Altdaten ohne sectionLocks => kein Lock-Array', (function () {
  var p = storage.parseStored(JSON.stringify({ app: 'alimencal', kind: 'form', version: 2, form: { 'pa-income': '1' } }));
  return p.status === 'ok' && !Array.isArray(p.form.__sectionLocks);
})());
/* ---------- v4-Migration: Partei-Namen ---------- */
ok('v4: normalizePartyName trimmt/leert', storage.normalizePartyName('  Anna  ') === 'Anna' && storage.normalizePartyName('   ') === '');
ok('v4: normalizePartyName laengenbeschraenkt', storage.normalizePartyName(new Array(60).join('x')).length === storage.PARTY_NAME_MAX);
ok('v4: normalizePartyName nicht-string -> leer', storage.normalizePartyName(42) === '' && storage.normalizePartyName(null) === '');
var v4Payload = storage.buildFormPayload({ 'pa-income': '5000', 'party-name-a': 'Anna', 'party-name-b': '  Ben  ' });
ok('v4: buildFormPayload version=aktuell', v4Payload.version === storage.FORM_VERSION);
var v4Parsed = storage.parseStored(JSON.stringify(v4Payload));
ok('v4: Roundtrip Partei-Namen', v4Parsed.form['party-name-a'] === 'Anna' && v4Parsed.form['party-name-b'] === '  Ben  ');
ok('v4: kein Re-Save noetig', v4Parsed.changed === false);
ok('v4-Migration: v3-Payload mit unnormalisierten Namen wird normalisiert', (function () {
  var p = storage.parseStored(JSON.stringify({ app: 'alimencal', kind: 'form', version: 3, form: { 'party-name-a': '  x'.padEnd(50, 'y') + '  ', 'party-name-b': 5 } }));
  return p.status === 'ok' && p.changed === true &&
    p.form['party-name-a'].length === storage.PARTY_NAME_MAX &&
    p.form['party-name-b'] === '';
})());
ok('v4-Migration: v3-Payload ohne Namen bleibt lesbar', (function () {
  var p = storage.parseStored(JSON.stringify({ app: 'alimencal', kind: 'form', version: 3, form: { 'pa-income': '1' } }));
  return p.status === 'ok' && !('party-name-a' in p.form);
})());

/* ---------- Normalisierungs-Einzelne ---------- */
ok('Kind ohne Alter -> null', storage.normalizeChild({ costMode: 'pauschal' }) === null);
ok('Kind mit Alter 100 -> null', storage.normalizeChild({ age: 100 }) === null);
ok('Kinder ohne Array -> null', storage.normalizeChildren('x') === null);
ok('Kostentrennung ohne transactions -> null', storage.normalizeCostsplit({}) === null);

/* ---------- Backup-Erinnerung (taeglich / viele Aenderungen) ---------- */
var NOW = 1700000000000;
var DAY = storage.BACKUP_INTERVAL_MS;
ok('Intervall betraegt 24h', storage.BACKUP_INTERVAL_MS === 24 * 60 * 60 * 1000);
ok('Aenderungs-Schwelle betraegt 25', storage.BACKUP_CHANGES_THRESHOLD === 25);
ok('Erst-Erinnerung: Schwelle betraegt 5', storage.BACKUP_INITIAL_CHANGES_THRESHOLD === 5);
ok('Meta: kein Backup bisher -> keine Erinnerung', storage.backupReminderDue(null, NOW) === false);
ok('Erst-Erinnerung: noch kein Backup, 4 Aenderungen -> nein', storage.backupReminderDue({ lastAt: null, changes: 4 }, NOW) === false);
ok('Erst-Erinnerung: noch kein Backup, 5 Aenderungen -> ja', storage.backupReminderDue({ lastAt: null, changes: 5 }, NOW) === true);
ok('Erst-Erinnerung: Art -> initial', storage.backupReminderKind({ lastAt: null, changes: 7 }, NOW) === 'initial');
ok('Meta: ungueltiges Objekt -> sanitisiert null/0', (function () {
  var m = storage.sanitizeBackupMeta({ lastAt: 'x', changes: -3 });
  return m !== null && m.lastAt === null && m.changes === 0;
})());
ok('Erinnerung: frisches Backup (23h) -> nein', storage.backupReminderDue({ lastAt: NOW - 23 * 3600 * 1000, changes: 0 }, NOW) === false);
ok('Erinnerung: altes Backup (25h) -> ja', storage.backupReminderDue({ lastAt: NOW - 25 * 3600 * 1000, changes: 0 }, NOW) === true);
ok('Erinnerung: 24 Aenderungen -> nein', storage.backupReminderDue({ lastAt: NOW, changes: 24 }, NOW) === false);
ok('Erinnerung: 25 Aenderungen -> ja', storage.backupReminderDue({ lastAt: NOW, changes: 25 }, NOW) === true);
ok('Art: altes Backup -> old', storage.backupReminderKind({ lastAt: NOW - DAY, changes: 0 }, NOW) === 'old');
ok('Art: viele Aenderungen (Vorrang) -> many', storage.backupReminderKind({ lastAt: NOW - DAY, changes: 30 }, NOW) === 'many');
ok('Art: frisches Backup, wenige Aenderungen -> null', storage.backupReminderKind({ lastAt: NOW, changes: 3 }, NOW) === null);

console.log(passed + ' Tests bestanden');
