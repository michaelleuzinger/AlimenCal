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
   *  camt.052/053/054 XML-Parsing (ISO 20022)                           *
   * ------------------------------------------------------------------ */

  var XML_ENTITIES = {
    lt: '<', gt: '>', quot: '"', apos: "'", amp: '&',
    auml: '\u00e4', ouml: '\u00f6', uuml: '\u00fc', Auml: '\u00c4', Ouml: '\u00d6', Uuml: '\u00dc',
    eacute: '\u00e9', egrave: '\u00e8', ecirc: '\u00ea', euml: '\u00eb',
    agrave: '\u00e0', acirc: '\u00e2', ccedil: '\u00e7', ugrave: '\u00f9',
    nbsp: ' ', deg: '\u00b0', szlig: '\u00df'
  };

  function xmlDecode(s) {
    return String(s)
      .replace(/&#x([0-9a-fA-F]+);/g, function (_, h) { return String.fromCharCode(parseInt(h, 16)); })
      .replace(/&#(\d+);/g, function (_, d) { return String.fromCharCode(d); })
      .replace(/&([A-Za-z]+);/g, function (m, name) {
        return Object.prototype.hasOwnProperty.call(XML_ENTITIES, name) ? XML_ENTITIES[name] : m;
      });
  }

  function tagWithoutNs(name) {
    var i = name.indexOf(':');
    return i >= 0 ? name.slice(i + 1) : name;
  }

  function parseXml(text) {
    if (typeof DOMParser !== 'undefined') {
      var doc = new DOMParser().parseFromString(text, 'application/xml');
      if (doc && doc.getElementsByTagName('parsererror').length) { return null; }
      return doc;
    }
    if (typeof require === 'function') {
      var domModule = null;
      try { domModule = require('xmldom'); } catch (e) {}
      if (domModule && domModule.DOMParser) {
        var d = new domModule.DOMParser().parseFromString(text, 'application/xml');
        return d && d.documentElement ? d : null;
      }
    }
    return buildMiniDom(text);
  }

  /**
   * Minimaler, abhängigkeitsfreier XML-Fallback-Parser (nur für gut
   * geformte Bankexporte ohne CDATA/Kommentare). Erzeugt ein kleines
   * Element-Baum-Objekt mit childNodes/textContent/getElementsByTagName.
   */
  function buildMiniDom(text) {
    function El(name) {
      return {
        nodeType: 1,
        nodeName: name,
        localName: tagWithoutNs(name),
        childNodes: [],
        textContent: '',
        append: function (child) { this.childNodes.push(child); }
      };
    }
    var root = El('#document');
    var stack = [root];
    var re = /<\/?([A-Za-z_][\w.:-]*)((?:"[^"]*"|'[^']*'|[^'">])*)>|([^<]+)/g;
    var m;
    while ((m = re.exec(text)) !== null) {
      if (m[3] !== undefined) {
        var parent = stack[stack.length - 1];
        parent.textContent += xmlDecode(m[3]);
        continue;
      }
      var tag = m[1];
      if (m[0].charAt(1) === '/') {
        if (stack.length > 1) { stack.pop(); }
        continue;
      }
      var selfClosing = /\/\s*$/.test(m[2]);
      var attrs = m[2].replace(/\/\s*$/, '').trim();
      var el = El(tag);
      if (selfClosing || attrs.charAt(attrs.length - 1) === '/') {
        stack[stack.length - 1].append(el);
      } else {
        stack[stack.length - 1].append(el);
        stack.push(el);
      }
    }
    if (stack.length !== 1 || !root.childNodes.length) { return null; }

    function collect(node, name, out) {
      if (node.localName === name) { out.push(node); }
      for (var i = 0; i < node.childNodes.length; i++) { collect(node.childNodes[i], name, out); }
    }
    root.getElementsByTagName = function (name) {
      var out = [];
      collect(root, name, out);
      return out;
    };
    var documentElement = root.childNodes[0];
    documentElement.getElementsByTagName = function (name) {
      var out = [];
      collect(documentElement, name, out);
      return out;
    };
    return { documentElement: documentElement, getElementsByTagName: root.getElementsByTagName };
  }

  function childrenByTag(node, name) {
    var out = [];
    if (!node || !node.childNodes) { return out; }
    for (var i = 0; i < node.childNodes.length; i++) {
      var c = node.childNodes[i];
      if (c.nodeType === 1 && tagWithoutNs(c.nodeName) === name) { out.push(c); }
    }
    return out;
  }

  function firstChildByTag(node, name) {
    var l = childrenByTag(node, name);
    return l.length ? l[0] : null;
  }

  function descendantText(node) {
    var s = String(node.textContent || '');
    for (var i = 0; i < node.childNodes.length; i++) {
      s += descendantText(node.childNodes[i]);
    }
    return s;
  }

  function childText(node, name) {
    var c = firstChildByTag(node, name);
    if (!c) { return ''; }
    var own = String(c.textContent || '').trim();
    if (own) { return own; }
    return descendantText(c).trim();
  }

  function camtDateToIso(raw) {
    if (!raw) { return null; }
    var m = String(raw).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) { return m[1] + '-' + m[2] + '-' + m[3]; }
    return null;
  }

  function camtDescription(ntry) {
    var parts = [];
    var ntryDtls = firstChildByTag(ntry, 'NtryDtls');
    var txDtls = ntryDtls ? childrenByTag(ntryDtls, 'TxDtls') : childrenByTag(ntry, 'TxDtls');
    if (txDtls.length) {
      var first = txDtls[0];
      var rmtInf = firstChildByTag(first, 'RmtInf');
      var rmt = rmtInf ? childrenByTag(rmtInf, 'Ustrd') : [];
      if (rmt.length && String(rmt[0].textContent || '').trim()) {
        parts.push(String(rmt[0].textContent).trim());
      } else {
        var nm = firstChildByTag(first, 'Nm');
        if (nm && String(nm.textContent || '').trim()) { parts.push(String(nm.textContent).trim()); }
      }
    }
    var addtlNtryInf = childText(ntry, 'AddtlNtryInf');
    if (addtlNtryInf) { parts.push(addtlNtryInf); }
    if (!parts.length) {
      var cd = firstChildByTag(ntry, 'BkTxCd');
      var prtry = cd ? childText(cd, 'Prtry') : '';
      if (prtry) { parts.push(prtry); }
    }
    return parts.filter(function (p, i, a) { return p && a.indexOf(p) === i; }).join(' ');
  }

  /**
   * Parst einen Bankexport im ISO-20022-XML-Format (camt.052, camt.053,
   * camt.054). Erkennt Buchungs-/Valutadatum je `Ntry`, `Amt` inkl.
   * Vorzeichen (`CdtDbfInd`) und Beschreibung aus `RmtInf/Ustrd`,
   * `AddtlNtryInf` oder `BkTxCd/Prtry`.
   * Rückgabe: { transactions: [...], warnings: [...] }
   */
  function parseCamtXml(text) {
    var result = { transactions: [], warnings: [] };
    var doc = parseXml(text);
    if (!doc || !doc.documentElement) {
      result.warnings.push('invalidXml');
      return result;
    }

    var entries = [];
    var direct = doc.getElementsByTagName('Ntry');
    if (direct && direct.length) {
      for (var d = 0; d < direct.length; d++) { entries.push(direct[d]); }
    } else {
      var all = doc.getElementsByTagName('*');
      for (var a = 0; a < all.length; a++) {
        if (all[a].nodeType === 1 && (all[a].localName || tagWithoutNs(all[a].nodeName)) === 'Ntry') {
          entries.push(all[a]);
        }
      }
    }
    if (!entries.length) {
      result.warnings.push('noEntries');
      return result;
    }

    for (var i = 0; i < entries.length; i++) {
      var ntry = entries[i];
      var dateRaw = childText(ntry, 'BookgDt') || childText(ntry, 'ValDt');
      var date = camtDateToIso(dateRaw);
      var amount = null;

      var amtEl = firstChildByTag(ntry, 'Amt');
      if (amtEl) {
        var amt = parseAmount(String(amtEl.textContent || '').trim());
        if (amt != null) {
          var cdi = childText(ntry, 'CdtDbfInd');
          if (cdi === 'DBIT') { amt = -Math.abs(amt); }
          else if (cdi === 'CRDT') { amt = Math.abs(amt); }
          amount = amt;
        }
      }

      if (date == null || amount == null) {
        result.warnings.push('entry' + i);
        continue;
      }

      result.transactions.push({
        id: 'tx-' + (i + 1),
        date: date,
        description: camtDescription(ntry) || ('Eintrag ' + (i + 1)),
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
    parseCamtXml: parseCamtXml,
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
