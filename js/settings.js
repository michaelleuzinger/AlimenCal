/*
 * AlimenCal – Verbindliche Einstellungen, Override-Modus, Read-Only-Imports.
 * Manipulationsschutz (serverlos):
   *  - Hash-Kette: jede Aktion erhaelt einen Ketten-Eintrag
   *    hash = SHA-256(prevHash || kanonisches JSON der Aktion); nachtraegliche
   *    Manipulation der Historie ist erkennbar (verifyChain()).
   *  - Beidseitig signierte Lock-Dateien: exportBindingFile() erzeugt den
   *    Hash ueber die gelockten Werte; beide Parteien signieren (Web Crypto,
   *    ECDSA P-256); verifyBindingFile() prueft Werte und Signaturen.
 * DOM-freies Modul (Browser + Node.js):
 *  - Two-Party-Lock: Berechnungsrelevante Werte sind nach beidseitiger
 *    Bestätigung (Partei A und Partei B) read-only.
 *  - Override-Layer: Abweichende Werte werden pro Szenario gespeichert und
 *    verändern die verbindlichen Originalwerte nie.
 *  - resolve() ist die einzige Lesefunktion für Berechnungen (Base ⊕ Override).
 *  - Import-Snapshots: Vorschau ist per Default read-only; nach dem Commit
 *    unveränderlich, Korrekturen nur als neue Version (supersedes-Kette).
 */
var AlimenCal = typeof AlimenCal !== 'undefined' ? AlimenCal : {};

