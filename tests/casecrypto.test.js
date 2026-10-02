'use strict';
/*
 * Tests für den Public-Key-verschlüsselten Falldaten-Export
 * (ECDH P-256 + AES-GCM via Web Crypto).
 * Ausführung: node tests/casecrypto.test.js
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

var casecrypto = require(path.join(ROOT, 'js/casecrypto.js'));
var casedata = require(path.join(ROOT, 'js/casedata.js'));

var subtle = globalThis.crypto.subtle;
var DH_ALGO = { name: 'ECDH', namedCurve: 'P-256' };

function genKeyPair() {
  return subtle.generateKey(DH_ALGO, true, ['deriveKey']).then(function (kp) {
    return Promise.all([
      subtle.exportKey('jwk', kp.publicKey),
      subtle.exportKey('jwk', kp.privateKey)
    ]).then(function (jwks) {
      return { publicJwk: jwks[0], privateJwk: jwks[1] };
    });
  });
}

(async function main() {
  var recipient = await genKeyPair();
  var other = await genKeyPair();

  var file = casedata.buildFile({
    parentA: { income: 7800, existenzminimum: 2300, employed: true }
  });

  /* 1. Verschlüsselung für die Gegenseite */
  var envelope = await new Promise(function (res) {
    casecrypto.encryptCase(file, recipient.publicJwk, function (env, err) { res({ env: env, err: err }); });
  });
  ok('encryptCase liefert Envelope ohne Fehler', !envelope.err && !!envelope.env);
  ok('Envelope-Kopf korrekt',
    envelope.env.app === 'alimencal-enc' && envelope.env.kind === 'case' &&
    envelope.env.version === 1 && envelope.env.kdf === 'ECDH-P256-AES256GCM');
  ok('isEnvelope erkennt Envelope', casecrypto.isEnvelope(envelope.env));
  ok('Ciphertext enthält keine Klartextdaten',
    JSON.stringify(envelope.env).indexOf('7800') === -1 &&
    JSON.stringify(envelope.env).indexOf('income') === -1);

  /* 2. Entschlüsselung mit dem privaten Schlüssel der Gegenseite (Roundtrip) */
  var decrypted = await new Promise(function (res) {
    casecrypto.decryptCase(envelope.env, recipient.privateJwk, function (f, err) { res({ f: f, err: err }); });
  });
  ok('decryptCase entschlüsselt ohne Fehler', !decrypted.err && !!decrypted.f);
  ok('Roundtrip: sections identisch',
    JSON.stringify(decrypted.f.sections) === JSON.stringify(file.sections));
  ok('Roundtrip: gültige Falldatei',
    casedata.sanitizeCase(decrypted.f).valid === true);

  /* 3. Falscher privater Schlüssel scheitert (AES-GCM-Tag) */
  var wrong = await new Promise(function (res) {
    casecrypto.decryptCase(envelope.env, other.privateJwk, function (f, err) { res({ f: f, err: err }); });
  });
  ok('Falscher privater Schlüssel wird abgelehnt', wrong.f === null && !!wrong.err);

  /* 4. Manipulierter Ciphertext scheitert */
  var tampered = JSON.parse(JSON.stringify(envelope.env));
  tampered.ciphertext = tampered.ciphertext.slice(0, -4) + 'AAAA';
  var tamperedRes = await new Promise(function (res) {
    casecrypto.decryptCase(tampered, recipient.privateJwk, function (f, err) { res({ f: f, err: err }); });
  });
  ok('Manipulierter Ciphertext wird abgelehnt', tamperedRes.f === null && !!tamperedRes.err);

  /* 5. Ungültige Eingaben */
  var noKey = await new Promise(function (res) {
    casecrypto.encryptCase(file, null, function (env, err) { res({ env: env, err: err }); });
  });
  ok('encryptCase ohne Empfängerschlüssel: Fehler', noKey.env === null && !!noKey.err);
  ok('isEnvelope lehnt Klartext-Falldatei ab',
    casecrypto.isEnvelope(casedata.buildFile({})) === false);
  var badEnv = await new Promise(function (res) {
    casecrypto.decryptCase({ app: 'other' }, recipient.privateJwk, function (f, err) { res({ f: f, err: err }); });
  });
  ok('decryptCase lehnt ungültigen Envelope ab', badEnv.f === null && !!badEnv.err);
  var noPriv = await new Promise(function (res) {
    casecrypto.decryptCase(envelope.env, null, function (f, err) { res({ f: f, err: err }); });
  });
  ok('decryptCase ohne privaten Schlüssel: Fehler', noPriv.f === null && !!noPriv.err);

  /* 6. Zwei Envelope für denselben Inhalt unterscheiden sich (flüchtiger Schlüssel, IV) */
  var env2 = await new Promise(function (res) {
    casecrypto.encryptCase(file, recipient.publicJwk, function (env) { res(env); });
  });
  ok('Flüchtige Schlüssel: Envelope unterscheiden sich',
    env2.epk.x !== envelope.env.epk.x && env2.iv !== envelope.env.iv &&
    env2.ciphertext !== envelope.env.ciphertext);

  console.log('\n' + passed + ' Tests bestanden');
})();
