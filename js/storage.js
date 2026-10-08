/* *
 * AlimenCal - localStorage-Persistenz fuer Falldaten (Formular, Kinder,
 * Kostentrennung).
 *
 * DOM-freies Modul: parst gespeicherte JSON-Payloads, prueft die Format-
 * Version, migriert aeltere Versionen und normalisiert die Daten
 * (fehlende Felder ergaenzen, ungueltige Einträge verwerfen), damit ein
 * App-Update bestaehende Nutzerdaten in jedem Fall wieder lesen kann.
 * Die UI-Schicht (app.js) liest/schreibt localStorage, dieses Modul
 * entscheidet, was gueltig ist und wie migriert wird.
 *
 * Regel (AGENTS.md): Jede Aenderung an gespeicherten Datenstrukturen
 * erhoeht FORM_VERSION und liefert eine Migration in migrateForm mit,
 * inkl. Unit-Test mit einem Payload der vorherigen Version.
 */
var AlimenCal = typeof AlimenCal !== 'undefined' ? AlimenCal : {};
AlimenCal.storage = (function () {
  'use strict';

  var APP_ID = 'alimencal';
  var KIND_FORM = 'form';

  /* Format-Historie:
   *   1 - unversionierte Payloads (Plain-Objekt ohne app/kind/version),
   *       Kinder/Kostentrennung unnormalisiert gespeichert
   *   2 - versionierter Payload (app/kind/version), Kinder und
   *       Kostentrennung werden beim Laden normalisiert
   *   3 - Abschnitt-Locks (importierte Abschnitte read-only)
   *   4 - frei waehlbare Partei-Namen (party-name-a/b)
   */
  var FORM_VERSION = 4;

  var PARTY_NAME_MAX = 40;

  /* Normalisiert einen Partei-Namen: string, getrimmt, laengenbeschraenkt;
   * leer/ungueltig -> '' (App faellt auf i18n-Default zurueck). */
  function normalizePartyName(raw) {
    if (typeof raw !== 'string') { return ''; }
    var s = raw.trim();
    if (!s) { return ''; }
    return s.slice(0, PARTY_NAME_MAX);
  }

  var CHILD_DEFAULTS = {
    age: 8,
    costMode: 'pauschal',
    effectiveCosts: 0,
    ownIncome: 0,
    childAllowance: 0,
    kkPremium: 0,
    externalCareCosts: 0,
    careShareParentA: 0,
    careShareParentB: 100
  };

  function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

  function numOr(source, key, fallback) {
    if (!Object.prototype.hasOwnProperty.call(source, key)) { return fallback; }
    var v = source[key];
    if (v === '' || v == null) { return fallback; }
    var n = typeof v === 'number' ? v : parseFloat(v);
    return isFinite(n) ? n : fallback;
  }

  /* Normalisiert ein einzelnes Kind: bekannte Felder auf gueltige Werte,
   * fehlende Felder mit Defaults ergaenzen, unbekannte Felder fuer
   * Vorwaertskompatibilitaet beibehalten. Ungueltige Eintraege -> null. */
  function normalizeChild(raw) {
    if (!raw || typeof raw !== 'object') { return null; }
    var age = parseInt(raw.age, 10);
    if (!isFinite(age) || age < 0 || age > 99) { return null; }
    var out = clone(raw);
    out.age = age;
    out.costMode = raw.costMode === 'effective' ? 'effective' : 'pauschal';
    out.effectiveCosts = numOr(raw, 'effectiveCosts', CHILD_DEFAULTS.effectiveCosts);
    out.ownIncome = numOr(raw, 'ownIncome', CHILD_DEFAULTS.ownIncome);
    out.childAllowance = numOr(raw, 'childAllowance', CHILD_DEFAULTS.childAllowance);
    out.kkPremium = numOr(raw, 'kkPremium', CHILD_DEFAULTS.kkPremium);
    out.externalCareCosts = numOr(raw, 'externalCareCosts', CHILD_DEFAULTS.externalCareCosts);
    out.careShareParentA = numOr(raw, 'careShareParentA', CHILD_DEFAULTS.careShareParentA);
    out.careShareParentB = numOr(raw, 'careShareParentB', CHILD_DEFAULTS.careShareParentB);
    return out;
  }

  function normalizeChildren(raw) {
    if (!Array.isArray(raw)) { return null; }
    var out = [];
    for (var i = 0; i < raw.length; i++) {
      var child = normalizeChild(raw[i]);
      if (child) { out.push(child); }
    }
    return out;
  }

  /* Normalisiert ein Transaktionsdatum (ISO oder CH-Format), wie in
   * js/costsplit.js parseDate; hier eigenstaendig, damit dieses Modul
   * keine Abhaengigkeit zur Laufzeit-Reihenfolge anderer Module hat. */
  function normalizeDate(raw) {
    if (raw == null) { return null; }
    var s = String(raw).trim();
    var m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) { return m[1] + '-' + m[2] + '-' + m[3]; }
    m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
    if (m) {
      return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
    }
    return null;
  }

  function normalizeTransaction(raw) {
    if (!raw || typeof raw !== 'object') { return null; }
    var date = typeof raw.date === 'string' ? normalizeDate(raw.date) : null;
    if (!date) { return null; }
    var amount = typeof raw.amount === 'number' ? raw.amount : parseFloat(raw.amount);
    if (!isFinite(amount)) { return null; }
    return {
      id: typeof raw.id === 'string' && raw.id ? raw.id : 'tx-' + (outCount++),
      date: date,
      description: typeof raw.description === 'string' ? raw.description : '',
      amount: amount
    };
  }

  var outCount = 0;

  function normalizeDecision(raw) {
    if (!raw || typeof raw !== 'object') { return null; }
    if (['ignore', 'split', 'partyA', 'partyB'].indexOf(raw.mode) < 0) { return null; }
    var shareA = typeof raw.shareA === 'number' ? raw.shareA : parseFloat(raw.shareA);
    if (!isFinite(shareA) || shareA < 0 || shareA > 1) { shareA = 0.5; }
    return { mode: raw.mode, shareA: shareA };
  }

  function normalizeCostsplit(raw) {
    if (!raw || typeof raw !== 'object') { return null; }
    if (!Array.isArray(raw.transactions)) { return null; }
    var out = clone(raw);
    var txs = [];
    outCount = 0;
    for (var i = 0; i < raw.transactions.length; i++) {
      var tx = normalizeTransaction(raw.transactions[i]);
      if (tx) { txs.push(tx); }
    }
    out.transactions = txs;
    var decisions = {};
    var source = raw.decisions || {};
    for (var id in source) {
      if (Object.prototype.hasOwnProperty.call(source, id)) {
        var dec = normalizeDecision(source[id]);
        if (dec) { decisions[id] = dec; }
      }
    }
    out.decisions = decisions;
    return out;
  }

  /* Migration aelterer Formular-Payloads auf die aktuelle Version.
   * form wird in-place migriert; Rueckgabe: Formular oder null, falls
   * der Payload unbrauchbar ist. changed=true, wenn Daten angepasst
   * wurden (Aufrufer soll erneut speichern). */
  function migrateForm(form, fromVersion) {
    if (!form || typeof form !== 'object') { return null; }
    var changed = false;

    if (fromVersion < 2) {
      /* v1: Kinder und Kostentrennung unnormalisiert uebernommen -
       * fehlende Felder ergaenzen, ungueltige Eintraege verwerfen. */
      var children = normalizeChildren(form.__children);
      if (children && children.length !== (form.__children || []).length) {
        changed = true;
      }
      if (children) {
        for (var i = 0; i < children.length; i++) {
          var raw = form.__children[i] || {};
          for (var k in CHILD_DEFAULTS) {
            if (children[i][k] !== raw[k]) { changed = true; break; }
          }
        }
      }
      if (children) { form.__children = children; }
      var costsplit = normalizeCostsplit(form.__costsplit);
      if (costsplit) {
        if (costsplit.transactions.length !== (form.__costsplit.transactions || []).length) {
          changed = true;
        }
        form.__costsplit = costsplit;
      } else if (form.__costsplit) {
        delete form.__costsplit;
        changed = true;
      }
    }
    if (fromVersion < 3) {
      /* v3: Abschnitt-Locks (importierte Abschnitte read-only). */
      var locks = form.__sectionLocks;
      if (!Array.isArray(locks)) {
        if (locks) { delete form.__sectionLocks; changed = true; }
      } else {
        var validLockKeys = ['parentA', 'parentB', 'children', 'spousalApplicant',
          'spousalRespondent', 'spousalEnabled', 'costsplit'];
        var cleanLocks = locks.filter(function (k) { return validLockKeys.indexOf(k) >= 0; });
        if (cleanLocks.length !== locks.length) { changed = true; }
        form.__sectionLocks = cleanLocks;
      }
    }

    if (fromVersion < 4) {
      /* v4: Partei-Namen (frei waehlbar statt Partei A/B). */
      ['party-name-a', 'party-name-b'].forEach(function (id) {
        if (!Object.prototype.hasOwnProperty.call(form, id)) { return; }
        var name = normalizePartyName(form[id]);
        if (form[id] !== name) { form[id] = name; changed = true; }
      });
    }

    return { form: form, changed: changed };
  }

  /* Parst einen gespeicherten JSON-String (LS_FORM).
   * Rueckgabe: { status: 'empty'|'invalid'|'ok', form, version, changed } */
  function parseStored(raw) {
    var result = { status: 'empty', form: null, version: 0, changed: false };
    if (!raw) { return result; }
    var parsed;
    try { parsed = JSON.parse(raw); } catch (e) { result.status = 'invalid'; return result; }
    if (parsed == null) { result.status = 'invalid'; return result; }
    if (typeof parsed !== 'object') { result.status = 'invalid'; return result; }

    if (Object.prototype.hasOwnProperty.call(parsed, 'app') ||
        Object.prototype.hasOwnProperty.call(parsed, 'version')) {
      if (parsed.app !== APP_ID || parsed.kind !== KIND_FORM) {
        result.status = 'invalid';
        return result;
      }
      var version = parseInt(parsed.version, 10);
      if (!isFinite(version) || version < 1 || version > FORM_VERSION) {
        result.status = 'invalid';
        return result;
      }
      if (!parsed.form || typeof parsed.form !== 'object') {
        result.status = 'invalid';
        return result;
      }
      var migrated = migrateForm(parsed.form, version);
      if (!migrated) { result.status = 'invalid'; return result; }
      result.status = 'ok';
      result.form = migrated.form;
      result.version = version;
      result.changed = migrated.changed || version < FORM_VERSION;
      return result;
    }

    /* Unversionierter Altbestand (Format 1). */
    var legacy = migrateForm(parsed, 1);
    if (!legacy) { result.status = 'invalid'; return result; }
    result.status = 'ok';
    result.form = legacy.form;
    result.version = 1;
    result.changed = legacy.changed;
    return result;
  }

  /* Baut den versionierten Payload zum Speichern. */
  function buildFormPayload(form) {
    return {
      app: APP_ID,
      kind: KIND_FORM,
      version: FORM_VERSION,
      form: form
    };
  }

  /* ---------- Backup-Erinnerung (taeglich / viele Aenderungen) ----------
   *
   * Rein lokale Entscheidungsfunktionen; die App (app.js) speichert die
   * Metadaten (Zeitpunkt des letzten Backups, Anzahl Aenderungen seitdem)
   * unter LS_BACKUP_META und rendert danach das Erinnerungs-Banner.
   */
  var BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000;
  var BACKUP_CHANGES_THRESHOLD = 25;
  var BACKUP_INITIAL_CHANGES_THRESHOLD = 5;

  function sanitizeBackupMeta(raw) {
    if (!raw || typeof raw !== 'object') { return null; }
    return {
      lastAt: typeof raw.lastAt === 'number' && isFinite(raw.lastAt) ? raw.lastAt : null,
      changes: typeof raw.changes === 'number' && isFinite(raw.changes) && raw.changes >= 0
        ? Math.floor(raw.changes) : 0
    };
  }

  function backupReminderDue(meta, now) {
    return backupReminderKind(meta, now) !== null;
  }

  function backupReminderKind(meta, now) {
    var m = sanitizeBackupMeta(meta);
    if (!m) { return null; }
    /* Erste Erinnerung: noch kein Backup, aber bereits Daten erfasst */
    if (!m.lastAt) {
      return m.changes >= BACKUP_INITIAL_CHANGES_THRESHOLD ? 'initial' : null;
    }
    if (m.changes >= BACKUP_CHANGES_THRESHOLD) { return 'many'; }
    now = typeof now === 'number' ? now : Date.now();
    if (now - m.lastAt >= BACKUP_INTERVAL_MS) { return 'old'; }
    return null;
  }

  return {
    FORM_VERSION: FORM_VERSION,
    CHILD_DEFAULTS: CHILD_DEFAULTS,
    PARTY_NAME_MAX: PARTY_NAME_MAX,
    normalizePartyName: normalizePartyName,
    normalizeDate: normalizeDate,
    normalizeChild: normalizeChild,
    normalizeChildren: normalizeChildren,
    normalizeCostsplit: normalizeCostsplit,
    migrateForm: migrateForm,
    parseStored: parseStored,
    buildFormPayload: buildFormPayload,
    BACKUP_INTERVAL_MS: BACKUP_INTERVAL_MS,
    BACKUP_CHANGES_THRESHOLD: BACKUP_CHANGES_THRESHOLD,
    BACKUP_INITIAL_CHANGES_THRESHOLD: BACKUP_INITIAL_CHANGES_THRESHOLD,
    sanitizeBackupMeta: sanitizeBackupMeta,
    backupReminderDue: backupReminderDue,
    backupReminderKind: backupReminderKind
  };
})();
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AlimenCal.storage;
}
