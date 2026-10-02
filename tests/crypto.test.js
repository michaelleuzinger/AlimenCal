'use strict';
/*
 * Tests für die serverlose Verbindlichkeit:
 *  - Hash-Kette (Manipulationserkennung der Historie)
 *  - Signierte Lock-Dateien (ECDSA P-256 via Web Crypto)
 * Ausführung: node tests/crypto.test.js
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

function loadSettings() {
  var code = fs.readFileSync(path.join(ROOT, 'js/settings.js'), 'utf8');
  var ctx = {};
  new Function('AlimenCal', code)(ctx);
  return ctx.settings;
}

var mod = loadSettings();
var SettingsService = mod.SettingsService;
var canonicalJson = mod.canonicalJson;

function newSvc() {
  var svc = new SettingsService();
  svc.registerSetting('richtwerte', 'defaultSpousalStandard', 4000);
  return svc;
}

/* ---- Hash-Kette ----------------------------------------------------------- */

(async function chainTests() {
  var svc = newSvc();
  var id = Object.keys(svc.settings)[0];

  svc.updateBaseValue(id, 4200, 'A');
  svc.confirmBinding(id, 'A');
  svc.confirmBinding(id, 'B');
  svc.createOverride(id, 's1', 5000, { party: 'A' });
  svc.deleteOverride(Object.keys(svc.overrides)[0]);
  await new Promise(function (r) { setTimeout(r, 10); });

  ok('Kette hat Einträge nach Aktionen', svc.chain.length === 5);

  var r = await new Promise(function (res) { svc.verifyChain(res); });
  ok('Kette unverändert gültig', r.valid === true);

  /* Manipulation eines Eintrags simulieren */
  svc.chain[1].payload.party = 'B';
  var rm = await new Promise(function (res) { svc.verifyChain(res); });
  ok('Manipulation wird erkannt', rm.valid === false && rm.brokenAt === 1);

  /* Löschen eines Eintrags simulieren */
  var svc2 = newSvc();
  var id2 = Object.keys(svc2.settings)[0];
  svc2.confirmBinding(id2, 'A');
  svc2.confirmBinding(id2, 'B');
  await new Promise(function (r) { setTimeout(r, 10); });
  svc2.chain.splice(0, 1);
  var rd = await new Promise(function (res) { svc2.verifyChain(res); });
  ok('Entfernten Eintrag wird erkannt', rd.valid === false);

  /* Rebase chain entry */
  var svc3 = newSvc();
  var id3 = Object.keys(svc3.settings)[0];
  svc3.confirmBinding(id3, 'A');
  svc3.confirmBinding(id3, 'B');
  svc3.rebaseSetting(id3, 5000, 'A');
  await new Promise(function (r) { setTimeout(r, 10); });
  ok('Rebase erzeugt Ketten-Eintrag', svc3.chain.length === 3);
})();

/* ---- Kanonisches JSON ------------------------------------------------------ */

(function canonicalTests() {
  ok('canonicalJson sortiert Keys',
    canonicalJson({ b: 1, a: { d: 2, c: 3 } }) === '{"a":{"c":3,"d":2},"b":1}');
  ok('canonicalJson ist deterministisch',
    canonicalJson({ x: [1, { z: 1, y: 2 }] }) === canonicalJson({ x: [1, { y: 2, z: 1 }] }));
})();

/* ---- Signierte Lock-Dateien ------------------------------------------------ */

(async function signatureTests() {
  var svc = newSvc();
  var id = Object.keys(svc.settings)[0];
  svc.updateBaseValue(id, 4400, 'A');
  svc.confirmBinding(id, 'A');
  svc.confirmBinding(id, 'B');

  var keysA = await new Promise(function (res) { mod.generateKeyPair(res); });
  var keysB = await new Promise(function (res) { mod.generateKeyPair(res); });
  ok('Schlüsselpaare erzeugt', !!keysA && !!keysB);

  /* Export */
  var file = await new Promise(function (res) { svc.exportBindingFile(res); });
  ok('Lock-Datei enthält gelockte Werte', file.values.defaultSpousalStandard === 4400);
  ok('Lock-Datei hat valueHash', typeof file.valueHash === 'string' && file.valueHash.length === 64);

  /* Signatur Partei A */
  var signed = await new Promise(function (res) {
    svc.signBindingFile(file, keysA.keyPair.privateKey, 'A', res);
  });
  ok('Signatur Partei A gesetzt', !!signed && !!signed.signatures.partyA);

  /* Signatur Partei B */
  var signed2 = await new Promise(function (res) {
    svc.signBindingFile(signed, keysB.keyPair.privateKey, 'B', res);
  });
  ok('Signatur Partei B gesetzt', !!signed2 && !!signed2.signatures.partyB);

  /* Verifikation: alles gültig */
  var verifyOk = await new Promise(function (res) {
    svc.verifyBindingFile(signed2, keysA.jwk.publicKey, keysB.jwk.publicKey, { defaultSpousalStandard: 4400 }, res);
  });
  ok('Verifikation: Format, Hash, beide Signaturen, Abgleich',
    verifyOk.formatOk === true && verifyOk.valueHashOk === true &&
    verifyOk.sigA === true && verifyOk.sigB === true && verifyOk.matchesCurrent === true);

  /* Manipulierte Werte: Hash-Prüfung schlägt fehl */
  var tampered = JSON.parse(JSON.stringify(signed2));
  tampered.values.defaultSpousalStandard = 9999;
  var verifyTampered = await new Promise(function (res) {
    svc.verifyBindingFile(tampered, keysA.jwk.publicKey, keysB.jwk.publicKey, null, res);
  });
  ok('Manipulierte Werte werden erkannt', verifyTampered.valueHashOk === false);

  /* Abweichende eigene Werte */
  var verifyDiffers = await new Promise(function (res) {
    svc.verifyBindingFile(signed2, keysA.jwk.publicKey, keysB.jwk.publicKey, { defaultSpousalStandard: 1234 }, res);
  });
  ok('Abweichung von eigenen Werten wird erkannt', verifyDiffers.matchesCurrent === false);

  /* Falsche Signatur (fremder Schlüssel) */
  var keysC = await new Promise(function (res) { mod.generateKeyPair(res); });
  var verifyWrongKey = await new Promise(function (res) {
    svc.verifyBindingFile(signed2, keysC.jwk.publicKey, keysB.jwk.publicKey, null, res);
  });
  ok('Ungültige Signatur (falscher Schlüssel) wird erkannt', verifyWrongKey.sigA === false && verifyWrongKey.sigB === true);

  /* Ungültiges Format */
  var verifyBad = await new Promise(function (res) {
    svc.verifyBindingFile({ app: 'other' }, null, null, null, res);
  });
  ok('Ungültiges Dateiformat erkannt', verifyBad.formatOk === false);

  console.log('\n' + passed + ' Tests bestanden' +
    (process.exitCode ? ', FEHLER vorhanden' : ''));
})();
