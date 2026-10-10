'use strict';
/*
 * Tests fuer den Geraete-Sync (js/syncdata.js): syncMeta-Validierung,
 * Stand-Vergleich, abschnittsweiser Merge (neuere Datei, Konflikt,
 * fehlende Abschnitte), Sync-Datei-Build/-Validierung und Passwort-
 * Krypto-Roundtrip (js/casecrypto.js, PBKDF2 + AES-GCM).
 * Ausfuehrung: node tests/syncdata.test.js
 */
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var ROOT = path.join(__dirname, '..');
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
global.AlimenCal = global.AlimenCal || {};
var themes = require(path.join(ROOT, 'js/themes.js'));
global.AlimenCal.themes = themes;
var casedata = require(path.join(ROOT, 'js/casedata.js'));
global.AlimenCal.casedata = casedata;
var casecrypto = require(path.join(ROOT, 'js/casecrypto.js'));
global.AlimenCal.casecrypto = casecrypto;
var config = require(path.join(ROOT, 'js/config.js'));
global.AlimenCal.config = config;
var syncdata = require(path.join(ROOT, 'js/syncdata.js'));
global.AlimenCal.syncdata = syncdata;

var SECTIONS = {
  parentA: { income: 7800, existenzminimum: 2300, employed: true },
  parentB: { income: 5200, existenzminimum: 2100, employed: true },
  children: [{ age: 8, costMode: 'pauschal', effectiveCosts: 0, ownIncome: 0,
    childAllowance: 0, kkPremium: 130, externalCareCosts: 0,
    careShareParentA: 0.5, careShareParentB: 0.5 }]
};
function backupFile(sections) {
  return casedata.buildBackupFile(sections, {
    lang: 'de',
    theme: { id: 'calm', values: null },
    config: config,
    partyNames: { partyA: 'A', partyB: 'B' }
  });
}

/* ---- syncMeta-Validierung ---- */
ok('syncMeta: gueltige Metadaten',
  syncdata.sanitizeSyncMeta({
    updatedAt: '2025-06-01T10:00:00.000Z', changeCount: 3, formatVersion: 1
  }).valid === true);
ok('syncMeta: fehlende Metadaten ungueltig', syncdata.sanitizeSyncMeta(null).valid === false);
ok('syncMeta: updatedAt ohne ISO 8601 ungueltig',
  syncdata.sanitizeSyncMeta({ updatedAt: 'nicht-ein-datum', changeCount: 1, formatVersion: 1 }).valid === false);
ok('syncMeta: negatives changeCount ungueltig',
  syncdata.sanitizeSyncMeta({ updatedAt: '2025-06-01T10:00:00Z', changeCount: -1, formatVersion: 1 }).valid === false);
ok('syncMeta: falsche formatVersion ungueltig',
  syncdata.sanitizeSyncMeta({ updatedAt: '2025-06-01T10:00:00Z', changeCount: 1, formatVersion: 99 }).valid === false);

/* ---- buildSyncFile / sanitizeSyncFile ---- */
var syncFile = syncdata.buildSyncFile(backupFile(SECTIONS), {
  updatedAt: '2025-06-01T10:00:00.000Z', changeCount: 5, formatVersion: 1
});
ok('buildSyncFile: erstellt Datei mit syncMeta',
  !!syncFile && syncFile.app === 'alimencal-sync' && syncFile.syncMeta.changeCount === 5);
ok('buildSyncFile: ungueltige syncMeta liefert null',
  syncdata.buildSyncFile(backupFile(SECTIONS), { updatedAt: 'x' }) === null);
var parsed = syncdata.sanitizeSyncFile(syncFile);
ok('sanitizeSyncFile: gueltige Sync-Datei akzeptiert',
  parsed.valid === true && parsed.error === null);
ok('sanitizeSyncFile: Abschnitte uebernommen',
  parsed.sections.parentA.income === 7800 &&
  Array.isArray(parsed.sections.children) && parsed.sections.children.length === 1);
ok('sanitizeSyncFile: falsches app-Feld abgelehnt',
  syncdata.sanitizeSyncFile({ app: 'other', version: 1 }).error === 'app');