AlimenCal.settings = (function () {
  'use strict';

  var ROLES = {
    VIEWER: { resolve: true },
    EDITOR: { resolve: true, override: true },
    APPROVER: { resolve: true, override: true, confirmLock: true, rebase: true, importCommit: true }
  };

  function hasPermission(role, action) {
    var perms = ROLES[role];
    return !!(perms && perms[action]);
  }

  function newId(prefix) {
    return prefix + '_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  }

  function errorCode(message) {
    var err = new Error(message);
    err.isSettingError = true;
    return err;
  }

  function requireRole(role, action) {
    if (!hasPermission(role, action)) {
      throw errorCode('Rolle ' + role + ' ist nicht berechtigt für \'' + action + '\'');
    }
  }

  function SettingsService() {
    this.settings = {};   /* id -> {id, scope, key, valueBase, unit, version, lockedA, lockedB, audit: []} */
    this.overrides = {};  /* id -> {id, settingId, scenarioId, valueOverride, reason, createdByParty, createdAt} */
    this.snapshots = {};  /* id -> {id, source, payload, checksum, status, importedAt, version, supersedes} */
  }

  /* ---- Einstellungen registrieren / lesen ---------------------------------- */

  SettingsService.prototype.registerSetting = function (scope, key, value, unit) {
    var id = newId('setting');
    this.settings[id] = {
      id: id, scope: scope, key: key, valueBase: value,
      unit: unit || null, version: 1,
      lockedA: false, lockedB: false, audit: []
    };
    return id;
  };

  SettingsService.prototype.getSetting = function (settingId) {
    var s = this.settings[settingId];
    if (!s) { throw errorCode('Einstellung ' + settingId + ' nicht gefunden'); }
    return s;
  };

  /* ---- Two-Party-Lock ------------------------------------------------------ */

  SettingsService.prototype.isLocked = function (setting) {
    return setting.lockedA && setting.lockedB;
  };

  SettingsService.prototype.updateBaseValue = function (settingId, newValue, actorParty, role) {
    requireRole(role || 'APPROVER', 'confirmLock');
    var setting = this.getSetting(settingId);
    if (this.isLocked(setting)) {
      throw errorCode('Einstellung ' + settingId +
        ' ist beidseitig verbindlich festgelegt (read-only für beide Parteien)');
    }
    this.appendChain('update', { key: setting.key, from: setting.valueBase, to: newValue, party: actorParty || null });
    this.audit(setting, actorParty || null, 'update', setting.valueBase, newValue);
    setting.valueBase = newValue;
  };

  SettingsService.prototype.confirmBinding = function (settingId, party, role) {
    requireRole(role || 'APPROVER', 'confirmLock');
    var setting = this.getSetting(settingId);
    if (party !== 'A' && party !== 'B') {
      throw errorCode('Partei muss \'A\' oder \'B\' sein');
    }
    if ((party === 'A' && setting.lockedA) || (party === 'B' && setting.lockedB)) {
      return this.isLocked(setting);
    }
    if (party === 'A') { setting.lockedA = true; } else { setting.lockedB = true; }
    this.appendChain('confirm_lock', { key: setting.key, party: party });
    this.audit(setting, party, 'confirm_lock', null, null);
    return this.isLocked(setting);
  };

  SettingsService.prototype.rebaseSetting = function (settingId, newValue, actorParty, role) {
    requireRole(role || 'APPROVER', 'rebase');
    var setting = this.getSetting(settingId);
    this.appendChain('rebase', { key: setting.key, from: setting.valueBase, to: newValue, party: actorParty || null });
    this.audit(setting, actorParty || null, 'rebase', setting.valueBase, newValue);
    setting.version += 1;
    setting.valueBase = newValue;
    setting.lockedA = false;
    setting.lockedB = false;
    return setting.version;
  };

  /* ---- Override-Layer ------------------------------------------------------ */

  SettingsService.prototype.createOverride = function (settingId, scenarioId, valueOverride, opts, role) {
    requireRole(role || 'EDITOR', 'override');
    opts = opts || {};
    var setting = this.getSetting(settingId);
    var existing = this.findOverride(settingId, scenarioId);
    if (existing) {
      existing.valueOverride = valueOverride;
      existing.reason = opts.reason || null;
      existing.createdByParty = opts.party || null;
      this.appendChain('override_update', { key: setting.key, scenarioId: scenarioId, value: valueOverride, party: opts.party || null });
      return existing.id;
    }
    var id = newId('override');
    this.overrides[id] = {
      id: id, settingId: setting.id, scenarioId: scenarioId,
      valueOverride: valueOverride, reason: opts.reason || null,
      createdByParty: opts.party || null
    };
    this.appendChain('override', { key: setting.key, scenarioId: scenarioId, value: valueOverride, party: opts.party || null });
    return id;
  };

  SettingsService.prototype.findOverride = function (settingId, scenarioId) {
    for (var id in this.overrides) {
      if (Object.prototype.hasOwnProperty.call(this.overrides, id)) {
        var ov = this.overrides[id];
        if (ov.settingId === settingId && ov.scenarioId === scenarioId) { return ov; }
      }
    }
    return null;
  };

  SettingsService.prototype.deleteOverride = function (overrideId, role) {
    requireRole(role || 'EDITOR', 'override');
    if (!this.overrides[overrideId]) {
      throw errorCode('Override ' + overrideId + ' nicht gefunden');
    }
    var ov = this.overrides[overrideId];
    var setting = ov ? this.getSetting(ov.settingId) : null;
    delete this.overrides[overrideId];
    if (setting) {
      this.appendChain('override_delete', { key: setting.key, scenarioId: ov.scenarioId, party: null });
    }
  };

  /* ---- Lesen (einzige Stelle für Berechnungen) ------------------------------ */

  SettingsService.prototype.resolve = function (settingId, scenarioId) {
    var setting = this.getSetting(settingId);
    if (!scenarioId) { return setting.valueBase; }
    var ov = this.findOverride(settingId, scenarioId);
    return ov ? ov.valueOverride : setting.valueBase;
  };

  /* Liefert Base, effektiven Wert und Status für die UI-Delta-Darstellung. */
  SettingsService.prototype.resolveWithContext = function (settingId, scenarioId) {
    var setting = this.getSetting(settingId);
    var ov = scenarioId ? this.findOverride(settingId, scenarioId) : null;
    return {
      settingId: settingId,
      key: setting.key,
      scope: setting.scope,
      baseValue: setting.valueBase,
      effectiveValue: ov ? ov.valueOverride : setting.valueBase,
      overridden: !!ov,
      overrideReason: ov ? ov.reason : null,
      isLocked: this.isLocked(setting),
      version: setting.version
    };
  };

  /* ---- Import-Snapshots (Default read-only) --------------------------------- */

  function computeChecksum(payload) {
    var str = JSON.stringify(payload);
    var h1 = 0x811c9dc5, h2 = 0x01000193;
    var i;
    for (i = 0; i < str.length; i++) {
      h1 = (h1 ^ str.charCodeAt(i)) * 16777619 >>> 0;
      h2 = (h2 + str.charCodeAt(i) * (i + 1)) >>> 0;
    }
    return ('0000000' + h1.toString(16)).slice(-8) + ('0000000' + h2.toString(16)).slice(-8);
  }

  /* Vorschau (dry run): noch keine Datenübernahme, unveränderlich. */
  SettingsService.prototype.previewImport = function (source, payload) {
    return {
      id: newId('import'), source: source, payload: payload,
      checksum: computeChecksum(payload), status: 'pending',
      importedAt: null, version: 1, supersedes: null
    };
  };

  SettingsService.prototype.commitImport = function (snapshot, role) {
    requireRole(role || 'APPROVER', 'importCommit');
    if (this.snapshots[snapshot.id]) {
      throw errorCode('Snapshot ' + snapshot.id + ' existiert bereits');
    }
    if (snapshot.status === 'committed') {
      throw errorCode('Snapshot ' + snapshot.id + ' ist bereits committet (immutable)');
    }
    snapshot.status = 'committed';
    this.snapshots[snapshot.id] = snapshot;
    return snapshot;
  };

  /* Korrektur = neue Version; alter Snapshot bleibt unverändert erhalten. */
  SettingsService.prototype.supersedeImport = function (oldSnapshot, payload, role) {
    requireRole(role || 'APPROVER', 'importCommit');
    if (!this.snapshots[oldSnapshot.id] || oldSnapshot.status !== 'committed') {
      oldSnapshot.status = 'committed';
      this.snapshots[oldSnapshot.id] = oldSnapshot;
    }
    var next = {
      id: newId('import'), source: oldSnapshot.source, payload: payload,
      checksum: computeChecksum(payload), status: 'committed',
      version: oldSnapshot.version + 1, supersedes: oldSnapshot.id
    };
    this.snapshots[next.id] = next;
    return next;
  };

  SettingsService.prototype.getSnapshot = function (snapshotId) {
    var s = this.snapshots[snapshotId];
    if (!s) { throw errorCode('Snapshot ' + snapshotId + ' nicht gefunden'); }
    return s;
  };

  /* ---- Audit --------------------------------------------------------------- */

  SettingsService.prototype.audit = function (setting, party, action, oldValue, newValue) {
    setting.audit.push({
      settingId: setting.id, version: setting.version,
      actorParty: party, action: action,
      oldValue: oldValue, newValue: newValue
    });
  };

  /* ---- Hash-Kette (Manipulationserkennung der Historie) ------------------- */

  var GENESIS = '0000000000000000000000000000000000000000000000000000000000000000';

  function canonicalJson(value) {
    function sort(v) {
      if (Array.isArray(v)) { return v.map(sort); }
      if (v && typeof v === 'object') {
        var keys = Object.keys(v).sort();
        var out = {};
        keys.forEach(function (k) { out[k] = sort(v[k]); });
        return out;
      }
      return v;
    }
    return JSON.stringify(sort(value));
  }

  function sha256Hex(str, callback) {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      crypto.subtle.digest('SHA-256', new TextEncoder().encode(str)).then(function (buf) {
        var arr = new Uint8Array(buf);
        var hex = '';
        for (var i = 0; i < arr.length; i++) { hex += ('0' + arr[i].toString(16)).slice(-2); }
        callback(hex);
      });
      return;
    }
    var nodeCrypto = null;
    try { nodeCrypto = require('crypto'); } catch (e) {}
    if (nodeCrypto) {
      callback(nodeCrypto.createHash('sha256').update(str, 'utf8').digest('hex'));
      return;
    }
    var h = 0x811c9dc5;
    for (var j = 0; j < str.length; j++) { h = ((h ^ str.charCodeAt(j)) * 16777619) >>> 0; }
    callback(('0000000' + h.toString(16)).slice(-8));
  }

  function sealEntry(entry, callback) {
    sha256Hex(entry.prevHash + '|' + entry.action + '|' + canonicalJson(entry.payload), function (hex) {
      entry.hash = hex;
      callback(entry);
    });
  }

  /* Anfügen wird serialisiert: der Previous-Hash ist erst lesbar, wenn das
   * vorherige Siegel abgeschlossen ist (Web Crypto ist asynchron). */
  SettingsService.prototype.appendChain = function (action, payload, done) {
    var self = this;
    this.chain = this.chain || [];
    this._chainQueue = this._chainQueue || Promise.resolve();
    this._chainQueue = this._chainQueue.then(function () {
      return new Promise(function (resolve) {
        var prev = self.chain.length ? self.chain[self.chain.length - 1].hash : GENESIS;
        var entry = { prevHash: prev, action: action, payload: payload, hash: null };
        sealEntry(entry, function (sealed) {
          self.chain.push(sealed);
          resolve(sealed);
        });
      });
    }).then(function (sealed) {
      if (typeof done === 'function') { done(sealed); }
    });
  };

  SettingsService.prototype.verifyChain = function (done) {
    var chain = this.chain || [];
    var prev = GENESIS;
    function step(i) {
      if (i >= chain.length) { done({ valid: true, brokenAt: -1 }); return; }
      var e = chain[i];
      if (e.prevHash !== prev) { done({ valid: false, brokenAt: i }); return; }
      sealEntry({ prevHash: e.prevHash, action: e.action, payload: e.payload, hash: null }, function (re) {
        if (re.hash !== e.hash) { done({ valid: false, brokenAt: i }); return; }
        prev = e.hash;
        step(i + 1);
      });
    }
    step(0);
  };

  /* ---- Signierte Lock-Dateien (Web Crypto, ECDSA P-256) -------------------- */

  var KEY_ALGO = { name: 'ECDSA', namedCurve: 'P-256' };
  var SIGN_ALGO = { name: 'ECDSA', hash: { name: 'SHA-256' } };

  function exportKeyPair(kp, callback) {
    Promise.all([
      crypto.subtle.exportKey('jwk', kp.publicKey),
      crypto.subtle.exportKey('jwk', kp.privateKey)
    ]).then(function (jwks) {
      callback({ publicKey: jwks[0], privateKey: jwks[1] });
    }).catch(callback);
  }

  function generateKeyPair(callback) {
    if (typeof crypto === 'undefined' || !crypto.subtle) {
      callback(null, new Error('Web Crypto nicht verfügbar'));
      return;
    }
    crypto.subtle.generateKey(KEY_ALGO, true, ['sign', 'verify']).then(function (kp) {
      exportKeyPair(kp, function (jwk, err) {
        if (err) { callback(null, err); return; }
        callback({ keyPair: kp, jwk: jwk });
      });
    }).catch(function (e) { callback(null, e); });
  }

  function importPublicKey(jwk, callback) {
    if (typeof crypto === 'undefined' || !crypto.subtle) { callback(null, new Error('Web Crypto nicht verfügbar')); return; }
    crypto.subtle.importKey('jwk', jwk, KEY_ALGO, true, ['verify']).then(callback).catch(callback);
  }

  function hexToBytes(hexHash) {
    return new Uint8Array(hexHash.match(/.{2}/g).map(function (h) { return parseInt(h, 16); }));
  }

  function base64Encode(bytes) {
    var s = '';
    for (var i = 0; i < bytes.length; i++) { s += String.fromCharCode(bytes[i]); }
    return typeof btoa === 'function' ? btoa(s) : Buffer.from(bytes).toString('base64');
  }

  function base64Decode(b64) {
    if (typeof atob === 'function') {
      var bin = atob(b64);
      var out = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) { out[i] = bin.charCodeAt(i); }
      return out;
    }
    return new Uint8Array(Buffer.from(b64, 'base64'));
  }

  function signHash(privateKey, hexHash, callback) {
    if (typeof crypto === 'undefined' || !crypto.subtle) { callback(null, new Error('Web Crypto nicht verfügbar')); return; }
    crypto.subtle.sign(SIGN_ALGO, privateKey, hexToBytes(hexHash)).then(function (sig) {
      callback(base64Encode(new Uint8Array(sig)));
    }).catch(callback);
  }

  function verifySignature(publicKeyJwk, hexHash, signatureB64, callback) {
    var promise = new Promise(function (resolve) {
      importPublicKey(publicKeyJwk, function (key, err) {
        if (err || !key) { resolve(false); return; }
        crypto.subtle.verify(SIGN_ALGO, key, base64Decode(signatureB64), hexToBytes(hexHash)).then(function (ok) {
          resolve(!!ok);
        }).catch(function () { resolve(false); });
      });
    });
    if (typeof callback === 'function') { promise.then(callback); }
    return promise;
  }

  SettingsService.prototype.buildBindingFile = function () {
    var locked = {};
    var ids = Object.keys(this.settings);
    for (var i = 0; i < ids.length; i++) {
      var s = this.settings[ids[i]];
      if (s.lockedA && s.lockedB) { locked[s.key] = s.valueBase; }
    }
    return {
      app: 'alimencal', kind: 'binding', version: 1,
      values: locked,
      signatures: { partyA: null, partyB: null },
      chainHead: (this.chain && this.chain.length) ? this.chain[this.chain.length - 1].hash : GENESIS
    };
  };

  SettingsService.prototype.exportBindingFile = function (callback) {
    var file = this.buildBindingFile();
    sha256Hex(canonicalJson(file.values), function (hex) {
      file.valueHash = hex;
      callback(file);
    });
  };

  SettingsService.prototype.signBindingFile = function (file, privateKey, party, callback) {
    sha256Hex(canonicalJson(file.values), function (hex) {
      if (file.valueHash && file.valueHash !== hex) {
        callback(null, new Error('valueHash stimmt nicht mit den Werten überein'));
        return;
      }
      file.valueHash = hex;
      signHash(privateKey, hex, function (sigB64, err) {
        if (err || !sigB64) { callback(null, err || new Error('Signatur fehlgeschlagen')); return; }
        file.signatures[party === 'A' ? 'partyA' : 'partyB'] = sigB64;
        callback(file);
      });
    });
  };

  SettingsService.prototype.verifyBindingFile = function (file, publicKeyA, publicKeyB, currentValues, callback) {
    var result = { formatOk: false, valueHashOk: false, sigA: false, sigB: false, matchesCurrent: null };
    if (!file || file.app !== 'alimencal' || file.kind !== 'binding' ||
        !file.values || typeof file.values !== 'object') {
      callback(result); return;
    }
    result.formatOk = true;
    sha256Hex(canonicalJson(file.values), function (hex) {
      result.valueHashOk = !file.valueHash || file.valueHash === hex;
      var checks = [];
      if (publicKeyA && file.signatures && file.signatures.partyA) {
        checks.push(verifySignature(publicKeyA, hex, file.signatures.partyA).then(function (ok) {
          result.sigA = ok;
        }));
      }
      if (publicKeyB && file.signatures && file.signatures.partyB) {
        checks.push(verifySignature(publicKeyB, hex, file.signatures.partyB).then(function (ok) {
          result.sigB = ok;
        }));
      }
      Promise.all(checks).then(function () {
        if (currentValues != null) {
          result.matchesCurrent = canonicalJson(currentValues) === canonicalJson(file.values);
        }
        callback(result);
      });
    });
  };

  return {
    SettingsService: SettingsService,
    computeChecksum: computeChecksum,
    hasPermission: hasPermission,
    canonicalJson: canonicalJson,
    sha256Hex: sha256Hex,
    generateKeyPair: generateKeyPair,
    verifySignature: verifySignature,
    base64Encode: base64Encode,
    base64Decode: base64Decode,
    GENESIS: GENESIS
  };
})();
