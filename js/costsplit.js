/*
 * AlimenCal – Kostentrennung vor der Scheidung.
 *
 * Ermöglicht die separatistische Aufteilung laufender Kosten ab einem
 * wählbaren Datum (z. B. Datum der Trennung / des Getrenntlebens):
 *  - Import von Bankexporten (CSV mit Auto-Erkennung von Trennzeichen
 *    und Spalten)
 *  - Je Transaktion: ignorieren, anteilsmässig aufteilen (konfigurierbarer
 *    Anteil) oder volle Übernahme durch Partei A oder B
 *
 * DOM-frei gehalten für Unit-Tests in Node.js.
 */
var AlimenCal = typeof AlimenCal !== 'undefined' ? AlimenCal : {};

AlimenCal.costsplit = (function () {
  'use strict';

  var EPS = 1e-9;

  function round2(x) {
    return Math.round((x + Number.EPSILON) * 100) / 100;
  }

  /* ------------------------------------------------------------------ *
   *  CSV-Parsing mit Auto-Erkennung                                     *
   * ------------------------------------------------------------------ */

  function detectDelimiter(line) {
    var candidates = [';', '\t', ','];
    var best = ';';
    var bestCount = -1;
    for (var i = 0; i < candidates.length; i++) {
      var count = line.split(candidates[i]).length - 1;
      if (count > bestCount) {
        bestCount = count;
        best = candidates[i];
      }
    }
    return best;
  }

  function splitCsvLine(line, delimiter) {
    var out = [];
    var cur = '';
    var inQuotes = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          cur += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === delimiter) {
        out.push(cur);
        cur = '';
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out.map(function (s) { return s.trim(); });
  }

  function parseAmount(raw) {
    if (raw == null) { return null; }
    var s = String(raw).replace(/["\s']/g, '');
    // Apostroph als Tausendertrennzeichen entfernen (z. B. 1'234.50)
    s = s.replace(/'(\d{3})/g, '$1');
    // Deutsche/italienische Notation: 1.234,50 -> 1234.50
    if (/^-?\d{1,3}(\.\d{3})+,\d{1,2}$/.test(s)) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else if (/^-?\d+,\d{1,2}$/.test(s)) {
      s = s.replace(',', '.');
    }
    var n = parseFloat(s);
    return isFinite(n) ? n : null;
  }

  function parseDate(raw) {
    if (raw == null) { return null; }
    var s = String(raw).trim();
    var m;
    // ISO: 2025-03-14
    m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) { return m[1] + '-' + m[2] + '-' + m[3]; }
    // CH: 14.03.2025
    m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
    if (m) {
      return m[3] + '-' +
        ('0' + m[2]).slice(-2) + '-' +
        ('0' + m[1]).slice(-2);
    }
    return null;
  }

  function normalizeHeader(name) {
    return String(name || '').toLowerCase()
      .replace(/[\s_]/g, '')
      .replace(/[^a-zäöüàâçéèêëíîïóôúû]/g, '');
  }

  var DATE_KEYS = ['datum', 'buchungsdatum', 'valuta', 'valutadatum', 'date', 'bookingdate', 'executiondate', 'ausführungsdatum', 'databuching'];
  var DESC_KEYS = ['beschreibung', 'buchungstext', 'bemerkung', 'mitteilung', 'transactiontext', 'description', 'details', 'zweck', 'text', 'communication', 'libelle', 'libellé', 'causale', 'descrizione'];
  var AMOUNT_KEYS = ['betrag', 'amount', 'belastung', 'gutschrift', 'montant', 'importo', 'total', 'transaktionsbetrag', 'wert'];
  var AMOUNT_NEG_KEYS = ['belastung', 'debit', 'soll', 'dedito', 'addebito', 'débit'];
  var AMOUNT_POS_KEYS = ['gutschrift', 'credit', 'haben', 'credito', 'accredito', 'crédit'];

  function findKey(headers, keys) {
    for (var i = 0; i < headers.length; i++) {
      var h = normalizeHeader(headers[i]);
      for (var j = 0; j < keys.length; j++) {
        if (h === keys[j]) { return i; }
      }
    }
    // Teilmatch als Fallback
    for (var i2 = 0; i2 < headers.length; i2++) {
      var h2 = normalizeHeader(headers[i2]);
      for (var j2 = 0; j2 < keys.length; j2++) {
        if (h2.indexOf(keys[j2]) >= 0) { return i2; }
      }
    }
    return -1;
  }

  /**
   * Parst einen Bankexport im CSV-Format.
   * Erwartet eine Kopfzeile; Trennzeichen und Spalten werden automatisch
   * erkannt (Datum, Beschreibung, Betrag; optional separate Soll-/Haben-
   * Spalten).
   * Rückgabe: { transactions: [...], warnings: [...] }
   */
  function parseBankCsv(text) {
    var result = { transactions: [], warnings: [] };
    if (!text || !String(text).trim()) {
      result.warnings.push('empty');
      return result;
    }

    var lines = String(text).replace(/\r\n?/g, '\n').split('\n')
      .filter(function (l) { return l.trim().length > 0; });
    if (lines.length < 2) {
      result.warnings.push('noData');
      return result;
    }

    var delimiter = detectDelimiter(lines[0]);
    var headers = splitCsvLine(lines[0], delimiter);

    var dateIdx = findKey(headers, DATE_KEYS);
    var descIdx = findKey(headers, DESC_KEYS);
    var amountIdx = findKey(headers, AMOUNT_KEYS);
    var negIdx = findKey(headers, AMOUNT_NEG_KEYS);
    var posIdx = findKey(headers, AMOUNT_POS_KEYS);

    // Separate Soll-/Haben-Spalten haben Vorrang vor einer einzelnen
    // Betragsspalte (dort ist das Vorzeichen nicht ablesbar).
    if (negIdx >= 0 && posIdx >= 0 && negIdx !== posIdx) {
      amountIdx = -1;
    }

    if (dateIdx < 0 || (amountIdx < 0 && !(negIdx >= 0 && posIdx >= 0))) {
      result.warnings.push('headerNotFound');
      return result;
    }

    // Fallback: erste Spalte Datum, zweite Beschreibung, letzte Betrag
    if (descIdx < 0) { descIdx = headers.length >= 3 ? 1 : -1; }

    for (var i = 1; i < lines.length; i++) {
      var cells = splitCsvLine(lines[i], delimiter);
      var date = parseDate(cells[dateIdx]);
      var amount = amountIdx >= 0 ? parseAmount(cells[amountIdx]) : null;

      // Separate Soll/Haben-Spalten: Belastung negativ, Gutschrift positiv
      if (amount == null && negIdx >= 0 && posIdx >= 0) {
        var neg = parseAmount(cells[negIdx]);
        var pos = parseAmount(cells[posIdx]);
        if (neg != null || pos != null) {
          amount = (pos > 0 ? pos : 0) - (neg > 0 ? neg : 0);
        }
      }

      if (date == null || amount == null) {
        result.warnings.push('row' + i);
        continue;
      }

      result.transactions.push({
        id: 'tx-' + i,
        date: date,
        description: descIdx >= 0 ? (cells[descIdx] || '') : ('Zeile ' + i),
        amount: amount
      });
    }

    return result;
  }

  /* ------------------------------------------------------------------ *
   *  Kategorisierung und Auswertung                                     *
   * ------------------------------------------------------------------ */

  /**
   * Entscheidung je Transaktion:
   *   { mode: 'ignore' }
   *   { mode: 'split', shareA: 0.5 }   // Anteil Partei A (0..1)
   *   { mode: 'partyA' } | { mode: 'partyB' }
   *
   * decisions: { [transactionId]: decision }
   * fromDate: ISO-Datum oder null (alle Transaktionen)
   */
  function computeSplit(transactions, decisions, fromDate) {
    var totals = {
      countConsidered: 0,
      countIgnored: 0,
      countBeforeDate: 0,
      sumA: 0,
      sumB: 0,
      perCategory: {
        ignore: 0,
        split: 0,
        partyA: 0,
        partyB: 0
      }
    };

    transactions.forEach(function (tx) {
      if (fromDate && tx.date < fromDate) {
        totals.countBeforeDate++;
        return;
      }
      var decision = decisions && decisions[tx.id] ? decisions[tx.id] : null;
      if (!decision || !decision.mode) {
        // Unkategorisiert: wird nicht gewertet, aber gezählt
        totals.countIgnored++;
        return;
      }
      totals.countConsidered++;

      if (decision.mode === 'ignore') {
        totals.perCategory.ignore += tx.amount;
        return;
      }
      if (decision.mode === 'partyA') {
        totals.sumA += tx.amount;
        totals.perCategory.partyA += tx.amount;
        return;
      }
      if (decision.mode === 'partyB') {
        totals.sumB += tx.amount;
        totals.perCategory.partyB += tx.amount;
        return;
      }
      if (decision.mode === 'split') {
        var shareA = Math.min(1, Math.max(0, Number(decision.shareA)));
        if (!isFinite(shareA)) { shareA = 0.5; }
        var shareB = 1 - shareA;
        totals.sumA += tx.amount * shareA;
        totals.sumB += tx.amount * shareB;
        totals.perCategory.split += tx.amount;
      }
    });

    ['sumA', 'sumB'].forEach(function (k) { totals[k] = round2(totals[k]); });
    ['ignore', 'split', 'partyA', 'partyB'].forEach(function (k) {
      totals.perCategory[k] = round2(totals.perCategory[k]);
    });

    totals.total = round2(totals.sumA + totals.sumB);
    totals.balance = round2(totals.sumA - totals.sumB);
    return totals;
  }

  /**
   * Ausgleich zwischen den Parteien.
   *
   * Annahme: Der Bankexport stammt aus dem Konto EINER Partei (ownerIsA);
   * sämtliche Zahlungen wurden also vom Kontoinhaber geleistet bzw.
   * Eingänge gingen auf sein Konto.
   *
   * Der Ausgleich entspricht der Summe der der NICHT-Inhaberpartei
   * zugewiesenen Beträge (sumNonOwner):
   *  - Übernimmt die Nicht-Inhaberpartei Kosten (negative Beträge),
   *    reimbursement = -sumNonOwner > 0: Nicht-Inhaber zahlt dem Inhaber.
   *  - Fliessen der Nicht-Inhaberpartei Erträge zu (positive Beträge),
   *    zahlt der Inhaber der anderen Partei.
   *
   * Rückgabe: { amount: number >= 0, from: 'A'|'B', to: 'A'|'B' }
   * (from/to bezogen auf die Parteien, nicht auf den Kontoinhaber).
   */
  function computeSettlement(totals, ownerIsA) {
    var sumNonOwner = ownerIsA === false ? totals.sumA : totals.sumB;
    var nonOwner = ownerIsA === false ? 'A' : 'B';
    var owner = nonOwner === 'A' ? 'B' : 'A';
    var flow = round2(-sumNonOwner);
    if (flow > 0) {
      return { amount: flow, from: nonOwner, to: owner };
    }
    if (flow < 0) {
      return { amount: round2(-flow), from: owner, to: nonOwner };
    }
    return { amount: 0, from: null, to: null };
  }

  return {
    parseBankCsv: parseBankCsv,
    computeSplit: computeSplit,
    computeSettlement: computeSettlement,
    parseAmount: parseAmount,
    parseDate: parseDate,
    detectDelimiter: detectDelimiter,
    splitCsvLine: splitCsvLine,
    round2: round2
  };
})();

if (typeof module === 'object' && module.exports) {
  module.exports = AlimenCal.costsplit;
}