ok('sanitizeSyncFile: Datei ohne gueltige syncMeta abgelehnt (error syncMeta)',
  syncdata.sanitizeSyncFile({ app: 'alimencal-sync', version: 1 }).error === 'syncMeta');
ok('sanitizeSyncFile: Datei ohne gueltigen case-Teil abgelehnt (error case)',
  syncdata.sanitizeSyncFile({ app: 'alimencal-sync', version: 1,
    syncMeta: { updatedAt: '2025-06-01T10:00:00Z', changeCount: 1, formatVersion: 1 } }).error === 'case');

/* ---- Stand-Vergleich ---- */
var metaOld = { updatedAt: '2025-06-01T10:00:00.000Z', changeCount: 3, formatVersion: 1 };
var metaNew = { updatedAt: '2025-06-02T10:00:00.000Z', changeCount: 4, formatVersion: 1 };
ok('compareStands: neuere Datei erkannt', syncdata.compareStands(metaOld, metaNew) === 'file');
ok('compareStands: aeltere Datei erkannt', syncdata.compareStands(metaNew, metaOld) === 'local');
ok('compareStands: ohne lokalen Stand gewinnt Datei', syncdata.compareStands(null, metaOld) === 'file');
ok('compareStands: gleicher Stand (Zeit + Zaehler) equal',
  syncdata.compareStands(metaOld, metaOld) === 'equal');
ok('compareStands: gleiche Zeit, hoeherer Zaehler = Datei',
  syncdata.compareStands(
    { updatedAt: '2025-06-01T10:00:00.000Z', changeCount: 3, formatVersion: 1 },
    { updatedAt: '2025-06-01T10:00:00.000Z', changeCount: 9, formatVersion: 1 }) === 'file');
ok('compareStands: ungueltige Datei-Meta = unknown',
  syncdata.compareStands(metaOld, { updatedAt: 'x' }) === 'unknown');

/* ---- mergeSync ---- */
var localSections = {
  parentA: SECTIONS.parentA,
  children: SECTIONS.children
};
var incomingNew = syncdata.sanitizeSyncFile(
  syncdata.buildSyncFile(backupFile({ parentB: SECTIONS.parentB, children: SECTIONS.children }), metaNew)
);
/* 1) Datei ist neuer: enthaltene Abschnitte uebernehmen, eigene nicht
 *    enthaltene (parentA) bleiben unveraendert. */
var m1 = syncdata.mergeSync(
  { meta: metaOld, sections: localSections },
  { meta: incomingNew.syncMeta, sections: incomingNew.sections }
);
ok('Merge (neuere Datei): enthaltene Abschnitte uebernommen',
  m1.source.parentB === 'incoming' && m1.sections.parentB.income === 5200);
ok('Merge (neuere Datei): eigene, nicht enthaltene Abschnitte bleiben',
  m1.source.parentA === 'local' && m1.sections.parentA.income === 7800);
ok('Merge: kein Abschnitt still verworfen (alle enthalten)',
  m1.mergedCount === 3 && Object.keys(m1.sections).length === 3);
/* 2) Konflikt: lokal ist neuer -> abschnittsweise gewinnt lokal. */
var m2 = syncdata.mergeSync(
  { meta: metaNew, sections: localSections },
  { meta: metaOld, sections: { parentA: { income: 1, existenzminimum: '', employed: false } } }
);
ok('Merge (Konflikt): neuerer lokaler Stand gewinnt',
  m2.sections.parentA.income === 7800 && m2.source.parentA === 'local');
ok('Merge (Konflikt): Konflikt-Abschnitt gemeldet',
  m2.conflicts.indexOf('parentA') >= 0);
/* 3) fehlende Abschnitte in incoming: bleiben unveraendert. */
var m3 = syncdata.mergeSync(
  { meta: metaOld, sections: localSections },
  { meta: metaNew, sections: { parentB: SECTIONS.parentB } }
);
ok('Merge (fehlende Abschnitte): lokale Abschnitte erhalten',
  m3.sections.parentA.income === 7800 && m3.source.parentA === 'local' &&
  m3.sections.children.length === 1);
ok('Merge (fehlende Abschnitte): enthaltene uebernommen',
  m3.source.parentB === 'incoming');
