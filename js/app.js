/* AlimenCal – UI-Logik (Tabs, i18n, dynamische Formulare, Berechnung) */
(function () {
  'use strict';

  var LS_LANG = 'alimencal.lang';
  var LS_CFG = 'alimencal.config';
  var LS_PRESET = 'alimencal.preset';
  var LS_FORM = 'alimencal.form';
  var LS_THEME = 'alimencal.theme';
  var LS_THEME_VALUES = 'alimencal.themevalues';
  var FORM_FIELD_IDS = [
    'pa-income', 'pa-em', 'pa-employed', 'pb-income', 'pb-em', 'pb-employed',
    'spousal-enabled', 'sp-app-income', 'sp-app-em', 'sp-app-standard',
    'sp-app-extra', 'sp-res-income', 'sp-res-em', 'sp-res-childpaid',
    'costsplit-date', 'costsplit-owner'
  ];
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

    document.querySelectorAll('.tab[data-tab="children"]').forEach(function (el) { el.textContent = t('nav', 'children'); });
    document.querySelectorAll('.tab[data-tab="spousal"]').forEach(function (el) { el.textContent = t('nav', 'spousal'); });
    document.querySelectorAll('.tab[data-tab="costsplit"]').forEach(function (el) { el.textContent = t('nav', 'costsplit'); });
    document.querySelectorAll('.tab[data-tab="themes"]').forEach(function (el) { el.textContent = t('nav', 'themes'); });
    document.querySelectorAll('.tab[data-tab="share"]').forEach(function (el) { el.textContent = t('nav', 'share'); });
    document.querySelectorAll('.tab[data-tab="settings"]').forEach(function (el) { el.textContent = t('nav', 'settings'); });
    document.querySelectorAll('.tab[data-tab="about"]').forEach(function (el) { el.textContent = t('nav', 'about'); });

    var settingsBtn = document.getElementById('settings-btn');
    settingsBtn.title = t('nav', 'settingsMenu');
    settingsBtn.setAttribute('aria-label', t('nav', 'settingsMenu'));
    if (!settingsBtn.innerHTML) {
      settingsBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zm7.4-2.5c.04-.33.06-.66.06-1s-.02-.67-.06-1l2.1-1.65a.5.5 0 0 0 .12-.64l-2-3.46a.5.5 0 0 0-.6-.22l-2.5 1a7.3 7.3 0 0 0-1.73-1l-.38-2.65A.5.5 0 0 0 13.9 2h-4a.5.5 0 0 0-.5.42l-.38 2.65c-.63.26-1.2.6-1.73 1l-2.5-1a.5.5 0 0 0-.6.22l-2 3.46a.5.5 0 0 0 .12.64L4.4 11a7.6 7.6 0 0 0 0 2l-2.1 1.65a.5.5 0 0 0-.12.64l2 3.46c.13.22.4.31.6.22l2.5-1c.53.4 1.1.74 1.73 1l.38 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.38-2.65c.63-.26 1.2-.6 1.73-1l2.5 1c.2.09.47 0 .6-.22l2-3.46a.5.5 0 0 0-.12-.64L19.4 13z"/></svg>';
    }

    var ownerSelect = document.getElementById('costsplit-owner');
    var ownerVal = ownerSelect.value;
    ownerSelect.innerHTML = '';
    [{ v: 'A', label: t('costsplit', 'partyA') }, { v: 'B', label: t('costsplit', 'partyB') }].forEach(function (o) {
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

    document.getElementById('share-heading').textContent = t('share', 'heading');
    document.getElementById('share-intro').textContent = t('share', 'intro');
    document.getElementById('share-export-heading').textContent = t('share', 'exportHeading');
    document.getElementById('share-export-hint').textContent = t('share', 'exportHint');
    document.getElementById('share-export').textContent = t('share', 'exportButton');
    document.getElementById('share-import-heading').textContent = t('share', 'importHeading');
    document.getElementById('share-import-hint').textContent = t('share', 'importHint');
    document.getElementById('share-import-label').textContent = t('share', 'importLabel');
    renderShareSectionCheckboxes();
    document.getElementById('themes-heading').textContent = t('themes', 'heading');
    document.getElementById('themes-intro').textContent = t('themes', 'intro');
    document.getElementById('theme-select-label').textContent = t('themes', 'select');
    document.getElementById('theme-editor-heading').textContent = t('themes', 'editorHeading');
    document.getElementById('theme-editor-hint').textContent = t('themes', 'editorHint');
    document.getElementById('theme-reset').textContent = t('themes', 'reset');
    renderThemeEditor();
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
      costMode: 'pauschal',
      effectiveCosts: 0,
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
      state.children[i].costMode = row.querySelector('.f-mode').value === 'effective' ? 'effective' : 'pauschal';
      var effEl = row.querySelector('.f-eff');
      state.children[i].effectiveCosts = effEl ? (parseFloat(effEl.value) || 0) : 0;
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

  function modeSelect(cls, value, idx) {
    var select = document.createElement('select');
    select.className = cls;
    [
      { value: 'pauschal', label: t('children', 'modePauschal') },
      { value: 'effective', label: t('children', 'modeEffective') }
    ].forEach(function (o) {
      var opt = document.createElement('option');
      opt.value = o.value;
      opt.textContent = o.label;
      select.appendChild(opt);
    });
    select.value = value === 'effective' ? 'effective' : 'pauschal';
    select.addEventListener('change', function () {
      state.children[idx].costMode = select.value === 'effective' ? 'effective' : 'pauschal';
      renderChildrenList();
      saveForm();
    });
    return select;
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

    var mode = child.costMode === 'effective' ? 'effective' : 'pauschal';

    var grid = document.createElement('div');
    grid.className = 'child-grid';

    grid.appendChild(field(t('children', 'costMode'), modeSelect('f-mode', mode, idx)));
    if (mode === 'effective') {
      grid.appendChild(field(t('children', 'effectiveCosts'), inp('f-eff', child.effectiveCosts)));
    }
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
        t('children', 'childLabel').replace('{n}', String(c.index + 1)) + ' (' + c.age + ')' +
          (c.costMode === 'effective' ? ' [' + t('children', 'modeEffectiveShort') + ' ' + fmt(c.effectiveCosts) + ']' : ''),
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
      t('costsplit', 'partyA') + ': CHF ' + fmt(totals.sumA) + ' | ' +
      t('costsplit', 'partyB') + ': CHF ' + fmt(totals.sumB) + ' | ' +
      t('costsplit', 'totalConsidered') + ': CHF ' + fmt(totals.total);

    var ownerIsA = document.getElementById('costsplit-owner').value !== 'B';
    var settlement = AlimenCal.costsplit.computeSettlement(totals, ownerIsA);
    document.getElementById('costsplit-balance').textContent =
      settlement.amount > 0 && settlement.from && settlement.to
        ? t('costsplit', 'owes', [
            settlement.from === 'A' ? t('costsplit', 'partyA') : t('costsplit', 'partyB'),
            settlement.to === 'A' ? t('costsplit', 'partyA') : t('costsplit', 'partyB'),
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

  /* ------------------------------------------------------------- *
   *  Themes: Auswahl vordefinierter Designs und manueller Editor.
   * ------------------------------------------------------------- */
  function getPresetById(id) {
    return (AlimenCal.themes.PRESETS || []).filter(function (p) { return p.id === id; })[0] || null;
  }

  function getThemeId() {
    var stored = null;
    try { stored = localStorage.getItem(LS_THEME); } catch (e) {}
    return stored || 'classic';
  }

  function saveTheme(id, values) {
    try {
      localStorage.setItem(LS_THEME, id);
      if (values) {
        localStorage.setItem(LS_THEME_VALUES, JSON.stringify(values));
      } else {
        localStorage.removeItem(LS_THEME_VALUES);
      }
    } catch (e) {}
  }

  function applyTheme(id, values) {
    var preset = getPresetById(id);
    var vals = values || (preset ? preset.values : AlimenCal.themes.PRESETS[0].values);
    AlimenCal.themes.applyToDocument(vals);
  }

  function currentThemeValues() {
    var raw = null;
    try { raw = localStorage.getItem(LS_THEME_VALUES); } catch (e) {}
    if (raw) {
      try { return JSON.parse(raw); } catch (e) {}
    }
    var preset = getPresetById(getThemeId()) || AlimenCal.themes.PRESETS[0];
    return preset.values;
  }

  function initThemeSelect() {
    var select = document.getElementById('theme-select');
    select.innerHTML = '';
    var customOption = document.createElement('option');
    customOption.value = '__custom__';
    customOption.textContent = t('themes', 'custom');
    select.appendChild(customOption);
    AlimenCal.themes.PRESETS.forEach(function (preset) {
      var opt = document.createElement('option');
      opt.value = preset.id;
      opt.textContent = preset.name;
      select.appendChild(opt);
    });
    var valuesRaw = null;
    try { valuesRaw = localStorage.getItem(LS_THEME_VALUES); } catch (e) {}
    select.value = valuesRaw ? '__custom__' : getThemeId();
    select.addEventListener('change', function () {
      var id = select.value;
      var preset = getPresetById(id);
      if (preset) {
        saveTheme(id, null);
        applyTheme(id, preset.values);
      }
      renderThemeEditor();
      document.getElementById('theme-status').textContent = t('themes', 'saved');
    });
    applyTheme(getThemeId(), valuesRaw ? JSON.parse(valuesRaw) : null);
    renderThemeEditor();
  }

  function renderThemeEditor() {
    var grid = document.getElementById('theme-editor-grid');
    if (!grid) { return; }
    grid.innerHTML = '';
    var values = currentThemeValues();
    AlimenCal.themes.TOKENS.forEach(function (token) {
      var label = document.createElement('label');
      label.className = 'theme-field';
      var span = document.createElement('span');
      span.textContent = token.label[state.lang] || token.label.en;
      label.appendChild(span);
      var input;
      if (token.type === 'color') {
        input = document.createElement('input');
        input.type = 'color';
        var hex = values[token.key];
        if (!/^#[0-9a-fA-F]{6}$/.test(hex)) { hex = '#000000'; }
        input.value = hex;
      } else {
        input = document.createElement('input');
        input.type = 'number';
        input.min = '0';
        input.max = '40';
        input.step = '1';
        input.value = values[token.key];
      }
      input.addEventListener('input', (function (key) {
        return function () {
          var v = currentThemeValues();
          v[key] = input.value;
          saveTheme('__custom__', v);
          applyTheme('__custom__', v);
          var select = document.getElementById('theme-select');
          if (select) { select.value = '__custom__'; }
        };
      })(token.key));
      label.appendChild(input);
      grid.appendChild(label);
    });
  }

  /* ------------------------------------------------------------- *
   *  Austausch zwischen den Parteien (Export/Import, Merge).
   * ------------------------------------------------------------- */
  var SHARE_SECTION_KEYS = [
    { key: 'parentA', labelKey: 'sectionParentA' },
    { key: 'parentB', labelKey: 'sectionParentB' },
    { key: 'children', labelKey: 'sectionChildren' },
    { key: 'spousalApplicant', labelKey: 'sectionSpousalApplicant' },
    { key: 'spousalRespondent', labelKey: 'sectionSpousalRespondent' },
    { key: 'spousalEnabled', labelKey: 'sectionSpousalEnabled' },
    { key: 'costsplit', labelKey: 'sectionCostsplit' }
  ];

  function collectCurrentSections() {
    collectChildrenInputs();
    return {
      parentA: {
        income: parseFloat(document.getElementById('pa-income').value) || 0,
        existenzminimum: document.getElementById('pa-em').value,
        employed: document.getElementById('pa-employed').checked
      },
      parentB: {
        income: parseFloat(document.getElementById('pb-income').value) || 0,
        existenzminimum: document.getElementById('pb-em').value,
        employed: document.getElementById('pb-employed').checked
      },
      children: state.children,
      spousalApplicant: {
        income: parseFloat(document.getElementById('sp-app-income').value) || 0,
        existenzminimum: document.getElementById('sp-app-em').value,
        targetStandard: parseFloat(document.getElementById('sp-app-standard').value) || 0,
        extraCosts: parseFloat(document.getElementById('sp-app-extra').value) || 0
      },
      spousalRespondent: {
        income: parseFloat(document.getElementById('sp-res-income').value) || 0,
        existenzminimum: document.getElementById('sp-res-em').value,
        childSupportPaid: parseFloat(document.getElementById('sp-res-childpaid').value) || 0
      },
      spousalEnabled: document.getElementById('spousal-enabled').checked,
      costsplit: state.costsplit
    };
  }

  function renderShareSectionCheckboxes() {
    var host = document.getElementById('share-export-checkboxes');
    if (!host) { return; }
    host.innerHTML = '';
    SHARE_SECTION_KEYS.forEach(function (section) {
      var wrap = document.createElement('label');
      wrap.className = 'checkbox';
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = section.key;
      cb.checked = section.key === 'parentA' || section.key === 'parentB';
      var span = document.createElement('span');
      span.textContent = t('share', section.labelKey);
      wrap.appendChild(cb);
      wrap.appendChild(span);
      host.appendChild(wrap);
    });
  }

  function doShareExport() {
    var checked = Array.prototype.slice.call(
      document.querySelectorAll('#share-export-checkboxes input:checked')
    ).map(function (el) { return el.value; });
    var current = collectCurrentSections();
    var sections = {};
    checked.forEach(function (key) { sections[key] = current[key]; });
    var file = AlimenCal.casedata.buildFile(sections);
    var blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'alimencal-case.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function applySectionsToForm(sections) {
    if (sections.parentA) {
      document.getElementById('pa-income').value = sections.parentA.income;
      document.getElementById('pa-em').value = sections.parentA.existenzminimum;
      document.getElementById('pa-employed').checked = sections.parentA.employed;
    }
    if (sections.parentB) {
      document.getElementById('pb-income').value = sections.parentB.income;
      document.getElementById('pb-em').value = sections.parentB.existenzminimum;
      document.getElementById('pb-employed').checked = sections.parentB.employed;
    }
    if (sections.children) {
      state.children = sections.children;
      renderChildrenList();
    }
    if (sections.spousalApplicant) {
      document.getElementById('sp-app-income').value = sections.spousalApplicant.income;
      document.getElementById('sp-app-em').value = sections.spousalApplicant.existenzminimum;
      document.getElementById('sp-app-standard').value = sections.spousalApplicant.targetStandard;
      document.getElementById('sp-app-extra').value = sections.spousalApplicant.extraCosts;
    }
    if (sections.spousalRespondent) {
      document.getElementById('sp-res-income').value = sections.spousalRespondent.income;
      document.getElementById('sp-res-em').value = sections.spousalRespondent.existenzminimum;
      document.getElementById('sp-res-childpaid').value = sections.spousalRespondent.childSupportPaid;
    }
    if (Object.prototype.hasOwnProperty.call(sections, 'spousalEnabled')) {
      document.getElementById('spousal-enabled').checked = sections.spousalEnabled;
      document.getElementById('spousal-fields').style.display = sections.spousalEnabled ? '' : 'none';
    }
    if (sections.costsplit) {
      state.costsplit = sections.costsplit;
      document.getElementById('costsplit-section').hidden = !sections.costsplit.transactions.length;
      renderCostsplitTable();
    }
    saveForm();
  }

  function handleShareImport(file) {
    var reader = new FileReader();
    reader.onload = function () {
      var raw;
      try { raw = JSON.parse(reader.result); } catch (e) { raw = null; }
      var result = raw ? AlimenCal.casedata.sanitizeCase(raw) : null;
      var status = document.getElementById('share-import-status');
      if (!result || !result.valid) {
        status.textContent = t('share', 'importInvalid');
        return;
      }
      applySectionsToForm(result.sections);
      var partial = result.invalid.length
        ? t('share', 'importPartial', [result.invalid.join(', ')])
        : '';
      status.textContent = t('share', 'importOk', [
        String(Object.keys(result.sections).length), partial
      ]);
    };
    reader.readAsText(file);
  }

  /* ------------------------------------------------------------- *
   *  Automatische Persistenz aller Eingaben (localStorage):
   *  Formularfelder, Kinderliste, Kostentrennung (Transaktionen und
   *  Zuordnungen) werden bei jeder Aenderung und beim Schliessen des
   *  Browsers gespeichert und beim naechsten Start wiederhergestellt.
   * ------------------------------------------------------------- */
  function collectFormState() {
    collectChildrenInputs();
    var form = {};
    FORM_FIELD_IDS.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) { return; }
      if (el.type === 'checkbox') { form[id] = el.checked; }
      else { form[id] = el.value; }
    });
    form.__children = state.children;
    form.__costsplit = state.costsplit;
    return form;
  }

  function saveForm() {
    try { localStorage.setItem(LS_FORM, JSON.stringify(collectFormState())); } catch (e) {}
  }

  function scheduleSaveForm() {
    saveForm();
  }

  function restoreForm() {
    var raw = null;
    try { raw = localStorage.getItem(LS_FORM); } catch (e) {}
    if (!raw) { return; }
    var form;
    try { form = JSON.parse(raw); } catch (e) { return; }
    FORM_FIELD_IDS.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el || !(id in form)) { return; }
      if (el.type === 'checkbox') { el.checked = !!form[id]; }
      else { el.value = form[id]; }
    });
    if (document.getElementById('spousal-enabled').checked) {
      document.getElementById('spousal-fields').style.display = '';
    }
    if (Array.isArray(form.__children) && form.__children.length) {
      state.children = form.__children;
      renderChildrenList();
    }
    if (form.__costsplit && Array.isArray(form.__costsplit.transactions) && form.__costsplit.transactions.length) {
      state.costsplit = form.__costsplit;
      document.getElementById('costsplit-section').hidden = false;
      renderCostsplitTable();
    }
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

    var storedThemeValues = null;
    try { storedThemeValues = JSON.parse(localStorage.getItem(LS_THEME_VALUES) || 'null'); } catch (e) {}
    applyTheme(getThemeId(), storedThemeValues);
    initThemeSelect();
    applyI18n();
    initPresetSelect();
    fillCfgForm();
    addChildRow();
    restoreForm();
    document.addEventListener('input', scheduleSaveForm);
    document.addEventListener('change', scheduleSaveForm);
    document.addEventListener('click', scheduleSaveForm);
    window.addEventListener('beforeunload', saveForm);
    window.addEventListener('pagehide', saveForm);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') { saveForm(); }
    });

    document.getElementById('share-export').addEventListener('click', doShareExport);
    document.getElementById('share-import').addEventListener('change', function () {
      var file = this.files && this.files[0];
      if (file) { handleShareImport(file); }
      this.value = '';
    });
    document.getElementById('theme-reset').addEventListener('click', function () {
      var id = 'classic';
      var preset = getPresetById(id) || AlimenCal.themes.PRESETS[0];
      saveTheme(id, null);
      applyTheme(id, preset.values);
      document.getElementById('theme-select').value = id;
      renderThemeEditor();
      document.getElementById('theme-status').textContent = t('themes', 'saved');
    });
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

    var settingsBtn = document.getElementById('settings-btn');
    var settingsMenu = document.getElementById('settings-menu');
    function closeSettingsMenu() {
      settingsMenu.hidden = true;
      settingsBtn.setAttribute('aria-expanded', 'false');
    }
    settingsBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      settingsMenu.hidden = !settingsMenu.hidden;
      settingsBtn.setAttribute('aria-expanded', String(!settingsMenu.hidden));
    });
    Array.prototype.forEach.call(settingsMenu.querySelectorAll('.tab'), function (btn) {
      btn.addEventListener('click', closeSettingsMenu);
    });
    document.addEventListener('click', function (e) {
      if (!settingsMenu.hidden && !settingsMenu.contains(e.target) && e.target !== settingsBtn) {
        closeSettingsMenu();
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !settingsMenu.hidden) {
        closeSettingsMenu();
      }
    });

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
