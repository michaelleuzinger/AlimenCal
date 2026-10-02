/*
 * AlimenCal – Verbindliche Einstellungen, Override-Modus, Read-Only-Imports.
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
    this.audit(setting, party, 'confirm_lock', null, null);
    return this.isLocked(setting);
  };

  SettingsService.prototype.rebaseSetting = function (settingId, newValue, actorParty, role) {
    requireRole(role || 'APPROVER', 'rebase');
    var setting = this.getSetting(settingId);
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
      return existing.id;
    }
    var id = newId('override');
    this.overrides[id] = {
      id: id, settingId: setting.id, scenarioId: scenarioId,
      valueOverride: valueOverride, reason: opts.reason || null,
      createdByParty: opts.party || null
    };
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
    delete this.overrides[overrideId];
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

  return {
    SettingsService: SettingsService,
    computeChecksum: computeChecksum,
    hasPermission: hasPermission,
    ROLES: ROLES
  };
})();