/* 4) lokaler Stand fehlt: Datei gewinnt. */
var m4 = syncdata.mergeSync(null, { meta: metaNew, sections: incomingNew.sections });
ok('Merge (ohne lokalen Stand): Datei-Abschnitte uebernommen',
  m4.sections.parentB.income === 5200 && m4.tookIncoming === m4.mergedCount);

/* ---- Persistenz-Defaults: Sync-Datei toleriert fehlende settings ---- */
var parsedNoSettings = syncdata.sanitizeSyncFile({
  app: 'alimencal-sync', version: 1,
  case: casedata.buildFile({ parentA: SECTIONS.parentA }),
  syncMeta: { updatedAt: '2025-06-01T10:00:00.000Z', changeCount: 1, formatVersion: 1 }
});
ok('Sync-Datei ohne settings gueltig (Defaults, kein Absturz)',
  parsedNoSettings.valid === true &&
  JSON.stringify(parsedNoSettings.settings) === '{}');

/* ---- Passwort-Krypto (PBKDF2 + AES-GCM) Roundtrip ---- */
(async function main() {
  var syncPayload = syncdata.buildSyncFile(backupFile(SECTIONS), {
    updatedAt: '2025-06-01T10:00:00.000Z', changeCount: 2, formatVersion: 1
  });
  var envelope = await new Promise(function (res) {
    casecrypto.encryptWithPassword(syncPayload, 'geheim-1234', function (env, err) {
      res({ env: env, err: err });
    });
  });
  ok('encryptWithPassword: Envelope ohne Fehler, Kopf korrekt',
    !envelope.err && !!envelope.env && envelope.env.app === 'alimencal-enc' &&
    envelope.env.kind === 'sync' && envelope.env.kdf === 'PBKDF2-SHA256-AES256GCM');
  ok('PBKDF2: mindestens 600 000 Iterationen',
    envelope.env.iterations >= 600000);
  ok('isSyncEnvelope erkennt Passwort-Envelope',
    casecrypto.isSyncEnvelope(envelope.env));
  ok('isEnvelope erkennt Passwort-Envelope (abwaertskompatibel)',
    casecrypto.isEnvelope(envelope.env));
  ok('Ciphertext enthaelt keine Klartextdaten',
    JSON.stringify(envelope.env).indexOf('7800') === -1 &&
    JSON.stringify(envelope.env).indexOf('income') === -1);

  var decrypted = await new Promise(function (res) {
    casecrypto.decryptWithPassword(envelope.env, 'geheim-1234', function (obj, err) {
      res({ obj: obj, err: err });
    });
  });
  ok('decryptWithPassword: Roundtrip ergibt gleiche Daten',
    !decrypted.err && !!decrypted.obj &&
    decrypted.obj.syncMeta.changeCount === 2 &&
    decrypted.obj.case.sections.parentA.income === 7800);
  var syncAgain = syncdata.sanitizeSyncFile(decrypted.obj);
  ok('Entschluesselte Sync-Datei validiert',
    syncAgain.valid === true && syncAgain.sections.parentA.income === 7800);

  var wrongPw = await new Promise(function (res) {
    casecrypto.decryptWithPassword(envelope.env, 'falsch', function (obj, err) {
      res({ obj: obj, err: err });
    });
  });
  ok('decryptWithPassword: falsches Passwort fehlschlaegt',
    !!wrongPw.err && !wrongPw.obj);

  var tooShort = await new Promise(function (res) {
    casecrypto.encryptWithPassword(syncPayload, 'abc', function (env, err) {
      res({ env: env, err: err });
    });
  });
  ok('encryptWithPassword: zu kurzes Passwort abgelehnt',
    !!tooShort.err && !tooShort.env);

  var enc2 = await new Promise(function (res) {
    casecrypto.encryptWithPassword(syncPayload, 'geheim-1234', function (env) { res(env); });
  });
  ok('Salt ist zufaellig (Envelopes unterscheiden sich)',
    enc2.salt !== envelope.env.salt && enc2.iv !== envelope.env.iv);

  console.log(passed + ' Tests bestanden' + (process.exitCode ? '' : ', keine Fehler'));
})();
