/* *
 * AlimenCal – Verschlüsselter Falldaten-Export (Public-Key-basiert).
 *
 * Der Export wird mit dem öffentlichen ECDH-Schlüssel der Gegenseite
 * verschlüsselt (ECDH P-256 + AES-GCM-256, flüchtiger Ephe\-meralschlüssel);
 * nur die Gegenseite kann mit ihrem privaten Schlüssel entschlüsseln.
 * DOM-frei und in Node.js lauffähig (Web Crypto).
 *
 * Envelope-Format (Version 1):
 * {
 *   app: 'alimencal-enc', kind: 'case', version: 1,
 *   kdf: 'ECDH-P256-AES256GCM',
 *   epk:  <JWK des flüchtigen ECDH-Public-Keys>,
 *   iv:   <Base64 (96 Bit)>,
 *   ciphertext: <Base64 (AES-GCM, inkl. Tag)>
 * }
 */
var AlimenCal = typeof AlimenCal !== 'undefined' ? AlimenCal : {};
AlimenCal.casecrypto = (function () {
  'use strict';

  var ENC_APP_ID = 'alimencal-enc';
  var ENC_VERSION = 1;
  var ENC_KIND = 'case';
  var KDF_ID = 'ECDH-P256-AES256GCM';
  var DH_ALGO = { name: 'ECDH', namedCurve: 'P-256' };
  var AES_ALGO = { name: 'AES-GCM', length: 256 };

  function subtle() {
    if (typeof crypto !== 'undefined' && crypto.subtle) { return crypto.subtle; }
    return null;
  }

  function bytesToBase64(bytes) {
    var bin = '';
    for (var i = 0; i < bytes.length; i++) { bin += String.fromCharCode(bytes[i]); }
    if (typeof btoa === 'function') { return btoa(bin); }
    return Buffer.from(bytes).toString('base64');
  }

  function base64ToBytes(b64) {
    if (typeof atob === 'function') {
      var bin = atob(b64);
      var out = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) { out[i] = bin.charCodeAt(i); }
      return out;
    }
    return new Uint8Array(Buffer.from(b64, 'base64'));
  }

  function isEnvelope(parsed) {
    return !!parsed && typeof parsed === 'object' &&
      parsed.app === ENC_APP_ID && parsed.kind === ENC_KIND &&
      parsed.version === ENC_VERSION && parsed.kdf === KDF_ID &&
      parsed.epk && parsed.iv && parsed.ciphertext;
  }

  /**
   * Verschlüsselt ein Falldaten-Objekt für den öffentlichen Schlüssel der
   * Gegenseite (ECDH-JWK). callback(envelope | null, err?).
   */
  function encryptCase(caseFile, recipientPublicJwk, callback) {
    var api = subtle();
    if (!api) { callback(null, new Error('Web Crypto nicht verfügbar')); return; }
    if (!recipientPublicJwk || typeof recipientPublicJwk !== 'object') {
      callback(null, new Error('Kein öffentlicher Schlüssel der Gegenseite vorhanden'));
      return;
    }
    var recipientKey;
    api.importKey('jwk', recipientPublicJwk, DH_ALGO, true, []).
      then(function (rk) {
        recipientKey = rk;
        return api.generateKey(DH_ALGO, true, ['deriveKey']);
      }).
      then(function (eph) {
        return Promise.all([
          api.exportKey('jwk', eph.publicKey),
          api.deriveKey(
            { name: 'ECDH', public: recipientKey },
            eph.privateKey, AES_ALGO, false, ['encrypt']
          ).then(function (aesKey) {
            var iv = new Uint8Array(12);
            crypto.getRandomValues(iv);
            var plaintext = new TextEncoder().encode(JSON.stringify(caseFile));
            return api.encrypt({ name: 'AES-GCM', iv: iv }, aesKey, plaintext).
              then(function (ct) {
                return { iv: iv, ct: ct };
              });
          })
        ]);
      }).
      then(function (res) {
        callback({
          app: ENC_APP_ID,
          kind: ENC_KIND,
          version: ENC_VERSION,
          kdf: KDF_ID,
          exportedAt: new Date().toISOString(),
          epk: res[0],
          iv: bytesToBase64(res[1].iv),
          ciphertext: bytesToBase64(new Uint8Array(res[1].ct))
        });
      }).
      catch(function (e) { callback(null, e || new Error('Verschlüsselung fehlgeschlagen')); });
  }

  /**
   * Entschlüsselt einen Envelope mit dem privaten Schlüssel (ECDH-JWK).
   * callback(caseFile | null, err?).
   */
  function decryptCase(envelope, privateKeyJwk, callback) {
    var api = subtle();
    if (!api) { callback(null, new Error('Web Crypto nicht verfügbar')); return; }
    if (!isEnvelope(envelope)) { callback(null, new Error('Kein gültiger AlimenCal-Verschlüsselungs-Envelope')); return; }
    if (!privateKeyJwk || typeof privateKeyJwk !== 'object') {
      callback(null, new Error('Kein privater Schlüssel vorhanden'));
      return;
    }
    var aesKey;
    Promise.all([
      api.importKey('jwk', privateKeyJwk, DH_ALGO, true, ['deriveKey']),
      api.importKey('jwk', envelope.epk, DH_ALGO, true, [])
    ]).
      then(function (keys) {
        return api.deriveKey(
          { name: 'ECDH', public: keys[1] }, keys[0], AES_ALGO, false, ['decrypt']
        );
      }).
      then(function (k) {
        aesKey = k;
        return api.decrypt(
          { name: 'AES-GCM', iv: base64ToBytes(envelope.iv) },
          aesKey,
          base64ToBytes(envelope.ciphertext)
        );
      }).
      then(function (plain) {
        var parsed;
        try { parsed = JSON.parse(new TextDecoder().decode(plain)); }
        catch (e) { callback(null, new Error('Entschlüsselter Inhalt ist kein gültiges JSON')); return; }
        callback(parsed);
      }).
      catch(function () { callback(null, new Error('Entschlüsselung fehlgeschlagen (falscher Schlüssel oder Datei manipuliert)')); });
  }

  return {
    ENC_APP_ID: ENC_APP_ID,
    ENC_VERSION: ENC_VERSION,
    KDF_ID: KDF_ID,
    isEnvelope: isEnvelope,
    encryptCase: encryptCase,
    decryptCase: decryptCase
  };
})();
if (typeof module === 'object' && module.exports) { module.exports = AlimenCal.casecrypto; }
