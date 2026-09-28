/* AlimenCal – UI-Logik (Tabs, i18n, dynamische Formulare, Berechnung) */
(function () {
  'use strict';

  var LS_LANG = 'alimencal.lang';
  var LS_CFG = 'alimencal.config';
  var LS_PRESET = 'alimencal.preset';
  var DEFAULT_LANG = 'de';
  var LANGS = ['de', 'fr', 'it', 'en'];

  var state = {
    lang: DEFAULT_LANG,
    cfg: null,
    children: [],
    costsplit: {
      transactions: [],
      decisions: {}
    }
  };

  function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

  function getLang() {
    var stored = null;
    try { stored = localStorage.getItem(LS_LANG); } catch (e) {}
    return LANGS.indexOf(stored) >= 0 ? stored : DEFAULT_LANG;
  }

  function getCfg() {
    try {
      var raw = localStorage.getItem(LS_CFG);
      if (raw) {
        var parsed = JSON.parse(raw);
        var base = clone(AlimenCal.config);
        for (var k in parsed) {
          if (Object.prototype.hasOwnProperty.call(parsed, k)) {
            base[k] = parsed[k];
          }
        }
        return base;
      }
    } catch (e) {}
    return clone(AlimenCal.config);
  }

  function saveCfg(cfg) {
    try { localStorage.setItem(LS_CFG, JSON.stringify(cfg)); } catch (e) {}
  }

  function t() {
    var dict = AlimenCal.i18n[state.lang] || AlimenCal.i18n[DEFAULT_LANG];
    var args = Array.prototype.slice.call(arguments);
    var subs = [];
    if (Array.isArray(args[args.length - 1])) {
      subs = args.pop();
    }
    var node = dict;
    for (var i = 0; i < args.length; i++) {
      if (node == null) { return ''; }
      node = node[args[i]];
    }
    var str = node != null ? String(node) : '';
    subs.forEach(function (sub, idx) {
      str = str.split('{' + idx + '}').join(sub);
    });
    return str;
  }

  function fmt(x) {
    if (x == null || !isFinite(x)) { return '–'; }
    return x.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  /* ------------------------------------------------------------- */

  function presetValues(preset) {
    var values = clone(preset);
    delete values.meta;
    return values;
  }

  function applyPreset(preset, persist) {
    state.cfg = clone(AlimenCal.config);
    var values = presetValues(preset);
    for (var k in values) {
      if (Object.prototype.hasOwnProperty.call(values, k)) {
        state.cfg[k] = values[k];
      }
    }
    if (persist !== false) {
      saveCfg(state.cfg);
      try { localStorage.setItem(LS_PRESET, preset.meta.id); } catch (e) {}
    }
    fillCfgForm();
    renderPresetMeta(preset);
  }

  function renderPresetMeta(preset) {
    var meta = preset && preset.meta;
    var box = document.getElementById('preset-meta');
    if (!meta) {
      box.hidden = true;
      return;
    }
    box.hidden = false;
    document.getElementById('preset-source').textContent =
      t('settings', 'presetSource') + ': ' + (meta.source || '–');
    if (meta.url) {
      document.getElementById('preset-source').textContent += ' (' + meta.url + ')';
    }
    fillList('preset-notes', meta.notes);
    fillList('preset-verification', meta.verification);
  }

  function fillList(id, items) {
    var ul = document.getElementById(id);
    ul.innerHTML = '';
    (items || []).forEach(function (item) {
      var li = document.createElement('li');
      li.textContent = item;
      ul.appendChild(li);
    });
  }

  function refreshPresetOptionLabels() {
    var select = document.getElementById('preset-select');
    var options = select.options;
    for (var i = 0; i < options.length; i++) {
      if (options[i].value === '__default__') {
        options[i].textContent = t('settings', 'presetDefault');
      } else {
        var preset = (AlimenCal.presets || []).filter(function (p) {
          return p.meta.id === options[i].value;
        })[0];
        if (preset) {
          options[i].textContent = preset.meta.name;
        }
      }
    }
  }

  function initPresetSelect() {
    var select = document.getElementById('preset-select');
    select.innerHTML = '';

    var optDefault = document.createElement('option');
    optDefault.value = '__default__';
    optDefault.textContent = t('settings', 'presetDefault');
    select.appendChild(optDefault);

    (AlimenCal.presets || []).forEach(function (preset) {
      var opt = document.createElement('option');
      opt.value = preset.meta.id;
      opt.textContent = preset.meta.name;
      select.appendChild(opt);
    });

    var stored = null;
    try { stored = localStorage.getItem(LS_PRESET); } catch (e) {}

    select.addEventListener('change', function () {
      var id = select.value;
      if (id === '__default__') {
        state.cfg = clone(AlimenCal.config);
        saveCfg(state.cfg);
        try { localStorage.removeItem(LS_PRESET); } catch (e) {}
        fillCfgForm();
        renderPresetMeta(null);
        document.getElementById('cfg-status').textContent = t('settings', 'presetReset');
        return;
      }
      var preset = (AlimenCal.presets || []).filter(function (p) {
        return p.meta.id === id;
      })[0];
      if (preset) {
        applyPreset(preset);
        document.getElementById('cfg-status').textContent =
          t('settings', 'presetApplied') + ': ' + preset.meta.name;
      }
    });

    if (stored && stored !== '__default__') {
      var preset = (AlimenCal.presets || []).filter(function (p) {
        return p.meta.id === stored;
      })[0];
      if (preset) {
        select.value = stored;
        applyPreset(preset, false);
      } else {
        select.value = '__default__';
        renderPresetMeta(null);
      }
    } else {
      select.value = '__default__';
      renderPresetMeta(null);
    }
  }

  function applyI18n() {
    var dict = AlimenCal.i18n[state.lang] || AlimenCal.i18n[DEFAULT_LANG];
    document.documentElement.lang = dict.htmlLang;
    document.title = t('title');
    document.getElementById('app-title').textContent = 'AlimenCal';
    document.getElementById('app-subtitle').textContent = t('subtitle');
    document.getElementById('disclaimer').textContent = t('disclaimerShort');

    document.querySelector('.tab[data-tab="children"]').textContent = t('nav', 'children');
    document.querySelector('.tab[data-tab="spousal"]').textContent = t('nav', 'spousal');
    document.querySelector('.tab[data-tab="costsplit"]').textContent = t('nav', 'costsplit');
    document.querySelector('.tab[data-tab="settings"]').textContent = t('nav', 'settings');
    document.querySelector('.tab[data-tab="about"]').textContent = t('nav', 'about');

    var ownerSelect = document.getElementById('costsplit-owner');
    var ownerVal = ownerSelect.value;
    ownerSelect.innerHTML = '';
    [{ v: 'A', label: t('common', 'parentA') }, { v: 'B', label: t('common', 'parentB') }].forEach(function (o) {
      var opt = document.createElement('option');
      opt.value = o.v;
      opt.textContent = o.label;
      ownerSelect.appendChild(opt);
    });
    ownerSelect.value = ownerVal || 'A';

    document.getElementById('costsplit-heading').textContent = t('costsplit', 'heading');
    document.getElementById('costsplit-intro').textContent = t('costsplit', 'intro');
    document.getElementById('costsplit-date-label').textContent = t('costsplit', 'dateLabel');
    document.getElementById('costsplit-owner-label').textContent = t('costsplit', 'accountOwner');
    document.getElementById('costsplit-upload-label').textContent = t('costsplit', 'uploadLabel');
    document.getElementById('costsplit-upload-hint').textContent = t('costsplit', 'uploadHint');
    document.getElementById('costsplit-set-all-split').textContent = t('costsplit', 'setAllSplit');
    document.getElementById('costsplit-set-all-ignore').textContent = t('costsplit', 'setAllIgnore');
    document.getElementById('costsplit-result-heading').textContent = t('costsplit', 'resultHeading');
    if (state.costsplit.transactions.length) {
      renderCostsplitTable();
    }

    document.getElementById('children-heading').textContent = t('children', 'heading');
    document.getElementById('children-intro').textContent = t('children', 'intro');
    document.getElementById('pa-legend').textContent = t('common', 'parentA');
    document.getElementById('pb-legend').textContent = t('common', 'parentB');
    document.getElementById('add-child').textContent = '+' + ' ' + t('common', 'addChild');
    document.getElementById('calc-children').textContent = t('common', 'calculate');
    document.getElementById('reset-children').textContent = t('common', 'reset');
    document.getElementById('children-result-heading').textContent = t('children', 'resultsHeading');
    document.getElementById('children-care-hint').textContent = t('children', 'careHint');

    document.getElementById('spousal-heading').textContent = t('spousal', 'heading');
    document.getElementById('spousal-intro').textContent = t('spousal', 'intro');
    document.getElementById('spousal-enable-label').textContent = t('spousal', 'enable');
    document.getElementById('applicant-legend').textContent = t('spousal', 'bedarf');
    document.getElementById('respondent-legend').textContent = t('spousal', 'capacity');
    document.getElementById('calc-spousal').textContent = t('common', 'calculate');
    document.getElementById('spousal-result-heading').textContent = t('spousal', 'resultsHeading');

    document.getElementById('settings-heading').textContent = t('settings', 'heading');
    document.getElementById('settings-intro').textContent = t('settings', 'intro');
    document.getElementById('cfg-table-legend').textContent = t('settings', 'childNeedTable');
    document.getElementById('cfg-add-row').textContent = t('settings', 'addRow');
    document.getElementById('cfg-save').textContent = t('settings', 'save');
    document.getElementById('cfg-restore').textContent = t('settings', 'restoreDefaults');
    document.getElementById('cfg-export').textContent = t('settings', 'exportJson');
    document.getElementById('cfg-import-label').textContent = t('settings', 'importJson');
    document.getElementById('preset-label').textContent = t('settings', 'preset');
    document.getElementById('preset-notes-heading').textContent = t('settings', 'presetNotes');
    document.getElementById('preset-verification-heading').textContent = t('settings', 'presetVerification');
    refreshPresetOptionLabels();

    document.getElementById('about-heading').textContent = t('about', 'heading');
    document.getElementById('about-body1').textContent = t('about', 'body1');
    document.getElementById('about-body2').textContent = t('about', 'body2');
    document.getElementById('about-body3').textContent = t('about', 'body3');

    var nodes = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < nodes.length; i++) {
      var path = nodes[i].getAttribute('data-i18n').split('.');
      nodes[i].textContent = t.apply(null, path);
    }

    renderChildrenList();
  }

  /* ------------------------------------------------------------- */

  function childTemplate() {
    return {
      age: 8,
      ownIncome: 0,
      childAllowance: 0,
      kkPremium: 0,
      externalCareCosts: 0,
      careShareParentA: 0,
      careShareParentB: 100
    };
  }

  function addChildRow() {
    state.children.push(childTemplate());
    renderChildrenList();
  }

  function removeChildRow(idx) {
    state.children.splice(idx, 1);
    renderChildrenList();
  }

  function collectChildrenInputs() {
    var rows = document.querySelectorAll('#children-list .child-row');
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      state.children[i].age = parseInt(row.querySelector('.f-age').value, 10) || 0;
      state.children[i].ownIncome = parseFloat(row.querySelector('.f-own').value) || 0;
      state.children[i].childAllowance = parseFloat(row.querySelector('.f-allow').value) || 0;
      state.children[i].kkPremium = parseFloat(row.querySelector('.f-kk').value) || 0;
      state.children[i].externalCareCosts = parseFloat(row.querySelector('.f-care').value) || 0;
      state.children[i].careShareParentA = (parseFloat(row.querySelector('.f-shareA').value) || 0) / 100;
      state.children[i].careShareParentB = (parseFloat(row.querySelector('.f-shareB').value) || 0) / 100;
    }
  }

  function renderChildrenList() {
    var host = document.getElementById('children-list');
    host.innerHTML = '';
    if (!state.children.length) {
      return;
    }
    for (var i = 0; i < state.children.length; i++) {
      host.appendChild(buildChildRow(i, state.children[i]));
    }
  }

  function inp(cls, val, opts) {
    var input = document.createElement('input');
    input.type = 'number';
    input.className = cls;
    input.value = val;
    input.min = '0';
    return input;
  }

  function field(labelText, control) {
    var label = document.createElement('label');
    var span = document.createElement('span');
    span.textContent = labelText;
    label.appendChild(span);
    label.appendChild(control);
    return label;
  }

  function buildChildRow(idx, child) {
    var row = document.createElement('div');
    row.className = 'child-row';

    var head = document.createElement('div');
    head.className = 'child-head';
    var title = document.createElement('span');
    title.textContent = t('children', 'childLabel').replace('{n}', String(idx + 1));
    head.appendChild(title);

    var removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'danger';
    removeBtn.textContent = t('common', 'removeChild');
    removeBtn.addEventListener('click', (function (i) {
      return function () { removeChildRow(i); };
    })(idx));
    head.appendChild(removeBtn);
    row.appendChild(head);

    var grid = document.createElement('div');
    grid.className = 'child-grid';

    grid.appendChild(field(t('common', 'age'), inp('f-age', child.age)));
    grid.appendChild(field(t('common', 'ownIncome'), inp('f-own', child.ownIncome)));
    grid.appendChild(field(t('common', 'childAllowance'), inp('f-allow', child.childAllowance)));
    grid.appendChild(field(t('common', 'kkPremium'), inp('f-kk', child.kkPremium)));
    grid.appendChild(field(t('common', 'externalCareCosts'), inp('f-care', child.externalCareCosts)));

    var shareWrap = document.createElement('div');
    shareWrap.appendChild(field(t('children', 'careShareA'), inp('f-shareA', Math.round(child.careShareParentA * 100))));
    shareWrap.appendChild(field(t('children', 'careShareB'), inp('f-shareB', Math.round(child.careShareParentB * 100))));
    grid.appendChild(shareWrap);

    row.appendChild(grid);
    return row;
  }

  /* ------------------------------------------------------------- */

  function calculateChildren() {
    collectChildrenInputs();

    var input = {
      parents: {
        a: {
          income: parseFloat(document.getElementById('pa-income').value) || 0,
          existenzminimum: parseFloat(document.getElementById('pa-em').value),
          employed: document.getElementById('pa-employed').checked
        },
        b: {
          income: parseFloat(document.getElementById('pb-income').value) || 0,
          existenzminimum: parseFloat(document.getElementById('pb-em').value),
          employed: document.getElementById('pb-employed').checked
        }
      },
      children: state.children
    };

    var result = AlimenCal.calculator.calculateChildSupport(input, state.cfg);
    renderChildrenResult(result);
  }

  function renderChildrenResult(result) {
    var box = document.getElementById('children-result');
    box.hidden = false;

    var thead = document.getElementById('children-thead');
    thead.innerHTML = '';
    var trh = document.createElement('tr');
    [
      t('children', 'tableChild'),
      t('children', 'tableBasicNeed'),
      t('children', 'tableDirect'),
      t('children', 'tableChildIncome'),
      t('children', 'tableBarTotal'),
      t('children', 'tableBarA'),
      t('children', 'tableBarB'),
      t('children', 'tableManko'),
      t('children', 'tableCareNet'),
      t('children', 'tableTotalA'),
      t('children', 'tableTotalB')
    ].forEach(function (h) {
      var th = document.createElement('th');
      th.textContent = h;
      trh.appendChild(th);
    });
    thead.appendChild(trh);

    var tbody = document.getElementById('children-tbody');
    tbody.innerHTML = '';
    result.perChild.forEach(function (c) {
      var tr = document.createElement('tr');
      [
        t('children', 'childLabel').replace('{n}', String(c.index + 1)) + ' (' + c.age + ')',
        fmt(c.basicNeed),
        fmt(c.directCosts),
        fmt(c.childIncome),
        fmt(c.barTotal),
        fmt(c.barFromA),
        fmt(c.barFromB),
        c.barManko > 0 ? fmt(c.barManko) : '–',
        (c.careNetFromAToB > 0 ? fmt(c.careNetFromAToB) + ' A→B' : '') +
          (c.careNetFromBToA > 0 ? fmt(c.careNetFromBToA) + ' B→A' : '') || '–',
        fmt(c.totalFromA),
        fmt(c.totalFromB)
      ].forEach(function (v) {
        var td = document.createElement('td');
        td.textContent = v;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });

    var totals = result.totals;
    document.getElementById('children-totals').textContent =
      t('children', 'totalA') + ': CHF ' + fmt(totals.totalA) + ' | ' +
      t('children', 'totalB') + ': CHF ' + fmt(totals.totalB);

    var mankoEl = document.getElementById('children-manko');
    if (result.mangellage) {
      mankoEl.textContent = t('children', 'mangellage') + ' (' +
        t('children', 'totalManko') + ': CHF ' + fmt(totals.totalManko) + ')';
      mankoEl.hidden = false;
    } else {
      mankoEl.hidden = true;
    }
  }

  /* ------------------------------------------------------------- */

  function calculateSpousal() {
    var input = {
      enabled: true,
      applicant: {
        income: parseFloat(document.getElementById('sp-app-income').value) || 0,
        existenzminimum: parseFloat(document.getElementById('sp-app-em').value),
        targetStandard: parseFloat(document.getElementById('sp-app-standard').value),
        extraCosts: parseFloat(document.getElementById('sp-app-extra').value) || 0,
        employed: true
      },
      respondent: {
        income: parseFloat(document.getElementById('sp-res-income').value) || 0,
        existenzminimum: parseFloat(document.getElementById('sp-res-em').value),
        employed: true
      },
      childSupportPaidByRespondent: parseFloat(document.getElementById('sp-res-childpaid').value) || 0
    };

    var result = AlimenCal.calculator.calculateSpousalSupport(input, state.cfg);
    renderSpousalResult(result);
  }

  function renderSpousalResult(result) {
    document.getElementById('spousal-result').hidden = false;
    document.getElementById('spousal-support').textContent =
      t('spousal', 'support') + ': CHF ' + fmt(result.support) + ' / ' + t('common', 'perMonth');
    document.getElementById('spousal-method').textContent =
      t('spousal', 'method') + ': ' +
      (result.method === 'surplus' ? t('spousal', 'methodSurplus') : t('spousal', 'methodManko'));
    document.getElementById('spousal-details').textContent =
      t('spousal', 'bedarf') + ': CHF ' + fmt(result.applicant.bedarf) + ' | ' +
      t('spousal', 'capacity') + ': CHF ' + fmt(result.respondent.capacity);

    var mankoEl = document.getElementById('spousal-manko');
    if (result.mangellage && result.mankoBedarf > 0) {
      mankoEl.textContent = t('spousal', 'mankoBedarf') + ': CHF ' + fmt(result.mankoBedarf);
      mankoEl.hidden = false;
    } else {
      mankoEl.hidden = true;
    }
  }

  /* ------------------------------------------------------------- */

  function renderCfgTable() {
    var tbody = document.getElementById('cfg-need-tbody');
    tbody.innerHTML = '';
    var table = state.cfg.childNeedTable;
    for (var i = 0; i < table.length; i++) {
      (function (i) {
        var tr = document.createElement('tr');
        ['fromAge', 'toAge', 'basicNeed', 'careSupport'].forEach(function (key) {
          var td = document.createElement('td');
          var input = document.createElement('input');
          input.type = 'number';
          input.min = '0';
          input.value = table[i][key];
          input.addEventListener('change', function () {
            table[i][key] = parseFloat(input.value) || 0;
          });
          td.appendChild(input);
          tr.appendChild(td);
        });
        var tdBtn = document.createElement('td');
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'danger';
        btn.textContent = t('settings', 'removeRow');
        btn.addEventListener('click', function () {
          state.cfg.childNeedTable.splice(i, 1);
          renderCfgTable();
        });
        tdBtn.appendChild(btn);
        tr.appendChild(tdBtn);
        tbody.appendChild(tr);
      })(i);
    }
  }

  function fillCfgForm() {
    document.getElementById('cfg-em-employed').value = state.cfg.defaultExistenzminimumEmployed;
    document.getElementById('cfg-em-notemployed').value = state.cfg.defaultExistenzminimumNotEmployed;
    document.getElementById('cfg-spousal-standard').value = state.cfg.defaultSpousalStandard;
    document.getElementById('cfg-fallback-child').value = state.cfg.fallbackChildBasicNeed;
    renderCfgTable();
  }

  function collectCfgForm() {
    state.cfg.defaultExistenzminimumEmployed = parseFloat(document.getElementById('cfg-em-employed').value) || 0;
    state.cfg.defaultExistenzminimumNotEmployed = parseFloat(document.getElementById('cfg-em-notemployed').value) || 0;
    state.cfg.defaultSpousalStandard = parseFloat(document.getElementById('cfg-spousal-standard').value) || 0;
    state.cfg.fallbackChildBasicNeed = parseFloat(document.getElementById('cfg-fallback-child').value) || 0;
  }

  /* ------------------------------------------------------------- *
   *  Kostentrennung                                                   *
   * ------------------------------------------------------------- */

  function renderCostsplitTable() {
    var thead = document.getElementById('costsplit-thead');
    var tbody = document.getElementById('costsplit-tbody');
    thead.innerHTML = '';
    tbody.innerHTML = '';

    var trh = document.createElement('tr');
    [
      t('costsplit', 'colDate'),
      t('costsplit', 'colDescription'),
      t('costsplit', 'colAmount'),
      t('costsplit', 'colMode'),
      t('costsplit', 'colShare')
    ].forEach(function (h) {
      var th = document.createElement('th');
      th.textContent = h;
      trh.appendChild(th);
    });
    thead.appendChild(trh);

    var fromDate = document.getElementById('costsplit-date').value || null;

    state.costsplit.transactions.forEach(function (tx) {
      var isBefore = fromDate && tx.date < fromDate;
      var decision = state.costsplit.decisions[tx.id] || { mode: 'ignore' };

      var tr = document.createElement('tr');
      if (isBefore) {
        tr.className = 'muted-row';
      }

      var tdDate = document.createElement('td');
      tdDate.textContent = tx.date;
      tr.appendChild(tdDate);

      var tdDesc = document.createElement('td');
      tdDesc.textContent = tx.description;
      tr.appendChild(tdDesc);

      var tdAmount = document.createElement('td');
      tdAmount.className = 'num';
      tdAmount.textContent = fmt(tx.amount);
      tr.appendChild(tdAmount);

      var tdMode = document.createElement('td');
      var select = document.createElement('select');
      [
        { value: 'ignore', label: t('costsplit', 'modeIgnore') },
        { value: 'split', label: t('costsplit', 'modeSplit') },
        { value: 'partyA', label: t('costsplit', 'modePartyA') },
        { value: 'partyB', label: t('costsplit', 'modePartyB') }
      ].forEach(function (opt) {
        var o = document.createElement('option');
        o.value = opt.value;
        o.textContent = opt.label;
        select.appendChild(o);
      });
      select.value = decision.mode || 'ignore';
      select.addEventListener('change', (function (id) {
        return function () {
          var d = state.costsplit.decisions[id] || { mode: 'ignore', shareA: 0.5 };
          d.mode = select.value;
          state.costsplit.decisions[id] = d;
          renderCostsplitResult();
        };
      })(tx.id));
      tdMode.appendChild(select);
      tr.appendChild(tdMode);

      var tdShare = document.createElement('td');
      var share = document.createElement('input');
      share.type = 'number';
      share.className = 'share-input';
      share.min = '0';
      share.max = '100';
      share.step = '5';
      share.value = Math.round((decision.shareA != null ? decision.shareA : 0.5) * 100);
      share.disabled = decision.mode !== 'split';
      share.addEventListener('input', (function (id) {
        return function () {
          var d = state.costsplit.decisions[id] || { mode: 'split' };
          d.shareA = (parseFloat(share.value) || 0) / 100;
          state.costsplit.decisions[id] = d;
          renderCostsplitResult();
        };
      })(tx.id));
      var pct = document.createElement('span');
      pct.textContent = ' % ' + t('costsplit', 'shareOfA');
      tdShare.appendChild(share);
      tdShare.appendChild(pct);
      tr.appendChild(tdShare);

      tbody.appendChild(tr);
    });

    renderCostsplitResult();
  }

  function renderCostsplitResult() {
    var fromDate = document.getElementById('costsplit-date').value || null;
    var totals = AlimenCal.costsplit.computeSplit(
      state.costsplit.transactions,
      state.costsplit.decisions,
      fromDate
    );

    document.getElementById('costsplit-totals').textContent =
      t('common', 'parentA') + ': CHF ' + fmt(totals.sumA) + ' | ' +
      t('common', 'parentB') + ': CHF ' + fmt(totals.sumB) + ' | ' +
      t('costsplit', 'totalConsidered') + ': CHF ' + fmt(totals.total);

    var ownerIsA = document.getElementById('costsplit-owner').value !== 'B';
    var settlement = AlimenCal.costsplit.computeSettlement(totals, ownerIsA);
    document.getElementById('costsplit-balance').textContent =
      settlement.amount > 0 && settlement.from && settlement.to
        ? t('costsplit', 'owes', [
            settlement.from === 'A' ? t('common', 'parentA') : t('common', 'parentB'),
            settlement.to === 'A' ? t('common', 'parentA') : t('common', 'parentB'),
            fmt(settlement.amount)
          ])
        : t('costsplit', 'balanced');

    document.getElementById('costsplit-counts').textContent =
      t('costsplit', 'counts', [String(totals.countConsidered), String(totals.countIgnored), String(totals.countBeforeDate)]);
  }

  function handleCostsplitFile(file) {
    var reader = new FileReader();
    reader.onload = function () {
      var parsed = AlimenCal.costsplit.parseBankCsv(reader.result);
      if (!parsed.transactions.length) {
        var err = document.getElementById('costsplit-error');
        err.textContent = t('costsplit', 'parseError');
        err.hidden = false;
        return;
      }
      document.getElementById('costsplit-error').hidden = true;
      state.costsplit.transactions = parsed.transactions;
      state.costsplit.decisions = {};
      document.getElementById('costsplit-section').hidden = false;
      renderCostsplitTable();
    };
    reader.readAsText(file);
  }

  /* ------------------------------------------------------------- */

  function switchTab(name) {
    var tabs = document.querySelectorAll('.tab');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].classList.toggle('active', tabs[i].getAttribute('data-tab') === name);
    }
    var panels = document.querySelectorAll('.tabpanel');
    for (var j = 0; j < panels.length; j++) {
      panels[j].classList.toggle('active', panels[j].id === 'tab-' + name);
    }
  }

  function init() {
    state.lang = getLang();
    state.cfg = getCfg();
    document.getElementById('lang-select').value = state.lang;

    applyI18n();
    initPresetSelect();
    fillCfgForm();
    addChildRow();

    document.getElementById('lang-select').addEventListener('change', function () {
      state.lang = this.value;
      try { localStorage.setItem(LS_LANG, state.lang); } catch (e) {}
      applyI18n();
    });

    var tabs = document.querySelectorAll('.tab');
    for (var i = 0; i < tabs.length; i++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          switchTab(btn.getAttribute('data-tab'));
        });
      })(tabs[i]);
    }

    document.getElementById('add-child').addEventListener('click', addChildRow);
    document.getElementById('calc-children').addEventListener('click', calculateChildren);
    document.getElementById('reset-children').addEventListener('click', function () {
      state.children = [];
      renderChildrenList();
      document.getElementById('children-result').hidden = true;
    });

    document.getElementById('spousal-enabled').addEventListener('change', function () {
      document.getElementById('spousal-fields').style.display = this.checked ? '' : 'none';
    });
    document.getElementById('calc-spousal').addEventListener('click', calculateSpousal);

    document.getElementById('cfg-save').addEventListener('click', function () {
      collectCfgForm();
      saveCfg(state.cfg);
      document.getElementById('cfg-status').textContent = t('settings', 'saved');
    });
    document.getElementById('cfg-restore').addEventListener('click', function () {
      state.cfg = clone(AlimenCal.config);
      saveCfg(state.cfg);
      try { localStorage.removeItem(LS_PRESET); } catch (e) {}
      document.getElementById('preset-select').value = '__default__';
      renderPresetMeta(null);
      fillCfgForm();
      document.getElementById('cfg-status').textContent = t('settings', 'saved');
    });
    document.getElementById('cfg-add-row').addEventListener('click', function () {
      state.cfg.childNeedTable.push({ fromAge: 0, toAge: 6, basicNeed: 500, careSupport: 1100 });
      renderCfgTable();
    });
    document.getElementById('cfg-export').addEventListener('click', function () {
      collectCfgForm();
      var blob = new Blob([JSON.stringify(state.cfg, null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'alimencal-config.json';
      a.click();
      URL.revokeObjectURL(a.href);
    });
    document.getElementById('costsplit-file').addEventListener('change', function () {
      var file = this.files && this.files[0];
      if (file) { handleCostsplitFile(file); }
      this.value = '';
    });
    document.getElementById('costsplit-owner').addEventListener('change', function () {
      if (state.costsplit.transactions.length) {
        renderCostsplitTable();
      }
    });
    document.getElementById('costsplit-date').addEventListener('change', function () {
      if (state.costsplit.transactions.length) {
        renderCostsplitTable();
      }
    });
    document.getElementById('costsplit-set-all-split').addEventListener('click', function () {
      state.costsplit.transactions.forEach(function (tx) {
        state.costsplit.decisions[tx.id] = { mode: 'split', shareA: 0.5 };
      });
      renderCostsplitTable();
    });
    document.getElementById('costsplit-set-all-ignore').addEventListener('click', function () {
      state.costsplit.transactions.forEach(function (tx) {
        state.costsplit.decisions[tx.id] = { mode: 'ignore', shareA: 0.5 };
      });
      renderCostsplitTable();
    });

    document.getElementById('cfg-import').addEventListener('change', function () {
      var file = this.files && this.files[0];
      if (!file) { return; }
      var reader = new FileReader();
      var self = this;
      reader.onload = function () {
        try {
          var parsed = JSON.parse(reader.result);
          var base = clone(AlimenCal.config);
          for (var k in parsed) {
            if (Object.prototype.hasOwnProperty.call(parsed, k)) {
              base[k] = parsed[k];
            }
          }
          state.cfg = base;
          saveCfg(state.cfg);
          fillCfgForm();
          document.getElementById('cfg-status').textContent = t('settings', 'saved');
        } catch (e) {
          document.getElementById('cfg-status').textContent = t('settings', 'importError');
        }
      };
      reader.readAsText(file);
      self.value = '';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
