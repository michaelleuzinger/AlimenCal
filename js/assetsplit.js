/*
 * AlimenCal – Vermögensausgleich (vereinfachter Stichtags-Modus).
 *
 * Erfasst Vermögenswerte (Konten, Anlagen, ETF, Bargeld, Immobilien,
 * Vorsorge, Schulden) je Partei als Saldo zu einem Stichtag und
 * berechnet einen einfachen Ausgleich: das Nettovermögen beider
 * Parteien wird addiert und hälftig geteilt (keine Herleitung der
 * Errungenschaften, keine Eigengut-Differenzierung – Orientierungswert).
 *
 * DOM-frei gehalten für Unit-Tests in Node.js.
 */
var AlimenCal = typeof AlimenCal !== 'undefined' ? AlimenCal : {};
AlimenCal.assetsplit = (function () {
  'use strict';

  var EPS = 1e-9;

  var CATEGORIES = [
    'account', 'investment', 'etf', 'cash', 'realestate', 'pension', 'other'
  ];

  var OWNERS = ['A', 'B', 'joint'];

  function round2(x) {
    return Math.round((x + Number.EPSILON) * 100) / 100;
  }

  /* Normalisiert einen Vermögenswert: fehlende Felder ergänzen,
   * ungültige Werte verwerfen (Rückgabe null).
   * shareA ist der Anteil der Partei A bei gemeinsamen Werten (0..1,
   * Standard 0.5). */
  function normalizeAsset(raw) {
    if (!raw || typeof raw !== 'object') { return null; }
    var label = typeof raw.label === 'string' ? raw.label.trim() : '';
    if (!label) { return null; }
    var value = typeof raw.value === 'number' ? raw.value : parseFloat(raw.value);
    if (!isFinite(value)) { return null; }
    var category = CATEGORIES.indexOf(raw.category) >= 0 ? raw.category : 'other';
    var owner = OWNERS.indexOf(raw.owner) >= 0 ? raw.owner : 'A';
    var shareA = typeof raw.shareA === 'number' ? raw.shareA : parseFloat(raw.shareA);
    if (!isFinite(shareA) || shareA < 0 || shareA > 1) { shareA = 0.5; }
    var note = typeof raw.note === 'string' ? raw.note : '';
    return {
      id: typeof raw.id === 'string' && raw.id ? raw.id : null,
      label: label,
      category: category,
      owner: owner,
      value: value,
      shareA: shareA,
      note: note
    };
  }

  /* Berechnet den Ausgleich: Rückgabe
   *   { sumA, sumB, total, half, amount, from, to }
   * sumA/sumB: Nettovermögen je Partei (Schulden als negative Werte
   * erfassen). joint-Werte werden nach shareA aufgeteilt.
   * amount: Ausgleichszahlung (0, wenn |diff| < 0.005), from = zahlende,
   * to = empfangende Partei. Ohne gültige Werte: alles 0, from/to null. */
  function computeSplit(assets) {
    var sumA = 0;
    var sumB = 0;
    var list = Array.isArray(assets) ? assets : [];
    for (var i = 0; i < list.length; i++) {
      var a = normalizeAsset(list[i]);
      if (!a) { continue; }
      if (a.owner === 'A') {
        sumA += a.value;
      } else if (a.owner === 'B') {
        sumB += a.value;
      } else {
        sumA += a.value * a.shareA;
        sumB += a.value * (1 - a.shareA);
      }
    }
    sumA = round2(sumA);
    sumB = round2(sumB);
    var total = round2(sumA + sumB);
    var half = round2(total / 2);
    var diff = round2(sumA - sumB);
    var result = {
      sumA: sumA,
      sumB: sumB,
      total: total,
      half: half,
      amount: 0,
      from: null,
      to: null
    };
    if (Math.abs(diff) < 0.005 - EPS || Math.abs(diff) < EPS) {
      return result;
    }
    result.amount = round2(Math.abs(diff) / 2);
    if (diff > 0) {
      result.from = 'A';
      result.to = 'B';
    } else {
      result.from = 'B';
      result.to = 'A';
    }
    return result;
  }

  /* Nettovermögen je Partei getrennt nach Kategorien (für die
   * Ergebnis-Tabelle; joint-Werte nach shareA aufgeteilt). */
  function sumsByCategory(assets) {
    var sums = {};
    for (var i = 0; i < CATEGORIES.length; i++) {
      sums[CATEGORIES[i]] = { A: 0, B: 0 };
    }
    var list = Array.isArray(assets) ? assets : [];
    for (var j = 0; j < list.length; j++) {
      var a = normalizeAsset(list[j]);
      if (!a) { continue; }
      var shareA = a.owner === 'B' ? 0 : (a.owner === 'A' ? 1 : a.shareA);
      sums[a.category].A = round2(sums[a.category].A + a.value * shareA);
      sums[a.category].B = round2(sums[a.category].B + a.value * (1 - shareA));
    }
    return sums;
  }

  return {
    CATEGORIES: CATEGORIES,
    OWNERS: OWNERS,
    normalizeAsset: normalizeAsset,
    computeSplit: computeSplit,
    sumsByCategory: sumsByCategory
  };
})();
if (typeof module === 'object' && module.exports) { module.exports = AlimenCal.assetsplit; }
