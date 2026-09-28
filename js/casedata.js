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
    'spousalRespondent', 'spousalEnabled', 'costsplit'
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
    return {
      age: age,
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

  return {
    SECTIONS: SECTIONS,
    sanitizeCase: sanitizeCase,
    mergeCase: mergeCase,
    buildFile: buildFile,
    sanitizeParent: sanitizeParent,
    sanitizeChildren: sanitizeChildren,
    sanitizeSpousal: sanitizeSpousal,
    sanitizeCostsplit: sanitizeCostsplit,
    sanitizeTransaction: sanitizeTransaction,
    sanitizeDecision: sanitizeDecision
  };
})();

if (typeof module === 'object' && module.exports) {
  module.exports = AlimenCal.casedata;
}
