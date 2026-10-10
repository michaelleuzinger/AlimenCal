/*
 * AlimenCal – Geräte-Sync (Same-User).
 *
 * DOM-freies Modul: validiert die Meta-Informationen der Sync-Datei
 * (alimencal-sync.json), vergleicht Stände (Zeitstempel/Änderungszähler)
 * und führt Abschnitte abschnittsweise zusammen – analog dem
 * Austausch-Import (js/casedata.js). Konfliktregel: je Abschnitt gewinnt
 * der neuere Stand; niemals werden Daten still verworfen.
 *
 * Formate:
 *  - Klartext-Sync-Datei:
 *    { app: 'alimencal-sync', version: 1, exportedAt: …,
 *      case: { app:'alimencal', …, sections: {…} }, settings: {…},
 *      syncMeta: { updatedAt: ISO-8601, changeCount: int, formatVersion: 1 } }
 *  - Verschlüsselte Sync-Datei: Passwort-Envelope aus js/casecrypto.js
 *    (kind 'sync', kdf 'PBKDF2-SHA256-AES256GCM'); nach dem Entschlüsseln
 *    gilt dasselbe Klartext-Format.
 */
var AlimenCal = (typeof globalThis !== 'undefined' && globalThis.AlimenCal) ? globalThis.AlimenCal : (typeof AlimenCal !== 'undefined' ? AlimenCal : {});
AlimenCal.syncdata = (function () {
  'use strict';

  var SYNC_APP_ID = 'alimencal-sync';
  var SYNC_VERSION = 1;
  var SYNC_FILE_NAME = 'alimencal-sync.json';
  var FORMAT_VERSION = 1;

  function isIsoDate(v) {
    return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(v);
  }

  /**
   * Validiert syncMeta. Rückgabe: { valid, updatedAt, changeCount, formatVersion }
   * Fehlende/ungültige Felder führen zu valid:false (kein Stille-Fallback auf
   * veraltete oder unklare Stände).
   */
  function sanitizeSyncMeta(meta) {
    var out = { valid: false, updatedAt: null, changeCount: 0, formatVersion: 0 };
    if (!meta || typeof meta !== 'object') { return out; }
    if (!isIsoDate(meta.updatedAt)) { return out; }
    var count = typeof meta.changeCount === 'number' ? meta.changeCount : parseInt(meta.changeCount, 10);
    if (!isFinite(count) || count < 0) { return out; }
    var fv = typeof meta.formatVersion === 'number' ? meta.formatVersion : parseInt(meta.formatVersion, 10);
    if (fv !== FORMAT_VERSION) { return out; }
    out.valid = true;
    out.updatedAt = meta.updatedAt;
    out.changeCount = count;
    out.formatVersion = fv;
    return out;
  }

  /**
   * Validiert eine Sync-Datei (bereits entschlüsselt/Klartext geparst).
   * Rückgabe: { valid, syncMeta, sections, settings, invalid } oder
   * valid:false mit Grund in error ('app'|'version'|'syncMeta'|'case').
   * sections/settings sind nur die validierten (übrig sanitizeCase-
   * bzw. Backup-Settings-Teile), ungültige Abschnitte in invalid.
   */
  function sanitizeSyncFile(raw) {
    var result = { valid: false, error: null, syncMeta: null, sections: {}, settings: {}, invalid: [] };
    if (!raw || typeof raw !== 'object') { result.error = 'app'; return result; }
    if (raw.app !== SYNC_APP_ID || raw.version !== SYNC_VERSION) { result.error = 'app'; return result; }
    var meta = sanitizeSyncMeta(raw.syncMeta);
    if (!meta.valid) { result.error = 'syncMeta'; return result; }
    if (!raw.case || typeof raw.case !== 'object' || !AlimenCal.casedata) { result.error = 'case'; return result; }
    var inner = AlimenCal.casedata.sanitizeCase(raw.case);
    if (!inner || !inner.valid) { result.error = 'case'; return result; }
    result.syncMeta = meta;
    result.sections = inner.sections;
    result.invalid = inner.invalid;
    var settings = raw.settings || {};
    if (AlimenCal.casedata.sanitizeBackupSettings) {
      result.settings = AlimenCal.casedata.sanitizeBackupSettings(settings);
    } else {
      result.settings = settings;
    }
    result.valid = true;
    return result;
  }

  /** Aktuelle Sync-Datei bauen (Inhalt = Backup-Export + syncMeta). */
  function buildSyncFile(backupFile, syncMeta) {
    var meta = sanitizeSyncMeta(syncMeta);
    if (!meta.valid) { return null; }
    return {
      app: SYNC_APP_ID,
      version: SYNC_VERSION,
      exportedAt: new Date().toISOString(),
      case: backupFile && backupFile.case ? backupFile.case : backupFile,
      settings: (backupFile && backupFile.settings) || {},
      syncMeta: {
        updatedAt: meta.updatedAt,
        changeCount: meta.changeCount,
        formatVersion: FORMAT_VERSION
      }
    };
  }

  function parseDate(iso) {
    var d = new Date(iso);
    return isNaN(d.getTime()) ? null : d.getTime();
  }

  /**
   * Vergleicht lokalen Stand (localMeta, nullable) mit Sync-Datei-Stand.
   * Rückgabe: 'file' (Datei ist neuer/lokal ohne Stand), 'local'
   * (lokal ist neuer), 'equal' oder 'unknown' (Zeitstempel unlesbar).
   * Bei gleichem updatedAt entscheidet changeCount (höher = neuer).
   */
  function compareStands(localMeta, fileMeta) {
    var file = sanitizeSyncMeta(fileMeta);
    if (!file.valid) { return 'unknown'; }
    if (!localMeta) { return 'file'; }
    var local = sanitizeSyncMeta(localMeta);
    if (!local.valid) { return 'file'; }
    var lt = parseDate(local.updatedAt);
    var ft = parseDate(file.updatedAt);
    if (lt === null || ft === null) { return 'unknown'; }
    if (ft > lt) { return 'file'; }
    if (ft < lt) { return 'local'; }
    if (file.changeCount !== local.changeCount) { return file.changeCount > local.changeCount ? 'file' : 'local'; }
    return 'equal';
  }

  /**
   * Abschnittsweiser Merge (Konfliktregel: neuere Seite gewinnt).
   * local/incoming: { meta: syncMeta|null, sections: {…} }
   * Rückgabe:
   *   { sections: {…}, source: { abschnitt: 'local'|'incoming' },
   *     mergedCount, keptLocal, tookIncoming, conflicts: [abschnitte] }
   * Nur in incoming enthaltene Abschnitte überschreiben lokal, wenn die
   * Datei mindest so neu ist; im Konflikt (beide geändert, Datei älter)
   * bleibt lokal. Fehlt ein Abschnitt in incoming, bleibt lokal erhalten
   * ("eigene, nicht enthaltene Abschnitte bleiben unverändert").
   */
  function mergeSync(local, incoming) {
    local = local || { meta: null, sections: {} };
    incoming = incoming || { meta: null, sections: {} };
    var stand = compareStands(local.meta, incoming.meta);
    var out = { sections: {}, source: {}, mergedCount: 0, keptLocal: 0, tookIncoming: 0, conflicts: [] };
    var names = {};
    Object.keys(local.sections || {}).forEach(function (k) { names[k] = true; });
    Object.keys(incoming.sections || {}).forEach(function (k) { names[k] = true; });
    Object.keys(names).forEach(function (name) {
      var hasLocal = Object.prototype.hasOwnProperty.call(local.sections, name) && local.sections[name] != null;
      var hasIncoming = Object.prototype.hasOwnProperty.call(incoming.sections, name) && incoming.sections[name] != null;
      if (hasLocal && hasIncoming) {
        if (stand === 'file') {
          out.sections[name] = incoming.sections[name];
          out.source[name] = 'incoming';
          out.tookIncoming++;
        } else {
          out.sections[name] = local.sections[name];
          out.source[name] = 'local';
          out.keptLocal++;
          if (stand !== 'equal') { out.conflicts.push(name); }
        }
      } else if (hasLocal) {
        out.sections[name] = local.sections[name];
        out.source[name] = 'local';
        out.keptLocal++;
      } else {
        out.sections[name] = incoming.sections[name];
        out.source[name] = 'incoming';
        out.tookIncoming++;
      }
      out.mergedCount++;
    });
    out.stand = stand;
    return out;
  }

  return {
    SYNC_APP_ID: SYNC_APP_ID,
    SYNC_VERSION: SYNC_VERSION,
    SYNC_FILE_NAME: SYNC_FILE_NAME,
    FORMAT_VERSION: FORMAT_VERSION,
    sanitizeSyncMeta: sanitizeSyncMeta,
    sanitizeSyncFile: sanitizeSyncFile,
    buildSyncFile: buildSyncFile,
    compareStands: compareStands,
    mergeSync: mergeSync
  };
})();
if (typeof module === 'object' && module.exports) { module.exports = AlimenCal.syncdata; }
