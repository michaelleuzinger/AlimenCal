/* AlimenCal – UI-Logik (Tabs, i18n, dynamische Formulare, Berechnung) */
(function () {
  'use strict';

  var LS_LANG = 'alimencal.lang';
  var LS_CFG = 'alimencal.config';
  var LS_PRESET = 'alimencal.preset';
  var LS_FORM = 'alimencal.form';
  var LS_THEME = 'alimencal.theme';
  var LS_THEME_VALUES = 'alimencal.themevalues';
  var LS_BINDING = 'alimencal.binding';
  var LS_KEYS = 'alimencal.keys';
  var LS_BACKUP_META = 'alimencal.backupmeta';
  var FORM_FIELD_IDS = [
    'pa-income', 'pa-em', 'pa-employed', 'pb-income', 'pb-em', 'pb-employed',
    'spousal-enabled', 'sp-app-income', 'sp-app-em', 'sp-app-standard',
    'sp-app-extra', 'sp-res-income', 'sp-res-em', 'sp-res-childpaid',
    'costsplit-date', 'costsplit-owner'
  ];
  var SECTION_FIELDS = {
    parentA: ['pa-income', 'pa-em', 'pa-employed'],
    parentB: ['pb-income', 'pb-em', 'pb-employed'],
    children: [],
    spousalApplicant: ['sp-app-income', 'sp-app-em', 'sp-app-standard', 'sp-app-extra'],
    spousalRespondent: ['sp-res-income', 'sp-res-em', 'sp-res-childpaid'],
    spousalEnabled: ['spousal-enabled'],
    costsplit: ['costsplit-date', 'costsplit-owner']
  };
  var DEFAULT_LANG = 'de';
  var LANGS = ['de', 'fr', 'it', 'en'];

  var state = {
    lang: DEFAULT_LANG,
    cfg: null,
    keys: null,
    sectionLocks: [],
    children: [],
    costsplit: {
      transactions: [],
      decisions: {}
    }
  };

  function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

  /* ---------- Backup-Erinnerung (taeglich / viele Aenderungen) ----------
   *
   * iOS/PWA erlaubt keine Hintergrund-Exports; die App zaehlt daher
   * Datenveraenderungen und speichert den Zeitpunkt des letzten Backups.
   * Beim Oeffnen (und nach jeder Aenderung) prueft renderBackupReminder(),
   * ob das letzte Backup laenger als BACKUP_INTERVAL_MS zurueckliegt oder
   * seitdem viele Aenderungen (>= BACKUP_CHANGES_THRESHOLD) erfolgt sind,
   * und blendet dann ein Banner mit Ein-Tipp-Backup ein.
   */
  function loadBackupMeta() {
    try {
      var raw = localStorage.getItem(LS_BACKUP_META);
      if (!raw) { return null; }
      return AlimenCal.storage.sanitizeBackupMeta(JSON.parse(raw));
    } catch (e) { return null; }
  }

  function saveBackupMeta(meta) {
    try { localStorage.setItem(LS_BACKUP_META, JSON.stringify(meta)); } catch (e) {}
  }

  var backupReminderDismissed = false;
  var lastFormSnapshot = null;

  function bumpBackupChanges() {
    var snapshot = null;
    try { snapshot = localStorage.getItem(LS_FORM); } catch (e) {}
    if (snapshot === null || snapshot === lastFormSnapshot) { return; }
    lastFormSnapshot = snapshot;
    var meta = loadBackupMeta() || { lastAt: null, changes: 0 };
    meta.changes += 1;
    saveBackupMeta(meta);
    renderBackupReminder();
  }

  function backupReminderDue() {
    var meta = loadBackupMeta();
    return meta ? AlimenCal.storage.backupReminderDue(meta) : false;
  }

  function backupReminderText() {
    var meta = loadBackupMeta();
    if (!meta) { return ''; }
    var kind = AlimenCal.storage.backupReminderKind(meta);
    if (!kind) { return ''; }
    var text = t('share', kind === 'many' ? 'backupReminderMany' : 'backupReminderOld');
    if (kind === 'many') {
      return text.replace('{0}', String(meta.changes));
    }
    var days = meta.lastAt ? Math.floor((Date.now() - meta.lastAt) / (24 * 60 * 60 * 1000)) : 0;
    return text.replace('{0}', String(days));
  }

  function renderBackupReminder() {
    var banner = document.getElementById('backup-reminder');
    if (!banner) { return; }
    var due = !backupReminderDismissed && backupReminderDue();
    banner.hidden = !due;
    if (!due) { return; }
    document.getElementById('backup-reminder-text').textContent = backupReminderText();
    document.getElementById('backup-reminder-action').textContent = t('share', 'backupReminderAction');
    document.getElementById('backup-reminder-dismiss').textContent = t('share', 'backupReminderDismiss');
  }

  function markBackupDone() {
    saveBackupMeta({ lastAt: Date.now(), changes: 0 });
    renderBackupReminder();
  }

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

  /* -------------------------------------------------------------
   * Verbindliche Einstellungen (Two-Party-Lock) + Override-Modus.
   * Der SettingsService (js/settings.js) hält Base-Werte, Locks und
   * Overrides; hier wird er mit state.cfg gekoppelt und gerendert.
   * ------------------------------------------------------------- */
  var BINDINGS = [
    { key: 'defaultExistenzminimumEmployed',  labelKey: 'emEmployed',        uiId: 'cfg-em-employed' },
    { key: 'defaultExistenzminimumNotEmployed', labelKey: 'emNotEmployed',   uiId: 'cfg-em-notemployed' },
    { key: 'defaultSpousalStandard',          labelKey: 'spousalDefault',    uiId: 'cfg-spousal-standard' },
    { key: 'fallbackChildBasicNeed',          labelKey: 'fallbackChildBasicNeed', uiId: 'cfg-fallback-child' }
  ];

  function settingsService() {
    if (!state.settingsService) {
      state.settingsService = new AlimenCal.settings.SettingsService();
      initSettingsService(state.settingsService);
    }
    return state.settingsService;
  }

  function initSettingsService(svc) {
    BINDINGS.forEach(function (b) {
      svc.registerSetting('richtwerte', b.key, AlimenCal.config[b.key]);
    });
    try {
      var raw = localStorage.getItem(LS_BINDING);
      if (raw) { restoreBindingState(svc, JSON.parse(raw)); }
    } catch (e) {}
  }

  function restoreBindingState(svc, data) {
    if (!data || !data.settings) { return; }
    BINDINGS.forEach(function (b) {
      var s = data.settings[b.key];
      if (!s) { return; }
      var id = findSettingId(b.key);
      var setting = svc.getSetting(id);
      setting.lockedA = !!s.lockedA;
      setting.lockedB = !!s.lockedB;
      if (typeof s.valueBase === 'number') { setting.valueBase = s.valueBase; }
    });
    svc.chain = Array.isArray(data.chain) ? data.chain : [];
    for (var scenarioId in (data.overrides || {})) {
      var ov = data.overrides[scenarioId];
      if (ov && typeof ov.valueOverride === 'number') {
        svc.createOverride(findSettingId(ov.key), scenarioId, ov.valueOverride, { reason: ov.reason || null });
      }
    }
  }

  function saveBindingState(svc) {
    var data = { settings: {}, overrides: {}, chain: svc.chain || [] };
    BINDINGS.forEach(function (b) {
      var id = findSettingId(b.key);
      var setting = svc.getSetting(id);
      data.settings[b.key] = {
        valueBase: setting.valueBase,
        lockedA: setting.lockedA,
        lockedB: setting.lockedB
      };
    });
    svc.overrides = svc.overrides || {};
    var seen = {};
    for (var oid in svc.overrides) {
      var ov = svc.overrides[oid];
      var setting = svc.getSetting(ov.settingId);
      var key = null;
      BINDINGS.forEach(function (b) {
        if (findSettingId(b.key) === ov.settingId) { key = b.key; }
      });
      if (!key || seen[ov.scenarioId + key]) { continue; }
      seen[ov.scenarioId + key] = true;
      data.overrides[ov.scenarioId] = { key: key, valueOverride: ov.valueOverride, reason: ov.reason || null };
    }
    /* appendChain dichtet Einträge async ab (Web Crypto); das Speichern
     * läuft deshalb einen Microtask später, wenn ausstehende Siegel
     * fertig sind. */
    queueMicrotask(function () {
      Promise.resolve(svc._chainQueue).then(function () {
        data.chain = svc.chain || [];
        try { localStorage.setItem(LS_BINDING, JSON.stringify(data)); } catch (e) {}
      });
    });
  }

  function findSettingId(key) {
    var svc = settingsService();
    for (var id in svc.settings) {
      if (Object.prototype.hasOwnProperty.call(svc.settings, id) && svc.settings[id].key === key) {
        return id;
      }
    }
    return null;
  }

  /* Effektive Config für Berechnungen: Base ⊕ Override des aktiven Szenarios. */
  function effectiveCfg() {
    var cfg = state.cfg;
    var scenarioId = overrideScenarioId();
    if (!scenarioId) { return cfg; }
    var svc = settingsService();
    var eff = clone(cfg);
    BINDINGS.forEach(function (b) {
      var id = findSettingId(b.key);
      eff[b.key] = svc.resolve(id, scenarioId);
    });
    return eff;
  }

  function overrideScenarioId() {
    var el = document.getElementById('binding-override-mode');
    return el && el.checked ? 'ui_override' : null;
  }

  function renderBindingTable() {
    var svc = settingsService();
    var tbody = document.getElementById('binding-tbody');
    if (!tbody) { return; }
    tbody.innerHTML = '';
    var scenarioId = overrideScenarioId();
    BINDINGS.forEach(function (b) {
      var id = findSettingId(b.key);
      var setting = svc.getSetting(id);
      var tr = document.createElement('tr');

      var tdName = document.createElement('td');
      tdName.textContent = t('settings', b.labelKey);
      tr.appendChild(tdName);

      var tdBase = document.createElement('td');
      var base = document.createElement('span');
      base.textContent = fmt(setting.valueBase);
      if (scenarioId && svc.resolveWithContext(id, scenarioId).overridden) {
        base.className = 'hint';
        base.style.textDecoration = 'line-through';
      }
      tdBase.appendChild(base);
      tr.appendChild(tdBase);

      var tdLock = document.createElement('td');
      var lockWrap = document.createElement('span');
      lockWrap.textContent = setting.lockedA ? 'A ✓' : 'A –';
      lockWrap.style.marginRight = '0.75em';
      if (!setting.lockedA) {
        var btnA = document.createElement('button');
        btnA.type = 'button';
        btnA.className = 'secondary';
        btnA.textContent = t('binding', 'confirmA');
        btnA.addEventListener('click', function () { confirmBindingFor(id, 'A'); });
        lockWrap.appendChild(btnA);
      }
      tdLock.appendChild(lockWrap);
      var lockWrapB = document.createElement('span');
      lockWrapB.textContent = setting.lockedB ? 'B ✓' : 'B –';
      if (!setting.lockedB) {
        var btnB = document.createElement('button');
        btnB.type = 'button';
        btnB.className = 'secondary';
        btnB.textContent = t('binding', 'confirmB');
        btnB.addEventListener('click', function () { confirmBindingFor(id, 'B'); });
        lockWrapB.appendChild(btnB);
      }
      tdLock.appendChild(lockWrapB);
      tr.appendChild(tdLock);

      var tdOv = document.createElement('td');
      if (setting.lockedA && setting.lockedB) {
        if (scenarioId) {
          var ctx = svc.resolveWithContext(id, scenarioId);
          var inp = document.createElement('input');
          inp.type = 'number';
          inp.min = '0';
          inp.step = '50';
          inp.value = ctx.effectiveValue;
          inp.addEventListener('change', function () {
            var v = parseFloat(inp.value);
            if (isFinite(v)) {
              svc.createOverride(id, scenarioId, v, { party: 'A' });
              saveBindingState(svc);
              renderBindingTable();
            }
          });
          tdOv.appendChild(inp);
          if (ctx.overridden) {
            var del = document.createElement('button');
            del.type = 'button';
            del.className = 'ghost';
            del.textContent = t('binding', 'removeOverride');
            del.addEventListener('click', function () {
              var ov = svc.findOverride(id, scenarioId);
              if (ov) { svc.deleteOverride(ov.id); }
              saveBindingState(svc);
              renderBindingTable();
            });
            tdOv.appendChild(del);
          }
        } else {
          tdOv.textContent = t('binding', 'enableOverrideHint');
          tdOv.className = 'hint';
        }
      } else {
        tdOv.textContent = t('binding', 'notLocked');
        tdOv.className = 'hint';
      }
      tr.appendChild(tdOv);
      tbody.appendChild(tr);
    });
  }

  function confirmBindingFor(settingId, party) {
    var svc = settingsService();
    try {
      svc.confirmBinding(settingId, party);
      saveBindingState(svc);
      renderBindingTable();
      applyBindingLocksToForm();
      refreshChainStatus();
      setBindingStatus(svc.isLocked(svc.getSetting(settingId)) ? t('binding', 'locked') : t('binding', 'pendingApproval'));
    } catch (e) {
      setBindingStatus(e.message);
    }
  }

  function setBindingStatus(msg) {
    var el = document.getElementById('binding-status');
    if (el) { el.textContent = msg || ''; }
  }

  /* ---- Schlüssel und signierte Lock-Dateien (serverlose Verbindlichkeit) -- */

  function loadKeys() {
    if (state.keys) { return state.keys; }
    try {
      var raw = localStorage.getItem(LS_KEYS);
      if (raw) { state.keys = JSON.parse(raw); return state.keys; }
    } catch (e) {}
    state.keys = { partyA: null, partyB: null };
    return state.keys;
  }

  function saveKeys() {
    try { localStorage.setItem(LS_KEYS, JSON.stringify(state.keys)); } catch (e) {}
  }

  function hasKey(party) {
    var k = loadKeys();
    return !!(k && k['party' + party] && k['party' + party].publicKey);
  }

  function generateKeyFor(party) {
    AlimenCal.settings.generateKeyPair(function (res, err) {
      if (err || !res) {
        setBindingStatus(t('crypto', 'keyGenError'));
        return;
      }
      /* KeyPair-Objekt (CryptoKey) kann nicht serialisiert werden; wir
       * speichern JWK + halten CryptoKey in Memory. PrivateKey-JWK bleibt
       * lokal im Browser (localStorage). */
      loadKeys();
      state.keys['party' + party] = {
        publicKey: res.jwk.publicKey,
        privateKey: res.jwk.privateKey,
        cryptoKey: res.keyPair.privateKey,
        publicCryptoKey: res.keyPair.publicKey
      };
      saveKeys();
      /* cryptoKey/ publicCryptoKey sind nicht serialisierbar -> nach dem
       * Laden aus localStorage reimportieren (siehe importPrivateIfNeeded). */
      delete state.keys['party' + party].cryptoKey;
      delete state.keys['party' + party].publicCryptoKey;
      saveKeys();
      state.keys['party' + party].cryptoKey = res.keyPair.privateKey;
      renderKeyStatus();
      setBindingStatus(t('crypto', 'keyGenerated'));
    });
  }

  function importPrivateIfNeeded(party) {
    var k = loadKeys()['party' + party];
    if (!k || !k.privateKey || k.cryptoKey) { return k ? k.cryptoKey : null; }
    /* Reimport aus JWK (asynchron; einfach zurückgeben, true Synchrontität
     * über generateKeyFor-Pfad; für Signatur wird reimportKey genutzt). */
    return null;
  }

  function reimportPrivateKey(party, callback) {
    var k = loadKeys()['party' + party];
    if (!k || !k.privateKey) { callback(null); return; }
    if (k.cryptoKey) { callback(k.cryptoKey); return; }
    crypto.subtle.importKey('jwk', k.privateKey,
      { name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign']).then(function (ck) {
      k.cryptoKey = ck;
      callback(ck);
    }).catch(function () { callback(null); });
  }

  function exportKeyFor(party) {
    var k = loadKeys()['party' + party];
    if (!k || !k.publicKey) { return; }
    var blob = new Blob([JSON.stringify({
      app: 'alimencal', kind: 'publickey', version: 1, party: party,
      publicKey: k.publicKey
    }, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'alimencal-key-' + (party === 'A' ? 'a' : 'b') + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function importKeyFile(party, file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var parsed = JSON.parse(reader.result);
        if (parsed.app !== 'alimencal' || parsed.kind !== 'publickey' || !parsed.publicKey) {
          throw new Error('format');
        }
        loadKeys();
        var other = party === 'A' ? 'partyB' : 'partyA';
        state.keys[other] = state.keys[other] || {};
        state.keys[other].publicKey = parsed.publicKey;
        state.keys[other].importedParty = parsed.party;
        saveKeys();
        renderKeyStatus();
        setBindingStatus(t('crypto', 'keyImported'));
      } catch (e) {
        setBindingStatus(t('crypto', 'keyImportError'));
      }
    };
    reader.readAsText(file);
  }

  function renderKeyStatus() {
    var elA = document.getElementById('keys-party-a-status');
    var elB = document.getElementById('keys-party-b-status');
    if (!elA) { return; }
    var k = loadKeys();
    elA.textContent = (k.partyA && k.partyA.publicKey) ?
      t('crypto', 'keyPresent') : t('crypto', 'keyMissing');
    elB.textContent = (k.partyB && k.partyB.publicKey) ?
      t('crypto', 'keyPresent') : t('crypto', 'keyMissing');
  }

  /* Gibt das eigene publicKey-JWK für Signaturprüfung zurück: Partei A
   * prüft mit keyA; wir nehmen was vorhanden ist. */
  function publicKeyFor(party) {
    var k = loadKeys();
    var entry = k['party' + party];
    return entry && entry.publicKey ? entry.publicKey : null;
  }

  function doLockfileExport(signParty) {
    var svc = settingsService();
    svc.exportBindingFile(function (file) {
      if (signParty) {
        reimportPrivateKey(signParty, function (ck) {
          if (!ck) { setBindingStatus(t('crypto', 'signNoKey')); return; }
          svc.signBindingFile(file, ck, signParty, function (signed, err) {
            if (err || !signed) { setBindingStatus(err ? err.message : t('crypto', 'signError')); return; }
            /* Signierte Datei im State merken (für weiteren Signatur-Schritt
             * der Gegenseite) und herunterladen. */
            state.lastLockFile = signed;
            downloadLockFile(signed);
            setBindingStatus(t('crypto', 'signed'));
          });
        });
      } else {
        state.lastLockFile = file;
        downloadLockFile(file);
      }
    });
  }

  function downloadLockFile(file) {
    var blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'alimencal-binding.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function doLockfileImport(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var parsed = JSON.parse(reader.result);
        var svc = settingsService();
        var current = svc.buildBindingFile().values;
        svc.verifyBindingFile(parsed, publicKeyFor('A'), publicKeyFor('B'), current, function (result) {
          state.lastLockFile = parsed;
          renderLockfileResult(result);
        });
      } catch (e) {
        setBindingStatus(t('crypto', 'lockfileInvalid'));
      }
    };
    reader.readAsText(file);
  }

  function renderLockfileResult(result) {
    var el = document.getElementById('lockfile-result');
    if (!el) { return; }
    if (!result.formatOk) { el.textContent = t('crypto', 'lockfileInvalid'); return; }
    var parts = [];
    parts.push(result.valueHashOk ? t('crypto', 'hashOk') : t('crypto', 'hashBroken'));
    parts.push(result.sigA ? t('crypto', 'sigOkA') : t('crypto', 'sigMissingA'));
    parts.push(result.sigB ? t('crypto', 'sigOkB') : t('crypto', 'sigMissingB'));
    if (result.matchesCurrent === true) { parts.push(t('crypto', 'matchesCurrent')); }
    if (result.matchesCurrent === false) { parts.push(t('crypto', 'differsCurrent')); }
    el.textContent = parts.join(' | ');
  }

  function refreshChainStatus() {
    var el = document.getElementById('chain-status');
    if (!el) { return; }
    var svc = settingsService();
    /* appendChain siegelt asynchron (Web Crypto); erst wenn die interne
     * Queue abgearbeitet ist, ist die Kette vollständig und prüfbar. */
    var queue = svc._chainQueue || Promise.resolve();
    queue.then(function () {
      svc.verifyChain(function (result) {
        el.textContent = result.valid ?
          t('crypto', 'chainOk') + ' (' + (svc.chain ? svc.chain.length : 0) + ')' :
          t('crypto', 'chainBroken');
      });
    });
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

  function setNavLabel(el, text) {
    var label = el.querySelector('.nav-label');
    if (label) { label.textContent = text; }
    else { el.textContent = text; }
  }

  function applyI18n() {
    var dict = AlimenCal.i18n[state.lang] || AlimenCal.i18n[DEFAULT_LANG];
    document.documentElement.lang = dict.htmlLang;
    document.title = t('title');
    document.getElementById('app-title').textContent = 'AlimenCal';
    document.getElementById('app-subtitle').textContent = t('subtitle');
    document.getElementById('disclaimer').textContent = t('disclaimerShort');

    document.querySelectorAll('.tab[data-tab="children"]').forEach(function (el) { setNavLabel(el, el.classList.contains('mob-item') ? t('nav', 'childrenShort') : t('nav', 'children')); });
    document.querySelectorAll('.tab[data-tab="spousal"]').forEach(function (el) { setNavLabel(el, el.classList.contains('mob-item') ? t('nav', 'spousalShort') : t('nav', 'spousal')); });
    document.querySelectorAll('.tab[data-tab="costsplit"]').forEach(function (el) { setNavLabel(el, el.classList.contains('mob-item') ? t('nav', 'costsplitShort') : t('nav', 'costsplit')); });
    document.querySelectorAll('.tab[data-tab="themes"]').forEach(function (el) { setNavLabel(el, t('nav', 'themes')); });
    document.querySelectorAll('.tab[data-tab="share"]').forEach(function (el) { setNavLabel(el, el.classList.contains('mob-item') ? t('nav', 'shareShort') : t('nav', 'share')); });
    document.querySelectorAll('.tab[data-tab="settings"]').forEach(function (el) { setNavLabel(el, t('nav', 'settings')); });
    document.querySelectorAll('.tab[data-tab="about"]').forEach(function (el) { setNavLabel(el, t('nav', 'about')); });

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
    document.getElementById('share-export-encrypt-label').textContent = t('share', 'encryptLabel');
    document.getElementById('share-backup-heading').textContent = t('share', 'backupHeading');
    document.getElementById('share-backup-hint').textContent = t('share', 'backupHint');
    document.getElementById('share-backup').textContent = t('share', 'backupButton');
    document.getElementById('share-restore-heading').textContent = t('share', 'restoreHeading');
    document.getElementById('share-restore-hint').textContent = t('share', 'restoreHint');
    document.getElementById('share-restore-label').textContent = t('share', 'restoreLabel');
    var lockHeading = document.getElementById('section-lock-heading');
    if (lockHeading) { lockHeading.textContent = t('share', 'sectionLockHeading'); }
    var lockHint = document.getElementById('section-lock-hint');
    if (lockHint) { lockHint.textContent = t('share', 'sectionLockHint'); }
    var lockEmpty = document.getElementById('section-lock-empty');
    if (lockEmpty) { lockEmpty.textContent = t('share', 'sectionLockEmpty'); }
    renderSectionLockList();
    var backupStatus = document.getElementById('share-backup-status');
    if (backupStatus) { backupStatus.textContent = ''; }
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
    document.getElementById('design-heading').textContent = t('themes', 'designHeading');
    document.getElementById('design-intro').textContent = t('themes', 'designIntro');
    renderDesignGrid();
    renderThemeEditor();
    document.getElementById('settings-heading').textContent = t('settings', 'heading');
    document.getElementById('settings-intro').textContent = t('settings', 'intro');
    document.getElementById('cfg-table-legend').textContent = t('settings', 'childNeedTable');
    document.getElementById('cfg-add-row').textContent = t('settings', 'addRow');
    document.getElementById('cfg-save').textContent = t('settings', 'save');
    document.getElementById('cfg-restore').textContent = t('settings', 'restoreDefaults');
    document.getElementById('cfg-export').textContent = t('settings', 'exportJson');
    document.getElementById('cfg-import-label').textContent = t('settings', 'importJson');
    document.getElementById('crypto-heading').textContent = t('crypto', 'heading');
    document.getElementById('crypto-intro').textContent = t('crypto', 'intro');
    document.getElementById('keys-legend').textContent = t('crypto', 'keysLegend');
    document.getElementById('keys-party-a-status').textContent = t('crypto', 'keyMissing');
    document.getElementById('keys-generate-a').textContent = t('crypto', 'generate');
    document.getElementById('keys-export-a').textContent = t('crypto', 'exportPub');
    document.getElementById('keys-import-a-label').textContent = t('crypto', 'importPub');
    document.getElementById('keys-party-b-status').textContent = t('crypto', 'keyMissing');
    document.getElementById('keys-generate-b').textContent = t('crypto', 'generate');
    document.getElementById('keys-export-b').textContent = t('crypto', 'exportPub');
    document.getElementById('keys-import-b-label').textContent = t('crypto', 'importPub');
    document.getElementById('lockfile-legend').textContent = t('crypto', 'lockfileLegend');
    document.getElementById('lockfile-export').textContent = t('crypto', 'lockfileExport');
    document.getElementById('lockfile-sign-a').textContent = t('crypto', 'lockfileSignA');
    document.getElementById('lockfile-sign-b').textContent = t('crypto', 'lockfileSignB');
    document.getElementById('lockfile-import-label').textContent = t('crypto', 'lockfileImportLabel');
    renderKeyStatus();
    refreshChainStatus();
    document.getElementById('binding-heading').textContent = t('binding', 'heading');
    document.getElementById('binding-intro').textContent = t('binding', 'intro');
    document.getElementById('binding-override-label').textContent = t('binding', 'overrideMode');
    document.getElementById('bind-col-setting').textContent = t('binding', 'colSetting');
    document.getElementById('bind-col-base').textContent = t('binding', 'colBase');
    document.getElementById('bind-col-approval').textContent = t('binding', 'colApproval');
    document.getElementById('bind-col-override').textContent = t('binding', 'colOverride');
    renderBindingTable();
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

    var result = AlimenCal.calculator.calculateChildSupport(input, effectiveCfg());
    renderChildrenResult(result);
  }
  function renderBreakdownRow(label, value, isTotal) {
    var line = document.createElement('p');
    line.className = isTotal ? 'result-breakdown-row result-breakdown-row-total' : 'result-breakdown-row';
    var l = document.createElement('span');
    l.className = 'result-breakdown-label';
    l.textContent = label;
    var v = document.createElement('span');
    v.className = 'result-breakdown-value';
    v.textContent = value;
    line.appendChild(l);
    line.appendChild(v);
    return line;
  }

  function renderChildrenResult(result) {
    var box = document.getElementById('children-result');
    box.hidden = false;
    var breakdown = document.getElementById('children-breakdown');
    breakdown.innerHTML = '';
    result.perChild.forEach(function (c) {
      var block = document.createElement('div');
      block.className = 'result-breakdown-block';
      var head = document.createElement('p');
      head.className = 'result-breakdown-head';
      head.textContent =
        t('children', 'childLabel').replace('{n}', String(c.index + 1)) + ' (' + c.age + ')' +
        (c.costMode === 'effective' ? ' – ' + t('children', 'modeEffectiveShort') + ' ' + fmt(c.effectiveCosts) : '');
      block.appendChild(head);
      [
        [t('children', 'tableBasicNeed'), fmt(c.basicNeed)],
        [t('children', 'tableDirect'), fmt(c.directCosts)],
        [t('children', 'tableChildIncome'), fmt(c.childIncome)],
        [t('children', 'tableBarTotal'), fmt(c.barTotal)],
        [t('children', 'tableBarA'), fmt(c.barFromA)],
        [t('children', 'tableBarB'), fmt(c.barFromB)],
        [t('children', 'tableManko'), c.barManko > 0 ? fmt(c.barManko) : '–'],
        [t('children', 'tableCareNet'),
          ((c.careNetFromAToB > 0 ? fmt(c.careNetFromAToB) + ' A→B' : '') +
            (c.careNetFromBToA > 0 ? fmt(c.careNetFromBToA) + ' B→A' : '')) || '–']
      ].forEach(function (r) {
        block.appendChild(renderBreakdownRow(r[0], r[1]));
      });
      block.appendChild(renderBreakdownRow(t('children', 'tableTotalA'), fmt(c.totalFromA), true));
      block.appendChild(renderBreakdownRow(t('children', 'tableTotalB'), fmt(c.totalFromB), true));
      breakdown.appendChild(block);
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

    var result = AlimenCal.calculator.calculateSpousalSupport(input, effectiveCfg());
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

  function syncBaseFromService() {
    var svc = settingsService();
    BINDINGS.forEach(function (b) {
      var id = findSettingId(b.key);
      if (id) {
        var ctx = svc.resolveWithContext(id, null);
        state.cfg[b.key] = ctx.baseValue;
      }
    });
  }

  function applyBindingLocksToForm() {
    var svc = settingsService();
    BINDINGS.forEach(function (b) {
      var id = findSettingId(b.key);
      var setting = svc.getSetting(id);
      var el = document.getElementById(b.uiId);
      if (el) {
        var locked = setting.lockedA && setting.lockedB;
        el.dataset.bindingLocked = locked ? '1' : '';
        el.disabled = locked;
        el.title = locked ? t('binding', 'lockedFieldHint') : '';
      }
    });
    applySectionLocks();
  }

  function fillCfgForm() {
    syncBaseFromService();
    document.getElementById('cfg-em-employed').value = state.cfg.defaultExistenzminimumEmployed;
    document.getElementById('cfg-em-notemployed').value = state.cfg.defaultExistenzminimumNotEmployed;
    document.getElementById('cfg-spousal-standard').value = state.cfg.defaultSpousalStandard;
    document.getElementById('cfg-fallback-child').value = state.cfg.fallbackChildBasicNeed;
    renderCfgTable();
    applyBindingLocksToForm();
    renderBindingTable();
  }

  function collectCfgForm() {
    var svc = settingsService();
    BINDINGS.forEach(function (b) {
      var el = document.getElementById(b.uiId);
      var id = findSettingId(b.key);
      if (!el || el.disabled) { return; }
      try {
        svc.updateBaseValue(id, parseFloat(el.value) || 0, 'A');
      } catch (e) {
        setBindingStatus(e.message);
      }
    });
    syncBaseFromService();
    saveBindingState(svc);
    applyBindingLocksToForm();
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
      var text = String(reader.result || '');
      var parsed = text.trim().charAt(0) === '<'
        ? AlimenCal.costsplit.parseCamtXml(text)
        : AlimenCal.costsplit.parseBankCsv(text);
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
    return stored || 'calm';
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
    if (vals && !vals.__design) {
      vals.__design = AlimenCal.themes.designOfPreset(preset);
    }
    AlimenCal.themes.applyToDocument(vals);
  }

  function currentThemeValues() {
    var raw = null;
    try { raw = localStorage.getItem(LS_THEME_VALUES); } catch (e) {}
    if (raw) {
      try {
        var parsed = JSON.parse(raw);
        if (!parsed.__design) {
          var preset0 = getPresetById(getThemeId()) || AlimenCal.themes.PRESETS[0];
          parsed.__design = AlimenCal.themes.designOfPreset(preset0);
        }
        return parsed;
      } catch (e) {}
    }
    var preset = getPresetById(getThemeId()) || AlimenCal.themes.PRESETS[0];
    var vals = preset.values;
    vals.__design = AlimenCal.themes.designOfPreset(preset);
    return vals;
  }

  /* Design-Stil-Auswahl: Karten je Stil, Klick uebernimmt das zugehoerige
     Preset (Farben + design). Neue Stile werden hier und in
     AlimenCal.themes.DESIGNS/PRESETS nachgefuehrt. */
  var DESIGN_LABELS = {
    base: { de: 'Klassisch', fr: 'Classique', it: 'Classico', en: 'Classic' },
    calm: { de: 'Calm', fr: 'Calm', it: 'Calm', en: 'Calm' },
    'calm-dark': { de: 'Calm Dark', fr: 'Calm Dark', it: 'Calm Dark', en: 'Calm Dark' },
    editorial: { de: 'Editorial / Legal', fr: 'Editorial / Juridique', it: 'Editoriale / Legale', en: 'Editorial / Legal' },
    neubrutalism: { de: 'Neo-Brutalismus', fr: 'N\u00e9o-brutalisme', it: 'Neo-brutalismo', en: 'Neo-Brutalism' }
  };
  function designPresetFor(design) {
    var preset = (AlimenCal.themes.PRESETS || []).filter(function (p) {
      return AlimenCal.themes.designOfPreset(p) === design;
    })[0];
    return preset || AlimenCal.themes.PRESETS[0];
  }
  function currentDesign() {
    var values = currentThemeValues();
    if (values && values.__design && AlimenCal.themes.DESIGNS.indexOf(values.__design) !== -1) {
      return values.__design;
    }
    var preset = getPresetById(getThemeId()) || AlimenCal.themes.PRESETS[0];
    return AlimenCal.themes.designOfPreset(preset);
  }
  function renderDesignGrid() {
    var grid = document.getElementById('design-grid');
    if (!grid) { return; }
    grid.innerHTML = '';
    var active = currentDesign();
    AlimenCal.themes.DESIGNS.forEach(function (design) {
      var preset = designPresetFor(design);
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'design-card' + (design === active ? ' active' : '');
      btn.dataset.design = design;
      var swatch = document.createElement('span');
      swatch.className = 'design-swatch';
      swatch.style.background = preset.values.bannerBg;
      swatch.style.borderBottomColor = preset.values.accent;
      btn.appendChild(swatch);
      var name = document.createElement('span');
      name.className = 'design-name';
      name.textContent = (DESIGN_LABELS[design] && DESIGN_LABELS[design][state.lang]) ||
        (DESIGN_LABELS[design] && DESIGN_LABELS[design].en) || design;
      btn.appendChild(name);
      if (design === active) {
        var cur = document.createElement('span');
        cur.className = 'design-current';
        cur.textContent = t('themes', 'designCurrent');
        btn.appendChild(cur);
      }
      btn.addEventListener('click', function () {
        saveTheme(preset.id, null);
        applyTheme(preset.id, preset.values);
        var select = document.getElementById('theme-select');
        if (select) { select.value = preset.id; }
        document.getElementById('theme-status').textContent = t('themes', 'saved');
        renderDesignGrid();
        renderThemeEditor();
      });
      grid.appendChild(btn);
    });
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

  function recipientPublicKey() {
    var k = loadKeys();
    if (!k) { return null; }
    var a = k.partyA, b = k.partyB;
    if (a && a.importedParty && a.publicKey) { return a.publicKey; }
    if (b && b.importedParty && b.publicKey) { return b.publicKey; }
    return null;
  }
  function ownPrivateKey() {
    var k = loadKeys();
    if (!k) { return null; }
    var a = k.partyA, b = k.partyB;
    if (a && !a.importedParty && a.privateKey) { return a.privateKey; }
    if (b && !b.importedParty && b.privateKey) { return b.privateKey; }
    return null;
  }
  function doShareExport() {
    var checked = Array.prototype.slice.call(
      document.querySelectorAll('#share-export-checkboxes input:checked')
    ).map(function (el) { return el.value; });
    var encrypt = !!(document.getElementById('share-export-encrypt') || {}).checked;
    var current = collectCurrentSections();
    var sections = {};
    checked.forEach(function (key) { sections[key] = current[key]; });
    var file = AlimenCal.casedata.buildFile(sections);
    function download(obj, name) {
      var blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      URL.revokeObjectURL(a.href);
    }
    if (encrypt) {
      var recipient = recipientPublicKey();
      if (!recipient) {
        alert(t('share', 'encryptNoKey'));
        return;
      }
      AlimenCal.casecrypto.encryptCase(file, recipient, function (env, err) {
        if (err || !env) {
          alert(t('share', 'encryptError'));
          return;
        }
        download(env, 'alimencal-case-encrypted.json');
      });
      return;
    }
    download(file, 'alimencal-case.json');
  }
  function backupFileName() {
    var d = new Date();
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    return 'alimencal-backup-' + d.getFullYear() + pad(d.getMonth() + 1) +
      pad(d.getDate()) + '-' + pad(d.getHours()) + pad(d.getMinutes()) + '.json';
  }
  function doBackup() {
    var current = collectCurrentSections();
    var themeValues = null;
    try {
      var rawValues = localStorage.getItem(LS_THEME_VALUES);
      if (rawValues) { themeValues = JSON.parse(rawValues); }
    } catch (e) {}
    var binding = null;
    try { binding = JSON.parse(localStorage.getItem(LS_BINDING)); } catch (e) {}
    var file = AlimenCal.casedata.buildBackupFile(current, {
      lang: state.lang,
      theme: { id: getThemeId(), values: themeValues },
      config: state.cfg,
      binding: binding,
      keys: loadKeys()
    });
    var status = document.getElementById('share-backup-status');
    var blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
    function done() {
      if (status) { status.textContent = t('share', 'backupOk'); }
      markBackupDone();
    }
    if (navigator.canShare && navigator.canShare({ files: [new File([], backupFileName())] })) {
      var f = new File([blob], backupFileName(), { type: 'application/json' });
      navigator.share({ files: [f], title: 'AlimenCal' }).then(done, function () {});
      return;
    }
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = backupFileName();
    a.click();
    URL.revokeObjectURL(a.href);
    done();
  }

  function handleBackupRestore(file) {
    var reader = new FileReader();
    reader.onload = function () {
      var raw;
      try { raw = JSON.parse(reader.result); } catch (e) { raw = null; }
      var status = document.getElementById('share-restore-status');
      var result = raw ? AlimenCal.casedata.sanitizeBackup(raw) : null;
      if (!result || !result.valid) {
        status.textContent = t('share', 'restoreInvalid');
        return;
      }
      applySectionsToForm(result.sections);
      var restored = [];
      lockImportedSections(result.sections);
      if (result.settings.lang) {
        state.lang = result.settings.lang;
        try { localStorage.setItem(LS_LANG, state.lang); } catch (e) {}
        Array.prototype.forEach.call(document.querySelectorAll('.lang-select-sync'), function (sel) {
          sel.value = state.lang;
        });
        restored.push(t('share', 'restorePartLang'));
      }
      if (result.settings.theme) {
        saveTheme(result.settings.theme.id, result.settings.theme.values);
        applyTheme(result.settings.theme.id, result.settings.theme.values);
        restored.push(t('share', 'restorePartTheme'));
      }
      if (result.settings.config) {
        state.cfg = result.settings.config;
        saveCfg(state.cfg);
        fillCfgForm();
        restored.push(t('share', 'restorePartConfig'));
      }
      if (result.settings.binding) {
        try { localStorage.setItem(LS_BINDING, JSON.stringify(result.settings.binding)); } catch (e) {}
        if (state.settingsService) {
          state.settingsService = new AlimenCal.settings.SettingsService();
          initSettingsService(state.settingsService);
        }
        fillCfgForm();
        restored.push(t('share', 'restorePartBinding'));
      }
      if (result.settings.keys) {
        state.keys = result.settings.keys;
        saveKeys();
        restored.push(t('share', 'restorePartKeys'));
      }
      applyI18n();
      var parts = restored.length ? ' ' + t('share', 'restoreSettingsOk', [restored.join(', ')]) : '';
      status.textContent = t('share', 'restoreOk', [String(Object.keys(result.sections).length), parts]);
    };
    reader.readAsText(file);
  }
  function applySectionLocks() {
    Object.keys(SECTION_FIELDS).forEach(function (key) {
      var locked = state.sectionLocks.indexOf(key) >= 0;
      SECTION_FIELDS[key].forEach(function (id) {
        var el = document.getElementById(id);
        if (!el) { return; }
        if (el.dataset.bindingLocked === '1') { return; }
        el.disabled = locked;
        el.title = locked ? t('share', 'sectionLockedHint') : '';
      });
    });
    renderSectionLockList();
  }
  function setSectionLock(key, locked) {
    var i = state.sectionLocks.indexOf(key);
    if (locked && i < 0) { state.sectionLocks.push(key); }
    if (!locked && i >= 0) { state.sectionLocks.splice(i, 1); }
    applySectionLocks();
    saveForm();
  }
  function renderSectionLockList() {
    var host = document.getElementById('section-lock-list');
    if (!host) { return; }
    host.innerHTML = '';
    state.sectionLocks.slice().sort().forEach(function (key) {
      var wrap = document.createElement('div');
      wrap.className = 'section-lock-row';
      var label = document.createElement('span');
      label.textContent = t('share', 'section' + key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, function (m) { return m; })) || key;
      label.textContent = key;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'primary';
      btn.textContent = t('share', 'unlockButton');
      btn.addEventListener('click', function () { setSectionLock(key, false); });
      wrap.appendChild(label);
      wrap.appendChild(btn);
      host.appendChild(wrap);
    });
    var heading = document.getElementById('section-lock-heading');
    var empty = document.getElementById('section-lock-empty');
    if (empty) { empty.hidden = state.sectionLocks.length > 0; }
    if (heading) { heading.hidden = state.sectionLocks.length === 0; }
  }
  function lockImportedSections(sections) {
    var locked = [];
    Object.keys(SECTION_FIELDS).forEach(function (key) {
      if (sections[key] != null) { locked.push(key); }
    });
    locked.forEach(function (key) {
      if (state.sectionLocks.indexOf(key) < 0) { state.sectionLocks.push(key); }
    });
    applySectionLocks();
    saveForm();
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
      var status = document.getElementById('share-import-status');
      if (raw && AlimenCal.casecrypto && AlimenCal.casecrypto.isEnvelope(raw)) {
        var priv = ownPrivateKey();
        if (!priv) {
          status.textContent = t('share', 'decryptNoKey');
          return;
        }
        AlimenCal.casecrypto.decryptCase(raw, priv, function (dec, err) {
          if (err || !dec) {
            status.textContent = t('share', 'decryptError');
            return;
          }
          var decResult = AlimenCal.casedata.sanitizeCase(dec);
          if (!decResult || !decResult.valid) {
            status.textContent = t('share', 'importInvalid');
            return;
          }
          applySectionsToForm(decResult.sections);
          lockImportedSections(decResult.sections);
          var decPartial = decResult.invalid.length
            ? t('share', 'importPartial', [decResult.invalid.join(', ')])
            : '';
          status.textContent = t('share', 'importOk',
            [String(Object.keys(decResult.sections).length), decPartial]);
        });
        return;
      }
      var result = raw ? AlimenCal.casedata.sanitizeCase(raw) : null;
      if (!result || !result.valid) {
        status.textContent = t('share', 'importInvalid');
        return;
      }
      applySectionsToForm(result.sections);
      lockImportedSections(result.sections);
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
    form.__sectionLocks = state.sectionLocks;
    return form;
  }

  function saveForm() {
    try {
      localStorage.setItem(LS_FORM,
        JSON.stringify(AlimenCal.storage.buildFormPayload(collectFormState())));
    } catch (e) {}
  }

  function scheduleSaveForm() {
    saveForm();
    bumpBackupChanges();
  }

  /* Selbsttest beim Start: der aktuelle Zustand wird einmal gespeichert,
   * sofort wieder gelesen und ueber AlimenCal.storage validiert. Schlägt
   * das Lesen fehl, ist das Persistenz-Format inkonsistent (z. B. nach
   * einer Schema-Aenderung ohne Migration) und wird im Browser-Log
   * gemeldet, damit der Fall bei der Entwicklung auffaellt. */
  function restoreFormSelfTest() {
    saveForm();
    var raw = null;
    try { raw = localStorage.getItem(LS_FORM); } catch (e) { raw = null; }
    var parsed = raw ? AlimenCal.storage.parseStored(raw) : null;
    if (!raw || !parsed || parsed.status !== 'ok') {
      if (window.console && console.warn) {
        console.warn('AlimenCal: Persistenz-Selbsttest fehlgeschlagen (status=' +
          (parsed ? parsed.status : 'unreadable') + ')');
      }
    }
  }

  function restoreForm() {
    var raw = null;
    try { raw = localStorage.getItem(LS_FORM); } catch (e) {}
    if (!raw) { return; }
    var parsed = AlimenCal.storage.parseStored(raw);
    if (parsed.status !== 'ok' || !parsed.form) { return; }
    var form = parsed.form;
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
    if (Array.isArray(form.__sectionLocks)) {
      state.sectionLocks = form.__sectionLocks;
      applySectionLocks();
    }
    if (form.__costsplit && Array.isArray(form.__costsplit.transactions) && form.__costsplit.transactions.length) {
      state.costsplit = form.__costsplit;
      document.getElementById('costsplit-section').hidden = false;
      renderCostsplitTable();
    }
    if (parsed.changed) { saveForm(); }
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

  /* -------------------------------------------------------------
   *  Command-Palette (Ctrl+K): Navigation und Aktionen per Tastatur.
   * ------------------------------------------------------------- */
  function initCmdPalette() {
    var trigger = document.getElementById('cmdk-trigger');
    var palette = document.getElementById('cmdk-palette');
    var backdrop = document.getElementById('cmdk-backdrop');
    var input = document.getElementById('cmdk-input');
    var list = document.getElementById('cmdk-list');
    if (!trigger || !palette || !backdrop || !input || !list) { return; }
    var selIndex = 0;
    var items = [];
    function commands() {
      return [
        { tab: 'children', label: t('nav', 'children'), hint: 'Tab' },
        { tab: 'spousal', label: t('nav', 'spousal'), hint: 'Tab' },
        { tab: 'costsplit', label: t('nav', 'costsplit'), hint: 'Tab' },
        { tab: 'share', label: t('nav', 'share'), hint: 'Tab' },
        { tab: 'settings', label: t('nav', 'settings'), hint: 'Tab' },
        { tab: 'themes', label: t('nav', 'themes'), hint: 'Tab' },
        { tab: 'about', label: t('nav', 'about'), hint: 'Tab' }
      ];
    }
    function render() {
      var q = (input.value || '').toLowerCase();
      items = commands().filter(function (c) {
        return !q || c.label.toLowerCase().indexOf(q) !== -1;
      });
      if (selIndex >= items.length) { selIndex = 0; }
      list.innerHTML = '';
      if (!items.length) {
        var empty = document.createElement('div');
        empty.className = 'cmdk-empty';
        empty.textContent = t('palette', 'empty');
        list.appendChild(empty);
        return;
      }
      items.forEach(function (c, i) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'cmdk-item' + (i === selIndex ? ' sel' : '');
        var label = document.createElement('span');
        label.textContent = c.label;
        btn.appendChild(label);
        var hint = document.createElement('span');
        hint.className = 'cmdk-hint';
        hint.textContent = c.hint;
        btn.appendChild(hint);
        btn.addEventListener('click', function () {
          close();
          switchTab(c.tab);
        });
        list.appendChild(btn);
      });
    }
    function open() {
      palette.classList.add('open');
      backdrop.classList.add('open');
      palette.setAttribute('aria-hidden', 'false');
      backdrop.setAttribute('aria-hidden', 'false');
      trigger.setAttribute('aria-expanded', 'true');
      input.value = '';
      selIndex = 0;
      render();
      setTimeout(function () { input.focus(); }, 30);
    }
    function close() {
      palette.classList.remove('open');
      backdrop.classList.remove('open');
      palette.setAttribute('aria-hidden', 'true');
      backdrop.setAttribute('aria-hidden', 'true');
      trigger.setAttribute('aria-expanded', 'false');
    }
    trigger.addEventListener('click', open);
    backdrop.addEventListener('click', close);
    input.addEventListener('input', function () { selIndex = 0; render(); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { selIndex = Math.min(selIndex + 1, items.length - 1); render(); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { selIndex = Math.max(selIndex - 1, 0); render(); e.preventDefault(); }
      else if (e.key === 'Enter' && items[selIndex]) { close(); switchTab(items[selIndex].tab); e.preventDefault(); }
    });
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        if (palette.classList.contains('open')) { close(); } else { open(); }
      } else if (e.key === 'Escape' && palette.classList.contains('open')) {
        close();
      }
    });
  }

  /* -------------------------------------------------------------
   *  Live-Ergebnis (Kindesunterhalt): aktualisiert das sticky
   *  Ergebnis-Panel bei jeder Eingabe statt nur auf Klick.
   * ------------------------------------------------------------- */
  function updateChildrenLiveResult() {
    var calcBtn = document.getElementById('calc-children');
    if (!calcBtn) { return; }
    var panel = document.getElementById('children-result');
    var empty = document.getElementById('children-result-empty');
    var paIncome = parseFloat((document.getElementById('pa-income') || {}).value) || 0;
    var pbIncome = parseFloat((document.getElementById('pb-income') || {}).value) || 0;
    if (paIncome > 0 && pbIncome > 0) {
      calculateChildren();
      if (empty) { empty.hidden = true; }
      panel.hidden = false;
    } else {
      panel.hidden = true;
      if (empty) { empty.hidden = false; }
    }
  }
  function initLiveResult() {
    var ids = ['pa-income', 'pb-income', 'pa-em', 'pb-em'];
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) { el.addEventListener('input', updateChildrenLiveResult); }
    });
    document.getElementById('children-list').addEventListener('input', updateChildrenLiveResult);
    var empty = document.getElementById('children-result-empty');
    if (empty) { empty.hidden = true; }
  }

  /* -------------------------------------------------------------
   *  Mobile: «Mehr»-Klappteil in der unteren Tab-Leiste.
   * ------------------------------------------------------------- */
  function initMobileMore() {
    var btn = document.getElementById('mob-more-btn');
    if (!btn) { return; }
    btn.addEventListener('click', function () {
      var trigger = document.getElementById('cmdk-trigger');
      if (trigger) { trigger.click(); }
    });
  }

  function init() {
    state.lang = getLang();
    state.cfg = getCfg();
    settingsService();
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
    try { lastFormSnapshot = localStorage.getItem(LS_FORM); } catch (e) {}
    renderBackupReminder();
    document.getElementById('backup-reminder-action').addEventListener('click', function () {
      doBackup();
    });
    document.getElementById('backup-reminder-dismiss').addEventListener('click', function () {
      backupReminderDismissed = true;
      renderBackupReminder();
    });
    document.addEventListener('input', scheduleSaveForm);
    document.addEventListener('change', scheduleSaveForm);
    document.addEventListener('click', scheduleSaveForm);
    restoreFormSelfTest();
    window.addEventListener('beforeunload', saveForm);
    window.addEventListener('pagehide', saveForm);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') { saveForm(); }
    });

    document.getElementById('share-export').addEventListener('click', doShareExport);
    document.getElementById('share-backup').addEventListener('click', doBackup);
    document.getElementById('share-restore').addEventListener('change', function () {
      var file = this.files && this.files[0];
      this.value = '';
      if (file) { handleBackupRestore(file); }
    });
    document.getElementById('share-import').addEventListener('change', function () {
      var file = this.files && this.files[0];
      if (file) { handleShareImport(file); }
      this.value = '';
    });
    document.getElementById('theme-reset').addEventListener('click', function () {
      var id = 'calm';
      var preset = getPresetById(id) || AlimenCal.themes.PRESETS[0];
      saveTheme(id, null);
      applyTheme(id, preset.values);
      document.getElementById('theme-select').value = id;
      renderThemeEditor();
      document.getElementById('theme-status').textContent = t('themes', 'saved');
    });
    Array.prototype.forEach.call(document.querySelectorAll('.lang-select-sync'), function (sel) {
      sel.value = state.lang;
      sel.addEventListener('change', function () {
        state.lang = this.value;
        try { localStorage.setItem(LS_LANG, state.lang); } catch (e) {}
        Array.prototype.forEach.call(document.querySelectorAll('.lang-select-sync'), function (other) {
          other.value = state.lang;
        });
        applyI18n();
      });
    });

    var tabs = document.querySelectorAll('.tab');
    for (var i = 0; i < tabs.length; i++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          switchTab(btn.getAttribute('data-tab'));
        });
      })(tabs[i]);
    }

    initCmdPalette();
    initLiveResult();
    initMobileMore();
    switchTab('children');

    document.getElementById('keys-generate-a').addEventListener('click', function () { generateKeyFor('A'); });
    document.getElementById('keys-generate-b').addEventListener('click', function () { generateKeyFor('B'); });
    document.getElementById('keys-export-a').addEventListener('click', function () { exportKeyFor('A'); });
    document.getElementById('keys-export-b').addEventListener('click', function () { exportKeyFor('B'); });
    document.getElementById('keys-import-a').addEventListener('change', function () {
      if (this.files && this.files[0]) { importKeyFile('A', this.files[0]); }
      this.value = '';
    });
    document.getElementById('keys-import-b').addEventListener('change', function () {
      if (this.files && this.files[0]) { importKeyFile('B', this.files[0]); }
      this.value = '';
    });
    document.getElementById('lockfile-export').addEventListener('click', function () { doLockfileExport(null); });
    document.getElementById('lockfile-sign-a').addEventListener('click', function () { doLockfileExport('A'); });
    document.getElementById('lockfile-sign-b').addEventListener('click', function () { doLockfileExport('B'); });
    document.getElementById('lockfile-import').addEventListener('change', function () {
      if (this.files && this.files[0]) { doLockfileImport(this.files[0]); }
      this.value = '';
    });
    document.getElementById('binding-override-mode').addEventListener('change', function () {
      renderBindingTable();
      setBindingStatus(this.checked ? t('binding', 'overrideActive') : '');
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
      collectCfgForm();
      var svc = settingsService();
      BINDINGS.forEach(function (b) {
        var id = findSettingId(b.key);
        var setting = svc.getSetting(id);
        if (!(setting.lockedA && setting.lockedB)) {
          try { svc.updateBaseValue(id, AlimenCal.config[b.key], 'A'); } catch (e) {}
        }
      });
      syncBaseFromService();
      state.cfg = clone(AlimenCal.config);
      syncBaseFromService();
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

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('./sw.js');
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
