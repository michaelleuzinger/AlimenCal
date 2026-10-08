/*
 * AlimenCal – Falldaten-Austausch (zwei Parteien, zwei PCs).
 * DOM-freies Modul: validiert exportierte Fallabschnitte (JSON) und führt
 * sie mit vorhandenen Daten zusammen (Merge). Die UI-Schicht (app.js)
 * liest/schreibt die Formularfelder, dieses Modul entscheidet, was gültig
 * ist und wie zusammengeführt wird.
 */
var AlimenCal = typeof AlimenCal !== 'undefined' ? AlimenCal : {};

AlimenCal.casedata = (function () {
  'use strict';

  var SECTIONS = [
    'parentA', 'parentB', 'children', 'spousalApplicant',
    'spousalRespondent', 'spousalEnabled', 'costsplit', 'assetsplit'
  ];

  var CASE_APP_ID = 'alimencal';
  var CASE_VERSION = 1;

  function isNum(v) {
    return typeof v === 'number' && isFinite(v);
  }

  function numOrEmpty(v) {
    if (v === '' || v == null) { return ''; }
    var n = typeof v === 'number' ? v : parseFloat(v);
    return isFinite(n) ? n : '';
  }

  function boolOrFalse(v) {
    return v === true || v === 'true';
  }

  function sanitizeParent(data) {
    if (!data || typeof data !== 'object') { return null; }
    return {
      income: isNum(numOrEmpty(data.income)) ? numOrEmpty(data.income) : 0,
      existenzminimum: numOrEmpty(data.existenzminimum),
      employed: boolOrFalse(data.employed)
    };
  }

  function sanitizeChild(child) {
    if (!child || typeof child !== 'object') { return null; }
    var age = parseInt(child.age, 10);
    if (!isFinite(age) || age < 0 || age > 99) { return null; }
    var mode = child.costMode === 'effective' ? 'effective' : 'pauschal';
    return {
      age: age,
      costMode: mode,
      effectiveCosts: isNum(numOrEmpty(child.effectiveCosts)) ? numOrEmpty(child.effectiveCosts) : 0,
      ownIncome: isNum(numOrEmpty(child.ownIncome)) ? numOrEmpty(child.ownIncome) : 0,
      childAllowance: isNum(numOrEmpty(child.childAllowance)) ? numOrEmpty(child.childAllowance) : 0,
      kkPremium: isNum(numOrEmpty(child.kkPremium)) ? numOrEmpty(child.kkPremium) : 0,
      externalCareCosts: isNum(numOrEmpty(child.externalCareCosts)) ? numOrEmpty(child.externalCareCosts) : 0,
      careShareParentA: isNum(numOrEmpty(child.careShareParentA)) ? numOrEmpty(child.careShareParentA) : 0,
      careShareParentB: isNum(numOrEmpty(child.careShareParentB)) ? numOrEmpty(child.careShareParentB) : 0
    };
  }

  function sanitizeChildren(data) {
    if (!Array.isArray(data)) { return null; }
    var out = [];
    for (var i = 0; i < data.length; i++) {
      var child = sanitizeChild(data[i]);
      if (!child) { return null; }
      out.push(child);
    }
    return out;
  }

  function sanitizeSpousal(data) {
    if (!data || typeof data !== 'object') { return null; }
    return {
      income: isNum(numOrEmpty(data.income)) ? numOrEmpty(data.income) : 0,
      existenzminimum: numOrEmpty(data.existenzminimum),
      targetStandard: isNum(numOrEmpty(data.targetStandard)) ? numOrEmpty(data.targetStandard) : 0,
      extraCosts: isNum(numOrEmpty(data.extraCosts)) ? numOrEmpty(data.extraCosts) : 0,
      childSupportPaid: isNum(numOrEmpty(data.childSupportPaid)) ? numOrEmpty(data.childSupportPaid) : 0
    };
  }

  function sanitizeTransaction(tx) {
    if (!tx || typeof tx !== 'object') { return null; }
    if (typeof tx.id !== 'string' || !tx.id) { return null; }
    if (typeof tx.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(tx.date)) { return null; }
    var amount = typeof tx.amount === 'number' ? tx.amount : parseFloat(tx.amount);
    if (!isFinite(amount)) { return null; }
    return {
      id: tx.id,
      date: tx.date,
      description: typeof tx.description === 'string' ? tx.description : '',
      amount: amount
    };
  }

  function sanitizeDecision(dec) {
    if (!dec || typeof dec !== 'object') { return null; }
    var mode = dec.mode;
    if (['ignore', 'split', 'partyA', 'partyB'].indexOf(mode) < 0) { return null; }
    var shareA = typeof dec.shareA === 'number' ? dec.shareA : parseFloat(dec.shareA);
    if (!isFinite(shareA) || shareA < 0 || shareA > 1) { shareA = 0.5; }
    return { mode: mode, shareA: shareA };
  }

  function sanitizeCostsplit(data) {
    if (!data || typeof data !== 'object' || !Array.isArray(data.transactions)) { return null; }
    var txs = [];
    for (var i = 0; i < data.transactions.length; i++) {
      var tx = sanitizeTransaction(data.transactions[i]);
      if (!tx) { return null; }
      txs.push(tx);
    }
    var decisions = {};
    var source = data.decisions || {};
    for (var id in source) {
      if (Object.prototype.hasOwnProperty.call(source, id)) {
        var dec = sanitizeDecision(source[id]);
        if (dec) { decisions[id] = dec; }
      }
    }
    return { transactions: txs, decisions: decisions };
  }

  /* Gleiche Werteliste wie js/assetsplit.js; hier eigenstaendig, damit
   * dieses Modul keine Abhaengigkeit zur Laufzeit-Reihenfolge anderer
   * Module hat (analog normalizeDate in js/storage.js). */
  var ASSET_CATEGORIES = ['account', 'investment', 'etf', 'cash', 'realestate', 'pension', 'other'];
  var ASSET_OWNERS = ['A', 'B', 'joint'];

  function sanitizeAsset(asset) {
    if (!asset || typeof asset !== 'object') { return null; }
    var label = typeof asset.label === 'string' ? asset.label.trim() : '';
    if (!label) { return null; }
    var value = typeof asset.value === 'number' ? asset.value : parseFloat(asset.value);
    if (!isFinite(value)) { return null; }
    var shareA = typeof asset.shareA === 'number' ? asset.shareA : parseFloat(asset.shareA);
    if (!isFinite(shareA) || shareA < 0 || shareA > 1) { shareA = 0.5; }
    return {
      id: typeof asset.id === 'string' && asset.id ? asset.id : '',
      label: label,
      category: ASSET_CATEGORIES.indexOf(asset.category) >= 0 ? asset.category : 'other',
      owner: ASSET_OWNERS.indexOf(asset.owner) >= 0 ? asset.owner : 'A',
      value: value,
      shareA: shareA,
      note: typeof asset.note === 'string' ? asset.note : ''
    };
  }

  function sanitizeAssetsplit(data) {
    if (!data || typeof data !== 'object' || !Array.isArray(data.assets)) { return null; }
    var assets = [];
    for (var i = 0; i < data.assets.length; i++) {
      var a = sanitizeAsset(data.assets[i]);
      if (!a) { return null; }
      assets.push(a);
    }
    return {
      date: typeof data.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.date) ? data.date : '',
      assets: assets
    };
  }

  /**
   * Validiert eine importierte Datei. Rückgabe:
   *   { valid: bool, sections: {…} , invalid: [names] }
   * Ungültige Abschnitte werden verworfen (invalid aufgelistet), unbekannte
   * Abschnitte ignoriert.
   */
  function sanitizeCase(raw) {
    var result = { valid: false, sections: {}, invalid: [] };
    if (!raw || typeof raw !== 'object') { return result; }
    if (raw.app !== CASE_APP_ID) { return result; }
    if (raw.version !== CASE_VERSION) { return result; }
    if (!raw.sections || typeof raw.sections !== 'object') { return result; }

    SECTIONS.forEach(function (name) {
      var data = raw.sections[name];
      if (data == null) { return; }
      var sanitized = null;
      switch (name) {
        case 'parentA':
        case 'parentB':
          sanitized = sanitizeParent(data);
          break;
        case 'children':
          sanitized = sanitizeChildren(data);
          break;
        case 'spousalApplicant':
        case 'spousalRespondent':
          sanitized = sanitizeSpousal(data);
          break;
        case 'spousalEnabled':
          sanitized = boolOrFalse(data);
          break;
        case 'costsplit':
          sanitized = sanitizeCostsplit(data);
          break;
        case 'assetsplit':
          sanitized = sanitizeAssetsplit(data);
          break;
      }
      if (sanitized === null) {
        result.invalid.push(name);
      } else {
        result.sections[name] = sanitized;
      }
    });

    result.valid = Object.keys(result.sections).length > 0;
    return result;
  }

  /**
   * Führt importierte Abschnitte mit den aktuellen Daten zusammen.
   * Enthaltene (gültige) Abschnitte überschreiben die aktuellen Werte,
   * nicht enthaltene bleiben unverändert.
   */
  function mergeCase(current, incoming) {
    var merged = {};
    SECTIONS.forEach(function (name) {
      merged[name] =
        Object.prototype.hasOwnProperty.call(incoming, name)
          ? incoming[name]
          : (current && Object.prototype.hasOwnProperty.call(current, name) ? current[name] : null);
    });
    merged.__count = Object.keys(incoming || {}).length;
    return merged;
  }

  function buildFile(sections) {
    return {
      app: CASE_APP_ID,
      version: CASE_VERSION,
      exportedAt: new Date().toISOString(),
      sections: sections
    };
  }

  var BACKUP_ID = 'alimencal-backup';
  var BACKUP_VERSION = 1;
  var BACKUP_LANGS = ['de', 'fr', 'it', 'en'];

  function sanitizeBackupLang(data) {
    return BACKUP_LANGS.indexOf(data) >= 0 ? data : null;
  }

  function sanitizeBackupTheme(data) {
    if (!data || typeof data !== 'object') { return null; }
    var id = typeof data.id === 'string' && data.id ? data.id : null;
    if (!id) { return null; }
    var values = null;
    if (data.values != null) {
      values = (AlimenCal.themes && AlimenCal.themes.sanitizeValues)
        ? AlimenCal.themes.sanitizeValues(data.values)
        : null;
    }
    return { id: id, values: values };
  }

  function sanitizeBackupConfig(data) {
    if (!data || typeof data !== 'object') { return null; }
    if (!AlimenCal.config) { return null; }
    var base = AlimenCal.config;
    var cfg = {};
    var seen = 0;
    for (var k in base) {
      if (Object.prototype.hasOwnProperty.call(base, k)) {
        cfg[k] = Object.prototype.hasOwnProperty.call(data, k) ? data[k] : base[k];
        seen++;
      }
    }
    return seen > 0 ? cfg : null;
  }

  function sanitizeBackupBinding(data) {
    if (!data || typeof data !== 'object' || !data.settings || typeof data.settings !== 'object') {
      return null;
    }
    var out = { settings: {}, overrides: {}, chain: [] };
    for (var key in data.settings) {
      if (!Object.prototype.hasOwnProperty.call(data.settings, key)) { continue; }
      var s = data.settings[key];
      if (!s || typeof s !== 'object') { continue; }
      out.settings[key] = {
        valueBase: typeof s.valueBase === 'number' ? s.valueBase : null,
        lockedA: s.lockedA === true,
        lockedB: s.lockedB === true
      };
    }
    if (Object.keys(out.settings).length === 0) { return null; }
    for (var sid in (data.overrides || {})) {
      if (!Object.prototype.hasOwnProperty.call(data.overrides, sid)) { continue; }
      var ov = data.overrides[sid];
      if (ov && typeof ov.valueOverride === 'number') {
        out.overrides[sid] = {
          key: typeof ov.key === 'string' ? ov.key : null,
          valueOverride: ov.valueOverride,
          reason: ov.reason || null
        };
      }
    }
    out.chain = Array.isArray(data.chain) ? data.chain : [];
    return out;
  }
  function sanitizeBackupKeys(data) {
    if (!data || typeof data !== 'object') { return null; }
    var out = { partyA: null, partyB: null };
    ['partyA', 'partyB'].forEach(function (party) {
      var k = data[party];
      if (!k || typeof k !== 'object') { return; }
      out[party] = {
        importedParty: k.importedParty === true,
        publicKey: typeof k.publicKey === 'string' ? k.publicKey : null,
        privateKey: typeof k.privateKey === 'string' ? k.privateKey : null
      };
    });
    return (out.partyA || out.partyB) ? out : null;
  }
  function buildBackupFile(sections, extras) {
    var extra = extras || {};
    return {
      app: BACKUP_ID,
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      case: buildFile(sections),
      settings: {
        lang: extra.lang || null,
        theme: extra.theme || null,
        config: extra.config || null,
        binding: extra.binding || null,
        keys: extra.keys || null
      }
    };
  }

  function sanitizeBackup(raw) {
    var result = { valid: false, sections: {}, invalid: [], settings: {} };
    if (!raw || typeof raw !== 'object') { return result; }
    if (raw.app !== BACKUP_ID) { return result; }
    if (raw.version !== BACKUP_VERSION) { return result; }
    var inner = raw.case ? sanitizeCase(raw.case) : null;
    if (!inner || !inner.valid) { return result; }
    result.sections = inner.sections;
    result.invalid = inner.invalid;
    var settings = raw.settings || {};
    var lang = sanitizeBackupLang(settings.lang);
    if (lang) { result.settings.lang = lang; }
    var theme = sanitizeBackupTheme(settings.theme);
    if (theme) { result.settings.theme = theme; }
    var config = sanitizeBackupConfig(settings.config);
    if (config) { result.settings.config = config; }
    var binding = sanitizeBackupBinding(settings.binding);
    if (binding) { result.settings.binding = binding; }
    var keys = sanitizeBackupKeys(settings.keys);
    if (keys) { result.settings.keys = keys; }
    result.valid = true;
    return result;
  }

  return {
    BACKUP_ID: BACKUP_ID,
    BACKUP_VERSION: BACKUP_VERSION,
    buildBackupFile: buildBackupFile,
    sanitizeBackup: sanitizeBackup,
    SECTIONS: SECTIONS,
    sanitizeCase: sanitizeCase,
    mergeCase: mergeCase,
    buildFile: buildFile,
    sanitizeParent: sanitizeParent,
    sanitizeChildren: sanitizeChildren,
    sanitizeSpousal: sanitizeSpousal,
    sanitizeCostsplit: sanitizeCostsplit,
    sanitizeAssetsplit: sanitizeAssetsplit,
    sanitizeAsset: sanitizeAsset,
    sanitizeTransaction: sanitizeTransaction,
    sanitizeDecision: sanitizeDecision
  };
})();

if (typeof module === 'object' && module.exports) {
  module.exports = AlimenCal.casedata;
}
